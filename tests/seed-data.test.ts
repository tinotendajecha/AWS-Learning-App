import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type SeedQuestion = {
  number: number;
  multi?: boolean;
  answer_list?: string[];
};

describe('seed data', () => {
  it('contains the expected question bank shape', () => {
    const seedPath = path.join(process.cwd(), 'prisma', 'seed', 'questions.json');
    const questions = JSON.parse(
      fs.readFileSync(seedPath, 'utf8')
    ) as SeedQuestion[];

    expect(questions).toHaveLength(882);

    const uniqueNumbers = new Set(questions.map((question) => question.number));
    expect(uniqueNumbers.size).toBe(882);

    const mismatchedMultiFlag = questions.filter((question) => {
      const answerCount = question.answer_list?.length ?? 0;
      return Boolean(question.multi) !== (answerCount > 1);
    });

    expect(mismatchedMultiFlag).toHaveLength(0);
  });
});
