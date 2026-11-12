import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarHistoricoFalso, serieIpcaInventada, ORCAMENTO_INICIAL } from '../../scripts/historico-falso.mjs';
import { migrar } from '../../js/core/esquema.js';
import { calcularMes, calcularPainel } from '../../js/core/motor.js';
import { montarLembretes } from '../../js/core/lembretes.js';
import { somarMeses } from '../../js/core/meses.js';

// 0,4% ao mês: inflação suficiente para pegar IPCA "do futuro" vazando para os meses antigos.
const estado = gerarHistoricoFalso({ serieIpca: serieIpcaInventada('2023-10', '2026-10'), agoraISO: '2026-11-12T12:00:00.000Z' });
const meses = estado.meses.map((m) => m.mes);
const doMes = (mes) => estado.meses.find((m) => m.mes === mes);

test('36 meses, de 2023-11 a 2026-10, sem 2026-11', () => {
  const esperados = Array.from({ length: 36 }, (_, k) => somarMeses('2023-11', k));
  assert.deepEqual(meses, esperados);
  assert.equal(estado.config.mesInicio, '2023-11');
  assert.deepEqual(estado.plano, { p0: 0, mesP0: '2023-11' });
});

test('é um backup válido', () => {
  assert.equal(estado.schemaVersion, 2);
  assert.doesNotThrow(() => migrar(estado));
  assert.deepEqual(JSON.parse(JSON.stringify(estado)), estado);
  assert.equal(estado.ipca.atualizadoEm, '2026-11-12T12:00:00.000Z');
});

test('vida real: 13º, férias, PLR, proventos e aumentos', () => {
  for (const dez of ['2023-12', '2024-12', '2025-12']) assert.equal(doMes(dez)?.tipoExtra, 'decimo-terceiro', dez);
  const ferias = estado.meses.filter((m) => m.tipoExtra === 'ferias');
  assert.ok(ferias.length >= 1);
  for (const f of ferias) assert.equal(doMes(somarMeses(f.mes, 1))?.recebido, 0, `mês depois de ${f.mes}`);
  assert.ok(estado.meses.some((m) => m.tipoExtra === 'plr'));
  assert.ok(estado.meses.some((m) => m.proventos > 0));
  assert.equal(estado.config.salario, 9200);
  assert.equal(estado.config.mesSalario, '2026-03');
});

test('as quedas da bolsa aparecem na explicação de algum mês', () => {
  const porque = estado.meses.map((m) => m.sugestao.porque ?? '').join(' ');
  assert.match(porque, /A bolsa brasileira caiu este mês/);
  assert.match(porque, /A parte no exterior caiu este mês/);
});

test('reserva alcançada e ainda sem comemorar', () => {
  const p = calcularPainel({ estado, hoje: '2026-11-12' });
  assert.ok(p.marcos.reserva.atingido);
  assert.ok(p.marcos.aComemorar.includes('reserva'));
  assert.equal(p.marcos.independencia.atingido, false);
  assert.deepEqual(estado.marcos, {});
});

test('sem IPCA do futuro: o primeiro aporte é o excedente nominal da época', () => {
  const mensal = ORCAMENTO_INICIAL.filter((c) => c.tipo === 'mensal').reduce((s, c) => s + c.valor, 0);
  const aplicado = doMes('2023-11').aplicado.filter((a) => a.valor > 0).reduce((s, a) => s + a.valor, 0);
  const esperado = 8000 - mensal;
  assert.ok(aplicado >= esperado * 0.9 && aplicado <= esperado * 1.1, `aplicado ${aplicado}, esperado perto de ${esperado}`);
});

test('novembro/2026 pode ser registrado depois de importar', () => {
  const r = calcularMes({ estado, recebido: 9200, hoje: '2026-11-12' });
  assert.ok(r.excedente > 0);
});

test('com novembro em aberto, os lembretes voltam para novembro', () => {
  const lista = montarLembretes({
    config: { ligado: true, tipo: 'fixo', dia: 13, hora: '09:00' }, agora: '2026-11-12T08:00', mesesRegistrados: meses,
  });
  assert.ok(lista[0].quando.startsWith('2026-11-13'), lista[0].quando);
});
