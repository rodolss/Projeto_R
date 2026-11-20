// Marca "já tenho" (desenho 2026-11-20-ja-tenho) nas compras pintadas de amarelo na aba pessoal da planilha, sobre
// um casa.json que já existe. Uma vez só; rodar de novo não marca nada a mais. A entrada e a saída têm dados
// pessoais: guarde-as FORA do repositório público e envie só para o repositório privado. Não imprime valores.
// Uso: node scripts/marcar-ja-tenho.mjs <planilha.xlsx> <casa-atual.json> <saida.json> [--hoje AAAA-MM-DD]
import { readFileSync, writeFileSync } from 'node:fs';
import { lerXlsx, marcasAmarelas, aplicarMarcas } from './planilha-casa.mjs';
import { migrarCasa } from '../js/core/casa.js';

const args = process.argv.slice(2);
const iHoje = args.indexOf('--hoje');
const hoje = iHoje >= 0 ? args[iHoje + 1] : new Date().toISOString().slice(0, 10);
const [planilha, entrada, saida] = args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--hoje');
if (!planilha || !entrada || !saida) {
  console.error('Uso: node scripts/marcar-ja-tenho.mjs <planilha.xlsx> <casa-atual.json> <saida.json> [--hoje AAAA-MM-DD]');
  process.exit(2);
}

const atual = migrarCasa(JSON.parse(readFileSync(entrada, 'utf8')));
const { cartaoId, marcas } = marcasAmarelas(lerXlsx(readFileSync(planilha)), { hoje, casa: atual });
if (!cartaoId) {
  console.error('Não achei a aba pessoal de uma das pessoas da casa, ou o cartão dela.');
  process.exit(1);
}
const { casa, achadas, faltando } = aplicarMarcas(atual, { cartaoId, marcas });
writeFileSync(saida, `${JSON.stringify(casa, null, 2)}\n`);
console.log(`Células amarelas: ${marcas.length} · achadas: ${achadas} · faltando: ${faltando.length}`);
for (const f of faltando) console.log(`FALTANDO: fatura ${f.fatura} · ${f.nome}`);
console.log(`ok  ${saida}`);
