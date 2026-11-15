import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { MIN_CANVAS_HEIGHT } from "../constants";
import type { Workspace } from "../hooks/useWorkspace";
import { gateHeight, gateWidth } from "../lib/geometry";
import type { Highlight, PlacedGate } from "../types";
import { ConnectionsLayer } from "./ConnectionsLayer";
import { GateNode } from "./GateNode";

type Props = {
	canvasRef: RefObject<HTMLDivElement | null>;
	workspace: Workspace;
	highlight: Highlight;
};

type DragInfo = { id: number; pointerId: number; startX: number; startY: number; originX: number; originY: number };

/** The drawing area: owns pointer handling for dragging gates and drawing wires. */
export function Canvas({ canvasRef, workspace, highlight }: Props) {
	const { placedGates, connections, selectedId, selectedWireId, selectedOutputId, wireDraft } = workspace;
	const dragRef = useRef<DragInfo | null>(null);

	function pointInCanvas(clientX: number, clientY: number) {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return { x: clientX - rect.left, y: clientY - rect.top };
	}

	function startDrag(event: ReactPointerEvent<HTMLDivElement>, gate: PlacedGate) {
		if ((event.target as HTMLElement).closest("button, .port")) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { id: gate.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: gate.x, originY: gate.y };
		workspace.selectGate(gate.id);
	}

	function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
		const drag = dragRef.current;
		const canvas = canvasRef.current;
		if (!drag || !canvas || drag.pointerId !== event.pointerId) return;
		const kind = placedGates.find((gate) => gate.id === drag.id)?.kind;
		// Keep the gate inside the canvas with an 8px margin.
		const maxX = Math.max(8, canvas.clientWidth - gateWidth(kind) - 8);
		const maxY = Math.max(8, canvas.clientHeight - gateHeight(kind) - 8);
		const x = Math.min(maxX, Math.max(8, drag.originX + event.clientX - drag.startX));
		const y = Math.min(maxY, Math.max(8, drag.originY + event.clientY - drag.startY));
		workspace.moveGate(drag.id, x, y);
	}

	function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
		if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
	}

	function startWire(event: ReactPointerEvent<HTMLButtonElement>, gate: PlacedGate) {
		event.preventDefault();
		event.stopPropagation();
		if (!workspace.startWire(gate.id, pointInCanvas(event.clientX, event.clientY))) return;
		// Capture on the canvas so the wire keeps following the pointer over other elements.
		canvasRef.current?.setPointerCapture(event.pointerId);
	}

	function dropWire(event: ReactPointerEvent<HTMLDivElement>) {
		if (!wireDraft) return;
		const port = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".input-port");
		if (port) workspace.finishWire(Number(port.dataset.gateId), Number(port.dataset.inputIndex));
		else workspace.cancelWire();
	}

	const height = Math.max(MIN_CANVAS_HEIGHT, ...placedGates.map((gate) => gate.y + gateHeight(gate.kind) + 36));

	return (
		<div className={`canvas ${wireDraft ? "connecting" : ""}`} ref={canvasRef} style={{ height }}
			onPointerMove={(event) => { if (wireDraft) workspace.moveWire(pointInCanvas(event.clientX, event.clientY)); }}
			onPointerUp={dropWire}
			onPointerCancel={workspace.cancelWire}
			onClick={(event) => { if (event.target === canvasRef.current) workspace.clearSelection(); }}>
			<div className="canvas-grid" />
			<ConnectionsLayer placedGates={placedGates} connections={connections} highlightedWireIds={highlight.wireIds}
				selectedWireId={selectedWireId} wireDraft={wireDraft} onWireClick={workspace.removeConnection} />
			{placedGates.map((gate) => (
				<GateNode key={gate.id} gate={gate}
					selected={selectedId === gate.id}
					highlighted={highlight.gateIds.has(gate.id)}
					formulaRoot={selectedOutputId === gate.id}
					filledInputs={Array.from({ length: gate.inputs }, (_, index) => connections.some((wire) => wire.to === gate.id && wire.input === index))}
					wireActive={wireDraft?.from === gate.id}
					onDragStart={startDrag} onDragMove={moveDrag} onDragEnd={stopDrag}
					onSelect={workspace.selectGate} onToggle={workspace.toggleInput} onRemove={workspace.removeGate}
					onWireStart={startWire} />
			))}
		</div>
	);
}
