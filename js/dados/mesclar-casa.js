// Mescla em 3 vias das contas da casa, campo a campo (base = última versão sincronizada): duas pessoas
// mexendo em contas diferentes do mesmo mês não perdem nada. Listas de objetos com `id` ou `mes` são
// mescladas item a item. Quando os dois lados mudam o mesmo campo, vale o local.

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ehObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const chaveDe = (x) => (ehObjeto(x) ? (x.id ?? x.mes) : undefined);
const listaComChave = (l) => Array.isArray(l) && l.every((x) => chaveDe(x) !== undefined);

function mesclarObjetos(b, l, r) {
  const base = ehObjeto(b) ? b : {};
  const resultado = {};
  for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) {
    const noLocal = k in l;
    const noRemoto = k in r;
    if (noLocal && noRemoto) resultado[k] = mesclar3(base[k], l[k], r[k]);
    else if (noLocal) {
      if (!(k in base) || !igual(l[k], base[k])) resultado[k] = l[k]; // senão: apagado no remoto
    } else if (!(k in base) || !igual(r[k], base[k])) {
      resultado[k] = r[k]; // senão: apagado no local
    }
  }
  return resultado;
}

function mesclarListas(b, l, r) {
  const naBase = new Map((listaComChave(b) ? b : []).map((x) => [chaveDe(x), x]));
  const noRemoto = new Map(r.map((x) => [chaveDe(x), x]));
  const resultado = [];
  const vistos = new Set();
  for (const x of l) { // a ordem do local vale (contas reordenadas neste aparelho)
    const k = chaveDe(x);
    vistos.add(k);
    if (noRemoto.has(k)) resultado.push(mesclar3(naBase.get(k), x, noRemoto.get(k)));
    else if (!naBase.has(k) || !igual(naBase.get(k), x)) resultado.push(x); // senão: apagado no remoto
  }
  for (const x of r) {
    const k = chaveDe(x);
    if (vistos.has(k)) continue;
    if (!naBase.has(k) || !igual(naBase.get(k), x)) resultado.push(x); // senão: apagado no local
  }
  return resultado;
}

function mesclar3(b, l, r) {
  if (igual(l, b)) return r;
  if (igual(r, b) || igual(l, r)) return l;
  if (ehObjeto(l) && ehObjeto(r)) return mesclarObjetos(b, l, r);
  if (listaComChave(l) && listaComChave(r)) return mesclarListas(b, l, r);
  return l;
}

export function mesclarCasa({ base, local, remoto }) {
  const resultado = mesclar3(base ?? null, local, remoto);
  if (Array.isArray(resultado?.meses)) resultado.meses = [...resultado.meses].sort((a, b) => (a.mes < b.mes ? -1 : 1));
  return resultado;
}
