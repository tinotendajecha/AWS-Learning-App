const { createClient } = require('@libsql/client');

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let dbClient = null;
let initialized = false;

function getClient() {
  if (!dbUrl || !authToken) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  }
  if (!dbClient) {
    dbClient = createClient({
      url: dbUrl,
      authToken
    });
  }
  return dbClient;
}

async function ensureSchema() {
  if (initialized) return;
  const client = getClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )
  `);
  initialized = true;
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return {};
    }
  }
  return req.body;
}

function normalizeEmail(emailValue) {
  const email = String(emailValue || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Method not allowed' });
    }

    const payload = parseBody(req);
    const email = normalizeEmail(payload.email);
    const fullName = String(payload.fullName || '').trim();
    if (!email) {
      return json(res, 400, { error: 'valid email is required' });
    }
    if (!fullName) {
      return json(res, 400, { error: 'full name is required' });
    }
    if (!email.endsWith('@ctucareer.co.za')) {
      return json(res, 400, { error: 'email must be a CTU student email (@ctucareer.co.za)' });
    }

    const client = getClient();
    const now = new Date().toISOString();

    await client.execute({
      sql: `
        INSERT INTO app_users (email, full_name, created_at, last_seen_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          last_seen_at = excluded.last_seen_at
      `,
      args: [email, fullName, now, now]
    });

    const result = await client.execute({
      sql: 'SELECT id, email, full_name, created_at, last_seen_at FROM app_users WHERE email = ? LIMIT 1',
      args: [email]
    });

    if (!result.rows.length) {
      return json(res, 500, { error: 'Failed to persist user' });
    }

    const user = result.rows[0];
    return json(res, 200, {
      ok: true,
      user: {
        id: Number(user.id),
        email: String(user.email),
        fullName: String(user.full_name),
        createdAt: String(user.created_at),
        lastSeenAt: String(user.last_seen_at)
      }
    });
  } catch (error) {
    return json(res, 500, {
      error: 'API request failed',
      detail: error.message
    });
  }
};

