// Quanto o cartão gastou por etiqueta (desenho 2026-11-21-top-etiquetas): soma, nas faturas dos últimos 12 meses, o valor das
// compras e das assinaturas (todo mês) de cada etiqueta do nome. Uma compra com mais de uma etiqueta ("Ração da Nami")
// conta inteira em cada uma, então a soma das etiquetas pode passar do total do cartão.
import { centavos } from './casa.js';
import { faturaDoCartao } from './cartao.js';
import { somarMeses } from './meses.js';
import { tagsDoNome, chaveDaTag } from './tags.js';

// As `limite` etiquetas que mais pesaram nas `meses` faturas que terminam em `ateFatura` (a aberta, em geral).
// Devolve também o total do cartão no período, para mostrar a fatia de cada uma.
export function topEtiquetas(casa, cartaoId, ateFatura, { meses = 12, limite = 5, juntas = [] } = {}) {
  const faturas = Array.from({ length: meses }, (_, k) => somarMeses(ateFatura, k - (meses - 1)));
  const porChave = new Map();
  let total = 0;
  for (const fatura of faturas) {
    const f = faturaDoCartao(casa, cartaoId, fatura);
    total += f.total;
    for (const item of [...f.compras, ...f.fixas]) {
      if (!(item.valor > 0)) continue;
      for (const tag of tagsDoNome(item.nome, juntas)) {
        const chave = chaveDaTag(tag);
        const atual = porChave.get(chave) ?? { tag, valor: 0, vezes: 0 };
        atual.valor += item.valor;
        atual.vezes += 1;
        porChave.set(chave, atual);
      }
    }
  }
  total = centavos(total);
  const itens = [...porChave.values()]
    .map((x) => ({ ...x, valor: centavos(x.valor) }))
    .sort((a, b) => b.valor - a.valor || a.tag.localeCompare(b.tag, 'pt-BR'))
    .slice(0, limite)
    .map((x) => ({ ...x, fracao: total > 0 ? x.valor / total : 0 }));
  return { de: faturas[0], ate: ateFatura, total, itens, quantas: porChave.size };
}
