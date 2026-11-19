// Contas da casa · Mês (desenho de 2026-11-19): total das contas, quanto cada um paga e quanto sobra,
// a lista das contas e os salários. Tocar num valor abre uma folha com um campo só (#/casa?mes=…&folha=…);
// o voltar do celular fecha a folha. Feita para quem tem receio de coisas complicadas: pouco texto, nada de jargão.
import { h, campoMoeda, cartao, botao, aviso, mostrarFolha, esconderFolha } from './dom.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { somarMeses, diffMeses } from '../core/meses.js';
import {
  resumoDoMes, primeiroMes, valorDaConta, salarioNoMes, criarCasa, salvarValor, salvarSalario,
  adicionarCompra, apagarCompra, conferirFatura,
} from '../core/casa.js';
import { folhaAberta, parametroDoHash, depoisDeSalvar } from './rotas.js';
import { cartaoConectar } from './conectar.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeDoMes = (mes) => MESES[Number(mes.slice(5, 7)) - 1];
const maiuscula = (t) => t[0].toUpperCase() + t.slice(1);
const tituloDoMes = (mes) => `${maiuscula(nomeDoMes(mes))} de ${mes.slice(0, 4)}`;
// "outubro" para meses próximos; "outubro de 2025" para os mais antigos.
const quando = (deOnde, mes) => (diffMeses(deOnde, mes) <= 11 ? nomeDoMes(deOnde) : `${nomeDoMes(deOnde)} de ${deOnde.slice(0, 4)}`);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function estadoDaTela({ casa, conectado, casaSincronizada }) {
  if (casa) return 'mes';
  return conectado && !casaSincronizada ? 'carregando' : 'comecar';
}

export function mesDaTela(hash, hoje) {
  const mes = parametroDoHash(hash, 'mes');
  return mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : hoje.slice(0, 7);
}

// A folha foi aberta por um toque nesta sessão? Então fechar = voltar no histórico (some a entrada criada).
let abertaAqui = false;
let verSemValor = false;

export function render(container, ctx) {
  verSemValor = false;
  desenhar(container, ctx);
}

export function atualizar(container, ctx) {
  desenhar(container, ctx);
}

function desenhar(container, ctx) {
  const tela = estadoDaTela({ casa: ctx.casa, conectado: Boolean(ctx.conexao), casaSincronizada: ctx.casaSincronizada });
  if (tela !== 'mes') {
    esconderFolha();
    container.replaceChildren(...(tela === 'carregando'
      ? [cartao(h('p', { class: 'suave' }, 'Carregando as contas da casa…'))]
      : telaDeComeco(ctx)));
    return;
  }
  desenharMes(container, ctx);
}

// ---------- primeiro uso ----------
function telaDeComeco(ctx) {
  const nomes = ['', ''];
  const campo = (rotulo, k, dica) => h('label', { class: 'campo', style: 'margin-top:12px' },
    h('span', { class: 'campo-rotulo' }, rotulo),
    h('input', { class: 'entrada', type: 'text', autocomplete: 'off', oninput: (e) => { nomes[k] = e.target.value.trim(); } }),
    dica && h('span', { class: 'campo-dica' }, dica));
  const comecar = botao('Começar', async () => {
    if (!nomes[0] || !nomes[1]) { ctx.aviso('Escreva os dois nomes.', 'atencao', 3000); return; }
    comecar.disabled = true;
    await ctx.salvarCasa(() => criarCasa({ nomes }));
    ctx.aviso('Pronto! Agora é só anotar as contas do mês.', 'ok', 4000);
    ctx.rerender();
  });
  return [
    h('section', { class: 'cartao', 'data-sem-recarregar': '' },
      h('h1', {}, 'Contas da casa'),
      h('p', { class: 'suave' }, 'Anote as contas da casa e veja quanto cada um paga. Quem ganha mais paga mais: cada um paga a mesma fatia do que ganha.'),
      campo('Seu nome', 0),
      campo('Quem divide as contas com você', 1),
      h('div', { class: 'botoes', style: 'margin-top:14px' }, comecar)),
    !ctx.conexao && cartaoConectar(ctx, {
      titulo: 'Já usa as contas da casa em outro celular?',
      texto: 'Conecte este celular com uma chave do GitHub para ver as mesmas contas aqui.',
    }),
    ctx.estado && h('button', { type: 'button', class: 'botao-link', onclick: () => ctx.navegar('#/inicio') }, 'Voltar para o planejador de aposentadoria'),
  ].filter(Boolean);
}

// ---------- o mês ----------
function desenharMes(container, ctx) {
  const { casa, hoje } = ctx;
  const mesAtual = hoje.slice(0, 7);
  const mes = mesDaTela(location.hash, hoje);
  const r = resumoDoMes(casa, mes);
  const nome = nomeDoMes(mes);

  const endereco = (extra = '') => `#/casa?mes=${mes}${extra}`;
  const abrir = (folha) => {
    abertaAqui = true;
    location.hash = endereco(`&folha=${folha}`);
  };
  const fechar = () => {
    if (abertaAqui) {
      abertaAqui = false;
      history.back();
    } else {
      location.replace(endereco());
    }
  };
  // Depois de salvar no GitHub (pode demorar): fecha a folha se ainda aberta; senão redesenha ou não mexe.
  const terminar = (folha) => {
    const acao = depoisDeSalvar(location.hash, folha, 'casa');
    if (acao === 'fechar') fechar();
    else if (acao === 'redesenhar') ctx.rerender();
  };
  const irPara = (m) => location.replace(`#/casa?mes=${m}`);

  // ---------- cabeçalho com as setas ----------
  const primeiro = primeiroMes(casa) ?? mesAtual;
  const podeVoltar = mes > (primeiro < mesAtual ? primeiro : mesAtual);
  const podeAvancar = mes < somarMeses(mesAtual, 12);
  const cabecalho = h('div', { class: 'casa-mes' },
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Mês anterior', disabled: !podeVoltar, onclick: () => irPara(somarMeses(mes, -1)) }, '‹'),
    h('h1', {}, tituloDoMes(mes)),
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Próximo mês', disabled: !podeAvancar, onclick: () => irPara(somarMeses(mes, 1)) }, '›'));
  const voltarAoAtual = mes !== mesAtual
    && h('button', { type: 'button', class: 'botao-link casa-voltar', onclick: () => irPara(mesAtual) }, `Voltar para ${nomeDoMes(mesAtual)}`);

  // ---------- total e divisão ----------
  const situacaoTotal = r.aConfirmar
    ? h('span', { class: 'selo' }, `${plural(r.aConfirmar, 'valor', 'valores')} a confirmar`)
    : r.contas.length ? h('span', { class: 'selo ok' }, 'Tudo confirmado ✓') : h('span', { class: 'suave' }, 'Nenhuma conta neste mês');
  const total = cartao(
    h('div', { class: 'rotulo' }, 'Contas da casa'),
    h('div', { class: 'valor-grande' }, formatarBRL(r.total)),
    h('div', { style: 'margin-top:4px' }, situacaoTotal));
  const divisao = r.divide
    ? [
      h('div', { class: 'casa-pessoas' }, ...r.pessoas.map((p) => h('section', { class: 'cartao casa-pessoa' },
        h('div', { class: 'rotulo' }, `${p.pessoa.nome} paga`),
        h('div', { class: 'valor' }, formatarBRL(p.paga)),
        h('div', { class: 'suave pequeno' }, `sobra ${formatarBRL(p.sobra)}`)))),
      h('p', { class: 'nota' }, `Quem ganha mais paga mais: cada um paga ${formatarPct(r.fatiaDaRenda, 0)} do que ganha.`),
    ]
    : [aviso('info', 'Preencha os salários lá embaixo para o app dividir as contas.')];

  // ---------- listas ----------
  const linha = ({ titulo, detalhe, valor, aConfirmar, aoTocar, vazio = false }) => h('button', {
    type: 'button', class: `casa-linha${aConfirmar ? ' a-confirmar' : ''}${vazio ? ' vazio' : ''}`, onclick: aoTocar,
  },
  h('span', { class: 'texto' }, h('b', {}, titulo), detalhe && h('small', {}, ...[detalhe].flat())),
  h('span', { class: 'quanto' }, valor),
  h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));

  const detalheConta = (c) => {
    const compras = c.compras.length ? plural(c.compras.length, 'compra', 'compras') : null;
    if (c.situacao === 'a-confirmar') {
      return [h('span', { class: 'selo' }, 'a confirmar'), ' ', compras ?? `igual a ${quando(c.deOnde, mes)}`];
    }
    return compras;
  };
  const tocarConta = (conta) => () => abrir(`${conta.compraPorCompra ? 'cartao' : 'conta'}-${conta.id}`);
  const linhasContas = r.contas.map((c) => linha({
    titulo: c.conta.nome, detalhe: detalheConta(c), valor: formatarBRL(c.valor), aConfirmar: c.situacao === 'a-confirmar', aoTocar: tocarConta(c.conta),
  }));
  const semValor = r.semValor.length
    ? (verSemValor
      ? r.semValor.map((conta) => linha({ titulo: conta.nome, detalhe: 'sem valor neste mês', valor: '—', vazio: true, aoTocar: tocarConta(conta) }))
      : [h('button', {
        type: 'button', class: 'botao-link casa-ver-mais',
        onclick: () => { verSemValor = true; ctx.rerender(); },
      }, `Ver ${plural(r.semValor.length, 'conta sem valor', 'contas sem valor')}`)])
    : [];
  const listaContas = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Contas'),
    h('div', {}, ...linhasContas, ...semValor),
    !casa.contas.some((c) => !c.arquivada) && h('p', { class: 'suave', style: 'padding:0 16px 12px' }, 'Nenhuma conta cadastrada. Cadastre em Ajustes.'));

  const listaSalarios = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Salários'),
    h('div', {}, ...r.pessoas.map((p) => linha({
      titulo: p.pessoa.nome,
      detalhe: p.situacaoSalario === 'a-confirmar' ? [h('span', { class: 'selo' }, 'a confirmar'), ' ', `igual a ${quando(p.deOnde, mes)}`]
        : p.situacaoSalario === 'vazio' ? 'Falta preencher' : null,
      valor: p.situacaoSalario === 'vazio' ? '—' : formatarBRL(p.salario),
      aConfirmar: p.situacaoSalario === 'a-confirmar',
      aoTocar: () => abrir(`salario-${p.pessoa.id}`),
    }))));

  container.replaceChildren(...[
    cabecalho, voltarAoAtual, total, ...divisao, listaContas, listaSalarios,
  ].filter(Boolean));

  // ---------- folhas ----------
  const mesAnterior = somarMeses(mes, -1);
  const dicaAnterior = (v) => v.situacao !== 'vazio' && h('p', { class: 'suave pequeno' }, `Em ${nomeDoMes(mesAnterior)}: ${formatarBRL(v.valor)}`);
  const titulo = (texto) => h('h2', { 'data-sem-recarregar': '' }, texto); // valor digitado ainda não salvo: a atualização automática espera

  function folhaValor({ texto, situacao, valorAtual, anterior, dica, aoSalvar, aoTirar, folha }) {
    let valor = situacao === 'vazio' ? null : valorAtual;
    const salvar = botao('Salvar', async () => {
      if (valor == null) { ctx.aviso('Digite o valor.', 'atencao', 3000); return; }
      salvar.disabled = true;
      await ctx.salvarCasa((c) => aoSalvar(c, valor));
      ctx.aviso('Salvo.', 'ok', 2500);
      terminar(folha);
    });
    return [
      titulo(texto),
      situacao === 'a-confirmar' && h('p', { class: 'suave' }, 'Este valor é uma previsão. Confira e salve o valor certo.'),
      campoMoeda({ rotulo: null, valor, grande: true, dica, aoMudar: (v) => { valor = v; } }),
      dicaAnterior(anterior),
      h('div', { class: 'botoes' }, salvar, botao('Cancelar', fechar, { secundario: true })),
      situacao === 'confirmado' && h('button', {
        type: 'button', class: 'botao-link',
        onclick: async () => { await ctx.salvarCasa(aoTirar); ctx.aviso('Valor tirado. O app volta a prever.', 'ok', 3000); terminar(folha); },
      }, 'Tirar o valor deste mês'),
    ];
  }

  function folhaConta(conta, folha) {
    const v = valorDaConta(casa, mes, conta.id);
    return folhaValor({
      folha, texto: `${conta.nome} de ${nome}`, situacao: v.situacao, valorAtual: v.valor,
      anterior: valorDaConta(casa, mesAnterior, conta.id),
      aoSalvar: (c, valor) => salvarValor(c, { mes, contaId: conta.id, valor }),
      aoTirar: (c) => salvarValor(c, { mes, contaId: conta.id, valor: null }),
    });
  }

  function folhaSalario(pessoa, folha) {
    const s = salarioNoMes(casa, mes, pessoa.id);
    return folhaValor({
      folha, texto: `Salário de ${pessoa.nome} em ${nome}`, situacao: s.situacao, valorAtual: s.valor,
      anterior: salarioNoMes(casa, mesAnterior, pessoa.id), dica: 'O salário líquido que caiu na conta.',
      aoSalvar: (c, valor) => salvarSalario(c, { mes, pessoaId: pessoa.id, valor }),
      aoTirar: (c) => salvarSalario(c, { mes, pessoaId: pessoa.id, valor: null }),
    });
  }

  function folhaCartao(conta, folha) {
    const v = valorDaConta(casa, mes, conta.id);
    const nova = { nome: '', valor: null, vezes: 1 };
    const vezesTexto = h('output', { class: 'casa-vezes' });
    const mostrarVezes = () => { vezesTexto.textContent = nova.vezes === 1 ? '1 vez' : `${nova.vezes} vezes`; };
    mostrarVezes();
    const mudarVezes = (d) => { nova.vezes = Math.min(48, Math.max(1, nova.vezes + d)); mostrarVezes(); };

    const anotar = botao('Anotar compra', async () => {
      if (!nova.nome) { ctx.aviso('Escreva o que foi comprado.', 'atencao', 3000); return; }
      if (nova.valor == null || nova.valor <= 0) { ctx.aviso('Digite o valor da compra.', 'atencao', 3000); return; }
      anotar.disabled = true;
      await ctx.salvarCasa((c) => adicionarCompra(c, { mes, contaId: conta.id, nome: nova.nome, valor: nova.valor, vezes: nova.vezes }));
      ctx.aviso(nova.vezes > 1 ? `Compra anotada em ${nova.vezes} parcelas.` : 'Compra anotada.', 'ok', 2500);
      ctx.rerender();
    });

    const compras = v.compras.map((c) => h('div', { class: 'casa-compra' },
      h('span', { class: 'texto' }, h('span', {}, c.nome), c.parcela && h('small', {}, `${c.parcela.n} de ${c.parcela.de}`)),
      h('span', { class: 'quanto' }, formatarBRL(c.valor)),
      h('button', {
        type: 'button', class: 'casa-apagar', 'aria-label': `Apagar ${c.nome}`,
        onclick: async () => {
          await ctx.salvarCasa((x) => apagarCompra(x, { mes, compraId: c.id }));
          const seguintes = c.parcela && c.parcela.n < c.parcela.de;
          ctx.aviso(seguintes ? 'Compra apagada, junto com as próximas parcelas.' : 'Compra apagada.', 'ok', 3000);
          ctx.rerender();
        },
      }, '×')));

    const soTotal = h('div');
    const abrirSoTotal = () => {
      let valor = v.situacao === 'vazio' ? null : v.valor;
      soTotal.replaceChildren(
        campoMoeda({ rotulo: 'Total da fatura', valor, aoMudar: (x) => { valor = x; } }),
        h('div', { class: 'botoes', style: 'margin-top:8px' }, botao('Salvar total', async () => {
          if (valor == null) { ctx.aviso('Digite o total.', 'atencao', 3000); return; }
          await ctx.salvarCasa((c) => salvarValor(c, { mes, contaId: conta.id, valor }));
          ctx.aviso('Salvo.', 'ok', 2500);
          terminar(folha);
        })));
    };

    return [
      titulo(`${conta.nome} · fatura de ${nome}`),
      h('div', { class: 'casa-fatura' },
        h('div', {}, h('div', { class: 'rotulo' }, 'Total da fatura'), h('div', { class: 'valor' }, formatarBRL(v.valor))),
        v.situacao === 'a-confirmar' ? h('span', { class: 'selo' }, 'a confirmar')
          : v.situacao === 'confirmado' ? h('span', { class: 'selo ok' }, 'conferida') : null),
      compras.length
        ? h('div', { class: 'cartao casa-compras' }, ...compras)
        : h('p', { class: 'suave' }, v.situacao === 'a-confirmar' ? `Nenhuma compra anotada. O total é uma previsão (igual a ${quando(v.deOnde, mes)}).` : 'Nenhuma compra anotada nesta fatura.'),
      h('section', { class: 'cartao' },
        h('h3', {}, 'Anotar uma compra'),
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'O que foi'),
          h('input', { class: 'entrada', type: 'text', autocomplete: 'off', placeholder: 'Ex.: farmácia, presente, gasolina', oninput: (e) => { nova.nome = e.target.value.trim(); } })),
        h('div', { style: 'margin-top:10px' }, campoMoeda({ rotulo: 'Valor', dica: 'Se for parcelado, o valor de cada parcela.', aoMudar: (x) => { nova.valor = x; } })),
        h('div', { class: 'campo', style: 'margin-top:10px' }, h('span', { class: 'campo-rotulo' }, 'Parcelas'),
          h('div', { class: 'casa-passo' },
            h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Menos parcelas', onclick: () => mudarVezes(-1) }, '−'),
            vezesTexto,
            h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Mais parcelas', onclick: () => mudarVezes(1) }, '+')),
          h('span', { class: 'campo-dica' }, 'As próximas parcelas aparecem sozinhas nos meses seguintes.')),
        h('div', { class: 'botoes', style: 'margin-top:12px' }, anotar)),
      h('div', { class: 'botoes' },
        v.compras.length > 0 && botao('Pronto, fatura conferida', async () => {
          await ctx.salvarCasa((c) => conferirFatura(c, { mes, contaId: conta.id }));
          ctx.aviso('Fatura conferida.', 'ok', 2500);
          terminar(folha);
        }),
        botao('Fechar', fechar, { secundario: true })),
      !v.compras.length && h('button', { type: 'button', class: 'botao-link', onclick: abrirSoTotal }, 'Digitar só o total da fatura'),
      soTotal,
    ];
  }

  // ---------- folha aberta (vem do hash) ----------
  const aberta = folhaAberta(location.hash);
  const [tipo, id] = aberta ? [aberta.split('-')[0], aberta.slice(aberta.indexOf('-') + 1)] : [];
  const conta = casa.contas.find((c) => c.id === id);
  const pessoa = casa.pessoas.find((p) => p.id === id);
  const conteudo = tipo === 'conta' && conta ? folhaConta(conta, aberta)
    : tipo === 'cartao' && conta ? folhaCartao(conta, aberta)
      : tipo === 'salario' && pessoa ? folhaSalario(pessoa, aberta) : null;
  if (!conteudo) {
    abertaAqui = false;
    esconderFolha();
    return;
  }
  const painel = mostrarFolha({ conteudo: conteudo.filter(Boolean), aoFechar: fechar, rotulo: conta?.nome ?? pessoa?.nome ?? 'Conta' });
  // Conta e salário: foco no campo, para digitar logo. Cartão: na folha, sem abrir o teclado por cima da lista.
  const alvo = tipo === 'cartao' ? painel : painel.querySelector('input') ?? painel;
  setTimeout(() => alvo.focus({ preventScroll: true }), 50);
}
