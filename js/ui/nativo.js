// Ponte com o app Android (spec do app Android, §5.3 e §6). No navegador, `noApp()` é falso e nada daqui roda.
// Mensagens (texto JSON) do site para a casca: {tipo:'agendar', lembretes}, {tipo:'testar'}, {tipo:'permissao?'},
// {tipo:'pedirPermissao'}. A casca responde {tipo:'permissao', concedida}.
import { CONFIG_PADRAO, montarLembretes } from '../core/lembretes.js';

const CHAVE = 'projetoR.lembretes'; // fica no aparelho: só o celular notifica
const pad = (n) => String(n).padStart(2, '0');

export const noApp = (janela = globalThis) => Boolean(janela?.ProjetoRAndroid);

export function lerConfig(armazenamento = globalThis.localStorage) {
  try {
    const salvo = JSON.parse(armazenamento.getItem(CHAVE) ?? 'null');
    return { ...CONFIG_PADRAO, ...(salvo && typeof salvo === 'object' ? salvo : {}) };
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

export function salvarConfig(config, armazenamento = globalThis.localStorage) {
  armazenamento.setItem(CHAVE, JSON.stringify(config));
}

export const agoraLocal = (data = new Date()) =>
  `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;

// 'AAAA-MM-DDTHH:MM' sem fuso é lido como horário local do aparelho; a casca recebe milissegundos.
export const paraMensagem = (lembretes) => ({
  tipo: 'agendar',
  lembretes: lembretes.map((l) => ({ ...l, quando: new Date(l.quando).getTime() })),
});

// Monta a agenda com os meses já registrados e a entrega à casca (que troca a agenda antiga pela nova).
export function reagendar({ estado, config, agora, enviar }) {
  const lembretes = montarLembretes({ config, agora, mesesRegistrados: (estado?.meses ?? []).map((m) => m.mes) });
  enviar(JSON.stringify(paraMensagem(lembretes)));
  return lembretes;
}

export const enviarAoApp = (janela = globalThis) => (texto) => janela.ProjetoRAndroid?.postMessage(texto);
export const perguntarPermissao = (enviar) => enviar(JSON.stringify({ tipo: 'permissao?' }));
export const pedirPermissao = (enviar) => enviar(JSON.stringify({ tipo: 'pedirPermissao' }));
export const testar = (enviar) => enviar(JSON.stringify({ tipo: 'testar' }));

// Recebe as respostas da casca já como objeto; mensagens que não são JSON são ignoradas.
export function aoReceber(fn, janela = globalThis) {
  const ponte = janela?.ProjetoRAndroid;
  if (!ponte) return;
  ponte.onmessage = (evento) => {
    let mensagem;
    try {
      mensagem = JSON.parse(evento.data);
    } catch {
      return;
    }
    fn(mensagem);
  };
}
