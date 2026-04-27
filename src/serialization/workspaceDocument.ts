import type { Board, BoardId, PortId } from "../domain";
import type { Workspace } from "../workspace/types";

export interface SerializedWorkspaceDocumentV1 {
	version: 1;
	rootBoardId?: BoardId;
	activeBoardId: BoardId;
	boards: Board[];
	publishedBoardIds?: BoardId[];
	externalInputsByBoardId?: Record<BoardId, Record<PortId, boolean>>;
}

export const createWorkspaceDocument = (
	workspace: Workspace,
): SerializedWorkspaceDocumentV1 => ({
	version: 1,
	rootBoardId: workspace.rootBoardId,
	activeBoardId: workspace.activeBoardId,
	boards: Object.values(workspace.boards),
	externalInputsByBoardId: workspace.externalInputsByBoardId,
});

const encodeBase64Url = (value: string) =>
	btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

const decodeBase64Url = (value: string) => {
	const normalizedValue = value
		.replaceAll(" ", "+")
		.replaceAll("-", "+")
		.replaceAll("_", "/");
	const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
	return atob(`${normalizedValue}${"=".repeat(paddingLength)}`);
};

export const encodeWorkspaceDocument = (
	document: SerializedWorkspaceDocumentV1,
) => encodeBase64Url(JSON.stringify(document));

export const decodeUnknownWorkspaceDocument = (
	encodedDocument: string,
): unknown => JSON.parse(decodeBase64Url(encodedDocument));

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

export const migrateWorkspaceDocument = (
	value: unknown,
): SerializedWorkspaceDocumentV1 => {
	if (
		isObjectRecord(value) &&
		value.version === 1 &&
		typeof value.activeBoardId === "string" &&
		Array.isArray(value.boards)
	) {
		return value as unknown as SerializedWorkspaceDocumentV1;
	}

	throw new Error("Unsupported workspace document format.");
};

export const materializeWorkspaceDocument = (
	document: SerializedWorkspaceDocumentV1,
): Workspace => {
	const boards = Object.fromEntries(
		document.boards.map((board) => [board.id, board]),
	) as Record<BoardId, Board>;
	const activeBoardId = boards[document.activeBoardId]
		? document.activeBoardId
		: (document.boards[0]?.id ?? "");
	const rootBoardId =
		document.rootBoardId && boards[document.rootBoardId]
			? document.rootBoardId
			: activeBoardId;

	return {
		rootBoardId,
		activeBoardId,
		boards,
		externalInputsByBoardId: document.externalInputsByBoardId ?? {},
	};
};
