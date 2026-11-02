-- =====================================================================
-- MedAsset: 06_events.sql
-- Scheduled (automated) preventive-maintenance check.
-- NOTE: MySQL/MariaDB only runs events while the event scheduler is ON.
--       XAMPP has it OFF by default; this script turns it on for the
--       current server run. To keep it on after restarts add
--           event_scheduler=ON
--       under [mysqld] in C:\xampp\mysql\bin\my.ini
-- =====================================================================
USE medasset_db;

SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS evt_daily_preventive_check;

CREATE EVENT evt_daily_preventive_check
  ON SCHEDULE EVERY 1 DAY
  STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 6 HOUR)
  ON COMPLETION PRESERVE
  ENABLE
  COMMENT 'Every day 06:00: raise/escalate calendar and runtime maintenance alerts'
DO CALL sp_daily_preventive_job();
