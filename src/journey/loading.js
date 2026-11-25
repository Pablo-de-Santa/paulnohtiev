// Independent of the module graph: a failed import must never trap the visitor.
(() => {
  const root = document.documentElement;
  const mobile = matchMedia("(max-width: 700px), (pointer: coarse) and (max-height: 600px)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = "manual";
  root.classList.add("journey-loading");
  let finished = false;
  let failed = false;
  let curtain;
  const preventScroll = (event) => event.preventDefault();
  const preventKeys = (event) => {
    if (
      [
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
        " ",
      ].includes(event.key)
    )
      event.preventDefault();
  };
  addEventListener("wheel", preventScroll, { passive: false });
  addEventListener("touchmove", preventScroll, { passive: false });
  addEventListener("keydown", preventKeys);
  const unlock = () => {
    root.classList.remove("journey-loading");
    document.querySelector("main")?.removeAttribute("inert");
    removeEventListener("wheel", preventScroll);
    removeEventListener("touchmove", preventScroll);
    removeEventListener("keydown", preventKeys);
    history.scrollRestoration = previousRestoration;
  };
  function openCurtain(loader) {
    if (!curtain) {
      loader.classList.add("opening");
      curtain = reduced.matches
        ? Promise.resolve()
        : new Promise((resolve) => setTimeout(resolve, 850));
    }
    return curtain;
  }
  function showFallback() {
    document.body.classList.add("scene-unavailable");
    document.querySelector("#scene-error")?.removeAttribute("hidden");
    document.querySelector("#explore-button")?.setAttribute("disabled", "");
    for (const copy of document.querySelectorAll("#welcome-copy, #earth-copy, #contact-copy"))
      copy.inert = false;
  }
  function fail() {
    if (failed) return;
    failed = finished = true;
    clearTimeout(watchdog);
    document.querySelector("#journey-loader")?.remove();
    unlock();
    window.dispatchEvent(new Event("journey-load-failed"));
    showFallback();
  }
  window.journeyLoader = {
    mobile,
    fail,
    get failed() {
      return failed;
    },
    show() {
      const loader = document.querySelector("#journey-loader");
      if (finished) loader?.remove();
      else if (loader) loader.hidden = false;
    },
    revealWelcome() {
      const loader = document.querySelector("#journey-loader");
      if (finished || !loader) return;
      // Reveal the welcome while the later chapters are prepared. Input stays
      // locked until those chapters can be rendered on the first scroll.
      scrollTo({ top: 0, left: 0, behavior: "instant" });
      openCurtain(loader);
    },
    async finish(immediate = false) {
      if (immediate) return fail();
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      const loader = document.querySelector("#journey-loader");
      if (loader) await openCurtain(loader);
      if (failed) return;
      loader?.remove();
      unlock();
    },
  };
  addEventListener(
    "DOMContentLoaded",
    () => {
      if (failed) showFallback();
      else if (!finished) {
        document.querySelector("main")?.setAttribute("inert", "");
        scrollTo(0, 0);
      }
    },
    { once: true },
  );
  // Keep the static portfolio available if the module or graphics driver stalls.
  const watchdog = setTimeout(fail, 60000);
  addEventListener("error", (event) => {
    const entry = document.querySelector("script[data-journey-entry]");
    if (entry && (event.target === entry || event.filename === entry.src)) fail();
  }, true);
})();
