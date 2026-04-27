import type { Point } from "../domain";

export interface ViewportCamera {
	position: Point;
	pixelsPerUnit: number;
	minPixelsPerUnit: number;
	maxPixelsPerUnit: number;
}

export const createViewportCamera = (): ViewportCamera => ({
	position: { x: 0, y: 0 },
	pixelsPerUnit: 32,
	minPixelsPerUnit: 8,
	maxPixelsPerUnit: 256,
});

export const screenToWorld = (
	camera: ViewportCamera,
	canvas: HTMLCanvasElement,
	originalPosition: Point,
): Point => {
	const centeredPosition = {
		x: originalPosition.x - canvas.width / 2,
		y: originalPosition.y - canvas.height / 2,
	};

	return {
		x: camera.position.x + centeredPosition.x / camera.pixelsPerUnit,
		y: camera.position.y + centeredPosition.y / camera.pixelsPerUnit,
	};
};

export const zoomAtPosition = (
	camera: ViewportCamera,
	direction: number,
	zoomPosition: Point,
) => {
	const centeredMousePosition = {
		x: (zoomPosition.x - camera.position.x) * camera.pixelsPerUnit,
		y: (zoomPosition.y - camera.position.y) * camera.pixelsPerUnit,
	};

	camera.position.x += centeredMousePosition.x / camera.pixelsPerUnit;
	camera.position.y += centeredMousePosition.y / camera.pixelsPerUnit;
	camera.pixelsPerUnit = Math.min(
		camera.maxPixelsPerUnit,
		Math.max(
			camera.minPixelsPerUnit,
			camera.pixelsPerUnit * (1 + direction * 0.1),
		),
	);
	camera.position.x -= centeredMousePosition.x / camera.pixelsPerUnit;
	camera.position.y -= centeredMousePosition.y / camera.pixelsPerUnit;
};

export const rotatePoint = (point: Point, angle: number): Point => {
	const normalizedAngle = angle % (Math.PI * 2);
	const cosine = Math.cos(normalizedAngle * -1);
	const sine = Math.sin(normalizedAngle * -1);
	return {
		x: cosine * point.x + sine * point.y,
		y: cosine * point.y - sine * point.x,
	};
};
