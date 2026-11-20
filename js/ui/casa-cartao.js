// Contas da casa · Cartão (desenho 2026-11-19-cartao): o cartão de uma das pessoas, usado para ela, para a casa
// e para outras pessoas. Anotar uma compra pede o que foi, o valor, a data e para quem; o app descobre a fatura
// e mostra quanto é de cada um. A parte da casa entra sozinha nas contas da casa.
// Vários cartões (um por pessoa, ou mais): botões no topo para trocar; o aparelho lembra o último aberto.
// Endereço: #/casa-cartao?cartao=<id>&fatura=…&folha=anotar|compra-<id>|fixa-<id> (o voltar do celular fecha a
// folha) e #/casa-cartao?novo=1 para criar outro cartão.
import { h, campoMoeda, cartao, botao, mostrarFolha, esconderFolha } from './dom.js';
import { formatarBRL } from '../core/formato.js';
import { somarMeses } from '../core/meses.js';
import { apagarCompra, parcelasSeguintes, conferirFatura } from '../core/casa.js';
import {
  faturaDaCompra, periodoDaFatura, cartaoPronto, configurarCartao, adicionarPessoaDoCartao, opcoesPara, nomeDoPara,
  anotarCompra, faturaDoCartao, editarCompraDoCartao, editarFixa, pararFixa, nomesUsados, primeiraFatura,
  acharCartao, adicionarCartao, rotuloDoCartao,
} from '../core/cartao.js';
import { folhaAberta, parametroDoHash, depoisDeSalvar } from './rotas.js';
import { nomeDoMes } from './casa.js';

const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function faturaDaTela(hash, padrao) {
  const fatura = parametroDoHash(hash, 'fatura');
  return fatura && /^\d{4}-(0[1-9]|1[0-2])$/.test(fatura) ? fatura : padrao;
}

export function cartaoDaTela(hash, casa, lembrado) {
  const ids = (casa.cartoes ?? []).map((c) => c.id);
  const pedido = parametroDoHash(hash, 'cartao');
  if (pedido && ids.includes(pedido)) return pedido;
  if (lembrado && ids.includes(lembrado)) return lembrado;
  return ids[0] ?? null;
}

// Compra com grupo é parcela, mesmo sem o número da parcela (importação antiga).
export const ehParcelada = (compra) => Boolean(compra.grupo);

export const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const dataComAno = (iso) => `${dataCurta(iso)}/${iso.slice(0, 4)}`;

export function situacaoDaFatura({ hoje, periodo, conferida }) {
  if (conferida) return 'conferida';
  if (hoje > periodo.ate) return 'fechada';
  return hoje >= periodo.de ? 'aberta' : 'futura';
}

// Nomes já usados que combinam com o que foi digitado: os que começam assim primeiro, depois os que têm no meio.
// A lista nativa do navegador (datalist) cobria a tela no Android; estas viram botõezinhos embaixo do campo.
export function sugestoesDoNome(sugestoes, texto, limite = 4) {
  const chave = semAcento(texto);
  if (!chave) return [];
  const nomes = sugestoes.map((s) => s.nome).filter((nome) => semAcento(nome) !== chave);
  const comeca = nomes.filter((nome) => semAcento(nome).startsWith(chave));
  const meio = nomes.filter((nome) => !semAcento(nome).startsWith(chave) && semAcento(nome).includes(chave));
  return [...comeca, ...meio].slice(0, limite);
}

export function paraSugerido(sugestoes, nome) {
  const chave = semAcento(nome);
  if (!chave) return null;
  return sugestoes.find((s) => semAcento(s.nome) === chave)?.para ?? null;
}

const nomeDaFatura = (fatura, hoje) => (fatura.slice(0, 4) === hoje.slice(0, 4) ? nomeDoMes(fatura) : `${nomeDoMes(fatura)} de ${fatura.slice(0, 4)}`);

// Escolha única em "chips" (botões redondos). `aoEscolher(id)`; devolve o elemento e um jeito de marcar de fora.
function chips(opcoes, escolhido, aoEscolher, rotulo) {
  const caixa = h('div', { class: 'chips', role: 'group', 'aria-label': rotulo });
  const desenhar = (atual) => caixa.replaceChildren(...opcoes.map((o) => h('button', {
    type: 'button', class: `chip${o.id === atual ? ' ativo' : ''}`, 'aria-pressed': o.id === atual ? 'true' : 'false',
    onclick: () => { desenhar(o.id); aoEscolher(o.id); },
  }, o.nome)));
  desenhar(escolhido);
  caixa.marcar = desenhar;
  return caixa;
}

// Botão que pede um segundo toque antes de fazer algo que não volta (apagar, parar de repetir).
export function botaoDoisToques(texto, confirmar, aoConfirmar) {
  const b = h('button', { type: 'button', class: 'botao-link perigo-link' }, texto);
  let pronto = false;
  b.addEventListener('click', async () => {
    if (!pronto) {
      pronto = true;
      b.textContent = confirmar;
      setTimeout(() => { if (b.isConnected && pronto) { pronto = false; b.textContent = texto; } }, 4000);
      return;
    }
    b.disabled = true;
    await aoConfirmar();
  });
  return b;
}

function campoTexto({ rotulo, valor = '', placeholder, lista, aoMudar }) {
  const input = h('input', {
    class: 'entrada', type: 'text', autocomplete: 'off', value: valor, placeholder, list: lista,
    oninput: (e) => aoMudar(e.target.value),
  });
  const campo = h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo), input);
  campo.input = input;
  return campo;
}

const DIAS = Array.from({ length: 31 }, (_, k) => k + 1);
function campoDia({ rotulo, dica, valor, aoMudar }) {
  return h('label', { class: 'campo' },
    h('span', { class: 'campo-rotulo' }, rotulo),
    h('select', { class: 'entrada', onchange: (e) => aoMudar(e.target.value ? Number(e.target.value) : null) },
      h('option', { value: '' }, 'Escolha o dia'),
      ...DIAS.map((d) => h('option', { value: String(d), selected: d === valor }, `Dia ${d}`))),
    dica && h('span', { class: 'campo-dica' }, dica));
}

// Configuração de um cartão (também usada nos Ajustes da casa). Sem `cartaoId`, cria um cartão novo; `aoSalvar(id)`.
// `donaFixa`: o cartão já tem dona e aqui só faltam os dias (quem não é a dona cria o próprio, não troca a dela).
export function formularioDoCartao(ctx, { cartaoId = null, aoSalvar, aoCancelar = null, textoDoBotao = 'Salvar', donaFixa = false }) {
  const { casa } = ctx;
  const atual = cartaoId ? acharCartao(casa, cartaoId) : null;
  const escolha = { donaId: atual?.donaId ?? null, viraNoDia: atual?.viraNoDia ?? null, venceNoDia: atual?.venceNoDia ?? null, nome: '' };
  const cartoes = casa.cartoes ?? [];
  const ligadas = new Set(cartoes.map((c) => c.contaId));
  const livres = casa.contas.filter((c) => c.compraPorCompra && !c.arquivada && !ligadas.has(c.id));
  // O mesmo critério de adicionarCartao: o primeiro cartão fica com a conta compra por compra que já existe.
  const contaLigada = atual ? casa.contas.find((c) => c.id === atual.contaId) : (!cartoes.length && livres.length === 1 ? livres[0] : null);
  const nomeCampo = !contaLigada && campoTexto({
    rotulo: 'Nome do cartão', placeholder: 'Ex.: Cartão Leo', aoMudar: (v) => { escolha.nome = v.trim(); },
  });
  const sugerirNome = () => {
    const dona = casa.pessoas.find((p) => p.id === escolha.donaId);
    if (nomeCampo && dona) nomeCampo.input.placeholder = `Cartão ${dona.nome}`;
  };
  sugerirNome();

  const salvar = botao(textoDoBotao, async () => {
    if (!escolha.donaId) { ctx.aviso('Escolha de quem é o cartão.', 'atencao', 3000); return; }
    if (!escolha.viraNoDia || !escolha.venceNoDia) { ctx.aviso('Escolha os dois dias do cartão.', 'atencao', 3000); return; }
    salvar.disabled = true;
    let id = cartaoId;
    const { donaId, viraNoDia, venceNoDia, nome } = escolha;
    await ctx.salvarCasa((c) => {
      if (cartaoId) return configurarCartao(c, cartaoId, { donaId, viraNoDia, venceNoDia });
      const r = adicionarCartao(c, { donaId, viraNoDia, venceNoDia, nome });
      id = r.id;
      return r.casa;
    });
    ctx.aviso(cartaoId ? 'Cartão salvo.' : 'Cartão criado.', 'ok', 2500);
    aoSalvar(id);
  });

  return h('div', { class: 'cartao-config', 'data-sem-recarregar': '' },
    !donaFixa && h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'De quem é o cartão?'),
      chips(casa.pessoas, escolha.donaId, (id) => { escolha.donaId = id; sugerirNome(); }, 'De quem é o cartão')),
    nomeCampo,
    campoDia({
      rotulo: 'Melhor dia de compra', valor: escolha.viraNoDia, aoMudar: (d) => { escolha.viraNoDia = d; },
      dica: 'O dia em que o cartão "vira": compras desse dia em diante vão para a fatura seguinte. Está no app do banco.',
    }),
    campoDia({ rotulo: 'Dia do vencimento', valor: escolha.venceNoDia, aoMudar: (d) => { escolha.venceNoDia = d; } }),
    h('p', { class: 'suave pequeno', style: 'margin:0' }, contaLigada
      ? `A parte da casa entra na conta "${contaLigada.nome}" das contas da casa.`
      : 'A parte da casa entra numa conta nova das contas da casa, com o nome do cartão.'),
    h('div', { class: 'botoes' }, salvar, aoCancelar && botao('Cancelar', aoCancelar, { secundario: true })));
}

// A folha foi aberta por um toque nesta sessão? Então fechar = voltar no histórico.
let abertaAqui = false;
// Depois de anotar, a próxima compra começa com a mesma data (quem anota várias de uma vez agradece).
let ultimaData = null;

export function render(container, ctx) {
  desenhar(container, ctx);
}

export function atualizar(container, ctx) {
  desenhar(container, ctx);
}

const CHAVE_CARTAO = 'projetoR.cartao'; // o último cartão aberto neste aparelho
const lerLembrado = () => { try { return localStorage.getItem(CHAVE_CARTAO); } catch { return null; } };
const lembrar = (id) => { try { localStorage.setItem(CHAVE_CARTAO, id); } catch { /* sem armazenamento: só não lembra */ } };

// Botões no topo para trocar de cartão (só com dois ou mais).
function trocaDeCartao(casa, atualId) {
  const cartoes = casa.cartoes ?? [];
  if (cartoes.length < 2) return null;
  return h('div', { class: 'cartao-troca' },
    chips(cartoes.map((c) => ({ id: c.id, nome: rotuloDoCartao(casa, c) })), atualId,
      (id) => location.replace(`#/casa-cartao?cartao=${id}`), 'Qual cartão'));
}
const outroCartao = () => h('button', {
  type: 'button', class: 'botao-link cartao-outro', onclick: () => { location.hash = '#/casa-cartao?novo=1'; },
}, 'Adicionar outro cartão');

function desenhar(container, ctx) {
  const { casa } = ctx;
  if (!casa) {
    // Carregando, erro ou primeiro uso: a tela do Mês cuida disso.
    location.replace('#/casa');
    return;
  }
  const cartoes = casa.cartoes ?? [];
  if (!cartoes.length || parametroDoHash(location.hash, 'novo')) {
    esconderFolha();
    const primeiro = !cartoes.length;
    container.replaceChildren(...[
      h('h1', {}, primeiro ? 'Cartão' : 'Novo cartão'),
      cartao(
        primeiro && h('p', {}, 'Anote cada compra do cartão com a data e para quem é. O app descobre em qual fatura ela cai, mostra quanto é de cada pessoa e leva a parte da casa para as contas da casa.'),
        h('p', { class: 'suave' }, primeiro ? 'Antes, conte algumas coisas sobre o cartão:' : 'Cada um anota as compras no seu cartão. Conte sobre este:'),
        formularioDoCartao(ctx, {
          textoDoBotao: primeiro ? 'Começar a usar' : 'Criar cartão',
          aoSalvar: (id) => location.replace(`#/casa-cartao?cartao=${id}`),
          aoCancelar: primeiro ? null : () => location.replace('#/casa-cartao'),
        })),
    ].filter(Boolean));
    return;
  }
  const atual = acharCartao(casa, cartaoDaTela(location.hash, casa, lerLembrado()));
  lembrar(atual.id);
  if (!cartaoPronto(atual)) {
    // Cartão que veio da planilha (ou criado no outro celular) sem os dias: completa aqui.
    esconderFolha();
    // Com dona: só os dias; quem não é a dona cria o próprio cartão (o botão vem antes do formulário).
    const dona = casa.pessoas.find((p) => p.id === atual.donaId);
    container.replaceChildren(...[
      trocaDeCartao(casa, atual.id),
      h('h1', {}, dona ? `Cartão de ${dona.nome}` : 'Cartão'),
      dona && h('div', { class: 'botoes' }, botao(`Não sou ${dona.nome}: criar o meu cartão`, () => { location.hash = '#/casa-cartao?novo=1'; }, { secundario: true })),
      cartao(
        h('p', {}, dona
          ? `Falta pouco, ${dona.nome}: escolha os dois dias do seu cartão. Estão no app do banco.`
          : 'Falta pouco: conte de quem é este cartão e os dois dias dele. Estão no app do banco.'),
        formularioDoCartao(ctx, { cartaoId: atual.id, donaFixa: Boolean(dona), textoDoBotao: 'Começar a usar', aoSalvar: () => ctx.rerender() })),
      !dona && outroCartao(),
    ].filter(Boolean));
    return;
  }
  desenharFatura(container, ctx, atual);
}

function desenharFatura(container, ctx, cfg) {
  const { casa, hoje } = ctx;
  const aberta = faturaDaCompra(hoje, cfg);
  const fatura = faturaDaTela(location.hash, aberta);
  const f = faturaDoCartao(casa, cfg.id, fatura);
  const periodo = periodoDaFatura(fatura, cfg);
  const dona = casa.pessoas.find((p) => p.id === cfg.donaId);
  const nome = nomeDaFatura(fatura, hoje);

  const endereco = (extra = '') => `#/casa-cartao?cartao=${cfg.id}&fatura=${fatura}${extra}`;
  const abrir = (folha) => {
    abertaAqui = true;
    location.hash = endereco(`&folha=${folha}`);
  };
  const fechar = () => {
    ultimaData = null;
    if (abertaAqui) {
      abertaAqui = false;
      history.back();
    } else {
      location.replace(endereco());
    }
  };
  const terminar = (folha) => {
    const acao = depoisDeSalvar(location.hash, folha, 'casa-cartao');
    if (acao === 'fechar') fechar();
    else if (acao === 'redesenhar' && !folhaAberta(location.hash)) ctx.rerender();
  };
  const irPara = (m) => location.replace(`#/casa-cartao?cartao=${cfg.id}&fatura=${m}`);

  // ---------- cabeçalho ----------
  const primeira = [primeiraFatura(casa, cfg.id) ?? aberta, aberta].sort()[0];
  const cabecalho = h('div', { class: 'casa-mes' },
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Fatura anterior', disabled: fatura <= primeira, onclick: () => irPara(somarMeses(fatura, -1)) }, '‹'),
    h('h1', {}, `Fatura de ${nomeDoMes(fatura)}`),
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Próxima fatura', disabled: fatura >= somarMeses(aberta, 12), onclick: () => irPara(somarMeses(fatura, 1)) }, '›'));
  const sub = h('p', { class: 'suave cartao-sub' },
    `Compras de ${dataCurta(periodo.de)} a ${dataCurta(periodo.ate)} · vence ${dataComAno(periodo.vence)}`);
  const voltar = fatura !== aberta
    && h('button', { type: 'button', class: 'botao-link casa-voltar', onclick: () => irPara(aberta) }, 'Voltar para a fatura aberta');

  const anotar = h('div', { class: 'botoes' }, botao('+ Anotar compra', () => abrir('anotar')));

  // ---------- total ----------
  const temItens = f.compras.length + f.fixas.length > 0;
  const situacao = situacaoDaFatura({ hoje, periodo, conferida: f.conferida });
  const selo = {
    conferida: h('span', { class: 'selo ok' }, 'Conferida ✓'),
    fechada: temItens && h('span', { class: 'selo' }, 'Fechou: confira com o banco'),
    aberta: h('span', { class: 'suave pequeno' }, `Aberta até ${dataCurta(periodo.ate)}`),
    futura: h('span', { class: 'suave pequeno' }, `Começa em ${dataCurta(periodo.de)}`),
  }[situacao];
  const total = cartao(
    h('div', { class: 'rotulo' }, `Cartão de ${dona?.nome ?? '—'}`),
    h('div', { class: 'valor-grande' }, formatarBRL(f.total)),
    h('div', { style: 'margin-top:4px' }, selo));

  // ---------- de quem é ----------
  const linhaPessoa = (p) => {
    const ehCasa = p.para === 'casa';
    const detalhe = ehCasa ? `Entra nas contas da casa de ${nomeDoMes(fatura)}` : p.para === cfg.donaId ? null : 'A devolver';
    const conteudo = [
      h('span', { class: 'texto' }, h('b', {}, p.nome), detalhe && h('small', {}, detalhe)),
      h('span', { class: 'quanto' }, formatarBRL(p.valor)),
    ];
    return ehCasa
      ? h('button', { type: 'button', class: 'casa-linha', onclick: () => ctx.navegar(`#/casa?mes=${fatura}`) }, ...conteudo, h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'))
      : h('div', { class: 'casa-linha estatica' }, ...conteudo);
  };
  const deQuem = f.porPessoa.length > 0 && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'De quem é'),
    h('div', {}, ...f.porPessoa.map(linhaPessoa)));

  // ---------- compras ----------
  const linhaItem = ({ titulo, detalhe, valor, aoTocar }) => h('button', { type: 'button', class: 'casa-linha', onclick: aoTocar },
    h('span', { class: 'texto' }, h('b', {}, titulo), h('small', {}, detalhe)),
    h('span', { class: 'quanto' }, formatarBRL(valor)),
    h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));
  const compras = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, f.compras.length ? `Compras (${f.compras.length})` : 'Compras'),
    f.compras.length
      ? h('div', {}, ...f.compras.map((c) => linhaItem({
        titulo: c.nome,
        detalhe: [c.data && dataCurta(c.data), nomeDoPara(casa, c.para), c.parcela && `${c.parcela.n} de ${c.parcela.de}`].filter(Boolean).join(' · '),
        valor: c.valor,
        aoTocar: () => abrir(`compra-${c.id}`),
      })))
      : h('p', { class: 'suave', style: 'padding:0 16px 12px' }, 'Nenhuma compra anotada nesta fatura.'));
  const fixas = f.fixas.length > 0 && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Todo mês'),
    h('div', {}, ...f.fixas.map((x) => linhaItem({
      titulo: x.nome, detalhe: nomeDoPara(casa, x.para), valor: x.valor, aoTocar: () => abrir(`fixa-${x.id}`),
    }))));

  const conferir = temItens && !f.conferida && h('div', { class: 'cartao-conferir' },
    h('div', { class: 'botoes' }, botao('Pronto, fatura conferida', async (e) => {
      e.currentTarget.disabled = true;
      await ctx.salvarCasa((c) => conferirFatura(c, { mes: fatura, contaId: cfg.contaId }));
      ctx.aviso('Fatura conferida.', 'ok', 2500);
      ctx.rerender();
    }, { secundario: true })),
    h('p', { class: 'nota' }, 'Use quando a fatura fechar e o total bater com o app do banco.'));

  container.replaceChildren(...[trocaDeCartao(casa, cfg.id), cabecalho, sub, voltar, anotar, total, deQuem, compras, fixas, conferir, outroCartao()].filter(Boolean));

  // ---------- folhas ----------
  const titulo = (texto) => h('h2', { 'data-sem-recarregar': '' }, texto); // digitado ainda não salvo: a atualização automática espera
  const textoDaFatura = (fat) => `Vai para a fatura de ${nomeDaFatura(fat, hoje)} (vence ${dataCurta(periodoDaFatura(fat, cfg).vence)}).`;

  // Para quem: chips com as pessoas e "+ Outra pessoa", que abre um campo para o nome ali mesmo.
  function escolhaPara(inicial, aoEscolher) {
    let opcoes = opcoesPara(casa, cfg.id);
    let atual = inicial;
    const caixa = h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Para quem'));
    const area = h('div');
    const outra = { nome: '' };
    const desenharChips = () => {
      const lista = chips([...opcoes, { id: '+outra', nome: '+ Outra pessoa' }], atual, (id) => {
        if (id === '+outra') { desenharNova(); return; }
        atual = id;
        aoEscolher(id);
      }, 'Para quem');
      area.replaceChildren(lista);
      caixa.marcar = (id) => { atual = id; lista.marcar(id); };
    };
    const desenharNova = () => {
      const campo = h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Nome (ex.: Mãe)', 'aria-label': 'Nome da outra pessoa', oninput: (e) => { outra.nome = e.target.value.trim(); } });
      const adicionar = botao('Adicionar', async () => {
        if (!outra.nome) { ctx.aviso('Escreva o nome.', 'atencao', 3000); return; }
        adicionar.disabled = true;
        let novoId = null;
        await ctx.salvarCasa((c) => { const r = adicionarPessoaDoCartao(c, { nome: outra.nome }); novoId = r.id; return r.casa; });
        if (!opcoes.some((o) => o.id === novoId)) opcoes = [...opcoes, { id: novoId, nome: outra.nome }];
        atual = novoId;
        aoEscolher(novoId);
        desenharChips();
      });
      area.replaceChildren(h('div', { class: 'cartao-outra' }, campo, adicionar, botao('Cancelar', desenharChips, { secundario: true })));
      setTimeout(() => campo.focus(), 30);
    };
    desenharChips();
    caixa.append(area);
    return caixa;
  }

  function folhaAnotar(folha) {
    const sugestoes = nomesUsados(casa, cfg.id);
    const nova = { nome: '', valor: null, data: ultimaData ?? hoje, para: null, paraNaMao: false, forma: 'vista', vezes: 2 };
    const faturaTexto = h('p', { class: 'suave pequeno cartao-vai' });
    const mostrarFatura = () => { faturaTexto.textContent = textoDaFatura(faturaDaCompra(nova.data, cfg)); };
    mostrarFatura();

    const para = escolhaPara(null, (id) => { nova.para = id; nova.paraNaMao = true; });
    const caixaSugestoes = h('div', { class: 'cartao-sugestoes', role: 'group', 'aria-label': 'Sugestões' });
    const mudarNome = (v) => {
      nova.nome = v.trim();
      const sugerido = paraSugerido(sugestoes, nova.nome);
      if (!nova.paraNaMao && sugerido && opcoesPara(casa, cfg.id).some((o) => o.id === sugerido)) { nova.para = sugerido; para.marcar(sugerido); }
      caixaSugestoes.replaceChildren(...sugestoesDoNome(sugestoes, v).map((nome) => h('button', {
        type: 'button', class: 'chip pequeno',
        // Depois de escolher, o próximo é o valor: o teclado de números já abre.
        onclick: () => { nomeCampo.input.value = nome; mudarNome(nome); valorCampo.input.focus(); },
      }, nome)));
    };
    const nomeCampo = campoTexto({ rotulo: 'O que foi', placeholder: 'Ex.: mercado, farmácia, presente', aoMudar: mudarNome });
    nomeCampo.input.classList.add('cartao-nome');
    const blocoDoNome = h('div', { class: 'campo' }, nomeCampo, caixaSugestoes); // as sugestões fora do <label>
    const totalTexto = h('span', { class: 'campo-dica' });
    const mostrarTotal = () => {
      totalTexto.textContent = nova.valor ? `Total: ${formatarBRL(nova.valor * nova.vezes)} em ${nova.vezes} vezes.` : '';
    };
    const valorCampo = campoMoeda({ rotulo: 'Valor', dica: 'Parcelado? O valor de cada parcela.', aoMudar: (v) => { nova.valor = v; mostrarTotal(); } });
    const dataCampo = h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Data da compra'),
      h('input', {
        class: 'entrada', type: 'date', value: nova.data,
        onchange: (e) => { if (e.target.value) { nova.data = e.target.value; mostrarFatura(); } },
      }),
      faturaTexto);

    const vezesTexto = h('output', { class: 'casa-vezes' });
    const mostrarVezes = () => { vezesTexto.textContent = `${nova.vezes} vezes`; mostrarTotal(); };
    mostrarVezes();
    const mudarVezes = (d) => { nova.vezes = Math.min(48, Math.max(2, nova.vezes + d)); mostrarVezes(); };
    const parcelas = h('div', { class: 'campo' },
      h('div', { class: 'casa-passo' },
        h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Menos parcelas', onclick: () => mudarVezes(-1) }, '−'),
        vezesTexto,
        h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Mais parcelas', onclick: () => mudarVezes(1) }, '+')),
      totalTexto,
      h('span', { class: 'campo-dica' }, 'As próximas parcelas aparecem sozinhas nas faturas seguintes.'));
    const todoMes = h('span', { class: 'campo-dica' }, 'Assinaturas e contas fixas: aparece sozinha em toda fatura, até você parar.');
    const detalheForma = h('div');
    const mostrarForma = () => detalheForma.replaceChildren(...(nova.forma === 'parcelado' ? [parcelas] : nova.forma === 'todoMes' ? [todoMes] : []));
    mostrarForma();
    const forma = h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Como foi'),
      chips([{ id: 'vista', nome: 'À vista' }, { id: 'parcelado', nome: 'Parcelado' }, { id: 'todoMes', nome: 'Todo mês' }], nova.forma,
        (id) => { nova.forma = id; mostrarForma(); }, 'Como foi'),
      detalheForma);

    const anotarBotao = botao('Anotar compra', async () => {
      if (!nova.nome) { ctx.aviso('Escreva o que foi comprado.', 'atencao', 3000); return; }
      if (nova.valor == null || nova.valor <= 0) { ctx.aviso('Digite o valor da compra.', 'atencao', 3000); return; }
      if (!nova.para) { ctx.aviso('Escolha para quem é a compra.', 'atencao', 3000); return; }
      anotarBotao.disabled = true;
      const fat = faturaDaCompra(nova.data, cfg);
      await ctx.salvarCasa((c) => anotarCompra(c, {
        cartaoId: cfg.id,
        data: nova.data, nome: nova.nome, valor: nova.valor, para: nova.para,
        vezes: nova.forma === 'parcelado' ? nova.vezes : 1, todoMes: nova.forma === 'todoMes',
      }));
      ultimaData = nova.data;
      ctx.aviso(nova.forma === 'todoMes'
        ? `Anotada: aparece todo mês a partir da fatura de ${nomeDaFatura(fat, hoje)}.`
        : `Anotada na fatura de ${nomeDaFatura(fat, hoje)}.${nova.forma === 'parcelado' ? ` As outras ${nova.vezes - 1} parcelas vão nas seguintes.` : ''}`, 'ok', 3500);
      ctx.rerender(); // a folha volta limpa para a próxima compra, com a mesma data
    });

    return [
      titulo('Anotar compra'),
      blocoDoNome, valorCampo, dataCampo, para, forma,
      h('div', { class: 'botoes' }, anotarBotao, botao('Fechar', fechar, { secundario: true })),
    ];
  }

  function folhaCompra(compra, folha) {
    const editado = { nome: compra.nome, valor: compra.valor, para: compra.para ?? 'casa', data: compra.data ?? null, fatura };
    const ehParcela = ehParcelada(compra);
    const parcela = compra.parcela ?? null;
    const faturaNome = h('output', { class: 'casa-vezes cartao-fatura-nome' });
    const mostrarFatura = () => { faturaNome.textContent = nomeDaFatura(editado.fatura, hoje); };
    mostrarFatura();
    const trocarFatura = (d) => { editado.fatura = somarMeses(editado.fatura, d); mostrarFatura(); };

    const salvar = botao('Salvar', async () => {
      if (!editado.nome.trim()) { ctx.aviso('Escreva o que foi comprado.', 'atencao', 3000); return; }
      if (editado.valor == null || editado.valor <= 0) { ctx.aviso('Digite o valor.', 'atencao', 3000); return; }
      salvar.disabled = true;
      await ctx.salvarCasa((c) => editarCompraDoCartao(c, {
        fatura, compraId: compra.id, nome: editado.nome, valor: editado.valor, para: editado.para,
        data: editado.data ?? undefined, novaFatura: ehParcela ? undefined : editado.fatura,
      }));
      ctx.aviso(!ehParcela && editado.fatura !== fatura ? `Salvo. Foi para a fatura de ${nomeDaFatura(editado.fatura, hoje)}.` : 'Salvo.', 'ok', 3000);
      terminar(folha);
    });
    const apagar = botaoDoisToques('Apagar compra', ehParcela ? 'Toque de novo para apagar (e as próximas parcelas)' : 'Toque de novo para apagar', async () => {
      const seguintes = parcelasSeguintes(casa, { mes: fatura, compraId: compra.id });
      await ctx.salvarCasa((c) => apagarCompra(c, { mes: fatura, compraId: compra.id }));
      ctx.aviso(seguintes ? `Compra apagada, junto com ${plural(seguintes, 'parcela seguinte', 'parcelas seguintes')}.` : 'Compra apagada.', 'ok', 3500);
      terminar(folha);
    });

    return [
      titulo(compra.nome),
      h('p', { class: 'suave pequeno' }, ehParcela
        ? `${parcela ? `Parcela ${parcela.n} de ${parcela.de}` : 'Repete nas faturas seguintes'}${compra.data ? `, comprada em ${dataComAno(compra.data)}` : ''}. O que mudar aqui vale para esta e as próximas.`
        : compra.data ? `Comprada em ${dataComAno(compra.data)}.` : 'Veio da planilha, sem data.'),
      campoTexto({ rotulo: 'O que foi', valor: compra.nome, aoMudar: (v) => { editado.nome = v; } }),
      campoMoeda({ rotulo: ehParcela ? 'Valor da parcela' : 'Valor', valor: compra.valor, aoMudar: (v) => { editado.valor = v; } }),
      !ehParcela && h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Data da compra'),
        h('input', {
          class: 'entrada', type: 'date', value: compra.data ?? '',
          onchange: (e) => {
            if (!e.target.value) return;
            editado.data = e.target.value;
            editado.fatura = faturaDaCompra(editado.data, cfg);
            mostrarFatura();
          },
        })),
      !ehParcela && h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Fatura'),
        h('div', { class: 'casa-passo' },
          h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Fatura anterior', onclick: () => trocarFatura(-1) }, '‹'),
          faturaNome,
          h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Fatura seguinte', onclick: () => trocarFatura(1) }, '›')),
        h('span', { class: 'campo-dica' }, 'O app calcula pela data. Mude só se o banco colocou a compra em outra fatura.')),
      escolhaPara(editado.para, (id) => { editado.para = id; }),
      h('div', { class: 'botoes' }, salvar, botao('Fechar', fechar, { secundario: true })),
      apagar,
    ];
  }

  function folhaFixa(fixa, folha) {
    const editado = { nome: fixa.nome, valor: fixa.valor, para: fixa.para ?? 'casa' };
    const depois = fatura > fixa.desde;
    const salvar = botao('Salvar', async () => {
      if (!editado.nome.trim()) { ctx.aviso('Escreva o nome.', 'atencao', 3000); return; }
      if (editado.valor == null || editado.valor <= 0) { ctx.aviso('Digite o valor.', 'atencao', 3000); return; }
      salvar.disabled = true;
      await ctx.salvarCasa((c) => editarFixa(c, { cartaoId: cfg.id, fixaId: fixa.id, fatura, ...editado }));
      ctx.aviso('Salvo.', 'ok', 2500);
      terminar(folha);
    });
    const parar = botaoDoisToques('Parar de repetir a partir desta fatura', 'Toque de novo para parar', async () => {
      await ctx.salvarCasa((c) => pararFixa(c, { cartaoId: cfg.id, fixaId: fixa.id, fatura }));
      ctx.aviso(`${fixa.nome} não aparece mais a partir da fatura de ${nomeDaFatura(fatura, hoje)}.`, 'ok', 3500);
      terminar(folha);
    });
    return [
      titulo(fixa.nome),
      h('p', { class: 'suave pequeno' }, `Todo mês desde a fatura de ${nomeDaFatura(fixa.desde, hoje)}.${depois ? ' O que mudar aqui vale desta fatura em diante; as anteriores ficam como estão.' : ''}`),
      campoTexto({ rotulo: 'O que é', valor: fixa.nome, aoMudar: (v) => { editado.nome = v; } }),
      campoMoeda({ rotulo: 'Valor por mês', valor: fixa.valor, aoMudar: (v) => { editado.valor = v; } }),
      escolhaPara(editado.para, (id) => { editado.para = id; }),
      h('div', { class: 'botoes' }, salvar, botao('Fechar', fechar, { secundario: true })),
      parar,
    ];
  }

  // ---------- folha aberta (vem do endereço) ----------
  const aberto = folhaAberta(location.hash);
  const [tipo, id] = aberto ? [aberto.split('-')[0], aberto.slice(aberto.indexOf('-') + 1)] : [];
  const compra = tipo === 'compra' ? f.compras.find((c) => c.id === id) : null;
  const fixa = tipo === 'fixa' ? f.fixas.find((x) => x.id === id) : null;
  const conteudo = tipo === 'anotar' ? folhaAnotar(aberto)
    : compra ? folhaCompra(compra, aberto)
      : fixa ? folhaFixa(fixa, aberto) : null;
  if (!conteudo) {
    abertaAqui = false;
    ultimaData = null; // folha fechada (até pelo voltar do celular): a próxima começa com a data de hoje
    esconderFolha();
    return;
  }
  const painel = mostrarFolha({ conteudo: conteudo.filter(Boolean), aoFechar: fechar, rotulo: compra?.nome ?? fixa?.nome ?? 'Anotar compra' });
  const alvo = tipo === 'anotar' ? painel.querySelector('input') : painel;
  setTimeout(() => alvo.focus({ preventScroll: true }), 50);
}
