-- =====================================================================
-- MedAsset: 04_procedures_write.sql
-- Transactional stored procedures (all data changes go through these).
-- Pattern: START TRANSACTION -> lock rows (FOR UPDATE) -> validate ->
--          change data -> COMMIT.  Any error => ROLLBACK + RESIGNAL.
-- The acting user is read from @app_user (set by Django per request).
-- =====================================================================
USE medasset_db;

DELIMITER $$

-- ---------------------------------------------------------------------
-- Internal: raise / escalate preventive-maintenance alerts.
-- Used by the daily event, the manual "run check" button and schedule creation.
-- p_asset_id = NULL  -> check every asset
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_evaluate_alerts(IN p_asset_id INT, OUT p_new_alerts INT)
BEGIN
  SET p_new_alerts = 0;

  -- 1) calendar schedules: escalate UPCOMING -> OVERDUE
  UPDATE maintenance_alerts al
    JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
    JOIN maintenance_types t     ON t.type_id = s.type_id
     SET al.alert_type = 'OVERDUE',
         al.severity   = 'Critical',
         al.message    = CONCAT(t.name, ' overdue since ', s.next_due_date, ' (',
                                DATEDIFF(CURDATE(), s.next_due_date), ' days late)')
   WHERE al.alert_type = 'UPCOMING'
     AND al.status IN ('Open','Acknowledged')
     AND s.interval_basis = 'CALENDAR'
     AND s.is_active = 1
     AND s.next_due_date < CURDATE()
     AND (p_asset_id IS NULL OR s.asset_id = p_asset_id);

  -- 2) calendar schedules: new alerts inside the lead window
  INSERT INTO maintenance_alerts (schedule_id, alert_type, severity, message)
  SELECT s.schedule_id,
         IF(s.next_due_date < CURDATE(), 'OVERDUE', 'UPCOMING'),
         IF(s.next_due_date < CURDATE(), 'Critical', 'Warning'),
         CONCAT(t.name,
                IF(s.next_due_date < CURDATE(), ' overdue since ', ' due on '), s.next_due_date,
                ' (', ABS(DATEDIFF(s.next_due_date, CURDATE())), ' days ',
                IF(s.next_due_date < CURDATE(), 'late)', 'left)'))
    FROM maintenance_schedules s
    JOIN maintenance_types t ON t.type_id = s.type_id
    JOIN assets a            ON a.asset_id = s.asset_id
   WHERE s.is_active = 1
     AND s.interval_basis = 'CALENDAR'
     AND s.next_due_date IS NOT NULL
     AND a.status <> 'Decommissioned'
     AND (p_asset_id IS NULL OR s.asset_id = p_asset_id)
     AND s.next_due_date <= DATE_ADD(CURDATE(), INTERVAL s.alert_lead_days DAY)
     AND NOT EXISTS (SELECT 1 FROM maintenance_alerts x
                      WHERE x.schedule_id = s.schedule_id
                        AND x.status IN ('Open','Acknowledged'));
  SET p_new_alerts = p_new_alerts + ROW_COUNT();

  -- 3) runtime schedules: escalate UPCOMING -> OVERDUE
  UPDATE maintenance_alerts al
    JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
    JOIN assets a                ON a.asset_id = s.asset_id
     SET al.alert_type = 'OVERDUE',
         al.severity   = 'Critical',
         al.message    = CONCAT('Runtime threshold exceeded: due at ', s.next_due_hours,
                                ' h, current ', a.runtime_hours, ' h')
   WHERE al.alert_type = 'UPCOMING'
     AND al.status IN ('Open','Acknowledged')
     AND s.interval_basis = 'RUNTIME'
     AND s.is_active = 1
     AND a.runtime_hours >= s.next_due_hours
     AND (p_asset_id IS NULL OR s.asset_id = p_asset_id);

  -- 4) runtime schedules: new alerts inside the lead window
  INSERT INTO maintenance_alerts (schedule_id, alert_type, severity, message)
  SELECT s.schedule_id,
         IF(a.runtime_hours >= s.next_due_hours, 'OVERDUE', 'UPCOMING'),
         IF(a.runtime_hours >= s.next_due_hours, 'Critical', 'Warning'),
         CONCAT(t.name, IF(a.runtime_hours >= s.next_due_hours, ' overdue: ', ' due soon: '),
                'due at ', s.next_due_hours, ' h, current ', a.runtime_hours, ' h')
    FROM maintenance_schedules s
    JOIN maintenance_types t ON t.type_id = s.type_id
    JOIN assets a            ON a.asset_id = s.asset_id
   WHERE s.is_active = 1
     AND s.interval_basis = 'RUNTIME'
     AND s.next_due_hours IS NOT NULL
     AND a.status <> 'Decommissioned'
     AND (p_asset_id IS NULL OR s.asset_id = p_asset_id)
     AND a.runtime_hours >= s.next_due_hours - s.alert_lead_hours
     AND NOT EXISTS (SELECT 1 FROM maintenance_alerts x
                      WHERE x.schedule_id = s.schedule_id
                        AND x.status IN ('Open','Acknowledged'));
  SET p_new_alerts = p_new_alerts + ROW_COUNT();
END$$

-- Called by the scheduled event (no result set)
CREATE PROCEDURE sp_daily_preventive_job()
BEGIN
  DECLARE v_new INT DEFAULT 0;
  CALL sp_evaluate_alerts(NULL, v_new);
  INSERT INTO job_logs (job_name, triggered_by, alerts_created)
  VALUES ('preventive_check', 'EVENT', v_new);
END$$

-- Called from the UI ("Run preventive check now")
CREATE PROCEDURE sp_run_preventive_check()
BEGIN
  DECLARE v_new INT DEFAULT 0;
  CALL sp_evaluate_alerts(NULL, v_new);
  INSERT INTO job_logs (job_name, triggered_by, alerts_created)
  VALUES ('preventive_check', 'MANUAL', v_new);
  SELECT v_new AS alerts_created, NOW() AS ran_at;
END$$

-- ---------------------------------------------------------------------
-- ASSET LIFECYCLE
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_register_asset(
  IN p_asset_tag VARCHAR(20), IN p_serial_number VARCHAR(60), IN p_model_id INT,
  IN p_supplier_id INT, IN p_location_id INT, IN p_purchase_date DATE,
  IN p_purchase_cost DECIMAL(12,2), IN p_warranty_expiry DATE, IN p_runtime_hours DECIMAL(10,1))
BEGIN
  DECLARE v_id INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  INSERT INTO assets (asset_tag, serial_number, model_id, supplier_id, current_location_id,
                      purchase_date, purchase_cost, warranty_expiry, runtime_hours)
  VALUES (p_asset_tag, p_serial_number, p_model_id, p_supplier_id, p_location_id,
          p_purchase_date, p_purchase_cost, p_warranty_expiry, IFNULL(p_runtime_hours, 0));
  SET v_id = LAST_INSERT_ID();
  COMMIT;

  SELECT * FROM vw_asset_overview WHERE asset_id = v_id;
END$$

CREATE PROCEDURE sp_transfer_asset(
  IN p_asset_id INT, IN p_to_location_id INT, IN p_reason VARCHAR(255))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_from INT;
  DECLARE v_exists INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status, current_location_id INTO v_status, v_from
    FROM assets WHERE asset_id = p_asset_id FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset not found.';
  END IF;
  IF v_status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Decommissioned assets cannot be transferred.';
  END IF;
  SELECT COUNT(*) INTO v_exists FROM locations WHERE location_id = p_to_location_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Destination location not found.';
  END IF;
  IF v_from = p_to_location_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset is already in that location.';
  END IF;

  SET @transfer_reason = p_reason;          -- read by trg_assets_au_transfer_log
  UPDATE assets SET current_location_id = p_to_location_id WHERE asset_id = p_asset_id;
  SET @transfer_reason = NULL;
  COMMIT;

  SELECT * FROM vw_asset_overview WHERE asset_id = p_asset_id;
END$$

CREATE PROCEDURE sp_update_asset_status(
  IN p_asset_id INT, IN p_new_status VARCHAR(20), IN p_remarks VARCHAR(255))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_new_status NOT IN ('In-Use','Repair') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Use the decommission action to retire an asset.';
  END IF;

  START TRANSACTION;
  SELECT status INTO v_status FROM assets WHERE asset_id = p_asset_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset not found.';
  END IF;
  IF v_status = p_new_status THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset already has that status.';
  END IF;

  SET @status_remarks = p_remarks;          -- read by trg_assets_au_status_history
  UPDATE assets SET status = p_new_status WHERE asset_id = p_asset_id;
  SET @status_remarks = NULL;
  COMMIT;

  SELECT * FROM vw_asset_overview WHERE asset_id = p_asset_id;
END$$

-- Record a new runtime reading; trg_assets_au_runtime_alerts raises threshold alerts
CREATE PROCEDURE sp_update_runtime(IN p_asset_id INT, IN p_runtime_hours DECIMAL(10,1))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM assets WHERE asset_id = p_asset_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset not found.';
  END IF;
  UPDATE assets SET runtime_hours = p_runtime_hours WHERE asset_id = p_asset_id;
  COMMIT;

  SELECT * FROM vw_asset_overview WHERE asset_id = p_asset_id;
END$$

CREATE PROCEDURE sp_decommission_asset(IN p_asset_id INT, IN p_reason VARCHAR(255))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_active_wo INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM assets WHERE asset_id = p_asset_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset not found.';
  END IF;
  IF v_status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset is already decommissioned.';
  END IF;

  SELECT COUNT(*) INTO v_active_wo FROM work_orders
   WHERE asset_id = p_asset_id AND status IN ('Open','Assigned','In Progress');
  IF v_active_wo > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Close or cancel the open work orders first.';
  END IF;

  UPDATE maintenance_alerts al
    JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
     SET al.status = 'Resolved', al.resolved_at = NOW()
   WHERE s.asset_id = p_asset_id AND al.status IN ('Open','Acknowledged');
  UPDATE maintenance_schedules SET is_active = 0 WHERE asset_id = p_asset_id;

  UPDATE assets SET status = 'Decommissioned', decommission_reason = p_reason
   WHERE asset_id = p_asset_id;
  COMMIT;

  SELECT * FROM vw_asset_overview WHERE asset_id = p_asset_id;
END$$

-- ---------------------------------------------------------------------
-- PREVENTIVE SCHEDULES + ALERTS
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_create_schedule(
  IN p_asset_id INT, IN p_type_id INT, IN p_basis VARCHAR(10),
  IN p_interval_days INT, IN p_interval_hours INT,
  IN p_lead_days INT, IN p_lead_hours INT, IN p_last_performed DATE)
BEGIN
  DECLARE v_runtime DECIMAL(10,1);
  DECLARE v_status VARCHAR(20);
  DECLARE v_next_date DATE DEFAULT NULL;
  DECLARE v_next_hours DECIMAL(10,1) DEFAULT NULL;
  DECLARE v_id INT;
  DECLARE v_new INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_basis NOT IN ('CALENDAR','RUNTIME') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Basis must be CALENDAR or RUNTIME.';
  END IF;
  IF p_basis = 'CALENDAR' AND (p_interval_days IS NULL OR p_interval_days <= 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Calendar schedules need an interval in days.';
  END IF;
  IF p_basis = 'RUNTIME' AND (p_interval_hours IS NULL OR p_interval_hours <= 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Runtime schedules need an interval in hours.';
  END IF;

  START TRANSACTION;
  SELECT runtime_hours, status INTO v_runtime, v_status
    FROM assets WHERE asset_id = p_asset_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset not found.';
  END IF;
  IF v_status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot schedule maintenance for a decommissioned asset.';
  END IF;

  IF p_basis = 'CALENDAR' THEN
    SET v_next_date = DATE_ADD(COALESCE(p_last_performed, CURDATE()), INTERVAL p_interval_days DAY);
  ELSE
    SET v_next_hours = v_runtime + p_interval_hours;
  END IF;

  INSERT INTO maintenance_schedules
    (asset_id, type_id, interval_basis, interval_days, interval_hours,
     alert_lead_days, alert_lead_hours, last_performed_date, last_performed_hours,
     next_due_date, next_due_hours)
  VALUES
    (p_asset_id, p_type_id, p_basis, p_interval_days, p_interval_hours,
     IFNULL(p_lead_days, 14), IFNULL(p_lead_hours, 50),
     p_last_performed, IF(p_basis = 'RUNTIME', v_runtime, NULL),
     v_next_date, v_next_hours);
  SET v_id = LAST_INSERT_ID();

  CALL sp_evaluate_alerts(p_asset_id, v_new);
  COMMIT;

  SELECT * FROM vw_schedule_status WHERE schedule_id = v_id;
END$$

CREATE PROCEDURE sp_toggle_schedule(IN p_schedule_id INT, IN p_active TINYINT)
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  SELECT COUNT(*) INTO v_exists FROM maintenance_schedules WHERE schedule_id = p_schedule_id;
  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Schedule not found.';
  END IF;
  UPDATE maintenance_schedules SET is_active = p_active WHERE schedule_id = p_schedule_id;
  SELECT * FROM vw_schedule_status WHERE schedule_id = p_schedule_id;
END$$

CREATE PROCEDURE sp_acknowledge_alert(IN p_alert_id INT)
BEGIN
  DECLARE v_status VARCHAR(20);
  SELECT status INTO v_status FROM maintenance_alerts WHERE alert_id = p_alert_id;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alert not found.';
  END IF;
  IF v_status <> 'Open' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only open alerts can be acknowledged.';
  END IF;
  UPDATE maintenance_alerts
     SET status = 'Acknowledged',
         acknowledged_by = COALESCE(@app_user, CURRENT_USER()),
         acknowledged_at = NOW()
   WHERE alert_id = p_alert_id;
  SELECT * FROM vw_alerts WHERE alert_id = p_alert_id;
END$$

-- ---------------------------------------------------------------------
-- WORK ORDERS
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_create_work_order(
  IN p_asset_id INT, IN p_type_id INT, IN p_priority VARCHAR(10),
  IN p_description VARCHAR(500), IN p_scheduled_date DATE, IN p_alert_id INT)
BEGIN
  DECLARE v_id INT;
  DECLARE v_match INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_description IS NULL OR TRIM(p_description) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A work order description is required.';
  END IF;

  START TRANSACTION;
  INSERT INTO work_orders (asset_id, type_id, priority, description, scheduled_date, created_by)
  VALUES (p_asset_id, p_type_id, IFNULL(p_priority, 'Medium'), p_description, p_scheduled_date,
          COALESCE(@app_user, CURRENT_USER()));
  SET v_id = LAST_INSERT_ID();

  IF p_alert_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_match
      FROM maintenance_alerts al
      JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
     WHERE al.alert_id = p_alert_id AND s.asset_id = p_asset_id
       AND al.status IN ('Open','Acknowledged');
    IF v_match = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alert does not belong to this asset or is closed.';
    END IF;
    UPDATE maintenance_alerts
       SET status = 'Acknowledged', work_order_id = v_id,
           acknowledged_by = COALESCE(acknowledged_by, COALESCE(@app_user, CURRENT_USER())),
           acknowledged_at = COALESCE(acknowledged_at, NOW())
     WHERE alert_id = p_alert_id;
  END IF;
  COMMIT;

  SELECT * FROM vw_work_order_summary WHERE work_order_id = v_id;
END$$

CREATE PROCEDURE sp_assign_technician(
  IN p_work_order_id INT, IN p_technician_id INT, IN p_role VARCHAR(10))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM work_orders WHERE work_order_id = p_work_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work order not found.';
  END IF;

  INSERT INTO work_order_assignments (work_order_id, technician_id, role)
  VALUES (p_work_order_id, p_technician_id, IFNULL(p_role, 'Lead'));

  IF v_status = 'Open' THEN
    UPDATE work_orders SET status = 'Assigned' WHERE work_order_id = p_work_order_id;
  END IF;
  COMMIT;

  SELECT * FROM vw_work_order_summary WHERE work_order_id = p_work_order_id;
END$$

CREATE PROCEDURE sp_start_work_order(IN p_work_order_id INT)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM work_orders WHERE work_order_id = p_work_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work order not found.';
  END IF;
  IF v_status <> 'Assigned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assign a technician before starting the work order.';
  END IF;
  UPDATE work_orders SET status = 'In Progress' WHERE work_order_id = p_work_order_id;
  COMMIT;

  SELECT * FROM vw_work_order_summary WHERE work_order_id = p_work_order_id;
END$$

CREATE PROCEDURE sp_log_labor_hours(
  IN p_work_order_id INT, IN p_technician_id INT, IN p_hours DECIMAL(6,2))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_assigned INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_hours IS NULL OR p_hours <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hours must be greater than zero.';
  END IF;

  START TRANSACTION;
  SELECT status INTO v_status FROM work_orders WHERE work_order_id = p_work_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work order not found.';
  END IF;
  IF v_status <> 'In Progress' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Labor can only be logged on work orders in progress.';
  END IF;
  SELECT COUNT(*) INTO v_assigned FROM work_order_assignments
   WHERE work_order_id = p_work_order_id AND technician_id = p_technician_id;
  IF v_assigned = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Technician is not assigned to this work order.';
  END IF;

  UPDATE work_order_assignments SET hours_worked = hours_worked + p_hours
   WHERE work_order_id = p_work_order_id AND technician_id = p_technician_id;
  COMMIT;

  SELECT * FROM vw_work_order_summary WHERE work_order_id = p_work_order_id;
END$$

-- Consumes stock and records the replaced component in ONE transaction.
-- The FOR UPDATE row lock makes two simultaneous requests for the last unit safe.
CREATE PROCEDURE sp_add_part_to_work_order(
  IN p_work_order_id INT, IN p_part_id INT, IN p_quantity INT)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_stock INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantity must be greater than zero.';
  END IF;

  START TRANSACTION;
  SELECT status INTO v_status FROM work_orders WHERE work_order_id = p_work_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work order not found.';
  END IF;
  IF v_status <> 'In Progress' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parts can only be used on work orders in progress.';
  END IF;

  SELECT quantity_on_hand INTO v_stock FROM parts WHERE part_id = p_part_id FOR UPDATE;
  IF v_stock IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Part not found.';
  END IF;
  IF v_stock < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for this part.';
  END IF;

  UPDATE parts SET quantity_on_hand = quantity_on_hand - p_quantity WHERE part_id = p_part_id;
  INSERT INTO work_order_parts (work_order_id, part_id, quantity)
  VALUES (p_work_order_id, p_part_id, p_quantity);
  COMMIT;

  SELECT * FROM vw_work_order_summary WHERE work_order_id = p_work_order_id;
END$$

CREATE PROCEDURE sp_complete_work_order(
  IN p_work_order_id INT, IN p_resolution_notes VARCHAR(500),
  IN p_cal_result VARCHAR(10), IN p_certificate_no VARCHAR(60))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_is_cal TINYINT(1);
  DECLARE v_hours DECIMAL(10,2);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT w.status, t.is_calibration INTO v_status, v_is_cal
    FROM work_orders w JOIN maintenance_types t ON t.type_id = w.type_id
   WHERE w.work_order_id = p_work_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work order not found.';
  END IF;
  IF v_status <> 'In Progress' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only work orders in progress can be completed.';
  END IF;

  SELECT IFNULL(SUM(hours_worked), 0) INTO v_hours
    FROM work_order_assignments WHERE work_order_id = p_work_order_id;
  IF v_hours <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Log labor hours before completing the work order.';
  END IF;

  IF v_is_cal = 1 THEN
    IF p_cal_result IS NULL OR p_cal_result NOT IN ('Pass','Fail','Adjusted') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Calibration result (Pass/Fail/Adjusted) is required.';
    END IF;
    INSERT INTO calibration_logs (work_order_id, calibrated_on, result, certificate_no, notes)
    VALUES (p_work_order_id, CURDATE(), p_cal_result, p_certificate_no, p_resolution_notes);
  END IF;

  UPDATE work_orders SET status = 'Completed', resolution_notes = p_resolution_notes
   WHERE work_order_id = p_work_order_id;
  COMMIT;

  SELECT * FROM vw_work_order_summary WHERE work_order_id = p_work_order_id;
END$$

CREATE PROCEDURE sp_cancel_work_order(IN p_work_order_id INT, IN p_reason VARCHAR(500))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_parts INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM work_orders WHERE work_order_id = p_work_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work order not found.';
  END IF;
  SELECT COUNT(*) INTO v_parts FROM work_order_parts WHERE work_order_id = p_work_order_id;
  IF v_parts > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parts were already used; the work order cannot be cancelled.';
  END IF;

  UPDATE work_orders SET status = 'Cancelled', resolution_notes = p_reason
   WHERE work_order_id = p_work_order_id;

  -- give the linked alert back to the queue so it is not lost
  UPDATE maintenance_alerts SET status = 'Open', work_order_id = NULL
   WHERE work_order_id = p_work_order_id AND status = 'Acknowledged';
  COMMIT;

  SELECT * FROM vw_work_order_summary WHERE work_order_id = p_work_order_id;
END$$

DELIMITER ;
