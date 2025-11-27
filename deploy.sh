#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with the following variables:"
    echo "  IQAIR_API_KEY=your_api_key"
    echo "  DB_PASSWORD=your_db_password"
    exit 1
fi

echo -e "${YELLOW}📦 Pulling latest changes...${NC}"
git pull origin main || git pull origin master

echo -e "${YELLOW}🐳 Building and restarting containers...${NC}"
docker-compose down
docker-compose up -d --build

echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Containers are running${NC}"
else
    echo -e "${RED}❌ Containers failed to start${NC}"
    docker-compose logs --tail 50
    exit 1
fi

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health || echo "failed")

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    docker-compose logs --tail 50
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Dashboard: http://localhost:3000"
echo "API Docs:  http://localhost:3000/docs"
echo "Health:    http://localhost:3000/health"
