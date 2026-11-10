# Projeto R

Planejador pessoal de aposentadoria. No dia do pagamento, você informa quanto caiu na conta e o app responde **quanto separar para investir e onde aplicar**, sem tocar no seu custo de vida. Um painel mostra se você está no caminho da meta.

- **Estratégia:** carteira que paga renda desde o início (Tesouro IPCA+ com Juros Semestrais, fundos imobiliários, ETF de dividendos e uma parte no exterior), com os proventos reinvestidos até a aposentadoria.
- **Regras transparentes, sem prever o mercado:** reserva de emergência primeiro, rebalanceamento só com aportes (nunca vende), trajetória até a meta e uma caixa de oportunidade usada nas quedas.
- **Os investimentos sugeridos são exemplos, não uma recomendação profissional.**

## Privacidade

Este repositório contém **apenas o código**. Os dados de quem usa o app ficam num repositório **privado** separado, acessado por uma chave do GitHub restrita a ele, e numa cópia local no navegador.

## Como rodar

Requer o [Node.js](https://nodejs.org/) LTS apenas para os testes e para o servidor local. O app em si é HTML, CSS e JavaScript puros, sem build.

```bash
npm test          # roda os testes
npm run servir    # abre em http://localhost:8080
```

## Estrutura

- `js/core/`: regras e matemática financeira (módulos puros, testados).
- `js/dados/`: sincronização com o GitHub, cópia local e IPCA do Banco Central.
- `js/ui/`: telas (mês, painel, orçamento, histórico, ajustes e assistente).
- `docs/superpowers/`: design e plano de implementação.
