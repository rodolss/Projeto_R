// Carteira (desenho 2026-11-22-carteira; antes "Início"/"Plano"): como nos apps de investimento consagrados — o total
// investido no topo e três vistas em abas: Resumo (meta, evolução, divisão contra a meta), Ativos (lista por classe,
// detalhe do ativo) e Proventos. A aba fica no endereço (?aba=) com location.replace: trocar não entra no histórico.
// As folhas (?folha=) entram, e o voltar do celular as fecha.
import { h, aviso, botao, cartao, campoMoeda, mostrarFolha, esconderFolha } from './dom.js';
import { anel, abreviar } from './grafico.js';
import { formatarBRL, formatarDuracao, formatarPct } from '../core/formato.js';
import { formatarMes, diffMeses } from '../core/meses.js';
import { calcularPainel, registrarSaldos } from '../core/motor.js';
import { precisaRevisarOrcamento } from '../core/metas.js';
import { contar } from './movimento.js';
import { renderDetalhes } from './detalhes.js';
import { comemorar } from './festa.js';
import { registrarComemoracao } from '../core/marcos.js';
import { cartaoDoPagamento, dataCurta, nomeDoMes, saldosParaGravar } from '../core/lista-mes.js';
import { lerRascunho } from './mes-rascunho.js';
import { parametroDoHash, folhaAberta, depoisDeSalvar } from './rotas.js';
import { resumoDaCarteira, evolucao, proventosDaCarteira } from '../core/carteira.js';
import { potencialDeInvestimento } from '../core/investir-sobra.js';
import { mesPadraoDaCasa } from './casa.js';
import { graficoEvolucao, colunasProventos, barraDivisao } from './carteira-graficos.js';
import { abaAtivos, folhaDeAtivos, NOMES_GRUPO } from './carteira-ativos.js';

let comemorando = false; // vale entre renders: impede duas comemorações ao mesmo tempo
let abertaAqui = false; // a folha foi aberta por um toque nesta sessão: fechar = voltar no histórico
let periodo = 'tudo'; // o filtro da evolução (6m, 1a, tudo): fica enquanto o app está aberto

const ABAS = [['resumo', 'Resumo'], ['ativos', 'Ativos'], ['proventos', 'Proventos']];

// Cartão do dia do pagamento: acompanha a aba Mês (registrado, pela metade ou para abrir).
// Na visão única, sem a etapa do salário (vem do Balanço: desenho 2026-11-21-salario-no-balanco), como na tela do Mês.
function cartaoPagamento(estado, hoje, ctx, mes = hoje.slice(0, 7)) {
  const entrada = estado.meses.find((m) => m.mes === mes);
  const c = cartaoDoPagamento({ entrada, rascunho: lerRascunho(mes), semSalario: Boolean(ctx.unica && ctx.perfil?.visto) });
  if (c.tipo === 'registrado') {
    const nome = nomeDoMes(mes);
    return h('section', { class: 'cartao acao registrado' },
      h('div', { class: 'titulo-check' }, h('span', { class: 'check', 'aria-hidden': 'true' }, '✓'),
        h('div', {}, h('h3', {}, `${nome[0].toUpperCase()}${nome.slice(1)} registrado`),
          h('p', { class: 'suave' }, `${formatarBRL(c.total)} aplicados em ${dataCurta(c.data)}`))),
      h('a', { class: 'botao secundario', href: '#/mes' }, 'Ver'));
  }
  return h('section', { class: 'cartao acao' },
    h('div', {}, h('h3', {}, c.tipo === 'continuar' ? `Dia de pagamento? · ${c.quantas} de ${c.total} feitos` : 'Dia de pagamento?'),
      h('p', { class: 'suave' }, 'Veja quanto investir este mês e onde.')),
    h('a', { class: 'botao', href: '#/mes' }, c.tipo === 'continuar' ? 'Continuar' : 'Abrir'));
}

// O quanto investir este mês (desenhos 2026-11-22-para-investir e -sobra-do-proprio-mes): a sobra (prevista, até fechar)
// do Balanço do mês em foco menos o lazer — a mesma conta do Dia de pagamento —, e o potencial (a média dos últimos meses). Substitui o "Dia de pagamento?"; com o
// mês já registrado (ou fora da visão única, sem o Balanço), fica o cartão do pagamento.
// O mês é o mês em foco (como nas telas da casa): com o mês do calendário todo pago e fechado, já é o seguinte. O Dia de
// pagamento registra o mês do calendário, então um mês em foco à frente mostra o valor, mas ainda sem "Investir agora".
function cartaoParaInvestir(estado, hoje, ctx) {
  if (!ctx.unica || !ctx.perfil?.visto || !ctx.casa) return cartaoPagamento(estado, hoje, ctx);
  const mes = mesPadraoDaCasa(ctx);
  const adiantado = mes > hoje.slice(0, 7);
  const entrada = estado.meses.find((m) => m.mes === mes);
  const c = cartaoDoPagamento({ entrada, rascunho: adiantado ? null : lerRascunho(mes), semSalario: true });
  if (c.tipo === 'registrado') return cartaoPagamento(estado, hoje, ctx, mes);
  const { atual, media, quantos } = potencialDeInvestimento({ casa: ctx.casa, estado, pessoaId: ctx.perfil.visto.id, mes, hoje });
  const anterior = nomeDoMes(atual.mes);
  const corpo = atual.incompleto
    ? [h('p', { class: 'suave' }, `Para calcular, faltam os salários de ${anterior} no Balanço.`),
      h('a', { class: 'botao-link', href: `#/casa-balanco?mes=${atual.mes}` }, `Abrir o balanço de ${anterior}`)]
    : [h('div', { class: 'valor-grande' }, formatarBRL(Math.max(0, atual.investir))),
      h('p', { class: 'suave' }, [
        `Sobra de ${anterior}: ${formatarBRL(atual.sobra)}${atual.previsao ? ' (previsão)' : ''}`,
        atual.lazer > 0 && `${formatarBRL(atual.lazer)} para lazer`,
        atual.jaInvestido > 0 && `${formatarBRL(atual.jaInvestido)} já investidos`,
        atual.deficit > 0 && `${formatarBRL(atual.deficit)} cobrem meses no vermelho`,
      ].filter(Boolean).join(' · ')),
      atual.investir <= 0 && h('p', {}, h('b', {}, 'Este mês não sobra para investir.'))];
  return h('section', { class: 'cartao para-investir' },
    h('div', { class: 'rotulo' }, `Para investir em ${nomeDoMes(mes)}`),
    ...corpo,
    quantos >= 2 && h('p', { class: 'para-investir-media' }, 'Seu potencial: ', h('b', {}, `${formatarBRL(media)} por mês`), ` (média de ${quantos} meses)`),
    adiantado
      ? [h('p', { class: 'suave pequeno para-investir-media' }, `O Dia de pagamento de ${nomeDoMes(mes)} abre em ${nomeDoMes(mes)}.`),
        h('div', { class: 'botoes' }, h('a', { class: 'botao secundario', href: `#/casa-balanco?mes=${atual.mes}` }, `Ver o balanço de ${anterior}`))]
      : h('div', { class: 'botoes' }, h('a', { class: 'botao', href: '#/mes' }, c.tipo === 'continuar' ? 'Continuar o Dia de pagamento' : 'Investir agora')));
}

const abreviado = (v) => `R$ ${abreviar(v)}`;
const semCentavos = (v) => formatarBRL(Math.round(v)).replace(/,00$/, '');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const comSinal = (v) => `${v >= 0 ? '+' : '−'}${formatarBRL(Math.abs(v))}`;
const pctComSinal = (v) => `${v >= 0 ? '+' : '−'}${formatarPct(Math.abs(v), 1)}`;

function centroDoAnel(p) {
  if (p.marcos.rendaPlena.atingido) {
    return [h('span', { class: 'rotulo' }, 'Renda plena'), h('span', { class: 'anel-grande' }, 'Você chegou'), h('span', { class: 'anel-medio' }, '🏆')];
  }
  if (p.faltam === null) {
    return [h('span', { class: 'rotulo' }, 'Faltam'), h('span', { class: 'anel-medio' }, 'mais de'), h('span', { class: 'anel-grande' }, '50 anos'),
      h('small', {}, h('a', { href: '#/simular' }, 'Veja no simulador'))];
  }
  if (p.faltam === 0) {
    return [h('span', { class: 'anel-grande' }, 'Quase lá'), h('small', {}, 'Atualize seus saldos para confirmar')];
  }
  const anos = Math.floor(p.faltam / 12);
  const meses = p.faltam % 12;
  return [
    h('span', { class: 'rotulo' }, 'Faltam'),
    h('span', { class: 'anel-grande' }, anos ? plural(anos, 'ano', 'anos') : plural(meses, 'mês', 'meses')),
    anos && meses ? h('span', { class: 'anel-medio' }, `e ${plural(meses, 'mês', 'meses')}`) : null,
    h('small', {}, 'no seu ritmo de hoje'),
  ];
}

function chipSetinha(s) {
  if (!s) return null;
  if (s.delta === 0) return h('span', { class: 'chip-setinha' }, s.imediato ? 'igual ao mês passado' : `igual a ${formatarMes(s.mesComparado)}`);
  const menos = s.delta < 0;
  const quando = s.imediato ? 'no mês passado' : `em ${formatarMes(s.mesComparado)}`;
  return h('span', { class: `chip-setinha ${menos ? 'melhor' : 'pior'}` },
    `${menos ? '▼' : '▲'} ${formatarDuracao(Math.abs(s.delta))} a ${menos ? 'menos' : 'mais'} que ${quando}`);
}

// `media`: a mesma média por mês dos números da aba Proventos (um valor só na tela).
function cartaoRenda(p, media) {
  const valor = h('span', {}, formatarBRL(media));
  const fracao = p.salario > 0 ? Math.min(1, media / p.salario) : 0;
  const posCusto = p.salario > 0 ? Math.min(1, p.custoTotal / p.salario) : 0;
  const custoAbaixo = posCusto > 0.62; // perto do fim, o rótulo do custo desce para não encostar no do salário
  const cartaoEl = h('section', { class: 'cartao renda' },
    h('p', { class: 'rotulo' }, 'Rumo à renda plena'),
    h('p', { class: 'renda-valor' }, valor, h('small', {}, ' por mês')),
    h('div', { class: `renda-barra${custoAbaixo ? ' com-abaixo' : ''}`, role: 'img', 'aria-label': `${formatarBRL(media)} de ${formatarBRL(p.salario)} por mês` },
      h('i', { style: `width:${(fracao * 100).toFixed(1)}%` }),
      h('span', { class: `renda-marca${custoAbaixo ? ' abaixo' : ''}`, style: `left:${(posCusto * 100).toFixed(1)}%` }, `🥇 ${semCentavos(p.custoTotal)}`),
      h('span', { class: 'renda-marca fim' }, `🏆 ${semCentavos(p.salario)}`)),
    h('p', { class: 'suave pequeno' }, media > 0
      ? 'Em 🥇 os proventos pagam o seu custo de vida. Em 🏆, o seu salário inteiro.'
      : 'Quando seus investimentos pagarem proventos, informe no Dia de pagamento e eles aparecem aqui.'));
  return { cartao: cartaoEl, valor };
}

function fileiraDeMarcos(p) {
  const m = p.marcos;
  const item = (classe, icone, titulo, sub) => h('div', { class: `marco ${classe}` },
    h('span', { class: 'marco-bola', 'aria-hidden': 'true' }, icone), h('b', {}, titulo), h('span', {}, sub));
  const situacao = (x, senao) => (x.atingido ? 'conquistada' : x.quaseLa ? 'quase lá: atualize seus saldos' : senao);
  return h('section', { class: 'cartao marcos', 'aria-label': 'Marcos do caminho' },
    item(m.reserva.atingido ? 'feito' : '', m.reserva.atingido ? '✓' : '🛡️', 'Reserva de emergência',
      m.reserva.atingido ? 'conquistada' : `faltam ${semCentavos(m.reserva.falta)}`),
    item(m.independencia.atingido ? 'feito' : '', '🥇', 'Independência', situacao(m.independencia, `em ${formatarDuracao(p.projecaoM1.meses)}`)),
    item(m.rendaPlena.atingido ? 'meta feito' : 'meta', '🏆', 'Renda plena',
      situacao(m.rendaPlena, p.projecaoM2.mes ? formatarMes(p.projecaoM2.mes) : 'mais de 50 anos')));
}

function fraseDoAlvo(p) {
  if (!p.projecaoM2.mes || p.marcos.rendaPlena.atingido) return null;
  const d = diffMeses(p.mesAlvo, p.projecaoM2.mes);
  const quando = d === 0 ? 'chega bem no alvo' : `chega ${formatarDuracao(Math.abs(d))} ${d > 0 ? 'depois' : 'antes do alvo'}`;
  return h('p', { class: 'nota' }, `Seu alvo é ${formatarMes(p.mesAlvo)}. No seu ritmo, a renda plena ${quando}. `,
    h('a', { href: '#/simular' }, 'Veja o que muda no simulador'));
}

// ---------- topo: o total investido ----------
function heroi(resumo, vazio, abrir) {
  const el = cartao(
    h('div', { class: 'rotulo' }, 'Total investido'),
    h('div', { class: 'valor-grande' }, formatarBRL(resumo.total)),
    resumo.temGanho
      ? h('p', { class: 'heroi-ganho' }, h('b', {}, `${comSinal(resumo.ganho)}${resumo.ganhoPct != null ? ` (${pctComSinal(resumo.ganhoPct)})` : ''}`), ' desde o primeiro saldo')
      : h('p', { class: 'heroi-ganho' }, vazio ? 'Adicione os investimentos que você já tem para ver a carteira.' : 'O ganho aparece na segunda atualização dos saldos.'),
    h('div', { class: 'heroi-rodape' },
      h('span', { class: 'selo' }, resumo.ultimaAtualizacao ? `Saldos de ${dataCurta(resumo.ultimaAtualizacao)}` : 'Sem saldos ainda'),
      h('button', { type: 'button', class: 'botao-heroi', onclick: () => abrir(vazio ? 'novo-ativo' : 'saldos') }, vazio ? 'Adicionar investimento' : 'Atualizar saldos')));
  el.classList.add('heroi');
  return el;
}

// ---------- Resumo ----------
function cartaoEvolucao(pontosTodos) {
  const corte = { '6m': 6, '1a': 12, tudo: Infinity };
  const area = h('div');
  const chips = h('div', { class: 'chips filtro-periodo', role: 'group', 'aria-label': 'Período' });
  const desenhar = () => {
    const pts = pontosTodos.slice(-corte[periodo]);
    area.replaceChildren(pts.length >= 2 ? graficoEvolucao(pts)
      : h('p', { class: 'suave' }, pontosTodos.length ? 'O gráfico aparece a partir do segundo mês com saldos.' : 'Ainda sem investimentos.'));
    chips.replaceChildren(...[['6m', '6M'], ['1a', '1A'], ['tudo', 'Tudo']].map(([id, nome]) => h('button', {
      type: 'button', class: `chip pequeno${id === periodo ? ' ativo' : ''}`, 'aria-pressed': String(id === periodo),
      onclick: () => { periodo = id; desenhar(); },
    }, nome)));
  };
  desenhar();
  return h('section', { class: 'cartao' },
    h('div', { class: 'titulo-com-filtro' }, h('h2', {}, 'Evolução'), pontosTodos.length > 6 && chips),
    area);
}

function cartaoDivisao(resumo) {
  const alocacao = resumo.alocacao.map((a) => ({ ...a, nome: NOMES_GRUPO[a.classe] }));
  // Só o que pede atenção ganha texto: abaixo (o próximo aporte vai para cá) ou acima da meta.
  const situacao = (a) => (resumo.carteira <= 0 ? null : a.abaixo ? 'abaixo da meta: o próximo aporte vai para cá' : a.pct > a.meta + 0.005 ? 'acima da meta' : null);
  const fora = resumo.grupos.filter((g) => ['reserva', 'caixa', 'fora-do-plano'].includes(g.id));
  return h('section', { class: 'cartao' },
    h('h2', {}, 'Divisão da carteira'),
    resumo.carteira > 0 ? barraDivisao(alocacao) : h('p', { class: 'suave' }, 'A divisão aparece quando houver investimentos na carteira. Estas são as suas metas:'),
    h('div', { class: 'metas-classe' }, ...alocacao.map((a) => h('div', { class: 'meta-classe' },
      h('div', { class: 'meta-classe-topo' },
        h('span', { class: `chave-grupo cor-${a.classe}`, 'aria-hidden': 'true' }),
        h('b', {}, a.nome),
        h('span', { class: 'meta-classe-pct' }, resumo.carteira > 0 && h('b', {}, formatarPct(a.pct, 0)), ` meta ${formatarPct(a.meta, 0)}`)),
      h('div', { class: 'meta-barra', role: 'img', 'aria-label': `${a.nome}: ${formatarPct(a.pct, 0)} da carteira, meta de ${formatarPct(a.meta, 0)}` },
        h('i', { class: `cor-${a.classe}`, style: `width:${Math.min(100, a.pct * 100).toFixed(1)}%` }),
        h('span', { class: 'meta-marca', style: `left:${(a.meta * 100).toFixed(1)}%` })),
      situacao(a) && h('small', { class: a.abaixo ? 'meta-abaixo' : 'suave' }, situacao(a))))),
    fora.length > 0 && h('div', { class: 'fora-da-carteira' }, h('h3', {}, 'Fora da carteira'),
      ...fora.map((g) => h('div', { class: 'linha' }, h('div', { class: 'nome' }, h('span', {}, NOMES_GRUPO[g.id])), h('div', { class: 'quanto' }, formatarBRL(g.valor))))),
    h('a', { class: 'botao-link link-meta', href: '#/config' }, 'Mudar a meta'));
}

function abaResumo({ p, resumo, estado, hoje, ctx }) {
  const topo = h('section', { class: 'inicio-topo' },
    h('p', { class: 'rotulo' }, 'Sua renda plena'),
    h('div', { class: 'anel', html: anel({ fracao: p.marcos.rendaPlena.atingido ? 1 : (p.metas.rendaPlena > 0 ? p.patrimonio / p.metas.rendaPlena : 0) }) },
      h('div', { class: 'anel-centro' }, ...centroDoAnel(p))),
    chipSetinha(p.setinha),
    h('p', { class: 'juntou' }, 'Contam para a meta ', h('b', {}, abreviado(p.patrimonio)), ` de ${abreviado(p.metas.rendaPlena)}.`));
  return {
    topo,
    itens: [
      cartaoParaInvestir(estado, hoje, ctx),
      topo,
      fileiraDeMarcos(p),
      fraseDoAlvo(p),
      cartaoEvolucao(evolucao(estado, hoje)),
      cartaoDivisao(resumo),
      precisaRevisarOrcamento(estado.config.ultimaRevisaoOrcamento, hoje.slice(0, 7))
        && aviso('atencao', 'Já faz 6 meses desde a última revisão do orçamento. ', h('a', { href: '#/orcamento' }, 'Revisar agora')),
      p.avisos.includes('ipca-indisponivel') && aviso('info', 'Ainda não tenho a inflação mais recente; as metas usam a última disponível.'),
      h('details', { class: 'cartao detalhes' }, h('summary', {}, 'Projeção e check-up'), renderDetalhes(p, estado)),
    ],
  };
}

// ---------- Proventos ----------
function abaProventos({ p, estado, hoje }) {
  const prov = proventosDaCarteira(estado, hoje);
  // "R$" e o número nunca se separam na quebra de linha.
  const numero = (rotulo, valor, detalhe) => h('div', { class: 'cartao numero-kpi' }, h('span', { class: 'rotulo' }, rotulo), h('b', {}, valor.replace(/\s/g, ' ')), h('small', {}, detalhe));
  // A média por mês é a do motor (a mesma de "Projeção e check-up" e da barra rumo à renda plena).
  const media = p.proventosMedios;
  const renda = cartaoRenda(p, media);
  return {
    renda,
    media,
    itens: [
      h('div', { class: 'kpis' },
        numero('Por mês', formatarBRL(media), 'média de até 12 meses'),
        numero('Em 12 meses', formatarBRL(prov.total), prov.quantos <= 0 ? 'o plano ainda não começou' : prov.quantos < 12 ? `${plural(prov.quantos, 'mês', 'meses')} até agora` : 'total'),
        numero('Rendimento', prov.rendimento == null ? '—' : formatarPct(prov.rendimento, 1), 'em 12 meses, sobre o total')),
      h('section', { class: 'cartao' }, h('h2', {}, 'Mês a mês'),
        prov.meses.some((m) => m.valor > 0) ? colunasProventos(prov.meses)
          : h('p', { class: 'suave' }, 'Quando seus investimentos pagarem proventos, informe no Dia de pagamento e eles aparecem aqui.'),
        h('p', { class: 'suave pequeno' }, 'Os proventos entram pelo total do mês, no Dia de pagamento.')),
      renda.cartao,
    ],
  };
}

// ---------- folha: atualizar todos os saldos ----------
function folhaDosSaldos({ resumo, ctx, fechar, salvarNaFolha, folha }) {
  const { hoje } = ctx;
  const edicoes = {};
  return [
    h('h2', {}, 'Atualizar saldos'),
    h('p', { class: 'suave' }, 'Copie os valores como estão na corretora agora. Só os que você digitar são salvos.'),
    ...resumo.posicoes.map((p) => campoMoeda({
      rotulo: p.ativo.nome, dica: `No app: ${formatarBRL(p.saldo)}${p.dataSaldo ? ` (saldo de ${dataCurta(p.dataSaldo)})` : ''}`,
      aoMudar: (v) => { if (v == null) delete edicoes[p.ativo.id]; else edicoes[p.ativo.id] = v; },
    })),
    h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Salvar saldos', () => {
      const saldos = Object.entries(edicoes).map(([ativoId, valor]) => ({ ativoId, valor, cotas: resumo.posicoes.find((x) => x.ativo.id === ativoId)?.cotas ?? null }));
      if (!saldos.length) { ctx.aviso('Digite pelo menos um saldo.', 'atencao', 3000); return; }
      salvarNaFolha((e) => registrarSaldos(e, { data: hoje, saldos: saldosParaGravar({ estado: e, mes: hoje.slice(0, 7), hoje, saldos }) }), 'Saldos salvos.', folha);
    })),
  ];
}

// Mesma tela (abrir ou fechar uma folha, trocar de aba, dados de outro aparelho): redesenha sem rolar para o topo.
export function atualizar(container, ctx) {
  render(container, ctx);
}

let salvando = false; // um salvamento por vez: dois toques rápidos não gravam duas vezes (o GitHub demora)

export function render(container, ctx) {
  const { estado, hoje } = ctx;
  const p = calcularPainel({ estado, hoje });
  const resumo = resumoDaCarteira(estado, hoje);
  const vazio = !estado.ativos.length;
  const pedida = parametroDoHash(location.hash, 'aba');
  const aba = ABAS.some(([id]) => id === pedida) ? pedida : 'resumo';
  const endereco = (extra = '') => `#/inicio?aba=${aba}${extra}`;
  const abrir = (folha) => { abertaAqui = true; location.hash = endereco(`&folha=${folha}`); };
  const fechar = () => {
    if (abertaAqui) { abertaAqui = false; history.back(); } else location.replace(endereco());
  };
  // Depois de salvar (pode demorar, no GitHub): fecha a folha se ela ainda está aberta; senão só redesenha.
  const salvarNaFolha = async (mutacao, texto, folha) => {
    if (salvando) return;
    salvando = true;
    try {
      await ctx.salvar(mutacao);
    } finally {
      salvando = false;
    }
    if (texto) ctx.aviso(texto, 'ok', 2500);
    const acao = depoisDeSalvar(location.hash, folha, 'inicio');
    if (acao === 'fechar') fechar();
    else if (acao === 'redesenhar') ctx.rerender();
  };

  const abas = h('div', { class: 'segmentos', role: 'tablist', 'aria-label': 'Vistas da carteira' },
    ...ABAS.map(([id, nome]) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(id === aba), class: id === aba ? 'ativo' : '',
      onclick: () => { if (id !== aba) location.replace(`#/inicio?aba=${id}`); },
    }, nome)));

  let topo = null;
  let renda = null;
  let mediaProventos = 0;
  let conteudo;
  if (aba === 'ativos') conteudo = abaAtivos({ resumo, abrir });
  else if (aba === 'proventos') ({ renda, itens: conteudo, media: mediaProventos } = abaProventos({ p, estado, hoje }));
  else ({ topo, itens: conteudo } = abaResumo({ p, resumo, estado, hoje, ctx }));

  container.replaceChildren(...[h('h1', { class: 'so-leitor' }, 'Carteira'), heroi(resumo, vazio, abrir), abas, ...conteudo].filter(Boolean));
  if (renda) contar(renda.valor, mediaProventos, formatarBRL);

  // ---------- folha aberta (vem do endereço) ----------
  const folha = folhaAberta(location.hash);
  const opcoes = { ctx, resumo, fechar, salvarNaFolha, folha };
  const conteudoFolha = folha && (folha === 'saldos' ? folhaDosSaldos(opcoes) : folhaDeAtivos(folha, opcoes));
  if (!conteudoFolha) {
    abertaAqui = false;
    esconderFolha();
  } else {
    const painel = mostrarFolha({ conteudo: conteudoFolha.filter(Boolean), aoFechar: fechar, rotulo: 'Carteira' });
    painel.setAttribute('data-sem-recarregar', ''); // o que foi digitado fica só na memória até salvar
  }

  // Comemora só depois da sincronização, com os dados mais novos: assim um marco já comemorado no outro aparelho
  // não é comemorado de novo. A data é gravada antes de o cartão aparecer.
  if (topo && p.marcos.aComemorar.length) {
    ctx.quandoSincronizado((estadoAtual) => {
      if (comemorando || !topo.isConnected) return;
      const ids = calcularPainel({ estado: estadoAtual, hoje }).marcos.aComemorar;
      if (!ids.length) return;
      comemorando = true;
      ctx.salvar((e) => registrarComemoracao(e, ids, hoje)).catch((erro) => console.warn('Não gravei a comemoração', erro));
      comemorar(ids).then(() => { comemorando = false; });
    });
  }
}
