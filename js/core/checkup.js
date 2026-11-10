// Check-up da carteira (spec §4.10). Nunca sugere vender: correções acontecem pelos próximos aportes.
import { CLASSES, NOMES_CLASSE } from './alocacao.js';
import { formatarPct, formatarBRL } from './formato.js';

const EPS = 1e-9;
const LIMITE_ABAIXO = 0.05;
const LIMITE_ACIMA = 0.10;
const DIAS_SALDOS = 35;

export function checkup({
  valores, pesos, carteiraAlvo, foraDoPlano, reserva, alvoReserva, caixa, tetoCaixa, diasDesdeAtualizacao,
}) {
  const itens = [];
  const total = CLASSES.reduce((s, c) => s + (valores[c] ?? 0), 0);

  if (total > 0) {
    for (const c of CLASSES) {
      const atual = (valores[c] ?? 0) / total;
      const alvo = pesos[c];
      const descricao = `${NOMES_CLASSE[c]} está em ${formatarPct(atual)} (alvo: ${formatarPct(alvo)}).`;
      if (alvo - atual > LIMITE_ABAIXO + EPS) {
        itens.push({ nivel: 'atencao', chave: `abaixo:${c}`, texto: `${descricao} Os próximos aportes vão priorizar o ${carteiraAlvo[c].ticker}.` });
      } else if (atual - alvo > LIMITE_ACIMA + EPS) {
        itens.push({ nivel: 'atencao', chave: `acima:${c}`, texto: `${descricao} Não precisa fazer nada: os próximos aportes vão para as outras classes até equilibrar.` });
      }
    }
  }

  for (const { nome, tipoForaDoPlano } of foraDoPlano) {
    if (tipoForaDoPlano === 'poupanca') {
      itens.push({ nivel: 'atencao', chave: `poupanca:${nome}`, texto: `${nome}: a poupança rende menos que o Tesouro Selic. Considere transferir esse dinheiro para a reserva de emergência ou para a caixa de oportunidade.` });
    } else {
      itens.push({ nivel: 'atencao', chave: `fora:${nome}`, texto: `${nome} está fora da sua carteira-alvo. Pode manter, mas o app não vai sugerir novos aportes nele.` });
    }
  }

  if (reserva + EPS >= alvoReserva) {
    itens.push({ nivel: 'ok', chave: 'reserva', texto: 'Reserva de emergência completa.' });
  } else {
    itens.push({ nivel: 'atencao', chave: 'reserva', texto: `Reserva de emergência em formação: ${formatarBRL(reserva)} de ${formatarBRL(alvoReserva)}. Ela vem antes de qualquer investimento.` });
  }

  let textoCaixa;
  if (caixa <= EPS) textoCaixa = 'Caixa de oportunidade vazia: todo o excedente está indo para a carteira.';
  else if (caixa + 0.005 >= tetoCaixa) textoCaixa = 'Caixa de oportunidade cheia: o que passar do limite vai para a carteira.';
  else textoCaixa = `Caixa de oportunidade com ${formatarBRL(caixa)}, guardados para comprar mais quando o mercado cair.`;
  itens.push({ nivel: 'ok', chave: 'caixa', texto: textoCaixa });

  if (diasDesdeAtualizacao > DIAS_SALDOS) {
    itens.push({ nivel: 'atencao', chave: 'saldos', texto: `Seus saldos foram atualizados há ${diasDesdeAtualizacao} dias. Atualize para a divisão ficar mais precisa.` });
  }
  return itens;
}
