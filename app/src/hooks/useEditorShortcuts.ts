import { useEffect } from "react";
import type { Workspace } from "./useWorkspace";

/** Escape cancels the wire being drawn or clears the selection; Delete/Backspace removes the selected wire or gate. */
export function useEditorShortcuts(workspace: Workspace) {
	const { selectedId, selectedWireId, wireDraft, cancelWire, clearSelection, removeConnection, removeGate } = workspace;

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") { if (wireDraft) cancelWire(); else clearSelection(); }
			if (event.key !== "Delete" && event.key !== "Backspace") return;
			if ((event.target as HTMLElement).closest("button, input, textarea, select")) return;
			if (selectedWireId !== null) {
				event.preventDefault();
				removeConnection(selectedWireId);
			} else if (selectedId !== null) {
				event.preventDefault();
				removeGate(selectedId);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	});
}
