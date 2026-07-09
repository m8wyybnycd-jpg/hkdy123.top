import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import Critters from "critters";
import path from "node:path";
import fs from "node:fs";

/**
 * Critical CSS inlining plugin (Vite wrapper around `critters`).
 *
 * `critters` exports a class — not a Vite plugin — so we wrap it in a
 * closeBundle hook that runs after all build output is written to disk,
 * giving critters access to the generated CSS files for inlining.
 */
function crittersPlugin(options: ConstructorParameters<typeof Critters>[0] = {}): PluginOption {
  let outDir: string;
  return {
    name: "critters",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const htmlPath = path.join(outDir, "index.html");
      if (!fs.existsSync(htmlPath)) return;
      const html = fs.readFileSync(htmlPath, "utf-8");
      const instance = new Critters({ ...options, path: outDir });
      try {
        const result = await instance.process(html);
        fs.writeFileSync(htmlPath, result);
      } catch {
        // Non-fatal: skip CSS inlining on error
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Critical CSS inlining — inlines above-the-fold CSS into <style> tags
    crittersPlugin({
      preload: "swap",
      pruneSource: false,
    }),
    // Bundle visualizer — generates dist/stats.html on each build
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "router": ["react-router-dom"],
          "seo": ["react-helmet-async"],
        },
      },
    },
  },
});
