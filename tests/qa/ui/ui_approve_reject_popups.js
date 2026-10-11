const { BASE, launch, login, shot } = require("./lib");
const reg = (email) => fetch("http://localhost:8080/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg" }, body: JSON.stringify({ email, password: "QaPopup123!", displayName: "QA Popup" }) });
const res = []; const ok = (n, c) => { res.push(!!c); console.log(`${c ? "PASS" : "FAIL"}  ${n}`); };
(async () => {
  await reg("qa.popup.approve@myorg.com"); await reg("qa.popup.reject@myorg.com");
  const { browser, page } = await launch(); page.setDefaultTimeout(90000);
  await login(page, "admin@myorg.com");
  await page.goto(BASE + "/admin-dashboard");
  const rowA = page.locator("tr").filter({ hasText: "qa.popup.approve@myorg.com" });
  const rowR = page.locator("tr").filter({ hasText: "qa.popup.reject@myorg.com" });
  await rowA.waitFor();
  ok("Pending rows show Approve and Reject buttons", (await rowA.getByRole("button", { name: "Approve" }).count()) === 1 && (await rowA.getByRole("button", { name: "Reject" }).count()) === 1);
  // Cancel does nothing
  await rowR.getByRole("button", { name: "Reject" }).click();
  const dialog = page.getByRole("dialog");
  ok("Reject opens a confirmation popup", /Reject sign-up request\?/.test(await dialog.textContent()));
  await shot(page, "popup_reject");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  ok("Cancel closes the popup and keeps the request", (await dialog.count()) === 0 && /PENDING APPROVAL/.test(await rowR.textContent()));
  // Approve
  await rowA.getByRole("button", { name: "Approve" }).click();
  ok("Approve opens a confirmation popup", /Approve account\?/.test(await dialog.textContent()));
  await shot(page, "popup_approve");
  await dialog.getByRole("button", { name: "Yes, Approve" }).click();
  await rowA.filter({ hasNotText: "PENDING APPROVAL" }).waitFor();
  ok("Confirmed approve makes the account ACTIVE", /ACTIVE/.test(await rowA.textContent()));
  // Reject
  await rowR.getByRole("button", { name: "Reject" }).click();
  await dialog.getByRole("button", { name: "Yes, Reject" }).click();
  await rowR.waitFor({ state: "detached" });
  ok("Confirmed reject removes the request from the roster", (await rowR.count()) === 0);
  const r = await fetch("http://localhost:8080/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Tenant-ID": "myorg" }, body: JSON.stringify({ email: "qa.popup.approve@myorg.com", password: "QaPopup123!" }) });
  ok("Approved user can now log in", r.status === 200);
  const again = await reg("qa.popup.reject@myorg.com");
  ok("Rejected person can sign up again later", again.status === 201);
  await browser.close();
  console.log(`RESULT ${res.filter(Boolean).length}/${res.length}`);
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
