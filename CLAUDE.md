# Build Fullstack App Project

## Git Configuration
**IMPORTANT: Run these commands at the start of EVERY session:**
```bash
git config user.name "Siddharthachuahan9"
git config user.email "siddharthachauhan304@gmail.com"
```

To verify configuration:
```bash
git config user.name
git config user.email
```

## Commit Guidelines
- **Author**: Always commit as "Siddharthachuahan9" (single author)
- **No co-authors**: Do not add "Co-authored-by" trailers to commit messages
- **Commit messages**: Keep them clear and descriptive

## Project Overview
This is json0.dev - a full-stack JSON tools application built with modern web technologies.

**Website:** https://json0.dev
**Tagline:** json tools, zero hassle

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint checking

## Tech Stack
- **Framework**: Next.js 15 (App Router, static generation) + React 19 + TypeScript
- **UI**: the framed-sheet design, one server-rendered shell (`lib/shell/markup.ts`) with a view per tool
- **Behaviour**: one plain script, `public/json0.js`, loaded with next/script; no client dependencies
- **Routing**: a real path per tool (`lib/routing.ts`); the script switches views with history.pushState
- **Styling**: `app/globals.css` with CSS variables, light and dark themes
- **Fonts**: IBM Plex Sans and IBM Plex Mono via next/font
- **Guides**: Markdown in `content/guides` (front matter: title, headline, description, date, kind, tool), rendered at `/guides/<slug>`, served raw at `/guides/<slug>.md`, and listed in `/llms.txt` and `/llms-full.txt`. Add new files to `ORDER` in `lib/guides.ts`

## Important Notes
- All commits should be authored by Siddharthachuahan9 only
- Never include co-author information in commit messages
- Always verify Git config at the start of each Claude Code session
- 100% client-side processing - no backend servers
- Privacy-first architecture
