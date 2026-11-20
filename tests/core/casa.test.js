import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMA_CASA, criarCasa, migrarCasa, primeiroMes, valorDaConta, salarioNoMes, resumoDoMes,
  salvarValor, salvarSalario, adicionarCompra, apagarCompra, conferirFatura,
  adicionarConta, editarConta, moverConta, renomearPessoa, compraDaCasa, fixasNoMes,
} from '../../js/core/casa.js';

const ids = () => { let n = 0; return () => `id${++n}`; };

// Casa de teste: Ana e Bia, contas c1..c3 e o cartão c4 (compra por compra).
function casaBase() {
  return {
    schemaVersion: SCHEMA_CASA,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }],
    contas: [
      { id: 'c1', nome: 'Condomínio', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Água', compraPorCompra: false, arquivada: false },
      { id: 'c3', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c4', nome: 'Cartão', compraPorCompra: true, arquivada: false },
    ],
    meses: [],
    cartao: null,
  };
}

test('criarCasa: duas pessoas e as contas sugeridas, só o cartão compra por compra', () => {
  const casa = criarCasa({ nomes: ['Ana', 'Bia'], novoId: ids() });
  assert.equal(casa.schemaVersion, 2);
  assert.equal(casa.cartao, null);
  assert.deepEqual(casa.pessoas, [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }]);
  assert.deepEqual(casa.contas.map((c) => c.nome), ['Condomínio', 'Água', 'Luz', 'Internet', 'Cartão da casa']);
  assert.deepEqual(casa.contas.filter((c) => c.compraPorCompra).map((c) => c.nome), ['Cartão da casa']);
  assert.ok(casa.contas.every((c) => c.arquivada === false));
  assert.deepEqual(casa.meses, []);
});

test('migrarCasa aceita a versão 2, leva a 1 para a 2 (sem cartão) e recusa outras', () => {
  const casa = casaBase();
  assert.equal(migrarCasa(casa), casa);
  const { cartao, ...v1 } = { ...casaBase(), schemaVersion: 1 };
  assert.deepEqual(migrarCasa(v1), { ...v1, schemaVersion: 2, cartao: null });
  assert.throws(() => migrarCasa({ schemaVersion: 3 }), /versao-desconhecida/);
  assert.throws(() => migrarCasa(null), /versao-desconhecida/);
});

test('previsão: sem valor no mês, usa o último valor conhecido e marca a confirmar', () => {
  const casa = salvarValor(casaBase(), { mes: '2026-10', contaId: 'c3', valor: 100 });
  assert.deepEqual(valorDaConta(casa, '2026-11', 'c3'), { valor: 100, situacao: 'a-confirmar', compras: [], deOnde: '2026-10' });
  const confirmada = salvarValor(casa, { mes: '2026-11', contaId: 'c3', valor: 120 });
  assert.deepEqual(valorDaConta(confirmada, '2026-11', 'c3'), { valor: 120, situacao: 'confirmado', compras: [], deOnde: null });
  assert.deepEqual(valorDaConta(casaBase(), '2026-11', 'c3'), { valor: 0, situacao: 'vazio', compras: [], deOnde: null });
});

test('previsão: conta que não usa mais nunca é prevista', () => {
  let casa = salvarValor(casaBase(), { mes: '2026-10', contaId: 'c2', valor: 50 });
  casa = editarConta(casa, 'c2', { arquivada: true });
  assert.equal(valorDaConta(casa, '2026-11', 'c2').situacao, 'vazio');
  assert.equal(valorDaConta(casa, '2026-10', 'c2').situacao, 'confirmado');
});

test('salvarValor com null tira o valor do mês e volta para a previsão', () => {
  let casa = salvarValor(casaBase(), { mes: '2026-10', contaId: 'c3', valor: 100 });
  casa = salvarValor(casa, { mes: '2026-11', contaId: 'c3', valor: 130 });
  casa = salvarValor(casa, { mes: '2026-11', contaId: 'c3', valor: null });
  assert.equal(valorDaConta(casa, '2026-11', 'c3').situacao, 'a-confirmar');
});

test('salário: o digitado, senão o último conhecido', () => {
  const casa = salvarSalario(casaBase(), { mes: '2026-10', pessoaId: 'p1', valor: 5000 });
  assert.deepEqual(salarioNoMes(casa, '2026-11', 'p1'), { valor: 5000, situacao: 'a-confirmar', deOnde: '2026-10' });
  assert.deepEqual(salarioNoMes(casa, '2026-10', 'p1'), { valor: 5000, situacao: 'confirmado', deOnde: null });
  assert.deepEqual(salarioNoMes(casa, '2026-11', 'p2'), { valor: 0, situacao: 'vazio', deOnde: null });
});

test('cartão: a soma das compras, a confirmar até conferir a fatura', () => {
  const novoId = ids();
  let casa = adicionarCompra(casaBase(), { mes: '2026-11', contaId: 'c4', nome: 'Mercado', valor: 50, vezes: 1, novoId });
  casa = adicionarCompra(casa, { mes: '2026-11', contaId: 'c4', nome: 'Farmácia', valor: 30, vezes: 1, novoId });
  const antes = valorDaConta(casa, '2026-11', 'c4');
  assert.equal(antes.valor, 80);
  assert.equal(antes.situacao, 'a-confirmar');
  assert.equal(antes.compras.length, 2);
  casa = conferirFatura(casa, { mes: '2026-11', contaId: 'c4' });
  assert.equal(valorDaConta(casa, '2026-11', 'c4').situacao, 'confirmado');
  assert.equal(casa.meses.find((m) => m.mes === '2026-11').valores.c4, 80);
  casa = adicionarCompra(casa, { mes: '2026-11', contaId: 'c4', nome: 'Gás', valor: 20, vezes: 1, novoId });
  assert.equal(valorDaConta(casa, '2026-11', 'c4').valor, 100);
  assert.equal(casa.meses.find((m) => m.mes === '2026-11').valores.c4, 100);
});

test('cartão sem compras e sem valor: prevê pelo último mês', () => {
  let casa = salvarValor(casaBase(), { mes: '2026-10', contaId: 'c4', valor: 900 });
  assert.deepEqual(valorDaConta(casa, '2026-11', 'c4'), { valor: 900, situacao: 'a-confirmar', compras: [], deOnde: '2026-10' });
  casa = adicionarCompra(casa, { mes: '2026-11', contaId: 'c4', nome: 'Mercado', valor: 50, vezes: 1, novoId: ids() });
  assert.equal(valorDaConta(casa, '2026-11', 'c4').valor, 50);
});

test('compra parcelada aparece nos meses seguintes; apagar uma parcela apaga as seguintes', () => {
  let casa = adicionarCompra(casaBase(), { mes: '2026-11', contaId: 'c4', nome: 'Sofá', valor: 40, vezes: 3, novoId: ids() });
  const compras = casa.meses.flatMap((m) => m.compras.map((c) => ({ mes: m.mes, ...c })));
  assert.deepEqual(compras.map((c) => c.mes), ['2026-11', '2026-12', '2027-01']);
  assert.equal(new Set(compras.map((c) => c.grupo)).size, 1);
  assert.deepEqual(compras.map((c) => c.parcela), [{ n: 1, de: 3 }, { n: 2, de: 3 }, { n: 3, de: 3 }]);
  assert.ok(compras.every((c) => c.valor === 40 && c.nome === 'Sofá' && c.contaId === 'c4'));

  const dezembro = compras.find((c) => c.mes === '2026-12');
  casa = apagarCompra(casa, { mes: '2026-12', compraId: dezembro.id });
  const sobrou = casa.meses.flatMap((m) => m.compras.map((c) => m.mes));
  assert.deepEqual(sobrou, ['2026-11']);
});

test('apagar compra de fatura conferida atualiza o valor da fatura', () => {
  const novoId = ids();
  let casa = adicionarCompra(casaBase(), { mes: '2026-11', contaId: 'c4', nome: 'A', valor: 10, vezes: 1, novoId });
  casa = adicionarCompra(casa, { mes: '2026-11', contaId: 'c4', nome: 'B', valor: 5, vezes: 1, novoId });
  casa = conferirFatura(casa, { mes: '2026-11', contaId: 'c4' });
  const b = casa.meses[0].compras.find((c) => c.nome === 'B');
  casa = apagarCompra(casa, { mes: '2026-11', compraId: b.id });
  assert.equal(casa.meses[0].valores.c4, 10);
  assert.equal(valorDaConta(casa, '2026-11', 'c4').valor, 10);
});

test('resumoDoMes divide pela renda: cada um paga a mesma fatia do que ganha', () => {
  let casa = salvarValor(casaBase(), { mes: '2026-11', contaId: 'c1', valor: 600 });
  casa = salvarValor(casa, { mes: '2026-11', contaId: 'c2', valor: 400 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p1', valor: 7500 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p2', valor: 2500 });
  const r = resumoDoMes(casa, '2026-11');
  assert.equal(r.total, 1000);
  assert.equal(r.renda, 10000);
  assert.equal(r.divide, true);
  assert.equal(r.fatiaDaRenda, 0.1);
  assert.deepEqual(r.pessoas.map((p) => [p.pessoa.nome, p.paga, p.sobra, p.fatia]), [['Ana', 750, 6750, 0.75], ['Bia', 250, 2250, 0.25]]);
});

test('resumoDoMes: as duas partes somam o total exato em centavos', () => {
  let casa = salvarValor(casaBase(), { mes: '2026-11', contaId: 'c1', valor: 100 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p1', valor: 1 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p2', valor: 2 });
  const r = resumoDoMes(casa, '2026-11');
  assert.deepEqual(r.pessoas.map((p) => p.paga), [33.33, 66.67]);
});

test('resumoDoMes sem salários não divide; com um salário só, essa pessoa paga tudo', () => {
  let casa = salvarValor(casaBase(), { mes: '2026-11', contaId: 'c1', valor: 300 });
  const sem = resumoDoMes(casa, '2026-11');
  assert.equal(sem.divide, false);
  assert.equal(sem.fatiaDaRenda, null);
  assert.deepEqual(sem.pessoas.map((p) => p.paga), [null, null]);
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p1', valor: 0 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p2', valor: 3000 });
  const um = resumoDoMes(casa, '2026-11');
  assert.equal(um.divide, true);
  assert.deepEqual(um.pessoas.map((p) => p.paga), [0, 300]);
});

test('resumoDoMes: contas com zero ficam em semValor; arquivada com zero não aparece; conta o que falta confirmar', () => {
  let casa = salvarValor(casaBase(), { mes: '2026-10', contaId: 'c3', valor: 90 });
  casa = salvarValor(casa, { mes: '2026-11', contaId: 'c1', valor: 500 });
  casa = salvarValor(casa, { mes: '2026-11', contaId: 'c2', valor: 0 });
  casa = salvarSalario(casa, { mes: '2026-10', pessoaId: 'p1', valor: 4000 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p2', valor: 2000 });
  casa = editarConta(casa, 'c2', { arquivada: true });
  const r = resumoDoMes(casa, '2026-11');
  assert.deepEqual(r.contas.map((c) => [c.conta.id, c.valor, c.situacao]), [['c1', 500, 'confirmado'], ['c3', 90, 'a-confirmar']]);
  assert.deepEqual(r.semValor.map((c) => c.id), ['c4']);
  assert.equal(r.total, 590);
  assert.equal(r.aConfirmar, 2); // a Luz e o salário da Ana
});

test('resumoDoMes mostra conta arquivada com valor digitado no mês', () => {
  let casa = salvarValor(casaBase(), { mes: '2025-05', contaId: 'c2', valor: 70 });
  casa = editarConta(casa, 'c2', { arquivada: true });
  assert.deepEqual(resumoDoMes(casa, '2025-05').contas.map((c) => c.conta.id), ['c2']);
});

test('primeiroMes é o mês mais antigo com dados', () => {
  assert.equal(primeiroMes(casaBase()), null);
  let casa = salvarValor(casaBase(), { mes: '2026-03', contaId: 'c1', valor: 1 });
  casa = salvarSalario(casa, { mes: '2025-12', pessoaId: 'p1', valor: 1 });
  assert.equal(primeiroMes(casa), '2025-12');
});

test('meses ficam em ordem e mutações não alteram a casa original', () => {
  const original = casaBase();
  let casa = salvarValor(original, { mes: '2026-11', contaId: 'c1', valor: 1 });
  casa = salvarValor(casa, { mes: '2026-09', contaId: 'c1', valor: 1 });
  assert.deepEqual(casa.meses.map((m) => m.mes), ['2026-09', '2026-11']);
  assert.deepEqual(original.meses, []);
});

test('contas: adicionar, mover, renomear, arquivar e pessoas', () => {
  let casa = adicionarConta(casaBase(), { nome: 'Faxina', compraPorCompra: false, novoId: () => 'c5' });
  assert.deepEqual(casa.contas.at(-1), { id: 'c5', nome: 'Faxina', compraPorCompra: false, arquivada: false });
  casa = moverConta(casa, 'c2', -1);
  assert.deepEqual(casa.contas.map((c) => c.id), ['c2', 'c1', 'c3', 'c4', 'c5']);
  casa = moverConta(casa, 'c2', -1); // já é a primeira: não muda
  assert.deepEqual(casa.contas.map((c) => c.id), ['c2', 'c1', 'c3', 'c4', 'c5']);
  casa = editarConta(casa, 'c3', { nome: 'Energia', compraPorCompra: true });
  assert.deepEqual(casa.contas.find((c) => c.id === 'c3'), { id: 'c3', nome: 'Energia', compraPorCompra: true, arquivada: false });
  casa = renomearPessoa(casa, 'p2', 'Bea');
  assert.deepEqual(casa.pessoas.map((p) => p.nome), ['Ana', 'Bea']);
});

// ---------- revisão final ----------
import { parcelasSeguintes } from '../../js/core/casa.js';

test('revisão: subir/descer pula as contas que não usa mais (que ficam escondidas nos Ajustes)', () => {
  let casa = editarConta(casaBase(), 'c2', { arquivada: true }); // [c1, c2(arq), c3, c4]
  casa = moverConta(casa, 'c3', -1);
  assert.deepEqual(casa.contas.filter((c) => !c.arquivada).map((c) => c.id), ['c3', 'c1', 'c4']);
  casa = moverConta(casa, 'c1', 1);
  assert.deepEqual(casa.contas.filter((c) => !c.arquivada).map((c) => c.id), ['c3', 'c4', 'c1']);
  const antes = casa.contas.map((c) => c.id);
  assert.deepEqual(moverConta(casa, 'c3', -1).contas.map((c) => c.id), antes); // já é a primeira visível
});

test('revisão: voltar a usar uma conta não inventa valores nos meses de antes', () => {
  let casa = salvarValor(casaBase(), { mes: '2025-12', contaId: 'c2', valor: 50 });
  casa = editarConta(casa, 'c2', { arquivada: true });
  casa = editarConta(casa, 'c2', { arquivada: false, ativadaEm: '2026-11' });
  assert.equal(valorDaConta(casa, '2026-02', 'c2').situacao, 'vazio');
  assert.equal(valorDaConta(casa, '2025-12', 'c2').situacao, 'confirmado');
  assert.deepEqual(valorDaConta(casa, '2026-11', 'c2'), { valor: 50, situacao: 'a-confirmar', compras: [], deOnde: '2025-12' });
});

test('revisão: quantas parcelas seguintes uma compra leva junto ao ser apagada', () => {
  const novoId = ids();
  let casa = adicionarCompra(casaBase(), { mes: '2026-11', contaId: 'c4', nome: 'Sofá', valor: 40, vezes: 3, novoId });
  casa = adicionarCompra(casa, { mes: '2026-11', contaId: 'c4', nome: 'Pão', valor: 5, vezes: 1, novoId });
  const sofa = casa.meses[0].compras.find((c) => c.nome === 'Sofá');
  const pao = casa.meses[0].compras.find((c) => c.nome === 'Pão');
  assert.equal(parcelasSeguintes(casa, { mes: '2026-11', compraId: sofa.id }), 2);
  assert.equal(parcelasSeguintes(casa, { mes: '2026-11', compraId: pao.id }), 0);
  const ultima = casa.meses.find((m) => m.mes === '2027-01').compras[0];
  assert.equal(parcelasSeguintes(casa, { mes: '2027-01', compraId: ultima.id }), 0);
});

// ---------- cartão de uma das pessoas (desenho 2026-11-19-cartao) ----------
const comCartao = (fixas = []) => ({
  ...casaBase(),
  cartao: { donaId: 'p2', viraNoDia: 3, venceNoDia: 10, contaId: 'c4', pessoas: [{ id: 'q1', nome: 'Mãe' }], fixas },
});

test('cartão: a conta da casa soma só as compras da casa (e as antigas, sem "para")', () => {
  let casa = comCartao();
  casa = adicionarCompra(casa, { mes: '2026-12', contaId: 'c4', nome: 'Mercado', valor: 100, novoId: ids(), extra: { data: '2026-11-19', para: 'casa' } });
  casa = adicionarCompra(casa, { mes: '2026-12', contaId: 'c4', nome: 'Antiga', valor: 30, novoId: ids() });
  casa = adicionarCompra(casa, { mes: '2026-12', contaId: 'c4', nome: 'Blusa', valor: 80, novoId: () => 'b1', extra: { data: '2026-11-20', para: 'p2' } });
  casa = adicionarCompra(casa, { mes: '2026-12', contaId: 'c4', nome: 'Remédio', valor: 45, novoId: () => 'r1', extra: { data: '2026-11-21', para: 'q1' } });
  const v = valorDaConta(casa, '2026-12', 'c4');
  assert.equal(v.valor, 130);
  assert.deepEqual(v.compras.map((c) => c.nome), ['Mercado', 'Antiga']);
  assert.equal(v.situacao, 'a-confirmar');
  const blusa = casa.meses[0].compras.find((c) => c.id === 'b1');
  assert.deepEqual([blusa.data, blusa.para], ['2026-11-20', 'p2']);
});

test('cartão: as de todo mês da casa entram na conta nos meses em que valem', () => {
  const casa = comCartao([
    { id: 'f1', nome: 'Streaming', valor: 40, para: 'casa', desde: '2026-12' },
    { id: 'f2', nome: 'Academia', valor: 90, para: 'p2', desde: '2026-12' },
    { id: 'f3', nome: 'Jornal', valor: 10, para: 'casa', desde: '2026-12', ate: '2027-01' },
  ]);
  assert.deepEqual(fixasNoMes(casa, '2027-01').map((f) => f.id), ['f1', 'f2', 'f3']);
  assert.deepEqual(fixasNoMes(casa, '2027-02').map((f) => f.id), ['f1', 'f2']);
  assert.deepEqual(fixasNoMes(casa, '2026-11'), []);
  assert.equal(valorDaConta(casa, '2027-01', 'c4').valor, 50);
  assert.equal(valorDaConta(casa, '2027-03', 'c4').valor, 40);
  assert.equal(valorDaConta(casa, '2027-03', 'c4').situacao, 'a-confirmar');
  // Outras contas compra por compra não recebem as de todo mês do cartão.
  const outra = { ...casa, contas: [...casa.contas, { id: 'c5', nome: 'Outro cartão', compraPorCompra: true, arquivada: false }] };
  assert.equal(valorDaConta(outra, '2027-03', 'c5').valor, 0);
});

test('cartão: mês com só compras pessoais segue a previsão da conta da casa', () => {
  let casa = salvarValor(comCartao(), { mes: '2026-11', contaId: 'c4', valor: 700 });
  casa = adicionarCompra(casa, { mes: '2026-12', contaId: 'c4', nome: 'Blusa', valor: 80, novoId: ids(), extra: { data: '2026-11-20', para: 'p2' } });
  const v = valorDaConta(casa, '2026-12', 'c4');
  assert.deepEqual([v.valor, v.situacao, v.deOnde], [700, 'a-confirmar', '2026-11']);
  assert.equal(compraDaCasa({ para: 'p2' }), false);
  assert.equal(compraDaCasa({ para: 'casa' }), true);
  assert.equal(compraDaCasa({}), true);
});

test('cartão: conferir a fatura grava a parte da casa, com as de todo mês', () => {
  let casa = comCartao([{ id: 'f1', nome: 'Streaming', valor: 40, para: 'casa', desde: '2026-12' }]);
  casa = adicionarCompra(casa, { mes: '2026-12', contaId: 'c4', nome: 'Mercado', valor: 100, novoId: ids(), extra: { data: '2026-11-19', para: 'casa' } });
  casa = adicionarCompra(casa, { mes: '2026-12', contaId: 'c4', nome: 'Blusa', valor: 80, novoId: ids(), extra: { data: '2026-11-20', para: 'p2' } });
  casa = conferirFatura(casa, { mes: '2026-12', contaId: 'c4' });
  assert.equal(casa.meses[0].valores.c4, 140);
  const v = valorDaConta(casa, '2026-12', 'c4');
  assert.deepEqual([v.valor, v.situacao], [140, 'confirmado']);
});

test('cartão: compra parcelada leva data e para quem a todas as parcelas', () => {
  const casa = adicionarCompra(comCartao(), { mes: '2026-12', contaId: 'c4', nome: 'Sofá', valor: 100, vezes: 3, novoId: ids(), extra: { data: '2026-11-19', para: 'casa' } });
  assert.deepEqual(casa.meses.map((m) => [m.mes, m.compras[0].data, m.compras[0].para, m.compras[0].parcela.n]), [
    ['2026-12', '2026-11-19', 'casa', 1], ['2027-01', '2026-11-19', 'casa', 2], ['2027-02', '2026-11-19', 'casa', 3],
  ]);
});
