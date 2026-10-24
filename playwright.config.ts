import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:3100",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "rm -f data/e2e.db && pnpm build && pnpm start -p 3100",
    env: { HABITS_DB: "data/e2e.db" },
    url: "http://localhost:3100",
  },
});
