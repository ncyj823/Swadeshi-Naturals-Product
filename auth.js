// auth.js - Customer authentication utilities
// Uses bcrypt for password hashing and jsonwebtoken for JWT handling.
// Ensure "bcrypt" and "jsonwebtoken" are installed (added to package.json).

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

// Secret for JWT signing – use env var for production.
const JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || 'swap_this_secret';
// Token expiration (e.g., 10 minutes as requested)
const JWT_EXPIRES_IN = '10m';

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
 * Create a signed JWT for a given customer ID.
 */
function createCustomerToken(customerId) {
  return jwt.sign({ customerId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Middleware helper – verify JWT from cookie.
 * Returns the decoded payload or null.
 */
function verifyCustomerToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createCustomerToken,
  verifyCustomerToken,
};
