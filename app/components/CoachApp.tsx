"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { analyzeTranscript, evaluateAnswer, SAMPLE_TRANSCRIPT } from "../lib/mock-ai";
import { enrichVocabularyItem } from "../lib/dictionary";
import { calculateEnglishProfile } from "../lib/english-profile";
import type { PracticeEvidence } from "../lib/english-profile";
import { calculateGoalProgress, createDefaultGoal, isLearningGoal } from "../lib/goal-progress";
import { roadmap, speakingExercise, weeklyFocus } from "../lib/learning-plan";
import { applyVocabularyReview, evaluateVocabularyResponse, formatNextReview, initialReviewPlan, isVocabularyDue, normalizeVocabularyItem } from "../lib/spaced-repetition";
import { supabase } from "../lib/supabase";
import type { Candidate, LearningGoal, View, VocabularyEvaluation, VocabularyItem, VocabularyReviewAttempt } from "../lib/types";

type ImportPurpose = "listening" | "speaking";
type PracticeLane = "today" | "vocabulary" | "understand" | "express";
type QuickSaveState = "idle" | "saving" | "error";
type MemoryLoadState = "loading" | "ready" | "error";
type IconName = "home" | "listen" | "speak" | "me" | "plus" | "text" | "record" | "arrow" | "book" | "clock" | "spark" | "back" | "upload" | "check" | "lock";

const glyphs: Record<IconName, string> = {
  home: "⌂", listen: "◒", speak: "◉", me: "○", plus: "+", text: "≡", record: "●", arrow: "→", book: "▤", clock: "◷", spark: "✦", back: "←", upload: "↥", check: "✓", lock: "⌁",
};

function Icon({ name }: { name: IconName }) { return <span aria-hidden="true">{glyphs[name]}</span>; }

function ProgressRing({ value }: { value: number }) {
  return <span className="ring" style={{ "--progress": `${value * 3.6}deg` } as React.CSSProperties}><span>{value}%</span></span>;
}

function tabFor(view: View) {
  if (view === "add" || view === "import") return "add";
  if (["practice", "today", "sentence", "review", "vocabulary", "speaking-practice"].includes(view)) return "practice";
  if (["me", "roadmap"].includes(view)) return "me";
  return "home";
}

const legacyDemoIds = new Set(["workaround", "hold-off", "contingency"]);

function isLegacyDemoItem(item: VocabularyItem) {
  return legacyDemoIds.has(item.id)
    && item.source === "Launch Readiness Sync"
    && item.discoveredAt === "Aug 20, 2026";
}

function createQuickVocabularyItem(term: string): VocabularyItem {
  return {
    id: `${term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "word"}-${Date.now()}`,
    term,
    definition: "Looking up a trusted definition…",
    sentence: "Quick-added during work — no original sentence captured.",
    context: "Saved without interrupting your workflow.",
    source: "Quick Add",
    sourceType: "work",
    hasOriginalContext: false,
    tags: ["From work"],
    discoveredAt: "Today",
    reason: "You saved this as unfamiliar during work.",
    explanation: "A trusted definition is being added.",
    newExample: "A workplace example is being added.",
    pronunciation: "Looking up…",
    enrichmentStatus: "pending",
    review: initialReviewPlan(),
    status: "Unknown",
    mastery: { recognition: 5, contextual: 0, listening: 0, recall: 0, activeUse: 0, pronunciation: 0 },
    due: false,
  };
}

export function CoachApp({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<View>("home");
  const [quickWord, setQuickWord] = useState("");
  const [quickSaveState, setQuickSaveState] = useState<QuickSaveState>("idle");
  const [quickSaveError, setQuickSaveError] = useState("");
  const [quickSaveDraft, setQuickSaveDraft] = useState<VocabularyItem | null>(null);
  const [lastSavedTerm, setLastSavedTerm] = useState("");
  const [toast, setToast] = useState("");
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [importPurpose, setImportPurpose] = useState<ImportPurpose>("listening");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [answerMode, setAnswerMode] = useState<"choice" | "explain" | "result">("choice");
  const [selfRating, setSelfRating] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceRevealed, setPracticeRevealed] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceEvaluation, setPracticeEvaluation] = useState<VocabularyEvaluation | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<VocabularyItem[]>([]);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [speakingAttempt, setSpeakingAttempt] = useState("");
  const [speakingResult, setSpeakingResult] = useState<"" | "strong" | "retry">("");
  const [speakingAnalyzed, setSpeakingAnalyzed] = useState(false);
  const [practiceLane, setPracticeLane] = useState<PracticeLane>("today");
  const [cloudState, setCloudState] = useState<"connecting" | "synced" | "error">("connecting");
  const [memoryLoadState, setMemoryLoadState] = useState<MemoryLoadState>("loading");
  const [memoryVerifiedAt, setMemoryVerifiedAt] = useState<string | null>(null);
  const [memoryReloadToken, setMemoryReloadToken] = useState(0);
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(() => createDefaultGoal());
  const [practiceEvidence, setPracticeEvidence] = useState<PracticeEvidence[]>([]);
  const [goalSaving, setGoalSaving] = useState(false);

  const currentCandidate = candidates[candidateIndex];
  const dueItems = useMemo(() => vocabulary.filter((item) => isVocabularyDue(item)), [vocabulary]);
  const recentQuickWords = useMemo(() => vocabulary.filter((item) => item.source === "Quick Add").slice(0, 4), [vocabulary]);
  const activeTab = tabFor(view);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.from("vocabulary_items").select("item_data").eq("user_id", user.id).order("updated_at", { ascending: false }).then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        setCloudState("error");
        setMemoryLoadState("error");
        return;
      }
      const loaded = (data ?? [])
        .map((row) => normalizeVocabularyItem(row.item_data as VocabularyItem))
        .filter((item) => !isLegacyDemoItem(item));
      setVocabulary(loaded);
      setCloudState("synced");
      setMemoryLoadState("ready");
      setMemoryVerifiedAt(new Date().toISOString());

      const pending = loaded.filter((item) => item.enrichmentStatus === "pending" || item.definition === "Pending enrichment");
      for (const item of pending) {
        const enriched = normalizeVocabularyItem(await enrichVocabularyItem(item));
        if (!active) return;
        const { error: enrichmentError } = await supabase!.from("vocabulary_items").upsert({ id: enriched.id, user_id: user.id, item_data: enriched, updated_at: new Date().toISOString() }, { onConflict: "user_id,id" });
        if (!active) return;
        if (enrichmentError) {
          setCloudState("error");
        } else {
          setVocabulary((items) => items.map((entry) => entry.id === enriched.id ? enriched : entry));
        }
      }
    });
    return () => { active = false; };
  }, [user.id, memoryReloadToken]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.from("practice_sessions").select("mode, results, started_at").order("started_at", { ascending: false }).limit(200).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setCloudState("error");
        return;
      }
      const sessions = data ?? [];
      const goalEvent = sessions.find((session) => {
        const results = session.results as { kind?: unknown } | null;
        return results?.kind === "learning_goal";
      });
      const savedGoal = (goalEvent?.results as { goal?: unknown } | undefined)?.goal;
      if (isLearningGoal(savedGoal)) setLearningGoal(savedGoal);
      setPracticeEvidence(sessions.filter((session) => {
        const results = session.results as { kind?: unknown } | null;
        return results?.kind !== "learning_goal";
      }).map((session) => ({
        mode: session.mode === "speaking" ? "speaking" : "listening",
        startedAt: session.started_at ?? new Date(0).toISOString(),
        results: (session.results ?? {}) as PracticeEvidence["results"],
      })));
    });
    return () => { active = false; };
  }, [user.id]);

  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const navigate = (next: View) => {
    if (next === "today") {
      setPracticeQueue(dueItems.slice(0, 5));
      setPracticeIndex(0); setPracticeComplete(false); setPracticeAnswer(""); setPracticeRevealed(false); setPracticeEvaluation(null);
    }
    setView(next); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startImport = (purpose: ImportPurpose) => { setImportPurpose(purpose); navigate("import"); };

  const verifyAccountMemory = () => {
    if (memoryLoadState === "loading") return;
    setMemoryLoadState("loading");
    setCloudState("connecting");
    setMemoryReloadToken((token) => token + 1);
  };

  const saveVocabulary = async (item: VocabularyItem, quiet = false) => {
    if (!supabase) return null;
    const { error: writeError } = await supabase.from("vocabulary_items")
      .upsert({ id: item.id, user_id: user.id, item_data: item, updated_at: new Date().toISOString() }, { onConflict: "user_id,id" });
    if (writeError) {
      setCloudState("error");
      if (!quiet) flash("Not saved yet · check your connection and retry");
      return null;
    }
    const { data: readBack, error: readError } = await supabase.from("vocabulary_items")
      .select("item_data")
      .eq("user_id", user.id)
      .eq("id", item.id)
      .single();
    const confirmed = readBack ? normalizeVocabularyItem(readBack.item_data as VocabularyItem) : null;
    if (readError || !confirmed || confirmed.id !== item.id || confirmed.term !== item.term) {
      setCloudState("error");
      if (!quiet) flash("Not verified yet · check your connection and retry");
      return null;
    }
    setCloudState("synced");
    setMemoryVerifiedAt(new Date().toISOString());
    return confirmed;
  };

  const saveLearningGoal = async (goal: LearningGoal) => {
    setLearningGoal(goal);
    if (!supabase) { flash("12-week goal updated"); return; }
    setGoalSaving(true);
    const { error } = await supabase.from("practice_sessions").insert({
      user_id: user.id,
      mode: "speaking",
      results: { kind: "learning_goal", goal },
      completed_at: new Date().toISOString(),
    });
    setGoalSaving(false);
    if (error) {
      setCloudState("error");
      flash("Goal updated here; account sync needs attention");
    } else {
      setCloudState("synced");
      flash("12-week goal saved to your account");
    }
  };

  const addQuickWord = async () => {
    const term = quickWord.trim();
    if (!term || memoryLoadState !== "ready" || quickSaveState === "saving") return;
    const existing = vocabulary.find((item) => item.term.toLowerCase() === term.toLowerCase());
    if (existing) {
      setQuickWord("");
      setQuickSaveDraft(null);
      setQuickSaveState("idle");
      setLastSavedTerm("");
      flash(`“${existing.term}” is already in your account`);
      return;
    }
    const reusableDraft = quickSaveDraft?.term.toLowerCase() === term.toLowerCase() ? quickSaveDraft : null;
    const newItem = reusableDraft ?? createQuickVocabularyItem(term);
    setQuickSaveDraft(newItem);
    setQuickSaveState("saving");
    setQuickSaveError("");
    const confirmedItem = await saveVocabulary(newItem, true);
    if (!confirmedItem) {
      setQuickSaveState("error");
      setQuickSaveError(`“${term}” was not saved. Your text is still here—tap Retry.`);
      return;
    }

    setVocabulary((items) => [confirmedItem, ...items.filter((item) => item.id !== confirmedItem.id)]);
    setQuickWord("");
    setQuickSaveDraft(null);
    setQuickSaveState("idle");
    setLastSavedTerm(term);
    flash(`“${term}” saved to your account`);

    const enriched = normalizeVocabularyItem(await enrichVocabularyItem(newItem));
    const enrichmentConfirmed = await saveVocabulary(enriched, true);
    if (enrichmentConfirmed) {
      setVocabulary((items) => items.map((item) => item.id === enrichmentConfirmed.id ? enrichmentConfirmed : item));
      flash(enriched.enrichmentStatus === "ready" ? `“${term}” is ready to learn` : `“${term}” is safe · add context when ready`);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    if (supabase) await supabase.from("conversations").insert({ user_id: user.id, title: "Launch Readiness Sync", transcript, source_type: "transcript" });
    if (importPurpose === "speaking") {
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      setSpeakingAnalyzed(true); setPracticeLane("express"); setLoading(false); navigate("practice"); flash("Your communication diagnosis is ready");
      return;
    }
    const found = await analyzeTranscript(transcript);
    setCandidates(found); setLoading(false); setCandidateIndex(0); setAnswerMode("choice"); navigate("review");
  };

  const chooseKnowledge = (rating: string) => {
    setSelfRating(rating);
    if (rating === "I don’t know it") { setResult("Unknown"); setAnswerMode("result"); void addCandidate(currentCandidate, "Unknown"); }
    else setAnswerMode("explain");
  };
  const addCandidate = async (item: Candidate, status = "Learning") => {
    const saved = normalizeVocabularyItem({ ...item, sourceType: "work", hasOriginalContext: true, tags: ["From work"], enrichmentStatus: "ready", review: initialReviewPlan(), status: status as VocabularyItem["status"] });
    const confirmed = await saveVocabulary(saved, true);
    if (!confirmed) {
      flash(`“${item.term}” was not added · retry when account memory reconnects`);
      return;
    }
    setVocabulary((items) => items.some((entry) => entry.id === item.id) ? items : [confirmed, ...items]);
  };
  const submitAnswer = () => { const evaluation = evaluateAnswer(answer, currentCandidate); setResult(evaluation); setAnswerMode("result"); if (evaluation !== "Correct") void addCandidate(currentCandidate); };
  const nextCandidate = () => {
    if (candidateIndex < candidates.length - 1) { setCandidateIndex((index) => index + 1); setAnswerMode("choice"); setAnswer(""); setResult(""); setSelfRating(""); }
    else { navigate("vocabulary"); flash("Candidate check complete"); }
  };

  const completeVocabularyReview = async (evaluation: VocabularyEvaluation, promptType: VocabularyReviewAttempt["promptType"]) => {
    const item = practiceQueue[practiceIndex];
    if (item) {
      const updated = applyVocabularyReview(item, practiceAnswer, evaluation, promptType);
      const confirmed = await saveVocabulary(updated, true);
      if (!confirmed) {
        flash("Review not saved · reconnect and tap Continue again");
        return;
      }
      setVocabulary((all) => all.map((entry) => entry.id === confirmed.id ? confirmed : entry));
      const alreadyQueuedAgain = practiceQueue.slice(practiceIndex + 1).some((entry) => entry.id === item.id);
      const timesShown = practiceQueue.slice(0, practiceIndex + 1).filter((entry) => entry.id === item.id).length;
      const repeatThisSession = (evaluation === "incorrect" || evaluation === "unknown") && !alreadyQueuedAgain && timesShown === 1 && practiceQueue.length < 8;
      if (repeatThisSession) setPracticeQueue((queue) => [...queue, confirmed]);
      const finalLength = practiceQueue.length + (repeatThisSession ? 1 : 0);
      if (practiceIndex >= finalLength - 1) {
        setPracticeComplete(true);
        const startedAt = new Date().toISOString();
        const evidence: PracticeEvidence = { mode: "listening", startedAt, results: { itemCount: practiceIndex + 1, finalEvaluation: evaluation } };
        setPracticeEvidence((sessions) => [evidence, ...sessions]);
        if (supabase) void supabase.from("practice_sessions").insert({ user_id: user.id, mode: evidence.mode, results: evidence.results, completed_at: startedAt });
      } else setPracticeIndex((index) => index + 1);
    }
    setPracticeAnswer(""); setPracticeRevealed(false); setPracticeEvaluation(null);
  };

  const evaluateSpeakingAttempt = () => {
    const normalized = speakingAttempt.toLowerCase();
    const hits = speakingExercise.keywords.filter((keyword) => normalized.includes(keyword)).length;
    const outcome = hits >= 3 && speakingAttempt.split(/\s+/).length <= 38 ? "strong" : "retry";
    setSpeakingResult(outcome);
    const startedAt = new Date().toISOString();
    const evidence: PracticeEvidence = { mode: "speaking", startedAt, results: { focus: weeklyFocus[0].title, outcome } };
    setPracticeEvidence((sessions) => [evidence, ...sessions]);
    if (supabase) void supabase.from("practice_sessions").insert({ user_id: user.id, mode: evidence.mode, results: { ...evidence.results, attempt: speakingAttempt }, completed_at: startedAt });
  };

  return <div className="app-shell app-v2">
    <AppHeader activeTab={activeTab} cloudState={cloudState} navigate={navigate} />
    {view === "home" && <Home navigate={navigate} dueCount={dueItems.length} newLearner={vocabulary.length === 0} />}
    {view === "add" && <AddPage quickWord={quickWord} setQuickWord={(value) => { setQuickWord(value); if (quickSaveState === "error") { setQuickSaveState("idle"); setQuickSaveError(""); } }} addQuickWord={addQuickWord} quickSaveState={quickSaveState} quickSaveError={quickSaveError} memoryLoadState={memoryLoadState} memoryVerifiedAt={memoryVerifiedAt} accountEmail={user.email ?? "Signed-in account"} personalWordCount={vocabulary.length} verifyAccountMemory={verifyAccountMemory} lastSavedTerm={lastSavedTerm} recentQuickWords={recentQuickWords} startImport={startImport} navigate={navigate} />}
    {view === "practice" && <PracticeHub lane={practiceLane} setLane={setPracticeLane} navigate={navigate} dueCount={dueItems.length} analyzed={speakingAnalyzed} />}
    {view === "me" && <MePage user={user} cloudState={cloudState} vocabulary={vocabulary} goal={learningGoal} practiceEvidence={practiceEvidence} goalSaving={goalSaving} saveGoal={saveLearningGoal} navigate={navigate} onSignOut={onSignOut} />}
    {view === "import" && <ImportPage purpose={importPurpose} transcript={transcript} setTranscript={setTranscript} runAnalysis={runAnalysis} loading={loading} navigate={navigate} />}
    {view === "review" && currentCandidate && <CandidateReview item={currentCandidate} index={candidateIndex} total={candidates.length} mode={answerMode} choose={chooseKnowledge} selfRating={selfRating} answer={answer} setAnswer={setAnswer} submit={submitAnswer} result={result} next={nextCandidate} navigate={navigate} />}
    {view === "vocabulary" && <VocabularyPage items={vocabulary} navigate={navigate} />}
    {view === "today" && <TodayListening items={practiceQueue} index={practiceIndex} answer={practiceAnswer} setAnswer={setPracticeAnswer} revealed={practiceRevealed} setRevealed={setPracticeRevealed} evaluation={practiceEvaluation} setEvaluation={setPracticeEvaluation} complete={practiceComplete} completeReview={completeVocabularyReview} restart={() => { setPracticeIndex(0); setPracticeComplete(false); setPracticeRevealed(false); setPracticeEvaluation(null); }} navigate={navigate} />}
    {view === "sentence" && <SentencePractice navigate={navigate} />}
    {view === "speaking-practice" && <SpeakingPractice attempt={speakingAttempt} setAttempt={setSpeakingAttempt} result={speakingResult} evaluate={evaluateSpeakingAttempt} reset={() => { setSpeakingAttempt(""); setSpeakingResult(""); }} navigate={navigate} />}
    {view === "roadmap" && <RoadmapPage navigate={navigate} />}
    <BottomNavigation activeTab={activeTab} navigate={navigate} />
    {toast && <div className="toast" role="status" aria-live="polite"><Icon name="spark" /> {toast}</div>}
  </div>;
}

function AppHeader({ activeTab, cloudState, navigate }: { activeTab: string; cloudState: string; navigate: (view: View) => void }) {
  const titles: Record<string, string> = { home: "Today", add: "Add", practice: "Practice", me: "Me" };
  return <header className="app-header"><button className="brand compact" onClick={() => navigate("home")} aria-label="Encher home"><span className="brand-mark">e</span></button><b>{titles[activeTab]}</b><button className="header-profile" onClick={() => navigate("me")} aria-label="Open profile"><span className={`sync-dot ${cloudState}`} /><Icon name="me" /></button></header>;
}

function BottomNavigation({ activeTab, navigate }: { activeTab: string; navigate: (view: View) => void }) {
  const tabs: { id: string; label: string; icon: IconName; view: View }[] = [
    { id: "home", label: "Home", icon: "home", view: "home" },
    { id: "add", label: "Add", icon: "plus", view: "add" },
    { id: "practice", label: "Practice", icon: "book", view: "practice" },
    { id: "me", label: "Me", icon: "me", view: "me" },
  ];
  return <nav className="app-nav" aria-label="App navigation">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? "active" : ""} aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => navigate(tab.view)}><Icon name={tab.icon} /><small>{tab.label}</small></button>)}</nav>;
}

function Home({ navigate, dueCount, newLearner }: { navigate: (view: View) => void; dueCount: number; newLearner: boolean }) {
  return <main className="app-page home-v2"><section className="home-intro"><span className="eyebrow">WEEK 1 · BUILDING YOUR FOUNDATION</span><h1>One useful improvement today.</h1><p>Your practice is selected from the communication problems with the highest impact at work.</p></section><section className="mission-card"><div className="mission-top"><span><Icon name="speak" /></span><small>BEST NEXT STEP · 10 MIN</small></div><h2>Make your recommendation clear in the first sentence.</h2><p>You explain useful context, but coworkers sometimes have to infer what you want them to do.</p><button onClick={() => navigate("speaking-practice")}>Start focused practice <Icon name="arrow" /></button><div className="why-row"><Icon name="spark" /><span><b>Why this now</b>High communication impact · found 3 times</span></div></section>{newLearner && <section className="first-week-card"><Icon name="spark" /><div><b>Build your learner model this week</b><p>1. Add one real meeting transcript &nbsp; 2. Practice for 10 minutes &nbsp; 3. Bring in the next meeting so Encher can verify improvement.</p></div></section>}<section className="home-quick"><div className="section-heading"><h2>Bring in today’s work</h2><span>20 seconds</span></div><div className="single-action"><button onClick={() => navigate("add")}><Icon name="plus" /><span><b>Add words or meeting content</b><small>Capture what you heard or diagnose what you said</small></span><Icon name="arrow" /></button></div></section><section className="practice-pulse"><button onClick={() => navigate("today")}><span><Icon name="book" /></span><div><small>VOCABULARY READY</small><b>{dueCount} words need review</b><p>About 6 minutes</p></div><Icon name="arrow" /></button><button onClick={() => navigate("sentence")}><span><Icon name="listen" /></span><div><small>UNDERSTAND</small><b>Understand the whole idea</b><p>2 meeting sentences</p></div><Icon name="arrow" /></button></section><section className="transfer-note"><Icon name="check" /><p><b>Workplace transfer detected</b>You used “trade-off” naturally in Tuesday’s product review.</p><button onClick={() => navigate("vocabulary")}>View</button></section></main>;
}

function AddPage({ quickWord, setQuickWord, addQuickWord, quickSaveState, quickSaveError, memoryLoadState, memoryVerifiedAt, accountEmail, personalWordCount, verifyAccountMemory, lastSavedTerm, recentQuickWords, startImport, navigate }: { quickWord: string; setQuickWord: (value: string) => void; addQuickWord: () => Promise<void>; quickSaveState: QuickSaveState; quickSaveError: string; memoryLoadState: MemoryLoadState; memoryVerifiedAt: string | null; accountEmail: string; personalWordCount: number; verifyAccountMemory: () => void; lastSavedTerm: string; recentQuickWords: VocabularyItem[]; startImport: (purpose: ImportPurpose) => void; navigate: (view: View) => void }) {
  const saving = quickSaveState === "saving";
  const memoryReady = memoryLoadState === "ready";
  const verificationTime = memoryVerifiedAt ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(memoryVerifiedAt)) : "Not verified";
  return <main className="app-page add-page">
    <section className="tab-intro"><span className="eyebrow">CAPTURE FROM REAL WORK</span><h1>Add</h1><p>Save the moment now. Encher will turn it into the right kind of practice.</p></section>
    <section className={`account-memory-proof ${memoryLoadState}`} aria-live="polite">
      <span className="memory-proof-icon">{memoryLoadState === "loading" ? <span className="memory-spinner" /> : memoryLoadState === "ready" ? <Icon name="check" /> : "!"}</span>
      <div><small>YOUR ACCOUNT MEMORY</small><b>{memoryLoadState === "loading" ? "Checking your private cloud memory…" : memoryLoadState === "error" ? "Could not verify account memory" : `${personalWordCount} personal ${personalWordCount === 1 ? "word" : "words"} verified`}</b><p>{memoryLoadState === "error" ? "Your personal words are not replaced with samples. Reconnect and verify again." : `${accountEmail} · ${memoryLoadState === "ready" ? `read from cloud at ${verificationTime}` : "checking now"}`}</p></div>
      <button type="button" disabled={memoryLoadState === "loading"} onClick={verifyAccountMemory}>{memoryLoadState === "loading" ? "Checking…" : memoryLoadState === "error" ? "Retry" : "Verify now"}</button>
    </section>
    <section className="capture-hub add-word-card">
      <span className="section-kicker">QUICK WORD OR PHRASE</span><h2>Add it before you forget it.</h2>
      <div className="inline-save"><input value={quickWord} disabled={saving || !memoryReady} onChange={(event) => setQuickWord(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addQuickWord(); }} aria-label="Quick add a word or phrase" placeholder={memoryReady ? "e.g. walk it back" : memoryLoadState === "error" ? "Reconnect to save safely" : "Opening your account memory…"} /><button disabled={!quickWord.trim() || saving || !memoryReady} onClick={() => void addQuickWord()}>{saving ? "Saving…" : quickSaveState === "error" ? "Retry" : "Save"}</button></div>
      {memoryLoadState === "loading" && <div className="memory-save-status syncing" role="status"><span className="memory-spinner" /><div><b>Opening your account memory…</b><p>Add becomes available after your saved words finish loading.</p></div></div>}
      {memoryLoadState === "error" && <div className="memory-save-status error" role="alert"><span>!</span><div><b>Memory unavailable</b><p>Nothing new can be saved until your account database is verified.</p></div><button type="button" onClick={verifyAccountMemory}>Retry</button></div>}
      {quickSaveState === "error" && <div className="memory-save-status error" role="alert"><span>!</span><div><b>Not saved yet</b><p>{quickSaveError}</p></div><button type="button" onClick={() => void addQuickWord()}>Retry</button></div>}
      {lastSavedTerm && quickSaveState !== "error" && <div className="memory-save-status saved" role="status"><Icon name="check" /><div><b>Saved and read back</b><p>“{lastSavedTerm}” was written to {accountEmail}, then independently read back.</p></div><button type="button" onClick={() => navigate("vocabulary")}>View</button></div>}
      <p>“Saved” means Encher wrote the word, then independently read the same word back from your private account.</p>
    </section>

    <section className="recent-memory">
      <div className="section-heading"><h2>Recently saved</h2><span>Account memory</span></div>
      {recentQuickWords.length ? <div>{recentQuickWords.map((item) => <button key={item.id} type="button" onClick={() => navigate("vocabulary")}><span><b>{item.term}</b><small>{item.enrichmentStatus === "pending" ? "Saved · adding meaning…" : item.definition}</small></span><em><Icon name="check" /> Saved</em><Icon name="arrow" /></button>)}</div> : <div className="recent-memory-empty"><Icon name="book" /><span><b>No quick-added words yet</b><small>Your confirmed saves will appear here immediately.</small></span></div>}
    </section>

    <section className="add-sources"><div className="section-heading"><h2>Add meeting content</h2><span>Paste text for V1</span></div><button onClick={() => startImport("listening")}><span className="add-source-icon heard"><Icon name="listen" /></span><div><b>Something I didn’t understand</b><p>Paste a coworker or meeting transcript. Find vocabulary and sentence-level meaning gaps.</p><small>Creates Vocabulary + Understand practice</small></div><Icon name="arrow" /></button><button onClick={() => startImport("speaking")}><span className="add-source-icon said"><Icon name="speak" /></span><div><b>Something I said</b><p>Paste a speaker-labeled transcript. Diagnose clarity, grammar, structure, and naturalness.</p><small>Creates Express practice</small></div><Icon name="arrow" /></button><button className="disabled-action" disabled><span className="add-source-icon"><Icon name="record" /></span><div><b>Record a meeting</b><p>Audio transcription, listening recognition, fluency, and pronunciation arrive in V2.</p><small>Audio · V2</small></div><em>SOON</em></button></section>
    <section className="add-after"><Icon name="lock" /><div><b>Private by default</b><p>Raw meeting material stays tied to your account and separate from derived learning items.</p></div></section>
  </main>;
}

function PracticeHub({ lane, setLane, navigate, dueCount, analyzed }: { lane: PracticeLane; setLane: (lane: PracticeLane) => void; navigate: (view: View) => void; dueCount: number; analyzed: boolean }) {
  const tabs: { id: PracticeLane; label: string }[] = [{ id: "today", label: "Today" }, { id: "vocabulary", label: "Vocabulary" }, { id: "understand", label: "Understand" }, { id: "express", label: "Express" }];
  return <main className="app-page practice-hub"><section className="practice-intro"><span className="eyebrow">PRACTICE FROM YOUR REAL WORK</span><h1>Practice</h1><p>Choose an outcome, not a school subject. Grammar and pronunciation appear only when they help the real communication problem.</p></section><div className="practice-tabs" role="tablist" aria-label="Practice type">{tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={lane === tab.id} className={lane === tab.id ? "active" : ""} onClick={() => setLane(tab.id)}>{tab.label}</button>)}</div><section className="practice-lane" role="tabpanel">
    {lane === "today" && <><section className="mission-card"><div className="mission-top"><span><Icon name="speak" /></span><small>AI-PICKED · HIGHEST IMPACT</small></div><h2>Make your recommendation clear in the first sentence.</h2><p>This pattern has the greatest effect on whether coworkers understand what you want.</p><button onClick={() => navigate("speaking-practice")}>Start today’s 10-minute practice <Icon name="arrow" /></button><div className="why-row"><Icon name="spark" /><span><b>Why this now</b>Impact 5/5 · found 3 times · foundational</span></div></section><div className="practice-menu"><button onClick={() => setLane("vocabulary")}><span><Icon name="book" /></span><div><b>Vocabulary</b><small>{dueCount} words due · meaning and active recall</small></div><Icon name="arrow" /></button><button onClick={() => setLane("understand")}><span><Icon name="listen" /></span><div><b>Understand</b><small>2 sentences · speaker intention and context</small></div><Icon name="arrow" /></button><button onClick={() => setLane("express")}><span><Icon name="speak" /></span><div><b>Express</b><small>1 focus · clarity, structure, and naturalness</small></div><Icon name="arrow" /></button></div></>}
    {lane === "vocabulary" && <><section className="priority-practice listen-practice"><div><span className="section-kicker">VOCABULARY · 6 MIN</span><h2>{dueCount} items selected for you</h2><p>Meaning in context, active recall, and use in a new workplace situation.</p><div className="practice-tags"><span>Due today</span><span>From your meetings</span><span>Adaptive review</span></div></div><button onClick={() => navigate("today")}>Start vocabulary practice <Icon name="arrow" /></button></section><section className="practice-support"><button onClick={() => navigate("vocabulary")}><span><Icon name="book" /></span><div><b>My Vocabulary</b><small>See source context and mastery by dimension</small></div><Icon name="arrow" /></button></section></>}
    {lane === "understand" && <><section className="priority-practice understand-practice"><div><span className="section-kicker">UNDERSTAND · 5 MIN</span><h2>Understand the whole idea</h2><p>Practice what a coworker meant—not a word-by-word translation.</p><div className="practice-tags"><span>Speaker intent</span><span>Meeting context</span><span>2 ready</span></div></div><button onClick={() => navigate("sentence")}>Start sentence practice <Icon name="arrow" /></button></section><section className="sentence-preview"><small>FROM PRODUCT LAUNCH READINESS</small><blockquote>“Let’s pressure-test the rollout assumptions before we socialize the plan.”</blockquote><p>Can you explain what action Sarah wants next?</p></section></>}
    {lane === "express" && <><section className="priority-practice speak-practice"><div><span className="section-kicker">EXPRESS · HIGH IMPACT</span><h2>Lead with the recommendation</h2><p>Fix clarity, grammar, and natural workplace English inside one real communication task.</p><div className="practice-tags"><span>Impact 5/5</span><span>Frequency 3×</span><span>Retest in 3 days</span></div></div><button onClick={() => navigate("speaking-practice")}>Start expression practice <Icon name="arrow" /></button></section>{analyzed && <div className="analysis-ready"><Icon name="check" /><span><b>New transcript analyzed</b>Your recurring patterns and practice priority were updated.</span></div>}<section className="error-map-preview"><div className="section-heading"><h2>My English Error Map</h2><span>Last 30 days</span></div>{weeklyFocus.map((focus, index) => <article key={focus.title}><span className={index === 0 ? "high" : "medium"} /><div><b>{focus.title}</b><p>{focus.why}</p><small>{focus.evidence}</small></div><em>{index === 0 ? "High" : "Medium"}</em></article>)}</section><section className="intent-preview"><span className="section-kicker">INFORMATION LOSS</span><h2>What you meant ≠ what the listener heard</h2><p>Your latest example made it unclear whether the launch, announcement, or both should wait.</p><button onClick={() => navigate("speaking-practice")}>Practice the clearer version <Icon name="arrow" /></button></section><p className="honesty-note">Pronunciation joins Express when audio arrives in V2. Text currently evaluates grammar, vocabulary, clarity, structure, and naturalness.</p></>}
  </section></main>;
}

function MePage({ user, cloudState, vocabulary, goal, practiceEvidence, goalSaving, saveGoal, navigate, onSignOut }: { user: User; cloudState: string; vocabulary: VocabularyItem[]; goal: LearningGoal; practiceEvidence: PracticeEvidence[]; goalSaving: boolean; saveGoal: (goal: LearningGoal) => Promise<void>; navigate: (view: View) => void; onSignOut: () => Promise<void> }) {
  const [today] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [draftGoal, setDraftGoal] = useState<LearningGoal>(goal);
  const progress = calculateGoalProgress(goal, vocabulary, practiceEvidence.length, today);
  const profile = calculateEnglishProfile(goal, vocabulary, practiceEvidence, today);
  const currentPhase = Math.min(2, Math.floor((progress.currentWeek - 1) / 4));
  const priorityLabel = goal.priority === "understanding" ? "Understand coworkers" : goal.priority === "expression" ? "Express myself" : "Balanced progress";
  const mapMetricIds = ["workplace-vocabulary", "context-understanding", "listening-recognition", "meaning-recall", "clear-expression", "active-use"];
  const mapMetrics = mapMetricIds.map((id) => profile.metrics.find((metric) => metric.id === id)).filter(Boolean);
  const signed = (value: number) => value > 0 ? `+${value}` : `${value}`;

  const beginEditing = () => { setDraftGoal(goal); setEditing(true); };
  const submitGoal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = { ...draftGoal, statement: draftGoal.statement.trim(), weeklyMinutes: Math.min(420, Math.max(30, draftGoal.weeklyMinutes)) };
    if (!normalized.statement) return;
    await saveGoal(normalized);
    setEditing(false);
  };

  return <main className="app-page me-page goal-page">
    <section className="goal-account-bar">
      <span className="profile-avatar">{(user.email?.slice(0, 2) || "ME").toUpperCase()}</span>
      <div><b>{user.email}</b><span className={`cloud-label ${cloudState}`}><i />{cloudState === "synced" ? "Goal and learning evidence synced" : cloudState === "error" ? "Sync needs attention" : "Connecting to your account…"}</span></div>
    </section>

    <section className="readiness-hero">
      <div className="goal-hero-heading"><span className="section-kicker">CURRENT ENGLISH READINESS</span><button type="button" onClick={beginEditing}>Adjust goal</button></div>
      <div className="readiness-main"><div><strong>{profile.readiness}</strong><span>/ 100</span><small>workplace readiness</small></div><div className="readiness-target"><small>12-WEEK TARGET</small><b>{profile.targetReadiness} / 100</b><p>{priorityLabel} · {goal.statement}</p></div></div>
      <div className="readiness-track" role="progressbar" aria-label="Current English readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profile.readiness}><span style={{ width: `${profile.readiness}%` }} /><i style={{ left: `${profile.targetReadiness}%` }} /></div>
      <div className="readiness-scale"><span>Current {profile.readiness}</span><span>Target {profile.targetReadiness}</span></div>
      <div className="plan-progress-inline"><div><span>YOUR 12-WEEK GOAL</span><b>{progress.overall}% plan completion · Week {progress.currentWeek} of 12</b></div><div className="plan-mini-track" role="progressbar" aria-label="Overall 12-week goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.overall}><span style={{ width: `${progress.overall}%` }} /></div></div>
      <p className="readiness-method"><Icon name="spark" /> Readiness estimates capability. Plan completion measures collected evidence. This is not a TOEFL score.</p>
    </section>

    {editing && <form className="goal-editor" onSubmit={submitGoal}>
      <div className="goal-editor-heading"><div><span className="section-kicker">ADJUST YOUR PLAN</span><h2>What does a breakthrough mean to you?</h2></div><button type="button" onClick={() => setEditing(false)} aria-label="Close goal editor">×</button></div>
      <label>Your 12-week outcome<textarea rows={3} maxLength={180} value={draftGoal.statement} onChange={(event) => setDraftGoal({ ...draftGoal, statement: event.target.value })} /></label>
      <div className="goal-editor-row"><label>Start date<input type="date" value={draftGoal.startedAt} onChange={(event) => setDraftGoal({ ...draftGoal, startedAt: event.target.value })} /></label><label>Weekly practice target<input type="number" min={30} max={420} step={15} value={draftGoal.weeklyMinutes} onChange={(event) => setDraftGoal({ ...draftGoal, weeklyMinutes: Number(event.target.value) })} /></label></div>
      <label>Main priority<select value={draftGoal.priority} onChange={(event) => setDraftGoal({ ...draftGoal, priority: event.target.value as LearningGoal["priority"] })}><option value="balanced">Balanced: understand + express</option><option value="understanding">Understand coworkers in real time</option><option value="expression">Express myself clearly</option></select></label>
      <p>Your priority changes how the overall percentage is weighted. The three milestones stay visible so progress remains balanced.</p>
      <div className="goal-editor-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button type="submit" disabled={goalSaving || !draftGoal.statement.trim()}>{goalSaving ? "Saving…" : "Save goal"}</button></div>
    </form>}

    <section className="daily-compare">
      <div className="compare-heading"><div><span className="section-kicker">SINCE YESTERDAY</span><h2>Your change today</h2></div><span>{today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
      <div className="compare-grid"><article><strong>{signed(profile.readinessChange)}</strong><small>readiness points</small></article><article><strong>{signed(profile.wordsStrengthenedToday)}</strong><small>words strengthened</small></article><article><strong>{profile.practicesToday}</strong><small>practices completed</small></article></div>
      {profile.practicesToday === 0 && profile.wordsStrengthenedToday === 0 && <button type="button" className="compare-empty" onClick={() => navigate("practice")}>No new evidence yet today · Start a focused practice <Icon name="arrow" /></button>}
    </section>

    <section className="skill-map-card">
      <div className="section-heading"><div><span className="section-kicker">YOUR ENGLISH SKILL MAP</span><h2>See every language “muscle”</h2></div><span>Current / target</span></div>
      <div className="skill-map" aria-label="English skill map">
        <div className="skill-core"><span>OVERALL</span><strong>{profile.readiness}</strong><small>Target {profile.targetReadiness}</small></div>
        {mapMetrics.map((metric, index) => metric && <button key={metric.id} type="button" className={`skill-node node-${index + 1}`} onClick={() => setExpandedMetric(metric.id)}><span>{metric.shortLabel}</span><b>{metric.value}<small>/{metric.target}</small></b></button>)}
      </div>
      <p className="score-confidence"><Icon name="spark" /> Scores become more reliable as you add meetings and complete practices.</p>
    </section>

    <section className="english-composition">
      <div className="section-heading"><div><span className="section-kicker">ENGLISH COMPOSITION</span><h2>Your current ability profile</h2></div><span>vs. yesterday</span></div>
      <div className="ability-list">{profile.metrics.map((metric) => {
        const open = expandedMetric === metric.id;
        const measured = metric.value !== null;
        return <article key={metric.id} className={`${open ? "open" : ""} ${measured ? "" : "unmeasured"}`}>
          <button type="button" aria-expanded={open} onClick={() => setExpandedMetric(open ? null : metric.id)}>
            <div className="ability-copy"><b>{metric.label}</b><span>{measured ? `Target ${metric.target}` : "Audio required in V2"}</span></div>
            <div className="ability-reading">{measured ? <><strong>{metric.value}</strong><em className={metric.change && metric.change > 0 ? "positive" : "steady"}>{metric.change === 0 ? "—" : signed(metric.change ?? 0)}</em></> : <strong>Not measured</strong>}<span className="ability-chevron">⌄</span></div>
            {measured && <div className="ability-track" aria-hidden="true"><span style={{ width: `${metric.value}%` }} /><i style={{ left: `${metric.target}%` }} /></div>}
          </button>
          {open && <div className="ability-detail"><p>{metric.explanation}</p><div><span><small>EVIDENCE</small>{metric.evidence}</span><span><small>NEXT STEP</small>{metric.nextStep}</span></div></div>}
        </article>;
      })}</div>
      <p className="measurement-note"><Icon name="lock" /> Every score links back to your private vocabulary, practice attempts, or transcript diagnosis. Pronunciation stays unscored until audio exists.</p>
    </section>

    <section className="goal-phases">
      <div className="section-heading"><h2>Your 3 milestones</h2><span>Evidence-based</span></div>
      <div className="goal-phase-list">{roadmap.map((phase, index) => {
        const phaseProgress = progress.phases[index];
        return <article key={phase.weeks} className={index === currentPhase ? "current" : ""}>
          <div className="goal-phase-top"><span>0{index + 1} · {phase.weeks}</span><strong>{phaseProgress.progress}%</strong></div>
          <div className="goal-phase-track" role="progressbar" aria-label={`${phase.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={phaseProgress.progress}><span style={{ width: `${phaseProgress.progress}%` }} /></div>
          <h3>{phase.title}</h3><p>{phase.target}</p><small>{phaseProgress.evidence}</small>
          {index === currentPhase && <em>CURRENT PHASE</em>}
        </article>;
      })}</div>
    </section>

    <section className="goal-evidence">
      <div className="section-heading"><h2>Evidence behind your scores</h2><span>Updates automatically</span></div>
      <div><article><strong>{progress.evidence.personalWords}</strong><small>personal words</small></article><article><strong>{progress.evidence.reviewAttempts}</strong><small>review answers</small></article><article><strong>{progress.evidence.completedSessions}</strong><small>practices</small></article><article><strong>{progress.evidence.workTransfers}</strong><small>work transfers</small></article></div>
    </section>

    <section className="week-focus goal-week-focus"><span className="section-kicker">THIS WEEK</span><h2>Your Top 2 Focus Areas</h2>{weeklyFocus.map((focus, index) => <button key={focus.title} onClick={() => navigate(index === 0 ? "speaking-practice" : "practice")}><span>0{index + 1}</span><div><b>{focus.title}</b><small>{focus.evidence}</small></div><Icon name="arrow" /></button>)}</section>

    <section className="goal-account-footer"><span><Icon name="lock" /></span><div><b>Private account memory</b><small>{user.email} · your goal and learning evidence stay tied to this account</small></div></section>
    <button className="signout-row" onClick={() => void onSignOut()}>Sign out</button>
  </main>;
}

function PageHead({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) { return <div className="page-head"><button className="back" onClick={onBack}><Icon name="back" /> Back</button><h1>{title}</h1><p>{subtitle}</p></div>; }

function ImportPage({ purpose, transcript, setTranscript, runAnalysis, loading, navigate }: { purpose: ImportPurpose; transcript: string; setTranscript: (value: string) => void; runAnalysis: () => void; loading: boolean; navigate: (view: View) => void }) {
  const listening = purpose === "listening";
  return <main className="app-page detail-page"><PageHead title={listening ? "Add what you heard" : "Add what you said"} subtitle={listening ? "We’ll find likely gaps, then check what you truly understand." : "We’ll isolate your turns and prioritize recurring communication problems."} onBack={() => navigate("add")} /><div className="flow-steps" aria-label="Import progress"><span className="active">1 Paste</span><span>2 Diagnose</span><span>3 Practice</span></div><section className="form-card"><div className="privacy-callout"><Icon name="lock" /><div><b>Private by default</b><p>Raw meeting material stays separate from derived learning items.</p></div></div><label>Meeting title<input defaultValue="Launch Readiness Sync" /></label><div className="speaker-row"><label>Your speaker label<input defaultValue="You" /></label><label>Date<input type="date" defaultValue="2026-08-20" /></label></div><label>Meeting transcript<textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={12} placeholder="Paste a speaker-labeled transcript…" /></label><div className="transcript-tip"><Icon name="spark" /><span><b>Best format</b><small>Sarah: … &nbsp; You: … &nbsp; Marcus: …</small></span></div><div className="analysis-preview"><span><b>{transcript.trim() ? transcript.split(/\s+/).length : 0}</b> words</span><span><b>{new Set(transcript.split("\n").map((line) => line.split(":")[0]).filter(Boolean)).size}</b> speakers</span><span><b>{listening ? "≈ 4" : "≈ 6"}</b> insights</span></div><div className="form-actions"><button className="sample-link" onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}>Use sample</button><button onClick={runAnalysis} disabled={loading || !transcript.trim()}>{loading ? "Finding your patterns…" : listening ? "Find my listening gaps" : "Analyze my speaking"} <Icon name="arrow" /></button></div></section></main>;
}

function CandidateReview({ item, index, total, mode, choose, selfRating, answer, setAnswer, submit, result, next, navigate }: { item: Candidate; index: number; total: number; mode: string; choose: (value: string) => void; selfRating: string; answer: string; setAnswer: (value: string) => void; submit: () => void; result: string; next: () => void; navigate: (view: View) => void }) {
  return <main className="app-page detail-page review-page"><PageHead title="Vocabulary check" subtitle={`Candidate ${index + 1} of ${total} · from Launch Readiness Sync`} onBack={() => navigate("import")} /><div className="review-progress"><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div><section className="context-card"><div className="context-label"><span>ORIGINAL MEETING CONTEXT</span><small>Marcus · 10:14 AM</small></div><blockquote>“{item.sentence.split(item.term).map((part, partIndex, parts) => <span key={partIndex}>{part}{partIndex < parts.length - 1 && <mark>{item.term}</mark>}</span>)}”</blockquote><p>{item.context}</p></section><section className="question-card">{mode === "choice" && <><span className="term-chip">{item.term}</span><h2>What did the speaker mean here?</h2><p>Be honest—this chooses the right kind of practice.</p><div className="knowledge-choices">{["I know it", "I kind of know it", "I don’t know it"].map((choice) => <button key={choice} onClick={() => choose(choice)}>{choice}<Icon name="arrow" /></button>)}</div></>}{mode === "explain" && <><span className="term-chip">{selfRating}</span><h2>Explain it in your own words.</h2><p>Natural understanding matters more than a dictionary definition.</p><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="In this context, it means…" rows={4} /><button className="solid-button" disabled={!answer.trim()} onClick={submit}>Check my understanding <Icon name="arrow" /></button></>}{mode === "result" && <div className={`evaluation ${result === "Correct" ? "correct" : "learning"}`}><span className="result-label">{result}</span><h2>{result === "Correct" ? "You understood the speaker’s meaning." : "This belongs in your learning queue."}</h2><p><b>Clear explanation</b><br />{item.explanation}</p><div className="new-context"><small>ANOTHER WORKPLACE CONTEXT</small>“{item.newExample}”</div><button className="solid-button" onClick={next}>{index + 1 === total ? "Finish candidate check" : "Next candidate"} <Icon name="arrow" /></button></div>}</section></main>;
}

function VocabularyPage({ items, navigate }: { items: VocabularyItem[]; navigate: (view: View) => void }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const reviewLabel = selected?.review ? (selected.review.intervalDays === 0 ? "Due now" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(selected.review.dueAt))) : "Due now";
  if (!selected) return <main className="app-page detail-page wide"><PageHead title="My Vocabulary" subtitle="Only words saved to your signed-in account appear here." onBack={() => navigate("practice")} /><section className="vocabulary-empty"><Icon name="book" /><h2>No personal words saved yet.</h2><p>Example words are never shown as your memory. Add one real word and Encher will verify it against your private account before it appears here.</p><button className="solid-button" onClick={() => navigate("add")}>Add my first word</button></section></main>;
  return <main className="app-page detail-page wide"><PageHead title="My Vocabulary" subtitle="Meaning, real context, and a review plan for every word." onBack={() => navigate("practice")} /><div className="library-layout"><section className="vocab-list"><div className="list-toolbar"><span>{items.length} items</span><button onClick={() => navigate("today")}>Review due</button></div>{items.map((item) => <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)}><span><b>{item.term}</b><small>{item.definition}</small></span><em>{item.enrichmentStatus === "pending" ? "Adding meaning…" : item.status}</em></button>)}</section>{selected && <section className="vocab-detail"><div className="detail-top"><div><div className="vocab-tags"><span className="status-pill">{selected.status}</span>{selected.tags?.map((tag) => <span key={tag} className="source-tag">{tag}</span>)}</div><h2>{selected.term}</h2><p className="pronunciation">{selected.pronunciation} {selected.partOfSpeech && <em>{selected.partOfSpeech}</em>} <button aria-label="Audio pronunciation arrives in V2" disabled>▶</button></p></div><ProgressRing value={Math.round(Object.values(selected.mastery).reduce((a, b) => a + b, 0) / 6)} /></div><p className="definition">{selected.definition}</p>{selected.chinese && <p className="chinese">{selected.chinese}</p>}{selected.usageNote && <div className="dictionary-usage"><b>How to use it</b><p>{selected.usageNote}</p>{selected.collocations?.length ? <small>Common: {selected.collocations.join(" · ")}</small> : null}</div>}<div className="origin"><small>{selected.hasOriginalContext ? `WHERE YOU FOUND IT · ${selected.source}` : "SUPPLIED EXAMPLE · ORIGINAL WORK SENTENCE NOT CAPTURED"}</small><blockquote>“{selected.sentence}”</blockquote><p>{selected.context}</p></div><div className="review-plan-card"><div><Icon name="clock" /><span><small>NEXT REVIEW</small><b>{reviewLabel}</b></span></div><div><span><small>CURRENT INTERVAL</small><b>{selected.review?.intervalDays ? `${selected.review.intervalDays} days` : "New"}</b></span><span><small>LAST RESULT</small><b>{selected.review?.lastResult?.replace("partial", "Partly correct") ?? "Not reviewed"}</b></span></div><p>Correct answers increase the interval. Incorrect answers return in the same session and again tomorrow.</p></div><h3>Mastery profile</h3><div className="mastery-grid">{Object.entries(selected.mastery).map(([key, value]) => <div key={key}><span><b>{key.replace(/([A-Z])/g, " $1")}</b><em>{value}%</em></span><i><span style={{ width: `${value}%` }} /></i></div>)}</div><div className="coach-note"><Icon name="spark" /><p><b>Why this is here</b>{selected.reason}</p></div></section>}</div></main>;
}

function TodayListening({ items, index, answer, setAnswer, revealed, setRevealed, evaluation, setEvaluation, complete, completeReview, restart, navigate }: { items: VocabularyItem[]; index: number; answer: string; setAnswer: (value: string) => void; revealed: boolean; setRevealed: (value: boolean) => void; evaluation: VocabularyEvaluation | null; setEvaluation: (value: VocabularyEvaluation | null) => void; complete: boolean; completeReview: (evaluation: VocabularyEvaluation, promptType: VocabularyReviewAttempt["promptType"]) => void; restart: () => void; navigate: (view: View) => void }) {
  const total = Math.max(items.length, 1);
  const item = items[index];
  if (complete) return <main className="app-page detail-page practice-page"><PageHead title="Session complete" subtitle="Your answers changed your personal review calendar." onBack={() => navigate("practice")} /><section className="session-complete"><span>Adaptive review</span><h2>Your next reviews are scheduled.</h2><p>Correct answers moved farther out. Missed words will return sooner.</p><div><b>Evidence saved to your account</b><small>Answer · evaluation · interval · next review date</small></div><button className="solid-button" onClick={() => navigate("home")}>Done for now</button><button className="text-button" onClick={restart}>Review this set again</button></section></main>;
  if (!item) return <main className="app-page detail-page practice-page"><PageHead title="Vocabulary practice" subtitle="Nothing is due right now." onBack={() => navigate("practice")} /><section className="practice-card empty-state"><Icon name="spark" /><h2>You’re caught up.</h2><p>Your review calendar has no items due. Add a word or real conversation to create new practice.</p><button className="solid-button" onClick={() => navigate("add")}>Add learning material</button></section></main>;
  const exercise = index % 4;
  const labels = ["Context recall", "Meaning recall", "Fill in the blank", "New workplace context"];
  const promptTypes: VocabularyReviewAttempt["promptType"][] = ["context", "meaning", "fill-blank", "new-context"];
  const promptType = promptTypes[exercise];
  const blankSentence = item.sentence.replace(new RegExp(item.term, "i"), "______");
  const originLabel = item.hasOriginalContext ? "ORIGINAL MEETING CONTEXT" : item.sourceType === "work" ? "SUPPLIED WORKPLACE EXAMPLE" : "DICTIONARY EXAMPLE";
  const check = (response = answer) => { setEvaluation(evaluateVocabularyResponse(response, item, promptType)); setRevealed(true); };
  const feedback = evaluation ? {
    correct: { title: "Correct", detail: "You understood the meaning.", symbol: "✓" },
    partial: { title: "Partly correct", detail: "You caught part of the meaning, but one important idea was missing.", symbol: "◐" },
    incorrect: { title: "Not quite", detail: "Your answer did not match the meaning used here.", symbol: "×" },
    unknown: { title: "Not known yet", detail: "That’s useful evidence. We’ll teach it now and bring it back sooner.", symbol: "?" },
  }[evaluation] : null;
  const nextReview = evaluation ? formatNextReview(item, evaluation) : null;
  return <main className="app-page detail-page practice-page"><PageHead title="Vocabulary practice" subtitle={`${total} focused items · answers update your review plan`} onBack={() => navigate("practice")} /><div className="session-progress"><span>{index + 1} of {total}</span><i aria-label={`${Math.round(((index + 1) / total) * 100)} percent complete`}><span style={{ width: `${((index + 1) / total) * 100}%` }} /></i><small>{labels[exercise]}</small></div><section className="practice-card"><div className="practice-origin"><span className="exercise-type">{originLabel}</span>{item.tags?.includes("From work") && <span className="work-tag">FROM WORK</span>}</div>{exercise === 0 && <><p className="quote">“{item.sentence.split(item.term).map((part, partIndex, parts) => <span key={partIndex}>{part}{partIndex < parts.length - 1 && <mark>{item.term}</mark>}</span>)}”</p><h2>What did “{item.term}” mean here?</h2></>}{exercise === 1 && <><p className="focus-word">{item.term}</p><h2>Explain it in your own words.</h2></>}{exercise === 2 && <><p className="quote">“{blankSentence}”</p><h2>Which expression completes the meaning?</h2></>}{exercise === 3 && <><p className="quote">“{item.newExample}”</p><h2>What does the speaker mean now?</h2></>}{!revealed ? <><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={exercise === 2 ? "Type the missing expression…" : "Explain it in your own words…"} rows={3} /><div className="practice-actions"><button className="text-button" onClick={() => check("")}>I don’t know yet</button><button className="solid-button" disabled={!answer.trim()} onClick={() => check()}>Check my answer</button></div></> : feedback && nextReview && evaluation ? <div className={`answer-feedback ${evaluation}`} aria-live="polite"><div className="feedback-verdict"><span>{feedback.symbol}</span><div><h3>{feedback.title}</h3><p>{feedback.detail}</p></div></div>{answer.trim() && <div className="your-answer"><small>YOUR ANSWER</small><p>“{answer}”</p></div>}<div className="meaning-block"><small>CLEAR MEANING</small><p><b>{item.term}</b> <em>{item.partOfSpeech}</em></p><p>{item.definition}</p>{item.chinese && <p className="meaning-chinese">{item.chinese}</p>}</div>{item.usageNote && <div className="usage-note"><b>How to use it</b><p>{item.usageNote}</p></div>}<div className="feedback-example"><small>WORKPLACE EXAMPLE</small><p>“{item.newExample}”</p>{item.collocations?.length ? <p className="collocations"><b>Common:</b> {item.collocations.join(" · ")}</p> : null}</div><div className="next-review"><Icon name="clock" /><div><small>NEXT REVIEW</small><b>{nextReview.primary}</b><p>{nextReview.secondary}</p></div></div><button className="solid-button continue-review" onClick={() => completeReview(evaluation, promptType)}>{evaluation === "incorrect" || evaluation === "unknown" ? "Got it · show me again later" : "Continue"} <Icon name="arrow" /></button></div> : null}</section></main>;
}

function SentencePractice({ navigate }: { navigate: (view: View) => void }) {
  const [revealed, setRevealed] = useState(false);
  return <main className="app-page detail-page practice-page"><PageHead title="Understand the sentence" subtitle="The goal is the speaker’s whole idea—not translating word by word." onBack={() => navigate("practice")} /><div className="session-progress"><span>1 of 2</span><i><span style={{ width: "50%" }} /></i><small>Intent</small></div><section className="practice-card sentence-card"><span className="exercise-type">PRODUCT LAUNCH READINESS</span><p className="quote">“Let’s pressure-test the rollout assumptions before we socialize the plan with leadership.”</p><h2>What does Sarah want the team to do?</h2>{!revealed ? <div className="sentence-options"><button onClick={() => setRevealed(true)}>Present the plan to leadership now</button><button onClick={() => setRevealed(true)}>Challenge the plan first, then share it informally</button><button onClick={() => setRevealed(true)}>Run a technical performance test</button></div> : <div className="sentence-explanation"><Icon name="check" /><div><b>Challenge the plan first, then build alignment.</b><p>“Pressure-test” means look for weak assumptions. “Socialize” means share informally to get feedback and support before a formal decision.</p><button onClick={() => navigate("today")}>Practice the key expressions <Icon name="arrow" /></button></div></div>}</section></main>;
}

function SpeakingPractice({ attempt, setAttempt, result, evaluate, reset, navigate }: { attempt: string; setAttempt: (value: string) => void; result: "" | "strong" | "retry"; evaluate: () => void; reset: () => void; navigate: (view: View) => void }) {
  return <main className="app-page detail-page speaking-page"><PageHead title="Clear recommendation" subtitle="Fix one high-impact pattern using your own meeting example." onBack={() => navigate("practice")} /><section className="correction-loop"><div className="loop-step"><span>1</span><small>REAL EXAMPLE · {speakingExercise.source}</small><h3>You said</h3><blockquote>“{speakingExercise.original}”</blockquote></div><div className="intent-compare"><div><small>WHAT YOU MEANT</small><p>{speakingExercise.intent}</p></div><div><small>WHAT YOUR ENGLISH SOUNDED LIKE</small><p>The launch, announcement, or both might need to wait.</p></div></div><div className="coach-diagnosis"><Icon name="spark" /><div><b>The real problem</b><p>{speakingExercise.problem}</p><span>{speakingExercise.framework}</span></div></div><div className="clearer-version"><small>A CLEARER WORKPLACE VERSION</small><p>“{speakingExercise.clearer}”</p></div><div className="retry-box"><span className="loop-number">2</span><div><h3>Say it again in your own words.</h3><p>Keep the meaning. Lead with the decision and stay under 38 words.</p></div><textarea value={attempt} onChange={(event) => setAttempt(event.target.value)} rows={4} placeholder="I recommend…" /><div className="retry-actions"><span>{attempt.trim() ? attempt.trim().split(/\s+/).length : 0} / 38 words</span><button className="solid-button" disabled={!attempt.trim()} onClick={evaluate}>Evaluate my new version</button></div>{result && <div className={`speaking-feedback ${result}`}><b>{result === "strong" ? "Clearer and decision-led." : "Good start—make the decision explicit."}</b><p>{result === "strong" ? "You preserved the Friday launch, separated the announcement, and named Legal as the condition." : "Name all three anchors: Friday launch, hold off the announcement, and Legal approval."}</p><small>Scheduled to retest this skill in 3 days.</small><button onClick={reset}>Try one more time</button></div>}</div></section><p className="honesty-note">Text evaluates grammar, vocabulary, clarity, structure, and naturalness. Pronunciation requires audio and is reserved for V2.</p></main>;
}

function RoadmapPage({ navigate }: { navigate: (view: View) => void }) {
  return <main className="app-page detail-page"><PageHead title="Your 12-week plan" subtitle="Improvement is verified in future work conversations—not with streak pressure." onBack={() => navigate("me")} /><section className="north-star"><span>90-DAY OUTCOME</span><h2>Understand coworkers faster and make your point clearly the first time.</h2><p>Real conversation → diagnosis → focused practice → active correction → spaced review → verify transfer.</p></section><div className="roadmap-list">{roadmap.map((phase, index) => <article key={phase.weeks}><span>0{index + 1}</span><div><small>{phase.weeks}</small><h3>{phase.title}</h3><p>{phase.description}</p><b>Evidence target: {phase.target}</b></div></article>)}</div><section className="measurement-card"><h3>How we prove improvement</h3><div><span><b>Listening</b><small>Fewer unknown expressions and better sentence understanding</small></span><span><b>Speaking</b><small>Shorter recommendations with fewer recurring problems</small></span><span><b>Transfer</b><small>Correct use appears in new workplace conversations</small></span></div></section></main>;
}
