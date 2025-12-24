#!/bin/bash

# Установка существующего SSL сертификата
# Использование: ./install-ssl-certificate.sh

set -e

DOMAIN="profitech.store"
WWW_DOMAIN="www.profitech.store"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

echo "🔒 Установка SSL сертификата для $DOMAIN..."
echo ""

# Создаем директорию для сертификата
echo "1️⃣ Создание директории для сертификата..."
sudo mkdir -p "$CERT_DIR"
echo "   ✅ Директория создана: $CERT_DIR"
echo ""

# 2. Сохраняем сертификат
echo "2️⃣ Сохранение сертификата..."
sudo tee "$CERT_DIR/fullchain.pem" > /dev/null <<'CERT_EOF'
-----BEGIN CERTIFICATE-----
MIIFFDCCA/ygAwIBAgISBUvoqmFubJA+Pp5b3YaTPmaaMA0GCSqGSIb3DQEBCwUA
MDMxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQwwCgYDVQQD
EwNSMTIwHhcNMjUxMjIzMTg0ODQwWhcNMjYwMzIzMTg0ODM5WjAaMRgwFgYDVQQD
Ew9wcm9maXRlY2guc3RvcmUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
AQC1rBP8Lnm0fz/jqZnhwGSxphLtZwZoFDASPnhZIdz3JHxDRC4kQ0Qis1m7ifRX
ZU+kocUszh9hboTLV20X/p4OtkgO1mjcItQeuNSIL9eLk49Uv8quaLeBRzSTnEA9
bQacSH+eTg631+SnWhdG2PmQhiChBqxKNNKToTmurpBF+OWhUNQPfCDW/YzOj3fX
r+7Ftf1zuAVrXzcc5GJGiuLm7zF9e5NyVzwfJVYjG1x3nWIcT3JPw12nF7aURgEy
jL8Xx0LQeUOqUMkChKIziHzZVJWnLOpQrXGFDAv7JNFgz5nuD5pKeOkudOSFUH4b
blRc1PQSHMmB8OCIrmiA/0F1AgMBAAGjggI5MIICNTAOBgNVHQ8BAf8EBAMCBaAw
HQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMAwGA1UdEwEB/wQCMAAwHQYD
VR0OBBYEFNpp3Y+8PRSciSMyjDSkMdvOZfb7MB8GA1UdIwQYMBaAFAC1KfItjm8x
6JtMrXg++tzpDNHSMDMGCCsGAQUFBwEBBCcwJTAjBggrBgEFBQcwAoYXaHR0cDov
L3IxMi5pLmxlbmNyLm9yZy8wLQYDVR0RBCYwJIIRKi5wcm9maXRlY2guc3RvcmWC
D3Byb2ZpdGVjaC5zdG9yZTATBgNVHSAEDDAKMAgGBmeBDAECATAuBgNVHR8EJzAl
MCOgIaAfhh1odHRwOi8vcjEyLmMubGVuY3Iub3JnLzI3LmNybDCCAQsGCisGAQQB
1nkCBAIEgfwEgfkA9wB2AMs49xWJfIShRF9bwd37yW7ymlnNRwppBYWwyxTDFFjn
AAABm0zAUeAAAAQDAEcwRQIgZZi4BCURuerBjp0L7hgXT80VR6MTGMuh3rZV8q6g
7HUCIQChvwS8w6llgHiFTnTF3vixShvZ0+Fpg5R4w5TEmFrKYQB9AHF+lfPCOIpt
seOEST0x4VqpYgh2LUIA4AUM0Ge1pmHiAAABm0zAUoQACAAABQAE+dM4BAMARjBE
AiA7Wt9TefVWzonrwxqPGdvS1dGjHUT16tx9Sh8144hrRgIgbd37xQXIeowWLlh4
8Pp0vKi325mEWj/y0IwR4qr4ln0wDQYJKoZIhvcNAQELBQADggEBAMajHNpttEan
blRszFZBvgkiRG96snKozrh8EeiQVFUaQ16LBkBkR2cYyGpG8zuJLo1NFkNvNGnG
qsNlMY9hoMNtNXszqAo90DYyKMZTSLkJoUsCxsec5e1sFoLCDIb2tK8Yr1449KBg
mCZPwRqBao7AtVgl5/YlctswGKB8h2pOpU3yT1wrEJNIsdoY1LAfEi00mnXGhQ0z
fb8Pdk2PsF0fQwPEDjqQ0C9BpKdNioEh7FHurLNQQNgq3irpS3KS1XtK5TvLSdnX
l0MX4p0X9zO0fprF6Lt0zXGCaKlQGX3NSVhfy6vu6CScyp3rbT5SoC8brG/YJX/d
mesBkLF/nWk=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIFBjCCAu6gAwIBAgIRAMISMktwqbSRcdxA9+KFJjwwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMjQwMzEzMDAwMDAw
WhcNMjcwMzEyMjM1OTU5WjAzMQswCQYDVQQGEwJVUzEWMBQGA1UEChMNTGV0J3Mg
RW5jcnlwdDEMMAoGA1UEAxMDUjEyMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA2pgodK2+lP474B7i5Ut1qywSf+2nAzJ+Npfs6DGPpRONC5kuHs0BUT1M
5ShuCVUxqqUiXXL0LQfCTUA83wEjuXg39RplMjTmhnGdBO+ECFu9AhqZ66YBAJpz
kG2Pogeg0JfT2kVhgTU9FPnEwF9q3AuWGrCf4yrqvSrWmMebcas7dA8827JgvlpL
Thjp2ypzXIlhZZ7+7Tymy05v5J75AEaz/xlNKmOzjmbGGIVwx1Blbzt05UiDDwhY
XS0jnV6j/ujbAKHS9OMZTfLuevYnnuXNnC2i8n+cF63vEzc50bTILEHWhsDp7CH4
WRt/uTp8n1wBnWIEwii9Cq08yhDsGwIDAQABo4H4MIH1MA4GA1UdDwEB/wQEAwIB
hjAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwEgYDVR0TAQH/BAgwBgEB
/wIBADAdBgNVHQ4EFgQUALUp8i2ObzHom0yteD763OkM0dIwHwYDVR0jBBgwFoAU
ebRZ5nu25eQBc4AIiMgaWPbpm24wMgYIKwYBBQUHAQEEJjAkMCIGCCsGAQUFBzAC
hhZodHRwOi8veDEuaS5sZW5jci5vcmcvMBMGA1UdIAQMMAowCAYGZ4EMAQIBMCcG
A1UdHwQgMB4wHKAaoBiGFmh0dHA6Ly94MS5jLmxlbmNyLm9yZy8wDQYJKoZIhvcN
AQELBQADggIBAI910AnPanZIZTKS3rVEyIV29BWEjAK/duuz8eL5boSoVpHhkkv3
4eoAeEiPdZLj5EZ7G2ArIK+gzhTlRQ1q4FKGpPPaFBSpqV/xbUb5UlAXQOnkHn3m
FVj+qYv87/WeY+Bm4sN3Ox8BhyaU7UAQ3LeZ7N1X01xxQe4wIAAE3JVLUCiHmZL+
qoCUtgYIFPgcg350QMUIWgxPXNGEncT921ne7nluI02V8pLUmClqXOsCwULw+PVO
ZCB7qOMxxMBoCUeL2Ll4oMpOSr5pJCpLN3tRA2s6P1KLs9TSrVhOk+7LX28NMUlI
usQ/nxLJID0RhAeFtPjyOCOscQBA53+NRjSCak7P4A5jX7ppmkcJECL+S0i3kXVU
y5Me5BbrU8973jZNv/ax6+ZK6TM8jWmimL6of6OrX7ZU6E2WqazzsFrLG3o2kySb
zlhSgJ81Cl4tv3SbYiYXnJExKQvzf83DYotox3f0fwv7xln1A2ZLplCb0O+l/AK0
YE0DS2FPxSAHi0iwMfW2nNHJrXcY3LLHD77gRgje4Eveubi2xxa+Nmk/hmhLdIET
iVDFanoCrMVIpQ59XWHkzdFmoHXHBV7oibVjGSO7ULSQ7MJ1Nz51phuDJSgAIU7A
0zrLnOrAj/dfrlEWRhCvAgbuwLZX1A2sjNjXoPOHbsPiy+lO1KF8/XY7
-----END CERTIFICATE-----
CERT_EOF

echo "   ✅ Сертификат сохранен: $CERT_DIR/fullchain.pem"
echo ""

# 3. Сохраняем приватный ключ
echo "3️⃣ Сохранение приватного ключа..."
sudo tee "$CERT_DIR/privkey.pem" > /dev/null <<'KEY_EOF'
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAtawT/C55tH8/46mZ4cBksaYS7WcGaBQwEj54WSHc9yR8Q0Qu
JENEIrNZu4n0V2VPpKHFLM4fYW6Ey1dtF/6eDrZIDtZo3CLUHrjUiC/Xi5OPVL/K
rmi3gUc0k5xAPW0GnEh/nk4Ot9fkp1oXRtj5kIYgoQasSjTSk6E5rq6QRfjloVDU
D3wg1v2Mzo9316/uxbX9c7gFa183HORiRori5u8xfXuTclc8HyVWIxtcd51iHE9y
T8Ndpxe2lEYBMoy/F8dC0HlDqlDJAoSiM4h82VSVpyzqUK1xhQwL+yTRYM+Z7g+a
SnjpLnTkhVB+G25UXNT0EhzJgfDgiK5ogP9BdQIDAQABAoIBADsXhsSfRV0NivV9
ZB1HHDmggEWSHkZaUqyMf07Wse39gyHKGowXCSGUXtqea8jFnls5d040mYZykWUm
wchtPHIinludKCx6c66uhgrqLN0smRGC9OU4EIBPbe2ZhFe2j9Dj0Abo8uafpbM9
nZag2sRErHZUGlRkzB3S8lU8WJc5avZnRxcPtCn6FVU53KDqiqiOPxXuZMuid+di
Ch9esJc27AeUSUpQO9OE0s0PVS2VUPkDKYmZ2Dgn28Gitfdp3G1YUYSNNkbxv2rJ
v0Wij5rBhm6xkAin6oEIg2cPLts06k3ap+FA11vyo7kHRw3AAn/0vfC1VrncIzC5
FoOv5n0CgYEA3cPBqXBsYGcKdSAMBUQr5s8r1XwZzXGBWtkkhw0RKf13Jne63Ue8
PEAttSr/T2uAjsgqFaKxZ+THru3EJ+hPmnQvLkRGE65P67UQmyBixLJYDTKqWFX+
hoxwjxW43RFTH76A0VEbr1T/WntPQ9BtIiSJxL6H1XEMVh9ZJ+a44AMCgYEA0bfY
9QIalM/N0wJoSNW+kavbCtfDjvt5A0KiHZIFgoLwtWD+rjuwMa0SxAaByj29nCR6
1jxoRbE16TOAZoRB4Gyhi49yF/njs6kFeGOTLiac1FnA7Ny4jy96KDl3jmVSWttH
F+ZMAmrj97wsVvh6CqyNQr1tcy5RIJBoWBhnCycCgYB/z1GvIN8lVF2fkV+8LUUM
GjyOJp8MW62MuXcm6q4IwE9KeVjWLYDcTLTLJEPO9ws5vz0aCREr6pv3Qot54Jb4
Upvak3i74QuosksmzKx/5rV+rcOlc7Jkw04f+Qn5RwHcWsQNXyyQiXE+KbFOSTKM
qfhIzvKkXioY/Ko6p+vHFwKBgQCb+wm68V2j4QtNLjUyNwgOgKviXKhu6EsRSbYa
GElQ0OMHhKToIiziRb/3XH+cVF96iwdx4GwNqchXMp8FoMj+is18Z6yMeKgLMGOJ
L0aAxOdQaZE8ms4KcV2CHXv2xRWDziQKepd+FNKJp8OyzAy5c619PjbxvDlK5x00
qLG7cQKBgQCm3zjVTzorEII5MNMFFIg5jB3YV0qM0NAgtHdpO0V/i4cwKVtpXnRQ
Did49WDuOkngw6peIeUfXMyrOeTlrcLHy6cloHQuzzrPpaTN3iPoMcDf91MgO6LM
Li5S4reQsqLfppbj0Rb1/30cGxTIJm1JGyMvITK8/yNFTDzzow0eTg==
-----END RSA PRIVATE KEY-----
KEY_EOF

echo "   ✅ Приватный ключ сохранен: $CERT_DIR/privkey.pem"
echo ""

# 4. Устанавливаем правильные права доступа
echo "4️⃣ Установка прав доступа..."
sudo chmod 600 "$CERT_DIR/privkey.pem"
sudo chmod 644 "$CERT_DIR/fullchain.pem"
sudo chown -R root:root "$CERT_DIR"
echo "   ✅ Права установлены"
echo ""

# 5. Проверяем сертификат
echo "5️⃣ Проверка сертификата..."
CERT_INFO=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -subject -dates 2>/dev/null || echo "")

if [ -n "$CERT_INFO" ]; then
    echo "   ✅ Сертификат валиден:"
    echo "$CERT_INFO" | sed 's/^/      /'
else
    echo "   ⚠️  Не удалось проверить сертификат"
fi
echo ""

# 6. Настраиваем Nginx для HTTPS
echo "6️⃣ Настройка Nginx для HTTPS..."
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "   ❌ Конфигурация Nginx не найдена"
    exit 1
fi

# Создаем резервную копию
sudo cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"

# Создаем полную конфигурацию с HTTPS
sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
# HTTP -> HTTPS редирект
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # ACME challenge для обновления сертификата
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
    
    # Редирект на HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # SSL сертификаты
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Проксирование на Next.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Кэширование статических файлов
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
    
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }
    
    client_max_body_size 50M;
}
EOF

echo "   ✅ Конфигурация Nginx обновлена"
echo ""

# 7. Проверка синтаксиса
echo "7️⃣ Проверка синтаксиса Nginx..."
if sudo nginx -t; then
    echo "   ✅ Синтаксис корректен"
    echo ""
    echo "   🔄 Перезагрузка Nginx..."
    sudo systemctl reload nginx
    echo "   ✅ Nginx перезагружен"
else
    echo "   ❌ Ошибки в конфигурации!"
    exit 1
fi
echo ""

# 8. Итоговая проверка
echo "8️⃣ Итоговая проверка..."
sleep 2

HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] || [ "$HTTPS_CODE" = "302" ]; then
    echo "   ✅ HTTPS работает! (HTTP $HTTPS_CODE)"
else
    echo "   ⚠️  HTTPS возвращает HTTP $HTTPS_CODE"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ SSL сертификат установлен и настроен!"
echo ""
echo "🌐 Проверьте сайт:"
echo "   https://$DOMAIN"
echo "   https://$WWW_DOMAIN"
echo ""
echo "📝 Сертификат действителен до: 23 марта 2026"
echo "💡 Не забудьте настроить автоматическое обновление сертификата!"
echo ""

