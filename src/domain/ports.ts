import type { Board, BoardPort, Node, NodePort, PortId } from "./types";

export interface PortLookup {
	portById: Record<PortId, BoardPort | NodePort>;
	nodeByPortId: Record<PortId, Node>;
}

export const buildPortLookup = (board: Board): PortLookup => {
	const portById: Record<PortId, BoardPort | NodePort> = {
		...board.inputPorts,
		...board.outputPorts,
	};
	const nodeByPortId: Record<PortId, Node> = {};

	Object.values(board.nodes).forEach((node) => {
		Object.values(node.inputPorts).forEach((port) => {
			portById[port.id] = port;
			nodeByPortId[port.id] = node;
		});
		Object.values(node.outputPorts).forEach((port) => {
			portById[port.id] = port;
			nodeByPortId[port.id] = node;
		});
	});

	return { portById, nodeByPortId };
};
