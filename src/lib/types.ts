export interface Vector2 {
	x: number;
	y: number;
}

export interface SerializedChip {
	ID: string;
	color: string;
	inputChips: Array<string | null>;
	inputs: boolean[];
	outputChips: Array<{
		Chip: string | null;
		InputID: number;
	}>;
	position: Vector2;
	rotation: number;
	type: string | null;
}

export interface ChipInfo {
	minInputs: number;
	maxInputs: number | null;
	evaluate?(inputs: boolean[]): boolean;
	color?: string;
}

export interface ChipInput {
	Chip: import("./Chip").default;
	InputID: number;
}

export type Tool = "INTERACT" | "DESIGN" | "WIRE";
