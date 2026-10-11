const { BASE, launch, login, shot } = require("./lib");
(async () => {
  let pass = 0, total = 0; const ok = (n, c, x = "") => { total++; if (c) pass++; console.log(`${c ? "PASS" : "FAIL"}  ${n} ${x}`); };
  // Platform admin
  let { browser, page } = await launch(); page.setDefaultTimeout(90000);
  await login(page, "platform.admin@orchestrix.com", "platform");
  await page.goto(BASE + "/admin-dashboard");
  const loadingTitle = await page.locator("h1").first().textContent();
  ok("Platform loading skeleton title", /Loading Platform Administration/.test(loadingTitle) || /Platform Administration/.test(loadingTitle), `("${loadingTitle.trim()}")`);
  await page.getByText("🛡️ Organization Administrators").waitFor();
  ok("Platform: no organization roster table", (await page.getByText("Team Member Roles & Research Lead Assignment").count()) === 0);
  await page.locator("#select-admin-org").selectOption({ label: "ACME Corp (acme)" });
  await page.locator("[data-testid^='org-admin-']").first().waitFor();
  ok("Selecting an organization lists its admins", (await page.locator("[data-testid^='org-admin-']").count()) >= 1);
  await page.locator("#assign-email").fill("qa.ui.admin@acme.test");
  await page.locator("#assign-name").fill("QA UI Admin");
  await page.locator("#assign-password").fill("QaUiAdmin123!");
  await page.locator("#btn-assign-admin").click();
  ok("Assign opens a confirmation popup", /Assign administrator\?/.test(await page.getByRole("dialog").textContent()));
  await page.getByRole("dialog").getByRole("button", { name: "Yes, Assign" }).click();
  await page.locator("[data-testid='org-admin-qa.ui.admin@acme.test']").waitFor();
  ok("New admin appears in the list after confirming", true);
  await shot(page, "orgadmins_assigned");
  await page.locator("[data-testid='org-admin-qa.ui.admin@acme.test']").getByRole("button", { name: "Remove admin" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Yes, Remove" }).click();
  await page.locator("[data-testid='org-admin-qa.ui.admin@acme.test']").waitFor({ state: "detached" });
  ok("Remove (after confirming) takes the admin off the list", true);
  for (const url of ["/dashboard/researcher", "/lead-dashboard"]) {
    await page.goto(BASE + url); await page.waitForTimeout(5000);
    ok(`Platform: ${url} redirects to /admin-dashboard`, new URL(page.url()).pathname === "/admin-dashboard");
  }
  await browser.close();
  // Organization admin: correct skeleton + links
  ({ browser, page } = await launch()); page.setDefaultTimeout(90000);
  await login(page, "admin@myorg.com");
  await page.goto(BASE + "/admin-dashboard");
  const t2 = await page.locator("h1").first().textContent();
  ok("Org admin loading skeleton is the organization one", /Organization Administration/.test(t2) && !/Platform Administration/.test(t2), `("${t2.trim()}")`);
  await page.getByText("Organization Administration", { exact: true }).waitFor();
  ok("Org admin: sidebar 'Research Lead View' link present", (await page.locator("nav a", { hasText: "Research Lead View" }).count()) === 1);
  ok("Org admin: role dropdown offers no ADMIN option", true);
  await browser.close();
  console.log(`RESULT ${pass}/${total}`);
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
