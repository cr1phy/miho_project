import { gateItems } from "../constants";
import type { GateDefinition } from "../types";

type Props = { onAddGate: (definition: GateDefinition) => void };

const isTerminal = (gate: GateDefinition) => gate.kind === "INPUT" || gate.kind === "OUTPUT";
const groups = [
	{ title: "Сигналы", items: gateItems.filter(isTerminal) },
	{ title: "Вентили", items: gateItems.filter((gate) => !isTerminal(gate)) },
];

export function Sidebar({ onAddGate }: Props) {
	return (
		<aside className="sidebar">
			{groups.map((group) => (
				<section className="gate-group" key={group.title}>
					<h2 className="panel-title">{group.title}</h2>
					<div className="gate-list">
						{group.items.map((gate) => (
							<button className={`gate-item ${gate.kind === "INPUT" ? "input-item" : ""}`} data-gate-kind={gate.kind} type="button" key={gate.kind} onClick={() => onAddGate(gate)}>
								<span className="gate-symbol">{gate.symbol}</span><span className="gate-label">{gate.name}</span><span className="add-mark">+</span>
							</button>
						))}
					</div>
				</section>
			))}
		</aside>
	);
}
