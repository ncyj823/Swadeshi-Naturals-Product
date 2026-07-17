const http = require('http');
const helmet = require('helmet'); // security headers
const fs = require('fs/promises'); // still needed: serveStatic() reads html/css/images from disk
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');
const pool = require('./db');
const razorpay = require("./razorpay");

// Customer authentication utilities
const { hashPassword, verifyPassword, createCustomerToken, verifyCustomerToken } = require('./auth');

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'Swadeshi@2026';
const sessions = new Map();


// ---------------------------------------------------------------------------
// Security headers (Helmet) – adds CSP, HSTS, etc.
app.use((req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy – only allow scripts/styles from self and trusted CDNs
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com");
  next();
});
// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
  res.end(text);
}

function parseCookies(header) {
  const cookies = {};
  String(header || '').split(';').forEach((pair) => {
    const index = pair.indexOf('=');
    if (index === -1) return;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function createSession(username) {
  const token = crypto.randomUUID();
  sessions.set(token, { username, createdAt: Date.now() });
  return token;
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.swadeshi_admin_session;
  if (!token) return null;
  return sessions.get(token) || null;
}

function requireAdmin(req, res) {
  if (getSession(req)) return true;
  res.writeHead(302, { Location: '/login.html' });
  res.end();
  return false;
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `swadeshi_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'swadeshi_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

// Customer cookie helpers
function setCustomerCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `customer_jwt=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict`
  );
}

function clearCustomerCookie(res) {
  res.setHeader('Set-Cookie', 'customer_jwt=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
}

// Middleware: verify customer JWT on each request
function requireCustomer(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.customer_jwt;
  if (!token) {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
    return false;
  }
  try {
    const payload = verifyCustomerToken(token);
    req.customerId = payload.customerId || payload.id;
    return true;
  } catch (e) {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
    return false;
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

// ---------------------------------------------------------------------------
// normalization (unchanged in shape from the JSON version, still the single
// source of truth for what a "clean" product/order/customer object looks like)
// ---------------------------------------------------------------------------

function normalizeImages(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProduct(input) {
  const images = normalizeImages(input.images || input.image || input.image_url || '');
  const name = String(input.name || input.title || 'Product').trim();
  const category = String(input.cat || input.category || input.catLabel || 'cosmetic').trim();
  return {
    id: String(input.id || `SWD-${Date.now()}`),
    name,
    title: String(input.title || name),
    cat: category,
    catLabel: String(input.catLabel || input.category || category),
    telugu: String(input.telugu || input.subtitle || input.pack || 'Standard pack'),
    price: Number(input.price || 0),
    oldPrice: Number(input.oldPrice || input.old_price || 0),
    discount: Number(input.discount || 0),
    stock: Number(input.stock || 0),
    rating: Number(input.rating || 4.5),
    seller: String(input.seller || 'Swadeshi Natural Products'),
    delivery: String(input.delivery || 'Delivery in 2-4 days'),
    description: String(input.description || ''),
    image: String(input.image || input.image_url || images[0] || ''),
    images,
    color: String(input.color || '#8a9a52'),
    initials: String(input.initials || ''),
    featured: input.featured !== false,
    active: input.active !== false
  };
}

function normalizeOrder(input) {
  const itemDetails = Array.isArray(input.itemDetails) ? input.itemDetails : [];
  const address = String(input.address || input.locality || '');
  return {
    id: String(input.id || `SWD-${Date.now().toString().slice(-6)}`),
    customer: String(input.customer || input.customer_name || input.name || 'Customer'),
    customerPhone: String(input.customerPhone || input.customer_phone || input.phone || ''),
    customerEmail: String(input.customerEmail || input.customer_email || input.email || ''),
    locality: String(input.locality || address.split(',')[0] || ''),
    address,
    notes: String(input.notes || ''),
    items: Number(input.items || itemDetails.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0),
    itemDetails,
    amount: Number(input.amount || input.total_price || input.total || 0),
    paymentStatus: String(input.paymentStatus || 'Completed'),
    status: String(input.status || 'Paid'),
    createdAt: String(input.createdAt || new Date().toISOString())
  };
}

function publicOrder(order) {
  return {
    id: order.id,
    customer: order.customer,
    customerPhone: order.customerPhone,
    locality: order.locality,
    address: order.address,
    items: order.items,
    itemDetails: order.itemDetails || [],
    amount: order.amount,
    paymentStatus: order.paymentStatus || 'Completed',
    status: order.status || 'Paid',
    createdAt: order.createdAt || ''
  };
}

function normalizeCustomer(input) {
  return {
    name: String(input.name || 'Customer'),
    loc: String(input.loc || ''),
    orders: Number(input.orders || 0),
    spend: Number(input.spend || 0),
    since: String(input.since || '')
  };
}

// ---------------------------------------------------------------------------
// row <-> API-shape mappers (Postgres uses snake_case columns; the frontend
// contract uses camelCase — these are the only new pieces vs. the JSON version)
// ---------------------------------------------------------------------------

function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    cat: row.cat,
    catLabel: row.cat_label,
    telugu: row.telugu,
    price: Number(row.price),
    oldPrice: Number(row.old_price),
    discount: Number(row.discount),
    stock: row.stock,
    rating: Number(row.rating),
    seller: row.seller,
    delivery: row.delivery,
    description: row.description,
    image: row.image,
    images: row.images || [],
    color: row.color,
    initials: row.initials,
    featured: row.featured,
    active: row.active
  };
}

function rowToOrder(row) {
  return {
    id: row.id,
    customer: row.customer,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    locality: row.locality,
    address: row.address,
    notes: row.notes,
    items: row.items,
    itemDetails: row.item_details || [],
    amount: Number(row.amount),
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function rowToCustomer(row) {
  return {
    name: row.name,
    loc: row.loc,
    orders: row.orders,
    spend: Number(row.spend),
    since: row.since
  };
}

// ---------------------------------------------------------------------------
// data-access functions — every JSON readDb()/writeDb() call site becomes one
// of these
// ---------------------------------------------------------------------------

async function fetchAllProducts() {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
  return rows.map(rowToProduct);
}

async function fetchAllOrders() {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  return rows.map(rowToOrder);
}

async function fetchAllCustomers() {
  const { rows } = await pool.query('SELECT * FROM customers ORDER BY name ASC');
  return rows.map(rowToCustomer);
}

async function upsertProduct(product) {
  const { rows } = await pool.query(
    `INSERT INTO products
       (id, name, title, cat, cat_label, telugu, price, old_price, discount,
        stock, rating, seller, delivery, description, image, images, color,
        initials, featured, active, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, title = EXCLUDED.title, cat = EXCLUDED.cat,
       cat_label = EXCLUDED.cat_label, telugu = EXCLUDED.telugu, price = EXCLUDED.price,
       old_price = EXCLUDED.old_price, discount = EXCLUDED.discount, stock = EXCLUDED.stock,
       rating = EXCLUDED.rating, seller = EXCLUDED.seller, delivery = EXCLUDED.delivery,
       description = EXCLUDED.description, image = EXCLUDED.image, images = EXCLUDED.images,
       color = EXCLUDED.color, initials = EXCLUDED.initials, featured = EXCLUDED.featured,
       active = EXCLUDED.active, updated_at = now()
     RETURNING *`,
    [
      product.id, product.name, product.title, product.cat, product.catLabel,
      product.telugu, product.price, product.oldPrice, product.discount,
      product.stock, product.rating, product.seller, product.delivery,
      product.description, product.image, JSON.stringify(product.images),
      product.color, product.initials, product.featured, product.active
    ]
  );
  return rowToProduct(rows[0]);
}

async function replaceAllProducts(productList) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM products');
    for (const product of productList) {
      await client.query(
        `INSERT INTO products
           (id, name, title, cat, cat_label, telugu, price, old_price, discount,
            stock, rating, seller, delivery, description, image, images, color,
            initials, featured, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          product.id, product.name, product.title, product.cat, product.catLabel,
          product.telugu, product.price, product.oldPrice, product.discount,
          product.stock, product.rating, product.seller, product.delivery,
          product.description, product.image, JSON.stringify(product.images),
          product.color, product.initials, product.featured, product.active
        ]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteProduct(id) {
  await pool.query('DELETE FROM products WHERE id = $1', [id]);
}

async function insertOrder(order) {
  const { rows } = await pool.query(
    `INSERT INTO orders
       (id, customer, customer_phone, customer_email, locality, address, notes,
        items, item_details, amount, payment_status, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      order.id, order.customer, order.customerPhone, order.customerEmail,
      order.locality, order.address, order.notes, order.items,
      JSON.stringify(order.itemDetails), order.amount, order.paymentStatus,
      order.status, order.createdAt
    ]
  );
  return rowToOrder(rows[0]);
}

async function updateOrder(id, mergedOrder) {
  const { rows } = await pool.query(
    `UPDATE orders SET
       customer = $2, customer_phone = $3, customer_email = $4, locality = $5,
       address = $6, notes = $7, items = $8, item_details = $9, amount = $10,
       payment_status = $11, status = $12
     WHERE id = $1
     RETURNING *`,
    [
      id, mergedOrder.customer, mergedOrder.customerPhone, mergedOrder.customerEmail,
      mergedOrder.locality, mergedOrder.address, mergedOrder.notes, mergedOrder.items,
      JSON.stringify(mergedOrder.itemDetails), mergedOrder.amount,
      mergedOrder.paymentStatus, mergedOrder.status
    ]
  );
  return rows[0] ? rowToOrder(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// static file serving (unchanged — nothing to do with the database)
// ---------------------------------------------------------------------------

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

async function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(rootDir, safePath));
  if (!filePath.startsWith(rootDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    let stat = await fs.stat(filePath);
    let targetPath = filePath;
    if (stat.isDirectory()) {
      targetPath = path.join(filePath, 'index.html');
      stat = await fs.stat(targetPath);
    }
    const ext = path.extname(targetPath).toLowerCase();
    const data = await fs.readFile(targetPath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

// ---------------------------------------------------------------------------
// HTTP server / routes
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;
  const allowedOrigins = [
    'https://www.swadeshinatural.com',
    'https://swadeshinatural.com'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    // ---- auth ----
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      if (String(body.username || '') === adminUsername && String(body.password || '') === adminPassword) {
        const token = createSession(adminUsername);
        setSessionCookie(res, token);
        return sendJson(res, 200, { ok: true, user: { username: adminUsername } });
      }
      return sendJson(res, 401, { error: 'Invalid username or password' });
    }

    if (pathname === '/api/logout' && req.method === 'POST') {
      const cookies = parseCookies(req.headers.cookie);
      // Admin logout – clear session and cookie
      const cookies = parseCookies(req.headers.cookie);
      if (cookies.swadeshi_admin_session) {
        sessions.delete(cookies.swadeshi_admin_session);
      }
      clearSessionCookie(res);
      return sendJson(res, 200, { ok: true });
        toggle.textContent = currentLanguage === 'hi' ? 'EN' : 'हि';
        toggle.title = currentLanguage === 'hi' ? 'Switch to English' : 'हिंदी में बदलें';
      }
      setText('.topbar', 'Free delivery on orders above ₹499 | Use code NATURAL10 for 10% off your first order');
      const searchInput = document.querySelector('.search-bar input');
      if (searchInput) searchInput.placeholder = t('Search for products...');
      setText('.search-bar button', 'Search');
      const login = document.querySelector('.header-icons a[href="login.html"]');
      // Hide admin‑only UI for non‑admin users
      const adminLink = document.querySelector('.header-icons a[href="admin.html"]');
      if (login) login.lastChild.textContent = ' ' + t('Login');
      // Decode JWT to determine role (client‑side only for UI tweaks)
      function getJwtPayload(){
        const match = document.cookie.match(/customer_jwt=([^;]+)/);
        if (!match) return null;
        try { const payload = atob(match[1].split('.')[1]); return JSON.parse(payload); } catch(e){ return null; }
      }
      const payload = getJwtPayload();
      if (payload && payload.role !== 'admin' && adminLink) adminLink.style.display = 'none';
      updateHeaderCartLabel();
      const navLabels = ['☰', 'Cosmetics', 'Pooja Items', 'Product', 'Instant Breakfast Items', 'Time Saving', 'Pickle, Jam & Chutney', 'Home Care'];
      document.querySelectorAll('nav a').forEach((el, i) => { if (navLabels[i]) el.textContent = navLabels[i] === '☰' ? '☰' : t(navLabels[i]); });
      setText('.hero-eyebrow', '100% Natural & Organic');
      const h1 = document.querySelector('.hero h1');
      if (h1) h1.innerHTML = currentLanguage === 'hi' ? 'ऑर्गेनिक वेलनेस के साथ <em>बेहतर महसूस करें</em>' : 'Feel better, live fully with <em>organic wellness</em>';
      if (cookies.swadeshi_admin_session) {
        sessions.delete(cookies.swadeshi_admin_session);
      }
      clearSessionCookie(res);
      return sendJson(res, 200, { ok: true });
    }

    // ---- bootstrap ----
    if (pathname === '/api/bootstrap' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const [products, orders, customers] = await Promise.all([
        fetchAllProducts(),
        fetchAllOrders(),
        fetchAllCustomers()
      ]);
      return sendJson(res, 200, { products, orders, customers });
    }

    // ---- products ----
    if (pathname === '/api/products' && req.method === 'GET') {
      const products = await fetchAllProducts();
      return sendJson(res, 200, products);
    }
    if (pathname === "/api/payment/create-order" && req.method === "POST") {
      console.log("STEP 1");

      try {
        const body = await readBody(req);
        console.log("STEP 2", body);

        const amount = Number(body.amount);
        console.log("STEP 3", amount);

        const order = await razorpay.orders.create({
          amount: Math.round(amount * 100),
          currency: "INR",
          receipt: "order_" + Date.now()
        });

        console.log("STEP 4", order);

        return sendJson(res, 200, order);

      } catch (err) {
        console.error("RAZORPAY ERROR:", err);

        return sendJson(res, 500, {
          error: err.message
        });
      }
    }
    if (pathname === '/api/products/bulk' && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      if (!Array.isArray(body.products)) {
        return sendJson(res, 400, { error: 'products array is required' });
      }
      const normalizedList = body.products.map(normalizeProduct);
      await replaceAllProducts(normalizedList);
      return sendJson(res, 200, { ok: true, products: normalizedList });
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const normalized = normalizeProduct(body);
      const saved = await upsertProduct(normalized);
      return sendJson(res, 200, { ok: true, product: saved });
    }

    if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const id = decodeURIComponent(pathname.split('/').pop());
      const body = await readBody(req);
      const product = normalizeProduct({ ...body, id });
      const saved = await upsertProduct(product);
      return sendJson(res, 200, { ok: true, product: saved });
    }

    if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = decodeURIComponent(pathname.split('/').pop());
      await deleteProduct(id);
      return sendJson(res, 200, { ok: true });
    }

    // ---- orders ----
    if (pathname === '/api/orders' && req.method === 'POST') {
      const body = await readBody(req);
      const order = normalizeOrder(body);
      const saved = await insertOrder(order);
      return sendJson(res, 201, { ok: true, order: publicOrder(saved) });
    }

    if (pathname === '/api/orders/track' && req.method === 'GET') {
      const query = String(requestUrl.searchParams.get('q') || '').trim().toLowerCase();
      if (!query) return sendJson(res, 400, { error: 'Order ID or phone number is required' });
      const digits = query.replace(/\D/g, '');
      // Same matching semantics as the JSON version, just run against a DB read
      // instead of an in-memory array — order volume here doesn't justify
      // pushing the fuzzy-match logic into SQL and risking behavior drift.
      const allOrders = await fetchAllOrders();
      const matches = allOrders.filter((order) => {
        const normalizedId = String(order.id || '').toLowerCase();
        const idMatch = normalizedId === query || normalizedId.includes(query.replace(/^#/, ''));
        const phoneDigits = String(order.customerPhone || '').replace(/\D/g, '');
        const phoneMatch = digits.length >= 4 && phoneDigits.endsWith(digits);
        return idMatch || phoneMatch;
      }).map(publicOrder);
      return sendJson(res, 200, { ok: true, orders: matches });
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const orders = await fetchAllOrders();
      return sendJson(res, 200, orders);
    }

    if (pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const id = decodeURIComponent(pathname.split('/').pop());
      const body = await readBody(req);
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (!rows[0]) return sendJson(res, 200, { ok: true, order: null });
      const existing = rowToOrder(rows[0]);
      const merged = normalizeOrder({ ...existing, ...body, id });
      const updated = await updateOrder(id, merged);
      return sendJson(res, 200, { ok: true, order: updated });
    }

    // ---- customers ----
    if (pathname === '/api/customers' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const customers = await fetchAllCustomers();
      return sendJson(res, 200, customers);
    }

    // ---- static / admin / login ----
    if (pathname === '/admin' || pathname === '/admin.html') {
      if (!requireAdmin(req, res)) return;
      return serveStatic(req, res, '/admin.html');
    }

    if (pathname === '/login' || pathname === '/login.html') {
      return serveStatic(req, res, '/login.html');
    }

    // ------------------- Customer Auth API -------------------
    // Register new customer
    if (pathname === '/api/register' && req.method === 'POST') {
      const body = await readBody(req);
      const { email, phone, password, name } = body;
      if (!password || !(email || phone)) {
        return sendJson(res, 400, { error: 'Password and at least email or phone required' });
      }
      // Validate password strength (min 8 chars, upper, lower, digit, special)
      const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!pwdRegex.test(password)) {
        return sendJson(res, 400, { error: 'Weak password. Must meet policy.' });
      }
      const passwordHash = await hashPassword(password);
      // Insert into DB
      const { rows } = await pool.query(
        `INSERT INTO customers (email, phone, password_hash, name) VALUES ($1,$2,$3,$4) RETURNING id, email, phone, name`,
        [email || null, phone || null, passwordHash, name || null]
      );
      const newUser = rows[0];
      const token = createCustomerToken({ customerId: newUser.id });
      setCustomerCookie(res, token);
      return sendJson(res, 201, { ok: true, user: newUser });
    }

    // Login - step 1: verify credentials and send OTP
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      const { identifier, password } = body; // identifier = email or phone
      if (!identifier || !password) {
        return sendJson(res, 400, { error: 'Identifier and password required' });
      }
      const result = await pool.query(
        `SELECT * FROM customers WHERE email = $1 OR phone = $1`,
        [identifier]
      );
      const user = result.rows[0];
      if (!user) return sendJson(res, 401, { error: 'Invalid credentials' });
      const pwdOk = await verifyPassword(password, user.password_hash);
      if (!pwdOk) return sendJson(res, 401, { error: 'Invalid credentials' });
      // generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await pool.query(`INSERT INTO otps (phone, code, expires_at) VALUES ($1,$2,$3) ON CONFLICT (phone) DO UPDATE SET code=$2, expires_at=$3`,
        [user.phone, otp, expiresAt]
      );
      console.log('OTP for', user.phone, otp); // placeholder for SMS
      return sendJson(res, 200, { ok: true, needOtp: true, userId: user.id });
    }

    // Verify OTP - step 2
    if (pathname === '/api/verify-otp' && req.method === 'POST') {
      const body = await readBody(req);
      const { userId, otp } = body;
      if (!userId || !otp) return sendJson(res, 400, { error: 'userId and otp required' });
      const otpRes = await pool.query(`SELECT * FROM otps WHERE phone = (SELECT phone FROM customers WHERE id = $1) AND code = $2 AND expires_at > now()`,
        [userId, otp]
      );
      if (otpRes.rowCount === 0) return sendJson(res, 400, { error: 'Invalid or expired OTP' });
      // OTP valid, delete it
      await pool.query(`DELETE FROM otps WHERE phone = (SELECT phone FROM customers WHERE id = $1)`, [userId]);
      const token = createCustomerToken({ customerId: userId });
      setCustomerCookie(res, token);
      return sendJson(res, 200, { ok: true });
    }

    // Customer logout
    if (pathname === '/api/customer/logout' && req.method === 'POST') {
      clearCustomerCookie(res);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/' || pathname === '/index.html' || pathname.startsWith('/images/')) {
      if (!requireCustomer(req, res)) return; // redirect handled inside requireCustomer
      return serveStatic(req, res, pathname);
    }

    // Protect any other admin static assets (e.g., CSS, JS) under /admin/*
    if (pathname.startsWith('/admin/')) {
      if (!requireAdmin(req, res)) return;
    }

    return serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
});

server.listen(port, () => {
  console.log(`Swadeshi server running at http://localhost:${port}`);
});
