export type GateKind = "INPUT" | "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR" | "XNOR" | "OUTPUT";
export type GateDefinition = { kind: GateKind; name: string; symbol: string; inputs: number };
export type PlacedGate = GateDefinition & { id: number; x: number; y: number; variable: string; value: boolean };
export type Connection = { id: number; from: number; to: number; input: number };
export type Point = { x: number; y: number };
export type WireDraft = Point & { from: number };
export type Expr = { text: string; value: boolean | null };
export type OutputExpression = { gate: PlacedGate; expr: Expr; label: string };
export type ExpressionData = { inputs: PlacedGate[]; outputs: OutputExpression[] };
export type Highlight = { gateIds: Set<number>; wireIds: Set<number> };

export type SavedWorkspace = {
	version: 2;
	placedGates: PlacedGate[];
	connections: Connection[];
	nextId: number;
	nextWireId: number;
	nextVariable: number;
	isDark: boolean;
};
