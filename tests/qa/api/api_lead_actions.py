"""Lead dashboard action test against the live local stack. All test data is named [QA] and removed at the end."""
import os
import json, time, urllib.request, datetime as dt

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # repo root
CORE, RT = "http://localhost:8080", "http://localhost:8082"
results, cleanup = [], []

def call(method, url, body=None, tok=None, expect=(200, 201, 204)):
    h = {"Content-Type": "application/json", "X-Tenant-ID": "myorg"}
    if tok: h["Authorization"] = "Bearer " + tok
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r: code, raw = r.status, r.read()
    except urllib.error.HTTPError as e: code, raw = e.code, e.read()
    try: data = json.loads(raw) if raw else None
    except Exception: data = raw.decode(errors="replace")[:200]
    return code, data, time.time() - t

def check(name, method, url, body=None, tok=None, expect=(200, 201, 204), test=None):
    code, data, secs = call(method, url, body, tok)
    ok = code in expect and (test is None or test(data))
    detail = "" if ok else f" -> {str(data)[:160]}"
    results.append((ok, name))
    print(f"{'PASS' if ok else 'FAIL'}  {name:58} {code} {secs:5.1f}s{detail}")
    return data if code in (200, 201) else None

acc = {a["email"]: a for a in json.load(open(ROOT + "/.project_notes/test_accounts.json"))}
lead = acc["lead@myorg.com"]
login = check("Login as lead", "POST", CORE + "/api/auth/login", {"email": lead["email"], "password": lead["password"]},
              test=lambda d: d.get("token") and "LEAD" in d.get("role", ""))
tok = login["token"]; me = login["userId"]

try:
    # ── Overview / Projects ───────────────────────────────────────────────
    check("Overview: list projects", "GET", CORE + "/api/projects", tok=tok, test=lambda d: isinstance(d, list))
    check("Overview: list resources", "GET", CORE + "/api/resources", tok=tok, test=lambda d: isinstance(d, list))
    team = check("Overview/Team: list org members", "GET", CORE + "/api/team", tok=tok, test=lambda d: isinstance(d, list))
    p = check("Projects: create [QA] project", "POST", CORE + "/api/projects",
              {"name": "[QA] Demo check project", "description": "Created by automated QA, safe to delete"}, tok=tok,
              test=lambda d: d.get("id"))
    pid = p["id"]; cleanup.append(("DELETE", f"{CORE}/api/projects/{pid}"))
    check("Projects: get by id", "GET", f"{CORE}/api/projects/{pid}", tok=tok, test=lambda d: d["name"].startswith("[QA]"))
    check("Projects: edit name/description", "PUT", f"{CORE}/api/projects/{pid}",
          {"name": "[QA] Demo check project (edited)", "description": "edited"}, tok=tok,
          test=lambda d: d["name"].endswith("(edited)"))
    check("Projects: summary (progress %)", "GET", f"{CORE}/api/projects/{pid}/summary", tok=tok,
          test=lambda d: "completionPercentage" in d or "totalTasks" in d)

    # ── Project board: tasks ──────────────────────────────────────────────
    researcher = next((m for m in team if m.get("email") == "researcher@myorg.com"), None)
    t = check("Board: create task", "POST", f"{CORE}/api/projects/{pid}/tasks",
              {"title": "[QA] task", "description": "qa", "priority": "HIGH",
               "dueDate": (dt.date.today() + dt.timedelta(days=3)).isoformat()}, tok=tok, test=lambda d: d.get("id"))
    tid = t["id"]
    check("Board: list tasks", "GET", f"{CORE}/api/projects/{pid}/tasks", tok=tok, test=lambda d: any(x["id"] == tid for x in d))
    for status in ["IN_PROGRESS", "DONE", "ACCEPTED"]:
        check(f"Board: move task -> {status}", "PATCH", f"{CORE}/api/projects/{pid}/tasks/{tid}", {"status": status}, tok=tok,
              test=lambda d, s=status: d.get("status") == s)
    check("Board: edit task title/priority", "PATCH", f"{CORE}/api/projects/{pid}/tasks/{tid}",
          {"title": "[QA] task edited", "priority": "LOW"}, tok=tok, test=lambda d: d["title"] == "[QA] task edited")
    check("Board: filter tasks by status", "GET", f"{CORE}/api/projects/{pid}/tasks?status=ACCEPTED", tok=tok,
          test=lambda d: all(x["status"] == "ACCEPTED" for x in d))
    check("Board: delete task", "DELETE", f"{CORE}/api/projects/{pid}/tasks/{tid}", tok=tok)

    # ── Team & roster ─────────────────────────────────────────────────────
    teams = check("Team: list my research teams", "GET", CORE + "/api/research-teams", tok=tok, test=lambda d: isinstance(d, list))
    if teams and researcher:
        tm = teams[0]["id"]
        members = check("Team: list team members", "GET", f"{CORE}/api/research-teams/{tm}/members", tok=tok,
                        test=lambda d: isinstance(d, list))
        candidate = next((m for m in team if m.get("role") in ("RESEARCHER", "MEMBER", "ROLE_RESEARCHER")
                          and all(x.get("userId") != (m.get("id") or m.get("userId")) for x in members)), None)
        if candidate:
            uid = candidate.get("id") or candidate.get("userId")
            check("Team: add member to team", "POST", f"{CORE}/api/research-teams/{tm}/members",
                  {"userId": uid, "roleInTeam": "MEMBER"}, tok=tok)
            check("Team: remove member again", "DELETE", f"{CORE}/api/research-teams/{tm}/members/{uid}", tok=tok)
        else:
            print("SKIP  Team: add/remove member (every researcher already in first team)")

    # ── Documents (AES-256 encrypted at rest) ─────────────────────────────
    d = check("Documents: create", "POST", f"{CORE}/api/projects/{pid}/documents",
              {"title": "[QA] protocol", "category": "PROTOCOL", "contentEncrypted": "Secret QA content 123"}, tok=tok,
              test=lambda d: d.get("id"))
    if d:
        did = d["id"]
        check("Documents: read back decrypted", "GET", f"{CORE}/api/projects/{pid}/documents/{did}", tok=tok,
              test=lambda x: x.get("contentEncrypted") == "Secret QA content 123")
        check("Documents: edit", "PUT", f"{CORE}/api/projects/{pid}/documents/{did}",
              {"title": "[QA] protocol v2", "category": "PROTOCOL", "contentEncrypted": "Edited"}, tok=tok,
              test=lambda x: x.get("title") == "[QA] protocol v2")
        check("Documents: list for project", "GET", f"{CORE}/api/projects/{pid}/documents", tok=tok,
              test=lambda x: any(y["id"] == did for y in x))
        check("Documents: delete", "DELETE", f"{CORE}/api/projects/{pid}/documents/{did}", tok=tok)

    # ── Resources & booking conflicts ─────────────────────────────────────
    res = check("Resources: list", "GET", CORE + "/api/resources", tok=tok, test=lambda d: len(d) > 0)
    avail = next((r for r in res if r.get("status") == "AVAILABLE"), None)
    check("Resources: maintenance schedule", "GET", CORE + "/api/resources/maintenance", tok=tok, test=lambda d: isinstance(d, list))
    check("Resources: my bookings", "GET", CORE + "/api/resources/bookings/me", tok=tok, test=lambda d: isinstance(d, list))
    if avail:
        start = dt.datetime(2026, 12, 7, 4, 0, tzinfo=dt.timezone.utc)
        slot = {"startTime": start.isoformat(), "endTime": (start + dt.timedelta(hours=1)).isoformat(), "purpose": "[QA] booking"}
        b = check(f"Resources: book '{avail['name'][:20]}' 1h", "POST", f"{CORE}/api/resources/{avail['id']}/bookings", slot, tok=tok,
                  test=lambda d: d.get("id"))
        if b:
            cleanup.insert(0, ("PATCH", f"{CORE}/api/resources/bookings/{b['id']}/status", {"status": "CANCELLED", "reason": "QA cleanup"}))
            check("Resources: same slot again is rejected (no double-booking)", "POST",
                  f"{CORE}/api/resources/{avail['id']}/bookings", slot, tok=tok, expect=(409,))
            check("Resources: list bookings for resource", "GET", f"{CORE}/api/resources/{avail['id']}/bookings", tok=tok,
                  test=lambda d: any(x["id"] == b["id"] for x in d))
            check("Resources: cancel booking", "PATCH", f"{CORE}/api/resources/bookings/{b['id']}/status",
                  {"status": "CANCELLED", "reason": "QA"}, tok=tok, test=lambda d: d.get("status") == "CANCELLED")
            cleanup.pop(0)
        long_slot = {"startTime": start.isoformat(), "endTime": (start + dt.timedelta(hours=200)).isoformat(), "purpose": "[QA] too long"}
        if avail.get("maxDurationHours"):
            check("Resources: over max duration is rejected", "POST", f"{CORE}/api/resources/{avail['id']}/bookings", long_slot, tok=tok,
                  expect=(400, 409, 422))

    # ── Chat (realtime service) ───────────────────────────────────────────
    check("Chat: load message history (realtime service)", "GET", f"{RT}/api/chat/projects/{pid}/messages?page=0&size=20", tok=tok)

    # ── AI summaries ──────────────────────────────────────────────────────
    s = check("AI: summarize a chat (Gemini via context engine)", "POST", CORE + "/api/ai/summarize",
              {"projectId": pid, "messages": [
                  {"senderName": "Lead", "content": "Alex, please finish the latency benchmark by Friday.", "createdAt": "2026-10-10T10:00:00Z"},
                  {"senderName": "Alex", "content": "Sure, I will also write the report draft.", "createdAt": "2026-10-10T10:01:00Z"}]},
              tok=tok, test=lambda d: d.get("summary"))
    check("AI: list saved chat summaries", "GET", CORE + "/api/ai/summaries", tok=tok, test=lambda d: isinstance(d, list))
    a = check("AI Insights: create insight", "POST", CORE + "/api/ai-summaries",
              {"projectId": pid, "topic": "[QA] insight", "summaryText": "QA summary", "actionItems": ["QA item"],
               "keyFindings": ["k"], "deadlineSuggestions": [], "confidence": 90, "model": "qa", "status": "PENDING"},
              tok=tok, test=lambda d: d.get("id"))
    if a:
        cleanup.insert(0, ("DELETE", f"{CORE}/api/ai-summaries/{a['id']}"))
        check("AI Insights: list", "GET", CORE + "/api/ai-summaries", tok=tok, test=lambda d: any(x["id"] == a["id"] for x in d))
        check("AI Insights: approve (status)", "PATCH", f"{CORE}/api/ai-summaries/{a['id']}/status", {"status": "APPROVED"}, tok=tok)
        check("AI Insights: edit action items", "PATCH", f"{CORE}/api/ai-summaries/{a['id']}/action-items",
              {"actionItems": ['{"title":"QA item","approved":true}']}, tok=tok)

    # ── Notifications ─────────────────────────────────────────────────────
    n = check("Notifications: list", "GET", CORE + "/api/notifications", tok=tok, test=lambda d: isinstance(d, list))
    if n:
        nid, was = n[0]["id"], n[0].get("read")
        check("Notifications: toggle read", "PATCH", f"{CORE}/api/notifications/{nid}/read", tok=tok)
        check("Notifications: toggle back", "PATCH", f"{CORE}/api/notifications/{nid}/read", tok=tok)
finally:
    print("\n-- cleanup --")
    for item in cleanup:
        method, url, *body = item
        code, data, _ = call(method, url, body[0] if body else None, tok)
        print(f"  {method} {url.replace(CORE, '')} -> {code}")
    code, data, _ = call("GET", CORE + "/api/projects", tok=tok)
    left = [x["name"] for x in (data or []) if x["name"].startswith("[QA]")]
    print("  leftover [QA] projects:", left or "none")
    passed = sum(1 for ok, _ in results if ok)
    print(f"\nRESULT: {passed}/{len(results)} passed")
    for ok, name in results:
        if not ok: print("  FAILED:", name)
