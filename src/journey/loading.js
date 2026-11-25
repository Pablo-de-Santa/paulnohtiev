// Independent of the module graph: a failed import must never trap the visitor.
(() => {
  const root = document.documentElement;
  if (matchMedia("(max-width: 700px), (pointer: coarse) and (max-height: 600px)").matches) {
    root.classList.add("journey-pending");
    window.journeyLoader = {
      mobile: true,
      finish() {
        root.classList.remove("journey-pending");
      },
    };
    return;
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = "manual";
  root.classList.add("journey-loading");
  let finished = false;
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
  window.journeyLoader = {
    show() {
      document.querySelector("#journey-loader").hidden = false;
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
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      const loader = document.querySelector("#journey-loader");
      if (loader && !immediate) await openCurtain(loader);
      loader?.remove();
      unlock();
    },
  };
  addEventListener(
    "DOMContentLoaded",
    () => {
      if (!finished) {
        document.querySelector("main")?.setAttribute("inert", "");
        scrollTo(0, 0);
      }
    },
    { once: true },
  );
  // Fail open if a script never arrives or the graphics driver stalls.
  const watchdog = setTimeout(() => window.journeyLoader.finish(true), 60000);
  addEventListener("error", (event) => {
    if (event.filename?.endsWith("/journey/main.js"))
      window.journeyLoader.finish(true);
  });
})();
