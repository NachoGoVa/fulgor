#!/usr/bin/env bash
# Despliegue de FULGOR a AWS (patrón NGV: S3 privado + OAC + CloudFront).
# No hay paso de build: se sube la carpeta tal cual.
#
#   ./deploy.sh
#
# ⚠️ Antes de desplegar cambios, sube VERSION en sw.js — es lo que invalida la
#    caché local de quien ya tenga el juego abierto.
set -euo pipefail

BUCKET=fulgor-prod-web
DIST=E1XQE2XM9YRDY8
cd "$(dirname "$0")"

# Lo que NO se publica: servidor de desarrollo, tests, docs internas y metadatos.
#
# ⚠️ '.git/*' NO basta: al desplegar desde un worktree, `.git` es un FICHERO, no una
#    carpeta, y ese patrón no lo captura. El 9-ago-2026 acabó publicado en
#    https://fulgor.ngv.digital/.git filtrando la ruta local del disco. Por eso van
#    los dos patrones. Lo mismo con 'docs/': eran notas de diseño internas servidas
#    en abierto.
EXCLUDES=(
  --exclude '.git' --exclude '.git/*' --exclude 'test/*' --exclude 'node_modules/*'
  --exclude 'docs/*'
  --exclude 'serve.mjs' --exclude 'deploy.sh' --exclude 'package.json'
  --exclude 'CLAUDE.md' --exclude '.gitignore'
  --exclude 'README.md' --exclude 'LICENSE' --exclude '.claude/*'
)

# ⚠️ Despliega EL DIRECTORIO DE TRABAJO tal cual, y con --delete. Si ejecutas
# esto desde una rama vieja te cargas la versión buena en producción: pasó el
# 9-ago-2026, se publicó v1 encima de v2 «El operario». Antes de desplegar:
#   git fetch origin && git status -sb   # ¿estás al día con origin/main?
git fetch -q origin 2>/dev/null || true
if git rev-parse --verify -q origin/main >/dev/null; then
  BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
  if [ "${BEHIND:-0}" -gt 0 ]; then
    echo "✖ ABORTADO: estás $BEHIND commit(s) por detrás de origin/main." >&2
    echo "  Desplegar ahora publicaría una versión antigua. Haz 'git pull' primero." >&2
    exit 1
  fi
fi

echo "→ Subiendo assets (caché larga)…"
# Todo menos los tres ficheros que deben revalidarse siempre.
aws s3 sync . "s3://$BUCKET" --delete "${EXCLUDES[@]}" \
  --exclude 'index.html' --exclude 'sw.js' --exclude 'manifest.webmanifest' \
  --cache-control 'public, max-age=86400'

echo "→ Subiendo index.html / sw.js / manifest (sin caché)…"
# Estos tres mandan sobre el resto: si se cachean, nadie ve nunca una versión nueva.
aws s3 cp index.html "s3://$BUCKET/index.html" \
  --cache-control 'public, max-age=0, must-revalidate' --content-type 'text/html; charset=utf-8'
aws s3 cp sw.js "s3://$BUCKET/sw.js" \
  --cache-control 'public, max-age=0, must-revalidate' --content-type 'text/javascript; charset=utf-8'
aws s3 cp manifest.webmanifest "s3://$BUCKET/manifest.webmanifest" \
  --cache-control 'public, max-age=0, must-revalidate' --content-type 'application/manifest+json'

echo "→ Invalidando CloudFront…"
ID=$(aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/*' \
  --query 'Invalidation.Id' --output text)
echo "   invalidación $ID"

echo "✔ https://fulgor.ngv.digital"
