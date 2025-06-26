// services/pdf_generator.js
const { ipcMain, dialog } = require("electron");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const usersPath = path.join(__dirname, "..", "data", "users.json");
const logoPath = path.join(__dirname, "..", "assets", "fbr_logo.png");
const outputDir = path.join(__dirname, "..", "invoices");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

ipcMain.handle("generate-pdf", async (_e, data) => {
  // ---------- invoice number + tax period ----------
  const now = new Date();
  const rand = Math.floor(100000 + Math.random() * 900000);
  const stamp = now
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(2, 14); // ddMMyyHHmmss
  const invNo = `${rand}-${stamp}-0001`;
  const period =
    now.getMonth() + 1 >= 6
      ? `${now.getFullYear()}-${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}-${now.getFullYear()}`;

  // ---------- seller profile ----------
  let sellerAddr = "",
    sellerReg = "";
  if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath));
    const u = users.find((u) => u.username === data.seller);
    if (u) {
      sellerAddr = u.address || "";
      sellerReg = u.registrationNumber || "";
    }
  }

  // ---------- build PDF ----------
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const file = path.join(outputDir, `invoice-${invNo}.pdf`);
  doc.pipe(fs.createWriteStream(file));

  // Logo & title
  if (fs.existsSync(logoPath)) doc.image(logoPath, 50, 40, { width: 80 });
  doc.fontSize(20).text("FBR DIGITAL INVOICE", 200, 50);

  // Invoice meta (now lined up with Seller block)
  doc
    .fontSize(10)
    .text(`Invoice #: ${invNo}`, 380, 110) // ← unchanged
    .text(`Date: ${data.date}`, 380, 135) // 110 + 25
    .text(`Tax Period: ${period}`, 380, 150); // 135 + 25

  // Seller block
  let y = 110;
  doc.font("Helvetica-Bold").text("Seller", 50, y);
  doc
    .font("Helvetica")
    .text(`Name: ${data.seller}`, 120, y)
    .text(`Address: ${sellerAddr}`, 120, y + 12)
    .text(`Reg No.: ${sellerReg}`, 120, y + 24);

  // Recipient block
  y += 48;
  doc.font("Helvetica-Bold").text("Recipient", 50, y);
  doc
    .font("Helvetica")
    .text(`Name: ${data.customer}`, 120, y)
    .text(`Address: ${data.buyerAddress}`, 120, y + 12)
    .text(`Reg No.: ${data.buyerRegNo}`, 120, y + 24);

  // ---------- column map (all content ≤ 545 pt) ----------
  y += 60;
  const col = {
    desc: 50, // 90 pt wide, wraps
    qty: 150,
    excl: 185,
    taxRate: 230,
    taxAmt: 270,
    extra: 315,
    further: 360,
    discRate: 405,
    discAmt: 450,
    total: 495,
  };
  const header = [
    "Description",
    "Qty",
    "Excl.",
    "Tax %",
    "Tax Amt",
    "Extra",
    "Further",
    "Disc %",
    "Disc Amt",
    "Total",
  ];
  doc.font("Helvetica-Bold");
  header.forEach((h, i) => doc.text(h, Object.values(col)[i], y));
  doc.font("Helvetica");

  // ---------- table rows ----------
  y += 15;
  let sumExcl = 0,
    sumDisc = 0,
    sumTax = 0,
    sumTot = 0;
  data.items.forEach((it) => {
    const qty = +it.qty || 0;
    const excl = +it.priceExcl.replace("$", "") || 0;
    const taxAmt = +it.taxAmount.replace("$", "") || 0;
    const base = qty * +it.rate;
    const discAmt = base - excl;
    const total = excl + taxAmt;

    const cells = [
      it.name,
      qty,
      excl.toFixed(2),
      `${it.tax}%`,
      taxAmt.toFixed(2),
      it.extraTaxPct ? `${it.extraTaxPct}%` : "-",
      it.furtherTaxPct ? `${it.furtherTaxPct}%` : "-",
      `${it.discount}%`,
      discAmt.toFixed(2),
      total.toFixed(2),
    ];

    doc.fontSize(8);
    // Description wraps (width 90 pt), others fixed 45–50 pt columns
    cells.forEach((txt, i) => {
      const key = Object.keys(col)[i];
      doc.text(String(txt), col[key], y, key === "desc" ? { width: 90 } : {});
    });

    // adjust row height if description wrapped
    const rowHeight = doc.heightOfString(String(cells[0]), {
      width: 90,
      align: "left",
    });
    y += Math.max(12, rowHeight);

    if (y > 740) {
      doc.addPage();
      y = 50;
    }

    sumExcl += excl;
    sumTax += taxAmt;
    sumDisc += discAmt;
    sumTot += total;
  });

  // ---------- summary ----------
  y += 20;
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text(`Subtotal (Excl.): $${sumExcl.toFixed(2)}`, 380, y);
  doc.text(`Total Discounts:   $${sumDisc.toFixed(2)}`, 380, y + 14);
  doc.text(`Total Taxes:       $${sumTax.toFixed(2)}`, 380, y + 28);
  doc.text(`FINAL AMOUNT:      $${sumTot.toFixed(2)}`, 380, y + 42);

  doc.end();
  await new Promise((r) =>
    doc.pipe(fs.createWriteStream(file)).on("finish", r)
  );
  dialog.showMessageBox({
    message: `Invoice saved:\n${file}`,
    buttons: ["OK"],
  });
});
