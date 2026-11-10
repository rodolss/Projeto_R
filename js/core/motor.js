// Motor: junta as regras do núcleo para a tela do mês e para o painel.
// Tudo é calculado em "reais de hoje" (corrigido pelo IPCA) e em termos reais.
import { somarMeses, diffMeses, diasEntre } from './meses.js';
import { taxaMensal, pmtNecessario, patrimonioPlanejado, valorFuturo } from './financas.js';
import { paraReaisDeHoje, ultimoMes } from './ipca.js';
import { custoDeVida, calcularMetas, provisaoMensal, rendaDoPatrimonio } from './metas.js';
import {
  calcularExcedente, perguntarExtra, anuaisFaltando, somarAoCiclo, alvoReserva,
} from './protecao.js';
import { decidirAporte, tetoCaixa } from './aporte.js';
import { estimarSaldo, indiceDesempenho, situacaoQueda } from './desempenho.js';
import {
  CLASSES, distribuirAporte, arredondarDistribuicao, sugestaoPorAtivo, explicarPorque,
} from './alocacao.js';
import {
  ritmoDeAportes, projetar, faixaProjecao, classificarStatus, acaoSugerida, proventosMedios,
} from './projecao.js';
import { checkup } from './checkup.js';
import { novoId } from './esquema.js';

const DIAS_SALDOS = 35;
const fimDoMes = (mes) => `${mes}-31`;
const zerosPorClasse = () => Object.fromEntries(CLASSES.map((c) => [c, 0]));

// ---------- leitura do estado ----------

function serieEfetiva(estado) {
  return { ...(estado.ipca?.serie ?? {}), ...(estado.ipcaManual ?? {}) };
}

function ultimoSaldoAte(estado, ativoId, dataLimite) {
  let melhor = null;
  for (const s of estado.saldos) {
    if (s.ativoId === ativoId && s.data <= dataLimite && (!melhor || s.data >= melhor.data)) melhor = s;
  }
  return melhor;
}

// Saldo estimado de cada ativo no mês `mes`, considerando só registros até `dataLimite`.
function saldosEm(estado, { mes, dataLimite, serie, i, atualizados = null, excluirMes = null }) {
  const resultado = {};
  for (const ativo of estado.ativos) {
    const novo = atualizados?.find((s) => s.ativoId === ativo.id);
    if (novo) {
      resultado[ativo.id] = { valor: novo.valor, estimado: false, data: dataLimite };
      continue;
    }
    const ultimo = ultimoSaldoAte(estado, ativo.id, dataLimite);
    const desde = ultimo?.data ?? '0000-00-00';
    const mesSaldo = ultimo ? ultimo.data.slice(0, 7) : null;
    const aportesDepois = [];
    for (const m of estado.meses) {
      if (excluirMes && m.mes === excluirMes) continue; // o próprio mês não entra ao recalcular a sugestão dele
      if ((m.data ?? fimDoMes(m.mes)) < desde || (m.data ?? fimDoMes(m.mes)) > dataLimite) continue;
      for (const a of m.aplicado ?? []) {
        if (a.ativoId === ativo.id) aportesDepois.push({ mes: m.mes, valor: paraReaisDeHoje(a.valor, m.mes, serie) });
      }
    }
    if (!ultimo && !aportesDepois.length) {
      resultado[ativo.id] = { valor: 0, estimado: false, data: null };
      continue;
    }
    const base = ultimo
      ? { valor: paraReaisDeHoje(ultimo.valor, mesSaldo, serie), mes: mesSaldo }
      : { valor: 0, mes: aportesDepois[0].mes };
    const r = estimarSaldo({ ultimoSaldo: base, aportesDepois, mesAtual: mes, i });
    resultado[ativo.id] = { valor: r.valor, estimado: r.estimado, data: ultimo?.data ?? null };
  }
  return resultado;
}

function agrupar(estado, saldos) {
  const porClasse = zerosPorClasse();
  let reserva = 0;
  let caixa = 0;
  let fora = 0;
  let estimado = false;
  for (const ativo of estado.ativos) {
    const s = saldos[ativo.id];
    if (!s) continue;
    if (s.estimado) estimado = true;
    if (ativo.papel === 'carteira' && ativo.classe) porClasse[ativo.classe] += s.valor;
    else if (ativo.papel === 'reserva') reserva += s.valor;
    else if (ativo.papel === 'caixa') caixa += s.valor;
    else if (ativo.papel === 'fora-do-plano') fora += s.valor;
  }
  const carteira = CLASSES.reduce((t, c) => t + porClasse[c], 0);
  return { porClasse, reserva, caixa, fora, carteira, patrimonio: carteira + caixa + fora, estimado };
}

function papelDe(estado, ativoId) {
  return estado.ativos.find((a) => a.id === ativoId)?.papel ?? null;
}

// Pontos para o índice de desempenho: só as datas em que TODA a carteira foi atualizada de verdade
// (atualização parcial misturaria valores de datas diferentes). Os saldos digitados agora entram
// como ponto provisório, para a queda ser percebida no próprio mês.
function pontosDesempenho(estado, { atualizados = null, hoje = null } = {}) {
  const idsCarteira = [...new Set(estado.ativos.filter((a) => a.papel === 'carteira').map((a) => a.id))];
  const saldosCarteira = estado.saldos.filter((s) => idsCarteira.includes(s.ativoId));
  const completo = (data, temNaData) => idsCarteira.every((id) => (
    !saldosCarteira.some((s) => s.ativoId === id && s.data <= data) || temNaData(id)));
  // Dinheiro novo entre duas datas: aplicações na carteira menos os proventos reinvestidos (que são rendimento).
  const aportesEntre = (de, ate) => {
    let total = 0;
    for (const m of estado.meses) {
      const d = m.data ?? fimDoMes(m.mes);
      if (d < de || d >= ate) continue;
      for (const a of m.aplicado ?? []) if (idsCarteira.includes(a.ativoId)) total += a.valor;
      total -= m.proventos ?? 0;
    }
    return total;
  };

  const datas = [...new Set(saldosCarteira.map((s) => s.data))].sort()
    .filter((data) => completo(data, (id) => saldosCarteira.some((s) => s.ativoId === id && s.data === data)));
  const pontos = [];
  let anterior = null;
  for (const data of datas) {
    let valor = 0;
    for (const id of idsCarteira) valor += ultimoSaldoAte(estado, id, data)?.valor ?? 0;
    pontos.push({ mes: data.slice(0, 7), valor, aportesDesdeAnterior: anterior ? aportesEntre(anterior, data) : 0 });
    anterior = data;
  }
  if (atualizados && hoje && anterior && hoje > anterior) {
    const digitado = new Map(atualizados.map((s) => [s.ativoId, s.valor]));
    if (completo(hoje, (id) => digitado.has(id))) {
      const valor = idsCarteira.reduce((s, id) => s + (digitado.get(id) ?? 0), 0);
      pontos.push({ mes: hoje.slice(0, 7), valor, aportesDesdeAnterior: aportesEntre(anterior, hoje) });
    }
  }
  return pontos;
}

function precosPorClasse(estado) {
  const precos = {};
  for (const c of CLASSES) {
    // O preço vem do ativo sugerido (mesmo ticker), não de outro ativo qualquer da classe.
    const ativo = estado.ativos.find((a) => a.papel === 'carteira' && a.classe === c && a.ticker === estado.carteiraAlvo[c].ticker);
    if (!ativo) continue;
    const comCotas = estado.saldos
      .filter((s) => s.ativoId === ativo.id && s.cotas > 0)
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .at(-1);
    if (comCotas) precos[c] = comCotas.valor / comCotas.cotas;
  }
  return precos;
}

function contexto(estado, hoje, atualizados = null, { excluirMes = null } = {}) {
  const mes = hoje.slice(0, 7);
  const serie = serieEfetiva(estado);
  const cfg = estado.config;
  const i = taxaMensal(cfg.rentabilidadeReal);
  const real = (valor, mesValor) => paraReaisDeHoje(valor, mesValor, serie);

  const custo = custoDeVida(estado.orcamento.map((c) => ({ ...c, valor: real(c.valor, c.mes) })));
  const salario = real(cfg.salario, cfg.mesSalario);
  const metas = calcularMetas({ custoTotal: custo.total, salario, swr: cfg.swr });
  const provisao = provisaoMensal({ anual: custo.anual, salario, recebe13: cfg.recebe13, recebeFerias: cfg.recebeFerias });

  const saldos = saldosEm(estado, { mes, dataLimite: hoje, serie, i, atualizados, excluirMes });
  const grupo = agrupar(estado, saldos);

  const datasCarteira = estado.ativos
    .filter((a) => a.papel === 'carteira')
    .map((a) => saldos[a.id]?.data)
    .filter(Boolean)
    .sort();
  const diasDesdeAtualizacao = datasCarteira.length ? diasEntre(datasCarteira.at(-1), hoje) : 0;

  const t = diffMeses(cfg.mesInicio, mes);
  const mesAlvo = somarMeses(cfg.mesInicio, cfg.prazoMeses);
  const p0 = real(estado.plano.p0, estado.plano.mesP0);
  const pmtNec = pmtNecessario({ p: grupo.patrimonio, meta: metas.independencia, i, meses: cfg.prazoMeses - t });

  const queda = situacaoQueda(indiceDesempenho(pontosDesempenho(estado, { atualizados, hoje }), serie));
  let caixaNoInicioDaQueda = grupo.caixa;
  if (queda.emQueda) {
    for (const m of estado.meses) {
      if (m.mes < queda.mesInicio) continue;
      for (const a of m.aplicado ?? []) {
        if (a.valor < 0 && papelDe(estado, a.ativoId) === 'caixa') caixaNoInicioDaQueda += -real(a.valor, m.mes);
      }
    }
  }

  const ultimos = estado.meses.filter((m) => m.mes < mes && m.sugestao).slice(-6);
  const excedenteMedio = ultimos.length
    ? ultimos.reduce((s, m) => s + (m.sugestao.excedente ?? 0), 0) / ultimos.length
    : null;

  const ultimoIpca = ultimoMes(serie);
  const ipcaIndisponivel = !ultimoIpca || diffMeses(ultimoIpca, mes) > 2;

  return {
    mes, serie, cfg, i, real, custo, salario, metas, provisao, saldos, grupo, diasDesdeAtualizacao,
    t, mesAlvo, p0, pmtNec, queda, caixaNoInicioDaQueda, excedenteMedio, ipcaIndisponivel,
  };
}

// Saldo estimado de cada ativo hoje, em reais de hoje: { [ativoId]: { valor, estimado, data } }.
export function saldosAtuais(estado, hoje) {
  return contexto(estado, hoje).saldos;
}

// ---------- tela do mês ----------

export function calcularMes({ estado, recebido, tipoExtra = null, proventos = 0, saldosAtualizados = null, hoje }) {
  const cx = contexto(estado, hoje, saldosAtualizados, { excluirMes: hoje.slice(0, 7) });
  const { mes, custo, salario, grupo } = cx;

  const anterior = estado.meses.find((m) => m.mes === somarMeses(mes, -1));
  const atual = estado.meses.find((m) => m.mes === mes);
  const contadores = somarAoCiclo(estado.contadoresAnuais, mes, -(atual?.paraAnuais ?? 0));
  const exc = calcularExcedente({
    recebido,
    pendenteDoMesAnterior: anterior?.guardarParaProximoMes ?? 0,
    salario,
    custoMensal: custo.mensal,
    provisao: cx.provisao,
    tipoExtra,
    anuaisFaltando: anuaisFaltando({ anual: custo.anual, contadores, mes }),
  });

  const avisos = [];
  if (cx.diasDesdeAtualizacao > DIAS_SALDOS) avisos.push('saldos-desatualizados');
  if (cx.ipcaIndisponivel) avisos.push('ipca-indisponivel');

  const resposta = {
    mes,
    perguntarExtra: perguntarExtra({ recebidoEfetivo: exc.recebidoEfetivo, salario }),
    semAporte: exc.semAporte,
    motivo: exc.motivo,
    recebidoEfetivo: exc.recebidoEfetivo,
    excedente: exc.excedente,
    paraDiaADia: exc.paraDiaADia,
    paraAnuais: exc.paraAnuais,
    provisao: exc.provisao,
    guardarParaProximoMes: exc.guardarParaProximoMes,
    paraReserva: 0,
    paraCaixa: 0,
    daCaixaParaCarteira: 0,
    sugestoes: [],
    porque: '',
    avisos,
    estimado: grupo.estimado,
  };
  if (exc.semAporte && proventos <= 0) return resposta;

  const decisao = decidirAporte({
    excedente: exc.excedente,
    reserva: grupo.reserva,
    alvoReserva: alvoReserva(custo.total),
    emQueda: cx.queda.emQueda,
    caixa: grupo.caixa,
    caixaNoInicioDaQueda: cx.caixaNoInicioDaQueda,
    tetoCaixa: tetoCaixa(cx.excedenteMedio ?? exc.excedente),
    pmtNec: cx.pmtNec,
    proventos,
  });
  const pesos = Object.fromEntries(CLASSES.map((c) => [c, estado.carteiraAlvo[c].peso]));
  const distribuicao = arredondarDistribuicao(distribuirAporte({ valores: grupo.porClasse, pesos, aporte: decisao.aDistribuir }));

  let valoresMesAnterior = null;
  if (saldosAtualizados) {
    valoresMesAnterior = zerosPorClasse();
    for (const a of estado.ativos) {
      if (a.papel !== 'carteira' || !a.classe) continue;
      valoresMesAnterior[a.classe] += ultimoSaldoAte(estado, a.id, hoje)?.valor ?? 0;
    }
  }

  return {
    ...resposta,
    paraReserva: decisao.paraReserva,
    paraCaixa: decisao.paraCaixa,
    daCaixaParaCarteira: decisao.daCaixaParaCarteira,
    sugestoes: sugestaoPorAtivo({ distribuicao, carteiraAlvo: estado.carteiraAlvo, precos: precosPorClasse(estado) }),
    porque: decisao.aDistribuir > 0
      ? explicarPorque({ valores: grupo.porClasse, valoresMesAnterior, pesos, distribuicao, carteiraAlvo: estado.carteiraAlvo })
      : '',
  };
}

function resolverDestino(estado, destino) {
  const NOMES = { reserva: 'Reserva (Tesouro Selic)', caixa: 'Caixa de oportunidade (Tesouro Selic)' };
  const existente = destino === 'reserva' || destino === 'caixa'
    ? estado.ativos.find((a) => a.papel === destino)
    : estado.ativos.find((a) => a.papel === 'carteira' && a.classe === destino && a.ticker === estado.carteiraAlvo[destino].ticker);
  if (existente) return existente.id;
  const novo = destino === 'reserva' || destino === 'caixa'
    ? { id: novoId(), nome: NOMES[destino], ticker: 'Tesouro Selic', papel: destino, classe: null, tipoForaDoPlano: null }
    : {
      id: novoId(), nome: estado.carteiraAlvo[destino].ticker, ticker: estado.carteiraAlvo[destino].ticker,
      papel: 'carteira', classe: destino, tipoForaDoPlano: null,
    };
  estado.ativos.push(novo);
  return novo.id;
}

export function registrarAplicacao(estado, {
  mes, data, recebido, tipoExtra = null, proventos = 0, saldosAtualizados = null, resposta, aplicado = [], transferidoDaCaixa = 0,
}) {
  const novo = structuredClone(estado);
  const itens = aplicado
    .filter((a) => a.valor)
    .map((a) => ({ ativoId: a.ativoId ?? resolverDestino(novo, a.destino), valor: a.valor, cotas: a.cotas ?? null }));
  if (transferidoDaCaixa > 0) itens.push({ ativoId: resolverDestino(novo, 'caixa'), valor: -transferidoDaCaixa, cotas: null });

  for (const s of saldosAtualizados ?? []) {
    novo.saldos.push({ ativoId: s.ativoId, data, valor: s.valor, cotas: s.cotas ?? null });
  }

  // Reconfirmar mantém a data da primeira aplicação: saldos digitados depois já incluem esse dinheiro.
  const existente = novo.meses.find((m) => m.mes === mes);
  const separadoAnuais = (x) => (x?.paraAnuais ?? 0) + (x?.provisao ?? 0);
  novo.contadoresAnuais = somarAoCiclo(somarAoCiclo(novo.contadoresAnuais, mes, -separadoAnuais(existente)), mes, separadoAnuais(resposta));

  const entrada = {
    mes, data: existente?.data ?? data, recebido, tipoExtra, proventos, sugestao: resposta, aplicado: itens,
    guardarParaProximoMes: resposta.guardarParaProximoMes ?? 0, paraAnuais: resposta.paraAnuais ?? 0, provisao: resposta.provisao ?? 0,
  };
  novo.meses = [...novo.meses.filter((m) => m.mes !== mes), entrada].sort((a, b) => (a.mes < b.mes ? -1 : 1));
  return novo;
}

// Atualização só dos saldos, sem mexer em nenhum lançamento.
export function registrarSaldos(estado, { data, saldos }) {
  const novo = structuredClone(estado);
  for (const s of saldos) novo.saldos.push({ ativoId: s.ativoId, data, valor: s.valor, cotas: s.cotas ?? null });
  return novo;
}

// ---------- painel ----------

// Mesma regra de projetar(): o aporte completa primeiro o que falta da reserva.
function trajetoria({ patrimonio, aporte, i, meta, mesAtual, ate, reservaFaltando = 0 }) {
  const pontos = [{ mes: mesAtual, valor: patrimonio }];
  let v = patrimonio;
  let falta = reservaFaltando;
  for (let k = 1; k <= ate; k++) {
    const paraReserva = Math.min(Math.max(aporte, 0), falta);
    falta -= paraReserva;
    v = v * (1 + i) + aporte - paraReserva;
    pontos.push({ mes: somarMeses(mesAtual, k), valor: v });
    if (v >= meta) break;
  }
  return pontos;
}

export function calcularPainel({ estado, hoje }) {
  const cx = contexto(estado, hoje);
  const { mes, cfg, i, real, custo, salario, metas, grupo, mesAlvo, t } = cx;

  const historico = estado.meses.map((m) => {
    let classes = 0;
    let caixa = 0;
    for (const a of m.aplicado ?? []) {
      const papel = papelDe(estado, a.ativoId);
      if (papel === 'carteira') classes += real(a.valor, m.mes);
      else if (papel === 'caixa') caixa += real(a.valor, m.mes);
    }
    const prov = real(m.proventos ?? 0, m.mes);
    return { mes: m.mes, aplicadoCarteira: classes - prov, aplicadoCaixa: caixa, proventos: prov };
  });

  const excedenteEsperado = Math.max(0, salario - custo.mensal - cx.provisao);
  const ritmo = ritmoDeAportes({ historico, mesInicio: cfg.mesInicio, excedenteEsperado });
  const reservaFaltando = Math.max(0, alvoReserva(custo.total) - grupo.reserva);
  const base = { patrimonio: grupo.patrimonio, aporteMensal: ritmo.valor, mesAtual: mes, reservaFaltando };

  const projecaoM1 = projetar({ ...base, i, meta: metas.independencia });
  const projecaoM2 = projetar({ ...base, i, meta: metas.rendaPlena });
  const faixa = faixaProjecao({ ...base, rentabilidade: cfg.rentabilidadeReal, meta: metas.independencia });
  const mesesAteAlvo = Math.max(0, cfg.prazoMeses - t);
  // Aproximação: o que ainda falta da reserva deixa de ir para a carteira.
  const noPrazo = Math.max(0, valorFuturo({ p: grupo.patrimonio, aporte: ritmo.valor, i, meses: mesesAteAlvo }) - reservaFaltando);
  const planejadoHoje = patrimonioPlanejado({ p0: cx.p0, meta: metas.independencia, i, prazo: cfg.prazoMeses, t: Math.min(Math.max(t, 0), cfg.prazoMeses) });

  const indices = indiceDesempenho(pontosDesempenho(estado), cx.serie);
  let rendimentoReal = null;
  if (indices.length >= 2) {
    const meses = diffMeses(indices[0].mes, indices.at(-1).mes);
    if (meses > 0) rendimentoReal = Math.pow(indices.at(-1).indice, 12 / meses) - 1;
  }

  const pesos = Object.fromEntries(CLASSES.map((c) => [c, estado.carteiraAlvo[c].peso]));
  const itensCheckup = checkup({
    valores: grupo.porClasse,
    pesos,
    carteiraAlvo: estado.carteiraAlvo,
    foraDoPlano: estado.ativos.filter((a) => a.papel === 'fora-do-plano').map((a) => ({ nome: a.nome, tipoForaDoPlano: a.tipoForaDoPlano })),
    reserva: grupo.reserva,
    alvoReserva: alvoReserva(custo.total),
    caixa: grupo.caixa,
    tetoCaixa: tetoCaixa(cx.excedenteMedio ?? excedenteEsperado),
    diasDesdeAtualizacao: cx.diasDesdeAtualizacao,
  });

  const plano = [];
  for (let k = 0; k <= cfg.prazoMeses; k++) {
    plano.push({ mes: somarMeses(cfg.mesInicio, k), valor: patrimonioPlanejado({ p0: cx.p0, meta: metas.independencia, i, prazo: cfg.prazoMeses, t: k }) });
  }
  const realSerie = [];
  for (let k = 0; k <= Math.max(0, t); k++) {
    const m = somarMeses(cfg.mesInicio, k);
    const dataLimite = m === mes ? hoje : fimDoMes(m);
    realSerie.push({ mes: m, valor: agrupar(estado, saldosEm(estado, { mes: m, dataLimite, serie: cx.serie, i })).patrimonio });
  }
  const ate = Math.max(0, diffMeses(mes, mesAlvo) + 24);
  const caminho = (taxa) => trajetoria({ patrimonio: grupo.patrimonio, aporte: ritmo.valor, i: taxa, meta: metas.independencia, mesAtual: mes, ate, reservaFaltando });

  return {
    status: classificarStatus({ mesProjetado: projecaoM1.mes, mesAlvo }),
    patrimonio: grupo.patrimonio,
    planejadoHoje,
    diferenca: grupo.patrimonio - planejadoHoje,
    metas,
    custoTotal: custo.total,
    salario,
    mesAlvo,
    projecaoM1,
    faixa,
    projecaoM2,
    rendaNoPrazo: rendaDoPatrimonio(noPrazo, cfg.swr),
    ritmo,
    pmtNec: cx.pmtNec,
    acao: acaoSugerida({ pmtNec: cx.pmtNec, ritmo: ritmo.valor }),
    proventosMedios: proventosMedios({ historico, mesInicio: cfg.mesInicio }),
    rendimentoReal,
    checkup: itensCheckup,
    grafico: {
      plano,
      real: realSerie,
      projecao: caminho(i),
      faixa: { otimista: caminho(taxaMensal(cfg.rentabilidadeReal + 0.02)), pessimista: caminho(taxaMensal(cfg.rentabilidadeReal - 0.02)) },
    },
    estimado: grupo.estimado,
    avisos: cx.ipcaIndisponivel ? ['ipca-indisponivel'] : [],
  };
}
