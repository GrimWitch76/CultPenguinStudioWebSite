// Scripts/eelpit.js
// ==============================
// EEL PIT – cursed but readable
// ==============================
// ------------------------------
// Utils
// ------------------------------
const R = (min, max) => Math.random() * (max - min) + min;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const LERP = (a, b, t) => a + (b - a) * clamp01(t);

// ------------------------------
// DOM refs
// ------------------------------
const tank = document.getElementById('tank');
const ambience = document.getElementById('ambience');
const fact = document.getElementById('fact');
const gateBtn = document.getElementById('gate-enter');
const btnFeed = document.getElementById('feed');
const btnQuiet = document.getElementById('quiet');
const btnQuit = document.getElementById('quit');
const btnGbPost = document.getElementById('gb-post');
const eyesLayer = document.getElementById('eyes');
const chant = document.getElementById('chant');
const vortex = document.getElementById('vortex');



// ------------------------------
// Global state
// ------------------------------
let extreme = false;
let quiet = false;
let pitOpen = false;
let lastMouseX = 0;
let lastMouseY = 0;
// Cursor tracking for eye pupils
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let maelstrom = false;
let ringRadiusTarget = 0; // pixels

window.addEventListener('mousemove', (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;
});

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------
// Snakes (ribbon eels)
// ------------------------------
const snakes = new Set();
const crumbs = new Set();
let animId = null;
let lastTs = performance.now();

function createSnake(y = R(60, Math.max(120, tank.clientHeight - 80))) {
  const segCount = 12;
  const baseSpeed = extreme ? R(90, 140) : R(55, 90);
  const baseAmp = prefersReduced ? 2 : extreme ? R(14, 22) : R(8, 14);
  const freq = R(0.016, 0.028);
  const wavelength = R(0.9, 1.6);

  const snakeEl = document.createElement('div');
  snakeEl.className = 'snake';
  tank.appendChild(snakeEl);

  const segs = [];
  for (let i = 0; i < segCount; i++) {
    const s = document.createElement('div');
    s.className = 'seg' + (i === 0 ? ' head' : '');
    const scale = 1 - i / (segCount * 1.2);
    s.style.transform = `scale(${scale})`;
    snakeEl.appendChild(s);
    segs.push(s);
  }

  const dir = Math.random() < 0.5 ? 1 : -1;
  const xStart = dir > 0 ? -60 : tank.clientWidth + 60;
  const phase0 = R(0, Math.PI * 2);

  const snake = {
    el: snakeEl,
    segs,
    x: xStart,
    y,
    dir,
    speed: baseSpeed,
    baseSpeed,
    amp: baseAmp,
    baseAmp,
    freq,
    wavelength,
    phase0,
    exciteTimer: 0,
  };

  snakeEl.classList.toggle('reverse', dir < 0);
  snakes.add(snake);
  return snake;
}
// ------------------------------
// Rituals
// ------------------------------

let ritualLevel = 0;

function advanceRitual() {
  ritualLevel++;
  document.body.dataset.ritual = ritualLevel; // keep if you like, not required
  syncRitualClasses();

  if (ritualLevel === 3) toast('The current stirs…');
  if (ritualLevel === 6) toast('You feel many eyes upon you.');
  if (ritualLevel === 9) toast('The water hums in a forgotten tongue.');
  if (ritualLevel === 12) { toast('🜂 THE PIT AWAKENS 🜂'); triggerEelpocalypse(); }
}


function triggerEelpocalypse() {
  document.body.classList.add('eelpocalypse');
  enterMaelstrom(); // <-- start the ouroboros!
  try {
    ambience.playbackRate = 0.8;
    ambience.volume = 0.7;
  } catch (e) { }

  // eerie flashes
  let flashes = 0;
  const flashInterval = setInterval(() => {
    document.body.style.backgroundColor = flashes % 2 ? '#000' : '#360013';
    flashes++;
  }, 300);
  


  // random whispers
  const whispers = [
    "feed us",
    "we remember the breadcrumbs",
    "you have done well, surface one",
    "the tide will rise soon"
  ];
  setInterval(() => {
    if (ritualLevel >= 9) {
      toast(whispers[Math.floor(Math.random() * whispers.length)], 2400);
    }
  }, 15000);
}

// Choose the breakpoints you care about
const RITUAL_TIERS = [1, 3, 6, 9, 12];

function syncRitualClasses() {
  document.body.style.setProperty('--ritual', ritualLevel);
  for (const t of RITUAL_TIERS) {
    document.body.classList.toggle(`ritual-ge-${t}`, ritualLevel >= t);
  }
  syncEyes();
  updateRitualAudio();
}



// ------------------------------
// Breadcrumbs
// ------------------------------
function createCrumb(x = R(10, tank.clientWidth - 10), y = -10) {
  const el = document.createElement('div');
  el.className = 'crumb';
  tank.appendChild(el);
  const c = { el, x, y, vy: R(35, 70), phase: R(0, Math.PI * 2), settled: false, consumed: false };
  crumbs.add(c);
  return c;
}
function destroyCrumb(c) {
  crumbs.delete(c);
  c.el.remove();
}

// ------------------------------
// Interaction: snakes ↔ crumbs
// ------------------------------
function nearestCrumbForSnake(snake) {
  let best = null;
  let bestD2 = Infinity;
  const senseR2 = 180 * 180;
  crumbs.forEach((c) => {
    if (c.settled || c.consumed) return;
    const dx = c.x - snake.x;
    const dy = c.y - snake.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2 && d2 < senseR2) {
      best = c;
      bestD2 = d2;
    }
  });
  return best;
}

// ------------------------------
// Simulation ticks
// ------------------------------
function tickSnakes(dt) {
  const W = tank.clientWidth;
  const H = tank.clientHeight;

if (maelstrom){
  const W = tank.clientWidth, H = tank.clientHeight;
  const cx = W * 0.5, cy = H * 0.52; // slightly below center feels deeper

  snakes.forEach(s => {
    // converge radius toward target so the ring tightens smoothly
    s.orbitRadius += (ringRadiusTarget - s.orbitRadius) * Math.min(1, dt * 1.5);

    // spin around the center
    s.orbitAngle += s.orbitDir * s.orbitSpeed * dt;

    // === proper arc spacing per segment ===
    const segSpacingPx = 22;                                  // pixel distance between segments along the ring
    const deltaA = segSpacingPx / Math.max(48, s.orbitRadius); // radians per segment (clamped so very small radii still separate)
    const amp = prefersReduced ? 0 : Math.max(6, s.baseAmp);   // subtle ripple amplitude

    for (let i = 0; i < s.segs.length; i++){
      // place each segment i behind the head along the tangent (respect orbit direction)
      const a = s.orbitAngle - s.orbitDir * i * deltaA;

      // gentle body ripple that pushes slightly in/out from the ring
      const ripple = Math.sin((a + s.phase0) * 3 + i * 0.3) * (amp * 0.35);

      const r = s.orbitRadius + ripple;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;

      const seg = s.segs[i];
      seg.style.left = (x - 20) + 'px';
      seg.style.top  = (y - 9) + 'px';

      // orient rectangle to tangent so it "flows" around the ring
      // tangent angle is +90° for clockwise, -90° for counterclockwise
      const tangentDeg = (a * 180 / Math.PI) + (s.orbitDir > 0 ? 90 : -90);

      // preserve the scale you set at creation, only add rotation
      // (each seg had a scale() applied once; append rotate() here)
      // Pull existing scale from inline style once and cache it
      if (!seg._baseScale){
        // parse "scale(N)" from the initial transform string, fallback to 1
        const m = (seg.style.transform || '').match(/scale\(([^)]+)\)/);
        seg._baseScale = m ? parseFloat(m[1]) : 1;
      }
      seg.style.transform = `scale(${seg._baseScale}) rotate(${tangentDeg}deg)`;
    }
  });

  return; // skip normal wander logic while maelstrom is active
}

  snakes.forEach((snake) => {
    const target = nearestCrumbForSnake(snake);
    let speedTarget = snake.baseSpeed;
    let ampTarget = snake.baseAmp;
    snake.el.classList.toggle('reverse', snake.dir < 0);

    if (ritualLevel >= 9) {
      snake.el.style.filter = `hue-rotate(${(performance.now() / 30) % 360}deg) saturate(2)`;
    }

    if (target) {
      // vertical converge
      const ay = target.y - snake.y;
      snake.y += Math.max(-50 * dt, Math.min(50 * dt, ay * 0.9 * dt));

      // chase boost
      speedTarget *= extreme ? 1.35 : 1.25;
      ampTarget *= extreme ? 1.35 : 1.25;

      const dx = target.x - snake.x;
      const dy = target.y - snake.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 22 * 22) {
        target.consumed = true;
        destroyCrumb(target);
        snake.exciteTimer = 1.2;
      }
    }

    // excitement
    if (snake.exciteTimer > 0) {
      snake.exciteTimer -= dt;
      speedTarget = Math.max(speedTarget, snake.baseSpeed * 1.45);
      ampTarget = Math.max(ampTarget, snake.baseAmp * 1.5);
      snake.el.classList.add('excited');
    } else {
      snake.el.classList.remove('excited');
    }

    snake.speed = LERP(snake.speed, speedTarget, 0.08);
    snake.amp = LERP(snake.amp, ampTarget, 0.08);

    // horizontal drift
    snake.x += snake.dir * snake.speed * dt;
    if (snake.y < 40) snake.y = 40;
    if (snake.y > H - 40) snake.y = H - 40;

    // wrap & bounce
    if (snake.x < -120 || snake.x > W + 120) {
      snake.dir *= -1;
      snake.x = snake.dir > 0 ? -80 : W + 80;
      snake.y = Math.min(Math.max(40, snake.y + R(-40, 40)), H - 40);
      snake.phase0 = R(0, Math.PI * 2);
    }

    // segment placement
    const segDist = 20;
    const { segs, amp, freq, wavelength, phase0, dir } = snake;
    for (let i = 0; i < segs.length; i++) {
      const t = i / (segs.length - 1);
      const bx = snake.x - dir * i * segDist;
      const by = snake.y + (prefersReduced ? 0 : amp * Math.sin(bx * freq + phase0 - t * wavelength));
      const seg = segs[i];
      seg.style.left = bx - 20 + 'px';
      seg.style.top = by - 9 + 'px';
    }
  });
}

function tickCrumbs(dt) {
  const H = tank.clientHeight;
  crumbs.forEach((c) => {
    if (!c.settled) {
      c.vy = Math.min(c.vy + 220 * dt, 260);
      c.y += c.vy * dt;
      c.x += Math.sin(c.y * 0.06 + c.phase) * (extreme ? 24 : 14) * dt;
      if (c.y >= H - 14) {
        c.y = H - 14;
        c.settled = true;
        c.el.classList.add('sunk');
        setTimeout(() => destroyCrumb(c), 700);
      }
    }
    c.el.style.left = c.x + 'px';
    c.el.style.top = c.y + 'px';
  });
}

// How far pupils can travel from center (scales with ritual & Extreme)
function pupilMaxOffsetPx() {
  const base = 4 + Math.min(ritualLevel, 12) * 0.8; // 4px..~13px
  return extreme ? base * 1.4 : base;               // extra spicy in Extreme
}

function tickEyes(dt){
  if (eyeNodes.length === 0) return;
  const maxOff = pupilMaxOffsetPx();

  for (let i = 0; i < eyeNodes.length; i++) {
    const eye = eyeNodes[i];
    const r = eye.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;

    let dx = cursorX - cx;
    let dy = cursorY - cy;

    const follow = Math.max(0.08, Math.min(0.3, dt * 8));
    dx *= follow; dy *= follow;

    const dist = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, maxOff / dist);
    const px = dx * scale;
    const py = dy * scale;
    eye.style.setProperty('--px', px.toFixed(2)+'px');
    eye.style.setProperty('--py', py.toFixed(2)+'px');

    // micro-tilt (max ±6deg, scales with ritual)
    const tiltMax = Math.min(6, 2 + ritualLevel * 0.4) * (extreme ? 1.2 : 1);
    const angle = Math.atan2(dy, dx) * 180/Math.PI; // facing angle
    const targetRot = Math.max(-tiltMax, Math.min(tiltMax, angle * 0.06));
    const currentRot = parseFloat(eye.style.getPropertyValue('--rot')) || 0;
    const rot = currentRot + (targetRot - currentRot) * Math.min(1, dt * 8);
    eye.style.setProperty('--rot', rot.toFixed(2) + 'deg');
  }
}


// ------------------------------
// Main loop
// ------------------------------
function frame(ts) {
  
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  tickPerf(dt);
  tickSnakes(dt);
  tickCrumbs(dt);
  tickEyes(dt);
  animId = requestAnimationFrame(frame);
}
function ensureAnimLoop() {
  if (animId == null) {
    lastTs = performance.now();
    animId = requestAnimationFrame(frame);
  }
}

let fpsSmoothed = 60;
function tickPerf(dt){
  const inst = 1/Math.max(dt, 0.001);
  fpsSmoothed = fpsSmoothed*0.9 + inst*0.1;
  if (fpsSmoothed < 30) {
    // lighten the load
    eyeNodes.slice(0, Math.ceil(eyeNodes.length*0.15)).forEach(n => (n.remove(), eyeNodes.splice(eyeNodes.indexOf(n),1)));
  }
}
// in frame loop:



// ------------------------------
// Gate + pit controls
// ------------------------------
// after const gateBtn = ...
const gate = document.getElementById('gate');
let spawnInterval = null;

function startPit() {
  if (pitOpen) return;
  pitOpen = true;
  document.body.classList.add('pit-open');

  for (let i = 0; i < 6; i++) setTimeout(() => createSnake(R(60, tank.clientHeight - 80)), i * 250);
  spawnInterval = setInterval(() => pitOpen && snakes.size < 20 && createSnake(), 3500);
  ensureAnimLoop();
  if (!quiet) { try { ambience.volume = 0.5; ambience.currentTime = 0; ambience.play().catch(() => { }); } catch (e) { } }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (animId) cancelAnimationFrame(animId), animId = null;
    ambience.pause(); chant.pause();
  } else {
    ensureAnimLoop();
    updateRitualAudio();
  }
});


if (gateBtn) {
  gateBtn.addEventListener('click', () => {
    startPit();
    toast('The pit opens...');
  });
  // Escape closes gate (same as entering)
  window.addEventListener('keydown', (e) => {
    if (!pitOpen && (e.key === 'Escape' || e.key === 'Enter')) {
      gateBtn.click();
    }
  });
}

btnFeed.addEventListener('click', () => {
  if (!pitOpen) startPit();
  const count = extreme ? 24 : 14;
  for (let i = 0; i < count; i++)
    setTimeout(() => createCrumb(R(10, tank.clientWidth - 20), R(-40, -8)), i * 40);
  toast('A rain of breadcrumbs descends...');
  advanceRitual();
   syncEyes();
});

btnQuiet.addEventListener('click', () => {
  quiet = !quiet;
  if (quiet) {
    ambience.pause();
    toast('Audio muted. The eels sleep...');
  } else {
    try {
      ambience.volume = 0.5;
      ambience.currentTime = 0;
      ambience.play().catch(() => { });
      toast('Audio loop resumed. The pit hums again.');
    } catch (e) { }
  }
});

// Guestbook fake post
if (btnGbPost) {
  btnGbPost.addEventListener('click', () => {
    alert("Your message sank into the brine. (Not actually saved.)");
  });
}

// ===== Fun Facts (robust rotator) =====
// Edit facts here or in another script by setting window.EEL_FACTS before this file runs.
window.EEL_FACTS = window.EEL_FACTS || [
  "eel fact: 100% slippery, 0% warranty",
  "eel fact: No one really knows how eels reproduce, they just vanish into the Sargasso Sea and never return.",
  "eel fact: will merge your PR unreviewed",
  "eel fact: electric eels are not true eels",
  "eel fact: certified noodle",
  "eel fact: Restaurants in Vancouver use prepackaged eels and microwave them to make unagi-Don in restaurants",
  "eel fact: Eels can swim backwards",
  "eel fact: Eels are fish and not snakes"
];

const factEl = document.getElementById("fact");
let _factIdx = -1;
let _factTimer = null;

function nextFact() {
  if (!factEl || !Array.isArray(window.EEL_FACTS) || window.EEL_FACTS.length === 0) return;
  _factIdx = (_factIdx + 1) % window.EEL_FACTS.length;
  factEl.textContent = window.EEL_FACTS[_factIdx];
}

function startFactCycle(intervalMs = 8000) {
  if (!factEl) return;
  clearInterval(_factTimer);
  nextFact(); // show one immediately
  _factTimer = setInterval(nextFact, intervalMs);
}

function stopFactCycle() {
  clearInterval(_factTimer);
  _factTimer = null;
}

// Pause when tab is hidden; resume when visible (saves CPU and prevents big jumps)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopFactCycle();
  else startFactCycle();
});

// Kick it off
startFactCycle();

// Floating fact follows cursor
window.addEventListener('mousemove', (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  fact.style.transform = `translate(${lastMouseX + 30}px, ${lastMouseY - 20}px)`;
});

// Click to spawn splash goo
window.addEventListener('click', (e) => {
  const s = document.createElement('div');
  s.className = 'slime';
  s.style.left = e.clientX + 'px';
  s.style.top = e.clientY + 'px';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 700);
});

// ------------------------------
// Tiny toast helper
// ------------------------------
let toastTimer = null;
const toastBox = document.createElement('div');
toastBox.setAttribute('aria-live', 'polite');
toastBox.style.cssText = [
  'position:fixed',
  'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
  'padding:8px 12px', 'border:3px ridge var(--eel)', 'background:rgba(2,20,30,.85)',
  'box-shadow:0 0 25px rgba(0,255,255,.2), inset 0 0 40px rgba(0,255,255,.06)',
  'color:var(--txt)', 'z-index:99999', 'pointer-events:none', 'opacity:0', 'transition:opacity .2s ease'
].join(';');
document.body.appendChild(toastBox);

function toast(msg, ms = 1600) {
  toastBox.textContent = msg;
  toastBox.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastBox.style.opacity = '0'), ms);
}

(function () {
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let idx = 0;
  window.addEventListener('keydown', (e) => {
    idx = (e.key === seq[idx]) ? idx + 1 : (e.key === seq[0] ? 1 : 0);
    if (idx >= seq.length) {
      idx = 0;
      if (!pitOpen) startPit();
      toast('You feel the current accelerate…');
    }
  });
})();

// ------------------------------
// Bubble cursor trail
// ------------------------------
const bubblePool = [];
const MAX_BUBBLES = 120;
let lastTrail = 0;

function spawnBubble(x, y) {
  if (prefersReduced) return;

  // Reuse a node if possible
  const b = bubblePool.pop() || document.createElement('div');
  b.className = 'bubble';

  // Extreme mode ramps up size/speed/rise and wobble distance
  const sz = extreme ? R(10, 26) : R(6, 16);
  const dur = extreme ? R(0.60, 1.00) : R(0.95, 1.60);
  const rise = extreme ? R(140, 240) : R(90, 160);
  const dx = extreme ? R(-26, 26) : R(-14, 14);

  b.style.left = x + 'px';
  b.style.top = y + 'px';
  b.style.setProperty('--sz', sz + 'px');
  b.style.setProperty('--dur', dur + 's');
  b.style.setProperty('--rise', rise + 'px');
  b.style.setProperty('--dx', dx + 'px');

  document.body.appendChild(b);

  // Clean up after animation; pool the node
  setTimeout(() => {
    if (b.parentNode) b.parentNode.removeChild(b);
    if (bubblePool.length < MAX_BUBBLES) bubblePool.push(b);
  }, dur * 1000 + 40);
}

// Throttled by mode so we don't melt GPUs
window.addEventListener('mousemove', (e) => {
  const now = performance.now();
  const interval = extreme ? 16 : 60; // ~60fps vs ~16fps bursts
  if (now - lastTrail > interval) {
    spawnBubble(e.clientX + R(-6, 6), e.clientY + R(-6, 6));
    // Extra bubbles when extreme (spicier trail)
    if (extreme && Math.random() < 0.6) {
      spawnBubble(e.clientX + R(-12, 12), e.clientY + R(-12, 12));
    }
    lastTrail = now;
  }
});

// Also sprinkle a tiny bubble on clicks (pairs nicely with your slime)
window.addEventListener('click', (e) => {
  spawnBubble(e.clientX, e.clientY);
});


// ---------- Eyes logic ----------
let eyeNodes = [];
function targetEyeCount(){
  // Starts at ritual 3. Scales with ritual & Extreme.
  if (ritualLevel < 3) return 0;
  const base = Math.min(60, Math.floor(ritualLevel * 2 + 4));
  return extreme ? Math.min(100, Math.floor(base * 1.5)) : base;
}

function randomEyePos(){
  const pad = 24;
  const vw = Math.max(pad, window.innerWidth - pad*2);
  const vh = Math.max(pad, window.innerHeight - pad*2);
  return { x: Math.random()*vw + pad, y: Math.random()*vh + pad };
}

function createEye(){
  const eye = document.createElement('div');
  eye.className = 'eye';
  const ball = document.createElement('div'); ball.className = 'ball';
  const lidT = document.createElement('div'); lidT.className = 'lid top';
  const lidB = document.createElement('div'); lidB.className = 'lid bottom';
  eye.appendChild(ball); eye.appendChild(lidT); eye.appendChild(lidB);

  const {x,y} = randomEyePos();
  const sz = (extreme ? R(28, 52) : R(22, 42));
  const rot = R(-6, 6);
  const blink = (extreme ? R(3.0, 5.2) : R(4.5, 7.5)) + 's';
  const delay = R(0, 6) + 's';

  eye.style.left = x + 'px';
  eye.style.top  = y + 'px';
  eye.style.setProperty('--sz', sz + 'px');
  eye.style.setProperty('--rot', rot + 'deg');
  eye.style.setProperty('--blink', blink);
  eye.style.animationDelay = delay; // for the container animation (if any)
  eye.querySelectorAll('.lid').forEach(n => n.style.animationDelay = delay);

  eyesLayer.appendChild(eye);
  eyeNodes.push(eye);
}

function syncEyes(){
  const target = targetEyeCount();
  // add/remove to meet the target count
  while (eyeNodes.length < target) createEye();
  while (eyeNodes.length > target) {
    const n = eyeNodes.pop();
    n.remove();
  }
}

window.addEventListener('resize', () => {
  // Nudge positions back on screen without full rebuild
  const pad = 16;
  eyeNodes.forEach(n=>{
    const rect = n.getBoundingClientRect();
    let x = rect.left, y = rect.top;
    x = Math.min(Math.max(pad, x), window.innerWidth - pad);
    y = Math.min(Math.max(pad, y), window.innerHeight - pad);
    n.style.left = x + 'px'; n.style.top = y + 'px';
  });
});

// ---------- Audio routing ----------
function updateRitualAudio(){
  if (quiet) { ambience.pause(); chant.pause(); return; }

  try {
    if (ritualLevel >= 9) {
      // Chant takes over
      if (!chant.paused) return;               // already chanting
      ambience.pause();
      chant.currentTime = 0;
      chant.volume = 0.7;
      chant.play().catch(()=>{});
    } else {
      // Normal ambience
      if (!ambience.paused) return;
      chant.pause();
      ambience.currentTime = 0;
      ambience.volume = 0.5;
      ambience.play().catch(()=>{});
    }
  } catch(e){}
}

function enterMaelstrom(){
  if (maelstrom) return;
  maelstrom = true;
  document.body.classList.add('maelstrom');

  // Aim ring radius at ~32% of the smaller tank dimension
  const W = tank.clientWidth, H = tank.clientHeight;
  ringRadiusTarget = Math.floor(Math.min(W, H) * 0.32);

  // Make sure we have enough bodies to sell the ring
  while (snakes.size < 12) createSnake(R(60, Math.max(120, tank.clientHeight - 80)));

  // Initialize orbital parameters per eel
  let i = 0, n = snakes.size;
  snakes.forEach(s => {
    s.orbitAngle  = (i / n) * Math.PI * 2;                // spread around circle
    s.orbitRadius = ringRadiusTarget + R(-24, 24);        // slight jitter
    s.orbitSpeed  = (prefersReduced ? 0.5 : 0.8) * R(0.85, 1.1) * (extreme ? 1.25 : 1.0);
    s.orbitDir    = 1; // clockwise; set -1 to reverse
    s.baseAmp     = Math.max(s.baseAmp, 10);              // give them some life
    s.exciteTimer = Math.max(s.exciteTimer, 1.5);
    i++;
  });

  // Faster swirl if extreme
  document.body.style.setProperty('--vortex-speed', extreme ? '9s' : '14s');

  toast('The eels form a circle…');
}


syncRitualClasses();

