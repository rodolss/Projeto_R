// Dublês para os testes da camada de dados.

// fetch falso: cada chamada consome a próxima resposta da fila. Uma resposta pode ser
// { status, json } ou 'rede' (simula falha de conexão).
export function criarFetch(respostas) {
  const chamadas = [];
  const fila = [...respostas];
  const fetch = async (url, init = {}) => {
    chamadas.push({ url, ...init });
    const r = fila.shift();
    if (!r) throw new Error(`chamada inesperada: ${url}`);
    if (r === 'rede') throw new TypeError('Failed to fetch');
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      json: async () => (typeof r.json === 'string' ? JSON.parse(r.json) : r.json),
    };
  };
  return { fetch, chamadas };
}

export function criarArmazenamento(inicial = {}) {
  const mem = { ...inicial };
  return {
    mem,
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
}

export const base64 = (texto) => Buffer.from(texto, 'utf8').toString('base64');
