import { test, expect } from "@playwright/test";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";

test("admin creates a project in the browser and a member cannot open it", async ({ page, request }) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const tenant = `browser-${suffix}`;
  const password = "BrowserPass123!";
  const bootstrapKey = process.env.TENANT_BOOTSTRAP_KEY;
  if (!bootstrapKey) throw new Error("TENANT_BOOTSTRAP_KEY is required for the isolated browser test");

  const provisioned = await request.post(`${apiUrl}/api/admin/tenants`, {
    headers: { "X-Bootstrap-Key": bootstrapKey, "X-Tenant-ID": "myorg" },
    data: { slug: tenant, name: "Browser test tenant" },
  });
  expect(provisioned.status()).toBe(201);
  const adminEmail = `admin-${suffix}@example.test`;
  const memberEmail = `member-${suffix}@example.test`;
  for (const email of [adminEmail, memberEmail]) {
    const registered = await request.post(`${apiUrl}/api/auth/register`, {
      headers: { "X-Tenant-ID": tenant },
      data: { email, password },
    });
    expect(registered.status()).toBe(201);
  }

  await page.goto("/");
  await page.getByLabel("Organization").fill(tenant);
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(password);
  await page.locator("#btn-signin").click();
  await expect(page).toHaveURL(/\/admin-dashboard$/);

  await page.goto("/lead-dashboard/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.locator("#btn-new-project").click();
  await page.locator("#input-project-name").fill("Browser project");
  await page.locator("#btn-create-project").click();
  await expect(page.getByText("Browser project", { exact: true })).toBeVisible();
  const projectId = (await page.locator('[id^="project-card-"]').first().getAttribute("id"))!.replace("project-card-", "");

  await page.locator("#btn-new-project").click();
  await page.locator("#input-project-name").fill("Shared browser project");
  await page.getByPlaceholder("Search researcher by name or email...").fill(memberEmail);
  await page.getByText(memberEmail, { exact: true }).last().click();
  await page.locator("#btn-create-project").click();
  const sharedCard = page.locator('[id^="project-card-"]').filter({ hasText: "Shared browser project" });
  await expect(sharedCard).toBeVisible();
  const sharedProjectId = (await sharedCard.getAttribute("id"))!.replace("project-card-", "");

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Organization").fill(tenant);
  await page.getByLabel("Email address").fill(memberEmail);
  await page.getByLabel("Password").fill(password);
  await page.locator("#btn-signin").click();
  await expect(page).toHaveURL(/\/dashboard\/researcher$/);
  await page.goto("/admin-dashboard");
  await expect(page).toHaveURL(/\/dashboard\/researcher$/);

  const memberToken = await page.evaluate(() => localStorage.getItem("authToken"));
  const protectedRead = await request.get(`${apiUrl}/api/projects/${projectId}`, {
    headers: { "X-Tenant-ID": tenant, Authorization: `Bearer ${memberToken}` },
  });
  expect(protectedRead.status()).toBe(403);
  const allowedRead = await request.get(`${apiUrl}/api/projects/${sharedProjectId}`, {
    headers: { "X-Tenant-ID": tenant, Authorization: `Bearer ${memberToken}` },
  });
  expect(allowedRead.status()).toBe(200);
});
