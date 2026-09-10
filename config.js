// Editable configuration for the Parts Invoice Generator.
// Values below are seeded from the source invoice (Kofo Zahav -> Zeecar, Invoice X 5017 - 00000001)
// and used as a fallback whenever the Google Sheet master data can't be reached.
//
// Once a Google Sheet is connected (see GOOGLE_SHEETS_WEBAPP_URL below), the dropdown
// arrays here (BRANCHES, CUSTOMERS, PAYMENT_TYPES, ACCOUNT_TYPES, PARTS_CATALOG) are
// REPLACED at page load with whatever is in the Sheet's Branches/Customers/Payment
// Types/Account Types/Parts tabs — edit rows there, not here, once it's connected.
// They're declared with `let` (not `const`) so app.js can do that swap.

const COMPANY = {
  name: "AUTOMOBILE COMPANY NIGE",
  address: "PLOT NO. 179/180, KOFO ABYAMI STREET",
  addressLine2: "LAGOS - NIGERIA - NIGERIA",
  tinNumber: "2521500623957",
  rcNumber: "729656",
  invoicePrefix: "X 5017",
};

let BRANCHES = [
  { code: "0034", label: "(0034) LAGOS NIGERIA" },
];

let CUSTOMERS = [
  {
    id: "68612",
    name: "ZEECAR GLOBAL LIMITED",
    address: "VI, LAGOS",
    branchCode: "0034",
  },
];

let PAYMENT_TYPES = ["CASH", "CREDIT", "BANK TRANSFER"];
let ACCOUNT_TYPES = ["PARTS", "SERVICE"];

// Parts catalog: (description, unit price) pairs as they appear on the source invoice.
// Same description can repeat at a different price (different pack/SKU) — each is its own entry.
let PARTS_CATALOG = [
  { code: "OF-20000", description: "OIL FILTER", basePrice: 20000.0 },
  { code: "OF-14464", description: "OIL FILTER", basePrice: 14464.0 },
  { code: "OF-18000", description: "OIL FILTER", basePrice: 18000.0 },
  { code: "OF-14000", description: "OIL FILTER", basePrice: 14000.0 },
  { code: "OB-14000", description: "OIL BATH", basePrice: 14000.0 },
  { code: "RC-30000", description: "RADIATOR COOLANT", basePrice: 30000.0 },
  { code: "EO-10500", description: "ENGINE OIL", basePrice: 10500.0 },
  { code: "EO-17100", description: "ENGINE OIL", basePrice: 17100.0 },
  { code: "IC-2500", description: "INJECTOR CLEANER", basePrice: 2500.0 },
];

const VAT_RATE = 0.075; // 7.5%, matches source invoice (84,744.60 / 1,129,928.00)

const REMARKS_TEMPLATE = (customerName, refName) =>
  `PARTS COUNTER SALES FROM KOFO ZAHAV TO ${customerName}. AS PER PARTS UTILISED PFIS FROM ${refName || "____"}.`;

// --- Google Sheets storage (see README.md "Connecting a Google Sheet") ---
// GOOGLE_SHEETS_WEBAPP_URL: the Apps Script Web App URL, used to save each invoice
// GOOGLE_SHEET_EXPORT_URL: the Sheet's built-in Excel export link, used for "Download All Records"
const GOOGLE_SHEETS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbwoRPpkC7qq09aFsAZmmsWBaXaFaw1DfRX-oSdWOxs7SlaoIOkFQP_tXTh8Q2Kq_Fb7/exec";
const GOOGLE_SHEET_EXPORT_URL =
  "https://docs.google.com/spreadsheets/d/14xmH27ev7z0lUxVKw4duujjHYsJpSUtmfMkznMLp9iw/export?format=xlsx";
