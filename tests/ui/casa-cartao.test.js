import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faturaDaTela, dataCurta, situacaoDaFatura, paraSugerido, ehParcelada } from '../../js/ui/casa-cartao.js';

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
