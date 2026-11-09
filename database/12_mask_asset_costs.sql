-- Upgrade for an EXISTING database: hide asset purchase cost and lifetime
-- maintenance cost from users without the report.view permission (Technicians).
-- Run: cmd /c "C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 12_mask_asset_costs.sql"
DROP VIEW IF EXISTS vw_asset_overview;
CREATE VIEW vw_asset_overview AS
SELECT a.asset_id, a.asset_tag, a.serial_number, a.status,
       m.model_id, m.model_name, c.name AS category, c.risk_class,
       mf.name AS manufacturer, sp.name AS supplier,
       l.location_id, l.room_name, d.department_id, d.name AS department,
       a.acquisition_type, a.donor,
       a.purchase_date,
       IF(fn_has_permission('report.view'), a.purchase_cost, NULL) AS purchase_cost,
       a.warranty_expiry,
       CASE WHEN a.warranty_expiry IS NULL THEN 'None'
            WHEN a.warranty_expiry < CURDATE() THEN 'Expired'
            WHEN a.warranty_expiry <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'Expiring'
            ELSE 'Active' END AS warranty_status,
       a.runtime_hours,
       TIMESTAMPDIFF(YEAR, a.purchase_date, CURDATE()) AS age_years,
       a.decommissioned_at, a.decommission_reason,
       IF(fn_has_permission('report.view'), fn_asset_total_cost(a.asset_id), NULL) AS lifetime_maintenance_cost,
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
