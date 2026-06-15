import { useState, useEffect, useRef } from "react";

const HIKE_DATE = new Date("2026-08-29");
const STORAGE_KEY = "slovenia-hike-logs";

const WORKOUTS = [
  { id: "volleyball", label: "Bootcamp / Yoga", day: "Mon" },
  { id: "spin1", label: "Spin Class", day: "Tue" },
  { id: "trx", label: "TRX + Yoga", day: "Wed" },
  { id: "spin2", label: "Spin Class", day: "Thu" },
  { id: "bootcamp", label: "Bootcamp", day: "Fri" },
  { id: "yoga_hike", label: "Yoga / Hike", day: "Sat" },
];

const PHASES = [
  { label: "Phase 1", subtitle: "Build the Engine", start: "2026-03-10", end: "2026-04-30", color: "#4ECDC4" },
  { label: "Phase 2", subtitle: "Build Mileage", start: "2026-05-01", end: "2026-06-30", color: "#FFB347" },
  { label: "Phase 3", subtitle: "Sharpen & Simulate", start: "2026-07-01", end: "2026-08-14", color: "#FF6B6B" },
  { label: "Taper", subtitle: "Final Prep", start: "2026-08-15", end: "2026-08-28", color: "#C3A6FF" },
];

function getPhase(date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return PHASES.find(p => d >= p.start && d <= p.end) || null;
}

function weeksUntilHike() {
  const now = new Date();
  const diff = HIKE_DATE - now;
  return Math.max(0, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)));
}

function calcReadiness(logs) {
  if (!logs.length) return null;
  const recent = logs.slice(-4);
  let score = 0;
  let factors = [];

  // Workout consistency (0-35)
  const avgWorkouts = recent.reduce((s, l) => s + (l.workoutsCompleted || 0), 0) / recent.length;
  const workoutScore = Math.min(35, Math.round((avgWorkouts / 6) * 35));
  score += workoutScore;
  factors.push({ label: "Workout Consistency", value: workoutScore, max: 35, detail: `${avgWorkouts.toFixed(1)}/6 sessions avg` });

  // Hiking-specific training (0-25)
  const hikeWeeks = recent.filter(l => l.hikingDone).length;
  const hikeScore = Math.round((hikeWeeks / 4) * 25);
  score += hikeScore;
  factors.push({ label: "Hike-Specific Training", value: hikeScore, max: 25, detail: `${hikeWeeks}/4 weeks with hikes` });

  // Nutrition (0-20)
  const avgProtein = recent.reduce((s, l) => s + (parseInt(l.proteinAvg) || 0), 0) / recent.length;
  const proteinScore = Math.min(20, Math.round((avgProtein / 115) * 20));
  score += proteinScore;
  factors.push({ label: "Nutrition / Protein", value: proteinScore, max: 20, detail: `${Math.round(avgProtein)}g protein avg` });

  // Recovery (0-20)
  const avgSleep = recent.reduce((s, l) => s + (parseFloat(l.sleepHours) || 7), 0) / recent.length;
  const sleepScore = Math.min(20, Math.round(((avgSleep - 5) / 4) * 20));
  score += sleepScore;
  factors.push({ label: "Sleep & Recovery", value: sleepScore, max: 20, detail: `${avgSleep.toFixed(1)}h sleep avg` });

  return { score: Math.min(100, score), factors };
}

function ReadinessMeter({ score }) {
  const color = score >= 80 ? "#4ECDC4" : score >= 60 ? "#FFB347" : score >= 40 ? "#FF9F43" : "#FF6B6B";
  const label = score >= 85 ? "Summit Ready 🏔" : score >= 70 ? "On Track 💪" : score >= 50 ? "Building Base 🌱" : "Early Stage 🥾";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ marginTop: "-110px", textAlign: "center", zIndex: 1 }}>
        <div style={{ fontSize: "36px", fontWeight: "800", color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>/ 100</div>
      </div>
      <div style={{ marginTop: "28px", fontSize: "14px", fontWeight: "600", color, letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

function FactorBar({ label, value, max, detail }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? "#4ECDC4" : pct >= 60 ? "#FFB347" : "#FF6B6B";
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span style={{ fontSize: "12px", color, fontWeight: "600" }}>{value}/{max}</span>
      </div>
      <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 0.8s ease" }} />
      </div>
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{detail}</div>
    </div>
  );
}

function AIAnalysis({ logs }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  async function getAnalysis() {
    if (loading || !logs.length) return;
    setLoading(true);
    setAnalysis("");
    setRan(true);

    const recent = logs.slice(-4);
    const summary = recent.map(l =>
      `Week of ${l.weekOf}: ${l.workoutsCompleted}/6 workouts, hiking: ${l.hikingDone ? "yes" : "no"}, pack weight: ${l.packWeight || "none"}, protein avg: ${l.proteinAvg || "?"}g/day, sleep: ${l.sleepHours || "?"}h, notes: ${l.notes || "none"}`
    ).join("\n");

    const weeksLeft = weeksUntilHike();
    const phase = getPhase();

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a mountain hiking coach preparing a 46-year-old woman (5'4", 140 lb, 19.5% body fat) for a 6-day hut-to-hut hike in Slovenia's Julian Alps in late August 2026. The hike covers 48+ miles with 14,000+ ft cumulative elevation gain. Her current routine is: Mon volleyball/yoga, Tue spin 45min, Wed TRX+yoga, Thu spin 45min, Fri bootcamp 55min, Sat yoga/hike. Key concerns: trunk fat accumulation, leg lean mass below average, no hiking-specific training historically. Goals: build hiking-specific leg strength, increase pack weight, improve respiratory rate. Be direct, warm, specific, and encouraging. Keep response to 150-200 words.`,
          messages: [{
            role: "user",
            content: `There are ${weeksLeft} weeks until the hike. Current phase: ${phase ? phase.label + " - " + phase.subtitle : "Pre-phase"}.\n\nRecent training logs:\n${summary}\n\nGive me a personalized readiness assessment and the 2-3 most important things to focus on this week.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "Unable to get analysis.";
      setAnalysis(text);
    } catch (e) {
      setAnalysis("Unable to connect to AI coach. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ marginTop: "16px" }}>
      {!ran && (
        <button onClick={getAnalysis} style={{
          width: "100%", padding: "12px", background: "linear-gradient(135deg, #4ECDC4, #44B09A)",
          border: "none", borderRadius: "10px", color: "white", fontSize: "14px",
          fontWeight: "700", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.04em"
        }}>
          🤖 Get AI Coach Analysis
        </button>
      )}
      {loading && (
        <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
          <div style={{ animation: "pulse 1.5s infinite" }}>Analyzing your training data...</div>
        </div>
      )}
      {analysis && (
        <div style={{
          padding: "16px", background: "rgba(78,205,196,0.08)", border: "1px solid rgba(78,205,196,0.2)",
          borderRadius: "10px", fontSize: "13px", lineHeight: "1.7", color: "rgba(255,255,255,0.85)",
          fontFamily: "'DM Sans', sans-serif"
        }}>
          <div style={{ fontSize: "11px", color: "#4ECDC4", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "8px" }}>AI COACH</div>
          {analysis}
          <button onClick={() => { setRan(false); setAnalysis(""); }} style={{
            marginTop: "12px", padding: "6px 14px", background: "transparent",
            border: "1px solid rgba(78,205,196,0.3)", borderRadius: "6px", color: "#4ECDC4",
            fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
          }}>Refresh Analysis</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("dashboard"); // dashboard | log | history
  const [form, setForm] = useState({
    weekOf: new Date().toISOString().slice(0, 10),
    workoutsCompleted: 0,
    hikingDone: false,
    hikeMiles: "",
    hikeElevation: "",
    packWeight: "",
    proteinAvg: "",
    sleepHours: "",
    trunkFatNote: "",
    energyLevel: "3",
    notes: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) setLogs(JSON.parse(r.value));
      } catch (e) {}
    }
    load();
  }, []);

  async function saveLog() {
    const newLogs = [...logs.filter(l => l.weekOf !== form.weekOf), { ...form, savedAt: new Date().toISOString() }]
      .sort((a, b) => a.weekOf.localeCompare(b.weekOf));
    setLogs(newLogs);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(newLogs)); } catch (e) {}
    setSaved(true);
    setTimeout(() => { setSaved(false); setView("dashboard"); }, 1200);
  }

  const readiness = calcReadiness(logs);
  const weeks = weeksUntilHike();
  const phase = getPhase();

  const inputStyle = {
    width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
    color: "white", fontSize: "14px", fontFamily: "'DM Sans', sans-serif",
    outline: "none", boxSizing: "border-box"
  };

  const labelStyle = { fontSize: "11px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px", display: "block" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0D1B2A 0%, #1A2942 50%, #0D1B2A 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "white",
      padding: "0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .card { animation: fadeIn 0.4s ease forwards; }
        input[type=range] { accent-color: #4ECDC4; }
        input:focus, select:focus { border-color: rgba(78,205,196,0.5) !important; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#4ECDC4", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: "600" }}>
                {phase ? `${phase.label} · ${phase.subtitle}` : "Pre-Training"}
              </div>
              <h1 style={{ margin: "2px 0 0", fontSize: "22px", fontFamily: "'DM Serif Display', serif", fontWeight: "400", letterSpacing: "-0.01em" }}>
                Slovenia Hike Tracker
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#4ECDC4", fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{weeks}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>weeks left</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
            {[["dashboard","Dashboard"],["log","Log Week"],["history","History"]].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                flex: 1, padding: "8px", border: "none", borderRadius: "8px", fontSize: "12px",
                fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.03em", transition: "all 0.2s",
                background: view === v ? "#4ECDC4" : "rgba(255,255,255,0.07)",
                color: view === v ? "#0D1B2A" : "rgba(255,255,255,0.6)"
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="card">
            {/* Phase progress */}
            {phase && (
              <div style={{ marginBottom: "20px", padding: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600" }}>{phase.label}: {phase.subtitle}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{phase.start} → {phase.end}</div>
                  </div>
                  <div style={{ fontSize: "11px", padding: "4px 10px", background: phase.color + "22", color: phase.color, borderRadius: "20px", fontWeight: "600" }}>Active</div>
                </div>
                {(() => {
                  const s = new Date(phase.start), e = new Date(phase.end), n = new Date();
                  const pct = Math.min(100, Math.max(0, Math.round(((n - s) / (e - s)) * 100)));
                  return (
                    <div>
                      <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: phase.color, borderRadius: "3px" }} />
                      </div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{pct}% through this phase</div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Readiness */}
            {readiness ? (
              <div style={{ padding: "24px 20px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>Hike Readiness Score</div>
                <ReadinessMeter score={readiness.score} />
                <div style={{ marginTop: "24px" }}>
                  {readiness.factors.map(f => <FactorBar key={f.label} {...f} />)}
                </div>
                <AIAnalysis logs={logs} />
              </div>
            ) : (
              <div style={{ padding: "32px 20px", textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: "14px", border: "1px dashed rgba(255,255,255,0.12)", marginBottom: "16px" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🥾</div>
                <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>No logs yet</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>Log your first week to see your hike readiness score and get personalized AI coaching.</div>
                <button onClick={() => setView("log")} style={{
                  padding: "10px 24px", background: "#4ECDC4", border: "none", borderRadius: "8px",
                  color: "#0D1B2A", fontSize: "13px", fontWeight: "700", cursor: "pointer"
                }}>Log This Week</button>
              </div>
            )}

            {/* Hike overview pills */}
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Your 6-Day Hike</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                ["Aug 29","Završnica → Prešernova Koča","5.3 mi","5,250 ft gain","#FF6B6B"],
                ["Aug 30","Mt. Stol Ridge","8.7 mi","1,083 ft gain","#FFB347"],
                ["Aug 31","Golici → Aljažev Dom","14.9 mi","2,625 ft gain","#FF6B6B"],
                ["Sep 1","Vrata → Koča na Doliču","5.6 mi","4,593 ft gain","#FF6B6B"],
                ["Sep 2","Seven Lakes Valley","5.6 mi","755 ft gain","#4ECDC4"],
                ["Sep 3","Final Descent → Bohinj","8.4 mi","328 ft gain","#4ECDC4"],
              ].map(([date, name, dist, elev, color]) => (
                <div key={date} style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", gap: "12px" }}>
                  <div style={{ fontSize: "11px", color: color, fontWeight: "700", minWidth: "42px" }}>{date}</div>
                  <div style={{ flex: 1, fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{name}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
                    <div>{dist}</div>
                    <div style={{ color }}>{elev}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOG WEEK */}
        {view === "log" && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Week Starting</label>
              <input type="date" value={form.weekOf} onChange={e => setForm({...form, weekOf: e.target.value})} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Workouts Completed This Week</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {WORKOUTS.map((w, i) => {
                  const active = form.workoutsCompleted > i;
                  return (
                    <button key={w.id} onClick={() => setForm({...form, workoutsCompleted: active && form.workoutsCompleted === i+1 ? i : i+1})} style={{
                      padding: "6px 12px", borderRadius: "8px", border: "1px solid",
                      borderColor: active ? "#4ECDC4" : "rgba(255,255,255,0.1)",
                      background: active ? "rgba(78,205,196,0.15)" : "transparent",
                      color: active ? "#4ECDC4" : "rgba(255,255,255,0.4)",
                      fontSize: "11px", fontWeight: "600", cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif"
                    }}>{w.day}</button>
                  );
                })}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "6px" }}>{form.workoutsCompleted} of 6 sessions</div>
            </div>

            <div style={{ padding: "14px", background: "rgba(255,255,255,0.04)", borderRadius: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.hikingDone ? "14px" : "0" }}>
                <label style={{ ...labelStyle, margin: 0 }}>Hiking / Stair Training Done?</label>
                <button onClick={() => setForm({...form, hikingDone: !form.hikingDone})} style={{
                  width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: form.hikingDone ? "#4ECDC4" : "rgba(255,255,255,0.15)", transition: "background 0.2s", position: "relative"
                }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "white", position: "absolute", top: "3px", transition: "left 0.2s", left: form.hikingDone ? "23px" : "3px" }} />
                </button>
              </div>
              {form.hikingDone && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={labelStyle}>Miles</label>
                    <input type="number" placeholder="0" value={form.hikeMiles} onChange={e => setForm({...form, hikeMiles: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Elev (ft)</label>
                    <input type="number" placeholder="0" value={form.hikeElevation} onChange={e => setForm({...form, hikeElevation: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Pack (lb)</label>
                    <input type="number" placeholder="0" value={form.packWeight} onChange={e => setForm({...form, packWeight: e.target.value})} style={inputStyle} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Avg Protein/Day (g)</label>
                <input type="number" placeholder="~110 target" value={form.proteinAvg} onChange={e => setForm({...form, proteinAvg: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Avg Sleep (hrs)</label>
                <input type="number" step="0.5" placeholder="8.0" value={form.sleepHours} onChange={e => setForm({...form, sleepHours: e.target.value})} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Energy Level (1–5)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm({...form, energyLevel: String(n)})} style={{
                    flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid",
                    borderColor: form.energyLevel === String(n) ? "#FFB347" : "rgba(255,255,255,0.1)",
                    background: form.energyLevel === String(n) ? "rgba(255,179,71,0.15)" : "transparent",
                    color: form.energyLevel === String(n) ? "#FFB347" : "rgba(255,255,255,0.4)",
                    fontSize: "16px", cursor: "pointer"
                  }}>{["😴","😐","🙂","💪","🔥"][n-1]}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notes (nutrition wins, challenges, how body felt)</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="e.g. Hit protein goals 5/7 days. Legs felt heavy after back-to-back hikes. Sleep was great..."
                style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} />
            </div>

            <button onClick={saveLog} style={{
              padding: "14px", background: saved ? "#4ECDC4" : "linear-gradient(135deg, #4ECDC4, #44B09A)",
              border: "none", borderRadius: "10px", color: saved ? "#0D1B2A" : "#0D1B2A",
              fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.3s"
            }}>
              {saved ? "✓ Saved!" : "Save This Week's Log"}
            </button>
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div className="card">
            {logs.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                No logs yet. Start tracking to see your history!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[...logs].reverse().map(log => (
                  <div key={log.weekOf} style={{ padding: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ fontSize: "13px", fontWeight: "700" }}>Week of {log.weekOf}</div>
                      <div style={{ fontSize: "11px", padding: "3px 10px", background: "rgba(78,205,196,0.1)", color: "#4ECDC4", borderRadius: "20px" }}>
                        {log.workoutsCompleted}/6 workouts
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: log.notes ? "10px" : "0" }}>
                      {[
                        ["Protein", log.proteinAvg ? `${log.proteinAvg}g` : "—"],
                        ["Sleep", log.sleepHours ? `${log.sleepHours}h` : "—"],
                        ["Energy", ["😴","😐","🙂","💪","🔥"][parseInt(log.energyLevel||3)-1]],
                      ].map(([k,v]) => (
                        <div key={k} style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
                          <div style={{ fontSize: "15px", fontWeight: "700" }}>{v}</div>
                          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{k}</div>
                        </div>
                      ))}
                    </div>
                    {log.hikingDone && (
                      <div style={{ fontSize: "12px", color: "#4ECDC4", marginBottom: "6px" }}>
                        🥾 {log.hikeMiles || "?"} mi · {log.hikeElevation || "?"}ft · {log.packWeight || "?"}lb pack
                      </div>
                    )}
                    {log.notes && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: "1.5", fontStyle: "italic" }}>"{log.notes}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
