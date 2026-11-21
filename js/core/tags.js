// Etiquetas (tags) das compras (desenho 2026-11-21-tags): o "O que foi" de cada compra gera etiquetas. Cada palavra do
// nome é uma etiqueta, menos as de ligação: "Ração da Nami" tem duas, "Ração" e "Nami". Ao digitar, as que já existem
// aparecem como balões; se nenhuma é igual, nasce uma nova. Com uma grafia só por etiqueta ("Nami" e "nami" são a
// mesma), dá para somar depois quanto se gastou com cada coisa. As etiquetas saem do nome: nada a migrar.

export const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// A chave que junta grafias do mesmo nome: sem acento, sem maiúscula, sem espaço sobrando.
export const chaveDaTag = semAcento;

// Palavras de ligação: não viram etiqueta ("Ração da Nami" → Ração e Nami).
const LIGACAO = new Set(['a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos',
  'para', 'pra', 'pro', 'com', 'por', 'ao', 'aos', 'sem']);
export const ehLigacao = (palavra) => LIGACAO.has(chaveDaTag(palavra));

// Tira pontuação das pontas ("Nami," → "Nami") sem mexer no meio ("Coca-Cola", "3,5").
const limpar = (palavra) => String(palavra).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const palavrasDe = (texto) => String(texto ?? '').split(/\s+/).map(limpar).filter(Boolean);

// Nomes sem repetir (pela chave), na ordem em que vieram: a primeira grafia vence.
export function etiquetasUnicas(nomes) {
  const vistos = new Map();
  for (const nome of nomes) {
    const chave = chaveDaTag(nome);
    if (chave && !vistos.has(chave)) vistos.set(chave, String(nome).trim().replace(/\s+/g, ' '));
  }
  return [...vistos.values()];
}

// As etiquetas de um nome de compra: cada palavra, menos as de ligação, sem repetir.
export const tagsDoNome = (nome) => etiquetasUnicas(palavrasDe(nome).filter((p) => !ehLigacao(p)));

// Todas as etiquetas que existem nos nomes das compras (a primeira grafia vence).
export const etiquetasDosNomes = (nomes) => etiquetasUnicas(nomes.flatMap(tagsDoNome));

// O que mostrar para a palavra que está sendo digitada: `exata` (a etiqueta que já existe com esse nome, na grafia dela),
// `achadas` (os balões: a exata primeiro, depois as que começam assim e as que têm no meio) e `nova` (o nome a criar,
// quando nenhuma é igual). Nada digitado: nada para mostrar. Uma palavra de ligação ("da", "na") ainda mostra as
// etiquetas que começam assim ("Nami" começa com "na"), mas não oferece criar.
export function opcoesDeTag(tags, texto, limite = 5) {
  const palavra = limpar(texto);
  const chave = chaveDaTag(palavra);
  if (!chave) return { achadas: [], exata: null, nova: null };
  const todas = etiquetasUnicas(tags);
  const exata = todas.find((n) => chaveDaTag(n) === chave) ?? null;
  const resto = todas.filter((n) => n !== exata);
  const comeca = resto.filter((n) => chaveDaTag(n).startsWith(chave));
  const meio = resto.filter((n) => !chaveDaTag(n).startsWith(chave) && chaveDaTag(n).includes(chave));
  return { achadas: [...(exata ? [exata] : []), ...comeca, ...meio].slice(0, limite), exata, nova: exata || ehLigacao(palavra) ? null : palavra };
}

// A palavra que está sendo digitada (a última, se o texto não termina em espaço) e o que vem antes dela.
export function palavraAtual(texto) {
  const t = String(texto ?? '');
  if (t === '' || /\s$/.test(t)) return { antes: t, palavra: '' };
  const i = t.search(/\S+$/);
  return { antes: t.slice(0, i), palavra: t.slice(i) };
}

// O balão tocado vira a palavra que estava sendo digitada (e um espaço, para seguir escrevendo).
export const trocarPalavraAtual = (texto, tag) => `${palavraAtual(texto).antes}${tag} `;

// O nome que vai para a compra: cada palavra na grafia da etiqueta que já existe; ligação e palavra nova, como digitadas.
export function nomeDaEtiqueta(tags, texto) {
  const porChave = new Map(etiquetasUnicas(tags).map((t) => [chaveDaTag(t), t]));
  return String(texto ?? '').split(/\s+/).filter(Boolean)
    .map((token) => {
      const palavra = limpar(token);
      const existente = palavra && !ehLigacao(palavra) ? porChave.get(chaveDaTag(palavra)) : null;
      return existente ? token.replace(palavra, existente) : token;
    }).join(' ');
}
