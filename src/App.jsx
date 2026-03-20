import { useState, useEffect, useRef } from "react";

/* ─── SUPABASE SINGLETON ─────────────────────────────────────────────────── */
let _sb = null;
const getSB = async () => {
  if (_sb) return _sb;
  const { createClient } = await import("@supabase/supabase-js");
  _sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  return _sb;
};

/* ─── AI NLP ─────────────────────────────────────────────────────────────── */
const extractSymptomsAI = async (text, lang) => {
  try {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500,
        messages: [{ role: "user", content: `You are a triage assistant at an Indian UPHC. Patient complaint in ${lang==="HI"?"Hindi":lang==="GU"?"Gujarati":"English"}: "${text}". Return ONLY JSON: {"clinical_tags":["..."],"urgency":"yellow","department":"General OPD","summary":"Brief English summary","urgency_reason":"..."}` }] }),
    });
    const d = await res.json();
    return JSON.parse((d.content||[]).map(c=>c.text||"").join("").replace(/```json|```/g,"").trim());
  } catch { return { clinical_tags:["Requires assessment"], urgency:"yellow", department:"General OPD", summary:text }; }
};

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const DEPTS = [
  { id:"opd",  label:"General OPD",  icon:"🩺", grad:"linear-gradient(135deg,#1E40AF,#3B82F6)" },
  { id:"mat",  label:"Maternity",    icon:"🤰", grad:"linear-gradient(135deg,#7C3AED,#A78BFA)" },
  { id:"vax",  label:"Vaccination",  icon:"💉", grad:"linear-gradient(135deg,#065F46,#10B981)" },
  { id:"dnt",  label:"Dental",       icon:"🦷", grad:"linear-gradient(135deg,#92400E,#F59E0B)" },
  { id:"eye",  label:"Eye / ENT",    icon:"👁",  grad:"linear-gradient(135deg,#155E75,#06B6D4)" },
  { id:"lab",  label:"Lab / Tests",  icon:"🧪", grad:"linear-gradient(135deg,#9F1239,#F43F5E)" },
];
const SYM_ICONS = ["🤒","😮‍💨","🦴","🤰","💉","❓"];
const TC = {
  red:    { badge:"#DC2626", border:"rgba(248,113,113,.5)", label:"URGENT",   glow:"rgba(220,38,38,.3)"   },
  yellow: { badge:"#D97706", border:"rgba(252,211,77,.5)",  label:"STANDARD", glow:"rgba(217,119,6,.3)"   },
  green:  { badge:"#059669", border:"rgba(110,231,183,.5)", label:"ROUTINE",  glow:"rgba(5,150,105,.3)"   },
};
const L = {
  EN:{ welcome:"Welcome to UPHC",tagline:"Urban Primary Health Centre — Ahmedabad",tapSpeak:"Tap to Speak",describe:"Describe how you are feeling",bookManual:"Book Manually",tapType:"Tap / Type",waBook:"Book on WhatsApp",smsBook:"No Internet? SMS 'BOOK'",checkStatus:"Check Token Status",enterMobile:"Mobile number",checkBtn:"Check",s1title:"Your Details",s1otp:"Verify Identity",s1sent:"OTP sent to",s1verify:"Verify OTP",s1resend:"Resend OTP",s2title:"Describe Your Symptoms",s3title:"Booking Confirmed!",holdSpeak:"Hold to Speak",searchSym:"Search symptoms…",tokenSent:"Token sent via SMS & WhatsApp",notifyMsg:"We'll notify you when it's your turn",waitTime:"Est. Wait",mins:"mins",callIn:"Call In",noShow:"No Show",done:"Done",dashboard:"Staff Dashboard",displayBoard:"Queue Display",feedback:"Feedback",analytics:"Analytics",totalWait:"Waiting",avgWait:"Avg Wait",doneToday:"Done Today",symptoms:["Fever","Cough","Body Ache","Pregnancy","Vaccine","Other"],next:"Continue →",back:"← Back",listening:"Listening…",processing:"AI analyzing…",chooseDept:"Select Department",printToken:"Print Token",navHome:"Home",navBook:"Book",navChat:"Chat",navDash:"Dashboard",navDisplay:"Display",navFeedback:"Feedback",rateExp:"Rate Your Visit",submitFeedback:"Submit Feedback",feedbackThanks:"Thank You!",voiceNA:"Voice not supported. Use Chrome.",install:"Add to Home Screen",installSub:"Works offline — no app store",nowServing:"Now Serving",nextTokens:"Next in Queue" },
  GU:{ welcome:"UPHC માં આપનું સ્વાગત",tagline:"અર્બન પ્રાઇમરી હેલ્થ સેન્ટર — અમદાવાદ",tapSpeak:"બોલવા ટેપ કરો",describe:"તમે કેવું અનુભવો છો",bookManual:"જાતે બુક કરો",tapType:"ટેપ / ટાઇપ",waBook:"WhatsApp પર બુક",smsBook:"ઇન્ટ. નથી? SMS",checkStatus:"ટોકન સ્ટેટસ",enterMobile:"મોબાઇલ",checkBtn:"ચેક",s1title:"તમારી વિગત",s1otp:"OTP ચકાસો",s1sent:"OTP મોકલ્યો",s1verify:"ચકાસો",s1resend:"ફરી મોકલો",s2title:"તકલીફ જણાવો",s3title:"બુકિંગ થઈ ગઈ!",holdSpeak:"દબાવી રાખો",searchSym:"શોધો…",tokenSent:"ટોકન મોકલ્યો",notifyMsg:"વારો આવ્યે જાણ કરીશું",waitTime:"રાહ",mins:"મિ",callIn:"બોલાવો",noShow:"ગેરહ.",done:"પૂર્ણ",dashboard:"ડેશ",displayBoard:"ડિ.",feedback:"પ્ર.",analytics:"વિ.",totalWait:"રાહ",avgWait:"સ.ભ",doneToday:"આજે",symptoms:["તાવ","ઉધ.","દર્દ","ગર્ભ","રસી","અન્ય"],next:"આગળ →",back:"← પાછળ",listening:"સાંભળે…",processing:"AI…",chooseDept:"વિભાગ",printToken:"છાપો",navHome:"હોમ",navBook:"બુક",navChat:"ચેટ",navDash:"ડેશ",navDisplay:"ડિ.",navFeedback:"રેટ",rateExp:"અનુભવ",submitFeedback:"સ્વીકારો",feedbackThanks:"આભાર!",voiceNA:"Chrome",install:"હોમ સ્ક્રીન",installSub:"ઓફલાઇન",nowServing:"સેવા",nextTokens:"આગળ" },
  HI:{ welcome:"UPHC में आपका स्वागत",tagline:"अर्बन प्राइमरी हेल्थ सेंटर — अहमदाबाद",tapSpeak:"बोलने के लिए दबाएं",describe:"अपनी तकलीफ बताएं",bookManual:"खुद बुक करें",tapType:"दबाएं / टाइप",waBook:"WhatsApp पर बुक",smsBook:"इंटरनेट नहीं? SMS",checkStatus:"टोकन स्टेटस",enterMobile:"मोबाइल",checkBtn:"जांचें",s1title:"आपकी जानकारी",s1otp:"OTP सत्यापित",s1sent:"OTP भेजा",s1verify:"सत्यापित करें",s1resend:"दोबारा भेजें",s2title:"लक्षण बताएं",s3title:"बुकिंग हो गई!",holdSpeak:"दबाकर बोलें",searchSym:"खोजें…",tokenSent:"टोकन भेजा",notifyMsg:"बारी पर सूचित करेंगे",waitTime:"प्रतीक्षा",mins:"मि",callIn:"बुलाएं",noShow:"अनु.",done:"पूर्ण",dashboard:"डैश",displayBoard:"डि.",feedback:"प्र.",analytics:"आं.",totalWait:"प्र.",avgWait:"औसत",doneToday:"आज",symptoms:["बुखार","खांसी","दर्द","गर्भ","टीका","अन्य"],next:"आगे →",back:"← वापस",listening:"सुन रहा…",processing:"AI…",chooseDept:"विभाग",printToken:"प्रिंट",navHome:"होम",navBook:"बुक",navChat:"चैट",navDash:"डैश",navDisplay:"डि.",navFeedback:"रेट",rateExp:"रेट करें",submitFeedback:"जमा करें",feedbackThanks:"धन्यवाद!",voiceNA:"Chrome",install:"होम स्क्रीन",installSub:"ऑफलाइन",nowServing:"सेवा",nextTokens:"अगले" },
};

/* ─── GLOBAL STYLES ──────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter','Noto Sans',sans-serif;overflow-x:hidden}
  :root{
    --glass-bg: rgba(255,255,255,0.08);
    --glass-border: rgba(255,255,255,0.18);
    --glass-shadow: 0 8px 32px rgba(0,0,0,0.3);
    --glass-blur: blur(20px) saturate(180%);
    --teal: #14B8A6; --teal-dark: #0D9488;
    --gold: #F5A623; --navy: #050D1F;
    --radius-xl: 24px; --radius-lg: 18px; --radius-md: 12px;
  }
  .glass{background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);box-shadow:var(--glass-shadow)}
  .glass-card{background:rgba(255,255,255,0.06);backdrop-filter:blur(24px) saturate(200%);-webkit-backdrop-filter:blur(24px) saturate(200%);border:1px solid rgba(255,255,255,0.14);box-shadow:0 8px 40px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.12)}
  .glass-dark{background:rgba(5,13,31,0.6);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.4)}
  .liquid-btn{background:rgba(255,255,255,0.15);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.25);transition:all .25s cubic-bezier(.4,0,.2,1);cursor:pointer;color:#fff;font-weight:700}
  .liquid-btn:hover{background:rgba(255,255,255,0.22);border-color:rgba(255,255,255,.35);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.25)}
  .liquid-btn:active{transform:scale(.97) translateY(0)}
  .teal-btn{background:linear-gradient(135deg,#14B8A6,#0891B2);border:none;color:#fff;font-weight:700;cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(20,184,166,.4)}
  .teal-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(20,184,166,.5)}
  .teal-btn:active{transform:scale(.97)}
  .gold-btn{background:linear-gradient(135deg,#F5A623,#F97316);border:none;color:#fff;font-weight:700;cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(245,166,35,.4)}
  .gold-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(245,166,35,.5)}
  .pulse-ring{animation:pr 2.5s ease-out infinite}
  @keyframes pr{0%{box-shadow:0 0 0 0 rgba(20,184,166,.7),0 0 0 0 rgba(20,184,166,.4)}70%{box-shadow:0 0 0 18px rgba(20,184,166,0),0 0 0 34px rgba(20,184,166,0)}100%{box-shadow:0 0 0 0 rgba(20,184,166,0)}}
  .mic-pulse{animation:mp .75s ease-in-out infinite alternate}
  @keyframes mp{from{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,.6)}to{transform:scale(1.08);box-shadow:0 0 0 16px rgba(239,68,68,0)}}
  .slide-up{animation:su .5s cubic-bezier(.22,1,.36,1) both}
  @keyframes su{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fi .4s ease both}
  @keyframes fi{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
  .token-pop{animation:tp .7s cubic-bezier(.34,1.56,.64,1) both}
  @keyframes tp{from{transform:scale(.1);opacity:0}to{transform:scale(1);opacity:1}}
  .wave-bar{animation:wb 1.2s ease-in-out infinite;display:inline-block}
  @keyframes wb{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1.5)}}
  .blink{animation:bk 1.1s step-end infinite}
  @keyframes bk{50%{opacity:0}}
  .hover-lift{transition:transform .2s,box-shadow .2s;cursor:pointer}
  .hover-lift:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.35)!important}
  .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.3px}
  .float-orb{animation:fo 8s ease-in-out infinite}
  @keyframes fo{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,15px) scale(.95)}}
  .float-orb-2{animation:fo2 10s ease-in-out infinite}
  @keyframes fo2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,18px) scale(1.04)}66%{transform:translate(20px,-12px) scale(.97)}}
  .float-orb-3{animation:fo3 12s ease-in-out infinite}
  @keyframes fo3{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-25px)}}
  .heartbeat{animation:hb 1.8s ease-in-out infinite}
  @keyframes hb{0%,100%{transform:scale(1)}14%{transform:scale(1.06)}28%{transform:scale(1)}42%{transform:scale(1.04)}70%{transform:scale(1)}}
  .rotate-slow{animation:rs 20s linear infinite}
  @keyframes rs{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .dash-anim{stroke-dasharray:1000;stroke-dashoffset:1000;animation:da 3s ease forwards}
  @keyframes da{to{stroke-dashoffset:0}}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:2px}
  @media print{.np{display:none!important}.po{display:block!important}}
  .po{display:none}
  input,textarea,button{font-family:inherit}
  button:active{transform:scale(.96)!important}
  .input-glass{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;backdrop-filter:blur(12px);transition:all .2s}
  .input-glass::placeholder{color:rgba(255,255,255,.45)}
  .input-glass:focus{outline:none;border-color:rgba(20,184,166,.6);background:rgba(255,255,255,.12);box-shadow:0 0 0 3px rgba(20,184,166,.15)}
`;

/* ─── BACKGROUND SCENE ───────────────────────────────────────────────────── */
const MedicalBackground = () => (
  <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", background:"linear-gradient(135deg,#020812 0%,#050D1F 30%,#071527 60%,#03111C 100%)" }}>
    {/* Animated gradient orbs */}
    <div className="float-orb" style={{ position:"absolute", top:"-15%", left:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(20,184,166,.18) 0%,transparent 70%)", filter:"blur(40px)" }}/>
    <div className="float-orb-2" style={{ position:"absolute", top:"20%", right:"-15%", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,.14) 0%,transparent 70%)", filter:"blur(50px)" }}/>
    <div className="float-orb-3" style={{ position:"absolute", bottom:"-10%", left:"30%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(168,85,247,.12) 0%,transparent 70%)", filter:"blur(45px)" }}/>
    <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:900, height:900, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,166,35,.05) 0%,transparent 60%)", filter:"blur(60px)" }}/>

    {/* Medical SVG Illustrations */}
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.06 }} viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
      {/* Large ECG / heartbeat line across the screen */}
      <polyline className="dash-anim" points="0,450 100,450 140,450 160,350 180,550 200,250 220,650 240,450 280,450 320,450 360,380 380,520 400,450 500,450 540,420 560,480 580,450 700,450 740,390 760,510 780,450 900,450 940,410 960,490 980,450 1100,450 1140,360 1160,540 1180,450 1400,450"
        fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      {/* DNA Helix left side */}
      <g opacity=".7">
        {Array.from({length:12}).map((_,i)=>(
          <g key={i}>
            <ellipse cx={60} cy={80+i*60} rx={30} ry={8} fill="none" stroke="#14B8A6" strokeWidth="1.5" transform={`rotate(${i*15},60,${80+i*60})`}/>
            <ellipse cx={60} cy={110+i*60} rx={30} ry={8} fill="none" stroke="#3B82F6" strokeWidth="1.5" transform={`rotate(${-i*15},60,${110+i*60})`}/>
          </g>
        ))}
      </g>

      {/* DNA Helix right side */}
      <g opacity=".6">
        {Array.from({length:12}).map((_,i)=>(
          <g key={i}>
            <ellipse cx={1340} cy={80+i*60} rx={30} ry={8} fill="none" stroke="#A78BFA" strokeWidth="1.5" transform={`rotate(${i*15},1340,${80+i*60})`}/>
            <ellipse cx={1340} cy={110+i*60} rx={30} ry={8} fill="none" stroke="#F43F5E" strokeWidth="1.5" transform={`rotate(${-i*15},1340,${110+i*60})`}/>
          </g>
        ))}
      </g>

      {/* Medical cross symbols scattered */}
      {[[200,150],[800,100],[1100,200],[400,750],[1000,750],[650,80]].map(([x,y],i)=>(
        <g key={i} opacity={.4+i*.08}>
          <rect x={x-4} y={y-14} width={8} height={28} rx={2} fill="none" stroke="#14B8A6" strokeWidth="1.5"/>
          <rect x={x-14} y={y-4} width={28} height={8} rx={2} fill="none" stroke="#14B8A6" strokeWidth="1.5"/>
        </g>
      ))}

      {/* Circular scanner rings */}
      <circle cx={1200} cy={200} r={80} fill="none" stroke="#14B8A6" strokeWidth="1" strokeDasharray="8 4" opacity=".4"/>
      <circle cx={1200} cy={200} r={110} fill="none" stroke="#14B8A6" strokeWidth="0.5" strokeDasharray="4 8" opacity=".25"/>
      <circle cx={200} cy={700} r={70} fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="6 4" opacity=".4"/>
      <circle cx={200} cy={700} r={100} fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="3 7" opacity=".25"/>

      {/* Molecule nodes */}
      {[[700,200],[680,240],[720,240],[660,200],[740,200]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i===0?10:6} fill="none" stroke="#A78BFA" strokeWidth="1.5" opacity=".5"/>
      ))}
      <line x1={700} y1={210} x2={680} y2={234} stroke="#A78BFA" strokeWidth="1" opacity=".4"/>
      <line x1={700} y1={210} x2={720} y2={234} stroke="#A78BFA" strokeWidth="1" opacity=".4"/>
      <line x1={690} y1={200} x2={710} y2={200} stroke="#A78BFA" strokeWidth="1" opacity=".4"/>

      {/* Grid pattern very subtle */}
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,.025)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="1400" height="900" fill="url(#grid)"/>
    </svg>

    {/* Floating medical icons */}
    <div style={{ position:"absolute", top:"8%", right:"8%", fontSize:120, opacity:.04, filter:"blur(1px)" }} className="float-orb">⚕️</div>
    <div style={{ position:"absolute", bottom:"12%", left:"6%", fontSize:100, opacity:.04, filter:"blur(1px)" }} className="float-orb-2">🧬</div>
    <div style={{ position:"absolute", top:"45%", right:"4%", fontSize:80, opacity:.04, filter:"blur(1px)" }} className="float-orb-3">💊</div>

    {/* Noise overlay for depth */}
    <div style={{ position:"absolute", inset:0, backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")", opacity:.4 }}/>
  </div>
);

/* ─── ROOT APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang] = useState("EN");
  const [view, setView] = useState("home");
  const [queue, setQueue] = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const t = L[lang];

  const mapToken = tk => ({
    id: tk.token_number, name: tk.patient_name||`Patient ${tk.patient_mobile?.slice(-4)}`,
    dept: tk.department, raw: tk.symptoms_raw||"No complaint recorded",
    clinical: tk.clinical_tags||["Requires assessment"], urgency: tk.urgency||"yellow",
    time: new Date(tk.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
    wait: tk.wait_minutes, dbId: tk.id, mobile: tk.patient_mobile, status: tk.status,
  });

  useEffect(() => {
    let channel;
    (async () => {
      const sb = await getSB();
      const load = async () => {
        const { data: w } = await sb.from("tokens").select("*").eq("status","waiting").order("created_at",{ascending:true});
        const { data: c } = await sb.from("tokens").select("*").eq("status","called").order("created_at",{ascending:true});
        const { count: done } = await sb.from("tokens").select("*",{count:"exact",head:true}).eq("status","completed");
        const { count: ns } = await sb.from("tokens").select("*",{count:"exact",head:true}).eq("status","noshow");
        setQueue([...(c||[]),(w||[])].map(mapToken));
        setDoneCount((done||0)+(ns||0));
      };
      await load();
      channel = sb.channel("global").on("postgres_changes",{event:"*",schema:"public",table:"tokens"},load).subscribe();
    })();
    return () => channel?.unsubscribe();
  }, []);

  const updateStatus = async (dbId, status) => {
    try { await fetch("/api/update-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:dbId,status})}); } catch(e){console.error(e);}
  };

  return (
    <div style={{ minHeight:"100vh", fontFamily:"'Inter','Noto Sans',sans-serif", position:"relative", color:"#fff" }}>
      <style>{GLOBAL_CSS}</style>
      <MedicalBackground/>

      {/* ── HEADER ── */}
      <header className="np glass-dark" style={{ position:"sticky", top:0, zIndex:200, borderBottom:"1px solid rgba(255,255,255,.08)", borderRadius:0 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"10px 16px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div className="heartbeat" style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#14B8A6,#0891B2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:"0 4px 16px rgba(20,184,166,.5)" }}>🏥</div>
            <div>
              <div style={{ fontWeight:900, fontSize:14, letterSpacing:.5, lineHeight:1.1 }}>UPHC</div>
              <div style={{ fontSize:8, color:"#14B8A6", fontWeight:700, letterSpacing:2 }}>AHMEDABAD</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display:"flex", gap:3, flex:1, justifyContent:"center", flexWrap:"wrap" }}>
            {[["home","navHome"],["book","navBook"],["chat","navChat"],["dash","navDash"],["display","navDisplay"],["feedback","navFeedback"]].map(([v,k])=>(
              <button key={v} onClick={()=>setView(v)} className="liquid-btn" style={{ padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:700, border:"1px solid rgba(255,255,255,.12)",
                background: view===v ? "linear-gradient(135deg,rgba(20,184,166,.4),rgba(8,145,178,.4))" : "rgba(255,255,255,.06)", color: view===v ? "#fff" : "rgba(255,255,255,.7)",
                boxShadow: view===v ? "0 0 0 1px rgba(20,184,166,.4),0 4px 16px rgba(20,184,166,.2)" : "none" }}>{t[k]}</button>
            ))}
          </nav>

          {/* Lang + Theme */}
          <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
            {["EN","GU","HI"].map(l=>(
              <button key={l} onClick={()=>setLang(l)} style={{ padding:"4px 9px", borderRadius:8, fontSize:10, fontWeight:800, border:"none", cursor:"pointer", transition:"all .2s",
                background: lang===l ? "linear-gradient(135deg,#F5A623,#F97316)" : "rgba(255,255,255,.08)", color: lang===l ? "#fff" : "rgba(255,255,255,.6)", letterSpacing:.5 }}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: view==="display"?1400:view==="dash"?1200:520, margin:"0 auto", padding:"20px 14px 64px", position:"relative", zIndex:10 }}>
        {view==="home"     && <HomeView     t={t} setView={setView} queue={queue}/>}
        {view==="book"     && <BookView     t={t} lang={lang} setView={setView}/>}
        {view==="chat"     && <ChatView/>}
        {view==="dash"     && <DashView     t={t} queue={queue} doneCount={doneCount} updateStatus={updateStatus}/>}
        {view==="display"  && <DisplayBoard t={t} queue={queue}/>}
        {view==="feedback" && <FeedbackView t={t}/>}
      </main>
    </div>
  );
}

/* ─── GLASS CARD COMPONENT ───────────────────────────────────────────────── */
const GCard = ({ children, style={}, className="" }) => (
  <div className={`glass-card ${className}`} style={{ borderRadius:24, padding:22, ...style }}>{children}</div>
);

/* ─── HOME ───────────────────────────────────────────────────────────────── */
function HomeView({ t, setView, queue }) {
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState("");
  const waiting = queue.filter(q=>q.status==="waiting").length;
  const avgWait = queue.length ? Math.round(queue.reduce((s,p)=>s+p.wait,0)/queue.length) : 0;

  const checkToken = () => {
    if (mobile.length < 10) { setStatus("⚠ Enter a valid 10-digit number"); return; }
    const found = queue.find(q=>q.mobile?.endsWith(mobile.slice(-4)));
    if (found) setStatus(`✅ Token ${found.id} | ${found.dept} | ~${found.wait} mins | ${found.status}`);
    else setStatus("ℹ No active token found.");
  };

  return (
    <div className="slide-up" style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Hero */}
      <div className="glass-card" style={{ borderRadius:28, padding:"32px 24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-60, right:-60, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(20,184,166,.25),transparent 70%)", filter:"blur(20px)" }}/>
        <div style={{ position:"absolute", bottom:-40, left:-40, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,166,35,.2),transparent 70%)", filter:"blur(20px)" }}/>

        {/* Hospital illustration */}
        <svg style={{ position:"absolute", right:16, bottom:0, opacity:.12, height:140 }} viewBox="0 0 120 140">
          <rect x={20} y={50} width={80} height={90} rx={4} fill="#14B8A6"/>
          <rect x={48} y={20} width={24} height={34} rx={2} fill="#14B8A6"/>
          <rect x={54} y={5} width={12} height={20} rx={1} fill="#14B8A6"/>
          <rect x={45} y={60} width={16} height={16} rx={2} fill="rgba(0,0,0,.3)"/>
          <rect x={59} y={60} width={16} height={16} rx={2} fill="rgba(0,0,0,.3)"/>
          <rect x={73} y={60} width={16} height={16} rx={2} fill="rgba(0,0,0,.3)"/>
          <rect x={45} y={80} width={16} height={16} rx={2} fill="rgba(0,0,0,.3)"/>
          <rect x={59} y={80} width={16} height={16} rx={2} fill="rgba(0,0,0,.3)"/>
          <rect x={73} y={80} width={16} height={16} rx={2} fill="rgba(0,0,0,.3)"/>
          <rect x={50} y={108} width={20} height={32} rx={3} fill="rgba(0,0,0,.2)"/>
          <rect x={56} y={50} width={8} height={20} rx={1} fill="rgba(255,255,255,.6)"/>
          <rect x={50} y={56} width={20} height={8} rx={1} fill="rgba(255,255,255,.6)"/>
        </svg>

        <div style={{ position:"relative" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, background:"rgba(20,184,166,.15)", border:"1px solid rgba(20,184,166,.3)", padding:"5px 14px", borderRadius:20, marginBottom:14 }}>
            <div className="blink" style={{ width:6, height:6, borderRadius:"50%", background:"#4ADE80" }}/>
            <span style={{ fontSize:10, fontWeight:700, color:"#4ADE80", letterSpacing:1.5 }}>OPEN · FREE HEALTHCARE · 24×7</span>
          </div>
          <h1 style={{ fontSize:30, fontWeight:900, lineHeight:1.15, letterSpacing:"-.5px", marginBottom:6, textShadow:"0 2px 20px rgba(0,0,0,.3)" }}>{t.welcome}</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginBottom:22 }}>{t.tagline}</p>

          {/* Live stats */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { icon:"👥", val:waiting, label:"Waiting now", color:"#14B8A6" },
              { icon:"⏱", val:`~${avgWait}m`, label:"Avg wait time", color:"#F5A623" },
              { icon:"🏥", val:"6", label:"Departments", color:"#A78BFA" },
            ].map(s=>(
              <div key={s.label} className="glass" style={{ padding:"10px 16px", borderRadius:14, flex:1, minWidth:90 }}>
                <div style={{ fontSize:18, marginBottom:3 }}>{s.icon}</div>
                <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.5)", marginTop:3, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {/* Voice */}
        <button onClick={()=>setView("book")} className="hover-lift" style={{ borderRadius:24, padding:"24px 16px", background:"linear-gradient(145deg,rgba(20,184,166,.15),rgba(8,145,178,.1))", border:"1px solid rgba(20,184,166,.3)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:14, minHeight:180, boxShadow:"0 8px 32px rgba(0,0,0,.25)", backdropFilter:"blur(20px)" }}>
          <div className="pulse-ring" style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#14B8A6,#0891B2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, boxShadow:"0 6px 24px rgba(20,184,166,.5)" }}>🎤</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:4, color:"#fff" }}>{t.tapSpeak}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.55)", lineHeight:1.5 }}>{t.describe}</div>
          </div>
        </button>

        {/* Manual */}
        <button onClick={()=>setView("book")} className="hover-lift" style={{ borderRadius:24, padding:"24px 16px", background:"linear-gradient(145deg,rgba(245,166,35,.15),rgba(249,115,22,.1))", border:"1px solid rgba(245,166,35,.3)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:14, minHeight:180, boxShadow:"0 8px 32px rgba(0,0,0,.25)", backdropFilter:"blur(20px)" }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#F5A623,#F97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, boxShadow:"0 6px 24px rgba(245,166,35,.4)" }}>📋</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:4 }}>{t.bookManual}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.55)" }}>{t.tapType}</div>
          </div>
        </button>
      </div>

      {/* PWA Banner */}
      <GCard style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.3))", border:"1px solid rgba(139,92,246,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📲</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>{t.install}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:2 }}>{t.installSub}</div>
        </div>
        <button className="teal-btn" style={{ padding:"7px 16px", borderRadius:10, fontSize:11, flexShrink:0 }}>Install</button>
      </GCard>

      {/* WhatsApp + SMS */}
      {[
        { color:"#25D366", icon:"💬", title:t.waBook, sub:"Message 'HI' to +91-97XX-XXXXX", tag:"WhatsApp" },
        { color:"#6366F1", icon:"📱", title:t.smsBook, sub:"Works on any phone, zero internet" },
      ].map((b,i)=>(
        <GCard key={i} style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14, borderLeft:`3px solid ${b.color}`, borderTopLeftRadius:0, borderBottomLeftRadius:0 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:`${b.color}20`, border:`1px solid ${b.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{b.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{b.title}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:2 }}>{b.sub}</div>
          </div>
          {b.tag && <span style={{ fontSize:10, fontWeight:700, color:b.color, background:`${b.color}20`, padding:"3px 10px", borderRadius:20, border:`1px solid ${b.color}30` }}>{b.tag}</span>}
        </GCard>
      ))}

      {/* Status check */}
      <GCard>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>🔍 {t.checkStatus}</div>
        <div style={{ display:"flex", gap:8 }}>
          <input type="tel" maxLength={10} value={mobile} onChange={e=>setMobile(e.target.value)} placeholder={t.enterMobile} className="input-glass"
            style={{ flex:1, padding:"11px 14px", borderRadius:12, fontSize:14, border:"1px solid rgba(255,255,255,.2)" }}/>
          <button onClick={checkToken} className="teal-btn" style={{ padding:"11px 18px", borderRadius:12, fontSize:12, flexShrink:0 }}>{t.checkBtn}</button>
        </div>
        {status && <div style={{ marginTop:10, padding:"9px 14px", borderRadius:10, background:"rgba(20,184,166,.12)", border:"1px solid rgba(20,184,166,.3)", fontSize:12, fontWeight:600, color:"#5EEAD4" }}>{status}</div>}
      </GCard>

      <div style={{ textAlign:"center", fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:500 }}>Govt. of Gujarat · Free Healthcare for All · 24×7 Helpline: <span style={{ color:"#14B8A6", fontWeight:700 }}>104</span></div>
    </div>
  );
}

/* ─── BOOK VIEW ──────────────────────────────────────────────────────────── */
function BookView({ t, lang, setView }) {
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
  const verifyOTP = () => { if(otp.join("")==="123456") setStep(3); else setOtpErr("Incorrect OTP. Use 123456"); };
  const handleOtp = (i,v) => { if(!/^[0-9]?$/.test(v))return; const n=[...otp];n[i]=v;setOtp(n); if(v&&i<5)otpRef.current[i+1]?.focus(); };

  const startVoice = () => {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert(t.voiceNA);return;}
    const r=new SR(); r.lang=lang==="HI"?"hi-IN":lang==="GU"?"gu-IN":"en-IN"; r.interimResults=true;
    r.onresult=e=>setTranscript(Array.from(e.results).map(x=>x[0].transcript).join(""));
    r.onend=()=>setVState("done"); r.start(); recRef.current=r; setVState("listening");
  };
  const stopVoice = () => recRef.current?.stop();

  useEffect(()=>{ if(vState==="done"&&transcript){setNlpLoad(true);extractSymptomsAI(transcript,lang).then(r=>{setNlp(r);setNlpLoad(false);});} },[vState]);

  const pickSym = async sym => {
    const next=selSym.includes(sym)?selSym.filter(x=>x!==sym):[...selSym,sym]; setSelSym(next);
    if(!nlp&&next.length>0){setNlpLoad(true);const r=await extractSymptomsAI(next.join(", "),lang);setNlp(r);setNlpLoad(false);}
  };

  const bookToken = async () => {
    if(!canNext||booking)return; setBooking(true);
    try {
      const res=await fetch("/api/book-token",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mobile,patient_name:patientName,department:dept?.label||"General OPD",symptoms_raw:transcript||selSym.join(", "),clinical_tags:nlp?.clinical_tags||selSym,urgency:nlp?.urgency||"yellow"})});
      const data=await res.json();
      if(data.success){tokenNum.current=data.token.token_number;tokenData.current=data.token;setStep(4);}
      else alert("Booking failed. Please try again.");
    } catch{alert("Network error. Please try again.");} finally{setBooking(false);}
  };

  const canNext = nlp||selSym.length>0;
  const urgColor={red:"#DC2626",yellow:"#D97706",green:"#059669"}[nlp?.urgency]||"#D97706";
  const reset = ()=>{setStep(0);setDept(null);setMobile("");setPatientName("");setOtp(["","","","","",""]);setVState("idle");setTranscript("");setNlp(null);setSelSym([]);setSearch("");};

  return (
    <div className="slide-up">
      {/* Progress */}
      <div style={{ display:"flex", gap:3, marginBottom:24 }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, gap:5 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, transition:"all .35s",
              background:i<step?"linear-gradient(135deg,#14B8A6,#0891B2)":i===step?"linear-gradient(135deg,#F5A623,#F97316)":"rgba(255,255,255,.1)",
              color:"#fff", border:i===step?"none":"1px solid rgba(255,255,255,.15)", boxShadow:i<step?"0 2px 10px rgba(20,184,166,.4)":i===step?"0 2px 10px rgba(245,166,35,.4)":"none" }}>
              {i<step?"✓":i+1}
            </div>
            <div style={{ height:3, width:"100%", borderRadius:2, transition:"all .35s",
              background:i<step?"linear-gradient(90deg,#14B8A6,#0891B2)":i===step?"linear-gradient(90deg,#F5A623,#F97316)":"rgba(255,255,255,.08)" }}/>
            <span style={{ fontSize:8, color:"rgba(255,255,255,.5)", textAlign:"center", fontWeight:600, letterSpacing:.3 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* STEP 0 — Department */}
      {step===0&&(
        <div className="fade-in">
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>{t.chooseDept}</h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>Select the department for your visit</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {DEPTS.map(d=>(
              <button key={d.id} onClick={()=>{setDept(d);setStep(1);}} className="hover-lift glass-card" style={{ padding:"20px 14px", borderRadius:20, border:`1px solid ${dept?.id===d.id?"rgba(20,184,166,.5)":"rgba(255,255,255,.1)"}`, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:10, background:dept?.id===d.id?"rgba(20,184,166,.12)":"rgba(255,255,255,.04)", transition:"all .2s" }}>
                <div style={{ width:58, height:58, borderRadius:18, background:d.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, boxShadow:"0 4px 16px rgba(0,0,0,.3)" }}>{d.icon}</div>
                <span style={{ fontSize:12, fontWeight:700, color:"#fff", textAlign:"center", lineHeight:1.3 }}>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1 — Details */}
      {step===1&&(
        <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <h2 style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>{t.s1title}</h2>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.08)", padding:"4px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,.12)" }}>
              <span>{dept?.icon}</span>
              <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{dept?.label}</span>
            </div>
          </div>
          <GCard>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.5)", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>👤 Full Name</label>
            <input type="text" value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="Enter your full name" className="input-glass"
              style={{ width:"100%", padding:"13px 16px", borderRadius:14, fontSize:15, fontWeight:600, border:`1px solid ${patientName?"rgba(20,184,166,.5)":"rgba(255,255,255,.15)"}` }}/>
          </GCard>
          <GCard>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.5)", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>📱 Mobile Number</label>
            <div style={{ display:"flex", alignItems:"center", border:`1px solid ${mobile?"rgba(20,184,166,.5)":"rgba(255,255,255,.15)"}`, borderRadius:14, overflow:"hidden", marginBottom:12, background:"rgba(255,255,255,.06)", transition:"border-color .2s" }}>
              <span style={{ padding:"0 14px", fontSize:13, color:"rgba(255,255,255,.5)", fontWeight:700, borderRight:"1px solid rgba(255,255,255,.1)", alignSelf:"stretch", display:"flex", alignItems:"center" }}>+91</span>
              <input type="tel" maxLength={10} value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="XXXXX XXXXX"
                style={{ flex:1, padding:"13px 14px", fontSize:20, fontWeight:700, letterSpacing:3, border:"none", outline:"none", background:"transparent", color:"#fff" }}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
              {[1,2,3,4,5,6,7,8,9,"*",0,"⌫"].map(d=>(
                <button key={d} onClick={()=>{if(d==="⌫")setMobile(m=>m.slice(0,-1));else if(mobile.length<10)setMobile(m=>m+d);}}
                  className="liquid-btn" style={{ padding:"12px 0", borderRadius:12, fontSize:17, fontWeight:700 }}>{d}</button>
              ))}
            </div>
          </GCard>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setStep(0)} className="liquid-btn" style={{ flex:1, padding:"13px", borderRadius:14, fontSize:14 }}>{t.back}</button>
            <button onClick={()=>{if(mobile.length>=10&&patientName.trim())sendOTP();}} className="teal-btn"
              style={{ flex:2, padding:"13px", borderRadius:14, fontSize:15, opacity:(mobile.length>=10&&patientName.trim())?1:.5 }}>{t.next}</button>
          </div>
        </div>
      )}

      {/* STEP 2 — OTP */}
      {step===2&&(
        <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <h2 style={{ fontSize:22, fontWeight:900 }}>{t.s1otp}</h2>
          <GCard style={{ textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.3))", border:"1px solid rgba(139,92,246,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 16px" }}>📱</div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginBottom:6 }}>{t.s1sent} <b style={{ color:"#fff" }}>+91-{mobile}</b></p>
            {/* Demo OTP badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:"rgba(245,166,35,.12)", border:"1px solid rgba(245,166,35,.35)", padding:"10px 20px", borderRadius:16, marginBottom:22 }}>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.7)", fontWeight:600 }}>Demo OTP:</span>
              <div style={{ display:"flex", gap:4 }}>
                {["1","2","3","4","5","6"].map((d,i)=>(
                  <div key={i} style={{ width:28, height:32, borderRadius:8, background:"rgba(245,166,35,.2)", border:"1px solid rgba(245,166,35,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#F5A623" }}>{d}</div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:14 }}>
              {otp.map((v,i)=>(
                <input key={i} ref={el=>otpRef.current[i]=el} type="tel" maxLength={1} value={v}
                  onChange={e=>handleOtp(i,e.target.value)} onKeyDown={e=>{if(e.key==="Backspace"&&!v&&i>0)otpRef.current[i-1]?.focus();}}
                  style={{ width:48, height:58, textAlign:"center", fontSize:24, fontWeight:900, borderRadius:14, border:`1px solid ${v?"rgba(20,184,166,.6)":"rgba(255,255,255,.15)"}`, outline:"none", color:"#fff", background:v?"rgba(20,184,166,.12)":"rgba(255,255,255,.06)", transition:"all .2s", backdropFilter:"blur(12px)" }}/>
              ))}
            </div>
            {otpErr&&<p style={{ color:"#F87171", fontSize:12, marginBottom:8, fontWeight:600 }}>{otpErr}</p>}
            <button onClick={()=>setStep(1)} style={{ fontSize:12, color:"#60A5FA", background:"none", border:"none", cursor:"pointer" }}>{t.s1resend}</button>
          </GCard>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setStep(1)} className="liquid-btn" style={{ flex:1, padding:"13px", borderRadius:14, fontSize:14 }}>{t.back}</button>
            <button onClick={verifyOTP} className="teal-btn" style={{ flex:2, padding:"13px", borderRadius:14, fontSize:15 }}>{t.s1verify}</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Symptoms */}
      {step===3&&(
        <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <h2 style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>{t.s2title}</h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>Hi <b style={{ color:"#14B8A6" }}>{patientName}</b>, describe your symptoms</p>
          </div>
          <GCard>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
              <button onMouseDown={startVoice} onMouseUp={stopVoice} onTouchStart={startVoice} onTouchEnd={stopVoice}
                className={vState==="listening"?"mic-pulse":vState==="idle"?"pulse-ring":""}
                style={{ width:84, height:84, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, border:"none", cursor:"pointer",
                  background:vState==="listening"?"linear-gradient(135deg,#DC2626,#EF4444)":vState==="done"?"linear-gradient(135deg,#059669,#14B8A6)":"linear-gradient(135deg,#0A1628,#1246A0)",
                  color:"#fff", boxShadow:"0 8px 32px rgba(0,0,0,.4)" }}>
                {vState==="listening"?"⏹":vState==="done"?"✓":"🎤"}
              </button>
              <p style={{ fontSize:12, fontWeight:700, color:vState==="listening"?"#F87171":vState==="done"?"#34D399":"rgba(255,255,255,.6)" }}>
                {vState==="idle"?t.holdSpeak:vState==="listening"?t.listening:t.processing}
              </p>
              {vState==="listening"&&(
                <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:36 }}>
                  {Array.from({length:18}).map((_,i)=>(
                    <div key={i} className="wave-bar" style={{ width:3, borderRadius:2, background:`hsl(${160+i*4},80%,60%)`, animationDelay:`${i*.07}s`, height:`${10+Math.random()*16}px` }}/>
                  ))}
                </div>
              )}
              {transcript&&<div style={{ padding:"10px 16px", background:"rgba(255,255,255,.06)", borderRadius:14, border:"1px solid rgba(255,255,255,.12)", fontSize:13, fontStyle:"italic", color:"rgba(255,255,255,.85)", width:"100%", lineHeight:1.6 }}>"{transcript}"</div>}
            </div>
            {!transcript&&vState==="idle"&&(
              <div style={{ marginTop:16, padding:"12px 14px", borderRadius:14, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)" }}>
                <p style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>AI Example</p>
                <p style={{ fontSize:12, fontStyle:"italic", color:"rgba(255,255,255,.7)", marginBottom:8 }}>"My head is spinning and I feel like throwing up"</p>
                <div style={{ display:"flex", gap:5 }}>
                  {["Vertigo","Nausea"].map(tag=><span key={tag} className="chip" style={{ background:"rgba(20,184,166,.2)", color:"#14B8A6", border:"1px solid rgba(20,184,166,.3)" }}>[{tag}]</span>)}
                </div>
              </div>
            )}
            {nlpLoad&&<div style={{ textAlign:"center", padding:16, color:"rgba(255,255,255,.5)", fontSize:13 }}>🤖 {t.processing}</div>}
            {nlp&&!nlpLoad&&(
              <div className="fade-in" style={{ marginTop:14, padding:16, borderRadius:16, border:`1px solid ${urgColor}40`, background:`${urgColor}10` }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                  <span className="chip" style={{ background:urgColor, color:"#fff" }}>{nlp.urgency?.toUpperCase()}</span>
                  <span style={{ fontSize:13, fontWeight:700 }}>→ {nlp.department}</span>
                </div>
                <p style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginBottom:10 }}>{nlp.summary}</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {nlp.clinical_tags?.map(tag=><span key={tag} className="chip" style={{ background:"rgba(20,184,166,.15)", color:"#14B8A6", border:"1px solid rgba(20,184,166,.3)" }}>[{tag}]</span>)}
                </div>
              </div>
            )}
          </GCard>

          <GCard>
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.06)", borderRadius:12, padding:"9px 14px", marginBottom:12, border:"1px solid rgba(255,255,255,.1)" }}>
              <span style={{ fontSize:15 }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.searchSym}
                style={{ flex:1, fontSize:13, border:"none", outline:"none", background:"transparent", color:"#fff" }}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {t.symptoms.map((s,i)=>(
                <button key={s} onClick={()=>pickSym(s)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 8px", borderRadius:16, cursor:"pointer", transition:"all .18s",
                  border:`1px solid ${selSym.includes(s)?"rgba(20,184,166,.5)":"rgba(255,255,255,.1)"}`,
                  background:selSym.includes(s)?"rgba(20,184,166,.15)":"rgba(255,255,255,.04)", backdropFilter:"blur(12px)" }}>
                  <span style={{ fontSize:26 }}>{SYM_ICONS[i]}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:selSym.includes(s)?"#14B8A6":"rgba(255,255,255,.8)", textAlign:"center" }}>{s}</span>
                </button>
              ))}
            </div>
          </GCard>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setStep(2)} className="liquid-btn" style={{ flex:1, padding:"13px", borderRadius:14, fontSize:14 }}>{t.back}</button>
            <button onClick={bookToken} disabled={!canNext||booking} className="teal-btn"
              style={{ flex:2, padding:"13px", borderRadius:14, fontSize:15, opacity:canNext?1:.5 }}>{booking?"Booking…":t.next}</button>
          </div>
        </div>
      )}

      {/* STEP 4 — Success */}
      {step===4&&(
        <div className="fade-in" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:18, textAlign:"center" }}>
          <div style={{ width:70, height:70, borderRadius:"50%", background:"linear-gradient(135deg,rgba(5,150,105,.4),rgba(20,184,166,.4))", border:"1px solid rgba(20,184,166,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, boxShadow:"0 6px 24px rgba(20,184,166,.3)" }}>✅</div>
          <div>
            <h2 style={{ fontSize:26, fontWeight:900, marginBottom:6 }}>{t.s3title}</h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.6)" }}>Welcome, <b style={{ color:"#14B8A6" }}>{patientName}</b></p>
          </div>

          {/* Token Card */}
          <div className="token-pop" style={{ width:"100%", borderRadius:28, padding:"32px 26px", position:"relative", overflow:"hidden", background:"linear-gradient(145deg,#050D1F 0%,#0A2040 40%,#081830 100%)", border:"1px solid rgba(20,184,166,.3)", boxShadow:"0 20px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)" }}>
            {/* Decorative elements */}
            <div style={{ position:"absolute", top:-50, right:-50, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(20,184,166,.2),transparent 70%)", filter:"blur(20px)" }}/>
            <div style={{ position:"absolute", bottom:-30, left:-30, width:150, height:150, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,166,35,.15),transparent 70%)", filter:"blur(20px)" }}/>
            {/* ECG line decoration */}
            <svg style={{ position:"absolute", bottom:20, left:0, right:0, width:"100%", opacity:.08 }} height="40" viewBox="0 0 400 40">
              <polyline points="0,20 60,20 80,20 90,5 100,35 110,2 120,38 130,20 200,20 220,15 230,25 240,20 400,20" fill="none" stroke="#14B8A6" strokeWidth="2"/>
            </svg>
            <div style={{ position:"relative" }}>
              <p style={{ fontSize:10, color:"rgba(255,255,255,.4)", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>UPHC · {dept?.label||"General OPD"} · {new Date().toLocaleDateString("en-IN")}</p>
              <div style={{ fontSize:88, fontWeight:900, color:"#F5A623", lineHeight:1, letterSpacing:"-3px", textShadow:"0 4px 24px rgba(245,166,35,.4)", marginBottom:6 }}>{tokenNum.current}</div>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:20 }}>Your queue number</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"rgba(255,255,255,.06)", borderRadius:16, overflow:"hidden", marginBottom:20 }}>
                {[{l:t.waitTime,v:`${tokenData.current?.wait_minutes||20} ${t.mins}`,c:"#14B8A6"},{l:"Counter",v:tokenData.current?.counter||"OPD 1",c:"#fff"},{l:"Doctor",v:tokenData.current?.doctor||"Dr. Shah",c:"#fff"}].map((x,i)=>(
                  <div key={i} style={{ padding:"14px 10px", background:"rgba(255,255,255,.04)", textAlign:"center" }}>
                    <p style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>{x.l}</p>
                    <p style={{ fontSize:14, fontWeight:900, color:x.c, lineHeight:1.2 }}>{x.v}</p>
                  </div>
                ))}
              </div>
              {/* QR */}
              <svg width="80" height="80" style={{ display:"block", margin:"0 auto", background:"#fff", borderRadius:12, padding:8 }} viewBox="0 0 7 7">
                {[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],[0,4],[0,5],[0,6],[1,4],[2,4],[2,5],[2,6],[4,4],[6,4],[4,5],[5,6],[3,3],[3,0],[3,2]].map(([x,y],i)=>(
                  <rect key={i} x={x} y={y} width={1} height={1} fill="#050D1F"/>
                ))}
              </svg>
              <p style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:8 }}>Show at counter · Valid today only</p>
            </div>
          </div>

          <div style={{ width:"100%", padding:"14px 18px", borderRadius:18, background:"rgba(20,184,166,.12)", border:"1px solid rgba(20,184,166,.3)" }}>
            <p style={{ fontWeight:700, fontSize:13, color:"#5EEAD4" }}>📲 {t.tokenSent}</p>
            <p style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:4 }}>{t.notifyMsg}</p>
          </div>

          <div style={{ display:"flex", gap:10, width:"100%" }}>
            <button onClick={()=>window.print()} className="liquid-btn" style={{ flex:1, padding:"12px", borderRadius:14, fontSize:12 }}>🖨 {t.printToken}</button>
            <button onClick={()=>window.alert("SMS sent to +91-"+mobile)} style={{ flex:1, padding:"12px", borderRadius:14, background:"linear-gradient(135deg,#25D366,#128C7E)", border:"none", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>💬 Share</button>
          </div>
          <button onClick={reset} className="teal-btn" style={{ width:"100%", padding:"15px", borderRadius:18, fontSize:15 }}>← Book Another Token</button>
        </div>
      )}
    </div>
  );
}

/* ─── CHAT MOCKUP ────────────────────────────────────────────────────────── */
function ChatView() {
  const msgs = [
    {f:"bot",m:"🏥 *Welcome to UPHC Queue Bot!*\n\nDescribe your problem or reply:\n*1* Fever  *2* Cough  *3* Stomach\n*4* Pregnancy  *5* Vaccine  *6* Other",t:"9:30"},
    {f:"usr",m:"Pet dukhe che",t:"9:31"},
    {f:"bot",m:"🤖 *Understood: Stomach Ache*\n\n✅ Token: *A-42*  ⏳ ~22 mins\n🏥 Counter: *OPD 3*  👨‍⚕️ Dr. Shah\n\nWe'll WhatsApp you when near 📲",t:"9:31"},
    {f:"usr",m:"Ok, shukriya",t:"9:32"},
    {f:"bot",m:"📢 *UPHC Alert — Token A-42*\n10 mins to go. Please be ready at OPD Counter 3. 🙏",t:"9:51"},
  ];
  return (
    <div className="slide-up" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <h2 style={{ textAlign:"center", fontSize:20, fontWeight:900 }}>Offline Booking Channels</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* WhatsApp */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <p style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:1.5 }}>WhatsApp Bot</p>
          <div className="hover-lift" style={{ width:"100%", maxWidth:230, borderRadius:24, overflow:"hidden", boxShadow:"0 16px 48px rgba(0,0,0,.5)", border:"1px solid rgba(255,255,255,.1)" }}>
            <div style={{ background:"#1E2B1A", padding:"6px 12px", display:"flex", justifyContent:"space-between", fontSize:9, color:"rgba(255,255,255,.6)" }}><span>9:51</span><span>📶 🔋</span></div>
            <div style={{ background:"#075E54", display:"flex", alignItems:"center", gap:8, padding:"10px 12px" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🏥</div>
              <div><p style={{ color:"#fff", fontWeight:700, fontSize:12 }}>UPHC Health Bot</p><p style={{ color:"rgba(255,255,255,.6)", fontSize:9 }}>🟢 Online</p></div>
            </div>
            <div style={{ background:"#ECE5DD", padding:"8px 7px", minHeight:290, display:"flex", flexDirection:"column", gap:5 }}>
              {msgs.map((m,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:m.f==="usr"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"88%", borderRadius:10, padding:"6px 9px", background:m.f==="usr"?"#DCF8C6":"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.1)" }}>
                    <p style={{ fontSize:9, whiteSpace:"pre-wrap", color:"#111", lineHeight:1.5 }} dangerouslySetInnerHTML={{__html:m.m.replace(/\*(.*?)\*/g,"<b>$1</b>")}}/>
                    <p style={{ fontSize:7, textAlign:"right", color:"#888", marginTop:2 }}>{m.t} ✓✓</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, padding:"7px 8px", background:"#F0F0F0", alignItems:"center" }}>
              <div style={{ flex:1, background:"#fff", borderRadius:20, padding:"6px 10px", fontSize:9, color:"#888" }}>Type a message...</div>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🎤</div>
            </div>
          </div>
        </div>
        {/* SMS */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <p style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:1.5 }}>SMS — Feature Phone</p>
          <div className="hover-lift" style={{ width:"100%", maxWidth:175, borderRadius:20, overflow:"hidden", boxShadow:"0 16px 40px rgba(0,0,0,.5)", background:"#2D2D2D", border:"5px solid #2D2D2D" }}>
            <div style={{ background:"#9BA888", padding:"12px 10px", minHeight:160 }}>
              <p style={{ fontSize:9, fontFamily:"monospace", color:"#2D4A0E", lineHeight:1.8 }}>
                <b>📩 New Message</b><br/>From: UPHC-104<br/>──────────────<br/><b>UPHC ALERT: Token A-42. OPD Counter 3 in 30 mins. Helpline: 104</b>
              </p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, padding:5, background:"#333" }}>
              {[1,2,3,4,5,6,7,8,9,"*",0,"#"].map(k=><div key={k} style={{ padding:"8px 0", textAlign:"center", fontSize:12, fontWeight:700, color:"#fff", background:"#444", borderRadius:3 }}>{k}</div>)}
            </div>
          </div>
          <GCard style={{ padding:"12px 14px", width:"100%" }}>
            <p style={{ fontSize:11, fontWeight:700 }}>📡 SMS Integration</p>
            <p style={{ fontSize:10, color:"rgba(255,255,255,.5)", marginTop:3 }}>Works on any phone. Zero internet required.</p>
          </GCard>
        </div>
      </div>
    </div>
  );
}

/* ─── STAFF DASHBOARD ────────────────────────────────────────────────────── */
function DashView({ t, queue, doneCount, updateStatus }) {
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("queue");
  const [calling, setCalling] = useState({});

  const waiting = queue.filter(p=>p.status==="waiting");
  const called  = queue.filter(p=>p.status==="called");
  const stats   = { waiting:waiting.length, called:called.length, urgent:queue.filter(p=>p.urgency==="red").length, avg:queue.length?Math.round(queue.reduce((s,p)=>s+p.wait,0)/queue.length):0 };

  const handleAction = async (p, action) => {
    if(action==="callin"){ setCalling(c=>({...c,[p.id]:true})); await updateStatus(p.dbId,"called"); setCalling(c=>({...c,[p.id]:false})); }
    else if(action==="noshow") await updateStatus(p.dbId,"noshow");
    else if(action==="done")   await updateStatus(p.dbId,"completed");
  };

  const hourly=[{l:"8-9",n:12},{l:"9-10",n:19},{l:"10-11",n:24},{l:"11-12",n:20},{l:"12-1",n:9},{l:"1-2",n:6}];
  const maxH=Math.max(...hourly.map(d=>d.n));
  const deptDist=[{d:"General OPD",n:14,c:"#3B82F6"},{d:"Maternity",n:3,c:"#A78BFA"},{d:"Vaccination",n:5,c:"#10B981"},{d:"Dental",n:2,c:"#F59E0B"},{d:"Eye/ENT",n:1,c:"#06B6D4"}];
  const total=deptDist.reduce((s,d)=>s+d.n,0);
  const filtered=filter==="all"?queue:filter==="called"?called:queue.filter(p=>p.urgency===filter&&p.status==="waiting");

  return (
    <div className="slide-up">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:26, fontWeight:900, marginBottom:4 }}>{t.dashboard}</h2>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div className="blink" style={{ width:7, height:7, borderRadius:"50%", background:"#4ADE80" }}/>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.5)", fontWeight:600 }}>LIVE · Supabase Realtime</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["queue","🗂 Queue"],["analytics","📊 Analytics"]].map(([tb,lb])=>(
            <button key={tb} onClick={()=>setTab(tb)} className={tab===tb?"teal-btn":"liquid-btn"} style={{ padding:"8px 16px", borderRadius:12, fontSize:12 }}>{lb}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        {[{l:"Waiting",v:stats.waiting,c:"#14B8A6",i:"👥",g:"linear-gradient(135deg,rgba(20,184,166,.2),rgba(8,145,178,.1))"},
          {l:"Called In",v:stats.called,c:"#A78BFA",i:"📢",g:"linear-gradient(135deg,rgba(167,139,250,.2),rgba(139,92,246,.1))"},
          {l:"Urgent",v:stats.urgent,c:"#F87171",i:"🚨",g:"linear-gradient(135deg,rgba(248,113,113,.2),rgba(220,38,38,.1))"},
          {l:t.doneToday,v:doneCount,c:"#4ADE80",i:"✅",g:"linear-gradient(135deg,rgba(74,222,128,.2),rgba(5,150,105,.1))"}].map(s=>(
          <div key={s.l} className="glass-card hover-lift" style={{ borderRadius:18, padding:"16px 12px", textAlign:"center", background:s.g }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.i}</div>
            <div style={{ fontSize:30, fontWeight:900, color:s.c, lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.5)", marginTop:5, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {tab==="queue"&&(
        <>
          <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
            {[["all","All"],["called","📢 Called"],["red","🚨 Urgent"],["yellow","⚡ Standard"],["green","✅ Routine"]].map(([f,l])=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:"6px 14px", borderRadius:10, fontSize:11, fontWeight:700, border:"1px solid rgba(255,255,255,.12)", cursor:"pointer", transition:"all .2s",
                background:filter===f?"linear-gradient(135deg,#14B8A6,#0891B2)":"rgba(255,255,255,.06)", color:"#fff" }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
            {filtered.map(p=>{
              const tc=TC[p.urgency]||TC.yellow;
              const isCalled=p.status==="called";
              return (
                <div key={p.id} className="glass-card hover-lift" style={{ borderRadius:22, padding:18,
                  background:isCalled?"linear-gradient(145deg,rgba(167,139,250,.12),rgba(139,92,246,.08))":"rgba(255,255,255,.04)",
                  borderLeft:`3px solid ${isCalled?"#A78BFA":tc.badge}`, boxShadow:`0 8px 32px rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.08)` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
                      <span style={{ fontSize:22, fontWeight:900, letterSpacing:"-.5px" }}>{p.id}</span>
                      <span className="chip" style={{ background:isCalled?"#A78BFA":tc.badge, color:"#fff" }}>{isCalled?"CALLED":tc.label}</span>
                      <span className="chip" style={{ background:"rgba(255,255,255,.1)", color:"rgba(255,255,255,.7)", border:"1px solid rgba(255,255,255,.12)" }}>{p.dept}</span>
                    </div>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,.5)", fontWeight:700 }}>⏳ {p.wait}m</span>
                  </div>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginBottom:10, fontWeight:600 }}>👤 {p.name} · {p.time}</p>
                  <div style={{ background:"rgba(255,255,255,.04)", borderRadius:12, padding:"10px 12px", marginBottom:10, border:"1px solid rgba(255,255,255,.08)" }}>
                    <p style={{ fontSize:9, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:5 }}>Patient's Words</p>
                    <p style={{ fontSize:12, fontStyle:"italic", color:"rgba(255,255,255,.8)", lineHeight:1.5 }}>"{p.raw}"</p>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <p style={{ fontSize:9, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>AI Clinical Tags</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {p.clinical.map(c=><span key={c} className="chip" style={{ background:"rgba(20,184,166,.15)", color:"#14B8A6", border:"1px solid rgba(20,184,166,.25)" }}>{c}</span>)}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {!isCalled?(
                      <button onClick={()=>handleAction(p,"callin")} disabled={calling[p.id]} className="teal-btn" style={{ flex:2, padding:"9px", borderRadius:12, fontSize:11, opacity:calling[p.id]?.7:1 }}>
                        {calling[p.id]?"Calling…":`📢 ${t.callIn}`}
                      </button>
                    ):(
                      <div style={{ flex:2, padding:"9px", borderRadius:12, background:"rgba(167,139,250,.15)", color:"#A78BFA", fontSize:11, fontWeight:700, textAlign:"center", border:"1px solid rgba(167,139,250,.3)" }}>📢 Called In</div>
                    )}
                    <button onClick={()=>handleAction(p,"noshow")} className="liquid-btn" style={{ flex:1, padding:"9px", borderRadius:12, fontSize:11 }}>🚫</button>
                    <button onClick={()=>handleAction(p,"done")} style={{ padding:"9px 14px", borderRadius:12, background:"linear-gradient(135deg,#059669,#14B8A6)", border:"none", color:"#fff", fontSize:16, cursor:"pointer" }}>✅</button>
                  </div>
                </div>
              );
            })}
            {!filtered.length&&(
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.3)" }}>
                <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
                <p style={{ fontWeight:700, fontSize:18 }}>Queue is clear!</p>
                <p style={{ fontSize:13, marginTop:6 }}>All patients have been attended to</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab==="analytics"&&(
        <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <GCard>
            <h3 style={{ fontSize:14, fontWeight:700, marginBottom:20 }}>📊 Patients per Hour</h3>
            <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:130 }}>
              {hourly.map(d=>(
                <div key={d.l} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.8)" }}>{d.n}</span>
                  <div style={{ width:"100%", borderRadius:"8px 8px 0 0", background:"linear-gradient(to top,#14B8A6,#0891B2)", height:`${(d.n/maxH)*100}px`, minHeight:4, boxShadow:"0 -4px 20px rgba(20,184,166,.3)", transition:"height .5s" }}/>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,.4)", textAlign:"center" }}>{d.l}</span>
                </div>
              ))}
            </div>
          </GCard>
          <GCard>
            <h3 style={{ fontSize:14, fontWeight:700, marginBottom:18 }}>🏥 Department Distribution</h3>
            {deptDist.map(d=>(
              <div key={d.d} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.8)", width:110, flexShrink:0, fontWeight:600 }}>{d.d}</span>
                <div style={{ flex:1, height:8, borderRadius:4, background:"rgba(255,255,255,.08)", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:4, background:d.c, width:`${(d.n/total)*100}%`, boxShadow:`0 0 12px ${d.c}60`, transition:"width .7s" }}/>
                </div>
                <span style={{ fontSize:11, fontWeight:900, color:"rgba(255,255,255,.8)", width:24, textAlign:"right" }}>{d.n}</span>
              </div>
            ))}
          </GCard>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[{i:"⏰",l:"Peak Hour",v:"10–11 AM"},{i:"😊",l:"Satisfaction",v:"4.6 / 5 ⭐"},{i:"🚫",l:"No-shows",v:"3 today"},{i:"📊",l:"Avg Daily",v:"89 patients"},{i:"💊",l:"Top Diagnosis",v:"Fever"},{i:"⚡",l:"Urgent Rate",v:"12%"}].map(m=>(
              <div key={m.l} className="glass-card hover-lift" style={{ borderRadius:18, padding:"16px 12px", textAlign:"center" }}>
                <p style={{ fontSize:26 }}>{m.i}</p>
                <p style={{ fontSize:15, fontWeight:900, marginTop:8 }}>{m.v}</p>
                <p style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:4, textTransform:"uppercase", letterSpacing:.5 }}>{m.l}</p>
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
  useEffect(()=>{const i=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(i);},[]);
  const called  = queue.filter(p=>p.status==="called");
  const waiting = queue.filter(p=>p.status==="waiting");
  const avgWait = queue.length?Math.round(queue.reduce((s,p)=>s+p.wait,0)/queue.length):0;

  return (
    <div style={{ borderRadius:28, overflow:"hidden", minHeight:"86vh", position:"relative", background:"linear-gradient(145deg,#020810 0%,#050D1F 40%,#031118 100%)", border:"1px solid rgba(20,184,166,.15)", boxShadow:"0 24px 80px rgba(0,0,0,.7)" }}>
      {/* Background visuals */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, left:-100, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(20,184,166,.12),transparent 70%)", filter:"blur(40px)" }}/>
        <div style={{ position:"absolute", bottom:-100, right:-100, width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)", filter:"blur(50px)" }}/>
        <svg style={{ position:"absolute", bottom:40, left:0, right:0, width:"100%", opacity:.05 }} height="60" viewBox="0 0 1200 60">
          <polyline points="0,30 80,30 110,30 130,8 150,52 170,3 190,57 210,30 350,30 380,22 400,38 420,30 600,30 630,18 650,42 670,30 850,30 880,12 900,48 920,30 1100,30 1130,10 1150,50 1170,30 1200,30"
            fill="none" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Header */}
      <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"28px 36px 22px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <div className="heartbeat" style={{ width:60, height:60, borderRadius:20, background:"linear-gradient(135deg,#14B8A6,#0891B2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, boxShadow:"0 6px 24px rgba(20,184,166,.5)" }}>🏥</div>
          <div>
            <h1 style={{ fontSize:32, fontWeight:900, color:"#F5A623", letterSpacing:"-.5px" }}>UPHC Ahmedabad</h1>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:3 }}>Urban Primary Health Centre — Live Queue Display</p>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ fontSize:48, fontWeight:900, color:"#14B8A6", fontVariantNumeric:"tabular-nums", lineHeight:1, textShadow:"0 0 30px rgba(20,184,166,.5)" }}>
            {time.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
          </p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:6 }}>{time.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr", gap:28, padding:"28px 36px", position:"relative" }}>
        {/* Now Serving */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <div className="blink" style={{ width:10, height:10, borderRadius:"50%", background:"#F5A623", boxShadow:"0 0 12px #F5A623" }}/>
            <p style={{ fontSize:12, fontWeight:800, letterSpacing:2.5, textTransform:"uppercase", color:"#F5A623" }}>{t.nowServing}</p>
          </div>
          {called.length===0&&(
            <div style={{ borderRadius:20, padding:30, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <p style={{ fontSize:36, marginBottom:10 }}>⏳</p>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.3)" }}>Awaiting next call</p>
            </div>
          )}
          {called.map(p=>{
            const tc=TC[p.urgency]||TC.yellow;
            return (
              <div key={p.id} style={{ borderRadius:22, padding:26, background:"linear-gradient(145deg,rgba(167,139,250,.18),rgba(124,58,237,.1))", border:"1px solid rgba(167,139,250,.35)", boxShadow:"0 8px 40px rgba(124,58,237,.25)", marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:72, fontWeight:900, color:"#F5A623", lineHeight:1, letterSpacing:"-2px", textShadow:"0 4px 24px rgba(245,166,35,.5)" }}>{p.id}</div>
                    <span className="chip" style={{ background:tc.badge, color:"#fff", marginTop:6, display:"inline-block" }}>{tc.label}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:20, fontWeight:800 }}>{p.dept}</p>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginTop:6 }}>Counter: OPD {Math.floor(Math.abs(p.id.replace(/\D/g,"")%3))+1}</p>
                  </div>
                </div>
                <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <p style={{ fontSize:15, fontWeight:700 }}>👤 {p.name}</p>
                  <span style={{ fontSize:12, background:"rgba(255,255,255,.1)", padding:"5px 14px", borderRadius:20, border:"1px solid rgba(255,255,255,.1)" }}>Dr. Shah</span>
                </div>
              </div>
            );
          })}

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
            {[{l:"Total Waiting",v:waiting.length,c:"#14B8A6"},{l:"Avg Wait",v:`${avgWait} min`,c:"#F5A623"},{l:"Called In",v:called.length,c:"#A78BFA"},{l:"Departments",v:"6 Open",c:"#4ADE80"}].map(s=>(
              <div key={s.l} style={{ borderRadius:16, padding:"14px 16px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
                <p style={{ fontSize:26, fontWeight:900, color:s.c, lineHeight:1, textShadow:`0 0 20px ${s.c}60` }}>{s.v}</p>
                <p style={{ fontSize:10, color:"rgba(255,255,255,.4)", marginTop:5, fontWeight:600 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Queue */}
        <div>
          <p style={{ fontSize:12, fontWeight:800, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:18 }}>{t.nextTokens}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {waiting.slice(0,8).map((p,i)=>{
              const tc=TC[p.urgency]||TC.yellow;
              return (
                <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:16, padding:"16px 22px", background:`rgba(255,255,255,${.06-i*.006})`, borderLeft:`3px solid ${tc.badge}`, boxShadow:`inset 0 1px 0 rgba(255,255,255,.06)`, transition:"opacity .3s", opacity:Math.max(.3,1-i*.09) }}>
                  <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                    <span style={{ fontSize:30, fontWeight:900, color:"#F1F5F9", letterSpacing:"-.5px", minWidth:70, fontVariantNumeric:"tabular-nums" }}>{p.id}</span>
                    <div>
                      <p style={{ fontSize:15, fontWeight:700 }}>{p.dept}</p>
                      <p style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>👤 {p.name}</p>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:20, fontWeight:900, color:"#14B8A6" }}>~{p.wait}m</p>
                    <span className="chip" style={{ background:tc.badge, color:"#fff", marginTop:5, display:"inline-block" }}>{tc.label}</span>
                  </div>
                </div>
              );
            })}
            {waiting.length===0&&<div style={{ textAlign:"center", padding:"50px 0", color:"rgba(255,255,255,.2)" }}><p style={{ fontSize:44 }}>✨</p><p style={{ fontSize:16, marginTop:10 }}>No patients waiting</p></div>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 36px", borderTop:"1px solid rgba(255,255,255,.05)", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div className="blink" style={{ width:7, height:7, borderRadius:"50%", background:"#4ADE80", boxShadow:"0 0 10px #4ADE80" }}/>
          <p style={{ fontSize:11, color:"rgba(255,255,255,.25)" }}>System Active · Govt. of Gujarat · Free Primary Healthcare</p>
        </div>
        <p style={{ fontSize:11, color:"rgba(255,255,255,.25)" }}>24×7 Helpline: <span style={{ color:"#F5A623", fontWeight:700 }}>104</span></p>
      </div>
    </div>
  );
}

/* ─── FEEDBACK ───────────────────────────────────────────────────────────── */
function FeedbackView({ t }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [aspects, setAspects] = useState([]);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const aspectList=["Wait time","Staff behavior","Cleanliness","Doctor consultation","Booking experience","Overall care"];
  const labels=["","Poor","Fair","Good","Very Good","Excellent"];
  const colors=["","#EF4444","#F97316","#F59E0B","#22C55E","#14B8A6"];

  if(done) return (
    <div className="fade-in" style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontSize:80, marginBottom:20 }}>🙏</div>
      <h2 style={{ fontSize:28, fontWeight:900, marginBottom:10 }}>{t.feedbackThanks}</h2>
      <p style={{ color:"rgba(255,255,255,.5)", fontSize:14, lineHeight:1.7, maxWidth:340, margin:"0 auto 28px" }}>Your feedback helps us improve care for everyone in our community.</p>
      <div className="token-pop glass-card" style={{ borderRadius:24, padding:28, display:"inline-block", minWidth:240 }}>
        <p style={{ fontSize:52, lineHeight:1 }}>{"⭐".repeat(rating)}</p>
        <p style={{ fontSize:22, fontWeight:900, marginTop:12, color:colors[rating] }}>{labels[rating]}</p>
        <p style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:5 }}>Your rating · Today</p>
      </div>
    </div>
  );

  return (
    <div className="slide-up" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <h2 style={{ fontSize:24, fontWeight:900, marginBottom:4 }}>{t.rateExp}</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>Help us improve your experience at UPHC</p>
      </div>

      <GCard style={{ textAlign:"center" }}>
        {/* Medical rating visual */}
        <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,rgba(20,184,166,.2),rgba(8,145,178,.2))", border:"1px solid rgba(20,184,166,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 18px" }}>🏥</div>
        <p style={{ fontSize:14, color:"rgba(255,255,255,.6)", marginBottom:22, fontWeight:500 }}>How was your visit today?</p>
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:14 }}>
          {[1,2,3,4,5].map(s=>(
            <button key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(s)}
              style={{ fontSize:46, background:"none", border:"none", cursor:"pointer", transition:"all .18s",
                transform:(hover||rating)>=s?"scale(1.3)":"scale(1)", filter:(hover||rating)>=s?"none":"grayscale(1) opacity(.25)",
                textShadow:(hover||rating)>=s?`0 4px 16px ${colors[hover||rating]}80`:"none" }}>⭐</button>
          ))}
        </div>
        <p style={{ fontSize:18, fontWeight:800, color:colors[hover||rating]||"rgba(255,255,255,.3)", minHeight:28, transition:"color .2s" }}>{labels[hover||rating]}</p>
      </GCard>

      <GCard>
        <p style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>What went well? <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:400 }}>(select all that apply)</span></p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {aspectList.map(a=>{
            const sel=aspects.includes(a);
            return (
              <button key={a} onClick={()=>setAspects(prev=>sel?prev.filter(x=>x!==a):[...prev,a])}
                style={{ padding:"8px 18px", borderRadius:24, fontSize:12, fontWeight:600, border:`1px solid ${sel?"rgba(20,184,166,.5)":"rgba(255,255,255,.12)"}`, cursor:"pointer", transition:"all .18s",
                  background:sel?"linear-gradient(135deg,rgba(20,184,166,.25),rgba(8,145,178,.2))":"rgba(255,255,255,.05)", color:sel?"#5EEAD4":"rgba(255,255,255,.7)" }}>
                {sel?"✓ ":""}{a}
              </button>
            );
          })}
        </div>
      </GCard>

      <GCard>
        <p style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Additional comments <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:400 }}>(optional)</span></p>
        <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Tell us how we can improve…" className="input-glass"
          style={{ width:"100%", padding:"12px 16px", borderRadius:14, fontSize:13, resize:"none", lineHeight:1.6, border:"1px solid rgba(255,255,255,.15)" }}/>
      </GCard>

      <button onClick={()=>rating>0&&setDone(true)} className={rating>0?"teal-btn":"liquid-btn"}
        style={{ width:"100%", padding:"17px", borderRadius:20, fontSize:16, fontWeight:900, opacity:rating>0?1:.5, cursor:rating>0?"pointer":"default" }}>
        {t.submitFeedback}
      </button>
    </div>
  );
}