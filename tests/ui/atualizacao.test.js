import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarAtualizacao } from '../../js/ui/atualizacao.js';

const focado = { matches: () => true };
function sessaoFalsa(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: (k) => dados.delete(k), dados };
}
const bloqueada = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
// Service worker que responde a versão dele (ou não responde, como a v3 antiga).
const controladorDa = (versao) => ({
  postMessage: (msg, [porta]) => { if (versao && msg?.tipo === 'versao') porta.postMessage({ versao }); },
});

function cenario({ controlador = controladorDa('v1'), ativo = null, semRecarregar = false, sessao = sessaoFalsa(), hash = '#/inicio' } = {}) {
  const sw = new EventTarget();
  sw.controller = controlador;
  const r = { recargas: 0, updates: 0, avisos: [], sw, sessao, semRecarregar };
  sw.ready = Promise.resolve({ update: async () => { r.updates += 1; } });
  const documento = new EventTarget();
  documento.activeElement = ativo;
  documento.visibilityState = 'visible';
  documento.querySelector = () => (r.semRecarregar ? {} : null);
  const janela = new EventTarget();
  const local = { hash };
  Object.assign(r, { documento, janela, local });
  iniciarAtualizacao({
    sw, versao: 'v1', documento, janela, local, sessao, esperaMs: 20,
    recarregar: () => { r.recargas += 1; }, avisar: (t) => r.avisos.push(t),
  });
  r.novaVersao = async (versao = 'v2') => { sw.controller = controladorDa(versao); sw.dispatchEvent(new Event('controllerchange')); await tique(30); };
  r.voltarAoApp = () => { documento.visibilityState = 'visible'; documento.dispatchEvent(new Event('visibilitychange')); };
  r.irPara = (novo) => { local.hash = novo; janela.dispatchEvent(new Event('hashchange')); };
  return r;
}
const tique = (ms = 0) => new Promise((ok) => setTimeout(ok, ms));

test('recarrega quando a versão nova assume e nada está sendo editado', async () => {
  const r = cenario();
  await r.novaVersao();
  assert.equal(r.recargas, 1);
  assert.equal(r.sessao.getItem('projetoR.atualizado'), '1');
});

test('na primeira instalação (sem versão anterior no controle) não recarrega', async () => {
  const r = cenario({ controlador: null });
  await r.novaVersao();
  assert.equal(r.recargas, 0);
});

test('revisão: se a página já é da versão nova, não recarrega nem avisa', async () => {
  const r = cenario();
  await r.novaVersao('v1');
  assert.equal(r.recargas, 0);
  assert.equal(r.sessao.getItem('projetoR.atualizado'), null);
});

test('service worker que não responde a versão (antigo): recarrega por garantia', async () => {
  const r = cenario();
  await r.novaVersao(null);
  assert.equal(r.recargas, 1);
});

test('digitando: espera e recarrega na próxima volta ao app', async () => {
  const r = cenario({ ativo: focado });
  await r.novaVersao();
  assert.equal(r.recargas, 0);
  r.documento.activeElement = null;
  r.voltarAoApp();
  assert.equal(r.recargas, 1);
});

test('com algo não salvo na tela (data-sem-recarregar) também espera', async () => {
  const r = cenario({ semRecarregar: true });
  await r.novaVersao();
  assert.equal(r.recargas, 0);
  r.semRecarregar = false;
  r.voltarAoApp();
  assert.equal(r.recargas, 1);
});

test('revisão: em telas com edições só na memória (Orçamento, Ajustes, Histórico) espera uma tela segura', async () => {
  for (const tela of ['#/orcamento', '#/config', '#/historico', '#/boas-vindas']) {
    const r = cenario({ hash: tela });
    await r.novaVersao();
    r.voltarAoApp();
    assert.equal(r.recargas, 0, tela);
    r.irPara('#/inicio');
    assert.equal(r.recargas, 1, tela);
  }
});

test('ao voltar ao app procura versão nova; ao sair, não', async () => {
  const r = cenario();
  r.voltarAoApp();
  await tique();
  assert.equal(r.updates, 1);
  r.documento.visibilityState = 'hidden';
  r.documento.dispatchEvent(new Event('visibilitychange'));
  await tique();
  assert.equal(r.updates, 1);
  assert.equal(r.recargas, 0);
});

test('depois de recarregar avisa uma vez', () => {
  const sessao = sessaoFalsa({ 'projetoR.atualizado': '1' });
  const r = cenario({ sessao });
  assert.deepEqual(r.avisos, ['App atualizado.']);
  assert.equal(sessao.getItem('projetoR.atualizado'), null);
});

test('armazenamento de sessão bloqueado não impede a atualização', async () => {
  const r = cenario({ sessao: bloqueada });
  await r.novaVersao();
  assert.equal(r.recargas, 1);
  assert.deepEqual(r.avisos, []);
});
