// Inicialização, roteador por hash e contexto compartilhado entre as telas.
// Dois espaços com dados próprios: a aposentadoria (dados.json) e as contas da casa (casa.json).
import { criarArmazem } from './dados/armazem.js';
import { criarClienteGitHub, donoPadrao } from './dados/github.js';
import { buscarSerieIpca, precisaAtualizarIpca } from './dados/ipca-remoto.js';
import { mesclarCasa } from './dados/mesclar-casa.js';
import { migrarCasa } from './core/casa.js';
import { dataISO, somarMeses } from './core/meses.js';
import { h, cartao, aviso, textoConexao, esconderFolha } from './ui/dom.js';
import { resolverRota, abaDoMenu, ehDaCasa, podeAtualizarSozinho, espacoParaLembrar, LEMBRADAS, visaoUnica } from './ui/rotas.js';
import { escalonar } from './ui/movimento.js';
import { noApp, reagendar, lerConfig, agoraLocal, enviarAoApp } from './ui/nativo.js';
import { iniciarAtualizacao } from './ui/atualizacao.js';
import { VERSAO } from './versao.js';
import {
  impressaoDaChave, perfilDoMomento as calcularPerfil, vincularAparelho, levarLigacao, desvioDaTela,
} from './core/perfis.js';
import { desenharTopo, telaQuemUsa } from './ui/topo.js';

const CHAVE_TOKEN = 'projetoR.token';
const CHAVE_DONO = 'projetoR.dono';
const CHAVE_ESPACO = 'projetoR.espaco'; // 'casa' | 'casa-balanco' | 'casa-cartao' | 'aposentadoria': o app abre no último espaço usado
const CHAVE_USOU_APOSENTADORIA = 'projetoR.usouAposentadoria';
const CHAVE_PERFIL_VISTO = 'projetoR.perfilVisto'; // quem administra: o perfil que está vendo neste aparelho
const CHAVE_PERFIL_PROPRIO = 'projetoR.perfilProprio'; // o perfil deste aparelho, guardado: sem chave, continua nele
const app = {
  estado: null, armazem: null, conexao: null, sincronizado: false,
  casa: null, armazemCasa: null, casaSincronizada: false, erroCasa: null,
  impressao: null, // impressão da chave do GitHub deste aparelho (perfis); nunca a chave
};
// Leitura do casa.json que deu certo (ou juntou com outro aparelho). Qualquer outro aviso é falha de leitura.
const leituraOk = (aviso) => !aviso || aviso === 'conflito-resolvido';
// Quem precisa dos dados já sincronizados (a comemoração de marcos) espera aqui (spec v2 §4.7).
const esperandoSincronizar = [];
function quandoSincronizado(fn) {
  if (app.sincronizado) fn(app.estado);
  else esperandoSincronizar.push(fn);
}
const fetchGlobal = (...args) => globalThis.fetch(...args);

function lerLocal(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravarLocal(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: só não lembra */ }
}
const lerEspaco = () => {
  const espaco = lerLocal(CHAVE_ESPACO);
  return LEMBRADAS.includes(espaco) ? espaco : 'aposentadoria';
};

function lerConexao() {
  const token = localStorage.getItem(CHAVE_TOKEN);
  const dono = localStorage.getItem(CHAVE_DONO) || donoPadrao(location.hostname);
  return token && dono ? { token, dono } : null;
}

function montarArmazem() {
  app.conexao = lerConexao();
  const cliente = (caminho) => (app.conexao ? criarClienteGitHub({ ...app.conexao, caminho, fetch: fetchGlobal }) : null);
  app.armazem = criarArmazem({ armazenamento: localStorage, cliente: cliente('dados.json') });
  app.armazemCasa = criarArmazem({
    armazenamento: localStorage, cliente: cliente('casa.json'), prefixo: 'projetoR.casa', migrar: migrarCasa, mesclar: mesclarCasa,
  });
}

export function mostrarAviso(texto, nivel = 'info', duracao = 7000) {
  const caixa = document.getElementById('avisos');
  const el = aviso(nivel, texto);
  caixa.append(el);
  if (duracao) setTimeout(() => el.remove(), duracao);
}
const avisoDeConexao = (codigo) => mostrarAviso(textoConexao(codigo), codigo === 'conflito-resolvido' ? 'info' : 'atencao');

// No app Android, a agenda dos lembretes acompanha os dados: registrar o mês tira os lembretes dele.
// Só nos aparelhos que usam a aposentadoria: o celular de quem só vê as contas da casa não recebe lembretes.
function reagendarLembretes() {
  if (!noApp() || !app.estado || !lerLocal(CHAVE_USOU_APOSENTADORIA)) return;
  try {
    reagendar({ estado: app.estado, config: lerConfig(), agora: agoraLocal(), enviar: enviarAoApp() });
  } catch (erro) {
    console.warn('Não reagendei os lembretes', erro);
  }
}

async function salvar(mutacao) {
  const r = await app.armazem.salvar(mutacao);
  app.estado = r.estado;
  reagendarLembretes();
  if (r.aviso) avisoDeConexao(r.aviso);
  return r;
}

async function salvarCasa(mutacao) {
  const r = await app.armazemCasa.salvar(mutacao);
  app.casa = r.estado;
  if (r.aviso) avisoDeConexao(r.aviso);
  return r;
}

async function atualizarImpressao() {
  try {
    app.impressao = app.conexao ? await impressaoDaChave(app.conexao.token) : null;
  } catch (erro) {
    console.warn('Sem impressão da chave', erro);
    app.impressao = null;
  }
}

const lerProprio = () => { try { return JSON.parse(lerLocal(CHAVE_PERFIL_PROPRIO) ?? 'null'); } catch { return null; } };

// Perfis (desenho 2026-11-20-perfis). Pela chave quando dá; sem ela, o perfil que este aparelho já tinha
// (uma troca de chave que falhou ou a casa carregando nunca mostram tudo). Nunca teve perfil: como antes.
function perfilDoMomento() {
  const r = calcularPerfil({
    casa: app.casa, conectado: Boolean(app.conexao), impressao: app.impressao, salvo: lerProprio(), escolhido: lerLocal(CHAVE_PERFIL_VISTO),
  });
  if (app.conexao && app.impressao && r.vinculado && !r.precisaEscolher) {
    const { id, nome, admin } = r.vinculado;
    gravarLocal(CHAVE_PERFIL_PROPRIO, JSON.stringify({ id, nome, admin: Boolean(admin) }));
  }
  return r;
}

async function conectar({ token, dono }) {
  const impressaoAntiga = app.impressao;
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_DONO, dono);
  montarArmazem();
  await atualizarImpressao();
  const [r, rCasa] = await Promise.all([app.armazem.carregar(), app.armazemCasa.carregar()]);
  if (r.estado) app.estado = r.estado;
  if (rCasa.estado) app.casa = rCasa.estado;
  app.sincronizado = true;
  app.erroCasa = leituraOk(rCasa.aviso) ? null : rCasa.aviso;
  app.casaSincronizada = !app.erroCasa;
  for (const fn of esperandoSincronizar.splice(0)) fn(app.estado);
  // Chave trocada (renovada): a nova herda o perfil deste aparelho, sem perguntar de novo.
  if (!app.erroCasa && app.casa?.perfis?.length) {
    const levada = levarLigacao(app.casa, { antiga: impressaoAntiga, nova: app.impressao, salvoId: lerProprio()?.id, hoje: dataISO(new Date()) });
    if (levada !== app.casa) await salvarCasa(() => levada);
  }
  return { ...r, casa: rCasa };
}

// `voltarPara`: a conexão de antes (troca de chave que falhou): volta a ela em vez de ficar sem chave.
async function desconectar(voltarPara = null) {
  if (voltarPara?.token && voltarPara.dono) {
    localStorage.setItem(CHAVE_TOKEN, voltarPara.token);
    localStorage.setItem(CHAVE_DONO, voltarPara.dono);
  } else {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_DONO);
  }
  montarArmazem();
  await atualizarImpressao();
}

const navegar = (hash) => { location.hash = hash; };
let telaDesenhada = null; // a última tela desenhada por inteiro
let geracaoDoDesenho = 0; // cada desenho ganha um número: um desenho velho que termina depois de um novo é descartado
let mostrandoEscolha = false; // "Quem usa este celular?" na tela: dados novos (a liberação) redesenham

function contexto() {
  return {
    estado: app.estado,
    hoje: dataISO(new Date()),
    salvar,
    navegar,
    aviso: mostrarAviso,
    conexao: app.conexao,
    conectar,
    desconectar,
    fetch: fetchGlobal,
    donoSugerido: donoPadrao(location.hostname),
    rerender: () => renderizar(),
    sincronizado: app.sincronizado,
    quandoSincronizado,
    casa: app.casa,
    // Visão única (desenho 2026-11-20-visao-unica): o Mais e os Ajustes da casa mudam um pouco nela.
    unica: visaoUnica({ visto: perfilDoMomento().visto, temEstado: Boolean(app.estado) }),
    salvarCasa,
    casaSincronizada: app.casaSincronizada,
    erroCasa: app.erroCasa,
    tentarCasaDeNovo: async () => { await sincronizarCasaAoAbrir(); renderizar(); },
    perfil: {
      ...perfilDoMomento(),
      impressao: app.impressao,
      // Quem administra: muda o perfil visto (só neste aparelho). A tela fica como a da outra pessoa.
      trocar: (id) => { gravarLocal(CHAVE_PERFIL_VISTO, id); renderizar(); },
      // Uma vez por chave: liga este aparelho a um perfil.
      vincular: async (perfilId) => {
        if (!app.impressao) { mostrarAviso('Este aparelho não consegue ler a chave. Abra pelo app ou pelo site com https.', 'atencao'); return; }
        await salvarCasa((c) => vincularAparelho(c, { impressao: app.impressao, perfilId, hoje: dataISO(new Date()) }));
        gravarLocal(CHAVE_PERFIL_VISTO, perfilId);
        renderizar();
      },
    },
  };
}

async function renderizar() {
  const geracao = ++geracaoDoDesenho;
  const nome = resolverRota(location.hash, Boolean(app.estado), lerEspaco());
  if (location.hash.replace(/^#\/?/, '').split('?')[0] !== nome) { navegar(`#/${nome}`); return; }
  const daCasa = ehDaCasa(nome);
  const perfil = perfilDoMomento();
  const desvio = desvioDaTela({ daCasa, perfil });
  // Planejador de aposentadoria (e o assistente dele): só para quem administra, vendo o próprio perfil.
  if (desvio === 'casa') { navegar('#/casa'); return; }
  if (!desvio) {
    if (nome !== 'boas-vindas') gravarLocal(CHAVE_ESPACO, espacoParaLembrar(nome, lerEspaco()));
    if (nome !== 'boas-vindas' && !daCasa && !lerLocal(CHAVE_USOU_APOSENTADORIA)) {
      gravarLocal(CHAVE_USOU_APOSENTADORIA, '1');
      reagendarLembretes();
    }
  }
  // Visão única: quem administra, vendo o próprio perfil e com o planejador, usa um menu só (os outros, como antes).
  const unica = visaoUnica({ visto: perfil.visto, temEstado: Boolean(app.estado) });
  document.body.classList.toggle('espaco-casa', daCasa);
  document.body.classList.toggle('espaco-unico', unica);
  document.body.classList.toggle('sem-abas', nome === 'boas-vindas' || (daCasa && !app.casa));
  const aba = abaDoMenu(nome, unica);
  for (const a of document.querySelectorAll('.menu a')) {
    if (a.dataset.rota === aba) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  const tela = document.getElementById('tela');
  const topo = document.getElementById('topo');
  mostrandoEscolha = desvio === 'escolher';
  if (desvio === 'escolher') {
    // Chave nova neste aparelho: pergunta uma vez quem usa, antes de qualquer tela.
    document.body.classList.add('sem-abas');
    topo.hidden = true;
    esconderFolha();
    telaQuemUsa(tela, contexto());
    telaDesenhada = null;
    return;
  }
  // A foto do perfil: nas telas da casa e, na visão única, em todas (trocar de perfil de qualquer lugar).
  if (daCasa || unica) desenharTopo(topo, contexto());
  else topo.hidden = true;
  try {
    const modulo = await import(`./ui/${nome}.js`);
    // Outro desenho começou enquanto este carregava (ex.: tocou noutra aba durante a sincronização): ele vale.
    if (geracao !== geracaoDoDesenho) return;
    // Mesma tela (abrir ou fechar uma folha, dados de outro aparelho): só atualiza, sem animar nem rolar para o topo.
    if (nome === telaDesenhada && modulo.atualizar) {
      tela.classList.add('sem-entrada');
      modulo.atualizar(tela, contexto());
      return;
    }
    esconderFolha();
    tela.classList.remove('sem-entrada');
    tela.replaceChildren();
    modulo.render(tela, contexto());
    escalonar(tela);
    window.scrollTo(0, 0);
    telaDesenhada = nome;
  } catch (erro) {
    console.error(erro);
    tela.replaceChildren(cartao(h('p', {}, 'Esta tela ainda não está pronta.')));
  }
}

async function atualizarIpca() {
  if (!app.estado || !precisaAtualizarIpca(app.estado.ipca, new Date())) return;
  try {
    const serie = await buscarSerieIpca({ fetch: fetchGlobal, desde: somarMeses(app.estado.config.mesInicio, -1) });
    await salvar((e) => ({ ...e, ipca: { serie: { ...e.ipca.serie, ...serie }, atualizadoEm: new Date().toISOString() } }));
  } catch (erro) {
    console.warn('IPCA indisponível', erro);
  }
}

const digitando = () => document.activeElement?.matches?.('input, select, textarea');
const naCasa = () => ehDaCasa(resolverRota(location.hash, Boolean(app.estado), lerEspaco()));

// Troca o estado por um mais novo vindo do GitHub, sem atropelar quem está digitando.
function receberEstado(novo) {
  if (!novo || JSON.stringify(novo) === JSON.stringify(app.estado)) return;
  const tinha = Boolean(app.estado);
  app.estado = novo;
  if (naCasa()) return; // as telas da casa não usam os dados da aposentadoria: nada a redesenhar
  if (!tinha || !digitando()) renderizar();
  else mostrarAviso('Chegaram dados de outro aparelho. Saia do campo e abra a tela de novo para ver.', 'info');
}

function receberCasa(novo) {
  if (!novo || JSON.stringify(novo) === JSON.stringify(app.casa)) return;
  const tinha = Boolean(app.casa);
  app.casa = novo;
  if (!naCasa() && !mostrandoEscolha) return;
  // Com folha aberta ou campo em foco, o que foi digitado (só na memória) não pode sumir.
  if (!tinha || podeAtualizarSozinho(location.hash, digitando())) renderizar();
  else mostrarAviso('Chegaram dados de outro aparelho. Feche e abra de novo para ver.', 'info');
}

// Abre na hora com a cópia local; a sincronização com o GitHub acontece em segundo plano.
async function sincronizarAoAbrir() {
  const r = await app.armazem.carregar();
  if (r.aviso) avisoDeConexao(r.aviso);
  receberEstado(r.estado);
  app.sincronizado = true;
  for (const fn of esperandoSincronizar.splice(0)) fn(app.estado);
  reagendarLembretes(); // inclui meses registrados em outro aparelho
  await atualizarIpca();
}

async function sincronizarCasaAoAbrir() {
  const r = await app.armazemCasa.carregar();
  // Os avisos de conexão já vêm da aposentadoria; aqui só o que é da casa (ou se o aparelho só usa a casa).
  if (r.aviso && (r.aviso === 'conflito-resolvido' || !app.estado)) avisoDeConexao(r.aviso);
  const antes = `${app.casaSincronizada}|${app.erroCasa}`;
  // Só uma leitura que deu certo libera "Começar" num aparelho sem casa (senão duplicaria as contas).
  if (leituraOk(r.aviso)) {
    app.casaSincronizada = true;
    app.erroCasa = null;
  } else {
    app.erroCasa = r.aviso;
  }
  if (r.estado) receberCasa(r.estado);
  if (!app.casa && naCasa() && antes !== `${app.casaSincronizada}|${app.erroCasa}`) renderizar(); // troca "Carregando" pelo começo ou pelo erro
}

async function iniciar() {
  const tema = new URLSearchParams(location.search).get('tema');
  if (tema === 'escuro' || tema === 'claro') document.documentElement.dataset.tema = tema;

  montarArmazem();
  await atualizarImpressao();
  const local = app.armazem.carregarLocal();
  app.estado = local.estado;
  if (local.aviso) mostrarAviso(textoConexao(local.aviso), 'atencao');
  const localCasa = app.armazemCasa.carregarLocal();
  app.casa = localCasa.estado;
  if (localCasa.aviso) mostrarAviso(textoConexao(localCasa.aviso), 'atencao');

  // Antes de qualquer await: a versão nova pode assumir logo que o app abre.
  if ('serviceWorker' in navigator) {
    iniciarAtualizacao({ sw: navigator.serviceWorker, versao: VERSAO, avisar: (texto) => mostrarAviso(texto, 'ok', 3000) });
  }
  window.addEventListener('hashchange', renderizar);
  window.addEventListener('online', async () => {
    const [s, sCasa] = await Promise.all([app.armazem.sincronizarPendentes(), app.armazemCasa.sincronizarPendentes()]);
    if (s.sincronizado && sCasa.sincronizado) mostrarAviso('Conexão de volta: dados sincronizados.', 'ok', 4000);
    receberEstado(s.estado);
    receberCasa(sCasa.estado);
  });
  app.sincronizado = !app.conexao;
  app.casaSincronizada = !app.conexao;
  if (app.estado || app.casa || !app.conexao) await renderizar();
  sincronizarCasaAoAbrir().catch((erro) => console.warn('Casa sem sincronizar', erro));
  sincronizarAoAbrir().then(() => { if (!document.getElementById('tela').childElementCount) renderizar(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch((erro) => console.warn('Sem modo offline', erro));
}

iniciar();
