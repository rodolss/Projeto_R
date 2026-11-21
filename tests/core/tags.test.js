import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcoesDeTag, nomeDaEtiqueta, etiquetasUnicas, chaveDaTag } from '../../js/core/tags.js';

test('etiquetas: grafias do mesmo nome viram uma só (a primeira vence)', () => {
  assert.deepEqual(etiquetasUnicas(['Coliseu', 'coliseu', 'Pão  de Queijo', 'pao de queijo', '', '  ']), ['Coliseu', 'Pão de Queijo']);
  assert.equal(chaveDaTag(' Café  da MANHÃ '), 'cafe da manha');
});

test('etiquetas: digitar mostra as que existem e, sem igual, oferece criar', () => {
  const nomes = ['Coliseu', 'Colégio', 'Mercado', 'Farmácia do Coliseu'];
  assert.deepEqual(opcoesDeTag(nomes, ''), { achadas: [], exata: null, nova: null });
  const col = opcoesDeTag(nomes, 'col');
  assert.deepEqual(col.achadas, ['Coliseu', 'Colégio', 'Farmácia do Coliseu']); // começam assim, depois no meio
  assert.equal(col.exata, null);
  assert.equal(col.nova, 'col'); // nenhuma é igual: dá para criar
  const exata = opcoesDeTag(nomes, 'COLISEU');
  assert.equal(exata.exata, 'Coliseu'); // outra grafia: é a mesma etiqueta
  assert.equal(exata.achadas[0], 'Coliseu');
  assert.equal(exata.nova, null); // não oferece criar o que já existe
  assert.equal(opcoesDeTag(nomes, 'netflix').achadas.length, 0);
  assert.equal(opcoesDeTag(nomes, '  netflix  ').nova, 'netflix');
  assert.equal(opcoesDeTag(nomes, 'c', 2).achadas.length, 2); // limite de balões
});

test('etiquetas: o nome que vai para a compra é a grafia da etiqueta que já existe', () => {
  const nomes = ['Coliseu', 'Mercado'];
  assert.equal(nomeDaEtiqueta(nomes, 'coliseu'), 'Coliseu');
  assert.equal(nomeDaEtiqueta(nomes, 'mercado '), 'Mercado');
  assert.equal(nomeDaEtiqueta(nomes, 'Pizzaria  Nova'), 'Pizzaria Nova');
  assert.equal(nomeDaEtiqueta(nomes, '   '), '');
});
