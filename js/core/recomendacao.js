// Onde investir (desenho 2026-11-22-onde-investir): a recomendação que a análise no Claude Code (/onde-investir) grava
// no estado — a lista estável da carteira de renda isenta (fundos imobiliários e ações boas pagadoras, comprados
// direto) e as ordens do mês em cotas inteiras. O app só valida, mostra e registra o que foi comprado.
import { CLASSES } from './alocacao.js';

export const ESTRATEGIA_RENDA_ISENTA = { fiis: 0.5, acoes: 0.5 };
const CLASSES_ISENTAS = ['fiis', 'acoes'];
const FRASES = {
  fiis: 'Fundos imobiliários: aluguéis e recebíveis, rendimentos mensais isentos de IR para pessoa física',
  acoes: 'Ações de empresas boas pagadoras: dividendos isentos de IR (o JCP tem 15%)',
};
const MES = /^\d{4}-\d{2}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const igualCodigo = (a, b) => String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

export function validarRecomendacao(r) {
  const erros = [];
  if (!r || typeof r !== 'object') return { ok: false, erros: ['a recomendação não é um objeto'] };
  if (!MES.test(r.mes ?? '')) erros.push('mes precisa ser AAAA-MM');
  if (!DATA.test(r.geradaEm ?? '')) erros.push('geradaEm precisa ser AAAA-MM-DD');
  if (!(Number.isFinite(r.valor) && r.valor >= 0)) erros.push('valor precisa ser um número >= 0');
  const lista = Array.isArray(r.lista) ? r.lista : [];
  const ordens = Array.isArray(r.ordens) ? r.ordens : [];
  if (!lista.length) erros.push('a lista da carteira está vazia');
  for (const a of lista) {
    if (!a.ticker || !a.nome || !a.motivo) erros.push(`${a.ticker ?? '?'}: a lista precisa de ticker, nome e motivo`);
    if (!CLASSES_ISENTAS.includes(a.classe)) erros.push(`${a.ticker}: classe "${a.classe}" não é de renda isenta (fiis ou acoes)`);
  }
  for (const o of ordens) {
    if (!lista.some((a) => igualCodigo(a.ticker, o.ticker))) erros.push(`${o.ticker}: a ordem está fora da lista da carteira`);
    if (!(Number.isInteger(o.cotas) && o.cotas >= 1)) erros.push(`${o.ticker}: cotas precisam ser um número inteiro >= 1`);
    if (!(o.preco > 0)) erros.push(`${o.ticker}: preço precisa ser > 0`);
    else if (Math.abs(o.valor - o.cotas * o.preco) > Math.max(0.05, o.cotas * o.preco * 0.01)) erros.push(`${o.ticker}: o valor não bate com cotas × preço`);
  }
  const soma = ordens.reduce((s, o) => s + (o.valor ?? 0), 0);
  if (Number.isFinite(r.valor) && soma > r.valor + 0.01) erros.push(`as ordens (${soma.toFixed(2)}) passam do valor (${r.valor.toFixed(2)})`);
  return { ok: erros.length === 0, erros };
}

// Grava a recomendação e põe a carteira-alvo na estratégia dela (o motor usa os pesos na divisão por classe; o primeiro
// da lista de cada classe fica como o investimento padrão dela).
export function aplicarRecomendacao(estado, r) {
  const estrategia = r.estrategia ?? ESTRATEGIA_RENDA_ISENTA;
  const carteiraAlvo = Object.fromEntries(CLASSES.map((c) => {
    const primeiro = (r.lista ?? []).find((a) => a.classe === c);
    const antes = estado.carteiraAlvo?.[c] ?? {};
    return [c, { ...antes, peso: estrategia[c] ?? 0, ...(primeiro ? { ticker: primeiro.ticker, frase: FRASES[c] ?? antes.frase } : {}) }];
  }));
  return { ...estado, recomendacao: structuredClone(r), carteiraAlvo };
}

export const recomendacaoDoMes = (estado, mes) => (estado?.recomendacao?.mes === mes ? estado.recomendacao : null);

// As ordens no formato do aplicado do Dia de pagamento: o destino é o código (o motor acha o investimento ou o cria).
export const aplicadoDasOrdens = (r) => (r?.ordens ?? []).map((o) => ({
  destino: { ticker: o.ticker, classe: o.classe, nome: o.nome },
  nome: `${o.ticker} · ${o.cotas} ${o.cotas === 1 ? 'cota' : 'cotas'}`,
  valor: o.valor,
  cotas: o.cotas,
}));
