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

Process edges use directional, spaced ports; inverse edges use parallel tracks 12px apart. Decision exits use different sides. Lanes use content height plus 32px, minimum 96px. Diamonds grow around their labels with 8px padding.

Org journey stages show wrapping team-name pills. Cards read from top to bottom in first journey-appearance order; absent teams go last. Team colours use 4px left accents; empty process sections are hidden.

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
```

Browser tests exercise the actual ESM and IIFE bundles. `PLAYWRIGHT_MODULE` can point to an installed Playwright module when using a bundled runtime. `pnpm exec vitest run -u` updates SVG snapshots; review `pnpm gallery` before committing them.

## Playground and release

Target: `https://requstory.com/dev`. Source stays in this separate repository. UI implementation awaits phone/desktop mockup review; compressed share-link logic is tested. No production route has been changed.

Deployment must use GitHub Actions. The remote repo and handoff of the /dev artifact into Requstory hosting still need setup. Existing Requstory JSON exports stay unchanged; a lossless adapter comes later.
