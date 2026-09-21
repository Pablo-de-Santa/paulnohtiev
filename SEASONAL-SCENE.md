# Seasonal clearing

The main portfolio uses `forest-stage.js` for a vertical descent into the clearing after the planes. `/forest-preview.html` shows the same scene independently, with close/wide framing and season controls. It remains vanilla JavaScript, Three.js and GSAP. No video is used.

`seasonal-scene.js` builds the cabin surroundings, pond, picnic, fire, Odie, birds and mountains. `voxel-person.js` preserves the original `pixel-portrait.js` drawing as a fixed shallow relief: an alpha-cut front, separately drawn back and solid silhouette sidewalls. Paul sits still and never turns toward the camera. Outer/foreground trees appear only during exploration, while the seated observation camera responds to mouse/device tilt. Device orientation uses the existing site permission flow. Static scenery is batched and seasonal resources are disposed after replacement.

Explore glows above the contact/résumé links and flies from the observation camera into first person over 1.8 seconds. WASD/arrows walk, mouse/touch drag looks, and touch devices have a joystick. Escape or Exit exploration restores the observation camera and page scrolling. Pond, walls, furniture, fire, character, rocks, logs, Odie and tree trunks have lightweight collision boundaries. The cabin door must be opened to pass through its doorway. The camera follows the height of the steps and floor. Weather is excluded from the cabin interior.

`cabin.js` supplies a walkable shell with transparent window panes, a hinged door, furniture, lamps, computer, wall calendar and clock. `clearing-life.js` shows actions for nearby objects: press E or tap the action button. Aim toward the desired object when several are nearby. Visitors can toast a marshmallow, feed fish outside winter, and ask Odie to sit for a treat. The computer moves the camera toward its screen before opening a full-screen computer menu with résumé and all configured contact links. `resume-view.html` uses rendered local pages and an accessible text version, with the original PDF available separately. Regenerate these assets when the PDF changes.

The game clock defaults to browser-local time, or noon for an invalid date. Cabin clock choices advance at real-time speed and ease into morning, afternoon, evening or night lighting. The calendar defaults to northern-hemisphere meteorological seasons (Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov autumn); overrides crossfade scene materials over three seconds. Choices last for the current page session. Winter freezes the pond and adds snow/scarves, autumn adds falling leaves, spring adds petals/flowers, and summer is green. Reduced-motion mode stops ambient character/weather movement.

`pixel-sky.js` provides matching 3D aircraft and clouds. The transition copy reads “I love pixel worlds. Let’s explore mine.” Contrails extend backward from each engine along the current aircraft heading, independently of the scrolling camera's descent.

Verification: `node --test tests/*.test.mjs`, plus Playwright checks in `tests/explore-browser.cjs`, `tests/cabin-browser.cjs`, `tests/clearing-actions.cjs`, and `tests/forest-preview.cjs`. `window.forestDebug` is exposed only in the standalone development preview for scene inspection.

## Audio and additional actions

`clearing-audio.js` generates original sparse ambient notes and synthesized environmental sounds with Web Audio. No commercial soundtrack or external audio downloads are used. Audio starts on the first Explore click, preserving mute preferences on subsequent entries; the separate Music toggle leaves environmental sound running, while Mute all suspends the audio context. A physical cabin radio offers the same music control. Audio controls appear only in exploration mode. Audio suspends immediately on exit, outside the clearing, and while the tab is hidden; closing the stage releases its context and nodes.

Wind, foliage and insects vary by season, with occasional bird calls. Fire and radio volume/panning depend on distance and viewing direction. Interactions add proximity cues, door/click sounds, fish splashes, small synthesized barks and eating sounds. One-shot nodes disconnect after playback. Music and world sounds use separate gain buses through a shared limiter.

After six seconds continuously beside the fire (walking away resets cooking), the fire action becomes Eat marshmallow; a brief first-person bite animation consumes it. The outdoor laptop now supports a nearby click/tap or E, with the same camera focus and full-screen résumé as the cabin computer. Click detection ignores drags. The clock and calendar explicitly offer Restore current time / Restore current season.

`tests/sound-browser.cjs` measures nonzero browser audio output before and after music mute and checks game-only audio, exit/re-entry, radio, marshmallow eating, direct laptop clicks and time/season restoration. `tests/sound.test.mjs` covers distance/pan and seasonal sound settings.

The indoor hearth extends into the exterior chimney. Marshmallows remain on a stick; food flies from the visitor to the nearby pond bank and fish gather at its landing point. Odie faces the visitor while sitting. Interior pond rocks are excluded. Pixel aircraft render at a higher resolution and distant mountains are lower. `clearing-sky.js` adds a visible sun aligned with the shadow light, night stars, a slow aurora and infrequent shooting stars. `tests/clearing-refinements.cjs` checks entry flight, automatic audio, cooking distance, variable food throws, Odie orientation and night/exit behavior.

Camp polish: blocked attempts at the outer walking boundary display a rate-limited stay-at-camp notice. Collision now includes the actual swinging door panel. Window apertures match their frames; the desk, hearth and radio occupy separate footprints. Laundry is articulated and deflects near visitors. The outdoor laptop has an aligned, unlit code-editor texture. Avatar proportions and rounded shoulders/arms are refined. Credits distinguish the current original pixel scene and synthesized audio from bundled assets used by earlier versions.

World audio is quieter than the music bed, with irregular wind/foliage swells and varied bird timing and pitches. Roasting reaches ready at six seconds and burns at twelve; burned marshmallows must be discarded. Leaving the heat stops cooking (unfinished cooking resets; cooked marshmallows remain cooked). Eating lifts a hand and stick, takes bites, then withdraws with a synchronized sound. `tests/camp-polish.cjs` covers boundary feedback, clothes, laptop display, burning and eating; the door-panel sweep has a unit regression test.

The cabin walls, door, porch and gables use original pixel wood textures with grain, board joints and nail marks, plus corner timbers. The portrait front/back and cabin appearance are checked in `tests/portrait-cabin.cjs`.

Cabin-only actions use a shared four-wall/height check both when displaying controls and when activating them. The wall switch toggles the room lamp; the hearth action toggles embers, glow, chimney smoke and indoor crackling. Both settings persist when changing seasons. The outdoor laptop remains usable outside. `tests/cabin-controls.cjs` verifies exterior rejection and indoor toggles.

## Cabin arcade and layout

Front wall strips and header no longer overlap; wood uses mipmapped filtering, and corner trims and window crossbars have separated surfaces to avoid z-fighting. The right rear hearth faces diagonally into the room. The centered computer/desk sit between the bed and hearth; the radio faces inward beneath the right window. The solid arcade cabinet sits beside the bed and opens the locally bundled `/tower-defense/` game in a full-viewport dialog. A permanent Back to camp control closes its audio context, removes the iframe and resumes the camp according to its previous mute/music preferences. The camp renderer pauses while the arcade is open. The game keeps its own Start Game control for audio activation and Escape/menu behavior. See `tower-defense/SOURCE.md` for provenance and `tests/arcade-browser.cjs` for actual gameplay/audio handoff coverage.

## Conversation and camp guide

Odie’s menu offers sit, lie down, speak, roll over, spin and a treat. Commands suspend his walking clock and blend back into movement; the existing pond-safe route remains unchanged. Speak uses a trimmed CC0 small-dog recording, credited in `assets/audio/SOURCES.md` and the credits page.

Paul has editable scripted interviews in `camp-dialogue.js`: About Paul, JavaScript/TypeScript, modern frontend, architecture, Angular and modern Angular. Personal details are limited to the supplied brief; technical answers are authored sample responses, not a claim of additional employment history. Modern Angular material was checked against the official [signals](https://angular.dev/guide/signals), [zoneless](https://angular.dev/guide/zoneless) and [components](https://angular.dev/guide/components) documentation. Answers type into an anchored speech bubble with original synthesized robot-like syllables and a show-full-answer control. Screen readers receive the complete answer, not each character. Contextual greetings avoid nighttime sky claims during daytime and respect winter’s frozen pond.

Introduction opens rotating scene-object previews and instructions. The Paul preview includes the entire picnic. Time and season selections block movement with a visible transition overlay until the change completes. The outdoor laptop is code-only; résumé access remains on the cabin computer. Menus animate, links underline on hover, and all camp sound remains gated by exploration and the mute settings. Arcade audio isolation is preserved.

The warm drink has steam and a seasonal label (winter hot chocolate, autumn tea, spring/summer coffee). Fish food follows staggered arcs from the player to the pond. Laundry contact direction is latched until the visitor leaves its contact zone, preventing rapid sign flips. Night has a visible moon, more frequent shooting stars, and cool directional shadows; day has the visible sun and warm directional shadows.

Checks: `node --test tests/*.test.mjs`, `node tests/camp-social.cjs`, `MOBILE=1 node tests/camp-social.cjs`, and `node tests/arcade-browser.cjs`.

## Entering and leaving exploration

The movement/look hint is centered for three seconds after landing, with keyboard/mouse wording on desktop and joystick/touch wording on phones. Each visit shows it again. The return flight lasts 1.8 seconds, keeps movement disabled and blends both camera pose and projection back to the frozen observation view. The saved page scroll position and focus are restored after arrival. Reduced-motion visitors enter/leave directly and still get the three-second controls hint. Disposal and a forced chapter change exit immediately.
