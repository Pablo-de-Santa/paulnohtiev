import { odieActionPose } from "./odie-actions.js";
import { createCabin } from "./cabin.js";
import { createVoxelPerson } from "./voxel-person.js";
import { odiePose, pathPoint } from "./clearing-layout.js";
import * as THREE from "./vendor/three.module.min.js";
import { mergeGeometries } from "./vendor/addons/utils/BufferGeometryUtils.js";
import { seasonPalettes } from "./seasons.js";
export function createSeasonalScene(season) {
  const p = seasonPalettes[season],
    winter = season === "winter",
    autumn = season === "autumn",
    spring = season === "spring";
  const solidObstacles = [];
  const root = new THREE.Group(),
    materials = new Map(),
    box = new THREE.BoxGeometry(1, 1, 1);
  let seed = 731;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const mat = (color, emissive = false) => {
    const key = color + ":" + emissive;
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 1,
          flatShading: true,
          ...(emissive ? { emissive: color, emissiveIntensity: 0.8 } : {}),
        }),
      );
    return materials.get(key);
  };
  function block(x, y, z, w, h, d, color, parent = root) {
    const o = new THREE.Mesh(box, mat(color));
    o.position.set(x, y, z);
    o.scale.set(w, h, d);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function cone(x, y, z, r, h, color, parent = root) {
    const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), mat(color));
    o.position.set(x, y, z);
    o.rotation.y = Math.PI / 4;
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function rock(x, z, s = 0.5) {
    if (((x + 7) / 5.3) ** 2 + ((z - 4.5) / 3.3) ** 2 < 1) return;
    if (x > 3 && x < 8.6 && z > -8 && z < -0.8) return;
    if (x > -0.7 && x < 3.9 && z > 4.1 && z < 6.6) return;
    solidObstacles.push({ x, z, radius: s * 0.8 });
    const o = new THREE.Mesh(
      new THREE.DodecahedronGeometry(s, 0),
      mat(winter ? 0xc5d2d2 : 0x81867b),
    );
    o.position.set(x, s * 0.4, z);
    o.scale.y = 0.7;
    o.rotation.set(rand(), rand(), rand());
    o.castShadow = true;
    root.add(o);
  }
  block(0, -0.5, 0, 220, 1, 220, p.ground);
  // Overlapping angular ridges encircle the walking area, including behind us.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2,
      r = (Math.sin(a) > 0 ? 100 : 65) + (i % 3) * 7,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      h = 12 + (i % 5) * 1.5;
    const ridge = cone(
      x,
      h * 0.4 - 2,
      z,
      24,
      h,
      [0x687c7a, 0x7e8b84, 0x8e988e][i % 3],
    );
    ridge.rotation.y = a + 0.4;
    const shoulder = cone(
      x + Math.cos(a + 1) * 5,
      h * 0.24 - 1,
      z + Math.sin(a + 1) * 5,
      17,
      h * 0.7,
      0x657972,
    );
    shoulder.rotation.y = a;
    cone(x, h * 0.8 - 2, z, 3.3, h * 0.22, winter ? 0xe2e8df : 0xc8cfbd);
  }
  // Pond sits partially out of the foreground, with reeds and irregular shoreline.
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat(p.water));
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(5.3, 3.3, 1);
  pond.position.set(-7, 0.025, 4.5);
  root.add(pond);
  const ripples = [];
  for (let i = 0; i < 27; i++) {
    const a = (i / 27) * Math.PI * 2,
      x = -7 + Math.cos(a) * 5.4,
      z = 4.5 + Math.sin(a) * 3.4;
    rock(x, z, 0.22 + rand() * 0.28);
    if (i % 3 === 0) {
      for (let k = 0; k < 3; k++) {
        block(x + k * 0.13, 0.45, z, 0.055, 0.8, 0.055, 0x8f8150);
        block(x + k * 0.13, 0.9, z, 0.1, 0.23, 0.1, 0x5a4938);
      }
    }
  }
  // A curving, broken stepping-stone path connects the cabin with the clearing.
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    block(
      pathPoint(t).x,
      0.015,
      pathPoint(t).z,
      0.7,
      0.045,
      0.45,
      winter ? 0xb4c1bd : 0xaa9a73,
    ).rotation.y = rand() * 0.5;
  }
  // Single cedar cabin, raised porch, layered shingled roof and warm windows.
  const cabin = createCabin(winter);
  root.add(cabin);
  for (let i = 0; i < 7; i++)
    block(
      8.8,
      0.22 + (i % 2) * 0.3,
      -3.8 + Math.floor(i / 2) * 0.32,
      0.65,
      0.27,
      0.29,
      0x785438,
    );
  // Layered forest rings frame a deliberately open central clearing.
  const treeObstacles = [];
  function tree(x, z, size, deciduous) {
    treeObstacles.push({ x, z, radius: 0.25 * size });
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(size);
    root.add(g);
    block(0, 2, 0, 0.42, 4, 0.42, 0x65503a, g);
    if (deciduous) {
      const c = p.leaves[Math.floor(rand() * p.leaves.length)];
      if (winter) {
        for (let j = 0; j < 6; j++) {
          const branch = block(
            (j % 2 ? 1 : -1) * 0.55,
            2.6 + j * 0.38,
            0,
            0.12,
            1.5,
            0.12,
            0x65503a,
            g,
          );
          branch.rotation.z = (j % 2 ? 1 : -1) * 0.8;
          block(
            (j % 2 ? 1 : -1) * 0.85,
            3.3 + j * 0.38,
            0,
            0.7,
            0.15,
            0.5,
            0xe1e7df,
            g,
          );
        }
      } else
        for (let j = 0; j < 17; j++) {
          block(
            (rand() - 0.5) * 2.8,
            3.6 + rand() * 2.1,
            (rand() - 0.5) * 2.2,
            1 + rand() * 0.8,
            0.55 + rand() * 0.7,
            1 + rand() * 0.7,
            c,
            g,
          );
        }
    } else {
      for (let j = 0; j < 4; j++) {
        cone(0, 2.1 + j * 0.95, 0, 2 - j * 0.37, 2.2, p.pine, g);
        if (winter)
          cone(0, 2.5 + j * 0.95, 0, 1.6 - j * 0.29, 1.5, 0xd8e3df, g);
      }
    }
    return g;
  }
  for (let i = 0; i < 83; i++) {
    const x = (rand() - 0.5) * 38,
      z = -10 - rand() * 13;
    tree(x, z, 0.65 + rand() * 0.7, rand() < 0.45);
  }
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1;
    tree(
      side * (12 + rand() * 5),
      -7 + rand() * 19,
      0.85 + rand() * 0.5,
      rand() < 0.5,
    );
  }
  // Front corner branches frame the view without obscuring the characters.
  const foregroundTrees = [
    tree(-14, 10, 1.4, false),
    tree(14, 9, 1.3, true),
    tree(-9, 15, 1.1, false),
    tree(10, 15, 1.1, false),
  ];
  for (let i = 0; i < 50; i++) {
    const x = (rand() - 0.5) * 31,
      z = 8 + rand() * 7;
    if (x > -3 && x < 5) continue;
    for (let j = 0; j < 3; j++) {
      const fern = block(
        x + (j - 1) * 0.2,
        0.23 + j * 0.05,
        z,
        0.65,
        0.12,
        0.25,
        winter ? 0xc8d6d0 : p.pine,
      );
      fern.rotation.y = j * 1.2;
    }
  }
  const outerTrees = new THREE.Group();
  root.add(outerTrees);
  foregroundTrees.forEach((t) => outerTrees.attach(t));
  const beforeOuter = new Set(root.children);
  // A staggered full ring prevents an empty horizon when turning around.
  for (let i = 0; i < 150; i++) {
    const a = (i / 150) * Math.PI * 2,
      r = (Math.sin(a) > 0 ? 85 : 24) + (i % 3) * 5 + rand() * 3;
    tree(Math.cos(a) * r, Math.sin(a) * r, 0.9 + rand() * 0.8, rand() < 0.25);
  }
  // Low foreground forest closes the walking horizon without masking the seated camera.
  for (let i = 0; i < 60; i++) {
    const a = (i / 59) * Math.PI;
    const r = 28 + (i % 3) * 3;
    tree(Math.cos(a) * r, Math.sin(a) * r, 0.42 + rand() * 0.17, false);
  }
  for (const child of [...root.children])
    if (!beforeOuter.has(child)) outerTrees.attach(child);
  outerTrees.visible = false;
  // Shared geometry grass and ground scatter keep the dense detail inexpensive.
  const scatter = new THREE.InstancedMesh(box, mat(p.grass), 4000),
    dummy = new THREE.Object3D();
  for (let i = 0; i < 4000; i++) {
    let x = (rand() - 0.5) * 36,
      z = -13 + rand() * 35;
    const inPond = ((x + 7) / 5.6) ** 2 + ((z - 4.5) / 3.5) ** 2 < 1,
      clear = Math.hypot(x, z - 1) < 3.4,
      house = x > 3 && x < 9 && z < -2 && z > -8;
    dummy.position.set(x, inPond || clear || house ? -2 : 0.1, z);
    dummy.scale.set(0.055, 0.15 + rand() * 0.35, 0.06);
    dummy.rotation.y = rand() * 3;
    dummy.updateMatrix();
    scatter.setMatrixAt(i, dummy.matrix);
  }
  root.add(scatter);
  for (let i = 0; i < 85; i++) {
    const x = (rand() - 0.5) * 25,
      z = (rand() - 0.5) * 22;
    if (
      Math.hypot(x, z) < 3 ||
      ((x + 7) / 5.6) ** 2 + ((z - 4.5) / 3.5) ** 2 < 1
    )
      continue;
    if (autumn)
      block(x, 0.04, z, 0.12, 0.035, 0.2, p.leaves[i % 4]).rotation.y =
        rand() * 6;
    else if (!winter) {
      block(x, 0.2, z, 0.06, 0.4, 0.06, 0x547846);
      block(
        x,
        0.42,
        z,
        0.16,
        0.1,
        0.16,
        spring ? [0xf4c7cb, 0xf9df9c][i % 2] : 0xeecb69,
      );
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = (rand() - 0.5) * 24,
      z = (rand() - 0.5) * 20;
    if (Math.hypot(x, z) > 5) rock(x, z, 0.2 + rand() * 0.45);
  }
  const beforePicnic = new Set(root.children);
  // Picnic blanket, open laptop, mug and a small book stack.
  for (let x = 0; x < 10; x++)
    for (let z = 0; z < 7; z++)
      block(
        -1.9 + x * 0.38,
        0.045,
        -0.1 + z * 0.38,
        0.38,
        0.04,
        0.38,
        (x + z) % 2 ? 0xb6664e : 0xd6b281,
      );
  block(0.1, 0.3, 1.7, 1.05, 0.075, 0.65, 0x555a5d);
  const lid = block(0.1, 0.69, 1.86, 1.05, 0.75, 0.065, 0x555f65);
  lid.rotation.x = 0;
  const laptopScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.59));
  laptopScreen.position.set(0.1, 0.7, 1.822);
  laptopScreen.rotation.y = Math.PI;
  root.add(laptopScreen);
  const codeCanvas = document.createElement("canvas");
  codeCanvas.width = 512;
  codeCanvas.height = 320;
  const code = codeCanvas.getContext("2d");
  code.fillStyle = "#17252e";
  code.fillRect(0, 0, 512, 320);
  code.fillStyle = "#304551";
  code.fillRect(0, 0, 512, 38);
  code.font = "19px monospace";
  code.fillStyle = "#d8e8dd";
  code.fillText("Paul / forest.js", 18, 26);
  const lines = [
    "const camp = new World();",
    "",
    "function buildSomethingUnique() {",
    "  camp.add(forest, cabin, odie);",
    "  camp.light = goldenHour;",
    "  return imagination + code;",
    "}",
    "",
    "buildSomethingUnique();",
  ];
  lines.forEach((line, i) => {
    code.fillStyle = "#637c86";
    code.fillText(String(i + 1), 14, 68 + i * 27);
    code.fillStyle = ["#91c7bc", "#dbb27d", "#b4a9e5"][i % 3];
    code.fillText(line, 46, 68 + i * 27);
  });
  const codeMap = new THREE.CanvasTexture(codeCanvas);
  codeMap.colorSpace = THREE.SRGBColorSpace;
  codeMap.magFilter = THREE.NearestFilter;
  laptopScreen.material = new THREE.MeshBasicMaterial({ map: codeMap });
  block(-1.1, 0.2, 1.8, 0.22, 0.3, 0.22, 0xe2c89c);
  block(1.2, 0.16, 0.8, 0.45, 0.14, 0.55, 0x6b8791);
  block(1.2, 0.27, 0.8, 0.48, 0.08, 0.58, 0xccab75);
  // Keyboard keys, notebook pages, coffee and blanket fringe reward the close view.
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 10; col++)
      block(
        -0.3 + col * 0.085,
        0.346,
        1.61 + row * 0.075,
        0.06,
        0.012,
        0.055,
        0x9aaca9,
      );
  block(0.1, 0.349, 1.47, 0.29, 0.012, 0.12, 0xaebdb3);
  block(-1.1, 0.357, 1.8, 0.15, 0.015, 0.15, 0x645044);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.025, 4, 8),
    mat(0xe2c89c),
  );
  handle.position.set(-0.94, 0.22, 1.8);
  root.add(handle);
  block(1.2, 0.2, 0.8, 0.41, 0.045, 0.51, 0xe2d5b5);
  for (let i = 0; i < 19; i++) {
    block(-1.9 + i * 0.2, 0.055, 2.65, 0.035, 0.025, 0.16, 0xd6b281);
    block(-1.9 + i * 0.2, 0.055, -0.24, 0.035, 0.025, 0.16, 0xd6b281);
  }
  const person = createVoxelPerson(season, p.coat);
  root.add(person);
  root.children.forEach((o) => {
    if (!beforePicnic.has(o)) {
      o.position.x += 1.5;
      o.position.z -= 0.6;
    }
  });
  const picnic = new THREE.Group();
  root.children
    .filter((o) => !beforePicnic.has(o))
    .forEach((o) => picnic.add(o));
  root.add(picnic);
  const drinkName = winter ? "Hot chocolate" : autumn ? "Tea" : "Coffee";
  const steam = new THREE.Group();
  picnic.add(steam);
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.09, 0.055),
      new THREE.MeshBasicMaterial({
        color: 0xf5eee2,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    );
    steam.add(puff);
  }
  const drinkCanvas = document.createElement("canvas");
  drinkCanvas.width = 256;
  drinkCanvas.height = 96;
  const dc = drinkCanvas.getContext("2d");
  dc.fillStyle = "#e2c89c";
  dc.fillRect(0, 0, 256, 96);
  dc.fillStyle = "#49372a";
  dc.font = "bold 27px monospace";
  dc.textAlign = "center";
  dc.fillText(drinkName, 128, 58);
  const drinkMap = new THREE.CanvasTexture(drinkCanvas);
  drinkMap.colorSpace = THREE.SRGBColorSpace;
  const drinkLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.11),
    new THREE.MeshBasicMaterial({ map: drinkMap }),
  );
  drinkLabel.position.set(0.4, 0.23, 1.312);
  picnic.add(drinkLabel);
  // Odie: cream coat, floppy tan ears, articulated feet and a winter scarf.
  const dog = new THREE.Group();
  root.add(dog);
  block(0, 0.48, 0, 0.5, 0.46, 0.8, 0xe1d4b5, dog);
  block(0, 0.77, 0.4, 0.55, 0.5, 0.48, 0xf1e5c9, dog);
  block(0, 0.69, 0.68, 0.34, 0.2, 0.22, 0xe9d9b9, dog);
  block(0, 0.76, 0.81, 0.16, 0.13, 0.08, 0x383b36, dog);
  for (const s of [-1, 1]) {
    block(s * 0.27, 0.66, 0.43, 0.16, 0.42, 0.29, 0xc3a47e, dog);
    block(s * 0.16, 0.88, 0.65, 0.08, 0.09, 0.05, 0x2c3737, dog);
  }
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.399;
    const x = Math.cos(angle) * 0.24,
      z = Math.sin(angle) * 0.37;
    block(
      x,
      0.65 + (i % 3) * 0.035,
      z,
      0.1,
      0.11,
      0.11,
      i % 2 ? 0xf0e4cc : 0xd8c6a6,
      dog,
    );
  }
  for (const side of [-1, 1]) {
    block(side * 0.14, 0.905, 0.684, 0.025, 0.03, 0.015, 0xfff6de, dog);
    block(side * 0.16, 0.96, 0.64, 0.15, 0.04, 0.06, 0xe9dac0, dog);
  }
  const legs = [];
  for (const x of [-0.18, 0.18])
    for (const z of [-0.26, 0.26])
      legs.push(block(x, 0.18, z, 0.15, 0.36, 0.17, 0xe6d9bc, dog));
  block(0, 0.72, -0.48, 0.15, 0.35, 0.15, 0xf1e4c7, dog).rotation.x = -0.5;
  if (winter) {
    block(0, 0.57, 0.37, 0.59, 0.16, 0.16, 0xb95748, dog);
    block(0.28, 0.43, 0.36, 0.14, 0.36, 0.15, 0xb95748, dog);
  }
  const dogBody = new THREE.Group();
  dog.children.slice().forEach((o) => {
    o.position.y -= 0.45;
    dogBody.add(o);
  });
  dogBody.position.y = 0.45;
  dog.add(dogBody);
  // Safe distance between blanket, pond, dog route and fire ring.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    rock(4.1 + Math.cos(a) * 0.8, 2.8 + Math.sin(a) * 0.8, 0.23);
  }
  block(4.1, 0.18, 2.8, 1.05, 0.23, 0.22, 0x674536).rotation.y = 0.6;
  block(4.1, 0.28, 2.8, 1.05, 0.23, 0.22, 0x674536).rotation.y = -0.6;
  const flames = [];
  for (let i = 0; i < 7; i++) {
    const o = block(
      4.1 + (rand() - 0.5) * 0.5,
      0.55,
      2.8 + (rand() - 0.5) * 0.4,
      0.19,
      0.65,
      0.19,
      i % 2 ? 0xffb84b : 0xe9783c,
    );
    o.material = mat(i % 2 ? 0xffba53 : 0xf18743, true);
    flames.push(o);
  }
  const firelight = new THREE.PointLight(0xffa34f, 10, 9, 2);
  firelight.position.set(4.1, 1, 2.8);
  root.add(firelight);
  block(5.9, 0.35, 4.3, 2, 0.48, 0.55, 0x7e573d).rotation.y = -0.6;
  // Clothesline, lantern and mushrooms provide small storytelling details.
  for (const x of [8.5, 11.3]) block(x, 1.3, -1.5, 0.14, 2.6, 0.14, 0x745638);
  block(9.9, 2.4, -1.5, 2.8, 0.035, 0.035, 0x6f6656);
  const laundry = new THREE.Group();
  root.add(laundry);
  const garments = [9.2, 10.4].map((x, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 2.4, -1.5);
    laundry.add(pivot);
    block(
      0,
      -0.4,
      0,
      i ? 0.55 : 0.65,
      0.8,
      0.06,
      i ? 0xb58165 : winter ? 0xad624c : 0xb7b7a0,
      pivot,
    );
    return pivot;
  });
  solidObstacles.push(
    { x: 8.5, z: -1.5, radius: 0.12 },
    { x: 11.3, z: -1.5, radius: 0.12 },
  );
  for (let i = 0; i < 12; i++) {
    const x = -3 - rand() * 4,
      z = -4 - rand() * 3;
    block(x, 0.17, z, 0.07, 0.32, 0.07, 0xd6be92);
    block(x, 0.34, z, 0.28, 0.12, 0.25, 0xb96143);
  }
  if (winter) {
    for (const [y, s] of [
      [0.6, 0.6],
      [1.4, 0.43],
    ]) {
      const o = new THREE.Mesh(
        new THREE.IcosahedronGeometry(s, 1),
        mat(0xf0eee1),
      );
      o.position.set(8, y, 1.5);
      root.add(o);
    }
    block(8, 1.85, 1.5, 0.75, 0.12, 0.7, 0x3c4b52);
    block(8, 2, 1.5, 0.47, 0.28, 0.45, 0x3c4b52);
    block(8, 1.45, 1.95, 0.12, 0.1, 0.25, 0xd28b48);
    for (const x of [7.84, 8.16])
      block(x, 1.58, 1.87, 0.065, 0.065, 0.05, 0x3d4646);
  }
  // Snow / falling leaves / petals are bounded and deterministic.
  const weather = new THREE.InstancedMesh(
    box,
    mat(winter ? 0xf1eee2 : spring ? 0xecc3c0 : 0xc77f3e),
    winter ? 130 : 40,
  );
  weather.visible = winter || autumn || spring;
  root.add(weather);
  const particles = Array.from({ length: weather.count }, () => ({
    x: (rand() - 0.5) * 30,
    z: (rand() - 0.5) * 24,
    y: rand() * 10,
    s: rand(),
  }));
  const smoke = new THREE.InstancedMesh(
    box,
    new THREE.MeshBasicMaterial({
      color: 0xc9c4af,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    9,
  );
  root.add(smoke);
  const birds = new THREE.Group();
  root.add(birds);
  for (let i = 0; i < 3; i++) {
    const bird = new THREE.Group();
    bird.position.set(i * 0.7, (i % 2) * 0.25, 0);
    birds.add(bird);
    block(-0.16, 0, 0, 0.35, 0.045, 0.1, 0x555f5b, bird).rotation.z = 0.3;
    block(0.16, 0, 0, 0.35, 0.045, 0.1, 0x555f5b, bird).rotation.z = -0.3;
  }
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.93, 1, 24),
      new THREE.MeshBasicMaterial({
        color: 0xc3ded0,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-7 + (i % 2) * 1.4, 0.07, 4 + (i % 3) * 0.6);
    ring.visible = !winter;
    root.add(ring);
    rings.push(ring);
  }
  const fish = new THREE.Group();
  root.add(fish);
  block(0, 0, 0, 0.38, 0.14, 0.13, 0xd49b68, fish);
  block(-0.24, 0, 0, 0.13, 0.22, 0.035, 0x96764f, fish);
  block(0.12, 0.035, 0.08, 0.035, 0.04, 0.025, 0x303e40, fish);
  solidObstacles.push(
    { x: 5.9, z: 4.3, radius: 1.15 },
    { x: 8.8, z: -3.4, radius: 0.8 },
  );
  const roast = new THREE.Group();
  root.add(roast);
  block(0, 0, 0.9, 0.035, 0.035, 1.8, 0x745438, roast);
  const sweet = block(0, 0, 0, 0.22, 0.2, 0.2, 0xffecd0, roast);
  sweet.material = mat(0xffecd0).clone();
  const food = new THREE.Group();
  root.add(food);
  for (let i = 0; i < 6; i++)
    block(
      (i - 2.5) * 0.055,
      0,
      ((i % 3) - 1) * 0.065,
      0.06,
      0.05,
      0.06,
      0xb78854,
      food,
    );
  const treat = block(0, 0, 0, 0.12, 0.08, 0.12, 0xbb894e);
  // Batch stationary geometry by material; preserve articulated/animated objects.
  root.updateMatrixWorld(true);
  const animated = new Set([
    treat,
    ...ripples,
    ...rings,
    ...flames,
    ...legs,
    weather,
    smoke,
    scatter,
  ]);
  const batches = new Map(),
    outerBatches = new Map(),
    remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || animated.has(o)) return;
    let parent = o.parent,
      isOuter = false;
    while (parent && parent !== root) {
      if (
        parent === picnic ||
        parent === laundry ||
        parent === roast ||
        parent === food ||
        parent === cabin ||
        parent === dog ||
        parent === birds ||
        parent === person ||
        parent === fish
      )
        return;
      if (parent === outerTrees) isOuter = true;
      parent = parent.parent;
    }
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const target = isOuter ? outerBatches : batches;
    if (!target.has(o.material)) target.set(o.material, []);
    target.get(o.material).push(g);
    remove.push(o);
  });
  remove.forEach((o) => o.removeFromParent());
  const retainedGeometry = new Set();
  root.traverse((o) => {
    if (o.geometry) retainedGeometry.add(o.geometry);
  });
  for (const g of new Set(remove.map((o) => o.geometry)))
    if (!retainedGeometry.has(g)) g.dispose();
  for (const [group, collection] of [
    [root, batches],
    [outerTrees, outerBatches],
  ])
    collection.forEach((geometries, material) => {
      const merged = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      if (merged) {
        const m = new THREE.Mesh(merged, material);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
      }
    });
  let dogTime = 0,
    previousTime = 0;
  root.userData.update = (t) => {
    person.userData.update(t);
    outerTrees.visible = !!root.userData.exploring;
    const step = Math.max(0, Math.min(0.05, t - previousTime));
    previousTime = t;
    const next = odiePose(dogTime + step),
      visitor = root.userData.visitorPosition;
    garments.forEach((g, i) => {
      const distance = visitor
        ? Math.hypot(visitor.x - g.position.x, visitor.z + 1.5)
        : Infinity;
      if (!g.userData.contact && distance < 0.8) {
        g.userData.contact = true;
        g.userData.push = Math.sign(visitor.z + 1.5 || 1);
      } else if (distance > 1.15) g.userData.contact = false;
      const target = g.userData.contact
        ? g.userData.push * 0.8
        : Math.sin(t * 0.7 + i) * 0.07;
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, target, 3.5, step);
    });
    steam.children.forEach((puff, i) => {
      const age = (t * 0.45 + i * 0.2) % 1;
      puff.position.set(
        0.4 + Math.sin(age * 5 + i) * 0.035,
        0.39 + age * 0.55,
        1.2,
      );
      puff.material.opacity = (1 - age) * 0.32;
      puff.scale.setScalar(0.6 + age);
    });
    const command = root.userData.dogCommand;
    const performing = command && t - command.at < command.duration;
    const held = !!root.userData.dogMenu;
    const sitting = t < (root.userData.treatUntil || 0);
    if (
      !sitting &&
      !performing &&
      !held &&
      (!visitor || Math.hypot(next.x - visitor.x, next.z - visitor.z) > 1)
    )
      dogTime += step;
    const pose = odiePose(dogTime);
    dog.position.set(pose.x, pose.y, pose.z);
    dog.rotation.y =
      (sitting || performing || held) && visitor
        ? Math.atan2(visitor.x - dog.position.x, visitor.z - dog.position.z)
        : pose.yaw;
    const trick = performing
      ? odieActionPose(command.name, t - command.at, command.duration)
      : { crouch: 0, roll: 0, yaw: 0, hop: 0 };
    dogBody.rotation.z = trick.roll;
    dog.rotation.y += trick.yaw;
    dog.position.y += trick.hop;
    dog.scale.y = THREE.MathUtils.damp(
      dog.scale.y,
      performing ? 1 - trick.crouch : sitting ? 0.72 : 1,
      6,
      step,
    );
    legs.forEach(
      (l, i) =>
        (l.rotation.x =
          sitting || performing || held
            ? -0.5
            : Math.sin(t * 9 + (i % 2) * Math.PI) * 0.4),
    );
    flames.forEach(
      (f, i) =>
        (f.scale.y = 0.35 + Math.sin(t * 8 + i) * 0.13 + (i % 3) * 0.13),
    );
    firelight.intensity = 24 + Math.sin(t * 7) * 2;
    roast.visible =
      t < (root.userData.roastUntil || 0) && root.userData.roastNear;
    roast.position.set(4.1, 0.95, 2.8);
    if (visitor) roast.lookAt(visitor.x, 0.95, visitor.z);
    sweet.material.color
      .set(0xffecd0)
      .lerp(
        new THREE.Color(0xa96536),
        THREE.MathUtils.clamp((root.userData.roastHeat || 0) / 6, 0, 1),
      );
    sweet.material.color.lerp(
      new THREE.Color(0x35271f),
      THREE.MathUtils.smoothstep(root.userData.roastHeat || 0, 8, 12),
    );
    food.visible = t < (root.userData.feedUntil || 0);
    const feedingAge = t - (root.userData.feedStart ?? t);
    if (food.visible && root.userData.feedOrigin) {
      const u = THREE.MathUtils.clamp(feedingAge / 1.1, 0, 1);
      food.position.lerpVectors(
        root.userData.feedOrigin,
        root.userData.feedTarget,
        u,
      );
      food.position.y += Math.sin(u * Math.PI) * 0.7;
      food.scale.setScalar(1);
      food.children.forEach((pellet, i) => {
        const v = THREE.MathUtils.clamp((feedingAge - i * 0.065) / 1.1, 0, 1);
        pellet.position
          .copy(root.userData.feedOrigin)
          .lerp(root.userData.feedTarget, v);
        pellet.position.y += Math.sin(v * Math.PI) * (0.55 + i * 0.035);
        pellet.position.x += Math.sin(i * 2.4) * v * 0.25;
        pellet.position.z += Math.cos(i * 2.4) * v * 0.25;
        pellet.position.sub(food.position);
        pellet.visible = feedingAge < 2.2 + i * 0.2;
        pellet.rotation.set(v * 4, i, v * 3);
      });
    }
    treat.visible = sitting;
    treat.position.copy(dog.position).add(new THREE.Vector3(0, 0.4, 0.7));
    const jump =
      t < (root.userData.feedUntil || 0)
        ? 4 + ((t - root.userData.feedStart) % 1.6)
        : t % 17;
    fish.visible = !winter && jump > 4 && jump < 5.6;
    if (fish.visible) {
      const u = (jump - 4) / 1.6;
      fish.position.set(-8 + u * 2, Math.sin(u * Math.PI) * 1.15 + 0.08, 4.6);
      if (food.visible && root.userData.feedTarget) {
        fish.position.lerpVectors(
          new THREE.Vector3(-7, 0.08, 4.5),
          root.userData.feedTarget,
          THREE.MathUtils.smoothstep(feedingAge, 0.7, 2),
        );
        fish.position.y = 0.08 + Math.sin(u * Math.PI) * 0.28;
        fish.rotation.y = Math.atan2(
          root.userData.feedTarget.x + 7,
          root.userData.feedTarget.z - 4.5,
        );
      }
      fish.rotation.z = Math.cos(u * Math.PI) * 0.65;
    }
    rings.forEach((r, i) => {
      r.visible = !winter;
      const age = (t * 0.35 + i * 0.2) % 1;
      r.scale.setScalar(0.2 + age * 1.15);
      r.material.opacity = (1 - age) * 0.4;
    });
    ripples.forEach((r, i) => {
      r.visible = winter || Math.sin(t * 0.8 + i) > 0.0;
    });
    particles.forEach((v, i) => {
      dummy.position.set(
        v.x + Math.sin(t * 0.5 + i) * 0.7,
        10 - ((t * (winter ? 0.55 : 0.8) + v.y) % 10),
        v.z,
      );
      if (
        dummy.position.x > 3 &&
        dummy.position.x < 8.6 &&
        dummy.position.z > -8 &&
        dummy.position.z < -0.8 &&
        dummy.position.y < 6.3
      )
        dummy.position.y = -100;
      dummy.rotation.set(t * 0.5 + i, t * 0.3, i);
      dummy.scale.setScalar(winter ? 0.065 : 0.12);
      dummy.updateMatrix();
      weather.setMatrixAt(i, dummy.matrix);
    });
    weather.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 9; i++) {
      const age = (t * 0.4 + i * 0.8) % 7;
      dummy.position.set(
        7.535 + age * 0.25,
        6.2 + age * 0.48,
        -6.555 + Math.sin(age) * 0.2,
      );
      dummy.scale.setScalar(0.2 + age * 0.12);
      dummy.rotation.set(0, age, 0);
      dummy.updateMatrix();
      smoke.setMatrixAt(i, dummy.matrix);
    }
    smoke.visible = cabin.userData.fireOn;
    smoke.instanceMatrix.needsUpdate = true;
    const fly = t % 19;
    birds.visible = fly < 11;
    birds.position.set(
      -17 + fly * 3.2,
      6.7 + Math.sin(fly) * 0.45,
      -4 - Math.sin(fly * 0.4) * 3,
    );
    birds.children.forEach((b, i) => {
      b.children[0].rotation.z = Math.sin(t * 5 + i) * 0.4;
      b.children[1].rotation.z = -Math.sin(t * 5 + i) * 0.4;
    });
  };
  root.userData.treeObstacles = [...treeObstacles, ...solidObstacles];
  root.userData.cabin = cabin;
  root.userData.fish = fish;
  root.userData.garments = garments;
  root.userData.outerTrees = outerTrees;
  root.userData.dog = dog;
  root.userData.picnic = picnic;
  root.userData.drinkName = drinkName;
  root.userData.steam = steam;
  root.userData.person = person;
  root.userData.palette = p;
  root.userData.season = season;
  root.userData.dispose = () => {
    const geometries = new Set(),
      mats = new Set(),
      textures = new Set();
    root.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) {
        for (const material of Array.isArray(o.material)
          ? o.material
          : [o.material])
          mats.add(material);
      }
    });
    mats.forEach((m) => {
      if (m.map) textures.add(m.map);
      m.dispose();
    });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
  };
  return root;
}
