import type { GateDefinition, PlacedGate } from "../types";

/** Name of the `index`-th input: A…Z, then X1, X2, … */
export function inputName(index: number) {
	return index < 26 ? String.fromCharCode(65 + index) : `X${index - 25}`;
}

/** First of Y, Y1, Y2, … that no existing output uses, so names stay unique after deletions. */
export function outputName(placedGates: PlacedGate[]) {
	const taken = new Set(placedGates.filter((gate) => gate.kind === "OUTPUT").map((gate) => gate.variable));
	let index = 0;
	while (taken.has(index === 0 ? "Y" : `Y${index}`)) index += 1;
	return index === 0 ? "Y" : `Y${index}`;
}

export function terminalName(definition: GateDefinition, nextVariable: number, placedGates: PlacedGate[]) {
	if (definition.kind === "INPUT") return inputName(nextVariable);
	if (definition.kind === "OUTPUT") return outputName(placedGates);
	return "";
}
