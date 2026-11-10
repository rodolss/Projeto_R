import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION, criarEstadoInicial, migrar, novoId } from '../../js/core/esquema.js';
import { CARTEIRA_PADRAO } from '../../js/core/alocacao.js';

test('estado inicial com as premissas padrão', () => {
  const e = criarEstadoInicial({ salario: 7800, mesInicio: '2026-11' });
  assert.equal(e.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(
    [e.config.prazoMeses, e.config.swr, e.config.rentabilidadeReal, e.config.recebe13, e.config.recebeFerias],
    [120, 0.04, 0.05, true, true],
  );
  assert.equal(e.config.mesSalario, '2026-11');
  assert.deepEqual(e.carteiraAlvo, CARTEIRA_PADRAO);
  assert.notEqual(e.carteiraAlvo, CARTEIRA_PADRAO);
  assert.deepEqual(e.contadoresAnuais, {});
});
test('valor já separado para as anuais entra no ciclo atual', () => {
  assert.deepEqual(criarEstadoInicial({ salario: 7800, mesInicio: '2027-02', anuaisJaSeparados: 1500 }).contadoresAnuais, { 2026: 1500 });
});
test('migrar', () => {
  const e = criarEstadoInicial({ salario: 1, mesInicio: '2026-11' });
  assert.equal(migrar(e), e);
  assert.throws(() => migrar({ schemaVersion: 99 }), /versao-desconhecida/);
});
test('novoId gera ids diferentes', () => assert.notEqual(novoId(), novoId()));
