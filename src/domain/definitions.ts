import type {
	BuiltinNodeKind,
	NodeDefinitionRegistry,
	NodeKind,
} from "./types";

export const getModuleNodeKind = (boardId: string): `module:${string}` =>
	`module:${boardId}`;

export const isBuiltinNodeKind = (kind: NodeKind): kind is BuiltinNodeKind =>
	!kind.startsWith("module:");

export const nodeDefinitions: NodeDefinitionRegistry = {
	switch: {
		kind: "switch",
		displayName: "SWITCH",
		color: "#ca8a04",
		minInputs: 0,
		maxInputs: 0,
		outputCount: 1,
		createDefaultData: () => ({ kind: "switch", value: false }),
		evaluate: (_inputs, data) => [data.kind === "switch" ? data.value : false],
	},
	buffer: {
		kind: "buffer",
		displayName: "ROUTER",
		color: "#7cbed4",
		minInputs: 1,
		maxInputs: 1,
		outputCount: 1,
		createDefaultData: () => ({ kind: "buffer" }),
		evaluate: (inputs) => [inputs[0] ?? false],
	},
	not: {
		kind: "not",
		displayName: "NOT",
		color: "#d9885a",
		minInputs: 1,
		maxInputs: 1,
		outputCount: 1,
		createDefaultData: () => ({ kind: "not" }),
		evaluate: (inputs) => [!(inputs[0] ?? false)],
	},
	and: {
		kind: "and",
		displayName: "AND",
		color: "#7fb0cc",
		minInputs: 2,
		maxInputs: null,
		outputCount: 1,
		createDefaultData: () => ({ kind: "and" }),
		evaluate: (inputs) => [inputs.length > 0 && !inputs.includes(false)],
	},
	or: {
		kind: "or",
		displayName: "OR",
		color: "#7fa766",
		minInputs: 2,
		maxInputs: null,
		outputCount: 1,
		createDefaultData: () => ({ kind: "or" }),
		evaluate: (inputs) => [inputs.includes(true)],
	},
	xor: {
		kind: "xor",
		displayName: "XOR",
		color: "#c9634b",
		minInputs: 2,
		maxInputs: null,
		outputCount: 1,
		createDefaultData: () => ({ kind: "xor" }),
		evaluate: (inputs) => [
			inputs.filter(Boolean).length % 2 === 1 && inputs.length > 0,
		],
	},
	boardInput: {
		kind: "boardInput",
		displayName: "BOARD INPUT",
		color: "#7cbed4",
		minInputs: 0,
		maxInputs: 0,
		outputCount: 1,
		createDefaultData: () => ({ kind: "boardInput", boardPortId: "" }),
		evaluate: () => [false],
	},
	boardOutput: {
		kind: "boardOutput",
		displayName: "BOARD OUTPUT",
		color: "#9fcec4",
		minInputs: 1,
		maxInputs: 1,
		outputCount: 0,
		createDefaultData: () => ({ kind: "boardOutput", boardPortId: "" }),
		evaluate: () => [],
	},
};
