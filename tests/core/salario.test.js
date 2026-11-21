import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salarioRegular, preencherRecebido, levarParaCasa } from '../../js/core/salario.js';
import { rascunhoVazio } from '../../js/core/lista-mes.js';

test('salário de todo mês no que caiu: o próprio valor; com extra (13º, férias, PLR ou bem acima), o do plano', () => {
  assert.equal(salarioRegular({ recebidoEfetivo: 5100, tipoExtra: null, pareceExtra: false, salarioPlano: 5000 }), 5100);
  assert.equal(salarioRegular({ recebidoEfetivo: 10000, tipoExtra: 'decimo-terceiro', pareceExtra: true, salarioPlano: 5000 }), 5000);
  assert.equal(salarioRegular({ recebidoEfetivo: 7000, tipoExtra: null, pareceExtra: true, salarioPlano: 5000 }), 5000); // "extra comum"
  assert.equal(salarioRegular({ recebidoEfetivo: null, tipoExtra: null, pareceExtra: false, salarioPlano: 5000 }), null);
});

test('revisão: no mês depois das férias conta o que caiu mais o adiantamento guardado (o salário cheio), não o que caiu', () => {
  // Caíram 300 (o resto veio adiantado nas férias e ficou guardado: 4700). O efetivo é 5000.
  assert.equal(salarioRegular({ recebidoEfetivo: 300 + 4700, tipoExtra: null, pareceExtra: false, salarioPlano: 5000 }), 5000);
});

test('revisão: o Dia de pagamento abre com o salário confirmado no Mês da casa, mas pede um toque para confirmar', () => {
  const vazio = rascunhoVazio('2026-12');
  const confirmado = { valor: 5100, situacao: 'confirmado' };
  const pre = preencherRecebido({ rascunho: vazio, registrado: false, salarioCasa: confirmado });
  assert.deepEqual([pre.recebido, pre.feito.salario, pre.mes], [5100, false, '2026-12']); // não marca feito: o 13º não some
  assert.equal(preencherRecebido({ rascunho: vazio, registrado: true, salarioCasa: confirmado }), null); // mês já registrado
  assert.equal(preencherRecebido({ rascunho: { ...vazio, recebido: 4900 }, registrado: false, salarioCasa: confirmado }), null); // já digitado
  assert.equal(preencherRecebido({ rascunho: vazio, registrado: false, salarioCasa: { valor: 5000, situacao: 'a-confirmar' } }), null); // previsão
});

test('revisão: o Dia de pagamento só leva o salário para o Mês da casa quando lá ainda é previsão (o digitado na casa manda)', () => {
  assert.equal(levarParaCasa({ salarioCasa: { valor: 5000, situacao: 'a-confirmar' }, regular: 5100 }), true);
  assert.equal(levarParaCasa({ salarioCasa: { valor: 0, situacao: 'vazio' }, regular: 5100 }), true);
  assert.equal(levarParaCasa({ salarioCasa: { valor: 5300, situacao: 'confirmado' }, regular: 5100 }), false);
  assert.equal(levarParaCasa({ salarioCasa: { valor: 5000, situacao: 'a-confirmar' }, regular: null }), false);
});
