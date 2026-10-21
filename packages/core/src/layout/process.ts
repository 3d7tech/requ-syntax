import type { ProcessDiagram, Step } from "../model";
import { measure, wrap } from "./text";
import { routeEdges } from "./routing";
import type { Layout } from "./types";
export function stepSize(
  step: Step,
  agent = false,
  degree = 0,
): { width: number; height: number } {
  const lines = wrap(step.label, 122, 12, step.system ? 2 : 3);
  if (step.kind === "decision") {
    const size =
      Math.ceil(
        Math.max(
          72,
          Math.max(...lines.map((t) => measure(t, 12))) +
            lines.length * 16 +
            32,
          degree * 12 + 24,
        ) / 2,
      ) * 2;
    return { width: size, height: size };
  }
  return {
    width: Math.max(140, degree * 12 + 24),
    height: Math.max(
      56,
      lines.length * 16 +
        16 +
        (agent || step.basis === "suggested" ? 14 : 0) +
        (step.system ? 16 : 0),
      degree * 12 + 24,
    ),
  };
}
export function layoutProcess(d: ProcessDiagram): Layout {
  const steps = d.steps.filter((s) => d.lanes.some((l) => l.id === s.lane)),
    ids = new Set(steps.map((s) => s.id)),
    flows = d.flows.filter((f) => ids.has(f.from) && ids.has(f.to));
  const state = new Map<string, number>(),
    back = new Set<string>();
  for (const step of steps) {
    if (state.has(step.id)) continue;
    const stack: { id: string; exit: boolean }[] = [
      { id: step.id, exit: false },
    ];
    while (stack.length) {
      const f = stack.pop()!;
      if (f.exit) {
        state.set(f.id, 2);
        continue;
      }
      if (state.has(f.id)) continue;
      state.set(f.id, 1);
      stack.push({ id: f.id, exit: true });
      for (const edge of flows.filter((e) => e.from === f.id).reverse()) {
        if (state.get(edge.to) === 1) back.add(edge.id);
        else if (!state.has(edge.to)) stack.push({ id: edge.to, exit: false });
      }
    }
  }
  const dag = flows
    .filter((f) => f.from !== f.to)
    .map((f) =>
      back.has(f.id) ? { from: f.to, to: f.from } : { from: f.from, to: f.to },
    );
  const columns = new Map(steps.map((s) => [s.id, 0])),
    pending = new Map(
      steps.map((s) => [s.id, dag.filter((f) => f.to === s.id).length]),
    ),
    queue = steps.filter((s) => pending.get(s.id) === 0).map((s) => s.id);
  while (queue.length) {
    const id = queue.shift()!;
    for (const f of dag.filter((e) => e.from === id)) {
      columns.set(f.to, Math.max(columns.get(f.to)!, columns.get(id)! + 1));
      pending.set(f.to, pending.get(f.to)! - 1);
      if (pending.get(f.to) === 0) queue.push(f.to);
    }
  }
  const sizes = new Map(
    steps.map((s) => [
      s.id,
      stepSize(
        s,
        d.lanes.find((l) => l.id === s.lane)?.type === "agent",
        flows.filter((f) => f.from === s.id || f.to === s.id).length,
      ),
    ]),
  );
  const columnWidths = Array.from(
    { length: Math.max(0, ...columns.values()) + 1 },
    (_, i) =>
      Math.max(
        140,
        ...steps
          .filter((s) => columns.get(s.id) === i)
          .map((s) => sizes.get(s.id)!.width),
      ),
  );
  const columnX = columnWidths.map(
    (_, i) =>
      224 + columnWidths.slice(0, i).reduce((sum, w) => sum + w + 80, 0),
  );
  const nodes: Layout["nodes"] = [],
    bands: Layout["bands"] = [];
  let y = 64;
  for (const lane of d.lanes) {
    const members = steps.filter((s) => s.lane === lane.id),
      cells = new Map<number, Step[]>();
    for (const s of members) {
      const c = columns.get(s.id)!;
      cells.set(c, [...(cells.get(c) ?? []), s]);
    }
    const headerContent =
      Math.max(16, wrap(lane.label, 104, 13, 3).length * 17) +
      (lane.owner ? 24 : 0) +
      (lane.type === "agent" ? 18 : 0);
    const content = Math.max(
      headerContent,
      0,
      ...[...cells.values()].map(
        (cell) =>
          cell.reduce((sum, s) => sum + sizes.get(s.id)!.height, 0) +
          (cell.length - 1) * 32,
      ),
    );
    const height = Math.max(96, content + 32);
    bands.push({ id: lane.id, x: 0, y, width: 0, height });
    for (const [column, cell] of cells) {
      let top = y + 16;
      for (const s of cell) {
        const size = sizes.get(s.id)!;
        nodes.push({
          id: s.id,
          lane: lane.id,
          x: columnX[column] + (columnWidths[column] - size.width) / 2,
          y: top,
          ...size,
          diamond: s.kind === "decision",
        });
        top += size.height + 32;
      }
    }
    y += height;
  }
  const edges = routeEdges(nodes, flows, 176, 48),
    width = Math.max(
      480,
      ...nodes.map((n) => n.x + n.width + 48),
      ...edges.flatMap((e) => e.points.map((p) => p.x + 24)),
      ...edges
        .filter((e) => e.label)
        .map((e) => e.label!.x + e.label!.width + 24),
    );
  for (const band of bands) band.width = width;
  return {
    width,
    height: Math.max(
      y + 24,
      ...edges.flatMap((e) => e.points.map((p) => p.y + 24)),
      ...edges
        .filter((e) => e.label)
        .map((e) => e.label!.y + e.label!.height + 24),
    ),
    nodes,
    edges,
    bands,
  };
}
