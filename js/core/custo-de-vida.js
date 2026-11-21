// Custo de vida pelo Balanço (desenho 2026-11-21-planejador-integrado): na visão única, o custo de vida do plano (a meta
// de independência e a reserva de emergência) é o que de fato saiu nos últimos meses fechados — a sua parte das contas
// da casa e o que é seu no cartão — e não mais as categorias digitadas no Orçamento.
import { balancoDoMes, dadosCompletos } from './balanco.js';
import { centavos } from './casa.js';
import { somarMeses } from './meses.js';

export const ID_GASTO_REAL = 'gasto-real';
export const MESES_DO_CUSTO = 6;

// O que é seu no cartão num mês: inclusive o que já tinha guardado ("já tenho"). O que outras pessoas ainda vão
// devolver não é custo seu (no Balanço ele conta como saída até voltar).
const seuNoCartao = (b) => centavos(b.cartoes.reduce((s, k) => s + k.seu + k.seuJaTenho, 0));

// A média dos últimos `n` meses fechados antes do mês de `hoje` (sem previsão e com os salários da divisão), e cada
// mês, do mais antigo ao mais novo. Nenhum mês fechado: null.
export function custoDeVidaReal(casa, pessoaId, hoje, n = MESES_DO_CUSTO) {
  if (!casa || !pessoaId) return null;
  const mesAtual = hoje.slice(0, 7);
  const meses = [];
  for (let k = n; k >= 1; k--) {
    const mes = somarMeses(mesAtual, -k);
    const b = balancoDoMes(casa, mes, pessoaId, hoje);
    if (b.previsao || !dadosCompletos(b)) continue;
    const contas = centavos(b.contas.valor);
    const cartao = seuNoCartao(b);
    meses.push({ mes, contas, cartao, valor: centavos(contas + cartao) });
  }
  if (!meses.length) return null;
  const media = (campo) => centavos(meses.reduce((s, m) => s + m[campo], 0) / meses.length);
  return { media: media('valor'), contas: media('contas'), cartao: media('cartao'), meses };
}

// O orçamento do plano vira o gasto real (um item mensal, do mês de hoje) e a revisão fica em dia. As categorias
// digitadas antes ficam guardadas em `orcamentoManual`. Sem mês fechado ou já em dia: o mesmo objeto.
export function orcamentoPelaCasa(estado, { casa, pessoaId, hoje }) {
  const real = custoDeVidaReal(casa, pessoaId, hoje);
  if (!real) return estado;
  const mes = hoje.slice(0, 7);
  const [unico, ...resto] = estado.orcamento;
  const emDia = !resto.length && unico?.id === ID_GASTO_REAL && unico.valor === real.media && unico.mes === mes
    && estado.config.ultimaRevisaoOrcamento === mes;
  if (emDia) return estado;
  const jaEraReal = estado.orcamento.some((c) => c.id === ID_GASTO_REAL);
  const manual = jaEraReal ? estado.orcamentoManual : estado.orcamento;
  return {
    ...estado,
    orcamento: [{ id: ID_GASTO_REAL, nome: 'Gasto real (média do Balanço)', tipo: 'mensal', valor: real.media, mes }],
    ...(manual ? { orcamentoManual: manual } : {}),
    config: { ...estado.config, ultimaRevisaoOrcamento: mes },
  };
}
