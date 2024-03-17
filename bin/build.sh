#!/usr/bin/env bash

set -exo pipefail

base_args=
if [ "$IS_PULL_REQUEST" == "true" ]; then
    base_args="--baseURL ${RENDER_EXTERNAL_URL}"
fi

# shellcheck disable=SC2086
hugo --gc --minify $base_args
