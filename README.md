# Paul Nohtiev

A vanilla JavaScript / Three.js portfolio with a GSAP scroll journey and an explorable seasonal pixel clearing. No build step is required.

## Run locally

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. ES modules require HTTP rather than opening the HTML file directly. `forest-preview.html` opens the clearing by itself for development.

## Current journey

Welcome → expanding matter and galaxies → solar system → Earth and Moon → pixel clouds and aircraft → an elevator descent into the forest clearing. Explore enters first-person mode, with keyboard controls on desktop and touch controls on mobile. The cabin contains a computer with portfolio links, time/season controls, lights, a fireplace, radio, and a Tower Defense arcade.

The clearing follows the local date and time unless overridden in the cabin. Camp audio starts only in exploration mode. The arcade opens the locally bundled game, pauses camp audio and background rendering, and restores the previous audio settings when closed.

## Code map

- `script.js`, `choreography.js`: GSAP scroll progression, copy visibility, camera and aircraft paths.
- `scene.js`, `assets.js`, `models.js`: space/sky renderer, planetary textures and meshes. Only planetary maps and the distant bird model are loaded; pixel aircraft are authored in code.
- `cosmos.js`, `nebula.js`, `solar-activity.js`: evolving matter, galaxies, solar glare, prominences and meteoroids.
- `pixel-sky.js`, `descent-effects.js`: pixel aircraft/clouds, engine contrails and distant birds.
- `forest-stage.js`, `forest-preview.js`: main-site and standalone clearing hosts.
- `seasonal-scene.js`, `seasons.js`: seasonal landscape and scene animation.
- `cabin.js`, `voxel-person.js`, `pixel-portrait.js`: cabin layout/collision and Paul's portrait model.
- `clearing-life.js`: interactions, dialogue, transition locks and menus, including the arcade.
- `camp-dialogue.js`, `camp-preview.js`, `odie-actions.js`: editable interview answers and contextual greetings, rotating guide models and Odie’s tricks.
- `explore-controls.js`, `clearing-layout.js`: movement, boundaries and Odie's path.
- `clearing-audio.js`, `clearing-sky.js`, `clearing-tilt.js`: soundscape, time-of-day sky and observation parallax.
- `device-tilt.js`, `interactions.js`: space-scene input and object registry.
- `config.js`: optional portfolio URL and aircraft labels.
- `tower-defense/`: Paul's original game and a small audio-cleanup bridge; see `tower-defense/SOURCE.md`.

Planet sizes, orbital periods, lighting and travel distances are composed for readability, not a physical simulation. Motion respects the reduced-motion preference. HTTPS and, on some devices, a user gesture are required for device orientation access. If WebGL fails, portfolio text and links remain accessible.

## Assets and authoring

Runtime files are local; no asset CDN is required. Keep `assets/`, `vendor/`, and `tower-defense/` when deploying. See `credits.html` for sources and licenses.

The earlier realistic valley, city, volumetric-cloud and video preview code has been removed. Original Blender projects, model reference assets and their provenance remain available for future authoring; they are not loaded by the website. Generated screenshots under `previews/` and earlier video exports are ignored by Git. `blender/README.md` describes the retained source project.

## Checks

Unit and bundled game checks require Node.js:

```sh
node --test tests/*.test.mjs
node tower-defense/tests.js
```

Browser checks require Playwright and Chromium, plus the local server:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/explore-browser.cjs
node tests/arcade-browser.cjs
MOBILE=1 node tests/arcade-browser.cjs
```

These cover entering/leaving exploration, keyboard/touch movement, the actual arcade game, fullscreen layout, audio suspension/cleanup and preservation of mute preferences. Additional focused browser diagnostics are in `tests/`.

Initial loading uses a center-split curtain (`loading.js`). Before scrolling unlocks, the current seasonal clearing is built and the journey renders representative chapter states behind the curtain to prepare shaders and GPU textures. This does not scroll the page or enable game audio. Reduced motion skips the curtain animation; startup errors release the loading lock. Run `tests/loading-browser.cjs` for loading, fast-scroll, reduced-motion/mobile, and library-failure checks.
