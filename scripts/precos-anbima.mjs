// Preços do Tesouro Direto pela ANBIMA (desenho 2026-11-22-renda-fixa-automatica). O site do Tesouro derruba conexões de
// fora do Brasil (os servidores do GitHub ficam nos EUA); a ANBIMA publica todo dia útil, para qualquer um, os preços e
// taxas indicativas dos títulos públicos (arquivo msAAMMDD.txt). Daí sai o preço de cada título do catálogo:
//   Tesouro Selic (LFT) e Prefixado (LTN): pela taxa da curva no vencimento (o mesmo vencimento dá o mesmo preço);
//   com juros semestrais (NTN-F, NTN-B, NTN-C): o preço do mesmo vencimento;
//   IPCA+ (NTN-B Principal), Renda+ e Educa+ (NTN-B1): o VNA da NTN-B descontado pela curva da NTN-B (metodologia do
//   Tesouro). Fica a poucos décimos de por cento do preço do Tesouro Direto (conferido com os preços oficiais).
// O que não dá para calcular fica com o preço de antes.

const DIA = 86400000;
const centavos = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const numero = (t) => Number(String(t).trim().replace(/\./g, '').replace(',', '.'));
const tempo = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const paraIso = (t) => new Date(t).toISOString().slice(0, 10);
const deAAAAMMDD = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

export function lerAnbima(texto) {
  const linhas = String(texto).split(/\r?\n/);
  const k = linhas.findIndex((l) => l.startsWith('Titulo@'));
  if (k < 0) throw new Error('anbima-formato');
  const titulos = linhas.slice(k + 1).map((l) => l.split('@')).filter((c) => c.length >= 9 && /^\d{8}$/.test(c[4]))
    .map((c) => ({ tipo: c[0].trim(), vencimento: deAAAAMMDD(c[4]), taxa: numero(c[7]) / 100, pu: numero(c[8]), data: deAAAAMMDD(c[1]) }));
  if (!titulos.length) throw new Error('anbima-formato');
  const data = titulos[0].data;
  return { data, titulos: titulos.map(({ data: _d, ...t }) => t) };
}

// ---------- calendário: dias úteis da ANBIMA (sem fins de semana e feriados nacionais) ----------
function pascoa(ano) {
  const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100; const d = Math.floor(b / 4); const e = b % 4;
  const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return Date.UTC(ano, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
const feriadosDoAno = new Map();
function feriado(t) {
  const ano = new Date(t).getUTCFullYear();
  if (!feriadosDoAno.has(ano)) {
    const p = pascoa(ano);
    const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25', ...(ano >= 2024 ? ['11-20'] : [])]
      .map((md) => Date.UTC(ano, Number(md.slice(0, 2)) - 1, Number(md.slice(3))));
    feriadosDoAno.set(ano, new Set([...fixos, p - 48 * DIA, p - 47 * DIA, p - 2 * DIA, p + 60 * DIA]));
  }
  return feriadosDoAno.get(ano).has(t);
}
// Dias úteis em [de, ate).
export function diasUteis(de, ate) {
  let n = 0;
  for (let t = tempo(de); t < tempo(ate); t += DIA) {
    const semana = new Date(t).getUTCDay();
    if (semana !== 0 && semana !== 6 && !feriado(t)) n++;
  }
  return n;
}

// ---------- curvas ----------
// Taxa num vencimento: interpolada no tempo entre os pontos da curva; fora dela, a do ponto mais perto.
function taxaNaCurva(pontos, vencimento) {
  const t = tempo(vencimento);
  const curva = [...pontos].sort((a, b) => tempo(a.vencimento) - tempo(b.vencimento));
  if (!curva.length) return null;
  if (t <= tempo(curva[0].vencimento)) return curva[0].taxa;
  if (t >= tempo(curva.at(-1).vencimento)) return curva.at(-1).taxa;
  const k = curva.findIndex((p) => tempo(p.vencimento) >= t);
  const [a, b] = [curva[k - 1], curva[k]];
  return a.taxa + ((b.taxa - a.taxa) * (t - tempo(a.vencimento))) / (tempo(b.vencimento) - tempo(a.vencimento));
}
const descontar = (taxa, data, ate) => (1 + taxa) ** (-diasUteis(data, ate) / 252);
const mediana = (lista) => { const s = [...lista].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

// Datas de pagamento mensais (dia 15) ou semestrais, voltando do vencimento, só as depois de `data`.
function datasAntes(vencimento, passoMeses, data, quantas = Infinity) {
  const v = new Date(tempo(vencimento));
  const lista = [];
  for (let k = 0; k < quantas; k++) {
    const t = Date.UTC(v.getUTCFullYear(), v.getUTCMonth() - passoMeses * k, v.getUTCDate());
    if (t <= tempo(data)) break;
    lista.push(paraIso(t));
  }
  return lista;
}

// O VNA (valor nominal atualizado pelo IPCA) que a NTN-B implica: preço ÷ cotação (cupom de 6% ao ano, semestral).
function vnaDaNtnb(ntnbs, data) {
  const cupom = Math.sqrt(1.06) - 1;
  return mediana(ntnbs.map((b) => {
    const cotacao = datasAntes(b.vencimento, 6, data).reduce((s, d) => s + cupom * descontar(b.taxa, data, d), 0) + descontar(b.taxa, data, b.vencimento);
    return b.pu / cotacao;
  }));
}

export function precosPelaAnbima(catalogo, anbima) {
  const { data } = anbima;
  const doTipo = (tipo) => anbima.titulos.filter((x) => x.tipo === tipo && x.vencimento > data);
  const mesmo = (tipo, vencimento) => doTipo(tipo).find((x) => x.vencimento === vencimento) ?? null;
  const lft = doTipo('LFT');
  const ltn = doTipo('LTN');
  const ntnb = doTipo('NTN-B');
  const vnaLft = mediana(lft.map((x) => x.pu / descontar(x.taxa, data, x.vencimento)));
  const vnaNtnb = ntnb.length ? vnaDaNtnb(ntnb, data) : null;
  const parcelado = (vencimento, n) => vnaNtnb * datasAntes(vencimento, 1, data, n)
    .reduce((s, d) => s + (1 / n) * descontar(taxaNaCurva(ntnb, d), data, d), 0);

  function preco(t) {
    if (t.vencimento <= data) return null;
    switch (t.tipo) {
      case 'Tesouro Selic': return lft.length ? vnaLft * descontar(taxaNaCurva(lft, t.vencimento), data, t.vencimento) : null;
      case 'Tesouro Prefixado': return mesmo('LTN', t.vencimento)?.pu ?? (ltn.length ? 1000 * descontar(taxaNaCurva(ltn, t.vencimento), data, t.vencimento) : null);
      case 'Tesouro Prefixado com Juros Semestrais': return mesmo('NTN-F', t.vencimento)?.pu ?? null;
      case 'Tesouro IPCA+ com Juros Semestrais': return mesmo('NTN-B', t.vencimento)?.pu ?? null;
      case 'Tesouro IGPM+ com Juros Semestrais': return mesmo('NTN-C', t.vencimento)?.pu ?? null;
      case 'Tesouro IPCA+': return vnaNtnb ? vnaNtnb * descontar(taxaNaCurva(ntnb, t.vencimento), data, t.vencimento) : null;
      case 'Tesouro Renda+ Aposentadoria Extra': return vnaNtnb ? parcelado(t.vencimento, 240) : null;
      case 'Tesouro Educa+': return vnaNtnb ? parcelado(t.vencimento, 60) : null;
      default: return null;
    }
  }
  return {
    data,
    fonte: 'anbima',
    titulos: catalogo.titulos.map((t) => {
      const novo = preco(t);
      return Number.isFinite(novo) && novo > 0 ? { ...t, preco: centavos(novo) } : t;
    }),
  };
}

// O arquivo mais novo da ANBIMA: de hoje para trás, até 10 dias (fins de semana e feriados não têm arquivo).
export async function baixarAnbima({ fetch, hoje = new Date() }) {
  for (let k = 0; k < 10; k++) {
    const t = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - k));
    const nome = `ms${String(t.getUTCFullYear()).slice(2)}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}.txt`;
    const r = await fetch(`https://www.anbima.com.br/informacoes/merc-sec/arqs/${nome}`);
    if (!r.ok) continue;
    const texto = new TextDecoder('latin1').decode(await r.arrayBuffer());
    if (texto.includes('Titulo@')) return lerAnbima(texto);
  }
  throw new Error('anbima-sem-arquivo');
}
