# Alpine scene study

This is a first editable Blender environment study based on the supplied summer Banff references. It is not a scan or an exact geographic reconstruction, and it is not yet photorealistic.

- `alpine-village.blend`: editable terrain, river, ten building exteriors (shops, timber cottages, lodges and a balcony inn), street fixtures and linked pine meshes.
- `build_alpine.py`: reproducible scene generator. Run with `blender --background --python blender/build_alpine.py` from the project directory. Saves the editable project before batching architecture for export, then renders an overview and street view.
- `optimize.cjs`: optional web export optimization using glTF Transform core/functions/extensions and Sharp. Converts repeated trees into GPU instances. Run after the Blender generator.
- `../assets/models/alpine/village.glb`: optimized browser model.
- `../previews/alpine-village.png` and `alpine-street.png`: Blender renders.

The main portfolio uses the seasonal pixel clearing. The earlier browser preview and valley runtime have been retired; the editable Blender project, generator, export and source assets remain here for future authoring.

All terrain, architecture and fixtures in this study were authored by the generator. Trees reuse the existing CC0 Poly Haven Pine Sapling Small asset; see `assets/models/MOUNTAIN-SOURCES.md`. Supplied photographs are visual references and are not redistributed as textures.

The second study adds a joined outer terrain skirt, denser instanced forest, outlying cottages, side windows and softer distance haze. Preview images named `browser-*` show the current export; the two Blender renders are from the earlier study. Set `ALPINE_SKIP_RENDER=1` to export without offline rendering.

Known next work: stronger rock strata and erosion detail, denser forest canopy with distance-based detail, varied building elevations and better weathered materials, water surface animation, and improved character likeness/fur. Preview checks establish loading and functionality, not production performance or photographic fidelity.
