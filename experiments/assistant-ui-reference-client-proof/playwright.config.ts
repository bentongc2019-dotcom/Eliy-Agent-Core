import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "reports/browser-test-results-ci.json" }]
  ],
  use: {
    baseURL: "http://127.0.0.1:4177",
    browserName: "chromium",
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4177",
    url: "http://127.0.0.1:4177",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  timeout: 45_000,
  expect: {
    timeout: 8_000
  }
});
