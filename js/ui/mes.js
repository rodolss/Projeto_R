// Tela do mês (tela inicial): "Quanto caiu na sua conta?" → quanto separar e onde aplicar, na hora.
import { h, campoMoeda, cartao, botao, aviso, linha, barra, AVISO_EXEMPLOS } from './dom.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { formatarMes } from '../core/meses.js';
import { precisaRevisarOrcamento } from '../core/metas.js';
import { TIPOS_EXTRA } from '../core/protecao.js';
import { calcularMes, registrarAplicacao, calcularPainel, saldosAtuais } from '../core/motor.js';

const ROTULOS_EXTRA = { 'decimo-terceiro': '13º', ferias: 'Férias', plr: 'PLR/bônus', outro: 'Outro' };

export function render(container, ctx) {
  const { estado, hoje } = ctx;
  const mes = hoje.slice(0, 7);
  const existente = estado.meses.find((m) => m.mes === mes);
  const painel = calcularPainel({ estado, hoje });
  const estimados = saldosAtuais(estado, hoje);

  const est = {
    recebido: existente?.recebido ?? null,
    tipoExtra: existente?.tipoExtra ?? null,
    proventos: existente?.proventos ?? null,
    saldos: null, // { [ativoId]: { valor, cotas } } quando o usuário abre "Atualizar saldos"
  };
  let resposta = null;

  const resultado = h('div', { style: 'display:flex;flex-direction:column;gap:12px' });
  const confirmacao = h('div');

  const saldosAtualizados = () => (est.saldos
    ? Object.entries(est.saldos).map(([ativoId, s]) => ({ ativoId, valor: s.valor ?? 0, cotas: s.cotas ?? null }))
    : null);

  function ultimaAtualizacao() {
    const ids = new Set(estado.ativos.filter((a) => a.papel === 'carteira').map((a) => a.id));
    const datas = estado.saldos.filter((s) => ids.has(s.ativoId)).map((s) => s.data).sort();
    return datas.at(-1) ?? null;
  }

  function recalcular() {
    confirmacao.replaceChildren();
    if (est.recebido == null) {
      resposta = null;
      resultado.replaceChildren();
      return;
    }
    resposta = calcularMes({
      estado, recebido: est.recebido, tipoExtra: est.tipoExtra, proventos: est.proventos ?? 0,
      saldosAtualizados: saldosAtualizados(), hoje,
    });
    const r = resposta;
    const blocos = [];

    if (r.perguntarExtra) {
      blocos.push(cartao(
        h('h3', {}, 'O que veio a mais este mês?'),
        h('div', { class: 'chips' }, ...TIPOS_EXTRA.map((t) => h('button', {
          type: 'button', class: `chip${est.tipoExtra === t ? ' ativo' : ''}`,
          onclick: () => { est.tipoExtra = est.tipoExtra === t ? null : t; recalcular(); },
        }, ROTULOS_EXTRA[t]))),
        !est.tipoExtra && h('p', { class: 'suave pequeno' }, 'Sem escolher, o valor a mais é tratado como extra comum.')));
    }

    if (r.semAporte) {
      blocos.push(aviso('atencao', h('b', {}, r.motivo === 'custo-de-vida'
        ? 'Este mês não invista nada, o seu dia a dia vem primeiro.'
        : 'Este mês não sobra nada para investir.')));
    } else {
      blocos.push(cartao(
        h('div', { class: 'rotulo' }, 'Separe para investir este mês'),
        h('div', { class: 'valor-grande' }, formatarBRL(r.excedente)),
        h('div', { class: 'suave' }, `${formatarBRL(r.paraDiaADia)} ficam para o seu dia a dia.`)));
    }

    const extras = [
      r.paraAnuais > 0 && aviso('info', `Separe ${formatarBRL(r.paraAnuais)} para as despesas anuais (deixe na conta ou no Tesouro Selic).`),
      r.guardarParaProximoMes > 0 && aviso('info', `Guarde ${formatarBRL(r.guardarParaProximoMes)} para o mês que vem (adiantamento das férias: o próximo salário vem menor).`),
    ].filter(Boolean);
    blocos.push(...extras);

    const destinos = [
      r.paraReserva > 0 && linha('Reserva de emergência', formatarBRL(r.paraReserva), 'Tesouro Selic · vem antes de qualquer investimento'),
      r.paraCaixa > 0 && linha('Caixa de oportunidade', formatarBRL(r.paraCaixa), 'Tesouro Selic · guardado para comprar quando o mercado cair'),
      r.daCaixaParaCarteira > 0 && linha('Da caixa para a carteira', formatarBRL(r.daCaixaParaCarteira), 'O mercado caiu: hora de usar a caixa de oportunidade'),
      ...r.sugestoes.map((s) => linha(s.ticker, formatarBRL(s.valor), s.frase + (s.cotasAprox ? ` · ≈ ${s.cotasAprox} ${s.cotasAprox === 1 ? 'cota' : 'cotas'}` : ''))),
    ].filter(Boolean);
    if (destinos.length) {
      blocos.push(cartao(h('h2', {}, 'Onde aplicar'), ...destinos,
        r.porque && h('div', { style: 'margin-top:8px' }, aviso('ok', h('b', {}, 'Por quê? '), r.porque)),
        h('p', { class: 'suave pequeno', style: 'margin-top:8px' }, AVISO_EXEMPLOS)));
    }

    if (r.avisos.includes('saldos-desatualizados')) {
      const data = ultimaAtualizacao();
      blocos.push(aviso('atencao', `Seus saldos são de ${data ? formatarMes(data.slice(0, 7)) : 'muito tempo atrás'}. Atualizar deixa a divisão mais precisa.`));
    }
    if (r.avisos.includes('ipca-indisponivel')) blocos.push(aviso('info', 'Ainda não tenho a inflação mais recente; usei a última disponível.'));
    if (r.estimado && !est.saldos) blocos.push(h('p', { class: 'suave pequeno' }, 'Saldos estimados a partir da última atualização.'));

    const temAlgo = destinos.length > 0;
    blocos.push(h('div', { class: 'botoes' }, botao(temAlgo ? 'Já apliquei' : 'Registrar este mês', () => abrirConfirmacao(temAlgo))));
    blocos.push(confirmacao);
    resultado.replaceChildren(...blocos);
  }

  function abrirConfirmacao(temAlgo) {
    const r = resposta;
    const aplicado = [
      ...r.sugestoes.map((s) => ({ destino: s.classe, nome: s.ticker, valor: s.valor })),
      r.paraReserva > 0 && { destino: 'reserva', nome: 'Reserva de emergência', valor: r.paraReserva },
      r.paraCaixa > 0 && { destino: 'caixa', nome: 'Caixa de oportunidade', valor: r.paraCaixa },
    ].filter(Boolean);
    const transferencia = { valor: r.daCaixaParaCarteira };

    const confirmar = botao('Confirmar', async () => {
      confirmar.disabled = true;
      await ctx.salvar((e) => registrarAplicacao(e, {
        mes, data: hoje, recebido: est.recebido, tipoExtra: est.tipoExtra, proventos: est.proventos ?? 0,
        saldosAtualizados: saldosAtualizados(), resposta: r,
        aplicado: aplicado.map(({ destino, valor }) => ({ destino, valor: valor ?? 0 })),
        transferidoDaCaixa: transferencia.valor ?? 0,
      }));
      ctx.aviso('Mês registrado! 👏', 'ok', 4000);
      ctx.rerender();
    });

    confirmacao.replaceChildren(cartao(
      h('h3', {}, temAlgo ? 'Quanto você aplicou de fato?' : 'Registrar o mês'),
      temAlgo && h('p', { class: 'suave pequeno' }, 'Se aplicou um valor diferente do sugerido, corrija aqui.'),
      ...aplicado.map((a) => h('div', { style: 'margin-top:8px' }, campoMoeda({ rotulo: a.nome, valor: a.valor, aoMudar: (v) => { a.valor = v; } }))),
      transferencia.valor > 0 && h('div', { style: 'margin-top:8px' }, campoMoeda({ rotulo: 'Transferido da caixa de oportunidade', valor: transferencia.valor, aoMudar: (v) => { transferencia.valor = v; } })),
      h('div', { class: 'botoes', style: 'margin-top:12px' }, confirmar, botao('Cancelar', () => confirmacao.replaceChildren(), { secundario: true }))));
    confirmacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function painelSaldos() {
    const lista = estado.ativos.filter((a) => a.papel !== 'fgts');
    if (!lista.length) return h('p', { class: 'suave' }, 'Nenhum investimento cadastrado ainda. Eles aparecem aqui depois do primeiro "Já apliquei".');
    return h('div', {}, ...lista.map((a) => {
      const atual = estimados[a.id]?.valor ?? 0;
      const ultimo = estado.saldos.filter((s) => s.ativoId === a.id).sort((x, y) => (x.data < y.data ? -1 : 1)).at(-1);
      const iniciar = () => {
        if (!est.saldos) {
          est.saldos = Object.fromEntries(lista.map((x) => {
            const u = estado.saldos.filter((s) => s.ativoId === x.id).sort((p, q) => (p.data < q.data ? -1 : 1)).at(-1);
            return [x.id, { valor: Math.round((estimados[x.id]?.valor ?? 0) * 100) / 100, cotas: u?.cotas ?? null }];
          }));
        }
      };
      const comCotas = a.papel === 'carteira' && a.classe && a.classe !== 'rendaFixa';
      return h('div', { class: 'linha', style: 'flex-wrap:wrap' },
        h('div', { class: 'nome' }, h('span', {}, a.nome), h('small', {}, ultimo ? `informado em ${formatarMes(ultimo.data.slice(0, 7))}` : 'ainda sem saldo informado')),
        h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' },
          h('div', { style: 'width:150px' }, campoMoeda({ rotulo: null, valor: Math.round(atual * 100) / 100, aoMudar: (v) => { iniciar(); est.saldos[a.id].valor = v; recalcular(); } })),
          comCotas && h('input', {
            class: 'entrada', type: 'number', min: '0', step: '1', style: 'width:96px', placeholder: 'cotas',
            value: ultimo?.cotas ?? '', 'aria-label': `Cotas de ${a.nome}`,
            oninput: (e) => { iniciar(); est.saldos[a.id].cotas = Number(e.target.value) || null; },
          })));
    }));
  }

  const progresso = painel.metas.independencia > 0 ? painel.patrimonio / painel.metas.independencia : 0;
  const campoRecebido = campoMoeda({
    rotulo: null, valor: est.recebido, grande: true, id: 'recebido',
    dica: 'O salário líquido que entrou, livre na mão.',
    aoMudar: (v) => { est.recebido = v; recalcular(); },
  });

  container.replaceChildren(...[
    existente && aviso('info', `Você já registrou ${formatarMes(mes)}. Pode ajustar e confirmar de novo.`),
    precisaRevisarOrcamento(estado.config.ultimaRevisaoOrcamento, mes)
      && aviso('atencao', 'Já faz 6 meses desde a última revisão do orçamento. ', h('a', { href: '#/orcamento' }, 'Revisar agora')),
    cartao(
      h('h1', {}, 'Quanto caiu na sua conta este mês?'),
      campoRecebido,
      h('div', { style: 'margin-top:12px' },
        h('div', { class: 'suave pequeno' }, `Independência: ${formatarPct(progresso)} do caminho · alvo ${formatarMes(painel.mesAlvo)}`),
        barra(progresso))),
    h('details', { class: 'cartao', open: (existente?.proventos ?? 0) > 0 },
      h('summary', {}, 'Recebeu proventos este mês?'),
      h('div', { style: 'margin-top:8px' }, campoMoeda({
        rotulo: 'Proventos recebidos este mês', valor: est.proventos,
        dica: 'Veja no extrato da corretora: dividendos, juros e aluguéis de FII. Eles são reinvestidos.',
        aoMudar: (v) => { est.proventos = v; recalcular(); },
      }))),
    resultado,
    h('details', { class: 'cartao' }, h('summary', {}, 'Atualizar saldos (copie da corretora)'), painelSaldos()),
  ].filter(Boolean));
  recalcular();
  if (est.recebido == null) setTimeout(() => campoRecebido.input.focus(), 50);
}
