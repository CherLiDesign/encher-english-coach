"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { analyzeTranscript, evaluateAnswer, SAMPLE_TRANSCRIPT, seedVocabulary } from "../lib/mock-ai";
import { roadmap, speakingExercise, weeklyFocus } from "../lib/learning-plan";
import { supabase } from "../lib/supabase";
import type { Candidate, View, VocabularyItem } from "../lib/types";

type ImportPurpose = "listening" | "speaking";
type PracticeLane = "today" | "vocabulary" | "understand" | "express";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
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

export function CoachApp({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<View>("home");
  const [quickWord, setQuickWord] = useState("");
  const [toast, setToast] = useState("");
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [importPurpose, setImportPurpose] = useState<ImportPurpose>("listening");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(seedVocabulary);
  const [loading, setLoading] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [answerMode, setAnswerMode] = useState<"choice" | "explain" | "result">("choice");
  const [selfRating, setSelfRating] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceRevealed, setPracticeRevealed] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [speakingAttempt, setSpeakingAttempt] = useState("");
  const [speakingResult, setSpeakingResult] = useState<"" | "strong" | "retry">("");
  const [speakingAnalyzed, setSpeakingAnalyzed] = useState(false);
  const [practiceLane, setPracticeLane] = useState<PracticeLane>("today");
  const [cloudState, setCloudState] = useState<"connecting" | "synced" | "error">("connecting");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true));

  const currentCandidate = candidates[candidateIndex];
  const dueItems = useMemo(() => vocabulary.filter((item) => item.due), [vocabulary]);
  const activeTab = tabFor(view);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.from("vocabulary_items").select("item_data").order("updated_at", { ascending: false }).then(async ({ data, error }) => {
      if (!active) return;
      if (!error && data?.length) setVocabulary(data.map((row) => row.item_data as VocabularyItem));
      if (!error && !data?.length) await supabase!.from("vocabulary_items").upsert(seedVocabulary.map((item) => ({ id: item.id, user_id: user.id, item_data: item })));
      setCloudState(error ? "error" : "synced");
    });
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    const captureInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const markInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", markInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", captureInstall); window.removeEventListener("appinstalled", markInstalled); };
  }, []);

  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startImport = (purpose: ImportPurpose) => { setImportPurpose(purpose); navigate("import"); };

  const saveVocabulary = async (item: VocabularyItem) => {
    if (!supabase) return;
    const { error } = await supabase.from("vocabulary_items").upsert({ id: item.id, user_id: user.id, item_data: item, updated_at: new Date().toISOString() }, { onConflict: "user_id,id" });
    if (error) { setCloudState("error"); flash("Saved here; cloud sync needs attention"); }
    else setCloudState("synced");
  };

  const addQuickWord = () => {
    const term = quickWord.trim();
    if (!term) return;
    const newItem: VocabularyItem = { ...seedVocabulary[0], id: `${term}-${Date.now()}`, term, definition: "Pending enrichment", chinese: undefined, sentence: "Quick-added during work — add source context later.", context: "Saved without interrupting your workflow.", source: "Quick Add", discoveredAt: "Today", reason: "You saved this as unfamiliar.", explanation: "The coach will enrich this item when context becomes available.", newExample: "A workplace example will be generated after enrichment.", pronunciation: "Pending", status: "Unknown", mastery: { recognition: 5, contextual: 0, listening: 0, recall: 0, activeUse: 0, pronunciation: 0 }, due: true };
    setVocabulary((items) => [newItem, ...items]); void saveVocabulary(newItem);
    setQuickWord(""); flash(`“${term}” saved`);
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
    if (rating === "I don’t know it") { setResult("Unknown"); setAnswerMode("result"); addCandidate(currentCandidate, "Unknown"); }
    else setAnswerMode("explain");
  };
  const addCandidate = (item: Candidate, status = "Learning") => {
    const saved = { ...item, status: status as VocabularyItem["status"] };
    setVocabulary((items) => items.some((entry) => entry.id === item.id) ? items : [saved, ...items]); void saveVocabulary(saved);
  };
  const submitAnswer = () => { const evaluation = evaluateAnswer(answer, currentCandidate); setResult(evaluation); setAnswerMode("result"); if (evaluation !== "Correct") addCandidate(currentCandidate); };
  const nextCandidate = () => {
    if (candidateIndex < candidates.length - 1) { setCandidateIndex((index) => index + 1); setAnswerMode("choice"); setAnswer(""); setResult(""); setSelfRating(""); }
    else { navigate("vocabulary"); flash("Candidate check complete"); }
  };

  const rateListening = (rating: "Hard" | "Almost" | "Got it") => {
    const item = dueItems[practiceIndex % Math.max(dueItems.length, 1)];
    if (item) {
      const gain = rating === "Got it" ? 10 : rating === "Almost" ? 5 : 1;
      const updated = { ...item, mastery: { ...item.mastery, contextual: Math.min(100, item.mastery.contextual + gain), recall: Math.min(100, item.mastery.recall + Math.ceil(gain / 2)) } };
      setVocabulary((all) => all.map((entry) => entry.id === updated.id ? updated : entry)); void saveVocabulary(updated);
    }
    if (practiceIndex >= Math.min(5, Math.max(dueItems.length * 2, 1)) - 1) {
      setPracticeComplete(true);
      if (supabase) void supabase.from("practice_sessions").insert({ user_id: user.id, mode: "listening", results: { itemCount: practiceIndex + 1, finalRating: rating }, completed_at: new Date().toISOString() });
    } else setPracticeIndex((index) => index + 1);
    setPracticeAnswer(""); setPracticeRevealed(false);
  };

  const evaluateSpeakingAttempt = () => {
    const normalized = speakingAttempt.toLowerCase();
    const hits = speakingExercise.keywords.filter((keyword) => normalized.includes(keyword)).length;
    const outcome = hits >= 3 && speakingAttempt.split(/\s+/).length <= 38 ? "strong" : "retry";
    setSpeakingResult(outcome);
    if (supabase) void supabase.from("practice_sessions").insert({ user_id: user.id, mode: "speaking", results: { focus: weeklyFocus[0].title, attempt: speakingAttempt, outcome }, completed_at: new Date().toISOString() });
  };

  const installApp = async () => {
    if (!installPrompt) { flash("On iPhone: tap Share, then Add to Home Screen"); return; }
    await installPrompt.prompt(); const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") { setInstalled(true); setInstallPrompt(null); }
  };

  return <div className="app-shell app-v2">
    <AppHeader activeTab={activeTab} cloudState={cloudState} navigate={navigate} />
    {view === "home" && <Home navigate={navigate} dueCount={dueItems.length} newLearner={vocabulary.length <= seedVocabulary.length} />}
    {view === "add" && <AddPage quickWord={quickWord} setQuickWord={setQuickWord} addQuickWord={addQuickWord} startImport={startImport} />}
    {view === "practice" && <PracticeHub lane={practiceLane} setLane={setPracticeLane} navigate={navigate} dueCount={dueItems.length} analyzed={speakingAnalyzed} />}
    {view === "me" && <MePage user={user} cloudState={cloudState} vocabulary={vocabulary} installed={installed} installApp={installApp} navigate={navigate} onSignOut={onSignOut} />}
    {view === "import" && <ImportPage purpose={importPurpose} transcript={transcript} setTranscript={setTranscript} runAnalysis={runAnalysis} loading={loading} navigate={navigate} />}
    {view === "review" && currentCandidate && <CandidateReview item={currentCandidate} index={candidateIndex} total={candidates.length} mode={answerMode} choose={chooseKnowledge} selfRating={selfRating} answer={answer} setAnswer={setAnswer} submit={submitAnswer} result={result} next={nextCandidate} navigate={navigate} />}
    {view === "vocabulary" && <VocabularyPage items={vocabulary} navigate={navigate} />}
    {view === "today" && <TodayListening items={dueItems} index={practiceIndex} answer={practiceAnswer} setAnswer={setPracticeAnswer} revealed={practiceRevealed} setRevealed={setPracticeRevealed} complete={practiceComplete} rate={rateListening} restart={() => { setPracticeIndex(0); setPracticeComplete(false); setPracticeRevealed(false); }} navigate={navigate} />}
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

function AddPage({ quickWord, setQuickWord, addQuickWord, startImport }: { quickWord: string; setQuickWord: (value: string) => void; addQuickWord: () => void; startImport: (purpose: ImportPurpose) => void }) {
  return <main className="app-page add-page"><section className="tab-intro"><span className="eyebrow">CAPTURE FROM REAL WORK</span><h1>Add</h1><p>Save the moment now. Encher will turn it into the right kind of practice.</p></section><section className="capture-hub add-word-card"><span className="section-kicker">QUICK WORD OR PHRASE</span><h2>Add it before you forget it.</h2><div className="inline-save"><input value={quickWord} onChange={(event) => setQuickWord(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addQuickWord()} aria-label="Quick add a word or phrase" placeholder="e.g. walk it back" /><button disabled={!quickWord.trim()} onClick={addQuickWord}>Save</button></div><p>Definition and workplace examples can be enriched later.</p></section><section className="add-sources"><div className="section-heading"><h2>Add meeting content</h2><span>Paste text for V1</span></div><button onClick={() => startImport("listening")}><span className="add-source-icon heard"><Icon name="listen" /></span><div><b>Something I didn’t understand</b><p>Paste a coworker or meeting transcript. Find vocabulary and sentence-level meaning gaps.</p><small>Creates Vocabulary + Understand practice</small></div><Icon name="arrow" /></button><button onClick={() => startImport("speaking")}><span className="add-source-icon said"><Icon name="speak" /></span><div><b>Something I said</b><p>Paste a speaker-labeled transcript. Diagnose clarity, grammar, structure, and naturalness.</p><small>Creates Express practice</small></div><Icon name="arrow" /></button><button className="disabled-action" disabled><span className="add-source-icon"><Icon name="record" /></span><div><b>Record a meeting</b><p>Audio transcription, listening recognition, fluency, and pronunciation arrive in V2.</p><small>Audio · V2</small></div><em>SOON</em></button></section><section className="add-after"><Icon name="lock" /><div><b>Private by default</b><p>Raw meeting material stays tied to your account and separate from derived learning items.</p></div></section></main>;
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

function MePage({ user, cloudState, vocabulary, installed, installApp, navigate, onSignOut }: { user: User; cloudState: string; vocabulary: VocabularyItem[]; installed: boolean; installApp: () => Promise<void>; navigate: (view: View) => void; onSignOut: () => Promise<void> }) {
  const avg = Math.round(vocabulary.reduce((total, item) => total + Object.values(item.mastery).reduce((a, b) => a + b, 0) / 6, 0) / Math.max(vocabulary.length, 1));
  return <main className="app-page me-page"><section className="profile-card"><span className="profile-avatar">{(user.email?.slice(0, 2) || "ME").toUpperCase()}</span><div><h1>Your learning system</h1><p>{user.email}</p><span className={`cloud-label ${cloudState}`}><i />{cloudState === "synced" ? "Learning memory synced" : cloudState === "error" ? "Sync needs attention" : "Connecting…"}</span></div></section><section className="progress-overview"><div className="section-heading"><h2>This month</h2><span>Evidence, not streaks</span></div><div><article><strong>{vocabulary.length}</strong><small>personal words</small></article><article><strong>{avg}%</strong><small>average mastery</small></article><article><strong>3</strong><small>work transfers</small></article></div></section><section className="week-focus"><span className="section-kicker">THIS WEEK</span><h2>Your Top 2 Focus Areas</h2>{weeklyFocus.map((focus, index) => <button key={focus.title} onClick={() => navigate(index === 0 ? "speaking-practice" : "practice")}><span>0{index + 1}</span><div><b>{focus.title}</b><small>{focus.evidence}</small></div><Icon name="arrow" /></button>)}</section><section className="me-list"><button onClick={() => navigate("roadmap")}><span><Icon name="clock" /></span><div><b>12-week breakthrough plan</b><small>Foundation → real-time meetings → transfer</small></div><Icon name="arrow" /></button><button onClick={() => void installApp()}><span><Icon name="home" /></span><div><b>{installed ? "Installed on this device" : "Install Encher on your phone"}</b><small>{installed ? "Opens like a standalone app" : "On iPhone: Share → Add to Home Screen"}</small></div>{installed ? <Icon name="check" /> : <Icon name="arrow" />}</button><button onClick={() => navigate("vocabulary")}><span><Icon name="lock" /></span><div><b>Privacy & learning data</b><small>Private by default · tied to your account</small></div><Icon name="arrow" /></button></section><button className="signout-row" onClick={() => void onSignOut()}>Sign out</button></main>;
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
  const [selected, setSelected] = useState(items[0]);
  return <main className="app-page detail-page wide"><PageHead title="My Vocabulary" subtitle="Your personal workplace language—linked to where you found it." onBack={() => navigate("practice")} /><div className="library-layout"><section className="vocab-list"><div className="list-toolbar"><span>{items.length} items</span><button onClick={() => navigate("today")}>Review due</button></div>{items.map((item) => <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelected(item)}><span><b>{item.term}</b><small>{item.definition}</small></span><em>{item.status}</em></button>)}</section>{selected && <section className="vocab-detail"><div className="detail-top"><div><span className="status-pill">{selected.status}</span><h2>{selected.term}</h2><p className="pronunciation">{selected.pronunciation} <button aria-label="Audio pronunciation arrives in V2" disabled>▶</button></p></div><ProgressRing value={Math.round(Object.values(selected.mastery).reduce((a, b) => a + b, 0) / 6)} /></div><p className="definition">{selected.definition}</p>{selected.chinese && <p className="chinese">{selected.chinese}</p>}<div className="origin"><small>WHERE YOU FOUND IT · {selected.source}</small><blockquote>“{selected.sentence}”</blockquote><p>{selected.context}</p></div><h3>Mastery profile</h3><div className="mastery-grid">{Object.entries(selected.mastery).map(([key, value]) => <div key={key}><span><b>{key.replace(/([A-Z])/g, " $1")}</b><em>{value}%</em></span><i><span style={{ width: `${value}%` }} /></i></div>)}</div><div className="coach-note"><Icon name="spark" /><p><b>Why this is here</b>{selected.reason}</p></div></section>}</div></main>;
}

function TodayListening({ items, index, answer, setAnswer, revealed, setRevealed, complete, rate, restart, navigate }: { items: VocabularyItem[]; index: number; answer: string; setAnswer: (value: string) => void; revealed: boolean; setRevealed: (value: boolean) => void; complete: boolean; rate: (rating: "Hard" | "Almost" | "Got it") => void; restart: () => void; navigate: (view: View) => void }) {
  const total = Math.min(5, Math.max(items.length * 2, 1)); const item = items[index % Math.max(items.length, 1)];
  if (!item) return <main className="app-page detail-page practice-page"><PageHead title="Vocabulary practice" subtitle="Nothing is due right now." onBack={() => navigate("practice")} /><section className="practice-card empty-state"><Icon name="spark" /><h2>You’re caught up.</h2><p>Add a real conversation to create new practice.</p><button className="solid-button" onClick={() => navigate("add")}>Add conversation</button></section></main>;
  if (complete) return <main className="app-page detail-page practice-page"><PageHead title="Session complete" subtitle="Today’s performance updated your review plan." onBack={() => navigate("practice")} /><section className="session-complete"><span>6 min</span><h2>You strengthened {Math.min(items.length, 3)} expressions.</h2><p>Next time, these will return in new workplace contexts.</p><div><b>Evidence captured</b><small>Contextual understanding + recall confidence</small></div><button className="solid-button" onClick={() => navigate("home")}>Done for now</button><button className="text-button" onClick={restart}>Practice again</button></section></main>;
  const exercise = index % 4; const labels = ["Context recall", "Meaning recall", "Fill in the blank", "New workplace context"]; const blankSentence = item.sentence.replace(new RegExp(item.term, "i"), "______");
  return <main className="app-page detail-page practice-page"><PageHead title="Vocabulary practice" subtitle={`${total} focused items · about 6 minutes`} onBack={() => navigate("practice")} /><div className="session-progress"><span>{index + 1} of {total}</span><i aria-label={`${Math.round(((index + 1) / total) * 100)} percent complete`}><span style={{ width: `${((index + 1) / total) * 100}%` }} /></i><small>{labels[exercise]}</small></div><section className="practice-card"><span className="exercise-type">{exercise === 3 ? "NEW CONTEXT" : "FROM YOUR MEETING"}</span>{exercise === 0 && <><p className="quote">“{item.sentence.split(item.term).map((part, partIndex, parts) => <span key={partIndex}>{part}{partIndex < parts.length - 1 && <mark>{item.term}</mark>}</span>)}”</p><h2>What did “{item.term}” mean here?</h2></>}{exercise === 1 && <><p className="focus-word">{item.term}</p><h2>Explain it without the meeting sentence.</h2></>}{exercise === 2 && <><p className="quote">“{blankSentence}”</p><h2>Which expression completes the meaning?</h2></>}{exercise === 3 && <><p className="quote">“{item.newExample}”</p><h2>What does the speaker mean now?</h2></>}{!revealed ? <><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={exercise === 2 ? "Type the missing expression…" : "Explain it in your own words…"} rows={3} /><div className="practice-actions"><button className="text-button" onClick={() => setRevealed(true)}>I’m not sure</button><button className="solid-button" disabled={!answer.trim()} onClick={() => setRevealed(true)}>Check answer</button></div></> : <div className="answer-reveal"><small>CLEAR EXPLANATION</small><p><b>{item.term}</b> — {item.explanation}</p><div><span>How well did you understand it?</span>{(["Hard", "Almost", "Got it"] as const).map((choice) => <button key={choice} onClick={() => rate(choice)}>{choice}</button>)}</div></div>}</section></main>;
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
