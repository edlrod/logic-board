import type { Board } from "../domain";

export interface SerializedBoardDocumentV1 {
	version: 1;
	board: Board;
}

export type SerializedBoardDocument = SerializedBoardDocumentV1;

export const createBoardDocument = (
	board: Board,
): SerializedBoardDocumentV1 => ({
	version: 1,
	board,
});

export const encodeBoardDocument = (document: SerializedBoardDocument) =>
	btoa(JSON.stringify(document));

export const decodeUnknownBoardDocument = (encodedDocument: string): unknown =>
	JSON.parse(atob(encodedDocument));
