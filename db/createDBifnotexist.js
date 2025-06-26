const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });


const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createDatabaseIfNotExists(dbName) {
  try {
    await client.connect();

    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created`);
    } else {
      console.log(`ℹ️ Database '${dbName}' already exists`);
    }
  } catch (err) {
    console.error('❌ Error creating database:', err.message);
  } finally {
    await client.end();
  }
}

createDatabaseIfNotExists('pos_system');
