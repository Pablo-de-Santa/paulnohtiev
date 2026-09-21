const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const p = await b.newPage({ viewport: process.env.MOBILE ? { width: 390, height: 844 } : { width: 1280, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript(() => {
      window.audioContexts = [];
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...a) {
          super(...a);
          window.audioContexts.push(this);
        }
      };
    });
    await p.goto("http://localhost:8080/forest-preview.html");
    await p.waitForSelector("body[data-ready=true]");
    await p.click("#explore-button");
    await p.waitForFunction(() => !forestDebug.exploration.transitioning);
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
      await p.waitForTimeout(400);
    }
    await aim([5.8, 2.3, -3.9], [5.8, 1.8, -6.4]);
    await p.screenshot({ path: "previews/cabin-layout-arcade.png" });
    assert(
      await p.evaluate(
        () =>
          Math.abs(
            forestDebug.world.userData.cabin.userData.hearth.rotation.y +
              Math.PI / 4,
          ) < 0.001,
      ),
    );
    await aim([5.45, 2.3, -4.4], [4.38, 2.05, -4.15]);
    await p.screenshot({ path: "previews/tower-defense-cabinet.png" });
    await p.locator("[data-action=arcade]").click();
    await p.waitForFunction(
      () => window.audioContexts[0].state === "suspended",
    );
    const frame = p.frameLocator(".arcade-dialog iframe");
    await frame.locator("#entry-btn").click();
    await frame.locator("#start-btn").click();
    await frame.locator("#wave-btn").waitFor();
    await frame.locator("#wave-btn").click();
    await p.waitForTimeout(1200);
    assert(
      await p.evaluate(
        () =>
          document.querySelector(".arcade-dialog").getBoundingClientRect()
            .width === innerWidth,
      ),
    );
    await p.evaluate(() => {
      window.lastArcadeAudio = document.querySelector(
        ".arcade-dialog iframe",
      ).contentWindow.audioContexts[0];
    });
    assert.equal(await p.evaluate(() => lastArcadeAudio.state), "running");
    assert.equal(await p.evaluate(() => audioContexts[0].state), "suspended");
    await p.screenshot({ path: "previews/tower-defense-fullscreen.png" });
    await p.click(".arcade-back");
    await p.waitForFunction(() => audioContexts[0].state === "running");
    assert.equal(await p.evaluate(() => lastArcadeAudio.state), "closed");
    assert.equal(await p.locator(".arcade-dialog iframe").count(), 0);
    assert(
      await p
        .locator("body")
        .evaluate((e) => e.classList.contains("exploring")),
    );
    await p.click(".sound-toggle");
    await p.waitForTimeout(400);
    await aim([5.45, 2.3, -4.4], [4.38, 2.05, -4.15]);
    await p.locator("[data-action=arcade]").click();
    await frame.locator("#entry-btn").waitFor();
    await p.click(".arcade-back");
    await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => audioContexts[0].state), "suspended");
    assert.deepEqual(errors, []);
    console.log(
      "PASS actual game launches and wave plays fullscreen; camp audio suspended, game context closed on exit, mute preference preserved",
    );
  } finally {
    await b.close();
  }
})();
