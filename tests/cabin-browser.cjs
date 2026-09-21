const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:8080/forest-preview.html");
    await page.waitForSelector("body[data-ready=true]");
    await page.screenshot({ path: "previews/forest-new-face.png" });
    await page.click("#explore-button");
    await page.waitForFunction(
      () => document.querySelector("canvas").dataset.entering === "false",
    );
    async function go(axis, target) {
      const key =
        axis === "x"
          ? target > +(await page.locator("canvas").getAttribute("data-walk-x"))
            ? "KeyD"
            : "KeyA"
          : target > +(await page.locator("canvas").getAttribute("data-walk-z"))
            ? "KeyS"
            : "KeyW";
      await page.keyboard.down(key);
      let last = 100;
      for (let i = 0; i < 160; i++) {
        await page.waitForTimeout(100);
        const v = +(await page
          .locator("canvas")
          .getAttribute("data-walk-" + axis));
        if (Math.abs(v - target) < 0.17) {
          await page.keyboard.up(key);
          return;
        }
        if (i > 20 && Math.abs(v - last) < 0.0001) {
          await page.keyboard.up(key);
          throw Error("Blocked at " + axis + " " + v + " heading to " + target);
        }
        last = v;
      }
      throw Error("walk timeout");
    }
    await page.waitForFunction(
      () => document.querySelector("canvas").dataset.walkZ,
    );
    await page.evaluate(() =>
      window.forestDebug.exploration.camera.position.set(5.8, 1.7, -1.5),
    );
    await page.waitForTimeout(300);
    await page.locator("[data-action=door]").click();
    await page.waitForTimeout(800);
    await go("z", -5.1);
    await page.screenshot({ path: "previews/cabin-interior.png" });
    await page.locator("[data-action=computer]").click();
    await page.getByRole("button", { name: "Résumé", exact: true }).click();
    await page.waitForSelector("dialog[open] iframe");
    assert(
      await page
        .locator("dialog")
        .evaluate((d) => d.getBoundingClientRect().width > 1000),
    );
    await page.frameLocator("dialog iframe").locator("img").first().waitFor();
    await page.waitForFunction(
      () =>
        document
          .querySelector("dialog iframe")
          .contentDocument.querySelector("img").naturalWidth > 0,
    );
    await page.screenshot({ path: "previews/cabin-computer.png" });
    await page.click(".dialog-close");
    assert(
      await page
        .locator("body")
        .evaluate((e) => e.classList.contains("exploring")),
    );
    // Look right toward the clock, then choose night and verify gradual change.
    await page.mouse.move(700, 450);
    await page.mouse.down();
    await page.mouse.move(830, 390, { steps: 10 });
    await page.mouse.up();
    await page.locator("[data-action=clock]").click({ timeout: 5000 });
    await page.getByRole("button", { name: "Night", exact: true }).click();
    const before = +(await page
      .locator(".clearing-life")
      .getAttribute("data-hour"));
    await page.waitForTimeout(4000);
    const after = +(await page
      .locator(".clearing-life")
      .getAttribute("data-hour"));
    assert.notEqual(before, after);
    await page.screenshot({ path: "previews/cabin-night.png" });
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    console.log(
      "PASS walk into cabin, computer focus, full-screen resume, clock and exit",
    );
  } finally {
    await browser.close();
  }
})();
