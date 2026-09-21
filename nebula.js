import * as THREE from "./vendor/three.module.min.js";

// Bake irregular multi-scale density once. Rendering uses four texture samples,
// avoiding per-pixel fractal noise and costly volume ray marching.
function densityTexture() {
  const size = 64,
    data = new Uint8Array(size ** 3);
  const hash = (x, y, z) => {
    let n =
      Math.imul(x, 374761393) ^
      Math.imul(y, 668265263) ^
      Math.imul(z, 2147483647);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x, y, z) => {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      iz = Math.floor(z);
    let a = x - ix,
      b = y - iy,
      c = z - iz;
    a = a * a * (3 - 2 * a);
    b = b * b * (3 - 2 * b);
    c = c * c * (3 - 2 * c);
    let value = 0;
    for (let k = 0; k < 2; k++)
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++)
          value +=
            hash(ix + i, iy + j, iz + k) *
            (i ? a : 1 - a) *
            (j ? b : 1 - b) *
            (k ? c : 1 - c);
    return value;
  };
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const u = x / size,
          v = y / size,
          w = z / size;
        data[x + size * (y + size * z)] = Math.round(
          255 *
            (noise(u * 5 + 3, v * 5 + 7, w * 5 + 11) * 0.57 +
              noise(u * 11 + 23, v * 11 + 17, w * 11 + 5) * 0.28 +
              noise(u * 23 + 47, v * 23 + 31, w * 23 + 19) * 0.15),
        );
      }
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.MirroredRepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}
export function createNebulaField() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uDensity: { value: densityTexture() },
      uOpacity: { value: 0 },
      uCooling: { value: 0 },
      uShape: { value: 0 },
    },
    vertexShader:
      "varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `precision highp sampler3D;
  uniform sampler3D uDensity;uniform float uOpacity,uCooling,uShape;varying vec3 vLocal;
  void main(){
    vec3 p=normalize(vLocal)*.43+vec3(.51,.48,.52);
    vec3 drift=vec3(uShape*.018,-uShape*.011,uShape*.009);
    float warp=texture(uDensity,p*.63+vec3(.13,.27,.31)+drift).r;
    float coarse=texture(uDensity,p+drift+(warp-.5)*.3).r;
    float detail=texture(uDensity,p*1.73-drift+vec3(.26,.61,.17)).r;
    float filament=texture(uDensity,p*2.31+vec3(.37,.12,.45)+drift).r;
    float density=smoothstep(.35,.7,coarse*.68+detail*.32);
    float wisps=pow(1.-abs(filament*2.-1.),5.);
    float light=density*(.36+wisps*.4);
    vec3 warm=mix(vec3(.62,.07,.015),vec3(1.,.61,.18),smoothstep(.3,.8,coarse));
    vec3 cool=mix(vec3(.17,.08,.45),vec3(.12,.42,.65),detail);
    vec3 color=mix(warm,cool,uCooling);
    gl_FragColor=vec4(color,light*uOpacity);
  }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
  mesh.scale.setScalar(580);
  mesh.userData.update = (shape, cooling, opacity) => {
    material.uniforms.uShape.value = shape;
    material.uniforms.uCooling.value = cooling;
    material.uniforms.uOpacity.value = opacity;
  };
  return mesh;
}
