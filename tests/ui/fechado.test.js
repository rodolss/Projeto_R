// A trava dos meses (js/ui/fechado.js) roda de verdade, com um document de mentira: pega import faltando e erro de
// execução que só apareceriam na tela (Contas, Balanço e Cartão desenham a trava em todo carregamento).
import test from 'node:test';
import assert from 'node:assert/strict';

const el = () => ({ attrs: {}, filhos: [], addEventListener() {}, setAttribute(k, v) { this.attrs[k] = v; }, append(...f) { this.filhos.push(...f); } });
globalThis.document = { createElement: () => el() };
const { travaDoMes } = await import('../../js/ui/fechado.js');

const casa = { pessoas: [{ id: 'p1', nome: 'Ana' }], contas: [], cartoes: [], meses: [] };
const ctx = (hoje, visto = { id: 'p1' }) => ({ casa, hoje, perfil: { visto }, aviso() {}, rerender() {}, salvarCasa: async () => {} });

test('trava do mês roda: antigo definitivo (cadeado sem toque), mês anterior destrava, atual livre', () => {
  const antigo = travaDoMes({ ctx: ctx('2026-11-21'), mes: '2026-09' });
  assert.equal(antigo.estado, 'definitivo');
  assert.ok(antigo.cadeado);
  const anterior = travaDoMes({ ctx: ctx('2026-11-21'), mes: '2026-10' });
  assert.equal(anterior.estado, 'fechado');
  assert.ok(anterior.cadeado);
  const atual = travaDoMes({ ctx: ctx('2026-11-21'), mes: '2026-11' });
  assert.equal(atual.estado, 'livre');
  assert.equal(atual.cadeado, false);
  assert.doesNotThrow(() => antigo.avisarTravado());
});
