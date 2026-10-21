import { diagnostic, type Common, type Diagnostic } from "../model";
import { measure, wrap } from "./text";
import type {
  Band,
  Box,
  PlacedEdge,
  PlacedLabel,
  PlacedNode,
  Point,
  Port,
  Side,
} from "./types";
export interface Connection extends Common {
  from: string;
  to: string;
}
export interface RoutingOptions {
  mode?: "row" | "column";
  bands?: Band[];
  maxY?: number;
  diagnostics?: Diagnostic[];
  localFirst?: boolean;
}
function warnRouting(edge: Connection, options: RoutingOptions): void {
  const message = `Edge ${edge.from} -> ${edge.to} could not be routed cleanly.`;
  if (
    !options.diagnostics?.some(
      (d) =>
        d.code === "W008" &&
        d.message === message &&
        d.loc?.line === edge.loc.line,
    )
  )
    options.diagnostics?.push(
      diagnostic(
        "W008",
        message,
        edge.loc,
        "Diagram still rendered; consider reordering lanes or steps.",
      ),
    );
}
const EPS = 0.001,
  MIN_PORT_GAP = 24,
  CLEARANCE = 8;
const same = (a: number, b: number) => Math.abs(a - b) < EPS;
export function segments(points: Point[]): [Point, Point][] {
  return points
    .slice(1)
    .map((p, i): [Point, Point] => [points[i], p])
    .filter(([a, b]) => !same(a.x, b.x) || !same(a.y, b.y));
}
export function segmentDistance(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): number {
  const dx = Math.max(
    0,
    Math.min(a.x, b.x) - Math.max(c.x, d.x),
    Math.min(c.x, d.x) - Math.max(a.x, b.x),
  );
  const dy = Math.max(
    0,
    Math.min(a.y, b.y) - Math.max(c.y, d.y),
    Math.min(c.y, d.y) - Math.max(a.y, b.y),
  );
  return Math.hypot(dx, dy);
}
export function segmentsOverlap(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): boolean {
  if (same(a.y, b.y) && same(c.y, d.y) && same(a.y, c.y))
    return (
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) >
      EPS
    );
  if (same(a.x, b.x) && same(c.x, d.x) && same(a.x, c.x))
    return (
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
        Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) >
      EPS
    );
  return false;
}
export function boxesOverlap(a: Box, b: Box, pad = 0): boolean {
  return (
    a.x < b.x + b.width + pad &&
    b.x < a.x + a.width + pad &&
    a.y < b.y + b.height + pad &&
    b.y < a.y + a.height + pad
  );
}
function hits(a: Point, b: Point, box: Box, pad = 8): boolean {
  const x = box.x - pad,
    y = box.y - pad,
    w = box.width + 2 * pad,
    h = box.height + 2 * pad;
  return same(a.y, b.y)
    ? a.y > y + EPS &&
        a.y < y + h - EPS &&
        Math.max(a.x, b.x) > x + EPS &&
        Math.min(a.x, b.x) < x + w - EPS
    : a.x > x + EPS &&
        a.x < x + w - EPS &&
        Math.max(a.y, b.y) > y + EPS &&
        Math.min(a.y, b.y) < y + h - EPS;
}
const opposite: Record<Side, Side> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};
const row = (n: PlacedNode) => n.row ?? n.y + n.height / 2;
const column = (n: PlacedNode) => n.column ?? n.x + n.width / 2;
function sameRow(a: PlacedNode, b: PlacedNode): boolean {
  return a.lane && b.lane
    ? a.lane === b.lane
    : a.row !== undefined && b.row !== undefined
      ? a.row === b.row
      : Math.abs(row(a) - row(b)) < Math.max(a.height, b.height) / 2;
}
/** One grid rule: follow the primary band; within a band face the other axis. */
export function exitSide(
  a: PlacedNode,
  b: PlacedNode,
  mode: "row" | "column" = "row",
): Side {
  if (a.id === b.id) return "right";
  if (mode === "column" && !same(column(a), column(b)))
    return column(b) > column(a) ? "right" : "left";
  if (!sameRow(a, b)) return row(b) > row(a) ? "bottom" : "top";
  return b.x + b.width / 2 >= a.x + a.width / 2 ? "right" : "left";
}
interface Request {
  edge: Connection;
  node: PlacedNode;
  side: Side;
  out: boolean;
  offset?: number;
  port?: Port;
}
function verticalPair(
  a: PlacedNode,
  b: PlacedNode,
  e: Connection,
  edges: Connection[],
  options: RoutingOptions,
): boolean {
  return (
    options.mode !== "column" &&
    !sameRow(a, b) &&
    same(column(a), column(b)) &&
    edges.some((other) => other.from === e.to && other.to === e.from)
  );
}
function requestsFor(
  nodes: PlacedNode[],
  edges: Connection[],
  options: RoutingOptions,
): Request[] {
  const map = new Map(nodes.map((n) => [n.id, n])),
    sides = new Map(
      edges.map((e) => [
        e.id,
        exitSide(map.get(e.from)!, map.get(e.to)!, options.mode),
      ]),
    );
  for (const a of nodes.filter((n) => n.diamond)) {
    const outgoing = edges.filter((e) => e.from === a.id),
      used = new Set<Side>();
    // Same-lane continuation keeps right; the off-lane branch takes top/bottom.
    const ordered = [...outgoing].sort(
      (x, y) =>
        Number(sameRow(a, map.get(y.to)!)) - Number(sameRow(a, map.get(x.to)!)),
    );
    for (const e of ordered) {
      const b = map.get(e.to)!;
      let side = sides.get(e.id)!;
      if (used.has(side)) {
        const alternatives: Side[] = sameRow(a, b)
          ? ["right", "bottom", "top", "left"]
          : [
              row(b) > row(a) ? "bottom" : "top",
              "right",
              row(b) > row(a) ? "top" : "bottom",
              "left",
            ];
        side = alternatives.find((s) => !used.has(s)) ?? side;
      }
      used.add(side);
      sides.set(e.id, side);
    }
  }
  const requests: Request[] = [];
  for (const edge of edges) {
    const a = map.get(edge.from)!,
      b = map.get(edge.to)!,
      side = sides.get(edge.id)!;
    const pair = verticalPair(a, b, edge, edges, options),
      offset = pair ? (row(b) > row(a) ? -16 : 16) : undefined;
    requests.push(
      { edge, node: a, side, out: true, offset },
      {
        edge,
        node: b,
        side: a.id === b.id ? "bottom" : opposite[side],
        out: false,
        offset,
      },
    );
  }
  for (const node of nodes)
    for (const side of ["left", "right", "top", "bottom"] as Side[]) {
      const group = requests.filter((r) => r.node === node && r.side === side),
        fixed = group.filter((r) => r.offset !== undefined),
        free = group.filter((r) => r.offset === undefined);
      const assigned = fixed.map((r) => r.offset!);
      free.forEach((r, i) => {
        if (!fixed.length)
          r.offset = (i - (free.length - 1) / 2) * MIN_PORT_GAP;
        else {
          let distance = 40;
          while (assigned.some((x) => Math.abs(x - distance) < 24))
            distance += 24;
          r.offset = distance;
          assigned.push(distance);
        }
      });
    }
  return requests;
}
export function portRequirements(
  nodes: PlacedNode[],
  edges: Connection[],
  options: RoutingOptions = {},
): Map<string, { width: number; height: number }> {
  const result = new Map(nodes.map((n) => [n.id, { width: 16, height: 16 }]));
  for (const r of requestsFor(nodes, edges, options)) {
    const size = result.get(r.node.id)!,
      axis = r.side === "left" || r.side === "right" ? "height" : "width";
    size[axis] = Math.max(size[axis], Math.abs(r.offset!) * 2 + 16);
  }
  return result;
}
function allocatePorts(
  nodes: PlacedNode[],
  edges: Connection[],
  options: RoutingOptions,
): Map<string, { source: Port; target: Port }> {
  const requests = requestsFor(nodes, edges, options);
  for (const r of requests) {
    const node = r.node,
      side = r.side,
      limit = Math.max(
        0,
        (side === "left" || side === "right" ? node.height : node.width) / 2 -
          8,
      ),
      offset = Math.max(-limit, Math.min(limit, r.offset!)),
      cx = node.x + node.width / 2,
      cy = node.y + node.height / 2;
    let x = cx,
      y = cy;
    if (side === "left" || side === "right") {
      y += offset;
      x +=
        (side === "right" ? 1 : -1) *
        (node.width / 2 -
          (node.diamond ? (Math.abs(offset) * node.width) / node.height : 0));
    } else {
      x += offset;
      y +=
        (side === "bottom" ? 1 : -1) *
        (node.height / 2 -
          (node.diamond ? (Math.abs(offset) * node.height) / node.width : 0));
    }
    if (!same(offset, r.offset!)) warnRouting(r.edge, options);
    r.port = { x, y, side, node: node.id };
  }
  return new Map(
    edges.map((e) => [
      e.id,
      {
        source: requests.find((r) => r.edge === e && r.out)!.port!,
        target: requests.find((r) => r.edge === e && !r.out)!.port!,
      },
    ]),
  );
}
function stub(p: Port, n: PlacedNode): Point {
  switch (p.side) {
    case "left":
      return { x: n.x - 24, y: p.y };
    case "right":
      return { x: n.x + n.width + 24, y: p.y };
    case "top":
      return { x: p.x, y: n.y - 24 };
    case "bottom":
      return { x: p.x, y: n.y + n.height + 24 };
  }
}
function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    if (
      result.length &&
      same(p.x, result.at(-1)!.x) &&
      same(p.y, result.at(-1)!.y)
    )
      continue;
    result.push(p);
    while (result.length > 2) {
      const a = result.at(-3)!,
        b = result.at(-2)!,
        c = result.at(-1)!;
      if (
        (same(a.x, b.x) && same(b.x, c.x) && (b.y - a.y) * (c.y - b.y) >= 0) ||
        (same(a.y, b.y) && same(b.y, c.y) && (b.x - a.x) * (c.x - b.x) >= 0)
      )
        result.splice(result.length - 2, 1);
      else break;
    }
  }
  return result;
}
interface Entry {
  key: string;
  x: number;
  y: number;
  dir: number;
  cost: number;
  priority: number;
}
class Heap {
  items: Entry[] = [];
  push(value: Entry): void {
    let i = this.items.length;
    this.items.push(value);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.items[p].priority <= value.priority) break;
      this.items[i] = this.items[p];
      i = p;
    }
    this.items[i] = value;
  }
  pop(): Entry | undefined {
    const first = this.items[0],
      last = this.items.pop();
    if (this.items.length && last) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < this.items.length &&
          this.items[child + 1].priority < this.items[child].priority
        )
          child++;
        if (this.items[child].priority >= last.priority) break;
        this.items[i] = this.items[child];
        i = child;
      }
      this.items[i] = last;
    }
    return first;
  }
}

function path(
  start: Point,
  end: Point,
  nodes: PlacedNode[],
  occupied: [Point, Point][],
  reserved: [Point, Point][],
  minX: number,
  minY: number,
  maxY: number,
  initialDir: number,
  finalDir: number,
  clearance: number,
): Point[] | undefined {
  const xs = new Set<number>([start.x, end.x, minX]),
    ys = new Set<number>([start.y, end.y, minY]);
  const addX = (x: number) => {
      if (x >= minX) xs.add(x);
    },
    addY = (y: number) => {
      if (y >= minY && y <= maxY) ys.add(y);
    };
  for (const n of nodes) {
    for (const x of [
      n.x - 24,
      n.x - 48,
      n.x + n.width + 24,
      n.x + n.width + 48,
    ])
      addX(x);
    for (const y of [
      n.y - 16,
      n.y - 24,
      n.y + n.height + 16,
      n.y + n.height + 24,
    ])
      addY(y);
  }
  for (const [a, b] of occupied)
    for (const p of [a, b]) {
      addX(p.x - 16);
      addX(p.x + 16);
      addY(p.y - 16);
      addY(p.y + 16);
    }
  const xList = [...xs].sort((a, b) => a - b),
    yList = [...ys].sort((a, b) => a - b),
    sx = xList.indexOf(start.x),
    sy = yList.indexOf(start.y),
    ex = xList.indexOf(end.x),
    ey = yList.indexOf(end.y);
  const open = new Heap(),
    best = new Map<string, number>(),
    previous = new Map<string, string>(),
    entries = new Map<string, Entry>(),
    // One bend costs more than every possible simple path's total length.
    BEND =
      (xList.length * yList.length + 1) *
        Math.max(1, xList.at(-1)! - xList[0] + yList.at(-1)! - yList[0]) +
      1;
  const first: Entry = {
    key: `${sx},${sy},${initialDir}`,
    x: sx,
    y: sy,
    dir: initialDir,
    cost: 0,
    priority: 0,
  };
  open.push(first);
  best.set(first.key, 0);
  entries.set(first.key, first);
  const clear = new Map<string, boolean>();
  let visited = 0,
    goal: Entry | undefined,
    goalCost = Infinity;
  while (open.items.length) {
    const current = open.pop()!;
    if (current.cost !== best.get(current.key)) continue;
    if (current.priority >= goalCost) break;
    if (current.x === ex && current.y === ey) {
      const cost = current.cost + (current.dir !== finalDir ? BEND : 0);
      if (cost < goalCost) {
        goal = current;
        goalCost = cost;
      }
      continue;
    }
    if (++visited > 200000) return undefined;
    for (const [dx, dy, dir] of [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 2],
      [0, -1, 2],
    ]) {
      const x = current.x + dx,
        y = current.y + dy;
      if (x < 0 || y < 0 || x >= xList.length || y >= yList.length) continue;
      const a = { x: xList[current.x], y: yList[current.y] },
        b = { x: xList[x], y: yList[y] },
        cache = [current.x, current.y, x, y].join(",");
      let allowed = clear.get(cache);
      if (allowed === undefined) {
        allowed =
          !nodes.some((n) => hits(a, b, n, 8)) &&
          !occupied.some(
            ([c, d]) => segmentDistance(a, b, c, d) < clearance - EPS,
          ) &&
          !reserved.some(([c, d]) => segmentsOverlap(a, b, c, d));
        clear.set(cache, allowed);
      }
      if (!allowed) continue;
      const cost =
          current.cost +
          Math.abs(a.x - b.x) +
          Math.abs(a.y - b.y) +
          (current.dir !== dir ? BEND : 0),
        key = `${x},${y},${dir}`;
      if (cost >= (best.get(key) ?? Infinity)) continue;
      const entry = {
        key,
        x,
        y,
        dir,
        cost,
        priority: cost + Math.abs(b.x - end.x) + Math.abs(b.y - end.y),
      };
      best.set(key, cost);
      previous.set(key, current.key);
      entries.set(key, entry);
      open.push(entry);
    }
  }
  if (!goal) return undefined;
  const route: Point[] = [];
  let key: string | undefined = goal.key;
  while (key) {
    const e: Entry = entries.get(key)!;
    route.push({ x: xList[e.x], y: yList[e.y] });
    key = previous.get(key);
  }
  return route.reverse();
}
function labels(
  edges: PlacedEdge[],
  connections: Connection[],
  nodes: PlacedNode[],
  minX: number,
  minY: number,
  options: RoutingOptions,
): void {
  const placed: PlacedLabel[] = [];
  for (const edge of edges) {
    const text = connections.find((c) => c.id === edge.id)!.label;
    if (!text) continue;
    const straight =
      edge.points.length === 2 && same(edge.points[0].y, edge.points[1].y);
    const labelWidth = straight
      ? Math.max(
          16,
          Math.min(144, Math.abs(edge.points[1].x - edge.points[0].x) - 24),
        )
      : 144;
    const lines = wrap(text, labelWidth, 12, 3),
      width = Math.max(...lines.map((t) => measure(t, 12))) + 16,
      height = lines.length * 16 + 8;
    const pieces = segments(edge.points)
      .flatMap(([a, b]) => {
        if (!options.bands?.length || same(a.y, b.y))
          return [[a, b] as [Point, Point]];
        return options.bands.flatMap((band) => {
          const lo = Math.max(Math.min(a.y, b.y), band.y),
            hi = Math.min(Math.max(a.y, b.y), band.y + band.height);
          return hi > lo
            ? [
                [
                  { x: a.x, y: lo },
                  { x: a.x, y: hi },
                ] as [Point, Point],
              ]
            : [];
        });
      })
      .sort(
        ([a, b], [c, d]) =>
          Math.abs(d.x - c.x) +
          Math.abs(d.y - c.y) -
          (Math.abs(b.x - a.x) + Math.abs(b.y - a.y)),
      );
    let found: PlacedLabel | undefined;
    const alternatives: PlacedLabel[] = [];
    const pairSide = edge.pair
      ? edge.source.x <
        nodes.find((n) => n.id === edge.source.node)!.x +
          nodes.find((n) => n.id === edge.source.node)!.width / 2
        ? -1
        : 1
      : 0;
    for (const normal of pairSide ? [pairSide] : [0, -1, 1]) {
      if (found) break;
      for (const [a, b] of pieces) {
        if (found) break;
        const horizontal = same(a.y, b.y),
          start = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
          end = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y),
          half = horizontal ? width / 2 : height / 2;
        const positions = [
          (start + end) / 2,
          start + half + 4,
          end - half - 4,
          ...Array.from(
            { length: Math.max(0, Math.floor((end - start) / 8)) },
            (_, i) => start + half + 4 + i * 8,
          ),
        ];
        for (const at of positions) {
          const x = horizontal
              ? at
              : a.x + (normal ? normal * (width / 2 + 8) : 0),
            y = horizontal
              ? a.y + (normal ? normal * (height / 2 + 8) : 0)
              : at,
            box = { x: x - width / 2, y: y - height / 2, width, height, lines };
          alternatives.push(box);
          if (at < start + half || at > end - half) continue;
          if (
            box.x < minX ||
            box.y < minY ||
            box.y + height > (options.maxY ?? Infinity) ||
            nodes.some((n) => boxesOverlap(box, n, 6)) ||
            placed.some((p) => boxesOverlap(box, p, 6))
          )
            continue;
          if (
            options.bands?.length &&
            !options.bands.some(
              (b) => box.y >= b.y + 2 && box.y + height <= b.y + b.height - 2,
            )
          )
            continue;
          if (
            edges.some(
              (other) =>
                other !== edge &&
                segments(other.points).some(([c, d]) => hits(c, d, box, 4)),
            )
          )
            continue;
          found = box;
          break;
        }
      }
    }
    if (!found) {
      warnRouting(connections.find((c) => c.id === edge.id)!, options);
      const a = edge.points[0],
        b = edge.points.at(-1)!;
      if (!alternatives.length)
        alternatives.push({
          x: Math.max(minX, (a.x + b.x - width) / 2),
          y: Math.max(minY, (a.y + b.y - height) / 2),
          width,
          height,
          lines,
        });
      const bounded = alternatives.map((box) => {
        let y = Math.max(
          minY,
          Math.min(box.y, (options.maxY ?? Infinity) - height),
        );
        if (options.bands?.length) {
          const shift = (b: Band) =>
            Math.abs(
              Math.max(b.y + 2, Math.min(y, b.y + b.height - height - 2)) - y,
            );
          const band = [...options.bands].sort(
            (a, b) => shift(a) - shift(b),
          )[0];
          y = Math.max(
            band.y + 2,
            Math.min(y, band.y + band.height - height - 2),
          );
        }
        return { ...box, x: Math.max(minX, box.x), y };
      });
      const score = (box: PlacedLabel) =>
        nodes.filter((n) => boxesOverlap(box, n)).length * 100000 +
        placed.filter((p) => boxesOverlap(box, p)).length * 10000 +
        nodes.filter((n) => boxesOverlap(box, n, 6)).length * 1000 +
        placed.filter((p) => boxesOverlap(box, p, 6)).length * 100 +
        edges.filter(
          (other) =>
            other !== edge &&
            segments(other.points).some(([a, b]) => hits(a, b, box, 4)),
        ).length;
      found = bounded.sort((a, b) => score(a) - score(b))[0];
    }
    edge.label = found;
    placed.push(found);
  }
}
export function routeEdges(
  nodes: PlacedNode[],
  connections: Connection[],
  minX: number,
  minY: number,
  options: RoutingOptions = {},
): PlacedEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n])),
    valid = connections.filter((c) => nodeMap.has(c.from) && nodeMap.has(c.to)),
    ports = allocatePorts(nodes, valid, options),
    occupied: [Point, Point][] = [],
    result = new Map<string, PlacedEdge>();
  const ordered = [...valid].sort((a, b) => {
    const aPair = verticalPair(
        nodeMap.get(a.from)!,
        nodeMap.get(a.to)!,
        a,
        valid,
        options,
      ),
      bPair = verticalPair(
        nodeMap.get(b.from)!,
        nodeMap.get(b.to)!,
        b,
        valid,
        options,
      );
    return (
      Number(bPair) - Number(aPair) ||
      (options.localFirst
        ? Math.abs(column(nodeMap.get(a.from)!) - column(nodeMap.get(a.to)!)) -
          Math.abs(column(nodeMap.get(b.from)!) - column(nodeMap.get(b.to)!))
        : Math.abs(row(nodeMap.get(b.from)!) - row(nodeMap.get(b.to)!)) -
          Math.abs(row(nodeMap.get(a.from)!) - row(nodeMap.get(a.to)!)))
    );
  });
  for (const c of ordered) {
    const { source, target } = ports.get(c.id)!,
      a = nodeMap.get(c.from)!,
      b = nodeMap.get(c.to)!,
      isPair = verticalPair(a, b, c, valid, options),
      start = stub(source, a),
      end = stub(target, b);
    const protectedSegments: [Point, Point][] = [
      ...occupied,
      ...valid
        .filter((other) => other.id !== c.id && !result.has(other.id))
        .flatMap((other) => {
          const p = ports.get(other.id)!;
          return [
            ...segments([p.source, stub(p.source, nodeMap.get(other.from)!)]),
            ...segments([stub(p.target, nodeMap.get(other.to)!), p.target]),
          ];
        }),
    ];
    const outward = (p: Port, q: Point) =>
      p.side === "left"
        ? q.x < p.x
        : p.side === "right"
          ? q.x > p.x
          : p.side === "top"
            ? q.y < p.y
            : q.y > p.y;
    const attempt = (clearance: number): Point[] | undefined => {
      const direct =
        (same(source.x, target.x) || same(source.y, target.y)) &&
        a.id !== b.id &&
        outward(source, target) &&
        outward(target, source) &&
        !nodes
          .filter((n) => n.id !== a.id && n.id !== b.id)
          .some((n) => hits(source, target, n)) &&
        !protectedSegments.some(
          ([e, f]) => segmentDistance(source, target, e, f) < clearance - EPS,
        );
      const candidates = [
        simplify([source, start, { x: start.x, y: end.y }, end, target]),
        simplify([source, start, { x: end.x, y: start.y }, end, target]),
      ].filter(
        (points) =>
          points.length <= 4 &&
          !segments(points).some(
            ([p, q], i, all) =>
              nodes.some(
                (n) =>
                  !(
                    (i === 0 && n.id === a.id) ||
                    (i === all.length - 1 && n.id === b.id)
                  ) && hits(p, q, n, 8),
              ) ||
              protectedSegments.some(
                ([g, h]) => segmentDistance(p, q, g, h) < clearance - EPS,
              ),
          ),
      );
      candidates.sort(
        (x, y) =>
          x.length - y.length ||
          segments(x).reduce(
            (sum, [p, q]) => sum + Math.abs(q.x - p.x) + Math.abs(q.y - p.y),
            0,
          ) -
            segments(y).reduce(
              (sum, [p, q]) => sum + Math.abs(q.x - p.x) + Math.abs(q.y - p.y),
              0,
            ),
      );
      const searched = direct
        ? [source, target]
        : (candidates[0] ??
          (() => {
            const route = path(
              start,
              end,
              nodes,
              protectedSegments,
              [...segments([source, start]), ...segments([end, target])],
              minX,
              minY,
              options.maxY ?? Infinity,
              source.side === "left" || source.side === "right" ? 1 : 2,
              target.side === "left" || target.side === "right" ? 1 : 2,
              clearance,
            );
            return route ? simplify([source, ...route, target]) : undefined;
          })());
      if (!searched) return undefined;
      if (
        segments(searched).some(([e, f]) =>
          occupied.some(
            ([g, h]) => segmentDistance(e, f, g, h) < clearance - EPS,
          ),
        )
      )
        return undefined;
      return searched;
    };
    let points: Point[] | undefined;
    for (const clearance of [CLEARANCE, 4, 0]) {
      points = attempt(clearance);
      if (points) {
        if (clearance !== CLEARANCE) warnRouting(c, options);
        break;
      }
    }
    if (!points) {
      warnRouting(c, options);
      points = simplify([source, start, { x: start.x, y: end.y }, end, target]);
    }
    result.set(c.id, {
      id: c.id,
      points,
      source,
      target,
      back: column(b) <= column(a),
      ...(isPair
        ? { pair: valid.find((e) => e.from === c.to && e.to === c.from)!.id }
        : {}),
    });
    occupied.push(...segments(points));
  }
  const edges = valid.map((c) => result.get(c.id)!);
  labels(edges, valid, nodes, minX, minY, options);
  return edges;
}
