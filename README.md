# AWS Learning App (Vercel + Turso)

This app is a mobile-friendly AWS quiz page with persistent "challenging concepts" storage.

## What is persisted

When you mark a study question as challenging, or answer a quiz question incorrectly, it is saved in Turso via:

- `POST /api/challenging` to upsert concept
- `GET /api/challenging` to load concepts
- `DELETE /api/challenging?number=<questionNumber>` to remove

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill values:

```bash
cp .env.example .env.local
```

3. Run Vercel dev server:

```bash
npx vercel dev
```

4. Open `http://localhost:3000`

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add environment variables in Vercel project settings:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Deploy.

The root route (`/`) is rewritten to `aws_quiz_interactive.html`.

## Notes

- If Turso is unavailable, the page still keeps local browser fallback for your current device.
- Cross-device persistence works when the API can reach Turso successfully.
