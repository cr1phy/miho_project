import type { Connection, Expr, ExpressionData, GateKind, Highlight, PlacedGate } from "../types";
import { incomingByTarget } from "./graph";

/** An input pin with nothing connected to it. */
const UNKNOWN: Expr = { text: "?", value: null, source: null };

/** Longer formulas are shown as "…": shared sub-circuits can double the text at every level. */
export const MAX_FORMULA_LENGTH = 2000;
const TOO_LONG = "…";

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

	// A gate feeding several others is built once; without this a shared sub-circuit is rebuilt per use.
	const built = new Map<number, Expr>();

	function build(id: number, path = new Set<number>()): Expr {
		const ready = built.get(id);
		if (ready) return ready;
		const gate = byId.get(id);
		if (!gate || path.has(id)) return UNKNOWN;
		const expr = gate.kind === "INPUT"
			? { text: gate.variable, value: values?.get(id) ?? gate.value, source: gate.variable }
			: combine(gate, path);
		built.set(id, expr);
		return expr;
	}

	function combine(gate: PlacedGate, path: Set<number>): Expr {
		const nextPath = new Set(path).add(gate.id);
		const wires = incoming.get(gate.id) ?? [];
		const children: Expr[] = Array.from({ length: gate.inputs }, (_, index) => {
			const wire = wires.find((item) => item.input === index);
			return wire ? build(wire.from, nextPath) : UNKNOWN;
		});
		if (gate.kind === "OUTPUT") return children[0];
		// An unfinished gate still shows its formula, with "?" for every free pin.
		const format = (parts: string[], not: string, operator: string) =>
			gate.kind === "NOT" ? `${not}${parts[0]}` : `(${parts[0]} ${operator} ${parts[1]})`;
		const text = format(children.map((child) => child.text), "¬", gate.symbol);
		const sources = children.map((child) => child.source);
		const source = sources.every((item) => item !== null) ? format(sources, "~", CORE_OPERATOR[gate.kind] ?? "") : null;
		const complete = children.every((child) => child.value !== null);
		return {
			text: text.length > MAX_FORMULA_LENGTH ? TOO_LONG : text,
			source: source !== null && source.length > MAX_FORMULA_LENGTH ? null : source,
			value: complete ? evaluate(gate.kind, Boolean(children[0].value), Boolean(children[1]?.value)) : null,
		};
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
