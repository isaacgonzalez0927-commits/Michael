/**
 * Keyboard / mouse / pointer-lock handling.
 * Deltas are consumed once per frame so look-aim stays stable.
 */
export class Input {
  constructor(element) {
    this.element = element;
    this.keys = new Set();
    this.mouse = {
      x: 0,
      y: 0,
      ndcX: 0,
      ndcY: 0,
      dx: 0,
      dy: 0,
      down: false,
      clicked: false,
    };
    this.pointerLocked = false;
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => this._move(e);
    this._onMouseDown = (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
      }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouse.down = false;
    };
    this._onBlur = () => this.keys.clear();
    this._onLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.element;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    element.addEventListener('mousemove', this._onMouseMove);
    element.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  _move(e) {
    const rect = this.element.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.ndcX = (this.mouse.x / rect.width) * 2 - 1;
    this.mouse.ndcY = -(this.mouse.y / rect.height) * 2 + 1;
    this.mouse.dx += e.movementX;
    this.mouse.dy += e.movementY;
  }

  down(code) {
    return this.keys.has(code);
  }

  steer() {
    let x = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    return x;
  }

  throttle() {
    let z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z -= 1;
    return z;
  }

  firing() {
    return this.mouse.down || this.down('Space');
  }

  consumeClick() {
    const clicked = this.mouse.clicked;
    this.mouse.clicked = false;
    return clicked;
  }

  consumeDelta() {
    const dx = this.mouse.dx;
    const dy = this.mouse.dy;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  requestLock() {
    if (!this.pointerLocked) {
      this.element.requestPointerLock?.();
    }
  }

  exitLock() {
    if (this.pointerLocked) document.exitPointerLock?.();
  }
}
