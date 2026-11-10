// Custo de vida, metas de patrimônio e provisão para despesas anuais.
import { diffMeses } from './meses.js';

export const CATEGORIAS_SUGERIDAS = [
  { id: 'moradia', nome: 'Moradia', tipo: 'mensal' },
  { id: 'condominio', nome: 'Condomínio', tipo: 'mensal' },
  { id: 'contas-casa', nome: 'Contas da casa', tipo: 'mensal' },
  { id: 'mercado', nome: 'Mercado', tipo: 'mensal' },
  { id: 'transporte', nome: 'Transporte', tipo: 'mensal' },
  { id: 'saude', nome: 'Saúde/plano', tipo: 'mensal' },
  { id: 'educacao', nome: 'Educação', tipo: 'mensal' },
  { id: 'assinaturas', nome: 'Assinaturas', tipo: 'mensal' },
  { id: 'cuidados', nome: 'Cuidados pessoais', tipo: 'mensal' },
  { id: 'lazer', nome: 'Lazer', tipo: 'mensal' },
  { id: 'pets', nome: 'Pets', tipo: 'mensal' },
  { id: 'presentes', nome: 'Presentes', tipo: 'mensal' },
  { id: 'ipva', nome: 'IPVA', tipo: 'anual' },
  { id: 'iptu', nome: 'IPTU', tipo: 'anual' },
  { id: 'seguros', nome: 'Seguros', tipo: 'anual' },
  { id: 'material-escolar', nome: 'Material escolar', tipo: 'anual' },
  { id: 'viagem', nome: 'Viagem', tipo: 'anual' },
];

export function custoDeVida(orcamento) {
  let mensal = 0;
  let anual = 0;
  for (const c of orcamento) {
    if (c.tipo === 'anual') anual += c.valor;
    else mensal += c.valor;
  }
  return { mensal, anual, total: mensal + anual / 12 };
}

export function calcularMetas({ custoTotal, salario, swr }) {
  return { independencia: custoTotal * 12 / swr, rendaPlena: salario * 12 / swr };
}

export function provisaoMensal({ anual, salario, recebe13, recebeFerias }) {
  const extrasEsperados = (recebe13 ? salario : 0) + (recebeFerias ? salario / 3 : 0);
  return Math.max(0, (anual - extrasEsperados) / 12);
}

export function rendaDoPatrimonio(patrimonio, swr) {
  return patrimonio * swr / 12;
}

export function precisaRevisarOrcamento(ultimaRevisao, mesAtual) {
  if (!ultimaRevisao) return false;
  return diffMeses(ultimaRevisao, mesAtual) >= 6;
}
