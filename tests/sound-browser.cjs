const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const p = await b.newPage({ viewport: { width: 1200, height: 850 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript(() => {
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        createDynamicsCompressor() {
          const n = super.createDynamicsCompressor();
          window.audioTestContext = this;
          window.audioTestTap = n;
          return n;
        }
      };
    });
    await p.goto("http://localhost:8080/forest-preview.html");
    await p.waitForSelector("body[data-ready=true]");
    assert(await p.locator(".sound-controls").evaluate((e) => e.hidden));
    await p.click("#explore-button");
    await p.waitForFunction(
      () => document.querySelector("canvas").dataset.entering === "false",
    );

    await p.waitForFunction(
      () =>
        document.querySelector(".sound-controls").dataset.state === "running",
    );
    await p.waitForTimeout(1000);
    async function rms() {
      return p.evaluate(async () => {
        const c = audioTestContext,
          a = c.createAnalyser(),
          silent = c.createGain();
        silent.gain.value = 0;
        audioTestTap.connect(a);
        a.connect(silent);
        silent.connect(c.destination);
        await new Promise((r) => setTimeout(r, 250));
        const data = new Float32Array(a.fftSize);
        a.getFloatTimeDomainData(data);
        audioTestTap.disconnect(a);
        a.disconnect();
        silent.disconnect();
        return Math.sqrt(data.reduce((v, x) => v + x * x, 0) / data.length);
      });
    }
    assert((await rms()) > 0.00001);
    await p.getByRole("button", { name: "Music on", exact: true }).click();
    await p.waitForTimeout(1500);
    assert.equal(
      await p.locator(".sound-controls").getAttribute("data-music"),
      "false",
    );
    assert((await rms()) > 0.00001, "nature remains audible with music off");
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
      await p.waitForTimeout(250);
    }
    await aim([4.1, 1.7, 5.1], [4.1, 0.8, 2.8]);
    await p.locator("[data-action=fire]").click();
    await p
      .getByRole("button", { name: "Eat marshmallow · E", exact: true })
      .waitFor({ timeout: 10000 });
    await p
      .getByRole("button", { name: "Eat marshmallow · E", exact: true })
      .click();
    assert.equal(
      await p.evaluate(() => forestDebug.world.userData.roastUntil),
      0,
    );
    assert.match(await p.locator(".world-notice").textContent(), /Yum/);
    await aim([1.6, 1.4, 2.8], [1.6, 0.7, 1.31]); // Directly click the laptop at the center of the view.
    await p.waitForTimeout(500);
    await p.mouse.click(600, 425);
    await p.getByRole("button", { name: "Résumé", exact: true }).click();
    await p.waitForSelector("dialog[open] iframe");
    assert.match(await p.locator("dialog h2").textContent(), /laptop/);
    await p.click(".dialog-close");
    await aim([6.4, 2.3, -4.5], [7.65, 1.29, -4.7]);
    await p.locator("[data-action=radio]").click();
    await p.getByRole("button", { name: "Turn music on", exact: true }).click();
    assert.equal(
      await p.locator(".sound-controls").getAttribute("data-music"),
      "true",
    );
    await aim([5.8, 2.3, -5.1], [6.95, 2.83, -7.1]);
    await p.locator("[data-action=clock]").click();
    await p
      .getByRole("button", { name: "Restore current time", exact: true })
      .click();
    await aim([5.8, 2.3, -5.1], [4.7, 2.61, -7.1]);
    await p.locator("[data-action=calendar]").click();
    await p.getByRole("button", { name: "winter", exact: true }).click();
    await p.waitForTimeout(3400);
    await aim([5.8, 2.3, -5.1], [4.7, 2.61, -7.1]);
    await p.locator("[data-action=calendar]").click();
    await p
      .getByRole("button", { name: "Restore current season", exact: true })
      .click();
    const expected = await p.evaluate(
      () =>
        ["winter", "spring", "summer", "autumn"][
          Math.floor(((new Date().getMonth() + 1) % 12) / 3)
        ],
    );
    assert.equal(
      await p.evaluate(() => forestDebug.world.userData.season),
      expected,
    );
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => audioTestContext.state === "suspended");
    assert(await p.locator(".sound-controls").evaluate((e) => e.hidden));
    await p.click("#explore-button");
    await p.waitForFunction(
      () => document.querySelector("canvas").dataset.entering === "false",
    );
    await p.waitForFunction(() => audioTestContext.state === "running");
    await p.getByRole("button", { name: "Mute all", exact: true }).click();
    await p.waitForFunction(() => audioTestContext.state === "suspended");
    assert.deepEqual(errors, []);
    console.log(
      "PASS audible sound graph, independent music mute, eat, direct laptop click, radio and calendar/time reset",
    );
  } finally {
    await b.close();
  }
})();
