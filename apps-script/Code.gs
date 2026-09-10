/**
 * Parts Invoice Generator — Google Sheets backend.
 *
 * This runs INSIDE a Google Sheet as a bound Apps Script project, deployed as
 * a Web App. The static site (index.html/app.js) calls it over HTTP to:
 *   - read the dropdown "master data" (Customers, Branches, Parts, Payment
 *     Types, Account Types tabs) — edit rows in those tabs and the form's
 *     dropdowns pick it up on next page load, no code changes needed;
 *   - save each invoice as rows in the Invoices / Line Items tabs, and look
 *     up the next invoice number / how many are saved so far.
 * Downloading "all records" doesn't go through this script at all — it just
 * links straight to the Sheet's own built-in Excel export URL.
 *
 * Setup: see README.md in the repo root for the one-time deployment steps.
 */

var INVOICE_PREFIX = "X 5017"; // keep this in sync with COMPANY.invoicePrefix in config.js

var META_SHEET = "Meta";
var INVOICES_SHEET = "Invoices";
var ITEMS_SHEET = "Line Items";
var CUSTOMERS_SHEET = "Customers";
var BRANCHES_SHEET = "Branches";
var PARTS_SHEET = "Parts";
var PAYMENT_TYPES_SHEET = "Payment Types";
var ACCOUNT_TYPES_SHEET = "Account Types";

var INVOICE_HEADERS = [
  "Invoice No", "Saved At", "Date", "Customer ID", "Customer Name", "Address",
  "Branch", "Payment Type", "Account Type", "Remarks",
  "Subtotal", "VAT", "Round Off", "Net Payable", "Amount In Words",
];

var ITEM_HEADERS = [
  "Invoice No", "Sr", "Description", "Quantity", "Base Price", "Discount", "Price", "Amount NGN",
];

var CUSTOMERS_HEADERS = ["ID", "Name", "Address", "Branch Code"];
var BRANCHES_HEADERS = ["Code", "Label"];
var PARTS_HEADERS = ["Code", "Description", "Base Price"];
var SIMPLE_VALUE_HEADERS = ["Value"];

// Master data used only to seed each tab the first time it's created —
// matches the original sample invoice. Edit the sheet rows after that;
// this seed is never re-applied once a tab has data in it.
var SEED_CUSTOMERS = [["68612", "ZEECAR GLOBAL LIMITED", "VI, LAGOS", "0034"]];
var SEED_BRANCHES = [["0034", "(0034) LAGOS NIGERIA"]];
var SEED_PARTS = [
  ["OF-20000", "OIL FILTER", 20000],
  ["OF-14464", "OIL FILTER", 14464],
  ["OF-18000", "OIL FILTER", 18000],
  ["OF-14000", "OIL FILTER", 14000],
  ["OB-14000", "OIL BATH", 14000],
  ["RC-30000", "RADIATOR COOLANT", 30000],
  ["EO-10500", "ENGINE OIL", 10500],
  ["EO-17100", "ENGINE OIL", 17100],
  ["IC-2500", "INJECTOR CLEANER", 2500],
];
var SEED_PAYMENT_TYPES = [["CASH"], ["CREDIT"], ["BANK TRANSFER"]];
var SEED_ACCOUNT_TYPES = [["PARTS"], ["SERVICE"]];

function doGet(e) {
  var action = e.parameter.action;
  if (action === "next-number") {
    return jsonOutput({ invoiceNo: buildInvoiceNo(peekNextSeq()) });
  }
  if (action === "count") {
    return jsonOutput({ count: getInvoiceCount() });
  }
  if (action === "masters") {
    return jsonOutput(getMasterData());
  }
  return jsonOutput({ status: "ok", message: "Parts Invoice Generator backend is running." });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body = JSON.parse(e.postData.contents);
    var invoice = body.invoice;
    var items = body.items || [];
    if (!invoice || !items.length) {
      return jsonOutput({ error: "Request must include an invoice object and a non-empty items[] array." });
    }

    var seq = incrementSeq();
    var invoiceNo = buildInvoiceNo(seq);
    var savedAt = new Date().toISOString();

    appendInvoiceRow(invoiceNo, savedAt, invoice);
    items.forEach(function (it, idx) {
      appendItemRow(invoiceNo, idx + 1, it);
    });

    return jsonOutput({ invoiceNo: invoiceNo });
  } catch (err) {
    return jsonOutput({ error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getMetaSheet() {
  return getOrCreateSheet(META_SHEET, ["Key", "Value"]);
}

function findSeqRow(sheet) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === "lastSeq") return i + 1; // 1-based sheet row
  }
  return null;
}

function peekNextSeq() {
  var sheet = getMetaSheet();
  var row = findSeqRow(sheet);
  if (!row) return 1;
  return Number(sheet.getRange(row, 2).getValue() || 0) + 1;
}

function incrementSeq() {
  var sheet = getMetaSheet();
  var row = findSeqRow(sheet);
  if (!row) {
    sheet.appendRow(["lastSeq", 1]);
    return 1;
  }
  var next = Number(sheet.getRange(row, 2).getValue() || 0) + 1;
  sheet.getRange(row, 2).setValue(next);
  return next;
}

function buildInvoiceNo(seq) {
  return INVOICE_PREFIX + " - " + String(seq).padStart(8, "0");
}

function getInvoiceCount() {
  var sheet = getOrCreateSheet(INVOICES_SHEET, INVOICE_HEADERS);
  return Math.max(0, sheet.getLastRow() - 1);
}

function appendInvoiceRow(invoiceNo, savedAt, invoice) {
  var sheet = getOrCreateSheet(INVOICES_SHEET, INVOICE_HEADERS);
  sheet.appendRow([
    invoiceNo,
    savedAt,
    invoice.date,
    invoice.customerId,
    invoice.customerName,
    invoice.address,
    invoice.branch,
    invoice.paymentType,
    invoice.accountType,
    invoice.remarks,
    invoice.subtotal,
    invoice.vat,
    invoice.roundOff,
    invoice.netPayable,
    invoice.amountInWords,
  ]);
}

function appendItemRow(invoiceNo, sr, it) {
  var sheet = getOrCreateSheet(ITEMS_SHEET, ITEM_HEADERS);
  sheet.appendRow([invoiceNo, sr, it.description, it.quantity, it.basePrice, it.discount, it.price, it.amount]);
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Master data (dropdown values) — Customers, Branches, Parts, Payment Types,
// Account Types tabs. Each is seeded once on first creation, then it's up to
// whoever maintains the sheet to add/edit/remove rows directly.
// ---------------------------------------------------------------------------

function seedIfEmpty(sheet, rows) {
  if (sheet.getLastRow() <= 1) {
    rows.forEach(function (r) {
      sheet.appendRow(r);
    });
  }
}

function getMasterSheets() {
  var customers = getOrCreateSheet(CUSTOMERS_SHEET, CUSTOMERS_HEADERS);
  seedIfEmpty(customers, SEED_CUSTOMERS);

  var branches = getOrCreateSheet(BRANCHES_SHEET, BRANCHES_HEADERS);
  seedIfEmpty(branches, SEED_BRANCHES);

  var parts = getOrCreateSheet(PARTS_SHEET, PARTS_HEADERS);
  seedIfEmpty(parts, SEED_PARTS);

  var paymentTypes = getOrCreateSheet(PAYMENT_TYPES_SHEET, SIMPLE_VALUE_HEADERS);
  seedIfEmpty(paymentTypes, SEED_PAYMENT_TYPES);

  var accountTypes = getOrCreateSheet(ACCOUNT_TYPES_SHEET, SIMPLE_VALUE_HEADERS);
  seedIfEmpty(accountTypes, SEED_ACCOUNT_TYPES);

  return {
    customers: customers,
    branches: branches,
    parts: parts,
    paymentTypes: paymentTypes,
    accountTypes: accountTypes,
  };
}

// Data rows below the header, skipping any fully-blank row.
function sheetDataRows(sheet) {
  var values = sheet.getDataRange().getValues();
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) {
      return cell !== "" && cell !== null;
    });
  });
}

function getMasterData() {
  var s = getMasterSheets();
  return {
    customers: sheetDataRows(s.customers).map(function (r) {
      return { id: String(r[0]), name: String(r[1]), address: String(r[2]), branchCode: String(r[3]) };
    }),
    branches: sheetDataRows(s.branches).map(function (r) {
      return { code: String(r[0]), label: String(r[1]) };
    }),
    parts: sheetDataRows(s.parts).map(function (r) {
      return { code: String(r[0]), description: String(r[1]), basePrice: Number(r[2]) };
    }),
    paymentTypes: sheetDataRows(s.paymentTypes).map(function (r) {
      return String(r[0]);
    }),
    accountTypes: sheetDataRows(s.accountTypes).map(function (r) {
      return String(r[0]);
    }),
  };
}
