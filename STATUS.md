# Build status

Approved 21 October 2026. M1–M6 committed locally.

## Unified routing and grid changes complete

The latest routing request is implemented in both renderers. Shared per-side port planning supplies placement, sizing and routes. Same-side ports are at least 24px apart; edge segments keep 8px clearance and do not cross. Process cross-lane inverse pairs share a column and use vertical tracks at centre ±16px, with separate outer labels. Labels stay within 16px of their own segment and inside a lane. Decision exits differ.

Org uses deterministic longest-path columns and shared first-stage rows, with 160px row slots; no ELK remains. Missing owner lines collapse unless annotation is enabled. Northbank uses five rows and is 1,016px high including the title/journey strip. Same-cell conflicts and tall cards reserve additional grid rows. All handoffs still render, including back edges omitted only from layer assignment.

Validation: 171 tests across ten files pass; build, lint and strict TypeScript pass. Both ESM/IIFE bundles pass real-browser embed, link/back, source and theme checks. All ten golden SVGs pass browser text-bounds and 8px diamond-padding checks. Tests verify zero edge crossings and 8px clearance in all nine examples, including loan and Northbank, plus decision sides, 24px spacing, inverse columns/tracks, label constraints and org height. Tests cover examples and targeted fixtures; an unsatisfiable graph returns an E009 diagnostic rather than violating routing rules.

## M7 playground complete — build review pending

Phone/desktop mockups approved 21 October 2026. Vite/CodeMirror UI now includes live preview, nine examples, clickable diagnostics, diagram/theme selection, optional owner notes, phone Editor/Preview switching, Fit/100% preview, bounded compressed share links, clipboard fallback, SVG copy/download and Markdown copy. Crawlable introduction, guide and canonical URLs use /dev/. CI uploads a checked static artifact with source commit metadata.

Validation: 173 unit/integration tests; build, lint and strict types; ESM/IIFE embeds; all ten SVG text/padding checks; playground browser checks at 1440/390/320px including all nine examples, sub-diagram selection, annotation, zoom, source edits, diagnostic focus, share reload/recovery, clipboard/downloads, escaping and /dev asset paths. npm tarballs are prepared for inspection; publication is gated on completed-build review, scope access and an Actions release tag.

Remote: https://github.com/3d7tech/requ-syntax (main). npm is not signed in locally, so @requstory access remains unverified. No npm publication or production deployment. Passing source CI: https://github.com/3d7tech/requ-syntax/actions/runs/39573360078 at 9b8b13bad36bbf784c4433d55272994777fa766b. Packed core/CLI/web install and render in a clean consumer.

Frontend release integration is ready in draft PR https://github.com/3d7tech/requstoryFE/pull/189. It bundles the unchanged CI artifact at rebuild/playground-release and stages it with the existing page backup/rollback manifest, sitemap and llms.txt. Local FE formatting/types, 91 tests and build pass; the full playground browser suite also passes against the integrated build. Main app JS remains index-DrfYHVOf.js. PR CI is being checked. No app features or original spec changed.

Review locally with pnpm --filter @requstory/playground preview --port 5178, then open http://127.0.0.1:5178/dev/. Completed-build review is required before the paired production Actions release or npm publishing.
