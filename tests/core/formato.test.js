import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarBRL, parseBRL, formatarPct, formatarDuracao, formatarPctCurto } from '../../js/core/formato.js';

test('formatarBRL', () => {
  assert.equal(formatarBRL(1234.56), 'R$ 1.234,56');
  assert.equal(formatarBRL(0), 'R$ 0,00');
  assert.equal(formatarBRL(-5), '-R$ 5,00');
});
test('parseBRL aceita formatos brasileiros', () => {
  assert.equal(parseBRL('R$ 7.800,00'), 7800);
  assert.equal(parseBRL('7.800'), 7800);
  assert.equal(parseBRL('7800,5'), 7800.5);
  assert.equal(parseBRL('7800.5'), 7800.5);
  assert.equal(parseBRL('1.234.567'), 1234567);
  assert.equal(parseBRL('0'), 0);
});
test('parseBRL rejeita entradas inválidas', () => {
  for (const t of ['', '   ', 'abc', '-50', '1,2,3']) assert.equal(parseBRL(t), null, `entrada: "${t}"`);
});
test('formatarPct', () => {
  assert.equal(formatarPct(0.0643), '6,4%');
  assert.equal(formatarPct(0.25, 0), '25%');
});
test('formatarDuracao', () => {
  assert.equal(formatarDuracao(null), 'mais de 50 anos');
  assert.equal(formatarDuracao(0), 'menos de 1 mês');
  assert.equal(formatarDuracao(1), '1 mês');
  assert.equal(formatarDuracao(12), '1 ano');
  assert.equal(formatarDuracao(13), '1 ano e 1 mês');
  assert.equal(formatarDuracao(255), '21 anos e 3 meses');
});
test('formatarPctCurto: sem casas quando é inteiro', () => {
  assert.equal(formatarPctCurto(0.05), '5%');
  assert.equal(formatarPctCurto(0.03), '3%');
  assert.equal(formatarPctCurto(0.07), '7%');
  assert.equal(formatarPctCurto(0.035), '3,5%');
});

test('máscara de reais: só números entram; ponto e vírgula vêm da máscara', async () => {
  const { mascararReais, valorDosReais, REGEX_REAIS } = await import('../../js/core/formato.js');
  assert.equal(mascararReais(''), '');
  assert.equal(mascararReais('0'), ''); // zero sozinho: campo vazio (dá para apagar)
  assert.equal(mascararReais('5'), '0,05');
  assert.equal(mascararReais('12'), '0,12');
  assert.equal(mascararReais('123'), '1,23');
  assert.equal(mascararReais('123456'), '1.234,56');
  assert.equal(mascararReais('1234567890'), '12.345.678,90');
  assert.equal(mascararReais('1,2,3.4'), '12,34'); // vírgula e ponto digitados saem
  assert.equal(mascararReais('0,005'), '0,05'); // continua de onde estava ("0,00" + 5)
  assert.equal(mascararReais('R$ 7.800,00'), '7.800,00');
  assert.equal(mascararReais('9'.repeat(20)), '99.999.999.999,99'); // limite
  for (const t of ['0,05', '12,00', '1.234,56', '99.999.999.999,99']) assert.match(t, REGEX_REAIS);
  for (const t of ['', '1234,56', '1.23,45', '1,5', '12,345', 'a,bc']) assert.doesNotMatch(t, REGEX_REAIS);
  assert.equal(valorDosReais('1.234,56'), 1234.56);
  assert.equal(valorDosReais('0,05'), 0.05);
  assert.equal(valorDosReais(''), null);
  assert.equal(valorDosReais('1234,5'), null);
});
