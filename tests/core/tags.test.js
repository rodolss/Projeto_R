import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  opcoesDeTag, nomeDaEtiqueta, etiquetasUnicas, chaveDaTag, tagsDoNome, etiquetasDosNomes, palavraAtual, trocarPalavraAtual, ehLigacao,
} from '../../js/core/tags.js';

test('etiquetas: grafias do mesmo nome viram uma só (a primeira vence)', () => {
  assert.deepEqual(etiquetasUnicas(['Coliseu', 'coliseu', 'Pão  de Queijo', 'pao de queijo', '', '  ']), ['Coliseu', 'Pão de Queijo']);
  assert.equal(chaveDaTag(' Café  da MANHÃ '), 'cafe da manha');
});

test('etiquetas: palavra composta vira uma etiqueta por palavra, sem as de ligação', () => {
  assert.deepEqual(tagsDoNome('Ração da Nami'), ['Ração', 'Nami']);
  assert.deepEqual(tagsDoNome('Pão de queijo e café'), ['Pão', 'queijo', 'café']);
  assert.deepEqual(tagsDoNome('  Coliseu  '), ['Coliseu']);
  assert.deepEqual(tagsDoNome('Nami, ração da nami'), ['Nami', 'ração']); // repetida (outra grafia) conta uma vez
  assert.deepEqual(tagsDoNome('Coca-Cola 2,5L'), ['Coca-Cola', '2,5L']); // o meio da palavra não é cortado
  assert.deepEqual(tagsDoNome('de da do'), []);
  assert.deepEqual(tagsDoNome(''), []);
  assert.equal(ehLigacao('DA'), true);
  assert.equal(ehLigacao('Nami'), false);
  assert.deepEqual(etiquetasDosNomes(['Ração da Nami', 'Vacina da nami', 'Coliseu']), ['Ração', 'Nami', 'Vacina', 'Coliseu']);
});

test('etiquetas: digitar mostra as que existem e, sem igual, oferece criar', () => {
  const tags = ['Coliseu', 'Colégio', 'Mercado', 'Farmácia'];
  assert.deepEqual(opcoesDeTag(tags, ''), { achadas: [], exata: null, nova: null });
  const col = opcoesDeTag(tags, 'col');
  assert.deepEqual(col.achadas, ['Coliseu', 'Colégio']);
  assert.equal(col.exata, null);
  assert.equal(col.nova, 'col');
  const exata = opcoesDeTag(tags, 'COLISEU');
  assert.equal(exata.exata, 'Coliseu'); // outra grafia: é a mesma etiqueta
  assert.equal(exata.nova, null);
  assert.equal(opcoesDeTag(tags, '  netflix  ').nova, 'netflix');
  assert.deepEqual(opcoesDeTag(tags, 'da'), { achadas: [], exata: null, nova: null }); // ligação não vira etiqueta
  assert.deepEqual(opcoesDeTag([...tags, 'Nami'], 'na'), { achadas: ['Nami'], exata: null, nova: null }); // mas "na" ainda acha "Nami"
  assert.equal(opcoesDeTag(tags, 'c', 2).achadas.length, 2);
});

test('etiquetas: a palavra que está sendo digitada é a última; o balão a troca', () => {
  assert.deepEqual(palavraAtual('Ração da na'), { antes: 'Ração da ', palavra: 'na' });
  assert.deepEqual(palavraAtual('Ração '), { antes: 'Ração ', palavra: '' }); // terminou em espaço: nova palavra
  assert.deepEqual(palavraAtual(''), { antes: '', palavra: '' });
  assert.equal(trocarPalavraAtual('Ração da na', 'Nami'), 'Ração da Nami ');
  assert.equal(trocarPalavraAtual('ra', 'Ração'), 'Ração ');
});

test('etiquetas: o nome que vai para a compra usa a grafia das etiquetas que já existem', () => {
  const tags = ['Ração', 'Nami', 'Mercado'];
  assert.equal(nomeDaEtiqueta(tags, 'ração da nami'), 'Ração da Nami');
  assert.equal(nomeDaEtiqueta(tags, 'mercado '), 'Mercado');
  assert.equal(nomeDaEtiqueta(tags, 'Pizzaria  Nova'), 'Pizzaria Nova'); // palavra nova fica como digitada
  assert.equal(nomeDaEtiqueta(tags, 'Nami, vacina'), 'Nami, vacina'); // a pontuação fica
  assert.equal(nomeDaEtiqueta(tags, '   '), '');
});
