+++
title = "Hosting a blog like it's 2024"
slug = "hosting-a-blog-like-its-2024"
date = "2024-10-07T00:00:00-00:00"
tags = []
showpagemeta = true
+++

This blog is built by the [Hugo](https://gohugo.io/) static site generator and hosted by [Render](https://render.com/), along with a number of other sites I maintain with an identical deployment. Before joining Render and discovering how _freakin' slick_ it is for hosting static sites, I had massively over-engineered my own patchwork solution.

I had built a Zastava Yugo from spare parts when I could've just called an Uber.

{{< lightbox src="/images/static-sites/race.png" >}}

This article contrasts two approaches to deploying this blog:
1. A custom-built Rube Goldberg machine that [Eric Fritz was able to build in a cave with a box of scraps](https://youtu.be/WJngbyHgS8E?t=31), and
2. A general solution available from a suitable hosting provider that offers the right feature set.

If you'd like to skip my life story and just go to the damn recipe, you can click [here](#the-new-hotness-solution) to see the configuration of this blog's infrastructure as it exists today.

### The "old busted" solution

At the time I first set up the patchwork infrastructure for this blog, I was deep into a few personal projects. The most complex one was a continuous integration system that required elastic container-based compute for build jobs. To avoid going full-tilt on AWS or GCP, I chose to host a minimal [Kubernetes](https://docs.digitalocean.com/products/kubernetes/) cluster on Digital Ocean. This cluster cost only a few dollars a month, and I was reasonably certain that I wouldn't be caught with a surprise bill if the elastic band holding my compute in place happened to snap. This was a real fear and point of friction when considering one of the larger Cloud providers.

Human concentration is finite and Cloud platforms tend to be sticky. Thus, I began to iterate on a solution to host this blog using the tools already within reach. This blog was by far the _simplest_ project of the bunch. Other projects required long-running API backends, event queues, databases, and access to the Kubernetes control plane to schedule user workloads.

The deployment of a static site was slotted into this existing stack as lazily as possible. Finding a more ideal solution would've required looking into other unfamiliar tech, and that would have required me to spend focus that I wasn't willing to pay.

#### Choosing a tech stack

In addition to a small Kubernetes cluster, I had a small handful of [Droplets](https://www.digitalocean.com/products/droplets) that hosted several API servers. These machines were configured with [Ansible](https://docs.ansible.com/ansible/latest/index.html), a product I'd be happy to avoid for the indefinite future. I was considering [Chef solo](https://docs.chef.io/chef_solo/) as an alternative option, by recommendation from a coworker. I didn't get very far in building a mental model of that tool mostly due to a lack of consistent analogies in its pun-based command set. _How do you **knife** a server - WTF is even that?!?_ I stuck with Ansible as it seemed like the milder of the two headaches.

Reflecting on my experience so far, I wouldn't attempt to run anything non-trivial on bare virtual machines again. My updated go-to solution would be to provision the actual compute via Terraform, and run everything in Docker. This would allow me to work on an abstraction layer consisting of container images. After all, why ship raw source code when you can ship fully executable environments? I've become much more accustomed to a deployment that falls on the cattle side of the cattle-pets spectrum.

My provisioning needs at the time were to _log_ (read: save in Git) and have the _ability to replay_ machine setup (read: nuke and rebuild). All of the fiddly installation and configuration steps mustn't be re-learned in an emergency situation where I have to start from a freshly provisioned virtual machine. Ansible filled this gap and enabled decent automation of the following tasks:

- Installing a web server, and its dependencies.
- Registering the web server with an init daemon so that it would run on startup and restart after crashes.
- Configuring the web server to serve the _correct_ content based on the requested domain (using vhosts). This configuration must be kept in version control so I could easily amend and re-apply it as I Pokémon'd an ever-increasing number of side project domain names. I'd argue that I'm not a hoarder and my ambition simply manifests itself non-linearly![^1]
- Obtaining and refreshing HTTP certificates for multiple domains via [Let's Encrypt](https://letsencrypt.org/) and [certbot](https://certbot.eff.org/). If I had attempted this before I knew of certbot I would've thrown in the towel after five minutes of futzing with certificate authorities. There's not nearly enough time in a human life to spend any amount of energy on that nonsense.

[^1]: Once AGI arrives, all side projects will be immediately completed.

To host image and binary content, I reached for Digital Ocean's [Spaces](https://www.digitalocean.com/products/spaces). The objects stored in Spaces' buckets were managed via manual upload, outside of version control, and therefore did not have the benefits of rollbacks. The introduction of object storage came from the "best practice" knowledge that Git was an inappropriate place to store binary file types. Lest the _bad things occur_. What bad things? Couldn't tell you as I never actually experienced them myself. The introduction of [LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage) support has since blew away that intuition.

#### Massaging the stack

Spaces allow you to configure a [custom subdomain](https://docs.digitalocean.com/products/spaces/how-to/customize-cdn-endpoint/), but it doesn't seem that it lets you serve from the top-level. I could host `assets.eric-fritz.com` or `blog.eric-fritz.com`, but `eric-fritz.com` could not be hosted directly. Thankfully, I already had web servers provisioned for APIs of other projects. And with this web server I would have sufficient control over the domains I'm serving.

The configuration for my web server (nginx, specifically) looked something like the following. Each domain followed the same template, differing only in server names, certificate paths, and the target path within the (shared) bucket. Here, the `proxy_pass` directive instructs the web server to fulfill all requests by serving a matching file from an upstream server. Specifically, I'm targeting the files under the `blog/public/` directory of the `laniakea`[^2] bucket.

[^2]: I was naming servers after high-intensity stars and buckets after galaxy clusters. I had a theme going!

```nginx
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
  }
}
```

Unfortunately, this setup turned out to be **incredibly slow**. This was in 2019, only a few months after Spaces were available in SFO2, the region containing my web server. I'm sure that content delivery latency has gotten much better over the past five years, but at the time it wasn't a tenable solution to read files from the bucket for every request.

I attempted a little cache trick where a copy of the file is stashed on the web server's disk whenever it is read from the bucket. This cached file can be served on subsequent requests for some (short-ish) period of time. This has an advantage over using only cache control headers as the cache entries are shared over many clients. This reduces the total amount of traffic to the bucket and allows one reader's fetch to decrease the latency of the next reader. Sharing a cache is possible to do since there's no distinction on my blog between personalized and un-personalized content - every client is served the exact same content, and all of it is maximally cacheable.

To implement this trick, I was inspired by tips I found on "[microcaching](https://blog.nginx.org/blog/benefits-of-microcaching-nginx)". I believe this is a popular technique used for WordPress-like sites. Usually, entries are cached for 1-2 seconds. In this setup, I'm caching entries for up to an hour and applying some additional tricks (which I'll get into more below). I won't claim that this is a direct implementation of microcaching - just loosely inspired by it. An hour seems too long to be able to use the micro unit prefix in good conscience.

Adding caching to the nginx configuration required fairly minimal changes:

```nginx
proxy_cache_path \
  /tmp/eric-fritz.com-cache/ \
  keys_zone=eric-fritz.com:16m \
  max_size=10g \
  inactive=60m \
  levels=1:2 \
  use_temp_path=off;

server {
  # ...

  location / {
    # ...

    proxy_cache            eric-fritz.com;
    proxy_cache_valid      200 60m;
    proxy_cache_lock       on;
    proxy_cache_revalidate on;
    proxy_cache_use_stale  error timeout invalid_header \
                           http_500 http_502 http_503 http_504;
    proxy_ignore_headers   Set-Cookie;
    add_header             X-Cache-Status $upstream_cache_status;
  }
}
```

- The `proxy_cache_path` and `proxy_cache` directives define an on-disk cache of up to ten gigabytes. This directory could fit the entire rendered website comfortably, including rendered content as well as assets. This cache will serve cached files for up to one hour after they are initially fetched.
- The `proxy_cache_lock` directive ensures that at most **one** request to the bucket is made for a particular file at a time. If two requests for the same file are being served concurrently, the latter request will queue behind the in-flight request and end up using a newly populated cached version.
- The `proxy_cache_use_stale` directive lists a series of conditions under which a version in the cache older than an hour can be served. For the most part, these conditions indicate an error with Spaces. This allows the site to be served from the cache when the source of truth is otherwise non-functional.

These settings improved the perceived speed of the site to an adequate level. There remains a small "cold start" problem when the first visit to the site after an hour of inactivity has to repopulate an expired cache. To fix this, I could pull the ol' AWS trick and jerry-rig a ~~CloudWatch~~ cron job to ping ~~my Lambda function~~ every page of my website to keep everything hot. But at this point there are diminishing returns on these types of solutions.

It's a **blog**, for gosh sake. If anyone really requires [my thoughts on monads](/articles/on-monads/) with consistently low latency, I've probably built the wrong audience.

#### Fabricating a deployment process

Alright, so I've got a web server provisioned and serving the correct content. I've got a functional caching solution. I've registered an object storage bucket for the content of my blog. The next step is to figure out how to easily take the blog content (minus binary assets) from Git and move it into the bucket to be served.

I'm not a fan of Click Ops, and drag-and-dropping content via a GUI leaves me with shaky confidence that I _selected the correct files_. I'd sleep better at night knowing that I could run a shell script that would perform that operation in a repeatable, consistent manner.

Thankfully, the **build** itself is minimal and easy:

```bash
hugo --minify
```

At last! A piece of this adventure that _just does a thing_! It doesn't require days of learning edge cases and trial-and-erroring flags to get non-deranged output. I'm looking at you, [Ansible tasks vs handlers vs roles vs plays vs playbooks](https://devops.stackexchange.com/questions/9832/ansible-whats-the-difference-between-task-role-play-and-playbook).

The `hugo` command bundles all of the markdown content and binary assets of my static site into a `public` directory that can simply _be rendered by a browser_. The next problem to tackle is moving this public directory into the bucket.

Because I'm using Spaces, a re-implementation of the ubiquitous AWS object storage API, I'm able to re-use existing tooling designed for uploads to S3[^3]. Unfortunately, these tools don't follow the spirit of convention-over-configuration. I found myself back in the land of explicit flags and having to care (or at least learn) about the tool's every minutiae.

[^3]: PeRfEcTlY dEsIgNeD (zErO nOtEs, CoUlDn'T dO bEtTeR iF I tRiEd).

The `deploy.sh` script is shown below, in which AWS credentials are written to a temporary file and some rather specific S3 commands are invoked.

```bash
#!/usr/bin/env bash

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

This script cleans the slate by deleting all existing objects under `blog/public`, then copying the local `public` directory in its place.

Along the way to the final version of this script, I ironed out a content-type mismatch with stylesheet resources. Some combination of Spaces+nginx+Chrome was NOT happy with the default content type for these resources and refused to apply any styling at all. I didn't want my blog to look like a page designed by [Warren Buffet](https://www.berkshirehathaway.com/). Fixing this required recursively modifying all `*.css` files with a specific `Content-Type` header.

Now I have a working deploy script. It updates the content of the bucket. But, due to caching in nginx, it does not update the content users are served. This was a bit of an annoyance. I'd like to forcibly bust the content of the cache whenever new content or assets are available, and let the cache ride as long as possible otherwise.

But worry not! I have a script for that as well!

The `bust-cache.sh` script is shown below, in which I walk every file in the local `public` directory and hit my nginx server with a special `X-No-Cache` header. This header causes a re-fetch of the file from the upstream server and purges the stale version from the user's view.

That's at least how I understood this header to interact with the proxy cache feature of nginx. And I believe I had empirical evidence to reinforce this mental model at some point in time.

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

Putting this all together yielded the following GitHub Action workflow. This workflow updated my website on all pushes to the `master` branch in Git. Once I threw my work upstream, my robot butler would build, publish, and update a remote cache on my web server. Then, my job was to sit back, relax, and watch Google Analytics _skyrocket_.

```yaml
name: Build and deploy
on:
  push:
    branches:
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Setup hugo
        run: |
          curl -L -o hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_Linux-64bit.tar.gz"
          tar -xvzf hugo.tar.gz hugo
          mv hugo bin
          rm hugo.tar.gz
        env:
          HUGO_VERSION: '0.102.3'

      - name: Setup s3cmd
        uses: s3-actions/s3cmd@v1.2.0
        with:
          provider: digitalocean
          access_key: ${{ secrets.ACCESS_KEY }}
          secret_key: ${{ secrets.SECRET_KEY }}

      - name: Build
        run: ./bin/hugo --minify
      - name: Deploy
        run: ./bin/deploy.sh
        env:
          ACCESS_KEY: ${{ secrets.ACCESS_KEY }}
          SECRET_KEY: ${{ secrets.SECRET_KEY }}
      - name: Bust cache
        run: ./bin/bust-cache.sh
```

The Rube Goldberg machine has been constructed and running for some time without major incident. Until one day it **blew the hell apart** and cache busting no longer worked correctly. Or maybe it never actually worked and I built an incorrect mental model from coincidences. Either way, I couldn't find the energy to troubleshoot what was wrong.

It was time to disassemble the machine in favor of a simpler mechanism.

### The "new hotness" solution

{{< lightbox src="/images/static-sites/transition.png" anchor="Upgrading the tech stack" >}}

I joined Render as an engineer on the Datastores team in October of 2023. It was the night before my first day on the job. I was sitting on the bed of a San Francisco hotel room with an order of Karaage from the restaurant next door and wasn't in the mood for Netflix. Not yet having taken a deep dive into Render's product, I thought it might be a good time to perform the obligatory "move all my personal services to this platform" dance.

I thought I'd hit a snag or at least come away with a list of product improvement suggestions to present on my first day. But creating a service that could fully replace my old setup was incredibly simple:

{{< lightbox src="/images/static-sites/create-form.png" anchor="Creating a new static site" >}}

It took like **20 minutes** to migrate everything, including changing the DNS records and waiting for them to propagate through public nameservers. The majority of the time was actually me fiddling around on [gandi.net](https://gandi.net/) trying to figure out where the DNS record pane for my domain was in their UI. I kept getting confused by banners trying to upsell additional services and going to the wrong page.

Registering a custom domain was also incredibly easy:

{{< lightbox src="/images/static-sites/domains.png" anchor="Issuing custom domain certificates" >}}

I literally watched the "Certificate Issued" and "Verified" badges go from loading indicators to a success state before I was even aware all of this was fully automated on the Render side. Certbot had lowered the barrier of entry into the world of certificates enough for me to clumsily climb over it, but I was not prepared to receive this level of concierge service.

Configuring this single static site service had replaced a huge portion of the old stack that I built through the blur of frustrated tears, including:
- Virtual host configuration
- Registration of SSL Certificates
- Unnecessary microcaching
- A (now recently broken) deployment pipeline

I then learned about [Render Blueprints](https://docs.render.com/infrastructure-as-code) and began to salivate at the thought of ejecting Ansible from my life as well. The following file is the **complete** Blueprint configuration that replaces over 300 lines of existing Ansible configuration / Jinja templates.

```yaml
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

And this minimal config comes with a killer feature that my previous stack lacked: enabling [pull request previews](https://docs.render.com/pull-request-previews). A boolean flag in the YAML above adds the ability to build a complete clone of my blog for every open pull request.

Previously, if I wanted to share a sneak-peek of content to some audience before publication, I would have to send them a link to the raw markdown file. Or, more presumptively, ask them to build and run the entire site locally. With pull request previews, I get a unique `.onrender.com` URL resolvable by anyone that I can send out for feedback within a minute of pushing to my repository.

{{< lightbox src="/images/static-sites/prs.png" anchor="Automatic preview environments for PRs" >}}

My over-exuberance for hard-coding the `eric-fritz.com` domain name into asset paths caused a small snag. This meant that although the _content_ would be built into the preview, it would still try to pull images and stylesheets from whatever the live version was hosting. This would cause new images to break and changes to styling to be omitted from the rendered preview. Thankfully, this was an easy fix with a small amendment to the build script:

```bash
#!/usr/bin/env bash

base_args=
if [ "$IS_PULL_REQUEST" == "true" ]; then
    base_args="--baseURL ${RENDER_EXTERNAL_URL}"
fi

hugo --gc --minify $base_args
```

When Render is running the build command, it injects some useful environment variables including the external URL which will eventually be served. This script replaces the hard-coded domain to be the target preview domain when building from a pull request.

### Reflections

After replacing so much of the ad-hoc hosting setup I've accrued over time I honestly feel lighter. There's less debt holding me back from dealing with this repo, and I think that's a non-insignificant reason I've been able to write _more_ this year than I usually have. Knowing that I can deploy without some irrelevant technical issue popping up has lowered the activation energy of producing content and increased the velocity of my writing.

I've also discovered that I can accidentally[^4] [land on the front page of Hacker News](https://news.ycombinator.com/item?id=41296481) without having to worry about fending off a hug of death by patching a live Droplet.

[^4]: I wrote a post about rewriting dead links on my blog but gave it a spicy title and started a flame war.

{{< lightbox src="/images/static-sites/analytics.png" anchor="Analytics while on the front page of HN" >}}
