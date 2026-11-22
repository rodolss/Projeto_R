// Os dados pessoais nunca dentro do repositório público (que não os ignora): o caminho está dentro da raiz?
import { relative, resolve, isAbsolute } from 'node:path';

export function dentroDe(raiz, caminho) {
  const r = relative(resolve(raiz), resolve(caminho));
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
}
