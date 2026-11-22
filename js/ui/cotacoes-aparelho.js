// Preços e séries guardados no aparelho (desenhos 2026-11-22-cotacoes-automaticas e -renda-fixa-automatica): cotações da
// bolsa (`projetoR.cotacoes`), preços do Tesouro (`projetoR.tesouro`) e CDI diário (`projetoR.cdi`). Nunca vão para o
// repositório: são dados do mercado, iguais para todo mundo. A atualização roda em segundo plano quando a Carteira abre:
// pergunta o que está velho, grava o saldo do dia dos ativos que se atualizam sozinhos e redesenha a tela.
import { papelAutomatico, aplicarCotacoes } from '../core/cotacoes.js';
import { tituloCalculado, aplicarRendaFixa } from '../core/renda-fixa.js';
import { atualizarCotacoes, precisaAtualizar } from '../dados/cotacoes-remoto.js';
import { buscarTesouro, buscarCdi, precisaCdi } from '../dados/renda-fixa-remoto.js';
import { folhaAberta } from './rotas.js';

const CHAVES = { cotacoes: 'projetoR.cotacoes', tesouro: 'projetoR.tesouro', cdi: 'projetoR.cdi' };
const CINCO_MINUTOS = 5 * 60 * 1000;
const UMA_HORA = 60 * 60 * 1000;

function ler(chave, padrao) {
  try {
    const valor = JSON.parse(localStorage.getItem(chave) ?? 'null');
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : padrao;
  } catch {
    return padrao;
  }
}
const gravar = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem armazenamento: segue sem guardar */ } };

export const lerCotacoes = () => ler(CHAVES.cotacoes, {});
export const gravarCotacoes = (cotacoes) => gravar(CHAVES.cotacoes, cotacoes);
// Guarda uma cotação que já veio na busca (o papel recém-escolhido não precisa ser perguntado de novo).
export const guardarCotacao = (ticker, preco, agora = new Date()) => gravarCotacoes({ ...lerCotacoes(), [ticker]: { preco, em: agora.toISOString() } });

// Os preços do Tesouro guardados: { data, titulos, em }.
export const lerTesouro = () => ler(CHAVES.tesouro, null);
export const precoDoTesouro = (nome) => lerTesouro()?.titulos?.find((t) => t.nome === nome) ?? null;
// A lista do Tesouro para a busca: a guardada, se tem menos de uma hora; senão, a do site (e guarda).
export async function carregarTesouro(agora = new Date()) {
  const guardado = lerTesouro();
  if (guardado?.em && agora - new Date(guardado.em) < UMA_HORA) return guardado;
  const novo = await buscarTesouro({ fetch: (...a) => globalThis.fetch(...a) });
  if (!novo) return guardado;
  const comData = { ...novo, em: agora.toISOString() };
  gravar(CHAVES.tesouro, comData);
  return comData;
}

// As séries do cálculo da renda fixa: o CDI guardado e o IPCA do estado.
export const seriesDaRendaFixa = (estado) => ({ cdi: ler(CHAVES.cdi, {})?.serie ?? {}, ipca: estado?.ipca?.serie ?? {} });

// Uma tentativa por assunto a cada 5 minutos: uma fonte fora do ar não vira um pedido a cada desenho da tela.
const tentativas = new Map();
const podeTentar = (chave) => {
  if (Date.now() - (tentativas.get(chave) ?? 0) < CINCO_MINUTOS) return false;
  tentativas.set(chave, Date.now());
  return true;
};

let atualizando = false;

export async function atualizarEmSegundoPlano(ctx) {
  if (atualizando) return;
  const ativos = ctx.estado.ativos;
  const daBolsa = ativos.filter((a) => papelAutomatico(a) && a.fonte !== 'tesouro').map((a) => a.ticker);
  const temTesouro = ativos.some((a) => papelAutomatico(a) && a.fonte === 'tesouro');
  const calculados = ativos.filter(tituloCalculado);
  const desde = calculados.flatMap((a) => a.aplicacoes.map((x) => x.data)).sort()[0] ?? null;
  const guardadas = lerCotacoes();
  const cdiGuardado = ler(CHAVES.cdi, null);
  const tarefas = {
    bolsa: daBolsa.length > 0 && precisaAtualizar(guardadas, daBolsa) && podeTentar('bolsa'),
    tesouro: temTesouro && podeTentar('tesouro'),
    cdi: precisaCdi(cdiGuardado, desde) && podeTentar(`cdi-${desde}`),
  };
  if (!tarefas.bolsa && !tarefas.tesouro && !tarefas.cdi) return;
  atualizando = true;
  try {
    const fetch = (...a) => globalThis.fetch(...a);
    let cotacoes = guardadas;
    if (tarefas.bolsa) {
      ({ cotacoes } = await atualizarCotacoes(daBolsa, { fetch, guardadas }));
      gravarCotacoes(cotacoes);
    }
    const tesouro = tarefas.tesouro ? await carregarTesouro() : lerTesouro();
    if (tarefas.cdi) {
      const serie = await buscarCdi({ fetch, desde, ate: ctx.hoje, guardada: cdiGuardado?.serie ?? {} });
      if (serie !== (cdiGuardado?.serie ?? {})) gravar(CHAVES.cdi, { serie, atualizadoEm: new Date().toISOString() });
    }
    // O preço do Tesouro entra como uma cotação com o nome do título.
    const precos = { ...cotacoes };
    for (const t of tesouro?.titulos ?? []) precos[t.nome] = { preco: t.preco, em: tesouro.data };
    const series = seriesDaRendaFixa(ctx.estado);
    const aplicar = (e) => aplicarRendaFixa(aplicarCotacoes(e, precos, ctx.hoje), series, ctx.hoje);
    const mudou = aplicar(ctx.estado) !== ctx.estado;
    if (mudou) await ctx.salvar(aplicar);
    // Com uma folha aberta, não redesenha (o que está sendo digitado ficaria perdido): o valor novo aparece no próximo desenho.
    if (mudou && !folhaAberta(location.hash)) ctx.rerender();
  } catch (erro) {
    console.warn('Não atualizei os preços', erro);
  } finally {
    atualizando = false;
  }
}
