// NAV scroll state
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// MOBILE NAV — hamburger toggle
(function () {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  if (!toggle || !links) return;

  function setOpen(isOpen) {
    toggle.classList.toggle('open', isOpen);
    links.classList.toggle('open', isOpen);
    overlay && overlay.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  overlay && overlay.addEventListener('click', () => setOpen(false));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
})();

// FOLD TITLE: split into chars and animate on load
(function () {
  const el = document.getElementById('foldTitle');
  el.querySelectorAll('.line1, .line2').forEach(line => {
    const text = line.textContent;
    line.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'fold-char';
      span.style.animationDelay = (i * 0.07) + 's';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      line.appendChild(span);
    });
  });
  requestAnimationFrame(() => {
    document.querySelectorAll('.fold-char').forEach(c => c.classList.add('play'));
  });
})();

// REVEAL ON SCROLL
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      io.unobserve(el);
      setTimeout(() => el.classList.add('in-view'), 250);
    }
  });
}, { threshold: 0.35 });
revealEls.forEach(el => io.observe(el));

// COUNTDOWN: lançamento em 11/09
const LAUNCH_DATE = new Date('2026-09-11T00:00:00-03:00');
function updateCountdown() {
  const now = new Date();
  let diff = LAUNCH_DATE - now;
  if (diff < 0) diff = 0;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  document.getElementById('cd-days').textContent = String(d).padStart(2, '0');
  document.getElementById('cd-hours').textContent = String(h).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 60000);

// CLICK SPARK
(function () {
  const canvas = document.getElementById('sparkCanvas');
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  let sparks = [];
  const sparkColor = '#c81f1f', sparkCount = 8, sparkSize = 10, sparkRadius = 22, duration = 450;
  window.addEventListener('click', (e) => {
    const now = performance.now();
    for (let i = 0; i < sparkCount; i++) {
      sparks.push({ x: e.clientX, y: e.clientY, angle: (2 * Math.PI * i) / sparkCount, start: now });
    }
  });
  function draw(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sparks = sparks.filter(s => ts - s.start < duration);
    sparks.forEach(s => {
      const p = (ts - s.start) / duration;
      const eased = p * (2 - p);
      const dist = eased * sparkRadius;
      const len = sparkSize * (1 - eased);
      const x1 = s.x + dist * Math.cos(s.angle), y1 = s.y + dist * Math.sin(s.angle);
      const x2 = s.x + (dist + len) * Math.cos(s.angle), y2 = s.y + (dist + len) * Math.sin(s.angle);
      ctx.strokeStyle = sparkColor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// BOOK FLIP — checkbox-driven 3D page turn (pure CSS flip, JS just drives the checkboxes)
(function () {
  const root = document.getElementById('bookFlip');
  if (!root) return;

  const checkboxes = Array.from(root.querySelectorAll('.book__checkbox'));
  const prevBtn = document.getElementById('flipPrev');
  const nextBtn = document.getElementById('flipNext');
  const indicator = document.getElementById('flipIndicator');
  const pageNumbers = [23, 24, 25, 26, 27]; // page-23..page-27, in order
  let current = 0; // index of the page currently on top (unflipped)

  function render() {
    indicator.textContent = `Pág. ${pageNumbers[current]}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === pageNumbers.length - 1;
  }

  function next() {
    if (current >= checkboxes.length) return;
    checkboxes[current].checked = true;
    current++;
    render();
  }
  function prev() {
    if (current <= 0) return;
    current--;
    checkboxes[current].checked = false;
    render();
  }

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  // clicking a checkbox's own label already flips it forward (native behavior);
  // just keep our counter/indicator in sync when that happens directly.
  checkboxes.forEach((cb, i) => {
    cb.addEventListener('change', () => {
      current = cb.checked ? i + 1 : i;
      render();
    });
  });

  // swipe support on touch devices
  let touchStartX = null;
  root.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStartX = null;
  }, { passive: true });

  render();
})();

// NEWSLETTER (demo, sem backend)
document.getElementById('nlForm').addEventListener('submit', function (e) {
  e.preventDefault();
  document.getElementById('nlMsg').textContent = 'Obrigado! Assim que o formulário estiver conectado, seu e-mail será salvo de verdade.';
  this.reset();
});

// CURSOR GRID — reactive grid lattice behind the dark quote sections
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (prefersReduced || !hasHover) return; // no mouse to react to on touch devices — skip the canvas loop entirely

  const FALLOFF_CURVES = {
    linear: t => t,
    smooth: t => t * t * (3 - 2 * t),
    sharp: t => t * t * t
  };

  const hexToRgb = hex => {
    const h = hex.replace('#', '');
    const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const num = parseInt(v.slice(0, 6), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  function initCursorGrid(section, opts) {
    const canvas = section.querySelector('.cursor-grid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const p = Object.assign({
      cellSize: 70, color: '#ffffff', radius: 140, falloff: 'smooth',
      holdTime: 400, fadeDuration: 800, lineWidth: 1.2, maxOpacity: 1,
      fillOpacity: 0, gridOpacity: 0, cellRadius: 0, clickPulse: true, pulseSpeed: 600
    }, opts);

    let cols = 0, rows = 0, offX = 0, offY = 0;
    let alphas = new Float32Array(0), touched = new Float64Array(0);
    let w = 0, h = 0, raf = 0, running = false, lastFrame = 0;
    const pulses = [];

    function rebuild() {
      w = section.offsetWidth; h = section.offsetHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / p.cellSize) + 1;
      rows = Math.ceil(h / p.cellSize) + 1;
      offX = (w - cols * p.cellSize) / 2;
      offY = (h - rows * p.cellSize) / 2;
      alphas = new Float32Array(cols * rows);
      touched = new Float64Array(cols * rows);
    }

    function cellCenter(i) {
      const cx = offX + (i % cols) * p.cellSize + p.cellSize / 2;
      const cy = offY + Math.floor(i / cols) * p.cellSize + p.cellSize / 2;
      return [cx, cy];
    }

    function energize(x, y, boost) {
      const r = Math.max(p.radius, 1);
      const ease = FALLOFF_CURVES[p.falloff] || FALLOFF_CURVES.linear;
      const now = performance.now();
      const minCol = Math.max(0, Math.floor((x - r - offX) / p.cellSize));
      const maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / p.cellSize));
      const minRow = Math.max(0, Math.floor((y - r - offY) / p.cellSize));
      const maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / p.cellSize));
      for (let cRow = minRow; cRow <= maxRow; cRow++) {
        for (let cCol = minCol; cCol <= maxCol; cCol++) {
          const i = cRow * cols + cCol;
          const [cx, cy] = cellCenter(i);
          const dist = Math.hypot(cx - x, cy - y);
          if (dist > r) continue;
          const level = ease(1 - dist / r) * p.maxOpacity * (boost || 1);
          if (level > alphas[i]) { alphas[i] = level; touched[i] = now; }
          else if (level > 0) { touched[i] = now; }
        }
      }
    }

    function draw(now) {
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      ctx.clearRect(0, 0, w, h);
      const [cr, cg, cb] = hexToRgb(p.color);

      if (p.gridOpacity > 0) {
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.gridOpacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let cCol = 0; cCol <= cols; cCol++) {
          const x = Math.round(offX + cCol * p.cellSize) + 0.5;
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let cRow = 0; cRow <= rows; cRow++) {
          const y = Math.round(offY + cRow * p.cellSize) + 0.5;
          ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();
      }

      for (let pi = pulses.length - 1; pi >= 0; pi--) {
        const pulse = pulses[pi];
        const age = (now - pulse.t0) / 1000;
        const ringR = age * p.pulseSpeed;
        if (ringR > Math.hypot(w, h)) { pulses.splice(pi, 1); continue; }
        const band = p.cellSize;
        const minCol = Math.max(0, Math.floor((pulse.x - ringR - band - offX) / p.cellSize));
        const maxCol = Math.min(cols - 1, Math.floor((pulse.x + ringR + band - offX) / p.cellSize));
        const minRow = Math.max(0, Math.floor((pulse.y - ringR - band - offY) / p.cellSize));
        const maxRow = Math.min(rows - 1, Math.floor((pulse.y + ringR + band - offY) / p.cellSize));
        for (let cRow = minRow; cRow <= maxRow; cRow++) {
          for (let cCol = minCol; cCol <= maxCol; cCol++) {
            const i = cRow * cols + cCol;
            const [cx, cy] = cellCenter(i);
            const dist = Math.hypot(cx - pulse.x, cy - pulse.y);
            if (Math.abs(dist - ringR) < band / 2 && p.maxOpacity > alphas[i]) {
              alphas[i] = p.maxOpacity; touched[i] = now;
            }
          }
        }
      }

      let anyVisible = pulses.length > 0;
      const fadeStep = dt / Math.max(p.fadeDuration, 16);
      const half = p.cellSize / 2;

      for (let i = 0; i < alphas.length; i++) {
        let a = alphas[i];
        if (a <= 0) continue;
        if (now - touched[i] > p.holdTime) {
          a = Math.max(0, a - fadeStep);
          alphas[i] = a;
          if (a <= 0) continue;
        }
        anyVisible = true;

        const [cx, cy] = cellCenter(i);
        const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, p.cellSize);
        gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
        gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

        const x = cx - half + 0.5, y = cy - half + 0.5, s = p.cellSize - 1;
        ctx.beginPath();
        if (p.cellRadius > 0 && ctx.roundRect) ctx.roundRect(x, y, s, s, p.cellRadius);
        else ctx.rect(x, y, s, s);
        if (p.fillOpacity > 0) {
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a * p.fillOpacity})`;
          ctx.fill();
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = p.lineWidth;
        ctx.stroke();
      }

      if (anyVisible) raf = requestAnimationFrame(draw);
      else {
        running = false;
        if (p.gridOpacity <= 0) ctx.clearRect(0, 0, w, h);
      }
    }

    function wake() {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(draw);
    }

    function toLocal(e) {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    section.addEventListener('pointermove', e => {
      const [x, y] = toLocal(e);
      energize(x, y);
      wake();
    });

    section.addEventListener('pointerdown', e => {
      if (!p.clickPulse) return;
      const [x, y] = toLocal(e);
      pulses.push({ x, y, t0: performance.now() });
      wake();
    });

    const ro = new ResizeObserver(() => { rebuild(); wake(); });
    ro.observe(section);
    rebuild();
    wake();
  }

  document.querySelectorAll('.cursor-grid-bg').forEach(section => {
    initCursorGrid(section, {
      cellSize: 70,
      color: '#ffffff',
      radius: 140,
      falloff: 'smooth',
      holdTime: 400,
      fadeDuration: 800,
      lineWidth: 1.2,
      maxOpacity: 1,
      fillOpacity: 0,
      gridOpacity: 0.07,
      cellRadius: 0,
      clickPulse: true,
      pulseSpeed: 600
    });
  });
})();