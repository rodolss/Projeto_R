// Atualização automática (decisão de 2026-11-12): ao abrir ou voltar ao app, procura versão nova do site.
// Quando a versão nova assume (service worker), recarrega sozinho, menos se a pessoa estiver digitando ou com
// algo não salvo na tela (elemento com data-sem-recarregar); aí espera a próxima volta ao app.
// Depois de recarregar, avisa "App atualizado.".
const CHAVE = 'projetoR.atualizado';

export function emEdicao(documento) {
  return Boolean(documento.activeElement?.matches?.('input, select, textarea'))
    || Boolean(documento.querySelector('[data-sem-recarregar]'));
}

export function iniciarAtualizacao({
  sw, documento = globalThis.document, sessao = globalThis.sessionStorage, recarregar = () => globalThis.location.reload(), avisar,
}) {
  try {
    if (sessao.getItem(CHAVE)) {
      sessao.removeItem(CHAVE);
      avisar('App atualizado.');
    }
  } catch {
    // sem armazenamento de sessão: só não avisa
  }

  let controlador = sw.controller;
  let pendente = false;
  const tentar = () => {
    if (emEdicao(documento)) {
      pendente = true;
      return;
    }
    pendente = false;
    try {
      sessao.setItem(CHAVE, '1');
    } catch {
      // idem
    }
    recarregar();
  };

  // Na primeira instalação não havia versão anterior no controle: nada a recarregar.
  sw.addEventListener('controllerchange', () => {
    const anterior = controlador;
    controlador = sw.controller;
    if (anterior) tentar();
  });

  documento.addEventListener('visibilitychange', () => {
    if (documento.visibilityState !== 'visible') return;
    if (pendente) tentar();
    Promise.resolve(sw.ready).then((registro) => registro?.update()).catch(() => {});
  });
}
