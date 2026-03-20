import { useState, useEffect, useRef } from "react";

/* ─── SUPABASE SINGLETON ─────────────────────────────────────────────────── */
let _sb = null;
const getSB = async () => {
  if (_sb) return _sb;
  const { createClient } = await import("@supabase/supabase-js");
  _sb = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  return _sb;
};

/* ─── AI NLP ─────────────────────────────────────────────────────────────── */
const extractSymptomsAI = async (text, lang) => {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: `You are a triage assistant at an Indian UPHC. Patient complaint in ${lang === "HI" ? "Hindi" : lang === "GU" ? "Gujarati" : "English"}: "${text}". Return ONLY JSON (no markdown): {"clinical_tags":["..."],"urgency":"yellow","department":"General OPD","summary":"Brief English summary","urgency_reason":"..."}` }],
      }),
    });
    const d = await res.json();
    const raw = (d.content || []).map((c) => c.text || "").join("").replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  } catch {
    return { clinical_tags: ["Requires assessment"], urgency: "yellow", department: "General OPD", summary: text, urgency_reason: "Default triage" };
  }
};

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const DEPTS = [
  { id: "opd", label: "General OPD", icon: "🩺", color: "#1E40AF" },
  { id: "mat", label: "Maternity", icon: "🤰", color: "#7C3AED" },
  { id: "vax", label: "Vaccination", icon: "💉", color: "#065F46" },
  { id: "dnt", label: "Dental", icon: "🦷", color: "#92400E" },
  { id: "eye", label: "Eye / ENT", icon: "👁", color: "#155E75" },
  { id: "lab", label: "Lab / Tests", icon: "🧪", color: "#9F1239" },
];
const SYM_ICONS = ["🤒", "😮‍💨", "🦴", "🤰", "💉", "❓"];
const TC = {
  red:    { bg: "rgba(254,226,226,.9)", border: "#F87171", badge: "#DC2626", label: "URGENT"   },
  yellow: { bg: "rgba(254,243,199,.9)", border: "#FCD34D", badge: "#D97706", label: "STANDARD" },
  green:  { bg: "rgba(209,250,229,.9)", border: "#6EE7B7", badge: "#059669", label: "ROUTINE"  },
};
const L = {
  EN: {
    welcome:"Welcome to UPHC",tagline:"Urban Primary Health Centre — Ahmedabad",
    tapSpeak:"Tap to Speak",describe:"Describe how you are feeling",bookManual:"Book Manually",tapType:"Tap / Type",
    waBook:"Book on WhatsApp",smsBook:"No Internet? SMS 'BOOK' to 1800-XXX",
    checkStatus:"Check Token Status",enterMobile:"Mobile number",checkBtn:"Check",
    s1title:"Your Details",s1otp:"Enter OTP",s1sent:"OTP sent to",s1verify:"Verify OTP",s1resend:"Resend OTP",
    s2title:"What's bothering you?",s3title:"You're Booked!",holdSpeak:"Hold to Speak",searchSym:"Search symptoms…",
    tokenSent:"Token sent via SMS & WhatsApp",notifyMsg:"We'll notify you when it's your turn",
    waitTime:"Est. Wait",mins:"mins",callIn:"Call In",noShow:"No Show",done:"Done",
    dashboard:"Staff Dashboard",displayBoard:"Queue Display",feedback:"Feedback",analytics:"Analytics",
    totalWait:"Waiting",avgWait:"Avg Wait",doneToday:"Done Today",
    symptoms:["Fever","Cough","Body Ache","Pregnancy","Vaccine","Other"],
    next:"Continue →",back:"← Back",listening:"Listening…",processing:"AI analyzing…",
    chooseDept:"Select Department",printToken:"Print Token",
    navHome:"Home",navBook:"Book",navChat:"Chat",navDash:"Dashboard",navDisplay:"Display",navFeedback:"Feedback",
    rateExp:"Rate Your Visit",submitFeedback:"Submit",feedbackThanks:"Thank you!",
    voiceNA:"Voice not supported. Use Chrome.",install:"Add to Home Screen",installSub:"Works offline — no app store",
    nowServing:"Now Serving",nextTokens:"Next Tokens",
  },
  GU: {
    welcome:"UPHC માં આપનું સ્વાગત છે",tagline:"અર્બન પ્રાઇમરી હેલ્થ સેન્ટર — અમદાવાદ",
    tapSpeak:"બોલવા ટેપ કરો",describe:"તમે કેવું અનુભવો છો",bookManual:"જાતે બુક કરો",tapType:"ટેપ / ટાઇપ",
    waBook:"WhatsApp પર બુક કરો",smsBook:"ઇન્ટ. નથી? SMS 'BOOK'",
    checkStatus:"ટોકન સ્ટેટસ",enterMobile:"મોબાઇલ નંબર",checkBtn:"ચેક",
    s1title:"તમારી વિગત",s1otp:"OTP દાખલ કરો",s1sent:"OTP મોકલ્યો",s1verify:"OTP ચકાસો",s1resend:"ફરી મોકલો",
    s2title:"શું તકલીફ છે?",s3title:"બુકિંગ થઈ ગઈ!",holdSpeak:"દબાવી રાખો",searchSym:"લક્ષણ શોધો…",
    tokenSent:"SMS/WhatsApp દ્વારા ટોકન",notifyMsg:"વારો આવ્યે અમે જાણ કરીશું",
    waitTime:"રાહ",mins:"મિ",callIn:"બોલાવો",noShow:"ગેરહ.",done:"પૂર્ણ",
    dashboard:"ડેશ",displayBoard:"ડિસ્પ્લે",feedback:"પ્રતિભાવ",analytics:"વિ.",
    totalWait:"રાહ",avgWait:"સ.ભ",doneToday:"આજે",
    symptoms:["તાવ","ઉધ.","દુ:ખ.","ગર્ભ","રસી","અન્ય"],
    next:"આગળ →",back:"← પાછળ",listening:"સાંભળે…",processing:"AI…",
    chooseDept:"વિભાગ",printToken:"છાપો",
    navHome:"હોમ",navBook:"બુક",navChat:"ચેટ",navDash:"ડેશ",navDisplay:"ડિ.",navFeedback:"રેટ",
    rateExp:"અનુભવ",submitFeedback:"સ્વીકારો",feedbackThanks:"આભાર!",
    voiceNA:"Chrome વાપરો",install:"હોમ સ્ક્રીનમાં",installSub:"ઇન્ટ. વગર ચાલે",
    nowServing:"હવે સેવા",nextTokens:"આગળ",
  },
  HI: {
    welcome:"UPHC में आपका स्वागत है",tagline:"अर्बन प्राइमरी हेल्थ सेंटर — अहमदाबाद",
    tapSpeak:"बोलने के लिए दबाएं",describe:"अपनी तकलीफ बताएं",bookManual:"खुद बुक करें",tapType:"दबाएं / टाइप",
    waBook:"WhatsApp पर बुक करें",smsBook:"इंटरनेट नहीं? SMS 'BOOK'",
    checkStatus:"टोकन स्टेटस",enterMobile:"मोबाइल नंबर",checkBtn:"जांचें",
    s1title:"आपकी जानकारी",s1otp:"OTP दर्ज करें",s1sent:"OTP भेजा",s1verify:"OTP सत्यापित",s1resend:"दोबारा भेजें",
    s2title:"क्या तकलीफ है?",s3title:"बुकिंग हो गई!",holdSpeak:"दबाकर बोलें",searchSym:"लक्षण खोजें…",
    tokenSent:"SMS/WhatsApp से टोकन",notifyMsg:"बारी आने पर सूचित करेंगे",
    waitTime:"प्रतीक्षा",mins:"मि",callIn:"बुलाएं",noShow:"अनु.",done:"पूर्ण",
    dashboard:"डैशबोर्ड",displayBoard:"डिस्प्ले",feedback:"प्रतिक्रिया",analytics:"आंकड़े",
    totalWait:"प्रतीक्षा",avgWait:"औसत",doneToday:"आज",
    symptoms:["बुखार","खांसी","दर्द","गर्भ","टीका","अन्य"],
    next:"आगे →",back:"← वापस",listening:"सुन रहा…",processing:"AI समझ रहा…",
    chooseDept:"विभाग चुनें",printToken:"प्रिंट",
    navHome:"होम",navBook:"बुक",navChat:"चैट",navDash:"डैश",navDisplay:"डि.",navFeedback:"रेट",
    rateExp:"अनुभव रेट करें",submitFeedback:"जमा करें",feedbackThanks:"धन्यवाद!",
    voiceNA:"Chrome उपयोग करें",install:"होम स्क्रीन पर",installSub:"बिना इंटरनेट भी",
    nowServing:"अभी सेवा",nextTokens:"अगले टोकन",
  },
};

/* ─── ROOT APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang] = useState("EN");
  const [view, setView] = useState("home");
  const [dark, setDark] = useState(false);
  const [queue, setQueue] = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const t = L[lang];

  const mapToken = (tk) => ({
    id:       tk.token_number,
    name:     tk.patient_name || `Patient ${tk.patient_mobile?.slice(-4)}`,
    dept:     tk.department,
    raw:      tk.symptoms_raw || "No complaint recorded",
    clinical: tk.clinical_tags || ["Requires assessment"],
    urgency:  tk.urgency || "yellow",
    time:     new Date(tk.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    wait:     tk.wait_minutes,
    dbId:     tk.id,
    mobile:   tk.patient_mobile,
    status:   tk.status,
  });

  useEffect(() => {
    let channel;
    (async () => {
      const sb = await getSB();
      const load = async () => {
        const { data: waiting } = await sb.from("tokens").select("*").eq("status", "waiting").order("created_at", { ascending: true });
        const { data: called  } = await sb.from("tokens").select("*").eq("status", "called").order("created_at",  { ascending: true });
        const { count: done   } = await sb.from("tokens").select("*", { count: "exact", head: true }).eq("status", "completed");
        const { count: noshow } = await sb.from("tokens").select("*", { count: "exact", head: true }).eq("status", "noshow");
        setQueue([...(called || []), ...(waiting || [])].map(mapToken));
        setDoneCount((done || 0) + (noshow || 0));
      };
      await load();
      channel = sb.channel("global-tokens")
        .on("postgres_changes", { event: "*", schema: "public", table: "tokens" }, load)
        .subscribe();
    })();
    return () => { channel?.unsubscribe(); };
  }, []);

  const updateTokenStatus = async (dbId, status) => {
    try {
      await fetch("/api/update-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dbId, status }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const D = {
    bg:   dark ? "#070D1A" : "#EEF2F8",
    card: dark ? "#0F1D35" : "#FFFFFF",
    txt:  dark ? "#E8EEF8" : "#0A1628",
    sub:  dark ? "#6B8299" : "#4A5C72",
    bdr:  dark ? "#1E3050" : "#DDE4EF",
    inp:  dark ? "#152240" : "#F4F7FB",
    btn2: dark ? "#1A2E4A" : "#EEF2F8",
    glass: dark ? "rgba(15,29,53,0.85)" : "rgba(255,255,255,0.85)",
  };

  return (
    <div style={{ minHeight: "100vh", background: D.bg, fontFamily: "'Noto Sans',sans-serif", transition: "background .3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .pu{animation:pu 2.2s ease-out infinite}
        @keyframes pu{0%{box-shadow:0 0 0 0 rgba(20,184,166,.6),0 0 0 0 rgba(20,184,166,.3)}70%{box-shadow:0 0 0 20px rgba(20,184,166,0),0 0 0 38px rgba(20,184,166,0)}100%{box-shadow:0 0 0 0 rgba(20,184,166,0)}}
        .mo{animation:mo .7s ease-in-out infinite alternate}
        @keyframes mo{from{transform:scale(1)}to{transform:scale(1.06)}}
        .su{animation:su .4s cubic-bezier(.22,1,.36,1) both}
        @keyframes su{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .fa{animation:fa .35s ease both}
        @keyframes fa{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        .bo{animation:bo .65s cubic-bezier(.34,1.56,.64,1) both}
        @keyframes bo{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
        .wv{animation:wv 1.2s ease-in-out infinite;display:inline-block}
        @keyframes wv{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1.4)}}
        .bl{animation:bl 1.1s step-end infinite}
        @keyframes bl{50%{opacity:0}}
        .cd{transition:transform .18s,box-shadow .18s}
        .cd:hover{transform:translateY(-3px)}
        button:active{transform:scale(.96)!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:2px}
        @media print{.np{display:none!important}.po{display:block!important}}
        .po{display:none}
        input,textarea{font-family:inherit}
        .glow-teal{box-shadow:0 0 0 3px rgba(20,184,166,.25)}
        .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}
        .hb{background:linear-gradient(135deg,#0A1628 0%,#122C5C 50%,#0A4A5C 100%)}
      `}</style>

      {/* ── HEADER ── */}
      <header className="np" style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "#050C1A" : "#0A1628", boxShadow: "0 1px 20px rgba(0,0,0,.4)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#14B8A6,#0891B2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 2px 8px rgba(20,184,166,.4)" }}>🏥</div>
            <div>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, letterSpacing: .5, display: "block", lineHeight: 1.1 }}>UPHC</span>
              <span style={{ color: "#14B8A6", fontSize: 9, fontWeight: 600, letterSpacing: 1 }}>AHMEDABAD</span>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
            {[["home","navHome"],["book","navBook"],["chat","navChat"],["dash","navDash"],["display","navDisplay"],["feedback","navFeedback"]].map(([v, k]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "all .2s",
                background: view === v ? "#14B8A6" : "rgba(255,255,255,.08)", color: view === v ? "#fff" : "rgba(255,255,255,.75)" }}>{t[k]}</button>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 3, alignItems: "center", flexShrink: 0 }}>
            {["EN","GU","HI"].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer",
                background: lang === l ? "#F5A623" : "rgba(255,255,255,.1)", color: lang === l ? "#0A1628" : "#fff" }}>{l}</button>
            ))}
            <button onClick={() => setDark(d => !d)} style={{ padding: "5px 8px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer", background: "rgba(255,255,255,.1)", color: "#fff", marginLeft: 2 }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: view === "display" ? 1400 : view === "dash" ? 1140 : 500, margin: "0 auto", padding: "18px 12px 56px" }}>
        {view === "home"    && <HomeView    t={t} setView={setView} D={D} queue={queue} />}
        {view === "book"    && <BookView    t={t} lang={lang} D={D} setView={setView} />}
        {view === "chat"    && <ChatView    D={D} />}
        {view === "dash"    && <DashView    t={t} queue={queue} doneCount={doneCount} updateStatus={updateTokenStatus} D={D} />}
        {view === "display" && <DisplayBoard t={t} queue={queue} D={D} />}
        {view === "feedback"&& <FeedbackView t={t} D={D} />}
      </main>
    </div>
  );
}

/* ─── HOME ───────────────────────────────────────────────────────────────── */
function HomeView({ t, setView, D, queue }) {
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState("");
  const [stats, setStats] = useState({ waiting: 0, avgWait: 0 });

  useEffect(() => {
    const waiting = queue.filter(q => q.status === "waiting").length;
    const avg = queue.length ? Math.round(queue.reduce((s, p) => s + p.wait, 0) / queue.length) : 0;
    setStats({ waiting, avgWait: avg });
  }, [queue]);

  const checkToken = () => {
    if (mobile.length < 10) { setStatus("⚠ Enter a valid 10-digit number"); return; }
    const found = queue.find(q => q.mobile?.endsWith(mobile.slice(-4)));
    if (found) setStatus(`✅ Token ${found.id} | ${found.dept} | ~${found.wait} mins | ${found.status}`);
    else setStatus("ℹ No active token found for this number.");
  };

  return (
    <div className="su" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero Banner */}
      <div className="hb" style={{ borderRadius: 24, padding: "28px 22px", color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 16px 40px rgba(10,22,40,.5)" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(20,184,166,.12)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(245,166,35,.1)" }} />
        <div style={{ position: "absolute", top: "50%", right: 20, transform: "translateY(-50%)", fontSize: 80, opacity: .08 }}>🏥</div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(20,184,166,.2)", padding: "4px 12px", borderRadius: 20, marginBottom: 10 }}>
            <div className="bl" style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#4ADE80", letterSpacing: 1 }}>OPEN NOW · FREE HEALTHCARE</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-.5px", marginBottom: 6 }}>{t.welcome}</h1>
          <p style={{ fontSize: 12, opacity: .65, marginBottom: 18 }}>{t.tagline}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { icon: "👥", val: `${stats.waiting}`, label: "Waiting" },
              { icon: "⏱", val: `~${stats.avgWait} min`, label: "Avg Wait" },
              { icon: "🏥", val: "6", label: "Departments" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,.1)", backdropFilter: "blur(8px)", padding: "8px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)" }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#14B8A6", marginLeft: 6 }}>{s.val}</span>
                <span style={{ fontSize: 10, opacity: .65, marginLeft: 4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button onClick={() => setView("book")} className="cd" style={{ borderRadius: 22, padding: "22px 14px", background: "linear-gradient(145deg,#0A1628,#0A4A5C)", border: "1px solid rgba(20,184,166,.2)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minHeight: 172, boxShadow: "0 8px 24px rgba(10,22,40,.4)" }}>
          <div className="pu" style={{ width: 66, height: 66, borderRadius: "50%", background: "linear-gradient(135deg,#14B8A6,#0891B2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 4px 16px rgba(20,184,166,.4)" }}>🎤</div>
          <div style={{ textAlign: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 14, display: "block", marginBottom: 4 }}>{t.tapSpeak}</span>
            <span style={{ color: "rgba(255,255,255,.55)", fontSize: 11, lineHeight: 1.4 }}>{t.describe}</span>
          </div>
        </button>
        <button onClick={() => setView("book")} className="cd" style={{ borderRadius: 22, padding: "22px 14px", background: "linear-gradient(145deg,#E67A00,#F5A623)", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minHeight: 172, boxShadow: "0 8px 24px rgba(230,122,0,.35)" }}>
          <div style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(255,255,255,.95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 4px 16px rgba(0,0,0,.15)" }}>📋</div>
          <div style={{ textAlign: "center" }}>
            <span style={{ color: "#0A1628", fontWeight: 900, fontSize: 14, display: "block", marginBottom: 4 }}>{t.bookManual}</span>
            <span style={{ color: "rgba(10,22,40,.6)", fontSize: 11 }}>{t.tapType}</span>
          </div>
        </button>
      </div>

      {/* PWA install */}
      <div style={{ background: D.card, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${D.bdr}`, boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📲</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 12, color: D.txt }}>{t.install}</p>
          <p style={{ fontSize: 10, color: D.sub, marginTop: 1 }}>{t.installSub}</p>
        </div>
        <button style={{ padding: "6px 14px", borderRadius: 10, background: "linear-gradient(135deg,#0A1628,#1246A0)", color: "#fff", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer" }}>Install</button>
      </div>

      {/* Banners */}
      <a href="#" className="cd" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, background: D.card, borderLeft: "4px solid #25D366", textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: D.txt }}>{t.waBook}</p>
          <p style={{ fontSize: 11, color: D.sub }}>Message 'HI' to <b>+91-97XX-XXXXX</b></p>
        </div>
        <span style={{ color: "#25D366", fontSize: 11, fontWeight: 700 }}>Open ↗</span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, background: D.card, borderLeft: "4px solid #6366F1", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📱</div>
        <p style={{ fontSize: 12, color: D.txt, fontWeight: 600 }}>{t.smsBook}</p>
      </div>

      {/* Status check */}
      <div style={{ background: D.card, borderRadius: 18, padding: "18px 18px", boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: `1px solid ${D.bdr}` }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: D.txt, marginBottom: 10 }}>🔍 {t.checkStatus}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", border: `2px solid ${D.bdr}`, borderRadius: 12, overflow: "hidden", background: D.inp }}>
            <input type="tel" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value)} placeholder={t.enterMobile}
              style={{ flex: 1, padding: "10px 12px", fontSize: 14, border: "none", outline: "none", background: "transparent", color: D.txt }} />
            <span style={{ padding: "0 10px", fontSize: 16, cursor: "pointer" }}>🎤</span>
          </div>
          <button onClick={checkToken} style={{ padding: "10px 16px", borderRadius: 12, background: "linear-gradient(135deg,#0A1628,#1246A0)", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer", flexShrink: 0 }}>{t.checkBtn}</button>
        </div>
        {status && <p style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#065F46", background: "#D1FAE5", padding: "8px 12px", borderRadius: 8 }}>{status}</p>}
      </div>

      <p style={{ textAlign: "center", fontSize: 10, color: D.sub, paddingBottom: 4 }}>Govt. of Gujarat · Free Healthcare for All · 24×7 Helpline: <b>104</b></p>
    </div>
  );
}

/* ─── BOOK VIEW ──────────────────────────────────────────────────────────── */
function BookView({ t, lang, D, setView }) {
  const [step, setStep] = useState(0);
  const [dept, setDept] = useState(null);
  const [mobile, setMobile] = useState("");
  const [patientName, setPatientName] = useState("");
  const [otp, setOtp] = useState(["","","","","",""]);
  const [otpErr, setOtpErr] = useState("");
  const [vState, setVState] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [nlp, setNlp] = useState(null);
  const [nlpLoad, setNlpLoad] = useState(false);
  const [selSym, setSelSym] = useState([]);
  const [search, setSearch] = useState("");
  const [booking, setBooking] = useState(false);
  const recRef = useRef(null);
  const otpRef = useRef([]);
  const tokenNum = useRef("");
  const tokenData = useRef(null);
  const steps = ["Dept","Details","OTP","Symptoms","Done"];

  const sendOTP = () => { setOtpErr(""); setStep(2); };
  const verifyOTP = () => {
    setOtpErr("");
    if (otp.join("") === "123456") setStep(3);
    else setOtpErr("Incorrect OTP. Use 123456");
  };
  const handleOtp = (i, v) => {
    if (!/^[0-9]?$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 5) otpRef.current[i + 1]?.focus();
  };
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert(t.voiceNA); return; }
    const r = new SR();
    r.lang = lang === "HI" ? "hi-IN" : lang === "GU" ? "gu-IN" : "en-IN";
    r.interimResults = true;
    r.onresult = e => setTranscript(Array.from(e.results).map(x => x[0].transcript).join(""));
    r.onend = () => setVState("done");
    r.start(); recRef.current = r; setVState("listening");
  };
  const stopVoice = () => recRef.current?.stop();

  useEffect(() => {
    if (vState === "done" && transcript) {
      setNlpLoad(true);
      extractSymptomsAI(transcript, lang).then(r => { setNlp(r); setNlpLoad(false); });
    }
  }, [vState]);

  const pickSym = async sym => {
    const next = selSym.includes(sym) ? selSym.filter(x => x !== sym) : [...selSym, sym];
    setSelSym(next);
    if (!nlp && next.length > 0) {
      setNlpLoad(true);
      const r = await extractSymptomsAI(next.join(", "), lang);
      setNlp(r); setNlpLoad(false);
    }
  };

  const bookToken = async () => {
    if (!canNext || booking) return;
    setBooking(true);
    try {
      const res = await fetch("/api/book-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile,
          patient_name: patientName,
          department: dept?.label || "General OPD",
          symptoms_raw: transcript || selSym.join(", "),
          clinical_tags: nlp?.clinical_tags || selSym,
          urgency: nlp?.urgency || "yellow",
        }),
      });
      const data = await res.json();
      if (data.success) {
        tokenNum.current = data.token.token_number;
        tokenData.current = data.token;
        setStep(4);
      } else {
        alert("Booking failed. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const canNext = nlp || selSym.length > 0;
  const urgColor = { red: "#DC2626", yellow: "#D97706", green: "#059669" }[nlp?.urgency] || "#D97706";
  const reset = () => { setStep(0); setDept(null); setMobile(""); setPatientName(""); setOtp(["","","","","",""]); setVState("idle"); setTranscript(""); setNlp(null); setSelSym([]); setSearch(""); };

  const Card = ({ children, style }) => (
    <div style={{ background: D.card, borderRadius: 20, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,.07)", border: `1px solid ${D.bdr}`, ...style }}>{children}</div>
  );

  return (
    <div className="su">
      {/* Progress */}
      <div style={{ display: "flex", gap: 3, marginBottom: 24, alignItems: "center" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, transition: "all .3s",
              background: i < step ? "#14B8A6" : i === step ? "#0A1628" : D.btn2, color: i < step ? "#fff" : i === step ? "#F5A623" : D.sub }}>
              {i < step ? "✓" : i + 1}
            </div>
            <div style={{ height: 3, width: "100%", borderRadius: 2, background: i < step ? "#14B8A6" : i === step ? "#F5A623" : D.bdr, transition: "background .3s" }} />
            <span style={{ fontSize: 8, color: D.sub, textAlign: "center" }}>{s}</span>
          </div>
        ))}
      </div>

      {/* STEP 0 — Dept */}
      {step === 0 && (
        <div className="fa">
          <h2 style={{ fontSize: 20, fontWeight: 900, color: D.txt, marginBottom: 4 }}>{t.chooseDept}</h2>
          <p style={{ fontSize: 12, color: D.sub, marginBottom: 16 }}>Select the department you need to visit</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {DEPTS.map(d => (
              <button key={d.id} onClick={() => { setDept(d); setStep(1); }} className="cd"
                style={{ padding: "18px 12px", borderRadius: 18, border: `2px solid ${dept?.id === d.id ? d.color : D.bdr}`, background: dept?.id === d.id ? `${d.color}15` : D.card, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all .15s", boxShadow: "0 2px 10px rgba(0,0,0,.06)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${d.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{d.icon}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: D.txt, textAlign: "center" }}>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1 — Details */}
      {step === 1 && (
        <div className="fa" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: D.txt, marginBottom: 4 }}>{t.s1title}</h2>
            <p style={{ fontSize: 12, color: D.sub }}>Department: <b style={{ color: dept?.color }}>{dept?.icon} {dept?.label}</b></p>
          </div>
          <Card>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: D.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>👤 Full Name</label>
            <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Enter your full name"
              style={{ width: "100%", padding: "13px 14px", fontSize: 15, fontWeight: 600, border: `2px solid ${patientName ? "#14B8A6" : D.bdr}`, borderRadius: 12, outline: "none", background: D.inp, color: D.txt, transition: "border-color .2s" }} />
          </Card>
          <Card>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: D.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>📱 Mobile Number</label>
            <div style={{ display: "flex", alignItems: "center", border: `2px solid ${mobile ? "#14B8A6" : D.bdr}`, borderRadius: 12, overflow: "hidden", background: D.inp, marginBottom: 12, transition: "border-color .2s" }}>
              <span style={{ padding: "0 12px", fontSize: 13, color: D.sub, fontWeight: 700, borderRight: `2px solid ${D.bdr}`, alignSelf: "stretch", display: "flex", alignItems: "center" }}>+91</span>
              <input type="tel" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value)} placeholder="XXXXX XXXXX"
                style={{ flex: 1, padding: "13px 12px", fontSize: 20, fontWeight: 700, letterSpacing: 3, border: "none", outline: "none", background: "transparent", color: D.txt }} />
              <span style={{ padding: "0 12px", fontSize: 20, cursor: "pointer" }}>🎤</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {[1,2,3,4,5,6,7,8,9,"*",0,"⌫"].map(d => (
                <button key={d} onClick={() => { if (d === "⌫") setMobile(m => m.slice(0, -1)); else if (mobile.length < 10) setMobile(m => m + d); }}
                  style={{ padding: "12px 0", borderRadius: 10, fontSize: 17, fontWeight: 700, background: D.btn2, color: D.txt, border: `1px solid ${D.bdr}`, cursor: "pointer" }}>
                  {d}
                </button>
              ))}
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ flex: 1, padding: "13px", borderRadius: 14, background: D.btn2, color: D.txt, fontWeight: 700, border: `1px solid ${D.bdr}`, cursor: "pointer" }}>{t.back}</button>
            <button onClick={() => { if (mobile.length >= 10 && patientName.trim()) sendOTP(); }}
              style={{ flex: 2, padding: "13px", borderRadius: 14, background: (mobile.length >= 10 && patientName.trim()) ? "linear-gradient(135deg,#0A1628,#1246A0)" : D.btn2, color: (mobile.length >= 10 && patientName.trim()) ? "#fff" : D.sub, fontWeight: 900, border: "none", cursor: "pointer", fontSize: 15 }}>{t.next}</button>
          </div>
        </div>
      )}

      {/* STEP 2 — OTP */}
      {step === 2 && (
        <div className="fa" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: D.txt }}>{t.s1otp}</h2>
          <Card style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>📱</div>
            <p style={{ fontSize: 13, color: D.sub, marginBottom: 6 }}>{t.s1sent} <b style={{ color: D.txt }}>+91-{mobile}</b></p>
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "8px 12px", marginBottom: 18, display: "inline-block" }}>
              <span style={{ fontSize: 11, color: "#92400E", fontWeight: 700 }}>🔐 Demo OTP: </span>
              <span style={{ fontSize: 15, fontWeight: 900, color: "#D97706", letterSpacing: 3 }}>1 2 3 4 5 6</span>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
              {otp.map((v, i) => (
                <input key={i} ref={el => otpRef.current[i] = el} type="tel" maxLength={1} value={v}
                  onChange={e => handleOtp(i, e.target.value)}
                  onKeyDown={e => { if (e.key === "Backspace" && !v && i > 0) otpRef.current[i - 1]?.focus(); }}
                  style={{ width: 46, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700, borderRadius: 12, border: `2px solid ${v ? "#14B8A6" : D.bdr}`, outline: "none", color: D.txt, background: D.inp, transition: "border-color .2s" }} />
              ))}
            </div>
            {otpErr && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 8, fontWeight: 600 }}>{otpErr}</p>}
            <button onClick={() => setStep(1)} style={{ fontSize: 12, color: "#3B82F6", background: "none", border: "none", cursor: "pointer" }}>{t.s1resend}</button>
          </Card>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: 14, background: D.btn2, color: D.txt, fontWeight: 700, border: `1px solid ${D.bdr}`, cursor: "pointer" }}>{t.back}</button>
            <button onClick={verifyOTP} style={{ flex: 2, padding: "13px", borderRadius: 14, background: "linear-gradient(135deg,#0A1628,#1246A0)", color: "#fff", fontWeight: 900, border: "none", cursor: "pointer", fontSize: 15 }}>{t.s1verify}</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Symptoms */}
      {step === 3 && (
        <div className="fa" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: D.txt, marginBottom: 4 }}>{t.s2title}</h2>
            <p style={{ fontSize: 12, color: D.sub }}>Hi <b style={{ color: D.txt }}>{patientName}</b>, tell us what's wrong</p>
          </div>

          <Card>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <button onMouseDown={startVoice} onMouseUp={stopVoice} onTouchStart={startVoice} onTouchEnd={stopVoice}
                className={vState === "listening" ? "mo" : vState === "idle" ? "pu" : ""}
                style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, border: "none", cursor: "pointer",
                  background: vState === "listening" ? "linear-gradient(135deg,#DC2626,#EF4444)" : vState === "done" ? "linear-gradient(135deg,#059669,#14B8A6)" : "linear-gradient(135deg,#0A1628,#1246A0)", color: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}>
                {vState === "listening" ? "⏹" : vState === "done" ? "✓" : "🎤"}
              </button>
              <p style={{ fontSize: 12, fontWeight: 700, color: vState === "listening" ? "#DC2626" : vState === "done" ? "#059669" : D.sub }}>
                {vState === "idle" ? t.holdSpeak : vState === "listening" ? t.listening : t.processing}
              </p>
              {vState === "listening" && (
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 34 }}>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="wv" style={{ width: 3, borderRadius: 2, background: "linear-gradient(to top,#DC2626,#F87171)", animationDelay: `${i * .08}s`, height: `${12 + Math.random() * 14}px` }} />
                  ))}
                </div>
              )}
              {transcript && <p style={{ fontSize: 13, fontStyle: "italic", color: D.txt, textAlign: "center", padding: "10px 14px", background: D.inp, borderRadius: 12, width: "100%", lineHeight: 1.5, border: `1px solid ${D.bdr}` }}>"{transcript}"</p>}
            </div>
            {!transcript && vState === "idle" && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: D.inp, border: `1px solid ${D.bdr}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: D.sub, textTransform: "uppercase", marginBottom: 6, letterSpacing: .5 }}>AI Example</p>
                <p style={{ fontSize: 12, fontStyle: "italic", color: D.txt, marginBottom: 8 }}>"My head is spinning and I feel like throwing up"</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["Vertigo","Nausea"].map(tag => <span key={tag} className="chip" style={{ background: "#0A1628", color: "#14B8A6" }}>[{tag}]</span>)}
                </div>
              </div>
            )}
            {nlpLoad && <div style={{ textAlign: "center", padding: 16, color: D.sub, fontSize: 13 }}>🤖 {t.processing}</div>}
            {nlp && !nlpLoad && (
              <div className="fa" style={{ marginTop: 12, padding: 14, borderRadius: 14, border: `2px solid ${urgColor}20`, background: `${urgColor}08` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span className="chip" style={{ background: urgColor, color: "#fff" }}>{nlp.urgency?.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: D.txt, fontWeight: 700 }}>→ {nlp.department}</span>
                </div>
                <p style={{ fontSize: 12, color: D.sub, marginBottom: 8 }}>{nlp.summary}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {nlp.clinical_tags?.map(tag => <span key={tag} className="chip" style={{ background: "#0A1628", color: "#14B8A6" }}>[{tag}]</span>)}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${D.bdr}`, borderRadius: 12, padding: "8px 12px", marginBottom: 12, background: D.inp }}>
              <span style={{ color: D.sub, fontSize: 15 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchSym}
                style={{ flex: 1, fontSize: 13, border: "none", outline: "none", background: "transparent", color: D.txt }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {t.symptoms.map((s, i) => (
                <button key={s} onClick={() => pickSym(s)} className="cd"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 14,
                    border: `2px solid ${selSym.includes(s) ? "#14B8A6" : D.bdr}`, background: selSym.includes(s) ? "rgba(20,184,166,.08)" : D.card, cursor: "pointer", transition: "all .15s" }}>
                  <span style={{ fontSize: 26 }}>{SYM_ICONS[i]}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: selSym.includes(s) ? "#14B8A6" : D.txt, textAlign: "center" }}>{s}</span>
                </button>
              ))}
            </div>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: "13px", borderRadius: 14, background: D.btn2, color: D.txt, fontWeight: 700, border: `1px solid ${D.bdr}`, cursor: "pointer" }}>{t.back}</button>
            <button onClick={bookToken} disabled={!canNext || booking}
              style={{ flex: 2, padding: "13px", borderRadius: 14, background: canNext ? "linear-gradient(135deg,#0A1628,#1246A0)" : D.btn2, color: canNext ? "#fff" : D.sub, fontWeight: 900, border: "none", cursor: canNext ? "pointer" : "default", fontSize: 15 }}>
              {booking ? "Booking…" : t.next}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — Success */}
      {step === 4 && (
        <div className="fa" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 4px 16px rgba(20,184,166,.3)" }}>✅</div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: D.txt }}>{t.s3title}</h2>
            <p style={{ fontSize: 13, color: D.sub, marginTop: 4 }}>Welcome, <b style={{ color: D.txt }}>{patientName}</b></p>
          </div>

          {/* Token Card */}
          <div className="bo" style={{ borderRadius: 26, padding: "28px 24px", background: "linear-gradient(140deg,#0A1628 0%,#122C5C 50%,#0A4A5C 100%)", color: "#fff", width: "100%", boxShadow: "0 16px 48px rgba(10,22,40,.5)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(20,184,166,.1)" }} />
            <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(245,166,35,.1)" }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 10, opacity: .5, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>UPHC · {dept?.label || "General OPD"} · {new Date().toLocaleDateString("en-IN")}</p>
              <div style={{ fontSize: 80, fontWeight: 900, color: "#F5A623", lineHeight: 1, letterSpacing: "-3px", marginBottom: 4 }}>{tokenNum.current}</div>
              <p style={{ fontSize: 12, opacity: .6, marginBottom: 16 }}>Your queue number</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "rgba(255,255,255,.1)", borderRadius: 14, overflow: "hidden" }}>
                {[
                  { l: t.waitTime, v: `${tokenData.current?.wait_minutes || 20} ${t.mins}`, c: "#14B8A6" },
                  { l: "Counter",  v: tokenData.current?.counter || "OPD 1",                 c: "#fff"    },
                  { l: "Doctor",   v: tokenData.current?.doctor  || "Dr. Shah",               c: "#fff"    },
                ].map((x, i) => (
                  <div key={i} style={{ padding: "12px 8px", background: "rgba(255,255,255,.05)", textAlign: "center" }}>
                    <p style={{ fontSize: 9, opacity: .55, marginBottom: 4 }}>{x.l}</p>
                    <p style={{ fontSize: 13, fontWeight: 900, color: x.c, lineHeight: 1.2 }}>{x.v}</p>
                  </div>
                ))}
              </div>
              <svg width="72" height="72" style={{ margin: "16px auto 0", display: "block", background: "#fff", borderRadius: 10, padding: 7 }} viewBox="0 0 7 7">
                {[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],[0,4],[0,5],[0,6],[1,4],[2,4],[2,5],[2,6],[4,4],[6,4],[4,5],[5,6],[3,3],[3,0],[3,2]].map(([x, y], i) => (
                  <rect key={i} x={x} y={y} width={1} height={1} fill="#0A1628" />
                ))}
              </svg>
              <p style={{ fontSize: 9, opacity: .4, marginTop: 6 }}>Show at counter · Valid today only</p>
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)", borderRadius: 16, padding: "14px 18px", width: "100%", border: "1px solid #6EE7B7" }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#065F46" }}>📲 {t.tokenSent}</p>
            <p style={{ fontSize: 11, color: "#047857", marginTop: 4 }}>{t.notifyMsg}</p>
          </div>

          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button onClick={() => window.print()} style={{ flex: 1, padding: "12px", borderRadius: 14, background: "#EFF6FF", color: "#1246A0", fontWeight: 700, fontSize: 12, border: "2px solid #BFDBFE", cursor: "pointer" }}>🖨 {t.printToken}</button>
            <button onClick={() => window.alert("SMS sent to +91-" + mobile)} style={{ flex: 1, padding: "12px", borderRadius: 14, background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>💬 Share</button>
          </div>
          <button onClick={reset} style={{ width: "100%", padding: "14px", borderRadius: 16, background: "linear-gradient(135deg,#0A1628,#1246A0)", color: "#fff", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(10,22,40,.3)" }}>
            ← Book Another Token
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── CHAT MOCKUP ────────────────────────────────────────────────────────── */
function ChatView({ D }) {
  const msgs = [
    { f: "bot", m: "🏥 *Welcome to UPHC Queue Bot!*\n\nDescribe your problem or reply:\n*1* Fever  *2* Cough  *3* Stomach\n*4* Pregnancy  *5* Vaccine  *6* Other", t: "9:30" },
    { f: "usr", m: "Pet dukhe che", t: "9:31" },
    { f: "bot", m: "🤖 *Understood: Stomach Ache*\n\n✅ Token: *A-42*  ⏳ ~22 mins\n🏥 Counter: *OPD 3*  👨‍⚕️ Dr. Shah\n\nWe'll WhatsApp you when near 📲", t: "9:31" },
    { f: "usr", m: "Ok, shukriya", t: "9:32" },
    { f: "bot", m: "📢 *UPHC Alert — Token A-42*\n10 mins to go. Please be ready at OPD Counter 3. 🙏", t: "9:51" },
  ];
  return (
    <div className="su" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ textAlign: "center", fontSize: 18, fontWeight: 900, color: D.txt }}>Offline Booking — Mockups</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: D.sub, textTransform: "uppercase", letterSpacing: 1 }}>WhatsApp Bot</p>
          <div style={{ width: "100%", maxWidth: 230, borderRadius: 22, overflow: "hidden", boxShadow: "0 10px 28px rgba(0,0,0,.22)", background: "#1A1A2E", border: "5px solid #1A1A2E" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 12px", color: "#fff", fontSize: 9 }}><span>9:51</span><span>📶 🔋</span></div>
            <div style={{ background: "#075E54", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🏥</div>
              <div><p style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>UPHC Health Bot</p><p style={{ color: "rgba(255,255,255,.65)", fontSize: 9 }}>🟢 Online</p></div>
            </div>
            <div style={{ background: "#ECE5DD", padding: "8px 6px", minHeight: 280, display: "flex", flexDirection: "column", gap: 5 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.f === "usr" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "88%", borderRadius: 9, padding: "6px 8px", background: m.f === "usr" ? "#DCF8C6" : "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}>
                    <p style={{ fontSize: 9, whiteSpace: "pre-wrap", color: "#111", lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: m.m.replace(/\*(.*?)\*/g, "<b>$1</b>") }} />
                    <p style={{ fontSize: 7, textAlign: "right", color: "#777", marginTop: 2 }}>{m.t} ✓✓</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, padding: "6px 7px", background: "#F0F0F0" }}>
              <div style={{ flex: 1, background: "#fff", borderRadius: 18, padding: "5px 9px", fontSize: 9, color: "#888" }}>Type a message...</div>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>🎤</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: D.sub, textTransform: "uppercase", letterSpacing: 1 }}>SMS — Feature Phone</p>
          <div style={{ width: "100%", maxWidth: 170, borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 24px rgba(0,0,0,.22)", background: "#2D2D2D", border: "6px solid #2D2D2D" }}>
            <div style={{ background: "#9BA888", padding: "10px 8px", minHeight: 155 }}>
              <p style={{ fontSize: 9, fontFamily: "monospace", color: "#2D4A0E", lineHeight: 1.7 }}>
                <b>📩 New Message</b><br />From: UPHC-104<br />──────────────<br /><b>UPHC ALERT: Token A-42. OPD Counter 3 in 30 mins. Helpline: 104</b>
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, padding: 5, background: "#333" }}>
              {[1,2,3,4,5,6,7,8,9,"*",0,"#"].map(k => (
                <div key={k} style={{ padding: "7px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: "#444", borderRadius: 3 }}>{k}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── STAFF DASHBOARD ────────────────────────────────────────────────────── */
function DashView({ t, queue, doneCount, updateStatus, D }) {
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("queue");
  const [calling, setCalling] = useState({});

  const waiting = queue.filter(p => p.status === "waiting");
  const called  = queue.filter(p => p.status === "called");
  const stats = {
    waiting: waiting.length,
    called:  called.length,
    urgent:  queue.filter(p => p.urgency === "red").length,
    avg:     queue.length ? Math.round(queue.reduce((s, p) => s + p.wait, 0) / queue.length) : 0,
  };

  const handleAction = async (p, action) => {
    if (action === "callin") {
      setCalling(c => ({ ...c, [p.id]: true }));
      await updateStatus(p.dbId, "called");
      setCalling(c => ({ ...c, [p.id]: false }));
    } else if (action === "noshow") {
      await updateStatus(p.dbId, "noshow");
    } else if (action === "done") {
      await updateStatus(p.dbId, "completed");
    }
  };

  const hourly = [{ l: "8-9", n: 12 }, { l: "9-10", n: 19 }, { l: "10-11", n: 24 }, { l: "11-12", n: 20 }, { l: "12-1", n: 9 }, { l: "1-2", n: 6 }];
  const maxH = Math.max(...hourly.map(d => d.n));
  const deptDist = [{ d: "General OPD", n: 14, c: "#1246A0" }, { d: "Maternity", n: 3, c: "#7C3AED" }, { d: "Vaccination", n: 5, c: "#059669" }, { d: "Dental", n: 2, c: "#D97706" }, { d: "Eye/ENT", n: 1, c: "#0891B2" }];
  const total = deptDist.reduce((s, d) => s + d.n, 0);
  const filtered = filter === "all" ? queue : filter === "called" ? called : queue.filter(p => p.urgency === filter && p.status === "waiting");

  return (
    <div className="su">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: D.txt }}>{t.dashboard}</h2>
          <p style={{ fontSize: 11, color: D.sub, marginTop: 2 }}><span className="bl" style={{ color: "#EF4444" }}>●</span> LIVE · Supabase Realtime</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["queue","🗂 Queue"], ["analytics","📊 Analytics"]].map(([tb, lb]) => (
            <button key={tb} onClick={() => setTab(tb)} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              background: tab === tb ? "#0A1628" : D.btn2, color: tab === tb ? "#F5A623" : D.txt }}>{lb}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { l: "Waiting",    v: stats.waiting, c: "#1246A0", bg: "#EFF6FF", icon: "👥" },
          { l: "Called In",  v: stats.called,  c: "#7C3AED", bg: "#F5F3FF", icon: "📢" },
          { l: "Urgent",     v: stats.urgent,  c: "#DC2626", bg: "#FFF5F5", icon: "🚨" },
          { l: t.doneToday,  v: doneCount,     c: "#059669", bg: "#F0FFF4", icon: "✅" },
        ].map(s => (
          <div key={s.l} style={{ background: D.card, borderRadius: 16, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: `2px solid ${s.bg}` }}>
            <p style={{ fontSize: 18 }}>{s.icon}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: s.c, lineHeight: 1, marginTop: 4 }}>{s.v}</p>
            <p style={{ fontSize: 10, color: D.sub, fontWeight: 600, marginTop: 4 }}>{s.l}</p>
          </div>
        ))}
      </div>

      {tab === "queue" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[["all","All","#0A1628"], ["called","📢 Called","#7C3AED"], ["red","🚨 Urgent","#DC2626"], ["yellow","⚡ Standard","#D97706"], ["green","✅ Routine","#059669"]].map(([f, l, c]) => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: filter === f ? c : D.btn2, color: filter === f ? "#fff" : D.txt }}>{l}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
            {filtered.map(p => {
              const tc = TC[p.urgency] || TC.yellow;
              const isCalled = p.status === "called";
              return (
                <div key={p.id} className="cd" style={{ borderRadius: 18, padding: 18, background: isCalled ? (D.card === "#FFFFFF" ? "#F5F3FF" : "#150D2E") : D.card,
                  borderLeft: `4px solid ${isCalled ? "#7C3AED" : tc.border}`, boxShadow: isCalled ? "0 4px 20px rgba(124,58,237,.2)" : "0 2px 12px rgba(0,0,0,.06)", border: `1px solid ${isCalled ? "#7C3AED" : D.bdr}`, borderLeftWidth: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: D.txt, letterSpacing: "-.5px" }}>{p.id}</span>
                      <span className="chip" style={{ background: isCalled ? "#7C3AED" : tc.badge, color: "#fff" }}>{isCalled ? "CALLED" : tc.label}</span>
                      <span className="chip" style={{ background: D.btn2, color: D.sub }}>{p.dept}</span>
                    </div>
                    <span style={{ fontSize: 11, color: D.sub, fontWeight: 700, flexShrink: 0 }}>⏳ {p.wait}m</span>
                  </div>

                  <p style={{ fontSize: 12, color: D.sub, marginBottom: 10, fontWeight: 600 }}>👤 {p.name} · {p.time}</p>

                  <div style={{ background: D.inp, borderRadius: 10, padding: "9px 12px", marginBottom: 10, border: `1px solid ${D.bdr}` }}>
                    <p style={{ fontSize: 9, color: D.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Patient's Words</p>
                    <p style={{ fontSize: 12, fontStyle: "italic", color: D.txt, lineHeight: 1.5 }}>"{p.raw}"</p>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 9, color: D.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>AI Clinical Tags</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {p.clinical.map(c => <span key={c} className="chip" style={{ background: "#0A1628", color: "#14B8A6" }}>{c}</span>)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {!isCalled ? (
                      <button onClick={() => handleAction(p, "callin")} disabled={calling[p.id]}
                        style={{ flex: 2, padding: "9px", borderRadius: 10, background: calling[p.id] ? "#7C3AED" : "linear-gradient(135deg,#0A1628,#1246A0)", color: "#fff", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer" }}>
                        {calling[p.id] ? "Calling…" : `📢 ${t.callIn}`}
                      </button>
                    ) : (
                      <div style={{ flex: 2, padding: "9px", borderRadius: 10, background: "#F5F3FF", color: "#7C3AED", fontSize: 11, fontWeight: 700, textAlign: "center", border: "1px solid #DDD6FE" }}>
                        📢 Called In
                      </div>
                    )}
                    <button onClick={() => handleAction(p, "noshow")} style={{ flex: 1, padding: "9px", borderRadius: 10, background: D.btn2, color: D.sub, fontSize: 11, fontWeight: 700, border: `1px solid ${D.bdr}`, cursor: "pointer" }}>🚫 {t.noShow}</button>
                    <button onClick={() => handleAction(p, "done")} style={{ padding: "9px 12px", borderRadius: 10, background: "linear-gradient(135deg,#059669,#14B8A6)", color: "#fff", fontSize: 16, border: "none", cursor: "pointer" }}>✅</button>
                  </div>
                </div>
              );
            })}
            {!filtered.length && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "56px 0", color: D.sub }}>
                <p style={{ fontSize: 48 }}>🎉</p>
                <p style={{ fontWeight: 700, marginTop: 10, fontSize: 16 }}>Queue is clear!</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>All patients have been attended to</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "analytics" && (
        <div className="fa" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: D.card, borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: `1px solid ${D.bdr}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: D.txt, marginBottom: 18 }}>📊 Patients per Hour — Today</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
              {hourly.map(d => (
                <div key={d.l} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.txt }}>{d.n}</span>
                  <div style={{ width: "100%", borderRadius: "6px 6px 0 0", background: "linear-gradient(to top,#0A1628,#14B8A6)", height: `${(d.n / maxH) * 90}px`, minHeight: 4, transition: "height .5s" }} />
                  <span style={{ fontSize: 9, color: D.sub, textAlign: "center" }}>{d.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: D.card, borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: `1px solid ${D.bdr}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: D.txt, marginBottom: 16 }}>🏥 Department Distribution</h3>
            {deptDist.map(d => (
              <div key={d.d} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: D.txt, width: 110, flexShrink: 0, fontWeight: 600 }}>{d.d}</span>
                <div style={{ flex: 1, height: 10, borderRadius: 5, background: D.btn2, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 5, background: d.c, width: `${(d.n / total) * 100}%`, transition: "width .7s" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: D.txt, width: 24, textAlign: "right" }}>{d.n}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[{ i: "⏰", l: "Peak Hour", v: "10–11 AM" }, { i: "😊", l: "Satisfaction", v: "4.6 / 5 ⭐" }, { i: "🚫", l: "No-shows", v: "3 today" }, { i: "📊", l: "Avg Daily", v: "89 patients" }, { i: "💊", l: "Top Diagnosis", v: "Fever" }, { i: "⚡", l: "Urgent Cases", v: "12%" }].map(m => (
              <div key={m.l} style={{ background: D.card, borderRadius: 16, padding: "16px 10px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: `1px solid ${D.bdr}` }}>
                <p style={{ fontSize: 26 }}>{m.i}</p>
                <p style={{ fontSize: 15, fontWeight: 900, color: D.txt, marginTop: 6 }}>{m.v}</p>
                <p style={{ fontSize: 10, color: D.sub, marginTop: 3 }}>{m.l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DISPLAY BOARD ──────────────────────────────────────────────────────── */
function DisplayBoard({ t, queue }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i); }, []);

  const called  = queue.filter(p => p.status === "called");
  const waiting = queue.filter(p => p.status === "waiting");
  const avgWait = queue.length ? Math.round(queue.reduce((s, p) => s + p.wait, 0) / queue.length) : 0;

  return (
    <div style={{ background: "#040D1C", minHeight: "84vh", borderRadius: 24, padding: 30, color: "#fff", fontFamily: "'Noto Sans',monospace", border: "1px solid rgba(20,184,166,.15)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#14B8A6,#0891B2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 4px 16px rgba(20,184,166,.4)" }}>🏥</div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#F5A623", letterSpacing: "-.5px" }}>UPHC Ahmedabad</h1>
            <p style={{ fontSize: 12, opacity: .5, marginTop: 2 }}>Urban Primary Health Centre — Live Queue Display</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 42, fontWeight: 900, color: "#14B8A6", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p style={{ fontSize: 11, opacity: .45, marginTop: 5 }}>{time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 28 }}>
        {/* Now Serving */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div className="bl" style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#F59E0B" }}>{t.nowServing}</p>
          </div>
          {called.length === 0 && (
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 18, padding: 28, textAlign: "center", border: "1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>⏳</p>
              <p style={{ fontSize: 13, opacity: .4 }}>Waiting for next call</p>
            </div>
          )}
          {called.map(p => {
            const tc = TC[p.urgency] || TC.yellow;
            return (
              <div key={p.id} style={{ borderRadius: 20, padding: 24, background: "linear-gradient(135deg,rgba(124,58,237,.3),rgba(124,58,237,.15))", marginBottom: 12, border: "1px solid rgba(124,58,237,.4)", boxShadow: "0 6px 24px rgba(124,58,237,.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 64, fontWeight: 900, color: "#F5A623", lineHeight: 1, letterSpacing: "-2px" }}>{p.id}</span>
                  <div style={{ textAlign: "right" }}>
                    <span className="chip" style={{ background: tc.badge, color: "#fff", marginBottom: 6, display: "inline-block" }}>{tc.label}</span>
                    <p style={{ fontSize: 16, fontWeight: 700 }}>{p.dept}</p>
                    <p style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>Counter: OPD {Math.floor(Math.abs(p.id.replace(/\D/g, "") % 3)) + 1}</p>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>👤 {p.name}</p>
                  <span style={{ fontSize: 11, background: "rgba(255,255,255,.1)", padding: "4px 12px", borderRadius: 20 }}>Dr. Shah</span>
                </div>
              </div>
            );
          })}

          {/* Live Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            {[
              { l: "Total Waiting", v: waiting.length,         c: "#14B8A6" },
              { l: "Avg Wait",      v: `${avgWait} min`,       c: "#F5A623" },
              { l: "Called In",     v: called.length,           c: "#A78BFA" },
              { l: "Departments",   v: "6 Open",               c: "#4ADE80" },
            ].map(s => (
              <div key={s.l} style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</p>
                <p style={{ fontSize: 10, opacity: .45, marginTop: 5 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Tokens */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 16 }}>{t.nextTokens}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {waiting.slice(0, 8).map((p, i) => {
              const tc = TC[p.urgency] || TC.yellow;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: `rgba(255,255,255,${.06 - i * .006})`, borderRadius: 16, padding: "14px 20px", borderLeft: `3px solid ${tc.border}`, transition: "opacity .3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#F1F5F9", letterSpacing: "-.5px", minWidth: 64, fontVariantNumeric: "tabular-nums" }}>{p.id}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{p.dept}</p>
                      <p style={{ fontSize: 11, opacity: .5, marginTop: 2 }}>👤 {p.name}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#14B8A6" }}>~{p.wait} min</p>
                    <span className="chip" style={{ background: tc.badge, color: "#fff", marginTop: 4, display: "inline-block" }}>{tc.label}</span>
                  </div>
                </div>
              );
            })}
            {waiting.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", opacity: .3 }}>
                <p style={{ fontSize: 36 }}>✨</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>No patients waiting</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", align: "center", gap: 8 }}>
          <div className="bl" style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", marginTop: 2 }} />
          <p style={{ fontSize: 10, opacity: .35 }}>System Active · Govt. of Gujarat · Free Primary Healthcare</p>
        </div>
        <p style={{ fontSize: 10, opacity: .35 }}>24×7 Helpline: <span style={{ color: "#F5A623", fontWeight: 700 }}>104</span></p>
      </div>
    </div>
  );
}

/* ─── FEEDBACK ───────────────────────────────────────────────────────────── */
function FeedbackView({ t, D }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [aspects, setAspects] = useState([]);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const aspectList = ["Wait time","Staff behavior","Cleanliness","Doctor consultation","Booking experience","Overall care"];
  const labels = ["","Poor","Fair","Good","Very Good","Excellent"];
  const colors = ["","#EF4444","#F97316","#F59E0B","#22C55E","#14B8A6"];

  if (done) return (
    <div className="fa" style={{ textAlign: "center", padding: "56px 20px" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🙏</div>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: D.txt, marginBottom: 8 }}>{t.feedbackThanks}</h2>
      <p style={{ color: D.sub, fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: "0 auto 24px" }}>Your feedback helps us improve care for everyone in the community.</p>
      <div style={{ background: "linear-gradient(140deg,#0A1628,#122C5C)", borderRadius: 22, padding: 26, color: "#fff", display: "inline-block", minWidth: 220 }}>
        <p style={{ fontSize: 48, lineHeight: 1 }}>{"⭐".repeat(rating)}</p>
        <p style={{ fontSize: 20, fontWeight: 900, marginTop: 10, color: colors[rating] }}>{labels[rating]}</p>
        <p style={{ fontSize: 11, opacity: .5, marginTop: 4 }}>Your rating · Today</p>
      </div>
    </div>
  );

  return (
    <div className="su" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: D.txt }}>{t.rateExp}</h2>
        <p style={{ fontSize: 13, color: D.sub, marginTop: 4 }}>Help us improve your experience at UPHC</p>
      </div>

      <div style={{ background: D.card, borderRadius: 22, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,.07)", border: `1px solid ${D.bdr}`, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: D.sub, marginBottom: 20, fontWeight: 600 }}>How was your visit today?</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
              style={{ fontSize: 44, background: "none", border: "none", cursor: "pointer", transition: "transform .15s,filter .15s",
                transform: (hover || rating) >= s ? "scale(1.25)" : "scale(1)", filter: (hover || rating) >= s ? "none" : "grayscale(1) opacity(.3)" }}>⭐</button>
          ))}
        </div>
        <p style={{ fontSize: 16, fontWeight: 900, color: colors[hover || rating] || D.sub, minHeight: 24 }}>{labels[hover || rating]}</p>
      </div>

      <div style={{ background: D.card, borderRadius: 22, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,.07)", border: `1px solid ${D.bdr}` }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: D.txt, marginBottom: 14 }}>What went well? <span style={{ fontSize: 11, color: D.sub, fontWeight: 400 }}>(select all that apply)</span></p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {aspectList.map(a => {
            const sel = aspects.includes(a);
            return (
              <button key={a} onClick={() => setAspects(prev => sel ? prev.filter(x => x !== a) : [...prev, a])}
                style={{ padding: "8px 16px", borderRadius: 22, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all .15s",
                  background: sel ? "#0A1628" : D.btn2, color: sel ? "#14B8A6" : D.txt, boxShadow: sel ? "0 2px 8px rgba(10,22,40,.2)" : "none" }}>
                {sel ? "✓ " : ""}{a}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: D.card, borderRadius: 22, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,.07)", border: `1px solid ${D.bdr}` }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: D.txt, marginBottom: 10 }}>Additional comments <span style={{ fontSize: 11, color: D.sub, fontWeight: 400 }}>(optional)</span></p>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Tell us anything you'd like us to improve…"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: `2px solid ${D.bdr}`, fontSize: 13, outline: "none", resize: "none", color: D.txt, background: D.inp, lineHeight: 1.6 }} />
      </div>

      <button onClick={() => rating > 0 && setDone(true)}
        style={{ width: "100%", padding: "16px", borderRadius: 18, background: rating > 0 ? "linear-gradient(135deg,#0A1628,#14B8A6)" : D.btn2,
          color: rating > 0 ? "#fff" : D.sub, fontWeight: 900, fontSize: 16, border: "none", cursor: rating > 0 ? "pointer" : "default",
          boxShadow: rating > 0 ? "0 6px 24px rgba(20,184,166,.3)" : "none", transition: "all .25s" }}>
        {t.submitFeedback}
      </button>
    </div>
  );
}