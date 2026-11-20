import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  faturaDaCompra, periodoDaFatura, cartaoPronto, configurarCartao, adicionarPessoaDoCartao, editarPessoaDoCartao,
  opcoesPara, nomeDoPara, anotarCompra, faturaDoCartao, editarCompraDoCartao, editarFixa, pararFixa, nomesUsados,
  primeiraFatura,
} from '../../js/core/cartao.js';
import { valorDaConta, apagarCompra, conferirFatura } from '../../js/core/casa.js';
import { somarMeses } from '../../js/core/meses.js';

const ids = (prefixo = 'id') => { let n = 0; return () => `${prefixo}${++n}`; };

// Casa inventada: Ana e Leo dividem a casa; o cartão é do Leo (p2), que também compra para a Mãe.
function casaBase(cartao = undefined) {
  return {
    schemaVersion: 2,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [
      { id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Cartão', compraPorCompra: true, arquivada: false },
    ],
    meses: [],
    cartao: cartao === undefined
      ? { donaId: 'p2', viraNoDia: 3, venceNoDia: 10, contaId: 'c2', pessoas: [{ id: 'q1', nome: 'Mãe' }], fixas: [] }
      : cartao,
  };
}

test('fatura da compra: melhor dia 3 e vencimento 10', () => {
  const cfg = { viraNoDia: 3, venceNoDia: 10 };
  assert.equal(faturaDaCompra('2026-11-19', cfg), '2026-12');
  assert.equal(faturaDaCompra('2026-11-03', cfg), '2026-12');
  assert.equal(faturaDaCompra('2026-11-02', cfg), '2026-11');
  assert.equal(faturaDaCompra('2026-12-15', cfg), '2027-01');
});

test('fatura da compra: vencimento antes do melhor dia (fecha num mês, vence no outro)', () => {
  const cfg = { viraNoDia: 26, venceNoDia: 5 };
  assert.equal(faturaDaCompra('2026-11-19', cfg), '2026-12');
  assert.equal(faturaDaCompra('2026-11-26', cfg), '2027-01');
  assert.equal(faturaDaCompra('2026-11-27', cfg), '2027-01');
});

test('fatura da compra: melhor dia 1 (o mês inteiro numa fatura) e melhor dia 31 em mês curto', () => {
  assert.equal(faturaDaCompra('2026-11-01', { viraNoDia: 1, venceNoDia: 10 }), '2026-12');
  assert.equal(faturaDaCompra('2026-11-30', { viraNoDia: 1, venceNoDia: 10 }), '2026-12');
  assert.equal(faturaDaCompra('2027-02-27', { viraNoDia: 31, venceNoDia: 10 }), '2027-03');
  assert.equal(faturaDaCompra('2027-02-28', { viraNoDia: 31, venceNoDia: 10 }), '2027-04');
});

test('período da fatura: de, até e vencimento', () => {
  assert.deepEqual(periodoDaFatura('2026-12', { viraNoDia: 3, venceNoDia: 10 }), { de: '2026-11-03', ate: '2026-12-02', vence: '2026-12-10' });
  assert.deepEqual(periodoDaFatura('2026-12', { viraNoDia: 26, venceNoDia: 5 }), { de: '2026-10-26', ate: '2026-11-25', vence: '2026-12-05' });
  assert.deepEqual(periodoDaFatura('2026-12', { viraNoDia: 1, venceNoDia: 10 }), { de: '2026-11-01', ate: '2026-11-30', vence: '2026-12-10' });
  assert.deepEqual(periodoDaFatura('2027-02', { viraNoDia: 10, venceNoDia: 30 }).vence, '2027-02-28');
});

test('revisão: todo dia do ano cai numa fatura só, dentro do período dela (sem buraco nem sobreposição)', () => {
  for (const cfg of [{ viraNoDia: 3, venceNoDia: 10 }, { viraNoDia: 26, venceNoDia: 5 }, { viraNoDia: 1, venceNoDia: 1 }, { viraNoDia: 31, venceNoDia: 8 }, { viraNoDia: 29, venceNoDia: 30 }]) {
    for (let d = new Date(Date.UTC(2027, 0, 1)); d.getUTCFullYear() < 2029; d.setUTCDate(d.getUTCDate() + 1)) {
      const data = d.toISOString().slice(0, 10);
      const fatura = faturaDaCompra(data, cfg);
      const { de, ate } = periodoDaFatura(fatura, cfg);
      assert.ok(de <= data && data <= ate, `${JSON.stringify(cfg)} ${data} → ${fatura} (${de} a ${ate})`);
      const vizinhas = [somarMeses(fatura, -1), somarMeses(fatura, 1)].map((f) => periodoDaFatura(f, cfg));
      assert.ok(vizinhas.every((p) => data < p.de || data > p.ate), `${data} também em fatura vizinha`);
    }
  }
});

test('configurar o cartão: usa a conta compra por compra; sem ela, cria "Cartão da casa"', () => {
  const casa = configurarCartao(casaBase(null), { donaId: 'p2', viraNoDia: 5, venceNoDia: 12, novoId: ids() });
  assert.deepEqual(casa.cartao, { donaId: 'p2', viraNoDia: 5, venceNoDia: 12, contaId: 'c2', pessoas: [], fixas: [] });
  assert.equal(cartaoPronto(casa), true);
  assert.equal(cartaoPronto(casaBase(null)), false);
  assert.equal(cartaoPronto({ ...casaBase(), cartao: { ...casaBase().cartao, viraNoDia: null } }), false);

  const semConta = { ...casaBase(null), contas: [{ id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false }] };
  const criada = configurarCartao(semConta, { donaId: 'p1', viraNoDia: 5, venceNoDia: 12, novoId: () => 'nova' });
  assert.deepEqual(criada.contas.at(-1), { id: 'nova', nome: 'Cartão da casa', compraPorCompra: true, arquivada: false });
  assert.equal(criada.cartao.contaId, 'nova');

  // Reconfigurar mantém pessoas e as de todo mês.
  const outra = configurarCartao(casaBase(), { viraNoDia: 7, novoId: ids() });
  assert.deepEqual([outra.cartao.viraNoDia, outra.cartao.venceNoDia, outra.cartao.donaId, outra.cartao.pessoas.length], [7, 10, 'p2', 1]);
});

test('pessoas do cartão: adicionar (sem repetir nome), renomear e não usar mais', () => {
  const r = adicionarPessoaDoCartao(casaBase(), { nome: ' Tio ', novoId: () => 'q2' });
  assert.equal(r.id, 'q2');
  assert.deepEqual(r.casa.cartao.pessoas.map((p) => p.nome), ['Mãe', 'Tio']);
  const repetida = adicionarPessoaDoCartao(r.casa, { nome: 'mae', novoId: () => 'q3' });
  assert.equal(repetida.id, 'q1');
  assert.equal(repetida.casa.cartao.pessoas.length, 2);
  const arquivada = editarPessoaDoCartao(r.casa, 'q2', { arquivada: true });
  assert.deepEqual(opcoesPara(arquivada).map((o) => o.nome), ['Casa', 'Leo', 'Ana', 'Mãe']);
  assert.equal(nomeDoPara(arquivada, 'q2'), 'Tio');
  const devolta = adicionarPessoaDoCartao(arquivada, { nome: 'TIO', novoId: () => 'x' });
  assert.equal(devolta.id, 'q2');
  assert.equal(devolta.casa.cartao.pessoas.find((p) => p.id === 'q2').arquivada, false);
  assert.equal(editarPessoaDoCartao(r.casa, 'q2', { nome: ' Tia ' }).cartao.pessoas[1].nome, 'Tia');
});

test('para quem: Casa, a dona, a outra pessoa da casa e as outras; nomes', () => {
  assert.deepEqual(opcoesPara(casaBase()), [{ id: 'casa', nome: 'Casa' }, { id: 'p2', nome: 'Leo' }, { id: 'p1', nome: 'Ana' }, { id: 'q1', nome: 'Mãe' }]);
  assert.equal(nomeDoPara(casaBase(), undefined), 'Casa');
  assert.equal(nomeDoPara(casaBase(), 'p1'), 'Ana');
  assert.equal(nomeDoPara(casaBase(), 'sumiu'), 'Outra pessoa');
});

test('anotar compra: vai para a fatura da data, com data e para quem', () => {
  const casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: ' Mercado ', valor: 100.456, para: 'casa', novoId: () => 'k1' });
  assert.deepEqual(casa.meses, [{
    mes: '2026-12', salarios: {}, valores: {},
    compras: [{ id: 'k1', contaId: 'c2', nome: 'Mercado', valor: 100.46, data: '2026-11-19', para: 'casa' }],
  }]);
  // Fatura escolhida à mão vale mais que a data.
  const mao = anotarCompra(casaBase(), { data: '2026-11-19', fatura: '2027-01', nome: 'X', valor: 1, para: 'p2', novoId: ids() });
  assert.equal(mao.meses[0].mes, '2027-01');
});

test('anotar parcelada e de todo mês', () => {
  const parcelada = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Sofá', valor: 100, vezes: 3, para: 'casa', novoId: ids() });
  assert.deepEqual(parcelada.meses.map((m) => [m.mes, m.compras[0].parcela.n, m.compras[0].data]), [
    ['2026-12', 1, '2026-11-19'], ['2027-01', 2, '2026-11-19'], ['2027-02', 3, '2026-11-19'],
  ]);
  const fixa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Streaming', valor: 39.9, todoMes: true, para: 'p2', novoId: () => 'f1' });
  assert.deepEqual(fixa.cartao.fixas, [{ id: 'f1', nome: 'Streaming', valor: 39.9, para: 'p2', desde: '2026-12' }]);
  assert.deepEqual(fixa.meses, []);
});

test('fatura do cartão: compras (mais nova primeiro), de todo mês, total e quanto é de cada um', () => {
  let casa = casaBase();
  const novoId = ids('k');
  casa = anotarCompra(casa, { data: '2026-11-05', nome: 'Farmácia', valor: 30, para: 'q1', novoId });
  casa = anotarCompra(casa, { data: '2026-11-19', nome: 'Mercado', valor: 100, para: 'casa', novoId });
  casa = anotarCompra(casa, { data: '2026-11-19', nome: 'Blusa', valor: 80, para: 'p2', novoId });
  casa = anotarCompra(casa, { data: '2026-11-10', nome: 'Streaming', valor: 40, todoMes: true, para: 'casa', novoId });
  casa = anotarCompra(casa, { data: '2026-11-10', nome: 'Academia', valor: 90, todoMes: true, para: 'p2', novoId });
  // Compra antiga, sem data nem para quem (da casa), e compra de outra conta que não aparece.
  casa.meses[0].compras.push({ id: 'velha', contaId: 'c2', nome: 'Antiga', valor: 10 }, { id: 'outra', contaId: 'c1', nome: 'Nada', valor: 999 });
  const f = faturaDoCartao(casa, '2026-12');
  assert.deepEqual(f.compras.map((c) => c.nome), ['Blusa', 'Mercado', 'Farmácia', 'Antiga']);
  assert.equal(f.compras.at(-1).para, 'casa');
  assert.deepEqual(f.fixas.map((x) => x.nome), ['Streaming', 'Academia']);
  assert.equal(f.total, 350);
  assert.deepEqual(f.porPessoa, [
    { para: 'casa', nome: 'Casa', valor: 150 }, { para: 'p2', nome: 'Leo', valor: 170 }, { para: 'q1', nome: 'Mãe', valor: 30 },
  ]);
  assert.equal(f.conferida, false);
  assert.equal(valorDaConta(casa, '2026-12', 'c2').valor, 150);
  assert.equal(faturaDoCartao(conferirFatura(casa, { mes: '2026-12', contaId: 'c2' }), '2026-12').conferida, true);
  // Fatura sem nada.
  assert.deepEqual(faturaDoCartao(casaBase(), '2027-05'), { fatura: '2027-05', compras: [], fixas: [], total: 0, porPessoa: [], conferida: false });
});

test('editar compra à vista: muda tudo e pode trocar de fatura', () => {
  let casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Mercado', valor: 100, para: 'casa', novoId: () => 'k1' });
  casa = editarCompraDoCartao(casa, { fatura: '2026-12', compraId: 'k1', nome: 'Feira', valor: 50, para: 'q1', data: '2026-11-20' });
  assert.deepEqual(casa.meses[0].compras[0], { id: 'k1', contaId: 'c2', nome: 'Feira', valor: 50, data: '2026-11-20', para: 'q1' });
  const movida = editarCompraDoCartao(casa, { fatura: '2026-12', compraId: 'k1', novaFatura: '2027-01' });
  assert.deepEqual(movida.meses.map((m) => [m.mes, m.compras.map((c) => c.id)]), [['2027-01', ['k1']]]);
  assert.equal(editarCompraDoCartao(casa, { fatura: '2026-12', compraId: 'nao-existe', nome: 'x' }), casa);
});

test('revisão: editar uma parcela do meio muda ela e as seguintes, não as anteriores', () => {
  let casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Sofá', valor: 100, vezes: 4, para: 'casa', novoId: ids() });
  casa = editarCompraDoCartao(casa, { fatura: '2027-01', compraId: casa.meses[1].compras[0].id, nome: 'Sofá novo', valor: 120, para: 'p1', data: '2026-12-25', novaFatura: '2027-06' });
  assert.deepEqual(casa.meses.map((m) => [m.mes, m.compras[0].nome, m.compras[0].valor, m.compras[0].para, m.compras[0].data]), [
    ['2026-12', 'Sofá', 100, 'casa', '2026-11-19'],
    ['2027-01', 'Sofá novo', 120, 'p1', '2026-11-19'],
    ['2027-02', 'Sofá novo', 120, 'p1', '2026-11-19'],
    ['2027-03', 'Sofá novo', 120, 'p1', '2026-11-19'],
  ]);
  // Apagar a do meio leva as seguintes e deixa a anterior.
  const apagada = apagarCompra(casa, { mes: '2027-01', compraId: casa.meses[1].compras[0].id });
  assert.deepEqual(apagada.meses.map((m) => m.mes), ['2026-12']);
});

test('fatura conferida acompanha a parte da casa quando uma compra muda de pessoa', () => {
  let casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Mercado', valor: 100, para: 'casa', novoId: () => 'k1' });
  casa = conferirFatura(casa, { mes: '2026-12', contaId: 'c2' });
  casa = editarCompraDoCartao(casa, { fatura: '2026-12', compraId: 'k1', para: 'p2' });
  assert.equal(casa.meses[0].valores.c2, 0);
});

test('revisão: mudar o valor de uma de todo mês numa fatura futura não muda as anteriores', () => {
  let casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Streaming', valor: 40, todoMes: true, para: 'casa', novoId: () => 'f1' });
  casa = editarFixa(casa, { fixaId: 'f1', fatura: '2027-03', valor: 45, novoId: () => 'f2' });
  assert.deepEqual(casa.cartao.fixas, [
    { id: 'f1', nome: 'Streaming', valor: 40, para: 'casa', desde: '2026-12', ate: '2027-02' },
    { id: 'f2', nome: 'Streaming', valor: 45, para: 'casa', desde: '2027-03', serie: 'f1' },
  ]);
  assert.equal(faturaDoCartao(casa, '2027-02').total, 40);
  assert.equal(faturaDoCartao(casa, '2027-03').total, 45);
  // Na primeira fatura dela, muda no lugar; sem mudança nenhuma, nada muda.
  const noLugar = editarFixa(casa, { fixaId: 'f1', fatura: '2026-12', nome: 'Filmes', novoId: () => 'nao' });
  assert.deepEqual(noLugar.cartao.fixas.map((f) => [f.id, f.nome]), [['f1', 'Filmes'], ['f2', 'Streaming']]);
  assert.equal(editarFixa(casa, { fixaId: 'f2', fatura: '2027-05', valor: 45, novoId: () => 'nao' }), casa);
});

test('parar uma de todo mês: some desta fatura em diante; na primeira, sai de vez', () => {
  let casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Streaming', valor: 40, todoMes: true, para: 'casa', novoId: () => 'f1' });
  const parada = pararFixa(casa, { fixaId: 'f1', fatura: '2027-02' });
  assert.equal(parada.cartao.fixas[0].ate, '2027-01');
  assert.equal(faturaDoCartao(parada, '2027-02').total, 0);
  assert.equal(faturaDoCartao(parada, '2027-01').total, 40);
  assert.deepEqual(pararFixa(casa, { fixaId: 'f1', fatura: '2026-12' }).cartao.fixas, []);
});

test('nomes usados: os mais recentes primeiro, sem repetir, com para quem foi da última vez', () => {
  let casa = casaBase();
  const novoId = ids();
  casa = anotarCompra(casa, { data: '2026-10-10', nome: 'Gasolina', valor: 100, para: 'p2', novoId });
  casa = anotarCompra(casa, { data: '2026-11-10', nome: 'gasolina', valor: 100, para: 'casa', novoId });
  casa = anotarCompra(casa, { data: '2026-11-11', nome: 'Farmácia', valor: 10, para: 'q1', novoId });
  casa = anotarCompra(casa, { data: '2026-11-11', nome: 'Streaming', valor: 40, todoMes: true, para: 'p2', novoId });
  assert.deepEqual(nomesUsados(casa), [
    { nome: 'Farmácia', para: 'q1' }, { nome: 'gasolina', para: 'casa' }, { nome: 'Streaming', para: 'p2' },
  ]);
});

test('primeira fatura com compras ou de todo mês', () => {
  assert.equal(primeiraFatura(casaBase()), null);
  let casa = anotarCompra(casaBase(), { data: '2027-01-19', nome: 'A', valor: 1, para: 'casa', novoId: ids() });
  assert.equal(primeiraFatura(casa), '2027-02');
  casa = anotarCompra(casa, { data: '2026-11-19', nome: 'B', valor: 1, todoMes: true, para: 'casa', novoId: ids('f') });
  assert.equal(primeiraFatura(casa), '2026-12');
});

test('revisão: parar uma de todo mês que já mudou de valor para também os trechos seguintes', () => {
  let casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Academia', valor: 90, todoMes: true, para: 'p2', novoId: () => 'f1' });
  casa = editarFixa(casa, { fixaId: 'f1', fatura: '2027-02', valor: 95, novoId: () => 'f2' });
  assert.equal(casa.cartao.fixas[1].serie, 'f1');
  const parada = pararFixa(casa, { fixaId: 'f1', fatura: '2027-01' });
  assert.deepEqual(parada.cartao.fixas.map((f) => [f.id, f.ate ?? null]), [['f1', '2026-12']]);
  for (const m of ['2027-01', '2027-02', '2027-06']) assert.equal(faturaDoCartao(parada, m).total, 0, m);
  assert.equal(faturaDoCartao(parada, '2026-12').total, 90);
  // Parar no trecho mais novo não mexe no anterior.
  const depois = pararFixa(casa, { fixaId: 'f2', fatura: '2027-04' });
  assert.deepEqual(depois.cartao.fixas.map((f) => [f.id, f.ate ?? null]), [['f1', '2027-01'], ['f2', '2027-03']]);
});

test('revisão: mudar uma de todo mês num trecho antigo vale desta fatura em diante, também depois do trecho seguinte', () => {
  let casa = anotarCompra(casaBase(), { data: '2026-11-19', nome: 'Academia', valor: 90, todoMes: true, para: 'p2', novoId: () => 'f1' });
  casa = editarFixa(casa, { fixaId: 'f1', fatura: '2027-03', valor: 95, novoId: () => 'f2' });
  // Só o nome: os preços planejados ficam.
  const renomeada = editarFixa(casa, { fixaId: 'f1', fatura: '2027-01', nome: 'Pilates', valor: 90, para: 'p2', novoId: () => 'f3' });
  assert.deepEqual(['2026-12', '2027-01', '2027-03', '2027-08'].map((m) => faturaDoCartao(renomeada, m).fixas.map((f) => `${f.nome} ${f.valor}`).join()), [
    'Academia 90', 'Pilates 90', 'Pilates 95', 'Pilates 95',
  ]);
  // O valor: vale para todas as faturas desta em diante.
  const outroValor = editarFixa(casa, { fixaId: 'f1', fatura: '2027-01', nome: 'Academia', valor: 100, para: 'p2', novoId: () => 'f4' });
  assert.deepEqual(['2026-12', '2027-01', '2027-03', '2027-08'].map((m) => faturaDoCartao(outroValor, m).total), [90, 100, 100, 100]);
});
