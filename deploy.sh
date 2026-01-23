#!/bin/bash
# Deployment Script untuk StockHub di RumahWeb

echo "🚀 Starting StockHub Deployment..."

# 1. Upload files via SSH/FTP
echo "📁 Upload semua files ke public_html/"

# 2. Install Composer dependencies
echo "📦 Installing Composer dependencies..."
composer install --optimize-autoloader --no-dev

# 3. Setup Environment
echo "⚙️ Setting up environment..."
cp .env.example .env

# 4. Generate Application Key
echo "🔑 Generating application key..."
php artisan key:generate

# 5. Setup Database
echo "🗄️ Setting up database..."
php artisan migrate --force
php artisan db:seed --force

# 6. Build Frontend Assets
echo "🎨 Building frontend assets..."
npm install
npm run build

# 7. Cache Configuration
echo "⚡ Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 8. Set Permissions
echo "🔒 Setting permissions..."
chmod -R 755 storage
chmod -R 755 bootstrap/cache

# 9. Setup Storage Link
echo "🔗 Creating storage link..."
php artisan storage:link

echo "✅ Deployment completed successfully!"
echo "🌐 Your StockHub is now live!"
