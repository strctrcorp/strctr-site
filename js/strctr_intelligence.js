/**
 * STRCTR V9 — System Intelligence Layer
 * Coordinated state + routing cues (not decorative animation).
 */

const CYCLE_MS = 56000;

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

/** Idle status trace — decision data unchanged. */
const systemStates = [
  'monitoring',
  'liquidity scan',
  'structure track',
  'alignment wait',
  'no anomaly'
];

let ambientPauseUntil = 0;
let lastTraceLine = '';

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/** Pauses ambient status-line writes (e.g. CTA connection copy). */
export function pauseStrctrAmbient(ms) {
  ambientPauseUntil = Date.now() + (ms ?? 3000);
}

export function initStrctrIntelligence({ root, reducedMotion }) {
  if (reducedMotion) return;
  if (document.getElementById('strctr-intel-styles')) return;

  const style = document.createElement('style');
  style.id = 'strctr-intel-styles';
  style.textContent = `
    .strctr-active-step {
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.28);
      background: rgba(59, 130, 246, 0.04);
      transition: box-shadow 0.12s ease, background 0.12s ease;
    }

    .strctr-state-shift {
      letter-spacing: 0.06em;
      transition: letter-spacing 0.12s ease;
    }

    html.strctr-v8 .hero-stack .terminal .state {
      font-weight: 620;
      color: #f3f4f6;
      letter-spacing: -0.035em;
    }

    html.strctr-v8 .hero-stack .terminal .plan.strctr-plan-command {
      border-color: rgba(255, 255, 255, 0.14);
      background: linear-gradient(180deg, rgba(20, 20, 20, 0.98), rgba(12, 12, 12, 0.98));
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05), 0 8px 22px rgba(0, 0, 0, 0.4);
      transition: none;
    }

    html.strctr-v8 .hero-stack .terminal .plan.strctr-plan-command .v {
      color: #f9fafb;
      font-weight: 540;
      line-height: 1.5;
      letter-spacing: 0.025em;
    }

    #accessTierBadge.strctr-intel-proc {
      opacity: 1;
    }

    .strctr-surface-row {
      cursor: pointer;
    }

    @media (prefers-reduced-motion: reduce) {
      #accessTierBadge.strctr-intel-proc {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  const terminal = document.querySelector('.hero-stack .terminal');
  const heroPanel = document.querySelector('.hero-stack .panel');
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
  planBlock?.classList.add('strctr-plan-command');
  const statusEl = document.querySelector('[data-role="refresh-status"]');
  const pillEl = terminal.querySelector('.terminal-head .pill.blue');

  const badge = document.getElementById('accessTierBadge');

  let si = 0;
  let ti = 0;
  let pi = 0;
  let sti = 0;
  let pli = 0;
  let sci = 0;
  let holdStateToggle = 0;

  let intelBusy = false;

  const isDevMode = () =>
    typeof localStorage !== 'undefined' && localStorage.getItem('strctrDev') === '1';

  const paid = () => {
    if (isDevMode()) return false;
    const t = badge?.textContent?.trim().toUpperCase();
    return t === 'PRO' || t === 'CORE';
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const procDelay = (min, max) => {
    const lo = min ?? 200;
    const hi = max ?? 400;
    return delay(lo + Math.floor(Math.random() * (hi - lo + 1)));
  };

  let activeStepEl = null;

  function setActiveStep(el) {
    activeStepEl?.classList.remove('strctr-active-step');
    activeStepEl = el || null;
    el?.classList.add('strctr-active-step');
  }

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  function ambientCanWrite() {
    return !intelBusy && !document.hidden && Date.now() >= ambientPauseUntil;
  }

  let traceIdx = 0;

  function scheduleLiveTrace() {
    setTimeout(() => {
      if (!document.hidden && ambientCanWrite() && statusEl) {
        lastTraceLine = `> ${systemStates[traceIdx % systemStates.length]}`;
        traceIdx = (traceIdx + 1) % systemStates.length;
        statusEl.textContent = lastTraceLine;
      }
      scheduleLiveTrace();
    }, randomBetween(14000, 22000));
  }

  if (badge) badge.classList.add('strctr-intel-proc');

  [rowScenario, rowStage, rowTiming].forEach((el) => el?.classList.add('strctr-surface-row'));

  async function runManualRowCycle(rowEl) {
    if (intelBusy || document.hidden) return;
    intelBusy = true;
    try {
      await procDelay(300, 500);
      setStatus('> manual');
      await procDelay(200, 400);

      if (rowEl === rowScenario) {
        setActiveStep(rowScenario);
        sci = (sci + 1) % SCENARIO_HTML.length;
        if (scenarioV) scenarioV.innerHTML = SCENARIO_HTML[sci];
      } else if (rowEl === rowStage) {
        setActiveStep(rowStage);
        si = (si + 1) % STAGES.length;
        if (stageEl) stageEl.textContent = STAGES[si];
        if (pillEl) pillEl.textContent = STAGES[si];
      } else if (rowEl === rowTiming) {
        setActiveStep(rowTiming);
        ti = (ti + 1) % TIMINGS.length;
        if (timingEl) timingEl.textContent = TIMINGS[ti];
      }

      await delay(900);
      setStatus('');
      setActiveStep(null);
    } finally {
      intelBusy = false;
    }
  }

  async function runPanelMiniPing() {
    if (intelBusy || document.hidden) return;
    intelBusy = true;
    try {
      await procDelay(200, 400);
      await delay(120);
    } finally {
      intelBusy = false;
    }
  }

  function wireHeroSurfaceInteractions() {
    if (!heroPanel) return;

    heroPanel.addEventListener('click', (e) => {
      if (e.target.closest('#btnUnlockAccess, .btn-unlock')) return;
      if (e.target.closest('button')) return;

      const locked = e.target.closest('.term-stat.is-locked, .plan.is-locked');
      if (locked) return;

      const row = e.target.closest('.term-stat');
      if (row && (row === rowScenario || row === rowStage || row === rowTiming)) {
        e.preventDefault();
        void runManualRowCycle(row);
        return;
      }

      void runPanelMiniPing();
    });
  }

  wireHeroSurfaceInteractions();

  async function runDecisionCycle() {
    if (intelBusy || document.hidden) return;
    intelBusy = true;
    try {
      setStatus('> scenario pending');
      setActiveStep(null);
      await delay(320);

      setStatus('> scenario confirmed');
      setActiveStep(rowScenario);
      sci = (sci + 1) % SCENARIO_HTML.length;
      if (scenarioV) scenarioV.innerHTML = SCENARIO_HTML[sci];
      await delay(1400);

      setStatus('> confirmation set');
      setActiveStep(rowStage);
      si = (si + 1) % STAGES.length;
      if (stageEl) stageEl.textContent = STAGES[si];
      if (pillEl) pillEl.textContent = STAGES[si];
      await delay(1200);

      setStatus('> timing optimal');
      setActiveStep(rowTiming);
      ti = 0;
      if (timingEl) timingEl.textContent = 'Optimal';
      await delay(1100);

      setStatus('> probability computed');
      setActiveStep(rowProb);
      pi = 2;
      if (!paid() && probEl) probEl.textContent = '82%';
      await delay(1000);

      setStatus('> position set');
      sti = (sti + 1) % STATES.length;
      if (stateEl) {
        stateEl.textContent = STATES[sti];
        stateEl.classList.add('strctr-state-shift');
        setTimeout(() => stateEl.classList.remove('strctr-state-shift'), 450);
      }
      await delay(1000);

      setStatus('> plan issued');
      setActiveStep(planBlock);
      pli = (pli + 1) % PLAN_HTML.length;
      if (planEl) planEl.innerHTML = PLAN_HTML[pli];
      await delay(1800);

      setStatus('> execution ready');
      setActiveStep(null);
      await delay(1100);

      ti = 0;
      pi = 2;
      if (timingEl) timingEl.textContent = 'Optimal';
      if (!paid() && probEl) probEl.textContent = '82%';
      sti = holdStateToggle % 2;
      holdStateToggle += 1;
      if (stateEl) {
        stateEl.textContent = STATES[sti];
        stateEl.classList.add('strctr-state-shift');
        setTimeout(() => stateEl.classList.remove('strctr-state-shift'), 450);
      }

      setActiveStep(null);
      setStatus('');
    } finally {
      intelBusy = false;
    }
  }

  setTimeout(() => {
    runDecisionCycle();
    setInterval(runDecisionCycle, CYCLE_MS);
  }, 5000);

  setTimeout(() => scheduleLiveTrace(), randomBetween(8000, 16000));
}
