"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { analyzeTranscript, evaluateAnswer, SAMPLE_TRANSCRIPT, seedVocabulary } from "../lib/mock-ai";
import { roadmap, speakingExercise, weeklyFocus } from "../lib/learning-plan";
import { supabase } from "../lib/supabase";
import type { Candidate, View, VocabularyItem } from "../lib/types";

const Icon = ({ name }: { name: "headphones" | "mic" | "arrow" | "book" | "plus" | "upload" | "clock" | "spark" | "back" | "home" | "plan" }) => {
  const icons = { headphones: "◖◗", mic: "●", arrow: "→", book: "▤", plus: "+", upload: "↥", clock: "◷", spark: "✦", back: "←", home: "⌂", plan: "◎" };
  return <span aria-hidden="true">{icons[name]}</span>;
};

function ProgressRing({ value }: { value: number }) {
  return <span className="ring" style={{ "--progress": `${value * 3.6}deg` } as React.CSSProperties}><span>{value}%</span></span>;
}

export function CoachApp({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<View>("home");
  const [quickWord, setQuickWord] = useState("");
  const [toast, setToast] = useState("");
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
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
  const [cloudState, setCloudState] = useState<"connecting" | "synced" | "error">("connecting");

  const currentCandidate = candidates[candidateIndex];
  const dueItems = useMemo(() => vocabulary.filter((item) => item.due), [vocabulary]);

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

  const saveVocabulary = async (item: VocabularyItem) => {
    if (!supabase) return;
    const { error } = await supabase.from("vocabulary_items").upsert({ id: item.id, user_id: user.id, item_data: item, updated_at: new Date().toISOString() }, { onConflict: "user_id,id" });
    if (error) { setCloudState("error"); flash("Saved here; cloud sync needs attention"); }
    else setCloudState("synced");
  };

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const flash = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2400); };

  const addQuickWord = () => {
    const term = quickWord.trim();
    if (!term) return;
    const newItem: VocabularyItem = { ...seedVocabulary[0], id: `${term}-${Date.now()}`, term, definition: "Pending enrichment", chinese: undefined, sentence: "Quick-added during work — add source context later.", context: "Saved without interrupting your workflow.", source: "Quick Add", discoveredAt: "Today", reason: "You saved this as unfamiliar.", explanation: "The coach will enrich this item when context becomes available.", newExample: "A workplace example will be generated after enrichment.", pronunciation: "Pending", status: "Unknown", mastery: { recognition: 5, contextual: 0, listening: 0, recall: 0, activeUse: 0, pronunciation: 0 }, due: true };
    setVocabulary((items) => [newItem, ...items]); void saveVocabulary(newItem);
    setQuickWord(""); flash(`“${term}” saved to My Vocabulary`);
  };

  const runAnalysis = async () => {
    setLoading(true);
    if (supabase) await supabase.from("conversations").insert({ user_id: user.id, title: "Launch Readiness Sync", transcript, source_type: "transcript" });
    const found = await analyzeTranscript(transcript); setCandidates(found); setLoading(false); setCandidateIndex(0); setAnswerMode("choice"); navigate("review");
  };

  const chooseKnowledge = (rating: string) => {
    setSelfRating(rating);
    if (rating === "I don’t know it") { setResult("Unknown"); setAnswerMode("result"); addCandidate(currentCandidate, "Unknown"); }
    else setAnswerMode("explain");
  };
  const addCandidate = (item: Candidate, status = "Learning") => {
    const saved = { ...item, status: status as VocabularyItem["status"] };
    setVocabulary((items) => items.some((v) => v.id === item.id) ? items : [saved, ...items]); void saveVocabulary(saved);
  };
  const submitAnswer = () => { const evaluation = evaluateAnswer(answer, currentCandidate); setResult(evaluation); setAnswerMode("result"); if (evaluation !== "Correct") addCandidate(currentCandidate); };
  const nextCandidate = () => { if (candidateIndex < candidates.length - 1) { setCandidateIndex((i) => i + 1); setAnswerMode("choice"); setAnswer(""); setResult(""); setSelfRating(""); } else { navigate("vocabulary"); flash("Candidate check complete"); } };

  const rateListening = (rating: "Hard" | "Almost" | "Got it") => {
    const item = dueItems[practiceIndex % Math.max(dueItems.length, 1)];
    if (item) {
      const gain = rating === "Got it" ? 10 : rating === "Almost" ? 5 : 1;
      const updated = { ...item, mastery: { ...item.mastery, contextual: Math.min(100, item.mastery.contextual + gain), recall: Math.min(100, item.mastery.recall + Math.ceil(gain / 2)) } };
      setVocabulary((all) => all.map((entry) => entry.id === updated.id ? updated : entry));
      void saveVocabulary(updated);
    }
    if (practiceIndex >= Math.min(5, Math.max(dueItems.length * 2, 1)) - 1) {
      setPracticeComplete(true);
      if (supabase) void supabase.from("practice_sessions").insert({ user_id: user.id, mode: "listening", results: { itemCount: practiceIndex + 1, finalRating: rating }, completed_at: new Date().toISOString() });
    }
    else setPracticeIndex((i) => i + 1);
    setPracticeAnswer(""); setPracticeRevealed(false);
  };

  const evaluateSpeakingAttempt = () => {
    const normalized = speakingAttempt.toLowerCase();
    const hits = speakingExercise.keywords.filter((keyword) => normalized.includes(keyword)).length;
    const outcome = hits >= 3 && speakingAttempt.split(/\s+/).length <= 38 ? "strong" : "retry";
    setSpeakingResult(outcome);
    if (supabase) void supabase.from("practice_sessions").insert({ user_id: user.id, mode: "speaking", results: { focus: weeklyFocus[0].title, attempt: speakingAttempt, outcome }, completed_at: new Date().toISOString() });
  };

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate("home")}><span className="brand-mark">e</span><span>Encher</span></button>
      <nav aria-label="Primary navigation">
        <button className={view === "listening" ? "active" : ""} onClick={() => navigate("listening")}>Listening</button>
        <button className={view === "speaking" ? "active" : ""} onClick={() => navigate("speaking")}>Speaking</button>
        <button className={view === "vocabulary" ? "active" : ""} onClick={() => navigate("vocabulary")}>Vocabulary</button>
      </nav>
      <div className="account-menu"><span className={`sync-dot ${cloudState}`} title={cloudState === "synced" ? "Cloud memory synced" : cloudState === "error" ? "Cloud sync needs attention" : "Connecting cloud memory"} /><button className="avatar" aria-label="Sign out" title={`${user.email} · Sign out`} onClick={() => void onSignOut()}>{(user.email?.slice(0, 2) || "ME").toUpperCase()}</button></div>
    </header>
    {view === "home" && <Home navigate={navigate} dueCount={dueItems.length} />}
    {view === "listening" && <ListeningHome quickWord={quickWord} setQuickWord={setQuickWord} addQuickWord={addQuickWord} navigate={navigate} />}
    {view === "import" && <ImportPage transcript={transcript} setTranscript={setTranscript} runAnalysis={runAnalysis} loading={loading} navigate={navigate} />}
    {view === "review" && currentCandidate && <CandidateReview item={currentCandidate} index={candidateIndex} total={candidates.length} mode={answerMode} choose={chooseKnowledge} selfRating={selfRating} answer={answer} setAnswer={setAnswer} submit={submitAnswer} result={result} next={nextCandidate} navigate={navigate} />}
    {view === "vocabulary" && <VocabularyPage items={vocabulary} navigate={navigate} />}
    {view === "today" && <TodayListening items={dueItems} index={practiceIndex} answer={practiceAnswer} setAnswer={setPracticeAnswer} revealed={practiceRevealed} setRevealed={setPracticeRevealed} complete={practiceComplete} rate={rateListening} restart={() => { setPracticeIndex(0); setPracticeComplete(false); setPracticeRevealed(false); }} navigate={navigate} />}
    {view === "speaking" && <SpeakingPractice attempt={speakingAttempt} setAttempt={setSpeakingAttempt} result={speakingResult} evaluate={evaluateSpeakingAttempt} reset={() => { setSpeakingAttempt(""); setSpeakingResult(""); }} navigate={navigate} />}
    {view === "roadmap" && <RoadmapPage navigate={navigate} />}
    <nav className="mobile-nav" aria-label="Mobile navigation"><button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}><Icon name="home" />Home</button><button className={["listening","today","import","review"].includes(view) ? "active" : ""} onClick={() => navigate("listening")}><Icon name="headphones" />Listen</button><button className={view === "speaking" ? "active" : ""} onClick={() => navigate("speaking")}><Icon name="mic" />Speak</button><button className={view === "vocabulary" ? "active" : ""} onClick={() => navigate("vocabulary")}><Icon name="book" />Words</button></nav>
    {toast && <div className="toast" role="status" aria-live="polite"><Icon name="spark" /> {toast}</div>}
  </div>;
}

function Home({ navigate, dueCount }: { navigate: (v: View) => void; dueCount: number }) {
  return <main className="home page">
    <section className="welcome"><p className="eyebrow">YOUR PERSONAL COACH · WEEK 1 OF 12</p><h1>Turn today’s work into tomorrow’s English.</h1><p>Your next session is already prioritized from real meeting evidence.</p></section>
    <section className="today-mission"><div><span className="section-kicker">TODAY’S BEST NEXT STEP</span><h2>Recognize 5 expressions you missed in meetings</h2><p>Start with listening because three items are overdue and “workaround” is still weak in speech recognition.</p></div><button onClick={() => navigate("today")}>Start 8-minute session <Icon name="arrow" /></button></section>
    <section className="mode-grid">
      <button className="mode-card listening-card" onClick={() => navigate("listening")}>
        <span className="mode-icon"><Icon name="headphones" /></span><span className="mode-copy"><span className="mode-label">Practice Listening</span><span className="mode-title">Understand your coworkers better</span><span className="mode-desc">Turn real meeting language into vocabulary you can recognize, understand, and use.</span><span className="mode-link">Start listening practice <Icon name="arrow" /></span></span>
        <span className="mode-meta"><strong>{dueCount}</strong><small>words due today</small><span>3 new candidates</span></span>
      </button>
      <button className="mode-card speaking-card" onClick={() => navigate("speaking")}>
        <span className="mode-icon"><Icon name="mic" /></span><span className="mode-copy"><span className="mode-label">Practice Speaking</span><span className="mode-title">Express yourself clearly</span><span className="mode-desc">Improve the grammar, clarity, and workplace English in your own real speaking.</span><span className="mode-link">View speaking focus <Icon name="arrow" /></span></span>
        <span className="mode-meta"><strong>2</strong><small>focus areas this week</small><span>10-minute practice ready</span></span>
      </button>
    </section>
    <section className="evidence-row"><button className="quiet-note" onClick={() => navigate("vocabulary")}><Icon name="spark" /><div><strong>Workplace transfer detected</strong><p>You used “trade-off” naturally in Tuesday’s product review.</p></div><span>View evidence →</span></button><button className="quiet-note" onClick={() => navigate("roadmap")}><Icon name="plan" /><div><strong>Your 12-week path</strong><p>Foundation → real-time meetings → transfer back to work.</p></div><span>Open roadmap →</span></button></section>
  </main>;
}

function ListeningHome({ quickWord, setQuickWord, addQuickWord, navigate }: { quickWord: string; setQuickWord: (s: string) => void; addQuickWord: () => void; navigate: (v: View) => void }) {
  return <main className="page narrow"><PageHead title="Practice Listening" subtitle="Build comprehension from the conversations you actually have at work." onBack={() => navigate("home")} />
    <section className="quick-add"><div><span className="section-kicker">IN THE MOMENT</span><h2>Quick Add Word</h2><p>Save it now. Your coach can add meaning and context later.</p></div><div className="quick-input"><input value={quickWord} onChange={(e) => setQuickWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQuickWord()} placeholder="Type a word or phrase…" aria-label="Word or phrase" /><button onClick={addQuickWord}><Icon name="plus" /> Save</button></div></section>
    <h2 className="section-title">What do you want to do?</h2><div className="action-grid">
      <button className="action-card primary-action" onClick={() => navigate("today")}><span className="action-icon"><Icon name="clock" /></span><span><b>Today’s Listening</b><small>8 words · about 6 minutes</small><em>Continue practice <Icon name="arrow" /></em></span></button>
      <button className="action-card" onClick={() => navigate("import")}><span className="action-icon"><Icon name="upload" /></span><span><b>Import Conversation</b><small>Paste a transcript to find your weak vocabulary.</small><em>Analyze a conversation <Icon name="arrow" /></em></span></button>
      <button className="action-card" onClick={() => navigate("vocabulary")}><span className="action-icon"><Icon name="book" /></span><span><b>My Vocabulary</b><small>Your personal workplace language library.</small><em>Browse vocabulary <Icon name="arrow" /></em></span></button>
    </div>
    <section className="source-card"><div><span className="source-date">AUG 18</span><div><b>Product Launch Readiness</b><p>5 weak expressions discovered · 2 still need checking</p></div></div><button onClick={() => navigate("today")}>Review</button></section>
  </main>;
}

function PageHead({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) { return <div className="page-head"><button className="back" onClick={onBack}><Icon name="back" /> Back</button><h1>{title}</h1><p>{subtitle}</p></div>; }

function ImportPage({ transcript, setTranscript, runAnalysis, loading, navigate }: { transcript: string; setTranscript: (s: string) => void; runAnalysis: () => void; loading: boolean; navigate: (v: View) => void }) {
  return <main className="page narrow"><PageHead title="Import a conversation" subtitle="We’ll create candidates—not assumptions—then check what you actually understand." onBack={() => navigate("listening")} />
    <div className="flow-steps" aria-label="Import progress"><span className="active">1 Paste conversation</span><span>2 Check candidates</span><span>3 Build practice</span></div>
    <section className="form-card"><div className="privacy-callout"><span>⌁</span><div><b>Private by default</b><p>Raw source material stays separate from derived learning items and can be deleted with its conversation.</p></div></div>
      <label>Meeting title<input defaultValue="Launch Readiness Sync" /></label>
      <div className="speaker-row"><label>Your speaker label<input defaultValue="You" /></label><label>Date<input type="date" defaultValue="2026-08-20" /></label></div>
      <label>Conversation transcript<textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} placeholder="Paste speaker-labeled transcript here…" /></label>
      <div className="upload-placeholder"><Icon name="upload" /><span><b>Audio support is designed into the data model</b><small>Audio upload and pronunciation analysis arrive in Phase 3.</small></span><span className="soon">COMING LATER</span></div>
      <div className="analysis-preview"><span><b>{transcript.trim() ? transcript.split(/\s+/).length : 0}</b> words</span><span><b>{new Set(transcript.split("\n").map((line) => line.split(":")[0]).filter(Boolean)).size}</b> speakers detected</span><span><b>≈ 4</b> candidates expected</span></div>
      <div className="form-actions"><button className="sample-link" onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}>Restore sample</button><button onClick={runAnalysis} disabled={loading || !transcript.trim()}>{loading ? "Analyzing context…" : "Find vocabulary candidates"} <Icon name="arrow" /></button></div>
    </section>
  </main>;
}

function CandidateReview({ item, index, total, mode, choose, selfRating, answer, setAnswer, submit, result, next, navigate }: { item: Candidate; index: number; total: number; mode: string; choose: (s: string) => void; selfRating: string; answer: string; setAnswer: (s: string) => void; submit: () => void; result: string; next: () => void; navigate: (v: View) => void }) {
  return <main className="page review-page"><PageHead title="Vocabulary check" subtitle={`Candidate ${index + 1} of ${total} · from Launch Readiness Sync`} onBack={() => navigate("import")} />
    <div className="review-progress"><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
    <section className="context-card"><div className="context-label"><span>ORIGINAL MEETING CONTEXT</span><small>Marcus · 10:14 AM</small></div><blockquote>“{item.sentence.split(item.term).map((part, i, arr) => <span key={i}>{part}{i < arr.length - 1 && <mark>{item.term}</mark>}</span>)}”</blockquote><p>{item.context}</p></section>
    <section className="question-card">
      {mode === "choice" && <><span className="term-chip">{item.term}</span><h2>What do you think “{item.term}” means here?</h2><p>Be honest—this helps your coach choose the right kind of practice.</p><div className="knowledge-choices">{["I know it", "I kind of know it", "I don’t know it"].map((choice) => <button key={choice} onClick={() => choose(choice)}>{choice}<Icon name="arrow" /></button>)}</div></>}
      {mode === "explain" && <><span className="term-chip">{selfRating}</span><h2>Explain it in your own words.</h2><p>A natural explanation is better than a dictionary-perfect definition.</p><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="In this context, it means…" rows={4} /><button className="solid-button" disabled={!answer.trim()} onClick={submit}>Check my understanding <Icon name="arrow" /></button></>}
      {mode === "result" && <div className={`evaluation ${result === "Correct" ? "correct" : "learning"}`}><span className="result-label">{result}</span><h2>{result === "Correct" ? "You understood the speaker’s meaning." : "This belongs in your learning queue."}</h2><p><b>Clear explanation</b><br />{item.explanation}</p><div className="new-context"><small>ANOTHER WORKPLACE CONTEXT</small>“{item.newExample}”</div><button className="solid-button" onClick={next}>{index + 1 === total ? "Finish candidate check" : "Next candidate"} <Icon name="arrow" /></button></div>}
    </section>
  </main>;
}

function VocabularyPage({ items, navigate }: { items: VocabularyItem[]; navigate: (v: View) => void }) {
  const [selected, setSelected] = useState(items[0]);
  return <main className="page wide"><PageHead title="My Vocabulary" subtitle="A living model of the workplace English you recognize, understand, and use." onBack={() => navigate("listening")} />
    <div className="library-layout"><section className="vocab-list"><div className="list-toolbar"><span>{items.length} items</span><button onClick={() => navigate("today")}>Review due</button></div>{items.map((item) => <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelected(item)}><span><b>{item.term}</b><small>{item.definition}</small></span><em>{item.status}</em></button>)}</section>
      {selected && <section className="vocab-detail"><div className="detail-top"><div><span className="status-pill">{selected.status}</span><h2>{selected.term}</h2><p className="pronunciation">{selected.pronunciation} <button aria-label="Play pronunciation">▶</button></p></div><ProgressRing value={Math.round(Object.values(selected.mastery).reduce((a, b) => a + b, 0) / 6)} /></div><p className="definition">{selected.definition}</p>{selected.chinese && <p className="chinese">{selected.chinese}</p>}
        <div className="origin"><small>WHERE YOU FOUND IT · {selected.source}</small><blockquote>“{selected.sentence}”</blockquote><p>{selected.context}</p></div>
        <h3>Mastery profile</h3><div className="mastery-grid">{Object.entries(selected.mastery).map(([key, value]) => <div key={key}><span><b>{key.replace(/([A-Z])/g, " $1")}</b><em>{value}%</em></span><i><span style={{ width: `${value}%` }} /></i></div>)}</div>
        <div className="coach-note"><Icon name="spark" /><p><b>Why this is here</b>{selected.reason}</p></div>
      </section>}
    </div>
  </main>;
}

function TodayListening({ items, index, answer, setAnswer, revealed, setRevealed, complete, rate, restart, navigate }: { items: VocabularyItem[]; index: number; answer: string; setAnswer: (s: string) => void; revealed: boolean; setRevealed: (b: boolean) => void; complete: boolean; rate: (r: "Hard" | "Almost" | "Got it") => void; restart: () => void; navigate: (v: View) => void }) {
  const total = Math.min(5, Math.max(items.length * 2, 1));
  const item = items[index % Math.max(items.length, 1)];
  if (!item) return <main className="page practice-page"><PageHead title="Today’s Listening" subtitle="Nothing is due right now." onBack={() => navigate("listening")} /><section className="practice-card empty-state"><Icon name="spark" /><h2>You’re caught up.</h2><p>Import a real conversation to give your coach new evidence.</p><button className="solid-button" onClick={() => navigate("import")}>Import conversation</button></section></main>;
  if (complete) return <main className="page practice-page"><PageHead title="Session complete" subtitle="Your review schedule has been updated from today’s performance." onBack={() => navigate("listening")} /><section className="session-complete"><span>8 min</span><h2>You strengthened {Math.min(items.length, 3)} expressions.</h2><p>The next review will mix these into new workplace contexts instead of showing the same cards again.</p><div><b>Evidence captured</b><small>Contextual understanding + recall confidence</small></div><button className="solid-button" onClick={() => navigate("home")}>Return home</button><button className="text-button" onClick={restart}>Practice again</button></section></main>;
  const exercise = index % 4;
  const labels = ["Context recall", "Meaning recall", "Fill in the blank", "New workplace context"];
  const blankSentence = item.sentence.replace(new RegExp(item.term, "i"), "______");
  return <main className="page practice-page"><PageHead title="Today’s Listening" subtitle={`${total} focused items · approximately 8 minutes`} onBack={() => navigate("listening")} /><div className="session-progress"><span>{index + 1} of {total}</span><i aria-label={`${Math.round(((index + 1) / total) * 100)} percent complete`}><span style={{ width: `${((index + 1) / total) * 100}%` }} /></i><small>{labels[exercise]}</small></div>
    <section className="practice-card"><span className="exercise-type">{exercise === 3 ? "NEW CONTEXT" : "FROM YOUR MEETING"}</span>
      {exercise === 0 && <><p className="quote">“{item.sentence.split(item.term).map((p, i, a) => <span key={i}>{p}{i < a.length - 1 && <mark>{item.term}</mark>}</span>)}”</p><h2>What did “{item.term}” mean here?</h2></>}
      {exercise === 1 && <><p className="focus-word">{item.term}</p><h2>Explain this expression without looking at the meeting sentence.</h2></>}
      {exercise === 2 && <><p className="quote">“{blankSentence}”</p><h2>Which expression completes the speaker’s meaning?</h2></>}
      {exercise === 3 && <><p className="quote">“{item.newExample}”</p><h2>What does the speaker mean in this new situation?</h2></>}
      {!revealed ? <><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={exercise === 2 ? "Type the missing expression…" : "Explain it in your own words…"} rows={3} /><div className="practice-actions"><button className="text-button" onClick={() => setRevealed(true)}>I’m not sure</button><button className="solid-button" disabled={!answer.trim()} onClick={() => setRevealed(true)}>Check answer</button></div></> : <div className="answer-reveal"><small>CLEAR EXPLANATION</small><p><b>{item.term}</b> — {item.explanation}</p><div><span>How well did you understand it?</span>{(["Hard", "Almost", "Got it"] as const).map((choice) => <button key={choice} onClick={() => rate(choice)}>{choice}</button>)}</div></div>}
    </section>
  </main>;
}

function SpeakingPractice({ attempt, setAttempt, result, evaluate, reset, navigate }: { attempt: string; setAttempt: (s: string) => void; result: "" | "strong" | "retry"; evaluate: () => void; reset: () => void; navigate: (v: View) => void }) {
  return <main className="page speaking-page"><PageHead title="Practice Speaking" subtitle="Express the idea in your head with less information loss." onBack={() => navigate("home")} />
    <section className="speaking-summary"><div><span className="section-kicker">10-MINUTE PRACTICE READY</span><h2>Your Top 2 Focus Areas This Week</h2></div><button onClick={() => navigate("roadmap")}>View 12-week plan →</button></section>
    <div className="focus-grid">{weeklyFocus.map((focus, index) => <article key={focus.title}><span>0{index + 1}</span><div><b>{focus.title}</b><p>{focus.why}</p><small>{focus.evidence}</small></div><em>{focus.priority}</em></article>)}</div>
    <section className="correction-loop"><div className="loop-step"><span>1</span><small>REAL EXAMPLE · {speakingExercise.source}</small><h3>You said</h3><blockquote>“{speakingExercise.original}”</blockquote></div>
      <div className="intent-compare"><div><small>WHAT YOU MEANT</small><p>{speakingExercise.intent}</p></div><div><small>WHAT THE LISTENER HAD TO DO</small><p>Infer whether the launch, the announcement, or both should be delayed.</p></div></div>
      <div className="coach-diagnosis"><Icon name="spark" /><div><b>The real problem</b><p>{speakingExercise.problem}</p><span>{speakingExercise.framework}</span></div></div>
      <div className="clearer-version"><small>A CLEARER WORKPLACE VERSION</small><p>“{speakingExercise.clearer}”</p></div>
      <div className="retry-box"><span className="loop-number">2</span><div><h3>Now say it again in your own words.</h3><p>Keep the meaning. Lead with the decision and stay under 38 words.</p></div><textarea value={attempt} onChange={(e) => setAttempt(e.target.value)} rows={4} placeholder="I recommend…" /><div className="retry-actions"><span>{attempt.trim() ? attempt.trim().split(/\s+/).length : 0} / 38 words</span><button className="solid-button" disabled={!attempt.trim()} onClick={evaluate}>Evaluate my new version</button></div>
        {result && <div className={`speaking-feedback ${result}`}><b>{result === "strong" ? "Clearer and decision-led." : "Good start—make the decision more explicit."}</b><p>{result === "strong" ? "You preserved the Friday launch, separated the announcement, and named Legal as the condition." : "Try naming all three anchors: Friday launch, hold off the announcement, and Legal approval."}</p><button onClick={reset}>Try one more time</button></div>}
      </div>
    </section>
    <p className="honesty-note">Transcript analysis can evaluate grammar, vocabulary, clarity, structure, and naturalness. Pronunciation requires audio and is not inferred from text.</p>
  </main>;
}

function RoadmapPage({ navigate }: { navigate: (v: View) => void }) {
  return <main className="page narrow"><PageHead title="Your 12-week breakthrough plan" subtitle="Progress is verified in future work conversations—not with points or streak pressure." onBack={() => navigate("home")} />
    <section className="north-star"><span>90-DAY OUTCOME</span><h2>Understand coworkers faster and make your point clearly the first time.</h2><p>Each week follows the same loop: real conversation → diagnosis → focused practice → active correction → spaced review → verify transfer.</p></section>
    <div className="roadmap-list">{roadmap.map((phase, index) => <article key={phase.weeks}><span>0{index + 1}</span><div><small>{phase.weeks}</small><h3>{phase.title}</h3><p>{phase.description}</p><b>Evidence target: {phase.target}</b></div></article>)}</div>
    <section className="measurement-card"><h3>How the coach will prove improvement</h3><div><span><b>Listening</b><small>Fewer unknown expressions and better speech recognition</small></span><span><b>Speaking</b><small>Shorter, clearer recommendations with fewer recurring errors</small></span><span><b>Transfer</b><small>Correct use appears in new, real workplace conversations</small></span></div></section>
  </main>;
}
