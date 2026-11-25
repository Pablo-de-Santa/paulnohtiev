const assert = require("node:assert/strict");
const { chromium, devices } = require("playwright");

const origin = process.env.CAMP_URL || "http://localhost:8080";
const ballName = "Odie’s ball";

async function enter(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/forest-preview.html`);
  await page.waitForSelector("body[data-ready=true]");
  await page.click("#explore-button");
  await page.waitForFunction(() => forestDebug.exploration.active);
  return errors;
}

async function aim(page, position, target) {
  await page.evaluate(({ position, target }) => {
    const exploration = forestDebug.exploration;
    exploration.setLocked(true);
    exploration.camera.position.set(...position);
    exploration.camera.lookAt(...target);
    exploration.camera.updateMatrixWorld();
  }, { position, target });
}

async function ballPosition(page) {
  return page.evaluate((name) =>
    forestDebug.world.parent.getObjectByName(name).position.toArray(), ballName);
}

async function ballScreenPosition(page) {
  return page.evaluate((name) => {
    const { world, exploration } = forestDebug;
    const point = world.parent.getObjectByName(name).position.clone().project(exploration.camera);
    return [(point.x + 1) * innerWidth / 2, (1 - point.y) * innerHeight / 2];
  }, ballName);
}

async function waitForReturn(page) {
  await page.getByRole("status").filter({ hasText: "Odie brought the ball back" }).waitFor();
}

async function retrieveFirstBall(page, tap) {
  const position = [0, 1.7, 7];
  if (tap) {
    await aim(page, position, await ballPosition(page));
    await page.locator("[data-action=ball]").waitFor();
    await tap(...await ballScreenPosition(page));
  } else {
    await openOdieMenu(page);
    await page.getByRole("button", { name: "Play fetch", exact: true }).click();
    await aim(page, position, [0, 1.25, 3]);
  }
  await page.getByRole("status").filter({ hasText: "Odie, where’s the ball?" }).waitFor();
  await waitForReturn(page);
  await aim(page, position, await ballPosition(page));
  const pickup = page.getByRole("button", { name: /Pick up ball/ });
  await pickup.waitFor();
  assert.equal(await pickup.textContent(), tap ? "Pick up ball" : "Pick up ball · E");
  await pickup.click();
  await page.getByRole("button", { name: "Throw ball" }).waitFor();
  const dot = await page.locator(".fetch-aim-dot").boundingBox();
  assert(dot);
  assert(Math.abs(dot.x + dot.width / 2 - page.viewportSize().width / 2) < 2);
  await page.waitForFunction(() => {
    const { dogAction, dogBallInterest, dogTail } = forestDebug.world.userData;
    return !dogAction?.sit && dogBallInterest?.level > 0 && Math.abs(dogTail.rotation.y) > 0.08;
  });
}

async function waitForOdieToSit(page) {
  await page.waitForFunction(() => {
    const { dogAction, dog } = forestDebug.world.userData;
    return dogAction?.sit && dog.scale.y < 0.82;
  });
}

async function waitForFullPower(page) {
  await page.waitForFunction(() => {
    const meter = document.querySelector(".fetch-power");
    return !meter.hidden && meter.getAttribute("aria-valuenow") === "100";
  });
}

async function openOdieMenu(page) {
  const position = await page.evaluate(() => forestDebug.world.userData.dog.position.toArray());
  await aim(
    page,
    [position[0] - 1.8, 1.7, position[2]],
    [position[0], position[1] + 1.0, position[2]],
  );
  await page.getByRole("button", { name: /Interact with Odie/ }).click();
  return position;
}

async function offerTreat(page) {
  const position = await openOdieMenu(page);
  await page.getByRole("button", { name: "Treat", exact: true }).click();
  await page.waitForFunction(() => forestDebug.world.userData.dogTreat.visible);
  await page.waitForFunction(([x, y, z]) => {
    const p = forestDebug.world.userData.dog.position;
    return Math.hypot(p.x - x, p.z - z) > 0.4;
  }, position);
  await page.waitForFunction(() => !forestDebug.world.userData.dogTreat.visible);
}

(async () => {
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 850 }, reducedMotion: "reduce" });
    const errors = await enter(page);
    await retrieveFirstBall(page);
    await page.evaluate(() => forestDebug.exploration.setLocked(false));
    await page.mouse.move(650, 410);
    await page.mouse.down();
    await page.locator(".fetch-power").waitFor();
    await page.mouse.down({ button: "right" });
    await page.mouse.up({ button: "right" });
    await page.mouse.up();
    await waitForOdieToSit(page);
    assert(await page.locator(".fetch-aim-dot").isVisible(), "Right click cancels a charge and keeps the ball in hand");
    const dog = await page.evaluate(() => forestDebug.world.userData.dog.position.toArray());
    await aim(page, [dog[0], 1.7, dog[2] + 1.75], [dog[0], 0.58, dog[2]]);
    await page.keyboard.press("f");
    await page.getByRole("status").filter({ hasText: "Throw it a little farther" }).waitFor();
    assert(await page.locator(".fetch-aim-dot").isVisible());
    await aim(page, [0, 1.7, 7], [0, 1.3, 3]);
    await page.getByRole("button", { name: "Drop ball" }).click();
    await page.getByRole("button", { name: "Throw ball" }).waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => forestDebug.world.userData.dogAction), null);

    await aim(page, [0, 1.7, 7], await ballPosition(page));
    await page.locator("[data-action=ball]").waitFor();
    await page.mouse.click(...await ballScreenPosition(page));
    await page.getByRole("button", { name: "Throw ball" }).waitFor();
    const edge = [9.5, 1.7, 6];
    await aim(page, edge, [14.5, 1.65, 6]);
    await page.mouse.click(630, 410);
    await page.waitForFunction(() => forestDebug.world.userData.dog.position.x > 11);
    await waitForReturn(page);
    assert((await ballPosition(page))[0] < 12.8);

    await aim(page, edge, await ballPosition(page));
    await page.getByRole("button", { name: /Pick up ball/ }).waitFor();
    await page.mouse.click(...await ballScreenPosition(page));
    await page.getByRole("button", { name: "Throw ball" }).waitFor();
    await aim(page, [10, 1.7, 5], [10, 1.7, 1]);
    const startYaw = await page.evaluate(() => {
      const { exploration } = forestDebug;
      exploration.setLocked(false);
      exploration.syncLook();
      return exploration.camera.rotation.y;
    });
    await page.mouse.move(690, 410);
    await page.mouse.down();
    await page.locator(".fetch-power").waitFor();
    await page.mouse.move(297, 410, { steps: 8 });
    await page.waitForFunction((yaw) => forestDebug.exploration.camera.rotation.y - yaw > 1.5, startYaw);
    await waitForFullPower(page);
    await page.mouse.up();
    await page.getByRole("status").filter({ hasText: "Looks like this ball got away" }).waitFor();
    await page.getByRole("button", { name: "Throw ball" }).waitFor();
    assert.equal(await page.evaluate(() => forestDebug.world.userData.dogAction), null);

    await aim(page, [5.8, 1.4, 7], [5.8, 6.2, -3]);
    await page.keyboard.down("f");
    await waitForFullPower(page);
    await page.keyboard.up("f");
    await page.getByRole("status").filter({ hasText: "Looks like this ball got away" }).waitFor();
    await page.getByRole("button", { name: "Throw ball" }).waitFor();
    assert.equal(await page.evaluate(() => forestDebug.world.userData.dogAction), null);
    await aim(page, [1.5, 1.7, 2.7], [1.5, 1.7, -0.6]);
    await page.keyboard.down("f");
    await page.waitForFunction(() => +document.querySelector(".fetch-power").getAttribute("aria-valuenow") >= 24);
    await page.keyboard.up("f");
    await page.getByRole("status").filter({ hasText: "You shall not pass!" }).waitFor();
    await waitForReturn(page);
    await offerTreat(page);
    assert.deepEqual(errors, []);
    await page.close();

    const mobile = await browser.newPage({ ...devices["iPhone 13"], reducedMotion: "reduce" });
    const mobileErrors = await enter(mobile);
    await retrieveFirstBall(mobile, (x, y) => mobile.touchscreen.tap(x, y));
    const instructions = await mobile.locator(".fetch-instructions").textContent();
    assert.match(instructions, /Look down and release to cancel/);
    assert.doesNotMatch(instructions, /\bF\b|double|mouse/i);
    await aim(mobile, [0, 1.7, 7], [0, 1.7, 0]);
    await mobile.evaluate(() => {
      forestDebug.exploration.setLocked(false);
      forestDebug.exploration.syncLook();
    });
    const touch = await mobile.context().newCDPSession(mobile);
    const cancelCue = mobile.locator(".fetch-cancel");
    const dragToCancel = cancelCue.getByText("Drag here and release to cancel", { exact: true });
    const releaseToCancel = cancelCue.getByText("Release to cancel", { exact: true });
    assert(!(await cancelCue.isVisible()));
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart", touchPoints: [{ x: 180, y: 280 }],
    });
    await mobile.locator(".fetch-power").waitFor();
    await dragToCancel.waitFor();
    const glow = await cancelCue.boundingBox();
    assert.equal(Math.round(glow.y + glow.height), mobile.viewportSize().height);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: 180, y: 510 }],
    });
    await releaseToCancel.waitFor();
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: 180, y: 365 }],
    });
    await dragToCancel.waitFor();
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: 180, y: 510 }],
    });
    await releaseToCancel.waitFor();
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await mobile.getByRole("status").filter({ hasText: "Throw canceled." }).waitFor();
    await mobile.locator(".fetch-power").waitFor({ state: "hidden" });
    assert(await mobile.locator(".fetch-aim-dot").isVisible());
    assert(!(await cancelCue.isVisible()));
    await aim(mobile, [0, 1.7, 7], [0, 1.7, 0]);
    const throwButton = await mobile.getByRole("button", { name: "Throw ball" }).boundingBox();
    const x = throwButton.x + throwButton.width / 2;
    const y = throwButton.y + throwButton.height / 2;
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart", touchPoints: [{ x, y }],
    });
    await dragToCancel.waitFor();
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x, y: Math.min(y + 42, mobile.viewportSize().height - 8) }],
    });
    await releaseToCancel.waitFor();
    assert(Math.abs(await mobile.evaluate(() => forestDebug.exploration.camera.rotation.x)) < 0.01);
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cancelCue.waitFor({ state: "hidden" });
    assert(await mobile.locator(".fetch-aim-dot").isVisible(), "Releasing over the glow keeps the ball in hand");
    await aim(mobile, [0, 1.7, 7], [0, 1.7, 0]);
    await mobile.locator("body.explore-hud-idle").waitFor();
    await mobile.touchscreen.tap(180, 350);
    await mobile.locator("body.explore-hud-idle").waitFor({ state: "detached" });
    await mobile.waitForTimeout(400);
    assert(await mobile.locator(".fetch-aim-dot").isVisible(), "A wake tap keeps the ball in hand");
    await mobile.touchscreen.tap(180, 350);
    await mobile.touchscreen.tap(180, 350);
    await waitForOdieToSit(mobile);
    assert(await mobile.getByRole("button", { name: "Throw ball" }).isVisible());
    assert.deepEqual(mobileErrors, []);
    console.log("PASS fetch menu, aim and power, Paul reaction, Odie protection, treat, pickup, drop, mobile instructions, cancel glow, look-down cancel, touch squeak and terrain");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
