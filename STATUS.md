# Build status

Approved 21 October 2026. M1–M6 committed locally.

## Unified routing and grid changes complete

The latest routing request is implemented in both renderers. Shared per-side port planning supplies placement, sizing and routes. Same-side ports are at least 24px apart; edge segments keep 8px clearance and do not cross. Process cross-lane inverse pairs share a column and use vertical tracks at centre ±16px, with separate outer labels. Labels stay within 16px of their own segment and inside a lane. Decision exits differ.

Org uses deterministic longest-path columns and shared first-stage rows, with 160px row slots; no ELK remains. Missing owner lines collapse unless annotation is enabled. Northbank uses five rows and is 1,016px high including the title/journey strip. Same-cell conflicts and tall cards reserve additional grid rows. All handoffs still render, including back edges omitted only from layer assignment.

Validation: 171 tests across ten files pass; build, lint and strict TypeScript pass. Both ESM/IIFE bundles pass real-browser embed, link/back, source and theme checks. All ten golden SVGs pass browser text-bounds and 8px diamond-padding checks. Tests verify zero edge crossings and 8px clearance in all nine examples, including loan and Northbank, plus decision sides, 24px spacing, inverse columns/tracks, label constraints and org height. Tests cover examples and targeted fixtures; an unsatisfiable graph returns an E009 diagnostic rather than violating routing rules.

## M7 remaining

Nine examples, gallery, README, llms.txt and compressed share-link logic are ready. Playground UI mockups still need to be shown and approved before Vite/CodeMirror UI work. The current playground package contains share-link logic only; its build checks TypeScript. Full playground implementation and /dev artifact remain unfinished.

No remote, package publication or deployment. User will create requ-syntax on GitHub later. Current Requstory application and original spec.md are unchanged.
