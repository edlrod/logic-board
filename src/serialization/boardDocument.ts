import {
	type Board,
	type BoardPort,
	createBoard,
	createBoardPort,
	createNode,
	createWire,
	type Node,
	type NodeData,
	type NodeKind,
	type PortId,
} from "../domain";

export interface SerializedBoardDocumentV1 {
	version: 1;
	board: Board;
}

type CompactBoardPortLabel = string | null;
type CompactNodeKindCode = number;
type CompactPortRefKind = 0 | 1 | 2 | 3;
type CompactRotationTurns = 0 | 1 | 2 | 3;
type CompactNodeTuple = [
	kind: CompactNodeKindCode,
	x: number,
	y: number,
	rotationTurns: CompactRotationTurns,
	inputCount: number,
	data?: number,
];
type CompactPortRef = [
	kind: CompactPortRefKind,
	ownerIndex: number,
	portIndex: number,
];
type CompactWireTuple = [from: CompactPortRef, to: CompactPortRef];

export interface SerializedBoardDocumentV2 {
	version: 2;
	n: string;
	i: CompactBoardPortLabel[];
	o: CompactBoardPortLabel[];
	d: CompactNodeTuple[];
	w: CompactWireTuple[];
}

export type SerializedBoardDocument =
	| SerializedBoardDocumentV1
	| SerializedBoardDocumentV2;

const NODE_KIND_ORDER: NodeKind[] = [
	"switch",
	"buffer",
	"not",
	"and",
	"or",
	"xor",
	"boardInput",
	"boardOutput",
];

const NODE_KIND_TO_CODE = Object.fromEntries(
	NODE_KIND_ORDER.map((kind, index) => [kind, index]),
) as Record<NodeKind, CompactNodeKindCode>;

const normalizeRotationTurns = (rotation: number): CompactRotationTurns =>
	(((Math.round(rotation / (Math.PI / 2)) % 4) + 4) %
		4) as CompactRotationTurns;

const denormalizeRotationTurns = (turns: CompactRotationTurns) =>
	turns * (Math.PI / 2);

const sortBoardPorts = (ports: Record<PortId, BoardPort>) =>
	Object.values(ports).sort((left, right) => left.index - right.index);

const sortNodes = (nodes: Record<string, Node>) =>
	Object.values(nodes).sort((left, right) => left.id.localeCompare(right.id));

const sortNodePorts = (ports: Record<PortId, Node["inputPorts"][PortId]>) =>
	Object.values(ports).sort((left, right) => left.index - right.index);

const getNodeInputCount = (node: Node) => Object.keys(node.inputPorts).length;

const encodeNodeData = ({
	node,
	boardInputIndexesById,
	boardOutputIndexesById,
}: {
	node: Node;
	boardInputIndexesById: Record<PortId, number>;
	boardOutputIndexesById: Record<PortId, number>;
}): number | undefined => {
	switch (node.data.kind) {
		case "switch":
			return node.data.value ? 1 : 0;
		case "boardInput":
			return boardInputIndexesById[node.data.boardPortId];
		case "boardOutput":
			return boardOutputIndexesById[node.data.boardPortId];
		case "buffer":
		case "not":
		case "and":
		case "or":
		case "xor":
			return undefined;
	}
};

const decodeNodeData = ({
	kind,
	data,
	boardInputPortIds,
	boardOutputPortIds,
}: {
	kind: string;
	data: number | undefined;
	boardInputPortIds: PortId[];
	boardOutputPortIds: PortId[];
}): NodeData => {
	switch (kind) {
		case "switch":
			return { kind: "switch", value: data === 1 };
		case "boardInput":
			return {
				kind: "boardInput",
				boardPortId: boardInputPortIds[data ?? 0] ?? "",
			};
		case "boardOutput":
			return {
				kind: "boardOutput",
				boardPortId: boardOutputPortIds[data ?? 0] ?? "",
			};
		case "buffer":
			return { kind: "buffer" };
		case "not":
			return { kind: "not" };
		case "and":
			return { kind: "and" };
		case "or":
			return { kind: "or" };
		case "xor":
			return { kind: "xor" };
	}

	if (kind.startsWith("module:")) {
		return { kind: "module", boardId: kind.slice("module:".length) };
	}

	return { kind: "buffer" };
};

const encodePortRef = ({
	portId,
	boardInputIndexesById,
	boardOutputIndexesById,
	nodeInputIndexesById,
	nodeOutputIndexesById,
}: {
	portId: PortId;
	boardInputIndexesById: Record<PortId, number>;
	boardOutputIndexesById: Record<PortId, number>;
	nodeInputIndexesById: Record<
		PortId,
		{ nodeIndex: number; portIndex: number }
	>;
	nodeOutputIndexesById: Record<
		PortId,
		{ nodeIndex: number; portIndex: number }
	>;
}): CompactPortRef => {
	if (portId in boardInputIndexesById) {
		return [0, boardInputIndexesById[portId], 0];
	}
	if (portId in boardOutputIndexesById) {
		return [1, boardOutputIndexesById[portId], 0];
	}
	if (portId in nodeInputIndexesById) {
		const ref = nodeInputIndexesById[portId];
		return [2, ref.nodeIndex, ref.portIndex];
	}
	if (portId in nodeOutputIndexesById) {
		const ref = nodeOutputIndexesById[portId];
		return [3, ref.nodeIndex, ref.portIndex];
	}

	throw new Error(`Unable to encode port reference for ${portId}.`);
};

const decodePortRef = ({
	portRef,
	boardInputPortIds,
	boardOutputPortIds,
	nodeInputPortIdsByNodeIndex,
	nodeOutputPortIdsByNodeIndex,
}: {
	portRef: CompactPortRef;
	boardInputPortIds: PortId[];
	boardOutputPortIds: PortId[];
	nodeInputPortIdsByNodeIndex: PortId[][];
	nodeOutputPortIdsByNodeIndex: PortId[][];
}): PortId => {
	const [kind, ownerIndex, portIndex] = portRef;
	switch (kind) {
		case 0:
			return boardInputPortIds[ownerIndex];
		case 1:
			return boardOutputPortIds[ownerIndex];
		case 2:
			return nodeInputPortIdsByNodeIndex[ownerIndex]?.[portIndex] ?? "";
		case 3:
			return nodeOutputPortIdsByNodeIndex[ownerIndex]?.[portIndex] ?? "";
	}
};

const boardToCompactDocument = (board: Board): SerializedBoardDocumentV2 => {
	const boardInputs = sortBoardPorts(board.inputPorts);
	const boardOutputs = sortBoardPorts(board.outputPorts);
	const nodes = sortNodes(board.nodes);
	const wires = Object.values(board.wires);

	const boardInputIndexesById = Object.fromEntries(
		boardInputs.map((port, index) => [port.id, index]),
	) as Record<PortId, number>;
	const boardOutputIndexesById = Object.fromEntries(
		boardOutputs.map((port, index) => [port.id, index]),
	) as Record<PortId, number>;
	const nodeInputIndexesById: Record<
		PortId,
		{ nodeIndex: number; portIndex: number }
	> = {};
	const nodeOutputIndexesById: Record<
		PortId,
		{ nodeIndex: number; portIndex: number }
	> = {};

	nodes.forEach((node, nodeIndex) => {
		sortNodePorts(node.inputPorts).forEach((port, portIndex) => {
			nodeInputIndexesById[port.id] = { nodeIndex, portIndex };
		});
		sortNodePorts(node.outputPorts).forEach((port, portIndex) => {
			nodeOutputIndexesById[port.id] = { nodeIndex, portIndex };
		});
	});

	return {
		version: 2,
		n: board.name,
		i: boardInputs.map((port) => port.label ?? null),
		o: boardOutputs.map((port) => port.label ?? null),
		d: nodes.map((node) => [
			NODE_KIND_TO_CODE[node.kind],
			node.position.x,
			node.position.y,
			normalizeRotationTurns(node.rotation),
			getNodeInputCount(node),
			encodeNodeData({
				node,
				boardInputIndexesById,
				boardOutputIndexesById,
			}),
		]),
		w: wires.map((wire) => [
			encodePortRef({
				portId: wire.fromPortId,
				boardInputIndexesById,
				boardOutputIndexesById,
				nodeInputIndexesById,
				nodeOutputIndexesById,
			}),
			encodePortRef({
				portId: wire.toPortId,
				boardInputIndexesById,
				boardOutputIndexesById,
				nodeInputIndexesById,
				nodeOutputIndexesById,
			}),
		]),
	};
};

const compactDocumentToBoard = (document: SerializedBoardDocumentV2): Board => {
	const board = createBoard(document.n);

	let nextBoard = board;
	const boardInputPortIds: PortId[] = [];
	const boardOutputPortIds: PortId[] = [];

	document.i.forEach((label, index) => {
		const port = createBoardPort({
			boardId: nextBoard.id,
			role: "boardInput",
			index,
			label: label ?? undefined,
		});
		boardInputPortIds.push(port.id);
		nextBoard = {
			...nextBoard,
			inputPorts: {
				...nextBoard.inputPorts,
				[port.id]: port,
			},
		};
	});

	document.o.forEach((label, index) => {
		const port = createBoardPort({
			boardId: nextBoard.id,
			role: "boardOutput",
			index,
			label: label ?? undefined,
		});
		boardOutputPortIds.push(port.id);
		nextBoard = {
			...nextBoard,
			outputPorts: {
				...nextBoard.outputPorts,
				[port.id]: port,
			},
		};
	});

	const nodeInputPortIdsByNodeIndex: PortId[][] = [];
	const nodeOutputPortIdsByNodeIndex: PortId[][] = [];

	document.d.forEach(([kindCode, x, y, rotationTurns, inputCount, data]) => {
		const kind = NODE_KIND_ORDER[kindCode];
		if (!kind) {
			throw new Error(`Unsupported node kind code ${kindCode}.`);
		}

		const node = createNode({
			kind,
			position: { x, y },
			rotation: denormalizeRotationTurns(rotationTurns),
			inputCount,
		});
		node.data = decodeNodeData({
			kind,
			data,
			boardInputPortIds,
			boardOutputPortIds,
		});

		nodeInputPortIdsByNodeIndex.push(
			sortNodePorts(node.inputPorts).map((port) => port.id),
		);
		nodeOutputPortIdsByNodeIndex.push(
			sortNodePorts(node.outputPorts).map((port) => port.id),
		);

		nextBoard = {
			...nextBoard,
			nodes: {
				...nextBoard.nodes,
				[node.id]: node,
			},
		};
	});

	document.w.forEach(([fromRef, toRef]) => {
		const fromPortId = decodePortRef({
			portRef: fromRef,
			boardInputPortIds,
			boardOutputPortIds,
			nodeInputPortIdsByNodeIndex,
			nodeOutputPortIdsByNodeIndex,
		});
		const toPortId = decodePortRef({
			portRef: toRef,
			boardInputPortIds,
			boardOutputPortIds,
			nodeInputPortIdsByNodeIndex,
			nodeOutputPortIdsByNodeIndex,
		});
		const wire = createWire({ fromPortId, toPortId });
		nextBoard = {
			...nextBoard,
			wires: {
				...nextBoard.wires,
				[wire.id]: wire,
			},
		};
	});

	return nextBoard;
};

export const createBoardDocument = (board: Board): SerializedBoardDocumentV2 =>
	boardToCompactDocument(board);

export const encodeBoardDocument = (document: SerializedBoardDocument) =>
	btoa(JSON.stringify(document));

export const decodeUnknownBoardDocument = (encodedDocument: string): unknown =>
	JSON.parse(atob(encodedDocument));

export const isSerializedBoardDocumentV2 = (
	value: unknown,
): value is SerializedBoardDocumentV2 =>
	typeof value === "object" &&
	value !== null &&
	"version" in value &&
	(value as { version?: unknown }).version === 2 &&
	"n" in value &&
	"i" in value &&
	"o" in value &&
	"d" in value &&
	"w" in value;

export const materializeBoardDocument = (
	document: SerializedBoardDocument,
): Board => {
	if (document.version === 1) {
		return document.board;
	}

	return compactDocumentToBoard(document);
};
