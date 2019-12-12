#!/bin/sh -ex

cat << EOF > .s3cfg
[default]
access_key = ${ACCESS_KEY}
secret_key = ${SECRET_KEY}
host_base = sfo2.digitaloceanspaces.com
host_bucket = %(bucket)s.sfo2.digitaloceanspaces.com
EOF

s3cmd --config .s3cfg put public s3://laniakea/blog/ --acl-public --recursive
