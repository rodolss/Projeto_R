// Inicialização, roteador por hash e contexto compartilhado entre as telas.
import { criarArmazem } from './dados/armazem.js';
import { criarClienteGitHub, donoPadrao } from './dados/github.js';
import { buscarSerieIpca, precisaAtualizarIpca } from './dados/ipca-remoto.js';
import { dataISO, somarMeses } from './core/meses.js';
import { h, cartao, aviso, textoConexao } from './ui/dom.js';
import { resolverRota, abaDoMenu } from './ui/rotas.js';
import { escalonar } from './ui/movimento.js';
import { noApp, reagendar, lerConfig, agoraLocal, enviarAoApp } from './ui/nativo.js';

const CHAVE_TOKEN = 'projetoR.token';
const CHAVE_DONO = 'projetoR.dono';
const app = { estado: null, armazem: null, conexao: null, sincronizado: false };
// Quem precisa dos dados já sincronizados (a comemoração de marcos) espera aqui (spec v2 §4.7).
const esperandoSincronizar = [];
function quandoSincronizado(fn) {
  if (app.sincronizado) fn(app.estado);
  else esperandoSincronizar.push(fn);
}
const fetchGlobal = (...args) => globalThis.fetch(...args);

function lerConexao() {
  const token = localStorage.getItem(CHAVE_TOKEN);
  const dono = localStorage.getItem(CHAVE_DONO) || donoPadrao(location.hostname);
  return token && dono ? { token, dono } : null;
}

function montarArmazem() {
  app.conexao = lerConexao();
  const cliente = app.conexao ? criarClienteGitHub({ ...app.conexao, fetch: fetchGlobal }) : null;
  app.armazem = criarArmazem({ armazenamento: localStorage, cliente });
}

export function mostrarAviso(texto, nivel = 'info', duracao = 7000) {
  const caixa = document.getElementById('avisos');
  const el = aviso(nivel, texto);
  caixa.append(el);
  if (duracao) setTimeout(() => el.remove(), duracao);
}

// No app Android, a agenda dos lembretes acompanha os dados: registrar o mês tira os lembretes dele.
function reagendarLembretes() {
  if (!noApp() || !app.estado) return;
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
  if (r.aviso) mostrarAviso(textoConexao(r.aviso), r.aviso === 'conflito-resolvido' ? 'info' : 'atencao');
  return r;
}

async function conectar({ token, dono }) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_DONO, dono);
  montarArmazem();
  const r = await app.armazem.carregar();
  if (r.estado) app.estado = r.estado;
  app.sincronizado = true;
  for (const fn of esperandoSincronizar.splice(0)) fn(app.estado);
  return r;
}

function desconectar() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_DONO);
  montarArmazem();
}

const navegar = (hash) => { location.hash = hash; };

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
  };
}

async function renderizar() {
  const nome = resolverRota(location.hash, Boolean(app.estado));
  if (location.hash.replace(/^#\/?/, '').split('?')[0] !== nome) { navegar(`#/${nome}`); return; }
  document.body.classList.toggle('sem-abas', nome === 'boas-vindas');
  const aba = abaDoMenu(nome);
  for (const a of document.querySelectorAll('#menu a')) {
    if (a.dataset.rota === aba) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  const tela = document.getElementById('tela');
  try {
    const modulo = await import(`./ui/${nome}.js`);
    tela.replaceChildren();
    modulo.render(tela, contexto());
    escalonar(tela);
    window.scrollTo(0, 0);
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

// Troca o estado por um mais novo vindo do GitHub, sem atropelar quem está digitando.
function receberEstado(novo) {
  if (!novo || JSON.stringify(novo) === JSON.stringify(app.estado)) return;
  const tinha = Boolean(app.estado);
  app.estado = novo;
  const digitando = document.activeElement?.matches?.('input, select, textarea');
  if (!tinha || !digitando) renderizar();
  else mostrarAviso('Chegaram dados de outro aparelho. Saia do campo e abra a tela de novo para ver.', 'info');
}

// Abre na hora com a cópia local; a sincronização com o GitHub acontece em segundo plano.
async function sincronizarAoAbrir() {
  const r = await app.armazem.carregar();
  if (r.aviso) mostrarAviso(textoConexao(r.aviso), r.aviso === 'conflito-resolvido' ? 'info' : 'atencao');
  receberEstado(r.estado);
  app.sincronizado = true;
  for (const fn of esperandoSincronizar.splice(0)) fn(app.estado);
  reagendarLembretes(); // inclui meses registrados em outro aparelho
  await atualizarIpca();
}

async function iniciar() {
  const tema = new URLSearchParams(location.search).get('tema');
  if (tema === 'escuro' || tema === 'claro') document.documentElement.dataset.tema = tema;

  montarArmazem();
  const local = app.armazem.carregarLocal();
  app.estado = local.estado;
  if (local.aviso) mostrarAviso(textoConexao(local.aviso), 'atencao');

  window.addEventListener('hashchange', renderizar);
  window.addEventListener('online', async () => {
    const s = await app.armazem.sincronizarPendentes();
    if (s.sincronizado) mostrarAviso('Conexão de volta: dados sincronizados.', 'ok', 4000);
    receberEstado(s.estado);
  });
  app.sincronizado = !app.conexao;
  if (app.estado || !app.conexao) await renderizar();
  sincronizarAoAbrir().then(() => { if (!document.getElementById('tela').childElementCount) renderizar(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch((erro) => console.warn('Sem modo offline', erro));
}

iniciar();
