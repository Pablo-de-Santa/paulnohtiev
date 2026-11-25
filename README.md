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

- `index.html` opens the portfolio. `forest-preview.html` opens the standalone clearing for development. `resume-view.html` and `credits.html` hold the résumé viewer and asset credits.
- `src/journey/` runs the scroll experience. `main.js` starts it, `choreography.js` defines the camera and flight paths, and `scene.js` renders space, planetary surfaces and the pixel sky. Edit portfolio links and aircraft labels in `config.js`.
- `src/clearing/` contains the seasonal forest, cabin, movement controls, audio and camp menus. `forest-stage.js` connects the clearing to the portfolio. `forest-preview.js` runs the standalone clearing. `odie-actions.js` handles Odie’s movement and tricks, while `odie-fetch.js`, `fetch-terrain.js` and `fetch-controls.js` handle fetch. Edit Paul’s dialogue in `camp-dialogue.js`. See the [seasonal clearing notes](docs/seasonal-scene.md).
- `src/shared/` contains device motion and browser scheduling helpers. `src/styles/` contains the portfolio and exploration stylesheets.
- `assets/`, `images/` and `vendor/` hold the local runtime assets and libraries. `blender/` holds the editable Blender project and authoring scripts. `tower-defense/` contains Paul’s arcade game and its audio bridge. See the [arcade source notes](tower-defense/SOURCE.md).

Planet sizes, orbital periods, lighting and travel distances are composed for readability, not a physical simulation. Motion respects the reduced-motion preference. HTTPS and, on some devices, a user gesture are required for device orientation access. If WebGL fails, portfolio text and links remain accessible.

## Assets and authoring

The website serves local runtime files. Deploy `src/`, `assets/`, `images/`, `vendor/` and `tower-defense/` alongside the public HTML, `robots.txt` and `sitemap.xml`. See [asset credits](credits.html) for sources and licenses.

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
node tests/fetch-browser.cjs
node tests/arcade-browser.cjs
MOBILE=1 node tests/arcade-browser.cjs
```

These cover entering/leaving exploration, keyboard/touch movement, the actual arcade game, fullscreen layout, audio suspension/cleanup and preservation of mute preferences. Additional focused browser diagnostics are in `tests/`.

`src/journey/loading.js` opens the center-split curtain while the journey prepares its representative shader, texture and geometry states. Scrolling unlocks once both the journey and the seasonal clearing are ready. Game audio starts when the visitor chooses Explore. Reduced motion skips the curtain animation, and startup errors release the loading lock. Run `node tests/loading-browser.cjs` for loading, fast-scroll, reduced-motion/mobile, and library-failure checks.
