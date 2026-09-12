const STYLE = `
#hud * { box-sizing: border-box; }
#hud .crosshair {
  position: absolute; top: 50%; left: 50%; width: 6px; height: 6px;
  margin: -3px 0 0 -3px; border-radius: 50%; background: rgba(255,255,255,0.85);
  box-shadow: 0 0 4px rgba(0,0,0,0.8);
}
#hud .objective {
  position: absolute; top: 20px; left: 20px; max-width: 420px;
  color: #e8e6da; background: rgba(10,10,12,0.55); border-left: 3px solid #8a2be2;
  padding: 10px 14px; font-size: 14px; line-height: 1.4; border-radius: 2px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}
#hud .objective .label {
  display: block; font-size: 10px; letter-spacing: 2px; color: #b79bde; margin-bottom: 4px;
}
#hud .prompt {
  position: absolute; bottom: 22%; left: 50%; transform: translateX(-50%);
  color: #fff; background: rgba(10,10,12,0.6); padding: 6px 14px; border-radius: 3px;
  font-size: 14px; opacity: 0; transition: opacity 0.12s ease;
}
#hud .prompt.visible { opacity: 1; }
#hud .toast {
  position: absolute; bottom: 30%; left: 50%; transform: translateX(-50%);
  color: #f2f0ff; background: rgba(20,10,25,0.7); padding: 8px 18px; border-radius: 3px;
  font-size: 15px; opacity: 0; transition: opacity 0.3s ease; max-width: 60%; text-align: center;
}
#hud .toast.visible { opacity: 1; }
#hud .abilities {
  position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px;
}
#hud .ability {
  width: 46px; height: 46px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #cfcfcf;
  background: rgba(20,20,24,0.6); border: 1px solid rgba(255,255,255,0.15);
  opacity: 0; transform: translateY(6px); transition: all 0.25s ease;
}
#hud .ability.active { opacity: 1; transform: translateY(0); }
#hud .ability.grabpack { border-color: #7fdcff; color: #bdeeff; }
#hud .ability.blue { border-color: #4aa8ff; color: #bcdcff; box-shadow: 0 0 10px rgba(74,168,255,0.5); }
#hud .ability.purple { border-color: #a855f7; color: #e6cfff; box-shadow: 0 0 10px rgba(168,85,247,0.5); }
#hud .overlay {
  position: absolute; inset: 0; background: #050508; color: #eee;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; pointer-events: auto; cursor: pointer;
}
#hud .overlay h1 {
  font-size: 34px; letter-spacing: 3px; margin: 0 0 6px; color: #f2ecff;
  text-shadow: 0 0 18px rgba(138,43,226,0.6);
}
#hud .overlay .subtitle { color: #9a94ab; font-size: 13px; margin-bottom: 26px; letter-spacing: 1px; }
#hud .overlay .controls {
  font-size: 13px; color: #cfcbd8; line-height: 1.9; margin-bottom: 24px;
}
#hud .overlay .controls b { color: #fff; }
#hud .overlay .start-btn {
  padding: 10px 28px; border: 1px solid #8a2be2; border-radius: 3px; color: #fff;
  background: rgba(138,43,226,0.18); font-size: 14px; letter-spacing: 2px;
}
#hud .hidden { display: none; }
`;

export class HUD {
  constructor(container, gameState) {
    this.gameState = gameState;
    this.messageTimer = null;

    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    container.innerHTML = `
      <div class="crosshair"></div>
      <div class="objective"><span class="label">OBJECTIVE</span><span class="text"></span></div>
      <div class="prompt"></div>
      <div class="toast"></div>
      <div class="abilities">
        <div class="ability grabpack">GrabPack</div>
        <div class="ability blue">Blue Hand</div>
        <div class="ability purple">Purple Hand</div>
      </div>
      <div class="overlay hidden">
        <h1>CLOCKY PLAYTIME FACTORY</h1>
        <div class="subtitle">a night shift nobody signed up for</div>
        <div class="controls">
          <b>WASD</b> move &nbsp;·&nbsp; <b>Mouse</b> look &nbsp;·&nbsp; <b>E</b> interact / equip<br/>
          <b>K</b> kick &nbsp;·&nbsp; <b>Shift</b> crawl &nbsp;·&nbsp; <b>Ctrl</b> sprint (not while crawling)
        </div>
        <div class="start-btn">CLICK TO START</div>
      </div>
    `;

    this.el = {
      objectiveText: container.querySelector('.objective .text'),
      prompt: container.querySelector('.prompt'),
      toast: container.querySelector('.toast'),
      abilityGrabpack: container.querySelector('.ability.grabpack'),
      abilityBlue: container.querySelector('.ability.blue'),
      abilityPurple: container.querySelector('.ability.purple'),
      overlay: container.querySelector('.overlay'),
      overlayTitle: container.querySelector('.overlay h1'),
      overlaySubtitle: container.querySelector('.overlay .subtitle'),
      overlayControls: container.querySelector('.overlay .controls'),
      startBtn: container.querySelector('.start-btn')
    };

    this.setObjective(gameState.currentObjective.text);
    this.updateAbilities(gameState.flags);

    gameState.on('objective', (obj) => this.setObjective(obj.text));
    gameState.on('message', (text) => this.showMessage(text));
    gameState.on('flag', () => this.updateAbilities(gameState.flags));
  }

  setObjective(text) {
    this.el.objectiveText.textContent = text;
  }

  showPrompt(text) {
    this.el.prompt.textContent = text;
    this.el.prompt.classList.add('visible');
  }

  hidePrompt() {
    this.el.prompt.classList.remove('visible');
  }

  showMessage(text, duration = 3200) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('visible');
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.el.toast.classList.remove('visible'), duration);
  }

  updateAbilities(flags) {
    this.el.abilityGrabpack.classList.toggle('active', !!flags.hasGrabPack);
    this.el.abilityBlue.classList.toggle('active', !!flags.hasBlueHand);
    this.el.abilityPurple.classList.toggle('active', !!flags.hasPurpleHand);
  }

  showStartOverlay(onStart) {
    this.el.overlay.classList.remove('hidden');
    const handler = () => onStart();
    this.el.overlay.addEventListener('click', handler, { once: true });
  }

  showResumeOverlay(onResume) {
    this.el.overlayTitle.textContent = 'PAUSED';
    this.el.overlaySubtitle.textContent = '';
    this.el.overlayControls.classList.add('hidden');
    this.el.startBtn.textContent = 'CLICK TO RESUME';
    this.el.overlay.classList.remove('hidden');
    const handler = () => onResume();
    this.el.overlay.addEventListener('click', handler, { once: true });
  }

  hideOverlay() {
    this.el.overlay.classList.add('hidden');
  }
}
