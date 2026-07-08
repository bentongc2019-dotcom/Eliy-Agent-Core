import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/runtime/kernel/tests/**/*.test.ts",
      "src/runtime/capabilities/tests/**/*.test.ts",
      "src/runtime/provider/tests/**/*.test.ts",
    ],
    environment: "node"
  }
});
