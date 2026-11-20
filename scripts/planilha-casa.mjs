// Importação (uma vez) da planilha de contas da casa para o formato do casa.json (desenho de 2026-11-19, §Importação).
// Lê o .xlsx sem bibliotecas: zip (zlib) + XML por expressões regulares. Nenhum dado da planilha fica no repositório.
import { inflateRawSync } from 'node:zlib';
import { somarMeses, diffMeses } from '../js/core/meses.js';
import { centavos, comMes, compraDaCasa, fixasNoMes, SCHEMA_CASA } from '../js/core/casa.js';
import { adicionarPessoaDoCartao } from '../js/core/cartao.js';

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

// Aba de compras de cartão: meses na linha 1 (a partir da coluna C), itens na coluna B, grupos na coluna A.
// `porFatura`: as colunas já são o mês da fatura (aba pessoal); senão, o mês da compra (fatura no mês seguinte).
// Valores de uma linha: só a sequência a partir do primeiro mês com valor; número com texto logo à esquerda é
// de um quadro ao lado, não da linha.
function lerAbaDeCompras(aba, hoje, { porFatura = false } = {}) {
  const colunas = [];
  for (let k = 2; k < 40; k++) {
    const m = MESES_LONGOS.indexOf(semAcento(aba.celula(`${letra(k)}1`)));
    if (m < 0) break;
    colunas.push({ col: letra(k), m: m + 1 });
  }
  if (!colunas.length) return null;
  // Ano da primeira coluna: o que deixa o mês mais perto de hoje.
  const mesHoje = hoje.slice(0, 7);
  const anoHoje = Number(hoje.slice(0, 4));
  const primeiro = [anoHoje - 1, anoHoje, anoHoje + 1].map((a) => `${a}-${doisDigitos(colunas[0].m)}`)
    .sort((x, y) => Math.abs(diffMeses(mesHoje, x)) - Math.abs(diffMeses(mesHoje, y)))[0];
  const faturaDa = (j) => somarMeses(primeiro, j + (porFatura ? 0 : 1));
  const itens = [];
  let grupo = '';
  for (let r = 2; r < 300; r++) {
    const rotulo = aba.celula(`A${r}`);
    if (typeof rotulo === 'string' && rotulo.trim()) grupo = rotulo.trim();
    const nome = aba.celula(`B${r}`);
    if (typeof nome !== 'string' || !nome.trim() || semAcento(nome) === 'total') continue;
    const celula = (j) => aba.celula(`${colunas[j].col}${r}`);
    const valorEm = (j) => { const v = numero(celula(j)); return v != null && v > 0 ? v : null; };
    const textoAntes = (j) => j > 0 && typeof celula(j - 1) === 'string' && celula(j - 1).trim() !== '';
    const inicio = colunas.findIndex((_, j) => valorEm(j) != null && !textoAntes(j));
    if (inicio < 0) continue;
    const valores = [];
    for (let j = inicio; j < colunas.length && valorEm(j) != null; j++) valores.push({ fatura: faturaDa(j), valor: valorEm(j) });
    itens.push({ nome: nome.trim(), grupo, valores, ateOFim: inicio + valores.length === colunas.length });
  }
  return { primeiraFatura: faturaDa(0), itens };
}

// Grupos da coluna A que são da dona do cartão (os outros rótulos são pessoas) e os que repetem todo mês.
const GRUPOS_DA_DONA = /^(fixas?|assinaturas?|parcelas?|parcelad[ao]s?|gastos?( conjuntos?)?|compras?|outros?|diversos?)$/;
const GRUPOS_TODO_MES = /^(fixas?|assinaturas?)$/;
const MARCA_PARCELAS = /\[\s*(\d+)\s*x\s*\]/i;
const nomeDePessoa = (t) => t.trim().toLowerCase().replace(/(^|\s)(\S)/g, (_, e, c) => e + c.toUpperCase());
const tem = (obj, chave) => Object.prototype.hasOwnProperty.call(obj ?? {}, chave);

// Cartão (desenho 2026-11-19-cartao): a aba com o nome da conta do cartão (compras da casa, por mês da compra)
// e a aba com o nome de uma das pessoas (a dona do cartão; por mês da fatura, com grupos). Sobre uma casa que
// já existe: substitui as compras importadas (sem data) do cartão desde a primeira fatura; não repete as de
// todo mês nem as pessoas; confere o valor digitado do mês e o tira dos meses ainda previstos.
export function importarCartao(abas, { hoje, casa, novoId = () => globalThis.crypto.randomUUID() }) {
  const avisos = [];
  const abaCasa = abas.find((a) => casa.contas.some((c) => semAcento(c.nome) === semAcento(a.nome)) && lerAbaDeCompras(a, hoje));
  const dona = casa.pessoas.find((p) => abas.some((a) => semAcento(a.nome) === semAcento(p.nome)));
  const abaPessoal = dona && abas.find((a) => semAcento(a.nome) === semAcento(dona.nome) && lerAbaDeCompras(a, hoje, { porFatura: true }));
  if (!abaCasa && !abaPessoal) return { casa, avisos };
  const conta = abaCasa
    ? casa.contas.find((c) => semAcento(c.nome) === semAcento(abaCasa.nome))
    : casa.cartao?.contaId ? casa.contas.find((c) => c.id === casa.cartao.contaId) : casa.contas.find((c) => c.compraPorCompra && !c.arquivada);
  if (!conta) {
    avisos.push('Nenhuma conta do cartão nas contas da casa: o cartão não foi importado.');
    return { casa, avisos };
  }
  const lidas = [
    abaCasa && { ...lerAbaDeCompras(abaCasa, hoje), daCasa: true },
    abaPessoal && { ...lerAbaDeCompras(abaPessoal, hoje, { porFatura: true }), daCasa: false },
  ].filter(Boolean);
  const inicio = lidas.map((l) => l.primeiraFatura).sort()[0];

  const atual = casa.cartao ?? { donaId: null, viraNoDia: null, venceNoDia: null, pessoas: [], fixas: [] };
  let c = {
    ...casa,
    schemaVersion: SCHEMA_CASA,
    contas: casa.contas.map((x) => (x.id === conta.id ? { ...x, compraPorCompra: true } : x)),
    cartao: { ...atual, donaId: atual.donaId ?? dona?.id ?? null, contaId: conta.id },
  };
  for (const reg of [...c.meses]) {
    if (reg.mes < inicio || !reg.compras.some((x) => x.contaId === conta.id && !x.data)) continue;
    c = comMes(c, reg.mes, (r) => { r.compras = r.compras.filter((x) => x.contaId !== conta.id || x.data); });
  }

  const paraDoGrupo = (grupo) => {
    const chave = semAcento(grupo);
    if (chave === 'casa') return 'casa';
    if (!chave || GRUPOS_DA_DONA.test(chave)) return dona?.id ?? 'casa';
    const r = adicionarPessoaDoCartao(c, { nome: nomeDePessoa(grupo), novoId });
    c = r.casa;
    return r.id;
  };
  const acrescentarFixa = (fixa) => {
    const igual = c.cartao.fixas.some((f) => semAcento(f.nome) === semAcento(fixa.nome) && f.para === fixa.para && f.desde === fixa.desde && f.valor === fixa.valor);
    if (!igual) c = { ...c, cartao: { ...c.cartao, fixas: [...c.cartao.fixas, fixa] } };
  };

  for (const lida of lidas) {
    for (const item of lida.itens) {
      const para = lida.daCasa ? 'casa' : paraDoGrupo(item.grupo);
      const marca = item.nome.match(MARCA_PARCELAS);
      const nome = item.nome.replace(MARCA_PARCELAS, ' ').replace(/\s+/g, ' ').trim();
      const todoMes = !marca && (GRUPOS_TODO_MES.test(semAcento(item.grupo)) && !lida.daCasa || (item.valores.length >= 2 && item.ateOFim));
      if (todoMes) {
        // Um trecho por valor: valor que muda fecha o trecho anterior; o último continua.
        const trechos = [];
        for (const v of item.valores) {
          const ultimo = trechos.at(-1);
          if (ultimo && Math.abs(ultimo.valor - v.valor) < 0.005) ultimo.ate = v.fatura;
          else trechos.push({ valor: v.valor, desde: v.fatura, ate: v.fatura });
        }
        trechos.forEach((t, k) => acrescentarFixa({
          id: novoId(), nome, valor: centavos(t.valor), para, desde: t.desde, ...(k < trechos.length - 1 ? { ate: t.ate } : {}),
        }));
        continue;
      }
      // "[Nx]": a última coluna com valor é a parcela N. Sem marca, a sequência é de 1 até o fim.
      const n = item.valores.length;
      const de = marca ? Math.max(Number(marca[1]), n) : n;
      const grupo = de > 1 ? novoId() : null;
      item.valores.forEach((v, j) => {
        const compra = { id: novoId(), contaId: conta.id, nome, valor: centavos(v.valor), para };
        if (grupo) Object.assign(compra, { grupo, parcela: { n: de - n + 1 + j, de } });
        c = comMes(c, v.fatura, (r) => { r.compras.push(compra); });
      });
    }
  }

  for (const reg of [...c.meses]) {
    if (reg.mes < inicio || !tem(reg.valores, conta.id)) continue;
    const itens = [...reg.compras.filter((x) => x.contaId === conta.id && compraDaCasa(x)), ...fixasNoMes(c, reg.mes).filter(compraDaCasa)];
    const soma = centavos(itens.reduce((s, x) => s + x.valor, 0));
    const digitado = reg.valores[conta.id];
    if (digitado !== 0 && Math.abs(soma - digitado) > 0.005) {
      avisos.push(`${conta.nome} ${reg.mes}: as compras da casa somam ${soma.toFixed(2)}, mas o valor do mês é ${digitado.toFixed(2)}.`);
    }
    if (!Object.keys(reg.salarios).length) c = comMes(c, reg.mes, (r) => { delete r.valores[conta.id]; });
  }
  return { casa: c, avisos };
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

  for (const a of anos) {
    for (const { r, mes } of a.linhas) {
      const salarios = a.pessoas.map((p, k) => ({ id: idDaPessoa(p.nome, k), valor: numero(a.aba.celula(`${p.col}${r}`)) }));
      const real = salarios.some((s) => s.valor > 0);
      const reg = registro(mes);
      for (const s of salarios) if (s.valor > 0) reg.salarios[s.id] = centavos(s.valor);
      for (const c of a.contas) {
        const id = idDaConta.get(chave(c.nome));
        const valor = numero(a.aba.celula(`${c.col}${r}`));
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
  // O cartão (compras da casa e a aba pessoal) entra por cima, conferindo com o valor do mês.
  const cartao = importarCartao(abas, { hoje, casa: { schemaVersion: SCHEMA_CASA, pessoas, contas, meses: lista, cartao: null }, novoId });
  return { casa: cartao.casa, avisos: [...avisos, ...cartao.avisos] };
}
