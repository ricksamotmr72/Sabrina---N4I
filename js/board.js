/*
 * Regras do jogo da memória e cartas na tela.
 * Não há tempo, placar nem derrota: errar só desvira as cartas. Depois de alguns
 * erros seguidos, a carta par balança como dica, para ninguém ficar empacado.
 */
const Board = (() => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shuffled = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  let boardEl, handlers;
  let cards = [], first = null, locked = true;
  let pairsLeft = 0, totalPairs = 0, missStreak = 0;
  let session = 0, idleTimer = 0;

  function init(el, callbacks) {
    boardEl = el;
    handlers = callbacks;
    new ResizeObserver(layout).observe(boardEl);
    boardEl.addEventListener('click', (event) => {
      const button = event.target.closest('.card');
      if (button) tap(cards[Number(button.dataset.index)]);
    });
  }

  function createCard(pet, index) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'card is-up is-dealing';
    el.dataset.index = index;
    el.setAttribute('aria-label', 'CARTA');
    el.style.setProperty('--deal-delay', `${index * TIMING.dealStepMs}ms`);
    el.style.setProperty('--tilt', `${(Math.random() * 2.4 - 1.2).toFixed(2)}deg`);
    el.innerHTML = `
      <span class="card__inner">
        <span class="card__face card__face--front">
          <img src="${ASSET_PATH.card(pet)}" alt="" draggable="false">
          <svg class="card__star" aria-hidden="true"><use href="#i-star"/></svg>
        </span>
        <span class="card__face card__face--back">
          <svg class="card__paw" aria-hidden="true"><use href="#i-paw"/></svg>
        </span>
      </span>`;
    return { el, pet, up: true, matched: false };
  }

  /* Fileiras possíveis para um número de cartas. Além das retangulares, aceita a
     desencontrada com a do meio maior (3-4-3), que aumenta as cartas no iPad em pé. */
  function rowOptions(count) {
    const options = [];
    for (let rows = 1; rows <= count; rows++) {
      const base = Math.floor(count / rows);
      if (count % rows === 0) {
        options.push({ rows: Array(rows).fill(base), penalty: 1 });
      } else if (count % rows === 1 && rows % 2 === 1 && rows >= 3) {
        const pattern = Array(rows).fill(base);
        pattern[(rows - 1) / 2] += 1;
        options.push({ rows: pattern, penalty: 1.2 }); // só vale se a carta crescer bem
      }
    }
    return options;
  }

  /* Escolhe as fileiras que deixam a carta maior, com todas dentro do tabuleiro. */
  function layout() {
    const count = cards.length;
    if (!count) return;
    const { width, height } = boardEl.getBoundingClientRect();
    if (!width || !height) return; // tabuleiro escondido
    const gap = Math.floor(Math.max(5, Math.min(width, height) * 0.018));
    // Folga para a inclinação e a sombra das cartas não encostarem na borda
    const usableW = width - 8;
    const usableH = height - 10;
    let best = null;
    rowOptions(count).forEach(({ rows, penalty }) => {
      const widest = Math.max(...rows);
      const cellW = (usableW - gap * (widest - 1)) / widest;
      const cellH = (usableH - gap * (rows.length - 1)) / rows.length;
      const cardW = Math.min(cellW, cellH * 1.1, 380);
      const cardH = Math.min(cellH, cardW / 0.68); // cartas altas aproveitam a tela em pé
      const score = (cardW * cardH) / penalty;
      if (!best || score > best.score) best = { rows, widest, cardW, cardH, score };
    });

    // Cada carta ocupa 2 meias-colunas: assim uma fileira menor fica centralizada
    const cardW = Math.floor(best.cardW);
    boardEl.style.setProperty('--tracks', best.widest * 2);
    boardEl.style.setProperty('--track', `${(cardW - gap) / 2}px`);
    boardEl.style.setProperty('--card-h', `${Math.floor(best.cardH)}px`);
    boardEl.style.setProperty('--gap', `${gap}px`);
    let index = 0;
    best.rows.forEach((size, row) => {
      for (let i = 0; i < size; i++, index++) {
        const style = cards[index].el.style;
        style.gridRow = row + 1;
        style.gridColumn = `${1 + best.widest - size + i * 2} / span 2`;
      }
    });
  }

  function setUp(card, up) {
    card.up = up;
    card.el.classList.toggle('is-up', up);
    card.el.setAttribute('aria-label', up ? card.pet.name : 'CARTA');
  }

  function resetIdle(alive) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!alive()) return;
      if (!locked) {
        const waiting = cards.filter((c) => !c.up && !c.matched);
        if (waiting.length) nudge(waiting[Math.floor(Math.random() * waiting.length)]);
      }
      resetIdle(alive);
    }, TIMING.idleHintMs);
  }

  function nudge(card) {
    card.el.classList.remove('is-nudged');
    void card.el.offsetWidth; // reinicia a animação
    card.el.classList.add('is-nudged');
  }

  async function start(phase) {
    const mySession = ++session;
    const alive = () => mySession === session;
    clearTimeout(idleTimer);
    locked = true;
    first = null;
    missStreak = 0;

    const pets = PETS.slice(phase.from, phase.to);
    totalPairs = pairsLeft = pets.length;
    cards = shuffled([...pets, ...pets]).map(createCard);
    boardEl.replaceChildren(...cards.map((c) => c.el));
    layout();
    handlers.onProgress(0, totalPairs);

    // Distribui e deixa ver todas as cartas por um instante antes de desvirar
    await delay(cards.length * TIMING.dealStepMs + 500);
    if (!alive()) return;
    cards.forEach((c) => c.el.classList.remove('is-dealing'));
    await delay(phase.peekMs);
    if (!alive()) return;

    for (const card of cards) {
      setUp(card, false);
      await delay(18);
      if (!alive()) return;
    }
    Sound.flip();
    await delay(450);
    if (!alive()) return;

    locked = false;
    resetIdle(alive);
  }

  async function tap(card) {
    if (!card || locked || card.up || card.matched) return;
    const mySession = session;
    const alive = () => mySession === session;
    resetIdle(alive);
    Sound.flip();
    setUp(card, true);

    if (!first) {
      first = card;
      if (missStreak >= TIMING.hintAfterMisses) {
        const partner = cards.find((c) => c !== card && c.pet.id === card.pet.id);
        partner.el.classList.add('is-hinted');
      }
      return;
    }

    const second = card;
    const opened = first;
    first = null;
    locked = true;
    cards.forEach((c) => c.el.classList.remove('is-hinted'));

    if (opened.pet.id === second.pet.id) {
      await delay(TIMING.matchDelayMs);
      if (!alive()) return;
      opened.matched = second.matched = true;
      missStreak = 0;
      pairsLeft--;
      await handlers.onMatch(opened.pet, opened.el, second.el);
      if (!alive()) return;
      opened.el.classList.add('is-matched');
      second.el.classList.add('is-matched');
      handlers.onProgress(totalPairs - pairsLeft, totalPairs);
      if (pairsLeft === 0) {
        clearTimeout(idleTimer);
        handlers.onComplete();
      } else {
        locked = false;
      }
    } else {
      missStreak++;
      Sound.miss();
      opened.el.classList.add('is-wrong');
      second.el.classList.add('is-wrong');
      await delay(TIMING.missDelayMs);
      if (!alive()) return;
      opened.el.classList.remove('is-wrong');
      second.el.classList.remove('is-wrong');
      setUp(opened, false);
      setUp(second, false);
      await delay(380);
      if (!alive()) return;
      locked = false;
    }
  }

  function stop() {
    session++;
    locked = true;
    clearTimeout(idleTimer);
    cards = [];
    boardEl.replaceChildren();
  }

  return { init, start, stop, shuffled };
})();
