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
  getGoogleTokens,
  getGoogleUser,
};
