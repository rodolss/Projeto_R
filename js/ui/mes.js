// Aba Mês em lista de 4 tarefas (desenho de 2026-11-12; 3 na visão única, sem o salário): salário, proventos desde o último registro,
// saldos da corretora e investir. Cada tarefa abre uma folha por baixo (#/mes?folha=…); o voltar do celular fecha.
// O que já foi preenchido fica num rascunho no aparelho até o mês ser registrado.
import {
  h, campoMoeda, cartao, botao, aviso, linha, AVISO_EXEMPLOS, mostrarFolha, esconderFolha,
} from './dom.js';
import { formatarBRL, formatarDuracao } from '../core/formato.js';
import { formatarMes } from '../core/meses.js';
import { precisaRevisarOrcamento } from '../core/metas.js';
import { TIPOS_EXTRA } from '../core/protecao.js';
import { calcularMes, registrarAplicacao, registrarSaldos, calcularPainel, saldosAtuais } from '../core/motor.js';
import { LAZER } from '../core/balanco.js';
import { regraDaSobra } from '../core/investir-sobra.js';
import { salarioParaODia, rascunhoComBalanco } from '../core/salario.js';
import {
  rascunhoVazio, rascunhoDoRegistro, situacao, ultimoRegistroAntes, saldoDigitadoNoMes, totalAplicado,
  saldosParaGravar, dataCurta, nomeDoMes, escolherSaldos,
} from '../core/lista-mes.js';
import { lerRascunho, salvarRascunho, apagarRascunho } from './mes-rascunho.js';
import { folhaAberta, depoisDeSalvar } from './rotas.js';

const ROTULOS_EXTRA = { 'decimo-terceiro': '13º', ferias: 'Férias', plr: 'PLR/bônus', outro: 'Outro' };
const TITULOS_FOLHA = {
  salario: 'Salário que caiu', proventos: 'Proventos desde o último registro', saldos: 'Saldos da corretora',
  investir: 'Investir', 'so-saldos': 'Atualizar saldos',
};

// A folha foi aberta por um toque nesta sessão? Então fechar = voltar no histórico (some a entrada criada).
let abertaAqui = false;
function abrir(nome) {
  abertaAqui = true;
  location.hash = `#/mes?folha=${nome}`;
}
function fechar() {
  if (abertaAqui) {
    abertaAqui = false;
    history.back();
  } else {
    location.replace('#/mes');
  }
}

// Depois de salvar no GitHub (pode demorar): fecha a folha se ainda aberta; senão redesenha o Mês ou não mexe.
function terminar(folha, ctx) {
  const acao = depoisDeSalvar(location.hash, folha);
  if (acao === 'fechar') fechar();
  else if (acao === 'redesenhar') ctx.rerender();
}

export function render(container, ctx) {
  desenhar(container, ctx);
}

// Mesma tela: abrir/fechar folha, dados de outro aparelho, depois de salvar (app.js chama isto em vez de render).
export function atualizar(container, ctx) {
  desenhar(container, ctx);
}

function desenhar(container, ctx) {
  const { estado, hoje } = ctx;
  const mes = hoje.slice(0, 7);
  const existente = estado.meses.find((m) => m.mes === mes);
  let rascunho = lerRascunho(mes);
  if (rascunho?.editando && !existente) { // o registro sumiu (outro aparelho): a edição não faz mais sentido
    apagarRascunho();
    rascunho = null;
  }
  // Salário só no Balanço (desenho 2026-11-21-salario-no-balanco): na visão única, a etapa "Salário que caiu" some —
  // o salário (e o a mais) vem do Balanço deste mês (ainda não confirmado: a previsão; sem nada: o do plano),
  // recalculado a cada desenho, e aparece só como informação no topo. Num mês já registrado, fica o do registro.
  const visto = ctx.unica ? ctx.perfil?.visto ?? null : null;
  const doBalanco = !visto ? null
    : ctx.casa ? salarioParaODia({ casa: ctx.casa, mes, pessoaId: visto.id })
      : { carregando: true, pronto: false, salario: null, extra: 0, recebido: null };
  if (doBalanco && !existente) rascunho = rascunhoComBalanco(rascunho ?? rascunhoVazio(mes), doBalanco, estado.config.salario);
  const semSalario = Boolean(doBalanco);
  const sit = situacao({ registrado: Boolean(existente), rascunho, semSalario });
  const antesDeInvestir = semSalario ? 'as tarefas 1 e 2' : 'as tarefas 1 a 3';
  const r = rascunho ?? rascunhoVazio(mes);
  const guardar = () => salvarRascunho(r);
  const nome = nomeDoMes(mes);
  const Nome = nome[0].toUpperCase() + nome.slice(1);
  const estimados = saldosAtuais(estado, hoje);
  const listaSaldos = estado.ativos.filter((a) => a.papel !== 'fgts');

  // ---------- contas ----------
  const saldosDoRascunho = () => {
    if (r.editando || r.saldosModo !== 'copiados') return null;
    const lista = Object.entries(r.saldos ?? {})
      .filter(([, s]) => s.valor != null) // campo apagado não vira saldo zero
      .map(([ativoId, s]) => ({ ativoId, valor: s.valor, cotas: s.cotas ?? null }));
    return lista.length ? lista : null;
  };
  // Investir a sobra (desenho 2026-11-20-investir-a-sobra): na visão única, o quanto investir no Dia de pagamento é a
  // sobra do Balanço do mês anterior (o que já fechou), menos 10% para lazer — js/core/investir-sobra.js. Sem as
  // contas da casa carregadas ou sem os dados do Balanço: pelo orçamento, com aviso.
  const regra = (() => {
    if (!ctx.unica || !ctx.perfil?.visto) return null;
    if (!ctx.casa) return { semCasa: true };
    return regraDaSobra({ casa: ctx.casa, estado, pessoaId: ctx.perfil.visto.id, mes, hoje });
  })();
  const pelaSobra = Boolean(regra && !regra.semCasa && !regra.incompleto);
  const resposta = () => calcularMes({
    estado, recebido: r.recebido ?? 0, tipoExtra: r.tipoExtra, proventos: r.proventos ?? 0, saldosAtualizados: saldosDoRascunho(), hoje,
    investirDefinido: pelaSobra ? regra.investir : null, lazerPct: LAZER, semExtra: pelaSobra && Boolean(doBalanco),
  });
  // Pela sobra, o mesmo texto na lista e na folha quando não há o que investir.
  const semSobraTexto = () => `Em ${nomeDoMes(regra.mes)} não sobrou nada para investir.`;
  const ultimoRegistro = ultimoRegistroAntes(estado.meses, mes);

  // ---------- campos de saldos (tarefa 3 e "Atualizar só os saldos") ----------
  function camposSaldos(edicoes, aoEditar) {
    if (!listaSaldos.length) return [h('p', { class: 'suave' }, 'Nenhum investimento cadastrado ainda. Eles aparecem aqui depois do primeiro "Já apliquei".')];
    return listaSaldos.map((a) => {
      const atual = Math.round((estimados[a.id]?.valor ?? 0) * 100) / 100;
      const ultimo = estado.saldos.filter((s) => s.ativoId === a.id).sort((x, y) => (x.data < y.data ? -1 : 1)).at(-1);
      const editado = edicoes[a.id];
      // Só o que o usuário edita vira saldo digitado; o resto continua estimado.
      const editar = (mudanca) => {
        edicoes[a.id] = { valor: atual, cotas: ultimo?.cotas ?? null, ...edicoes[a.id], ...mudanca };
        aoEditar();
      };
      const comCotas = a.papel === 'carteira' && a.classe && a.classe !== 'rendaFixa';
      return h('div', { class: 'linha', style: 'flex-wrap:wrap' },
        h('div', { class: 'nome' }, h('span', {}, a.nome), h('small', {}, ultimo ? `informado em ${formatarMes(ultimo.data.slice(0, 7))}` : 'ainda sem saldo informado')),
        h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' },
          h('div', { style: 'width:150px' }, campoMoeda({ rotulo: null, valor: editado?.valor ?? atual, aoMudar: (v) => editar({ valor: v }) })),
          comCotas && h('input', {
            class: 'entrada', type: 'number', min: '0', step: '1', style: 'width:96px', placeholder: 'cotas',
            value: editado?.cotas ?? ultimo?.cotas ?? '', 'aria-label': `Cotas de ${a.nome}`,
            oninput: (e) => editar({ cotas: Number(e.target.value) || null }),
          })));
    });
  }

  // Na visão única não há mais a etapa do salário; esta folha só abre por um endereço antigo (#/mes?folha=salario):
  // mostra o do Balanço e leva até ele (troca a entrada do histórico: voltar do Balanço traz para o Mês).
  function folhaSalarioDoBalanco() {
    const nomeDoBalanco = `#/casa-balanco?mes=${mes}&folha=salario`;
    const noBalanco = doBalanco.pronto ? doBalanco.recebido : null;
    return [
      h('h2', {}, 'Salário que caiu'),
      existente
        ? cartao(
          h('div', { class: 'rotulo' }, `Registrado em ${dataCurta(existente.data)}`),
          h('div', { class: 'valor-grande' }, formatarBRL(existente.recebido ?? 0)),
          noBalanco != null && noBalanco !== existente.recebido
          && h('div', { class: 'suave' }, `No Balanço agora: ${formatarBRL(noBalanco)}. O registro guarda o valor do dia; a sobra de ${nome} (e o próximo Dia de pagamento) já usa o do Balanço.`))
        : doBalanco.carregando
          ? aviso('info', 'As contas da casa ainda estão carregando. O salário aparece aqui sozinho.')
          : doBalanco.pronto
            ? cartao(
          h('div', { class: 'rotulo' }, `Do Balanço de ${nome}`),
          h('div', { class: 'valor-grande' }, formatarBRL(doBalanco.recebido)),
          doBalanco.extra > 0 && h('div', { class: 'suave' }, `${formatarBRL(doBalanco.salario)} de salário + ${formatarBRL(doBalanco.extra)} a mais (vai pela sobra, no próximo Dia de pagamento).`))
        : aviso('info', `Digite seu salário de ${nome} no Balanço: é o único lugar, e ele vale para tudo.`),
      h('p', { class: 'suave pequeno' }, 'O salário se digita só no Balanço; aqui, nas contas da casa e nos Ajustes ele aparece sozinho.'),
      h('div', { class: 'botoes' },
        botao('Fechar', fechar, { secundario: true }),
        botao(doBalanco.pronto ? 'Mudar no Balanço' : 'Digitar no Balanço', () => location.replace(nomeDoBalanco))),
    ];
  }

  // ---------- folhas ----------
  function folhaSalario() {
    if (doBalanco) return folhaSalarioDoBalanco();
    const extra = h('div');
    const desenharExtra = () => {
      const pergunta = r.recebido != null && resposta().perguntarExtra;
      if (!pergunta && r.tipoExtra) r.tipoExtra = null;
      extra.replaceChildren(...(pergunta ? [
        h('h3', { style: 'margin-top:4px' }, 'O que veio a mais este mês?'),
        h('div', { class: 'chips' }, ...TIPOS_EXTRA.map((t) => h('button', {
          type: 'button', class: `chip${r.tipoExtra === t ? ' ativo' : ''}`,
          onclick: () => { r.tipoExtra = r.tipoExtra === t ? null : t; guardar(); desenharExtra(); },
        }, ROTULOS_EXTRA[t]))),
        !r.tipoExtra && h('p', { class: 'suave pequeno' }, 'Sem escolher, o valor a mais é tratado como extra comum.'),
      ] : []));
    };
    desenharExtra();
    return [
      h('h2', {}, 'Quanto caiu na sua conta este mês?'),
      campoMoeda({
        rotulo: null, valor: r.recebido, grande: true, id: 'recebido', dica: 'O salário líquido que entrou, livre na mão.',
        aoMudar: (v) => { r.recebido = v; guardar(); desenharExtra(); },
      }),
      extra,
      h('div', { class: 'botoes' },
        botao('Fechar', fechar, { secundario: true }),
        botao('Salvar', () => {
          if (r.recebido == null) { ctx.aviso('Digite quanto caiu na conta.', 'atencao', 3000); return; }
          r.feito.salario = true;
          guardar();
          fechar();
        })),
    ];
  }

  function folhaProventos() {
    const campo = campoMoeda({
      rotulo: 'Proventos desde o último registro', valor: r.proventos, id: 'proventos',
      dica: ultimoRegistro
        ? `Dividendos, aluguéis de FIIs e juros do Tesouro que caíram desde ${dataCurta(ultimoRegistro)}, o seu último registro. Veja no extrato da corretora.`
        : 'Dividendos, aluguéis de FIIs e juros do Tesouro que caíram desde que você começou. Veja no extrato da corretora.',
      aoMudar: (v) => { r.proventos = v; guardar(); },
    });
    return [
      campo,
      h('div', { class: 'chips' }, h('button', {
        type: 'button', class: 'chip',
        onclick: () => { r.proventos = 0; campo.input.value = '0,00'; guardar(); },
      }, 'Não caiu nada')),
      h('div', { class: 'botoes' },
        botao('Fechar', fechar, { secundario: true }),
        botao('Salvar', () => {
          r.proventos ??= 0;
          r.feito.proventos = true;
          guardar();
          fechar();
        })),
    ];
  }

  function folhaSaldos() {
    r.saldos ??= {};
    return [
      h('h2', {}, 'Copie os saldos da corretora'),
      h('p', { class: 'suave' }, 'Copie antes de aplicar o dinheiro deste mês. Deixa a divisão mais precisa.'),
      h('div', {}, ...camposSaldos(r.saldos, guardar)),
      h('div', { class: 'botoes' },
        botao('Pular', () => { salvarRascunho(escolherSaldos(r, 'pular')); fechar(); }, { secundario: listaSaldos.length > 0 }),
        listaSaldos.length > 0 && botao('Usar estes saldos', () => { salvarRascunho(escolherSaldos(r, 'usar')); fechar(); })),
    ];
  }

  function folhaSoSaldos() {
    const edicoes = {};
    const salvar = botao('Salvar saldos', async () => {
      const saldos = Object.entries(edicoes).filter(([, s]) => s.valor != null)
        .map(([ativoId, s]) => ({ ativoId, valor: s.valor, cotas: s.cotas ?? null }));
      if (!saldos.length) { ctx.aviso('Edite pelo menos um saldo antes de salvar.', 'atencao', 3000); return; }
      salvar.disabled = true;
      await ctx.salvar((e) => registrarSaldos(e, { data: hoje, saldos: saldosParaGravar({ estado: e, mes, hoje, saldos }) }));
      ctx.aviso('Saldos salvos.', 'ok', 3000);
      terminar('so-saldos', ctx);
    });
    return [
      h('h2', { 'data-sem-recarregar': '' }, 'Atualizar saldos'), // valores digitados aqui não vão para o rascunho
      h('p', { class: 'suave' }, `Copie os valores como estão na corretora agora. O registro de ${nome} não muda.`),
      h('div', {}, ...camposSaldos(edicoes, () => {})),
      h('div', { class: 'botoes' }, botao('Cancelar', fechar, { secundario: true }), salvar),
    ];
  }

  // Visão única (desenhos 2026-11-20-balanco-e-plano e -investir-a-sobra): de onde veio o valor (a sobra do mês
  // anterior no Balanço) ou, sem os dados dele, o pedido para preenchê-los. O aviso do orçamento olha a média dos
  // últimos meses já fechados (o orçamento ainda define as metas e a reserva).
  function conferenciaDoBalanco(rr) {
    if (!regra) return [];
    if (regra.semCasa) return [aviso('info', 'As contas da casa ainda não carregaram: por enquanto, o valor sai do orçamento.')];
    const nomeAnterior = nomeDoMes(regra.mes);
    const pct = `${Math.round(LAZER * 100)}%`;
    const extra = rr.extra?.valor > 0 && rr.extra;
    const linha = regra.incompleto
      ? aviso('info', `Para investir pela sobra, faltam os salários de ${nomeAnterior} (o seu se digita no Balanço; o da outra pessoa, no Mês da casa). Por enquanto, o valor sai do orçamento.`)
      : h('p', { class: 'suave' },
        `Sobrou em ${nomeAnterior}: ${formatarBRL(regra.sobra)}${regra.previsao ? ' (com valores ainda a confirmar)' : ''}. `,
        regra.jaInvestido > 0 && `Desse salário, ${formatarBRL(regra.jaInvestido)} já tinham sido investidos no Dia de pagamento de ${nomeAnterior}. `,
        regra.deficit > 0 && `Antes, ${formatarBRL(regra.deficit)} de meses no vermelho ainda precisavam ser cobertos. `,
        regra.base > 0 && `${pct} para lazer: ${formatarBRL(regra.lazer)}. `,
        regra.deficitAgora > 0 && `Ficam ${formatarBRL(regra.deficitAgora)} no vermelho para as próximas sobras cobrirem. `,
        extra && `Do que veio a mais este mês (${formatarBRL(extra.valor)}): ${formatarBRL(extra.investir)} para investir e ${formatarBRL(extra.lazer)} para lazer. `,
        h('a', { href: `#/casa-balanco?mes=${regra.mes}` }, `Ver o balanço de ${nomeAnterior}`));
    return [linha];
  }

  function folhaInvestir() {
    if (!sit.podeInvestir) {
      return [h('h2', {}, 'Investir'), aviso('info', `Faça ${antesDeInvestir} antes.`), h('div', { class: 'botoes' }, botao('Fechar', fechar, { secundario: true }))];
    }
    const rr = resposta();
    const blocos = [];
    if (rr.semAporte) {
      blocos.push(aviso('atencao', h('b', {}, pelaSobra
        ? semSobraTexto()
        : rr.motivo === 'custo-de-vida'
          ? 'Este mês não invista nada, o seu dia a dia vem primeiro.'
          : 'Este mês não sobra nada para investir.')));
    } else {
      blocos.push(cartao(
        h('div', { class: 'rotulo' }, 'Separe para investir este mês'),
        h('div', { class: 'valor-grande' }, formatarBRL(rr.excedente)),
        !pelaSobra && h('div', { class: 'suave' }, `${formatarBRL(rr.paraDiaADia)} ficam para o seu dia a dia.`)));
    }
    blocos.push(...conferenciaDoBalanco(rr));
    blocos.push(...[
      rr.paraAnuais > 0 && aviso('info', `Separe ${formatarBRL(rr.paraAnuais)} para as despesas anuais (deixe na conta ou no Tesouro Selic).`),
      rr.provisao > 0 && aviso('info', `Separe ${formatarBRL(rr.provisao)} deste mês para as despesas anuais: o 13º e as férias não cobrem todas (deixe na conta ou no Tesouro Selic).`),
      rr.guardarParaProximoMes > 0 && aviso('info', `Guarde ${formatarBRL(rr.guardarParaProximoMes)} para o mês que vem (adiantamento das férias: o próximo salário vem menor).`),
    ].filter(Boolean));
    const destinos = [
      rr.paraReserva > 0 && linha('Reserva de emergência', formatarBRL(rr.paraReserva), 'Tesouro Selic · vem antes de qualquer investimento'),
      rr.paraCaixa > 0 && linha('Caixa de oportunidade', formatarBRL(rr.paraCaixa), 'Tesouro Selic · guardado para comprar quando o mercado cair'),
      rr.daCaixaParaCarteira > 0 && linha('Da caixa para a carteira', formatarBRL(rr.daCaixaParaCarteira), 'O mercado caiu: hora de usar a caixa de oportunidade'),
      ...rr.sugestoes.map((s) => linha(s.ticker, formatarBRL(s.valor), s.frase + (s.cotasAprox ? ` · ≈ ${s.cotasAprox} ${s.cotasAprox === 1 ? 'cota' : 'cotas'}` : ''))),
    ].filter(Boolean);
    if (destinos.length) {
      blocos.push(cartao(h('h2', {}, 'Onde aplicar'), ...destinos,
        rr.porque && h('div', { style: 'margin-top:8px' }, aviso('ok', h('b', {}, 'Por quê? '), rr.porque)),
        h('p', { class: 'suave pequeno', style: 'margin-top:8px' }, AVISO_EXEMPLOS)));
    }
    if (rr.avisos.includes('saldos-desatualizados')) {
      const ids = new Set(estado.ativos.filter((a) => a.papel === 'carteira').map((a) => a.id));
      const data = estado.saldos.filter((s) => ids.has(s.ativoId)).map((s) => s.data).sort().at(-1);
      blocos.push(aviso('atencao', `Seus saldos são de ${data ? formatarMes(data.slice(0, 7)) : 'muito tempo atrás'}. Atualizar deixa a divisão mais precisa.`));
    }
    if (rr.avisos.includes('ipca-indisponivel')) blocos.push(aviso('info', 'Ainda não tenho a inflação mais recente; usei a última disponível.'));
    if (rr.estimado && !saldosDoRascunho()) blocos.push(h('p', { class: 'suave pequeno' }, 'Saldos estimados a partir da última atualização.'));

    const temAlgo = destinos.length > 0;
    const confirmacao = h('div');
    blocos.push(h('div', { class: 'botoes' },
      botao('Fechar', fechar, { secundario: true }),
      botao(temAlgo ? 'Já apliquei' : 'Registrar este mês', () => abrirConfirmacao(rr, temAlgo, confirmacao))));
    blocos.push(confirmacao);
    return blocos;
  }

  function abrirConfirmacao(rr, temAlgo, confirmacao) {
    const nomeAtivo = (id) => estado.ativos.find((a) => a.id === id)?.nome ?? 'Investimento';
    const papelAtivo = (id) => estado.ativos.find((a) => a.id === id)?.papel;
    // Reconfirmar sem mudar nada parte do que já foi salvo, e não de uma sugestão nova.
    const usarSalvo = r.editando && existente && r.recebido === existente.recebido && r.tipoExtra === (existente.tipoExtra ?? null)
      && (r.proventos ?? 0) === (existente.proventos ?? 0);
    const aplicado = usarSalvo
      ? existente.aplicado.filter((a) => a.valor > 0).map((a) => ({ ativoId: a.ativoId, nome: nomeAtivo(a.ativoId), valor: a.valor }))
      : [
        ...rr.sugestoes.map((s) => ({ destino: s.classe, nome: s.ticker, valor: s.valor })),
        rr.paraReserva > 0 && { destino: 'reserva', nome: 'Reserva de emergência', valor: rr.paraReserva },
        rr.paraCaixa > 0 && { destino: 'caixa', nome: 'Caixa de oportunidade', valor: rr.paraCaixa },
      ].filter(Boolean);
    const transferencia = {
      valor: usarSalvo
        ? -existente.aplicado.filter((a) => a.valor < 0 && papelAtivo(a.ativoId) === 'caixa').reduce((s, a) => s + a.valor, 0)
        : rr.daCaixaParaCarteira,
    };
    const editando = r.editando;
    const confirmar = botao('Confirmar', async () => {
      confirmar.disabled = true;
      await ctx.salvar((e) => registrarAplicacao(e, {
        mes, data: hoje, recebido: r.recebido, tipoExtra: r.tipoExtra, proventos: r.proventos ?? 0,
        saldosAtualizados: editando ? null : saldosDoRascunho(), resposta: rr,
        aplicado: aplicado.map(({ ativoId, destino, valor }) => ({ ativoId, destino, valor: valor ?? 0 })),
        transferidoDaCaixa: transferencia.valor ?? 0,
      }));
      apagarRascunho();
      ctx.aviso(editando ? 'Registro atualizado.' : 'Mês registrado! 👏', 'ok', 4000);
      terminar('investir', ctx);
    });
    // data-sem-recarregar: com valores ainda não confirmados, a atualização automática espera (js/ui/atualizacao.js).
    confirmacao.replaceChildren(h('div', { 'data-sem-recarregar': '' }, cartao(
      h('h3', {}, temAlgo ? 'Quanto você aplicou de fato?' : 'Registrar o mês'),
      temAlgo && h('p', { class: 'suave pequeno' }, 'Se aplicou um valor diferente do sugerido, corrija aqui.'),
      ...aplicado.map((a) => h('div', { style: 'margin-top:8px' }, campoMoeda({ rotulo: a.nome, valor: a.valor, aoMudar: (v) => { a.valor = v; } }))),
      transferencia.valor > 0 && h('div', { style: 'margin-top:8px' }, campoMoeda({ rotulo: 'Transferido da caixa de oportunidade', valor: transferencia.valor, aoMudar: (v) => { transferencia.valor = v; } })),
      h('div', { class: 'botoes', style: 'margin-top:12px' }, botao('Cancelar', () => confirmacao.replaceChildren(), { secundario: true }), confirmar))));
    confirmacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- a lista ----------
  const registrado = sit.modo === 'registrado';
  const entrarEmEdicao = () => salvarRascunho(rascunhoDoRegistro(existente));

  function situacaoInvestir() {
    if (registrado) return `${formatarBRL(totalAplicado(existente))} aplicados`;
    if (!sit.podeInvestir) return `Libera depois d${antesDeInvestir}`;
    const rr = resposta();
    if (rr.semAporte) return pelaSobra ? semSobraTexto() : rr.motivo === 'custo-de-vida' ? 'O seu dia a dia vem primeiro' : 'Este mês não sobra nada para investir';
    return `Separe ${formatarBRL(rr.excedente)}`;
  }
  function situacaoSaldos() {
    if (sit.modo !== 'novo') {
      const d = saldoDigitadoNoMes(estado, mes);
      return d ? `Atualizados em ${dataCurta(d)}` : 'O app estima';
    }
    if (r.saldosModo === 'copiados') return `Atualizados em ${dataCurta(hoje)}`;
    if (r.saldosModo === 'pulados') return 'Pulado: o app estima';
    return 'Opcional';
  }
  const recebido = registrado ? existente.recebido : r.recebido;
  const proventos = registrado ? existente.proventos ?? 0 : r.proventos;

  const tarefas = [
    !semSalario && {
      chave: 'salario', titulo: 'Salário que caiu', detalhe: sit.feitas.salario ? formatarBRL(recebido) : 'Falta preencher',
    },
    {
      chave: 'proventos', titulo: 'Proventos desde o último registro',
      detalhe: sit.feitas.proventos ? formatarBRL(proventos ?? 0) : ultimoRegistro ? `Desde ${dataCurta(ultimoRegistro)}` : 'Desde que você começou',
    },
    { chave: 'saldos', titulo: 'Saldos da corretora', detalhe: situacaoSaldos() },
    { chave: 'investir', titulo: 'Investir', detalhe: situacaoInvestir(), bloqueada: !registrado && !sit.podeInvestir },
  ].filter(Boolean).map((t, k) => ({ ...t, n: k + 1 }));
  // Na visão única, o salário do mês só como informação (vem do Balanço, o único lugar onde se digita).
  // Só num mês novo (na edição de um registrado, vale o salário do registro).
  const salarioDoMes = semSalario && sit.modo === 'novo' && h('p', { class: 'suave pequeno', style: 'margin-top:8px' },
    doBalanco.carregando ? 'Carregando o salário do Balanço… Por enquanto, vale o salário do plano.'
      : doBalanco.pronto ? `Salário de ${nome}: ${formatarBRL(doBalanco.salario)}${doBalanco.extra > 0 ? ` + ${formatarBRL(doBalanco.extra)} a mais` : ''}, do Balanço. `
        : `Seu salário de ${nome} ainda não está no Balanço${doBalanco.recebido != null ? ` (previsão: ${formatarBRL(doBalanco.recebido)})` : ''}. `,
    !doBalanco.carregando && h('a', { href: `#/casa-balanco?mes=${mes}&folha=salario` }, doBalanco.pronto ? 'Ver no Balanço' : 'Digitar no Balanço'));
  const linhaTarefa = (t) => h('button', {
    type: 'button', class: 'tarefa', disabled: t.bloqueada,
    onclick: () => {
      if (t.chave === 'saldos' && sit.modo !== 'novo') { abrir('so-saldos'); return; }
      if (registrado) entrarEmEdicao();
      abrir(t.chave);
    },
  },
  h('span', { class: `bola${sit.feitas[t.chave] ? ' feito' : ''}`, 'aria-hidden': 'true' }, sit.feitas[t.chave] ? '✓' : String(t.n)),
  h('span', { class: 'texto' }, h('b', {}, t.titulo), h('small', {}, t.detalhe)),
  h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));

  const passos = h('div', { class: 'passos', 'aria-hidden': 'true' }, ...tarefas.map((_, k) => h('i', { class: k < sit.quantas ? 'feito' : '' })));
  const painel = calcularPainel({ estado, hoje });
  const cabecalho = registrado
    ? h('section', { class: 'cartao registrado' },
      h('div', { class: 'titulo-check' }, h('span', { class: 'check', 'aria-hidden': 'true' }, '✓'),
        h('div', {}, h('h2', {}, `${Nome} registrado`),
          h('p', { class: 'suave pequeno' }, `em ${dataCurta(existente.data)} · ${formatarBRL(totalAplicado(existente))} aplicados`))),
      passos)
    : cartao(
      h('h1', {}, `Dia de pagamento de ${nome}`),
      h('p', { class: 'suave' }, `${sit.quantas} de ${sit.total} feitos`),
      passos,
      salarioDoMes,
      h('p', { class: 'suave', style: 'margin-top:12px' }, painel.faltam !== null
        ? `Faltam ${formatarDuracao(painel.faltam)} para a renda plena.`
        : 'No ritmo de hoje, a renda plena fica a mais de 50 anos.'));
  // O cabeçalho do mês em aberto é o cartão herói, como o número principal do Balanço, das Contas e do Cartão.
  if (!registrado) cabecalho.classList.add('heroi');

  container.replaceChildren(...[
    precisaRevisarOrcamento(estado.config.ultimaRevisaoOrcamento, mes)
      && aviso('atencao', 'Já faz 6 meses desde a última revisão do orçamento. ', h('a', { href: '#/orcamento' }, 'Revisar agora')),
    sit.modo === 'editando' && aviso('info', `Editando o registro de ${nome}. Ao confirmar, os valores novos substituem os antigos.`,
      h('div', { class: 'botoes', style: 'margin-top:8px' }, botao('Cancelar edição', () => { apagarRascunho(); ctx.rerender(); }, { secundario: true }))),
    cabecalho,
    h('div', { class: 'tarefas' }, ...tarefas.map(linhaTarefa)),
    registrado && h('div', { class: 'botoes' },
      botao('Editar registro', () => { entrarEmEdicao(); ctx.rerender(); }, { secundario: true }),
      h('button', { type: 'button', class: 'botao-link', onclick: () => abrir('so-saldos') }, 'Atualizar só os saldos')),
  ].filter(Boolean));

  // ---------- folha aberta (vem do hash) ----------
  const aberta = folhaAberta(location.hash);
  const conteudos = { salario: folhaSalario, proventos: folhaProventos, saldos: folhaSaldos, investir: folhaInvestir, 'so-saldos': folhaSoSaldos };
  if (!aberta || !conteudos[aberta]) {
    abertaAqui = false;
    esconderFolha();
    return;
  }
  const painelFolha = mostrarFolha({ conteudo: conteudos[aberta](), aoFechar: fechar, rotulo: TITULOS_FOLHA[aberta] });
  // Foco no primeiro campo (sem rolar a folha); sem campo, na própria folha, para o leitor de tela começar do topo.
  setTimeout(() => (painelFolha.querySelector('input') ?? painelFolha).focus({ preventScroll: true }), 50);
}
