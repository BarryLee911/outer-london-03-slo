const scene = document.querySelector("#route-scene");
const mapCard = document.querySelector(".map-card");
const mapCamera = document.querySelector("#map-camera");
const routePath = document.querySelector("#route-path");
const routeShadow = document.querySelector(".route-shadow");
const stations = Array.from(document.querySelectorAll(".station"));
const completionLabel = document.querySelector("#completion-label");
const heroActions = document.querySelector(".hero-actions");
const heroActionLinks = Array.from(document.querySelectorAll(".hero-actions a"));
const siteNav = document.querySelector(".site-nav");
const heatmapSection = document.querySelector("#corridor");
const heatmapCard = document.querySelector(".heatmap-card");
const heatmapHotspots = Array.from(document.querySelectorAll(".heatmap-hotspot"));
const sloSchematic = document.querySelector("[data-slo-schematic]");
const sloSticky = document.querySelector(".works-sticky");
const sloRouteWest = document.querySelector(".slo-route-west");
const sloRouteEast = document.querySelector(".slo-route-east");
const sloStations = Array.from(document.querySelectorAll(".slo-station"));
const sloStepCards = Array.from(document.querySelectorAll("[data-slo-step]"));
const revealItems = Array.from(document.querySelectorAll(".reveal, .reveal-card"));
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const compactSchematicQuery = window.matchMedia("(max-width: 980px)");

let routeLength = 0;
let sloWestLength = 0;
let sloEastLength = 0;
let lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
let navHidden = false;
let navTicking = false;

const fallbackContent = {
  references: `[1] Transport for London — Travel in London reports.
[2] Office for National Statistics — Census 2021.
[3] TfL Journey Planner and Google Maps driving directions, checked 9 June 2026.
[4] Bonjour RATP — Metro Line 15.
[5] Webuild — Grand Paris Express Line 15.`,
  imageCredits: `- Route schematic: created by authors for academic assessment purposes.
- Paris Line 15 diagram: simplified diagram redrawn by authors based on Bonjour RATP and Webuild.
- Map background: © OpenStreetMap contributors.`,
  gaiStatement: "GAI statement to be finalised by the group before submission.",
  updatedAt: null,
  updatedBy: null,
};

/* Edit camera stops here to tune the pseudo-3D flyover path. */
const cameraStops = [
  { progress: 0, focusX: 118, focusY: 172, scale: 2.05, tilt: 18, rotate: -7 },
  { progress: 0.2, focusX: 176, focusY: 356, scale: 1.9, tilt: 16, rotate: -5 },
  { progress: 0.42, focusX: 358, focusY: 306, scale: 1.65, tilt: 12, rotate: -2 },
  { progress: 0.62, focusX: 518, focusY: 392, scale: 1.48, tilt: 8, rotate: 1 },
  { progress: 0.8, focusX: 678, focusY: 344, scale: 1.28, tilt: 4, rotate: 2 },
  { progress: 0.96, focusX: 852, focusY: 252, scale: 1.08, tilt: 1, rotate: 0 },
  { progress: 1, focusX: 500, focusY: 310, scale: 1, tilt: 0, rotate: 0 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function setNavHidden(hidden) {
  if (!siteNav || navHidden === hidden) {
    return;
  }

  navHidden = hidden;
  siteNav.classList.toggle("is-hidden", hidden);
  document.documentElement.classList.toggle("nav-hidden", hidden);
  document.body.classList.toggle("nav-hidden", hidden);
}

function updateScrollAwareNav() {
  if (!siteNav) {
    return;
  }

  const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
  const delta = currentScrollY - lastScrollY;

  if (currentScrollY < 24) {
    setNavHidden(false);
  } else if (delta > 12) {
    setNavHidden(true);
  } else if (delta < -8) {
    setNavHidden(false);
  }

  lastScrollY = currentScrollY;
}

function requestNavUpdate() {
  if (navTicking) {
    return;
  }

  navTicking = true;
  window.requestAnimationFrame(() => {
    updateScrollAwareNav();
    navTicking = false;
  });
}

function setHeroComplete(isComplete) {
  scene?.classList.toggle("hero-complete", isComplete);

  if (!heroActions) {
    return;
  }

  heroActions.setAttribute("aria-hidden", isComplete ? "false" : "true");
  heroActionLinks.forEach((link) => {
    if (isComplete) {
      link.removeAttribute("tabindex");
    } else {
      link.setAttribute("tabindex", "-1");
    }
  });
}

function getCameraStop(progress) {
  const nextIndex = cameraStops.findIndex((stop) => progress <= stop.progress);

  if (nextIndex <= 0) {
    return cameraStops[0];
  }

  const previous = cameraStops[nextIndex - 1];
  const next = cameraStops[nextIndex] || cameraStops[cameraStops.length - 1];
  const span = Math.max(0.001, next.progress - previous.progress);
  const amount = smoothStep((progress - previous.progress) / span);

  return {
    focusX: lerp(previous.focusX, next.focusX, amount),
    focusY: lerp(previous.focusY, next.focusY, amount),
    scale: lerp(previous.scale, next.scale, amount),
    tilt: lerp(previous.tilt, next.tilt, amount),
    rotate: lerp(previous.rotate, next.rotate, amount),
  };
}

function getScrollProgress() {
  const rect = scene.getBoundingClientRect();
  const scrollableDistance = Math.max(1, rect.height - window.innerHeight);
  const progress = clamp(-rect.top / scrollableDistance, 0, 1);
  return progress > 0.995 ? 1 : progress;
}

function setCameraProgress(progress) {
  const camera = getCameraStop(progress);
  const cardRect = mapCard.getBoundingClientRect();
  const centerX = cardRect.width / 2;
  const centerY = cardRect.height / 2;
  const focusX = (camera.focusX / 1000) * cardRect.width;
  const focusY = (camera.focusY / 620) * cardRect.height;
  const finalPullback = progress < 0.86 ? 1 : 1 - smoothStep((progress - 0.86) / 0.14);
  const followStrength = 0.72 * finalPullback;
  const translateX = (centerX - focusX) * camera.scale * followStrength;
  const translateY = (centerY - focusY) * camera.scale * followStrength;

  mapCamera.style.setProperty("--camera-x", `${translateX.toFixed(2)}px`);
  mapCamera.style.setProperty("--camera-y", `${translateY.toFixed(2)}px`);
  mapCamera.style.setProperty("--camera-scale", camera.scale.toFixed(3));
  mapCamera.style.setProperty("--camera-tilt", `${camera.tilt.toFixed(2)}deg`);
  mapCamera.style.setProperty("--camera-rotate", `${camera.rotate.toFixed(2)}deg`);
}

function setRouteProgress(progress) {
  const visibleLength = routeLength * progress;
  const offset = `${routeLength - visibleLength}`;

  routePath.style.strokeDashoffset = offset;
  routeShadow.style.strokeDashoffset = offset;

  stations.forEach((station) => {
    const revealAt = Number.parseFloat(station.dataset.progress || "1");
    station.classList.toggle("is-visible", progress >= revealAt);
  });

  completionLabel.classList.toggle("is-visible", progress >= 0.985);
  setHeroComplete(progress >= 0.88);
}

function setHeatmapProgress() {
  if (!heatmapSection) {
    return;
  }

  if (reducedMotionQuery.matches) {
    heatmapHotspots.forEach((hotspot) => hotspot.classList.add("is-visible"));
    return;
  }

  const rect = heatmapSection.getBoundingClientRect();
  const start = window.innerHeight * 0.35;
  const end = -window.innerHeight * 1.05;
  const progress = clamp((start - rect.top) / Math.max(1, start - end), 0, 1);

  heatmapHotspots.forEach((hotspot) => {
    const revealAt = Number.parseFloat(hotspot.dataset.revealAt || "0");
    hotspot.classList.toggle("is-visible", progress >= revealAt);
  });
}

function getSloSchematicProgress() {
  if (!sloSchematic) {
    return 0;
  }

  const rect = sloSchematic.getBoundingClientRect();

  if (compactSchematicQuery.matches && sloSticky) {
    const stickyTop = Number.parseFloat(getComputedStyle(sloSticky).top) || window.innerHeight * 0.14;
    const stickyDrawDistance = Math.max(760, window.innerHeight * 0.92);
    return clamp((stickyTop - rect.top) / stickyDrawDistance, 0, 1);
  }

  const scrollableDistance = Math.max(1, rect.height - window.innerHeight);
  return clamp(-rect.top / scrollableDistance, 0, 1);
}

function setPathDrawProgress(path, length, progress) {
  if (!path || !length) {
    return;
  }

  const visibleLength = length * clamp(progress, 0, 1);
  path.style.strokeDashoffset = `${length - visibleLength}`;
}

function setSloSchematicProgress(progress) {
  if (!sloSchematic) {
    return;
  }

  if (reducedMotionQuery.matches) {
    progress = 1;
  }

  /* Edit step timing here. The west leg finishes at Sutton before the east leg starts. */
  const isCompactSchematic = compactSchematicQuery.matches;
  const step2Start = isCompactSchematic ? 0.42 : 0.48;
  const step3Start = isCompactSchematic ? 0.7 : 0.66;
  const eastStart = isCompactSchematic ? 0.7 : 0.62;
  const eastSpan = isCompactSchematic ? 0.26 : 0.32;
  const westProgress = clamp((progress - 0.08) / 0.36, 0, 1);
  const eastProgress = clamp((progress - eastStart) / eastSpan, 0, 1);
  const activeStep = progress < step2Start ? "1" : progress < step3Start ? "2" : "3";

  setPathDrawProgress(sloRouteWest, sloWestLength, westProgress);
  setPathDrawProgress(sloRouteEast, sloEastLength, eastProgress);

  sloSchematic.classList.toggle("is-step-2", progress >= step2Start && progress < step3Start);
  sloSchematic.classList.toggle("is-shared-corridor", progress >= step3Start);
  sloSchematic.classList.toggle("is-complete", progress >= 0.94);

  sloStepCards.forEach((card) => {
    const isActive = card.dataset.sloStep === activeStep;
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  sloStations.forEach((station) => {
    const index = Number.parseInt(station.dataset.stationIndex || "0", 10);
    const reachedAt = [0.12, 0.2, 0.34, 0.46, 0.74, 0.92][index] || 1;
    station.classList.toggle("is-reached", progress >= reachedAt);
  });
}

function update() {
  if (reducedMotionQuery.matches) {
    setRouteProgress(1);
    setCameraProgress(1);
    setHeatmapProgress();
    setSloSchematicProgress(1);
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const progress = getScrollProgress();

  setRouteProgress(progress);
  setCameraProgress(progress);
  setHeatmapProgress();
  setSloSchematicProgress(getSloSchematicProgress());
}

function setupRoute() {
  routeLength = routePath.getTotalLength();

  /* The line drawing uses stroke-dasharray and stroke-dashoffset by design. */
  routePath.style.strokeDasharray = `${routeLength}`;
  routePath.style.strokeDashoffset = `${routeLength}`;
  routeShadow.style.strokeDasharray = `${routeLength}`;
  routeShadow.style.strokeDashoffset = `${routeLength}`;

  update();
}

function setupSloSchematic() {
  if (!sloSchematic || !sloRouteWest || !sloRouteEast) {
    return;
  }

  sloWestLength = sloRouteWest.getTotalLength();
  sloEastLength = sloRouteEast.getTotalLength();

  /* Orange SLO paths use stroke-dasharray and stroke-dashoffset for drawing. */
  sloRouteWest.style.strokeDasharray = `${sloWestLength}`;
  sloRouteWest.style.strokeDashoffset = `${sloWestLength}`;
  sloRouteEast.style.strokeDasharray = `${sloEastLength}`;
  sloRouteEast.style.strokeDashoffset = `${sloEastLength}`;

  if (reducedMotionQuery.matches) {
    sloSchematic.classList.add("is-complete");
    sloStations.forEach((station) => station.classList.add("is-reached"));
    setPathDrawProgress(sloRouteWest, sloWestLength, 1);
    setPathDrawProgress(sloRouteEast, sloEastLength, 1);
  }
}

function setupRevealAnimations() {
  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  revealItems.forEach((item, index) => {
    if (item.classList.contains("reveal-card")) {
      item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 4) * 55}ms`);
    }
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.04,
      rootMargin: "0px 0px -2% 0px",
    },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

async function setupPrecedentVisual() {
  const visual = document.querySelector(".precedent-visual[data-precedent-src]");

  if (!visual) {
    return;
  }

  const src = visual.dataset.precedentSrc;

  try {
    const response = await fetch(src);

    if (!response.ok) {
      throw new Error("Precedent SVG unavailable");
    }

    const svgText = await response.text();
    const svg = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;

    if (svg.nodeName.toLowerCase() !== "svg") {
      throw new Error("Invalid precedent SVG");
    }

    svg.setAttribute("focusable", "false");
    visual.replaceChildren(document.importNode(svg, true));

    const track = visual.querySelector(".line-15-route-track");
    const routeLength = track?.getTotalLength?.() || 0;

    if (routeLength > 0) {
      visual.style.setProperty("--line-15-length", `${routeLength}`);
    }

    visual.querySelectorAll(".line-15-station-node").forEach((node, index) => {
      const nodeIndex = Number.parseInt(node.style.getPropertyValue("--node-index"), 10);
      const delayIndex = Number.isFinite(nodeIndex) ? nodeIndex : index;
      node.style.transitionDelay = `${520 + delayIndex * 58}ms`;
    });

    if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
      visual.classList.add("is-reduced-motion", "is-animated");
      return;
    }

    const animateObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          visual.classList.add("is-animated");
          animateObserver.unobserve(visual);
        });
      },
      {
        threshold: 0.38,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    animateObserver.observe(visual);
  } catch {
    visual.querySelector(".precedent-placeholder")?.removeAttribute("hidden");
  }
}

function setupHeatmapVisual() {
  document.querySelectorAll(".heatmap-card[data-heatmap-src]").forEach((card) => {
    const image = card.querySelector("img");
    const placeholder = card.querySelector(".heatmap-placeholder");

    const showPlaceholder = () => {
      card.classList.add("is-missing");
      placeholder?.removeAttribute("aria-hidden");
      image?.setAttribute("aria-hidden", "true");
    };

    const showImage = () => {
      card.classList.remove("is-missing");
      placeholder?.setAttribute("aria-hidden", "true");
      image?.removeAttribute("aria-hidden");
    };

    if (!image) {
      showPlaceholder();
      return;
    }

    image.addEventListener("load", () => {
      if (image.naturalWidth > 0) {
        showImage();
      } else {
        showPlaceholder();
      }
    });

    image.addEventListener("error", showPlaceholder);

    if (image.complete) {
      if (image.naturalWidth > 0) {
        showImage();
      } else {
        showPlaceholder();
      }
    }
  });
}

function normalizeContent(data) {
  const source = data && typeof data === "object" && data.content ? data.content : data;

  return {
    references:
      typeof source?.references === "string" && source.references.trim()
        ? source.references.trim()
        : fallbackContent.references,
    imageCredits:
      typeof source?.imageCredits === "string" && source.imageCredits.trim()
        ? source.imageCredits.trim()
        : fallbackContent.imageCredits,
    gaiStatement:
      typeof source?.gaiStatement === "string" && source.gaiStatement.trim()
        ? source.gaiStatement.trim()
        : fallbackContent.gaiStatement,
    updatedAt: typeof source?.updatedAt === "string" ? source.updatedAt : null,
    updatedBy: typeof source?.updatedBy === "string" ? source.updatedBy : null,
  };
}

function renderReferencesContent(content, isFallback = false) {
  const referencesText = document.querySelector("#references-text");
  const imageCreditsText = document.querySelector("#image-credits-text");
  const gaiStatementText = document.querySelector("#gai-statement-text");

  if (referencesText) {
    referencesText.textContent = content.references;
  }

  if (imageCreditsText) {
    imageCreditsText.textContent = content.imageCredits;
  }

  if (gaiStatementText) {
    gaiStatementText.textContent = content.gaiStatement;
  }
}

async function setupPublicContent() {
  try {
    const response = await fetch("/api/content", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Content API unavailable");
    }

    const data = await response.json();
    renderReferencesContent(normalizeContent(data), Boolean(data.fallback));
  } catch {
    renderReferencesContent(fallbackContent, true);
  }
}

function setupCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.querySelector(`#${button.dataset.copyTarget}`);
      const text = target?.textContent?.trim();

      if (!text) {
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      const originalText = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    });
  });
}

function handleScroll() {
  update();
  requestNavUpdate();
}

siteNav?.addEventListener("focusin", () => setNavHidden(false));

window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("resize", () => {
  lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
  update();
});
reducedMotionQuery.addEventListener("change", () => {
  revealItems.forEach((item) => item.classList.add("is-visible"));
  update();
});

setupHeatmapVisual();
setupPrecedentVisual();
setupRevealAnimations();
setupPublicContent();
setupCopyButtons();
setupSloSchematic();
setupRoute();
