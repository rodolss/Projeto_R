// Cotações guardadas no aparelho (desenho 2026-11-22-cotacoes-automaticas): `projetoR.cotacoes` = { CÓDIGO: { preco, em } }.
// Nunca vão para o repositório: é dado do mercado, igual para todo mundo. A atualização roda em segundo plano quando a
// Carteira abre: se a cotação passou de 15 minutos, pergunta de novo, grava o saldo do dia e redesenha a tela.
import { papelAutomatico, aplicarCotacoes } from '../core/cotacoes.js';
import { atualizarCotacoes, precisaAtualizar } from '../dados/cotacoes-remoto.js';
import { folhaAberta } from './rotas.js';

const CHAVE = 'projetoR.cotacoes';
const CINCO_MINUTOS = 5 * 60 * 1000;

export function lerCotacoes() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
    return guardadas && typeof guardadas === 'object' && !Array.isArray(guardadas) ? guardadas : {};
  } catch {
    return {};
  }
}

export function gravarCotacoes(cotacoes) {
  try { localStorage.setItem(CHAVE, JSON.stringify(cotacoes)); } catch { /* sem armazenamento: segue sem guardar */ }
}

// Guarda uma cotação que já veio na busca (o papel recém-escolhido não precisa ser perguntado de novo).
export const guardarCotacao = (ticker, preco, agora = new Date()) => gravarCotacoes({ ...lerCotacoes(), [ticker]: { preco, em: agora.toISOString() } });

let atualizando = false;
let ultimaTentativa = 0; // uma API fora do ar não pode virar um pedido a cada desenho da tela

export async function atualizarEmSegundoPlano(ctx) {
  const tickers = ctx.estado.ativos.filter(papelAutomatico).map((a) => a.ticker);
  const guardadas = lerCotacoes();
  if (!tickers.length || atualizando || Date.now() - ultimaTentativa < CINCO_MINUTOS || !precisaAtualizar(guardadas, tickers)) return;
  atualizando = true;
  ultimaTentativa = Date.now();
  try {
    const { cotacoes } = await atualizarCotacoes(tickers, { fetch: (...a) => globalThis.fetch(...a), guardadas });
    const mudou = JSON.stringify(cotacoes) !== JSON.stringify(guardadas);
    gravarCotacoes(cotacoes);
    if (aplicarCotacoes(ctx.estado, cotacoes, ctx.hoje) !== ctx.estado) await ctx.salvar((e) => aplicarCotacoes(e, cotacoes, ctx.hoje));
    // Com uma folha aberta, não redesenha (o que está sendo digitado ficaria perdido): o valor novo aparece no próximo desenho.
    if (mudou && !folhaAberta(location.hash)) ctx.rerender();
  } catch (erro) {
    console.warn('Não atualizei as cotações', erro);
  } finally {
    atualizando = false;
  }
}
