# MedAsset security and audit design

## Roles (stored in tables, changeable without code)
| Role | Can | Cannot |
|---|---|---|
| Administrator | everything, incl. users and audit trail | - |
| Technician | register/transfer assets, status & runtime, schedules, alerts, run work orders (assign, start, labor, parts, complete) | decommission, cancel work orders, cost reports, audit log, users |
| Viewer | read-only: dashboard, assets, work orders, schedules, alerts, reports, audit trail | any change |

The full matrix is shown in the app: Audit log > Roles & permissions.

## Controls
- **Identity cannot be spoofed.** The browser holds only a random session token (HttpOnly cookie). Django sends the
  database just the validated user id; `sp_require_permission` looks up the name itself. No `web.user` / `seed.script`.
- **Enforced in the database.** Every procedure the API can call starts with a permission check. A bug in the web layer
  cannot bypass it. Denials are logged (`PERMISSION_DENIED`).
- **Least privilege.** The web app connects as `medasset_app`, which can only EXECUTE procedures (no table access).
- **Append-only evidence.** `audit_logs`, `security_events`, `job_logs`, status/transfer history and calibration
  records reject UPDATE and DELETE (triggers). Users are never deleted or renamed, only deactivated.
- **Authentication.** PBKDF2 salted hashes; policy: 10+ chars, upper+lower+digit, no username; temporary passwords are
  random, shown once, and must be changed at first sign-in; 5 wrong passwords lock the account 15 minutes; generic
  login errors; sessions idle out after 30 min and last at most 12 h; password change/reset/deactivation ends sessions.
- **Traceability.** Sign-ins, failures, lock-outs, role changes, password resets, user changes and access-matrix
  changes are all recorded with who, when and IP. Scheduled runs are attributed to `SYSTEM (scheduler)`.
- **CSRF.** Every change request must carry `X-Requested-With: MedAsset` (cookie is SameSite=Lax).

## Known limits (state them honestly to the hospital)
- A database administrator with root access can still disable triggers or drop tables. Mitigate with MariaDB binary
  logging, regular off-machine backups and restricting root.
- Serve over HTTPS in production (cookie is `Secure` when `MEDASSET_DEBUG=0`) and put Django behind a proper server.
- No two-factor authentication or password history yet.
