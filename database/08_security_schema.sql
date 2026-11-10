-- =====================================================================
-- MedAsset: 08_security_schema.sql
-- Role-Based Access Control (RBAC), users, sessions and the security log.
-- Run AFTER files 01-06 (it needs audit_logs from 01).
--
-- Design (what an auditor will ask about):
--   * Who can do what is DATA (roles / permissions / role_permissions),
--     not code. Changing it is itself written to the audit log.
--   * Passwords are stored only as salted PBKDF2 hashes (hashed by Django).
--   * Every sign-in, failure, lock-out, permission denial and user change
--     is written to security_events / audit_logs.
--   * The evidence tables are APPEND-ONLY: UPDATE and DELETE are blocked
--     by triggers, so nobody (not even the application) can rewrite history.
--   * Users are never deleted or renamed, only deactivated, so every
--     audit entry can always be traced back to a real person.
-- =====================================================================
USE medasset_db;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  role_id     INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(30)  NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(40)  NOT NULL UNIQUE,
  category      VARCHAR(30)  NOT NULL,
  description   VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (role_id),
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions (permission_id)
) ENGINE=InnoDB;

CREATE TABLE users (
  user_id             INT AUTO_INCREMENT PRIMARY KEY,
  username            VARCHAR(50)  NOT NULL UNIQUE,
  full_name           VARCHAR(100) NOT NULL,
  email               VARCHAR(120) NULL,
  role_id             INT          NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  is_active           TINYINT(1)   NOT NULL DEFAULT 1,
  must_change_password TINYINT(1)  NOT NULL DEFAULT 1,
  failed_attempts     INT          NOT NULL DEFAULT 0,
  locked_until        DATETIME     NULL,
  last_login_at       DATETIME     NULL,
  password_changed_at DATETIME     NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by          VARCHAR(100) NOT NULL,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id)
) ENGINE=InnoDB;

-- A staff technician may sign in; the account is linked to the technician record.
-- External technicians (contractors, manufacturer engineers) never have an account.
ALTER TABLE technicians
  ADD COLUMN user_id INT NULL,
  ADD CONSTRAINT uq_technicians_user UNIQUE (user_id),
  ADD CONSTRAINT fk_technicians_user FOREIGN KEY (user_id)
      REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE user_sessions (
  session_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT          NOT NULL,
  token_hash          CHAR(64)     NOT NULL UNIQUE,   -- SHA-256 of the cookie token
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          DATETIME     NOT NULL,          -- idle timeout (slides)
  absolute_expires_at DATETIME     NOT NULL,          -- hard limit
  revoked_at          DATETIME     NULL,
  revoke_reason       VARCHAR(40)  NULL,
  ip_address          VARCHAR(45)  NULL,
  user_agent          VARCHAR(255) NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;
CREATE INDEX idx_sessions_user ON user_sessions (user_id, revoked_at);

CREATE TABLE security_events (
  event_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type  VARCHAR(30)  NOT NULL,
  user_id     INT          NULL,
  username    VARCHAR(50)  NULL,
  actor       VARCHAR(100) NULL,
  ip_address  VARCHAR(45)  NULL,
  detail      VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE INDEX idx_secev_type ON security_events (event_type, event_id);

-- Who ran a scheduled/manual job (the job_logs column is added in 01).

-- ---------------------------------------------------------------------
-- Roles and permissions (the access matrix)
-- ---------------------------------------------------------------------
INSERT INTO roles (name, description) VALUES
 ('Administrator', 'Full access, including user management and the audit trail.'),
 ('Technician',    'Field worker: views equipment, schedules and alerts (read only), reports faults (service requests), and carries out assigned work orders. Cannot register, transfer or retire equipment, manage schedules, assign work, cancel, see costs or manage users.'),
 ('Management',    'Hospital management and oversight: department heads, finance, quality officers and auditors. Read-only access to equipment, work orders, costs, reports and the audit trail.'),
 ('Department Staff', 'Nurses and department staff: view equipment and report faults. They see only their own reports.');

INSERT INTO permissions (code, category, description) VALUES
 ('dashboard.view',      'Dashboard',   'See the dashboard'),
 ('lookup.view',         'Dashboard',   'Load drop-down lists (departments, models, ...)'),
 ('asset.view',          'Assets',      'View assets and their history'),
 ('asset.create',        'Assets',      'Register a new asset'),
 ('asset.transfer',      'Assets',      'Move an asset to another location'),
 ('asset.update_status', 'Assets',      'Change asset status and runtime hours'),
 ('asset.decommission',  'Assets',      'Permanently retire an asset'),
 ('schedule.view',       'Maintenance', 'View maintenance schedules'),
 ('schedule.manage',     'Maintenance', 'Create, pause and resume schedules'),
 ('alert.view',          'Maintenance', 'View preventive-maintenance alerts'),
 ('alert.acknowledge',   'Maintenance', 'Acknowledge alerts'),
 ('alert.run_check',     'Maintenance', 'Run the preventive check manually'),
 ('workorder.view',      'Work orders', 'View work orders'),
 ('workorder.view_all',  'Work orders', 'See every work order, not only the ones assigned to you'),
 ('workorder.create',    'Work orders', 'Open a work order'),
 ('workorder.assign',    'Work orders', 'Assign technicians'),
 ('workorder.execute',   'Work orders', 'Start work, log labor and parts'),
 ('workorder.complete',  'Work orders', 'Complete a work order'),
 ('workorder.cancel',    'Work orders', 'Cancel a work order'),
 ('report.view',         'Reports',     'View cost reports'),
 ('audit.view',          'Compliance',  'View the audit log, job runs and security events'),
 ('user.manage',         'Compliance',  'Create users, change roles, reset passwords, unlock accounts'),
 ('technician.manage',   'Work orders', 'Add external technicians, edit rates, link staff accounts'),
 ('request.view',       'Requests',    'See service requests (your own, or all for reviewers)'),
 ('request.create',     'Requests',    'Report a fault on an asset'),
 ('request.review',     'Requests',    'Turn a request into a work order, link it to an open one, or reject it');

-- Written by the installer, so the audit trail says so (not "root@localhost")
SET @app_user = 'SYSTEM (install)';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r CROSS JOIN permissions p
 WHERE r.name = 'Administrator';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r JOIN permissions p
 WHERE r.name = 'Technician'
   AND p.code IN ('dashboard.view','lookup.view','asset.view','schedule.view','alert.view',
                  'workorder.view','workorder.execute','workorder.complete',
                  'request.view','request.create');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r JOIN permissions p
 WHERE r.name = 'Department Staff'
   AND p.code IN ('lookup.view','asset.view','request.view','request.create');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r JOIN permissions p
 WHERE r.name = 'Management'
   AND p.code IN ('dashboard.view','lookup.view','asset.view','schedule.view','alert.view',
                  'workorder.view','workorder.view_all','report.view','audit.view');

-- ---------------------------------------------------------------------
-- Triggers: evidence tables are append-only
-- ---------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_audit_logs_bu BEFORE UPDATE ON audit_logs FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The audit log is append-only and cannot be changed.'; END$$
CREATE TRIGGER trg_audit_logs_bd BEFORE DELETE ON audit_logs FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The audit log is append-only and cannot be deleted.'; END$$

CREATE TRIGGER trg_security_events_bu BEFORE UPDATE ON security_events FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Security events are append-only and cannot be changed.'; END$$
CREATE TRIGGER trg_security_events_bd BEFORE DELETE ON security_events FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Security events are append-only and cannot be deleted.'; END$$

CREATE TRIGGER trg_job_logs_bu BEFORE UPDATE ON job_logs FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Job logs are append-only and cannot be changed.'; END$$
CREATE TRIGGER trg_job_logs_bd BEFORE DELETE ON job_logs FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Job logs are append-only and cannot be deleted.'; END$$

CREATE TRIGGER trg_status_history_bu BEFORE UPDATE ON asset_status_history FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status history is append-only and cannot be changed.'; END$$
CREATE TRIGGER trg_status_history_bd BEFORE DELETE ON asset_status_history FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status history is append-only and cannot be deleted.'; END$$

CREATE TRIGGER trg_transfers_bu BEFORE UPDATE ON asset_transfers FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer history is append-only and cannot be changed.'; END$$
CREATE TRIGGER trg_transfers_bd BEFORE DELETE ON asset_transfers FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer history is append-only and cannot be deleted.'; END$$

CREATE TRIGGER trg_calibration_bu BEFORE UPDATE ON calibration_logs FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Calibration records are append-only and cannot be changed.'; END$$
CREATE TRIGGER trg_calibration_bd BEFORE DELETE ON calibration_logs FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Calibration records are append-only and cannot be deleted.'; END$$

-- ---------------------------------------------------------------------
-- Triggers: users are never deleted or renamed; changes are audited
-- (the password hash is deliberately NOT written to the audit log)
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_users_bd BEFORE DELETE ON users FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Users cannot be deleted. Deactivate the account instead.'; END$$

CREATE TRIGGER trg_users_bu BEFORE UPDATE ON users FOR EACH ROW
BEGIN
  IF NEW.username <> OLD.username THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usernames cannot be changed.';
  END IF;
END$$

CREATE TRIGGER trg_users_ai_audit AFTER INSERT ON users FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('users', NEW.user_id, 'INSERT',
          JSON_OBJECT('username', NEW.username, 'full_name', NEW.full_name, 'email', NEW.email,
                      'role_id', NEW.role_id, 'is_active', NEW.is_active),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_users_au_audit AFTER UPDATE ON users FOR EACH ROW
BEGIN
  IF NOT (NEW.role_id <=> OLD.role_id AND NEW.is_active <=> OLD.is_active
          AND NEW.full_name <=> OLD.full_name AND NEW.email <=> OLD.email
          AND NEW.must_change_password <=> OLD.must_change_password
          AND NEW.password_changed_at <=> OLD.password_changed_at) THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('users', NEW.user_id, 'UPDATE',
            JSON_OBJECT('username', OLD.username, 'full_name', OLD.full_name, 'email', OLD.email,
                        'role_id', OLD.role_id, 'is_active', OLD.is_active,
                        'must_change_password', OLD.must_change_password,
                        'password_changed_at', OLD.password_changed_at),
            JSON_OBJECT('username', NEW.username, 'full_name', NEW.full_name, 'email', NEW.email,
                        'role_id', NEW.role_id, 'is_active', NEW.is_active,
                        'must_change_password', NEW.must_change_password,
                        'password_changed_at', NEW.password_changed_at),
            COALESCE(@app_user, CURRENT_USER()));
  END IF;
END$$

-- ---------------------------------------------------------------------
-- Triggers: any change to the access matrix is audited
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_role_perm_ai_audit AFTER INSERT ON role_permissions FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('role_permissions', NEW.role_id, 'INSERT',
          JSON_OBJECT('role_id', NEW.role_id,
                      'permission', (SELECT code FROM permissions WHERE permission_id = NEW.permission_id)),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_role_perm_ad_audit AFTER DELETE ON role_permissions FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
  VALUES ('role_permissions', OLD.role_id, 'DELETE',
          JSON_OBJECT('role_id', OLD.role_id,
                      'permission', (SELECT code FROM permissions WHERE permission_id = OLD.permission_id)),
          COALESCE(@app_user, CURRENT_USER()));
END$$

-- ---------------------------------------------------------------------
-- Triggers: technician rules (staff vs external) and audit
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_technicians_bi_rules BEFORE INSERT ON technicians FOR EACH ROW
BEGIN
  IF NEW.team IN ('Outsourced contractor','Manufacturer service') THEN
    IF NEW.user_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'External technicians cannot have a sign-in account.';
    END IF;
    IF NEW.company IS NULL OR TRIM(NEW.company) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Company is required for external technicians.';
    END IF;
  END IF;
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM users u JOIN roles r ON r.role_id = u.role_id
        WHERE u.user_id = NEW.user_id AND r.name = 'Technician') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an account with the Technician role can be linked to a technician.';
  END IF;
END$$

CREATE TRIGGER trg_technicians_bu_rules BEFORE UPDATE ON technicians FOR EACH ROW
BEGIN
  IF NEW.team IN ('Outsourced contractor','Manufacturer service') THEN
    IF NEW.user_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'External technicians cannot have a sign-in account.';
    END IF;
    IF NEW.company IS NULL OR TRIM(NEW.company) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Company is required for external technicians.';
    END IF;
  END IF;
  IF NEW.user_id IS NOT NULL AND NOT (NEW.user_id <=> OLD.user_id) AND NOT EXISTS (
       SELECT 1 FROM users u JOIN roles r ON r.role_id = u.role_id
        WHERE u.user_id = NEW.user_id AND r.name = 'Technician') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an account with the Technician role can be linked to a technician.';
  END IF;
END$$

CREATE TRIGGER trg_technicians_bd_block BEFORE DELETE ON technicians FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Technicians cannot be deleted. Mark the technician inactive instead.';
END$$

CREATE TRIGGER trg_technicians_ai_audit AFTER INSERT ON technicians FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('technicians', NEW.technician_id, 'INSERT',
          JSON_OBJECT('employee_no', NEW.employee_no, 'name', CONCAT(NEW.first_name, ' ', NEW.last_name),
                      'team', NEW.team, 'company', NEW.company, 'hourly_rate', NEW.hourly_rate,
                      'user_id', NEW.user_id),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_technicians_au_audit AFTER UPDATE ON technicians FOR EACH ROW
BEGIN
  IF NOT (NEW.hourly_rate <=> OLD.hourly_rate AND NEW.is_active <=> OLD.is_active
          AND NEW.user_id <=> OLD.user_id AND NEW.company <=> OLD.company
          AND NEW.team <=> OLD.team AND NEW.specialization <=> OLD.specialization
          AND NEW.contact_number <=> OLD.contact_number AND NEW.email <=> OLD.email
          AND NEW.first_name <=> OLD.first_name AND NEW.last_name <=> OLD.last_name) THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('technicians', NEW.technician_id, 'UPDATE',
            JSON_OBJECT('name', CONCAT(OLD.first_name, ' ', OLD.last_name), 'team', OLD.team,
                        'company', OLD.company, 'hourly_rate', OLD.hourly_rate,
                        'is_active', OLD.is_active, 'user_id', OLD.user_id),
            JSON_OBJECT('name', CONCAT(NEW.first_name, ' ', NEW.last_name), 'team', NEW.team,
                        'company', NEW.company, 'hourly_rate', NEW.hourly_rate,
                        'is_active', NEW.is_active, 'user_id', NEW.user_id),
            COALESCE(@app_user, CURRENT_USER()));
  END IF;
END$$

DELIMITER ;

SET @app_user = NULL;
