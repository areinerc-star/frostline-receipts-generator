# Frostline Receipts

A self-contained receipt/invoice generator for Frostline — downpayment and
full-payment documents with itemized cold-chain orders, plus a shared
receipt log backed by Upstash Redis.

## What it is

The UI (`index.html`) is a single static file — vanilla HTML/CSS/JS, no
build step, with the Frostline logo embedded as base64. A small serverless
function (`api/log.js`) gives the Receipt Log real, shared persistence.

- **Receipt / Invoice** toggle for the document category.
- **Downpayment / Full Payment** toggle — both use the same itemized order
  table (item name, per-piece price, quantity).
  - Downpayment shows a configurable DP % and an unpaid balance line.
  - Full Payment shows the full amount as received. It also supports
    optional, addable "Previous Downpayment" records (date + amount) so a
    final payment can show a simple breakdown of everything paid so far.
- **Design/Template/Mockup Fee** — a manual tickbox (₱560), not automatic.
- **Proof of Transaction** upload — attach a screenshot/photo of payment.
  It stays out of the printed receipt and is kept with the log entry
  instead (viewable from the log, on the device that generated it).
- **Save as JPG** — renders the receipt to an image and downloads it
  (via html2canvas, loaded from a CDN — needs an internet connection).
- **Print** and **Email receipt** (`mailto:` with a prefilled summary).
- **Receipt Log** — collapsible panel below the tool. Every generated
  receipt is recorded with number, customer, date, total, and balance.
  Exportable as CSV. Backed by Upstash Redis (see below) so entries
  persist and are shared across devices — not just the browser tab that
  created them.

## Local preview

The UI alone still works with zero setup — just open `index.html`. The
Receipt Log will silently stay in local-only mode if `/api/log` isn't
reachable (e.g. opening the file directly, or before Upstash is connected).

To run the API locally you need the Vercel CLI and a linked project:

```bash
npm install
vercel dev
```

## Deploying

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the GitHub repo. No build
   command or output directory overrides needed — Vercel serves
   `index.html` as a static file and auto-detects `api/log.js` as a
   serverless function.
3. **Connect storage**: in the project's **Storage** tab, add a database
   → choose **Upstash** → **Redis** (free tier: 256MB storage, 500,000
   commands/month, no card required). Vercel automatically injects
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` — nothing to copy by hand.
4. Redeploy (or it happens automatically after connecting storage).

Once connected, the Receipt Log's header will say "synced" instead of
"local only — backend not connected", and entries generated on any device
will show up on every other device that opens the site.

### What isn't stored remotely

To keep the shared log small and fast, only the receipt summary (number,
customer, date, total, balance, and whether a proof was attached) is sent
to Redis — the actual proof-of-transaction image stays local to the
device that generated it. Other devices will see a 📎 marker on that row
but can't open the image itself. If you need proofs viewable from any
device too, that would mean switching to a small object storage bucket
(e.g. Vercel Blob) for the images themselves — ask if you want that added.
