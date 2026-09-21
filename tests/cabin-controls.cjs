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
      await p.waitForTimeout(500);
    }
    for (const pos of [
      [6.2, 1.7, -8],
      [3, 1.7, -6.5],
      [8.6, 1.7, -6.5],
      [5.8, 1.7, -3.2],
    ]) {
      await aim(pos, [6.2, 1.96, -6.5]);
      await p.keyboard.press("KeyE");
      await p.mouse.click(600, 425);
      assert.equal(await p.locator("dialog[open]").count(), 0);
      const action = await p
        .locator(".world-action")
        .getAttribute("data-action");
      assert(
        ![
          "computer",
          "calendar",
          "clock",
          "hearth",
          "cabin-light",
          "radio",
        ].includes(action) || (await p.locator(".world-action").isHidden()),
      );
    }
    await aim([6.1, 2.3, -4.25], [6.75, 1.9, -3.54]);
    await p.locator("[data-action=cabin-light]").click();
    await p.waitForTimeout(800);
    assert(
      await p.evaluate(
        () =>
          !forestDebug.world.userData.cabin.userData.lightOn &&
          forestDebug.world.userData.cabin.userData.roomLight.intensity < 0.1,
      ),
    );
    await p.locator("[data-action=cabin-light]").click();
    await p.waitForTimeout(600);
    assert(
      await p.evaluate(
        () =>
          forestDebug.world.userData.cabin.userData.roomLight.intensity > 12,
      ),
    );
    await aim([6.2, 2.3, -5.1], [7.5, 1.15, -5.55]);
    await p.locator("[data-action=hearth]").click();
    await p.waitForTimeout(800);
    assert(
      await p.evaluate(
        () =>
          !forestDebug.world.userData.cabin.userData.ember.visible &&
          forestDebug.world.userData.cabin.userData.hearthLight.intensity < 0.1,
      ),
    );
    await p.locator("[data-action=hearth]").click();
    await p.waitForTimeout(800);
    assert(
      await p.evaluate(
        () =>
          forestDebug.world.userData.cabin.userData.ember.visible &&
          forestDebug.world.userData.cabin.userData.hearthLight.intensity > 4.8,
      ),
    );
    await aim([5.8, 2.3, -5.1], [6.2, 1.96, -6.5]);
    await p.locator("[data-action=computer]").click();
    await p.getByRole("button", { name: "Résumé", exact: true }).waitFor();
    await p.click(".dialog-close");
    assert.deepEqual(errors, []);
    console.log(
      "PASS indoor-only access from all walls, light off/on, fireplace off/on, computer inside",
    );
  } finally {
    await b.close();
  }
})();
