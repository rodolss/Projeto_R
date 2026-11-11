// Lembretes do dia do pagamento (spec do app Android, §5). Funções puras: datas locais em texto
// ('AAAA-MM-DD' e 'AAAA-MM-DDTHH:MM'), com as contas feitas em UTC para não depender do fuso do aparelho.
import { somarMeses } from './meses.js';

export const CONFIG_PADRAO = { ligado: true, tipo: 'util', dia: 5, hora: '09:00' };
const TITULO = 'Projeto R';
const TEXTO_PRINCIPAL = 'Caiu o salário? Atualize os saldos da corretora e veja quanto investir.';
const TEXTO_REFORCO = 'O mês ainda não foi registrado. Atualize os saldos e veja quanto investir.';
const DIAS_ATE_REFORCO = 3;
const MESES_AGENDADOS = 3; // o mês atual e os 2 seguintes

const pad = (n) => String(n).padStart(2, '0');
const paraData = (s) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const deData = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
const somarDias = (s, n) => {
  const dt = paraData(s);
  dt.setUTCDate(dt.getUTCDate() + n);
  return deData(dt);
};
const diasNoMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano).
export function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

const FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
const cacheFeriados = new Map();

// Feriados nacionais, Sexta-feira Santa, Carnaval (segunda e terça) e Corpus Christi.
export function feriados(ano) {
  if (!cacheFeriados.has(ano)) {
    const p = pascoa(ano);
    cacheFeriados.set(ano, new Set([
      ...FIXOS.map((md) => `${ano}-${md}`),
      somarDias(p, -48), somarDias(p, -47), // Carnaval
      somarDias(p, -2), // Sexta-feira Santa
      somarDias(p, 60), // Corpus Christi
    ]));
  }
  return cacheFeriados.get(ano);
}

// Dia útil = segunda a sexta, fora dos feriados acima.
export function ehDiaUtil(data) {
  const semana = paraData(data).getUTCDay();
  return semana >= 1 && semana <= 5 && !feriados(Number(data.slice(0, 4))).has(data);
}

export function proximoDiaUtil(data) {
  let d = data;
  while (!ehDiaUtil(d)) d = somarDias(d, 1);
  return d;
}

export function quintoDiaUtil(mes) {
  let d = `${mes}-01`;
  let contados = 0;
  for (;;) {
    if (ehDiaUtil(d)) contados += 1;
    if (contados === 5) return d;
    d = somarDias(d, 1);
  }
}

// Dia fixo: mês curto usa o último dia; fim de semana ou feriado passa para o próximo dia útil (nunca antes do dinheiro).
export function dataDoLembrete(config, mes) {
  if (config.tipo !== 'fixo') return quintoDiaUtil(mes);
  const dia = Math.min(Math.max(1, Math.round(Number(config.dia) || 1)), diasNoMes(mes));
  return proximoDiaUtil(`${mes}-${pad(dia)}`);
}

// Lembretes dos próximos meses, já sem os meses registrados e sem horários que já passaram.
// O "mês" de um lembrete é o mês do calendário em que cai o lembrete principal (spec §5.1).
export function montarLembretes({ config, agora, mesesRegistrados = [] }) {
  if (!config?.ligado) return [];
  const registrados = new Set(mesesRegistrados);
  const lista = [];
  for (let k = 0; k < MESES_AGENDADOS; k++) {
    const dia = dataDoLembrete(config, somarMeses(agora.slice(0, 7), k));
    if (registrados.has(dia.slice(0, 7))) continue;
    const principal = `${dia}T${config.hora}`;
    const reforco = `${somarDias(dia, DIAS_ATE_REFORCO)}T${config.hora}`;
    if (principal > agora) lista.push({ quando: principal, texto: TEXTO_PRINCIPAL });
    if (reforco > agora) lista.push({ quando: reforco, texto: TEXTO_REFORCO });
  }
  return lista
    .sort((a, b) => (a.quando < b.quando ? -1 : 1))
    .map((l, i) => ({ id: i + 1, quando: l.quando, titulo: TITULO, texto: l.texto, rota: '#/mes' }));
}

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

// "sex, 8 de jan., por volta das 9h" para o próximo lembrete depois de `agora`; null se não houver.
export function descreverProximo(lembretes, agora) {
  const proximo = lembretes.find((l) => l.quando > agora);
  if (!proximo) return null;
  const [data, hora] = proximo.quando.split('T');
  const dt = paraData(data);
  const [h, m] = hora.split(':');
  const horario = m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
  return `${SEMANA[dt.getUTCDay()]}, ${dt.getUTCDate()} de ${MESES[dt.getUTCMonth()]}, por volta das ${horario}`;
}
