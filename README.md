# MedAsset: Medical Asset Tracking & Preventive Service System

## Project Description

MedAsset is an **Advanced Database Management System** course project. It is a web-based system for **Tuburan District Hospital** (Cebu Provincial Government) that tracks every piece of medical equipment from registration to decommissioning. It raises preventive-maintenance alerts automatically, manages corrective and preventive work orders with labor and parts cost, and keeps a tamper-resistant audit trail.

The focus of the project is the database. The business rules live in MySQL/MariaDB as **triggers, stored procedures, functions, views and a scheduled event**. Django only authenticates users and calls stored procedures. React only displays the screens.

## Objectives

1. Design a normalized relational database (25 tables) for the full life cycle of hospital medical equipment.
2. Enforce business rules inside the database with triggers, constraints and transactional stored procedures, so rules hold no matter which application connects.
3. Automate preventive maintenance with calendar-based and runtime-based schedules, a database trigger and a daily scheduled event.
4. Track work orders with technicians, parts and labor, and compute lifetime maintenance cost per asset.
5. Provide an audit trail and role-based access control (RBAC) suitable for hospital compliance testing.
6. Demonstrate a clean separation of layers: database, API and user interface.

## Key Features

- **Asset lifecycle tracking:** registration, department/location transfers, status history, warranty, acquisition by public bidding or donation, and decommissioning.
- **Automated preventive maintenance:** schedules by calendar (every N days) or machine runtime (every N hours). A trigger raises alerts as runtime nears the due value, and the event `evt_daily_preventive_check` runs every day at 06:00.
- **Work orders:** Open, Assigned, In Progress, Completed or Cancelled. Triggers enforce the workflow, move the asset to *Repair* and back, and roll schedules forward.
- **Cost tracking:** labor and parts cost are snapshotted so past reports never change. Reports cover cost by month, department and category, and preventive versus corrective work.
- **Audit logs:** triggers record old and new values with the real user name. Audit and security tables are append-only.
- **Staff and external technicians:** staff technicians (in-house and provincial engineering) can have a sign-in account; external technicians (contractors and manufacturer engineers) never sign in. Work done by an external technician needs the company's service report number before it can be completed.
- **Role-based access control:** three roles (Administrator, Technician, Viewer). Permissions are rows in the database and are enforced inside the stored procedures.
- **Secure sign-in:** PBKDF2 password hashing, server-side sessions with idle and absolute timeouts, 5-failed-attempt lock-out, and forced password change on temporary passwords.
- **Least-privilege database account:** the web app connects as `medasset_app`, which can only `EXECUTE` stored procedures.

### Database objects

| Object | Count | Examples |
|---|---|---|
| Tables | 25 | `assets`, `maintenance_schedules`, `work_orders`, `audit_logs`, `users`, `roles`, `permissions` |
| Triggers | 48 | status and transfer history, runtime alerts, work-order workflow, audit logging, append-only guards |
| Stored procedures | 52 | `sp_register_asset`, `sp_transfer_asset`, `sp_create_work_order`, `sp_complete_work_order`, `sp_require_permission` |
| Functions | 6 | `fn_work_order_labor_cost`, `fn_work_order_parts_cost`, `fn_asset_total_cost`, `fn_schedule_state`, `fn_has_permission`, `fn_can_access_work_order` |
| Views | 5 | `vw_asset_overview`, `vw_work_order_summary`, `vw_work_order_secure`, `vw_schedule_status`, `vw_alerts` |
| Scheduled event | 1 | `evt_daily_preventive_check` (daily at 06:00) |

### Roles

| Role | Typical user | Can do |
|---|---|---|
| Administrator | Biomedical/IT admin, asset manager | Everything, including user management and audit trail |
| Technician | In-house and provincial staff technicians (contractors and manufacturer engineers are recorded as external technicians and do not sign in) | View assets, schedules and alerts, acknowledge alerts, report faults on an asset and carry out work orders (only the administrator turns an alert into a job and assigns it). Sees and acts only on work orders assigned to them or opened by them (enforced in the database), with costs hidden. Cannot decommission, cancel work orders, view reports or audit, or manage users |
| Viewer | Department heads, finance, quality and auditors | Read-only access, including reports and audit trail |

See [SECURITY.md](SECURITY.md) for the full list of controls and known limits.

## Technology Stack

| Layer | Technology |
|---|---|
| Database | MySQL / MariaDB 10.4 (XAMPP), InnoDB, triggers, stored procedures, events |
| Backend | Python 3.11+, Django, Django REST Framework, django-cors-headers, mysqlclient |
| Frontend | React, TypeScript, Vite, Tailwind CSS v4, React Router |
| Tools | XAMPP, PowerShell, Git and GitHub |

## Project Structure

```
medasset/
├── database/
│   ├── 01_schema.sql              Database and 19 business tables, constraints, indexes
│   ├── 02_triggers.sql            History, alert, workflow and audit triggers
│   ├── 03_functions_views.sql     Cost functions and reporting views
│   ├── 04_procedures_write.sql    Procedures that change data (transactions, locks, rollback)
│   ├── 05_procedures_read.sql     Procedures that read data for the screens
│   ├── 06_events.sql              Daily preventive-maintenance event
│   ├── 07_seed_data.sql           Demo data for Tuburan District Hospital
│   ├── 08_security_schema.sql     Roles, permissions, users, sessions, security log
│   ├── 09_security_procedures.sql Sign-in, sessions, user admin, permission gate
│   ├── 10_app_account.sql         Restricted account for the web app
│   ├── install_database.ps1       One-command installer
│   └── load_demo_data.ps1         Loads the demo data
├── backend/
│   ├── config/                    Django settings, URLs, custom DB backend
│   ├── api/                       auth, db helper (call_proc), views, admin views, create_admin command
│   └── requirements.txt
├── frontend/
│   ├── public/                    Logo and sign-in photo
│   └── src/
│       ├── pages/                 Dashboard, Assets, Schedules, Alerts, Work Orders, Reports, Audit Log, Users, Login
│       ├── components/            Reusable UI, layout, assets, alerts, schedules, workorders, reports, audit, users, auth
│       ├── auth/                  Auth provider and permission helpers
│       └── api/                   API client and types
├── docs/
│   └── DEMO_SCRIPT.md             Step-by-step demonstration script
├── README.md
└── SECURITY.md
```

## Setup/Execution Instructions

### Requirements

- XAMPP with MySQL/MariaDB 10.4 or newer
- Python 3.11 or newer
- Node.js 20 or newer
- Git

### 1. Start MySQL and enable the scheduler

1. Open the XAMPP Control Panel and start **MySQL**.
2. Open `C:\xampp\mysql\bin\my.ini`, add `event_scheduler=ON` under `[mysqld]`, then stop and start MySQL again.

### 2. Install the database

This recreates `medasset_db`, creates the `medasset_app` account, and writes its random password to `backend\.env`. Never commit that file.

```powershell
cd database
powershell -ExecutionPolicy Bypass -File .\install_database.ps1
```

### 3. Set up and run the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py create_admin
python manage.py runserver
```

`create_admin` asks for the administrator username and password. The password needs at least 10 characters with upper case, lower case and a digit, and must not contain the username. Keep this window open.

If PowerShell blocks the venv, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

### 4. Load the demo data (optional)

Run this after the administrator exists.

```powershell
cd database
powershell -ExecutionPolicy Bypass -File .\load_demo_data.ps1
```

### 5. Run the frontend

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the administrator account. Create Technician and Viewer users from the **Users** page (a Technician account also needs a technician number, team and hourly rate, and appears in the work-order assignment list). Manage external technicians on the **Technicians** page. The temporary password is shown once and must be changed at first sign-in.

Optional: save a hospital photo as `frontend/public/hospital.jpg` for the sign-in page.

### 6. Demonstration

Follow [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

### Note on demo data

Equipment models, serial numbers and costs in `07_seed_data.sql` are illustrative placeholders. Replace them with the hospital's real equipment register before real use.
