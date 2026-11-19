// Monta um .xlsx em memória (zip + XML mínimos) para testar a importação sem nenhuma planilha real.
// abas: [{ nome, celulas: { 'C3': 'texto', 'C5': 12.5, 'G5': { f: 'SUM(C5:F5)', v: 30 } } }]
import { deflateRawSync, crc32 } from 'node:zlib';

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function zip(arquivos) {
  const locais = [];
  const centrais = [];
  let deslocamento = 0;
  for (const [nome, texto] of Object.entries(arquivos)) {
    const dados = Buffer.from(texto, 'utf8');
    const comprimido = deflateRawSync(dados);
    const nomeBuf = Buffer.from(nome, 'utf8');
    const crc = crc32(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nomeBuf.length, 28);
    central.writeUInt32LE(deslocamento, 42);
    locais.push(local, nomeBuf, comprimido);
    centrais.push(central, nomeBuf);
    deslocamento += local.length + nomeBuf.length + comprimido.length;
  }
  const diretorio = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(Object.keys(arquivos).length, 8);
  fim.writeUInt16LE(Object.keys(arquivos).length, 10);
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(deslocamento, 16);
  return Buffer.concat([...locais, diretorio, fim]);
}

export function criarXlsx(abas) {
  const textos = [];
  const indiceDe = (t) => {
    let k = textos.indexOf(t);
    if (k < 0) { k = textos.length; textos.push(t); }
    return k;
  };
  const planilhas = abas.map(({ celulas }) => {
    const linhas = new Map();
    for (const [ref, valor] of Object.entries(celulas)) {
      const r = Number(ref.match(/\d+/)[0]);
      if (!linhas.has(r)) linhas.set(r, []);
      let xml;
      if (typeof valor === 'string') xml = `<c r="${ref}" t="s"><v>${indiceDe(valor)}</v></c>`;
      else if (typeof valor === 'number') xml = `<c r="${ref}"><v>${valor}</v></c>`;
      else xml = `<c r="${ref}"><f>${esc(valor.f)}</f><v>${valor.v}</v></c>`;
      linhas.get(r).push(xml);
    }
    const corpo = [...linhas.entries()].sort((a, b) => a[0] - b[0]).map(([r, cs]) => `<row r="${r}">${cs.join('')}</row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${corpo}</sheetData></worksheet>`;
  });
  const arquivos = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas.map((a, k) => `<sheet name="${esc(a.nome)}" sheetId="${k + 1}" r:id="rId${k + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, k) => `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${k + 1}.xml"/>`).join('')}</Relationships>`,
  };
  planilhas.forEach((xml, k) => { arquivos[`xl/worksheets/sheet${k + 1}.xml`] = xml; });
  arquivos['xl/sharedStrings.xml'] = `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${textos.map((t) => `<si><t>${esc(t)}</t></si>`).join('')}</sst>`;
  return zip(arquivos);
}
