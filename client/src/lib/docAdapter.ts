import type { SampleDoc } from './sampleDoc';
import type { ProcessResponse } from './queries';

const slug = (term: string): string =>
  term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'concept';

export function adaptDocument(res: ProcessResponse): SampleDoc {
  const sg = res.study_guide;
  const summaryParas = sg.summary
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    title: sg.title,
    source: 'Your notes',
    pages: 1,
    summary: summaryParas.length > 0 ? summaryParas : [sg.summary],
    concepts: sg.key_concepts.map((c) => ({
      id: slug(c.term),
      term: c.term,
      def: c.definition,
      related: (c.related_terms ?? []).map(slug),
    })),
    flashcards: sg.flashcards.map((f) => ({ front: f.front, back: f.back })),
    quizId: res.quiz_id,
    quiz: res.quiz.questions.map((q) => ({
      prompt: q.prompt,
      options: [...q.options],
      correct: q.correct_index,
      explanation: q.explanation,
      quote: q.source_quote,
    })),
  };
}
