import { useEffect, useState } from "react";
import { findFreeSlot } from "../lib/geometry";
import { wouldCreateCycle } from "../lib/graph";
import { loadWorkspace, saveWorkspace } from "../lib/storage";
import type { Connection, GateDefinition, PlacedGate, Point, WireDraft } from "../types";

function variableName(definition: GateDefinition, nextVariable: number, placedGates: PlacedGate[]) {
	if (definition.kind === "INPUT") return nextVariable < 26 ? String.fromCharCode(65 + nextVariable) : `X${nextVariable - 25}`;
	if (definition.kind === "OUTPUT") return `Y${placedGates.filter((gate) => gate.kind === "OUTPUT").length || ""}`;
	return "";
}

/** All editor state (circuit, selection, wire being drawn, theme) and the actions that change it. */
export function useWorkspace() {
	const [initial] = useState(loadWorkspace);
	const [placedGates, setPlacedGates] = useState<PlacedGate[]>(initial.placedGates ?? []);
	const [connections, setConnections] = useState<Connection[]>(initial.connections ?? []);
	const [nextId, setNextId] = useState(initial.nextId ?? 1);
	const [nextWireId, setNextWireId] = useState(initial.nextWireId ?? 1);
	const [nextVariable, setNextVariable] = useState(initial.nextVariable ?? 0);
	const [isDark, setIsDark] = useState(initial.isDark ?? false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [selectedWireId, setSelectedWireId] = useState<number | null>(null);
	const [selectedOutputId, setSelectedOutputId] = useState<number | null>(null);
	const [wireDraft, setWireDraft] = useState<WireDraft | null>(null);
	const [notice, setNotice] = useState("");

	useEffect(() => {
		saveWorkspace({ version: 2, placedGates, connections, nextId, nextWireId, nextVariable, isDark });
	}, [placedGates, connections, nextId, nextWireId, nextVariable, isDark]);

	// A rejection message fades on its own; the hint shown while a wire is being drawn stays.
	useEffect(() => {
		if (!notice || wireDraft) return;
		const timer = window.setTimeout(() => setNotice(""), 4000);
		return () => window.clearTimeout(timer);
	}, [notice, wireDraft]);

	function addGate(definition: GateDefinition, canvasWidth: number) {
		const position = findFreeSlot(placedGates, definition, canvasWidth);
		const variable = variableName(definition, nextVariable, placedGates);
		setPlacedGates((current) => [...current, { ...definition, id: nextId, variable, value: false, ...position }]);
		setNextId((current) => current + 1);
		if (definition.kind === "INPUT") setNextVariable((current) => current + 1);
		setNotice("");
	}

	function removeGate(id: number) {
		setPlacedGates((current) => current.filter((gate) => gate.id !== id));
		setConnections((current) => current.filter((wire) => wire.from !== id && wire.to !== id));
		setSelectedId((current) => current === id ? null : current);
		setSelectedOutputId((current) => current === id ? null : current);
		setSelectedWireId(null);
		setWireDraft((current) => current?.from === id ? null : current);
		setNotice("");
	}

	function moveGate(id: number, x: number, y: number) {
		setPlacedGates((current) => current.map((gate) => gate.id === id ? { ...gate, x, y } : gate));
	}

	function toggleInput(id: number) {
		setPlacedGates((current) => current.map((gate) => gate.id === id ? { ...gate, value: !gate.value } : gate));
	}

	function selectGate(id: number) {
		setSelectedId(id);
		setSelectedWireId(null);
	}

	function clearSelection() {
		setSelectedId(null);
		setSelectedWireId(null);
	}

	function toggleOutput(id: number) {
		setSelectedOutputId((current) => current === id ? null : id);
		clearSelection();
	}

	function removeConnection(id: number) {
		setConnections((current) => current.filter((wire) => wire.id !== id));
		clearSelection();
	}

	/** Starts drawing a wire from a gate's output. Returns false if the gate has no output. */
	function startWire(from: number, point: Point) {
		const source = placedGates.find((gate) => gate.id === from);
		if (!source || source.kind === "OUTPUT") return false;
		setWireDraft({ from, ...point });
		selectGate(from);
		setNotice("Перетащите линию к свободному входу элемента");
		return true;
	}

	function moveWire(point: Point) {
		setWireDraft((current) => current ? { ...current, ...point } : current);
	}

	function rejectWire(reason: string) {
		setNotice(reason);
		setWireDraft(null);
	}

	/** Drops the wire being drawn onto input pin `input` of gate `to`. */
	function finishWire(to: number, input: number) {
		if (!wireDraft) return;
		const from = wireDraft.from;
		const source = placedGates.find((gate) => gate.id === from);
		const target = placedGates.find((gate) => gate.id === to);
		if (!source || !target || source.kind === "OUTPUT" || target.kind === "INPUT" || input < 0 || input >= target.inputs) {
			return rejectWire("Это соединение невозможно: выберите выход и допустимый вход элемента");
		}
		if (from === to) return rejectWire("Нельзя соединить элемент с самим собой");
		if (wouldCreateCycle(connections, from, to)) return rejectWire("Цикл запрещён: схема должна идти от входов к выходу");
		// A pin holds one wire: the new wire replaces whatever was connected there.
		setConnections((current) => [
			...current.filter((wire) => !(wire.to === to && wire.input === input)),
			{ id: nextWireId, from, to, input },
		]);
		setNextWireId((current) => current + 1);
		setSelectedWireId(null);
		setWireDraft(null);
		setNotice("");
	}

	function cancelWire() {
		setWireDraft(null);
		setNotice("");
	}

	function clearWorkspace() {
		if (placedGates.length && !window.confirm("Очистить всю рабочую область?")) return;
		setPlacedGates([]);
		setConnections([]);
		setNextId(1);
		setNextWireId(1);
		setNextVariable(0);
		setSelectedId(null);
		setSelectedWireId(null);
		setSelectedOutputId(null);
		setWireDraft(null);
		setNotice("");
	}

	function toggleTheme() {
		setIsDark((current) => !current);
	}

	return {
		placedGates, connections, isDark, selectedId, selectedWireId, selectedOutputId, wireDraft, notice,
		addGate, removeGate, moveGate, toggleInput,
		selectGate, clearSelection, toggleOutput,
		removeConnection, startWire, moveWire, finishWire, cancelWire,
		clearWorkspace, toggleTheme,
	};
}

export type Workspace = ReturnType<typeof useWorkspace>;
