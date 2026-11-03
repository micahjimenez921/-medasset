-- =====================================================================
-- MedAsset: 07_seed_data.sql
-- Realistic demo data for a mid-sized hospital. Run AFTER files 01-06.
-- Schedules are created through sp_create_schedule; historical work orders
-- get explicit opened/started/completed dates so reports show a timeline.
-- =====================================================================
USE medasset_db;
SET @app_user = 'seed.script';

-- ---------------------------------------------------------------------
-- Departments & locations
-- ---------------------------------------------------------------------
INSERT INTO departments (code, name) VALUES
 ('ICU','Intensive Care Unit'), ('ER','Emergency Room'), ('RAD','Radiology'),
 ('OR','Operating Room'),       ('NICU','Neonatal ICU'),  ('WARD','General Ward'),
 ('BME','Biomedical Engineering');

INSERT INTO locations (department_id, room_name) VALUES
 (1,'ICU Bay 1'),(1,'ICU Bay 2'),(2,'ER Trauma Room'),(2,'ER Triage'),
 (3,'Ultrasound Room'),(3,'X-Ray Room 1'),(4,'OR 1'),(4,'OR 2'),
 (5,'NICU Bay A'),(6,'Ward 3A'),(7,'Equipment Store');

-- ---------------------------------------------------------------------
-- Vendors, categories, models
-- ---------------------------------------------------------------------
INSERT INTO vendors (name, vendor_type, contact_person, phone, email) VALUES
 ('Philips Healthcare','Manufacturer','Ana Reyes','+63 2 8555 0101','service@philips.example'),
 ('GE Healthcare','Manufacturer','Mark Tan','+63 2 8555 0102','service@gehc.example'),
 ('Drager Medical','Manufacturer','Liza Cruz','+63 2 8555 0103','service@drager.example'),
 ('Mindray','Manufacturer','Paul Lim','+63 2 8555 0104','service@mindray.example'),
 ('Medtronic','Manufacturer','Grace Sy','+63 2 8555 0105','service@medtronic.example'),
 ('MediSupply Corp.','Supplier','Jun Dela Cruz','+63 2 8555 0201','sales@medisupply.example'),
 ('BioServe Calibration Lab','Service Provider','Rica Gomez','+63 2 8555 0301','lab@bioserve.example');

INSERT INTO asset_categories (name, risk_class) VALUES
 ('Ventilator','III'),('Ultrasound Unit','II'),('Patient Monitor','II'),
 ('Defibrillator','III'),('Infusion Pump','II'),('X-Ray Unit','III');

INSERT INTO asset_models (category_id, manufacturer_id, model_name) VALUES
 (1,3,'Evita V500'),(1,4,'SV300'),(2,2,'Logiq E10'),(2,1,'Affiniti 50'),
 (3,1,'IntelliVue MX450'),(3,4,'BeneVision N12'),(4,5,'LifePak 15'),
 (5,4,'BeneFusion nSP'),(6,2,'Definium 656');

INSERT INTO maintenance_types (name, is_preventive, is_calibration) VALUES
 ('Preventive Maintenance',1,0),('Calibration',1,1),('Electrical Safety Test',1,0),
 ('Corrective Repair',0,0);

-- ---------------------------------------------------------------------
-- Technicians & parts
-- ---------------------------------------------------------------------
INSERT INTO technicians (employee_no, first_name, last_name, specialization, hourly_rate, email) VALUES
 ('BME-001','Carlo','Mendoza','Respiratory equipment',450.00,'carlo.mendoza@hospital.example'),
 ('BME-002','Janine','Ramos','Imaging systems',480.00,'janine.ramos@hospital.example'),
 ('BME-003','Ruel','Santos','Patient monitoring',420.00,'ruel.santos@hospital.example'),
 ('BME-004','Mika','Villanueva','Electrical safety',400.00,'mika.villanueva@hospital.example');

INSERT INTO parts (part_number, name, unit_cost, quantity_on_hand, reorder_level) VALUES
 ('VNT-FLW-01','Ventilator flow sensor',3500.00,6,3),
 ('VNT-VLV-02','Exhalation valve',2200.00,4,3),
 ('MON-SPO-03','SpO2 sensor cable',850.00,15,5),
 ('MON-BAT-04','Monitor battery pack',4200.00,2,3),
 ('US-PRB-05','Ultrasound probe cable',9800.00,3,2),
 ('DEF-PAD-06','Defibrillator pad set',1800.00,10,4),
 ('INF-PMP-07','Infusion pump motor',6400.00,3,2),
 ('GEN-FUS-08','Power supply fuse kit',250.00,40,10);

-- ---------------------------------------------------------------------
-- Assets (status history, audit and initial values are filled by triggers)
-- ---------------------------------------------------------------------
INSERT INTO assets (asset_tag, serial_number, model_id, supplier_id, current_location_id,
                    purchase_date, purchase_cost, warranty_expiry, runtime_hours) VALUES
 ('MA-0001','DRG-V500-1001',1,6,1,'2022-03-15',1850000.00,'2025-03-15',9420.5),
 ('MA-0002','DRG-V500-1002',1,6,2,'2022-03-15',1850000.00,'2025-03-15',8310.0),
 ('MA-0003','MIN-SV300-2001',2,6,3,'2023-06-01',980000.00,'2026-06-01',4520.0),
 ('MA-0004','GE-LE10-3001',3,6,5,'2021-09-20',2400000.00,'2024-09-20',0),
 ('MA-0005','PH-AF50-3002',4,6,5,'2024-02-10',3100000.00,'2027-02-10',0),
 ('MA-0006','PH-MX450-4001',5,6,1,'2023-01-12',650000.00,'2026-01-12',15200.0),
 ('MA-0007','MIN-N12-4002',6,6,3,'2024-05-05',420000.00,'2027-05-05',6100.0),
 ('MA-0008','MDT-LP15-5001',7,6,4,'2022-11-30',780000.00,'2025-11-30',1200.0),
 ('MA-0009','MIN-NSP-6001',8,6,9,'2024-08-18',210000.00,'2027-08-18',3300.0),
 ('MA-0010','GE-DEF656-7001',9,6,6,'2020-07-07',5200000.00,'2023-07-07',0),
 ('MA-0011','DRG-V500-1003',1,6,7,'2019-04-02',1700000.00,'2022-04-02',31000.0);

-- ---------------------------------------------------------------------
-- Preventive schedules (via stored procedure -> alerts are evaluated)
-- args: asset, type, basis, interval_days, interval_hours, lead_days, lead_hours, last_performed
-- ---------------------------------------------------------------------
-- calendar-based
CALL sp_create_schedule(1,1,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 170 DAY));
CALL sp_create_schedule(1,2,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 200 DAY));
CALL sp_create_schedule(2,1,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 60 DAY));
CALL sp_create_schedule(3,2,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 380 DAY));  -- overdue
CALL sp_create_schedule(4,3,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 340 DAY));
CALL sp_create_schedule(5,1,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 40 DAY));
CALL sp_create_schedule(7,3,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 100 DAY));
CALL sp_create_schedule(8,2,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 170 DAY));  -- due soon
CALL sp_create_schedule(10,3,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 300 DAY));
-- runtime-based (next due = current runtime + interval)
CALL sp_create_schedule(6,1,'RUNTIME',NULL,500,14,50,NULL);

-- ---------------------------------------------------------------------
-- Historical (completed) work orders, back-dated so reports show a timeline.
-- Flow per work order: insert -> assign -> start -> log labor -> use parts -> complete.
-- Procedures are used wherever possible; start/complete are direct UPDATEs
-- only because they need explicit past timestamps.
-- ---------------------------------------------------------------------

-- WO A: corrective repair, ventilator MA-0002 (flow sensor replaced)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at)
VALUES (2, 4, 'High', 'Flow sensor error alarm during ICU shift', 'nurse.icu', '2026-03-04 09:00:00');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 1, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-03-04 10:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 1, 4.00);
CALL sp_add_part_to_work_order(@wo, 1, 1);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-03-05 15:30:00',
       resolution_notes = 'Replaced flow sensor, passed leak and flow test.' WHERE work_order_id = @wo;

-- WO B: corrective repair, monitor MA-0007 (battery replaced)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at)
VALUES (7, 4, 'Medium', 'Monitor shuts down when unplugged', 'nurse.er', '2026-06-10 13:00:00');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 3, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-06-10 14:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 3, 3.00);
CALL sp_add_part_to_work_order(@wo, 4, 1);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-06-10 17:00:00',
       resolution_notes = 'Battery pack replaced, runtime test 90 min.' WHERE work_order_id = @wo;

-- WO C: preventive maintenance, infusion pump MA-0009
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at, scheduled_date)
VALUES (9, 1, 'Low', 'Routine preventive maintenance', 'bme.supervisor', '2026-04-14 08:00:00', '2026-04-15');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 4, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-04-15 09:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 4, 2.00);
CALL sp_add_part_to_work_order(@wo, 8, 2);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-04-15 11:00:00',
       resolution_notes = 'Cleaned, fuses replaced, occlusion test passed.' WHERE work_order_id = @wo;

-- WO D: calibration, ultrasound MA-0005 (with calibration log)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at, scheduled_date)
VALUES (5, 2, 'Medium', 'Annual probe and image calibration', 'bme.supervisor', '2026-08-18 08:00:00', '2026-08-20');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 2, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-08-20 09:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 2, 3.00);
INSERT INTO calibration_logs (work_order_id, calibrated_on, result, certificate_no, notes)
VALUES (@wo, '2026-08-20', 'Pass', 'CAL-2026-0142', 'All measurements within tolerance.');
UPDATE work_orders SET status = 'Completed', completed_at = '2026-08-20 12:00:00',
       resolution_notes = 'Calibration passed.' WHERE work_order_id = @wo;

-- WO E: corrective repair, X-ray MA-0010 (labor only)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at)
VALUES (10, 4, 'Critical', 'X-ray tube not firing', 'rad.head', '2026-10-05 07:30:00');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 2, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-10-05 08:30:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 2, 6.00);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-10-06 10:00:00',
       resolution_notes = 'Loose high-voltage connector reseated and tested.' WHERE work_order_id = @wo;

-- ---------------------------------------------------------------------
-- Active work orders (so the Work Orders page has live examples)
-- ---------------------------------------------------------------------
-- Open: electrical safety test on MA-0004
CALL sp_create_work_order(4, 3, 'Medium', 'Annual electrical safety test', CURDATE(), NULL);

-- Assigned: preventive maintenance on MA-0001
CALL sp_create_work_order(1, 1, 'High', 'Six-month preventive maintenance', CURDATE(), NULL);
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 1, 'Lead');

-- In Progress: corrective repair on MA-0003 (trigger moves the asset to Repair)
CALL sp_create_work_order(3, 4, 'Critical', 'Low-pressure alarm will not clear', NULL, NULL);
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 1, 'Lead');
CALL sp_start_work_order(@wo);
CALL sp_log_labor_hours(@wo, 1, 2.00);

-- ---------------------------------------------------------------------
-- Transfers and a decommission, to populate history tables
-- ---------------------------------------------------------------------
CALL sp_transfer_asset(8, 3, 'Moved to trauma room for faster access');
CALL sp_transfer_asset(7, 2, 'ICU overflow');
CALL sp_decommission_asset(11, 'End of life; replaced by newer ventilator');

-- Generate alerts for everything that is due or overdue
CALL sp_run_preventive_check();
