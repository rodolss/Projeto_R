import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaDasContas } from '../../js/core/media-contas.js';
import { migrarCasa, salvarValor } from '../../js/core/casa.js';

function casaCom(valores) {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [{ id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false }],
    meses: [], cartoes: [], outrasPessoas: [],
  });
  for (const [mes, valor] of Object.entries(valores)) casa = salvarValor(casa, { mes, contaId: 'c1', valor });
  return casa;
}

test('média das contas: dos meses anteriores com valor; o mês visto fica de fora e mostra a diferença', () => {
  const casa = casaCom({ '2026-09': 900, '2026-10': 1100, '2026-11': 1000, '2026-12': 1200 });
  const m = mediaDasContas(casa, '2026-12');
  assert.deepEqual([m.media, m.meses, Math.round(m.diferenca * 1000) / 1000], [1000, 3, 0.2]); // dezembro 20% acima
  const abaixo = mediaDasContas(casaCom({ '2026-10': 1000, '2026-11': 1000, '2026-12': 800 }), '2026-12');
  assert.equal(Math.round(abaixo.diferenca * 100), -20);
});

test('média das contas: só até 12 meses para trás; sem nenhum mês anterior, nada; mês só previsto', () => {
  assert.equal(mediaDasContas(casaCom({ '2026-12': 500 }), '2026-12'), null);
  const velho = casaCom({ '2025-10': 9999, '2025-12': 100, '2026-12': 100 }); // 2025-10 está a 14 meses
  assert.deepEqual([mediaDasContas(velho, '2026-12').media, mediaDasContas(velho, '2026-12').meses], [100, 1]);
  const semAtual = mediaDasContas(casaCom({ '2026-10': 100 }), '2026-12'); // dezembro só repete a previsão de outubro
  assert.deepEqual([semAtual.media, semAtual.diferenca], [100, 0]);
});
