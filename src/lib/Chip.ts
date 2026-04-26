import Camera from "./Camera";
import type { ChipInfo, ChipInput, SerializedChip, Vector2 } from "./types";

export default class Chip {
	public static Chips: Record<string, ChipInfo> = {
		NOT: {
			minInputs: 1,
			maxInputs: 1,
			color: "#f4a261",
			evaluate(inputs) {
				return !inputs[0];
			},
		},
		AND: {
			minInputs: 2,
			maxInputs: null,
			color: "#8ecae6",
			evaluate(inputs) {
				return !inputs.includes(false);
			},
		},
		OR: {
			minInputs: 2,
			maxInputs: null,
			color: "#90be6d",
			evaluate(inputs) {
				return inputs.includes(true);
			},
		},
		XOR: {
			minInputs: 2,
			maxInputs: null,
			color: "#e76f51",
			evaluate(inputs) {
				return inputs.includes(true) && inputs.includes(false);
			},
		},
		NODE: {
			minInputs: 1,
			maxInputs: 1,
			color: "#cdb4db",
			evaluate(inputs) {
				return inputs[0];
			},
		},
		SWITCH: {
			minInputs: 0,
			maxInputs: 0,
			color: "#ffd166",
		},
	};

	public position: Vector2 = { x: 0, y: 0 };
	public color = "#bcccdc";
	public inputs: boolean[];
	public inputChips: Array<Chip | null>;
	public output = false;
	public outputChips: ChipInput[] = [];
	public rotation: number;
	public outletSize = 0.25;
	public type: string | null = null;
	public readonly ID: string;

	private static usedIDs = new Set<string>();

	constructor(
		position: Vector2,
		type: string,
		inputs: number,
		rotation: number,
	) {
		this.position = position;
		this.type = type.toUpperCase();
		this.ID = Chip.generateID();

		const chipProperties = Chip.Chips[this.type];
		const normalizedInputs = Chip.normalizeInputs(chipProperties, inputs);
		this.inputs = new Array(normalizedInputs).fill(false);
		this.inputChips = new Array(normalizedInputs).fill(null);
		this.rotation = rotation;
		this.color = chipProperties.color ?? "#bcccdc";
		this.outletSize = Math.min(0.25, 1 / (normalizedInputs + 1 || 1));
	}

	private static normalizeInputs(chipProperties: ChipInfo, inputs: number) {
		let nextInputs = inputs;
		if (chipProperties.minInputs !== null) {
			nextInputs = Math.max(chipProperties.minInputs, nextInputs);
		}
		if (chipProperties.maxInputs !== null) {
			nextInputs = Math.min(chipProperties.maxInputs, nextInputs);
		}
		return nextInputs;
	}

	private static generateID() {
		const chars =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
		let newID = "";
		do {
			newID = "";
			for (let index = 0; index < 10; index += 1) {
				newID += chars[Math.floor(Math.random() * chars.length)];
			}
		} while (Chip.usedIDs.has(newID));
		Chip.usedIDs.add(newID);
		return newID;
	}

	public update(visited = new Set<string>()) {
		if (!this.type || visited.has(this.ID)) {
			return;
		}

		visited.add(this.ID);
		const chipProperties = Chip.Chips[this.type];
		if (this.inputs.length > 0) {
			this.output = chipProperties.evaluate?.(this.inputs) ?? false;
		}

		this.outputChips.forEach((outputChip) => {
			outputChip.Chip.inputs[outputChip.InputID] =
				outputChip.Chip === this ? false : this.output;
			outputChip.Chip.update(visited);
		});
	}

	public setOutput(chipInput: ChipInput) {
		const existingConnection = chipInput.Chip.inputChips[chipInput.InputID];
		if (existingConnection) {
			existingConnection.outputChips = existingConnection.outputChips.filter(
				(outputChip) =>
					!(
						outputChip.Chip === chipInput.Chip &&
						outputChip.InputID === chipInput.InputID
					),
			);
			chipInput.Chip.inputChips[chipInput.InputID] = null;
			chipInput.Chip.inputs[chipInput.InputID] = false;
		}

		this.outputChips = this.outputChips.filter(
			(outputChip) =>
				!(
					outputChip.Chip === chipInput.Chip &&
					outputChip.InputID === chipInput.InputID
				),
		);
		this.outputChips.push({
			Chip: chipInput.Chip,
			InputID: chipInput.InputID,
		});
		chipInput.Chip.inputChips[chipInput.InputID] = this;
		this.update();
	}

	public clean() {
		const outgoingConnections = [...this.outputChips];
		outgoingConnections.forEach((outputChip) => {
			outputChip.Chip.inputChips[outputChip.InputID] = null;
			outputChip.Chip.inputs[outputChip.InputID] = false;
			outputChip.Chip.update();
		});
		this.outputChips = [];

		this.inputChips.forEach((chip, index) => {
			if (!chip) {
				return;
			}
			chip.outputChips = chip.outputChips.filter(
				(outputChip) =>
					outputChip.Chip !== this || outputChip.InputID !== index,
			);
			this.inputChips[index] = null;
		});
	}

	public getInputPosition(inputID: number, xOffset = 0, yOffset = 0): Vector2 {
		const preRotation = {
			x:
				(xOffset / 2) * this.outletSize +
				(inputID - this.inputs.length / 2 + 0.5) /
					Math.max(this.inputs.length, 1),
			y: -0.5 + (yOffset / 2) * this.outletSize,
		};
		const rotatedPoint = Camera.rotatePoint(preRotation, this.rotation);
		return {
			x: this.position.x + 0.5 + rotatedPoint.x,
			y: this.position.y + 0.5 + rotatedPoint.y,
		};
	}

	public getOutputPosition(xOffset = 0, yOffset = 0): Vector2 {
		const preRotation = {
			x: (xOffset / 2) * this.outletSize,
			y: 0.5 + (yOffset / 2) * this.outletSize,
		};
		const rotatedPoint = Camera.rotatePoint(preRotation, this.rotation);
		return {
			x: this.position.x + 0.5 + rotatedPoint.x,
			y: this.position.y + 0.5 + rotatedPoint.y,
		};
	}

	public serialize(): SerializedChip {
		return {
			ID: this.ID,
			color: this.color,
			inputChips: this.inputChips.map((chip) => chip?.ID ?? null),
			inputs: [...this.inputs],
			outputChips: this.outputChips.map((outputChip) => ({
				Chip: outputChip.Chip.ID,
				InputID: outputChip.InputID,
			})),
			position: structuredClone(this.position),
			rotation: this.rotation,
			type: this.type,
		};
	}

	public static deserialize(serializedChip: SerializedChip) {
		const newChip = new Chip(
			structuredClone(serializedChip.position),
			serializedChip.type ?? "NODE",
			serializedChip.inputs.length,
			serializedChip.rotation,
		);

		Object.assign(newChip, {
			color: serializedChip.color,
			inputs: [...serializedChip.inputs],
			inputChips: [...serializedChip.inputChips],
			outputChips: serializedChip.outputChips.map((outputChip) => ({
				Chip: outputChip.Chip,
				InputID: outputChip.InputID,
			})),
			type: serializedChip.type,
		});

		Chip.usedIDs.add(serializedChip.ID);
		Object.defineProperty(newChip, "ID", {
			value: serializedChip.ID,
			writable: false,
			configurable: true,
		});

		return newChip as Chip;
	}

	public static linkConnections(chips: Chip[]) {
		const byId = new Map(chips.map((chip) => [chip.ID, chip]));
		chips.forEach((chip) => {
			chip.outputChips = chip.outputChips
				.map((outputChip) => {
					const targetChip =
						typeof outputChip.Chip === "string"
							? byId.get(outputChip.Chip)
							: outputChip.Chip;
					if (!targetChip) {
						return null;
					}
					return {
						Chip: targetChip,
						InputID: outputChip.InputID,
					};
				})
				.filter((outputChip): outputChip is ChipInput => outputChip !== null);

			chip.inputChips = chip.inputChips.map((inputChip) => {
				if (!inputChip) {
					return null;
				}
				return typeof inputChip === "string"
					? (byId.get(inputChip) ?? null)
					: inputChip;
			});
			chip.outletSize = Math.min(0.25, 1 / (chip.inputs.length + 1 || 1));
		});
	}
}
