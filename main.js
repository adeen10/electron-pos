const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./db/client");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  // ✅ Only load pdf_generator.js after app is ready
  require(path.join(__dirname, "services", "pdf_generator.js"));

  createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("auth:signup", async (_e, user, pass) => {
  try {
    const hash = crypto.createHash("sha256").update(pass).digest("hex");
    const res = await db.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
      [user, hash]
    );
    return {
      success: true,
      message: "Signup successful",
      userId: res.rows[0].id,
    };
  } catch (err) {
    if (err.code === "23505")
      return { success: false, message: "User already exists" }; // UNIQUE violation
    return { success: false, message: "Signup failed: " + err.message };
  }
});

ipcMain.handle("auth:login", async (_e, user, pass) => {
  const hash = crypto.createHash("sha256").update(pass).digest("hex");
  const result = await db.query(
    "SELECT * FROM users WHERE username=$1 AND password_hash=$2",
    [user, hash]
  );

  if (result.rowCount === 1) {
    return { success: true, message: "Login successful", user: result.rows[0] };
  } else {
    return { success: false, message: "Invalid credentials" };
  }
});

ipcMain.handle("auth:completeProfile", async (_e, user, addr, reg) => {
  const result = await db.query(
    "UPDATE users SET address=$1, registration_number=$2 WHERE username=$3 RETURNING id",
    [addr, reg, user]
  );

  if (result.rowCount === 1) {
    return { success: true, message: "Profile saved" };
  } else {
    return { success: false, message: "User not found" };
  }
});

// main.js (after you import your `db` client)
ipcMain.handle("db:get-customers", async () => {
  const { rows } = await db.query("SELECT * FROM customers ORDER BY name");
  return rows;
});
ipcMain.handle("db:search-customers", async (_e, q) => {
  const { rows } = await db.query(
    `SELECT * FROM customers WHERE name ILIKE $1 ORDER BY name LIMIT 10`,
    [`%${q}%`]
  );
  return rows;
});
ipcMain.handle("db:get-customer-by-id", async (_e, id) => {
  const { rows } = await db.query("SELECT * FROM customers WHERE id = $1", [
    id,
  ]);
  return rows[0];
});
ipcMain.handle("db:create-customer", async (_e, data) => {
  const { name, address, registration_number } = data;
  const { rows } = await db.query(
    `INSERT INTO customers (name,address,registration_number)
     VALUES ($1,$2,$3) RETURNING *`,
    [name, address, registration_number]
  );
  return rows[0];
});
ipcMain.handle("db:update-customer", async (_e, id, data) => {
  const { name, address, registration_number } = data;
  const { rows } = await db.query(
    `UPDATE customers SET name=$1,address=$2,registration_number=$3
     WHERE id=$4 RETURNING *`,
    [name, address, registration_number, id]
  );
  return rows[0];
});

// — PRODUCTS CRUD —
ipcMain.handle("db:get-products", async () => {
  const { rows } = await db.query("SELECT * FROM products ORDER BY name");
  return rows;
});
ipcMain.handle("db:search-products", async (_e, q) => {
  const { rows } = await db.query(
    `SELECT * FROM products
       WHERE name ILIKE $1
       ORDER BY name
       LIMIT 10`,
    [`%${q}%`]
  );
  return rows;
});
ipcMain.handle("db:get-product-by-id", async (_e, id) => {
  const { rows } = await db.query("SELECT * FROM products WHERE id=$1", [id]);
  return rows[0];
});
ipcMain.handle("db:create-product", async (_e, data) => {
  const { name, default_price } = data;
  const { rows } = await db.query(
    `INSERT INTO products (name, default_price)
     VALUES ($1,$2) RETURNING *`,
    [name, default_price]
  );
  return rows[0];
});
ipcMain.handle("db:update-product", async (_e, id, data) => {
  const { name, default_price } = data;
  const { rows } = await db.query(
    `UPDATE products
       SET name=$1, default_price=$2
       WHERE id=$3
       RETURNING *`,
    [name, default_price, id]
  );
  return rows[0];
});
