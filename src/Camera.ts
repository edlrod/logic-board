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
    if (canvasContext) this.canvasContext = canvasContext;
  }

  static zoomAtPosition(zoomAmount: number, zoomPosition: Vector2) {
    const centeredMousePosition = {
      x: (zoomPosition.x - this.position.x) * this.PPU,
      y: (zoomPosition.y - this.position.y) * this.PPU,
    };
    this.position.x += centeredMousePosition.x / this.PPU;
    this.position.y += centeredMousePosition.y / this.PPU;

    this.PPU += zoomAmount;
    this.PPU = Math.min(this.PPU, this.maxPPU);
    this.PPU = Math.max(this.PPU, this.minPPU);

    this.position.x -= centeredMousePosition.x / this.PPU;
    this.position.y -= centeredMousePosition.y / this.PPU;
  }

  public static screenToWorld(originalPosition: Vector2): Vector2 {
    if (!this.canvasContext)
      throw "A canvas context is required to use this screenToWorld()";
    const centeredPosition: Vector2 = {
      x: originalPosition.x - this.canvasContext.width / 2,
      y: originalPosition.y - this.canvasContext.height / 2,
    };
    return {
      x: this.position.x + centeredPosition.x / this.PPU,
      y: this.position.y + centeredPosition.y / this.PPU,
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
