const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:8080/forest-preview.html");
    await p.waitForSelector("body[data-ready=true]");
    assert(
      await p.evaluate(
        () =>
          forestDebug.world.userData.person.getObjectByName(
            "Portrait thickness",
          ).geometry.attributes.position.count > 0,
      ),
    );
    await p.screenshot({ path: "previews/pixel-portrait-clearing.png" });
    await p.click("#explore-button");
    await p.waitForFunction(() => !forestDebug.exploration.transitioning);
    async function aim(pos, target) {
      await p.evaluate(
        ({ pos, target }) => {
          let e = forestDebug.exploration;
          e.setLocked(true);
          e.camera.position.set(...pos);
          e.camera.lookAt(...target);
        },
        { pos, target },
      );
      await p.waitForTimeout(350);
    }
    await aim([1.5, 1.8, 3.5], [1.5, 1.6, -0.6]);
    await p.screenshot({ path: "previews/pixel-portrait-front.png" });
    await aim([1.5, 1.8, -3.8], [1.5, 1.5, -0.6]);
    await p.screenshot({ path: "previews/pixel-portrait-back.png" });
    await aim([8.8, 2.8, 0.8], [5.8, 2.2, -3.3]);
    await p.screenshot({ path: "previews/cabin-wood-planks.png" });
    const yaw = await p.evaluate(
      () => forestDebug.world.userData.person.rotation.y,
    );
    assert.equal(yaw, 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS fixed portrait front/back, relief geometry, cabin plank display and no browser errors",
    );
  } finally {
    await b.close();
  }
})();
