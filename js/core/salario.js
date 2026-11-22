// Salário só no Balanço (desenho 2026-11-21-salario-no-balanco): para quem administra (visão única), o salário se
// digita num lugar só — Balanço › Entrou › Salário — e os outros lugares (Dia de pagamento, Mês da casa, Ajustes do
// planejador) só mostram. O "a mais" do mês (13º, 1/3 das férias, PLR, bônus) fica à parte, em `casa.extras`, fora
// de `meses` (um app antigo que regrava o mês não o apaga): não muda a divisão das contas, mas entra na sobra.
import { centavos, salvarSalario, salarioNoMes } from './casa.js';

export const extraDoMes = (casa, mes, pessoaId) => casa?.extras?.[mes]?.[pessoaId] ?? 0;

// Grava o salário do mês (null: volta à previsão) e o a mais (0 ou null: nada guardado; mapas vazios saem).
export function definirSalario(casa, { mes, pessoaId, salario, extra }) {
  const comSalario = salvarSalario(casa, { mes, pessoaId, valor: salario });
  const { [mes]: doMes = {}, ...outrosMeses } = comSalario.extras ?? {};
  const { [pessoaId]: _antes, ...outrasPessoas } = doMes;
  const novoDoMes = extra > 0 ? { ...outrasPessoas, [pessoaId]: centavos(extra) } : outrasPessoas;
  const extras = Object.keys(novoDoMes).length ? { ...outrosMeses, [mes]: novoDoMes } : outrosMeses;
  const { extras: _velhos, ...semExtras } = comSalario;
  return Object.keys(extras).length ? { ...semExtras, extras } : semExtras;
}

// O salário do plano é sempre o salário do último mês confirmado até hoje (revisão do desenho): um mês futuro não
// mexe, um mês menor seguido de um normal volta ao normal, tirar um mês volta ao anterior — e, por ser calculado e
// não acumulado, nada trava. Mesmo valor num mês mais novo também anda o mês (a correção pela inflação parte dele).
// O a mais nunca entra aqui. Sem nenhum salário confirmado, ou já em dia: o mesmo objeto.
export function salarioDoPlanoPelaCasa(config, { casa, pessoaId, hoje }) {
  const ate = hoje.slice(0, 7);
  const ultimo = (casa?.meses ?? [])
    .filter((m) => m.mes <= ate && m.salarios?.[pessoaId] > 0)
    .reduce((a, m) => (!a || m.mes > a.mes ? m : a), null);
  if (!ultimo) return config;
  const salario = ultimo.salarios[pessoaId];
  if (salario === config.salario && ultimo.mes === config.mesSalario) return config;
  return { ...config, salario, mesSalario: ultimo.mes };
}

// O rascunho do Dia de pagamento com o salário do Balanço: na visão única a etapa do salário não aparece (sempre
// feita). O que caiu é o salário + o a mais do Balanço; ainda não confirmado, a previsão; sem nada na casa, o salário
// do plano. Pela sobra ele não muda o quanto investir (é a sobra do Balanço do mês); fica gravado no registro.
export function rascunhoComBalanco(base, dia, salarioDoPlano = null) {
  return { ...base, recebido: dia.recebido ?? salarioDoPlano, tipoExtra: null, feito: { ...base.feito, salario: true } };
}

// O que o Dia de pagamento mostra (só leitura): o salário do mês e o a mais, do Balanço. Pronto só com o salário do
// mês confirmado (previsão não conta: falta digitar no Balanço).
export function salarioParaODia({ casa, mes, pessoaId }) {
  const s = salarioNoMes(casa, mes, pessoaId);
  const extra = extraDoMes(casa, mes, pessoaId);
  const salario = s.situacao === 'vazio' ? null : s.valor;
  return { pronto: s.situacao === 'confirmado', salario, extra, recebido: salario == null ? null : centavos(salario + extra) };
}
