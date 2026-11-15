import type { PointerEvent as ReactPointerEvent } from "react";
import { inputPortOffset } from "../lib/geometry";
import type { PlacedGate } from "../types";
import { GateGlyph } from "./GateGlyph";

type Props = {
	gate: PlacedGate;
	selected: boolean;
	highlighted: boolean;
	formulaRoot: boolean;
	/** Whether each input pin already has a wire, by pin index. */
	filledInputs: boolean[];
	wireActive: boolean;
	/** Signal on a terminal: the input's own value or the computed value of an output. */
	value: boolean | null;
	onDragStart: (event: ReactPointerEvent<HTMLDivElement>, gate: PlacedGate) => void;
	onDragMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
	onDragEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
	onSelect: (id: number) => void;
	onToggle: (id: number) => void;
	onRemove: (id: number) => void;
	onWireStart: (event: ReactPointerEvent<HTMLButtonElement>, gate: PlacedGate) => void;
};

// Buttons inside a gate must not start a drag of the gate itself.
const stopPointer = (event: ReactPointerEvent) => event.stopPropagation();

export function GateNode({ gate, selected, highlighted, formulaRoot, filledInputs, wireActive, value, onDragStart, onDragMove, onDragEnd, onSelect, onToggle, onRemove, onWireStart }: Props) {
	const className = [
		"placed-gate",
		gate.kind === "INPUT" && "placed-input",
		gate.kind === "OUTPUT" && "placed-output",
		selected && "selected",
		highlighted && "formula-highlighted",
		formulaRoot && "formula-root",
	].filter(Boolean).join(" ");

	const inputPorts = filledInputs.map((filled, index) => (
		<button key={index} className={`port input-port ${filled ? "port-filled" : ""}`} style={{ top: inputPortOffset(gate.kind, index) }}
			data-gate-id={gate.id} data-input-index={index} type="button"
			aria-label={gate.kind === "OUTPUT" ? "Вход выхода" : `Вход ${index + 1}`} onPointerDown={stopPointer} />
	));
	const removeButton = <button className="remove-gate" type="button" aria-label="Удалить" onPointerDown={stopPointer} onClick={() => onRemove(gate.id)}>×</button>;

	return (
		<div className={className} style={{ left: gate.x, top: gate.y }}
			onPointerDown={(event) => onDragStart(event, gate)} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
			onClick={() => onSelect(gate.id)}>
			{gate.kind === "INPUT" ? <>
				<div className="input-terminal"><span className="input-node-letter">{gate.variable}</span><span className={`terminal-ring ${value ? "is-on" : ""}`} /></div>
				<button className={`value-toggle ${gate.value ? "is-on" : ""}`} type="button" aria-label={`Значение ${gate.variable}`} title="Переключить значение" onPointerDown={stopPointer} onClick={() => onToggle(gate.id)}>{gate.value ? "1" : "0"}</button>
				{removeButton}
			</> : gate.kind === "OUTPUT" ? <>
				<div className="output-terminal"><span className={`terminal-ring filled ${value ? "is-on" : ""}`} /><strong>{gate.variable || "Y"}</strong>{value !== null && <span className={`terminal-value ${value ? "is-on" : ""}`}>{value ? 1 : 0}</span>}</div>
				{removeButton}
				{inputPorts}
			</> : <>
				<GateGlyph kind={gate.kind} />
				{removeButton}
				{inputPorts}
			</>}
			{gate.kind !== "OUTPUT" && <button className={`port output-port ${wireActive ? "port-active" : ""}`} type="button" aria-label="Выход" onPointerDown={(event) => onWireStart(event, gate)} />}
		</div>
	);
}
