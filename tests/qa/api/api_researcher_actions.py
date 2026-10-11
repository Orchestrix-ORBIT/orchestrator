"""Researcher dashboard actions + permission boundaries. Test data is [QA] and removed; touched real data is restored."""
import json, datetime as dt
import importlib.util, sys, os
spec = importlib.util.spec_from_file_location("lead", os.path.join(os.path.dirname(__file__), "api_lead_actions.py"))
# reuse only the helpers (call/check) without running the lead script
src = open(spec.origin, encoding="utf-8").read().split("acc = {a[")[0]
ns = {"__file__": os.path.join(os.path.dirname(os.path.abspath(__file__)), "api_lead_actions.py")}; exec(src, ns)
call, check, results, CORE, RT, ROOT = ns["call"], ns["check"], ns["results"], ns["CORE"], ns["RT"], ns["ROOT"]
restore = []

acc = {a["email"]: a for a in json.load(open(ROOT + "/.project_notes/test_accounts.json"))}
lead_tok = call("POST", CORE + "/api/auth/login", {"email": "lead@myorg.com", "password": acc["lead@myorg.com"]["password"]})[1]["token"]
a = acc["researcher.alex@myorg.com"]
login = check("Login as researcher (Alex)", "POST", CORE + "/api/auth/login", {"email": a["email"], "password": a["password"]},
              test=lambda d: d.get("role") == "ROLE_RESEARCHER")
tok, me = login["token"], login["userId"]

try:
    mine = check("Projects: list only my projects", "GET", CORE + "/api/projects", tok=tok, test=lambda d: isinstance(d, list) and len(d) > 0)
    all_p = call("GET", CORE + "/api/projects", tok=lead_tok)[1]
    other = next((p for p in all_p if p["id"] not in {m["id"] for m in mine}), None)
    pid = mine[0]["id"]
    check("Projects: open my project", "GET", f"{CORE}/api/projects/{pid}", tok=tok)
    if other:
        check("SECURITY: cannot open a project I'm not in", "GET", f"{CORE}/api/projects/{other['id']}", tok=tok, expect=(403, 404))
        check("SECURITY: cannot read tasks of other project", "GET", f"{CORE}/api/projects/{other['id']}/tasks", tok=tok, expect=(403, 404))
        check("SECURITY: cannot read chat of other project", "GET", f"{RT}/api/chat/projects/{other['id']}/messages?page=0&size=5", tok=tok, expect=(403, 404))
        check("SECURITY: cannot read documents of other project", "GET", f"{CORE}/api/projects/{other['id']}/documents", tok=tok, expect=(403, 404))

    # ── Tasks / Kanban ───────────────────────────────────────────────────
    tasks = check("Tasks: view board of my project", "GET", f"{CORE}/api/projects/{pid}/tasks", tok=tok, test=lambda d: isinstance(d, list))
    own = next((t for t in tasks if t.get("assigneeId") == me and t["status"] in ("TODO", "IN_PROGRESS")), None)
    if own:
        orig = own["status"]; target = "IN_PROGRESS" if orig == "TODO" else "TODO"
        restore.append(("PATCH", f"{CORE}/api/projects/{pid}/tasks/{own['id']}", {"status": orig}, lead_tok))
        check(f"Tasks: move my task {orig} -> {target}", "PATCH", f"{CORE}/api/projects/{pid}/tasks/{own['id']}", {"status": target}, tok=tok,
              test=lambda d: d.get("status") == target)
        check(f"Tasks: move my task -> DONE (submit for review)", "PATCH", f"{CORE}/api/projects/{pid}/tasks/{own['id']}", {"status": "DONE"}, tok=tok,
              test=lambda d: d.get("status") == "DONE")
        check("SECURITY: researcher cannot ACCEPT a task", "PATCH", f"{CORE}/api/projects/{pid}/tasks/{own['id']}", {"status": "ACCEPTED"}, tok=tok, expect=(400, 403))
    else:
        print("SKIP  Tasks: no TODO/IN_PROGRESS task assigned to Alex in", mine[0]["name"])
    ct = check("Tasks: researcher can create a task (SRS FR-TASK-02)", "POST", f"{CORE}/api/projects/{pid}/tasks", {"title": "[QA] researcher task"}, tok=tok, test=lambda d: d.get("id"))
    if ct: restore.insert(0, ("DELETE", f"{CORE}/api/projects/{pid}/tasks/{ct['id']}", None, lead_tok))
    others_task = next((t for t in tasks if t.get("assigneeId") not in (me, None)), None)
    if others_task:
        check("SECURITY: cannot move someone else's task", "PATCH", f"{CORE}/api/projects/{pid}/tasks/{others_task['id']}", {"status": others_task["status"]}, tok=tok, expect=(403,))

    # ── Resources ────────────────────────────────────────────────────────
    res = check("Resources: list", "GET", CORE + "/api/resources", tok=tok, test=lambda d: len(d) > 0)
    check("Resources: my bookings", "GET", CORE + "/api/resources/bookings/me", tok=tok, test=lambda d: isinstance(d, list))
    avail = next((r for r in res if r.get("status") == "AVAILABLE"), None)
    if avail:
        start = dt.datetime(2026, 12, 8, 5, 0, tzinfo=dt.timezone.utc)
        slot = {"startTime": start.isoformat(), "endTime": (start + dt.timedelta(hours=1)).isoformat(), "purpose": "[QA] researcher booking"}
        b = check("Resources: request a booking", "POST", f"{CORE}/api/resources/{avail['id']}/bookings", slot, tok=tok, test=lambda d: d.get("id"))
        if b:
            restore.insert(0, ("PATCH", f"{CORE}/api/resources/bookings/{b['id']}/status", {"status": "CANCELLED", "reason": "QA cleanup"}, lead_tok))
            check("Resources: double booking rejected", "POST", f"{CORE}/api/resources/{avail['id']}/bookings", slot, tok=tok, expect=(409,))
            check("SECURITY: researcher cannot APPROVE own booking", "PATCH", f"{CORE}/api/resources/bookings/{b['id']}/status", {"status": "APPROVED"}, tok=tok, expect=(403,))
            if check("Resources: cancel my booking", "PATCH", f"{CORE}/api/resources/bookings/{b['id']}/status", {"status": "CANCELLED", "reason": "QA"}, tok=tok,
                     test=lambda d: d.get("status") == "CANCELLED"):
                restore.pop(0)
    check("SECURITY: researcher cannot add resources", "POST", CORE + "/api/resources", {"name": "[QA] blocked", "type": "EQUIPMENT"}, tok=tok, expect=(403,))

    # ── Documents ────────────────────────────────────────────────────────
    check("Documents: list my project's documents", "GET", f"{CORE}/api/projects/{pid}/documents", tok=tok, test=lambda d: isinstance(d, list))
    d = check("Documents: create", "POST", f"{CORE}/api/projects/{pid}/documents", {"title": "[QA] notes", "category": "MEETING_MINUTES", "contentEncrypted": "QA content"}, tok=tok, test=lambda x: x.get("id"))
    if d:
        restore.insert(0, ("DELETE", f"{CORE}/api/projects/{pid}/documents/{d['id']}", None, lead_tok))
        check("Documents: edit my document", "PUT", f"{CORE}/api/projects/{pid}/documents/{d['id']}", {"title": "[QA] notes v2", "category": "MEETING_MINUTES", "contentEncrypted": "v2"}, tok=tok,
              test=lambda x: x.get("title") == "[QA] notes v2")
        check("Documents: delete my document", "DELETE", f"{CORE}/api/projects/{pid}/documents/{d['id']}", tok=tok)
        restore.pop(0)

    # ── Chat / AI / Notifications ────────────────────────────────────────
    check("Chat: load my project's history", "GET", f"{RT}/api/chat/projects/{pid}/messages?page=0&size=20", tok=tok)
    check("AI: summarize chat", "POST", CORE + "/api/ai/summarize", {"projectId": pid, "messages": [
        {"senderName": "Alex", "content": "I will send the benchmark results tomorrow.", "createdAt": "2026-10-10T10:00:00Z"}]}, tok=tok, test=lambda x: x.get("summary"))
    check("AI: list my AI summaries", "GET", CORE + "/api/ai-summaries", tok=tok, test=lambda x: isinstance(x, list))
    n = check("Notifications: list", "GET", CORE + "/api/notifications", tok=tok, test=lambda x: isinstance(x, list))
    if n:
        check("Notifications: toggle read", "PATCH", f"{CORE}/api/notifications/{n[0]['id']}/read", tok=tok)
        check("Notifications: toggle back", "PATCH", f"{CORE}/api/notifications/{n[0]['id']}/read", tok=tok)

    # ── Admin-only areas ─────────────────────────────────────────────────
    check("SECURITY: cannot list tenants (admin only)", "GET", CORE + "/api/admin/tenants", tok=tok, expect=(403, 405))
    team = call("GET", CORE + "/api/team", tok=tok)[1] or []
    victim = next((m for m in team if m.get("email") == "guest@myorg.com"), None)
    if victim:
        check("SECURITY: cannot change another user's role", "PATCH", f"{CORE}/api/team/{victim['id']}/role", {"role": "ADMIN"}, tok=tok, expect=(403,))
finally:
    print("\n-- restore / cleanup --")
    for method, url, body, t in restore:
        print(f"  {method} {url.replace(CORE, '')} -> {call(method, url, body, t)[0]}")
    passed = sum(1 for ok, _ in results if ok)
    print(f"\nRESULT: {passed}/{len(results)} passed")
    for ok, name in results:
        if not ok: print("  FAILED:", name)
