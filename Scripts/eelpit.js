// Scripts/eelpit.js
// ==============================
// EEL PIT – cursed but readable
// ==============================
(() => {
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
  const btnEnter = document.getElementById('enter');
  const btnFeed = document.getElementById('feed');
  const btnQuiet = document.getElementById('quiet');
  const btnGbPost = document.getElementById('gb-post');

  // ------------------------------
  // Global state
  // ------------------------------
  let extreme = false;
  let quiet = false;
  let pitOpen = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

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

    snakes.forEach((snake) => {
      const target = nearestCrumbForSnake(snake);
      let speedTarget = snake.baseSpeed;
      let ampTarget = snake.baseAmp;
      snake.el.classList.toggle('reverse', snake.dir < 0);

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

  // ------------------------------
  // Main loop
  // ------------------------------
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    tickSnakes(dt);
    tickCrumbs(dt);
    animId = requestAnimationFrame(frame);
  }
  function ensureAnimLoop() {
    if (animId == null) {
      lastTs = performance.now();
      animId = requestAnimationFrame(frame);
    }
  }

  // ------------------------------
  // Gate + pit controls
  // ------------------------------
  function startPit() {
    if (pitOpen) return;
    pitOpen = true;
    document.body.classList.add('pit-open');

    // initial spawn
    for (let i = 0; i < 6; i++) setTimeout(() => createSnake(R(60, tank.clientHeight - 80)), i * 250);
    // slow trickle spawn
    setInterval(() => pitOpen && snakes.size < 20 && createSnake(), 3500);

    ensureAnimLoop();

    if (!quiet) {
      try {
        ambience.volume = 0.5;
        ambience.currentTime = 0;
        ambience.play().catch(() => {});
      } catch (e) {}
    }
  }

  // ------------------------------
  // UI events
  // ------------------------------
  if (gateBtn) {
    gateBtn.addEventListener('click', () => {
      startPit();
      toast('The pit opens...');
    });
  }

  btnEnter.addEventListener('click', () => {
    if (!pitOpen) startPit();
    extreme = !extreme;
    document.body.style.animation = extreme ? 'shake 0.2s infinite' : 'none';
    snakes.forEach((s) => {
      s.baseSpeed = extreme ? R(90, 140) : R(55, 90);
      s.baseAmp = prefersReduced ? 2 : extreme ? R(14, 22) : R(8, 14);
    });
    if (!quiet && extreme) {
      try {
        ambience.volume = 0.5;
        ambience.play().catch(() => {});
      } catch (e) {}
      toast('The pit awakens...');
    } else if (!extreme) {
      toast('The pit rests... for now.');
    }
  });

  btnFeed.addEventListener('click', () => {
    if (!pitOpen) startPit();
    const count = extreme ? 24 : 14;
    for (let i = 0; i < count; i++) setTimeout(() => createCrumb(R(10, tank.clientWidth - 20), R(-40, -8)), i * 40);
    toast('A rain of breadcrumbs descends...');
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
        ambience.play().catch(() => {});
        toast('Audio loop resumed. The pit hums again.');
      } catch (e) {}
    }
  });

  // Guestbook fake post
  if (btnGbPost) {
    btnGbPost.addEventListener('click', () => {
      alert("Your message sank into the brine. (Not actually saved.)");
    });
  }

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
    'left:50%','bottom:24px','transform:translateX(-50%)',
    'padding:8px 12px','border:3px ridge var(--eel)','background:rgba(2,20,30,.85)',
    'box-shadow:0 0 25px rgba(0,255,255,.2), inset 0 0 40px rgba(0,255,255,.06)',
    'color:var(--txt)','z-index:99999','pointer-events:none','opacity:0','transition:opacity .2s ease'
  ].join(';');
  document.body.appendChild(toastBox);

  function toast(msg, ms = 1600) {
    toastBox.textContent = msg;
    toastBox.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastBox.style.opacity = '0'), ms);
  }

  // Expose for debug (optional)
  window.__eelpit = { snakes, crumbs, createSnake, createCrumb };
})();
````
