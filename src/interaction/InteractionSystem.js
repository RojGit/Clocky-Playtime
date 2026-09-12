import * as THREE from 'three';

const MAX_DISTANCE = 2.6;

function removeRect(list, target) {
  const i = list.indexOf(target);
  if (i !== -1) list.splice(i, 1);
}

function approach(current, target, rate, delta) {
  const diff = target - current;
  const step = rate * delta;
  if (Math.abs(diff) <= step) return target;
  return current + Math.sign(diff) * step;
}

export class InteractionSystem {
  constructor(camera, level, gameState, hud) {
    this.camera = camera;
    this.level = level;
    this.gameState = gameState;
    this.hud = hud;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_DISTANCE;
    this.currentHit = null;
    this.doorAnimations = []; // { mesh, axis: 'x'|'y', target, speed }
  }

  update(delta, input, playerLocked) {
    this._animateDoors(delta);

    if (!playerLocked) {
      this.hud.hidePrompt();
      this.currentHit = null;
      return;
    }

    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    this.raycaster.set(origin, dir);
    const hits = this.raycaster.intersectObjects(this.level.interactables, false);
    const hit = hits.length > 0 ? hits[0].object : null;
    this.currentHit = hit;

    if (hit) {
      const prompt = this._promptFor(hit);
      if (prompt) this.hud.showPrompt(prompt);
      else this.hud.hidePrompt();
    } else {
      this.hud.hidePrompt();
    }

    if (hit && input.wasPressed('KeyE')) this._handleInteract(hit);
    if (hit && input.wasPressed('KeyK')) this._handleKick(hit);
  }

  _promptFor(mesh) {
    const f = this.gameState.flags;
    switch (mesh.userData.type) {
      case 'front_door':
        return '[E] Try the door';
      case 'infirmary_switch':
        return f.lightsOn ? null : '[E] Flip the light switch';
      case 'desk_drawer':
        if (!f.lightsOn) return "[E] Search desk (it's too dark to see)";
        return f.hasKey ? null : '[E] Open drawer';
      case 'mysterious_door':
        if (f.mysteriousDoorOpen) return null;
        return f.hasKey ? '[E] Unlock door' : '[E] Try door (locked)';
      case 'janitor_pickup':
        return f.hasGrabPack ? null : '[E] Pick up the GrabPack';
      case 'vent_grille':
        return f.ventOpen ? null : '[K] Kick open vent';
      case 'purple_pickup':
        return f.hasPurpleHand ? null : '[E] Pick up the device';
      default:
        return null;
    }
  }

  _handleInteract(mesh) {
    const gs = this.gameState;
    const f = gs.flags;

    switch (mesh.userData.type) {
      case 'front_door':
        gs.message("It's locked from the outside. There has to be another way.");
        break;

      case 'infirmary_switch':
        if (!f.lightsOn) {
          gs.setFlag('lightsOn', true);
          this._turnOnLights();
          gs.message('The lights flicker on.');
          gs.advanceIfCurrent('find_lights');
        }
        break;

      case 'desk_drawer':
        if (!f.lightsOn) {
          gs.message("It's too dark to search properly. Find a light first.");
          break;
        }
        if (!f.hasKey) {
          gs.setFlag('hasKey', true);
          gs.message('You found a small brass key.');
          gs.advanceIfCurrent('search_desk');
        }
        break;

      case 'mysterious_door':
        if (f.mysteriousDoorOpen) break;
        if (f.hasKey) {
          gs.setFlag('mysteriousDoorOpen', true);
          this._openMysteriousDoor(mesh);
          gs.message('The key turns. The door creaks open.');
          gs.advanceIfCurrent('open_mystery_door');
        } else {
          gs.message("It's locked. It needs a key.");
        }
        break;

      case 'janitor_pickup':
        if (!f.hasGrabPack) {
          gs.setFlag('hasGrabPack', true);
          gs.setFlag('hasBlueHand', true);
          mesh.visible = false;
          if (mesh.userData.glowLight) mesh.userData.glowLight.visible = false;
          gs.message('GrabPack equipped. A blue hand hums to life.');
          gs.advanceIfCurrent('investigate_janitor');
          gs.advanceIfCurrent('equip_grabpack');
        }
        break;

      case 'purple_pickup':
        if (!f.hasPurpleHand) {
          gs.setFlag('hasPurpleHand', true);
          mesh.visible = false;
          if (mesh.userData.glowLight) mesh.userData.glowLight.visible = false;
          gs.message('A second hand locks onto the GrabPack. Purple, cold, humming with static.');
          gs.advanceIfCurrent('grab_purple_hand');
        }
        break;

      default:
        break;
    }
  }

  _handleKick(mesh) {
    if (mesh.userData.type !== 'vent_grille') return;
    const gs = this.gameState;
    if (gs.flags.ventOpen) return;
    gs.setFlag('ventOpen', true);
    this._openVent(mesh);
    gs.message('The grille clatters into the vent shaft.');
    gs.advanceIfCurrent('kick_vent');
  }

  _turnOnLights() {
    const groups = [...this.level.dynamicLights.reception, ...this.level.dynamicLights.infirmary];
    for (const { light, fixture } of groups) {
      light.intensity = 1.1;
      if (fixture.material) fixture.material.emissive = new THREE.Color(0xfff6d8);
      if (fixture.material) fixture.material.emissiveIntensity = 1.5;
    }
  }

  _openMysteriousDoor(mesh) {
    removeRect(this.level.wallRects, this.level.mysteriousDoorRect);
    this.doorAnimations.push({ mesh, axis: 'y', target: Math.PI / 2, speed: 2.2 });
  }

  _openVent(mesh) {
    removeRect(this.level.wallRects, this.level.grilleClosedRect);
    this.doorAnimations.push({ mesh, axis: 'x', target: -Math.PI / 2.1, speed: 3.2 });
  }

  _animateDoors(delta) {
    for (const anim of this.doorAnimations) {
      anim.mesh.rotation[anim.axis] = approach(anim.mesh.rotation[anim.axis], anim.target, anim.speed, delta);
    }
  }
}
