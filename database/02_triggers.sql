-- =====================================================================
-- MedAsset: 02_triggers.sql
-- Business-rule, lifecycle, preventive-logic and audit triggers.
-- The acting user is passed from Django through the session variable
-- @app_user (falls back to the MySQL account when it is not set).
-- =====================================================================
USE medasset_db;

DELIMITER $$

-- =====================================================================
-- A) ASSETS: validation + lifecycle rules
-- =====================================================================
CREATE TRIGGER trg_assets_bi_rules
BEFORE INSERT ON assets
FOR EACH ROW
BEGIN
  SET NEW.asset_tag     = UPPER(TRIM(NEW.asset_tag));
  SET NEW.serial_number = TRIM(NEW.serial_number);
  IF NEW.status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A new asset cannot be registered as Decommissioned.';
  END IF;
END$$

CREATE TRIGGER trg_assets_bu_rules
BEFORE UPDATE ON assets
FOR EACH ROW
BEGIN
  IF OLD.status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Decommissioned assets are read-only (audit rule).';
  END IF;
  IF NEW.runtime_hours < OLD.runtime_hours THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Runtime hours cannot be decreased.';
  END IF;
  IF NEW.status = 'Decommissioned' THEN
    IF NEW.decommission_reason IS NULL OR TRIM(NEW.decommission_reason) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A decommission reason is required.';
    END IF;
    SET NEW.decommissioned_at = NOW();
  END IF;
END$$

CREATE TRIGGER trg_assets_bd_block
BEFORE DELETE ON assets
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assets cannot be deleted. Decommission the asset instead.';
END$$

-- Initial status entry when an asset is registered
CREATE TRIGGER trg_assets_ai_status_history
AFTER INSERT ON assets
FOR EACH ROW
BEGIN
  INSERT INTO asset_status_history (asset_id, old_status, new_status, changed_by, remarks)
  VALUES (NEW.asset_id, NULL, NEW.status, COALESCE(@app_user, CURRENT_USER()), 'Asset registered');
END$$

-- Every status change is recorded
CREATE TRIGGER trg_assets_au_status_history
AFTER UPDATE ON assets
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO asset_status_history (asset_id, old_status, new_status, changed_by, remarks)
    VALUES (NEW.asset_id, OLD.status, NEW.status, COALESCE(@app_user, CURRENT_USER()),
            COALESCE(@status_remarks, IF(NEW.status = 'Decommissioned', NEW.decommission_reason, NULL)));
  END IF;
END$$

-- Every departmental/room transfer is recorded, no matter how it was done
CREATE TRIGGER trg_assets_au_transfer_log
AFTER UPDATE ON assets
FOR EACH ROW
BEGIN
  IF NEW.current_location_id <> OLD.current_location_id THEN
    INSERT INTO asset_transfers (asset_id, from_location_id, to_location_id, transferred_by, reason)
    VALUES (NEW.asset_id, OLD.current_location_id, NEW.current_location_id,
            COALESCE(@app_user, CURRENT_USER()), COALESCE(@transfer_reason, 'Location changed'));
  END IF;
END$$

-- =====================================================================
-- B) PREVENTIVE LOGIC: runtime-hour threshold alerts
--    Fires whenever runtime_hours of an asset changes.
-- =====================================================================
CREATE TRIGGER trg_assets_au_runtime_alerts
AFTER UPDATE ON assets
FOR EACH ROW
BEGIN
  IF NEW.runtime_hours <> OLD.runtime_hours AND NEW.status <> 'Decommissioned' THEN

    -- escalate open "upcoming" alerts that have now crossed the threshold
    UPDATE maintenance_alerts al
      JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
       SET al.alert_type = 'OVERDUE',
           al.severity   = 'Critical',
           al.message    = CONCAT('Runtime threshold exceeded: due at ', s.next_due_hours,
                                  ' h, current ', NEW.runtime_hours, ' h')
     WHERE s.asset_id = NEW.asset_id
       AND s.interval_basis = 'RUNTIME'
       AND s.is_active = 1
       AND al.alert_type = 'UPCOMING'
       AND al.status IN ('Open','Acknowledged')
       AND NEW.runtime_hours >= s.next_due_hours;

    -- raise new alerts (one open alert per schedule)
    INSERT INTO maintenance_alerts (schedule_id, alert_type, severity, message)
    SELECT s.schedule_id,
           IF(NEW.runtime_hours >= s.next_due_hours, 'OVERDUE', 'UPCOMING'),
           IF(NEW.runtime_hours >= s.next_due_hours, 'Critical', 'Warning'),
           CONCAT(t.name, IF(NEW.runtime_hours >= s.next_due_hours, ' overdue: ', ' due soon: '),
                  'due at ', s.next_due_hours, ' h, current ', NEW.runtime_hours, ' h')
      FROM maintenance_schedules s
      JOIN maintenance_types t ON t.type_id = s.type_id
     WHERE s.asset_id = NEW.asset_id
       AND s.interval_basis = 'RUNTIME'
       AND s.is_active = 1
       AND s.next_due_hours IS NOT NULL
       AND NEW.runtime_hours >= s.next_due_hours - s.alert_lead_hours
       AND NOT EXISTS (SELECT 1 FROM maintenance_alerts x
                        WHERE x.schedule_id = s.schedule_id
                          AND x.status IN ('Open','Acknowledged'));
  END IF;
END$$

-- =====================================================================
-- C) WORK ORDERS: workflow rules, asset status sync, schedule roll-over
-- =====================================================================
CREATE TRIGGER trg_wo_bi_rules
BEFORE INSERT ON work_orders
FOR EACH ROW
BEGIN
  DECLARE v_asset_status VARCHAR(20);
  SELECT status INTO v_asset_status FROM assets WHERE asset_id = NEW.asset_id;
  IF v_asset_status = 'Decommissioned' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot open a work order for a decommissioned asset.';
  END IF;
  SET NEW.status = 'Open';
END$$

CREATE TRIGGER trg_wo_bu_rules
BEFORE UPDATE ON work_orders
FOR EACH ROW
BEGIN
  IF OLD.status IN ('Completed','Cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Closed work orders are immutable (audit rule).';
  END IF;

  IF NEW.status <> OLD.status THEN
    IF NOT ( (OLD.status = 'Open'        AND NEW.status IN ('Assigned','Cancelled'))
          OR (OLD.status = 'Assigned'    AND NEW.status IN ('In Progress','Cancelled'))
          OR (OLD.status = 'In Progress' AND NEW.status IN ('Completed','Cancelled')) ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid work order status transition.';
    END IF;
    -- timestamps default to NOW(); an explicit value is kept so past work can be back-filled
    IF NEW.status = 'In Progress' THEN
      IF NEW.started_at IS NULL OR NEW.started_at <=> OLD.started_at THEN
        SET NEW.started_at = NOW();
      END IF;
    END IF;
    IF NEW.status IN ('Completed','Cancelled') THEN
      IF NEW.completed_at IS NULL OR NEW.completed_at <=> OLD.completed_at THEN
        SET NEW.completed_at = NOW();
      END IF;
      IF NEW.completed_at < NEW.opened_at THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Completion time cannot be earlier than the opened time.';
      END IF;
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_wo_bd_block
BEFORE DELETE ON work_orders
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work orders cannot be deleted. Cancel the work order instead.';
END$$

-- Corrective work puts the asset in "Repair" and returns it to "In-Use" afterwards
CREATE TRIGGER trg_wo_au_asset_sync
AFTER UPDATE ON work_orders
FOR EACH ROW
BEGIN
  DECLARE v_preventive TINYINT(1);
  DECLARE v_other_active INT DEFAULT 0;

  IF NEW.status <> OLD.status THEN
    SELECT is_preventive INTO v_preventive FROM maintenance_types WHERE type_id = NEW.type_id;

    IF v_preventive = 0 THEN
      IF NEW.status = 'In Progress' THEN
        SET @status_remarks = CONCAT('Work order #', NEW.work_order_id, ' started');
        UPDATE assets SET status = 'Repair'
         WHERE asset_id = NEW.asset_id AND status = 'In-Use';
        SET @status_remarks = NULL;

      ELSEIF NEW.status IN ('Completed','Cancelled') AND OLD.status = 'In Progress' THEN
        SELECT COUNT(*) INTO v_other_active
          FROM work_orders w
          JOIN maintenance_types t ON t.type_id = w.type_id
         WHERE w.asset_id = NEW.asset_id
           AND w.work_order_id <> NEW.work_order_id
           AND w.status = 'In Progress'
           AND t.is_preventive = 0;
        IF v_other_active = 0 THEN
          SET @status_remarks = CONCAT('Work order #', NEW.work_order_id, ' ', LOWER(NEW.status));
          UPDATE assets SET status = 'In-Use'
           WHERE asset_id = NEW.asset_id AND status = 'Repair';
          SET @status_remarks = NULL;
        END IF;
      END IF;
    END IF;
  END IF;
END$$

-- Completed work rolls the matching schedule forward and resolves its alerts
CREATE TRIGGER trg_wo_au_schedule_rollover
AFTER UPDATE ON work_orders
FOR EACH ROW
BEGIN
  IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN

    UPDATE maintenance_schedules s
      JOIN assets a ON a.asset_id = s.asset_id
       SET s.last_performed_date  = DATE(NEW.completed_at),
           s.last_performed_hours = a.runtime_hours,
           s.next_due_date  = IF(s.interval_basis = 'CALENDAR',
                                 DATE_ADD(DATE(NEW.completed_at), INTERVAL s.interval_days DAY),
                                 s.next_due_date),
           s.next_due_hours = IF(s.interval_basis = 'RUNTIME',
                                 a.runtime_hours + s.interval_hours,
                                 s.next_due_hours)
     WHERE s.asset_id = NEW.asset_id
       AND s.type_id  = NEW.type_id
       AND s.is_active = 1;

    UPDATE maintenance_alerts al
      JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
       SET al.status = 'Resolved', al.resolved_at = NOW()
     WHERE s.asset_id = NEW.asset_id
       AND s.type_id  = NEW.type_id
       AND al.status IN ('Open','Acknowledged');
  END IF;
END$$

-- =====================================================================
-- D) LABOR + PARTS: closed work orders are locked, cost snapshots
-- =====================================================================
CREATE TRIGGER trg_woa_bi_rules
BEFORE INSERT ON work_order_assignments
FOR EACH ROW
BEGIN
  DECLARE v_wo_status VARCHAR(20);
  DECLARE v_rate DECIMAL(10,2);
  DECLARE v_active TINYINT(1);

  SELECT status INTO v_wo_status FROM work_orders WHERE work_order_id = NEW.work_order_id;
  IF v_wo_status IN ('Completed','Cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot assign technicians to a closed work order.';
  END IF;

  SELECT hourly_rate, is_active INTO v_rate, v_active
    FROM technicians WHERE technician_id = NEW.technician_id;
  IF v_active = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Technician is inactive.';
  END IF;
  SET NEW.hourly_rate = v_rate;      -- snapshot: later rate changes do not alter history
END$$

CREATE TRIGGER trg_woa_bu_rules
BEFORE UPDATE ON work_order_assignments
FOR EACH ROW
BEGIN
  DECLARE v_wo_status VARCHAR(20);
  SELECT status INTO v_wo_status FROM work_orders WHERE work_order_id = OLD.work_order_id;
  IF v_wo_status IN ('Completed','Cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Labor on a closed work order cannot be changed.';
  END IF;
END$$

CREATE TRIGGER trg_wop_bi_rules
BEFORE INSERT ON work_order_parts
FOR EACH ROW
BEGIN
  DECLARE v_wo_status VARCHAR(20);
  DECLARE v_cost DECIMAL(10,2);

  SELECT status INTO v_wo_status FROM work_orders WHERE work_order_id = NEW.work_order_id;
  IF v_wo_status IN ('Completed','Cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot add parts to a closed work order.';
  END IF;

  SELECT unit_cost INTO v_cost FROM parts WHERE part_id = NEW.part_id;
  SET NEW.unit_cost = v_cost;        -- snapshot of the price at time of use
END$$

-- =====================================================================
-- E) AUDIT LOG TRIGGERS (who changed what, when, old vs new values)
-- =====================================================================
CREATE TRIGGER trg_assets_ai_audit
AFTER INSERT ON assets
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('assets', NEW.asset_id, 'INSERT',
          JSON_OBJECT('asset_tag', NEW.asset_tag, 'serial_number', NEW.serial_number,
                      'status', NEW.status, 'location_id', NEW.current_location_id,
                      'purchase_cost', NEW.purchase_cost, 'warranty_expiry', NEW.warranty_expiry),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_assets_au_audit
AFTER UPDATE ON assets
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
  VALUES ('assets', NEW.asset_id, 'UPDATE',
          JSON_OBJECT('status', OLD.status, 'location_id', OLD.current_location_id,
                      'runtime_hours', OLD.runtime_hours, 'warranty_expiry', OLD.warranty_expiry),
          JSON_OBJECT('status', NEW.status, 'location_id', NEW.current_location_id,
                      'runtime_hours', NEW.runtime_hours, 'warranty_expiry', NEW.warranty_expiry),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_wo_ai_audit
AFTER INSERT ON work_orders
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('work_orders', NEW.work_order_id, 'INSERT',
          JSON_OBJECT('asset_id', NEW.asset_id, 'type_id', NEW.type_id, 'priority', NEW.priority,
                      'status', NEW.status, 'description', NEW.description),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_wo_au_audit
AFTER UPDATE ON work_orders
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
  VALUES ('work_orders', NEW.work_order_id, 'UPDATE',
          JSON_OBJECT('status', OLD.status, 'priority', OLD.priority),
          JSON_OBJECT('status', NEW.status, 'priority', NEW.priority,
                      'resolution_notes', NEW.resolution_notes),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_woa_ai_audit
AFTER INSERT ON work_order_assignments
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('work_order_assignments', NEW.assignment_id, 'INSERT',
          JSON_OBJECT('work_order_id', NEW.work_order_id, 'technician_id', NEW.technician_id,
                      'role', NEW.role, 'hourly_rate', NEW.hourly_rate),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_woa_au_audit
AFTER UPDATE ON work_order_assignments
FOR EACH ROW
BEGIN
  IF NEW.hours_worked <> OLD.hours_worked THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('work_order_assignments', NEW.assignment_id, 'UPDATE',
            JSON_OBJECT('hours_worked', OLD.hours_worked),
            JSON_OBJECT('hours_worked', NEW.hours_worked),
            COALESCE(@app_user, CURRENT_USER()));
  END IF;
END$$

CREATE TRIGGER trg_wop_ai_audit
AFTER INSERT ON work_order_parts
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('work_order_parts', NEW.wo_part_id, 'INSERT',
          JSON_OBJECT('work_order_id', NEW.work_order_id, 'part_id', NEW.part_id,
                      'quantity', NEW.quantity, 'unit_cost', NEW.unit_cost),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_schedules_ai_audit
AFTER INSERT ON maintenance_schedules
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
  VALUES ('maintenance_schedules', NEW.schedule_id, 'INSERT',
          JSON_OBJECT('asset_id', NEW.asset_id, 'type_id', NEW.type_id,
                      'basis', NEW.interval_basis, 'next_due_date', NEW.next_due_date,
                      'next_due_hours', NEW.next_due_hours),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_schedules_au_audit
AFTER UPDATE ON maintenance_schedules
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
  VALUES ('maintenance_schedules', NEW.schedule_id, 'UPDATE',
          JSON_OBJECT('next_due_date', OLD.next_due_date, 'next_due_hours', OLD.next_due_hours,
                      'is_active', OLD.is_active),
          JSON_OBJECT('next_due_date', NEW.next_due_date, 'next_due_hours', NEW.next_due_hours,
                      'is_active', NEW.is_active),
          COALESCE(@app_user, CURRENT_USER()));
END$$

CREATE TRIGGER trg_parts_au_audit
AFTER UPDATE ON parts
FOR EACH ROW
BEGIN
  IF NEW.quantity_on_hand <> OLD.quantity_on_hand OR NEW.unit_cost <> OLD.unit_cost THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('parts', NEW.part_id, 'UPDATE',
            JSON_OBJECT('quantity_on_hand', OLD.quantity_on_hand, 'unit_cost', OLD.unit_cost),
            JSON_OBJECT('quantity_on_hand', NEW.quantity_on_hand, 'unit_cost', NEW.unit_cost),
            COALESCE(@app_user, CURRENT_USER()));
  END IF;
END$$

DELIMITER ;
