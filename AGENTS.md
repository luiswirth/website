---
description: "The site at lwirth.com: static HTML, no build. Use when changing lwirth.com or anything hosted on it."
---

# website

## Content

- A YouTube video is named by its ID alone, as `data-youtube` on a card or a list line:
  The Worker script `src/worker.js` fills in the rest from the YouTube Data API as the page is served,
  so nothing about a video is kept in the HTML.

## Hosting

- Everything on lwirth.com is hosted on Cloudflare:
  DNS, redirects and sites.
- One repository is one Cloudflare Worker with static assets:
  Named after the repository and served at `<repo>.lwirth.com`, its custom domain.
  This repository is the Worker `website`, served at the apex.
  A push to main deploys it through `.github/workflows/deploy.yml`.
  Its script runs only for pages and `/yt/` thumbnails; every other file is served directly.
  Locally, `wrangler dev` serves it, from a `public/` collected as the workflow does.
  Typst documents deploy through `typst-deploy`.
- Each piece of content has one URL:
  A path on lwirth.com is a page of this site, never another repository's site.
- Redirects never serve content:
  - Path redirects live in `_redirects`:
    Short links to profiles elsewhere,
    and the legacy paths of sites that moved to their subdomain.
    Nothing new links to a legacy path.
  - Host redirects are redirect rules of the Cloudflare zone:
    `www` and `ethz` to the apex, `agentics` to its page.
    The hosts under `agentics` and their former hosts under `agentic` are lwirth-cloud's, in `~/dev/dotcloud`.
- Credentials are in `lwirth-macbook:~/secrets`:
  - `cloudflare-api-token.txt`: The agents' token for the Cloudflare API.
    It covers all accounts and zones, and everything but billing, the registrar, members and tokens.
    Purging the zone's cache matters, since it serves pages for up to a week after a deploy.
  - `cloudflare-ci-token.txt`: Cloudflare Workers scripts only.
    Each deploying repository holds it as the secret `CLOUDFLARE_API_TOKEN`,
    next to `CLOUDFLARE_ACCOUNT_ID`.
  - `youtube-api-key.txt`: The YouTube Data API key, of the Google Cloud project `lwirth-website`, limited to that API.
    The Worker holds it as the secret `YOUTUBE_API_KEY`, and `wrangler dev` reads it from `.dev.vars`.
