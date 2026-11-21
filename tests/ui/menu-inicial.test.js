// O menu de baixo não pisca o espaço errado ao abrir (versão 59): o index.html esconde os menus até o app decidir
// (body.iniciando) e, quando já abriu antes, põe as classes da última vez antes do primeiro quadro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const css = readFileSync('css/app.css', 'utf8');

test('menu inicial: começa escondido e o index.html restaura o da última vez com a mesma chave do app.js', () => {
  assert.match(html, /<body class="iniciando">/);
  const chave = app.match(/const CHAVE_MENU = '([^']+)'/)?.[1];
  assert.ok(chave, 'o app.js grava as classes do menu');
  assert.ok(html.indexOf(`localStorage.getItem('${chave}')`) > html.indexOf('<body'), 'o script lê a mesma chave, logo depois do <body>');
  assert.ok(html.indexOf(`localStorage.getItem('${chave}')`) < html.indexOf('<nav'), 'antes dos menus');
  assert.match(css, /body\.iniciando \.menu/);
  assert.match(app, /classList\.remove\('iniciando'\)/);
});
