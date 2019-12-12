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
