// STRCTR Motion + Interactions Layer
// Add as a new file and initialize from index.html AFTER the DOM is ready.
// This file is intentionally self-contained and avoids changing existing app logic.

export function initStrctrMotion() {
  const root = document.documentElement;
  root.classList.add('motion-ready');

  injectBaseStyles();
  wireSectionReveal();
  wireButtonStates();
  wireLiveDots();
  wireSystemCardRefresh();
  wireLockedFieldSwaps();
  wireMicroSystemLines();
  wireCardHoverStates();
  wireAccessCardLabels();
  wireFinalCtaConnect();
}

function injectBaseStyles() {
  if (document.getElementById('strctr-motion-styles')) return;

  const style = document.createElement('style');
  style.id = 'strctr-motion-styles';
  style.textContent = `
    :root {
      --strctr-ease: cubic-bezier(0.22, 1, 0.36, 1);
      --strctr-blue: #4d63ff;
      --strctr-blue-soft: rgba(77, 99, 255, 0.18);
      --strctr-blue-border: rgba(77, 99, 255, 0.42);
      --strctr-text-dim: rgba(216, 224, 255, 0.42);
      --strctr-text-mid: rgba(216, 224, 255, 0.68);
    }

    html.motion-ready body {
      background-image:
        radial-gradient(circle at 30% 18%, rgba(77, 99, 255, 0.06), transparent 24%),
        radial-gradient(circle at 72% 54%, rgba(77, 99, 255, 0.04), transparent 26%),
        linear-gradient(90deg, rgba(77, 99, 255, 0.028) 0%, rgba(77, 99, 255, 0) 18%, rgba(77, 99, 255, 0.03) 48%, rgba(77, 99, 255, 0) 74%, rgba(77, 99, 255, 0.022) 100%);
      background-attachment: fixed;
    }

    .motion-section,
    [data-motion='section'] {
      opacity: 0;
      transform: translateY(18px);
      filter: blur(4px);
      transition:
        opacity 420ms var(--strctr-ease),
        transform 420ms var(--strctr-ease),
        filter 420ms var(--strctr-ease);
      will-change: opacity, transform, filter;
    }

    .motion-section.is-visible,
    [data-motion='section'].is-visible {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }

    .motion-item,
    [data-motion='item'] {
      opacity: 0;
      transform: translateY(8px);
      transition:
        opacity 280ms var(--strctr-ease),
        transform 280ms var(--strctr-ease);
      will-change: opacity, transform;
    }

    .motion-section.is-visible .motion-item,
    [data-motion='section'].is-visible [data-motion='item'] {
      opacity: 1;
      transform: translateY(0);
    }

    .strctr-glow-soft {
      text-shadow: 0 0 18px rgba(77, 99, 255, 0.16), 0 0 34px rgba(77, 99, 255, 0.08);
    }

    .strctr-live-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--strctr-blue);
      box-shadow: 0 0 10px rgba(77, 99, 255, 0.55);
      animation: strctrHeartbeat 2.4s infinite;
      vertical-align: middle;
      margin-right: 8px;
    }

    @keyframes strctrHeartbeat {
      0%, 100% { opacity: 0.42; transform: scale(0.88); }
      45% { opacity: 1; transform: scale(1); }
      55% { opacity: 0.78; transform: scale(0.94); }
    }

    .strctr-refreshing {
      animation: strctrRefresh 420ms var(--strctr-ease);
    }

    @keyframes strctrRefresh {
      0% { opacity: 1; }
      40% { opacity: 0.54; }
      100% { opacity: 1; }
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
        border-color 180ms var(--strctr-ease),
        box-shadow 180ms var(--strctr-ease),
        background-color 180ms var(--strctr-ease),
        transform 180ms var(--strctr-ease);
      will-change: transform, box-shadow;
    }

    .strctr-hover-card:hover,
    [data-motion='card']:hover {
      transform: translateY(-2px);
      border-color: rgba(77, 99, 255, 0.28) !important;
      box-shadow: 0 0 0 1px rgba(77, 99, 255, 0.08), 0 18px 42px rgba(4, 8, 22, 0.22);
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

    .strctr-core-pulse {
      animation: strctrCorePulse 4.2s infinite;
    }

    @keyframes strctrCorePulse {
      0%, 100% { box-shadow: 0 0 0 1px rgba(77, 99, 255, 0.18), 0 0 22px rgba(77, 99, 255, 0.06); }
      50% { box-shadow: 0 0 0 1px rgba(77, 99, 255, 0.28), 0 0 30px rgba(77, 99, 255, 0.12); }
    }
  `;

  document.head.appendChild(style);
}

function wireSectionReveal() {
  const sections = [...document.querySelectorAll('[data-motion="section"], .motion-section')];
  if (!sections.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const section = entry.target;
      section.classList.add('is-visible');
      staggerSectionItems(section);
      io.unobserve(section);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -12% 0px' });

  sections.forEach((section) => io.observe(section));
}

function staggerSectionItems(section) {
  const items = [...section.querySelectorAll('[data-motion="item"], .motion-item')];
  items.forEach((item, index) => {
    item.style.transitionDelay = `${index * 70}ms`;
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

  cta.classList.add('strctr-button-swap');
  cta.addEventListener('mouseenter', () => cta.classList.add('is-hover'));
  cta.addEventListener('mouseleave', () => cta.classList.remove('is-hover'));
  cta.addEventListener('click', () => {
    cta.classList.add('is-active');
    setTimeout(() => cta.classList.remove('is-active'), 1200);
  });
}

function wireLiveDots() {
  document.querySelectorAll('[data-role="live-dot"]').forEach((dot) => {
    dot.classList.add('strctr-live-dot');
  });
}

function wireSystemCardRefresh() {
  const refreshables = [...document.querySelectorAll('[data-role="refreshable"]')];
  const statusLine = document.querySelector('[data-role="refresh-status"]');
  if (!refreshables.length) return;

  const tick = () => {
    const item = refreshables[Math.floor(Math.random() * refreshables.length)];
    item.classList.add('strctr-refreshing');
    if (statusLine) pulseSystemLine(statusLine, '> updating...');
    setTimeout(() => item.classList.remove('strctr-refreshing'), 420);

    const next = 6000 + Math.random() * 6000;
    window.setTimeout(tick, next);
  };

  window.setTimeout(tick, 2400);
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

function wireMicroSystemLines() {
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
  // force reflow
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

  const coreCard = document.querySelector('[data-role="core-card"]');
  if (coreCard) coreCard.classList.add('strctr-core-pulse');
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
