// "Já paguei" (desenho 2026-11-21-ja-paguei): as contas e as faturas de cartão pagas em cada mês. A marca é da casa:
// quem marcar (eu ou a outra pessoa), vale para os dois. Fica no topo do casa.json, `pagamentos[mês][marca] = true`,
// fora de `meses` (um app antigo que regrava o mês não o apaga). Quando tudo do mês está pago, a tela abre no seguinte.
import { resumoDoMes } from './casa.js';
import { faturaDoCartao } from './cartao.js';
import { contasPessoaisDoMes } from './contas-pessoais.js';
import { somarMeses } from './meses.js';

export const estaPago = (casa, mes, marca) => Boolean(casa?.pagamentos?.[mes]?.[marca]);

export function marcarPago(casa, { mes, marca, pago }) {
  // Marcar de novo como pago fecha outra vez um mês que estava reaberto.
  const { pagamentos = {}, ...resto } = pago ? tirarReaberto(casa, mes) : casa;
  const { [mes]: doMes = {}, ...outrosMeses } = pagamentos;
  const { [marca]: _antes, ...outras } = doMes;
  const marcas = pago ? { ...outras, [marca]: true } : outras;
  const novos = Object.keys(marcas).length ? { ...outrosMeses, [mes]: marcas } : outrosMeses;
  return Object.keys(novos).length ? { ...resto, pagamentos: novos } : resto;
}

// Mês fechado (desenho 2026-11-21-mes-fechado): tudo pago (contas e cartões de quem vê) e não reaberto — não se edita
// até reabrir. `reabertos[mês] = true` fica no topo do casa.json, junto de `pagamentos`.
const tirarReaberto = (casa, mes) => {
  if (!casa.reabertos?.[mes]) return casa;
  const { [mes]: _, ...outros } = casa.reabertos;
  const { reabertos: _velhos, ...resto } = casa;
  return Object.keys(outros).length ? { ...resto, reabertos: outros } : resto;
};
export const reabrirMes = (casa, mes) => ({ ...casa, reabertos: { ...(casa.reabertos ?? {}), [mes]: true } });
export const fecharMes = tirarReaberto; // o cadeado da tela Contas: tudo pago e reaberto volta a fechar

// A marca de uma fatura de cartão (o botão "Pago" da tela Cartão). A conta da casa ligada a um cartão é a mesma fatura:
// tem a mesma marca para qualquer pessoa (marcou a dona, a outra pessoa também vê pago).
export const marcaDoCartao = (cartaoId) => `cartao-${cartaoId}`;
export function marcaDaConta(casa, contaId) {
  const cartao = (casa.cartoes ?? []).find((c) => c.contaId === contaId);
  return cartao ? marcaDoCartao(cartao.id) : contaId;
}

// As contas com valor no mês, como marcas (sem repetir).
const marcasDasContas = (casa, mes) => [...new Set(resumoDoMes(casa, mes).contas.map((c) => marcaDaConta(casa, c.conta.id)))];
// A fatura de cada cartão da pessoa, se tiver compras no mês.
const marcasDosCartoes = (casa, mes, pessoaId) => (casa.cartoes ?? [])
  .filter((c) => c.donaId === pessoaId && faturaDoCartao(casa, c.id, mes).total > 0).map((c) => marcaDoCartao(c.id));

// Todas as contas do mês pagas (o selo "Pago" das contas da casa no Balanço). Sem contas: não.
export function contasPagas(casa, mes, pessoaId) {
  const marcas = marcasDasContas(casa, mes);
  return marcas.length > 0 && marcas.every((m) => estaPago(casa, mes, m));
}

// As contas pessoais da pessoa com valor no mês (a marca é o id da conta).
const marcasDasPessoais = (casa, mes, pessoaId) => contasPessoaisDoMes(casa, mes, pessoaId).contas.map((c) => c.conta.id);

// Tudo pago: contas da casa, cartões e contas pessoais da pessoa. Mês sem nada para pagar não conta como pago.
export function tudoPago(casa, mes, pessoaId) {
  const marcas = [...new Set([...marcasDasContas(casa, mes), ...marcasDosCartoes(casa, mes, pessoaId), ...marcasDasPessoais(casa, mes, pessoaId)])];
  return marcas.length > 0 && marcas.every((m) => estaPago(casa, mes, m));
}

// Meses passados (desenho 2026-11-21-meses-travados): todo mês antes do atual está travado. O mês anterior (mês-1) pode
// ser destravado ('fechado' até reabrir); do mês-2 para trás é 'definitivo', sem volta. Do mês atual em diante vale o
// "tudo pago" (mesFechado). Devolve 'livre' | 'fechado' | 'definitivo'.
export function estadoDoMes(casa, mes, pessoaId, hoje) {
  const anterior = somarMeses(hoje.slice(0, 7), -1);
  if (mes < anterior) return 'definitivo';
  if (mes === anterior) return casa?.reabertos?.[mes] ? 'livre' : 'fechado';
  return mesFechado(casa, mes, pessoaId) ? 'fechado' : 'livre';
}

export const mesFechado = (casa, mes, pessoaId) => Boolean(pessoaId) && !casa?.reabertos?.[mes] && tudoPago(casa, mes, pessoaId);

// O mês que a tela abre: o atual, ou o seguinte (e o seguinte...) enquanto tudo já estiver pago. Sem perfil, o atual.
export function mesEmFoco(casa, hoje, pessoaId) {
  const limite = somarMeses(hoje.slice(0, 7), 12);
  let mes = hoje.slice(0, 7);
  while (pessoaId && mes < limite && mesFechado(casa, mes, pessoaId)) mes = somarMeses(mes, 1);
  return mes;
}
