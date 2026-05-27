# 1. Menggunakan base image PHP 8.3 dengan Apache
FROM php:8.3-apache

# 2. Instal dependensi sistem dan ekstensi PHP yang dibutuhkan Laravel
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql gd

# 3. Aktifkan modul mod_rewrite milik Apache untuk routing Laravel
RUN a2enmod rewrite

# 4. Ubah Document Root Apache agar mengarah ke folder public Laravel
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

# 5. Tentukan working directory di dalam kontainer
WORKDIR /var/www/html

# 6. Salin seluruh source code proyek StockHub ke dalam kontainer
COPY . .

# 7. Berikan hak akses (permissions) folder storage dan bootstrap cache ke Apache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# 8. Jalankan Apache di port 80
EXPOSE 80