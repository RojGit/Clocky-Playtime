import * as THREE from 'three';
import { isBlocked } from '../world/Collision.js';

const WALK_SPEED = 3.2;
const SPRINT_SPEED = 5.5;
const CRAWL_SPEED = 1.6;
const EYE_STAND = 1.7;
const EYE_CROUCH = 0.9;
const HEAD_MARGIN = 0.15; // approximate top-of-head offset above eye height
const RADIUS = 0.35;
const MOUSE_SENSITIVITY = 0.0022;
const PITCH_LIMIT = Math.PI / 2 - 0.02;
const HEIGHT_LERP_SPEED = 10;

export class PlayerController {
  constructor(camera, domElement, level) {
    this.camera = camera;
    this.domElement = domElement;
    this.level = level;

    this.yaw = level.startYaw || 0;
    this.pitch = 0;
    this.position = level.startPosition.clone();
    this.eyeHeight = EYE_STAND;

    this.isLocked = false;
    this.crouching = false;
    this.sprinting = false;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onLockChange = this._onLockChange.bind(this);
    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('mousemove', this._onMouseMove);

    this._applyCamera();
  }

  requestLock() {
    this.domElement.requestPointerLock();
  }

  _onLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
    if (this.onLockChange) this.onLockChange(this.isLocked);
  }

  _onMouseMove(e) {
    if (!this.isLocked) return;
    this.yaw -= e.movementX * MOUSE_SENSITIVITY;
    this.pitch -= e.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
  }

  _applyCamera() {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.camera.position.set(this.position.x, this.eyeHeight, this.position.z);
  }

  getForwardVector() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  getRightVector() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  headTop() {
    return this.eyeHeight + HEAD_MARGIN;
  }

  update(delta, input) {
    this.crouching = input.isAnyDown(['ShiftLeft', 'ShiftRight']);
    this.sprinting = !this.crouching && input.isAnyDown(['ControlLeft', 'ControlRight']);

    const targetEye = this.crouching ? EYE_CROUCH : EYE_STAND;
    this.eyeHeight += (targetEye - this.eyeHeight) * Math.min(1, HEIGHT_LERP_SPEED * delta);

    const speed = this.crouching ? CRAWL_SPEED : this.sprinting ? SPRINT_SPEED : WALK_SPEED;

    let moveX = 0;
    let moveZ = 0;
    const forward = this.getForwardVector();
    const right = this.getRightVector();

    if (this.isLocked) {
      if (input.isDown('KeyW')) {
        moveX += forward.x;
        moveZ += forward.z;
      }
      if (input.isDown('KeyS')) {
        moveX -= forward.x;
        moveZ -= forward.z;
      }
      if (input.isDown('KeyD')) {
        moveX += right.x;
        moveZ += right.z;
      }
      if (input.isDown('KeyA')) {
        moveX -= right.x;
        moveZ -= right.z;
      }
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 0) {
      moveX = (moveX / len) * speed * delta;
      moveZ = (moveZ / len) * speed * delta;

      const headTop = this.headTop();
      const { wallRects, lowCeilingRects } = this.level;

      const nextX = this.position.x + moveX;
      if (!isBlocked(nextX, this.position.z, RADIUS, wallRects, lowCeilingRects, headTop)) {
        this.position.x = nextX;
      }
      const nextZ = this.position.z + moveZ;
      if (!isBlocked(this.position.x, nextZ, RADIUS, wallRects, lowCeilingRects, headTop)) {
        this.position.z = nextZ;
      }
    }

    this._applyCamera();
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
  }
}
