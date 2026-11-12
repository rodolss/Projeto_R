// Rotas por hash (#/inicio, #/mes, ...) e qual botão do menu fica aceso em cada uma (spec v2 §5.1).
export const TELAS = ['boas-vindas', 'inicio', 'mes', 'simular', 'mais', 'orcamento', 'historico', 'config'];
const ABAS = { inicio: 'inicio', mes: 'mes', simular: 'simular', mais: 'mais', orcamento: 'mais', historico: 'mais', config: 'mais' };

// Sem dados ainda, tudo leva ao assistente; o antigo #/painel e rotas desconhecidas levam ao Início.
export function resolverRota(hash, temEstado) {
  if (!temEstado) return 'boas-vindas';
  const rota = String(hash ?? '').replace(/^#\/?/, '').split('?')[0];
  return TELAS.includes(rota) ? rota : 'inicio';
}

export const abaDoMenu = (rota) => ABAS[rota] ?? null;

// Folha por baixo aberta na tela: #/mes?folha=salario → 'salario'. Abrir cria uma entrada no histórico,
// então o botão voltar (no app Android, web.goBack) fecha a folha sem trocar de tela.
export function folhaAberta(hash) {
  const consulta = String(hash ?? '').split('?')[1] ?? '';
  return new URLSearchParams(consulta).get('folha') || null;
}

// Depois de um salvamento demorado (GitHub), a pessoa pode ter fechado a folha ou mudado de tela:
// só fecha a folha se ela ainda está aberta; no Mês sem ela, redesenha; em outra tela, não mexe.
export function depoisDeSalvar(hash, folha) {
  if (folhaAberta(hash) === folha) return 'fechar';
  return resolverRota(hash, true) === 'mes' ? 'redesenhar' : 'nada';
}
