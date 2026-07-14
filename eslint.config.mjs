import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ship Studio's own bundled plugin code — not ours, not something we can
    // fix, and it fails the lint rules. Without this, `npm run lint` exits 1
    // on a clean checkout and CI is red before we've written a line.
    ".shipstudio/**",
  ]),
]);

export default eslintConfig;
