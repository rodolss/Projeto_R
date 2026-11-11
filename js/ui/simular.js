// Simular "E se…?": arraste e veja quanto falta em cada cenário. Nada aqui é salvo (spec v2 §4.9 e §5.3).
import { h } from './dom.js';
import { formatarBRL, formatarDuracao, formatarPctCurto } from '../core/formato.js';
import { formatarMes } from '../core/meses.js';
import { calcularPainel } from '../core/motor.js';
import { simular, moverAlavanca, numerosReais } from '../core/simulador.js';

const CONTROLES = [
  { campo: 'aporte', rotulo: 'Quanto invisto por mês', passo: 50, padrao: 15000 },
  { campo: 'salario', rotulo: 'Meu salário líquido', passo: 100, padrao: 30000 },
  { campo: 'custo', rotulo: 'Meu custo de vida', passo: 100, padrao: 20000 },
];
const reais = (v) => formatarBRL(Math.round(v)).replace(/,00$/, '');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function cartaoDoAlvo(r) {
  const alvo = formatarMes(r.alvo.mes);
  const normal = r.cenarios.find((c) => c.id === 'normal');
  const textos = {
    antes: ['Você chega antes do alvo', `No cenário normal, a renda plena chega em ${formatarMes(normal.mes)}, antes de ${alvo}.`],
    cabe: [`Invista ${reais(r.alvo.necessario)} por mês`,
      `para chegar à renda plena em ${alvo}, no cenário normal. São ${reais(r.alvo.aMais)} a mais do que agora.`],
    'nao-fecha': [`Seriam ${reais(r.alvo.necessario)} por mês`,
      `para chegar à renda plena em ${alvo}, no cenário normal. É mais do que você consegue investir hoje (${reais(r.consegue)}), então até ${alvo} não fecha.`],
    passou: ['Seu alvo já passou', 'Veja quanto seria para os próximos prazos:'],
  };
  const [titulo, texto] = textos[r.alvo.situacao];
  return [
    h('p', { class: 'rotulo' }, 'Para chegar no seu alvo'),
    h('p', { class: 'alvo-titulo' }, titulo),
    h('p', {}, texto),
    h('p', { class: 'alvo-prazos' }, 'Com mais prazo:',
      ...r.prazosMaiores.map((x) => h('span', {}, `${formatarMes(x.mes)}: ${reais(x.necessario)}/mês`))),
  ];
}

function tempo(meses) {
  if (meses === null) return ['mais de', h('span', {}, '50 anos')];
  if (meses === 0) return ['agora'];
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (!anos) return [plural(resto, 'mês', 'meses')];
  return [plural(anos, 'ano', 'anos'), resto ? h('span', {}, `e ${plural(resto, 'mês', 'meses')}`) : null];
}

function diferenca(simulado, real) {
  if (simulado === null || real === null || simulado === real) return null;
  const d = simulado - real;
  return d < 0
    ? h('span', { class: 'diferenca melhor' }, `▼ ${formatarDuracao(-d)} a menos`)
    : h('span', { class: 'diferenca pior' }, `▲ ${formatarDuracao(d)} a mais`);
}

export function render(container, ctx) {
  const p = calcularPainel({ estado: ctx.estado, hoje: ctx.hoje });
  // Números reais sem arredondar: o cenário normal bate com o "Faltam" do Início. Só a posição dos controles é inteira.
  const base = p.baseSimulador;
  const meus = numerosReais(base);
  const real = simular({ base, sim: meus });
  let sim = { ...meus };

  const alvo = h('section', { class: 'cartao alvo' });
  const dica = h('p', { class: 'dica' });
  const grade = h('section', { class: 'cenarios', 'aria-live': 'polite' });
  const entradas = {};
  const saidas = {};

  function sincronizar() {
    for (const { campo } of CONTROLES) {
      entradas[campo].value = String(Math.round(sim[campo]));
      saidas[campo].textContent = reais(sim[campo]);
    }
  }

  function atualizar() {
    const r = simular({ base, sim });
    alvo.className = `cartao alvo ${r.alvo.situacao}`;
    alvo.replaceChildren(...cartaoDoAlvo(r));
    dica.className = `dica${r.investeMaisQueConsegue ? ' alerta' : ''}`;
    dica.textContent = r.investeMaisQueConsegue
      ? `Você está investindo mais do que consegue hoje (${reais(r.consegue)}).`
      : `O quanto você consegue investir hoje: ${reais(r.consegue)}.`;
    grade.replaceChildren(...r.cenarios.map((c, k) => h('article', { class: `cenario${c.id === 'normal' ? ' destaque' : ''}`, style: `--cor: var(--c-${c.id})` },
      h('header', {}, h('span', { 'aria-hidden': 'true' }, c.emoji), c.nome, h('small', {}, `${formatarPctCurto(c.taxa)} ao ano`)),
      h('div', { class: 'cenario-tempo' }, ...tempo(c.meses)),
      h('p', {}, c.mes ? `chega em ${formatarMes(c.mes)}` : 'além do horizonte de 50 anos'),
      diferenca(c.meses, real.cenarios[k].meses))));
  }

  const controles = CONTROLES.map(({ campo, rotulo, passo, padrao }) => {
    const max = Math.max(padrao, Math.ceil((meus[campo] * 2) / passo) * passo);
    entradas[campo] = h('input', {
      type: 'range', id: `sim-${campo}`, min: '0', max: String(max), step: String(passo), value: String(Math.round(meus[campo])),
      oninput: (e) => { sim = moverAlavanca(sim, campo, Number(e.target.value), meus); sincronizar(); atualizar(); },
    });
    saidas[campo] = h('output', { for: `sim-${campo}` }, reais(meus[campo]));
    return h('label', { class: 'controle', for: `sim-${campo}` }, h('span', { class: 'controle-topo' }, h('span', {}, rotulo), saidas[campo]), entradas[campo]);
  });

  container.replaceChildren(
    h('div', {}, h('h1', {}, 'E se…?'), h('p', { class: 'suave' }, 'Mexa à vontade: nada aqui muda os seus dados.')),
    alvo,
    h('section', { class: 'cartao controles' }, ...controles, dica,
      h('button', { type: 'button', class: 'botao secundario', onclick: () => { sim = { ...meus }; sincronizar(); atualizar(); } }, 'Voltar aos meus números')),
    h('p', { class: 'rotulo' }, 'Quanto falta em cada cenário'),
    grade,
    h('p', { class: 'nota' }, 'As porcentagens são quanto o dinheiro rende por ano acima da inflação.'),
  );
  atualizar();
}
