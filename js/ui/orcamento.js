// Orçamento: categorias mensais e anuais, com o impacto de cada mudança na data da renda plena.
import { h, campoMoeda, cartao, botao, aviso } from './dom.js';
import { formatarBRL } from '../core/formato.js';
import { formatarMes } from '../core/meses.js';
import { custoDeVida, CATEGORIAS_SUGERIDAS } from '../core/metas.js';
import { taxaMensal } from '../core/financas.js';
import { impactoNoPrazo } from '../core/projecao.js';
import { calcularPainel } from '../core/motor.js';
import { novoId } from '../core/esquema.js';

function textoImpacto(deltaMensal, meses, tipo, deltaOriginal) {
  if (Math.abs(deltaMensal) < 0.005) return '';
  const sinal = deltaOriginal > 0 ? '+' : '−';
  const valor = `${sinal}${formatarBRL(Math.abs(deltaOriginal))}/${tipo === 'anual' ? 'ano' : 'mês'}`;
  if (meses === null) return `${valor}: a meta deixa de ser alcançada nesse ritmo`;
  if (meses === 0) return `${valor}: quase não muda a data`;
  return `${valor} = ${Math.abs(meses)} ${Math.abs(meses) === 1 ? 'mês' : 'meses'} ${meses > 0 ? 'mais tarde' : 'mais cedo'}`;
}

export function render(container, ctx) {
  const { estado, hoje } = ctx;
  const mes = hoje.slice(0, 7);
  const painel = calcularPainel({ estado, hoje });
  const base = {
    patrimonio: painel.patrimonio,
    aporteMensal: painel.ritmo.valor,
    i: taxaMensal(estado.config.rentabilidadeReal),
    metaRendaPlena: painel.metas.rendaPlena,
  };
  const original = new Map(estado.orcamento.map((c) => [c.id, c.valor]));
  const rascunho = estado.orcamento.map((c) => ({ ...c }));

  const topo = h('div');
  const listas = h('div', { style: 'display:flex;flex-direction:column;gap:12px' });

  const delta = (c) => {
    const d = (c.valor ?? 0) - (original.get(c.id) ?? 0);
    return { original: d, mensal: c.tipo === 'anual' ? d / 12 : d };
  };
  const impacto = (deltaMensal) => impactoNoPrazo({ ...base, deltaCustoMensal: deltaMensal });

  function atualizarTopo() {
    const custo = custoDeVida(rascunho.map((c) => ({ ...c, valor: c.valor ?? 0 })));
    const totalDelta = rascunho.reduce((s, c) => s + delta(c).mensal, 0)
      - [...original.keys()].filter((id) => !rascunho.some((c) => c.id === id))
        .reduce((s, id) => s + (estado.orcamento.find((c) => c.id === id).tipo === 'anual' ? original.get(id) / 12 : original.get(id)), 0);
    const efeito = Math.abs(totalDelta) >= 0.005 ? impacto(totalDelta) : 0;
    topo.replaceChildren(cartao(
      h('div', { class: 'rotulo' }, 'Seu custo de vida'),
      h('div', { class: 'valor-grande' }, `${formatarBRL(custo.total)}/mês`),
      h('div', { class: 'suave pequeno' }, `${formatarBRL(custo.mensal)} por mês + ${formatarBRL(custo.anual)} por ano em despesas anuais`),
      Math.abs(totalDelta) >= 0.005 && h('div', { style: 'margin-top:8px' }, aviso(efeito === null || efeito > 0 ? 'atencao' : 'ok',
        `Com as mudanças: ${textoImpacto(totalDelta, efeito, 'mensal', totalDelta)}. Salve para aplicar.`))));
  }

  function linhaCategoria(c) {
    const efeito = h('small', { class: 'suave' });
    const atualizarEfeito = () => {
      const d = delta(c);
      efeito.textContent = textoImpacto(d.mensal, Math.abs(d.mensal) >= 0.005 ? impacto(d.mensal) : 0, c.tipo, d.original);
    };
    atualizarEfeito();
    return h('div', { class: 'linha', style: 'flex-wrap:wrap' },
      h('div', { class: 'nome' }, h('span', {}, c.nome), efeito),
      h('div', { style: 'display:flex;gap:6px;align-items:center' },
        h('div', { style: 'width:150px' }, campoMoeda({ rotulo: null, valor: c.valor, aoMudar: (v) => { c.valor = v; atualizarEfeito(); atualizarTopo(); } })),
        h('button', { type: 'button', class: 'chip', 'aria-label': `Remover ${c.nome}`, onclick: () => { rascunho.splice(rascunho.indexOf(c), 1); desenhar(); } }, '✕')));
  }

  function desenhar() {
    const grupo = (tipo, titulo) => {
      const itens = rascunho.filter((c) => c.tipo === tipo);
      return cartao(h('h2', {}, titulo), ...(itens.length ? itens.map(linhaCategoria) : [h('p', { class: 'suave' }, 'Nenhuma categoria.')]));
    };
    const presentes = new Set(rascunho.map((c) => c.nome));
    const sugestao = h('select', { class: 'entrada' }, h('option', { value: '' }, 'Escolha uma sugestão...'),
      ...CATEGORIAS_SUGERIDAS.filter((c) => !presentes.has(c.nome)).map((c) => h('option', { value: c.id }, `${c.nome} (${c.tipo})`)));
    const nome = h('input', { class: 'entrada', placeholder: 'ou digite um nome' });
    const tipo = h('select', { class: 'entrada' }, h('option', { value: 'mensal' }, 'Mensal'), h('option', { value: 'anual' }, 'Anual'));
    listas.replaceChildren(
      grupo('mensal', 'Gastos mensais'),
      grupo('anual', 'Gastos anuais'),
      cartao(h('h3', {}, 'Adicionar categoria'),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, sugestao, nome, tipo,
          botao('Adicionar', () => {
            const s = CATEGORIAS_SUGERIDAS.find((c) => c.id === sugestao.value);
            const novoNome = s?.nome ?? nome.value.trim();
            if (!novoNome) return;
            rascunho.push({ id: novoId(), nome: novoNome, tipo: s?.tipo ?? tipo.value, valor: null, mes });
            desenhar();
          }, { secundario: true }))));
    atualizarTopo();
  }

  const salvar = botao('Salvar orçamento', async () => {
    salvar.disabled = true;
    const final = rascunho.filter((c) => (c.valor ?? 0) > 0)
      .map((c) => (c.valor !== original.get(c.id) ? { ...c, mes } : c));
    await ctx.salvar((e) => ({ ...e, orcamento: final, config: { ...e.config, ultimaRevisaoOrcamento: mes } }));
    ctx.aviso('Orçamento salvo. O plano foi recalculado.', 'ok', 4000);
    ctx.rerender();
  });

  container.replaceChildren(
    h('h1', {}, 'Orçamento'),
    h('p', { class: 'suave' }, `Ajuste quanto você gasta em cada categoria. Ao lado, o efeito na data da renda plena. Última revisão: ${formatarMes(estado.config.ultimaRevisaoOrcamento)}.`),
    topo,
    listas,
    h('div', { class: 'botoes' }, salvar),
  );
  desenhar();
}
