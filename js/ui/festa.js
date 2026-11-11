// Comemoração de marco (spec v2 §7): um cartão por marco, com confete, e "Continuar" para o próximo.
// Com "reduzir movimento" no aparelho, aparece só o cartão.
import { h } from './dom.js';
import { reduzMovimento } from './movimento.js';

export const TEXTOS_MARCOS = {
  reserva: {
    icone: '🛡️', titulo: 'Reserva de emergência completa!',
    frase: 'Você tem 6 meses do seu custo de vida guardados. Um imprevisto já não derruba o seu plano.',
  },
  independencia: {
    icone: '🥇', titulo: 'Independência conquistada!',
    frase: 'Seus investimentos já conseguem pagar o seu custo de vida. Daqui em diante, trabalhar vira uma escolha.',
  },
  rendaPlena: {
    icone: '🏆', titulo: 'Renda plena! Você chegou.',
    frase: 'Seus investimentos pagam o equivalente ao seu salário inteiro.',
  },
};

const DURACAO_CONFETE = 2800;

function confete(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const cores = ['--destaque', '--ouro', '--ok', '--c-ruim', '--c-moderado'].map((v) => css.getPropertyValue(v).trim());
  const pecas = Array.from({ length: 150 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.45,
    vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 12 - 5,
    giro: Math.random() * Math.PI, vgiro: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6, h: 9 + Math.random() * 8, cor: cores[Math.floor(Math.random() * cores.length)],
  }));
  const inicio = performance.now();
  const quadro = (agora) => {
    if (!canvas.isConnected) return;
    const t = agora - inicio;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0, 1 - t / DURACAO_CONFETE);
    for (const p of pecas) {
      p.vy += 0.3; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.giro += p.vgiro;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < DURACAO_CONFETE) requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
}

// Mostra os marcos em sequência; resolve quando o último é fechado.
export function comemorar(ids) {
  const fila = ids.filter((id) => TEXTOS_MARCOS[id]);
  if (!fila.length) return Promise.resolve();
  return new Promise((resolve) => {
    const fundo = h('div', { class: 'festa' });
    const focoAnterior = document.activeElement;
    let k = 0;

    const mostrar = () => {
      const t = TEXTOS_MARCOS[fila[k]];
      const continuar = h('button', { type: 'button', class: 'botao', onclick: () => avancar() }, 'Continuar');
      const canvas = h('canvas', { 'aria-hidden': 'true' });
      fundo.replaceChildren(
        h('div', { class: 'festa-cartao', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'festa-titulo' },
          h('span', { class: 'festa-icone', 'aria-hidden': 'true' }, t.icone),
          h('p', { class: 'rotulo' }, 'Marco conquistado'),
          h('h2', { id: 'festa-titulo' }, t.titulo),
          h('p', {}, t.frase),
          continuar),
        canvas);
      continuar.focus();
      if (!reduzMovimento()) confete(canvas);
    };
    const tecla = (e) => { if (e.key === 'Escape') avancar(); };
    const fechar = () => {
      document.removeEventListener('keydown', tecla);
      fundo.remove();
      focoAnterior?.focus?.();
      resolve();
    };
    function avancar() {
      k += 1;
      if (k < fila.length) mostrar();
      else fechar();
    }

    document.addEventListener('keydown', tecla);
    document.body.append(fundo);
    mostrar();
  });
}
