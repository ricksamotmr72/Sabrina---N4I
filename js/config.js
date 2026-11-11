/*
 * CONFIGURAÇÃO DO JOGO — tudo que muda com frequência está aqui.
 *
 * PETS   : ordem em que os personagens entram no jogo. Os 5 primeiros são os da
 *          fase 1, e foram escolhidos por serem os mais diferentes entre si.
 * id     : identificador interno. Não mude: o código usa este nome.
 * image  : nome do arquivo da imagem, sem a extensão .webp. Para renomear uma imagem,
 *          use tools/renomear-imagem.ps1 (ver README), que ajusta as pastas e este arquivo.
 * eyes   : olhos para a animação de piscar, em proporção da imagem (0 a 1):
 *          [centroX, centroY, raioX, raioY]. Sem `eyes`, o personagem não pisca.
 * lid    : cor da pálpebra (a cor do rosto ao redor do olho).
 * motion : hop | sway | wiggle | stretch | rock | twirl (ver MOTIONS em stage.js).
 */
const PETS = [
  { id: 'gato-branco', image: 'gato-branco', name: 'GATO',       motion: 'stretch', lid: '#F4F1E8', eyes: [[.367, .268, .087, .053], [.619, .263, .087, .057]] },
  { id: 'coelho-roxo', image: 'coelho-roxo', name: 'COELHO',     motion: 'hop',     lid: '#4B2A9E', eyes: [[.447, .498, .048, .044], [.593, .508, .050, .044]] },
  { id: 'cachorro-robo', image: 'cachorro-robo', name: 'CACHORRO',   motion: 'rock',    lid: '#0F7A72', eyes: [[.383, .462, .079, .059], [.647, .446, .081, .065]] },
  { id: 'dino-azul', image: 'dino-azul', name: 'CAVALO', motion: 'rock',    lid: '#159A80', eyes: [[.672, .143, .052, .062]] },
  { id: 'elefante-roxo', image: 'elefante-roxo', name: 'ELEFANTE',   motion: 'sway',    lid: '#5B2CA8', eyes: [[.492, .265, .036, .051]] },

  { id: 'foca-cinza', image: 'foca-cinza', name: 'FOCA',       motion: 'wiggle',  lid: '#3A3F48', eyes: [[.430, .276, .038, .052], [.562, .280, .038, .052]] },
  { id: 'gato-azul', image: 'gato-azul', name: 'GATO',       motion: 'hop',     lid: '#1F5AA8', eyes: [[.475, .348, .059, .045], [.675, .356, .059, .047]] },
  { id: 'coelho-coracao', image: 'coelho-coracao', name: 'COELHO',     motion: 'rock',    lid: '#6A3BB0', eyes: [[.370, .257, .057, .099], [.585, .252, .058, .096]] },
  { id: 'cachorro-pintado', image: 'cachorro-pintado', name: 'CACHORRO',   motion: 'sway',    lid: '#3A55C8', eyes: [[.370, .473, .051, .049], [.512, .469, .051, .049]] },
  { id: 'gato-rosa', image: 'gato-rosa', name: 'GATO',       motion: 'wiggle',  lid: '#8F4E45', eyes: [[.433, .300, .077, .058], [.622, .294, .073, .058]] },

  { id: 'coelho-laranja', image: 'coelho-laranja', name: 'COELHO',     motion: 'stretch' },
  { id: 'cachorro-azul', image: 'cachorro-azul', name: 'CACHORRO',   motion: 'hop',     lid: '#B98B5A', eyes: [[.429, .452, .048, .059], [.640, .378, .045, .065]] },
  { id: 'gato-listrado', image: 'gato-listrado', name: 'GATO',       motion: 'twirl' },
  { id: 'gato-pintado', image: 'gato-pintado', name: 'GATO',       motion: 'sway',    lid: '#EDE6DA', eyes: [[.470, .390, .052, .034], [.634, .387, .055, .034]] },
  { id: 'gato-vermelho', image: 'gato-vermelho', name: 'GATO',       motion: 'rock',    lid: '#5A2A3A', eyes: [[.427, .551, .047, .069], [.562, .511, .046, .069]] },
];

/*
 * FASES — `from` e `to` são posições na lista PETS. Cada personagem vira um par.
 *
 * Atual (cumulativo): 10, 20 e 30 cartas.
 * Para fases mais curtas, com 5 personagens novos em cada (sempre 10 cartas), use:
 *   from 0 / to 5  ·  from 5 / to 10  ·  from 10 / to 15
 */
const PHASES = [
  { from: 0, to: 5,  theme: 'sol',  peekMs: 2500 },
  { from: 0, to: 10, theme: 'mar',  peekMs: 3000 },
  { from: 0, to: 15, theme: 'lua',  peekMs: 3500 },
];

const TIMING = {
  dealStepMs: 45,        // intervalo entre cada carta ao distribuir
  matchDelayMs: 420,     // pausa entre virar a 2ª carta e o personagem aparecer
  missDelayMs: 1300,     // tempo para ver o par errado antes de desvirar
  revealHoldMs: 2800,    // tempo do personagem dançando no centro da tela
  idleHintMs: 9000,      // sem toques por este tempo: uma carta balança chamando
  hintAfterMisses: 4,    // erros seguidos até a carta par balançar como dica
  coverHoldMs: 4500,     // tempo de cada grupo de personagens na capa
};

// Pastas das imagens: cada personagem tem um arquivo com o mesmo nome em cada uma.
const IMAGE_FOLDERS = { card: 'assets/pets/card', full: 'assets/pets/full' };
const ASSET_PATH = {
  card: (pet) => `${IMAGE_FOLDERS.card}/${pet.image}.webp`,
  full: (pet) => `${IMAGE_FOLDERS.full}/${pet.image}.webp`,
};
