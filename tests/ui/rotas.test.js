import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolverRota, abaDoMenu, visaoUnica, TELAS, folhaAberta, depoisDeSalvar, ehDaCasa, parametroDoHash, podeAtualizarSozinho,
  espacoParaLembrar,
} from '../../js/ui/rotas.js';

test('contas da casa: rotas próprias, que funcionam sem plano de aposentadoria', () => {
  assert.equal(resolverRota('#/casa-ano', false), 'casa-ano');
  assert.equal(resolverRota('#/casa?mes=2026-10', false), 'casa');
  assert.equal(resolverRota('#/casa-ajustes', true), 'casa-ajustes');
  assert.equal(resolverRota('#/inicio', false, 'casa'), 'boas-vindas');
});
test('contas da casa: sem rota, abre no último espaço usado', () => {
  assert.equal(resolverRota('', false, 'casa'), 'casa');
  assert.equal(resolverRota('', true, 'casa'), 'casa');
  assert.equal(resolverRota('#/xyz', true, 'casa'), 'casa');
  assert.equal(resolverRota('', true, 'aposentadoria'), 'inicio');
  assert.equal(resolverRota('', true), 'inicio');
  assert.equal(resolverRota('', false), 'boas-vindas');
});
test('contas da casa: menu, espaço e parâmetros do hash', () => {
  assert.equal(abaDoMenu('casa'), 'casa');
  assert.equal(abaDoMenu('casa-ano'), 'casa-ano');
  assert.equal(abaDoMenu('casa-ajustes'), 'casa-ajustes');
  assert.equal(ehDaCasa('casa-ano'), true);
  assert.equal(ehDaCasa('mes'), false);
  assert.equal(parametroDoHash('#/casa?mes=2026-10&folha=x', 'mes'), '2026-10');
  assert.equal(parametroDoHash('#/casa?mes=2026-10&folha=x', 'folha'), 'x');
  assert.equal(parametroDoHash('#/casa', 'mes'), null);
  assert.equal(folhaAberta('#/casa?mes=2026-10&folha=conta-c1'), 'conta-c1');
});
test('contas da casa: depois de salvar numa folha da casa', () => {
  assert.equal(depoisDeSalvar('#/casa?folha=conta-c1', 'conta-c1', 'casa'), 'fechar');
  assert.equal(depoisDeSalvar('#/casa?mes=2026-10', 'conta-c1', 'casa'), 'redesenhar');
  assert.equal(depoisDeSalvar('#/casa-ano', 'conta-c1', 'casa'), 'nada');
});

test('telas conhecidas', () => {
  assert.deepEqual(TELAS, ['boas-vindas', 'inicio', 'mes', 'simular', 'mais', 'orcamento', 'historico', 'config', 'casa', 'casa-balanco', 'casa-cartao', 'casa-ano', 'casa-ajustes']);
});
test('rotas', () => {
  assert.equal(resolverRota('', true), 'inicio');
  assert.equal(resolverRota('#/painel', true), 'inicio');
  assert.equal(resolverRota('#/xyz', true), 'inicio');
  assert.equal(resolverRota('#/simular', true), 'simular');
  assert.equal(resolverRota('#/mes?x=1', true), 'mes');
  assert.equal(resolverRota('#/mes', false), 'boas-vindas');
  assert.equal(resolverRota('#/boas-vindas', true), 'boas-vindas');
});
test('aba do menu', () => {
  assert.equal(abaDoMenu('config'), 'mais');
  assert.equal(abaDoMenu('orcamento'), 'mais');
  assert.equal(abaDoMenu('historico'), 'mais');
  assert.equal(abaDoMenu('mes'), 'mes');
  assert.equal(abaDoMenu('inicio'), 'inicio');
  assert.equal(abaDoMenu('boas-vindas'), null);
});
test('folha aberta vem do hash; a rota continua sendo a tela', () => {
  assert.equal(folhaAberta('#/mes?folha=salario'), 'salario');
  assert.equal(folhaAberta('#/mes'), null);
  assert.equal(folhaAberta('#/mes?folha='), null);
  assert.equal(folhaAberta(''), null);
  assert.equal(resolverRota('#/mes?folha=investir', true), 'mes');
});

test('revisão: depois de salvar, fecha a folha só se ela ainda está aberta', () => {
  assert.equal(depoisDeSalvar('#/mes?folha=investir', 'investir'), 'fechar');
  assert.equal(depoisDeSalvar('#/mes', 'investir'), 'redesenhar');
  assert.equal(depoisDeSalvar('#/mes?folha=salario', 'investir'), 'redesenhar');
  assert.equal(depoisDeSalvar('#/inicio', 'investir'), 'nada');
});

test('revisão: dados de outro aparelho só redesenham sem campo em foco e sem folha aberta', () => {
  assert.equal(podeAtualizarSozinho('#/casa?mes=2026-11', false), true);
  assert.equal(podeAtualizarSozinho('#/casa?mes=2026-11&folha=cartao-c4', false), false);
  assert.equal(podeAtualizarSozinho('#/casa', true), false);
});

test('cartão: rota da casa, com menu próprio, que funciona sem plano de aposentadoria', () => {
  assert.equal(resolverRota('#/casa-cartao?fatura=2026-12', false), 'casa-cartao');
  assert.equal(abaDoMenu('casa-cartao'), 'casa-cartao');
  assert.equal(ehDaCasa('casa-cartao'), true);
});

test('cartão: o app abre na última tela usada entre Mês e Cartão', () => {
  assert.equal(resolverRota('', false, 'casa-cartao'), 'casa-cartao');
  assert.equal(resolverRota('#/xyz', true, 'casa-cartao'), 'casa-cartao');
  assert.equal(resolverRota('', true, 'casa'), 'casa');
  assert.equal(espacoParaLembrar('casa-cartao', 'casa'), 'casa-cartao');
  assert.equal(espacoParaLembrar('casa', 'casa-cartao'), 'casa');
  assert.equal(espacoParaLembrar('casa-ano', 'casa-cartao'), 'casa-cartao');
  assert.equal(espacoParaLembrar('casa-ajustes', 'aposentadoria'), 'casa');
  assert.equal(espacoParaLembrar('casa-ano', null), 'casa');
  assert.equal(espacoParaLembrar('inicio', 'casa-cartao'), 'aposentadoria');
});

test('balanço do mês: rota da casa, com o próprio botão no menu (desenho 2026-11-20-balanco-do-mes)', () => {
  assert.equal(resolverRota('#/casa-balanco', false), 'casa-balanco');
  assert.equal(resolverRota('#/casa-balanco?mes=2026-12&pessoa=p2', true), 'casa-balanco');
  assert.equal(abaDoMenu('casa-balanco'), 'casa-balanco');
  assert.equal(ehDaCasa('casa-balanco'), true);
});

test('balanço: também é lembrado como a tela de abertura da casa', () => {
  assert.equal(resolverRota('', true, 'casa-balanco'), 'casa-balanco');
  assert.equal(resolverRota('#/xyz', false, 'casa-balanco'), 'casa-balanco');
  assert.equal(espacoParaLembrar('casa-balanco', 'casa'), 'casa-balanco');
  assert.equal(espacoParaLembrar('casa-ano', 'casa-balanco'), 'casa-balanco');
});

// ---------- visão única (desenho 2026-11-20-visao-unica) ----------
test('visão única: só para quem administra, vendo o próprio perfil, com o planejador', () => {
  const ana = { id: 'p1', nome: 'Ana', admin: true };
  const leo = { id: 'p2', nome: 'Leo' };
  assert.equal(visaoUnica({ visto: ana, temEstado: true }), true);
  assert.equal(visaoUnica({ visto: ana, temEstado: false }), false); // sem planejador
  assert.equal(visaoUnica({ visto: leo, temEstado: true }), false); // a outra pessoa (ou a Ana vendo o perfil dela)
  assert.equal(visaoUnica({ visto: null, temEstado: true }), false); // aparelho sem perfil: como antes
});

test('visão única: cada tela acende uma das 5 abas; fora dela, como antes', () => {
  const unica = (rota) => abaDoMenu(rota, true);
  assert.deepEqual(['casa-balanco', 'casa', 'casa-cartao'].map(unica), ['casa-balanco', 'casa', 'casa-cartao']);
  assert.deepEqual(['inicio', 'mes'].map(unica), ['inicio', 'inicio']); // o lembrete abre #/mes: acende o Plano
  assert.deepEqual(['simular', 'mais', 'orcamento', 'historico', 'config', 'casa-ano', 'casa-ajustes'].map(unica), Array(7).fill('mais'));
  assert.equal(abaDoMenu('casa-ano'), 'casa-ano');
  assert.equal(abaDoMenu('simular'), 'simular');
  assert.equal(abaDoMenu('config'), 'mais');
});
