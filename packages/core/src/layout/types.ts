export interface Point {
  x: number;
  y: number;
}
export interface Box extends Point {
  width: number;
  height: number;
}
export interface PlacedNode extends Box {
  id: string;
  lane?: string;
}
export interface PlacedEdge {
  id: string;
  points: Point[];
  back: boolean;
}
export interface Band extends Box {
  id: string;
}
export interface Layout {
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  bands: Band[];
}
