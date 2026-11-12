// Aba Mês em lista de 4 tarefas (desenho de 2026-11-12): salário, proventos desde o último registro,
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
import {
  rascunhoVazio, rascunhoDoRegistro, situacao, ultimoRegistroAntes, saldoDigitadoNoMes, totalAplicado,
  saldosParaGravar, dataCurta, nomeDoMes,
} from '../core/lista-mes.js';
import { lerRascunho, salvarRascunho, apagarRascunho } from './mes-rascunho.js';
import { folhaAberta } from './rotas.js';

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
  const sit = situacao({ registrado: Boolean(existente), rascunho });
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
  const resposta = () => calcularMes({
    estado, recebido: r.recebido ?? 0, tipoExtra: r.tipoExtra, proventos: r.proventos ?? 0, saldosAtualizados: saldosDoRascunho(), hoje,
  });
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

  // ---------- folhas ----------
  function folhaSalario() {
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
        botao('Salvar', () => {
          if (r.recebido == null) { ctx.aviso('Digite quanto caiu na conta.', 'atencao', 3000); return; }
          r.feito.salario = true;
          guardar();
          fechar();
        }),
        botao('Fechar', fechar, { secundario: true })),
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
        botao('Salvar', () => {
          r.proventos ??= 0;
          r.feito.proventos = true;
          guardar();
          fechar();
        }),
        botao('Fechar', fechar, { secundario: true })),
    ];
  }

  function folhaSaldos() {
    r.saldos ??= {};
    return [
      h('h2', {}, 'Copie os saldos da corretora'),
      h('p', { class: 'suave' }, 'Copie antes de aplicar o dinheiro deste mês. Deixa a divisão mais precisa.'),
      h('div', {}, ...camposSaldos(r.saldos, guardar)),
      h('div', { class: 'botoes' },
        listaSaldos.length > 0 && botao('Usar estes saldos', () => { r.saldosModo = 'copiados'; guardar(); fechar(); }),
        botao('Pular', () => { if (r.saldosModo !== 'copiados') r.saldosModo = 'pulados'; guardar(); fechar(); }, { secundario: listaSaldos.length > 0 })),
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
      fechar();
    });
    return [
      h('h2', {}, 'Atualizar saldos'),
      h('p', { class: 'suave' }, `Copie os valores como estão na corretora agora. O registro de ${nome} não muda.`),
      h('div', {}, ...camposSaldos(edicoes, () => {})),
      h('div', { class: 'botoes' }, salvar, botao('Cancelar', fechar, { secundario: true })),
    ];
  }

  function folhaInvestir() {
    if (!sit.podeInvestir) {
      return [h('h2', {}, 'Investir'), aviso('info', 'Faça as tarefas 1 a 3 antes.'), h('div', { class: 'botoes' }, botao('Fechar', fechar, { secundario: true }))];
    }
    const rr = resposta();
    const blocos = [];
    if (rr.semAporte) {
      blocos.push(aviso('atencao', h('b', {}, rr.motivo === 'custo-de-vida'
        ? 'Este mês não invista nada, o seu dia a dia vem primeiro.'
        : 'Este mês não sobra nada para investir.')));
    } else {
      blocos.push(cartao(
        h('div', { class: 'rotulo' }, 'Separe para investir este mês'),
        h('div', { class: 'valor-grande' }, formatarBRL(rr.excedente)),
        h('div', { class: 'suave' }, `${formatarBRL(rr.paraDiaADia)} ficam para o seu dia a dia.`)));
    }
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
      botao(temAlgo ? 'Já apliquei' : 'Registrar este mês', () => abrirConfirmacao(rr, temAlgo, confirmacao)),
      botao('Fechar', fechar, { secundario: true })));
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
      fechar();
    });
    confirmacao.replaceChildren(cartao(
      h('h3', {}, temAlgo ? 'Quanto você aplicou de fato?' : 'Registrar o mês'),
      temAlgo && h('p', { class: 'suave pequeno' }, 'Se aplicou um valor diferente do sugerido, corrija aqui.'),
      ...aplicado.map((a) => h('div', { style: 'margin-top:8px' }, campoMoeda({ rotulo: a.nome, valor: a.valor, aoMudar: (v) => { a.valor = v; } }))),
      transferencia.valor > 0 && h('div', { style: 'margin-top:8px' }, campoMoeda({ rotulo: 'Transferido da caixa de oportunidade', valor: transferencia.valor, aoMudar: (v) => { transferencia.valor = v; } })),
      h('div', { class: 'botoes', style: 'margin-top:12px' }, confirmar, botao('Cancelar', () => confirmacao.replaceChildren(), { secundario: true }))));
    confirmacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- a lista ----------
  const registrado = sit.modo === 'registrado';
  const entrarEmEdicao = () => salvarRascunho(rascunhoDoRegistro(existente));

  function situacaoInvestir() {
    if (registrado) return `${formatarBRL(totalAplicado(existente))} aplicados`;
    if (!sit.podeInvestir) return 'Libera depois das tarefas 1 a 3';
    const rr = resposta();
    if (rr.semAporte) return rr.motivo === 'custo-de-vida' ? 'O seu dia a dia vem primeiro' : 'Este mês não sobra nada para investir';
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
    { n: 1, chave: 'salario', titulo: 'Salário que caiu', detalhe: sit.feitas.salario ? formatarBRL(recebido) : 'Falta preencher' },
    {
      n: 2, chave: 'proventos', titulo: 'Proventos desde o último registro',
      detalhe: sit.feitas.proventos ? formatarBRL(proventos ?? 0) : ultimoRegistro ? `Desde ${dataCurta(ultimoRegistro)}` : 'Desde que você começou',
    },
    { n: 3, chave: 'saldos', titulo: 'Saldos da corretora', detalhe: situacaoSaldos() },
    { n: 4, chave: 'investir', titulo: 'Investir', detalhe: situacaoInvestir(), bloqueada: !registrado && !sit.podeInvestir },
  ];
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

  const passos = h('div', { class: 'passos', 'aria-hidden': 'true' }, ...[0, 1, 2, 3].map((k) => h('i', { class: k < sit.quantas ? 'feito' : '' })));
  const painel = calcularPainel({ estado, hoje });
  const cabecalho = registrado
    ? h('section', { class: 'cartao registrado' },
      h('div', { class: 'titulo-check' }, h('span', { class: 'check', 'aria-hidden': 'true' }, '✓'),
        h('div', {}, h('h2', {}, `${Nome} registrado`),
          h('p', { class: 'suave pequeno' }, `em ${dataCurta(existente.data)} · ${formatarBRL(totalAplicado(existente))} aplicados`))),
      passos)
    : cartao(
      h('h1', {}, `Dia de pagamento de ${nome}`),
      h('p', { class: 'suave' }, `${sit.quantas} de 4 feitos`),
      passos,
      h('p', { class: 'suave', style: 'margin-top:12px' }, painel.faltam !== null
        ? `Faltam ${formatarDuracao(painel.faltam)} para a renda plena.`
        : 'No ritmo de hoje, a renda plena fica a mais de 50 anos.'));

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
