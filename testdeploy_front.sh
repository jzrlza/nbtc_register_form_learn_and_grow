# Start all three

# Remove old images
docker-compose stop frontend
docker-compose rm frontend
docker rmi -f nbtc_register_form_learn_and_grow_frontend 2>/dev/null || true

# Build with fresh tag
docker-compose build --no-cache frontend
docker-compose up -d frontend

docker-compose up -d database backend frontend

# Test frontend directly
curl -v http://localhost:3000

# Or open in text browser
docker exec frontend wget -qO- http://localhost:4173

# Check frontend container logs
docker-compose logs frontend