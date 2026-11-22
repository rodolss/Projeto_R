---
name: onde-investir
description: Monta as ordens de compra do mês para a carteira de renda isenta do Projeto R (fundos imobiliários e ações boas pagadoras, comprados direto) e grava a recomendação no repositório privado de dados, para a Carteira e o Dia de pagamento mostrarem. Use quando o usuário pedir "/onde-investir", "onde investir este mês", "o que comprar" ou uma revisão da lista da carteira.
---

# Onde investir (desenho `docs/superpowers/specs/2026-11-22-onde-investir-design.md`)

O usuário não conhece investimentos e quer ordens objetivas: "compre X cotas de Y". Objetivo: viver de dividendos
isentos de IR e reinvestir tudo até a aposentadoria. Estratégia fixa: **50% fundos imobiliários (FIIs) e 50% ações boas
pagadoras**, comprados direto (não ETF). Reserva de emergência antes (o motor cuida). **Nunca vender.**

Os dados são pessoais e ficam no repositório privado: trabalhe numa pasta da pasta de rascunho da sessão (na nuvem:
`/tmp/onde-investir`), nunca no repositório público, e não cite valores do usuário em commits, PRs ou arquivos do
repositório público. **Não faça commit nem push no repositório público.**

## Modo automático (rotina na nuvem, todo dia 26 às 19h — desenho `2026-11-22-onde-investir-agendado`)
Vale quando o pedido diz **"modo automático"** (o prompt da rotina, guardado no desenho). Ninguém está olhando: **não
pergunte nada e não chute**. Use o mês que o `contexto` der (sem `--mes`).
- Com `quantoInvestir.incompleto`: grave mesmo assim, com `"valor": 0`, `"ordens": []` e `semOrdens` dizendo em uma
  frase, com o nome do mês ("dezembro", não "2026-12"), o que falta e que basta pedir `/onde-investir` (ou rodar a
  rotina de novo no claude.ai) depois de completar — o cartão da Carteira mostra esse texto. A lista vai do mesmo jeito.
- Preço que não achou: pule só aquele ativo neste mês (as outras ordens seguem).
- Se `gravar` recusar, corrija o que ele apontou (confira de novo, troque o ativo que não passa) e grave de novo.
- Se `enviar` disser que o app gravou no meio, repita baixar → gravar → enviar, até 3 vezes. Erro do GitHub ou do `gh`
  que não seja esse: pare e termine com o erro (o registro da execução mostra).
- O que os passos mandam "dizer ao usuário" vai no `resumo` (é o que ele lê no app); a troca de um ativo da lista
  também (só com motivo forte).

## Passos

1. **Baixar e ler o contexto**
   ```
   node scripts/onde-investir.mjs baixar --pasta <rascunho>/onde-investir
   node scripts/onde-investir.mjs contexto --pasta <rascunho>/onde-investir
   ```
   O contexto traz o mês das ordens (`mesDoInvestimento`: o do próximo Dia de pagamento — o mês do calendário enquanto
   ele não foi registrado, porque o Dia de pagamento registra o mês do calendário —, nunca antes do mês da última
   análise), quanto investir (a sobra do Balanço menos 10% de lazer; `previsao: true` se o mês ainda não fechou), quanto
   vai para a carteira depois da reserva e da caixa (`divisaoDoMotor.paraCarteira`: **é esse o valor das ordens**), a
   carteira atual, a lista atual e a liquidez mínima (`liquidezMinima`).
   - Pedido à mão, com o mês do calendário já fechado e sem o Dia de pagamento dele: rode de novo com
     `--mes <mesEmFoco>`. Na dúvida, pergunte qual Dia de pagamento ele vai fazer (no modo automático, não pergunte).
   - `quantoInvestir.incompleto`: `"valor": 0`, `"ordens": []` e `semOrdens` ("Faltam os salários de dezembro no
     Balanço; ..."). Num pedido à mão, diga também ao usuário o que falta.
   - `paraCarteira` zero (tudo foi para a reserva): as ordens ficam vazias (o cartão diz que vai para a reserva), mas
     ainda grave a lista.

2. **A lista da carteira** (estável): monte ou reveja só quando o `contexto` disser `revisarLista: true` (sem lista,
   algum ativo sem conferência válida ou a conferência mais antiga com mais de 90 dias) ou quando o usuário pedir.
   Rever é conferir de novo cada ativo (regras abaixo, com o `conferido` de hoje) e trocar o que não passar. Senão,
   mantenha a lista (mudanças só com motivo forte, dito ao usuário).
   Pesquise na web (dados atuais: Status Invest, Investidor10, Funds Explorer, RI das empresas) e escolha:
   - **8 a 10 FIIs** de tipos diferentes: logística, shoppings, lajes corporativas, renda urbana e de papel (CRI high
     grade); patrimônio e liquidez altos, muitos cotistas (a isenção exige ≥ 100 cotistas e negociação em bolsa),
     histórico de rendimentos estável, vacância baixa, P/VP razoável; no máximo 20% do lado dos FIIs em um fundo.
   - **8 a 10 ações** de setores perenes: bancos, energia elétrica (transmissão, geração), saneamento, seguros,
     telecom; empresas lucrativas, com dividendos pagos há muitos anos, dívida controlada e boa liquidez; prefira as
     que pagam mais em dividendo que em JCP (JCP tem 15% de IR); no máximo 20% do lado das ações em uma empresa e dois
     do mesmo setor no máximo.
   - `fatia` de cada ativo: a parte dele no total da carteira (os FIIs somam 0,5 e as ações 0,5).
   - `motivo`: uma frase simples, sem jargão ("galpões alugados para grandes empresas, rendimento todo mês").
   - **Só o que ele consegue comprar** (pessoa física comum, sem R$ 1 milhão aplicado). Fora da lista:
     1. fundo ou papel só para investidor **qualificado ou profissional** (veja o público-alvo no regulamento ou na
        página do fundo);
     2. o que não se compra direto na bolsa, na hora: IPO, oferta, subscrição, fundo fechado para entrada, negociação
        suspensa, recuperação judicial;
     3. cota ou ação cujo preço não cabe no dinheiro de um lado (FIIs ou ações) de um mês típico;
     4. pouco negociado: média diária abaixo de `liquidezMinima` (R$ 1 milhão nos FIIs, R$ 5 milhões nas ações).
     Registre a conferência em cada ativo: `"conferido": { "publicoGeral": true, "liquidezDiaria": <média diária em
     R$>, "em": "AAAA-MM-DD" }` (`em` = o `hoje` do `contexto`). `gravar` recusa ativo sem conferência, com liquidez
     abaixo do mínimo ou conferido há mais de 120 dias.

3. **As ordens do mês**
   - Busque o preço de hoje de cada ativo da lista (cotação na B3).
   - Distribua `paraCarteira`: primeiro aproxime FIIs e ações de 50% cada; dentro de cada lado, compre os mais abaixo
     da `fatia` e, empatados, os mais baratos (P/VP menor nos FIIs, dividend yield sustentável maior nas ações).
   - **Cotas inteiras**; `valor = cotas × preço` (com o preço arredondado a centavos); a soma **não passa** de
     `paraCarteira`. Prefira poucas ordens (3 a 6) a dezenas de compras pequenas; o que as cotas inteiras não cobrirem
     o Dia de pagamento põe na caixa de oportunidade (Tesouro Selic), sozinho.
   - A `classe` de cada ordem é a mesma do ativo na lista.
   - `motivo` de cada ordem: por que ela recebe dinheiro este mês ("o lado dos FIIs está abaixo de 50%").
   - **Avisos práticos** (em `avisos`, quando houver ordens): ação em menos de 100 unidades se compra no mercado
     fracionário, com o código terminado em F (ex.: TAEE11F); a corretora pode pedir o questionário de perfil de
     investidor antes da primeira compra de FII ou ação; sem FII nem ação na `carteiraAtual`, é preciso uma conta numa
     corretora (as de taxa zero bastam).

4. **Gravar e enviar**
   Escreva `<rascunho>/onde-investir/recomendacao.json`:
   ```json
   { "mes": "AAAA-MM", "geradaEm": "AAAA-MM-DD", "valor": <paraCarteira>,
     "estrategia": { "fiis": 0.5, "acoes": 0.5 },
     "lista": [{ "ticker": "XXXX11", "nome": "...", "classe": "fiis|acoes", "fatia": 0.06, "motivo": "...",
                 "conferido": { "publicoGeral": true, "liquidezDiaria": 8500000, "em": "AAAA-MM-DD" } }],
     "ordens": [{ "ticker": "XXXX11", "nome": "...", "classe": "fiis|acoes", "cotas": 10, "preco": 95.4, "valor": 954, "motivo": "..." }],
     "semOrdens": "só quando não há ordens por algo que falta (veja o modo automático)",
     "resumo": "duas ou três frases do porquê, para leigo",
     "avisos": ["preços de AAAA-MM-DD; confira antes de comprar", "..."] }
   ```
   ```
   node scripts/onde-investir.mjs gravar --pasta <rascunho>/onde-investir --recomendacao <rascunho>/onde-investir/recomendacao.json
   node scripts/onde-investir.mjs enviar --pasta <rascunho>/onde-investir
   ```
   `gravar` valida (cotas inteiras, valor = cotas × preço, soma dentro do valor, ordens só da lista e na classe dela,
   só fiis/acoes, a conferência de cada ativo) e também põe a carteira-alvo do app em 50/50. Se `enviar` disser que o
   app gravou no meio, repita baixar → gravar → enviar (até 3 vezes); qualquer outro erro do GitHub, mostre ao usuário e
   pare. Apague a pasta de rascunho no fim.

5. **Responder ao usuário**, objetivo: a lista de ordens ("Compre 10 cotas de XXXX11 — ≈ R$ 954"), o total, o que fica
   para a reserva, e que a Carteira e o Dia de pagamento já mostram. Lembre: preços mudam durante o dia (compre perto do
   preço; se subiu muito, compre uma cota a menos), são exemplos e não recomendação profissional, e as regras de imposto
   são as de hoje (vale conferir com um contador quando a renda crescer).
