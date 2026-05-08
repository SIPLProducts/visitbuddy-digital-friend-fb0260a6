server {
    listen 80 default_server;
    server_name _;

    root __ROOT__;
    index index.html;

    location ~* \.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 25M;
}
