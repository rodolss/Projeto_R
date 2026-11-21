import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salarioRegular, preencherRecebido, configComSalario } from '../../js/core/salario.js';
import { rascunhoVazio } from '../../js/core/lista-mes.js';

test('salário de todo mês no que caiu: o próprio valor; com extra (13º, férias, PLR ou bem acima), o do plano', () => {
  assert.equal(salarioRegular({ recebido: 5100, tipoExtra: null, pareceExtra: false, salarioPlano: 5000 }), 5100);
  assert.equal(salarioRegular({ recebido: 10000, tipoExtra: 'decimo-terceiro', pareceExtra: true, salarioPlano: 5000 }), 5000);
  assert.equal(salarioRegular({ recebido: 7000, tipoExtra: null, pareceExtra: true, salarioPlano: 5000 }), 5000); // "extra comum"
  assert.equal(salarioRegular({ recebido: null, tipoExtra: null, pareceExtra: false, salarioPlano: 5000 }), null);
});

test('Dia de pagamento começa com o salário já confirmado no Mês da casa (se ainda não foi digitado)', () => {
  const vazio = rascunhoVazio('2026-12');
  const confirmado = { valor: 5100, situacao: 'confirmado' };
  const pre = preencherRecebido({ rascunho: vazio, registrado: false, salarioCasa: confirmado });
  assert.deepEqual([pre.recebido, pre.feito.salario, pre.feito.proventos, pre.mes], [5100, true, false, '2026-12']);
  assert.equal(preencherRecebido({ rascunho: vazio, registrado: true, salarioCasa: confirmado }), null); // mês já registrado
  assert.equal(preencherRecebido({ rascunho: { ...vazio, recebido: 4900 }, registrado: false, salarioCasa: confirmado }), null); // já digitado
  assert.equal(preencherRecebido({ rascunho: vazio, registrado: false, salarioCasa: { valor: 5000, situacao: 'a-confirmar' } }), null); // previsão
});

test('salário do plano: muda só se for diferente, a partir do mês', () => {
  const config = { salario: 5000, mesSalario: '2026-11', swr: 0.04 };
  assert.equal(configComSalario(config, 5000, '2026-12'), config);
  assert.equal(configComSalario(config, null, '2026-12'), config);
  assert.deepEqual(configComSalario(config, 5200, '2026-12'), { salario: 5200, mesSalario: '2026-12', swr: 0.04 });
});
