# Start database + backend
docker-compose up -d database backend

# Check logs
docker-compose logs backend

# Test backend API
curl -v http://localhost:5000
curl -v http://localhost:5000/api/health
curl -v http://localhost:5000/api/test

# Check backend can connect to database
docker exec backend sh -c "nc -zv database 3306"