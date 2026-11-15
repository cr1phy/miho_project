import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_TABLE_VARIABLES, coreAvailable, coreTruthTable } from "../lib/core";
import { buildExpressionData } from "../lib/expression";
import type { Connection, OutputExpression, PlacedGate, TableState } from "../types";

const MAX_SOURCE_LENGTH = 20_000;
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
		if (source === null) problem = { status: "incomplete" };
		else if (names.length > MAX_TABLE_VARIABLES) problem = { status: "error", message: `Слишком много переменных: ${names.length} (максимум ${MAX_TABLE_VARIABLES})` };
		else if (source.length > MAX_SOURCE_LENGTH) problem = { status: "error", message: "Формула слишком длинная" };
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
				(error: unknown) => store({ status: "error", message: String(error) }),
			);
		}
	}, [requests, cache, placedGates, connections]);

	return useMemo(() => new Map<number, TableState>(requests.map((request) =>
		[request.output.gate.id, request.problem ?? cache.get(request.key) ?? { status: "pending" }],
	)), [requests, cache]);
}
