import { createForestStage } from "./forest-stage.js";
import { portfolioURL } from "./config.js";
import { phaseAtScroll, smooth } from "./choreography.js";
const sections = [...document.querySelectorAll(".chapter")],
  media = matchMedia("(prefers-reduced-motion: reduce)");
const host = document.querySelector("#scene");
const welcome = document.querySelector("#welcome-copy"),
  earthCopy = document.querySelector("#earth-copy"),
  contact = document.querySelector("#contact-copy");
const pixelCopy = document.createElement("p");
pixelCopy.id = "pixel-copy";
pixelCopy.textContent = "I love pixel worlds. Let’s explore mine.";
document.body.append(pixelCopy);
const playhead = { value: 0 };
let forestStage;
let world,
  scrollTween,
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
  element.style.opacity = opacity.toFixed(4);
  element.style.visibility = opacity < 0.01 ? "hidden" : "visible";
  element.inert =
    opacity < 0.05 || document.body.classList.contains("exploring");
}
function update() {
  const p = phaseAtScroll(playhead.value * end, offsets, end);
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
        scrub: media.matches ? true : 0.7,
        onRefreshInit: measure,
        onRefresh: update,
      },
    },
  );
  ScrollTrigger.refresh();
}
function updateMotion() {
  world?.setPaused(paused);
}
function fallback(error) {
  console.error("3D scene unavailable", error);
  world?.dispose();
  world = null;
  forestStage?.dispose();
  forestStage = null;
  window.journeyLoader?.finish(true);
  scrollTween?.scrollTrigger?.kill();
  scrollTween?.kill();
  document.body.classList.add("scene-unavailable");
  document.querySelector("#scene-error").hidden = false;
  document.querySelector("#atmosphere-veil").style.opacity = 0;
  [welcome, earthCopy, contact].forEach((e) => {
    e.style.opacity = 1;
    e.style.visibility = "visible";
    e.inert = false;
  });
}
try {
  if (!window.gsap || !window.ScrollTrigger)
    throw new Error("Animation libraries did not load");
  gsap.registerPlugin(ScrollTrigger);
  const { createWorld } = await import("./scene.js");
  world = await createWorld(host, {
    reducedMotion: media.matches,
    onFailure: fallback,
  });
  const button = document.querySelector("#explore-button");
  forestStage = createForestStage(button);
  forestStage.setPhase(0);
  await world.warmup();
  await forestStage.warmup();
  window.scrollTo(0, 0);
  setupScroll();
  update();
  updateMotion();
  button.disabled = false;
  await window.journeyLoader?.finish();
  host.dataset.ready = "true";
  media.addEventListener("change", () => {
    paused = media.matches;
    updateMotion();
    setupScroll();
  });
  let resizeFrame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      forestStage?.resize();
      world?.resize();
      measure();
      ScrollTrigger.refresh();
      update();
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      forestStage?.resize();
      world?.resize();
      update();
    }
  });
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      forestStage?.dispose();
      world?.dispose();
      scrollTween?.scrollTrigger?.kill();
      scrollTween?.kill();
    }
  });
} catch (error) {
  fallback(error);
}
