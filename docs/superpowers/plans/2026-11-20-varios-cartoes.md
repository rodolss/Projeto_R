# Vários cartões Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Um cartão por pessoa (ou mais), cada um com dono, dias, conta da casa e "todo mês" próprios.

**Architecture:** casa.json v3: `cartoes[]` (id = contaId) e `outrasPessoas[]`. O núcleo (`js/core/cartao.js`) passa a receber `cartaoId`; a tela escolhe o cartão pelo endereço ou pelo último usado no aparelho.

**Spec:** `docs/superpowers/specs/2026-11-19-cartao-design.md` (§Vários cartões)

## Global Constraints

- Sem nomes reais nem valores da planilha nos arquivos do repositório.
- Migração determinística (os dois celulares migram sozinhos e depois juntam).
- `VERSAO` = `projeto-r-v8` no sw.js e em js/versao.js.

## Review Focus

1. Base v2 num celular e remoto v3 no outro: a mescla não perde nem duplica o cartão.
2. Conta da casa de cada cartão soma só a parte da casa daquele cartão (e as de todo mês dele).
3. Endereço com cartão que não existe mais: abre outro cartão, sem erro.
4. Tirar um cartão com compras não pode acontecer.

### Task 1: núcleo v3 (casa.js, cartao.js, mescla) — testes em tests/core e tests/dados
### Task 2: tela, Ajustes, Mês, gerador de exemplo — testes dos auxiliares em tests/ui; ensaio no navegador
### Task 3: importador v3, versão 8, README — tests/scripts; correção única dos dados reais (fora do repositório)
