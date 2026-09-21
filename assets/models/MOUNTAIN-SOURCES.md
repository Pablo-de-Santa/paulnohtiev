# Mountain scene assets

- `mountainside/optimized.glb`: Poly Haven Mountainside, Dario Barresi (photography), Rico Cilliers (processing). CC0. https://polyhaven.com/a/mountainside
- `pine/optimized.glb`: Poly Haven Pine Sapling Small, Rob Tuytel (photography), Rico Cilliers (modeling). CC0. https://polyhaven.com/a/pine_sapling_small
- `cottage/model.glb`: Venturon House with Thatched Roof / HouseBeams12.glb. CC0. https://venturon.itch.io/house-with-thatched-roof
- `bird.glb`: Mirada animated Parrot, distributed in the Three.js examples. https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Parrot.glb — Three.js MIT notice is included in `vendor/`.

Poly Haven source download manifests are available at `https://api.polyhaven.com/files/mountainside` and `https://api.polyhaven.com/files/pine_sapling_small`. Used their 1K glTF variants and included textures/buffers. Local conversion with glTF Transform: prune, dedup, weld, Meshopt simplify (error .006, ratio .15 mountainside / .12 pine), compress textures to 1024px WebP, prune, write GLB. No runtime decoder or npm dependency is required. Optimized mountainside has 23,019 triangles; three pine variants together have 47,623 triangles. The scene instances the first pine variant.

Mountain silhouettes and the rolling valley are authored meshes using the scan's surface maps; these are illustrative terrain, not a geographic reconstruction. Cottages are recolored at runtime. The bird is recolored for distant silhouettes and retains its source wing animation. The character and dog are authored stylizations based on the supplied reference photos.


September 2026 descent revision: mountain diffuse and OpenGL normal maps upgraded to the source's 2K JPEG variants and embedded as WebP (quality 85/90). Roughness remains 1K; geometry is unchanged. Camera approaches between authored foreground ridges, after the aircraft sequence. Lake basin and water surface are authored geometry. These are not scans of Lake Louise or Moraine Lake.

Replacement candidates, NOT imported yet:
- donnichols, Wooden Log Cabin, CC BY, 8.8k triangles, six PBR texture sets: https://sketchfab.com/3d-models/wooden-log-cabin-21bf3df011b147598cdb43fea839cef7 — awaiting the user's account download.
- striderrotk, Animated Goose, CC BY: https://sketchfab.com/3d-models/animated-goose-4604aa513bb84318835e3242526f12cd — download and flight animation still need verification.

Scenery reference: https://www.audleytravel.com/canada/accommodation/moraine-lake-lodge (reference only; photographs are not distributed).

## Blender alpine study

`alpine/village.glb` is authored with `blender/build_alpine.py`, using the user's supplied mountain/town photos as visual reference. Geometry includes terrain, river, buildings and street fixtures. The only imported model is the existing CC0 Poly Haven Pine Sapling Small; it is decimated and repeated using GPU instances in the optimized web export. Blender renders and the retired browser preview are studies, not an exact recreation of the pictured town.
