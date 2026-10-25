**Short version:** what you paste into json0 stays in your browser. json0 has no server that receives it, and no accounts, cookies, analytics or ads. The only network requests besides loading the site are ones you trigger yourself, and they are listed below.

## What happens to what you paste

- **Every tool runs in the page.** Parsing, diffing, querying, formatting, converting, schema inference, redaction and hashing (with your browser's Web Crypto) all happen in JavaScript on your device.
- **Nothing you paste is uploaded, stored or logged by json0.** There is no json0 backend to send it to: the site is a set of static files.
- **Files you open are read by your browser.** Opening or dropping a file does not upload it.
- **Share links keep the data in the link.** A JSON Diff share link puts both documents in the part of the address after `#`, the fragment. Browsers do not send the fragment to the server, so json0 never receives it. Anyone you give the link to can read the documents, so treat the link like the data itself.

## What json0 keeps on your device

- **One setting:** if you switch to the dark theme, json0 remembers it in your browser's local storage under `json0-theme`. Nothing else is stored.
- **No cookies.** json0 does not set or read cookies.

## Network requests

**Loading a page.** The page, its stylesheet, its script and its fonts (IBM Plex, self-hosted) all come from json0.dev itself. There are no requests to font services, CDNs, analytics, advertising or tracking services. You can check this yourself; see below.

**Requests you trigger:**

- **Ping.** When you press Ping, json0 sends three `HEAD` requests to `https://` and the host you typed, one second apart, to time them. They carry no cookies and no referrer, and nothing else you pasted into json0. Nothing is sent until you press the button.
- **Request a feature.** *Open as a GitHub issue* opens GitHub in a new tab with your title and details in the address. GitHub's privacy policy applies from there, and the issue is public once you submit it. *Send by email* opens your own mail app with the message written; nothing is sent until you send it.
- **Links.** Links to other sites, such as GitHub or sidstack.in, are ordinary links.

The IP tool reads addresses locally. It does not look them up anywhere.

## Hosting

json0.dev is hosted on [Vercel](https://vercel.com/legal/privacy-policy). Like any web host, Vercel receives the standard information your browser sends with every request: your IP address, your browser's user agent, the address requested and the time. Vercel keeps request logs to deliver the site and to protect it from abuse. Those logs contain page addresses, not what you paste: pasted content never leaves your browser, and share-link contents are in the fragment, which is not sent.

## Check it yourself

You do not have to take this page's word for it:

1. Open your browser's developer tools (F12, or Cmd+Option+I on a Mac) and choose the **Network** tab. Tick **Preserve log**.
2. Load any json0 tool, paste some data and use the tool.
3. Every request in the list goes to json0.dev, and none is made when you paste or run a tool, apart from Ping, which goes to the host you typed.

The source code is public on [GitHub](https://github.com/Siddharthachuahan9/JSON0.dev), including the single script that runs every tool, `public/json0.js`.

## Using json0 with personal or confidential data

Because the data stays on your device, you can use json0 with customer records, credentials or confidential documents without sending them to json0. Your organisation's own rules still apply to your device and to anything you share afterwards: share links, screenshots, issues and emails.

## Questions

Write to [siddharthachauhan304@gmail.com](mailto:siddharthachauhan304@gmail.com) or [open an issue](https://github.com/Siddharthachuahan9/JSON0.dev/issues). If you ever see json0 send something this page does not describe, please report it.
