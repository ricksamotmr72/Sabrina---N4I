/*
 * Palco em <canvas> que anima os personagens como bonecos de verdade:
 * a imagem é desenhada em fatias horizontais deslocadas, o que faz o corpo dobrar
 * a partir dos pés. Pulo, achatamento e piscar de olhos completam a ilusão.
 */
const MOTIONS = {
  // Cada função recebe o tempo em segundos e devolve a pose do boneco.
  hop(t) {
    const p = (t % 0.72) / 0.72;
    const landing = Math.exp(-p * 9) + Math.exp(-(1 - p) * 14);
    return { hop: Math.sin(p * Math.PI) * 0.2, sx: 1 + landing * 0.1, sy: 1 - landing * 0.13, bend: Math.sin(t * 4.4) * 0.03 };
  },
  sway(t) {
    return { rot: Math.sin(t * 5) * 0.035, bend: Math.sin(t * 5) * 0.13, sy: 1 + Math.sin(t * 10) * 0.02 };
  },
  wiggle(t) {
    return { wave: { amp: 0.055, len: 1.5, speed: 7 }, sy: 1 + Math.sin(t * 7) * 0.02 };
  },
  stretch(t) {
    const s = Math.sin(t * 6.5);
    return { sx: 1 - s * 0.09, sy: 1 + s * 0.14, bend: Math.cos(t * 3.25) * 0.05 };
  },
  rock(t) {
    const s = Math.sin(t * 6);
    return { rot: s * 0.13, hop: Math.abs(s) * 0.05 };
  },
  twirl(t) {
    const p = t % 2.6;
    const spin = p < 0.9 ? Math.cos((p / 0.9) * Math.PI * 2) : 1;
    return { sx: Math.abs(spin) < 0.06 ? 0.06 : spin, hop: p < 0.9 ? Math.sin((p / 0.9) * Math.PI) * 0.16 : 0, bend: p < 0.9 ? 0 : Math.sin(t * 5) * 0.08 };
  },
};

/* Quanto cada dança ultrapassa o tamanho parado: rise para cima (fração da altura) e
   side para cada lado (fração da largura). Garante que nada saia da tela. */
const MOTION_RANGE = {
  hop:     { rise: 0.24, side: 0.04 },
  sway:    { rise: 0.04, side: 0.17 },
  wiggle:  { rise: 0.04, side: 0.08 },
  stretch: { rise: 0.16, side: 0.11 },
  rock:    { rise: 0.18, side: 0.18 },
  twirl:   { rise: 0.18, side: 0.10 },
};

const Ease = {
  linear: (p) => p,
  out: (p) => 1 - (1 - p) ** 3,
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  back: (p) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2,
};

const Stage = (() => {
  const CONFETTI_COLORS = ['#FF5A5F', '#FFC531', '#12B5A6', '#1E78E6', '#7A3FE0', '#F6389A', '#FFF8E7'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let canvas, ctx, viewW = 0, viewH = 0, dpr = 1;
  let actors = [], confetti = [], tweens = [];
  let frame = 0, lastTime = 0, clock = 0;
  let resizeListener = null;

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d');
    resize();
    addEventListener('resize', resize);
    // O iPad só informa o tamanho final um instante depois de girar
    addEventListener('orientationchange', () => { resize(); setTimeout(resize, 350); });
  }

  function resize() {
    viewW = innerWidth;
    viewH = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    if (resizeListener) resizeListener();
    requestFrame();
  }

  function requestFrame() {
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    clock += dt;

    tweens = tweens.filter((tween) => {
      tween.elapsed += dt * 1000;
      const p = Math.min(tween.elapsed / tween.duration, 1);
      tween.update(tween.ease(p));
      if (p >= 1) { tween.resolve(); return false; }
      return true;
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    actors.forEach((actor) => drawActor(actor));
    drawConfetti(dt);

    if (actors.length || confetti.length || tweens.length) requestFrame();
  }

  /* ---------- bonecos ---------- */

  function addActor(options) {
    const actor = {
      x: 0, y: 0, boxW: 100, boxH: 100,
      alpha: 1, scale: 1, live: 1, spin: 0,
      motion: 'sway', eyes: null, lid: null,
      strips: 30, shadow: true, sprites: null,
      seed: Math.random() * 10,
      ...options,
    };
    actors.push(actor);
    requestFrame();
    return actor;
  }

  function removeActor(actor) {
    actors = actors.filter((a) => a !== actor);
  }

  /* Pré-desenha o boneco de olhos meio fechados e fechados. */
  function buildBlinkSprites(actor) {
    const { img, eyes, lid } = actor;
    const w = img.naturalWidth, h = img.naturalHeight;
    const makeSprite = (amount) => {
      const sprite = document.createElement('canvas');
      sprite.width = w; sprite.height = h;
      const g = sprite.getContext('2d');
      g.drawImage(img, 0, 0);
      eyes.forEach(([cx, cy, rx, ry]) => {
        const ex = cx * w, ey = cy * h, erx = rx * w * 1.14, ery = ry * h * 1.14;
        g.save();
        g.beginPath();
        g.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = lid;
        const lidEdge = ey - ery + ery * 2 * amount;
        g.fillRect(ex - erx, ey - ery, erx * 2, lidEdge - (ey - ery));
        g.restore();
        // cílio: a linha escura que faz o olho fechado ser lido como olho
        g.strokeStyle = 'rgba(40, 22, 12, .78)';
        g.lineWidth = Math.max(3, erx * 0.14);
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(ex - erx * 0.9, Math.min(lidEdge, ey + ery * 0.2));
        g.quadraticCurveTo(ex, Math.min(lidEdge, ey + ery * 0.2) + ery * 0.42, ex + erx * 0.9, Math.min(lidEdge, ey + ery * 0.2));
        g.stroke();
      });
      return sprite;
    };
    actor.sprites = { half: makeSprite(0.55), closed: makeSprite(1) };
  }

  function currentSprite(actor) {
    if (!actor.eyes || actor.live < 0.5) return actor.img;
    const p = (clock + actor.seed) % 2.7;
    if (p > 0.22) return actor.img;
    if (!actor.sprites) buildBlinkSprites(actor);
    return p < 0.05 || p > 0.17 ? actor.sprites.half : actor.sprites.closed;
  }

  function drawActor(actor) {
    const { img } = actor;
    if (!img || !img.naturalWidth) return;
    const fit = Math.min(actor.boxW / img.naturalWidth, actor.boxH / img.naturalHeight) * actor.scale;
    const w = img.naturalWidth * fit;
    const h = img.naturalHeight * fit;
    if (w < 1 || h < 1) return;

    const live = reducedMotion.matches ? actor.live * 0.25 : actor.live;
    const t = clock + actor.seed;
    const pose = MOTIONS[actor.motion](t);
    const hop = (pose.hop || 0) * live;
    const sx = 1 + ((pose.sx ?? 1) - 1) * live;
    const sy = 1 + ((pose.sy ?? 1) - 1) * live;
    const rot = (pose.rot || 0) * live + actor.spin;
    const bend = (pose.bend || 0) * live;
    const wave = pose.wave;

    ctx.globalAlpha = actor.alpha;

    if (actor.shadow) {
      ctx.fillStyle = 'rgba(58, 34, 18, .2)';
      ctx.beginPath();
      ctx.ellipse(actor.x, actor.y, (w / 2) * (1 - hop * 1.4), Math.max(2, h * 0.022), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(actor.x, actor.y - hop * h);
    ctx.rotate(rot);
    ctx.scale(sx, sy);

    const sprite = currentSprite(actor);
    const strips = actor.strips;
    const srcSlice = img.naturalHeight / strips;
    const dstSlice = h / strips;
    for (let i = 0; i < strips; i++) {
      const up = 1 - (i + 0.5) / strips; // 0 nos pés, 1 no topo
      let offset = bend * up ** 1.6;
      if (wave) offset += Math.sin(up * wave.len * Math.PI * 2 - t * wave.speed) * wave.amp * up ** 0.8 * live;
      ctx.drawImage(sprite, 0, i * srcSlice, img.naturalWidth, srcSlice + 1, -w / 2 + offset * w, -h + i * dstSlice, w, dstSlice + 0.8);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------- confete de papel ---------- */

  function burst(x, y, count = 70) {
    if (reducedMotion.matches) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 220 + Math.random() * 520;
      confetti.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 240,
        size: 7 + Math.random() * 10,
        turn: Math.random() * 6,
        turnSpeed: 3 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
        life: 2 + Math.random() * 1.2,
      });
    }
    requestFrame();
  }

  function rain(count = 90) {
    if (reducedMotion.matches) return;
    for (let i = 0; i < count; i++) {
      confetti.push({
        x: Math.random() * viewW,
        y: -40 - Math.random() * viewH * 0.9,
        vx: (Math.random() - 0.5) * 60,
        vy: 80 + Math.random() * 120,
        size: 8 + Math.random() * 10,
        turn: Math.random() * 6,
        turnSpeed: 2 + Math.random() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
        life: 7,
      });
    }
    requestFrame();
  }

  function drawConfetti(dt) {
    confetti = confetti.filter((c) => c.life > 0 && c.y < viewH + 40);
    confetti.forEach((c) => {
      c.life -= dt;
      c.vy += 620 * dt * (c.vy > 180 ? 0.05 : 1); // cai devagar, como papel
      c.vx *= 1 - 1.4 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.turn += c.turnSpeed * dt;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.turn);
      ctx.scale(1, Math.cos(c.turn * 1.6));
      ctx.globalAlpha = Math.min(c.life * 2, 1);
      ctx.fillStyle = c.color;
      if (c.round) {
        ctx.beginPath();
        ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-c.size / 2, -c.size / 3, c.size, c.size * 0.66);
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- utilitários ---------- */

  function tween(duration, update, ease = Ease.out) {
    return new Promise((resolve) => {
      tweens.push({ duration, update, ease, resolve, elapsed: 0 });
      requestFrame();
    });
  }

  function clear() {
    tweens.forEach((t) => t.resolve());
    tweens = [];
    actors = [];
    confetti = [];
    resizeListener = null;
    requestFrame();
  }

  return {
    init, addActor, removeActor, burst, rain, tween, clear,
    /* Maior caixa que garante que o boneco caiba em w x h durante toda a dança. */
    safeBox(motion, w, h) {
      const range = MOTION_RANGE[motion];
      return { w: w / (1 + range.side * 2), h: h / (1 + range.rise) };
    },
    onResize(fn) { resizeListener = fn; },
    get width() { return viewW; },
    get height() { return viewH; },
  };
})();
