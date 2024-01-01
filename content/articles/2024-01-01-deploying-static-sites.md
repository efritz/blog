+++
title = "Deploying Static Sites"
slug = "deploying-static-sites"
date = "2023-01-01T00:00:00-00:00"
tags = ["bugs"]
showpagemeta = true
+++

Something here!

```nginx
proxy_cache_path /tmp/{{domain}}-cache/ levels=1:2 keys_zone={{domain}}:16m max_size=10g inactive=60m use_temp_path=off;

server {
  server_name {{domain}} www.{{domain}};

  listen 443 ssl {% if default_server %}default_server{% endif %};
  ssl_certificate /etc/letsencrypt/live/{{domain}}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/{{domain}}/privkey.pem;

  error_page 403 404 /404.html;

  location / {
    rewrite ^([^.]*[^/])$ $1/;
    rewrite ^(.*)/$ $1/index.html;

    proxy_pass https://{{space_subdomain}}.digitaloceanspaces.com/{{space_prefix}}/public/;
    proxy_intercept_errors on;

    proxy_cache            {{domain}};
    proxy_cache_valid      200 60m;
    proxy_cache_use_stale  error timeout invalid_header updating http_500 http_502 http_503 http_504;
    proxy_cache_revalidate on;
    proxy_cache_lock       on;
    proxy_ignore_headers   Set-Cookie;
    add_header             X-Cache-Status $upstream_cache_status;
  }
}

server {
  server_name assets.{{domain}};

  listen 443 ssl;
  ssl_certificate /etc/letsencrypt/live/{{domain}}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/{{domain}}/privkey.pem;

  error_page 403 404 /404.html;

  location / {
    rewrite ^([^.]*[^/])$ $1/;
    rewrite ^(.*)/$ $1/index.html;

    proxy_pass https://{{space_subdomain}}.digitaloceanspaces.com/{{space_prefix}}/assets/;
    proxy_intercept_errors on;

    proxy_cache            {{domain}};
    proxy_cache_valid      200 60m;
    proxy_cache_use_stale  error timeout invalid_header updating http_500 http_502 http_503 http_504;
    proxy_cache_revalidate on;
    proxy_cache_lock       on;
    proxy_ignore_headers   Set-Cookie;
    add_header             X-Cache-Status $upstream_cache_status;
  }
}
```