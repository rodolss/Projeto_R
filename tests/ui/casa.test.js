import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoDaTela, mesDaTela } from '../../js/ui/casa.js';

const casa = { schemaVersion: 1, pessoas: [], contas: [], meses: [] };

test('aparelho conectado que ainda não baixou a casa mostra "carregando", nunca o começo', () => {
  assert.equal(estadoDaTela({ casa: null, conectado: true, casaSincronizada: false }), 'carregando');
});
test('sem casa depois de sincronizar, ou sem conexão: tela de começo', () => {
  assert.equal(estadoDaTela({ casa: null, conectado: true, casaSincronizada: true }), 'comecar');
  assert.equal(estadoDaTela({ casa: null, conectado: false, casaSincronizada: true }), 'comecar');
  assert.equal(estadoDaTela({ casa: null, conectado: false, casaSincronizada: false }), 'comecar');
});
test('com casa, mostra o mês', () => {
  assert.equal(estadoDaTela({ casa, conectado: true, casaSincronizada: false }), 'mes');
});
test('o mês da tela vem do hash; inválido ou ausente, é o mês de hoje', () => {
  assert.equal(mesDaTela('#/casa?mes=2026-10', '2026-11-19'), '2026-10');
  assert.equal(mesDaTela('#/casa?mes=2026-13', '2026-11-19'), '2026-11');
  assert.equal(mesDaTela('#/casa?mes=xyz&folha=a', '2026-11-19'), '2026-11');
  assert.equal(mesDaTela('#/casa', '2026-11-19'), '2026-11');
});
