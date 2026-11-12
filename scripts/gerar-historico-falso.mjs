// Gera um backup com 3 anos de uso INVENTADO, para importar em Ajustes › Importar backup (no computador).
// Uso: node scripts/gerar-historico-falso.mjs <arquivo-de-saida.json>
// Antes de importar, exporte o backup dos dados reais: a importação substitui tudo.
import { writeFileSync } from 'node:fs';
import { gerarHistoricoFalso, serieIpcaInventada } from './historico-falso.mjs';
import { buscarSerieIpca } from '../js/dados/ipca-remoto.js';
import { calcularPainel } from '../js/core/motor.js';
import { dataISO } from '../js/core/meses.js';

const saida = process.argv[2];
if (!saida) {
  console.error('Uso: node scripts/gerar-historico-falso.mjs <arquivo-de-saida.json>');
  process.exit(1);
}

let serieIpca;
try {
  serieIpca = await buscarSerieIpca({ fetch, desde: '2023-10' });
  if (!Object.keys(serieIpca).length) throw new Error('série vazia');
  console.log(`IPCA real do Banco Central: ${Object.keys(serieIpca).length} meses.`);
} catch (erro) {
  serieIpca = serieIpcaInventada('2023-10', '2026-10');
  console.warn(`Sem o IPCA do Banco Central (${erro.message}); usei 0,4% ao mês.`);
}

const estado = gerarHistoricoFalso({ serieIpca });
writeFileSync(saida, JSON.stringify(estado, null, 2));

const p = calcularPainel({ estado, hoje: dataISO(new Date()) });
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
console.log(`Gravado em ${saida}`);
console.log(`${estado.meses.length} meses registrados (${estado.meses[0].mes} a ${estado.meses.at(-1).mes}); patrimônio ${brl(p.patrimonio)}; reserva ${brl(p.reserva)}.`);
