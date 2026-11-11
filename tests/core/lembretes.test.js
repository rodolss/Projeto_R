import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG_PADRAO, pascoa, feriados, ehDiaUtil, proximoDiaUtil, quintoDiaUtil, dataDoLembrete, montarLembretes, descreverProximo,
} from '../../js/core/lembretes.js';

test('configuração padrão', () => {
  assert.deepEqual(CONFIG_PADRAO, { ligado: true, tipo: 'util', dia: 5, hora: '09:00' });
});
test('Páscoa e feriados móveis', () => {
  assert.equal(pascoa(2025), '2025-04-20');
  assert.equal(pascoa(2026), '2026-04-05');
  assert.equal(pascoa(2027), '2027-03-28');
  const f = feriados(2027);
  for (const d of ['2027-02-08', '2027-02-09', '2027-03-26', '2027-05-27', '2027-01-01', '2027-11-20', '2027-12-25']) assert.ok(f.has(d), d);
});
test('dia útil e próximo dia útil', () => {
  assert.equal(ehDiaUtil('2027-01-01'), false); // feriado
  assert.equal(ehDiaUtil('2027-01-02'), false); // sábado
  assert.equal(ehDiaUtil('2027-01-04'), true);
  assert.equal(proximoDiaUtil('2027-01-02'), '2027-01-04');
  assert.equal(proximoDiaUtil('2027-01-04'), '2027-01-04');
});
test('5º dia útil pula fins de semana e feriados', () => {
  assert.equal(quintoDiaUtil('2027-01'), '2027-01-08'); // 1/1 feriado (sexta)
  assert.equal(quintoDiaUtil('2027-09'), '2027-09-08'); // 7/9 feriado (terça)
  assert.equal(quintoDiaUtil('2027-11'), '2027-11-08'); // 2/11 feriado (terça)
});
test('dia fixo: mês curto e fim de semana/feriado vão para o próximo dia útil', () => {
  const fixo = (dia) => ({ ...CONFIG_PADRAO, tipo: 'fixo', dia });
  assert.equal(dataDoLembrete(fixo(5), '2027-01'), '2027-01-05');
  assert.equal(dataDoLembrete(fixo(2), '2027-01'), '2027-01-04'); // sábado → segunda
  assert.equal(dataDoLembrete(fixo(7), '2027-09'), '2027-09-08'); // feriado → dia seguinte
  assert.equal(dataDoLembrete(fixo(31), '2027-02'), '2027-03-01'); // 28/2 é domingo
});
test('agenda de 3 meses com reforço 3 dias depois', () => {
  const l = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-01T10:00', mesesRegistrados: [] });
  assert.deepEqual(l.map((x) => [x.id, x.quando]), [
    [1, '2027-01-08T09:00'], [2, '2027-01-11T09:00'], [3, '2027-02-05T09:00'],
    [4, '2027-02-08T09:00'], [5, '2027-03-05T09:00'], [6, '2027-03-08T09:00'],
  ]);
  assert.equal(l[0].texto, 'Caiu o salário? Atualize os saldos da corretora e veja quanto investir.');
  assert.equal(l[1].texto, 'O mês ainda não foi registrado. Atualize os saldos e veja quanto investir.');
  assert.ok(l.every((x) => x.titulo === 'Projeto R' && x.rota === '#/mes'));
});
test('mês registrado não tem lembrete; horário passado é pulado; desligado não agenda', () => {
  const sem = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-01T10:00', mesesRegistrados: ['2027-01'] });
  assert.equal(sem[0].quando, '2027-02-05T09:00');
  const depois = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-09T12:00', mesesRegistrados: [] });
  assert.equal(depois[0].quando, '2027-01-11T09:00');
  assert.deepEqual(montarLembretes({ config: { ...CONFIG_PADRAO, ligado: false }, agora: '2027-01-01T10:00', mesesRegistrados: [] }), []);
  assert.equal(montarLembretes({ config: { ...CONFIG_PADRAO, hora: '07:30' }, agora: '2027-01-01T10:00', mesesRegistrados: [] })[0].quando, '2027-01-08T07:30');
});
test('descreverProximo', () => {
  const l = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-01T10:00', mesesRegistrados: [] });
  assert.equal(descreverProximo(l, '2027-01-01T10:00'), 'sex, 8 de jan., por volta das 9h');
  const cedo = montarLembretes({ config: { ...CONFIG_PADRAO, hora: '07:30' }, agora: '2027-01-01T10:00', mesesRegistrados: [] });
  assert.equal(descreverProximo(cedo, '2027-01-01T10:00'), 'sex, 8 de jan., por volta das 7h30');
  assert.equal(descreverProximo([], '2027-01-01T10:00'), null);
});
