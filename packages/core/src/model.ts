export type ActorType = "customer" | "team" | "agent" | "external";
export type Basis = "website" | "research" | "suggested" | "confirmed";
export type StepKind = "task" | "start" | "end" | "decision" | "wait";
export interface Loc {
  line: number;
  col: number;
  endCol: number;
}
export interface Common {
  id: string;
  label: string;
  basis?: Basis;
  note?: string;
  loc: Loc;
}
export interface Lane extends Common {
  type: ActorType;
  owner?: string;
}
export interface Step extends Common {
  lane: string;
  kind: StepKind;
  sub?: string;
  system?: string;
}
export interface Flow extends Common {
  from: string;
  to: string;
}
export interface ProcessDiagram extends Common {
  kind: "process";
  owner?: string;
  lanes: Lane[];
  steps: Step[];
  flows: Flow[];
}
export interface OrgProcess extends Common {
  team: string;
  ref?: string;
  owner?: string;
}
export interface Team extends Lane {
  processes: OrgProcess[];
}
export interface Handoff extends Common {
  from: string;
  to: string;
}
export interface Stage extends Common {
  teams: string[];
}
export interface OrgDiagram extends Common {
  kind: "org";
  teams: Team[];
  handoffs: Handoff[];
  journey: Stage[];
}
export type Diagram = ProcessDiagram | OrgDiagram;
export interface RequDocument {
  version?: string;
  diagrams: Diagram[];
}
export interface Diagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  hint?: string;
  loc?: Loc;
}
export interface ParseResult {
  doc: RequDocument;
  diagnostics: Diagnostic[];
}
export function diagnostic(
  code: string,
  message: string,
  loc?: Loc,
  hint?: string,
): Diagnostic {
  return {
    code,
    severity: code.startsWith("E")
      ? "error"
      : code.startsWith("I")
        ? "info"
        : "warning",
    message,
    ...(hint ? { hint } : {}),
    ...(loc ? { loc } : {}),
  };
}
