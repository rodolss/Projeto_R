// Contas pessoais (desenho 2026-11-22-contas-pessoais): contas de uma pessoa só (um empréstimo, a academia), que se
// repetem todo mês e não entram na divisão da casa. Ficam em `casa.contasPessoais`, cada uma com o dono (`donoId`);
// o valor de cada mês fica em `meses[].valores`, o mesmo lugar das contas da casa (um app antigo o preserva e não
// divide a conta, porque só lê `casa.contas`). `desde`: o mês em que a conta começou (ou voltou a ser usada);
// `ultimoMes`: a última parcela, incluída (sem ele, a conta não tem fim).
import { centavos, salvarValor } from './casa.js';
import { somarMeses, diffMeses } from './meses.js';

const idPadrao = () => globalThis.crypto.randomUUID();
const tem = (obj, chave) => Object.prototype.hasOwnProperty.call(obj ?? {}, chave);
const lista = (casa) => casa?.contasPessoais ?? [];
const VAZIO = { valor: 0, situacao: 'vazio', deOnde: null };

export const contasPessoaisDe = (casa, pessoaId, { arquivadas = false } = {}) => lista(casa)
  .filter((c) => c.donoId === pessoaId && Boolean(c.arquivada) === arquivadas);

// Dentro do período da conta: do mês em que começou até a última parcela.
const noPeriodo = (conta, mes) => (!conta.desde || conta.desde <= mes) && (!conta.ultimoMes || mes <= conta.ultimoMes);

// Confirmado = digitado no mês (aparece sempre). Sem ele, a previsão pelo último valor confirmado antes do mês, só
// dentro do período e com a conta em uso.
export function valorDaContaPessoal(casa, mes, conta) {
  const reg = casa.meses.find((m) => m.mes === mes);
  if (tem(reg?.valores, conta.id)) return { valor: reg.valores[conta.id], situacao: 'confirmado', deOnde: null };
  if (conta.arquivada || !noPeriodo(conta, mes)) return VAZIO;
  const anterior = casa.meses
    .filter((m) => m.mes < mes && tem(m.valores, conta.id))
    .reduce((ultimo, m) => (!ultimo || m.mes > ultimo.mes ? m : ultimo), null);
  return anterior ? { valor: anterior.valores[conta.id], situacao: 'a-confirmar', deOnde: anterior.mes } : VAZIO;
}

// Quantas parcelas faltam no mês, contando a dele (1 = a última). Sem fim: null.
export const faltamParcelas = (conta, mes) => (conta.ultimoMes ? diffMeses(mes, conta.ultimoMes) + 1 : null);

export const ultimoMesDasParcelas = (mes, parcelas) => (parcelas ? somarMeses(mes, parcelas - 1) : null);

// As contas pessoais de uma pessoa no mês: as com valor (e o total), as em uso sem valor, quantas são previsão.
export function contasPessoaisDoMes(casa, mes, pessoaId) {
  const contas = [];
  const semValor = [];
  for (const conta of lista(casa).filter((c) => c.donoId === pessoaId)) {
    const v = valorDaContaPessoal(casa, mes, conta);
    if (v.situacao !== 'vazio' && v.valor !== 0) contas.push({ conta, ...v, faltam: faltamParcelas(conta, mes) });
    else if (v.situacao === 'vazio' && !conta.arquivada && noPeriodo(conta, mes)) semValor.push(conta);
  }
  const total = centavos(contas.reduce((s, c) => s + c.valor, 0));
  return { contas, semValor, total, aConfirmar: contas.filter((c) => c.situacao === 'a-confirmar').length };
}

// ---------- mutações (devolvem uma casa nova) ----------

export function adicionarContaPessoal(casa, { nome, donoId, mes, valor = null, parcelas = null, novoId = idPadrao }) {
  const id = novoId();
  const ultimoMes = ultimoMesDasParcelas(mes, parcelas);
  const conta = { id, nome: nome.trim(), donoId, arquivada: false, desde: mes, ...(ultimoMes ? { ultimoMes } : {}) };
  const comConta = { ...casa, contasPessoais: [...lista(casa), conta] };
  return valor == null ? comConta : salvarValor(comConta, { mes, contaId: id, valor });
}

// `ultimoMes: null` tira o fim (a conta passa a ser de todo mês).
export function editarContaPessoal(casa, id, { nome, arquivada, desde, ultimoMes }) {
  const mudanca = Object.fromEntries(Object.entries({ nome: nome?.trim(), arquivada, desde, ultimoMes }).filter(([, v]) => v !== undefined));
  return {
    ...casa,
    contasPessoais: lista(casa).map((c) => {
      if (c.id !== id) return c;
      const { ultimoMes: fim = c.ultimoMes, ...outras } = mudanca; // null fica null: tira o fim
      const { ultimoMes: _antes, ...resto } = { ...c, ...outras };
      return fim ? { ...resto, ultimoMes: fim } : resto;
    }),
  };
}

// Troca com a vizinha em uso do mesmo dono (as dos outros e as paradas ficam onde estão).
export function moverContaPessoal(casa, id, delta) {
  const contas = [...lista(casa)];
  const de = contas.findIndex((c) => c.id === id);
  const passo = Math.sign(delta);
  if (de < 0 || !passo) return casa;
  let para = de + passo;
  while (para >= 0 && para < contas.length && (contas[para].donoId !== contas[de].donoId || contas[para].arquivada)) para += passo;
  if (para < 0 || para >= contas.length) return casa;
  [contas[de], contas[para]] = [contas[para], contas[de]];
  return { ...casa, contasPessoais: contas };
}

// O "Pago" de uma conta prevista também confirma o valor: a parcela fixa não precisa ser redigitada todo mês.
export function confirmarPrevisao(casa, { mes, conta }) {
  const v = valorDaContaPessoal(casa, mes, conta);
  return v.situacao === 'a-confirmar' ? salvarValor(casa, { mes, contaId: conta.id, valor: v.valor }) : casa;
}
