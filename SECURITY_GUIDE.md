# Security Configuration for Production

## 1. Environment Variables (.env)
```env
# Production Security Settings
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:your-32-character-random-string

# Session Security
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# Database Security
DB_CONNECTION=mysql
# Never expose DB credentials
```

## 2. Server Security Headers (.htaccess)
```apache
# Security Headers
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"

# Hide Server Information
ServerTokens Prod
ServerSignature Off
```

## 3. File Permissions
```bash
# Set proper file permissions
find /path/to/app -type f -exec chmod 644 {} \;
find /path/to/app -type d -exec chmod 755 {} \;
chmod -R 775 storage bootstrap/cache
```

## 4. Security Checklist

### ✅ Currently Implemented:
- [x] Password hashing (bcrypt)
- [x] CSRF protection
- [x] SQL injection prevention (Eloquent ORM)
- [x] Role-based access control
- [x] Auto logout (10 minutes)
- [x] Input validation
- [x] Session invalidation on logout

### ⚠️ Additional Security Measures:
- [ ] Rate limiting for login attempts
- [ ] Security headers middleware
- [ ] File upload validation
- [ ] Two-factor authentication (optional)
- [ ] Security monitoring & logging
- [ ] Regular security updates

## 5. Hosting Security Features (RumahWeb)
- ✅ SSL Certificate (Let's Encrypt)
- ✅ Monarx Security (Malware protection)
- ✅ Weekly backups
- ✅ Server-level firewall
- ✅ DDoS protection

## 6. Security Monitoring
```php
// Log security events
Log::warning('Failed login attempt', [
    'ip' => $request->ip(),
    'user_agent' => $request->userAgent(),
    'timestamp' => now()
]);
```
