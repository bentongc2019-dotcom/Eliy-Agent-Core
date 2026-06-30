import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/runtime/kernel/tests/**/*.test.ts"],
    environment: "node"
  }
});
