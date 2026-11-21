import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  opcoesDeTag, nomeDaEtiqueta, etiquetasUnicas, chaveDaTag, tagsDoNome, etiquetasDosNomes, trechoAtual, trocarTrechoAtual, ehLigacao,
  juntasDaCasa, adicionarJunta, removerJunta, JUNTAS_DO_APP,
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

test('etiquetas: o trecho que está sendo digitado é a última palavra; o balão a troca', () => {
  assert.deepEqual(trechoAtual('Ração da na'), { antes: 'Ração da ', palavra: 'na' });
  assert.deepEqual(trechoAtual('Ração '), { antes: 'Ração ', palavra: '' }); // terminou em espaço: nova palavra
  assert.deepEqual(trechoAtual(''), { antes: '', palavra: '' });
  assert.equal(trocarTrechoAtual('Ração da na', 'Nami'), 'Ração da Nami ');
  assert.equal(trocarTrechoAtual('ra', 'Ração'), 'Ração ');
});

test('etiquetas: o nome que vai para a compra usa a grafia das etiquetas que já existem', () => {
  const tags = ['Ração', 'Nami', 'Mercado'];
  assert.equal(nomeDaEtiqueta(tags, 'ração da nami'), 'Ração da Nami');
  assert.equal(nomeDaEtiqueta(tags, 'mercado '), 'Mercado');
  assert.equal(nomeDaEtiqueta(tags, 'Pizzaria  Nova'), 'Pizzaria Nova'); // palavra nova fica como digitada
  assert.equal(nomeDaEtiqueta(tags, 'Nami, vacina'), 'Nami, vacina'); // a pontuação fica
  assert.equal(nomeDaEtiqueta(tags, '   '), '');
});

test('expressões: "Pão de Queijo" vale uma etiqueta só; o resto do nome segue por palavra', () => {
  const juntas = juntasDaCasa({});
  assert.ok(juntas.includes('Pão de Queijo') && juntas.length === JUNTAS_DO_APP.length);
  assert.deepEqual(tagsDoNome('Pão de queijo da Nami', juntas), ['Pão de Queijo', 'Nami']);
  assert.deepEqual(tagsDoNome('pao DE queijo', juntas), ['Pão de Queijo']); // sem acento nem maiúscula também vale
  assert.deepEqual(tagsDoNome('Pão de queijo', []), ['Pão', 'queijo']); // sem a lista: por palavra, como antes
  assert.deepEqual(tagsDoNome('Pão de forma e pão de queijo', juntas), ['Pão de Forma', 'Pão de Queijo']);
  assert.deepEqual(tagsDoNome('Pão de', juntas), ['Pão']); // incompleta: não casa
  assert.deepEqual(etiquetasDosNomes(['Pão de queijo'], ['Pão de Queijo']), ['Pão de Queijo']); // sem repetir
  assert.equal(nomeDaEtiqueta([], 'pão de queijo, da nami', juntas), 'Pão de Queijo, da nami'); // grafia da lista, pontuação fica
});

test('expressões: ao digitar, o balão da expressão aparece e troca o trecho inteiro', () => {
  const tags = etiquetasDosNomes([], ['Pão de Queijo', 'Café da Manhã']);
  assert.deepEqual(trechoAtual('comprei pão de q', tags), { antes: 'comprei ', palavra: 'pão de q' });
  assert.deepEqual(trechoAtual('comprei pão', tags), { antes: 'comprei ', palavra: 'pão' });
  assert.deepEqual(trechoAtual('Ração da Nami', tags), { antes: 'Ração da ', palavra: 'Nami' }); // nenhuma expressão: a última palavra
  assert.deepEqual(opcoesDeTag(tags, 'pão de q').achadas, ['Pão de Queijo']);
  assert.equal(opcoesDeTag(tags, 'pão de q').nova, null); // expressão nova não se cria aqui: é pela lista dos Ajustes
  assert.equal(trocarTrechoAtual('comprei pão de q', 'Pão de Queijo', tags), 'comprei Pão de Queijo ');
});

test('expressões da casa: acrescentar, não repetir, tirar; duas palavras ou mais', () => {
  let casa = { meses: [] };
  assert.equal(adicionarJunta(casa, 'Banho'), casa); // uma palavra só já é uma etiqueta
  assert.equal(adicionarJunta(casa, 'pão de queijo'), casa); // já vem com o app
  casa = adicionarJunta(casa, '  Banho   e Tosa ');
  assert.deepEqual(casa.etiquetasJuntas, { 'banho e tosa': 'Banho e Tosa' });
  assert.equal(adicionarJunta(casa, 'banho e tosa'), casa);
  assert.ok(juntasDaCasa(casa).includes('Banho e Tosa'));
  assert.deepEqual(tagsDoNome('banho e tosa da Nami', juntasDaCasa(casa)), ['Banho e Tosa', 'Nami']);
  const sem = removerJunta(casa, 'banho e tosa');
  assert.equal('etiquetasJuntas' in sem, false);
});

test('balões: o meio da palavra só conta a partir de 3 letras ("ra" não acha "Água Mineral")', () => {
  const tags = ['Água Mineral', 'Raquete', 'Suco de Laranja'];
  assert.deepEqual(opcoesDeTag(tags, 'ra').achadas, ['Raquete']);
  assert.deepEqual(opcoesDeTag(tags, 'ran').achadas, ['Suco de Laranja']);
});
