import type {
	SerializedBoardDocument,
	SerializedBoardDocumentV1,
	SerializedBoardDocumentV2,
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

const isBoardDocumentV2 = (
	value: unknown,
): value is SerializedBoardDocumentV2 => {
	if (!isObjectRecord(value)) {
		return false;
	}

	return (
		value.version === 2 &&
		typeof value.n === "string" &&
		Array.isArray(value.i) &&
		Array.isArray(value.o) &&
		Array.isArray(value.d) &&
		Array.isArray(value.w)
	);
};

export const migrateBoardDocument = (
	value: unknown,
): SerializedBoardDocument => {
	if (isBoardDocumentV1(value)) {
		return value;
	}

	if (isBoardDocumentV2(value)) {
		return value;
	}

	throw new Error("Unsupported board document format.");
};
