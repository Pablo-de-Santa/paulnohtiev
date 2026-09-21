import * as THREE from "./vendor/three.module.min.js";
export function random(seed = 42) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const sphere = new THREE.SphereGeometry(1, 96, 64);
export function createPlanet(name, textures) {
  const root = new THREE.Group();
  root.name = name;
  const map = textures[name];
  const material =
    name === "Sun"
      ? new THREE.MeshBasicMaterial({
          map,
          color: "#fff2d1",
          toneMapped: false,
        })
      : new THREE.MeshPhongMaterial({
          map,
          color: map ? "#ffffff" : "#a1a7b0",
          shininess: name === "Earth" ? 16 : 2,
          specular: name === "Earth" ? "#526677" : "#080808",
        });
  if (name === "Moon" || name === "Mercury") {
    material.bumpMap = map;
    material.bumpScale = 0.007;
  }
  const solarPosition = { value: new THREE.Vector3() };
  root.userData.setSunPosition = (position) =>
    solarPosition.value.copy(position);
  if (name === "Earth" && textures.EarthNight) {
    material.emissiveMap = textures.EarthNight;
    material.emissive = new THREE.Color("#ffffff");
    material.emissiveIntensity = 1.2;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uSolarPosition = solarPosition;
      shader.uniforms.uCloudMask = { value: textures.EarthClouds };
      shader.vertexShader =
        "varying vec3 vSurfaceWorld; varying vec3 vNormalWorld;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n vSurfaceWorld=(modelMatrix*vec4(position,1.)).xyz; vNormalWorld=normalize(mat3(modelMatrix)*normal);",
      );
      shader.fragmentShader =
        "uniform vec3 uSolarPosition; uniform sampler2D uCloudMask; varying vec3 vSurfaceWorld; varying vec3 vNormalWorld;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float daylight=dot(normalize(vNormalWorld),normalize(uSolarPosition-vSurfaceWorld));
        float night=1.-smoothstep(-.12,.06,daylight);
        float city=max(totalEmissiveRadiance.r,max(totalEmissiveRadiance.g,totalEmissiveRadiance.b));
        float clearSky=1.-texture2D(uCloudMask,vEmissiveMapUv).r*.88;
        totalEmissiveRadiance*=night*clearSky*smoothstep(.01,.06,city);`,
      );
    };
  }
  const body = new THREE.Mesh(sphere, material);
  if (name === "Moon") {
    const moonSunView = { value: new THREE.Vector3() };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uMoonSunView = moonSunView;
      shader.fragmentShader =
        "uniform vec3 uMoonSunView;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_begin>",
        THREE.ShaderChunk.lights_fragment_begin.replace(
          "pointLight = pointLights[ i ];",
          "pointLight = pointLights[ i ]; pointLight.position = uMoonSunView;",
        ),
      );
    };
    body.onBeforeRender = (_renderer, _scene, camera) => {
      moonSunView.value
        .copy(solarPosition.value)
        .applyMatrix4(camera.matrixWorldInverse);
    };
  }
  root.add(body);
  root.userData.body = body;
  if (name === "Earth") {
    const clouds = new THREE.Mesh(
      sphere,
      new THREE.MeshPhongMaterial({
        color: "#ffffff",
        alphaMap: textures.EarthClouds,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        shininess: 0,
      }),
    );
    clouds.scale.setScalar(1.012);
    root.add(clouds);
    root.userData.clouds = clouds;
  }
  if (name === "Sun" || name === "Earth") {
    const glow = new THREE.Mesh(
      sphere,
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: {
            value: new THREE.Color(name === "Sun" ? "#ffb13c" : "#60b6ff"),
          },
          uOpacity: { value: name === "Sun" ? 0.48 : 0.5 },
          uSun: { value: name === "Sun" ? 1 : 0 },
          uSolarPosition: solarPosition,
        },
        vertexShader: `varying vec3 n;varying vec3 v;varying vec3 worldP;varying vec3 worldN;void main(){worldP=(modelMatrix*vec4(position,1.)).xyz;worldN=normalize(mat3(modelMatrix)*normal);vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
        fragmentShader: `uniform vec3 uColor;uniform float uOpacity;uniform float uSun;uniform vec3 uSolarPosition;varying vec3 worldP;varying vec3 worldN;varying vec3 n;varying vec3 v;void main(){float facing=abs(dot(normalize(n),normalize(v)));float r=sqrt(max(0.,1.-facing*facing));float corona=exp(-max(0.,r-.58)*8.)*(1.-smoothstep(.9,1.,r));float f=mix(pow(1.-facing,2.8),corona,uSun);float lit=mix(.08+.92*smoothstep(-.15,.25,dot(normalize(worldN),normalize(uSolarPosition-worldP))),1.,uSun);gl_FragColor=vec4(uColor,f*uOpacity*lit);}`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.scale.setScalar(name === "Sun" ? 1.7 : 1.04);
    root.add(glow);
  }
  if (name === "Saturn") {
    const rings = new THREE.Group();
    rings.rotation.set(1.16, 0.2, -0.15);

    for (let i = 0; i < 42; i++) {
      const r = 1.28 + i * 0.02;
      if (i > 22 && i < 26) continue;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 5, 128),
        new THREE.MeshPhongMaterial({
          color: i % 4 ? "#b9ab92" : "#6c6459",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
        }),
      );
      // Closed 3D bands, rather than orbit/trajectory guide lines.

      rings.add(ring);
    }
    root.add(rings);
  }
  return root;
}
export function createStars(count = 2000) {
  const rng = random(17),
    dummy = new THREE.Object3D();
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uTime;varying vec2 vDisc;varying float vBrightness;
      void main(){vDisc=uv*2.-1.;float seed=fract(sin(instanceMatrix[3].x*12.9898)*43758.5453);
      vBrightness=mix(1.,.58+.42*sin(uTime*(.15+seed*.2)+seed*81.),step(.88,seed));
      vec4 center=modelViewMatrix*vec4(instanceMatrix[3].xyz,1.);
      center.xy+=position.xy*length(instanceMatrix[0].xyz);gl_Position=projectionMatrix*center;}`,
    fragmentShader: `uniform float uOpacity;varying vec2 vDisc;varying float vBrightness;
      void main(){float r=length(vDisc);if(r>1.)discard;float edge=1.-smoothstep(1.-max(fwidth(r),.05),1.,r);gl_FragColor=vec4(vec3(.78,.86,1.)*vBrightness,uOpacity*edge);}`,
  });
  const stars = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(2, 2),
    material,
    count,
  );
  stars.frustumCulled = false;
  stars.userData.update = (time) => {
    material.uniforms.uTime.value = time;
    material.uniforms.uOpacity.value = material.opacity;
  };
  for (let i = 0; i < count; i++) {
    const radius = 65 + rng() * 100,
      theta = rng() * Math.PI * 2,
      z = rng() * 2 - 1,
      plane = Math.sqrt(1 - z * z);
    dummy.position.set(
      radius * plane * Math.cos(theta),
      radius * z,
      radius * plane * Math.sin(theta),
    );
    dummy.scale.setScalar(0.025 + rng() ** 5 * 0.17);
    dummy.updateMatrix();
    stars.setMatrixAt(i, dummy.matrix);
  }
  return stars;
}
