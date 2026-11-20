import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balancoDoMes, compararComPlano, gastouMaisQueOOrcamento, dadosCompletos, gastoMedioFechado } from '../../js/core/balanco.js';
import { migrarCasa, salvarValor, salvarSalario, conferirFatura } from '../../js/core/casa.js';
import { anotarCompra, adicionarCartao } from '../../js/core/cartao.js';
import { adicionarPerfil } from '../../js/core/perfis.js';

const ids = (prefixo = 'k') => { let n = 0; return () => `${prefixo}${++n}`; };

// Casa inventada: Ana (p1) e Leo (p2) dividem a casa; o cartão c2 é do Leo (vira 3, vence 10); a Mãe é outra pessoa.
// Dezembro: salários 6000 e 4000; Luz 200; no cartão, Mercado 100 (casa), Blusa 80 e Academia 90 (todo mês) do Leo,
// Farmácia 30 da Mãe (já tenho) e um Presente 50 para a Ana.
function casaBase() {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [
      { id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Cartão Leo', compraPorCompra: true, arquivada: false },
    ],
    meses: [],
    cartoes: [{ id: 'c2', contaId: 'c2', donaId: 'p2', viraNoDia: 3, venceNoDia: 10, fixas: [] }],
    outrasPessoas: [{ id: 'q1', nome: 'Mãe' }],
  });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p1', valor: 6000 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p2', valor: 4000 });
  casa = salvarValor(casa, { mes: '2026-12', contaId: 'c1', valor: 200 });
  const novoId = ids();
  const anotar = (dados) => { casa = anotarCompra(casa, { cartaoId: 'c2', data: '2026-11-19', novoId, ...dados }); };
  anotar({ nome: 'Mercado', valor: 100, para: 'casa' });
  anotar({ nome: 'Blusa', valor: 80, para: 'p2' });
  anotar({ nome: 'Academia', valor: 90, para: 'p2', todoMes: true });
  anotar({ nome: 'Farmácia', valor: 30, para: 'q1', jaTenho: true });
  anotar({ nome: 'Presente', valor: 50, para: 'p1' });
  return casa;
}

test('balanço: entrou o salário; saiu a parte das contas e o que é seu no cartão; outras pessoas à parte', () => {
  const casa = conferirFatura(casaBase(), { mes: '2026-12', contaId: 'c2' });
  const leo = balancoDoMes(casa, '2026-12', 'p2', '2026-12-20');
  assert.deepEqual(leo.salario, { valor: 4000, situacao: 'confirmado', deOnde: null });
  // Contas: Luz 200 + a parte da casa do cartão 100 = 300; o Leo ganha 40% da renda e paga 120.
  assert.deepEqual(leo.contas, { valor: 120, total: 300, fatia: 0.03, aConfirmar: false });
  // A parte da casa do cartão já está nas contas: no cartão entra só o que é dele (Blusa + Academia).
  assert.deepEqual(leo.cartoes, [{
    cartaoId: 'c2', nome: 'Cartão Leo', fatura: '2026-12', vence: '2026-12-10', seu: 170, daCasa: 100, outras: { valor: 80, jaTenho: 30, falta: 50 }, aberta: false, conferida: true,
  }]);
  assert.deepEqual([leo.entrou, leo.saiu, leo.sobra, leo.previsao], [4000, 290, 3710, false]);
  // O cartão do Leo é só dele: o presente para a Ana não aparece no balanço dela.
  const ana = balancoDoMes(casa, '2026-12', 'p1', '2026-12-20');
  assert.deepEqual([ana.entrou, ana.contas.valor, ana.cartoes, ana.saiu, ana.sobra], [6000, 180, [], 180, 5820]);
  // Fatura ainda aberta e não conferida: previsão.
  const aberta = balancoDoMes(casaBase(), '2026-12', 'p2', '2026-11-25');
  assert.equal(aberta.cartoes[0].aberta, true);
  assert.equal(aberta.contas.aConfirmar, true);
  assert.equal(aberta.previsao, true);
});

test('balanço: salário a confirmar, sem divisão e perfil que não divide a casa', () => {
  const previsto = balancoDoMes(casaBase(), '2027-01', 'p2', '2026-12-20');
  assert.deepEqual(previsto.salario, { valor: 4000, situacao: 'a-confirmar', deOnde: '2026-12' });
  assert.equal(previsto.previsao, true);

  let semSalario = salvarSalario(casaBase(), { mes: '2026-12', pessoaId: 'p1', valor: null });
  semSalario = salvarSalario(semSalario, { mes: '2026-12', pessoaId: 'p2', valor: null });
  const sem = balancoDoMes(semSalario, '2026-12', 'p2', '2026-12-20');
  assert.deepEqual([sem.salario.situacao, sem.contas.valor, sem.contas.fatia, sem.entrou, sem.saiu, sem.sobra], ['vazio', null, null, 0, 170, -170]);

  let comPerfil = adicionarPerfil(casaBase(), { nome: 'Bia', novoId: () => 'x9' }).casa;
  comPerfil = adicionarCartao(comPerfil, { donaId: 'x9', viraNoDia: 3, venceNoDia: 10, novoId: () => 'c9' }).casa;
  comPerfil = anotarCompra(comPerfil, { cartaoId: 'c9', data: '2026-11-19', nome: 'Livro', valor: 40, para: 'x9', novoId: () => 'k99' });
  const bia = balancoDoMes(comPerfil, '2026-12', 'x9', '2026-12-20');
  assert.deepEqual([bia.salario, bia.contas, bia.cartoes.map((c) => c.seu), bia.entrou, bia.saiu, bia.sobra], [null, null, [40], 0, 40, -40]);
});

test('revisão: o salário da outra pessoa ainda a confirmar muda a sua parte das contas: é previsão', () => {
  let casa = salvarSalario(casaBase(), { mes: '2026-12', pessoaId: 'p1', valor: null });
  casa = salvarSalario(casa, { mes: '2026-11', pessoaId: 'p1', valor: 6000 }); // o da Ana vem de novembro
  casa = conferirFatura(casa, { mes: '2026-12', contaId: 'c2' });
  const leo = balancoDoMes(casa, '2026-12', 'p2', '2026-12-20'); // o do Leo está confirmado e a fatura fechou
  assert.equal(leo.salario.situacao, 'confirmado');
  assert.equal(leo.contas.aConfirmar, true);
  assert.equal(leo.previsao, true);
});

test('revisão: cartão que vence no começo do mês seguinte entra no mês em que a fatura fecha (as compras do mês)', () => {
  // Vira no dia 24 e vence no dia 1: compras de 24/10 a 23/11 vencem em 01/12 e são as de novembro.
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c2', nome: 'Cartão Leo', compraPorCompra: true, arquivada: false }],
    meses: [],
    cartoes: [{ id: 'c2', contaId: 'c2', donaId: 'p2', viraNoDia: 24, venceNoDia: 1, fixas: [] }],
    outrasPessoas: [],
  });
  casa = anotarCompra(casa, { cartaoId: 'c2', data: '2026-10-10', nome: 'Livro', valor: 40, para: 'p2', novoId: () => 'k1' }); // vence 01/11
  casa = anotarCompra(casa, { cartaoId: 'c2', data: '2026-11-10', nome: 'Tênis', valor: 300, para: 'p2', novoId: () => 'k2' }); // vence 01/12
  const novembro = balancoDoMes(casa, '2026-11', 'p2', '2026-11-20');
  assert.deepEqual([novembro.cartoes[0].fatura, novembro.cartoes[0].vence, novembro.cartoes[0].seu, novembro.cartoes[0].aberta], ['2026-12', '2026-12-01', 300, true]);
  assert.deepEqual([balancoDoMes(casa, '2026-10', 'p2', '2026-11-20').cartoes[0].seu], [40]);
  // Cartão sem os dias: a fatura do próprio mês, sem vencimento.
  const semDias = { ...casa, cartoes: [{ ...casa.cartoes[0], viraNoDia: null, venceNoDia: null }] };
  assert.deepEqual([balancoDoMes(semDias, '2026-12', 'p2', '2026-11-20').cartoes[0].fatura, balancoDoMes(semDias, '2026-12', 'p2', '2026-11-20').cartoes[0].vence], ['2026-12', null]);
});

// ---------- balanço e plano (desenho 2026-11-20-balanco-e-plano) ----------
test('balanço e plano: a sobra do mês contra o que o plano pede', () => {
  assert.deepEqual(compararComPlano({ sobra: -50, pmtNec: 1000 }), { situacao: 'vermelho', falta: 1000, livre: 0 });
  assert.deepEqual(compararComPlano({ sobra: 0, pmtNec: 1000 }), { situacao: 'vermelho', falta: 1000, livre: 0 });
  assert.deepEqual(compararComPlano({ sobra: 3000, pmtNec: 0 }), { situacao: 'sem-aporte', falta: 0, livre: 3000 });
  assert.deepEqual(compararComPlano({ sobra: 3000, pmtNec: 1200.5 }), { situacao: 'cobre', falta: 0, livre: 1799.5 });
  assert.deepEqual(compararComPlano({ sobra: 800, pmtNec: 1200 }), { situacao: 'falta', falta: 400, livre: 0 });
  assert.deepEqual(compararComPlano({ sobra: 800, pmtNec: Number.NaN }), { situacao: 'sem-plano', falta: 0, livre: 0 });
  assert.deepEqual(compararComPlano({ sobra: 800, pmtNec: Infinity }), { situacao: 'sem-plano', falta: 0, livre: 0 });
});

test('balanço e plano: gastou bem mais que o orçamento do plano (mais de 10%)', () => {
  assert.equal(gastouMaisQueOOrcamento({ saiu: 3301, custoMensal: 3000 }), true);
  assert.equal(gastouMaisQueOOrcamento({ saiu: 3300, custoMensal: 3000 }), false);
  assert.equal(gastouMaisQueOOrcamento({ saiu: 500, custoMensal: 0 }), false);
});

test('revisão: sem salário ou sem divisão não dá veredito; mês já registrado diz que já investiu', () => {
  assert.deepEqual(compararComPlano({ sobra: 800, pmtNec: 1200, completo: false }), { situacao: 'incompleto', falta: 0, livre: 0 });
  assert.deepEqual(compararComPlano({ sobra: -50, pmtNec: 1200, registrado: true }), { situacao: 'registrado', falta: 0, livre: 0 });
  assert.equal(dadosCompletos(balancoDoMes(casaBase(), '2026-12', 'p2', '2026-12-20')), true);
  let semSalario = salvarSalario(casaBase(), { mes: '2026-12', pessoaId: 'p2', valor: null });
  assert.equal(dadosCompletos(balancoDoMes(semSalario, '2026-12', 'p2', '2026-12-20')), false); // salário vazio
  semSalario = salvarSalario(semSalario, { mes: '2026-12', pessoaId: 'p1', valor: null });
  assert.equal(dadosCompletos(balancoDoMes(semSalario, '2026-12', 'p2', '2026-12-20')), false); // sem divisão
});

test('revisão: o gasto médio dos últimos meses já fechados (sem previsão), para conferir o orçamento', () => {
  const casa = conferirFatura(casaBase(), { mes: '2026-12', contaId: 'c2' });
  // Em março, janeiro e fevereiro ainda são previsão (salários a confirmar): só dezembro, fechado, entra.
  assert.equal(gastoMedioFechado(casa, 'p2', '2027-03', '2027-03-15'), 290);
  assert.equal(gastoMedioFechado(casaBase(), 'p2', '2026-12', '2026-12-20'), null); // nenhum mês fechado antes
});
