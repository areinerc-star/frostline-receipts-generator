# Frostline Receipts

A self-contained receipt/invoice generator for Frostline — downpayment and
full-payment documents with itemized cold-chain orders, a Pending Invoices
queue, and a shared History log, both backed by Upstash Redis.

## What it is

The UI (`index.html`) is a single static file — vanilla HTML/CSS/JS, no
build step, with the Frostline logo embedded as base64. Two small serverless
functions give it real, shared persistence: `api/log.js` for History,
`api/pending.js` for Pending Invoices.

- **Receipt / Invoice** toggle for the document category.
- **Downpayment / Full Payment** toggle — both use the same itemized order
  table (item name, per-piece price, quantity).
  - Downpayment shows a configurable DP % and an unpaid balance line.
  - Full Payment shows the full amount as received. It also supports
    optional, addable "Previous Downpayment" records (date + amount) so a
    final payment can show a simple breakdown of everything paid so far.
- **Design/Template/Mockup Fee** — a manual tickbox (₱560), not automatic.
- **Needs OR** — a manual tickbox that shows BIR registration info and the
  Facebook QR code on the receipt/invoice, only when a customer actually
  asks for an official receipt.
- **Proof of Transaction** upload — attach a screenshot/photo of payment.
  It stays out of the printed receipt and is kept with the log entry
  instead (viewable from the log, on the device that generated it).
- **Save as JPG** — renders the receipt to an image and downloads it
  (via html2canvas, loaded from a CDN — needs an internet connection).
- **Print** and **Email receipt** (`mailto:` with a prefilled summary).
- **Pending Invoices → History workflow:**
  - With the **Invoice** toggle active, "Save Pending Invoice" stores the
    invoice (customer, items, DP %, fees, etc.) in the **Pending Invoices**
    panel instead of logging it as a completed transaction — it's unpaid.
  - When the client actually pays, click **Mark Paid** on that row. It
    reloads all the invoice's details into the form, switches it to the
    matching document — a **Downpayment Receipt** or a **Full Payment
    Receipt**, whichever the invoice was for — reuses the same reference
    number, and logs it straight into **History**. The pending row is
    then removed.
  - **History** (formerly "Receipt Log") lists every completed receipt —
    number, customer, date, total, and balance — exportable as CSV.
  - Both panels are backed by Upstash Redis so entries persist and are
    shared across devices, not just the browser tab that created them.

## Local preview

The UI alone still works with zero setup — just open `index.html`. Both
History and Pending Invoices will silently stay in local-only mode (kept
only in the browser tab's memory) if `/api/log` and `/api/pending` aren't
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
   `index.html` as a static file and auto-detects `api/log.js` and
   `api/pending.js` as serverless functions.
3. **Connect storage**: in the project's **Storage** tab, add a database
   → choose **Upstash** → **Redis** (free tier: 256MB storage, 500,000
   commands/month, no card required). Vercel automatically injects
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` — nothing to copy by hand.
4. Redeploy (or it happens automatically after connecting storage).

Once connected, the History and Pending Invoices headers will say "synced"
instead of "local only — backend not connected", and entries added on any
device will show up on every other device that opens the site.

### What isn't stored remotely

To keep the shared data small and fast, only a lightweight summary of each
entry (no embedded images) is sent to Redis — the actual proof-of-transaction
image stays local to the device that generated it. Other devices will see a
📎 marker on that row but can't open the image itself. If you need proofs
viewable from any device too, that would mean switching to a small object
storage bucket (e.g. Vercel Blob) for the images themselves — ask if you
want that added.
