import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const escape = (value: string) =>
  value.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
  );
export default defineConfig({
  base: "/dev/",
  build: { target: "es2022" },
  plugins: [
    {
      name: "requ-language-guide",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "release.json",
          source: JSON.stringify({
            repository: "3d7tech/requ-syntax",
            sourceCommit:
              process.env.GITHUB_SHA ??
              execFileSync("git", ["rev-parse", "HEAD"], {
                encoding: "utf8",
              }).trim(),
          }),
        });
        const language = readFileSync(
          new URL("../../LANGUAGE.md", import.meta.url),
          "utf8",
        );
        this.emitFile({
          type: "asset",
          fileName: "guide.html",
          source: `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Requ language guide | Requstory</title><link rel="canonical" href="https://requstory.com/dev/guide.html"><style>html{color-scheme:light dark}body{font:16px/1.6 system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 ui-monospace,monospace}a{color:light-dark(#246958,#8dd9c0)}</style><a href="./">← Playground</a><h1>Requ language guide</h1><pre>${escape(language)}</pre></html>`,
        });
        this.emitFile({
          type: "asset",
          fileName: "LANGUAGE.md",
          source: language,
        });
      },
    },
  ],
});
