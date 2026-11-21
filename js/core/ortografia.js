// Correção de acentos das etiquetas (desenho 2026-11-21-ortografia): quem digita "aviao" fica com "avião". Duas fontes:
// regras para as terminações que quase sempre levam acento (-ão, -ões, -ães, -ção, -ções) e uma lista de palavras do
// dia a dia de quem controla gastos (mercado, casa, saúde, transporte, lazer...). Só corrige palavra SEM acento algum e
// só quando ela é inequívoca: palavras que existem com e sem acento ("para", "esta", "pais", "maca") ficam como estão.

// A lista (só as acentuadas, em minúsculas). A chave é a palavra sem acento.
const PALAVRAS = `
açúcar açaí maçã mamão limão melão feijão macarrão pão pãozinho pãezinhos pêssego brócolis rúcula abóbora jiló maracujá tâmara
linguiça salmão camarão hambúrguer filé fígado coração língua almôndega requeijão muçarela picolé bombom empadão
café chá guaraná energético água álcool óleo
sabão lâmpada lâmpadas fogão colchão lençol sofá armário extensão fiação fósforo máquina tábua
condomínio empréstimo médico psicólogo clínica farmácia ótica óculos veterinário saúde crédito débito cartório
gás ônibus metrô táxi avião pedágio revisão mecânico
música vídeo série ração
sutiã sandália boné relógio cabeleireiro salão depilação tênis lenço algodão blusão
inglês matemática português câmera televisão áudio matrícula lápis
açougue hortifrúti almoço armazém babá estética sábado março páscoa férias aniversário
orçamento depósito transferência manutenção instalação decoração devolução comissão doação dízimo peça
bebê pílula cápsula analgésico antibiótico termômetro ortopédico prótese
hóspede chácara lácteo mágico
são mão chão irmão mãe pães cães
`.split(/\s+/).filter(Boolean);

// Palavras que existem com e sem acento (ou em que o acento muda o sentido): nunca corrigir.
const AMBIGUAS = new Set(['pais', 'maca', 'pe', 'pes', 'para', 'esta', 'ate', 'so', 'ja', 'e', 'metro', 'sitio', 'calcado', 'duvida', 'sabia']);

const semAcentoMinuscula = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// A lista vira um mapa: chave sem acento → forma correta. Só entra o que não é ambíguo.
const MAPA = new Map();
for (const palavra of PALAVRAS) {
  const chave = semAcentoMinuscula(palavra);
  if (palavra !== chave && !AMBIGUAS.has(chave) && !MAPA.has(chave)) MAPA.set(chave, palavra);
}

const TEM_ACENTO = /[À-ſ]/;

// Terminações que quase sempre levam acento. Precisa sobrar letra antes do final (para não pegar "ao" nem "cao" sozinhos).
function porRegra(minuscula) {
  if (/^.{1,}cao$/.test(minuscula)) return minuscula.replace(/cao$/, 'ção');
  if (/^.{1,}coes$/.test(minuscula)) return minuscula.replace(/coes$/, 'ções');
  if (/^.{2,}ao$/.test(minuscula)) return minuscula.replace(/ao$/, 'ão');
  if (/^.{3,}oes$/.test(minuscula)) return minuscula.replace(/oes$/, 'ões');
  if (/^.{1,}aes$/.test(minuscula)) return minuscula.replace(/aes$/, 'ães');
  return null;
}

// Devolve a forma certa mantendo o jeito de escrever: "AVIAO" → "AVIÃO", "Aviao" → "Avião", "aviao" → "avião".
function comOCaso(original, corrigida) {
  if (original.length > 1 && original === original.toUpperCase()) return corrigida.toUpperCase();
  if (original[0] !== original[0].toLowerCase()) return corrigida[0].toUpperCase() + corrigida.slice(1);
  return corrigida;
}

function corrigirSimples(palavra) {
  if (!palavra || TEM_ACENTO.test(palavra) || /[^\p{L}]/u.test(palavra)) return palavra; // já acentuada, ou tem número/símbolo
  const minuscula = palavra.toLowerCase();
  if (AMBIGUAS.has(minuscula)) return palavra;
  const certa = MAPA.get(minuscula) ?? porRegra(minuscula);
  return certa ? comOCaso(palavra, certa) : palavra;
}

// Corrige os acentos de uma palavra ("Coca-Cola" e "guarana-zero" corrigem cada parte); o que não conhece, deixa como está.
export function corrigirPalavra(palavra) {
  const texto = String(palavra ?? '');
  return texto.includes('-') ? texto.split('-').map(corrigirSimples).join('-') : corrigirSimples(texto);
}

