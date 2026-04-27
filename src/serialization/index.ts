export type {
	SerializedBoardDocument,
	SerializedBoardDocumentV1,
} from "./boardDocument";
export {
	createBoardDocument,
	decodeUnknownBoardDocument,
	encodeBoardDocument,
	materializeBoardDocument,
} from "./boardDocument";
export { migrateBoardDocument } from "./migrateBoardDocument";
export {
	createWorkspaceDocument,
	decodeUnknownWorkspaceDocument,
	encodeWorkspaceDocument,
	materializeWorkspaceDocument,
	migrateWorkspaceDocument,
} from "./workspaceDocument";
