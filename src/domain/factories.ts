import { nodeDefinitions } from "./definitions";
import { createId } from "./ids";
import type {
	Board,
	BoardId,
	BoardPort,
	BoardPortRole,
	Node,
	NodeId,
	NodeKind,
	NodePort,
	Point,
	PortDirection,
	PortId,
	Wire,
} from "./types";

const createNodePort = ({
	nodeId,
	direction,
	index,
	label,
}: {
	nodeId: NodeId;
	direction: PortDirection;
	index: number;
	label?: string;
}): NodePort => ({
	id: createId("port"),
	ownerKind: "node",
	ownerId: nodeId,
	direction,
	index,
	label,
});

export const createBoard = (name: string): Board => ({
	id: createId("board"),
	name,
	nodes: {},
	wires: {},
	inputPorts: {},
	outputPorts: {},
});

export const createBoardPort = ({
	boardId,
	role,
	label,
	index,
}: {
	boardId: BoardId;
	role: BoardPortRole;
	label?: string;
	index: number;
}): BoardPort => ({
	id: createId("port"),
	ownerKind: "board",
	ownerId: boardId,
	role,
	direction: role === "boardInput" ? "output" : "input",
	index,
	label,
});

export const createNode = ({
	kind,
	position,
	rotation = 0,
	inputCount,
}: {
	kind: NodeKind;
	position: Point;
	rotation?: number;
	inputCount?: number;
}): Node => {
	const definition = nodeDefinitions[kind];
	const nodeId = createId("node");

	let normalizedInputCount = inputCount ?? definition.minInputs;
	normalizedInputCount = Math.max(definition.minInputs, normalizedInputCount);
	if (definition.maxInputs !== null) {
		normalizedInputCount = Math.min(definition.maxInputs, normalizedInputCount);
	}

	const inputPorts: Record<PortId, NodePort> = {};
	for (let index = 0; index < normalizedInputCount; index += 1) {
		const port = createNodePort({
			nodeId,
			direction: "input",
			index,
		});
		inputPorts[port.id] = port;
	}

	const outputPorts: Record<PortId, NodePort> = {};
	for (let index = 0; index < definition.outputCount; index += 1) {
		const port = createNodePort({
			nodeId,
			direction: "output",
			index,
		});
		outputPorts[port.id] = port;
	}

	return {
		id: nodeId,
		kind,
		position,
		rotation,
		inputPorts,
		outputPorts,
		data: definition.createDefaultData(),
	};
};

export const createWire = ({
	fromPortId,
	toPortId,
}: {
	fromPortId: PortId;
	toPortId: PortId;
}): Wire => ({
	id: createId("wire"),
	fromPortId,
	toPortId,
});

export const withNodeAdded = (board: Board, node: Node): Board => ({
	...board,
	nodes: {
		...board.nodes,
		[node.id]: node,
	},
});

export const withBoardPortAdded = (board: Board, port: BoardPort): Board => ({
	...board,
	inputPorts:
		port.role === "boardInput"
			? {
					...board.inputPorts,
					[port.id]: port,
				}
			: board.inputPorts,
	outputPorts:
		port.role === "boardOutput"
			? {
					...board.outputPorts,
					[port.id]: port,
				}
			: board.outputPorts,
});

export const withWireAdded = (board: Board, wire: Wire): Board => ({
	...board,
	wires: {
		...board.wires,
		[wire.id]: wire,
	},
});
