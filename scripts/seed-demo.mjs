/**
 * Comprehensive demo data seed script.
 * Run: node scripts/seed-demo.mjs
 */
const BASE = "http://localhost:80/api";

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    console.error(`POST ${path} failed ${r.status}: ${txt}`);
    return null;
  }
  return r.json();
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  return r.json();
}

async function put(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    console.error(`PUT ${path} failed ${r.status}: ${txt}`);
    return null;
  }
  return r.json();
}

async function patch(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    console.error(`PATCH ${path} failed ${r.status}: ${txt}`);
    return null;
  }
  return r.json();
}

// ─── CUSTOMERS ──────────────────────────────────────────────────────────────
async function seedCustomers() {
  console.log("\n📋 Seeding customers...");
  const customers = [
    { name: "Tata Consultancy Services Ltd", type: "Business", gstin: "27AAACT2727Q1ZW", pan: "AAACT2727Q", email: "accounts@tcs.com", phone: "022-67789999", billingAddress: "TCS House, Raveline St, Fort", city: "Mumbai", state: "Maharashtra", pincode: "400001", creditLimit: "500000", paymentTerms: "30 days", openingBalance: "125000" },
    { name: "Infosys BPM Limited", type: "Business", gstin: "29AABCI8821J1ZN", pan: "AABCI8821J", email: "billing@infosys.com", phone: "080-22099764", billingAddress: "Electronics City Phase 1", city: "Bengaluru", state: "Karnataka", pincode: "560100", creditLimit: "300000", paymentTerms: "45 days", openingBalance: "85000" },
    { name: "Wipro Technologies", type: "Business", gstin: "29AAACW0235G1ZM", pan: "AAACW0235G", email: "finance@wipro.com", phone: "080-28440011", billingAddress: "Sarjapur Road", city: "Bengaluru", state: "Karnataka", pincode: "560035", creditLimit: "200000", paymentTerms: "30 days", openingBalance: "0" },
    { name: "Reliance Retail Ltd", type: "Business", gstin: "27AADCR4849R1ZS", pan: "AADCR4849R", email: "vendor@relianceretail.com", phone: "022-44779999", billingAddress: "Maker Chambers IV, Nariman Point", city: "Mumbai", state: "Maharashtra", pincode: "400021", creditLimit: "800000", paymentTerms: "15 days", openingBalance: "250000" },
    { name: "Meera Kapoor (Individual)", type: "Individual", gstin: "", pan: "BKPKM1234A", email: "meera.k@gmail.com", phone: "9876543210", billingAddress: "Flat 12B, Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400058", creditLimit: "50000", paymentTerms: "7 days", openingBalance: "12500" },
  ];
  const results = [];
  for (const c of customers) {
    const r = await post("/customers", c);
    if (r) { results.push(r); console.log(`  ✓ ${r.name} (id:${r.id})`); }
  }
  return results;
}

// ─── VENDORS ────────────────────────────────────────────────────────────────
async function seedVendors() {
  console.log("\n🏭 Seeding vendors...");
  const vendors = [
    { name: "Larsen & Toubro Ltd", gstin: "27AAACL3262F1ZS", pan: "AAACL3262F", email: "payments@lntecc.com", phone: "022-67525656", address: "L&T House, Ballard Estate", city: "Mumbai", state: "Maharashtra", pincode: "400001", isMsme: false, paymentTerms: "45 days", openingBalance: "75000", rating: 5 },
    { name: "Bharat Forge Ltd", gstin: "27AAACB4346R1ZT", pan: "AAACB4346R", email: "vendor@bharatforge.com", phone: "020-66292222", address: "Mundhwa Industrial Area", city: "Pune", state: "Maharashtra", pincode: "411036", isMsme: false, paymentTerms: "30 days", openingBalance: "45000", rating: 4 },
    { name: "Sunrise Office Supplies", gstin: "27AAIFS1234J1Z5", pan: "AAIFS1234J", email: "sunrise@officesupply.in", phone: "022-25671234", address: "Lower Parel Market, Unit 14", city: "Mumbai", state: "Maharashtra", pincode: "400013", isMsme: true, msmeRegistrationNo: "UDYAM-MH-27-0012345", paymentTerms: "15 days", openingBalance: "0", rating: 3 },
    { name: "Schneider Electric India", gstin: "07AADCS7547J1Z9", pan: "AADCS7547J", email: "india.accounts@schneider.com", phone: "011-45222999", address: "Plot No 41-A, Sector 30", city: "Gurugram", state: "Haryana", pincode: "122001", isMsme: false, tdsSection: "194C", paymentTerms: "30 days", openingBalance: "30000", rating: 4 },
  ];
  const results = [];
  for (const v of vendors) {
    const r = await post("/vendors", v);
    if (r) { results.push(r); console.log(`  ✓ ${r.name} (id:${r.id})`); }
  }
  return results;
}

// ─── INVENTORY ITEMS ─────────────────────────────────────────────────────────
async function seedInventory() {
  console.log("\n📦 Seeding inventory items...");
  const items = [
    { itemCode: "ITEM-001", name: "Enterprise Software License", type: "Service", hsnSac: "998315", unit: "Nos", gstRate: "18", sellingRate: "50000", purchaseRate: "30000", reorderLevel: "0", reorderQty: "0", valuationMethod: "FIFO", currentStock: "0", stockValue: "0" },
    { itemCode: "ITEM-002", name: "Industrial UPS 10KVA", type: "Goods", group: "Electrical Equipment", hsnSac: "850440", unit: "Nos", gstRate: "18", purchaseRate: "45000", sellingRate: "62000", mrp: "70000", reorderLevel: "5", reorderQty: "10", valuationMethod: "FIFO", currentStock: "18", stockValue: "810000" },
    { itemCode: "ITEM-003", name: "Network Switch 24-Port", type: "Goods", group: "IT Hardware", hsnSac: "851769", unit: "Nos", gstRate: "18", purchaseRate: "12000", sellingRate: "17500", mrp: "20000", reorderLevel: "10", reorderQty: "20", valuationMethod: "FIFO", currentStock: "32", stockValue: "384000" },
    { itemCode: "ITEM-004", name: "Annual AMC Contract", type: "Service", hsnSac: "998346", unit: "Nos", gstRate: "18", sellingRate: "24000", purchaseRate: "15000", reorderLevel: "0", reorderQty: "0", valuationMethod: "FIFO", currentStock: "0", stockValue: "0" },
    { itemCode: "ITEM-005", name: "Server Rack Cabinet 42U", type: "Goods", group: "IT Hardware", hsnSac: "947190", unit: "Nos", gstRate: "18", purchaseRate: "18000", sellingRate: "28500", mrp: "35000", reorderLevel: "3", reorderQty: "5", valuationMethod: "WA", currentStock: "7", stockValue: "126000" },
    { itemCode: "ITEM-006", name: "CAT6 LAN Cable (per mtr)", type: "Goods", group: "Cables & Accessories", hsnSac: "854411", unit: "Mtr", gstRate: "18", purchaseRate: "15", sellingRate: "28", mrp: "35", reorderLevel: "500", reorderQty: "1000", valuationMethod: "FIFO", currentStock: "2400", stockValue: "36000" },
  ];
  const results = [];
  for (const item of items) {
    const r = await post("/inventory/items", item);
    if (r) { results.push(r); console.log(`  ✓ ${r.name} (id:${r.id})`); }
  }
  return results;
}

// ─── INVOICES ────────────────────────────────────────────────────────────────
async function seedInvoices(customers, items) {
  console.log("\n🧾 Seeding invoices...");
  const today = new Date();
  const d = (offset = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  const invoiceData = [
    {
      type: "Tax Invoice", date: d(-45), dueDate: d(-15), customerId: customers[0].id,
      customerName: customers[0].name, customerGstin: customers[0].gstin,
      placeOfSupply: "Maharashtra", poReference: "TCS-PO-2026-4521", status: "posted",
      lines: [
        { description: "Enterprise Software License", hsnSac: "998315", quantity: "5", unit: "Nos", rate: "50000", discountPct: "5", gstRate: "18" },
        { description: "Annual AMC Contract", hsnSac: "998346", quantity: "5", unit: "Nos", rate: "24000", discountPct: "0", gstRate: "18" },
      ],
    },
    {
      type: "Tax Invoice", date: d(-30), dueDate: d(0), customerId: customers[1].id,
      customerName: customers[1].name, customerGstin: customers[1].gstin,
      placeOfSupply: "Karnataka", poReference: "INFY-2026-0234", status: "posted",
      lines: [
        { description: "Network Switch 24-Port", hsnSac: "851769", quantity: "10", unit: "Nos", rate: "17500", discountPct: "0", gstRate: "18" },
        { description: "CAT6 LAN Cable (per mtr)", hsnSac: "854411", quantity: "500", unit: "Mtr", rate: "28", discountPct: "0", gstRate: "18" },
      ],
    },
    {
      type: "Tax Invoice", date: d(-15), dueDate: d(15), customerId: customers[3].id,
      customerName: customers[3].name, customerGstin: customers[3].gstin,
      placeOfSupply: "Maharashtra", status: "posted",
      lines: [
        { description: "Industrial UPS 10KVA", hsnSac: "850440", quantity: "3", unit: "Nos", rate: "62000", discountPct: "0", gstRate: "18" },
        { description: "Server Rack Cabinet 42U", hsnSac: "947190", quantity: "2", unit: "Nos", rate: "28500", discountPct: "0", gstRate: "18" },
      ],
    },
    {
      type: "Tax Invoice", date: d(-5), dueDate: d(25), customerId: customers[2].id,
      customerName: customers[2].name, customerGstin: customers[2].gstin,
      placeOfSupply: "Karnataka", status: "draft",
      lines: [
        { description: "Enterprise Software License", hsnSac: "998315", quantity: "2", unit: "Nos", rate: "50000", discountPct: "10", gstRate: "18" },
      ],
    },
    {
      type: "Credit Note", date: d(-10), dueDate: d(-10), customerId: customers[0].id,
      customerName: customers[0].name, customerGstin: customers[0].gstin,
      placeOfSupply: "Maharashtra", status: "posted",
      lines: [
        { description: "Return: Enterprise Software License (1 unit)", hsnSac: "998315", quantity: "1", unit: "Nos", rate: "50000", discountPct: "5", gstRate: "18" },
      ],
    },
  ];

  const results = [];
  for (const inv of invoiceData) {
    const r = await post("/invoices", inv);
    if (r) { results.push(r); console.log(`  ✓ ${r.invoiceNo} – ${r.customerName} ₹${r.totalAmount} [${r.status}]`); }
  }
  return results;
}

// ─── RECEIPTS ────────────────────────────────────────────────────────────────
async function seedReceipts(customers, invoices) {
  console.log("\n💰 Seeding receipts...");
  const today = new Date();
  const d = (offset = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  const postedInvoices = invoices.filter(i => i.status === "posted" && i.type === "Tax Invoice");
  if (!postedInvoices.length) { console.log("  (no posted invoices to allocate)"); return []; }

  const receipts = [
    {
      date: d(-10), customerId: customers[0].id, customerName: customers[0].name,
      paymentMode: "NEFT", grossAmount: "200000", tdsDeducted: "0", settlementDiscount: "0",
      netAmount: "200000", bankAccountId: 1, bankAccountName: "HDFC Current Account",
      referenceNo: "NEFT2026062900123", narration: "Part payment against INV",
      allocations: postedInvoices[0] ? [{ invoiceId: postedInvoices[0].id, invoiceNo: postedInvoices[0].invoiceNo, allocatedAmount: 200000 }] : [],
    },
    {
      date: d(-2), customerId: customers[1].id, customerName: customers[1].name,
      paymentMode: "RTGS", grossAmount: "189000", tdsDeducted: "0", settlementDiscount: "1000",
      netAmount: "188000", bankAccountId: 1, bankAccountName: "HDFC Current Account",
      referenceNo: "RTGS20260628INFOSYS01", narration: "Full settlement Infosys invoice",
      allocations: postedInvoices[1] ? [{ invoiceId: postedInvoices[1].id, invoiceNo: postedInvoices[1].invoiceNo, allocatedAmount: 188000 }] : [],
    },
  ];

  const results = [];
  for (const rec of receipts) {
    const r = await post("/receipts", rec);
    if (r) { results.push(r); console.log(`  ✓ ${r.receiptNo} – ${r.customerName} ₹${r.grossAmount}`); }
  }
  return results;
}

// ─── VENDOR BILLS ────────────────────────────────────────────────────────────
async function seedBills(vendors) {
  console.log("\n📄 Seeding vendor bills...");
  const today = new Date();
  const d = (offset = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  const bills = [
    {
      vendorInvoiceNo: "LT-2026-5432", vendorId: vendors[0].id, vendorName: vendors[0].name,
      date: d(-20), dueDate: d(10), isMsmeVendor: false, status: "posted",
      lines: [
        { description: "Civil Work - Server Room Preparation", hsnSac: "995433", quantity: "1", unit: "Lumpsum", rate: "120000", gstRate: "18" },
      ],
    },
    {
      vendorInvoiceNo: "SS-INV-0891", vendorId: vendors[2].id, vendorName: vendors[2].name,
      date: d(-10), dueDate: d(5), isMsmeVendor: true, status: "draft",
      lines: [
        { description: "A4 Paper Reams (80 GSM)", hsnSac: "480210", quantity: "50", unit: "Ream", rate: "350", gstRate: "12" },
        { description: "Toner Cartridge HP LaserJet", hsnSac: "844399", quantity: "10", unit: "Nos", rate: "2800", gstRate: "18" },
        { description: "Whiteboard Markers (Box)", hsnSac: "961210", quantity: "20", unit: "Box", rate: "120", gstRate: "18" },
      ],
    },
    {
      vendorInvoiceNo: "SE-2026-8891", vendorId: vendors[3].id, vendorName: vendors[3].name,
      date: d(-5), dueDate: d(25), isMsmeVendor: false, status: "posted",
      lines: [
        { description: "Schneider Easy9 MCB 32A", hsnSac: "853620", quantity: "20", unit: "Nos", rate: "850", gstRate: "18" },
        { description: "Distribution Board 8-way", hsnSac: "853650", quantity: "5", unit: "Nos", rate: "4200", gstRate: "18" },
      ],
    },
  ];

  const results = [];
  for (const bill of bills) {
    const r = await post("/bills", bill);
    if (r) { results.push(r); console.log(`  ✓ ${r.billNo} – ${r.vendorName} ₹${r.totalAmount}`); }
  }
  return results;
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────
async function seedExpenses() {
  console.log("\n🧳 Seeding expense claims...");
  const today = new Date();
  const d = (offset = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  const claims = [
    {
      employeeName: "Rajesh Sharma", submittedDate: d(-7), status: "submitted", currentApprover: "Finance Manager",
      lines: [
        { date: d(-15), category: "Travel", subCategory: "Flight", amount: "8500", description: "Mumbai to Bengaluru (project visit)", vendorName: "IndiGo Airlines", gstAmount: "612" },
        { date: d(-14), category: "Accommodation", amount: "4200", description: "Hotel Leela, Bengaluru (2 nights)", vendorName: "Hotel Leela", gstAmount: "756" },
        { date: d(-13), category: "Meals", amount: "1800", description: "Client dinner - 4 pax", vendorName: "The Tandoor", gstAmount: "90" },
      ],
    },
    {
      employeeName: "Priya Nair", submittedDate: d(-3), status: "approved", currentApprover: "CFO",
      lines: [
        { date: d(-8), category: "Travel", subCategory: "Local Conveyance", amount: "1200", description: "Ola/Uber - client meetings", vendorName: "Ola Cabs", gstAmount: "60" },
        { date: d(-7), category: "Office Supplies", amount: "2500", description: "Stationery for presentations", vendorName: "Staples India", gstAmount: "300", policyViolation: true, violationReason: "Exceeds ₹2000 per-item limit without pre-approval" },
      ],
    },
  ];

  const results = [];
  for (const claim of claims) {
    const r = await post("/expenses", claim);
    if (r) { results.push(r); console.log(`  ✓ ${r.claimNo} – ${r.employeeName} ₹${r.totalAmount}`); }
  }
  return results;
}

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────────────
async function seedPurchaseOrders(vendors, items) {
  console.log("\n🛒 Seeding purchase orders...");
  const today = new Date();
  const d = (offset = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  const orders = [
    {
      vendorId: vendors[0].id, vendorName: vendors[0].name,
      date: d(-30), deliveryDate: d(0), status: "approved", approvedBy: "Anand Mehta",
      notes: "Urgent delivery for Q1 project",
      lines: [
        { itemId: items[1]?.id, description: "Industrial UPS 10KVA", hsnSac: "850440", quantity: "10", unit: "Nos", rate: "45000", gstRate: "18" },
        { itemId: items[4]?.id, description: "Server Rack Cabinet 42U", hsnSac: "947190", quantity: "5", unit: "Nos", rate: "18000", gstRate: "18" },
      ],
    },
    {
      vendorId: vendors[2].id, vendorName: vendors[2].name,
      date: d(-5), deliveryDate: d(10), status: "draft",
      notes: "Monthly office supplies replenishment",
      lines: [
        { description: "A4 Paper Reams 80 GSM", hsnSac: "480210", quantity: "100", unit: "Ream", rate: "350", gstRate: "12" },
        { description: "Ballpoint Pens (box)", hsnSac: "960810", quantity: "30", unit: "Box", rate: "120", gstRate: "18" },
      ],
    },
  ];

  const results = [];
  for (const po of orders) {
    const r = await post("/purchases/orders", po);
    if (r) { results.push(r); console.log(`  ✓ ${r.poNo} – ${r.vendorName} ₹${r.totalAmount}`); }
  }
  return results;
}

// ─── BUDGETS ─────────────────────────────────────────────────────────────────
async function seedBudgets() {
  console.log("\n📊 Seeding budgets...");
  const budgets = [
    {
      name: "FY 2026-27 Annual Budget",
      fiscalYear: "2026-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
      totalBudget: "12000000",
      status: "approved",
      lines: [
        { accountCode: "4000", accountName: "Sales Revenue", budgetedAmount: "10000000" },
        { accountCode: "5000", accountName: "Cost of Goods Sold", budgetedAmount: "5500000" },
        { accountCode: "6000", accountName: "Salaries & Wages", budgetedAmount: "2400000" },
        { accountCode: "6100", accountName: "Office Rent", budgetedAmount: "600000" },
        { accountCode: "6200", accountName: "Travel & Conveyance", budgetedAmount: "300000" },
        { accountCode: "6300", accountName: "Utilities & Internet", budgetedAmount: "120000" },
        { accountCode: "6400", accountName: "Marketing & Advertising", budgetedAmount: "480000" },
        { accountCode: "6500", accountName: "Repairs & Maintenance", budgetedAmount: "180000" },
      ],
    },
  ];

  const results = [];
  for (const b of budgets) {
    const r = await post("/budgets", b);
    if (r) { results.push(r); console.log(`  ✓ ${r.name} (id:${r.id})`); }
  }
  return results;
}

// ─── USERS ───────────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("\n👥 Seeding users...");
  const users = [
    { name: "Anand Mehta", email: "anand.mehta@mysticsaudit.com", role: "Admin", department: "Management", isActive: true, permissions: { invoices: "full", receipts: "full", bills: "full", expenses: "full", inventory: "full", gst: "full", reports: "full", users: "full", settings: "full" } },
    { name: "Kavya Sharma", email: "kavya.sharma@mysticsaudit.com", role: "Accountant", department: "Finance", isActive: true, permissions: { invoices: "full", receipts: "full", bills: "full", expenses: "approve", inventory: "view", gst: "full", reports: "full", users: "none", settings: "view" } },
    { name: "Rishi Patel", email: "rishi.patel@mysticsaudit.com", role: "Viewer", department: "Operations", isActive: true, permissions: { invoices: "view", receipts: "view", bills: "view", expenses: "submit", inventory: "view", gst: "view", reports: "view", users: "none", settings: "none" } },
    { name: "Sunita Joshi", email: "sunita.joshi@mysticsaudit.com", role: "Accountant", department: "Finance", isActive: false, permissions: { invoices: "full", receipts: "full", bills: "full", expenses: "full", inventory: "view", gst: "view", reports: "view", users: "none", settings: "none" } },
  ];

  const results = [];
  for (const u of users) {
    const r = await post("/users", u);
    if (r) { results.push(r); console.log(`  ✓ ${r.name} [${r.role}] (id:${r.id})`); }
  }
  return results;
}

// ─── JOURNALS ────────────────────────────────────────────────────────────────
async function seedJournals() {
  console.log("\n📒 Seeding journal entries...");
  const today = new Date();
  const d = (offset = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  const journals = [
    {
      date: d(-30), narration: "Office rent payment - June 2026", type: "General",
      lines: [
        { accountCode: "6100", accountName: "Office Rent", debit: "50000", credit: "0" },
        { accountCode: "2100", accountName: "HDFC Bank Current Account", debit: "0", credit: "50000" },
      ],
    },
    {
      date: d(-20), narration: "Salary disbursement - May 2026", type: "General",
      lines: [
        { accountCode: "6000", accountName: "Salaries & Wages", debit: "180000", credit: "0" },
        { accountCode: "2100", accountName: "HDFC Bank Current Account", debit: "0", credit: "180000" },
      ],
    },
    {
      date: d(-10), narration: "Depreciation - Computers & Peripherals", type: "General",
      lines: [
        { accountCode: "6700", accountName: "Depreciation", debit: "12000", credit: "0" },
        { accountCode: "1500", accountName: "Accumulated Depreciation", debit: "0", credit: "12000" },
      ],
    },
  ];

  const results = [];
  for (const j of journals) {
    const r = await post("/journals", j);
    if (r) { results.push(r); console.log(`  ✓ ${r.journalNo} – ${r.narration}`); }
  }
  return results;
}

// ─── BANK TRANSACTIONS ────────────────────────────────────────────────────────
async function seedBankTransactions() {
  console.log("\n🏦 Seeding bank transactions...");
  const today = new Date();
  const d = (offset = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };

  const txns = [
    { bankAccountId: 1, date: d(-30), description: "NEFT CR - TCS Payment", debit: "0", credit: "200000", balance: "200000", referenceNo: "NEFT2026062900123", status: "unreconciled" },
    { bankAccountId: 1, date: d(-25), description: "NEFT DR - Office Rent", debit: "50000", credit: "0", balance: "150000", referenceNo: "NEFT202606300456", status: "unreconciled" },
    { bankAccountId: 1, date: d(-20), description: "NEFT DR - Salary May 2026", debit: "180000", credit: "0", balance: "-30000", referenceNo: "NEFTSAL20260615", status: "unreconciled" },
    { bankAccountId: 1, date: d(-15), description: "RTGS CR - Reliance Retail", debit: "0", credit: "250000", balance: "220000", referenceNo: "RTGS20260618001", status: "unreconciled" },
    { bankAccountId: 1, date: d(-10), description: "NEFT CR - Infosys Payment", debit: "0", credit: "189000", balance: "409000", referenceNo: "RTGS20260628INFOSYS01", status: "unreconciled" },
    { bankAccountId: 1, date: d(-5), description: "Vendor Payment - L&T", debit: "141600", credit: "0", balance: "267400", referenceNo: "NEFT202606254321", status: "unreconciled" },
    { bankAccountId: 2, date: d(-20), description: "Interest Credit", debit: "0", credit: "3200", balance: "103200", referenceNo: "INT-JUN2026", status: "unreconciled" },
    { bankAccountId: 2, date: d(-15), description: "FD Proceeds Received", debit: "0", credit: "500000", balance: "603200", referenceNo: "FD-MATURE-2026", status: "unreconciled" },
  ];

  const results = [];
  for (const txn of txns) {
    const r = await post("/bank/transactions", txn);
    if (r) results.push(r);
  }
  console.log(`  ✓ Seeded ${results.length} bank transactions`);
  return results;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  console.log("🌱 Starting comprehensive demo data seed...\n");

  try {
    const customers  = await seedCustomers();
    const vendors    = await seedVendors();
    const items      = await seedInventory();
    const invoices   = await seedInvoices(customers, items);
    await seedReceipts(customers, invoices);
    await seedBills(vendors);
    await seedExpenses();
    const pos        = await seedPurchaseOrders(vendors, items);
    await seedBudgets();
    await seedUsers();
    await seedJournals();
    await seedBankTransactions();

    console.log("\n✅ Demo data seed complete!");
    console.log(`   Customers: ${customers.length}, Vendors: ${vendors.length}, Items: ${items.length}`);
    console.log(`   Invoices: ${invoices.length}, POs: ${pos.length}`);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
})();
