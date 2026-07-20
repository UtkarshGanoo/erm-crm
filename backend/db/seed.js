// Seeds an initial admin user + a couple of demo records so the app is usable immediately.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function seed() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    const users = [
      ['Admin User', 'admin@erp.com', passwordHash, 'admin'],
      ['Sales User', 'sales@erp.com', passwordHash, 'sales'],
      ['Warehouse User', 'warehouse@erp.com', passwordHash, 'warehouse'],
      ['Accounts User', 'accounts@erp.com', passwordHash, 'accounts'],
    ];

    for (const [name, email, hash, role] of users) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO NOTHING`,
        [name, email, hash, role]
      );
    }

    console.log('Seeded users. Default password for all: Admin@123');
    console.log('Logins: admin@erp.com | sales@erp.com | warehouse@erp.com | accounts@erp.com');
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
