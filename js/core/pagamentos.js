// "Já paguei" (desenho 2026-11-21-ja-paguei): cada pessoa marca, mês a mês, as contas que já pagou (água, luz, a
// fatura do cartão... — o cartão é uma conta). Fica no topo do casa.json, `pagos[mês][pessoa][conta] = true`, fora
// de `meses` (um app antigo que regrava o mês não o apaga). Quando tudo do mês está pago, a tela abre no mês seguinte.
import { resumoDoMes } from './casa.js';
import { somarMeses } from './meses.js';

export const estaPago = (casa, mes, pessoaId, contaId) => Boolean(casa?.pagos?.[mes]?.[pessoaId]?.[contaId]);

export function marcarPago(casa, { mes, pessoaId, contaId, pago }) {
  const { pagos = {}, ...resto } = casa;
  const { [mes]: doMes = {}, ...outrosMeses } = pagos;
  const { [pessoaId]: daPessoa = {}, ...outrasPessoas } = doMes;
  const { [contaId]: _antes, ...outrasContas } = daPessoa;
  const contas = pago ? { ...outrasContas, [contaId]: true } : outrasContas;
  const novoDoMes = Object.keys(contas).length ? { ...outrasPessoas, [pessoaId]: contas } : outrasPessoas;
  const novos = Object.keys(novoDoMes).length ? { ...outrosMeses, [mes]: novoDoMes } : outrosMeses;
  return Object.keys(novos).length ? { ...resto, pagos: novos } : resto;
}

// As contas com valor no mês (as que há para pagar).
const contasDoMes = (casa, mes) => resumoDoMes(casa, mes).contas.map((c) => c.conta.id);

// Mês sem nenhuma conta não conta como pago.
export function tudoPago(casa, mes, pessoaId) {
  const ids = contasDoMes(casa, mes);
  return ids.length > 0 && ids.every((id) => estaPago(casa, mes, pessoaId, id));
}

// O mês que a tela abre: o atual, ou o seguinte (e o seguinte...) enquanto tudo já estiver pago. Sem perfil, o atual.
export function mesEmFoco(casa, hoje, pessoaId) {
  const limite = somarMeses(hoje.slice(0, 7), 12);
  let mes = hoje.slice(0, 7);
  while (pessoaId && mes < limite && tudoPago(casa, mes, pessoaId)) mes = somarMeses(mes, 1);
  return mes;
}
