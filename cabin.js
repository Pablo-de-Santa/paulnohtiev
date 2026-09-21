import * as THREE from "./vendor/three.module.min.js";
export function createCabin(winter) {
  const root = new THREE.Group();
  root.position.set(5.8, 0, -5.3);
  root.name = "Walk-in cabin";
  // Tileable hand-drawn boards, with dark recessed joints and pixel grain.
  const woodCanvas = document.createElement("canvas");
  woodCanvas.width = woodCanvas.height = 256;
  const wc = woodCanvas.getContext("2d");
  let woodSeed = 917;
  const rand = () =>
    (woodSeed = (woodSeed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    wc.fillStyle = ["#a6744b", "#9a6941", "#ad7b51", "#95643f"][row % 4];
    wc.fillRect(0, y, 256, 32);
    wc.fillStyle = "#5b3e2b";
    wc.fillRect(0, y, 256, 2);
    wc.fillStyle = "#c59665";
    wc.fillRect(0, y + 2, 256, 1);
    const joint = (row % 3) * 83 + 23;
    wc.fillStyle = "#715035";
    wc.fillRect(joint, y, 2, 32);
    for (let i = 0; i < 14; i++) {
      wc.fillStyle = i % 2 ? "#ba8758" : "#865b39";
      wc.fillRect(rand() * 256, y + 5 + rand() * 23, 8 + rand() * 48, 1);
    }
    wc.fillStyle = "#765036";
    wc.fillRect(joint + 5, y + 7, 2, 2);
    wc.fillRect(joint + 5, y + 25, 2, 2);
  }
  const wood = new THREE.CanvasTexture(woodCanvas);
  wood.colorSpace = THREE.SRGBColorSpace;
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.magFilter = THREE.LinearFilter;
  wood.minFilter = THREE.LinearMipmapLinearFilter;
  wood.anisotropy = 8;
  const geometry = new THREE.BoxGeometry(1, 1, 1),
    mats = new Map();
  function box(x, y, z, w, h, d, color) {
    if (!mats.has(color))
      mats.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
      );
    const o = new THREE.Mesh(geometry, mats.get(color));
    if (color === 0x99653e || color === 0x654831 || color === 0x9e764d) {
      o.material.map = wood;
      o.material.color.set(0xffffff);
      o.geometry = geometry.clone();
      const uv = o.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const face = Math.floor(i / 4),
          horizontal = face < 2 ? d : w,
          vertical = face === 2 || face === 3 ? d : h;
        const u = (uv.getX(i) * horizontal) / 2,
          v = (uv.getY(i) * vertical) / 2;
        uv.setXY(i, color === 0x654831 ? v : u, color === 0x654831 ? u : v);
      }
    }
    o.position.set(x, y, z);
    o.scale.set(w, h, d);
    o.castShadow = o.receiveShadow = true;
    root.add(o);
    return o;
  }
  box(0, 0.3, 0, 5.4, 0.6, 4.3, 0x756450);
  // Actual walls with open door and window apertures, not a solid building box.
  box(0, 2.1, -1.95, 5, 3, 0.18, 0x99653e);
  box(-2.45, 2.1, 0, 0.18, 3, 4, 0x99653e);
  box(2.45, 2.1, 0, 0.18, 3, 4, 0x99653e);
  for (const [x, w] of [
    [-2.325, 0.35],
    [-0.855, 0.39],
    [0.855, 0.39],
    [2.325, 0.35],
  ])
    box(x, 1.675, 1.95, w, 2.15, 0.18, 0x99653e);
  box(0, 3.175, 1.95, 5, 0.85, 0.18, 0x99653e);
  for (const x of [-1.6, 1.6]) {
    box(x, 1.05, 1.95, 1.1, 0.9, 0.18, 0x99653e);
    box(x, 2.75, 1.95, 1.22, 0.14, 0.28, 0x63442d);
    box(x, 1.5, 1.95, 1.22, 0.14, 0.3, 0x63442d);
    for (const side of [-1, 1])
      box(x + side * 0.55, 2.125, 1.96, 0.12, 1.25, 0.3, 0x63442d);
    const glass = box(x, 2.125, 1.96, 1.02, 1.18, 0.025, 0xb9d8da);
    glass.material = new THREE.MeshStandardMaterial({
      color: 0xc8e2df,
      transparent: true,
      opacity: 0.16,
      roughness: 0.12,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    glass.castShadow = false;
    box(x, 2.1, 2, 0.045, 1.1, 0.05, 0x79522e);
    box(x, 2.1, 2.008, 1, 0.045, 0.05, 0x79522e);
  }
  const door = new THREE.Group();
  door.position.set(-0.66, 0.6, 1.99);
  root.add(door);
  const panel = box(0, 0, 0, 1.32, 2.26, 0.12, 0x654831);
  root.remove(panel);
  door.add(panel);
  panel.position.set(0.66, 1.13, 0);
  const knob = box(0, 0, 0, 0.09, 0.09, 0.13, 0xe9bf64);
  root.remove(knob);
  door.add(knob);
  knob.position.set(1.17, 1, 0.1);
  for (const side of [-1, 1])
    for (let j = 0; j < 9; j++)
      box(
        side * (j * 0.31 + 0.15),
        5.2 - j * 0.19,
        0,
        0.31,
        0.22,
        4.9,
        winter ? 0xdde5df : j % 2 ? 0x485657 : 0x3d4a4c,
      );
  // Corner timbers make the board construction readable from every side.
  for (const x of [-2.46, 2.46])
    for (const z of [-1.98, 1.98]) box(x, 2.08, z, 0.22, 3.02, 0.22, 0x705035);
  // Roof end triangles leave the living space clear.
  const shape = new THREE.Shape();
  shape.moveTo(-2.65, 3.55);
  shape.lineTo(0, 5.2);
  shape.lineTo(2.65, 3.55);
  shape.closePath();
  for (const z of [-2, 2]) {
    const g = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({
        color: 0xcab398,
        map: wood,
        side: THREE.DoubleSide,
      }),
    );
    g.position.z = z;
    root.add(g);
  }
  box(0, 0.5, 2.65, 5.6, 0.25, 1.7, 0x9e764d);
  for (let i = 0; i < 3; i++)
    box(0, 0.12 + i * 0.1, 3.85 - i * 0.24, 1.6, 0.2, 0.36, 0xa38962);

  // A desk, computer, rug, daybed, bookshelf and lamps furnish the interior.
  for (let i = 0; i < 16; i++)
    box(-2.3 + i * 0.3, 0.61, 0, 0.27, 0.025, 3.8, i % 2 ? 0xa27b54 : 0x96714c);
  box(0, 0.64, 0.1, 2.3, 0.03, 1.6, 0x8e624d);
  box(0, 1.35, -1.28, 1.5, 0.14, 0.82, 0x694c36);
  for (const x of [-0.6, 0.6]) box(x, 0.96, -1.28, 0.12, 0.68, 0.6, 0x694c36);
  box(0, 1.55, -1.5, 0.13, 0.3, 0.12, 0x3d4745);
  box(0, 1.96, -1.42, 1.18, 0.74, 0.12, 0x354340);
  const screen = box(0, 1.96, -1.345, 1.03, 0.59, 0.02, 0xc2dac6);
  screen.material = new THREE.MeshBasicMaterial({ color: 0xc2dac6 });
  // Small readable screen heading, also serves as the camera focus target.
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 128;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#d4dfc9";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#29483e";
  ctx.font = "bold 23px monospace";
  ctx.fillText("PAUL NOHTIEV", 18, 40);
  ctx.font = "18px monospace";
  ctx.fillText("Resume", 18, 80);
  ctx.fillText("[ open ]", 18, 108);
  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  screen.material.map = texture;
  box(0, 1.45, -0.99, 0.86, 0.04, 0.25, 0x36443f);
  box(-1.77, 0.96, -0.55, 0.83, 0.6, 2.05, 0x6a7666);
  box(-1.77, 1.29, -1.13, 0.72, 0.15, 0.48, 0xded3b9);
  // The right rear corner hearth faces diagonally into the room.
  const hearth = new THREE.Group();
  hearth.name = "Corner fireplace";
  root.add(hearth);
  const beforeHearth = new Set(root.children);
  box(0, 0.71, 0, 1.1, 0.2, 0.72, 0x77796e);
  box(0, 1.3, -0.27, 1, 1.05, 0.15, 0x575b54);
  for (const x of [-0.46, 0.46]) box(x, 1.3, 0, 0.16, 1.1, 0.6, 0x8c897c);
  box(0, 1.9, 0, 1.12, 0.22, 0.74, 0x9a9584);
  box(0, 3.1, -0.12, 0.5, 2.2, 0.5, 0x7e7c73);
  box(0, 5.1, -0.12, 0.5, 2, 0.5, 0x7e7c73);
  box(0, 6.1, -0.12, 0.7, 0.2, 0.7, 0xb0a38a);
  for (const x of [-0.18, 0.18]) box(x, 0.9, 0.05, 0.12, 0.12, 0.42, 0x654531);
  const ember = box(0, 1.07, 0.06, 0.42, 0.22, 0.24, 0xed953e);
  ember.material = new THREE.MeshStandardMaterial({
    color: 0xefae52,
    emissive: 0xee6c20,
    emissiveIntensity: 1.5,
  });
  const hearthLight = new THREE.PointLight(0xffaa58, 5, 4, 2);
  hearthLight.position.set(0, 1.35, 0.38);
  root.add(hearthLight);
  for (const o of [...root.children]) if (!beforeHearth.has(o)) hearth.add(o);
  hearth.position.set(1.65, 0, -1.17);
  hearth.rotation.y = -Math.PI / 4;
  root.userData.hearth = hearth;
  // Radio is against the front wall, beneath the right window, facing inside.
  const radio = new THREE.Group();
  root.add(radio);
  const beforeRadio = new Set(root.children);
  box(1.85, 1.0, 1.1, 0.72, 0.12, 0.65, 0x725236);
  box(1.85, 0.8, 1.1, 0.12, 0.4, 0.12, 0x725236);
  box(1.85, 1.29, 1.1, 0.66, 0.45, 0.3, 0x9d764d);
  box(1.73, 1.29, 1.265, 0.3, 0.29, 0.035, 0x3b453b);
  for (let i = 0; i < 5; i++)
    box(1.6 + i * 0.06, 1.29, 1.29, 0.018, 0.26, 0.015, 0x978365);
  box(2.05, 1.31, 1.29, 0.1, 0.1, 0.05, 0xd3bd89);
  box(1.85, 1.61, 1.07, 0.4, 0.035, 0.04, 0x3b453b);
  for (const x of [1.65, 2.05]) box(x, 1.55, 1.07, 0.035, 0.13, 0.04, 0x3b453b);
  for (const o of [...root.children])
    if (!beforeRadio.has(o)) {
      o.position.x -= 1.85;
      o.position.z -= 1.1;
      radio.add(o);
    }
  radio.position.set(1.6, 0, 1.48);
  radio.rotation.y = Math.PI;
  // An original 1980s-style cabinet next to the foot of the bed.
  const arcade = new THREE.Group();
  arcade.name = "Tower Defense arcade";
  root.add(arcade);
  const beforeArcade = new Set(root.children);
  box(0, 1.3, 0, 0.72, 1.4, 0.6, 0x233e42);
  box(0, 2.04, -0.05, 0.78, 0.72, 0.52, 0x304b51);
  box(0, 2.5, 0, 0.86, 0.3, 0.7, 0x1b2b36);
  box(0, 1.75, 0.25, 0.8, 0.13, 0.36, 0xbc7153);
  const stick = box(-0.2, 1.91, 0.3, 0.035, 0.23, 0.035, 0x343535);
  box(-0.2, 2.03, 0.3, 0.1, 0.08, 0.1, 0xdb9c50);
  for (const x of [0.08, 0.25])
    box(x, 1.84, 0.3, 0.1, 0.055, 0.1, x > 0.1 ? 0xc98465 : 0x99b282);
  box(0, 0.97, 0.307, 0.24, 0.1, 0.025, 0x1a202c);
  function arcadePanel(y, z, w, h, title) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = title ? 128 : 384;
    const g = c.getContext("2d");
    g.fillStyle = "#101c2c";
    g.fillRect(0, 0, c.width, c.height);
    if (title) {
      g.fillStyle = "#f2c776";
      g.font = "bold 45px monospace";
      g.textAlign = "center";
      g.fillText("TOWER DEFENSE", 256, 79);
    } else {
      g.fillStyle = "#60916c";
      g.fillRect(15, 15, 482, 354);
      g.strokeStyle = "#d9bb82";
      g.lineWidth = 36;
      g.beginPath();
      g.moveTo(0, 210);
      g.lineTo(140, 210);
      g.lineTo(140, 100);
      g.lineTo(340, 100);
      g.lineTo(340, 280);
      g.lineTo(512, 280);
      g.stroke();
      for (const [x, y] of [
        [65, 120],
        [220, 185],
        [420, 170],
      ]) {
        g.fillStyle = "#263f56";
        g.fillRect(x, y, 44, 65);
        g.fillStyle = "#f2c776";
        g.fillRect(x - 8, y - 10, 60, 18);
      }
      g.fillStyle = "#fff0bc";
      g.font = "24px monospace";
      g.fillText("PLAY", 220, 350);
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.NearestFilter;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map }),
    );
    m.position.set(0, y, z);
    root.add(m);
  }
  arcadePanel(2.5, 0.36, 0.78, 0.23, true);
  arcadePanel(2.06, 0.218, 0.64, 0.5, false);
  for (const o of [...root.children]) if (!beforeArcade.has(o)) arcade.add(o);
  arcade.position.set(-1.67, 0, 1.15);
  arcade.rotation.y = Math.PI / 2;
  root.userData.arcade = arcade;
  const clock = box(1.15, 2.83, -1.82, 0.6, 0.6, 0.08, 0xe3ce9d);
  const hands = new THREE.Group();
  hands.position.set(1.15, 2.83, -1.76);
  root.add(hands);
  const hour = box(0, 0, 0, 0.045, 0.17, 0.03, 0x3d4b40);
  root.remove(hour);
  hands.add(hour);
  hour.geometry = geometry.clone().translate(0, 0.41, 0);
  hour.position.y = 0;
  const minute = box(0, 0, 0, 0.026, 0.23, 0.03, 0x3d4b40);
  root.remove(minute);
  hands.add(minute);
  minute.geometry = geometry.clone().translate(0, 0.43, 0);
  minute.position.y = 0;
  const beforeCalendar = new Set(root.children);
  box(-1.1, 2.61, -1.82, 0.63, 0.8, 0.05, 0xe8dfc3);
  box(-1.1, 2.94, -1.77, 0.63, 0.14, 0.04, 0xa56148);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 4; i++)
      box(
        -1.3 + i * 0.13,
        2.74 - j * 0.17,
        -1.77,
        0.055,
        0.07,
        0.015,
        0x667c62,
      );
  root.userData.guideClock = [clock, hands];
  root.userData.guideCalendar = root.children.filter(
    (o) => !beforeCalendar.has(o),
  );
  const light = new THREE.PointLight(0xffbf76, 13, 9, 2);
  light.position.set(0, 3, 0);
  root.add(light);
  const lampShade = box(0, 3.3, 0, 0.55, 0.2, 0.55, 0xd9b780);
  lampShade.material = lampShade.material.clone();
  box(0.95, 1.9, 1.81, 0.22, 0.3, 0.07, 0xe3d7bb);
  const lightSwitch = box(0.95, 1.9, 1.76, 0.1, 0.16, 0.06, 0x5a6659);
  root.userData.lightOn = true;
  root.userData.fireOn = true;
  root.userData.roomLight = light;
  root.userData.hearthLight = hearthLight;
  root.userData.ember = ember;
  root.userData.doorOpen = false;
  root.userData.doorAngle = 0;
  root.userData.update = (dt, hours) => {
    door.rotation.y = THREE.MathUtils.damp(
      door.rotation.y,
      root.userData.doorOpen ? -Math.PI * 0.53 : 0,
      5,
      dt,
    );
    root.userData.doorAngle = door.rotation.y;
    light.intensity = THREE.MathUtils.damp(
      light.intensity,
      root.userData.lightOn ? 13 : 0,
      10,
      dt,
    );
    lampShade.material.emissive.set(
      root.userData.lightOn ? 0xffbf76 : 0x000000,
    );
    lampShade.material.emissiveIntensity = 0.25;
    lightSwitch.rotation.x = root.userData.lightOn ? -0.3 : 0.3;
    hearthLight.intensity = THREE.MathUtils.damp(
      hearthLight.intensity,
      root.userData.fireOn ? 5 : 0,
      8,
      dt,
    );
    ember.visible = root.userData.fireOn;
    hour.rotation.z = (-(hours % 12) / 12) * Math.PI * 2;
    minute.rotation.z = -(hours % 1) * Math.PI * 2;
  };
  root.userData.screen = screen;
  return root;
}
// Collision uses wall strips and a traversable doorway. Furniture remains solid.
export function cabinWalkable(x, z, open) {
  if (x < 2.98 || x > 8.62 || z < -7.58 || z > -3.03) return true;
  if (z > -3.65 && Math.abs(x - 5.8) < 0.39 && open) return true;
  if (x < 3.66 || x > 7.94 || z < -6.95 || z > -3.65) return false;
  if (x < 4.65 && z < -4.35) return false;
  if (Math.hypot(x - 7.45, z + 6.47) < 0.95) return false;
  if (x < 4.85 && z > -4.9 && z < -3.6) return false;
  if (x > 6.7 && z > -4.6 && z < -3.55) return false;
  if (x > 4.7 && x < 6.85 && z < -5.95) return false;
  return true;
}
export function cabinFloor(x, z) {
  if (x > 3 && x < 8.6 && z > -7.5 && z < -1.1)
    return 0.6 * THREE.MathUtils.smoothstep(-z, 1.1, 2.05);
  return 0;
}

// Swept panel remains solid even after its doorway is open.
export function doorPanelBlocks(x, z, angle) {
  if (angle === null || angle === undefined) return false;
  const dx = Math.cos(angle) * 1.32,
    dz = -Math.sin(angle) * 1.32;
  const t = Math.max(
    0,
    Math.min(1, ((x - 5.14) * dx + (z + 3.31) * dz) / 1.32 ** 2),
  );
  return Math.hypot(x - 5.14 - t * dx, z + 3.31 - t * dz) < 0.28;
}

// Require the visitor to be beyond the threshold and within all four walls.
export function isInsideCabin(position) {
  return (
    position.x > 3.5 &&
    position.x < 8.1 &&
    position.z > -7.15 &&
    position.z < -3.65 &&
    position.y > 1.05 &&
    position.y < 3.6
  );
}
