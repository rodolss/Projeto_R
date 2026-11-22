import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoDoFim, textoDasParcelas } from '../../js/ui/conta-pessoal.js';

test('o fim da conta pessoal em palavras: todo mês, até quando, ou já terminou', () => {
  assert.equal(textoDoFim({ desde: '2026-12' }, '2026-12'), 'todo mês');
  assert.equal(textoDoFim({ desde: '2026-12', ultimoMes: '2028-05' }, '2026-12'), 'até maio de 2028');
  assert.equal(textoDoFim({ desde: '2026-12', ultimoMes: '2028-05' }, '2028-05'), 'até maio de 2028');
  assert.equal(textoDoFim({ desde: '2026-12', ultimoMes: '2027-02' }, '2027-03'), 'terminou em fevereiro de 2027');
});

test('as parcelas que faltam: a última, ou quantas', () => {
  assert.equal(textoDasParcelas(1), 'última parcela');
  assert.equal(textoDasParcelas(2), 'faltam 2 parcelas');
  assert.equal(textoDasParcelas(18), 'faltam 18 parcelas');
  assert.equal(textoDasParcelas(null), null);
});

test('revisão: depois da última parcela (valor adiantado, fim encurtado) não aparece "faltam -1"', () => {
  assert.equal(textoDasParcelas(0), null);
  assert.equal(textoDasParcelas(-1), null);
});
