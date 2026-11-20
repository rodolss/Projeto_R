// Balanço do mês (desenho 2026-11-20-balanco-do-mes): o que entrou e o que saiu para uma pessoa, no mês em que se
// paga (como no Mês da casa). Entrou: o salário. Saiu: a parte dela nas contas da casa — que já inclui a parte da
// casa dos cartões, dividida pela renda — e o que é dela própria nos cartões dela (a fatura que fecha no mês).
// O que ela passou no cartão para outras pessoas fica à parte e não entra na sobra: volta para ela.
// O cartão de uma pessoa só aparece no balanço dela (como nos perfis).
import { centavos, resumoDoMes } from './casa.js';
import { faturaDoCartao, periodoDaFatura, cartaoPronto } from './cartao.js';
import { somarMeses } from './meses.js';

const somar = (lista) => centavos(lista.reduce((s, x) => s + (x ?? 0), 0));

export function balancoDoMes(casa, mes, pessoaId, hoje) {
  const r = resumoDoMes(casa, mes);
  // Quem não é pessoa da casa (um perfil novo) não divide as contas: sem salário nem parte das contas.
  const daCasa = r.pessoas.find((p) => p.pessoa.id === pessoaId) ?? null;
  const salario = daCasa && { valor: daCasa.salario, situacao: daCasa.situacaoSalario, deOnde: daCasa.deOnde };
  const contas = daCasa && {
    valor: daCasa.paga, // null sem divisão (salários vazios)
    total: r.total,
    fatia: r.fatiaDaRenda,
    // A parte de cada um depende dos dois salários: um salário ainda a confirmar também pode mudá-la.
    aConfirmar: r.contas.some((c) => c.situacao === 'a-confirmar') || r.pessoas.some((p) => p.situacaoSalario !== 'confirmado'),
  };
  const cartoes = (casa.cartoes ?? []).filter((c) => c.donaId === pessoaId).map((cartao) => {
    // A fatura que FECHA no mês (as compras do mês): com o vencimento antes do melhor dia (vira 24, vence 1), ela
    // vence no começo do mês seguinte e é paga com o dinheiro deste. Sem os dias: a fatura do próprio mês.
    const pronto = cartaoPronto(cartao);
    const fatura = pronto && cartao.venceNoDia < cartao.viraNoDia ? somarMeses(mes, 1) : mes;
    const periodo = pronto ? periodoDaFatura(fatura, cartao) : null;
    const f = faturaDoCartao(casa, cartao.id, fatura);
    const de = (filtro) => f.porPessoa.filter(filtro);
    const outras = de((p) => p.para !== 'casa' && p.para !== pessoaId);
    return {
      cartaoId: cartao.id,
      nome: casa.contas.find((c) => c.id === cartao.contaId)?.nome ?? 'Cartão',
      fatura,
      vence: periodo?.vence ?? null,
      seu: somar(de((p) => p.para === pessoaId).map((p) => p.valor)),
      daCasa: somar(de((p) => p.para === 'casa').map((p) => p.valor)),
      outras: { valor: somar(outras.map((p) => p.valor)), jaTenho: somar(outras.map((p) => p.jaTenho)), falta: somar(outras.map((p) => p.falta)) },
      // Ainda dá para entrar compra nesta fatura.
      aberta: Boolean(periodo) && hoje <= periodo.ate,
      conferida: f.conferida,
    };
  });
  const entrou = centavos(salario?.valor ?? 0);
  const saiu = somar([contas?.valor, ...cartoes.map((c) => c.seu)]);
  const previsao = Boolean((salario && salario.situacao !== 'confirmado') || contas?.aConfirmar || cartoes.some((c) => c.aberta));
  return { mes, pessoaId, salario, contas, cartoes, entrou, saiu, sobra: centavos(entrou - saiu), previsao };
}
