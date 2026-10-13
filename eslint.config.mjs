import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Global ignores agar ESLint tidak memindai direktori non-source atau artefak build
  globalIgnores([
    "**/node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    ".git/**",
    "public/**",
    "*.tsbuildinfo",
    "next-env.d.ts",
  ]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
