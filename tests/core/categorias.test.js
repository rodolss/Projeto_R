import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriaDe, categoriaDaConta } from '../../js/core/categorias.js';

test('categorias: o nome escolhe o ícone (luz, água, mercado, pet, assinatura...)', () => {
  assert.equal(categoriaDe('Luz'), 'luz');
  assert.equal(categoriaDe('Conta de Água'), 'agua');
  assert.equal(categoriaDe('Internet Vivo'), 'conexao');
  assert.equal(categoriaDe('Condomínio'), 'moradia');
  assert.equal(categoriaDe('Mercado'), 'mercado');
  assert.equal(categoriaDe('Ração da Nami'), 'pet');
  assert.equal(categoriaDe('Netflix'), 'assinatura');
  assert.equal(categoriaDe('Farmácia'), 'saude');
  assert.equal(categoriaDe('Uber'), 'transporte');
  assert.equal(categoriaDe('Passagem de avião'), 'viagem');
  assert.equal(categoriaDe('Pão de queijo'), 'comida');
  assert.equal(categoriaDe('Presente da mãe'), 'presente');
  assert.equal(categoriaDe('Tênis de corrida'), 'roupa');
  assert.equal(categoriaDe('Geladeira nova'), 'outro');
  assert.equal(categoriaDe(''), 'outro');
});

test('categorias: conta compra por compra sem outra categoria vira cartão', () => {
  assert.equal(categoriaDaConta({ nome: 'Cartão da casa', compraPorCompra: true }), 'cartao');
  assert.equal(categoriaDaConta({ nome: 'Mercado', compraPorCompra: true }), 'mercado');
  assert.equal(categoriaDaConta({ nome: 'IPTU', compraPorCompra: false }), 'moradia');
  assert.equal(categoriaDaConta({ nome: 'Diversos', compraPorCompra: false }), 'outro');
});
