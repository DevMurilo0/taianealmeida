// NAV scroll state
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// SMOOTH INERTIAL SCROLLING ("suave e leve")
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (prefersReduced || isTouch) return; // Mantém toque nativo responsivo em dispositivos móveis

  let currentY = window.scrollY;
  let targetY = window.scrollY;
  let isRunning = false;
  const friction = 0.16; // Aumentado de 0.075 para 0.16 (muito mais leve, ágil e responsivo)

  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  function smoothScrollStep() {
    currentY = lerp(currentY, targetY, friction);

    if (Math.abs(targetY - currentY) < 0.2) {
      currentY = targetY;
      window.scrollTo(0, currentY);
      isRunning = false;
      return;
    }

    window.scrollTo(0, currentY);
    requestAnimationFrame(smoothScrollStep);
  }

  function startSmoothScroll() {
    if (!isRunning) {
      isRunning = true;
      requestAnimationFrame(smoothScrollStep);
    }
  }

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    // Multiplicador 1.0 para uma rolagem direta, ágil e leve
    targetY = Math.min(maxScroll, Math.max(0, targetY + e.deltaY * 1.0));
    startSmoothScroll();
  }, { passive: false });

  window.addEventListener('scroll', () => {
    if (!isRunning) {
      currentY = window.scrollY;
      targetY = window.scrollY;
    }
  });
})();

// SCROLL PROGRESS + PARALLAX + AMBIENT GLOW & INERTIAL SMOOTH SCROLL
(function () {
  const root = document.documentElement;
  const heroBg = document.querySelector('.hero-bg');
  const heroContent = document.querySelector('.hero-content');
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ticking = false;
  let heroBgReady = false;

  // Smooth inertial scrolling variables
  let currentScroll = window.scrollY || 0;
  let targetScroll = window.scrollY || 0;
  const ease = 0.1; // Smoothness factor (0.08 - 0.12 gives ideal fluid inertia)

  if (heroBg && !prefersReduced) {
    heroBg.addEventListener('animationend', (e) => {
      if (e.animationName === 'heroIntro') {
        heroBg.style.animation = 'none';
        heroBgReady = true;
        update();
      }
    });
  }

  function update() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;
    root.style.setProperty('--scroll', progress.toFixed(4));

    if (!prefersReduced) {
      if (heroBgReady || heroBg) {
        const shift = Math.min(scrollY * 0.22, 140);
        heroBg.style.transform = `scale(1.08) translateY(${shift.toFixed(1)}px)`;
      }

      if (heroContent && scrollY < window.innerHeight * 1.1) {
        const contentShift = scrollY * 0.32;
        const opacity = Math.max(0, 1 - scrollY / (window.innerHeight * 0.7));
        heroContent.style.transform = `translateY(${contentShift.toFixed(1)}px)`;
        heroContent.style.opacity = opacity.toFixed(2);
      }

      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -400 || rect.top > window.innerHeight + 400) return;
        const centerOffset = (rect.top + rect.height / 2) - window.innerHeight / 2;
        el.style.transform = `translateY(${(-centerOffset * speed).toFixed(2)}px)`;
      });
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// LIVRO 3D — gira sozinho devagar e aceita ser arrastado a qualquer momento
(function () {
  const book = document.getElementById('book3d');
  const shadow = document.querySelector('.book3d-shadow');
  if (!book) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ry = -26;
  let rx = 18;
  const autoSpeed = 0.11; // graus por ms (aprox.), ajustado abaixo pelo delta de tempo
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startRy = 0;
  let startRx = 0;
  let lastTs = null;
  const RX_MIN = -22; // inclinando pra cima, mostrando um pouco do topo
  const RX_MAX = 45;  // olhando bem de baixo, sem virar de cabeça pra baixo

  // O giro automático só começa depois que o livro entrou na tela (ver
  // IntersectionObserver abaixo). Antes disso o livro fica parado. Ao entrar,
  // ele gira rápido algumas voltas e desacelera suavemente até o giro lento normal.
  let rotationActive = false;
  let entering = false;
  let entryStart = null;
  const entryBaseRy = ry;
  const ENTRY_SPINS = 380;    // graus extras percorridos na entrada (pouco mais de 1 volta)
  const ENTRY_DURATION = 3200; // ms, sincronizado com o deslize em CSS

  function apply() {
    book.style.setProperty('--ry', ry + 'deg');
    book.style.setProperty('--rx', rx + 'deg');
    if (shadow) {
      const scale = 0.8 + 0.2 * Math.abs(Math.cos(ry * Math.PI / 180));
      shadow.style.setProperty('--shadow-scale', scale.toFixed(3));
    }
  }

  function frame(ts) {
    if (entering) {
      if (entryStart === null) entryStart = ts;
      const t = Math.min(1, (ts - entryStart) / ENTRY_DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cúbico: rápido no início, suave no fim
      ry = entryBaseRy - ENTRY_SPINS * (1 - eased);
      if (t >= 1) {
        entering = false;
        rotationActive = true;
      }
      lastTs = ts;
    } else if (rotationActive && !dragging && !prefersReduced) {
      if (lastTs != null) {
        const dt = ts - lastTs;
        ry += autoSpeed * (dt / 16.67);
      }
      lastTs = ts;
    } else {
      lastTs = ts;
    }
    apply();
    requestAnimationFrame(frame);
  }

  book.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startRy = ry;
    startRx = rx;
    book.setPointerCapture(e.pointerId);
  });

  book.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    ry = startRy + dx * 0.4;
    rx = Math.min(RX_MAX, Math.max(RX_MIN, startRx - dy * 0.3));
  });

  function stopDrag() {
    dragging = false;
  }

  book.addEventListener('pointerup', stopDrag);
  book.addEventListener('pointercancel', stopDrag);

  apply();
  requestAnimationFrame(frame);

  // Dispara a entrada (fade + deslize com "estouro" suave, controlados via CSS
  // em .book3d-wrap) assim que a seção aparece na tela. O livro já chega girando:
  // o giro rápido de entrada roda por cima do próprio deslize.
  const wrap = document.getElementById('book3dWrap');
  const wrapStage = wrap ? wrap.closest('.sinopse-mockup') : null;
  if (wrap && 'IntersectionObserver' in window) {
    const entryIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          wrap.classList.add('is-visible');
          if (!prefersReduced) {
            entering = true;
            entryStart = null;
          } else {
            rotationActive = true;
          }
          entryIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    entryIo.observe(wrapStage || wrap);
  } else if (wrap) {
    wrap.classList.add('is-visible');
    rotationActive = !prefersReduced;
  }
})();

// ORBIT IMAGES — mockups do livro girando em órbita elíptica ao redor da foto da autora
(function () {
  const orbit = document.querySelector('.orbit');
  if (!orbit) return;

  const items = Array.from(orbit.querySelectorAll('.orbit-item')).map(el => ({
    el,
    angle: (parseFloat(el.dataset.angle) || 0) * (Math.PI / 180)
  }));
  if (!items.length) return;

  const DURATION = 16000; // ms por volta completa
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let rx = 0, ry = 0;
  function measure() {
    const w = orbit.clientWidth;
    const h = orbit.clientHeight;
    const itemHalf = (items[0].el.offsetWidth || 80) / 2;
    rx = Math.max(w / 2 - itemHalf, 10);
    ry = Math.max(h / 2 - itemHalf, 10);
  }

  function place(angle) {
    return {
      x: Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
      depth: (Math.sin(angle) + 1) / 2 // 0 = fundo, 1 = frente
    };
  }

  function render(angleOffset) {
    items.forEach(item => {
      const { x, y, depth } = place(item.angle + angleOffset);
      const scale = 0.72 + depth * 0.3;
      const opacity = 0.6 + depth * 0.4;
      item.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      item.el.style.opacity = opacity;
      item.el.style.zIndex = Math.round(depth * 100);
    });
  }

  measure();

  if (prefersReduced) {
    render(0);
  } else {
    let raf;
    const start = performance.now();
    function tick(now) {
      const elapsed = (now - start) % DURATION;
      const angleOffset = (elapsed / DURATION) * Math.PI * 2;
      render(angleOffset);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  const ro = new ResizeObserver(measure);
  ro.observe(orbit);
})();

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

// FOLD TITLE: split into chars and animate on load with 3D perspective fold
(function () {
  const el = document.getElementById('foldTitle');
  if (!el) return;
  el.querySelectorAll('.line1, .line2').forEach((line, lineIndex) => {
    const text = line.textContent;
    line.textContent = '';
    const baseDelay = lineIndex * text.length * 0.045; // offset between lines
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'fold-char';
      span.style.animationDelay = (baseDelay + i * 0.045) + 's';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      line.appendChild(span);
    });
  });
  requestAnimationFrame(() => {
    document.querySelectorAll('.fold-char').forEach(c => c.classList.add('play'));
  });
})();

// SPLIT TEXT: split section titles into individual chars, animate on scroll
// Uses word-level grouping so line breaks only happen between words, never mid-word.
(function () {
  const splitEls = document.querySelectorAll('.split-text');
  if (!splitEls.length) return;

  // Helper: split a text string into words, create a word wrapper for each,
  // and put individual char spans inside each word wrapper.
  function splitTextIntoWords(text, startIndex, parentFrag) {
    let charIndex = startIndex;
    // Normalize whitespace: collapse multiple spaces/newlines into single space, trim
    const cleaned = text.replace(/\s+/g, ' ');
    const words = cleaned.split(' ');
    words.forEach((word, wi) => {
      if (word.length === 0) return;
      // Word wrapper — inline-block + nowrap prevents mid-word breaks
      const wordSpan = document.createElement('span');
      wordSpan.className = 'split-word';
      [...word].forEach(ch => {
        const charSpan = document.createElement('span');
        charSpan.className = 'split-char';
        charSpan.style.transitionDelay = (charIndex * 0.025) + 's';
        charSpan.textContent = ch;
        wordSpan.appendChild(charSpan);
        charIndex++;
      });
      parentFrag.appendChild(wordSpan);
      // Add a normal space between words (not after the last word)
      if (wi < words.length - 1) {
        parentFrag.appendChild(document.createTextNode(' '));
      }
    });
    return charIndex;
  }

  splitEls.forEach(el => {
    const preserveHtml = el.dataset.splitPreserveHtml === 'true';
    if (preserveHtml) {
      const frag = document.createDocumentFragment();
      let charIndex = 0;
      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          charIndex = splitTextIntoWords(node.textContent, charIndex, frag);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const wrapper = node.cloneNode(false);
          wrapper.style.display = 'inline'; // keep color spans inline
          charIndex = splitTextIntoWords(node.textContent, charIndex, wrapper);
          frag.appendChild(wrapper);
        }
      });
      el.innerHTML = '';
      el.appendChild(frag);
    } else {
      const text = el.textContent;
      el.textContent = '';
      const frag = document.createDocumentFragment();
      splitTextIntoWords(text, 0, frag);
      el.appendChild(frag);
    }
  });

  // Observe each split-text element
  const splitObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('split-animated');
        splitObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '-80px' });

  splitEls.forEach(el => splitObs.observe(el));
})();

// ROTATING TEXT: cycle through words with spring-like vertical transition
(function () {
  const container = document.getElementById('rotatingText');
  if (!container) return;
  const items = Array.from(container.querySelectorAll('.rotating-text__item'));
  if (items.length < 2) return;

  let current = 0;
  const INTERVAL = 2500; // ms between rotations

  function rotate() {
    const prev = items[current];
    prev.classList.remove('is-active');
    prev.classList.add('is-exiting');

    current = (current + 1) % items.length;
    const next = items[current];
    next.classList.remove('is-exiting');
    next.classList.add('is-active');

    // Clean up exiting class after transition completes
    setTimeout(() => {
      prev.classList.remove('is-exiting');
    }, 500);
  }

  setInterval(rotate, INTERVAL);
})();

// REVEAL ON SCROLL
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      io.unobserve(el);
      const group = el.closest('.colab-grid');
      // Cards de colaboradores entram em cascata (um depois do outro);
      // o restante do site mantém o atraso fixo de sempre.
      const stagger = group ? Array.from(group.children).indexOf(el) * 120 : 0;
      setTimeout(() => el.classList.add('in-view'), 250 + stagger);
    }
  });
}, { threshold: 0.35 });
revealEls.forEach(el => io.observe(el));

// COLABORADORES — tilt 3D que segue o cursor (só em telas com mouse)
(function () {
  const cards = document.querySelectorAll('.colab-card');
  if (!cards.length) return;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (prefersReduced || !hasHover) return;

  cards.forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const tiltX = (px - 0.5) * 14; // rotateY
      const tiltY = (0.5 - py) * 14; // rotateX
      card.style.setProperty('--tilt-x', tiltX.toFixed(2) + 'deg');
      card.style.setProperty('--tilt-y', tiltY.toFixed(2) + 'deg');
      card.style.setProperty('--pointer-x', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--pointer-y', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
})();

// DEPOIMENTOS — clique pausa o carrossel, mover o mouse depois retoma
const depTrack = document.querySelector('.dep-track');
if (depTrack) {
  let lastX = null;
  let lastY = null;

  depTrack.addEventListener('click', (e) => {
    depTrack.classList.add('paused');
    lastX = e.clientX;
    lastY = e.clientY;
  });

  document.addEventListener('mousemove', (e) => {
    if (!depTrack.classList.contains('paused')) return;
    if (lastX === null) return;
    const moveu = Math.abs(e.clientX - lastX) > 4 || Math.abs(e.clientY - lastY) > 4;
    if (moveu) {
      depTrack.classList.remove('paused');
      lastX = null;
      lastY = null;
    }
  });
}

// TIMELINE "ALÉM DO LIVRO" — escalona os itens e cresce a linha ao entrar na tela
const pubList = document.querySelector('.pub-list');
if (pubList) {
  const pubItems = pubList.querySelectorAll('.pub-item');
  const stagger = 0.35; // segundos entre o início de um trabalho e o próximo
  pubItems.forEach((item, i) => {
    const base = i * stagger;
    // só o fade (3ª posição na lista de transition do .pub-item) ganha o atraso;
    // padding-left/border-color do hover continuam instantâneos
    item.style.transitionDelay = `0s, 0s, ${base}s`;

    const dot = item.querySelector('.pub-dot');
    if (dot) dot.style.transitionDelay = base + 's';

    // dentro de cada item, tag -> título -> descrição -> link aparecem em sequência
    const partes = item.querySelectorAll('.pub-tag, .pub-title, .pub-desc, .pub-link');
    partes.forEach((parte, j) => {
      parte.style.transitionDelay = (base + 0.18 + j * 0.16) + 's';
    });
  });
  const pubIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        pubList.classList.add('in-view');
        pubIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  pubIo.observe(pubList);
}

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

// BOOK SPREAD — páginas abertas lado a lado (fotos reais), com lightbox de zoom
(function () {
  const wrap = document.getElementById('bookSpread');
  if (!wrap) return;

  // spreads fotografados do miolo do livro
  const spreads = [
    { src: 'assets/book-pages/spread-23-24.png', label: 'Pág. 23–24', alt: 'Páginas 23–24 do livro' },
    { src: 'assets/book-pages/spread-25-26.png', label: 'Pág. 25–26', alt: 'Páginas 25–26 do livro' }
  ];
  let current = 0;

  const frame = document.getElementById('spreadFrame');
  const track = document.getElementById('spreadTrack');
  const slideEls = Array.from(track.querySelectorAll('.spread-img'));
  const indicator = document.getElementById('spreadIndicator');
  const prevBtn = document.getElementById('spreadPrev');
  const nextBtn = document.getElementById('spreadNext');

  const lightbox = document.getElementById('bookLightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbIndicator = document.getElementById('lightboxIndicator');
  const lbPrev = document.getElementById('lightboxPrev');
  const lbNext = document.getElementById('lightboxNext');
  const lbClose = document.getElementById('lightboxClose');

  // desliza o track até o slide "current", mede o slide real (responsivo) em vez de usar um valor fixo
  function slideTrack() {
    const slide = slideEls[0];
    if (!slide) return;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0);
    const slideWidth = slide.getBoundingClientRect().width;
    const offset = current * (slideWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;
  }

  function renderMain() {
    const s = spreads[current];
    slideEls.forEach((img, i) => img.classList.toggle('is-current', i === current));
    slideTrack();
    indicator.textContent = s.label;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === spreads.length - 1;
  }

  function renderLightbox() {
    const s = spreads[current];
    lbImg.src = s.src;
    lbImg.alt = s.alt;
    lbIndicator.textContent = s.label;
    lbPrev.disabled = current === 0;
    lbNext.disabled = current === spreads.length - 1;
  }

  function goNext() {
    if (current >= spreads.length - 1) return;
    current++;
    unzoomImg();
    renderMain();
    if (lightbox.classList.contains('open')) renderLightbox();
  }
  function goPrev() {
    if (current <= 0) return;
    current--;
    unzoomImg();
    renderMain();
    if (lightbox.classList.contains('open')) renderLightbox();
  }

  function unzoomImg() {
    lbImg.classList.remove('zoomed');
  }

  function openLightbox() {
    renderLightbox();
    unzoomImg();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    unzoomImg();
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);
  lbPrev.addEventListener('click', goPrev);
  lbNext.addEventListener('click', goNext);

  frame.addEventListener('click', openLightbox);
  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Zoom a partir do ponto clicado na imagem (clique novamente para voltar ao normal)
  lbImg.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lbImg.classList.contains('zoomed')) {
      unzoomImg();
      return;
    }
    const rect = lbImg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    lbImg.style.transformOrigin = `${px}% ${py}%`;
    lbImg.classList.add('zoomed');
  });

  window.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  // swipe support on touch devices (prévia principal)
  let touchStartX = null;
  wrap.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev(); }
    touchStartX = null;
  }, { passive: true });

  window.addEventListener('resize', slideTrack);

  renderMain();
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