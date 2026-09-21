// Original synthesized music/ambience, plus the credited CC0 real-dog recording.
export function soundMix(listener, source, right = { x: 1, z: 0 }, radius = 5) {
  const dx = source.x - listener.x,
    dz = source.z - listener.z,
    d = Math.hypot(dx, dz);
  return {
    gain: 1 / (1 + (d / radius) ** 2),
    pan: Math.max(
      -0.85,
      Math.min(0.85, (dx * right.x + dz * right.z) / Math.max(1, d)),
    ),
  };
}
export const seasonalSound = {
  winter: { wind: 0.075, leaves: 0.008, insects: 0, birds: 22 },
  spring: { wind: 0.035, leaves: 0.025, insects: 0.004, birds: 7 },
  summer: { wind: 0.025, leaves: 0.035, insects: 0.009, birds: 12 },
  autumn: { wind: 0.055, leaves: 0.06, insects: 0, birds: 17 },
};
export function createClearingAudio() {
  let ctx,
    master,
    musicBus,
    worldBus,
    noiseBuffer,
    barkBuffer,
    effectsBus,
    enabled = false,
    music = true,
    visible = false,
    disposed = false;
  let listener = { x: 1, z: 4 },
    right = { x: 1, z: 0 },
    nextNote = 0,
    noteIndex = 0,
    nextBird = 0,
    nextCrackle = 0,
    nextGust = 0,
    gust = 0.5,
    season = "autumn",
    inside = false;
  const loops = {},
    stats = { events: 0, notes: 0 };
  const ui = document.createElement("div");
  ui.className = "sound-controls";
  ui.hidden = true;
  ui.innerHTML =
    '<button class="sound-toggle" type="button">Unmute</button><button class="music-toggle" type="button" hidden>Music on</button>';
  document.body.append(ui);
  const soundButton = ui.children[0],
    musicButton = ui.children[1];
  function labels() {
    soundButton.textContent = enabled ? "Mute all" : "Unmute";
    soundButton.setAttribute("aria-pressed", String(enabled));
    musicButton.hidden = !enabled;
    musicButton.textContent = music ? "Music on" : "Music off";
    musicButton.setAttribute("aria-pressed", String(music));
    ui.dataset.enabled = String(enabled);
    ui.dataset.music = String(music);
  }
  function gain(value, destination) {
    const n = ctx.createGain();
    n.gain.value = value;
    n.connect(destination);
    return n;
  }
  function spatial(destination, source, radius = 5) {
    const p = ctx.createStereoPanner(),
      g = gain(1, p);
    p.connect(destination);
    const m = soundMix(listener, source, right, radius);
    g.gain.value = m.gain;
    p.pan.value = m.pan;
    return { g, p };
  }
  function loop(name, type, freq) {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const p = ctx.createStereoPanner(),
      g = gain(0, p);
    source.connect(filter);
    filter.connect(g);
    p.connect(worldBus);
    source.start();
    loops[name] = { source, filter, g, p };
  }
  async function start() {
    if (disposed) return;
    try {
      if (!ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) {
          soundButton.textContent = "Sound unavailable";
          return;
        }
        ctx = new Audio();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.ratio.value = 5;
        compressor.connect(ctx.destination);
        master = gain(0, compressor);
        worldBus = gain(0.45, master);
        musicBus = gain(1.4, master);
        effectsBus = gain(1.4, master);
        fetch("assets/audio/odie-bark.wav")
          .then((r) => {
            if (!r.ok) throw Error("Bark unavailable");
            return r.arrayBuffer();
          })
          .then((b) => ctx.decodeAudioData(b))
          .then((b) => {
            barkBuffer = b;
            ui.dataset.bark = "ready";
          })
          .catch(() => {
            ui.dataset.bark = "unavailable";
          });
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          last = (last + Math.random() * 2 - 1) * 0.5;
          data[i] = last;
        }
        loop("wind", "lowpass", 550);
        loop("leaves", "highpass", 1700);
        loop("fire", "bandpass", 950);
        loop("insects", "bandpass", 4300);
        nextNote = ctx.currentTime;
        nextBird = ctx.currentTime + 4;
        nextCrackle = ctx.currentTime + 0.5;
      }
      enabled = true;
      await ctx.resume();
      labels();
      sync();
    } catch {
      soundButton.textContent = "Try enabling sound";
    }
  }
  function sync() {
    if (!ctx) return;
    const audible = enabled && visible && !document.hidden;
    master.gain.setTargetAtTime(audible ? 0.5 : 0, ctx.currentTime, 0.18);
    musicBus.gain.setTargetAtTime(music ? 1.4 : 0, ctx.currentTime, 0.4);
    if (!audible) {
      ctx.suspend().catch(() => {});
    } else if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }
  soundButton.onclick = () => {
    if (!enabled) start();
    else {
      enabled = false;
      labels();
      sync();
    }
  };
  function setMusic(value) {
    music = value;
    if (!enabled) start();
    labels();
    sync();
  }
  musicButton.onclick = () => setMusic(!music);
  const onVisibility = () => sync();
  document.addEventListener("visibilitychange", onVisibility);
  // Each short voice disconnects after its envelope; continuous beds are reused.
  function tone(
    freq,
    duration,
    volume,
    source,
    bus = worldBus,
    delay = 0,
    type = "sine",
    endFreq = freq,
  ) {
    if (!ctx || !enabled || !visible || ctx.state !== "running") return;
    const t = ctx.currentTime + delay,
      { g, p } = spatial(bus, source, bus === musicBus ? 24 : 8),
      env = gain(0, g),
      o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      t + duration,
    );
    o.connect(env);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volume, t + 0.025);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.start(t);
    o.stop(t + duration + 0.03);
    o.onended = () => {
      o.disconnect();
      env.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }
  function burst(
    source,
    duration = 0.13,
    volume = 0.2,
    freq = 1600,
    delay = 0,
    bus = worldBus,
  ) {
    if (!ctx || !enabled || !visible || ctx.state !== "running") return;
    const t = ctx.currentTime + delay,
      { g, p } = spatial(bus, source),
      env = gain(0, g),
      filter = ctx.createBiquadFilter(),
      n = ctx.createBufferSource();
    n.buffer = noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 0.7;
    n.connect(filter);
    filter.connect(env);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(volume, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    n.start(t, Math.random());
    n.stop(t + duration + 0.02);
    n.onended = () => {
      n.disconnect();
      filter.disconnect();
      env.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }
  function event(kind, source = listener) {
    if (!enabled) return;
    stats.events++;
    if (kind === "approach") {
      tone(660, 0.13, 0.025, source);
      return;
    }
    if (kind === "splash") {
      burst(source, 0.38, 0.22, 1800, 0, effectsBus);
      tone(240, 0.17, 0.08, source, effectsBus, 0, "sine", 90);
      return;
    }
    if (kind === "bark") {
      if (barkBuffer && ctx?.state === "running" && visible) {
        const n = ctx.createBufferSource(),
          { g, p } = spatial(effectsBus, source, 8);
        n.buffer = barkBuffer;
        const level = gain(0.36, g);
        n.connect(level);
        n.start();
        n.onended = () => {
          n.disconnect();
          level.disconnect();
          g.disconnect();
          p.disconnect();
        };
      }
      return;
    }
    if (kind === "voice") {
      const pitch = 260 + Math.random() * 270;
      tone(pitch, 0.07, 0.038, source, effectsBus, 0, "triangle", pitch * 1.35);
      tone(
        pitch * 1.7,
        0.045,
        0.015,
        source,
        effectsBus,
        0.015,
        "sine",
        pitch * 0.9,
      );
      return;
    }
    if (kind === "hover") {
      tone(680, 0.045, 0.035, source, effectsBus, 0, "sine", 800);
      return;
    }
    if (kind === "toast") {
      burst(source, 0.28, 0.1, 2200, 0, effectsBus);
      return;
    }
    if (kind === "eat") {
      for (const d of [0, 0.16, 0.32])
        burst(source, 0.1, 0.15, 900, d, effectsBus);
      return;
    }
    if (kind === "door") {
      burst(source, 0.22, 0.15, 430, 0, effectsBus);
      tone(170, 0.18, 0.075, source, effectsBus, 0, "triangle", 110);
      return;
    }
    if (kind === "click") {
      tone(840, 0.07, 0.065, source, effectsBus, 0, "triangle", 520);
      return;
    }
    if (kind === "feed") {
      burst(source, 0.13, 0.09, 2000, 0, effectsBus);
      return;
    }
    tone(440, 0.22, 0.035, source);
  }
  const notes = [
    60, 67, 64, 72, 69, 64, 62, 67, 59, 66, 62, 71, 67, 62, 57, 64, 60, 69, 65,
    60, 55, 62, 59, 67,
  ];
  return {
    start,
    event,
    setMusic,
    get music() {
      return music;
    },
    get enabled() {
      return enabled;
    },
    setVisible(value) {
      if (visible !== value) {
        visible = value;
        ui.hidden = !value;
        sync();
      }
    },
    update({
      position,
      direction,
      season: nextSeason,
      inside: inCabin = false,
      hearthOn = true,
    }) {
      listener = position;
      right = { x: -direction.z, z: direction.x };
      season = nextSeason;
      inside = inCabin;
      if (
        !ctx ||
        !enabled ||
        !visible ||
        document.hidden ||
        ctx.state !== "running"
      )
        return;
      const now = ctx.currentTime,
        preset = seasonalSound[season] || seasonalSound.autumn;
      if (now > nextGust) {
        nextGust = now + 2 + Math.random() * 7;
        gust = 0.2 + Math.random() * 0.8;
      }
      for (const name of ["wind", "leaves", "insects"])
        loops[name].g.gain.setTargetAtTime(
          preset[name] *
            (inside ? 0.22 : 1) *
            gust *
            (0.7 + Math.sin(now * (name === "wind" ? 0.19 : 0.37)) * 0.2),
          now,
          0.8,
        );
      const fireSource = inside ? { x: 7.2, z: -6.2 } : { x: 4.1, z: 2.8 };
      const fire = soundMix(listener, fireSource, right, 3.5);
      if (inside && !hearthOn) fire.gain = 0;
      loops.fire.g.gain.setTargetAtTime(fire.gain * 0.28, now, 0.2);
      loops.fire.p.pan.setTargetAtTime(fire.pan, now, 0.2);
      if (now > nextCrackle && (!inside || hearthOn)) {
        nextCrackle = now + 0.25 + Math.random() * 0.7;
        burst(
          fireSource,
          0.035 + Math.random() * 0.055,
          0.22,
          900 + Math.random() * 1400,
        );
      }
      if (now > nextBird) {
        nextBird = now + preset.birds * (0.5 + Math.random() * 1.8);
        const pos = { x: -9 + Math.random() * 18, z: -9 };
        tone(
          1500 + Math.random() * 900,
          0.12 + Math.random() * 0.15,
          0.025,
          pos,
          worldBus,
          0,
          "sine",
          2600,
        );
        tone(
          1900 + Math.random() * 900,
          0.18 + Math.random() * 0.2,
          0.018,
          pos,
          worldBus,
          0.25,
          "sine",
          1600,
        );
      }
      if (now > nextNote) {
        nextNote = now + 2.4 + (noteIndex % 4 === 3 ? 2 : 0);
        if (music) {
          const midi = notes[noteIndex++ % notes.length],
            freq = 440 * 2 ** ((midi - 69) / 12),
            radio = { x: 7.4, z: -4.01 };
          tone(freq, 4.8, 0.1, radio, musicBus, 0, "triangle");
          tone(freq / 2, 5.2, 0.055, radio, musicBus, 0.08);
          stats.notes++;
        }
      }
      ui.dataset.state = ctx.state;
      ui.dataset.events = stats.events;
      ui.dataset.notes = stats.notes;
      ui.dataset.season = season;
      ui.dataset.fireGain = fire.gain.toFixed(3);
    },
    dispose() {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      for (const loop of Object.values(loops)) loop.source.stop();
      ctx?.close().catch(() => {});
      ui.remove();
    },
  };
}
