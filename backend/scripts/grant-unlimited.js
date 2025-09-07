#!/usr/bin/env node
// Dev helper: mark a user as paid via the same backend API the app uses.
// Usage:
//   node backend/scripts/grant-unlimited.js <USER_UUID> [BACKEND_URL]
// Env:
//   Reads SUPABASE_JWT_SECRET from backend/.env to sign a short-lived JWT.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend env (same as server)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const [, , userId, backendUrlArg] = process.argv;
if (!userId) {
  console.error('Usage: node backend/scripts/grant-unlimited.js <USER_UUID> [BACKEND_URL]');
  process.exit(1);
}

const BACKEND_URL = backendUrlArg || process.env.BACKEND_URL || 'http://localhost:8000';
const SECRET = process.env.SUPABASE_JWT_SECRET;
if (!SECRET) {
  console.error('SUPABASE_JWT_SECRET missing in backend/.env');
  process.exit(1);
}

// Create a short-lived JWT compatible with authenticateUser middleware
const token = jwt.sign(
  {
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    email: 'dev+grant@example.com'
  },
  SECRET,
  { expiresIn: '5m' }
);

const url = `${BACKEND_URL}/api/account/grantUnlimited`;

async function main() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Grant failed:', body);
    process.exit(2);
  }
  console.log('Grant succeeded:', body);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(3);
});

