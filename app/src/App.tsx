import { useMemo, useRef } from "react";
import "./App.css";
import { Canvas } from "./components/Canvas";
import { FormulaPanel } from "./components/FormulaPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { TruthPanel } from "./components/TruthPanel";
import { DEFAULT_CANVAS_WIDTH } from "./constants";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import { useTruthTables } from "./hooks/useTruthTables";
import { useWorkspace } from "./hooks/useWorkspace";
import { buildExpressionData, collectHighlight, currentRow } from "./lib/expression";

function App() {
	const workspace = useWorkspace();
	const { placedGates, connections, selectedOutputId, isDark } = workspace;
	const canvasRef = useRef<HTMLDivElement | null>(null);
	useEditorShortcuts(workspace);

	const expressionData = useMemo(() => buildExpressionData(placedGates, connections), [placedGates, connections]);
	const highlight = useMemo(() => collectHighlight(selectedOutputId, connections), [selectedOutputId, connections]);
	const { outputs } = expressionData;
	const tables = useTruthTables(placedGates, connections, outputs);

	// The value of an output is read from its truth table, so in the desktop app it comes from the core.
	// Without a table the editor's own value is shown, unless the core rejected the formula.
	const outputValues = useMemo(() => new Map(outputs.map((output) => {
		const table = tables.get(output.gate.id);
		const value = table?.status === "ready" ? table.rows[currentRow(output.inputs)] ?? null
			: table?.status === "error" && table.fromCore ? null
			: output.expr.value;
		return [output.gate.id, value];
	})), [outputs, tables]);

	const shownOutput = outputs.find((output) => output.gate.id === selectedOutputId) ?? outputs[0] ?? null;

	return (
		<main className={`app-shell ${isDark ? "dark-theme" : "light-theme"}`}>
			<TopBar isDark={isDark} onToggleTheme={workspace.toggleTheme} />

			<section className="editor-layout">
				<Sidebar onAddGate={(definition) => workspace.addGate(definition, canvasRef.current?.clientWidth ?? DEFAULT_CANVAS_WIDTH)} />

				<section className="workspace-column">
					<div className="workspace-heading">
						<h1 className="workspace-title">Схема</h1>
						<span className="workspace-meta">{placedGates.length > 0 && `элементов: ${placedGates.length} · соединений: ${connections.length}`}</span>
						<div className="workspace-actions"><button className="clear-button" type="button" onClick={workspace.clearWorkspace} disabled={placedGates.length === 0}>Очистить</button></div>
					</div>
					<Canvas canvasRef={canvasRef} workspace={workspace} highlight={highlight} outputValues={outputValues} />
					<div className="results-grid">
						<FormulaPanel outputs={outputs} values={outputValues} selectedOutputId={selectedOutputId} onToggleOutput={workspace.toggleOutput} />
						<TruthPanel output={shownOutput} table={shownOutput ? tables.get(shownOutput.gate.id) : undefined} />
					</div>
				</section>
			</section>
			<footer className="app-footer"><strong>Prototype 0.5.0</strong></footer>
		</main>
	);
}

export default App;
