import fs from 'node:fs/promises';
import path from 'node:path';

import { PrismaClient, SelectionType } from '@prisma/client';

const defaultExamCode = process.env.DEFAULT_EXAM_CODE ?? 'AWS-CLF-C02';

type SeedQuestion = {
  number: number;
  question: string;
  options: Array<{ letter: string; text: string }>;
  explanation?: string;
  answer_list?: string[];
  multi?: boolean;
};

const prisma = new PrismaClient();

async function main() {
  const seedPath = path.join(process.cwd(), 'prisma', 'seed', 'questions.json');
  const raw = await fs.readFile(seedPath, 'utf8');
  const questions = JSON.parse(raw) as SeedQuestion[];

  for (const question of questions) {
    const selectionType =
      question.multi || (question.answer_list?.length ?? 0) > 1
        ? SelectionType.MULTI
        : SelectionType.SINGLE;

    const savedQuestion = await prisma.question.upsert({
      where: {
        examCode_number: {
          examCode: defaultExamCode,
          number: question.number
        }
      },
      update: {
        examCode: defaultExamCode,
        prompt: question.question,
        explanation: question.explanation ?? '',
        selectionType
      },
      create: {
        examCode: defaultExamCode,
        number: question.number,
        prompt: question.question,
        explanation: question.explanation ?? '',
        selectionType
      }
    });

    await prisma.questionOption.deleteMany({
      where: { questionId: savedQuestion.id }
    });

    if (question.options.length) {
      await prisma.questionOption.createMany({
        data: question.options.map((option, index) => ({
          questionId: savedQuestion.id,
          letter: option.letter,
          text: option.text,
          position: index,
          isCorrect: (question.answer_list ?? []).includes(option.letter)
        }))
      });
    }
  }

  console.log(`Seeded ${questions.length} questions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
