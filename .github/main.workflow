name: Build and Deploy
on:
  push:
    branches:
      - master
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/npm@4633da3702a5366129dca9d8cc3191476fc3433c
        args: install
      - uses: srt32/hugo-action@v0.0.3
      - uses: actions/npm@4633da3702a5366129dca9d8cc3191476fc3433c
        args: run minify
      - uses: docker://alpine:3.8
        env:
          ACCESS_KEY: EFZG2XIFKGU5ZYI6SQ4V
          SECRET_KEY: ${{ secrets.SECRET_KEY }}
        run: ./bin/deploy.sh
