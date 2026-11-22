// Onde investir (desenho 2026-11-22-onde-investir): a recomendação que a análise no Claude Code (/onde-investir) grava
// no estado — a lista estável da carteira de renda isenta (fundos imobiliários e ações boas pagadoras, comprados
// direto) e as ordens do mês em cotas inteiras. O app só valida, mostra e registra o que foi comprado.
import { CLASSES } from './alocacao.js';
import { somarMeses } from './meses.js';

export const ESTRATEGIA_RENDA_ISENTA = { fiis: 0.5, acoes: 0.5 };
const CLASSES_ISENTAS = ['fiis', 'acoes'];
const FRASES = {
  fiis: 'Fundos imobiliários: aluguéis e recebíveis, rendimentos mensais isentos de IR para pessoa física',
  acoes: 'Ações de empresas boas pagadoras: dividendos isentos de IR (o JCP tem 15%)',
};
const MES = /^\d{4}-\d{2}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const igualCodigo = (a, b) => String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

// Só entra na lista o que ele consegue comprar (desenho 2026-11-22-onde-investir-agendado): aberto a qualquer
// investidor e bem negociado na bolsa (média por dia, em reais), conferido na análise há no máximo 120 dias.
export const LIQUIDEZ_MINIMA = { fiis: 1_000_000, acoes: 5_000_000 };
const VALIDADE_DA_CONFERENCIA = 120;
const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

function errosDaConferencia(a, geradaEm) {
  const c = a.conferido;
  if (!c || typeof c !== 'object' || !DATA.test(c.em ?? '')) return [`${a.ticker}: falta a conferência (conferido: publicoGeral, liquidezDiaria, em)`];
  const erros = [];
  if (c.publicoGeral !== true) erros.push(`${a.ticker}: não está aberto a qualquer investidor (público geral)`);
  const minimo = LIQUIDEZ_MINIMA[a.classe];
  if (minimo != null && !(Number.isFinite(c.liquidezDiaria) && c.liquidezDiaria >= minimo)) {
    erros.push(`${a.ticker}: pouco negociado (precisa de R$ ${minimo.toLocaleString('pt-BR')} por dia)`);
  }
  if (DATA.test(geradaEm ?? '')) {
    const dias = diasEntre(c.em, geradaEm);
    if (dias < 0) erros.push(`${a.ticker}: a conferência (${c.em}) é depois da análise (${geradaEm})`);
    else if (dias > VALIDADE_DA_CONFERENCIA) erros.push(`${a.ticker}: a conferência tem mais de ${VALIDADE_DA_CONFERENCIA} dias; confira de novo`);
  }
  return erros;
}

export function validarRecomendacao(r) {
  const erros = [];
  if (!r || typeof r !== 'object') return { ok: false, erros: ['a recomendação não é um objeto'] };
  if (!MES.test(r.mes ?? '')) erros.push('mes precisa ser AAAA-MM');
  if (!DATA.test(r.geradaEm ?? '')) erros.push('geradaEm precisa ser AAAA-MM-DD');
  if (!(Number.isFinite(r.valor) && r.valor >= 0)) erros.push('valor precisa ser um número >= 0');
  // O app lê lista e ordens como listas: sem ordens é [], nunca o campo ausente (a Carteira e o Dia de pagamento caem).
  if (!Array.isArray(r.ordens)) erros.push('ordens precisa ser uma lista ([] quando não há ordens)');
  if (!Array.isArray(r.lista)) erros.push('lista precisa ser uma lista');
  const lista = Array.isArray(r.lista) ? r.lista : [];
  const ordens = Array.isArray(r.ordens) ? r.ordens : [];
  if (Array.isArray(r.lista) && !lista.length) erros.push('a lista da carteira está vazia');
  for (const a of lista) {
    if (!a.ticker || !a.nome || !a.motivo) erros.push(`${a.ticker ?? '?'}: a lista precisa de ticker, nome e motivo`);
    if (!CLASSES_ISENTAS.includes(a.classe)) erros.push(`${a.ticker}: classe "${a.classe}" não é de renda isenta (fiis ou acoes)`);
    erros.push(...errosDaConferencia(a, r.geradaEm));
  }
  if (r.semOrdens !== undefined && !(typeof r.semOrdens === 'string' && r.semOrdens.trim())) erros.push('semOrdens, quando vem, precisa ser um texto');
  for (const o of ordens) {
    const naLista = lista.find((a) => igualCodigo(a.ticker, o.ticker));
    if (!naLista) erros.push(`${o.ticker}: a ordem está fora da lista da carteira`);
    else if (o.classe !== naLista.classe) erros.push(`${o.ticker}: a classe da ordem ("${o.classe}") não é a da lista ("${naLista.classe}")`);
    if (!(Number.isInteger(o.cotas) && o.cotas >= 1)) erros.push(`${o.ticker}: cotas precisam ser um número inteiro >= 1`);
    if (!(Number.isFinite(o.preco) && o.preco > 0)) erros.push(`${o.ticker}: preço precisa ser um número > 0`);
    if (!Number.isFinite(o.valor)) erros.push(`${o.ticker}: valor precisa ser um número`);
    else if (Number.isFinite(o.preco) && Number.isInteger(o.cotas) && Math.abs(o.valor - o.cotas * o.preco) > Math.max(0.05, o.cotas * o.preco * 0.005)) {
      erros.push(`${o.ticker}: o valor não bate com cotas × preço`);
    }
  }
  const soma = ordens.reduce((s, o) => s + (Number.isFinite(o.valor) ? o.valor : 0), 0);
  if (Number.isFinite(r.valor) && soma > r.valor + 0.01) erros.push(`as ordens (${soma.toFixed(2)}) passam do valor (${r.valor.toFixed(2)})`);
  return { ok: erros.length === 0, erros };
}

// Grava a recomendação e põe a carteira-alvo na estratégia fixa (o motor usa os pesos na divisão por classe; o primeiro
// da lista de cada classe fica como o investimento padrão dela). A estratégia não vem da recomendação: é sempre a fixa.
export function aplicarRecomendacao(estado, r) {
  const estrategia = ESTRATEGIA_RENDA_ISENTA;
  const carteiraAlvo = Object.fromEntries(CLASSES.map((c) => {
    const primeiro = (r.lista ?? []).find((a) => a.classe === c);
    const antes = estado.carteiraAlvo?.[c] ?? {};
    return [c, { ...antes, peso: estrategia[c] ?? 0, ...(primeiro ? { ticker: primeiro.ticker, frase: FRASES[c] ?? antes.frase } : {}) }];
  }));
  return { ...estado, recomendacao: { ...structuredClone(r), estrategia: { ...estrategia } }, carteiraAlvo };
}

export const recomendacaoDoMes = (estado, mes) => (estado?.recomendacao?.mes === mes ? estado.recomendacao : null);

// O mês do próximo Dia de pagamento (é o mês das ordens): o do calendário enquanto ele não foi registrado; depois, o
// seguinte. O Dia de pagamento registra sempre o mês do calendário.
export function mesDoProximoPagamento(estado, hoje) {
  const mes = hoje.slice(0, 7);
  return (estado?.meses ?? []).some((m) => m.mes === mes) ? somarMeses(mes, 1) : mes;
}

// O mês das ordens da análise (a do dia 26 roda sozinha): o do próximo Dia de pagamento, mas nunca antes do mês da
// última análise — uma recomendação de um mês à frente (feita à mão) é atualizada, não trocada por um mês anterior.
export function mesDasOrdens(estado, hoje) {
  const proximo = mesDoProximoPagamento(estado, hoje);
  const ultima = estado?.recomendacao?.mes;
  return MES.test(ultima ?? '') && ultima > proximo ? ultima : proximo;
}

// Hora de montar ou rever a lista (a análise do dia 26 decide sozinha): sem lista, algum ativo sem conferência válida
// (inclusive a lista antiga, de antes da trava) ou a conferência mais antiga com mais de 90 dias — antes que o
// validador a recuse aos 120.
const REVISAO_DA_LISTA = 90;
export function precisaRevisarLista(lista, hoje) {
  if (!Array.isArray(lista) || !lista.length) return true;
  return lista.some((a) => errosDaConferencia(a, hoje).length > 0 || diasEntre(a.conferido.em, hoje) > REVISAO_DA_LISTA);
}

// O que o cartão diz quando o mês não tem ordens: o motivo que a análise gravou, ou o caso comum (tudo para a reserva).
export const motivoSemOrdens = (r) => r?.semOrdens || 'Este mês o dinheiro vai para a reserva de emergência.';

// O que as cotas inteiras não cobriram do valor da carteira: vai para a caixa de oportunidade (fica investido e conta
// para a meta), em vez de ficar parado na conta.
export const restoDasOrdens = (r, paraCarteira) => Math.max(0, Math.round((paraCarteira - (r?.ordens ?? []).reduce((s, o) => s + o.valor, 0)) * 100) / 100);

// As ordens no formato do aplicado do Dia de pagamento: o destino é o código (o motor acha o investimento ou o cria).
export const aplicadoDasOrdens = (r) => (r?.ordens ?? []).map((o) => ({
  destino: { ticker: o.ticker, classe: o.classe, nome: o.nome },
  nome: `${o.ticker} · ${o.cotas} ${o.cotas === 1 ? 'cota' : 'cotas'}`,
  valor: o.valor,
  cotas: o.cotas,
}));
