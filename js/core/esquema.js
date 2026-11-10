// Formato do estado salvo em dados.json, estado inicial e migrações.
import { CARTEIRA_PADRAO } from './alocacao.js';
import { cicloAnual } from './meses.js';

export const SCHEMA_VERSION = 1;

export function criarEstadoInicial({ salario, mesInicio, recebe13 = true, recebeFerias = true, anuaisJaSeparados = 0 }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: {
      salario,
      mesSalario: mesInicio,
      recebe13,
      recebeFerias,
      mesInicio,
      prazoMeses: 120,
      swr: 0.04,
      rentabilidadeReal: 0.05,
      ultimaRevisaoOrcamento: mesInicio,
    },
    plano: { p0: 0, mesP0: mesInicio },
    orcamento: [],
    ativos: [],
    carteiraAlvo: structuredClone(CARTEIRA_PADRAO),
    saldos: [],
    meses: [],
    contadoresAnuais: anuaisJaSeparados > 0 ? { [cicloAnual(mesInicio)]: anuaisJaSeparados } : {},
    ipca: { serie: {}, atualizadoEm: null },
    ipcaManual: {},
  };
}

export function migrar(estado) {
  if (!estado || typeof estado.schemaVersion !== 'number' || estado.schemaVersion > SCHEMA_VERSION) {
    throw new Error('versao-desconhecida');
  }
  return estado;
}

export function novoId() {
  return globalThis.crypto.randomUUID();
}
