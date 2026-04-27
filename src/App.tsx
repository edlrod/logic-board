import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { BoardViewport } from "./components/BoardViewport";
import { Toolbar } from "./components/Toolbar";
import {
	applyBoardCommand,
	type Board,
	type BoardCommand,
	createBoard,
	type NodeKind,
	nodeDefinitions,
	type PortId,
} from "./domain";
import type { Tool } from "./editor/types";
import {
	createBoardDocument,
	decodeUnknownBoardDocument,
	encodeBoardDocument,
	migrateBoardDocument,
} from "./serialization";

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

const App = () => {
	const [board, setBoard] = useState<Board>(() => createBoard("MAIN"));
	const [externalInputs, setExternalInputs] = useState<Record<PortId, boolean>>(
		{},
	);
	const [tool, setTool] = useState<Tool>("TEST");
	const [showInfo, setShowInfo] = useState(false);
	const [buildRequest, setBuildRequest] = useState<{
		id: number;
		nodeKind: NodeKind;
		inputCount: number;
	} | null>(null);

	const updateBoard = useCallback((nextBoard: Board) => {
		setBoard(nextBoard);
		setExternalInputs((previousValues) =>
			syncExternalInputs(nextBoard, previousValues),
		);
	}, []);

	const handleBoardCommand = useCallback((command: BoardCommand) => {
		setBoard((currentBoard) => {
			const result = applyBoardCommand(currentBoard, command);
			setExternalInputs((previousValues) =>
				syncExternalInputs(result.board, previousValues),
			);
			return result.board;
		});
	}, []);

	const handleSpawnNode = (nodeKind: NodeKind) => {
		const definition = nodeDefinitions[nodeKind];
		setTool("DESIGN");
		setBuildRequest((current) => ({
			id: (current?.id ?? 0) + 1,
			nodeKind,
			inputCount: definition.minInputs,
		}));
	};

	const handleExport = async () => {
		const serialized = encodeBoardDocument(createBoardDocument(board));
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

			const importedDocument = migrateBoardDocument(
				decodeUnknownBoardDocument(rawData),
			);
			updateBoard(importedDocument.board);
			setShowInfo(false);
		} catch {
			window.alert("An error occurred reading the data.");
		}
	};

	const paletteNodeKinds = useMemo(() => PALETTE_NODE_KINDS, []);

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
		<div className="app-shell">
			<BoardViewport
				board={board}
				externalInputs={externalInputs}
				onExternalInputsChange={setExternalInputs}
				onBoardCommand={handleBoardCommand}
				tool={tool}
				buildRequest={buildRequest}
			/>
			<Toolbar
				tool={tool}
				showHelp={showInfo}
				nodeKinds={paletteNodeKinds}
				onToolChange={setTool}
				onNodeKindSelect={handleSpawnNode}
				onAddBoardInput={() => handleBoardCommand({ type: "addBoardInput" })}
				onAddBoardOutput={() => handleBoardCommand({ type: "addBoardOutput" })}
				onExport={handleExport}
				onImport={handleImport}
				onHelpToggle={() => setShowInfo((visible) => !visible)}
			/>
		</div>
	);
};

export default App;
