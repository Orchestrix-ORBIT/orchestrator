const { BASE, launch, login, shot } = require("./lib");
(async () => {
  const out = [];
  for (const [email, expectAdmin] of [["admin@myorg.com", true], ["lead@myorg.com", false], ["resource.manager@myorg.com", false], ["researcher.alex@myorg.com", false]]) {
    const { browser, page } = await launch(); page.setDefaultTimeout(90000);
    const landed = (await login(page, email)).replace(BASE, "");
    await page.goto(BASE + "/admin-dashboard");
    await page.waitForTimeout(6000);
    const path = new URL(page.url()).pathname;
    const sysAdminLink = await page.locator('a[href="/admin-dashboard"]').count();
    let detail = "";
    if (expectAdmin) {
      await page.getByText("Organization Administration", { exact: true }).waitFor();
      await page.getByText("researcher.alex@myorg.com").waitFor();
      await shot(page, "admin_dashboard");
      detail = "organization roster rendered";
    }
    const ok = expectAdmin ? path === "/admin-dashboard" : path !== "/admin-dashboard" && sysAdminLink === 0;
    out.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${email.padEnd(28)} login->${landed.padEnd(22)} /admin-dashboard -> ${path}  ${expectAdmin ? detail : "(blocked, no admin link)"}`);
    await browser.close();
  }
  console.log(`RESULT ${out.filter(Boolean).length}/${out.length}`);
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
