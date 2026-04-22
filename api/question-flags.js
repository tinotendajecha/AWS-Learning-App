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
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS question_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_number INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(question_number, user_id)
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

async function resolveUserId(client, email) {
  const now = new Date().toISOString();
  await client.execute({
    sql: `
      INSERT INTO app_users (email, created_at, last_seen_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        last_seen_at = excluded.last_seen_at
    `,
    args: [email, now, now]
  });

  const result = await client.execute({
    sql: 'SELECT id FROM app_users WHERE email = ? LIMIT 1',
    args: [email]
  });

  if (!result.rows.length) {
    throw new Error('Failed to resolve user record');
  }

  return Number(result.rows[0].id);
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const client = getClient();

    if (req.method === 'GET') {
      const questionNumber = Number(req.query && req.query.number);
      if (!Number.isFinite(questionNumber)) {
        return json(res, 400, { error: 'number query parameter is required' });
      }

      const email = normalizeEmail(req.query && req.query.email);

      const countResult = await client.execute({
        sql: 'SELECT COUNT(*) AS flag_count FROM question_flags WHERE question_number = ?',
        args: [questionNumber]
      });
      const flagCount = Number(countResult.rows[0] && countResult.rows[0].flag_count) || 0;

      let flaggedByCurrentUser = false;
      if (email) {
        const userId = await resolveUserId(client, email);
        const userFlagResult = await client.execute({
          sql: 'SELECT 1 AS has_flag FROM question_flags WHERE question_number = ? AND user_id = ? LIMIT 1',
          args: [questionNumber, userId]
        });
        flaggedByCurrentUser = userFlagResult.rows.length > 0;
      }

      return json(res, 200, {
        questionNumber,
        flagCount,
        flaggedByCurrentUser
      });
    }

    if (req.method === 'POST') {
      const payload = parseBody(req);
      const email = normalizeEmail(payload.email);
      if (!email) {
        return json(res, 400, { error: 'valid email is required' });
      }

      const questionNumber = Number(payload.number);
      if (!Number.isFinite(questionNumber)) {
        return json(res, 400, { error: 'number is required and must be numeric' });
      }

      const reason = String(payload.reason || '').trim();
      const createdAt = new Date().toISOString();
      const userId = await resolveUserId(client, email);

      await client.execute({
        sql: `
          INSERT INTO question_flags (question_number, user_id, reason, created_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(question_number, user_id) DO UPDATE SET
            reason = excluded.reason,
            created_at = excluded.created_at
        `,
        args: [questionNumber, userId, reason, createdAt]
      });

      const countResult = await client.execute({
        sql: 'SELECT COUNT(*) AS flag_count FROM question_flags WHERE question_number = ?',
        args: [questionNumber]
      });
      const flagCount = Number(countResult.rows[0] && countResult.rows[0].flag_count) || 0;

      return json(res, 200, {
        ok: true,
        questionNumber,
        flagCount,
        flaggedByCurrentUser: true
      });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return json(res, 500, {
      error: 'API request failed',
      detail: error.message
    });
  }
};
