# Clocky Playtime Factory

A fan-inspired horror-puzzle desktop game built with Electron + Three.js. Not
affiliated with or endorsed by Mob Entertainment / Poppy Playtime — this is an
original story and set of assets built in the same spirit.

This is a first vertical slice: the opening night-shift sequence. More will be
added later.

## The setup

You wake up inside the **Clocky Playtime Factory** reception at night. The
front door is locked. To get out, you'll need to:

1. Find the **Infirmary** and switch the lights on.
2. Search the **reception desk** drawer for a key.
3. Unlock the **mysterious door** and step into the **Janitor's Room**.
4. Pick up the glowing object to equip the **GrabPack** (blue hand).
5. Back in reception, **kick open** the vent grille and crawl through the
   vent maze.
6. At the far end, pick up a second device — the **purple hand**.
7. ...and find out you were not alone down there.

## Controls

| Action  | Key |
| ------- | --- |
| Move | `W` `A` `S` `D` |
| Look | Mouse |
| Interact / equip | `E` |
| Kick | `K` |
| Crawl / crouch | `Shift` (hold) |
| Sprint | `Ctrl` (hold — disabled while crawling) |

## Running it

```bash
npm install
npm start
```

`npm start` bundles the game code with esbuild and launches the Electron app
in its own window (not a browser tab).

Useful scripts:

- `npm run dev` — same as `start`, plus opens devtools.
- `npm run build` — just rebuilds the renderer bundle.
- `npm run dist` — packages a distributable build with electron-builder
  (output in `release/`).

## Project layout

```
electron/            Electron main process + preload (the app shell)
index.html           The game's single page, loads the bundled renderer
src/
  core/              Input handling + game state (objectives, flags)
  player/             First-person controller (movement, collision, crouch/sprint)
  world/              Level geometry, collision data, the vent maze, the statue
  interaction/        Raycast-based interact/kick logic for switches, doors, pickups
  ui/                 HUD (objective, prompts, messages, ability icons, start screen)
  main.js             Wires it all together and runs the game loop
```

The game world (rooms, colliders, pickups) is defined in
`src/world/Level.js`; new rooms/areas for future chapters can be added there
and hooked into `GameState`'s objective list.
