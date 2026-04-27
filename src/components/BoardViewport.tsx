import { useEffect, useMemo, useRef } from "react";
import {
	type Board,
	type BoardCommand,
	type BoardPort,
	buildPortLookup,
	type Node,
	type NodeKind,
	nodeDefinitions,
	type PortId,
} from "../domain";
import {
	createViewportCamera,
	screenToWorld,
	type ViewportCamera,
	zoomAtPosition,
} from "../editor/camera";
import {
	getBoardPortPosition,
	getNodeInputPortPosition,
	getNodeOutletSize,
	getNodeOutputPortPosition,
	getOrderedNodeInputPorts,
	getOrderedNodeOutputPorts,
	getPortWorldPosition,
} from "../editor/geometry";
import type { Tool } from "../editor/types";
import { evaluateBoard } from "../simulation";

interface HeldNode {
	source: "new" | "existing";
	nodeKind: NodeKind;
	nodeId?: string;
	inputCount: number;
	rotation: number;
}

const drawRotationIndicator = (
	context: CanvasRenderingContext2D,
	rotation: number,
) => {
	context.save();
	context.rotate(rotation);
	context.strokeStyle = "#102a43";
	context.fillStyle = "#102a43";
	context.lineWidth = 1 / 24;
	context.beginPath();
	context.moveTo(0, 0.18);
	context.lineTo(0, 0.42);
	context.stroke();
	context.beginPath();
	context.moveTo(0, 0.5);
	context.lineTo(-0.08, 0.36);
	context.lineTo(0.08, 0.36);
	context.closePath();
	context.fill();
	context.restore();
};

interface BoardViewportProps {
	board: Board;
	externalInputs: Record<PortId, boolean>;
	onExternalInputsChange(
		updater:
			| Record<PortId, boolean>
			| ((current: Record<PortId, boolean>) => Record<PortId, boolean>),
	): void;
	onBoardCommand(command: BoardCommand): void;
	tool: Tool;
	buildRequest: {
		id: number;
		nodeKind: NodeKind;
		inputCount: number;
	} | null;
}

const BOARD_PORT_SIZE = 0.35;

export const BoardViewport = ({
	board,
	externalInputs,
	onExternalInputsChange,
	onBoardCommand,
	tool,
	buildRequest,
}: BoardViewportProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const frameRef = useRef<number | null>(null);
	const cameraRef = useRef<ViewportCamera>(createViewportCamera());
	const mousePositionRef = useRef({ x: 0, y: 0 });
	const keyStateRef = useRef<Record<string, boolean>>({});
	const selectedSourcePortIdRef = useRef<PortId | null>(null);
	const hoveredPortIdRef = useRef<PortId | null>(null);
	const heldNodeRef = useRef<HeldNode | null>(null);
	const placementRotationRef = useRef(0);
	const needsRenderRef = useRef(true);
	const boardRef = useRef(board);
	const toolRef = useRef(tool);

	const simulationResult = useMemo(
		() => evaluateBoard(board, externalInputs),
		[board, externalInputs],
	);
	const simulationResultRef = useRef(simulationResult);

	useEffect(() => {
		boardRef.current = board;
		needsRenderRef.current = true;
	}, [board]);

	useEffect(() => {
		simulationResultRef.current = simulationResult;
		needsRenderRef.current = true;
	}, [simulationResult]);

	useEffect(() => {
		toolRef.current = tool;
		if (tool === "TEST") {
			heldNodeRef.current = null;
			selectedSourcePortIdRef.current = null;
		}
		needsRenderRef.current = true;
	}, [tool]);

	useEffect(() => {
		if (!buildRequest) {
			return;
		}

		heldNodeRef.current = {
			source: "new",
			nodeKind: buildRequest.nodeKind,
			inputCount: buildRequest.inputCount,
			rotation: placementRotationRef.current,
		};
		selectedSourcePortIdRef.current = null;
		needsRenderRef.current = true;
	}, [buildRequest]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		const resizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			needsRenderRef.current = true;
		};

		const worldMousePosition = () =>
			screenToWorld(cameraRef.current, canvas, mousePositionRef.current);

		const getHeldGridPosition = () => {
			const mouseWorld = worldMousePosition();
			return {
				x: Math.floor(mouseWorld.x),
				y: Math.floor(mouseWorld.y),
			};
		};

		const getHeldPreviewPosition = () => {
			const mouseWorld = worldMousePosition();
			return {
				x: mouseWorld.x - 0.5,
				y: mouseWorld.y - 0.5,
			};
		};

		const getRenderableNode = (node: Node): Node => {
			const heldNode = heldNodeRef.current;
			if (
				heldNode?.source === "existing" &&
				heldNode.nodeId &&
				heldNode.nodeId === node.id
			) {
				return {
					...node,
					position: getHeldPreviewPosition(),
					rotation: heldNode.rotation,
				};
			}
			return node;
		};

		const buildRenderableLookups = (currentBoard: Board) => {
			const { portById, nodeByPortId } = buildPortLookup(currentBoard);
			const renderableNodeByPortId = Object.fromEntries(
				Object.entries(nodeByPortId).map(([portId, node]) => [
					portId,
					getRenderableNode(node),
				]),
			) as typeof nodeByPortId;
			const boardPortsById = {
				...currentBoard.inputPorts,
				...currentBoard.outputPorts,
			} satisfies Record<PortId, BoardPort>;

			return {
				portById,
				nodeByPortId,
				renderableNodeByPortId,
				boardPortsById,
			};
		};

		const getPortPosition = (portId: PortId) => {
			const currentBoard = boardRef.current;
			const { boardPortsById, renderableNodeByPortId } =
				buildRenderableLookups(currentBoard);
			return getPortWorldPosition({
				board: currentBoard,
				portId,
				boardPortsById,
				nodeByPortId: renderableNodeByPortId,
			});
		};

		const findPortAtMouse = () => {
			const currentBoard = boardRef.current;
			const { portById, boardPortsById, nodeByPortId, renderableNodeByPortId } =
				buildRenderableLookups(currentBoard);
			const mouseWorld = worldMousePosition();

			for (const port of Object.values(portById)) {
				const position = getPortWorldPosition({
					board: currentBoard,
					portId: port.id,
					boardPortsById,
					nodeByPortId: renderableNodeByPortId,
				});
				if (!position) {
					continue;
				}

				const size =
					port.ownerKind === "board"
						? BOARD_PORT_SIZE
						: getNodeOutletSize(getRenderableNode(nodeByPortId[port.id]));
				if (
					mouseWorld.x > position.x - size / 2 &&
					mouseWorld.x < position.x + size / 2 &&
					mouseWorld.y > position.y - size / 2 &&
					mouseWorld.y < position.y + size / 2
				) {
					return port.id;
				}
			}

			return null;
		};

		const findNodeAtMouse = () => {
			const mouseWorld = worldMousePosition();
			return (
				Object.values(boardRef.current.nodes).find(
					(node) =>
						node.position.x === Math.floor(mouseWorld.x) &&
						node.position.y === Math.floor(mouseWorld.y),
				) ?? null
			);
		};

		const draw = () => {
			frameRef.current = window.requestAnimationFrame(draw);
			if (!needsRenderRef.current) {
				return;
			}
			needsRenderRef.current = false;

			const currentBoard = boardRef.current;
			const currentSimulation = simulationResultRef.current;
			const camera = cameraRef.current;
			const { boardPortsById, renderableNodeByPortId } =
				buildRenderableLookups(currentBoard);

			context.resetTransform();
			context.imageSmoothingEnabled = false;
			context.clearRect(0, 0, canvas.width, canvas.height);

			context.translate(canvas.width / 2, canvas.height / 2);

			context.lineWidth = 1;
			for (
				let x = Math.floor(
					-canvas.width / camera.pixelsPerUnit / 2 + camera.position.x,
				);
				x <= canvas.width / camera.pixelsPerUnit / 2 + camera.position.x;
				x += 1
			) {
				context.strokeStyle = x === 0 ? "#4f5d75" : "#d8dde6";
				context.beginPath();
				const xValue = (x - camera.position.x) * camera.pixelsPerUnit;
				context.moveTo(xValue, -canvas.height / 2);
				context.lineTo(xValue, canvas.height / 2);
				context.stroke();
			}
			for (
				let y = Math.floor(
					-canvas.height / camera.pixelsPerUnit / 2 + camera.position.y,
				);
				y <= canvas.height / camera.pixelsPerUnit / 2 + camera.position.y;
				y += 1
			) {
				context.strokeStyle = y === 0 ? "#4f5d75" : "#d8dde6";
				context.beginPath();
				const yValue = (y - camera.position.y) * camera.pixelsPerUnit;
				context.moveTo(-canvas.width / 2, yValue);
				context.lineTo(canvas.width / 2, yValue);
				context.stroke();
			}

			context.scale(camera.pixelsPerUnit, camera.pixelsPerUnit);
			context.translate(-camera.position.x, -camera.position.y);

			hoveredPortIdRef.current = findPortAtMouse();

			if (heldNodeRef.current) {
				const targetCell = getHeldGridPosition();
				const occupiedNode = Object.values(currentBoard.nodes).find((node) => {
					if (
						heldNodeRef.current?.source === "existing" &&
						heldNodeRef.current.nodeId === node.id
					) {
						return false;
					}
					return (
						node.position.x === targetCell.x && node.position.y === targetCell.y
					);
				});

				context.save();
				context.fillStyle = occupiedNode
					? "rgba(231, 111, 81, 0.22)"
					: "rgba(244, 211, 94, 0.22)";
				context.strokeStyle = occupiedNode ? "#e76f51" : "#f4d35e";
				context.lineWidth = 1 / 20;
				context.fillRect(targetCell.x, targetCell.y, 1, 1);
				context.strokeRect(targetCell.x, targetCell.y, 1, 1);
				context.restore();
			}

			Object.values(currentBoard.wires).forEach((wire) => {
				const fromPosition = getPortWorldPosition({
					board: currentBoard,
					portId: wire.fromPortId,
					boardPortsById,
					nodeByPortId: renderableNodeByPortId,
				});
				const toPosition = getPortWorldPosition({
					board: currentBoard,
					portId: wire.toPortId,
					boardPortsById,
					nodeByPortId: renderableNodeByPortId,
				});
				if (!fromPosition || !toPosition) {
					return;
				}

				context.lineWidth = 1 / 24;
				context.strokeStyle = currentSimulation.snapshot.portValues[
					wire.fromPortId
				]
					? "#2a9d8f"
					: "#1f2933";
				context.beginPath();
				context.moveTo(fromPosition.x, fromPosition.y);
				context.lineTo(toPosition.x, toPosition.y);
				context.stroke();
			});

			if (
				selectedSourcePortIdRef.current &&
				toolRef.current === "DESIGN" &&
				!heldNodeRef.current
			) {
				const sourcePosition = getPortPosition(selectedSourcePortIdRef.current);
				if (sourcePosition) {
					const mouseWorld = worldMousePosition();
					context.lineWidth = 1 / 24;
					context.strokeStyle = currentSimulation.snapshot.portValues[
						selectedSourcePortIdRef.current
					]
						? "#2a9d8f"
						: "#1f2933";
					context.beginPath();
					context.moveTo(sourcePosition.x, sourcePosition.y);
					context.lineTo(mouseWorld.x, mouseWorld.y);
					context.stroke();
				}
			}

			Object.values(currentBoard.nodes).forEach((node) => {
				const renderableNode = getRenderableNode(node);
				const isHeldExistingNode =
					heldNodeRef.current?.source === "existing" &&
					heldNodeRef.current.nodeId === node.id;
				const definition = nodeDefinitions[node.kind];

				context.save();
				context.translate(
					renderableNode.position.x + 0.5,
					renderableNode.position.y + 0.5,
				);
				context.rotate(renderableNode.rotation);
				if (isHeldExistingNode) {
					context.scale(1.1, 1.1);
					context.globalAlpha = 0.72;
				}
				context.fillStyle = definition.color;
				context.strokeStyle = "#102a43";
				context.lineWidth = 1 / 28;
				context.fillRect(-0.5, -0.5, 1, 1);
				context.strokeRect(-0.5, -0.5, 1, 1);
				context.rotate(-renderableNode.rotation);
				context.fillStyle = "#102a43";
				context.font = "700 0.16px 'IBM Plex Mono', monospace";
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.fillText(definition.displayName.toUpperCase(), 0, 0);
				context.restore();

				getOrderedNodeInputPorts(node).forEach((port) => {
					const position = getNodeInputPortPosition(renderableNode, port);
					const isHovered =
						selectedSourcePortIdRef.current !== null &&
						hoveredPortIdRef.current === port.id;
					const isActive = currentSimulation.snapshot.portValues[port.id];
					const outletSize = getNodeOutletSize(renderableNode);
					context.fillStyle = isHovered
						? "#f4d35e"
						: isActive
							? "#2a9d8f"
							: "#d9e2ec";
					context.beginPath();
					context.ellipse(
						position.x,
						position.y,
						outletSize / 2,
						outletSize / 2,
						0,
						0,
						Math.PI * 2,
					);
					context.fill();
				});

				getOrderedNodeOutputPorts(node).forEach((port) => {
					const position = getNodeOutputPortPosition(renderableNode, port);
					const isHovered = hoveredPortIdRef.current === port.id;
					const isActive = currentSimulation.snapshot.portValues[port.id];
					const outletSize = getNodeOutletSize(renderableNode);
					context.fillStyle = isHovered
						? "#f4d35e"
						: isActive
							? "#2a9d8f"
							: "#d9e2ec";
					context.fillRect(
						position.x - outletSize / 2,
						position.y - outletSize / 2,
						outletSize,
						outletSize,
					);
				});
			});

			Object.values(currentBoard.inputPorts).forEach((port) => {
				const position = getBoardPortPosition(currentBoard, port);
				const isHovered =
					selectedSourcePortIdRef.current !== null &&
					hoveredPortIdRef.current === port.id;
				const isActive = currentSimulation.snapshot.portValues[port.id];
				context.fillStyle = isHovered
					? "#f4d35e"
					: isActive
						? "#2a9d8f"
						: "#d9e2ec";
				context.beginPath();
				context.ellipse(
					position.x,
					position.y,
					BOARD_PORT_SIZE / 2,
					BOARD_PORT_SIZE / 2,
					0,
					0,
					Math.PI * 2,
				);
				context.fill();
				context.fillStyle = "#102a43";
				context.font = "700 0.22px 'IBM Plex Sans', sans-serif";
				context.textAlign = "right";
				context.fillText(
					port.label ?? `IN ${port.index + 1}`,
					position.x - 0.35,
					position.y,
				);
			});

			Object.values(currentBoard.outputPorts).forEach((port) => {
				const position = getBoardPortPosition(currentBoard, port);
				const isHovered = hoveredPortIdRef.current === port.id;
				const isActive = currentSimulation.snapshot.portValues[port.id];
				context.fillStyle = isHovered
					? "#f4d35e"
					: isActive
						? "#2a9d8f"
						: "#d9e2ec";
				context.fillRect(
					position.x - BOARD_PORT_SIZE / 2,
					position.y - BOARD_PORT_SIZE / 2,
					BOARD_PORT_SIZE,
					BOARD_PORT_SIZE,
				);
				context.fillStyle = "#102a43";
				context.font = "700 0.22px 'IBM Plex Sans', sans-serif";
				context.textAlign = "left";
				context.fillText(
					port.label ?? `OUT ${port.index + 1}`,
					position.x + 0.35,
					position.y,
				);
			});

			if (heldNodeRef.current) {
				const heldNode = heldNodeRef.current;
				const previewPosition = getHeldPreviewPosition();
				const definition = nodeDefinitions[heldNode.nodeKind];
				context.save();
				context.translate(previewPosition.x + 0.5, previewPosition.y + 0.5);
				context.rotate(heldNode.rotation);
				context.scale(1.1, 1.1);
				context.globalAlpha = 0.72;
				context.fillStyle = definition.color;
				context.fillRect(-0.5, -0.5, 1, 1);
				context.strokeStyle = "#102a43";
				context.lineWidth = 1 / 28;
				context.strokeRect(-0.5, -0.5, 1, 1);
				drawRotationIndicator(context, 0);
				context.rotate(-heldNode.rotation);
				context.fillStyle = "#102a43";
				context.font = "700 0.16px 'IBM Plex Mono', monospace";
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.fillText(definition.displayName.toUpperCase(), 0, 0);
				context.font = "700 0.18px 'IBM Plex Mono', monospace";
				context.fillText(String(heldNode.inputCount), 0, -0.34);
				context.restore();
			}

			context.resetTransform();
			const controlLines = [
				"1 Test",
				"2 Design",
				"R Rotate",
				"Ctrl Place Multiple",
				"Right Drag Pan",
				"Right Click Cancel/Delete",
			];
			context.fillStyle = "#5b6573";
			context.font = "400 12px 'IBM Plex Sans', sans-serif";
			controlLines.forEach((line, index) => {
				context.fillText(line, 28, canvas.height - 146 + index * 18);
			});
			context.fillStyle = "#0c0e12";
			context.font = "700 20px 'IBM Plex Sans', sans-serif";
			context.fillText(currentBoard.name, 28, canvas.height - 28);
		};

		const handleMouseMove = (event: MouseEvent) => {
			mousePositionRef.current = { x: event.pageX, y: event.pageY };
			needsRenderRef.current = true;
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			keyStateRef.current[event.key] = true;
			if (event.key.toLowerCase() === "r") {
				if (heldNodeRef.current) {
					heldNodeRef.current = {
						...heldNodeRef.current,
						rotation:
							(heldNodeRef.current.rotation + Math.PI / 2) % (Math.PI * 2),
					};
				} else if (toolRef.current === "DESIGN") {
					placementRotationRef.current += Math.PI / 2;
					placementRotationRef.current %= Math.PI * 2;
				}
				needsRenderRef.current = true;
			}
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			keyStateRef.current[event.key] = false;
		};

		const handleMouseDown = (event: MouseEvent) => {
			if (event.button === 2) {
				const onMousePan = (moveEvent: MouseEvent) => {
					cameraRef.current.position.x -=
						moveEvent.movementX / cameraRef.current.pixelsPerUnit;
					cameraRef.current.position.y -=
						moveEvent.movementY / cameraRef.current.pixelsPerUnit;
					needsRenderRef.current = true;
				};
				window.addEventListener("mousemove", onMousePan);
				window.addEventListener(
					"mouseup",
					() => window.removeEventListener("mousemove", onMousePan),
					{ once: true },
				);
			}
		};

		const handleMouseUp = (event: MouseEvent) => {
			const hoveredPortId = findPortAtMouse();
			const hoveredPort = hoveredPortId
				? buildPortLookup(boardRef.current).portById[hoveredPortId]
				: null;

			const selectedNode = findNodeAtMouse();

			if (toolRef.current === "TEST" && event.button === 0) {
				if (selectedNode) {
					if (
						selectedNode.kind === "switch" &&
						selectedNode.data.kind === "switch"
					) {
						onBoardCommand({
							type: "setSwitchValue",
							nodeId: selectedNode.id,
							value: !selectedNode.data.value,
						});
					}
				} else if (
					hoveredPort &&
					hoveredPort.ownerKind === "board" &&
					hoveredPort.role === "boardInput"
				) {
					onExternalInputsChange((current) => ({
						...current,
						[hoveredPort.id]: !current[hoveredPort.id],
					}));
				}
			} else if (toolRef.current === "DESIGN" && event.button === 0) {
				const heldNode = heldNodeRef.current;
				if (heldNode) {
					const targetCell = getHeldGridPosition();
					const occupiedNode = Object.values(boardRef.current.nodes).find(
						(node) => {
							if (
								heldNode.source === "existing" &&
								heldNode.nodeId &&
								heldNode.nodeId === node.id
							) {
								return false;
							}
							return (
								node.position.x === targetCell.x &&
								node.position.y === targetCell.y
							);
						},
					);

					if (!occupiedNode) {
						if (heldNode.source === "new") {
							onBoardCommand({
								type: "addNode",
								kind: heldNode.nodeKind,
								position: targetCell,
								rotation: heldNode.rotation,
								inputCount: heldNode.inputCount,
							});
							if (!keyStateRef.current.Control) {
								heldNodeRef.current = null;
							}
						} else if (heldNode.nodeId) {
							if (keyStateRef.current.Control) {
								onBoardCommand({
									type: "addNode",
									kind: heldNode.nodeKind,
									position: targetCell,
									rotation: heldNode.rotation,
									inputCount: heldNode.inputCount,
								});
								heldNodeRef.current = {
									source: "new",
									nodeKind: heldNode.nodeKind,
									inputCount: heldNode.inputCount,
									rotation: heldNode.rotation,
								};
							} else {
								onBoardCommand({
									type: "moveNode",
									nodeId: heldNode.nodeId,
									position: targetCell,
								});
								onBoardCommand({
									type: "rotateNode",
									nodeId: heldNode.nodeId,
									rotation: heldNode.rotation,
								});
								heldNodeRef.current = null;
							}
						}
					}
				} else if (hoveredPort?.direction === "output") {
					selectedSourcePortIdRef.current = hoveredPort.id;
				} else if (
					selectedSourcePortIdRef.current &&
					hoveredPort?.direction === "input"
				) {
					onBoardCommand({
						type: "connectPorts",
						fromPortId: selectedSourcePortIdRef.current,
						toPortId: hoveredPort.id,
					});
					if (!keyStateRef.current.Shift) {
						selectedSourcePortIdRef.current = null;
					}
				} else if (selectedNode) {
					heldNodeRef.current = {
						source: "existing",
						nodeId: selectedNode.id,
						nodeKind: selectedNode.kind,
						inputCount: Object.keys(selectedNode.inputPorts).length,
						rotation: selectedNode.rotation,
					};
					selectedSourcePortIdRef.current = null;
				}
			} else if (toolRef.current === "DESIGN" && event.button === 2) {
				if (heldNodeRef.current) {
					heldNodeRef.current = null;
				} else if (selectedNode) {
					onBoardCommand({
						type: "deleteNode",
						nodeId: selectedNode.id,
					});
				} else if (hoveredPort?.ownerKind === "board") {
					onBoardCommand({
						type: "deleteBoardPort",
						portId: hoveredPort.id,
					});
				}
			}

			if (
				toolRef.current !== "DESIGN" ||
				event.button !== 0 ||
				heldNodeRef.current
			) {
				selectedSourcePortIdRef.current = null;
			}
			needsRenderRef.current = true;
		};

		const handleWheel = (event: WheelEvent) => {
			zoomAtPosition(
				cameraRef.current,
				-Math.sign(event.deltaY),
				screenToWorld(cameraRef.current, canvas, mousePositionRef.current),
			);
			needsRenderRef.current = true;
		};

		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault();
		};

		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		canvas.addEventListener("mousedown", handleMouseDown);
		canvas.addEventListener("mouseup", handleMouseUp);
		canvas.addEventListener("wheel", handleWheel);
		canvas.addEventListener("contextmenu", handleContextMenu);
		draw();

		return () => {
			window.removeEventListener("resize", resizeCanvas);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			canvas.removeEventListener("mousedown", handleMouseDown);
			canvas.removeEventListener("mouseup", handleMouseUp);
			canvas.removeEventListener("wheel", handleWheel);
			canvas.removeEventListener("contextmenu", handleContextMenu);
			if (frameRef.current !== null) {
				window.cancelAnimationFrame(frameRef.current);
			}
		};
	}, [onBoardCommand, onExternalInputsChange]);

	return <canvas ref={canvasRef} className="board-canvas" />;
};
