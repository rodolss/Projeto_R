// Contas da casa · Ajustes (desenho de 2026-11-19): nomes, contas, cartão, sincronização e a volta para a aposentadoria.
// Cada mudança salva na hora (nome ao sair do campo; o resto ao tocar), sem botão "Salvar" para esquecer.
import { h, cartao, botao } from './dom.js';
import { adicionarConta, editarConta, moverConta, renomearPessoa } from '../core/casa.js';
import { cartaoConectar } from './conectar.js';
import { editarPessoaDoCartao, tirarCartao, rotuloDoCartao } from '../core/cartao.js';
import { formularioDoCartao, botaoDoisToques } from './casa-cartao.js';
import {
  cartoesVisiveis, veAposentadoria, adicionarPerfil, renomearPerfil, vincularAparelho, desvincularAparelho, donoDeOutroCartao,
  codigoDoAparelho,
} from '../core/perfis.js';
import { avatar } from './topo.js';
import { adicionarJunta, removerJunta, JUNTAS_DO_APP } from '../core/tags.js';
import { parametroDoHash } from './rotas.js';

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
  // Perfis: conta ligada ao cartão de outra pessoa não muda aqui (nome, compra por compra, não uso mais).
  const visto = ctx.perfil?.visto ?? null;
  const donoDeOutro = (conta) => donoDeOutroCartao(casa, conta.id, visto);
  const linhaConta = (conta, k) => (donoDeOutro(conta) ? linhaTravada(conta, k) : linhaLivre(conta, k));
  const setas = (conta, k) => [
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': `Subir ${conta.nome}`, disabled: k === 0, onclick: () => salvar((c) => moverConta(c, conta.id, -1)) }, '↑'),
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': `Descer ${conta.nome}`, disabled: k === ativas.length - 1, onclick: () => salvar((c) => moverConta(c, conta.id, 1)) }, '↓'),
  ];
  const linhaTravada = (conta, k) => h('div', { class: 'casa-ajuste' },
    h('div', { class: 'casa-ajuste-linha' },
      h('input', { class: 'entrada', type: 'text', value: conta.nome, disabled: true, 'aria-label': `Nome da conta ${conta.nome}` }),
      ...setas(conta, k)),
    h('p', { class: 'suave pequeno', style: 'margin:0' }, `Do cartão de ${donoDeOutro(conta).nome}: só ${donoDeOutro(conta).nome} muda esta conta.`));
  const linhaLivre = (conta, k) => h('div', { class: 'casa-ajuste' },
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

  // ---------- cartões (desenho 2026-11-19-cartao, vários cartões) ----------
  const cartoes = cartoesVisiveis(casa, visto); // cada um, os próprios
  const usado = (k) => k.fixas.length > 0 || casa.meses.some((m) => (m.compras ?? []).some((c) => c.contaId === k.contaId));
  const blocoDoCartao = (k) => {
    const rotulo = rotuloDoCartao(casa, k);
    const titulo = casa.pessoas.some((p) => p.nome === rotulo) ? `Cartão de ${rotulo}` : rotulo;
    return cartao(
      h('h2', {}, titulo),
      // Com perfis, o cartão é de quem vê: sem "De quem é" (não dá para passar o cartão para outra pessoa).
      formularioDoCartao(ctx, { cartaoId: k.id, donaFixa: Boolean(visto), aoSalvar: () => ctx.rerender() }),
      !usado(k) && botaoDoisToques('Tirar este cartão', 'Toque de novo para tirar', () => salvar((c) => tirarCartao(c, k.id), 'Cartão tirado.')));
  };
  const outrasPessoas = casa.outrasPessoas ?? [];
  const usadas = outrasPessoas.filter((p) => !p.arquivada);
  const paradas = outrasPessoas.filter((p) => p.arquivada);
  const pessoasDosCartoes = cartoes.length > 0 && cartao(
    h('h2', {}, 'Outras pessoas'),
    h('p', { class: 'suave pequeno', style: 'margin:0' }, usadas.length
      ? 'Para quem também se compra nos cartões. Para acrescentar, use "+ Outra pessoa" ao anotar uma compra.'
      : 'Ninguém ainda. Para acrescentar, use "+ Outra pessoa" ao anotar uma compra.'),
    ...usadas.map((p) => h('div', { class: 'casa-ajuste-linha', style: 'margin-top:8px' },
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
      }, 'Voltar a usar'))));
  const secaoCartoes = cartoes.length
    ? [
      ...cartoes.map(blocoDoCartao),
      h('div', { class: 'botoes' }, h('a', { class: 'botao secundario', href: '#/casa-cartao?novo=1' }, 'Adicionar outro cartão')),
      pessoasDosCartoes,
    ]
    : [cartao(
      h('h2', {}, 'Cartão'),
      h('p', { class: 'suave' }, 'Anote compra por compra do cartão de cada um: o que é da casa, de cada um e de outras pessoas.'),
      h('div', { class: 'botoes' }, h('a', { class: 'botao secundario', href: '#/casa-cartao' }, 'Configurar o cartão')))];

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

  // ---------- etiquetas compostas ----------
  // Cada palavra de uma compra vira uma etiqueta ("Ração da Nami" → Ração e Nami). As expressões desta lista valem uma
  // etiqueta só ("Pão de Queijo"): as do app vêm prontas; a casa acrescenta as suas (casa.etiquetasJuntas).
  const novaJunta = { texto: '' };
  const campoJunta = h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: Banho e Tosa', oninput: (e) => { novaJunta.texto = e.target.value; } });
  const etiquetasCompostas = cartao(
    h('h2', {}, 'Etiquetas compostas'),
    h('p', { class: 'suave' }, 'Cada palavra de uma compra vira uma etiqueta: "Ração da Nami" tem duas, Ração e Nami. As expressões desta lista contam como uma etiqueta só, como "Pão de Queijo".'),
    ...Object.entries(casa.etiquetasJuntas ?? {}).map(([chave, texto]) => h('div', { class: 'linha' },
      h('div', { class: 'nome' }, h('span', {}, texto)),
      botaoDoisToques('Tirar', 'Tirar?', () => salvar((c) => removerJunta(c, chave), 'Expressão tirada.')))),
    h('div', { class: 'casa-ajuste' },
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nova expressão (duas palavras ou mais)'), campoJunta),
      h('div', { class: 'botoes' }, botao('Adicionar', () => {
        if (adicionarJunta(casa, novaJunta.texto) === casa) { ctx.aviso('Escreva duas palavras ou mais que ainda não estejam na lista.', 'atencao', 3500); return; }
        salvar((c) => adicionarJunta(c, novaJunta.texto), 'Expressão adicionada.');
      }, { secundario: true }))),
    h('details', { class: 'casa-ajuste' },
      h('summary', {}, `Já vêm com o app (${JUNTAS_DO_APP.length})`),
      h('div', { class: 'chips', style: 'margin-top:8px' }, ...JUNTAS_DO_APP.map((f) => h('span', { class: 'chip pequeno tag' }, f)))));

  const comoFunciona = cartao(
    h('h2', {}, 'Como a divisão funciona'),
    h('p', {}, 'Todo mês o app soma as contas da casa e divide pela renda: quem ganha mais paga mais, e cada um paga a mesma fatia do que ganha.'),
    h('p', { class: 'suave' }, 'Um valor "a confirmar" é uma previsão feita com o último valor conhecido. Ele vira valor certo quando alguém salva.'));

  // ---------- perfis e aparelhos (só quem administra, vendo o próprio perfil) ----------
  const administra = Boolean(ctx.perfil?.admin && visto && ctx.perfil.vinculado?.id === visto.id);
  const novoPerfil = { nome: '' };
  const perfisEAparelhos = administra && h('section', { class: 'cartao', id: 'perfis' },
    h('h2', {}, 'Perfis e aparelhos'),
    h('p', { class: 'suave pequeno', style: 'margin:0' }, 'Cada um vê só os próprios cartões. O perfil de cada celular vem da chave do GitHub dele: uma chave nova pergunta "Quem usa este celular?".'),
    ...(casa.perfis ?? []).map((p) => h('div', { class: 'casa-ajuste-linha', style: 'margin-top:10px' },
      avatar(p),
      h('input', {
        class: 'entrada', type: 'text', value: p.nome, autocomplete: 'off', 'aria-label': `Nome do perfil ${p.nome}`,
        onchange: (e) => {
          const nome = e.target.value.trim();
          if (!nome) { e.target.value = p.nome; return; }
          if (nome !== p.nome) salvar((c) => renomearPerfil(c, p.id, nome), 'Nome salvo.');
        },
      }),
      p.admin && h('span', { class: 'selo ok' }, 'administra'))),
    h('div', { class: 'casa-ajuste', 'data-sem-recarregar': '' },
      h('h3', { style: 'margin:0' }, 'Novo perfil'),
      h('p', { class: 'suave pequeno', style: 'margin:0' }, 'Tem cartões próprios e não entra na divisão das contas.'),
      h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Nome', 'aria-label': 'Nome do novo perfil', oninput: (e) => { novoPerfil.nome = e.target.value.trim(); } }),
      h('div', { class: 'botoes' }, botao('Criar perfil', () => {
        if (!novoPerfil.nome) { ctx.aviso('Escreva o nome.', 'atencao', 3000); return; }
        salvar((c) => adicionarPerfil(c, { nome: novoPerfil.nome }).casa, 'Perfil criado.');
      }, { secundario: true }))),
    h('div', { class: 'casa-ajuste' },
      h('h3', { style: 'margin:0' }, 'Aparelhos'),
      ...(casa.aparelhos ?? []).map((a) => h('div', { class: 'casa-ajuste-linha' },
        h('span', { class: 'marcar' }, a.id === ctx.perfil.impressao ? 'Este aparelho'
          : !a.perfilId ? `Pedido de aparelho novo · código ${codigoDoAparelho(a.id)}` : `Aparelho desde ${a.desde.split('-').reverse().join('/')}`),
        h('select', {
          class: 'entrada', 'aria-label': 'Perfil do aparelho', style: 'flex:0 1 150px',
          disabled: a.id === ctx.perfil.impressao, // este aparelho não sai do próprio perfil por engano
          onchange: (e) => { if (e.target.value) salvar((c) => vincularAparelho(c, { impressao: a.id, perfilId: e.target.value, hoje: a.desde }), 'Aparelho atualizado.'); },
        }, !a.perfilId && h('option', { value: '', selected: true }, 'Escolha o perfil'),
        ...(casa.perfis ?? []).map((p) => h('option', { value: p.id, selected: p.id === a.perfilId }, p.nome))),
        a.id !== ctx.perfil.impressao && botaoDoisToques('Tirar', 'Tirar?', () => salvar((c) => desvincularAparelho(c, a.id), 'O aparelho vai perguntar de novo quem usa.'))))));

  container.replaceChildren(...[
    h('h1', {}, 'Ajustes da casa'),
    pessoas,
    contas,
    ...secaoCartoes,
    etiquetasCompostas,
    ...[sincronizacao].flat(),
    comoFunciona,
    perfisEAparelhos,
    veAposentadoria(visto) && !ctx.unica && h('button', { type: 'button', class: 'botao-link', onclick: () => ctx.navegar('#/inicio') }, 'Ir para o planejador de aposentadoria'),
  ].filter(Boolean));
  if (parametroDoHash(location.hash, 'secao') === 'perfis') document.getElementById('perfis')?.scrollIntoView({ block: 'start' });
}
