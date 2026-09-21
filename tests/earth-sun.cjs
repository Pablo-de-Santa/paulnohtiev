const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/scene.js", async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      body = body.replace(
        "    target.x += parallax.x",
        "    if(window.testPointer) parallax.fromArray(window.testPointer);\n    target.x += parallax.x",
      );
      body = body.replace(
        "    renderer.render(scene, camera);",
        `
        window.testState={earth:bodies[3].userData.body.quaternion.toArray(),
          light:sunLight.position.toArray(),camera:camera.position.toArray(),
          sun:sunlight.position.toArray(),glare:sunlight.material.uniforms.uStretch.value};
        renderer.render(scene, camera);`,
      );
      await route.fulfill({ response, body });
    });
    await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:8080");
    await page.waitForSelector("#scene[data-ready=true]");
    async function jump(phase) {
      await page.evaluate((phase) => {
        const s = [...document.querySelectorAll(".chapter")],
          i = Math.floor(phase);
        scrollTo(
          0,
          s[i].offsetTop + (phase - i) * (s[i + 1].offsetTop - s[i].offsetTop),
        );
      }, phase);
      await page.waitForFunction(
        (phase) =>
          Math.abs(+document.querySelector("#scene").dataset.phase - phase) <
          0.01,
        phase,
      );
      await page.waitForTimeout(150);
    }
    await jump(2.94);
    const states = [];
    for (const pointer of [
      [-1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      await page.evaluate((pointer) => {
        window.testPointer = pointer;
        dispatchEvent(new Event("resize"));
      }, pointer);
      await page.waitForTimeout(200);
      states.push(await page.evaluate(() => window.testState));
    }
    for (const state of states.slice(1)) {
      assert.deepEqual(
        state.earth,
        states[0].earth,
        "locked Earth must not turn with camera",
      );
      assert.ok(
        state.light.every(
          (value, i) => Math.abs(value - states[0].light[i]) < 1e-8,
        ),
        "night boundary must not follow camera",
      );
      assert.notDeepEqual(state.camera, states[0].camera);
      assert.notEqual(state.glare, states[0].glare);
    }
    await jump(3.3);
    const dive = await page.evaluate(() => window.testState);
    assert.deepEqual(dive.earth, states[0].earth);
    assert.ok(dive.sun[0] < states[0].sun[0] && dive.sun[1] > states[0].sun[1]);
    assert.ok(dive.light[2] > states[0].light[2]);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: fixed Earth lighting under camera movement, responsive glare, Sun moves during the dive.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
