document.addEventListener("DOMContentLoaded", () => {
  // Clear any previous login state on each startup
  localStorage.removeItem("loggedIn");

  const root = document.getElementById("root");
  const nav = document.createElement("nav");

  // Utility: show a two-field modal (name & %) and return {name,pct} or null
  function showInputModal(title) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex;
        align-items: center; justify-content: center; z-index: 1000;
      `;

      const box = document.createElement("div");
      box.style = `
        background: white; padding: 20px; border-radius: 8px;
        width: 280px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;

      const header = document.createElement("h3");
      header.textContent = title;
      header.style.marginTop = "0";

      const nameInp = document.createElement("input");
      nameInp.placeholder = "Tax Name";
      nameInp.style = "width: 100%; margin-bottom: 10px; padding: 6px;";

      const pctInp = document.createElement("input");
      pctInp.type = "number";
      pctInp.placeholder = "Tax %";
      pctInp.style = "width: 100%; margin-bottom: 15px; padding: 6px;";

      const btnOk = document.createElement("button");
      btnOk.textContent = "OK";
      btnOk.style = "margin-right: 10px;";
      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Cancel";

      box.append(header, nameInp, pctInp, btnOk, btnCancel);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      btnOk.onclick = () => {
        resolve({ name: nameInp.value.trim(), pct: pctInp.value.trim() });
        document.body.removeChild(overlay);
      };
      btnCancel.onclick = () => {
        resolve(null);
        document.body.removeChild(overlay);
      };
    });
  }

  // Build top navigation
  ["home", "invoice", "sales", "logout"].forEach((page) => {
    const btn = document.createElement("button");
    btn.textContent = page.toUpperCase();
    btn.onclick = () => {
      if (page === "logout") {
        localStorage.removeItem("loggedIn");
        loadView("login");
      } else {
        loadView(page);
      }
    };
    nav.appendChild(btn);
  });
  document.body.insertBefore(nav, root);

  // Initial view
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  loadView(isLoggedIn ? "home" : "login");

  async function loadView(page) {
    const res = await fetch(`views/${page}.html`);
    root.innerHTML = await res.text();

    if (page === "login") initLoginLogic();
    if (page === "signup") initSignupLogic();
    if (page === "business") initBusinessLogic();
    if (page === "home") initHomeLogic();
    if (page === "invoice") initInvoiceLogic();
  }

  function initLoginLogic() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const loginBtn = document.getElementById("login-btn");
    const signupBtn = document.getElementById("signup-btn");
    const msg = document.getElementById("login-message");

    loginBtn.onclick = async () => {
      const res = await window.authAPI.login(username.value, password.value);
      msg.textContent = res.message;
      if (res.success) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", username.value);
        loadView("home");
      }
    };

    signupBtn.onclick = () => loadView("signup");
  }

  function initSignupLogic() {
    const username = document.getElementById("signup-username");
    const password = document.getElementById("signup-password");
    const createBtn = document.getElementById("create-account-btn");
    const msg = document.getElementById("signup-message");

    createBtn.onclick = async () => {
      const res = await window.authAPI.signup(username.value, password.value);
      msg.textContent = res.message;
      if (res.success) {
        sessionStorage.setItem("newUser", username.value);
        alert("Signup successful! Now enter your business details.");
        loadView("business");
      }
    };
  }

  function initBusinessLogic() {
    const username = sessionStorage.getItem("newUser");
    const addrIn = document.getElementById("business-address");
    const regIn = document.getElementById("business-reg");
    const btn = document.getElementById("save-business-btn");
    const msg = document.getElementById("business-msg");

    btn.onclick = async () => {
      const res = await window.authAPI.completeProfile(
        username,
        addrIn.value,
        regIn.value
      );
      msg.textContent = res.message;
      if (res.success) {
        sessionStorage.removeItem("newUser");
        alert("Profile saved—please log in.");
        loadView("login");
      }
    };
  }

  function initHomeLogic() {
    const user = localStorage.getItem("username") || "Guest";
    document.getElementById(
      "welcome-user"
    ).textContent = `Hello, ${user}! Welcome to FBR Invoice Generator.`;
  }

  function initInvoiceLogic() {
    const itemsContainer = document.getElementById("items-container");
    const addItemBtn = document.getElementById("add-item-btn");
    const generateBtn = document.getElementById("generate-pdf-btn");

    // Helper to attach click showing tax details
    function attachLabelClick(row, selector, dataName, dataPctName, labelText) {
      const span = row.querySelector(selector);
      span.style.cursor = "pointer";
      span.onclick = () => {
        const name = row.dataset[dataName] || "(none)";
        const pct = row.dataset[dataPctName] || "(none)";
        alert(`${labelText}\nName: ${name}\nPercent: ${pct}%`);
      };
    }

    addItemBtn.onclick = () => addItemRow();
    generateBtn.onclick = () => {
      const invoiceData = collectInvoiceData();
      window.electronAPI.generatePDF(invoiceData);
    };

    addItemRow();

    function addItemRow() {
      const row = document.createElement("div");
      row.classList.add("invoice-item");
      row.innerHTML = `
        <input class="item-name" placeholder="Item Name">
        <input class="qty"       type="number" value="1">
        <input class="rate"      type="number" placeholder="Rate">
        <input class="discount"  type="number" value="0">
        <input class="tax"       type="number" value="0">
        <input type="checkbox" class="extra-tax-checkbox"   title="Enable extra tax">
        <input type="checkbox" class="further-tax-checkbox" title="Enable further tax">
        <span class="price-excl">$0.00</span>
        <span class="tax-amt">$0.00</span>
        <span class="total-price">$0.00</span>
        <button class="delete-btn">❌</button>
      `;
      itemsContainer.appendChild(row);

      // Recalculate on base field change
      ["item-name", "qty", "rate", "discount", "tax"].forEach((cls) =>
        row
          .querySelector(`.${cls}`)
          .addEventListener("input", () => updateRow(row))
      );

      // Delete
      row.querySelector(".delete-btn").addEventListener("click", () => {
        row.remove();
        updateSummary();
      });

      // Extra tax
      row
        .querySelector(".extra-tax-checkbox")
        .addEventListener("change", async (e) => {
          if (e.target.checked) {
            const res = await showInputModal("Extra Tax Details");
            if (res && res.name && res.pct) {
              row.dataset.extraTaxName = res.name;
              row.dataset.extraTaxPct = parseFloat(res.pct) || 0;
            } else {
              e.target.checked = false;
            }
          } else {
            delete row.dataset.extraTaxName;
            delete row.dataset.extraTaxPct;
          }
          updateRow(row);
        });

      // Further tax
      row
        .querySelector(".further-tax-checkbox")
        .addEventListener("change", async (e) => {
          if (e.target.checked) {
            const res = await showInputModal("Further Tax Details");
            if (res && res.name && res.pct) {
              row.dataset.furtherTaxName = res.name;
              row.dataset.furtherTaxPct = parseFloat(res.pct) || 0;
            } else {
              e.target.checked = false;
            }
          } else {
            delete row.dataset.furtherTaxName;
            delete row.dataset.furtherTaxPct;
          }
          updateRow(row);
        });
    }

    function updateRow(row) {
      const qty = parseFloat(row.querySelector(".qty").value) || 0;
      const rate = parseFloat(row.querySelector(".rate").value) || 0;
      const discP = parseFloat(row.querySelector(".discount").value) || 0;
      const taxP = parseFloat(row.querySelector(".tax").value) || 0;

      const extraPct = parseFloat(row.dataset.extraTaxPct) || 0;
      const furtherPct = parseFloat(row.dataset.furtherTaxPct) || 0;

      let excl = qty * rate;
      excl -= excl * (discP / 100);

      let taxAmt = excl * (taxP / 100);
      taxAmt += excl * (extraPct / 100);
      taxAmt += excl * (furtherPct / 100);

      const total = excl + taxAmt;

      row.querySelector(".price-excl").textContent = `$${excl.toFixed(2)}`;
      row.querySelector(".tax-amt").textContent = `$${taxAmt.toFixed(2)}`;
      row.querySelector(".total-price").textContent = `$${total.toFixed(2)}`;

      attachLabelClick(
        row,
        ".tax-amt",
        "extraTaxName",
        "extraTaxPct",
        "Extra Tax Details"
      );
      attachLabelClick(
        row,
        ".total-price",
        "furtherTaxName",
        "furtherTaxPct",
        "Further Tax Details"
      );

      updateSummary();
    }

    function updateSummary() {
      let sumExcl = 0,
        sumDisc = 0,
        sumTax = 0,
        sumFinal = 0;
      document.querySelectorAll(".invoice-item").forEach((row) => {
        const excl =
          parseFloat(row.querySelector(".price-excl").textContent.slice(1)) ||
          0;
        const total =
          parseFloat(row.querySelector(".total-price").textContent.slice(1)) ||
          0;
        const base =
          parseFloat(row.querySelector(".qty").value) *
          parseFloat(row.querySelector(".rate").value);
        sumExcl += excl;
        sumFinal += total;
        sumTax += total - excl;
        sumDisc += base - excl;
      });
      document.getElementById("sum-subtotal").textContent = sumExcl.toFixed(2);
      document.getElementById("sum-disc").textContent = sumDisc.toFixed(2);
      document.getElementById("sum-taxes").textContent = sumTax.toFixed(2);
      document.getElementById("sum-final").textContent = sumFinal.toFixed(2);
    }

    function collectInvoiceData() {
      return {
        seller: document.getElementById("seller-name").value,
        customer: document.getElementById("customer-name").value,
        buyerAddress: document.getElementById("buyer-address").value,
        buyerRegNo: document.getElementById("buyer-reg").value,
        date: document.getElementById("date").value,
        items: [...document.querySelectorAll(".invoice-item")].map((row) => ({
          name: row.querySelector(".item-name").value,
          qty: row.querySelector(".qty").value,
          rate: row.querySelector(".rate").value,
          discount: row.querySelector(".discount").value,
          tax: row.querySelector(".tax").value,
          extraTaxName: row.dataset.extraTaxName || "",
          extraTaxPct: row.dataset.extraTaxPct || "",
          furtherTaxName: row.dataset.furtherTaxName || "",
          furtherTaxPct: row.dataset.furtherTaxPct || "",
          priceExcl: row.querySelector(".price-excl").textContent,
          taxAmount: row.querySelector(".tax-amt").textContent,
          totalPrice: row.querySelector(".total-price").textContent,
        })),
      };
    }
  }
});
