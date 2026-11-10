-- Upgrade for an EXISTING database: one open work order per asset and job type.
-- Run: cmd /c "C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 13_one_open_job_per_problem.sql"
DELIMITER $$
DROP TRIGGER IF EXISTS trg_wo_bi_rules$$
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
        ' is already open for this asset and job type. Tell the administrator what you found instead of opening another.');
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
  END IF;
  SET NEW.status = 'Open';
END$$
DELIMITER ;
