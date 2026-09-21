const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const p = await b.newPage({ viewport: { width: 1200, height: 850 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:8080/forest-preview.html");
    await p.waitForSelector("body[data-ready=true]");
    await p.click("#explore-button");
    await p.waitForFunction(() => !forestDebug.exploration.transitioning);
    await p.evaluate(() =>
      forestDebug.exploration.camera.position.set(10.99, 1.7, 8),
    );
    await p.keyboard.down("KeyD");
    await p.waitForTimeout(400);
    await p.keyboard.up("KeyD");
    assert.match(
      await p.locator(".world-notice").textContent(),
      /don’t want to leave/,
    );
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
      await p.waitForTimeout(400);
    }
    await aim([9.2, 1.7, -1.2], [9.2, 2, -1.5]);
    await p.waitForTimeout(500);
    assert(
      await p.evaluate(
        () => Math.abs(forestDebug.world.userData.garments[0].rotation.x) > 0.4,
      ),
    );
    await aim([1.6, 1.3, 2.9], [1.6, 0.7, 1.31]);
    await p.screenshot({ path: "previews/laptop-code.png" });
    await aim([4.1, 1.7, 5.1], [4.1, 0.8, 2.8]);
    await p.locator("[data-action=fire]").click();
    await p
      .getByRole("button", {
        name: "Discard burnt marshmallow · E",
        exact: true,
      })
      .waitFor({ timeout: 22000 });
    assert(await p.evaluate(() => forestDebug.world.userData.roastHeat >= 12));
    await p.locator("[data-action=fire]").click();
    assert.match(await p.locator(".world-notice").textContent(), /burned/);
    await p.waitForTimeout(500);
    await p.locator("[data-action=fire]").click();
    await p
      .getByRole("button", { name: "Eat marshmallow · E", exact: true })
      .waitFor({ timeout: 15000 });
    await p.locator("[data-action=fire]").click();
    await p.waitForTimeout(550);
    await p.screenshot({ path: "previews/marshmallow-bite.png" });
    await p.click(".explore-exit");
    assert.deepEqual(errors, []);
    console.log(
      "PASS boundary notice, cloth contact, code laptop, burning/discard and eating animation",
    );
  } finally {
    await b.close();
  }
})();
