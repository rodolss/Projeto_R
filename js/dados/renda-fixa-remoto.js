// Dados públicos da renda fixa (desenho 2026-11-22-renda-fixa-automatica): os preços do Tesouro Direto, copiados todo dia
// útil para o próprio site (dados-publicos/tesouro.json, ver scripts/tesouro.mjs), e o CDI diário do Banco Central (série
// 12 do SGS, que aceita chamadas do navegador). Nada do usuário sai do aparelho. Erro vira "sem dado novo".
const URL_CDI = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados';
const DOZE_HORAS = 12 * 60 * 60 * 1000;
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

const paraBr = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const paraIso = (br) => `${br.slice(6, 10)}-${br.slice(3, 5)}-${br.slice(0, 2)}`;
const somarAnos = (iso, anos) => `${Number(iso.slice(0, 4)) + anos}${iso.slice(4)}`;
const diaAntes = (iso) => new Date(Date.parse(`${iso}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

const tesouroValido = (j) => typeof j?.data === 'string' && Array.isArray(j.titulos) && j.titulos.length > 0
  && j.titulos.every((t) => typeof t?.nome === 'string' && Number(t.preco) > 0);

export async function buscarTesouro({ fetch }) {
  try {
    const r = await fetch('./dados-publicos/tesouro.json', { cache: 'no-cache' });
    if (!r.ok) return null;
    const json = await r.json();
    return tesouroValido(json) ? json : null;
  } catch {
    return null;
  }
}

// Janelas de até 9 anos (o Banco Central limita as séries diárias a 10 anos por pedido).
function janelas(desde, ate) {
  const lista = [];
  for (let ini = desde; ini <= ate;) {
    const proximo = somarAnos(ini, 9);
    const fim = proximo > ate ? ate : diaAntes(proximo);
    lista.push([ini, fim]);
    ini = proximo;
  }
  return lista;
}

// A série guardada mais o que falta até `ate`: se ela já cobre a aplicação mais antiga, só os dias depois do último guardado.
export async function buscarCdi({ fetch, desde, ate, guardada = {} }) {
  const dias = Object.keys(guardada).sort();
  const cobre = dias.length && Date.parse(dias[0]) <= Date.parse(desde) + SETE_DIAS;
  const inicio = cobre ? dias.at(-1) : desde;
  const serie = { ...guardada };
  try {
    for (const [ini, fim] of janelas(inicio, ate)) {
      const r = await fetch(`${URL_CDI}?formato=json&dataInicial=${paraBr(ini)}&dataFinal=${paraBr(fim)}`);
      if (r.status === 404) continue; // período sem CDI publicado (fim de semana, feriado)
      if (!r.ok) return guardada;
      const json = await r.json();
      if (!Array.isArray(json)) return guardada;
      for (const x of json) if (typeof x?.data === 'string' && Number.isFinite(Number(x.valor))) serie[paraIso(x.data)] = Number(x.valor);
    }
  } catch {
    return guardada;
  }
  return serie;
}

// `desde`: a data da aplicação mais antiga (null sem título calculado).
export function precisaCdi(guardado, desde, agora = new Date()) {
  if (!desde) return false;
  const dias = Object.keys(guardado?.serie ?? {}).sort();
  if (!dias.length || Date.parse(dias[0]) > Date.parse(desde) + SETE_DIAS) return true;
  return !guardado.atualizadoEm || agora - new Date(guardado.atualizadoEm) > DOZE_HORAS;
}
