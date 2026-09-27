import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    headless: true,
    launchOptions: {
      ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),
      args: ["--no-sandbox"],
    },
  },
  reporter: "list",
  timeout: 45000,
});
