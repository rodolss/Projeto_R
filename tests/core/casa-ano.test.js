import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salvarValor, salvarSalario } from '../../js/core/casa.js';
import { resumoDoAno, anosDisponiveis } from '../../js/core/casa-ano.js';
import { perto } from '../ajuda.js';

function casaBase() {
  return {
    schemaVersion: 1,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }],
    contas: [
      { id: 'c1', nome: 'Condomínio', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Luz', compraPorCompra: false, arquivada: false },
    ],
    meses: [],
  };
}

// jan: contas 1000, salários 3000 + 1000 · fev: contas 1200 (luz 200 → 400), salários iguais · mar: contas 1100.
function casaTrimestre() {
  let c = casaBase();
  const lancar = (mes, condominio, luz, s1, s2) => {
    c = salvarValor(c, { mes, contaId: 'c1', valor: condominio });
    c = salvarValor(c, { mes, contaId: 'c2', valor: luz });
    if (s1 != null) c = salvarSalario(c, { mes, pessoaId: 'p1', valor: s1 });
    if (s2 != null) c = salvarSalario(c, { mes, pessoaId: 'p2', valor: s2 });
  };
  lancar('2026-01', 800, 200, 3000, 1000);
  lancar('2026-02', 800, 400, 3000, 1000);
  lancar('2026-03', 800, 300, 3000, 1000);
  return c;
}

test('resumoDoAno vai do primeiro mês com dados até o mês atual', () => {
  const r = resumoDoAno(casaTrimestre(), 2026, '2026-02');
  assert.deepEqual(r.meses.map((m) => m.mes), ['2026-01', '2026-02']);
  assert.equal(r.ate, '2026-02');
  assert.equal(r.total, 2200);
  assert.equal(r.mediaMensal, 1100);
  assert.equal(r.renda, 8000);
  perto(r.fatiaDaRenda, 0.275, 1e-9);
});

test('resumoDoAno: por pessoa, o total pago e as médias', () => {
  const r = resumoDoAno(casaTrimestre(), 2026, '2026-03');
  const [ana, bia] = r.pessoas;
  assert.equal(ana.pessoa.nome, 'Ana');
  assert.equal(ana.totalPago, 2475); // 750 + 900 + 825
  assert.equal(bia.totalPago, 825); // 250 + 300 + 275
  assert.equal(ana.mediaPaga, 825);
  assert.equal(ana.mediaSalario, 3000);
  assert.equal(ana.mediaSobra, 2175);
  assert.equal(bia.mediaSobra, 725);
});

test('resumoDoAno: um mês sem salários entra no total, mas não nas médias por pessoa', () => {
  let c = casaBase();
  c = salvarValor(c, { mes: '2026-01', contaId: 'c1', valor: 500 }); // sem salários em janeiro
  c = salvarValor(c, { mes: '2026-02', contaId: 'c1', valor: 500 });
  c = salvarSalario(c, { mes: '2026-02', pessoaId: 'p1', valor: 1000 });
  c = salvarSalario(c, { mes: '2026-02', pessoaId: 'p2', valor: 1000 });
  const r = resumoDoAno(c, 2026, '2026-02');
  assert.equal(r.total, 1000);
  assert.equal(r.meses[0].divide, false);
  assert.equal(r.pessoas[0].mediaSalario, 1000);
  assert.equal(r.pessoas[0].mediaPaga, 250);
  assert.equal(r.pessoas[0].totalPago, 250);
});

test('resumoDoAno: peso de cada conta sobre o total, da maior para a menor', () => {
  const r = resumoDoAno(casaTrimestre(), 2026, '2026-03');
  assert.deepEqual(r.porConta.map((x) => [x.conta.nome, x.total]), [['Condomínio', 2400], ['Luz', 900]]);
  perto(r.porConta.reduce((s, x) => s + x.peso, 0), 1, 1e-9);
  perto(r.porConta[0].peso, 2400 / 3300, 1e-9);
});

test('resumoDoAno de um ano sem dados', () => {
  const r = resumoDoAno(casaTrimestre(), 2025, '2026-12');
  assert.deepEqual(r.meses, []);
  assert.equal(r.total, 0);
  assert.equal(r.ate, null);
  assert.equal(r.fatiaDaRenda, null);
  assert.deepEqual(r.porConta, []);
  assert.deepEqual(r.pessoas.map((p) => p.totalPago), [0, 0]);
});

test('anosDisponiveis vai do ano do primeiro mês até o ano atual', () => {
  const c = salvarValor(casaBase(), { mes: '2024-05', contaId: 'c1', valor: 1 });
  assert.deepEqual(anosDisponiveis(c, '2026-11'), [2024, 2025, 2026]);
  assert.deepEqual(anosDisponiveis(casaBase(), '2026-11'), [2026]);
});

test('resumoDoAno: meses sem lançamento até o mês atual entram com a previsão', () => {
  const r = resumoDoAno(casaTrimestre(), 2026, '2026-05');
  assert.deepEqual(r.meses.map((m) => [m.mes, m.total]), [['2026-01', 1000], ['2026-02', 1200], ['2026-03', 1100], ['2026-04', 1100], ['2026-05', 1100]]);
});
