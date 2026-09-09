// Editable configuration for the Parts Invoice Generator.
// Values below are seeded from the source invoice (Kofo Zahav -> Zeecar, Invoice X 5017 - 00000001).
// Add/edit entries here to extend the dropdown lists.

const COMPANY = {
  name: "ZAHAV AUTOMOBILE COMPANY NIGE",
  address: "PLOT NO. 179/180, KOFO ABYAMI STREET",
  addressLine2: "LAGOS - NIGERIA - NIGERIA",
  tinNumber: "2521500623957",
  rcNumber: "729656",
  invoicePrefix: "X 5017",
};

const BRANCHES = [
  { code: "0034", label: "(0034) LAGOS NIGERIA" },
];

const CUSTOMERS = [
  {
    id: "68612",
    name: "ZEECAR GLOBAL LIMITED",
    address: "VI, LAGOS",
    branchCode: "0034",
  },
];

const PAYMENT_TYPES = ["CASH"];

const ACCOUNT_TYPES = ["PARTS"];

// Parts catalog: (description, unit price) pairs as they appear on the source invoice.
// Same description can repeat at a different price (different pack/SKU) — each is its own entry.
const PARTS_CATALOG = [
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
