# json0.dev

**Fast, friendly JSON tools that run entirely in your browser.**

**Website:** https://json0.dev
**Tagline:** json tools, zero hassle

Privacy-first JSON tools for developers. Compare, query, validate JSON, decode JWT, generate hashes and UUIDs—all locally in your browser with zero data transmission.

---

## 🚀 Features

### JSON Tools
- **JSON Diff** - Compare two JSON documents with visual highlighting
- **JSON Validate** - Validate JSON syntax with detailed error messages
- **JSONPath Query** - Query JSON using JSONPath expressions

### Developer Tools
- **JWT Decoder** - Decode and inspect JWT tokens
- **Base64 Encoder/Decoder** - Encode and decode Base64 strings
- **Hash Generator** - Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes
- **UUID Generator** - Generate UUIDs (v4, v1-like, nil) with bulk support
- **IP Inspector** - Inspect IP addresses and get detailed information
- **Ping Tool** - Test network connectivity and response times

### Universal Features
- 🔒 **Privacy-First** - All processing happens locally in your browser
- 🔗 **Shareable Links** - Share tool state via URL hash (no server storage)
- 📋 **Copy Everywhere** - Copy results with one click
- 🎨 **Modern UI** - Clean, console-like interface with dark theme
- ⌨️ **Keyboard Shortcuts** - Command palette (Cmd+K) and shortcuts
- 📱 **Mobile Responsive** - Works on desktop, tablet, and mobile
- 🌐 **Works Offline** - All tools work without internet (except ping/IP)

---

## 🔐 Privacy Statement

**json0.dev is privacy-first by design:**

- ✅ **No user content leaves your browser** - All JSON processing, validation, diffing, and tool operations happen locally
- ✅ **No server storage** - We don't store, log, or transmit your data
- ✅ **No analytics on user input** - We never see what you paste
- ✅ **No accounts required** - Start using immediately, no signup
- ✅ **Safe for production data** - Paste sensitive data, API keys, tokens safely
- ✅ **No accounts, cookies, analytics or ads** - Details, and how to check them in your browser: https://json0.dev/privacy

**How sharing works:**
- Share links encode tool state in URL hash fragments (`#share=...`)
- Hash fragments are **never sent to servers** (they stay client-side)
- Opening a share link restores the tool state in your browser
- Sensitive data warning: We'll warn you before sharing potentially sensitive content

**Open source:**
- Full codebase transparency
- Verify our privacy claims by inspecting the code
- Network tab will show **zero requests** for your JSON data

---

## 🗺️ Routes

All tools have dedicated routes for easy bookmarking and sharing:

- **/** - Homepage (defaults to JSON Diff)
- **/json-diff** - JSON Diff tool
- **/json-validate** - JSON Validator
- **/jsonpath** - JSONPath Query tool
- **/jwt** - JWT Decoder
- **/base64** - Base64 Encoder/Decoder
- **/hash** - Hash Generator (SHA)
- **/uuid** - UUID Generator
- **/ping** - Ping Tool
- **/ip** - IP Inspector

Each route is statically generated and SEO-optimized.

---

## ⌨️ Keyboard Shortcuts

- **Cmd+K / Ctrl+K** - Open command palette (quick tool switcher)
- **Cmd+/ / Ctrl+/** - Toggle settings sidebar
- **Esc** - Close modals and dialogs

### Tool-Specific Shortcuts (Planned)
- **Cmd+S** - Save snapshot to browser storage
- **Cmd+Shift+F** - Format JSON
- **Cmd+Enter** - Execute query/operation

---

## 🛠️ Tech Stack

### Framework & Build
- **Next.js 14** (App Router) with TypeScript
- **React 18** with hooks and server components
- **CSS Modules** + CSS Variables (zero runtime, full control)

### JSON Processing
- **Monaco Editor** (VS Code engine) for syntax highlighting
- **json-diff-kit** for diffing
- **jsonpath-plus** for JSONPath queries
- **Zustand** for state management

### Developer Tools
- **Web Crypto API** for hash generation (SHA-1/256/384/512)
- **lz-string** for URL hash compression (shareable links)
- **Network APIs** for ping and IP inspection

### Privacy & Security
- 100% client-side processing
- No backend except static hosting
- Network guard utility (development mode) prevents accidental data transmission
- Redaction utility for sensitive data detection

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Start production server
npm run start
```

### Project Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout, fonts, metadata
│   ├── page.tsx                # Homepage (default: JSON Diff)
│   └── [tool]/
│       ├── page.tsx            # Dynamic route for all tools
│       └── not-found.tsx       # 404 for invalid tools
│
├── components/
│   ├── shell/                  # App shell, navigation, modals
│   │   ├── AppShell.tsx        # Main app container
│   │   ├── TopBar.tsx          # Tool navigation bar
│   │   ├── CommandPalette.tsx  # Cmd+K tool switcher
│   │   ├── PrivacyModal.tsx    # Privacy explanation modal
│   │   └── PrivacyBadge.tsx    # "Runs locally" badge
│   │
│   ├── tools/                  # Individual tool components
│   │   ├── JSONTools.tsx       # Diff, Validate, JSONPath
│   │   ├── JWTDecoder.tsx
│   │   ├── Base64Tool.tsx
│   │   ├── HashGenerator.tsx
│   │   ├── UUIDGenerator.tsx
│   │   ├── PingTool.tsx
│   │   └── IPInspector.tsx
│   │
│   ├── studio/                 # Editor panels for JSON tools
│   │   ├── EditorPanel.tsx
│   │   ├── InspectorPanel.tsx
│   │   ├── WorkspacePanel.tsx
│   │   └── MonacoEditor.tsx
│   │
│   └── common/                 # Reusable components
│       ├── ShareButton.tsx     # Share via URL hash
│       └── CopyButton.tsx      # Copy to clipboard
│
├── lib/
│   ├── routing.ts              # Route mapping for tools
│   ├── sessionStore.ts         # Local session storage
│   ├── seo/
│   │   └── jsonld.ts           # JSON-LD structured data
│   └── utils/
│       ├── shareState.ts       # URL hash encoding/decoding
│       ├── redaction.ts        # Sensitive data detection
│       ├── hashGenerator.ts    # SHA hash generation
│       ├── uuidGenerator.ts    # UUID generation
│       └── networkGuard.ts     # Privacy enforcement (dev mode)
│
└── public/
    ├── favicon.svg             # json0 logo (curly brace + 0)
    ├── site.webmanifest        # PWA manifest
    ├── robots.txt              # SEO: allow all crawlers
    └── sitemap.xml             # SEO: all tool routes
```

---

## 📦 Deployment to Vercel

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Vercel Configuration

The app is configured for **static export** (no server required):

1. **Output:** Static HTML export
2. **Routing:** Client-side routing with Next.js
3. **Build:** `npm run build`
4. **Output Directory:** `.next/` (automatically handled by Vercel)

### Environment Variables

**None required!** The app is 100% client-side with no backend.

### Custom Domain Setup

1. Go to Vercel project settings
2. Add your domain (e.g., `json0.dev`)
3. Configure DNS records as instructed
4. SSL is automatic via Vercel

---

## 🧪 Development Guidelines

### Git Workflow

**IMPORTANT:** Configure git at the start of every session:

```bash
git config user.name "Siddharthachuahan9"
git config user.email "siddharthachauhan304@gmail.com"
```

### Commit Guidelines

- **Author:** Always commit as "Siddharthachuahan9" (single author)
- **No co-authors:** Do not add "Co-authored-by" trailers
- **Messages:** Clear, descriptive commit messages

### Privacy Enforcement

The project includes a network guard utility (`lib/utils/networkGuard.ts`) that:
- Runs in development mode only
- Monitors `fetch()` and `XMLHttpRequest` calls
- Throws errors if user data is sent to servers
- Whitelist for framework needs (Next.js internals, static assets)

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build
```

---

## 🎨 Design System

### Colors

```
Brand:          #10b981 (emerald)
Background:     #0a0f1a (deep black)
Surfaces:       #1a1f2e (panels)
Borders:        #2d3748
Text:           #e8e8f0 (light grey)
```

### Typography

- **Headings:** Space Grotesk (geometric, technical)
- **Code:** JetBrains Mono (monospace with ligatures)
- **Body:** Manrope (rounded, modern)

### Spacing & Layout

- Consistent 8px grid system via CSS variables (`--space-1` to `--space-10`)
- Responsive breakpoints: 480px (mobile), 768px (tablet), 900px+ (desktop)

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Attribution

**Created by:** Siddharthachuahan9 (sidheart❤️)

**Built with:**
- Next.js, React, TypeScript
- Monaco Editor (Microsoft)
- json-diff-kit, jsonpath-plus
- Web Crypto API, lz-string

---

## 🔗 Links

- **Website:** https://json0.dev
- **Repository:** https://github.com/Siddharthachuahan9/ubiquitous-palm-tree
- **Report Issues:** https://github.com/Siddharthachuahan9/ubiquitous-palm-tree/issues

---

**json0.dev** - json tools, zero hassle 🚀
