import { MoonStar, SunMedium } from "lucide-react";
import type { BoardId, NodeDefinitionRegistry, NodeKind } from "../domain";
import type { Tool } from "../editor/types";
import { Button } from "./ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

const TOOL_SEQUENCE: Tool[] = ["TEST", "DESIGN"];

interface ToolbarProps {
	isRootBoard: boolean;
	activeBoardId: BoardId;
	boardName: string;
	boardOptions: { id: BoardId; name: string }[];
	nodeDefinitions: NodeDefinitionRegistry;
	tool: Tool;
	showHelp: boolean;
	isDarkMode: boolean;
	nodeKinds: NodeKind[];
	onToolChange(tool: Tool): void;
	onActiveBoardChange(boardId: BoardId): void;
	onNewBoard(): void;
	onNodeKindSelect(nodeKind: NodeKind): void;
	onAddBoardInput(): void;
	onAddBoardOutput(): void;
	onRenameBoard(): void;
	onExport(): void;
	onImport(): void;
	onHelpToggle(): void;
	onThemeToggle(): void;
}

const getToolbarButtonClassName = (selected = false, extra = "") =>
	[
		"rounded-full border uppercase tracking-[0.08em]",
		selected
			? "border-[#d9b54c] bg-[#f4d35e] text-[#102a43] shadow-[0_10px_24px_rgba(244,211,94,0.28)] hover:bg-[#f4d35e]"
			: "border-[rgba(16,42,67,0.16)] bg-[rgba(255,255,255,0.94)] text-[#102a43] hover:border-[rgba(16,42,67,0.28)] hover:bg-[rgba(255,255,255,0.94)] dark:border-white/12 dark:bg-[rgba(15,23,42,0.82)] dark:text-slate-100 dark:hover:border-white/22 dark:hover:bg-[rgba(15,23,42,0.82)]",
		extra,
	]
		.filter(Boolean)
		.join(" ");

export const Toolbar = ({
	isRootBoard,
	activeBoardId,
	boardName,
	boardOptions,
	nodeDefinitions,
	tool,
	showHelp,
	isDarkMode,
	nodeKinds,
	onToolChange,
	onActiveBoardChange,
	onNewBoard,
	onNodeKindSelect,
	onAddBoardInput,
	onAddBoardOutput,
	onRenameBoard,
	onExport,
	onImport,
	onHelpToggle,
	onThemeToggle,
}: ToolbarProps) => {
	return (
		<>
			<header className="fixed top-4 right-4 left-4 z-10 flex items-center gap-3 overflow-x-auto rounded-[20px] border border-[rgba(16,42,67,0.12)] bg-[rgba(255,255,255,0.84)] p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-lg dark:border-white/10 dark:bg-[rgba(15,23,42,0.74)] dark:shadow-[0_18px_48px_rgba(2,6,23,0.38)]">
				<div className="flex items-center gap-2 rounded-full bg-[rgba(16,42,67,0.06)] px-3 py-1 dark:bg-white/6">
					<span className="text-[0.72rem] font-bold tracking-[0.08em] text-[#5b6573] uppercase dark:text-slate-400">
						Board
					</span>
					<Select
						value={activeBoardId}
						onValueChange={(value) => {
							if (value) {
								onActiveBoardChange(value);
							}
						}}
					>
						<SelectTrigger className="min-w-36 rounded-full bg-white font-semibold text-[#102a43] dark:bg-slate-900 dark:text-slate-100">
							<SelectValue>{boardName}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{boardOptions.map((board) => (
								<SelectItem key={board.id} value={board.id}>
									{board.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						type="button"
						variant="outline"
						className={getToolbarButtonClassName(false)}
						onClick={onNewBoard}
					>
						New Board
					</Button>
					<Button
						type="button"
						variant="outline"
						className={getToolbarButtonClassName(false)}
						onClick={onRenameBoard}
					>
						Rename
					</Button>
				</div>
				<div className="flex flex-wrap gap-2 rounded-full bg-[rgba(16,42,67,0.06)] p-1 dark:bg-white/6">
					{TOOL_SEQUENCE.map((toolName) => (
						<Button
							key={toolName}
							type="button"
							variant={tool === toolName ? "secondary" : "outline"}
							className={getToolbarButtonClassName(tool === toolName)}
							onClick={() => onToolChange(toolName)}
						>
							{toolName}
						</Button>
					))}
				</div>
				<div className="h-px w-full bg-[rgba(16,42,67,0.12)] dark:bg-white/10 lg:h-auto lg:w-px lg:self-stretch" />
				<div className="flex max-w-full flex-wrap gap-2 lg:max-w-[50vw]">
					{nodeKinds.map((nodeKind) => (
						<Button
							key={nodeKind}
							type="button"
							variant="outline"
							className={getToolbarButtonClassName(false, "min-w-20")}
							onClick={() => onNodeKindSelect(nodeKind)}
						>
							{nodeDefinitions[nodeKind]?.displayName ?? nodeKind}
						</Button>
					))}
				</div>
				<div className="flex flex-wrap gap-2 lg:ml-auto">
					{isRootBoard ? null : (
						<>
							<Button
								type="button"
								variant="outline"
								className={getToolbarButtonClassName(false)}
								onClick={onAddBoardInput}
							>
								Add Input
							</Button>
							<Button
								type="button"
								variant="outline"
								className={getToolbarButtonClassName(false)}
								onClick={onAddBoardOutput}
							>
								Add Output
							</Button>
						</>
					)}
					<Button
						type="button"
						variant="outline"
						className={getToolbarButtonClassName(false)}
						onClick={onExport}
					>
						Export
					</Button>
					<Button
						type="button"
						variant="outline"
						className={getToolbarButtonClassName(false)}
						onClick={onImport}
					>
						Import
					</Button>
					<Button
						type="button"
						variant="outline"
						className={getToolbarButtonClassName(false)}
						onClick={onThemeToggle}
					>
						{isDarkMode ? (
							<MoonStar className="size-4" />
						) : (
							<SunMedium className="size-4" />
						)}
						{isDarkMode ? "Dark" : "Light"}
					</Button>
					<Button
						type="button"
						variant="outline"
						className={getToolbarButtonClassName(false)}
						onClick={onHelpToggle}
					>
						Help
					</Button>
				</div>
			</header>

			{showHelp ? (
				<aside className="fixed right-4 bottom-28 z-9 w-[min(360px,calc(100vw-32px))] rounded-3xl bg-[rgba(16,42,67,0.92)] p-5 text-[#f8fafc] shadow-[0_24px_60px_rgba(15,23,42,0.24)] dark:bg-[rgba(2,6,23,0.92)] dark:shadow-[0_24px_60px_rgba(2,6,23,0.44)] lg:top-25 lg:bottom-auto">
					<h1 className="m-0 mb-3 text-[1.4rem] leading-[1.1] font-bold">
						Logic Board
					</h1>
					<p className="mt-2 text-[0.95rem] leading-normal font-normal">
						Current board: {boardName}
					</p>
					<p className="mt-2 text-[0.95rem] leading-normal font-normal">
						Test: toggle switches and board inputs.
					</p>
					<p className="mt-2 text-[0.95rem] leading-normal font-normal">
						Design: pick up nodes, place them, or wire by clicking an output
						port and then an input port when your hand is empty.
					</p>
					<p className="mt-2 text-[0.95rem] leading-normal font-normal">
						Every board is automatically available as a reusable module node in
						other boards.
					</p>
					{isRootBoard ? (
						<p className="mt-2 text-[0.95rem] leading-normal font-normal">
							The main board cannot add board-level inputs or outputs.
						</p>
					) : null}
				</aside>
			) : null}
		</>
	);
};
