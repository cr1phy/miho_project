import type { OutputExpression } from "../types";

type Props = {
	outputs: OutputExpression[];
	selectedOutputId: number | null;
	onToggleOutput: (id: number) => void;
};

export function FormulaPanel({ outputs, selectedOutputId, onToggleOutput }: Props) {
	return (
		<section className="formula-panel">
			<div className="formula-heading" />
			{outputs.length === 0 ? <div className="formula-empty">—</div> : (
				<div className="formula-results">
					{outputs.map(({ gate, expr, label }) => (
						<button type="button" className={`formula-result ${selectedOutputId === gate.id ? "formula-result-active" : ""}`} key={gate.id} onClick={() => onToggleOutput(gate.id)}>
							<span className="output-label">{label} =</span><code>{expr.text}</code>
						</button>
					))}
				</div>
			)}
		</section>
	);
}
