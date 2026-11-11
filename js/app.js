/*
 * Telas do jogo (abertura, tabuleiro, comemorações) e a revelação animada do par.
 */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const screens = { title: $('#screen-title'), game: $('#screen-game'), finale: $('#screen-finale') };
  const reveal = { root: $('#reveal'), name: $('#reveal-name') };
  const progressFill = $('#progress-fill');
  const phaseMarks = $('#phase-marks');
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let currentPhase = 0;
  let screenRun = 0; // muda a cada troca de tela, para cancelar o que ficou pendente na anterior

  /* ---------- imagens ---------- */

  const imageCache = new Map();
  function loadImage(src) {
    if (!imageCache.has(src)) {
      imageCache.set(src, new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => { console.error(`Imagem não encontrada: ${src}`); resolve(img); };
        img.src = src;
      }));
    }
    return imageCache.get(src);
  }
  const petsOf = (phase) => PETS.slice(phase.from, phase.to);
  const loadCards = (pets) => Promise.all(pets.map((p) => loadImage(ASSET_PATH.card(p))));
  const loadFull = (pets) => Promise.all(pets.map((p) => loadImage(ASSET_PATH.full(p))));

  /* ---------- telas ---------- */

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    Stage.clear();
  }

  function setTheme(theme) {
    document.body.dataset.theme = theme;
  }

  /* Coloca bonecos em grade dentro de uma área da tela, pés no chão de cada célula. */
  function arrangeInGrid(actors, area) {
    const n = actors.length;
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const cell = Math.min(area.w / cols, area.h / rows);
      if (!best || cell > best.cell) best = { cols, rows, cell };
    }
    const cellW = area.w / best.cols;
    const cellH = area.h / best.rows;
    actors.forEach((actor, i) => {
      const row = Math.floor(i / best.cols);
      const inRow = Math.min(best.cols, n - row * best.cols);
      const col = i - row * best.cols;
      const box = Stage.safeBox(actor.motion, cellW * 0.98, cellH * 0.96);
      actor.boxW = box.w;
      actor.boxH = box.h;
      actor.x = area.x + (area.w - inRow * cellW) / 2 + cellW * (col + 0.5);
      actor.y = area.y + cellH * (row + 1) - cellH * 0.04;
    });
  }

  /* ---------- abertura ---------- */

  /* Próximos personagens da capa. Todos aparecem antes de alguém repetir, e a fila fica
     salva no aparelho: quem abrir o jogo de novo continua vendo criações diferentes. */
  const COVER_KEY = 'pets-memoria-capa';
  let coverShown = [];

  function nextCoverPets(count) {
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(COVER_KEY)) || []; } catch (_) { /* modo privado */ }
    queue = queue.filter((id) => PETS.some((p) => p.id === id));
    if (queue.length < count) {
      const refill = Board.shuffled(PETS.map((p) => p.id).filter((id) => !queue.includes(id)));
      // Quem acabou de aparecer vai para o fim da nova rodada
      refill.sort((a, b) => coverShown.includes(a) - coverShown.includes(b));
      queue.push(...refill);
    }
    coverShown = queue.slice(0, count);
    try { localStorage.setItem(COVER_KEY, JSON.stringify(queue.slice(count))); } catch (_) { /* modo privado */ }
    return coverShown.map((id) => PETS.find((p) => p.id === id));
  }

  async function showTitle() {
    const run = ++screenRun;
    const isCurrent = () => run === screenRun;
    Board.stop();
    show('title');
    setTheme('sol');
    let actors = [];

    const place = () => {
      if (!actors.length) return; // a tela mudou antes de o primeiro grupo carregar
      const panel = $('.title__panel').getBoundingClientRect();
      const free = Stage.height - panel.bottom;
      if (free >= 110) {
        actors.forEach((a) => { a.alpha = 1; });
        arrangeInGrid(actors, { x: 8, y: panel.bottom + 4, w: Stage.width - 16, h: free - 24 });
      } else {
        // Celular deitado: bonecos nas laterais do painel central
        const side = panel.left;
        actors.forEach((a, i) => { a.alpha = i < 2 ? 1 : 0; });
        arrangeInGrid([actors[0]], { x: 4, y: 40, w: side - 8, h: Stage.height - 48 });
        arrangeInGrid([actors[1]], { x: panel.right + 4, y: 40, w: side - 8, h: Stage.height - 48 });
      }
    };
    Stage.onResize(place);

    // Troca o grupo enquanto a capa estiver aberta
    while (isCurrent()) {
      const panel = $('.title__panel').getBoundingClientRect();
      const pets = nextCoverPets(Stage.height - panel.bottom >= 110 ? 5 : 2);
      const imgs = await loadCards(pets);
      if (!isCurrent()) return;

      const leaving = actors;
      if (leaving.length) {
        await Stage.tween(260, (p) => leaving.forEach((a) => { a.scale = 1 - p; }), Ease.inOut);
        if (!isCurrent()) return;
        leaving.forEach((a) => Stage.removeActor(a));
      }
      const arriving = pets.map((pet, i) => Stage.addActor({ ...petVisual(pet), img: imgs[i], strips: 22, scale: 0 }));
      actors = arriving;
      place();
      await Stage.tween(420, (p) => arriving.forEach((a) => { a.scale = p; }), Ease.out);
      if (!isCurrent()) return;
      await delay(TIMING.coverHoldMs);
    }
  }

  function petVisual(pet) {
    return { motion: pet.motion, eyes: pet.eyes || null, lid: pet.lid || null };
  }

  /* ---------- jogo ---------- */

  async function startPhase(index) {
    const run = ++screenRun;
    currentPhase = index;
    const phase = PHASES[index];
    show('game');
    setTheme(phase.theme);
    phaseMarks.querySelectorAll('.phase-mark').forEach((mark, i) => {
      mark.classList.toggle('is-on', i <= index);
    });
    const pets = petsOf(phase);
    await loadCards(pets);
    if (run !== screenRun) return;
    Board.start(phase);
    loadFull(pets); // deixa a imagem grande pronta antes do primeiro acerto
  }

  /* Tamanho e posição do personagem na revelação: o maior possível sem sair da tela
     em nenhum momento da dança. */
  function revealSpot(pet) {
    const labelTop = reveal.name.getBoundingClientRect().top;
    const top = Math.max(14, Stage.height * 0.02);
    const ground = labelTop - Math.max(16, Stage.height * 0.035); // espaço para a sombra
    const box = Stage.safeBox(pet.motion, Stage.width * 0.94, ground - top);
    return { x: Stage.width / 2, y: ground, w: box.w, h: box.h };
  }

  function waitForTapOrTime(ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      let armed = false;
      setTimeout(() => { armed = true; }, 500); // ignora o toque que veio junto da carta
      function onTap() { if (armed) done(); }
      function done() {
        clearTimeout(timer);
        reveal.root.removeEventListener('pointerdown', onTap);
        resolve();
      }
      reveal.root.addEventListener('pointerdown', onTap);
    });
  }

  async function onMatch(pet, cardA, cardB) {
    const img = await loadImage(ASSET_PATH.full(pet));
    const from = cardA.getBoundingClientRect();
    const to = cardB.getBoundingClientRect();

    Sound.match();
    reveal.name.textContent = pet.name;
    reveal.root.hidden = false;
    void reveal.root.offsetWidth;
    reveal.root.classList.add('is-open');

    const actor = Stage.addActor({
      ...petVisual(pet), img, strips: 40, live: 0,
      x: from.left + from.width / 2, y: from.bottom,
      boxW: from.width, boxH: from.height,
    });
    Stage.onResize(() => {
      if (actor.live < 1) return;
      const s = revealSpot(pet);
      Object.assign(actor, { x: s.x, y: s.y, boxW: s.w, boxH: s.h });
    });

    // Sai da carta e cresce até o centro
    let spot = revealSpot(pet);
    const start = { x: actor.x, y: actor.y, w: actor.boxW, h: actor.boxH };
    await Stage.tween(620, (bounce) => {
      const p = Math.min(bounce, 1); // o tamanho não passa do limite: nada sai da tela
      actor.x = start.x + (spot.x - start.x) * p;
      actor.y = start.y + (spot.y - start.y) * bounce;
      actor.boxW = start.w + (spot.w - start.w) * p;
      actor.boxH = start.h + (spot.h - start.h) * p;
      actor.spin = (1 - p) * -0.5;
      actor.live = Math.max(0, p);
    }, Ease.back);
    actor.live = 1;
    actor.spin = 0;
    spot = revealSpot(pet);
    Object.assign(actor, { x: spot.x, y: spot.y, boxW: spot.w, boxH: spot.h });

    Stage.burst(spot.x, spot.y - spot.h * 0.5);
    Sound.say(pet.name);
    await waitForTapOrTime(TIMING.revealHoldMs);

    // Volta para a carta
    reveal.root.classList.remove('is-open');
    const back = { x: actor.x, y: actor.y, w: actor.boxW, h: actor.boxH };
    Stage.onResize(null);
    await Stage.tween(380, (p) => {
      actor.x = back.x + (to.left + to.width / 2 - back.x) * p;
      actor.y = back.y + (to.bottom - back.y) * p;
      actor.boxW = back.w + (to.width - back.w) * p;
      actor.boxH = back.h + (to.height - back.h) * p;
      actor.live = 1 - p;
      actor.alpha = p > 0.8 ? (1 - p) * 5 : 1;
    }, Ease.inOut);
    Stage.removeActor(actor);
    reveal.root.hidden = true;
  }

  function onProgress(found, total) {
    progressFill.style.width = `${total ? (found / total) * 100 : 0}%`;
  }

  /* ---------- comemoração ---------- */

  async function showFinale() {
    const isLast = currentPhase === PHASES.length - 1;
    const phase = PHASES[currentPhase];
    const run = screenRun;
    await delay(350);
    if (run !== screenRun) return; // tocou em refazer ou início neste instante
    show('finale');
    $('#finale-text').textContent = isLast ? 'PARABÉNS!' : 'MUITO BEM!';
    $('#finale-stars').querySelectorAll('.star').forEach((star, i) => {
      star.classList.toggle('is-on', i <= currentPhase);
    });
    $('#btn-next').hidden = isLast;
    $('#btn-replay').hidden = !isLast;
    $('#btn-finale-again').hidden = isLast; // na última fase, o botão grande já recomeça

    isLast ? Sound.gameWin() : Sound.phaseWin();
    Sound.say(isLast ? 'parabéns' : 'muito bem');

    const pets = petsOf(phase);
    const imgs = await loadCards(pets);
    if (screens.finale.hidden) return;
    const actors = pets.map((pet, i) => Stage.addActor({
      ...petVisual(pet), img: imgs[i], strips: pets.length > 10 ? 14 : 20,
    }));
    const place = () => {
      const head = $('.finale__head').getBoundingClientRect();
      const foot = $('.finale__actions').getBoundingClientRect();
      arrangeInGrid(actors, { x: 12, y: head.bottom + 10, w: Stage.width - 24, h: foot.top - head.bottom - 16 });
    };
    place();
    Stage.onResize(place);
    Stage.rain();
  }

  /* ---------- montagem ---------- */

  function paintLogo() {
    const colors = ['c-roxo', 'c-azul', 'c-rosa', 'c-coral', 'c-verde'];
    let n = 0;
    document.querySelectorAll('[data-letters]').forEach((line) => {
      const text = line.textContent;
      line.setAttribute('aria-label', text);
      line.textContent = '';
      [...text].forEach((ch) => {
        if (ch === ' ') { line.append(' '); return; }
        const letter = document.createElement('span');
        letter.textContent = ch;
        letter.setAttribute('aria-hidden', 'true');
        letter.className = colors[n % colors.length];
        letter.style.setProperty('--r', `${((n * 37) % 11) - 5}deg`);
        letter.style.setProperty('--i', n);
        n++;
        line.append(letter);
      });
    });
  }

  function syncSoundButton() {
    const muted = Sound.isMuted();
    const button = $('#btn-sound');
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? 'LIGAR SOM' : 'DESLIGAR SOM');
    button.querySelector('use').setAttribute('href', muted ? '#i-sound-off' : '#i-sound-on');
  }

  function bind(selector, action) {
    $(selector).addEventListener('click', () => { Sound.tap(); action(); });
  }

  function init() {
    Stage.init($('#stage'));
    Board.init($('#board'), { onMatch, onProgress, onComplete: showFinale });
    paintLogo();
    syncSoundButton();

    // Navegadores só liberam áudio depois do primeiro gesto; no iPad, é o fim do toque que conta
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach((type) => {
      addEventListener(type, Sound.unlock, { capture: true });
    });
    // Pinça e arrasto não podem tirar o jogo do enquadramento
    ['gesturestart', 'gesturechange', 'gestureend', 'touchmove'].forEach((type) => {
      document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
    });
    FullScreen.init();
    // Segurar o dedo não abre menu nem seleciona imagem
    addEventListener('contextmenu', (event) => event.preventDefault());

    bind('#btn-play', () => startPhase(0));
    document.querySelectorAll('[data-phase]').forEach((button) => {
      button.addEventListener('click', () => { Sound.tap(); startPhase(Number(button.dataset.phase)); });
    });
    bind('#btn-restart', () => startPhase(currentPhase));
    bind('#btn-finale-again', () => startPhase(currentPhase));
    bind('#btn-home', showTitle);
    bind('#btn-finale-home', showTitle);
    bind('#btn-next', () => startPhase(currentPhase + 1));
    bind('#btn-replay', () => startPhase(0));
    $('#btn-sound').addEventListener('click', () => { Sound.toggle(); syncSoundButton(); Sound.tap(); });

    showTitle();
    document.fonts?.ready.then(() => dispatchEvent(new Event('resize'))); // a fonte muda a altura do logo
  }

  init();
})();
