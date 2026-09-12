import * as THREE from 'three';
import { createLevel } from './world/Level.js';
import { GameState } from './core/GameState.js';
import { InputManager } from './core/InputManager.js';
import { PlayerController } from './player/PlayerController.js';
import { InteractionSystem } from './interaction/InteractionSystem.js';
import { HUD } from './ui/HUD.js';

function main() {
  const canvas = document.getElementById('game-canvas');
  const hudContainer = document.getElementById('hud');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);

  const level = createLevel();
  const scene = level.scene;

  const ambient = new THREE.AmbientLight(0x404050, 0.08);
  scene.add(ambient);

  const carriedLight = new THREE.PointLight(0xfff2d0, 0.5, 7, 2);
  scene.add(carriedLight);

  const gameState = new GameState();
  const input = new InputManager(window);
  const player = new PlayerController(camera, canvas, level);
  const interaction = new InteractionSystem(camera, level, gameState, new HUD(hudContainer, gameState));
  const hud = interaction.hud;

  let paused = true;
  hud.showStartOverlay(() => player.requestLock());

  player.onLockChange = (locked) => {
    if (locked) {
      paused = false;
      hud.hideOverlay();
    } else {
      paused = true;
      if (!hasReachedEnding()) {
        hud.showResumeOverlay(() => player.requestLock());
      }
    }
  };

  function hasReachedEnding() {
    return gameState.flags.reachedEnding;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  const statuePos = level.statuePosition;

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!paused) {
      player.update(delta, input);
      interaction.update(delta, input, player.isLocked);

      if (!gameState.flags.reachedEnding) {
        const dx = player.position.x - statuePos.x;
        const dz = player.position.z - statuePos.z;
        if (Math.hypot(dx, dz) < 7) {
          gameState.setFlag('reachedEnding', true);
          gameState.message('...');
        }
      }
    }

    carriedLight.position.set(camera.position.x, camera.position.y, camera.position.z);

    input.endFrame();
    renderer.render(scene, camera);
  }

  animate();
}

main();
