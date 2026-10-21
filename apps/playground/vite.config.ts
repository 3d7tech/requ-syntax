import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import { staticSite } from "./src/static-site";

export default defineConfig({
  base: "/dev/",
  build: { target: "es2022" },
  plugins: [
    {
      name: "requ-public-documentation",
      async transformIndexHtml(html) {
        const { examples, landing } = await staticSite();
        return html
          .replace(
            "<option>Loading examples…</option>",
            examples
              .map(
                (e) =>
                  `<option value="${e.id}">${e.title.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</option>`,
              )
              .join(""),
          )
          .replace("<!-- static-examples -->", landing);
      },
      async generateBundle() {
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
        const { files } = await staticSite();
        for (const [fileName, source] of files)
          this.emitFile({ type: "asset", fileName, source });
      },
    },
  ],
});
