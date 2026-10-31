import { readFileSync, readdirSync } from "node:fs";
import { Marked, Renderer } from "marked";
import { parse, render } from "@requstory/core";

const root = new URL("../../../", import.meta.url);
export const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const css = `html{color-scheme:light dark;background:light-dark(#fff,#171b20);color:light-dark(#20252b,#e4e8ec)}body{font:16px/1.65 system-ui,sans-serif;max-width:1100px;margin:28px auto;padding:0 20px}a{color:light-dark(#246958,#8dd9c0)}nav{display:flex;gap:20px;flex-wrap:wrap}h1{line-height:1.2}h2{margin-top:36px;font-size:22px}h3{font-size:18px}pre{padding:16px;border:1px solid light-dark(#dce0e5,#3b444e);border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 ui-monospace,monospace}code{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;vertical-align:top;border-bottom:1px solid light-dark(#dce0e5,#3b444e);padding:8px;overflow-wrap:anywhere}table code{white-space:normal}.open{display:inline-block;border:1px solid currentColor;border-radius:6px;padding:9px 14px;text-decoration:none;min-height:44px}.diagram{overflow:auto;margin:20px 0}.diagram svg{display:block;width:100%;height:auto}.source{margin-top:28px}.examples{padding-left:22px}footer{margin:36px 0;color:light-dark(#596572,#abb7c4)}@media(max-width:600px){body{padding:0 16px}table{display:block;overflow-x:auto}h1{font-size:28px}}`;
function page(title: string, path: string, body: string, description: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Requ syntax</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="https://requstory.com/dev/${path}"><style>${css}</style></head><body><nav aria-label="Resources"><a href="/dev/">Playground</a><a href="/dev/guide.html">Language guide</a><a href="/dev/examples/">Examples</a><a href="https://github.com/3d7tech/requ-syntax">GitHub</a></nav><main>${body}</main><footer>Requ syntax · MIT · <a href="/dev/llms.txt">For LLMs</a></footer></body></html>`;
}
/** Kept in examples/ for regression tests only: bond-rating.requ is the same diagram as sovereign-rating.requ. */
export const TEST_ONLY = new Set(["bond-rating.requ"]);

export async function staticSite() {
  const files = new Map<string, string>();
  const language = readFileSync(new URL("LANGUAGE.md", root), "utf8");
  const examples = readdirSync(new URL("examples/", root))
    .filter((name) => name.endsWith(".requ") && !TEST_ONLY.has(name))
    .sort()
    .map((name) => {
      const source = readFileSync(new URL("examples/" + name, root), "utf8");
      return {
        id: name.slice(0, -5),
        source,
        title: parse(source).doc.diagrams[0]?.label ?? name.slice(0, -5),
      };
    });
  const renderer = new Renderer();
  renderer.html = ({ text }) => escape(text);
  renderer.code = ({ text, lang }) => {
    const code = `<pre><code${lang === "requ" ? ' class="language-requ"' : ""}>${escape(text)}</code></pre>`;
    if (lang !== "requ") return code;
    const match = examples.find(
      (example) => example.source.trim() === text.trim(),
    );
    // The guide's two complete examples also have named, static landing pages.
    const id =
      match?.id ??
      (text.includes('process loan "')
        ? "loan-application"
        : text.includes('org "Northbank Retail"')
          ? "northbank-org"
          : null);
    return (
      code +
      (id
        ? `<p><a class="open" href="/dev/?example=${id}">Open in playground</a></p>`
        : "")
    );
  };
  const markdown = new Marked({ renderer, gfm: true });
  files.set(
    "guide.html",
    page(
      "Requ language guide",
      "guide.html",
      await markdown.parse(language),
      "Learn Requ syntax for swimlane workflows, teams, handoffs and customer journeys, with examples you can open in the playground.",
    ),
  );
  files.set("LANGUAGE.md", language);
  const links = examples
    .map(
      (e) => `<li><a href="/dev/examples/${e.id}/">${escape(e.title)}</a></li>`,
    )
    .join("");
  files.set(
    "examples/index.html",
    page(
      "Requ examples",
      "examples/",
      `<h1>Requ examples</h1><p>Rendered diagrams and their complete source. No JavaScript needed.</p><ul class="examples">${links}</ul>`,
      `${examples.length} Requ workflow and operating-map examples with static SVG diagrams and source.`,
    ),
  );
  const urls = [
    "https://requstory.com/dev/",
    "https://requstory.com/dev/guide.html",
    "https://requstory.com/dev/examples/",
  ];
  let hero = "";
  for (const example of examples) {
    const doc = parse(example.source).doc;
    let diagrams = "";
    for (const diagram of doc.diagrams) {
      const result = await render(example.source, {
        diagram: diagram.id,
        theme: "auto",
        showDiagnostics: false,
      });
      const id = result.svg.match(/id="([^"]+)"/)?.[1];
      const svg = id ? result.svg.replaceAll(id, "static-" + id) : result.svg;
      files.set(`examples/${example.id}/${diagram.id}.svg`, svg);
      diagrams += `<section><h2>${escape(diagram.label)}</h2><div class="diagram">${svg}</div><a href="./${diagram.id}.svg">Open SVG at full size</a></section>`;
      if (example.id === "loan-application" && diagram === doc.diagrams[0])
        hero = svg;
    }
    files.set(`examples/${example.id}/source.requ`, example.source);
    const note =
      example.id === "errors-demo"
        ? "<p>This example deliberately contains errors to demonstrate diagnostics and recovery.</p>"
        : "";
    files.set(
      `examples/${example.id}/index.html`,
      page(
        example.title,
        `examples/${example.id}/`,
        `<h1>${escape(example.title)}</h1>${note}<p><a class="open" href="/dev/?example=${example.id}">Open in playground</a></p>${diagrams}<section class="source"><h2>Source</h2><pre><code class="language-requ">${escape(example.source)}</code></pre><a href="./source.requ">Download source</a></section>`,
        `${example.title}: a Requ diagram with rendered SVG, complete source and a link to edit it in the playground.`,
      ),
    );
    urls.push(`https://requstory.com/dev/examples/${example.id}/`);
  }
  const llms = `# Requ syntax\n\n> An open-source language for swimlane workflows and operating maps.\n\nRequ uses one statement per line. Use the language guide to write valid source. Diagrams and source are readable without JavaScript. Requstory exports Requ (a Requ prompt and operating-model.requ from a saved map) and reads a published operating-model.requ on its next website check.\n\n## Documentation\n- [Playground](https://requstory.com/dev/): editor, diagnostics and SVG export.\n- [Language guide](https://requstory.com/dev/guide.html): complete syntax and examples.\n- [Plain-text language guide](https://requstory.com/dev/LANGUAGE.md)\n- [Full LLM reference](https://requstory.com/dev/llms-full.txt): guide and all example source.\n- [Source repository](https://github.com/3d7tech/requ-syntax)\n\n## Examples\n${examples.map((e) => `- [${e.title}](https://requstory.com/dev/examples/${e.id}/): static SVG and complete Requ source.`).join("\n")}\n`;
  files.set("llms.txt", llms);
  files.set(
    "llms-full.txt",
    `${llms}\n${language}\n\n${examples.map((e) => `## ${e.title}\n\n\`\`\`requ\n${e.source.trim()}\n\`\`\``).join("\n\n")}\n`,
  );
  files.set(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`,
  );
  return {
    files,
    examples,
    landing: `<section class="static-examples"><h2>Explore the examples</h2><p>See the diagrams and source without JavaScript.</p><ul>${links}</ul><h3>Retail loan application</h3><div class="static-diagram">${hero}</div><a href="/dev/examples/loan-application/">View full diagram and source</a></section>`,
  };
}
