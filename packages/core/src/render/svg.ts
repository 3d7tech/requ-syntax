import { layoutOrg } from "../layout/org";
import type { OrgDiagram } from "../model";
import { parse } from "../parser";
import { lint } from "../lint/index";
import {
  diagnostic,
  type Common,
  type Diagnostic,
  type ProcessDiagram,
} from "../model";
import { layoutProcess } from "../layout/process";
import type { Box, Layout, Point } from "../layout/types";
import { measure, wrap } from "../layout/text";
import { themeCSS } from "./theme";
export interface RenderOptions {
  theme?: "light" | "dark" | "auto";
  diagram?: string;
  showDiagnostics?: boolean;
  maxWidth?: number;
}
export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function hash(s: string): string {
  let n = 2166136261;
  for (let i = 0; i < s.length; i++)
    n = Math.imul(n ^ s.charCodeAt(i), 16777619);
  return (n >>> 0).toString(36);
}
export function attrs(item: Common, kind: string, extra = ""): string {
  return `data-requ-id="${esc(item.id)}" class="requ-${kind}${item.basis === "suggested" ? " suggested" : ""}${extra ? " " + extra : ""}"`;
}
export function title(item: Common): string {
  return `<title>${esc(item.label + (item.note ? " — " + item.note : ""))}</title>`;
}
export function textLines(
  label: string,
  x: number,
  y: number,
  width: number,
  size = 13,
  max = 3,
  anchor = "middle",
): string {
  return wrap(label, width, size, max)
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * (size + 3)}" style="font-size:${size}px" text-anchor="${anchor}">${esc(line)}</text>`,
    )
    .join("");
}
export function icon(type: string, x: number, y: number): string {
  const paths: Record<string, string> = {
    customer: "M8 2a3 3 0 1 0 0 6a3 3 0 0 0 0-6M2 16v-3c0-5 12-5 12 0v3",
    team: "M6 2a3 3 0 1 0 0 6a3 3 0 0 0 0-6M1 16v-3c0-5 10-5 10 0v3M12 3c5 0 5 6 0 6M13 10c3 0 4 2 4 6",
    agent: "M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z",
    external: "M1 16V4L8 0L15 4V16ZM5 5h1M10 5h1M5 9h1M10 9h1M7 16v-4h3v4",
  };
  return `<path d="${paths[type] ?? paths.team}" transform="translate(${x} ${y})" fill="none" stroke="var(--fg)" stroke-width="1.2"/>`;
}
export function edgeMarkup(
  layout: Layout,
  items: Common[],
  prefix: string,
): string {
  return layout.edges
    .map((e) => {
      const item = items.find((x) => x.id === e.id)!;
      let a: Point = e.points[0],
        b: Point = e.points[1],
        length = -1;
      for (let i = 1; i < e.points.length; i++) {
        const p = e.points[i - 1],
          q = e.points[i],
          n = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
        if (n > length) {
          length = n;
          a = p;
          b = q;
        }
      }
      const x = (a.x + b.x) / 2,
        y = (a.y + b.y) / 2 + (e.back ? 14 : 0);
      const label = item.label;
      const w = Math.min(140, measure(label, 11) + 12);
      return `<g ${attrs(item, "flow")} >${title(item)}<path class="requ-edge${e.back ? " back-edge" : ""}" d="${e.points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")}" marker-end="url(#${prefix}-arrow)"/>${label ? `<rect class="pill" x="${x - w / 2}" y="${y - 10}" width="${w}" height="20" rx="5"/>${textLines(label, x, y + 4, w - 8, 11, 1)}` : ""}</g>`;
    })
    .join("");
}
function processMarkup(d: ProcessDiagram, l: Layout, prefix: string): string {
  const bands = l.bands
    .map((b, i) => {
      const lane = d.lanes.find((x) => x.id === b.id)!;
      return `<g ${attrs(lane, "lane", `actor-${lane.type}`)}>${title(lane)}<rect x="0" y="${b.y}" width="${b.width}" height="${b.height}" fill="${i % 2 ? "var(--band)" : "var(--bg)"}" stroke="var(--line)"/><rect class="shape" x="0" y="${b.y}" width="160" height="${b.height}"/>${icon(lane.type, 16, b.y + 18)}${textLines(lane.label, 16, b.y + 57, 126, 13, 3, "start")}${lane.owner ? textLines(lane.owner, 16, b.y + b.height - 22, 126, 11, 1, "start") : ""}${lane.type === "agent" ? `<text class="badge" x="113" y="${b.y + 31}">AI</text>` : ""}${lane.basis === "suggested" ? `<text class="badge" x="139" y="${b.y + 31}">?</text>` : ""}</g>`;
    })
    .join("");
  const nodes = l.nodes
    .map((b) => {
      const step = d.steps.find((x) => x.id === b.id)!,
        lane = d.lanes.find((x) => x.id === step.lane)!;
      const shape =
        step.kind === "decision"
          ? `<path class="shape" d="M${b.x + b.width / 2},${b.y}L${b.x + b.width},${b.y + b.height / 2}L${b.x + b.width / 2},${b.y + b.height}L${b.x},${b.y + b.height / 2}Z"/>`
          : `<rect class="shape" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${step.kind === "start" || step.kind === "end" ? 28 : step.kind === "wait" ? 16 : 7}"/>`;
      const lines = wrap(
        step.label,
        step.kind === "decision" ? 60 : 122,
        12,
        step.system ? 2 : 3,
      );
      const label = lines
        .map(
          (s, i) =>
            `<text x="${b.x + b.width / 2}" y="${b.y + (step.system ? 17 : b.height / 2 - (lines.length - 1) * 7) + i * 14 + 4}" text-anchor="middle" style="font-size:12px">${esc(s)}</text>`,
        )
        .join("");
      return `<g ${attrs(step, "step", `actor-${lane.type}`)} tabindex="0">${title(step)}${shape}${label}${step.system ? `<text class="muted" x="${b.x + b.width / 2}" y="${b.y + b.height - 5}" text-anchor="middle">${esc(wrap(step.system, 116, 10, 1)[0])}</text>` : ""}${step.sub ? `<text class="badge" x="${b.x + b.width - 14}" y="${b.y + b.height - 4}">⊞</text>` : ""}${step.basis === "suggested" ? `<text class="badge" x="${b.x + b.width - 10}" y="${b.y - 5}">?</text>` : ""}${lane.type === "agent" ? `<text class="badge" x="${b.x + 2}" y="${b.y - 5}">AI</text>` : ""}</g>`;
    })
    .join("");
  return bands + edgeMarkup(l, d.flows, prefix) + nodes;
}
export function svgDocument(
  id: string,
  label: string,
  l: Pick<Layout, "width" | "height">,
  body: string,
  diagnostics: Diagnostic[],
  opts: RenderOptions,
): string {
  const errors =
      opts.showDiagnostics === false
        ? []
        : diagnostics.filter((d) => d.severity === "error").slice(0, 3),
    offset = errors.length ? 28 + errors.length * 22 : 0;
  const width = l.width,
    height = l.height + offset,
    max =
      Number.isFinite(opts.maxWidth) && opts.maxWidth! > 0
        ? Math.min(opts.maxWidth!, width)
        : width;
  const banner = errors.length
    ? `<g class="requ-errors"><rect width="${width}" height="${offset}" fill="#fee9e7"/>${errors.map((d, i) => `<text x="16" y="${23 + i * 22}" style="fill:#9f2020;font-size:12px">${esc(wrap(`${d.code}${d.loc ? " line " + d.loc.line : ""}: ${d.message}`, width - 32, 12, 1)[0])}</text>`).join("")}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" role="img" aria-labelledby="${id}-title" viewBox="0 0 ${width} ${height}" width="${max}" style="max-width:100%;height:auto;background:var(--bg)"><title id="${id}-title">${esc(label)}</title><style>${themeCSS(id, opts.theme ?? "auto")}</style><defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="var(--muted)"/></marker></defs>${banner}<g transform="translate(0 ${offset})">${body}</g></svg>`;
}
export async function render(
  text: string,
  opts: RenderOptions = {},
): Promise<{ svg: string; diagnostics: Diagnostic[] }> {
  const result = parse(text);
  const diagnostics = [...result.diagnostics, ...lint(result.doc)];
  try {
    const d = opts.diagram
      ? result.doc.diagrams.find((x) => x.id === opts.diagram)
      : result.doc.diagrams[0];
    if (opts.diagram && !d)
      diagnostics.push(
        diagnostic(
          "E008",
          `Diagram ${opts.diagram} was not found.`,
          undefined,
          "Choose a declared diagram id.",
        ),
      );
    const id = "requ-" + hash(String(text) + (d?.id ?? ""));
    if (!d)
      return {
        svg: svgDocument(
          id,
          "Requ diagram",
          { width: 640, height: 100 },
          '<text x="16" y="48">No diagram to display.</text>',
          diagnostics,
          opts,
        ),
        diagnostics,
      };
    if (d.kind === "org") {
      const layout = await layoutOrg(d);
      const refs = new Set(
        result.doc.diagrams
          .filter((x) => x.kind === "process")
          .map((x) => x.id),
      );
      return {
        svg: svgDocument(
          id,
          d.label,
          layout,
          textLines(d.label, 16, 32, layout.width - 32, 20, 1, "start") +
            orgMarkup(d, layout, id, refs),
          diagnostics,
          opts,
        ),
        diagnostics,
      };
    }
    const layout = layoutProcess(d);
    return {
      svg: svgDocument(
        id,
        d.label,
        layout,
        textLines(d.label, 16, 32, layout.width - 32, 20, 1, "start") +
          processMarkup(d, layout, id),
        diagnostics,
        opts,
      ),
      diagnostics,
    };
  } catch {
    diagnostics.push(
      diagnostic(
        "E009",
        "The diagram could not be laid out.",
        undefined,
        "Reduce diagram size or simplify its edges.",
      ),
    );
    return {
      svg: svgDocument(
        "requ-error",
        "Requ error",
        { width: 640, height: 80 },
        "",
        diagnostics,
        { showDiagnostics: true },
      ),
      diagnostics,
    };
  }
}
export type { Box };

function orgMarkup(
  d: OrgDiagram,
  l: Layout,
  prefix: string,
  refs: Set<string>,
): string {
  const palette = [
    "#167969",
    "#7653b5",
    "#2477ab",
    "#a16114",
    "#9a4e7b",
    "#74808e",
  ];
  const journey = d.journey
    .map((stage, i) => {
      const x = 16 + i * 216,
        y = 64;
      return `<g ${attrs(stage, "stage")}>${title(stage)}<path d="M${x} ${y}H${x + 188}L${x + 208} ${y + 27}L${x + 188} ${y + 54}H${x}L${x + 16} ${y + 27}Z" fill="var(--band)" stroke="var(--line)"/>${textLines(stage.label, x + 109, y + 31, 164, 13, 1)}${stage.teams
        .map(
          (team, j) =>
            `<circle data-requ-team="${esc(team)}" cx="${x + 24 + j * 18}" cy="${y + 73}" r="5" fill="${
              palette[
                Math.max(
                  0,
                  d.teams.findIndex((t) => t.id === team),
                ) % palette.length
              ]
            }"><title>${esc(d.teams.find((t) => t.id === team)?.label ?? team)}</title></circle>`,
        )
        .join("")}</g>`;
    })
    .join("");
  const cards = l.nodes
    .map((b) => {
      const team = d.teams.find((t) => t.id === b.id)!,
        color = palette[d.teams.indexOf(team) % palette.length];
      const processes = team.processes
        .slice(0, 6)
        .map((p, i) => {
          const y = b.y + 119 + i * 26,
            label = textLines(p.label, b.x + 16, y, 190, 12, 1, "start"),
            link = p.ref && refs.has(p.ref);
          return `<g ${attrs(p, "process")}>${title(p)}${link ? `<a href="#requ-diagram-${esc(p.ref!)}" data-requ-ref="${esc(p.ref!)}"><rect x="${b.x + 8}" y="${y - 18}" width="224" height="24" fill="transparent"/>${label}<text x="${b.x + 218}" y="${y}">↗</text></a>` : label + (p.ref ? `<text class="muted" x="${b.x + 218}" y="${y}">↗</text>` : "")}${p.basis === "suggested" ? `<text class="badge" x="${b.x + 205}" y="${y}">?</text>` : ""}</g>`;
        })
        .join("");
      return `<g ${attrs(team, "team", `actor-${team.type}`)} tabindex="0">${title(team)}<rect class="shape" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="9"/><circle cx="${b.x + 16}" cy="${b.y + 18}" r="4" fill="${color}"/>${icon(team.type, b.x + 16, b.y + 34)}${textLines(team.label, b.x + 44, b.y + 39, 176, 14, 2, "start")}${team.owner ? `<text class="muted" x="${b.x + 16}" y="${b.y + 79}">${esc(wrap(team.owner, 200, 11, 1)[0])}</text>` : ""}${team.type === "agent" ? `<text class="badge" x="${b.x + 206}" y="${b.y + 19}">AI</text>` : ""}${team.basis === "suggested" ? `<text class="badge" x="${b.x + 226}" y="${b.y + 19}">?</text>` : ""}<path d="M${b.x} ${b.y + 94}h${b.width}" stroke="var(--line)"/>${processes}${team.processes.length > 6 ? `<text class="muted" x="${b.x + 16}" y="${b.y + b.height - 14}">+${team.processes.length - 6} more</text>` : ""}</g>`;
    })
    .join("");
  return journey + edgeMarkup(l, d.handoffs, prefix) + cards;
}
