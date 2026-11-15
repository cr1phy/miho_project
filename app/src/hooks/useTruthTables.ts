import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_TABLE_VARIABLES, coreAvailable, coreTruthTable } from "../lib/core";
import { buildExpressionData } from "../lib/expression";
import type { Connection, OutputExpression, PlacedGate, TableState } from "../types";

const MAX_CACHED_TABLES = 200;

/** Fallback for a plain browser tab, where the C++ core is not available. */
function browserTruthTable(output: OutputExpression, placedGates: PlacedGate[], connections: Connection[]) {
	const count = output.inputs.length;
	return Array.from({ length: 2 ** count }, (_, row) => {
		const values = new Map(output.inputs.map((input, index) => [input.id, (row >> (count - 1 - index) & 1) === 1]));
		const result = buildExpressionData(placedGates, connections, values).outputs.find((item) => item.gate.id === output.gate.id);
		return result?.expr.value ?? false;
	});
}

/**
 * Truth table of every output, by gate id. In the desktop app the tables come from the
 * C++ core; a table is requested once per formula and reused while only input values
 * or gate positions change.
 */
export function useTruthTables(placedGates: PlacedGate[], connections: Connection[], outputs: OutputExpression[]) {
	const [cache, setCache] = useState(() => new Map<string, TableState>());
	const inFlight = useRef(new Set<string>());

	const requests = useMemo(() => outputs.map((output) => {
		const names = output.inputs.map((input) => input.variable);
		const source = output.expr.source;
		let problem: TableState | null = null;
		// A complete circuit without a core formula is one whose formula was cut off as too long.
		if (source === null) problem = output.expr.value === null ? { status: "incomplete" } : { status: "error", fromCore: false, message: "Формула слишком длинная для таблицы истинности" };
		else if (names.length > MAX_TABLE_VARIABLES) problem = { status: "error", fromCore: false, message: `Слишком много переменных: ${names.length} (максимум ${MAX_TABLE_VARIABLES})` };
		return { output, names, source, problem, key: `${source}\n${names.join(",")}` };
	}), [outputs]);

	useEffect(() => {
		for (const request of requests) {
			const { key, source } = request;
			if (request.problem || source === null || cache.has(key) || inFlight.current.has(key)) continue;
			inFlight.current.add(key);
			const store = (state: TableState) => {
				inFlight.current.delete(key);
				setCache((current) => new Map(current.size >= MAX_CACHED_TABLES ? [] : current).set(key, state));
			};
			const rows = coreAvailable
				? coreTruthTable(source, request.names)
				: Promise.resolve().then(() => browserTruthTable(request.output, placedGates, connections));
			rows.then(
				(result) => store({ status: "ready", rows: result }),
				(error: unknown) => store({ status: "error", fromCore: true, message: String(error) }),
			);
		}
	}, [requests, cache, placedGates, connections]);

	return useMemo(() => new Map<number, TableState>(requests.map((request) =>
		[request.output.gate.id, request.problem ?? cache.get(request.key) ?? { status: "pending" }],
	)), [requests, cache]);
}
