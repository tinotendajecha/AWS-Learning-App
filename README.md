# AWS Learning App

This project is now a Next.js App Router + TypeScript study app with Prisma and PostgreSQL.

## What it does

- Study mode for browsing and searching the question bank
- Quiz mode with:
  - filtered, all-question, and challenging-only sources
  - random or sequential order
  - no-repeat behavior until the current exam bank is exhausted
  - auto-marking wrong answers as challenging
  - optional auto-removal of challenging questions after a correct answer
- Results pages with wrong-answer review
- CSV export of challenging concepts
- Structured request logging with request IDs

## Question bank

- Runtime questions are loaded from PostgreSQL through Prisma.
- The legacy browser bundle has been converted into seed input at `prisma/seed/questions.json`.
- The current default exam code is controlled by `DEFAULT_EXAM_CODE`.
- The schema is already scoped for future multi-exam support, so adding banks like DP-900 later will not require a redesign.

## Environment variables

Copy `.env.example` to `.env.local` and update values:

```bash
cp .env.example .env.local
```

Required:

- `DATABASE_URL`

Optional:

- `DEFAULT_EXAM_CODE` defaults to `AWS-CLF-C02`
- `LOG_LEVEL` defaults to `info`

## Local development

1. Install dependencies

```bash
npm install
```

2. Generate the Prisma client

```bash
npm run prisma:generate
```

3. Push the schema to PostgreSQL

```bash
npm run db:push
```

4. Seed the question bank

```bash
npm run prisma:seed
```

5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run prisma:generate
npm run prisma:seed
npm run db:push
```

## Project shape

- `src/app`: App Router pages and route handlers
- `src/features`: client-side study, quiz, challenging, and preference logic
- `src/server`: repositories and services
- `src/lib`: Prisma, logging, validation, and request context helpers
- `prisma`: schema and seed assets
