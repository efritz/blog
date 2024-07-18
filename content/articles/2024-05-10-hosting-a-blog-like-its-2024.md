+++
title = "Hosting a blog like it's 2024"
slug = "hosting-a-blog-like-its-2024"
date = "2024-03-17T00:00:00-00:00"
tags = []
showpagemeta = true
+++

This blog is built by the [Hugo](https://gohugo.io/) static site generator and hosted by [Render](https://render.com/), along with a other sites I maintain with the same setup for a number of side projects. Before joining Render and realizing how slick it is for hosting static sites, I had over-engineered my own patchwork solution.

I had built a Swiss watch when all I needed was a sundial.

### The Before

At the time I first set up a patchwork infrastructure for this blog, I was also deep into some personal projects that required elastic container-based compute. To avoid setting up a full AWS or GCP account for personal projects, I chose to host a minimal [Kubernetes](https://docs.digitalocean.com/products/kubernetes/) cluster on Digital Ocean. This only cost a few dollars a month, and I was reasonably sure that I wouldn't be caught with a surprise bill, which was a real point of friction when considering one of the larger Cloud providers (of which I've read numerous horror stories).

Because human concentration is finite and Cloud platforms tend to be sticky, I began to iterate on a solution to host this blog using the set of tools that were already within reach from the progress in other projects. This blog was by far the _simplest_ project of the bunch. Other projects required long-running API backends, event queues, databases, and access to a sibling Kubernetes API to act as a control plane for user workloads. The deployment of a static site was lazily slotted into this infrastructure, as finding a more ideal solution would've required looking into other unfamiliar tech, which required a focus cost I wasn't willing to pay.

In addition to a small Kubernetes cluster, I had a small handful of [Droplets](https://www.digitalocean.com/products/droplets) that hosted several of API servers. These machines were configured with [Ansible](https://docs.ansible.com/ansible/latest/index.html), which became product I'd be happy to avoid for the indefinite future. At the time I was also considering [Chef solo](https://docs.chef.io/chef_solo/), by recommendation from a coworker, but couldn't build a mental model of the puns in the documentation fast enough to grok how to use it effectively (_do you **knife** a server? wtf is is even that?_).

Doing the same thing over again, I wouldn't attempt to run anything non-trivial on bare virtual machines again. My updated go-to solution would be to provision the actual compute via Terraform, and run any actual workload on the machine via a Docker layer, allowing me to work on an abstraction layer consisting of container images. This gives the deployment a more cattle-than-pets type feel that I've become much more comfortable with.

My provisioning needs at the time were to _log_ and have the _ability to replay_ machine setup so that all of the fiddly installation and configuration steps didn't need to be re-learned in an emergency situation where I had to start from a new virtual machine. Ansible filled this gap and enabled decent automation of the following tasks:

- Installing a webserver, its dependencies, and registering it with an init daemon
- Configuring the webserver to serve the _correct_ content based on the requested domain (using vhosts)
- Obtaining and refreshing HTTP certificates for multiple domains via [Let's Encrypt](https://letsencrypt.org/) and [certbot](https://certbot.eff.org/)




To host image and binary content, I reached for Digital Ocean's [Spaces](https://www.digitalocean.com/products/spaces) 

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

{{< lightbox src="/images/static-sites/domains.png" anchor="Issuing custom domain certificates" >}}
{{< lightbox src="/images/static-sites/prs.png" anchor="Automatic preview environments for PRs" >}}
{{< lightbox src="/images/static-sites/previews.png" anchor="List of preview environments" >}}
{{< lightbox src="/images/static-sites/live-preview.png" anchor="A fully functional preview environment" >}}

render.yaml:

```
services:
  - name: efritz/blog
    type: web
    runtime: static
    repo: https://github.com/efritz/blog
    branch: main
    buildCommand: ./bin/build.sh
    staticPublishPath: public
    pullRequestPreviewsEnabled: true
    domains:
      - eric-fritz.com
      - www.eric-fritz.com
    headers:
      - path: /assets/*
        name: Cache-Control
        value: public, max-age=15552000 # 6 months
      - path: /*
        name: Access-Control-Allow-Origin
        value: '*'
```

build.sh

```bash
#!/usr/bin/env bash

set -exo pipefail

base_args=
if [ "$IS_PULL_REQUEST" == "true" ]; then
    base_args="--baseURL ${RENDER_EXTERNAL_URL}"
fi

# shellcheck disable=SC2086
hugo --gc --minify $base_args
```
