// Mescla em 3 vias (base = última versão sincronizada) para não perder o que outro aparelho gravou.
// Listas são mescladas item a item; o resto vale o lado que mudou (em empate, o local).

const CHAVES = {
  meses: (x) => x.mes,
  saldos: (x) => `${x.ativoId}|${x.data}`,
  ativos: (x) => x.id,
  orcamento: (x) => x.id,
};

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mesclarLista(base = [], local = [], remoto = [], chave) {
  const mapaBase = new Map(base.map((x) => [chave(x), x]));
  const mapaLocal = new Map(local.map((x) => [chave(x), x]));
  const resultado = new Map(remoto.map((x) => [chave(x), x]));
  for (const [k, x] of mapaLocal) {
    if (!mapaBase.has(k) || !igual(mapaBase.get(k), x)) resultado.set(k, x); // criado ou alterado no local
  }
  for (const [k, x] of mapaBase) {
    if (!mapaLocal.has(k) && resultado.has(k) && igual(resultado.get(k), x)) resultado.delete(k); // apagado no local
  }
  return [...resultado.values()];
}

function mesclarContadores(base = {}, local = {}, remoto = {}) {
  const ciclos = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remoto)]);
  return Object.fromEntries([...ciclos].map((c) => [c, (remoto[c] ?? 0) + ((local[c] ?? 0) - (base[c] ?? 0))]));
}

// Cada marco é comemorado uma vez: une as chaves e, se os dois lados comemoraram, vale a data mais antiga.
function mesclarMarcos(local = {}, remoto = {}) {
  const resultado = { ...remoto };
  for (const [k, data] of Object.entries(local)) {
    if (!resultado[k] || data < resultado[k]) resultado[k] = data;
  }
  return resultado;
}

export function mesclar({ base, local, remoto }) {
  const b = base ?? {};
  const resultado = {};
  for (const k of new Set([...Object.keys(remoto ?? {}), ...Object.keys(local ?? {})])) {
    if (CHAVES[k]) resultado[k] = mesclarLista(b[k], local[k], remoto[k], CHAVES[k]);
    else if (k === 'contadoresAnuais') resultado[k] = mesclarContadores(b[k], local[k], remoto[k]);
    else if (k === 'ipca') resultado[k] = (local.ipca?.atualizadoEm ?? '') > (remoto.ipca?.atualizadoEm ?? '') ? local.ipca : remoto.ipca;
    else if (k === 'marcos') resultado[k] = mesclarMarcos(local.marcos, remoto.marcos);
    else if (k === 'ipcaManual') resultado[k] = { ...(remoto.ipcaManual ?? {}), ...(local.ipcaManual ?? {}) };
    else resultado[k] = igual(local[k], b[k]) ? remoto[k] : local[k];
  }
  if (resultado.meses) resultado.meses.sort((x, y) => (x.mes < y.mes ? -1 : 1));
  return resultado;
}

export const mudou = (a, b) => !igual(a, b);
