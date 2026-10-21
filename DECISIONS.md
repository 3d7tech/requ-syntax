# Decisions

The user approved PLAN.md on 21 October 2026. Its proposed technical defaults now apply.
The original spec.md stays unchanged; LANGUAGE.md holds its section 2. Document clarifications here as implemented.
Use @requstory packages. Target https://requstory.com/dev. Requstory JSON adoption comes later.

Parser clarification: org-owned process lines require an already declared team id; other explicit process ids start process diagrams. Forward step/sub/ref references resolve after parsing. Missing sub targets are E006; missing org refs are W005. W004 marks omitted lane prefixes; W006 unsupported versions; W007 conflicting actor metadata; E007 resource limits. E999 is a last-resort parse failure. Limits: 100,000 characters, 2,000 statements. Root process counts as nesting level one. Flow labels in a chain apply to each edge.
Shared metadata is represented on flows/handoffs/stages too. Stage ids, edge ids and org process ids are stable declaration-order ids. Source columns are one-based, end-exclusive. Parse errors skip the current statement; lexing does not interpret arrows/comments inside labels.
