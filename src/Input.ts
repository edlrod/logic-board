import Camera from "./Camera";

export default class Input {
  public static mousePosition = {
    x: 0,
    y: 0,
  };
  public static keyDown: Record<string, boolean> = {};
  private static keyEvents: Record<string, Function> = {};
  public static initialize() {
    window.addEventListener("mousemove", (evtMouseMove: MouseEvent) => {
      this.mousePosition.x = evtMouseMove.pageX;
      this.mousePosition.y = evtMouseMove.pageY;
    });
    window.addEventListener("keydown", (evtKeyDown: KeyboardEvent) => {
      this.keyDown[evtKeyDown.key] = true;
      if (this.keyEvents[evtKeyDown.key]) this.keyEvents[evtKeyDown.key]();
    });
    window.addEventListener("keyup", (evtKeyUp: KeyboardEvent) => {
      this.keyDown[evtKeyUp.key] = false;
    });
  }
  public static mouseIn(x: number, y: number, w: number, h: number): boolean {
    const mousePos = Camera.screenToWorld(this.mousePosition);
    return (
      mousePos.x > x &&
      mousePos.x < x + w &&
      mousePos.y > y &&
      mousePos.y < y + h
    );
  }
  public static onKeyPressed(key: string, event: Function) {
    this.keyEvents[key] = event;
  }
}
