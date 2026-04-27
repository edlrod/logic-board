import type { Board, BoardId, PortId } from "../domain";

export interface Workspace {
	rootBoardId: BoardId;
	activeBoardId: BoardId;
	boards: Record<BoardId, Board>;
	externalInputsByBoardId: Record<BoardId, Record<PortId, boolean>>;
}
