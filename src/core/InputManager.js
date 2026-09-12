// Tracks keyboard state. `isDown` reflects keys currently held; `wasPressed`
// is edge-triggered (true only on the frame the key went down) and must be
// drained once per frame via `endFrame()`.
export class InputManager {
  constructor(target = window) {
    this.held = new Set();
    this.pressedThisFrame = new Set();

    this._onKeyDown = (e) => {
      if (!this.held.has(e.code)) {
        this.pressedThisFrame.add(e.code);
      }
      this.held.add(e.code);
    };
    this._onKeyUp = (e) => {
      this.held.delete(e.code);
    };
    this._onBlur = () => {
      this.held.clear();
    };

    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  isDown(code) {
    return this.held.has(code);
  }

  isAnyDown(codes) {
    return codes.some((c) => this.held.has(c));
  }

  wasPressed(code) {
    return this.pressedThisFrame.has(code);
  }

  endFrame() {
    this.pressedThisFrame.clear();
  }
}
