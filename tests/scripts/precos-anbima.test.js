import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerAnbima, diasUteis, precosPelaAnbima } from '../../scripts/precos-anbima.mjs';
import { perto } from '../ajuda.js';

// Linhas reais do arquivo público de 19/11/2026 da ANBIMA (preços indicativos de títulos públicos; nada pessoal).
const ANBIMA = [
  'ANBIMA - Associacao Brasileira das Entidades dos Mercados Financeiro e de Capitais',
  '',
  'Titulo@Data Referencia@Codigo SELIC@Data Base/Emissao@Data Vencimento@Tx. Compra@Tx. Venda@Tx. Indicativas@PU@Desvio padrao',
  'LTN@20261119@100000@20250110@20270401@13,9279@13,886@13,9123@955,038091@0,01',
  'LTN@20261119@100000@20240105@20280101@14,8131@14,7919@14,8015@857,810972@0,01',
  'NTN-C@20261119@770100@20000701@20310101@7,8463@7,5177@7,7089@8102,267355@0,01',
  'LFT@20261119@210100@20000701@20290301@0,0544@0,0502@0,0536@20310,268931@0,01',
  'NTN-B@20261119@760199@20000715@20270515@3,7317@3,6992@3,72@4832,122914@0,01',
  'NTN-B@20261119@760199@20000715@20280815@7,4428@7,4175@7,43@4746,866731@0,01',
  'NTN-B@20261119@760199@20000715@20290515@7,5762@7,5465@7,5643@4627,521448@0,01',
  'NTN-B@20261119@760199@20000715@20300815@7,7857@7,7569@7,774@4597,740047@0,01',
  'NTN-B@20261119@760199@20000715@20310515@7,813@7,7796@7,8001@4482,282201@0,01',
  'NTN-B@20261119@760199@20000715@20320815@7,9272@7,8871@7,9112@4457,223989@0,01',
  'NTN-B@20261119@760199@20000715@20330515@7,9445@7,8968@7,9315@4343,996405@0,01',
  'NTN-B@20261119@760199@20000715@20350515@7,98@7,9448@7,966@4239,718523@0,01',
  'NTN-B@20261119@760199@20000715@20370515@7,8668@7,8287@7,847@4190,542917@0,01',
  'NTN-B@20261119@760199@20000715@20400815@7,6939@7,6666@7,68@4209,153905@0,01',
  'NTN-B@20261119@760199@20000715@20450515@7,6752@7,644@7,6571@4042,05618@0,01',
  'NTN-B@20261119@760199@20000715@20500815@7,6679@7,6362@7,6526@4031,253498@0,01',
  'NTN-B@20261119@760199@20000715@20550515@7,6463@7,6159@7,6316@3920,466307@0,01',
  'NTN-B@20261119@760199@20000715@20600815@7,6486@7,6192@7,6336@3949,368974@0,01',
  'NTN-F@20261119@950199@20160115@20270101@13,7004@13,6493@13,6728@1033,454645@0,01',
  '',
].join('\r\n');

// O catálogo de nomes vem do arquivo do Tesouro já publicado; os preços oficiais de 19/11/2026 servem de gabarito.
const t = (nome, tipo, vencimento, preco) => ({ nome, tipo, vencimento, preco, taxa: 0 });
const CATALOGO = {
  data: '2026-11-18',
  titulos: [
    t('Tesouro Selic 2029', 'Tesouro Selic', '2029-03-01', 20305.65),
    t('Tesouro Selic 2031', 'Tesouro Selic', '2031-03-01', 20232.91),
    t('Tesouro Prefixado 2027', 'Tesouro Prefixado', '2027-01-01', 985.35),
    t('Tesouro Prefixado com Juros Semestrais 2027', 'Tesouro Prefixado com Juros Semestrais', '2027-01-01', 1033.39),
    t('Tesouro IPCA+ 2035', 'Tesouro IPCA+', '2035-05-15', 2500.95),
    t('Tesouro IPCA+ 2050', 'Tesouro IPCA+', '2050-08-15', 833.74),
    t('Tesouro IPCA+ com Juros Semestrais 2035', 'Tesouro IPCA+ com Juros Semestrais', '2035-05-15', 4248.81),
    t('Tesouro Renda+ Aposentadoria Extra 2030', 'Tesouro Renda+ Aposentadoria Extra', '2049-12-15', 1974.09),
    t('Tesouro Educa+ 2026', 'Tesouro Educa+', '2030-12-15', 3378.62),
    t('Tesouro IGPM+ com Juros Semestrais 2031', 'Tesouro IGPM+ com Juros Semestrais', '2031-01-01', 8089.65),
    t('Tesouro Inventado 2040', 'Tesouro Inventado', '2040-01-01', 123.45),
  ],
};

test('ANBIMA: lê data, tipo, vencimento, taxa indicativa e preço; arquivo estranho dá erro', () => {
  const a = lerAnbima(ANBIMA);
  assert.equal(a.data, '2026-11-19');
  assert.deepEqual(a.titulos.find((x) => x.tipo === 'LFT'), { tipo: 'LFT', vencimento: '2029-03-01', taxa: 0.000536, pu: 20310.268931 });
  assert.equal(a.titulos.filter((x) => x.tipo === 'NTN-B').length, 14);
  assert.throws(() => lerAnbima('nada aqui'), /anbima-formato/);
});

test('dias úteis: sem fins de semana e feriados nacionais (Consciência Negra, Carnaval, Sexta Santa, Corpus Christi)', () => {
  assert.equal(diasUteis('2026-11-19', '2026-11-24'), 2); // 19 e 23 (20 é feriado; 21 e 22, fim de semana)
  assert.equal(diasUteis('2027-02-05', '2027-02-11'), 2); // 05 e 10 (08 e 09: Carnaval)
  assert.equal(diasUteis('2027-03-25', '2027-03-30'), 2); // 25 e 29 (26: Sexta Santa)
  assert.equal(diasUteis('2027-05-26', '2027-05-29'), 2); // 26 e 28 (27: Corpus Christi)
  assert.equal(diasUteis('2026-11-19', '2027-01-01'), 29);
});

test('preços pela ANBIMA: perto do oficial em todos os tipos; o que não dá para calcular fica com o preço de antes', () => {
  const r = precosPelaAnbima(CATALOGO, lerAnbima(ANBIMA));
  assert.equal(r.data, '2026-11-19');
  assert.equal(r.fonte, 'anbima');
  const preco = (nome) => r.titulos.find((x) => x.nome === nome).preco;
  const oficial = (nome) => CATALOGO.titulos.find((x) => x.nome === nome).preco;
  const perto1 = (nome, tolerancia = 0.01) => perto(preco(nome), oficial(nome), oficial(nome) * tolerancia);
  perto1('Tesouro Selic 2029', 0.001); // LFT do mesmo vencimento
  perto1('Tesouro Selic 2031', 0.005); // sem LFT de 2031 neste recorte: pela taxa da mais próxima (no arquivo inteiro, 0,04%)
  perto1('Tesouro Prefixado 2027', 0.002); // sem LTN de jan/2027: pela taxa da mais próxima
  perto1('Tesouro Prefixado com Juros Semestrais 2027', 0.001);
  perto1('Tesouro IPCA+ 2035', 0.003); // VNA da NTN-B descontado pela taxa do mesmo vencimento
  perto1('Tesouro IPCA+ 2050', 0.01);
  perto1('Tesouro IPCA+ com Juros Semestrais 2035', 0.003);
  perto1('Tesouro Renda+ Aposentadoria Extra 2030', 0.01);
  perto1('Tesouro Educa+ 2026', 0.01);
  perto1('Tesouro IGPM+ com Juros Semestrais 2031', 0.01);
  assert.equal(preco('Tesouro Inventado 2040'), 123.45);
  assert.deepEqual(r.titulos.map((x) => x.nome), CATALOGO.titulos.map((x) => x.nome), 'os nomes e a ordem do catálogo ficam');
});
