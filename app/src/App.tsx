import { useMemo, useRef } from "react";
import "./App.css";
import { Canvas } from "./components/Canvas";
import { FormulaPanel } from "./components/FormulaPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { DEFAULT_CANVAS_WIDTH } from "./constants";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import { useWorkspace } from "./hooks/useWorkspace";
import { buildExpressionData, collectHighlight } from "./lib/expression";

function App() {
	const workspace = useWorkspace();
	const { placedGates, connections, selectedOutputId, isDark } = workspace;
	const canvasRef = useRef<HTMLDivElement | null>(null);
	useEditorShortcuts(workspace);

	const expressionData = useMemo(() => buildExpressionData(placedGates, connections), [placedGates, connections]);
	const highlight = useMemo(() => collectHighlight(selectedOutputId, connections), [selectedOutputId, connections]);

	return (
		<main className={`app-shell ${isDark ? "dark-theme" : "light-theme"}`}>
			<TopBar isDark={isDark} onToggleTheme={workspace.toggleTheme} />

			<section className="editor-layout">
				<Sidebar onAddGate={(definition) => workspace.addGate(definition, canvasRef.current?.clientWidth ?? DEFAULT_CANVAS_WIDTH)} />

				<section className="workspace-column">
					<div className="workspace-heading">
						<div className="workspace-actions"><button className="clear-button" type="button" onClick={workspace.clearWorkspace} disabled={placedGates.length === 0}>Очистить</button></div>
					</div>
					<Canvas canvasRef={canvasRef} workspace={workspace} highlight={highlight} />
					<FormulaPanel outputs={expressionData.outputs} selectedOutputId={selectedOutputId} onToggleOutput={workspace.toggleOutput} />
				</section>
			</section>
			<footer className="app-footer"><strong>Prototype 0.4.1</strong></footer>
		</main>
	);
}

export default App;
