# Decisions

The user approved PLAN.md on 21 October 2026. Its proposed technical defaults now apply.
The original spec.md stays unchanged; LANGUAGE.md holds its section 2. Document clarifications here as implemented.
Use @requstory packages. Target https://requstory.com/dev. Requstory JSON adoption comes later.

Parser clarification: org-owned process lines require an already declared team id; other explicit process ids start process diagrams. Forward step/sub/ref references resolve after parsing. Missing sub targets are E006; missing org refs are W005. W004 marks omitted lane prefixes; W006 unsupported versions; W007 conflicting actor metadata; E007 resource limits. E999 is a last-resort parse failure. Limits: 100,000 characters, 2,000 statements. Root process counts as nesting level one. Flow labels in a chain apply to each edge.
Shared metadata is represented on flows/handoffs/stages too. Stage ids, edge ids and org process ids are stable declaration-order ids. Source columns are one-based, end-exclusive. Parse errors skip the current statement; lexing does not interpret arrows/comments inside labels.

## Renderer corrections — 21 October 2026

User explicitly requested process items 3–7 and org items 1–6. These supersede the original fixed lane/node sizes and journey dots.

- Shared orthogonal router chooses facing ports from target direction; distinct decision exits take separate sides. Ports on a side are evenly spaced; inverse pairs use parallel tracks 12px apart, including bends. The router rejects collinear shared segments; perpendicular crossings remain allowed.
- Label rectangles are placed against nodes, other labels and other routes. Stored layout label boxes drive SVG output and geometry tests.
- Lane height is max(96, content + 32), with 16px top/bottom padding. Content includes stacked nodes, their gaps and lane-header text. Diamond size includes label width/height and 8px padding; suggestion badges sit inside nodes.
- Org team rows follow first journey appearance (stage order, then team order within a stage); teams absent from all stages follow in declaration order. ELK retains horizontal layer placement; the shared router uses the final row positions.
- Journey team-name pills use 12px text and matching team-colour borders, with wrapping. Cards use 4px left accents, one-line icon/title headers, and no process section/divider when empty.
- render({annotate:true}) displays muted italic No owner only for ownerless team/agent org actors covered by R001. Default is false. CLI --annotate and web component annotate/auto-render options pass this through.
- Golden snapshots cover all nine examples plus an annotated Northbank variant. Browser tests measure actual text bounds and 8px decision padding. Geometry tests cover shared segments, labels, journey order, compact lanes, straight/bent inverse pairs, directional/spaced ports and badges.
- A parser keyword collision found by the new bank example is fixed: team.review and other keyword-prefixed steps/flows are parsed as step/flow syntax.

## Unified routing and grids — latest user instruction, 21 October 2026

This section supersedes the previous 12px tracks, arbitrary decision-side selection, allowed crossings, ELK horizontal layers and one-team-per-row arrangement.

- Both renderers use the same port plan for placement, sizing and routing. Process lane order chooses top/bottom; same-lane edges face right/left. Org column order chooses right/left; same-column handoffs use top/bottom. All entry sides face their exit side. Decision continuations in the same lane retain right; off-lane branches choose their lane direction, with deterministic unused-side resolution if multiple branches still request the same side.
- Ports on one side use at least 24px spacing. Port collars are reserved before routing so an earlier edge cannot block a later edge. Paths prefer fewer bends, then shorter distance; no two edge segments may cross, coincide or approach closer than 8px. A bounded visibility-grid search handles obstacles; no legal route or label slot returns E009 rather than drawing a rule-breaking path.
- Process cross-lane inverse pairs are contracted for column assignment. Longest-path layering then advances following steps to the next column. The two straight tracks are fixed at centre −16/+16. Their labels sit outside the tracks, one left and one right. Every process label uses a segment-local slot within 16px, wholly inside a lane; label corridors count toward lane content height.
- Org uses no ELK. Longest-path columns run left to right. Stable DFS back edges are ignored only for layering; every edge still renders. First journey stage determines the row group; absent teams follow. Teams share a stage row where columns permit it, with subrows for same-cell collisions or tall cards. Row slots are 160px. Northbank uses five rows; its complete SVG is 1,016px high, including a 216px title/journey area.
- Missing owner lines consume no height unless annotate=true applies to an R001 team/agent. Task/card dimensions come from actual per-side port demand rather than total edge count.
- Core now has zero runtime dependencies; elkjs was removed from its package and lockfile. Golden SVGs were regenerated. The browser bundles are about 38KB minified after dropping ELK (previously about 1.4MB).
- Validation: 171 tests in ten files, strict types/lint/build, real-browser ESM/IIFE checks, text collision and diamond-padding checks. New regressions cover decision sides, 24px ports, reverse alignment and ±16 tracks, label distance/lane boundaries, shared-stage rows, height limits, and zero crossings/8px clearance for all nine examples including loan and Northbank.

## Approved playground — 21 October 2026

Desktop/phone mockups approved. Vite/CodeMirror build uses /dev/ and runs fully in the browser. Source share links use the existing bounded deflate codec; failed clipboard access exposes a manual-copy URL. Clickable diagnostics focus the editor. SVG/download exports use the current render; Markdown uses a fence longer than any source backtick run. The static guide is crawlable without JavaScript.

The source repo is now public; the initial release used an artifact handoff while it was private. The existing frontend release bundles its unchanged passing-CI artifact, with immutable source metadata, to avoid adding cross-repo credentials. FE staging adds dev to the existing page backup/rollback manifest, sitemap and llms.txt. Final deployment and npm publication still follow completed-build review.

## Nonfatal routing — 21 October 2026

Routing difficulty now retries 8px, 4px and 0px edge clearance, then draws an elbow. Crowded ports and labels also recover. W008 identifies affected edges with the requested repair hint; E009 remains for invalid layouts. This supersedes the previous strict-routing failure behavior. The supplied sovereign-rating regression is saved as bond-rating.requ, with the user-confirmed vote → research back-edge. It requires degraded routes; the existing nine examples retain their strict geometry checks.

## Long process spacing — item 2

Longest-path ranks already share independent steps. When the spacious grid would exceed 2,600px, rank centres advance at least 32px and boxes in the same lane retain a 56px gutter. Cross-lane reverse pairs retain one rank/centre. Local connections route first in compact diagrams to avoid blocking them with long feedback edges. The rating regression is 2,599px before the diamond fix; its seven segment intersections do not increase from the item-1 recovery baseline. W008 still marks degraded routing. Smaller examples retain their readable spacing.

## Decision labels — item 3

Diamonds stay between 72 and 96px. Short labels wrap to at most three lines with 8px corner padding. Longer labels use a 72px diamond and text below it; lane content and routing obstacles reserve that text area. External labels have their own class, so browser checks still measure them for collisions while applying diamond containment only to internal text. Port demand cannot enlarge a diamond beyond the cap; crowded ports warn through W008.

## Portable SVG — item 4

`inlineStyles` defaults to false. True resolves the generated styles into explicit SVG attributes with no style block, CSS variables or font requests. Dark is explicit; auto uses light for converters without a colour preference. The SVG includes a painted background and intrinsic scaled height. CLI flag: `--inline-styles`. Future PNG conversion and render services must opt into this mode; neither feature is introduced by this change. All examples/themes and both diagram kinds are covered; light process/dark annotated org exports have separate golden snapshots.
