import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/addons/loaders/GLTFLoader.js";

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
  const textures = {},
    models = {},
    failures = [];
  const jobs = [
    ...Object.entries(textureFiles).map(async ([name, file]) => {
      try {
        const texture = await textureLoader.loadAsync(
          `assets/textures/${file}.jpg`,
        );
        texture.colorSpace =
          name === "EarthClouds" ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        texture.anisotropy = 4;
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
