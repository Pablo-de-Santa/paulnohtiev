const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TEST_BASE_URL || "http://localhost:8080";
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
      await page.addInitScript(() => {
        document.addEventListener("DOMContentLoaded", () => {
          const loader = document.querySelector("#journey-loader");
          const scene = document.querySelector("#scene");
          const veil = document.querySelector("#atmosphere-veil");
          window.maximumLoadingVeilOpacity = 0;
          const veilChanges = new MutationObserver(() => {
            if (!document.documentElement.classList.contains("journey-loading")) {
              veilChanges.disconnect();
              return;
            }
            window.maximumLoadingVeilOpacity = Math.max(
              window.maximumLoadingVeilOpacity,
              Number(veil.style.opacity),
            );
          });
          veilChanges.observe(veil, { attributeFilter: ["style"] });
          const opening = new MutationObserver(() => {
            if (!loader.classList.contains("opening")) return;
            const label = loader.querySelector(".loader-label");
            const bounds = label.getBoundingClientRect();
            const fade = label.getAnimations().find(
              (animation) => animation.transitionProperty === "opacity",
            );
            window.journeyOpening = {
              labelCenter: bounds.top + bounds.height / 2,
              viewportCenter: innerHeight / 2,
              labelTargetOpacity: Number(
                fade?.effect.getKeyframes().at(-1).opacity ??
                  getComputedStyle(label).opacity,
              ),
              introVisibility: getComputedStyle(
                document.querySelector("#earth-copy"),
              ).visibility,
              sceneVisibility: getComputedStyle(scene).visibility,
              veilVisibility: getComputedStyle(veil).visibility,
              hintOpacity: Number(getComputedStyle(
                document.querySelector("#welcome-copy > p"),
              ).opacity),
              scrollY,
            };
            opening.disconnect();
          });
          opening.observe(loader, { attributeFilter: ["class"] });
        }, { once: true });
      });
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      await page.route("**/assets/textures/2k_sun.jpg", async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto(baseURL, {
        waitUntil: "domcontentloaded",
      });
      assert(await page.locator("#journey-loader").isVisible());
      await page.mouse.wheel(0, 6000);
      await page.keyboard.press("End");
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.equal(await page.locator("main").evaluate((e) => e.inert), true);
      if (reducedMotion === "reduce") {
        const restoredScroll = await page.evaluate(() => {
          scrollTo(0, document.querySelector("#about").offsetTop);
          return scrollY;
        });
        assert(restoredScroll > 0, "Simulate a restored scroll position");
      }
      release();
      await page.waitForSelector('#scene[data-ready="true"]', {
        timeout: 120000,
      });
      const opening = await page.evaluate(() => window.journeyOpening);
      assert(opening, "The curtain opening was observed");
      assert(Math.abs(opening.labelCenter - opening.viewportCenter) < 2);
      assert.equal(opening.labelTargetOpacity, 0);
      assert.equal(opening.introVisibility, "hidden");
      assert.equal(opening.sceneVisibility, "hidden");
      assert.equal(opening.veilVisibility, "hidden");
      assert.equal(opening.hintOpacity, 0);
      assert.equal(
        await page.evaluate(() => window.maximumLoadingVeilOpacity),
        0,
        "Preparing later chapters must never publish their atmosphere opacity",
      );
      assert.equal(opening.scrollY, 0);
      assert.equal(await page.locator("#journey-loader").count(), 0);
      assert.equal(await page.locator("main").evaluate((e) => e.inert), false);
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.equal(await page.locator("#forest-stage").count(), 1);
      assert(await page.locator("#welcome-copy").isVisible());
      assert.equal(await page.locator("#welcome-copy > p").evaluate(
        (hint) => getComputedStyle(hint).transitionDuration,
      ), reducedMotion === "reduce" ? "0s" : "0.38s");
      await page.waitForFunction(() => getComputedStyle(
        document.querySelector("#welcome-copy > p"),
      ).opacity === "1");
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
    await page.goto(baseURL);
    await page.waitForSelector("body.scene-unavailable");
    assert.equal(await page.locator("#journey-loader").count(), 0);
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.classList.contains("journey-loading"),
      ),
      false,
    );
    assert(await page.locator("#earth-copy").isVisible());
    console.log("Library failure: loader unlocks and fallback visible");
    await page.close();
    const noScripts = await browser.newPage({ javaScriptEnabled: false });
    await noScripts.goto(baseURL);
    assert.equal(await noScripts.locator("#journey-loader").isVisible(), false);
    assert(await noScripts.locator("#earth-copy").isVisible());
    console.log("JavaScript disabled: intro available without the loader");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
