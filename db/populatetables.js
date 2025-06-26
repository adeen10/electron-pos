const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ---------------------
// DB Client Generator
// ---------------------
function getClient() {
  return new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
  });
}

// ---------------------
// Random Generators
// ---------------------
const randomName = () => {
  const firstNames = ['Ali', 'Sara', 'Hassan', 'Zara', 'Umar', 'Ayesha', 'Bilal', 'Noor', 'Hamza', 'Mina'];
  const lastNames = ['Ahmed', 'Khan', 'Raza', 'Iqbal', 'Malik', 'Farooq', 'Chaudhry', 'Javed', 'Ansari', 'Mirza'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
};

const randomAddress = () => {
  const streets = ['Main St', 'Canal Rd', 'Ferozepur Rd', 'Defence Ave', 'Gulberg Blvd'];
  return `${Math.floor(Math.random() * 500)} ${streets[Math.floor(Math.random() * streets.length)]}, Lahore`;
};

const randomRegNum = (i) => `CUST-${(1000 + i).toString()}`;

// ---------------------
// Customers Seeder
// ---------------------
async function seedCustomers() {
  const client = getClient();
  try {
    await client.connect();
    for (let i = 0; i < 15; i++) {
      const name = randomName();
      const address = randomAddress();
      const regNum = randomRegNum(i);
      await client.query(
        `INSERT INTO customers (name, address, registration_number)
         VALUES ($1, $2, $3)`,
        [name, address, regNum]
      );
    }
    console.log('✅ Seeded 15 customers');
  } catch (err) {
    console.error('❌ Error seeding customers:', err.message);
  } finally {
    await client.end();
  }
}

// ---------------------
// Products Seeder
// ---------------------
const productNames = [
  'T-shirt', 'Jeans', 'Cap', 'Socks', 'Shoes',
  'Jacket', 'Hoodie', 'Scarf', 'Gloves', 'Watch',
  'Backpack', 'Wallet', 'Belt', 'Sunglasses', 'Perfume'
];

const randomPrice = () => (Math.random() * (5000 - 200) + 200).toFixed(2); // 200 to 5000

async function seedProducts() {
  const client = getClient();
  try {
    await client.connect();
    for (let i = 0; i < productNames.length; i++) {
      const name = productNames[i];
      const price = randomPrice();
      await client.query(
        `INSERT INTO products (name, default_price)
         VALUES ($1, $2)`,
        [name, price]
      );
    }
    console.log('✅ Seeded 15 products');
  } catch (err) {
    console.error('❌ Error seeding products:', err.message);
  } finally {
    await client.end();
  }
}

// ---------------------
// Run Both Seeders
// ---------------------
async function populate_tables() {
  await seedCustomers();
  await seedProducts();
}

populate_tables();
