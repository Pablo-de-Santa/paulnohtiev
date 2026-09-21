// Build tooling only; the website itself has no npm/runtime dependency.
const { NodeIO } = require("@gltf-transform/core");
const { ALL_EXTENSIONS } = require("@gltf-transform/extensions");
const {
  dedup,
  prune,
  instance,
  textureCompress,
} = require("@gltf-transform/functions");
const sharp = require("sharp");
const path = require("node:path");
(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
    file = path.resolve(__dirname, "../assets/models/alpine/village.glb");
  const doc = await io.read(file);
  await doc.transform(
    dedup(),
    instance({ min: 2 }),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [1024, 1024],
    }),
    prune(),
  );
  await io.write(file, doc);
  console.log("Optimized alpine GLB with shared GPU instances");
})();
