import type { Diagnostic } from "../model";
export interface Point {
  x: number;
  y: number;
}
export interface Box extends Point {
  width: number;
  height: number;
}
export type Side = "left" | "right" | "top" | "bottom";
export interface Port extends Point {
  side: Side;
  node: string;
}
export interface PlacedNode extends Box {
  id: string;
  lane?: string;
  diamond?: boolean;
  labelLines?: string[];
  labelBelow?: boolean;
  externalLabel?: PlacedLabel;
  row?: number;
  column?: number;
  headerHeight?: number;
}
export interface PlacedLabel extends Box {
  lines: string[];
}
export interface PlacedEdge {
  id: string;
  points: Point[];
  back: boolean;
  source: Port;
  target: Port;
  label?: PlacedLabel;
  pair?: string;
}
export interface Band extends Box {
  id: string;
}
export interface JourneyPill extends Box {
  team: string;
  label: string;
  lines: string[];
}
export interface JourneyStage extends Box {
  id: string;
  pills: JourneyPill[];
}
export interface Layout {
  diagnostics?: Diagnostic[];
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  bands: Band[];
  stages?: JourneyStage[];
  rows?: number;
  journeyHeight?: number;
}
