import * as THREE from "./vendor/three.module.min.js";
import { createPixelPortrait } from "./pixel-portrait.js";

// Preserve the original drawing exactly on a fixed, shallow relief. It never
// billboards toward the visitor; the reverse has hair, a hood and trouser folds.
export function createVoxelPerson(season, coat) {
  const portrait = createPixelPortrait(season, coat);
  const frontMap = portrait.sprite.material.map;
  const source = frontMap.image;
  const pixels = source.getContext("2d").getImageData(0, 0, 64, 96);
  const backCanvas = document.createElement("canvas");
  backCanvas.width = 64;
  backCanvas.height = 96;
  const ctx = backCanvas.getContext("2d");
  const back = ctx.createImageData(64, 96);
  const shirtRGB = [(coat >> 16) & 255, (coat >> 8) & 255, coat & 255];
  for (let y = 0; y < 96; y++)
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      if (pixels.data[i + 3] < 128) continue;
      let rgb;
      if (y < 40)
        rgb = season === "winter" && y < 17 ? [170, 96, 78] : [73, 59, 52];
      else if (y < 47) rgb = [190, 140, 121];
      else if (y < 81) {
        rgb = shirtRGB;
        if (y >= 72 && y < 78 && (x < 20 || x > 45)) rgb = [221, 177, 153];
      } else rgb = y > 88 ? [184, 185, 175] : [48, 59, 72];
      // A hood seam and light fabric folds, rather than reversed facial features.
      const hood = y >= 48 && y <= 63 && Math.abs(x - 32) < 13;
      const seam =
        hood &&
        (y === 62 || Math.abs(x - 32) === Math.floor(12 - (y - 48) * 0.25));
      const shade = seam
        ? 0.7
        : 0.9 + ((Math.floor(x / 6) + Math.floor(y / 11)) % 3) * 0.05;
      for (let k = 0; k < 3; k++)
        back.data[i + k] = Math.min(255, rgb[k] * shade);
      back.data[i + 3] = 255;
    }
  ctx.putImageData(back, 0, 0);
  const backMap = new THREE.CanvasTexture(backCanvas);
  backMap.colorSpace = THREE.SRGBColorSpace;
  backMap.magFilter = backMap.minFilter = THREE.NearestFilter;
  const root = new THREE.Group();
  root.name = "Paul original pixel portrait relief";
  const w = 1.8,
    h = 2.7,
    depth = 0.34;
  for (const [map, z, angle, name] of [
    [frontMap, depth / 2, 0, "Portrait front"],
    [backMap, -depth / 2, Math.PI, "Portrait back"],
  ]) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, toneMapped: false }),
    );
    if (angle) {
      const uv = mesh.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    }
    mesh.position.set(0, h / 2, z);
    mesh.rotation.y = angle;
    mesh.name = name;
    mesh.castShadow = true;
    root.add(mesh);
  }
  // Only the silhouette edges need geometry: a few hundred quads, not a voxel
  // for every pixel. The side walls close the front and reverse cutouts.
  const positions = [],
    colors = [];
  const opaque = (x, y) =>
    x >= 0 &&
    x < 64 &&
    y >= 0 &&
    y < 96 &&
    pixels.data[(y * 64 + x) * 4 + 3] >= 128;
  function edge(ax, ay, bx, by, color) {
    const points = [
      [ax, ay, depth / 2],
      [bx, by, depth / 2],
      [bx, by, -depth / 2],
      [ax, ay, -depth / 2],
    ];
    for (const n of [0, 1, 2, 0, 2, 3]) {
      const q = points[n];
      positions.push((q[0] / 64 - 0.5) * w, (1 - q[1] / 96) * h, q[2]);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let y = 0; y < 96; y++)
    for (let x = 0; x < 64; x++) {
      if (!opaque(x, y)) continue;
      const c = new THREE.Color().setRGB(
        back.data[(y * 64 + x) * 4] / 255,
        back.data[(y * 64 + x) * 4 + 1] / 255,
        back.data[(y * 64 + x) * 4 + 2] / 255,
        THREE.SRGBColorSpace,
      );
      if (!opaque(x - 1, y)) edge(x, y + 1, x, y, c);
      if (!opaque(x + 1, y)) edge(x + 1, y, x + 1, y + 1, c);
      if (!opaque(x, y - 1)) edge(x, y, x + 1, y, c);
      if (!opaque(x, y + 1)) edge(x + 1, y + 1, x, y + 1, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const sides = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  sides.name = "Portrait thickness";
  sides.castShadow = true;
  root.add(sides);
  portrait.sprite.material.dispose();
  root.userData.update = () => {};
  return root;
}
