import { buildPortLookup } from "../domain/ports";
import type { Board, Node, NodeId, PortId, Wire } from "../domain/types";

export interface BoardGraph {
	incomingWireByPortId: Record<PortId, Wire>;
	outgoingWiresByPortId: Record<PortId, Wire[]>;
	nodeEvaluationOrder: NodeId[];
	nodesInOrder: Node[];
}

const sortByIndex = <T extends { index: number }>(items: T[]) =>
	[...items].sort((left, right) => left.index - right.index);

export const getOrderedNodeInputPorts = (node: Node) =>
	sortByIndex(Object.values(node.inputPorts));

export const getOrderedNodeOutputPorts = (node: Node) =>
	sortByIndex(Object.values(node.outputPorts));

export const buildBoardGraph = (board: Board): BoardGraph => {
	const incomingWireByPortId: Record<PortId, Wire> = {};
	const outgoingWiresByPortId: Record<PortId, Wire[]> = {};
	const indegreeByNodeId: Record<NodeId, number> = {};
	const adjacencyByNodeId: Record<NodeId, Set<NodeId>> = {};
	const { nodeByPortId } = buildPortLookup(board);

	Object.keys(board.nodes).forEach((nodeId) => {
		indegreeByNodeId[nodeId] = 0;
		adjacencyByNodeId[nodeId] = new Set<NodeId>();
	});

	Object.values(board.wires).forEach((wire) => {
		incomingWireByPortId[wire.toPortId] = wire;
		outgoingWiresByPortId[wire.fromPortId] ??= [];
		outgoingWiresByPortId[wire.fromPortId].push(wire);

		const fromNode = nodeByPortId[wire.fromPortId];
		const toNode = nodeByPortId[wire.toPortId];

		if (!fromNode || !toNode || fromNode.id === toNode.id) {
			return;
		}

		const adjacency = adjacencyByNodeId[fromNode.id];
		if (!adjacency.has(toNode.id)) {
			adjacency.add(toNode.id);
			indegreeByNodeId[toNode.id] += 1;
		}
	});

	const queue = Object.keys(indegreeByNodeId)
		.filter((nodeId) => indegreeByNodeId[nodeId] === 0)
		.sort();
	const nodeEvaluationOrder: NodeId[] = [];

	while (queue.length > 0) {
		const nodeId = queue.shift();
		if (!nodeId) {
			break;
		}

		nodeEvaluationOrder.push(nodeId);
		for (const adjacentNodeId of adjacencyByNodeId[nodeId]) {
			indegreeByNodeId[adjacentNodeId] -= 1;
			if (indegreeByNodeId[adjacentNodeId] === 0) {
				queue.push(adjacentNodeId);
				queue.sort();
			}
		}
	}

	return {
		incomingWireByPortId,
		outgoingWiresByPortId,
		nodeEvaluationOrder,
		nodesInOrder: nodeEvaluationOrder.map((nodeId) => board.nodes[nodeId]),
	};
};
