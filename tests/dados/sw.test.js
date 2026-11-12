import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// O app precisa abrir sem internet: todo arquivo servido tem que estar no cache do service worker.
const texto = readFileSync('sw.js', 'utf8');
const casca = [...texto.match(/const CASCA = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
const modulos = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? modulos(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name).replaceAll('\\', '/')] : []));

test('service worker na versão 5', () => assert.match(texto, /const VERSAO = 'projeto-r-v5'/));
// A página compara a própria versão com a do service worker novo: só recarrega se forem diferentes.
test('página e service worker na mesma versão, e o service worker responde a versão', () => {
  const daPagina = readFileSync('js/versao.js', 'utf8').match(/VERSAO = '([^']+)'/)?.[1];
  assert.equal(daPagina, texto.match(/const VERSAO = '([^']+)'/)[1]);
  assert.ok(texto.includes("addEventListener('message'"), 'o service worker precisa responder a versão');
});
// Sem isso o cache HTTP do aparelho (max-age=600 no GitHub Pages) segura a versão antiga por até 10 minutos.
test('busca e instala confirmando com o servidor, sem a cópia guardada', () => {
  assert.match(texto, /cache: 'no-cache'/);
  assert.match(texto, /cache: 'reload'/);
});
test('todo arquivo do cache existe', () => { for (const a of casca) assert.ok(existsSync(a), `falta ${a}`); });
test('todo módulo de js/ e toda fonte estão no cache', () => {
  for (const m of modulos('js')) assert.ok(casca.includes(m), `${m} fora do cache do service worker`);
  for (const f of readdirSync('fontes').filter((n) => n.endsWith('.woff2'))) assert.ok(casca.includes(`fontes/${f}`), `fontes/${f} fora do cache`);
});
