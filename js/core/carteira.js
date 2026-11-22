// Carteira (desenho 2026-11-22-carteira): o que os apps de investimento mostram — posição de cada ativo, divisão por
// classe contra a meta, evolução do patrimônio contra o aplicado e proventos —, em reais do dia (como na corretora).
// A meta da renda plena continua no motor, em reais de hoje.
import { somarMeses, diffMeses } from './meses.js';
import { CLASSES } from './alocacao.js';

const centavos = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const fimDoMes = (mes) => `${mes}-31`;

// Ordem dos grupos na lista de ativos: as classes da carteira, depois o que fica fora dela.
export const GRUPOS = [...CLASSES, 'reserva', 'caixa', 'fora-do-plano', 'fgts'];
const grupoDe = (ativo) => (ativo.papel === 'carteira' ? ativo.classe ?? 'rendaFixa' : ativo.papel);
// O FGTS é só informativo: aparece na lista, mas não entra no total.
const contaNoTotal = (ativo) => ativo.papel !== 'fgts';

const saldosDo = (estado, id) => estado.saldos.filter((s) => s.ativoId === id).sort((a, b) => (a.data < b.data ? -1 : 1));

// Aportes de um ativo com a data do registro do mês (um aporte do mesmo dia de um saldo conta depois dele, como no motor).
function aportesDo(estado, id) {
  const lista = [];
  for (const m of estado.meses) {
    for (const a of m.aplicado ?? []) if (a.ativoId === id) lista.push({ data: m.data ?? fimDoMes(m.mes), valor: a.valor, cotas: a.cotas ?? null });
  }
  return lista;
}

// Saldo e aplicado de um ativo numa data: saldo = último saldo até a data + aportes de [data dele, data]; aplicado =
// primeiro saldo + aportes de [data dele, data] (o que veio antes já está no primeiro saldo). Sem saldo: os aportes.
function posicaoEm(saldos, aportes, data) {
  const ate = saldos.filter((s) => s.data <= data);
  const primeiro = ate[0] ?? null;
  const ultimo = ate.at(-1) ?? null;
  const somaDesde = (desde) => aportes.filter((a) => (!desde || a.data >= desde) && a.data <= data).reduce((s, a) => s + a.valor, 0);
  return {
    saldo: centavos((ultimo?.valor ?? 0) + somaDesde(ultimo?.data)),
    aplicado: centavos((primeiro?.valor ?? 0) + somaDesde(primeiro?.data)),
    primeiro, ultimo, ate,
  };
}

export function posicoes(estado, hoje) {
  return estado.ativos.map((ativo) => {
    const saldos = saldosDo(estado, ativo.id);
    const aportes = aportesDo(estado, ativo.id);
    const p = posicaoEm(saldos, aportes, hoje);
    // Ganho só a partir de dois saldos digitados: com um, ainda não há com o que comparar.
    const temGanho = p.ate.length >= 2;
    const ganho = temGanho ? centavos(p.saldo - p.aplicado) : null;
    const depois = p.ultimo ? aportes.filter((a) => a.data >= p.ultimo.data && a.data <= hoje) : [];
    const cotas = p.ultimo?.cotas > 0 && depois.every((a) => a.cotas != null || !a.valor)
      ? p.ultimo.cotas + depois.reduce((s, a) => s + (a.cotas ?? 0), 0) : null;
    return {
      ativo,
      grupo: grupoDe(ativo),
      saldo: p.saldo,
      aplicado: p.aplicado,
      ganho,
      ganhoPct: temGanho && p.aplicado > 0 ? ganho / p.aplicado : null,
      dataSaldo: p.ultimo?.data ?? null,
      comAportesDepois: depois.some((a) => a.valor),
      cotas,
      valorCota: p.ultimo?.cotas > 0 ? centavos(p.ultimo.valor / p.ultimo.cotas) : null,
      historico: [
        ...saldos.map((s) => ({ tipo: 'saldo', data: s.data, valor: s.valor, cotas: s.cotas ?? null })),
        ...aportes.filter((a) => a.valor).map((a) => ({ tipo: a.valor > 0 ? 'aporte' : 'resgate', data: a.data, valor: a.valor, cotas: a.cotas })),
      ].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)),
    };
  });
}

export function resumoDaCarteira(estado, hoje) {
  const lista = posicoes(estado, hoje);
  const noTotal = lista.filter((p) => contaNoTotal(p.ativo));
  const total = centavos(noTotal.reduce((s, p) => s + p.saldo, 0));
  const aplicado = centavos(noTotal.reduce((s, p) => s + p.aplicado, 0));
  const naCarteira = lista.filter((p) => p.ativo.papel === 'carteira');
  const carteira = centavos(naCarteira.reduce((s, p) => s + p.saldo, 0));
  const alocacao = CLASSES.map((classe) => {
    const valor = centavos(naCarteira.filter((p) => p.grupo === classe).reduce((s, p) => s + p.saldo, 0));
    const meta = estado.carteiraAlvo?.[classe]?.peso ?? 0;
    const pct = carteira > 0 ? valor / carteira : 0;
    return { classe, valor, pct, meta, abaixo: carteira > 0 && pct < meta - 0.005 };
  });
  const grupos = GRUPOS.map((id) => {
    const ativos = lista.filter((p) => p.grupo === id);
    const valor = centavos(ativos.reduce((s, p) => s + p.saldo, 0));
    return { id, ativos, valor, pct: id === 'fgts' || total <= 0 ? null : valor / total };
  }).filter((g) => g.ativos.length);
  const datas = lista.filter((p) => contaNoTotal(p.ativo) && p.dataSaldo).map((p) => p.dataSaldo).sort();
  return {
    total, aplicado, ganho: centavos(total - aplicado), ganhoPct: aplicado > 0 ? (total - aplicado) / aplicado : null,
    carteira, alocacao, grupos, posicoes: lista, ultimaAtualizacao: datas.at(-1) ?? null,
    temGanho: noTotal.some((p) => p.ganho != null),
  };
}

// Patrimônio e aplicado no fim de cada mês (hoje, no mês atual), do primeiro mês com saldo ou aporte até hoje.
export function evolucao(estado, hoje) {
  const ativos = estado.ativos.filter(contaNoTotal);
  const dados = ativos.map((a) => ({ saldos: saldosDo(estado, a.id), aportes: aportesDo(estado, a.id) }));
  const datas = dados.flatMap((d) => [...d.saldos.map((s) => s.data), ...d.aportes.filter((a) => a.valor).map((a) => a.data)]).sort();
  if (!datas.length) return [];
  const mesAtual = hoje.slice(0, 7);
  const pontos = [];
  for (let mes = datas[0].slice(0, 7); mes <= mesAtual; mes = somarMeses(mes, 1)) {
    const data = mes === mesAtual ? hoje : fimDoMes(mes);
    let patrimonio = 0;
    let aplicado = 0;
    for (const d of dados) {
      const p = posicaoEm(d.saldos, d.aportes, data);
      patrimonio += p.saldo;
      aplicado += p.aplicado;
    }
    pontos.push({ mes, patrimonio: centavos(patrimonio), aplicado: centavos(aplicado) });
  }
  return pontos;
}

// ---------- cadastro (saiu dos Ajustes do plano para Carteira › Ativos) ----------
// `grupo`: uma classe da carteira (rendaFixa, fiis, acoes, exterior) ou reserva, caixa, fora-do-plano, fgts.
const papelDoGrupo = (grupo) => (CLASSES.includes(grupo) ? { papel: 'carteira', classe: grupo, tipoForaDoPlano: null }
  : { papel: grupo, classe: null, tipoForaDoPlano: grupo === 'fora-do-plano' ? 'outro' : null });

export function adicionarAtivo(estado, { nome, grupo, saldo = null, cotas = null, hoje, novoId = () => globalThis.crypto.randomUUID() }) {
  const id = novoId();
  const limpo = nome.trim();
  const ativo = { id, nome: limpo, ticker: limpo, ...papelDoGrupo(grupo) };
  const saldos = saldo != null ? [...estado.saldos, { ativoId: id, data: hoje, valor: centavos(saldo), cotas: cotas > 0 ? cotas : null }] : estado.saldos;
  return { estado: { ...estado, ativos: [...estado.ativos, ativo], saldos }, id };
}

export function editarAtivo(estado, id, { nome, grupo }) {
  return {
    ...estado,
    ativos: estado.ativos.map((a) => (a.id === id ? { ...a, ...(nome?.trim() ? { nome: nome.trim() } : {}), ...(grupo ? papelDoGrupo(grupo) : {}) } : a)),
  };
}

// Os registros dos meses continuam com o aporte (o histórico mostra "Investimento removido").
export const tirarAtivo = (estado, id) => ({ ...estado, ativos: estado.ativos.filter((a) => a.id !== id), saldos: estado.saldos.filter((s) => s.ativoId !== id) });

// Proventos dos últimos 12 meses até o atual (não antes do início do plano): mês a mês, total, média por mês e
// rendimento de 12 meses sobre o total investido.
export function proventosDaCarteira(estado, hoje) {
  const mesAtual = hoje.slice(0, 7);
  const inicio = [somarMeses(mesAtual, -11), estado.config?.mesInicio ?? mesAtual].sort().at(-1);
  const porMes = new Map(estado.meses.map((m) => [m.mes, m.proventos ?? 0]));
  const meses = [];
  for (let mes = inicio; mes <= mesAtual; mes = somarMeses(mes, 1)) meses.push({ mes, valor: porMes.get(mes) ?? 0 });
  const total = centavos(meses.reduce((s, m) => s + m.valor, 0));
  const { total: investido } = resumoDaCarteira(estado, hoje);
  return { meses, total, media: meses.length ? centavos(total / meses.length) : 0, rendimento: investido > 0 ? total / investido : null, quantos: diffMeses(inicio, mesAtual) + 1 };
}
