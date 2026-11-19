// Cartão para conectar o aparelho ao repositório de dados (contas da casa): a mesma chave do GitHub do app,
// para as contas aparecerem nos dois celulares. Ao conectar, uma casa que só existia aqui é enviada.
import { h, cartao, botao, aviso, textoConexao } from './dom.js';

export function cartaoConectar(ctx, { titulo, texto }) {
  const dados = { token: '', dono: ctx.conexao?.dono ?? ctx.donoSugerido ?? '' };
  const msg = h('div');
  const conectar = botao('Conectar', async () => {
    if (!dados.token || !dados.dono) { msg.replaceChildren(aviso('atencao', 'Preencha a chave e o usuário.')); return; }
    conectar.disabled = true;
    msg.replaceChildren(aviso('info', 'Conectando...'));
    const r = await ctx.conectar({ token: dados.token, dono: dados.dono });
    conectar.disabled = false;
    if (r.aviso) {
      ctx.desconectar();
      msg.replaceChildren(aviso('alerta', textoConexao(r.aviso)));
      return;
    }
    if (r.casa?.estado && r.casa.origem !== 'remoto') await ctx.salvarCasa((e) => e ?? r.casa.estado);
    ctx.aviso('Conectado! As contas da casa aparecem em todo celular conectado.', 'ok', 4000);
    ctx.rerender();
  });
  return h('section', { class: 'cartao', 'data-sem-recarregar': '' },
    h('h2', {}, titulo),
    texto && h('p', { class: 'suave' }, texto),
    h('details', {},
      h('summary', {}, 'Como criar a chave'),
      h('ol', { class: 'suave pequeno' },
        h('li', {}, 'No GitHub de quem já usa o app: ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'Fine-grained tokens → Generate new token'), '.'),
        h('li', {}, 'Nome: "Projeto R (outro celular)". Validade: 1 ano.'),
        h('li', {}, 'Repository access: ', h('b', {}, 'Only select repositories → Projeto_R-dados'), '.'),
        h('li', {}, 'Permissions → Contents: ', h('b', {}, 'Read and write'), '. Gere e copie a chave (começa com github_pat_).'))),
    h('label', { class: 'campo', style: 'margin-top:10px' }, h('span', { class: 'campo-rotulo' }, 'Chave do GitHub'),
      h('input', { class: 'entrada', type: 'password', placeholder: 'github_pat_...', autocomplete: 'off', oninput: (e) => { dados.token = e.target.value.trim(); } })),
    h('label', { class: 'campo', style: 'margin-top:8px' }, h('span', { class: 'campo-rotulo' }, 'Usuário do GitHub'),
      h('input', { class: 'entrada', value: dados.dono, placeholder: 'usuário de quem já usa o app', oninput: (e) => { dados.dono = e.target.value.trim(); } })),
    h('div', { class: 'botoes', style: 'margin-top:10px' }, conectar),
    msg);
}
