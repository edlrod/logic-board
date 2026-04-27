import { nodeDefinitions } from "./definitions";
import {
	createBoardPort,
	createNode,
	createWire,
	withBoardPortAdded,
	withNodeAdded,
	withWireAdded,
} from "./factories";
import { buildPortLookup } from "./ports";
import type {
	Board,
	BoardCommand,
	BoardCommandResult,
	BoardValidationIssue,
	Node,
	NodeDefinitionRegistry,
	NodePort,
	PortId,
	Wire,
} from "./types";
import { validateBoard } from "./validateBoard";

const result = (board: Board, issues: BoardValidationIssue[] = []) => ({
	board,
	issues,
});

const withValidation = (board: Board): BoardCommandResult => ({
	board,
	issues: validateBoard(board).issues,
});

const missingEntityIssue = (
	entityId: string,
	message: string,
): BoardValidationIssue[] => [
	{
		code: "command.missingEntity",
		message,
		entityId,
	},
];

const removeWiresByPredicate = (
	wires: Record<string, Wire>,
	predicate: (wire: Wire) => boolean,
) =>
	Object.fromEntries(
		Object.entries(wires).filter(([, wire]) => !predicate(wire)),
	) as Record<string, Wire>;

const getOrderedInputPorts = (node: Node) =>
	Object.values(node.inputPorts).sort(
		(left, right) => left.index - right.index,
	);

const prunePortWires = (board: Board, portIds: Set<PortId>): Board => ({
	...board,
	wires: removeWiresByPredicate(
		board.wires,
		(wire) => portIds.has(wire.fromPortId) || portIds.has(wire.toPortId),
	),
});

const deleteNodeInternal = (board: Board, nodeId: string): Board => {
	const node = board.nodes[nodeId];
	if (!node) {
		return board;
	}

	const portIds = new Set<PortId>([
		...Object.keys(node.inputPorts),
		...Object.keys(node.outputPorts),
	]);
	const nextBoard = prunePortWires(board, portIds);
	const { [nodeId]: _removedNode, ...remainingNodes } = nextBoard.nodes;

	return {
		...nextBoard,
		nodes: remainingNodes,
	};
};

const resizeNodeInputPorts = (
	board: Board,
	nodeId: string,
	inputCount: number,
	definitions: NodeDefinitionRegistry,
) => {
	const node = board.nodes[nodeId];
	if (!node) {
		return result(
			board,
			missingEntityIssue(nodeId, `Node ${nodeId} was not found.`),
		);
	}

	const definition = definitions[node.kind];
	let normalizedInputCount = Math.max(definition.minInputs, inputCount);
	if (definition.maxInputs !== null) {
		normalizedInputCount = Math.min(definition.maxInputs, normalizedInputCount);
	}

	const orderedPorts = getOrderedInputPorts(node);
	const nextPorts = orderedPorts.slice(0, normalizedInputCount);
	const removedPorts = orderedPorts.slice(normalizedInputCount);

	while (nextPorts.length < normalizedInputCount) {
		const port = createNode({
			kind: node.kind,
			position: node.position,
			rotation: node.rotation,
			inputCount: nextPorts.length + 1,
			definitions,
		}).inputPorts;
		const newestPort = Object.values(port).sort(
			(left, right) => left.index - right.index,
		)[nextPorts.length];
		if (newestPort) {
			nextPorts.push({
				...newestPort,
				ownerId: node.id,
			});
		}
	}

	const nextInputPorts = Object.fromEntries(
		nextPorts.map((port, index) => [
			port.id,
			{
				...port,
				index,
			} satisfies NodePort,
		]),
	) as Record<PortId, NodePort>;

	const nextNode: Node = {
		...node,
		inputPorts: nextInputPorts,
	};

	const removedPortIds = new Set<PortId>(removedPorts.map((port) => port.id));
	const nextBoard = {
		...prunePortWires(board, removedPortIds),
		nodes: {
			...board.nodes,
			[node.id]: nextNode,
		},
	};

	return withValidation(nextBoard);
};

const connectPortsInternal = (
	board: Board,
	fromPortId: PortId,
	toPortId: PortId,
) => {
	const { portById } = buildPortLookup(board);
	const fromPort = portById[fromPortId];
	const toPort = portById[toPortId];

	if (!fromPort) {
		return result(
			board,
			missingEntityIssue(
				fromPortId,
				`Source port ${fromPortId} was not found.`,
			),
		);
	}

	if (!toPort) {
		return result(
			board,
			missingEntityIssue(
				toPortId,
				`Destination port ${toPortId} was not found.`,
			),
		);
	}

	const nextBoard = {
		...board,
		wires: removeWiresByPredicate(
			board.wires,
			(wire) => wire.toPortId === toPortId,
		),
	};

	return withValidation(
		withWireAdded(nextBoard, createWire({ fromPortId, toPortId })),
	);
};

export const applyBoardCommand = (
	board: Board,
	command: BoardCommand,
	definitions: NodeDefinitionRegistry = nodeDefinitions,
): BoardCommandResult => {
	switch (command.type) {
		case "addNode":
			return withValidation(
				withNodeAdded(
					board,
					command.node ??
						createNode({
							kind: command.kind ?? "buffer",
							position: command.position ?? { x: 0, y: 0 },
							rotation: command.rotation,
							inputCount: command.inputCount,
							definitions,
						}),
				),
			);

		case "moveNode": {
			const node = board.nodes[command.nodeId];
			if (!node) {
				return result(
					board,
					missingEntityIssue(
						command.nodeId,
						`Node ${command.nodeId} was not found.`,
					),
				);
			}

			return result({
				...board,
				nodes: {
					...board.nodes,
					[node.id]: {
						...node,
						position: command.position,
					},
				},
			});
		}

		case "rotateNode": {
			const node = board.nodes[command.nodeId];
			if (!node) {
				return result(
					board,
					missingEntityIssue(
						command.nodeId,
						`Node ${command.nodeId} was not found.`,
					),
				);
			}

			return result({
				...board,
				nodes: {
					...board.nodes,
					[node.id]: {
						...node,
						rotation: command.rotation,
					},
				},
			});
		}

		case "deleteNode":
			if (!board.nodes[command.nodeId]) {
				return result(
					board,
					missingEntityIssue(
						command.nodeId,
						`Node ${command.nodeId} was not found.`,
					),
				);
			}
			return withValidation(deleteNodeInternal(board, command.nodeId));

		case "setSwitchValue": {
			const node = board.nodes[command.nodeId];
			if (!node) {
				return result(
					board,
					missingEntityIssue(
						command.nodeId,
						`Node ${command.nodeId} was not found.`,
					),
				);
			}
			if (node.data.kind !== "switch") {
				return result(board, [
					{
						code: "command.invalidNodeKind",
						message: `Node ${command.nodeId} is not a switch.`,
						entityId: command.nodeId,
					},
				]);
			}

			return result({
				...board,
				nodes: {
					...board.nodes,
					[node.id]: {
						...node,
						data: {
							...node.data,
							value: command.value,
						},
					},
				},
			});
		}

		case "setNodeInputCount":
			return resizeNodeInputPorts(
				board,
				command.nodeId,
				command.inputCount,
				definitions,
			);

		case "addBoardInput": {
			const port = createBoardPort({
				boardId: board.id,
				role: "boardInput",
				label: command.label,
				index: Object.keys(board.inputPorts).length,
			});
			return withValidation(withBoardPortAdded(board, port));
		}

		case "addBoardOutput": {
			const port = createBoardPort({
				boardId: board.id,
				role: "boardOutput",
				label: command.label,
				index: Object.keys(board.outputPorts).length,
			});
			return withValidation(withBoardPortAdded(board, port));
		}

		case "deleteBoardPort": {
			const boardInputPort = board.inputPorts[command.portId];
			const boardOutputPort = board.outputPorts[command.portId];
			const port = boardInputPort ?? boardOutputPort;

			if (!port) {
				return result(
					board,
					missingEntityIssue(
						command.portId,
						`Board port ${command.portId} was not found.`,
					),
				);
			}

			const nextBoard = prunePortWires(
				board,
				new Set<PortId>([command.portId]),
			);
			const { [command.portId]: _removedInput, ...remainingInputPorts } =
				nextBoard.inputPorts;
			const { [command.portId]: _removedOutput, ...remainingOutputPorts } =
				nextBoard.outputPorts;

			return withValidation({
				...nextBoard,
				inputPorts: remainingInputPorts,
				outputPorts: remainingOutputPorts,
			});
		}

		case "connectPorts":
			return connectPortsInternal(board, command.fromPortId, command.toPortId);

		case "disconnectWire":
		case "deleteWire": {
			if (!board.wires[command.wireId]) {
				return result(
					board,
					missingEntityIssue(
						command.wireId,
						`Wire ${command.wireId} was not found.`,
					),
				);
			}

			const { [command.wireId]: _removedWire, ...remainingWires } = board.wires;
			return withValidation({
				...board,
				wires: remainingWires,
			});
		}
	}
};
