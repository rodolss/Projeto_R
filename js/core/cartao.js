// Cartão (desenho 2026-11-19-cartao): o cartão de uma das pessoas, usado para ela, para a casa e para outras
// pessoas. Cada compra tem data e "para quem"; a fatura sai da data pelo melhor dia de compra (o dia em que o
// cartão vira). As compras ficam no mês da fatura, junto da conta da casa ligada ao cartão, que soma só a parte
// da casa. As de todo mês (assinaturas, contas fixas) ficam numa lista própria e valem em toda fatura até parar.
import { somarMeses } from './meses.js';
import { centavos, comMes, adicionarCompra, acompanharFatura, fixasNoMes } from './casa.js';

const idPadrao = () => globalThis.crypto.randomUUID();
const dois = (n) => String(n).padStart(2, '0');
const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const definidos = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export const diasNoMes = (mes) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
// Melhor dia 31 em fevereiro vira o último dia de fevereiro (e o mesmo vale para o vencimento).
const diaNoMes = (mes, dia) => Math.min(dia, diasNoMes(mes));

// A compra fecha no mês em que o cartão vira depois dela; a fatura vence nesse mês ou, se o vencimento é antes
// do melhor dia, no mês seguinte.
export function faturaDaCompra(data, { viraNoDia, venceNoDia }) {
  const mes = data.slice(0, 7);
  const fecha = Number(data.slice(8, 10)) >= diaNoMes(mes, viraNoDia) ? somarMeses(mes, 1) : mes;
  return venceNoDia >= viraNoDia ? fecha : somarMeses(fecha, 1);
}

// Datas ISO: compras de `de` a `ate` caem nesta fatura, que vence em `vence`.
export function periodoDaFatura(fatura, { viraNoDia, venceNoDia }) {
  const mesVira = venceNoDia >= viraNoDia ? fatura : somarMeses(fatura, -1);
  const antes = somarMeses(mesVira, -1);
  const vira = diaNoMes(mesVira, viraNoDia);
  return {
    de: `${antes}-${dois(diaNoMes(antes, viraNoDia))}`,
    ate: vira > 1 ? `${mesVira}-${dois(vira - 1)}` : `${antes}-${dois(diasNoMes(antes))}`,
    vence: `${fatura}-${dois(diaNoMes(fatura, venceNoDia))}`,
  };
}

export const cartaoPronto = (casa) => Boolean(casa?.cartao?.viraNoDia && casa.cartao.venceNoDia && casa.cartao.contaId);

const VAZIO = { donaId: null, viraNoDia: null, venceNoDia: null, contaId: null, pessoas: [], fixas: [] };

// A parte da casa vai para a conta compra por compra que já existe (ou para "Cartão da casa", criada aqui).
export function configurarCartao(casa, { donaId, viraNoDia, venceNoDia, contaId, novoId = idPadrao }) {
  const atual = casa.cartao ?? VAZIO;
  let contas = casa.contas;
  let conta = contaId ?? atual.contaId ?? contas.find((c) => c.compraPorCompra && !c.arquivada)?.id;
  if (!conta) {
    conta = novoId();
    contas = [...contas, { id: conta, nome: 'Cartão da casa', compraPorCompra: true, arquivada: false }];
  } else {
    contas = contas.map((c) => (c.id === conta && !c.compraPorCompra ? { ...c, compraPorCompra: true } : c));
  }
  return {
    ...casa,
    contas,
    cartao: { ...atual, ...definidos({ donaId, viraNoDia, venceNoDia }), contaId: conta },
  };
}

const comCartao = (casa, mudar) => ({ ...casa, cartao: mudar(casa.cartao ?? VAZIO) });

// Nome que já existe (mesmo sem acento ou com outra caixa) devolve a pessoa que existe, de volta à lista.
export function adicionarPessoaDoCartao(casa, { nome, novoId = idPadrao }) {
  const limpo = nome.trim();
  const igual = (casa.cartao?.pessoas ?? []).find((p) => semAcento(p.nome) === semAcento(limpo));
  if (igual) return { casa: igual.arquivada ? editarPessoaDoCartao(casa, igual.id, { arquivada: false }) : casa, id: igual.id };
  const id = novoId();
  return { casa: comCartao(casa, (c) => ({ ...c, pessoas: [...c.pessoas, { id, nome: limpo }] })), id };
}

export function editarPessoaDoCartao(casa, id, { nome, arquivada }) {
  const mudanca = definidos({ nome: nome?.trim(), arquivada });
  return comCartao(casa, (c) => ({ ...c, pessoas: c.pessoas.map((p) => (p.id === id ? { ...p, ...mudanca } : p)) }));
}

// Ordem das escolhas e das somas: Casa, a dona do cartão, a outra pessoa da casa, as outras pessoas.
function todasAsOpcoes(casa) {
  const dona = casa.pessoas.find((p) => p.id === casa.cartao?.donaId);
  return [
    { id: 'casa', nome: 'Casa' },
    ...(dona ? [dona] : []),
    ...casa.pessoas.filter((p) => p !== dona),
    ...(casa.cartao?.pessoas ?? []),
  ];
}

export const opcoesPara = (casa) => todasAsOpcoes(casa).filter((p) => !p.arquivada).map(({ id, nome }) => ({ id, nome }));

export function nomeDoPara(casa, para) {
  return todasAsOpcoes(casa).find((p) => p.id === (para ?? 'casa'))?.nome ?? 'Outra pessoa';
}

export function anotarCompra(casa, { data, fatura, nome, valor, vezes = 1, todoMes = false, para, novoId = idPadrao }) {
  const cfg = casa.cartao;
  const mes = fatura ?? faturaDaCompra(data, cfg);
  if (todoMes) {
    const fixa = { id: novoId(), nome: nome.trim(), valor: centavos(valor), para, desde: mes };
    return comCartao(casa, (c) => ({ ...c, fixas: [...c.fixas, fixa] }));
  }
  return adicionarCompra(casa, { mes, contaId: cfg.contaId, nome, valor, vezes, novoId, extra: definidos({ data, para }) });
}

const comprasDoCartao = (casa, reg) => (reg?.compras ?? []).filter((c) => c.contaId === casa.cartao?.contaId);

// Mais nova primeiro (na mesma data, a anotada por último primeiro); sem data no fim, na ordem em que vieram.
function ordenarCompras(compras) {
  return compras.map((c, i) => ({ c, i })).sort((a, b) => {
    const [da, db] = [a.c.data ?? '', b.c.data ?? ''];
    if (da !== db) return da < db ? 1 : -1;
    return da ? b.i - a.i : a.i - b.i;
  }).map(({ c }) => c);
}

export function faturaDoCartao(casa, fatura) {
  const reg = casa.meses.find((m) => m.mes === fatura);
  const compras = ordenarCompras(comprasDoCartao(casa, reg).map((c) => ({ ...c, para: c.para ?? 'casa' })));
  const fixas = fixasNoMes(casa, fatura).map((f) => ({ ...f, para: f.para ?? 'casa' }));
  const itens = [...compras, ...fixas];
  const total = centavos(itens.reduce((s, x) => s + x.valor, 0));
  const ordem = todasAsOpcoes(casa).map((p) => p.id);
  const paras = [...new Set(itens.map((x) => x.para))]
    .sort((a, b) => (ordem.indexOf(a) === -1 ? 99 : ordem.indexOf(a)) - (ordem.indexOf(b) === -1 ? 99 : ordem.indexOf(b)));
  const porPessoa = paras
    .map((para) => ({ para, nome: nomeDoPara(casa, para), valor: centavos(itens.filter((x) => x.para === para).reduce((s, x) => s + x.valor, 0)) }))
    .filter((p) => p.valor !== 0);
  const conferida = Object.prototype.hasOwnProperty.call(reg?.valores ?? {}, casa.cartao?.contaId);
  return { fatura, compras, fixas, total, porPessoa, conferida };
}

// À vista: muda tudo (e pode ir para outra fatura). Parcela: nome, valor e para quem, desta em diante.
export function editarCompraDoCartao(casa, { fatura, compraId, nome, valor, para, data, novaFatura }) {
  const alvo = casa.meses.find((m) => m.mes === fatura)?.compras?.find((c) => c.id === compraId);
  if (!alvo) return casa;
  const mudanca = definidos({ nome: nome?.trim(), valor: valor == null ? undefined : centavos(valor), para });
  if (alvo.grupo) {
    let resultado = casa;
    for (const reg of casa.meses) {
      if (reg.mes < fatura || !(reg.compras ?? []).some((c) => c.grupo === alvo.grupo)) continue;
      resultado = comMes(resultado, reg.mes, (r) => {
        r.compras = r.compras.map((c) => (c.grupo === alvo.grupo ? { ...c, ...mudanca } : c));
        acompanharFatura(r, alvo.contaId);
      });
    }
    return resultado;
  }
  const nova = { ...alvo, ...mudanca, ...definidos({ data }) };
  const destino = novaFatura ?? fatura;
  if (destino === fatura) {
    return comMes(casa, fatura, (r) => {
      r.compras = r.compras.map((c) => (c.id === compraId ? nova : c));
      acompanharFatura(r, alvo.contaId);
    });
  }
  const tirada = comMes(casa, fatura, (r) => {
    r.compras = r.compras.filter((c) => c.id !== compraId);
    acompanharFatura(r, alvo.contaId);
  });
  return comMes(tirada, destino, (r) => {
    r.compras.push(nova);
    acompanharFatura(r, alvo.contaId);
  });
}

// Mudar numa fatura depois da primeira fecha a antiga no mês anterior e começa uma nova: o passado não muda.
export function editarFixa(casa, { fixaId, fatura, nome, valor, para, novoId = idPadrao }) {
  const fixa = casa.cartao?.fixas?.find((f) => f.id === fixaId);
  if (!fixa) return casa;
  const mudanca = definidos({ nome: nome?.trim(), valor: valor == null ? undefined : centavos(valor), para });
  if (Object.entries(mudanca).every(([k, v]) => fixa[k] === v)) return casa;
  if (fatura <= fixa.desde) {
    return comCartao(casa, (c) => ({ ...c, fixas: c.fixas.map((f) => (f.id === fixaId ? { ...f, ...mudanca } : f)) }));
  }
  const nova = { ...fixa, ...mudanca, id: novoId(), desde: fatura };
  return comCartao(casa, (c) => ({
    ...c,
    fixas: c.fixas.flatMap((f) => (f.id === fixaId ? [{ ...f, ate: somarMeses(fatura, -1) }, nova] : [f])),
  }));
}

export function pararFixa(casa, { fixaId, fatura }) {
  return comCartao(casa, (c) => ({
    ...c,
    fixas: c.fixas.flatMap((f) => {
      if (f.id !== fixaId) return [f];
      return fatura <= f.desde ? [] : [{ ...f, ate: somarMeses(fatura, -1) }];
    }),
  }));
}

// Para sugerir no "O que foi": nomes já usados, o mais recente primeiro, com para quem foi da última vez.
export function nomesUsados(casa) {
  const vistos = new Map();
  const ver = (item) => {
    const chave = semAcento(item.nome);
    if (chave && !vistos.has(chave)) vistos.set(chave, { nome: item.nome, para: item.para ?? 'casa' });
  };
  const meses = [...casa.meses].sort((a, b) => (a.mes < b.mes ? 1 : -1));
  for (const reg of meses) ordenarCompras(comprasDoCartao(casa, reg)).forEach(ver);
  [...(casa.cartao?.fixas ?? [])].reverse().forEach(ver);
  return [...vistos.values()];
}

export function primeiraFatura(casa) {
  const meses = [
    ...casa.meses.filter((m) => comprasDoCartao(casa, m).length).map((m) => m.mes),
    ...(casa.cartao?.fixas ?? []).map((f) => f.desde),
  ].sort();
  return meses[0] ?? null;
}
