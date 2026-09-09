// Parts Invoice Generator — form logic, live calculation, and print-ready rendering.
// All catalog/dropdown data lives in config.js.

const fmt = (n) =>
  (n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

function threeDigitsToWords(n) {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " HUNDRED ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

function integerToWords(num) {
  if (num === 0) return "ZERO";
  const groups = [
    { value: 1_000_000_000, label: "BILLION" },
    { value: 1_000_000, label: "MILLION" },
    { value: 1_000, label: "THOUSAND" },
    { value: 1, label: "" },
  ];
  let n = Math.floor(num);
  let parts = [];
  for (const g of groups) {
    if (n >= g.value) {
      const count = Math.floor(n / g.value);
      n %= g.value;
      parts.push(threeDigitsToWords(count) + (g.label ? " " + g.label : ""));
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function amountToWords(amount) {
  const naira = Math.floor(amount);
  const kobo = Math.round((amount - naira) * 100);
  let words = integerToWords(naira) + " NAIRA";
  if (kobo > 0) {
    words += " AND " + integerToWords(kobo) + " KOBO";
  } else {
    words += " AND ZERO KOBO";
  }
  return words + " ONLY";
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let rowIdCounter = 0;
let rows = [];

function newRow(partIndex = 0, qty = 1) {
  rowIdCounter += 1;
  return { id: rowIdCounter, partIndex, qty, discount: 0 };
}

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const el = (id) => document.getElementById(id);
const itemsTbody = el("items-tbody");
const paymentTypeSelect = el("paymentType");
const accountTypeSelect = el("accountType");
const customerSelect = el("customerSelect");
const customerBranchSelect = el("customerBranch");

// ---------------------------------------------------------------------------
// Populate static dropdowns
// ---------------------------------------------------------------------------

function populateSelect(select, items, formatter = (x) => x) {
  select.innerHTML = "";
  items.forEach((item, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = formatter(item);
    select.appendChild(opt);
  });
}

function initStaticDropdowns() {
  populateSelect(paymentTypeSelect, PAYMENT_TYPES);
  populateSelect(accountTypeSelect, ACCOUNT_TYPES);
  populateSelect(customerSelect, CUSTOMERS, (c) => `${c.name} (ID: ${c.id})`);
  populateSelect(customerBranchSelect, BRANCHES, (b) => b.label);
}

function applyCustomerSelection() {
  const c = CUSTOMERS[customerSelect.value];
  if (!c) return;
  el("customerId").value = c.id;
  el("customerName").value = c.name;
  el("customerAddress").value = c.address;
  const branchIdx = BRANCHES.findIndex((b) => b.code === c.branchCode);
  if (branchIdx >= 0) customerBranchSelect.value = branchIdx;
}

// ---------------------------------------------------------------------------
// Line item rows
// ---------------------------------------------------------------------------

function partOptionsHtml(selectedIdx) {
  return PARTS_CATALOG.map((p, idx) =>
    `<option value="${idx}" ${idx === selectedIdx ? "selected" : ""}>${p.description} — NGN ${fmt(p.basePrice)}</option>`
  ).join("");
}

function renderRows() {
  itemsTbody.innerHTML = "";
  rows.forEach((row) => {
    const part = PARTS_CATALOG[row.partIndex];
    const netPrice = Math.max(0, part.basePrice - row.discount);
    const amount = netPrice * row.qty;

    const tr = document.createElement("tr");
    tr.dataset.rowId = row.id;
    tr.innerHTML = `
      <td><select class="part-select">${partOptionsHtml(row.partIndex)}</select></td>
      <td><input type="number" class="qty-input" min="0" step="1" value="${row.qty}" /></td>
      <td class="readonly-cell">${fmt(part.basePrice)}</td>
      <td><input type="number" class="discount-input" min="0" step="0.01" value="${row.discount}" /></td>
      <td class="readonly-cell">${fmt(netPrice)}</td>
      <td class="readonly-cell">${fmt(amount)}</td>
      <td><button type="button" class="remove-row-btn" title="Remove part">&times;</button></td>
    `;
    itemsTbody.appendChild(tr);
  });
}

function readRowsFromDom() {
  [...itemsTbody.querySelectorAll("tr")].forEach((tr) => {
    const id = Number(tr.dataset.rowId);
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    row.partIndex = Number(tr.querySelector(".part-select").value);
    row.qty = Number(tr.querySelector(".qty-input").value) || 0;
    row.discount = Number(tr.querySelector(".discount-input").value) || 0;
  });
}

itemsTbody.addEventListener("change", (e) => {
  readRowsFromDom();
  renderRows();
  updatePreview();
});

itemsTbody.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-row-btn")) {
    const tr = e.target.closest("tr");
    const id = Number(tr.dataset.rowId);
    rows = rows.filter((r) => r.id !== id);
    renderRows();
    updatePreview();
  }
});

el("addRowBtn").addEventListener("click", () => {
  readRowsFromDom();
  rows.push(newRow());
  renderRows();
  updatePreview();
});

// ---------------------------------------------------------------------------
// Totals + preview
// ---------------------------------------------------------------------------

function computeTotals() {
  let subtotal = 0;
  const lineItems = rows.map((row) => {
    const part = PARTS_CATALOG[row.partIndex];
    const netPrice = Math.max(0, part.basePrice - row.discount);
    const amount = netPrice * row.qty;
    subtotal += amount;
    return { part, qty: row.qty, netPrice, amount, discount: row.discount };
  });

  const vat = subtotal * VAT_RATE;
  const beforeRound = subtotal + vat;
  const netPayable = Math.ceil(beforeRound / 100) * 100;
  const roundOff = netPayable - beforeRound;

  return { lineItems, subtotal, vat, roundOff, netPayable };
}

function updatePreview() {
  const { subtotal, vat, roundOff, netPayable } = computeTotals();
  el("preview-subtotal").textContent = "NGN " + fmt(subtotal);
  el("preview-vat").textContent = "NGN " + fmt(vat);
  el("preview-round").textContent = "NGN " + fmt(roundOff);
  el("preview-net").textContent = "NGN " + fmt(netPayable);
  renderInvoice();
}

// ---------------------------------------------------------------------------
// Invoice render (the printable document)
// ---------------------------------------------------------------------------

function renderInvoice() {
  el("out-companyName").textContent = COMPANY.name;
  el("out-companyAddress").textContent = COMPANY.address;
  el("out-companyAddress2").textContent = COMPANY.addressLine2;
  el("out-tin").textContent = COMPANY.tinNumber;
  el("out-rc").textContent = COMPANY.rcNumber;

  el("out-custName").textContent = el("customerName").value;
  el("out-custAddress").textContent = el("customerAddress").value;
  const branch = BRANCHES[customerBranchSelect.value];
  el("out-custBranch").textContent = branch ? branch.label : "";
  el("out-custId").textContent = el("customerId").value;

  el("out-invoiceNo").textContent = el("invoiceNo").value;
  el("out-date").textContent = formatDisplayDate(el("invoiceDate").value);
  el("out-paymentType").textContent = paymentTypeSelect.options[paymentTypeSelect.selectedIndex]?.textContent || "";
  el("out-accountType").textContent = accountTypeSelect.options[accountTypeSelect.selectedIndex]?.textContent || "";

  const { lineItems, subtotal, vat, roundOff, netPayable } = computeTotals();

  el("out-items").innerHTML = lineItems
    .map(
      (li, idx) => `
      <tr>
        <td class="col-sr">${idx + 1}</td>
        <td class="col-desc">${li.part.description}</td>
        <td class="col-num">${li.qty.toFixed(2)}</td>
        <td class="col-num">${fmt(li.part.basePrice)}</td>
        <td class="col-num">${fmt(li.netPrice)}</td>
        <td class="col-num">${fmt(li.netPrice)}</td>
        <td class="col-num">${fmt(li.amount)}</td>
      </tr>`
    )
    .join("");

  el("out-remarks").textContent =
    el("remarks").value || REMARKS_TEMPLATE(el("customerName").value, el("refName").value);

  el("out-words").textContent = amountToWords(netPayable);
  el("out-subtotal").textContent = fmt(subtotal);
  el("out-vat").textContent = fmt(vat);
  el("out-round").textContent = fmt(roundOff);
  el("out-net").textContent = fmt(netPayable);

  const now = new Date();
  el("out-printedBy").textContent = "SYSTEM";
  el("out-printedDate").textContent = formatDisplayDate(el("invoiceDate").value);
  el("out-printedHour").textContent = now.toTimeString().slice(0, 5);
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)}-${months[Number(m) - 1]}-${y}`;
}

// ---------------------------------------------------------------------------
// Backend API — invoices are stored centrally (server-side), not per-browser.
// The server assigns the invoice number to avoid collisions between users.
// ---------------------------------------------------------------------------

async function fetchNextInvoiceNumber() {
  try {
    const res = await fetch("/api/invoices/next-number");
    if (!res.ok) throw new Error(await res.text());
    const { invoiceNo } = await res.json();
    return invoiceNo;
  } catch (e) {
    console.error("Could not reach backend for next invoice number:", e);
    return `${COMPANY.invoicePrefix} - ????????`;
  }
}

async function updateLogStatus() {
  const statusEl = el("logStatus");
  try {
    const res = await fetch("/api/invoices/count");
    if (!res.ok) throw new Error(await res.text());
    const { count } = await res.json();
    statusEl.textContent = count
      ? `${count} invoice${count === 1 ? "" : "s"} saved on the server so far.`
      : "No invoices saved yet — click \"Save Invoice\" to record this one.";
  } catch (e) {
    statusEl.textContent = "Could not reach the backend — saving/downloading records is unavailable right now.";
  }
}

async function saveCurrentInvoiceToServer() {
  readRowsFromDom();
  const { lineItems, subtotal, vat, roundOff, netPayable } = computeTotals();
  const branch = BRANCHES[customerBranchSelect.value];

  const invoice = {
    date: formatDisplayDate(el("invoiceDate").value),
    customerId: el("customerId").value,
    customerName: el("customerName").value,
    address: el("customerAddress").value,
    branch: branch ? branch.label : "",
    paymentType: paymentTypeSelect.value ? PAYMENT_TYPES[paymentTypeSelect.value] : "",
    accountType: accountTypeSelect.value ? ACCOUNT_TYPES[accountTypeSelect.value] : "",
    remarks: el("remarks").value || REMARKS_TEMPLATE(el("customerName").value, el("refName").value),
    subtotal: Number(subtotal.toFixed(2)),
    vat: Number(vat.toFixed(2)),
    roundOff: Number(roundOff.toFixed(2)),
    netPayable: Number(netPayable.toFixed(2)),
    amountInWords: amountToWords(netPayable),
  };

  const items = lineItems.map((li, idx) => ({
    sr: idx + 1,
    description: li.part.description,
    quantity: li.qty,
    basePrice: Number(li.part.basePrice.toFixed(2)),
    discount: Number(li.discount.toFixed(2)),
    price: Number(li.netPrice.toFixed(2)),
    amount: Number(li.amount.toFixed(2)),
  }));

  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice, items }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Save failed (HTTP ${res.status})`);
  }
  const { invoiceNo } = await res.json();
  return invoiceNo;
}

// ---------------------------------------------------------------------------
// Form-level listeners
// ---------------------------------------------------------------------------

document.getElementById("invoice-form").addEventListener("input", (e) => {
  if (itemsTbody.contains(e.target)) return; // handled separately above
  updatePreview();
});
document.getElementById("invoice-form").addEventListener("change", (e) => {
  if (itemsTbody.contains(e.target)) return;
  if (e.target === customerSelect) applyCustomerSelection();
  updatePreview();
});

el("printBtn").addEventListener("click", () => {
  readRowsFromDom();
  updatePreview();
  window.print();
});

el("saveExcelBtn").addEventListener("click", async () => {
  const btn = el("saveExcelBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    const invoiceNo = await saveCurrentInvoiceToServer();
    alert(`Saved invoice ${invoiceNo} to the server.\n\nStarting a new invoice with the next number.`);
    await initForm(true);
  } catch (e) {
    alert(`Could not save this invoice: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Invoice";
  }
});

el("downloadAllBtn").addEventListener("click", () => {
  window.location.href = "/api/invoices/export";
});

el("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset the form? All entered data will be cleared.")) return;
  initForm(true);
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function initForm(assignNewInvoiceNo) {
  initStaticDropdowns();
  applyCustomerSelection();

  el("invoiceNo").value = "Loading…";
  el("invoiceDate").value = new Date().toISOString().slice(0, 10);
  el("refName").value = "";
  el("remarks").value = "";

  rows = [newRow(0, 1)];
  renderRows();
  updatePreview();

  el("invoiceNo").value = await fetchNextInvoiceNumber();
  updatePreview();
  updateLogStatus();
}

initForm(true);
