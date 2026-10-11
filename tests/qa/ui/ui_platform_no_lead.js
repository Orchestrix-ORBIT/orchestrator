const { BASE, launch, login, shot } = require("./lib");
(async () => {
  let pass = 0, total = 0; const ok = (n, c, x = "") => { total++; if (c) pass++; console.log(`${c ? "PASS" : "FAIL"}  ${n} ${x}`); };
  // Platform admin
  let { browser, page } = await launch(); page.setDefaultTimeout(90000);
  await login(page, "platform.admin@orchestrix.com", "platform");
  await page.goto(BASE + "/admin-dashboard"); await page.getByText("Platform Administration", { exact: true }).waitFor();
  await page.getByText(/Organization Registry/).waitFor(); await page.waitForTimeout(1500);
  const body = await page.locator("body").textContent();
  ok("Platform: no 'Switch to Research Lead View' button", (await page.getByText(/Switch to Research Lead View/).count()) === 0);
  ok("Platform: no 'Research Lead View' sidebar link", (await page.getByRole("link", { name: /Research Lead View/ }).count()) === 0);
  ok("Platform: stat cards show TOTAL USERS + SUSPENDED ORGANIZATIONS", /TOTAL USERS/.test(body) && /SUSPENDED ORGANIZATIONS/.test(body) && !/RESEARCH LEADS/.test(body));
  await shot(page, "platform_no_lead");
  for (const url of ["/lead-dashboard", "/resource-dashboard", "/dashboard/researcher"]) {
    await page.goto(BASE + url); await page.waitForTimeout(5000);
    ok(`Platform: ${url} redirects to /admin-dashboard`, new URL(page.url()).pathname === "/admin-dashboard", `(at ${new URL(page.url()).pathname})`);
  }
  await browser.close();
  // Organization admin (myorg) keeps the Lead view
  ({ browser, page } = await launch()); page.setDefaultTimeout(90000);
  await login(page, "admin@myorg.com");
  await page.goto(BASE + "/admin-dashboard"); await page.getByText("Organization Administration", { exact: true }).waitFor();
  ok("myorg admin: 'Switch to Research Lead View' button shown", (await page.getByText(/Switch to Research Lead View/).count()) === 1);
  ok("myorg admin: 'Research Lead View' sidebar link shown", (await page.getByRole("link", { name: /Research Lead View/ }).count()) === 1);
  await page.goto(BASE + "/lead-dashboard"); await page.waitForTimeout(5000);
  ok("myorg admin: can open /lead-dashboard", new URL(page.url()).pathname === "/lead-dashboard");
  await browser.close();
  console.log(`RESULT ${pass}/${total}`);
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
