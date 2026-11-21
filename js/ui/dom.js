// Utilitários de interface: criação de elementos, campos e textos comuns.
import { formatarBRL, parseBRL, mascararReais, valorDosReais, REGEX_REAIS } from '../core/formato.js';
import { opcoesDeTag, nomeDaEtiqueta } from '../core/tags.js';

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

// Copia um texto para a área de transferência (para colar no app do banco). Sem a API moderna (aparelho sem https,
// casca antiga), cai no execCommand. Devolve se deu certo.
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(campo);
    campo.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    campo.remove();
    return ok;
  }
}

export const numeroBR = (valor) => formatarBRL(valor).replace(/^-?R\$ /, (m) => (m.startsWith('-') ? '-' : ''));

// Campo de dinheiro com máscara de reais: o teclado é só de números, vírgula e ponto digitados não entram e a máscara
// monta "1.234,56" sozinha (digitou 123456 → 1.234,56). Colar "R$ 1.234,56" ou "1234.5" também vale.
export function campoMoeda({ rotulo, valor = null, aoMudar, dica = null, grande = false, id = null }) {
  const input = h('input', {
    type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'campo-input', placeholder: '0,00', id,
    pattern: REGEX_REAIS.source, 'aria-label': rotulo,
  });
  input.value = valor == null ? '' : numeroBR(valor);
  const aplicar = (texto) => {
    input.value = mascararReais(texto);
    aoMudar(valorDosReais(input.value));
  };
  // Vírgula e ponto não entram nem por um instante (teclado físico, teclado do celular).
  input.addEventListener('beforeinput', (e) => { if (e.data && /[.,]/.test(e.data) && e.inputType === 'insertText') e.preventDefault(); });
  input.addEventListener('input', () => aplicar(input.value));
  input.addEventListener('paste', (e) => {
    const colado = parseBRL(e.clipboardData?.getData('text') ?? '');
    if (colado == null) { e.preventDefault(); return; } // texto que não é valor: ignora
    e.preventDefault();
    aplicar(colado.toFixed(2));
  });
  const campo = h('label', { class: 'campo' },
    rotulo && h('span', { class: 'campo-rotulo' }, rotulo),
    h('span', { class: `campo-moeda${grande ? ' grande' : ''}` }, h('span', { class: 'prefixo' }, 'R$'), input),
    dica && h('span', { class: 'campo-dica' }, dica));
  campo.input = input;
  return campo;
}

// Campo de etiqueta (desenho 2026-11-21-tags): o "O que foi" de uma compra. Ao digitar, as etiquetas que já existem
// aparecem como balões para escolher (a que é igual, marcada); se nenhuma é igual, aparece "+ Criar …" para criar
// uma nova. `aoMudar(nome)` recebe o nome final (a grafia da etiqueta que já existe, ou o que foi digitado);
// `aoEscolher(nome)` avisa que tocaram num balão (hora de ir ao próximo campo). `campo.input` é o campo de texto.
export function campoTag({ rotulo, placeholder, valor = '', tags = [], aoMudar, aoEscolher = () => {} }) {
  const input = h('input', { class: 'entrada cartao-nome', type: 'text', autocomplete: 'off', value: valor, placeholder });
  const baloes = h('div', { class: 'cartao-sugestoes tag-baloes', role: 'group', 'aria-label': 'Etiquetas' });
  let criada = false; // o balão "Criar …" foi tocado
  const desenhar = () => {
    const o = opcoesDeTag(tags, input.value);
    const lista = o.achadas.map((nome) => h('button', {
      type: 'button', class: `chip pequeno tag${nome === o.exata ? ' ativo' : ''}`, 'aria-pressed': String(nome === o.exata),
      onclick: () => { input.value = nome; criada = false; desenhar(); aoMudar(nomeDaEtiqueta(tags, nome)); aoEscolher(nome); },
    }, nome));
    if (o.nova) {
      lista.push(h('button', {
        type: 'button', class: `chip pequeno tag nova${criada ? ' ativo' : ''}`, 'aria-pressed': String(criada),
        onclick: () => { criada = true; desenhar(); aoEscolher(o.nova); },
      }, criada ? `✓ ${o.nova} (nova)` : `+ Criar “${o.nova}”`));
    }
    baloes.replaceChildren(...lista);
  };
  input.addEventListener('input', () => { criada = false; desenhar(); aoMudar(nomeDaEtiqueta(tags, input.value)); });
  desenhar();
  const campo = h('div', { class: 'campo' },
    h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo), input),
    baloes); // os balões ficam fora do <label>: tocar neles não foca o campo de novo
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

// Folha por baixo (bottom sheet). Fica numa camada própria, fora de #tela, cujos blocos animam ao entrar.
export function mostrarFolha({ conteudo, aoFechar, rotulo }) {
  let camada = document.getElementById('camada-folha');
  if (!camada) {
    camada = h('div', { id: 'camada-folha' });
    document.body.append(camada);
  }
  const painel = h('div', { class: 'folha', role: 'dialog', 'aria-modal': 'true', 'aria-label': rotulo, tabindex: '-1' }, ...conteudo);
  painel.addEventListener('keydown', (e) => { if (e.key === 'Escape') aoFechar(); });
  camada.replaceChildren(h('div', { class: 'veu', onclick: aoFechar }), painel);
  return painel;
}

export function esconderFolha() {
  document.getElementById('camada-folha')?.replaceChildren();
}
