import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titulosDoDia, nomeDoTitulo, atualizarCatalogo } from '../../scripts/tesouro.mjs';

// Pedaço inventado do PrecoTaxaTesouroDireto.csv: separador ";", vírgula decimal, datas dd/mm/aaaa, dias misturados.
const CSV = [
  'Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha',
  'Tesouro Selic;01/03/2029;19/11/2026;0,07;0,08;20316,10;20305,65;20305,65',
  'Tesouro IPCA+;15/05/2035;19/11/2026;7,10;7,22;2510,00;2500,95;2500,95',
  'Tesouro IPCA+;15/05/2035;18/11/2026;7,11;7,23;2508,00;2499,00;2499,00',
  'Tesouro Renda+ Aposentadoria Extra;15/12/2049;19/11/2026;7,20;7,32;1980,00;1974,09;1974,09',
  'Tesouro Educa+;15/12/2030;19/11/2026;7,30;7,42;3380,00;3378,62;3378,62',
  'Tesouro Prefixado;01/01/2008;31/12/2004;17,14;17,24;849,02;847,13;895,37',
  '',
].join('\r\n');

test('títulos do último dia: nome, tipo, vencimento, preço de venda (resgate) e taxa', () => {
  const r = titulosDoDia(CSV);
  assert.equal(r.data, '2026-11-19');
  assert.deepEqual(r.titulos.map((t) => t.nome), [
    'Tesouro Educa+ 2026', 'Tesouro IPCA+ 2035', 'Tesouro Renda+ Aposentadoria Extra 2030', 'Tesouro Selic 2029',
  ]);
  assert.deepEqual(r.titulos.find((t) => t.nome === 'Tesouro IPCA+ 2035'), {
    nome: 'Tesouro IPCA+ 2035', tipo: 'Tesouro IPCA+', vencimento: '2035-05-15', preco: 2500.95, taxa: 7.22,
  });
});

test('nomes: ano do vencimento, menos Renda+ (−19) e Educa+ (−4), como o Tesouro chama', () => {
  assert.equal(nomeDoTitulo('Tesouro IPCA+ com Juros Semestrais', '2035-05-15'), 'Tesouro IPCA+ com Juros Semestrais 2035');
  assert.equal(nomeDoTitulo('Tesouro Renda+ Aposentadoria Extra', '2084-12-15'), 'Tesouro Renda+ Aposentadoria Extra 2065');
  assert.equal(nomeDoTitulo('Tesouro Educa+', '2048-12-15'), 'Tesouro Educa+ 2044');
});

test('arquivo vazio ou estranho: erro claro (a tarefa agendada não grava lixo)', () => {
  assert.throws(() => titulosDoDia(''), /tesouro-vazio/);
  assert.throws(() => titulosDoDia('a;b;c\n1;2;3'), /tesouro-formato/);
});

test('atualizar: usa o arquivo oficial quando dá; se o Tesouro recusa (servidor de fora do Brasil), calcula pela ANBIMA', async () => {
  const resposta = (texto, status = 200) => ({ ok: status === 200, status, arrayBuffer: async () => new TextEncoder().encode(texto).buffer });
  const ANB = 'Titulo@Data Referencia@Codigo SELIC@Data Base/Emissao@Data Vencimento@Tx. Compra@Tx. Venda@Tx. Indicativas@PU\r\nLFT@20261119@210100@20000701@20290301@0,05@0,05@0,0536@20310,268931\r\n';
  const catalogo = { data: '2026-11-18', titulos: [{ nome: 'Tesouro Selic 2029', tipo: 'Tesouro Selic', vencimento: '2029-03-01', preco: 20300, taxa: 0.06 }] };
  const oficial = await atualizarCatalogo({ fetch: async () => resposta(CSV), catalogo, hoje: new Date('2026-11-22T12:00:00Z') });
  assert.equal(oficial.fonte, 'tesouro');
  assert.equal(oficial.titulos.length, 4);
  const pedidos = [];
  const fetch = async (url) => {
    pedidos.push(url);
    if (url.includes('tesourotransparente')) throw new Error('fetch failed');
    return url.endsWith('ms261119.txt') ? resposta(ANB) : resposta('', 404);
  };
  const r = await atualizarCatalogo({ fetch, catalogo, hoje: new Date('2026-11-22T12:00:00Z') });
  assert.equal(r.fonte, 'anbima');
  assert.equal(r.data, '2026-11-19');
  assert.equal(r.titulos[0].preco, 20310.27);
  assert.deepEqual(pedidos.slice(1).map((u) => u.slice(-12)), ['ms261122.txt', 'ms261121.txt', 'ms261120.txt', 'ms261119.txt']);
});
