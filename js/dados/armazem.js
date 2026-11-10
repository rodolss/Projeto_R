// Cópia local (localStorage) + sincronização com o GitHub.
// - A pendência é marcada ANTES de enviar: se o app fechar no meio, a próxima abertura reenvia.
// - Salvamentos e carregamentos rodam em fila, um de cada vez.
// - Se o remoto mudou em outro aparelho, mescla em 3 vias (nada se perde) e avisa.
import { migrar } from '../core/esquema.js';
import { mesclar, mudou } from './mesclar.js';

const CHAVES = {
  estado: 'projetoR.estado', sha: 'projetoR.sha', pendente: 'projetoR.pendente',
  base: 'projetoR.base', corrompido: 'projetoR.estado.corrompido',
};

const avisoDe = (erro) => (erro?.codigo === 'rede' ? 'offline' : (erro?.codigo ?? 'desconhecido'));
const comAviso = (obj, aviso) => (aviso ? { ...obj, aviso } : obj);

export function criarArmazem({ armazenamento, cliente }) {
  let fila = Promise.resolve();
  const enfileirar = (operacao) => {
    const p = fila.then(operacao, operacao);
    fila = p.catch(() => {});
    return p;
  };

  function lerLocal() {
    const texto = armazenamento.getItem(CHAVES.estado);
    if (!texto) return { estado: null };
    try {
      return { estado: migrar(JSON.parse(texto)) };
    } catch {
      armazenamento.setItem(CHAVES.corrompido, texto);
      armazenamento.removeItem(CHAVES.estado);
      return { estado: null, aviso: 'dados-locais-invalidos' };
    }
  }
  const lerBase = () => {
    try { return JSON.parse(armazenamento.getItem(CHAVES.base) ?? 'null'); } catch { return null; }
  };
  const gravarLocal = (estado) => armazenamento.setItem(CHAVES.estado, JSON.stringify(estado));
  const shaLocal = () => armazenamento.getItem(CHAVES.sha);
  const pendente = () => armazenamento.getItem(CHAVES.pendente) === '1';
  const marcarPendente = (sim) => (sim ? armazenamento.setItem(CHAVES.pendente, '1') : armazenamento.removeItem(CHAVES.pendente));
  function sincronizado(estado, sha) {
    gravarLocal(estado);
    if (sha) armazenamento.setItem(CHAVES.sha, sha);
    armazenamento.setItem(CHAVES.base, JSON.stringify(estado));
    marcarPendente(false);
  }

  async function enviar(estado) {
    try {
      sincronizado(estado, await cliente.gravar(estado, shaLocal()));
      return { estado };
    } catch (erro) {
      if (erro.codigo !== 'conflito') throw erro;
      const remoto = await cliente.ler();
      const base = lerBase();
      const mesclado = remoto ? migrar(mesclar({ base, local: estado, remoto: remoto.estado })) : estado;
      sincronizado(mesclado, await cliente.gravar(mesclado, remoto?.sha ?? null));
      return comAviso({ estado: mesclado }, remoto && mudou(remoto.estado, base) ? 'conflito-resolvido' : null);
    }
  }

  return {
    // Síncrono: para abrir o app na hora, sem esperar a rede.
    carregarLocal() {
      return lerLocal();
    },

    carregar() {
      return enfileirar(async () => {
        const { estado: local, aviso: avisoLocal } = lerLocal();
        const origem = local ? 'local' : 'vazio';
        if (!cliente) return comAviso({ estado: local, origem }, avisoLocal);
        try {
          if (pendente() && local) {
            const r = await enviar(local);
            return comAviso({ estado: r.estado, origem: 'local' }, r.aviso);
          }
          const remoto = await cliente.ler();
          if (!remoto) return comAviso({ estado: local, origem }, avisoLocal);
          const estado = migrar(remoto.estado);
          sincronizado(estado, remoto.sha);
          return comAviso({ estado, origem: 'remoto' }, avisoLocal);
        } catch (erro) {
          return { estado: local, origem, aviso: avisoDe(erro) };
        }
      });
    },

    salvar(mutacao) {
      return enfileirar(async () => {
        const estado = mutacao(lerLocal().estado);
        gravarLocal(estado);
        if (!cliente) return { estado, sincronizado: false };
        marcarPendente(true);
        try {
          const r = await enviar(estado);
          return comAviso({ estado: r.estado, sincronizado: true }, r.aviso);
        } catch (erro) {
          return { estado, sincronizado: false, aviso: avisoDe(erro) };
        }
      });
    },

    sincronizarPendentes() {
      return enfileirar(async () => {
        if (!cliente || !pendente()) return { sincronizado: true };
        const { estado: local } = lerLocal();
        if (!local) {
          marcarPendente(false);
          return { sincronizado: true };
        }
        try {
          const r = await enviar(local);
          return comAviso({ sincronizado: true, estado: r.estado }, r.aviso);
        } catch (erro) {
          return { sincronizado: false, aviso: avisoDe(erro) };
        }
      });
    },
  };
}
