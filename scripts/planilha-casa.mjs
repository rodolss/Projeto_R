// Importação (uma vez) da planilha de contas da casa para o formato do casa.json (desenho de 2026-11-19, §Importação).
// Lê o .xlsx sem bibliotecas: zip (zlib) + XML por expressões regulares. Nenhum dado da planilha fica no repositório.
import { inflateRawSync } from 'node:zlib';
import { somarMeses } from '../js/core/meses.js';
import { centavos } from '../js/core/casa.js';

// ---------- zip + XML ----------
function arquivosDoZip(buf) {
  let fim = buf.length - 22;
  while (fim >= 0 && buf.readUInt32LE(fim) !== 0x06054b50) fim -= 1;
  if (fim < 0) throw new Error('não é um arquivo .xlsx (zip) válido');
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const arquivos = new Map();
  for (let k = 0; k < total; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('diretório do zip danificado');
    const metodo = buf.readUInt16LE(p + 10);
    const tamanho = buf.readUInt32LE(p + 20);
    const nomeTam = buf.readUInt16LE(p + 28);
    const extraTam = buf.readUInt16LE(p + 30);
    const comentarioTam = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + nomeTam);
    const inicio = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const dados = buf.subarray(inicio, inicio + tamanho);
    arquivos.set(nome, metodo === 8 ? inflateRawSync(dados) : Buffer.from(dados));
    p += 46 + nomeTam + extraTam + comentarioTam;
  }
  return arquivos;
}

const decodificar = (t) => t
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&');
const atributos = (tag) => Object.fromEntries([...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map((m) => [m[1], decodificar(m[2])]));
const textosDe = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodificar(m[1])).join('');

export function lerXlsx(buf) {
  const arquivos = arquivosDoZip(buf);
  const ler = (nome) => arquivos.get(nome)?.toString('utf8') ?? '';
  const compartilhados = [...ler('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textosDe(m[1]));
  const alvos = Object.fromEntries([...ler('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\s[^>]*>/g)]
    .map((m) => atributos(m[0])).map((a) => [a.Id, a.Target]));
  return [...ler('xl/workbook.xml').matchAll(/<sheet\s[^>]*>/g)].map((m) => {
    const a = atributos(m[0]);
    const caminho = `xl/${alvos[a['r:id']].replace(/^\/?(xl\/)?/, '')}`;
    const celulas = new Map();
    for (const c of ler(caminho).matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const at = atributos(c[1]);
      const corpo = c[2] ?? '';
      const v = corpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let valor = null;
      if (at.t === 'inlineStr') valor = textosDe(corpo);
      else if (v === undefined) valor = null;
      else if (at.t === 's') valor = compartilhados[Number(v)];
      else if (at.t === 'str' || at.t === 'e') valor = decodificar(v);
      else if (at.t === 'b') valor = v === '1';
      else valor = Number(v);
      celulas.set(at.r, valor);
    }
    return { nome: a.name, celula: (ref) => celulas.get(ref) ?? null };
  });
}

// ---------- planilha → casa ----------
const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const APELIDOS = { ape: 'Apartamento', apartamento: 'Apartamento' };
const letra = (n) => (n < 26 ? String.fromCharCode(65 + n) : letra(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26)));
const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const doisDigitos = (n) => String(n).padStart(2, '0');

// "CARTÃO CASA" → "Cartão Casa"; siglas curtas (IPTU) ficam; "Apê" e "Apartamento" são a mesma conta.
export function nomeDaConta(bruto) {
  const t = String(bruto).trim().replace(/\s+/g, ' ');
  if (APELIDOS[semAcento(t)]) return APELIDOS[semAcento(t)];
  const letras = t.replace(/[^\p{L}]/gu, '');
  if (t === t.toUpperCase() && letras.length > 4) return t.toLowerCase().replace(/(^|\s)(\S)/g, (_, e, c) => e + c.toUpperCase());
  return t;
}

function lerAbaDeAno(aba) {
  const contas = [];
  let colTotal = null;
  for (let k = 2; k < 80 && colTotal == null; k++) {
    const cab = aba.celula(`${letra(k)}3`);
    if (typeof cab !== 'string' || !cab.trim()) continue;
    if (semAcento(cab) === 'total') colTotal = k;
    else contas.push({ col: letra(k), nome: nomeDaConta(cab) });
  }
  if (colTotal == null) return null;
  const pessoas = [];
  for (let k = colTotal + 1; k < 80; k++) {
    const nome = aba.celula(`${letra(k)}3`);
    if (semAcento(aba.celula(`${letra(k)}4`)) === 'salario' && typeof nome === 'string' && nome.trim()) pessoas.push({ col: letra(k), nome: nome.trim() });
  }
  const linhas = [];
  for (let r = 5; r <= 16; r++) {
    const m = MESES_CURTOS.indexOf(semAcento(aba.celula(`B${r}`)).slice(0, 3));
    if (m >= 0) linhas.push({ r, mes: `${aba.nome}-${doisDigitos(m + 1)}` });
  }
  return { ano: Number(aba.nome), contas, pessoas, linhas, aba };
}

// Aba de compras do cartão: meses na linha 1 (a partir da coluna C), itens na coluna B, linha "TOTAL".
function lerAbaDeCompras(aba, hoje) {
  const colunas = [];
  for (let k = 2; k < 40; k++) {
    const m = MESES_LONGOS.indexOf(semAcento(aba.celula(`${letra(k)}1`)));
    if (m < 0) break;
    colunas.push({ col: letra(k), m: m + 1 });
  }
  if (!colunas.length) return null;
  const [anoHoje, mesHoje] = hoje.split('-').map(Number);
  const primeiro = `${colunas[0].m <= mesHoje ? anoHoje : anoHoje - 1}-${doisDigitos(colunas[0].m)}`;
  const itens = [];
  for (let r = 2; r < 300; r++) {
    const nome = aba.celula(`B${r}`);
    if (typeof nome !== 'string' || !nome.trim() || semAcento(nome) === 'total') continue;
    const valores = colunas.map((c, j) => ({ fatura: somarMeses(primeiro, j + 1), valor: numero(aba.celula(`${c.col}${r}`)) }))
      .filter((x) => x.valor != null && x.valor > 0);
    if (valores.length) itens.push({ nome: nome.trim(), valores });
  }
  return { itens };
}

export function importarPlanilha(abas, { hoje, novoId = () => globalThis.crypto.randomUUID() }) {
  const avisos = [];
  const anoHoje = Number(hoje.slice(0, 4));
  const anos = abas.filter((a) => /^\d{4}$/.test(a.nome.trim()) && Number(a.nome) <= anoHoje)
    .map((a) => { const l = lerAbaDeAno(a); if (!l) avisos.push(`Aba ${a.nome} sem a coluna "Total": ignorada.`); return l; })
    .filter(Boolean)
    .sort((x, y) => x.ano - y.ano);
  if (!anos.length) throw new Error('nenhuma aba de ano encontrada');
  const recente = anos.at(-1);

  // Pessoas: as da aba mais recente; nas outras, pelo nome (ou pela posição).
  const pessoas = recente.pessoas.map((p, k) => ({ id: `p${k + 1}`, nome: p.nome }));
  const idDaPessoa = (nome, k) => pessoas.find((p) => semAcento(p.nome) === semAcento(nome))?.id ?? pessoas[k]?.id;

  // Contas: ativas na ordem da aba mais recente; as outras arquivadas, na ordem em que apareceram.
  const chave = (nome) => semAcento(nome);
  const ordem = [];
  for (const a of anos) for (const c of a.contas) if (!ordem.includes(chave(c.nome))) ordem.push(chave(c.nome));
  const nomes = new Map(anos.flatMap((a) => a.contas.map((c) => [chave(c.nome), c.nome])));
  const ativas = recente.contas.map((c) => chave(c.nome));
  const abaDeCompras = abas.find((a) => nomes.has(semAcento(a.nome)) && lerAbaDeCompras(a, hoje));
  const chaveCartao = abaDeCompras ? semAcento(abaDeCompras.nome) : null;
  const contas = [...ativas, ...ordem.filter((k) => !ativas.includes(k))].map((k) => ({
    id: novoId(), nome: nomes.get(k), compraPorCompra: k === chaveCartao, arquivada: !ativas.includes(k),
  }));
  const idDaConta = new Map(contas.map((c, k) => [chave(c.nome), c.id]));

  const meses = new Map();
  const registro = (mes) => {
    if (!meses.has(mes)) meses.set(mes, { mes, salarios: {}, valores: {}, compras: [] });
    return meses.get(mes);
  };

  // Compras do cartão primeiro: o mês com compras não leva o valor digitado do cartão.
  if (abaDeCompras) {
    const contaId = idDaConta.get(chaveCartao);
    for (const item of lerAbaDeCompras(abaDeCompras, hoje).itens) {
      const grupo = item.valores.length > 1 ? novoId() : null;
      for (const { fatura, valor } of item.valores) {
        const compra = { id: novoId(), contaId, nome: item.nome, valor: centavos(valor) };
        if (grupo) compra.grupo = grupo;
        registro(fatura).compras.push(compra);
      }
    }
  }

  for (const a of anos) {
    for (const { r, mes } of a.linhas) {
      const salarios = a.pessoas.map((p, k) => ({ id: idDaPessoa(p.nome, k), valor: numero(a.aba.celula(`${p.col}${r}`)) }));
      const real = salarios.some((s) => s.valor > 0);
      const reg = registro(mes);
      for (const s of salarios) if (s.valor > 0) reg.salarios[s.id] = centavos(s.valor);
      for (const c of a.contas) {
        const id = idDaConta.get(chave(c.nome));
        const valor = numero(a.aba.celula(`${c.col}${r}`));
        const comCompras = reg.compras.some((x) => x.contaId === id);
        if (chave(c.nome) === chaveCartao && comCompras) {
          const soma = centavos(reg.compras.filter((x) => x.contaId === id).reduce((s, x) => s + x.valor, 0));
          if (valor != null && valor !== 0 && Math.abs(soma - valor) > 0.005) {
            avisos.push(`${c.nome} ${mes}: as compras somam ${soma.toFixed(2)}, mas a aba ${a.ano} tem ${valor.toFixed(2)}.`);
          }
          if (!real) continue;
        }
        if (real) reg.valores[id] = centavos(valor ?? 0);
        else if (valor) reg.valores[id] = centavos(valor);
      }
      // Conta que não existia nesta aba: zero nos meses reais, para a previsão não inventar valor no passado
      // (nem agora, nem se uma conta que não usa mais voltar a ser usada).
      if (real) {
        for (const k of ordem) {
          if (!a.contas.some((c) => chave(c.nome) === k)) reg.valores[idDaConta.get(k)] = 0;
        }
      }
    }
  }

  const lista = [...meses.values()]
    .filter((m) => Object.keys(m.salarios).length || Object.keys(m.valores).length || m.compras.length)
    .sort((x, y) => (x.mes < y.mes ? -1 : 1));
  return { casa: { schemaVersion: 1, pessoas, contas, meses: lista }, avisos };
}
