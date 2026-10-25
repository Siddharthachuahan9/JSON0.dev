---
title: How to redact secrets and personal data from JSON before you share it
headline: Redact JSON before you share it
description: Before you paste a payload into a ticket, a chat or an AI assistant, strip the keys, tokens and customer details. Four ways to do it compared: json0 Redact, jq, Microsoft Presidio and gitleaks.
date: 2026-10-25
kind: comparison
tool: redact
---

**Short answer:** for a one-off payload, paste it into a redaction tool that runs locally and choose what happens to each kind of value. For a pipeline, use a library such as Presidio. Secret scanners like gitleaks find leaks but do not hand you a cleaned copy. Whatever you use, read the result before you send it.

Every week someone pastes a webhook payload into a support ticket with a live API key in the `authorization` header, or drops a customer record into an AI chat to ask why it fails validation. The fix takes a minute if you have the right tool open.

## What usually needs to go

In a typical API payload or export, the dangerous values are:

- **Credentials:** API keys (`sk_live_…`, `ghp_…`, `AKIA…`), bearer tokens and JWTs, passwords, webhook signing secrets.
- **Personal data:** names, email addresses, phone numbers, postal addresses.
- **Financial data:** card numbers, IBANs.
- **Network identifiers:** IP addresses, which count as personal data under GDPR.

Some of these have a recognisable shape (a JWT always starts with `eyJ`, a card number passes the Luhn check). Others only reveal themselves by their key: a password is just a string until you see it sits under `"password"`.

## The options

| | json0 Redact | jq | Microsoft Presidio | gitleaks |
| --- | --- | --- | --- | --- |
| What it is | Browser tool | Command-line JSON processor | Python library for PII detection and anonymisation | Secret scanner for repos, folders and stdin |
| Finds values by shape | Yes: JWTs, API keys, emails, IBANs, cards, phones, IPs | No, you write the rules | Yes, with patterns and NLP models | Yes, secrets only |
| Finds values by key name | Yes | Yes, you write the rules | Not its focus | Partly, via rules |
| Gives you a cleaned copy | Yes | Yes | Yes | No, it reports |
| Actions | Mask, fake, hash, remove | Whatever you write | Replace, redact, hash, mask, encrypt, keep, custom | `--redact` hides secrets in its own output |
| Setup | None | Install jq | Python packages and models | Install a binary |

### json0 Redact

Paste JSON or CSV and json0 lists every sensitive value it finds, grouped by kind, with the path where each one sits. For each kind you choose one action:

- **Mask** keeps the shape and hides the content: `4242 4242 4242 4242` becomes `**** **** **** 4242`, an email keeps its first letter and its domain, and other values keep their first three and last two characters.
- **Fake** swaps in a stand-in of the same kind, such as `user-3f9a1c@redacted.invalid` for an email or a test card number that still passes the Luhn check, so the payload still parses and still passes the validation you are debugging. The same input always gets the same stand-in.
- **Hash** replaces the value with `sha256:` and the start of its SHA-256 digest, computed with Web Crypto on your device. The same input always gives the same hash, so joins across records keep working.
- **Remove** deletes the key.

Detection combines shapes and key names. Card numbers must pass the Luhn check and IBANs their mod-97 checksum, which keeps order numbers and timestamps out of the findings. Values under keys like `password`, `secret`, `token`, `authorization` or `ssn` are caught whatever they look like.

The sample on the page has 14 findings across 13 fields, including three API keys, a JWT in an `authorization` header, a card, an IBAN and two phone numbers, one of them inside a free-text note.

[Open Redact](/redact)

### jq

If you know which keys to strip, jq does it in one line and fits into a script:

```bash
jq 'walk(if type == "object" then
      with_entries(if (.key | test("pass|secret|token|key|auth"; "i"))
                   then .value = "[REDACTED]" else . end)
    else . end)' payload.json
```

`walk` has been built into jq since version 1.6. The limitation is that you only catch what you thought of: an email address inside a `notes` string, or a token in a URL query string, goes straight through.

### Microsoft Presidio

Presidio is an open-source Python library that detects personal data in text with pattern recognisers and NLP models, then anonymises it with operators: replace, redact, hash, mask, encrypt, keep or a custom function. It is the serious choice for a data pipeline, such as cleaning logs before they reach a data warehouse or redacting chat transcripts before training. For a single payload you want to paste into a ticket, installing it is more work than the job.

### gitleaks

gitleaks scans git history, folders or stdin for credentials and tells you where they are. It is the right tool to stop a key from being committed, and its `--redact` flag keeps the secrets out of its own report. It does not produce a cleaned version of your file, and it does not look for personal data.

## A checklist before you paste

1. **Credentials first.** Any key, token or password should be revoked if it already left your machine. Redaction does not un-leak a secret.
2. **Look in strings, not just keys.** Notes, descriptions, URLs and headers carry emails, phone numbers and tokens.
3. **Hash with care.** An unsalted hash of an email or a phone number can be reversed by hashing guesses. Use hashing to keep joins working, not to hide a value from a determined reader.
4. **Keep the shape.** If you are debugging a parser, fake values beat removed keys, because the payload still has the structure that failed.
5. **Read the output.** No detector is perfect. The cleaned document is short; look at it before you send it.

## Frequently asked

**Is it safe to paste production data into an online redaction tool?** Only if the tool processes it locally. json0 runs the scan and the hashing in your browser and makes no request with your data; you can check that in your browser's network panel.

**Should I redact before asking an AI assistant about a payload?** Yes. Most questions about a payload's structure do not need the real values, and fake values keep the payload realistic enough for the answer to be right.
