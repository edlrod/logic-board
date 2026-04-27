export type {
	SerializedBoardDocument,
	SerializedBoardDocumentV1,
} from "./boardDocument";
export {
	createBoardDocument,
	decodeUnknownBoardDocument,
	encodeBoardDocument,
} from "./boardDocument";
export { migrateBoardDocument } from "./migrateBoardDocument";
