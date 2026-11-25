import * as THREE from "../../vendor/three.module.min.js";
import { GLTFLoader } from "../../vendor/addons/loaders/GLTFLoader.js";

const textureFiles = {
  Sun: "2k_sun",
  Mercury: "2k_mercury",
  Venus: "2k_venus_atmosphere",
  Earth: "8k_earth_daymap",
  EarthNight: "8k_earth_nightmap",
  EarthClouds: "2k_earth_clouds",
  Moon: "2k_moon",
  Mars: "2k_mars",
  Jupiter: "2k_jupiter",
  Saturn: "2k_saturn",
  Uranus: "2k_uranus",
  Neptune: "2k_neptune",
};
export async function loadAssets() {
  const textureLoader = new THREE.TextureLoader(),
    modelLoader = new GLTFLoader();
  // Decode blobs without blocking the first WebGL upload on the main thread.
  const bitmapLoader = typeof createImageBitmap === "function"
    ? new THREE.ImageBitmapLoader().setOptions({
        imageOrientation: "flipY",
        premultiplyAlpha: "none",
      })
    : null;
  const textures = {},
    models = {},
    failures = [];
  async function loadTexture(url) {
    if (bitmapLoader) {
      try {
        const bitmap = await bitmapLoader.loadAsync(url);
        const texture = new THREE.Texture(bitmap);
        // WebGL cannot flip an ImageBitmap when uploading. The decoder did it.
        texture.flipY = false;
        function disposeBitmap() {
          texture.removeEventListener("dispose", disposeBitmap);
          bitmap.close();
        }
        texture.addEventListener("dispose", disposeBitmap);
        return texture;
      } catch {
        // Fall back to the image loader if the browser rejects bitmap decoding.
      }
    }
    return textureLoader.loadAsync(url);
  }
  const jobs = [
    ...Object.entries(textureFiles).map(async ([name, file]) => {
      try {
        const texture = await loadTexture(
          `assets/textures/${file}.jpg`,
        );
        texture.colorSpace =
          name === "EarthClouds" ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        textures[name] = texture;
      } catch (error) {
        failures.push(name);
        console.warn(`Texture unavailable: ${name}`, error);
      }
    }),
    ...[["bird", "assets/models/bird.glb"]].map(async ([id, url]) => {
      try {
        const loaded = await modelLoader.loadAsync(url);
        models[id] = loaded.scene;
        models[id].userData.clips = loaded.animations;
      } catch (error) {
        failures.push(id);
        console.warn(`Landscape unavailable: ${id}`, error);
      }
    }),
  ];
  await Promise.all(jobs);
  return { textures, models, failures };
}
