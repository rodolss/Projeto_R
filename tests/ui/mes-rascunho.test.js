import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerRascunho, salvarRascunho, apagarRascunho } from '../../js/ui/mes-rascunho.js';
import { rascunhoVazio } from '../../js/core/lista-mes.js';

function armazenamentoFalso() {
  const dados = new Map();
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
    dados,
  };
}
const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };

test('salva e lê de volta o rascunho do mês', () => {
  const a = armazenamentoFalso();
  const r = { ...rascunhoVazio('2026-11'), recebido: 9200, feito: { salario: true, proventos: false } };
  salvarRascunho(r, a);
  assert.ok(a.dados.has('projetoR.rascunhoMes'));
  assert.deepEqual(lerRascunho('2026-11', a), r);
});

test('rascunho de outro mês é ignorado', () => {
  const a = armazenamentoFalso();
  salvarRascunho(rascunhoVazio('2026-10'), a);
  assert.equal(lerRascunho('2026-11', a), null);
});

test('apagar tira o rascunho', () => {
  const a = armazenamentoFalso();
  salvarRascunho(rascunhoVazio('2026-11'), a);
  apagarRascunho(a);
  assert.equal(lerRascunho('2026-11', a), null);
});

test('armazenamento bloqueado não quebra nada', () => {
  assert.equal(lerRascunho('2026-11', quebrado), null);
  assert.doesNotThrow(() => salvarRascunho(rascunhoVazio('2026-11'), quebrado));
  assert.doesNotThrow(() => apagarRascunho(quebrado));
});
