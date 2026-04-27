import { type NodeKind, nodeDefinitions } from "../domain";
import type { Tool } from "../editor/types";

const TOOL_SEQUENCE: Tool[] = ["TEST", "DESIGN"];

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
			<header className="toolbar">
				<div className="toolbar-group">
					{TOOL_SEQUENCE.map((toolName) => (
						<button
							key={toolName}
							type="button"
							className={
								tool === toolName ? "toolbar-btn selected" : "toolbar-btn"
							}
							onClick={() => onToolChange(toolName)}
						>
							{toolName}
						</button>
					))}
				</div>
				<div className="toolbar-divider" />
				<div className="toolbar-group chip-group">
					{nodeKinds.map((nodeKind) => (
						<button
							key={nodeKind}
							type="button"
							className="toolbar-btn chip-btn"
							onClick={() => onNodeKindSelect(nodeKind)}
						>
							{nodeDefinitions[nodeKind].displayName}
						</button>
					))}
				</div>
				<div className="toolbar-divider" />
				<div className="toolbar-group toolbar-actions">
					<button
						type="button"
						className="toolbar-btn"
						onClick={onAddBoardInput}
					>
						Add Input
					</button>
					<button
						type="button"
						className="toolbar-btn"
						onClick={onAddBoardOutput}
					>
						Add Output
					</button>
					<button type="button" className="toolbar-btn" onClick={onExport}>
						Export
					</button>
					<button type="button" className="toolbar-btn" onClick={onImport}>
						Import
					</button>
					<button type="button" className="toolbar-btn" onClick={onHelpToggle}>
						Help
					</button>
				</div>
			</header>

			{showHelp ? (
				<aside className="help-panel">
					<h1>Logic Board</h1>
					<p>Test: toggle switches and board inputs.</p>
					<p>
						Design: pick up nodes, place them, or wire by clicking an output
						port and then an input port when your hand is empty.
					</p>
					<p>Right-drag pans the camera. Scroll zooms.</p>
				</aside>
			) : null}
		</>
	);
};
