import type Chip from "../Chip";

export interface Vector2 {
	x: number;
	y: number;
}

export interface ChipInput {
	Chip: Chip;
	InputID: number;
}

export interface ChipInfo {
	minInputs: number;
	maxInputs: number | null;
	evaluate?(inputs: boolean[]): boolean;
	color?: string;
	icon?: string;
	iconElm?: HTMLImageElement;
}
