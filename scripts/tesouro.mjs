// Preços do Tesouro Direto para o app (desenho 2026-11-22-renda-fixa-automatica). O arquivo oficial do Tesouro
// Transparente só deixa o site do governo ler pelo navegador; esta tarefa (GitHub Actions, dias úteis) baixa o arquivo,
// guarda só os títulos do último dia e grava em dados-publicos/tesouro.json, que o app lê do próprio site. Dados públicos,
// iguais para todos.
//
// Uso: node scripts/tesouro.mjs [saida.json] [--arquivo PrecoTaxaTesouroDireto.csv]
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const URL_TESOURO = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv';
const COLUNAS = ['Tipo Titulo', 'Data Vencimento', 'Data Base', 'Taxa Venda Manha', 'PU Venda Manha'];

const paraISO = (dmy) => { const [d, m, a] = dmy.split('/'); return `${a}-${m}-${d}`; };
const numero = (texto) => Number(String(texto).replace(/\./g, '').replace(',', '.'));

// Como o Tesouro chama: o ano do vencimento; no Renda+, o ano em que os pagamentos começam (vencimento − 19) e no
// Educa+, o ano em que começam (vencimento − 4).
export function nomeDoTitulo(tipo, vencimento) {
  const ano = Number(vencimento.slice(0, 4));
  const desconto = /Renda\+/.test(tipo) ? 19 : /Educa\+/.test(tipo) ? 4 : 0;
  return `${tipo} ${ano - desconto}`;
}

export function titulosDoDia(csv) {
  const linhas = String(csv).split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) throw new Error('tesouro-vazio');
  const cabecalho = linhas[0].split(';').map((c) => c.trim());
  const pos = Object.fromEntries(COLUNAS.map((c) => [c, cabecalho.indexOf(c)]));
  if (Object.values(pos).some((k) => k < 0)) throw new Error('tesouro-formato');
  const registros = linhas.slice(1).map((l) => l.split(';')).map((c) => ({
    tipo: c[pos['Tipo Titulo']].trim(), vencimento: paraISO(c[pos['Data Vencimento']].trim()), data: paraISO(c[pos['Data Base']].trim()),
    preco: numero(c[pos['PU Venda Manha']]), taxa: numero(c[pos['Taxa Venda Manha']]),
  }));
  const data = registros.reduce((max, r) => (r.data > max ? r.data : max), '');
  const titulos = registros.filter((r) => r.data === data && r.preco > 0)
    .map((r) => ({ nome: nomeDoTitulo(r.tipo, r.vencimento), tipo: r.tipo, vencimento: r.vencimento, preco: r.preco, taxa: r.taxa }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!titulos.length) throw new Error('tesouro-vazio');
  return { data, titulos };
}

async function principal() {
  const args = process.argv.slice(2);
  const iArquivo = args.indexOf('--arquivo');
  const saida = args.find((a, k) => !a.startsWith('--') && args[k - 1] !== '--arquivo') ?? 'dados-publicos/tesouro.json';
  let csv;
  if (iArquivo >= 0) {
    csv = readFileSync(args[iArquivo + 1], 'latin1');
  } else {
    const r = await fetch(URL_TESOURO);
    if (!r.ok) throw new Error(`tesouro-http-${r.status}`);
    csv = new TextDecoder('latin1').decode(await r.arrayBuffer());
  }
  const novo = titulosDoDia(csv);
  const texto = `${JSON.stringify(novo, null, 1)}\n`;
  if (existsSync(saida) && readFileSync(saida, 'utf8') === texto) { console.log(`sem mudança (${novo.data})`); return; }
  writeFileSync(saida, texto);
  console.log(`${novo.titulos.length} títulos de ${novo.data} em ${saida}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((erro) => { console.error(erro.message); process.exit(1); });
}
