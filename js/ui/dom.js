// Utilitários de interface: criação de elementos, campos e textos comuns.
import { formatarBRL, parseBRL } from '../core/formato.js';

export function h(tag, atributos = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos ?? {})) {
    if (valor == null || valor === false) continue;
    if (chave.startsWith('on') && typeof valor === 'function') el.addEventListener(chave.slice(2).toLowerCase(), valor);
    else if (chave === 'class') el.className = valor;
    else if (chave === 'html') el.innerHTML = valor;
    else if (['value', 'checked', 'disabled', 'selected'].includes(chave)) el[chave] = valor;
    else el.setAttribute(chave, valor === true ? '' : valor);
  }
  for (const filho of filhos.flat(Infinity)) {
    if (filho == null || filho === false) continue;
    el.append(filho instanceof Node ? filho : String(filho));
  }
  return el;
}

export const numeroBR = (valor) => formatarBRL(valor).replace(/^-?R\$ /, (m) => (m.startsWith('-') ? '-' : ''));

// Campo de dinheiro: aceita digitação livre ("7.800", "7800,50") e formata ao sair. Nunca mostra NaN.
export function campoMoeda({ rotulo, valor = null, aoMudar, dica = null, grande = false, id = null }) {
  const input = h('input', {
    type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'campo-input', placeholder: '0,00', id,
    'aria-label': rotulo,
  });
  input.value = valor == null ? '' : numeroBR(valor);
  input.addEventListener('input', () => aoMudar(parseBRL(input.value)));
  input.addEventListener('blur', () => {
    const v = parseBRL(input.value);
    if (v != null) input.value = numeroBR(v);
  });
  const campo = h('label', { class: 'campo' },
    rotulo && h('span', { class: 'campo-rotulo' }, rotulo),
    h('span', { class: `campo-moeda${grande ? ' grande' : ''}` }, h('span', { class: 'prefixo' }, 'R$'), input),
    dica && h('span', { class: 'campo-dica' }, dica));
  campo.input = input;
  return campo;
}

export const cartao = (...filhos) => h('section', { class: 'cartao' }, ...filhos);

export function botao(texto, aoClicar, { secundario = false, perigo = false, desabilitado = false } = {}) {
  const classe = ['botao', secundario && 'secundario', perigo && 'perigo'].filter(Boolean).join(' ');
  return h('button', { type: 'button', class: classe, onclick: aoClicar, disabled: desabilitado }, texto);
}

export const aviso = (nivel, ...conteudo) => h('div', { class: `aviso ${nivel}` }, ...conteudo);

export function linha(nome, quanto, detalhe = null) {
  return h('div', { class: 'linha' },
    h('div', { class: 'nome' }, h('span', {}, nome), detalhe && h('small', {}, detalhe)),
    h('div', { class: 'quanto' }, quanto));
}

export function barra(fracao) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fracao) ? fracao : 0)) * 100;
  return h('div', { class: 'barra', role: 'progressbar', 'aria-valuenow': Math.round(pct), 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('i', { style: `width:${pct.toFixed(1)}%` }));
}

export const AVISO_EXEMPLOS = 'Os investimentos sugeridos são exemplos, não uma recomendação profissional.';

const TEXTOS_CONEXAO = {
  offline: 'Sem conexão: seus dados estão salvos neste aparelho e serão enviados quando a internet voltar.',
  'token-invalido': 'Chave do GitHub inválida ou expirada. Atualize em Ajustes.',
  'sem-permissao': 'A chave do GitHub não tem permissão para gravar no repositório de dados.',
  'repo-nao-encontrado': 'Repositório de dados não encontrado, ou a chave não tem acesso a ele.',
  'conflito-resolvido': 'Seus dados foram alterados em outro aparelho; juntei as alterações.',
  'dados-locais-invalidos': 'Os dados guardados neste aparelho estavam danificados. Guardei uma cópia à parte e, se houver conexão, recarreguei do GitHub.',
  desconhecido: 'Não consegui falar com o GitHub agora. Seus dados estão salvos neste aparelho.',
};

export const textoConexao = (codigo) => TEXTOS_CONEXAO[codigo] ?? TEXTOS_CONEXAO.desconhecido;
