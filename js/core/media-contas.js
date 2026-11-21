// Média do que a casa paga por mês (desenho 2026-11-21-media-das-contas): o total das contas da casa dos até 12 meses
// anteriores ao mês visto (só os que têm algum valor confirmado) e quanto o mês visto está acima ou abaixo dela.
import { resumoDoMes } from './casa.js';
import { somarMeses } from './meses.js';

const centavos = (v) => Math.round(v * 100) / 100;

export function mediaDasContas(casa, mes, janela = 12) {
  const totais = [];
  for (let k = 1; k <= janela; k++) {
    const r = resumoDoMes(casa, somarMeses(mes, -k));
    // Só meses com algum valor de verdade (os outros só repetem a previsão do mês anterior).
    const total = r.contas.some((c) => c.situacao === 'confirmado') ? r.total : 0;
    if (total > 0) totais.push(total);
  }
  if (!totais.length) return null;
  const media = centavos(totais.reduce((s, t) => s + t, 0) / totais.length);
  const atual = resumoDoMes(casa, mes).total;
  return { media, meses: totais.length, diferenca: atual > 0 ? (atual - media) / media : null }; // o mês visto conta mesmo como previsão
}
