-- Upgrade for an EXISTING database: only the administrator acknowledges alerts.
-- Run: cmd /c "C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 15_technician_no_acknowledge.sql"
SET @app_user = 'SYSTEM (upgrade)';

DELETE rp FROM role_permissions rp
  JOIN roles r ON r.role_id = rp.role_id
  JOIN permissions p ON p.permission_id = rp.permission_id
 WHERE r.name = 'Technician' AND p.code = 'alert.acknowledge';

SELECT p.code FROM roles r JOIN role_permissions rp ON rp.role_id = r.role_id
  JOIN permissions p ON p.permission_id = rp.permission_id
 WHERE r.name = 'Technician' ORDER BY p.code;
