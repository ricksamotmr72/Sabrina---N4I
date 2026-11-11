/*
 * Tela cheia. Navegadores não deixam uma página entrar em tela cheia sozinha:
 * é preciso um toque. Por isso, o jogo pede a tela cheia a cada toque em que ela
 * não está ativa: no primeiro toque depois de abrir e também se alguém sair dela.
 *
 * Instalado na Tela de Início do iPad, o jogo já abre sem as barras do navegador e
 * este pedido não é necessário (ver manifest.webmanifest e README).
 */
const FullScreen = (() => {
  const root = document.documentElement;

  const isInstalledApp = () =>
    navigator.standalone === true ||
    matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;

  const isActive = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

  function enter() {
    if (isActive() || isInstalledApp()) return;
    try {
      const request = root.requestFullscreen
        ? root.requestFullscreen({ navigationUI: 'hide' })
        : root.webkitRequestFullscreen?.();
      // Recusa não é erro: o iPhone não oferece tela cheia e o jogo segue normalmente
      request?.catch?.(() => {});
    } catch (_) { /* navegador sem suporte */ }
  }

  function init() {
    ['touchend', 'click', 'keydown'].forEach((type) => {
      addEventListener(type, enter, { capture: true });
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((type) => {
      document.addEventListener(type, () => dispatchEvent(new Event('resize')));
    });
  }

  return { init, isActive };
})();
