const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("**/tilt-test.html", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<div id="welcome-copy">Welcome</div>',
      }),
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:8080") +
        "/tilt-test.html",
    );
    const result = await page.evaluate(async () => {
      const { createDeviceTilt } = await import("/device-tilt.js");
      let calls = 0,
        suspended = false,
        enabled = false,
        state = "granted";
      window.DeviceOrientationEvent = {
        requestPermission: async () => {
          calls++;
          return state;
        },
      };
      const vector = {
          x: 0,
          y: 0,
          set(x, y) {
            this.x = x;
            this.y = y;
          },
        },
        snapshots = [];
      const options = {
        invalidate() {},
        isSuspended: () => suspended,
        isEnabled: () => enabled,
      };
      const sample = (beta, gamma) => {
        const e = new Event("deviceorientation");
        e.beta = beta;
        e.gamma = gamma;
        window.dispatchEvent(e);
      };
      let input = createDeviceTilt(vector, options);
      snapshots.push(calls);
      document.querySelector("#welcome-copy").click();
      await new Promise((r) => setTimeout(r, 0));
      snapshots.push(calls);
      sample(0, 0);
      sample(60, -30);
      if (vector.x !== 0 || vector.y !== 0)
        throw new Error("Tilt moved before the shared scene gate");
      enabled = true;
      sample(35, 3);
      snapshots.push([vector.x, vector.y]);
      sample(44, 12);
      snapshots.push([vector.x, vector.y]);
      sample(null, null);
      snapshots.push([vector.x, vector.y]);
      suspended = true;
      sample(90, 60);
      snapshots.push([vector.x, vector.y]);
      suspended = false;
      sample(65, -10);
      snapshots.push([vector.x, vector.y]);
      window.dispatchEvent(new Event("orientationchange"));
      sample(20, 20);
      snapshots.push([vector.x, vector.y]);
      input.dispose();
      sample(40, 40);
      snapshots.push([vector.x, vector.y]);
      state = "denied";
      input = createDeviceTilt(vector, options);
      document.querySelector("#welcome-copy").click();
      await new Promise((r) => setTimeout(r, 0));
      sample(45, 45);
      snapshots.push([vector.x, vector.y]);
      document.dispatchEvent(
        new PointerEvent("pointerdown", { pointerType: "touch", clientX: 100 }),
      );
      document.dispatchEvent(
        new PointerEvent("pointermove", { pointerType: "touch", clientX: 200 }),
      );
      snapshots.push(vector.x > 0);
      input.dispose();
      snapshots.push(
        document.querySelector("#welcome-copy").hasAttribute("role"),
      );
      return snapshots;
    });
    assert.deepEqual(result, [
      0,
      1,
      [0, 0],
      [0.5, -0.5],
      [0.5, -0.5],
      [0.5, -0.5],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      true,
      false,
    ]);
    console.log(
      "PASS: permission gating, calibration, tilt mapping, invalid data, reduced motion, rotation reset, denied fallback and disposal.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
