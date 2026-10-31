# /etc/nginx/sites-available/api.freemathcamp.app
# TLS is added by certbot (sudo certbot --nginx -d api.freemathcamp.app).
upstream freemathcamp_api {
    server 127.0.0.1:4003;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.freemathcamp.app;

    access_log /var/log/nginx/freemathcamp-api.access.log;
    error_log /var/log/nginx/freemathcamp-api.error.log;

    client_max_body_size 1m;

    location /healthz {
        default_type text/plain;
        return 200 'ok';
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 5s;

        proxy_pass http://freemathcamp_api;
    }
}
