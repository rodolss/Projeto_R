# Perfis nas contas da casa — desenho

Data: 2026-11-20. Decisões do usuário numa entrevista (Q1–Q8). Exemplos com nomes INVENTADOS (Ana é a
administradora; Leo é a outra pessoa; o repositório é público).

## Por quê

Cada pessoa da casa quer o seu espaço: o cartão da Ana não aparece para o Leo e vice-versa. A Ana administra:
troca de perfil (para ver o app exatamente como o Leo vê, para ajudar e para refinar o app) e cria perfis.
O Leo não troca de perfil.

## Decisões

- **Q1 — Separação só no app.** Os dados continuam no mesmo casa.json do repositório privado; quem tem uma
  chave e conhecimento técnico leria o arquivo. O app é que não mostra.
- **Q2/Q7 — O perfil vem da chave do GitHub do aparelho, sem PIN.** O app guarda a "impressão" da chave
  (SHA-256 do texto da chave, 16 primeiros caracteres hexadecimais; nunca a chave) ligada a um perfil, em
  `aparelhos` do casa.json. Chave sem ligação: o app pergunta uma vez "Quem usa este celular?". Chave ligada:
  sempre aquele perfil. Só quem administra muda a ligação (Ajustes da casa › Perfis e aparelhos). É seguro sem
  PIN porque só a administradora cria chaves (saem da conta dela no GitHub). Aparelho sem conexão (só local):
  sem perfis, tudo como antes.
- **Perfis iniciais:** um por pessoa da casa (mesmo id: `p1`, `p2`); `p1` (quem começou as contas da casa) é
  administradora. Renomear a pessoa renomeia o perfil.
- **Q3 — O que cada perfil vê:** Mês, Ano e Ajustes da casa para todos; cada um só vê e edita os próprios
  cartões; gerenciar perfis e aparelhos e o planejador de aposentadoria só para quem administra (e só quando
  está vendo o próprio perfil).
- **Q4 — Conta ligada ao cartão de outra pessoa:** tocar nela no Mês mostra, só para ler, as compras da casa e
  as de todo mês da casa daquela fatura. Nada do que é pessoal, nem o que foi comprado para quem está vendo (pode
  ser presente). Essa conta não pode ser renomeada, arquivada nem deixar de ser "compra por compra" por quem não
  é dono do cartão.
- **Q5 — Perfis novos:** têm cartões próprios e não entram na divisão das contas (que continua entre as duas
  pessoas da casa). Só quem administra cria.
- **Q6 — No perfil de outra pessoa, quem administra faz tudo o que ela faz, e a tela é idêntica à dela.**
- **Q8 — Foto no canto, como no YouTube:** um círculo no canto de cima (foto, ou a inicial sobre uma cor).
  Tocar abre um menu: quem administra vê a lista de perfis e troca (a troca vale só neste aparelho); todos podem
  trocar a própria foto (a do perfil que está vendo); quem administra vê também "Perfis e aparelhos".
  A foto é reduzida no aparelho (160 × 160, JPEG) e guardada no casa.json. No app Android, escolher foto exige
  o APK novo (a casca passa a abrir o seletor de arquivos); publicar o APK depende do ok do usuário.

## Modelo (casa.json, schemaVersion 4)

```
perfis:    [{ id, nome, admin?: true, foto?: 'data:image/jpeg;base64,…' }]
aparelhos: [{ id: '<impressão da chave>', perfilId, desde: 'AAAA-MM-DD' }]   // perfilId null: pedido esperando liberação
```

Migração 3 → 4 (igual nos dois celulares): um perfil por pessoa, `p1` administradora; `aparelhos: []`.
O dono de um cartão (`donaId`) é um id de perfil (para as duas pessoas, o mesmo id da pessoa).

## Abordagens

1. **Perfil pela chave, guardado no casa.json (escolhida).** Sem PIN, sem servidor; usa o que o app já tem.
2. PIN de administradora. O usuário recusou (Q2).
3. Ler o nome da chave no GitHub. Impossível: o GitHub não informa ao app qual chave está em uso.

## Fora do escopo

Proteção de verdade (Q1 b); mais de uma administradora; o planejador de aposentadoria com perfis próprios.
