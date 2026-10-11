const { BASE, launch, login, shot } = require("./lib");
(async () => {
  const { browser, page } = await launch(); page.setDefaultTimeout(30000);
  await login(page, "researcher.alex@myorg.com");
  const token = await page.evaluate(() => localStorage.getItem("authToken"));
  const api = (m, p, b) => fetch("http://localhost:8080" + p, { method: m, headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg", Authorization: "Bearer " + token }, body: b ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }));
  let stage = "open page";
  try {
    await page.goto(BASE + "/dashboard/researcher/resources", { timeout: 120000 });
    stage = "click Book Now on an AVAILABLE card";
    const card = page.locator("div").filter({ hasText: "AVAILABLE" }).filter({ has: page.getByRole("button", { name: "Book Now" }) }).last();
    const resName = (await card.locator("h3, h2, strong").first().textContent().catch(() => "?")).trim();
    await card.getByRole("button", { name: "Book Now" }).click();
    await page.getByText("Request Resource Booking").waitFor(); const form = page.locator("form").filter({ has: page.locator('input[type="date"]') }).first();
    stage = "date"; await form.locator('input[type="date"]').fill("2026-12-09");
    stage = "start time"; await form.locator('input[type="time"]').nth(0).fill("09:00");
    stage = "end time"; await form.locator('input[type="time"]').nth(1).fill("10:00");
    stage = "purpose"; await form.getByPlaceholder("e.g. Simulation run batch 4").fill("[QA] UI booking");
    stage = "submit"; await form.getByRole("button", { name: /Confirm Booking/ }).click();
    let b = null;
    for (let i = 0; i < 20 && !b; i++) { await page.waitForTimeout(1500); b = (await api("GET", "/api/resources/bookings/me")).data.find((x) => x.purpose === "[QA] UI booking" && x.status !== "CANCELLED"); }
    await shot(page, "r_ui_booking_done");
    if (!b) throw new Error("booking not saved");
    console.log(`PASS  booked "${b.resourceName}" 2026-12-09 09:00-10:00 -> status ${b.status}`);
    const c = await api("PATCH", `/api/resources/bookings/${b.id}/status`, { status: "CANCELLED", reason: "QA cleanup" });
    console.log(`PASS  researcher cancels own booking -> ${c.status} ${c.data?.status}`);
  } catch (e) {
    await shot(page, "r_ui_booking_fail");
    console.log(`FAIL  at step "${stage}": ${e.message.split("\n")[0]}`);
  }
  await browser.close();
})();
