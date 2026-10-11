"""Platform admin vs organization admin. Uses org 'acme'; the probe admin created there is removed at the end."""
import os
import json, re, urllib.request, psycopg2
import qa_db
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # repo root
acc = {a["email"]: a for a in json.load(open(ROOT + "/.project_notes/test_accounts.json"))}
results = []
def call(m, path, body=None, tok=None, tenant="myorg"):
    h = {"Content-Type": "application/json", "X-Tenant-ID": tenant}
    if tok: h["Authorization"] = "Bearer " + tok
    r = urllib.request.Request("http://localhost:8080" + path, data=json.dumps(body).encode() if body is not None else None, headers=h, method=m)
    try:
        with urllib.request.urlopen(r, timeout=300) as x: d = x.read(); return x.status, (json.loads(d) if d else None)
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b"null")
        except Exception: return e.code, None
def ok(name, cond, extra=""):
    results.append(bool(cond)); print(f"{'PASS' if cond else 'FAIL'}  {name} {extra}")
env = dict(l.split("=", 1) for l in open(ROOT + "/backend/core-api/.env").read().splitlines() if "=" in l and not l.lstrip().startswith("#"))
host, port, db = re.match(r"jdbc:postgresql://([^:/]+):(\d+)/([^?]+)", env["SPRING_DATASOURCE_URL"].strip()).groups()
cn = qa_db.connect(host=host, port=port, dbname=db, user=env["SPRING_DATASOURCE_USERNAME"].strip(), password=env["SPRING_DATASOURCE_PASSWORD"].strip(), sslmode="require"); cur = cn.cursor()
PROBE = "qa.orgadmin@acme.test"
try:
    P = "platform"
    c, d = call("POST", "/api/auth/login", {"email": "platform.admin@orchestrix.com", "password": acc["platform.admin@orchestrix.com"]["password"]}, tenant=P)
    plat = d["token"]; ok("Platform admin logs in (org 'platform')", c == 200 and d["role"] == "ROLE_ADMIN")
    c, d = call("GET", "/api/admin/tenants/context", tok=plat, tenant=P)
    ok("Platform admin context: platformAdmin=true", c == 200 and d["platformAdmin"] is True and d["slug"] == "platform", f"({d})")
    my = call("POST", "/api/auth/login", {"email": "admin@myorg.com", "password": acc["admin@myorg.com"]["password"]})[1]["token"]
    c, d = call("GET", "/api/admin/tenants/context", tok=my)
    ok("admin@myorg.com is now an organization admin of myorg", c == 200 and d["platformAdmin"] is False and d["slug"] == "myorg", f"({d})")
    ok("admin@myorg.com can no longer list organizations", call("GET", "/api/admin/tenants", tok=my)[0] == 403)
    c, team = call("GET", "/api/team", tok=my)
    ok("admin@myorg.com still manages myorg users", c == 200 and len(team) > 5, f"({len(team)} users)")
    c, tenants = call("GET", "/api/admin/tenants", tok=plat, tenant=P)
    ok("Platform admin lists all organizations with user counts", c == 200 and all("userCount" in t for t in tenants), f"({[(t['slug'], t.get('userCount')) for t in tenants]})")
    me = next(t for t in tenants if t["slug"] == "platform"); acme = next(t for t in tenants if t["slug"] == "acme")
    c, d = call("PATCH", f"/api/admin/tenants/{me['id']}/status?status=SUSPENDED", {}, plat, P)
    ok("Platform organization cannot be suspended", c == 400, f"({c} {(d or {}).get('message')})")

    # Organization admin of acme (first sign-up of an empty org becomes its admin)
    cur.execute("select count(*) from org_acme.users"); before = cur.fetchone()[0]
    c, d = call("POST", "/api/auth/register", {"email": PROBE, "password": "QaOrgAdmin123!", "displayName": "Acme Admin"}, tenant="acme")
    if before > 0:   # org not empty: promote the probe to ADMIN directly so we can test the org-admin view
        cur.execute("update org_acme.users set role='ADMIN', status='ACTIVE' where email=%s", (PROBE,)); cn.commit()
    c, d = call("POST", "/api/auth/login", {"email": PROBE, "password": "QaOrgAdmin123!"}, tenant="acme")
    org = d["token"]; ok("Acme organization admin can log in as ADMIN", c == 200 and d["role"] == "ROLE_ADMIN", f"({c})")
    c, d = call("GET", "/api/admin/tenants/context", tok=org, tenant="acme")
    ok("Org admin context: platformAdmin=false, own org named", c == 200 and d["platformAdmin"] is False and d["slug"] == "acme", f"({d})")
    ok("Org admin cannot list all organizations", call("GET", "/api/admin/tenants", tok=org, tenant="acme")[0] == 403)
    ok("Org admin cannot create organizations", call("POST", "/api/admin/tenants", {"slug": "qa-x", "name": "x"}, org, "acme")[0] == 403)
    ok("Org admin cannot read another organization's record", call("GET", "/api/admin/tenants/myorg", tok=org, tenant="acme")[0] == 403)
    ok("Org admin can read its own organization's record", call("GET", "/api/admin/tenants/acme", tok=org, tenant="acme")[0] == 200)
    ok("Org admin cannot suspend organizations", call("PATCH", f"/api/admin/tenants/{me['id']}/status?status=SUSPENDED", {}, org, "acme")[0] == 403)
    c, team = call("GET", "/api/team", tok=org, tenant="acme")
    ok("Org admin's roster contains only its own users", c == 200 and all(m["email"].endswith("acme.test") or "@myorg.com" not in m["email"] for m in team), f"({len(team)} users)")
    ok("Org admin token is rejected in another organization", call("GET", "/api/team", tok=org, tenant="myorg")[0] in (401, 403))

    # Platform admin suspends acme -> immediate effect -> reactivate
    c, d = call("PATCH", f"/api/admin/tenants/{acme['id']}/status?status=SUSPENDED", {}, plat, P)
    ok("Platform admin suspends acme", c == 200 and d["status"] == "SUSPENDED")
    c, d = call("POST", "/api/auth/login", {"email": PROBE, "password": "QaOrgAdmin123!"}, tenant="acme")
    ok("Suspended organization's users are blocked immediately", c == 403 and "suspended" in (d or {}).get("message", ""), f"({c} {(d or {}).get('message')})")
    c, d = call("PATCH", f"/api/admin/tenants/{acme['id']}/status?status=ACTIVE", {}, plat, P)
    c2, _ = call("POST", "/api/auth/login", {"email": PROBE, "password": "QaOrgAdmin123!"}, tenant="acme")
    ok("Reactivated organization works again", c == 200 and c2 == 200, f"({c},{c2})")
    ok("Platform admin cannot read acme's data with its token", call("GET", "/api/team", tok=plat, tenant="acme")[0] in (401, 403))
    ok("Platform admin cannot read myorg's data with its token", call("GET", "/api/projects", tok=plat, tenant="myorg")[0] in (401, 403))
finally:
    cur.execute("update public.tenants set status='ACTIVE' where slug='acme'")
    cur.execute("delete from org_acme.users where email=%s", (PROBE,)); print("cleanup: removed", cur.rowcount, "probe admin; acme ACTIVE"); cn.commit()
    print(f"RESULT {sum(results)}/{len(results)}")
