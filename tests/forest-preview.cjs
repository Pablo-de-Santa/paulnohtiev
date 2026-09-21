const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:8080/forest-preview.html");
    await p.waitForSelector("body[data-ready=true]");
    for (const season of ["autumn", "winter", "spring", "summer"]) {
      await p.locator("button[data-season=" + season + "]").click();
      await p.waitForTimeout(3400);
      await p.screenshot({
        path: require("node:path").resolve(
          __dirname,
          "../previews/forest-" + season + ".png",
        ),
      });
      console.log(season, await p.evaluate(() => window.forestStats));
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({
      path: require("node:path").resolve(
        __dirname,
        "../previews/forest-mobile.png",
      ),
    });
    assert.deepEqual(errors, []);
    console.log("PASS four seasons and mobile with no runtime errors");
  } finally {
    await b.close();
  }
})();
