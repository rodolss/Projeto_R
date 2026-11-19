// Inicialização, roteador por hash e contexto compartilhado entre as telas.
// Dois espaços com dados próprios: a aposentadoria (dados.json) e as contas da casa (casa.json).
import { criarArmazem } from './dados/armazem.js';
import { criarClienteGitHub, donoPadrao } from './dados/github.js';
import { buscarSerieIpca, precisaAtualizarIpca } from './dados/ipca-remoto.js';
import { mesclarCasa } from './dados/mesclar-casa.js';
import { migrarCasa } from './core/casa.js';
import { dataISO, somarMeses } from './core/meses.js';
import { h, cartao, aviso, textoConexao, esconderFolha } from './ui/dom.js';
import { resolverRota, abaDoMenu, ehDaCasa } from './ui/rotas.js';
import { escalonar } from './ui/movimento.js';
import { noApp, reagendar, lerConfig, agoraLocal, enviarAoApp } from './ui/nativo.js';
import { iniciarAtualizacao } from './ui/atualizacao.js';
import { VERSAO } from './versao.js';

const CHAVE_TOKEN = 'projetoR.token';
const CHAVE_DONO = 'projetoR.dono';
const CHAVE_ESPACO = 'projetoR.espaco'; // 'casa' | 'aposentadoria': o app abre no último espaço usado
const CHAVE_USOU_APOSENTADORIA = 'projetoR.usouAposentadoria';
const app = {
  estado: null, armazem: null, conexao: null, sincronizado: false,
  casa: null, armazemCasa: null, casaSincronizada: false,
};
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
const lerEspaco = () => (lerLocal(CHAVE_ESPACO) === 'casa' ? 'casa' : 'aposentadoria');

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

async function conectar({ token, dono }) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_DONO, dono);
  montarArmazem();
  const [r, rCasa] = await Promise.all([app.armazem.carregar(), app.armazemCasa.carregar()]);
  if (r.estado) app.estado = r.estado;
  if (rCasa.estado) app.casa = rCasa.estado;
  app.sincronizado = true;
  app.casaSincronizada = !rCasa.aviso;
  for (const fn of esperandoSincronizar.splice(0)) fn(app.estado);
  return { ...r, casa: rCasa };
}

function desconectar() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_DONO);
  montarArmazem();
}

const navegar = (hash) => { location.hash = hash; };
let telaDesenhada = null; // a última tela desenhada por inteiro

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
    salvarCasa,
    casaSincronizada: app.casaSincronizada,
  };
}

async function renderizar() {
  const nome = resolverRota(location.hash, Boolean(app.estado), lerEspaco());
  if (location.hash.replace(/^#\/?/, '').split('?')[0] !== nome) { navegar(`#/${nome}`); return; }
  const daCasa = ehDaCasa(nome);
  if (nome !== 'boas-vindas') gravarLocal(CHAVE_ESPACO, daCasa ? 'casa' : 'aposentadoria');
  if (nome !== 'boas-vindas' && !daCasa && !lerLocal(CHAVE_USOU_APOSENTADORIA)) {
    gravarLocal(CHAVE_USOU_APOSENTADORIA, '1');
    reagendarLembretes();
  }
  document.body.classList.toggle('espaco-casa', daCasa);
  document.body.classList.toggle('sem-abas', nome === 'boas-vindas' || (daCasa && !app.casa));
  const aba = abaDoMenu(nome);
  for (const a of document.querySelectorAll('.menu a')) {
    if (a.dataset.rota === aba) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  const tela = document.getElementById('tela');
  try {
    const modulo = await import(`./ui/${nome}.js`);
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
  if (!tinha || !digitando()) renderizar();
  else mostrarAviso('Chegaram dados de outro aparelho. Saia do campo e abra a tela de novo para ver.', 'info');
}

function receberCasa(novo) {
  if (!novo || JSON.stringify(novo) === JSON.stringify(app.casa)) return;
  const tinha = Boolean(app.casa);
  app.casa = novo;
  if (!naCasa()) return;
  if (!tinha || !digitando()) renderizar();
  else mostrarAviso('Chegaram dados de outro aparelho. Saia do campo e abra a tela de novo para ver.', 'info');
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
  const antes = app.casaSincronizada;
  app.casaSincronizada = true;
  if (r.estado) receberCasa(r.estado);
  else if (!antes && naCasa()) renderizar(); // sem casa no GitHub: troca "Carregando" pelo começo
}

async function iniciar() {
  const tema = new URLSearchParams(location.search).get('tema');
  if (tema === 'escuro' || tema === 'claro') document.documentElement.dataset.tema = tema;

  montarArmazem();
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
