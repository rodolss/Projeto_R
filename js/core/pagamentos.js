// "Já paguei" (desenho 2026-11-21-ja-paguei): cada pessoa marca, mês a mês, as contas que já pagou (água, luz, a
// fatura do cartão... — o cartão é uma conta). Fica no topo do casa.json, `pagos[mês][pessoa][conta] = true`, fora
// de `meses` (um app antigo que regrava o mês não o apaga). Quando tudo do mês está pago, a tela abre no mês seguinte.
import { resumoDoMes } from './casa.js';
import { faturaDoCartao } from './cartao.js';
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

// O que se paga com a marca: o id de uma conta; o cartão de quem paga tem a marca própria (a fatura inteira), e a conta
// ligada a ele usa a mesma marca (é a mesma fatura). Cartão de outra pessoa: a conta comum (a parte da casa).
export const marcaDoCartao = (cartaoId) => `cartao-${cartaoId}`;
export function marcaDaConta(casa, contaId, pessoaId) {
  const dele = (casa.cartoes ?? []).find((c) => c.contaId === contaId && c.donaId === pessoaId);
  return dele ? marcaDoCartao(dele.id) : contaId;
}

// O que há para pagar no mês: as contas com valor e a fatura de cada cartão da pessoa (com compras), sem repetir.
function marcasDoMes(casa, mes, pessoaId) {
  const marcas = resumoDoMes(casa, mes).contas.map((c) => marcaDaConta(casa, c.conta.id, pessoaId));
  for (const cartao of casa.cartoes ?? []) {
    if (cartao.donaId === pessoaId && faturaDoCartao(casa, cartao.id, mes).total > 0) marcas.push(marcaDoCartao(cartao.id));
  }
  return [...new Set(marcas)];
}

// Mês sem nada para pagar não conta como pago.
export function tudoPago(casa, mes, pessoaId) {
  const marcas = marcasDoMes(casa, mes, pessoaId);
  return marcas.length > 0 && marcas.every((m) => estaPago(casa, mes, pessoaId, m));
}

// O mês que a tela abre: o atual, ou o seguinte (e o seguinte...) enquanto tudo já estiver pago. Sem perfil, o atual.
export function mesEmFoco(casa, hoje, pessoaId) {
  const limite = somarMeses(hoje.slice(0, 7), 12);
  let mes = hoje.slice(0, 7);
  while (pessoaId && mes < limite && tudoPago(casa, mes, pessoaId)) mes = somarMeses(mes, 1);
  return mes;
}
