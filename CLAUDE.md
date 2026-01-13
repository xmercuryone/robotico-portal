# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XMAQUINA Market Cap is an Astro-based static site that tracks humanoid robotics companies and their market valuations. It features company profiles, robot details, industry analytics, and an interactive globe visualization. The site deploys to Netlify.

## Commands

```bash
npm run dev       # Start dev server at localhost:4321
npm run build     # Build production site to ./dist/
npm run preview   # Preview production build locally
```

## Architecture

### Technology Stack
- **Framework**: Astro 5.x with static site generation
- **Styling**: CSS with custom properties (CSS variables)
- **Data**: JSON-based company/robot data in `src/data/`
- **Stock Data**: yahoo-finance2 library for market cap information
- **Deployment**: Netlify with serverless functions support

### Project Structure
```
src/
├── data/           # Company and robot data (companies.json)
├── layouts/        # Astro layouts (Layout.astro)
├── pages/          # Route pages
│   ├── index.astro        # Main company listing
│   ├── industry.astro     # Industry overview
│   ├── globe.astro        # Interactive 3D globe
│   ├── company/[id].astro # Dynamic company pages
│   ├── robot/[id].astro   # Dynamic robot pages
│   └── sitemap.xml.ts     # Generated sitemap
├── styles/         # Global CSS styles
└── components/     # Reusable Astro components

public/
├── logos/          # Company favicon/logos (.ico)
├── robots/         # Robot images (.webp)
└── *.svg           # Site logos and OG images

netlify/
└── functions/      # Netlify serverless functions (stock-prices.js)
```

### Key Pages
- `/` - Main ranking page with all 20 companies sorted by market cap
- `/company/[id]` - Individual company profiles (e.g., `/company/tesla`)
- `/robot/[id]` - Robot detail pages (e.g., `/robot/optimus-gen2`)
- `/industry` - Industry-wide statistics and trends
- `/globe` - Interactive 3D globe showing company locations

### Data Flow
1. Company data is defined in `src/data/companies.json`
2. Pages use Astro's `getStaticPaths()` for dynamic routes
3. Stock prices can be fetched via Netlify functions (`/api/stock-prices`)
4. All pages are pre-rendered at build time (SSG)

## Netlify Configuration

The `netlify.toml` configures:
- Build command and publish directory
- Node 18 runtime
- API routes redirect `/api/*` to Netlify functions
- SPA fallback for client-side routing

## Deployment

- **Live URL**: https://xmaquina-marketcap.netlify.app
- **GitHub**: github.com/xmercuryone/xmaquina-hip-v0 (private repo)
- **SSH**: Uses `github-xmercuryone` host alias (configured in ~/.ssh/config)
- **Deploy**: `netlify deploy --prod --dir=dist`

## Logo Handling

Some company logos require special handling:

### Dark Logos (need white background in dark mode)
`darkLogos` array in page components: apptronik, hyundai, honda, toyota, xpeng, agility-robotics, 1x-technologies, neura-robotics

### SVG Logos (instead of .ico)
`svgLogos` array: neura-robotics
- Use `getLogoPath(companyId)` helper function to get correct path

### CSS Classes
- `.dark-logo` - Gets white background in dark mode
- `.light-logo` - Gets inverted in light mode (currently unused)

## Mobile Responsiveness

CSS breakpoints in `src/styles/global.css`:
- 768px - Tablet
- 480px - Mobile
- 360px - Small mobile

## Development Notes

- Use `spark.local` instead of `localhost` for local URLs
- Python HTTP server works better than Vite dev server for network access: `python3 -m http.server 4321 --bind 0.0.0.0` from dist/
- Headless Chromium for screenshots: `/snap/bin/chromium --headless --no-sandbox --screenshot=file.png --window-size=1400,900 "URL"`
