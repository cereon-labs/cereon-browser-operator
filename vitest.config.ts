import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom gives the content-script DOM helpers a real document to walk.
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/index.ts"],
    },
  },
});
