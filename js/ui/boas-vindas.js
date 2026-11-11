// Assistente de primeiro uso (spec §5.1): conexão, dados básicos, orçamento, investimentos, carteira-alvo e veredito.
import { h, campoMoeda, cartao, botao, aviso, textoConexao, AVISO_EXEMPLOS } from './dom.js';
import { formatarBRL, formatarDuracao } from '../core/formato.js';
import { formatarMes as nomeMes } from '../core/meses.js';
import { CATEGORIAS_SUGERIDAS, custoDeVida } from '../core/metas.js';
import { CLASSES, CARTEIRA_PADRAO } from '../core/alocacao.js';
import { criarEstadoInicial, novoId } from '../core/esquema.js';
import { calcularPainel } from '../core/motor.js';

export const PAPEIS = [
  { id: 'carteira', nome: 'Carteira (faz parte do plano)' },
  { id: 'reserva', nome: 'Reserva de emergência' },
  { id: 'caixa', nome: 'Caixa de oportunidade' },
  { id: 'fora-do-plano', nome: 'Fora do plano (poupança, CDB, ação, cripto...)' },
  { id: 'fgts', nome: 'FGTS (só informativo)' },
];
export const NOMES_CLASSE_CURTOS = { rendaFixa: 'Renda fixa', fiis: 'Fundos imobiliários', acoes: 'Ações BR', exterior: 'Exterior' };

const TOTAL_PASSOS = 6;

export function render(container, ctx) {
  const mesInicio = ctx.hoje.slice(0, 7);
  const dados = {
    token: '', dono: ctx.donoSugerido,
    salario: null, recebe13: true, recebeFerias: true, anuaisJaSeparados: null,
    orcamento: CATEGORIAS_SUGERIDAS.map((c) => ({ ...c, valor: null })),
    ativos: [],
    pesos: Object.fromEntries(CLASSES.map((c) => [c, CARTEIRA_PADRAO[c].peso * 100])),
  };
  let passo = 0;

  const ir = (n) => { passo = n; desenhar(); window.scrollTo(0, 0); };

  function moldura(titulo, subtitulo, corpo, { proximo = null, podeAvancar = true, voltar = true } = {}) {
    const avancar = botao('Continuar', () => proximo?.(), { desabilitado: !podeAvancar });
    return [
      h('div', { class: 'passos', 'aria-label': `Passo ${passo + 1} de ${TOTAL_PASSOS}` },
        Array.from({ length: TOTAL_PASSOS }, (_, k) => h('span', { class: k <= passo ? 'feito' : '' }))),
      h('h1', {}, titulo),
      subtitulo && h('p', { class: 'suave' }, subtitulo),
      ...[corpo].flat(),
      h('div', { class: 'botoes' },
        voltar && passo > 0 && botao('Voltar', () => ir(passo - 1), { secundario: true }),
        proximo && avancar),
    ];
  }

  // ---------- 1. Conectar ----------
  function passoConectar() {
    const msg = h('div');
    const token = h('input', { class: 'entrada', type: 'password', placeholder: 'github_pat_...', autocomplete: 'off', oninput: (e) => { dados.token = e.target.value.trim(); } });
    const dono = h('input', { class: 'entrada', type: 'text', value: dados.dono, placeholder: 'seu usuário do GitHub', oninput: (e) => { dados.dono = e.target.value.trim(); } });
    const testar = botao('Testar conexão', async () => {
      if (!dados.token || !dados.dono) { msg.replaceChildren(aviso('atencao', 'Preencha a chave e o usuário.')); return; }
      testar.disabled = true;
      msg.replaceChildren(aviso('info', 'Testando...'));
      const r = await ctx.conectar({ token: dados.token, dono: dados.dono });
      testar.disabled = false;
      if (r.aviso) {
        ctx.desconectar();
        msg.replaceChildren(aviso('alerta', textoConexao(r.aviso)));
      } else if (r.estado) {
        ctx.navegar('#/inicio');
      } else {
        msg.replaceChildren(aviso('ok', 'Conectado! Ainda não há dados guardados, então vamos configurar.'));
        setTimeout(() => ir(1), 900);
      }
    });
    return moldura('Bem-vindo ao Projeto R', 'Seus dados ficam num repositório privado só seu no GitHub, e assim aparecem no celular e no computador.', [
      cartao(
        h('h2', {}, 'Como criar sua chave (uma vez só)'),
        h('ol', {},
          h('li', {}, 'Abra ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'github.com → Fine-grained tokens → Generate new token'), '.'),
          h('li', {}, 'Nome: "Projeto R". Validade: 1 ano.'),
          h('li', {}, 'Repository access: ', h('b', {}, 'Only select repositories → Projeto_R-dados'), '.'),
          h('li', {}, 'Permissions → Repository permissions → ', h('b', {}, 'Contents: Read and write'), '.'),
          h('li', {}, 'Clique em Generate token e copie a chave (começa com github_pat_).')),
        h('p', { class: 'suave pequeno' }, 'A chave só dá acesso ao repositório de dados e fica guardada apenas neste aparelho.')),
      cartao(
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Chave do GitHub'), token),
        h('label', { class: 'campo', style: 'margin-top:12px' }, h('span', { class: 'campo-rotulo' }, 'Seu usuário do GitHub'), dono),
        h('div', { class: 'botoes', style: 'margin-top:12px' }, testar, botao('Continuar sem sincronizar', () => ir(1), { secundario: true })),
        msg),
    ], { voltar: false });
  }

  // ---------- 2. Dados básicos ----------
  function passoBasico() {
    const continuar = () => ir(2);
    const tela = moldura('Sua renda', 'Comece pelo valor que cai na sua conta todo mês.', [
      cartao(
        campoMoeda({ rotulo: 'Salário líquido mensal', valor: dados.salario, dica: 'O valor livre na mão, já sem descontos.', aoMudar: (v) => { dados.salario = v; atualizarBotao(); } }),
        h('label', { class: 'marcar', style: 'margin-top:12px' }, h('input', { type: 'checkbox', checked: dados.recebe13, onchange: (e) => { dados.recebe13 = e.target.checked; } }), 'Recebo 13º salário'),
        h('label', { class: 'marcar' }, h('input', { type: 'checkbox', checked: dados.recebeFerias, onchange: (e) => { dados.recebeFerias = e.target.checked; } }), 'Recebo férias com 1/3'),
        h('div', { style: 'margin-top:12px' }, campoMoeda({
          rotulo: 'Já tem dinheiro separado para as despesas anuais?', valor: dados.anuaisJaSeparados,
          dica: 'IPVA, IPTU, seguros... do ciclo atual (novembro a outubro). Deixe vazio se não tiver.',
          aoMudar: (v) => { dados.anuaisJaSeparados = v; },
        }))),
    ], { proximo: continuar, podeAvancar: (dados.salario ?? 0) > 0 });
    function atualizarBotao() {
      const b = container.querySelector('.botoes .botao:not(.secundario)');
      if (b) b.disabled = !((dados.salario ?? 0) > 0);
    }
    return tela;
  }

  // ---------- 3. Orçamento ----------
  function passoOrcamento() {
    const total = h('div');
    const atualizarTotal = () => {
      const custo = custoDeVida(dados.orcamento.filter((c) => (c.valor ?? 0) > 0));
      total.replaceChildren(
        h('div', { class: 'rotulo' }, 'Seu custo de vida'),
        h('div', { class: 'valor' }, `${formatarBRL(custo.total)}/mês`),
        h('div', { class: 'suave pequeno' }, `${formatarBRL(custo.mensal)} por mês + ${formatarBRL(custo.anual)} por ano em despesas anuais`));
      const b = container.querySelector('.botoes .botao:not(.secundario)');
      if (b) b.disabled = !(custo.total > 0);
    };
    const linhaCategoria = (c) => h('div', { class: 'linha' },
      h('div', { class: 'nome' }, h('span', {}, c.nome)),
      h('div', { style: 'width:150px' }, campoMoeda({ rotulo: null, valor: c.valor, aoMudar: (v) => { c.valor = v; atualizarTotal(); } })));
    const grupo = (tipo, titulo) => cartao(h('h2', {}, titulo), ...dados.orcamento.filter((c) => c.tipo === tipo).map(linhaCategoria));

    const nomeNova = h('input', { class: 'entrada', placeholder: 'Nova categoria' });
    const tipoNova = h('select', { class: 'entrada' }, h('option', { value: 'mensal' }, 'Mensal'), h('option', { value: 'anual' }, 'Anual'));
    const adicionar = botao('Adicionar', () => {
      const nome = nomeNova.value.trim();
      if (!nome) return;
      dados.orcamento.push({ id: novoId(), nome, tipo: tipoNova.value, valor: null });
      desenhar();
    }, { secundario: true });

    const tela = moldura('Seu custo de vida', 'Preencha só o que faz parte da sua vida. Use valores aproximados; dá para ajustar depois.', [
      cartao(total),
      grupo('mensal', 'Gastos mensais'),
      grupo('anual', 'Gastos anuais (pagos uma vez por ano)'),
      cartao(h('h3', {}, 'Faltou alguma?'), h('div', { class: 'botoes' }, nomeNova, tipoNova, adicionar)),
    ], { proximo: () => ir(3), podeAvancar: false });
    queueMicrotask(atualizarTotal);
    return tela;
  }

  // ---------- 4. Investimentos atuais ----------
  function passoInvestimentos() {
    const novo = { nome: '', papel: 'carteira', classe: 'rendaFixa', tipoForaDoPlano: 'poupanca', saldo: null, cotas: null };
    const nome = h('input', { class: 'entrada', placeholder: 'Ex.: Tesouro Selic 2029, BOVA11, Poupança', oninput: (e) => { novo.nome = e.target.value.trim(); } });
    const classe = h('select', { class: 'entrada', onchange: (e) => { novo.classe = e.target.value; mostrarExtras(); } },
      ...CLASSES.map((c) => h('option', { value: c }, NOMES_CLASSE_CURTOS[c])));
    const tipoFora = h('select', { class: 'entrada', onchange: (e) => { novo.tipoForaDoPlano = e.target.value; } },
      h('option', { value: 'poupanca' }, 'Poupança'), h('option', { value: 'outro' }, 'Outro'));
    const cotas = h('input', { class: 'entrada', type: 'number', min: '0', step: '1', placeholder: 'Quantidade de cotas (opcional)', oninput: (e) => { novo.cotas = Number(e.target.value) || null; } });
    const papel = h('select', { class: 'entrada', onchange: (e) => { novo.papel = e.target.value; mostrarExtras(); } },
      ...PAPEIS.map((p) => h('option', { value: p.id }, p.nome)));
    const extras = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    function mostrarExtras() {
      extras.replaceChildren(
        novo.papel === 'carteira' && classe,
        novo.papel === 'fora-do-plano' && tipoFora,
        novo.papel === 'carteira' && novo.classe !== 'rendaFixa' && cotas);
    }
    mostrarExtras();
    const lista = dados.ativos.length
      ? dados.ativos.map((a, k) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, a.nome), h('small', {}, PAPEIS.find((p) => p.id === a.papel).nome + (a.classe ? ` · ${NOMES_CLASSE_CURTOS[a.classe]}` : ''))),
        h('div', { class: 'quanto' }, formatarBRL(a.saldo), ' ', h('button', { class: 'chip', type: 'button', onclick: () => { dados.ativos.splice(k, 1); desenhar(); } }, 'remover'))))
      : [h('p', { class: 'suave' }, 'Nenhum investimento cadastrado. Pode deixar vazio se ainda não investe.')];

    return moldura('O que você já tem', 'Cadastre o que já está investido, com o saldo que aparece hoje na corretora ou no banco.', [
      cartao(...lista),
      cartao(
        h('h3', {}, 'Adicionar investimento'),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px' },
          nome, papel, extras,
          campoMoeda({ rotulo: 'Saldo hoje', valor: null, aoMudar: (v) => { novo.saldo = v; } }),
          botao('Adicionar', () => {
            if (!novo.nome || novo.saldo == null) { ctx.aviso('Preencha o nome e o saldo.', 'atencao', 3000); return; }
            dados.ativos.push({
              ...novo,
              classe: novo.papel === 'carteira' ? novo.classe : null,
              tipoForaDoPlano: novo.papel === 'fora-do-plano' ? novo.tipoForaDoPlano : null,
            });
            desenhar();
          }, { secundario: true }))),
    ], { proximo: () => ir(4) });
  }

  // ---------- 5. Carteira-alvo ----------
  function passoCarteira() {
    const soma = () => CLASSES.reduce((s, c) => s + (Number(dados.pesos[c]) || 0), 0);
    const somaEl = h('p', { class: 'suave' });
    const atualizar = () => {
      const s = soma();
      somaEl.textContent = `Soma: ${s.toLocaleString('pt-BR')}%${Math.abs(s - 100) > 0.01 ? ' — precisa dar 100%.' : ''}`;
      const b = container.querySelector('.botoes .botao:not(.secundario)');
      if (b) b.disabled = Math.abs(s - 100) > 0.01;
    };
    const tela = moldura('Sua carteira-alvo', 'Uma carteira que paga renda desde o começo: os proventos são reinvestidos até você se aposentar.', [
      cartao(...CLASSES.map((c) => h('div', { class: 'linha' },
        h('div', { class: 'nome' }, h('span', {}, `${NOMES_CLASSE_CURTOS[c]} · ${CARTEIRA_PADRAO[c].ticker}`), h('small', {}, CARTEIRA_PADRAO[c].frase)),
        h('label', { class: 'quanto', style: 'display:flex;align-items:center;gap:4px' },
          h('input', { class: 'entrada', type: 'number', min: '0', max: '100', step: '1', style: 'width:76px', value: String(dados.pesos[c]), 'aria-label': `Percentual de ${NOMES_CLASSE_CURTOS[c]}`, oninput: (e) => { dados.pesos[c] = Number(e.target.value); atualizar(); } }),
          '%'))),
      somaEl),
      aviso('info', AVISO_EXEMPLOS),
    ], { proximo: () => ir(5) });
    queueMicrotask(atualizar);
    return tela;
  }

  // ---------- 6. Veredito ----------
  function montarEstado() {
    const estado = criarEstadoInicial({
      salario: dados.salario, mesInicio, recebe13: dados.recebe13, recebeFerias: dados.recebeFerias,
      anuaisJaSeparados: dados.anuaisJaSeparados ?? 0,
    });
    estado.orcamento = dados.orcamento.filter((c) => (c.valor ?? 0) > 0)
      .map((c) => ({ id: novoId(), nome: c.nome, tipo: c.tipo, valor: c.valor, mes: mesInicio }));
    for (const c of CLASSES) estado.carteiraAlvo[c].peso = (Number(dados.pesos[c]) || 0) / 100;
    for (const a of dados.ativos) {
      const id = novoId();
      estado.ativos.push({ id, nome: a.nome, ticker: a.nome, papel: a.papel, classe: a.classe, tipoForaDoPlano: a.tipoForaDoPlano });
      estado.saldos.push({ ativoId: id, data: ctx.hoje, valor: a.saldo, cotas: a.cotas ?? null });
    }
    const contaParaMeta = (a) => ['carteira', 'caixa', 'fora-do-plano'].includes(a.papel);
    estado.plano = { p0: dados.ativos.filter(contaParaMeta).reduce((s, a) => s + a.saldo, 0), mesP0: mesInicio };
    return estado;
  }

  function passoVeredito() {
    const estado = montarEstado();
    const p = calcularPainel({ estado, hoje: ctx.hoje });
    // A renda plena é a meta; o alvo é só referência, sem alarme (spec v2 §5.5).
    const conclusao = aviso('info', p.faltam !== null
      ? `No seu ritmo, faltam ${formatarDuracao(p.faltam)} para a renda plena (${nomeMes(p.projecaoM2.mes)}). Seu alvo é ${nomeMes(p.mesAlvo)}: no simulador você vê o que muda se investir mais.`
      : 'No ritmo de hoje, a renda plena fica a mais de 50 anos. No simulador você vê quanto seria preciso investir.');
    const reservaFaltando = p.checkup.find((x) => x.chave === 'reserva')?.nivel === 'atencao';
    return moldura('Seu plano', 'Isto é o que a matemática diz hoje. O app acompanha mês a mês e ajusta a rota.', [
      h('div', { class: 'grade' },
        cartao(h('div', { class: 'rotulo' }, '🏆 Renda plena (sua meta)'), h('div', { class: 'valor' }, formatarBRL(p.metas.rendaPlena)),
          h('div', { class: 'suave pequeno' }, `Patrimônio que paga ${formatarBRL(p.salario)}/mês, o seu salário.`)),
        cartao(h('div', { class: 'rotulo' }, '🥇 Independência (um marco no caminho)'), h('div', { class: 'valor' }, formatarBRL(p.metas.independencia)),
          h('div', { class: 'suave pequeno' }, `Paga o seu custo de vida de ${formatarBRL(p.custoTotal)}/mês.`)),
        cartao(h('div', { class: 'rotulo' }, 'Quanto sobra para investir'), h('div', { class: 'valor' }, `${formatarBRL(p.ritmo.valor)}/mês`))),
      conclusao,
      reservaFaltando && aviso('info', 'Primeiro vamos formar sua reserva de emergência (6 meses de custo de vida). Só depois o dinheiro vai para os investimentos.'),
      h('div', { class: 'botoes' }, botao('Começar', async () => {
        await ctx.salvar(() => estado);
        ctx.navegar('#/inicio');
      })),
    ]);
  }

  const PASSOS = [passoConectar, passoBasico, passoOrcamento, passoInvestimentos, passoCarteira, passoVeredito];
  function desenhar() {
    container.replaceChildren(...PASSOS[passo]().filter(Boolean));
  }
  desenhar();
}
