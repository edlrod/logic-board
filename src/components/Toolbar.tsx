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
			<header className="bg-background/80 fixed top-4 right-4 left-4 z-10 flex items-center gap-2 overflow-x-auto rounded-xl border p-2 shadow-sm backdrop-blur">
				<div className="flex items-center gap-1.5 rounded-lg bg-muted p-1">
					<span className="text-muted-foreground px-1.5 text-xs font-medium tracking-wide uppercase">
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
						<SelectTrigger className="h-7 min-w-36 border-none bg-transparent">
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
						size="sm"
						onClick={onNewBoard}
					>
						New Board
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onRenameBoard}
					>
						Rename
					</Button>
				</div>
				<div className="flex gap-1 rounded-lg bg-muted p-1">
					{TOOL_SEQUENCE.map((toolName) => (
						<Button
							key={toolName}
							type="button"
							variant={tool === toolName ? "default" : "ghost"}
							size="sm"
							onClick={() => onToolChange(toolName)}
						>
							{toolName}
						</Button>
					))}
				</div>
				<div className="bg-border hidden h-auto w-px self-stretch lg:block" />
				<div className="flex max-w-full flex-wrap gap-2 lg:max-w-[50vw]">
					{nodeKinds.map((nodeKind) => (
						<Button
							key={nodeKind}
							type="button"
							variant="outline"
							size="sm"
							className="min-w-20"
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
								size="sm"
								onClick={onAddBoardInput}
							>
								Add Input
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={onAddBoardOutput}
							>
								Add Output
							</Button>
						</>
					)}
					<Button type="button" variant="outline" size="sm" onClick={onExport}>
						Export
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={onImport}>
						Import
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
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
						size="sm"
						onClick={onHelpToggle}
					>
						Help
					</Button>
				</div>
			</header>

			{showHelp ? (
				<aside className="bg-popover text-popover-foreground fixed right-4 bottom-28 z-9 w-[min(360px,calc(100vw-32px))] rounded-xl border p-5 shadow-lg lg:top-25 lg:bottom-auto">
					<h1 className="mb-3 text-lg leading-tight font-semibold">
						Logic Board
					</h1>
					<p className="text-muted-foreground mt-2 text-sm leading-normal">
						Current board: {boardName}
					</p>
					<p className="text-muted-foreground mt-2 text-sm leading-normal">
						Test: toggle switches and board inputs.
					</p>
					<p className="text-muted-foreground mt-2 text-sm leading-normal">
						Design: pick up nodes, place them, or wire by clicking an output
						port and then an input port when your hand is empty. Clicking empty
						space while wiring drops a router dot and keeps the wire going.
					</p>
					<p className="text-muted-foreground mt-2 text-sm leading-normal">
						Every board is automatically available as a reusable module node in
						other boards.
					</p>
					{isRootBoard ? (
						<p className="text-muted-foreground mt-2 text-sm leading-normal">
							The main board cannot add board-level inputs or outputs.
						</p>
					) : null}
				</aside>
			) : null}
		</>
	);
};
