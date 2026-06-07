import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  // The extension itself — strict TypeScript, browser runtime.
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: "readonly",
        __APP_URL__: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  // Build script, demo launcher, reference backends, and the MCP server —
  // plain ESM that runs under Node, not the extension runtime.
  {
    files: ["*.mjs", "scripts/**/*.mjs", "examples/**/*.mjs", "mcp-server/**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  // Keep ESLint out of Prettier's lane (must stay last).
  eslintConfigPrettier,
);
