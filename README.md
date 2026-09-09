# Parts Invoice Generator

A single-page, no-build web app that reproduces the **Zahav Automobile Company — Parts Counter Sales Invoice** layout as a fillable form. Pick a customer, add parts from a dropdown, and it generates a print-ready invoice matching the original PDF layout (header, line items, VAT, round-off, and amount-in-words).

Seeded from the sample invoice: *Parts Countersales from Kofo Zahav to Zeecar (invc.01)*.

## Features

- Dropdown-driven form: customer, payment type, account type, branch, and parts catalog — no free typing for the fields that matter.
- Parts catalog with per-SKU pricing (e.g. "OIL FILTER" appears at four different price points, matching the source invoice).
- Live-calculated Subtotal, VAT (7.5%), Round Off (rounded up to the nearest ₦100, matching the source invoice's rounding), and Net Payable.
- Automatic "amount in words" (Naira and Kobo).
- Auto-incrementing invoice number (stored per-browser in `localStorage`).
- Print / Save-as-PDF button, with a dedicated print stylesheet so only the invoice (not the form) is printed.
- Zero build step, zero dependencies — plain HTML/CSS/JS.

## Running it

No install needed. Any static file server works, e.g.:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`. (Opening `index.html` directly via `file://` also works in most browsers.)

Or just publish the folder with **GitHub Pages** (Settings → Pages → deploy from `main` / root) and use it from anywhere.

## Customizing the dropdown data

All catalog/dropdown values live in [`config.js`](config.js):

- `COMPANY` — the seller header block (name, address, TIN, RC number).
- `BRANCHES` — customer branch/location codes.
- `CUSTOMERS` — customer name, ID, address, default branch.
- `PAYMENT_TYPES` / `ACCOUNT_TYPES` — dropdown options.
- `PARTS_CATALOG` — `{ code, description, basePrice }` entries. Add a new line to add a new part to the dropdown; add another entry with the same description at a different price to represent a different SKU/pack size.
- `VAT_RATE` — currently `0.075` (7.5%), matching the source invoice.

This starter ships with only the exact customer/parts/branch that appear on the sample invoice — extend `config.js` with more entries as needed.

## File structure

```
index.html   Form + invoice preview markup
style.css    Form styling + invoice print layout
config.js    Editable dropdown/catalog data
app.js       Form logic, calculations, and invoice rendering
```

## Notes

- Discounts are entered as a per-unit ₦ amount and subtracted from the base price to get the "Price" shown on the invoice — matching the source PDF's `Base Price` / `Discount` / `Price` columns.
- Rounding: Net Payable is rounded **up** to the nearest ₦100; the difference is shown as `Round Off`, matching the source invoice (`1,214,672.60` → `1,214,700.00`, round off `27.40`).
