// Contas da casa · Cartão (desenho 2026-11-19-cartao): o cartão de uma das pessoas, usado para ela, para a casa
// e para outras pessoas. Anotar uma compra pede o que foi, o valor, a data e para quem; o app descobre a fatura
// e mostra quanto é de cada um. A parte da casa entra sozinha nas contas da casa.
// Vários cartões (um por pessoa, ou mais): botões no topo para trocar; o aparelho lembra o último aberto.
// Endereço: #/casa-cartao?cartao=<id>&fatura=…&folha=anotar|compra-<id>|fixa-<id> (o voltar do celular fecha a
// folha), #/casa-cartao?novo=1 para criar outro cartão e &tela=cofrinho para a tela do Cofrinho (casa-cofrinho.js).
import { h, campoMoeda, campoTag, cartao, botao, mostrarFolha, esconderFolha } from './dom.js';
import { formatarBRL } from '../core/formato.js';
import { somarMeses, diffMeses } from '../core/meses.js';
import { apagarCompra, parcelasSeguintes, conferirFatura } from '../core/casa.js';
import { estaPago, marcarPago, marcaDoCartao, tudoPago, estadoDoMes } from '../core/pagamentos.js';
import {
  faturaDaCompra, periodoDaFatura, cartaoPronto, configurarCartao, adicionarPessoaDoCartao, opcoesPara, nomeDoPara,
  anotarCompra, faturaDoCartao, editarCompraDoCartao, editarFixa, pararFixa, apagarFixa, inicioDaFixa, mudarParcelas, parcelasDaCompra, mudarDataDaParcelada, nomesUsados, primeiraFatura,
  acharCartao, adicionarCartao, rotuloDoCartao, marcarJaTenho, podeTerJaTenho, cofrinhoDoCartao,
} from '../core/cartao.js';
import { botaoDoCofrinho, conteudoDoCofrinho } from './casa-cofrinho.js';
import { folhaAberta, parametroDoHash, depoisDeSalvar, resolverRota } from './rotas.js';
import { nomeDoMes } from './casa.js';
import { travaDoMes } from './fechado.js';
import { cartoesVisiveis } from '../core/perfis.js';
import { etiquetasDosNomes, juntasDaCasa, semAcento, tagsDoNome } from '../core/tags.js';
import { graficoDasEtiquetas } from './casa-etiquetas.js';
import { categoriaDe } from '../core/categorias.js';
import { icone, iconeCategoria } from './icones.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// A dona de um cartão: uma pessoa da casa ou um perfil (perfis novos têm cartão, mas não dividem as contas).
const quemE = (casa, id) => casa.pessoas.find((p) => p.id === id) ?? (casa.perfis ?? []).find((p) => p.id === id) ?? null;

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

export function paraSugerido(sugestoes, nome) {
  const chave = semAcento(nome);
  if (!chave) return null;
  return sugestoes.find((s) => semAcento(s.nome) === chave)?.para ?? null;
}

// "Já tenho" (desenho 2026-11-20-ja-tenho): em "De quem é", o que ainda falta de cada pessoa.
export const textoDaFalta = (falta) => (falta <= 0 ? 'Já tenho tudo ✓' : `Falta ${formatarBRL(falta)}`);

// A dica embaixo do interruptor: a marca vale só para o que está sendo anotado ou aberto.
export function dicaDoJaTenho({ forma, nomeDaFatura = '', parcela = null }) {
  if (forma === 'parcelado') return 'Vale só para a 1ª parcela (a desta fatura).';
  if (forma === 'todoMes' || forma === 'fixa') return `Vale só para a fatura de ${nomeDaFatura}.`;
  if (forma === 'parcela') return parcela ? `Vale só para esta parcela (${parcela.n} de ${parcela.de}).` : 'Vale só para esta parcela.';
  return 'Já guardou no cofrinho, ou a pessoa já te pagou.';
}

// Depois de salvar o "já tenho" (o envio pode demorar): com uma folha aberta, nada (redesenhar apagaria o digitado);
// sem folha, na tela do cartão ou no Cofrinho, redesenha (a pessoa fechou antes de terminar e a tela ficou velha).
export const depoisDeMarcar = (hash) => (!folhaAberta(hash) && resolverRota(hash, true) === 'casa-cartao' ? 'redesenhar' : 'nada');

// Interruptor "Já tenho o dinheiro". Muda na hora; `aoMudar(novo)` pode salvar (fica desabilitado enquanto isso
// e volta ao estado de antes se der erro). `mudarDica(texto)` troca a dica de fora.
function interruptorJaTenho({ ligado, dica, aoMudar }) {
  let estado = Boolean(ligado);
  const chave = h('button', { type: 'button', class: 'ja-interruptor', role: 'switch', 'aria-checked': String(estado) },
    h('span', { class: 'ja-interruptor-texto' }, 'Já tenho o dinheiro'),
    h('span', { class: 'ja-trilho', 'aria-hidden': 'true' }));
  const textoDica = h('span', { class: 'campo-dica' }, dica);
  const mostrar = () => chave.setAttribute('aria-checked', String(estado));
  chave.addEventListener('click', async () => {
    const antes = estado;
    estado = !estado;
    mostrar();
    chave.disabled = true;
    try {
      await aoMudar(estado);
    } catch (erro) {
      estado = antes;
      mostrar();
      console.warn('Não deu para salvar o "já tenho"', erro);
    } finally {
      chave.disabled = false;
    }
  });
  const caixa = h('div', { class: 'campo', 'data-sem-recarregar': '' }, chave, textoDica);
  caixa.mudarDica = (texto) => { textoDica.textContent = texto; };
  return caixa;
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
export function formularioDoCartao(ctx, { cartaoId = null, aoSalvar, aoCancelar = null, textoDoBotao = 'Salvar', donaFixa = false, donaPadrao = null }) {
  const { casa } = ctx;
  const atual = cartaoId ? acharCartao(casa, cartaoId) : null;
  const escolha = { donaId: atual?.donaId ?? donaPadrao, viraNoDia: atual?.viraNoDia ?? null, venceNoDia: atual?.venceNoDia ?? null, nome: '' };
  const cartoes = casa.cartoes ?? [];
  const ligadas = new Set(cartoes.map((c) => c.contaId));
  const livres = casa.contas.filter((c) => c.compraPorCompra && !c.arquivada && !ligadas.has(c.id));
  // O mesmo critério de adicionarCartao: o primeiro cartão fica com a conta compra por compra que já existe.
  const contaLigada = atual ? casa.contas.find((c) => c.id === atual.contaId) : (!cartoes.length && livres.length === 1 ? livres[0] : null);
  const nomeCampo = !contaLigada && campoTexto({
    rotulo: 'Nome do cartão', placeholder: 'Ex.: Cartão Leo', aoMudar: (v) => { escolha.nome = v.trim(); },
  });
  const sugerirNome = () => {
    const dona = quemE(casa, escolha.donaId);
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
    h('div', { class: 'botoes' }, aoCancelar && botao('Cancelar', aoCancelar, { secundario: true }), salvar));
}

// A folha foi aberta por um toque nesta sessão? Então fechar = voltar no histórico.
let abertaAqui = false;
// O mesmo para a tela do Cofrinho: "Voltar para a fatura" = voltar no histórico.
let cofrinhoAbertoAqui = false;

export const telaDoCartao = (hash) => (parametroDoHash(hash, 'tela') === 'cofrinho' ? 'cofrinho' : 'fatura');
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
// A ordem da lista de compras de uma pessoa: a última que cada perfil deixou neste aparelho (cada um tem a sua: um
// gosta das mais novas primeiro, o outro das mais antigas). Sem nada guardado: mais novas primeiro.
export const chaveDaOrdem = (perfilId) => `projetoR.ordemCompras${perfilId ? `.${perfilId}` : ''}`;
const lerOrdem = (perfilId) => { try { return localStorage.getItem(chaveDaOrdem(perfilId)) !== 'antigas'; } catch { return true; } };
// Mais novas ou mais antigas primeiro; sem data (veio da planilha) fica sempre no fim.
const compararPorData = (maisNovas) => (a, b) => {
  if (!a.data || !b.data) return !a.data && !b.data ? 0 : !a.data ? 1 : -1;
  return maisNovas ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data);
};
// Grupos de "Compras" abertos (a lista começa reduzida; fica aberto o que a pessoa abriu, até fechar o app).
const gruposAbertos = new Set();
const gravarOrdem = (perfilId, maisNovas) => { try { localStorage.setItem(chaveDaOrdem(perfilId), maisNovas ? 'novas' : 'antigas'); } catch { /* sem armazenamento: só não lembra */ } };

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
  const visto = ctx.perfil?.visto ?? null;
  // Com perfis, cada um vê só os próprios cartões e cria cartão para si.
  const cartoes = cartoesVisiveis(casa, visto);
  const casaVisivel = { ...casa, cartoes };
  if (!cartoes.length || parametroDoHash(location.hash, 'novo')) {
    esconderFolha();
    const primeiro = !cartoes.length;
    container.replaceChildren(...[
      h('h1', {}, primeiro ? 'Cartão' : 'Novo cartão'),
      cartao(
        primeiro && h('p', {}, 'Anote cada compra do cartão com a data e para quem é. O app descobre em qual fatura ela cai, mostra quanto é de cada pessoa e leva a parte da casa para as contas da casa.'),
        h('p', { class: 'suave' }, primeiro ? 'Antes, conte algumas coisas sobre o cartão:' : 'Cada um anota as compras no seu cartão. Conte sobre este:'),
        formularioDoCartao(ctx, {
          donaPadrao: visto?.id ?? null, donaFixa: Boolean(visto),
          textoDoBotao: primeiro ? 'Começar a usar' : 'Criar cartão',
          aoSalvar: (id) => location.replace(`#/casa-cartao?cartao=${id}`),
          aoCancelar: primeiro ? null : () => location.replace('#/casa-cartao'),
        })),
    ].filter(Boolean));
    return;
  }
  const atual = acharCartao(casa, cartaoDaTela(location.hash, casaVisivel, lerLembrado()));
  lembrar(atual.id);
  if (!cartaoPronto(atual)) {
    // Cartão que veio da planilha (ou criado no outro celular) sem os dias: completa aqui.
    esconderFolha();
    // Com dona: só os dias; quem não é a dona cria o próprio cartão (o botão vem antes do formulário).
    const dona = quemE(casa, atual.donaId);
    container.replaceChildren(...[
      trocaDeCartao(casaVisivel, atual.id),
      h('h1', {}, dona ? `Cartão de ${dona.nome}` : 'Cartão'),
      dona && !visto && h('div', { class: 'botoes' }, botao(`Não sou ${dona.nome}: criar o meu cartão`, () => { location.hash = '#/casa-cartao?novo=1'; }, { secundario: true })),
      cartao(
        h('p', {}, dona
          ? `Falta pouco, ${dona.nome}: escolha os dois dias do seu cartão. Estão no app do banco.`
          : 'Falta pouco: conte de quem é este cartão e os dois dias dele. Estão no app do banco.'),
        formularioDoCartao(ctx, { cartaoId: atual.id, donaFixa: Boolean(dona), textoDoBotao: 'Começar a usar', aoSalvar: () => ctx.rerender() })),
      !dona && outroCartao(),
    ].filter(Boolean));
    return;
  }
  desenharFatura(container, ctx, atual, casaVisivel);
}

function desenharFatura(container, ctx, cfg, casaVisivel) {
  const { casa, hoje } = ctx;
  const aberta = faturaDaCompra(hoje, cfg);
  const fatura = faturaDaTela(location.hash, aberta);
  const f = faturaDoCartao(casa, cfg.id, fatura);
  const periodo = periodoDaFatura(fatura, cfg);
  const dona = quemE(casa, cfg.donaId);
  const nome = nomeDaFatura(fatura, hoje);
  // Mês travado (meses passados; do atual em diante, com tudo pago): a fatura só se lê (desenho 2026-11-21-meses-travados).
  const { travado, cadeado } = travaDoMes({ ctx, mes: fatura });

  // Na tela do Cofrinho, o endereço leva `&tela=cofrinho` (abrir e fechar uma folha não sai dela).
  const naTela = telaDoCartao(location.hash);
  if (naTela === 'fatura') cofrinhoAbertoAqui = false;
  const endereco = (extra = '') => `#/casa-cartao?cartao=${cfg.id}&fatura=${fatura}${naTela === 'cofrinho' ? '&tela=cofrinho' : ''}${extra}`;
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
  // Com mais de um cartão, o cabeçalho de cada mês mostra a soma das faturas de todos (os que este perfil vê).
  const cartoesDaSoma = casaVisivel.cartoes ?? [];
  const somaDosCartoes = cartoesDaSoma.length > 1
    ? Math.round(cartoesDaSoma.reduce((t, k) => t + faturaDoCartao(casa, k.id, fatura).total, 0) * 100) / 100 : null;
  const somaNoCabecalho = somaDosCartoes != null
    && h('p', { class: 'suave cartao-sub', 'data-soma-cartoes': '' }, `Soma dos ${cartoesDaSoma.length} cartões em ${nomeDoMes(fatura)}: `, h('b', {}, formatarBRL(somaDosCartoes)));
  const voltar = fatura !== aberta
    && h('button', { type: 'button', class: 'botao-link casa-voltar', onclick: () => irPara(aberta) }, 'Voltar para a fatura aberta');

  const anotar = !travado && h('div', { class: 'botoes' }, botao('+ Anotar compra', () => abrir('anotar')));

  // ---------- total ----------
  const temItens = f.compras.length + f.fixas.length > 0;
  const situacao = situacaoDaFatura({ hoje, periodo, conferida: f.conferida });
  const selo = {
    conferida: h('span', { class: 'selo ok' }, 'Conferida ✓'),
    fechada: temItens && h('span', { class: 'selo' }, 'Fechou: confira com o banco'),
    aberta: h('span', { class: 'suave pequeno' }, `Aberta até ${dataCurta(periodo.ate)}`),
    futura: h('span', { class: 'suave pequeno' }, `Começa em ${dataCurta(periodo.de)}`),
  }[situacao];
  const pago = estaPago(casa, fatura, marcaDoCartao(cfg.id));
  const total = cartao(
    cadeado,
    h('div', { class: 'rotulo' }, `Cartão de ${dona?.nome ?? '—'}`),
    h('div', { class: 'valor-grande' }, formatarBRL(f.total)),
    h('div', { style: 'margin-top:4px' }, selo, pago && ' ', pago && h('span', { class: 'selo ok' }, 'Paga ✓')));
  total.classList.add('heroi'); // o número principal da tela: cartão em degradê (facelift)

  // ---------- de quem é ----------
  // A Casa leva às contas da casa; as outras pessoas (e a dona) mostram o total, quanto já tem e quanto falta.
  const linhaPessoa = (p) => {
    if (p.para === 'casa') {
      return h('button', { type: 'button', class: 'casa-linha', onclick: () => abrir('pessoa-casa') },
        h('span', { class: 'texto' }, h('b', {}, p.nome), h('small', {}, `Entra nas contas da casa de ${nomeDoMes(fatura)}`)),
        h('span', { class: 'quanto' }, formatarBRL(p.valor)),
        h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));
    }
    const fracao = p.valor > 0 ? Math.min(1, Math.max(0, p.jaTenho / p.valor)) : 0;
    return h('button', { type: 'button', class: 'ja-pessoa tocavel', onclick: () => abrir(`pessoa-${p.para}`) },
      h('div', { class: 'ja-pessoa-cima' }, h('b', {}, p.nome), h('span', { class: 'ja-pessoa-valor' }, h('b', {}, formatarBRL(p.valor)), h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'))),
      h('div', { class: 'ja-pessoa-barra', 'aria-hidden': 'true' }, h('i', { style: `width:${Math.round(fracao * 100)}%` })),
      h('div', { class: 'ja-pessoa-baixo' },
        h('span', {}, `Já tenho ${formatarBRL(p.jaTenho)}`),
        h('span', { class: p.falta <= 0 ? 'ja-tudo' : 'ja-falta' }, textoDaFalta(p.falta))));
  };
  const deQuem = f.porPessoa.length > 0 && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'De quem é'),
    h('div', {}, ...f.porPessoa.map(linhaPessoa)));

  // ---------- compras ----------
  // O selo colorido conforme o nome (mercado, farmácia, assinatura...): só enfeite, nada de conta depende dele.
  const linhaItem = ({ titulo, detalhe, valor, jaTenho, aoTocar, padrao = 'sacola' }) => h('button', { type: 'button', class: 'casa-linha', onclick: aoTocar },
    iconeCategoria(categoriaDe(titulo), padrao),
    h('span', { class: 'texto' }, h('b', {}, titulo), h('small', {}, detalhe, jaTenho && h('span', { class: 'ja-etiqueta' }, 'Já tenho'))),
    h('span', { class: 'quanto' }, formatarBRL(valor)),
    h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));
  const perfilDaOrdem = ctx.perfil?.visto?.id ?? null;
  const ordemDasCompras = lerOrdem(perfilDaOrdem); // a mesma ordem da lista de cada pessoa (guardada por perfil)
  const textoDaOrdem = ordemDasCompras ? 'Mais novas primeiro (tocar: mais antigas primeiro)' : 'Mais antigas primeiro (tocar: mais novas primeiro)';
  const botaoDeOrdem = h('button', {
    type: 'button', class: 'botao-icone pequeno', 'aria-label': textoDaOrdem, title: textoDaOrdem,
    onclick: () => { gravarOrdem(perfilDaOrdem, !ordemDasCompras); ctx.rerender(); },
  }, icone(ordemDasCompras ? 'maisNovas' : 'maisAntigas'));
  const compras = h('section', { class: 'cartao casa-lista' },
    h('div', { class: 'titulo-com-ordem' },
      h('h2', {}, f.compras.length ? `Compras (${f.compras.length})` : 'Compras'),
      f.compras.length > 1 && botaoDeOrdem),
    f.compras.length
      // Agrupadas por "De quem é" (na ordem dessa lista), reduzidas: tocar no grupo abre as compras dele.
      ? h('div', {}, ...f.porPessoa.flatMap((p) => {
        const deles = f.compras.filter((c) => c.para === p.para).sort(compararPorData(ordemDasCompras));
        if (!deles.length) return [];
        const aberto = gruposAbertos.has(p.para);
        const corpo = h('div', { class: 'grupo-corpo', inert: !aberto }, h('div', { class: 'grupo-dentro' }, ...deles.map((c) => linhaItem({
            titulo: c.nome,
            detalhe: [c.data && dataCurta(c.data), c.parcela && `${c.parcela.n} de ${c.parcela.de}`].filter(Boolean).join(' · '),
            valor: c.valor,
            jaTenho: c.jaTenho,
            aoTocar: () => abrir(`compra-${c.id}`),
          }))));
        const topo = h('button', {
          type: 'button', class: 'grupo-titulo', 'aria-expanded': String(aberto),
          onclick: () => {
            const abre = !gruposAbertos.has(p.para);
            if (abre) gruposAbertos.add(p.para); else gruposAbertos.delete(p.para);
            grupo.classList.toggle('aberto', abre);
            topo.setAttribute('aria-expanded', String(abre));
            corpo.inert = !abre;
          },
        }, h('span', { class: 'grupo-nome' }, p.nome, h('small', {}, plural(deles.length, 'compra', 'compras'))),
        h('span', { class: 'grupo-valor' }, formatarBRL(deles.reduce((s, c) => s + c.valor, 0)), h('span', { class: 'grupo-seta', 'aria-hidden': 'true' }, icone('chevron'))));
        const grupo = h('div', { class: `grupo${aberto ? ' aberto' : ''}` }, topo, corpo);
        return [grupo];
      }))
      : h('p', { class: 'suave', style: 'padding:0 16px 12px' }, 'Nenhuma compra anotada nesta fatura.'));
  const fixas = f.fixas.length > 0 && h('section', { class: 'cartao casa-lista' },
    // A soma das assinaturas e contas fixas desta fatura, ao lado do título: quanto vai todo mês de cara.
    h('h2', { class: 'titulo-com-soma' }, 'Todo mês', h('span', { class: 'soma-fixas', title: 'Soma de tudo que se repete todo mês neste cartão' }, formatarBRL(Math.round(f.fixas.reduce((t, x) => t + x.valor, 0) * 100) / 100))),
    h('div', {}, ...f.fixas.map((x) => linhaItem({
      titulo: x.nome, detalhe: nomeDoPara(casa, x.para), valor: x.valor, jaTenho: x.jaTenho, padrao: 'repetir', aoTocar: () => abrir(`fixa-${x.id}`),
    }))));

  const conferir = temItens && !f.conferida && !travado && h('div', { class: 'cartao-conferir' },
    h('div', { class: 'botoes' }, botao('Pronto, fatura conferida', async (e) => {
      e.currentTarget.disabled = true;
      await ctx.salvarCasa((c) => conferirFatura(c, { mes: fatura, contaId: cfg.contaId }));
      ctx.aviso('Fatura conferida.', 'ok', 2500);
      ctx.rerender();
    }, { secundario: true })),
    h('p', { class: 'nota' }, 'Use quando a fatura fechar e o total bater com o app do banco.'));

  // ---------- pago ----------
  // "Já paguei" (desenho 2026-11-21-ja-paguei): a marca é da casa (vale para os dois) e aparece como "Pago" no Balanço.
  const botaoPago = temItens && !travado && h('div', { class: 'cartao-conferir' },
    h('div', { class: 'botoes' }, botao(pago ? 'Fatura paga ✓ (desfazer)' : 'Pago', async (e) => {
      e.currentTarget.disabled = true;
      const nova = marcarPago(casa, { mes: fatura, marca: marcaDoCartao(cfg.id), pago: !pago });
      await ctx.salvarCasa((c) => marcarPago(c, { mes: fatura, marca: marcaDoCartao(cfg.id), pago: !pago }));
      const tudo = !pago && cfg.donaId && tudoPago(nova, fatura, cfg.donaId);
      ctx.aviso(pago ? 'Marca de pago tirada.' : tudo ? `Tudo pago em ${nomeDoMes(fatura)}!` : 'Fatura marcada como paga.', 'ok', 3000);
      ctx.rerender();
    }, { secundario: pago })),
    !pago && h('p', { class: 'nota' }, 'Use depois de pagar a fatura: o Balanço mostra como paga.'));

  // ---------- cofrinho ----------
  const cofrinho = cofrinhoDoCartao(casa, cfg.id, hoje);
  const botaoCofrinho = cofrinho && botaoDoCofrinho({
    cofrinho,
    aoAbrir: () => { cofrinhoAbertoAqui = true; location.hash = `#/casa-cartao?cartao=${cfg.id}&fatura=${fatura}&tela=cofrinho`; },
  });
  const voltarDoCofrinho = () => {
    if (cofrinhoAbertoAqui) {
      cofrinhoAbertoAqui = false;
      history.back();
    } else {
      location.replace(`#/casa-cartao?cartao=${cfg.id}&fatura=${fatura}`);
    }
  };
  // A folha da compra abre por cima do Cofrinho, na fatura dela; fechar volta para o Cofrinho já atualizado.
  const abrirDoCofrinho = (item) => {
    abertaAqui = true;
    location.hash = `#/casa-cartao?cartao=${cfg.id}&fatura=${item.fatura}&tela=cofrinho&folha=${item.tipo === 'fixa' ? 'fixa' : 'compra'}-${item.id}`;
  };

  if (naTela === 'cofrinho' && cofrinho) {
    container.replaceChildren(...conteudoDoCofrinho({
      cofrinho, nomeDaFatura: (m) => nomeDaFatura(m, hoje), aoVoltar: voltarDoCofrinho, aoAbrirItem: abrirDoCofrinho,
    }));
  } else {
    container.replaceChildren(...[trocaDeCartao(casaVisivel, cfg.id), cabecalho, somaNoCabecalho, sub, voltar, anotar, total, deQuem, compras, fixas, botaoCofrinho, conferir, botaoPago, outroCartao(),
      // O fim da tela: as 5 etiquetas em que este cartão mais gastou nos últimos 12 meses (até a fatura aberta).
      graficoDasEtiquetas({ casa, cartaoId: cfg.id, ate: aberta, juntas: juntasDaCasa(casa), dona: dona?.nome ?? null })].filter(Boolean));
  }

  // ---------- folhas ----------
  const titulo = (texto) => h('h2', { 'data-sem-recarregar': '' }, texto); // digitado ainda não salvo: a atualização automática espera
  const textoDaFatura = (fat) => `Vai para a fatura de ${nomeDaFatura(fat, hoje)} (vence ${dataCurta(periodoDaFatura(fat, cfg).vence)}).`;

  // Para quem: chips com as pessoas e "+ Outra pessoa", que abre um campo para o nome ali mesmo.
  function escolhaPara(inicial, aoEscolher) {
    let opcoes = opcoesPara(casa, cfg.id);
    let atual = inicial;
    const caixa = h('div', { class: 'campo linha-unica' }, h('span', { class: 'campo-rotulo' }, 'Para quem'));
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
        await ctx.salvarCasa((c) => { const r = adicionarPessoaDoCartao(c, { nome: outra.nome, donaId: cfg.donaId }); novoId = r.id; return r.casa; });
        if (!opcoes.some((o) => o.id === novoId)) opcoes = [...opcoes, { id: novoId, nome: outra.nome }];
        atual = novoId;
        aoEscolher(novoId);
        desenharChips();
      });
      area.replaceChildren(h('div', { class: 'cartao-outra' }, campo, botao('Cancelar', desenharChips, { secundario: true }), adicionar));
      setTimeout(() => campo.focus(), 30);
    };
    desenharChips();
    caixa.append(area);
    return caixa;
  }

  function folhaAnotar(folha) {
    const sugestoes = nomesUsados(casaVisivel, cfg.id); // só dos cartões que este perfil vê
    const nova = { nome: '', valor: null, data: ultimaData ?? hoje, para: null, paraNaMao: false, forma: 'vista', vezes: 2, jaTenho: false };
    // "Já tenho" só com uma pessoa que não é a Casa (escolher a Casa desliga); a dica acompanha a forma e a fatura.
    const caixaJa = h('div', { style: 'display:none' });
    let interruptorJa = null;
    const mostrarJa = () => {
      if (!nova.para || nova.para === 'casa') {
        nova.jaTenho = false;
        interruptorJa = null;
        caixaJa.replaceChildren();
        caixaJa.style.display = 'none';
        return;
      }
      const dica = dicaDoJaTenho({ forma: nova.forma, nomeDaFatura: nomeDaFatura(faturaDaCompra(nova.data, cfg), hoje) });
      if (interruptorJa) { interruptorJa.mudarDica(dica); return; }
      interruptorJa = interruptorJaTenho({ ligado: nova.jaTenho, dica, aoMudar: (v) => { nova.jaTenho = v; } });
      caixaJa.replaceChildren(interruptorJa);
      caixaJa.style.display = '';
    };
    const faturaTexto = h('p', { class: 'suave pequeno cartao-vai' });
    const mostrarFatura = () => { faturaTexto.textContent = textoDaFatura(faturaDaCompra(nova.data, cfg)); mostrarJa(); };
    mostrarFatura();

    const para = escolhaPara(null, (id) => { nova.para = id; nova.paraNaMao = true; mostrarJa(); });
    // O "O que foi" é uma etiqueta (desenho 2026-11-21-tags): as que já existem viram balões; sem igual, dá para criar.
    // `nova.nome` já chega na grafia da etiqueta que existe, então "coliseu" e "Coliseu" somam juntas.
    const mudarNome = (v) => {
      nova.nome = v;
      const sugerido = paraSugerido(sugestoes, nova.nome);
      if (!nova.paraNaMao && sugerido && opcoesPara(casa, cfg.id).some((o) => o.id === sugerido)) { nova.para = sugerido; para.marcar(sugerido); mostrarJa(); }
    };
    const nomeCampo = campoTag({
      rotulo: 'O que foi', placeholder: 'Ex.: mercado, farmácia, presente', tags: etiquetasDosNomes(sugestoes.map((s) => s.nome), juntasDaCasa(casa)), juntas: juntasDaCasa(casa),
      aoMudar: mudarNome,
    });
    const blocoDoNome = nomeCampo;
    const totalTexto = h('span', { class: 'campo-dica' });
    const mostrarTotal = () => {
      totalTexto.textContent = nova.valor ? `Total: ${formatarBRL(nova.valor * nova.vezes)} em ${nova.vezes} vezes.` : '';
    };
    const valorCampo = campoMoeda({ rotulo: 'Valor', aoMudar: (v) => { nova.valor = v; mostrarTotal(); } });
    const dataCampo = h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Data da compra'),
      h('input', {
        class: 'entrada', type: 'date', value: nova.data,
        onchange: (e) => { if (e.target.value) { nova.data = e.target.value; mostrarFatura(); } },
      }));
    // Valor e data lado a lado, com a fatura embaixo: a folha cabe na tela sem rolar (desenho 2026-11-21-anotar-sem-rolar).
    const valorEData = h('div', { class: 'campos-lado' }, valorCampo, dataCampo);

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
      h('span', { class: 'campo-dica' }, 'O valor acima é o de cada parcela. As próximas aparecem sozinhas nas faturas seguintes.'));
    const todoMes = h('span', { class: 'campo-dica' }, 'Assinaturas e contas fixas: aparece sozinha em toda fatura, até você parar.');
    const detalheForma = h('div');
    const mostrarForma = () => detalheForma.replaceChildren(...(nova.forma === 'parcelado' ? [parcelas] : nova.forma === 'todoMes' ? [todoMes] : []));
    mostrarForma();
    const forma = h('div', { class: 'campo linha-unica' }, h('span', { class: 'campo-rotulo' }, 'Como foi'),
      chips([{ id: 'vista', nome: 'À vista' }, { id: 'parcelado', nome: 'Parcelado' }, { id: 'todoMes', nome: 'Todo mês' }], nova.forma,
        (id) => { nova.forma = id; mostrarForma(); mostrarJa(); }, 'Como foi'),
      detalheForma);

    const anotarBotao = botao('Anotar compra', async () => {
      if (!nova.nome) { ctx.aviso('Escreva o que foi comprado.', 'atencao', 3000); return; }
      if (nova.valor == null || nova.valor <= 0) { ctx.aviso('Digite o valor da compra.', 'atencao', 3000); return; }
      if (!nova.para) { ctx.aviso('Escolha para quem é a compra.', 'atencao', 3000); return; }
      anotarBotao.disabled = true;
      const fat = faturaDaCompra(nova.data, cfg);
      if (estadoDoMes(casa, fat, ctx.perfil?.visto?.id ?? null, hoje) !== 'livre') { ctx.aviso(`A fatura de ${nomeDaFatura(fat, hoje)} está travada: escolha uma data de uma fatura aberta.`, 'atencao', 4000); anotarBotao.disabled = false; return; }
      await ctx.salvarCasa((c) => anotarCompra(c, {
        cartaoId: cfg.id,
        data: nova.data, nome: nova.nome, valor: nova.valor, para: nova.para,
        vezes: nova.forma === 'parcelado' ? nova.vezes : 1, todoMes: nova.forma === 'todoMes', jaTenho: nova.jaTenho,
      }));
      ctx.aviso(nova.forma === 'todoMes'
        ? `Anotada: aparece todo mês a partir da fatura de ${nomeDaFatura(fat, hoje)}.`
        : `Anotada na fatura de ${nomeDaFatura(fat, hoje)}.${nova.forma === 'parcelado' ? ` As outras ${nova.vezes - 1} parcelas vão nas seguintes.` : ''}`, 'ok', 3500);
      terminar(folha); // fecha a folha (a fatura aparece atualizada); a próxima compra começa de novo
    });

    return [
      titulo('Anotar compra'),
      blocoDoNome, valorEData, faturaTexto, para, forma, caixaJa,
      // Os botões ficam presos no pé da folha: anotar a próxima compra não pede rolar.
      h('div', { class: 'botoes botoes-fixos' }, botao('Fechar', fechar, { secundario: true }), anotarBotao),
    ];
  }

  // O interruptor das folhas salva só a marca, na hora: a folha continua aberta com o que já foi digitado.
  const salvarMarca = async (alvo, ligar) => {
    await ctx.salvarCasa((c) => marcarJaTenho(c, { cartaoId: cfg.id, fatura, ...alvo, jaTenho: ligar }));
    ctx.aviso(ligar ? 'Marcado: já tenho.' : 'Desmarcado.', 'ok', 2500);
    if (depoisDeMarcar(location.hash) === 'redesenhar') ctx.rerender();
  };
  // Some se a pessoa escolhida na folha passar a ser a Casa (ao salvar, a marca sai).
  const jaTenhoDaFolha = (item, dica, alvo) => {
    if (!podeTerJaTenho(item)) return null;
    const caixa = interruptorJaTenho({ ligado: item.jaTenho, dica: `${dica} Salva na hora.`, aoMudar: (v) => salvarMarca(alvo, v) });
    caixa.paraEscolhido = (id) => { caixa.style.display = id === 'casa' ? 'none' : ''; };
    return caixa;
  };

  // ---------- as compras de uma pessoa nesta fatura (desenho 2026-11-21-compras-de-quem) ----------
  // Tocar num nome em "De quem é" (a Casa também) abre a lista das compras dela nesta fatura, com as de todo mês no fim.
  // Um ícone troca a ordem (mais novas primeiro ↔ mais antigas primeiro); tocar numa compra abre os detalhes dela.
  function folhaDaPessoa(para) {
    const pessoa = f.porPessoa.find((p) => p.para === para);
    if (!pessoa) return null;
    const compras = f.compras.filter((c) => c.para === para);
    const fixas = f.fixas.filter((x) => x.para === para);
    const lista = h('div', { class: 'cartao casa-compras' });
    const perfilId = ctx.perfil?.visto?.id ?? null;
    let ordemMaisNovas = lerOrdem(perfilId);
    const botaoOrdem = h('button', {
      type: 'button', class: 'botao-icone',
      onclick: () => { ordemMaisNovas = !ordemMaisNovas; gravarOrdem(perfilId, ordemMaisNovas); desenharLista(); },
    });
    const linha = (x, detalhe, rota) => h('button', { type: 'button', class: 'casa-compra tocavel', onclick: () => abrir(rota) },
      h('span', { class: 'texto' }, h('span', {}, x.nome), h('small', {}, detalhe, x.jaTenho && h('span', { class: 'ja-etiqueta' }, 'Já tenho'))),
      h('span', { class: 'quanto' }, formatarBRL(x.valor)),
      h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));
    const detalheDaCompra = (c) => [c.data ? dataCurta(c.data) : 'sem data', c.parcela && `${c.parcela.n} de ${c.parcela.de}`].filter(Boolean).join(' · ');
    const desenharLista = () => {
      const texto = ordemMaisNovas ? 'Mais novas primeiro (tocar: mais antigas primeiro)' : 'Mais antigas primeiro (tocar: mais novas primeiro)';
      botaoOrdem.replaceChildren(icone(ordemMaisNovas ? 'maisNovas' : 'maisAntigas'));
      botaoOrdem.setAttribute('aria-label', texto);
      botaoOrdem.title = texto;
      lista.replaceChildren(
        ...[...compras].sort(compararPorData(ordemMaisNovas)).map((c) => linha(c, detalheDaCompra(c), `compra-${c.id}`)),
        ...fixas.map((x) => linha(x, 'todo mês', `fixa-${x.id}`)));
    };
    desenharLista();
    const resumo = para === 'casa'
      ? `${plural(compras.length + fixas.length, 'compra', 'compras')} · entra nas contas da casa de ${nomeDoMes(fatura)}`
      : `${plural(compras.length + fixas.length, 'compra', 'compras')} · já tenho ${formatarBRL(pessoa.jaTenho)} · ${pessoa.falta <= 0 ? 'já tem tudo ✓' : `falta ${formatarBRL(pessoa.falta)}`}`;
    return [
      h('div', { class: 'folha-topo' },
        h('div', {}, h('h2', {}, pessoa.nome), h('p', { class: 'suave pequeno', style: 'margin:2px 0 0' }, `Fatura de ${nome}`)),
        botaoOrdem),
      h('div', { class: 'detalhe-topo' }, h('div', { class: 'valor-grande' }, formatarBRL(pessoa.valor))),
      h('p', { class: 'suave pequeno', style: 'margin:0' }, resumo),
      lista,
      para === 'casa' && h('button', { type: 'button', class: 'botao-link', style: 'align-self:flex-start;padding:4px 0', onclick: () => ctx.navegar(`#/casa?mes=${fatura}`) }, `Ver as contas da casa de ${nomeDoMes(fatura)}`),
      h('div', { class: 'botoes botoes-fixos' }, botao('Fechar', fechar, { secundario: true })),
    ];
  }

  // ---------- detalhes de uma compra / de uma de todo mês (desenho 2026-11-21-detalhes-da-compra) ----------
  // Tocar abre os detalhes, só para ver; "Editar" abre o formulário (salvar ou cancelar volta para cá). Num mês travado,
  // os detalhes abrem sem o "Editar".
  const linhasDeDetalhe = (linhas) => h('div', { class: 'cartao detalhe-lista' },
    ...linhas.filter(Boolean).map(([rotulo, valor]) => h('div', { class: 'detalhe-linha' }, h('span', {}, rotulo), h('b', {}, valor))));
  const etiquetasDe = (nome) => {
    const lista = tagsDoNome(nome, juntasDaCasa(casa));
    return lista.length > 0 && h('div', { class: 'chips detalhe-etiquetas', 'aria-label': 'Etiquetas' }, ...lista.map((t) => h('span', { class: 'chip pequeno tag' }, t)));
  };
  const rodapeDoDetalhe = (editar) => h('div', { class: 'botoes botoes-fixos' },
    botao('Fechar', fechar, { secundario: true }),
    !travado && botao('Editar', editar));

  function folhaDetalheCompra(compra) {
    const parcelas = parcelasDaCompra(casa, { fatura, compraId: compra.id });
    const n = parcelas.find((p) => p.compra.id === compra.id)?.n ?? 1;
    const total = compra.parcela?.de ?? (compra.grupo ? parcelas.at(-1).n : 1);
    const somaDasParcelas = parcelas.reduce((s, p) => s + p.compra.valor, 0);
    const ultimaFatura = somarMeses(parcelas[0].mes, total - parcelas[0].n);
    const ehParcela = total > 1;
    return [
      h('h2', {}, compra.nome),
      h('div', { class: 'detalhe-topo' },
        h('div', { class: 'valor-grande' }, formatarBRL(compra.valor)),
        h('span', { class: 'suave' }, ehParcela ? `por parcela · ${n}ª de ${total}` : 'à vista')),
      etiquetasDe(compra.nome),
      linhasDeDetalhe([
        ['Data da compra', compra.data ? dataComAno(compra.data) : 'sem data (veio da planilha)'],
        ['Fatura', `${nomeDaFatura(fatura, hoje)} · vence ${dataCurta(periodoDaFatura(fatura, cfg).vence)}`],
        ehParcela && ['Parcelas', `${total} de ${formatarBRL(compra.valor)}`],
        ehParcela && ['No total', formatarBRL(somaDasParcelas)],
        ehParcela && ['Última parcela', `fatura de ${nomeDaFatura(ultimaFatura, hoje)}`],
        ['Para quem', nomeDoPara(casa, compra.para)],
        travado && compra.jaTenho && ['Já tenho', 'sim ✓'],
      ]),
      !travado && jaTenhoDaFolha(compra, dicaDoJaTenho(compra.grupo ? { forma: 'parcela', parcela: compra.parcela ?? null } : { forma: 'vista' }), { compraId: compra.id }),
      travado && h('p', { class: 'suave pequeno' }, 'Mês travado: só para ver.'),
      rodapeDoDetalhe(() => abrir(`editarcompra-${compra.id}`)),
    ];
  }

  function folhaDetalheFixa(fixa) {
    return [
      h('h2', {}, fixa.nome),
      h('div', { class: 'detalhe-topo' }, h('div', { class: 'valor-grande' }, formatarBRL(fixa.valor)), h('span', { class: 'suave' }, 'todo mês')),
      etiquetasDe(fixa.nome),
      linhasDeDetalhe([
        ['Desde', `fatura de ${nomeDaFatura(fixa.desde, hoje)}`],
        fixa.ate && ['Até', `fatura de ${nomeDaFatura(fixa.ate, hoje)}`],
        ['Nesta fatura', `${nomeDaFatura(fatura, hoje)} · vence ${dataCurta(periodoDaFatura(fatura, cfg).vence)}`],
        ['Para quem', nomeDoPara(casa, fixa.para)],
        travado && fixa.jaTenho && ['Já tenho', 'sim ✓'],
      ]),
      !travado && jaTenhoDaFolha(fixa, dicaDoJaTenho({ forma: 'fixa', nomeDaFatura: nomeDaFatura(fatura, hoje) }), { fixaId: fixa.id }),
      travado && h('p', { class: 'suave pequeno' }, 'Mês travado: só para ver.'),
      rodapeDoDetalhe(() => abrir(`editarfixa-${fixa.id}`)),
    ];
  }

  function folhaCompra(compra, folha) {
    const editado = { nome: compra.nome, valor: compra.valor, para: compra.para ?? 'casa', data: compra.data ?? null, fatura };
    const ehParcela = ehParcelada(compra);
    const parcela = compra.parcela ?? null;
    const faturaNome = h('output', { class: 'casa-vezes cartao-fatura-nome' });
    const botaoAnterior = h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Fatura anterior', onclick: () => trocarFatura(-1) }, '‹');
    const mostrarFatura = () => { faturaNome.textContent = nomeDaFatura(editado.fatura, hoje); botaoAnterior.disabled = editado.fatura <= fatura; };
    mostrarFatura();
    // Só para a mesma fatura ou as seguintes (nunca para uma anterior), e não para uma fatura travada.
    const quemVe = ctx.perfil?.visto?.id ?? null;
    const motivoDeNao = (m) => {
      if (m < fatura) return 'Só dá para mandar a compra para a mesma fatura ou para as seguintes.';
      if (m > fatura && estadoDoMes(casa, m, quemVe, hoje) !== 'livre') return `A fatura de ${nomeDaFatura(m, hoje)} está travada.`;
      return null;
    };
    const trocarFatura = (d) => {
      const m = somarMeses(editado.fatura, d);
      const motivo = motivoDeNao(m);
      if (motivo) { ctx.aviso(motivo, 'atencao', 3000); return; }
      editado.fatura = m;
      mostrarFatura();
    };

    // Parcelas (desenho 2026-11-21-mudar-parcelas): digitou o número errado? Muda aqui. A compra continua começando na
    // mesma fatura; não dá para tirar a parcela aberta nem as de faturas travadas.
    const parcelas = parcelasDaCompra(casa, { fatura, compraId: compra.id });
    const nDaEditada = parcelas.find((p) => p.compra.id === compra.id)?.n ?? 1;
    const vezesAntes = parcela?.de ?? (ehParcela ? parcelas.at(-1).n : 1);
    const minimoDeVezes = Math.max(nDaEditada, ...parcelas.filter((p) => estadoDoMes(casa, p.mes, quemVe, hoje) !== 'livre').map((p) => p.n));
    editado.vezes = vezesAntes;
    // A data da parcelada: a 1ª parcela vai para a fatura da data nova e as outras andam junto (nunca para trás, nem
    // tirando parcela de uma fatura travada ou levando para uma).
    const primeiraAntes = somarMeses(parcelas[0].mes, 1 - parcelas[0].n);
    editado.passo = 0;
    const dicaDaData = h('span', { class: 'campo-dica' });
    const mostrarDataDaParcela = () => {
      dicaDaData.textContent = `A 1ª parcela fica na fatura de ${nomeDaFatura(somarMeses(primeiraAntes, editado.passo), hoje)}.${editado.passo ? ' As outras andam junto.' : ''}`;
    };
    mostrarDataDaParcela();
    const travadoEm = (m) => estadoDoMes(casa, m, quemVe, hoje) !== 'livre';
    const motivoDaData = (passo) => {
      if (passo < 0) return 'Só dá para mandar a compra para a mesma fatura ou para as seguintes.';
      if (passo > 0 && parcelas.some((p) => travadoEm(p.mes))) return 'Uma das parcelas já está num mês travado: a compra não pode mudar de fatura.';
      if (passo > 0 && parcelas.some((p) => travadoEm(somarMeses(p.mes, passo)))) return 'A data nova levaria parcelas para uma fatura travada.';
      return null;
    };
    const faturaDaParcela = (n) => somarMeses(parcelas[0].mes, n - parcelas[0].n + editado.passo);
    const vezesTexto = h('output', { class: 'casa-vezes' });
    const dicaDasVezes = h('span', { class: 'campo-dica' });
    const menos = h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Menos parcelas', onclick: () => mudarVezes(-1) }, '−');
    const mais = h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Mais parcelas', onclick: () => mudarVezes(1) }, '+');
    const mostrarVezes = () => {
      const v = editado.vezes;
      vezesTexto.textContent = v === 1 ? '1 vez' : `${v} vezes`;
      menos.disabled = v <= minimoDeVezes;
      mais.disabled = v >= 48;
      const diferenca = Math.abs(v - vezesAntes);
      const ultima = v > 1 ? ` A última fica na fatura de ${nomeDaFatura(faturaDaParcela(v), hoje)}.` : '';
      dicaDasVezes.textContent = v === vezesAntes
        ? (ehParcela ? `Esta é a ${nDaEditada}ª de ${v}.${ultima}` : 'À vista. Para parcelar, aumente as vezes: o valor acima vira o de cada parcela.')
        : v > vezesAntes
          ? `${diferenca === 1 ? 'Entra 1 parcela' : `Entram ${diferenca} parcelas`} nas faturas seguintes.${ultima}`
          : `${diferenca === 1 ? 'Sai 1 parcela' : `Saem ${diferenca} parcelas`} do fim.${v === 1 ? ' A compra fica à vista.' : ultima}`;
    };
    const mudarVezes = (d) => { editado.vezes = Math.min(48, Math.max(minimoDeVezes, editado.vezes + d)); mostrarVezes(); };
    mostrarVezes();
    const campoDasVezes = h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Parcelas'),
      h('div', { class: 'casa-passo' }, menos, vezesTexto, mais),
      dicaDasVezes);

    const salvar = botao('Salvar', async () => {
      if (!editado.nome.trim()) { ctx.aviso('Escreva o que foi comprado.', 'atencao', 3000); return; }
      if (editado.valor == null || editado.valor <= 0) { ctx.aviso('Digite o valor.', 'atencao', 3000); return; }
      salvar.disabled = true;
      const mudouVezes = editado.vezes !== vezesAntes;
      const mudouData = ehParcela && Boolean(editado.data) && editado.data !== compra.data;
      // Onde a compra fica depois da edição (à vista: a fatura escolhida; parcelada: andou junto com a data).
      const destino = ehParcela ? somarMeses(fatura, editado.passo) : editado.fatura > fatura ? editado.fatura : fatura;
      await ctx.salvarCasa((c) => {
        let r = editarCompraDoCartao(c, {
          fatura, compraId: compra.id, nome: editado.nome, valor: editado.valor, para: editado.para,
          data: editado.data ?? undefined, novaFatura: ehParcela ? undefined : editado.fatura,
        });
        if (mudouData) r = mudarDataDaParcelada(r, { fatura, compraId: compra.id, data: editado.data, cartaoId: cfg.id });
        return mudouVezes ? mudarParcelas(r, { fatura: destino, compraId: compra.id, vezes: editado.vezes }) : r;
      });
      ctx.aviso(mudouVezes ? `Salvo. Agora ${editado.vezes === 1 ? 'à vista' : `em ${editado.vezes} vezes`}.`
        : destino !== fatura ? `Salvo. Foi para a fatura de ${nomeDaFatura(destino, hoje)}.` : 'Salvo.', 'ok', 3000);
      terminar(folha);
    });
    const apagar = botaoDoisToques('Apagar compra', ehParcela ? 'Toque de novo para apagar (e as próximas parcelas)' : 'Toque de novo para apagar', async () => {
      const seguintes = parcelasSeguintes(casa, { mes: fatura, compraId: compra.id });
      await ctx.salvarCasa((c) => apagarCompra(c, { mes: fatura, compraId: compra.id }));
      ctx.aviso(seguintes ? `Compra apagada, junto com ${plural(seguintes, 'parcela seguinte', 'parcelas seguintes')}.` : 'Compra apagada.', 'ok', 3500);
      terminar(folha);
    });
    const jaTenho = jaTenhoDaFolha(compra, dicaDoJaTenho(ehParcela ? { forma: 'parcela', parcela } : { forma: 'vista' }), { compraId: compra.id });

    return [
      titulo(compra.nome),
      h('p', { class: 'suave pequeno' }, ehParcela
        ? `${parcela ? `Parcela ${parcela.n} de ${parcela.de}` : 'Repete nas faturas seguintes'}${compra.data ? `, comprada em ${dataComAno(compra.data)}` : ''}. O que mudar aqui vale para esta e as próximas.`
        : compra.data ? `Comprada em ${dataComAno(compra.data)}.` : 'Veio da planilha, sem data.'),
      campoTag({ rotulo: 'O que foi', valor: compra.nome, tags: etiquetasDosNomes(nomesUsados(casaVisivel, cfg.id).map((s) => s.nome), juntasDaCasa(casa)), juntas: juntasDaCasa(casa), aoMudar: (v) => { editado.nome = v; } }),
      campoMoeda({ rotulo: ehParcela ? 'Valor da parcela' : 'Valor', valor: compra.valor, aoMudar: (v) => { editado.valor = v; } }),
      campoDasVezes,
      ehParcela && h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Data da compra'),
        h('input', {
          class: 'entrada', type: 'date', value: compra.data ?? '',
          onchange: (e) => {
            if (!e.target.value) return;
            const passo = diffMeses(primeiraAntes, faturaDaCompra(e.target.value, cfg));
            const motivo = motivoDaData(passo);
            if (motivo) { ctx.aviso(motivo, 'atencao', 3500); e.target.value = editado.data ?? ''; return; } // volta para a data de antes
            editado.data = e.target.value;
            editado.passo = passo;
            mostrarDataDaParcela();
            mostrarVezes();
          },
        }),
        dicaDaData),
      !ehParcela && h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Data da compra'),
        h('input', {
          class: 'entrada', type: 'date', value: compra.data ?? '',
          onchange: (e) => {
            if (!e.target.value) return;
            const motivo = motivoDeNao(faturaDaCompra(e.target.value, cfg));
            if (motivo) { ctx.aviso(motivo, 'atencao', 3500); e.target.value = editado.data ?? ''; return; } // volta para a data de antes
            editado.data = e.target.value;
            editado.fatura = faturaDaCompra(editado.data, cfg);
            mostrarFatura();
          },
        })),
      !ehParcela && h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Fatura'),
        h('div', { class: 'casa-passo' },
          botaoAnterior,
          faturaNome,
          h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Fatura seguinte', onclick: () => trocarFatura(1) }, '›')),
        h('span', { class: 'campo-dica' }, 'O app calcula pela data. Mude só se o banco colocou a compra em outra fatura.')),
      escolhaPara(editado.para, (id) => { editado.para = id; jaTenho?.paraEscolhido(id); }),
      jaTenho,
      h('div', { class: 'botoes botoes-fixos' }, botao('Cancelar', fechar, { secundario: true }), salvar),
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
    // Lançou errado: apagar tira a de todo mês de todas as faturas. Só se ela começou numa fatura que ainda não está
    // travada (senão mexeria no passado travado): aí fica só o "Parar de repetir".
    const inicio = inicioDaFixa(casa, { cartaoId: cfg.id, fixaId: fixa.id });
    const podeApagar = inicio != null && estadoDoMes(casa, inicio, ctx.perfil?.visto?.id ?? null, hoje) === 'livre';
    const apagar = podeApagar && botaoDoisToques('Apagar (lancei errado)', 'Toque de novo para apagar de todas as faturas', async () => {
      await ctx.salvarCasa((c) => apagarFixa(c, { cartaoId: cfg.id, fixaId: fixa.id }));
      ctx.aviso(`${fixa.nome} foi apagada.`, 'ok', 3000);
      terminar(folha);
    });
    const jaTenho = jaTenhoDaFolha(fixa, dicaDoJaTenho({ forma: 'fixa', nomeDaFatura: nomeDaFatura(fatura, hoje) }), { fixaId: fixa.id });
    return [
      titulo(fixa.nome),
      h('p', { class: 'suave pequeno' }, `Todo mês desde a fatura de ${nomeDaFatura(fixa.desde, hoje)}.${depois ? ' O que mudar aqui vale desta fatura em diante; as anteriores ficam como estão.' : ''}`),
      campoTag({ rotulo: 'O que é', valor: fixa.nome, tags: etiquetasDosNomes(nomesUsados(casaVisivel, cfg.id).map((s) => s.nome), juntasDaCasa(casa)), juntas: juntasDaCasa(casa), aoMudar: (v) => { editado.nome = v; } }),
      campoMoeda({ rotulo: 'Valor por mês', valor: fixa.valor, aoMudar: (v) => { editado.valor = v; } }),
      escolhaPara(editado.para, (id) => { editado.para = id; jaTenho?.paraEscolhido(id); }),
      jaTenho,
      h('div', { class: 'botoes botoes-fixos' }, botao('Cancelar', fechar, { secundario: true }), salvar),
      parar,
      apagar,
      !podeApagar && h('p', { class: 'suave pequeno' }, 'Ela começou numa fatura travada: só dá para parar de repetir.'),
    ];
  }

  // ---------- folha aberta (vem do endereço) ----------
  const aberto = folhaAberta(location.hash);
  const [tipo, id] = aberto ? [aberto.split('-')[0], aberto.slice(aberto.indexOf('-') + 1)] : [];
  const compra = tipo === 'compra' || tipo === 'editarcompra' ? f.compras.find((c) => c.id === id) : null;
  const fixa = tipo === 'fixa' || tipo === 'editarfixa' ? f.fixas.find((x) => x.id === id) : null;
  // Detalhes abrem sempre (num mês travado, só para ver); anotar e editar, só com a fatura livre.
  const pessoaAberta = tipo === 'pessoa' ? f.porPessoa.find((p) => p.para === id) : null;
  const conteudo = pessoaAberta ? folhaDaPessoa(id)
    : tipo === 'anotar' ? (travado ? null : folhaAnotar(aberto))
    : compra ? (tipo === 'editarcompra' ? (travado ? null : folhaCompra(compra, aberto)) : folhaDetalheCompra(compra))
      : fixa ? (tipo === 'editarfixa' ? (travado ? null : folhaFixa(fixa, aberto)) : folhaDetalheFixa(fixa)) : null;
  if (!conteudo) {
    abertaAqui = false;
    ultimaData = null; // folha fechada (até pelo voltar do celular): a próxima começa com a data de hoje
    esconderFolha();
    return;
  }
  const painel = mostrarFolha({ conteudo: conteudo.filter(Boolean), aoFechar: fechar, rotulo: compra?.nome ?? fixa?.nome ?? pessoaAberta?.nome ?? 'Anotar compra' });
  const alvo = tipo === 'anotar' ? painel.querySelector('input') : painel;
  setTimeout(() => alvo.focus({ preventScroll: true }), 50);
}
