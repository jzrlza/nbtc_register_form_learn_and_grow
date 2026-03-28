FROM php:8.3-cli

WORKDIR /app

# Copy composer files first for layer caching
COPY composer.json composer.lock* ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy application files
COPY . .
COPY .env ./

EXPOSE 8000

CMD ["php", "-S", "0.0.0.0:8000", "-t", "public/"]