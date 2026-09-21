const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1100, height: 750 },
      }),
      errors = [];
    const modelRequests = new Set();
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.endsWith(".glb")) modelRequests.add(path);
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:8080/forest-preview.html");
    await page.waitForSelector("body[data-ready=true]");
    await page.click("#explore-button");
    await page.waitForFunction(
      () => !!document.querySelector('canvas[data-entering="false"]'),
    );
    assert(
      await page
        .locator("body")
        .evaluate((e) => e.classList.contains("exploring")),
    );
    const help = page.locator(".explore-help");
    assert(await help.isVisible());
    assert.match(await help.textContent(), /WASD.*look around/);
    const hintBox = await help.boundingBox();
    assert(
      Math.abs(hintBox.y + hintBox.height / 2 - 375) < 2,
      "Hint is centered vertically",
    );
    await page.waitForTimeout(1500);
    assert(
      await help.isVisible(),
      "Hint stays visible while learning controls",
    );
    await help.waitFor({ state: "hidden", timeout: 3000 });
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(700);
    await page.keyboard.up("KeyW");
    const z = await page.locator("canvas").getAttribute("data-walk-z");
    assert(+z < 6.8);
    await page.keyboard.press("Escape");
    await page.waitForSelector('canvas[data-exiting="true"]');
    assert(
      await page
        .locator("body")
        .evaluate((e) => e.classList.contains("exploring")),
      "Keep the world active during the return flight",
    );
    await page.waitForFunction(
      () => !document.body.classList.contains("exploring"),
    );
    assert(
      !(await page
        .locator("body")
        .evaluate((e) => e.classList.contains("exploring"))),
    );
    await page.click("#explore-button");
    await page.waitForFunction(
      () => !!document.querySelector('canvas[data-entering="false"]'),
    );
    await page.screenshot({
      path: require("node:path").resolve(
        __dirname,
        "../previews/forest-first-person.png",
      ),
    });
    await page.click(".explore-exit");
    await page.waitForFunction(
      () => !document.body.classList.contains("exploring"),
    );
    await page.goto("http://localhost:8080/");
    await page.waitForSelector("#scene[data-ready=true]", { timeout: 90000 });
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForFunction(
      () => {
        const b = document.querySelector("#explore-button");
        return (
          !b.disabled &&
          getComputedStyle(document.querySelector("#contact-copy"))
            .visibility === "visible"
        );
      },
      {},
      { timeout: 90000 },
    );
    const savedScroll = await page.evaluate(() => scrollY);
    await page.click("#explore-button");
    await page.waitForFunction(
      () => !!document.querySelector('canvas[data-entering="false"]'),
    );
    assert.equal(
      await page.locator("#contact-copy").isVisible(),
      false,
      "Portfolio copy stays hidden during exploration despite inline scroll styles",
    );
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(500);
    await page.keyboard.up("KeyD");
    const x = await page
      .locator("#forest-stage canvas")
      .getAttribute("data-walk-x");
    assert(+x > 0.2);
    await page.keyboard.press("Escape");
    await page.waitForSelector('canvas[data-exiting="true"]');
    assert(
      await page
        .locator("body")
        .evaluate((e) => e.classList.contains("exploring")),
      "Keep the world active during the return flight",
    );
    await page.waitForFunction(
      () => !document.body.classList.contains("exploring"),
    );
    assert(
      !(await page
        .locator("body")
        .evaluate((e) => e.classList.contains("exploring"))),
    );
    assert.equal(
      await page.evaluate(() => scrollY),
      savedScroll,
      "Exit restores the original website scroll position",
    );
    await page.screenshot({
      path: require("node:path").resolve(
        __dirname,
        "../previews/forest-website.png",
      ),
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(
      [...modelRequests],
      ["/assets/models/bird.glb"],
      "Only the active distant bird asset should load; pixel scenes need no imported landscape or aircraft",
    );
    console.log(
      "PASS preview/main entry, keyboard movement, exit and contact integration",
    );
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobile.goto("http://localhost:8080/forest-preview.html");
    await mobile.waitForSelector("body[data-ready=true]");
    await mobile.click("#explore-button");
    assert(await mobile.locator(".explore-stick").isVisible());
    await mobile.waitForFunction(
      () => document.querySelector("canvas").dataset.walkZ,
    );
    assert.match(
      await mobile.locator(".explore-help").textContent(),
      /joystick.*look around/,
    );
    const before = +(await mobile
      .locator("canvas")
      .getAttribute("data-walk-z"));
    const pad = await mobile.locator(".explore-stick").boundingBox();
    const client = await mobile.context().newCDPSession(mobile);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: pad.x + 56, y: pad.y + 20 }],
    });
    await mobile.waitForTimeout(500);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    const after = +(await mobile.locator("canvas").getAttribute("data-walk-z"));
    assert(after < before);
    await mobile.click(".explore-exit");
    await mobile.waitForFunction(
      () => !document.body.classList.contains("exploring"),
    );
    console.log("PASS mobile joystick and exit");
  } finally {
    await browser.close();
  }
})();
