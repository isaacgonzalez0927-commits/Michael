/**
 * DOM overlay: main menu, cinematic prompts, driving HUD.
 */
export class Overlay {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div class="vignette"></div>
      <div class="hurt" id="hurt"></div>
      <div class="menu" id="menu">
        <div class="menu-card">
          <div class="eyebrow">TONIGHT'S SPECIAL</div>
          <h1>THE MILKSHAKE<br>INCIDENT</h1>
          <p class="tag">A perfectly normal dinner. Then the parking lot got ideas.</p>
          <button id="start-btn" type="button">START</button>
          <p class="hint">look around · eat the meal · do not interrogate the milkshake</p>
        </div>
      </div>
      <div class="hud" id="hud">
        <div class="objective">
          <div class="objective-title" id="objective-title">DESTROY 10 UFOs</div>
          <div class="objective-sub" id="objective-sub">HUNGRY HORSES: 0</div>
        </div>
        <div class="stats">
          <div class="stat" id="stat-food">
            <div class="stat-label">YARDBIRD PAILS</div>
            <div class="stat-value" id="food-count">0</div>
          </div>
          <div class="stat" id="stat-speed">
            <div class="stat-label">SPEED</div>
            <div class="stat-value" id="speed-count">0</div>
          </div>
        </div>
        <div class="health-bar"><span id="health-fill"></span></div>
        <div class="controls" id="controls"></div>
        <div class="prompt" id="prompt"></div>
        <div class="toast" id="toast"></div>
        <div class="complete-banner" id="complete">OBJECTIVE COMPLETE</div>
        <div class="crosshair" id="crosshair"></div>
      </div>
    `;

    this.menu = root.querySelector('#menu');
    this.hud = root.querySelector('#hud');
    this.promptEl = root.querySelector('#prompt');
    this.toastEl = root.querySelector('#toast');
    this.completeEl = root.querySelector('#complete');
    this.hurtEl = root.querySelector('#hurt');
    this.objectiveTitle = root.querySelector('#objective-title');
    this.objectiveSub = root.querySelector('#objective-sub');
    this.foodCount = root.querySelector('#food-count');
    this.speedCount = root.querySelector('#speed-count');
    this.healthFill = root.querySelector('#health-fill');
    this.controls = root.querySelector('#controls');
    this.crosshair = root.querySelector('#crosshair');
    this.startBtn = root.querySelector('#start-btn');
    this._toastTimer = 0;
  }

  onStart(handler) {
    this.startBtn.addEventListener('click', handler);
  }

  showMenu() {
    this.menu.style.display = 'flex';
    this.hud.classList.remove('visible');
  }

  hideMenu() {
    this.menu.style.display = 'none';
  }

  showHud(kind) {
    this.hud.classList.add('visible');
    const driving = kind === 'drive';
    this.crosshair.classList.toggle('visible', driving);
    this.controls.style.display = driving ? 'block' : 'none';
    if (driving) {
      this.controls.innerHTML =
        'WASD DRIVE<br>MOUSE LOOK<br>CLICK / SPACE SHOOT<br>DRIVE CLOSE TO FEED';
    }
  }

  setPrompt(text) {
    if (!text) {
      this.promptEl.classList.remove('visible');
      this.promptEl.textContent = '';
      return;
    }
    this.promptEl.textContent = text;
    this.promptEl.classList.add('visible');
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  hurt() {
    this.hurtEl.classList.add('show');
    window.setTimeout(() => this.hurtEl.classList.remove('show'), 140);
  }

  showComplete() {
    this.completeEl.classList.remove('show');
    void this.completeEl.offsetWidth;
    this.completeEl.classList.add('show');
  }

  updateDrive(state) {
    const left = Math.max(0, state.goal - state.kills);
    if (state.complete) {
      this.objectiveTitle.textContent = 'OBJECTIVE COMPLETE';
    } else {
      this.objectiveTitle.textContent = `DESTROY ${left} UFO${left === 1 ? '' : 's'}`;
    }
    this.objectiveSub.textContent = `HUNGRY HORSES: ${state.hungry}`;
    this.foodCount.textContent = String(state.food);
    this.speedCount.textContent = String(Math.round(state.speed));
    this.healthFill.style.width = `${Math.max(0, state.health)}%`;
  }
}
