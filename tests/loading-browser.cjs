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

function trackEarthMaps(page) {
  const maps = new Set();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    const match = path.match(/\/assets\/textures\/((?:mobile\/)?[48]k_earth_(?:daymap|nightmap)\.jpg)$/);
    if (match) maps.add(match[1]);
  });
  return maps;
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
  // Pause at the end so momentum does not move the next test position.
  await page.waitForTimeout(180);
  await input.send("Input.dispatchTouchEvent", {
    type: "touchEnd", touchPoints: [],
  });
  await input.detach();
}

async function checkSpaceFrame(page) {
  await page.evaluate(() => {
    const welcomeHeight = document.querySelector("#afterBang").offsetTop;
    scrollTo({ top: welcomeHeight * 0.88, behavior: "instant" });
  });
  await page.waitForFunction(() => {
    const scene = document.querySelector("#scene");
    return Math.abs(Number(scene.dataset.phase) - 0.88) < 0.01 &&
      scene.dataset.cosmicStage === "expansion";
  });
  assert.equal(await page.locator("#welcome-copy").isVisible(), false);
  const frame = await page.locator("#scene canvas").screenshot({ scale: "css" });
  const litPixels = await page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const sample = document.createElement("canvas");
    sample.width = image.naturalWidth;
    sample.height = image.naturalHeight;
    const context = sample.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 32) count++;
    return count;
  }, frame.toString("base64"));
  assert(litPixels > 100, "The first space chapter draws visible pixels");
}

async function checkMobile(browser, viewport, reducedMotion) {
  const page = await browser.newPage({
    viewport, reducedMotion, hasTouch: true, isMobile: true,
  });
  const errors = [];
  const clearingModules = new Set();
  const earthMaps = trackEarthMaps(page);
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
  const loader = page.locator("#journey-loader");
  await loader.waitFor({ state: "visible" });
  assert.equal(await loader.evaluate((element) => element.classList.contains("opening")), false);
  await loader.evaluate((element) => {
    const observer = new MutationObserver(() => {
      if (!element.classList.contains("opening")) return;
      window.mobileOpening = {
        renderReady: document.querySelector("#scene").dataset.renderReady,
        locked: document.querySelector("main").inert,
        scrollY,
      };
      observer.disconnect();
    });
    observer.observe(element, { attributeFilter: ["class"] });
  });
  const introInView = await page.locator("#earth-copy").evaluate((copy) => {
    const bounds = copy.getBoundingClientRect();
    return getComputedStyle(copy).visibility === "visible" &&
      bounds.top < innerHeight && bounds.bottom > 0;
  });
  assert(!introInView, "Later chapters stay out of the welcome viewport");
  assert.equal(await page.locator("main").evaluate((main) => main.inert), true);
  await swipeUp(page);
  assert.equal(await page.evaluate(() => scrollY), 0, "Mobile scrolling stays locked while the texture is pending");

  releaseInitial();
  await page.locator('#scene[data-ready="true"]').waitFor({
    state: "attached", timeout: 120000,
  });
  assert.deepEqual(await page.evaluate(() => window.mobileOpening), {
    renderReady: "true",
    locked: true,
    scrollY: 0,
  }, "The mobile curtain opens after the renderer is ready");
  await loader.waitFor({ state: "detached" });
  assert(await page.locator("#welcome-copy").isVisible());
  assert(await page.getByText("SCROLL DOWN", { exact: true }).isVisible());
  assert.equal(await page.locator("main").evaluate((main) => main.inert), false);
  assert.equal(await page.evaluate(() => scrollY), 0, "The curtain hands off to Welcome");
  assert.deepEqual([...earthMaps].sort(), [
    "mobile/4k_earth_daymap.jpg",
    "mobile/4k_earth_nightmap.jpg",
  ]);
  assert.doesNotMatch(await page.locator("#scene").getAttribute("data-asset-failures"), /Earth/,
    "The smaller Earth textures load successfully");
  await swipeUp(page);
  await page.waitForFunction(() => scrollY > 100);
  await checkSpaceFrame(page);
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
  console.log(`${viewport.width}px ${reducedMotion}: mobile curtain, rendered space, deferred Explore and 0–100% progress passed`);
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
      const earthMaps = trackEarthMaps(page);
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
      assert.deepEqual([...earthMaps].sort(), [
        "8k_earth_daymap.jpg",
        "8k_earth_nightmap.jpg",
      ]);
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
    const missingEntry = await browser.newPage({
      viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    });
    await missingEntry.route(/\/src\/journey\/main\.js(?:\?.*)?$/, (route) => route.abort());
    await missingEntry.goto(baseURL);
    await missingEntry.waitForSelector("body.scene-unavailable");
    assert.equal(await missingEntry.locator("#journey-loader").count(), 0);
    assert.equal(await missingEntry.locator("main").evaluate((main) => main.inert), false);
    assert(await missingEntry.locator("#earth-copy").isVisible());
    assert(await missingEntry.getByRole("link", { name: "Here is my Resume" }).isVisible());
    const fallbackMessage = await missingEntry.locator("#scene-error").boundingBox();
    assert(fallbackMessage && fallbackMessage.width > 10 && fallbackMessage.height > 10,
      "Mobile entry failure shows a visible explanation alongside the static portfolio");
    console.log("Mobile entry failure: visible explanation and static portfolio available");
    await missingEntry.close();
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
