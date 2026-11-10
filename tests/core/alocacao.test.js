import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perto } from '../ajuda.js';
import {
  CLASSES, CARTEIRA_PADRAO, NOMES_CLASSE, distribuirAporte, arredondarDistribuicao, sugestaoPorAtivo, explicarPorque,
} from '../../js/core/alocacao.js';

const pesos = Object.fromEntries(CLASSES.map((c) => [c, CARTEIRA_PADRAO[c].peso]));
const v = { rendaFixa: 4000, fiis: 2500, acoes: 2500, exterior: 500 };
const zeros = { rendaFixa: 0, fiis: 0, acoes: 0, exterior: 0 };

test('carteira padrão', () => {
  assert.deepEqual(pesos, { rendaFixa: 0.40, fiis: 0.25, acoes: 0.25, exterior: 0.10 });
  assert.deepEqual(CLASSES.map((c) => CARTEIRA_PADRAO[c].ticker), ['Tesouro IPCA+ com Juros Semestrais', 'XFIX11', 'DIVO11', 'IVVB11']);
  assert.equal(NOMES_CLASSE.acoes, 'A bolsa brasileira');
});
test('aporte igual à soma dos déficits', () => {
  assert.deepEqual(distribuirAporte({ valores: v, pesos, aporte: 1000 }), { rendaFixa: 200, fiis: 125, acoes: 125, exterior: 550 });
});
test('só a classe abaixo do alvo recebe', () => {
  assert.deepEqual(distribuirAporte({ valores: v, pesos, aporte: 500 }), { ...zeros, exterior: 500 });
});
test('déficits maiores que o aporte: proporcional', () => {
  const d = distribuirAporte({ valores: { rendaFixa: 5000, fiis: 2500, acoes: 2500, exterior: 1000 }, pesos, aporte: 1000 });
  assert.equal(d.rendaFixa, 0);
  perto(d.fiis, 416.67);
  perto(d.acoes, 416.67);
  perto(d.exterior, 166.67);
});
test('carteira vazia segue os pesos', () => {
  assert.deepEqual(distribuirAporte({ valores: zeros, pesos, aporte: 1000 }), { rendaFixa: 400, fiis: 250, acoes: 250, exterior: 100 });
});
test('aporte zero', () => assert.deepEqual(distribuirAporte({ valores: v, pesos, aporte: 0 }), zeros));
test('arredondamento sobra na renda fixa', () => {
  assert.deepEqual(arredondarDistribuicao({ rendaFixa: 100, fiis: 62.5, acoes: 62.5, exterior: 275 }), { rendaFixa: 101, fiis: 62, acoes: 62, exterior: 275 });
});
test('cotas aproximadas', () => {
  const s = sugestaoPorAtivo({ distribuicao: { ...zeros, exterior: 275 }, carteiraAlvo: CARTEIRA_PADRAO, precos: { exterior: 100 } });
  assert.equal(s.length, 1);
  assert.equal(s[0].ticker, 'IVVB11');
  assert.equal(s[0].cotasAprox, 2);
  assert.equal(sugestaoPorAtivo({ distribuicao: { ...zeros, exterior: 275 }, carteiraAlvo: CARTEIRA_PADRAO, precos: {} })[0].cotasAprox, null);
});
test('por quê: queda', () => {
  const t = explicarPorque({
    valores: { rendaFixa: 4000, fiis: 2500, acoes: 1500, exterior: 1000 },
    valoresMesAnterior: { rendaFixa: 4000, fiis: 2500, acoes: 2500, exterior: 1000 },
    pesos, distribuicao: { ...zeros, acoes: 900 }, carteiraAlvo: CARTEIRA_PADRAO,
  });
  assert.equal(t, 'A bolsa brasileira caiu este mês e ficou abaixo do alvo, então o DIVO11 recebe uma fatia maior.');
});
test('por quê: abaixo do alvo e carteira vazia', () => {
  const t = explicarPorque({ valores: v, valoresMesAnterior: v, pesos, distribuicao: { rendaFixa: 200, fiis: 125, acoes: 125, exterior: 550 }, carteiraAlvo: CARTEIRA_PADRAO });
  assert.equal(t, 'A parte no exterior está abaixo do alvo (5,3% de 10,0%), então o IVVB11 recebe uma fatia maior.');
});
test('por quê explica a classe mais favorecida, não a que recebe mais reais', () => {
  const t = explicarPorque({ valores: v, valoresMesAnterior: null, pesos, distribuicao: { rendaFixa: 920, fiis: 575, acoes: 575, exterior: 730 }, carteiraAlvo: CARTEIRA_PADRAO });
  assert.equal(t, 'A parte no exterior está abaixo do alvo (5,3% de 10,0%), então o IVVB11 recebe uma fatia maior.');
  assert.equal(explicarPorque({ valores: zeros, valoresMesAnterior: null, pesos, distribuicao: { rendaFixa: 400, fiis: 250, acoes: 250, exterior: 100 }, carteiraAlvo: CARTEIRA_PADRAO }), 'Dividindo conforme a sua carteira-alvo.');
});
