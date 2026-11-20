import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  impressaoDaChave, acharPerfil, perfilDoAparelho, vincularAparelho, desvincularAparelho, adicionarPerfil,
  renomearPerfil, trocarFoto, perfilVisto, cartoesDoPerfil, veAposentadoria, parteDaCasaNoCartao,
} from '../../js/core/perfis.js';
import { migrarCasa, renomearPessoa } from '../../js/core/casa.js';
import { adicionarCartao, anotarCompra, opcoesPara, nomeDoPara, rotuloDoCartao } from '../../js/core/cartao.js';

// Casa inventada: a Ana (p1) administra; o Leo (p2) tem o cartão c2; a Ana, o c9.
function casaBase() {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c2', nome: 'Cartão', compraPorCompra: true, arquivada: false }],
    meses: [],
    cartoes: [{ id: 'c2', contaId: 'c2', donaId: 'p2', viraNoDia: 3, venceNoDia: 10, fixas: [] }],
    outrasPessoas: [{ id: 'q1', nome: 'Mãe' }],
  });
  casa = adicionarCartao(casa, { donaId: 'p1', viraNoDia: 24, venceNoDia: 1, novoId: () => 'c9' }).casa;
  return casa;
}

test('migração 3 → 4: um perfil por pessoa, a primeira administra; sem aparelhos', () => {
  const casa = casaBase();
  assert.equal(casa.schemaVersion, 4);
  assert.deepEqual(casa.perfis, [{ id: 'p1', nome: 'Ana', admin: true }, { id: 'p2', nome: 'Leo' }]);
  assert.deepEqual(casa.aparelhos, []);
});

test('impressão da chave: 16 caracteres hexadecimais do SHA-256, sempre a mesma, sem a chave', async () => {
  const a = await impressaoDaChave('github_pat_FALSO_123');
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(await impressaoDaChave('github_pat_FALSO_123'), a);
  assert.notEqual(await impressaoDaChave('github_pat_FALSO_124'), a);
  assert.equal(a.includes('FALSO'), false);
});

test('aparelho: ligar a chave a um perfil, achar, trocar a ligação e desligar', () => {
  let casa = vincularAparelho(casaBase(), { impressao: 'aaaa', perfilId: 'p2', hoje: '2026-11-20' });
  assert.deepEqual(casa.aparelhos, [{ id: 'aaaa', perfilId: 'p2', desde: '2026-11-20' }]);
  assert.equal(perfilDoAparelho(casa, 'aaaa').nome, 'Leo');
  assert.equal(perfilDoAparelho(casa, 'bbbb'), null);
  assert.equal(perfilDoAparelho(casa, null), null);
  casa = vincularAparelho(casa, { impressao: 'aaaa', perfilId: 'p1', hoje: '2026-11-21' });
  assert.deepEqual(casa.aparelhos, [{ id: 'aaaa', perfilId: 'p1', desde: '2026-11-21' }]);
  assert.deepEqual(desvincularAparelho(casa, 'aaaa').aparelhos, []);
  // Ligação a perfil que não existe mais: o aparelho volta a perguntar.
  assert.equal(perfilDoAparelho({ ...casa, perfis: [] }, 'aaaa'), null);
});

test('perfil visto: quem administra escolhe qualquer um; os outros, sempre o próprio', () => {
  const casa = vincularAparelho(vincularAparelho(casaBase(), { impressao: 'ana', perfilId: 'p1', hoje: '2026-11-20' }),
    { impressao: 'leo', perfilId: 'p2', hoje: '2026-11-20' });
  assert.deepEqual(perfilVisto({ casa, impressao: 'ana', escolhido: null }), { vinculado: casa.perfis[0], visto: casa.perfis[0], admin: true });
  assert.equal(perfilVisto({ casa, impressao: 'ana', escolhido: 'p2' }).visto.nome, 'Leo');
  assert.equal(perfilVisto({ casa, impressao: 'ana', escolhido: 'sumiu' }).visto.nome, 'Ana');
  assert.deepEqual(perfilVisto({ casa, impressao: 'leo', escolhido: 'p1' }), { vinculado: casa.perfis[1], visto: casa.perfis[1], admin: false });
  assert.deepEqual(perfilVisto({ casa, impressao: 'novo', escolhido: 'p1' }), { vinculado: null, visto: null, admin: false });
});

test('cartões do perfil e aposentadoria só para quem administra (sem perfil: como antes)', () => {
  const casa = casaBase();
  assert.deepEqual(cartoesDoPerfil(casa, 'p2').map((c) => c.id), ['c2']);
  assert.deepEqual(cartoesDoPerfil(casa, 'p1').map((c) => c.id), ['c9']);
  assert.deepEqual(cartoesDoPerfil(casa, 'p3'), []);
  assert.equal(veAposentadoria(casa.perfis[0]), true);
  assert.equal(veAposentadoria(casa.perfis[1]), false);
  assert.equal(veAposentadoria(null), true);
});

test('perfil novo: cartões próprios, fora da divisão; renomear e foto', () => {
  const r = adicionarPerfil(casaBase(), { nome: ' Bia ', novoId: () => 'p3' });
  assert.equal(r.id, 'p3');
  assert.deepEqual(r.casa.perfis.at(-1), { id: 'p3', nome: 'Bia' });
  assert.equal(r.casa.pessoas.length, 2);
  const comCartao = adicionarCartao(r.casa, { donaId: 'p3', viraNoDia: 5, venceNoDia: 12, novoId: () => 'c10' });
  assert.deepEqual(comCartao.casa.contas.at(-1).nome, 'Cartão Bia');
  assert.equal(rotuloDoCartao(comCartao.casa, comCartao.casa.cartoes.at(-1)), 'Bia');
  assert.deepEqual(opcoesPara(comCartao.casa, 'c10').map((o) => o.nome), ['Casa', 'Bia', 'Ana', 'Leo', 'Mãe']);
  assert.equal(nomeDoPara(comCartao.casa, 'p3'), 'Bia');
  assert.equal(renomearPerfil(r.casa, 'p3', ' Beatriz ').perfis.at(-1).nome, 'Beatriz');
  assert.equal(trocarFoto(r.casa, 'p3', 'data:image/jpeg;base64,AAA').perfis.at(-1).foto, 'data:image/jpeg;base64,AAA');
  assert.equal('foto' in trocarFoto(trocarFoto(r.casa, 'p3', 'data:x'), 'p3', null).perfis.at(-1), false);
});

test('renomear: pessoa e perfil com o mesmo id andam juntos', () => {
  assert.equal(renomearPessoa(casaBase(), 'p2', 'Léo').perfis[1].nome, 'Léo');
  const casa = renomearPerfil(casaBase(), 'p2', 'Leonardo');
  assert.equal(casa.pessoas[1].nome, 'Leonardo');
  assert.equal(acharPerfil(casa, 'p2').nome, 'Leonardo');
});

test('parte da casa no cartão de outra pessoa: só as compras da casa e as de todo mês da casa', () => {
  let casa = casaBase();
  const novoId = (() => { let n = 0; return () => `k${++n}`; })();
  for (const [nome, para, todoMes] of [['Mercado', 'casa'], ['Blusa', 'p2'], ['Presente', 'p1'], ['Remédio', 'q1'], ['Streaming', 'casa', true], ['Academia', 'p2', true]]) {
    casa = anotarCompra(casa, { cartaoId: 'c2', data: '2026-11-19', nome, valor: 10, para, todoMes, novoId });
  }
  const r = parteDaCasaNoCartao(casa, 'c2', '2026-12');
  assert.deepEqual(r.compras.map((c) => c.nome), ['Mercado']);
  assert.deepEqual(r.fixas.map((c) => c.nome), ['Streaming']);
  assert.equal(r.total, 20);
});
