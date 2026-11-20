// Perfis (desenho 2026-11-20-perfis): cada pessoa vê os próprios cartões. O perfil de um aparelho vem da chave do
// GitHub dele: o casa.json guarda a impressão da chave (nunca a chave) ligada a um perfil. Quem administra troca
// de perfil (só neste aparelho) e vê a tela exatamente como a outra pessoa vê. É seguro sem PIN porque só quem
// administra cria chaves. Separação só no app: os dados continuam no mesmo arquivo.
import { faturaDoCartao } from './cartao.js';

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
