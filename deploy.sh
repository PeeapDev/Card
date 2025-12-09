#!/bin/bash

# Three-Domain Deployment Script for Peeap
# This script deploys API, Checkout, and Merchant apps separately

set -e

echo "🚀 Peeap Three-Domain Deployment"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to deploy a specific config
deploy_project() {
    local config_file=$1
    local project_name=$2
    local description=$3

    echo -e "${BLUE}📦 Deploying ${description}...${NC}"
    echo ""

    # Backup current vercel.json
    if [ -f "vercel.json" ]; then
        cp vercel.json vercel.json.backup
    fi

    # Copy the specific config to vercel.json
    cp "$config_file" vercel.json

    # Deploy
    echo "Running: npx vercel --prod --yes"
    npx vercel --prod --yes

    # Restore backup
    if [ -f "vercel.json.backup" ]; then
        mv vercel.json.backup vercel.json
    fi

    echo -e "${GREEN}✅ ${description} deployed successfully!${NC}"
    echo ""
}

# Check if all config files exist
if [ ! -f "vercel.api.json" ] || [ ! -f "vercel.checkout.json" ] || [ ! -f "vercel.merchant.json" ]; then
    echo -e "${YELLOW}⚠️  Missing config files. Please ensure all three config files exist:${NC}"
    echo "   - vercel.api.json"
    echo "   - vercel.checkout.json"
    echo "   - vercel.merchant.json"
    exit 1
fi

# Ask which deployment to run
echo "Which deployment would you like to run?"
echo ""
echo "1) API only (api.peeap.com)"
echo "2) Checkout only (checkout.peeap.com)"
echo "3) Merchant only (my.peeap.com)"
echo "4) All three (sequential)"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        deploy_project "vercel.api.json" "api-peeap" "API (api.peeap.com)"
        ;;
    2)
        deploy_project "vercel.checkout.json" "checkout-peeap" "Checkout (checkout.peeap.com)"
        ;;
    3)
        deploy_project "vercel.merchant.json" "merchant-peeap" "Merchant (my.peeap.com)"
        ;;
    4)
        echo -e "${YELLOW}⚠️  This will deploy all three projects sequentially.${NC}"
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            deploy_project "vercel.api.json" "api-peeap" "API (api.peeap.com)"
            deploy_project "vercel.checkout.json" "checkout-peeap" "Checkout (checkout.peeap.com)"
            deploy_project "vercel.merchant.json" "merchant-peeap" "Merchant (my.peeap.com)"
            echo -e "${GREEN}🎉 All three projects deployed successfully!${NC}"
        else
            echo "Deployment cancelled."
            exit 0
        fi
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✨ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check the deployment URLs above"
echo "2. Configure custom domains in Vercel dashboard"
echo "3. Test each domain to ensure correct routing"
