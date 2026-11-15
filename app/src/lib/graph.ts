import type { Connection } from "../types";

/** Groups wires by the gate they end at. */
export function incomingByTarget(connections: Connection[]) {
	const incoming = new Map<number, Connection[]>();
	connections.forEach((wire) => incoming.set(wire.to, [...(incoming.get(wire.to) ?? []), wire]));
	return incoming;
}

/** True when adding a wire `from -> to` would close a loop in the existing wires. */
export function wouldCreateCycle(connections: Connection[], from: number, to: number) {
	const visited = new Set<number>();
	const stack = [to];
	while (stack.length) {
		const current = stack.pop()!;
		if (current === from) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		connections.filter((wire) => wire.from === current).forEach((wire) => stack.push(wire.to));
	}
	return false;
}
