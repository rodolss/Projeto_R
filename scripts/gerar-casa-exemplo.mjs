// Gera contas da casa INVENTADAS em volta do mês atual, para fotografar as telas sem dados reais.
// Uso: node scripts/gerar-casa-exemplo.mjs <saida.json>
// A saída é um mapa { chave do localStorage: valor } para `capturar-telas.mjs --local <saida.json>`.
import { writeFileSync } from 'node:fs';
import { salvarValor, salvarSalario, adicionarCompra, conferirFatura } from '../js/core/casa.js';
import { somarMeses } from '../js/core/meses.js';

const saida = process.argv[2];
if (!saida) {
  console.error('Uso: node scripts/gerar-casa-exemplo.mjs <saida.json>');
  process.exit(2);
}

const agora = new Date();
const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
let n = 0;
const novoId = () => `ex${++n}`;

let casa = {
  schemaVersion: 1,
  pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Leo' }],
  contas: [
    { id: 'condominio', nome: 'Condomínio', compraPorCompra: false, arquivada: false },
    { id: 'agua', nome: 'Água', compraPorCompra: false, arquivada: false },
    { id: 'luz', nome: 'Luz', compraPorCompra: false, arquivada: false },
    { id: 'internet', nome: 'Internet', compraPorCompra: false, arquivada: false },
    { id: 'carro', nome: 'Carro', compraPorCompra: false, arquivada: false },
    { id: 'cartao', nome: 'Cartão da casa', compraPorCompra: true, arquivada: false },
    { id: 'iptu', nome: 'IPTU', compraPorCompra: false, arquivada: false },
    { id: 'aluguel', nome: 'Aluguel antigo', compraPorCompra: false, arquivada: true },
  ],
  meses: [],
};

// 14 meses para trás, com variação inventada; o mês atual fica com a luz e um salário a confirmar.
for (let k = -14; k <= 0; k++) {
  const mes = somarMeses(mesAtual, k);
  const onda = Math.sin(k) * 40;
  const valores = {
    condominio: 520, agua: 38 + (k % 3), internet: 99.9, carro: 1290, iptu: k === -9 ? 410 : 0,
    luz: Math.round((210 + onda) * 100) / 100, cartao: Math.round((980 + onda * 6) * 100) / 100,
  };
  if (k < -10) valores.aluguel = 1400;
  for (const [contaId, valor] of Object.entries(valores)) {
    if (k === 0 && (contaId === 'luz' || contaId === 'cartao')) continue;
    casa = salvarValor(casa, { mes, contaId, valor });
  }
  if (k < 0) casa = salvarSalario(casa, { mes, pessoaId: 'p1', valor: 6200 });
  casa = salvarSalario(casa, { mes, pessoaId: 'p2', valor: k < -6 ? 3100 : 3400 });
}

// Compras do cartão no mês atual (uma parcelada) e uma fatura do mês passado conferida.
const comprar = (mes, nome, valor, vezes = 1) => { casa = adicionarCompra(casa, { mes, contaId: 'cartao', nome, valor, vezes, novoId }); };
comprar(mesAtual, 'Mercado', 412.35);
comprar(mesAtual, 'Farmácia', 86.9);
comprar(mesAtual, 'Geladeira nova', 249.9, 10);
comprar(mesAtual, 'Assinatura de streaming', 39.9, 12);
comprar(somarMeses(mesAtual, -1), 'Mercado', 530.1);
casa = conferirFatura(casa, { mes: somarMeses(mesAtual, -1), contaId: 'cartao' });

writeFileSync(saida, JSON.stringify({ 'projetoR.casa.estado': casa, 'projetoR.espaco': 'casa' }, null, 2));
console.log(`ok  ${saida} (${casa.meses.length} meses, de ${casa.meses[0].mes} a ${casa.meses.at(-1).mes})`);
