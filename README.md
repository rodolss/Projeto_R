# Projeto R

Planejador pessoal de aposentadoria. Ao abrir, o app mostra **quanto falta para a renda plena** (seus investimentos pagando o seu salário inteiro), em anos e meses, e se isso diminuiu desde o mês passado. No dia do pagamento, ele responde **quanto separar para investir e onde aplicar**, sem tocar no seu custo de vida.

- **Estratégia:** carteira que paga renda desde o início (Tesouro IPCA+ com Juros Semestrais, fundos imobiliários, ETF de dividendos e uma parte no exterior), com os proventos reinvestidos até a aposentadoria.
- **Regras transparentes, sem prever o mercado:** reserva de emergência primeiro, rebalanceamento só com aportes (nunca vende), trajetória até a meta e uma caixa de oportunidade usada nas quedas.
- **Marcos no caminho:** reserva de emergência, Independência (pagar o custo de vida) e renda plena, com comemoração quando cada um chega.
- **Simulador "E se…?":** arraste quanto investe, o salário e o custo de vida e veja quanto falta em 4 cenários de mercado (ruim, moderado, normal e bom) e quanto seria preciso para chegar no alvo.
- **Os investimentos sugeridos são exemplos, não uma recomendação profissional.**

## Privacidade

Este repositório contém **apenas o código**. Os dados de quem usa o app ficam num repositório **privado** separado, acessado por uma chave do GitHub restrita a ele, e numa cópia local no navegador.

## Como rodar

Requer o [Node.js](https://nodejs.org/) LTS apenas para os testes e para o servidor local. O app em si é HTML, CSS e JavaScript puros, sem build.

```bash
npm test          # roda os testes
npm run servir    # abre em http://localhost:8080
node scripts/capturar-telas.mjs <pasta>   # fotografa as telas no tamanho de celular (claro e escuro), com dados de exemplo
```

## Estrutura

- `js/core/`: regras e matemática financeira (módulos puros, testados).
- `js/dados/`: sincronização com o GitHub, cópia local e IPCA do Banco Central.
- `js/ui/`: telas (início, mês, simular, mais, orçamento, histórico, ajustes e assistente de boas-vindas).
- `fontes/`: Inter e Sora (licença OFL), guardadas no app para funcionar sem internet.
- `docs/superpowers/`: design e plano de implementação.
