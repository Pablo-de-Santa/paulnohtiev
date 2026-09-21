const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/night-test.html", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<script type="importmap">{"imports":{"three":"/vendor/three.module.min.js"}}</script>',
      }),
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:8080") +
        "/night-test.html",
    );
    const values = await page.evaluate(async () => {
      const THREE = await import("/vendor/three.module.min.js"),
        { loadAssets } = await import("/assets.js"),
        { createPlanet } = await import("/models.js");
      const assets = await loadAssets();
      if (assets.failures.length) throw new Error(assets.failures.join(","));
      const earth = createPlanet("Earth", assets.textures),
        scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20),
        renderer = new THREE.WebGLRenderer();
      renderer.setSize(256, 256);
      scene.add(earth.userData.body);
      camera.position.z = 3;
      camera.lookAt(0, 0, 0);
      const gl = renderer.getContext(),
        pixels = new Uint8Array(256 * 256 * 4);
      const brightness = (z) => {
        earth.userData.setSunPosition(new THREE.Vector3(0, 0, z));
        renderer.render(scene, camera);
        gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let sum = 0;
        for (let i = 0; i < pixels.length; i += 4)
          sum += pixels[i] + pixels[i + 1] + pixels[i + 2];
        return sum;
      };
      // No scene lamps: any visible pixels come only from the city emission.
      const result = { day: brightness(10), night: brightness(-10) };
      renderer.dispose();
      return result;
    });
    assert.equal(
      values.day,
      0,
      "City emission is absent on the sunlit hemisphere",
    );
    assert.ok(
      values.night > 1000,
      "Matching night map emits on the dark hemisphere",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: city emission follows the actual Sun direction; no shader errors.",
      values,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
