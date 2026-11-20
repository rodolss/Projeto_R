import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faturaDaTela, dataCurta, situacaoDaFatura, paraSugerido, ehParcelada, cartaoDaTela, sugestoesDoNome, textoDaFalta, dicaDoJaTenho } from '../../js/ui/casa-cartao.js';

test('fatura da tela: a do endereço, ou a aberta', () => {
  assert.equal(faturaDaTela('#/casa-cartao?fatura=2027-01', '2026-12'), '2027-01');
  assert.equal(faturaDaTela('#/casa-cartao?fatura=2027-13&folha=anotar', '2026-12'), '2026-12');
  assert.equal(faturaDaTela('#/casa-cartao', '2026-12'), '2026-12');
});

test('data curta: dia e mês com dois dígitos', () => {
  assert.equal(dataCurta('2026-11-19'), '19/11');
  assert.equal(dataCurta('2026-12-03'), '03/12');
});

test('situação da fatura: conferida, fechada sem conferir, aberta ou ainda não começou', () => {
  const periodo = { de: '2026-11-03', ate: '2026-12-02', vence: '2026-12-10' };
  assert.equal(situacaoDaFatura({ hoje: '2026-12-05', periodo, conferida: true }), 'conferida');
  assert.equal(situacaoDaFatura({ hoje: '2026-12-05', periodo, conferida: false }), 'fechada');
  assert.equal(situacaoDaFatura({ hoje: '2026-12-02', periodo, conferida: false }), 'aberta');
  assert.equal(situacaoDaFatura({ hoje: '2026-11-03', periodo, conferida: false }), 'aberta');
  assert.equal(situacaoDaFatura({ hoje: '2026-11-02', periodo, conferida: false }), 'futura');
});

test('para quem sugerido: o da última vez com o mesmo nome (sem acento e sem caixa)', () => {
  const sugestoes = [{ nome: 'Farmácia', para: 'q1' }, { nome: 'Gasolina', para: 'casa' }];
  assert.equal(paraSugerido(sugestoes, 'farmacia'), 'q1');
  assert.equal(paraSugerido(sugestoes, ' GASOLINA '), 'casa');
  assert.equal(paraSugerido(sugestoes, 'Gas'), null);
  assert.equal(paraSugerido(sugestoes, ''), null);
});

test('revisão: compra com grupo é parcela, mesmo sem o número da parcela (importação antiga)', () => {
  assert.equal(ehParcelada({ grupo: 'g1', parcela: { n: 2, de: 6 } }), true);
  assert.equal(ehParcelada({ grupo: 'g1' }), true);
  assert.equal(ehParcelada({ id: 'k1' }), false);
});

test('cartão da tela: o do endereço, senão o último usado no aparelho, senão o primeiro', () => {
  const casa = { cartoes: [{ id: 'c1' }, { id: 'c2' }] };
  assert.equal(cartaoDaTela('#/casa-cartao?cartao=c2&fatura=2026-12', casa, 'c1'), 'c2');
  assert.equal(cartaoDaTela('#/casa-cartao?cartao=sumiu', casa, 'c2'), 'c2');
  assert.equal(cartaoDaTela('#/casa-cartao', casa, 'sumiu'), 'c1');
  assert.equal(cartaoDaTela('#/casa-cartao', casa, null), 'c1');
  assert.equal(cartaoDaTela('#/casa-cartao', { cartoes: [] }, 'c1'), null);
});

test('sugestões do nome: começo do nome primeiro, depois no meio; sem acento; sem a que já está escrita; no máximo 4', () => {
  const nomes = ['Café', 'Farmácia', 'Sofá', 'Faxina', 'Fast food', 'Farofa', 'Fatura', 'Pão de forma'].map((nome) => ({ nome, para: 'casa' }));
  // Cinco começam com "fa" (só cabem 4) e "Sofá" tem "fa" no meio, antes na lista: os do começo vêm primeiro.
  assert.deepEqual(sugestoesDoNome(nomes, 'fa'), ['Farmácia', 'Faxina', 'Fast food', 'Farofa']);
  // Poucas do começo: as do meio vêm depois delas.
  assert.deepEqual(sugestoesDoNome(nomes, 'fat'), ['Fatura']);
  assert.deepEqual(sugestoesDoNome(nomes, 'ofa'), ['Sofá', 'Farofa']);
  assert.deepEqual(sugestoesDoNome([...nomes, { nome: 'Fofa', para: 'casa' }], 'fa'), ['Farmácia', 'Faxina', 'Fast food', 'Farofa']);
  assert.deepEqual(sugestoesDoNome(nomes.slice(0, 4), 'fa'), ['Farmácia', 'Faxina', 'Sofá']);
  assert.deepEqual(sugestoesDoNome(nomes, 'FOR'), ['Pão de forma']);
  assert.deepEqual(sugestoesDoNome(nomes, 'farmacia'), []);
  assert.deepEqual(sugestoesDoNome(nomes, ''), []);
  assert.deepEqual(sugestoesDoNome(nomes, '  '), []);
});

test('texto da falta: quanto falta ou já tenho tudo', () => {
  assert.equal(textoDaFalta(0), 'Já tenho tudo ✓');
  assert.equal(textoDaFalta(-0.01), 'Já tenho tudo ✓');
  const falta = textoDaFalta(50);
  assert.ok(falta.startsWith('Falta '), falta);
  assert.ok(falta.includes('50,00'), falta);
});

test('dica do já tenho: à vista, parcelado, todo mês, parcela e de todo mês', () => {
  assert.equal(dicaDoJaTenho({ forma: 'vista' }), 'Já guardou no cofrinho, ou a pessoa já te pagou.');
  assert.equal(dicaDoJaTenho({ forma: 'parcelado' }), 'Vale só para a 1ª parcela (a desta fatura).');
  assert.equal(dicaDoJaTenho({ forma: 'todoMes', nomeDaFatura: 'janeiro' }), 'Vale só para a fatura de janeiro.');
  assert.equal(dicaDoJaTenho({ forma: 'fixa', nomeDaFatura: 'janeiro' }), 'Vale só para a fatura de janeiro.');
  assert.equal(dicaDoJaTenho({ forma: 'parcela', parcela: { n: 2, de: 6 } }), 'Vale só para esta parcela (2 de 6).');
  assert.equal(dicaDoJaTenho({ forma: 'parcela' }), 'Vale só para esta parcela.');
});
