export type BoardId = string;
export type NodeId = string;
export type PortId = string;
export type WireId = string;

export type PortDirection = "input" | "output";
export type PortOwnerKind = "board" | "node";
export type BoardPortRole = "boardInput" | "boardOutput";

export type BuiltinNodeKind =
	| "switch"
	| "buffer"
	| "not"
	| "and"
	| "or"
	| "xor"
	| "boardInput"
	| "boardOutput";

export type ModuleNodeKind = `module:${string}`;
export type NodeKind = BuiltinNodeKind | ModuleNodeKind;

export interface Point {
	x: number;
	y: number;
}

export interface BasePort {
	id: PortId;
	ownerKind: PortOwnerKind;
	ownerId: BoardId | NodeId;
	direction: PortDirection;
	index: number;
	label?: string;
}

export interface BoardPort extends BasePort {
	ownerKind: "board";
	ownerId: BoardId;
	role: BoardPortRole;
}

export interface NodePort extends BasePort {
	ownerKind: "node";
	ownerId: NodeId;
}

export type NodeData =
	| { kind: "switch"; value: boolean }
	| { kind: "buffer" }
	| { kind: "not" }
	| { kind: "and" }
	| { kind: "or" }
	| { kind: "xor" }
	| { kind: "boardInput"; boardPortId: PortId }
	| { kind: "boardOutput"; boardPortId: PortId }
	| { kind: "module"; boardId: BoardId };

export interface Node {
	id: NodeId;
	kind: NodeKind;
	position: Point;
	rotation: number;
	inputPorts: Record<PortId, NodePort>;
	outputPorts: Record<PortId, NodePort>;
	data: NodeData;
}

export interface Wire {
	id: WireId;
	fromPortId: PortId;
	toPortId: PortId;
}

export interface Board {
	id: BoardId;
	name: string;
	nodes: Record<NodeId, Node>;
	wires: Record<WireId, Wire>;
	inputPorts: Record<PortId, BoardPort>;
	outputPorts: Record<PortId, BoardPort>;
}

export interface NodeDefinition {
	kind: NodeKind;
	displayName: string;
	color: string;
	minInputs: number;
	maxInputs: number | null;
	outputCount: number;
	createDefaultData(): NodeData;
	evaluate(inputs: boolean[], data: NodeData): boolean[];
}

export type NodeDefinitionRegistry = Record<string, NodeDefinition>;

export interface BoardValidationIssue {
	code: string;
	message: string;
	entityId?: string;
}

export interface BoardValidationResult {
	valid: boolean;
	issues: BoardValidationIssue[];
}

export interface SimulationSnapshot {
	portValues: Record<PortId, boolean>;
	nodeOutputs: Record<NodeId, boolean[]>;
}

export interface SimulationResult {
	ok: boolean;
	snapshot: SimulationSnapshot;
	issues: BoardValidationIssue[];
}

export type BoardCommand =
	| {
			type: "addNode";
			node?: Node;
			kind?: NodeKind;
			position?: Point;
			rotation?: number;
			inputCount?: number;
	  }
	| {
			type: "moveNode";
			nodeId: NodeId;
			position: Point;
	  }
	| {
			type: "rotateNode";
			nodeId: NodeId;
			rotation: number;
	  }
	| {
			type: "deleteNode";
			nodeId: NodeId;
	  }
	| {
			type: "setSwitchValue";
			nodeId: NodeId;
			value: boolean;
	  }
	| {
			type: "setNodeInputCount";
			nodeId: NodeId;
			inputCount: number;
	  }
	| {
			type: "addBoardInput";
			label?: string;
	  }
	| {
			type: "addBoardOutput";
			label?: string;
	  }
	| {
			type: "deleteBoardPort";
			portId: PortId;
	  }
	| {
			type: "connectPorts";
			fromPortId: PortId;
			toPortId: PortId;
	  }
	| {
			type: "disconnectWire";
			wireId: WireId;
	  }
	| {
			type: "deleteWire";
			wireId: WireId;
	  };

export interface BoardCommandResult {
	board: Board;
	issues: BoardValidationIssue[];
}
