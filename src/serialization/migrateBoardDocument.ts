import type {
	SerializedBoardDocument,
	SerializedBoardDocumentV1,
} from "./boardDocument";

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isBoardDocumentV1 = (
	value: unknown,
): value is SerializedBoardDocumentV1 => {
	if (!isObjectRecord(value)) {
		return false;
	}

	return value.version === 1 && isObjectRecord(value.board);
};

export const migrateBoardDocument = (
	value: unknown,
): SerializedBoardDocument => {
	if (isBoardDocumentV1(value)) {
		return value;
	}

	throw new Error("Unsupported board document format.");
};
