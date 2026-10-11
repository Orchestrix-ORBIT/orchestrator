# End-to-end QA suites

These scripts check every role's features against the **running local stack**: Core API on 8080, Realtime on 8082 and the frontend on 3000.
They complement the unit tests (`mvnw test`, `npm run test:run`), which mock the backend.
Each script creates its own test data (named `[QA]…`, or a throwaway account) and removes it at the end.

## Prerequisites
- **Services running.** Start them as described in `RUN_SERVICES.md`.
- **Test accounts.** The accounts are read from `.project_notes/test_accounts.json`, which is local only and never committed. No passwords are stored in these scripts.
- **Python 3.** Install `psycopg2-binary` for the suites that clean up directly in the database (`api_auth_rules`, `api_admin_actions`, `api_rm_actions`, `api_platform_admin`). They read the DB connection from `backend/core-api/.env`.
- **Browser suites.** These use the Playwright package already installed in `frontend/orchestrix_orbit_frontend/node_modules` and the installed Google Chrome. Screenshots go to `ui/shots/`, which git ignores.

## Run
```powershell
cd tests/qa
.\run_all.ps1             # every API suite, then every browser suite
.\run_all.ps1 -ApiOnly
python api\api_lead_actions.py    # a single suite
node ui\ui_role_gates.js
```
Each suite prints `PASS` or `FAIL` per check and a final `RESULT x/y` line.

## API suites (`api/`)
| Suite | What it covers |
|---|---|
| `api_auth_rules.py` | Case-insensitive emails, wrong-password and lockout messages, unknown organization |
| `api_lead_actions.py` | Lead: projects, tasks, documents, teams, chat, AI summaries; cleans up after itself |
| `api_researcher_actions.py` | Researcher: own tasks, documents, bookings; permission boundaries |
| `api_rm_actions.py` | Resource Manager: assets, maintenance, booking approvals |
| `api_admin_actions.py` | Organization admin: roles, approvals, what admins may and may not do |
| `api_platform_admin.py` | Platform admin and organization admins: provisioning, suspension, admin assignment |
| `api_delete_user.py` | Permanent delete: Lead gets 403, owners of data are refused, the deleted user can't sign in |
| `api_suspend_user.py` | Suspend: the existing session is blocked at once; reactivate restores sign-in |

## Browser suites (`ui/`)
| Suite | What it covers |
|---|---|
| `ui_role_gates.js`, `ui_admin_gate.js`, `ui_platform_no_lead.js` | Each role lands on its own dashboard; other dashboards redirect |
| `ui_lead_flows.js`, `ui_researcher_flows.js`, `ui_rm_flows.js` | The main demo flows for each role, verified through the API |
| `ui_researcher_booking.js`, `ui_cancel_booking.js` | Booking a resource and cancelling it |
| `ui_signup_approval.js`, `ui_approve_reject_popups.js` | Sign-up waits for approval; confirmation popups and loading skeletons |
| `ui_admin_views.js`, `ui_orgadmins.js` | Platform and organization admin views; assigning organization admins |
| `ui_signout.js` | Sign-out confirmation and revoked session |
