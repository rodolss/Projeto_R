// Contas da casa (desenho de 2026-11-19): as contas do mês divididas entre duas pessoas em proporção à renda.
// O mês é o mês em que as contas são pagas. Valor digitado = confirmado; sem ele, o app prevê pelo último
// valor conhecido ("a confirmar"). No cartão compra por compra, o valor é a soma das compras do mês.
import { somarMeses } from './meses.js';

export const SCHEMA_CASA = 1;

export const centavos = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const soma = (lista) => centavos(lista.reduce((s, x) => s + x.valor, 0));
const tem = (obj, chave) => Object.prototype.hasOwnProperty.call(obj ?? {}, chave);
const idPadrao = () => globalThis.crypto.randomUUID();

const CONTAS_SUGERIDAS = [
  ['Condomínio', false], ['Água', false], ['Luz', false], ['Internet', false], ['Cartão da casa', true],
];

export function criarCasa({ nomes, novoId = idPadrao }) {
  return {
    schemaVersion: SCHEMA_CASA,
    pessoas: [{ id: 'p1', nome: nomes[0] }, { id: 'p2', nome: nomes[1] }],
    contas: CONTAS_SUGERIDAS.map(([nome, compraPorCompra]) => ({ id: novoId(), nome, compraPorCompra, arquivada: false })),
    meses: [],
  };
}

export function migrarCasa(estado) {
  if (estado?.schemaVersion !== SCHEMA_CASA) throw new Error('versao-desconhecida');
  return estado;
}

const ordenados = (casa) => [...casa.meses].sort((a, b) => (a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0));
const registro = (casa, mes) => casa.meses.find((m) => m.mes === mes) ?? null;
const comprasDa = (reg, contaId) => (reg?.compras ?? []).filter((c) => c.contaId === contaId);

export function primeiroMes(casa) {
  return ordenados(casa)[0]?.mes ?? null;
}

// O valor que o mês tem de fato para a conta (sem previsão): compras do cartão ou o valor digitado.
function valorDefinido(reg, conta) {
  if (conta.compraPorCompra) {
    const compras = comprasDa(reg, conta.id);
    if (compras.length) return soma(compras);
  }
  return tem(reg.valores, conta.id) ? reg.valores[conta.id] : null;
}

const VAZIO = { valor: 0, situacao: 'vazio', compras: [], deOnde: null };

export function valorDaConta(casa, mes, contaId) {
  const conta = casa.contas.find((c) => c.id === contaId);
  if (!conta) return VAZIO;
  const reg = registro(casa, mes);
  const confirmado = tem(reg?.valores, contaId);
  const compras = conta.compraPorCompra ? comprasDa(reg, contaId) : [];
  if (compras.length) return { valor: soma(compras), situacao: confirmado ? 'confirmado' : 'a-confirmar', compras, deOnde: null };
  if (confirmado) return { valor: reg.valores[contaId], situacao: 'confirmado', compras, deOnde: null };
  if (conta.arquivada) return VAZIO;
  // Conta que voltou a ser usada não é prevista nos meses de antes da volta (não reescreve o passado).
  if (conta.ativadaEm && mes < conta.ativadaEm) return VAZIO;
  const anteriores = ordenados(casa).filter((m) => m.mes < mes);
  for (let k = anteriores.length - 1; k >= 0; k--) {
    const valor = valorDefinido(anteriores[k], conta);
    if (valor != null) return { valor, situacao: 'a-confirmar', compras: [], deOnde: anteriores[k].mes };
  }
  return VAZIO;
}

export function salarioNoMes(casa, mes, pessoaId) {
  const reg = registro(casa, mes);
  if (tem(reg?.salarios, pessoaId)) return { valor: reg.salarios[pessoaId], situacao: 'confirmado', deOnde: null };
  const anteriores = ordenados(casa).filter((m) => m.mes < mes);
  for (let k = anteriores.length - 1; k >= 0; k--) {
    if (tem(anteriores[k].salarios, pessoaId)) return { valor: anteriores[k].salarios[pessoaId], situacao: 'a-confirmar', deOnde: anteriores[k].mes };
  }
  return { valor: 0, situacao: 'vazio', deOnde: null };
}

export function resumoDoMes(casa, mes) {
  const contas = [];
  const semValor = [];
  for (const conta of casa.contas) {
    const v = valorDaConta(casa, mes, conta.id);
    if (conta.arquivada) {
      if (v.situacao === 'confirmado' && v.valor !== 0) contas.push({ conta, ...v });
    } else if (v.valor !== 0) {
      contas.push({ conta, ...v });
    } else {
      semValor.push(conta);
    }
  }
  const total = centavos(contas.reduce((s, c) => s + c.valor, 0));
  const salarios = casa.pessoas.map((pessoa) => ({ pessoa, ...salarioNoMes(casa, mes, pessoa.id) }));
  const renda = centavos(salarios.reduce((s, x) => s + x.valor, 0));
  const divide = renda > 0;
  let acumulado = 0;
  const pessoas = salarios.map((s, k) => {
    const base = { pessoa: s.pessoa, salario: s.valor, situacaoSalario: s.situacao, deOnde: s.deOnde };
    if (!divide) return { ...base, fatia: null, paga: null, sobra: null };
    const fatia = s.valor / renda;
    // A última pessoa paga o resto: as partes somam o total exato em centavos.
    const paga = k < salarios.length - 1 ? centavos(total * fatia) : centavos(total - acumulado);
    acumulado += paga;
    return { ...base, fatia, paga, sobra: centavos(s.valor - paga) };
  });
  const aConfirmar = contas.filter((c) => c.situacao === 'a-confirmar').length
    + pessoas.filter((p) => p.situacaoSalario === 'a-confirmar').length;
  return { mes, contas, semValor, total, aConfirmar, renda, divide, fatiaDaRenda: divide ? total / renda : null, pessoas };
}

// ---------- mutações (devolvem uma casa nova) ----------

// Aplica `alterar` ao registro do mês (criado se faltar). Registro que fica vazio sai da lista.
function comMes(casa, mes, alterar) {
  const meses = [...casa.meses];
  const k = meses.findIndex((m) => m.mes === mes);
  const atual = k >= 0 ? structuredClone(meses[k]) : {};
  const reg = { mes, salarios: atual.salarios ?? {}, valores: atual.valores ?? {}, compras: atual.compras ?? [] };
  alterar(reg);
  const vazio = !Object.keys(reg.salarios).length && !Object.keys(reg.valores).length && !reg.compras.length;
  if (k >= 0) {
    if (vazio) meses.splice(k, 1);
    else meses[k] = reg;
  } else if (!vazio) {
    meses.push(reg);
  }
  return { ...casa, meses: ordenados({ meses }) };
}

// Fatura já conferida acompanha a soma das compras.
function acompanharFatura(reg, contaId) {
  if (tem(reg.valores, contaId)) reg.valores[contaId] = soma(comprasDa(reg, contaId));
}

export function salvarValor(casa, { mes, contaId, valor }) {
  return comMes(casa, mes, (reg) => {
    if (valor == null) delete reg.valores[contaId];
    else reg.valores[contaId] = centavos(valor);
  });
}

export function salvarSalario(casa, { mes, pessoaId, valor }) {
  return comMes(casa, mes, (reg) => {
    if (valor == null) delete reg.salarios[pessoaId];
    else reg.salarios[pessoaId] = centavos(valor);
  });
}

export function adicionarCompra(casa, { mes, contaId, nome, valor, vezes = 1, novoId = idPadrao }) {
  const parcelas = Math.max(1, Math.floor(vezes));
  const grupo = parcelas > 1 ? novoId() : null;
  let resultado = casa;
  for (let k = 0; k < parcelas; k++) {
    const compra = { id: novoId(), contaId, nome: nome.trim(), valor: centavos(valor) };
    if (grupo) Object.assign(compra, { grupo, parcela: { n: k + 1, de: parcelas } });
    resultado = comMes(resultado, somarMeses(mes, k), (reg) => {
      reg.compras.push(compra);
      acompanharFatura(reg, contaId);
    });
  }
  return resultado;
}

// Apaga a compra e, se for parcelada, as parcelas seguintes do mesmo grupo.
export function apagarCompra(casa, { mes, compraId }) {
  const alvo = registro(casa, mes)?.compras?.find((c) => c.id === compraId);
  if (!alvo) return casa;
  let resultado = casa;
  for (const reg of casa.meses) {
    if (reg.mes < mes) continue;
    const sai = (reg.compras ?? []).filter((c) => c.id === compraId || (alvo.grupo && c.grupo === alvo.grupo));
    if (!sai.length) continue;
    resultado = comMes(resultado, reg.mes, (r) => {
      r.compras = r.compras.filter((c) => !sai.some((s) => s.id === c.id));
      acompanharFatura(r, alvo.contaId);
    });
  }
  return resultado;
}

// Quantas parcelas de meses seguintes saem junto ao apagar esta compra (para avisar quem apagou).
export function parcelasSeguintes(casa, { mes, compraId }) {
  const alvo = registro(casa, mes)?.compras?.find((c) => c.id === compraId);
  if (!alvo?.grupo) return 0;
  return casa.meses.filter((m) => m.mes > mes).reduce((n, m) => n + (m.compras ?? []).filter((c) => c.grupo === alvo.grupo).length, 0);
}

export function conferirFatura(casa, { mes, contaId }) {
  return comMes(casa, mes, (reg) => { reg.valores[contaId] = soma(comprasDa(reg, contaId)); });
}

export function adicionarConta(casa, { nome, compraPorCompra = false, novoId = idPadrao }) {
  return { ...casa, contas: [...casa.contas, { id: novoId(), nome: nome.trim(), compraPorCompra, arquivada: false }] };
}

// `ativadaEm` ('AAAA-MM'): ao voltar a usar uma conta, a partir de quando ela volta a ser prevista.
export function editarConta(casa, contaId, { nome, compraPorCompra, arquivada, ativadaEm }) {
  const mudanca = Object.fromEntries(Object.entries({ nome: nome?.trim(), compraPorCompra, arquivada, ativadaEm }).filter(([, v]) => v !== undefined));
  return { ...casa, contas: casa.contas.map((c) => (c.id === contaId ? { ...c, ...mudanca } : c)) };
}

// Troca com a vizinha visível (as contas que não usa mais ficam escondidas nos Ajustes).
export function moverConta(casa, contaId, delta) {
  const contas = [...casa.contas];
  const de = contas.findIndex((c) => c.id === contaId);
  const passo = Math.sign(delta);
  let para = de + passo;
  while (para >= 0 && para < contas.length && contas[para].arquivada) para += passo;
  if (de < 0 || !passo || para < 0 || para >= contas.length) return casa;
  [contas[de], contas[para]] = [contas[para], contas[de]];
  return { ...casa, contas };
}

export function renomearPessoa(casa, pessoaId, nome) {
  return { ...casa, pessoas: casa.pessoas.map((p) => (p.id === pessoaId ? { ...p, nome: nome.trim() } : p)) };
}
