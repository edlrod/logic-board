import { buildPortLookup } from "./ports";
import type {
	Board,
	BoardValidationIssue,
	BoardValidationResult,
	NodeId,
	PortId,
} from "./types";

const addIssue = (
	issues: BoardValidationIssue[],
	code: string,
	message: string,
	entityId?: string,
) => {
	issues.push({ code, message, entityId });
};

const detectNodeCycles = (board: Board) => {
	const adjacency: Record<NodeId, Set<NodeId>> = {};

	Object.keys(board.nodes).forEach((nodeId) => {
		adjacency[nodeId] = new Set<NodeId>();
	});

	const { nodeByPortId } = buildPortLookup(board);
	Object.values(board.wires).forEach((wire) => {
		const fromNode = nodeByPortId[wire.fromPortId];
		const toNode = nodeByPortId[wire.toPortId];
		if (fromNode && toNode) {
			adjacency[fromNode.id]?.add(toNode.id);
		}
	});

	const visited = new Set<NodeId>();
	const active = new Set<NodeId>();

	const visit = (nodeId: NodeId): boolean => {
		if (active.has(nodeId)) {
			return true;
		}
		if (visited.has(nodeId)) {
			return false;
		}

		visited.add(nodeId);
		active.add(nodeId);
		for (const nextNodeId of adjacency[nodeId] ?? []) {
			if (visit(nextNodeId)) {
				return true;
			}
		}
		active.delete(nodeId);
		return false;
	};

	return Object.keys(adjacency).some((nodeId) => visit(nodeId));
};

export const validateBoard = (board: Board): BoardValidationResult => {
	const issues: BoardValidationIssue[] = [];
	const { portById } = buildPortLookup(board);
	const incomingWireByPort = new Map<PortId, string>();

	Object.values(board.wires).forEach((wire) => {
		const fromPort = portById[wire.fromPortId];
		const toPort = portById[wire.toPortId];

		if (!fromPort) {
			addIssue(
				issues,
				"wire.missingFromPort",
				`Wire ${wire.id} references a missing source port.`,
				wire.id,
			);
			return;
		}

		if (!toPort) {
			addIssue(
				issues,
				"wire.missingToPort",
				`Wire ${wire.id} references a missing destination port.`,
				wire.id,
			);
			return;
		}

		if (wire.fromPortId === wire.toPortId) {
			addIssue(
				issues,
				"wire.selfReference",
				`Wire ${wire.id} cannot connect a port to itself.`,
				wire.id,
			);
		}

		if (fromPort.direction !== "output") {
			addIssue(
				issues,
				"wire.invalidSourceDirection",
				`Wire ${wire.id} source port must be an output.`,
				wire.id,
			);
		}

		if (toPort.direction !== "input") {
			addIssue(
				issues,
				"wire.invalidDestinationDirection",
				`Wire ${wire.id} destination port must be an input.`,
				wire.id,
			);
		}

		const existingIncomingWireId = incomingWireByPort.get(wire.toPortId);
		if (existingIncomingWireId) {
			addIssue(
				issues,
				"wire.multipleInputs",
				`Port ${wire.toPortId} has multiple incoming wires.`,
				wire.toPortId,
			);
		} else {
			incomingWireByPort.set(wire.toPortId, wire.id);
		}
	});

	if (detectNodeCycles(board)) {
		addIssue(
			issues,
			"board.combinationalCycle",
			"Board contains a combinational cycle.",
			board.id,
		);
	}

	return {
		valid: issues.length === 0,
		issues,
	};
};
