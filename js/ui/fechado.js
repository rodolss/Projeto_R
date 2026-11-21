// Mês fechado (desenho 2026-11-21-mes-fechado): com tudo pago, o mês não se edita até reabrir. O aviso fica no topo das
// telas (Contas, Balanço, Cartão) com o botão "Reabrir mês".
import { aviso, botao } from './dom.js';
import { reabrirMes } from '../core/pagamentos.js';

export const AVISO_FECHADO = 'Mês fechado. Reabra o mês para editar.';

export const AVISO_ANTIGO = 'Mês antigo: travado, não pode mais ser editado.';

export function avisoMesFechado({ ctx, mes }) {
  return aviso('info', '🔒 Mês fechado: tudo pago. Para editar, reabra o mês. ',
    botao('Reabrir mês', async (e) => {
      e.currentTarget.disabled = true;
      await ctx.salvarCasa((c) => reabrirMes(c, mes));
      ctx.aviso('Mês reaberto.', 'ok', 2500);
      ctx.rerender();
    }, { secundario: true }));
}

// O cadeado do card das Contas (SVG com as cores do app: verde = fechado/tudo pago, azul = aberto). A haste sobe e
// vira ao abrir e desce ao fechar (transições no css/app.css, `.cadeado-svg`); o corpo dá um pulinho ao fechar.
export const cadeadoSvg = (fechado) => `<svg class="cadeado-svg${fechado ? ' fechado' : ''}" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
  <path class="haste" d="M10.5 14.5V10.5a5.5 5.5 0 0 1 11 0v4" fill="none" stroke-width="2.6" stroke-linecap="round"/>
  <g class="corpo"><rect x="6" y="14" width="20" height="14" rx="4"/><circle class="furo" cx="16" cy="20" r="2.1"/><rect class="furo" x="15.1" y="20.5" width="1.8" height="4.2" rx="0.9"/></g>
</svg>`;
