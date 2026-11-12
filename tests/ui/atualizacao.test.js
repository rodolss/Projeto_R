import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarAtualizacao } from '../../js/ui/atualizacao.js';

const focado = { matches: () => true };
function sessaoFalsa(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: (k) => dados.delete(k), dados };
}
const bloqueada = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };

function cenario({ controlador = {}, ativo = null, semRecarregar = false, sessao = sessaoFalsa() } = {}) {
  const sw = new EventTarget();
  sw.controller = controlador;
  const r = { recargas: 0, updates: 0, avisos: [], sw, sessao };
  sw.ready = Promise.resolve({ update: async () => { r.updates += 1; } });
  const documento = new EventTarget();
  documento.activeElement = ativo;
  documento.visibilityState = 'visible';
  documento.querySelector = () => (r.semRecarregar ? {} : null);
  r.semRecarregar = semRecarregar;
  r.documento = documento;
  iniciarAtualizacao({ sw, documento, sessao, recarregar: () => { r.recargas += 1; }, avisar: (t) => r.avisos.push(t) });
  r.novaVersao = () => { sw.controller = {}; sw.dispatchEvent(new Event('controllerchange')); };
  r.voltarAoApp = () => { documento.visibilityState = 'visible'; documento.dispatchEvent(new Event('visibilitychange')); };
  return r;
}
const tique = () => new Promise((ok) => setTimeout(ok, 0));

test('recarrega quando a versão nova assume e nada está sendo editado', () => {
  const r = cenario();
  r.novaVersao();
  assert.equal(r.recargas, 1);
  assert.equal(r.sessao.getItem('projetoR.atualizado'), '1');
});

test('na primeira instalação (sem versão anterior no controle) não recarrega', () => {
  const r = cenario({ controlador: null });
  r.novaVersao();
  assert.equal(r.recargas, 0);
});

test('digitando: espera e recarrega na próxima volta ao app', () => {
  const r = cenario({ ativo: focado });
  r.novaVersao();
  assert.equal(r.recargas, 0);
  r.documento.activeElement = null;
  r.voltarAoApp();
  assert.equal(r.recargas, 1);
});

test('com algo não salvo na tela (data-sem-recarregar) também espera', () => {
  const r = cenario({ semRecarregar: true });
  r.novaVersao();
  assert.equal(r.recargas, 0);
  r.semRecarregar = false;
  r.voltarAoApp();
  assert.equal(r.recargas, 1);
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

test('armazenamento de sessão bloqueado não impede a atualização', () => {
  const r = cenario({ sessao: bloqueada });
  r.novaVersao();
  assert.equal(r.recargas, 1);
  assert.deepEqual(r.avisos, []);
});
