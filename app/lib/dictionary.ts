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
  "cordoned off": entry("cordoned off", "closed or separated an area so people could not enter it", "封锁；隔离某个区域", "/ˈkɔːr.dənd ɔːf/", "phrasal verb", "Facilities cordoned off the damaged section until the safety inspection was complete.", "Usually used for a physical area that is blocked with barriers, tape, or security staff. The base form is “cordon off.”", ["cordon off an area", "cordoned off for safety", "be cordoned off"], ["blocked", "closed", "kept people away", "restricted area", "封锁"]),
  criteria: entry("criteria", "the standards or conditions used to judge or decide something", "标准；准则（criterion 的复数）", "/kraɪˈtɪr.i.ə/", "plural noun", "We agreed on three criteria for deciding whether the feature is ready to launch.", "“Criteria” is plural; use “criterion” for one standard: one criterion, several criteria.", ["selection criteria", "meet the criteria", "evaluation criteria"], ["standards", "requirements", "judge", "decide", "conditions", "标准"]),
  occasional: entry("occasional", "happening sometimes, but not often or regularly", "偶尔的；不经常发生的", "/əˈkeɪ.ʒən.əl/", "adjective", "The new process still causes occasional delays during peak hours.", "Use it before a noun for something infrequent: an occasional issue, occasional travel, occasional delays.", ["occasional issue", "occasional delay", "occasional meeting"], ["sometimes", "not often", "infrequent", "from time to time", "偶尔"]),
  "learn the ropes": entry("learn the ropes", "to learn how a job, task, or organization works", "熟悉工作流程；摸清门道", "/lɝːn ðə roʊps/", "idiom", "Give Maya a few weeks to learn the ropes before she owns the client account.", "An informal but common way to describe becoming familiar with new responsibilities and procedures.", ["learn the ropes", "help someone learn the ropes", "still learning the ropes"], ["learn how", "become familiar", "how things work", "procedures", "熟悉", "摸清门道"]),
  "back to square one": entry("back to square one", "forced to start again because an earlier attempt or plan did not work", "回到起点；从头再来", "/bæk tə skwer wʌn/", "idiom", "If Legal rejects the revised terms, we’ll be back to square one.", "Usually used as “be back to square one” or “go back to square one” when previous progress has been lost.", ["be back to square one", "go back to square one", "put us back to square one"], ["start again", "back to the beginning", "lost progress", "from the beginning", "从头再来", "回到起点"]),
  versatile: entry("versatile", "able to be used in many different ways or to do many different things well", "多用途的；多才多艺的", "/ˈvɝː.sə.t̬əl/", "adjective", "This framework is versatile enough for both product launches and internal planning.", "For a tool or product, it means flexible and useful in different situations; for a person, it means capable in several areas.", ["highly versatile", "versatile tool", "versatile team member"], ["useful in many ways", "flexible", "many purposes", "adaptable", "多用途", "多才多艺"]),
  adequate: entry("adequate", "good enough or sufficient for a particular need, though not necessarily excellent", "足够的；合格的", "/ˈæd.ə.kwət/", "adjective", "The current staffing level is adequate for the pilot, but not for a full rollout.", "It means the requirement is met, but it can sound less positive than “good” or “excellent.”", ["adequate resources", "adequate time", "more than adequate"], ["enough", "sufficient", "meets the need", "acceptable", "足够", "合格"]),
  substantial: entry("substantial", "large or important in amount, size, or effect", "大量的；重大的；可观的", "/səbˈstæn.ʃəl/", "adjective", "The redesign requires a substantial investment, but it should reduce support costs.", "A professional, stronger alternative to “big” when describing an amount, change, effect, or piece of work.", ["substantial impact", "substantial increase", "substantial amount"], ["large", "considerable", "significant", "important", "大量", "重大"]),
  exceptional: entry("exceptional", "unusually excellent or much better than average", "卓越的；非凡的", "/ɪkˈsep.ʃən.əl/", "adjective", "Jordan did an exceptional job translating the research into a clear recommendation.", "This is strong praise. In other contexts it can mean unusual, but in workplace feedback it often means excellent.", ["exceptional work", "exceptional performance", "exceptional circumstances"], ["excellent", "outstanding", "much better than average", "remarkable", "卓越", "非凡"]),
  "i don't buy it": entry("I don’t buy it", "an informal way to say you do not believe or accept an explanation, claim, or argument", "我不相信；我不认同这个说法", "/aɪ doʊnt baɪ ɪt/", "idiom", "The forecast assumes demand will double with no extra marketing—I don’t buy it.", "This is direct and can sound confrontational at work. “I’m not convinced” is a softer alternative.", ["I don’t buy that", "I’m not buying it", "do you buy that explanation?"], ["do not believe", "not convinced", "do not accept", "skeptical", "不相信", "不认同"]),
  "i'm just messing with you": entry("I’m just messing with you", "an informal way to say you were joking or teasing and did not mean it seriously", "我只是逗你；跟你开玩笑", "/aɪm dʒʌst ˈmes.ɪŋ wɪð juː/", "idiom", "Relax—I’m just messing with you. Your presentation went really well.", "Use this only in casual, friendly relationships; avoid it in formal or high-stakes workplace conversations.", ["just messing with you", "messing around", "don’t mess with me"], ["joking", "teasing", "not serious", "playing around", "开玩笑", "逗你"]),
  "what have you gotten yourself into": entry("What have you gotten yourself into?", "a question asking what difficult, risky, or complicated situation someone has become involved in", "你把自己卷进什么麻烦里了？", "/wʌt hæv juː ˈɡɑː.tən jɚˈself ˈɪn.tuː/", "idiomatic question", "You volunteered to coordinate three launches at once—what have you gotten yourself into?", "It can express genuine concern or playful disbelief. “Gotten” is the common American English form here.", ["get yourself into trouble", "what did I get myself into?", "get into a difficult situation"], ["what trouble", "difficult situation", "become involved", "risky", "麻烦", "卷进"]),
  "you've got to be kidding me": entry("You’ve got to be kidding me", "a strong informal reaction showing disbelief, surprise, or frustration", "你一定是在开玩笑吧；太难以置信了", "/juːv ɡɑːt tə biː ˈkɪd.ɪŋ miː/", "idiom", "You’ve got to be kidding me—the client moved the deadline to tomorrow?", "This is casual and emotionally strong, and it may sound annoyed. “That’s surprising” is a softer workplace alternative.", ["you’ve got to be kidding", "are you kidding me?", "you must be joking"], ["cannot believe", "disbelief", "surprise", "must be joking", "难以置信", "开玩笑"]),
  "get to the root of the problem": entry("get to the root of the problem", "to discover and address the fundamental cause of a problem, not just its symptoms", "找到问题的根本原因；追根究底", "/ɡet tə ðə ruːt əv ðə ˈprɑː.bləm/", "idiom", "Let’s review the customer logs to get to the root of the problem before we propose another fix.", "Use this when the goal is root-cause analysis. A shorter workplace version is “find the root cause.”", ["get to the root of the problem", "find the root cause", "address the underlying issue"], ["fundamental cause", "root cause", "underlying issue", "not just symptoms", "根本原因", "追根究底"]),
  "hit a roadblock": entry("hit a roadblock", "to encounter a problem that prevents or significantly delays progress", "遇到阻碍；进展受阻", "/hɪt ə ˈroʊd.blɑːk/", "idiom", "We hit a roadblock when the security review uncovered a new compliance requirement.", "Name the roadblock and the help you need so the phrase leads to action rather than sounding vague.", ["hit a roadblock", "run into a roadblock", "remove the roadblock"], ["encounter a problem", "preventing progress", "blocked", "delay", "遇到阻碍", "进展受阻"]),
  "low on the totem pole": entry("low on the totem pole", "having relatively little authority, status, or priority in an organization", "在组织中地位较低；优先级较低", "/loʊ ɑːn ðə ˈtoʊ.t̬əm poʊl/", "idiom", "As the newest analyst, I felt low on the totem pole and had little influence over the decision.", "This does not mean “very busy.” The expression can be culturally insensitive and is best replaced with precise language such as “junior,” “low priority,” or “with limited decision authority.”", ["low in the hierarchy", "junior team member", "low priority"], ["low rank", "little authority", "low status", "low priority", "地位较低", "优先级较低"]),
  swamped: entry("swamped", "extremely busy or overwhelmed by a large amount of work", "忙得不可开交；被工作压得喘不过气", "/swɑːmpt/", "adjective", "I’m swamped with launch work today, but I can review the proposal tomorrow morning.", "Informal but common at work. Add a time or next step so it does not sound like a vague refusal.", ["swamped with work", "completely swamped", "a swamped team"], ["very busy", "overwhelmed", "too much work", "no capacity", "忙不过来", "忙得不可开交"]),
};

const normalizeTerm = (term: string) => term.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").replace(/[.!?]+$/, "");

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
