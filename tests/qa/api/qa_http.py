"""Small HTTP helpers shared by the delete/suspend suites."""
import os
import json, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # repo root
ACC = {a["email"]: a for a in json.load(open(os.path.join(ROOT, ".project_notes", "test_accounts.json")))}
BASE = "http://localhost:8080"
ok = 0; total = 0


def req(method, path, body=None, token=None, tenant="myorg"):
    h = {"Content-Type": "application/json", "X-Tenant-ID": tenant}
    if token: h["Authorization"] = "Bearer " + token
    r = urllib.request.Request(BASE + path, method=method, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            t = resp.read().decode(); return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t


def check(name, cond, extra=""):
    global ok, total
    total += 1; ok += bool(cond)
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else "  -> " + str(extra)[:200]))


def login(email):
    s, b = req("POST", "/api/auth/login", {"email": email, "password": ACC[email]["password"]})
    return b["token"]



def summary():
    print(f"RESULT {ok}/{total}")
