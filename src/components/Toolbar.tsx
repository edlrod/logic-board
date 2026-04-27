import { type NodeKind, nodeDefinitions } from "../domain";
import type { Tool } from "../editor/types";

const TOOL_SEQUENCE: Tool[] = ["TEST", "DESIGN"];
const buttonBaseClass = [
	"cursor-pointer rounded-full border px-4 py-[0.7rem]",
	"text-[0.75rem] leading-none font-bold tracking-[0.08em] uppercase",
	"transition-[transform,background-color,border-color] duration-120",
].join(" ");
const buttonIdleClass = [
	"border-[rgba(16,42,67,0.16)] bg-[rgba(255,255,255,0.94)]",
	"text-[#102a43] hover:-translate-y-px hover:border-[rgba(16,42,67,0.28)]",
].join(" ");
const buttonSelectedClass = [
	"border-[#d9b54c] bg-[#f4d35e] text-[#102a43]",
	"shadow-[0_10px_24px_rgba(244,211,94,0.28)]",
].join(" ");

const getButtonClassName = (selected = false, extra = "") =>
	[buttonBaseClass, selected ? buttonSelectedClass : buttonIdleClass, extra]
		.filter(Boolean)
		.join(" ");

interface ToolbarProps {
	tool: Tool;
	showHelp: boolean;
	nodeKinds: NodeKind[];
	onToolChange(tool: Tool): void;
	onNodeKindSelect(nodeKind: NodeKind): void;
	onAddBoardInput(): void;
	onAddBoardOutput(): void;
	onExport(): void;
	onImport(): void;
	onHelpToggle(): void;
}

export const Toolbar = ({
	tool,
	showHelp,
	nodeKinds,
	onToolChange,
	onNodeKindSelect,
	onAddBoardInput,
	onAddBoardOutput,
	onExport,
	onImport,
	onHelpToggle,
}: ToolbarProps) => {
	return (
		<>
			<header className="fixed top-4 right-4 left-4 z-10 flex gap-3 items-center overflow-x-auto rounded-[20px] border border-[rgba(16,42,67,0.12)] bg-[rgba(255,255,255,0.84)] p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-lg">
				<div className="flex flex-wrap gap-2 rounded-full bg-[rgba(16,42,67,0.06)] p-1">
					{TOOL_SEQUENCE.map((toolName) => (
						<button
							key={toolName}
							type="button"
							className={getButtonClassName(tool === toolName)}
							onClick={() => onToolChange(toolName)}
						>
							{toolName}
						</button>
					))}
				</div>
				<div className="h-px w-full bg-[rgba(16,42,67,0.12)] lg:h-auto lg:w-px lg:self-stretch" />
				<div className="flex max-w-full flex-wrap gap-2 lg:max-w-[50vw]">
					{nodeKinds.map((nodeKind) => (
						<button
							key={nodeKind}
							type="button"
							className={getButtonClassName(false, "min-w-20")}
							onClick={() => onNodeKindSelect(nodeKind)}
						>
							{nodeDefinitions[nodeKind].displayName}
						</button>
					))}
				</div>
				<div className="h-px w-full bg-[rgba(16,42,67,0.12)] lg:h-auto lg:w-px lg:self-stretch" />
				<div className="flex flex-wrap gap-2 lg:ml-auto">
					<button
						type="button"
						className={getButtonClassName()}
						onClick={onAddBoardInput}
					>
						Add Input
					</button>
					<button
						type="button"
						className={getButtonClassName()}
						onClick={onAddBoardOutput}
					>
						Add Output
					</button>
					<button
						type="button"
						className={getButtonClassName()}
						onClick={onExport}
					>
						Export
					</button>
					<button
						type="button"
						className={getButtonClassName()}
						onClick={onImport}
					>
						Import
					</button>
					<button
						type="button"
						className={getButtonClassName()}
						onClick={onHelpToggle}
					>
						Help
					</button>
				</div>
			</header>

			{showHelp ? (
				<aside className="fixed right-4 bottom-28 z-9 w-[min(360px,calc(100vw-32px))] rounded-3xl bg-[rgba(16,42,67,0.92)] p-5 text-[#f8fafc] shadow-[0_24px_60px_rgba(15,23,42,0.24)] lg:top-25 lg:bottom-auto">
					<h1 className="m-0 mb-3 text-[1.4rem] leading-[1.1] font-bold">
						Logic Board
					</h1>
					<p className="mt-2 text-[0.95rem] leading-normal font-normal">
						Test: toggle switches and board inputs.
					</p>
					<p className="mt-2 text-[0.95rem] leading-normal font-normal">
						Design: pick up nodes, place them, or wire by clicking an output
						port and then an input port when your hand is empty.
					</p>
					<p className="mt-2 text-[0.95rem] leading-normal font-normal">
						Right-drag pans the camera. Scroll zooms.
					</p>
				</aside>
			) : null}
		</>
	);
};
