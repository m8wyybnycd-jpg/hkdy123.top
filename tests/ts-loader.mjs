// Custom ESM loader to resolve .ts extensions for TypeScript files
// Usage: node --import ./tests/ts-loader.mjs --test tests/*.test.ts

import { readFileSync } from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  // Try adding .ts extension for relative imports
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !specifier.includes(".")
  ) {
    try {
      return await nextResolve(specifier + ".ts", context);
    } catch {
      // Fall through to default resolution
    }
  }
  return nextResolve(specifier, context);
}
