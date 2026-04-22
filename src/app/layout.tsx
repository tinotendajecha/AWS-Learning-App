import type { Metadata } from 'next';

import type { ReactNode } from 'react';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'AWS Learning App',
  description: 'Study AWS questions, run quizzes, and track challenging topics.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
