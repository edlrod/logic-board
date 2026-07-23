import type {
	Board,
	BoardPort,
	Node,
	NodePort,
	Point,
	PortId,
} from "../domain";
import { rotatePoint } from "./camera";

export const getOrderedNodeInputPorts = (node: Node) =>
	Object.values(node.inputPorts).sort(
		(left, right) => left.index - right.index,
	);

export const getOrderedNodeOutputPorts = (node: Node) =>
	Object.values(node.outputPorts).sort(
		(left, right) => left.index - right.index,
	);

export const getNodeOutletSize = (node: Node) => {
	const inputCount = Math.max(Object.keys(node.inputPorts).length, 1);
	return Math.min(0.25, 1 / (inputCount + 1));
};

export const getNodeInputPortPosition = (
	node: Node,
	port: NodePort,
	xOffset = 0,
	yOffset = 0,
): Point => {
	const inputCount = Math.max(Object.keys(node.inputPorts).length, 1);
	const outletSize = getNodeOutletSize(node);
	const preRotation = {
		x:
			(xOffset / 2) * outletSize +
			(port.index - inputCount / 2 + 0.5) / inputCount,
		y: -0.5 + (yOffset / 2) * outletSize,
	};
	const rotatedPoint = rotatePoint(preRotation, node.rotation);
	return {
		x: node.position.x + 0.5 + rotatedPoint.x,
		y: node.position.y + 0.5 + rotatedPoint.y,
	};
};

export const getNodeOutputPortPosition = (
	node: Node,
	port: NodePort,
	xOffset = 0,
	yOffset = 0,
): Point => {
	if (node.kind === "buffer") {
		return {
			x: node.position.x + 0.5,
			y: node.position.y + 0.5,
		};
	}

	const outletSize = getNodeOutletSize(node);
	const outputCount = Math.max(Object.keys(node.outputPorts).length, 1);
	const preRotation = {
		x:
			outputCount === 1
				? (xOffset / 2) * outletSize
				: (xOffset / 2) * outletSize +
					(port.index - outputCount / 2 + 0.5) / outputCount,
		y: 0.5 + (yOffset / 2) * outletSize,
	};
	const rotatedPoint = rotatePoint(preRotation, node.rotation);
	return {
		x: node.position.x + 0.5 + rotatedPoint.x,
		y: node.position.y + 0.5 + rotatedPoint.y,
	};
};

const getCenteredPortY = (index: number, count: number) =>
	(index - (count - 1) / 2) * 1.5;

export const getBoardPortPosition = (board: Board, port: BoardPort): Point => {
	if (port.offset) {
		return port.offset;
	}

	if (port.role === "boardInput") {
		return {
			x: -6,
			y: getCenteredPortY(
				port.index,
				Math.max(Object.keys(board.inputPorts).length, 1),
			),
		};
	}

	return {
		x: 6,
		y: getCenteredPortY(
			port.index,
			Math.max(Object.keys(board.outputPorts).length, 1),
		),
	};
};

export const getPortWorldPosition = ({
	board,
	portId,
	boardPortsById,
	nodeByPortId,
}: {
	board: Board;
	portId: PortId;
	boardPortsById: Record<PortId, BoardPort>;
	nodeByPortId: Record<PortId, Node>;
}): Point | null => {
	const boardPort = boardPortsById[portId];
	if (boardPort) {
		return getBoardPortPosition(board, boardPort);
	}

	const node = nodeByPortId[portId];
	if (!node) {
		return null;
	}

	const inputPort = node.inputPorts[portId];
	if (inputPort) {
		return getNodeInputPortPosition(node, inputPort);
	}

	const outputPort = node.outputPorts[portId];
	if (outputPort) {
		return getNodeOutputPortPosition(node, outputPort);
	}

	return null;
};
