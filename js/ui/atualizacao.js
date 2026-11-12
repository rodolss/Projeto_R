// Atualização automática (decisão de 2026-11-12): ao abrir ou voltar ao app, procura versão nova do site.
// Quando um service worker de outra versão assume, recarrega sozinho, mas só numa tela segura (sem edições
// guardadas apenas na memória), sem campo em foco e sem nada marcado com data-sem-recarregar. Se não for o
// momento, espera a próxima volta ao app ou a próxima troca de tela. Depois de recarregar, avisa "App atualizado.".
import { resolverRota } from './rotas.js';

const CHAVE = 'projetoR.atualizado';
// Orçamento, Ajustes, Histórico e o assistente guardam edições só na memória até "Salvar": não são seguras.
const TELAS_SEGURAS = ['inicio', 'mes', 'simular', 'mais'];

export function podeRecarregar({ hash, documento }) {
  return TELAS_SEGURAS.includes(resolverRota(hash, true))
    && !documento.activeElement?.matches?.('input, select, textarea')
    && !documento.querySelector('[data-sem-recarregar]');
}

// Pergunta a versão ao service worker que assumiu. Sem resposta (versão antiga, sem esse recurso): null.
function perguntarVersao(controlador, esperaMs) {
  return new Promise((responder) => {
    if (!controlador?.postMessage) { responder(null); return; }
    const canal = new MessageChannel();
    const terminar = (versao) => {
      clearTimeout(relogio);
      canal.port1.close();
      responder(versao);
    };
    const relogio = setTimeout(() => terminar(null), esperaMs);
    canal.port1.onmessage = (evento) => terminar(evento.data?.versao ?? null);
    try {
      controlador.postMessage({ tipo: 'versao' }, [canal.port2]);
    } catch {
      terminar(null);
    }
  });
}

export function iniciarAtualizacao({
  sw, versao, documento = globalThis.document, janela = globalThis, local = globalThis.location,
  sessao = globalThis.sessionStorage, recarregar = () => globalThis.location.reload(), avisar, esperaMs = 2000,
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
    if (!podeRecarregar({ hash: local.hash, documento })) {
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

  // Na primeira instalação não havia versão anterior no controle: nada a recarregar. Se o service worker novo
  // é da mesma versão da página (ela já abriu com o código novo), também não.
  sw.addEventListener('controllerchange', () => {
    const anterior = controlador;
    controlador = sw.controller;
    if (!anterior) return;
    perguntarVersao(controlador, esperaMs).then((dele) => { if (dele !== versao) tentar(); });
  });

  documento.addEventListener('visibilitychange', () => {
    if (documento.visibilityState !== 'visible') return;
    if (pendente) tentar();
    Promise.resolve(sw.ready).then((registro) => registro?.update()).catch(() => {});
  });

  // Trocar de tela já descarta o que estava só na memória: é um bom momento para a atualização que esperava.
  janela.addEventListener('hashchange', () => { if (pendente) tentar(); });
}
