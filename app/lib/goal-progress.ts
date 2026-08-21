import type { LearningGoal, LearningPriority, Mastery, VocabularyItem } from "./types";

export type GoalPhaseProgress = {
  id: "foundation" | "meetings" | "transfer";
  progress: number;
  evidence: string;
};

export type GoalProgress = {
  overall: number;
  currentWeek: number;
  targetDate: Date;
  phases: GoalPhaseProgress[];
  evidence: {
    personalWords: number;
    completedSessions: number;
    reviewAttempts: number;
    workTransfers: number;
  };
};

const clamp = (value: number, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, value));
const average = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

const dimensionAverage = (vocabulary: VocabularyItem[], dimensions: (keyof Mastery)[]) => {
  if (!vocabulary.length) return 0;
  return average(vocabulary.flatMap((item) => dimensions.map((dimension) => item.mastery[dimension] ?? 0)));
};

export function createDefaultGoal(now = new Date()): LearningGoal {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    statement: "Understand coworkers in real time and express my recommendation clearly.",
    startedAt: `${year}-${month}-${day}`,
    weeklyMinutes: 75,
    priority: "balanced",
  };
}

export function isLearningGoal(value: unknown): value is LearningGoal {
  if (!value || typeof value !== "object") return false;
  const goal = value as Partial<LearningGoal>;
  return typeof goal.statement === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(goal.startedAt ?? "")
    && typeof goal.weeklyMinutes === "number"
    && ["balanced", "understanding", "expression"].includes(goal.priority ?? "");
}

function progressWeights(priority: LearningPriority) {
  if (priority === "understanding") return [0.35, 0.45, 0.2] as const;
  if (priority === "expression") return [0.3, 0.3, 0.4] as const;
  return [0.4, 0.35, 0.25] as const;
}

export function calculateGoalProgress(
  goal: LearningGoal,
  vocabulary: VocabularyItem[],
  completedSessions: number,
  now: Date,
): GoalProgress {
  const reviewAttempts = vocabulary.reduce((total, item) => total + (item.review?.history.length ?? 0), 0);
  const workTransfers = vocabulary.filter((item) => item.mastery.activeUse >= 40 || item.status === "Active" || item.status === "Mastered").length;

  const foundation = clamp(Math.round(
    dimensionAverage(vocabulary, ["recognition", "contextual", "recall"]) * 0.65
    + Math.min(vocabulary.length / 20, 1) * 20
    + Math.min(reviewAttempts / 30, 1) * 15,
  ));
  const meetings = clamp(Math.round(
    dimensionAverage(vocabulary, ["contextual", "listening"]) * 0.65
    + Math.min(completedSessions / 24, 1) * 20
    + Math.min(vocabulary.filter((item) => item.mastery.listening >= 50).length / 8, 1) * 15,
  ));
  const transfer = clamp(Math.round(
    dimensionAverage(vocabulary, ["activeUse"]) * 0.55
    + Math.min(workTransfers / 10, 1) * 30
    + Math.min(completedSessions / 30, 1) * 15,
  ));

  const [foundationWeight, meetingsWeight, transferWeight] = progressWeights(goal.priority);
  const overall = clamp(Math.round(foundation * foundationWeight + meetings * meetingsWeight + transfer * transferWeight));
  const start = new Date(`${goal.startedAt}T12:00:00`);
  const safeStart = Number.isNaN(start.getTime()) ? now : start;
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - safeStart.getTime()) / 86_400_000));
  const currentWeek = clamp(Math.floor(elapsedDays / 7) + 1, 1, 12);
  const targetDate = new Date(safeStart);
  targetDate.setDate(targetDate.getDate() + 84);

  return {
    overall,
    currentWeek,
    targetDate,
    phases: [
      { id: "foundation", progress: foundation, evidence: `${vocabulary.length} personal words · ${reviewAttempts} review answers` },
      { id: "meetings", progress: meetings, evidence: `${completedSessions} completed practices · listening recognition tracked` },
      { id: "transfer", progress: transfer, evidence: `${workTransfers} verified uses in active English` },
    ],
    evidence: { personalWords: vocabulary.length, completedSessions, reviewAttempts, workTransfers },
  };
}
