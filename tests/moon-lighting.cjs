const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.route("**/moon-test.html", (r) =>
      r.fulfill({ contentType: "text/html", body: "<html></html>" }),
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:8080") +
        "/moon-test.html",
    );
    const values = await page.evaluate(async () => {
      const THREE = await import("/vendor/three.module.min.js"),
        { createPlanet } = await import("/models.js"),
        { moonPose } = await import("/choreography.js");
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#ff00ff");
      const camera = new THREE.PerspectiveCamera(42, 2, 0.01, 100);
      camera.position.set(0, 0, 7);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(400, 200);
      renderer.setPixelRatio(1);
      const earth = createPlanet("Earth", {}),
        moon = createPlanet("Moon", {});
      earth.position.x = 1.5;
      moon.scale.setScalar(0.5);
      scene.add(earth, moon);
      for (const body of [earth, moon]) {
        body.userData.body.material.color.set("#ffffff");
        body.userData.body.material.shininess = 0;
        body.userData.body.material.bumpMap = null;
      }
      earth.children.slice(1).forEach((o) => (o.visible = false));
      const light = new THREE.PointLight("#ffffff", 2, 0, 0);
      light.position.set(-800, 200, 400);
      scene.add(light);
      const gl = renderer.getContext(),
        px = new Uint8Array(400 * 200 * 4),
        out = [];
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI) / 12;
        moon.quaternion.copy(moonPose(angle).rotation);
        moon.position.set(
          -1.5 + 0.4 * Math.cos(angle),
          0.7 * Math.sin(angle),
          1.1 * Math.sin(angle),
        );
        const view = camera.position.clone().sub(moon.position).normalize();
        const side = new THREE.Vector3(-8, 3, -18).sub(moon.position);
        side
          .addScaledVector(view, -side.dot(view))
          .normalize()
          .multiplyScalar(Math.sqrt(0.84))
          .addScaledVector(view, 0.4);
        moon.userData.setSunPosition(
          moon.position.clone().addScaledVector(side, 1000),
        );
        renderer.render(scene, camera);
        gl.readPixels(0, 0, 400, 200, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let total = 0,
          lit = 0,
          earthSum = 0;
        for (let y = 0; y < 200; y++)
          for (let x = 0; x < 400; x++) {
            let p = (y * 400 + x) * 4;
            if (x < 190) {
              if (
                Math.abs(px[p] - px[p + 2]) < 3 &&
                Math.abs(px[p] - px[p + 1]) < 3
              ) {
                total++;
                if (px[p] > 8) lit++;
              }
            } else if (px[p + 1] > 0) earthSum += px[p + 1];
          }
        out.push({ i, ratio: lit / total, earthSum });
      }
      renderer.dispose();
      return out;
    });
    for (const result of values) {
      assert.ok(
        result.ratio > 0.65 && result.ratio < 0.78,
        "Moon retains its night side",
      );
      assert.equal(
        result.earthSum,
        values[0].earthSum,
        "Moon cannot alter Earth lighting",
      );
    }
    console.log(
      "PASS: 24 orbit samples retain Moon shadow and leave Earth shading unchanged.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
