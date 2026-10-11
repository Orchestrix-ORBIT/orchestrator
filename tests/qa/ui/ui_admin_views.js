const { BASE, launch, login, shot } = require("./lib");
const res = []; const ok = (n, c, x = "") => { res.push(!!c); console.log(`${c ? "PASS" : "FAIL"}  ${n} ${x}`); };
async function signIn(page, tenant, email, pw) {
  await page.goto(BASE + "/"); await page.getByLabel("Organization").fill(tenant);
  await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.locator("#btn-signin").click(); await page.waitForURL((u) => u.pathname !== "/", { timeout: 60000 });
}
(async () => {
  let { browser, page } = await launch(); page.setDefaultTimeout(90000);
  await login(page, "admin@myorg.com"); await page.goto(BASE + "/admin-dashboard");
  await page.getByText("Platform Administration").waitFor();
  ok("Platform view: title 'Platform Administration'", true);
  await page.getByText(/Organization Registry \(\d+\)/).waitFor();
  const reg = await page.getByText(/Organization Registry/).locator("xpath=ancestor::div[2]").textContent();
  ok("Platform view: registry shows user counts", /\d+ users?/.test(reg));
  ok("Platform view: Suspend buttons for other orgs, own org marked", (await page.locator("[id^=btn-tenant-status-]").count()) >= 1 && /Platform org/.test(reg));
  ok("Platform view: provisioning form visible", await page.getByRole("button", { name: /Create Tenant Schema/ }).isVisible());
  ok("Platform view: roster names its org", /Users in My Research Org/.test(await page.locator("body").textContent()));
  await page.locator("[id^=btn-tenant-status-]").first().click();
  ok("Suspend opens confirmation popup", /Suspend organization\?/.test(await page.getByRole("dialog").textContent()));
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await shot(page, "admin_platform_view");
  await browser.close();
  // Organization admin view (temporary acme admin created by the caller)
  ({ browser, page } = await launch()); page.setDefaultTimeout(90000);
  await signIn(page, "acme", "qa.orgadmin@acme.test", "QaOrgAdmin123!");
  ok("Org admin lands on the admin dashboard", new URL(page.url()).pathname === "/admin-dashboard");
  await page.getByText("Organization Administration").waitFor();
  ok("Org view: title 'Organization Administration'", true);
  const body = await page.locator("body").textContent();
  ok("Org view: no organization registry / provisioning", !/Organization Registry/.test(body) && (await page.getByRole("button", { name: /Create Tenant Schema/ }).count()) === 0);
  ok("Org view: shows its own organization", /ACME Corp/.test(body));
  await shot(page, "admin_org_view");
  await browser.close();
  console.log(`RESULT ${res.filter(Boolean).length}/${res.length}`);
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
