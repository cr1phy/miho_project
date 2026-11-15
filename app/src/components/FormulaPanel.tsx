import type { OutputExpression } from "../types";

type Props = {
	outputs: OutputExpression[];
	/** Current value of each output by gate id; null when it cannot be computed yet. */
	values: Map<number, boolean | null>;
	selectedOutputId: number | null;
	onToggleOutput: (id: number) => void;
};

export function FormulaPanel({ outputs, values, selectedOutputId, onToggleOutput }: Props) {
	return (
		<section className="formula-panel">
			<div className="panel-heading">
				<h2 className="panel-title">Формулы</h2>
				{outputs.length > 0 && <span className="panel-hint">нажмите, чтобы подсветить цепь</span>}
			</div>
			{outputs.length === 0 ? <p className="panel-empty">Здесь появятся формулы выходов схемы.</p> : (
				<div className="formula-results">
					{outputs.map(({ gate, expr, label }) => {
						const value = values.get(gate.id) ?? null;
						return (
							<button type="button" className={`formula-result ${selectedOutputId === gate.id ? "formula-result-active" : ""}`} key={gate.id} onClick={() => onToggleOutput(gate.id)}>
								<span className="output-label">{label} =</span><code>{expr.text}</code>
								<span className={`result-value ${value === null ? "" : value ? "true" : "false"}`} aria-label="Текущее значение">{value === null ? "?" : value ? 1 : 0}</span>
							</button>
						);
					})}
				</div>
			)}
		</section>
	);
}
