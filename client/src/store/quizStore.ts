import { create } from 'zustand';

export type Answer = number | null;

type QuizState = {
  answers: Answer[];
  setAnswers: (answers: Answer[]) => void;
  reset: () => void;
};

export const useQuizStore = create<QuizState>((set) => ({
  answers: [],
  setAnswers: (answers) => set({ answers }),
  reset: () => set({ answers: [] }),
}));
