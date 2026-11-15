import { coreAvailable } from "../lib/core";
import { currentRow } from "../lib/expression";
import type { OutputExpression, TableState } from "../types";

type Props = { output: OutputExpression | null; table: TableState | undefined };

/** Truth table of one output, with the row matching the current input values marked. */
export function TruthPanel({ output, table }: Props) {
	const names = output?.inputs.map((input) => input.variable) ?? [];
	const active = output ? currentRow(output.inputs) : -1;

	return (
		<section className="truth-panel">
			<div className="panel-heading">
				<h2 className="panel-title">Таблица истинности</h2>
				<span className={`engine-badge ${coreAvailable ? "engine-core" : ""}`} title={coreAvailable ? "Значения вычисляет ядро на C++" : "Приложение открыто в браузере: ядро недоступно, значения считает страница"}>
					{coreAvailable ? "ядро C++" : "без ядра"}
				</span>
			</div>
			{!output || !table ? <p className="panel-empty">Добавьте выход, чтобы увидеть таблицу.</p>
				: table.status === "incomplete" ? <p className="panel-empty">Схема для {output.label} не завершена: подключите все входы элементов.</p>
				: table.status === "pending" ? <p className="panel-empty">Вычисление…</p>
				: table.status === "error" ? <p className="panel-empty panel-error">{table.message}</p>
				: <>
					<code className="core-source" title="Формула в записи ядра">{output.label} = {output.expr.source}</code>
					<div className="truth-table-wrap">
						<table className="truth-table">
							<thead><tr>{names.map((name, index) => <th key={index}>{name}</th>)}<th className="truth-result">{output.label}</th></tr></thead>
							<tbody>
								{table.rows.map((value, row) => (
									<tr key={row} className={row === active ? "truth-current" : ""}>
										{names.map((_, index) => <td key={index}>{row >> (names.length - 1 - index) & 1}</td>)}
										<td className={`truth-result ${value ? "truth-one" : "truth-zero"}`}>{value ? 1 : 0}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>}
		</section>
	);
}
