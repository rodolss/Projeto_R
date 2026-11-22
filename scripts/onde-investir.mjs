// Onde investir (desenho 2026-11-22-onde-investir): as ferramentas da análise que o Claude Code faz pelo comando
// /onde-investir (.claude/skills/onde-investir/SKILL.md). Os dados ficam no repositório privado; aqui só passam por
// uma pasta temporária (use a pasta de rascunho da sessão, nunca uma pasta do repositório público).
//
//   node scripts/onde-investir.mjs baixar   --pasta <dir> [--dono <usuário>]
//   node scripts/onde-investir.mjs contexto --pasta <dir> [--hoje AAAA-MM-DD] [--mes AAAA-MM]
//   node scripts/onde-investir.mjs gravar   --pasta <dir> --recomendacao <arquivo.json>
//   node scripts/onde-investir.mjs enviar   --pasta <dir> [--dono <usuário>] [--clone <clone do Projeto_R-dados>]
//
// O GitHub pela `gh` (já autenticada). "enviar" usa o sha do "baixar": se o app gravou no meio, o GitHub recusa — baixe
// de novo, grave de novo e envie (nada se perde).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrar } from '../js/core/esquema.js';
import { migrarCasa } from '../js/core/casa.js';
import { mesEmFoco } from '../js/core/pagamentos.js';
import { regraDaSobra } from '../js/core/investir-sobra.js';
import { calcularMes } from '../js/core/motor.js';
import { LAZER } from '../js/core/balanco.js';
import { resumoDaCarteira } from '../js/core/carteira.js';
import { validarRecomendacao, aplicarRecomendacao, ESTRATEGIA_RENDA_ISENTA, mesDasOrdens, LIQUIDEZ_MINIMA, precisaRevisarLista } from '../js/core/recomendacao.js';
import { somarMeses } from '../js/core/meses.js';
import { donoDaUrl } from './github-dono.mjs';
import { dentroDe } from './caminhos.mjs';
import { enviarPorGit } from './envio-git.mjs';

const REPO = 'Projeto_R-dados';
const args = process.argv.slice(2);
const comando = args[0];
const opcao = (nome) => { const k = args.indexOf(`--${nome}`); return k >= 0 ? args[k + 1] : null; };
const pasta = opcao('pasta');
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
// O dono: --dono, ou o do remoto do git deste repositório (na nuvem, `gh api user` não passa pelo proxy), ou o do gh.
const remoto = () => { try { return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };
const dono = () => opcao('dono') ?? donoDaUrl(remoto()) ?? gh('api', 'user', '--jq', '.login').trim();
const lerJson = (arquivo) => JSON.parse(readFileSync(join(pasta, arquivo), 'utf8'));
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function falhar(texto) {
  console.error(texto);
  process.exit(1);
}

if (!pasta) falhar('Falta --pasta <dir> (use a pasta de rascunho da sessão).');
// Os dados são pessoais: nunca dentro do repositório público (que não os ignora).
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (dentroDe(raiz, pasta)) falhar(`--pasta está dentro do repositório público (${raiz}): use a pasta de rascunho da sessão.`);
if (opcao('recomendacao') && dentroDe(raiz, opcao('recomendacao'))) falhar(`--recomendacao está dentro do repositório público (${raiz}): escreva-a na pasta de rascunho.`);

if (comando === 'baixar') {
  mkdirSync(pasta, { recursive: true });
  const usuario = dono();
  const shas = {};
  for (const arquivo of ['dados.json', 'casa.json']) {
    const r = JSON.parse(gh('api', `repos/${usuario}/${REPO}/contents/${arquivo}`));
    writeFileSync(join(pasta, arquivo), Buffer.from(r.content, 'base64').toString('utf8'));
    shas[arquivo] = r.sha;
  }
  writeFileSync(join(pasta, 'sha.json'), JSON.stringify(shas));
  console.log(`Baixados dados.json e casa.json de ${usuario}/${REPO}.`);
} else if (comando === 'contexto') {
  const hoje = opcao('hoje') ?? hojeLocal();
  const estado = migrar(lerJson('dados.json'));
  const casa = migrarCasa(lerJson('casa.json'));
  const admin = (casa.perfis ?? []).find((p) => p.admin) ?? null;
  // O mês das ordens é o do próximo Dia de pagamento (ele registra o mês do calendário), nunca antes do da última
  // análise (desenho 2026-11-22-onde-investir-agendado); --mes escolhe outro.
  const mesFoco = mesEmFoco(casa, hoje, admin?.id ?? null);
  const mes = opcao('mes') ?? mesDasOrdens(estado, hoje);
  const regra = regraDaSobra({ casa, estado, pessoaId: admin?.id, mes, hoje });
  // O motor divide o valor: reserva de emergência primeiro, caixa de oportunidade na queda, o resto para a carteira. A
  // data vai dentro do mês das ordens (o motor deixa de fora o registro desse mês, e conta os de antes).
  const diaDoMes = mes === hoje.slice(0, 7) ? hoje : `${mes}-01`;
  const divisao = regra.incompleto ? null : calcularMes({ estado, recebido: 0, hoje: diaDoMes, investirDefinido: regra.investir, lazerPct: LAZER, semExtra: true });
  const paraCarteira = divisao ? Math.round(divisao.sugestoes.reduce((s, x) => s + x.valor, 0) * 100) / 100 : null;
  const carteira = resumoDaCarteira(estado, hoje);
  console.log(JSON.stringify({
    hoje,
    mesDoInvestimento: mes,
    mesEmFoco: mesFoco,
    mesDoCalendarioRegistrado: (estado.meses ?? []).some((m) => m.mes === hoje.slice(0, 7)),
    proximoMes: somarMeses(hoje.slice(0, 7), 1),
    quantoInvestir: regra.incompleto ? { incompleto: true, motivo: `faltam os salários de ${regra.mes} no Balanço` }
      : { sobra: regra.sobra, previsao: regra.previsao, lazer: regra.lazer, investir: regra.investir },
    divisaoDoMotor: divisao && { paraReserva: divisao.paraReserva, paraCaixa: divisao.paraCaixa, daCaixaParaCarteira: divisao.daCaixaParaCarteira, paraCarteira },
    estrategia: ESTRATEGIA_RENDA_ISENTA,
    carteiraAtual: carteira.posicoes.map((p) => ({ ticker: p.ativo.ticker ?? p.ativo.nome, papel: p.ativo.papel, classe: p.ativo.classe, saldo: p.saldo, cotas: p.cotas ?? p.cotasNoSaldo })),
    totalNaCarteira: carteira.carteira,
    divisaoAtual: carteira.alocacao.filter((a) => a.valor > 0 || ESTRATEGIA_RENDA_ISENTA[a.classe]).map((a) => ({ classe: a.classe, valor: a.valor, pct: Math.round(a.pct * 1000) / 10 })),
    listaAtual: estado.recomendacao?.lista ?? null,
    revisarLista: precisaRevisarLista(estado.recomendacao?.lista, hoje),
    excluidos: estado.recomendacao?.excluidos ?? [],
    ultimaAnalise: estado.recomendacao ? { mes: estado.recomendacao.mes, geradaEm: estado.recomendacao.geradaEm } : null,
    liquidezMinima: LIQUIDEZ_MINIMA,
  }, null, 2));
} else if (comando === 'gravar') {
  const arquivo = opcao('recomendacao');
  if (!arquivo) falhar('Falta --recomendacao <arquivo.json>.');
  const r = JSON.parse(readFileSync(arquivo, 'utf8'));
  const { ok, erros } = validarRecomendacao(r);
  if (!ok) falhar(`A recomendação tem problemas:\n- ${erros.join('\n- ')}`);
  const estado = migrar(lerJson('dados.json'));
  writeFileSync(join(pasta, 'dados.json'), JSON.stringify(aplicarRecomendacao(estado, r), null, 2));
  console.log(`Recomendação de ${r.mes} gravada em ${join(pasta, 'dados.json')}: ${r.ordens.length} ordens, R$ ${r.ordens.reduce((s, o) => s + o.valor, 0).toFixed(2)} de R$ ${r.valor.toFixed(2)}.`);
} else if (comando === 'enviar') {
  const usuario = dono();
  const { 'dados.json': sha } = lerJson('sha.json');
  const conteudo = Buffer.from(readFileSync(join(pasta, 'dados.json'), 'utf8')).toString('base64');
  const mes = lerJson('dados.json').recomendacao?.mes ?? '';
  // Na nuvem do Claude Code, o proxy só deixa gravar por git: --clone <pasta do clone do Projeto_R-dados>.
  if (opcao('clone')) {
    let r;
    try {
      r = enviarPorGit({ clone: opcao('clone'), conteudo: readFileSync(join(pasta, 'dados.json'), 'utf8'), shaEsperado: sha, mensagem: `Onde investir: recomendação de ${mes}` });
    } catch (erro) {
      falhar(`O envio por git falhou: ${`${erro.stderr ?? ''}`.trim() || erro.message}`);
    }
    if (r === 'conflito') falhar('O app gravou no meio (o dados.json mudou). Rode baixar, gravar e enviar de novo.');
    console.log(r === 'sem mudança' ? `Nada mudou: o dados.json de ${usuario}/${REPO} já tem esta recomendação.` : `Enviado por git para ${usuario}/${REPO}: a Carteira mostra a recomendação de ${mes} na próxima sincronização.`);
    process.exit(0);
  }
  // O corpo vai pela entrada padrão: na linha de comando, o Windows recusa textos grandes (o arquivo cresce todo mês).
  try {
    execFileSync('gh', ['api', '-X', 'PUT', `repos/${usuario}/${REPO}/contents/dados.json`, '--input', '-', '--silent'], {
      input: JSON.stringify({ message: `Onde investir: recomendação de ${mes}`, content: conteudo, sha }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (erro) {
    const detalhe = `${erro.stderr ?? ''}${erro.stdout ?? ''}`.trim();
    if (/\b(409|422)\b|does not match|is at/i.test(detalhe)) falhar('O app gravou no meio (o sha mudou). Rode baixar, gravar e enviar de novo.');
    if (/not permitted through this proxy/i.test(detalhe)) falhar('Na nuvem, o proxy não deixa gravar pela API: rode enviar com --clone <pasta do clone do Projeto_R-dados>.');
    falhar(`O GitHub recusou: ${detalhe || erro.message}`);
  }
  console.log(`Enviado para ${usuario}/${REPO}: a Carteira mostra a recomendação de ${mes} na próxima sincronização.`);
} else {
  falhar('Comandos: baixar | contexto | gravar | enviar (veja o começo deste arquivo).');
}
