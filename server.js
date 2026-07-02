const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const dbFile = path.join(dataDir, 'db.json');
const port = Number(process.env.PORT || 3000);
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'swadeshi123';
const sessions = new Map();

async function ensureDataFile() {
  try {
    await fs.access(dbFile);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dbFile, JSON.stringify({ products: [], orders: [], customers: [] }, null, 2), 'utf8');
  }
}

async function readDb() {
  await ensureDataFile();
  const raw = await fs.readFile(dbFile, 'utf8');
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbFile, JSON.stringify(db, null, 2), 'utf8');
}

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
  res.setHeader('Set-Cookie', `swadeshi_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'swadeshi_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

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
  return {
    id: String(input.id || `ORD-${Date.now()}`),
    customer: String(input.customer || 'Customer'),
    locality: String(input.locality || ''),
    items: Number(input.items || 0),
    amount: Number(input.amount || 0),
    status: String(input.status || 'Pending')
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

function updateProductList(products, incoming) {
  const normalized = normalizeProduct(incoming);
  const index = products.findIndex((product) => product.id === normalized.id);
  if (index >= 0) {
    products[index] = normalized;
  } else {
    products.unshift(normalized);
  }
  return normalized;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

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

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;

  try {
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
      if (cookies.swadeshi_admin_session) {
        sessions.delete(cookies.swadeshi_admin_session);
      }
      clearSessionCookie(res);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/bootstrap' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const db = await readDb();
      return sendJson(res, 200, db);
    }

    if (pathname === '/api/products' && req.method === 'GET') {
      const db = await readDb();
      return sendJson(res, 200, db.products || []);
    }

    if (pathname === '/api/products/bulk' && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      if (!Array.isArray(body.products)) {
        return sendJson(res, 400, { error: 'products array is required' });
      }
      const db = await readDb();
      db.products = body.products.map(normalizeProduct);
      await writeDb(db);
      return sendJson(res, 200, { ok: true, products: db.products });
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const db = await readDb();
      const normalized = updateProductList(db.products || [], body);
      db.products = db.products || [];
      const existingIndex = db.products.findIndex((product) => product.id === normalized.id);
      if (existingIndex >= 0) db.products[existingIndex] = normalized;
      else db.products.unshift(normalized);
      await writeDb(db);
      return sendJson(res, 200, { ok: true, product: normalized });
    }

    if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const id = decodeURIComponent(pathname.split('/').pop());
      const body = await readBody(req);
      const db = await readDb();
      const product = normalizeProduct({ ...body, id });
      db.products = db.products || [];
      const index = db.products.findIndex((item) => item.id === id);
      if (index === -1) {
        db.products.unshift(product);
      } else {
        db.products[index] = product;
      }
      await writeDb(db);
      return sendJson(res, 200, { ok: true, product });
    }

    if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = decodeURIComponent(pathname.split('/').pop());
      const db = await readDb();
      db.products = (db.products || []).filter((product) => product.id !== id);
      await writeDb(db);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const db = await readDb();
      return sendJson(res, 200, db.orders || []);
    }

    if (pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const id = decodeURIComponent(pathname.split('/').pop());
      const body = await readBody(req);
      const db = await readDb();
      db.orders = (db.orders || []).map((order) => order.id === id ? normalizeOrder({ ...order, ...body, id }) : order);
      await writeDb(db);
      const updated = db.orders.find((order) => order.id === id) || null;
      return sendJson(res, 200, { ok: true, order: updated });
    }

    if (pathname === '/api/customers' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const db = await readDb();
      return sendJson(res, 200, db.customers || []);
    }

    if (pathname === '/admin' || pathname === '/admin.html') {
      if (!requireAdmin(req, res)) return;
      return serveStatic(req, res, '/admin.html');
    }

    if (pathname === '/login' || pathname === '/login.html') {
      return serveStatic(req, res, '/login.html');
    }

    if (pathname === '/' || pathname === '/index.html' || pathname.startsWith('/images/')) {
      return serveStatic(req, res, pathname);
    }

    return serveStatic(req, res, pathname);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
});

server.listen(port, () => {
  console.log(`Swadeshi server running at http://localhost:${port}`);
});
