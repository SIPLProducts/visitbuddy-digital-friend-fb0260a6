server {
    listen 80;
    server_name __APP_DOMAIN__;

    root /var/www/visiguard;
    index index.html;

    # Cache hashed assets aggressively
    location ~* \.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 25M;
}