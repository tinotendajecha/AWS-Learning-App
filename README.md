# AWS Learning App (Vercel + Turso)

This app is a mobile-friendly AWS quiz page with user-aware persistence.

Users must enter an email before they can use quiz/study features.

## What is persisted

When a user marks a study question as challenging, or answers a quiz question incorrectly, it is saved in Turso under that user account.

User tracking:

- `POST /api/users` to register/update last-seen for the entered email

Challenging concepts (per user):

- `POST /api/challenging` with `email` to upsert concept
- `GET /api/challenging?email=<email>` to load only that user's concepts
- `DELETE /api/challenging?number=<questionNumber>&email=<email>` to remove for that user

Question quality flags:

- `POST /api/question-flags` with `email` + `number` to flag a question
- `GET /api/question-flags?number=<questionNumber>&email=<email>` to fetch total flag count and whether current user flagged it

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
- Local browser fallback is now scoped by email so different users on the same device do not mix challenging history.
