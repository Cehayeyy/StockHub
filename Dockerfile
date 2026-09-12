# Menggunakan base image PHP 8.2 dengan Apache (web server)
FROM php:8.2-apache

# Menginstal dependensi sistem dan ekstensi PHP yang dibutuhkan Laravel & AWS SDK
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Mengaktifkan modul Apache Rewrite (wajib untuk routing Laravel)
RUN a2enmod rewrite

# Mengubah DocumentRoot Apache agar mengarah ke folder /public Laravel
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Menginstal Composer secara global
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Menetapkan direktori kerja di dalam kontainer
WORKDIR /var/www/html

# Menyalin seluruh kode proyek ke dalam kontainer
COPY . .

# Memberikan hak akses folder storage dan cache ke web server
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache