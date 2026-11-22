// Renda fixa automática (desenho 2026-11-22-renda-fixa-automatica): CDB, LCI e LCA não têm preço público, mas o valor sai
// da taxa contratada. Cada aplicação (e cada resgate, com valor negativo) rende da sua data até hoje: % do CDI pelo CDI
// diário do Banco Central; prefixado e IPCA+ pelos dias úteis (os dias com CDI publicado). O valor do dia vira um saldo do
// dia, como nas ações: o motor, os gráficos e o Dia de pagamento continuam lendo saldos. É uma estimativa: não considera
// taxas nem a marcação a mercado.
import { papelAutomatico, papelDoGrupo, comSaldoSeMudou } from './cotacoes.js';
import { fatorInflacao, ultimoMes } from './ipca.js';

const centavos = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const idPadrao = () => globalThis.crypto.randomUUID();
const UM_DIA = 24 * 60 * 60 * 1000;

export const tituloCalculado = (ativo) => Boolean(ativo?.rendaFixa) && Array.isArray(ativo?.aplicacoes);

// O que o app atualiza sozinho (sem pedir o saldo da corretora): papel da bolsa, Tesouro e título calculado.
export const atualizaSozinho = (ativo) => papelAutomatico(ativo) || tituloCalculado(ativo);

// Quanto R$ 1 aplicado em `de` vale em `ate`. `cdi`: { 'AAAA-MM-DD': % ao dia }; `ipca`: { 'AAAA-MM': fração do mês }.
export function fatorDoTitulo(rf, { de, ate, cdi = {}, ipca = {} }) {
  const dias = Object.keys(cdi ?? {}).filter((d) => d >= de && d < ate);
  if (rf.indexador === 'cdi') return dias.reduce((f, d) => f * (1 + (cdi[d] / 100) * rf.taxa), 1);
  const juros = (1 + rf.taxa) ** (dias.length / 252);
  if (rf.indexador === 'pre') return juros;
  // IPCA+: o IPCA dos meses depois do mês da aplicação, até o último publicado (nunca um mês que ainda não terminou).
  const mesDe = de.slice(0, 7);
  const ultimo = [ultimoMes(ipca ?? {}), ate.slice(0, 7)].filter(Boolean).sort()[0];
  const inflacao = ultimo && ultimo > mesDe ? fatorInflacao(ipca, mesDe, ultimo) : 1;
  return inflacao * juros;
}

// As aplicações e resgates do título e os aportes do Dia de pagamento nele (contam como aplicação na data do registro).
const movimentos = (estado, ativo) => [
  ...ativo.aplicacoes,
  ...estado.meses.flatMap((m) => (m.aplicado ?? []).filter((a) => a.ativoId === ativo.id && a.valor).map((a) => ({ data: m.data ?? `${m.mes}-31`, valor: a.valor }))),
];

export function valorBruto(estado, ativo, series, hoje) {
  const total = movimentos(estado, ativo).reduce((s, m) => s + m.valor * fatorDoTitulo(ativo.rendaFixa, { de: m.data, ate: hoje, ...series }), 0);
  return centavos(Math.max(0, total));
}

export const aplicadoDoTitulo = (estado, ativo) => centavos(Math.max(0, movimentos(estado, ativo).reduce((s, m) => s + m.valor, 0)));

// Imposto de renda regressivo pelo tempo de cada aplicação. LCI e LCA são isentas.
const aliquota = (dias) => (dias <= 180 ? 0.225 : dias <= 360 ? 0.2 : dias <= 720 ? 0.175 : 0.15);
const ISENTOS = new Set(['lci', 'lca']);

// O que sobraria resgatando hoje: o bruto menos o IR sobre o ganho de cada aplicação (com resgates, o imposto encolhe na
// mesma proporção do que ficou). Estimativa.
export function liquidoEstimado(estado, ativo, series, hoje) {
  const bruto = valorBruto(estado, ativo, series, hoje);
  if (ISENTOS.has(ativo.rendaFixa.tipo)) return bruto;
  const positivas = movimentos(estado, ativo).filter((m) => m.valor > 0);
  let semResgates = 0;
  let imposto = 0;
  for (const m of positivas) {
    const atual = m.valor * fatorDoTitulo(ativo.rendaFixa, { de: m.data, ate: hoje, ...series });
    semResgates += atual;
    imposto += Math.max(0, atual - m.valor) * aliquota((Date.parse(hoje) - Date.parse(m.data)) / UM_DIA);
  }
  const proporcao = semResgates > 0 ? Math.min(1, bruto / semResgates) : 0;
  return centavos(bruto - imposto * proporcao);
}

// ---------- mutações (devolvem um estado novo) ----------

export function novoTituloCalculado(estado, { nome, grupo, rendaFixa, valor, data, series = {}, hoje, novoId = idPadrao }) {
  const id = novoId();
  const limpo = nome.trim();
  const ativo = { id, nome: limpo, ticker: limpo, ...papelDoGrupo(grupo), rendaFixa, aplicacoes: [{ id: novoId(), data, valor: centavos(valor) }] };
  const comAtivo = { ...estado, ativos: [...estado.ativos, ativo] };
  return { estado: comSaldoSeMudou(comAtivo, { ativoId: id, valor: valorBruto(comAtivo, ativo, series, hoje), cotas: null }, hoje), id };
}

// `valor` negativo é resgate. O saldo do dia acompanha em aplicarRendaFixa.
export function registrarAplicacao(estado, ativoId, { valor, data, novoId = idPadrao }) {
  return {
    ...estado,
    ativos: estado.ativos.map((a) => (a.id === ativoId ? { ...a, aplicacoes: [...a.aplicacoes, { id: novoId(), data, valor: centavos(valor) }] } : a)),
  };
}

// O saldo do dia de cada título calculado, só se o valor mudou.
export function aplicarRendaFixa(estado, series, hoje) {
  let atual = estado;
  for (const ativo of estado.ativos.filter(tituloCalculado)) {
    atual = comSaldoSeMudou(atual, { ativoId: ativo.id, valor: valorBruto(atual, ativo, series, hoje), cotas: null }, hoje);
  }
  return atual;
}
