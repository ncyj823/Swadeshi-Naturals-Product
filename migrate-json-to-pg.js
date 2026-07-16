// One-time data migration: data/db.json -> Postgres (Neon)
//
// I don't have your actual db.json content, so I can't hand you a static
// migration.sql full of real INSERT statements — anything I generated there
// would be fabricated rows, not your data. This script reads your real file
// and inserts it. Run it once, from the EC2 box (or anywhere with the file
// and DATABASE_URL), then retire it.
//
// Usage:
//   DATABASE_URL="postgres://..." node migrate-json-to-pg.js ./data/db.json

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const jsonPath = process.argv[2] || path.join(__dirname, 'data', 'db.json');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL env var is required.');
    process.exit(1);
  }

  const raw = await fs.readFile(jsonPath, 'utf8');
  const db = JSON.parse(raw);
  const products = Array.isArray(db.products) ? db.products : [];
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const customers = Array.isArray(db.customers) ? db.customers : [];

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --- customers first, so orders can optionally reference them ---
    const customerIdByPhone = new Map();
    for (const c of customers) {
      const name = String(c.name || 'Customer');
      const loc = String(c.loc || '');
      const orderCount = Number(c.orders || 0);
      const spend = Number(c.spend || 0);
      const since = String(c.since || '');
      const phone = String(c.phone || '');
      const email = String(c.email || '');
      const { rows } = await client.query(
        `INSERT INTO customers (name, phone, email, loc, orders, spend, since)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [name, phone, email, loc, orderCount, spend, since]
      );
      if (phone) customerIdByPhone.set(phone, rows[0].id);
    }

    // --- products ---
    for (const p of products) {
      const images = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
      await client.query(
        `INSERT INTO products
           (id, name, title, cat, cat_label, telugu, price, old_price, discount,
            stock, rating, seller, delivery, description, image, images, color,
            initials, featured, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (id) DO NOTHING`,
        [
          String(p.id || `SWD-${Date.now()}`),
          String(p.name || p.title || 'Product'),
          String(p.title || p.name || 'Product'),
          String(p.cat || p.category || 'cosmetic'),
          String(p.catLabel || p.category || p.cat || 'cosmetic'),
          String(p.telugu || p.subtitle || p.pack || 'Standard pack'),
          Number(p.price || 0),
          Number(p.oldPrice || p.old_price || 0),
          Number(p.discount || 0),
          Number(p.stock || 0),
          Number(p.rating || 4.5),
          String(p.seller || 'Swadeshi Natural Products'),
          String(p.delivery || 'Delivery in 2-4 days'),
          String(p.description || ''),
          String(p.image || images[0] || ''),
          JSON.stringify(images),
          String(p.color || '#8a9a52'),
          String(p.initials || ''),
          p.featured !== false,
          p.active !== false
        ]
      );
    }

    // --- orders ---
    for (const o of orders) {
      const itemDetails = Array.isArray(o.itemDetails) ? o.itemDetails : [];
      const phone = String(o.customerPhone || o.phone || '');
      await client.query(
        `INSERT INTO orders
           (id, customer_id, customer, customer_phone, customer_email, locality,
            address, notes, items, item_details, amount, payment_status, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          String(o.id || `SWD-${Date.now().toString().slice(-6)}`),
          customerIdByPhone.get(phone) || null,
          String(o.customer || o.name || 'Customer'),
          phone,
          String(o.customerEmail || o.email || ''),
          String(o.locality || ''),
          String(o.address || ''),
          String(o.notes || ''),
          Number(o.items || itemDetails.reduce((s, i) => s + Number(i.quantity || 0), 0) || 0),
          JSON.stringify(itemDetails),
          Number(o.amount || o.total || 0),
          String(o.paymentStatus || 'Completed'),
          String(o.status || 'Paid'),
          o.createdAt ? new Date(o.createdAt) : new Date()
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Migrated ${customers.length} customers, ${products.length} products, ${orders.length} orders.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
