const { BASE, launch, login } = require("./lib");
(async () => {
  const { browser, page } = await launch(); page.setDefaultTimeout(90000);
  await login(page, "lead@myorg.com");
  const token = await page.evaluate(() => localStorage.getItem("authToken"));
  const get = () => fetch("http://localhost:8080/api/projects", { headers: { Authorization: "Bearer " + token, "X-Tenant-ID": "myorg" } }).then((r) => r.status);
  console.log("token before sign out ->", await get());
  await page.getByText("Sign Out").first().click();
  await page.getByRole("button", { name: "Yes, Sign Out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.waitForTimeout(2000);
  const s = await get();
  console.log(`after sign out: page=${new URL(page.url()).pathname}, localStorage token=${await page.evaluate(() => localStorage.getItem("authToken"))}, old token -> ${s}`);
  console.log(s === 200 ? "FAIL token still valid" : "PASS sign-out revokes token");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
