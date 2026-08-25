# Frostline Receipts

A single-page, self-contained receipt/invoice generator for Frostline —
downpayment and full-payment documents with itemized cold-chain orders.

## What it is

Everything lives in one file: `index.html`. There's no build step, no
package.json, no backend. Vanilla HTML/CSS/JS, with the Frostline logo
embedded as base64 so the file is fully portable.

- **Receipt / Invoice** toggle for the document category.
- **Downpayment / Full Payment** toggle for the payment type — both use
  the same itemized order table (item name, per-piece price, quantity).
  - Downpayment shows a configurable DP % and an unpaid balance line.
  - Full Payment shows the full amount as received, no balance owing.
- **Design/Template/Mockup Fee** — a manual tickbox (₱560) you apply
  per order, not automatic.
- **Proof of Transaction** upload — attach a screenshot/photo of payment;
  it previews in the form and gets embedded directly into the receipt.
- **Save as JPG** — renders the receipt to an image and downloads it
  (via html2canvas, loaded from a CDN — needs an internet connection).
- **Print** — browser's native print dialog, for a physical copy or
  print-to-PDF.
- **Email receipt** — opens the recipient's email client (`mailto:`)
  with a prefilled text summary of the receipt.

## Local preview

Just open `index.html` in any browser — no server required.

```bash
open index.html      # macOS
# or
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploying

This is a static site, so it deploys to Vercel with zero configuration:

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" → import the GitHub repo.
3. Framework preset: **Other** (or leave auto-detect — Vercel will serve
   `index.html` as a static site). No build command, no output directory
   overrides needed.

No database or backend service (e.g. Firebase) is required. Everything
runs client-side in the browser. You'd only need a backend if you later
want receipts to persist/sync across devices, or want real server-sent
email instead of opening the user's own mail app.
