// Cartões (desenho 2026-11-19-cartao, com o adendo "Vários cartões"): cada pessoa da casa pode ter o seu cartão,
// usado para si, para a casa e para outras pessoas. Cada compra tem data e "para quem"; a fatura sai da data pelo
// melhor dia de compra (o dia em que o cartão vira). As compras ficam no mês da fatura, junto da conta da casa
// ligada ao cartão (id do cartão = id dessa conta), que soma só a parte da casa. As de todo mês (assinaturas,
// contas fixas) ficam no próprio cartão e valem em toda fatura até parar. As outras pessoas valem para todos.
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

// ---------- os cartões ----------
export const cartaoPronto = (cartao) => Boolean(cartao?.donaId && cartao.viraNoDia && cartao.venceNoDia);
export const acharCartao = (casa, cartaoId) => (casa.cartoes ?? []).find((c) => c.id === cartaoId) ?? null;
const comCartao = (casa, cartaoId, mudar) => ({
  ...casa, cartoes: (casa.cartoes ?? []).map((c) => (c.id === cartaoId ? mudar(c) : c)),
});

// O primeiro cartão de uma casa sem cartões fica com a conta compra por compra que já existe (se houver uma só);
// os outros ganham uma conta nova, com o nome dado (padrão "Cartão <nome de quem é>").
export function adicionarCartao(casa, { donaId, viraNoDia, venceNoDia, nome, contaId, novoId = idPadrao }) {
  const cartoes = casa.cartoes ?? [];
  const ligadas = new Set(cartoes.map((c) => c.contaId));
  const livres = casa.contas.filter((c) => c.compraPorCompra && !c.arquivada && !ligadas.has(c.id));
  let contas = casa.contas;
  let conta = contaId && !ligadas.has(contaId) ? contaId : (!cartoes.length && livres.length === 1 ? livres[0].id : null);
  if (conta) {
    contas = contas.map((c) => (c.id === conta && !c.compraPorCompra ? { ...c, compraPorCompra: true } : c));
  } else {
    conta = novoId();
    const dona = casa.pessoas.find((p) => p.id === donaId);
    contas = [...contas, { id: conta, nome: nome?.trim() || `Cartão ${dona?.nome ?? ''}`.trim(), compraPorCompra: true, arquivada: false }];
  }
  const cartao = { id: conta, contaId: conta, donaId: donaId ?? null, viraNoDia: viraNoDia ?? null, venceNoDia: venceNoDia ?? null, fixas: [] };
  return { casa: { ...casa, contas, cartoes: [...cartoes, cartao] }, id: conta };
}

export function configurarCartao(casa, cartaoId, { donaId, viraNoDia, venceNoDia }) {
  return comCartao(casa, cartaoId, (c) => ({ ...c, ...definidos({ donaId, viraNoDia, venceNoDia }) }));
}

// Só cartão sem compras nem de todo mês sai (criado por engano); a conta dele, se vazia, deixa de aparecer.
export function tirarCartao(casa, cartaoId) {
  const cartao = acharCartao(casa, cartaoId);
  if (!cartao) return casa;
  const usada = casa.meses.some((m) => (m.compras ?? []).some((c) => c.contaId === cartao.contaId));
  if (usada || cartao.fixas.length) return casa;
  const comValor = casa.meses.some((m) => Object.prototype.hasOwnProperty.call(m.valores ?? {}, cartao.contaId));
  return {
    ...casa,
    cartoes: casa.cartoes.filter((c) => c.id !== cartaoId),
    contas: comValor ? casa.contas : casa.contas.map((c) => (c.id === cartao.contaId ? { ...c, arquivada: true } : c)),
  };
}

// Nos botões de troca: o nome de quem é; o nome da conta se a pessoa tiver mais de um cartão.
export function rotuloDoCartao(casa, cartao) {
  const dona = casa.pessoas.find((p) => p.id === cartao.donaId);
  const conta = casa.contas.find((c) => c.id === cartao.contaId);
  const daMesma = (casa.cartoes ?? []).filter((c) => c.donaId && c.donaId === cartao.donaId).length;
  return dona && daMesma === 1 ? dona.nome : conta?.nome ?? 'Cartão';
}

// ---------- as outras pessoas (valem para todos os cartões) ----------
const comPessoas = (casa, mudar) => ({ ...casa, outrasPessoas: mudar(casa.outrasPessoas ?? []) });

// Nome que já existe (mesmo sem acento ou com outra caixa) devolve a pessoa que existe, de volta à lista.
export function adicionarPessoaDoCartao(casa, { nome, novoId = idPadrao }) {
  const limpo = nome.trim();
  const igual = (casa.outrasPessoas ?? []).find((p) => semAcento(p.nome) === semAcento(limpo));
  if (igual) return { casa: igual.arquivada ? editarPessoaDoCartao(casa, igual.id, { arquivada: false }) : casa, id: igual.id };
  const id = novoId();
  return { casa: comPessoas(casa, (lista) => [...lista, { id, nome: limpo }]), id };
}

export function editarPessoaDoCartao(casa, id, { nome, arquivada }) {
  const mudanca = definidos({ nome: nome?.trim(), arquivada });
  return comPessoas(casa, (lista) => lista.map((p) => (p.id === id ? { ...p, ...mudanca } : p)));
}

// Ordem das escolhas e das somas: Casa, a dona do cartão, a outra pessoa da casa, as outras pessoas.
function todasAsOpcoes(casa, cartaoId) {
  const dona = casa.pessoas.find((p) => p.id === acharCartao(casa, cartaoId)?.donaId);
  return [
    { id: 'casa', nome: 'Casa' },
    ...(dona ? [dona] : []),
    ...casa.pessoas.filter((p) => p !== dona),
    ...(casa.outrasPessoas ?? []),
  ];
}

export const opcoesPara = (casa, cartaoId) => todasAsOpcoes(casa, cartaoId).filter((p) => !p.arquivada).map(({ id, nome }) => ({ id, nome }));

export function nomeDoPara(casa, para) {
  return todasAsOpcoes(casa, null).find((p) => p.id === (para ?? 'casa'))?.nome ?? 'Outra pessoa';
}

// ---------- compras ----------
export function anotarCompra(casa, { cartaoId, data, fatura, nome, valor, vezes = 1, todoMes = false, para, novoId = idPadrao }) {
  const cartao = acharCartao(casa, cartaoId);
  const mes = fatura ?? faturaDaCompra(data, cartao);
  if (todoMes) {
    const fixa = { id: novoId(), nome: nome.trim(), valor: centavos(valor), para, desde: mes };
    return comCartao(casa, cartaoId, (c) => ({ ...c, fixas: [...c.fixas, fixa] }));
  }
  return adicionarCompra(casa, { mes, contaId: cartao.contaId, nome, valor, vezes, novoId, extra: definidos({ data, para }) });
}

const comprasDoCartao = (cartao, reg) => (reg?.compras ?? []).filter((c) => c.contaId === cartao?.contaId);

// Mais nova primeiro (na mesma data, a anotada por último primeiro); sem data no fim, na ordem em que vieram.
function ordenarCompras(compras) {
  return compras.map((c, i) => ({ c, i })).sort((a, b) => {
    const [da, db] = [a.c.data ?? '', b.c.data ?? ''];
    if (da !== db) return da < db ? 1 : -1;
    return da ? b.i - a.i : a.i - b.i;
  }).map(({ c }) => c);
}

export function faturaDoCartao(casa, cartaoId, fatura) {
  const cartao = acharCartao(casa, cartaoId);
  const reg = casa.meses.find((m) => m.mes === fatura);
  const compras = ordenarCompras(comprasDoCartao(cartao, reg).map((c) => ({ ...c, para: c.para ?? 'casa' })));
  const fixas = fixasNoMes(cartao, fatura).map((f) => ({ ...f, para: f.para ?? 'casa' }));
  const itens = [...compras, ...fixas];
  const total = centavos(itens.reduce((s, x) => s + x.valor, 0));
  const ordem = todasAsOpcoes(casa, cartaoId).map((p) => p.id);
  const posicao = (para) => (ordem.indexOf(para) === -1 ? 99 : ordem.indexOf(para));
  const paras = [...new Set(itens.map((x) => x.para))].sort((a, b) => posicao(a) - posicao(b));
  const porPessoa = paras
    .map((para) => ({ para, nome: nomeDoPara(casa, para), valor: centavos(itens.filter((x) => x.para === para).reduce((s, x) => s + x.valor, 0)) }))
    .filter((p) => p.valor !== 0);
  const conferida = Boolean(cartao) && Object.prototype.hasOwnProperty.call(reg?.valores ?? {}, cartao.contaId);
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

// ---------- as de todo mês ----------
// Trechos da mesma de todo mês (o valor mudou numa fatura) formam uma série: o primeiro trecho dá o nome à série.
const serieDe = (f) => f.serie ?? f.id;

// Mudar numa fatura depois da primeira fecha o trecho no mês anterior e começa um novo: o passado não muda.
// O que mudou (só o que mudou) vale também para os trechos seguintes da série: "desta fatura em diante".
export function editarFixa(casa, { cartaoId, fixaId, fatura, nome, valor, para, novoId = idPadrao }) {
  const fixa = acharCartao(casa, cartaoId)?.fixas.find((f) => f.id === fixaId);
  if (!fixa) return casa;
  const pedida = definidos({ nome: nome?.trim(), valor: valor == null ? undefined : centavos(valor), para });
  const mudanca = Object.fromEntries(Object.entries(pedida).filter(([k, v]) => fixa[k] !== v));
  if (!Object.keys(mudanca).length) return casa;
  const serie = serieDe(fixa);
  const seguinte = (f) => f.id !== fixa.id && serieDe(f) === serie && f.desde > fixa.desde;
  return comCartao(casa, cartaoId, (c) => ({
    ...c,
    fixas: c.fixas.flatMap((f) => {
      if (seguinte(f)) return [{ ...f, ...mudanca }];
      if (f.id !== fixaId) return [f];
      if (fatura <= f.desde) return [{ ...f, ...mudanca }];
      return [{ ...f, ate: somarMeses(fatura, -1) }, { ...f, ...mudanca, id: novoId(), serie, desde: fatura }];
    }),
  }));
}

// Parar some desta fatura em diante em toda a série (um preço novo planejado não volta sozinho).
export function pararFixa(casa, { cartaoId, fixaId, fatura }) {
  const fixa = acharCartao(casa, cartaoId)?.fixas.find((f) => f.id === fixaId);
  if (!fixa) return casa;
  const serie = serieDe(fixa);
  return comCartao(casa, cartaoId, (c) => ({
    ...c,
    fixas: c.fixas.flatMap((f) => {
      if (serieDe(f) !== serie) return [f];
      if (f.desde >= fatura) return [];
      return f.ate && f.ate < fatura ? [f] : [{ ...f, ate: somarMeses(fatura, -1) }];
    }),
  }));
}

// ---------- sugestões e limites ----------
// Para sugerir no "O que foi": nomes já usados em qualquer cartão, o mais recente primeiro, com para quem foi.
export function nomesUsados(casa) {
  const vistos = new Map();
  const ver = (item) => {
    const chave = semAcento(item.nome);
    if (chave && !vistos.has(chave)) vistos.set(chave, { nome: item.nome, para: item.para ?? 'casa' });
  };
  const contas = new Set((casa.cartoes ?? []).map((c) => c.contaId));
  const meses = [...casa.meses].sort((a, b) => (a.mes < b.mes ? 1 : -1));
  for (const reg of meses) ordenarCompras((reg.compras ?? []).filter((c) => contas.has(c.contaId))).forEach(ver);
  for (const cartao of casa.cartoes ?? []) [...cartao.fixas].reverse().forEach(ver);
  return [...vistos.values()];
}

export function primeiraFatura(casa, cartaoId) {
  const cartao = acharCartao(casa, cartaoId);
  if (!cartao) return null;
  const meses = [
    ...casa.meses.filter((m) => comprasDoCartao(cartao, m).length).map((m) => m.mes),
    ...cartao.fixas.map((f) => f.desde),
  ].sort();
  return meses[0] ?? null;
}
