const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const page = await browser.newPage({
        viewport:
          reducedMotion === "reduce"
            ? { width: 390, height: 844 }
            : { width: 900, height: 650 },
        reducedMotion,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      await page.route("**/assets/textures/2k_sun.jpg", async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto("http://localhost:8080/", {
        waitUntil: "domcontentloaded",
      });
      assert(await page.locator("#journey-loader").isVisible());
      await page.mouse.wheel(0, 6000);
      await page.keyboard.press("End");
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.equal(await page.locator("main").evaluate((e) => e.inert), true);
      release();
      await page.waitForSelector('#scene[data-ready="true"]', {
        timeout: 120000,
      });
      assert.equal(await page.locator("#journey-loader").count(), 0);
      assert.equal(await page.locator("main").evaluate((e) => e.inert), false);
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.equal(await page.locator("#forest-stage").count(), 1);
      assert(await page.locator("#welcome-copy").isVisible());
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      await page.waitForFunction(
        () => +document.querySelector("#forest-stage").dataset.phase > 5.8,
      );
      assert(await page.locator("#explore-button").isEnabled());
      assert.deepEqual(errors, []);
      console.log(
        reducedMotion +
          ": blocked early scroll, prepared forest, revealed welcome, fast-scroll passed",
      );
      await page.close();
    }
    const page = await browser.newPage();
    await page.route("**/vendor/gsap.min.js", (route) => route.abort());
    await page.goto("http://localhost:8080/");
    await page.waitForSelector("body.scene-unavailable");
    assert.equal(await page.locator("#journey-loader").count(), 0);
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.classList.contains("journey-loading"),
      ),
      false,
    );
    console.log("Library failure: loader unlocks and fallback visible");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
