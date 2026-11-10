import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazenamento } from './falsos.js';
import { criarArmazem } from '../../js/dados/armazem.js';
import { ErroGitHub } from '../../js/dados/github.js';

// Cliente falso em memória: `remoto` é o que está no GitHub; `falhas` é a fila de erros a lançar no gravar.
function criarCliente({ remoto = null, falhasLer = [], falhasGravar = [] } = {}) {
  const estadoRemoto = { atual: remoto, sha: remoto ? 's1' : null, versao: 1 };
  return {
    estadoRemoto,
    async ler() {
      const f = falhasLer.shift();
      if (f) throw new ErroGitHub(f);
      return estadoRemoto.atual ? { estado: structuredClone(estadoRemoto.atual), sha: estadoRemoto.sha } : null;
    },
    async gravar(estado) {
      const f = falhasGravar.shift();
      if (f) throw new ErroGitHub(f);
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
