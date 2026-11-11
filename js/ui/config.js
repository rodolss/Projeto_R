// Ajustes: renda, premissas, carteira-alvo, investimentos, conexão, IPCA manual e backup.
import { h, campoMoeda, cartao, botao, aviso, textoConexao, AVISO_EXEMPLOS } from './dom.js';
import { formatarBRL } from '../core/formato.js';
import { formatarMes, diffMeses } from '../core/meses.js';
import { CLASSES } from '../core/alocacao.js';
import { migrar, novoId } from '../core/esquema.js';
import { ultimoMes } from '../core/ipca.js';
import { PAPEIS, NOMES_CLASSE_CURTOS } from './boas-vindas.js';

const campoNumero = (rotulo, valor, aoMudar, { sufixo = '', dica = null, passo = '0.1' } = {}) => h('label', { class: 'campo' },
  h('span', { class: 'campo-rotulo' }, rotulo),
  h('span', { style: 'display:flex;align-items:center;gap:6px' },
    h('input', { class: 'entrada', type: 'number', step: passo, min: '0', value: String(valor), style: 'max-width:140px', oninput: (e) => aoMudar(Number(e.target.value)) }),
    sufixo),
  dica && h('span', { class: 'campo-dica' }, dica));

export function render(container, ctx) {
  const { estado, hoje } = ctx;
  const mes = hoje.slice(0, 7);
  const salvarComAviso = async (mutacao, texto) => {
    await ctx.salvar(mutacao);
    ctx.aviso(texto, 'ok', 3000);
    ctx.rerender();
  };

  // ---------- Renda ----------
  const renda = { salario: estado.config.salario, recebe13: estado.config.recebe13, recebeFerias: estado.config.recebeFerias };
  const cartaoRenda = cartao(h('h2', {}, 'Renda'),
    campoMoeda({ rotulo: 'Salário líquido mensal', valor: renda.salario, dica: `Informado em ${formatarMes(estado.config.mesSalario)}. Atualize quando tiver aumento.`, aoMudar: (v) => { renda.salario = v; } }),
    h('label', { class: 'marcar' }, h('input', { type: 'checkbox', checked: renda.recebe13, onchange: (e) => { renda.recebe13 = e.target.checked; } }), 'Recebo 13º salário'),
    h('label', { class: 'marcar' }, h('input', { type: 'checkbox', checked: renda.recebeFerias, onchange: (e) => { renda.recebeFerias = e.target.checked; } }), 'Recebo férias com 1/3'),
    h('div', { class: 'botoes' }, botao('Salvar renda', () => {
      if (!(renda.salario > 0)) { ctx.aviso('Informe o salário.', 'atencao', 3000); return; }
      const mudouSalario = renda.salario !== estado.config.salario;
      salvarComAviso((e) => ({ ...e, config: { ...e.config, salario: renda.salario, recebe13: renda.recebe13, recebeFerias: renda.recebeFerias, mesSalario: mudouSalario ? mes : e.config.mesSalario } }), 'Renda salva.');
    })));

  // ---------- Premissas ----------
  const prem = { swr: estado.config.swr * 100, rent: estado.config.rentabilidadeReal * 100, prazo: estado.config.prazoMeses / 12 };
  const cartaoPremissas = cartao(h('h2', {}, 'Premissas do plano'),
    campoNumero('Taxa de retirada', prem.swr, (v) => { prem.swr = v; }, { sufixo: '% ao ano', dica: 'Quanto você tira da carteira por ano na aposentadoria. 4% é o padrão; 3,5% é mais conservador.' }),
    campoNumero('Rentabilidade real esperada', prem.rent, (v) => { prem.rent = v; }, { sufixo: '% ao ano', dica: 'Quanto a carteira rende por ano acima da inflação. É o cenário normal do simulador; o ruim e o moderado ficam 2 e 1 pontos abaixo, e o bom 2 pontos acima.' }),
    campoNumero('Prazo', prem.prazo, (v) => { prem.prazo = v; }, { sufixo: 'anos', passo: '1', dica: `Contado a partir de ${formatarMes(estado.config.mesInicio)}.` }),
    h('div', { class: 'botoes' }, botao('Salvar premissas', () => {
      if (!(prem.swr > 0 && prem.swr < 20 && prem.rent > -5 && prem.rent < 30 && prem.prazo >= 1 && prem.prazo <= 50)) {
        ctx.aviso('Confira os valores: taxa entre 0 e 20%, rentabilidade entre -5% e 30%, prazo entre 1 e 50 anos.', 'atencao', 5000);
        return;
      }
      salvarComAviso((e) => ({ ...e, config: { ...e.config, swr: prem.swr / 100, rentabilidadeReal: prem.rent / 100, prazoMeses: Math.round(prem.prazo * 12) } }), 'Premissas salvas. O plano foi recalculado.');
    })));

  // ---------- Carteira-alvo ----------
  const alvo = structuredClone(estado.carteiraAlvo);
  const somaEl = h('p', { class: 'suave' });
  const soma = () => CLASSES.reduce((s, c) => s + Math.round(alvo[c].peso * 1000) / 10, 0);
  const atualizarSoma = () => { somaEl.textContent = `Soma: ${soma().toLocaleString('pt-BR')}%`; };
  const cartaoCarteira = cartao(h('h2', {}, 'Carteira-alvo'),
    ...CLASSES.map((c) => h('div', { class: 'linha', style: 'flex-wrap:wrap' },
      h('div', { class: 'nome' }, h('span', {}, NOMES_CLASSE_CURTOS[c])),
      h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' },
        h('input', { class: 'entrada', value: alvo[c].ticker, style: 'width:190px', 'aria-label': `Investimento padrão de ${NOMES_CLASSE_CURTOS[c]}`, oninput: (e) => { alvo[c].ticker = e.target.value; } }),
        h('input', { class: 'entrada', type: 'number', min: '0', max: '100', step: '1', value: String(Math.round(alvo[c].peso * 1000) / 10), style: 'width:76px', 'aria-label': `Percentual de ${NOMES_CLASSE_CURTOS[c]}`, oninput: (e) => { alvo[c].peso = Number(e.target.value) / 100; atualizarSoma(); } }),
        '%'))),
    somaEl,
    h('p', { class: 'suave pequeno' }, AVISO_EXEMPLOS),
    h('div', { class: 'botoes' }, botao('Salvar carteira-alvo', () => {
      if (Math.abs(soma() - 100) > 0.01) { ctx.aviso('Os percentuais precisam somar 100%.', 'atencao', 4000); return; }
      salvarComAviso((e) => ({ ...e, carteiraAlvo: alvo }), 'Carteira-alvo salva.');
    })));
  atualizarSoma();

  // ---------- Investimentos ----------
  const ativos = estado.ativos.map((a) => ({ ...a }));
  const removidos = new Set();
  const novo = { nome: '', papel: 'carteira', classe: 'rendaFixa', tipoForaDoPlano: 'poupanca', saldo: null };
  const seletor = (opcoes, valor, aoMudar, rotulo) => h('select', { class: 'entrada', 'aria-label': rotulo, onchange: (e) => aoMudar(e.target.value) },
    ...opcoes.map(([v, t]) => h('option', { value: v, selected: v === valor }, t)));
  const opcoesClasse = CLASSES.map((c) => [c, NOMES_CLASSE_CURTOS[c]]);
  const opcoesPapel = PAPEIS.map((p) => [p.id, p.nome]);
  const cartaoAtivos = cartao(h('h2', {}, 'Investimentos'),
    ...(ativos.length ? ativos.map((a) => h('div', { class: 'linha', style: 'flex-wrap:wrap' },
      h('div', { class: 'nome' }, h('span', {}, a.nome)),
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
        seletor(opcoesPapel, a.papel, (v) => { a.papel = v; }, `Papel de ${a.nome}`),
        seletor(opcoesClasse, a.classe ?? 'rendaFixa', (v) => { a.classe = v; }, `Classe de ${a.nome}`),
        h('label', { class: 'marcar' }, h('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) removidos.add(a.id); else removidos.delete(a.id); } }), 'remover'))))
      : [h('p', { class: 'suave' }, 'Nenhum investimento cadastrado.')]),
    h('h3', { style: 'margin-top:12px' }, 'Adicionar'),
    h('div', { style: 'display:flex;flex-direction:column;gap:8px' },
      h('input', { class: 'entrada', placeholder: 'Nome (ex.: CDB banco X, BOVA11)', oninput: (e) => { novo.nome = e.target.value.trim(); } }),
      seletor(opcoesPapel, novo.papel, (v) => { novo.papel = v; }, 'Papel do novo investimento'),
      seletor(opcoesClasse, novo.classe, (v) => { novo.classe = v; }, 'Classe do novo investimento (se for carteira)'),
      seletor([['poupanca', 'Poupança'], ['outro', 'Outro']], novo.tipoForaDoPlano, (v) => { novo.tipoForaDoPlano = v; }, 'Tipo (se for fora do plano)'),
      campoMoeda({ rotulo: 'Saldo hoje (opcional)', valor: null, aoMudar: (v) => { novo.saldo = v; } })),
    h('div', { class: 'botoes', style: 'margin-top:8px' }, botao('Salvar investimentos', () => {
      salvarComAviso((e) => {
        const lista = ativos.filter((a) => !removidos.has(a.id)).map((a) => ({
          ...a, classe: a.papel === 'carteira' ? (a.classe ?? 'rendaFixa') : null,
          tipoForaDoPlano: a.papel === 'fora-do-plano' ? (a.tipoForaDoPlano ?? 'outro') : null,
        }));
        const saldos = e.saldos.filter((s) => !removidos.has(s.ativoId));
        if (novo.nome) {
          const id = novoId();
          lista.push({
            id, nome: novo.nome, ticker: novo.nome, papel: novo.papel,
            classe: novo.papel === 'carteira' ? novo.classe : null,
            tipoForaDoPlano: novo.papel === 'fora-do-plano' ? novo.tipoForaDoPlano : null,
          });
          if (novo.saldo != null) saldos.push({ ativoId: id, data: hoje, valor: novo.saldo, cotas: null });
        }
        return { ...e, ativos: lista, saldos };
      }, 'Investimentos salvos.');
    })));

  // ---------- Conexão ----------
  const conexao = { token: '', dono: ctx.conexao?.dono ?? ctx.donoSugerido };
  const msgConexao = h('div');
  const cartaoConexao = cartao(h('h2', {}, 'Sincronização'),
    h('p', { class: 'suave' }, ctx.conexao ? `Conectado ao repositório privado de ${ctx.conexao.dono}.` : 'Dados guardados só neste aparelho.'),
    h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Chave do GitHub'),
      h('input', { class: 'entrada', type: 'password', placeholder: ctx.conexao ? '•••••• (manter a atual)' : 'github_pat_...', oninput: (e) => { conexao.token = e.target.value.trim(); } })),
    h('label', { class: 'campo', style: 'margin-top:8px' }, h('span', { class: 'campo-rotulo' }, 'Usuário do GitHub'),
      h('input', { class: 'entrada', value: conexao.dono, oninput: (e) => { conexao.dono = e.target.value.trim(); } })),
    h('div', { class: 'botoes', style: 'margin-top:8px' },
      botao('Conectar', async () => {
        const token = conexao.token || ctx.conexao?.token;
        if (!token || !conexao.dono) { msgConexao.replaceChildren(aviso('atencao', 'Preencha a chave e o usuário.')); return; }
        const r = await ctx.conectar({ token, dono: conexao.dono });
        if (r.aviso) { ctx.desconectar(); msgConexao.replaceChildren(aviso('alerta', textoConexao(r.aviso))); return; }
        if (!r.estado || r.origem !== 'remoto') await ctx.salvar((e) => e ?? estado); // primeira vez: envia os dados locais
        ctx.aviso('Conectado! Seus dados agora sincronizam entre aparelhos.', 'ok', 4000);
        ctx.rerender();
      }),
      ctx.conexao && botao('Desconectar', () => { ctx.desconectar(); ctx.aviso('Desconectado. Os dados continuam neste aparelho.', 'info', 4000); ctx.rerender(); }, { secundario: true })),
    msgConexao);

  // ---------- IPCA manual ----------
  const serie = { ...estado.ipca.serie, ...estado.ipcaManual };
  const ultimo = ultimoMes(serie);
  const precisaManual = !ultimo || diffMeses(ultimo, mes) > 2;
  const ipca = { mes: ultimo ? ultimo.replace(/^(\d+)-(\d+)$/, (_, a, m) => (m === '12' ? `${Number(a) + 1}-01` : `${a}-${String(Number(m) + 1).padStart(2, '0')}`)) : mes, pct: null };
  const cartaoIpca = precisaManual && cartao(h('h2', {}, 'Inflação (IPCA) manual'),
    h('p', { class: 'suave' }, `Não consegui buscar o IPCA automaticamente${ultimo ? ` depois de ${formatarMes(ultimo)}` : ''}. Se quiser, informe aqui (está no site do IBGE).`),
    h('div', { class: 'botoes' },
      h('input', { class: 'entrada', type: 'month', value: ipca.mes, 'aria-label': 'Mês do IPCA', onchange: (e) => { ipca.mes = e.target.value; } }),
      h('input', { class: 'entrada', type: 'number', step: '0.01', placeholder: '% no mês (ex.: 0,45)', 'aria-label': 'IPCA do mês em %', oninput: (e) => { ipca.pct = Number(e.target.value); } }),
      botao('Salvar IPCA', () => {
        if (!ipca.mes || !Number.isFinite(ipca.pct)) return;
        salvarComAviso((e) => ({ ...e, ipcaManual: { ...e.ipcaManual, [ipca.mes]: ipca.pct / 100 } }), 'IPCA salvo.');
      }, { secundario: true })));

  // ---------- Backup ----------
  const msgBackup = h('div');
  const exportar = botao('Exportar backup', () => {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `projeto-r-backup-${hoje}.json` });
    document.body.append(a);
    a.click();
    a.remove();
  }, { secundario: true });
  const arquivo = h('input', { type: 'file', accept: 'application/json,.json', class: 'entrada', 'aria-label': 'Arquivo de backup' });
  arquivo.addEventListener('change', async () => {
    const f = arquivo.files?.[0];
    if (!f) return;
    let importado;
    try {
      importado = migrar(JSON.parse(await f.text()));
    } catch {
      msgBackup.replaceChildren(aviso('alerta', 'Este arquivo não é um backup válido do Projeto R (ou é de uma versão mais nova). Nada foi alterado.'));
      return;
    }
    msgBackup.replaceChildren(aviso('atencao',
      `Substituir todos os dados por este backup (${importado.meses?.length ?? 0} meses registrados)? `,
      h('div', { class: 'botoes', style: 'margin-top:8px' },
        botao('Substituir', () => salvarComAviso(() => importado, 'Backup importado.'), { perigo: true }),
        botao('Cancelar', () => msgBackup.replaceChildren(), { secundario: true }))));
  });
  const msgRefazer = h('div');
  const cartaoBackup = cartao(h('h2', {}, 'Backup e recomeço'),
    h('p', { class: 'suave' }, 'Guarde uma cópia dos seus dados num arquivo, ou restaure uma cópia.'),
    h('div', { class: 'botoes' }, exportar),
    h('label', { class: 'campo', style: 'margin-top:8px' }, h('span', { class: 'campo-rotulo' }, 'Importar backup'), arquivo),
    msgBackup,
    h('div', { class: 'botoes', style: 'margin-top:12px' }, botao('Refazer o assistente', () => msgRefazer.replaceChildren(aviso('atencao',
      'O assistente cria um plano novo e substitui todos os dados atuais. Exporte um backup antes. ',
      h('div', { class: 'botoes', style: 'margin-top:8px' }, botao('Refazer mesmo assim', () => ctx.navegar('#/boas-vindas'), { perigo: true })))), { secundario: true })),
    msgRefazer);

  container.replaceChildren(...[
    h('h1', {}, 'Ajustes'),
    h('p', { class: 'suave' }, `Salário atual: ${formatarBRL(estado.config.salario)} · plano iniciado em ${formatarMes(estado.config.mesInicio)}.`),
    cartaoRenda, cartaoPremissas, cartaoCarteira, cartaoAtivos, cartaoConexao, cartaoIpca, cartaoBackup,
  ].filter(Boolean));
}
