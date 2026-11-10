# MedAsset demo script (about 15 minutes)

Before you start: MySQL running (event scheduler on), `python manage.py runserver`, `npm run dev`, demo data loaded,
accounts `admin` (Administrator), `tech1` (Technician) and `viewer1` (Viewer) created with their passwords changed.
Use three browser profiles or sign out between roles.

## 1. Sign in and roles (2 min)
1. Open http://localhost:5173. Point out: hospital branding, "Sign-ins and actions are recorded".
2. Sign in as **viewer1**. Menu shows no Users; open any asset: **no action buttons**. Open Audit log: read-only.
3. Sign in as **tech1**. Open an asset: only **Report a fault** is available (it sends a service request; the technician cannot open work orders); Transfer, Status, Runtime and Decommission are not. Schedules are view-only.
3a. Sign in as a **Department Staff** user (e.g. a nurse): the menu has only Assets and My reports. Open an asset, click **Report a fault**.
3b. Still as the technician, click **Report a fault** on an asset, then open **My reports**: the request shows *Waiting for review*.
4. Sign in as **admin**. Open **Service requests**, click **Review** and create the work order (or link it to an open one, or reject it with a reason). Report the same fault again as the technician to show that one open job per problem is enforced. Then open **Users**: add a user, show the temporary password appears once.
5. Audit log → **Roles & permissions** tab: the access matrix comes from the database.

## 2. Asset lifecycle (3 min) — as admin
1. **Assets**: filter by department (Clinical Laboratory), search "centrifuge".
2. **Register asset**: choose *Donation*, note the donor field appears. Save. Toast confirms; asset appears.
3. Open **TDH-0009** (digital X-ray). Show warranty badge, lifetime maintenance cost, status history.
4. **Transfer** an asset. Show the transfer history entry written by a trigger.
5. Try to **Decommission** an asset that has an active work order → the database refuses with a clear message.
6. Open **TDH-0017** (already decommissioned): it is read-only (trigger rule).

## 3. Preventive maintenance (3 min)
1. **Schedules**: show calendar-based and runtime-based schedules and their state (OK, Due soon, Overdue).
2. **Alerts**: show open alerts. Explain that they were created by `sp_run_preventive_check` and the 06:00 event.
3. Open the generator **TDH-0016**. Check its next due hours on **Schedules** (250-hour service), click **Runtime** and enter a higher number. A trigger raises or escalates the alert immediately.
4. On an alert click **Create work order**, then **Acknowledge** another.
5. **Dashboard** → **Run preventive check**. Then **Audit log → Scheduled job runs**: the run is attributed to the
   signed-in user; the 06:00 runs show `SYSTEM (scheduler)`.

## 3b. Staff and external technicians (1 min) — as admin
0. Sign in as the technician: the sidebar says **My work orders** and lists only that person's jobs, with no cost columns. Opening another job's URL is refused and logged.
1. Open **Technicians**. Staff technicians (can sign in) and external technicians (never sign in) are listed separately.
2. Click **Add external technician**: note that company is required and there is no sign-in account.
3. On **Users**, add a user with the Technician role: the technician number, team and rate fields appear, and the person immediately shows in the Assign list.

## 4. Work orders (3 min)
1. **Work orders**: open the In Progress one (TDH-0002). Show assigned technicians, labor, parts, cost totals.
2. **Assign** another technician (note the team shown: in-house, provincial, contractor, manufacturer).
3. **Log labor** and **Add part**: the part's stock decreases; the cost is snapshotted.
4. **Complete** it. The asset returns to In-Use and the schedule rolls forward.
5. Try **Complete** a work order with no labor logged → the procedure refuses (labor is required).
6. On a job done by an external technician, **Complete** asks for their **service report number**.

## 5. Reports and audit (2 min)
1. **Reports**: cost by month, department and category; preventive vs corrective split; top costly assets. Print.
2. **Audit log → Change history**: filter by Work order. Show old/new values and the real username.
3. **Security events**: sign-ins, failed sign-ins, permission denials, role changes.

## 6. Show the database (2 min) — in phpMyAdmin or the mysql client
```sql
USE medasset_db;
SHOW TRIGGERS;
SHOW PROCEDURE STATUS WHERE Db = 'medasset_db';
SELECT * FROM vw_asset_overview LIMIT 5;
SELECT fn_asset_total_cost(2);
SHOW EVENTS;
-- evidence cannot be edited:
UPDATE audit_logs SET changed_by = 'someone' WHERE audit_id = 1;   -- fails: append-only
-- the web account cannot read tables, only run procedures:
--   mysql -u medasset_app -p -e "SELECT * FROM medasset_db.assets"   -- access denied
```

## 7. Security demonstration (optional)
1. Enter a wrong password for **viewer1** five times; the account locks. As admin, **Users → Unlock**.
2. Security events show LOGIN_FAILED ×5, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED.
3. As viewer1 open `http://localhost:8000/api/users/` directly: 403 (the database refuses).
