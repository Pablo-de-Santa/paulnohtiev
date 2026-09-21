const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TEST_BASE_URL || "http://localhost:8080";
async function run() {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(baseURL);
    await page.waitForSelector("#scene[data-ready=true]", { timeout: 60000 });
    assert.equal(
      await page.locator("#scene").getAttribute("data-asset-failures"),
      "",
    );
    assert.equal(await page.locator("header,nav").count(), 0);
    assert.equal(
      await page.locator("#welcome-copy").innerText(),
      "Welcome\n\nSCROLL DOWN",
    );
    assert.equal(await page.locator("#portfolio-link").isVisible(), false);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const pulseState = () =>
      page.locator(".welcome h1, .welcome p").evaluateAll((elements) =>
        elements.map((e) => {
          const s = getComputedStyle(e);
          return {
            shadow: s.textShadow,
            opacity: s.opacity,
            transform: s.transform,
            animation: s.animationName,
          };
        }),
      );
    const pulseBefore = await pulseState();
    await page.waitForTimeout(500);
    const pulseAfter = await pulseState();
    for (let i = 0; i < 2; i++) {
      assert.equal(
        pulseBefore[i].animation,
        i === 0 ? "welcome-pulse" : "scroll-glow",
      );
      assert.equal(pulseBefore[i].opacity, pulseAfter[i].opacity);
      assert.equal(pulseBefore[i].transform, pulseAfter[i].transform);
      assert.notEqual(pulseBefore[i].shadow, pulseAfter[i].shadow);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });

    const jump = async (phase) => {
      await page.evaluate((phase) => {
        const sections = [...document.querySelectorAll(".chapter")],
          i = Math.min(5, Math.floor(phase)),
          end = document.documentElement.scrollHeight - innerHeight,
          next = sections[i + 1]?.offsetTop ?? end;
        scrollTo({
          top:
            sections[i].offsetTop +
            (phase - i) * (next - sections[i].offsetTop),
          behavior: "instant",
        });
      }, phase);
      await page.waitForFunction(
        (p) =>
          Math.abs(Number(document.querySelector("#scene").dataset.phase) - p) <
          0.012,
        phase,
        { timeout: 20000 },
      );
      await page.waitForTimeout(250);
    };
    for (const phase of [0.62, 0.85, 1.05, 1.25, 1.6]) {
      await jump(phase);
      assert.equal(
        await page
          .locator("#atmosphere-veil")
          .evaluate((e) => Number(getComputedStyle(e).opacity)),
        0,
      );
    }
    await jump(0.88);
    assert.equal(await page.locator("#welcome-copy").isVisible(), false);
    await jump(1.22);
    await jump(1.99);
    assert.equal(
      await page.locator(".scene-controls, #motion-toggle").count(),
      0,
    );
    assert.equal(
      await page.locator("#scene").getAttribute("data-moon"),
      "false",
    );
    const beforeClick = await page.locator("canvas").screenshot();
    await page.mouse.click(720, 450);
    await page.waitForTimeout(200);
    assert.ok(
      beforeClick.equals(await page.locator("canvas").screenshot()),
      "Object clicks do nothing",
    );
    assert.equal(await page.locator("#interaction-status").textContent(), "");
    await jump(1.08);
    assert.equal(
      await page.locator("#scene").getAttribute("data-explosion"),
      "false",
    );
    await jump(1.34);
    assert.equal(
      await page.locator("#scene").getAttribute("data-journey"),
      "galaxies",
    );
    await jump(2.5);
    assert.equal(await page.locator("#earth-copy").isVisible(), true);
    assert.equal(
      await page.locator("#scene").getAttribute("data-moon"),
      "true",
    );
    await jump(2.95);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const moonBefore = Number(
      await page.locator("#scene").getAttribute("data-moon-angle"),
    );
    await page.waitForTimeout(700);
    const moonAfter = Number(
      await page.locator("#scene").getAttribute("data-moon-angle"),
    );
    assert.ok(
      moonAfter > moonBefore + 0.05,
      "Moon continues orbiting with Earth rotation locked",
    );
    assert.equal(
      await page.locator("#scene").getAttribute("data-earth-locked"),
      "true",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await jump(3.2);
    assert.equal(
      await page.locator("#scene").getAttribute("data-earth-locked"),
      "true",
    );
    await jump(3.55);
    assert.equal(await page.locator("#earth-copy").isVisible(), false);
    for (const [i, id] of [
      "airbus-a380",
      "boeing-787",
      "airbus-a320",
      "boeing-737",
    ].entries()) {
      await jump(4 + ((i + 0.5) * 0.87) / 4);
      assert.equal(
        await page.locator("#scene").getAttribute("data-aircraft"),
        id,
      );
      assert.equal(
        await page.locator(`[data-object="${id}"]`).isEnabled(),
        false,
      );
    }
    await jump(5.15);
    assert.ok(
      Number(await page.locator("#scene").getAttribute("data-camera-height")) >
        10,
    );
    await jump(5.99);
    assert.equal(
      await page.locator("#scene").getAttribute("data-clouds"),
      "false",
    );
    assert.equal(await page.locator("#contact-copy").isVisible(), true);
    assert.equal(await page.locator("#forest-stage canvas").count(), 1);
    for (const link of await page.locator('a[href$=".pdf"]').all()) {
      assert.equal(
        (
          await page.request.get(
            new URL(await link.getAttribute("href"), baseURL).href,
          )
        ).status(),
        200,
      );
    }
    assert.equal(
      (await page.request.get(new URL("credits.html", baseURL).href)).status(),
      200,
    );
    for (const width of [390, 320, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(450);
      for (const phase of [1.95, 2.65, 4.32, 5.99]) {
        await jump(phase);
        if (phase === 2.65) {
          const box = await page.locator("#earth-copy").boundingBox();
          assert.ok(
            box.y >= 0 && box.y + box.height <= 844,
            "Earth copy stays in the viewport",
          );
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      }
    }
    await jump(1.99);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(600);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(500);
    const still = await page.locator("canvas").screenshot();
    await page.waitForTimeout(400);
    assert.ok(
      still.equals(await page.locator("canvas").screenshot()),
      "Pause freezes orbit and idle motion",
    );
    assert.deepEqual(errors, []);
    const noWebGL = await browser.newPage();
    await noWebGL.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.startsWith("webgl") ? null : get.call(this, type, ...args);
      };
    });
    await noWebGL.goto(baseURL);
    await noWebGL.waitForSelector("body.scene-unavailable");
    assert.equal(await noWebGL.locator('a[href$=".pdf"]').count(), 2);
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(baseURL);
    assert.equal(await noJS.locator("#welcome-copy").isVisible(), true);
    assert.equal(await noJS.locator('a[href^="mailto:"]').count(), 1);
    console.log(
      "PASS: minimal copy, all assets, full scene sequence, shared interactions, four flight paths, contacts, mobile/resize alignment, reduced motion, inactive clicks, and fallbacks.",
    );
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
