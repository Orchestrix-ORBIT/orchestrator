const { BASE, launch, login, shot } = require("./lib");
(async () => {
  const { browser, page, log } = await launch(); page.setDefaultTimeout(90000);
  await login(page, "researcher.alex@myorg.com");
  const token = await page.evaluate(() => localStorage.getItem("authToken"));
  const api = (m, p, b) => fetch("http://localhost:8080" + p, { method: m, headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg", Authorization: "Bearer " + token }, body: b ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }));
  const res = (await api("GET", "/api/resources")).data.find((r) => r.status === "AVAILABLE");
  const b = (await api("POST", `/api/resources/${res.id}/bookings`, { startTime: "2026-12-10T05:00:00Z", endTime: "2026-12-10T06:00:00Z", purpose: "[QA] cancel via UI" })).data;
  console.log("setup booking:", b?.id ? b.status : "FAILED");
  try {
    await page.goto(BASE + "/dashboard/researcher/resources");
    await page.getByRole("button", { name: /My Bookings/ }).click();
    const row = page.locator(`#booking-row-${b.id}`);
    await row.getByRole("button", { name: "Cancel" }).click();
    await row.getByRole("button", { name: "Yes" }).click();
    await row.getByText("CANCELLED").waitFor();
    const after = (await api("GET", "/api/resources/bookings/me")).data.find((x) => x.id === b.id);
    await shot(page, "r_ui_cancelled");
    console.log(after.status === "CANCELLED" ? "PASS  Cancel button -> booking CANCELLED in database" : "FAIL status " + after.status);
  } catch (e) {
    console.log("FAIL", e.message.split("\n")[0]); [...new Set(log)].slice(0, 4).forEach((l) => console.log("  " + l));
    await api("PATCH", `/api/resources/bookings/${b.id}/status`, { status: "CANCELLED", reason: "QA cleanup" });
  }
  await browser.close();
})();
