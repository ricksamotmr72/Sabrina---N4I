# Jogo da Memória dos Pets

Jogo da memória para crianças de até 5 anos, com 15 bichinhos artesanais de papelão.
Ao encontrar um par, o personagem salta da carta, dança e pisca, e o nome dele aparece e é falado.

## Como abrir

Dê dois cliques em `index.html`. Não precisa instalar nada.

## Como publicar

É um site estático: qualquer hospedagem com HTTPS serve (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
Envie `index.html`, `manifest.webmanifest` e as pastas `css/`, `js/` e `assets/`, cerca de 3 MB no total.

**Não envie `IMG/` nem `tools/`.** `IMG/` guarda os originais (27 MB), que o jogo não usa, e `tools/` é só
para manutenção. Guarde as duas fora da publicação.

## Tela cheia no iPad

Navegadores não permitem que uma página entre em tela cheia sozinha ao abrir: é preciso um toque.

| Como abrir | O que acontece |
| --- | --- |
| **Ícone na Tela de Início (recomendado)** | Abre direto sem as barras do Safari, sem precisar de toque |
| Link no Safari | Entra em tela cheia no primeiro toque e volta no toque seguinte, se alguém sair |

Para instalar o ícone: abra o endereço publicado no Safari do iPad, toque em **Compartilhar** e depois em
**Adicionar à Tela de Início**. Isso exige o jogo publicado; não funciona com o arquivo aberto localmente.

Para o iPad ficar só no jogo, ative o **Acesso Guiado** em Ajustes > Acessibilidade. Ele impede a criança de
sair do app. O som também depende da chave de silêncio e do volume do aparelho.

## Estrutura

```
index.html              telas e ícones
manifest.webmanifest    instalação na Tela de Início
css/styles.css          visual
js/config.js            personagens, imagens, fases e tempos  ← o arquivo que você vai querer editar
js/board.js             regras do jogo e cartas
js/stage.js             animação dos personagens e confete
js/audio.js             sons e fala
js/fullscreen.js        tela cheia
js/app.js               navegação entre telas e revelação do par
assets/pets/card/       imagens das cartas (até 512 px)
assets/pets/full/       imagens da animação (até 1024 px)
assets/fonts/           fonte Fredoka (licença SIL OFL)
assets/ui/              textura, bordas e ícones do app
tools/                  script de manutenção das imagens (fora da publicação)
IMG/                    originais (fora da publicação)
```

## Como renomear uma imagem

Cada personagem tem um `id`, que nunca muda, e um `image`, que é o nome do arquivo:

```js
{ id: 'gato-branco', image: 'gato-branco', name: 'GATO', ... }
```

O arquivo existe com o mesmo nome nas duas pastas de imagem. Há duas formas de renomear.

**Com o script (Windows).** No terminal, dentro da pasta do projeto:

```
powershell -ExecutionPolicy Bypass -File tools\renomear-imagem.ps1 -De gato-branco -Para mimi
```

Ele renomeia nas duas pastas e atualiza `js/config.js`. Se algo estiver errado, avisa antes de alterar qualquer
coisa. Sem `-De` e `-Para`, só confere tudo: lista os nomes e aponta imagens faltando ou sem uso.

**À mão (qualquer sistema).**

1. Renomeie o arquivo em `assets/pets/card/` e em `assets/pets/full/`, com o mesmo nome nas duas.
2. Em `js/config.js`, troque o `image` desse personagem. Não mexa no `id`.

Use letras minúsculas sem acento, números e hífen (`gato-da-sabrina`). Evite espaços e acentos: em muitas
hospedagens, maiúsculas e acentos fazem a imagem não ser encontrada. Se uma imagem faltar, o console do navegador
mostra `Imagem não encontrada` com o caminho.

### De onde veio cada imagem

| `image` | Original em `IMG/` |
| --- | --- |
| `gato-branco` | Gato artesanal de cartão colorido |
| `gato-azul` | Gato artesanal colorido em cartão |
| `gato-rosa` | Gato Artesanal Colorido em Cartão (1) |
| `gato-listrado` | Gato artesanal de cartão pintado |
| `gato-pintado` | Gato Artesanal de Cartão Pintado (1) |
| `gato-vermelho` | Gato de cartão colorido com cauda |
| `coelho-roxo` | Coelhinho artesanal colorido em cartão |
| `coelho-coracao` | Coelhinho artesanal de cartão colorido |
| `coelho-laranja` | Coelhinho de cartão colorido artesanal |
| `cachorro-robo` | Cão robô artesanal colorido |
| `cachorro-pintado` | Cão de cartão pintado e colorido |
| `cachorro-azul` | Cão artesanal de cartão pintado em azul |
| `dino-azul` | Dinossauro artesanal de cartão reciclado |
| `elefante-roxo` | Escultura de Elefante em Cartão Pintado |
| `foca-cinza` | Foca Artesanal de Cartão Pintado |

## Ajustes comuns (em `js/config.js`)

| Quero mudar | Onde |
| --- | --- |
| Tamanho das fases | `PHASES`. Há uma alternativa de 10 cartas por fase no comentário |
| Quem entra em cada fase | Ordem da lista `PETS` |
| Nome falado e escrito | `name` do personagem, em maiúsculas |
| Jeito de dançar | `motion`: `hop`, `sway`, `wiggle`, `stretch`, `rock` ou `twirl` |
| Quanto tempo ele dança | `revealHoldMs` em `TIMING` |
| Quando a dica aparece | `hintAfterMisses` em `TIMING` |
| Tempo de cada grupo na capa | `coverHoldMs` em `TIMING` |

## Como trocar ou adicionar um personagem

1. Prepare a imagem com fundo transparente, bem recortada, sem sobra de margem.
2. Exporte em WebP com qualidade por volta de 85 ([squoosh.app](https://squoosh.app) resolve) em dois tamanhos,
   com o mesmo nome: até 512 px em `assets/pets/card/` e até 1024 px em `assets/pets/full/`.
3. Inclua o personagem em `PETS`, com `id` e `image`. O campo `eyes` é opcional: sem ele, o personagem só não pisca.

Limite atual: as telas foram testadas com até 15 pares.

## Decisões de projeto

- **Imagens dentro do projeto.** São poucas e leves. Assim o jogo não depende de outro serviço, carrega
  rápido e cada versão publicada leva junto as imagens certas.
- **Animação por código, não vídeo.** Os recortes transparentes viram bonecos em tempo real, sem peso
  extra e em qualquer tamanho de tela.
- **Sem tempo, placar ou derrota.** Errar só desvira as cartas. Depois de 4 erros seguidos, a carta par
  balança como dica; depois de 9 segundos sem toque, uma carta balança chamando.
- **Todas as criações na capa.** Grupos de 5 se alternam em ordem sorteada, e ninguém repete antes de todos
  aparecerem. A fila fica salva no aparelho e continua na próxima vez que o jogo abrir.
- **Pouco texto.** Só letras bastão e em poucos lugares. Os botões são ícones.
- **Acessibilidade.** Funciona por teclado, tem rótulos para leitor de tela e reduz o movimento quando o
  aparelho pede.
- **Tudo sempre visível.** As cartas são recalculadas para cada tamanho de tela, e cada dança tem o espaço
  reservado em `MOTION_RANGE` (`js/stage.js`), para o personagem não sair da tela. Ao criar uma dança nova,
  ajuste também essa tabela.
- **Privacidade.** Não há login, cookies, anúncios nem chamadas externas. Só a preferência de som fica
  salva no aparelho.

## Limitações conhecidas

- A fala depende da voz em português instalada no aparelho. Sem ela, o jogo segue sem falar o nome.
- O iPhone não oferece tela cheia para páginas no Safari: lá, ela só existe com o ícone na Tela de Início.
- Instalado na Tela de Início, o jogo ainda precisa de internet para abrir: não há modo offline.
- Precisa de navegador de 2020 ou mais novo, por causa do formato WebP.
