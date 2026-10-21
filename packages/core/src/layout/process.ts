import type { ProcessDiagram } from "../model";
import type { Layout, Point } from "./types";
export function layoutProcess(d: ProcessDiagram): Layout {
  const steps = d.steps.filter((s) => d.lanes.some((l) => l.id === s.lane)),
    ids = new Set(steps.map((s) => s.id));
  const flows = d.flows.filter((f) => ids.has(f.from) && ids.has(f.to)),
    state = new Map<string, number>(),
    back = new Set<string>();
  // Iterative DFS avoids call-stack limits for long workflows.
  for (const step of steps) {
    if (state.has(step.id)) continue;
    const stack: { id: string; exit: boolean }[] = [
      { id: step.id, exit: false },
    ];
    while (stack.length) {
      const frame = stack.pop()!;
      if (frame.exit) {
        state.set(frame.id, 2);
        continue;
      }
      if (state.has(frame.id)) continue;
      state.set(frame.id, 1);
      stack.push({ id: frame.id, exit: true });
      for (const edge of flows.filter((f) => f.from === frame.id).reverse()) {
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
  const columns = new Map(steps.map((s) => [s.id, 0]));
  const pending = new Map(
    steps.map((s) => [s.id, dag.filter((f) => f.to === s.id).length]),
  );
  const queue = steps.filter((s) => pending.get(s.id) === 0).map((s) => s.id);
  while (queue.length) {
    const id = queue.shift()!;
    for (const f of dag.filter((f) => f.from === id)) {
      columns.set(f.to, Math.max(columns.get(f.to)!, columns.get(id)! + 1));
      pending.set(f.to, pending.get(f.to)! - 1);
      if (pending.get(f.to) === 0) queue.push(f.to);
    }
  }
  const width = Math.max(
    480,
    160 + 48 + (Math.max(0, ...columns.values()) + 1) * 188,
  );
  let y = 64;
  const nodes: Layout["nodes"] = [],
    bands: Layout["bands"] = [];
  for (const lane of d.lanes) {
    const cells = new Map<number, number>();
    const members = steps.filter((s) => s.lane === lane.id);
    for (const s of members) {
      const c = columns.get(s.id)!;
      cells.set(c, (cells.get(c) ?? 0) + 1);
    }
    const loops = flows.filter(
      (f) => back.has(f.id) && members.some((s) => s.id === f.from),
    ).length;
    const top = 32 + loops * 20;
    const height = Math.max(
      140,
      top + Math.max(1, ...cells.values()) * 96 + 16,
    );
    bands.push({ id: lane.id, x: 0, y, width, height });
    const used = new Map<number, number>();
    for (const s of members) {
      const c = columns.get(s.id)!,
        n = used.get(c) ?? 0;
      used.set(c, n + 1);
      const decision = s.kind === "decision";
      nodes.push({
        id: s.id,
        lane: lane.id,
        x: 192 + c * 188 + (decision ? 34 : 0),
        y: y + top + n * 96,
        width: decision ? 72 : 140,
        height: decision ? 72 : 56,
      });
    }
    y += height;
  }
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = flows.map((f, index) => {
    const a = nodeMap.get(f.from)!,
      b = nodeMap.get(f.to)!;
    const start = { x: a.x + a.width, y: a.y + a.height / 2 },
      end = { x: b.x, y: b.y + b.height / 2 };
    let points: Point[];
    const loop = back.has(f.id) || f.from === f.to || end.x <= start.x;
    if (loop) {
      const band = bands.find((l) => l.id === a.lane)!;
      const top = band.y + 14 + (index % 3) * 10;
      points = [
        start,
        { x: start.x + 18, y: start.y },
        { x: start.x + 18, y: top },
        { x: end.x - 18, y: top },
        { x: end.x - 18, y: end.y },
        end,
      ];
    } else if (start.y === end.y) points = [start, end];
    else {
      const mid = (start.x + end.x) / 2;
      points = [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end];
    }
    return { id: f.id, points, back: loop };
  });
  return { width, height: y + 24, nodes, edges, bands };
}
