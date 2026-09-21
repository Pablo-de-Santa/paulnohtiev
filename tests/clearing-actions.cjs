const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const p = await b.newPage({ viewport: { width: 1200, height: 850 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:8080/forest-preview.html");
    await p.waitForSelector("body[data-ready=true]");
    assert.equal(
      await p.evaluate(() => forestDebug.world.userData.outerTrees.visible),
      false,
    );
    await p.click("#explore-button");
    await p.waitForFunction(
      () => document.querySelector("canvas").dataset.entering === "false",
    );
    await p.waitForTimeout(200);
    assert.equal(
      await p.evaluate(() => forestDebug.world.userData.outerTrees.visible),
      true,
    );
    async function aim(pos, target) {
      await p.evaluate(
        ({ pos, target }) => {
          const e = forestDebug.exploration;
          e.setLocked(true);
          e.camera.position.set(...pos);
          e.camera.lookAt(...target);
        },
        { pos, target },
      );
      await p.waitForTimeout(200);
    }
    await aim([4.1, 1.7, 5.1], [4.1, 0.8, 2.8]);
    await p.locator("[data-action=fire]").click();
    assert(await p.evaluate(() => forestDebug.world.userData.roastUntil > 0));
    await p.waitForTimeout(1000);
    await p.screenshot({ path: "previews/marshmallow.png" });
    await aim([-0.8, 1.7, 4.5], [-3, 0.2, 4.5]);
    await p.locator("[data-action=fish]").click();
    assert(await p.evaluate(() => forestDebug.world.userData.feedUntil > 0));
    const dog = await p.evaluate(() => {
      const d = forestDebug.world.userData.dog.position;
      return { x: d.x, z: d.z };
    });
    await aim([dog.x, 1.7, dog.z + 1.5], [dog.x, 0.6, dog.z]);
    await p.locator("[data-action=dog]").click();
    await p.waitForTimeout(700);
    assert(
      await p.evaluate(() => forestDebug.world.userData.dog.scale.y < 0.9),
    );
    await p.screenshot({ path: "previews/odie-treat.png" });
    await aim([5.8, 2.3, -5.1], [4.7, 2.61, -7.1]);
    await p.locator("[data-action=calendar]").click();
    await p.getByRole("button", { name: "winter", exact: true }).click();
    await p.waitForTimeout(3600);
    assert.equal(
      await p.evaluate(() => forestDebug.world.userData.season),
      "winter",
    );
    await p.keyboard.press("Escape");
    await p.waitForTimeout(150);
    assert.equal(
      await p.evaluate(() => forestDebug.world.userData.outerTrees.visible),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS game-only trees, marshmallow, fish, Odie treat and calendar transition",
    );
  } finally {
    await b.close();
  }
})();
