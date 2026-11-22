// Cotação automática (desenho 2026-11-22-cotacoes-automaticas): papéis com cotas, valor pelo preço do dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  papelAutomatico, cotasDoPapel, custoDoPapel, grupoDoTipo, novoPapel, registrarCompra, aplicarCotacoes,
} from '../../js/core/cotacoes.js';
import { posicoes } from '../../js/core/carteira.js';
import { CARTEIRA_PADRAO } from '../../js/core/alocacao.js';
import { perto } from '../ajuda.js';

const HOJE = '2026-12-10';
const estadoVazio = () => ({ config: { mesInicio: '2026-12' }, carteiraAlvo: structuredClone(CARTEIRA_PADRAO), ativos: [], saldos: [], meses: [] });
const COTACAO = { ITUB4: { preco: 40.07, em: '2026-12-10T15:00:00.000Z' } };

// ITUB4: 12 cotas a 38,00; a cotação de hoje é 40,07.
function comItub() {
  return novoPapel(estadoVazio(), { ticker: 'ITUB4', nome: 'Itau Unibanco', grupo: 'acoes', cotas: 12, preco: 38, cotacao: 40.07, hoje: HOJE, novoId: () => 'a1' }).estado;
}

test('o tipo da API vira o grupo da carteira: FII em fundos imobiliários; ação e ETF em ações BR', () => {
  assert.equal(grupoDoTipo({ type: 'fund', subType: 'fii' }), 'fiis');
  assert.equal(grupoDoTipo({ type: 'stock', subType: 'stock' }), 'acoes');
  assert.equal(grupoDoTipo({ type: 'fund', subType: 'etf' }), 'acoes');
  assert.equal(grupoDoTipo({}), 'acoes');
});

test('papel novo: nome é o código, tem compras e o saldo do dia é cotas × cotação (com as cotas)', () => {
  const r = novoPapel(estadoVazio(), { ticker: 'ITUB4', nome: 'Itau Unibanco', grupo: 'acoes', cotas: 12, preco: 38, cotacao: 40.07, hoje: HOJE, novoId: ((n) => () => `i${++n}`)(0) });
  assert.equal(r.id, 'i1');
  assert.deepEqual(r.estado.ativos[0], {
    id: 'i1', nome: 'ITUB4', ticker: 'ITUB4', descricao: 'Itau Unibanco', papel: 'carteira', classe: 'acoes', tipoForaDoPlano: null,
    compras: [{ id: 'i2', data: HOJE, cotas: 12, preco: 38 }],
  });
  assert.deepEqual(r.estado.saldos, [{ ativoId: 'i1', data: HOJE, valor: 480.84, cotas: 12 }]);
  assert.ok(papelAutomatico(r.estado.ativos[0]));
  const semCotacao = novoPapel(estadoVazio(), { ticker: 'ITUB4', nome: 'Itau', grupo: 'acoes', cotas: 12, hoje: HOJE, novoId: () => 'x' });
  assert.deepEqual(semCotacao.estado.saldos, []);
  assert.deepEqual(semCotacao.estado.ativos[0].compras[0].preco, null);
});

test('papel antigo (sem compras) não é automático', () => {
  assert.equal(papelAutomatico({ id: 'r', nome: 'Tesouro', papel: 'carteira' }), false);
});

test('compra e venda: as cotas somam, o custo acompanha, e vender tudo deixa zero sem dividir por zero', () => {
  let e = comItub();
  e = registrarCompra(e, 'a1', { cotas: 8, preco: 42, cotacao: 40.07, hoje: HOJE, novoId: () => 'c2' });
  const a = e.ativos[0];
  assert.equal(cotasDoPapel(e, a), 20);
  assert.equal(custoDoPapel(e, a), 792); // 12×38 + 8×42
  assert.deepEqual(e.saldos.at(-1), { ativoId: 'a1', data: HOJE, valor: 801.4, cotas: 20 });
  e = registrarCompra(e, 'a1', { cotas: -5, preco: 41, cotacao: 40.07, hoje: HOJE, novoId: () => 'c3' });
  assert.equal(cotasDoPapel(e, e.ativos[0]), 15);
  assert.equal(custoDoPapel(e, e.ativos[0]), 594); // vende 5 de 20: sai 1/4 do custo
  e = registrarCompra(e, 'a1', { cotas: -15, cotacao: 40.07, hoje: HOJE, novoId: () => 'c4' });
  assert.equal(cotasDoPapel(e, e.ativos[0]), 0);
  assert.equal(custoDoPapel(e, e.ativos[0]), 0);
  assert.deepEqual(e.saldos.at(-1), { ativoId: 'a1', data: HOJE, valor: 0, cotas: null });
});

test('compra sem preço pago: o custo fica desconhecido (nunca inventado)', () => {
  const e = registrarCompra(comItub(), 'a1', { cotas: 3, cotacao: 40.07, hoje: HOJE, novoId: () => 'c2' });
  assert.equal(custoDoPapel(e, e.ativos[0]), null);
});

test('aplicarCotacoes: grava o saldo do dia; não regrava o mesmo valor; ignora papel sem cotação e papel antigo', () => {
  const base = comItub();
  const sem = { ...base, saldos: [] };
  const novo = aplicarCotacoes(sem, COTACAO, HOJE);
  assert.deepEqual(novo.saldos, [{ ativoId: 'a1', data: HOJE, valor: 480.84, cotas: 12 }]);
  assert.equal(aplicarCotacoes(novo, COTACAO, HOJE), novo, 'mesmo valor: o mesmo objeto');
  assert.equal(aplicarCotacoes(novo, {}, HOJE), novo, 'sem cotação: nada');
  const antigo = { ...base, ativos: [...base.ativos, { id: 'r', nome: 'Tesouro', papel: 'carteira', classe: 'rendaFixa' }] };
  assert.equal(aplicarCotacoes(antigo, { Tesouro: { preco: 1 } }, HOJE), antigo);
  const amanha = aplicarCotacoes(novo, { ITUB4: { preco: 41, em: 'x' } }, '2026-12-11');
  assert.deepEqual(amanha.saldos.at(-1), { ativoId: 'a1', data: '2026-12-11', valor: 492, cotas: 12 });
  assert.equal(amanha.saldos.length, novo.saldos.length + 1);
  const mudou = aplicarCotacoes(novo, { ITUB4: { preco: 42, em: 'x' } }, HOJE); // o mesmo dia com outro preço troca o saldo do dia
  assert.deepEqual(mudou.saldos.filter((s) => s.data === HOJE).map((s) => s.valor), [504]);
});

test('aplicarCotacoes: cotas do Dia de pagamento (aporte com cotas) entram na conta e o aporte do dia não conta duas vezes', () => {
  const base = { ...comItub(), saldos: [], meses: [{ mes: '2026-12', data: HOJE, aplicado: [{ ativoId: 'a1', valor: 200.35, cotas: 5 }] }] };
  const e = aplicarCotacoes(base, COTACAO, HOJE);
  assert.equal(cotasDoPapel(e, e.ativos[0]), 17);
  // 17 × 40,07 = 681,19 menos o aporte de hoje (200,35), que a conta já soma depois do saldo
  assert.deepEqual(e.saldos.at(-1), { ativoId: 'a1', data: HOJE, valor: 480.84, cotas: null });
});

test('posições: aplicado vem do custo e o ganho é o valor de hoje menos o custo; sem preço pago, sem ganho', () => {
  const e = comItub();
  const [p] = posicoes(e, HOJE);
  assert.equal(p.saldo, 480.84);
  assert.equal(p.aplicado, 456);
  assert.equal(p.ganho, 24.84);
  assert.equal(p.cotas, 12);
  const semPreco = registrarCompra(e, 'a1', { cotas: 1, cotacao: 40.07, hoje: HOJE, novoId: () => 'c2' });
  const [q] = posicoes(semPreco, HOJE);
  assert.equal(q.ganho, null);
  assert.equal(q.aplicado, q.saldo);
});

test('revisão: aporte do Dia de pagamento sem cotas num Tesouro vira títulos pelo preço do dia (não some dinheiro)', () => {
  const base = novoPapel(estadoVazio(), { ticker: 'Tesouro Selic 2029', nome: 'x', grupo: 'reserva', fonte: 'tesouro', cotas: 1, preco: 17000, cotacao: 17000, hoje: '2026-12-01', novoId: ((n) => () => `t${++n}`)(0) }).estado;
  const comAporte = { ...base, meses: [{ mes: '2026-12', data: '2026-12-02', aplicado: [{ ativoId: 't1', valor: 1000 }] }] };
  const a = comAporte.ativos[0];
  perto(cotasDoPapel(comAporte, a), 1 + 1000 / 17000, 1e-6);
  assert.equal(custoDoPapel(comAporte, a), 18000);
  const dia3 = aplicarCotacoes(comAporte, { 'Tesouro Selic 2029': { preco: 17010, em: 'x' } }, '2026-12-03');
  perto(dia3.saldos.at(-1).valor, (1 + 1000 / 17000) * 17010, 0.01);
  // A transferência da caixa (valor negativo) tira títulos na mesma conta.
  const transferencia = { ...base, meses: [{ mes: '2026-12', data: '2026-12-02', aplicado: [{ ativoId: 't1', valor: -1700 }] }] };
  perto(cotasDoPapel(transferencia, transferencia.ativos[0]), 0.9, 1e-6);
});
