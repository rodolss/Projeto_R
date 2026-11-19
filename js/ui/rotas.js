// Rotas por hash (#/inicio, #/mes, ...) e qual botão do menu fica aceso em cada uma (spec v2 §5.1).
// Dois espaços: a aposentadoria e as contas da casa (desenho de 2026-11-19), cada um com o seu menu.
export const TELAS = ['boas-vindas', 'inicio', 'mes', 'simular', 'mais', 'orcamento', 'historico', 'config', 'casa', 'casa-ano', 'casa-ajustes'];
const ABAS = {
  inicio: 'inicio', mes: 'mes', simular: 'simular', mais: 'mais', orcamento: 'mais', historico: 'mais', config: 'mais',
  casa: 'casa', 'casa-ano': 'casa-ano', 'casa-ajustes': 'casa-ajustes',
};

export const ehDaCasa = (rota) => String(rota ?? '').startsWith('casa');

// As contas da casa funcionam sem plano de aposentadoria; o resto, sem plano, leva ao assistente.
// Sem rota (ou rota desconhecida), abre no último espaço usado neste aparelho.
export function resolverRota(hash, temEstado, espaco = 'aposentadoria') {
  const rota = String(hash ?? '').replace(/^#\/?/, '').split('?')[0];
  if (TELAS.includes(rota) && ehDaCasa(rota)) return rota;
  if (!TELAS.includes(rota) && espaco === 'casa') return 'casa';
  if (!temEstado) return 'boas-vindas';
  return TELAS.includes(rota) ? rota : 'inicio';
}

export const abaDoMenu = (rota) => ABAS[rota] ?? null;

export function parametroDoHash(hash, nome) {
  const consulta = String(hash ?? '').split('?')[1] ?? '';
  return new URLSearchParams(consulta).get(nome) || null;
}

// Folha por baixo aberta na tela: #/mes?folha=salario → 'salario'. Abrir cria uma entrada no histórico,
// então o botão voltar (no app Android, web.goBack) fecha a folha sem trocar de tela.
export const folhaAberta = (hash) => parametroDoHash(hash, 'folha');

// Depois de um salvamento demorado (GitHub), a pessoa pode ter fechado a folha ou mudado de tela:
// só fecha a folha se ela ainda está aberta; na mesma tela sem ela, redesenha; em outra tela, não mexe.
export function depoisDeSalvar(hash, folha, tela = 'mes') {
  if (folhaAberta(hash) === folha) return 'fechar';
  return resolverRota(hash, true) === tela ? 'redesenhar' : 'nada';
}
