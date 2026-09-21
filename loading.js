// Independent of the module graph: a failed import must never trap the visitor.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = "manual";
  root.classList.add("journey-loading");
  let finished = false;
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
  window.journeyLoader = {
    show() {
      document.querySelector("#journey-loader").hidden = false;
    },
    async finish(immediate = false) {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      const loader = document.querySelector("#journey-loader");
      if (loader && !immediate && !reduced.matches) {
        loader.classList.add("opening");
        await new Promise((resolve) => setTimeout(resolve, 850));
      }
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
    if (event.filename?.endsWith("/script.js"))
      window.journeyLoader.finish(true);
  });
})();
