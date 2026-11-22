// Cotação automática (desenho 2026-11-22-cotacoes-automaticas): um papel (ação, FII, ETF) cadastrado só com o número de
// cotas. O valor em reais vem da cotação do dia, que vira um saldo do dia (`cotas × preço`) como qualquer outro: o motor,
// os gráficos e o Dia de pagamento continuam lendo saldos. O custo (para o ganho) vem das compras. A cotação em si fica só
// no aparelho; aqui entram funções puras sobre o estado.
import { saldosParaGravar } from './lista-mes.js';

const centavos = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const idPadrao = () => globalThis.crypto.randomUUID();

export const papelAutomatico = (ativo) => Array.isArray(ativo?.compras);

// FII e fundos de índice vêm do tipo da API; o que não se sabe é ação.
export const grupoDoTipo = ({ type, subType } = {}) => (type === 'fund' && subType === 'fii' ? 'fiis' : 'acoes');

const aportesDo = (estado, id) => estado.meses.flatMap((m) => (m.aplicado ?? [])
  .filter((a) => a.ativoId === id).map((a) => ({ data: m.data ?? `${m.mes}-31`, valor: a.valor, cotas: a.cotas ?? 0 })));

// As cotas de hoje: as compras e vendas anotadas aqui e as dos aportes do Dia de pagamento.
export const cotasDoPapel = (estado, ativo) => (ativo.compras ?? []).reduce((s, c) => s + c.cotas, 0)
  + aportesDo(estado, ativo.id).reduce((s, a) => s + a.cotas, 0);

// O custo do que ainda se tem, na ordem em que aconteceu: compra soma cotas × preço pago; venda tira a parte proporcional
// do custo. Compra sem preço pago deixa o custo desconhecido (null): o app não inventa ganho.
export function custoDoPapel(estado, ativo) {
  const eventos = [
    ...(ativo.compras ?? []).map((c) => ({ data: c.data, cotas: c.cotas, valor: c.cotas > 0 && c.preco != null ? c.cotas * c.preco : null, semPreco: c.cotas > 0 && c.preco == null })),
    ...aportesDo(estado, ativo.id).map((a) => ({ data: a.data, cotas: a.cotas, valor: a.valor, semPreco: false })),
  ].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  let cotas = 0;
  let custo = 0;
  for (const e of eventos) {
    if (e.semPreco) return null;
    if (e.cotas < 0 && !e.valor) {
      custo -= cotas > 0 ? custo * Math.min(1, -e.cotas / cotas) : 0;
    } else {
      custo += e.valor ?? 0;
    }
    cotas += e.cotas;
  }
  return cotas <= 0 ? 0 : centavos(custo);
}

// O saldo do dia de um papel com o preço dado (o aporte do próprio dia não conta duas vezes: saldosParaGravar).
function saldoDoDia(estado, ativo, preco, hoje) {
  const cotas = cotasDoPapel(estado, ativo);
  const saldo = { ativoId: ativo.id, valor: centavos(Math.max(0, cotas) * preco), cotas: cotas > 0 ? cotas : null };
  return saldosParaGravar({ estado, mes: hoje.slice(0, 7), hoje, saldos: [saldo] })[0];
}

const comSaldoDoDia = (estado, saldo, hoje) => ({
  ...estado,
  saldos: [...estado.saldos.filter((s) => !(s.ativoId === saldo.ativoId && s.data === hoje)), { ...saldo, data: hoje }],
});

export function novoPapel(estado, { ticker, nome, grupo, cotas, preco = null, cotacao = null, hoje, novoId = idPadrao }) {
  const id = novoId();
  const codigo = ticker.trim().toUpperCase();
  const ativo = {
    id, nome: codigo, ticker: codigo, descricao: nome?.trim() || codigo, papel: 'carteira', classe: grupo, tipoForaDoPlano: null,
    compras: [{ id: novoId(), data: hoje, cotas, preco: preco ?? null }],
  };
  const comAtivo = { ...estado, ativos: [...estado.ativos, ativo] };
  return { estado: cotacao > 0 ? comSaldoDoDia(comAtivo, saldoDoDia(comAtivo, ativo, cotacao, hoje), hoje) : comAtivo, id };
}

// `cotas` negativo é venda. `cotacao`: o preço de hoje, se conhecido, para o saldo do dia já sair certo.
export function registrarCompra(estado, ativoId, { cotas, preco = null, cotacao = null, hoje, novoId = idPadrao }) {
  const ativos = estado.ativos.map((a) => (a.id === ativoId ? { ...a, compras: [...a.compras, { id: novoId(), data: hoje, cotas, preco: preco ?? null }] } : a));
  const novo = { ...estado, ativos };
  const ativo = ativos.find((a) => a.id === ativoId);
  return cotacao > 0 ? comSaldoDoDia(novo, saldoDoDia(novo, ativo, cotacao, hoje), hoje) : novo;
}

// `cotacoes`: { CÓDIGO: { preco, em } }. Grava o saldo do dia de cada papel automático que tem cotação, só se o valor mudou.
export function aplicarCotacoes(estado, cotacoes, hoje) {
  let atual = estado;
  for (const ativo of estado.ativos.filter(papelAutomatico)) {
    const preco = cotacoes?.[ativo.ticker]?.preco;
    if (!(preco > 0)) continue;
    const saldo = saldoDoDia(atual, ativo, preco, hoje);
    const ultimo = atual.saldos.filter((s) => s.ativoId === ativo.id).sort((a, b) => (a.data < b.data ? -1 : 1)).at(-1);
    if (ultimo && ultimo.valor === saldo.valor && (ultimo.cotas ?? null) === saldo.cotas) continue;
    atual = comSaldoDoDia(atual, saldo, hoje);
  }
  return atual;
}
