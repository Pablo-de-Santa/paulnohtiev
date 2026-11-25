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
        reducedMotion: "no-preference",
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
    await page.mouse.move(520, 320);
    await page.evaluate(() => {
      window.wheelPositions = [];
      window.addEventListener("wheel", () => {
        const started = performance.now();
        const sample = (now) => {
          window.wheelPositions.push(scrollY);
          if (now - started < 500) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, { once: true, passive: true });
    });
    await page.mouse.wheel(0, 120);
    await page.waitForFunction(() => scrollY === 120);
    const positions = await page.evaluate(() => window.wheelPositions);
    assert(new Set(positions.filter((y) => y > 0 && y < 120)).size >= 4,
      "A single mouse-wheel notch moves through intermediate scroll positions");

    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.mouse.wheel(0, 120);
    await page.waitForFunction(() => scrollY > 5);
    await page.mouse.wheel(0, 120);
    await page.waitForFunction(() => scrollY === 240);
    await page.mouse.wheel(0, 120);
    await page.waitForFunction(() => scrollY > 245);
    await page.mouse.wheel(0, -120);
    await page.waitForFunction(() => scrollY < 240);

    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.mouse.wheel(0, 640);
    await page.waitForFunction(() => scrollY === Math.round(innerHeight * 0.18));
    assert.equal(await page.evaluate(() => scrollY), 162,
      "One accelerated wheel event is bounded to part of the viewport");

    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.mouse.wheel(2, 24);
    await page.waitForFunction(() => scrollY > 0);
    await page.mouse.wheel(1, 70);
    await page.waitForFunction(() => scrollY === 94);

    assert(await page.evaluate(() => {
      const dispatch = (deltaY, extra) => window.dispatchEvent(
        new WheelEvent("wheel", { deltaY, cancelable: true, ...extra }),
      );
      return !dispatch(5.5) && !dispatch(85) && dispatch(120, { ctrlKey: true });
    }), "Fine wheel bursts share the animated scroll path while pinch zoom stays native");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.keyboard.down("ArrowDown");
    await page.waitForFunction(() => scrollY > 100);
    const firstScroll = await page.evaluate(() => scrollY);
    await page.waitForFunction((start) => scrollY > start + 100, firstScroll);
    await page.keyboard.up("ArrowDown");
    const releasedScroll = await page.evaluate(() => scrollY);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => scrollY), releasedScroll);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    const pulseState = (phase) =>
      page.locator(".welcome h1, .welcome p").evaluateAll((elements, phase) => {
        return elements.map((e) => {
          const style = getComputedStyle(e);
          const glow = e.querySelector(".welcome-glow");
          const [animation] = glow.getAnimations();
          animation.pause();
          animation.currentTime = phase * animation.effect.getTiming().duration;
          return {
            shadow: style.textShadow,
            opacity: style.opacity,
            transform: style.transform,
            glowOpacity: Number(getComputedStyle(glow).opacity),
          };
        });
      }, phase);
    const pulseBefore = await pulseState(0);
    const pulseAfter = await pulseState(0.5);
    for (let i = 0; i < 2; i++) {
      assert.equal(pulseBefore[i].opacity, pulseAfter[i].opacity);
      assert.equal(pulseBefore[i].transform, pulseAfter[i].transform);
      assert.equal(pulseBefore[i].shadow, pulseAfter[i].shadow);
      assert(pulseAfter[i].glowOpacity > pulseBefore[i].glowOpacity);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert(await page.evaluate(() => window.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 120, cancelable: true }),
    )), "Reduced motion keeps native wheel handling");

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
    const spaceCanvas = page.locator("#scene canvas");
    const beforeClick = await spaceCanvas.screenshot();
    await page.mouse.click(720, 450);
    await page.waitForTimeout(200);
    assert.ok(
      beforeClick.equals(await spaceCanvas.screenshot()),
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
      for (const phase of [1.95, 2.65, 3.72, 4.32, 5.99]) {
        await jump(phase);
        if (phase === 2.65) {
          const box = await page.locator("#earth-copy").boundingBox();
          assert.ok(
            box.y >= 0 && box.y + box.height <= 844,
            "Earth copy stays in the viewport",
          );
        }
        if (phase === 3.72 && width <= 390) {
          const gutters = await page.locator("#pixel-copy").evaluate((copy) => {
            const { left, right } = copy.getBoundingClientRect();
            return [left, innerWidth - right];
          });
          assert(gutters.every((gutter) => gutter >= 24),
            "The pixel-world caption has breathing room on both sides");
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
    const still = await spaceCanvas.screenshot();
    await page.waitForTimeout(400);
    assert.ok(
      still.equals(await spaceCanvas.screenshot()),
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
