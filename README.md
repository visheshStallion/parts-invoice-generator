# Parts Invoice Generator

A dropdown-driven form that generates a print-ready invoice matching the **Zahav Automobile Company — Parts Counter Sales Invoice** layout, backed by a small server so every saved invoice is stored centrally (not just in one person's browser) and can be exported as one master Excel file at any time.

Seeded from the sample invoice: *Parts Countersales from Kofo Zahav to Zeecar (invc.01)*.

## How it works

```
public/            Frontend: form + invoice preview (plain HTML/CSS/JS, no build step)
  index.html
  style.css
  config.js         Editable dropdown/catalog data (customers, parts, branches, payment/account types)
  app.js
server.js           Backend: Express app that serves public/ and a small JSON API
data/records.json   The master record store — every invoice + line item ever saved
package.json
render.yaml         One-click deploy blueprint for Render
```

**Storage:** there's no database to manage. Every time someone clicks **Save Invoice**, the backend appends that invoice to [`data/records.json`](data/records.json) and commits the change to this repo via the GitHub API. That gives you free, durable, versioned storage — every save is a commit, so you get full history for free — and `data/records.json` is always the single source of truth.

**Export:** clicking **Download All Records (Excel)** hits `GET /api/invoices/export`, which reads `data/records.json` fresh and streams back an `.xlsx` with two sheets (`Invoices`, `Line Items`) — always up to date, nothing cached.

**Invoice numbers** are assigned by the server (not the browser), so two people saving invoices at the same time can't collide.

## Running it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
GITHUB_TOKEN=your_token_here node server.js
```

Then open `http://localhost:3000`. `GITHUB_TOKEN` needs write access to this repo (see Deployment below) — without it, the app loads fine but saving invoices will fail.

## Deploying (Render, free tier)

1. **Create a GitHub token** the server can use to commit to `data/records.json`:
   - GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token
   - Repository access: only this repo (`visheshStallion/parts-invoice-generator`)
   - Permissions: **Contents → Read and write**
   - Copy the token — you won't see it again.

2. **Deploy to Render:**
   - Sign in at [render.com](https://render.com) (free account) and connect your GitHub account.
   - New → **Blueprint**, pick this repo. Render will detect `render.yaml` automatically.
   - When prompted, paste your token into the `GITHUB_TOKEN` environment variable.
   - Deploy. Render gives you a URL like `https://parts-invoice-generator.onrender.com` — that's the whole app (form + backend), nothing else to set up.

   *(No blueprint? Create a Web Service manually: Runtime = Node, Build Command = `npm install`, Start Command = `node server.js`, then add the same env vars listed in `render.yaml`.)*

Note: Render's free tier spins the service down after periods of inactivity — the first request after a while can take ~30-60 seconds to wake up.

## Customizing the dropdown data

All catalog/dropdown values live in [`public/config.js`](public/config.js): `COMPANY`, `BRANCHES`, `CUSTOMERS`, `PAYMENT_TYPES`, `ACCOUNT_TYPES`, `PARTS_CATALOG`, `VAT_RATE`. Edit and push — no redeploy needed for static frontend changes, Render just serves the file as-is (a new deploy is only needed if `server.js` or `package.json` change).

## Notes

- Discounts are entered as a per-unit ₦ amount and subtracted from the base price — matching the source PDF's `Base Price` / `Discount` / `Price` columns.
- Net Payable is rounded **up** to the nearest ₦100; the difference is shown as `Round Off`, matching the source invoice (`1,214,672.60` → `1,214,700.00`, round off `27.40`).
- This app is currently **open access**: anyone with the URL can save an invoice or download the full records file. There's no login. Ask if you'd like a shared-password gate added later.
