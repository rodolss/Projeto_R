import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarXlsx } from './xlsx-falso.js';
import { lerXlsx, importarPlanilha } from '../../scripts/planilha-casa.mjs';

// Planilha INVENTADA no formato da do casal: abas de ano (contas na linha 3 até "Total", pessoas com "Salario"
// na linha 4, meses de Jan a Dez nas linhas 5 a 16), a aba do cartão e uma aba pessoal (ignorada).
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function abaDeAno(nome, contas, linhas) {
  const celulas = { C1: 'Contas' };
  const letras = 'CDEFGHIJKL';
  contas.forEach((c, k) => { celulas[`${letras[k]}3`] = c; celulas[`${letras[k]}4`] = 'Valor'; });
  const colTotal = letras[contas.length];
  celulas[`${colTotal}3`] = 'Total';
  Object.assign(celulas, { M3: 'Ana', M4: 'Salario', N4: '%', O4: 'à pagar', Q3: 'Bia', Q4: 'Salario' });
  MESES.forEach((m, k) => {
    const r = k + 5;
    celulas[`B${r}`] = m;
    const linha = linhas(k);
    if (!linha) return;
    linha.valores.forEach((v, j) => { if (v !== null) celulas[`${letras[j]}${r}`] = v; });
    celulas[`${colTotal}${r}`] = { f: `SUM(C${r}:${letras[contas.length - 1]}${r})`, v: linha.valores.reduce((s, v) => s + (v ?? 0), 0) };
    if (linha.ana != null) celulas[`M${r}`] = linha.ana;
    if (linha.bia != null) celulas[`Q${r}`] = linha.bia;
  });
  return { nome, celulas };
}

function planilha({ totalDezembro = 300 } = {}) {
  return criarXlsx([
    abaDeAno('2025', ['Apê', 'Luz', 'RESERVA', 'CARTÃO CASA'], (k) => ({
      valores: [2000, k === 0 ? 74.040000000000006 : 100, k === 2 ? 0 : 50, 400], ana: 3000, bia: 1000,
    })),
    abaDeAno('2027', ['Luz', 'CARTÃO CASA', 'IPTU', 'FAXINA'], () => ({ valores: [1, 1, 1, 1], ana: 9, bia: 9 })),
    abaDeAno('2026', ['Luz', 'CARTÃO CASA', 'IPTU', 'FAXINA'], (k) => (k < 11
      ? { valores: [120, 500, k === 1 ? 300 : 0, k >= 6 ? 150 : null], ana: 3200, bia: 1100 }
      : { valores: [0, totalDezembro, 0, 150], ana: 0, bia: 0 })),
    { nome: 'Cartão Casa', celulas: {
      C1: 'NOVEMBRO', D1: 'DEZEMBRO', A2: 'GASTOS CONJUNTOS',
      B2: 'Streaming', C2: 20, D2: 20,
      B3: 'Mercado', C3: 280,
      B5: 'TOTAL', C5: { f: 'SUM(C2:C4)', v: 300 }, D5: { f: 'SUM(D2:D4)', v: 20 },
    } },
    { nome: 'PESSOAL', celulas: { C1: 'DEZEMBRO', B2: 'Coisa pessoal', C2: 50 } },
  ]);
}

let n = 0;
const novoId = () => `id${++n}`;
const importar = (opcoes) => importarPlanilha(lerXlsx(planilha(opcoes)), { hoje: '2026-11-19', novoId });
const mes = (casa, m) => casa.meses.find((x) => x.mes === m);
const idDe = (casa, nome) => casa.contas.find((c) => c.nome === nome).id;

test('lerXlsx lê abas, textos compartilhados, números e fórmulas', () => {
  const abas = lerXlsx(planilha());
  assert.deepEqual(abas.map((a) => a.nome), ['2025', '2027', '2026', 'Cartão Casa', 'PESSOAL']);
  const a2025 = abas[0];
  assert.equal(a2025.celula('C3'), 'Apê');
  assert.equal(a2025.celula('C5'), 2000);
  assert.equal(a2025.celula('G5'), 2524.04);
  assert.equal(a2025.celula('Z99'), null);
});

test('pessoas e contas: nomes normalizados, ativas na ordem da aba mais recente, o resto arquivado', () => {
  const { casa } = importar();
  assert.deepEqual(casa.pessoas, [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }]);
  assert.deepEqual(casa.contas.map((c) => [c.nome, c.arquivada, c.compraPorCompra]), [
    ['Luz', false, false], ['Cartão Casa', false, true], ['IPTU', false, false], ['Faxina', false, false],
    ['Apartamento', true, false], ['Reserva', true, false],
  ]);
});

test('mês real: todos os valores, inclusive zero, e as contas ativas ausentes da aba entram como zero', () => {
  const { casa } = importar();
  const marco = mes(casa, '2025-03');
  assert.deepEqual(marco.salarios, { p1: 3000, p2: 1000 });
  assert.equal(marco.valores[idDe(casa, 'Apartamento')], 2000);
  assert.equal(marco.valores[idDe(casa, 'Reserva')], 0);
  assert.equal(marco.valores[idDe(casa, 'IPTU')], 0);
  assert.equal(marco.valores[idDe(casa, 'Faxina')], 0);
  assert.equal(mes(casa, '2025-01').valores[idDe(casa, 'Luz')], 74.04);
  assert.equal(mes(casa, '2026-02').valores[idDe(casa, 'Faxina')], 0); // célula vazia em mês real
});

test('a aba de um ano futuro fica de fora', () => {
  const { casa } = importar();
  assert.ok(casa.meses.every((m) => m.mes < '2027-01' || Object.keys(m.salarios).length === 0));
  assert.ok(!casa.meses.some((m) => m.mes.startsWith('2027') && Object.keys(m.valores).length));
});

test('mês sem salário: só valores diferentes de zero, sem salário, e o cartão com compras não leva valor', () => {
  const { casa } = importar();
  const dezembro = mes(casa, '2026-12');
  assert.deepEqual(dezembro.salarios, {});
  assert.deepEqual(dezembro.valores, { [idDe(casa, 'Faxina')]: 150 });
  assert.deepEqual(dezembro.compras.map((c) => [c.nome, c.valor, c.contaId]), [['Streaming', 20, idDe(casa, 'Cartão Casa')], ['Mercado', 280, idDe(casa, 'Cartão Casa')]]);
});

test('compras do cartão: a coluna de um mês vira a fatura do mês seguinte; o mesmo item em meses seguidos é um grupo', () => {
  const { casa, avisos } = importar();
  const janeiro = mes(casa, '2027-01');
  assert.deepEqual(janeiro.compras.map((c) => c.nome), ['Streaming']);
  const streamingDez = mes(casa, '2026-12').compras.find((c) => c.nome === 'Streaming');
  assert.ok(streamingDez.grupo);
  assert.equal(janeiro.compras[0].grupo, streamingDez.grupo);
  assert.equal(mes(casa, '2026-12').compras.find((c) => c.nome === 'Mercado').grupo, undefined);
  assert.ok(!casa.meses.some((m) => m.compras.some((c) => c.nome === 'Coisa pessoal')), 'a aba pessoal fica de fora');
  assert.deepEqual(avisos, []);
});

test('total do cartão diferente do valor da conta gera aviso', () => {
  const { avisos } = importar({ totalDezembro: 299 });
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /Cartão Casa/);
  assert.match(avisos[0], /2026-12/);
});

test('meses em ordem e dentro do formato da casa', () => {
  const { casa } = importar();
  const meses = casa.meses.map((m) => m.mes);
  assert.deepEqual(meses, [...meses].sort());
  assert.equal(meses[0], '2025-01');
  assert.equal(casa.schemaVersion, 1);
  assert.ok(casa.meses.every((m) => m.salarios && m.valores && Array.isArray(m.compras)));
});

test('revisão: nos meses reais, toda conta ausente da aba entra como zero (também as que não usa mais)', () => {
  const { casa } = importar();
  assert.equal(mes(casa, '2026-03').valores[idDe(casa, 'Reserva')], 0);
  assert.equal(mes(casa, '2026-03').valores[idDe(casa, 'Apartamento')], 0);
  assert.equal(mes(casa, '2026-12').valores[idDe(casa, 'Reserva')], undefined); // mês previsto: sem zeros
});
