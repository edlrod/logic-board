import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import Board from "./lib/Board";
import Camera from "./lib/Camera";
import Chip from "./lib/Chip";
import type { ChipInput, Tool, Vector2 } from "./lib/types";

const MAIN_BOARD = new Board("");
const INITIAL_CHIP_TYPE = "NODE";
const TOOL_SEQUENCE: Tool[] = ["INTERACT", "DESIGN", "WIRE"];

function App() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const frameRef = useRef<number | null>(null);
	const mousePositionRef = useRef<Vector2>({ x: 0, y: 0 });
	const keyStateRef = useRef<Record<string, boolean>>({});
	const currentBoardRef = useRef<Board>(MAIN_BOARD);
	const selectedOutputChipRef = useRef<Chip | null>(null);
	const selectedRotationRef = useRef(0);
	const highlightedOutletRef = useRef<ChipInput | Chip | null>(null);
	const draggedChipRef = useRef<Chip | null>(null);
	const needsRenderRef = useRef(true);

	const [tool, setTool] = useState<Tool>("INTERACT");
	const [selectedBuildChipType, setSelectedBuildChipType] =
		useState(INITIAL_CHIP_TYPE);
	const [selectedInputNum, setSelectedInputNum] = useState(1);
	const [showInfo, setShowInfo] = useState(false);
	const [, setBoardVersion] = useState(0);

	const toolRef = useRef(tool);
	const selectedBuildChipTypeRef = useRef(selectedBuildChipType);
	const selectedInputNumRef = useRef(selectedInputNum);

	useEffect(() => {
		toolRef.current = tool;
		needsRenderRef.current = true;
	}, [tool]);

	useEffect(() => {
		selectedBuildChipTypeRef.current = selectedBuildChipType;
		needsRenderRef.current = true;
	}, [selectedBuildChipType]);

	useEffect(() => {
		selectedInputNumRef.current = selectedInputNum;
		needsRenderRef.current = true;
	}, [selectedInputNum]);

	const bumpBoardVersion = useCallback(() => {
		needsRenderRef.current = true;
		setBoardVersion((version) => version + 1);
	}, []);

	const clampInputs = useCallback((chipType: string, value: number) => {
		const properties = Chip.Chips[chipType];
		let nextValue = value;
		if (properties.minInputs !== null) {
			nextValue = Math.max(properties.minInputs, nextValue);
		}
		if (properties.maxInputs !== null) {
			nextValue = Math.min(properties.maxInputs, nextValue);
		}
		return nextValue;
	}, []);

	const setDesignChip = (chipType: string) => {
		const nextInputs = clampInputs(chipType, selectedInputNumRef.current);
		setSelectedBuildChipType(chipType);
		setSelectedInputNum(nextInputs);
		setTool("DESIGN");
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		Camera.initialize(canvas);

		const resizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			needsRenderRef.current = true;
		};

		const rotateDraggedChip = () => {
			if (toolRef.current === "DESIGN") {
				selectedRotationRef.current += Math.PI / 2;
				selectedRotationRef.current %= Math.PI * 2;
			}
			if (draggedChipRef.current) {
				draggedChipRef.current.rotation += Math.PI / 2;
				draggedChipRef.current.rotation %= Math.PI * 2;
				bumpBoardVersion();
			}
			needsRenderRef.current = true;
		};

		const draw = () => {
			frameRef.current = window.requestAnimationFrame(draw);
			if (!needsRenderRef.current) {
				return;
			}
			needsRenderRef.current = false;

			const currentBoard = currentBoardRef.current;
			const drawTasks: Array<{
				sort: number;
				task(graphics: CanvasRenderingContext2D): void;
			}> = [];

			context.resetTransform();
			context.imageSmoothingEnabled = false;
			context.clearRect(0, 0, canvas.width, canvas.height);

			context.fillStyle = "#0c0e12";
			context.font = "700 20px 'IBM Plex Sans', sans-serif";
			if (currentBoard.name) {
				context.fillText(currentBoard.name, 28, canvas.height - 28);
			}

			context.translate(canvas.width / 2, canvas.height / 2);

			const drawColumn = (x: number, color: string) => {
				context.strokeStyle = color;
				context.beginPath();
				const xValue = (x - Camera.position.x) * Camera.PPU;
				context.moveTo(xValue, -canvas.height / 2);
				context.lineTo(xValue, canvas.height / 2);
				context.stroke();
			};

			const drawRow = (y: number, color: string) => {
				context.strokeStyle = color;
				context.beginPath();
				const yValue = (y - Camera.position.y) * Camera.PPU;
				context.moveTo(-canvas.width / 2, yValue);
				context.lineTo(canvas.width / 2, yValue);
				context.stroke();
			};

			context.lineWidth = 1;
			for (
				let x = Math.floor(-canvas.width / Camera.PPU / 2 + Camera.position.x);
				x <= canvas.width / Camera.PPU / 2 + Camera.position.x;
				x += 1
			) {
				drawColumn(x, x === 0 ? "#4f5d75" : "#d8dde6");
			}
			for (
				let y = Math.floor(-canvas.height / Camera.PPU / 2 + Camera.position.y);
				y <= canvas.height / Camera.PPU / 2 + Camera.position.y;
				y += 1
			) {
				drawRow(y, y === 0 ? "#4f5d75" : "#d8dde6");
			}

			context.scale(Camera.PPU, Camera.PPU);
			context.translate(-Camera.position.x, -Camera.position.y);

			highlightedOutletRef.current = null;

			if (selectedOutputChipRef.current && toolRef.current === "WIRE") {
				drawTasks.push({
					sort: 4,
					task(graphics) {
						const outputPosition =
							selectedOutputChipRef.current?.getOutputPosition(0, 2);
						if (!outputPosition) {
							return;
						}
						const mousePos = Camera.screenToWorld(mousePositionRef.current);
						graphics.lineWidth = 1 / 32;
						graphics.strokeStyle = selectedOutputChipRef.current?.output
							? "#2a9d8f"
							: "#1f2933";
						graphics.beginPath();
						graphics.moveTo(outputPosition.x, outputPosition.y);
						graphics.lineTo(mousePos.x, mousePos.y);
						graphics.stroke();
					},
				});
			}

			currentBoard.chips.forEach((chip) => {
				drawTasks.push({
					sort: 1,
					task(graphics) {
						graphics.save();
						graphics.translate(chip.position.x + 0.5, chip.position.y + 0.5);
						graphics.rotate(chip.rotation);
						graphics.fillStyle = chip.color;
						graphics.strokeStyle = "#102a43";
						graphics.lineWidth = 1 / 28;
						graphics.fillRect(-0.5, -0.5, 1, 1);
						graphics.strokeRect(-0.5, -0.5, 1, 1);
						graphics.restore();
					},
				});

				const centeredOutputPosition = chip.getOutputPosition(0, 2);
				chip.outputChips.forEach((outputChip) => {
					const centeredInputPosition = outputChip.Chip.getInputPosition(
						outputChip.InputID,
						0,
						-0.5,
					);
					drawTasks.push({
						sort: 0,
						task(graphics) {
							graphics.lineWidth = 1 / 24;
							graphics.strokeStyle = chip.output ? "#2a9d8f" : "#1f2933";
							graphics.beginPath();
							graphics.moveTo(
								centeredOutputPosition.x,
								centeredOutputPosition.y,
							);
							graphics.lineTo(centeredInputPosition.x, centeredInputPosition.y);
							graphics.stroke();
						},
					});
				});

				drawTasks.push({
					sort: 0,
					task(graphics) {
						chip.inputs.forEach((input, index) => {
							const inputPosition = chip.getInputPosition(index, 0, 0);
							graphics.fillStyle = input ? "#2a9d8f" : "#d9e2ec";
							if (
								toolRef.current === "WIRE" &&
								selectedOutputChipRef.current &&
								isMouseInWorldRect(
									inputPosition.x - chip.outletSize / 2,
									inputPosition.y - chip.outletSize / 2,
									chip.outletSize,
									chip.outletSize,
								)
							) {
								graphics.fillStyle = "#f4d35e";
								highlightedOutletRef.current = {
									Chip: chip,
									InputID: index,
								};
							}

							graphics.beginPath();
							graphics.ellipse(
								inputPosition.x,
								inputPosition.y,
								chip.outletSize / 2,
								chip.outletSize / 2,
								0,
								0,
								Math.PI * 2,
							);
							graphics.fill();
						});

						const outputPosition = chip.getOutputPosition(0, 1);
						graphics.fillStyle = chip.output ? "#2a9d8f" : "#d9e2ec";
						if (
							toolRef.current === "WIRE" &&
							!selectedOutputChipRef.current &&
							isMouseInWorldRect(
								outputPosition.x - chip.outletSize / 2,
								outputPosition.y - chip.outletSize / 2,
								chip.outletSize,
								chip.outletSize,
							)
						) {
							graphics.fillStyle = "#f4d35e";
							highlightedOutletRef.current = chip;
						}
						graphics.fillRect(
							outputPosition.x - chip.outletSize / 2,
							outputPosition.y - chip.outletSize / 2,
							chip.outletSize,
							chip.outletSize,
						);
					},
				});

				drawTasks.push({
					sort: 2,
					task(graphics) {
						if (!chip.type) {
							return;
						}
						graphics.save();
						graphics.translate(chip.position.x + 0.5, chip.position.y + 0.5);
						graphics.rotate(chip.rotation);
						graphics.fillStyle = "#102a43";
						graphics.font = "700 0.21px 'IBM Plex Mono', monospace";
						graphics.textAlign = "center";
						graphics.textBaseline = "middle";
						graphics.fillText(chip.type, 0, 0);
						graphics.restore();
					},
				});
			});

			if (toolRef.current === "DESIGN") {
				drawTasks.push({
					sort: 3,
					task(graphics) {
						const mousePos = Camera.screenToWorld(mousePositionRef.current);
						const chipType = selectedBuildChipTypeRef.current;
						const chipProperties = Chip.Chips[chipType];

						graphics.save();
						graphics.translate(
							Math.floor(mousePos.x) + 0.5,
							Math.floor(mousePos.y) + 0.5,
						);
						graphics.rotate(selectedRotationRef.current);
						graphics.globalAlpha = 0.5;
						graphics.fillStyle = chipProperties.color ?? "#bcccdc";
						graphics.fillRect(-0.5, -0.5, 1, 1);
						graphics.fillStyle = "#102a43";
						graphics.font = "700 0.21px 'IBM Plex Mono', monospace";
						graphics.textAlign = "center";
						graphics.textBaseline = "middle";
						graphics.fillText(chipType, 0, 0);
						graphics.font = "700 0.18px 'IBM Plex Mono', monospace";
						graphics.fillText(String(selectedInputNumRef.current), 0, -0.34);
						graphics.restore();
					},
				});
			}

			drawTasks
				.sort((a, b) => a.sort - b.sort)
				.forEach((task) => {
					task.task(context);
				});
		};

		const handleMouseMove = (event: MouseEvent) => {
			mousePositionRef.current = { x: event.pageX, y: event.pageY };
			if (draggedChipRef.current && toolRef.current === "INTERACT") {
				const mousePos = Camera.screenToWorld(mousePositionRef.current);
				draggedChipRef.current.position = {
					x: Math.floor(mousePos.x),
					y: Math.floor(mousePos.y),
				};
				bumpBoardVersion();
			}
			needsRenderRef.current = true;
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			keyStateRef.current[event.key] = true;
			if (event.key.toLowerCase() === "r") {
				rotateDraggedChip();
			}
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			keyStateRef.current[event.key] = false;
		};

		const handleMouseDown = (event: MouseEvent) => {
			if (event.button === 2) {
				const onMouseMove = (moveEvent: MouseEvent) => {
					Camera.position.x -= moveEvent.movementX / Camera.PPU;
					Camera.position.y -= moveEvent.movementY / Camera.PPU;
					needsRenderRef.current = true;
				};
				window.addEventListener("mousemove", onMouseMove);
				window.addEventListener(
					"mouseup",
					() => {
						window.removeEventListener("mousemove", onMouseMove);
					},
					{ once: true },
				);
			}

			if (toolRef.current === "INTERACT" && event.button === 0) {
				const mousePos = Camera.screenToWorld(mousePositionRef.current);
				draggedChipRef.current =
					currentBoardRef.current.chips.find(
						(chip) =>
							chip.position.x === Math.floor(mousePos.x) &&
							chip.position.y === Math.floor(mousePos.y),
					) ?? null;
			}
		};

		const handleMouseUp = (event: MouseEvent) => {
			const currentBoard = currentBoardRef.current;
			if (toolRef.current === "WIRE") {
				if (!selectedOutputChipRef.current) {
					selectedOutputChipRef.current =
						highlightedOutletRef.current as Chip | null;
				} else if (highlightedOutletRef.current) {
					selectedOutputChipRef.current.setOutput(
						highlightedOutletRef.current as ChipInput,
					);
					if (!keyStateRef.current.Shift) {
						selectedOutputChipRef.current = null;
					}
					bumpBoardVersion();
				}
				needsRenderRef.current = true;
				return;
			}

			const mousePos = Camera.screenToWorld(mousePositionRef.current);
			const selectedChip =
				currentBoard.chips.find(
					(chip) =>
						chip.position.x === Math.floor(mousePos.x) &&
						chip.position.y === Math.floor(mousePos.y),
				) ?? null;

			if (selectedChip) {
				if (toolRef.current === "INTERACT" && event.button === 0) {
					if (selectedChip.type === "SWITCH") {
						selectedChip.output = !selectedChip.output;
						selectedChip.update();
						bumpBoardVersion();
					}
				}

				if (toolRef.current === "DESIGN" && event.button === 2) {
					if (
						selectedChip.outputChips.length === 0 &&
						!selectedChip.inputChips.some(Boolean)
					) {
						currentBoard.chips.splice(
							currentBoard.chips.indexOf(selectedChip),
							1,
						);
					} else {
						selectedChip.clean();
					}
					bumpBoardVersion();
				}
			} else {
				selectedOutputChipRef.current = null;
				if (toolRef.current === "DESIGN" && event.button === 0) {
					currentBoard.chips.push(
						new Chip(
							{
								x: Math.floor(mousePos.x),
								y: Math.floor(mousePos.y),
							},
							selectedBuildChipTypeRef.current,
							selectedInputNumRef.current,
							selectedRotationRef.current,
						),
					);
					bumpBoardVersion();
				}
			}

			draggedChipRef.current = null;
			needsRenderRef.current = true;
		};

		const handleWheel = (event: WheelEvent) => {
			if (toolRef.current === "DESIGN" && !keyStateRef.current.Shift) {
				setSelectedInputNum((value) =>
					clampInputs(
						selectedBuildChipTypeRef.current,
						value + -Math.sign(event.deltaY),
					),
				);
			} else {
				Camera.zoomAtPosition(
					-Math.sign(event.deltaY),
					Camera.screenToWorld(mousePositionRef.current),
				);
				needsRenderRef.current = true;
			}
		};

		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault();
		};

		const isMouseInWorldRect = (
			x: number,
			y: number,
			width: number,
			height: number,
		) => {
			const mousePos = Camera.screenToWorld(mousePositionRef.current);
			return (
				mousePos.x > x &&
				mousePos.x < x + width &&
				mousePos.y > y &&
				mousePos.y < y + height
			);
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
	}, [bumpBoardVersion, clampInputs]);

	const handleExport = async () => {
		const serialized = btoa(
			JSON.stringify(
				currentBoardRef.current.chips.map((chip) => chip.serialize()),
			),
		);
		if (!navigator.clipboard) {
			window.alert(serialized);
			return;
		}

		try {
			await navigator.clipboard.writeText(serialized);
			window.alert("Copied data.");
		} catch {
			window.alert("Clipboard write failed.");
		}
	};

	const handleImport = () => {
		try {
			const rawData = window.prompt("Enter board data:");
			if (!rawData) {
				return;
			}
			const parsed = JSON.parse(atob(rawData));
			if (!Array.isArray(parsed)) {
				throw new Error("Invalid import payload.");
			}

			const importedBoard = parsed.map((serializedChip) =>
				Chip.deserialize(serializedChip),
			);
			Chip.linkConnections(importedBoard);
			MAIN_BOARD.chips = importedBoard;
			currentBoardRef.current = MAIN_BOARD;
			setShowInfo(false);
			bumpBoardVersion();
		} catch {
			window.alert("An error occurred reading the data.");
		}
	};
	return (
		<div className="app-shell">
			<canvas ref={canvasRef} className="board-canvas" />
			<header className="toolbar">
				<div className="toolbar-group">
					{TOOL_SEQUENCE.map((toolName) => (
						<button
							key={toolName}
							type="button"
							className={
								tool === toolName ? "toolbar-btn selected" : "toolbar-btn"
							}
							onClick={() => setTool(toolName)}
						>
							{toolName}
						</button>
					))}
				</div>
				<div className="toolbar-divider" />
				<div className="toolbar-group chip-group">
					{Object.keys(Chip.Chips).map((chipType) => (
						<button
							key={chipType}
							type="button"
							className={
								selectedBuildChipType === chipType
									? "toolbar-btn chip-btn selected"
									: "toolbar-btn chip-btn"
							}
							onClick={() => setDesignChip(chipType)}
						>
							{chipType}
						</button>
					))}
				</div>
				<div className="toolbar-divider" />
				<div className="toolbar-group toolbar-actions">
					<button type="button" className="toolbar-btn" onClick={handleExport}>
						Export
					</button>
					<button type="button" className="toolbar-btn" onClick={handleImport}>
						Import
					</button>
					<button
						type="button"
						className="toolbar-btn"
						onClick={() => setShowInfo((visible) => !visible)}
					>
						Help
					</button>
				</div>
			</header>

			{showInfo ? (
				<aside className="help-panel">
					<h1>Logic Board</h1>
					<p>Interact: drag chips and toggle switches.</p>
					<p>
						Design: place chips, rotate with R, and scroll to change input
						count.
					</p>
					<p>Wire: click an output, then click an input to connect chips.</p>
					<p>
						Right-drag pans the camera. Scroll zooms unless Design mode is
						editing inputs.
					</p>
				</aside>
			) : null}
		</div>
	);
}

export default App;
