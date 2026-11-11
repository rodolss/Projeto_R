import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import { criarEstadoInicial, migrar } from '../../js/core/esquema.js';
import { calcularMes, registrarAplicacao, registrarSaldos, calcularPainel, saldosAtuais } from '../../js/core/motor.js';
import { classificarStatus } from '../../js/core/projecao.js';

function estadoBase() {
  const e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  e.orcamento = [
    { id: 'o1', nome: 'Gastos', tipo: 'mensal', valor: 5000, mes: '2026-11' },
    { id: 'o2', nome: 'IPVA', tipo: 'anual', valor: 6000, mes: '2026-11' },
  ];
  const ativo = (id, papel, classe, ticker) => ({ id, nome: ticker, ticker, papel, classe, tipoForaDoPlano: null });
  e.ativos = [
    ativo('res', 'reserva', null, 'Tesouro Selic'),
    ativo('cx', 'caixa', null, 'Tesouro Selic'),
    ativo('rf', 'carteira', 'rendaFixa', 'Tesouro IPCA+ com Juros Semestrais'),
    ativo('fii', 'carteira', 'fiis', 'XFIX11'),
    ativo('aco', 'carteira', 'acoes', 'DIVO11'),
    ativo('ext', 'carteira', 'exterior', 'IVVB11'),
  ];
  const saldo = (ativoId, valor) => ({ ativoId, data: '2026-11-10', valor, cotas: null });
  e.saldos = [saldo('res', 33000), saldo('cx', 0), saldo('rf', 4000), saldo('fii', 2500), saldo('aco', 2500), saldo('ext', 500)];
  e.plano = { p0: 9500, mesP0: '2026-11' };
  return e;
}

test('mês normal divide o excedente pelos déficits', () => {
  const r = calcularMes({ estado: estadoBase(), recebido: 7800, hoje: '2026-11-10' });
  assert.equal(r.excedente, 2800);
  assert.equal(r.paraDiaADia, 5000);
  assert.equal(r.perguntarExtra, false);
  assert.deepEqual(Object.fromEntries(r.sugestoes.map((s) => [s.classe, s.valor])), { rendaFixa: 920, fiis: 575, acoes: 575, exterior: 730 });
});
test('saldo do mês anterior é estimado, sem aviso', () => {
  const r = calcularMes({ estado: estadoBase(), recebido: 7800, hoje: '2026-12-05' });
  assert.equal(r.estimado, true);
  assert.ok(!r.avisos.includes('saldos-desatualizados'));
});
test('saldos com mais de 35 dias geram aviso', () => {
  assert.ok(calcularMes({ estado: estadoBase(), recebido: 7800, hoje: '2026-12-20' }).avisos.includes('saldos-desatualizados'));
});
test('pergunta o extra quando o valor passa de 110% do salário', () => {
  assert.equal(calcularMes({ estado: estadoBase(), recebido: 9000, hoje: '2026-11-10' }).perguntarExtra, true);
});
test('um lançamento por mês', () => {
  let e = estadoBase();
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r, aplicado: [] });
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-12', recebido: 7900, resposta: r, aplicado: [] });
  assert.equal(e.meses.filter((m) => m.mes === '2026-11').length, 1);
  assert.equal(e.meses[0].recebido, 7900);
});
test('aplicar em classe sem ativo cria o ativo; transferência da caixa fica negativa', () => {
  let e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  e = registrarAplicacao(e, {
    mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r, aplicado: [{ destino: 'fiis', valor: 500 }], transferidoDaCaixa: 200,
  });
  assert.equal(e.ativos.find((a) => a.classe === 'fiis').ticker, 'XFIX11');
  assert.ok(e.meses[0].aplicado.some((x) => x.valor === -200));
});
test('férias passam o pendente para o mês seguinte', () => {
  let e = estadoBase();
  const r = calcularMes({ estado: e, recebido: 18200, tipoExtra: 'ferias', hoje: '2026-11-10' });
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 18200, tipoExtra: 'ferias', resposta: r, aplicado: [] });
  assert.equal(calcularMes({ estado: e, recebido: 0, hoje: '2026-12-10' }).excedente, 2800);
});
test('painel sem histórico usa o excedente esperado', () => {
  const p = calcularPainel({ estado: estadoBase(), hoje: '2026-11-10' });
  assert.equal(p.ritmo.fonte, 'esperado');
  assert.equal(p.ritmo.valor, 2800);
  assert.equal(p.metas.independencia, 1650000);
  assert.equal(p.mesAlvo, '2036-11');
  perto(p.planejadoHoje, 9500);
  assert.equal(p.status, classificarStatus({ mesProjetado: p.projecaoM1.mes, mesAlvo: '2036-11' }));
});
test('metas acompanham a inflação', () => {
  const e = estadoBase();
  e.ipca.serie = { '2026-12': 0.01 };
  perto(calcularPainel({ estado: e, hoje: '2027-01-10' }).metas.rendaPlena, 2363400);
});
test('IPCA ausente gera aviso, sem quebrar', () => {
  assert.ok(calcularMes({ estado: estadoBase(), recebido: 7800, hoje: '2026-11-10' }).avisos.includes('ipca-indisponivel'));
});
test('começar do zero não quebra', () => {
  const e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  e.orcamento = [{ id: 'o1', nome: 'Gastos', tipo: 'mensal', valor: 5000, mes: '2026-11' }];
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  assert.equal(r.paraReserva, 2800);
  const p = calcularPainel({ estado: e, hoje: '2026-11-10' });
  assert.ok(Number.isFinite(p.patrimonio));
  assert.equal(p.rendimentoReal, null);
  assert.ok(!JSON.stringify(p).includes('NaN'));
});
test('migrar rejeita versão futura', () => assert.throws(() => migrar({ schemaVersion: 99 }), /versao-desconhecida/));
const respostaVazia = { paraAnuais: 0, guardarParaProximoMes: 0, provisao: 0, excedente: 0, sugestoes: [] };
const todos = (rf, fii, aco, ext) => [
  { ativoId: 'rf', valor: rf }, { ativoId: 'fii', valor: fii }, { ativoId: 'aco', valor: aco }, { ativoId: 'ext', valor: ext },
];

test('reabrir o mês não muda a sugestão (revisão C1)', () => {
  let e = estadoBase();
  const r1 = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r1, aplicado: r1.sugestoes.map((s) => ({ destino: s.classe, valor: s.valor })) });
  const r2 = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-15' });
  assert.deepEqual(r2.sugestoes.map((s) => s.valor), r1.sugestoes.map((s) => s.valor));
});
test('reconfirmar mantém a data original e não soma de novo sobre saldos posteriores (revisão C1)', () => {
  let e = estadoBase();
  const r1 = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r1, aplicado: r1.sugestoes.map((s) => ({ destino: s.classe, valor: s.valor })) });
  const r2 = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-20' });
  e = registrarAplicacao(e, {
    mes: '2026-11', data: '2026-11-20', recebido: 7800, resposta: r2,
    aplicado: e.meses[0].aplicado.map((a) => ({ ativoId: a.ativoId, valor: a.valor })),
    saldosAtualizados: todos(4920, 3075, 3075, 1230),
  });
  assert.equal(e.meses[0].data, '2026-11-10');
  perto(saldosAtuais(e, '2026-11-20').rf.valor, 4920);
});
test('salvar só os saldos não reescreve o lançamento (revisão C1)', () => {
  const e = registrarSaldos(estadoBase(), { data: '2026-11-20', saldos: [{ ativoId: 'rf', valor: 4100 }] });
  assert.equal(e.meses.length, 0);
  assert.equal(saldosAtuais(e, '2026-11-20').rf.valor, 4100);
});
test('queda digitada no próprio mês já usa a caixa (revisão I1)', () => {
  const e = estadoBase();
  e.saldos.find((s) => s.ativoId === 'cx').valor = 9000;
  const r = calcularMes({ estado: e, recebido: 7800, saldosAtualizados: todos(3200, 2000, 2000, 400), hoje: '2026-11-25' });
  assert.equal(r.paraCaixa, 0);
  perto(r.daCaixaParaCarteira, 3000);
});
test('proventos reinvestidos não contam como dinheiro novo no rendimento (revisão I2)', () => {
  let e = estadoBase();
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, proventos: 50, resposta: respostaVazia, aplicado: [{ destino: 'fiis', valor: 50 }] });
  e = registrarSaldos(e, { data: '2026-12-10', saldos: todos(4000, 2550, 2500, 500) });
  assert.ok(calcularPainel({ estado: e, hoje: '2026-12-10' }).rendimentoReal > 0.05);
});
test('índice ignora datas em que só parte da carteira foi atualizada (revisão I5)', () => {
  const e = registrarSaldos(estadoBase(), { data: '2026-12-10', saldos: [{ ativoId: 'rf', valor: 3000 }] });
  assert.equal(calcularPainel({ estado: e, hoje: '2026-12-10' }).rendimentoReal, null);
});
test('preço e destino seguem o ticker sugerido (revisão I6)', () => {
  let e = estadoBase();
  e.ativos.unshift({ id: 'hg', nome: 'HGLG11', ticker: 'HGLG11', papel: 'carteira', classe: 'fiis', tipoForaDoPlano: null });
  e.saldos.push({ ativoId: 'hg', data: '2026-11-10', valor: 1660, cotas: 10 });
  e.saldos.find((s) => s.ativoId === 'fii').cotas = 25;
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  const fii = r.sugestoes.find((s) => s.classe === 'fiis');
  if (fii) assert.equal(fii.cotasAprox, Math.floor(fii.valor / 100));
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r, aplicado: [{ destino: 'fiis', valor: 300 }] });
  assert.equal(e.meses[0].aplicado[0].ativoId, 'fii');
});
test('provisão mensal entra no contador das despesas anuais (revisão I7)', () => {
  let e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  e.orcamento = [{ id: 'o1', nome: 'Gastos', tipo: 'mensal', valor: 5000, mes: '2026-11' }, { id: 'o2', nome: 'Anuais', tipo: 'anual', valor: 15000, mes: '2026-11' }];
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  perto(r.provisao, 383.33);
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r, aplicado: [] });
  perto(e.contadoresAnuais['2026'], 383.33);
});
test('gráfico da projeção respeita a reserva em formação (revisão I8)', () => {
  const e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  e.orcamento = [{ id: 'o1', nome: 'Gastos', tipo: 'mensal', valor: 5000, mes: '2026-11' }];
  const p = calcularPainel({ estado: e, hoje: '2026-11-10' });
  assert.equal(p.grafico.projecao[1].valor, 0);
});
test('saldosAtuais expõe o saldo estimado de cada ativo', () => {
  const s = saldosAtuais(estadoBase(), '2026-11-10');
  assert.equal(s.rf.valor, 4000);
  assert.equal(s.rf.estimado, false);
  assert.equal(saldosAtuais(estadoBase(), '2026-12-10').rf.estimado, true);
});
test('o plano mira a renda plena: perto da Independência, nada vai para a caixa', () => {
  const e = estadoBase();
  e.saldos = e.saldos.map((s) => (s.ativoId === 'rf' ? { ...s, valor: 1000000 } : s));
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  assert.equal(r.paraCaixa, 0);
  assert.equal(r.sugestoes.reduce((s, x) => s + x.valor, 0), 2800);
});
test('painel: faltam, setinha, marcos e base do simulador', () => {
  const p = calcularPainel({ estado: estadoBase(), hoje: '2026-11-10' });
  assert.equal(p.faltam, p.projecaoM2.meses);
  assert.equal(p.setinha, null);
  assert.equal(p.marcos.reserva.atingido, true);
  assert.deepEqual(p.marcos.aComemorar, ['reserva']);
  assert.deepEqual(p.baseSimulador, { patrimonio: 9500, reserva: 33000, salario: 7800, custoTotal: 5500, ritmo: 2800, consegue: 2800, premissa: 0.05, swr: 0.04, mesAtual: '2026-11', mesAlvo: '2036-11' });
});
test('registrar o mês guarda a previsão; no mês seguinte a setinha compara com ele', () => {
  let e = estadoBase();
  const r = calcularMes({ estado: e, recebido: 7800, hoje: '2026-11-10' });
  e = registrarAplicacao(e, { mes: '2026-11', data: '2026-11-10', recebido: 7800, resposta: r, aplicado: r.sugestoes.map((s) => ({ destino: s.classe, valor: s.valor })) });
  const m = e.meses.find((x) => x.mes === '2026-11');
  assert.equal(m.previsao.mesRendaPlena, calcularPainel({ estado: e, hoje: '2026-11-10' }).projecaoM2.mes);
  const p = calcularPainel({ estado: e, hoje: '2026-12-10' });
  assert.equal(p.setinha.mesComparado, '2026-11');
  assert.equal(p.setinha.imediato, true);
});
test('marco comemorado não volta para a fila', () => {
  const e = estadoBase();
  e.marcos = { reserva: '2026-11-10' };
  assert.deepEqual(calcularPainel({ estado: e, hoje: '2026-11-10' }).marcos.aComemorar, []);
});
test('independência pela estimativa fica em "quase lá" sem saldos recentes', () => {
  const e = estadoBase();
  e.saldos = e.saldos.map((s) => (s.ativoId === 'rf' ? { ...s, valor: 2000000 } : s));
  assert.equal(calcularPainel({ estado: e, hoje: '2026-11-10' }).marcos.independencia.atingido, true);
  const depois = calcularPainel({ estado: e, hoje: '2027-01-20' }).marcos.independencia;
  assert.deepEqual(depois, { atingido: false, quaseLa: true });
});
test('começar do zero: nada a comemorar, reserva com quanto falta, sem NaN (Review Focus 1)', () => {
  const e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  e.orcamento = [{ id: 'o1', nome: 'Gastos', tipo: 'mensal', valor: 5000, mes: '2026-11' }];
  const p = calcularPainel({ estado: e, hoje: '2026-11-10' });
  assert.equal(p.marcos.reserva.atingido, false);
  assert.equal(p.marcos.reserva.falta, 30000);
  assert.deepEqual(p.marcos.aComemorar, []);
  assert.ok(p.faltam === null || Number.isInteger(p.faltam));
  assert.ok(!JSON.stringify(p).includes('NaN'));
});
test('renda plena atingida: faltam 0 e marco atingido (Review Focus 5)', () => {
  const e = estadoBase();
  e.saldos = e.saldos.map((s) => (s.ativoId === 'rf' ? { ...s, valor: 2400000 } : s));
  const p = calcularPainel({ estado: e, hoje: '2026-11-10' });
  assert.equal(p.faltam, 0);
  assert.equal(p.marcos.rendaPlena.atingido, true);
});
