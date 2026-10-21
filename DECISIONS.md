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
