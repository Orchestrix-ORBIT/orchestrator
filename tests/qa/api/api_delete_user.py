"""Organization admin permanently deletes users: rules and cleanup. The throwaway account is removed."""
import time
from qa_http import req, login, check, summary

admin = login("admin@myorg.com")
lead = login("lead@myorg.com")
members = req("GET", "/api/team", token=admin)[1]
by_email = {m["email"]: m for m in members}

# throwaway account: sign up (pending), approve, then delete
email = f"delete.me.{int(time.time())}@myorg.com"
s, _ = req("POST", "/api/auth/register", {"email": email, "password": "Throwaway@2026", "displayName": "Delete Me"})
check("throwaway sign-up created", s in (200, 201), s)
tid = next(m["id"] for m in req("GET", "/api/team", token=admin)[1] if m["email"] == email)
s, _ = req("PATCH", f"/api/team/{tid}/reactivate", token=admin)
check("throwaway approved", s == 200, s)

s, b = req("DELETE", f"/api/team/{tid}/permanent", token=lead)
check("lead cannot delete users (403)", s == 403, (s, b))

s, b = req("DELETE", f"/api/team/{tid}/permanent", token=admin)
check("admin deletes the user (204)", s == 204, (s, b))
check("user is gone from roster", all(m["email"] != email for m in req("GET", "/api/team", token=admin)[1]))
s, b = req("POST", "/api/auth/login", {"email": email, "password": "Throwaway@2026"})
check("deleted user cannot sign in", s in (401, 403), (s, b))
s, b = req("DELETE", f"/api/team/{tid}/permanent", token=admin)
check("deleting again -> 404", s == 404, (s, b))

s, b = req("DELETE", f"/api/team/{by_email['admin@myorg.com']['id']}/permanent", token=admin)
check("admin cannot delete own account (400)", s == 400, (s, b))

s, b = req("DELETE", f"/api/team/{by_email['lead@myorg.com']['id']}/permanent", token=admin)
check("lead with projects refused (400, explains)", s == 400 and "still owns" in str(b), (s, b))
print("   message:", str(b)[:220])
check("lead still exists", any(m["email"] == "lead@myorg.com" for m in req("GET", "/api/team", token=admin)[1]))

summary()
