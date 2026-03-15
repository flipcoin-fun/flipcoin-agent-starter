import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 15_000, // fetching OpenAPI spec may be slow
  },
});
