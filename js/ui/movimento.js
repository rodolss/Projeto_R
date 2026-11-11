// Movimento das telas (spec v2 §7). Com "reduzir movimento" ligado no aparelho, nada se mexe.
export const reduzMovimento = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Os blocos da tela entram em sequência: o CSS usa --i para atrasar cada um.
export function escalonar(container) {
  [...container.children].forEach((el, i) => el.style.setProperty('--i', String(i)));
}

// Faz um valor "contar" de 0 até o alvo. A tela já nasce com o valor final; a contagem é só enfeite.
export function contar(el, alvo, formatar, duracaoMs = 1100) {
  el.textContent = formatar(alvo);
  if (reduzMovimento() || !Number.isFinite(alvo) || alvo === 0) return;
  const inicio = performance.now();
  const passo = (agora) => {
    if (!el.isConnected) return;
    const k = Math.min(1, Math.max(0, (agora - inicio) / duracaoMs));
    el.textContent = formatar(alvo * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
