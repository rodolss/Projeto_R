import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarXlsx } from './xlsx-falso.js';
import { lerXlsx, importarPlanilha, importarCartao } from '../../scripts/planilha-casa.mjs';

// Planilha INVENTADA no formato da do casal: abas de ano (contas na linha 3 até "Total", pessoas com "Salario"
// na linha 4, meses de Jan a Dez nas linhas 5 a 16), a aba do cartão da casa (colunas = mês da compra) e a aba
// pessoal de quem tem o cartão (colunas = mês da fatura; grupos na coluna A; um quadro ao lado que não é compra).
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

function planilha({ totalDezembro = 400 } = {}) {
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
      B4: 'Sofá [4x]', C4: 100, D4: 100,
      B6: 'TOTAL', C6: { f: 'SUM(C2:C5)', v: 400 }, D6: { f: 'SUM(D2:D5)', v: 120 },
    } },
    { nome: 'BIA', celulas: {
      C1: 'DEZEMBRO', D1: 'JANEIRO', E1: 'FEVEREIRO',
      A2: 'FIXAS', B2: 'Academia', C2: 90, D2: 90, E2: 95,
      A3: 'PARCELAS', B3: 'Celular [10x]', C3: 150, D3: 150,
      B4: 'Livro', C4: 45, D4: 'MEU', E4: 1234, // quadro ao lado: texto e número na mesma linha
      B5: 'Curso', C5: 60, D5: 60,
      A6: 'MÃE', B6: 'Remédio [3x]', C6: 30,
      B7: 'Plano do celular', C7: 40, D7: 40, E7: 40,
      D9: 'TIO', E9: 500,
      B10: 'Só quadro', D10: 'X', E10: 77,
    } },
  ]);
}

let n = 0;
const novoId = () => `id${++n}`;
const importar = (opcoes) => importarPlanilha(lerXlsx(planilha(opcoes)), { hoje: '2026-11-19', novoId });
const mes = (casa, m) => casa.meses.find((x) => x.mes === m);
const idDe = (casa, nome) => casa.contas.find((c) => c.nome === nome).id;

test('lerXlsx lê abas, textos compartilhados, números e fórmulas', () => {
  const abas = lerXlsx(planilha());
  assert.deepEqual(abas.map((a) => a.nome), ['2025', '2027', '2026', 'Cartão Casa', 'BIA']);
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
});

const resumo = (casa, m) => (mes(casa, m)?.compras ?? []).map((c) => [c.nome, c.valor, c.para, c.parcela ? c.parcela.n + '/' + c.parcela.de : null]);

test('cartão: o cartão é de quem tem a aba pessoal, ligado à conta do cartão, com as outras pessoas dos grupos', () => {
  const { casa, avisos } = importar();
  assert.equal(casa.schemaVersion, 2);
  assert.equal(casa.cartao.donaId, 'p2');
  assert.equal(casa.cartao.contaId, idDe(casa, 'Cartão Casa'));
  assert.deepEqual([casa.cartao.viraNoDia, casa.cartao.venceNoDia], [null, null]); // não estão na planilha: o app pede
  assert.deepEqual(casa.cartao.pessoas.map((p) => p.nome), ['Mãe']);
  assert.deepEqual(avisos, []);
});

test('cartão: aba da casa vai para a fatura do mês seguinte; aba pessoal já está por fatura; parcelas contadas do fim', () => {
  const { casa } = importar();
  const mae = casa.cartao.pessoas[0].id;
  assert.deepEqual(resumo(casa, '2026-12'), [
    ['Mercado', 280, 'casa', null], ['Sofá', 100, 'casa', '3/4'],
    ['Celular', 150, 'p2', '9/10'], ['Livro', 45, 'p2', null], ['Curso', 60, 'p2', '1/2'], ['Remédio', 30, mae, '3/3'],
  ]);
  assert.deepEqual(resumo(casa, '2027-01'), [['Sofá', 100, 'casa', '4/4'], ['Celular', 150, 'p2', '10/10'], ['Curso', 60, 'p2', '2/2']]);
  assert.equal(mes(casa, '2027-02'), undefined);
  const grupos = mes(casa, '2026-12').compras.filter((c) => c.grupo).map((c) => c.grupo);
  assert.deepEqual(mes(casa, '2027-01').compras.map((c) => c.grupo), [grupos[0], grupos[1], grupos[2]]);
  assert.ok(!casa.meses.some((m) => m.compras.some((c) => ['Só quadro', 'TIO'].includes(c.nome) || c.valor === 1234)), 'o quadro ao lado não vira compra');
});

test('cartão: fixas e linhas até a última coluna viram "todo mês"; valor que muda abre um trecho novo', () => {
  const { casa } = importar();
  const mae = casa.cartao.pessoas[0].id;
  assert.deepEqual(casa.cartao.fixas.map((f) => [f.nome, f.valor, f.para, f.desde, f.ate ?? null]), [
    ['Streaming', 20, 'casa', '2026-12', null],
    ['Academia', 90, 'p2', '2026-12', '2027-01'], ['Academia', 95, 'p2', '2027-02', null],
    ['Plano do celular', 40, mae, '2026-12', null],
  ]);
  // Mês ainda previsto: o valor digitado do cartão sai (as compras e as de todo mês são o valor agora).
  assert.equal(mes(casa, '2026-12').valores[idDe(casa, 'Cartão Casa')], undefined);
});

test('cartão: importar de novo sobre a casa substitui as compras do cartão desde a primeira fatura e não repete nada', () => {
  const { casa } = importar();
  const contaId = idDe(casa, 'Cartão Casa');
  const comAntiga = { ...casa, meses: casa.meses.map((m) => (m.mes === '2026-11' ? { ...m, compras: [{ id: 'velha', contaId, nome: 'Antes', valor: 5 }] } : m)) };
  const r = importarCartao(lerXlsx(planilha()), { hoje: '2026-11-19', casa: comAntiga, novoId });
  assert.deepEqual(resumo(r.casa, '2026-12'), resumo(casa, '2026-12'));
  assert.equal(r.casa.cartao.fixas.length, 4);
  assert.deepEqual(r.casa.cartao.pessoas.map((p) => p.nome), ['Mãe']);
  assert.deepEqual(mes(r.casa, '2026-11').compras.map((c) => c.id), ['velha']);
  assert.deepEqual(r.avisos, []);
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
  assert.equal(casa.schemaVersion, 2);
  assert.ok(casa.meses.every((m) => m.salarios && m.valores && Array.isArray(m.compras)));
});

test('revisão: nos meses reais, toda conta ausente da aba entra como zero (também as que não usa mais)', () => {
  const { casa } = importar();
  assert.equal(mes(casa, '2026-03').valores[idDe(casa, 'Reserva')], 0);
  assert.equal(mes(casa, '2026-03').valores[idDe(casa, 'Apartamento')], 0);
  assert.equal(mes(casa, '2026-12').valores[idDe(casa, 'Reserva')], undefined); // mês previsto: sem zeros
});
