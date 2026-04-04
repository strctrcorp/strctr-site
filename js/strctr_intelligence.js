/**
 * STRCTR V9 — System Intelligence Layer
 * Coordinated state + routing cues (not decorative animation).
 */

const CYCLE_MS = 56000;
const SEMANTIC_MS = 78000;
const IDLE_POINTER_MS = 28000;
const IDLE_POLL_MS = 14000;

const STAGES = ['Confirmation', 'Trigger', 'Setup'];
const TIMINGS = ['Optimal', 'Tight', 'Deferred'];
const PROBS = ['78%', '81%', '82%', '79%'];
const STATES = ['SHORT', 'LONG'];

const SCENARIO_HTML = [
  'Up <button class="glossary-term" type="button" popovertarget="glossary-trap">Trap</button> → Down',
  'Range <button class="glossary-term" type="button" popovertarget="glossary-trap">Trap</button> → Break'
];

const PLAN_HTML = [
  'Add → acceptance<br>Reduce → failure<br>Exit → invalidation',
  'Add → acceptance<br>Hold → failure<br>Exit → invalidation',
  'Scale → acceptance<br>Reduce → failure<br>Exit → invalidation'
];

export function initStrctrIntelligence({ root, reducedMotion }) {
  if (reducedMotion) return;
  if (document.getElementById('strctr-intel-styles')) return;

  const style = document.createElement('style');
  style.id = 'strctr-intel-styles';
  style.textContent = `
    .strctr-intel-focus {
      transition: box-shadow 0.35s ease, border-color 0.35s ease;
    }
    html.strctr-v8 .strctr-intel-focus {
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
    }

    .strctr-intel-route {
      transition: box-shadow 0.45s ease, border-color 0.45s ease, opacity 0.45s ease;
    }
    html.strctr-v8 .strctr-intel-route {
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, 0.12),
        0 0 18px rgba(59, 130, 246, 0.05);
    }

    .strctr-intel-semantic {
      transition: box-shadow 0.55s ease, opacity 0.55s ease;
    }
    html.strctr-v8 .strctr-intel-semantic {
      opacity: 0.99;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
    }

    .strctr-intel-ping {
      animation: strctrIntelPing 1.1s ease-out 1;
    }
    @keyframes strctrIntelPing {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      40% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.16), 0 0 16px rgba(59, 130, 246, 0.06); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }

    #accessTierBadge.strctr-intel-proc {
      animation: strctrIntelHb 5s ease-in-out infinite;
    }
    @keyframes strctrIntelHb {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.93; }
    }

    .strctr-intel-cycle-pulse {
      animation: strctrIntelCp 2.2s ease-in-out 1;
    }
    @keyframes strctrIntelCp {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.88; }
    }

    .strctr-intel-tick {
      transition: opacity 0.26s ease;
    }
    .strctr-intel-tick.strctr-intel-dim {
      opacity: 0.74;
    }

    @media (prefers-reduced-motion: reduce) {
      .strctr-intel-ping,
      #accessTierBadge.strctr-intel-proc,
      .strctr-intel-cycle-pulse {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  const terminal = document.querySelector('.hero-stack .terminal');
  if (!terminal) return;

  const grid = terminal.querySelector('.term-grid');
  const scenarioV = grid?.querySelector('.term-stat:nth-child(1) .v');
  const stageEl = grid?.querySelector('.term-stat:nth-child(2) .v');
  const probEl = document.getElementById('liveConfidence');
  const timingEl = grid?.querySelector('.term-stat:nth-child(4) .v');
  const stateEl = terminal.querySelector('.state');
  const planEl = terminal.querySelector('.plan .v');
  const statusEl = document.querySelector('[data-role="refresh-status"]');
  const pillEl = terminal.querySelector('.terminal-head .pill.blue');
  const liveEl = terminal.querySelector('.panel-top .live');

  const badge = document.getElementById('accessTierBadge');

  const cardScenario = document.querySelector('#system .system-grid .card:nth-child(1)');
  const cardExecution = document.querySelector('#system .system-grid .card:nth-child(2)');
  const cardOutput = document.querySelector('#outputs .outputs .card:nth-child(1)');
  const blockAccess = document.querySelector('#access .cta');

  const idlePool = [
    document.querySelector('.how-card'),
    document.querySelector('.trust-grid .trust-card'),
    document.querySelector('.action-grid .card')
  ].filter(Boolean);

  let si = 0;
  let ti = 0;
  let pi = 0;
  let sti = 0;
  let pli = 0;
  let sci = 0;

  let cycleLock = false;
  let lastPointer = Date.now();

  const paid = () => {
    const t = badge?.textContent?.trim().toUpperCase();
    return t === 'PRO' || t === 'CORE';
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function tickEl(el) {
    if (!el) return;
    el.classList.add('strctr-intel-tick', 'strctr-intel-dim');
    requestAnimationFrame(() => {
      el.classList.remove('strctr-intel-dim');
      setTimeout(() => el.classList.remove('strctr-intel-tick'), 280);
    });
  }

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  if (badge) badge.classList.add('strctr-intel-proc');

  async function runDecisionCycle() {
    if (cycleLock || document.hidden) return;
    cycleLock = true;
    try {
      pillEl?.classList.add('strctr-intel-cycle-pulse');
      liveEl?.classList.add('strctr-intel-cycle-pulse');
      setTimeout(() => {
        pillEl?.classList.remove('strctr-intel-cycle-pulse');
        liveEl?.classList.remove('strctr-intel-cycle-pulse');
      }, 2400);

      setStatus('> input…');
      await delay(380);

      sci = (sci + 1) % SCENARIO_HTML.length;
      if (scenarioV) {
        scenarioV.innerHTML = SCENARIO_HTML[sci];
        tickEl(scenarioV);
      }
      cardScenario?.classList.add('strctr-intel-route');
      setStatus('> scenario…');
      await delay(1600);

      cardScenario?.classList.remove('strctr-intel-route');
      si = (si + 1) % STAGES.length;
      if (stageEl) {
        stageEl.textContent = STAGES[si];
        tickEl(stageEl);
      }
      if (pillEl) pillEl.textContent = STAGES[si];
      setStatus('> confirm…');
      await delay(1400);

      ti = (ti + 1) % TIMINGS.length;
      if (timingEl) {
        timingEl.textContent = TIMINGS[ti];
        tickEl(timingEl);
      }
      setStatus('> timing…');
      await delay(1200);

      if (!paid() && probEl) {
        pi = (pi + 1) % PROBS.length;
        probEl.textContent = PROBS[pi];
        tickEl(probEl);
      }
      setStatus('> probability…');
      await delay(1100);

      sti = (sti + 1) % STATES.length;
      if (stateEl) {
        stateEl.textContent = STATES[sti];
        tickEl(stateEl);
      }
      setStatus('> state…');
      await delay(1200);

      setStatus('> entry…');
      await delay(700);

      pli = (pli + 1) % PLAN_HTML.length;
      if (planEl) {
        planEl.innerHTML = PLAN_HTML[pli];
        tickEl(planEl);
      }
      cardExecution?.classList.add('strctr-intel-route');
      setStatus('> plan…');
      await delay(2000);

      cardExecution?.classList.remove('strctr-intel-route');
      cardOutput?.classList.add('strctr-intel-route');
      setStatus('> route…');
      await delay(1600);

      cardOutput?.classList.remove('strctr-intel-route');
      setStatus('');
    } finally {
      cycleLock = false;
    }
  }

  const semantic = [
    () => cardScenario,
    () => cardExecution,
    () => cardOutput,
    () => blockAccess
  ];
  let semIdx = 0;

  function pulseSemantic() {
    if (document.hidden) return;
    const el = semantic[semIdx]?.();
    semIdx = (semIdx + 1) % semantic.length;
    if (!el) return;
    el.classList.add('strctr-intel-semantic');
    setTimeout(() => el.classList.remove('strctr-intel-semantic'), 4200);
  }

  function idlePing() {
    if (document.hidden || Date.now() - lastPointer < IDLE_POINTER_MS) return;
    const el = idlePool[Math.floor(Math.random() * idlePool.length)];
    if (!el) return;
    el.classList.add('strctr-intel-ping');
    setTimeout(() => el.classList.remove('strctr-intel-ping'), 1100);
    lastPointer = Date.now();
  }

  document.addEventListener('pointermove', () => { lastPointer = Date.now(); }, { passive: true });

  setTimeout(() => {
    runDecisionCycle();
    setInterval(runDecisionCycle, CYCLE_MS);
  }, 5000);

  setTimeout(() => {
    pulseSemantic();
    setInterval(pulseSemantic, SEMANTIC_MS);
  }, 16000);

  setInterval(idlePing, IDLE_POLL_MS);
}
