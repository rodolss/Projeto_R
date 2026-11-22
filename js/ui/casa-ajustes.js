// Contas da casa · Ajustes (desenho de 2026-11-19): nomes, contas, cartão, sincronização e a volta para a aposentadoria,
// em gavetas por grupo (desenho 2026-11-21-ajustes-em-gavetas).
// Cada mudança salva na hora (nome ao sair do campo; o resto ao tocar), sem botão "Salvar" para esquecer.
import { h, cartao, botao, mostrarFolha, esconderFolha } from './dom.js';
import { adicionarConta, editarConta, moverConta } from '../core/casa.js';
import { cartaoConectar } from './conectar.js';
import { editarPessoaDoCartao, tirarCartao, rotuloDoCartao, pessoasDe, donaDaPessoa } from '../core/cartao.js';
import { formularioDoCartao, botaoDoisToques } from './casa-cartao.js';
import {
  cartoesVisiveis, veAposentadoria, adicionarPerfil, renomearPerfil, vincularAparelho, desvincularAparelho, donoDeOutroCartao,
  codigoDoAparelho, quemDivideNosAjustes, entrarNaDivisao, sairDaDivisao, podeSairDaDivisao, detalheDoPerfil, podeApagarPerfil,
  apagarPerfil, perfisEscondidos,
} from '../core/perfis.js';
import { pessoasNoMes } from '../core/casa.js';
import { mesPadraoDaCasa, nomeDoMes } from './casa.js';
import { avatar } from './topo.js';
import { adicionarJunta, removerJunta, JUNTAS_DO_APP } from '../core/tags.js';
import { icone, iconeCategoria } from './icones.js';
import { reduzMovimento } from './movimento.js';
import { parametroDoHash, folhaAberta, depoisDeSalvar } from './rotas.js';
import { categoriaDaConta } from '../core/categorias.js';
import { contasPessoaisDe, adicionarContaPessoal, editarContaPessoal, moverContaPessoal, faltamParcelas, ultimoMesDasParcelas } from '../core/contas-pessoais.js';
import { textoDoFim, campoDoFim } from './conta-pessoal.js';

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
  // `texto` pode ser uma função, chamada depois de salvar (o aviso depende do que a mudança conseguiu fazer).
  const salvarNaFolha = async (mutacao, texto, folha) => {
    await ctx.salvarCasa(mutacao);
    const aviso = typeof texto === 'function' ? texto() : texto;
    if (aviso) ctx.aviso(aviso, 'ok', 2500);
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

  // Quem divide vem dos perfis (desenho 2026-11-21-divisao-pelos-perfis): quem administra marca na própria lista quem
  // divide (salva na hora, do mês em foco em diante); nomes e perfis novos ficam só em Aparelhos e perfis. Os outros
  // veem quem divide, sem mexer.
  const administra = Boolean(ctx.perfil?.admin && visto && ctx.perfil.vinculado?.id === visto.id);
  const mesDoFoco = mesPadraoDaCasa(ctx);
  const desde = nomeDoMes(mesDoFoco);
  const quemDivide = quemDivideNosAjustes(casa, mesDoFoco, { administra });
  const situacao = ({ divide, muda }) => (muda ? (divide ? `sai da divisão em ${nomeDoMes(muda)}` : `divide a partir de ${nomeDoMes(muda)}`)
    : divide ? 'divide as contas' : 'não divide as contas');
  const alternar = async ({ pessoa, divide }, linha) => {
    if (salvandoDivisao) return; // um toque por vez: salvar pode demorar (GitHub)
    if (divide && !podeSairDaDivisao(casa, pessoa.id, mesDoFoco)) {
      ctx.aviso('Precisam ficar pelo menos duas pessoas dividindo as contas.', 'atencao', 3500);
      return;
    }
    salvandoDivisao = true;
    linha.setAttribute('aria-checked', String(!divide)); // a marca muda na hora; a lista se refaz depois de salvar
    try {
      await salvar((c) => (divide ? sairDaDivisao(c, pessoa.id, mesDoFoco) : entrarNaDivisao(c, pessoa.id, mesDoFoco)),
        divide ? `${pessoa.nome} não divide mais as contas de ${desde} em diante.` : `${pessoa.nome} divide as contas de ${desde} em diante.`);
    } finally {
      salvandoDivisao = false;
    }
  };
  const linhaDeQuemDivide = (item) => {
    const { pessoa: p, divide } = item;
    if (!administra) return h('div', { class: 'casa-linha estatica' }, avatar(p), h('span', { class: 'texto' }, h('b', {}, p.nome)));
    return h('button', {
      type: 'button', class: `casa-linha${divide ? '' : ' fora-da-divisao'}`, role: 'checkbox', 'aria-checked': String(divide),
      onclick: (e) => alternar(item, e.currentTarget),
    },
    avatar(p),
    h('span', { class: 'texto' }, h('b', {}, p.nome), h('small', {}, situacao(item))),
    h('span', { class: 'marca-divide', 'aria-hidden': 'true' }));
  };
  const pessoas = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Quem divide as contas'),
    h('div', {}, ...quemDivide.map(linhaDeQuemDivide)),
    administra && h('p', { class: 'nota nota-casa' },
      `Marque quem divide as contas. Vale de ${desde} em diante; os meses antes continuam como estão. Nomes e perfis novos ficam em Aparelhos e perfis.`));

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

  // Contas pessoais (desenho 2026-11-22-contas-pessoais): as de quem vê, fora da divisão. Sem perfil, não há dono.
  const pessoaisAtivas = visto ? contasPessoaisDe(casa, visto.id) : [];
  const pessoaisParadas = visto ? contasPessoaisDe(casa, visto.id, { arquivadas: true }) : [];
  const secaoPessoais = visto && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Contas pessoais'),
    h('div', {},
      ...pessoaisAtivas.map((conta) => linhaDaLista({
        selo: iconeCategoria(categoriaDaConta(conta)), titulo: conta.nome, detalhe: textoDoFim(conta, mesDoFoco), aoTocar: () => abrir(`pessoal-${conta.id}`),
      })),
      linhaDaLista({ selo: h('span', { class: 'icone-cat cat-casa', 'aria-hidden': 'true' }, icone('mais')), titulo: 'Adicionar conta pessoal', aoTocar: () => abrir('nova-pessoal'), classe: 'linha-acao' })),
    pessoaisParadas.length > 0 && h('details', { class: 'casa-paradas' },
      h('summary', {}, `Contas pessoais que não usa mais (${pessoaisParadas.length})`),
      ...pessoaisParadas.map((conta) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, conta.nome), h('small', {}, 'continua no histórico')),
        h('button', {
          type: 'button', class: 'botao-link', style: 'padding:4px 0',
          // Volta do mês em foco em diante (não do mês de hoje: um mês já todo pago não reabre por uma previsão nova).
          onclick: () => salvar((c) => editarContaPessoal(c, conta.id, { arquivada: false, desde: mesDoFoco }), `${conta.nome} voltou para a lista.`),
        }, 'Voltar a usar')))),
    h('p', { class: 'nota nota-casa' }, 'Aparecem só no seu perfil. Não entram na divisão da casa: saem só do seu balanço.'));

  // ---------- folhas da casa ----------
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

  // Conta pessoal: nome, se tem fim (as parcelas contam a partir do mês em foco) e a posição na lista.
  const folhaDaContaPessoal = (conta, folha) => {
    const nova = !conta;
    const k = nova ? -1 : pessoaisAtivas.findIndex((c) => c.id === conta.id);
    const faltam = conta?.ultimoMes ? Math.max(1, faltamParcelas(conta, mesDoFoco)) : null;
    const editado = { nome: conta?.nome ?? '', parcelas: faltam, mudouFim: false };
    const salvarPessoal = () => {
      if (!editado.nome) { ctx.aviso('Escreva o nome da conta.', 'atencao', 3000); return; }
      if (nova) {
        salvarNaFolha((c) => adicionarContaPessoal(c, { nome: editado.nome, donoId: visto.id, mes: mesDoFoco, parcelas: editado.parcelas }), 'Conta pessoal adicionada.', folha);
        return;
      }
      const mudanca = {};
      if (editado.nome !== conta.nome) mudanca.nome = editado.nome;
      if (editado.mudouFim) mudanca.ultimoMes = ultimoMesDasParcelas(mesDoFoco, editado.parcelas);
      if (!Object.keys(mudanca).length) { fechar(); return; }
      salvarNaFolha((c) => editarContaPessoal(c, conta.id, mudanca), 'Conta salva.', folha);
    };
    return [
      h('h2', {}, nova ? 'Nova conta pessoal' : conta.nome),
      nova && h('p', { class: 'suave pequeno' }, 'Uma conta só sua, que se repete todo mês e não é no cartão. Ela não entra na divisão da casa.'),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', {
          class: 'entrada', type: 'text', value: editado.nome, autocomplete: 'off', placeholder: 'Ex.: empréstimo, academia',
          oninput: (e) => { editado.nome = e.target.value.trim(); },
        })),
      campoDoFim({ parcelas: editado.parcelas, mes: mesDoFoco, aoMudar: (n) => { editado.parcelas = n; editado.mudouFim = true; } }),
      !nova && h('div', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Posição na lista'),
        h('div', { class: 'casa-passo' },
          h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Subir na lista', disabled: k <= 0, onclick: () => salvar((c) => moverContaPessoal(c, conta.id, -1)) }, '↑'),
          h('span', { class: 'casa-vezes' }, `${k + 1}ª de ${pessoaisAtivas.length}`),
          h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Descer na lista', disabled: k >= pessoaisAtivas.length - 1, onclick: () => salvar((c) => moverContaPessoal(c, conta.id, 1)) }, '↓'))),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao(nova ? 'Adicionar' : 'Salvar', salvarPessoal)),
      !nova && botaoDoisToques('Parar de usar esta conta', 'Toque de novo: ela sai dos meses novos',
        () => salvarNaFolha((c) => editarContaPessoal(c, conta.id, { arquivada: true }), `${conta.nome} não aparece mais nos meses novos.`, folha)),
    ];
  };

  // A folha aberta vem do endereço (#/casa-ajustes?folha=conta-x): o botão voltar do celular a fecha.
  function conteudoDaFolha(folha) {
    if (folha === 'nova-conta') return folhaDaConta(null, folha);
    if (folha === 'nova-pessoal') return visto && folhaDaContaPessoal(null, folha);
    if (folha?.startsWith('pessoal-')) { const conta = pessoaisAtivas.find((c) => c.id === folha.slice(8)); return conta && folhaDaContaPessoal(conta, folha); }
    if (folha?.startsWith('conta-')) { const conta = ativas.find((c) => c.id === folha.slice(6)); return conta && folhaDaConta(conta, folha); }
    if (folha?.startsWith('cartao-')) { const k = cartoes.find((x) => x.id === folha.slice(7)); return k && folhaDoCartao(k, folha); }
    if (folha?.startsWith('outra-')) { const p = usadas.find((x) => x.id === folha.slice(6)); return p && folhaDaOutraPessoa(p, folha); }
    if (folha === 'etiquetas') return folhaDasEtiquetas();
    if (!administra) return null; // perfis e aparelhos: só quem administra
    if (folha === 'novo-perfil') return folhaDoNovoPerfil(folha);
    if (folha?.startsWith('perfil-')) { const p = perfis.find((x) => x.id === folha.slice(7)); return p && folhaDoPerfil(p, folha); }
    if (folha?.startsWith('aparelho-')) { const a = aparelhos.find((x) => x.id === folha.slice(9)); return a && folhaDoAparelho(a, folha); }
    return null;
  }

  // ---------- cartões e compras (desenho 2026-11-21-ajustes-casa-simples) ----------
  // Como a Casa: cartões, pessoas e etiquetas em listas limpas; tocar abre uma folha simples.
  const cartoes = cartoesVisiveis(casa, visto); // cada um, os próprios
  const usado = (k) => k.fixas.length > 0 || casa.meses.some((m) => (m.compras ?? []).some((c) => c.contaId === k.contaId));
  const tituloDoCartao = (k) => {
    const rotulo = rotuloDoCartao(casa, k);
    return casa.pessoas.some((p) => p.nome === rotulo) ? `Cartão de ${rotulo}` : rotulo;
  };
  const diasDoCartao = (k) => (k.viraNoDia && k.venceNoDia ? `vira dia ${k.viraNoDia} · vence dia ${k.venceNoDia}` : 'falta escolher os dias');
  const secaoCartoes = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, cartoes.length > 1 ? 'Cartões' : 'Cartão'),
    h('div', {},
      ...cartoes.map((k) => linhaDaLista({
        selo: iconeCategoria('cartao'), titulo: tituloDoCartao(k), detalhe: diasDoCartao(k), aoTocar: () => abrir(`cartao-${k.id}`),
      })),
      linhaDaLista({
        selo: h('span', { class: 'icone-cat cat-casa', 'aria-hidden': 'true' }, icone('mais')), classe: 'linha-acao',
        titulo: cartoes.length ? 'Adicionar outro cartão' : 'Configurar o cartão',
        detalhe: !cartoes.length && 'Anote compra por compra: o que é da casa, de cada um e de outras pessoas',
        aoTocar: () => ctx.navegar(cartoes.length ? '#/casa-cartao?novo=1' : '#/casa-cartao'),
      })));

  // Cada um vê as próprias (o "Pai" dela não é o dele); sem perfis, todas, com de quem é cada uma.
  const outrasPessoas = visto ? pessoasDe(casa, visto.id) : (casa.outrasPessoas ?? []);
  const usadas = outrasPessoas.filter((p) => !p.arquivada);
  const paradas = outrasPessoas.filter((p) => p.arquivada);
  const deQuemE = (p) => { const dona = !visto && donaDaPessoa(casa, p); return dona && nomeDe(dona) ? `para quem ${nomeDe(dona)} compra` : 'toque para mudar o nome'; };
  const secaoPessoas = cartoes.length > 0 && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Para quem também compro'),
    usadas.length > 0 && h('div', {}, ...usadas.map((p) => linhaDaLista({
      selo: avatar(p), titulo: p.nome, detalhe: deQuemE(p), aoTocar: () => abrir(`outra-${p.id}`),
    }))),
    h('p', { class: 'nota nota-casa' }, usadas.length
      ? 'Para acrescentar alguém, use "+ Outra pessoa" ao anotar uma compra.'
      : 'Ninguém ainda. Para acrescentar alguém, use "+ Outra pessoa" ao anotar uma compra.'),
    paradas.length > 0 && h('details', { class: 'casa-paradas' },
      h('summary', {}, `Pessoas para quem não compra mais (${paradas.length})`),
      ...paradas.map((p) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, p.nome)),
        h('button', {
          type: 'button', class: 'botao-link', style: 'padding:4px 0',
          onclick: () => salvar((c) => editarPessoaDoCartao(c, p.id, { arquivada: false }), `${p.nome} voltou para a lista.`),
        }, 'Voltar a usar')))));

  const daCasa = Object.values(casa.etiquetasJuntas ?? {});
  const secaoEtiquetas = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Etiquetas'),
    h('div', {}, linhaDaLista({
      selo: h('span', { class: 'icone-cat cat-assinatura', 'aria-hidden': 'true' }, icone('etiqueta')), titulo: 'Palavras que andam juntas',
      detalhe: daCasa.length ? `"Pão de Queijo" e mais ${daCasa.length} de vocês contam como uma etiqueta só` : '"Pão de Queijo" conta como uma etiqueta só',
      aoTocar: () => abrir('etiquetas'),
    })));

  // ---------- folhas de cartões e compras ----------
  const folhaDoCartao = (k, folha) => [
    h('h2', {}, tituloDoCartao(k)),
    // Com perfis, o cartão é de quem vê: sem "De quem é" (não dá para passar o cartão para outra pessoa).
    formularioDoCartao(ctx, {
      cartaoId: k.id, donaFixa: Boolean(visto), aoCancelar: fechar,
      aoSalvar: () => { const acao = depoisDeSalvar(location.hash, folha, 'casa-ajustes'); if (acao === 'fechar') fechar(); else if (acao === 'redesenhar') ctx.rerender(); },
    }),
    usado(k)
      ? h('p', { class: 'suave pequeno' }, 'Este cartão já tem compras anotadas: ele fica, para não perder o histórico.')
      : botaoDoisToques('Tirar este cartão', 'Toque de novo para tirar', () => salvarNaFolha((c) => tirarCartao(c, k.id), 'Cartão tirado.', folha)),
  ];

  const folhaDaOutraPessoa = (pessoa, folha) => {
    let nome = pessoa.nome;
    return [
      h('h2', {}, pessoa.nome),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { class: 'entrada', type: 'text', value: pessoa.nome, autocomplete: 'off', oninput: (e) => { nome = e.target.value.trim(); } })),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Salvar', () => {
        if (!nome) { ctx.aviso('Escreva o nome.', 'atencao', 3000); return; }
        if (nome === pessoa.nome) { fechar(); return; }
        salvarNaFolha((c) => editarPessoaDoCartao(c, pessoa.id, { nome }), 'Nome salvo.', folha);
      })),
      botaoDoisToques(`Não compro mais para ${pessoa.nome}`, 'Toque de novo: sai da lista "Para quem"',
        () => salvarNaFolha((c) => editarPessoaDoCartao(c, pessoa.id, { arquivada: true }), `${pessoa.nome} saiu da lista de "Para quem".`, folha)),
    ];
  };

  // As expressões que valem uma etiqueta só (as do app vêm prontas; a casa acrescenta as suas em casa.etiquetasJuntas).
  const folhaDasEtiquetas = () => {
    const nova = { texto: '' };
    return [
      h('h2', {}, 'Palavras que andam juntas'),
      h('p', { class: 'suave' }, 'Cada palavra de uma compra vira uma etiqueta: "Ração da Nami" tem duas, Ração e Nami. As expressões daqui contam como uma só.'),
      daCasa.length > 0 && h('div', { class: 'cartao casa-compras' }, ...Object.entries(casa.etiquetasJuntas ?? {}).map(([chave, texto]) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, texto)),
        botaoDoisToques('Tirar', 'Tirar?', () => salvar((c) => removerJunta(c, chave), 'Expressão tirada.'))))),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Acrescentar (duas palavras ou mais)'),
        h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: Banho e Tosa', oninput: (e) => { nova.texto = e.target.value; } })),
      h('div', { class: 'botoes' }, botao('Fechar', fechar, { secundario: true }), botao('Acrescentar', () => {
        if (adicionarJunta(casa, nova.texto) === casa) { ctx.aviso('Escreva duas palavras ou mais que ainda não estejam na lista.', 'atencao', 3500); return; }
        salvar((c) => adicionarJunta(c, nova.texto), 'Expressão acrescentada.');
      })),
      h('details', { class: 'casa-paradas' },
        h('summary', {}, `Já vêm com o app (${JUNTAS_DO_APP.length})`),
        h('div', { class: 'chips', style: 'margin-top:4px' }, ...JUNTAS_DO_APP.map((f) => h('span', { class: 'chip pequeno tag' }, f)))),
    ];
  };

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

  // ---------- perfis e aparelhos (só quem administra, vendo o próprio perfil) ----------
  // Desenho 2026-11-21-perfis-e-aparelhos-simples: como Casa e Cartões, listas limpas; tocar abre uma folha simples.
  // Um pedido de aparelho novo fica em destaque no topo.
  const perfis = casa.perfis ?? [];
  const aparelhos = casa.aparelhos ?? [];
  const pedidos = aparelhos.filter((a) => !a.perfilId);
  const impressao = ctx.perfil?.impressao ?? null;
  const nomeDoPerfil = (id) => perfis.find((p) => p.id === id)?.nome ?? null;
  const seloCelular = () => seloDoGrupo({ cat: 'conexao', icone: 'celular' });
  const dataBR = (iso) => iso.split('-').reverse().join('/');
  const tituloDoAparelho = (a) => (a.id === impressao ? 'Este aparelho' : !a.perfilId ? 'Aparelho novo' : `Aparelho de ${nomeDoPerfil(a.perfilId) ?? 'outra pessoa'}`);
  const detalheDoAparelho = (a) => [
    a.id === impressao && nomeDoPerfil(a.perfilId), !a.perfilId ? 'pedindo para entrar' : `desde ${dataBR(a.desde)}`, `código ${codigoDoAparelho(a.id)}`,
  ].filter(Boolean).join(' · ');
  const perfisEAparelhos = administra && [
    // O link "Perfis e aparelhos" do menu da foto rola até o primeiro item daqui (o pedido, se houver).
    ...pedidos.map((a, k) => h('section', { class: 'cartao casa-pedido', role: 'status', id: k === 0 ? 'perfis' : null },
      seloCelular(),
      h('span', { class: 'texto' }, h('b', {}, 'Um aparelho novo quer entrar'), h('small', {}, `Código ${codigoDoAparelho(a.id)}: confira se é o mesmo que aparece nele.`)),
      botao('Ver', () => abrir(`aparelho-${a.id}`)))),
    h('section', { class: 'cartao casa-lista', id: pedidos.length ? null : 'perfis' },
      h('h2', {}, 'Perfis'),
      h('div', {},
        ...perfis.map((p) => linhaDaLista({ selo: avatar(p), titulo: p.nome, detalhe: detalheDoPerfil(casa, p, impressao), aoTocar: () => abrir(`perfil-${p.id}`) })),
        linhaDaLista({ selo: h('span', { class: 'icone-cat cat-casa', 'aria-hidden': 'true' }, icone('mais')), titulo: 'Adicionar perfil', aoTocar: () => abrir('novo-perfil'), classe: 'linha-acao' })),
      h('p', { class: 'nota nota-casa' }, 'Cada um vê só os próprios cartões. O perfil de cada celular vem da chave do GitHub dele.')),
    // Os pedidos ficam só no destaque de cima; aqui, os aparelhos já liberados.
    aparelhos.some((a) => a.perfilId) && h('section', { class: 'cartao casa-lista' },
      h('h2', {}, 'Aparelhos'),
      h('div', {}, ...aparelhos.filter((a) => a.perfilId).map((a) => linhaDaLista({
        selo: seloCelular(), titulo: tituloDoAparelho(a), detalhe: detalheDoAparelho(a), aoTocar: () => abrir(`aparelho-${a.id}`),
      })))),
  ];

  // ---------- folhas de perfis e aparelhos ----------
  const folhaDoPerfil = (p, folha) => {
    let nome = p.nome;
    const divide = pessoasNoMes(casa, mesDoFoco).some((x) => x.id === p.id);
    return [
      h('div', { class: 'folha-perfil-topo' }, avatar(p), h('div', {}, h('h2', {}, p.nome), h('small', { class: 'suave' }, detalheDoPerfil(casa, p, impressao)))),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { class: 'entrada', type: 'text', value: p.nome, autocomplete: 'off', oninput: (e) => { nome = e.target.value.trim(); } })),
      h('p', { class: 'suave pequeno' }, `${divide ? 'Divide' : 'Não divide'} as contas da casa. Para mudar, marque em Casa › Quem divide as contas.`),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Salvar', () => {
        if (!nome) { ctx.aviso('Escreva o nome.', 'atencao', 3000); return; }
        if (nome === p.nome) { fechar(); return; }
        salvarNaFolha((c) => renomearPerfil(c, p.id, nome), 'Nome salvo.', folha);
      })),
      podeApagarPerfil(casa, p.id) && botaoDoisToques('Apagar perfil', 'Toque de novo para apagar', () => {
        let apagou = false; // com dados novos do outro celular, o perfil pode ter passado a ser usado
        salvarNaFolha((c) => { const nova = apagarPerfil(c, p.id); apagou = nova !== c; return nova; }, () => {
          if (!apagou) ctx.aviso(`${p.nome} passou a ser usado e não pode mais ser apagado.`, 'atencao', 3500);
          return apagou && `${p.nome} foi apagado.`;
        }, folha);
      }),
    ];
  };

  const folhaDoNovoPerfil = (folha) => {
    let nome = '';
    let criando = false; // dois toques rápidos não criam dois perfis
    return [
      h('h2', {}, 'Novo perfil'),
      h('p', { class: 'suave' }, 'Cada perfil vê só os próprios cartões e entra no app pelo celular dele. Ex.: um filho que tem cartão.'),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: Cris', oninput: (e) => { nome = e.target.value.trim(); } })),
      h('p', { class: 'suave pequeno' }, 'Para usar no celular da pessoa: instale o app lá e conecte com uma chave do GitHub só para aquele celular. Ele vai perguntar "Quem usa este celular?".'),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Criar perfil', () => {
        if (!nome) { ctx.aviso('Escreva o nome.', 'atencao', 3000); return; }
        const igual = (x) => x.toLocaleLowerCase('pt-BR');
        const jaExiste = (lista) => lista.some((p) => igual(p.nome) === igual(nome));
        if (jaExiste(perfis)) { ctx.aviso('Já existe um perfil com esse nome.', 'atencao', 3000); return; }
        if (criando) return;
        criando = true;
        salvarNaFolha((c) => (jaExiste(c.perfis ?? []) ? c : adicionarPerfil(c, { nome }).casa),
          `Perfil criado. Para ${nome} dividir as contas, marque em Casa › Quem divide as contas.`, folha);
      })),
    ];
  };

  const folhaDoAparelho = (a, folha) => {
    const este = a.id === impressao; // este aparelho não sai do próprio perfil por engano
    const escondidos = perfisEscondidos(casa);
    // Pedido de um aparelho novo de quem administra: já vem marcado o perfil que a escolha no aparelho não oferece.
    let escolhido = a.perfilId ?? (escondidos.length === 1 ? escondidos[0].id : null);
    const caixa = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'De quem é este aparelho?' });
    const desenharOpcoes = () => caixa.replaceChildren(...perfis.map((p) => h('button', {
      type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(p.id === escolhido), disabled: este,
      onclick: () => { escolhido = p.id; desenharOpcoes(); },
    },
    avatar(p),
    h('span', { class: 'texto' }, h('b', {}, p.nome), h('small', {}, detalheDoPerfil(casa, p, impressao))),
    h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
    desenharOpcoes();
    return [
      h('h2', {}, tituloDoAparelho(a)),
      h('p', { class: 'suave' }, detalheDoAparelho(a)),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'De quem é este aparelho?'), caixa,
        este && h('span', { class: 'campo-dica' }, 'Este aparelho fica sempre no seu perfil. Para mudar, use outro aparelho seu.')),
      h('div', { class: 'botoes' }, botao(este ? 'Fechar' : 'Cancelar', fechar, { secundario: true }), !este && botao(a.perfilId ? 'Salvar' : 'Liberar', () => {
        if (!escolhido) { ctx.aviso('Escolha de quem é este aparelho.', 'atencao', 3000); return; }
        if (escolhido === a.perfilId) { fechar(); return; }
        salvarNaFolha((c) => vincularAparelho(c, { impressao: a.id, perfilId: escolhido, hoje: a.desde }),
          a.perfilId ? 'Aparelho atualizado.' : `Aparelho liberado para ${nomeDoPerfil(escolhido)}.`, folha);
      })),
      !este && botaoDoisToques(a.perfilId ? 'Tirar este aparelho' : 'Recusar o pedido', 'Toque de novo: ele vai perguntar de novo quem usa',
        () => salvarNaFolha((c) => desvincularAparelho(c, a.id), 'O aparelho vai perguntar de novo quem usa.', folha)),
    ];
  };

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
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const grupos = [
    {
      id: 'casa', icone: 'casa', cat: 'casa', titulo: 'Casa',
      resumo: [juntarNomes(pessoasNoMes(casa, mesDoFoco).map((p) => p.nome)), plural(ativas.length, 'conta', 'contas'),
        pessoaisAtivas.length > 0 && plural(pessoaisAtivas.length, 'pessoal', 'pessoais')].filter(Boolean).join(' · '),
      conteudo: [pessoas, contas, notaDaDivisao, secaoPessoais],
    },
    {
      id: 'cartoes', icone: 'cartao', cat: 'cartao', titulo: 'Cartões e compras',
      resumo: [cartoes.length ? plural(cartoes.length, 'cartão', 'cartões') : 'Nenhum cartão', usadas.length > 0 && plural(usadas.length, 'pessoa', 'pessoas'), 'etiquetas'].filter(Boolean).join(' · '),
      conteudo: [secaoCartoes, secaoPessoas, secaoEtiquetas],
    },
    plano && {
      id: 'plano', icone: 'investir', cat: 'mercado', titulo: 'Plano de aposentadoria',
      resumo: 'Premissas, carteira e investimentos', conteudo: [plano],
    },
    {
      id: 'aparelhos', icone: 'celular', cat: 'conexao', titulo: 'Aparelhos e perfis',
      resumo: [
        administra && pedidos.length > 0 && plural(pedidos.length, 'pedido novo', 'pedidos novos'),
        ctx.conexao ? 'Sincronizado' : 'Só neste aparelho', administra && plural(perfis.length, 'perfil', 'perfis'),
      ].filter(Boolean).join(' · '),
      conteudo: [...(perfisEAparelhos || []), ...[sincronizacao].flat()],
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
let salvandoDivisao = false; // uma marca de "Quem divide as contas" salvando: o próximo toque espera

// "Ana e Leo"; "Ana, Leo e Cris".
export const juntarNomes = (nomes) => (nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes.join(''));

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
