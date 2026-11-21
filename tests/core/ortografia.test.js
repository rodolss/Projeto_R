import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corrigirPalavra } from '../../js/core/ortografia.js';
import { tagsDoNome, nomeDaEtiqueta, opcoesDeTag } from '../../js/core/tags.js';

test('ortografia: o que o app conhece ganha o acento, mantendo o jeito de escrever', () => {
  assert.equal(corrigirPalavra('aviao'), 'avião');
  assert.equal(corrigirPalavra('Aviao'), 'Avião');
  assert.equal(corrigirPalavra('AVIAO'), 'AVIÃO');
  assert.equal(corrigirPalavra('cafe'), 'café');
  assert.equal(corrigirPalavra('agua'), 'água');
  assert.equal(corrigirPalavra('farmacia'), 'farmácia');
  assert.equal(corrigirPalavra('onibus'), 'ônibus');
  assert.equal(corrigirPalavra('sabao'), 'sabão');
});

test('ortografia: terminações -ão, -ões, -ães, -ção, -ções por regra', () => {
  assert.equal(corrigirPalavra('macarrao'), 'macarrão');
  assert.equal(corrigirPalavra('limoes'), 'limões');
  assert.equal(corrigirPalavra('paes'), 'pães');
  assert.equal(corrigirPalavra('alimentacao'), 'alimentação');
  assert.equal(corrigirPalavra('acao'), 'ação');
  assert.equal(corrigirPalavra('doacoes'), 'doações');
  assert.equal(corrigirPalavra('Joao'), 'João');
});

test('ortografia: o que já tem acento, é ambíguo ou não se conhece, fica como está', () => {
  assert.equal(corrigirPalavra('avião'), 'avião');
  assert.equal(corrigirPalavra('para'), 'para'); // existe com e sem acento
  assert.equal(corrigirPalavra('pais'), 'pais');
  assert.equal(corrigirPalavra('maca'), 'maca');
  assert.equal(corrigirPalavra('Nami'), 'Nami');
  assert.equal(corrigirPalavra('Netflix'), 'Netflix');
  assert.equal(corrigirPalavra('ao'), 'ao');
  assert.equal(corrigirPalavra('cao'), 'cao');
  assert.equal(corrigirPalavra('3,5L'), '3,5L');
  assert.equal(corrigirPalavra('Coca-Cola'), 'Coca-Cola');
  assert.equal(corrigirPalavra('cafe-expresso'), 'café-expresso'); // cada parte
  assert.equal(corrigirPalavra(''), '');
});

test('ortografia nas etiquetas: o nome sai corrigido e a etiqueta também', () => {
  assert.equal(nomeDaEtiqueta([], 'passagem de aviao'), 'passagem de avião');
  assert.equal(nomeDaEtiqueta([], 'Ração da Nami, aviao'), 'Ração da Nami, avião');
  assert.deepEqual(tagsDoNome('Passagem aviao'), ['Passagem', 'avião']);
  assert.deepEqual(tagsDoNome('aviao Avião'), ['avião']); // as duas grafias viram uma
  assert.equal(nomeDaEtiqueta(['aviao'], 'aviao'), 'avião'); // etiqueta antiga sem acento também é corrigida
  assert.equal(nomeDaEtiqueta(['Avião'], 'aviao'), 'Avião'); // a que já existe manda
  assert.equal(opcoesDeTag([], 'aviao').nova, 'avião'); // o balão de criar já mostra certo
});
