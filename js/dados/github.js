// Cliente mínimo da GitHub Contents API para ler e gravar dados.json no repositório privado.

export class ErroGitHub extends Error {
  constructor(codigo) {
    super(codigo);
    this.codigo = codigo;
  }
}

export function donoPadrao(hostname) {
  const sufixo = '.github.io';
  return hostname.endsWith(sufixo) ? hostname.slice(0, -sufixo.length) : '';
}

function paraBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (let k = 0; k < bytes.length; k += 0x8000) binario += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
  return btoa(binario);
}

function deBase64(b64) {
  const binario = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binario, (ch) => ch.charCodeAt(0)));
}

function erroPorStatus(status) {
  if (status === 401) return new ErroGitHub('token-invalido');
  if (status === 403) return new ErroGitHub('sem-permissao');
  return new ErroGitHub('desconhecido');
}

export function criarClienteGitHub({ token, dono, repo = 'Projeto_R-dados', caminho = 'dados.json', fetch, tempoLimite = 15000 }) {
  const base = `https://api.github.com/repos/${dono}/${repo}`;
  const cabecalhos = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Conexão lenta não pode travar o app: passado o limite, vira erro de rede.
  async function chamar(url, init = {}) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), tempoLimite);
    try {
      return await fetch(url, { cache: 'no-store', ...init, signal: controle.signal, headers: { ...cabecalhos, ...(init.headers ?? {}) } });
    } catch {
      throw new ErroGitHub('rede');
    } finally {
      clearTimeout(relogio);
    }
  }

  return {
    async ler() {
      const r = await chamar(`${base}/contents/${caminho}`);
      if (r.status === 404) {
        const repo404 = await chamar(base);
        if (repo404.status === 404) throw new ErroGitHub('repo-nao-encontrado');
        if (!repo404.ok) throw erroPorStatus(repo404.status);
        return null;
      }
      if (!r.ok) throw erroPorStatus(r.status);
      const corpo = await r.json();
      return { estado: JSON.parse(deBase64(corpo.content)), sha: corpo.sha };
    },

    async gravar(estado, sha) {
      const corpo = { message: 'atualiza dados', content: paraBase64(JSON.stringify(estado, null, 2)) };
      if (sha) corpo.sha = sha;
      const r = await chamar(`${base}/contents/${caminho}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (r.status === 409 || r.status === 422) throw new ErroGitHub('conflito');
      if (!r.ok) throw erroPorStatus(r.status);
      return (await r.json()).content.sha;
    },
  };
}
