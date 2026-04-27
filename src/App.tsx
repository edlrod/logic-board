import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardViewport } from "./components/BoardViewport";
import { Toolbar } from "./components/Toolbar";
import {
	applyBoardCommand,
	type Board,
	type BoardCommand,
	type BoardId,
	createBoard,
	getModuleNodeKind,
	type NodeDefinition,
	type NodeKind,
	nodeDefinitions,
	type PortId,
} from "./domain";
import type { Tool } from "./editor/types";
import {
	createWorkspaceDocument,
	decodeUnknownWorkspaceDocument,
	encodeWorkspaceDocument,
	materializeWorkspaceDocument,
	migrateWorkspaceDocument,
} from "./serialization";
import { reconcileBoardModuleNodes } from "./workspace/reconcileModules";
import type { Workspace } from "./workspace/types";

const PALETTE_NODE_KINDS: NodeKind[] = [
	"switch",
	"buffer",
	"not",
	"and",
	"or",
	"xor",
];

const syncExternalInputs = (
	board: Board,
	previousValues: Record<PortId, boolean>,
) =>
	Object.fromEntries(
		Object.keys(board.inputPorts).map((portId) => [
			portId,
			previousValues[portId] ?? false,
		]),
	) as Record<PortId, boolean>;

const buildModuleDefinitions = (
	boards: Record<BoardId, Board>,
	excludedBoardIds: BoardId[] = [],
) =>
	Object.fromEntries(
		Object.values(boards)
			.filter((board) => !excludedBoardIds.includes(board.id))
			.map((board) => [
				getModuleNodeKind(board.id),
				{
					kind: getModuleNodeKind(board.id),
					displayName: board.name,
					color: "#d3c4f3",
					minInputs: Object.keys(board.inputPorts).length,
					maxInputs: Object.keys(board.inputPorts).length,
					outputCount: Object.keys(board.outputPorts).length,
					createDefaultData: () => ({ kind: "module", boardId: board.id }),
					evaluate: () =>
						new Array(Object.keys(board.outputPorts).length).fill(false),
				},
			]),
	) as Record<string, NodeDefinition>;

const reconcileWorkspaceBoards = (
	workspace: Workspace,
	moduleDefinitions: Record<string, NodeDefinition>,
): Workspace => ({
	...workspace,
	boards: Object.fromEntries(
		Object.entries(workspace.boards).map(([boardId, board]) => [
			boardId,
			reconcileBoardModuleNodes(board, {
				...nodeDefinitions,
				...moduleDefinitions,
			}),
		]),
	) as Record<BoardId, Board>,
});

const createInitialWorkspace = (): Workspace => {
	const initialBoard = createBoard("MAIN");
	return {
		rootBoardId: initialBoard.id,
		activeBoardId: initialBoard.id,
		boards: {
			[initialBoard.id]: initialBoard,
		},
		externalInputsByBoardId: {
			[initialBoard.id]: {},
		},
	};
};

const App = () => {
	const [workspace, setWorkspace] = useState<Workspace>(() =>
		createInitialWorkspace(),
	);
	const [tool, setTool] = useState<Tool>("TEST");
	const [showInfo, setShowInfo] = useState(false);
	const [buildRequest, setBuildRequest] = useState<{
		id: number;
		nodeKind: NodeKind;
		inputCount: number;
	} | null>(null);

	const activeBoard = workspace.boards[workspace.activeBoardId];
	const activeExternalInputs =
		workspace.externalInputsByBoardId[workspace.activeBoardId] ?? {};

	const activeNodeDefinitions = useMemo<Record<string, NodeDefinition>>(
		() => ({
			...nodeDefinitions,
			...buildModuleDefinitions(workspace.boards, [
				workspace.rootBoardId,
				workspace.activeBoardId,
			]),
		}),
		[workspace.activeBoardId, workspace.boards, workspace.rootBoardId],
	);

	const handleBoardCommand = useCallback((command: BoardCommand) => {
		setWorkspace((currentWorkspace) => {
			const currentBoard =
				currentWorkspace.boards[currentWorkspace.activeBoardId];
			const definitions = {
				...nodeDefinitions,
				...buildModuleDefinitions(currentWorkspace.boards, [
					currentWorkspace.rootBoardId,
					currentWorkspace.activeBoardId,
				]),
			};
			const result = applyBoardCommand(currentBoard, command, definitions);
			const nextBoards = {
				...currentWorkspace.boards,
				[result.board.id]: result.board,
			};
			const allModuleDefinitions = buildModuleDefinitions(nextBoards, [
				currentWorkspace.rootBoardId,
			]);

			const nextWorkspace = reconcileWorkspaceBoards(
				{
					...currentWorkspace,
					boards: nextBoards,
					externalInputsByBoardId: {
						...currentWorkspace.externalInputsByBoardId,
						[result.board.id]: syncExternalInputs(
							result.board,
							currentWorkspace.externalInputsByBoardId[result.board.id] ?? {},
						),
					},
				},
				allModuleDefinitions,
			);

			return {
				...nextWorkspace,
				externalInputsByBoardId: Object.fromEntries(
					Object.entries(nextWorkspace.boards).map(([boardId, board]) => [
						boardId,
						syncExternalInputs(
							board,
							nextWorkspace.externalInputsByBoardId[boardId] ?? {},
						),
					]),
				) as Record<BoardId, Record<PortId, boolean>>,
			};
		});
	}, []);

	const handleSpawnNode = (nodeKind: NodeKind) => {
		const definition = activeNodeDefinitions[nodeKind];
		if (!definition) {
			return;
		}

		setTool("DESIGN");
		setBuildRequest((current) => ({
			id: (current?.id ?? 0) + 1,
			nodeKind,
			inputCount: definition.minInputs,
		}));
	};

	const handleExport = async () => {
		const serialized = encodeWorkspaceDocument(
			createWorkspaceDocument(workspace),
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
			const rawData = window.prompt("Enter workspace data:");
			if (!rawData) {
				return;
			}

			const importedDocument = migrateWorkspaceDocument(
				decodeUnknownWorkspaceDocument(rawData),
			);
			const nextWorkspace = materializeWorkspaceDocument(importedDocument);
			setWorkspace(
				reconcileWorkspaceBoards(
					nextWorkspace,
					buildModuleDefinitions(nextWorkspace.boards, [
						nextWorkspace.rootBoardId,
					]),
				),
			);
			setShowInfo(false);
		} catch {
			window.alert("An error occurred reading the data.");
		}
	};

	const paletteNodeKinds = useMemo(
		() => [
			...PALETTE_NODE_KINDS,
			...Object.keys(workspace.boards)
				.filter(
					(boardId) =>
						![workspace.rootBoardId, workspace.activeBoardId].includes(boardId),
				)
				.map((boardId) => getModuleNodeKind(boardId)),
		],
		[workspace.activeBoardId, workspace.boards, workspace.rootBoardId],
	);

	const boardOptions = useMemo(
		() =>
			Object.values(workspace.boards)
				.sort((left, right) => left.name.localeCompare(right.name))
				.map((board) => ({ id: board.id, name: board.name })),
		[workspace.boards],
	);

	const handleExternalInputsChange = useCallback(
		(
			updater:
				| Record<PortId, boolean>
				| ((current: Record<PortId, boolean>) => Record<PortId, boolean>),
		) => {
			setWorkspace((currentWorkspace) => {
				const currentInputs =
					currentWorkspace.externalInputsByBoardId[
						currentWorkspace.activeBoardId
					] ?? {};
				const nextInputs =
					typeof updater === "function" ? updater(currentInputs) : updater;

				return {
					...currentWorkspace,
					externalInputsByBoardId: {
						...currentWorkspace.externalInputsByBoardId,
						[currentWorkspace.activeBoardId]: nextInputs,
					},
				};
			});
		},
		[],
	);

	const handleNewBoard = () => {
		const name = window.prompt("Board name?", "UNTITLED")?.toUpperCase().trim();
		if (!name) {
			return;
		}

		const nextBoard = createBoard(name);
		setWorkspace((currentWorkspace) => ({
			...currentWorkspace,
			activeBoardId: nextBoard.id,
			boards: {
				...currentWorkspace.boards,
				[nextBoard.id]: nextBoard,
			},
			externalInputsByBoardId: {
				...currentWorkspace.externalInputsByBoardId,
				[nextBoard.id]: {},
			},
		}));
	};

	const handleRenameBoard = () => {
		const nextName = window
			.prompt("Board name?", activeBoard.name)
			?.toUpperCase()
			.trim();
		if (!nextName) {
			return;
		}

		setWorkspace((currentWorkspace) => ({
			...currentWorkspace,
			boards: {
				...currentWorkspace.boards,
				[currentWorkspace.activeBoardId]: {
					...currentWorkspace.boards[currentWorkspace.activeBoardId],
					name: nextName,
				},
			},
		}));
	};

	const resolveBoard = useCallback(
		(boardId: BoardId) => workspace.boards[boardId] ?? null,
		[workspace.boards],
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat) {
				return;
			}

			if (event.key === "1") {
				setTool("TEST");
			} else if (event.key === "2") {
				setTool("DESIGN");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(244,211,94,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(42,157,143,0.18),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#e8edf3_100%)]">
			<BoardViewport
				board={activeBoard}
				externalInputs={activeExternalInputs}
				nodeDefinitions={activeNodeDefinitions}
				resolveBoard={resolveBoard}
				onExternalInputsChange={handleExternalInputsChange}
				onBoardCommand={handleBoardCommand}
				tool={tool}
				buildRequest={buildRequest}
			/>
			<Toolbar
				isRootBoard={workspace.activeBoardId === workspace.rootBoardId}
				activeBoardId={workspace.activeBoardId}
				boardName={activeBoard.name}
				boardOptions={boardOptions}
				nodeDefinitions={activeNodeDefinitions}
				tool={tool}
				showHelp={showInfo}
				nodeKinds={paletteNodeKinds}
				onToolChange={setTool}
				onActiveBoardChange={(boardId) =>
					setWorkspace((currentWorkspace) => ({
						...currentWorkspace,
						activeBoardId: boardId,
					}))
				}
				onNewBoard={handleNewBoard}
				onNodeKindSelect={handleSpawnNode}
				onAddBoardInput={() => handleBoardCommand({ type: "addBoardInput" })}
				onAddBoardOutput={() => handleBoardCommand({ type: "addBoardOutput" })}
				onRenameBoard={handleRenameBoard}
				onExport={handleExport}
				onImport={handleImport}
				onHelpToggle={() => setShowInfo((visible) => !visible)}
			/>
		</div>
	);
};

export default App;
