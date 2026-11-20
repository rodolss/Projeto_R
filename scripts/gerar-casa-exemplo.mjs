// Gera contas da casa INVENTADAS em volta do mês atual, para fotografar as telas sem dados reais.
// Uso: node scripts/gerar-casa-exemplo.mjs <saida.json>
// A saída é um mapa { chave do localStorage: valor } para `capturar-telas.mjs --local <saida.json>`.
import { writeFileSync } from 'node:fs';
import { salvarValor, salvarSalario, conferirFatura, migrarCasa } from '../js/core/casa.js';
import { adicionarCartao, adicionarPessoaDoCartao, anotarCompra, faturaDaCompra, acharCartao } from '../js/core/cartao.js';
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
  schemaVersion: 3,
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
  cartoes: [],
  outrasPessoas: [],
};
casa = migrarCasa(casa); // versão atual (perfis da Ana, que administra, e do Leo)

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

// Dois cartões. O do Leo (melhor dia 3, vence dia 10): compras dele, da casa e da Mãe na fatura aberta, duas de
// todo mês e a fatura anterior conferida. O da Ana (melhor dia 24, vence dia 1): começando, com duas compras.
casa = adicionarCartao(casa, { donaId: 'p2', viraNoDia: 3, venceNoDia: 10, contaId: 'cartao', novoId }).casa;
casa = adicionarCartao(casa, { donaId: 'p1', viraNoDia: 24, venceNoDia: 1, novoId: () => 'cartao-ana' }).casa;
casa = adicionarPessoaDoCartao(casa, { nome: 'Mãe', novoId: () => 'mae' }).casa;
const dia = (menos) => {
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - menos);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const comprar = (data, nome, valor, para, extra = {}) => { casa = anotarCompra(casa, { cartaoId: 'cartao', data, nome, valor, para, novoId, ...extra }); };
const aberta = faturaDaCompra(dia(0), acharCartao(casa, 'cartao'));
const anterior = somarMeses(aberta, -1);
comprar(dia(0), 'Mercado', 412.35, 'casa');
comprar(dia(1), 'Farmácia', 86.9, 'mae');
comprar(dia(1), 'Tênis de corrida', 159.9, 'p2');
comprar(dia(3), 'Geladeira nova', 249.9, 'casa', { vezes: 10 });
comprar(dia(4), 'Presente', 75, 'p1');
comprar(dia(30), 'Mercado', 530.1, 'casa', { fatura: anterior });
comprar(dia(30), 'Streaming', 39.9, 'casa', { todoMes: true, fatura: anterior });
comprar(dia(30), 'Academia', 99, 'p2', { todoMes: true, fatura: anterior });
casa = conferirFatura(casa, { mes: anterior, contaId: 'cartao' });
casa = anotarCompra(casa, { cartaoId: 'cartao-ana', data: dia(2), nome: 'Padaria', valor: 32.5, para: 'casa', novoId });
casa = anotarCompra(casa, { cartaoId: 'cartao-ana', data: dia(2), nome: 'Livro', valor: 54.9, para: 'p1', novoId });

writeFileSync(saida, JSON.stringify({ 'projetoR.casa.estado': casa, 'projetoR.espaco': 'casa-cartao' }, null, 2));
console.log(`ok  ${saida} (${casa.meses.length} meses, de ${casa.meses[0].mes} a ${casa.meses.at(-1).mes})`);
