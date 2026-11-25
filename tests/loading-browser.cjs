const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TEST_BASE_URL || "http://localhost:8080";

async function holdRequest(page, pattern) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(pattern, async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

async function swipeUp(page) {
  const input = await page.context().newCDPSession(page);
  const point = (y) => [{ x: 195, y }];
  await input.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: point(700),
  });
  for (const y of [650, 600, 550, 500, 450, 400, 350]) {
    await input.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: point(y),
    });
  }
  await page.waitForFunction(() => scrollY > 100);
  // Pause at the end of the swipe so momentum does not move the next test position.
  await page.waitForTimeout(180);
  await input.send("Input.dispatchTouchEvent", {
    type: "touchEnd", touchPoints: [],
  });
  await input.detach();
}

async function checkMobile(browser, viewport, reducedMotion) {
  const page = await browser.newPage({
    viewport, reducedMotion, hasTouch: true, isMobile: true,
  });
  const errors = [];
  const clearingModules = new Set();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    const module = path.match(/\/clearing\/(forest-stage|clearing-life|explore-controls)\.js$/);
    if (module) clearingModules.add(module[1]);
  });
  const initialPattern = "**/assets/textures/2k_sun.jpg";
  const interactivePattern = "**/src/clearing/clearing-life.js";
  const releaseInitial = await holdRequest(page, initialPattern);
  const releaseInteractive = await holdRequest(page, interactivePattern);
  await Promise.all([
    page.waitForRequest(initialPattern),
    page.goto(baseURL, { waitUntil: "domcontentloaded" }),
  ]);
  await page.locator("#journey-loader").waitFor({ state: "hidden" });
  assert(await page.locator("#welcome-copy").isVisible());
  assert.equal(await page.locator("#welcome-copy > p").evaluate(
    (hint) => getComputedStyle(hint).opacity,
  ), "1", "Scroll Down is visible while the journey texture is still loading");
  const introInView = await page.locator("#earth-copy").evaluate((copy) => {
    const bounds = copy.getBoundingClientRect();
    return getComputedStyle(copy).visibility === "visible" &&
      bounds.top < innerHeight && bounds.bottom > 0;
  });
  assert(!introInView, "Later chapters stay out of the welcome viewport");
  assert.equal(await page.locator("main").evaluate((main) => main.inert), false);
  await swipeUp(page);

  const position = await page.evaluate(() => {
    scrollTo({ top: document.querySelector("#about").offsetTop, behavior: "instant" });
    return scrollY;
  });
  releaseInitial();
  await page.locator('#scene[data-ready="true"]').waitFor({
    state: "attached", timeout: 120000,
  });
  assert.equal(await page.evaluate(() => scrollY), position, "The scene respects the scroll position reached while loading");
  assert.deepEqual([...clearingModules], [], "The clearing waits for the visitor to approach");

  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() =>
    +document.querySelector("#forest-stage")?.dataset.phase > 5.8,
    {}, { timeout: 120000 },
  );
  const explore = page.locator("#explore-button");
  await explore.waitFor();
  assert(await explore.isEnabled());
  assert.deepEqual([...clearingModules], ["forest-stage"], "The landscape is visible before interactive world modules load");
  await explore.evaluate((button) => {
    window.exploreLoading = [];
    new MutationObserver(() => {
      const progress = button.getAttribute("data-loading-progress");
      if (progress !== null) {
        window.exploreLoading.push({ value: Number(progress), text: button.textContent.trim() });
      }
    }).observe(button, { attributeFilter: ["data-loading-progress"] });
  });
  await Promise.all([
    page.waitForRequest(interactivePattern),
    explore.tap(),
  ]);
  await page.waitForFunction(() =>
    /^Loading \d+%$/.test(document.querySelector("#explore-button").textContent.trim()),
  );
  assert.equal(await page.locator("body.exploring").count(), 0);
  releaseInteractive();
  await page.locator("body.exploring").waitFor({ timeout: 120000 });
  const progress = await page.evaluate(() => window.exploreLoading);
  assert.deepEqual(progress[0], { value: 0, text: "Loading 0%" });
  assert(progress.some(({ value }) => value > 0 && value < 100));
  assert(progress.every(({ value }, i) => i === 0 || value >= progress[i - 1].value));
  assert.deepEqual(progress.at(-1), { value: 100, text: "Loading 100%" });
  assert.deepEqual(errors, []);
  console.log(`${viewport.width}px ${reducedMotion}: early touch scrolling, deferred Explore load and 0–100% progress passed`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    for (const [viewport, reducedMotion] of [
      [{ width: 900, height: 650 }, "no-preference"],
      [{ width: 390, height: 844 }, "no-preference"],
      [{ width: 390, height: 844 }, "reduce"],
    ]) {
      if (viewport.width === 390) {
        await checkMobile(browser, viewport, reducedMotion);
        continue;
      }
      const page = await browser.newPage({ viewport, reducedMotion });
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
      const releaseInitial = await holdRequest(page, "**/assets/textures/2k_sun.jpg");
      await page.goto(baseURL, {
        waitUntil: "domcontentloaded",
      });
      assert(await page.locator("#journey-loader").isVisible());
      await page.mouse.wheel(0, 6000);
      await page.keyboard.press("End");
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.equal(await page.locator("main").evaluate((e) => e.inert), true);
      releaseInitial();
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
      assert.equal(opening.hintOpacity, 1, "Scroll Down appears with Welcome as the curtain opens");
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
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      await page.waitForFunction(
        () => +document.querySelector("#forest-stage").dataset.phase > 5.8,
      );
      assert(await page.locator("#explore-button").isEnabled());
      assert.deepEqual(errors, []);
      console.log(
        `${viewport.width}px ${reducedMotion}: revealed Welcome and Scroll Down together, prepared forest, fast-scroll passed`,
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
