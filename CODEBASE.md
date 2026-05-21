# Cardventory — AI Agent Codebase Reference

> **For AI agents:** Read `node_modules/next/dist/docs/` before writing code. This is Next.js 16 App Router — APIs differ from training data. See `AGENTS.md`.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema](#3-database-schema)
4. [API Routes](#4-api-routes)
5. [lib/ Utilities](#5-lib-utilities)
6. [Theme & Settings System](#6-theme--settings-system)
7. [Auth System](#7-auth-system)
8. [Reusable Components](#8-reusable-components)
9. [Common UI Patterns](#9-common-ui-patterns)
10. [Data Fetching Patterns](#10-data-fetching-patterns)
11. [Docker & Deployment](#11-docker--deployment)
12. [CI/CD Pipeline](#12-cicd-pipeline)
13. [Environment Variables](#13-environment-variables)
14. [npm Scripts](#14-npm-scripts)

---

## 1. Project Overview

**Cardventory** is a self-hosted trading card collection manager with live market pricing.

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, `output: "standalone"`, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Database | SQLite via Drizzle ORM 0.45 |
| Auth | Auth.js v5 (`next-auth@beta`) — JWT strategy |
| Charts | Recharts |
| Notifications | Nodemailer (SMTP) + Discord webhooks |
| Container | Docker / Docker Compose |
| Infrastructure | Terraform (Linode) + Traefik |
| Image | `ghcr.io/jtmb/cardventory` |

---

## 2. Directory Structure

```
cardventory/
├── app/
│   ├── (auth)/                    # Login/register pages (unauthenticated layout)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/               # Main app shell (authenticated layout)
│   │   ├── layout.tsx             # Root dashboard layout with sidebar
│   │   ├── page.tsx               # Dashboard home (portfolio summary, charts)
│   │   ├── collection/page.tsx    # Card collection grid/list/compact view
│   │   ├── watchlist/page.tsx     # Wanted cards list
│   │   ├── settings/page.tsx      # "use client" — all settings UI
│   │   └── admin/                 # Admin-only pages
│   │       ├── page.tsx           # Analytics dashboard
│   │       ├── users/page.tsx     # User management
│   │       └── system/page.tsx    # System configuration
│   ├── api/                       # API route handlers (see §4)
│   └── layout.tsx                 # Root layout: fonts, theme-init script, FOUC prevention
├── components/
│   ├── ui/                        # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   ├── AddCardModal.tsx           # Full card creation form
│   ├── EditCardModal.tsx          # Card edit form
│   ├── CardGrid.tsx               # Grid/list/compact card display
│   ├── PriceChart.tsx             # Recharts price history chart
│   ├── Sidebar.tsx                # Navigation sidebar
│   ├── NotificationBell.tsx       # Notification dropdown
│   ├── ThemeCustomizer.tsx        # Live theme editor
│   └── ...
├── lib/
│   ├── db/
│   │   ├── index.ts               # DB connection (Drizzle + better-sqlite3)
│   │   └── schema.ts              # All table definitions + inferred types
│   ├── actions.ts                 # Server actions (card CRUD, settings, users)
│   ├── theme.ts                   # ALL theme constants, LS keys, apply functions
│   ├── scrapers/                  # Price scrapers (eBay, SCI, CardLadder, SportsCardsPro)
│   ├── backup.ts                  # Backup/restore logic
│   ├── cron.ts                    # Scheduled price refresh (24h interval)
│   ├── notifications.ts           # Email + Discord notification senders
│   └── utils.ts                   # General helpers
├── public/
│   ├── logo.png                   # Stacked cards icon (transparent bg)
│   ├── logo-dark.png              # Logo on dark slate background
│   ├── banner.png                 # White-text banner for dark bg
│   ├── favicon.svg                # SVG favicon (black card, white arrow)
│   └── theme-init.js              # Inline FOUC-prevention script
├── auth.ts                        # NextAuth config with providers + callbacks
├── auth.config.ts                 # Auth edge config (middleware-safe)
├── middleware.ts                  # Route protection (redirects unauthenticated users)
├── next.config.ts                 # Next.js config (standalone output, image domains)
├── drizzle.config.ts              # Drizzle Kit config (SQLite path)
├── docker-compose.yml             # Local/prod compose definition
├── Dockerfile                     # 3-stage build (deps → builder → runner)
└── .github/workflows/             # CI/CD (auto-tag, release, deploy, terraform)
```

---

## 3. Database Schema

File: `lib/db/schema.ts`
Connection: `lib/db/index.ts` — exports `db` (Drizzle) and `rawSqlite` (better-sqlite3 for sync queries).

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | `crypto.randomUUID()` |
| `name` | text NOT NULL | |
| `email` | text UNIQUE NOT NULL | |
| `password_hash` | text NOT NULL | empty string for OAuth users |
| `role` | `"admin"\|"user"` | default `"user"` |
| `locked_at` | timestamp | non-null = account locked |
| `status` | `"active"\|"pending"` | default `"active"` |
| `created_at` | timestamp | |

### `cards`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text FK→users | cascade delete |
| `name` | text NOT NULL | |
| `set_name` | text | |
| `year` | integer | |
| `sport_genre` | text | default `"other"` |
| `card_number` | text | |
| `variant` | text | |
| `grade_company` | text | PSA, BGS, CGC, SGC, raw |
| `grade_value` | text | 10, 9.5, 9 etc. |
| `condition` | text | mint, near_mint, excellent etc. |
| `purchase_price` | real | default `0` |
| `notes` | text | |
| `photo_url` | text | path relative to `/uploads/` |
| `status` | text | `"owned"\|"wanted"` |
| `created_at` / `updated_at` | timestamp | |

### `price_history`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `card_id` | text FK→cards | cascade delete |
| `source` | text | `ebay\|sportscardinvestor\|cardladder\|sportscardspro` |
| `price` | real | |
| `currency` | text | default `"USD"` |
| `url` | text | source listing URL |
| `image_url` | text | |
| `fetched_at` | timestamp | |

### `settings`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text FK→users (nullable) | NULL = system-wide |
| `key` | text NOT NULL | |
| `value` | text NOT NULL | |

**System-wide keys** (`user_id IS NULL`): `allow_registration`, `require_approval`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`, `discord_webhook_url`, `oauth_google_client_id`, `oauth_google_client_secret`, `oauth_github_client_id`, `oauth_github_client_secret`

**Per-user keys**: `notify_new_high`, `notify_price_change`, `notification_email`, `discord_user_id`, `settings_layout`, `settings_arrangement`

### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users | cascade delete |
| `message` | text | human-readable |
| `card_id` | text FK→cards (nullable) | |
| `type` | `"new_high"\|"price_change"` | |
| `read` | boolean | default false |
| `created_at` | timestamp | |

### `user_login_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users | cascade delete |
| `ip_address` | text | |
| `login_at` | timestamp | |

### `banned_users`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `email` | text | |
| `ip_address` | text (nullable) | |
| `banned_at` | timestamp | |
| `banned_by_user_id` | text (nullable) | |
| `reason` | text (nullable) | |

### Inferred TypeScript Types
```ts
User, NewUser, Card, NewCard, PriceHistory, NewPriceHistory,
Setting, Notification, NewNotification, UserLoginLog, NewUserLoginLog, BannedUser
```

---

## 4. API Routes

All routes under `app/api/`. Auth via `auth()` from `auth.ts`.

### Cards

#### `GET/POST /api/cards`
- **GET**: User's cards. Query: `status=owned|wanted`
- **POST**: Create card. Body: Card fields

#### `GET/PATCH/DELETE /api/cards/[id]`
- **GET**: Single card + latest prices
- **PATCH**: Update card fields
- **DELETE**: Delete card + cascade price_history

#### `GET/POST /api/cards/[id]/prices`
- **GET**: Price history grouped by source
- **POST**: Trigger manual scrape. Body: `{ cardName, gradeValue, gradeCompany, year, setName }`

#### `GET /api/cards/export`
Returns CSV of full collection.

#### `GET /api/cards/image-search`
Query: `?q=<card name>`. Returns `{ imageUrl }` from eBay search.

### Settings

#### `GET/POST /api/settings`
- **GET**: User settings as `{ key: value }` map
- **POST**: Upsert settings. Body: flat key-value object

#### `GET/POST /api/system-settings` _(admin only)_
- **GET**: System-wide settings
- **POST**: Upsert system settings

### Auth

#### `GET/POST /api/auth/[...nextauth]`
NextAuth handler (credentials, Google, GitHub).

#### `POST /api/auth/log-ip`
Log IP. Body: `{ ip: string }`

#### `POST /api/register`
Public. Body: `{ name, email, password }`. Checks bans, `allow_registration`, `require_approval`. Returns `201` or `409`/`403`.

### Admin _(all admin only)_

#### `GET /api/admin/analytics`
Returns `{ totalUsers, totalCards, totalValue, recentSignups[], topCollectors[] }`

#### `GET/POST/DELETE /api/admin/users`
CRUD users. DELETE: `?id=`

#### `GET/POST/DELETE /api/admin/bans`
CRUD bans. POST body: `{ email, ipAddress?, reason? }`. DELETE: `?id=`

#### `GET /api/admin/pending-count`
Returns `{ count: number }` of `status = "pending"` users.

#### `POST /api/admin/logo`
Multipart upload custom logo → `public/uploads/logo.*`

### Notifications

#### `GET/PATCH /api/notifications`
- **GET**: Unread notifications for current user
- **PATCH**: Mark read. Body: `{ ids: string[] }`

#### `POST /api/notifications/test`
Send test notification (email + Discord).

### Files

#### `POST /api/upload`
Multipart card photo upload → `/app/uploads/`. Returns `{ url: string }`

#### `GET /api/backups` — list backups
#### `POST /api/backups` — trigger backup
#### `GET/DELETE /api/backups/[name]` — download or delete

### OAuth

#### `GET /api/oauth-status`
Returns `{ google: boolean, github: boolean }`

### Pricing

#### `POST /api/pricing`
Body: `{ name, gradeValue?, gradeCompany?, year?, setName? }`. Returns `{ source, price, url, imageUrl }[]`

---

## 5. lib/ Utilities

### `lib/db/index.ts`
```ts
import { db } from "@/lib/db";        // Drizzle ORM
import { rawSqlite } from "@/lib/db"; // better-sqlite3 sync queries
```
SQLite path: `process.env.DATABASE_PATH ?? "/app/data/cardventory.db"`. WAL mode on.

### `lib/actions.ts`
```ts
// Cards
getCards(userId, status?)           → Card[]
getCard(cardId, userId)             → Card | null
createCard(userId, data)            → Card
updateCard(cardId, userId, data)    → Card
deleteCard(cardId, userId)          → void
getCardWithPrices(cardId, userId)   → Card & { prices: PriceHistory[] }

// Settings
getUserSettings(userId)             → Record<string, string>
upsertSetting(userId, key, value)   → void
getSystemSettings()                 → Record<string, string>
upsertSystemSetting(key, value)     → void

// Users (admin)
getAllUsers()    → User[]
deleteUser(id)  → void
approveUser(id) → void
lockUser(id)    → void
unlockUser(id)  → void
setUserRole(id, role) → void

// Notifications
getNotifications(userId)         → Notification[]
markNotificationsRead(ids)       → void
createNotification(data)         → Notification
```

### `lib/theme.ts`
**localStorage keys — always import, never hardcode:**
```ts
THEME_LS_KEY, FONT_LS_KEY, PRESET_LS_KEY, TYPE_DENSITY_LS_KEY,
CARD_STYLE_LS_KEY, CHIP_STYLE_LS_KEY, BUTTON_STYLE_LS_KEY,
ZOOM_SCALE_LS_KEY, SLEEVE_LS_KEY,
SETTINGS_LAYOUT_LS_KEY, SETTINGS_ARRANGEMENT_LS_KEY
```

**Apply functions (client-side only):**
```ts
applyThemeColors(colors), resetThemeColors()
applyFontTheme(key), applyPresetTheme(key), applyTypeDensity(key)
applyCardStyle(key), applyChipStyle(key), applyButtonStyle(key)
applyZoomScale(key), applySleeve(on: boolean)
settingsLayoutWrapperClass(key)    → Tailwind max-w-* string
settingsArrangementClass(key)      → Tailwind grid/space-y string
```

**Options arrays (build pickers from these):**
```ts
THEME_VARS, FONT_THEMES, PRESET_THEMES, TYPE_DENSITY_OPTIONS,
CARD_STYLE_OPTIONS, CHIP_STYLE_OPTIONS, BUTTON_STYLE_OPTIONS,
ZOOM_SCALE_OPTIONS, SETTINGS_LAYOUT_OPTIONS, SETTINGS_ARRANGEMENT_OPTIONS
```

**FOUC prevention:**
```ts
THEME_INIT_SCRIPT  // inline <script> string injected in app/layout.tsx <head>
```

### `lib/scrapers/`
```ts
// Each file exports:
scrape*(query: string) → Promise<{ source, price, url, imageUrl? }[]>
// Sources: eBay, SportsCardInvestor, CardLadder, SportsCardsPro
```

### `lib/cron.ts`
```ts
startCronJob()  // 24h interval: refresh all card prices + fire notifications
```

### `lib/backup.ts`
```ts
createBackup() → Promise<string>  // filename
listBackups()  → string[]
restoreBackup(filename) → Promise<void>
deleteBackup(filename)  → void
```

### `lib/notifications.ts`
```ts
sendEmailNotification(to, subject, html)     → Promise<void>
sendDiscordNotification(webhookUrl, message) → Promise<void>
sendDiscordDM(userId, message)               → Promise<void>
```
SMTP config from system settings (`smtp_*` keys in DB).

---

## 6. Theme & Settings System

### How it works
1. CSS vars in `globals.css` with defaults
2. `THEME_INIT_SCRIPT` injected as inline `<script>` before first paint (FOUC prevention)
3. Client components call apply functions on mount + on change
4. **Dual-write**: localStorage + `POST /api/settings` on every change

### CSS variable mapping (`applyThemeColors`)
- `primary` → `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1`
- `card` → `--card`, `--popover`, `--secondary`, `--muted`, `--accent`
- `sidebar` → `--sidebar`, `--sidebar-accent`
- `foreground` → `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--sidebar-foreground`, `--accent-foreground`
- `mutedForeground` → `--muted-foreground`, `--sidebar-accent-foreground`

### Settings page pattern (`settings/page.tsx`)
```tsx
"use client"
// Mount: localStorage (sync) → apply → API fetch → reconcile
// Change: state → localStorage → POST /api/settings
// Wrapper: settingsLayoutWrapperClass(settingsLayout)
// Section: settingsArrangementClass(settingsArrangement)
```

### Mutual disabled states
- **Centered** layout + **Grid/Dense** arrangement are mutually exclusive
- Disabled: `opacity-35 cursor-not-allowed` + descriptive tooltip

---

## 7. Auth System

### Session access
```ts
// Server (route handlers / server components)
import { auth } from "@/auth"
const session = await auth()
if (!session?.user) return redirect("/login")
const { id: userId, role } = session.user  // role: "admin" | "user"

// Client components
import { useSession } from "next-auth/react"
const { data: session } = useSession()
```

### Providers
- **Credentials**: email + bcrypt. Blocks locked/pending/banned/empty-hash users
- **Google / GitHub**: DB `oauth_*` settings first, env var fallback

### OAuth user creation flow
1. Existing user → locked/pending/banned check
2. New user → check `allow_registration` → check `require_approval` → create with `status`

### Route protection
`middleware.ts` uses edge-safe `auth.config.ts` — redirects to `/login`. Admin checks in route handlers.

### IP logging
Client: `POST /api/auth/log-ip` after login → `user_login_logs`.

---

## 8. Reusable Components

| Component | Purpose |
|---|---|
| `AddCardModal` | Full card creation form (`onSuccess` callback) |
| `EditCardModal` | Edit card (`card: Card`, `onSuccess`) |
| `CardGrid` | Display cards — `view: "grid"\|"list"\|"compact"` |
| `PriceChart` | Recharts price history (`cardId`, `source?`) |
| `NotificationBell` | Bell + unread count + dropdown list |
| `ThemeCustomizer` | Sliding live theme editor panel |
| `Sidebar` | Nav with user info, links, pending user badge |
| `ImageUpload` | Drag-drop upload (`onUpload: (url) => void`) |

**shadcn/ui primitives:** `Button`, `Input`, `Label`, `Dialog`, `Select`, `Textarea`, `Badge`, `Card`, `Tabs`, `DropdownMenu`, `Popover`, `Tooltip`, `Separator`, `Switch`, `Slider`, `Avatar`, `Table`

---

## 9. Common UI Patterns

### Search + Filter + Sort
```tsx
const [search, setSearch] = useState("")
const [sortField, setSortField] = useState<keyof Card>("createdAt")
const [sortDir, setSortDir] = useState<"asc"|"desc">("desc")
const [filterGenre, setFilterGenre] = useState("all")

const filtered = cards
  .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  .filter(c => filterGenre === "all" || c.sportGenre === filterGenre)
  .sort((a, b) => sortDir === "asc"
    ? (a[sortField] > b[sortField] ? 1 : -1)
    : (a[sortField] < b[sortField] ? 1 : -1))
```

### Settings picker button group
```tsx
{OPTIONS.map(opt => (
  <button
    key={opt.key}
    onClick={() => !disabled && handleChange(opt.key)}
    className={cn(
      "px-3 py-1.5 rounded text-sm",
      current === opt.key
        ? "bg-primary text-primary-foreground"
        : "bg-muted hover:bg-accent",
      disabled && "opacity-35 cursor-not-allowed"
    )}
    title={disabled ? "Disabled reason" : opt.desc}
  >
    {opt.label}
  </button>
))}
```

### Toast (sonner)
```ts
import { toast } from "sonner"
toast.success("Card saved")
toast.error("Something went wrong")
toast.loading("Saving...", { id: "save" })
toast.dismiss("save")
```

### Confirm-before-delete
```tsx
const [confirmId, setConfirmId] = useState<string | null>(null)
// if confirmId === item.id → show "Confirm? Yes/Cancel"
// else → "Delete" button that sets confirmId
```

### Image upload
```tsx
const formData = new FormData()
formData.append("file", file)
const { url } = await fetch("/api/upload", { method: "POST", body: formData }).then(r => r.json())
// url: "/uploads/uuid.ext"
```

### Standard API call (client)
```tsx
const [loading, setLoading] = useState(false)
async function handleAction() {
  setLoading(true)
  try {
    const res = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Unknown error")
  } finally {
    setLoading(false)
  }
}
```

### Settings load + save
```tsx
// Load: localStorage (sync) → API (async reconcile)
useEffect(() => {
  const local = localStorage.getItem(SETTINGS_LAYOUT_LS_KEY)
  if (local) setSettingsLayout(local as SettingsLayoutKey)
  fetch("/api/settings").then(r => r.json()).then(d => {
    if (d.settings_layout) setSettingsLayout(d.settings_layout)
  })
}, [])

// Save: both simultaneously
function save() {
  localStorage.setItem(SETTINGS_LAYOUT_LS_KEY, value)
  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings_layout: value }),
  })
}
```

---

## 10. Data Fetching Patterns

### Server components (default)
```tsx
import { auth } from "@/auth"
import { getCards } from "@/lib/actions"

export default async function Page() {
  const session = await auth()
  const cards = await getCards(session!.user.id)
  return <CardGrid cards={cards} />
}
```

### Parallel server fetch
```tsx
const [cards, settings] = await Promise.all([
  getCards(userId),
  getUserSettings(userId),
])
```

### Client components
- `"use client"` at top
- `useEffect` + `fetch()` for data
- **Always** use `next/navigation`, not `next/router`

### Optimistic updates
```tsx
setCards(prev => prev.filter(c => c.id !== id))  // update first
await fetch(`/api/cards/${id}`, { method: "DELETE" })
// on error: refetch to revert
```

---

## 11. Docker & Deployment

### Dockerfile (3 stages)
1. **deps**: `node:20-alpine` — `npm ci`
2. **builder**: copy src + deps → `next build` → `.next/standalone/`
3. **runner**: `node:20-alpine` → copy standalone → `CMD ["node", "server.js"]`

### Volumes
```yaml
./data:/app/data         # SQLite database
./uploads:/app/uploads   # Card photos
```

### Production stack
- Linode VPS (Terraform-managed)
- Traefik reverse proxy (HTTPS)
- Deploy: `docker compose pull && docker compose up -d`

---

## 12. CI/CD Pipeline

### Trigger chain
```
push to main
  → auto-tag.yml: bump patch version if needed → create git tag
      → release.yml: multi-arch Docker build → push ghcr.io → GitHub Release
          → deploy.yml: SSH → docker compose pull && up -d
```

### `auto-tag.yml`
- Trigger: push to `main` (skips `[skip ci]`)
- Bumps `package.json` patch if tag exists → commits `[skip ci]` → creates tag → dispatches release.yml

### `release.yml`
- Trigger: `v*.*.*` tag or `workflow_dispatch`
- Builds `linux/amd64` + `linux/arm64` → pushes `ghcr.io/jtmb/cardventory`
- Trivy security scan → GitHub Release → dispatches deploy.yml

### `deploy.yml`
- Trigger: `workflow_dispatch`
- SSH to `vars.LINODE_HOST` → `docker compose pull && docker compose up -d --remove-orphans && docker image prune -f`

### `terraform.yml`
- Trigger: `terraform/**` path changes
- Plans/applies Linode infra

### Required secrets & vars
| Name | Type | Used by |
|---|---|---|
| `GH_PAT` | secret | auto-tag (push commits + tags) |
| `DEPLOY_SSH_KEY` | secret | deploy (SSH private key) |
| `LINODE_HOST` | var | deploy (server hostname) |
| `LINODE_TOKEN` | secret | terraform |

---

## 13. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | **Yes** | JWT signing secret. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes (prod) | Public URL e.g. `https://cards.example.com` |
| `DATABASE_PATH` | No | Default: `/app/data/cardventory.db` |
| `EBAY_CLIENT_ID` | No | eBay Developer API |
| `EBAY_CLIENT_SECRET` | No | eBay Developer API |
| `AUTH_GOOGLE_ID` | No | Fallback (DB setting takes priority) |
| `AUTH_GOOGLE_SECRET` | No | Fallback |
| `AUTH_GITHUB_ID` | No | Fallback |
| `AUTH_GITHUB_SECRET` | No | Fallback |

> SMTP and OAuth credentials also configurable via Admin → System Settings (stored in `settings` table, `user_id IS NULL`). DB values take priority over env vars.

---

## 14. npm Scripts

```bash
npm run dev          # Dev server with Turbopack (port 3000)
npm run build        # Production build → .next/standalone/
npm run start        # Start production server
npm run lint         # ESLint
npm run db:migrate   # Drizzle migrations
npm run db:studio    # Drizzle Studio (browser DB UI)
npm run db:push      # Push schema without migration file
```

---

## Quick Reference

| Task | Location |
|---|---|
| Add API endpoint | `app/api/<name>/route.ts` |
| Add DB table | `lib/db/schema.ts` → `npm run db:migrate` |
| Add theme option | `lib/theme.ts` (options array + apply function) |
| Add setting key | `lib/theme.ts` LS key constant + `settings/page.tsx` |
| Read session (server) | `import { auth } from "@/auth"` → `await auth()` |
| Read session (client) | `import { useSession } from "next-auth/react"` |
| Trigger price scrape | `POST /api/cards/[id]/prices` |
| Send notification | `lib/notifications.ts` |
| Add price scraper | `lib/scrapers/` → register in `lib/actions.ts` |
| Understand FOUC prevention | `THEME_INIT_SCRIPT` in `lib/theme.ts` + `app/layout.tsx` |
| Find Docker image | `ghcr.io/jtmb/cardventory:latest` |
| Check CI/CD | GitHub Actions: auto-tag, release, deploy, terraform |
