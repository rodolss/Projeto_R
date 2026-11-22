// Cotações pelo brapi.dev (desenho 2026-11-22-cotacoes-automaticas). A API é pública, sem chave, e aceita chamadas do
// navegador. Só o código do papel sai do aparelho (nada de nome, quantidade ou valor). Limite gratuito: 20 pedidos por
// minuto, um de cada vez; qualquer erro vira "sem cotação" e o app segue com o último preço conhecido.
const URL_LISTA = 'https://brapi.dev/api/quote/list';
const QUINZE_MINUTOS = 15 * 60 * 1000;
const pausa = (ms) => new Promise((r) => { setTimeout(r, ms); });

const paraSugestao = (x) => ({ ticker: String(x.stock), nome: String(x.name ?? x.stock), preco: Number(x.close) || null, tipo: x.type ?? null, subTipo: x.subType ?? null });

async function consultar(texto, limite, fetch) {
  const r = await fetch(`${URL_LISTA}?search=${encodeURIComponent(texto)}&limit=${limite}`);
  if (!r.ok) return { status: r.status, papeis: null };
  const json = await r.json().catch(() => null);
  return { status: r.status, papeis: Array.isArray(json?.stocks) ? json.stocks.filter((x) => typeof x?.stock === 'string') : null };
}

// A lista de papéis para escolher: até 8, com o código exato primeiro. Menos de 2 letras ou erro: lista vazia.
export async function buscarSugestoes(texto, { fetch }) {
  const t = String(texto ?? '').trim().toUpperCase();
  if (t.length < 2) return [];
  try {
    const { papeis } = await consultar(t, 12, fetch);
    if (!papeis) return [];
    const lista = papeis.map(paraSugestao);
    return [...lista.filter((x) => x.ticker === t), ...lista.filter((x) => x.ticker !== t)].slice(0, 8);
  } catch {
    return [];
  }
}

// O preço do papel (código exato, não o fracionário), ou null. `status` serve para parar no limite de pedidos.
async function preco(ticker, fetch) {
  try {
    const { status, papeis } = await consultar(ticker, 5, fetch);
    const achado = papeis?.find((x) => x.stock === ticker);
    const valor = Number(achado?.close);
    return { status, valor: valor > 0 ? valor : null };
  } catch {
    return { status: 0, valor: null };
  }
}

export async function buscarPreco(ticker, { fetch }) {
  return (await preco(ticker, fetch)).valor;
}

// Um pedido por papel, em fila (a API deixa um de cada vez). Quem falha mantém o valor guardado; no 429 (limite) para.
export async function atualizarCotacoes(tickers, { fetch, guardadas = {}, agora = new Date(), espera = 400 }) {
  const cotacoes = { ...guardadas };
  let falhou = false;
  for (const [k, ticker] of tickers.entries()) {
    if (k > 0 && espera) await pausa(espera);
    const { status, valor } = await preco(ticker, fetch);
    if (valor != null) cotacoes[ticker] = { preco: valor, em: agora.toISOString() };
    else if (!(ticker in cotacoes)) falhou = true;
    if (status === 429) { falhou = true; break; }
  }
  return { cotacoes, falhou };
}

// Há papel sem cotação guardada, ou a guardada tem mais de 15 minutos.
export function precisaAtualizar(guardadas, tickers, agora = new Date()) {
  return tickers.some((t) => {
    const c = guardadas?.[t];
    return !c?.em || agora - new Date(c.em) > QUINZE_MINUTOS;
  });
}
