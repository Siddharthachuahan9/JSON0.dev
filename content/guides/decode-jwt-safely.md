---
title: Decoding a JWT safely: what you can read, what you can trust, and what never to paste
headline: Decode a JWT safely
description: Anyone can decode a JSON Web Token without a key. That does not make its contents true. What the header, payload and signature tell you, how to read exp and iat, and how to inspect a token without leaking it.
date: 2026-10-25
kind: guide
tool: jwt
---

**Short answer:** a JWT's header and payload are Base64url-encoded JSON, not encrypted, so you can decode them anywhere without a key. Decoding tells you what the token *claims*. Only verifying the signature with the right secret or public key tells you whether to *believe* it. And a live token is a password: decode it locally, never in a tool that sends it to a server.

## The three parts

A JWT looks like `xxxxx.yyyyy.zzzzz`:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   header
.eyJzdWIiOiJjdXNfUjJkOSIsImV4cCI6MTc5…  payload
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQ  signature
```

1. **Header:** which algorithm signed the token (`"alg": "HS256"`, `"RS256"`, `"ES256"`) and sometimes a key id (`kid`) that says which key to verify it with.
2. **Payload:** the claims, such as who the token is about and when it expires.
3. **Signature:** computed over the first two parts with a secret (HS256) or a private key (RS256, ES256).

Each part is Base64url: the URL-safe Base64 alphabet (`-` and `_` instead of `+` and `/`) with the `=` padding removed. That is why `atob()` on a raw JWT part sometimes fails: you have to swap the characters back and re-pad first.

## Reading the claims

The registered claims from RFC 7519 that you will see most:

| Claim | Meaning | Watch out for |
| --- | --- | --- |
| `sub` | Subject: who the token is about | An id, not a name |
| `iss` | Issuer: who created it | Check it matches the issuer you expect |
| `aud` | Audience: who it is for | A token for another service should be rejected |
| `exp` | Expires at | Seconds since 1970, not milliseconds |
| `iat` | Issued at | Seconds |
| `nbf` | Not valid before | Seconds |

The time claims are the usual source of confusion. `"exp": 1793491200` is 2026-11-01 00:00:00 UTC. In JavaScript, `new Date(1793491200)` gives you a date in January 1970, because `Date` wants milliseconds: use `new Date(exp * 1000)`.

json0's [JWT decoder](/jwt) shows each time claim as a UTC date and tells you whether the token has expired, judged by your device's clock.

## Decoding is not verifying

Anyone can write a payload that says `"role": "admin"` and Base64url-encode it. Decoding cannot tell that token from a real one. Only the signature can, and checking it needs:

- **HS256 / HS384 / HS512:** the shared secret the issuer signed with.
- **RS256, ES256 and friends:** the issuer's public key, usually published at a JWKS endpoint such as `/.well-known/jwks.json`.

So decode tokens to debug them ("why is this user getting a 401? Oh, `aud` is wrong"), and verify them in your server code, with a maintained library, before you act on any claim.

Two classic mistakes when verifying:

- **Trusting the header's `alg`.** A token with `"alg": "none"` has no signature at all. Configure your library with the algorithms you expect and reject the rest.
- **Skipping `exp`, `aud` or `iss`.** A valid signature on an expired token, or on a token meant for another service, is still a token you should refuse.

json0 does not verify signatures. It says so on the page, and it never asks for your signing secret, because a secret pasted into a web page is a secret you have to rotate.

## Decoding without leaking

A live access token is as good as a password until it expires. Before you paste one anywhere:

- **Prefer a local decoder.** json0 decodes in the page and sends nothing. You can also do it in a terminal:

  ```bash
  cut -d. -f2 <<< "$TOKEN" | tr '_-' '/+' | base64 -d 2>/dev/null; echo
  ```

  (`base64 -d` may complain about the missing padding at the end but still prints the JSON.)
- **Prefer expired tokens** when you share an example in a ticket or a doc.
- **Strip tokens from payloads** before sharing them. A JWT inside an `authorization` header is the most common secret in pasted webhook payloads; json0's [Redact](/redact) finds and replaces them.

## Signed is not encrypted

Everything above is about JWS, the signed form, which is what "JWT" almost always means. The payload is readable by anyone who has the token. Do not put anything in it that the holder should not see.

If the payload must be hidden, the token has to be a JWE, an encrypted JWT. A JWE has five parts instead of three, and decoding its payload needs the decryption key. A decoder that shows you the payload of a five-part token is not possible without that key.

## Frequently asked

**Why does my token decode but my API still rejects it?** Look at `exp` (expired?), `nbf` (not yet valid?), `aud` and `iss` (meant for another service or environment?), and the header's `kid` (signed with a key your API does not know?).

**Is it safe to decode a JWT on a website?** Only on one that decodes in the browser and does not send the token anywhere. If you cannot tell, use a local tool or the terminal.
