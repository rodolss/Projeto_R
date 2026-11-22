import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contasPessoaisDe, valorDaContaPessoal, faltamParcelas, contasPessoaisDoMes, ultimoMesDasParcelas,
  adicionarContaPessoal, editarContaPessoal, moverContaPessoal, confirmarPrevisao,
} from '../../js/core/contas-pessoais.js';
import { salvarValor } from '../../js/core/casa.js';

// Casa inventada: Ana e Leo. Ana tem Empréstimo (até fev/2027) e Academia; Leo tem Celular; Curso da Ana está parada.
function casaBase() {
  let casa = {
    schemaVersion: 4,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false }],
    meses: [],
    contasPessoais: [
      { id: 'e1', nome: 'Empréstimo', donoId: 'p1', arquivada: false, desde: '2026-12', ultimoMes: '2027-02' },
      { id: 'a1', nome: 'Academia', donoId: 'p1', arquivada: false, desde: '2026-12' },
      { id: 'l1', nome: 'Celular', donoId: 'p2', arquivada: false, desde: '2026-12' },
      { id: 'u1', nome: 'Curso', donoId: 'p1', arquivada: true, desde: '2026-10' },
    ],
  };
  casa = salvarValor(casa, { mes: '2026-12', contaId: 'e1', valor: 300 });
  casa = salvarValor(casa, { mes: '2026-12', contaId: 'a1', valor: 100 });
  casa = salvarValor(casa, { mes: '2026-10', contaId: 'u1', valor: 80 });
  return casa;
}
const conta = (casa, id) => casa.contasPessoais.find((c) => c.id === id);
const ids = (lista) => lista.map((x) => (x.conta ?? x).id);

test('contas pessoais: cada um vê só as próprias, na ordem da lista; as paradas à parte', () => {
  const casa = casaBase();
  assert.deepEqual(ids(contasPessoaisDe(casa, 'p1')), ['e1', 'a1']);
  assert.deepEqual(ids(contasPessoaisDe(casa, 'p2')), ['l1']);
  assert.deepEqual(ids(contasPessoaisDe(casa, 'p1', { arquivadas: true })), ['u1']);
  assert.deepEqual(contasPessoaisDe({ ...casa, contasPessoais: undefined }, 'p1'), []);
});

test('valor digitado é confirmado; no mês seguinte, previsão pelo último valor', () => {
  const casa = casaBase();
  assert.deepEqual(valorDaContaPessoal(casa, '2026-12', conta(casa, 'a1')), { valor: 100, situacao: 'confirmado', deOnde: null });
  assert.deepEqual(valorDaContaPessoal(casa, '2027-01', conta(casa, 'a1')), { valor: 100, situacao: 'a-confirmar', deOnde: '2026-12' });
  assert.deepEqual(valorDaContaPessoal(casa, '2027-01', conta(casa, 'l1')), { valor: 0, situacao: 'vazio', deOnde: null });
});

test('antes do mês em que foi criada, a conta não aparece nem é prevista', () => {
  const casa = casaBase();
  assert.equal(valorDaContaPessoal(casa, '2026-11', conta(casa, 'a1')).situacao, 'vazio');
  const nov = contasPessoaisDoMes(casa, '2026-11', 'p1');
  assert.deepEqual(ids(nov.contas), []);
  assert.deepEqual(ids(nov.semValor), []);
});

test('conta com fim: conta as parcelas que faltam e some depois da última', () => {
  const casa = casaBase();
  const e1 = conta(casa, 'e1');
  assert.equal(faltamParcelas(e1, '2026-12'), 3);
  assert.equal(faltamParcelas(e1, '2027-02'), 1);
  assert.equal(faltamParcelas(conta(casa, 'a1'), '2027-02'), null);
  assert.equal(valorDaContaPessoal(casa, '2027-02', e1).situacao, 'a-confirmar');
  assert.equal(valorDaContaPessoal(casa, '2027-03', e1).situacao, 'vazio');
  const fev = contasPessoaisDoMes(casa, '2027-02', 'p1');
  assert.equal(fev.contas.find((c) => c.conta.id === 'e1').faltam, 1);
  const mar = contasPessoaisDoMes(casa, '2027-03', 'p1');
  assert.ok(!ids(mar.contas).includes('e1'));
  assert.ok(!ids(mar.semValor).includes('e1'));
});

test('conta parada: só o valor confirmado aparece, sem previsão nem linha vazia', () => {
  const casa = casaBase();
  const out = contasPessoaisDoMes(casa, '2026-10', 'p1');
  assert.deepEqual(out.contas.map((c) => [c.conta.id, c.valor, c.situacao]), [['u1', 80, 'confirmado']]);
  const nov = contasPessoaisDoMes(casa, '2026-11', 'p1');
  assert.ok(!ids(nov.contas).includes('u1'));
  assert.ok(!ids(nov.semValor).includes('u1'));
});

test('o mês: total das contas com valor, quantas a confirmar, e as ativas sem valor à parte', () => {
  let casa = casaBase();
  casa = { ...casa, contasPessoais: [...casa.contasPessoais, { id: 'n1', nome: 'Seguro', donoId: 'p1', arquivada: false, desde: '2026-12' }] };
  const dez = contasPessoaisDoMes(casa, '2026-12', 'p1');
  assert.deepEqual(ids(dez.contas), ['e1', 'a1']);
  assert.deepEqual(ids(dez.semValor), ['n1']);
  assert.equal(dez.total, 400);
  assert.equal(dez.aConfirmar, 0);
  const jan = contasPessoaisDoMes(casa, '2027-01', 'p1');
  assert.equal(jan.total, 400);
  assert.equal(jan.aConfirmar, 2);
  assert.equal(contasPessoaisDoMes(casa, '2026-12', 'p2').total, 0);
});

test('a última parcela: contando a do mês', () => {
  assert.equal(ultimoMesDasParcelas('2026-12', 1), '2026-12');
  assert.equal(ultimoMesDasParcelas('2026-12', 18), '2028-05');
  assert.equal(ultimoMesDasParcelas('2026-12', null), null);
});

test('adicionar: a conta do dono, com o fim pelas parcelas e o valor do mês (opcionais)', () => {
  const vazia = { ...casaBase(), contasPessoais: [], meses: [] };
  const com = adicionarContaPessoal(vazia, { nome: ' Empréstimo ', donoId: 'p1', mes: '2026-12', valor: 350, parcelas: 18, novoId: () => 'z1' });
  assert.deepEqual(com.contasPessoais, [{ id: 'z1', nome: 'Empréstimo', donoId: 'p1', arquivada: false, desde: '2026-12', ultimoMes: '2028-05' }]);
  assert.equal(valorDaContaPessoal(com, '2026-12', com.contasPessoais[0]).valor, 350);
  const sem = adicionarContaPessoal(vazia, { nome: 'Academia', donoId: 'p1', mes: '2026-12', novoId: () => 'z2' });
  assert.deepEqual(sem.contasPessoais, [{ id: 'z2', nome: 'Academia', donoId: 'p1', arquivada: false, desde: '2026-12' }]);
  assert.deepEqual(sem.meses, []);
  // Casa de antes das contas pessoais (sem a lista).
  const antiga = adicionarContaPessoal({ ...vazia, contasPessoais: undefined }, { nome: 'Academia', donoId: 'p1', mes: '2026-12', novoId: () => 'z3' });
  assert.deepEqual(ids(antiga.contasPessoais), ['z3']);
});

test('editar: nome sem espaços, tirar o fim, parar de usar', () => {
  const casa = casaBase();
  const semFim = editarContaPessoal(casa, 'e1', { ultimoMes: null });
  assert.ok(!('ultimoMes' in conta(semFim, 'e1')));
  const nome = editarContaPessoal(casa, 'a1', { nome: ' Academia nova ' });
  assert.equal(conta(nome, 'a1').nome, 'Academia nova');
  assert.equal(conta(nome, 'a1').desde, '2026-12');
  const parada = editarContaPessoal(casa, 'a1', { arquivada: true });
  assert.equal(conta(parada, 'a1').arquivada, true);
  const fim = editarContaPessoal(casa, 'a1', { ultimoMes: '2027-06' });
  assert.equal(conta(fim, 'a1').ultimoMes, '2027-06');
});

test('mover: troca com a vizinha ativa do mesmo dono; na ponta, igual', () => {
  const casa = casaBase();
  assert.deepEqual(ids(contasPessoaisDe(moverContaPessoal(casa, 'a1', -1), 'p1')), ['a1', 'e1']);
  assert.equal(moverContaPessoal(casa, 'e1', -1), casa);
  assert.equal(moverContaPessoal(casa, 'a1', 1), casa); // depois dela só a do Leo e a parada
  assert.deepEqual(ids(moverContaPessoal(casa, 'a1', -1).contasPessoais), ['a1', 'e1', 'l1', 'u1']);
});

test('confirmar a previsão: grava o valor previsto no mês; confirmada ou vazia, igual', () => {
  const casa = casaBase();
  const jan = confirmarPrevisao(casa, { mes: '2027-01', conta: conta(casa, 'a1') });
  assert.deepEqual(valorDaContaPessoal(jan, '2027-01', conta(jan, 'a1')), { valor: 100, situacao: 'confirmado', deOnde: null });
  assert.equal(confirmarPrevisao(casa, { mes: '2026-12', conta: conta(casa, 'a1') }), casa);
  assert.equal(confirmarPrevisao(casa, { mes: '2027-01', conta: conta(casa, 'l1') }), casa);
});
