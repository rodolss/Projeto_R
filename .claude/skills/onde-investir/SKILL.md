---
name: onde-investir
description: Monta as ordens de compra do mês para a carteira de renda isenta do Projeto R (fundos imobiliários e ações boas pagadoras, comprados direto) e grava a recomendação no repositório privado de dados, para a Carteira e o Dia de pagamento mostrarem. Use quando o usuário pedir "/onde-investir", "onde investir este mês", "o que comprar" ou uma revisão da lista da carteira.
---

# Onde investir (desenho `docs/superpowers/specs/2026-11-22-onde-investir-design.md`)

O usuário não conhece investimentos e quer ordens objetivas: "compre X cotas de Y". Objetivo: viver de dividendos
isentos de IR e reinvestir tudo até a aposentadoria. Estratégia fixa: **50% fundos imobiliários (FIIs) e 50% ações boas
pagadoras**, comprados direto (não ETF). Reserva de emergência antes (o motor cuida). **Nunca vender.**

Os dados são pessoais e ficam no repositório privado: trabalhe numa pasta da pasta de rascunho da sessão, nunca no
repositório público, e não cite valores do usuário em commits, PRs ou arquivos do repositório público.

## Passos

1. **Baixar e ler o contexto**
   ```
   node scripts/onde-investir.mjs baixar --pasta <rascunho>/onde-investir
   node scripts/onde-investir.mjs contexto --pasta <rascunho>/onde-investir
   ```
   O contexto traz o mês das ordens (`mesDoInvestimento`: o do próximo Dia de pagamento — o mês do calendário enquanto
   ele não foi registrado, porque o Dia de pagamento registra o mês do calendário), quanto investir (a sobra do
   Balanço menos 10% de lazer; `previsao: true` se o mês ainda não fechou), quanto vai para a carteira depois da reserva
   e da caixa (`divisaoDoMotor.paraCarteira`: **é esse o valor das ordens**), a carteira atual e a lista atual.
   - Se o mês do calendário já fechou e o usuário não vai fazer o Dia de pagamento dele (ex.: começou a usar no mês
     seguinte), rode de novo com `--mes <mesEmFoco>`. Na dúvida, pergunte qual Dia de pagamento ele vai fazer.
   - `quantoInvestir.incompleto`: diga ao usuário o que falta no Balanço e pare.
   - `paraCarteira` zero (tudo foi para a reserva): diga isso; as ordens ficam vazias, mas ainda grave a lista.

2. **A lista da carteira** (estável): monte só se `listaAtual` for nula, se `ultimaAnalise.geradaEm` tiver mais de
   90 dias ou se o usuário pedir revisão. Senão, mantenha a lista (mudanças só com motivo forte, dito ao usuário).
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

3. **As ordens do mês**
   - Busque o preço de hoje de cada ativo da lista (cotação na B3).
   - Distribua `paraCarteira`: primeiro aproxime FIIs e ações de 50% cada; dentro de cada lado, compre os mais abaixo
     da `fatia` e, empatados, os mais baratos (P/VP menor nos FIIs, dividend yield sustentável maior nas ações).
   - **Cotas inteiras**; `valor = cotas × preço` (com o preço arredondado a centavos); a soma **não passa** de
     `paraCarteira`. Prefira poucas ordens (3 a 6) a dezenas de compras pequenas; o que as cotas inteiras não cobrirem
     o Dia de pagamento põe na caixa de oportunidade (Tesouro Selic), sozinho.
   - A `classe` de cada ordem é a mesma do ativo na lista.
   - `motivo` de cada ordem: por que ela recebe dinheiro este mês ("o lado dos FIIs está abaixo de 50%").

4. **Gravar e enviar**
   Escreva `<rascunho>/onde-investir/recomendacao.json`:
   ```json
   { "mes": "AAAA-MM", "geradaEm": "AAAA-MM-DD", "valor": <paraCarteira>,
     "estrategia": { "fiis": 0.5, "acoes": 0.5 },
     "lista": [{ "ticker": "XXXX11", "nome": "...", "classe": "fiis|acoes", "fatia": 0.06, "motivo": "..." }],
     "ordens": [{ "ticker": "XXXX11", "nome": "...", "classe": "fiis|acoes", "cotas": 10, "preco": 95.4, "valor": 954, "motivo": "..." }],
     "resumo": "duas ou três frases do porquê, para leigo",
     "avisos": ["preços de AAAA-MM-DD; confira antes de comprar", "..."] }
   ```
   ```
   node scripts/onde-investir.mjs gravar --pasta <rascunho>/onde-investir --recomendacao <rascunho>/onde-investir/recomendacao.json
   node scripts/onde-investir.mjs enviar --pasta <rascunho>/onde-investir
   ```
   `gravar` valida (cotas inteiras, valor = cotas × preço, soma dentro do valor, ordens só da lista e na classe dela,
   só fiis/acoes) e também põe a carteira-alvo do app em 50/50. Se `enviar` disser que o app gravou no meio, repita
   baixar → gravar → enviar; qualquer outro erro do GitHub, mostre ao usuário e pare. Apague a pasta de rascunho no fim.

5. **Responder ao usuário**, objetivo: a lista de ordens ("Compre 10 cotas de XXXX11 — ≈ R$ 954"), o total, o que fica
   para a reserva, e que a Carteira e o Dia de pagamento já mostram. Lembre: preços mudam durante o dia (compre perto do
   preço; se subiu muito, compre uma cota a menos), são exemplos e não recomendação profissional, e as regras de imposto
   são as de hoje (vale conferir com um contador quando a renda crescer).
