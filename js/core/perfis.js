// Perfis (desenho 2026-11-20-perfis): cada pessoa vê os próprios cartões. O perfil de um aparelho vem da chave do
// GitHub dele: o casa.json guarda a impressão da chave (nunca a chave) ligada a um perfil. Quem administra troca
// de perfil (só neste aparelho) e vê a tela exatamente como a outra pessoa vê. É seguro sem PIN porque só quem
// administra cria chaves. Separação só no app: os dados continuam no mesmo arquivo.
import { faturaDoCartao, periodoDaFatura, cartaoPronto, primeiraFatura } from './cartao.js';
import { valorDaConta, pessoasNoMes, divideNoMes } from './casa.js';

const idPadrao = () => globalThis.crypto.randomUUID();

// SHA-256 do texto da chave, 16 primeiros caracteres hexadecimais.
export async function impressaoDaChave(token) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(token)));
  return [...new Uint8Array(bytes)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const acharPerfil = (casa, id) => (casa?.perfis ?? []).find((p) => p.id === id) ?? null;

export function perfilDoAparelho(casa, impressao) {
  if (!impressao) return null;
  const aparelho = (casa?.aparelhos ?? []).find((a) => a.id === impressao);
  return aparelho ? acharPerfil(casa, aparelho.perfilId) : null;
}

export function vincularAparelho(casa, { impressao, perfilId, hoje }) {
  const outros = (casa.aparelhos ?? []).filter((a) => a.id !== impressao);
  return { ...casa, aparelhos: [...outros, { id: impressao, perfilId, desde: hoje }] };
}

export const desvincularAparelho = (casa, impressao) => ({ ...casa, aparelhos: (casa.aparelhos ?? []).filter((a) => a.id !== impressao) });

// Perfil novo: cartões próprios; só divide as contas quando quem administra marca (entrarNaDivisao).
export function adicionarPerfil(casa, { nome, novoId = idPadrao }) {
  const id = novoId();
  return { casa: { ...casa, perfis: [...(casa.perfis ?? []), { id, nome: nome.trim() }] }, id };
}

// ---------- perfis nos Ajustes (desenho 2026-11-21-perfis-e-aparelhos-simples) ----------
// A linha de explicação de cada perfil na lista: "administra · este aparelho e mais 1", "1 aparelho"...
export function detalheDoPerfil(casa, perfil, impressao) {
  const deles = (casa.aparelhos ?? []).filter((a) => a.perfilId === perfil.id);
  const comEste = deles.some((a) => a.id === impressao);
  const plural = (n) => `${n} ${n === 1 ? 'aparelho' : 'aparelhos'}`;
  const aparelhos = comEste ? `este aparelho${deles.length > 1 ? ` e mais ${deles.length - 1}` : ''}`
    : deles.length ? plural(deles.length) : 'sem aparelho ainda';
  return [perfil.admin && 'administra', aparelhos].filter(Boolean).join(' · ');
}

// Só sai o perfil criado por engano: sem cartão, sem aparelho, fora da divisão (nem com meses passados) e que não
// administra. Assim nada some do histórico.
export function podeApagarPerfil(casa, id) {
  const perfil = acharPerfil(casa, id);
  return Boolean(perfil) && !perfil.admin
    && !(casa.cartoes ?? []).some((c) => c.donaId === id)
    && !(casa.aparelhos ?? []).some((a) => a.perfilId === id)
    && !casa.pessoas.some((p) => p.id === id);
}

export const apagarPerfil = (casa, id) => (podeApagarPerfil(casa, id) ? { ...casa, perfis: casa.perfis.filter((p) => p.id !== id) } : casa);

// ---------- quem divide as contas (desenho 2026-11-21-divisao-pelos-perfis) ----------
// Entrar ou sair vale do mês dado (o mês em foco) em diante, e os meses antes não mudam: entrar junta [mês, sempre)
// aos períodos da pessoa (`dentro`, em casa.js); sair tira. Desfazer no mesmo mês volta ao que era. Sem períodos, a
// pessoa deixa a lista de quem divide; com um período sem começo nem fim, divide sempre (sem `dentro`).
function comPeriodos(casa, id, dentro) {
  const pessoa = casa.pessoas.find((p) => p.id === id);
  const { dentro: _antes, ...resto } = pessoa;
  if (JSON.stringify(dentro) === JSON.stringify(pessoa.dentro ?? [{}])) return casa;
  if (!dentro.length) return { ...casa, pessoas: casa.pessoas.filter((p) => p.id !== id) };
  const sempre = dentro.length === 1 && !dentro[0].de && !dentro[0].ate;
  return { ...casa, pessoas: casa.pessoas.map((p) => (p.id === id ? (sempre ? resto : { ...resto, dentro }) : p)) };
}

export function entrarNaDivisao(casa, id, mes) {
  const pessoa = casa.pessoas.find((p) => p.id === id);
  if (!pessoa) {
    const perfil = acharPerfil(casa, id);
    return perfil ? { ...casa, pessoas: [...casa.pessoas, { id, nome: perfil.nome, dentro: [{ de: mes }] }] } : casa;
  }
  let juntou = false;
  const dentro = (pessoa.dentro ?? [{}]).filter((d) => !d.de || d.de < mes).map((d) => {
    if (d.ate && d.ate < mes) return d;
    juntou = true; // o período chega até o mês: segue aberto dali em diante
    const { ate: _fim, ...aberto } = d;
    return aberto;
  });
  return comPeriodos(casa, id, juntou ? dentro : [...dentro, { de: mes }]);
}

// Sem a trava das duas pessoas (podeSairDaDivisao a usa para simular).
const semAPessoa = (casa, id, mes) => {
  const pessoa = casa.pessoas.find((p) => p.id === id);
  if (!pessoa) return casa;
  const dentro = (pessoa.dentro ?? [{}]).filter((d) => !d.de || d.de < mes).map((d) => (!d.ate || d.ate > mes ? { ...d, ate: mes } : d));
  return comPeriodos(casa, id, dentro);
};

// Ficam pelo menos duas dividindo em todo mês dali em diante (conferido em cada mês em que alguém entra ou sai).
export function podeSairDaDivisao(casa, id, mes) {
  const depois = semAPessoa(casa, id, mes);
  if (depois === casa) return false;
  const viradas = depois.pessoas.flatMap((p) => (p.dentro ?? []).flatMap((d) => [d.de, d.ate])).filter((m) => m && m > mes);
  return [mes, ...viradas].every((m) => pessoasNoMes(depois, m).length >= 2);
}

export const sairDaDivisao = (casa, id, mes) => (podeSairDaDivisao(casa, id, mes) ? semAPessoa(casa, id, mes) : casa);

// O mês, depois de `mes`, em que a pessoa já está marcada para entrar ou sair (o mês em foco pode voltar um mês,
// quando um mês pago é reaberto, e a mudança marcada antes fica para depois dele).
function proximaMudanca(casa, id, mes) {
  const pessoa = casa.pessoas.find((p) => p.id === id);
  if (!pessoa?.dentro) return null;
  const viradas = pessoa.dentro.flatMap((d) => [d.de, d.ate]).filter((m) => m && m > mes).sort();
  return viradas.find((m) => divideNoMes(pessoa, m) !== divideNoMes(pessoa, mes)) ?? null;
}

// A lista "Quem divide as contas" dos Ajustes: quem divide no mês (com o perfil, que tem a foto). Quem administra vê
// todos os perfis, na ordem deles, para marcar (marcar alguém não o faz pular de lugar). `muda`: o mês de uma entrada
// ou saída já marcada para depois.
export function quemDivideNosAjustes(casa, mes, { administra }) {
  const dividem = pessoasNoMes(casa, mes);
  const item = (pessoa) => ({ pessoa, divide: dividem.some((p) => p.id === pessoa.id), muda: proximaMudanca(casa, pessoa.id, mes) });
  return administra ? (casa.perfis ?? []).map(item) : dividem.map((p) => item(acharPerfil(casa, p.id) ?? p));
}

// O perfil de uma pessoa da casa muda o nome dela junto.
export function renomearPerfil(casa, id, nome) {
  const trocar = (lista) => lista.map((p) => (p.id === id ? { ...p, nome: nome.trim() } : p));
  return { ...casa, perfis: trocar(casa.perfis ?? []), pessoas: trocar(casa.pessoas) };
}

export function trocarFoto(casa, id, foto) {
  return {
    ...casa,
    perfis: (casa.perfis ?? []).map((p) => {
      if (p.id !== id) return p;
      const { foto: _antiga, ...resto } = p;
      return foto ? { ...resto, foto } : resto;
    }),
  };
}

// `vinculado`: o perfil da chave deste aparelho; `visto`: o que a tela mostra (quem administra escolhe).
export function perfilVisto({ casa, impressao, escolhido }) {
  const vinculado = perfilDoAparelho(casa, impressao);
  const admin = Boolean(vinculado?.admin);
  const visto = admin && acharPerfil(casa, escolhido) ? acharPerfil(casa, escolhido) : vinculado;
  return { vinculado, visto, admin };
}

export const cartoesDoPerfil = (casa, perfilId) => (casa.cartoes ?? []).filter((c) => c.donaId === perfilId);

// Sem perfil (aparelho sem conexão, ou casa sem perfis): tudo como antes.
export const veAposentadoria = (perfil) => !perfil || Boolean(perfil.admin);

// O que quem não é dono vê do cartão: só a parte da casa (nada pessoal, nem o que foi comprado para quem vê).
export function parteDaCasaNoCartao(casa, cartaoId, fatura) {
  const f = faturaDoCartao(casa, cartaoId, fatura);
  const compras = f.compras.filter((c) => c.para === 'casa');
  const fixas = f.fixas.filter((c) => c.para === 'casa');
  const total = Math.round([...compras, ...fixas].reduce((s, x) => s + x.valor, 0) * 100) / 100;
  return { compras, fixas, total, conferida: f.conferida };
}

// ---------- decisões das telas (revisão: tudo aqui, testável) ----------

// O perfil do momento. Com chave e casa com perfis: pela impressão da chave. Sem isso, se o aparelho já teve
// perfil (`salvo`, guardado no aparelho), continua nele: uma troca de chave que falhou ou a casa ainda
// carregando nunca abrem tudo (fecha, não abre). Aparelho que nunca teve perfil: como antes, sem perfis.
export function perfilDoMomento({ casa, conectado, impressao, salvo, escolhido }) {
  const perfis = casa?.perfis ?? [];
  if (conectado && impressao && perfis.length) {
    return { ...perfilVisto({ casa, impressao, escolhido }), perfis, precisaEscolher: !perfilDoAparelho(casa, impressao) };
  }
  if (salvo?.id) {
    const vinculado = acharPerfil(casa, salvo.id) ?? { id: salvo.id, nome: salvo.nome ?? '', ...(salvo.admin ? { admin: true } : {}) };
    const admin = Boolean(vinculado.admin);
    const visto = admin && acharPerfil(casa, escolhido) ? acharPerfil(casa, escolhido) : vinculado;
    return { vinculado, visto, admin, perfis, precisaEscolher: false };
  }
  return { vinculado: null, visto: null, admin: false, perfis: [], precisaEscolher: false };
}

// Em "Quem usa este celular?": quem administra só aparece enquanto não tiver aparelho (uma chave nova não vira
// administradora; um aparelho dela muda pelos Ajustes de outro aparelho dela).
export function perfisParaEscolher(casa) {
  const comAparelho = new Set((casa.aparelhos ?? []).map((a) => a.perfilId));
  return (casa.perfis ?? []).filter((p) => !(p.admin && comAparelho.has(p.id)));
}

// Chave trocada (renovada, ou depois de tirada): a nova herda o perfil da antiga (ou o guardado no aparelho).
export function levarLigacao(casa, { antiga, nova, salvoId, hoje }) {
  if (!nova || perfilDoAparelho(casa, nova)) return casa;
  const perfilId = perfilDoAparelho(casa, antiga)?.id ?? (acharPerfil(casa, salvoId) ? salvoId : null);
  if (!perfilId) return casa;
  const ligada = vincularAparelho(casa, { impressao: nova, perfilId, hoje });
  return antiga && antiga !== nova ? desvincularAparelho(ligada, antiga) : ligada;
}

export const cartoesVisiveis = (casa, visto) => (visto ? cartoesDoPerfil(casa, visto.id) : (casa.cartoes ?? []));

// Conta ligada ao cartão de outro perfil: quem é o dono (para travar a conta e mostrar só a parte da casa).
export function donoDeOutroCartao(casa, contaId, visto) {
  const cartao = visto && (casa.cartoes ?? []).find((c) => c.contaId === contaId && c.donaId !== visto.id);
  if (!cartao) return null;
  return [...casa.pessoas, ...(casa.perfis ?? [])].find((p) => p.id === cartao.donaId) ?? { id: cartao.donaId, nome: 'outra pessoa' };
}

// Tocar numa conta no Mês: a ligada a um cartão abre, para todos, a folha com a parte da casa daquela fatura
// (desenho 2026-11-20-detalhe-cartao-no-mes); as outras, a folha da conta.
export function aoTocarConta(casa, contaId, visto) {
  return (casa.cartoes ?? []).some((c) => c.contaId === contaId) ? 'parte' : 'folha';
}

// O que a folha da conta do cartão no Mês mostra: só a parte da casa (nunca nada pessoal, nem para a dona).
// Quem vê o cartão (a dona; sem perfis, todos) pode abri-lo. Sem compras da casa: o valor do mês e o porquê
// ('planilha': confirmado e antes da primeira fatura com compras; 'previsao'; senão 'nenhuma').
export function detalheDaContaNoMes(casa, contaId, mes, visto) {
  const cartao = (casa.cartoes ?? []).find((c) => c.contaId === contaId);
  if (!cartao) return null;
  const dona = [...casa.pessoas, ...(casa.perfis ?? [])].find((p) => p.id === cartao.donaId) ?? null;
  const parte = parteDaCasaNoCartao(casa, cartao.id, mes);
  const comItens = parte.compras.length + parte.fixas.length > 0;
  const doMes = valorDaConta(casa, mes, contaId); // sem compras: a previsão ou o valor digitado
  const primeira = primeiraFatura(casa, cartao.id);
  let semDetalhe = null;
  if (!comItens) {
    if (doMes.situacao === 'a-confirmar' && doMes.deOnde) semDetalhe = 'previsao';
    else if (doMes.situacao === 'confirmado' && doMes.valor !== 0 && primeira && mes < primeira) semDetalhe = 'planilha';
    else semDetalhe = 'nenhuma';
  }
  return {
    cartaoId: cartao.id,
    dona: dona && { id: dona.id, nome: dona.nome },
    podeAbrirCartao: !donoDeOutroCartao(casa, contaId, visto),
    periodo: cartaoPronto(cartao) ? periodoDaFatura(mes, cartao) : null,
    compras: parte.compras,
    fixas: parte.fixas,
    total: comItens ? parte.total : doMes.valor,
    confirmado: comItens ? parte.conferida : doMes.situacao === 'confirmado',
    semDetalhe,
    deOnde: comItens ? null : doMes.deOnde ?? null,
  };
}

// Antes de desenhar: primeiro "Quem usa este celular?"; depois, fora da casa, só quem administra.
export function desvioDaTela({ daCasa, perfil }) {
  if (perfil.precisaEscolher) return 'escolher';
  if (!daCasa && perfil.visto && !veAposentadoria(perfil.visto)) return 'casa';
  return null;
}

// Aparelho novo de quem administra (o computador, um celular novo): como a escolha não oferece o perfil dela,
// o aparelho fica esperando (sem perfil) até ela liberar em Ajustes da casa › Perfis e aparelhos.
export const pedirAparelho = (casa, { impressao, hoje }) => vincularAparelho(casa, { impressao, perfilId: null, hoje });
export const aparelhoPediu = (casa, impressao) => (casa.aparelhos ?? []).some((a) => a.id === impressao && !a.perfilId);
export function perfisEscondidos(casa) {
  const oferecidos = new Set(perfisParaEscolher(casa).map((p) => p.id));
  return (casa.perfis ?? []).filter((p) => !oferecidos.has(p.id));
}

// Código curto do aparelho (4 primeiros caracteres da impressão), mostrado no pedido e nos Ajustes.
export const codigoDoAparelho = (impressao) => String(impressao ?? '').slice(0, 4).toUpperCase();
