import { it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "../src/index";
import { layoutProcess } from "../src/layout/process";
import { layoutOrg } from "../src/layout/org";
import { routeEdges, exitSide } from "../src/layout/routing";
import type { Layout, PlacedNode, Point, Box } from "../src/layout/types";
const parts = (points: Point[]) =>
  points.slice(1).map((p, i) => [points[i], p] as const);
function clearance(l: Layout): void {
  for (let i = 0; i < l.edges.length; i++)
    for (let j = i + 1; j < l.edges.length; j++)
      for (const [a, b] of parts(l.edges[i].points))
        for (const [c, d] of parts(l.edges[j].points)) {
          const dx = Math.max(
              0,
              Math.min(a.x, b.x) - Math.max(c.x, d.x),
              Math.min(c.x, d.x) - Math.max(a.x, b.x),
            ),
            dy = Math.max(
              0,
              Math.min(a.y, b.y) - Math.max(c.y, d.y),
              Math.min(c.y, d.y) - Math.max(a.y, b.y),
            );
          expect(
            Math.hypot(dx, dy),
            `${l.edges[i].id}/${l.edges[j].id} cross or are too close`,
          ).toBeGreaterThanOrEqual(7.999);
        }
}
const distance = (box: Box, a: Point, b: Point) =>
  Math.hypot(
    Math.max(
      0,
      box.x - Math.max(a.x, b.x),
      Math.min(a.x, b.x) - box.x - box.width,
    ),
    Math.max(
      0,
      box.y - Math.max(a.y, b.y),
      Math.min(a.y, b.y) - box.y - box.height,
    ),
  );
const example = (name: string) =>
  readFileSync("examples/" + name + ".requ", "utf8");
const arc = (id: string, from: string, to: string) => ({
  id,
  from,
  to,
  label: "",
  loc: { line: 1, col: 1, endCol: 2 },
});
it.each(readdirSync("examples").filter((f) => f.endsWith(".requ")))(
  "%s has no edge crossings and at least 8px clearance",
  async (file) => {
    for (const d of parse(readFileSync("examples/" + file, "utf8")).doc
      .diagrams) {
      const l = d.kind === "process" ? layoutProcess(d) : await layoutOrg(d);
      clearance(l);
      expect(l.edges.length).toBe(
        d.kind === "process" ? d.flows.length : d.handoffs.length,
      );
    }
  },
);
it("uses row position for process ports and column position for org ports", () => {
  const a: PlacedNode = {
      id: "a",
      x: 100,
      y: 100,
      width: 140,
      height: 80,
      row: 1,
      column: 0,
    },
    right = { ...a, id: "r", x: 500, column: 1 },
    above = { ...a, id: "t", x: 700, y: 0, row: 0, column: 2 },
    below = { ...a, id: "b", x: 700, y: 300, row: 2, column: 2 };
  expect(exitSide(a, right)).toBe("right");
  expect(exitSide(a, above)).toBe("top");
  expect(exitSide(a, below)).toBe("bottom");
  expect(exitSide(a, above, "column")).toBe("right");
  expect(exitSide(a, { ...below, column: 0 }, "column")).toBe("bottom");
});
it("aligns the loan inverse pair in one column with straight tracks at ±16px", () => {
  const d = parse(example("loan-application")).doc.diagrams[0];
  if (d.kind !== "process") throw Error();
  const l = layoutProcess(d),
    score = l.nodes.find((n) => n.id === "score")!,
    report = l.nodes.find((n) => n.id === "report")!,
    decide = l.nodes.find((n) => n.id === "decide")!;
  expect(score.column).toBe(report.column);
  expect(score.x + score.width / 2).toBe(report.x + report.width / 2);
  expect(decide.column).toBe(score.column! + 1);
  const center = score.x + score.width / 2,
    pair = l.edges.filter((e) => e.pair);
  expect(pair).toHaveLength(2);
  for (const e of pair) {
    expect(e.points).toHaveLength(2);
    expect(e.points[0].x).toBe(e.points[1].x);
    expect(Math.abs(e.points[0].x - center)).toBe(16);
    expect(distance(e.label!, e.points[0], e.points[1])).toBeLessThanOrEqual(
      16,
    );
  }
  expect(pair[0].label!.x + pair[0].label!.width).toBeLessThan(
    pair[0].points[0].x,
  );
  expect(pair[1].label!.x).toBeGreaterThan(pair[1].points[0].x);
});
it.each(readdirSync("examples").filter((f) => f.endsWith(".requ")))(
  "%s decision branches use distinct exit sides",
  (file) => {
    for (const d of parse(readFileSync("examples/" + file, "utf8")).doc
      .diagrams) {
      if (d.kind !== "process") continue;
      const l = layoutProcess(d);
      for (const step of d.steps.filter((s) => s.kind === "decision")) {
        const sides = l.edges
          .filter((e) => e.source.node === step.id)
          .map((e) => e.source.side);
        expect(new Set(sides).size).toBe(sides.length);
      }
    }
  },
);
it("keeps the loan same-lane decision branch right and other branch top", () => {
  const d = parse(example("loan-application")).doc.diagrams[0];
  if (d.kind !== "process") throw Error();
  const l = layoutProcess(d);
  expect(
    l.edges.find(
      (e) => e.source.node === "decide" && e.target.node === "decline",
    )!.source.side,
  ).toBe("right");
  expect(
    l.edges.find((e) => e.source.node === "decide" && e.target.node === "sign")!
      .source.side,
  ).toBe("top");
});
it.each(readdirSync("examples").filter((f) => f.endsWith(".requ")))(
  "%s process labels remain near their own segments and inside lanes",
  (file) => {
    for (const d of parse(readFileSync("examples/" + file, "utf8")).doc
      .diagrams) {
      if (d.kind !== "process") continue;
      const l = layoutProcess(d);
      for (const edge of l.edges.filter((e) => e.label)) {
        const box = edge.label!;
        expect(
          Math.min(...parts(edge.points).map(([a, b]) => distance(box, a, b))),
        ).toBeLessThanOrEqual(16);
        expect(
          l.bands.some(
            (b) => box.y >= b.y && box.y + box.height <= b.y + b.height,
          ),
        ).toBe(true);
      }
    }
  },
);
it("spreads ports on one side at least 24px apart", () => {
  const nodes: PlacedNode[] = [
      { id: "s", x: 200, y: 100, width: 160, height: 120, row: 0, column: 0 },
      ...[0, 1, 2].map((i) => ({
        id: "t" + i,
        x: 600 + i * 240,
        y: 100,
        width: 140,
        height: 80,
        row: 0,
        column: i + 1,
      })),
    ],
    edges = routeEdges(
      nodes,
      [0, 1, 2].map((i) => arc("e" + i, "s", "t" + i)),
      100,
      40,
    ),
    ys = edges.map((e) => e.source.y).sort((a, b) => a - b);
  expect(edges.every((e) => e.source.side === "right")).toBe(true);
  expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(24);
  expect(ys[2] - ys[1]).toBe(ys[1] - ys[0]);
  clearance({ nodes, edges, bands: [], width: 1500, height: 500 });
});
it("bounds Northbank height by rows ×160 plus the journey strip", async () => {
  const d = parse(example("northbank-org")).doc.diagrams[0];
  if (d.kind !== "org") throw Error();
  const l = await layoutOrg(d);
  expect(l.rows).toBe(5);
  expect(l.nodes.find((n) => n.id === "lending")!.row).toBe(
    l.nodes.find((n) => n.id === "assist")!.row,
  );
  expect(l.height).toBeLessThanOrEqual(5 * 160 + l.journeyHeight!);
  expect(l.nodes.find((n) => n.id === "marketing")!.column).toBe(0);
  expect(l.nodes.find((n) => n.id === "lending")!.column).toBe(1);
  expect(l.nodes.find((n) => n.id === "ops")!.column).toBe(2);
  expect(l.nodes.find((n) => n.id === "bureau")!.column).toBe(2);
  clearance(l);
});
it("collapses missing owner lines, restoring the line only for annotation", async () => {
  const d = parse('org "X"\nteam t "T"').doc.diagrams[0];
  if (d.kind !== "org") throw Error();
  const a = await layoutOrg(d),
    b = await layoutOrg(d, { annotate: true });
  expect(b.nodes[0].height - a.nodes[0].height).toBe(24);
  expect(a.nodes[0].headerHeight).toBe(56);
});

it("keeps task boxes compact when multiple ports use their horizontal sides", () => {
  const d = parse(example("loan-application")).doc.diagrams[0];
  if (d.kind !== "process") throw Error();
  const l = layoutProcess(d);
  expect(l.nodes.find((n) => n.id === "score")!.height).toBe(56);
  expect(l.nodes.find((n) => n.id === "report")!.height).toBe(56);
});
