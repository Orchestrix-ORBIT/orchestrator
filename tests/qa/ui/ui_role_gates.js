const { BASE, launch, login } = require("./lib");
const cases = {
  "admin@myorg.com":            { home: "/admin-dashboard",      allow: ["/admin-dashboard", "/lead-dashboard", "/resource-dashboard"], deny: [] },
  "lead@myorg.com":             { home: "/lead-dashboard",       allow: ["/lead-dashboard"], deny: ["/admin-dashboard", "/resource-dashboard"] },
  "resource.manager@myorg.com": { home: "/resource-dashboard",   allow: ["/resource-dashboard"], deny: ["/admin-dashboard", "/lead-dashboard"] },
  "researcher.alex@myorg.com":  { home: "/dashboard/researcher", allow: ["/dashboard/researcher"], deny: ["/admin-dashboard", "/lead-dashboard", "/resource-dashboard"] },
};
(async () => {
  let pass = 0, total = 0;
  for (const [email, c] of Object.entries(cases)) {
    const { browser, page } = await launch(); page.setDefaultTimeout(90000);
    const landed = new URL(await login(page, email)).pathname;
    total++; if (landed === c.home) pass++; else console.log(`FAIL ${email} landed on ${landed}, expected ${c.home}`);
    const res = [];
    for (const url of [...c.allow, ...c.deny]) {
      await page.goto(BASE + url); await page.waitForTimeout(5000);
      const at = new URL(page.url()).pathname, allowed = c.allow.includes(url), ok = allowed ? at === url : at !== url;
      total++; if (ok) pass++; res.push(`${url}:${allowed ? "open" : "blocked"}${ok ? "" : "!!(at " + at + ")"}`);
    }
    console.log(`${email.padEnd(28)} login->${landed.padEnd(22)} ${res.join("  ")}`);
    await browser.close();
  }
  console.log(`RESULT ${pass}/${total}`);
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
