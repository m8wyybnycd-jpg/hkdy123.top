import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

// Flat config for ESLint 9. The repo previously had NO eslint config at all, so the
// CI Lint step errored on "no config found" and was masked by `continue-on-error`
// (a vacuous green, same root cause as the old vitest test gate). This makes lint real.
//
// Rule strategy: enable real bug-catchers, but turn OFF the stylistic rules that would
// surface hundreds of noise errors on an existing codebase already guarded by
// `tsc --noEmit` (the hard type-safety gate). Style cleanup is a separate follow-up.

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-electron/**",
      "release/**",
      "build/**",
      ".workbuddy/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
    },
    rules: {
      // ── TypeScript-aware rules ──
      ...tseslint.configs.recommended.rules,
      // Turn off intentional/legacy patterns so lint catches real issues, not style:
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/no-empty-object-type": "off", // type-only cosmetic; don't touch definitions
      "@typescript-eslint/ban-ts-usage": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Dead-code quality signal (correctness is already enforced by tsc --noEmit).
      // Keep at "warn" for now; promote to "error" after a cleanup pass.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],

      // ── React Hooks ──
      "react-hooks/rules-of-hooks": "error", // real bug-catcher: hooks order
      "react-hooks/exhaustive-deps": "warn", // surfaces missing deps in useEffect etc.

      // ── Base eslint:recommended overlaps ──
      "no-undef": "off", // TS handles undefined-global detection
      "no-unused-vars": "off", // superseded by @typescript-eslint version above
      "no-empty": "off", // allow empty blocks guarded by comments
      "no-console": "off", // dev logging is intentional in places
      "prefer-const": "warn",
      "no-debugger": "warn",
    },
  },
  {
    // Config / build scripts: node context, relax further
    files: ["*.config.{ts,js,cjs,mjs}", "vite.config.ts", "vitest.config.*"],
    languageOptions: {
      globals: {
        process: "readonly",
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
        console: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
