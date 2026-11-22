# Projeto R

Planejador pessoal de aposentadoria. Ao abrir, o app mostra **quanto falta para a renda plena** (seus investimentos pagando o seu salário inteiro), em anos e meses, e se isso diminuiu desde o mês passado. No dia do pagamento, ele responde **quanto separar para investir e onde aplicar**, sem tocar no seu custo de vida.

- **Estratégia:** carteira que paga renda desde o início (Tesouro IPCA+ com Juros Semestrais, fundos imobiliários, ETF de dividendos e uma parte no exterior), com os proventos reinvestidos até a aposentadoria.
- **Regras transparentes, sem prever o mercado:** reserva de emergência primeiro, rebalanceamento só com aportes (nunca vende), trajetória até a meta e uma caixa de oportunidade usada nas quedas.
- **Marcos no caminho:** reserva de emergência, Independência (pagar o custo de vida) e renda plena, com comemoração quando cada um chega.
- **Simulador "E se…?":** arraste quanto investe, o salário e o custo de vida e veja quanto falta em 4 cenários de mercado (ruim, moderado, normal e bom) e quanto seria preciso para chegar no alvo.
- **Os investimentos sugeridos são exemplos, não uma recomendação profissional.**

## Contas da casa

Um espaço separado da aposentadoria (**Mais › Contas da casa**) para dividir as contas da casa entre duas pessoas **em proporção à renda**: quem ganha mais paga mais, e cada um paga a mesma fatia do que ganha.

- **Mês:** o total das contas, quanto cada um paga e quanto sobra. Tocar num valor abre um campo só. Um mês novo já vem previsto com os últimos valores ("a confirmar") até alguém digitar o valor certo.
- **Contas pessoais:** abaixo das contas da casa, cada perfil pode ter as próprias contas de todo mês que não passam pelo cartão (um empréstimo, a academia). Só o dono vê; não entram na divisão, saem do Balanço dele e contam para o "Tudo pago". Uma conta com fim (quantas parcelas faltam) some depois da última e não entra no custo de vida do plano. "Pago" numa conta "a confirmar" também confirma o valor previsto.
- **Cartões:** cada um pode ter o seu cartão (botões no topo para trocar), usado para a casa, para si e para outras pessoas. Anote cada compra com a data e para quem é: o app descobre a fatura pelo melhor dia de compra e o vencimento, mostra quanto é de cada pessoa e leva a parte da casa para a conta do cartão nas contas da casa. Parceladas aparecem sozinhas nas faturas seguintes; assinaturas e contas fixas ("todo mês") aparecem em toda fatura até parar.
- **Ano:** quanto foi para as contas, quanto cada um pagou, mês a mês e para onde foi o dinheiro.
- **Perfis:** cada pessoa vê só os próprios cartões. O perfil de cada celular vem da chave do GitHub dele (uma chave nova pergunta uma vez "Quem usa este celular?"); o app guarda só a impressão da chave, nunca a chave. Um aparelho novo de quem administra (o computador, por exemplo) pede para ser liberado e ela libera em Ajustes da casa › Perfis e aparelhos, conferindo o código curto. Se ela perder o único aparelho de administradora, apague no GitHub, em `casa.json` do repositório de dados, a linha dela em `aparelhos`: o aparelho novo volta a poder escolher o perfil dela. Quem administra troca de perfil pela foto no canto (vê o app exatamente como a outra pessoa), cria perfis e cuida dos aparelhos em Ajustes da casa › Perfis e aparelhos; o planejador de aposentadoria é só dela. A conta da casa ligada ao cartão de outra pessoa mostra, só para ler, a parte da casa.
- **Dois celulares:** os dados ficam em `casa.json` no mesmo repositório privado. O app lembra o espaço usado em cada aparelho, então o celular de quem só usa as contas da casa abre direto nelas (e não recebe os lembretes da aposentadoria).
- **Vindo de uma planilha:** `node scripts/importar-planilha.mjs <planilha.xlsx> <saida.json>` converte a planilha antiga (uma aba por ano) num `casa.json`, com o cartão (a aba do cartão da casa e a aba pessoal de quem tem o cartão). Para trazer só o cartão para um `casa.json` que já existe: `node scripts/importar-cartao.mjs <planilha.xlsx> <casa-atual.json> <saida.json>`. As saídas têm dados pessoais: grave-as fora deste repositório e envie só para o repositório privado.

## App Android

Além do site, há um app Android: uma casca pequena que abre o site publicado, funciona sem internet depois da primeira abertura e lembra do dia do pagamento (5º dia útil ou um dia fixo, ajustável em Mais › Ajustes › Lembretes).

- **Baixar:** no celular, abra https://github.com/rodolss/Projeto_R/releases/latest e toque em `projeto-r.apk`.
- **Instalar:** libere "instalar apps desconhecidos" para o navegador quando o Android pedir e, se aparecer o aviso do Play Protect, toque em "Instalar mesmo assim".
- **Primeira abertura:** aceite as notificações quando o app pedir e cole a sua chave do GitHub (o app guarda as coisas separado do Chrome; crie uma chave nova "Projeto R (app Android)").
- **Backup:** exportar e importar backup só pelo computador.
- **Para quem mantém:** o APK é montado e assinado pelo GitHub Actions (`.github/workflows/android.yml`) a cada tag `android-vN`. A chave de assinatura fica nos segredos do repositório e numa cópia de segurança fora dele (`scripts/gerar-chave-android.sh`).

## Privacidade

Este repositório contém **apenas o código**. Os dados de quem usa o app ficam num repositório **privado** separado, acessado por uma chave do GitHub restrita a ele, e numa cópia local no navegador.

## Como rodar

Requer o [Node.js](https://nodejs.org/) LTS apenas para os testes e para o servidor local. O app em si é HTML, CSS e JavaScript puros, sem build.

```bash
npm test          # roda os testes
npm run servir    # abre em http://localhost:8080
node scripts/capturar-telas.mjs <pasta>   # fotografa as telas no tamanho de celular (claro e escuro), com dados de exemplo
node scripts/gerar-casa-exemplo.mjs casa.json && node scripts/capturar-telas.mjs <pasta> --rotas casa,casa-cartao,casa-ano,casa-ajustes --local casa.json
```

## Estrutura

- `js/core/`: regras e matemática financeira (módulos puros, testados).
- `js/dados/`: sincronização com o GitHub, cópia local e IPCA do Banco Central.
- `js/ui/`: telas (início, mês, simular, mais, orçamento, histórico, ajustes e assistente de boas-vindas; `casa*.js` são as contas da casa).
- `fontes/`: Inter e Sora (licença OFL), guardadas no app para funcionar sem internet.
- `docs/superpowers/`: design e plano de implementação.
