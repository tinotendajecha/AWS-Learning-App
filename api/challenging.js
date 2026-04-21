const { createClient } = require('@libsql/client');

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

let dbClient = null;
let initialized = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function ensureTable() {
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
    CREATE TABLE IF NOT EXISTS user_challenging_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_number INTEGER NOT NULL,
      question TEXT NOT NULL,
      explanation TEXT,
      answer_list TEXT,
      added_from TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, question_number)
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

  const userResult = await client.execute({
    sql: 'SELECT id FROM app_users WHERE email = ? LIMIT 1',
    args: [email]
  });
  if (!userResult.rows.length) {
    throw new Error('Failed to resolve user record');
  }
  return Number(userResult.rows[0].id);
}

function toItem(row) {
  let answerList = [];
  try {
    answerList = JSON.parse(row.answer_list || '[]');
    if (!Array.isArray(answerList)) answerList = [];
  } catch (err) {
    answerList = [];
  }

  return {
    questionNumber: Number(row.question_number),
    question: row.question || '',
    explanation: row.explanation || '',
    answerList,
    addedFrom: row.added_from || 'manual',
    updatedAt: row.updated_at
  };
}

module.exports = async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const email = normalizeEmail(req.query && req.query.email);
      if (!email) {
        return json(res, 400, { error: 'valid email query parameter is required' });
      }

      const client = getClient();
      const userId = await resolveUserId(client, email);
      const result = await client.execute(
        {
          sql: `
            SELECT question_number, question, explanation, answer_list, added_from, updated_at
            FROM user_challenging_questions
            WHERE user_id = ?
            ORDER BY updated_at DESC
          `,
          args: [userId]
        }
      );
      return json(res, 200, { items: result.rows.map(toItem) });
    }

    if (req.method === 'POST') {
      const payload = parseBody(req);
      const email = normalizeEmail(payload.email);
      if (!email) {
        return json(res, 400, { error: 'valid email is required' });
      }

      const number = Number(payload.number);
      if (!Number.isFinite(number)) {
        return json(res, 400, { error: 'number is required and must be numeric' });
      }

      const question = String(payload.question || '').trim();
      const explanation = String(payload.explanation || '').trim();
      const answerList = Array.isArray(payload.answerList) ? payload.answerList : [];
      const addedFrom = String(payload.addedFrom || 'manual');
      const updatedAt = new Date().toISOString();

      if (!question) {
        return json(res, 400, { error: 'question is required' });
      }

      const client = getClient();
      const userId = await resolveUserId(client, email);
      await client.execute({
        sql: `
          INSERT INTO user_challenging_questions (
            user_id,
            question_number,
            question,
            explanation,
            answer_list,
            added_from,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, question_number) DO UPDATE SET
            question = excluded.question,
            explanation = excluded.explanation,
            answer_list = excluded.answer_list,
            added_from = excluded.added_from,
            updated_at = excluded.updated_at
        `,
        args: [
          userId,
          number,
          question,
          explanation,
          JSON.stringify(answerList),
          addedFrom,
          updatedAt
        ]
      });

      return json(res, 200, {
        ok: true,
        item: {
          questionNumber: number,
          question,
          explanation,
          answerList,
          addedFrom,
          updatedAt
        }
      });
    }

    if (req.method === 'DELETE') {
      const email = normalizeEmail(req.query && req.query.email);
      if (!email) {
        return json(res, 400, { error: 'valid email query parameter is required' });
      }

      const number = Number(req.query.number);
      if (!Number.isFinite(number)) {
        return json(res, 400, { error: 'number query parameter is required' });
      }

      const client = getClient();
      const userId = await resolveUserId(client, email);
      await client.execute({
        sql: 'DELETE FROM user_challenging_questions WHERE user_id = ? AND question_number = ?',
        args: [userId, number]
      });

      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return json(res, 500, {
      error: 'API request failed',
      detail: error.message
    });
  }
};
