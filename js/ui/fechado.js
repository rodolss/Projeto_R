// Mês fechado (desenho 2026-11-21-mes-fechado): com tudo pago, o mês não se edita até reabrir. O aviso fica no topo das
// telas (Contas, Balanço, Cartão) com o botão "Reabrir mês".
import { aviso, botao } from './dom.js';
import { reabrirMes } from '../core/pagamentos.js';

export const AVISO_FECHADO = 'Mês fechado: tudo pago. Reabra o mês para editar.';

export function avisoMesFechado({ ctx, mes }) {
  return aviso('info', '🔒 Mês fechado: tudo pago. Para editar, reabra o mês. ',
    botao('Reabrir mês', async (e) => {
      e.currentTarget.disabled = true;
      await ctx.salvarCasa((c) => reabrirMes(c, mes));
      ctx.aviso('Mês reaberto.', 'ok', 2500);
      ctx.rerender();
    }, { secundario: true }));
}
