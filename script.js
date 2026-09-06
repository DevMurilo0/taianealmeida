// NAV scroll state
const nav = document.getElementById('mainNav');

// NAV ACTIVE SECTION — approved red indicator, isolated from page layout.
(function () {
  const links = Array.from(document.querySelectorAll('#mainNav .nav-links a[href^="#"]'));
  const targets = links
    .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter(item => item.section);
  if (!targets.length || !('IntersectionObserver' in window)) return;

  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      targets.forEach(({ link, section }) => {
        const active = section === entry.target;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-38% 0px -53% 0px' });

  targets.forEach(({ section }) => activeObserver.observe(section));
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
    const parallaxUpdates = !prefersReduced ? parallaxEls.reduce((updates, el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -400 || rect.top > window.innerHeight + 400) return updates;
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      const centerOffset = (rect.top + rect.height / 2) - window.innerHeight / 2;
      updates.push([el, -centerOffset * speed]);
      return updates;
    }, []) : [];
    if (nav) nav.classList.toggle('scrolled', scrollY > 40);
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

      parallaxUpdates.forEach(([el, offset]) => {
        el.style.transform = `translateY(${offset.toFixed(2)}px)`;
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
  let bookVisible = false;
  let hasEntered = false;
  let bookRaf = 0;
  let entryStart = null;
  const entryBaseRy = ry;
  const ENTRY_SPINS = 380;    // graus extras percorridos na entrada (pouco mais de 1 volta)
  const ENTRY_DURATION = window.matchMedia('(max-width: 720px)').matches ? 1800 : 3200;

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
    bookRaf = (bookVisible || dragging || entering) ? requestAnimationFrame(frame) : 0;
  }

  book.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startRy = ry;
    startRx = rx;
    book.setPointerCapture(e.pointerId);
    if (!prefersReduced && !bookRaf) bookRaf = requestAnimationFrame(frame);
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

  // Dispara a entrada (fade + deslize com "estouro" suave, controlados via CSS
  // em .book3d-wrap) assim que a seção aparece na tela. O livro já chega girando:
  // o giro rápido de entrada roda por cima do próprio deslize.
  const wrap = document.getElementById('book3dWrap');
  const wrapStage = wrap ? wrap.closest('.sinopse-mockup') : null;
  if (wrap) {
    wrap.addEventListener('animationend', () => {
      wrap.style.willChange = 'auto';
    }, { once: true });
  }
  if (wrap && 'IntersectionObserver' in window) {
    const entryIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        bookVisible = entry.isIntersecting;
        if (entry.isIntersecting) {
          if (!hasEntered) {
            hasEntered = true;
            wrap.classList.add('is-visible');
            if (!prefersReduced) {
              entering = true;
              entryStart = null;
            } else {
              rotationActive = true;
            }
          }
          if (!prefersReduced && !bookRaf) {
            lastTs = null;
            bookRaf = requestAnimationFrame(frame);
          }
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 140px 0px' });
    entryIo.observe(wrapStage || wrap);
  } else if (wrap) {
    bookVisible = true;
    wrap.classList.add('is-visible');
    rotationActive = !prefersReduced;
    if (!prefersReduced) bookRaf = requestAnimationFrame(frame);
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

  const DURATION = 16000; // ms por volta completa a velocidade normal
  const TWO_PI = Math.PI * 2;
  const OMEGA = TWO_PI / DURATION; // rad/ms em velocidade normal
  const HIGHLIGHT_SCALE = 1.28; // quanto o item em destaque cresce
  const EASE = 0.14; // suavização do crescimento/encolhimento (mais fluido)
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

  // extra de escala por item, animado suavemente em direção ao alvo (0 = normal, 1 = destaque total)
  items.forEach(item => { item.extra = 0; item.extraTarget = 0; });

  function render(angleOffset, dt) {
    items.forEach(item => {
      const { x, y, depth } = place(item.angle + angleOffset);
      item.extra += (item.extraTarget - item.extra) * Math.min(1, EASE * (dt / 16 || 1));

      const scale = (0.72 + depth * 0.3) * (1 + item.extra * (HIGHLIGHT_SCALE - 1));
      const opacity = 0.6 + depth * 0.4;
      item.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      item.el.style.opacity = opacity;
      item.el.style.zIndex = item.extra > 0.01 ? 200 : Math.round(depth * 100);
      item.el.style.filter = item.extra > 0.01
        ? `drop-shadow(0 ${18 + item.extra * 10}px ${26 + item.extra * 14}px rgba(0,0,0,${0.35 + item.extra * 0.15}))`
        : '';
    });
  }

  measure();

  // Estado da rotação: desacelera de forma contínua durante a interação.
  let mode = 'normal';
  let angleOffset = 0;
  let hovered = null;
  let speedScale = 1;
  let speedTarget = 1;

  function startSeek(item) {
    hovered = item;
    mode = 'hovering';
    speedTarget = 0.06;
    orbit.classList.add('is-interacting');
    items.forEach(it => {
      const active = it === item;
      it.extraTarget = active ? 1 : 0;
      it.el.classList.toggle('is-orbit-active', active);
    });
  }

  function clearHover() {
    hovered = null;
    mode = prefersReduced ? 'paused-static' : 'normal';
    speedTarget = prefersReduced ? 0 : 1;
    orbit.classList.remove('is-interacting');
    items.forEach(it => {
      it.extraTarget = 0;
      it.el.classList.remove('is-orbit-active');
    });
  }

  items.forEach(item => {
    item.el.addEventListener('mouseenter', () => startSeek(item));
    item.el.addEventListener('mouseleave', () => {
      if (hovered === item) clearHover();
    });
    item.el.addEventListener('focus', () => startSeek(item));
    item.el.addEventListener('blur', () => {
      if (hovered === item) clearHover();
    });
    item.el.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') startSeek(item);
    });
    item.el.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse' && hovered === item) clearHover();
    });
    item.el.addEventListener('pointercancel', () => {
      if (hovered === item) clearHover();
    });
  });

  if (prefersReduced) {
    render(0, 16);
  } else {
    let raf = 0;
    let last = performance.now();
    let isVisible = false;

    function tick(now) {
      if (!isVisible) {
        raf = 0;
        return;
      }
      const dt = Math.min(now - last, 48); // evita saltos após aba inativa
      last = now;

      speedScale += (speedTarget - speedScale) * Math.min(1, dt * 0.008);

      if (mode === 'normal' || mode === 'hovering') {
        angleOffset = (angleOffset + OMEGA * dt * speedScale) % TWO_PI;
      }

      render(angleOffset, dt);
      raf = requestAnimationFrame(tick);
    }

    if ('IntersectionObserver' in window) {
      const orbitObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !raf) {
          last = performance.now();
          raf = requestAnimationFrame(tick);
        }
      }, { rootMargin: '160px 0px', threshold: 0 });
      orbitObserver.observe(orbit);
    } else {
      isVisible = true;
      raf = requestAnimationFrame(tick);
    }
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
  const compact = window.matchMedia('(max-width: 720px)').matches;
  const charDelay = compact ? 0.025 : 0.045;
  el.querySelectorAll('.line1, .line2').forEach((line, lineIndex) => {
    const text = line.textContent;
    line.textContent = '';
    const baseDelay = lineIndex * text.length * charDelay;
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'fold-char';
      span.style.animationDelay = (baseDelay + i * charDelay) + 's';
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
  const splitEls = document.querySelectorAll('.split-text:not(.livro-title)');
  if (!splitEls.length) return;
  const compact = window.matchMedia('(max-width: 720px)').matches;

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
        const charStagger = compact ? 0.012 : 0.02;
        charSpan.style.transitionDelay = (charIndex * charStagger) + 's';
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

  if ('IntersectionObserver' in window) {
    const splitObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('split-animated');
          splitObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 140px 0px' });
    splitEls.forEach(el => splitObs.observe(el));
  } else {
    splitEls.forEach(el => el.classList.add('split-animated'));
  }
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

  let timer = 0;
  let visible = true;
  const schedule = () => {
    clearTimeout(timer);
    if (visible && !document.hidden) timer = window.setTimeout(() => {
      rotate();
      schedule();
    }, INTERVAL);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }, { rootMargin: '120px 0px' }).observe(container);
  }
  document.addEventListener('visibilitychange', schedule);
  schedule();
})();

// O LIVRO — timeline editorial, acionada progressivamente pelo viewport.
// O estado final não altera o layout; apenas opacity/transform/clip-path são animados.
(function () {
  const section = document.getElementById('livro');
  const title = section && section.querySelector('.livro-title');
  if (!section || !title) return;

  const prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let hasPlayed = false;
  function buildEditorialLines() {
    const lines = [
      [{ text: 'NECROPOLÍTICA ' }, { text: 'E', red: true }],
      [{ text: 'REFLEXÕES', red: true }, { text: ' ACERCA DA' }],
      [{ text: 'POPULAÇÃO NEGRA NO' }],
      [{ text: 'TERRITÓRIO BAIANO' }]
    ];
    const fragment = document.createDocumentFragment();
    lines.forEach((line, lineIndex) => {
      const mask = document.createElement('span');
      mask.className = 'livro-title-line';
      const inner = document.createElement('span');
      inner.className = 'livro-title-line__inner';
      inner.style.setProperty('--livro-line', lineIndex);
      line.forEach(part => {
        if (part.red) {
          const accent = document.createElement('span');
          accent.className = 'red';
          accent.textContent = part.text;
          inner.appendChild(accent);
        } else {
          inner.appendChild(document.createTextNode(part.text));
        }
      });
      mask.appendChild(inner);
      fragment.appendChild(mask);
      if (lineIndex < lines.length - 1) fragment.appendChild(document.createTextNode('\n'));
    });
    title.replaceChildren(fragment);
    title.style.setProperty('--livro-lines', lines.length);
    section.style.setProperty('--livro-lines', lines.length);
    if (hasPlayed || prefersReduced) title.classList.add('is-lines-visible');
  }

  buildEditorialLines();

  if (prefersReduced || !('IntersectionObserver' in window)) {
    section.classList.add('livro-entrance-ready', 'livro-intro-active',
      'livro-secondary-active', 'livro-spread-active');
    title.classList.add('is-lines-visible');
    return;
  }

  section.classList.add('livro-entrance-ready');

  const introObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    hasPlayed = true;
    section.classList.add('livro-intro-active');
    title.classList.add('is-lines-visible');
    introObserver.disconnect();
  }, { threshold: 0.01, rootMargin: '0px 0px 160px 0px' });

  const secondaryObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    section.classList.add('livro-secondary-active');
    secondaryObserver.disconnect();
  }, { threshold: 0.01, rootMargin: '0px 0px 80px 0px' });

  const spreadObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    section.classList.add('livro-spread-active');
    spreadObserver.disconnect();
  }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

  introObserver.observe(section);
  const countdown = section.querySelector('#countdown');
  const spread = section.querySelector('#bookSpread');
  if (countdown) secondaryObserver.observe(countdown);
  else section.classList.add('livro-secondary-active');
  if (spread) spreadObserver.observe(spread);
  else section.classList.add('livro-spread-active');
})();

// REVEAL ON SCROLL
const revealEls = Array.from(document.querySelectorAll('.reveal'))
  .filter(el => !el.closest('.livro'));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const group = el.closest('.colab-grid');
      const staggerStep = window.matchMedia('(max-width: 720px)').matches ? 65 : 90;
      const stagger = group ? Array.from(group.children).indexOf(el) * staggerStep : 0;
      el.style.setProperty('--reveal-delay', `${stagger}ms`);
      el.classList.add('in-view');
    });
  }, { threshold: 0.01, rootMargin: '0px 0px 160px 0px' });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in-view'));
}

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

// DEPOIMENTOS — seção temporariamente oculta; a guarda mantém a lógica inativa e pronta para restauração
// Clique pausa o carrossel, mover o mouse depois retoma
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

  // No toque não existe "mover o mouse": retoma ao tocar fora do carrossel
  document.addEventListener('touchstart', (e) => {
    if (!depTrack.classList.contains('paused')) return;
    if (!depTrack.contains(e.target)) {
      depTrack.classList.remove('paused');
      lastX = null;
      lastY = null;
    }
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      depTrack.classList.toggle('offscreen', !entry.isIntersecting);
    }, { rootMargin: '160px 0px' }).observe(depTrack);
  }
}

// TIMELINE "ALÉM DO LIVRO" — escalona os itens e cresce a linha ao entrar na tela
const pubList = document.querySelector('.pub-list');
if (pubList) {
  const pubItems = pubList.querySelectorAll('.pub-item');
  const compact = window.matchMedia('(max-width: 720px)').matches;
  const stagger = compact ? 0.07 : 0.12;
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
      parte.style.transitionDelay = (base + 0.06 + j * (compact ? 0.05 : 0.07)) + 's';
    });
  });
  if ('IntersectionObserver' in window) {
    const pubIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          pubList.classList.add('in-view');
          pubIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 180px 0px' });
    pubIo.observe(pubList);
  } else {
    pubList.classList.add('in-view');
  }
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
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || prefersReduced) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  let sparks = [];
  let raf = 0;
  const sparkColor = '#c81f1f', sparkCount = 8, sparkSize = 10, sparkRadius = 22, duration = 450;
  window.addEventListener('click', (e) => {
    const now = performance.now();
    for (let i = 0; i < sparkCount; i++) {
      sparks.push({ x: e.clientX, y: e.clientY, angle: (2 * Math.PI * i) / sparkCount, start: now });
    }
    if (!raf) raf = requestAnimationFrame(draw);
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
    raf = sparks.length ? requestAnimationFrame(draw) : 0;
  }
})();

// Livro CTA — mantém o botão do Spotify preparado até que a URL oficial seja definida.
(function () {
  const spotifyBtn = document.getElementById('spotifyBtn');
  if (!spotifyBtn) return;
  const url = spotifyBtn.dataset.spotifyUrl?.trim();
  if (url) {
    spotifyBtn.removeAttribute('aria-disabled');
    spotifyBtn.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
    return;
  }
  spotifyBtn.addEventListener('click', (event) => event.preventDefault());
})();

// Player customizado do trecho do audiobook. O áudio é opcional até o arquivo real ser adicionado.
(function () {
  const player = document.getElementById('audiobookPlayer');
  const audio = document.getElementById('audiobookAudio');
  const play = document.getElementById('audioPlay');
  const progress = document.getElementById('audioProgress');
  const current = document.getElementById('audioCurrent');
  const duration = document.getElementById('audioDuration');
  if (!player || !audio || !play || !progress || !current || !duration) return;

  const formatTime = (value) => {
    if (!Number.isFinite(value) || value < 0) return '--:--';
    const minutes = Math.floor(value / 60).toString().padStart(2, '0');
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  const updateProgress = () => {
    const ratio = Number.isFinite(audio.duration) && audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.value = ratio;
    current.textContent = formatTime(audio.currentTime);
  };
  const setPlaying = (isPlaying) => {
    player.classList.toggle('is-playing', isPlaying);
    play.setAttribute('aria-label', isPlaying ? 'Pausar trecho do audiobook' : 'Reproduzir trecho do audiobook');
  };
  const enable = () => {
    play.disabled = false;
    progress.disabled = false;
    duration.textContent = formatTime(audio.duration);
    updateProgress();
  };

  // Sem src, o componente permanece visível e seguro, aguardando o arquivo real.
  if (audio.getAttribute('src')) {
    audio.addEventListener('loadedmetadata', enable, { once: true });
    audio.addEventListener('durationchange', enable);
  }
  play.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  });
  progress.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  });
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => { setPlaying(false); updateProgress(); });
})();

// BOOK SPREAD — páginas abertas lado a lado (fotos reais), com lightbox de zoom
(function () {
  const wrap = document.getElementById('bookSpread');
  if (!wrap) return;

  // spreads fotografados do miolo do livro
  const spreads = [
    { src: 'assets/book-pages/spread-23-24.webp', label: 'Pág. 23–24', alt: 'Páginas 23–24 do livro' },
    { src: 'assets/book-pages/spread-25-26.webp', label: 'Pág. 25–26', alt: 'Páginas 25–26 do livro' }
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

// NEWSLETTER — envio para o formulário público da Brevo, sem expor credenciais.
(function () {
  window.EMAIL_INVALID_MESSAGE = 'Digite um endereço de e-mail válido.';
  window.REQUIRED_ERROR_MESSAGE = 'Digite seu e-mail para continuar.';
  window.GENERIC_INVALID_MESSAGE = 'Digite um endereço de e-mail válido.';

  const form = document.getElementById('sib-form');
  const message = document.getElementById('nlMsg');
  if (!form || !message) return;
  const submit = form.querySelector('button[type="submit"]');
  const email = form.querySelector('#EMAIL');

  const showMessage = (text, type) => {
    message.textContent = text;
    message.className = `nl-msg is-${type}`;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!email.checkValidity()) {
      showMessage('Digite um endereço de e-mail válido.', 'error');
      email.focus();
      return;
    }
    submit.disabled = true;
    const originalLabel = submit.textContent;
    submit.textContent = 'Enviando...';
    message.textContent = '';
    message.className = 'nl-msg';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Brevo returned ${response.status}`);
      showMessage('Cadastro recebido! Confira seu e-mail para confirmar sua inscrição.', 'success');
      form.reset();
    } catch (error) {
      console.warn('Não foi possível enviar o formulário da Brevo.', error);
      showMessage('Não foi possível realizar o cadastro. Tente novamente em alguns instantes.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  });
})();

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
