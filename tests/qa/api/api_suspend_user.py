"""Suspend / reactivate: sign-in and existing sessions are blocked immediately. The throwaway account is removed."""
import time
from qa_http import req, login, check, summary

admin = login("admin@myorg.com")
email = f"suspend.me.{int(time.time())}@myorg.com"
req("POST", "/api/auth/register", {"email": email, "password": "Throwaway@2026", "displayName": "Suspend Me"})
tid = next(m["id"] for m in req("GET", "/api/team", token=admin)[1] if m["email"] == email)
req("PATCH", f"/api/team/{tid}/reactivate", token=admin)
s, b = req("POST", "/api/auth/login", {"email": email, "password": "Throwaway@2026"})
tok = b["token"]
check("approved user signs in", s == 200, (s, b))
check("token works before suspend", req("GET", "/api/team/" + tid, token=tok)[0] != 401)

s, b = req("DELETE", f"/api/team/{tid}", token=admin)
check("admin suspends user (204)", s == 204, (s, b))
check("roster shows SUSPENDED", next(m for m in req("GET", "/api/team", token=admin)[1] if m["id"] == tid)["status"] == "SUSPENDED")
s, b = req("GET", "/api/team/" + tid, token=tok)
check("existing session blocked immediately", s in (401, 403), (s, b))
s, b = req("POST", "/api/auth/login", {"email": email, "password": "Throwaway@2026"})
check("suspended user cannot sign in (403)", s == 403, (s, b))

me = next(m for m in req("GET", "/api/team", token=admin)[1] if m["email"] == "admin@myorg.com")
s, b = req("DELETE", f"/api/team/{me['id']}", token=admin)
check("admin cannot suspend self (400)", s == 400, (s, b))

s, _ = req("PATCH", f"/api/team/{tid}/reactivate", token=admin)
s, b = req("POST", "/api/auth/login", {"email": email, "password": "Throwaway@2026"})
check("reactivated user signs in again", s == 200, (s, b))

s, _ = req("DELETE", f"/api/team/{tid}/permanent", token=admin)
check("cleanup: throwaway deleted", s == 204, s)
summary()
