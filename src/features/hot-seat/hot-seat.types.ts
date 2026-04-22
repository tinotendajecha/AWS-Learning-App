import type { HotSeatSessionDto, SelectionType } from '@/contracts/api';

export type HotSeatClientState = {
  session: HotSeatSessionDto;
  selectedOptionLetters: string[];
  busyAction: 'start' | 'advance' | 'submit' | 'join' | null;
  message: string | null;
  error: string | null;
};

export type ToggleHotSeatSelection = (
  letter: string,
  selectionType: SelectionType
) => void;
