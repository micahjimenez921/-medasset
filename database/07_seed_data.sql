-- =====================================================================
-- MedAsset: 07_seed_data.sql
-- Starter data for TUBURAN DISTRICT HOSPITAL (Cebu Provincial Government).
-- Departments, suppliers, service providers and maintenance tasks come from
-- the hospital's own asset document. Model names, serial numbers, costs and
-- dates are ILLUSTRATIVE: replace them with the hospital's real asset register.
-- Run AFTER files 01-06, 08, 09 and after `python manage.py create_admin`.
-- Schedules are created through sp_create_schedule; historical work orders
-- get explicit opened/started/completed dates so reports show a timeline.
-- =====================================================================
USE medasset_db;
-- Must be run by a real, named administrator (never a script name):
-- sp_assert_demo_ready sets @app_user_id/@app_user to the first Administrator.
CALL sp_assert_demo_ready();

-- ---------------------------------------------------------------------
-- Departments & locations (hospital document: Departments / Units)
-- ---------------------------------------------------------------------
INSERT INTO departments (code, name) VALUES
 ('ER',  'Emergency Room (ER)'),
 ('OPD', 'Outpatient Department (OPD)'),
 ('WARD','Inpatient Wards (Adult & Isolation)'),
 ('LAB', 'Clinical Laboratory'),
 ('RAD', 'Radiology Department (X-Ray)'),
 ('CSD', 'Central Supply Department'),
 ('TIS', 'Transport & Infrastructure Support');

INSERT INTO locations (department_id, room_name) VALUES
 (1,'Trauma Zone'),                       -- 1
 (1,'Triage'),                            -- 2
 (2,'Consultation Room 1'),               -- 3
 (2,'Vitals & Cardiac Monitoring Room'),  -- 4
 (3,'Adult Ward (25 beds)'),              -- 5
 (3,'Infection Isolation Cubicles'),      -- 6
 (4,'Hematology & Chemistry Section'),    -- 7
 (4,'Microscopy Section'),                -- 8
 (5,'X-Ray Station'),                     -- 9
 (5,'Ultrasound Room'),                   -- 10
 (6,'Medical Inventory Storage'),         -- 11
 (7,'Ambulance Hangar'),                  -- 12
 (7,'Standby Generator House'),           -- 13
 (7,'Morgue');                            -- 14

-- ---------------------------------------------------------------------
-- Vendors: suppliers that win public bidding, service contractors,
-- and the manufacturers of the models below
-- ---------------------------------------------------------------------
INSERT INTO vendors (name, vendor_type, contact_person, phone, email) VALUES
 ('Cebu RTK Marketing Inc.','Supplier',NULL,NULL,NULL),                                         -- 1
 ('Cebu Medical Supply, Inc.','Supplier',NULL,NULL,NULL),                                       -- 2
 ('GigaMed Medical Supply / Golden Rooster Enterprises','Supplier',NULL,NULL,NULL),             -- 3
 ('March Medical Equipment Repair and Maintenance Services','Service Provider',NULL,NULL,NULL), -- 4
 ('Cebu Lab & Medical Equipment Repair','Service Provider',NULL,NULL,NULL),                     -- 5
 ('Mindray','Manufacturer',NULL,NULL,NULL),                                                     -- 6
 ('Olympus','Manufacturer',NULL,NULL,NULL),                                                     -- 7
 ('Hettich','Manufacturer',NULL,NULL,NULL),                                                     -- 8
 ('Thermo Fisher Scientific','Manufacturer',NULL,NULL,NULL),                                    -- 9
 ('Carestream Health','Manufacturer',NULL,NULL,NULL),                                           -- 10
 ('Toyota','Manufacturer',NULL,NULL,NULL),                                                      -- 11
 ('Cummins','Manufacturer',NULL,NULL,NULL);                                                     -- 12

INSERT INTO asset_categories (name, risk_class) VALUES
 ('Hematology Analyzer','II'),        -- 1
 ('Clinical Chemistry Analyzer','II'),-- 2
 ('Clinical Centrifuge','II'),        -- 3
 ('Binocular Microscope','I'),        -- 4
 ('Spectrophotometer','II'),          -- 5
 ('ECG / Cardiac Monitor','II'),      -- 6
 ('Digital X-Ray Unit','III'),        -- 7
 ('Ultrasound Unit','II'),            -- 8
 ('Laboratory Refrigerator','II'),    -- 9
 ('Laboratory Incubator','II'),       -- 10
 ('Clinical Pipettor','I'),           -- 11
 ('Ambulance','II'),                  -- 12
 ('Standby Generator','I');           -- 13

INSERT INTO asset_models (category_id, manufacturer_id, model_name) VALUES
 (1,6,'BC-5000'),(2,6,'BS-240'),(3,8,'EBA 200'),(4,7,'CX23'),(5,9,'GENESYS 30'),
 (6,6,'uMEC10'),(7,10,'DRX-Compass'),(8,6,'DP-10'),(9,9,'TSX505'),
 (10,9,'Heratherm IGS180'),(11,9,'Finnpipette F2'),(12,11,'HiAce Ambulance'),
 (13,12,'C250D5');

-- Maintenance tasks named in the hospital document
INSERT INTO maintenance_types (name, is_preventive, is_calibration) VALUES
 ('Preventive Maintenance',1,0),                       -- 1
 ('Electrical Safety Analysis',1,0),                   -- 2
 ('RPM & Temperature Output Calibration',1,1),        -- 3
 ('Optical Lens & Phase Alignment',1,1),              -- 4
 ('Micro-scale & Sensor Re-alignment',1,1),           -- 5
 ('Corrective Repair',0,0);                           -- 6

-- ---------------------------------------------------------------------
-- Technicians: the hospital's tiered support system (teams, not individuals)
-- ---------------------------------------------------------------------
INSERT INTO technicians (employee_no, first_name, last_name, specialization, team, hourly_rate) VALUES
 ('IFM-001','Building & Equipment','Maintenance Team','Daily checks, basic troubleshooting, generator and power lines','In-house maintenance',250.00),
 ('PHED-001','Capitol Provincial Health','Engineering Division','Systemic repairs, firmware updates, component overhauls','Provincial engineering',600.00),
 ('EXT-001','March Medical Equipment','Repair & Maintenance','Certified compliance checks and repairs','Outsourced contractor',550.00),
 ('EXT-002','Cebu Lab & Medical','Equipment Repair','Laboratory equipment calibration and repair','Outsourced contractor',520.00),
 ('MFR-001','Cebu RTK Marketing','Field Service Engineers','Authorized service for diagnostic equipment (warranty)','Manufacturer service',650.00),
 ('MFR-002','Cebu Medical Supply','Field Service Engineers','Authorized service for clinical equipment (warranty)','Manufacturer service',600.00);

INSERT INTO parts (part_number, name, unit_cost, quantity_on_hand, reorder_level) VALUES
 ('LAB-CTF-01','Centrifuge carbon brush set',1200.00,6,3),
 ('LAB-MIC-02','Microscope LED illuminator',2800.00,4,2),
 ('LAB-HEM-03','Hematology aspiration probe',7500.00,2,2),
 ('ECG-LED-04','ECG lead wire set',1500.00,10,4),
 ('ECG-SPO-05','SpO2 sensor cable',850.00,12,5),
 ('GEN-FLT-06','Generator oil and fuel filter kit',3200.00,5,3),
 ('GEN-BAT-07','Generator starter battery',9800.00,2,2),
 ('LAB-PIP-08','Pipettor seal and O-ring kit',650.00,15,5),
 ('REF-THM-09','Refrigerator thermostat',2400.00,3,2);

-- ---------------------------------------------------------------------
-- Assets (status history, audit and initial values are filled by triggers)
-- Hospital document: public bidding (R.A. 12009) and donations
-- ---------------------------------------------------------------------
INSERT INTO assets (asset_tag, serial_number, model_id, supplier_id, current_location_id,
                    acquisition_type, donor, purchase_date, purchase_cost, warranty_expiry, runtime_hours) VALUES
 ('TDH-0001','BC5000-LAB-1001',1,1,7,'Public bidding',NULL,'2023-02-14',850000.00,'2026-02-14',5200.0),
 ('TDH-0002','BS240-LAB-1002',2,1,7,'Public bidding',NULL,'2023-02-14',1250000.00,'2026-02-14',4800.0),
 ('TDH-0003','EBA200-LAB-1003',3,1,7,'Public bidding',NULL,'2024-03-10',95000.00,'2027-03-10',1450.0),
 ('TDH-0004','EBA200-LAB-1004',3,2,8,'Public bidding',NULL,'2022-08-01',95000.00,'2025-08-01',3900.0),
 ('TDH-0005','CX23-LAB-1005',4,2,8,'Public bidding',NULL,'2022-08-01',62000.00,'2025-08-01',0),
 ('TDH-0006','GEN30-LAB-1006',5,1,7,'Public bidding',NULL,'2023-06-20',480000.00,'2026-06-20',0),
 ('TDH-0007','UMEC10-ER-2001',6,1,1,'Public bidding',NULL,'2024-01-15',420000.00,'2027-01-15',7300.0),
 ('TDH-0008','UMEC10-OPD-2002',6,1,4,'Public bidding',NULL,'2024-01-15',420000.00,'2027-01-15',6100.0),
 ('TDH-0009','DRXC-RAD-3001',7,2,9,'Public bidding',NULL,'2021-11-05',6800000.00,'2024-11-05',11800.0),
 ('TDH-0010','DP10-RAD-3002',8,1,10,'Public bidding',NULL,'2022-05-18',780000.00,'2025-05-18',0),
 ('TDH-0011','IGS180-LAB-1007',10,2,7,'Public bidding',NULL,'2023-09-12',210000.00,'2026-09-12',0),
 ('TDH-0012','TSX505-LAB-1008',9,NULL,7,'Donation','Ako Bisaya Partylist / Children International','2024-06-03',185000.00,'2026-06-03',0),
 ('TDH-0013','F2-LAB-1009',11,2,7,'Public bidding',NULL,'2024-03-10',28000.00,'2025-03-10',0),
 ('TDH-0014','HIACE-TIS-4001',12,3,12,'Public bidding',NULL,'2023-04-20',3200000.00,'2026-04-20',2100.0),
 ('TDH-0015','HIACE-TIS-4002',12,3,12,'Public bidding',NULL,'2024-07-08',3200000.00,'2027-07-08',1250.0),
 ('TDH-0016','C250D5-TIS-4003',13,3,13,'Public bidding',NULL,'2022-02-02',2800000.00,'2025-02-02',3400.0),
 ('TDH-0017','CX23-LAB-1010',4,2,8,'Public bidding',NULL,'2018-03-12',58000.00,'2021-03-12',0);

-- ---------------------------------------------------------------------
-- Preventive schedules (via stored procedure -> alerts are evaluated)
-- args: asset, type, basis, interval_days, interval_hours, lead_days, lead_hours, last_performed
-- types: 1 PM, 2 Electrical safety, 3 RPM/temperature calibration,
--        4 Optical alignment, 5 Sensor re-alignment
-- ---------------------------------------------------------------------
CALL sp_create_schedule(1,1,'CALENDAR',90,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 80 DAY));    -- due soon
CALL sp_create_schedule(1,5,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 200 DAY));  -- overdue
CALL sp_create_schedule(2,1,'CALENDAR',90,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 30 DAY));
CALL sp_create_schedule(3,3,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 100 DAY));
CALL sp_create_schedule(3,2,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 340 DAY));  -- due soon
CALL sp_create_schedule(4,3,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 195 DAY));  -- overdue
CALL sp_create_schedule(5,4,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 120 DAY));
CALL sp_create_schedule(7,2,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 100 DAY));
CALL sp_create_schedule(9,1,'CALENDAR',90,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 45 DAY));
CALL sp_create_schedule(9,2,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 360 DAY)); -- due very soon
CALL sp_create_schedule(11,2,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 300 DAY));
CALL sp_create_schedule(12,2,'CALENDAR',365,NULL,30,NULL,DATE_SUB(CURDATE(), INTERVAL 10 DAY));
CALL sp_create_schedule(13,5,'CALENDAR',180,NULL,14,NULL,DATE_SUB(CURDATE(), INTERVAL 170 DAY)); -- due soon
-- runtime-based (next due = current runtime + interval)
CALL sp_create_schedule(16,1,'RUNTIME',NULL,250,14,25,NULL);   -- generator service every 250 h
CALL sp_create_schedule(14,1,'RUNTIME',NULL,250,14,25,NULL);   -- ambulance service every 250 h
-- the generator has now run close to its next service -> a runtime alert is raised by the trigger
CALL sp_update_runtime(16, 3640.0);

-- ---------------------------------------------------------------------
-- Historical (completed) work orders, back-dated so reports show a timeline.
-- Flow per work order: insert -> assign -> start -> log labor -> use parts -> complete.
-- Technician ids: 1 in-house, 2 provincial, 3 March, 4 Cebu Lab,
--                 5 Cebu RTK field engineers, 6 Cebu Medical Supply field engineers
-- ---------------------------------------------------------------------

-- WO A: corrective repair, centrifuge TDH-0004 (carbon brushes replaced)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at)
VALUES (4, 6, 'High', 'Abnormal noise and rotor imbalance warning', @app_user, '2026-03-04 09:00:00');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 3, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-03-04 10:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 3, 3.00);
CALL sp_add_part_to_work_order(@wo, 1, 1);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-03-05 15:30:00',
       resolution_notes = 'Replaced carbon brush set, balanced rotor, run test passed.' WHERE work_order_id = @wo;

-- WO B: corrective repair, ECG monitor TDH-0007 in the ER (lead wires replaced)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at)
VALUES (7, 6, 'Medium', 'Lead-off alarm keeps appearing on channel 2', @app_user, '2026-06-10 13:00:00');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 1, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-06-10 14:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 1, 2.00);
CALL sp_add_part_to_work_order(@wo, 4, 1);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-06-10 16:00:00',
       resolution_notes = 'Lead wire set replaced, signal checked on all channels.' WHERE work_order_id = @wo;

-- WO C: preventive maintenance, standby generator TDH-0016
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at, scheduled_date)
VALUES (16, 1, 'Low', 'Routine 250-hour generator service', @app_user, '2026-04-14 08:00:00', '2026-04-15');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 1, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-04-15 09:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 1, 4.00);
CALL sp_add_part_to_work_order(@wo, 6, 1);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-04-15 13:00:00',
       resolution_notes = 'Oil and fuel filters replaced, load test passed.' WHERE work_order_id = @wo;

-- WO D: RPM & temperature calibration, centrifuge TDH-0003 (with calibration log)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at, scheduled_date)
VALUES (3, 3, 'Medium', 'Semi-annual RPM and temperature output calibration', @app_user, '2026-08-18 08:00:00', '2026-08-20');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 4, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-08-20 09:00:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 4, 3.00);
INSERT INTO calibration_logs (work_order_id, calibrated_on, result, certificate_no, notes)
VALUES (@wo, '2026-08-20', 'Pass', 'CAL-2026-0142', 'RPM and temperature within tolerance.');
UPDATE work_orders SET status = 'Completed', completed_at = '2026-08-20 12:00:00',
       resolution_notes = 'Calibration passed.' WHERE work_order_id = @wo;

-- WO E: corrective repair, digital X-ray TDH-0009 (labor only, manufacturer-authorized engineers)
INSERT INTO work_orders (asset_id, type_id, priority, description, created_by, opened_at)
VALUES (9, 6, 'Critical', 'X-ray tube not firing', @app_user, '2026-10-05 07:30:00');
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 6, 'Lead');
UPDATE work_orders SET status = 'In Progress', started_at = '2026-10-05 08:30:00' WHERE work_order_id = @wo;
CALL sp_log_labor_hours(@wo, 6, 6.00);
UPDATE work_orders SET status = 'Completed', completed_at = '2026-10-06 10:00:00',
       resolution_notes = 'Loose high-voltage connector reseated and tested.' WHERE work_order_id = @wo;

-- ---------------------------------------------------------------------
-- Active work orders (so the Work Orders page has live examples)
-- ---------------------------------------------------------------------
-- Open: electrical safety analysis on centrifuge TDH-0003
CALL sp_create_work_order(3, 2, 'Medium', 'Annual electrical safety analysis', CURDATE(), NULL);

-- Assigned: preventive maintenance on hematology analyzer TDH-0001 (warranty service engineers)
CALL sp_create_work_order(1, 1, 'High', 'Quarterly preventive maintenance', CURDATE(), NULL);
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 5, 'Lead');

-- In Progress: corrective repair on chemistry analyzer TDH-0002 (trigger moves the asset to Repair)
CALL sp_create_work_order(2, 6, 'Critical', 'Reagent probe clog error will not clear', NULL, NULL);
SELECT MAX(work_order_id) INTO @wo FROM work_orders;
CALL sp_assign_technician(@wo, 5, 'Lead');
CALL sp_start_work_order(@wo);
CALL sp_log_labor_hours(@wo, 5, 2.00);

-- ---------------------------------------------------------------------
-- Transfers and a decommission, to populate history tables
-- ---------------------------------------------------------------------
CALL sp_transfer_asset(8, 2, 'Moved to ER triage during patient surge');
CALL sp_transfer_asset(13, 8, 'Shared with the microscopy section for pipetting work');
CALL sp_decommission_asset(17, 'Optics damaged beyond repair; replaced by unit TDH-0005');

-- Generate alerts for everything that is due or overdue
CALL sp_run_preventive_check();
