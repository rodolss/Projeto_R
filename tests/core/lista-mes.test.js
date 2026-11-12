import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rascunhoVazio, rascunhoDoRegistro, validarRascunho, situacao, ultimoRegistroAntes, saldoDigitadoNoMes,
  totalAplicado, saldosParaGravar, dataCurta, nomeDoMes, cartaoDoPagamento, escolherSaldos,
} from '../../js/core/lista-mes.js';

const comFeito = (mudancas) => ({ ...rascunhoVazio('2026-11'), ...mudancas });

test('situacao: nada feito ainda', () => {
  assert.deepEqual(situacao({ registrado: false, rascunho: null }), {
    modo: 'novo', feitas: { salario: false, proventos: false, saldos: false, investir: false }, quantas: 0, podeInvestir: false,
  });
});

test('situacao: salário, proventos e saldos pulados liberam o investir', () => {
  const s = situacao({ registrado: false, rascunho: comFeito({ recebido: 9200, proventos: 300, saldosModo: 'pulados', feito: { salario: true, proventos: true } }) });
  assert.equal(s.modo, 'novo');
  assert.equal(s.quantas, 3);
  assert.equal(s.podeInvestir, true);
});

test('situacao: proventos zerados contam como feitos', () => {
  const s = situacao({ registrado: false, rascunho: comFeito({ proventos: 0, feito: { salario: false, proventos: true } }) });
  assert.equal(s.feitas.proventos, true);
  assert.equal(s.quantas, 1);
});

test('situacao: mês registrado sem edição tem as 4 feitas', () => {
  const s = situacao({ registrado: true, rascunho: null });
  assert.equal(s.modo, 'registrado');
  assert.equal(s.quantas, 4);
  assert.deepEqual(s.feitas, { salario: true, proventos: true, saldos: true, investir: true });
});

test('situacao: em edição os saldos contam como feitos e o investir precisa ser confirmado de novo', () => {
  const s = situacao({ registrado: true, rascunho: { ...comFeito({ recebido: 9200, proventos: 0, feito: { salario: true, proventos: true } }), editando: true } });
  assert.equal(s.modo, 'editando');
  assert.equal(s.feitas.saldos, true);
  assert.equal(s.feitas.investir, false);
  assert.equal(s.podeInvestir, true);
  assert.equal(s.quantas, 3);
});

test('validarRascunho descarta outro mês e lixo', () => {
  assert.equal(validarRascunho(rascunhoVazio('2026-10'), '2026-11'), null);
  for (const lixo of [null, 'x', {}, { mes: '2026-11' }]) assert.equal(validarRascunho(lixo, '2026-11'), null);
  const bom = comFeito({ recebido: 9200, feito: { salario: true, proventos: false } });
  assert.deepEqual(validarRascunho(bom, '2026-11'), bom);
});

test('rascunhoDoRegistro parte do mês registrado, em edição', () => {
  const entrada = { mes: '2026-11', data: '2026-11-12', recebido: 9200, tipoExtra: null, proventos: 412.3, aplicado: [] };
  assert.deepEqual(rascunhoDoRegistro(entrada), {
    mes: '2026-11', editando: true, recebido: 9200, tipoExtra: null, proventos: 412.3,
    saldos: null, saldosModo: null, feito: { salario: true, proventos: true },
  });
});

test('ultimoRegistroAntes ignora o próprio mês', () => {
  const meses = [{ mes: '2026-09', data: '2026-09-08' }, { mes: '2026-10', data: '2026-10-07' }, { mes: '2026-11', data: '2026-11-12' }];
  assert.equal(ultimoRegistroAntes(meses, '2026-11'), '2026-10-07');
  assert.equal(ultimoRegistroAntes([], '2026-11'), null);
});

test('saldoDigitadoNoMes só olha a carteira', () => {
  const estado = {
    ativos: [{ id: 'r', papel: 'reserva' }, { id: 'c', papel: 'carteira' }],
    saldos: [{ ativoId: 'c', data: '2026-10-07', valor: 1 }, { ativoId: 'r', data: '2026-11-03', valor: 1 }],
  };
  assert.equal(saldoDigitadoNoMes(estado, '2026-11'), null);
  estado.saldos.push({ ativoId: 'c', data: '2026-11-12', valor: 2 });
  assert.equal(saldoDigitadoNoMes(estado, '2026-11'), '2026-11-12');
});

test('totalAplicado desconta o que saiu da caixa', () => {
  assert.equal(totalAplicado({ aplicado: [{ valor: 1000 }, { valor: 500.5 }, { valor: -200 }] }), 1300.5);
  assert.equal(totalAplicado(undefined), 0);
});

test('saldosParaGravar no dia do registro tira o aporte do mês (e as cotas)', () => {
  const estado = {
    meses: [{ mes: '2026-11', data: '2026-11-12', aplicado: [{ ativoId: 'a', valor: 1000 }, { ativoId: 'cx', valor: -200 }] }],
  };
  const saldos = [{ ativoId: 'a', valor: 5000, cotas: 50 }, { ativoId: 'b', valor: 300, cotas: 3 }, { ativoId: 'cx', valor: 800, cotas: null }];
  assert.deepEqual(saldosParaGravar({ estado, mes: '2026-11', hoje: '2026-11-12', saldos }), [
    { ativoId: 'a', valor: 4000, cotas: null }, { ativoId: 'b', valor: 300, cotas: 3 }, { ativoId: 'cx', valor: 1000, cotas: null },
  ]);
  assert.deepEqual(saldosParaGravar({ estado, mes: '2026-11', hoje: '2026-11-20', saldos }), saldos);
});

test('dataCurta', () => {
  assert.equal(dataCurta('2026-11-12'), '12/nov');
  assert.equal(dataCurta('2026-01-05'), '5/jan');
});

test('nomeDoMes', () => {
  assert.equal(nomeDoMes('2026-11'), 'novembro');
  assert.equal(nomeDoMes('2027-03'), 'março');
});

test('cartaoDoPagamento: registrado, pela metade ou para abrir', () => {
  const entrada = { mes: '2026-11', data: '2026-11-12', aplicado: [{ valor: 4000 }, { valor: 596.01 }] };
  assert.deepEqual(cartaoDoPagamento({ entrada, rascunho: null }), { tipo: 'registrado', total: 4596.01, data: '2026-11-12' });
  assert.deepEqual(cartaoDoPagamento({ entrada, rascunho: { ...rascunhoVazio('2026-11'), editando: true } }).tipo, 'registrado');
  assert.deepEqual(cartaoDoPagamento({ entrada: undefined, rascunho: comFeito({ recebido: 9200, feito: { salario: true, proventos: false } }) }), { tipo: 'continuar', quantas: 1 });
  assert.deepEqual(cartaoDoPagamento({ entrada: undefined, rascunho: null }), { tipo: 'abrir' });
  assert.deepEqual(cartaoDoPagamento({ entrada: undefined, rascunho: rascunhoVazio('2026-11') }), { tipo: 'abrir' });
});

test('revisão: salário apagado depois de salvo desmarca a tarefa 1', () => {
  const s = situacao({ registrado: false, rascunho: comFeito({ recebido: null, proventos: 0, saldosModo: 'pulados', feito: { salario: true, proventos: true } }) });
  assert.equal(s.feitas.salario, false);
  assert.equal(s.podeInvestir, false);
});

test('revisão: "Pular" depois de "Usar estes saldos" pula, sem apagar os valores', () => {
  const copiado = escolherSaldos(comFeito({ saldos: { a: { valor: 10, cotas: null } } }), 'usar');
  assert.equal(copiado.saldosModo, 'copiados');
  const pulado = escolherSaldos(copiado, 'pular');
  assert.equal(pulado.saldosModo, 'pulados');
  assert.deepEqual(pulado.saldos, { a: { valor: 10, cotas: null } });
});
