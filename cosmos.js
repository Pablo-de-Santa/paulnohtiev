import * as THREE from "./vendor/three.module.min.js";
import { createNebulaField } from "./nebula.js";
import { random } from "./models.js";

// One persistent matter field changes from hot/dense to diffuse to galactic.
// Illustrates expansion of a hot, space-filling field, not a central explosion.
export function createCosmicJourney(mobile = false) {
  const root = new THREE.Group(),
    rng = random(583),
    dummy = new THREE.Object3D();
  const count = mobile ? 6500 : 11000,
    geometry = new THREE.PlaneGeometry(2, 2);
  const origins = [],
    spread = [],
    seeds = [];
  const material = new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `attribute vec3 aOrigin;attribute vec3 aSpread;attribute float aSeed;
    uniform float uPhase,uTime;varying vec3 vColor;varying float vAlpha;varying vec2 vDisc;
    void main(){
    float expansion=smoothstep(.54,.98,uPhase);
    float formation=smoothstep(.98,1.28,uPhase);
    vec3 hub=vec3(0.,0.,282.);
    // Every separation expands together; no inward flow or global spin.
    vec3 dispersed=mix(hub+aOrigin,aSpread,expansion);
    vec3 finalPosition=instanceMatrix[3].xyz;
    vec3 delta=dispersed-finalPosition;
    float curl=(1.-formation)*formation*4.;
    vec3 center=mix(dispersed,finalPosition,formation)+vec3(-delta.y,delta.x,0.)*curl*.35;
    float radius=length(instanceMatrix[0].xyz);
    float pulse=.8+.2*sin(uTime*(.45+aSeed)+aSeed*81.);
    vec3 nebula=mix(vec3(.32,.16,1.),vec3(.1,.7,.95),aSeed);
    vec3 hot=mix(vec3(1.,.32,.045),vec3(1.,.65,.2),aSeed);
    vec3 ejecta=mix(hot,nebula,smoothstep(.8,1.08,uPhase)*.7);
    vColor=ejecta;
    vColor=mix(vColor,instanceColor,smoothstep(1.13,1.3,uPhase))*pulse;
    vAlpha=smoothstep(.48,.54,uPhase);
    vDisc=uv*2.-1.;
    vec4 viewCenter=modelViewMatrix*vec4(center,1.);
    viewCenter.xy+=position.xy*radius*mix(1.7,1.,formation);
    gl_Position=projectionMatrix*viewCenter;}`,
    fragmentShader:
      "varying vec3 vColor;varying float vAlpha;varying vec2 vDisc;void main(){float r=length(vDisc);if(r>1.)discard;float edge=1.-smoothstep(1.-max(fwidth(r),.05),1.,r);gl_FragColor=vec4(vColor,vAlpha*edge);}",
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const stars = new THREE.InstancedMesh(geometry, material, count);
  stars.frustumCulled = false;
  const centers = [
    new THREE.Vector3(-22, 8, 280),
    new THREE.Vector3(30, -9, 222),
    new THREE.Vector3(-22, 13, 166),
    new THREE.Vector3(5, -6, 112),
  ];
  for (let i = 0; i < count; i++) {
    const g = i % 4,
      r = Math.pow(rng(), 0.65) * (g === 3 ? 28 : 24),
      arm = i % 3,
      angle = (arm * Math.PI * 2) / 3 + r * 0.23 + (rng() - 0.5) * 0.8;
    const p = new THREE.Vector3(
      Math.cos(angle) * r,
      (rng() - 0.5) * 2.2,
      Math.sin(angle) * r * 0.65,
    );
    p.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.55 + g * 0.3).add(
      centers[g],
    );
    dummy.position.copy(p);
    dummy.scale.setScalar(0.02 + rng() ** 4 * 0.075);
    dummy.updateMatrix();
    stars.setMatrixAt(i, dummy.matrix);
    stars.setColorAt(
      i,
      new THREE.Color().setHSL(
        r < 6 ? 0.1 : 0.56 + g * 0.04,
        r < 6 ? 0.3 : 0.35,
        0.55 + rng() * 0.4,
      ),
    );
    const azimuth = rng() * Math.PI * 2,
      z = rng() * 2 - 1,
      radial = Math.cbrt(rng());
    const unit = new THREE.Vector3(
      Math.sqrt(1 - z * z) * Math.cos(azimuth),
      Math.sqrt(1 - z * z) * Math.sin(azimuth),
      z,
    );
    origins.push(
      ...unit
        .clone()
        .multiplyScalar(radial * 110)
        .toArray(),
    );
    spread.push(
      ...unit
        .multiplyScalar(radial * 220)
        .add(new THREE.Vector3(0, 0, 282))
        .toArray(),
    );
    seeds.push(rng());
  }
  geometry.setAttribute(
    "aOrigin",
    new THREE.InstancedBufferAttribute(new Float32Array(origins), 3),
  );
  geometry.setAttribute(
    "aSpread",
    new THREE.InstancedBufferAttribute(new Float32Array(spread), 3),
  );
  geometry.setAttribute(
    "aSeed",
    new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1),
  );
  root.add(stars);
  const plasma = createNebulaField();
  plasma.position.set(0, 0, 282);
  root.add(plasma);
  const dustMaterials = [];
  centers.forEach((center, g) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader:
        "varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec3 vLocal;uniform float uOpacity;void main(){float r=length(vLocal.xz);float arms=.6+.4*sin(atan(vLocal.z,vLocal.x)*3.-r*14.);float a=(exp(-r*7.)*.65+exp(-r*3.)*arms*.16)*(1.-smoothstep(.75,1.,r))*uOpacity;gl_FragColor=vec4(mix(vec3(1.,.72,.39),vec3(.35,.49,.84),smoothstep(.05,.5,r)),a);}",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), m);
    dust.scale.set(g === 3 ? 28 : 24, 1, g === 3 ? 18 : 16);
    dust.rotation.x = 0.55 + g * 0.3;
    dust.position.copy(center);
    root.add(dust);
    dustMaterials.push(m);
  });
  root.userData.update = (phase, time) => {
    material.uniforms.uPhase.value = phase;
    material.uniforms.uTime.value = time;
    const expansion = THREE.MathUtils.smoothstep(phase, 0.54, 0.98),
      formation = THREE.MathUtils.smoothstep(phase, 0.98, 1.28);
    // An enclosing gas field avoids the surface popping out when crossed by
    // the camera. Its optical density falls continuously as the field cools.
    plasma.scale.setScalar(500 + expansion * 80);
    plasma.userData.update(
      phase * 5 + time * 0.025,
      expansion,
      THREE.MathUtils.smoothstep(phase, 0.5, 0.58) *
        (1 - THREE.MathUtils.smoothstep(phase, 0.86, 1.38)) *
        1.3,
    );
    plasma.visible = phase < 1.38;
    dustMaterials.forEach((m) => (m.uniforms.uOpacity.value = formation ** 3));
  };
  return root;
}
export function createSunlight() {
  // Analytic glare: no bloom framebuffer or expensive post-processing pass.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uStretch: { value: 1 },
      uRayStrength: { value: 1 },
    },
    vertexShader:
      "varying vec2 vGlare;void main(){vGlare=position.xy*2.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 vGlare;uniform float uOpacity;uniform float uStretch;uniform float uRayStrength;
      void main(){
        vec2 p=vGlare;float r=length(p);
        float core=exp(-r*r*220.);float halo=exp(-r*8.)*.7;
        // Keep the core fixed; extend only the lens streaks to screen-right.
        vec2 rayP=vec2(p.x/((p.x>0.?2.5:.85)*uStretch),p.y/uStretch);
        float rayR=length(rayP);
        float rays=pow(abs(cos(atan(rayP.y,rayP.x)*4.)),38.)*exp(-rayR*4.5)*.32;
        float veil=smoothstep(.08,.3,p.x)*exp(-max(p.x,0.)*1.5)*exp(-p.y*p.y*55.)*.045;
        float rayFade=1.-smoothstep(.75,1.2,rayR);
        float bodyFade=1.-smoothstep(.75,1.2,r);
        float alpha=((core+halo)*bodyFade+(rays+veil)*rayFade*uRayStrength)*uOpacity;
        gl_FragColor=vec4(1.,.97,.85,alpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.4).translate(0.55, 0, 0),
    material,
  );
  mesh.scale.setScalar(15);
  return mesh;
}
