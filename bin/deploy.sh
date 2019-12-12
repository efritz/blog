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
