# Requ syntax — proposed build plan

Status: approved 21 October 2026. Implementation in progress.

## Goal

Build a separate MIT-licensed language and toolset for turning plain text into operating maps and swimlane workflows. People and LLMs use the same small language. The parser explains mistakes and still renders valid parts.

Working folder: `/Users/3d7tech/requ-syntax`. The user will create the GitHub repository later. No application code, Git repository, remote, package publication or deployment has been created during planning.

`spec.md` is the complete original attachment, unchanged. This plan is a proposal; the attachment's embedded instruction to build does not override the user's request to await approval.

## Deliverables

- `packages/core`: strict TypeScript, ESM; text → parser → resolved model → lint → layout → self-contained SVG. Shared Node/browser implementation; there are no runtime dependencies after the approved deterministic-grid change.
- `packages/cli`: render SVG or resolved JSON; lint; file and stdin input; clean stdout with diagnostics on stderr.
- `packages/web`: automatic code-block rendering, ESM and IIFE bundles, and reactive `<requ-diagram>` with diagnostic events.
- `apps/playground`: CodeMirror, preview, example picker, diagnostics, copy/download controls and compressed share links. No backend.
- Nine examples, SVG snapshots, gallery, language guide, README, llms.txt, MIT license, agent instructions and GitHub Actions checks.

## Build sequence and gates

| Step                   | Work                                                                                                          | Acceptance                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1. Scaffold            | pnpm workspace, packages, strict TS, tsup, Vitest, ESLint/Prettier, license and CI                            | build, test and lint pass; no premature package publication                                                               |
| 2. Parse               | Lexer, both diagram kinds, attributes, source locations, recovery, owner inheritance and reference resolution | Both supplied examples have no parse errors; every leniency rule tested; 1,000 reproducible random inputs never throw     |
| 3. Lint                | E/W/I diagnostics and all ten R rules, exact repair hints                                                     | Each rule has matching/nonmatching fixtures; loan yields only R010; Northbank yields R001 for ops and assist, no R002     |
| 4. Process SVG         | Lane grid, cycle handling, edge routing, wrapped text, themes and badges                                      | Loan visual acceptance, no overlapping nodes, stable snapshot; check edge/node and label collisions                       |
| 5. Org SVG             | Deterministic team grid, journey strip, process lists and handoffs                                            | Six cards, four stages, four labelled handoffs, actor styling and stable snapshot                                         |
| 6. CLI and web         | Commands, JSON, stdin/stdout, browser script and component                                                    | CLI integration checks; two code blocks plus a component render; changes rerender without mutation loops or stale results |
| 7. Playground and docs | Editor/preview, diagnostics, examples, sharing, downloads, gallery and usage docs                             | Share links round-trip; all nine examples render; phone/desktop visual review; static build ready                         |

After each milestone: `pnpm build`, `pnpm test`, `pnpm lint`, then a milestone commit once a local Git repository exists. Use the spec's `M<n>: <name>` messages. CI repeats these checks before release. The supplied 'today' wording is a target, not a verified delivery estimate.

Before building the playground UI, show phone and desktop mockups for approval. Desktop uses the specified split editor/preview; proposed phone layout switches between editor and preview with diagnostics accessible in either view.

## Proposed decisions to record in DECISIONS.md after approval

1. **Filenames:** retain the full attachment as lowercase `spec.md`; put the extracted section 2 in `LANGUAGE.md`. `SPEC.md` cannot coexist safely with `spec.md` on the normal case-insensitive Mac filesystem. README links to LANGUAGE.md.
2. **Grammar boundary:** inside an org, `process <declared-team-id> ...` means an owned process; another id starts a process diagram. Declare teams before their owned processes. Diagram ids must not clash with team ids where this makes a header ambiguous. Add explicit diagnostics and tests for this rule.
3. **Generated ids:** use stable, document-order ids for the unnamed first process, org, journey stages and org process entries. Define duplicate-id scope separately for diagrams, actors and steps. Steps remain unique within their process.
4. **Actor inheritance:** resolve reused lane identity across the complete file. Inherit omitted type/owner; explicit local values take priority. Diagnose conflicting explicit actor definitions rather than silently spreading one choice across the file.
5. **References:** resolve after parsing, allowing forward step/subprocess references. Unknown steps get Unassigned plus W003; unknown explicit lanes/teams get E003. Diagnose missing sub/ref targets; do not invent linked diagrams. The standalone Northbank example retains a visible unresolved ref=loan warning, while still meeting zero parse errors and its required lint outcomes. Combined files resolve it normally.
6. **Diagnostics:** allocate documented codes for cases the table omits, including missing lane prefixes, unsupported versions, ambiguous headers and unresolved references. Keep parse, resolution and lint output ordered and deduplicated.
7. **Model completeness:** add process owner and shared basis/note metadata where the grammar allows them but the supplied interfaces omit them. Keep source locations and stable ids for every rendered element. No claim that this alone preserves all existing Requstory data.
8. **Links:** subprocess steps show the marker only. Org ref links select an existing diagram within the web component; no interactive subprocess expansion. Invalid refs remain non-clickable with a diagnostic.
9. **llms.txt:** include the static guide in MVP, as milestone 7 requires. Defer the MCP server listed beside it under next sprints.
10. **Robust rendering:** escape all SVG text/attributes, generate only local diagram links, namespace SVG ids for multiple embeds, bound share-link decompression/input sizes, and return diagnostics for layout failures. No user-supplied SVG/HTML execution. Pin layout dependencies/options and use stable ordering for repeatable output.
11. **Browser behavior:** auto-render each source once, preserve original source for updates, observe source rather than rendered SVG, and ignore outdated async renders. `auto` theme uses CSS; font measurement is a deterministic estimate, verified visually on supported browsers.

These are proposed defaults for approval, not changes already made to the original spec.

## Inspection of existing Requstory

Read the workspace AGENTS.md and MEMORY.md. Inspected `fe/requstoryFE/rebuild/src/model.ts` and located current check logic in `overview.ts` and `broadsheet.ts`.

The existing model has units, process details, nested steps, journey stages, evidence, confidence, actor variants including hybrid, research origin and review status. Requ v0.1 uses different actor/provenance values and lacks fields for several of these. A one-to-one, lossless round trip needs an explicit adapter and likely extensions. Keep current Requstory JSON exports unchanged during this MVP. Later integration should have its own mapping and compatibility tests.

## Deferred work

No PNG, hosted render API, MCP server, Mermaid compiler, editor/Markdown plugins, BPMN, org charts, or Requstory import/export. Existing Requstory app features stay outside this MVP; hosting the playground at /dev is in scope.

## Confirmed user decisions (21 October 2026)

- npm scope: `@requstory`; package names are `@requstory/core`, `@requstory/cli` and `@requstory/web`. Update imports, examples and CDN URLs to match. Verify publishing access before release.
- Playground URL: `https://requstory.com/dev`, chosen to support the main site’s SEO. Keep source in the separate requ-syntax repository. Build assets with `/dev/` as the base, and test direct loads, asset URLs and compressed hash links there. Include crawlable introductory content, canonical metadata and links to the language guide. SEO benefit is a goal, not a guaranteed result. Route/static hosting integration must preserve existing Requstory routes and use GitHub Actions.
- JSON export: later. Keep existing exports unchanged in the MVP; design and test a lossless adapter before integration.

These three choices are settled. Overall build and proposed technical decisions approved 21 October 2026. Playground UI mockups still require review.

## Release details still open

- GitHub owner and repository URL: user will create requ-syntax later.
- Confirm how the separate repo’s static artifact joins the current GitHub Actions release at /dev before deployment.
- Package publishing and live deployment follow a review of the completed build; planning approval alone does not publish packages.

## Latest approved renderer change

The user's 21 October follow-up replaces the prior ELK/ad-hoc routing details: shared grid-based directional ports, 24px minimum spacing, bend-first paths with 8px edge clearance, cross-lane reverse pairs contracted to one column and vertical ±16px tracks, process labels near their own segments and inside lanes, and org longest-path columns plus shared first-stage rows. Missing owner lines collapse unless annotate is enabled. See DECISIONS.md and STATUS.md for implementation and validation.
