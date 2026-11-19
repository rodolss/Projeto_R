// Importa a planilha de contas da casa para um casa.json (uma vez). A saída tem dados pessoais:
// grave-a FORA do repositório público (ex.: numa pasta temporária) e envie só para o repositório privado.
// Uso: node scripts/importar-planilha.mjs <planilha.xlsx> <saida.json> [--hoje AAAA-MM-DD]
import { readFileSync, writeFileSync } from 'node:fs';
import { lerXlsx, importarPlanilha } from './planilha-casa.mjs';
import { resumoDoAno, anosDisponiveis } from '../js/core/casa-ano.js';

const args = process.argv.slice(2);
const iHoje = args.indexOf('--hoje');
const hoje = iHoje >= 0 ? args[iHoje + 1] : new Date().toISOString().slice(0, 10);
const [entrada, saida] = args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--hoje');
if (!entrada || !saida) {
  console.error('Uso: node scripts/importar-planilha.mjs <planilha.xlsx> <saida.json> [--hoje AAAA-MM-DD]');
  process.exit(2);
}

const { casa, avisos } = importarPlanilha(lerXlsx(readFileSync(entrada)), { hoje });
writeFileSync(saida, `${JSON.stringify(casa, null, 2)}\n`);

const brl = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
console.log(`Pessoas: ${casa.pessoas.map((p) => p.nome).join(' e ')}`);
console.log(`Contas ativas: ${casa.contas.filter((c) => !c.arquivada).map((c) => c.nome + (c.compraPorCompra ? ' (compra por compra)' : '')).join(', ')}`);
console.log(`Contas que não usa mais: ${casa.contas.filter((c) => c.arquivada).map((c) => c.nome).join(', ') || 'nenhuma'}`);
console.log(`Meses: ${casa.meses.length} (${casa.meses[0]?.mes} a ${casa.meses.at(-1)?.mes}), compras do cartão: ${casa.meses.reduce((s, m) => s + m.compras.length, 0)}`);
for (const ano of anosDisponiveis(casa, hoje.slice(0, 7))) {
  const r = resumoDoAno(casa, ano, hoje.slice(0, 7));
  console.log(`  ${ano}: ${r.meses.length} meses até ${r.ate} · contas ${brl(r.total)} · renda ${brl(r.renda)} · ${r.fatiaDaRenda == null ? '-' : `${(r.fatiaDaRenda * 100).toFixed(1)}%`}`);
}
for (const a of avisos) console.log(`AVISO: ${a}`);
console.log(`ok  ${saida}`);
