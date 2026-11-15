import { INPUT_HEIGHT, INPUT_WIDTH, NODE_HEIGHT, NODE_WIDTH } from "../constants";
import type { GateDefinition, GateKind, PlacedGate, Point } from "../types";

export function gateWidth(kind: GateKind | undefined) {
	return kind === "INPUT" ? INPUT_WIDTH : NODE_WIDTH;
}

export function gateHeight(kind: GateKind | undefined) {
	return kind === "INPUT" ? INPUT_HEIGHT : NODE_HEIGHT;
}

/** Where a wire leaves the gate (middle of its right edge). */
export function outputPortPoint(gate: PlacedGate): Point {
	return { x: gate.x + gateWidth(gate.kind), y: gate.y + gateHeight(gate.kind) / 2 };
}

/** Vertical offset of an input pin from the top of its gate. */
export function inputPortOffset(kind: GateKind, input: number) {
	if (kind === "OUTPUT" || kind === "NOT") return NODE_HEIGHT / 2;
	return input === 0 ? 30 : 66;
}

/** Where a wire enters the gate (its left edge, at the given pin). */
export function inputPortPoint(gate: PlacedGate, input: number): Point {
	return { x: gate.x, y: gate.y + inputPortOffset(gate.kind, input) };
}

export function orthogonalPath(sx: number, sy: number, tx: number, ty: number, preferredRouteX?: number) {
	const routeX = preferredRouteX ?? (tx > sx + 24 ? sx + (tx - sx) / 2 : Math.max(sx, tx) + 24);
	const bend = Math.min(10, Math.abs(ty - sy) / 2, Math.abs(tx - routeX) / 2);
	const direction = ty >= sy ? 1 : -1;
	return `M ${sx} ${sy} H ${routeX - bend} Q ${routeX} ${sy} ${routeX} ${sy + direction * bend} V ${ty - direction * bend} Q ${routeX} ${ty} ${routeX + bend} ${ty} H ${tx}`;
}

/**
 * First free grid cell for a new gate. Scanning cells instead of relying on the gate
 * count prevents overlap when gate sizes are mixed or old gates were deleted.
 */
export function findFreeSlot(placedGates: PlacedGate[], definition: GateDefinition, canvasWidth: number): Point {
	const width = gateWidth(definition.kind);
	const height = gateHeight(definition.kind);
	const columns = Math.max(1, Math.floor((canvasWidth - 32) / 160));
	let slot = 0;
	let x = 18;
	let y = 18;
	while (slot < 1000) {
		x = 18 + (slot % columns) * 160;
		y = 18 + Math.floor(slot / columns) * 132;
		const overlaps = placedGates.some((gate) => {
			// Terminals (inputs and outputs) are drawn narrower than logic gates.
			const otherWidth = gate.kind === "INPUT" || gate.kind === "OUTPUT" ? INPUT_WIDTH : NODE_WIDTH;
			const otherHeight = gateHeight(gate.kind);
			return x < gate.x + otherWidth + 18 && x + width + 18 > gate.x &&
				y < gate.y + otherHeight + 18 && y + height + 18 > gate.y;
		});
		if (!overlaps) break;
		slot += 1;
	}
	return { x, y };
}
