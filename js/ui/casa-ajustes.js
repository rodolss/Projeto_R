// Contas da casa · Ajustes (desenho de 2026-11-19): nomes, contas, cartão, sincronização e a volta para a aposentadoria.
// Cada mudança salva na hora (nome ao sair do campo; o resto ao tocar), sem botão "Salvar" para esquecer.
import { h, cartao, botao } from './dom.js';
import { adicionarConta, editarConta, moverConta, renomearPessoa } from '../core/casa.js';
import { cartaoConectar } from './conectar.js';
import { cartaoPronto, editarPessoaDoCartao } from '../core/cartao.js';
import { formularioDoCartao } from './casa-cartao.js';

export function render(container, ctx) {
  desenhar(container, ctx);
}

export function atualizar(container, ctx) {
  desenhar(container, ctx);
}

function desenhar(container, ctx) {
  const { casa } = ctx;
  if (!casa) {
    container.replaceChildren(cartao(h('p', {}, 'Ainda não há contas da casa. '), h('a', { href: '#/casa' }, 'Começar')));
    return;
  }
  const salvar = async (mutacao, texto) => {
    await ctx.salvarCasa(mutacao);
    if (texto) ctx.aviso(texto, 'ok', 2500);
    ctx.rerender();
  };

  // ---------- pessoas ----------
  const pessoas = cartao(
    h('h2', {}, 'Quem divide as contas'),
    ...casa.pessoas.map((p, k) => h('label', { class: 'campo', style: k ? 'margin-top:10px' : '' },
      h('span', { class: 'campo-rotulo' }, k === 0 ? 'Primeira pessoa' : 'Segunda pessoa'),
      h('input', {
        class: 'entrada', type: 'text', value: p.nome, autocomplete: 'off',
        onchange: (e) => {
          const nome = e.target.value.trim();
          if (!nome) { e.target.value = p.nome; return; }
          if (nome !== p.nome) salvar((c) => renomearPessoa(c, p.id, nome), 'Nome salvo.');
        },
      }))));

  // ---------- contas ----------
  const ativas = casa.contas.filter((c) => !c.arquivada);
  const arquivadas = casa.contas.filter((c) => c.arquivada);
  const linhaConta = (conta, k) => h('div', { class: 'casa-ajuste' },
    h('div', { class: 'casa-ajuste-linha' },
      h('input', {
        class: 'entrada', type: 'text', value: conta.nome, autocomplete: 'off', 'aria-label': `Nome da conta ${conta.nome}`,
        onchange: (e) => {
          const nome = e.target.value.trim();
          if (!nome) { e.target.value = conta.nome; return; }
          if (nome !== conta.nome) salvar((c) => editarConta(c, conta.id, { nome }), 'Nome salvo.');
        },
      }),
      h('button', { type: 'button', class: 'seta-mes', 'aria-label': `Subir ${conta.nome}`, disabled: k === 0, onclick: () => salvar((c) => moverConta(c, conta.id, -1)) }, '↑'),
      h('button', { type: 'button', class: 'seta-mes', 'aria-label': `Descer ${conta.nome}`, disabled: k === ativas.length - 1, onclick: () => salvar((c) => moverConta(c, conta.id, 1)) }, '↓')),
    h('div', { class: 'casa-ajuste-linha' },
      h('label', { class: 'marcar' },
        h('input', { type: 'checkbox', checked: conta.compraPorCompra, onchange: (e) => salvar((c) => editarConta(c, conta.id, { compraPorCompra: e.target.checked })) }),
        'Compra por compra (cartão)'),
      h('button', {
        type: 'button', class: 'botao-link', style: 'padding:6px 0',
        onclick: () => salvar((c) => editarConta(c, conta.id, { arquivada: true }), `${conta.nome} não aparece mais nos meses novos.`),
      }, 'Não uso mais')));

  const nova = { nome: '', compraPorCompra: false };
  const contas = cartao(
    h('h2', {}, 'Contas'),
    h('p', { class: 'suave' }, 'As contas aparecem no mês nesta ordem.'),
    ...ativas.map(linhaConta),
    h('div', { class: 'casa-ajuste', 'data-sem-recarregar': '' },
      h('h3', { style: 'margin:0' }, 'Adicionar conta'),
      h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: faxina, plano de saúde', 'aria-label': 'Nome da nova conta', oninput: (e) => { nova.nome = e.target.value.trim(); } }),
      h('label', { class: 'marcar' }, h('input', { type: 'checkbox', onchange: (e) => { nova.compraPorCompra = e.target.checked; } }), 'Compra por compra (cartão)'),
      h('div', { class: 'botoes' }, botao('Adicionar conta', () => {
        if (!nova.nome) { ctx.aviso('Escreva o nome da conta.', 'atencao', 3000); return; }
        salvar((c) => adicionarConta(c, nova), 'Conta adicionada.');
      }, { secundario: true }))),
    arquivadas.length > 0 && h('div', { class: 'casa-ajuste' },
      h('h3', { style: 'margin:0' }, 'Contas que não usa mais'),
      h('p', { class: 'suave pequeno', style: 'margin:0' }, 'Continuam no histórico, mas não aparecem nos meses novos.'),
      ...arquivadas.map((conta) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, conta.nome)),
        h('button', {
          type: 'button', class: 'botao-link', style: 'padding:4px 0',
          // A previsão volta só deste mês em diante: os meses em que a conta estava parada não ganham valor.
          onclick: () => salvar((c) => editarConta(c, conta.id, { arquivada: false, ativadaEm: ctx.hoje.slice(0, 7) }), `${conta.nome} voltou para a lista.`),
        }, 'Voltar a usar')))));

  // ---------- cartão (desenho 2026-11-19-cartao) ----------
  const outrasPessoas = casa.cartao?.pessoas ?? [];
  const usadas = outrasPessoas.filter((p) => !p.arquivada);
  const paradas = outrasPessoas.filter((p) => p.arquivada);
  const secaoCartao = cartaoPronto(casa)
    ? cartao(
      h('h2', {}, 'Cartão'),
      formularioDoCartao(ctx, { aoSalvar: () => ctx.rerender() }),
      h('div', { class: 'casa-ajuste' },
        h('h3', { style: 'margin:0' }, 'Outras pessoas'),
        h('p', { class: 'suave pequeno', style: 'margin:0' }, usadas.length
          ? 'Para quem também se compra no cartão. Para acrescentar, use "+ Outra pessoa" ao anotar uma compra.'
          : 'Ninguém ainda. Para acrescentar, use "+ Outra pessoa" ao anotar uma compra.'),
        ...usadas.map((p) => h('div', { class: 'casa-ajuste-linha' },
          h('input', {
            class: 'entrada', type: 'text', value: p.nome, autocomplete: 'off', 'aria-label': `Nome de ${p.nome}`,
            onchange: (e) => {
              const nome = e.target.value.trim();
              if (!nome) { e.target.value = p.nome; return; }
              if (nome !== p.nome) salvar((c) => editarPessoaDoCartao(c, p.id, { nome }), 'Nome salvo.');
            },
          }),
          h('button', {
            type: 'button', class: 'botao-link', style: 'padding:6px 0',
            onclick: () => salvar((c) => editarPessoaDoCartao(c, p.id, { arquivada: true }), `${p.nome} saiu da lista de "Para quem".`),
          }, 'Não uso mais'))),
        ...paradas.map((p) => h('div', { class: 'linha' },
          h('div', { class: 'nome' }, h('span', {}, p.nome), h('small', {}, 'não aparece em "Para quem"')),
          h('button', {
            type: 'button', class: 'botao-link', style: 'padding:4px 0',
            onclick: () => salvar((c) => editarPessoaDoCartao(c, p.id, { arquivada: false }), `${p.nome} voltou para a lista.`),
          }, 'Voltar a usar')))))
    : cartao(
      h('h2', {}, 'Cartão'),
      h('p', { class: 'suave' }, 'Anote compra por compra do cartão de um de vocês: o que é da casa, de cada um e de outras pessoas.'),
      h('div', { class: 'botoes' }, h('a', { class: 'botao secundario', href: '#/casa-cartao' }, 'Configurar o cartão')));

  // ---------- sincronização ----------
  const outra = casa.pessoas[1]?.nome ?? 'a outra pessoa';
  const sincronizacao = ctx.conexao
    ? [
      cartao(
        h('h2', {}, 'Nos dois celulares'),
        h('p', { class: 'suave' }, `Conectado ao repositório privado de ${ctx.conexao.dono}: as contas aparecem em todo celular conectado.`),
        h('p', { class: 'suave pequeno' }, `Para usar no celular de ${outra}: instale o app, toque em "Abrir as contas da casa" e conecte com uma chave do GitHub só para aquele celular.`)),
      // A chave vence (validade de 1 ano): dá para trocar aqui mesmo, sem passar pela aposentadoria.
      h('details', { class: 'cartao casa-trocar-chave' },
        h('summary', {}, 'Trocar a chave deste celular'),
        cartaoConectar(ctx, { titulo: 'Chave nova', texto: 'Use quando o app avisar que a chave venceu ou ficou inválida.' })),
    ]
    : cartaoConectar(ctx, { titulo: 'Usar nos dois celulares', texto: 'Hoje as contas estão só neste aparelho. Conecte com uma chave do GitHub para ver as mesmas contas em outro celular.' });

  const comoFunciona = cartao(
    h('h2', {}, 'Como a divisão funciona'),
    h('p', {}, 'Todo mês o app soma as contas da casa e divide pela renda: quem ganha mais paga mais, e cada um paga a mesma fatia do que ganha.'),
    h('p', { class: 'suave' }, 'Um valor "a confirmar" é uma previsão feita com o último valor conhecido. Ele vira valor certo quando alguém salva.'));

  container.replaceChildren(
    h('h1', {}, 'Ajustes da casa'),
    pessoas,
    contas,
    secaoCartao,
    ...[sincronizacao].flat(),
    comoFunciona,
    h('button', { type: 'button', class: 'botao-link', onclick: () => ctx.navegar('#/inicio') }, 'Ir para o planejador de aposentadoria'),
  );
}
