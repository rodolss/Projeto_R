import assert from 'node:assert/strict';

export function perto(atual, esperado, tol = 0.01) {
  assert.ok(
    typeof atual === 'number' && Math.abs(atual - esperado) <= tol,
    `esperado ${esperado} (±${tol}), obtido ${atual}`,
  );
}

// Taxas mensais de referência (5%, 3%, 7% e 8% ao ano).
export const i5 = 0.0040741237836483535;
export const i3 = 0.0024662697723036864;
export const i7 = 0.0056541453874052738;
export const i8 = 0.00643403011000343;
