// Categoria de uma conta ou compra pelo nome (desenho 2026-11-21-facelift): só para o ícone e a cor da linha, nada de
// conta nem de soma depende disso. "Luz" → luz, "Ração da Nami" → pet, "Netflix" → assinatura; o que não conhece é "outro".
import { chaveDaTag } from './tags.js';

// Na ordem: a primeira que casa vence (assinatura antes de conexão: "Vivo Play" é streaming; pet antes de compras).
const REGRAS = [
  ['assinatura', /\b(netflix|spotify|disney|prime video|amazon prime|hbo|max|youtube|deezer|globoplay|paramount|apple|icloud|google one|assinatura|streaming|crunchyroll|xbox|playstation|psn|game pass|chatgpt|claude)\b/],
  ['pet', /\b(racao|pet|petshop|petz|cobasi|veterinari\w*|vet|tosa|banho e tosa|areia de gato|petisco|coleira)\b/],
  ['luz', /\b(luz|energia|eletricidade|enel|cemig|copel|light|celpe|coelba|cpfl|equatorial|neoenergia|celesc)\b/],
  ['agua', /\b(agua|sabesp|saneamento|copasa|cedae|embasa|compesa|esgoto|sanepar)\b/],
  ['gas', /\b(gas|botijao|comgas|ultragaz|liquigas|supergasbras)\b/],
  ['conexao', /\b(internet|wifi|wi-fi|fibra|vivo|claro|tim|oi|net|telefone|celular|recarga)\b/],
  ['moradia', /\b(aluguel|condominio|iptu|financiamento|prestacao|apartamento|apto|imobiliaria|reforma|moveis|movel|diarista|faxina)\b/],
  ['mercado', /\b(mercado|supermercado|feira|hortifruti|acougue|sacolao|atacadao|atacado|assai|carrefour|extra|pao de acucar|mercearia|emporio|cesta basica)\b/],
  ['comida', /\b(restaurante|ifood|rappi|lanche|lanchonete|pizza|pizzaria|hamburguer|burger|mcdonalds|mc donalds|bk|cafe|cafeteria|padaria|almoco|jantar|delivery|bar|sorvete|sorveteria|doceria|acai|sushi|churrasco|pao de queijo|marmita|esfiha|pastel|cafe da manha)\b/],
  ['transporte', /\b(uber|99|taxi|gasolina|combustivel|etanol|alcool|posto|estacionamento|pedagio|onibus|metro|trem|ipva|carro|moto|oficina|mecanico|pneu|lavagem|licenciamento|sem parar|bilhete unico)\b/],
  ['saude', /\b(farmacia|drogaria|remedio|medico|dentista|saude|plano de saude|hospital|clinica|exame|consulta|academia|psicolog\w*|terapia|fisioterapia|oculos|otica|vacina|smartfit|smart fit)\b/],
  ['educacao', /\b(escola|faculdade|curso|livro|livraria|material escolar|ingles|udemy|alura|papelaria|caderno|matricula)\b/],
  ['viagem', /\b(viagem|passagem|aviao|aereo|hotel|airbnb|pousada|hospedagem|booking|latam|decolar|bagagem|aeroporto)\b/],
  ['lazer', /\b(cinema|show|ingresso|teatro|parque|museu|festa|balada|jogo|game|steam|clube|passeio)\b/],
  ['presente', /\b(presente|aniversario|natal|dia das maes|dia dos pais|dia dos namorados|lembrancinha)\b/],
  ['roupa', /\b(roupa|camiseta|camisa|calca|tenis|sapato|vestido|blusa|bermuda|renner|riachuelo|zara|cea|shein|hering|perfume|maquiagem|cosmetico|salao|cabeleireiro|barbearia|manicure)\b/],
  ['compras', /\b(amazon|mercado livre|magalu|magazine|americanas|aliexpress|shopee|casas bahia|loja|shopping)\b/],
];

export function categoriaDe(nome) {
  const texto = chaveDaTag(nome);
  if (!texto) return 'outro';
  return REGRAS.find(([, regra]) => regra.test(texto))?.[0] ?? 'outro';
}

// A conta da casa: a que é "compra por compra" (cartão) sem outra categoria vira o ícone do cartão.
export const categoriaDaConta = (conta) => {
  const cat = categoriaDe(conta?.nome);
  return cat === 'outro' && conta?.compraPorCompra ? 'cartao' : cat;
};
