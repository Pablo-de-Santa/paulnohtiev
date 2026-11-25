import * as THREE from "../../vendor/three.module.min.js";
import { yieldToBrowser } from "../shared/frame-tasks.js";

const chunkBytes = 2 * 1024 * 1024;

export async function uploadTexture(renderer, texture) {
  const bitmap = texture.image;
  if (
    typeof ImageBitmap === "undefined" || !(bitmap instanceof ImageBitmap) ||
    bitmap.width * bitmap.height * 4 <= chunkBytes ||
    Math.max(bitmap.width, bitmap.height) > renderer.capabilities.maxTextureSize ||
    texture.mipmaps.length > 0
  ) {
    renderer.initTexture(texture);
    return;
  }

  // Allocate every mip level without synchronously copying the whole bitmap.
  const generateMipmaps = texture.generateMipmaps;
  const mipmaps = texture.mipmaps;
  texture.source.dataReady = false;
  if (generateMipmaps) {
    const levels = Math.floor(Math.log2(Math.max(bitmap.width, bitmap.height))) + 1;
    // Three uses the first bitmap's size and the length of this array to reserve storage.
    texture.mipmaps = Array(levels).fill(bitmap);
  }
  texture.generateMipmaps = false;
  const strip = new THREE.Texture();
  const offset = new THREE.Vector2();
  const rowsPerStrip = Math.max(1, Math.floor(chunkBytes / (bitmap.width * 4)));
  try {
    renderer.initTexture(texture);
    texture.mipmaps = mipmaps;
    for (let row = 0; row < bitmap.height; row += rowsPerStrip) {
      await yieldToBrowser();
      const rows = Math.min(rowsPerStrip, bitmap.height - row);
      const image = await createImageBitmap(bitmap, 0, row, bitmap.width, rows, {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      });
      try {
        strip.image = image;
        offset.y = row;
        // Generate the same GPU mipmaps as a full bitmap upload, once at the end.
        texture.generateMipmaps = generateMipmaps && row + rows === bitmap.height;
        renderer.copyTextureToTexture(strip, texture, null, offset);
      } finally {
        image.close();
      }
    }
  } catch {
    texture.mipmaps = mipmaps;
    texture.source.dataReady = true;
    texture.generateMipmaps = generateMipmaps;
    texture.needsUpdate = true;
    renderer.initTexture(texture);
  } finally {
    texture.mipmaps = mipmaps;
    texture.source.dataReady = true;
    texture.generateMipmaps = generateMipmaps;
  }
}
