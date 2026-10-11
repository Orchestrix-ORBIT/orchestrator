// Shared helpers for the browser QA runs (Playwright from the frontend's node_modules, installed Chrome).
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..", "..", ".."); // repo root
const { chromium } = require(path.join(ROOT, "frontend/orchestrix_orbit_frontend/node_modules/@playwright/test"));

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });

function account(email) {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, ".project_notes/test_accounts.json"), "utf8"));
  const a = all.find((x) => x.email === email);
  if (!a) throw new Error("no test account " + email);
  return a;
}

async function launch() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const log = [];
  page.on("console", (m) => { if (m.type() === "error") log.push(`console: ${m.text().slice(0, 220)}`); });
  page.on("pageerror", (e) => log.push(`CRASH: ${String(e.message).slice(0, 220)}`));
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && /:(8080|8082|8083)\//.test(u)) log.push(`HTTP ${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, "")}`);
  });
  page.on("requestfailed", (r) => { if (/:(8080|8082|8083)\//.test(r.url())) log.push(`NETFAIL ${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, "")} ${r.failure()?.errorText}`); });
  return { browser, page, log };
}

async function login(page, email, tenant = "myorg") {
  const a = account(email);
  await page.goto(BASE + "/");
  await page.getByLabel("Organization").fill(tenant);
  await page.getByLabel("Email address").fill(a.email);
  await page.getByLabel("Password", { exact: true }).fill(a.password);
  await page.locator("#btn-signin").click();
  await page.waitForURL((u) => !u.pathname.endsWith("/") || u.pathname.length > 1, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  return page.url();
}

async function shot(page, name) {
  const f = path.join(OUT, name + ".png");
  await page.screenshot({ path: f, fullPage: false });
  return f;
}

module.exports = { BASE, launch, login, shot, account, OUT };
