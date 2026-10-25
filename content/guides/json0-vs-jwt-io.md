---
title: json0 vs jwt.io: decoding JWTs without trackers, and when you need jwt.io's verifier
headline: json0 vs jwt.io
description: jwt.io decodes, verifies and creates JSON Web Tokens and is backed by Auth0. json0 decodes them on a page with no ads, analytics or third-party requests, and never asks for your signing secret. What each does, what we measured, and which to use.
date: 2026-10-25
kind: comparison
tool: jwt
---

**Short answer:** to *read* a token, both work, and in our test neither sent the token anywhere. jwt.io loads more than thirty marketing and analytics services around its debugger; json0 loads none. To *verify* a signature or *create* a test token, use jwt.io or your JWT library, because json0 does neither on purpose.

jwt.io is the site most developers think of for JWTs. It is presented by Auth0, now part of Okta, and it is a good tool. The question is whether the page you paste live access tokens into should also be a marketing site.

## At a glance

| | json0 JWT | jwt.io |
| --- | --- | --- |
| Decodes header and payload | Yes | Yes |
| Claims shown as dates, expiry checked | Yes, against your device's clock | A claims breakdown view |
| Verifies signatures | No | Yes: a secret for HMAC, a public key for RSA and ECDSA |
| Fetches the issuer's public key | No | Tries to download it automatically |
| Creates (encodes) tokens | No | Yes, with its encoder |
| Token sent anywhere when decoding (our test) | No | No |
| Other hosts contacted when the page loads (our test) | 0 | 34 |
| Cookies set on load | None | About 17, from consent, analytics and ad platforms |
| Ads and marketing | None | Its privacy notice says it may share personal information with ad partners through cookies |
| Other tools on the site | 19, including [Base64](/base64), [Hash](/hash) and [Redact](/redact) | JWT introduction, library listings |

## What we measured

On 25 October 2026 we loaded www.jwt.io once in a fresh headless Chrome profile, from India, without accepting the consent prompt. Before we pasted anything, the page made 116 requests to **34 other hosts**: Google Tag Manager and Analytics, DoubleClick, Adobe, Marketo, LinkedIn, Reddit, Quora, X/Twitter, Facebook, G2 and The Trade Desk among them, and set about seventeen cookies.

Then we pasted a token whose payload contained a unique marker. jwt.io decoded it on the page, and none of the requests made after pasting contained the token or the marker. So the debugger itself decodes in your browser, which is to its credit.

The same test on json0.dev made 14 requests, all to json0.dev, and none after pasting. json0's [privacy page](/privacy) lists every request the site can make.

The point is not that jwt.io steals tokens; in our test it did not. It is that a page carrying three dozen third-party scripts is a bigger surface than a page carrying none, and some security teams do not allow production credentials on such pages at all.

## Decoding

Both show the header, the payload and the claims. json0 shows the registered time claims (`exp`, `iat`, `nbf`) as UTC dates, tells you whether the token has expired by your device's clock, and summarises the token in one line, for example *HS256 token for cus_R2d9, expired 7 days ago*.

## Verifying and creating: where jwt.io is stronger

jwt.io verifies a signature when you give it the secret (HS256 and friends) or the public key (RS256, ES256 and friends), and it tries to download the issuer's public key for you. It also has an encoder for building test tokens. For debugging an authentication setup, that is genuinely useful.

json0 does neither, and says so on the page: *Not verified: checking it needs the signing secret or public key, which json0 never asks for.* A production signing secret typed into any web page should be treated as leaked and rotated. Verify in your own code or on the command line, where the secret already lives. Public keys are not secret, so verifying an RS256 token with a public key on jwt.io carries no such risk; the token itself is the sensitive part.

## Where json0 is stronger

- **No third-party scripts, cookies, ads or analytics** on the page where you paste a live token.
- **Never asks for a secret,** so it cannot become the place one leaks.
- **The tools around the token:** [Redact](/redact) finds tokens, keys and personal data inside a whole payload before you share it, [Base64](/base64) decodes any one part, and [Hash](/hash) computes SHA digests with Web Crypto.

## Which to use

- **Reading a token from a log, a header or a bug report:** json0, or any local decoder.
- **Checking a signature with a public key, or building a test token:** jwt.io, or your JWT library.
- **Checking a signature with a production HMAC secret:** neither web page. Use your server code or a script.
- **Sharing a payload that contains a token:** [redact](/redact) it first; see [how to redact JSON before you share it](/guides/redact-secrets-before-sharing-json).

## Frequently asked

**Does jwt.io send my token to a server?** In our test on 25 October 2026 it did not: decoding happened in the page, and no request after pasting contained the token. The page does load many third-party marketing and analytics scripts.

**Why doesn't json0 verify signatures?** Verifying needs the key. For HMAC tokens that key is a shared secret, and json0 is designed so that nothing secret ever has to be typed into it. For a step-by-step on reading tokens safely, see [Decode a JWT safely](/guides/decode-jwt-safely).

**Can I decode a JWT without any website?** Yes. `cut -d. -f2 <<< "$TOKEN" | tr '_-' '/+' | base64 -d` prints the payload in a terminal.
