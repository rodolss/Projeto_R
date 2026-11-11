import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazenamento } from './falsos.js';
import { criarArmazem } from '../../js/dados/armazem.js';
import { ErroGitHub } from '../../js/dados/github.js';

// Cliente falso em memória: `remoto` é o que está no GitHub; `falhas` é a fila de erros a lançar no gravar.
// Como o GitHub, recusa gravar com sha desatualizado (conflito).
function criarCliente({ remoto = null, falhasLer = [], falhasGravar = [], atraso = 0, aoGravar = null } = {}) {
  const estadoRemoto = { atual: remoto, sha: remoto ? 's1' : null, versao: 1 };
  return {
    estadoRemoto,
    async ler() {
      const f = falhasLer.shift();
      if (f) throw new ErroGitHub(f);
      return estadoRemoto.atual ? { estado: structuredClone(estadoRemoto.atual), sha: estadoRemoto.sha } : null;
    },
    async gravar(estado, sha) {
      aoGravar?.();
      if (atraso) await new Promise((r) => setTimeout(r, atraso));
      const f = falhasGravar.shift();
      if (f) throw new ErroGitHub(f);
      if (estadoRemoto.atual && sha !== estadoRemoto.sha) throw new ErroGitHub('conflito');
      estadoRemoto.versao += 1;
      estadoRemoto.atual = structuredClone(estado);
      estadoRemoto.sha = `s${estadoRemoto.versao}`;
      return estadoRemoto.sha;
    },
  };
}

const local = (estado) => ({ 'projetoR.estado': JSON.stringify(estado) });

test('carregar traz o remoto e guarda localmente', async () => {
  const armazenamento = criarArmazenamento();
  const a = criarArmazem({ armazenamento, cliente: criarCliente({ remoto: { schemaVersion: 1, y: 2 } }) });
  const r = await a.carregar();
  assert.equal(r.origem, 'remoto');
  assert.equal(JSON.parse(armazenamento.mem['projetoR.estado']).y, 2);
});
test('salvar grava local e remoto', async () => {
  const armazenamento = criarArmazenamento(local({ schemaVersion: 1 }));
  const cliente = criarCliente({ remoto: { schemaVersion: 1 } });
  const r = await criarArmazem({ armazenamento, cliente }).salvar((e) => ({ ...e, x: 1 }));
  assert.equal(r.sincronizado, true);
  assert.equal(JSON.parse(armazenamento.mem['projetoR.estado']).x, 1);
  assert.equal(cliente.estadoRemoto.atual.x, 1);
});
test('conflito reaplica a mutação sobre o remoto', async () => {
  const armazenamento = criarArmazenamento(local({ schemaVersion: 1 }));
  const cliente = criarCliente({ remoto: { schemaVersion: 1, y: 2 }, falhasGravar: ['conflito'] });
  const r = await criarArmazem({ armazenamento, cliente }).salvar((e) => ({ ...e, x: 1 }));
  assert.equal(r.aviso, 'conflito-resolvido');
  assert.deepEqual([r.estado.x, r.estado.y], [1, 2]);
  assert.deepEqual([cliente.estadoRemoto.atual.x, cliente.estadoRemoto.atual.y], [1, 2]);
});
test('offline marca pendente e sincroniza depois', async () => {
  const armazenamento = criarArmazenamento(local({ schemaVersion: 1 }));
  const cliente = criarCliente({ remoto: { schemaVersion: 1 }, falhasGravar: ['rede'] });
  const a = criarArmazem({ armazenamento, cliente });
  const r = await a.salvar((e) => ({ ...e, x: 1 }));
  assert.equal(r.aviso, 'offline');
  assert.equal(r.sincronizado, false);
  assert.equal(armazenamento.mem['projetoR.pendente'], '1');
  await a.sincronizarPendentes();
  assert.equal(armazenamento.mem['projetoR.pendente'], undefined);
  assert.equal(cliente.estadoRemoto.atual.x, 1);
});
test('carregar com pendência envia o local primeiro', async () => {
  const armazenamento = criarArmazenamento({ ...local({ schemaVersion: 1, x: 9 }), 'projetoR.pendente': '1' });
  const cliente = criarCliente({ remoto: { schemaVersion: 1, x: 1 } });
  const r = await criarArmazem({ armazenamento, cliente }).carregar();
  assert.equal(r.estado.x, 9);
  assert.equal(cliente.estadoRemoto.atual.x, 9);
});
test('token inválido mantém os dados locais', async () => {
  const armazenamento = criarArmazenamento(local({ schemaVersion: 1, x: 1 }));
  const r = await criarArmazem({ armazenamento, cliente: criarCliente({ falhasLer: ['token-invalido'] }) }).carregar();
  assert.equal(r.origem, 'local');
  assert.equal(r.aviso, 'token-invalido');
  assert.equal(r.estado.x, 1);
});
test('sem cliente funciona só com dados locais', async () => {
  const armazenamento = criarArmazenamento();
  const a = criarArmazem({ armazenamento, cliente: null });
  assert.equal((await a.carregar()).origem, 'vazio');
  const r = await a.salvar(() => ({ schemaVersion: 1, z: 3 }));
  assert.equal(r.sincronizado, false);
  assert.equal((await a.carregar()).estado.z, 3);
});

test('marca pendente antes de enviar (revisão I4)', async () => {
  const armazenamento = criarArmazenamento(local({ schemaVersion: 1 }));
  let pendenteDuranteEnvio = null;
  const cliente = criarCliente({ aoGravar: () => { pendenteDuranteEnvio = armazenamento.mem['projetoR.pendente']; } });
  await criarArmazem({ armazenamento, cliente }).salvar((e) => ({ ...e, x: 1 }));
  assert.equal(pendenteDuranteEnvio, '1');
  assert.equal(armazenamento.mem['projetoR.pendente'], undefined);
});
test('salvamentos seguidos não se atropelam (revisão I4)', async () => {
  const armazenamento = criarArmazenamento(local({ schemaVersion: 1, n: 0 }));
  const cliente = criarCliente({ atraso: 10 });
  const a = criarArmazem({ armazenamento, cliente });
  await Promise.all([a.salvar((e) => ({ ...e, n: e.n + 1 })), a.salvar((e) => ({ ...e, n: e.n + 1 }))]);
  assert.equal(JSON.parse(armazenamento.mem['projetoR.estado']).n, 2);
  assert.equal(cliente.estadoRemoto.atual.n, 2);
});
test('pendente + remoto alterado em outro aparelho: mescla em vez de sobrescrever (revisão I3)', async () => {
  const comum = { schemaVersion: 1, meses: [{ mes: '2026-11', recebido: 1 }] };
  const celular = { schemaVersion: 1, meses: [...comum.meses, { mes: '2026-12', recebido: 2 }] };
  const armazenamento = criarArmazenamento({
    ...local(celular), 'projetoR.base': JSON.stringify(comum), 'projetoR.sha': 's1', 'projetoR.pendente': '1',
  });
  const cliente = criarCliente({ remoto: comum });
  cliente.estadoRemoto.atual = { schemaVersion: 1, meses: [...comum.meses, { mes: '2027-01', recebido: 3 }, { mes: '2027-02', recebido: 4 }] };
  cliente.estadoRemoto.sha = 's9';
  const r = await criarArmazem({ armazenamento, cliente }).carregar();
  assert.deepEqual(cliente.estadoRemoto.atual.meses.map((m) => m.mes), ['2026-11', '2026-12', '2027-01', '2027-02']);
  assert.equal(r.aviso, 'conflito-resolvido');
  assert.equal(r.estado.meses.length, 4);
});
test('dados locais corrompidos não travam o app (revisão I9)', async () => {
  const armazenamento = criarArmazenamento({ 'projetoR.estado': '{quebrado' });
  const r = await criarArmazem({ armazenamento, cliente: null }).carregar();
  assert.equal(r.estado, null);
  assert.equal(r.aviso, 'dados-locais-invalidos');
  assert.equal(armazenamento.mem['projetoR.estado.corrompido'], '{quebrado');
});
test('carregarLocal devolve a cópia local sem esperar a rede (revisão I9)', () => {
  const armazenamento = criarArmazenamento(local({ schemaVersion: 1, x: 5 }));
  assert.equal(criarArmazem({ armazenamento, cliente: criarCliente() }).carregarLocal().estado.x, 5);
});
test('remoto da v1 chega migrado para a v2', async () => {
  const armazenamento = criarArmazenamento();
  const a = criarArmazem({ armazenamento, cliente: criarCliente({ remoto: { schemaVersion: 1, x: 1 } }) });
  const r = await a.carregar();
  assert.equal(r.estado.schemaVersion, 2);
  assert.deepEqual(r.estado.marcos, {});
  assert.equal(r.estado.x, 1);
});
