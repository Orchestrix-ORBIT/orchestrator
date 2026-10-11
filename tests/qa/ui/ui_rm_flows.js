// Resource Manager browser flows on a disposable [QA] asset. Cleanup is done by api_rm_actions.py's DB cleanup (run after).
const { BASE, launch, login, shot, account } = require("./lib");
const CORE = "http://localhost:8080";
const results = [];

(async () => {
  const { browser, page, log } = await launch();
  page.setDefaultTimeout(90000);
  const loginApi = async (email) => (await fetch(CORE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg" }, body: JSON.stringify({ email, password: account(email).password }) })).json();
  const api = async (tok, method, path, body) => {
    const r = await fetch(CORE + path, { method, headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg", Authorization: "Bearer " + tok }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await r.json(); } catch {}
    return { status: r.status, data };
  };
  const step = async (name, fn) => {
    const t = Date.now(); log.length = 0;
    try { const note = await fn(); results.push(true); console.log(`PASS  ${name.padEnd(46)} ${((Date.now() - t) / 1000).toFixed(1)}s ${note || ""}`); }
    catch (e) { results.push(false); console.log(`FAIL  ${name.padEnd(46)} ${((Date.now() - t) / 1000).toFixed(1)}s ${String(e.message).split("\n")[0].slice(0, 200)}`); await shot(page, "RMFAIL_" + name.replace(/\W+/g, "_")); [...new Set(log)].slice(0, 4).forEach((l) => console.log("      " + l)); }
  };

  const rm = (await loginApi("resource.manager@myorg.com")).token;
  const alex = (await loginApi("researcher.alex@myorg.com")).token;
  const asset = (await api(rm, "POST", "/api/resources", { name: "[QA] UI Asset", type: "EQUIPMENT", description: "QA", metadata: JSON.stringify({ location: "QA Lab", maxDurationHours: 4 }) })).data;
  const mk = async (h) => (await api(alex, "POST", `/api/resources/${asset.id}/bookings`, { startTime: `2026-12-16T0${h}:00:00Z`, endTime: `2026-12-16T0${h + 1}:00:00Z`, purpose: `[QA] UI slot ${h}` })).data;
  const bA = await mk(2), bB = await mk(5);
  console.log(`setup: asset ${asset?.id ? "ok" : "FAILED"}, bookings ${bA?.status}/${bB?.status}`);

  try {
    await step("Login as resource manager", async () => {
      const url = await login(page, "resource.manager@myorg.com");
      if (!url.includes("/resource-dashboard")) throw new Error("landed on " + url);
    });

    await step("Assets: edit asset with the Edit form", async () => {
      await page.goto(BASE + "/resource-dashboard/assets");
      await page.locator(`#btn-edit-asset-${asset.id}`).click();
      await page.getByText("Edit Asset", { exact: true }).waitFor();
      await page.locator("#input-asset-name").fill("[QA] UI Asset (edited)");
      await page.locator("#input-asset-hours").fill("6");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await page.getByText("[QA] UI Asset (edited)").first().waitFor();
      const r = (await api(rm, "GET", `/api/resources/${asset.id}`)).data;
      if (r.name !== "[QA] UI Asset (edited)" || r.maxDurationHours !== 6) throw new Error(`saved as ${r.name} / ${r.maxDurationHours}h`);
      if (!/QA Lab/.test(r.location || "")) throw new Error("location lost: " + r.location);
      return "name + max hours saved, location kept";
    });

    await step("Bookings: Approve a pending request", async () => {
      await page.goto(BASE + "/resource-dashboard/bookings");
      const row = page.locator("tr").filter({ hasText: "[QA] UI Asset (edited)" }).filter({ has: page.getByRole("button", { name: "Approve" }) }).first();
      await row.getByRole("button", { name: "Approve" }).click();
      for (let i = 0; i < 20; i++) {
        const sA = (await api(rm, "GET", `/api/resources/${asset.id}/bookings`)).data.filter((b) => b.status === "APPROVED");
        if (sA.length === 1) return "1 booking APPROVED";
        await page.waitForTimeout(1500);
      }
      throw new Error("no booking approved");
    });

    await step("Bookings: Reject the other request with reason", async () => {
      const row = page.locator("tr").filter({ hasText: "[QA] UI Asset (edited)" }).filter({ has: page.getByRole("button", { name: "Reject" }) }).first();
      await row.getByRole("button", { name: "Reject" }).click();
      await page.getByText("Reject Booking Request").waitFor();
      await page.getByPlaceholder("e.g. Emergency cluster maintenance required...").fill("[QA] slot needed for calibration");
      await page.getByRole("button", { name: "Reject Request" }).click();
      for (let i = 0; i < 20; i++) {
        const list = (await api(rm, "GET", `/api/resources/${asset.id}/bookings`)).data;
        if (list.some((b) => b.status === "REJECTED")) return "1 booking REJECTED";
        await page.waitForTimeout(1500);
      }
      throw new Error("no booking rejected");
    });
    await shot(page, "rm_ui_bookings");

    await step("Maintenance: open form and date-time picker", async () => {
      await page.goto(BASE + "/resource-dashboard/maintenance");
      await page.getByText("+ Schedule Maintenance Window").click();
      await page.getByText("Select date and time").first().click();
      await page.getByRole("grid").first().waitFor();            // calendar month grid
      const days = await page.getByRole("grid").first().locator("button").count();
      await shot(page, "rm_ui_datepicker");
      if (days < 28) throw new Error("calendar shows only " + days + " day buttons");
      await page.getByRole("button", { name: /Apply Date & Time/ }).waitFor();
      return `calendar rendered (${days} day buttons)`;
    });
  } finally {
    console.log(`\nRESULT: ${results.filter(Boolean).length}/${results.length} passed`);
    await browser.close();
  }
})().catch((e) => { console.error("RUN FAILED:", e.message); process.exit(1); });
