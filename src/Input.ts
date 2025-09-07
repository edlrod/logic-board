import Camera from "./Camera";

export default class Input {
	public static mousePosition = {
		x: 0,
		y: 0,
	};
	public static keyDown: Record<string, boolean> = {};
	private static keyEvents: Record<string, () => void> = {};
	public static initialize() {
		window.addEventListener("mousemove", (evtMouseMove: MouseEvent) => {
			Input.mousePosition.x = evtMouseMove.pageX;
			Input.mousePosition.y = evtMouseMove.pageY;
		});
		window.addEventListener("keydown", (evtKeyDown: KeyboardEvent) => {
			Input.keyDown[evtKeyDown.key] = true;
			if (Input.keyEvents[evtKeyDown.key]) Input.keyEvents[evtKeyDown.key]();
		});
		window.addEventListener("keyup", (evtKeyUp: KeyboardEvent) => {
			Input.keyDown[evtKeyUp.key] = false;
		});
	}
	public static mouseIn(x: number, y: number, w: number, h: number): boolean {
		const mousePos = Camera.screenToWorld(Input.mousePosition);
		return (
			mousePos.x > x &&
			mousePos.x < x + w &&
			mousePos.y > y &&
			mousePos.y < y + h
		);
	}
	public static onKeyPressed(key: string, event: () => void) {
		Input.keyEvents[key] = event;
	}
}
