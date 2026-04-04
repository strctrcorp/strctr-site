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
    .strctr-active-step {
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
      background: rgba(59, 130, 246, 0.03);
      transition: box-shadow 0.2s ease, background 0.2s ease;
    }

    .strctr-update-flash {
      background: rgba(255, 255, 255, 0.04);
      transition: background 0.25s ease;
    }

    .strctr-state-shift {
      letter-spacing: 0.02em;
      transition: letter-spacing 0.2s ease;
    }

    html.strctr-v8 .panel-top-left [data-role="refresh-status"] {
      color: rgba(209, 213, 220, 0.92);
      opacity: 1;
      font-size: 11px;
      letter-spacing: 0.07em;
    }

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
  const rowScenario = grid?.querySelector('.term-stat:nth-child(1)');
  const rowStage = grid?.querySelector('.term-stat:nth-child(2)');
  const rowProb = grid?.querySelector('.term-stat:nth-child(3)');
  const rowTiming = grid?.querySelector('.term-stat:nth-child(4)');
  const scenarioV = rowScenario?.querySelector('.v');
  const stageEl = rowStage?.querySelector('.v');
  const probEl = document.getElementById('liveConfidence');
  const timingEl = rowTiming?.querySelector('.v');
  const stateEl = terminal.querySelector('.state');
  const planBlock = terminal.querySelector('.plan');
  const planEl = planBlock?.querySelector('.v');
  const statusEl = document.querySelector('[data-role="refresh-status"]');
  const pillEl = terminal.querySelector('.terminal-head .pill.blue');
  const liveEl = terminal.querySelector('.panel-top .live');

  const badge = document.getElementById('accessTierBadge');

  const cardScenario = document.querySelector('#system .system-grid .card:nth-child(1)');
  const cardExecution = document.querySelector('#system .system-grid .card:nth-child(2)');
  const cardOutput = document.querySelector('#outputs .outputs .card:nth-child(1)');
  const blockAccess = document.querySelector('#access .cta');
  const sectionAccess = document.getElementById('access');

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

  let activeStepEl = null;

  function setActiveStep(el) {
    activeStepEl?.classList.remove('strctr-active-step');
    activeStepEl = el || null;
    el?.classList.add('strctr-active-step');
  }

  function flash(el) {
    if (!el) return;
    el.classList.add('strctr-update-flash');
    setTimeout(() => el.classList.remove('strctr-update-flash'), 200);
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

      setStatus('> input...');
      setActiveStep(null);
      await delay(380);

      setStatus('> building scenario...');
      setActiveStep(rowScenario);
      sci = (sci + 1) % SCENARIO_HTML.length;
      if (scenarioV) {
        scenarioV.innerHTML = SCENARIO_HTML[sci];
        flash(scenarioV);
      }
      flash(cardScenario);
      await delay(1600);

      setStatus('> confirming...');
      setActiveStep(rowStage);
      si = (si + 1) % STAGES.length;
      if (stageEl) {
        stageEl.textContent = STAGES[si];
        flash(stageEl);
      }
      if (pillEl) pillEl.textContent = STAGES[si];
      await delay(1400);

      setStatus('> calculating timing...');
      setActiveStep(rowTiming);
      ti = (ti + 1) % TIMINGS.length;
      if (timingEl) {
        timingEl.textContent = TIMINGS[ti];
        flash(timingEl);
      }
      await delay(1200);

      setStatus('> computing probability...');
      setActiveStep(rowProb);
      if (!paid() && probEl) {
        pi = (pi + 1) % PROBS.length;
        probEl.textContent = PROBS[pi];
        flash(probEl);
      }
      await delay(1100);

      sti = (sti + 1) % STATES.length;
      if (stateEl) {
        stateEl.textContent = STATES[sti];
        stateEl.classList.add('strctr-state-shift');
        setTimeout(() => stateEl.classList.remove('strctr-state-shift'), 600);
        flash(stateEl);
      }
      await delay(1200);

      setStatus('> forming plan...');
      await delay(700);

      setActiveStep(planBlock);
      pli = (pli + 1) % PLAN_HTML.length;
      if (planEl) {
        planEl.innerHTML = PLAN_HTML[pli];
        flash(planEl);
      }
      flash(cardOutput);
      await delay(2000);

      setStatus('> routing execution...');
      setActiveStep(null);
      flash(cardExecution);
      await delay(1600);

      setStatus('> done');
      flash(sectionAccess || blockAccess);
      await delay(900);

      setActiveStep(null);
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
