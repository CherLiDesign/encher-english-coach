"use client";

import { useMemo, useState } from "react";
import { analyzeTranscript, evaluateAnswer, SAMPLE_TRANSCRIPT, seedVocabulary } from "../lib/mock-ai";
import type { Candidate, View, VocabularyItem } from "../lib/types";

const Icon = ({ name }: { name: "headphones" | "mic" | "arrow" | "book" | "plus" | "upload" | "clock" | "spark" | "back" }) => {
  const icons = { headphones: "◖◗", mic: "●", arrow: "→", book: "▤", plus: "+", upload: "↥", clock: "◷", spark: "✦", back: "←" };
  return <span aria-hidden="true">{icons[name]}</span>;
};

function ProgressRing({ value }: { value: number }) {
  return <span className="ring" style={{ "--progress": `${value * 3.6}deg` } as React.CSSProperties}><span>{value}%</span></span>;
}

export function CoachApp() {
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

  const currentCandidate = candidates[candidateIndex];
  const dueItems = useMemo(() => vocabulary.filter((item) => item.due), [vocabulary]);

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const flash = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2400); };

  const addQuickWord = () => {
    const term = quickWord.trim();
    if (!term) return;
    setVocabulary((items) => [{ ...seedVocabulary[0], id: `${term}-${Date.now()}`, term, definition: "Pending enrichment", chinese: undefined, sentence: "Quick-added during work — add source context later.", context: "Saved without interrupting your workflow.", source: "Quick Add", discoveredAt: "Today", reason: "You saved this as unfamiliar.", explanation: "The coach will enrich this item when context becomes available.", newExample: "A workplace example will be generated after enrichment.", pronunciation: "Pending", status: "Unknown", mastery: { recognition: 5, contextual: 0, listening: 0, recall: 0, activeUse: 0, pronunciation: 0 }, due: true }, ...items]);
    setQuickWord(""); flash(`“${term}” saved to My Vocabulary`);
  };

  const runAnalysis = async () => {
    setLoading(true); const found = await analyzeTranscript(transcript); setCandidates(found); setLoading(false); setCandidateIndex(0); setAnswerMode("choice"); navigate("review");
  };

  const chooseKnowledge = (rating: string) => {
    setSelfRating(rating);
    if (rating === "I don’t know it") { setResult("Unknown"); setAnswerMode("result"); addCandidate(currentCandidate, "Unknown"); }
    else setAnswerMode("explain");
  };
  const addCandidate = (item: Candidate, status = "Learning") => setVocabulary((items) => items.some((v) => v.id === item.id) ? items : [{ ...item, status: status as VocabularyItem["status"] }, ...items]);
  const submitAnswer = () => { const evaluation = evaluateAnswer(answer, currentCandidate); setResult(evaluation); setAnswerMode("result"); if (evaluation !== "Correct") addCandidate(currentCandidate); };
  const nextCandidate = () => { if (candidateIndex < candidates.length - 1) { setCandidateIndex((i) => i + 1); setAnswerMode("choice"); setAnswer(""); setResult(""); setSelfRating(""); } else { navigate("vocabulary"); flash("Candidate check complete"); } };

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate("home")}><span className="brand-mark">e</span><span>Encher</span></button>
      <nav aria-label="Primary navigation">
        <button className={view === "listening" ? "active" : ""} onClick={() => navigate("listening")}>Listening</button>
        <button className={view === "speaking" ? "active" : ""} onClick={() => navigate("speaking")}>Speaking</button>
        <button className={view === "vocabulary" ? "active" : ""} onClick={() => navigate("vocabulary")}>Vocabulary</button>
      </nav>
      <button className="avatar" aria-label="User profile">AC</button>
    </header>
    {view === "home" && <Home navigate={navigate} />}
    {view === "listening" && <ListeningHome quickWord={quickWord} setQuickWord={setQuickWord} addQuickWord={addQuickWord} navigate={navigate} />}
    {view === "import" && <ImportPage transcript={transcript} setTranscript={setTranscript} runAnalysis={runAnalysis} loading={loading} navigate={navigate} />}
    {view === "review" && currentCandidate && <CandidateReview item={currentCandidate} index={candidateIndex} total={candidates.length} mode={answerMode} choose={chooseKnowledge} selfRating={selfRating} answer={answer} setAnswer={setAnswer} submit={submitAnswer} result={result} next={nextCandidate} navigate={navigate} />}
    {view === "vocabulary" && <VocabularyPage items={vocabulary} navigate={navigate} />}
    {view === "today" && <TodayListening items={dueItems} index={practiceIndex} setIndex={setPracticeIndex} revealed={practiceRevealed} setRevealed={setPracticeRevealed} navigate={navigate} />}
    {view === "speaking" && <SpeakingPreview navigate={navigate} />}
    {toast && <div className="toast" role="status"><Icon name="spark" /> {toast}</div>}
  </div>;
}

function Home({ navigate }: { navigate: (v: View) => void }) {
  return <main className="home page">
    <section className="welcome"><p className="eyebrow">Thursday, August 20</p><h1>Good evening, Alex.</h1><p>Your work already knows what you need to learn. Let’s use it.</p></section>
    <section className="mode-grid">
      <button className="mode-card listening-card" onClick={() => navigate("listening")}>
        <span className="mode-icon"><Icon name="headphones" /></span><span className="mode-copy"><span className="mode-label">Practice Listening</span><span className="mode-title">Understand your coworkers better</span><span className="mode-desc">Turn real meeting language into vocabulary you can recognize, understand, and use.</span><span className="mode-link">Start listening practice <Icon name="arrow" /></span></span>
        <span className="mode-meta"><strong>8</strong><small>words due today</small><span>3 new candidates</span></span>
      </button>
      <button className="mode-card speaking-card" onClick={() => navigate("speaking")}>
        <span className="mode-icon"><Icon name="mic" /></span><span className="mode-copy"><span className="mode-label">Practice Speaking</span><span className="mode-title">Express yourself clearly</span><span className="mode-desc">Improve the grammar, clarity, and workplace English in your own real speaking.</span><span className="mode-link">View speaking focus <Icon name="arrow" /></span></span>
        <span className="mode-meta"><strong>2</strong><small>focus areas this week</small><span>10-minute practice ready</span></span>
      </button>
    </section>
    <section className="quiet-note"><Icon name="spark" /><div><strong>Your coach noticed a transfer</strong><p>You used “trade-off” naturally in Tuesday’s product review. Its Active Use mastery increased.</p></div><button onClick={() => navigate("vocabulary")}>View item</button></section>
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
    <section className="form-card"><div className="privacy-callout"><span>⌁</span><div><b>Private by default</b><p>Raw source material stays separate from derived learning items and can be deleted with its conversation.</p></div></div>
      <label>Meeting title<input defaultValue="Launch Readiness Sync" /></label>
      <div className="speaker-row"><label>Your speaker label<input defaultValue="You" /></label><label>Date<input type="date" defaultValue="2026-08-20" /></label></div>
      <label>Conversation transcript<textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} /></label>
      <div className="upload-placeholder"><Icon name="upload" /><span><b>Audio support is designed into the data model</b><small>Audio upload and pronunciation analysis arrive in Phase 3.</small></span><span className="soon">COMING LATER</span></div>
      <div className="form-actions"><span>{transcript.split(/\s+/).length} words · 3 speakers detected</span><button onClick={runAnalysis} disabled={loading || !transcript.trim()}>{loading ? "Analyzing context…" : "Find vocabulary candidates"} <Icon name="arrow" /></button></div>
    </section>
  </main>;
}

function CandidateReview({ item, index, total, mode, choose, selfRating, answer, setAnswer, submit, result, next, navigate }: { item: Candidate; index: number; total: number; mode: string; choose: (s: string) => void; selfRating: string; answer: string; setAnswer: (s: string) => void; submit: () => void; result: string; next: () => void; navigate: (v: View) => void }) {
  return <main className="page review-page"><PageHead title="Vocabulary check" subtitle={`Candidate ${index + 1} of ${total} · from Launch Readiness Sync`} onBack={() => navigate("import")} />
    <div className="review-progress"><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
    <section className="context-card"><div className="context-label"><span>ORIGINAL MEETING CONTEXT</span><small>Marcus · 10:14 AM</small></div><blockquote>“{item.sentence.split(item.term).map((part, i, arr) => <span key={i}>{part}{i < arr.length - 1 && <mark>{item.term}</mark>}</span>)}”</blockquote><p>{item.context}</p></section>
    <section className="question-card">
      {mode === "choice" && <><span className="term-chip">{item.term}</span><h2>What do you think “{item.term}” means here?</h2><p>Be honest—this helps your coach choose the right kind of practice.</p><div className="knowledge-choices">{["I know it", "I kind of know it", "I don’t know it"].map((choice) => <button key={choice} onClick={() => choose(choice)}>{choice}<Icon name="arrow" /></button>)}</div></>}
      {mode === "explain" && <><span className="term-chip">{selfRating}</span><h2>Explain it in your own words.</h2><p>A natural explanation is better than a dictionary-perfect definition.</p><textarea autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="In this context, it means…" rows={4} /><button className="solid-button" disabled={!answer.trim()} onClick={submit}>Check my understanding <Icon name="arrow" /></button></>}
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

function TodayListening({ items, index, setIndex, revealed, setRevealed, navigate }: { items: VocabularyItem[]; index: number; setIndex: (n: number) => void; revealed: boolean; setRevealed: (b: boolean) => void; navigate: (v: View) => void }) {
  const item = items[index % Math.max(items.length, 1)]; if (!item) return null;
  const next = () => { setIndex((index + 1) % items.length); setRevealed(false); };
  return <main className="page practice-page"><PageHead title="Today’s Listening" subtitle={`${items.length + 5} items · approximately 8 minutes`} onBack={() => navigate("listening")} /><div className="session-progress"><span>{index + 1} of {items.length + 5}</span><i><span style={{ width: `${((index + 1) / (items.length + 5)) * 100}%` }} /></i><small>Context recall</small></div>
    <section className="practice-card"><span className="exercise-type">FROM YOUR MEETING</span><p className="quote">“{item.sentence.split(item.term).map((p, i, a) => <span key={i}>{p}{i < a.length - 1 && <mark>{item.term}</mark>}</span>)}”</p><h2>What did “{item.term}” mean in this conversation?</h2>{!revealed ? <><textarea placeholder="Explain it in your own words…" rows={4} /><div className="practice-actions"><button className="text-button" onClick={() => setRevealed(true)}>I’m not sure</button><button className="solid-button" onClick={() => setRevealed(true)}>Check answer</button></div></> : <div className="answer-reveal"><small>CLEAR EXPLANATION</small><p>{item.explanation}</p><div><span>How well did you remember?</span><button onClick={next}>Hard</button><button onClick={next}>Almost</button><button onClick={next}>Got it</button></div></div>}</section>
  </main>;
}

function SpeakingPreview({ navigate }: { navigate: (v: View) => void }) { return <main className="page narrow"><PageHead title="Practice Speaking" subtitle="Express the idea in your head with less information loss." onBack={() => navigate("home")} /><section className="speaking-hero"><span className="phase-pill">PHASE 2 · FOUNDATION READY</span><h2>Your speaking coach is designed as a separate learning experience.</h2><p>It will isolate your turns, cluster recurring patterns, and prioritize the two changes with the greatest communication impact.</p><div className="focus-preview"><small>YOUR TOP 2 FOCUS AREAS THIS WEEK</small><div><span>01</span><p><b>Lead with the recommendation</b>3 high-impact examples in recent meetings</p><em>High priority</em></div><div><span>02</span><p><b>Articles in live speech</b>Recurring pattern across 4 conversations</p><em>Medium</em></div></div><div className="capability-note"><b>Transcript analysis</b><span>Grammar · vocabulary · clarity · structure · naturalness</span><b>With audio</b><span>Pronunciation · rhythm · stress · pauses · fluency</span></div><p className="honesty-note">This MVP does not evaluate pronunciation from text. Audio-based assessment is intentionally reserved for Phase 3.</p></section></main>; }
