+++
title = "Deploying Static Sites like it's 2024"
slug = "deploying-static-sites"
date = "2024-01-01T00:00:00-00:00"
tags = []
showpagemeta = true
+++

This blog is built by the [Hugo](https://gohugo.io/) static site generator and hosted by [Render](https://render.com/). I've also transferred over a number of other sites I maintain for side projects to use the same setup. Before joining Render and realizing how slick it is for hosting static sites, I had over-engineered my own patchwork solution.

I had built a Swiss watch when all I needed was a sundial.

### The Before

In order to avoid setting up a full AWS or GCP account for personal projects, I chose to host a minimal [Kubernetes](https://docs.digitalocean.com/products/kubernetes/) cluster on Digital Ocean, which cost a few dollars a month. Because Cloud service providers tend to be somewhat sticky, I began to iterate on a solution to host this blog on the same platform.

TODO

[Spaces](https://www.digitalocean.com/products/spaces0)






ansible

certbot -n --nginx --agree-tos --email eric@eric-fritz.com --expand -d eric-fritz.com -d www.eric-fritz.com -d assets.eric-fritz.com
restart nginx

vhosts configuration

nginx "microcaching"

```nginx
proxy_cache_path /tmp/eric-fritz.com-cache/ levels=1:2 keys_zone=eric-fritz.com:16m max_size=10g inactive=60m use_temp_path=off;

server {
  server_name eric-fritz.com www.eric-fritz.com;

  listen 443 ssl default_server;
  ssl_certificate /etc/letsencrypt/live/eric-fritz.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/eric-fritz.com/privkey.pem;

  error_page 403 404 /404.html;

  location / {
    rewrite ^([^.]*[^/])$ $1/;
    rewrite ^(.*)/$ $1/index.html;

    proxy_pass https://laniakea.sfo2.digitaloceanspaces.com/blog/public/;
    proxy_intercept_errors on;

    proxy_cache            eric-fritz.com;
    proxy_cache_valid      200 60m;
    proxy_cache_use_stale  error timeout invalid_header updating http_500 http_502 http_503 http_504;
    proxy_cache_revalidate on;
    proxy_cache_lock       on;
    proxy_ignore_headers   Set-Cookie;
    add_header             X-Cache-Status $upstream_cache_status;
  }
}
```

TODO
... and another server block assets.{{domain}} serving `/blog/assets/`.


SCRIPTS:


deploy.sh:

```bash
#!/bin/sh -ex

trap "{ rm -f .s3cfg; }" EXIT

cat << EOF > .s3cfg
[default]
access_key = ${ACCESS_KEY}
secret_key = ${SECRET_KEY}
host_base = sfo2.digitaloceanspaces.com
host_bucket = %(bucket)s.sfo2.digitaloceanspaces.com
EOF

# Replace assets
s3cmd --config .s3cfg del s3://laniakea/blog/public
s3cmd --config .s3cfg put public s3://laniakea/blog/ --acl-public --recursive

# Set proper content-types for css objects
s3cmd --config .s3cfg \
    --recursive modify \
    --add-header='content-type':'text/css' \
    --exclude '' \
    --include '.css' \
    s3://laniakea/blog/
```

bust-cache.sh:

```bash
#!/usr/bin/env bash

function refresh() {
    # Remove root prefix and the index.html suffix (if any)
    file=$(echo "$1" | sed 's#public/##' | sed 's#/index.html$##')
    echo "updating cache for $file"
    curl --silent -H 'X-No-Cache: true' "https://eric-fritz.com/$file" > /dev/null
}

find public -type f | while read file; do
    refresh "$file"
done
```

### The After

Something here!

TODO
