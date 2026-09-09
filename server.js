// Parts Invoice Generator — backend
//
// Serves the static frontend (public/) and a small JSON API that stores every
// saved invoice centrally by committing to data/records.json in this same
// GitHub repo via the Contents API. That file is the single source of truth
// for all invoices+line items; /api/invoices/export regenerates a fresh
// .xlsx from it on every request, so there's nothing to keep in sync.

const express = require("express");
const path = require("path");
const XLSX = require("xlsx");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "visheshStallion";
const GITHUB_REPO = process.env.GITHUB_REPO || "parts-invoice-generator";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "master";
const RECORDS_PATH = "data/records.json";
const INVOICE_PREFIX = process.env.INVOICE_PREFIX || "X 5017";

if (!GITHUB_TOKEN) {
  console.warn(
    "WARNING: GITHUB_TOKEN is not set. Reads of the public repo will still work, " +
      "but saving new invoices will fail until it is configured."
  );
}

const CONTENTS_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${RECORDS_PATH}`;

function ghHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "parts-invoice-generator-backend",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

async function getRecords() {
  const res = await fetch(`${CONTENTS_URL}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
    headers: ghHeaders(),
  });
  if (res.status === 404) {
    return { lastSeq: 0, invoices: [], items: [], sha: null };
  }
  if (!res.ok) {
    throw new Error(`GitHub read failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  const data = JSON.parse(content);
  return {
    lastSeq: data.lastSeq || 0,
    invoices: data.invoices || [],
    items: data.items || [],
    sha: json.sha,
  };
}

async function putRecords(data, sha, message) {
  const body = {
    message,
    content: Buffer.from(
      JSON.stringify({ lastSeq: data.lastSeq, invoices: data.invoices, items: data.items }, null, 2)
    ).toString("base64"),
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(CONTENTS_URL, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    const err = new Error(`GitHub write failed: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// data/records.json is shared state — two people saving invoices at nearly
// the same moment can race on its sha. Retry a few times on a conflict.
async function withRetry(fn, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (e.status === 409 || e.status === 412) continue;
      throw e;
    }
  }
  throw lastErr;
}

app.get("/api/invoices/next-number", async (req, res) => {
  try {
    const { lastSeq } = await getRecords();
    res.json({ invoiceNo: `${INVOICE_PREFIX} - ${String(lastSeq + 1).padStart(8, "0")}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/invoices/count", async (req, res) => {
  try {
    const { invoices } = await getRecords();
    res.json({ count: invoices.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/invoices", async (req, res) => {
  const { invoice, items } = req.body || {};
  if (!invoice || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Request must include an invoice object and a non-empty items[] array." });
  }
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: "Server is not configured with a GITHUB_TOKEN — saving is disabled." });
  }
  try {
    const invoiceNo = await withRetry(async () => {
      const data = await getRecords();
      const next = data.lastSeq + 1;
      const assignedNo = `${INVOICE_PREFIX} - ${String(next).padStart(8, "0")}`;
      const savedAt = new Date().toISOString();

      data.invoices.push({ ...invoice, invoiceNo: assignedNo, savedAt });
      items.forEach((it) => data.items.push({ ...it, invoiceNo: assignedNo }));
      data.lastSeq = next;

      await putRecords(data, data.sha, `Add invoice ${assignedNo}`);
      return assignedNo;
    });
    res.json({ invoiceNo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/invoices/export", async (req, res) => {
  try {
    const { invoices, items } = await getRecords();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(invoices.length ? invoices : [{}]),
      "Invoices"
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items.length ? items : [{}]), "Line Items");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="parts-invoices-log.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/invoices", async (req, res) => {
  try {
    const { invoices, items } = await getRecords();
    res.json({ invoices, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/healthz", (req, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Parts invoice backend listening on port ${PORT}`));
