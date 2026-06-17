# UI Design System

Elegant, calm, professional SaaS aesthetic. Inspired by Linear / Vercel / Notion — not flashy, not corporate-gray.

## Design principles

1. **Quiet elegance** — whitespace, subtle borders, soft shadows. UI stays out of the way.
2. **One accent** — neutral base + single brand color for actions and focus.
3. **Consistent rhythm** — 4px grid; spacing scale only (4, 8, 12, 16, 24, 32, 48, 64).
4. **Readable hierarchy** — size and weight, not rainbow colors.
5. **Motion with restraint** — 150–200ms transitions; no bounce, no parallax.

## Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Display | Geist Sans (fallback: Inter) | 30–36px | 600 |
| Page title | Geist Sans | 24px | 600 |
| Section title | Geist Sans | 18px | 500 |
| Body | Geist Sans | 14–15px | 400 |
| Caption | Geist Sans | 12–13px | 400, muted |

- Line height: 1.5 body, 1.25 headings
- Max content width: `1200px` for dashboard/marketplace grids

## Color tokens (CSS variables)

```css
:root {
  /* Neutral base — warm gray, not cold blue-gray */
  --background: 0 0% 99%;
  --foreground: 240 10% 10%;
  --muted: 240 5% 96%;
  --muted-foreground: 240 4% 46%;
  --border: 240 6% 90%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 10%;

  /* Brand accent — blue #2563eb */
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;

  /* Semantic */
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --destructive: 0 72% 51%;

  --radius: 0.75rem;               /* 12px — soft, modern */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.06);
}
```

Dark mode: same tokens inverted in `.dark` — ship dark mode in Phase 1, design for it now.

## Components (shadcn/ui)

Use shadcn primitives; customize tokens above. Do not raw-style every page.

| Component | Use |
|-----------|-----|
| `Card` | Product cards, dashboard tiles |
| `Button` | Primary = subscribe/launch; Ghost = secondary |
| `Input` + `Command` | Marketplace search |
| `Badge` | Subscribed, New, Featured |
| `Skeleton` | Loading states — always, never spinners alone |
| `Sheet` / `Dialog` | Product detail, confirm unsubscribe |
| `Tabs` | Marketplace: All / Subscribed / Categories |
| `Avatar` | User menu |
| `Separator` | Section breaks — subtle |

## Layout — platform shell

```
┌─────────────────────────────────────────────────────────┐
│  Logo    Dashboard   Marketplace          [Avatar ▾]   │  ← top nav, 56px, border-b
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Page title + short subtitle                           │
│                                                         │
│   [ Search........................... ]  [Filters ▾]    │  ← marketplace only
│                                                         │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│   │ Product │ │ Product │ │ Product │ │ Product │      │  ← responsive grid
│   │  card   │ │  card   │ │  card   │ │  card   │      │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Sidebar optional in Phase 2; top nav sufficient for MVP.
- Content padding: `24px` mobile, `32px` desktop.

## Product card (dashboard + marketplace)

```
┌──────────────────────────────┐
│  [icon]              [badge] │  ← 40px icon, subscribed badge top-right
│                              │
│  Product name                │  ← 16px semibold
│  One-line description        │  ← 13px muted, 2 lines max
│                              │
│  [ Launch ]  or  [ Subscribe]│  ← full-width button, bottom
└──────────────────────────────┘
```

- Card: `rounded-xl`, `border`, `shadow-sm`, hover `shadow-md` + `border-primary/20`
- Icon: Lucide or simple product SVG; consistent 40×40 container
- Never show 100+ cards without search/filter — see marketplace-scale.md

## Dashboard (subscribed products)

- **Hero strip**: "Good morning, {name}" + quick stats (optional later)
- **My apps**: grid of subscribed products only (typically < 20)
- **Empty state**: elegant illustration + CTA to Marketplace
- **Pinned apps** (phase 2): user orders favorites — design card API to support `sortOrder`

## Marketplace (100+ products)

See [marketplace-scale.md](marketplace-scale.md). UI rules:

- Search always visible — sticky below nav on scroll
- Category chips horizontal scroll
- Virtualized grid — never render 100+ DOM nodes
- Sections: Featured (8), Categories, All products (paginated)
- Product detail: slide-over sheet, not full page navigation

## Motion

```css
transition: color 150ms, background 150ms, box-shadow 200ms, transform 150ms;
/* hover card */
transform: translateY(-1px);
```

## Empty & error states

- Empty: centered, icon + one sentence + one button. No walls of text.
- Error: toast + inline retry. Never raw stack traces in UI.

## Do not

- Gradients on every card
- More than one accent color
- Dense 3-column forms on marketplace
- Bootstrap-era heavy borders
- Generic stock illustrations

## Phase 0 deliverable

- `platform-frontend`: Tailwind + shadcn init with tokens above
- Shell layout + one polished product card component
- Dashboard and marketplace pages with mock/seed data
