import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse, render } from "../src/index";
import { layoutProcess } from "../src/layout/process";
import { wrap, measure } from "../src/layout/text";
const loan = readFileSync("examples/loan-application.requ", "utf8");
describe("process rendering", () => {
  it("matches the loan golden SVG", async () => {
    await expect(
      (await render(loan, { theme: "light" })).svg,
    ).toMatchFileSnapshot(
      "../../../examples/__snapshots__/loan-application.svg",
    );
  });
  it("is byte-identical across runs", async () => {
    expect((await render(loan)).svg).toBe((await render(loan)).svg);
  });
  it("keeps all node boxes separate and lane declaration order", () => {
    const d = parse(loan).doc.diagrams[0];
    if (d.kind !== "process") throw Error();
    const l = layoutProcess(d);
    expect(l.bands.map((x) => x.id)).toEqual([
      "customer",
      "branch",
      "scorer",
      "bureau",
    ]);
    for (const a of l.nodes)
      for (const b of l.nodes)
        if (a.id !== b.id)
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
    expect(
      l.edges.find(
        (e) =>
          e.id ===
          d.flows.find((f) => f.from === "report" && f.to === "score")?.id,
      )?.back,
    ).toBe(true);
  });
  it("renders decision branches, subprocesses, actors and provenance", async () => {
    const { svg } = await render(loan);
    for (const text of [
      "AI",
      "⊞",
      "yes",
      "no",
      "Onfido",
      "suggested",
      "back-edge",
    ])
      expect(svg).toContain(text);
    expect(svg).toContain("requ-step");
  });
  it("escapes labels, notes and system attributes", async () => {
    const { svg } = await render(
      'process "<script>alert(1)</script>"\nlane t "T"\nt.s: "<img>" note="<script>" system="<image>"',
    );
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("<img>");
    expect(svg).toContain("&lt;script&gt;");
  });
  it("renders valid portions after an error and hides only error banners on request", async () => {
    const source = loan + "\nthis is broken";
    expect((await render(source)).svg).toContain("requ-errors");
    const r = await render(source, { showDiagnostics: false });
    expect(r.svg).not.toContain("requ-errors");
    expect(r.svg).toContain("Submit");
    expect(r.diagnostics.some((x) => x.code === "E001")).toBe(true);
  });
  it("does not draw lint warnings in the SVG", async () => {
    expect((await render(loan)).svg).not.toContain("R010");
  });
  it("supports diagram selection and missing-id diagnostics", async () => {
    expect((await render(loan, { diagram: "kyc" })).svg).toContain(
      "KYC checks",
    );
    expect(
      (await render(loan, { diagram: "nope" })).diagnostics.some(
        (d) => d.code === "E008",
      ),
    ).toBe(true);
  });
  it.each(["light", "dark", "auto"] as const)(
    "supports %s theme",
    async (theme) => {
      const svg = (await render(loan, { theme, maxWidth: 500 })).svg;
      expect(svg).toContain('width="500"');
      expect(svg.includes("@media")).toBe(theme === "auto");
    },
  );
  it("bounds and truncates long text", () => {
    const lines = wrap("W".repeat(300), 100, 13, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain("…");
    expect(measure(lines[2])).toBeLessThanOrEqual(100);
  });
  it("handles an isolated self-loop without throwing", async () => {
    expect(
      (await render('process "X"\nlane t "T"\nt.s: "S"\ns -> s')).svg,
    ).toContain("back-edge");
  });
});
