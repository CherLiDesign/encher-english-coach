import type { Candidate, VocabularyItem } from "./types";

export const SAMPLE_TRANSCRIPT = `Sarah: Before we commit to Friday, I want a contingency plan in case the vendor slips again.
Marcus: Agreed. For now, we can use the manual export as a workaround until engineering fixes the underlying issue.
You: I think we can launch, but maybe we should hold off the announcement until legal signs off.
Sarah: That makes sense. Let's also pressure-test the rollout assumptions before we socialize the plan with leadership.
Marcus: I can take a first pass and flag any trade-offs by tomorrow.`;

const seed: Candidate[] = [
  {
    id: "workaround", term: "workaround", definition: "a temporary way to solve a problem when the real solution is not ready", chinese: "临时解决办法",
    sentence: "For now, we can use the manual export as a workaround until engineering fixes the underlying issue.",
    context: "The team is deciding how to keep a launch moving while engineering works on a permanent fix.", source: "Launch Readiness Sync",
    discoveredAt: "Aug 20, 2026", reason: "Important workplace expression; your vocabulary model has no prior evidence of understanding.",
    explanation: "A workaround is a temporary alternative that lets work continue without fixing the root problem.",
    newExample: "The dashboard is down, so the spreadsheet is our workaround for today.", pronunciation: "/ˈwɝːk.əˌraʊnd/", status: "Learning",
    mastery: { recognition: 48, contextual: 35, listening: 18, recall: 20, activeUse: 8, pronunciation: 12 }, due: true, confidence: 0.91,
  },
  {
    id: "pressure-test", term: "pressure-test", definition: "to test an idea rigorously by challenging its assumptions", chinese: "压力测试；严格检验",
    sentence: "Let's also pressure-test the rollout assumptions before we socialize the plan with leadership.",
    context: "The team wants to find weaknesses in the launch plan before presenting it to executives.", source: "Launch Readiness Sync",
    discoveredAt: "Aug 20, 2026", reason: "A figurative workplace use that may not match the literal meaning you know.",
    explanation: "Here it means to challenge the plan and look for weaknesses before relying on it.",
    newExample: "Can finance pressure-test these revenue assumptions before the board meeting?", pronunciation: "/ˈpreʃ.ɚ test/", status: "Learning",
    mastery: { recognition: 40, contextual: 24, listening: 12, recall: 15, activeUse: 4, pronunciation: 8 }, due: true, confidence: 0.86,
  },
  {
    id: "socialize", term: "socialize", definition: "to share an idea with people to get feedback and support before a formal decision", chinese: "提前沟通并争取支持",
    sentence: "Let's pressure-test the rollout assumptions before we socialize the plan with leadership.",
    context: "The plan is not yet ready for formal executive approval.", source: "Launch Readiness Sync", discoveredAt: "Aug 20, 2026",
    reason: "Common corporate meaning differs from the everyday meaning of spending time socially.",
    explanation: "In workplace English, socialize often means to circulate an idea informally and build alignment.",
    newExample: "I want to socialize the proposal with sales before the steering committee meets.", pronunciation: "/ˈsoʊ.ʃə.laɪz/", status: "Learning",
    mastery: { recognition: 34, contextual: 20, listening: 15, recall: 10, activeUse: 2, pronunciation: 10 }, due: true, confidence: 0.94,
  },
  {
    id: "hold-off", term: "hold off", definition: "to wait before doing something", chinese: "暂缓；推迟",
    sentence: "Maybe we should hold off the announcement until legal signs off.", context: "The launch may proceed, but the public announcement should wait.",
    source: "Launch Readiness Sync", discoveredAt: "Aug 20, 2026", reason: "Phrasal verb with a time-sensitive meaning.",
    explanation: "Hold off means deliberately delay an action for a short time.", newExample: "Let's hold off on hiring until the budget is approved.",
    pronunciation: "/hoʊld ɔːf/", status: "Understood", mastery: { recognition: 80, contextual: 74, listening: 51, recall: 62, activeUse: 45, pronunciation: 42 }, due: true, confidence: 0.72,
  },
];

export const seedVocabulary: VocabularyItem[] = [seed[0], seed[3], {
  ...seed[0], id: "contingency", term: "contingency plan", definition: "a backup plan for a possible problem", chinese: "应急预案",
  sentence: "I want a contingency plan in case the vendor slips again.", explanation: "A prepared alternative used if the expected plan fails.",
  newExample: "Our contingency plan is to move the release to the following Tuesday.", pronunciation: "/kənˈtɪn.dʒən.si plæn/", status: "Recognized",
  mastery: { recognition: 67, contextual: 61, listening: 38, recall: 44, activeUse: 24, pronunciation: 32 },
}];

export async function analyzeTranscript(transcript: string): Promise<Candidate[]> {
  await new Promise((resolve) => setTimeout(resolve, 850));
  const lowered = transcript.toLowerCase();
  const detected = seed.filter((item) => lowered.includes(item.term.replace(" plan", "")));
  return detected.length ? detected : seed.slice(0, 3);
}

export function evaluateAnswer(answer: string, item: VocabularyItem) {
  const normalized = answer.toLowerCase();
  const signals: Record<string, string[]> = {
    workaround: ["temporary", "alternative", "not permanent", "continue", "临时"],
    "pressure-test": ["challenge", "assumption", "weakness", "rigorous", "测试"],
    socialize: ["share", "feedback", "alignment", "support", "沟通"],
    "hold off": ["wait", "delay", "pause", "推迟", "暂缓"],
  };
  const hits = (signals[item.term] ?? []).filter((signal) => normalized.includes(signal)).length;
  return hits >= 2 ? "Correct" : hits === 1 ? "Partial understanding" : "Needs verification";
}
