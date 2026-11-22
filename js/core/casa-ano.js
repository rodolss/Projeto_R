// Resumo do ano das contas da casa (o quadro da direita da planilha, sem os defeitos dela): só meses até
// o mês atual, médias por pessoa só nos meses que dividem e peso de cada conta sobre o total de todas.
import { centavos, primeiroMes, resumoDoMes, divideNoMes } from './casa.js';
import { somarMeses } from './meses.js';

const media = (soma, n) => (n ? centavos(soma / n) : null);

export function resumoDoAno(casa, ano, mesAtual) {
  const primeiro = primeiroMes(casa);
  const inicio = primeiro && primeiro > `${ano}-01` ? primeiro : `${ano}-01`;
  const fim = mesAtual < `${ano}-12` ? mesAtual : `${ano}-12`;
  const resumos = [];
  if (primeiro && inicio <= fim) {
    for (let mes = inicio; mes <= fim; mes = somarMeses(mes, 1)) resumos.push(resumoDoMes(casa, mes));
  }

  const meses = resumos.map((r) => ({
    mes: r.mes, total: r.total, renda: r.renda, divide: r.divide,
    pessoas: r.pessoas.map((p) => ({ pessoaId: p.pessoa.id, salario: p.salario, paga: p.paga, sobra: p.sobra })),
  }));
  const total = centavos(resumos.reduce((s, r) => s + r.total, 0));
  const dividem = resumos.filter((r) => r.divide);
  const totalQueDivide = dividem.reduce((s, r) => s + r.total, 0);
  const renda = centavos(dividem.reduce((s, r) => s + r.renda, 0));

  // Cada pessoa pelo id (quem entra ou sai da divisão muda as posições): só quem dividiu em algum mês do ano.
  const noMes = (r, pessoa) => r.pessoas.find((x) => x.pessoa.id === pessoa.id);
  const doAno = casa.pessoas.filter((p) => (resumos.length ? resumos.some((r) => noMes(r, p)) : divideNoMes(p, fim)));
  const pessoas = doAno.map((pessoa) => {
    const daPessoa = dividem.map((r) => noMes(r, pessoa)).filter(Boolean);
    const totalPago = centavos(daPessoa.reduce((s, p) => s + p.paga, 0));
    return {
      pessoa,
      totalPago,
      mediaPaga: media(totalPago, daPessoa.length),
      mediaSobra: media(daPessoa.reduce((s, p) => s + p.sobra, 0), daPessoa.length),
      mediaSalario: media(daPessoa.reduce((s, p) => s + p.salario, 0), daPessoa.length),
    };
  });

  const porId = new Map();
  for (const r of resumos) {
    for (const c of r.contas) porId.set(c.conta.id, { conta: c.conta, total: (porId.get(c.conta.id)?.total ?? 0) + c.valor });
  }
  const porConta = [...porId.values()]
    .map((x) => ({ conta: x.conta, total: centavos(x.total), peso: total ? x.total / total : 0 }))
    .filter((x) => x.total !== 0)
    .sort((a, b) => b.total - a.total);

  return {
    ano,
    ate: resumos.at(-1)?.mes ?? null,
    meses,
    total,
    mediaMensal: media(total, resumos.length) ?? 0,
    renda,
    // Só os meses que dividem: conta sem salário no mesmo mês não infla a fatia (defeito da planilha).
    fatiaDaRenda: renda > 0 ? totalQueDivide / renda : null,
    pessoas,
    porConta,
  };
}

export function anosDisponiveis(casa, mesAtual) {
  const atual = Number(mesAtual.slice(0, 4));
  const primeiro = primeiroMes(casa);
  const inicio = primeiro ? Math.min(Number(primeiro.slice(0, 4)), atual) : atual;
  return Array.from({ length: atual - inicio + 1 }, (_, k) => inicio + k);
}
