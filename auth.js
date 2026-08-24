// auth.js - Customer authentication utilities
// Uses bcrypt for password hashing and jsonwebtoken for JWT handling.
// Ensure "bcrypt" and "jsonwebtoken" are installed (added to package.json).

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

// Secret for JWT signing – use env var for production.
const JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || 'swap_this_secret';
// Token expiration
const JWT_EXPIRES_IN = process.env.CUSTOMER_JWT_EXPIRES_IN || '7d';

/**
 * Fetch Google OAuth Tokens
 */
async function getGoogleTokens({ code, clientId, clientSecret, redirectUri }) {
  const url = 'https://oauth2.googleapis.com/token';
  const values = {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values).toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch Google tokens');
  }
  return response.json();
}

/**
 * Fetch Google User Profile
 */
async function getGoogleUser({ id_token, access_token }) {
  const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`, {
    headers: { Authorization: `Bearer ${id_token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch Google user');
  }
  return response.json();
}

/**
 * Hash a plaintext password.
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a plaintext password against a hash.
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Create a signed JWT for a given customer.
 * Accepts either a customer ID or an object with customer fields.
 */
function createCustomerToken(customerOrId) {
  const customerId = typeof customerOrId === 'object' && customerOrId !== null
    ? String(customerOrId.id || customerOrId.customerId || customerOrId.userId)
    : String(customerOrId);

  const payload = {
    customerId,
    userId: customerId,
    sub: customerId
  };

  if (typeof customerOrId === 'object' && customerOrId !== null) {
    if (customerOrId.email) payload.email = customerOrId.email;
    if (customerOrId.name) payload.name = customerOrId.name;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Middleware helper – verify JWT from cookie or header.
 * Returns the decoded payload or null.
 */
function verifyCustomerToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded) return null;
    const uid = String(decoded.customerId || decoded.userId || decoded.sub || decoded.id || '');
    if (!uid) return null;
    decoded.customerId = uid;
    decoded.userId = uid;
    return decoded;
  } catch (e) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createCustomerToken,
  verifyCustomerToken,
  getGoogleTokens,
  getGoogleUser,
};
