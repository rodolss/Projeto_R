// Quem divide as contas vem dos perfis (desenho 2026-11-21-divisao-pelos-perfis).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCasa, salvarValor, salvarSalario, resumoDoMes, divideNoMes, pessoasNoMes } from '../../js/core/casa.js';
import { adicionarPerfil, entrarNaDivisao, sairDaDivisao, podeSairDaDivisao, quemDivideNosAjustes } from '../../js/core/perfis.js';
import { resumoDoAno } from '../../js/core/casa-ano.js';
import { balancoDoMes } from '../../js/core/balanco.js';

const ids = () => { let n = 0; return () => `id${++n}`; };
const nomes = (lista) => lista.map((p) => p.nome);
const daPessoa = (casa, id) => casa.pessoas.find((p) => p.id === id);

// Casa inventada: Ana (p1, administra) e Leo (p2) dividem; a Cris (p3) é um perfil novo. Condomínio = id1.
function casaComCris() {
  const casa = criarCasa({ nomes: ['Ana', 'Leo'], novoId: ids() });
  return adicionarPerfil(casa, { nome: 'Cris', novoId: () => 'p3' }).casa;
}

test('divideNoMes: sem períodos divide sempre; com períodos, só dentro deles (o fim não conta)', () => {
  assert.equal(divideNoMes({ id: 'p1' }, '2026-11'), true);
  const entrou = { id: 'p3', dentro: [{ de: '2026-12' }] };
  assert.equal(divideNoMes(entrou, '2026-11'), false);
  assert.equal(divideNoMes(entrou, '2026-12'), true);
  const saiu = { id: 'p2', dentro: [{ ate: '2026-12' }] };
  assert.equal(divideNoMes(saiu, '2026-11'), true);
  assert.equal(divideNoMes(saiu, '2026-12'), false);
  const meio = { id: 'p3', dentro: [{ de: '2026-03', ate: '2026-05' }] };
  assert.equal(divideNoMes(meio, '2026-04'), true);
  assert.equal(divideNoMes(meio, '2026-05'), false);
});

test('entrarNaDivisao: o perfil novo divide do mês dado em diante; os meses antes ficam como estavam', () => {
  const casa = entrarNaDivisao(casaComCris(), 'p3', '2026-12');
  assert.deepEqual(daPessoa(casa, 'p3'), { id: 'p3', nome: 'Cris', dentro: [{ de: '2026-12' }] });
  assert.deepEqual(nomes(pessoasNoMes(casa, '2026-11')), ['Ana', 'Leo']);
  assert.deepEqual(nomes(pessoasNoMes(casa, '2026-12')), ['Ana', 'Leo', 'Cris']);
  assert.equal(entrarNaDivisao(casa, 'p3', '2027-02'), casa, 'quem já divide fica como está');
});

test('resumoDoMes divide entre as três pela renda; antes de a Cris entrar, só entre as duas', () => {
  let casa = entrarNaDivisao(casaComCris(), 'p3', '2026-12');
  for (const mes of ['2026-11', '2026-12']) casa = salvarValor(casa, { mes, contaId: 'id1', valor: 600 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p1', valor: 3000 });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p2', valor: 2000 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p3', valor: 1000 });
  const nov = resumoDoMes(casa, '2026-11');
  assert.deepEqual(nov.pessoas.map((p) => [p.pessoa.id, p.paga]), [['p1', 360], ['p2', 240]]);
  const dez = resumoDoMes(casa, '2026-12');
  assert.deepEqual(dez.pessoas.map((p) => [p.pessoa.id, p.paga]), [['p1', 300], ['p2', 200], ['p3', 100]]);
});

test('sairDaDivisao no mesmo mês em que entrou desfaz: a Cris sai da lista de quem divide', () => {
  const casa = casaComCris();
  const entrou = entrarNaDivisao(casa, 'p3', '2026-12');
  assert.deepEqual(sairDaDivisao(entrou, 'p3', '2026-12').pessoas, casa.pessoas);
});

test('sairDaDivisao mais tarde fecha o período: os meses antes continuam com ela', () => {
  const casa = sairDaDivisao(entrarNaDivisao(casaComCris(), 'p3', '2026-12'), 'p3', '2027-03');
  assert.deepEqual(daPessoa(casa, 'p3').dentro, [{ de: '2026-12', ate: '2027-03' }]);
  assert.deepEqual(nomes(pessoasNoMes(casa, '2027-02')), ['Ana', 'Leo', 'Cris']);
  assert.deepEqual(nomes(pessoasNoMes(casa, '2027-03')), ['Ana', 'Leo']);
});

test('quem divide desde sempre sai de um mês em diante; voltar no mesmo mês desfaz, mais tarde abre outro período', () => {
  const comCris = entrarNaDivisao(casaComCris(), 'p3', '2026-12');
  const saiu = sairDaDivisao(comCris, 'p2', '2027-01');
  assert.deepEqual(daPessoa(saiu, 'p2').dentro, [{ ate: '2027-01' }]);
  assert.deepEqual(nomes(pessoasNoMes(saiu, '2026-12')), ['Ana', 'Leo', 'Cris']);
  assert.deepEqual(nomes(pessoasNoMes(saiu, '2027-01')), ['Ana', 'Cris']);
  assert.deepEqual(daPessoa(entrarNaDivisao(saiu, 'p2', '2027-01'), 'p2'), { id: 'p2', nome: 'Leo' });
  assert.deepEqual(daPessoa(entrarNaDivisao(saiu, 'p2', '2027-04'), 'p2').dentro, [{ ate: '2027-01' }, { de: '2027-04' }]);
});

test('ficam sempre pelo menos duas dividindo: a saída que deixaria uma só não acontece', () => {
  const casa = casaComCris();
  assert.equal(podeSairDaDivisao(casa, 'p2', '2026-12'), false);
  assert.equal(sairDaDivisao(casa, 'p2', '2026-12'), casa);
  const comCris = entrarNaDivisao(casa, 'p3', '2026-12');
  assert.equal(podeSairDaDivisao(comCris, 'p2', '2026-12'), true);
  assert.equal(podeSairDaDivisao(comCris, 'p2', '2026-11'), false, 'em novembro a Cris ainda não divide');
  // A Cris sai em março: o Leo sair em janeiro deixaria a Ana sozinha de março em diante.
  const crisSaiEmMarco = sairDaDivisao(comCris, 'p3', '2027-03');
  assert.equal(podeSairDaDivisao(crisSaiEmMarco, 'p2', '2027-01'), false);
});

test('quemDivideNosAjustes: quem administra vê todos os perfis, primeiro quem divide; os outros, só quem divide', () => {
  const casa = entrarNaDivisao(casaComCris(), 'p3', '2027-01');
  const deQuem = (lista) => lista.map((x) => [x.pessoa.id, x.divide]);
  assert.deepEqual(deQuem(quemDivideNosAjustes(casa, '2026-12', { administra: true })), [['p1', true], ['p2', true], ['p3', false]]);
  assert.deepEqual(deQuem(quemDivideNosAjustes(casa, '2027-01', { administra: true })), [['p1', true], ['p2', true], ['p3', true]]);
  assert.deepEqual(deQuem(quemDivideNosAjustes(casa, '2026-12', { administra: false })), [['p1', true], ['p2', true]]);
  assert.equal(quemDivideNosAjustes(casa, '2026-12', { administra: true })[0].pessoa.admin, true, 'vem o perfil (com foto e "administra")');
});

test('quemDivideNosAjustes: para quem administra, a ordem é a dos perfis (marcar alguém não o faz pular de lugar)', () => {
  let casa = adicionarPerfil(casaComCris(), { nome: 'Bruno', novoId: () => 'p4' }).casa;
  casa = entrarNaDivisao(casa, 'p4', '2026-11');
  assert.deepEqual(quemDivideNosAjustes(casa, '2026-11', { administra: true }).map((x) => x.pessoa.id), ['p1', 'p2', 'p3', 'p4']);
  assert.deepEqual(quemDivideNosAjustes(casa, '2026-11', { administra: false }).map((x) => x.pessoa.id), ['p1', 'p2', 'p4']);
});

test('resumoDoAno junta cada pessoa pelo id: a Cris, que entrou em março, soma só os meses dela', () => {
  let casa = entrarNaDivisao(casaComCris(), 'p3', '2026-03');
  for (const mes of ['2026-01', '2026-02', '2026-03', '2026-04']) casa = salvarValor(casa, { mes, contaId: 'id1', valor: 600 });
  casa = salvarSalario(casa, { mes: '2026-01', pessoaId: 'p1', valor: 3000 });
  casa = salvarSalario(casa, { mes: '2026-01', pessoaId: 'p2', valor: 3000 });
  casa = salvarSalario(casa, { mes: '2026-03', pessoaId: 'p3', valor: 6000 });
  const ano = resumoDoAno(casa, 2026, '2026-04');
  assert.deepEqual(ano.pessoas.map((p) => [p.pessoa.id, p.totalPago, p.mediaPaga]), [['p1', 900, 225], ['p2', 900, 225], ['p3', 600, 300]]);
  const antes = resumoDoAno(entrarNaDivisao(casaComCris(), 'p3', '2027-01'), 2026, '2026-12');
  assert.deepEqual(antes.pessoas.map((p) => p.pessoa.id), ['p1', 'p2'], 'quem só entra no ano seguinte fica fora');
});

test('resumoDoMes: quem entrou e ainda não tem salário paga zero, nunca −R$ 0,01 (o arredondamento fica com quem ganha)', () => {
  let casa = entrarNaDivisao(casaComCris(), 'p3', '2026-12');
  casa = salvarValor(casa, { mes: '2026-12', contaId: 'id1', valor: 100.01 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p1', valor: 3000 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p2', valor: 3000 });
  const r = resumoDoMes(casa, '2026-12');
  assert.equal(r.pessoas.find((p) => p.pessoa.id === 'p3').paga, 0);
  assert.ok(r.pessoas.every((p) => p.paga >= 0));
  assert.equal(Math.round(r.pessoas.reduce((s, p) => s + p.paga, 0) * 100), 10001, 'as partes somam o total');
});

test('quemDivideNosAjustes: uma mudança já marcada para depois do mês em foco vem em `muda` (o foco pode voltar um mês)', () => {
  const casa = sairDaDivisao(entrarNaDivisao(casaComCris(), 'p3', '2026-12'), 'p2', '2027-01');
  const lista = quemDivideNosAjustes(casa, '2026-11', { administra: true });
  const de = (id) => lista.find((x) => x.pessoa.id === id);
  assert.deepEqual([de('p3').divide, de('p3').muda], [false, '2026-12'], 'a Cris entra em dezembro');
  assert.deepEqual([de('p2').divide, de('p2').muda], [true, '2027-01'], 'o Leo sai em janeiro');
  assert.equal(de('p1').muda, null);
});

test('balancoDoMes: o perfil que entrou na divisão ganha salário e a parte dele nas contas', () => {
  let casa = entrarNaDivisao(casaComCris(), 'p3', '2026-12');
  casa = salvarValor(casa, { mes: '2026-12', contaId: 'id1', valor: 600 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p1', valor: 3000 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p2', valor: 2000 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p3', valor: 1000 });
  const b = balancoDoMes(casa, '2026-12', 'p3', '2026-12-05');
  assert.equal(b.salario.valor, 1000);
  assert.equal(b.contas.valor, 100);
});
