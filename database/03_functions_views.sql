-- =====================================================================
-- MedAsset: 03_functions_views.sql
-- Stored functions (reusable calculations) and read-only views.
-- =====================================================================
USE medasset_db;

DELIMITER $$

CREATE FUNCTION fn_work_order_labor_cost(p_work_order_id INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(12,2);
  SELECT IFNULL(SUM(labor_cost), 0) INTO v_total
    FROM work_order_assignments WHERE work_order_id = p_work_order_id;
  RETURN v_total;
END$$

CREATE FUNCTION fn_work_order_parts_cost(p_work_order_id INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(12,2);
  SELECT IFNULL(SUM(line_cost), 0) INTO v_total
    FROM work_order_parts WHERE work_order_id = p_work_order_id;
  RETURN v_total;
END$$

-- lifetime repair/maintenance spend of one asset (cancelled work orders excluded)
CREATE FUNCTION fn_asset_total_cost(p_asset_id INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(12,2);
  SELECT IFNULL(SUM(fn_work_order_labor_cost(w.work_order_id)
                  + fn_work_order_parts_cost(w.work_order_id)), 0) INTO v_total
    FROM work_orders w
   WHERE w.asset_id = p_asset_id AND w.status <> 'Cancelled';
  RETURN v_total;
END$$

-- 'Overdue' / 'Due Soon' / 'OK' for a schedule row
CREATE FUNCTION fn_schedule_state(
  p_basis VARCHAR(10), p_due_date DATE, p_due_hours DECIMAL(10,1),
  p_lead_days INT, p_lead_hours INT, p_runtime DECIMAL(10,1))
RETURNS VARCHAR(10)
NOT DETERMINISTIC
NO SQL
BEGIN
  IF p_basis = 'CALENDAR' THEN
    IF p_due_date IS NULL THEN RETURN 'OK'; END IF;
    IF p_due_date < CURDATE() THEN RETURN 'Overdue'; END IF;
    IF p_due_date <= DATE_ADD(CURDATE(), INTERVAL p_lead_days DAY) THEN RETURN 'Due Soon'; END IF;
    RETURN 'OK';
  END IF;
  IF p_due_hours IS NULL THEN RETURN 'OK'; END IF;
  IF p_runtime >= p_due_hours THEN RETURN 'Overdue'; END IF;
  IF p_runtime >= p_due_hours - p_lead_hours THEN RETURN 'Due Soon'; END IF;
  RETURN 'OK';
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------
CREATE VIEW vw_asset_overview AS
SELECT a.asset_id, a.asset_tag, a.serial_number, a.status,
       m.model_id, m.model_name, c.name AS category, c.risk_class,
       mf.name AS manufacturer, sp.name AS supplier,
       l.location_id, l.room_name, d.department_id, d.name AS department,
       a.acquisition_type, a.donor,
       a.purchase_date, a.purchase_cost, a.warranty_expiry,
       CASE WHEN a.warranty_expiry IS NULL THEN 'None'
            WHEN a.warranty_expiry < CURDATE() THEN 'Expired'
            WHEN a.warranty_expiry <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'Expiring'
            ELSE 'Active' END AS warranty_status,
       a.runtime_hours,
       TIMESTAMPDIFF(YEAR, a.purchase_date, CURDATE()) AS age_years,
       a.decommissioned_at, a.decommission_reason,
       fn_asset_total_cost(a.asset_id) AS lifetime_maintenance_cost,
       (SELECT COUNT(*)
          FROM maintenance_alerts al
          JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
         WHERE s.asset_id = a.asset_id AND al.status IN ('Open','Acknowledged')) AS open_alerts
  FROM assets a
  JOIN asset_models m      ON m.model_id = a.model_id
  JOIN asset_categories c  ON c.category_id = m.category_id
  JOIN vendors mf          ON mf.vendor_id = m.manufacturer_id
  LEFT JOIN vendors sp     ON sp.vendor_id = a.supplier_id
  JOIN locations l         ON l.location_id = a.current_location_id
  JOIN departments d       ON d.department_id = l.department_id;

CREATE VIEW vw_work_order_summary AS
SELECT w.work_order_id,
       CONCAT('WO-', LPAD(w.work_order_id, 6, '0')) AS wo_number,
       w.asset_id, a.asset_tag, m.model_name, d.name AS department,
       t.name AS type_name, t.is_preventive, t.is_calibration,
       w.priority, w.status, w.description, w.resolution_notes, w.created_by,
       w.opened_at, w.scheduled_date, w.started_at, w.completed_at,
       fn_work_order_labor_cost(w.work_order_id) AS labor_cost,
       fn_work_order_parts_cost(w.work_order_id) AS parts_cost,
       fn_work_order_labor_cost(w.work_order_id) + fn_work_order_parts_cost(w.work_order_id) AS total_cost,
       (SELECT GROUP_CONCAT(CONCAT(te.first_name, ' ', te.last_name) SEPARATOR ', ')
          FROM work_order_assignments x
          JOIN technicians te ON te.technician_id = x.technician_id
         WHERE x.work_order_id = w.work_order_id) AS technicians,
       DATEDIFF(COALESCE(w.completed_at, NOW()), w.opened_at) AS days_open
  FROM work_orders w
  JOIN assets a            ON a.asset_id = w.asset_id
  JOIN asset_models m      ON m.model_id = a.model_id
  JOIN locations l         ON l.location_id = a.current_location_id
  JOIN departments d       ON d.department_id = l.department_id
  JOIN maintenance_types t ON t.type_id = w.type_id;

CREATE VIEW vw_schedule_status AS
SELECT s.schedule_id, s.asset_id, a.asset_tag, m.model_name, d.name AS department,
       t.type_id, t.name AS type_name, s.interval_basis, s.interval_days, s.interval_hours,
       s.alert_lead_days, s.alert_lead_hours,
       s.last_performed_date, s.last_performed_hours,
       s.next_due_date, s.next_due_hours, a.runtime_hours AS current_runtime_hours,
       s.is_active,
       CASE WHEN s.interval_basis = 'CALENDAR' THEN DATEDIFF(s.next_due_date, CURDATE()) END AS days_remaining,
       CASE WHEN s.interval_basis = 'RUNTIME'  THEN s.next_due_hours - a.runtime_hours END AS hours_remaining,
       fn_schedule_state(s.interval_basis, s.next_due_date, s.next_due_hours,
                         s.alert_lead_days, s.alert_lead_hours, a.runtime_hours) AS due_state
  FROM maintenance_schedules s
  JOIN assets a            ON a.asset_id = s.asset_id
  JOIN asset_models m      ON m.model_id = a.model_id
  JOIN locations l         ON l.location_id = a.current_location_id
  JOIN departments d       ON d.department_id = l.department_id
  JOIN maintenance_types t ON t.type_id = s.type_id;

CREATE VIEW vw_alerts AS
SELECT al.alert_id, al.schedule_id, s.asset_id, a.asset_tag, m.model_name,
       d.name AS department, t.name AS type_name,
       al.alert_type, al.severity, al.message, al.status,
       al.generated_at, al.acknowledged_by, al.acknowledged_at, al.resolved_at, al.work_order_id
  FROM maintenance_alerts al
  JOIN maintenance_schedules s ON s.schedule_id = al.schedule_id
  JOIN assets a                ON a.asset_id = s.asset_id
  JOIN asset_models m          ON m.model_id = a.model_id
  JOIN locations l             ON l.location_id = a.current_location_id
  JOIN departments d           ON d.department_id = l.department_id
  JOIN maintenance_types t     ON t.type_id = s.type_id;
