export type View = "home" | "listening" | "import" | "review" | "vocabulary" | "today" | "sentence" | "speaking" | "speaking-practice" | "roadmap" | "me";

export type Mastery = {
  recognition: number;
  contextual: number;
  listening: number;
  recall: number;
  activeUse: number;
  pronunciation: number;
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
  status: "Unknown" | "Learning" | "Recognized" | "Understood" | "Listening Ready" | "Active" | "Mastered";
  mastery: Mastery;
  due: boolean;
};

export type Candidate = VocabularyItem & { confidence: number };
