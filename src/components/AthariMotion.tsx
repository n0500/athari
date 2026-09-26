"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTORS = [
  ".exact-stat",
  ".share-v5-summary-card",
  ".exact-section-head",
  ".share-v5-section-head",
  ".exact-element-card",
  ".share-v5-element-card",
  ".exact-evidence-card",
  ".share-v5-evidence-card",
  ".exact-info-card",
  ".share-v5-detail-card",
  ".exact-support-grid article",
  ".share-v5-support-item",
  ".exact-detail-evidence",
  ".share-v5-detail-evidence",
  ".exact-preview-summary",
  ".exact-preview-elements",
  ".exact-preview-row",
  ".exact-share-manager",
  ".exact-add-evidence",
].join(",");

const HERO_SELECTORS = [
  ".exact-hero",
  ".share-v5-hero",
  ".exact-preview-hero",
  ".exact-element-hero",
  ".share-v5-detail-hero",
].join(",");

const STAGGER_PARENTS = [
  ".exact-stat-grid",
  ".share-v5-summary-grid",
  ".exact-element-grid",
  ".share-v5-elements-grid",
  ".exact-evidence-grid",
  ".share-v5-evidence-grid",
  ".exact-support-grid",
  ".share-v5-support-grid",
  ".exact-detail-list",
  ".share-v5-detail-list",
  ".exact-preview-list",
].join(",");

function animatePercent(node: HTMLElement, target: number, duration = 950) {
  if (node.dataset.motionAnimated === String(target)) return;
  node.dataset.motionAnimated = String(target);

  const started = performance.now();

  const frame = (now: number) => {
    const elapsed = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const current = Math.round(target * eased);
    node.textContent = `${current}%`;
    if (elapsed < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

function runCounters(scope: ParentNode) {
  const counters = scope.querySelectorAll<HTMLElement>(
    ".exact-progress strong, .share-v5-ring strong"
  );

  counters.forEach((counter) => {
    const raw = counter.textContent?.trim() ?? "";
    const match = raw.match(/(\d+)\s*%/);
    if (!match) return;

    const target = Number(match[1]);
    if (!Number.isFinite(target)) return;
    animatePercent(counter, target);
  });
}

export function AthariMotion() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scope = document.querySelector<HTMLElement>(".app-frame") ?? document.body;
    if (!scope) return;

    if (reduced) {
      scope.classList.add("athari-motion-reduced");
      return;
    }

    scope.classList.add("athari-motion-enabled");

    const page = scope.querySelector<HTMLElement>(".page-content, .share-v5-page");
    if (page) {
      page.classList.remove("athari-page-enter");
      void page.offsetWidth;
      page.classList.add("athari-page-enter");
    }

    const heroes = scope.querySelectorAll<HTMLElement>(HERO_SELECTORS);
    heroes.forEach((hero, index) => {
      hero.classList.add("athari-hero-motion");
      hero.style.setProperty("--athari-delay", `${index * 50}ms`);
      requestAnimationFrame(() => hero.classList.add("is-visible"));
    });

    const staggerParents = scope.querySelectorAll<HTMLElement>(STAGGER_PARENTS);
    staggerParents.forEach((parent) => {
      [...parent.children].forEach((child, index) => {
        if (!(child instanceof HTMLElement)) return;
        child.style.setProperty("--athari-stagger", `${Math.min(index, 6) * 58}ms`);
      });
    });

    const revealNodes = scope.querySelectorAll<HTMLElement>(REVEAL_SELECTORS);
    revealNodes.forEach((node) => node.classList.add("athari-reveal"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.classList.add("is-visible");
          observer.unobserve(target);
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -4% 0px",
      }
    );

    revealNodes.forEach((node) => observer.observe(node));

    const timers = [
      window.setTimeout(() => runCounters(scope), 60),
      window.setTimeout(() => runCounters(scope), 320),
      window.setTimeout(() => runCounters(scope), 850),
      window.setTimeout(() => runCounters(scope), 1500),
    ];

    return () => {
      observer.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, [pathname]);

  return null;
}
