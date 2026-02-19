/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "@repo/eslint-config/index.js", // Keep the Monorepo shared config
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // Ensure these paths match your actual files in apps/functions
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/lib/**/*", 
    "/generated/**/*",
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "object-curly-spacing": ["error", "always"], // Recommended for readability
  },
};