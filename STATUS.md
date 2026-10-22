# Build status

Approved 21 October 2026. M1–M6 committed locally.

## Unified routing and grid changes complete

The latest routing request is implemented in both renderers. Shared per-side port planning supplies placement, sizing and routes. Same-side ports are at least 24px apart; edge segments keep 8px clearance and do not cross. Process cross-lane inverse pairs share a column and use vertical tracks at centre ±16px, with separate outer labels. Labels stay within 16px of their own segment and inside a lane. Decision exits differ.

Org uses deterministic longest-path columns and shared first-stage rows, with 160px row slots; no ELK remains. Missing owner lines collapse unless annotation is enabled. Northbank uses five rows and is 1,016px high including the title/journey strip. Same-cell conflicts and tall cards reserve additional grid rows. All handoffs still render, including back edges omitted only from layer assignment.

Validation: 171 tests across ten files pass; build, lint and strict TypeScript pass. Both ESM/IIFE bundles pass real-browser embed, link/back, source and theme checks. All ten golden SVGs pass browser text-bounds and 8px diamond-padding checks. Tests verify zero edge crossings and 8px clearance in all nine examples, including loan and Northbank, plus decision sides, 24px spacing, inverse columns/tracks, label constraints and org height. Tests cover examples and targeted fixtures; an unsatisfiable graph returns an E009 diagnostic rather than violating routing rules.

## M7 complete — playground live

Phone/desktop mockups approved 21 October 2026. Vite/CodeMirror UI now includes live preview, nine examples, clickable diagnostics, diagram/theme selection, optional owner notes, phone Editor/Preview switching, Fit/100% preview, bounded compressed share links, clipboard fallback, SVG copy/download and Markdown copy. Crawlable introduction, guide and canonical URLs use /dev/. CI uploads a checked static artifact with source commit metadata.

Validation: 173 unit/integration tests; build, lint and strict types; ESM/IIFE embeds; all ten SVG text/padding checks; playground browser checks at 1440/390/320px including all nine examples, sub-diagram selection, annotation, zoom, source edits, diagnostic focus, share reload/recovery, clipboard/downloads, escaping and /dev asset paths. npm tarballs are prepared for inspection; publication is gated on completed-build review, scope access and an Actions release tag.

Remote: https://github.com/3d7tech/requ-syntax (main). npm is not signed in locally, so @requstory access remains unverified. No npm publication. Playground promoted to production on 21 October after user approval. Passing source CI: https://github.com/3d7tech/requ-syntax/actions/runs/39573360078 at 9b8b13bad36bbf784c4433d55272994777fa766b. Packed core/CLI/web install and render in a clean consumer.

Frontend release integration is ready in draft PR https://github.com/3d7tech/requstoryFE/pull/189. It bundles the unchanged CI artifact at rebuild/playground-release and stages it with the existing page backup/rollback manifest, sitemap and llms.txt. Local FE formatting/types, 91 tests and build pass; the full playground browser suite also passes against the integrated build. Main app JS remains index-DrfYHVOf.js. PR CI passed and PR #189 was squash-merged to FE commit 3c56277c9171fc2aee6292115b7a9aab1cd8e2a5. No app features or original spec changed.

Review locally with pnpm --filter @requstory/playground preview --port 5178, then open http://127.0.0.1:5178/dev/. Website release approved and completed: https://requstory.com/dev/. Release first-draft-20261021-requ-syntax; FE staging 39574936276 and BE publication 39575245580 passed. Live playground browser checks pass at 1440/390/320px; all six live artifact files match the checked source build, including source SHA, guide, CSS and JS. /dev redirect, sitemap and llms entries are verified. Main app checks pass on phone and desktop. Rollback target: first-draft-20261020-landing-line. npm access is still unverified; no packages published.

## Public launch fixes — live 21 October 2026

GitHub and raw README verified in a fresh logged-out browser. Repository metadata/topics set. History pattern scan found no matching secrets or sensitive filenames across 175 unique history blobs at audit time; no private agent-binding roadmap references or issues found. Original spec remains intact.

Proper Markdown guide, playable examples, nine static SVG/source pages, main-page static loan SVG, llms.txt/full reference and sitemap are live. Show gaps, Copy for AI (prompt + full guide + current source) and Open in Requstory are added. The latter opens the mapper; import is deferred.

Source 8750777841df365e77a95fd4126bd1762c22eeee; syntax CI 39582199833 passed 175 tests and all browser checks. FE PR #190/CI 39582977535, staging 39596543305 and BE publish 39596747429 passed. Release first-draft-20261021-requ-public-docs. Live JavaScript-disabled guide/all nine examples and all 38 artifact files verified; root sitemap/llms entries and phone/desktop main app checks pass. Main app asset remains index-DrfYHVOf.js.

## Renderer recovery — item 1 complete

Routing retries 8/4/0px then an elbow; crowded ports and labels recover with W008. The new sovereign debt rating example includes vote → research (“more analysis”), renders all 26 edges and no E009. Before this fix it returned the error SVG; recovered layout width is 4,336px before compaction. Original nine examples keep their strict routing checks. Build, 195 tests and lint pass.

## Renderer compaction — item 2 complete

Long grids now compact physical column gaps while preserving predecessor ranks, independent same-rank steps and aligned cross-lane reverse pairs. Rating width: 4,336 → 2,599px. Its recovered segment-intersection count stays at seven, with no shared segments; W008 remains visible. All original example geometry checks pass. Build, 197 tests and lint pass.

## Decision sizing — item 3 complete

Decision diamonds are capped at 96px. Long labels move below a 72px diamond with reserved lane and routing space. Build, 208 tests and lint pass. All eleven golden SVGs pass browser text collision and internal diamond padding checks.

## Portable SVG — item 4 complete

Core inlineStyles and CLI --inline-styles export concrete colours, fonts and strokes without CSS. Auto uses light; dark is supported explicitly. All examples render without E009, every diamond is ≤96px, rating width is 2,500px and its recovered segment-intersection count remains seven (three W008 warnings). The ten-example gallery and golden SVGs are regenerated. CairoSVG produced visible PNGs for all eleven diagrams. Build, 245 unit/integration tests, lint, ESM/IIFE embeds, browser text/padding checks and playground checks at 1440/390/320px pass. Changes are awaiting deployment review; npm still needs a publishing token.

## Rating regressions and R011–R013 complete

Added sovereign-rating.requ and the unchanged original Grok regression fixture. Both render all 21 steps (26/25 flows respectively) without E009 at 2,500px wide. Added R011 end-has-outflow (warning), R012 unmarked-branch (info) and R013 decision-label (info), with source locations and repair hints. The original source is kept intact rather than silently fixing its workflow or owners.

Build, 277 tests, lint/types, ESM/IIFE embeds, twelve browser SVG text/padding checks and the eleven-example playground at 1440/390/320px pass. Updated the language guide, static examples, golden snapshot and gallery. Local addition to the existing fix set; no push, deployment or npm publication.

## npm packages published — 21 October 2026

@requstory/core, @requstory/cli and @requstory/web 0.1.1 are published (latest). Earlier "no npm publication" notes above are superseded. A clean install of 0.1.1 lints, renders and exports inline-style SVG. The 0.1.0 CLI and web packages declared a `workspace:*` dependency and fail to install (EUNSUPPORTEDPROTOCOL); the README now pins 0.1.1.

Deprecated on 22 October 2026: cli and web 0.1.0 ("Broken install; use 0.1.1") and the core, cli and web 0.0.0-stage placeholders ("Placeholder; use 0.1.1"). Core 0.1.0 installs correctly and is not deprecated. Verified against the registry; latest remains 0.1.1 for all three.
