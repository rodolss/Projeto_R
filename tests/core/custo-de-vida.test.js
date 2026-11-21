import { test } from 'node:test';
import assert from 'node:assert/strict';
import { custoDeVidaReal, orcamentoPelaCasa, ID_GASTO_REAL } from '../../js/core/custo-de-vida.js';
import { migrarCasa, salvarValor, salvarSalario } from '../../js/core/casa.js';
import { anotarCompra } from '../../js/core/cartao.js';

// Casa inventada: Ana (p1) ganha 6000 e Leo (p2) 4000 — a Ana paga 60% das contas. A Luz de ago, set e out: 200, 300, 400.
function casaBase() {
  let casa = migrarCasa({
    schemaVersion: 3, pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false }, { id: 'c2', nome: 'Cartão Ana', compraPorCompra: true, arquivada: false }],
    meses: [], cartoes: [{ id: 'c2', contaId: 'c2', donaId: 'p1', viraNoDia: 3, venceNoDia: 10, fixas: [] }], outrasPessoas: [],
  });
  for (const [mes, luz] of [['2026-08', 200], ['2026-09', 300], ['2026-10', 400]]) {
    casa = salvarSalario(salvarSalario(casa, { mes, pessoaId: 'p1', valor: 6000 }), { mes, pessoaId: 'p2', valor: 4000 });
    casa = salvarValor(casa, { mes, contaId: 'c1', valor: luz });
    casa = salvarValor(casa, { mes, contaId: 'c2', valor: 0 });
  }
  return casa;
}
const HOJE = '2026-11-21';

test('custo de vida real: média da sua parte das contas nos meses fechados; o mês atual não entra', () => {
  const r = custoDeVidaReal(casaBase(), 'p1', HOJE);
  assert.deepEqual(r.meses.map((m) => [m.mes, m.valor]), [['2026-08', 120], ['2026-09', 180], ['2026-10', 240]]);
  assert.equal(r.media, 180);
  assert.equal(r.contas, 180);
  assert.equal(r.cartao, 0);
  assert.equal(custoDeVidaReal(casaBase(), 'p1', '2026-08-15'), null); // nenhum mês fechado antes de agosto
  assert.equal(custoDeVidaReal(null, 'p1', HOJE), null);
});

test('custo de vida real: o que é seu no cartão entra (com o que já tinha guardado); o de outras pessoas, não', () => {
  let casa = casaBase();
  let n = 0;
  const anotar = (dados) => { casa = anotarCompra(casa, { cartaoId: 'c2', novoId: () => `k${++n}`, ...dados }); };
  anotar({ data: '2026-10-01', nome: 'Tênis', valor: 300, para: 'p1', jaTenho: true }); // fatura de outubro
  anotar({ data: '2026-10-01', nome: 'Presente', valor: 90, para: 'p2' });
  const out = custoDeVidaReal(casa, 'p1', HOJE).meses.find((m) => m.mes === '2026-10');
  assert.equal(out.cartao, 300);
  assert.equal(out.contas, 240);
});

test('orçamento pela casa: vira o gasto real, guarda as categorias digitadas e fica em dia sem regravar', () => {
  const estado = { orcamento: [{ id: 'm', nome: 'Moradia', tipo: 'mensal', valor: 1500, mes: '2026-05' }], config: { ultimaRevisaoOrcamento: '2026-05', swr: 0.04 } };
  const novo = orcamentoPelaCasa(estado, { casa: casaBase(), pessoaId: 'p1', hoje: HOJE });
  assert.deepEqual(novo.orcamento, [{ id: ID_GASTO_REAL, nome: 'Gasto real (média do Balanço)', tipo: 'mensal', valor: 180, mes: '2026-11' }]);
  assert.deepEqual(novo.orcamentoManual, estado.orcamento);
  assert.equal(novo.config.ultimaRevisaoOrcamento, '2026-11');
  assert.equal(novo.config.swr, 0.04);
  assert.equal(orcamentoPelaCasa(novo, { casa: casaBase(), pessoaId: 'p1', hoje: HOJE }), novo); // em dia: o mesmo objeto
  // Outro valor no mês seguinte: atualiza, e as categorias guardadas continuam as de antes.
  const depois = orcamentoPelaCasa(novo, { casa: salvarValor(casaBase(), { mes: '2026-11', contaId: 'c1', valor: 100 }), pessoaId: 'p1', hoje: '2026-12-02' });
  assert.deepEqual(depois.orcamentoManual, estado.orcamento);
  assert.equal(depois.orcamento[0].mes, '2026-12');
  assert.equal(orcamentoPelaCasa(estado, { casa: null, pessoaId: 'p1', hoje: HOJE }), estado); // sem casa: nada muda
});
