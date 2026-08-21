export type View = "home" | "add" | "practice" | "import" | "review" | "vocabulary" | "today" | "sentence" | "speaking-practice" | "roadmap" | "me";

export type Mastery = {
  recognition: number;
  contextual: number;
  listening: number;
  recall: number;
  activeUse: number;
  pronunciation: number;
};

export type VocabularyEvaluation = "correct" | "partial" | "incorrect" | "unknown";

export type VocabularyReviewAttempt = {
  id: string;
  attemptedAt: string;
  promptType: "context" | "meaning" | "fill-blank" | "new-context";
  response: string;
  evaluation: VocabularyEvaluation;
  intervalDays: number;
  nextReviewAt: string;
};

export type VocabularyReviewPlan = {
  dueAt: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
  lastReviewedAt?: string;
  lastResult?: VocabularyEvaluation;
  history: VocabularyReviewAttempt[];
};

export type VocabularyItem = {
  id: string;
  term: string;
  definition: string;
  chinese?: string;
  sentence: string;
  context: string;
  source: string;
  discoveredAt: string;
  reason: string;
  originalAnswer?: string;
  explanation: string;
  newExample: string;
  pronunciation: string;
  partOfSpeech?: string;
  usageNote?: string;
  collocations?: string[];
  sourceType?: "work" | "dictionary";
  hasOriginalContext?: boolean;
  tags?: string[];
  enrichmentStatus?: "pending" | "ready" | "unavailable";
  status: "Unknown" | "Learning" | "Recognized" | "Understood" | "Listening Ready" | "Active" | "Mastered";
  mastery: Mastery;
  due: boolean;
  review?: VocabularyReviewPlan;
};

export type Candidate = VocabularyItem & { confidence: number };

export type LearningPriority = "balanced" | "understanding" | "expression";

export type LearningGoal = {
  statement: string;
  startedAt: string;
  weeklyMinutes: number;
  priority: LearningPriority;
};
