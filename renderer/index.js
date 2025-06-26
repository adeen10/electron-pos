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
  ["home", "invoice", "customers", "products", "sales", "logout"].forEach(
    (page) => {
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
    }
  );
  document.body.insertBefore(nav, root);

  // Initial view
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  loadView(isLoggedIn ? "home" : "login");

  async function loadView(page) {
    // split “customer-detail?id=5” → base="customer-detail", qs="id=5"
    const [base, qs] = page.split("?");
    const res = await fetch(`views/${base}.html`);
    root.innerHTML = await res.text();

    const params = new URLSearchParams(qs);

    switch (base) {
      case "login":
        initLoginLogic();
        break;
      case "signup":
        initSignupLogic();
        break;
      case "business":
        initBusinessLogic();
        break;
      case "home":
        initHomeLogic();
        break;
      case "invoice":
        initInvoiceLogic();
        break;
      case "customers":
        initCustomerLogic();
        break;
      case "products":
        initProductLogic();
        break;
      case "customer-detail":
        initCustomerDetailLogic(params.get("id"));
        break;
      case "products":
        initProductLogic();
        break;
      case "product-detail":
        initProductDetailLogic(params.get("id"));
        break;
    }
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

  async function initInvoiceLogic() {
    const itemsContainer = document.getElementById("items-container");
    const addItemBtn = document.getElementById("add-item-btn");
    const generateBtn = document.getElementById("generate-pdf-btn");

    // ─── Sales Person (read-only) ─────────────────────────────
    const sellerIn = document.getElementById("seller-name");
    const user = localStorage.getItem("username") || "";
    sellerIn.value = user;
    sellerIn.disabled = true;

    // ─── Customer Search + Autocomplete ───────────────────────
    const custIn = document.getElementById("customer-name");
    const addrIn = document.getElementById("buyer-address");
    const regIn = document.getElementById("buyer-reg");
    const resultList = document.createElement("ul");
    resultList.id = "customer-search-results";
    resultList.classList.add("search-list");
    custIn.parentNode.insertBefore(resultList, custIn.nextSibling);

    let lastQ = "";
    custIn.addEventListener("input", async () => {
      const q = custIn.value.trim();
      if (!q) {
        resultList.innerHTML = "";
        return;
      }
      if (q === lastQ) return;
      lastQ = q;

      const hits = await window.customerAPI.search(q);
      resultList.innerHTML =
        hits.map((c) => `<li data-id="${c.id}">${c.name}</li>`).join("") +
        `<li data-new="true">➕ Create new customer “${q}”</li>`;
    });

    // Helper: in‐place modal for creating customer
    function showCustomerModal(defaultName = "") {
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.style = `
        position:fixed; inset:0;
        background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center;
        z-index:1000;
      `;
        const box = document.createElement("div");
        box.style = `
        background:#fff; padding:20px; border-radius:8px;
        width:300px; box-shadow:0 2px 10px rgba(0,0,0,0.2);
      `;
        box.innerHTML = `
        <h3>Create New Customer</h3>
        <label>Name<br/><input id="modal-name" value="${defaultName}" style="width:100%"/></label><br/>
        <label>Address<br/><input id="modal-address" style="width:100%"/></label><br/>
        <label>Reg No.<br/><input id="modal-reg" style="width:100%"/></label><br/><br/>
        <button id="modal-ok">OK</button>
        <button id="modal-cancel">Cancel</button>
      `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        box.querySelector("#modal-ok").onclick = () => {
          const name = box.querySelector("#modal-name").value.trim();
          const address = box.querySelector("#modal-address").value.trim();
          const reg = box.querySelector("#modal-reg").value.trim();
          resolve({ name, address, registration_number: reg });
          document.body.removeChild(overlay);
        };
        box.querySelector("#modal-cancel").onclick = () => {
          resolve(null);
          document.body.removeChild(overlay);
        };
      });
    }

    // handle clicks on search results
    resultList.addEventListener("click", async (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      if (li.dataset.id) {
        // existing
        const c = await window.customerAPI.getById(Number(li.dataset.id));
        custIn.value = c.name;
        addrIn.value = c.address || "";
        regIn.value = c.registration_number || "";
      } else if (li.dataset.new) {
        // create new inline
        const defaultName = custIn.value.trim();
        const data = await showCustomerModal(defaultName);
        if (data && data.name) {
          const c = await window.customerAPI.create(data);
          custIn.value = c.name;
          addrIn.value = c.address;
          regIn.value = c.registration_number;
        }
      }
      resultList.innerHTML = "";
    });

    function showProductModal(defaultName = "") {
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.style = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000;
      `;
        const box = document.createElement("div");
        box.style = `
        background: white; padding: 20px; border-radius: 8px;
        width: 300px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;
        box.innerHTML = `
        <h3>Create New Product</h3>
        <label>Name<br/>
          <input id="modal-pname" value="${defaultName}" style="width:100%"/>
        </label><br/>
        <label>Default Price<br/>
          <input id="modal-pprice" type="number" step="0.01" style="width:100%"/>
        </label><br/><br/>
        <button id="modal-ok">OK</button>
        <button id="modal-cancel">Cancel</button>
      `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        box.querySelector("#modal-ok").onclick = () => {
          const name = box.querySelector("#modal-pname").value.trim();
          const price = parseFloat(box.querySelector("#modal-pprice").value);
          resolve({ name, default_price: price });
          document.body.removeChild(overlay);
        };
        box.querySelector("#modal-cancel").onclick = () => {
          resolve(null);
          document.body.removeChild(overlay);
        };
      });
    }

    // ─── Items & Totals ────────────────────────────────────────
    function attachLabelClick(row, selector, dataName, dataPctName, labelText) {
      const span = row.querySelector(selector);
      span.style.cursor = "pointer";
      span.onclick = () => {
        const name = row.dataset[dataName] || "(none)";
        const pct = row.dataset[dataPctName] || "(none)";
        alert(`${labelText}\nName: ${name}\nPercent: ${pct}%`);
      };
    }

    function clampInputs(row) {
      row.querySelectorAll("input[type=number]").forEach((input) => {
        input.min = 0;
        input.addEventListener("input", () => {
          if (parseFloat(input.value) < 0 || isNaN(input.value)) {
            input.value = 0;
          }
          updateRow(row);
        });
      });
    }

    addItemBtn.onclick = () => addItemRow();
    generateBtn.onclick = () => {
      const invoiceData = collectInvoiceData();
      window.electronAPI.generatePDF(invoiceData);
    };

    // first row
    addItemRow();

    function addItemRow() {
      const row = document.createElement("div");
      row.classList.add("invoice-item");
      row.innerHTML = `
      <div class="item-cell">
        <input class="item-name" placeholder="Item Name"/>
      </div>
      <div class="item-cell">
        <input class="qty" type="number" value="1" min="0"/>
      </div>
      <div class="item-cell">
        <input class="rate" type="number" placeholder="Rate" min="0"/>
      </div>
      <div class="item-cell">
        <input class="discount" type="number" value="0" min="0"/>
      </div>
      <div class="item-cell">
        <input class="tax" type="number" value="0" min="0"/>
      </div>
      <div class="item-cell">
        <input type="checkbox" class="extra-tax-checkbox"/>
      </div>
      <div class="item-cell">
        <input type="checkbox" class="further-tax-checkbox"/>
      </div>
      <div class="item-cell"><span class="price-excl">$0.00</span></div>
      <div class="item-cell"><span class="tax-amt">$0.00</span></div>
      <div class="item-cell"><span class="total-price">$0.00</span></div>
      <div class="item-cell"><button class="delete-btn">❌</button></div>
    `;
      itemsContainer.appendChild(row);

      // 1) Clamp negatives
      clampInputs(row);

      // 2) Product autocomplete
      const nameIn = row.querySelector(".item-name");
      const rateIn = row.querySelector(".rate");
      const prodList = document.createElement("ul");
      prodList.classList.add("search-list");
      nameIn.parentNode.insertBefore(prodList, nameIn.nextSibling);

      let lastPQ = "";
      nameIn.addEventListener("input", async () => {
        const q = nameIn.value.trim();
        if (!q) {
          prodList.innerHTML = "";
          return;
        }
        if (q === lastPQ) return;
        lastPQ = q;
        const hits = await window.productAPI.search(q);
        prodList.innerHTML =
          hits
            .map(
              (p) =>
                `<li data-id="${p.id}" data-price="${p.default_price}">${p.name}</li>`
            )
            .join("") + `<li data-new="true">➕ Create new product “${q}”</li>`;
      });

      prodList.addEventListener("click", async (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        if (li.dataset.id) {
          // existing product
          nameIn.value = li.textContent;
          rateIn.value = Number(li.dataset.price).toFixed(2);
          updateRow(row);
        } else if (li.dataset.new) {
          // new product modal
          const defaultName = nameIn.value.trim();
          const data = await showProductModal(defaultName);
          if (data && data.name) {
            const p = await window.productAPI.create(data);
            nameIn.value = p.name;
            rateIn.value = Number(p.default_price).toFixed(2);
            updateRow(row);
          }
        }
        prodList.innerHTML = "";
      });

      // 3) Other inputs recalc
      ["qty", "discount", "tax"].forEach((cls) => {
        row
          .querySelector(`.${cls}`)
          .addEventListener("input", () => updateRow(row));
      });

      // 4) Delete
      row.querySelector(".delete-btn").addEventListener("click", () => {
        row.remove();
        updateSummary();
      });

      // 5) Extra/Further tax toggles
      row
        .querySelector(".extra-tax-checkbox")
        .addEventListener("change", async (e) => {
          if (e.target.checked) {
            const res = await showInputModal("Extra Tax Details");
            if (res?.name && res?.pct) {
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

      row
        .querySelector(".further-tax-checkbox")
        .addEventListener("change", async (e) => {
          if (e.target.checked) {
            const res = await showInputModal("Further Tax Details");
            if (res?.name && res?.pct) {
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

      // 6) Initial calc
      updateRow(row);
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

  async function initCustomerLogic() {
    const searchInput = document.getElementById("customer-search");
    const resultsList = document.getElementById("search-results");
    const tableBody = document.querySelector("#customers-table tbody");
    const newBtn = document.getElementById("new-customer-btn");

    // 1️⃣ Load & render all customers
    async function loadAll() {
      const customers = await window.customerAPI.getAll();
      tableBody.innerHTML = customers
        .map(
          (c) => `
        <tr data-id="${c.id}">
          <td>${c.name}</td>
          <td>${c.address || ""}</td>
          <td>${c.registration_number || ""}</td>
        </tr>`
        )
        .join("");
    }
    await loadAll();

    // 2️⃣ Click on row → go to detail view
    tableBody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;
      const id = tr.dataset.id;
      loadView(`customer-detail?id=${id}`);
    });

    // 3️⃣ Search-as-you-type
    let lastQ = "";
    searchInput.addEventListener("input", async () => {
      const q = searchInput.value.trim();
      if (!q) {
        resultsList.innerHTML = "";
        return;
      }
      if (q === lastQ) return;
      lastQ = q;

      const hits = await window.customerAPI.search(q);
      resultsList.innerHTML = hits
        .map((c) => `<li data-id="${c.id}">${c.name}</li>`)
        .join("");
    });

    // Click on search result → detail
    resultsList.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      loadView(`customer-detail?id=${li.dataset.id}`);
    });

    // 4️⃣ New customer button
    newBtn.onclick = () => loadView("customer-detail");
    // (we’ll treat no `?id` as “create new” in the detail page)
  }

  async function initCustomerDetailLogic(id) {
    const titleEl = document.getElementById("detail-title");
    const form = document.getElementById("customer-form");
    const nameIn = document.getElementById("cust-name");
    const addrIn = document.getElementById("cust-address");
    const regIn = document.getElementById("cust-reg");
    const saveBtn = document.getElementById("save-customer-btn");
    const cancelBtn = document.getElementById("cancel-customer-btn");

    let isNew = !id;

    if (isNew) {
      titleEl.textContent = "Create New Customer";
    } else {
      titleEl.textContent = "Edit Customer";
      // load existing data
      const cust = await window.customerAPI.getById(Number(id));
      nameIn.value = cust.name || "";
      addrIn.value = cust.address || "";
      regIn.value = cust.registration_number || "";
    }

    // Cancel → back to list
    cancelBtn.onclick = () => loadView("customers");

    // Save (create or update)
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        name: nameIn.value.trim(),
        address: addrIn.value.trim(),
        registration_number: regIn.value.trim(),
      };

      if (isNew) {
        await window.customerAPI.create(data);
      } else {
        await window.customerAPI.update(Number(id), data);
      }

      // after save, go back to list and refresh
      await loadView("customers");
    };
  }

  // — List & Search Products —
  async function initProductLogic() {
    const searchInput = document.getElementById("product-search");
    const resultsList = document.getElementById("search-results");
    const tableBody = document.querySelector("#products-table tbody");
    const newBtn = document.getElementById("new-product-btn");

    // Load all products
    async function loadAll() {
      const products = await window.productAPI.getAll();
      tableBody.innerHTML = products
        .map(
          (p) => `
        <tr data-id="${p.id}">
          <td>${p.name}</td>
          <td>${Number(p.default_price).toFixed(2)}</td>
          <td>${new Date(p.created_at).toLocaleDateString()}</td>
        </tr>`
        )
        .join("");
    }
    await loadAll();

    // click row → detail
    tableBody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;
      loadView(`product-detail?id=${tr.dataset.id}`);
    });

    // search-as-you-type
    let lastQ = "";
    searchInput.addEventListener("input", async () => {
      const q = searchInput.value.trim();
      if (!q) {
        resultsList.innerHTML = "";
        return;
      }
      if (q === lastQ) return;
      lastQ = q;
      const hits = await window.productAPI.search(q);
      resultsList.innerHTML = hits
        .map((p) => `<li data-id="${p.id}">${p.name}</li>`)
        .join("");
    });
    resultsList.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      loadView(`product-detail?id=${li.dataset.id}`);
    });

    // New Product
    newBtn.onclick = () => loadView("product-detail");
  }

  // — Create/Edit Product —
  async function initProductDetailLogic(id) {
    const titleEl = document.getElementById("detail-title");
    const form = document.getElementById("product-form");
    const nameIn = document.getElementById("prd-name");
    const priceIn = document.getElementById("prd-price");
    const saveBtn = document.getElementById("save-product-btn");
    const cancelBtn = document.getElementById("cancel-product-btn");
    const isNew = !id;

    titleEl.textContent = isNew ? "Create New Product" : "Edit Product";

    if (!isNew) {
      const p = await window.productAPI.getById(Number(id));
      nameIn.value = p.name;
      priceIn.value = Number(p.default_price).toFixed(2);
    }

    cancelBtn.onclick = () => loadView("products");

    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        name: nameIn.value.trim(),
        default_price: parseFloat(priceIn.value),
      };
      if (isNew) {
        await window.productAPI.create(data);
      } else {
        await window.productAPI.update(Number(id), data);
      }
      await loadView("products");
    };
  }
});
