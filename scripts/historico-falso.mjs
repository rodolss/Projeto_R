// Histórico INVENTADO de 3 anos de uso (nov/2023 a out/2026), para validar o app "a longo prazo".
// Simula o mercado mês a mês (semente fixa) e registra cada mês com as regras do próprio app, como a tela do Mês faria.
// Nov/2026 fica em aberto, para o usuário registrar o mês atual pelo app. Nenhum dado real entra aqui.
import { calcularMes, registrarAplicacao } from '../js/core/motor.js';
import { criarEstadoInicial } from '../js/core/esquema.js';
import { CATEGORIAS_SUGERIDAS } from '../js/core/metas.js';
import { quintoDiaUtil } from '../js/core/lembretes.js';
import { somarMeses, diffMeses } from '../js/core/meses.js';

const INICIO = '2023-11';
const ULTIMO = '2026-10';
const nomeDe = (id) => CATEGORIAS_SUGERIDAS.find((c) => c.id === id).nome;

export const ORCAMENTO_INICIAL = [
  ['moradia', 'mensal', 1600], ['contas-casa', 'mensal', 380], ['mercado', 'mensal', 1100], ['transporte', 'mensal', 450],
  ['saude', 'mensal', 420], ['assinaturas', 'mensal', 90], ['cuidados', 'mensal', 150], ['lazer', 'mensal', 350],
  ['presentes', 'mensal', 80], ['ipva', 'anual', 1800], ['iptu', 'anual', 1200], ['viagem', 'anual', 4800],
].map(([id, tipo, valor]) => ({ id: `falso-${id}`, nome: nomeDe(id), tipo, valor, mes: INICIO }));

const SALARIOS = { '2023-11': 8000, '2025-03': 8600, '2026-03': 9200 };
const REVISOES_ORCAMENTO = ['2024-05', '2024-11', '2025-05', '2025-11', '2026-05'];
const FERIAS = ['2024-07', '2025-07', '2026-07'];
const PLR = { '2025-02': 6000 };
const APLICOU_MENOS = { '2024-04': 0.7 }; // a pessoa aplicou só 70% do sugerido
const SEM_ATUALIZAR_SALDOS = new Set(['2024-02', '2024-06', '2024-10', '2025-06', '2025-10', '2026-02']); // nunca logo depois de uma queda

// Mercado (retorno mensal nominal do preço). Quedas fixas, no mês em que acontecem.
const SELIC = 0.009;
const MERCADO = {
  rendaFixa: { media: 0.005, desvio: 0.012 }, // + IPCA do mês
  fiis: { media: -0.001, desvio: 0.03, provento: 0.009 },
  acoes: { media: 0.006, desvio: 0.045, provento: 0.012 },
  exterior: { media: 0.011, desvio: 0.04 },
};
const QUEDAS = {
  '2024-11': { acoes: -0.07, fiis: -0.03 },
  '2024-12': { acoes: -0.08, fiis: -0.05, rendaFixa: -0.03 },
  '2025-03': { exterior: -0.09 },
  '2025-04': { exterior: -0.06 },
  // Com a carteira já maior, a queda vence o aporte novo e aparece como "caiu este mês" no registro seguinte.
  '2025-11': { acoes: -0.10, fiis: -0.04 },
  '2026-04': { exterior: -0.11 },
};
const CUPOM_SEMESTRAL = 0.0295; // Tesouro IPCA+ com juros semestrais: maio e novembro
const PRECO_INICIAL = { fiis: 11, acoes: 95, exterior: 260 };

// Gerador com semente (mulberry32) e ruído normal (Box-Muller): os mesmos números a cada execução (os ids mudam).
function aleatorio(semente) {
  let s = semente >>> 0;
  const unif = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(1 - unif())) * Math.cos(2 * Math.PI * unif());
}

const centavos = (v) => Math.round(v * 100) / 100;
const dezena = (v) => Math.round(v / 10) * 10;

export function serieIpcaInventada(desde, ate) {
  const serie = {};
  for (let k = 0; k <= diffMeses(desde, ate); k++) serie[somarMeses(desde, k)] = 0.004;
  return serie;
}

// No dia do registro (5º dia útil do mês M), o IPCA divulgado vai só até M−2.
const serieAte = (serie, mes) => Object.fromEntries(Object.entries(serie).filter(([m]) => m <= somarMeses(mes, -2)));

function fatorIpca(serie, de, ate) {
  let f = 1;
  for (let k = 1; k <= diffMeses(de, ate); k++) f *= 1 + (serie[somarMeses(de, k)] ?? 0);
  return f;
}

function recebimento(mes, salario) {
  if (FERIAS.includes(mes)) return { recebido: centavos(salario * 7 / 3), tipoExtra: 'ferias' };
  if (FERIAS.includes(somarMeses(mes, -1))) return { recebido: 0, tipoExtra: null }; // o salário veio adiantado nas férias
  if (mes.endsWith('-12')) return { recebido: salario * 2, tipoExtra: 'decimo-terceiro' };
  if (PLR[mes]) return { recebido: salario + PLR[mes], tipoExtra: 'plr' };
  return { recebido: salario, tipoExtra: null };
}

const chaveDoAtivo = (a) => (a.papel === 'carteira' ? a.classe : a.papel);

export function gerarHistoricoFalso({ serieIpca, semente = 2023, agoraISO = new Date().toISOString() }) {
  const normal = aleatorio(semente);
  let estado = criarEstadoInicial({ salario: SALARIOS[INICIO], mesInicio: INICIO });
  estado.orcamento = structuredClone(ORCAMENTO_INICIAL);
  // O mundo "de verdade" da pessoa falsa: quanto vale cada posição e o preço das cotas.
  const posicoes = { reserva: 0, caixa: 0, rendaFixa: 0, fiis: 0, acoes: 0, exterior: 0 };
  const precos = { ...PRECO_INICIAL };
  let proventos = 0;

  for (let mes = INICIO; mes <= ULTIMO; mes = somarMeses(mes, 1)) {
    const hoje = quintoDiaUtil(mes);
    const serie = serieAte(serieIpca, mes);
    estado.ipca = { serie, atualizadoEm: `${hoje}T12:00:00.000Z` };

    if (SALARIOS[mes] && mes !== INICIO) estado.config = { ...estado.config, salario: SALARIOS[mes], mesSalario: mes };
    if (REVISOES_ORCAMENTO.includes(mes)) {
      estado.orcamento = estado.orcamento.map((c) => ({ ...c, valor: dezena(c.valor * fatorIpca(serie, c.mes, somarMeses(mes, -2))), mes }));
      estado.config = { ...estado.config, ultimaRevisaoOrcamento: mes };
    }

    const { recebido, tipoExtra } = recebimento(mes, estado.config.salario);
    const saldosAtualizados = SEM_ATUALIZAR_SALDOS.has(mes) || !estado.ativos.length ? null : estado.ativos.map((a) => {
      const chave = chaveDoAtivo(a);
      return { ativoId: a.id, valor: centavos(posicoes[chave]), cotas: precos[chave] ? Math.round(posicoes[chave] / precos[chave]) : null };
    });

    const resposta = calcularMes({ estado, recebido, tipoExtra, proventos, saldosAtualizados, hoje });
    const fracao = APLICOU_MENOS[mes] ?? 1;
    const aplicado = [
      ...resposta.sugestoes.map((s) => ({ destino: s.classe, valor: s.valor })),
      resposta.paraReserva > 0 && { destino: 'reserva', valor: resposta.paraReserva },
      resposta.paraCaixa > 0 && { destino: 'caixa', valor: resposta.paraCaixa },
    ].filter(Boolean).map((a) => ({ ...a, valor: centavos(a.valor * fracao) }));
    const transferidoDaCaixa = resposta.daCaixaParaCarteira ?? 0;

    estado = registrarAplicacao(estado, {
      mes, data: hoje, recebido, tipoExtra, proventos, saldosAtualizados, resposta, aplicado, transferidoDaCaixa,
    });
    for (const a of aplicado) posicoes[a.destino] += a.valor;
    posicoes.caixa -= transferidoDaCaixa;

    // Um mês de mercado até o próximo registro; os proventos pagos entram no mês seguinte.
    const queda = QUEDAS[mes] ?? {};
    const retorno = (classe) => queda[classe] ?? MERCADO[classe].media + MERCADO[classe].desvio * normal();
    posicoes.reserva *= 1 + SELIC;
    posicoes.caixa *= 1 + SELIC;
    posicoes.rendaFixa *= 1 + (serieIpca[mes] ?? 0.004) + retorno('rendaFixa');
    proventos = 0;
    if (mes.endsWith('-05') || mes.endsWith('-11')) {
      proventos += posicoes.rendaFixa * CUPOM_SEMESTRAL;
      posicoes.rendaFixa *= 1 - CUPOM_SEMESTRAL;
    }
    proventos += posicoes.fiis * MERCADO.fiis.provento;
    if (['03', '06', '09', '12'].includes(mes.slice(5))) proventos += posicoes.acoes * MERCADO.acoes.provento;
    proventos = centavos(proventos);
    for (const classe of ['fiis', 'acoes', 'exterior']) {
      const r = retorno(classe);
      posicoes[classe] *= 1 + r;
      precos[classe] *= 1 + r;
    }
  }

  estado.ipca = { serie: { ...serieIpca }, atualizadoEm: agoraISO };
  estado.marcos = {}; // a reserva fica sem comemorar: a festa aparece ao abrir o app
  return estado;
}
