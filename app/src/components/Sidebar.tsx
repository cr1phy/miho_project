import { gateItems } from "../constants";
import type { GateDefinition } from "../types";

type Props = { onAddGate: (definition: GateDefinition) => void };

export function Sidebar({ onAddGate }: Props) {
	return (
		<aside className="sidebar">
			<div className="gate-list">
				{gateItems.map((gate) => (
					<button className={`gate-item ${gate.kind === "INPUT" ? "input-item" : ""}`} data-gate-kind={gate.kind} type="button" key={gate.kind} onClick={() => onAddGate(gate)}>
						<span className="gate-symbol">{gate.symbol}</span><span className="gate-label">{gate.name}</span><span className="add-mark">+</span>
					</button>
				))}
			</div>
		</aside>
	);
}
