import { readdir, readFile, writeFile } from "node:fs/promises";
import { render } from "../packages/core/dist/index.js";
const files = (await readdir("examples"))
  .filter((f) => f.endsWith(".requ"))
  .sort();
let html =
  '<!doctype html><meta charset="utf-8"><title>Requ example gallery</title><style>body{font:16px system-ui;margin:32px;background:#f2f4f8;color:#0e1d38}section{margin:32px 0}svg{display:block}pre{white-space:pre-wrap}</style><h1>Requ examples</h1>';
for (const file of files) {
  const { svg, diagnostics } = await render(
    await readFile("examples/" + file, "utf8"),
    { theme: "light" },
  );
  html += `<section><h2>${file}</h2>${svg}<pre>${diagnostics
    .map((d) => `${d.severity} ${d.code}: ${d.message}`)
    .join("\n")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")}</pre></section>`;
}
await writeFile("gallery.html", html);
console.log("Wrote gallery.html with " + files.length + " examples.");
