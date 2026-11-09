-- Upgrade for an EXISTING database: only users who may assign work (administrators)
-- can turn an alert into a work order. Technicians can still report a fault on an asset.
-- Run: cmd /c "C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 11_alert_workorder_admin_only.sql"
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_create_work_order$$
CREATE PROCEDURE sp_create_work_order(
  IN p_asset_id INT, IN p_type_id INT, IN p_priority VARCHAR(10),
  IN p_description VARCHAR(500), IN p_scheduled_date DATE, IN p_alert_id INT)
BEGIN
  DECLARE v_id INT;
  DECLARE v_match INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  CALL sp_require_permission('workorder.create');
  -- Turning a maintenance alert into a job is a planning decision (admin level);
  -- a technician may still report a fault on an asset (no alert attached).
  IF p_alert_id IS NOT NULL THEN
    CALL sp_require_permission('workorder.assign');
  END IF;

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

  SELECT * FROM vw_work_order_secure WHERE work_order_id = v_id;
END$$
DELIMITER ;
