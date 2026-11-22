// Perfis e aparelhos em listas limpas (desenho 2026-11-21-perfis-e-aparelhos-simples).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCasa } from '../../js/core/casa.js';
import { adicionarPerfil, vincularAparelho, entrarNaDivisao, sairDaDivisao, detalheDoPerfil, podeApagarPerfil, apagarPerfil } from '../../js/core/perfis.js';
import { adicionarCartao, anotarCompra } from '../../js/core/cartao.js';
import { adicionarContaPessoal } from '../../js/core/contas-pessoais.js';

const ids = () => { let n = 0; return () => `id${++n}`; };

// Casa inventada: Ana (p1, administra), Leo (p2) e o perfil novo Cris (p3). A Ana tem este aparelho e o computador.
function casaBase() {
  let casa = criarCasa({ nomes: ['Ana', 'Leo'], novoId: ids() });
  casa = adicionarPerfil(casa, { nome: 'Cris', novoId: () => 'p3' }).casa;
  casa = vincularAparelho(casa, { impressao: 'aaaa1111', perfilId: 'p1', hoje: '2026-11-20' });
  casa = vincularAparelho(casa, { impressao: 'bbbb2222', perfilId: 'p1', hoje: '2026-11-20' });
  return vincularAparelho(casa, { impressao: 'cccc3333', perfilId: 'p2', hoje: '2026-11-20' });
}
const perfil = (casa, id) => casa.perfis.find((p) => p.id === id);

test('detalheDoPerfil: quem administra, este aparelho e quantos aparelhos cada um tem', () => {
  const casa = casaBase();
  assert.equal(detalheDoPerfil(casa, perfil(casa, 'p1'), 'aaaa1111'), 'administra · este aparelho e mais 1');
  assert.equal(detalheDoPerfil(casa, perfil(casa, 'p1'), null), 'administra · 2 aparelhos');
  assert.equal(detalheDoPerfil(casa, perfil(casa, 'p2'), 'aaaa1111'), '1 aparelho');
  assert.equal(detalheDoPerfil(casa, perfil(casa, 'p3'), 'aaaa1111'), 'sem aparelho ainda');
});

test('podeApagarPerfil: só o perfil criado por engano (sem cartão, aparelho nem divisão, e que não administra)', () => {
  const casa = casaBase();
  assert.equal(podeApagarPerfil(casa, 'p3'), true);
  assert.equal(podeApagarPerfil(casa, 'p1'), false, 'quem administra');
  assert.equal(podeApagarPerfil(casa, 'p2'), false, 'divide as contas e tem aparelho');
  assert.equal(podeApagarPerfil(vincularAparelho(casa, { impressao: 'dddd4444', perfilId: 'p3', hoje: '2026-11-21' }), 'p3'), false, 'tem aparelho');
  assert.equal(podeApagarPerfil(adicionarCartao(casa, { donaId: 'p3', novoId: () => 'k1' }).casa, 'p3'), false, 'tem cartão');
  const dividiu = sairDaDivisao(entrarNaDivisao(casa, 'p3', '2026-11'), 'p3', '2027-01');
  assert.equal(podeApagarPerfil(dividiu, 'p3'), false, 'dividiu em novembro e dezembro: fica no histórico');
  assert.equal(podeApagarPerfil(casa, 'nao-existe'), false);
});

test('podeApagarPerfil: quem administra nunca sai, mesmo sem aparelho, cartão ou divisão', () => {
  const casa = { ...casaBase(), perfis: [...casaBase().perfis, { id: 'p9', nome: 'Zé', admin: true }] };
  assert.equal(podeApagarPerfil(casa, 'p9'), false);
});

test('podeApagarPerfil: perfil que já recebeu compras no cartão de outra pessoa fica (o nome segue no histórico)', () => {
  const { casa, id: cartaoId } = adicionarCartao(casaBase(), { donaId: 'p1', viraNoDia: 24, venceNoDia: 1 });
  assert.equal(podeApagarPerfil(casa, 'p3'), true, 'antes das compras');
  const avulsa = anotarCompra(casa, { cartaoId, data: '2026-11-10', fatura: '2026-12', nome: 'Tênis', valor: 100, para: 'p3', novoId: () => 'c1' });
  assert.equal(podeApagarPerfil(avulsa, 'p3'), false, 'compra');
  const todoMes = anotarCompra(casa, { cartaoId, fatura: '2026-12', nome: 'Curso', valor: 80, todoMes: true, para: 'p3', novoId: () => 'f1' });
  assert.equal(podeApagarPerfil(todoMes, 'p3'), false, 'de todo mês');
});

test('apagarPerfil tira só o perfil que pode sair; os outros pedidos não mudam a casa', () => {
  const casa = casaBase();
  assert.deepEqual(apagarPerfil(casa, 'p3').perfis.map((p) => p.id), ['p1', 'p2']);
  assert.equal(apagarPerfil(casa, 'p2'), casa);
});

test('podeApagarPerfil: perfil com conta pessoal fica (a conta é dele)', () => {
  const casa = adicionarContaPessoal(casaBase(), { nome: 'Academia', donoId: 'p3', mes: '2026-12', novoId: () => 'a1' });
  assert.equal(podeApagarPerfil(casa, 'p3'), false);
});
