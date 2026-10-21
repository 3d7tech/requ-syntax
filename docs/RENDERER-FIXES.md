# Renderer fixes — 21 October 2026

Four changes are complete, each in a separate commit, in the requested order.

1. **Routing recovery:** try 8px, 4px and 0px clearance, then an elbow. Crowded ports and labels recover too. W008 uses the requested message and hint. Routing difficulty no longer returns E009. Commit `5a59ad5`.
2. **Long processes:** compact physical gaps after longest-path layering, preserving predecessor order, independent shared columns and reverse-pair alignment. Rating width was 2,599px at this commit. Commit `cbf9800`.
3. **Decisions:** cap diamonds at 96px. Short labels use up to three lines with padding; long labels sit below a 72px diamond with reserved lane/routing space. Commit `653e2c3`.
4. **Portable SVG:** `inlineStyles: true` and CLI `--inline-styles` put colours, fonts and strokes into attributes, with no style block or CSS variables. Default is false. Auto resolves to light; dark is explicit. Future PNG export and render services must use this mode; neither is added here.

The supplied source is saved as `examples/bond-rating.requ`, preserving its sovereign-rating wording and adding the confirmed `vote -> research : "more analysis"` edge. It has 21 steps and 26 edges.

## Widths in pixels

| Example / diagram              |                             Before | After |
| ------------------------------ | ---------------------------------: | ----: |
| Bank account opening           |                              1,420 | 1,420 |
| Bond rating / sovereign_rating | E009; 4,336 after routing recovery | 2,500 |
| Customer refund                |                                916 |   916 |
| Employee onboarding            |                              1,168 | 1,168 |
| Errors demo                    |                                664 |   664 |
| Invoice approval with agent    |                              1,182 | 1,168 |
| Loan application / loan        |                              1,420 | 1,420 |
| Loan application / kyc         |                                916 |   916 |
| Northbank org                  |                              1,192 | 1,192 |
| SaaS company org               |                              1,192 | 1,192 |
| Support triage agent           |                              1,168 | 1,168 |

The original renderer returned a 640px error SVG for bond rating; that is not a diagram-width baseline. The 4,336px figure is its recovered layout before compaction.

## Checks and limits

- Build, 245 tests, lint and strict types pass. No example returns E009; errors-demo retains its intended parse errors.
- Original examples retain strict 8px routing checks. Loan and Northbank have no crossings.
- Rating remains congested: seven segment intersections, the same count as the recovery baseline, and three W008 warnings. Compaction does not increase that count; this is not a zero-crossing result.
- Browser checks pass for ESM/IIFE embeds, all eleven default golden SVGs, text collisions, internal diamond padding and the playground at 1440/390/320px. Attribute-only light process/dark annotated org exports also have golden snapshots.
- CairoSVG converted all eleven inline diagrams into visible PNGs. Core has no runtime dependencies.
- The eleven-example gallery is regenerated. These changes are published as `@requstory/*@0.1.1`; the playground deployment is still pending.

```sh
pnpm requ render examples/bond-rating.requ --inline-styles -o rating.svg
```

For npm publishing, follow [the token steps](NPM-TOKEN.md), then tell Codex “token saved”. Never paste the token into chat.

## Added rating regression sources and lint rules

- `examples/sovereign-rating.requ` includes the confirmed vote → research feedback edge. The unchanged original Grok source is in `packages/core/test/fixtures/sovereign-rating-grok.requ`; it has 25 edges rather than 26. The bond-rating filename remains available.
- Both versions render every step and flow without E009. The original renderer failed with E009; both now render at **2,500px** wide.
- **R011 end-has-outflow — warning:** an end step has an outgoing flow.
- **R012 unmarked-branch — info:** a non-decision has at least two labelled outgoing flows; hint: mark it decision.
- **R013 decision-label — info:** a decision label does not end in `?`; trailing whitespace is ignored.
- Each rule points to the step declaration, has a repair hint and ignores org diagrams. Source warnings are retained in both regression versions.
- Build, **277 tests**, lint/types and all browser checks pass. The eleven-example gallery and sovereign golden snapshot are regenerated. The three new rules are also in the language guide used by Copy for AI.
