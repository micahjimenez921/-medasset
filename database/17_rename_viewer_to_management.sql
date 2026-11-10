-- Upgrade for an EXISTING database: the Viewer role becomes Management.
-- The role keeps its id, its permissions and its users; only the name and description change.
-- Run: cmd /c "C:\xampp\mysql\bin\mysql.exe -u root medasset_db < 17_rename_viewer_to_management.sql"
SET @app_user = 'SYSTEM (upgrade)';

UPDATE roles SET name = 'Management',
       description = 'Hospital management and oversight: department heads, finance, quality officers and auditors. Read-only access to equipment, work orders, costs, reports and the audit trail.'
 WHERE name = 'Viewer';

SELECT role_id, name FROM roles ORDER BY role_id;
