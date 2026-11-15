import { beforeEach, describe, expect, test } from "bun:test";
import { STORAGE_KEY, gateItems } from "../src/constants";
import { MAX_FORMULA_LENGTH, buildExpressionData, collectHighlight, currentRow } from "../src/lib/expression";
import { findFreeSlot, gateHeight, gateWidth } from "../src/lib/geometry";
import { wouldCreateCycle } from "../src/lib/graph";
import { inputName, outputName } from "../src/lib/names";
import { loadWorkspace } from "../src/lib/storage";
import type { Connection, GateKind, PlacedGate } from "../src/types";

const definition = (kind: GateKind) => gateItems.find((item) => item.kind === kind)!;
let nextId = 0;
const gate = (kind: GateKind, extra: Partial<PlacedGate> = {}): PlacedGate =>
	({ ...definition(kind), id: ++nextId, x: 0, y: 0, variable: "", value: false, ...extra });
const wire = (from: PlacedGate, to: PlacedGate, input = 0): Connection => ({ id: ++nextId, from: from.id, to: to.id, input });

describe("formulas", () => {
	const tables: [GateKind, string, string][] = [
		["AND", "&", "0001"], ["OR", "|", "0111"], ["XOR", "^", "0110"],
		["NAND", "~&", "1110"], ["NOR", "~|", "1000"], ["XNOR", "==", "1001"],
	];
	for (const [kind, operator, table] of tables) {
		test(`${kind}: truth table and core notation`, () => {
			const a = gate("INPUT", { variable: "A" }), b = gate("INPUT", { variable: "B" }), g = gate(kind), out = gate("OUTPUT", { variable: "Y" });
			const wires = [wire(a, g, 0), wire(b, g, 1), wire(g, out)];
			const rows = [[false, false], [false, true], [true, false], [true, true]].map(([x, y]) =>
				buildExpressionData([a, b, g, out], wires, new Map([[a.id, x], [b.id, y]])).outputs[0].expr.value ? "1" : "0");
			expect(rows.join("")).toBe(table);
			expect(buildExpressionData([a, b, g, out], wires).outputs[0].expr.source).toBe(`(A ${operator} B)`);
		});
	}

	test("nested formula, its inputs and the current row", () => {
		const a = gate("INPUT", { variable: "A", value: true }), b = gate("INPUT", { variable: "B" }), c = gate("INPUT", { variable: "C", value: true });
		const unused = gate("INPUT", { variable: "D" });
		const and = gate("AND"), not = gate("NOT"), or = gate("OR"), out = gate("OUTPUT", { variable: "Y" });
		const wires = [wire(a, and, 0), wire(b, and, 1), wire(c, not), wire(and, or, 0), wire(not, or, 1), wire(or, out)];
		const [output] = buildExpressionData([a, b, c, unused, and, not, or, out], wires).outputs;
		expect(output.expr).toEqual({ text: "((A ∧ B) ∨ ¬C)", source: "((A & B) | ~C)", value: false });
		expect(output.inputs.map((input) => input.variable)).toEqual(["A", "B", "C"]);
		expect(currentRow(output.inputs)).toBe(0b101);
	});

	test("an unfinished circuit shows ? for free pins and has no value", () => {
		const a = gate("INPUT", { variable: "A" }), and = gate("AND"), out = gate("OUTPUT", { variable: "Y" }), empty = gate("OUTPUT", { variable: "Y1" });
		const { outputs } = buildExpressionData([a, and, out, empty], [wire(a, and, 0), wire(and, out)]);
		expect(outputs.map((output) => output.expr)).toEqual([
			{ text: "(A ∧ ?)", source: null, value: null },
			{ text: "?", source: null, value: null },
		]);
	});

	test("a shared sub-circuit neither freezes the editor nor produces a huge formula", () => {
		const gates = [gate("INPUT", { variable: "A", value: true })];
		const wires: Connection[] = [];
		for (let layer = 0; layer < 60; layer++) {
			const next = gate("AND"), previous = gates[gates.length - 1];
			wires.push(wire(previous, next, 0), wire(previous, next, 1));
			gates.push(next);
		}
		const started = performance.now();
		const [output] = buildExpressionData(gates, wires).outputs;
		expect(performance.now() - started).toBeLessThan(1000);
		expect(output.expr.text.length).toBeLessThanOrEqual(MAX_FORMULA_LENGTH);
		expect(output.expr).toMatchObject({ source: null, value: true });
	});

	test("highlight collects everything feeding an output", () => {
		const a = gate("INPUT"), not = gate("NOT"), out = gate("OUTPUT"), other = gate("NOT");
		const wires = [wire(a, not), wire(not, out), wire(a, other)];
		expect([...collectHighlight(out.id, wires).gateIds].sort()).toEqual([a.id, not.id, out.id].sort());
		expect(collectHighlight(null, wires).gateIds.size).toBe(0);
	});
});

describe("graph and geometry", () => {
	test("cycle detection", () => {
		const wires: Connection[] = [{ id: 1, from: 1, to: 2, input: 0 }, { id: 2, from: 2, to: 3, input: 0 }];
		expect(wouldCreateCycle(wires, 3, 1)).toBe(true);
		expect(wouldCreateCycle(wires, 1, 3)).toBe(false);
	});

	test("outputs are as narrow as inputs", () => {
		expect(gateWidth("OUTPUT")).toBe(gateWidth("INPUT"));
		expect(gateWidth("AND")).toBeGreaterThan(gateWidth("OUTPUT"));
	});

	test("new gates never overlap existing ones", () => {
		const placed: PlacedGate[] = [];
		for (const kind of ["OUTPUT", "AND", "INPUT", "OUTPUT", "OR", "INPUT", "NOT", "XOR"] as GateKind[]) {
			const added = gate(kind, findFreeSlot(placed, definition(kind), 760));
			for (const other of placed) {
				const apart = added.x >= other.x + gateWidth(other.kind) || other.x >= added.x + gateWidth(added.kind) ||
					added.y >= other.y + gateHeight(other.kind) || other.y >= added.y + gateHeight(added.kind);
				expect(apart).toBe(true);
			}
			placed.push(added);
		}
	});
});

describe("terminal names", () => {
	test("inputs: A…Z, then X1, X2", () => {
		expect([0, 25, 26, 27].map(inputName)).toEqual(["A", "Z", "X1", "X2"]);
	});

	test("a new output takes the first free name", () => {
		const outputs = ["Y", "Y1", "Y2"].map((variable) => gate("OUTPUT", { variable }));
		expect(outputName([])).toBe("Y");
		expect(outputName(outputs)).toBe("Y3");
		expect(outputName(outputs.slice(1))).toBe("Y");
		expect(outputName([outputs[0], outputs[2]])).toBe("Y1");
	});
});

describe("saved workspace", () => {
	const store = new Map<string, string>();
	beforeEach(() => {
		store.clear();
		globalThis.localStorage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) } as Storage;
	});
	const load = (value: unknown) => {
		store.set(STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));
		return loadWorkspace();
	};
	const saved = (id: number, kind: string) => ({ id, kind, x: 0, y: 0, variable: "", value: false });

	test("garbage is ignored", () => {
		expect(load("not json")).toEqual({});
		expect(load("null")).toEqual({});
	});

	test("invalid gates and wires are dropped", () => {
		const workspace = load({
			placedGates: [saved(1, "INPUT"), saved(2, "NOT"), saved(3, "NOT"), saved(4, "BOGUS"), { id: "x" }],
			connections: [
				{ id: 1, from: 1, to: 2, input: 0 }, { id: 2, from: 2, to: 3, input: 0 },
				{ id: 3, from: 3, to: 2, input: 0 }, // pin already taken (and a cycle)
				{ id: 4, from: 2, to: 1, input: 0 }, // into an input
				{ id: 5, from: 1, to: 3, input: 5 }, // no such pin
				{ id: 6, from: 9, to: 2, input: 0 }, // no such gate
			],
		});
		expect(workspace.placedGates?.map((item) => item.id)).toEqual([1, 2, 3]);
		expect(workspace.connections?.map((item) => item.id)).toEqual([1, 2]);
	});

	test("duplicate ids are dropped and counters never fall behind the data", () => {
		const workspace = load({
			placedGates: [saved(5, "INPUT"), saved(5, "NOT"), saved(7, "INPUT")],
			connections: [],
			nextId: 2, nextWireId: -4, nextVariable: -3,
		});
		expect(workspace.placedGates?.map((item) => item.id)).toEqual([5, 7]);
		expect(workspace).toMatchObject({ nextId: 8, nextWireId: 1, nextVariable: 2 });
	});
});
