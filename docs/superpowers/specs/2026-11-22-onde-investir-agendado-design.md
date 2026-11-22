# Onde investir, sozinho todo dia 26

## Por quê
O usuário não quer lembrar de pedir `/onde-investir` (desenho 2026-11-22-onde-investir): a análise deve rodar sozinha
e as ordens já aparecerem no app. E nenhuma ordem pode ser de um ativo que ele não consegue comprar por exigência ou
condição (fundo só para investidor qualificado, oferta fechada, cota cara demais, papel pouco negociado).

## Abordagens
- **No PC (Agendador de Tarefas do Windows + `claude -p`)**: usa o login do `gh` e a assinatura já prontos; depende do
  PC ligado.
- **Na nuvem (rotina do Claude Code)** — escolhida pelo usuário: roda com o PC desligado; conta na assinatura. O `gh`
  vem instalado e o proxy do GitHub dá acesso aos repositórios ligados à rotina (o público e o de dados), sem chave
  guardada. Precisa do app do GitHub do Claude instalado nos dois repositórios (passo do usuário).

## Decisões
- **Quando**: todo dia 26, às 19h de Brasília (22h UTC; cron `0 22 26 * *`), depois do fechamento da bolsa; ele compra
  no dia 27. Fim de semana ou feriado: roda igual, com o último fechamento.
- **Mês das ordens**: o do próximo Dia de pagamento, mas nunca antes do mês da última análise (`mesDasOrdens`). Assim o
  dia 26/11 atualiza a de dezembro (novembro desconsiderado) e o dia 26/12 a atualiza de novo, com a sobra fechada.
- **Quem pode entrar na lista** (conferido na análise, a cada revisão):
  1. aberto a qualquer investidor (fora: só qualificado ou profissional);
  2. compra direta na bolsa, na hora (fora: IPO, subscrição, oferta, fundo fechado para entrada, negociação suspensa);
  3. uma cota cabe no dinheiro do lado (FIIs ou ações) de um mês típico;
  4. média negociada ≥ R$ 1 milhão por dia (FIIs) e ≥ R$ 5 milhões (ações).
  Trava no código: `validarRecomendacao` recusa ativo da lista sem `conferido` ({ publicoGeral: true, liquidezDiaria,
  em }) com liquidez abaixo do mínimo ou conferência com mais de 120 dias.
- **Avisos práticos** nas ordens: menos de 100 ações usa o código com F (TAEE11F); a corretora pode pedir o
  questionário de perfil; sem FIIs/ações na carteira, abrir conta numa corretora.
- **Sem ninguém olhando**: a análise nunca pergunta nem chuta. Faltou algo no Balanço → grava a recomendação sem ordens
  com `semOrdens` dizendo o que falta (o cartão da Carteira mostra). Conflito com o app → baixar, gravar e enviar de
  novo, até 3 vezes; outro erro → para (o registro da execução mostra). A revisão de 90 dias da lista também é
  automática, com as trocas explicadas no resumo. Nada é gravado no repositório público.
- **App**: os textos da Carteira passam a dizer que a análise sai sozinha no dia 26 (o pedido manual continua valendo);
  o cartão sem ordens mostra `semOrdens` (sem ele, o texto da reserva de hoje). Versão 90.

## Fora
Notificação no celular; rodar de novo sozinho depois que o Balanço for completado (ele pede `/onde-investir` ou roda a
rotina na hora pelo claude.ai).
