// Envio do dados.json por git push (desenho 2026-11-22-onde-investir-agendado): na nuvem do Claude Code, o proxy do
// GitHub deixa ler pela API mas só gravar por git. `clone` é o clone do repositório de dados; `shaEsperado` é o sha do
// dados.json no "baixar" (o sha da API de conteúdo é o do blob). Devolve 'enviado' | 'conflito' | 'sem mudança'.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// O sha que o git dá ao conteúdo (o mesmo da API de conteúdo do GitHub), sem depender da configuração de fim de linha.
const shaDoBlob = (texto) => { const b = Buffer.from(texto, 'utf8'); return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'); };

const rodar = (clone, args) => execFileSync('git', ['-C', clone, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// Sem nome e e-mail configurados (a sessão da nuvem pode não ter), assina como a análise.
function identidade(clone) {
  try { if (rodar(clone, ['config', 'user.email'])) return []; } catch { /* sem e-mail configurado */ }
  return ['-c', 'user.name=Onde investir', '-c', 'user.email=onde-investir@projeto-r.invalid'];
}

export function enviarPorGit({ clone, conteudo, shaEsperado, mensagem, arquivo = 'dados.json', ramo = 'main' }) {
  // Os dados são pessoais: nunca empurrar para outro repositório (o público, por engano).
  const origem = rodar(clone, ['remote', 'get-url', 'origin']);
  if (!/[/:\\]Projeto_R-dados(?:\.git)?[/\\]?$/.test(origem)) throw new Error(`o clone não é do Projeto_R-dados (origin: ${origem})`);
  rodar(clone, ['fetch', '-q', 'origin', ramo]);
  if (rodar(clone, ['rev-parse', `FETCH_HEAD:${arquivo}`]) !== shaEsperado) return 'conflito';
  if (shaDoBlob(conteudo) === shaEsperado) return 'sem mudança';
  rodar(clone, ['checkout', '-q', '--detach', 'FETCH_HEAD']);
  writeFileSync(join(clone, arquivo), conteudo);
  rodar(clone, ['add', '--', arquivo]);
  rodar(clone, [...identidade(clone), 'commit', '-q', '-m', mensagem, '--', arquivo]);
  try {
    rodar(clone, ['push', '-q', 'origin', `HEAD:refs/heads/${ramo}`]);
  } catch (erro) {
    if (/rejected|non-fast-forward|fetch first/i.test(`${erro.stderr ?? ''}`)) return 'conflito'; // gravou entre o fetch e o push
    throw erro;
  }
  return 'enviado';
}
