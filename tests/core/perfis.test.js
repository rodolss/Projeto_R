import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  impressaoDaChave, acharPerfil, perfilDoAparelho, vincularAparelho, desvincularAparelho, adicionarPerfil,
  renomearPerfil, trocarFoto, perfilVisto, cartoesDoPerfil, veAposentadoria, parteDaCasaNoCartao,
  perfilDoMomento, perfisParaEscolher, levarLigacao, cartoesVisiveis, donoDeOutroCartao, aoTocarConta, desvioDaTela,
  pedirAparelho, perfisEscondidos, aparelhoPediu,
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

const ligada = () => vincularAparelho(vincularAparelho(casaBase(), { impressao: 'ana', perfilId: 'p1', hoje: '2026-11-20' }),
  { impressao: 'leo', perfilId: 'p2', hoje: '2026-11-20' });

test('revisão: perfil do momento — com chave, pela impressão; sem chave, fica no perfil que o aparelho já tinha (fecha, não abre)', () => {
  const casa = ligada();
  const leo = perfilDoMomento({ casa, conectado: true, impressao: 'leo', salvo: null, escolhido: null });
  assert.deepEqual([leo.visto.id, leo.admin, leo.precisaEscolher], ['p2', false, false]);
  // A chave foi tirada (troca que falhou): continua no Leo, sem ver nada da Ana.
  const semChave = perfilDoMomento({ casa, conectado: false, impressao: null, salvo: { id: 'p2', nome: 'Leo' }, escolhido: 'p1' });
  assert.deepEqual([semChave.visto.id, semChave.admin, semChave.precisaEscolher], ['p2', false, false]);
  // Casa ainda carregando: também fica fechado.
  const carregando = perfilDoMomento({ casa: null, conectado: true, impressao: 'leo', salvo: { id: 'p2', nome: 'Leo' }, escolhido: null });
  assert.equal(carregando.visto.id, 'p2');
  assert.equal(veAposentadoria(carregando.visto), false);
  // Quem administra, sem chave, continua podendo trocar.
  assert.equal(perfilDoMomento({ casa, conectado: false, impressao: null, salvo: { id: 'p1', nome: 'Ana', admin: true }, escolhido: 'p2' }).visto.id, 'p2');
  // Aparelho que nunca teve perfil e sem conexão: como antes (sem perfis).
  assert.equal(perfilDoMomento({ casa, conectado: false, impressao: null, salvo: null, escolhido: null }).visto, null);
  // Chave nova: pergunta.
  assert.equal(perfilDoMomento({ casa, conectado: true, impressao: 'nova', salvo: null, escolhido: null }).precisaEscolher, true);
  // Sem impressão (navegador sem criptografia): não pergunta (não daria para ligar).
  assert.equal(perfilDoMomento({ casa, conectado: true, impressao: null, salvo: null, escolhido: null }).precisaEscolher, false);
});

test('revisão: "Quem usa este celular?" não oferece quem administra se ela já tem aparelho', () => {
  assert.deepEqual(perfisParaEscolher(casaBase()).map((p) => p.id), ['p1', 'p2']);
  assert.deepEqual(perfisParaEscolher(ligada()).map((p) => p.id), ['p2']);
});

test('revisão: chave trocada leva a ligação da antiga (ou do perfil guardado) para a nova', () => {
  const casa = levarLigacao(ligada(), { antiga: 'leo', nova: 'leo2', salvoId: null, hoje: '2026-11-21' });
  assert.deepEqual(casa.aparelhos.map((a) => [a.id, a.perfilId]), [['ana', 'p1'], ['leo2', 'p2']]);
  const doGuardado = levarLigacao(ligada(), { antiga: null, nova: 'leo3', salvoId: 'p2', hoje: '2026-11-21' });
  assert.deepEqual(doGuardado.aparelhos.map((a) => [a.id, a.perfilId]), [['ana', 'p1'], ['leo', 'p2'], ['leo3', 'p2']]);
  const jaLigada = ligada();
  assert.equal(levarLigacao(jaLigada, { antiga: 'leo', nova: 'ana', salvoId: null, hoje: 'x' }), jaLigada);
  assert.equal(levarLigacao(jaLigada, { antiga: null, nova: 'nova', salvoId: null, hoje: 'x' }), jaLigada);
});

test('revisão: o que cada perfil vê dos cartões e das contas ligadas a eles', () => {
  const casa = casaBase();
  const [ana, leo] = casa.perfis;
  assert.deepEqual(cartoesVisiveis(casa, leo).map((c) => c.id), ['c2']);
  assert.deepEqual(cartoesVisiveis(casa, null).map((c) => c.id), ['c2', 'c9']);
  assert.equal(donoDeOutroCartao(casa, 'c9', leo).nome, 'Ana');
  assert.equal(donoDeOutroCartao(casa, 'c2', leo), null);
  assert.equal(donoDeOutroCartao(casa, 'c9', null), null);
  assert.equal(aoTocarConta(casa, 'c9', leo), 'parte');
  assert.equal(aoTocarConta(casa, 'c2', leo), 'cartao');
  assert.equal(aoTocarConta(casa, 'c9', null), 'cartao');
  assert.equal(aoTocarConta(casa, 'c9', ana), 'cartao');
  assert.equal(aoTocarConta(casa, 'outra', leo), 'folha');
});

test('revisão: antes de desenhar uma tela — primeiro quem usa, depois o planejador só para quem administra', () => {
  const [ana, leo] = casaBase().perfis;
  assert.equal(desvioDaTela({ daCasa: false, perfil: { visto: null, precisaEscolher: true } }), 'escolher');
  assert.equal(desvioDaTela({ daCasa: true, perfil: { visto: null, precisaEscolher: true } }), 'escolher');
  assert.equal(desvioDaTela({ daCasa: false, perfil: { visto: leo, precisaEscolher: false } }), 'casa');
  assert.equal(desvioDaTela({ daCasa: false, perfil: { visto: ana, precisaEscolher: false } }), null);
  assert.equal(desvioDaTela({ daCasa: true, perfil: { visto: leo, precisaEscolher: false } }), null);
  assert.equal(desvioDaTela({ daCasa: false, perfil: { visto: null, precisaEscolher: false } }), null);
});

test('revisão: aparelho novo de quem administra pede para ser liberado (fica esperando, sem perfil)', () => {
  const casa = pedirAparelho(ligada(), { impressao: 'pc', hoje: '2026-11-21' });
  assert.deepEqual(casa.aparelhos.at(-1), { id: 'pc', perfilId: null, desde: '2026-11-21' });
  assert.equal(perfilDoAparelho(casa, 'pc'), null);
  assert.equal(perfilDoMomento({ casa, conectado: true, impressao: 'pc', salvo: null, escolhido: null }).precisaEscolher, true);
  assert.deepEqual(perfisParaEscolher(casa).map((p) => p.id), ['p2']);
  assert.deepEqual(perfisEscondidos(casa).map((p) => p.nome), ['Ana']);
  assert.equal(aparelhoPediu(casa, 'pc'), true);
  assert.equal(aparelhoPediu(casa, 'leo'), false);
  // Quem administra libera pelos Ajustes: vira uma ligação normal.
  assert.equal(perfilDoAparelho(vincularAparelho(casa, { impressao: 'pc', perfilId: 'p1', hoje: '2026-11-21' }), 'pc').nome, 'Ana');
});
