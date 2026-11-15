import type { GateKind } from "../types";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 2.8 } as const;

function Bubble({ cx }: { cx: number }) {
	return <circle cx={cx} cy="48" r="7" fill="var(--surface)" stroke="currentColor" strokeWidth="2.8" />;
}

/** Schematic symbol of a logic gate; renders nothing for input and output terminals. */
export function GateGlyph({ kind }: { kind: GateKind }) {
	const inverted = kind === "NAND" || kind === "NOR" || kind === "XNOR";
	const xor = kind === "XOR" || kind === "XNOR";
	if (kind === "NOT") return (
		<svg className="gate-glyph" viewBox="0 0 118 96" aria-label="NOT">
			<path d="M 0 48 H 24 M 92 48 H 118" {...STROKE} />
			<path d="M 24 16 L 78 48 L 24 80 Z" {...STROKE} strokeLinejoin="round" />
			<Bubble cx={85} />
		</svg>
	);
	if (kind === "AND" || kind === "NAND") return (
		<svg className="gate-glyph" viewBox="0 0 118 96" aria-label={kind}>
			<path d={`M 0 30 H 24 M 0 66 H 24 M ${inverted ? 105 : 90} 48 H 118`} {...STROKE} />
			<path d="M 24 15 H 57 A 33 33 0 0 1 57 81 H 24 Z" {...STROKE} strokeLinejoin="round" />
			{inverted && <Bubble cx={98} />}
		</svg>
	);
	if (kind === "OR" || kind === "NOR" || xor) return (
		<svg className="gate-glyph" viewBox="0 0 118 96" aria-label={kind}>
			{xor && <path d="M 17 15 Q 48 48 17 81" {...STROKE} />}
			<path d="M 0 30 H 32 M 0 66 H 32" {...STROKE} />
			<path d="M 24 15 Q 48 48 24 81 Q 73 78 94 48 Q 73 18 24 15 Z" {...STROKE} strokeLinejoin="round" />
			{inverted && <Bubble cx={102} />}
			<path d={`M ${inverted ? 109 : 94} 48 H 118`} {...STROKE} />
		</svg>
	);
	return null;
}
