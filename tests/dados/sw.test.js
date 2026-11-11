import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// O app precisa abrir sem internet: todo arquivo servido tem que estar no cache do service worker.
const texto = readFileSync('sw.js', 'utf8');
const casca = [...texto.match(/const CASCA = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
const modulos = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? modulos(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name).replaceAll('\\', '/')] : []));

test('service worker na versão 2', () => assert.match(texto, /const VERSAO = 'projeto-r-v2'/));
test('todo arquivo do cache existe', () => { for (const a of casca) assert.ok(existsSync(a), `falta ${a}`); });
test('todo módulo de js/ e toda fonte estão no cache', () => {
  for (const m of modulos('js')) assert.ok(casca.includes(m), `${m} fora do cache do service worker`);
  for (const f of readdirSync('fontes').filter((n) => n.endsWith('.woff2'))) assert.ok(casca.includes(`fontes/${f}`), `fontes/${f} fora do cache`);
});
