import type { VocabularyItem } from "./types";

export type LexicalEntry = {
  term: string;
  definition: string;
  chinese?: string;
  pronunciation: string;
  partOfSpeech: string;
  example: string;
  usageNote: string;
  collocations: string[];
  semanticSignals: string[];
  provider: "Encher Workplace English" | "Free Dictionary API";
};

const entry = (term: string, definition: string, chinese: string, pronunciation: string, partOfSpeech: string, example: string, usageNote: string, collocations: string[], semanticSignals: string[]): LexicalEntry => ({
  term, definition, chinese, pronunciation, partOfSpeech, example, usageNote, collocations, semanticSignals, provider: "Encher Workplace English",
});

const workplaceEntries: Record<string, LexicalEntry> = {
  bespoke: entry("bespoke", "made specially for a particular person, client, or purpose", "定制的；专门设计的", "/bɪˈspoʊk/", "adjective", "We built a bespoke reporting workflow for the enterprise client.", "More common in British English, but also used in U.S. workplaces for highly customized products or services.", ["bespoke solution", "bespoke service", "bespoke design"], ["custom", "customized", "specially made", "specific client", "tailored", "定制"]),
  workaround: entry("workaround", "a temporary way to solve a problem when the real solution is not ready", "临时解决办法", "/ˈwɝːk.əˌraʊnd/", "noun", "The dashboard is down, so the spreadsheet is our workaround for today.", "A workaround keeps work moving but does not fix the root cause.", ["temporary workaround", "use a workaround", "find a workaround"], ["temporary", "alternative", "not permanent", "continue", "root problem", "临时"]),
  "contingency plan": entry("contingency plan", "a backup plan prepared for a possible problem", "应急预案；备用方案", "/kənˈtɪn.dʒən.si plæn/", "noun phrase", "Our contingency plan is to move the release to the following Tuesday.", "Use it for a plan prepared before a risk actually happens.", ["have a contingency plan", "build a contingency plan", "contingency planning"], ["backup", "alternative plan", "if something goes wrong", "risk", "备用", "应急"]),
  contingency: entry("contingency", "a possible future event that must be prepared for", "可能发生的意外情况", "/kənˈtɪn.dʒən.si/", "noun", "The budget includes extra funding for unexpected contingencies.", "In planning, it often refers to a risk or the preparation for that risk.", ["contingency budget", "contingency planning", "possible contingency"], ["possible event", "unexpected", "prepare", "risk", "意外"]),
  "pressure-test": entry("pressure-test", "to challenge an idea or plan to find weak assumptions before relying on it", "严格检验；挑战假设", "/ˈpreʃ.ɚ test/", "verb", "Can finance pressure-test these revenue assumptions before the board meeting?", "This is usually figurative in workplace English; it does not mean a physical pressure test.", ["pressure-test assumptions", "pressure-test the plan", "pressure-test a proposal"], ["challenge", "assumption", "weakness", "rigorous", "test the plan", "检验"]),
  socialize: entry("socialize", "to share an idea informally to get feedback and build support before a formal decision", "提前沟通并争取支持", "/ˈsoʊ.ʃə.laɪz/", "verb", "I want to socialize the proposal with sales before the steering committee meets.", "This corporate meaning is different from spending social time with people.", ["socialize an idea", "socialize the plan", "socialize with leadership"], ["share", "feedback", "alignment", "support", "informally", "沟通"]),
  "hold off": entry("hold off", "to deliberately wait before doing something", "暂缓；推迟", "/hoʊld ɔːf/", "phrasal verb", "Let’s hold off on hiring until the budget is approved.", "Usually followed by “on” plus a noun or -ing form: hold off on sending it.", ["hold off on", "hold off until", "decide to hold off"], ["wait", "delay", "pause", "not yet", "推迟", "暂缓"]),
  "walk it back": entry("walk it back", "to soften, withdraw, or reverse something you previously said or decided", "收回或弱化先前的说法", "/wɔːk ɪt bæk/", "idiom", "After Legal raised concerns, the team walked back the public commitment.", "Often used when someone reduces the strength of a claim or reverses a public position.", ["walk back a statement", "walk back a commitment", "walk it back"], ["withdraw", "reverse", "soften", "take back", "收回"]),
  "trade-off": entry("trade-off", "a situation where gaining one benefit means accepting a disadvantage elsewhere", "权衡；取舍", "/ˈtreɪdˌɔːf/", "noun", "The main trade-off is faster delivery versus less flexibility.", "Name both sides of the trade-off to make your recommendation clearer.", ["main trade-off", "trade-off between", "accept the trade-off"], ["balance", "benefit", "disadvantage", "give up", "compromise", "取舍"]),
  "sign off": entry("sign off", "to give final approval for something", "最终批准；签字确认", "/saɪn ɔːf/", "phrasal verb", "Legal needs to sign off before we publish the announcement.", "In meetings, sign off usually means approve, not end an email.", ["sign off on", "get sign-off", "final sign-off"], ["approve", "approval", "permission", "final decision", "批准"]),
  rollout: entry("rollout", "the planned introduction of a new product, feature, or process", "推出；上线过程", "/ˈroʊlˌaʊt/", "noun", "We’ll use a phased rollout to reduce launch risk.", "The verb is normally written as two words: roll out the feature.", ["phased rollout", "product rollout", "rollout plan"], ["launch", "introduce", "release", "deployment", "上线"]),
  underlying: entry("underlying", "basic or fundamental, although not always immediately visible", "根本的；潜在的", "/ˌʌn.dɚˈlaɪ.ɪŋ/", "adjective", "The workaround helps today, but the underlying issue still needs a permanent fix.", "Use it to distinguish a root cause from a visible symptom.", ["underlying issue", "underlying cause", "underlying assumption"], ["fundamental", "root", "hidden", "basic cause", "根本"]),
  "first pass": entry("first pass", "an initial attempt or review that is expected to be refined later", "第一版；初步处理", "/fɝːst pæs/", "noun phrase", "I’ll take a first pass at the proposal and send it this afternoon.", "It signals useful early work, not a finished result.", ["take a first pass", "do a first pass", "initial pass"], ["initial", "first attempt", "draft", "review", "初步"]),
  flag: entry("flag", "to draw someone’s attention to a problem, risk, or important detail", "指出；提醒注意", "/flæɡ/", "verb", "Please flag any dependencies that could delay the launch.", "A concise workplace verb for surfacing something that needs attention.", ["flag a risk", "flag an issue", "flag for review"], ["highlight", "point out", "attention", "warn", "提醒"]),
  "take offline": entry("take offline", "to continue a discussion separately after the current meeting", "会后单独讨论", "/teɪk ˌɔːfˈlaɪn/", "idiom", "We’re short on time, so let’s take the implementation details offline.", "It usually means a smaller follow-up conversation, not disconnecting a system.", ["take this offline", "discussion offline", "follow up offline"], ["discuss later", "separate conversation", "after meeting", "follow up", "会后"]),
  "circle back": entry("circle back", "to return to a topic or contact someone again later", "稍后再回到这个问题；再次联系", "/ˈsɝː.kəl bæk/", "phrasal verb", "I’ll circle back tomorrow after I confirm the numbers with Finance.", "Useful when you can name when or with what new information you will return.", ["circle back on", "circle back with", "circle back tomorrow"], ["return", "follow up", "later", "revisit", "再联系"]),
  bandwidth: entry("bandwidth", "the time and mental capacity available to do additional work", "可投入的时间和精力", "/ˈbænd.wɪdθ/", "noun", "I don’t have the bandwidth to own another launch this week.", "This workplace use is figurative; it does not refer to network speed.", ["have bandwidth", "limited bandwidth", "team bandwidth"], ["capacity", "time", "availability", "workload", "精力"]),
  blocker: entry("blocker", "a problem that prevents work from moving forward", "阻碍进展的问题", "/ˈblɑː.kɚ/", "noun", "The missing security review is the only blocker for release.", "A blocker stops progress; a risk may only cause a future problem.", ["major blocker", "remove a blocker", "release blocker"], ["prevents", "stops", "cannot continue", "obstacle", "阻碍"]),
};

const normalizeTerm = (term: string) => term.trim().toLowerCase().replace(/[.!?]+$/, "");

function workplaceExample(term: string, partOfSpeech: string) {
  if (partOfSpeech.includes("verb")) return `The team will ${term} the proposal before Friday.`;
  if (partOfSpeech.includes("adjective")) return `We need a ${term} solution for this client.`;
  return `We discussed the ${term} during today’s planning meeting.`;
}

type DictionaryApiDefinition = { definition?: string; example?: string; synonyms?: string[] };
type DictionaryApiMeaning = { partOfSpeech?: string; definitions?: DictionaryApiDefinition[] };
type DictionaryApiEntry = { phonetic?: string; meanings?: DictionaryApiMeaning[] };

async function lookupFreeDictionary(term: string): Promise<LexicalEntry | null> {
  if (!/^[a-z'-]+$/i.test(term)) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json() as DictionaryApiEntry[];
    const first = payload[0];
    const meaning = first?.meanings?.find((value) => value.definitions?.some((definition) => definition.definition));
    const definition = meaning?.definitions?.find((value) => value.definition);
    if (!definition?.definition) return null;
    const synonyms = definition.synonyms?.slice(0, 3) ?? [];
    return {
      term,
      definition: definition.definition,
      pronunciation: first.phonetic || "Pronunciation not available",
      partOfSpeech: meaning?.partOfSpeech || "word",
      example: definition.example || workplaceExample(term, meaning?.partOfSpeech || "word"),
      usageNote: "Definition supplied by the Free Dictionary API; Encher uses your future meeting context to refine the workplace meaning.",
      collocations: synonyms,
      semanticSignals: [...synonyms, ...definition.definition.toLowerCase().split(/\W+/).filter((word) => word.length > 4).slice(0, 8)],
      provider: "Free Dictionary API",
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function lookupVocabulary(term: string): Promise<LexicalEntry | null> {
  const normalized = normalizeTerm(term);
  return workplaceEntries[normalized] ?? lookupFreeDictionary(normalized);
}

export function getKnownEntry(term: string) {
  return workplaceEntries[normalizeTerm(term)] ?? null;
}

export async function enrichVocabularyItem(item: VocabularyItem): Promise<VocabularyItem> {
  const lexical = await lookupVocabulary(item.term);
  if (!lexical) return { ...item, due: false, enrichmentStatus: "unavailable" };
  const hasOriginalContext = item.hasOriginalContext ?? !item.sentence.toLowerCase().includes("quick-added during work");
  const sourceType = item.sourceType ?? "work";
  const tags = Array.from(new Set([...(item.tags ?? []), ...(sourceType === "work" ? ["From work"] : []), ...(!hasOriginalContext ? ["Example supplied"] : [])]));
  return {
    ...item,
    definition: lexical.definition,
    chinese: lexical.chinese ?? item.chinese,
    sentence: hasOriginalContext ? item.sentence : lexical.example,
    context: hasOriginalContext ? item.context : "You saved this during work without the original sentence, so Encher supplied a realistic example.",
    explanation: lexical.definition,
    newExample: lexical.example,
    pronunciation: lexical.pronunciation,
    partOfSpeech: lexical.partOfSpeech,
    usageNote: lexical.usageNote,
    collocations: lexical.collocations,
    sourceType,
    hasOriginalContext,
    tags,
    enrichmentStatus: "ready",
    due: true,
  };
}

export function semanticSignalsFor(item: VocabularyItem) {
  const known = getKnownEntry(item.term);
  if (known) return known.semanticSignals;
  return `${item.definition} ${item.explanation}`.toLowerCase().split(/\W+/).filter((word) => word.length > 4);
}
