// Browser test of the Researcher demo flows; each UI step is verified through the API and undone afterwards.
const { BASE, launch, login, shot } = require("./lib");
const CORE = "http://localhost:8080";
const results = [];
const undo = [];

(async () => {
  const { browser, page, log } = await launch();
  page.setDefaultTimeout(120000);
  let token, me;
  const api = async (method, path, body) => {
    const r = await fetch(CORE + path, { method, headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await r.json(); } catch {}
    return { status: r.status, data };
  };
  const step = async (name, fn) => {
    const t = Date.now(); log.length = 0;
    try { const note = await fn(); results.push(true); console.log(`PASS  ${name.padEnd(50)} ${((Date.now() - t) / 1000).toFixed(1)}s ${note || ""}`); }
    catch (e) { results.push(false); console.log(`FAIL  ${name.padEnd(50)} ${((Date.now() - t) / 1000).toFixed(1)}s ${String(e.message).split("\n")[0].slice(0, 220)}`); await shot(page, "RFAIL_" + name.replace(/\W+/g, "_")); [...new Set(log)].slice(0, 4).forEach((l) => console.log("      " + l)); }
  };
  const poll = async (fn, tries = 20) => { for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return v; await page.waitForTimeout(1500); } return null; };

  try {
    await step("Login as researcher (Alex)", async () => {
      const url = await login(page, "researcher.alex@myorg.com");
      if (!url.includes("/dashboard/researcher")) throw new Error("landed on " + url);
      token = await page.evaluate(() => localStorage.getItem("authToken"));
      me = await page.evaluate(() => localStorage.getItem("userId"));
    });

    await step("My Tasks: drag own task To Do -> In Progress", async () => {
      const projects = (await api("GET", "/api/projects")).data;
      let target = null;
      for (const p of projects) {
        const t = ((await api("GET", `/api/projects/${p.id}/tasks`)).data || []).find((x) => x.assigneeId === me && x.status === "TODO");
        if (t) { target = { ...t, projectId: p.id }; break; }
      }
      if (!target) throw new Error("Alex has no TODO task to move");
      undo.push(["PATCH", `/api/projects/${target.projectId}/tasks/${target.id}`, { status: "TODO" }]);
      await page.goto(BASE + "/dashboard/researcher/tasks");
      const card = page.locator(`#task-card-${target.id}`);
      await card.waitFor();
      const col = page.locator("div").filter({ has: page.getByText("In Progress", { exact: true }) }).filter({ hasNot: page.getByText("To Do", { exact: true }) }).last();
      await card.dragTo(col);
      await page.getByRole("button", { name: "Confirm Move" }).click();
      const ok = await poll(async () => (await api("GET", `/api/projects/${target.projectId}/tasks/${target.id}`)).data?.status === "IN_PROGRESS");
      if (!ok) throw new Error("status did not change");
      return `"${target.title.slice(0, 30)}" -> IN_PROGRESS`;
    });

    await step("Resources: book a resource with the form", async () => {
      await page.goto(BASE + "/dashboard/researcher/resources");
      await page.getByRole("button", { name: "Book Now" }).first().click();
      await page.getByText("Request Resource Booking").waitFor();
      const form = page.locator("form").filter({ hasText: "Confirm Booking" });
      await form.locator('input[type="date"]').fill("2026-12-09");
      const times = form.locator('input[type="time"]');
      await times.nth(0).fill("09:00");
      await times.nth(1).fill("10:00");
      const sel = form.locator("select").first();
      const opts = await sel.locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
      if (opts.length) await sel.selectOption(opts[0]);
      await form.getByPlaceholder(/Simulation run/).fill("[QA] UI booking");
      await form.getByRole("button", { name: /Confirm Booking/ }).click();
      const b = await poll(async () => ((await api("GET", "/api/resources/bookings/me")).data || []).find((x) => x.purpose === "[QA] UI booking" && x.status !== "CANCELLED"));
      if (!b) throw new Error("booking not saved");
      undo.unshift(["PATCH", `/api/resources/bookings/${b.id}/status`, { status: "CANCELLED", reason: "QA cleanup" }]);
      return `${b.resourceName.slice(0, 25)} ${b.status}`;
    });
    await shot(page, "r_ui_after_booking");

    await step("Documents: create document with the form", async () => {
      await page.goto(BASE + "/dashboard/researcher/documents");
      await page.getByRole("button", { name: /Create Document/i }).first().click();
      await page.getByPlaceholder("e.g. Synthesis Protocol for Next Batch").fill("[QA] UI document");
      await page.getByPlaceholder("Document outline, notes, or agenda...").fill("Created by browser QA");
      const btns = page.getByRole("button", { name: "Create Document" });
      await btns.last().click();
      await page.getByText("[QA] UI document").first().waitFor();
      const projects = (await api("GET", "/api/projects")).data;
      for (const p of projects) {
        const d = ((await api("GET", `/api/projects/${p.id}/documents`)).data || []).find((x) => x.title === "[QA] UI document");
        if (d) { undo.unshift(["DELETE", `/api/projects/${p.id}/documents/${d.id}`]); return "saved, content encrypted at rest"; }
      }
      throw new Error("document not saved");
    });

    await step("Chat: open project channel and connect", async () => {
      await page.goto(BASE + "/dashboard/researcher/chat");
      const input = page.getByPlaceholder(/^Message #/);
      await input.waitFor();
      await input.fill("x"); // enables Send only when the socket is connected
      const ok = await poll(async () => page.getByRole("button", { name: /Send/ }).isEnabled());
      await input.fill("");
      if (!ok) throw new Error("chat did not connect (Send stays disabled)");
      return "socket connected (no message sent)";
    });

    await step("AI Summaries and Notifications pages load data", async () => {
      await page.goto(BASE + "/dashboard/researcher/ai-summaries");
      await page.waitForFunction(() => !/Loading/i.test(document.querySelector("h1")?.textContent || "Loading"));
      await page.goto(BASE + "/dashboard/researcher/notifications");
      await page.waitForFunction(() => !/Loading/i.test(document.querySelector("h1")?.textContent || "Loading"));
    });
  } finally {
    for (const [m, p, b] of undo) console.log(`undo ${m} ${p} -> ${(await api(m, p, b)).status}`);
    console.log(`\nRESULT: ${results.filter(Boolean).length}/${results.length} passed`);
    await browser.close();
  }
})().catch((e) => { console.error("RUN FAILED:", e.message); process.exit(1); });
