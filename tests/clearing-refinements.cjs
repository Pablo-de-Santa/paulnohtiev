const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:8080/forest-preview.html");
    await p.waitForSelector("body[data-ready=true]");
    await p.screenshot({ path: "previews/clearing-refined.png" });
    await p.click("#explore-button");
    await p.waitForTimeout(150);
    assert(await p.evaluate(() => forestDebug.exploration.transitioning));
    assert(
      await p.evaluate(() => forestDebug.exploration.camera.position.z > 7),
    );
    await p.waitForFunction(() => !forestDebug.exploration.transitioning);
    assert.equal(
      await p.locator(".sound-controls").getAttribute("data-enabled"),
      "true",
    );
    assert.equal(await p.locator(".explore-help").count(), 0);
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
    await p.waitForTimeout(1500);
    assert(await p.evaluate(() => forestDebug.world.userData.roastHeat > 0));
    await aim([0, 1.7, 8], [4.1, 0.8, 2.8]);
    await p.waitForTimeout(6500);
    assert.equal(
      await p.evaluate(() => forestDebug.world.userData.roastHeat),
      0,
    );
    await aim([4.1, 1.7, 5.1], [4.1, 0.8, 2.8]);
    assert.match(
      await p.locator("[data-action=fire]").textContent(),
      /toasting/,
    );
    await aim([-0.8, 1.7, 4.5], [-3, 0.2, 4.5]);
    await p.locator("[data-action=fish]").click();
    const first = await p.evaluate(() => ({
      origin: forestDebug.world.userData.feedOrigin.toArray(),
      target: forestDebug.world.userData.feedTarget.toArray(),
    }));
    assert.equal(first.origin[0], -0.8);
    await aim([-7, 1.7, 9], [-7, 0.2, 6]);
    await p.locator("[data-action=fish]").click();
    const second = await p.evaluate(() => ({
      origin: forestDebug.world.userData.feedOrigin.toArray(),
      target: forestDebug.world.userData.feedTarget.toArray(),
    }));
    assert.notDeepEqual(first.target, second.target);
    assert(
      ((second.target[0] + 7) / 5.3) ** 2 +
        ((second.target[2] - 4.5) / 3.3) ** 2 <
        1,
    );
    const dog = await p.evaluate(() =>
      forestDebug.world.userData.dog.position.toArray(),
    );
    await aim([dog[0] + 1, 1.7, dog[2] + 0.8], [dog[0], 0.5, dog[2]]);
    await p.locator("[data-action=dog]").click();
    await p.waitForTimeout(300);
    assert(
      await p.evaluate(() => {
        const d = forestDebug.world.userData.dog,
          p = forestDebug.exploration.camera.position;
        return (
          Math.abs(
            d.rotation.y - Math.atan2(p.x - d.position.x, p.z - d.position.z),
          ) < 0.01
        );
      }),
    );
    await aim([5.8, 2.3, -5.1], [6.95, 2.83, -7.1]);
    await p.locator("[data-action=clock]").click();
    await p.getByRole("button", { name: "Night", exact: true }).click();
    await p.waitForTimeout(8000);
    await aim([0, 1.7, 7], [0, 60, -70]);
    await p.screenshot({ path: "previews/clearing-night-sky.png" });
    await p.click(".explore-exit");
    await p.waitForFunction(()=>!document.body.classList.contains("exploring"));
    assert(await p.locator(".sound-controls").evaluate((e) => e.hidden));
    assert.deepEqual(errors, []);
    console.log(
      "PASS camera flight, automatic audio, cooking requires fire, player-based food throws, Odie facing, night sky and exit",
    );
  } finally {
    await b.close();
  }
})();
