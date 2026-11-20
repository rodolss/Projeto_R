// Rotas por hash (#/inicio, #/mes, ...) e qual botão do menu fica aceso em cada uma (spec v2 §5.1).
// Dois espaços: a aposentadoria e as contas da casa (desenho de 2026-11-19), cada um com o seu menu.
export const TELAS = ['boas-vindas', 'inicio', 'mes', 'simular', 'mais', 'orcamento', 'historico', 'config', 'casa', 'casa-balanco', 'casa-cartao', 'casa-ano', 'casa-ajustes'];
const ABAS = {
  inicio: 'inicio', mes: 'mes', simular: 'simular', mais: 'mais', orcamento: 'mais', historico: 'mais', config: 'mais',
  casa: 'casa', 'casa-balanco': 'casa-balanco', 'casa-cartao': 'casa-cartao', 'casa-ano': 'casa-ano', 'casa-ajustes': 'casa-ajustes',
};

// Visão única (desenho 2026-11-20-visao-unica): para quem administra, vendo o próprio perfil, com o planejador, um
// menu só — Balanço · Contas · Cartão · Plano · Mais. Os outros (a outra pessoa, aparelho sem perfil, quem
// administra vendo outro perfil) continuam com os dois espaços.
export const visaoUnica = ({ visto, temEstado }) => Boolean(visto?.admin) && Boolean(temEstado);
// A foto do perfil (trocar de perfil): nas telas da casa e, na visão única, em todas — nunca no assistente, onde
// trocar de perfil perderia o que foi preenchido.
export const mostraTopo = ({ nome, daCasa, unica }) => nome !== 'boas-vindas' && Boolean(daCasa || unica);
const ABAS_UNICA = {
  'casa-balanco': 'casa-balanco', casa: 'casa', 'casa-cartao': 'casa-cartao',
  inicio: 'inicio', mes: 'inicio', // o Plano (a rotina do mês da aposentadoria abre pelo Início e pelos lembretes)
  simular: 'mais', mais: 'mais', orcamento: 'mais', historico: 'mais', config: 'mais', 'casa-ano': 'mais', 'casa-ajustes': 'mais',
};

// Telas da casa que o aparelho lembra para abrir da próxima vez.
export const LEMBRADAS = ['casa', 'casa-balanco', 'casa-cartao'];

export const ehDaCasa = (rota) => String(rota ?? '').startsWith('casa');

// As contas da casa funcionam sem plano de aposentadoria; o resto, sem plano, leva ao assistente.
// Sem rota (ou rota desconhecida), abre no último espaço usado neste aparelho (na casa: o Balanço, o Mês ou o Cartão).
export function resolverRota(hash, temEstado, espaco = 'aposentadoria') {
  const rota = String(hash ?? '').replace(/^#\/?/, '').split('?')[0];
  if (TELAS.includes(rota) && ehDaCasa(rota)) return rota;
  if (!TELAS.includes(rota) && ehDaCasa(espaco)) return LEMBRADAS.includes(espaco) ? espaco : 'casa';
  if (!temEstado) return 'boas-vindas';
  return TELAS.includes(rota) ? rota : 'inicio';
}

export const abaDoMenu = (rota, unica = false) => (unica ? ABAS_UNICA : ABAS)[rota] ?? null;

// O que o aparelho lembra para abrir da próxima vez: na casa, a última tela entre Balanço, Mês e Cartão.
export function espacoParaLembrar(rota, anterior) {
  if (!ehDaCasa(rota)) return 'aposentadoria';
  if (LEMBRADAS.includes(rota)) return rota;
  return ehDaCasa(anterior) ? anterior : 'casa';
}

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

// Dados de outro aparelho só redesenham a tela da casa se ninguém estiver digitando nem com uma folha aberta:
// a folha guarda o que foi digitado só na memória até "Salvar".
export const podeAtualizarSozinho = (hash, digitando) => !digitando && !folhaAberta(hash);
