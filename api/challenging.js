const { createClient } = require('@libsql/client');

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

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

async function ensureTable() {
  if (initialized) return;
  const client = getClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS challenging_questions (
      question_number INTEGER PRIMARY KEY,
      question TEXT NOT NULL,
      explanation TEXT,
      answer_list TEXT,
      added_from TEXT,
      updated_at TEXT NOT NULL
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
      const client = getClient();
      const result = await client.execute(
        'SELECT question_number, question, explanation, answer_list, added_from, updated_at FROM challenging_questions ORDER BY updated_at DESC'
      );
      return json(res, 200, { items: result.rows.map(toItem) });
    }

    if (req.method === 'POST') {
      const payload = parseBody(req);
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
      await client.execute({
        sql: `
          INSERT INTO challenging_questions (
            question_number,
            question,
            explanation,
            answer_list,
            added_from,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(question_number) DO UPDATE SET
            question = excluded.question,
            explanation = excluded.explanation,
            answer_list = excluded.answer_list,
            added_from = excluded.added_from,
            updated_at = excluded.updated_at
        `,
        args: [
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
      const number = Number(req.query.number);
      if (!Number.isFinite(number)) {
        return json(res, 400, { error: 'number query parameter is required' });
      }

      const client = getClient();
      await client.execute({
        sql: 'DELETE FROM challenging_questions WHERE question_number = ?',
        args: [number]
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
