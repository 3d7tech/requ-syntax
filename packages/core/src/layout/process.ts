import type { Diagnostic, ProcessDiagram, Step } from "../model";
import { measure, wrap } from "./text";
import { longestLayers } from "./layers";
import { portRequirements, routeEdges } from "./routing";
import type { Layout } from "./types";
export function stepSize(
  step: Step,
  agent = false,
): { width: number; height: number } {
  const lines = wrap(step.label, 122, 12, step.system ? 2 : 3);
  if (step.kind === "decision") {
    const size =
      Math.ceil(
        Math.max(
          72,
          // Leave room for wider system-font metrics on Linux and Windows.
          Math.max(...lines.map((t) => measure(t, 12))) * 1.2 +
            lines.length * 20 +
            40,
        ) / 2,
      ) * 2;
    return { width: size, height: size };
  }
  return {
    width: 140,
    height: Math.max(
      56,
      lines.length * 16 +
        16 +
        (agent || step.basis === "suggested" ? 14 : 0) +
        (step.system ? 16 : 0),
    ),
  };
}
export function layoutProcess(d: ProcessDiagram): Layout {
  const steps = d.steps.filter((s) => d.lanes.some((l) => l.id === s.lane)),
    ids = new Set(steps.map((s) => s.id)),
    flows = d.flows.filter((f) => ids.has(f.from) && ids.has(f.to));
  const pairs = flows.filter(
    (f) =>
      steps.find((s) => s.id === f.from)!.lane !==
        steps.find((s) => s.id === f.to)!.lane &&
      flows.some((e) => e.from === f.to && e.to === f.from),
  );
  const columns = longestLayers(
    steps.map((s) => s.id),
    flows,
    pairs,
  );
  const sizes = new Map(
    steps.map((s) => [
      s.id,
      stepSize(s, d.lanes.find((l) => l.id === s.lane)?.type === "agent"),
    ]),
  );
  const provisional = steps.map((step) => ({
    id: step.id,
    lane: step.lane,
    row: d.lanes.findIndex((l) => l.id === step.lane),
    column: columns.get(step.id)!,
    x: columns.get(step.id)! * 200,
    y: d.lanes.findIndex((l) => l.id === step.lane) * 200,
    ...sizes.get(step.id)!,
    diamond: step.kind === "decision",
  }));
  const needed = portRequirements(provisional, flows, { mode: "row" });
  for (const n of provisional) {
    const size = sizes.get(n.id)!,
      min = needed.get(n.id)!;
    size.width = Math.max(size.width, min.width);
    size.height = Math.max(size.height, min.height);
    if (n.diamond) size.width = size.height = Math.max(size.width, size.height);
  }
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
  const spaciousX = columnWidths.map(
    (_, i) =>
      224 + columnWidths.slice(0, i).reduce((sum, w) => sum + w + 112, 0),
  );
  // Longest-path ranks already share independent steps. Compact their physical
  // spacing too: adjacent ranks in different lanes can overlap horizontally.
  // Keep a 56px routing gutter between boxes that occupy the same lane.
  const compact = spaciousX.at(-1)! + columnWidths.at(-1)! + 48 > 2600;
  const columnX: number[] = [];
  for (let column = 0; column < columnWidths.length; column++) {
    if (!compact) {
      columnX.push(spaciousX[column]);
      continue;
    }
    let x = column
      ? columnX[column - 1] +
        (columnWidths[column - 1] - columnWidths[column]) / 2 +
        32
      : 224;
    for (const lane of d.lanes) {
      if (
        !steps.some((s) => s.lane === lane.id && columns.get(s.id) === column)
      )
        continue;
      const previous = steps
        .filter((s) => s.lane === lane.id && columns.get(s.id)! < column)
        .map((s) => columns.get(s.id)!);
      if (!previous.length) continue;
      const before = Math.max(...previous);
      x = Math.max(x, columnX[before] + columnWidths[before] + 56);
    }
    columnX.push(x);
  }
  const nodes: Layout["nodes"] = [],
    bands: Layout["bands"] = [];
  let y = 64;
  for (const [row, lane] of d.lanes.entries()) {
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
    // Vertical labelled connections need an in-lane label slot beside the line.
    const topReserve = flows.some(
      (f) =>
        f.label &&
        (members.some((s) => s.id === f.to) ||
          members.some((s) => s.id === f.from)) &&
        steps.find((s) => s.id === f.from)!.lane !==
          steps.find((s) => s.id === f.to)!.lane,
    )
      ? 32
      : 0;
    const bottomReserve = topReserve;
    const content = Math.max(
      headerContent,
      0,
      ...[...cells.values()].map(
        (cell) =>
          cell.reduce((sum, s) => sum + sizes.get(s.id)!.height, 0) +
          (cell.length - 1) * 32,
      ),
    );
    const height = Math.max(96, content + topReserve + bottomReserve + 32);
    bands.push({ id: lane.id, x: 0, y, width: 0, height });
    for (const [column, cell] of cells) {
      let top = y + 16 + topReserve;
      for (const s of cell) {
        const size = sizes.get(s.id)!;
        nodes.push({
          id: s.id,
          lane: lane.id,
          row,
          column,
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
  const diagnostics: Diagnostic[] = [];
  const edges = routeEdges(nodes, flows, 176, 48, {
      bands,
      mode: "row",
      diagnostics,
      localFirst: compact,
    }),
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
    diagnostics,
    nodes,
    edges,
    bands,
  };
}
