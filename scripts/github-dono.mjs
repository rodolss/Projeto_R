// O dono do repositório público a partir do remoto do git (https, ssh ou o proxy da nuvem do Claude Code, que tem a
// forma http://…@127.0.0.1:porta/git/<dono>/Projeto_R). Na nuvem, `gh api user` não passa pelo proxy do GitHub.
export function donoDaUrl(url) {
  const m = String(url ?? '').trim().match(/[/:]([^/:@\s]+)\/Projeto_R(?:\.git)?\/?$/);
  return m ? m[1] : null;
}
