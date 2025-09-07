import Board from "./Board";
import Camera from "./Camera";
import Chip from "./Chip";
import Input from "./Input";
import type { ChipInput } from "./types";

(window as any).$ = (selector: string) => document.querySelector(selector);
declare var $: (selector: string) => HTMLElement | null;
const canvas = $("canvas") as HTMLCanvasElement;
const g: CanvasRenderingContext2D | null = canvas.getContext("2d");

let tool: string = "INTERACT";

const MAIN_BOARD = new Board("");

let currentBoard = MAIN_BOARD;

let selectedOutputChip: Chip | null = null;
let selectedBuildChipType: string = "NODE";
let selectedInputNum: number = 1;
let selectedRotation: number = 0;
let highlightedOutlet: ChipInput | Chip | null = null;
let draggedChip: Chip | null = null;

window.addEventListener("load", () => {
	const resizeCanvas = () => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		draw();
	};
	resizeCanvas();
	window.addEventListener("resize", resizeCanvas);

	Input.initialize();
	Camera.initialize(canvas);

	// Setup Rotation Listener
	Input.onKeyPressed("r", () => {
		if (tool === "DESIGN") {
			selectedRotation += Math.PI / 2;
			selectedRotation %= Math.PI * 2;
		}
		if (draggedChip) {
			draggedChip.rotation += Math.PI / 2;
			draggedChip.rotation %= Math.PI * 2;
		}
	});

	// Setup Toolbar Buttons
	const toolbarBtns = Array.from(
		$("#toolbar")?.getElementsByClassName("tool-toggle") ?? [],
	);
	toolbarBtns.forEach((toolBtn) => {
		if (toolBtn.getAttribute("toolName") === tool)
			toolBtn.classList.add("selected");
		toolBtn.addEventListener("click", () => {
			toolbarBtns.forEach((btn) => {
				btn.classList.remove("selected");
			});
			toolBtn.classList.add("selected");
			tool = toolBtn.getAttribute("toolName")!;
		});
	});
	const chipBtns: HTMLElement[] = [];
	Object.keys(Chip.Chips).forEach((chipType) => {
		const properties = Chip.Chips[chipType];
		const chipBtn = document.createElement("span");
		$("#toolbar")?.insertBefore(chipBtn, $("#divider-2"));
		chipBtns.push(chipBtn);
		chipBtn.classList.add("toolbar-btn", "chip");
		chipBtn.innerHTML = properties.icon
			? `<img src="${properties.icon}">`
			: chipType.toUpperCase();
		if (chipType === selectedBuildChipType) chipBtn.classList.add("selected");
		chipBtn.addEventListener("click", () => {
			//if (clickEvt.target !== clickEvt.currentTarget) return;
			const chipBtns = Array.from(document.getElementsByClassName("chip"));
			chipBtns.forEach((btn) => {
				btn.classList.remove("selected");
			});
			chipBtn.classList.add("selected");
			selectedBuildChipType = chipType;

			const properties = Chip.Chips[chipType];

			if (properties.minInputs !== null)
				selectedInputNum = Math.max(properties.minInputs, selectedInputNum);
			if (properties.maxInputs !== null)
				selectedInputNum = Math.min(properties.maxInputs, selectedInputNum);

			tool = "DESIGN";
			toolbarBtns.forEach((toolBtn) => {
				toolBtn.classList.remove("selected");
				if (toolBtn.getAttribute("toolName") === tool)
					toolBtn.classList.add("selected");
			});
		});
	});

	window.requestAnimationFrame(draw);
});
const draw = () => {
	if (!g) return;
	// Setup
	const drawTask: {
		sort: number;
		task(g: CanvasRenderingContext2D): void;
	}[] = [];
	g.resetTransform();
	g.imageSmoothingEnabled = false;
	g.clearRect(0, 0, canvas.width, canvas.height);

	// Draw Text
	g.fillStyle = "#000";
	g.font = "bold 24px consolas";
	if (currentBoard.name) g.fillText(currentBoard.name, 24, canvas.height - 24);

	g.translate(canvas.width / 2, canvas.height / 2);

	// Draw Gridlines
	g.lineWidth = 1;
	const drawColumn = (x: number, color: string) => {
		g.strokeStyle = color;
		g.beginPath();
		const xValue = (x - Camera.position.x) * Camera.PPU;
		g.moveTo(xValue, -canvas.height / 2);
		g.lineTo(xValue, canvas.height / 2);
		g.stroke();
	};
	const drawRow = (y: number, color: string) => {
		g.strokeStyle = color;
		g.beginPath();
		const yValue = (y - Camera.position.y) * Camera.PPU;
		g.moveTo(-canvas.width / 2, yValue);
		g.lineTo(canvas.width / 2, yValue);
		g.stroke();
	};
	for (
		let x = Math.floor(-canvas.width / Camera.PPU / 2 + Camera.position.x);
		x <= canvas.width / Camera.PPU / 2 + Camera.position.x;
		x++
	) {
		drawColumn(x, "#ddd");
	}
	for (
		let y = Math.floor(-canvas.height / Camera.PPU / 2 + Camera.position.y);
		y <= canvas.height / Camera.PPU / 2 + Camera.position.y;
		y++
	) {
		drawRow(y, "#ddd");
	}
	drawRow(0, "#000");
	drawColumn(0, "#000");

	g.scale(Camera.PPU, Camera.PPU);
	g.translate(-Camera.position.x, -Camera.position.y);

	highlightedOutlet = null;

	// Draw selected output wire
	if (selectedOutputChip && tool === "WIRE")
		drawTask.push({
			sort: 4,
			task(g) {
				const centeredOutputPosition = selectedOutputChip?.getOutputPosition(
					0,
					2,
				);
				if (!centeredOutputPosition) return;
				const mousePos = Camera.screenToWorld(Input.mousePosition);
				g.lineWidth = 1 / 32;
				g.strokeStyle = selectedOutputChip?.output ? "#0f0" : "#000";
				g.beginPath();
				g.moveTo(centeredOutputPosition.x, centeredOutputPosition.y);
				g.lineTo(mousePos.x, mousePos.y);
				g.stroke();
			},
		});

	// Draw Chips
	currentBoard.chips.forEach((chip) => {
		// Draw Chip
		drawTask.push({
			sort: 1,
			task(g) {
				g.save();
				g.translate(chip.position.x + 0.5, chip.position.y + 0.5);
				g.rotate(chip.rotation);
				g.fillStyle = chip.color;
				g.fillRect(-0.5, -0.5, 1, 1);
				g.restore();
			},
		});

		// Draw Output Wires
		const centeredOutputPosition = chip.getOutputPosition(0, 2);
		chip.outputChips.forEach((outputChip) => {
			const centeredInputPosition = outputChip.Chip.getInputPosition(
				outputChip.InputID,
				0,
				-0.5,
			);
			drawTask.push({
				sort: 0,
				task(g) {
					g.lineWidth = 1 / 32;
					g.strokeStyle = chip.output ? "#0f0" : "#000";
					g.beginPath();
					g.moveTo(centeredOutputPosition.x, centeredOutputPosition.y);
					g.lineTo(centeredInputPosition.x, centeredInputPosition.y);
					g.stroke();
				},
			});
		});

		drawTask.push({
			sort: 0,
			task(g) {
				// Draw Inputs
				chip.inputs.forEach((input, i) => {
					const inputPosition = chip.getInputPosition(i, 0, 0);
					g.fillStyle = input ? "#0f0" : "#aaa";
					if (
						tool === "WIRE" &&
						selectedOutputChip &&
						Input.mouseIn(
							inputPosition.x - chip.outletSize / 2,
							inputPosition.y - chip.outletSize / 2,
							chip.outletSize,
							chip.outletSize,
						)
					) {
						g.fillStyle = "#ff0";
						highlightedOutlet = {
							Chip: chip,
							InputID: i,
						};
					}

					g.beginPath();
					g.ellipse(
						inputPosition.x,
						inputPosition.y,
						chip.outletSize / 2,
						chip.outletSize / 2,
						0,
						0,
						Math.PI * 2,
					);
					/*g.fillRect(    
                        inputPosition.x - chip.outletSize / 2,
                        inputPosition.y - chip.outletSize / 2,
                        chip.outletSize, chip.outletSize
                    );*/
					g.fill();
				});

				// Draw Output
				g.fillStyle = chip.output ? "#0f0" : "#aaa";
				const outputPosition = chip.getOutputPosition(0, 1);
				if (
					tool === "WIRE" &&
					!selectedOutputChip &&
					Input.mouseIn(
						outputPosition.x - chip.outletSize / 2,
						outputPosition.y - chip.outletSize / 2,
						chip.outletSize,
						chip.outletSize,
					)
				) {
					g.fillStyle = "#ff0";
					highlightedOutlet = chip;
				}
				g.fillRect(
					outputPosition.x - chip.outletSize / 2,
					outputPosition.y - chip.outletSize / 2,
					chip.outletSize,
					chip.outletSize,
				);
			},
		});

		// Draw Label
		drawTask.push({
			sort: 2,
			task(g) {
				if (!chip.type) return;
				const properties = Chip.Chips[chip.type];
				g.save();
				g.translate(chip.position.x + 0.5, chip.position.y + 0.5);
				g.rotate(chip.rotation);
				if (properties.icon) {
					if (!properties.iconElm) {
						properties.iconElm = document.createElement("img");
						properties.iconElm.src = properties.icon;
					}
					g.drawImage(properties.iconElm, -0.5, -0.5, 1, 1);
				} else {
					g.font = "bold 1px consolas";
					g.fillStyle = "#000";
					g.fillText(chip.type, -0.5, -0.5 + 1, 1);
				}
				g.restore();
			},
		});
	});

	// Ghost Design
	if (tool === "DESIGN")
		drawTask.push({
			sort: 3,
			task(g) {
				g.save();
				const mousePos = Camera.screenToWorld(Input.mousePosition);
				g.translate(Math.floor(mousePos.x) + 0.5, Math.floor(mousePos.y) + 0.5);
				g.rotate(selectedRotation);
				g.globalAlpha = 0.5;

				const chipProperties = Chip.Chips[selectedBuildChipType];
				g.fillStyle = chipProperties.color ?? "#aaa";
				g.fillRect(-0.5, -0.5, 1, 1);

				// Draw Label
				g.font = "bold 1px consolas";
				g.fillStyle = "#000";
				g.fillText(selectedBuildChipType, -0.5, -0.5 + 1, 1);

				// Draw Input Label
				g.font = `bold 0.5px consolas`;
				g.fillText(
					selectedInputNum.toString(),
					-0.5 + 0.5 - g.measureText(selectedInputNum.toString()).width / 2,
					-0.5,
					1,
				);

				g.globalAlpha = 1;
				g.restore();
			},
		});

	drawTask
		.sort((a, b) => a.sort - b.sort)
		.forEach((task) => {
			task.task(g);
		});

	window.requestAnimationFrame(draw);
};

canvas.addEventListener("mousedown", (evtMouseDown: MouseEvent) => {
	if (evtMouseDown.button === 2) {
		const onMouseMove = (evtMouseMove: MouseEvent) => {
			Camera.position.x -= evtMouseMove.movementX / Camera.PPU;
			Camera.position.y -= evtMouseMove.movementY / Camera.PPU;
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
	if (tool === "INTERACT" && evtMouseDown.button === 0) {
		const mousePos = Camera.screenToWorld(Input.mousePosition);
		const selectedChip =
			currentBoard.chips.find((chip) => {
				return (
					chip.position.x === Math.floor(mousePos.x) &&
					chip.position.y === Math.floor(mousePos.y)
				);
			}) ?? null;
		draggedChip = selectedChip;
		const onMouseMove = () => {
			const mousePos = Camera.screenToWorld(Input.mousePosition);
			if (draggedChip) {
				draggedChip.position = {
					x: Math.floor(mousePos.x),
					y: Math.floor(mousePos.y),
				};
			}
		};
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener(
			"mouseup",
			() => {
				window.removeEventListener("mousemove", onMouseMove);
				draggedChip = null;
			},
			{ once: true },
		);
	}
});
canvas.addEventListener("mouseup", (evtMouseUp: MouseEvent) => {
	if (tool === "WIRE") {
		if (!selectedOutputChip) selectedOutputChip = highlightedOutlet as Chip;
		else {
			selectedOutputChip.setOutput(highlightedOutlet as ChipInput);
			if (!Input.keyDown.Shift) selectedOutputChip = null;
		}
		return;
	}

	const mousePos = Camera.screenToWorld(Input.mousePosition);
	const selectedChip: Chip | null =
		currentBoard.chips.find(
			(chip) =>
				chip.position.x === Math.floor(mousePos.x) &&
				chip.position.y === Math.floor(mousePos.y),
		) ?? null;
	if (selectedChip) {
		if (tool === "INTERACT" && evtMouseUp.button === 0) {
			if (selectedChip.type === "SWITCH") {
				selectedChip.output = !selectedChip.output;
				selectedChip.update();
			}
		}
		if (tool === "DESIGN" && evtMouseUp.button === 2) {
			console.log(selectedChip.inputChips);
			if (
				selectedChip.outputChips.length === 0 &&
				!selectedChip.inputChips.map((x) => (x ? 1 : 0)).includes(1)
			) {
				currentBoard.chips.splice(currentBoard.chips.indexOf(selectedChip), 1);
			} else selectedChip.clean();
		}
	} else {
		selectedOutputChip = null;
		if (tool === "DESIGN" && evtMouseUp.button === 0) {
			const mousePos = Camera.screenToWorld(Input.mousePosition);
			currentBoard.chips.push(
				new Chip(
					{
						x: Math.floor(mousePos.x),
						y: Math.floor(mousePos.y),
					},
					selectedBuildChipType,
					selectedInputNum,
					selectedRotation,
				),
			);
		}
	}
});
canvas.addEventListener("wheel", (evtWheel: WheelEvent) => {
	if (tool === "DESIGN" && !Input.keyDown.Shift) {
		selectedInputNum += -Math.sign(evtWheel.deltaY);
		const properties = Chip.Chips[selectedBuildChipType];
		if (properties.minInputs !== null)
			selectedInputNum = Math.max(properties.minInputs, selectedInputNum);
		if (properties.maxInputs !== null)
			selectedInputNum = Math.min(properties.maxInputs, selectedInputNum);
	} else {
		Camera.zoomAtPosition(
			-Math.sign(evtWheel.deltaY),
			Camera.screenToWorld(Input.mousePosition),
		);
	}
});
canvas.addEventListener("contextmenu", (evtContextMenu: MouseEvent) => {
	evtContextMenu.preventDefault();
});
$("#exportBtn")?.addEventListener("click", () => {
	const data: string = btoa(
		JSON.stringify(currentBoard.chips.map((chip) => chip.serialize())),
	);
	if (!navigator.clipboard) return alert(data);
	navigator.clipboard.writeText(data).then(
		() => alert("Copied data!"),
		() => alert("An error occurred. Could not copy data."),
	);
});
$("#importBtn")?.addEventListener("click", () => {
	try {
		const result = JSON.parse(atob(prompt("Enter data: ") ?? ""));
		const importedBoard = new Board("Imported Board");
		importedBoard.chips = result.map((x: any) => {
			const newChip = new Chip(
				{
					x: 0,
					y: 0,
				},
				"NODE",
				0,
				0,
			);
			Object.assign(newChip, x);
			return newChip;
		});
		for (let i = 0; i < currentBoard.chips.length; i++) {
			for (let j = 0; j < currentBoard.chips[i].outputChips.length; j++) {
				if (currentBoard.chips[i].outputChips[j].Chip)
					currentBoard.chips[i].outputChips[j].Chip = currentBoard.chips.find(
						(x: any) => x.ID === currentBoard.chips[i].outputChips[j].Chip,
					)!;
			}
			for (let j = 0; j < currentBoard.chips[i].inputChips.length; j++) {
				if (currentBoard.chips[i].inputChips[j])
					currentBoard.chips[i].inputChips[j] = currentBoard.chips.find(
						(x: any) => x.ID === currentBoard.chips[i].inputChips[j],
					)!;
			}
		}
	} catch {
		alert("An error occurred reading the data.");
	}
});
if ($("#addBtn"))
	$("#addBtn")?.addEventListener("click", () => {
		let boardName = "";
		do {
			boardName = prompt("Enter board name: ") ?? "";
		} while (!boardName || boardName.trim() === "");
		const newBoard = new Board(boardName);
		currentBoard = newBoard;
		($("#backBtn") as HTMLSpanElement).style.display = "block";
		Chip.Chips[newBoard.name!] = {
			minInputs: 2,
			maxInputs: 2,
			color: "#aaa",
		};

		const toolbarBtns = Array.from(
			$("#toolbar")?.getElementsByClassName("tool-toggle") ?? [],
		);
		const chipBtns = Array.from(document.getElementsByClassName("chip"));

		const chipBtn = document.createElement("span");
		$("#toolbar")?.insertBefore(chipBtn, $("#divider-2"));
		chipBtn.classList.add("toolbar-btn", "chip");

		const label = document.createElement("span");
		label.innerText = newBoard.name ?? "";
		const edit = document.createElement("button");
		edit.innerText = "Edit";
		edit.addEventListener("click", () => {
			currentBoard = newBoard;
			($("#backBtn") as HTMLSpanElement).style.display = "block";
		});
		chipBtn.append(label, edit);

		chipBtn.addEventListener("click", () => {
			chipBtns.forEach((btn) => {
				btn.classList.remove("selected");
			});
			chipBtn.classList.add("selected");
			selectedBuildChipType = newBoard.name ?? "";

			const properties = Chip.Chips[newBoard.name ?? ""];

			if (properties.minInputs !== null)
				selectedInputNum = Math.max(properties.minInputs, selectedInputNum);
			if (properties.maxInputs !== null)
				selectedInputNum = Math.min(properties.maxInputs, selectedInputNum);

			tool = "DESIGN";
			toolbarBtns.forEach((toolBtn) => {
				toolBtn.classList.remove("selected");
				if (toolBtn.getAttribute("toolName") === tool)
					toolBtn.classList.add("selected");
			});
		});
	});
$("#backBtn")?.addEventListener("click", () => {
	currentBoard = MAIN_BOARD;
	($("#backBtn") as HTMLSpanElement).style.display = "none";
});
