const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: process.env.MOBILE
          ? { width: 390, height: 844 }
          : { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") errors.push(e.text());
    });
    await page.goto("http://localhost:8080/forest-preview.html");
    await page.waitForSelector("body[data-ready=true]");
    await page.click("#explore-button");
    await page.waitForFunction(() => !forestDebug.exploration.transitioning);
    async function aim(pos, target) {
      await page.evaluate(
        ({ pos, target }) => {
          const e = forestDebug.exploration;
          e.setLocked(true);
          e.camera.position.set(...pos);
          e.camera.lookAt(...target);
        },
        { pos, target },
      );
      await page.waitForTimeout(350);
    }
    await page.click(".camp-introduction");
    await page.locator("[data-guide=clock]").click();
    await page.locator(".camp-model-preview").waitFor();
    await page.screenshot({ path: "previews/interaction-guide.png" });
    await page.click(".dialog-close");
    const dog = await page.evaluate(() =>
      forestDebug.world.userData.dog.position.toArray(),
    );
    await aim([dog[0], 2.3, dog[2] + 1.8], [dog[0], 0.7, dog[2]]);
    await page.click("[data-action=dog]");
    await page.locator('[data-dog-command="roll over"]').click();
    await page.waitForTimeout(1500);
    assert(
      await page.evaluate(
        () =>
          Math.abs(forestDebug.world.userData.dog.children[0].rotation.z) > 0.2,
      ),
    );
    await page.waitForFunction(
      () => document.querySelector(".sound-controls").dataset.bark === "ready",
    );
    await aim([dog[0], 2.3, dog[2] + 1.8], [dog[0], 0.7, dog[2]]);
    await page.click("[data-action=dog]");
    await page.locator("[data-dog-command=speak]").click();
    await aim([1.5, 2.3, 2], [1.5, 1.8, -0.6]);
    await page.click("[data-action=paul]");
    await page.getByRole("button", { name: "Interview", exact: true }).click();
    await page
      .getByRole("button", { name: "Modern Angular", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Signals or computed values?", exact: true })
      .click();
    await page.waitForTimeout(350);
    const partial = await page
      .locator(".paul-speech > span")
      .first()
      .textContent();
    assert(partial.length > 2 && partial.length < 100);
    await page.click(".speech-skip");
    await page.waitForTimeout(100);
    assert.match(await page.locator(".paul-speech").textContent(), /computed/);
    await page.screenshot({ path: "previews/paul-interview.png" });
    await page.click(".dialog-close");
    await aim([1.6, 2, 2.7], [1.6, 0.7, 1.26]);
    await page.click("[data-action=laptop]");
    await page.locator(".laptop-code").waitFor();
    assert.equal(await page.locator(".computer-links").count(), 0);
    await page.click(".dialog-close");
    await aim([6.6, 2.3, -5.4], [6.95, 2.83, -7.1]);
    await page.click("[data-action=clock]");
    await page.getByRole("button", { name: "Night", exact: true }).click();
    assert(await page.locator(".world-changing").isVisible());
    const before = await page.evaluate(() =>
      forestDebug.exploration.camera.position.toArray(),
    );
    await page.keyboard.down("w");
    await page.waitForTimeout(300);
    await page.keyboard.up("w");
    assert.deepEqual(
      await page.evaluate(() =>
        forestDebug.exploration.camera.position.toArray(),
      ),
      before,
    );
    await page
      .locator(".world-changing")
      .waitFor({ state: "hidden", timeout: 20000 });
    await aim([4.7, 2.3, -5.3], [4.7, 2.61, -7.1]);
    await page.click("[data-action=calendar]");
    await page.getByRole("button", { name: "winter", exact: true }).click();
    await page
      .locator(".world-changing")
      .waitFor({ state: "hidden", timeout: 10000 });
    assert.equal(
      await page.evaluate(() => forestDebug.world.userData.drinkName),
      "Hot chocolate",
    );
    assert.equal(
      await page.evaluate(
        () => forestDebug.world.userData.steam.children.length,
      ),
      5,
    );
    await aim([9.2, 1.7, -0.95], [9.2, 1, -1.5]);
    await page.waitForTimeout(400);
    const sign = await page.evaluate(
      () => forestDebug.world.userData.garments[0].userData.push,
    );
    await aim([9.2, 1.7, -1.65], [9.2, 1, -2]);
    assert.equal(
      await page.evaluate(
        () => forestDebug.world.userData.garments[0].userData.push,
      ),
      sign,
      "Crossing the fabric does not flip its push direction",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS guide, Odie tricks + real bark, typed interview, outdoor code-only laptop, time transition movement lock",
    );
  } finally {
    await browser.close();
  }
})();
