import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse, render, lint } from "../src/index";
const original = readFileSync(
  "packages/core/test/fixtures/sovereign-rating-grok.requ",
  "utf8",
);
const confirmed = readFileSync("examples/sovereign-rating.requ", "utf8");
it("preserves the original Grok source independently from the restored feedback edge", () => {
  expect(confirmed.replace('vote -> research : "more analysis"\n', "")).toBe(
    original,
  );
  expect(original).not.toContain("vote -> research");
});
it.each([
  {
    name: "sovereign example with restored feedback",
    source: confirmed,
    edges: 26,
  },
  { name: "original Grok source", source: original, edges: 25 },
])(
  "$name renders every step and flow without E009",
  async ({ source, edges }) => {
    const parsed = parse(source),
      d = parsed.doc.diagrams[0];
    expect(parsed.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(d.kind).toBe("process");
    if (d.kind !== "process") return;
    expect(d.steps).toHaveLength(21);
    expect(d.flows).toHaveLength(edges);
    const result = await render(source, { theme: "light" });
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(result.diagnostics.some((d) => d.code === "E009")).toBe(false);
    expect(result.diagnostics.some((d) => d.code === "W008")).toBe(true);
    expect(result.svg.match(/class="requ-step/g)).toHaveLength(d.steps.length);
    expect(result.svg.match(/class="requ-flow/g)).toHaveLength(d.flows.length);
    expect(lint(parsed.doc)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "R011",
          severity: "warning",
          message: expect.stringContaining("surveil"),
        }),
        expect.objectContaining({
          code: "R012",
          severity: "info",
          message: expect.stringContaining("gather"),
        }),
        expect.objectContaining({
          code: "R013",
          severity: "info",
          message: expect.stringContaining("debate"),
        }),
      ]),
    );
  },
);
