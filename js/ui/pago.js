// O switch "já paguei" (desenho 2026-11-21-ja-paguei) das contas do Mês da casa: muda na
// hora e grava em segundo plano (não espera o GitHub; se falhar, volta com um aviso). Quando o último item do mês é
// marcado, abre o mês seguinte. `irPara(mês)` leva à tela do mês; `visto` é o perfil de quem marca.
import { h } from './dom.js';
import { somarMeses } from '../core/meses.js';
import { estaPago, marcarPago, tudoPago } from '../core/pagamentos.js';
import { nomeDoMes } from '../core/lista-mes.js';

export function criarMarcador({ ctx, casa, mes, visto, irPara }) {
  let casaAgora = casa; // com o que já foi marcado nesta tela (a gravação pode ainda não ter voltado)
  // `marca`: o id que se grava; `rotulo`: o nome para leitores de tela; `botaoLinha`: a linha que ganha o switch.
  return function comPago(marca, rotulo, botaoLinha) {
    if (!visto) return botaoLinha;
    let pago = estaPago(casa, mes, marca);
    const linhaPaga = h('div', { class: 'linha-paga' });
    const chave = h('button', { type: 'button', class: 'sw-pago', role: 'switch', 'aria-label': `Já paguei: ${rotulo}` }, h('span', { class: 'sw-trilho', 'aria-hidden': 'true' }));
    const mostrar = () => {
      chave.setAttribute('aria-checked', String(pago));
      linhaPaga.classList.toggle('paga', pago);
    };
    chave.addEventListener('click', () => {
      const antes = pago;
      pago = !pago;
      mostrar();
      const grava = (c) => marcarPago(c, { mes, marca, pago });
      casaAgora = grava(casaAgora);
      const acabou = pago && tudoPago(casaAgora, mes, visto.id);
      ctx.salvarCasa(grava).catch((erro) => {
        console.warn('Não salvei o já paguei', erro);
        pago = antes;
        casaAgora = grava(casaAgora);
        mostrar();
        ctx.aviso('Não deu para salvar. Tente de novo.', 'atencao', 3500);
      });
      if (acabou) {
        ctx.aviso(`Tudo pago em ${nomeDoMes(mes)}! Mostrando ${nomeDoMes(somarMeses(mes, 1))}.`, 'ok', 3500);
        setTimeout(() => irPara(somarMeses(mes, 1)), 350);
      }
    });
    mostrar();
    linhaPaga.append(chave, botaoLinha);
    return linhaPaga;
  };
}
