// Renda fixa automática (desenho 2026-11-22-renda-fixa-automatica): CDB/LCI/LCA calculados pela taxa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tituloCalculado, atualizaSozinho, fatorDoTitulo, valorBruto, liquidoEstimado, aplicadoDoTitulo,
  novoTituloCalculado, registrarAplicacao, aplicarRendaFixa,
} from '../../js/core/renda-fixa.js';
import { novoPapel, cotasDoPapel } from '../../js/core/cotacoes.js';
import { posicoes } from '../../js/core/carteira.js';
import { CARTEIRA_PADRAO } from '../../js/core/alocacao.js';
import { perto } from '../ajuda.js';

// CDI inventado: 0,05% ao dia em 4 dias úteis de dezembro; IPCA inventado de dezembro e janeiro.
const CDI = { '2026-12-01': 0.05, '2026-12-02': 0.05, '2026-12-03': 0.05, '2026-12-04': 0.05 };
const SERIES = { cdi: CDI, ipca: { '2026-12': 0.005, '2027-01': 0.004 } };
const HOJE = '2026-12-05';
const estadoVazio = () => ({ config: { mesInicio: '2026-12' }, carteiraAlvo: structuredClone(CARTEIRA_PADRAO), ativos: [], saldos: [], meses: [] });
const ids = () => { let n = 0; return () => `x${++n}`; };
const RF = (extra = {}) => ({ tipo: 'cdb', indexador: 'cdi', taxa: 1, vencimento: null, ...extra });
const comCdb = (rf = RF(), valor = 1000, data = '2026-12-01') => novoTituloCalculado(estadoVazio(), {
  nome: 'CDB Banco 2028', grupo: 'rendaFixa', rendaFixa: rf, valor, data, series: SERIES, hoje: HOJE, novoId: ids(),
}).estado;

test('fator: % do CDI nos dias úteis de [aplicação, hoje); prefixado e IPCA+ pelos dias úteis', () => {
  perto(fatorDoTitulo(RF(), { de: '2026-12-01', ate: HOJE, ...SERIES }), 1.0005 ** 4, 1e-12);
  perto(fatorDoTitulo(RF({ taxa: 1.1 }), { de: '2026-12-01', ate: HOJE, ...SERIES }), 1.00055 ** 4, 1e-12);
  perto(fatorDoTitulo(RF({ indexador: 'pre', taxa: 0.12 }), { de: '2026-12-01', ate: HOJE, ...SERIES }), 1.12 ** (4 / 252), 1e-12);
  // IPCA+: IPCA dos meses depois do mês da aplicação até o último publicado (janeiro) × a taxa pelos dias úteis.
  perto(fatorDoTitulo(RF({ indexador: 'ipca', taxa: 0.06 }), { de: '2026-12-01', ate: '2027-02-03', ...SERIES }), 1.004 * 1.06 ** (4 / 252), 1e-12);
  // IPCA de um mês que ainda não terminou não entra (no máximo o mês de hoje).
  perto(fatorDoTitulo(RF({ indexador: 'ipca', taxa: 0.06 }), { de: '2026-12-01', ate: HOJE, ...SERIES }), 1.06 ** (4 / 252), 1e-12);
  assert.equal(fatorDoTitulo(RF(), { de: HOJE, ate: HOJE, ...SERIES }), 1, 'aplicação de hoje vale o aplicado');
  assert.equal(fatorDoTitulo(RF(), { de: '2026-12-01', ate: HOJE, cdi: {}, ipca: {} }), 1, 'sem série: o aplicado');
});

test('título novo: dados da renda fixa, a aplicação e o saldo do dia já calculado', () => {
  const r = novoTituloCalculado(estadoVazio(), { nome: ' CDB Banco 2028 ', grupo: 'rendaFixa', rendaFixa: RF(), valor: 1000, data: '2026-12-01', series: SERIES, hoje: HOJE, novoId: ids() });
  assert.deepEqual(r.estado.ativos[0], {
    id: 'x1', nome: 'CDB Banco 2028', ticker: 'CDB Banco 2028', papel: 'carteira', classe: 'rendaFixa', tipoForaDoPlano: null,
    rendaFixa: RF(), aplicacoes: [{ id: 'x2', data: '2026-12-01', valor: 1000 }],
  });
  assert.deepEqual(r.estado.saldos, [{ ativoId: 'x1', data: HOJE, valor: 1002, cotas: null }]);
  assert.ok(tituloCalculado(r.estado.ativos[0]));
  assert.ok(atualizaSozinho(r.estado.ativos[0]));
  const reserva = novoTituloCalculado(estadoVazio(), { nome: 'CDB liquidez', grupo: 'reserva', rendaFixa: RF(), valor: 500, data: HOJE, series: SERIES, hoje: HOJE, novoId: ids() });
  assert.deepEqual([reserva.estado.ativos[0].papel, reserva.estado.ativos[0].classe], ['reserva', null]);
  assert.equal(reserva.estado.saldos[0].valor, 500);
});

test('aplicar mais e resgatar: cada movimento rende da sua data; o valor nunca fica negativo', () => {
  let e = comCdb();
  e = registrarAplicacao(e, 'x1', { valor: -500, data: '2026-12-03', novoId: () => 'r1' });
  const a = e.ativos[0];
  perto(valorBruto(e, a, SERIES, HOJE), 1000 * 1.0005 ** 4 - 500 * 1.0005 ** 2, 0.005);
  assert.equal(aplicadoDoTitulo(e, a), 500);
  const tudo = registrarAplicacao(comCdb(), 'x1', { valor: -5000, data: '2026-12-03', novoId: () => 'r2' });
  assert.equal(valorBruto(tudo, tudo.ativos[0], SERIES, HOJE), 0);
  assert.equal(tituloCalculado({ nome: 'Tesouro', papel: 'carteira' }), false);
});

test('líquido estimado: IR pelo prazo de cada aplicação (mais de 180 dias: 20%); LCI e LCA isentas', () => {
  const cdb = comCdb(RF(), 1000, '2026-06-01');
  // Só os 4 dias de dezembro têm CDI na série inventada: ganho de 2,0015 e 20% de IR.
  perto(liquidoEstimado(cdb, cdb.ativos[0], SERIES, HOJE), 1002.0015 - 2.0015 * 0.2, 0.005);
  const curto = comCdb(RF(), 1000, '2026-12-01'); // 4 dias: 22,5%
  perto(liquidoEstimado(curto, curto.ativos[0], SERIES, HOJE), 1002.0015 - 2.0015 * 0.225, 0.005);
  const lci = comCdb(RF({ tipo: 'lci' }), 1000, '2026-06-01');
  assert.equal(liquidoEstimado(lci, lci.ativos[0], SERIES, HOJE), valorBruto(lci, lci.ativos[0], SERIES, HOJE));
});

test('saldo do dia: grava o bruto só quando muda; aporte do Dia de pagamento conta como aplicação', () => {
  const e = comCdb();
  assert.equal(aplicarRendaFixa(e, SERIES, HOJE), e, 'mesmo valor: o mesmo objeto');
  const comAporte = { ...e, meses: [{ mes: '2026-12', data: '2026-12-03', aplicado: [{ ativoId: 'x1', valor: 500 }] }] };
  const novo = aplicarRendaFixa(comAporte, SERIES, HOJE);
  assert.deepEqual(novo.saldos.at(-1), { ativoId: 'x1', data: HOJE, valor: 1502.5, cotas: null });
  assert.equal(aplicadoDoTitulo(novo, novo.ativos[0]), 1500);
  const antigo = { ...e, ativos: [...e.ativos, { id: 'v', nome: 'Tesouro', papel: 'carteira', classe: 'rendaFixa' }] };
  assert.equal(aplicarRendaFixa(antigo, SERIES, HOJE).saldos.filter((s) => s.ativoId === 'v').length, 0);
});

test('posições: o título calculado tem aplicado das aplicações e ganho sobre ele', () => {
  const e = comCdb();
  const [p] = posicoes(e, HOJE);
  assert.equal(p.saldo, 1002);
  assert.equal(p.aplicado, 1000);
  assert.equal(p.ganho, 2);
});

test('Tesouro: papel automático com quantidade quebrada, no grupo escolhido', () => {
  let { estado } = novoPapel(estadoVazio(), { ticker: 'Tesouro IPCA+ 2035', nome: 'vence em 15/05/2035', grupo: 'reserva', fonte: 'tesouro', cotas: 0.47, preco: 2400, cotacao: 2500.95, hoje: HOJE, novoId: ids() });
  ({ estado } = novoPapel(estado, { ticker: 'Tesouro Selic 2029', nome: 'x', grupo: 'rendaFixa', cotas: 0.1, hoje: HOJE, novoId: ids() }));
  const [t] = estado.ativos;
  assert.equal(t.fonte, 'tesouro');
  assert.equal(t.nome, 'Tesouro IPCA+ 2035', 'o nome do título não vira maiúsculo');
  assert.deepEqual([t.papel, t.classe], ['reserva', null]);
  assert.equal(estado.saldos[0].valor, 1175.45);
  const mais = { ...estado, ativos: estado.ativos.map((a) => (a.id === t.id ? { ...a, compras: [...a.compras, { id: 'c', data: HOJE, cotas: 0.53, preco: null }] } : a)) };
  assert.equal(cotasDoPapel(mais, mais.ativos[0]), 1);
});
