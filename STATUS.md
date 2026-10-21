# Build status

Approved 21 October 2026. M1–M6 committed locally.

## Renderer corrections complete

Process items 3–7 and org items 1–6 are implemented. Golden snapshots updated, including annotated Northbank.

Validation: 137 tests across nine files pass; build, lint and strict TypeScript pass. Both ESM/IIFE bundles pass real-browser embed, link/back, source and theme checks. Browser checks find no text collisions in all ten SVG snapshots and verify 8px diamond label padding. Twenty-five geometry regressions cover shared segments, label boxes, 12px straight/bent reverse tracks, decisions, ports, lane sizes, badges, pills, card order and annotation. Tests cover the supplied examples and targeted fixtures, not a proof for every possible graph. Routing has a bounded search and returns an E009 diagnostic if no layout can be found.

## M7 remaining

Nine examples, gallery, README, llms.txt and compressed share-link logic are ready. Playground UI mockups still need to be shown and approved before Vite/CodeMirror UI work. The current playground package contains share-link logic only; its build checks TypeScript. Full playground implementation and /dev artifact remain unfinished.

No remote, package publication or deployment. User will create requ-syntax on GitHub later. Current Requstory application and original spec.md are unchanged.
