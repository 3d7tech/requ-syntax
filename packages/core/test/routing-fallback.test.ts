import { it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { render, parse, type Diagnostic } from "../src/index";
import { routeEdges } from "../src/layout/routing";
it("keeps an obstructed edge and label visible with W008 instead of throwing", () => {
  const nodes = [
    { id: "a", x: 100, y: 50, width: 40, height: 40, row: 0, column: 0 },
    { id: "wall", x: 160, y: 0, width: 80, height: 200, row: 0, column: 1 },
    { id: "b", x: 260, y: 50, width: 40, height: 40, row: 0, column: 2 },
  ];
  const diagnostics: Diagnostic[] = [];
  const edges = routeEdges(
    nodes,
    [
      {
        id: "edge",
        from: "a",
        to: "b",
        label: "Blocked",
        loc: { line: 7, col: 1, endCol: 8 },
      },
    ],
    80,
    0,
    { maxY: 100, diagnostics },
  );
  expect(edges).toHaveLength(1);
  expect(edges[0].label).toBeDefined();
  expect(
    edges[0].points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  ).toBe(true);
  expect(diagnostics).toEqual([
    {
      code: "W008",
      severity: "warning",
      message: "Edge a -> b could not be routed cleanly.",
      hint: "Diagram still rendered; consider reordering lanes or steps.",
      loc: { line: 7, col: 1, endCol: 8 },
    },
  ]);
});
it("does not turn crowded ports into a diagram failure", () => {
  const nodes = [
    { id: "a", x: 100, y: 100, width: 20, height: 20, row: 0, column: 0 },
    { id: "b", x: 300, y: 100, width: 20, height: 20, row: 0, column: 1 },
  ];
  const diagnostics: Diagnostic[] = [];
  const edges = routeEdges(
    nodes,
    [0, 1].map((i) => ({
      id: "e" + i,
      from: "a",
      to: "b",
      label: "",
      loc: { line: i + 1, col: 1, endCol: 2 },
    })),
    50,
    0,
    { diagnostics },
  );
  expect(edges).toHaveLength(2);
  expect(diagnostics.some((d) => d.code === "W008")).toBe(true);
});
it.each(readdirSync("examples").filter((f) => f.endsWith(".requ")))(
  "%s keeps all diagrams free of E009",
  async (file) => {
    const source = readFileSync("examples/" + file, "utf8");
    for (const d of parse(source).doc.diagrams)
      expect(
        (await render(source, { diagram: d.id })).diagnostics.some(
          (d) => d.code === "E009",
        ),
      ).toBe(false);
  },
);

it("renders the rating feedback loops, including vote to research", async () => {
  const source = readFileSync("examples/bond-rating.requ", "utf8");
  const d = parse(source).doc.diagrams[0];
  expect(d.kind).toBe("process");
  if (d.kind !== "process") return;
  expect(
    d.flows.some(
      (f) =>
        f.from === "vote" && f.to === "research" && f.label === "more analysis",
    ),
  ).toBe(true);
  const result = await render(source);
  expect(result.svg.match(/class="requ-flow/g)).toHaveLength(d.flows.length);
  expect(result.svg).toContain("Sovereign debt rating process");
  expect(result.diagnostics.some((d) => d.code === "E009")).toBe(false);
  expect(result.diagnostics.some((d) => d.code === "W008")).toBe(true);
});
