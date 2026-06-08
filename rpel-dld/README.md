# RPEL Financial Command Centre

Live financial dashboard for Rays Power Experts Ltd. Pulls real-time data from Zoho Books via the Anthropic API + MCP.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Local development
Create `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```
Then:
```bash
npm run dev
```
Open http://localhost:3000

### 3. Deploy to Vercel

1. Push this repo to GitHub (new repo, e.g. `rpel-financial-dld`)
2. Go to vercel.com → New Project → Import that repo
3. Framework will auto-detect as **Next.js** — leave all settings default
4. Add environment variable: `ANTHROPIC_API_KEY` = your key
5. Click Deploy

Done. Share the URL with your director.

## Architecture

- `pages/index.js` — the full dashboard UI (React, 8 tabs)
- `pages/api/financials.js` — server-side API route (API key never reaches browser)
- `lib/constants.js` — CRISIL benchmarks, historical data, project data
- `styles/globals.css` — design system

## Data sources

| Report | Used for |
|--------|----------|
| Profit and Loss | Revenue, COGS, EBITDA, PAT |
| Balance Sheet | Assets, liabilities, equity, bank accounts |
| Cash Flow Statement | Operating CF, Investing CF |
| Sales by Customer | Top 10 clients live |
| AR Aging Summary | Debtor days, aging buckets |
| AP Aging Summary | Creditor days |

Historical data (FY24/25/26) is from CRISIL audited reports — hardcoded in `lib/constants.js`.
