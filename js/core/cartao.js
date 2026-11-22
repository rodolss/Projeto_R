// Cartões (desenho 2026-11-19-cartao, com o adendo "Vários cartões"): cada pessoa da casa pode ter o seu cartão,
// usado para si, para a casa e para outras pessoas. Cada compra tem data e "para quem"; a fatura sai da data pelo
// melhor dia de compra (o dia em que o cartão vira). As compras ficam no mês da fatura, junto da conta da casa
// ligada ao cartão (id do cartão = id dessa conta), que soma só a parte da casa. As de todo mês (assinaturas,
// contas fixas) ficam no próprio cartão e valem em toda fatura até parar. As outras pessoas valem para todos.
// "Já tenho" (desenho 2026-11-20-ja-tenho): a compra cujo dinheiro já está guardado no cofrinho leva `jaTenho: true`;
// a de todo mês leva `jaTenhoEm: { 'AAAA-MM': true }` (cada fatura marcada à parte). Nunca nas da Casa.
import { somarMeses, diffMeses } from './meses.js';
import { centavos, comMes, adicionarCompra, acompanharFatura, fixasNoMes, compraDaCasa } from './casa.js';

// "Quem ainda te deve" começa nesta fatura: antes dela nada foi marcado, e o histórico não é dívida.
export const JA_TENHO_DESDE = '2026-12';
export const podeTerJaTenho = (item) => Boolean(item?.para) && !compraDaCasa(item);
const semMarca = ({ jaTenho: _marca, ...resto }) => resto;
const semMarcas = ({ jaTenhoEm: _marcas, ...resto }) => resto;

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

// A dona de um cartão é uma pessoa da casa ou um perfil (quem não divide as contas também tem cartão).
const quemE = (casa, id) => casa.pessoas.find((p) => p.id === id) ?? (casa.perfis ?? []).find((p) => p.id === id) ?? null;

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
    const dona = quemE(casa, donaId);
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
  const dona = quemE(casa, cartao.donaId);
  const conta = casa.contas.find((c) => c.id === cartao.contaId);
  const daMesma = (casa.cartoes ?? []).filter((c) => c.donaId && c.donaId === cartao.donaId).length;
  return dona && daMesma === 1 ? dona.nome : conta?.nome ?? 'Cartão';
}

// ---------- as outras pessoas: cada uma é de quem compra para ela (desenho 2026-11-21-para-quem-de-cada-um) ----------
// O "Pai" dela não aparece no cartão dele. Quem foi criada antes disso (sem `donaId`) é de quem já comprou para ela
// num cartão; se ninguém comprou ainda (ou os dois já compraram), continua valendo para todos.
const comPessoas = (casa, mudar) => ({ ...casa, outrasPessoas: mudar(casa.outrasPessoas ?? []) });

export function donaDaPessoa(casa, pessoa) {
  if (pessoa.donaId) return pessoa.donaId;
  const donas = new Set();
  for (const cartao of casa.cartoes ?? []) {
    if (!cartao.donaId) continue;
    const comprou = (cartao.fixas ?? []).some((f) => f.para === pessoa.id)
      || casa.meses.some((m) => (m.compras ?? []).some((c) => c.contaId === cartao.contaId && c.para === pessoa.id));
    if (comprou) donas.add(cartao.donaId);
  }
  return donas.size === 1 ? [...donas][0] : null;
}

// As outras pessoas de quem tem o cartão `donaId` (as dela e as que valem para todos).
export const pessoasDe = (casa, donaId) => (casa.outrasPessoas ?? []).filter((p) => {
  const dona = donaDaPessoa(casa, p);
  return dona === null || dona === donaId;
});

// Nome que já existe na lista de quem compra (mesmo sem acento ou com outra caixa) devolve a pessoa que existe, de
// volta à lista. A pessoa nova é de quem tem o cartão (`donaId`): o "Pai" de cada um é outra pessoa.
export function adicionarPessoaDoCartao(casa, { nome, donaId = null, novoId = idPadrao }) {
  const limpo = nome.trim();
  const candidatas = donaId ? pessoasDe(casa, donaId) : (casa.outrasPessoas ?? []);
  const igual = candidatas.find((p) => semAcento(p.nome) === semAcento(limpo));
  if (igual) return { casa: igual.arquivada ? editarPessoaDoCartao(casa, igual.id, { arquivada: false }) : casa, id: igual.id };
  const id = novoId();
  return { casa: comPessoas(casa, (lista) => [...lista, { id, nome: limpo, ...(donaId ? { donaId } : {}) }]), id };
}

export function editarPessoaDoCartao(casa, id, { nome, arquivada }) {
  const mudanca = definidos({ nome: nome?.trim(), arquivada });
  return comPessoas(casa, (lista) => lista.map((p) => (p.id === id ? { ...p, ...mudanca } : p)));
}

// Ordem das escolhas e das somas: Casa, a dona do cartão, as pessoas da casa, os outros perfis, as outras pessoas.
function todasAsOpcoes(casa, cartaoId) {
  const cartao = acharCartao(casa, cartaoId);
  const dona = quemE(casa, cartao?.donaId);
  const daCasa = casa.pessoas.filter((p) => p.id !== dona?.id);
  const perfis = (casa.perfis ?? []).filter((p) => p.id !== dona?.id && !casa.pessoas.some((x) => x.id === p.id));
  return [
    { id: 'casa', nome: 'Casa' },
    ...(dona ? [dona] : []),
    ...daCasa,
    ...perfis,
    // No cartão, só as outras pessoas de quem o tem; sem cartão (o nome de um "para quem" qualquer), todas.
    ...(cartao?.donaId ? pessoasDe(casa, cartao.donaId) : (casa.outrasPessoas ?? [])),
  ];
}

export const opcoesPara = (casa, cartaoId) => todasAsOpcoes(casa, cartaoId).filter((p) => !p.arquivada).map(({ id, nome }) => ({ id, nome }));

export function nomeDoPara(casa, para) {
  return todasAsOpcoes(casa, null).find((p) => p.id === (para ?? 'casa'))?.nome ?? 'Outra pessoa';
}

// ---------- compras ----------
// `jaTenho`: à vista marca a compra; parcelada, só a 1ª parcela; de todo mês, só a primeira fatura.
export function anotarCompra(casa, { cartaoId, data, fatura, nome, valor, vezes = 1, todoMes = false, para, jaTenho = false, novoId = idPadrao }) {
  const cartao = acharCartao(casa, cartaoId);
  const mes = fatura ?? faturaDaCompra(data, cartao);
  const marcar = jaTenho && podeTerJaTenho({ para });
  if (todoMes) {
    const fixa = { id: novoId(), nome: nome.trim(), valor: centavos(valor), para, desde: mes, ...(marcar ? { jaTenhoEm: { [mes]: true } } : {}) };
    return comCartao(casa, cartaoId, (c) => ({ ...c, fixas: [...c.fixas, fixa] }));
  }
  return adicionarCompra(casa, {
    mes, contaId: cartao.contaId, nome, valor, vezes, novoId, extra: definidos({ data, para }), extraDaPrimeira: marcar ? { jaTenho: true } : {},
  });
}

// Liga ou desliga o "já tenho" de uma compra (`compraId`, só nesta fatura) ou de uma de todo mês (`fixaId`: o
// trecho que vale na fatura). Da Casa, ou que não existe nesta fatura: nada muda.
export function marcarJaTenho(casa, { cartaoId, fatura, compraId, fixaId, jaTenho }) {
  const cartao = acharCartao(casa, cartaoId);
  if (!cartao) return casa;
  const ligar = Boolean(jaTenho);
  if (fixaId) {
    const fixa = fixasNoMes(cartao, fatura).find((f) => f.id === fixaId);
    if (!fixa || !podeTerJaTenho(fixa) || Boolean(fixa.jaTenhoEm?.[fatura]) === ligar) return casa;
    return comCartao(casa, cartaoId, (c) => ({
      ...c,
      fixas: c.fixas.map((f) => {
        if (f.id !== fixaId) return f;
        const { [fatura]: _antes, ...outras } = f.jaTenhoEm ?? {};
        // Sem marcas fica `{}` (não some): a mescla junta chave a chave, e um campo apagado num celular perderia
        // para o objeto inteiro do outro, que acabou de marcar outra fatura (a desmarcada voltaria).
        return { ...f, jaTenhoEm: ligar ? { ...outras, [fatura]: true } : outras };
      }),
    }));
  }
  const alvo = comprasDoCartao(cartao, casa.meses.find((m) => m.mes === fatura)).find((c) => c.id === compraId);
  if (!alvo || !podeTerJaTenho(alvo) || (alvo.jaTenho === true) === ligar) return casa;
  return comMes(casa, fatura, (r) => {
    r.compras = r.compras.map((c) => (c.id !== compraId ? c : ligar ? { ...c, jaTenho: true } : semMarca(c)));
  });
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

// Sem repetir, na ordem das escolhas: Casa, a dona, as pessoas da casa, os outros perfis, as outras pessoas.
function ordenarParas(casa, cartaoId, paras) {
  const ordem = todasAsOpcoes(casa, cartaoId).map((p) => p.id);
  const posicao = (para) => (ordem.indexOf(para) === -1 ? 99 : ordem.indexOf(para));
  return [...new Set(paras)].sort((a, b) => posicao(a) - posicao(b));
}

export function faturaDoCartao(casa, cartaoId, fatura) {
  const cartao = acharCartao(casa, cartaoId);
  const reg = casa.meses.find((m) => m.mes === fatura);
  // A marca só vale fora da Casa (uma marca velha numa compra que virou da Casa não aparece nem soma).
  const compras = ordenarCompras(comprasDoCartao(cartao, reg).map((c) => ({ ...c, para: c.para ?? 'casa' })))
    .map((c) => ({ ...c, jaTenho: podeTerJaTenho(c) && c.jaTenho === true }));
  const fixas = fixasNoMes(cartao, fatura).map((f) => ({ ...f, para: f.para ?? 'casa' }))
    .map((f) => ({ ...f, jaTenho: podeTerJaTenho(f) && Boolean(f.jaTenhoEm?.[fatura]) }));
  const itens = [...compras, ...fixas];
  const somar = (lista) => centavos(lista.reduce((s, x) => s + x.valor, 0));
  const total = somar(itens);
  const paras = ordenarParas(casa, cartaoId, itens.map((x) => x.para));
  // Quanto é de cada um; fora da Casa, quanto já tem (guardado ou pago) e quanto falta.
  const porPessoa = paras
    .map((para) => {
      const deste = itens.filter((x) => x.para === para);
      const valor = somar(deste);
      if (para === 'casa') return { para, nome: nomeDoPara(casa, para), valor, jaTenho: null, falta: null };
      const jaTenho = somar(deste.filter((x) => x.jaTenho));
      return { para, nome: nomeDoPara(casa, para), valor, jaTenho, falta: centavos(valor - jaTenho) };
    })
    .filter((p) => p.valor !== 0);
  const conferida = Boolean(cartao) && Object.prototype.hasOwnProperty.call(reg?.valores ?? {}, cartao.contaId);
  return { fatura, compras, fixas, total, porPessoa, conferida };
}

// À vista: muda tudo (e pode ir para outra fatura). Parcela: nome, valor e para quem, desta em diante.
export function editarCompraDoCartao(casa, { fatura, compraId, nome, valor, para, data, novaFatura }) {
  const alvo = casa.meses.find((m) => m.mes === fatura)?.compras?.find((c) => c.id === compraId);
  if (!alvo) return casa;
  const mudanca = definidos({ nome: nome?.trim(), valor: valor == null ? undefined : centavos(valor), para });
  // Virou da Casa: perde o "já tenho". As outras mudanças (e mudar de fatura) não mexem na marca.
  const aplicar = (c) => (mudanca.para === 'casa' ? semMarca({ ...c, ...mudanca }) : { ...c, ...mudanca });
  if (alvo.grupo) {
    let resultado = casa;
    for (const reg of casa.meses) {
      if (reg.mes < fatura || !(reg.compras ?? []).some((c) => c.grupo === alvo.grupo)) continue;
      resultado = comMes(resultado, reg.mes, (r) => {
        r.compras = r.compras.map((c) => (c.grupo === alvo.grupo ? aplicar(c) : c));
        acompanharFatura(r, alvo.contaId);
      });
    }
    return resultado;
  }
  const nova = { ...aplicar(alvo), ...definidos({ data }) };
  // Só para a mesma fatura ou as seguintes: a compra nunca volta para uma fatura anterior (desenho 2026-11-21-editar-compra).
  const destino = novaFatura && novaFatura > fatura ? novaFatura : fatura;
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

// ---------- corrigir o número de parcelas (desenho 2026-11-21-mudar-parcelas) ----------
// As parcelas de uma compra, na ordem das faturas, com o número de cada uma. À vista: ela mesma, como 1 de 1. Uma
// importação antiga pode não ter o número: conta a partir do número da primeira que tem (ou 1).
export function parcelasDaCompra(casa, { fatura, compraId }) {
  const alvo = casa.meses.find((m) => m.mes === fatura)?.compras?.find((c) => c.id === compraId);
  if (!alvo) return [];
  const lista = alvo.grupo
    ? casa.meses.flatMap((m) => (m.compras ?? []).filter((c) => c.grupo === alvo.grupo).map((compra) => ({ mes: m.mes, compra })))
      .sort((a, b) => (a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0))
    : [{ mes: fatura, compra: alvo }];
  const inicio = lista[0].compra.parcela?.n ?? 1;
  return lista.map((p, k) => ({ ...p, n: inicio + k }));
}

// Muda para `vezes` parcelas: a compra continua começando na mesma fatura; as que faltam entram nas faturas seguintes
// (com o valor e o "para quem" da última; o "já tenho" fica só na primeira, como ao anotar) e as que sobram saem.
// Uma vez só: vira compra à vista. À vista com mais vezes: vira parcelada.
export function mudarParcelas(casa, { fatura, compraId, vezes, novoId = idPadrao }) {
  const parcelas = parcelasDaCompra(casa, { fatura, compraId });
  if (!parcelas.length) return casa;
  // Nunca some a parcela que está sendo editada (nem as de antes dela).
  const daEditada = parcelas.find((p) => p.compra.id === compraId).n;
  const total = Math.max(daEditada, Math.min(48, Math.floor(vezes)));
  const atual = parcelas[0].compra.parcela?.de ?? (parcelas[0].compra.grupo ? parcelas.at(-1).n : 1);
  if (total === atual && parcelas.at(-1).n === total) return casa;
  const grupo = total > 1 ? (parcelas[0].compra.grupo ?? novoId()) : null;
  const comoParcela = (c, n) => {
    const { grupo: _g, parcela: _p, ...resto } = c;
    return grupo ? { ...resto, grupo, parcela: { n, de: total } } : resto;
  };
  let resultado = casa;
  for (const { mes, compra, n } of parcelas) {
    resultado = comMes(resultado, mes, (r) => {
      r.compras = n > total ? r.compras.filter((c) => c.id !== compra.id) : r.compras.map((c) => (c.id === compra.id ? comoParcela(c, n) : c));
      acompanharFatura(r, compra.contaId);
    });
  }
  const ultima = parcelas.at(-1);
  const { id: _id, jaTenho: _ja, ...modelo } = ultima.compra;
  for (let n = ultima.n + 1; n <= total; n++) {
    const nova = comoParcela({ ...modelo, id: novoId() }, n);
    resultado = comMes(resultado, somarMeses(ultima.mes, n - ultima.n), (r) => {
      r.compras.push(nova);
      acompanharFatura(r, nova.contaId);
    });
  }
  return resultado;
}

// Mudar a data de uma compra parcelada: a 1ª parcela vai para a fatura da data nova e as outras andam junto (todas com a
// data nova). Nunca para uma fatura anterior (a regra de editar compra); a tela confere as faturas travadas.
export function mudarDataDaParcelada(casa, { fatura, compraId, data, cartaoId }) {
  const cartao = acharCartao(casa, cartaoId);
  const parcelas = parcelasDaCompra(casa, { fatura, compraId });
  if (!cartao || !parcelas.length || !data) return casa;
  const primeiraAntes = somarMeses(parcelas[0].mes, 1 - parcelas[0].n);
  const passo = diffMeses(primeiraAntes, faturaDaCompra(data, cartao));
  if (passo < 0) return casa;
  let resultado = casa;
  for (const { mes, compra } of parcelas) {
    resultado = comMes(resultado, mes, (r) => {
      r.compras = r.compras.filter((c) => c.id !== compra.id);
      acompanharFatura(r, compra.contaId);
    });
  }
  for (const { mes, compra } of parcelas) {
    resultado = comMes(resultado, somarMeses(mes, passo), (r) => {
      r.compras.push({ ...compra, data });
      acompanharFatura(r, compra.contaId);
    });
  }
  return resultado;
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
  // Trecho que fica da Casa perde as marcas de "já tenho"; os outros as levam (vale a do trecho da fatura).
  const limpar = (f) => (f.para === 'casa' ? semMarcas(f) : f);
  return comCartao(casa, cartaoId, (c) => ({
    ...c,
    fixas: c.fixas.flatMap((f) => {
      if (seguinte(f)) return [limpar({ ...f, ...mudanca })];
      if (f.id !== fixaId) return [f];
      if (fatura <= f.desde) return [limpar({ ...f, ...mudanca })];
      return [{ ...f, ate: somarMeses(fatura, -1) }, limpar({ ...f, ...mudanca, id: novoId(), serie, desde: fatura })];
    }),
  }));
}

// Apagar (lançou algo errado): a de todo mês some inteira, com todos os trechos da série, de qualquer fatura.
export function apagarFixa(casa, { cartaoId, fixaId }) {
  const fixa = acharCartao(casa, cartaoId)?.fixas.find((f) => f.id === fixaId);
  if (!fixa) return casa;
  const serie = serieDe(fixa);
  return comCartao(casa, cartaoId, (c) => ({ ...c, fixas: c.fixas.filter((f) => serieDe(f) !== serie) }));
}

// A primeira fatura em que a de todo mês existe (o começo da série): se ela já está travada, apagar mexeria no passado.
export function inicioDaFixa(casa, { cartaoId, fixaId }) {
  const fixa = acharCartao(casa, cartaoId)?.fixas.find((f) => f.id === fixaId);
  if (!fixa) return null;
  const serie = serieDe(fixa);
  return acharCartao(casa, cartaoId).fixas.filter((f) => serieDe(f) === serie).map((f) => f.desde).sort()[0] ?? null;
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
// As do cartão `cartaoId` vêm antes; de outro cartão, "para a dona dele" vira "para a dona deste" (a farmácia
// que a Ana comprou para ela mesma, no cartão do Leo, é do Leo).
export function nomesUsados(casa, cartaoId = null) {
  const cartoes = casa.cartoes ?? [];
  const deste = acharCartao(casa, cartaoId);
  const grupos = deste ? [[deste], cartoes.filter((c) => c !== deste)] : [cartoes];
  const meses = [...casa.meses].sort((a, b) => (a.mes < b.mes ? 1 : -1));
  const vistos = new Map();
  for (const grupo of grupos) {
    const daConta = new Map(grupo.map((c) => [c.contaId, c]));
    const ver = (item, cartao) => {
      const chave = semAcento(item.nome);
      if (!chave || vistos.has(chave)) return;
      const para = item.para ?? 'casa';
      vistos.set(chave, { nome: item.nome, para: deste && cartao !== deste && para === cartao.donaId ? deste.donaId : para });
    };
    for (const reg of meses) ordenarCompras((reg.compras ?? []).filter((c) => daConta.has(c.contaId))).forEach((c) => ver(c, daConta.get(c.contaId)));
    for (const cartao of grupo) [...cartao.fixas].reverse().forEach((f) => ver(f, cartao));
  }
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

// ---------- o cofrinho ----------
// Quanto deve ter no cofrinho: o "já tenho" das faturas que ainda não venceram (a fatura conta até o dia do
// vencimento; depois, o dinheiro foi usado para pagar). Quem ainda te deve: o que não tem marca, de quem não é a
// Casa nem a dona, desde JA_TENHO_DESDE até a fatura aberta (as futuras ainda não foram cobradas).
// Cartão sem os dias: null (não dá para saber as faturas).
export function cofrinhoDoCartao(casa, cartaoId, hoje) {
  const cartao = acharCartao(casa, cartaoId);
  if (!cartaoPronto(cartao)) return null;
  const somar = (lista) => centavos(lista.reduce((s, x) => s + x.valor, 0));

  const comMarca = new Set([
    ...casa.meses.filter((m) => comprasDoCartao(cartao, m).some((c) => c.jaTenho)).map((m) => m.mes),
    ...cartao.fixas.flatMap((f) => Object.keys(f.jaTenhoEm ?? {})),
  ]);
  const faturas = [...comMarca].sort()
    .map((fatura) => {
      const f = faturaDoCartao(casa, cartaoId, fatura);
      return { fatura, vence: periodoDaFatura(fatura, cartao).vence, valor: somar([...f.compras, ...f.fixas].filter((x) => x.jaTenho)) };
    })
    .filter((x) => x.valor > 0 && x.vence >= hoje);

  const pendente = (x) => !x.jaTenho && podeTerJaTenho(x) && x.para !== cartao.donaId;
  const itens = [];
  for (let fatura = JA_TENHO_DESDE, aberta = faturaDaCompra(hoje, cartao); fatura <= aberta; fatura = somarMeses(fatura, 1)) {
    const f = faturaDoCartao(casa, cartaoId, fatura);
    for (const c of f.compras.filter(pendente)) itens.push({ para: c.para, fatura, tipo: 'compra', id: c.id, nome: c.nome, valor: c.valor, data: c.data ?? null });
    for (const x of f.fixas.filter(pendente)) itens.push({ para: x.para, fatura, tipo: 'fixa', id: x.id, nome: x.nome, valor: x.valor, data: null });
  }
  const devem = ordenarParas(casa, cartaoId, itens.map((i) => i.para)).map((para) => {
    const deste = itens.filter((i) => i.para === para).map(({ para: _para, ...item }) => item);
    return { para, nome: nomeDoPara(casa, para), total: somar(deste), itens: deste };
  });
  return { total: somar(faturas), faturas, devem };
}
