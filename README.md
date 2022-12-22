# Blog

This repository powers [eric-fritz.com](https://eric-fritz.com).

To render the site locally, run `hugo serve` and visit [http://localhost:1313](http://localhost:1313).

The `main` branch is continuously deployed. The site will be built by GitHub Actions on push, written to a Space on 
DigitalOcean, and requests will be made to the nginx frontend to bust the on-disk cache of the old site.
