// Balanço do mês (desenho 2026-11-20-balanco-do-mes): o que entrou e o que saiu para uma pessoa no mês. Salário e
// contas da casa: os do mês em que se paga (como no Mês da casa). Entrou: o salário. Saiu: a parte dela nas contas da casa — que já inclui a parte da
// casa dos cartões, dividida pela renda — e o que é dela própria nos cartões dela (a fatura do mês: a que vence nele e se paga com o salário dele).
// O que ela passou no cartão para outras pessoas fica à parte e não entra na sobra: volta para ela.
// O cartão de uma pessoa só aparece no balanço dela (como nos perfis).
import { centavos, resumoDoMes } from './casa.js';
import { faturaDoCartao, periodoDaFatura, cartaoPronto } from './cartao.js';
import { extraDoMes } from './salario.js';

const somar = (lista) => centavos(lista.reduce((s, x) => s + (x ?? 0), 0));

export function balancoDoMes(casa, mes, pessoaId, hoje) {
  const r = resumoDoMes(casa, mes);
  // Quem não é pessoa da casa (um perfil novo) não divide as contas: sem salário nem parte das contas.
  const daCasa = r.pessoas.find((p) => p.pessoa.id === pessoaId) ?? null;
  // O a mais do mês (13º, férias, PLR: desenho 2026-11-21-salario-no-balanco) entra no que entrou, sem mudar a divisão.
  const salario = daCasa && { valor: daCasa.salario, situacao: daCasa.situacaoSalario, deOnde: daCasa.deOnde, extra: extraDoMes(casa, mes, pessoaId) };
  const contas = daCasa && {
    valor: daCasa.paga, // null sem divisão (salários vazios)
    total: r.total,
    fatia: r.fatiaDaRenda,
    // A parte de cada um depende dos dois salários: um salário ainda a confirmar também pode mudá-la.
    aConfirmar: r.contas.some((c) => c.situacao === 'a-confirmar') || r.pessoas.some((p) => p.situacaoSalario !== 'confirmado'),
  };
  const cartoes = (casa.cartoes ?? []).filter((c) => c.donaId === pessoaId).map((cartao) => {
    // A fatura do mês é a que se paga com o salário do mês (a de dezembro, com o de dezembro), a mesma do Cartão.
    const pronto = cartaoPronto(cartao);
    const fatura = mes;
    const periodo = pronto ? periodoDaFatura(fatura, cartao) : null;
    const f = faturaDoCartao(casa, cartao.id, fatura);
    const de = (filtro) => f.porPessoa.filter(filtro);
    const outras = de((p) => p.para !== 'casa' && p.para !== pessoaId);
    return {
      cartaoId: cartao.id,
      nome: casa.contas.find((c) => c.id === cartao.contaId)?.nome ?? 'Cartão',
      fatura,
      vence: periodo?.vence ?? null,
      // O que é dela na fatura, já sem o que ela já tem guardado ("já tenho" também vale nas compras da dona do cartão).
      seu: somar(de((p) => p.para === pessoaId).map((p) => p.falta ?? p.valor)),
      seuJaTenho: somar(de((p) => p.para === pessoaId).map((p) => p.jaTenho)),
      daCasa: somar(de((p) => p.para === 'casa').map((p) => p.valor)),
      outras: { valor: somar(outras.map((p) => p.valor)), jaTenho: somar(outras.map((p) => p.jaTenho)), falta: somar(outras.map((p) => p.falta)) },
      adiantado: somar(outras.map((p) => p.falta)),
      // Ainda dá para entrar compra nesta fatura.
      aberta: Boolean(periodo) && hoje <= periodo.ate,
      conferida: f.conferida,
    };
  });
  const entrou = centavos((salario?.valor ?? 0) + (salario?.extra ?? 0));
  // Você paga a fatura inteira: o que já está no cofrinho ("já tenho") não pesa; o que ainda falta as pessoas devolverem
  // conta como saída até chegar (`adiantado`).
  const saiu = somar([contas?.valor, ...cartoes.map((c) => c.seu + c.adiantado)]);
  const previsao = Boolean((salario && salario.situacao !== 'confirmado') || contas?.aConfirmar || cartoes.some((c) => c.aberta));
  return { mes, pessoaId, salario, contas, cartoes, entrou, saiu, sobra: centavos(entrou - saiu), previsao };
}

// ---------- balanço e plano (desenho 2026-11-20-balanco-e-plano) ----------
// A sobra do mês contra o que o plano pede por mês (o necessário para chegar no alvo, contando a reserva que falta).
// O que se compara é o que vai ser investido (a sobra menos o lazer: desenho 2026-11-20-investir-a-sobra). Sem
// salário ou sem divisão (`completo` falso): sem veredito. `registrado` fica para quem quiser dizer "já investiu".
export function compararComPlano({ sobra, pmtNec, completo = true, registrado = false }) {
  if (registrado) return { situacao: 'registrado', falta: 0, livre: 0 };
  if (!completo) return { situacao: 'incompleto', falta: 0, livre: 0 };
  if (!Number.isFinite(pmtNec)) return { situacao: 'sem-plano', falta: 0, livre: 0 };
  if (sobra <= 0) return { situacao: 'vermelho', falta: centavos(Math.max(0, pmtNec)), livre: 0 };
  if (pmtNec <= 0) return { situacao: 'sem-aporte', falta: 0, livre: centavos(sobra) };
  if (sobra >= pmtNec) return { situacao: 'cobre', falta: 0, livre: centavos(sobra - pmtNec) };
  return { situacao: 'falta', falta: centavos(pmtNec - sobra), livre: 0 };
}

// O balanço tem o que precisa para um veredito: salário preenchido e as contas divididas.
export const dadosCompletos = (b) => Boolean(b?.salario && b.salario.situacao !== 'vazio' && b.contas && b.contas.valor != null);

// ---------- investir a sobra (desenho 2026-11-20-investir-a-sobra) ----------
// Quem administra investe só o que sobrou no mês, separando uma parte para lazer.
export const LAZER = 0.1;
export function divisaoDaSobra(sobra, lazerPct = LAZER) {
  const base = centavos(Math.max(0, sobra));
  const lazer = centavos(base * lazerPct);
  return { sobra: base, lazer, investir: centavos(base - lazer) };
}
