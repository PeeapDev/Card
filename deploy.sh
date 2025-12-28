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
  echo "  docs     - docs.peeap.com"
  echo "  all      - deploy all (5 deployments)"
  exit 1
fi

run_smoke_tests() {
  echo "🧪 Running smoke tests..."
  if node "$BASE_DIR/tests/smoke/test-api.js" prod; then
    echo "✓ Smoke tests passed"
  else
    echo ""
    echo "❌ Smoke tests failed - deployment blocked!"
    echo "Fix the API before deploying."
    exit 1
  fi
}

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
  echo ""
  echo "Running pre-deployment validation..."
  # ZERO TOLERANCE: Validate before any API deployment
  if ! node "$BASE_DIR/scripts/validate-api-deploy.js"; then
    echo ""
    echo "❌ API deployment blocked due to validation errors!"
    echo "See DEPLOYMENT_RULES.ts for requirements."
    exit 1
  fi
  echo ""
  cd "$BASE_DIR/api-deploy"
  npx vercel --prod --yes
  echo ""
  # Run smoke tests after deployment to verify API is working
  run_smoke_tests
}

deploy_docs() {
  echo "🚀 Deploying docs (docs.peeap.com)..."
  cd "$BASE_DIR/docs"
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
  docs)
    deploy_docs
    ;;
  all)
    deploy_web
    deploy_checkout
    deploy_plus
    deploy_api
    deploy_docs
    echo ""
    echo "⚠️  Used 5 deployments!"
    ;;
  *)
    echo "Unknown project: $PROJECT"
    exit 1
    ;;
esac

echo ""
echo "✓ Deployment complete!"
