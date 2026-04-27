import { nodeDefinitions } from "../domain/definitions";
import { buildPortLookup } from "../domain/ports";
import type {
	Board,
	PortId,
	SimulationResult,
	SimulationSnapshot,
} from "../domain/types";
import { validateBoard } from "../domain/validateBoard";
import {
	buildBoardGraph,
	getOrderedNodeInputPorts,
	getOrderedNodeOutputPorts,
} from "./graph";

const createEmptySnapshot = (board: Board): SimulationSnapshot => {
	const { portById } = buildPortLookup(board);
	const portValues: Record<PortId, boolean> = {};

	Object.keys(portById).forEach((portId) => {
		portValues[portId] = false;
	});

	return {
		portValues,
		nodeOutputs: {},
	};
};

export const evaluateBoard = (
	board: Board,
	externalInputs: Record<PortId, boolean> = {},
): SimulationResult => {
	const validation = validateBoard(board);
	const snapshot = createEmptySnapshot(board);

	Object.keys(board.inputPorts).forEach((portId) => {
		snapshot.portValues[portId] = externalInputs[portId] ?? false;
	});

	if (!validation.valid) {
		return {
			ok: false,
			snapshot,
			issues: validation.issues,
		};
	}

	const graph = buildBoardGraph(board);

	for (const node of graph.nodesInOrder) {
		const inputPorts = getOrderedNodeInputPorts(node);
		const inputValues = inputPorts.map((port) => {
			const incomingWire = graph.incomingWireByPortId[port.id];
			const value = incomingWire
				? (snapshot.portValues[incomingWire.fromPortId] ?? false)
				: false;
			snapshot.portValues[port.id] = value;
			return value;
		});

		const definition = nodeDefinitions[node.kind];
		const outputValues =
			node.kind === "boardInput" && node.data.kind === "boardInput"
				? [externalInputs[node.data.boardPortId] ?? false]
				: definition.evaluate(inputValues, node.data);

		snapshot.nodeOutputs[node.id] = outputValues;

		const outputPorts = getOrderedNodeOutputPorts(node);
		outputPorts.forEach((port, index) => {
			snapshot.portValues[port.id] = outputValues[index] ?? false;
		});
	}

	Object.keys(board.outputPorts).forEach((portId) => {
		const incomingWire = graph.incomingWireByPortId[portId];
		snapshot.portValues[portId] = incomingWire
			? (snapshot.portValues[incomingWire.fromPortId] ?? false)
			: false;
	});

	return {
		ok: true,
		snapshot,
		issues: [],
	};
};
