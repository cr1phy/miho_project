import { inputPortPoint, orthogonalPath, outputPortPoint } from "../lib/geometry";
import type { Connection, PlacedGate, WireDraft } from "../types";

type Props = {
	placedGates: PlacedGate[];
	connections: Connection[];
	highlightedWireIds: Set<number>;
	selectedWireId: number | null;
	wireDraft: WireDraft | null;
	onWireClick: (id: number) => void;
};

/** SVG overlay with every wire of the circuit and the wire currently being drawn. */
export function ConnectionsLayer({ placedGates, connections, highlightedWireIds, selectedWireId, wireDraft, onWireClick }: Props) {
	const gatesById = new Map(placedGates.map((gate) => [gate.id, gate]));
	const fanOut = new Map<number, number>();
	connections.forEach((wire) => fanOut.set(wire.from, (fanOut.get(wire.from) ?? 0) + 1));

	const lines = connections.flatMap((wire) => {
		const source = gatesById.get(wire.from);
		const target = gatesById.get(wire.to);
		if (!source || !target) return [];
		const start = outputPortPoint(source);
		const end = inputPortPoint(target, wire.input);
		const routeX = end.x > start.x + 42 ? start.x + 38 : Math.max(start.x, end.x) + 28;
		return [{ wire, end, routeX, path: orthogonalPath(start.x, start.y, end.x, end.y, routeX), branch: (fanOut.get(wire.from) ?? 0) > 1 }];
	});

	const draftSource = wireDraft ? gatesById.get(wireDraft.from) : undefined;
	const draftStart = draftSource ? outputPortPoint(draftSource) : null;

	return (
		<svg className="connections-layer" width="100%" height="100%" aria-label="Соединения">
			{lines.map(({ wire, end, routeX, path, branch }) => (
				<g key={wire.id} className={`connection-group ${highlightedWireIds.has(wire.id) ? "connection-highlighted" : ""} ${selectedWireId === wire.id ? "connection-selected" : ""}`}
					onClick={(event) => { event.stopPropagation(); onWireClick(wire.id); }}>
					<path className="connection-hit" d={path}><title>Нажмите, чтобы выделить; Delete — удалить</title></path>
					<path className="connection-line" d={path} />
					<circle className="connection-end" r="3.5" cx={end.x} cy={end.y} />
					{branch && <circle className="connection-junction" r="3.2" cx={routeX} cy={end.y} />}
				</g>
			))}
			{wireDraft && draftStart && <path className="connection-preview" d={orthogonalPath(draftStart.x, draftStart.y, wireDraft.x, wireDraft.y, draftStart.x + 38)} />}
		</svg>
	);
}
