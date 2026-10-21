# Requ Syntax — MVP Build Spec for Codex

Oct 21, 2026 · @Richard Awe

## 1. Mission and scope

Build Requ syntax: an open-source, text-based diagram language (like Mermaid) for operating models and workflow designs. An LLM or a person writes a fenced `requ` block, and it renders in place as an SVG. The MVP ships today as a TypeScript monorepo with a parser, linter, renderer, CLI, browser auto-render script and a playground.

**Why it exists.** Mermaid has no native swimlanes and no concept of teams, handoffs, customer journeys or AI-agent actors. Requ fills that gap with a small, forgiving language that LLMs write reliably. It is the open format behind Requstory maps.

**MVP goal (end of today).** Paste the example below into the playground and see a clean swimlane diagram, with lint warnings listed underneath. The same text renders via `requ render file.requ -o out.svg` and via a `<script>` tag on any web page.

**In scope for the MVP**

- Two diagram kinds: `process` (swimlane workflow) and `org` (operating map of teams, handoffs and the customer journey).
- Four actor types for lanes and teams: `customer`, `team`, `agent`, `external`.
- A parser that never throws and returns diagnostics with line and column.
- Lint rules ported from Requstory's model checks.
- Deterministic SVG output that works in Node and the browser, with light and dark themes.
- CLI, browser auto-render, `<requ-diagram>` web component and a playground with share links.

**Out of scope for the MVP** (planned later)

- PNG output, render-by-URL service, Mermaid fallback compiler, MCP server, editor plugins (VS Code, Obsidian), markdown-it/remark plugins.
- Interactive drill-down into sub-processes. The MVP renders a sub-process marker only.
- Org charts, headcount and BPMN import/export.

**License:** MIT. **Repo name:** `requ-syntax`. **npm scope:** `@requ` (check availability before publishing; fall back to `@requstory`).

## 2. Language spec v0.1

Requ is line-based: one statement per line, indentation ignored, `#` starts a comment. This keeps it robust when an LLM gets whitespace wrong. A file holds one or more diagrams; each starts with a `process` or `org` header line.

### Lexical rules

- **Identifiers:** `[a-z][a-z0-9_]*`. Case-insensitive on input, normalised to lowercase.
- **Labels:** double-quoted strings, with `\"` as the escape. A bare word after an id is also accepted as a label.
- **Attributes:** `key=value` pairs after the label. Values with spaces are quoted. Unknown keys produce a warning, not an error.
- **Arrows:** `->` only. Chains are allowed: `a -> b -> c`.
- **Edge labels:** `: "text"` at the end of a flow or handoff line.
- **Optional version line:** `requ 0.1` as the first line.
- **Markdown fence language:** `requ`.

### Shared attributes

| Attribute | Applies to | Values | Rendering |
| --- | --- | --- | --- |
| `type` | lane, team | `customer`, `team` (default), `agent`, `external` | Colour and icon per actor type |
| `owner` | lane, team, process | quoted name | Shown under the label |
| `basis` | any element | `website`, `research`, `suggested`, `confirmed` | `suggested` draws a dashed border and a small `?` badge |
| `note` | any element | quoted text | Tooltip (`<title>`) in SVG |
| `system` | step | quoted name, e.g. `"Salesforce"` | Small tag under the step label |

The `basis` values match Requstory's provenance labels, so maps round-trip without losing whether a line came from the website or was confirmed by the team.

### Process diagrams (swimlane workflow)

| Statement | Syntax | Meaning |
| --- | --- | --- |
| Header | `process <id>? "<title>"` | Starts a process diagram. The id is optional for the first process. |
| Lane | `lane <id> "<label>" type=<actor> owner="…"` | A horizontal swimlane. Order of declaration = order top to bottom. |
| Step | `<laneId>.<stepId>: "<label>" <kind>? attrs` | A step placed in a lane. |
| Flow | `<stepId> -> <stepId> (-> …)* : "label"?` | A sequence-flow arrow. |

Step kinds (a bare keyword after the label): `task` (default), `start`, `end`, `decision`, `wait`. A step can point to a sub-process with `sub=<processId>`; sub-processes may nest up to 5 levels.

Example — the MVP acceptance diagram:

```requ
requ 0.1
process loan "Retail loan application"

lane customer "Customer" type=customer
lane branch "Branch lending team" type=team owner="Head of Lending"
lane scorer "Credit scoring agent" type=agent
lane bureau "Credit bureau" type=external

customer.apply: "Submit application" start
branch.kyc: "Verify identity" sub=kyc system="Onfido"
scorer.score: "Score credit risk"
bureau.report: "Return credit report"
branch.decide: "Approve?" decision
customer.sign: "Sign loan offer" end
branch.decline: "Send decline letter" end basis=suggested

apply -> kyc -> score
score -> report : "request report"
report -> score : "report"
score -> decide
decide -> sign : "yes"
decide -> decline : "no"

process kyc "KYC checks"
lane branch "Branch lending team"
lane idv "ID verification provider" type=external
branch.collect: "Collect documents" start
idv.verify: "Verify documents"
branch.record: "Record result" end
collect -> verify -> record
```

Step ids are unique within a process, so flows reference steps without the lane prefix. A lane id reused across processes refers to the same actor.

### Org diagrams (operating map)

| Statement | Syntax | Meaning |
| --- | --- | --- |
| Header | `org "<title>"` | Starts an operating map. One per file. |
| Team | `team <id> "<label>" type=<actor> owner="…"` | A team, agent or outside party. |
| Process | `process <teamId> "<label>" ref=<processId>?` | A process owned by a team. `ref` links to a process diagram in the same file. |
| Handoff | `handoff <teamId> -> <teamId> : "what is handed over"` | Work moving between teams. |
| Journey stage | `stage "<label>" : <teamId>, <teamId>` | A customer-journey stage and the teams that touch it. Order of declaration = journey order. |

Example:

```requ
org "Northbank Retail"

team marketing "Marketing" owner="CMO"
team lending "Lending" owner="Head of Lending"
team ops "Loan operations"
team assist "Support agent" type=agent
team support "Customer support" owner="Support lead"
team bureau "Credit bureau" type=external

process lending "Loan origination" ref=loan
process lending "Credit decisions"
process ops "Loan funding"
process assist "Answer account questions"

handoff marketing -> lending : "Qualified lead"
handoff lending -> ops : "Approved loan"
handoff lending -> bureau : "Credit check request"
handoff assist -> support : "Escalated query"

stage "Discover" : marketing
stage "Apply" : lending, assist
stage "Get funds" : ops
stage "Get help" : assist, support
```

### Leniency rules (important for LLM output)

- Accept `-->`, `=>` and `→` as `->`, with an info diagnostic.
- Accept single quotes and smart quotes as label delimiters.
- A flow that references an undeclared step creates it in an auto lane called `Unassigned`, with a warning.
- A step line without a lane prefix goes to the last declared lane, with a warning.
- Duplicate ids: the second wins, with a warning.
- Unknown statements are skipped with an error diagnostic; parsing continues on the next line.

## 3. Architecture and repo layout

The pipeline is pure and DOM-free: text → parse → model → lint → layout → SVG string. Every stage runs identically in Node and the browser, so the CLI, the browser script and a future render service share one code path.

### Tech stack

- TypeScript (strict), ESM only, Node 20+.
- pnpm workspaces; `tsup` for builds; `vitest` for tests; ESLint + Prettier.
- Parser: hand-written, line-based recursive descent. No parser generator; Langium can come later if we need an LSP.
- Layout: a custom lane-grid layout for `process`; `elkjs` (layered algorithm) for `org`.
- Playground: Vite + CodeMirror 6.
- No other runtime dependencies in `@requ/core`.

### Repo layout

```text
requ-syntax/
  packages/
    core/            # @requ/core: lexer, parser, model, lint, layout, svg renderer, public API
      src/
        lexer.ts
        parser.ts
        model.ts       # types + AST → model resolution
        lint/          # one file per rule
        layout/
          process.ts   # lane-grid layout
          org.ts       # elkjs wrapper
          text.ts      # deterministic text measurement + wrapping
        render/
          svg.ts
          theme.ts
        index.ts
      test/
    cli/             # @requ/cli: `requ render`, `requ lint`
    web/             # @requ/web: auto-render script + <requ-diagram> web component
  apps/
    playground/      # Vite app
  examples/          # *.requ files, also used as golden tests
  SPEC.md            # the language spec (section 2 of this doc)
  llms.txt           # short spec + 3 examples, for LLMs
  AGENTS.md          # build/test commands for coding agents
  LICENSE            # MIT
```

### Public API (`@requ/core`)

```ts
export function parse(text: string): ParseResult;          // never throws
export function lint(doc: RequDocument): Diagnostic[];
export async function render(
  text: string,
  opts?: RenderOptions
): Promise<{ svg: string; diagnostics: Diagnostic[] }>;   // never throws

export interface RenderOptions {
  theme?: 'light' | 'dark' | 'auto';  // auto = CSS prefers-color-scheme inside the SVG
  diagram?: string;                    // id of the diagram to render; default = first
  showDiagnostics?: boolean;           // draw an error banner inside the SVG; default true
  maxWidth?: number;
}
```

### Data model

```ts
type ActorType = 'customer' | 'team' | 'agent' | 'external';
type Basis = 'website' | 'research' | 'suggested' | 'confirmed';
type StepKind = 'task' | 'start' | 'end' | 'decision' | 'wait';

interface Loc { line: number; col: number; endCol: number }

interface Common { id: string; label: string; basis?: Basis; note?: string; loc: Loc }

interface Lane extends Common { type: ActorType; owner?: string }
interface Step extends Common { lane: string; kind: StepKind; sub?: string; system?: string }
interface Flow { from: string; to: string; label?: string; loc: Loc }

interface ProcessDiagram extends Common {
  kind: 'process'; lanes: Lane[]; steps: Step[]; flows: Flow[];
}

interface Team extends Common { type: ActorType; owner?: string; processes: OrgProcess[] }
interface OrgProcess extends Common { team: string; ref?: string }
interface Handoff { from: string; to: string; label?: string; loc: Loc }
interface Stage { label: string; teams: string[]; loc: Loc }

interface OrgDiagram extends Common {
  kind: 'org'; teams: Team[]; handoffs: Handoff[]; journey: Stage[];
}

interface RequDocument { version?: string; diagrams: (ProcessDiagram | OrgDiagram)[] }

interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;      // e.g. 'E001', 'R002'
  message: string;   // plain English
  hint?: string;     // how to fix, written for an LLM to act on
  loc?: Loc;
}

interface ParseResult { doc: RequDocument; diagnostics: Diagnostic[] }
```

The model is also the JSON interchange format. `requ render --json` prints it, and Requstory's JSON export should map onto it one-to-one.

## 4. Lint rules and error handling

Linting is Requ's differentiator: no other diagram language tells you that a team has no owner or a decision has only one branch. Rules port Requstory's model checks and add process-level checks. Each rule is one file in `packages/core/src/lint/`, with its own tests.

### Parse errors (always on)

| Code | Severity | Trigger |
| --- | --- | --- |
| E001 | error | Unknown statement; the line is skipped |
| E002 | error | Unclosed quote |
| E003 | error | Flow or handoff references an unknown lane or team |
| E004 | error | Sub-process cycle, or nesting deeper than 5 levels |
| E005 | error | No `process` or `org` header found |
| W001 | warning | Duplicate id (second wins) |
| W002 | warning | Unknown attribute or attribute value |
| W003 | warning | Undeclared step auto-created in `Unassigned` lane |
| I001 | info | Non-standard arrow normalised to `->` |

### Model checks (lint)

| Code | Applies to | Severity | Rule |
| --- | --- | --- | --- |
| R001 missing-owner | org team of type `team` or `agent`; process lane of type `team` (a reused lane id inherits its owner) | warning | Team has no `owner` |
| R002 isolated-team | org | warning | Team has no handoff in or out |
| R003 unlabelled-handoff | org | info | Handoff has no label describing what moves |
| R004 no-start | process | warning | No step marked `start` |
| R005 unreachable-step | process | warning | Step cannot be reached from any `start` |
| R006 dead-end | process | warning | Non-`end` step has no outgoing flow |
| R007 weak-decision | process | warning | Decision has fewer than 2 outgoing flows, or unlabelled branches |
| R008 empty-lane | process | info | Lane has no steps |
| R009 agent-no-handback | process | info | A path goes from an `agent` step to an `end` step with no `team` or `customer` step in between |
| R010 unconfirmed | any | info | Element has `basis=suggested` (count shown once per diagram, not per element) |

R009 is aimed at AI-agent workflows: it flags where an agent's output reaches the end of a process without a person reviewing it. It is info-level because that may be intended.

### Error-handling principles

- `parse()` and `render()` never throw. Garbage input returns an empty document plus diagnostics.
- Render whatever parsed. With errors, the SVG still draws valid parts and shows a red banner at the top listing the first 3 errors with line numbers.
- Every diagnostic message is one plain sentence. Every `hint` says exactly what to change, e.g. `Add owner="…" to team ops on line 5`. LLMs will read these to self-correct.
- Lint never blocks rendering. Warnings and infos appear only in the CLI output, the playground panel and the `diagnostics` array, never in the SVG.

## 5. Rendering

Output is one self-contained SVG string: inline styles, no external fonts or images, deterministic for the same input. Same input must produce byte-identical output, so golden tests work.

### Process layout (custom lane grid)

Generic graph layouts handle swimlanes badly, so the MVP uses a simple, predictable grid.

1. **Lanes** are horizontal bands in declaration order. Each band has a fixed left header (160 px) with the lane label, owner and actor icon.
2. **Columns:** remove cycles by reversing DFS back-edges, then assign each step a column using longest-path layering from `start` steps. Steps with no incoming flows start at column 0.
3. **Cells:** a step sits at (column, lane). If two steps share a cell, stack them vertically and grow that lane's height.
4. **Compaction:** shift a step left to the earliest free column that is still after all its predecessors.
5. **Edges:** orthogonal routing. Same lane: straight horizontal line. Cross-lane: horizontal–vertical–horizontal with the vertical segment in the gap between columns. Back-edges route above the source lane with a rounded loop.
6. **Edge labels** sit at the midpoint of the longest segment, on a background-coloured pill so they stay legible.
7. **Sizes:** step box 140 × 56 px, decision diamond 72 px, start/end as rounded pills, column gap 48 px, lane padding 16 px.

### Org layout (elkjs)

1. **Journey strip** across the top: stages as chevrons in order. Under each chevron, small coloured dots link to the teams that touch that stage.
2. **Team cards** below, laid out by elkjs `layered`, direction `RIGHT`, with handoffs as edges. Each card shows label, owner and actor icon, plus a list of its processes (max 6; then "+N more").
3. **Handoffs** are labelled arrows with ELK's orthogonal routing.
4. A process with `ref=` gets a small link icon; in the web component it becomes a link to that process diagram.

### Text measurement

There is no DOM in Node, so measure text with a built-in character-width table for a system sans-serif stack (`Inter, system-ui, sans-serif`), at an average of 0.56 em per character with wider values for capitals and `m`/`w`. Wrap labels to at most 3 lines and truncate with an ellipsis after that, keeping the full text in `<title>`.

### Visual language

| Actor type | Fill (light) | Border | Icon | Extra |
| --- | --- | --- | --- | --- |
| `customer` | soft teal | teal | person | — |
| `team` | white | Requstory navy `#0e1d38` | people | — |
| `agent` | soft violet | violet | spark | "AI" badge on the lane header and on each step |
| `external` | light grey | grey, dashed | building | — |

- `basis=suggested`: dashed border on the element and a small `?` badge.
- `sub=`: a ⊞ marker in the step's bottom-right corner.
- `system=`: a small grey tag under the step label.
- Theme colours are CSS variables on the SVG root. `theme: 'auto'` adds a `prefers-color-scheme: dark` block so one SVG works on light and dark pages.
- Every element gets `data-requ-id` and `class="requ-<kind>"` attributes, so hosts can style or wire up interactions later.

## 6. Distribution

A new syntax only renders where a host runs it, so distribution matters as much as the language. Today ships the first four surfaces; the rest follow in the next sprints.

### Ships today

**CLI (`@requ/cli`)**

```bash
requ render loan.requ -o loan.svg [--theme light|dark|auto] [--diagram kyc]
requ render loan.requ --json          # print the resolved model
requ lint loan.requ                   # diagnostics; exit 1 on errors, 0 otherwise
cat loan.requ | requ render - > loan.svg   # stdin/stdout
```

Diagnostics print as `loan.requ:12:3 warning R006 dead-end: …` followed by the hint, the same format as ESLint.

**Browser auto-render (`@requ/web`)** — one script tag, Mermaid-style:

```html
<script type="module">
  import requ from 'https://cdn.jsdelivr.net/npm/@requ/web@0.1.0/dist/requ.esm.js';
  requ.run();  // renders every pre.requ and code.language-requ on the page
</script>
```

`requ.run({ selector, theme })` replaces each matched block with the SVG. It also ships an IIFE build exposing `window.requ`.

**Web component**

```html
<requ-diagram theme="auto">
process "Refund"
lane cs "Support" 
cs.a: "Receive request" start
</requ-diagram>
```

It re-renders when its text content changes and fires a `requ-diagnostics` event with the diagnostics array.

**Playground (`apps/playground`)**

- Split view: CodeMirror editor on the left, live SVG on the right, diagnostics panel below. Re-render on input, debounced 150 ms.
- Example picker loading every file in `/examples`.
- Share link: the source is deflate-compressed and base64url-encoded into the URL hash (`#r=…`), so no backend is needed.
- Buttons: copy SVG, download SVG, copy markdown fence.
- Deploy as a static site (e.g. `play.requ.dev` or a GitHub Pages fallback).

### Next sprints (do not build today)

| Surface | What it gives | Notes |
| --- | --- | --- |
| Render-by-URL service | `![](https://requ.dev/svg/<encoded>)` works in any markdown that shows images | Same hash encoding as the playground; Cloudflare Worker; cache by hash |
| PNG output | Images for Slack, email, slides | `@resvg/resvg-js` in CLI and service |
| `llms.txt` + MCP server | Agents write and render Requ natively | MCP tools: `render_requ`, `lint_requ`, `get_spec` |
| Mermaid fallback | `requ to-mermaid` emits a flowchart with lane subgraphs | Degraded rendering where only Mermaid exists |
| Markdown plugins | `remark-requ`, `markdown-it-requ`, Docusaurus | Build-time SVG |
| Editor plugins | VS Code preview + diagnostics, Obsidian | Reuses `@requ/core` |
| Mermaid external diagram | Renders inside existing Mermaid integrations that allow plugins | Investigate Mermaid's external-diagram API |
| Requstory import/export | Requstory maps open as Requ and back | Maps onto the shared JSON model |

## 7. Build order, acceptance criteria and Codex instructions

Build in seven milestones, committing and running tests after each. Each milestone must leave the repo green (`pnpm build && pnpm test && pnpm lint` pass).

| # | Milestone | Done when |
| --- | --- | --- |
| 1 | Scaffold | pnpm monorepo, tsup, vitest, ESLint, Prettier, MIT LICENSE, AGENTS.md, CI workflow (GitHub Actions: install, build, test on Node 20). |
| 2 | Lexer + parser | Both section 2 examples parse into the data model with zero errors. Each leniency rule has a test. Fuzz test: 1,000 random strings never throw. |
| 3 | Lint | Every rule in section 4 has one passing and one failing fixture. The loan example yields exactly one diagnostic, R010. R009 must not fire because `decide` is a team step; R001 must not fire because the `branch` lane in `kyc` inherits its owner. |
| 4 | Process layout + SVG | Loan example renders: 4 lanes in order, no overlapping boxes, back-edge `report -> score` routed as a loop, decision diamond with yes/no labels, agent lane with "AI" badge, dashed `decline` step, ⊞ on `kyc`. Golden SVG snapshot committed. |
| 5 | Org layout + SVG | Northbank example renders: 4-stage journey strip, 6 team cards, 4 labelled handoffs, `bureau` dashed, `assist` with AI badge. R001 fires for `ops` and `assist`; R002 fires for none. Golden snapshot committed. |
| 6 | CLI + web | All CLI commands in section 6 work. A test HTML page with two `pre.requ` blocks and one `<requ-diagram>` renders all three. |
| 7 | Playground + docs | Playground runs locally with examples, diagnostics panel and share links. README with a hero image (render of the loan example), quick start and link to SPEC.md. `llms.txt` written. |

### Example files to create in `/examples`

`loan-application.requ` and `northbank-org.requ` (section 2), plus: `customer-refund.requ`, `employee-onboarding.requ`, `invoice-approval-with-agent.requ`, `support-triage-agent.requ`, `saas-company-org.requ`, `bank-account-opening.requ`, `errors-demo.requ` (deliberately broken, to show diagnostics). Every example except `errors-demo` must parse with zero errors.

### Testing

- Unit tests per parser statement and per lint rule.
- Golden tests: every example renders to `examples/__snapshots__/<name>.svg`; update with `pnpm test -u`.
- Determinism test: render each example twice and assert byte-identical output.
- Visual sanity: a script `pnpm gallery` writes `gallery.html` showing every example, for a human check.

### Instructions to Codex

Copy this block into the Codex task along with the rest of this document.

```text
You are building the MVP of Requ syntax, an open-source text-to-diagram language for
operating models and swimlane workflows. This document is the spec; follow it exactly.

Rules:
- Work through milestones 1–7 in order. Commit after each with message "M<n>: <name>".
- Keep the repo green after every milestone: pnpm build, pnpm test and pnpm lint pass.
- TypeScript strict, ESM only, Node 20+. @requ/core depends only on elkjs.
- parse() and render() must never throw. Return diagnostics instead.
- Output must be deterministic: no Date.now(), Math.random() or Map iteration-order surprises.
- Do not build anything listed under "Next sprints".
- If the spec is ambiguous, choose the simplest behaviour, note it in DECISIONS.md, and continue.
- Copy section 2 of this doc into SPEC.md verbatim, then update it if you make a decision.
- At the end, print a summary: what was built, test counts, and any open questions.
```

### Open questions for Requstory

- Is the `@requ` npm scope available, or should we publish under `@requstory`?
- Domain for the playground and future render service (`requ.dev` or a subdomain of requstory.com)?
- Should Requstory's "Download JSON" export switch to the Requ model format now or after v0.2?
