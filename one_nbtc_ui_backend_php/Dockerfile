FROM php:8.3-cli

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy composer files first for layer caching
COPY composer.json composer.lock* ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy application files
COPY . .
COPY .env ./

EXPOSE 8001

CMD ["php", "-S", "0.0.0.0:8001", "-t", "public/"]