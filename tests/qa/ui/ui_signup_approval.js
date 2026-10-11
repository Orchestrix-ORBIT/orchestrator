const { BASE, launch, login, shot } = require("./lib");
const EMAIL = "qa.signup@myorg.com", PW = "QaSignup123!";
const results = [];
const ok = (name, cond, extra = "") => { results.push(!!cond); console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${extra}`); };
(async () => {
  // 1. Sign up through the form
  let { browser, page } = await launch(); page.setDefaultTimeout(90000);
  await page.goto(BASE + "/");
  await page.locator("#tab-signup").click();
  await page.locator("#su-tenant").fill("myorg");
  await page.locator("#su-name").fill("QA Signup");
  await page.locator("#su-email").fill("QA.Signup@MyOrg.com");
  await page.locator("#su-password").fill(PW);
  await page.locator("#su-confirm").fill(PW);
  await page.locator("#btn-signup").click();
  const notice = page.locator("#signin-notice");
  await notice.waitFor();
  ok("Sign-up form shows green 'awaiting approval' notice", /administrator must approve/.test(await notice.textContent()));
  await shot(page, "signup_notice");
  // 2. Pending user cannot sign in
  await page.locator("#btn-signin").waitFor();
  await page.getByLabel("Organization").fill("myorg");
  await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.locator("#btn-signin").click();
  const err = page.locator("#signin-error"); await err.waitFor();
  ok("Pending account is refused with a clear message", /not active yet/.test(await err.textContent()), `("${(await err.textContent()).slice(0, 50)}…")`);
  ok("Pending account stays on the login page", new URL(page.url()).pathname === "/");
  await browser.close();
  // 3. Admin approves in the Admin dashboard
  ({ browser, page } = await launch()); page.setDefaultTimeout(90000);
  await login(page, "admin@myorg.com");
  await page.goto(BASE + "/admin-dashboard");
  const row = page.locator("tr").filter({ hasText: EMAIL });
  await row.waitFor();
  ok("Admin roster shows the sign-up as PENDING APPROVAL", /PENDING APPROVAL/.test(await row.textContent()));
  await row.getByRole("button", { name: "Approve" }).click();
  await row.filter({ hasNotText: "PENDING APPROVAL" }).waitFor();
  ok("Approve button activates the account", /ACTIVE/.test(await row.textContent()));
  await shot(page, "admin_approved");
  await browser.close();
  // 4. Approved user signs in (any letter case) and lands on the researcher dashboard
  ({ browser, page } = await launch()); page.setDefaultTimeout(90000);
  await page.goto(BASE + "/");
  await page.getByLabel("Organization").fill("myorg");
  await page.getByLabel("Email address").fill("Qa.SignUp@myorg.com");
  await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.locator("#btn-signin").click();
  await page.waitForURL((u) => u.pathname !== "/", { timeout: 60000 }).catch(() => {});
  ok("Approved user signs in and lands on /dashboard/researcher", new URL(page.url()).pathname === "/dashboard/researcher", `(at ${new URL(page.url()).pathname})`);
  await page.goto(BASE + "/lead-dashboard"); await page.waitForTimeout(4000);
  ok("New MEMBER is blocked from the Lead dashboard", new URL(page.url()).pathname !== "/lead-dashboard");
  await browser.close();
  console.log(`RESULT ${results.filter(Boolean).length}/${results.length}`);
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
