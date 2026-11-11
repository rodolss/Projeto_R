import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Toda tela precisa carregar: um import apontando para um arquivo renomeado quebra a tela inteira (já aconteceu com Ajustes).
for (const arquivo of readdirSync('js/ui').filter((n) => n.endsWith('.js'))) {
  test(`js/ui/${arquivo} carrega sem erro de import`, async () => {
    const modulo = await import(pathToFileURL(resolve('js/ui', arquivo)).href);
    assert.ok(modulo);
  });
}
