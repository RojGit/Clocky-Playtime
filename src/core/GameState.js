const OBJECTIVES = [
  { id: 'find_lights', text: 'The reception is dark and the front door is locked. Find the Infirmary and turn on the lights.' },
  { id: 'search_desk', text: 'Lights are on. Search the reception desk for anything useful.' },
  { id: 'open_mystery_door', text: 'Use the key to open the mysterious door.' },
  { id: 'investigate_janitor', text: "Something is glowing in the Janitor's Room. Investigate it." },
  { id: 'equip_grabpack', text: 'Press E to equip the GrabPack.' },
  { id: 'kick_vent', text: 'Find another way out. Kick open the vent in the reception (K).' },
  { id: 'crawl_maze', text: 'Crawl through the vents (hold Shift) and find a way through.' },
  { id: 'grab_purple_hand', text: 'Pick up the strange device.' },
  { id: 'ending', text: '...' }
];

// Minimal pub/sub event emitter so systems don't need to poll GameState.
class Emitter {
  constructor() {
    this.listeners = {};
  }
  on(event, cb) {
    (this.listeners[event] ||= []).push(cb);
    return () => this.off(event, cb);
  }
  off(event, cb) {
    const arr = this.listeners[event];
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i !== -1) arr.splice(i, 1);
  }
  emit(event, payload) {
    (this.listeners[event] || []).forEach((cb) => cb(payload));
  }
}

export class GameState extends Emitter {
  constructor() {
    super();
    this.objectiveIndex = 0;
    this.flags = {
      lightsOn: false,
      hasKey: false,
      mysteriousDoorOpen: false,
      hasGrabPack: false,
      hasBlueHand: false,
      ventOpen: false,
      hasPurpleHand: false,
      reachedEnding: false
    };
  }

  get currentObjective() {
    return OBJECTIVES[this.objectiveIndex];
  }

  setFlag(name, value) {
    if (this.flags[name] === value) return;
    this.flags[name] = value;
    this.emit('flag', { name, value });
  }

  advanceIfCurrent(objectiveId) {
    if (this.currentObjective && this.currentObjective.id === objectiveId) {
      this.objectiveIndex = Math.min(this.objectiveIndex + 1, OBJECTIVES.length - 1);
      this.emit('objective', this.currentObjective);
    }
  }

  message(text) {
    this.emit('message', text);
  }
}
