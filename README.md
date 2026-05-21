<div align="center">

<img src="https://raw.githubusercontent.com/jtmb/cardventory/main/public/image.png" alt="Cardventory" width="100%" />

**Self-hosted trading card collection manager with live market pricing**

<table class="no-border">
  <tr>
    <td><a href="https://github.com/jtmb/cardventory/actions/workflows/release.yml"><img src="https://github.com/jtmb/cardventory/actions/workflows/release.yml/badge.svg" alt="Release"/></a></td>
    <td><a href="https://github.com/jtmb/cardventory/actions/workflows/deploy.yml"><img src="https://github.com/jtmb/cardventory/actions/workflows/deploy.yml/badge.svg" alt="Deploy"/></a></td>
    <td><a href="https://github.com/jtmb/cardventory/actions/workflows/auto-tag.yml"><img src="https://github.com/jtmb/cardventory/actions/workflows/auto-tag.yml/badge.svg" alt="Auto Tag"/></a></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js&logoColor=white&labelColor=000000" alt="Next.js"/></td>
    <td><img src="https://img.shields.io/badge/React-19-blue?style=flat&logo=react&logoColor=61DAFB&labelColor=363D44" alt="React"/></td>
    <td><img src="https://img.shields.io/badge/Database-SQLite-blue?style=flat&logo=sqlite&logoColor=b0c0c0&labelColor=363D44" alt="SQLite"/></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/Auth-Auth.js_v5-blue?style=flat&logo=shield&logoColor=b0c0c0&labelColor=363D44" alt="Auth.js"/></td>
    <td><img src="https://img.shields.io/badge/Deploy-Docker-blue?style=flat&logo=docker&logoColor=b0c0c0&labelColor=363D44" alt="Docker"/></td>
    <td><img src="https://img.shields.io/badge/IaC-Terraform-purple?style=flat&logo=terraform&logoColor=b0c0c0&labelColor=363D44" alt="Terraform"/></td>
  </tr>
</table>

</div>

---

## What is Cardventory?

Cardventory is a self-hosted web application for managing your trading card collection. Add cards from any sport or genre, automatically pull live market prices from multiple sources, track your portfolio value over time, and get notified when a card hits a new all-time high.

Everything runs in a single Docker container backed by a local SQLite database — no external services required.

---

## Features

- **Collection management** — Add, edit and organize cards with photos, grades, purchase prices, set info and variants
- **Live price lookups** — Fetches market data from eBay, SportsCardInvestor, CardLadder and SportscardsPro
- **Portfolio dashboard** — Total collection value, gain/loss tracking, and 30-day portfolio history chart
- **Watchlist** — Track cards you're hunting without adding them to your collection
- **Price alerts** — Email and Discord notifications for price spikes and new all-time highs
- **3 card views** — Grid, List and Compact layouts with sortable columns
- **Multi-user** — Admin + standard user roles, invite-only or open registration
- **Backups** — Automated scheduled backups with one-click restore and CSV export
- **Fully customizable UI** — Themes, fonts, colours, zoom level, card sleeve effect, and layout options
- **Self-hosted** — Your data stays on your server; runs via Docker Compose

---

## Quick Start

### Docker Compose

```yaml
services:
  cardventory:
    image: ghcr.io/jtmb/cardventory:latest
    container_name: cardventory
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - AUTH_SECRET=your-secret-here   # openssl rand -base64 32
      - NEXTAUTH_URL=http://localhost:3000
      - EBAY_CLIENT_ID=                # optional
      - EBAY_CLIENT_SECRET=            # optional
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
```

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) — the first registered user becomes admin.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | **Yes** | Secret key for session signing. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **Yes** (prod) | Full public URL of the app, e.g. `https://cards.example.com` |
| `DATABASE_PATH` | No | SQLite file path. Default: `/app/data/cardventory.db` |
| `EBAY_CLIENT_ID` | No | eBay API client ID for more reliable eBay pricing |
| `EBAY_CLIENT_SECRET` | No | eBay API client secret |

---

## Development

**Prerequisites:** Node.js 20+

```bash
# Clone and install
git clone https://github.com/jtmb/cardventory.git
cd cardventory
npm install

# Configure
cp .env.example .env.local
# Edit .env.local and set AUTH_SECRET

# Run migrations and start dev server
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Production build |
| `npm run db:migrate` | Run database migrations |
| `npm run lint` | Run ESLint |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Database | SQLite via Drizzle ORM |
| Auth | Auth.js v5 (credentials + OAuth) |
| Charts | Recharts |
| Notifications | Nodemailer (SMTP), Discord webhooks |
| Container | Docker / Docker Compose |
| Infrastructure | Terraform (Linode) + Traefik |

---

## CI / CD

| Trigger | Workflow | Action |
|---|---|---|
| Push to `main` | **Auto Tag** | Bumps patch version and creates a git tag |
| New `v*.*.*` tag | **Release** | Builds multi-arch Docker image, pushes to GHCR, creates GitHub release |
| After release | **Deploy** | SSH pulls latest image on the production server |
| `terraform/**` changes | **Terraform** | Plans/applies infrastructure changes on Linode |

---

<div align="center">
  <sub>Built with ♥ · <a href="https://github.com/jtmb/cardventory">github.com/jtmb/cardventory</a></sub>
</div>
