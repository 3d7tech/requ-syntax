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

