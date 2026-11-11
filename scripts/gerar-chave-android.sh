#!/usr/bin/env bash
# Gera, UMA VEZ, a chave que assina o app Android e cadastra os segredos no GitHub (spec do app Android, §7).
# Precisa só do OpenSSL e do gh (ambos no Git Bash). Nada é gravado no repositório.
#
# Uso: bash scripts/gerar-chave-android.sh "<pasta de backup fora do repositório>"
#
# Guarde a pasta de backup: sem essa chave, atualizar o app exige desinstalar e instalar de novo.
set -euo pipefail

PASTA="${1:?Informe a pasta de backup (fora do repositório)}"

if gh secret list | grep -q '^ANDROID_KEYSTORE_B64'; then
  echo "Os segredos do app Android já existem no GitHub. Não gero outra chave: trocar a chave obrigaria a desinstalar o app."
  exit 1
fi
mkdir -p "$PASTA"
if [ -e "$PASTA/projetor.p12" ]; then
  echo "Já existe uma chave em $PASTA. Apague-a só se tiver certeza."
  exit 1
fi

TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT

SENHA="$(openssl rand -base64 33 | tr -d '/+=\n' | cut -c1-32)"
# MSYS2_ARG_CONV_EXCL: no Git Bash, impede que "/CN=..." vire um caminho do Windows (os caminhos de arquivo continuam convertidos).
MSYS2_ARG_CONV_EXCL='/CN=' openssl req -x509 -newkey rsa:4096 -sha256 -days 10000 -nodes \
  -subj "/CN=Projeto R" -keyout "$TEMP/chave.pem" -out "$TEMP/certificado.pem" 2>/dev/null
openssl pkcs12 -export -name projetor -inkey "$TEMP/chave.pem" -in "$TEMP/certificado.pem" \
  -out "$PASTA/projetor.p12" -passout "pass:$SENHA"
printf '%s\n' "$SENHA" > "$PASTA/senha.txt"

base64 -w0 "$PASTA/projetor.p12" | gh secret set ANDROID_KEYSTORE_B64
printf '%s' "$SENHA" | gh secret set ANDROID_KEYSTORE_SENHA
printf '%s' 'projetor' | gh secret set ANDROID_KEY_ALIAS

echo "Chave criada e cadastrada no GitHub. Cópia de segurança em: $PASTA"
