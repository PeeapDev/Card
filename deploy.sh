#!/bin/bash
# Deploy script for individual projects
# Usage: ./deploy.sh [project]

set -e

PROJECT=$1
BASE_DIR="/Users/local_server/soft-touch2/project/card"

if [ -z "$PROJECT" ]; then
  echo "Usage: ./deploy.sh [project]"
  echo ""
  echo "Available projects:"
  echo "  web      - my.peeap.com (main web app)"
  echo "  checkout - checkout.peeap.com"
  echo "  plus     - plus.peeap.com"
  echo "  api      - api.peeap.com"
  echo "  all      - deploy all (4 deployments)"
  exit 1
fi

deploy_web() {
  echo "🚀 Deploying web (my.peeap.com)..."
  cd "$BASE_DIR"
  npx vercel --prod --yes
}

deploy_checkout() {
  echo "🚀 Deploying checkout (checkout.peeap.com)..."
  cd "$BASE_DIR"
  # Backup current .vercel config
  if [ -d ".vercel" ]; then
    mv .vercel .vercel-backup
  fi
  # Link to checkout project and deploy
  npx vercel link --project peeap-checkout --yes
  npx vercel --prod --yes --build-env VITE_APP_MODE=checkout
  # Restore main project link
  rm -rf .vercel
  if [ -d ".vercel-backup" ]; then
    mv .vercel-backup .vercel
  else
    npx vercel link --project card --yes
  fi
}

deploy_plus() {
  echo "🚀 Deploying plus (plus.peeap.com)..."
  cd "$BASE_DIR/apps/plus"
  npx vercel --prod --yes
}

deploy_api() {
  echo "🚀 Deploying api (api.peeap.com)..."
  cd "$BASE_DIR/api-deploy"
  npx vercel --prod --yes
}

case $PROJECT in
  web)
    deploy_web
    ;;
  checkout)
    deploy_checkout
    ;;
  plus)
    deploy_plus
    ;;
  api)
    deploy_api
    ;;
  all)
    deploy_web
    deploy_checkout
    deploy_plus
    deploy_api
    echo ""
    echo "⚠️  Used 4 deployments!"
    ;;
  *)
    echo "Unknown project: $PROJECT"
    exit 1
    ;;
esac

echo ""
echo "✓ Deployment complete!"
