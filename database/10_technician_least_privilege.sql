-- =====================================================================
-- Upgrade for an EXISTING database (no data loss): Technician = field worker.
-- Removes the administrative permissions from the Technician role.
-- Run:  C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 10_technician_least_privilege.sql
-- (A fresh install_database.ps1 already includes this through 08.)
-- =====================================================================
SET @app_user = 'SYSTEM (upgrade)';

DELETE rp FROM role_permissions rp
  JOIN roles r ON r.role_id = rp.role_id
  JOIN permissions p ON p.permission_id = rp.permission_id
 WHERE r.name = 'Technician'
   AND p.code IN ('asset.create','asset.transfer','asset.update_status',
                  'schedule.manage','alert.run_check','workorder.assign');

UPDATE roles SET description =
 'Field worker: views equipment, schedules and alerts, reports faults, and carries out assigned work orders. Cannot register, transfer or retire equipment, manage schedules, assign work, cancel, see costs or manage users.'
 WHERE name = 'Technician';

SELECT p.code FROM roles r JOIN role_permissions rp ON rp.role_id = r.role_id
  JOIN permissions p ON p.permission_id = rp.permission_id
 WHERE r.name = 'Technician' ORDER BY p.code;
