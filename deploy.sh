cp .env.example .env
echo "Please edit .env file with your credentials"
nano .env
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key \
  -out ssl/certificate.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
docker-compose up -d --build
echo "Application is starting... Check logs with: docker-compose logs -f"