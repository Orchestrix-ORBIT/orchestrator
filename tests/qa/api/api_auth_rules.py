"""Login / registration rules. Probe users are deleted at the end."""
import json, os, re, psycopg2
import qa_db
src = open(os.path.join(os.path.dirname(__file__), "api_lead_actions.py"), encoding="utf-8").read().split("acc = {a[")[0]
ns = {"__file__": os.path.join(os.path.dirname(os.path.abspath(__file__)), "api_lead_actions.py")}; exec(src, ns); results = ns["results"]
import urllib.request
ROOT = ns["ROOT"]; CORE = ns["CORE"]
acc = {a["email"]: a for a in json.load(open(ROOT + "/.project_notes/test_accounts.json"))}
def call(m, u, b=None, t=None, tenant="myorg"):
    h = {"Content-Type": "application/json"}
    if tenant: h["X-Tenant-ID"] = tenant
    if t: h["Authorization"] = "Bearer " + t
    r = urllib.request.Request(CORE + u, data=json.dumps(b).encode() if b is not None else None, headers=h, method=m)
    try:
        with urllib.request.urlopen(r, timeout=300) as x: d = x.read(); return x.status, (json.loads(d) if d else None)
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b"null")
        except Exception: return e.code, None
def ok(name, cond, extra=""):
    results.append((bool(cond), name)); print(f"{'PASS' if cond else 'FAIL'}  {name} {extra}")
pw = "QaProbe123!"
try:
    for email, role in [("admin@myorg.com", "ROLE_ADMIN"), ("lead@myorg.com", "ROLE_LEAD"), ("resource.manager@myorg.com", "ROLE_RESOURCE_MANAGER"), ("researcher.alex@myorg.com", "ROLE_RESEARCHER"), ("researcher@myorg.com", "ROLE_MEMBER")]:
        c, d = call("POST", "/api/auth/login", {"email": email, "password": acc[email]["password"]})
        ok(f"Login {email} -> {role}", c == 200 and d["role"] == role, f"({c} {d and d.get('role')})")
    c, d = call("POST", "/api/auth/login", {"email": "LEAD@MyOrg.com", "password": acc["lead@myorg.com"]["password"]})
    ok("Login is case-insensitive for email", c == 200, f"({c})")
    c, d = call("POST", "/api/auth/register", {"email": "Lead.QaProbe@myorg.com", "password": pw, "displayName": "Probe"})
    ok("Self-registration accepted but returns NO token (pending)", c == 201 and d and d.get("token") is None and d.get("role") == "ROLE_MEMBER", f"({c})")
    c, _ = call("POST", "/api/auth/register", {"email": "lead.qaprobe@MYORG.com", "password": pw})
    ok("Duplicate email with different case rejected", c == 400, f"({c})")
    c, d = call("POST", "/api/auth/login", {"email": "lead.qaprobe@myorg.com", "password": pw})
    ok("Pending account cannot log in, clear message", c == 403 and "not active" in (d or {}).get("message", ""), f"({c})")
    c, d = call("POST", "/api/auth/login", {"email": "lead.qaprobe@myorg.com", "password": "wrong-pass"})
    ok("Wrong password still reported as invalid", c in (401, 403), f"({c})")
    admin = call("POST", "/api/auth/login", {"email": "admin@myorg.com", "password": acc["admin@myorg.com"]["password"]})[1]["token"]
    probe = next(m for m in call("GET", "/api/team", t=admin)[1] if m["email"] == "lead.qaprobe@myorg.com")
    ok("Admin sees pending user as INACTIVE", probe.get("status") == "INACTIVE")
    c, _ = call("PATCH", f"/api/team/{probe['id']}/reactivate", {}, admin)
    c2, d2 = call("POST", "/api/auth/login", {"email": "lead.qaprobe@myorg.com", "password": pw})
    ok("After admin approval the user logs in as MEMBER", c == 200 and c2 == 200 and d2["role"] == "ROLE_MEMBER", f"({c},{c2})")
    c, d = call("POST", "/api/auth/register", {"email": "qaprobe@x.com", "password": pw}, tenant="does-not-exist")
    ok("Register into unknown organization rejected (404)", c == 404, f"({c} {(d or {}).get('message')})")
    c, _ = call("POST", "/api/auth/login", {"email": "lead@myorg.com", "password": "x"}, tenant="does-not-exist")
    ok("Login into unknown organization rejected (404)", c == 404, f"({c})")
    c, _ = call("GET", "/health", tenant="does-not-exist")
    ok("Health check not blocked by tenant check", c == 200, f"({c})")
finally:
    env = dict(l.split("=", 1) for l in open(ROOT + "/backend/core-api/.env").read().splitlines() if "=" in l and not l.lstrip().startswith("#"))
    host, port, db = re.match(r"jdbc:postgresql://([^:/]+):(\d+)/([^?]+)", env["SPRING_DATASOURCE_URL"].strip()).groups()
    cn = qa_db.connect(host=host, port=port, dbname=db, user=env["SPRING_DATASOURCE_USERNAME"].strip(), password=env["SPRING_DATASOURCE_PASSWORD"].strip(), sslmode="require"); cur = cn.cursor()
    for s in ("org_myorg", "public"):
        cur.execute(f"delete from {s}.users where lower(email) like '%%qaprobe%%'"); print(f"cleanup {s}: {cur.rowcount} probe users")
    cn.commit()
    print(f"\nRESULT: {sum(1 for o, _ in results if o)}/{len(results)} passed")
