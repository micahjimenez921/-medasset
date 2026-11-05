-- =====================================================================
-- MedAsset: 10_app_account.sql
-- The web application must NOT connect as root. It uses a dedicated
-- account that can do exactly one thing: run stored procedures.
--   * no SELECT / INSERT / UPDATE / DELETE on any table
--   * no DDL, no TRUNCATE, no DROP
-- So even a bug or SQL injection in the web layer cannot read or alter
-- tables directly, or touch the audit log. Everything goes through the
-- procedures, which check the signed-in user's permission themselves.
--
-- install_database.ps1 replaces the placeholder below with a random
-- password and stores it in backend\.env (never committed to Git).
-- =====================================================================
CREATE USER IF NOT EXISTS 'medasset_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
ALTER USER 'medasset_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'medasset_app'@'localhost';
GRANT EXECUTE ON medasset_db.* TO 'medasset_app'@'localhost';
FLUSH PRIVILEGES;
