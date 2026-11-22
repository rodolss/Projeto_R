// Carteira › Ativos (desenho 2026-11-22-carteira): a lista agrupada por classe, como nos apps de investimento, e as
// folhas do ativo (posição, atualizar saldo, histórico), de adicionar e de editar. O cadastro saiu dos Ajustes do plano.
import { h, botao, campoMoeda } from './dom.js';
import { botaoDoisToques } from './casa-cartao.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { registrarSaldos } from '../core/motor.js';
import { saldosParaGravar, dataCurta } from '../core/lista-mes.js';
import { adicionarAtivo, editarAtivo, tirarAtivo, GRUPOS } from '../core/carteira.js';
import { papelAutomatico, grupoDoTipo, novoPapel, registrarCompra } from '../core/cotacoes.js';
import { buscarSugestoes } from '../dados/cotacoes-remoto.js';
import { lerCotacoes, guardarCotacao, carregarTesouro, precoDoTesouro, lerTesouro, seriesDaRendaFixa } from './cotacoes-aparelho.js';
import { tituloCalculado, novoTituloCalculado, registrarAplicacao, aplicarRendaFixa, liquidoEstimado } from '../core/renda-fixa.js';
import { PRIMEIRO_DIA } from '../dados/renda-fixa-remoto.js';

// Números digitados do jeito brasileiro ("0,47", "1.250,50"); com ponto e sem vírgula, o ponto é a vírgula ("0.47").
export function numeroBr(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n > 0 ? n : null;
}
// Data de aplicação: no formato do campo (AAAA-MM-DD), de 2000 até hoje (um ano digitado errado, como "0024", estragaria
// as contas do CDI).
export const dataValida = (data, hoje) => /^\d{4}-\d{2}-\d{2}$/.test(String(data ?? '')) && data >= PRIMEIRO_DIA && data <= hoje;
const dataLonga = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const numeroCurto = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export const NOMES_GRUPO = {
  rendaFixa: 'Renda fixa', fiis: 'Fundos imobiliários', acoes: 'Ações BR', exterior: 'Exterior',
  reserva: 'Reserva de emergência', caixa: 'Caixa de oportunidade', 'fora-do-plano': 'Fora do plano', fgts: 'FGTS',
};
const EXEMPLOS = {
  rendaFixa: 'Ex.: Tesouro IPCA+, CDB e LCI de prazo longo.',
  fiis: 'Ex.: XFIX11, HGLG11 e outros fundos de aluguel.',
  acoes: 'Ex.: DIVO11, BOVA11 e ações de empresas brasileiras.',
  exterior: 'Ex.: IVVB11 e fundos com ações de fora.',
  reserva: 'Ex.: Tesouro Selic ou CDB com resgate no mesmo dia, para emergências.',
  caixa: 'Dinheiro guardado para comprar quando o mercado cair.',
  'fora-do-plano': 'Ex.: poupança, cripto e o que não segue o plano.',
  fgts: 'Só para ver junto: não entra no total.',
};
// Quem tem cotas (fundos e ações): a folha pede as cotas junto com o saldo.
const COM_COTAS = new Set(['fiis', 'acoes', 'exterior']);

// As iniciais do selo: "XFIX11" → "XF"; "Tesouro IPCA+ 2035" → "TI".
export function iniciais(nome) {
  const palavras = String(nome).trim().split(/\s+/).map((p) => p.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean);
  if (!palavras.length) return '?';
  return (palavras.length > 1 ? palavras[0][0] + palavras[1][0] : palavras[0].slice(0, 2)).toUpperCase();
}

export const seloDoAtivo = (nome, grupo) => h('span', { class: `selo-ativo cor-${grupo}`, 'aria-hidden': 'true' }, iniciais(nome));

const textoGanho = (pct) => h('small', { class: pct >= 0 ? 'ganho-sobe' : 'ganho-desce' }, `${pct >= 0 ? '▲' : '▼'} ${formatarPct(Math.abs(pct), 1)}`);
const fraseDaData = (p) => {
  // Com aportes depois do último saldo, o valor é o saldo daquele dia mais os aportes (ainda sem o rendimento deles).
  const quando = !p.dataSaldo ? 'sem saldo informado'
    : p.comAportesDepois ? `saldo de ${dataCurta(p.dataSaldo)} + aportes` : `atualizado em ${dataCurta(p.dataSaldo)}`;
  return [p.cotas != null && `${p.cotas.toLocaleString('pt-BR')} ${p.ativo.fonte === 'tesouro' ? 'títulos' : 'cotas'}`, quando].filter(Boolean).join(' · ');
};

export function abaAtivos({ resumo, abrir }) {
  const grupos = resumo.grupos.map((g) => h('section', { class: 'cartao casa-lista grupo-ativos' },
    h('div', { class: 'grupo-topo' },
      h('span', { class: `chave-grupo cor-${g.id}`, 'aria-hidden': 'true' }),
      h('h2', {}, NOMES_GRUPO[g.id]),
      h('span', { class: 'grupo-total' }, h('b', {}, formatarBRL(g.valor)), g.pct != null && h('small', {}, formatarPct(g.pct, 0)))),
    h('div', {}, ...g.ativos.map((p) => h('button', { type: 'button', class: 'casa-linha', onclick: () => abrir(`ativo-${p.ativo.id}`) },
      seloDoAtivo(p.ativo.nome, g.id),
      h('span', { class: 'texto' }, h('b', {}, p.ativo.nome), h('small', {}, fraseDaData(p))),
      h('span', { class: 'quanto quanto-ativo' }, formatarBRL(p.saldo), p.ganhoPct != null && textoGanho(p.ganhoPct)),
      h('span', { class: 'seta', 'aria-hidden': 'true' }, '›')))),
    g.id === 'fgts' && h('p', { class: 'nota nota-casa' }, 'O FGTS aparece aqui só para você ver junto: não entra no total.')));
  return [
    ...grupos,
    h('section', { class: 'cartao casa-lista' }, h('div', {},
      h('button', { type: 'button', class: 'casa-linha linha-acao', onclick: () => abrir('novo-ativo') },
        h('span', { class: 'icone-cat cat-casa', 'aria-hidden': 'true' }, '+'),
        h('span', { class: 'texto' }, h('b', {}, 'Adicionar investimento'), !resumo.grupos.length && h('small', {}, 'Comece pelos que você já tem na corretora')),
        h('span', { class: 'seta', 'aria-hidden': 'true' }, '›')))),
  ];
}

// "Onde ele entra?": os grupos em botões grandes com exemplo.
// Na aba "Renda fixa e outros" ficam só os grupos fora da bolsa: ações, FIIs e exterior se cadastram pela busca.
export const GRUPOS_FORA_DA_BOLSA = GRUPOS.filter((g) => !COM_COTAS.has(g));

function escolhaDoGrupo(inicial, aoEscolher, grupos = GRUPOS) {
  const caixa = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'Onde ele entra?' });
  const desenhar = (atual) => caixa.replaceChildren(...grupos.map((g) => h('button', {
    type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(g === atual), onclick: () => { desenhar(g); aoEscolher(g); },
  },
  h('span', { class: `chave-grupo grande cor-${g}`, 'aria-hidden': 'true' }),
  h('span', { class: 'texto' }, h('b', {}, NOMES_GRUPO[g]), h('small', {}, EXEMPLOS[g])),
  h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
  desenhar(inicial);
  return caixa;
}

const campoCotas = (valor, aoMudar) => h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Cotas (opcional)'),
  h('input', { class: 'entrada', type: 'number', min: '0', step: '1', inputmode: 'numeric', value: valor ?? '', placeholder: 'Ex.: 120', oninput: (e) => aoMudar(e.target.value === '' ? null : Number(e.target.value)) }),
  h('span', { class: 'campo-dica' }, 'Com as cotas, o app mostra o valor de cada uma e calcula quantas comprar.'));

// "Novo investimento": primeiro a busca (ação, FII ou ETF pelo código ou nome: o app calcula o valor sozinho com a
// cotação); "É outro tipo" mostra o formulário de antes (Tesouro, CDB, o que tem saldo digitado).
function folhaNovoInvestimento({ ctx, resumo, fechar, salvarNaFolha, folha }) {
  const { hoje } = ctx;
  const corpo = h('div', { class: 'novo-papel' }); // o conteúdo da aba escolhida
  // As duas abas do topo: ações, FIIs e ETFs (busca, valor calculado) e renda fixa e outros (saldo digitado).
  const abas = h('div', { class: 'segmentos', style: 'grid-template-columns: 1fr 1fr', role: 'tablist', 'aria-label': 'Tipo de investimento' });
  const desenharAbas = (atual) => abas.replaceChildren(...[['bolsa', 'Ações e fundos'], ['outros', 'Renda fixa e outros']].map(([id, nome]) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': String(id === atual), class: id === atual ? 'ativo' : '',
    onclick: () => { if (id !== atual) (id === 'bolsa' ? mostrarBusca() : mostrarOutros()); },
  }, nome)));
  const explicacao = (texto) => h('p', { class: 'suave pequeno' }, texto);
  // Três jeitos (desenho 2026-11-22-renda-fixa-automatica): Tesouro pela lista do dia, CDB/LCI/LCA pela taxa e o resto com
  // o saldo digitado.
  function mostrarOutros(jeito = 'tesouro') {
    desenharAbas('outros');
    const jeitos = [
      ['tesouro', 'Tesouro Direto', 'Selic, IPCA+, Prefixado: escolha o título e o app calcula pelo preço do dia.'],
      ['calculado', 'CDB, LCI ou LCA', 'Diga quanto aplicou e a taxa: o app calcula pelo CDI ou pelo IPCA.'],
      ['outro', 'Outro', 'Poupança, cripto e o resto: você digita o saldo da corretora.'],
    ];
    const escolha = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'Que tipo de investimento?' }, ...jeitos.map(([id, titulo, texto]) => h('button', {
      type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(id === jeito), onclick: () => { if (id !== jeito) mostrarOutros(id); },
    }, h('span', { class: 'texto' }, h('b', {}, titulo), h('small', {}, texto)), h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
    const conteudo = jeito === 'tesouro' ? formularioTesouro() : jeito === 'calculado' ? formularioCalculado() : formularioManual();
    corpo.replaceChildren(h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Que tipo de investimento?'), escolha), ...conteudo);
  }

  // Tesouro Direto: a lista do dia (dados-publicos/tesouro.json), a quantidade de títulos e, se souber, o total pago.
  const formularioTesouro = () => {
    const sel = { titulo: null, qtd: null, pago: null, grupo: 'rendaFixa' };
    const resultados = h('div', { class: 'resultados-busca' });
    const detalhes = h('div');
    const caixa = h('div', { class: 'campo' });
    let lista = null;
    const nota = (t) => h('p', { class: 'suave pequeno' }, t);
    const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const POPULARES = ['Tesouro Selic', 'Tesouro IPCA+', 'Tesouro Prefixado'];
    const linha = (t) => h('button', { type: 'button', class: 'casa-linha', onclick: () => escolher(t) },
      seloDoAtivo(t.tipo.replace(/^Tesouro /, '').split(' ')[0], t.tipo === 'Tesouro Selic' ? 'reserva' : 'rendaFixa'),
      h('span', { class: 'texto' }, h('b', {}, t.nome), h('small', {}, `vence em ${dataLonga(t.vencimento)}`)),
      h('span', { class: 'quanto' }, formatarBRL(t.preco)));
    async function procurar(texto) {
      if (!lista) {
        resultados.replaceChildren(nota('Carregando os títulos do Tesouro…'));
        lista = (await carregarTesouro())?.titulos ?? [];
      }
      if (!lista.length) { resultados.replaceChildren(nota('Não consegui carregar os títulos do Tesouro agora. Confira a internet, ou use "Outro".')); return; }
      const palavras = semAcento(texto).split(/\s+/).filter(Boolean);
      const achados = palavras.length
        ? lista.filter((t) => palavras.every((p) => semAcento(t.nome).includes(p)))
        : POPULARES.flatMap((tipo) => lista.filter((t) => t.tipo === tipo));
      resultados.replaceChildren(...(achados.length ? achados.slice(0, 10).map(linha) : [nota('Nenhum título com esse nome.')]));
    }
    const total = h('p', { class: 'suave' });
    const mostrarTotal = () => {
      total.textContent = sel.titulo && sel.qtd ? `${numeroCurto(sel.qtd)} × ${formatarBRL(sel.titulo.preco)} = ${formatarBRL(sel.qtd * sel.titulo.preco)} hoje` : '';
    };
    function escolher(t) {
      sel.titulo = t;
      sel.grupo = t.tipo === 'Tesouro Selic' ? 'reserva' : 'rendaFixa';
      caixa.style.display = 'none';
      resultados.replaceChildren();
      detalhes.replaceChildren(
        h('div', { class: 'casa-linha estatica' }, seloDoAtivo(t.tipo.replace(/^Tesouro /, '').split(' ')[0], sel.grupo),
          h('span', { class: 'texto' }, h('b', {}, t.nome), h('small', {}, `vence em ${dataLonga(t.vencimento)} · ${formatarBRL(t.preco)} por título`))),
        h('button', { type: 'button', class: 'botao-link', onclick: () => { sel.titulo = null; caixa.style.display = ''; detalhes.replaceChildren(); procurar(''); } }, 'Escolher outro'),
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Quantos títulos você tem?'),
          h('input', { class: 'entrada', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 1,25', oninput: (e) => { sel.qtd = numeroBr(e.target.value); mostrarTotal(); } }),
          h('span', { class: 'campo-dica' }, 'Como aparece no extrato da corretora: pode ser quebrado, como 0,47.')),
        total,
        campoMoeda({ rotulo: 'Quanto você pagou no total (opcional)', dica: 'O valor que você aplicou. Com ele o app mostra quanto você ganhou.', aoMudar: (v) => { sel.pago = v; } }),
        h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Onde ele entra?'),
          escolhaDoGrupo(sel.grupo, (g) => { sel.grupo = g; }, GRUPOS_FORA_DA_BOLSA),
          t.tipo === 'Tesouro Selic' && h('span', { class: 'campo-dica' }, 'O Tesouro Selic costuma ser a reserva de emergência: dá para resgatar em um dia.')));
    }
    caixa.append(
      h('span', { class: 'campo-rotulo' }, 'Procure o título'),
      h('input', { class: 'entrada', type: 'search', autocomplete: 'off', placeholder: 'Ex.: Selic, IPCA+ 2035, Prefixado', 'aria-label': 'Procurar título do Tesouro Direto', oninput: (e) => procurar(e.target.value) }),
      h('span', { class: 'campo-dica' }, 'Os preços vêm do Tesouro Direto (dados públicos, atualizados todo dia útil).'));
    procurar('');
    return [caixa, resultados, detalhes,
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Adicionar', () => {
        const t = sel.titulo;
        if (!t) { ctx.aviso('Escolha o título na lista.', 'atencao', 3000); return; }
        if (!sel.qtd) { ctx.aviso('Digite quantos títulos você tem.', 'atencao', 3000); return; }
        if (resumo.posicoes.some((p) => p.ativo.ticker === t.nome || p.ativo.nome === t.nome)) {
          ctx.aviso(`${t.nome} já está na carteira. Abra-o em Ativos para registrar uma compra.`, 'atencao', 4500);
          return;
        }
        salvarNaFolha((e) => novoPapel(e, {
          ticker: t.nome, nome: `vence em ${dataLonga(t.vencimento)}`, grupo: sel.grupo, fonte: 'tesouro', cotas: sel.qtd,
          preco: sel.pago ? sel.pago / sel.qtd : null, cotacao: t.preco, hoje,
        }).estado, `${t.nome} entrou na carteira.`, folha);
      }))];
  };

  // CDB, LCI, LCA: quanto aplicou, quando e como rende; o app calcula pelo CDI ou pelo IPCA do Banco Central.
  const formularioCalculado = () => {
    const novo = { tipo: 'cdb', nome: '', valor: null, data: hoje, indexador: 'cdi', taxa: null, vencimento: null, grupo: 'rendaFixa' };
    const TIPOS = [['cdb', 'CDB'], ['lci', 'LCI'], ['lca', 'LCA'], ['outro', 'Outro']];
    const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Tipo' });
    const desenharChips = () => chips.replaceChildren(...TIPOS.map(([id, nome]) => h('button', {
      type: 'button', class: `chip${novo.tipo === id ? ' ativo' : ''}`, role: 'radio', 'aria-checked': String(novo.tipo === id), onclick: () => { novo.tipo = id; desenharChips(); },
    }, nome)));
    desenharChips();
    const JEITOS = {
      cdi: ['% do CDI', 'O mais comum (ex.: 110% do CDI).', 'Quantos % do CDI?', 'Ex.: 110', '100% do CDI rende quase igual à Selic.'],
      ipca: ['IPCA +', 'A inflação mais uma taxa (ex.: IPCA + 6%).', 'IPCA mais quanto ao ano?', 'Ex.: 6', 'Só a parte fixa, em % ao ano.'],
      pre: ['Prefixado', 'Uma taxa fixa (ex.: 12% ao ano).', 'Quanto ao ano?', 'Ex.: 12', 'Em % ao ano.'],
    };
    const rotuloTaxa = h('span', { class: 'campo-rotulo' });
    const dicaTaxa = h('span', { class: 'campo-dica' });
    const entradaTaxa = h('input', { class: 'entrada', type: 'text', inputmode: 'decimal', autocomplete: 'off', oninput: (e) => { novo.taxa = numeroBr(e.target.value); } });
    const indexadores = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'Como ele rende?' });
    const desenharIndexadores = () => {
      indexadores.replaceChildren(...Object.entries(JEITOS).map(([id, [titulo, texto]]) => h('button', {
        type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(novo.indexador === id), onclick: () => { novo.indexador = id; desenharIndexadores(); },
      }, h('span', { class: 'texto' }, h('b', {}, titulo), h('small', {}, texto)), h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
      const [, , rotulo, exemplo, dica] = JEITOS[novo.indexador];
      rotuloTaxa.textContent = rotulo;
      entradaTaxa.placeholder = exemplo;
      dicaTaxa.textContent = dica;
    };
    desenharIndexadores();
    const data = (rotulo, valor, aoMudar, dica) => h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo),
      h('input', { class: 'entrada', type: 'date', value: valor ?? '', ...(valor ? { min: PRIMEIRO_DIA, max: hoje } : {}), oninput: (e) => aoMudar(e.target.value || null) }),
      dica && h('span', { class: 'campo-dica' }, dica));
    return [
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Tipo'), chips),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: CDB Banco Inter 2028', oninput: (e) => { novo.nome = e.target.value.trim(); } })),
      campoMoeda({ rotulo: 'Quanto você aplicou?', aoMudar: (v) => { novo.valor = v; } }),
      data('Quando?', hoje, (v) => { novo.data = v; }),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Como ele rende?'), indexadores),
      h('label', { class: 'campo' }, rotuloTaxa, entradaTaxa, dicaTaxa),
      data('Vencimento (opcional)', null, (v) => { novo.vencimento = v; }, 'Só para lembrar: o app não resgata sozinho.'),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Onde ele entra?'), escolhaDoGrupo(novo.grupo, (g) => { novo.grupo = g; }, GRUPOS_FORA_DA_BOLSA)),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Adicionar', () => {
        if (!novo.nome) { ctx.aviso('Escreva um nome (ex.: CDB do banco e o ano).', 'atencao', 3000); return; }
        if (!(novo.valor > 0)) { ctx.aviso('Digite quanto você aplicou.', 'atencao', 3000); return; }
        if (!dataValida(novo.data, hoje)) { ctx.aviso('Confira a data da aplicação: de 2000 até hoje.', 'atencao', 3500); return; }
        if (!novo.taxa) { ctx.aviso('Digite a taxa.', 'atencao', 3000); return; }
        const rendaFixa = { tipo: novo.tipo, indexador: novo.indexador, taxa: novo.taxa / 100, vencimento: novo.vencimento };
        salvarNaFolha((e) => novoTituloCalculado(e, { nome: novo.nome, grupo: novo.grupo, rendaFixa, valor: novo.valor, data: novo.data, series: seriesDaRendaFixa(e), hoje }).estado,
          `${novo.nome} entrou na carteira.`, folha);
      })),
    ];
  };

  const formularioManual = () => {
    const novo = { nome: '', grupo: 'rendaFixa', saldo: null, cotas: null };
    const cotas = h('div', {}, campoCotas(null, (v) => { novo.cotas = v; }));
    return [
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: Tesouro IPCA+ 2035, CDB do banco', oninput: (e) => { novo.nome = e.target.value.trim(); } }),
        h('span', { class: 'campo-dica' }, 'Para ações e fundos que você compra pela corretora, é mais fácil procurar pelo código na busca.')),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Onde ele entra?'),
        escolhaDoGrupo(novo.grupo, (g) => { novo.grupo = g; cotas.hidden = !COM_COTAS.has(g); }, GRUPOS_FORA_DA_BOLSA)),
      campoMoeda({ rotulo: 'Saldo hoje (opcional)', dica: 'Copie da corretora. Sem ele, o saldo vem dos aportes.', aoMudar: (v) => { novo.saldo = v; } }),
      (() => { cotas.hidden = !COM_COTAS.has(novo.grupo); return cotas; })(),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Adicionar', () => {
        if (!novo.nome) { ctx.aviso('Escreva o nome do investimento.', 'atencao', 3000); return; }
        salvarNaFolha((e) => adicionarAtivo(e, { ...novo, cotas: COM_COTAS.has(novo.grupo) ? novo.cotas : null, hoje }).estado, `${novo.nome} entrou na carteira.`, folha);
      })),
    ];
  };

  function mostrarBusca() {
    const sel = { escolhido: null, cotas: null, pago: null };
    let tempo = null;
    let vez = 0;
    const resultados = h('div', { class: 'resultados-busca' });
    const detalhes = h('div');
    const caixaBusca = h('div', { class: 'campo' });

    const aviso = (texto) => h('p', { class: 'suave pequeno' }, texto);
    const linhaResultado = (s) => h('button', { type: 'button', class: 'casa-linha', onclick: () => escolher(s) },
      seloDoAtivo(s.ticker, grupoDoTipo({ type: s.tipo, subType: s.subTipo })),
      h('span', { class: 'texto' }, h('b', {}, s.ticker), h('small', {}, s.nome)),
      s.preco != null && h('span', { class: 'quanto' }, formatarBRL(s.preco)));

    const procurar = (texto) => {
      clearTimeout(tempo);
      vez += 1;
      const minha = vez;
      if (texto.length < 2) { resultados.replaceChildren(); return; }
      resultados.replaceChildren(aviso('Procurando…'));
      tempo = setTimeout(async () => {
        const lista = await buscarSugestoes(texto, { fetch: (...a) => globalThis.fetch(...a) });
        if (minha !== vez) return;
        resultados.replaceChildren(...(lista.length ? lista.map(linhaResultado)
          : [aviso('Não achei. Confira o código ou a internet. Se for Tesouro, CDB ou outro tipo, use a aba "Renda fixa e outros".')]));
      }, 350);
    };

    const total = h('p', { class: 'suave' });
    const mostrarTotal = () => {
      const preco = sel.escolhido?.preco;
      total.textContent = preco && sel.cotas > 0 ? `${sel.cotas.toLocaleString('pt-BR')} × ${formatarBRL(preco)} = ${formatarBRL(sel.cotas * preco)} hoje` : '';
    };
    function escolher(s) {
      sel.escolhido = { ...s, grupo: grupoDoTipo({ type: s.tipo, subType: s.subTipo }) };
      resultados.replaceChildren();
      caixaBusca.style.display = 'none'; // .campo é flex: `hidden` sozinho não esconde
      desenharDetalhes();
    }
    function desfazer() {
      sel.escolhido = null;
      caixaBusca.style.display = '';
      detalhes.replaceChildren();
    }
    function desenharDetalhes() {
      const s = sel.escolhido;
      detalhes.replaceChildren(
        h('div', { class: 'casa-linha estatica' }, seloDoAtivo(s.ticker, s.grupo),
          h('span', { class: 'texto' }, h('b', {}, s.ticker), h('small', {}, `${s.nome} · ${NOMES_GRUPO[s.grupo]}`)),
          s.preco != null && h('span', { class: 'quanto' }, formatarBRL(s.preco))),
        h('button', { type: 'button', class: 'botao-link', onclick: desfazer }, 'Escolher outro'),
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Quantas cotas você tem?'),
          h('input', { class: 'entrada', type: 'number', min: '1', step: '1', inputmode: 'numeric', placeholder: 'Ex.: 12', oninput: (e) => { sel.cotas = e.target.value === '' ? null : Number(e.target.value); mostrarTotal(); } }),
          h('span', { class: 'campo-dica' }, 'Só o número de cotas: o valor em reais o app calcula.')),
        total,
        campoMoeda({ rotulo: 'Preço de cada cota que você pagou (opcional)', dica: 'Com ele o app mostra quanto você ganhou. Sem ele, não mostra ganho.', aoMudar: (v) => { sel.pago = v; } }));
    }

    caixaBusca.append(
      h('span', { class: 'campo-rotulo' }, 'Procure pelo código ou nome'),
      h('input', { class: 'entrada', type: 'search', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'Ex.: ITUB4, MXRF11, Itaú', 'aria-label': 'Procurar ação, fundo imobiliário ou ETF', oninput: (e) => procurar(e.target.value.trim()) }),
      h('span', { class: 'campo-dica' }, 'Ações, fundos imobiliários e ETFs da bolsa. O app consulta o preço no brapi.dev usando só o código do papel (ex.: ITUB4).'));

    desenharAbas('bolsa');
    corpo.replaceChildren(
      caixaBusca, resultados, detalhes,
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Adicionar', () => {
        const s = sel.escolhido;
        if (!s) { ctx.aviso('Procure e escolha o investimento na lista.', 'atencao', 3500); return; }
        if (!(Number.isInteger(sel.cotas) && sel.cotas >= 1)) { ctx.aviso('Digite quantas cotas você tem.', 'atencao', 3000); return; }
        if (resumo.posicoes.some((p) => p.ativo.ticker === s.ticker || p.ativo.nome === s.ticker)) {
          ctx.aviso(`${s.ticker} já está na carteira. Abra-o em Ativos para registrar uma compra.`, 'atencao', 4500);
          return;
        }
        if (s.preco) guardarCotacao(s.ticker, s.preco);
        salvarNaFolha((e) => novoPapel(e, { ticker: s.ticker, nome: s.nome, grupo: s.grupo, cotas: sel.cotas, preco: sel.pago, cotacao: s.preco, hoje }).estado,
          `${s.ticker} entrou na carteira.`, folha);
      })),
    );
  }

  mostrarBusca();
  return [h('h2', {}, 'Novo investimento'), abas, corpo];
}

// O conteúdo da folha aberta (ou null): `ativo-<id>`, `editar-<id>` ou `novo-ativo`.
export function folhaDeAtivos(folha, { ctx, resumo, fechar, salvarNaFolha }) {
  const { hoje } = ctx;
  const mes = hoje.slice(0, 7);
  if (folha === 'novo-ativo') return folhaNovoInvestimento({ ctx, resumo, fechar, salvarNaFolha, folha });
  const [tipo, ...resto] = folha.split('-');
  const id = resto.join('-');
  const p = resumo.posicoes.find((x) => x.ativo.id === id);
  if (!p) return null;
  if (tipo === 'editar') {
    const edicao = { nome: p.ativo.nome, grupo: p.grupo };
    return [
      h('h2', {}, `Editar ${p.ativo.nome}`),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { class: 'entrada', type: 'text', autocomplete: 'off', value: p.ativo.nome, oninput: (e) => { edicao.nome = e.target.value.trim(); } })),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Onde ele entra?'), escolhaDoGrupo(edicao.grupo, (g) => { edicao.grupo = g; })),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Salvar', () => {
        if (!edicao.nome) { ctx.aviso('Escreva o nome do investimento.', 'atencao', 3000); return; }
        salvarNaFolha((e) => editarAtivo(e, id, edicao), 'Investimento salvo.', folha);
      })),
      botaoDoisToques('Tirar este investimento', 'Toque de novo: os saldos dele saem junto', () => salvarNaFolha((e) => tirarAtivo(e, id), `${p.ativo.nome} saiu da carteira.`, folha)),
    ];
  }
  if (tipo !== 'ativo') return null;
  if (tituloCalculado(p.ativo)) return folhaDoTitulo(p, { ctx, fechar, salvarNaFolha, folha, id });
  const auto = papelAutomatico(p.ativo);
  const tesouro = p.ativo.fonte === 'tesouro';
  const unidade = (n) => (tesouro ? (n === 1 ? 'título' : 'títulos') : (n === 1 ? 'cota' : 'cotas'));
  const atualizado = { valor: null, cotas: p.cotas };
  const comCotas = COM_COTAS.has(p.grupo) || auto;
  const numero = (rotulo, valor, detalhe) => h('div', { class: 'numero-ativo' }, h('span', { class: 'rotulo' }, rotulo), h('b', {}, valor), detalhe && h('small', {}, detalhe));
  const doTesouro = tesouro ? precoDoTesouro(p.ativo.ticker) : null;
  const cotacao = tesouro ? (doTesouro && { preco: doTesouro.preco, em: lerTesouro()?.data }) : lerCotacoes()[p.ativo.ticker];
  const precoHoje = cotacao?.preco ?? p.valorCota;
  const rotuloDoHistorico = (x) => (x.tipo === 'saldo' ? 'Saldo informado' : x.tipo === 'aporte' ? 'Aporte' : x.tipo === 'resgate' ? 'Resgate'
    : `${x.tipo === 'compra' ? 'Comprou' : 'Vendeu'} ${Math.abs(x.cotas).toLocaleString('pt-BR')} ${unidade(Math.abs(x.cotas))}`);
  const valorDoHistorico = (x) => (x.tipo === 'saldo' ? formatarBRL(x.valor) : x.tipo === 'compra' || x.tipo === 'venda' ? (x.valor != null ? `${formatarBRL(x.valor)}` : 'sem preço')
    : `${x.valor > 0 ? '+' : '−'}${formatarBRL(Math.abs(x.valor))}`);
  const blocoSaldo = [
    h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Atualizar o saldo'),
      campoMoeda({ rotulo: 'Saldo na corretora hoje', aoMudar: (v) => { atualizado.valor = v; } }),
      comCotas && campoCotas(p.cotas, (v) => { atualizado.cotas = v; })),
    h('div', { class: 'botoes' }, botao('Fechar', fechar, { secundario: true }), botao('Salvar saldo', () => {
      if (atualizado.valor == null) { ctx.aviso('Digite o saldo de hoje.', 'atencao', 3000); return; }
      const saldo = { ativoId: id, valor: atualizado.valor, cotas: comCotas ? atualizado.cotas : null };
      salvarNaFolha((e) => registrarSaldos(e, { data: hoje, saldos: saldosParaGravar({ estado: e, mes, hoje, saldos: [saldo] }) }), 'Saldo salvo.', folha);
    })),
  ];
  // Papel com cotação automática: o saldo se atualiza sozinho; aqui só se muda a quantidade.
  const blocoQuantidade = (() => {
    const mud = { venda: false, cotas: null, preco: null, total: null };
    const sentido = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'O que mudou?' });
    const desenharSentido = () => sentido.replaceChildren(...[[false, 'Comprei mais', 'Entrou mais deste papel na corretora.'], [true, 'Vendi', 'Saiu parte deste papel.']].map(([venda, titulo, texto]) => h('button', {
      type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(mud.venda === venda), onclick: () => { mud.venda = venda; desenharSentido(); },
    }, h('span', { class: 'texto' }, h('b', {}, titulo), h('small', {}, texto)), h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
    desenharSentido();
    return [
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Mudou a quantidade?'), sentido),
      tesouro
        ? h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Quantos títulos?'),
          h('input', { class: 'entrada', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 0,5', oninput: (e) => { mud.cotas = numeroBr(e.target.value); } }))
        : h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Quantas cotas?'),
          h('input', { class: 'entrada', type: 'number', min: '1', step: '1', inputmode: 'numeric', placeholder: 'Ex.: 10', oninput: (e) => { mud.cotas = e.target.value === '' ? null : Number(e.target.value); } })),
      tesouro
        ? campoMoeda({ rotulo: 'Quanto foi no total (opcional)', dica: 'O valor da compra ou da venda. Com ele o app mostra o ganho.', aoMudar: (v) => { mud.total = v; } })
        : campoMoeda({ rotulo: 'Preço de cada cota (opcional)', dica: 'O que você pagou. Com ele o app mostra o ganho; sem ele, não mostra.', aoMudar: (v) => { mud.preco = v; } }),
      h('div', { class: 'botoes' }, botao('Fechar', fechar, { secundario: true }), botao('Registrar', () => {
        if (tesouro ? !(mud.cotas > 0) : !(Number.isInteger(mud.cotas) && mud.cotas >= 1)) { ctx.aviso(`Digite quantos ${tesouro ? 'títulos' : 'cotas'}.`, 'atencao', 3000); return; }
        if (mud.venda && mud.cotas > (p.cotas ?? 0) + 1e-9) { ctx.aviso(`Você só tem ${(p.cotas ?? 0).toLocaleString('pt-BR')} ${unidade(p.cotas)}.`, 'atencao', 3500); return; }
        const preco = tesouro ? (mud.total ? mud.total / mud.cotas : null) : mud.preco;
        salvarNaFolha((e) => registrarCompra(e, id, { cotas: mud.venda ? -mud.cotas : mud.cotas, preco, cotacao: precoHoje, hoje }),
          mud.venda ? 'Venda registrada.' : 'Compra registrada.', folha);
      })),
    ];
  })();
  return [
    h('div', { class: 'folha-perfil-topo' }, seloDoAtivo(p.ativo.nome, p.grupo),
      h('div', {}, h('h2', {}, p.ativo.nome), h('small', { class: 'suave' }, `${NOMES_GRUPO[p.grupo]} · ${fraseDaData(p)}`))),
    auto && p.ativo.descricao && p.ativo.descricao !== p.ativo.nome && h('p', { class: 'suave pequeno' }, p.ativo.descricao),
    h('div', { class: 'numeros-ativo' },
      numero('Saldo', formatarBRL(p.saldo)),
      numero('Aplicado', formatarBRL(p.aplicado)),
      numero('Ganho', p.ganho == null ? '—' : `${p.ganho >= 0 ? '+' : '−'}${formatarBRL(Math.abs(p.ganho))}`,
        p.ganhoPct != null ? `${p.ganhoPct >= 0 ? '+' : '−'}${formatarPct(Math.abs(p.ganhoPct), 1)}`
          : auto ? 'informe o preço que pagou' : 'na segunda atualização'),
      comCotas && numero(tesouro ? 'Títulos' : 'Cotas', (p.cotas ?? p.cotasNoSaldo)?.toLocaleString('pt-BR') ?? '—',
        auto ? [precoHoje && `${formatarBRL(precoHoje)} ${tesouro ? 'por título' : 'cada'}`, cotacao?.em && `${tesouro ? 'preço' : 'cotação'} de ${dataCurta(cotacao.em.slice(0, 10))}`].filter(Boolean).join(' · ') || null
          : [p.cotas == null && p.cotasNoSaldo && `em ${dataCurta(p.dataSaldo)}`, p.valorCota && `${formatarBRL(p.valorCota)} cada`].filter(Boolean).join(' · ') || null)),
    ...(auto ? blocoQuantidade : blocoSaldo),
    p.historico.length > 0 && h('div', { class: 'historico-ativo' }, h('h3', {}, 'Histórico'),
      ...p.historico.slice(0, 8).map((x) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, rotuloDoHistorico(x)), h('small', {}, dataCurta(x.data))),
        h('div', { class: 'quanto' }, valorDoHistorico(x))))),
    h('div', { class: 'botoes' }, botao('Editar nome ou onde ele entra', () => location.replace(location.hash.replace(`folha=${folha}`, `folha=editar-${id}`)), { secundario: true })),
  ];
}

// CDB, LCI, LCA: valor bruto, aplicado, ganho e líquido estimado; "Apliquei mais" e "Resgatei" com valor e data.
function folhaDoTitulo(p, { ctx, fechar, salvarNaFolha, folha, id }) {
  const { hoje } = ctx;
  const rf = p.ativo.rendaFixa;
  const isento = rf.tipo === 'lci' || rf.tipo === 'lca';
  const liquido = liquidoEstimado(ctx.estado, p.ativo, seriesDaRendaFixa(ctx.estado), hoje);
  const taxa = numeroCurto(rf.taxa * 100);
  const rende = rf.indexador === 'cdi' ? `${taxa}% do CDI` : rf.indexador === 'ipca' ? `IPCA + ${taxa}% ao ano` : `${taxa}% ao ano`;
  const tipo = { cdb: 'CDB', lci: 'LCI', lca: 'LCA', outro: 'Renda fixa' }[rf.tipo] ?? 'Renda fixa';
  const numero = (rotulo, valor, detalhe) => h('div', { class: 'numero-ativo' }, h('span', { class: 'rotulo' }, rotulo), h('b', {}, valor), detalhe && h('small', {}, detalhe));
  const mud = { resgate: false, valor: null, data: hoje };
  const sentido = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'O que mudou?' });
  const desenharSentido = () => sentido.replaceChildren(...[[false, 'Apliquei mais', 'Colocou mais dinheiro neste investimento.'], [true, 'Resgatei', 'Tirou dinheiro dele.']].map(([resgate, titulo, texto]) => h('button', {
    type: 'button', class: 'opcao', role: 'radio', 'aria-checked': String(mud.resgate === resgate), onclick: () => { mud.resgate = resgate; desenharSentido(); },
  }, h('span', { class: 'texto' }, h('b', {}, titulo), h('small', {}, texto)), h('span', { class: 'opcao-marca', 'aria-hidden': 'true' }))));
  desenharSentido();
  return [
    h('div', { class: 'folha-perfil-topo' }, seloDoAtivo(p.ativo.nome, p.grupo),
      h('div', {}, h('h2', {}, p.ativo.nome), h('small', { class: 'suave' }, `${NOMES_GRUPO[p.grupo]} · ${fraseDaData(p)}`))),
    h('p', { class: 'suave pequeno' }, `${tipo} · rende ${rende}${rf.vencimento ? ` · vence em ${dataLonga(rf.vencimento)}` : ''}`),
    h('div', { class: 'numeros-ativo' },
      numero('Valor bruto', formatarBRL(p.saldo)),
      numero('Aplicado', formatarBRL(p.aplicado)),
      numero('Ganho', p.ganho == null ? '—' : `${p.ganho >= 0 ? '+' : '−'}${formatarBRL(Math.abs(p.ganho))}`,
        p.ganhoPct != null ? `${p.ganhoPct >= 0 ? '+' : '−'}${formatarPct(Math.abs(p.ganhoPct), 1)}` : null),
      numero('Líquido', formatarBRL(isento ? p.saldo : liquido), isento ? 'isento de IR' : 'se resgatar hoje, com IR')),
    h('p', { class: 'nota' }, 'Estimado pela taxa e pelo CDI e IPCA do Banco Central: pode ficar um pouco diferente do extrato.'),
    h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Mudou alguma coisa?'), sentido),
    campoMoeda({ rotulo: 'Quanto?', aoMudar: (v) => { mud.valor = v; } }),
    h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Quando?'),
      h('input', { class: 'entrada', type: 'date', value: hoje, min: PRIMEIRO_DIA, max: hoje, oninput: (e) => { mud.data = e.target.value || null; } })),
    h('div', { class: 'botoes' }, botao('Fechar', fechar, { secundario: true }), botao('Registrar', () => {
      if (!(mud.valor > 0)) { ctx.aviso('Digite o valor.', 'atencao', 3000); return; }
      if (!dataValida(mud.data, hoje)) { ctx.aviso('Confira a data: de 2000 até hoje.', 'atencao', 3500); return; }
      if (mud.resgate && mud.valor > p.saldo + 0.005) { ctx.aviso(`O valor de hoje é ${formatarBRL(p.saldo)}.`, 'atencao', 3500); return; }
      salvarNaFolha((e) => aplicarRendaFixa(registrarAplicacao(e, id, { valor: mud.resgate ? -mud.valor : mud.valor, data: mud.data }), seriesDaRendaFixa(e), hoje),
        mud.resgate ? 'Resgate registrado.' : 'Aplicação registrada.', folha);
    })),
    p.historico.length > 0 && h('div', { class: 'historico-ativo' }, h('h3', {}, 'Histórico'),
      ...p.historico.slice(0, 8).map((x) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, x.valor > 0 ? 'Aplicação' : 'Resgate'), h('small', {}, dataCurta(x.data))),
        h('div', { class: 'quanto' }, `${x.valor > 0 ? '+' : '−'}${formatarBRL(Math.abs(x.valor))}`)))),
    h('div', { class: 'botoes' }, botao('Editar nome ou onde ele entra', () => location.replace(location.hash.replace(`folha=${folha}`, `folha=editar-${id}`)), { secundario: true })),
  ];
}
