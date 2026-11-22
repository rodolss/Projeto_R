# Onde investir: ordens objetivas pela renda isenta

## Por quê
O usuário não conhece investimentos ("não sei nem nome") e quer ordens objetivas: "compre X ações da empresa Y,
aplique R$ X em tal coisa". Quer viver de dividendos isentos de imposto de renda e reinvestir tudo até a aposentadoria.
Pediu uma consulta ao mercado; como já paga a assinatura do Claude, a análise roda no Claude Code, não na API.

## Decisões (entrevista de 2026-11-22; todas as recomendadas)
- **Q1 — Como rodar:** comando `/onde-investir` no Claude Code (a assinatura do usuário). O Claude lê os dados do
  repositório privado, busca na web preços e dividendos do dia, monta as ordens e grava a recomendação no próprio
  `dados.json` (campo `recomendacao`). O app só mostra. Um agendamento mensal pode vir depois.
- **Q2 — Estratégia de renda isenta:** 50% fundos imobiliários (rendimentos isentos para pessoa física) e 50% ações
  boas pagadoras de dividendos (dividendos isentos; JCP tem 15%), comprados direto, não por ETF. A reserva de emergência
  continua antes, no Tesouro Selic (regra do motor). Renda fixa e exterior saem da carteira-alvo (0%).
- **Q3 — Lista estável:** a primeira análise monta a lista da carteira (8–10 FIIs de tipos diferentes e 8–10 ações de
  setores perenes), com o motivo de cada um; ela só é revista a cada 3 meses ou quando o usuário pedir. Todo mês, as
  compras ficam dentro da lista, priorizando o que está abaixo da fatia e mais barato. Nunca vende.

## Abordagens
1. **Análise no Claude Code gravando no repositório privado (escolhida):** usa a assinatura, tem busca na web e não
   põe credencial no navegador.
2. API da Anthropic chamada pelo app: na hora, mas precisa de chave paga à parte.
3. Lista fixa no código, sem consulta: sem preços do dia, não dá "compre X cotas".

## Como fica
- `recomendacao` no estado: `{ mes, geradaEm, valor, estrategia, lista[{ticker,nome,classe,fatia,motivo}],
  ordens[{ticker,nome,classe,cotas,preco,valor,motivo}], resumo, avisos[] }`. Núcleo `js/core/recomendacao.js`
  (validar, aplicar ao estado — também ajusta a carteira-alvo para 50/50 —, a do mês, ordens → aplicado).
- `scripts/onde-investir.mjs`: `baixar` / `contexto` / `gravar` / `enviar` (o GitHub pela `gh`, com o sha: se o app
  gravou no meio, recomeça). O contexto usa o próprio motor: o mês em foco, quanto investir (`regraDaSobra`) e quanto
  vai para a carteira depois da reserva e da caixa (`calcularMes`).
- `.claude/skills/onde-investir/SKILL.md`: o passo a passo da análise (critérios de escolha, as ordens em cotas
  inteiras dentro do valor, nunca vender, avisos).
- Carteira › Resumo: "Onde investir em <mês>" com as ordens ("Compre 12 cotas de HGLG11 · ≈ R$ 1.900") e a folha
  "Carteira recomendada" (a lista com o porquê). Sem análise do mês: diz como pedir.
- Dia de pagamento: com a recomendação do mês, "Onde aplicar" mostra as ordens e "Já apliquei" registra por código
  (cria o investimento na primeira compra). Reserva e caixa continuam como antes.

## Fora
Agendamento mensal (depois), venda/rebalanceamento por venda, proventos por ativo, imposto de JCP calculado.
