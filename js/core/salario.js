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

// O salário do plano acompanha o salário do mês digitado no Balanço, do último mês já usado em diante (um mês antigo
// corrigido não muda o plano). O a mais nunca entra aqui.
export function salarioDoPlanoDepois(config, { mes, salario }) {
  if (salario == null || salario === config.salario || mes < (config.mesSalario ?? '')) return config;
  return { ...config, salario, mesSalario: mes };
}

// O que o Dia de pagamento mostra (só leitura): o salário do mês e o a mais, do Balanço. Pronto só com o salário do
// mês confirmado (previsão não conta: falta digitar no Balanço).
export function salarioParaODia({ casa, mes, pessoaId }) {
  const s = salarioNoMes(casa, mes, pessoaId);
  const extra = extraDoMes(casa, mes, pessoaId);
  const salario = s.situacao === 'vazio' ? null : s.valor;
  return { pronto: s.situacao === 'confirmado', salario, extra, recebido: salario == null ? null : centavos(salario + extra) };
}
