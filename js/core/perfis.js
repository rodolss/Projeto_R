// Perfis (desenho 2026-11-20-perfis): cada pessoa vê os próprios cartões. O perfil de um aparelho vem da chave do
// GitHub dele: o casa.json guarda a impressão da chave (nunca a chave) ligada a um perfil. Quem administra troca
// de perfil (só neste aparelho) e vê a tela exatamente como a outra pessoa vê. É seguro sem PIN porque só quem
// administra cria chaves. Separação só no app: os dados continuam no mesmo arquivo.
import { faturaDoCartao, periodoDaFatura, cartaoPronto, primeiraFatura } from './cartao.js';
import { valorDaConta } from './casa.js';

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

// Perfil novo: cartões próprios; não entra na divisão das contas (as pessoas da casa continuam duas).
export function adicionarPerfil(casa, { nome, novoId = idPadrao }) {
  const id = novoId();
  return { casa: { ...casa, perfis: [...(casa.perfis ?? []), { id, nome: nome.trim() }] }, id };
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
