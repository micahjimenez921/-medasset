-- =====================================================================
-- MedAsset: 05_procedures_read.sql
-- Read procedures used by the Django API (lists, details, dashboard,
-- reports).  Some return several result sets in one CALL.
-- =====================================================================
USE medasset_db;

DELIMITER $$

-- ---------------------------------------------------------------------
-- Lookups for dropdowns
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_lookup(IN p_name VARCHAR(30))
BEGIN
  CALL sp_require_permission('lookup.view');
  IF p_name = 'departments' THEN
    SELECT department_id, code, name FROM departments ORDER BY name;
  ELSEIF p_name = 'locations' THEN
    SELECT l.location_id, l.department_id, d.name AS department, l.room_name,
           CONCAT(d.name, ' / ', l.room_name) AS label
      FROM locations l JOIN departments d ON d.department_id = l.department_id
     ORDER BY d.name, l.room_name;
  ELSEIF p_name = 'models' THEN
    SELECT m.model_id, m.model_name, c.name AS category, v.name AS manufacturer,
           CONCAT(v.name, ' ', m.model_name, ' (', c.name, ')') AS label
      FROM asset_models m
      JOIN asset_categories c ON c.category_id = m.category_id
      JOIN vendors v          ON v.vendor_id = m.manufacturer_id
     ORDER BY v.name, m.model_name;
  ELSEIF p_name = 'suppliers' THEN
    SELECT vendor_id, name FROM vendors WHERE vendor_type = 'Supplier' ORDER BY name;
  ELSEIF p_name = 'technicians' THEN
    SELECT t.technician_id, t.employee_no, CONCAT(t.first_name, ' ', t.last_name) AS full_name,
           t.specialization, t.team, t.hourly_rate, t.is_active, t.company,
           IF(t.team IN ('In-house maintenance','Provincial engineering'), 'Staff', 'External') AS kind,
           t.user_id, u.username
      FROM technicians t LEFT JOIN users u ON u.user_id = t.user_id
     ORDER BY kind, FIELD(t.team,'In-house maintenance','Provincial engineering','Outsourced contractor','Manufacturer service'),
              t.last_name, t.first_name;
  ELSEIF p_name = 'parts' THEN
    SELECT part_id, part_number, name, unit_cost, quantity_on_hand, reorder_level,
           (quantity_on_hand <= reorder_level) AS is_low_stock
      FROM parts ORDER BY name;
  ELSEIF p_name = 'maintenance_types' THEN
    SELECT type_id, name, is_preventive, is_calibration FROM maintenance_types ORDER BY type_id;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown lookup name.';
  END IF;
END$$

-- ---------------------------------------------------------------------
-- Dashboard: 3 result sets (summary, assets per department, attention list)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_dashboard_summary()
BEGIN
  CALL sp_require_permission('dashboard.view');
  SELECT
    (SELECT COUNT(*) FROM assets)                                         AS total_assets,
    (SELECT COUNT(*) FROM assets WHERE status = 'In-Use')                 AS in_use,
    (SELECT COUNT(*) FROM assets WHERE status = 'Repair')                 AS in_repair,
    (SELECT COUNT(*) FROM assets WHERE status = 'Decommissioned')         AS decommissioned,
    (SELECT COUNT(*) FROM maintenance_alerts
      WHERE status IN ('Open','Acknowledged'))                            AS open_alerts,
    (SELECT COUNT(*) FROM maintenance_alerts
      WHERE status IN ('Open','Acknowledged') AND alert_type = 'OVERDUE') AS overdue_alerts,
    (SELECT COUNT(*) FROM work_orders
      WHERE status IN ('Open','Assigned','In Progress'))                  AS active_work_orders,
    (SELECT COUNT(*) FROM vw_schedule_status WHERE is_active = 1)         AS active_schedules,
    (SELECT COUNT(*) FROM vw_schedule_status
      WHERE is_active = 1 AND due_state = 'Overdue')                      AS overdue_schedules,
    (SELECT COUNT(*) FROM assets
      WHERE status <> 'Decommissioned'
        AND warranty_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)) AS warranties_expiring,
    (SELECT COUNT(*) FROM parts WHERE quantity_on_hand <= reorder_level)  AS low_stock_parts,
    (SELECT IFNULL(SUM(total_cost), 0) FROM vw_work_order_summary
      WHERE status = 'Completed' AND YEAR(completed_at) = YEAR(CURDATE())) AS maintenance_cost_ytd;

  SELECT d.name AS department, COUNT(a.asset_id) AS assets,
         SUM(a.status = 'Repair') AS in_repair
    FROM departments d
    JOIN locations l ON l.department_id = d.department_id
    LEFT JOIN assets a ON a.current_location_id = l.location_id AND a.status <> 'Decommissioned'
   GROUP BY d.department_id, d.name
   ORDER BY assets DESC, d.name;

  SELECT schedule_id, asset_id, asset_tag, model_name, department, type_name,
         interval_basis, due_state, days_remaining, hours_remaining
    FROM vw_schedule_status
   WHERE is_active = 1 AND due_state IN ('Overdue','Due Soon')
   ORDER BY (due_state = 'Overdue') DESC, days_remaining, hours_remaining
   LIMIT 8;
END$$

-- ---------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_assets(
  IN p_status VARCHAR(20), IN p_department_id INT, IN p_search VARCHAR(100))
BEGIN
  CALL sp_require_permission('asset.view');
  SELECT * FROM vw_asset_overview
   WHERE (p_status IS NULL OR p_status = '' OR status = p_status)
     AND (p_department_id IS NULL OR department_id = p_department_id)
     AND (p_search IS NULL OR p_search = ''
          OR asset_tag      LIKE CONCAT('%', p_search, '%')
          OR serial_number  LIKE CONCAT('%', p_search, '%')
          OR model_name     LIKE CONCAT('%', p_search, '%')
          OR category       LIKE CONCAT('%', p_search, '%'))
   ORDER BY asset_tag;
END$$

-- 5 result sets: asset, schedules, transfers, status history, work orders
CREATE PROCEDURE sp_get_asset(IN p_asset_id INT)
BEGIN
  CALL sp_require_permission('asset.view');
  SELECT * FROM vw_asset_overview WHERE asset_id = p_asset_id;

  SELECT * FROM vw_schedule_status WHERE asset_id = p_asset_id ORDER BY type_name;

  SELECT t.transfer_id, t.transferred_at, t.transferred_by, t.reason,
         CONCAT(d1.name, ' / ', l1.room_name) AS from_location,
         CONCAT(d2.name, ' / ', l2.room_name) AS to_location
    FROM asset_transfers t
    JOIN locations l1   ON l1.location_id = t.from_location_id
    JOIN departments d1 ON d1.department_id = l1.department_id
    JOIN locations l2   ON l2.location_id = t.to_location_id
    JOIN departments d2 ON d2.department_id = l2.department_id
   WHERE t.asset_id = p_asset_id
   ORDER BY t.transferred_at DESC, t.transfer_id DESC;

  SELECT history_id, old_status, new_status, changed_at, changed_by, remarks
    FROM asset_status_history
   WHERE asset_id = p_asset_id
   ORDER BY changed_at DESC, history_id DESC;

  SELECT * FROM vw_work_order_summary WHERE asset_id = p_asset_id ORDER BY opened_at DESC;
END$$

-- ---------------------------------------------------------------------
-- Work orders
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_work_orders(IN p_status VARCHAR(20), IN p_asset_id INT)
BEGIN
  CALL sp_require_permission('workorder.view');
  SELECT * FROM vw_work_order_summary
   WHERE (p_status IS NULL OR p_status = ''
          OR (p_status = 'Active' AND status IN ('Open','Assigned','In Progress'))
          OR status = p_status)
     AND (p_asset_id IS NULL OR asset_id = p_asset_id)
   ORDER BY FIELD(status, 'In Progress','Assigned','Open','Completed','Cancelled'),
            FIELD(priority, 'Critical','High','Medium','Low'),
            opened_at DESC;
END$$

-- 4 result sets: header, labor, parts, calibration
CREATE PROCEDURE sp_get_work_order(IN p_work_order_id INT)
BEGIN
  CALL sp_require_permission('workorder.view');
  SELECT * FROM vw_work_order_summary WHERE work_order_id = p_work_order_id;

  SELECT x.assignment_id, x.technician_id, CONCAT(te.first_name, ' ', te.last_name) AS technician,
         te.specialization, te.team, te.company,
         IF(te.team IN ('In-house maintenance','Provincial engineering'), 'Staff', 'External') AS kind,
         x.role, x.hours_worked, x.hourly_rate, x.labor_cost, x.assigned_at
    FROM work_order_assignments x
    JOIN technicians te ON te.technician_id = x.technician_id
   WHERE x.work_order_id = p_work_order_id
   ORDER BY x.assignment_id;

  SELECT wp.wo_part_id, wp.part_id, p.part_number, p.name AS part_name,
         wp.quantity, wp.unit_cost, wp.line_cost, wp.used_at
    FROM work_order_parts wp
    JOIN parts p ON p.part_id = wp.part_id
   WHERE wp.work_order_id = p_work_order_id
   ORDER BY wp.wo_part_id;

  SELECT calibration_id, calibrated_on, result, certificate_no, notes
    FROM calibration_logs WHERE work_order_id = p_work_order_id;
END$$

-- ---------------------------------------------------------------------
-- Alerts + schedules
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_alerts(IN p_status VARCHAR(20))
BEGIN
  CALL sp_require_permission('alert.view');
  SELECT * FROM vw_alerts
   WHERE (p_status IS NULL OR p_status = ''
          OR (p_status = 'Active' AND status IN ('Open','Acknowledged'))
          OR status = p_status)
   ORDER BY FIELD(severity, 'Critical','Warning'), generated_at DESC
   LIMIT 200;
END$$

CREATE PROCEDURE sp_list_schedules(IN p_asset_id INT, IN p_state VARCHAR(10))
BEGIN
  CALL sp_require_permission('schedule.view');
  SELECT * FROM vw_schedule_status
   WHERE (p_asset_id IS NULL OR asset_id = p_asset_id)
     AND (p_state IS NULL OR p_state = '' OR due_state = p_state)
   ORDER BY FIELD(due_state, 'Overdue','Due Soon','OK'), asset_tag, type_name;
END$$

-- ---------------------------------------------------------------------
-- Audit + job logs
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_list_audit_logs(IN p_table VARCHAR(40), IN p_limit INT)
BEGIN
  DECLARE v_limit INT;
  CALL sp_require_permission('audit.view');
  SET v_limit = IF(p_limit IS NULL OR p_limit < 1 OR p_limit > 500, 100, p_limit);
  SELECT audit_id, table_name, record_id, action, old_values, new_values, changed_by, changed_at
    FROM audit_logs
   WHERE (p_table IS NULL OR p_table = '' OR table_name = p_table)
   ORDER BY audit_id DESC
   LIMIT v_limit;
END$$

CREATE PROCEDURE sp_list_job_logs(IN p_limit INT)
BEGIN
  DECLARE v_limit INT;
  CALL sp_require_permission('audit.view');
  SET v_limit = IF(p_limit IS NULL OR p_limit < 1 OR p_limit > 200, 20, p_limit);
  SELECT job_log_id, job_name, triggered_by, alerts_created, run_by, ran_at
    FROM job_logs ORDER BY job_log_id DESC LIMIT v_limit;
END$$

-- ---------------------------------------------------------------------
-- Cost report: 5 result sets
-- (by department, by category, preventive vs corrective, top assets, by month)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_report_costs(IN p_year INT)
BEGIN
  DECLARE v_year INT;
  CALL sp_require_permission('report.view');
  SET v_year = IFNULL(p_year, YEAR(CURDATE()));

  SELECT department, COUNT(*) AS work_orders,
         SUM(labor_cost) AS labor_cost, SUM(parts_cost) AS parts_cost, SUM(total_cost) AS total_cost
    FROM vw_work_order_summary
   WHERE status = 'Completed' AND YEAR(completed_at) = v_year
   GROUP BY department
   ORDER BY total_cost DESC;

  SELECT c.name AS category, COUNT(*) AS work_orders,
         SUM(w.labor_cost) AS labor_cost, SUM(w.parts_cost) AS parts_cost, SUM(w.total_cost) AS total_cost
    FROM vw_work_order_summary w
    JOIN assets a            ON a.asset_id = w.asset_id
    JOIN asset_models m      ON m.model_id = a.model_id
    JOIN asset_categories c  ON c.category_id = m.category_id
   WHERE w.status = 'Completed' AND YEAR(w.completed_at) = v_year
   GROUP BY c.name
   ORDER BY total_cost DESC;

  SELECT IF(is_preventive = 1, 'Preventive', 'Corrective') AS kind,
         COUNT(*) AS work_orders, SUM(total_cost) AS total_cost
    FROM vw_work_order_summary
   WHERE status = 'Completed' AND YEAR(completed_at) = v_year
   GROUP BY is_preventive;

  SELECT asset_tag, model_name, department, COUNT(*) AS work_orders, SUM(total_cost) AS total_cost
    FROM vw_work_order_summary
   WHERE status = 'Completed' AND YEAR(completed_at) = v_year
   GROUP BY asset_id, asset_tag, model_name, department
   ORDER BY total_cost DESC
   LIMIT 5;

  SELECT MONTH(completed_at) AS month_no, COUNT(*) AS work_orders, SUM(total_cost) AS total_cost
    FROM vw_work_order_summary
   WHERE status = 'Completed' AND YEAR(completed_at) = v_year
   GROUP BY MONTH(completed_at)
   ORDER BY month_no;
END$$

-- Technicians page: 2 result sets (all technicians, accounts that can still be linked)
CREATE PROCEDURE sp_list_technicians()
BEGIN
  CALL sp_require_permission('technician.manage');

  SELECT t.technician_id, t.employee_no, t.first_name, t.last_name,
         CONCAT(t.first_name, ' ', t.last_name) AS full_name,
         t.specialization, t.team, t.company, t.contact_number, t.email, t.hourly_rate, t.is_active,
         IF(t.team IN ('In-house maintenance','Provincial engineering'), 'Staff', 'External') AS kind,
         t.user_id, u.username,
         (SELECT COUNT(*) FROM work_order_assignments x
            JOIN work_orders w ON w.work_order_id = x.work_order_id
           WHERE x.technician_id = t.technician_id
             AND w.status IN ('Open','Assigned','In Progress')) AS active_jobs
    FROM technicians t LEFT JOIN users u ON u.user_id = t.user_id
   ORDER BY kind, FIELD(t.team,'In-house maintenance','Provincial engineering','Outsourced contractor','Manufacturer service'),
            t.last_name, t.first_name;

  -- Technician-role accounts that do not have a technician profile yet
  SELECT u.user_id, u.username, u.full_name
    FROM users u JOIN roles r ON r.role_id = u.role_id
   WHERE r.name = 'Technician' AND u.is_active = 1
     AND NOT EXISTS (SELECT 1 FROM technicians t WHERE t.user_id = u.user_id)
   ORDER BY u.full_name;
END$$

DELIMITER ;
