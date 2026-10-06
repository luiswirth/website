# website

The site at lwirth.com: static HTML, no build.

## Hosting

- Everything on lwirth.com is hosted on Cloudflare:
  DNS, redirects and sites.
- One repository is one Cloudflare Pages project:
  Named after the repository and served at `<repo>.lwirth.com`.
  This repository is the project `website`, served at the apex.
  A push to main deploys it through `.github/workflows/deploy.yml`.
  Typst documents deploy through `typst-deploy`.
- Each piece of content has one URL:
  A path on lwirth.com is a page of this site, never another repository's site.
- Redirects never serve content:
  - Path redirects live in `_redirects`:
    Short links to profiles elsewhere,
    and the legacy paths of sites that moved to their subdomain.
    Nothing new links to a legacy path.
  - Host redirects are redirect rules of the Cloudflare zone:
    `www` and `ethz` to the apex.
- Credentials are in `lwirth-macbook:~/secrets`:
  - `cloudflare-api-token.txt`: The agents' token for the Cloudflare API.
    It can purge the zone's cache, which serves pages for up to a week after a deploy.
  - `cloudflare-ci-token.txt`: Cloudflare Pages only.
    Each deploying repository holds it as the secret `CLOUDFLARE_API_TOKEN`,
    next to `CLOUDFLARE_ACCOUNT_ID`.
