import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import { criarEstadoInicial, migrar } from '../../js/core/esquema.js';
import { calcularMes, registrarAplicacao, calcularPainel } from '../../js/core/motor.js';
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
