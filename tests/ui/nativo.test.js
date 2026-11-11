import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noApp, lerConfig, salvarConfig, agoraLocal, paraMensagem, reagendar } from '../../js/ui/nativo.js';

test('fora do app nada muda (Review Focus 1)', () => {
  assert.equal(noApp({}), false);
  assert.equal(noApp({ ProjetoRAndroid: { postMessage() {} } }), true);
});
test('config: padrão e mesclagem', () => {
  const mem = new Map();
  const arm = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(lerConfig(arm), { ligado: true, tipo: 'util', dia: 5, hora: '09:00' });
  salvarConfig({ ligado: true, tipo: 'fixo', dia: 10, hora: '08:00' }, arm);
  assert.deepEqual(lerConfig(arm), { ligado: true, tipo: 'fixo', dia: 10, hora: '08:00' });
});
test('config ilegível volta ao padrão', () => {
  const arm = { getItem: () => '{quebrado', setItem() {} };
  assert.deepEqual(lerConfig(arm), { ligado: true, tipo: 'util', dia: 5, hora: '09:00' });
});
test('agoraLocal usa o horário local', () => {
  assert.equal(agoraLocal(new Date(2027, 0, 8, 9, 5)), '2027-01-08T09:05');
});
test('paraMensagem converte o horário local em milissegundos', () => {
  const m = paraMensagem([{ id: 1, quando: '2027-01-08T09:00', titulo: 'Projeto R', texto: 't', rota: '#/mes' }]);
  assert.equal(m.tipo, 'agendar');
  assert.equal(m.lembretes[0].quando, new Date(2027, 0, 8, 9, 0).getTime());
});
test('registrar o mês tira os lembretes dele da agenda (Review Focus 2)', () => {
  const enviados = [];
  const estado = { meses: [{ mes: '2027-01' }] };
  reagendar({ estado, config: { ligado: true, tipo: 'util', dia: 5, hora: '09:00' }, agora: '2027-01-01T10:00', enviar: (t) => enviados.push(JSON.parse(t)) });
  assert.equal(enviados.length, 1);
  assert.ok(enviados[0].lembretes.length > 0);
  assert.ok(enviados[0].lembretes.every((l) => new Date(l.quando).getMonth() !== 0));
});
