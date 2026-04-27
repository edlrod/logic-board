import { nodeDefinitions } from "../domain/definitions";
import { buildPortLookup } from "../domain/ports";
import type {
	Board,
	NodeDefinitionRegistry,
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
	options: {
		definitions?: NodeDefinitionRegistry;
		resolveBoard?: (boardId: string) => Board | null;
		stack?: string[];
	} = {},
): SimulationResult => {
	const validation = validateBoard(board);
	const snapshot = createEmptySnapshot(board);
	const definitions = options.definitions ?? nodeDefinitions;
	const nestedIssues = [...validation.issues];

	Object.keys(board.inputPorts).forEach((portId) => {
		snapshot.portValues[portId] = externalInputs[portId] ?? false;
	});

	if (!validation.valid) {
		return {
			ok: false,
			snapshot,
			issues: nestedIssues,
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

		const definition = definitions[node.kind];
		if (!definition) {
			nestedIssues.push({
				code: "node.missingDefinition",
				message: `Node definition for ${node.kind} was not found.`,
				entityId: node.id,
			});
			continue;
		}

		const outputValues =
			node.kind === "boardInput" && node.data.kind === "boardInput"
				? [externalInputs[node.data.boardPortId] ?? false]
				: node.data.kind === "module"
					? (() => {
							const moduleBoard =
								options.resolveBoard?.(node.data.boardId) ?? null;
							if (!moduleBoard) {
								nestedIssues.push({
									code: "module.missingBoard",
									message: `Module board ${node.data.boardId} was not found.`,
									entityId: node.id,
								});
								return new Array(Object.keys(node.outputPorts).length).fill(
									false,
								) as boolean[];
							}

							if (
								[...(options.stack ?? []), board.id].includes(moduleBoard.id)
							) {
								nestedIssues.push({
									code: "module.recursiveBoard",
									message: `Module ${moduleBoard.name} creates a recursive board dependency.`,
									entityId: node.id,
								});
								return new Array(Object.keys(node.outputPorts).length).fill(
									false,
								) as boolean[];
							}

							const moduleExternalInputs = Object.fromEntries(
								Object.values(moduleBoard.inputPorts)
									.sort((left, right) => left.index - right.index)
									.map((port, index) => [port.id, inputValues[index] ?? false]),
							) as Record<PortId, boolean>;
							const nestedResult = evaluateBoard(
								moduleBoard,
								moduleExternalInputs,
								{
									definitions,
									resolveBoard: options.resolveBoard,
									stack: [...(options.stack ?? []), board.id],
								},
							);
							nestedIssues.push(
								...nestedResult.issues.map((issue) => ({
									...issue,
									message: `${moduleBoard.name}: ${issue.message}`,
								})),
							);

							return Object.values(moduleBoard.outputPorts)
								.sort((left, right) => left.index - right.index)
								.map(
									(port) => nestedResult.snapshot.portValues[port.id] ?? false,
								);
						})()
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
		ok: nestedIssues.length === 0,
		snapshot,
		issues: nestedIssues,
	};
};
