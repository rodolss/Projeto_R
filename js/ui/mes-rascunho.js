// Rascunho da aba Mês guardado no aparelho (não sincroniza): sair para copiar saldos na corretora não perde nada.
import { validarRascunho } from '../core/lista-mes.js';

const CHAVE = 'projetoR.rascunhoMes';

export function lerRascunho(mes, armazenamento = globalThis.localStorage) {
  try {
    return validarRascunho(JSON.parse(armazenamento.getItem(CHAVE) ?? 'null'), mes);
  } catch {
    return null;
  }
}

export function salvarRascunho(rascunho, armazenamento = globalThis.localStorage) {
  try {
    armazenamento.setItem(CHAVE, JSON.stringify(rascunho));
  } catch {
    // Sem armazenamento (modo privado, bloqueado): a tela segue funcionando, só não lembra depois.
  }
}

export function apagarRascunho(armazenamento = globalThis.localStorage) {
  try {
    armazenamento.removeItem(CHAVE);
  } catch {
    // idem
  }
}
