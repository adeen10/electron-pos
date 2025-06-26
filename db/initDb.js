const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });


const client = new Client({
  user: process.env.DB_USER,
  host:process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initDB() {
  try {
    await client.connect();

    // Users table – to store sellers
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        address TEXT,
        registration_number TEXT
      );
    `);

    // Customers table – recipient info
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        registration_number TEXT
      );
    `);

    // Products table – static catalog of available items
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        default_price NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        seller_id INT REFERENCES users(id),
        customer_id INT REFERENCES customers(id),
        issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tax_period TEXT
      );
    `);

    // Invoice items – flexible per-product entries
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INT REFERENCES invoices(id),
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price NUMERIC NOT NULL,
        discount_pct NUMERIC DEFAULT 0,
        tax_pct NUMERIC DEFAULT 0,
        extra_tax JSONB DEFAULT '[]',
        further_tax JSONB DEFAULT '[]'
      );
    `);

    console.log('✅ PostgreSQL tables created successfully.');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  } finally {
    await client.end();
  }
}

initDB();
