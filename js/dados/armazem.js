// Cópia local (localStorage) + sincronização com o GitHub. Em conflito vale a última gravação.
import { migrar } from '../core/esquema.js';

const CHAVES = { estado: 'projetoR.estado', sha: 'projetoR.sha', pendente: 'projetoR.pendente' };

const avisoDe = (erro) => (erro?.codigo === 'rede' ? 'offline' : (erro?.codigo ?? 'desconhecido'));

export function criarArmazem({ armazenamento, cliente }) {
  const lerLocal = () => {
    const texto = armazenamento.getItem(CHAVES.estado);
    return texto ? migrar(JSON.parse(texto)) : null;
  };
  const gravarLocal = (estado, sha) => {
    armazenamento.setItem(CHAVES.estado, JSON.stringify(estado));
    if (sha) armazenamento.setItem(CHAVES.sha, sha);
  };
  const shaLocal = () => armazenamento.getItem(CHAVES.sha);
  const pendente = () => armazenamento.getItem(CHAVES.pendente) === '1';
  const marcarPendente = (sim) => (sim ? armazenamento.setItem(CHAVES.pendente, '1') : armazenamento.removeItem(CHAVES.pendente));

  // Envia o estado local; se o remoto mudou, sobrescreve (vale a última gravação).
  async function enviar(estado) {
    let sha;
    try {
      sha = await cliente.gravar(estado, shaLocal());
    } catch (erro) {
      if (erro.codigo !== 'conflito') throw erro;
      const remoto = await cliente.ler();
      sha = await cliente.gravar(estado, remoto?.sha ?? null);
    }
    gravarLocal(estado, sha);
    marcarPendente(false);
  }

  return {
    async carregar() {
      const local = lerLocal();
      const vazio = local ? 'local' : 'vazio';
      if (!cliente) return { estado: local, origem: vazio };
      try {
        if (pendente() && local) {
          await enviar(local);
          return { estado: local, origem: 'local' };
        }
        const remoto = await cliente.ler();
        if (!remoto) return { estado: local, origem: vazio };
        const estado = migrar(remoto.estado);
        gravarLocal(estado, remoto.sha);
        return { estado, origem: 'remoto' };
      } catch (erro) {
        return { estado: local, origem: vazio, aviso: avisoDe(erro) };
      }
    },

    async salvar(mutacao) {
      const estado = mutacao(lerLocal());
      gravarLocal(estado);
      if (!cliente) return { estado, sincronizado: false };
      try {
        const sha = await cliente.gravar(estado, shaLocal());
        gravarLocal(estado, sha);
        marcarPendente(false);
        return { estado, sincronizado: true };
      } catch (erro) {
        if (erro.codigo === 'conflito') {
          try {
            const remoto = await cliente.ler();
            const novo = mutacao(remoto ? migrar(remoto.estado) : estado);
            const sha = await cliente.gravar(novo, remoto?.sha ?? null);
            gravarLocal(novo, sha);
            marcarPendente(false);
            return { estado: novo, sincronizado: true, aviso: 'conflito-resolvido' };
          } catch (erro2) {
            marcarPendente(true);
            return { estado, sincronizado: false, aviso: avisoDe(erro2) };
          }
        }
        marcarPendente(true);
        return { estado, sincronizado: false, aviso: avisoDe(erro) };
      }
    },

    async sincronizarPendentes() {
      if (!cliente || !pendente()) return { sincronizado: true };
      const local = lerLocal();
      if (!local) {
        marcarPendente(false);
        return { sincronizado: true };
      }
      try {
        await enviar(local);
        return { sincronizado: true };
      } catch (erro) {
        return { sincronizado: false, aviso: avisoDe(erro) };
      }
    },
  };
}
