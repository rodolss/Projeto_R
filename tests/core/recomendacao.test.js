// Onde investir (desenho 2026-11-22-onde-investir): a recomendação gravada pela análise no Claude Code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarRecomendacao, aplicarRecomendacao, recomendacaoDoMes, aplicadoDasOrdens, mesDoProximoPagamento, restoDasOrdens,
} from '../../js/core/recomendacao.js';
import { arredondarDistribuicao } from '../../js/core/alocacao.js';

test('arredondarDistribuicao: o resto dos centavos vai para a maior parte, nunca para uma classe com 0', () => {
  const d = arredondarDistribuicao({ rendaFixa: 0, fiis: 1000.6, acoes: 999.9, exterior: 0 });
  assert.deepEqual([d.rendaFixa, d.exterior], [0, 0]);
  assert.equal(Math.round((d.fiis + d.acoes) * 100) / 100, 2000.5);
  assert.equal(d.acoes, 999);
});
import { registrarAplicacao } from '../../js/core/motor.js';
import { CARTEIRA_PADRAO } from '../../js/core/alocacao.js';

// Recomendação inventada (códigos fictícios terminados em 11 e 3, só para o teste).
function recomendacao() {
  return {
    mes: '2026-12', geradaEm: '2026-11-26', valor: 1000,
    estrategia: { fiis: 0.5, acoes: 0.5 },
    lista: [
      { ticker: 'AAAA11', nome: 'Fundo de galpões', classe: 'fiis', fatia: 0.5, motivo: 'Aluguéis de galpões logísticos' },
      { ticker: 'BBBB3', nome: 'Empresa de energia', classe: 'acoes', fatia: 0.5, motivo: 'Transmissão de energia, contratos longos' },
    ],
    ordens: [
      { ticker: 'AAAA11', nome: 'Fundo de galpões', classe: 'fiis', cotas: 4, preco: 100, valor: 400, motivo: 'Abaixo da fatia' },
      { ticker: 'BBBB3', nome: 'Empresa de energia', classe: 'acoes', cotas: 15, preco: 35.5, valor: 532.5, motivo: 'Abaixo da fatia' },
    ],
    resumo: 'Metade em fundos, metade em ações.', avisos: [],
  };
}

test('validarRecomendacao: aceita a recomendação certa', () => {
  assert.deepEqual(validarRecomendacao(recomendacao()), { ok: true, erros: [] });
});

test('validarRecomendacao: recusa cotas quebradas, valor que não bate com cotas × preço e ordens acima do valor', () => {
  const r = recomendacao();
  r.ordens[0].cotas = 2.5;
  r.ordens[1].valor = 999;
  r.valor = 500;
  const { ok, erros } = validarRecomendacao(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => /cotas/.test(e)));
  assert.ok(erros.some((e) => /BBBB3/.test(e) && /valor/.test(e)));
  assert.ok(erros.some((e) => /passam do valor/.test(e)));
});

test('validarRecomendacao: ordem fora da lista e classe que não é de renda isenta são recusadas', () => {
  const r = recomendacao();
  r.ordens.push({ ticker: 'CCCC11', nome: 'Outro', classe: 'fiis', cotas: 1, preco: 10, valor: 10, motivo: 'x' });
  r.lista.push({ ticker: 'DDDD11', nome: 'ETF', classe: 'exterior', fatia: 0, motivo: 'x' });
  const { erros } = validarRecomendacao(r);
  assert.ok(erros.some((e) => /CCCC11/.test(e) && /lista/.test(e)));
  assert.ok(erros.some((e) => /DDDD11/.test(e) && /classe/.test(e)));
});

test('aplicarRecomendacao grava a recomendação e põe a carteira-alvo em 50% fundos e 50% ações', () => {
  const estado = { carteiraAlvo: structuredClone(CARTEIRA_PADRAO), ativos: [], saldos: [], meses: [] };
  const novo = aplicarRecomendacao(estado, recomendacao());
  assert.equal(novo.recomendacao.mes, '2026-12');
  assert.deepEqual(['rendaFixa', 'fiis', 'acoes', 'exterior'].map((c) => novo.carteiraAlvo[c].peso), [0, 0.5, 0.5, 0]);
  assert.equal(novo.carteiraAlvo.fiis.ticker, 'AAAA11');
  assert.equal(estado.recomendacao, undefined, 'não muda o estado de entrada');
});

test('validarRecomendacao: a classe da ordem tem de ser a da lista; valor e preço precisam ser números', () => {
  const r = recomendacao();
  r.ordens[0].classe = 'fii';
  delete r.ordens[1].valor;
  const { erros } = validarRecomendacao(r);
  assert.ok(erros.some((e) => /AAAA11/.test(e) && /classe/.test(e)));
  assert.ok(erros.some((e) => /BBBB3/.test(e) && /valor/.test(e)));
});

test('aplicarRecomendacao usa sempre a estratégia fixa (50/50), não a que vier na recomendação', () => {
  const r = { ...recomendacao(), estrategia: { fiis: 50, acoes: 50, rendaFixa: 1 } };
  const novo = aplicarRecomendacao({ carteiraAlvo: structuredClone(CARTEIRA_PADRAO) }, r);
  assert.deepEqual(['rendaFixa', 'fiis', 'acoes', 'exterior'].map((c) => novo.carteiraAlvo[c].peso), [0, 0.5, 0.5, 0]);
  assert.deepEqual(novo.recomendacao.estrategia, { fiis: 0.5, acoes: 0.5 });
});

test('mesDoProximoPagamento: o mês do calendário enquanto o Dia de pagamento dele não foi registrado; depois, o seguinte', () => {
  assert.equal(mesDoProximoPagamento({ meses: [] }, '2026-12-26'), '2026-12');
  assert.equal(mesDoProximoPagamento({ meses: [{ mes: '2026-12' }] }, '2026-12-28'), '2027-01');
});

test('restoDasOrdens: o que as cotas inteiras não cobriram (vai para a caixa de oportunidade)', () => {
  assert.equal(restoDasOrdens(recomendacao(), 1000), 67.5);
  assert.equal(restoDasOrdens(recomendacao(), 932.9), 0.4);
  assert.equal(restoDasOrdens(recomendacao(), 900), 0, 'nunca negativo');
});

test('recomendacaoDoMes: só a do mês pedido', () => {
  const estado = { recomendacao: recomendacao() };
  assert.equal(recomendacaoDoMes(estado, '2026-12').valor, 1000);
  assert.equal(recomendacaoDoMes(estado, '2027-01'), null);
  assert.equal(recomendacaoDoMes({}, '2026-12'), null);
});

test('as ordens viram o aplicado do Dia de pagamento: o investimento é criado pelo código na primeira compra, com as cotas', () => {
  const r = recomendacao();
  const estado = { config: { mesInicio: '2026-11', prazoMeses: 120, swr: 0.04, rentabilidadeReal: 0.05, salario: 6000, mesSalario: '2026-11', recebe13: true, recebeFerias: true },
    plano: { p0: 0, mesP0: '2026-11' }, orcamento: [], ativos: [{ id: 'x', nome: 'aaaa11', ticker: 'aaaa11', papel: 'carteira', classe: 'fiis', tipoForaDoPlano: null }],
    carteiraAlvo: structuredClone(CARTEIRA_PADRAO), saldos: [], meses: [], contadoresAnuais: {}, ipca: { serie: {}, atualizadoEm: null }, ipcaManual: {}, marcos: {} };
  const aplicado = aplicadoDasOrdens(r);
  assert.deepEqual(aplicado.map((a) => [a.valor, a.cotas]), [[400, 4], [532.5, 15]]);
  const novo = registrarAplicacao(estado, { mes: '2026-12', data: '2026-12-27', recebido: 6000, resposta: { guardarParaProximoMes: 0 }, aplicado });
  assert.equal(novo.ativos.length, 2, 'AAAA11 já existia (sem diferenciar maiúsculas); BBBB3 foi criado');
  const bbbb = novo.ativos.find((a) => a.ticker === 'BBBB3');
  assert.deepEqual([bbbb.papel, bbbb.classe, bbbb.nome], ['carteira', 'acoes', 'BBBB3']);
  assert.deepEqual(novo.meses[0].aplicado.map((a) => [a.ativoId === 'x' || a.ativoId === bbbb.id, a.cotas]), [[true, 4], [true, 15]]);
});
