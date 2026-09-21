import { createDeviceTilt } from "./device-tilt.js";
import * as THREE from "./vendor/three.module.min.js";

// A registry, not scene-specific click handlers. Placement stays on `root`;
// temporary reactions stay on a child rig and never overwrite scroll transforms.
export function createInteractionSystem(
  camera,
  { reducedMotion, invalidate, actionsEnabled = false },
) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const entries = new Map();
  const controls = document.querySelector("#object-controls");
  const status = document.querySelector("#interaction-status");
  const listeners = new AbortController();
  const parallax = new THREE.Vector2();
  let pendingPointer = null;
  let hovered = null,
    start = null,
    suspended = reducedMotion,
    parallaxEnabled = false;
  const tilt = createDeviceTilt(parallax, {
    invalidate,
    isSuspended: () => suspended,
    isEnabled: () => parallaxEnabled,
  });
  const visible = (object) => {
    for (let p = object; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  function register(id, name, visual, options = {}) {
    const root = new THREE.Group(),
      reaction = new THREE.Group();
    root.name = id;
    root.userData.entityId = id;
    reaction.add(visual);
    root.add(reaction);
    const state = { hover: 0, turn: 0, pulse: 0 },
      spring = { position: 0, velocity: 0 };
    const entry = {
      id,
      name,
      root,
      reaction,
      state,
      spring,
      options,
      button: null,
    };
    const button = document.createElement("button");
    button.textContent = name;
    button.type = "button";
    button.hidden = !actionsEnabled;
    button.disabled = !actionsEnabled;
    button.dataset.object = id;
    button.addEventListener("click", () => activate(entry));
    button.addEventListener("focus", () => setHover(entry));
    button.addEventListener("blur", () => setHover(null));
    controls.append(button);
    entry.button = button;
    entries.set(id, entry);
    return root;
  }
  function setHover(entry) {
    if (entry === hovered) return;
    if (hovered) hovered.state.hover = 0;
    hovered = entry;
    if (entry) entry.state.hover = 1;
    document.body.style.cursor = entry ? "pointer" : "";
    invalidate();
  }
  function activate(entry) {
    if (!actionsEnabled || !entry || !visible(entry.root)) return;
    status.textContent = entry.name;
    entry.options.onClick?.();
    if (!suspended) {
      gsap.fromTo(
        entry.state,
        { pulse: 0 },
        {
          pulse: 1,
          duration: 0.3,
          repeat: 1,
          yoyo: true,
          ease: "power2.out",
          overwrite: true,
          onUpdate: invalidate,
        },
      );
      gsap.to(entry.state, {
        turn: entry.state.turn + 0.18,
        duration: 0.9,
        ease: "elastic.out(1,.6)",
        overwrite: "auto",
        onUpdate: invalidate,
      });
    }
    invalidate();
  }
  function pick(event) {
    if (event.target.closest("a,button")) return null;
    pointer.set(
      (event.clientX / innerWidth) * 2 - 1,
      (-event.clientY / innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const roots = [...entries.values()]
      .filter((e) => visible(e.root) && e.options.pickable !== false)
      .map((e) => e.root);
    const hit = raycaster.intersectObjects(roots, true)[0];
    if (!hit) return null;
    for (let p = hit.object; p; p = p.parent)
      if (p.userData.entityId) return entries.get(p.userData.entityId);
    return null;
  }
  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch" || !parallaxEnabled) return;
      parallax.set(
        (event.clientX / innerWidth) * 2 - 1,
        (-event.clientY / innerHeight) * 2 + 1,
      );
      if (actionsEnabled) pendingPointer = event;
      invalidate();
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      start = { x: event.clientX, y: event.clientY, scroll: scrollY };
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "pointerup",
    (event) => {
      if (
        actionsEnabled &&
        start &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8 &&
        Math.abs(scrollY - start.scroll) < 8
      )
        activate(pick(event));
      start = null;
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "pointercancel",
    () => {
      start = null;
    },
    { signal: listeners.signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        for (const e of entries.values())
          gsap.to(e.state, {
            turn: 0,
            pulse: 0,
            duration: 0.4,
            overwrite: true,
            onUpdate: invalidate,
          });
        setHover(null);
      }
    },
    { signal: listeners.signal },
  );
  return {
    register,
    parallax,
    setParallaxEnabled(value) {
      if (value === parallaxEnabled) return;
      parallaxEnabled = value;
      parallax.set(0, 0);
      tilt.reset();
    },
    update(dt) {
      // Pointer events can arrive much faster than display frames.
      if (!actionsEnabled) return;
      if (pendingPointer) {
        setHover(pick(pendingPointer));
        pendingPointer = null;
      }
      if (hovered && !visible(hovered.root)) setHover(null);
      for (const e of entries.values()) {
        const active = visible(e.root);
        if (e.button.disabled === active) e.button.disabled = !active;
        if (!active) continue;
        const spring = e.spring;
        // Damped spring integration, with a bounded timestep, for hover response.
        const step = Math.min(dt, 0.033),
          target = suspended ? 0 : e.state.hover;
        spring.velocity +=
          ((target - spring.position) * 85 - spring.velocity * 15) * step;
        spring.position += spring.velocity * step;
        const amount = suspended ? 0 : spring.position;
        const scale =
          1 + amount * 0.025 + (suspended ? 0 : e.state.pulse * 0.04);
        e.reaction.scale.setScalar(scale);
        e.reaction.rotation.y = suspended ? 0 : e.state.turn;
        e.reaction.rotation.z = e.options.bank ? amount * 0.13 : 0;
        if (Math.abs(spring.velocity) > 0.001) invalidate();
      }
    },
    setSuspended(value) {
      suspended = value;
      tilt.reset();
      invalidate();
    },
    dispose() {
      listeners.abort();
      tilt.dispose();
      for (const e of entries.values()) gsap.killTweensOf(e.state);
      controls.replaceChildren();
      document.body.style.cursor = "";
    },
  };
}
