"""Organization admin actions + permission boundaries; role changes are restored.
Organizations are managed by the platform admin (see api_platform_admin.py), so here the org admin must be refused."""
import json, os, re, time, psycopg2
import qa_db
src = open(os.path.join(os.path.dirname(__file__), "api_lead_actions.py"), encoding="utf-8").read().split("acc = {a[")[0]
ns = {"__file__": os.path.join(os.path.dirname(os.path.abspath(__file__)), "api_lead_actions.py")}; exec(src, ns)
call, check, results, CORE, ROOT = ns["call"], ns["check"], ns["results"], ns["CORE"], ns["ROOT"]
acc = {a["email"]: a for a in json.load(open(ROOT + "/.project_notes/test_accounts.json"))}
login = lambda e: call("POST", CORE + "/api/auth/login", {"email": e, "password": acc[e]["password"]})[1]

admin = check("Login as admin (admin@myorg.com, ADMIN)", "POST", CORE + "/api/auth/login",
              {"email": "admin@myorg.com", "password": acc["admin@myorg.com"]["password"]}, test=lambda d: d.get("role") == "ROLE_ADMIN")["token"]
alex = login("researcher.alex@myorg.com")["token"]
slug = "qa-" + str(int(time.time()))[-6:]
restore = []

try:
    # ── Tenants ──────────────────────────────────────────────────────────
    check("SECURITY: org admin cannot list all organizations", "GET", CORE + "/api/admin/tenants", tok=admin, expect=(403,))
    check("Tenants: org admin reads its own organization", "GET", CORE + "/api/admin/tenants/myorg", tok=admin, test=lambda d: d.get("slug") == "myorg")
    check("SECURITY: org admin cannot provision organizations", "POST", CORE + "/api/admin/tenants", {"slug": slug, "name": "[QA] Tenant"}, tok=admin, expect=(403,))
    t = None  # provisioning is covered by api_platform_admin.py
    if t:
        check("Tenants: new org appears in list", "GET", CORE + "/api/admin/tenants", tok=admin, test=lambda d: any(x["slug"] == slug for x in d))
        check("Tenants: duplicate slug rejected", "POST", CORE + "/api/admin/tenants", {"slug": slug, "name": "dup"}, tok=admin, expect=(400, 409))
        # the new schema must be isolated and usable: register a user in it, log in, see no myorg data
        h = {"X-Tenant-ID": slug}
        import urllib.request
        def tcall(method, path, body=None, tok=None):
            hh = {"Content-Type": "application/json", "X-Tenant-ID": slug}
            if tok: hh["Authorization"] = "Bearer " + tok
            r = urllib.request.Request(CORE + path, data=json.dumps(body).encode() if body else None, headers=hh, method=method)
            try:
                with urllib.request.urlopen(r, timeout=90) as x: return x.status, json.loads(x.read() or b"null")
            except urllib.error.HTTPError as e: return e.code, None
        c, d = tcall("POST", "/api/auth/register", {"email": "qa.user@qa.test", "password": "QaPass123!"})
        ok = c in (200, 201) and d and d.get("token")
        results.append((bool(ok), "Tenants: register a user inside the new org")); print(f"{'PASS' if ok else 'FAIL'}  Tenants: register a user inside the new org ({c})")
        if ok:
            c2, projs = tcall("GET", "/api/projects", tok=d["token"])
            iso = c2 == 200 and projs == []
            results.append((iso, "SECURITY: new org sees none of myorg's projects")); print(f"{'PASS' if iso else 'FAIL'}  SECURITY: new org sees none of myorg's projects ({c2}, {len(projs or [])} projects)")
            c3, _ = tcall("GET", "/api/projects", tok=admin)
            results.append((c3 in (401, 403), "SECURITY: myorg token rejected in another org")); print(f"{'PASS' if c3 in (401, 403) else 'FAIL'}  SECURITY: myorg token rejected in another org ({c3})")
        check("Tenants: suspend org status", "PATCH", f"{CORE}/api/admin/tenants/{t['id']}/status?status=SUSPENDED", {}, tok=admin)
    check("SECURITY: researcher cannot list tenants", "GET", CORE + "/api/admin/tenants", tok=alex, expect=(403,))
    check("SECURITY: researcher cannot provision tenant", "POST", CORE + "/api/admin/tenants", {"slug": slug + "x", "name": "x"}, tok=alex, expect=(403,))
    check("SECURITY: anonymous cannot provision without bootstrap key", "POST", CORE + "/api/admin/tenants", {"slug": slug + "y", "name": "y"}, expect=(401, 403))

    # ── Roster / roles ───────────────────────────────────────────────────
    team = check("Roster: list all users", "GET", CORE + "/api/team", tok=admin, test=lambda d: len(d) > 0 and all("status" in m for m in d))
    marcus = next(m for m in team if m["email"] == "researcher.marcus@myorg.com")
    restore.append(("PATCH", f"{CORE}/api/team/{marcus['id']}/role", {"role": marcus["role"]}))
    check("Roster: change Marcus MEMBER -> LEAD", "PATCH", f"{CORE}/api/team/{marcus['id']}/role", {"role": "LEAD"}, tok=admin, test=lambda d: d.get("role") == "LEAD")
    check("Roster: change Marcus -> RESOURCE_MANAGER", "PATCH", f"{CORE}/api/team/{marcus['id']}/role", {"role": "RESOURCE_MANAGER"}, tok=admin, test=lambda d: d.get("role") == "RESOURCE_MANAGER")
    check("Roster: restore Marcus role", "PATCH", f"{CORE}/api/team/{marcus['id']}/role", {"role": marcus["role"]}, tok=admin, test=lambda d: d.get("role") == marcus["role"])
    restore.pop()
    lead_admin = next(m for m in team if m["email"] == "admin@myorg.com")
    check("Roster: admin accounts are protected from role change", "PATCH", f"{CORE}/api/team/{lead_admin['id']}/role", {"role": "MEMBER"}, tok=admin, expect=(400, 403))
    check("SECURITY: researcher cannot change roles", "PATCH", f"{CORE}/api/team/{marcus['id']}/role", {"role": "ADMIN"}, tok=alex, expect=(403,))
    check("SECURITY: researcher cannot remove users", "DELETE", f"{CORE}/api/team/{marcus['id']}", tok=alex, expect=(403,))
    check("SECURITY: researcher cannot reactivate users", "PATCH", f"{CORE}/api/team/{marcus['id']}/reactivate", {}, tok=alex, expect=(403,))
    guest = next(m for m in team if m["email"] == "guest@myorg.com")
    restore.append(("PATCH", f"{CORE}/api/team/{guest['id']}/reactivate", {}))
    check("Roster: suspend (remove) guest", "DELETE", f"{CORE}/api/team/{guest['id']}", tok=admin)
    c, _, _ = call("POST", CORE + "/api/auth/login", {"email": "guest@myorg.com", "password": acc["guest@myorg.com"]["password"]})
    results.append((c != 200, "Roster: suspended user cannot log in")); print(f"{'PASS' if c != 200 else 'FAIL'}  Roster: suspended user cannot log in ({c})")
    check("Roster: reactivate guest", "PATCH", f"{CORE}/api/team/{guest['id']}/reactivate", {}, tok=admin, test=lambda d: d.get("status") == "ACTIVE")
    restore.pop()
    c, _, _ = call("POST", CORE + "/api/auth/login", {"email": "guest@myorg.com", "password": acc["guest@myorg.com"]["password"]})
    results.append((c == 200, "Roster: reactivated user can log in")); print(f"{'PASS' if c == 200 else 'FAIL'}  Roster: reactivated user can log in ({c})")
finally:
    print("\n-- restore / cleanup --")
    for m, u, b in restore: print(f"  {m} {u.replace(CORE, '')} -> {call(m, u, b, admin)[0]}")
    env = dict(l.split("=", 1) for l in open(ROOT + "/backend/core-api/.env").read().splitlines() if "=" in l and not l.lstrip().startswith("#"))
    host, port, db = re.match(r"jdbc:postgresql://([^:/]+):(\d+)/([^?]+)", env["SPRING_DATASOURCE_URL"].strip()).groups()
    c = qa_db.connect(host=host, port=port, dbname=db, user=env["SPRING_DATASOURCE_USERNAME"].strip(), password=env["SPRING_DATASOURCE_PASSWORD"].strip(), sslmode="require")
    cur = c.cursor()
    cur.execute("select slug, schema_name from public.tenants where slug like 'qa-%'")
    for s, schema in cur.fetchall():
        cur.execute(f'drop schema if exists "{schema}" cascade'); cur.execute("delete from public.tenants where slug=%s", (s,)); print(f"  dropped tenant {s} ({schema})")
    c.commit()
    passed = sum(1 for ok, _ in results if ok)
    print(f"\nRESULT: {passed}/{len(results)} passed")
    for ok, name in results:
        if not ok: print("  FAILED:", name)
