-- Upgrade for an EXISTING database: add the Department Staff role
-- (nurses and department staff who report faults but see nothing else).
-- Run: cmd /c "C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 16_department_staff_role.sql"
SET @app_user = 'SYSTEM (upgrade)';

INSERT INTO roles (name, description)
SELECT 'Department Staff', 'Nurses and department staff: view equipment and report faults. They see only their own reports.'
 WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Department Staff');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r JOIN permissions p
 WHERE r.name = 'Department Staff'
   AND p.code IN ('lookup.view','asset.view','request.view','request.create');

SELECT r.name, COUNT(rp.permission_id) AS permissions
  FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
 GROUP BY r.role_id, r.name ORDER BY r.role_id;
