// Contas da casa · Ajustes (desenho de 2026-11-19): nomes, contas, cartão, sincronização e a volta para a aposentadoria,
// em gavetas por grupo (desenho 2026-11-21-ajustes-em-gavetas).
// Cada mudança salva na hora (nome ao sair do campo; o resto ao tocar), sem botão "Salvar" para esquecer.
import { h, cartao, botao, mostrarFolha, esconderFolha } from './dom.js';
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
import { icone, iconeCategoria } from './icones.js';
import { reduzMovimento } from './movimento.js';
import { parametroDoHash, folhaAberta, depoisDeSalvar } from './rotas.js';
import { categoriaDaConta } from '../core/categorias.js';

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
  const abrir = (folha) => { abertaAqui = true; location.hash = `#/casa-ajustes?folha=${folha}`; };
  const fechar = () => {
    if (abertaAqui) { abertaAqui = false; history.back(); } else location.replace('#/casa-ajustes');
  };
  // Depois de salvar (pode demorar, no GitHub): fecha a folha se ela ainda está aberta; senão só redesenha.
  const salvarNaFolha = async (mutacao, texto, folha) => {
    await ctx.salvarCasa(mutacao);
    if (texto) ctx.aviso(texto, 'ok', 2500);
    const acao = depoisDeSalvar(location.hash, folha, 'casa-ajustes');
    if (acao === 'fechar') fechar();
    else if (acao === 'redesenhar') ctx.rerender();
  };

  // ---------- casa (desenho 2026-11-21-ajustes-casa-simples) ----------
  // Pessoas e contas em listas limpas, como nas Contas: tocar abre uma folha simples (nome, como a conta se preenche,
  // posição, parar de usar). Nada de campos, setas e caixas espalhados pela lista.
  const visto = ctx.perfil?.visto ?? null;
  const ativas = casa.contas.filter((c) => !c.arquivada);
  const arquivadas = casa.contas.filter((c) => c.arquivada);
  // Perfis: conta ligada ao cartão de outra pessoa não muda aqui (só a posição).
  const donoDeOutro = (conta) => donoDeOutroCartao(casa, conta.id, visto);
  const cartaoDaConta = (conta) => (casa.cartoes ?? []).find((k) => k.contaId === conta.id) ?? null;
  const nomeDe = (id) => [...casa.pessoas, ...(casa.perfis ?? [])].find((p) => p.id === id)?.nome ?? null;
  const comoSePreenche = (conta) => {
    const k = cartaoDaConta(conta);
    if (k) return nomeDe(k.donaId) ? `compras do cartão de ${nomeDe(k.donaId)}` : 'compras do cartão';
    return conta.compraPorCompra ? 'compra por compra' : 'um valor por mês';
  };
  const linhaDaLista = ({ selo, titulo, detalhe, aoTocar, classe = '' }) => h('button', { type: 'button', class: `casa-linha ${classe}`, onclick: aoTocar },
    selo,
    h('span', { class: 'texto' }, h('b', {}, titulo), detalhe && h('small', {}, detalhe)),
    h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));

  const pessoas = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Quem divide as contas'),
    h('div', {}, ...casa.pessoas.map((p) => linhaDaLista({
      selo: avatar(p), titulo: p.nome, detalhe: 'toque para mudar o nome', aoTocar: () => abrir(`pessoa-${p.id}`),
    }))));

  const contas = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Contas'),
    h('div', {},
      ...ativas.map((conta) => linhaDaLista({
        selo: iconeCategoria(categoriaDaConta(conta)), titulo: conta.nome, detalhe: comoSePreenche(conta), aoTocar: () => abrir(`conta-${conta.id}`),
      })),
      linhaDaLista({ selo: h('span', { class: 'icone-cat cat-casa', 'aria-hidden': 'true' }, icone('mais')), titulo: 'Adicionar conta', aoTocar: () => abrir('nova-conta'), classe: 'linha-acao' })),
    arquivadas.length > 0 && h('details', { class: 'casa-paradas' },
      h('summary', {}, `Contas que não usa mais (${arquivadas.length})`),
      ...arquivadas.map((conta) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, conta.nome), h('small', {}, 'continua no histórico')),
        h('button', {
          type: 'button', class: 'botao-link', style: 'padding:4px 0',
          // A previsão volta só deste mês em diante: os meses em que a conta estava parada não ganham valor.
          onclick: () => salvar((c) => editarConta(c, conta.id, { arquivada: false, ativadaEm: ctx.hoje.slice(0, 7) }), `${conta.nome} voltou para a lista.`),
        }, 'Voltar a usar')))));
  const notaDaDivisao = h('p', { class: 'nota nota-casa' },
    'Quem ganha mais paga mais: cada um paga a mesma fatia do que ganha. Um valor "a confirmar" é uma previsão com o último valor conhecido.');

  // ---------- folhas da casa ----------
  const folhaDaPessoa = (pessoa, folha) => {
    let nome = pessoa.nome;
    return [
      h('h2', {}, 'Nome'),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Como aparece no app'),
        h('input', { class: 'entrada', type: 'text', value: pessoa.nome, autocomplete: 'off', oninput: (e) => { nome = e.target.value.trim(); } })),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Salvar', () => {
        if (!nome) { ctx.aviso('Escreva o nome.', 'atencao', 3000); return; }
        if (nome === pessoa.nome) { fechar(); return; }
        salvarNaFolha((c) => renomearPessoa(c, pessoa.id, nome), 'Nome salvo.', folha);
      })),
    ];
  };

  // As duas maneiras de preencher uma conta, em botões grandes com exemplo (no lugar da caixa "Compra por compra").
  const escolhaDoJeito = (inicial, aoEscolher, travada) => {
    const opcoes = [
      { valor: false, icone: 'recibo', titulo: 'Um valor por mês', texto: 'Você digita quanto veio. Ex.: luz, água, condomínio.' },
      { valor: true, icone: 'sacola', titulo: 'Compra por compra', texto: 'Você anota cada compra e o app soma. Ex.: cartão, mercado.' },
    ];
    const caixa = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'Como você preenche esta conta?' });
    const desenharOpcoes = (atual) => caixa.replaceChildren(...opcoes.map((o) => h('button', {
      type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(o.valor === atual), disabled: travada,
      onclick: () => { desenharOpcoes(o.valor); aoEscolher(o.valor); },
    },
    h('span', { class: 'icone-cat cat-casa', 'aria-hidden': 'true' }, icone(o.icone)),
    h('span', { class: 'texto' }, h('b', {}, o.titulo), h('small', {}, o.texto)),
    h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
    desenharOpcoes(inicial);
    return caixa;
  };

  const folhaDaConta = (conta, folha) => {
    const nova = !conta;
    const travada = !nova && Boolean(donoDeOutro(conta));
    const doCartao = !nova && cartaoDaConta(conta);
    const k = nova ? -1 : ativas.findIndex((c) => c.id === conta.id);
    const editado = { nome: conta?.nome ?? '', compraPorCompra: conta?.compraPorCompra ?? false };
    const salvarConta = () => {
      if (!editado.nome) { ctx.aviso('Escreva o nome da conta.', 'atencao', 3000); return; }
      if (nova) { salvarNaFolha((c) => adicionarConta(c, editado), 'Conta adicionada.', folha); return; }
      const mudanca = {};
      if (editado.nome !== conta.nome) mudanca.nome = editado.nome;
      if (!doCartao && editado.compraPorCompra !== conta.compraPorCompra) mudanca.compraPorCompra = editado.compraPorCompra;
      if (!Object.keys(mudanca).length) { fechar(); return; }
      salvarNaFolha((c) => editarConta(c, conta.id, mudanca), 'Conta salva.', folha);
    };
    return [
      h('h2', {}, nova ? 'Nova conta' : conta.nome),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', {
          class: 'entrada', type: 'text', value: editado.nome, autocomplete: 'off', disabled: travada, placeholder: 'Ex.: faxina, plano de saúde',
          oninput: (e) => { editado.nome = e.target.value.trim(); },
        })),
      travada
        ? h('p', { class: 'suave pequeno' }, `É a conta do cartão de ${donoDeOutro(conta).nome}: só ${donoDeOutro(conta).nome} muda o nome e as compras dela. Aqui dá para mudar só a posição na lista.`)
        : h('div', { class: 'campo' },
          h('span', { class: 'campo-rotulo' }, 'Como você preenche esta conta?'),
          escolhaDoJeito(editado.compraPorCompra, (v) => { editado.compraPorCompra = v; }, Boolean(doCartao)),
          doCartao && h('span', { class: 'campo-dica' }, `Ela é a conta do cartão${nomeDe(doCartao.donaId) ? ` de ${nomeDe(doCartao.donaId)}` : ''}: as compras vêm da aba Cartão, e só a parte da casa entra aqui.`)),
      !nova && h('div', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Posição na lista'),
        h('div', { class: 'casa-passo' },
          h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Subir na lista', disabled: k <= 0, onclick: () => salvar((c) => moverConta(c, conta.id, -1)) }, '↑'),
          h('span', { class: 'casa-vezes' }, `${k + 1}ª de ${ativas.length}`),
          h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Descer na lista', disabled: k >= ativas.length - 1, onclick: () => salvar((c) => moverConta(c, conta.id, 1)) }, '↓')),
        h('span', { class: 'campo-dica' }, 'As contas aparecem no mês nesta ordem.')),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), !travada && botao(nova ? 'Adicionar' : 'Salvar', salvarConta)),
      // A conta de um cartão sai com o cartão ("Tirar este cartão", em Cartões e compras), não sozinha.
      !nova && !travada && !doCartao && botaoDoisToques('Parar de usar esta conta', 'Toque de novo: ela sai dos meses novos',
        () => salvarNaFolha((c) => editarConta(c, conta.id, { arquivada: true }), `${conta.nome} não aparece mais nos meses novos.`, folha)),
    ];
  };

  // A folha aberta vem do endereço (#/casa-ajustes?folha=conta-x): o botão voltar do celular a fecha.
  function conteudoDaFolha(folha) {
    if (folha === 'nova-conta') return folhaDaConta(null, folha);
    if (folha?.startsWith('conta-')) { const conta = ativas.find((c) => c.id === folha.slice(6)); return conta && folhaDaConta(conta, folha); }
    if (folha?.startsWith('pessoa-')) { const p = casa.pessoas.find((x) => x.id === folha.slice(7)); return p && folhaDaPessoa(p, folha); }
    return null;
  }

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

  // Visão única (desenho 2026-11-21-planejador-integrado): um "Ajustes" só; o plano de aposentadoria é uma seção daqui.
  const plano = ctx.unica && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Plano de aposentadoria'),
    h('div', {}, h('button', { type: 'button', class: 'casa-linha', onclick: () => ctx.navegar('#/config') },
      iconeCategoria('mercado'),
      h('span', { class: 'texto' }, h('b', {}, 'Ajustes do plano'), h('small', {}, 'Premissas, carteira-alvo, investimentos e backup')),
      h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'))),
    h('p', { class: 'suave pequeno balanco-nota balanco-rodape' }, 'O salário e o custo de vida do plano vêm do Balanço: não se digitam lá.'));
  // ---------- gavetas (desenho 2026-11-21-ajustes-em-gavetas) ----------
  // Os ajustes em grupos que abrem e fecham (um por vez). A gaveta aberta continua aberta depois de salvar (o desenho
  // refaz a tela) e ao voltar para cá na mesma sessão.
  const perfis = casa.perfis ?? [];
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const grupos = [
    {
      id: 'casa', icone: 'casa', cat: 'casa', titulo: 'Casa',
      resumo: `${casa.pessoas.map((p) => p.nome).join(' e ')} · ${plural(ativas.length, 'conta', 'contas')}`,
      conteudo: [pessoas, contas, notaDaDivisao],
    },
    {
      id: 'cartoes', icone: 'cartao', cat: 'cartao', titulo: 'Cartões e compras',
      resumo: `${cartoes.length ? plural(cartoes.length, 'cartão', 'cartões') : 'Nenhum cartão'} · etiquetas`,
      conteudo: [...secaoCartoes, etiquetasCompostas],
    },
    plano && {
      id: 'plano', icone: 'investir', cat: 'mercado', titulo: 'Plano de aposentadoria',
      resumo: 'Premissas, carteira e investimentos', conteudo: [plano],
    },
    {
      id: 'aparelhos', icone: 'celular', cat: 'conexao', titulo: 'Aparelhos e perfis',
      resumo: [ctx.conexao ? 'Sincronizado' : 'Só neste aparelho', administra && plural(perfis.length, 'perfil', 'perfis')].filter(Boolean).join(' · '),
      conteudo: [...[sincronizacao].flat(), perfisEAparelhos],
    },
  ].filter(Boolean);
  // Vindo de "Perfis e aparelhos" (o menu da foto): abre a gaveta deles.
  if (parametroDoHash(location.hash, 'secao') === 'perfis') gavetaAberta = 'aparelhos';

  const gavetas = grupos.map((g) => {
    const aberta = gavetaAberta === g.id;
    return h('section', { class: `gaveta${aberta ? ' aberta' : ''}`, 'data-gaveta': g.id },
      h('button', {
        type: 'button', class: 'gaveta-topo', 'aria-expanded': String(aberta), 'aria-controls': `gaveta-${g.id}`,
        onclick: () => alternarGaveta(container, g.id),
      },
      seloDoGrupo(g),
      h('span', { class: 'texto' }, h('b', {}, g.titulo), h('small', {}, g.resumo)),
      h('span', { class: 'gaveta-seta', 'aria-hidden': 'true' }, icone('chevron'))),
      h('div', { class: 'gaveta-corpo', id: `gaveta-${g.id}`, role: 'region', 'aria-label': g.titulo, inert: !aberta },
        h('div', { class: 'gaveta-dentro' }, ...g.conteudo.filter(Boolean))));
  });

  container.replaceChildren(...[
    h('h1', {}, ctx.unica ? 'Ajustes' : 'Ajustes da casa'),
    ...gavetas,
    veAposentadoria(visto) && !ctx.unica && h('button', { type: 'button', class: 'botao-link', onclick: () => ctx.navegar('#/inicio') }, 'Ir para o planejador de aposentadoria'),
  ].filter(Boolean));
  if (parametroDoHash(location.hash, 'secao') === 'perfis') document.getElementById('perfis')?.scrollIntoView({ block: 'start' });

  const folha = folhaAberta(location.hash);
  const conteudo = folha && conteudoDaFolha(folha);
  if (!conteudo) {
    abertaAqui = false;
    esconderFolha();
    return;
  }
  const painel = mostrarFolha({ conteudo: conteudo.filter(Boolean), aoFechar: fechar, rotulo: 'Ajustes da casa' });
  painel.setAttribute('data-sem-recarregar', ''); // o que foi digitado fica só na memória até "Salvar"
  setTimeout(() => painel.querySelector('input:not([disabled])')?.focus({ preventScroll: true }), 60);
}

let abertaAqui = false; // a folha foi aberta por um toque nesta sessão: fechar = voltar no histórico

// O selo do grupo: a cor da categoria com o ícone próprio do grupo.
function seloDoGrupo(g) {
  const selo = iconeCategoria(g.cat);
  selo.replaceChildren(icone(g.icone));
  return selo;
}

// Abre a gaveta tocada e fecha as outras (ou fecha a que já estava aberta), sem redesenhar: o CSS anima.
let gavetaAberta = null;
function alternarGaveta(raiz, id) {
  gavetaAberta = gavetaAberta === id ? null : id;
  for (const g of raiz.querySelectorAll('.gaveta')) {
    const esta = g.dataset.gaveta === gavetaAberta;
    g.classList.toggle('aberta', esta);
    g.querySelector('.gaveta-topo').setAttribute('aria-expanded', String(esta));
    g.querySelector('.gaveta-corpo').inert = !esta;
    // A gaveta que abriu sobe para o topo da tela (a de cima pode ter fechado e encolhido a página).
    if (esta) setTimeout(() => g.scrollIntoView({ block: 'start', behavior: reduzMovimento() ? 'auto' : 'smooth' }), 140);
  }
}
