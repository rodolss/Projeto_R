import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balancoDoMes } from '../../js/core/balanco.js';
import { migrarCasa, salvarValor, salvarSalario, conferirFatura } from '../../js/core/casa.js';
import { anotarCompra, adicionarCartao } from '../../js/core/cartao.js';
import { adicionarPerfil } from '../../js/core/perfis.js';

const ids = (prefixo = 'k') => { let n = 0; return () => `${prefixo}${++n}`; };

// Casa inventada: Ana (p1) e Leo (p2) dividem a casa; o cartão c2 é do Leo (vira 3, vence 10); a Mãe é outra pessoa.
// Dezembro: salários 6000 e 4000; Luz 200; no cartão, Mercado 100 (casa), Blusa 80 e Academia 90 (todo mês) do Leo,
// Farmácia 30 da Mãe (já tenho) e um Presente 50 para a Ana.
function casaBase() {
  let casa = migrarCasa({
    schemaVersion: 3,
    pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
    contas: [
      { id: 'c1', nome: 'Luz', compraPorCompra: false, arquivada: false },
      { id: 'c2', nome: 'Cartão Leo', compraPorCompra: true, arquivada: false },
    ],
    meses: [],
    cartoes: [{ id: 'c2', contaId: 'c2', donaId: 'p2', viraNoDia: 3, venceNoDia: 10, fixas: [] }],
    outrasPessoas: [{ id: 'q1', nome: 'Mãe' }],
  });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p1', valor: 6000 });
  casa = salvarSalario(casa, { mes: '2026-12', pessoaId: 'p2', valor: 4000 });
  casa = salvarValor(casa, { mes: '2026-12', contaId: 'c1', valor: 200 });
  const novoId = ids();
  const anotar = (dados) => { casa = anotarCompra(casa, { cartaoId: 'c2', data: '2026-11-19', novoId, ...dados }); };
  anotar({ nome: 'Mercado', valor: 100, para: 'casa' });
  anotar({ nome: 'Blusa', valor: 80, para: 'p2' });
  anotar({ nome: 'Academia', valor: 90, para: 'p2', todoMes: true });
  anotar({ nome: 'Farmácia', valor: 30, para: 'q1', jaTenho: true });
  anotar({ nome: 'Presente', valor: 50, para: 'p1' });
  return casa;
}

test('balanço: entrou o salário; saiu a parte das contas e o que é seu no cartão; outras pessoas à parte', () => {
  const casa = conferirFatura(casaBase(), { mes: '2026-12', contaId: 'c2' });
  const leo = balancoDoMes(casa, '2026-12', 'p2', '2026-12-20');
  assert.deepEqual(leo.salario, { valor: 4000, situacao: 'confirmado', deOnde: null });
  // Contas: Luz 200 + a parte da casa do cartão 100 = 300; o Leo ganha 40% da renda e paga 120.
  assert.deepEqual(leo.contas, { valor: 120, total: 300, fatia: 0.03, aConfirmar: false });
  // A parte da casa do cartão já está nas contas: no cartão entra só o que é dele (Blusa + Academia).
  assert.deepEqual(leo.cartoes, [{
    cartaoId: 'c2', nome: 'Cartão Leo', seu: 170, daCasa: 100, outras: { valor: 80, jaTenho: 30, falta: 50 }, aberta: false, conferida: true,
  }]);
  assert.deepEqual([leo.entrou, leo.saiu, leo.sobra, leo.previsao], [4000, 290, 3710, false]);
  // O cartão do Leo é só dele: o presente para a Ana não aparece no balanço dela.
  const ana = balancoDoMes(casa, '2026-12', 'p1', '2026-12-20');
  assert.deepEqual([ana.entrou, ana.contas.valor, ana.cartoes, ana.saiu, ana.sobra], [6000, 180, [], 180, 5820]);
  // Fatura ainda aberta e não conferida: previsão.
  const aberta = balancoDoMes(casaBase(), '2026-12', 'p2', '2026-11-25');
  assert.equal(aberta.cartoes[0].aberta, true);
  assert.equal(aberta.contas.aConfirmar, true);
  assert.equal(aberta.previsao, true);
});

test('balanço: salário a confirmar, sem divisão e perfil que não divide a casa', () => {
  const previsto = balancoDoMes(casaBase(), '2027-01', 'p2', '2026-12-20');
  assert.deepEqual(previsto.salario, { valor: 4000, situacao: 'a-confirmar', deOnde: '2026-12' });
  assert.equal(previsto.previsao, true);

  let semSalario = salvarSalario(casaBase(), { mes: '2026-12', pessoaId: 'p1', valor: null });
  semSalario = salvarSalario(semSalario, { mes: '2026-12', pessoaId: 'p2', valor: null });
  const sem = balancoDoMes(semSalario, '2026-12', 'p2', '2026-12-20');
  assert.deepEqual([sem.salario.situacao, sem.contas.valor, sem.contas.fatia, sem.entrou, sem.saiu, sem.sobra], ['vazio', null, null, 0, 170, -170]);

  let comPerfil = adicionarPerfil(casaBase(), { nome: 'Bia', novoId: () => 'x9' }).casa;
  comPerfil = adicionarCartao(comPerfil, { donaId: 'x9', viraNoDia: 3, venceNoDia: 10, novoId: () => 'c9' }).casa;
  comPerfil = anotarCompra(comPerfil, { cartaoId: 'c9', data: '2026-11-19', nome: 'Livro', valor: 40, para: 'x9', novoId: () => 'k99' });
  const bia = balancoDoMes(comPerfil, '2026-12', 'x9', '2026-12-20');
  assert.deepEqual([bia.salario, bia.contas, bia.cartoes.map((c) => c.seu), bia.entrou, bia.saiu, bia.sobra], [null, null, [40], 0, 40, -40]);
});
