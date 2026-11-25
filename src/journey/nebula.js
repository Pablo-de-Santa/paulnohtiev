import * as THREE from "../../vendor/three.module.min.js";
import { bakeNebulaDensity, nebulaDensitySize } from "./nebula-density.js";

function densityTexture(data = bakeNebulaDensity()) {
  const size = nebulaDensitySize;
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.MirroredRepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

export async function prepareNebulaDensity() {
  if (typeof Worker === "undefined") return densityTexture();
  let worker;
  try {
    worker = new Worker(new URL("./nebula-density.js", import.meta.url), {
      type: "module",
    });
    const density = await new Promise((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data);
      worker.onerror = reject;
      worker.onmessageerror = reject;
    });
    return densityTexture(density);
  } catch {
    return densityTexture();
  } finally {
    worker?.terminate();
  }
}

export function createNebulaField(density = densityTexture()) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uDensity: { value: density },
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
