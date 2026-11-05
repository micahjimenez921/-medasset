-- =====================================================================
-- MedAsset: 09_security_procedures.sql
-- Authentication, sessions, user administration and the permission gate.
-- Run AFTER 08_security_schema.sql.
--
-- HOW IDENTITY WORKS (important for the audit trail)
--   1. Django validates the browser's session cookie (sp_validate_session)
--      and learns the user_id.
--   2. Django sends ONLY  SET @app_user_id = <that id>  on its connection.
--   3. Every procedure starts with  CALL sp_require_permission('code').
--      It looks the user up IN THE DATABASE, checks the role's permission,
--      and sets @app_user (the name the triggers write to the audit log).
--   So a client can never choose its own name in the audit log, and the
--   database refuses the action even if the web layer has a bug.
-- =====================================================================
USE medasset_db;

DELIMITER $$

-- ---------------------------------------------------------------------
-- Internal helper: write a security event
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_log_security_event(
  IN p_type VARCHAR(30), IN p_user_id INT, IN p_username VARCHAR(50),
  IN p_actor VARCHAR(100), IN p_detail VARCHAR(255))
BEGIN
  INSERT INTO security_events (event_type, user_id, username, actor, ip_address, detail)
  VALUES (p_type, p_user_id, LEFT(p_username, 50), LEFT(p_actor, 100), LEFT(@app_ip, 45), LEFT(p_detail, 255));
END$$

-- ---------------------------------------------------------------------
-- THE GATE. Called first by every procedure the API can reach.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_require_login()
BEGIN
  DECLARE v_name VARCHAR(50) DEFAULT NULL;
  SET @app_user = NULL;                       -- never trust a leftover value
  IF @app_user_id IS NOT NULL THEN
    SELECT username INTO v_name FROM users WHERE user_id = @app_user_id AND is_active = 1;
  END IF;
  IF v_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Authentication required.';
  END IF;
  SET @app_user = v_name;
END$$

CREATE PROCEDURE sp_require_permission(IN p_code VARCHAR(40))
BEGIN
  DECLARE v_ok INT DEFAULT 0;
  CALL sp_require_login();
  SELECT COUNT(*) INTO v_ok
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p       ON p.permission_id = rp.permission_id
   WHERE u.user_id = @app_user_id AND p.code = p_code;
  IF v_ok = 0 THEN
    CALL sp_log_security_event('PERMISSION_DENIED', @app_user_id, @app_user, @app_user, CONCAT('Needs ', p_code));
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You do not have permission to do this.';
  END IF;
END$$

-- ---------------------------------------------------------------------
-- LOGIN (called by Django before a session exists)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_get_login(IN p_username VARCHAR(50))
BEGIN
  -- an expired lock-out is cleared here
  UPDATE users SET locked_until = NULL, failed_attempts = 0
   WHERE username = p_username AND locked_until IS NOT NULL AND locked_until <= NOW();

  SELECT u.user_id, u.username, u.full_name, u.password_hash, u.is_active,
         u.must_change_password,
         (u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS is_locked,
         r.name AS role_name
    FROM users u JOIN roles r ON r.role_id = u.role_id
   WHERE u.username = p_username;
END$$

-- reason: BAD_PASSWORD | UNKNOWN_USER | LOCKED | INACTIVE
CREATE PROCEDURE sp_record_login_failure(IN p_username VARCHAR(50), IN p_ip VARCHAR(45), IN p_reason VARCHAR(20))
BEGIN
  DECLARE v_uid INT DEFAULT NULL;
  DECLARE v_locked INT DEFAULT 0;
  SET @app_ip = p_ip;
  SELECT user_id INTO v_uid FROM users WHERE username = p_username;

  IF p_reason = 'BAD_PASSWORD' AND v_uid IS NOT NULL THEN
    -- assignments run left to right: locked_until is decided from the OLD counter
    UPDATE users
       SET locked_until    = IF(failed_attempts + 1 >= 5, NOW() + INTERVAL 15 MINUTE, locked_until),
           failed_attempts = IF(failed_attempts + 1 >= 5, 0, failed_attempts + 1)
     WHERE user_id = v_uid;
    SELECT COUNT(*) INTO v_locked FROM users WHERE user_id = v_uid AND locked_until > NOW();
    CALL sp_log_security_event('LOGIN_FAILED', v_uid, p_username, p_username, 'Wrong password');
    IF v_locked > 0 THEN
      CALL sp_log_security_event('ACCOUNT_LOCKED', v_uid, p_username, 'SYSTEM', 'Locked 15 minutes after 5 failed sign-ins');
    END IF;
  ELSEIF p_reason = 'LOCKED' THEN
    CALL sp_log_security_event('LOGIN_BLOCKED', v_uid, p_username, p_username, 'Account is locked');
  ELSEIF p_reason = 'INACTIVE' THEN
    CALL sp_log_security_event('LOGIN_BLOCKED', v_uid, p_username, p_username, 'Account is deactivated');
  ELSE
    CALL sp_log_security_event('LOGIN_FAILED', v_uid, p_username, p_username, 'Unknown username');
  END IF;
END$$

-- Success: reset counters, create the session, log the event
CREATE PROCEDURE sp_create_session(
  IN p_user_id INT, IN p_token_hash CHAR(64), IN p_ip VARCHAR(45), IN p_user_agent VARCHAR(255),
  IN p_idle_minutes INT, IN p_absolute_hours INT)
BEGIN
  DECLARE v_name VARCHAR(50) DEFAULT NULL;
  SET @app_ip = p_ip;
  SELECT username INTO v_name FROM users
   WHERE user_id = p_user_id AND is_active = 1
     AND (locked_until IS NULL OR locked_until <= NOW());
  IF v_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Authentication required.';
  END IF;

  INSERT INTO user_sessions (user_id, token_hash, expires_at, absolute_expires_at, ip_address, user_agent)
  VALUES (p_user_id, p_token_hash, NOW() + INTERVAL p_idle_minutes MINUTE,
          NOW() + INTERVAL p_absolute_hours HOUR, p_ip, LEFT(p_user_agent, 255));
  UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW()
   WHERE user_id = p_user_id;
  CALL sp_log_security_event('LOGIN_SUCCESS', p_user_id, v_name, v_name, 'Signed in');
END$$

-- ---------------------------------------------------------------------
-- SESSION CHECK (called by Django on every request)
-- result set 1: the user (empty = not signed in); result set 2: permission codes
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_validate_session(IN p_token_hash CHAR(64), IN p_idle_minutes INT)
BEGIN
  DECLARE v_sid BIGINT DEFAULT NULL;
  DECLARE v_uid INT DEFAULT NULL;
  DECLARE v_exp DATETIME;
  DECLARE v_abs DATETIME;
  DECLARE v_rev DATETIME;
  DECLARE v_active TINYINT;
  DECLARE v_name VARCHAR(50);
  DECLARE v_ok_uid INT DEFAULT NULL;

  SELECT s.session_id, s.user_id, s.expires_at, s.absolute_expires_at, s.revoked_at, u.is_active, u.username
    INTO v_sid, v_uid, v_exp, v_abs, v_rev, v_active, v_name
    FROM user_sessions s JOIN users u ON u.user_id = s.user_id
   WHERE s.token_hash = p_token_hash;

  IF v_sid IS NOT NULL AND v_rev IS NULL THEN
    IF v_active = 0 THEN
      UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = 'USER_INACTIVE' WHERE session_id = v_sid;
    ELSEIF v_exp <= NOW() OR v_abs <= NOW() THEN
      UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = 'EXPIRED' WHERE session_id = v_sid;
      CALL sp_log_security_event('SESSION_EXPIRED', v_uid, v_name, v_name,
                                 IF(v_abs <= NOW(), 'Maximum session length reached', 'Signed out after inactivity'));
    ELSE
      UPDATE user_sessions
         SET last_seen_at = NOW(),
             expires_at = LEAST(NOW() + INTERVAL p_idle_minutes MINUTE, absolute_expires_at)
       WHERE session_id = v_sid;
      SET v_ok_uid = v_uid;
    END IF;
  END IF;

  SELECT u.user_id, u.username, u.full_name, u.email, u.role_id, r.name AS role_name,
         u.must_change_password
    FROM users u JOIN roles r ON r.role_id = u.role_id
   WHERE u.user_id = v_ok_uid;

  SELECT p.code
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p       ON p.permission_id = rp.permission_id
   WHERE u.user_id = v_ok_uid
   ORDER BY p.code;
END$$

CREATE PROCEDURE sp_revoke_session(IN p_token_hash CHAR(64), IN p_reason VARCHAR(40))
BEGIN
  DECLARE v_sid BIGINT DEFAULT NULL;
  DECLARE v_uid INT DEFAULT NULL;
  DECLARE v_name VARCHAR(50) DEFAULT NULL;
  SELECT s.session_id, s.user_id, u.username INTO v_sid, v_uid, v_name
    FROM user_sessions s JOIN users u ON u.user_id = s.user_id
   WHERE s.token_hash = p_token_hash AND s.revoked_at IS NULL;
  IF v_sid IS NOT NULL THEN
    UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = LEFT(p_reason, 40) WHERE session_id = v_sid;
    CALL sp_log_security_event('LOGOUT', v_uid, v_name, v_name, 'Signed out');
  END IF;
END$$

-- ---------------------------------------------------------------------
-- USER ADMINISTRATION (permission: user.manage)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_users()
BEGIN
  CALL sp_require_permission('user.manage');
  SELECT u.user_id, u.username, u.full_name, u.email, u.role_id, r.name AS role_name,
         u.is_active, u.must_change_password,
         (u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS is_locked,
         u.last_login_at, u.password_changed_at, u.created_at, u.created_by
    FROM users u JOIN roles r ON r.role_id = u.role_id
   ORDER BY u.is_active DESC, u.username;
END$$

CREATE PROCEDURE sp_list_roles()
BEGIN
  CALL sp_require_permission('audit.view');
  SELECT r.role_id, r.name, r.description,
         (SELECT COUNT(*) FROM users u WHERE u.role_id = r.role_id AND u.is_active = 1) AS active_users
    FROM roles r ORDER BY r.role_id;
  SELECT permission_id, code, category, description FROM permissions ORDER BY permission_id;
  SELECT rp.role_id, p.code AS permission_code
    FROM role_permissions rp JOIN permissions p ON p.permission_id = rp.permission_id;
END$$

CREATE PROCEDURE sp_create_user(
  IN p_username VARCHAR(50), IN p_full_name VARCHAR(100), IN p_email VARCHAR(120),
  IN p_role_id INT, IN p_password_hash VARCHAR(255))
BEGIN
  DECLARE v_id INT;
  DECLARE v_name VARCHAR(50);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('user.manage');

  SET v_name = LOWER(TRIM(p_username));
  IF v_name NOT REGEXP '^[a-z0-9][a-z0-9._-]{2,49}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Username must be 3-50 characters: letters, numbers, dot, dash or underscore.';
  END IF;
  IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = p_role_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Choose a valid role.';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE username = v_name) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'That username is already taken.';
  END IF;

  START TRANSACTION;
  INSERT INTO users (username, full_name, email, role_id, password_hash, must_change_password, created_by)
  VALUES (v_name, TRIM(p_full_name), NULLIF(TRIM(p_email), ''), p_role_id, p_password_hash, 1, @app_user);
  SET v_id = LAST_INSERT_ID();
  CALL sp_log_security_event('USER_CREATED', v_id, v_name, @app_user, 'New account (temporary password)');
  COMMIT;

  SELECT u.user_id, u.username, u.full_name, r.name AS role_name
    FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = v_id;
END$$

CREATE PROCEDURE sp_update_user(
  IN p_user_id INT, IN p_full_name VARCHAR(100), IN p_email VARCHAR(120),
  IN p_role_id INT, IN p_is_active TINYINT)
BEGIN
  DECLARE v_old_role INT;
  DECLARE v_old_active TINYINT;
  DECLARE v_name VARCHAR(50);
  DECLARE v_admin_role INT;
  DECLARE v_other_admins INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('user.manage');

  IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = p_role_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Choose a valid role.';
  END IF;

  START TRANSACTION;
  SELECT role_id, is_active, username INTO v_old_role, v_old_active, v_name
    FROM users WHERE user_id = p_user_id FOR UPDATE;
  IF v_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found.';
  END IF;

  IF p_user_id = @app_user_id AND (p_role_id <> v_old_role OR IFNULL(p_is_active,1) = 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You cannot change your own role or deactivate yourself.';
  END IF;

  SELECT role_id INTO v_admin_role FROM roles WHERE name = 'Administrator';
  IF v_old_role = v_admin_role AND v_old_active = 1 AND (p_role_id <> v_admin_role OR IFNULL(p_is_active,1) = 0) THEN
    SELECT COUNT(*) INTO v_other_admins FROM users
     WHERE role_id = v_admin_role AND is_active = 1 AND user_id <> p_user_id;
    IF v_other_admins = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'At least one active Administrator must remain.';
    END IF;
  END IF;

  UPDATE users
     SET full_name = TRIM(p_full_name), email = NULLIF(TRIM(p_email), ''),
         role_id = p_role_id, is_active = IFNULL(p_is_active, 1)
   WHERE user_id = p_user_id;

  IF p_role_id <> v_old_role THEN
    CALL sp_log_security_event('ROLE_CHANGED', p_user_id, v_name, @app_user,
      CONCAT((SELECT name FROM roles WHERE role_id = v_old_role), ' -> ', (SELECT name FROM roles WHERE role_id = p_role_id)));
  END IF;
  IF IFNULL(p_is_active,1) <> v_old_active THEN
    CALL sp_log_security_event(IF(p_is_active = 1, 'USER_ACTIVATED', 'USER_DEACTIVATED'), p_user_id, v_name, @app_user, NULL);
    IF p_is_active = 0 THEN
      UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = 'USER_DEACTIVATED'
       WHERE user_id = p_user_id AND revoked_at IS NULL;
    END IF;
  END IF;
  COMMIT;

  SELECT u.user_id, u.username, u.full_name, r.name AS role_name, u.is_active
    FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = p_user_id;
END$$

CREATE PROCEDURE sp_reset_password(IN p_user_id INT, IN p_password_hash VARCHAR(255))
BEGIN
  DECLARE v_name VARCHAR(50);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('user.manage');
  IF p_user_id = @app_user_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Use "Change password" for your own account.';
  END IF;
  START TRANSACTION;
  SELECT username INTO v_name FROM users WHERE user_id = p_user_id FOR UPDATE;
  IF v_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found.';
  END IF;
  UPDATE users
     SET password_hash = p_password_hash, must_change_password = 1, password_changed_at = NOW(),
         failed_attempts = 0, locked_until = NULL
   WHERE user_id = p_user_id;
  UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = 'PASSWORD_RESET'
   WHERE user_id = p_user_id AND revoked_at IS NULL;
  CALL sp_log_security_event('PASSWORD_RESET', p_user_id, v_name, @app_user, 'Temporary password issued by an administrator');
  COMMIT;
  SELECT p_user_id AS user_id, v_name AS username;
END$$

CREATE PROCEDURE sp_unlock_user(IN p_user_id INT)
BEGIN
  DECLARE v_name VARCHAR(50);
  CALL sp_require_permission('user.manage');
  SELECT username INTO v_name FROM users WHERE user_id = p_user_id;
  IF v_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found.';
  END IF;
  UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = p_user_id;
  CALL sp_log_security_event('ACCOUNT_UNLOCKED', p_user_id, v_name, @app_user, 'Unlocked by an administrator');
  SELECT p_user_id AS user_id, v_name AS username;
END$$

-- Any signed-in user, for their own account (Django checks the old password first)
CREATE PROCEDURE sp_change_own_password(IN p_password_hash VARCHAR(255), IN p_keep_token_hash CHAR(64))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_login();
  START TRANSACTION;
  UPDATE users
     SET password_hash = p_password_hash, must_change_password = 0, password_changed_at = NOW()
   WHERE user_id = @app_user_id;
  UPDATE user_sessions SET revoked_at = NOW(), revoke_reason = 'PASSWORD_CHANGED'
   WHERE user_id = @app_user_id AND revoked_at IS NULL AND token_hash <> p_keep_token_hash;
  CALL sp_log_security_event('PASSWORD_CHANGED', @app_user_id, @app_user, @app_user, 'Changed own password');
  COMMIT;
  SELECT 1 AS ok;
END$$

-- ---------------------------------------------------------------------
-- First administrator. Works ONLY while the users table is empty
-- (used by:  python manage.py create_admin)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_bootstrap_admin(
  IN p_username VARCHAR(50), IN p_full_name VARCHAR(100), IN p_email VARCHAR(120), IN p_password_hash VARCHAR(255))
BEGIN
  DECLARE v_id INT;
  DECLARE v_name VARCHAR(50);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF EXISTS (SELECT 1 FROM users) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An administrator already exists. Sign in and add users from the Users page.';
  END IF;
  SET v_name = LOWER(TRIM(p_username));
  IF v_name NOT REGEXP '^[a-z0-9][a-z0-9._-]{2,49}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Username must be 3-50 characters: letters, numbers, dot, dash or underscore.';
  END IF;

  SET @app_user = 'SYSTEM (bootstrap)';
  START TRANSACTION;
  INSERT INTO users (username, full_name, email, role_id, password_hash, must_change_password,
                     password_changed_at, created_by)
  SELECT v_name, TRIM(p_full_name), NULLIF(TRIM(p_email), ''), role_id, p_password_hash, 0, NOW(), @app_user
    FROM roles WHERE name = 'Administrator';
  SET v_id = LAST_INSERT_ID();
  CALL sp_log_security_event('BOOTSTRAP_ADMIN', v_id, v_name, @app_user, 'First administrator created from the command line');
  COMMIT;
  SET @app_user = NULL;
  SELECT v_id AS user_id, v_name AS username;
END$$

-- ---------------------------------------------------------------------
-- Security log (permission: audit.view)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_security_events(IN p_type VARCHAR(30), IN p_limit INT)
BEGIN
  DECLARE v_limit INT;
  CALL sp_require_permission('audit.view');
  SET v_limit = IF(p_limit IS NULL OR p_limit < 1 OR p_limit > 500, 100, p_limit);
  SELECT event_id, event_type, user_id, username, actor, ip_address, detail, created_at
    FROM security_events
   WHERE (p_type IS NULL OR p_type = '' OR event_type = p_type)
   ORDER BY event_id DESC
   LIMIT v_limit;
END$$

-- ---------------------------------------------------------------------
-- Demo loader guard: the seed script must be run by a real, named user.
-- It attributes all demo changes to the first active Administrator
-- (so the audit trail shows a real person, never a script name).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_assert_demo_ready()
BEGIN
  DECLARE v_id INT DEFAULT NULL;
  DECLARE v_name VARCHAR(50) DEFAULT NULL;
  SELECT u.user_id, u.username INTO v_id, v_name
    FROM users u JOIN roles r ON r.role_id = u.role_id
   WHERE r.name = 'Administrator' AND u.is_active = 1
   ORDER BY u.user_id LIMIT 1;
  IF v_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Create an administrator first: python manage.py create_admin';
  END IF;
  SET @app_user_id = v_id;
  SET @app_user = v_name;
  SET @app_ip = 'demo-loader';
  CALL sp_log_security_event('DEMO_DATA_LOAD', v_id, v_name, v_name, 'Demo data loaded by an administrator');
END$$

DELIMITER ;
