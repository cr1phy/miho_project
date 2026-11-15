export type GateKind = "INPUT" | "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR" | "XNOR" | "OUTPUT";
export type GateDefinition = { kind: GateKind; name: string; symbol: string; inputs: number };
export type PlacedGate = GateDefinition & { id: number; x: number; y: number; variable: string; value: boolean };
export type Connection = { id: number; from: number; to: number; input: number };
export type Point = { x: number; y: number };
export type WireDraft = Point & { from: number };
/** `text` is the formula as shown to the user; `source` is the same formula in the notation of the C++ core (null while the circuit is incomplete). */
export type Expr = { text: string; value: boolean | null; source: string | null };
/** `inputs` are the circuit inputs this output depends on, in placement order. */
export type OutputExpression = { gate: PlacedGate; expr: Expr; label: string; inputs: PlacedGate[] };
export type TableState =
	| { status: "incomplete" }
	| { status: "pending" }
	| { status: "ready"; rows: boolean[] }
	| { status: "error"; message: string };
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
