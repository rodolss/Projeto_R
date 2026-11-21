// Etiquetas (tags) das compras (desenho 2026-11-21-tags): o "O que foi" de cada compra é uma etiqueta. Ao digitar,
// as que já existem aparecem como balões para escolher; se não existe, nasce uma nova. Com uma grafia só por etiqueta
// ("Coliseu" e "coliseu" são a mesma), dá para somar depois quanto se gastou com cada coisa.

export const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// A chave que junta grafias do mesmo nome: sem acento, sem maiúscula, sem espaço sobrando.
export const chaveDaTag = semAcento;

// Nomes sem repetir (pela chave), na ordem em que vieram: a primeira grafia vence.
export function etiquetasUnicas(nomes) {
  const vistos = new Map();
  for (const nome of nomes) {
    const chave = chaveDaTag(nome);
    if (chave && !vistos.has(chave)) vistos.set(chave, String(nome).trim().replace(/\s+/g, ' '));
  }
  return [...vistos.values()];
}

// O que mostrar para o que foi digitado: `exata` (a etiqueta que já existe com esse nome, na grafia dela), `achadas`
// (os balões: a exata primeiro, depois as que começam assim e as que têm no meio) e `nova` (o nome a criar, quando
// nenhuma é igual). Nada digitado: nada para mostrar.
export function opcoesDeTag(nomes, texto, limite = 5) {
  const chave = chaveDaTag(texto);
  if (!chave) return { achadas: [], exata: null, nova: null };
  const todas = etiquetasUnicas(nomes);
  const exata = todas.find((n) => chaveDaTag(n) === chave) ?? null;
  const resto = todas.filter((n) => n !== exata);
  const comeca = resto.filter((n) => chaveDaTag(n).startsWith(chave));
  const meio = resto.filter((n) => !chaveDaTag(n).startsWith(chave) && chaveDaTag(n).includes(chave));
  return {
    achadas: [...(exata ? [exata] : []), ...comeca, ...meio].slice(0, limite),
    exata,
    nova: exata ? null : String(texto).trim().replace(/\s+/g, ' '),
  };
}

// O nome que vai para a compra: a etiqueta que já existe (na grafia dela) ou o que foi digitado.
export function nomeDaEtiqueta(nomes, texto) {
  const { exata, nova } = opcoesDeTag(nomes, texto);
  return exata ?? nova ?? '';
}
