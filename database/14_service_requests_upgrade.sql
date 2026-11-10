-- =====================================================================
-- Upgrade for an EXISTING database (no data loss): service-request workflow.
--   technician REPORTS a fault  ->  administrator REVIEWS it:
--   convert to a work order / link to an open one / reject with a reason.
-- Run:  cmd /c "C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 14_service_requests_upgrade.sql"
-- (A fresh install_database.ps1 already includes all of this.)
-- =====================================================================
SET @app_user = 'SYSTEM (upgrade)';

DELIMITER $$
DROP FUNCTION IF EXISTS fn_user_full_name$$
CREATE FUNCTION fn_user_full_name(p_username VARCHAR(100)) RETURNS VARCHAR(100)
READS SQL DATA
BEGIN
  DECLARE v_name VARCHAR(100);
  SELECT full_name INTO v_name FROM users WHERE username = p_username LIMIT 1;
  RETURN COALESCE(v_name, p_username);
END$$
DELIMITER ;

CREATE TABLE IF NOT EXISTS service_requests (
  request_id    INT AUTO_INCREMENT PRIMARY KEY,
  asset_id      INT          NOT NULL,
  priority      ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  description   VARCHAR(500) NOT NULL,
  reported_by   VARCHAR(100) NOT NULL,
  reported_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('Pending','Converted','Linked','Rejected') NOT NULL DEFAULT 'Pending',
  work_order_id INT          NULL,                      -- the job this request became / was linked to
  review_note   VARCHAR(500) NULL,
  reviewed_by   VARCHAR(100) NULL,
  reviewed_at   DATETIME     NULL,
  CONSTRAINT fk_sr_asset FOREIGN KEY (asset_id)
    REFERENCES assets (asset_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_sr_wo FOREIGN KEY (work_order_id)
    REFERENCES work_orders (work_order_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX ix_sr_status (status),
  INDEX ix_sr_reporter (reported_by)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_service_requests AS
SELECT sr.request_id, CONCAT('SR-', LPAD(sr.request_id, 6, '0')) AS request_number,
       sr.asset_id, a.asset_tag, CONCAT(mf.name, ' ', m.model_name) AS asset_name,
       d.name AS department, sr.priority, sr.description,
       sr.reported_by, fn_user_full_name(sr.reported_by) AS reporter_name, sr.reported_at,
       sr.status, sr.work_order_id,
       IF(sr.work_order_id IS NULL, NULL, CONCAT('WO-', LPAD(sr.work_order_id, 6, '0'))) AS wo_number,
       sr.review_note, sr.reviewed_by, sr.reviewed_at
  FROM service_requests sr
  JOIN assets a            ON a.asset_id = sr.asset_id
  JOIN asset_models m      ON m.model_id = a.model_id
  JOIN vendors mf          ON mf.vendor_id = m.manufacturer_id
  JOIN locations l         ON l.location_id = a.current_location_id
  JOIN departments d       ON d.department_id = l.department_id;

INSERT IGNORE INTO permissions (code, category, description) VALUES
 ('request.view',       'Requests',    'See service requests (your own, or all for reviewers)'),
 ('request.create',     'Requests',    'Report a fault on an asset'),
 ('request.review',     'Requests',    'Turn a request into a work order, link it to an open one, or reject it');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r JOIN permissions p
 WHERE r.name = 'Administrator' AND p.code IN ('request.view','request.create','request.review');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r JOIN permissions p
 WHERE r.name = 'Technician' AND p.code IN ('request.view','request.create');

-- technicians report faults instead of opening work orders themselves
DELETE rp FROM role_permissions rp
  JOIN roles r ON r.role_id = rp.role_id
  JOIN permissions p ON p.permission_id = rp.permission_id
 WHERE r.name = 'Technician' AND p.code = 'workorder.create';

DELIMITER $$
DROP TRIGGER IF EXISTS trg_sr_bi_rules$$
DROP TRIGGER IF EXISTS trg_sr_bu_rules$$
DROP TRIGGER IF EXISTS trg_sr_bd_block$$
DROP TRIGGER IF EXISTS trg_sr_ai_audit$$
DROP TRIGGER IF EXISTS trg_sr_au_audit$$
DROP TRIGGER IF EXISTS trg_wo_bi_rules$$
DROP PROCEDURE IF EXISTS sp_report_fault$$
DROP PROCEDURE IF EXISTS sp_convert_request$$
DROP PROCEDURE IF EXISTS sp_link_request$$
DROP PROCEDURE IF EXISTS sp_reject_request$$
DROP PROCEDURE IF EXISTS sp_list_service_requests$$

-- ---------------------------------------------------------------------
-- Service requests: a technician REPORTS a fault, the administrator reviews it
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_sr_bi_rules
BEFORE INSERT ON service_requests
FOR EACH ROW
BEGIN
  DECLARE v_asset_status VARCHAR(20);
  DECLARE v_dup INT DEFAULT 0;
  SELECT status INTO v_asset_status FROM assets WHERE asset_id = NEW.asset_id;
  IF v_asset_status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot report a fault on a decommissioned asset.';
  END IF;
  IF NEW.description IS NULL OR TRIM(NEW.description) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Please describe the problem.';
  END IF;
  SELECT COUNT(*) INTO v_dup FROM service_requests
   WHERE asset_id = NEW.asset_id AND reported_by = NEW.reported_by AND status = 'Pending';
  IF v_dup > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'You already reported this asset and that report is still waiting for review.';
  END IF;
  SET NEW.status = 'Pending', NEW.work_order_id = NULL, NEW.review_note = NULL,
      NEW.reviewed_by = NULL, NEW.reviewed_at = NULL;
END$$

CREATE TRIGGER trg_sr_bu_rules
BEFORE UPDATE ON service_requests
FOR EACH ROW
BEGIN
  IF OLD.status <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reviewed request cannot be changed (audit rule).';
  END IF;
  IF NEW.asset_id <> OLD.asset_id OR NEW.description <> OLD.description OR NEW.reported_by <> OLD.reported_by THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The reported problem cannot be edited.';
  END IF;
  IF NEW.status IN ('Converted','Linked') AND NEW.work_order_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A converted or linked request needs a work order.';
  END IF;
  IF NEW.status = 'Rejected' AND (NEW.review_note IS NULL OR TRIM(NEW.review_note) = '') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reason is required to reject a request.';
  END IF;
END$$

CREATE TRIGGER trg_sr_bd_block
BEFORE DELETE ON service_requests
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Service requests are kept for the audit trail.';
END$$

CREATE TRIGGER trg_sr_ai_audit
AFTER INSERT ON service_requests
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('service_requests', NEW.request_id, 'INSERT',
          JSON_OBJECT('asset_id', NEW.asset_id, 'priority', NEW.priority,
                      'status', NEW.status, 'description', NEW.description),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_sr_au_audit
AFTER UPDATE ON service_requests
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
  VALUES ('service_requests', NEW.request_id, 'UPDATE',
          JSON_OBJECT('status', OLD.status),
          JSON_OBJECT('status', NEW.status, 'work_order_id', NEW.work_order_id,
                      'review_note', NEW.review_note),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_wo_bi_rules
BEFORE INSERT ON work_orders
FOR EACH ROW
BEGIN
  DECLARE v_asset_status VARCHAR(20);
  DECLARE v_open_id INT DEFAULT NULL;
  DECLARE v_msg VARCHAR(255);
  SELECT status INTO v_asset_status FROM assets WHERE asset_id = NEW.asset_id;
  IF v_asset_status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot open a work order for a decommissioned asset.';
  END IF;
  -- One open job per problem: several people reporting the same fault must not
  -- create several jobs. Historical (completed / cancelled) jobs are not affected.
  SELECT MIN(work_order_id) INTO v_open_id
    FROM work_orders
   WHERE asset_id = NEW.asset_id AND type_id = NEW.type_id
     AND status IN ('Open','Assigned','In Progress');
  IF v_open_id IS NOT NULL THEN
    SET v_msg = CONCAT('WO-', LPAD(v_open_id, 6, '0'),
        ' is already open for this asset and job type. Use that job instead of opening another.');
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
  END IF;
  SET NEW.status = 'Open';
END$$

-- ---------------------------------------------------------------------
-- Service requests: report -> review (convert / link / reject)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_report_fault(
  IN p_asset_id INT, IN p_priority VARCHAR(10), IN p_description VARCHAR(500))
BEGIN
  DECLARE v_id INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('request.create');

  START TRANSACTION;
  INSERT INTO service_requests (asset_id, priority, description, reported_by)
  VALUES (p_asset_id, IFNULL(p_priority, 'Medium'), TRIM(p_description),
          COALESCE(@app_user, CURRENT_USER()));
  SET v_id = LAST_INSERT_ID();
  COMMIT;

  SELECT * FROM vw_service_requests WHERE request_id = v_id;
END$$

CREATE PROCEDURE sp_convert_request(
  IN p_request_id INT, IN p_type_id INT, IN p_priority VARCHAR(10), IN p_note VARCHAR(500))
BEGIN
  DECLARE v_status VARCHAR(10) DEFAULT NULL;
  DECLARE v_asset INT;
  DECLARE v_desc VARCHAR(500);
  DECLARE v_pri VARCHAR(10);
  DECLARE v_by VARCHAR(100);
  DECLARE v_wo INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('request.review');

  START TRANSACTION;
  SELECT status, asset_id, description, priority, reported_by
    INTO v_status, v_asset, v_desc, v_pri, v_by
    FROM service_requests WHERE request_id = p_request_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Request not found.';
  ELSEIF v_status <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This request has already been reviewed.';
  END IF;

  INSERT INTO work_orders (asset_id, type_id, priority, description, created_by)
  VALUES (v_asset, p_type_id, IFNULL(p_priority, v_pri),
          LEFT(CONCAT(v_desc, ' (reported by ', v_by, ', SR-', LPAD(p_request_id, 6, '0'), ')'), 500),
          COALESCE(@app_user, CURRENT_USER()));
  SET v_wo = LAST_INSERT_ID();

  UPDATE service_requests
     SET status = 'Converted', work_order_id = v_wo, review_note = NULLIF(TRIM(p_note), ''),
         reviewed_by = COALESCE(@app_user, CURRENT_USER()), reviewed_at = NOW()
   WHERE request_id = p_request_id;
  COMMIT;

  SELECT * FROM vw_service_requests WHERE request_id = p_request_id;
END$$

CREATE PROCEDURE sp_link_request(
  IN p_request_id INT, IN p_work_order_id INT, IN p_note VARCHAR(500))
BEGIN
  DECLARE v_status VARCHAR(10) DEFAULT NULL;
  DECLARE v_asset INT;
  DECLARE v_wo_asset INT DEFAULT NULL;
  DECLARE v_wo_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('request.review');

  START TRANSACTION;
  SELECT status, asset_id INTO v_status, v_asset
    FROM service_requests WHERE request_id = p_request_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Request not found.';
  ELSEIF v_status <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This request has already been reviewed.';
  END IF;

  SELECT asset_id, status INTO v_wo_asset, v_wo_status
    FROM work_orders WHERE work_order_id = p_work_order_id;
  IF v_wo_asset IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work order not found.';
  ELSEIF v_wo_asset <> v_asset THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'That work order belongs to a different asset.';
  ELSEIF v_wo_status NOT IN ('Open','Assigned','In Progress') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an open work order can be linked.';
  END IF;

  UPDATE service_requests
     SET status = 'Linked', work_order_id = p_work_order_id, review_note = NULLIF(TRIM(p_note), ''),
         reviewed_by = COALESCE(@app_user, CURRENT_USER()), reviewed_at = NOW()
   WHERE request_id = p_request_id;
  COMMIT;

  SELECT * FROM vw_service_requests WHERE request_id = p_request_id;
END$$

CREATE PROCEDURE sp_reject_request(IN p_request_id INT, IN p_note VARCHAR(500))
BEGIN
  DECLARE v_status VARCHAR(10) DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('request.review');

  START TRANSACTION;
  SELECT status INTO v_status FROM service_requests WHERE request_id = p_request_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Request not found.';
  ELSEIF v_status <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This request has already been reviewed.';
  END IF;

  UPDATE service_requests
     SET status = 'Rejected', review_note = NULLIF(TRIM(p_note), ''),
         reviewed_by = COALESCE(@app_user, CURRENT_USER()), reviewed_at = NOW()
   WHERE request_id = p_request_id;
  COMMIT;

  SELECT * FROM vw_service_requests WHERE request_id = p_request_id;
END$$

-- ---------------------------------------------------------------------
-- Service requests: reviewers see all, everyone else only their own
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_service_requests(IN p_status VARCHAR(20))
BEGIN
  CALL sp_require_permission('request.view');
  SELECT * FROM vw_service_requests
   WHERE (p_status IS NULL OR p_status = ''
          OR (p_status = 'Active' AND status = 'Pending')
          OR status = p_status)
     AND (fn_has_permission('request.review') = 1 OR reported_by = @app_user)
   ORDER BY FIELD(status, 'Pending','Converted','Linked','Rejected'),
            FIELD(priority, 'Critical','High','Medium','Low'), reported_at DESC
   LIMIT 200;
END$$

DELIMITER ;
