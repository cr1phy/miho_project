import type { GateDefinition } from "./types";

export const STORAGE_KEY = "logic-studio-workspace-v2";

export const gateItems: GateDefinition[] = [
	{ kind: "INPUT", name: "Вход", symbol: "A", inputs: 0 },
	{ kind: "OUTPUT", name: "Выход", symbol: "F", inputs: 1 },
	{ kind: "NOT", name: "NOT", symbol: "¬", inputs: 1 },
	{ kind: "AND", name: "AND", symbol: "∧", inputs: 2 },
	{ kind: "OR", name: "OR", symbol: "∨", inputs: 2 },
	{ kind: "XOR", name: "XOR", symbol: "⊕", inputs: 2 },
	{ kind: "NAND", name: "NAND", symbol: "⊼", inputs: 2 },
	{ kind: "NOR", name: "NOR", symbol: "⊽", inputs: 2 },
	{ kind: "XNOR", name: "XNOR", symbol: "⊙", inputs: 2 },
];

export const NODE_WIDTH = 118;
export const NODE_HEIGHT = 96;
export const INPUT_WIDTH = 92;
export const INPUT_HEIGHT = 70;

/** Canvas width assumed before the canvas element is mounted. */
export const DEFAULT_CANVAS_WIDTH = 760;
export const MIN_CANVAS_HEIGHT = 540;
