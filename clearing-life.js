import { interview, guide, campGreeting } from "./camp-dialogue.js";
import { odieCommands } from "./odie-actions.js";
import { createCampPreview } from "./camp-preview.js";
import { isInsideCabin } from "./cabin.js";
import { createClearingSky } from "./clearing-sky.js";
import { createClearingAudio } from "./clearing-audio.js";
import * as THREE from "./vendor/three.module.min.js";
export function localHour(date = new Date()) {
  return Number.isFinite(date.getTime())
    ? date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
    : 12;
}
export function daylightAt(hour) {
  return THREE.MathUtils.smoothstep(
    Math.sin(((hour - 6) / 24) * Math.PI * 2),
    -0.16,
    0.65,
  );
}
export function createClearingLife({
  scene,
  sun,
  hemi,
  exploration,
  getWorld,
  setSeason,
}) {
  const audio = createClearingAudio();
  const skyWorld = createClearingSky(scene);
  const sweetBite = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.06, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0xd9aa71,
      emissive: 0xd9aa71,
      emissiveIntensity: 0.28,
    }),
  );
  const snack = new THREE.Group();
  snack.add(sweetBite);
  snack.visible = false;
  scene.add(snack);
  const heldStick = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.025, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x795338 }),
  );
  heldStick.position.set(0.22, -0.15, 0);
  heldStick.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0.84, -0.54, 0).normalize(),
  );
  snack.add(heldStick);
  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9ac90 }),
  );
  hand.position.set(0.43, -0.29, 0);
  hand.scale.set(0.8, 1.3, 1);
  snack.add(hand);
  let audioStarted = false;
  let menuPreview = null,
    transition = null,
    nextGreeting = 12,
    greetingIndex = 0,
    voiceAt = 0,
    roastSoundAt = 0;
  let speech = null;
  const speechBubble = document.createElement("div");
  speechBubble.className = "paul-speech";
  speechBubble.hidden = true;
  speechBubble.innerHTML =
    '<span aria-hidden="true"></span><span class="sr-only" role="status" aria-live="polite"></span><button class="speech-skip" aria-label="Show full answer">▸</button>';
  document.body.append(speechBubble);
  const changeOverlay = document.createElement("div");
  changeOverlay.className = "world-changing";
  changeOverlay.hidden = true;
  changeOverlay.setAttribute("role", "status");
  document.body.append(changeOverlay);
  function say(text) {
    speech = { text, at: performance.now(), count: 0 };
    speechBubble.querySelector('[role="status"]').textContent = "";
    speechBubble.children[0].textContent = "";
    speechBubble.hidden = false;
  }
  speechBubble.querySelector("button").onclick = () => {
    if (speech) speech.at = performance.now() - speech.text.length * 32;
  };
  function changing(kind, action) {
    close();
    action();
    exploration.setLocked(true);
    transition = { kind, age: 0 };
    changeOverlay.textContent =
      kind === "time" ? "Changing time…" : "Changing season…";
    changeOverlay.hidden = false;
  }
  function previewSources(kind) {
    const w = getWorld(),
      c = w.userData.cabin;
    return kind === "paul"
      ? [w.userData.picnic]
      : kind === "dog"
        ? [w.userData.dog]
        : kind === "clock"
          ? c.userData.guideClock
          : kind === "calendar"
            ? c.userData.guideCalendar
            : kind === "arcade"
              ? [c.userData.arcade]
              : kind === "computer"
                ? [c.userData.screen]
                : kind === "fish"
                  ? [w.userData.fish]
                  : [c.userData.hearth];
  }
  function showPreview(container, kind) {
    menuPreview?.dispose();
    menuPreview = null;
    menuPreview = createCampPreview(container, previewSources(kind));
  }
  let eatingSound = false,
    boundaryAt = -10;
  let eatingAt = null,
    roastReadyAt = null,
    roastHeat = 0,
    lastApproach = -10,
    previousNearest = null,
    wasFish = false,
    lastFishX = 0,
    visible = true,
    pointerStart = null,
    lastItems = [];
  let timeOverride = null,
    hour = localHour(),
    elapsed = 0,
    nearest = null,
    dialogKind = null,
    focus = null,
    actionAt = -10;
  const ui = document.createElement("div");
  ui.className = "clearing-life";
  ui.hidden = true;
  ui.innerHTML =
    '<span class="game-clock" aria-label="Local scene time"></span><button class="world-action" hidden></button><p class="world-notice" role="status"></p><button class="camp-introduction">Introduction</button>';
  document.body.append(ui);
  const button = ui.querySelector(".world-action"),
    clock = ui.querySelector(".game-clock"),
    notice = ui.querySelector(".world-notice");
  const dialog = document.createElement("dialog");
  dialog.className = "world-dialog";
  document.body.append(dialog);
  const abort = new AbortController(),
    opts = { signal: abort.signal };
  function close() {
    menuPreview?.dispose();
    menuPreview = null;
    getWorld().userData.dogMenu = false;
    speech = null;
    speechBubble.hidden = true;
    document.body.append(speechBubble);
    dialog.classList.remove("conversation-dialog", "guide-dialog");
    if (dialogKind === "arcade") {
      dialog.querySelector("iframe")?.contentWindow?.stopArcadeAudio?.();
      document.body.classList.remove("playing-arcade");
    }
    dialog.close();
    dialog.replaceChildren();
    dialogKind = null;
    dialog.classList.remove("arcade-dialog");
    audio.setVisible(visible && exploration.active && dialogKind !== "arcade");
    if (focus) {
      exploration.camera.position.copy(focus.position);
      exploration.camera.quaternion.copy(focus.rotation);
      focus = null;
    }
    exploration.setLocked(false);
    button.focus({ preventScroll: true });
  }
  dialog.addEventListener(
    "cancel",
    (e) => {
      e.preventDefault();
      close();
    },
    opts,
  );
  function open(kind) {
    menuPreview?.dispose();
    menuPreview = null;
    dialog.classList.remove("conversation-dialog", "guide-dialog");
    dialogKind = kind;
    exploration.setLocked(true);
    if (kind === "arcade") {
      audio.setVisible(false);
      document.body.classList.add("playing-arcade");
      dialog.classList.remove("computer-dialog");
      dialog.classList.add("arcade-dialog");
      dialog.innerHTML =
        '<div class="arcade-bar"><button class="arcade-back">← Back to camp</button><span>Tower Defense</span></div><iframe title="Tower Defense — Kingdom Under Siege" src="tower-defense/index.html" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      dialog.querySelector("button").onclick = close;
      dialog
        .querySelector("iframe")
        .addEventListener(
          "load",
          () => dialog.querySelector("iframe")?.focus(),
          { once: true },
        );
      dialog.showModal();
      return;
    }
    const titles = {
      clock: "Cabin clock",
      calendar: "Cabin calendar",
      computer: "Paul’s computer",
      laptop: "Paul’s laptop",
      radio: "Cabin radio",
      dog: "Odie",
      paul: "Talk to Paul",
      introduction: "Welcome to camp",
      credits: "Credits",
    };
    dialog.innerHTML =
      '<button class="dialog-close" aria-label="Close">×</button><h2></h2><div class="dialog-content"></div>';
    dialog.querySelector("h2").textContent = titles[kind];
    dialog.querySelector("button").onclick = close;
    const content = dialog.querySelector(".dialog-content");
    if (kind === "dog") {
      getWorld().userData.dogMenu = true;
      content.innerHTML = "<p>What shall we do, Odie?</p>";
      for (const name of odieCommands) {
        const b = document.createElement("button");
        b.textContent = name[0].toUpperCase() + name.slice(1);
        b.dataset.dogCommand = name;
        b.onclick = () => {
          close();
          const w = getWorld();
          w.userData.dogCommand = { name, at: elapsed, duration: 5 };
          if (name === "treat") w.userData.treatUntil = elapsed + 5;
          if (name === "speak") audio.event("bark", w.userData.dog.position);
          actionAt = performance.now() / 1000;
          notice.textContent =
            name === "treat" ? "Good boy, Odie!" : "Odie · " + name;
        };
        content.append(b);
      }
    }
    if (kind === "paul") {
      dialog.classList.add("conversation-dialog");
      dialog.append(speechBubble);
      const list = document.createElement("div");
      list.className = "conversation-options";
      content.append(list);
      function choice(label, action) {
        const b = document.createElement("button");
        b.textContent = label;
        b.onclick = action;
        list.append(b);
      }
      function home() {
        list.replaceChildren();
        choice("Why are we here?", () =>
          say(
            "I love nature and mountains. This little camp brings that feeling into my portfolio: a place to slow down, explore, and meet Odie.",
          ),
        );
        choice("Tell me about this world", () =>
          say(
            "We travelled from space into a pixel world because I enjoy pixel games. Everything around us is a Three.js scene. The clock, seasons, shadows and little interactions make it feel alive.",
          ),
        );
        choice("Interview", () => {
          list.replaceChildren();
          for (const [name, questions] of Object.entries(interview))
            choice(name, () => section(name, questions));
          choice("Back", home);
        });
        choice("What can I do here?", () =>
          say(campGreeting(hour, getWorld().userData.season, greetingIndex++)),
        );
      }
      function section(name, questions) {
        list.replaceChildren();
        for (const [question, answer] of questions)
          choice(question, () => say(answer));
        choice("Interview topics", () => {
          list.replaceChildren();
          for (const [label, items] of Object.entries(interview))
            choice(label, () => section(label, items));
          choice("Back", home);
        });
      }
      home();
      say(
        "Hi! I’m Paul. Make yourself at home. What would you like to talk about?",
      );
    }
    if (kind === "introduction") {
      dialog.classList.add("guide-dialog");
      content.innerHTML =
        '<div class="guide-tabs"></div><div class="guide-detail"><div class="guide-object"></div><div><h3></h3><p></p></div></div>';
      const tabs = content.querySelector(".guide-tabs");
      const select = (entry) => {
        content.querySelector("h3").textContent = entry.title;
        content.querySelector(".guide-detail p").textContent = entry.text;
        for (const b of tabs.children)
          b.setAttribute("aria-pressed", String(b.dataset.guide === entry.id));
        showPreview(content.querySelector(".guide-object"), entry.id);
      };
      for (const entry of guide) {
        const b = document.createElement("button");
        b.textContent = entry.title;
        b.dataset.guide = entry.id;
        b.onclick = () => select(entry);
        tabs.append(b);
      }
      select(guide[0]);
    }
    if (kind === "credits") {
      content.innerHTML =
        '<iframe class="credits-frame" title="Asset credits" src="credits.html"></iframe>';
    }
    if (kind === "clock") {
      content.innerHTML = "<p>Choose a time, or follow your local clock.</p>";
      for (const [name, h] of [
        ["Morning", 8],
        ["Afternoon", 12],
        ["Evening", 18],
        ["Night", 23],
        ["Restore current time", null],
      ]) {
        const b = document.createElement("button");
        b.textContent = name;
        b.onclick = () => {
          changing("time", () => {
            timeOverride =
              h === null ? null : { hour: h, at: performance.now() };
          });
        };
        content.append(b);
      }
    }
    if (kind === "calendar") {
      content.innerHTML = "<p>Let the clearing change with the season.</p>";
      for (const name of ["spring", "summer", "autumn", "winter", "auto"]) {
        const b = document.createElement("button");
        b.textContent = name === "auto" ? "Restore current season" : name;
        b.onclick = () => {
          changing("season", () => setSeason(name));
        };
        content.append(b);
      }
    }
    if (kind === "radio") {
      content.innerHTML =
        "<p>Gentle music from the radio. World sounds stay on when the music is off.</p>";
      const b = document.createElement("button");
      b.textContent =
        audio.music && audio.enabled ? "Turn music off" : "Turn music on";
      b.onclick = () => {
        audio.setMusic(!(audio.music && audio.enabled));
        close();
      };
      content.append(b);
    }
    if (kind === "computer") {
      dialog.classList.add("computer-dialog");
      const menu = document.createElement("div");
      menu.setAttribute("role", "navigation");
      menu.setAttribute("aria-label", "Computer links");
      menu.className = "computer-links";
      const resume = document.createElement("button");
      resume.textContent = "Résumé";
      const screen = document.createElement("div");
      screen.className = "computer-screen";
      screen.innerHTML = "<p>Welcome. Choose a link or open my résumé.</p>";
      resume.onclick = () => {
        screen.innerHTML =
          '<iframe title="Paul Nohtiev résumé" src="resume-view.html"></iframe>';
        audio.event("click");
      };
      menu.append(resume);
      const existing = [
        ...document.querySelectorAll("#contact-copy a[href]"),
      ].filter((a) => !a.hidden);
      const links = existing.length
        ? existing.map((a) => [a.textContent.trim(), a.getAttribute("href")])
        : [
            ["Gmail", "mailto:nogtevpasha97@gmail.com"],
            ["LinkedIn", "https://www.linkedin.com/in/paul-nohtiev-b61626130/"],
            ["Cover letter", "images/Docs/Cover_Letter_(Paul_Nohtiev).pdf"],
            ["Instagram", "https://www.instagram.com/pablo_de_santa/?hl=en"],
            [
              "Facebook",
              "https://www.facebook.com/profile.php?id=100008044125192",
            ],
            ["Credits", "credits.html"],
          ];
      for (const [name, href] of links) {
        const a = document.createElement("a");
        a.textContent = name;
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
        if (href === "credits.html")
          a.onclick = (e) => {
            e.preventDefault();
            open("credits");
          };
        menu.append(a);
      }
      content.append(menu, screen);
    } else dialog.classList.remove("computer-dialog");
    if (kind === "laptop") {
      content.innerHTML = `<p>Building this little world…</p><pre class="laptop-code">const camp = new World();

camp.add(forest, cabin, odie);
camp.on("visit", sayHello);

buildSomethingUnique();</pre><p>My résumé and links are on the computer inside the cabin.</p>`;
    }
    if (kind === "clock" || kind === "calendar") {
      const preview = document.createElement("div");
      preview.className = "menu-object";
      content.prepend(preview);
      showPreview(preview, kind);
    }
    dialog.showModal();
  }
  function nearRoast(p) {
    return Math.hypot(p.x - 4.1, p.z - 2.8) < 2.6;
  }
  function act() {
    if (
      !exploration.active ||
      exploration.transitioning ||
      !nearest ||
      eatingAt !== null ||
      dialogKind ||
      transition ||
      performance.now() / 1000 - actionAt < 0.4
    )
      return;
    actionAt = performance.now() / 1000;
    const w = getWorld(),
      kind = nearest.id;
    if (
      [
        "clock",
        "calendar",
        "computer",
        "radio",
        "cabin-light",
        "hearth",
        "arcade",
      ].includes(kind) &&
      !isInsideCabin(exploration.camera.position)
    )
      return;
    audio.event(kind === "door" ? "door" : "click", nearest);
    if (kind === "drink") {
      notice.textContent =
        "A warm cup of " + w.userData.drinkName.toLowerCase() + ".";
      return;
    }
    if (kind === "cabin-light" || kind === "hearth") {
      const data = w.userData.cabin.userData;
      if (kind === "cabin-light") {
        data.lightOn = !data.lightOn;
        notice.textContent = data.lightOn
          ? "Cabin light on."
          : "Cabin light off.";
      } else {
        data.fireOn = !data.fireOn;
        notice.textContent = data.fireOn
          ? "The fireplace is lit."
          : "The fireplace is out.";
      }
      return;
    }
    if (kind === "door") {
      const c = w.userData.cabin;
      if (
        c.userData.doorOpen &&
        Math.abs(exploration.camera.position.z + 3.31) < 0.6
      ) {
        notice.textContent = "Step clear of the doorway first.";
        return;
      }
      c.userData.doorOpen = !c.userData.doorOpen;
      return;
    }
    if (["arcade", "dog", "paul"].includes(kind)) {
      open(kind);
      return;
    }
    if (kind === "computer" || kind === "laptop") {
      exploration.setLocked(true);
      focus = {
        position: exploration.camera.position.clone(),
        rotation: exploration.camera.quaternion.clone(),
        kind,
        destination:
          kind === "laptop"
            ? new THREE.Vector3(1.6, 0.95, 0.5)
            : new THREE.Vector3(5.8, 1.96, -5.4),
        target:
          kind === "laptop"
            ? new THREE.Vector3(1.6, 0.7, 1.222)
            : new THREE.Vector3(5.8, 1.96, -6.645),
        via: kind === "laptop" ? new THREE.Vector3(2.7, 1.25, 1.15) : null,
        t: 0,
      };
      dialogKind = "focusing";
      return;
    }
    if (kind === "clock" || kind === "calendar" || kind === "radio") {
      open(kind);
      return;
    }
    if (kind === "fire") {
      if (roastReadyAt !== null) {
        if (roastHeat >= 12) {
          w.userData.roastUntil = 0;
          roastReadyAt = null;
          roastHeat = 0;
          snack.visible = false;
          notice.textContent = "That one burned. Let’s toast a fresh one.";
          return;
        }
        if (roastHeat < 6) {
          notice.textContent = "Let it toast a little longer…";
          return;
        }
        w.userData.roastUntil = 0;
        roastReadyAt = null;
        roastHeat = 0;
        eatingAt = performance.now();
        eatingSound = false;
        notice.textContent = "Warm and toasted. Yum!";
      } else {
        w.userData.roastStart = elapsed;
        w.userData.roastUntil = elapsed + 3600;
        roastReadyAt = true;
        roastHeat = 0;
        notice.textContent = "Toasting a marshmallow…";
      }
    }
    if (kind === "fish") {
      if (w.userData.season === "winter") {
        notice.textContent = "The fish are resting beneath the ice.";
        return;
      }
      audio.event("feed", { x: -2, z: 4.5 });
      w.userData.feedOrigin = exploration.camera.position
        .clone()
        .add(new THREE.Vector3(0, -0.35, 0));
      const a = Math.atan2(
        (w.userData.feedOrigin.z - 4.5) / 3.3,
        (w.userData.feedOrigin.x + 7) / 5.3,
      );
      w.userData.feedTarget = new THREE.Vector3(
        -7 + Math.cos(a) * 3.8,
        0.09,
        4.5 + Math.sin(a) * 2.2,
      );
      w.userData.feedStart = elapsed;
      w.userData.feedUntil = elapsed + 5;
      notice.textContent = "A little food for the fish.";
    }
  }
  button.addEventListener("click", act, opts);
  ui.querySelector(".camp-introduction").onclick = () => {
    if (!transition && !exploration.transitioning) open("introduction");
  };
  let hoverTarget = null,
    hoverAt = 0;
  document.addEventListener(
    "pointerover",
    (e) => {
      const target = e.target.closest?.("button,a");
      if (
        !exploration.active ||
        dialogKind === "arcade" ||
        !target ||
        target === hoverTarget
      )
        return;
      hoverTarget = target;
      if (performance.now() - hoverAt > 90) {
        audio.event("hover");
        hoverAt = performance.now();
      }
    },
    opts,
  );
  document.addEventListener(
    "click",
    (e) => {
      if (
        exploration.active &&
        dialogKind !== "arcade" &&
        e.target.closest?.("button,a")
      )
        audio.event("click");
      const link = e.target.closest?.('a[href="credits.html"]');
      if (link && exploration.active) {
        e.preventDefault();
        open("credits");
      }
    },
    opts,
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "KeyE" && exploration.active && !dialogKind) {
        e.preventDefault();
        act();
      }
    },
    opts,
  );
  // A short click/tap on a nearby object also activates it; dragging still looks around.
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target.tagName === "CANVAS")
        pointerStart = { x: e.clientX, y: e.clientY };
    },
    opts,
  );
  window.addEventListener(
    "pointerup",
    (e) => {
      if (!exploration.active || dialogKind || transition || !pointerStart)
        return;
      const start = pointerStart;
      pointerStart = null;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          (e.clientX / innerWidth) * 2 - 1,
          1 - (e.clientY / innerHeight) * 2,
        ),
        exploration.camera,
      );
      const pos = exploration.camera.position;
      const hit = lastItems
        .filter(
          (i) =>
            Math.hypot(i.x - pos.x, i.z - pos.z) < i.range &&
            ray.ray.distanceToPoint(new THREE.Vector3(i.x, i.y ?? 1, i.z)) <
              0.55,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - pos.x, a.z - pos.z) -
            Math.hypot(b.x - pos.x, b.z - pos.z),
        )[0];
      if (hit) {
        nearest = hit;
        act();
      }
    },
    opts,
  );
  const sky = new THREE.Color(),
    warm = new THREE.Color(),
    night = new THREE.Color(0x111e37);
  return {
    get arcadeActive() {
      return dialogKind === "arcade";
    },
    notifyBoundary() {
      const now = performance.now() / 1000;
      if (now - boundaryAt < 3) return;
      boundaryAt = now;
      actionAt = now;
      notice.textContent = "I don’t want to leave the camp yet.";
    },
    setVisible(value) {
      visible = value;
      audio.setVisible(value && exploration.active && dialogKind !== "arcade");
    },
    setExploring(active) {
      audio.setVisible(visible && active && dialogKind !== "arcade");
      if (active && !audioStarted) {
        audioStarted = true;
        audio.start();
      }
      if (!active) {
        if (dialogKind) close();
        transition = null;
        changeOverlay.hidden = true;
        speech = null;
        speechBubble.hidden = true;
        eatingAt = null;
        roastReadyAt = null;
        roastHeat = 0;
        getWorld().userData.roastUntil = 0;
        snack.visible = false;
      }
    },
    update(dt, t) {
      elapsed = t;
      const world = getWorld();
      ui.hidden = !exploration.active || exploration.transitioning;
      const player = exploration.camera.position;
      if (exploration.transitioning) speechBubble.hidden = true;
      menuPreview?.update(dt);
      if (speech && exploration.active && !exploration.transitioning) {
        const count = Math.min(
          speech.text.length,
          Math.floor((performance.now() - speech.at) / 32),
        );
        if (count !== speech.count) {
          speechBubble.children[0].textContent = speech.text.slice(0, count);
          if (
            performance.now() - voiceAt > 85 &&
            /\S/.test(speech.text[count - 1] || "")
          ) {
            audio.event("voice", { x: 1.5, z: -0.6 });
            voiceAt = performance.now();
          }
          speech.count = count;
          if (count === speech.text.length)
            speechBubble.querySelector('[role="status"]').textContent =
              speech.text;
        }
        const point = new THREE.Vector3(1.5, 2, -0.35).project(
          exploration.camera,
        );
        speechBubble.hidden =
          point.z > 1 ||
          point.z < -1 ||
          Math.abs(point.x) > 1.15 ||
          Math.abs(point.y) > 1.15;
        const width = Math.min(380, innerWidth - 32);
        const anchorX = (point.x * 0.5 + 0.5) * innerWidth,
          anchorY = (-point.y * 0.5 + 0.5) * innerHeight;
        const beside = innerWidth > 700;
        speechBubble.dataset.side = beside
          ? anchorX + width + 65 < innerWidth
            ? "right"
            : "left"
          : "above";
        const left = beside
          ? speechBubble.dataset.side === "right"
            ? anchorX + 55
            : anchorX - width - 55
          : anchorX - width / 2;
        speechBubble.style.left =
          Math.max(16, Math.min(innerWidth - width - 16, left)) + "px";
        speechBubble.style.top =
          Math.max(
            72,
            Math.min(innerHeight * 0.43, anchorY - (beside ? 70 : 190)),
          ) + "px";
        if (
          !dialogKind &&
          performance.now() - speech.at > speech.text.length * 32 + 6500
        ) {
          speech = null;
          speechBubble.hidden = true;
        }
      }
      if (
        exploration.active &&
        !dialogKind &&
        !transition &&
        !speech &&
        t > nextGreeting &&
        Math.hypot(player.x - 1.5, player.z + 0.6) < 5 &&
        !isInsideCabin(player)
      ) {
        say(campGreeting(hour, world.userData.season, greetingIndex++));
        nextGreeting = t + 50;
      }
      if (roastReadyAt !== null && nearRoast(player) && t > roastSoundAt) {
        audio.event("toast", { x: 4.1, z: 2.8 });
        roastSoundAt = t + 0.7;
      }

      const nearFire =
        exploration.active &&
        !exploration.transitioning &&
        Math.hypot(player.x - 4.1, player.z - 2.8) < 2.6;
      if (roastReadyAt !== null)
        roastHeat = nearFire
          ? Math.min(14, roastHeat + dt)
          : roastHeat >= 6
            ? roastHeat
            : 0;
      world.userData.roastHeat = roastHeat;
      world.userData.roastNear = nearFire;
      if (roastReadyAt !== null) {
        snack.visible = !nearFire;
        snack.scale.setScalar(1);
        sweetBite.material.color.set(0xffecd0);
        snack.position
          .set(0.3, -0.25, -0.65)
          .applyQuaternion(exploration.camera.quaternion)
          .add(player);
        snack.quaternion.copy(exploration.camera.quaternion);
      }
      audio.setVisible(
        visible && exploration.active && dialogKind !== "arcade",
      );
      const ear = exploration.active
        ? exploration.camera.position
        : { x: 1, z: 4 };
      const direction = exploration.active
        ? new THREE.Vector3(0, 0, -1).applyQuaternion(
            exploration.camera.quaternion,
          )
        : { x: 0, z: -1 };
      audio.update({
        position: ear,
        direction,
        season: world.userData.season,
        inside: isInsideCabin(ear),
        hearthOn: world.userData.cabin.userData.fireOn,
      });
      if (
        wasFish &&
        (!world.userData.fish.visible ||
          world.userData.fish.position.x < lastFishX - 0.5) &&
        world.userData.season !== "winter"
      )
        audio.event("splash", { x: -7, z: 4.6 });
      wasFish = world.userData.fish.visible;
      lastFishX = world.userData.fish.position.x;
      if (eatingAt !== null) {
        const u = Math.min(1, (performance.now() - eatingAt) / 1700);
        sweetBite.material.color.set(0xd9aa71);
        snack.visible = u < 1 && !exploration.exiting;
        const approach =
          THREE.MathUtils.smoothstep(u, 0, 0.4) *
          (1 - THREE.MathUtils.smoothstep(u, 0.7, 1));
        // Keep the item at the lower edge at a constant distance: bringing it
        // toward the lens made it fill the view. Scale to the camera frustum.
        const distance = 0.75;
        const halfHeight =
          distance *
          Math.tan(THREE.MathUtils.degToRad(exploration.camera.fov / 2));
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const biteBob = reduced ? 0 : Math.sin(u * Math.PI * 8) * approach;
        snack.position.set(
          halfHeight * exploration.camera.aspect * 0.12 +
            halfHeight * biteBob * 0.025,
          halfHeight * (-1.12 + 0.34 * approach + Math.abs(biteBob) * 0.045),
          -distance,
        );
        exploration.camera.updateMatrixWorld();
        snack.position.applyMatrix4(exploration.camera.matrixWorld);
        snack.quaternion.copy(exploration.camera.quaternion);
        snack.rotateZ(biteBob * 0.025);

        snack.scale.setScalar(
          halfHeight * 1.5 * Math.min(1, exploration.camera.aspect),
        );
        sweetBite.visible = u < 0.66;
        sweetBite.scale.setScalar(u > 0.43 ? 0.55 : 1);
        if (u > 0.4 && !eatingSound) {
          audio.event("eat");
          eatingSound = true;
        }
        if (u === 1) {
          eatingAt = null;
          sweetBite.visible = true;
          sweetBite.scale.setScalar(1);
        }
      }

      if (!exploration.active && dialogKind) close();
      const target = timeOverride
        ? (timeOverride.hour +
            (performance.now() - timeOverride.at) / 3600000) %
          24
        : localHour();
      const delta = ((target - hour + 36) % 24) - 12;
      hour = (hour + delta * (1 - Math.exp(-dt * 0.75)) + 24) % 24;
      const light = daylightAt(hour),
        dusk = 1 - Math.min(1, Math.abs(light - 0.45) * 2);
      sky.copy(night).lerp(new THREE.Color(world.userData.palette.sky), light);
      scene.background.lerp(sky, 1 - Math.exp(-dt * 0.8));
      scene.fog.color.copy(scene.background);
      hemi.intensity = 0.25 + light * 1.85;
      sun.intensity = 0.32 + light * 3.1;
      warm.set(0xffbe88).lerp(new THREE.Color(0xffe4bd), 1 - dusk);
      sun.color.copy(warm).lerp(new THREE.Color(0xaac7ed), 1 - light);
      sun.position.set(
        Math.cos(((hour - 6) / 24) * Math.PI * 2) * 22,
        9 + light * 20,
        10,
      );
      skyWorld.update(t, light, sun.position);
      world.userData.daylight = light;
      if (transition) {
        transition.age += dt;
        if (
          (transition.kind === "season" && transition.age >= 3.3) ||
          (transition.kind === "time" && Math.abs(delta) < 0.06)
        ) {
          transition = null;
          changeOverlay.hidden = true;
          exploration.setLocked(false);
        }
      }
      world.userData.cabin.userData.update(dt, hour);
      world.userData.exploring =
        exploration.active && !exploration.transitioning;
      clock.textContent =
        String(Math.floor(hour)).padStart(2, "0") +
        ":" +
        String(Math.floor((hour % 1) * 60)).padStart(2, "0");
      ui.dataset.hour = hour.toFixed(3);
      if (performance.now() / 1000 - actionAt > 7) notice.textContent = "";
      if (focus && dialogKind === "focusing") {
        focus.t += dt;
        const duration = focus.via ? 2 : 1.2;
        const u = THREE.MathUtils.smoothstep(focus.t, 0, duration);
        exploration.camera.position.lerpVectors(
          focus.position,
          focus.destination,
          u,
        );
        if (focus.via) {
          const halfway = focus.t < 1;
          exploration.camera.position.lerpVectors(
            halfway ? focus.position : focus.via,
            halfway ? focus.via : focus.destination,
            THREE.MathUtils.smoothstep(
              focus.t,
              halfway ? 0 : 1,
              halfway ? 1 : 2,
            ),
          );
        }
        const end = new THREE.PerspectiveCamera();
        end.position.copy(focus.destination);
        end.lookAt(focus.target);
        exploration.camera.quaternion.slerpQuaternions(
          focus.rotation,
          end.quaternion,
          u,
        );
        if (u === 1) open(focus.kind);
      }
      if (
        !exploration.active ||
        exploration.transitioning ||
        dialogKind ||
        transition ||
        eatingAt !== null
      ) {
        button.hidden = true;
        return;
      }
      const pos = exploration.camera.position,
        dog = world.userData.dog.position;
      const items = [
        {
          id: "paul",
          x: 1.5,
          y: 1.8,
          z: -0.6,
          label: "Talk to Paul",
          range: 3,
        },
        {
          id: "drink",
          x: 0.4,
          y: 0.3,
          z: 1.2,
          label: world.userData.drinkName,
          range: 1.7,
        },
        {
          id: "laptop",
          x: 1.6,
          y: 0.7,
          z: 1.26,
          label: "See Paul’s work",
          range: 2,
        },
        {
          id: "door",
          x: 5.8,
          z: -3.31,
          label: world.userData.cabin.userData.doorOpen
            ? "Close cabin door"
            : "Open cabin door",
          range: 2.1,
        },
        {
          id: "fire",
          x: 4.1,
          z: 2.8,
          label:
            roastReadyAt === null
              ? "Toast a marshmallow"
              : roastHeat >= 12
                ? "Discard burnt marshmallow"
                : roastHeat < 6
                  ? "Marshmallow toasting…"
                  : "Eat marshmallow",
          range: 2.6,
        },
        {
          id: "fish",
          x:
            -7 +
            5.4 * Math.cos(Math.atan2((pos.z - 4.5) / 3.3, (pos.x + 7) / 5.3)),
          z:
            4.5 +
            3.4 * Math.sin(Math.atan2((pos.z - 4.5) / 3.3, (pos.x + 7) / 5.3)),
          label: "Feed the fish",
          range: 2.3,
        },
        {
          id: "dog",
          x: dog.x,
          z: dog.z,
          label: "Interact with Odie",
          range: 2.2,
        },
      ];
      if (isInsideCabin(pos))
        items.push(
          {
            id: "cabin-light",
            x: 6.75,
            y: 1.9,
            z: -3.54,
            label: world.userData.cabin.userData.lightOn
              ? "Turn cabin light off"
              : "Turn cabin light on",
            range: 1.8,
          },
          {
            id: "arcade",
            x: 4.38,
            y: 2.05,
            z: -4.15,
            label: "Play Tower Defense",
            range: 1.8,
          },
          {
            id: "hearth",
            x: 7.2,
            y: 1.15,
            z: -6.2,
            label: world.userData.cabin.userData.fireOn
              ? "Put out fireplace"
              : "Light fireplace",
            range: 2,
          },
          {
            id: "radio",
            x: 7.4,
            y: 1.29,
            z: -4.01,
            label: "Use radio",
            range: 2,
          },
          {
            id: "computer",
            x: 5.8,
            z: -6.5,
            y: 1.96,
            label: "Use computer · résumé",
            range: 2,
          },
          {
            id: "clock",
            x: 6.95,
            y: 2.83,
            z: -7.1,
            label: "Set the clock",
            range: 2.8,
          },
          {
            id: "calendar",
            x: 4.7,
            y: 2.61,
            z: -7.1,
            label: "Choose a season",
            range: 2.8,
          },
        );
      lastItems = items;
      // Aim toward an object to choose it when several are nearby.
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        exploration.camera.quaternion,
      );
      const candidates = items
        .map((i) => {
          const d = Math.hypot(i.x - pos.x, i.z - pos.z);
          const dy = (i.y ?? 1) - pos.y;
          const facing =
            ((i.x - pos.x) * forward.x +
              dy * forward.y +
              (i.z - pos.z) * forward.z) /
            Math.max(0.01, Math.hypot(d, dy));
          return { ...i, d, score: d * 0.15 + (1 - facing) * 4, facing };
        })
        .filter((i) => i.d < i.range && i.facing > -0.2)
        .sort((a, b) => a.score - b.score);
      nearest = candidates[0];
      if (
        nearest?.id !== previousNearest &&
        nearest &&
        performance.now() / 1000 - lastApproach > 1.5
      ) {
        audio.event("approach", nearest);
        lastApproach = performance.now() / 1000;
      }
      previousNearest = nearest?.id;
      button.hidden = !nearest;
      if (nearest) {
        button.textContent = nearest.label + " · E";
        button.dataset.action = nearest.id;
      }
    },
    dispose() {
      abort.abort();
      menuPreview?.dispose();
      speechBubble.remove();
      changeOverlay.remove();
      if (dialogKind === "arcade") close();
      audio.dispose();
      skyWorld.dispose();
      snack.removeFromParent();
      hand.geometry.dispose();
      hand.material.dispose();
      heldStick.geometry.dispose();
      heldStick.material.dispose();
      sweetBite.geometry.dispose();
      sweetBite.material.dispose();
      ui.remove();
      dialog.remove();
    },
  };
}
// Materials crossfade while both seasonal scenes coexist, then old resources are released.
export function fadeWorld(world, amount) {
  const seen = new Set();
  world.traverse((o) => {
    if (o.isLight) {
      if (o.userData.baseIntensity === undefined)
        o.userData.baseIntensity = o.intensity;
      o.intensity = o.userData.baseIntensity * amount;
    }
    for (const m of o.material
      ? Array.isArray(o.material)
        ? o.material
        : [o.material]
      : []) {
      if (seen.has(m)) continue;
      seen.add(m);
      if (m.userData.baseOpacity === undefined) {
        m.userData.baseOpacity = m.opacity;
        m.userData.baseTransparent = m.transparent;
      }
      m.transparent = amount < 1 || m.userData.baseTransparent;
      m.opacity = m.userData.baseOpacity * amount;
    }
  });
}
