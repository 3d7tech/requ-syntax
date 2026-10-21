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
import type { Box, Layout } from "../layout/types";
import { wrap } from "../layout/text";
import { themeCSS } from "./theme";
import { inlineSVG } from "./inline";
export interface RenderOptions {
  theme?: "light" | "dark" | "auto";
  diagram?: string;
  showDiagnostics?: boolean;
  maxWidth?: number;
  annotate?: boolean;
  inlineStyles?: boolean;
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
        `<text x="${x}" y="${y + i * (size + 4)}" style="font-size:${size}px" text-anchor="${anchor}">${esc(line)}</text>`,
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
      const item = items.find((x) => x.id === e.id)!,
        box = e.label;
      return `<g ${attrs(item, "flow")} data-source-side="${e.source.side}" data-target-side="${e.target.side}">${title(item)}<path class="requ-edge${e.back ? " back-edge" : ""}" d="${e.points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")}" marker-end="url(#${prefix}-arrow)"/>${box ? `<g class="requ-edge-label"><rect class="pill" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="5"/>${box.lines.map((line, i) => `<text x="${box.x + box.width / 2}" y="${box.y + 16 + i * 16}" text-anchor="middle" style="font-size:12px">${esc(line)}</text>`).join("")}</g>` : ""}</g>`;
    })
    .join("");
}
function processMarkup(d: ProcessDiagram, l: Layout, prefix: string): string {
  const bands = l.bands
    .map((b, i) => {
      const lane = d.lanes.find((x) => x.id === b.id)!,
        labelHeight = wrap(lane.label, 104, 13, 3).length * 17;
      return `<g ${attrs(lane, "lane", `actor-${lane.type}`)}>${title(lane)}<rect x="0" y="${b.y}" width="${b.width}" height="${b.height}" fill="${i % 2 ? "var(--band)" : "var(--bg)"}" stroke="var(--line)"/><rect class="shape" x="0" y="${b.y}" width="160" height="${b.height}"/>${icon(lane.type, 16, b.y + 16)}${textLines(lane.label, 40, b.y + 29, 104, 13, 3, "start")}${lane.owner ? textLines(lane.owner, 16, b.y + 16 + labelHeight + 18, 126, 11, 1, "start") : ""}${lane.type === "agent" ? `<text class="badge" x="16" y="${b.y + b.height - 16}">AI</text>` : ""}${lane.basis === "suggested" ? `<text class="badge" x="143" y="${b.y + 16}">?</text>` : ""}</g>`;
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
      const lines =
          b.labelLines ?? wrap(step.label, 122, 12, step.system ? 2 : 3),
        center =
          b.y +
          b.height / 2 +
          (!b.diamond && (lane.type === "agent" || step.basis === "suggested")
            ? 7
            : 0) -
          (step.system ? 8 : 0);
      const label = lines
        .map(
          (line, i) =>
            `<text${b.externalLabel ? ' class="requ-external-label"' : ""} x="${b.x + b.width / 2}" y="${b.externalLabel ? b.externalLabel.y + 16 + i * 16 : center - (lines.length - 1) * 8 + i * 16 + 4}" text-anchor="middle" style="font-size:12px">${esc(line)}</text>`,
        )
        .join("");
      const badgeX = b.diamond ? b.x + b.width * 0.75 - 6 : b.x + b.width - 16,
        badgeY = b.diamond ? b.y + b.height * 0.25 + 10 : b.y + 15;
      return `<g ${attrs(step, "step", `actor-${lane.type}`)} tabindex="0">${title(step)}${shape}${label}${step.system ? `<text class="muted" x="${b.x + b.width / 2}" y="${b.y + b.height - 8}" text-anchor="middle" style="font-size:10px">${esc(wrap(step.system, 116, 10, 1)[0])}</text>` : ""}${step.sub ? `<text class="badge" x="${b.x + b.width - 14}" y="${b.y + b.height - 5}">⊞</text>` : ""}${step.basis === "suggested" ? `<text class="badge requ-basis-badge" x="${badgeX}" y="${badgeY}" text-anchor="middle">?</text>` : ""}${lane.type === "agent" ? `<text class="badge" x="${b.x + 12}" y="${b.y + 14}">AI</text>` : ""}</g>`;
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" role="img" aria-labelledby="${id}-title" viewBox="0 0 ${width} ${height}" width="${max}" style="max-width:100%;height:auto;background:var(--bg)"><title id="${id}-title">${esc(label)}</title><style>${themeCSS(id, opts.theme ?? "auto")}</style><defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="var(--muted)"/></marker></defs>${banner}<g transform="translate(0 ${offset})">${body}</g></svg>`;
  return opts.inlineStyles ? inlineSVG(svg, opts.theme ?? "auto") : svg;
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
      const layout = await layoutOrg(d, { annotate: opts.annotate });
      diagnostics.push(...(layout.diagnostics ?? []));
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
            orgMarkup(d, layout, id, refs, opts.annotate ?? false),
          diagnostics,
          opts,
        ),
        diagnostics,
      };
    }
    const layout = layoutProcess(d);
    diagnostics.push(...(layout.diagnostics ?? []));
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
        { ...opts, showDiagnostics: true },
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
  annotate: boolean,
): string {
  const palette = [
    "#167969",
    "#7653b5",
    "#2477ab",
    "#a16114",
    "#9a4e7b",
    "#74808e",
  ];
  const colorFor = (id: string) =>
    palette[
      Math.max(
        0,
        d.teams.findIndex((t) => t.id === id),
      ) % palette.length
    ];
  const journey = (l.stages ?? [])
    .map((b) => {
      const stage = d.journey.find((s) => s.id === b.id)!;
      return `<g ${attrs(stage, "stage")}>${title(stage)}<path d="M${b.x} ${b.y}H${b.x + 204}L${b.x + 224} ${b.y + 27}L${b.x + 204} ${b.y + 54}H${b.x}L${b.x + 16} ${b.y + 27}Z" fill="var(--band)" stroke="var(--line)"/>${textLines(stage.label, b.x + 116, b.y + 31, 180, 13, 1)}${b.pills.map((p) => `<g class="requ-team-pill" data-requ-team="${esc(p.team)}"><title>${esc(p.label)}</title><rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="${Math.min(12, p.height / 2)}" fill="var(--bg)" stroke="${colorFor(p.team)}"/>${p.lines.map((line, i) => `<text x="${p.x + p.width / 2}" y="${p.y + 16 + i * 16}" style="font-size:12px" text-anchor="middle">${esc(line)}</text>`).join("")}</g>`).join("")}</g>`;
    })
    .join("");
  const cards = l.nodes
    .map((b) => {
      const team = d.teams.find((t) => t.id === b.id)!,
        color = colorFor(team.id);
      const processes = team.processes
        .slice(0, 6)
        .map((p, i) => {
          const y = b.y + (b.headerHeight ?? 80) + 22 + i * 26,
            label = textLines(p.label, b.x + 16, y, 212, 12, 1, "start"),
            link = p.ref && refs.has(p.ref);
          return `<g ${attrs(p, "process")}>${title(p)}${link ? `<a href="#requ-diagram-${esc(p.ref!)}" data-requ-ref="${esc(p.ref!)}"><rect x="${b.x + 8}" y="${y - 18}" width="248" height="24" fill="transparent"/>${label}<text x="${b.x + 240}" y="${y}">↗</text></a>` : label + (p.ref ? `<text class="muted" x="${b.x + 240}" y="${y}">↗</text>` : "")}${p.basis === "suggested" ? `<text class="badge" x="${b.x + 230}" y="${y}">?</text>` : ""}</g>`;
        })
        .join("");
      const owner = team.owner?.trim()
        ? `<text class="muted" x="${b.x + 16}" y="${b.y + 63}">${esc(wrap(team.owner, 230, 11, 1)[0])}</text>`
        : annotate && (team.type === "team" || team.type === "agent")
          ? `<text class="muted requ-no-owner" x="${b.x + 16}" y="${b.y + 63}" style="font-style:italic">No owner</text>`
          : "";
      return `<g ${attrs(team, "team", `actor-${team.type}`)} tabindex="0">${title(team)}<rect class="shape" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="9"/><path class="requ-team-accent" d="M${b.x + 2} ${b.y + 9}V${b.y + b.height - 9}" stroke="${color}" stroke-width="4"/>${icon(team.type, b.x + 16, b.y + 22)}${textLines(team.label, b.x + 44, b.y + 35, team.type === "agent" ? 168 : 194, 14, 1, "start")}${owner}${team.type === "agent" ? `<text class="badge" x="${b.x + 232}" y="${b.y + 35}">AI</text>` : ""}${team.basis === "suggested" ? `<text class="badge" x="${b.x + 248}" y="${b.y + 16}">?</text>` : ""}${team.processes.length ? `<g class="requ-process-section"><path class="requ-process-divider" d="M${b.x} ${b.y + (b.headerHeight ?? 80)}h${b.width}" stroke="var(--line)"/>${processes}${team.processes.length > 6 ? `<text class="muted" x="${b.x + 16}" y="${b.y + b.height - 14}">+${team.processes.length - 6} more</text>` : ""}</g>` : ""}</g>`;
    })
    .join("");
  return journey + edgeMarkup(l, d.handoffs, prefix) + cards;
}
