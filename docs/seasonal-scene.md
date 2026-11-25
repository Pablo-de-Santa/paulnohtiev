# Seasonal clearing

The main portfolio uses `src/clearing/forest-stage.js` for a vertical descent into the clearing after the planes. The standalone preview offers close and wide framing and season controls. Open [forest-preview.html](../forest-preview.html).

The modules in `src/clearing/` build the cabin surroundings, pond, picnic, fire, Odie, birds and mountains. `voxel-person.js` uses the original `pixel-portrait.js` drawing to give Paul an alpha-cut front, a separately drawn back and solid silhouette sidewalls. Paul sits in a fixed pose. Outer and foreground trees appear during exploration, while the seated observation camera responds to mouse and device tilt. Device orientation uses the shared permission flow in `src/shared/device-tilt.js`. Static scenery is batched and seasonal resources are disposed after replacement.

Explore glows above the contact/résumé links and flies from the observation camera into first person over 1.8 seconds. WASD/arrows walk, mouse/touch drag looks, and touch devices have a joystick. Escape or Exit exploration restores the observation camera and page scrolling. Pond, walls, furniture, fire, character, rocks, logs, Odie and tree trunks have lightweight collision boundaries. The cabin door must be opened to pass through its doorway. The camera follows the height of the steps and floor. Weather is excluded from the cabin interior.

`src/clearing/cabin.js` supplies a walkable shell with transparent window panes, a hinged door, furniture, lamps, computer, wall calendar and clock. `src/clearing/clearing-life.js` shows actions for nearby objects. Aim at the object and press E or tap the action button. Visitors can toast a marshmallow, feed fish outside winter, and offer Odie a biscuit. The computer moves the camera toward its screen before opening a full-screen menu with the résumé and configured contact links. The [résumé viewer](../resume-view.html) uses rendered local pages and accessible text with a link to the original PDF. Regenerate these assets when the PDF changes.

The game clock defaults to browser-local time, or noon for an invalid date. Cabin clock choices advance at real-time speed and ease into morning, afternoon, evening or night lighting. The calendar defaults to northern-hemisphere meteorological seasons (Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov autumn); overrides crossfade scene materials over three seconds. Choices last for the current page session. Winter freezes the pond and adds snow/scarves, autumn adds falling leaves, spring adds petals/flowers, and summer is green. Reduced-motion mode stops ambient character/weather movement.

`src/journey/pixel-sky.js` provides matching 3D aircraft and clouds. The transition copy reads “I love pixel worlds. Let’s explore mine.” Contrails extend backward from each engine along the current aircraft heading, independently of the scrolling camera's descent.

Run `node --test tests/*.test.mjs` and the Playwright checks in `tests/explore-browser.cjs`, `tests/fetch-browser.cjs`, `tests/cabin-browser.cjs`, `tests/clearing-actions.cjs`, and `tests/forest-preview.cjs`. The standalone development preview exposes `window.forestDebug` for scene inspection.

## Audio and additional actions

`src/clearing/clearing-audio.js` generates original sparse ambient notes and synthesized environmental sounds with Web Audio. Audio starts on the first Explore click and preserves mute preferences on subsequent entries. The Music toggle leaves environmental sound running, while Mute all suspends the audio context. A physical cabin radio offers the same music control. Audio controls appear during exploration. Audio suspends immediately on exit, outside the clearing, and while the tab is hidden. Closing the stage releases its context and nodes.

Wind, foliage and insects vary by season, with occasional bird calls. The hearth and fire pit each combine a sustained flame with distinct wood cracks. Fire and radio volume and panning depend on distance and viewing direction. Interactions add proximity cues, door and click sounds, fish splashes, barks and eating sounds. One-shot nodes disconnect after playback. Music and world sounds use separate gain buses through a shared limiter.

After six seconds continuously beside the fire, the fire action becomes Eat marshmallow. A brief first-person bite animation consumes it. The outdoor laptop opens a code view via a click, tap or E. The cabin computer opens the résumé. The clock and calendar offer Restore current time and Restore current season.

`tests/sound-browser.cjs` measures nonzero browser audio output before and after music mute and checks game-only audio, exit/re-entry, radio, marshmallow eating, direct laptop clicks and time/season restoration. `tests/sound.test.mjs` covers distance/pan and seasonal sound settings.

The indoor hearth extends into the exterior chimney. Marshmallows remain on a stick, and food flies from the visitor to the nearby pond bank where fish gather. Odie faces the visitor while sitting. `src/clearing/clearing-sky.js` adds a visible sun aligned with the shadow light, night stars, a slow aurora and infrequent shooting stars. `tests/clearing-refinements.cjs` checks entry flight, automatic audio, cooking distance, variable food throws, Odie orientation and night/exit behavior.

Camp polish: blocked attempts at the outer walking boundary display a rate-limited stay-at-camp notice. Collision now includes the actual swinging door panel. Window apertures match their frames; the desk, hearth and radio occupy separate footprints. Laundry is articulated and deflects near visitors. The outdoor laptop has an aligned, unlit code-editor texture. Avatar proportions and rounded shoulders/arms are refined. Credits distinguish the current original pixel scene and synthesized audio from bundled assets used by earlier versions.

World audio is quieter than the music bed, with irregular wind/foliage swells and varied bird timing and pitches. Roasting reaches ready at six seconds and burns at twelve; burned marshmallows must be discarded. Leaving the heat stops cooking (unfinished cooking resets; cooked marshmallows remain cooked). Eating lifts a hand and stick, takes bites, then withdraws with a synchronized sound. `tests/camp-polish.cjs` covers boundary feedback, clothes, laptop display, burning and eating; the door-panel sweep has a unit regression test.

The cabin walls, door, porch and gables use original pixel wood textures with grain, board joints and nail marks, plus corner timbers. The portrait front/back and cabin appearance are checked in `tests/portrait-cabin.cjs`.

Cabin-only actions use a shared four-wall/height check both when displaying controls and when activating them. The wall switch toggles the room lamp; the hearth action toggles embers, glow, chimney smoke and indoor crackling. Both settings persist when changing seasons. The outdoor laptop remains usable outside. `tests/cabin-controls.cjs` verifies exterior rejection and indoor toggles.

## Cabin arcade and layout

Front wall strips and header no longer overlap; wood uses mipmapped filtering, and corner trims and window crossbars have separated surfaces to avoid z-fighting. The right rear hearth faces diagonally into the room. The centered computer/desk sit between the bed and hearth; the radio faces inward beneath the right window. The solid arcade cabinet sits beside the bed and opens the locally bundled `/tower-defense/` game in a full-viewport dialog. A permanent Back to camp control closes its audio context, removes the iframe and resumes the camp according to its previous mute/music preferences. The camp renderer pauses while the arcade is open. The game keeps its own Start Game control for audio activation and Escape/menu behavior. See `tower-defense/SOURCE.md` for provenance and `tests/arcade-browser.cjs` for actual gameplay/audio handoff coverage.

## Conversation and camp guide

Odie’s menu offers sit, lie down, speak, roll over, spin, a treat and fetch. Select the ball beside the pond or choose fetch from his menu to have him bring it over. Pick it up and aim with the center dot. Hold and release to throw using the circular power meter. Right-click or double-tap to squeak. Odie wags his tail, comes over and sits near the ball. He fetches reachable throws past the walking boundary, slows near the visitor, and puts the ball down before leaving. Roof strikes and distant throws prompt a replacement. Speak uses a trimmed CC0 small-dog recording. See [audio sources](../assets/audio/SOURCES.md).

Paul has editable scripted interviews in `src/clearing/camp-dialogue.js` with sections covering About Paul, JavaScript and TypeScript, modern frontend, architecture and Angular. Answers type into an anchored speech bubble with synthesized syllables and a show-full-answer control. Screen readers receive the complete answer. Contextual greetings follow the time and season, and Paul reacts if a throw hits him. See the official Angular references used for the technical material. [Signals](https://angular.dev/guide/signals), [zoneless](https://angular.dev/guide/zoneless), [components](https://angular.dev/guide/components).

Introduction opens rotating scene-object previews and instructions. The Paul preview includes the entire picnic. Time and season selections block movement with a visible transition overlay until the change completes. The outdoor laptop is code-only; résumé access remains on the cabin computer. Menus animate, links underline on hover, and all camp sound remains gated by exploration and the mute settings. Arcade audio isolation is preserved.

The warm drink has steam and a seasonal label. Paul has hot chocolate in winter and tea the rest of the year. Fish food follows staggered arcs from the player to the pond. Laundry contact direction is latched until the visitor leaves its contact zone, preventing rapid sign flips. At night, the moon, more frequent shooting stars, and cool directional shadows are visible. Day brings the sun and warm directional shadows.

Checks: `node --test tests/*.test.mjs`, `node tests/camp-social.cjs`, `MOBILE=1 node tests/camp-social.cjs`, and `node tests/arcade-browser.cjs`.

## Entering and leaving exploration

The movement/look hint is centered for three seconds after landing, with keyboard/mouse wording on desktop and joystick/touch wording on phones. Each visit shows it again. The return flight lasts 1.8 seconds, keeps movement disabled and blends both camera pose and projection back to the frozen observation view. The saved page scroll position and focus are restored after arrival. Reduced-motion visitors enter/leave directly and still get the three-second controls hint. Disposal and a forced chapter change exit immediately.
