# Parts Invoice Generator

A single-page, no-build web app that reproduces the **Zahav Automobile Company — Parts Counter Sales Invoice** layout as a fillable form. Pick a customer, add parts from a dropdown, and it generates a print-ready invoice matching the original PDF layout (header, line items, VAT, round-off, and amount-in-words).

Seeded from the sample invoice: *Parts Countersales from Kofo Zahav to Zeecar (invc.01)*.

## Features

- Dropdown-driven form: customer, payment type, account type, branch, and parts catalog — no free typing for the fields that matter.
- Parts catalog with per-SKU pricing (e.g. "OIL FILTER" appears at four different price points, matching the source invoice).
- Live-calculated Subtotal, VAT (7.5%), Round Off (rounded up to the nearest ₦100, matching the source invoice's rounding), and Net Payable.
- Automatic "amount in words" (Naira and Kobo).
- **Invoice No. and Date are locked, auto-generated fields** — Invoice No. auto-increments, Date always defaults to today.
- **Optional Google Sheets connection** (see below) turns this from a single-browser tool into a shared one: dropdown values (customers/parts/branches/payment & account types) are maintained as rows in a Sheet instead of in code, every saved invoice is written there centrally, and "Download All Records" exports the whole Sheet as `.xlsx`. Without it, the app still runs standalone using the defaults in `config.js`, but nothing is saved anywhere.
- Print / Save-as-PDF button, with a dedicated print stylesheet so only the invoice (not the form) is printed.
- Zero build step, plain HTML/CSS/JS — the only external call is to your own Google Apps Script Web App, if connected.

## Running it

No install needed. Any static file server works, e.g.:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`. (Opening `index.html` directly via `file://` also works in most browsers.)

Or just publish the folder with **GitHub Pages** (Settings → Pages → deploy from `main` / root) and use it from anywhere.

## Connecting a Google Sheet

This is what makes the tool shared instead of per-browser: master data (dropdowns) and every saved invoice live in one Google Sheet that anyone with edit access can look at directly, with nothing to host or deploy beyond a copy-pasted Apps Script.

**One-time setup (~5 minutes):**

1. Create a new blank Sheet at [sheets.google.com](https://sheets.google.com).
2. **Extensions → Apps Script.** Delete the placeholder code and paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs) from this repo.
3. **Deploy → New deployment** → gear icon → type **Web app**. Execute as **Me**, Who has access **Anyone**. Deploy, and authorize the script when prompted (it's your own script acting on your own sheet).
4. Copy the **Web app URL** (ends in `/exec`) into `GOOGLE_SHEETS_WEBAPP_URL` in [`config.js`](config.js).
5. **File → Share → General access → "Anyone with the link" → Viewer** on the Sheet (so the Excel download works without requiring a Google login). Copy the Sheet's export link into `GOOGLE_SHEET_EXPORT_URL` in `config.js` — it's `https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=xlsx`, where `<SHEET_ID>` is the long string in the Sheet's URL between `/d/` and `/edit`.
6. Commit and push `config.js` — GitHub Pages picks it up automatically.

**What happens once connected:**

- The script auto-creates these tabs the first time it runs, seeded with the sample invoice's data: `Customers`, `Branches`, `Parts`, `Payment Types`, `Account Types` (master data — the dropdowns) and `Invoices` / `Line Items` (every saved invoice) plus a `Meta` tab (just the invoice number counter — leave it alone).
- **To change what shows up in a dropdown, edit rows in the matching tab** — add a customer, add a part at a new price, rename a payment type — then reload the invoice page. No code changes, no redeploy. (Master data is fetched once per page load, not on every invoice, so a page refresh is what picks up edits.)
- Each **Save Invoice** click asks the script for the next invoice number (avoids two people colliding on the same number) and appends a row to `Invoices` plus one row per part to `Line Items`.
- **Download All Records (Excel)** doesn't call the script at all — it links straight to the Sheet's own export URL, so it's always exactly what's in the Sheet, live.
- Without any of this configured, the app still works standalone for one person in one browser, just using the `config.js` defaults with nothing saved anywhere.

## Customizing dropdown data without a Sheet

If you're not connecting a Sheet, dropdown/catalog values live in [`config.js`](config.js) instead:

- `COMPANY` — the seller header block (name, address, TIN, RC number). Not sheet-sourced even when connected.
- `BRANCHES` — customer branch/location codes.
- `CUSTOMERS` — customer name, ID, address, default branch.
- `PAYMENT_TYPES` / `ACCOUNT_TYPES` — dropdown options.
- `PARTS_CATALOG` — `{ code, description, basePrice }` entries. Add a new line to add a new part to the dropdown; add another entry with the same description at a different price to represent a different SKU/pack size.
- `VAT_RATE` — currently `0.075` (7.5%), matching the source invoice. Not sheet-sourced.

## File structure

```
index.html          Form + invoice preview markup
style.css           Form styling + invoice print layout
config.js           Local dropdown/catalog defaults + Google Sheets connection settings
app.js              Form logic, calculations, invoice rendering, Google Sheets calls
apps-script/Code.gs Paste into a Sheet's Apps Script editor — see "Connecting a Google Sheet"
```

## Notes

- Discounts are entered as a per-unit ₦ amount and subtracted from the base price to get the "Price" shown on the invoice — matching the source PDF's `Base Price` / `Discount` / `Price` columns.
- Rounding: Net Payable is rounded **up** to the nearest ₦100; the difference is shown as `Round Off`, matching the source invoice (`1,214,672.60` → `1,214,700.00`, round off `27.40`).
- This app is currently **open access** by design: anyone with the site link can save an invoice or download all records, and anyone with the Sheet link can edit master data. There's no login. Ask if you'd like that tightened later.
