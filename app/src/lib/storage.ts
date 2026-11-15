import { STORAGE_KEY, gateItems } from "../constants";
import type { Connection, PlacedGate, SavedWorkspace } from "../types";
import { wouldCreateCycle } from "./graph";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function parseGates(raw: unknown): PlacedGate[] {
	if (!Array.isArray(raw)) return [];
	const seenIds = new Set<number>();
	return raw.flatMap((gate): PlacedGate[] => {
		if (!isRecord(gate)) return [];
		const definition = gateItems.find((item) => item.kind === gate.kind);
		if (!definition || !isFiniteNumber(gate.id) || !isFiniteNumber(gate.x) || !isFiniteNumber(gate.y) ||
			typeof gate.variable !== "string" || typeof gate.value !== "boolean" || seenIds.has(gate.id)) return [];
		seenIds.add(gate.id);
		// Restore the canonical label and pin count for each gate kind. This repairs stale
		// or mismatched metadata saved by earlier prototype builds.
		return [{ ...definition, id: gate.id, x: gate.x, y: gate.y, variable: gate.variable, value: gate.value }];
	});
}

function parseConnections(raw: unknown, placedGates: PlacedGate[]): Connection[] {
	if (!Array.isArray(raw)) return [];
	const gatesById = new Map(placedGates.map((gate) => [gate.id, gate]));
	const candidates = raw.filter((wire): wire is Connection =>
		isRecord(wire) && isFiniteNumber(wire.id) && isFiniteNumber(wire.from) && isFiniteNumber(wire.to) &&
		typeof wire.input === "number" && Number.isInteger(wire.input) &&
		gatesById.has(wire.from) && gatesById.has(wire.to) && wire.from !== wire.to
	);
	const connections: Connection[] = [];
	const seenIds = new Set<number>();
	for (const wire of candidates) {
		const source = gatesById.get(wire.from);
		const target = gatesById.get(wire.to);
		if (!source || !target || source.kind === "OUTPUT" || target.kind === "INPUT" || wire.input < 0 || wire.input >= target.inputs) continue;
		if (seenIds.has(wire.id) || connections.some((item) => item.to === wire.to && item.input === wire.input)) continue;
		if (wouldCreateCycle(connections, wire.from, wire.to)) continue;
		seenIds.add(wire.id);
		connections.push(wire);
	}
	return connections;
}

/** A saved counter is trusted only if it is not behind what the saved data already uses. */
function counter(value: unknown, minimum: number) {
	return typeof value === "number" && Number.isInteger(value) ? Math.max(value, minimum) : minimum;
}

/** Reads the saved workspace, dropping anything that is malformed or inconsistent. */
export function loadWorkspace(): Partial<SavedWorkspace> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return {};
		const placedGates = parseGates(parsed.placedGates);
		const connections = parseConnections(parsed.connections, placedGates);
		return {
			placedGates,
			connections,
			nextId: counter(parsed.nextId, Math.max(0, ...placedGates.map((gate) => gate.id)) + 1),
			nextWireId: counter(parsed.nextWireId, Math.max(0, ...connections.map((wire) => wire.id)) + 1),
			nextVariable: counter(parsed.nextVariable, placedGates.filter((gate) => gate.kind === "INPUT").length),
			isDark: typeof parsed.isDark === "boolean" ? parsed.isDark : false,
		};
	} catch {
		return {};
	}
}

export function saveWorkspace(data: SavedWorkspace) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// The editor remains usable if browser storage is unavailable.
	}
}
