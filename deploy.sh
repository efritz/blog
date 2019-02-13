#!/bin/sh -ex

# Install build requirements
apk update && apk add --no-cache ca-certificates git python py-setuptools

# Download and install s3cmd
git clone https://github.com/s3tools/s3cmd.git /tmp/s3cmd
cd /tmp/s3cmd/
python setup.py install
cd -

# Configure s3cmd
cat << EOF > .s3cfg
[default]
access_key = ${ACCESS_KEY}
secret_key = ${SECRET_KEY}
host_base = sfo2.digitaloceanspaces.com
host_bucket = %(bucket)s.sfo2.digitaloceanspaces.com
EOF

# Publish public directory to Digital Ocean bucket as public files
s3cmd --config .s3cfg put public/* s3://laniakea/blog/ --acl-public --recursive
