// Carteira (desenho 2026-11-22-carteira): posições, divisão, evolução e proventos, em reais do dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { posicoes, resumoDaCarteira, evolucao, proventosDaCarteira, adicionarAtivo, editarAtivo, tirarAtivo } from '../../js/core/carteira.js';

test('adicionarAtivo: na carteira com a classe; o saldo de hoje (com cotas) vira o primeiro saldo', () => {
  const r = adicionarAtivo(estadoBase(), { nome: ' BOVA11 ', grupo: 'acoes', saldo: 1200, cotas: 10, hoje: HOJE, novoId: () => 'novo' });
  assert.equal(r.id, 'novo');
  assert.deepEqual(r.estado.ativos.at(-1), { id: 'novo', nome: 'BOVA11', ticker: 'BOVA11', papel: 'carteira', classe: 'acoes', tipoForaDoPlano: null });
  assert.deepEqual(r.estado.saldos.at(-1), { ativoId: 'novo', data: HOJE, valor: 1200, cotas: 10 });
});

test('adicionarAtivo: fora da carteira (reserva, fora do plano) não tem classe; sem saldo, nada nos saldos', () => {
  const reserva = adicionarAtivo(estadoBase(), { nome: 'CDB liquidez', grupo: 'reserva', hoje: HOJE, novoId: () => 'r2' });
  assert.deepEqual([reserva.estado.ativos.at(-1).papel, reserva.estado.ativos.at(-1).classe], ['reserva', null]);
  assert.equal(reserva.estado.saldos.length, estadoBase().saldos.length);
  const fora = adicionarAtivo(estadoBase(), { nome: 'Poupança', grupo: 'fora-do-plano', hoje: HOJE, novoId: () => 'p' });
  assert.deepEqual([fora.estado.ativos.at(-1).papel, fora.estado.ativos.at(-1).tipoForaDoPlano], ['fora-do-plano', 'outro']);
});

test('editarAtivo muda o nome e onde o ativo entra; tirarAtivo leva junto os saldos dele', () => {
  const editado = editarAtivo(estadoBase(), 'fii', { nome: 'HGLG11', grupo: 'fora-do-plano' });
  assert.deepEqual(editado.ativos.find((a) => a.id === 'fii'), { id: 'fii', nome: 'HGLG11', ticker: 'XFIX11', papel: 'fora-do-plano', classe: null, tipoForaDoPlano: 'outro' });
  const tirado = tirarAtivo(estadoBase(), 'rf');
  assert.equal(tirado.ativos.some((a) => a.id === 'rf'), false);
  assert.equal(tirado.saldos.some((s) => s.ativoId === 'rf'), false);
});
import { CARTEIRA_PADRAO } from '../../js/core/alocacao.js';
import { perto } from '../ajuda.js';

// Carteira inventada: Tesouro IPCA+ e XFIX11 na carteira, Tesouro Selic na reserva e o FGTS (só informativo).
// Os saldos de dezembro foram copiados no mesmo dia do aporte: o aporte do dia conta depois do saldo (regra do motor).
function estadoBase() {
  return {
    config: { mesInicio: '2026-12' },
    carteiraAlvo: structuredClone(CARTEIRA_PADRAO),
    ativos: [
      { id: 'rf', nome: 'Tesouro IPCA+ 2035', ticker: 'Tesouro IPCA+ 2035', papel: 'carteira', classe: 'rendaFixa' },
      { id: 'fii', nome: 'XFIX11', ticker: 'XFIX11', papel: 'carteira', classe: 'fiis' },
      { id: 'res', nome: 'Tesouro Selic', ticker: 'Tesouro Selic', papel: 'reserva', classe: null },
      { id: 'fgts', nome: 'FGTS', ticker: 'FGTS', papel: 'fgts', classe: null },
    ],
    saldos: [
      { ativoId: 'rf', data: '2026-12-05', valor: 10000, cotas: null },
      { ativoId: 'fii', data: '2026-12-05', valor: 5000, cotas: 500 },
      { ativoId: 'res', data: '2026-12-05', valor: 3000, cotas: null },
      { ativoId: 'fgts', data: '2026-12-05', valor: 8000, cotas: null },
      { ativoId: 'rf', data: '2027-01-06', valor: 11300, cotas: null },
    ],
    meses: [
      { mes: '2026-12', data: '2026-12-05', proventos: 40, aplicado: [{ ativoId: 'rf', valor: 1000, cotas: null }, { ativoId: 'fii', valor: 500, cotas: 50 }] },
      { mes: '2027-01', data: '2027-01-06', proventos: 60, aplicado: [{ ativoId: 'rf', valor: 1000, cotas: null }] },
    ],
  };
}
const HOJE = '2027-01-20';
const de = (lista, id) => lista.find((p) => p.ativo.id === id);

test('posicoes: saldo = último saldo + aportes depois; aplicado = primeiro saldo + aportes depois dele; ganho = a diferença', () => {
  const lista = posicoes(estadoBase(), HOJE);
  const rf = de(lista, 'rf');
  assert.deepEqual([rf.saldo, rf.aplicado, rf.ganho, rf.dataSaldo], [12300, 12000, 300, '2027-01-06']);
  perto(rf.ganhoPct, 0.025, 1e-9);
});

test('posicoes: com um saldo só não há ganho para mostrar; cotas somam as dos aportes depois do saldo', () => {
  const fii = de(posicoes(estadoBase(), HOJE), 'fii');
  assert.deepEqual([fii.saldo, fii.aplicado, fii.ganho, fii.ganhoPct], [5500, 5500, null, null]);
  assert.deepEqual([fii.cotas, fii.valorCota], [550, 10]);
});

test('posicoes: ativo sem saldo digitado vale a soma dos aportes', () => {
  const estado = estadoBase();
  estado.ativos.push({ id: 'aco', nome: 'DIVO11', ticker: 'DIVO11', papel: 'carteira', classe: 'acoes' });
  estado.meses[1].aplicado.push({ ativoId: 'aco', valor: 700, cotas: 7 });
  const aco = de(posicoes(estado, HOJE), 'aco');
  assert.deepEqual([aco.saldo, aco.aplicado, aco.ganho, aco.dataSaldo, aco.cotas], [700, 700, null, null, null]);
});

test('resumoDaCarteira: total sem o FGTS, ganho total e a divisão por classe contra a meta', () => {
  const r = resumoDaCarteira(estadoBase(), HOJE);
  assert.deepEqual([r.total, r.aplicado, r.ganho], [20800, 20500, 300]);
  perto(r.ganhoPct, 300 / 20500, 1e-9);
  assert.equal(r.ultimaAtualizacao, '2027-01-06');
  const rf = r.alocacao.find((a) => a.classe === 'rendaFixa');
  perto(rf.pct, 12300 / 17800, 1e-9);
  assert.equal(rf.meta, 0.4);
  assert.deepEqual(r.alocacao.filter((a) => a.abaixo).map((a) => a.classe), ['acoes', 'exterior']);
  assert.equal(r.carteira, 17800);
});

test('resumoDaCarteira: grupos na ordem do app, só os que têm investimento; o FGTS fica fora da fatia', () => {
  const r = resumoDaCarteira(estadoBase(), HOJE);
  assert.deepEqual(r.grupos.map((g) => g.id), ['rendaFixa', 'fiis', 'reserva', 'fgts']);
  assert.deepEqual(r.grupos.map((g) => g.valor), [12300, 5500, 3000, 8000]);
  perto(r.grupos[0].pct, 12300 / 20800, 1e-9);
  assert.equal(r.grupos[3].pct, null);
});

test('evolucao: patrimônio e aplicado no fim de cada mês, do primeiro mês com saldo ou aporte até hoje', () => {
  assert.deepEqual(evolucao(estadoBase(), HOJE), [
    { mes: '2026-12', patrimonio: 19500, aplicado: 19500 },
    { mes: '2027-01', patrimonio: 20800, aplicado: 20500 },
  ]);
  assert.deepEqual(evolucao({ ...estadoBase(), ativos: [], saldos: [], meses: [] }, HOJE), []);
});

test('proventosDaCarteira: 12 meses até hoje (não antes do início do plano), total, média e rendimento', () => {
  const p = proventosDaCarteira(estadoBase(), HOJE);
  assert.deepEqual(p.meses, [{ mes: '2026-12', valor: 40 }, { mes: '2027-01', valor: 60 }]);
  assert.deepEqual([p.total, p.media], [100, 50]);
  perto(p.rendimento, 100 / 20800, 1e-9);
});
