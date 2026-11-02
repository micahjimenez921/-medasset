-- =====================================================================
-- MedAsset: Medical Asset Tracking & Preventive Service System
-- 01_schema.sql  -  database, tables, constraints, indexes
-- Target: XAMPP MariaDB 10.4+ / MySQL 5.7+ (InnoDB, utf8mb4)
-- Normalization: 3NF (models/categories/vendors/locations are lookup tables,
-- cost snapshots are stored only where history must not change).
-- =====================================================================

DROP DATABASE IF EXISTS medasset_db;
CREATE DATABASE medasset_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;
USE medasset_db;

-- ---------------------------------------------------------------------
-- Reference / lookup tables
-- ---------------------------------------------------------------------
CREATE TABLE departments (
  department_id   INT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(10)  NOT NULL,
  name            VARCHAR(80)  NOT NULL,
  CONSTRAINT uq_departments_code UNIQUE (code),
  CONSTRAINT uq_departments_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE locations (
  location_id     INT AUTO_INCREMENT PRIMARY KEY,
  department_id   INT          NOT NULL,
  room_name       VARCHAR(80)  NOT NULL,
  CONSTRAINT uq_locations_dept_room UNIQUE (department_id, room_name),
  CONSTRAINT fk_locations_department FOREIGN KEY (department_id)
    REFERENCES departments (department_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE asset_categories (
  category_id     INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(80)  NOT NULL,
  risk_class      ENUM('I','II','III') NOT NULL DEFAULT 'II',
  CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE vendors (
  vendor_id       INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  vendor_type     ENUM('Manufacturer','Supplier','Service Provider') NOT NULL,
  contact_person  VARCHAR(100) NULL,
  phone           VARCHAR(30)  NULL,
  email           VARCHAR(120) NULL,
  CONSTRAINT uq_vendors_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE asset_models (
  model_id        INT AUTO_INCREMENT PRIMARY KEY,
  category_id     INT          NOT NULL,
  manufacturer_id INT          NOT NULL,
  model_name      VARCHAR(100) NOT NULL,
  CONSTRAINT uq_models UNIQUE (manufacturer_id, model_name),
  CONSTRAINT fk_models_category FOREIGN KEY (category_id)
    REFERENCES asset_categories (category_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_models_manufacturer FOREIGN KEY (manufacturer_id)
    REFERENCES vendors (vendor_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE maintenance_types (
  type_id         INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(60)  NOT NULL,
  is_preventive   TINYINT(1)   NOT NULL DEFAULT 1,
  is_calibration  TINYINT(1)   NOT NULL DEFAULT 0,
  CONSTRAINT uq_mtypes_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE technicians (
  technician_id   INT AUTO_INCREMENT PRIMARY KEY,
  employee_no     VARCHAR(20)  NOT NULL,
  first_name      VARCHAR(60)  NOT NULL,
  last_name       VARCHAR(60)  NOT NULL,
  specialization  VARCHAR(80)  NULL,
  hourly_rate     DECIMAL(10,2) NOT NULL,
  email           VARCHAR(120) NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_technicians_empno UNIQUE (employee_no),
  CONSTRAINT ck_technicians_rate CHECK (hourly_rate >= 0)
) ENGINE=InnoDB;

CREATE TABLE parts (
  part_id          INT AUTO_INCREMENT PRIMARY KEY,
  part_number      VARCHAR(40)  NOT NULL,
  name             VARCHAR(100) NOT NULL,
  unit_cost        DECIMAL(10,2) NOT NULL,
  quantity_on_hand INT          NOT NULL DEFAULT 0,
  reorder_level    INT          NOT NULL DEFAULT 5,
  CONSTRAINT uq_parts_number UNIQUE (part_number),
  CONSTRAINT ck_parts_cost CHECK (unit_cost >= 0),
  CONSTRAINT ck_parts_qty  CHECK (quantity_on_hand >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Asset lifecycle
-- ---------------------------------------------------------------------
CREATE TABLE assets (
  asset_id            INT AUTO_INCREMENT PRIMARY KEY,
  asset_tag           VARCHAR(20)  NOT NULL,
  serial_number       VARCHAR(60)  NOT NULL,
  model_id            INT          NOT NULL,
  supplier_id         INT          NULL,
  current_location_id INT          NOT NULL,
  status              ENUM('In-Use','Repair','Decommissioned') NOT NULL DEFAULT 'In-Use',
  purchase_date       DATE         NOT NULL,
  purchase_cost       DECIMAL(12,2) NOT NULL,
  warranty_expiry     DATE         NULL,
  runtime_hours       DECIMAL(10,1) NOT NULL DEFAULT 0,
  decommissioned_at   DATETIME     NULL,
  decommission_reason VARCHAR(255) NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_assets_tag    UNIQUE (asset_tag),
  CONSTRAINT uq_assets_serial UNIQUE (serial_number),
  CONSTRAINT ck_assets_cost    CHECK (purchase_cost >= 0),
  CONSTRAINT ck_assets_runtime CHECK (runtime_hours >= 0),
  CONSTRAINT ck_assets_warranty CHECK (warranty_expiry IS NULL OR warranty_expiry >= purchase_date),
  CONSTRAINT fk_assets_model FOREIGN KEY (model_id)
    REFERENCES asset_models (model_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_assets_supplier FOREIGN KEY (supplier_id)
    REFERENCES vendors (vendor_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_assets_location FOREIGN KEY (current_location_id)
    REFERENCES locations (location_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE asset_transfers (
  transfer_id      INT AUTO_INCREMENT PRIMARY KEY,
  asset_id         INT          NOT NULL,
  from_location_id INT          NOT NULL,
  to_location_id   INT          NOT NULL,
  transferred_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  transferred_by   VARCHAR(100) NOT NULL,
  reason           VARCHAR(255) NULL,
  CONSTRAINT fk_transfers_asset FOREIGN KEY (asset_id)
    REFERENCES assets (asset_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transfers_from FOREIGN KEY (from_location_id)
    REFERENCES locations (location_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transfers_to FOREIGN KEY (to_location_id)
    REFERENCES locations (location_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE asset_status_history (
  history_id   INT AUTO_INCREMENT PRIMARY KEY,
  asset_id     INT          NOT NULL,
  old_status   ENUM('In-Use','Repair','Decommissioned') NULL,
  new_status   ENUM('In-Use','Repair','Decommissioned') NOT NULL,
  changed_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by   VARCHAR(100) NOT NULL,
  remarks      VARCHAR(255) NULL,
  CONSTRAINT fk_status_hist_asset FOREIGN KEY (asset_id)
    REFERENCES assets (asset_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Preventive maintenance logic
-- ---------------------------------------------------------------------
CREATE TABLE maintenance_schedules (
  schedule_id          INT AUTO_INCREMENT PRIMARY KEY,
  asset_id             INT          NOT NULL,
  type_id              INT          NOT NULL,
  interval_basis       ENUM('CALENDAR','RUNTIME') NOT NULL,
  interval_days        INT          NULL,
  interval_hours       INT          NULL,
  alert_lead_days      INT          NOT NULL DEFAULT 14,
  alert_lead_hours     INT          NOT NULL DEFAULT 50,
  last_performed_date  DATE         NULL,
  last_performed_hours DECIMAL(10,1) NULL,
  next_due_date        DATE         NULL,
  next_due_hours       DECIMAL(10,1) NULL,
  is_active            TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_schedule_asset_type UNIQUE (asset_id, type_id),
  CONSTRAINT ck_schedule_basis CHECK (
       (interval_basis = 'CALENDAR' AND interval_days  IS NOT NULL AND interval_days  > 0)
    OR (interval_basis = 'RUNTIME'  AND interval_hours IS NOT NULL AND interval_hours > 0)),
  CONSTRAINT fk_schedule_asset FOREIGN KEY (asset_id)
    REFERENCES assets (asset_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_schedule_type FOREIGN KEY (type_id)
    REFERENCES maintenance_types (type_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Work orders
-- ---------------------------------------------------------------------
CREATE TABLE work_orders (
  work_order_id    INT AUTO_INCREMENT PRIMARY KEY,
  asset_id         INT          NOT NULL,
  type_id          INT          NOT NULL,
  priority         ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  status           ENUM('Open','Assigned','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Open',
  description      VARCHAR(500) NOT NULL,
  resolution_notes VARCHAR(500) NULL,
  created_by       VARCHAR(100) NOT NULL,
  opened_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_date   DATE         NULL,
  started_at       DATETIME     NULL,
  completed_at     DATETIME     NULL,
  CONSTRAINT fk_wo_asset FOREIGN KEY (asset_id)
    REFERENCES assets (asset_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_wo_type FOREIGN KEY (type_id)
    REFERENCES maintenance_types (type_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE work_order_assignments (
  assignment_id  INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id  INT          NOT NULL,
  technician_id  INT          NOT NULL,
  role           ENUM('Lead','Assistant') NOT NULL DEFAULT 'Lead',
  hours_worked   DECIMAL(6,2) NOT NULL DEFAULT 0,
  hourly_rate    DECIMAL(10,2) NULL,                 -- snapshot, filled by trigger
  labor_cost     DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(hours_worked * IFNULL(hourly_rate,0), 2)) VIRTUAL,
  assigned_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_assignment UNIQUE (work_order_id, technician_id),
  CONSTRAINT ck_assignment_hours CHECK (hours_worked >= 0),
  CONSTRAINT fk_assign_wo FOREIGN KEY (work_order_id)
    REFERENCES work_orders (work_order_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_assign_tech FOREIGN KEY (technician_id)
    REFERENCES technicians (technician_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE work_order_parts (
  wo_part_id     INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id  INT          NOT NULL,
  part_id        INT          NOT NULL,
  quantity       INT          NOT NULL,
  unit_cost      DECIMAL(10,2) NULL,                 -- snapshot, filled by trigger
  line_cost      DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(quantity * IFNULL(unit_cost,0), 2)) VIRTUAL,
  used_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_wo_parts_qty CHECK (quantity > 0),
  CONSTRAINT fk_wop_wo FOREIGN KEY (work_order_id)
    REFERENCES work_orders (work_order_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_wop_part FOREIGN KEY (part_id)
    REFERENCES parts (part_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE calibration_logs (
  calibration_id  INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id   INT          NOT NULL,
  calibrated_on   DATE         NOT NULL,
  result          ENUM('Pass','Fail','Adjusted') NOT NULL,
  certificate_no  VARCHAR(60)  NULL,
  notes           VARCHAR(255) NULL,
  CONSTRAINT uq_calibration_wo UNIQUE (work_order_id),
  CONSTRAINT fk_cal_wo FOREIGN KEY (work_order_id)
    REFERENCES work_orders (work_order_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE maintenance_alerts (
  alert_id       INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id    INT          NOT NULL,
  alert_type     ENUM('UPCOMING','OVERDUE') NOT NULL,
  severity       ENUM('Warning','Critical') NOT NULL,
  message        VARCHAR(255) NOT NULL,
  status         ENUM('Open','Acknowledged','Resolved') NOT NULL DEFAULT 'Open',
  generated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_by VARCHAR(100) NULL,
  acknowledged_at DATETIME    NULL,
  resolved_at    DATETIME     NULL,
  work_order_id  INT          NULL,
  CONSTRAINT fk_alert_schedule FOREIGN KEY (schedule_id)
    REFERENCES maintenance_schedules (schedule_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_alert_wo FOREIGN KEY (work_order_id)
    REFERENCES work_orders (work_order_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Audit + job logs (written by triggers / scheduled event)
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
  audit_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name  VARCHAR(40)  NOT NULL,
  record_id   INT          NOT NULL,
  action      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  old_values  LONGTEXT     NULL,
  new_values  LONGTEXT     NULL,
  changed_by  VARCHAR(100) NOT NULL,
  changed_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE job_logs (
  job_log_id     INT AUTO_INCREMENT PRIMARY KEY,
  job_name       VARCHAR(60)  NOT NULL,
  triggered_by   VARCHAR(40)  NOT NULL,
  alerts_created INT          NOT NULL DEFAULT 0,
  ran_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Secondary indexes (queries: dashboards, filters, audit lookups)
-- ---------------------------------------------------------------------
CREATE INDEX idx_assets_status        ON assets (status);
CREATE INDEX idx_assets_location      ON assets (current_location_id);
CREATE INDEX idx_assets_model         ON assets (model_id);
CREATE INDEX idx_assets_warranty      ON assets (warranty_expiry);
CREATE INDEX idx_transfers_asset      ON asset_transfers (asset_id, transferred_at);
CREATE INDEX idx_status_hist_asset    ON asset_status_history (asset_id, changed_at);
CREATE INDEX idx_schedule_due_date    ON maintenance_schedules (next_due_date);
CREATE INDEX idx_schedule_due_hours   ON maintenance_schedules (next_due_hours);
CREATE INDEX idx_wo_asset_status      ON work_orders (asset_id, status);
CREATE INDEX idx_wo_status_opened     ON work_orders (status, opened_at);
CREATE INDEX idx_alerts_status        ON maintenance_alerts (status, schedule_id);
CREATE INDEX idx_audit_table_record   ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_changed_at     ON audit_logs (changed_at);
