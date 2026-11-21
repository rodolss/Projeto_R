// Etiquetas (tags) das compras (desenho 2026-11-21-tags): o "O que foi" de cada compra gera etiquetas. Cada palavra do
// nome é uma etiqueta, menos as de ligação: "Ração da Nami" tem duas, "Ração" e "Nami". As expressões da lista de
// "etiquetas compostas" ("Pão de Queijo") valem como uma etiqueta só. Ao digitar, as que já existem aparecem como
// balões; se nenhuma é igual, nasce uma nova. Com uma grafia só por etiqueta ("Nami" e "nami" são a mesma), dá para
// somar depois quanto se gastou com cada coisa. As etiquetas saem do nome: nada a migrar. Palavras sem acento que o app
// conhece são corrigidas ("aviao" → "avião", ortografia.js).
import { corrigirPalavra } from './ortografia.js';

export const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// A chave que junta grafias do mesmo nome: sem acento, sem maiúscula, sem espaço sobrando.
export const chaveDaTag = semAcento;

// Palavras de ligação: não viram etiqueta ("Ração da Nami" → Ração e Nami).
const LIGACAO = new Set(['a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos',
  'para', 'pra', 'pro', 'com', 'por', 'ao', 'aos', 'sem']);
export const ehLigacao = (palavra) => LIGACAO.has(chaveDaTag(palavra));

// Expressões que o app já conhece e que valem como uma etiqueta só (a lista do app; a da casa soma a ela).
export const JUNTAS_DO_APP = [
  'Pão de Queijo', 'Pão de Forma', 'Papel Higiênico', 'Papel Toalha', 'Cachorro Quente', 'Café da Manhã',
  'Ar Condicionado', 'Água de Coco', 'Água Sanitária', 'Água Mineral', 'Plano de Saúde', 'Leite Condensado',
  'Leite em Pó', 'Creme de Leite', 'Molho de Tomate', 'Suco de Laranja', 'Fast Food', 'Carne Moída', 'Sabão em Pó',
  'Sabão em Barra', 'Escova de Dentes', 'Pasta de Dente', 'Fio Dental', 'Máquina de Lavar', 'Gás de Cozinha',
  'Salão de Beleza', 'Imposto de Renda', 'Cesta Básica', 'Material Escolar', 'Dia dos Namorados',
];

// Tira pontuação das pontas ("Nami," → "Nami") sem mexer no meio ("Coca-Cola", "3,5").
const limpar = (palavra) => String(palavra).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const palavrasDe = (texto) => String(texto ?? '').split(/\s+/).map(limpar).filter(Boolean);
const compactar = (texto) => String(texto ?? '').trim().replace(/\s+/g, ' ');

// Nomes sem repetir (pela chave), na ordem em que vieram: a primeira grafia vence.
export function etiquetasUnicas(nomes) {
  const vistos = new Map();
  for (const nome of nomes) {
    const chave = chaveDaTag(nome);
    if (chave && !vistos.has(chave)) vistos.set(chave, compactar(nome));
  }
  return [...vistos.values()];
}

// ---------- a lista de expressões ----------
// A lista que vale na casa: a do app mais as que a casa acrescentou (casa.etiquetasJuntas = { chave: "Escrita" }, no topo
// do casa.json: um objeto por chave se mescla sem perder o que o outro celular acrescentou). Só expressões de 2+ palavras.
export const juntasDaCasa = (casa) => etiquetasUnicas([...JUNTAS_DO_APP, ...Object.values(casa?.etiquetasJuntas ?? {})])
  .filter((f) => palavrasDe(f).length >= 2);

export function adicionarJunta(casa, frase) {
  const texto = compactar(palavrasDe(frase).join(' '));
  if (palavrasDe(texto).length < 2) return casa; // uma palavra só já é uma etiqueta
  const chave = chaveDaTag(texto);
  if (juntasDaCasa(casa).some((f) => chaveDaTag(f) === chave)) return casa;
  return { ...casa, etiquetasJuntas: { ...(casa.etiquetasJuntas ?? {}), [chave]: texto } };
}

export function removerJunta(casa, chave) {
  const { [chave]: _tirada, ...resto } = casa.etiquetasJuntas ?? {};
  const { etiquetasJuntas: _velhas, ...semLista } = casa;
  return Object.keys(resto).length ? { ...semLista, etiquetasJuntas: resto } : semLista;
}

// As expressões prontas para procurar: do maior número de palavras para o menor (a mais longa ganha).
const preparar = (juntas) => juntas.map((f) => ({ texto: compactar(f), chaves: palavrasDe(f).map(chaveDaTag) }))
  .filter((f) => f.chaves.length >= 2).sort((a, b) => b.chaves.length - a.chaves.length);
const casaCom = (frases, chaves, i) => frases.find((f) => f.chaves.every((c, k) => chaves[i + k] === c));

// As etiquetas de um nome de compra: cada expressão da lista vale uma; as outras palavras, uma cada, menos as de ligação.
export function tagsDoNome(nome, juntas = []) {
  const palavras = palavrasDe(nome);
  const chaves = palavras.map(chaveDaTag);
  const frases = preparar(juntas);
  const saida = [];
  for (let i = 0; i < palavras.length;) {
    const achada = casaCom(frases, chaves, i);
    if (achada) { saida.push(achada.texto); i += achada.chaves.length; continue; }
    if (!ehLigacao(palavras[i])) saida.push(corrigirPalavra(palavras[i]));
    i++;
  }
  return etiquetasUnicas(saida);
}

// Todas as etiquetas que existem: as expressões da lista e as dos nomes das compras (a primeira grafia vence).
export const etiquetasDosNomes = (nomes, juntas = []) => etiquetasUnicas([...juntas, ...nomes.flatMap((n) => tagsDoNome(n, juntas))]);

// O que mostrar para o trecho que está sendo digitado: `exata` (a etiqueta que já existe com esse nome, na grafia dela),
// `achadas` (os balões: a exata primeiro, depois as que começam assim e as que têm no meio) e `nova` (o nome a criar,
// quando nenhuma é igual). Nada digitado: nada para mostrar. Uma palavra de ligação ("da", "na") ainda mostra as
// etiquetas que começam assim ("Nami" começa com "na"), mas não oferece criar.
export function opcoesDeTag(tags, texto, limite = 5) {
  const trecho = compactar(texto.split(/\s+/).map(limpar).join(' '));
  const chave = chaveDaTag(trecho);
  if (!chave) return { achadas: [], exata: null, nova: null };
  const todas = etiquetasUnicas(tags);
  const exata = todas.find((n) => chaveDaTag(n) === chave) ?? null;
  const resto = todas.filter((n) => n !== exata);
  const comeca = resto.filter((n) => chaveDaTag(n).startsWith(chave));
  const meio = resto.filter((n) => !chaveDaTag(n).startsWith(chave) && chaveDaTag(n).includes(chave));
  return { achadas: [...(exata ? [exata] : []), ...comeca, ...meio].slice(0, limite), exata, nova: exata || ehLigacao(trecho) || trecho.includes(' ') ? null : corrigirPalavra(trecho) }; // expressão nova: só pela lista dos Ajustes
}

// O trecho que está sendo digitado e o que vem antes dele. Em geral é a última palavra (se o texto não termina em
// espaço); se as últimas palavras já são o começo de uma expressão conhecida ("pão de qu" → "Pão de Queijo"), é o trecho todo.
export function trechoAtual(texto, tags = []) {
  const t = String(texto ?? '');
  if (t === '' || /\s$/.test(t)) return { antes: t, palavra: '' };
  const inicios = [...t.matchAll(/\S+/g)].map((m) => m.index);
  const compostas = etiquetasUnicas(tags).map(chaveDaTag).filter((c) => c.includes(' '));
  for (let k = Math.min(4, inicios.length); k >= 2; k--) {
    const trecho = t.slice(inicios[inicios.length - k]);
    const chave = chaveDaTag(trecho);
    if (compostas.some((c) => c.startsWith(chave))) return { antes: t.slice(0, inicios[inicios.length - k]), palavra: trecho };
  }
  const ultimo = inicios[inicios.length - 1];
  return { antes: t.slice(0, ultimo), palavra: t.slice(ultimo) };
}

// O balão tocado vira o trecho que estava sendo digitado (e um espaço, para seguir escrevendo).
export const trocarTrechoAtual = (texto, tag, tags = []) => `${trechoAtual(texto, tags).antes}${tag} `;

// O nome que vai para a compra: expressões da lista e palavras na grafia da etiqueta que já existe; ligação e palavra
// nova, como digitadas.
export function nomeDaEtiqueta(tags, texto, juntas = []) {
  const porChave = new Map(etiquetasUnicas(tags).map((t) => [chaveDaTag(t), t]));
  const frases = preparar(juntas);
  const tokens = String(texto ?? '').split(/\s+/).filter(Boolean);
  const chaves = tokens.map((tk) => chaveDaTag(limpar(tk)));
  const saida = [];
  for (let i = 0; i < tokens.length;) {
    const achada = casaCom(frases, chaves, i);
    if (achada) {
      const ultimo = tokens[i + achada.chaves.length - 1];
      saida.push(achada.texto + ultimo.slice(ultimo.indexOf(limpar(ultimo)) + limpar(ultimo).length)); // a pontuação do fim fica
      i += achada.chaves.length;
      continue;
    }
    const palavra = limpar(tokens[i]);
    const existente = palavra && !ehLigacao(palavra) ? porChave.get(chaveDaTag(palavra)) : null;
    // A etiqueta que já existe manda na grafia; senão, a palavra com os acentos corrigidos.
    const certa = palavra && !ehLigacao(palavra) ? corrigirPalavra(existente ?? palavra) : palavra;
    saida.push(certa && certa !== palavra ? tokens[i].replace(palavra, certa) : tokens[i]);
    i++;
  }
  return saida.join(' ');
}
