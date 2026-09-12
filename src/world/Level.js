import * as THREE from 'three';
import { rect } from './Collision.js';

const WALL_COLOR = 0x33313a;
const FLOOR_COLOR = 0x1c1a20;
const CEIL_COLOR = 0x161419;
const TUNNEL_COLOR = 0x24222a;
const TUNNEL_HEIGHT = 1.4;
const ROOM_HEIGHT = 3;
const HALL_HEIGHT = 8;

const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.9, metalness: 0.05 });
const tunnelMat = new THREE.MeshStandardMaterial({ color: TUNNEL_COLOR, roughness: 1, metalness: 0 });

export function createLevel() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.045);

  const wallRects = [];
  const lowCeilingRects = [];
  const interactables = [];
  const dynamicLights = { reception: [], infirmary: [], fixtures: [] };

  // ---- helpers -------------------------------------------------------

  function addBox(w, h, d, x, y, z, material = wallMat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }

  // Solid wall segment defined by its horizontal extent; always blocks.
  function wallRect(minX, maxX, minZ, maxZ, height = ROOM_HEIGHT, material = wallMat) {
    const w = maxX - minX;
    const d = maxZ - minZ;
    addBox(w, height, d, (minX + maxX) / 2, height / 2, (minZ + maxZ) / 2, material);
    wallRects.push(rect(minX, maxX, minZ, maxZ));
  }

  // A straight wall along one axis with a doorway gap cut out of it.
  function wallWithGap(axis, fixedMin, fixedMax, from, to, gapFrom, gapTo, height = ROOM_HEIGHT) {
    if (gapFrom > from) {
      if (axis === 'x') wallRect(from, gapFrom, fixedMin, fixedMax, height);
      else wallRect(fixedMin, fixedMax, from, gapFrom, height);
    }
    if (gapTo < to) {
      if (axis === 'x') wallRect(gapTo, to, fixedMin, fixedMax, height);
      else wallRect(fixedMin, fixedMax, gapTo, to, height);
    }
  }

  function addFloorPatch(minX, maxX, minZ, maxZ, y = 0, color = FLOOR_COLOR) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      new THREE.MeshStandardMaterial({ color, roughness: 1 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((minX + maxX) / 2, y, (minZ + maxZ) / 2);
    scene.add(mesh);
    return mesh;
  }

  function addCeilingPatch(minX, maxX, minZ, maxZ, y, color = CEIL_COLOR) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      new THREE.MeshStandardMaterial({ color, roughness: 1 })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set((minX + maxX) / 2, y, (minZ + maxZ) / 2);
    scene.add(mesh);
    return mesh;
  }

  function makeInteractable(mesh, type, data = {}) {
    mesh.userData.interactable = true;
    mesh.userData.type = type;
    Object.assign(mesh.userData, data);
    interactables.push(mesh);
    return mesh;
  }

  // Straight vent-tunnel segment between two points (axis aligned). Adds
  // side walls, a low ceiling, floor/ceiling visuals, and a crouch-required
  // low-ceiling collision zone. Segments are extended by half-width at each
  // end so consecutive segments seal cleanly at corners.
  function addTunnelSegment(x1, z1, x2, z2, width = 1.2) {
    const half = width / 2;
    if (x1 === x2) {
      const zMin = Math.min(z1, z2) - half;
      const zMax = Math.max(z1, z2) + half;
      const xMin = x1 - half;
      const xMax = x1 + half;
      wallRect(xMin - 0.15, xMin, zMin, zMax, TUNNEL_HEIGHT, tunnelMat);
      wallRect(xMax, xMax + 0.15, zMin, zMax, TUNNEL_HEIGHT, tunnelMat);
      addFloorPatch(xMin, xMax, zMin, zMax, 0, TUNNEL_COLOR);
      addCeilingPatch(xMin, xMax, zMin, zMax, TUNNEL_HEIGHT, TUNNEL_COLOR);
      lowCeilingRects.push({ ...rect(xMin, xMax, zMin, zMax), minY: 1.15 });
    } else {
      const xMin = Math.min(x1, x2) - half;
      const xMax = Math.max(x1, x2) + half;
      const zMin = z1 - half;
      const zMax = z1 + half;
      wallRect(xMin, xMax, zMin - 0.15, zMin, TUNNEL_HEIGHT, tunnelMat);
      wallRect(xMin, xMax, zMax, zMax + 0.15, TUNNEL_HEIGHT, tunnelMat);
      addFloorPatch(xMin, xMax, zMin, zMax, 0, TUNNEL_COLOR);
      addCeilingPatch(xMin, xMax, zMin, zMax, TUNNEL_HEIGHT, TUNNEL_COLOR);
      lowCeilingRects.push({ ...rect(xMin, xMax, zMin, zMax), minY: 1.15 });
    }
  }

  // ---- big shared floor / ceiling for the tall rooms -----------------
  addFloorPatch(-14, 14, -6, 34, 0, FLOOR_COLOR);
  addCeilingPatch(-14, 14, -6, 20, ROOM_HEIGHT, CEIL_COLOR);
  addCeilingPatch(-6, 12, 20, 34, HALL_HEIGHT, CEIL_COLOR);

  // =====================================================================
  // RECEPTION  (x: -5..5, z: -4..4)
  // =====================================================================
  wallWithGap('x', -4.3, -4, -5, 5, -1, 1, ROOM_HEIGHT); // north wall, front door gap
  // south wall with vent grille gap
  wallWithGap('x', 4, 4.3, -5, 5, 2, 3.2, ROOM_HEIGHT);
  // east wall, doorway to infirmary corridor
  wallWithGap('z', 5, 5.3, -4, 4, -1, 1, ROOM_HEIGHT);
  // west wall, doorway to janitor corridor
  wallWithGap('z', -5.3, -5, -4, 4, -1, 1, ROOM_HEIGHT);
  // corridor side walls so players can't wander around the doorways
  wallRect(5.3, 7, -1.3, -1, ROOM_HEIGHT);
  wallRect(5.3, 7, 1, 1.3, ROOM_HEIGHT);
  wallRect(-7, -5.3, -1.3, -1, ROOM_HEIGHT);
  wallRect(-7, -5.3, 1, 1.3, ROOM_HEIGHT);

  // Front door (locked, decorative + always blocking)
  const frontDoor = addBox(2, 2.4, 0.15, 0, 1.2, -4.05, new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.7 }));
  wallRects.push(rect(-1, 1, -4.3, -4)); // matches the flanking wall's thickness band exactly
  makeInteractable(frontDoor, 'front_door');

  // Reception desk + drawer
  wallRect(-3.6, -2.2, 2.2, 3.4, 0.95, new THREE.MeshStandardMaterial({ color: 0x3d2c1f, roughness: 0.8 }));
  const monitor = addBox(0.5, 0.4, 0.35, -2.9, 1.15, 2.6, new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.4 }));
  scene.add(monitor);
  const drawer = addBox(1.1, 0.28, 0.1, -2.9, 0.55, 2.15, new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.7 }));
  makeInteractable(drawer, 'desk_drawer');

  // Vent grille (closed) covering the south-wall gap
  const grille = addBox(1.2, 1.15, 0.1, 2.6, 0.575, 4.02, new THREE.MeshStandardMaterial({ color: 0x555a5e, metalness: 0.6, roughness: 0.5 }));
  const grilleClosedRect = rect(2, 3.2, 4, 4.3); // matches the flanking wall's thickness band exactly
  wallRects.push(grilleClosedRect);
  makeInteractable(grille, 'vent_grille');

  // Emergency flicker light near the front door (a little visibility pre-lightsOn)
  const emergencyLight = new THREE.PointLight(0xffb877, 0.6, 6, 2);
  emergencyLight.position.set(0, 2.2, -3.5);
  scene.add(emergencyLight);

  // Reception ceiling lights (off until switch flipped)
  [-3, 0, 3].forEach((x) => {
    const fixture = addBox(0.6, 0.08, 0.6, x, 2.95, 0, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x000000 }));
    const light = new THREE.PointLight(0xdfe8ff, 0, 8, 2);
    light.position.set(x, 2.7, 0);
    scene.add(light);
    dynamicLights.reception.push({ light, fixture });
  });

  // =====================================================================
  // INFIRMARY  (x: 5..11 corridor+room, z: -3..3)
  // =====================================================================
  wallRect(7, 11, -3.3, -3, ROOM_HEIGHT); // north
  wallRect(7, 11, 3, 3.3, ROOM_HEIGHT); // south
  wallWithGap('z', 7, 7.3, -3, 3, -1, 1, ROOM_HEIGHT); // west wall, doorway back to corridor
  wallRect(11, 11.3, -3, 3, ROOM_HEIGHT); // east (has switch mounted on it)

  const switchPlate = addBox(0.2, 0.35, 0.15, 10.85, 1.3, 0, new THREE.MeshStandardMaterial({ color: 0xb9c2c9, metalness: 0.4, roughness: 0.4 }));
  makeInteractable(switchPlate, 'infirmary_switch');

  const infirmaryFixture = addBox(0.7, 0.08, 0.7, 9, 2.95, 0, new THREE.MeshStandardMaterial({ color: 0x111111 }));
  const infirmaryLight = new THREE.PointLight(0xdfe8ff, 0, 9, 2);
  infirmaryLight.position.set(9, 2.6, 0);
  scene.add(infirmaryLight);
  dynamicLights.infirmary.push({ light: infirmaryLight, fixture: infirmaryFixture });

  // A bed prop for flavor
  addBox(1.6, 0.5, 0.8, 9, 0.25, -1.8, new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.9 }));
  wallRects.push(rect(8.2, 9.8, -2.2, -1.4));

  // =====================================================================
  // JANITOR'S ROOM  (x: -11..-7.2, z: -3..3), reached through mysterious door
  // =====================================================================
  wallRect(-11.3, -7.2, -3.3, -3, ROOM_HEIGHT); // north
  wallRect(-11.3, -7.2, 3, 3.3, ROOM_HEIGHT); // south
  wallRect(-11.3, -11, -3, 3, ROOM_HEIGHT); // west
  // east wall flanks the mysterious door itself (door occupies z: -1..1)
  wallRect(-7.35, -7.05, -3, -1, ROOM_HEIGHT);
  wallRect(-7.35, -7.05, 1, 3, ROOM_HEIGHT);

  // Mysterious door: blocks the corridor gap in reception's west wall until unlocked
  const mysteriousDoor = addBox(2, 2.4, 0.15, -7.2, 1.2, 0, new THREE.MeshStandardMaterial({ color: 0x1f2a22, roughness: 0.6 }));
  const mysteriousDoorRect = rect(-7.35, -7.05, -1, 1);
  wallRects.push(mysteriousDoorRect);
  makeInteractable(mysteriousDoor, 'mysterious_door');

  const janitorPickup = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({ color: 0x8fd8ff, emissive: 0x2a90ff, emissiveIntensity: 1.4, roughness: 0.2 })
  );
  janitorPickup.position.set(-9.3, 1.1, 0);
  scene.add(janitorPickup);
  const pickupLight = new THREE.PointLight(0x6fb8ff, 2.2, 6, 2);
  pickupLight.position.copy(janitorPickup.position);
  scene.add(pickupLight);
  janitorPickup.userData.glowLight = pickupLight;
  makeInteractable(janitorPickup, 'janitor_pickup');

  // Shelving flavor
  wallRect(-10.9, -10.4, -2.8, -0.8, 2.2, new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.9 }));

  // =====================================================================
  // VENT MAZE (from reception grille southwards, through several turns)
  // =====================================================================
  addTunnelSegment(2.6, 4.15, 2.6, 8);
  addTunnelSegment(2.6, 8, 6.2, 8);
  addTunnelSegment(6.2, 8, 6.2, 12);
  addTunnelSegment(6.2, 12, 3, 12);
  addTunnelSegment(3, 12, 3, 16.6);

  // =====================================================================
  // END ROOM  (purple hand pickup, x: 1..5, z: 16..20)
  // =====================================================================
  wallWithGap('x', 15.7, 16, 1, 5, 2.4, 3.6, ROOM_HEIGHT); // north wall, opening from tunnel
  wallWithGap('x', 20, 20.3, 1, 5, 2.4, 3.6, ROOM_HEIGHT); // south wall, opening to statue hall
  wallRect(1, 1.3, 16, 20, ROOM_HEIGHT); // west
  wallRect(4.7, 5, 16, 20, ROOM_HEIGHT); // east

  const purplePedestal = addBox(0.6, 1, 0.6, 3, 0.5, 18, new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8 }));
  const purplePickup = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshStandardMaterial({ color: 0xc98bff, emissive: 0x8a2be2, emissiveIntensity: 1.6, roughness: 0.2 })
  );
  purplePickup.position.set(3, 1.35, 18);
  scene.add(purplePickup);
  const purpleLight = new THREE.PointLight(0xa855f7, 2.4, 7, 2);
  purpleLight.position.copy(purplePickup.position);
  scene.add(purpleLight);
  purplePickup.userData.glowLight = purpleLight;
  makeInteractable(purplePickup, 'purple_pickup');

  const endRoomLight = new THREE.PointLight(0x8899ff, 0.5, 8, 2);
  endRoomLight.position.set(3, 2.6, 18);
  scene.add(endRoomLight);

  // =====================================================================
  // STATUE HALL (grand finale room, x: -6..12, z: 20..34)
  // =====================================================================
  wallRect(-6, 12, 33.7, 34, HALL_HEIGHT); // far south wall
  wallRect(-6.3, -6, 20, 34, HALL_HEIGHT); // west
  wallRect(12, 12.3, 20, 34, HALL_HEIGHT); // east

  const hallAmbient = new THREE.PointLight(0x4455aa, 0.35, 20, 2);
  hallAmbient.position.set(3, 6, 27);
  scene.add(hallAmbient);

  const statueGroup = buildStatue();
  statueGroup.position.set(3, 0, 30);
  scene.add(statueGroup);

  // Outer bounding shell so wandering off the built rooms never opens into
  // an unbounded void; placed well past any room, fog hides it from view.
  wallRect(-16, 16, -9, -8.7, 10);
  wallRect(-16, 16, 37, 37.3, 10);
  wallRect(-16, -15.7, -9, 37, 10);
  wallRect(15.7, 16, -9, 37, 10);

  // =====================================================================

  return {
    scene,
    wallRects,
    lowCeilingRects,
    interactables,
    dynamicLights,
    grilleClosedRect,
    grilleMesh: grille,
    mysteriousDoorMesh: mysteriousDoor,
    mysteriousDoorRect,
    statuePosition: statueGroup.position.clone(),
    startPosition: new THREE.Vector3(0, 1.7, 2.5),
    startYaw: Math.PI
  };
}

function buildStatue() {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x1c3a4a, roughness: 0.95, metalness: 0.05 });
  const darkFur = new THREE.MeshStandardMaterial({ color: 0x11242e, roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.35, metalness: 1 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe066, emissiveIntensity: 2.2 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 1 });

  // Pedestal base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.6, 16), stone);
  base.position.y = 0.3;
  group.add(base);

  // Hunched torso, leaning forward
  const torso = new THREE.Group();
  torso.position.set(0, 3.6, 0);
  torso.rotation.x = 0.35;
  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.4, 6, 12), fur);
  torso.add(torsoMesh);
  group.add(torso);

  // Legs
  [-0.75, 0.75].forEach((xOff) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 2.4, 10), darkFur);
    leg.position.set(xOff, 1.7, 0.1);
    group.add(leg);
  });

  // Right arm (normal, hanging)
  const rightArm = new THREE.Group();
  rightArm.position.set(-1.8, 4.6, 0.3);
  const rUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.6, 6, 10), fur);
  rUpper.rotation.z = 0.5;
  rUpper.position.set(-0.3, -0.5, 0);
  rightArm.add(rUpper);
  const rFore = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.4, 6, 10), fur);
  rFore.rotation.z = 1.0;
  rFore.position.set(-1.1, -1.5, 0.2);
  rightArm.add(rFore);
  group.add(rightArm);

  // Left arm ending in a robotic metal hand
  const leftArm = new THREE.Group();
  leftArm.position.set(1.8, 4.6, 0.3);
  const lUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.6, 6, 10), fur);
  lUpper.rotation.z = -0.5;
  lUpper.position.set(0.3, -0.5, 0);
  leftArm.add(lUpper);
  const lFore = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.4, 6, 10), metal);
  lFore.rotation.z = -1.0;
  lFore.position.set(1.1, -1.5, 0.2);
  leftArm.add(lFore);

  const hand = new THREE.Group();
  hand.position.set(1.75, -2.5, 0.35);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.35), metal);
  hand.add(palm);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 6), metal);
    finger.position.set(-0.22 + i * 0.15, -0.45, 0);
    finger.rotation.x = 0.2;
    hand.add(finger);
  }
  leftArm.add(hand);
  group.add(leftArm);

  // Head: wolf-like with pointed ears + snout
  const head = new THREE.Group();
  head.position.set(0, 5.9, 0.6);
  head.rotation.x = 0.25;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), fur);
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.9), darkFur);
  snout.position.set(0, -0.25, 0.85);
  head.add(snout);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.2), new THREE.MeshStandardMaterial({ color: 0x090909 }));
  mouth.position.set(0, -0.5, 1.25);
  head.add(mouth);
  [-0.6, 0.6].forEach((xOff) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 6), darkFur);
    ear.position.set(xOff, 0.95, -0.1);
    ear.rotation.z = xOff > 0 ? -0.25 : 0.25;
    head.add(ear);
  });
  [-0.35, 0.35].forEach((xOff) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), eyeMat);
    eye.position.set(xOff, 0.1, 0.85);
    head.add(eye);
  });
  group.add(head);

  return group;
}
