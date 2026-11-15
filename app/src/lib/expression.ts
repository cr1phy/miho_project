import type { Connection, Expr, ExpressionData, GateKind, Highlight, PlacedGate } from "../types";
import { incomingByTarget } from "./graph";

const UNKNOWN: Expr = { text: "…", value: null, source: null };

/** Operators of the C++ core (see the notation table in the README). */
const CORE_OPERATOR: Partial<Record<GateKind, string>> = { AND: "&", OR: "|", XOR: "^", NAND: "~&", NOR: "~|", XNOR: "==" };

function evaluate(kind: GateKind, a: boolean, b: boolean) {
	switch (kind) {
		case "NOT": return !a;
		case "AND": return a && b;
		case "NAND": return !(a && b);
		case "OR": return a || b;
		case "NOR": return !(a || b);
		case "XOR": return a !== b;
		case "XNOR": return a === b;
		default: return a;
	}
}

/**
 * Builds the formula and current value of every output of the circuit.
 * `values` overrides the inputs' own values (gate id -> value), e.g. for a truth table.
 */
export function buildExpressionData(placedGates: PlacedGate[], connections: Connection[], values?: Map<number, boolean>): ExpressionData {
	const byId = new Map(placedGates.map((gate) => [gate.id, gate]));
	const incoming = incomingByTarget(connections);
	const outgoingIds = new Set(connections.map((wire) => wire.from));
	const isOpenEnd = (gate: PlacedGate) => gate.kind !== "INPUT" && gate.kind !== "OUTPUT" && !outgoingIds.has(gate.id);

	const explicitOutputs = placedGates.filter((gate) => gate.kind === "OUTPUT");
	const ancestorsOfOutputs = new Set<number>();
	const collectAncestors = (id: number) => {
		if (ancestorsOfOutputs.has(id)) return;
		ancestorsOfOutputs.add(id);
		(incoming.get(id) ?? []).forEach((wire) => collectAncestors(wire.from));
	};
	explicitOutputs.forEach((gate) => collectAncestors(gate.id));
	// Keep independent terminal branches visible even when the workspace also has explicit outputs.
	const independentSinks = placedGates.filter((gate) => isOpenEnd(gate) && !ancestorsOfOutputs.has(gate.id));
	const sinks = [...explicitOutputs, ...independentSinks];

	function build(id: number, path = new Set<number>()): Expr {
		const gate = byId.get(id);
		if (!gate || path.has(id)) return UNKNOWN;
		if (gate.kind === "INPUT") return { text: gate.variable, value: values?.get(id) ?? gate.value, source: gate.variable };
		const nextPath = new Set(path).add(id);
		const wires = incoming.get(id) ?? [];
		const children: Expr[] = Array.from({ length: gate.inputs }, (_, index) => {
			const wire = wires.find((item) => item.input === index);
			return wire ? build(wire.from, nextPath) : UNKNOWN;
		});
		if (gate.kind === "OUTPUT") return children[0];
		if (children.some((child) => child.value === null)) return { text: "—", value: null, source: null };
		const text = gate.kind === "NOT"
			? `¬${children[0].text}`
			: `(${children[0].text} ${gate.symbol} ${children[1].text})`;
		const source = gate.kind === "NOT"
			? `~${children[0].source}`
			: `(${children[0].source} ${CORE_OPERATOR[gate.kind]} ${children[1].source})`;
		return { text, source, value: evaluate(gate.kind, Boolean(children[0].value), Boolean(children[1]?.value)) };
	}

	const inputs = placedGates.filter((gate) => gate.kind === "INPUT");
	return {
		inputs,
		outputs: sinks.map((gate, index) => {
			const ancestors = collectHighlight(gate.id, connections).gateIds;
			return {
				gate,
				expr: build(gate.id),
				label: gate.kind === "OUTPUT" ? (gate.variable || `Y${index + 1}`) : `F${index + 1}`,
				inputs: inputs.filter((input) => ancestors.has(input.id)),
			};
		}),
	};
}

/** Every gate and wire that feeds the given output; empty when nothing is selected. */
export function collectHighlight(outputId: number | null, connections: Connection[]): Highlight {
	const gateIds = new Set<number>();
	const wireIds = new Set<number>();
	if (outputId === null) return { gateIds, wireIds };
	const incoming = incomingByTarget(connections);
	const visit = (id: number) => {
		if (gateIds.has(id)) return;
		gateIds.add(id);
		(incoming.get(id) ?? []).forEach((wire) => {
			wireIds.add(wire.id);
			visit(wire.from);
		});
	};
	visit(outputId);
	return { gateIds, wireIds };
}

/** Index of the truth-table row matching the inputs' current values (first input = high bit). */
export function currentRow(inputs: PlacedGate[]) {
	return inputs.reduce((row, input) => row * 2 + (input.value ? 1 : 0), 0);
}
