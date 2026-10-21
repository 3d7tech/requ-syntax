import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse, render } from "../src/index";
import { layoutOrg } from "../src/layout/org";
const org = readFileSync("examples/northbank-org.requ", "utf8");
describe("org rendering", () => {
  it("matches the org golden SVG", async () => {
    await expect(
      (await render(org, { theme: "light" })).svg,
    ).toMatchFileSnapshot("../../../examples/__snapshots__/northbank-org.svg");
  });
  it("is deterministic across independent layout runs", async () => {
    expect((await render(org)).svg).toBe((await render(org)).svg);
  });
  it("has six cards, four stages and four handoffs", async () => {
    const r = await render(org);
    expect(r.svg.match(/class="requ-team /g)).toHaveLength(6);
    expect(r.svg.match(/class="requ-stage"/g)).toHaveLength(4);
    expect(r.svg.match(/class="requ-flow"/g)).toHaveLength(4);
    expect(r.svg).toContain("actor-external");
    expect(r.svg).toContain("AI");
    expect(r.diagnostics.filter((x) => x.severity === "error")).toEqual([]);
  });
  it("lays out cards without overlaps", async () => {
    const d = parse(org).doc.diagrams[0];
    if (d.kind !== "org") throw Error();
    const l = await layoutOrg(d);
    for (const a of l.nodes)
      for (const b of l.nodes)
        if (a.id !== b.id)
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
  });
  it("links only resolved process refs", async () => {
    expect((await render(org)).svg).not.toContain("data-requ-ref");
    expect((await render(org + '\nprocess loan "Loan"')).svg).toContain(
      'data-requ-ref="loan"',
    );
  });
  it("limits the visible process list to six", async () => {
    const r = await render(
      'org "X"\nteam t "T"\n' +
        Array.from({ length: 9 }, (_, i) => `process t "Process ${i}"`).join(
          "\n",
        ),
    );
    expect(r.svg).toContain("+3 more");
    expect(r.svg.match(/class="requ-process"/g)).toHaveLength(6);
  });
  it("renders an empty org", async () => {
    expect((await render('org "Empty"')).diagnostics).toEqual([]);
  });
});
