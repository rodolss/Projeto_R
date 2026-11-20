// Importa o cartão da planilha (a aba do cartão da casa e a aba pessoal de quem tem o cartão) sobre um
// casa.json que já existe, sem mexer no resto (desenho 2026-11-19-cartao, §Importação). A entrada e a saída
// têm dados pessoais: guarde-as FORA do repositório público e envie só para o repositório privado.
// Uso: node scripts/importar-cartao.mjs <planilha.xlsx> <casa-atual.json> <saida.json> [--hoje AAAA-MM-DD]
import { readFileSync, writeFileSync } from 'node:fs';
import { lerXlsx, importarCartao } from './planilha-casa.mjs';
import { migrarCasa } from '../js/core/casa.js';
import { faturaDoCartao } from '../js/core/cartao.js';

const args = process.argv.slice(2);
const iHoje = args.indexOf('--hoje');
const hoje = iHoje >= 0 ? args[iHoje + 1] : new Date().toISOString().slice(0, 10);
const [planilha, entrada, saida] = args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--hoje');
if (!planilha || !entrada || !saida) {
  console.error('Uso: node scripts/importar-cartao.mjs <planilha.xlsx> <casa-atual.json> <saida.json> [--hoje AAAA-MM-DD]');
  process.exit(2);
}

const atual = migrarCasa(JSON.parse(readFileSync(entrada, 'utf8')));
const { casa, avisos } = importarCartao(lerXlsx(readFileSync(planilha)), { hoje, casa: atual });
writeFileSync(saida, `${JSON.stringify(casa, null, 2)}\n`);

const brl = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const conta = casa.contas.find((c) => c.id === casa.cartao?.contaId);
console.log(`Cartão de ${casa.pessoas.find((p) => p.id === casa.cartao?.donaId)?.nome ?? '?'}, ligado à conta ${conta?.nome ?? '?'}`);
console.log(`Outras pessoas: ${casa.cartao?.pessoas.map((p) => p.nome).join(', ') || 'nenhuma'}`);
console.log(`De todo mês: ${casa.cartao?.fixas.length ?? 0}`);
const faturas = [...new Set(casa.meses.filter((m) => m.compras.some((c) => c.contaId === conta?.id && c.para)).map((m) => m.mes))];
for (const f of faturas) {
  const r = faturaDoCartao(casa, f);
  console.log(`  ${f}: ${r.compras.length} compras + ${r.fixas.length} de todo mês · total ${brl(r.total)} · ${r.porPessoa.map((p) => `${p.nome} ${brl(p.valor)}`).join(' · ')}`);
}
for (const a of avisos) console.log(`AVISO: ${a}`);
console.log(`ok  ${saida}`);
