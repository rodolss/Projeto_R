import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesclarCasa } from '../../js/dados/mesclar-casa.js';
import { definirSalario } from '../../js/core/salario.js';
import { salvarValor, adicionarCompra, apagarCompra, editarConta, migrarCasa } from '../../js/core/casa.js';
import { adicionarContaPessoal } from '../../js/core/contas-pessoais.js';
import { anotarCompra, adicionarCartao, configurarCartao, adicionarPessoaDoCartao, editarFixa, editarCompraDoCartao, marcarJaTenho } from '../../js/core/cartao.js';

function base() {
  return {
    schemaVersion: 1,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }],
    contas: [
      { id: 'c1', nome: 'Água', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c4', nome: 'Cartão', compraPorCompra: true, arquivada: false },
    ],
    meses: [{ mes: '2026-11', salarios: { p1: 5000 }, valores: { c1: 40 }, compras: [{ id: 'x1', contaId: 'c4', nome: 'Pão', valor: 10 }] }],
  };
}
const mes = (casa, m) => casa.meses.find((x) => x.mes === m);

test('dois aparelhos digitam contas diferentes no mesmo mês: as duas ficam', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-11', contaId: 'c2', valor: 210 });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: 45 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').valores, { c1: 45, c2: 210 });
  assert.deepEqual(mes(r, '2026-11').salarios, { p1: 5000 });
});

test('os dois anotam compras diferentes no cartão: as duas ficam', () => {
  const b = base();
  const local = adicionarCompra(b, { mes: '2026-11', contaId: 'c4', nome: 'Gás', valor: 100, novoId: () => 'L1' });
  const remoto = adicionarCompra(b, { mes: '2026-11', contaId: 'c4', nome: 'Farmácia', valor: 30, novoId: () => 'R1' });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').compras.map((c) => c.id).sort(), ['L1', 'R1', 'x1']);
});

test('compra apagada num aparelho e intacta no outro some', () => {
  const b = base();
  const local = apagarCompra(b, { mes: '2026-11', compraId: 'x1' });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c2', valor: 99 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').compras, []);
  assert.equal(mes(r, '2026-11').valores.c2, 99);
});

test('valor tirado num aparelho e intacto no outro some', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: null });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c2', valor: 80 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(mes(r, '2026-11').valores, { c2: 80 });
});

test('uma conta renomeada num lado e arquivada no outro: nome novo e arquivada', () => {
  const b = base();
  const local = editarConta(b, 'c2', { nome: 'Energia' });
  const remoto = editarConta(b, 'c2', { arquivada: true });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.contas.find((c) => c.id === 'c2'), { id: 'c2', nome: 'Energia', compraPorCompra: false, arquivada: true });
});

test('o mesmo campo mudado nos dois lados: vale o local', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: 50 });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c1', valor: 60 });
  assert.equal(mes(mesclarCasa({ base: b, local, remoto }), '2026-11').valores.c1, 50);
});

test('sem base (primeira sincronização) une as listas', () => {
  const local = salvarValor(base(), { mes: '2026-10', contaId: 'c1', valor: 1 });
  const remoto = salvarValor(base(), { mes: '2026-12', contaId: 'c1', valor: 2 });
  const r = mesclarCasa({ base: null, local, remoto });
  assert.deepEqual(r.meses.map((m) => m.mes), ['2026-10', '2026-11', '2026-12']);
});

test('mês novo dos dois lados vem em ordem', () => {
  const b = base();
  const local = salvarValor(b, { mes: '2026-09', contaId: 'c1', valor: 1 });
  const remoto = salvarValor(b, { mes: '2026-12', contaId: 'c1', valor: 2 });
  assert.deepEqual(mesclarCasa({ base: b, local, remoto }).meses.map((m) => m.mes), ['2026-09', '2026-11', '2026-12']);
});

// ---------- cartão (desenho 2026-11-19-cartao) ----------

const baseV3 = () => adicionarCartao(migrarCasa(base()), { donaId: 'p2', viraNoDia: 3, venceNoDia: 10, novoId: () => 'nao' }).casa;
const K = 'c4';

test('cartão: um celular configura os dias enquanto o outro anota compra: os dois ficam', () => {
  const b = baseV3();
  const local = configurarCartao(b, K, { viraNoDia: 5, venceNoDia: 12 });
  const remoto = anotarCompra(b, { cartaoId: K, data: '2026-11-19', nome: 'Mercado', valor: 50, para: 'casa', novoId: () => 'k1' });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual([r.cartoes[0].viraNoDia, r.cartoes[0].venceNoDia], [5, 12]);
  assert.deepEqual(mes(r, '2026-12').compras.map((c) => c.id), ['k1']);
});

test('cartão: os dois acrescentam de todo mês e pessoas, e um muda o valor de uma: tudo fica', () => {
  const b = anotarCompra(baseV3(), { cartaoId: K, data: '2026-11-19', nome: 'Streaming', valor: 40, todoMes: true, para: 'casa', novoId: () => 'f1' });
  let local = anotarCompra(b, { cartaoId: K, data: '2026-11-19', nome: 'Academia', valor: 90, todoMes: true, para: 'p2', novoId: () => 'f2' });
  local = adicionarPessoaDoCartao(local, { nome: 'Mãe', novoId: () => 'q1' }).casa;
  let remoto = editarFixa(b, { cartaoId: K, fixaId: 'f1', fatura: '2027-03', valor: 45, novoId: () => 'f3' });
  remoto = adicionarPessoaDoCartao(remoto, { nome: 'Tio', novoId: () => 'q2' }).casa;
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.cartoes[0].fixas.map((f) => [f.id, f.valor, f.ate ?? null]), [['f1', 40, '2027-02'], ['f2', 90, null], ['f3', 45, null]]);
  assert.deepEqual(r.outrasPessoas.map((p) => p.nome), ['Mãe', 'Tio']);
});

test('revisão: base da versão 1 (antes do cartão) e cartão chegando do outro celular: o cartão não some', () => {
  const b = base(); // versão 1, sem a chave "cartao"
  const local = salvarValor(migrarCasa(b), { mes: '2026-11', contaId: 'c2', valor: 210 }); // migrado aqui: sem cartões
  const remoto = anotarCompra(baseV3(), { cartaoId: K, data: '2026-11-19', nome: 'Mercado', valor: 50, para: 'casa', novoId: () => 'k1' });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.equal(r.schemaVersion, 4);
  assert.deepEqual(r.cartoes.map((c) => c.contaId), ['c4']);
  assert.equal(mes(r, '2026-11').valores.c2, 210);
  assert.deepEqual(mes(r, '2026-12').compras.map((c) => c.id), ['k1']);
});

test('revisão: celular ainda na versão 2 e o outro já na 3 com um cartão novo: nenhum cartão some nem dobra', () => {
  // Base e local na versão 2 com o cartão da Bia; o remoto (versão 3) mudou o dono e criou um segundo cartão.
  const v2 = { ...base(), schemaVersion: 2, cartao: { donaId: 'p1', viraNoDia: 24, venceNoDia: 1, contaId: 'c4', pessoas: [], fixas: [] } };
  const local = { ...v2, meses: [...v2.meses] };
  let remoto = configurarCartao(migrarCasa(v2), K, { donaId: 'p2', viraNoDia: null, venceNoDia: null });
  remoto = adicionarCartao(remoto, { donaId: 'p1', viraNoDia: 24, venceNoDia: 1, novoId: () => 'c9' }).casa;
  const r = mesclarCasa({ base: v2, local, remoto });
  assert.deepEqual(r.cartoes.map((c) => [c.id, c.donaId, c.viraNoDia]), [['c4', 'p2', null], ['c9', 'p1', 24]]);
});

test('perfis: dois aparelhos ligando chaves ao mesmo tempo: as duas ligações ficam', async () => {
  const { vincularAparelho } = await import('../../js/core/perfis.js');
  const b = baseV3();
  const local = vincularAparelho(b, { impressao: 'aaaa', perfilId: 'p1', hoje: '2026-11-20' });
  const remoto = vincularAparelho(b, { impressao: 'bbbb', perfilId: 'p2', hoje: '2026-11-20' });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.aparelhos.map((a) => [a.id, a.perfilId]), [['aaaa', 'p1'], ['bbbb', 'p2']]);
});

// ---------- "Já tenho" (desenho 2026-11-20-ja-tenho) ----------

test('um aparelho marca "já tenho" e o outro muda o nome da mesma compra: as duas mudanças ficam', () => {
  const b = anotarCompra(baseV3(), { cartaoId: K, data: '2026-11-19', nome: 'Farmácia', valor: 30, para: 'p1', novoId: () => 'k1' });
  const local = marcarJaTenho(b, { cartaoId: K, fatura: '2026-12', compraId: 'k1', jaTenho: true });
  const remoto = editarCompraDoCartao(b, { fatura: '2026-12', compraId: 'k1', nome: 'Farmácia da Ana' });
  const r = mesclarCasa({ base: b, local, remoto });
  const compra = mes(r, '2026-12').compras.find((c) => c.id === 'k1');
  assert.deepEqual([compra.nome, compra.jaTenho], ['Farmácia da Ana', true]);
});

test('cada aparelho marca uma fatura diferente da mesma de todo mês: as duas ficam', () => {
  const b = anotarCompra(baseV3(), { cartaoId: K, data: '2026-11-19', nome: 'Celular', valor: 38, todoMes: true, para: 'p1', novoId: () => 'f1' });
  const local = marcarJaTenho(b, { cartaoId: K, fatura: '2026-12', fixaId: 'f1', jaTenho: true });
  const remoto = marcarJaTenho(b, { cartaoId: K, fatura: '2027-01', fixaId: 'f1', jaTenho: true });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.cartoes[0].fixas[0].jaTenhoEm, { '2026-12': true, '2027-01': true });
});

test('revisão: um aparelho desmarca a única marca de uma de todo mês e o outro marca outra fatura: a desmarcada não volta', () => {
  let b = anotarCompra(baseV3(), { cartaoId: K, data: '2026-11-19', nome: 'Celular', valor: 38, todoMes: true, para: 'p1', novoId: () => 'f1' });
  b = marcarJaTenho(b, { cartaoId: K, fatura: '2026-12', fixaId: 'f1', jaTenho: true });
  const local = marcarJaTenho(b, { cartaoId: K, fatura: '2026-12', fixaId: 'f1', jaTenho: false });
  const remoto = marcarJaTenho(b, { cartaoId: K, fatura: '2027-01', fixaId: 'f1', jaTenho: true });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.cartoes[0].fixas[0].jaTenhoEm, { '2027-01': true });
});

test('salário só no Balanço: cada aparelho guarda o a mais de um mês diferente: os dois ficam', () => {
  const b = baseV3();
  const local = definirSalario(b, { mes: '2026-11', pessoaId: 'p1', salario: 5000, extra: 1000 });
  const remoto = definirSalario(b, { mes: '2026-12', pessoaId: 'p1', salario: 5000, extra: 5000 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.extras, { '2026-11': { p1: 1000 }, '2026-12': { p1: 5000 } });
});

test('conta pessoal criada num aparelho e valor de conta da casa no outro: os dois ficam', () => {
  const b = migrarCasa(base());
  const local = adicionarContaPessoal(b, { nome: 'Empréstimo', donoId: 'p1', mes: '2026-11', valor: 300, novoId: () => 'e1' });
  const remoto = salvarValor(b, { mes: '2026-11', contaId: 'c2', valor: 210 });
  const r = mesclarCasa({ base: b, local, remoto });
  assert.deepEqual(r.contasPessoais.map((c) => c.id), ['e1']);
  assert.deepEqual(mes(r, '2026-11').valores, { c1: 40, c2: 210, e1: 300 });
});
