# StockHub - Hosting Setup Guide

## ✅ Kompatibilitas dengan RumahWeb Medium

Aplikasi StockHub **100% kompatibel** dengan hosting RumahWeb Medium karena:

- ✅ Laravel 11 (PHP 8.2+)
- ✅ React + TypeScript (di-build menjadi static)
- ✅ MySQL Database
- ✅ Node.js untuk build process
- ✅ SSH Access untuk deployment

## 🚀 Cara Deploy ke RumahWeb

### 1. Persiapan Files
```bash
# Build production assets
npm run build

# Hapus development files
rm -rf node_modules
rm -rf .git
```

### 2. Upload ke Hosting
- Upload semua files ke folder `public_html/`
- Point domain ke folder `public/` sebagai document root

### 3. Setup Database
- Buat database MySQL di cPanel
- Import file `database.sql` (jika ada)
- Update `.env` dengan kredensial database

### 4. Konfigurasi via SSH
```bash
# Masuk via SSH
ssh username@yourhost.com

# Install dependencies
composer install --no-dev --optimize-autoloader

# Setup Laravel
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
chmod -R 755 storage bootstrap/cache
```

### 5. Optimisasi Hosting

#### A. Redis Cache (Memanfaatkan Redis Object Cache)
```env
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

#### B. Database Optimisasi
```env
DB_CONNECTION=mysql
# Gunakan kredensial dari hosting
```

#### C. SSL Setup
- Hosting sudah include Free SSL Let's Encrypt
- Update APP_URL dengan https://

## 🔧 Konfigurasi Khusus RumahWeb

### .htaccess untuk Public Folder
```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

### File Struktur di Hosting
```
public_html/
├── app/
├── bootstrap/
├── config/
├── database/
├── public/          # Document root points here
│   ├── index.php
│   ├── build/       # Compiled assets
│   └── images/
├── resources/
├── routes/
├── storage/
├── vendor/
├── .env
├── composer.json
└── artisan
```

## 🎯 Performance Tips untuk RumahWeb

1. **Aktifkan OPcache** (biasanya sudah default)
2. **Gunakan Redis** untuk session & cache
3. **Enable Gzip Compression**
4. **Optimize Images** sebelum upload
5. **Gunakan CDN** jika diperlukan

## 📞 Support

Jika ada kendala deployment:
1. Cek error log di cPanel
2. Pastikan PHP version 8.2+
3. Verifikasi database connection
4. Check file permissions (755/644)

## 🚀 Post-Deployment Checklist

- [ ] Website bisa diakses
- [ ] Login system berfungsi
- [ ] Database connection OK
- [ ] File upload berfungsi
- [ ] Email notification (jika ada)
- [ ] SSL certificate active
- [ ] Performance optimization applied
