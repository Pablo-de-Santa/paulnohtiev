import { portfolioURL } from "./config.js";
import { phaseAtScroll, smooth } from "./choreography.js";
import { nextFrame, yieldToBrowser } from "../shared/frame-tasks.js";
import { attachJourneyKeyboard } from "./journey-keyboard.js";
import { attachJourneyWheel } from "./journey-wheel.js";
const sections = [...document.querySelectorAll(".chapter")],
  media = matchMedia("(prefers-reduced-motion: reduce)");
const host = document.querySelector("#scene");
const exploreButton = document.querySelector("#explore-button"),
  exploreError = document.querySelector(".explore-load-error"),
  mobile = window.journeyLoader?.mobile === true;
const welcome = document.querySelector("#welcome-copy"),
  earthCopy = document.querySelector("#earth-copy"),
  contact = document.querySelector("#contact-copy");
const pixelCopy = document.createElement("p");
pixelCopy.id = "pixel-copy";
pixelCopy.textContent = "I love pixel worlds. Let’s explore mine.";
document.body.append(pixelCopy);
const playhead = { value: 0 };
const nativeScrubSeconds = 0.7;
const lifecycle = new AbortController();
const listenerOptions = { signal: lifecycle.signal };
let forestStage,
  panoramaPromise,
  panoramaRequested = false,
  explorationReady = false,
  stopped = false,
  currentPhase = 0,
  world,
  scrollTween,
  detachKeyboard,
  detachWheel,
  offsets = [],
  end = 1,
  paused = media.matches;
if (portfolioURL) {
  const link = document.querySelector("#portfolio-link");
  link.href = portfolioURL;
  link.hidden = false;
}
function measure() {
  offsets = sections.map((s) => s.offsetTop);
  end = document.documentElement.scrollHeight - innerHeight;
}
function applyCopy(element, opacity) {
  const value = String(Math.round(opacity * 10000) / 10000);
  const visibility = opacity < 0.01 ? "hidden" : "visible";
  const inert = opacity < 0.05 || document.body.classList.contains("exploring");
  if (element.style.opacity !== value) element.style.opacity = value;
  if (element.style.visibility !== visibility) element.style.visibility = visibility;
  if (element.inert !== inert) element.inert = inert;
}
function update() {
  const p = phaseAtScroll(playhead.value * end, offsets, end);
  currentPhase = p;
  if (mobile && p >= 4 && !panoramaRequested && !stopped) {
    panoramaRequested = true;
    preparePanorama().catch((error) => {
      console.warn("Clearing panorama unavailable", error);
    });
  }
  forestStage?.setPhase(p);
  world?.setPaused(paused || p >= 5.25);
  world?.setPhase(p);
  applyCopy(pixelCopy, smooth(3.5, 3.7, p) * (1 - smooth(3.88, 4.05, p)));
  applyCopy(welcome, 1 - smooth(0.22, 0.52, p));
  applyCopy(earthCopy, smooth(2.1, 2.35, p) * (1 - smooth(2.72, 2.98, p)));
  applyCopy(contact, smooth(5.82, 5.98, p));
}
function setupScroll() {
  scrollTween?.scrollTrigger?.kill();
  scrollTween?.kill();
  measure();
  scrollTween = gsap.fromTo(
    playhead,
    { value: 0 },
    {
      value: 1,
      ease: "none",
      onUpdate: update,
      scrollTrigger: {
        start: 0,
        end: () => end,
        scrub: media.matches ? true : nativeScrubSeconds,
        onRefreshInit: measure,
        onRefresh: update,
      },
    },
  );
  ScrollTrigger.refresh();
  playhead.value = scrollY / Math.max(1, end);
  update();
}
function preparePanorama() {
  if (panoramaPromise) return panoramaPromise;
  panoramaPromise = (async () => {
    const { createForestStage } = await import("../clearing/forest-stage.js");
    if (stopped) return;
    const stage = await createForestStage(exploreButton, { deferExploration: mobile });
    try {
      if (!mobile && !stopped) await stage.warmup();
      if (stopped) return;
      stage.setPhase(currentPhase);
      forestStage = stage;
      world?.setClearingReady(true);
      return stage;
    } finally {
      if (stage !== forestStage) stage.dispose();
    }
  })().catch((error) => {
    panoramaPromise = null;
    throw error;
  });
  return panoramaPromise;
}
function setExploreProgress(percent) {
  exploreButton.dataset.loadingProgress = String(percent);
  exploreButton.style.setProperty("--explore-progress", `${percent}%`);
  exploreButton.textContent = `Loading ${percent}%`;
}
async function enterMobileClearing() {
  if (stopped || exploreButton.hasAttribute("aria-busy")) return;
  if (explorationReady) {
    forestStage.enterExploration();
    return;
  }
  panoramaRequested = true;
  exploreError.hidden = true;
  exploreButton.setAttribute("aria-busy", "true");
  exploreButton.setAttribute("aria-disabled", "true");
  setExploreProgress(0);
  try {
    await nextFrame();
    await nextFrame();
    if (stopped) return;
    const stage = await preparePanorama();
    if (stopped) return;
    setExploreProgress(30);
    const ready = await stage.prepareExploration((progress) => {
      if (!stopped) setExploreProgress(30 + Math.floor(progress * 65));
    });
    if (!ready || stopped) return;
    explorationReady = true;
    setExploreProgress(100);
    await nextFrame();
    await nextFrame();
  } catch (error) {
    if (stopped) return;
    console.warn("Could not load the clearing", error);
    exploreError.textContent = "The clearing couldn’t load. Try Explore again.";
    exploreError.hidden = false;
  } finally {
    exploreButton.removeAttribute("aria-busy");
    exploreButton.removeAttribute("aria-disabled");
    delete exploreButton.dataset.loadingProgress;
    exploreButton.style.removeProperty("--explore-progress");
    exploreButton.textContent = "Explore";
  }
  if (explorationReady && !stopped && phaseAtScroll(scrollY, offsets, end) >= 5.7)
    forestStage.enterExploration();
}
function dispose() {
  stopped = true;
  lifecycle.abort();
  detachKeyboard?.();
  detachWheel?.();
  scrollTween?.scrollTrigger?.kill();
  scrollTween?.kill();
  world?.dispose();
  world = null;
  forestStage?.dispose();
  forestStage = null;
}
function fallback(error) {
  if (stopped) return;
  console.error("3D scene unavailable", error);
  dispose();
  exploreButton.disabled = true;
  window.journeyLoader?.finish(true);
  document.body.classList.add("scene-unavailable");
  document.querySelector("#scene-error").hidden = false;
  document.querySelector("#atmosphere-veil").style.opacity = 0;
  [welcome, earthCopy, contact].forEach((e) => {
    e.style.opacity = 1;
    e.style.visibility = "visible";
    e.inert = false;
  });
}
function attachScrollInputs() {
  detachKeyboard = attachJourneyKeyboard({ getMaximumScroll: () => end, reducedMotion: media });
  detachWheel = attachJourneyWheel({
    getMaximumScroll: () => end,
    reducedMotion: media,
    onMotionChange(active) {
      // The wheel already eases the page. Follow its position without a second tween.
      scrollTween?.scrollTrigger.scrubDuration(active || media.matches ? 0 : nativeScrubSeconds);
    },
  });
}
async function initialize() {
  if (!window.gsap || !window.ScrollTrigger)
    throw new Error("Animation libraries did not load");
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (mobile) {
    setupScroll();
    window.journeyLoader.finish();
    attachScrollInputs();
    watchChanges();
    exploreButton.addEventListener("click", enterMobileClearing, listenerOptions);
    exploreButton.disabled = false;
  }
  const { createWorld } = await import("./scene.js");
  if (stopped) return;
  const stage = await createWorld(host, {
    reducedMotion: media.matches,
    onFailure: fallback,
  });
  try {
    if (stopped) return;
    window.journeyLoader?.revealWelcome?.();
    await stage.warmup(() => currentPhase);
    if (stopped) return;
    stage.resize();
    world = stage;
    world.setClearingReady(Boolean(forestStage));
  } finally {
    if (stage !== world) stage.dispose();
  }
  if (!mobile) {
    // Give paint a turn between preparing the two WebGL contexts.
    await yieldToBrowser();
    if (stopped) return;
    await preparePanorama();
    if (stopped) return;
    window.scrollTo(0, 0);
    setupScroll();
    exploreButton.disabled = false;
    await window.journeyLoader?.finish();
    if (stopped) return;
    attachScrollInputs();
    watchChanges();
  }
  update();
  host.dataset.ready = "true";
}
function watchChanges() {
  media.addEventListener("change", () => {
    paused = media.matches;
    setupScroll();
  }, listenerOptions);
  let resizeFrame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      forestStage?.resize();
      world?.resize();
      // ScrollTrigger refreshes chapter offsets on its own resize lifecycle.
    });
  }, listenerOptions);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      forestStage?.resize();
      world?.resize();
      update();
    }
  }, listenerOptions);
}
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) dispose();
}, listenerOptions);
initialize().catch(fallback);
