import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, CARTEIRA_PADRAO } from '../../js/core/alocacao.js';
import { checkup } from '../../js/core/checkup.js';

const pesos = Object.fromEntries(CLASSES.map((c) => [c, CARTEIRA_PADRAO[c].peso]));
const zeros = { rendaFixa: 0, fiis: 0, acoes: 0, exterior: 0 };
const b = {
  pesos, carteiraAlvo: CARTEIRA_PADRAO, foraDoPlano: [], reserva: 33000, alvoReserva: 33000,
  caixa: 0, tetoCaixa: 55200, diasDesdeAtualizacao: 10,
};
const chaves = (r) => r.map((x) => x.chave);

test('classe abaixo do alvo', () => {
  const r = checkup({ ...b, valores: { rendaFixa: 4000, fiis: 1500, acoes: 3000, exterior: 1500 } });
  const item = r.find((x) => x.chave === 'abaixo:fiis');
  assert.ok(item);
  assert.equal(item.nivel, 'atencao');
  assert.match(item.texto, /XFIX11/);
});
test('exatamente 5 p.p. não dispara', () => {
  assert.ok(!chaves(checkup({ ...b, valores: { rendaFixa: 5500, fiis: 2000, acoes: 2000, exterior: 500 } })).some((c) => c.startsWith('abaixo:')));
});
test('classe acima não manda vender', () => {
  const r = checkup({ ...b, valores: { rendaFixa: 5500, fiis: 2000, acoes: 2000, exterior: 500 } });
  const a = r.find((x) => x.chave === 'acima:rendaFixa');
  assert.ok(a);
  assert.ok(!/vend/i.test(a.texto));
});
test('poupança e fora do plano', () => {
  const r = chaves(checkup({
    ...b, valores: zeros, foraDoPlano: [{ nome: 'Poupança', tipoForaDoPlano: 'poupanca' }, { nome: 'Cripto', tipoForaDoPlano: 'outro' }],
  }));
  assert.ok(r.includes('poupanca:Poupança'));
  assert.ok(r.includes('fora:Cripto'));
});
test('saldos desatualizados e reserva formando', () => {
  const r = checkup({ ...b, valores: zeros, reserva: 10000, diasDesdeAtualizacao: 36 });
  assert.equal(r.find((x) => x.chave === 'reserva').nivel, 'atencao');
  assert.ok(chaves(r).includes('saldos'));
});
test('carteira vazia não gera regras de classe; caixa vazia é ok', () => {
  const r = checkup({ ...b, valores: zeros });
  assert.ok(!chaves(r).some((c) => c.startsWith('abaixo:') || c.startsWith('acima:')));
  assert.equal(r.find((x) => x.chave === 'caixa').nivel, 'ok');
  assert.equal(r.find((x) => x.chave === 'reserva').nivel, 'ok');
});
