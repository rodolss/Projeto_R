// Contas da casa · Balanço (desenho 2026-11-20-balanco-do-mes): o que entrou e o que saiu no mês para uma pessoa —
// o salário, a parte dela nas contas da casa e o que é dela nos cartões dela — e a sobra. O que ela passou no
// cartão para outras pessoas aparece à parte (volta para ela). Com perfis, o balanço é o do perfil visto; sem
// perfis, botões para escolher a pessoa. Endereço: #/casa-balanco?mes=AAAA-MM[&pessoa=pX].
import { h, cartao } from './dom.js';
import { formatarBRL, formatarPct } from '../core/formato.js';
import { somarMeses, diffMeses } from '../core/meses.js';
import { primeiroMes } from '../core/casa.js';
import { balancoDoMes } from '../core/balanco.js';
import { parametroDoHash } from './rotas.js';
import { nomeDoMes, mesDaTela } from './casa.js';

const maiuscula = (t) => t[0].toUpperCase() + t.slice(1);
const tituloDoMes = (mes) => `${maiuscula(nomeDoMes(mes))} de ${mes.slice(0, 4)}`;
const quando = (deOnde, mes) => (diffMeses(deOnde, mes) <= 11 ? nomeDoMes(deOnde) : `${nomeDoMes(deOnde)} de ${deOnde.slice(0, 4)}`);

// A fatura do mês no Cartão: o "De quem é" dela mostra o mesmo "Já tenho / falta" da linha tocada (o Cofrinho
// soma outras faturas e não bateria).
export const enderecoDaFatura = (cartaoId, mes) => `#/casa-cartao?cartao=${cartaoId}&fatura=${mes}`;

// De quem é o balanço: o perfil visto; sem perfis, a pessoa do endereço (se for da casa), senão a primeira.
export function pessoaDoBalanco({ hash, casa, visto }) {
  if (visto) return visto.id;
  const ids = (casa?.pessoas ?? []).map((p) => p.id);
  const pedida = parametroDoHash(hash, 'pessoa');
  return ids.includes(pedida) ? pedida : ids[0] ?? null;
}

export function render(container, ctx) {
  desenhar(container, ctx);
}

export function atualizar(container, ctx) {
  desenhar(container, ctx);
}

function desenhar(container, ctx) {
  const { casa, hoje } = ctx;
  if (!casa) {
    // Carregando, erro ou primeiro uso: a tela do Mês cuida disso.
    location.replace('#/casa');
    return;
  }
  const mesAtual = hoje.slice(0, 7);
  const mes = mesDaTela(location.hash, hoje);
  const visto = ctx.perfil?.visto ?? null;
  const pessoaId = pessoaDoBalanco({ hash: location.hash, casa, visto });
  const quem = [...casa.pessoas, ...(casa.perfis ?? [])].find((p) => p.id === pessoaId) ?? null;
  const b = balancoDoMes(casa, mes, pessoaId, hoje);
  const endereco = (m, p = pessoaId) => `#/casa-balanco?mes=${m}${visto ? '' : `&pessoa=${p}`}`;
  const irPara = (m) => location.replace(endereco(m));

  // ---------- cabeçalho com as setas (os mesmos limites do Mês) ----------
  const primeiro = primeiroMes(casa) ?? mesAtual;
  const podeVoltar = mes > (primeiro < mesAtual ? primeiro : mesAtual);
  const podeAvancar = mes < somarMeses(mesAtual, 12);
  const cabecalho = h('div', { class: 'casa-mes' },
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Mês anterior', disabled: !podeVoltar, onclick: () => irPara(somarMeses(mes, -1)) }, '‹'),
    h('h1', {}, tituloDoMes(mes)),
    h('button', { type: 'button', class: 'seta-mes', 'aria-label': 'Próximo mês', disabled: !podeAvancar, onclick: () => irPara(somarMeses(mes, 1)) }, '›'));
  const voltarAoAtual = mes !== mesAtual
    && h('button', { type: 'button', class: 'botao-link casa-voltar', onclick: () => irPara(mesAtual) }, `Voltar para ${nomeDoMes(mesAtual)}`);
  const escolha = !visto && casa.pessoas.length > 1 && h('div', { class: 'chips balanco-quem', role: 'group', 'aria-label': 'De quem é o balanço' },
    ...casa.pessoas.map((p) => h('button', {
      type: 'button', class: `chip${p.id === pessoaId ? ' ativo' : ''}`, 'aria-pressed': p.id === pessoaId ? 'true' : 'false',
      onclick: () => location.replace(endereco(mes, p.id)),
    }, p.nome)));

  // ---------- a sobra ----------
  const sobra = cartao(
    h('div', { class: 'rotulo' }, `Sobra de ${quem?.nome ?? '—'}`),
    h('div', { class: `valor-grande ${b.sobra < 0 ? 'balanco-negativo' : 'balanco-positivo'}` }, formatarBRL(b.sobra)),
    h('div', { class: 'suave' }, `Entrou ${formatarBRL(b.entrou)} · saiu ${formatarBRL(b.saiu)}`),
    h('div', { style: 'margin-top:6px' }, b.previsao
      ? h('span', { class: 'selo' }, 'Previsão: ainda pode mudar')
      : h('span', { class: 'selo ok' }, 'Tudo confirmado ✓')));

  // ---------- listas ----------
  const linha = ({ titulo, detalhe, valor, aoTocar }) => h(aoTocar ? 'button' : 'div', {
    type: aoTocar ? 'button' : null, class: `casa-linha${aoTocar ? '' : ' estatica'}`, onclick: aoTocar,
  },
  h('span', { class: 'texto' }, h('b', {}, titulo), detalhe && h('small', {}, ...[detalhe].flat())),
  h('span', { class: 'quanto' }, valor),
  aoTocar && h('span', { class: 'seta', 'aria-hidden': 'true' }, '›'));
  const selo = (texto) => h('span', { class: 'selo' }, texto);
  const irAoMes = () => ctx.navegar(`#/casa?mes=${mes}`);
  const irAoCartao = (c) => () => ctx.navegar(enderecoDaFatura(c.cartaoId, mes));

  const s = b.salario;
  const entrou = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Entrou'),
    s
      ? h('div', {}, linha({
        titulo: 'Salário',
        detalhe: s.situacao === 'a-confirmar' ? [selo('a confirmar'), ` igual a ${quando(s.deOnde, mes)}`]
          : s.situacao === 'vazio' ? 'Falta preencher no Mês' : null,
        valor: s.situacao === 'vazio' ? '—' : formatarBRL(s.valor),
        aoTocar: irAoMes,
      }))
      : h('p', { class: 'suave balanco-nota' }, 'Fora da divisão das contas da casa: sem salário aqui.'));

  const c = b.contas;
  const linhasSaiu = [
    c && linha({
      titulo: 'Contas da casa',
      detalhe: c.valor == null ? 'Preencha os salários no Mês para dividir as contas.'
        : [c.aConfirmar && selo('a confirmar'), c.aConfirmar && ' ', `sua parte do total de ${formatarBRL(c.total)} (${formatarPct(c.fatia, 0)} do salário)`],
      valor: c.valor == null ? '—' : formatarBRL(c.valor),
      aoTocar: irAoMes,
    }),
    ...b.cartoes.map((k) => linha({
      titulo: k.nome,
      detalhe: [k.aberta && selo('fatura aberta'), k.aberta && ' ', `seu cartão: o que é seu na fatura de ${nomeDoMes(mes)}`],
      valor: formatarBRL(k.seu),
      aoTocar: irAoCartao(k),
    })),
  ].filter(Boolean);
  const temParteDaCasa = b.cartoes.some((k) => k.daCasa > 0);
  const saiu = h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Saiu'),
    linhasSaiu.length ? h('div', {}, ...linhasSaiu) : h('p', { class: 'suave balanco-nota' }, 'Nada saiu neste mês.'),
    temParteDaCasa && h('p', { class: 'suave pequeno balanco-nota balanco-rodape' }, 'O que é da casa nos cartões já está nas contas da casa, dividido pela renda.'));

  const comOutras = b.cartoes.filter((k) => k.outras.valor > 0);
  const outras = comOutras.length > 0 && h('section', { class: 'cartao casa-lista' },
    h('h2', {}, 'Para outras pessoas'),
    h('div', {}, ...comOutras.map((k) => linha({
      titulo: b.cartoes.length > 1 ? `No ${k.nome}` : 'No seu cartão',
      detalhe: k.outras.falta <= 0 ? 'Já tenho tudo ✓' : `Já tenho ${formatarBRL(k.outras.jaTenho)} · falta ${formatarBRL(k.outras.falta)}`,
      valor: formatarBRL(k.outras.valor),
      aoTocar: irAoCartao(k),
    }))),
    h('p', { class: 'suave pequeno balanco-nota balanco-rodape' }, 'Você paga no cartão e recebe de volta: não entra na sobra.'));

  container.replaceChildren(...[cabecalho, voltarAoAtual, escolha, sobra, entrou, saiu, outras].filter(Boolean));
}
