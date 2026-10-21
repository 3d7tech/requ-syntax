import { defineConfig } from "tsup";
export default defineConfig({
  entry: { requ: "src/index.ts" },
  format: ["esm", "iife"],
  globalName: "requ",
  platform: "browser",
  dts: true,
  clean: true,
  minify: true,
  noExternal: [/@requstory\//, /elkjs/],
  outExtension: ({ format }) => ({
    js: format === "esm" ? ".esm.js" : ".global.js",
  }),
});
