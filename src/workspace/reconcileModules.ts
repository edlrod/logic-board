import { createNode } from "../domain/factories";
import type {
	Board,
	Node,
	NodeDefinitionRegistry,
	NodePort,
	PortId,
	Wire,
} from "../domain/types";

const sortNodePorts = (ports: Record<PortId, NodePort>) =>
	Object.values(ports).sort((left, right) => left.index - right.index);

const removeWiresByPredicate = (
	wires: Record<string, Wire>,
	predicate: (wire: Wire) => boolean,
) =>
	Object.fromEntries(
		Object.entries(wires).filter(([, wire]) => !predicate(wire)),
	) as Record<string, Wire>;

const buildNextPorts = ({
	node,
	existingPorts,
	templatePorts,
	expectedCount,
}: {
	node: Node;
	existingPorts: NodePort[];
	templatePorts: NodePort[];
	expectedCount: number;
}) =>
	Object.fromEntries(
		Array.from({ length: expectedCount }, (_, index) => {
			const existingPort = existingPorts[index];
			if (existingPort) {
				return [
					existingPort.id,
					{
						...existingPort,
						index,
					} satisfies NodePort,
				];
			}

			const templatePort = templatePorts[index];
			return [
				templatePort.id,
				{
					...templatePort,
					ownerId: node.id,
					index,
				} satisfies NodePort,
			];
		}),
	) as Record<PortId, NodePort>;

export const reconcileBoardModuleNodes = (
	board: Board,
	definitions: NodeDefinitionRegistry,
): Board => {
	let changed = false;
	const removedPortIds = new Set<PortId>();
	const nextNodes: Record<string, Node> = {};

	for (const node of Object.values(board.nodes)) {
		if (node.data.kind !== "module") {
			nextNodes[node.id] = node;
			continue;
		}

		const definition = definitions[node.kind];
		if (!definition) {
			nextNodes[node.id] = node;
			continue;
		}

		const expectedInputCount = definition.minInputs;
		const expectedOutputCount = definition.outputCount;
		const existingInputs = sortNodePorts(node.inputPorts);
		const existingOutputs = sortNodePorts(node.outputPorts);

		if (
			existingInputs.length === expectedInputCount &&
			existingOutputs.length === expectedOutputCount
		) {
			nextNodes[node.id] = node;
			continue;
		}

		changed = true;
		existingInputs.slice(expectedInputCount).forEach((port) => {
			removedPortIds.add(port.id);
		});
		existingOutputs.slice(expectedOutputCount).forEach((port) => {
			removedPortIds.add(port.id);
		});

		const templateNode = createNode({
			kind: node.kind,
			position: node.position,
			rotation: node.rotation,
			inputCount: expectedInputCount,
			definitions,
		});
		const templateInputs = sortNodePorts(templateNode.inputPorts);
		const templateOutputs = sortNodePorts(templateNode.outputPorts);

		nextNodes[node.id] = {
			...node,
			inputPorts: buildNextPorts({
				node,
				existingPorts: existingInputs,
				templatePorts: templateInputs,
				expectedCount: expectedInputCount,
			}),
			outputPorts: buildNextPorts({
				node,
				existingPorts: existingOutputs,
				templatePorts: templateOutputs,
				expectedCount: expectedOutputCount,
			}),
		};
	}

	if (!changed) {
		return board;
	}

	return {
		...board,
		nodes: nextNodes,
		wires: removeWiresByPredicate(
			board.wires,
			(wire) =>
				removedPortIds.has(wire.fromPortId) ||
				removedPortIds.has(wire.toPortId),
		),
	};
};
