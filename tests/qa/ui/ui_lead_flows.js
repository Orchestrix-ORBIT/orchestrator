// Browser test of the main Lead demo flows; every UI step is verified through the API.
const { BASE, launch, login, shot, account } = require("./lib");
const CORE = "http://localhost:8080", RT = "http://localhost:8082";
const results = [];
const T = 120000;

(async () => {
  const { browser, page, log } = await launch();
  page.setDefaultTimeout(T);
  const api = async (method, url, token, body) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await r.json(); } catch {}
    return { status: r.status, data };
  };
  const step = async (name, fn) => {
    const t = Date.now(); log.length = 0;
    try { const note = await fn(); results.push([true, name]); console.log(`PASS  ${name.padEnd(52)} ${((Date.now() - t) / 1000).toFixed(1)}s ${note || ""}`); }
    catch (e) { results.push([false, name]); console.log(`FAIL  ${name.padEnd(52)} ${((Date.now() - t) / 1000).toFixed(1)}s ${String(e.message).split("\n")[0].slice(0, 200)}`); await shot(page, "FAIL_" + name.replace(/\W+/g, "_")); [...new Set(log)].slice(0, 4).forEach((l) => console.log("      " + l)); }
  };
  let token, pid, taskId;
  const pname = "[QA] UI flow " + Date.now().toString().slice(-5);

  try {
    await step("Login through the form", async () => {
      const url = await login(page, "lead@myorg.com");
      if (!url.includes("/lead-dashboard")) throw new Error("landed on " + url);
      token = await page.evaluate(() => localStorage.getItem("authToken"));
    });

    await step("Projects: create project via New Project form", async () => {
      await page.goto(BASE + "/lead-dashboard/projects");
      await page.locator("#btn-new-project").click();
      await page.locator("#input-project-name").fill(pname);
      await page.locator("#input-project-desc").fill("QA browser test");
      await page.locator("#btn-create-project").click();
      await page.getByText(pname, { exact: true }).first().waitFor();
      const r = await api("GET", CORE + "/api/projects", token);
      pid = (r.data || []).find((p) => p.name === pname)?.id;
      if (!pid) throw new Error("project not saved in API");
      return "saved";
    });

    await step("Board: open project and create task card", async () => {
      await page.goto(`${BASE}/lead-dashboard/projects/${pid}`);
      await page.getByText("+ New Task").first().click();
      await page.getByPlaceholder("e.g. Implement AES-256 session token exchange").fill("[QA] UI task");
      await page.getByPlaceholder("Acceptance criteria, technical notes...").fill("created by QA");
      await page.getByRole("button", { name: /Create Card/ }).click();
      await page.locator('[draggable="true"]', { hasText: "[QA] UI task" }).first().waitFor();
      const r = await api("GET", `${CORE}/api/projects/${pid}/tasks`, token);
      taskId = (r.data || []).find((t) => t.title === "[QA] UI task")?.id;
      if (!taskId) throw new Error("task not saved in API");
      return "saved as TODO";
    });

    await step("Board: drag card To Do -> In Progress", async () => {
      const card = page.locator('[draggable="true"]', { hasText: "[QA] UI task" }).first();
      const column = page.locator("div").filter({ has: page.getByText("In Progress", { exact: true }) }).filter({ hasNot: page.getByText("To Do", { exact: true }) }).last();
      await card.dragTo(column);
      const confirm = page.getByRole("button", { name: /Confirm|Move|Yes/ });
      if (await confirm.first().isVisible({ timeout: 2000 }).catch(() => false)) await confirm.first().click();
      for (let i = 0; i < 20; i++) {
        const r = await api("GET", `${CORE}/api/projects/${pid}/tasks/${taskId}`, token);
        if (r.data?.status === "IN_PROGRESS") return "API status = IN_PROGRESS";
        await page.waitForTimeout(1500);
      }
      throw new Error("status did not change after drag");
    });
    await shot(page, "ui_board_after_drag");

    await step("Chat: send message in project channel", async () => {
      await page.goto(BASE + "/lead-dashboard/chat");
      await page.getByText(pname).first().click();
      const input = page.getByPlaceholder(/^Message #/);
      await input.waitFor();
      await page.waitForFunction(() => { const b = [...document.querySelectorAll("button[type=submit]")].find((x) => x.textContent.trim() === "Send"); return b; });
      await input.fill("[QA] hello from the browser test");
      await page.getByRole("button", { name: "Send" }).click({ trial: false }).catch(async () => { await input.press("Enter"); });
      for (let i = 0; i < 20; i++) {
        const r = await api("GET", `${RT}/api/chat/projects/${pid}/messages?page=0&size=20`, token);
        const list = Array.isArray(r.data) ? r.data : r.data?.content || [];
        if (list.some((m) => m.content === "[QA] hello from the browser test")) return "stored in realtime service";
        await page.waitForTimeout(1500);
      }
      throw new Error("message not found in chat history");
    });
    await shot(page, "ui_chat_after_send");

    await step("Sign out revokes the session token", async () => {
      await page.getByText("Sign Out").first().click();
      await page.waitForURL((u) => u.pathname === "/", { timeout: 30000 });
      await page.waitForTimeout(2000);
      const r = await api("GET", CORE + "/api/projects", token);
      if (r.status === 200) throw new Error("old token still accepted");
      return `old token -> HTTP ${r.status}`;
    });
  } finally {
    // Cleanup with a fresh login (the UI token was revoked)
    const acc = account("lead@myorg.com");
    const l = await fetch(CORE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg" }, body: JSON.stringify({ email: acc.email, password: acc.password }) }).then((r) => r.json());
    const all = await api("GET", CORE + "/api/projects", l.token);
    for (const p of (all.data || []).filter((p) => p.name.startsWith("[QA]"))) console.log(`cleanup: delete ${p.name} -> ${(await api("DELETE", `${CORE}/api/projects/${p.id}`, l.token)).status}`);
    console.log(`\nRESULT: ${results.filter((r) => r[0]).length}/${results.length} passed`);
    await browser.close();
  }
})().catch((e) => { console.error("RUN FAILED:", e.message); process.exit(1); });
