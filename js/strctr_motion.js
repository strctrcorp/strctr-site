// STRCTR Motion + Interactions Layer (V8)
// Self-contained; avoids changing existing app logic.

import { initStrctrIntelligence, pauseStrctrAmbient } from './strctr_intelligence.js';

const PROX_RADIUS = 200;
const STAGGER_MS = 48;
const REFRESH_MIN_MS = 6000;
const REFRESH_RANGE_MS = 2000;

export function initStrctrMotion() {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const v8Off =
    root.dataset.strctrV8 === '0' ||
    root.dataset.strctrV8 === 'false' ||
    localStorage.getItem('strctrV8') === '0';

  const v9Off =
    root.dataset.strctrV9 === '0' ||
    root.dataset.strctrV9 === 'false' ||
    localStorage.getItem('strctrV9') === '0';

  root.classList.add('motion-ready');
  if (!v8Off) root.classList.add('strctr-v8');

  injectBaseStyles();
  wireSectionReveal(reducedMotion);
  wireButtonStates();
  wireLiveDots();
  wireSystemCardRefresh(reducedMotion, v9Off);
  wireLockedFieldSwaps();
  wireMicroSystemLines(v9Off);
  wireCardHoverStates();
  wireAccessCardLabels();
  wireFinalCtaConnect();

  if (!v8Off && !reducedMotion) {
    wirePointerSystem();
    wireButtonShine();
  }

  if (!v9Off && !reducedMotion) {
    initStrctrIntelligence({ root, reducedMotion });
  }
}

function injectBaseStyles() {
  if (document.getElementById('strctr-motion-styles')) return;

  const style = document.createElement('style');
  style.id = 'strctr-motion-styles';
  style.textContent = `
    :root {
      --strctr-ease: cubic-bezier(0.22, 1, 0.36, 1);
      --strctr-blue: #3b82f6;
      --strctr-blue-soft: rgba(59, 130, 246, 0.14);
      --strctr-blue-border: rgba(59, 130, 246, 0.38);
      --strctr-text-dim: rgba(216, 224, 255, 0.42);
      --strctr-text-mid: rgba(216, 224, 255, 0.68);
    }

    /* Preserve index.html body background — no overlay stack here. */

    .motion-section,
    [data-motion='section'] {
      opacity: 0;
      transform: translateY(14px);
      transition:
        opacity 380ms var(--strctr-ease),
        transform 380ms var(--strctr-ease);
      will-change: opacity, transform;
    }

    .motion-section.is-visible,
    [data-motion='section'].is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    .motion-item,
    [data-motion='item'] {
      opacity: 0;
      transform: translateY(6px);
      transition:
        opacity 260ms var(--strctr-ease),
        transform 260ms var(--strctr-ease);
      will-change: opacity, transform;
    }

    .motion-section.is-visible .motion-item,
    [data-motion='section'].is-visible [data-motion='item'] {
      opacity: 1;
      transform: translateY(0);
    }

    .strctr-glow-soft {
      text-shadow: 0 0 14px rgba(59, 130, 246, 0.12), 0 0 28px rgba(59, 130, 246, 0.06);
    }

    .strctr-live-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--strctr-blue);
      box-shadow: 0 0 6px rgba(59, 130, 246, 0.32);
      vertical-align: middle;
      margin-right: 8px;
      opacity: 0.92;
    }

    .strctr-refreshing {
      animation: strctrRefresh 680ms var(--strctr-ease);
    }

    @keyframes strctrRefresh {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.88; }
    }

    .strctr-system-line {
      color: var(--strctr-text-dim);
      font-size: 12px;
      line-height: 1.5;
      letter-spacing: 0.08em;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 220ms var(--strctr-ease), transform 220ms var(--strctr-ease);
      white-space: nowrap;
    }

    .strctr-system-line.is-visible {
      opacity: 0.34;
      transform: translateY(0);
    }

    .strctr-system-line.is-pulse {
      opacity: 0;
      animation: strctrPulseLine 1200ms var(--strctr-ease);
    }

    @keyframes strctrPulseLine {
      0% { opacity: 0; transform: translateY(6px); }
      18% { opacity: 0.36; transform: translateY(0); }
      70% { opacity: 0.28; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-2px); }
    }

    .strctr-hover-card,
    [data-motion='card'] {
      transition:
        border-color 160ms var(--strctr-ease),
        box-shadow 160ms var(--strctr-ease),
        transform 180ms var(--strctr-ease);
      will-change: transform;
    }

    .strctr-hover-card:hover,
    [data-motion='card']:hover {
      transform: translateY(-1px);
      border-color: rgba(59, 130, 246, 0.26) !important;
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, 0.08),
        0 8px 24px rgba(0, 0, 0, 0.22);
    }

    .strctr-proximity-target {
      --strctr-prox: 0;
      transition:
        border-color 140ms var(--strctr-ease),
        box-shadow 140ms var(--strctr-ease);
    }

    html.strctr-v8 .strctr-proximity-target {
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, calc(var(--strctr-prox) * 0.18)),
        0 0 calc(8px + var(--strctr-prox) * 14px) rgba(59, 130, 246, calc(0.035 * var(--strctr-prox)));
    }

    .strctr-button-swap {
      position: relative;
      overflow: hidden;
    }

    .strctr-button-swap .default-label,
    .strctr-button-swap .hover-label,
    .strctr-button-swap .active-label {
      display: inline-block;
      transition: opacity 140ms var(--strctr-ease), transform 140ms var(--strctr-ease);
    }

    .strctr-button-swap .hover-label,
    .strctr-button-swap .active-label {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, calc(-50% + 6px));
      opacity: 0;
      pointer-events: none;
      white-space: nowrap;
    }

    .strctr-button-swap.is-hover .default-label {
      opacity: 0;
      transform: translateY(-6px);
    }

    .strctr-button-swap.is-hover .hover-label {
      opacity: 1;
      transform: translate(-50%, -50%);
    }

    .strctr-button-swap.is-active .default-label,
    .strctr-button-swap.is-active .hover-label {
      opacity: 0;
    }

    .strctr-button-swap.is-active .active-label {
      opacity: 1;
      transform: translate(-50%, -50%);
    }

    .strctr-locked-swap {
      transition: color 120ms var(--strctr-ease), opacity 120ms var(--strctr-ease);
    }

    .strctr-locked-swap.is-hover {
      color: rgba(255,255,255,0.78);
    }

    #strctr-cursor-glow {
      position: fixed;
      left: 0;
      top: 0;
      width: 380px;
      height: 380px;
      margin: -190px 0 0 -190px;
      pointer-events: none;
      z-index: 1;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 62%);
      opacity: 0.75;
      will-change: transform;
    }

    html.strctr-v8 main {
      position: relative;
      z-index: 2;
    }

    html.strctr-v8 .hero-stack .panel.panel-updating {
      animation: none;
    }

    html.strctr-v8 body::before {
      animation: none;
    }

    html.strctr-v8 .btn.strctr-btn-shine {
      position: relative;
      overflow: hidden;
    }

    html.strctr-v8 .btn.strctr-btn-shine::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(
        100deg,
        transparent 38%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 62%
      );
      transform: translateX(-130%);
      transition: transform 0.55s var(--strctr-ease);
      pointer-events: none;
    }

    html.strctr-v8 .btn.strctr-btn-shine:hover::after {
      transform: translateX(130%);
    }

    html.strctr-v8 .btn.strctr-gateway {
      transition: box-shadow 0.28s ease, border-color 0.28s ease;
    }

    html.strctr-v8 .btn.strctr-gateway:hover {
      border-color: rgba(59, 130, 246, 0.42) !important;
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, 0.18),
        0 0 16px rgba(59, 130, 246, 0.07);
    }

    @media (prefers-reduced-motion: reduce) {
      [data-motion='section'],
      .motion-section,
      [data-motion='item'],
      .motion-item {
        opacity: 1 !important;
        transform: none !important;
        transition-duration: 0.01ms !important;
      }
      #strctr-cursor-glow {
        display: none !important;
      }
      html.strctr-v8 .hero-stack .panel.panel-updating {
        animation: none !important;
      }
      html.strctr-v8 body::before {
        animation: none !important;
      }
      .strctr-proximity-target {
        box-shadow: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function wireSectionReveal(reducedMotion) {
  const sections = [...document.querySelectorAll('[data-motion="section"], .motion-section')];
  if (!sections.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = entry.target;
        section.classList.add('is-visible');
        staggerSectionItems(section, reducedMotion);
        io.unobserve(section);
      });
    },
    { threshold: 0.16, rootMargin: '0px 0px -12% 0px' }
  );

  sections.forEach((section) => io.observe(section));
}

function staggerSectionItems(section, reducedMotion) {
  const items = [...section.querySelectorAll('[data-motion="item"], .motion-item')];
  const delay = reducedMotion ? 0 : STAGGER_MS;
  items.forEach((item, index) => {
    const ms = Math.min(index * delay, 520);
    item.style.transitionDelay = reducedMotion ? '0ms' : `${ms}ms`;
  });
}

function wireButtonStates() {
  const buttons = [...document.querySelectorAll('[data-role="button-swap"]')];
  buttons.forEach((button) => {
    button.classList.add('strctr-button-swap');

    button.addEventListener('mouseenter', () => button.classList.add('is-hover'));
    button.addEventListener('mouseleave', () => {
      button.classList.remove('is-hover');
      if (!button.classList.contains('is-active')) button.blur();
    });
  });
}

function wireFinalCtaConnect() {
  const cta = document.querySelector('[data-role="cta-connect"]');
  if (!cta) return;

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  cta.classList.add('strctr-button-swap', 'strctr-gateway');
  cta.addEventListener('mouseenter', () => cta.classList.add('is-hover'));
  cta.addEventListener('mouseleave', () => cta.classList.remove('is-hover'));
  cta.addEventListener('click', () => {
    pauseStrctrAmbient(4200);
    cta.classList.add('is-active');
    setTimeout(() => cta.classList.remove('is-active'), 1200);

    const statusLine = document.querySelector('[data-role="refresh-status"]');
    const run = async () => {
      await delay(240);
      if (statusLine) statusLine.textContent = '> connecting';
      await delay(320);
      if (statusLine) statusLine.textContent = '> stream open';
      await delay(680);
      if (statusLine) statusLine.textContent = '';
    };
    void run();
  });
}

function wireLiveDots() {
  document.querySelectorAll('[data-role="live-dot"]').forEach((dot) => {
    dot.classList.add('strctr-live-dot');
  });
}

function wireSystemCardRefresh(reducedMotion, v9Off) {
  const refreshables = [...document.querySelectorAll('[data-role="refreshable"]')];
  const statusLine = document.querySelector('[data-role="refresh-status"]');
  if (!refreshables.length) return;
  if (reducedMotion) return;
  if (!v9Off) return;

  const tick = () => {
    const item = refreshables[Math.floor(Math.random() * refreshables.length)];
    item.classList.add('strctr-refreshing');
    if (statusLine) pulseSystemLine(statusLine, '> updating...');
    window.setTimeout(() => item.classList.remove('strctr-refreshing'), 680);

    const next = REFRESH_MIN_MS + Math.random() * REFRESH_RANGE_MS;
    window.setTimeout(tick, next);
  };

  window.setTimeout(tick, 3200 + Math.random() * 2000);
}

function wireLockedFieldSwaps() {
  const swaps = [...document.querySelectorAll('[data-role="locked-swap"]')];
  swaps.forEach((el) => {
    el.classList.add('strctr-locked-swap');
    const original = el.textContent?.trim() || 'locked';
    const replacement = el.getAttribute('data-hover-text') || 'upgrade required';

    el.addEventListener('mouseenter', () => {
      el.classList.add('is-hover');
      el.textContent = replacement;
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('is-hover');
      el.textContent = original;
    });
  });
}

function wireMicroSystemLines(v9Off) {
  if (!v9Off) return;

  const ambientHosts = [...document.querySelectorAll('[data-role="ambient-lines"]')];
  const rotating = [
    '> monitoring...',
    '> scanning structure...',
    '> liquidity building',
    '> no anomaly detected',
    '> updating...',
    '> positioning stable'
  ];

  ambientHosts.forEach((host) => {
    const line = host.querySelector('.strctr-system-line') || host;
    if (!line.classList.contains('strctr-system-line')) line.classList.add('strctr-system-line');
    line.classList.add('is-visible');

    const loop = () => {
      const text = rotating[Math.floor(Math.random() * rotating.length)];
      pulseSystemLine(line, text);
      const next = 4000 + Math.random() * 4000;
      window.setTimeout(loop, next);
    };

    window.setTimeout(loop, 2800 + Math.random() * 1800);
  });
}

function pulseSystemLine(el, text) {
  el.textContent = text;
  el.classList.remove('is-visible', 'is-pulse');
  void el.offsetWidth;
  el.classList.add('is-pulse');
  window.setTimeout(() => {
    el.classList.remove('is-pulse');
    el.classList.add('is-visible');
  }, 1200);
}

function wireCardHoverStates() {
  document.querySelectorAll('[data-motion="card"]').forEach((card) => {
    card.classList.add('strctr-hover-card');
  });

}

function wireAccessCardLabels() {
  const cards = [...document.querySelectorAll('[data-role="access-card"]')];
  cards.forEach((card) => {
    const defaultLabel = card.querySelector('[data-role="access-default"]');
    const hoverLabel = card.querySelector('[data-role="access-hover"]');
    if (!defaultLabel || !hoverLabel) return;

    card.addEventListener('mouseenter', () => {
      defaultLabel.style.opacity = '0';
      defaultLabel.style.transform = 'translateY(-4px)';
      hoverLabel.style.opacity = '1';
      hoverLabel.style.transform = 'translateY(0)';
    });

    card.addEventListener('mouseleave', () => {
      defaultLabel.style.opacity = '1';
      defaultLabel.style.transform = 'translateY(0)';
      hoverLabel.style.opacity = '0';
      hoverLabel.style.transform = 'translateY(4px)';
    });
  });
}

function distToRect(px, py, r) {
  const nx = Math.max(r.left, Math.min(px, r.right));
  const ny = Math.max(r.top, Math.min(py, r.bottom));
  return Math.hypot(px - nx, py - ny);
}

/** Single rAF path: cursor glow + proximity (--strctr-prox). */
function wirePointerSystem() {
  if (document.getElementById('strctr-cursor-glow')) return;

  const glow = document.createElement('div');
  glow.id = 'strctr-cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(glow, document.body.firstChild);

  const nodes = document.querySelectorAll(
    '.card, .metric, .term-stat, .plan, .stream-item, .tier'
  );
  const targets = [...nodes];
  targets.forEach((t) => t.classList.add('strctr-proximity-target'));

  let mx = window.innerWidth * 0.5;
  let my = window.innerHeight * 0.35;
  let raf = 0;

  const frame = () => {
    raf = 0;
    glow.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      const r = el.getBoundingClientRect();
      const d = distToRect(mx, my, r);
      const prox = Math.max(0, 1 - d / PROX_RADIUS);
      el.style.setProperty('--strctr-prox', prox.toFixed(4));
    }
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const onPointer = (e) => {
    mx = e.clientX;
    my = e.clientY;
    schedule();
  };

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  frame();
}

function wireButtonShine() {
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.classList.add('strctr-btn-shine');
  });
}
