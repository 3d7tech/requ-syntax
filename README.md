# Requ syntax

Text-to-diagram tools for operating models and swimlane workflows. MIT licensed.

![Retail loan workflow](examples/__snapshots__/loan-application.svg)

## Local quick start

Requires Node 20+ and pnpm. Packages are built locally; they have not been published.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm lint
pnpm requ render examples/loan-application.requ -o loan.svg
pnpm requ render examples/loan-application.requ --json
pnpm requ lint examples/loan-application.requ
cat examples/loan-application.requ | pnpm --silent requ render - > loan.svg
pnpm gallery
pnpm dev
```

Open gallery.html to inspect every example. errors-demo intentionally contains errors.
CLI diagnostics go to stderr. Lint and render exit 1 for errors, 0 for warnings/info; valid parts still render.

## Packages

- `@requstory/core`: `parse(text)`, `lint(doc)`, async `render(text, options)`; DOM-free.
- `@requstory/cli`: `requ render` and `requ lint`.
- `@requstory/web`: browser auto-render and `<requ-diagram>`; bundled ESM/IIFE.

```ts
import { render } from "@requstory/core";
const { svg, diagnostics } = await render(source, {
  theme: "auto",
  diagram: "loan",
});
```

For a host that serves the local build, load `/path/to/requ.esm.js`, then call `requ.run()`:

```html
<pre class="requ">
process "Refund"
lane support "Support" owner="Support lead"
support.receive: "Receive request" start</pre
>
<script type="module">
  import requ from "/path/to/requ.esm.js";
  requ.run();
</script>
<requ-diagram theme="auto">process "Another diagram"</requ-diagram>
```

The IIFE is `requ.global.js` and exposes `window.requ.run()`. Versioned npm/CDN URLs will be documented after publication. Escape literal HTML when placing user source in HTML; use textContent when setting it through JavaScript.

Components rerender on source, theme or diagram changes and emit bubbling `requ-diagnostics` events whose detail is the diagnostic array. Resolved org refs open the target process with a Back button; subprocess steps show a marker only.

## Renderer options

`render(source, {annotate: true})` adds muted italic “No owner” to org teams/agents with R001. Default is false. The CLI accepts `--annotate`; browser auto-render accepts `{annotate:true}` and the component uses an `annotate` attribute.

Both renderers use one grid-based port plan. Process edges face the target lane: top for above, bottom for below, right/left within a lane. Org handoffs use right/left across columns and top/bottom within a column. Ports on the same side are at least 24px apart. Decision branches leave from different sides; same-lane continuation keeps right. Routing prefers fewer bends and enforces 8px clearance between edge segments.

Cross-lane reverse pairs share a process column and use straight vertical tracks at −16px/+16px from centre, with separate labels on the outer sides. Following steps use the next layer. Process labels stay within their lane and within 16px of their own segment. Lanes retain content-based height and task boxes only grow for actual port demand.

Org columns use longest-path layers over handoffs, with DFS back edges omitted only during layer assignment. Every handoff still renders. Rows group teams by their first journey stage; absent teams follow. Same-cell collisions and unusually tall cards reserve additional 160px grid rows. Team-name pills wrap, empty process sections stay hidden and missing owner lines collapse unless annotation is enabled. Core no longer needs ELK or any other runtime dependency.

## Language and limits

See [LANGUAGE.md](LANGUAGE.md) for syntax, [spec.md](spec.md) for the original build brief, [DECISIONS.md](DECISIONS.md) for clarifications and [STATUS.md](STATUS.md) for progress.

Parsing/rendering returns diagnostics instead of throwing. Limit each file to 100,000 characters and 2,000 statements. Subprocess nesting includes the root and is limited to five levels. Share links additionally cap UTF-8 bytes and decompressed data at 100,000. They keep source in the URL hash; do not share private source unintentionally.

SVG uses deterministic layout, approximate font measurements, inline styles and no external fonts/images. `basis=suggested` is visible as a dashed border and question badge. Warnings never block rendering. Browser embeds namespace SVG ids; raw core SVG stays byte-identical for the same input/options.

## Development checks

```sh
pnpm build
pnpm test
pnpm lint
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:visual
pnpm test:playground
```

Browser tests exercise the actual ESM and IIFE bundles. `PLAYWRIGHT_MODULE` can point to an installed Playwright module when using a bundled runtime. `pnpm exec vitest run -u` updates SVG snapshots; review `pnpm gallery` before committing them.

## Playground and release

Live: https://requstory.com/dev/. Run `pnpm dev` to open the CodeMirror playground. It includes all nine examples, live SVG preview, clickable diagnostics, diagram/theme selection, owner annotation, phone Editor/Preview controls, 100%/Fit view, compressed share links, Copy SVG, Download SVG and Copy Markdown. The Vite build is `apps/playground/dist`, with `/dev/` asset paths and a crawlable guide. The playground is live at `/dev/`; the existing app routes are preserved.

Deployment uses GitHub Actions and a reviewed CI artifact in the existing paired Requstory release. See [DEPLOYMENT.md](DEPLOYMENT.md). A manual npm workflow requires a reviewed release tag with passing CI and an NPM_TOKEN in the npm-release environment; scope access must be verified before use. Existing Requstory JSON exports stay unchanged; a lossless adapter comes later.
