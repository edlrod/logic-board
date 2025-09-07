import type Chip from "./Chip";

export default class Board {
	public name: string | null = null;
	public chips: Chip[] = [];
	constructor(name: string) {
		this.name = null;
		if (name) this.name = name.toUpperCase();
	}
}
