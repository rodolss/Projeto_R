// Histórico mês a mês, com o detalhe da sugestão da época e correção dos valores lançados.
import { h, campoMoeda, cartao, botao, linha } from './dom.js';
import { formatarBRL } from '../core/formato.js';
import { formatarMes } from '../core/meses.js';
import { calcularPainel } from '../core/motor.js';

export function render(container, ctx) {
  const { estado } = ctx;
  if (!estado.meses.length) {
    container.replaceChildren(h('h1', {}, 'Histórico'), cartao(h('p', { class: 'suave' }, 'Nenhum mês registrado ainda. Use a tela do mês e toque em "Já apliquei".')));
    return;
  }
  const patrimonioPorMes = new Map(calcularPainel({ estado, hoje: ctx.hoje }).grafico.real.map((p) => [p.mes, p.valor]));
  const nomeAtivo = (id) => estado.ativos.find((a) => a.id === id)?.nome ?? 'Investimento removido';

  const itens = [...estado.meses].reverse().map((m) => {
    const aplicado = (m.aplicado ?? []).filter((a) => a.valor > 0).reduce((s, a) => s + a.valor, 0);
    const edicao = { recebido: m.recebido, proventos: m.proventos ?? 0, aplicado: (m.aplicado ?? []).map((a) => ({ ...a })) };
    const salvar = botao('Salvar correção', async () => {
      salvar.disabled = true;
      // Correção direta do lançamento: mantém a sugestão da época e os investimentos de destino.
      await ctx.salvar((e) => ({
        ...e,
        meses: e.meses.map((x) => (x.mes === m.mes
          ? { ...x, recebido: edicao.recebido ?? 0, proventos: edicao.proventos ?? 0, aplicado: edicao.aplicado.map((a) => ({ ...a, valor: a.valor ?? 0 })) }
          : x)),
      }));
      ctx.aviso(`${formatarMes(m.mes)} corrigido.`, 'ok', 3000);
      ctx.rerender();
    });
    return h('details', { class: 'cartao' },
      h('summary', {}, h('span', {}, formatarMes(m.mes)), h('span', { class: 'suave' }, ` · aplicado ${formatarBRL(aplicado)}`)),
      h('div', { style: 'margin-top:8px' },
        linha('Recebido', formatarBRL(m.recebido)),
        linha('Sugerido para investir', formatarBRL(m.sugestao?.excedente ?? 0)),
        linha('Aplicado de fato', formatarBRL(aplicado)),
        linha('Proventos', formatarBRL(m.proventos ?? 0)),
        linha('Patrimônio no mês', formatarBRL(patrimonioPorMes.get(m.mes) ?? 0), 'para as metas, em reais de hoje')),
      (m.sugestao?.sugestoes?.length ?? 0) > 0 && h('div', { style: 'margin-top:8px' },
        h('h3', {}, 'O que foi sugerido na época'),
        ...m.sugestao.sugestoes.map((s) => linha(s.ticker, formatarBRL(s.valor))),
        m.sugestao.porque && h('p', { class: 'suave pequeno' }, m.sugestao.porque)),
      h('details', { style: 'margin-top:8px' }, h('summary', {}, 'Corrigir este mês'),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:8px' },
          campoMoeda({ rotulo: 'Recebido', valor: m.recebido, aoMudar: (v) => { edicao.recebido = v; } }),
          campoMoeda({ rotulo: 'Proventos', valor: m.proventos ?? 0, aoMudar: (v) => { edicao.proventos = v; } }),
          ...edicao.aplicado.map((a) => campoMoeda({ rotulo: `Aplicado em ${nomeAtivo(a.ativoId)}`, valor: a.valor, aoMudar: (v) => { a.valor = v; } })),
          h('div', { class: 'botoes' }, salvar))));
  });

  container.replaceChildren(h('h1', {}, 'Histórico'), ...itens);
}
