import Camera from "./Camera";
import type { ChipInfo, ChipInput, Vector2 } from "./types";

export default class Chip {
	public static Chips: Record<string, ChipInfo> = {
		NOT: {
			minInputs: 1,
			maxInputs: 1,
			evaluate: (inputs) => {
				return !inputs[0];
			},
			icon: "./not.png",
		},
		AND: {
			minInputs: 2,
			maxInputs: null,
			evaluate: (inputs) => {
				return !inputs.includes(false);
			},
			icon: "./and.png",
		},
		OR: {
			minInputs: 2,
			maxInputs: null,
			evaluate: (inputs) => {
				return inputs.includes(true);
			},
			icon: "./or.png",
		},
		XOR: {
			minInputs: 2,
			maxInputs: null,
			evaluate: (inputs) => {
				return inputs.includes(true) && inputs.includes(false);
			},
			icon: "./xor.png",
		},
		NODE: {
			minInputs: 1,
			maxInputs: 1,
			evaluate: (inputs) => {
				return inputs[0];
			},
		},
		SWITCH: {
			minInputs: 0,
			maxInputs: 0,
		},
	};
	public outletSize = 0.25;

	position: Vector2 = {
		x: 0,
		y: 0,
	};
	color: string = "#aaa";

	inputs: boolean[];
	public inputChips: Chip[];
	output: boolean = false;
	public outputChips: ChipInput[] = [];
	public rotation: number;

	private static usedIDs: string[] = [];
	public readonly ID: string = Chip.generateID();

	type: string | null = null;

	constructor(
		position: Vector2,
		type: string,
		inputs: number,
		rotation: number,
	) {
		this.position = position;
		this.type = type.toUpperCase();

		const chipProperties: ChipInfo = Chip.Chips[this.type];

		if (chipProperties.minInputs !== null)
			inputs = Math.max(inputs, chipProperties.minInputs);
		if (chipProperties.maxInputs !== null)
			inputs = Math.min(inputs, chipProperties.maxInputs);
		this.inputs = new Array(inputs).fill(false);
		this.inputChips = new Array(inputs).fill(null);

		this.outletSize = Math.min(0.25, 1 / (inputs + 1));

		this.rotation = rotation;
	}
	public update() {
		// Evaluate inputs
		if (!this.type) return;
		const chipProperties: ChipInfo = Chip.Chips[this.type];
		if (this.inputs.length > 0)
			this.output = chipProperties.evaluate?.(this.inputs) ?? false;

		// Update outputs
		this.outputChips.forEach((outputChip) => {
			outputChip.Chip.inputs[outputChip.InputID] = this.output;
			if (outputChip.Chip === this)
				outputChip.Chip.inputs[outputChip.InputID] = false;

			outputChip.Chip.update();
		});
	}
	public setOutput(chipInput: ChipInput) {
		if (!chipInput) return;
		const existingOutput =
			chipInput.Chip.inputChips[chipInput.InputID] !== null;
		if (existingOutput) {
			const existingChipConnection =
				chipInput.Chip.inputChips[chipInput.InputID];
			existingChipConnection.outputChips.splice(
				existingChipConnection.outputChips.indexOf(chipInput),
				1,
			);
			chipInput.Chip.inputChips[chipInput.InputID] = null as unknown as Chip;
			chipInput.Chip.inputs[chipInput.InputID] = false;
		}
		this.outputChips.push({
			Chip: chipInput.Chip,
			InputID: chipInput.InputID,
		});
		chipInput.Chip.inputChips[chipInput.InputID] = this;
		this.update();
	}
	public clean() {
		this.outputChips.forEach((outputChip, i) => {
			outputChip.Chip.inputChips[outputChip.InputID] = null as unknown as Chip;
			outputChip.Chip.inputs[outputChip.InputID] = false;
			outputChip.Chip.update();
			this.outputChips.splice(i, 1);
		});
		this.inputChips.forEach((chip) => {
			if (chip) {
				const c = chip.outputChips.find((x) => x.Chip === this);
				if (c) chip.outputChips.splice(chip.outputChips.indexOf(c), 1);
				this.inputChips[this.inputChips.indexOf(chip)] =
					null as unknown as Chip;
			}
		});
	}
	public getInputPosition(
		InputID: number,
		xOffset?: number,
		yOffset?: number,
	): Vector2 {
		xOffset = xOffset ?? 0;
		yOffset = yOffset ?? 0;
		const preRotation: Vector2 = {
			x:
				0 +
				(xOffset / 2) * this.outletSize +
				(InputID - this.inputs.length / 2 + 0.5) / this.inputs.length,
			y: -0.5 + (yOffset / 2) * this.outletSize,
		};
		const rotatedPoint = Camera.rotatePoint(preRotation, this.rotation);
		return {
			x: this.position.x + 0.5 + rotatedPoint.x,
			y: this.position.y + 0.5 + rotatedPoint.y,
		};
	}
	public getOutputPosition(xOffset?: number, yOffset?: number): Vector2 {
		xOffset = xOffset ?? 0;
		yOffset = yOffset ?? 0;
		const preRotation: Vector2 = {
			x: 0 + (xOffset / 2) * this.outletSize,
			y: 0.5 + (yOffset / 2) * this.outletSize,
		};
		const rotatedPoint = Camera.rotatePoint(preRotation, this.rotation);
		return {
			x: this.position.x + 0.5 + rotatedPoint.x,
			y: this.position.y + 0.5 + rotatedPoint.y,
		};
	}
	private static generateID(): string {
		const chars =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split(
				"",
			);
		let newID = "";
		do {
			for (let _ = 0; _ < 10; _++)
				newID += chars[Math.floor(Math.random() * chars.length)];
		} while (Chip.usedIDs.includes(newID));
		Chip.usedIDs.push(newID);
		return newID;
	}
	public serialize(): any {
		const serialized: any = structuredClone(this);
		Object.assign(serialized, {
			inputChips: this.inputChips.map((x) => x?.ID),
		});
		serialized.outputChips = this.outputChips.map((x) => ({
			Chip: x?.Chip?.ID,
			InputID: x?.InputID,
		}));
		delete serialized.outletSize;
		delete serialized.output;
		return serialized;
	}
}
