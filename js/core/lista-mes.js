// Aba Mês em lista de 4 tarefas (desenho de 2026-11-12): situação das tarefas, rascunho, datas e totais.
// Funções puras; a tela fica em js/ui/mes.js e o rascunho é guardado por js/ui/mes-rascunho.js.

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const centavos = (v) => Math.round(v * 100) / 100;

export function rascunhoVazio(mes) {
  return {
    mes, editando: false, recebido: null, tipoExtra: null, proventos: null,
    saldos: null, saldosModo: null, feito: { salario: false, proventos: false },
  };
}

// Editar um mês registrado parte do que foi salvo; os saldos ficam de fora (só mudam por "Atualizar só os saldos").
export function rascunhoDoRegistro(entrada) {
  return {
    ...rascunhoVazio(entrada.mes), editando: true,
    recebido: entrada.recebido ?? null, tipoExtra: entrada.tipoExtra ?? null, proventos: entrada.proventos ?? 0,
    feito: { salario: true, proventos: true },
  };
}

const numeroOuNulo = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));

export function validarRascunho(salvo, mes) {
  if (!salvo || typeof salvo !== 'object' || salvo.mes !== mes) return null;
  const ok = typeof salvo.editando === 'boolean'
    && numeroOuNulo(salvo.recebido) && numeroOuNulo(salvo.proventos)
    && (salvo.tipoExtra === null || typeof salvo.tipoExtra === 'string')
    && [null, 'copiados', 'pulados'].includes(salvo.saldosModo)
    && (salvo.saldos === null || typeof salvo.saldos === 'object')
    && typeof salvo.feito?.salario === 'boolean' && typeof salvo.feito?.proventos === 'boolean';
  return ok ? salvo : null;
}

export function situacao({ registrado, rascunho }) {
  if (registrado && !rascunho?.editando) {
    return { modo: 'registrado', feitas: { salario: true, proventos: true, saldos: true, investir: true }, quantas: 4, podeInvestir: false };
  }
  const r = rascunho ?? rascunhoVazio(null);
  const feitas = {
    salario: r.feito.salario && r.recebido != null, // campo apagado depois de salvo desmarca
    proventos: r.feito.proventos,
    saldos: r.editando || r.saldosModo !== null,
    investir: false,
  };
  return {
    modo: r.editando ? 'editando' : 'novo',
    feitas,
    quantas: Object.values(feitas).filter(Boolean).length,
    podeInvestir: feitas.salario && feitas.proventos && feitas.saldos,
  };
}

// Data do último registro antes do mês (a dica dos proventos: "desde DD/mmm, o seu último registro").
export function ultimoRegistroAntes(meses, mes) {
  const anteriores = (meses ?? []).filter((m) => m.mes < mes).sort((a, b) => (a.mes < b.mes ? -1 : 1));
  const ultimo = anteriores.at(-1);
  return ultimo ? ultimo.data ?? `${ultimo.mes}-01` : null;
}

// Último dia do mês com saldo digitado de algum ativo da carteira (linha 3 do mês registrado).
export function saldoDigitadoNoMes(estado, mes) {
  const carteira = new Set(estado.ativos.filter((a) => a.papel === 'carteira').map((a) => a.id));
  const datas = estado.saldos.filter((s) => carteira.has(s.ativoId) && s.data.startsWith(mes)).map((s) => s.data).sort();
  return datas.at(-1) ?? null;
}

export function totalAplicado(entrada) {
  return centavos((entrada?.aplicado ?? []).reduce((s, a) => s + (a.valor ?? 0), 0));
}

// Saldo copiado no mesmo dia do registro já inclui o aporte do mês, e o motor somaria o aporte de novo.
// Nesse caso grava o valor de antes do aporte (e sem cotas, que já incluem as compradas).
export function saldosParaGravar({ estado, mes, hoje, saldos }) {
  const entrada = estado.meses.find((m) => m.mes === mes);
  if (!entrada || entrada.data !== hoje) return saldos;
  const aporte = {};
  for (const a of entrada.aplicado ?? []) aporte[a.ativoId] = (aporte[a.ativoId] ?? 0) + a.valor;
  return saldos.map((s) => (aporte[s.ativoId] ? { ativoId: s.ativoId, valor: centavos(s.valor - aporte[s.ativoId]), cotas: null } : s));
}

export function dataCurta(data) {
  const [, m, d] = data.split('-').map(Number);
  return `${d}/${MESES_CURTOS[m - 1]}`;
}

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const nomeDoMes = (mes) => MESES_LONGOS[Number(mes.slice(5, 7)) - 1];

// Cartão "Dia de pagamento?" do Início: mês registrado, pela metade (rascunho com 1 a 3 tarefas) ou para abrir.
export function cartaoDoPagamento({ entrada, rascunho }) {
  if (entrada) return { tipo: 'registrado', total: totalAplicado(entrada), data: entrada.data };
  const { quantas } = situacao({ registrado: false, rascunho });
  return quantas > 0 ? { tipo: 'continuar', quantas } : { tipo: 'abrir' };
}

// Tarefa 3: "Usar estes saldos" ou "Pular". Pular depois de copiar mantém os valores digitados (podem voltar a ser usados).
export function escolherSaldos(rascunho, acao) {
  return { ...rascunho, saldosModo: acao === 'usar' ? 'copiados' : 'pulados' };
}
