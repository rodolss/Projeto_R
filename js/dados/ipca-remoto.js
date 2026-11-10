// Busca da série do IPCA (SGS 433) na API do Banco Central. A API aceita chamadas do navegador (CORS *).
import { parseSerieSgs } from '../core/ipca.js';

export const URL_IPCA = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados';
const UM_DIA = 24 * 60 * 60 * 1000;

export async function buscarSerieIpca({ fetch, desde }) {
  const [ano, mes] = desde.split('-');
  const r = await fetch(`${URL_IPCA}?formato=json&dataInicial=01/${mes}/${ano}`);
  if (!r.ok) throw new Error(`ipca-http-${r.status}`);
  const json = await r.json();
  const valido = Array.isArray(json) && json.every((x) => typeof x?.data === 'string' && typeof x?.valor === 'string');
  if (!valido) throw new Error('ipca-formato');
  return parseSerieSgs(json);
}

export function precisaAtualizarIpca(ipca, agora) {
  if (!ipca?.atualizadoEm) return true;
  return agora - new Date(ipca.atualizadoEm) > UM_DIA;
}
