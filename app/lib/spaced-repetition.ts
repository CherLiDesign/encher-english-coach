import { semanticSignalsFor } from "./dictionary";
import type { VocabularyEvaluation, VocabularyItem, VocabularyReviewPlan } from "./types";

const DAY_MS = 86_400_000;

export function initialReviewPlan(dueAt = new Date().toISOString()): VocabularyReviewPlan {
  return { dueAt, intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0, history: [] };
}

export function normalizeVocabularyItem(item: VocabularyItem): VocabularyItem {
  return {
    ...item,
    sourceType: item.sourceType ?? "work",
    hasOriginalContext: item.hasOriginalContext ?? !item.sentence.toLowerCase().includes("quick-added during work"),
    tags: item.tags ?? ["From work"],
    enrichmentStatus: item.enrichmentStatus ?? (item.definition === "Pending enrichment" ? "pending" : "ready"),
    review: item.review ?? initialReviewPlan(),
  };
}

export function isVocabularyDue(item: VocabularyItem, now = new Date()) {
  if (item.enrichmentStatus === "pending" || item.enrichmentStatus === "unavailable") return false;
  if (!item.review) return item.due;
  return new Date(item.review.dueAt).getTime() <= now.getTime();
}

export function evaluateVocabularyResponse(answer: string, item: VocabularyItem, promptType: "context" | "meaning" | "fill-blank" | "new-context"): VocabularyEvaluation {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return "unknown";
  const target = item.term.trim().toLowerCase();
  if (promptType === "fill-blank") return normalized === target || normalized.includes(target) ? "correct" : "incorrect";
  const signals = semanticSignalsFor(item);
  const hits = new Set(signals.filter((signal) => normalized.includes(signal.toLowerCase()))).size;
  if (hits >= 2) return "correct";
  if (hits === 1) return "partial";
  return "incorrect";
}

export function nextReviewPlan(item: VocabularyItem, evaluation: VocabularyEvaluation, now = new Date()) {
  const current = item.review ?? initialReviewPlan(now.toISOString());
  let repetitions = current.repetitions;
  let lapses = current.lapses;
  let ease = current.ease;
  let intervalDays = current.intervalDays;
  if (evaluation === "correct") {
    intervalDays = repetitions === 0 ? 3 : repetitions === 1 ? 7 : Math.max(14, Math.round(Math.max(intervalDays, 7) * ease));
    repetitions += 1;
    ease = Math.min(3, ease + 0.05);
  } else if (evaluation === "partial") {
    intervalDays = 1;
    ease = Math.max(1.6, ease - 0.12);
  } else {
    intervalDays = 1;
    repetitions = 0;
    lapses += 1;
    ease = Math.max(1.5, ease - 0.2);
  }
  return { intervalDays, repetitions, lapses, ease, dueAt: new Date(now.getTime() + intervalDays * DAY_MS).toISOString() };
}

export function applyVocabularyReview(item: VocabularyItem, answer: string, evaluation: VocabularyEvaluation, promptType: "context" | "meaning" | "fill-blank" | "new-context", now = new Date()): VocabularyItem {
  const current = item.review ?? initialReviewPlan(now.toISOString());
  const next = nextReviewPlan(item, evaluation, now);
  const contextualGain = evaluation === "correct" ? 12 : evaluation === "partial" ? 5 : 1;
  const recallGain = evaluation === "correct" ? 8 : evaluation === "partial" ? 3 : 0;
  const attempt = { id: `${item.id}-${now.getTime()}`, attemptedAt: now.toISOString(), promptType, response: answer, evaluation, intervalDays: next.intervalDays, nextReviewAt: next.dueAt };
  return {
    ...item,
    originalAnswer: answer,
    due: false,
    status: evaluation === "correct" ? (item.status === "Unknown" ? "Learning" : item.status) : "Learning",
    mastery: { ...item.mastery, contextual: Math.min(100, item.mastery.contextual + contextualGain), recall: Math.min(100, item.mastery.recall + recallGain) },
    review: { ...current, ...next, lastReviewedAt: now.toISOString(), lastResult: evaluation, history: [attempt, ...current.history].slice(0, 30) },
  };
}

export function formatNextReview(item: VocabularyItem, evaluation: VocabularyEvaluation) {
  const next = nextReviewPlan(item, evaluation);
  if (evaluation === "incorrect" || evaluation === "unknown") return { primary: "Again in this session", secondary: "Then tomorrow", ...next };
  if (evaluation === "partial") return { primary: "Tomorrow", secondary: "Partial understanding needs a shorter interval", ...next };
  return { primary: next.intervalDays === 3 ? "In 3 days" : next.intervalDays === 7 ? "In 7 days" : `In ${next.intervalDays} days`, secondary: "Correct answers earn a longer interval", ...next };
}
