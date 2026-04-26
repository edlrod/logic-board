import type { Vector2 } from "./types";

class Camera {
	static position: Vector2 = {
		x: 0,
		y: 0,
	};

	static PPU = 32;
	static minPPU = 8;
	static maxPPU = 256;

	private static canvas: HTMLCanvasElement | null = null;

	static initialize(canvas: HTMLCanvasElement) {
		Camera.canvas = canvas;
	}

	static zoomAtPosition(zoomAmount: number, zoomPosition: Vector2) {
		const centeredMousePosition = {
			x: (zoomPosition.x - Camera.position.x) * Camera.PPU,
			y: (zoomPosition.y - Camera.position.y) * Camera.PPU,
		};

		Camera.position.x += centeredMousePosition.x / Camera.PPU;
		Camera.position.y += centeredMousePosition.y / Camera.PPU;
		Camera.PPU = Math.min(
			Camera.maxPPU,
			Math.max(Camera.minPPU, Camera.PPU + zoomAmount),
		);
		Camera.position.x -= centeredMousePosition.x / Camera.PPU;
		Camera.position.y -= centeredMousePosition.y / Camera.PPU;
	}

	static screenToWorld(originalPosition: Vector2): Vector2 {
		if (!Camera.canvas) {
			throw new Error("Canvas is required to translate screen coordinates.");
		}

		const centeredPosition = {
			x: originalPosition.x - Camera.canvas.width / 2,
			y: originalPosition.y - Camera.canvas.height / 2,
		};

		return {
			x: Camera.position.x + centeredPosition.x / Camera.PPU,
			y: Camera.position.y + centeredPosition.y / Camera.PPU,
		};
	}

	static rotatePoint(point: Vector2, angle: number): Vector2 {
		const normalizedAngle = angle % (Math.PI * 2);
		const cosine = Math.cos(normalizedAngle * -1);
		const sine = Math.sin(normalizedAngle * -1);
		return {
			x: cosine * point.x + sine * point.y,
			y: cosine * point.y - sine * point.x,
		};
	}
}

export default Camera;
