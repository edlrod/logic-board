import type { Vector2 } from "./types";

export default class Camera {
	static position: Vector2 = {
		x: 0,
		y: 0,
	};
	static PPU = 32;

	static minPPU = 8;
	static maxPPU = 256;

	private static canvasContext: HTMLCanvasElement | null = null;

	static initialize(canvasContext?: HTMLCanvasElement) {
		if (canvasContext) Camera.canvasContext = canvasContext;
	}

	static zoomAtPosition(zoomAmount: number, zoomPosition: Vector2) {
		const centeredMousePosition = {
			x: (zoomPosition.x - Camera.position.x) * Camera.PPU,
			y: (zoomPosition.y - Camera.position.y) * Camera.PPU,
		};
		Camera.position.x += centeredMousePosition.x / Camera.PPU;
		Camera.position.y += centeredMousePosition.y / Camera.PPU;

		Camera.PPU += zoomAmount;
		Camera.PPU = Math.min(Camera.PPU, Camera.maxPPU);
		Camera.PPU = Math.max(Camera.PPU, Camera.minPPU);

		Camera.position.x -= centeredMousePosition.x / Camera.PPU;
		Camera.position.y -= centeredMousePosition.y / Camera.PPU;
	}

	public static screenToWorld(originalPosition: Vector2): Vector2 {
		if (!Camera.canvasContext)
			throw "A canvas context is required to use this screenToWorld()";
		const centeredPosition: Vector2 = {
			x: originalPosition.x - Camera.canvasContext.width / 2,
			y: originalPosition.y - Camera.canvasContext.height / 2,
		};
		return {
			x: Camera.position.x + centeredPosition.x / Camera.PPU,
			y: Camera.position.y + centeredPosition.y / Camera.PPU,
		};
	}

	public static rotatePoint(point: Vector2, angle: number): Vector2 {
		angle %= Math.PI * 2;
		const cos = Math.cos(angle * -1);
		const sin = Math.sin(angle * -1);
		return {
			x: cos * point.x + sin * point.y,
			y: cos * point.y - sin * point.x,
		};
	}
}
