import * as THREE from "./vendor/three.module.min.js";
// A 64×96 original pixel drawing informed by the supplied portrait references.
// Hard-edged brush marks preserve the art style while allowing facial detail.
export function createPixelPortrait(season, coat) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  const r = (x, y, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  const poly = (points, color) => {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
  };
  const shirt = "#" + coat.toString(16).padStart(6, "0"),
    skin = "#ddb199",
    shade = "#be8c79",
    light = "#e9c4aa",
    hair = "#493b34";
  // Crossed legs, shoe soles, a shaped hoodie and sleeves.
  poly(
    [
      [15, 73],
      [46, 73],
      [57, 84],
      [53, 91],
      [33, 92],
      [8, 91],
      [5, 85],
    ],
    "#303b48",
  );
  poly(
    [
      [9, 82],
      [26, 84],
      [41, 89],
      [16, 88],
    ],
    "#46515b",
  );
  poly(
    [
      [48, 80],
      [55, 84],
      [34, 89],
      [24, 87],
    ],
    "#242e3b",
  );
  r(8, 89, 13, 4, "#b8b9af");
  r(44, 88, 12, 4, "#b8b9af");
  r(9, 89, 11, 2, "#e0dacc");
  r(44, 88, 11, 2, "#e0dacc");
  poly(
    [
      [23, 44],
      [40, 44],
      [48, 48],
      [49, 71],
      [44, 81],
      [18, 81],
      [13, 70],
      [15, 49],
    ],
    shirt,
  );
  poly(
    [
      [16, 50],
      [12, 53],
      [9, 69],
      [12, 75],
      [18, 73],
      [20, 55],
    ],
    shirt,
  );
  poly(
    [
      [45, 49],
      [50, 53],
      [55, 70],
      [51, 75],
      [45, 71],
      [42, 55],
    ],
    shirt,
  );
  poly(
    [
      [20, 48],
      [27, 51],
      [32, 53],
      [38, 50],
      [42, 46],
      [38, 44],
      [24, 44],
    ],
    "#ddd0b2",
  );
  poly(
    [
      [17, 59],
      [19, 71],
      [21, 78],
      [17, 78],
      [14, 68],
    ],
    "#907453",
  );
  r(23, 70, 18, 1, "#947d5a");
  r(23, 71, 1, 6, "#947d5a");
  r(40, 71, 1, 6, "#947d5a");
  r(24, 77, 16, 1, "#dac6a1");
  r(12, 72, 8, 5, skin);
  r(46, 72, 8, 5, skin);
  r(13, 76, 6, 1, shade);
  r(47, 76, 6, 1, shade);
  for (let i = 0; i < 3; i++) {
    r(14 + i * 2, 74, 1, 3, light);
    r(47 + i * 2, 74, 1, 3, light);
  }
  if (season !== "summer") {
    r(24, 52, 1, 14, "#efe1c3");
    r(39, 52, 1, 14, "#efe1c3");
    r(24, 65, 2, 2, "#d1bc93");
    r(38, 65, 2, 2, "#d1bc93");
  }
  // Ears, neck and a stepped oval face rather than a square head.
  r(27, 39, 11, 9, shade);
  r(29, 40, 8, 7, skin);
  poly(
    [
      [20, 12],
      [25, 8],
      [39, 8],
      [45, 14],
      [45, 31],
      [41, 40],
      [35, 44],
      [28, 43],
      [21, 38],
      [18, 29],
      [18, 18],
    ],
    skin,
  );
  r(16, 23, 3, 9, shade);
  r(17, 24, 2, 6, skin);
  r(45, 23, 3, 9, shade);
  r(45, 24, 2, 6, light);
  poly(
    [
      [19, 18],
      [22, 17],
      [22, 31],
      [25, 37],
      [30, 40],
      [27, 41],
      [21, 36],
      [19, 30],
    ],
    shade,
  );
  r(24, 16, 15, 4, light);
  r(25, 20, 12, 2, light);
  r(39, 27, 4, 5, light);
  // Short, side-parted brown hair with a few warmer highlights.
  poly(
    [
      [18, 24],
      [17, 17],
      [19, 10],
      [24, 6],
      [33, 5],
      [42, 8],
      [46, 13],
      [46, 24],
      [43, 23],
      [42, 15],
      [38, 13],
      [25, 14],
      [21, 17],
      [21, 24],
    ],
    hair,
  );
  poly(
    [
      [20, 12],
      [25, 8],
      [34, 7],
      [40, 10],
      [28, 11],
    ],
    "#655044",
  );
  r(25, 8, 9, 1, "#806555");
  r(23, 11, 10, 1, "#73594a");
  r(39, 12, 4, 2, "#352f2d");
  r(43, 17, 2, 7, "#574439");
  // Brows, eyes, blue-grey irises and thin rectangular glasses.
  r(23, 22, 7, 1, "#634b3e");
  r(35, 22, 7, 1, "#634b3e");
  r(24, 25, 6, 3, "#f0e0cd");
  r(35, 25, 6, 3, "#f0e0cd");
  r(27, 25, 2, 3, "#779698");
  r(37, 25, 2, 3, "#779698");
  r(28, 26, 1, 2, "#26383e");
  r(38, 26, 1, 2, "#26383e");
  for (const x of [21, 34]) {
    r(x, 23, 10, 1, "#343a39");
    r(x, 24, 1, 5, "#343a39");
    r(x + 9, 24, 1, 5, "#343a39");
    r(x + 1, 29, 8, 1, "#343a39");
    r(x + 1, 24, 3, 1, "#a1ada6");
  }
  r(31, 25, 3, 1, "#343a39");
  r(18, 24, 3, 1, "#343a39");
  r(44, 24, 2, 1, "#343a39");
  // Nose and closely trimmed beard, leaving the cheeks and lips visible.
  r(32, 27, 1, 5, "#c5907b");
  r(31, 32, 4, 1, "#b98170");
  r(32, 29, 1, 3, light);
  poly(
    [
      [21, 31],
      [24, 33],
      [25, 36],
      [28, 38],
      [37, 38],
      [40, 35],
      [43, 31],
      [43, 36],
      [39, 42],
      [34, 45],
      [28, 43],
      [23, 39],
    ],
    "#514038",
  );
  r(28, 35, 9, 1, "#735044");
  r(29, 36, 7, 1, "#b37e70");
  r(30, 37, 5, 1, "#e2b095");
  r(28, 34, 3, 1, "#695045");
  r(34, 34, 4, 1, "#695045");
  for (const [x, y] of [
    [24, 36],
    [25, 39],
    [28, 41],
    [32, 42],
    [36, 41],
    [40, 37],
  ])
    r(x, y, 1, 1, "#866753");
  if (season === "winter") {
    r(20, 8, 24, 7, "#aa604e");
    r(18, 14, 28, 3, "#dfbc94");
    r(29, 4, 7, 4, "#dfbc94");
    r(25, 46, 17, 4, "#aa604e");
    r(37, 50, 5, 12, "#aa604e");
    r(38, 52, 1, 9, "#c98c6a");
  }
  const rest = c.getImageData(0, 0, 64, 96),
    texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      alphaTest: 0.5,
      toneMapped: false,
    }),
  );
  sprite.position.set(0, 1.4, 0.25);
  sprite.scale.set(2, 3, 1);
  sprite.name = "Paul pixel portrait";
  let previous = -1;
  return {
    sprite,
    update(time) {
      const phase = time % 16,
        state = phase > 10 && phase < 12.8 ? 1 + (Math.floor(time * 4) % 2) : 0;
      if (state === previous) return;
      previous = state;
      c.putImageData(rest, 0, 0);
      if (state) {
        c.clearRect(48, 52, 12, 28);
        poly(
          [
            [45, 50],
            [50, 51],
            [55, 47],
            [55, 38],
            [60, 38],
            [61, 50],
            [54, 58],
            [47, 58],
          ],
          shirt,
        );
        r(55 - (state - 1) * 2, 31, 6, 9, skin);
        r(56 - (state - 1) * 2, 28, 1, 4, skin);
        r(58 - (state - 1) * 2, 27, 1, 5, skin);
        r(60 - (state - 1) * 2, 29, 1, 4, skin);
        r(55 - (state - 1) * 2, 35, 5, 1, light);
      }
      texture.needsUpdate = true;
    },
  };
}
