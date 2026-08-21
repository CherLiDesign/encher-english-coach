import type { LearningGoal, LearningPriority, Mastery, VocabularyEvaluation, VocabularyItem } from "./types";

export type PracticeEvidence = {
  mode: "listening" | "speaking";
  startedAt: string;
  results: {
    itemCount?: number;
    finalEvaluation?: VocabularyEvaluation;
    focus?: string;
    outcome?: "strong" | "retry";
  };
};

export type EnglishMetricId =
  | "workplace-vocabulary"
  | "context-understanding"
  | "listening-recognition"
  | "meaning-recall"
  | "active-use"
  | "clear-expression"
  | "grammar"
  | "natural-workplace-english"
  | "pronunciation";

export type EnglishMetric = {
  id: EnglishMetricId;
  label: string;
  shortLabel: string;
  value: number | null;
  previous: number | null;
  change: number | null;
  target: number;
  evidence: string;
  explanation: string;
  nextStep: string;
};

export type EnglishProfile = {
  readiness: number;
  previousReadiness: number;
  readinessChange: number;
  targetReadiness: number;
  wordsStrengthenedToday: number;
  practicesToday: number;
  metrics: EnglishMetric[];
};

const clamp = (value: number, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, value));
const round = (value: number) => Math.round(clamp(value));
const average = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

function startOfLocalDay(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isToday(value: string, now: Date) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() >= startOfLocalDay(now).getTime() && date.getTime() <= now.getTime();
}

function reviewGain(evaluation: VocabularyEvaluation) {
  return {
    contextual: evaluation === "correct" ? 12 : evaluation === "partial" ? 5 : 1,
    recall: evaluation === "correct" ? 8 : evaluation === "partial" ? 3 : 0,
  };
}

function currentDimension(vocabulary: VocabularyItem[], dimension: keyof Mastery) {
  return round(average(vocabulary.map((item) => item.mastery[dimension] ?? 0)));
}

function previousDimension(vocabulary: VocabularyItem[], dimension: keyof Mastery, now: Date) {
  return round(average(vocabulary.map((item) => {
    if (dimension !== "contextual" && dimension !== "recall") return item.mastery[dimension] ?? 0;
    const todayGain = (item.review?.history ?? [])
      .filter((attempt) => isToday(attempt.attemptedAt, now))
      .reduce((total, attempt) => total + reviewGain(attempt.evaluation)[dimension], 0);
    return Math.max(0, (item.mastery[dimension] ?? 0) - todayGain);
  })));
}

function vocabularyComposite(vocabulary: VocabularyItem[], previous: boolean, now: Date) {
  const dimensions: (keyof Mastery)[] = ["recognition", "contextual", "recall"];
  return round(average(dimensions.map((dimension) => previous ? previousDimension(vocabulary, dimension, now) : currentDimension(vocabulary, dimension))));
}

function targetFor(priority: LearningPriority, id: EnglishMetricId) {
  const comprehension = ["workplace-vocabulary", "context-understanding", "listening-recognition", "meaning-recall"];
  const expression = ["active-use", "clear-expression", "grammar", "natural-workplace-english"];
  if (priority === "understanding") return comprehension.includes(id) ? 82 : 72;
  if (priority === "expression") return expression.includes(id) ? 82 : 72;
  return id === "pronunciation" ? 70 : 76;
}

function speakingScore(
  baseline: number,
  evidence: PracticeEvidence[],
  now: Date,
  includeToday: boolean,
  strongGain: number,
  retryGain: number,
) {
  const relevant = evidence.filter((session) => session.mode === "speaking" && (includeToday || !isToday(session.startedAt, now)));
  return round(relevant.reduce((score, session) => score + (session.results.outcome === "strong" ? strongGain : session.results.outcome === "retry" ? retryGain : 0), baseline));
}

function metric(
  id: EnglishMetricId,
  label: string,
  shortLabel: string,
  value: number | null,
  previous: number | null,
  priority: LearningPriority,
  evidence: string,
  explanation: string,
  nextStep: string,
): EnglishMetric {
  return {
    id,
    label,
    shortLabel,
    value,
    previous,
    change: value === null || previous === null ? null : value - previous,
    target: targetFor(priority, id),
    evidence,
    explanation,
    nextStep,
  };
}

export function calculateEnglishProfile(
  goal: LearningGoal,
  vocabulary: VocabularyItem[],
  practiceEvidence: PracticeEvidence[],
  now = new Date(),
): EnglishProfile {
  const reviewAttempts = vocabulary.reduce((total, item) => total + (item.review?.history.length ?? 0), 0);
  const listeningPractices = practiceEvidence.filter((session) => session.mode === "listening").length;
  const speakingPractices = practiceEvidence.filter((session) => session.mode === "speaking").length;
  const workplaceWords = vocabulary.filter((item) => item.sourceType === "work").length;

  const expression = speakingScore(34, practiceEvidence, now, true, 3, 1);
  const previousExpression = speakingScore(34, practiceEvidence, now, false, 3, 1);
  const grammar = speakingScore(31, practiceEvidence, now, true, 2, 1);
  const previousGrammar = speakingScore(31, practiceEvidence, now, false, 2, 1);
  const naturalness = speakingScore(30, practiceEvidence, now, true, 2.5, 0.75);
  const previousNaturalness = speakingScore(30, practiceEvidence, now, false, 2.5, 0.75);

  const metrics = [
    metric(
      "workplace-vocabulary",
      "Workplace Vocabulary",
      "Vocabulary",
      vocabularyComposite(vocabulary, false, now),
      vocabularyComposite(vocabulary, true, now),
      goal.priority,
      `${workplaceWords} expressions from your work · ${reviewAttempts} review answers`,
      "Estimates whether you can recognize a workplace expression, understand it in context, and recall its meaning.",
      "Review due expressions, then explain each one without looking at the definition.",
    ),
    metric(
      "context-understanding",
      "Context Understanding",
      "Understand",
      currentDimension(vocabulary, "contextual"),
      previousDimension(vocabulary, "contextual", now),
      goal.priority,
      `${vocabulary.length} tracked expressions with original or supplied context`,
      "Measures whether you understand what a word or phrase means inside the speaker’s actual sentence.",
      "Practice one original meeting sentence and one new workplace context.",
    ),
    metric(
      "listening-recognition",
      "Listening Recognition",
      "Listening",
      currentDimension(vocabulary, "listening"),
      previousDimension(vocabulary, "listening", now),
      goal.priority,
      `${listeningPractices} listening practices · transcript evidence is currently stronger than audio evidence`,
      "Tracks whether familiar expressions are recognized when heard naturally. V1 starts conservatively because meeting audio is not yet available.",
      "Keep building meaning first; audio recognition drills arrive with V2 audio support.",
    ),
    metric(
      "meaning-recall",
      "Meaning Recall",
      "Recall",
      currentDimension(vocabulary, "recall"),
      previousDimension(vocabulary, "recall", now),
      goal.priority,
      `${reviewAttempts} attempts where you explained or produced an expression`,
      "Measures whether you can retrieve the meaning without seeing the answer.",
      "Use active recall before revealing the explanation, even when you feel uncertain.",
    ),
    metric(
      "active-use",
      "Active Use",
      "Active Use",
      currentDimension(vocabulary, "activeUse"),
      previousDimension(vocabulary, "activeUse", now),
      goal.priority,
      `${vocabulary.filter((item) => item.mastery.activeUse >= 40).length} expressions used or ready for transfer`,
      "Measures whether learned language appears naturally in your own workplace English.",
      "Use one learned expression in a fresh recommendation and bring the next transcript back for verification.",
    ),
    metric(
      "clear-expression",
      "Clear Expression",
      "Expression",
      expression,
      previousExpression,
      goal.priority,
      `${speakingPractices} correction attempts · initial transcript diagnosis included`,
      "Estimates how directly your English transfers the idea in your head to the listener, especially recommendations and next steps.",
      "Lead with the recommendation, then add one reason and one next step.",
    ),
    metric(
      "grammar",
      "Grammar in Live Speech",
      "Grammar",
      grammar,
      previousGrammar,
      goal.priority,
      `${speakingPractices} correction attempts · recurring article pattern in the current diagnosis`,
      "Tracks grammar patterns that repeatedly affect professional speech, not isolated editing mistakes.",
      "Repair one recurring pattern inside a complete workplace sentence.",
    ),
    metric(
      "natural-workplace-english",
      "Natural Workplace English",
      "Naturalness",
      naturalness,
      previousNaturalness,
      goal.priority,
      `${speakingPractices} correction attempts · clarity and workplace phrasing reviewed together`,
      "Measures whether your meaning sounds efficient and natural in an American workplace, beyond basic grammatical correctness.",
      "Compare your original sentence with one concise alternative, then reproduce it in your own words.",
    ),
    metric(
      "pronunciation",
      "Pronunciation",
      "Pronunciation",
      null,
      null,
      goal.priority,
      "No audio evidence yet",
      "Pronunciation cannot be evaluated reliably from a transcript.",
      "Audio required in V2: record or import speech to measure sounds, stress, rhythm, and intonation.",
    ),
  ];

  const weighted = [
    ["workplace-vocabulary", 0.16],
    ["context-understanding", 0.16],
    ["listening-recognition", 0.16],
    ["meaning-recall", 0.12],
    ["active-use", 0.12],
    ["clear-expression", 0.12],
    ["grammar", 0.08],
    ["natural-workplace-english", 0.08],
  ] as const;
  const valueFor = (id: EnglishMetricId, previous: boolean) => {
    const found = metrics.find((item) => item.id === id);
    return (previous ? found?.previous : found?.value) ?? 0;
  };
  const readiness = round(weighted.reduce((total, [id, weight]) => total + valueFor(id, false) * weight, 0));
  const previousReadiness = round(weighted.reduce((total, [id, weight]) => total + valueFor(id, true) * weight, 0));
  const strengthened = new Set(vocabulary.flatMap((item) => (item.review?.history ?? [])
    .filter((attempt) => isToday(attempt.attemptedAt, now) && ["correct", "partial"].includes(attempt.evaluation))
    .map(() => item.id)));

  return {
    readiness,
    previousReadiness,
    readinessChange: readiness - previousReadiness,
    targetReadiness: goal.priority === "balanced" ? 76 : 78,
    wordsStrengthenedToday: strengthened.size,
    practicesToday: practiceEvidence.filter((session) => isToday(session.startedAt, now)).length,
    metrics,
  };
}
