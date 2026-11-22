// Carteira › Ativos (desenho 2026-11-22-carteira): a lista agrupada por classe, como nos apps de investimento, e as
// folhas do ativo (posição, atualizar saldo, histórico), de adicionar e de editar. O cadastro saiu dos Ajustes do plano.
import { h, botao, campoMoeda } from './dom.js';
import { botaoDoisToques } from './casa-cartao.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { registrarSaldos } from '../core/motor.js';
import { saldosParaGravar, dataCurta } from '../core/lista-mes.js';
import { adicionarAtivo, editarAtivo, tirarAtivo, GRUPOS } from '../core/carteira.js';

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
  return [p.cotas != null && `${p.cotas.toLocaleString('pt-BR')} cotas`, quando].filter(Boolean).join(' · ');
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
function escolhaDoGrupo(inicial, aoEscolher) {
  const caixa = h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'Onde ele entra?' });
  const desenhar = (atual) => caixa.replaceChildren(...GRUPOS.map((g) => h('button', {
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

// O conteúdo da folha aberta (ou null): `ativo-<id>`, `editar-<id>` ou `novo-ativo`.
export function folhaDeAtivos(folha, { ctx, resumo, fechar, salvarNaFolha }) {
  const { hoje } = ctx;
  const mes = hoje.slice(0, 7);
  if (folha === 'novo-ativo') {
    const novo = { nome: '', grupo: 'rendaFixa', saldo: null, cotas: null };
    const cotas = h('div', {}, campoCotas(null, (v) => { novo.cotas = v; }));
    return [
      h('h2', {}, 'Novo investimento'),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: XFIX11, Tesouro IPCA+ 2035', oninput: (e) => { novo.nome = e.target.value.trim(); } })),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Onde ele entra?'),
        escolhaDoGrupo(novo.grupo, (g) => { novo.grupo = g; cotas.hidden = !COM_COTAS.has(g); })),
      campoMoeda({ rotulo: 'Saldo hoje (opcional)', dica: 'Copie da corretora. Sem ele, o saldo vem dos aportes.', aoMudar: (v) => { novo.saldo = v; } }),
      (() => { cotas.hidden = !COM_COTAS.has(novo.grupo); return cotas; })(),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), botao('Adicionar', () => {
        if (!novo.nome) { ctx.aviso('Escreva o nome do investimento.', 'atencao', 3000); return; }
        salvarNaFolha((e) => adicionarAtivo(e, { ...novo, cotas: COM_COTAS.has(novo.grupo) ? novo.cotas : null, hoje }).estado, `${novo.nome} entrou na carteira.`, folha);
      })),
    ];
  }
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
  const atualizado = { valor: null, cotas: p.cotas };
  const comCotas = COM_COTAS.has(p.grupo);
  const numero = (rotulo, valor, detalhe) => h('div', { class: 'numero-ativo' }, h('span', { class: 'rotulo' }, rotulo), h('b', {}, valor), detalhe && h('small', {}, detalhe));
  return [
    h('div', { class: 'folha-perfil-topo' }, seloDoAtivo(p.ativo.nome, p.grupo),
      h('div', {}, h('h2', {}, p.ativo.nome), h('small', { class: 'suave' }, `${NOMES_GRUPO[p.grupo]} · ${fraseDaData(p)}`))),
    h('div', { class: 'numeros-ativo' },
      numero('Saldo', formatarBRL(p.saldo)),
      numero('Aplicado', formatarBRL(p.aplicado)),
      numero('Ganho', p.ganho == null ? '—' : `${p.ganho >= 0 ? '+' : '−'}${formatarBRL(Math.abs(p.ganho))}`,
        p.ganhoPct == null ? 'na segunda atualização' : `${p.ganhoPct >= 0 ? '+' : '−'}${formatarPct(Math.abs(p.ganhoPct), 1)}`),
      comCotas && numero('Cotas', (p.cotas ?? p.cotasNoSaldo)?.toLocaleString('pt-BR') ?? '—',
        [p.cotas == null && p.cotasNoSaldo && `em ${dataCurta(p.dataSaldo)}`, p.valorCota && `${formatarBRL(p.valorCota)} cada`].filter(Boolean).join(' · ') || null)),
    h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Atualizar o saldo'),
      campoMoeda({ rotulo: 'Saldo na corretora hoje', aoMudar: (v) => { atualizado.valor = v; } }),
      comCotas && campoCotas(p.cotas, (v) => { atualizado.cotas = v; })),
    h('div', { class: 'botoes' }, botao('Fechar', fechar, { secundario: true }), botao('Salvar saldo', () => {
      if (atualizado.valor == null) { ctx.aviso('Digite o saldo de hoje.', 'atencao', 3000); return; }
      const saldo = { ativoId: id, valor: atualizado.valor, cotas: comCotas ? atualizado.cotas : null };
      salvarNaFolha((e) => registrarSaldos(e, { data: hoje, saldos: saldosParaGravar({ estado: e, mes, hoje, saldos: [saldo] }) }), 'Saldo salvo.', folha);
    })),
    p.historico.length > 0 && h('div', { class: 'historico-ativo' }, h('h3', {}, 'Histórico'),
      ...p.historico.slice(0, 8).map((x) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, x.tipo === 'saldo' ? 'Saldo informado' : x.tipo === 'aporte' ? 'Aporte' : 'Resgate'), h('small', {}, dataCurta(x.data))),
        h('div', { class: 'quanto' }, x.tipo === 'saldo' ? formatarBRL(x.valor) : `${x.valor > 0 ? '+' : '−'}${formatarBRL(Math.abs(x.valor))}`)))),
    h('div', { class: 'botoes' }, botao('Editar nome ou onde ele entra', () => location.replace(location.hash.replace(`folha=${folha}`, `folha=editar-${id}`)), { secundario: true })),
  ];
}
