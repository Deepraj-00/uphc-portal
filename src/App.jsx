import { useState, useEffect, useRef } from "react";



/* ─── AI NLP ─────────────────────────────────────────────────────────────── */
const extractSymptomsAI = async (text, lang) => {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `You are a triage assistant at an Indian UPHC. Patient complaint in ${lang==="HI"?"Hindi":lang==="GU"?"Gujarati":"English"}: "${text}". Return ONLY JSON (no markdown): {"clinical_tags":["..."],"urgency":"red","department":"General OPD","summary":"Brief English summary","urgency_reason":"..."}`
        }]
      })
    });
    const d = await res.json();
    const raw = (d.content||[]).map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();
    return JSON.parse(raw);
  } catch {
    return { clinical_tags:["Requires assessment"], urgency:"yellow", department:"General OPD", summary:text, urgency_reason:"Default triage" };
  }
};

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const DEPTS = [
  { id:"opd",  label:"General OPD",  icon:"🩺", color:"#1E40AF" },
  { id:"mat",  label:"Maternity",    icon:"🤰", color:"#7C3AED" },
  { id:"vax",  label:"Vaccination",  icon:"💉", color:"#065F46" },
  { id:"dnt",  label:"Dental",       icon:"🦷", color:"#92400E" },
  { id:"eye",  label:"Eye / ENT",    icon:"👁",  color:"#155E75" },
  { id:"lab",  label:"Lab / Tests",  icon:"🧪", color:"#9F1239" },
];

const SYM_ICONS = ["🤒","😮‍💨","🦴","🤰","💉","❓"];

const TC = {
  red:    { bg:"rgba(254,226,226,.8)", border:"#F87171", badge:"#DC2626", dot:"#F87171", label:"URGENT"   },
  yellow: { bg:"rgba(254,243,199,.8)", border:"#FCD34D", badge:"#D97706", dot:"#FCD34D", label:"STANDARD" },
  green:  { bg:"rgba(209,250,229,.8)", border:"#6EE7B7", badge:"#059669", dot:"#6EE7B7", label:"ROUTINE"  },
};

const INIT_QUEUE = [
  { id:"A-38", name:"Ramesh P.",  dept:"General OPD", raw:"Mara matha ma dard che ane akh feri jay che",  clinical:["Headache","Vertigo"],              urgency:"yellow", time:"9:12", wait:8 },
  { id:"A-39", name:"Sunita D.",  dept:"General OPD", raw:"Bahu tav aave che ane tharthari chhute che",  clinical:["High Fever","Chills","Malaria?"],   urgency:"red",    time:"9:18", wait:5 },
  { id:"A-40", name:"Govind M.",  dept:"General OPD", raw:"Pet ma gas bhaare che ane ulti thay che",     clinical:["Bloating","Nausea"],               urgency:"yellow", time:"9:25", wait:12 },
  { id:"A-41", name:"Fatima B.",  dept:"Vaccination", raw:"Routine vaccine for 3-month baby",           clinical:["Immunization 3M"],                  urgency:"green",  time:"9:30", wait:18 },
  { id:"A-42", name:"Vijay K.",   dept:"General OPD", raw:"Angad ma dard ane sujan aave che",           clinical:["Limb Pain","Swelling"],             urgency:"yellow", time:"9:35", wait:22 },
  { id:"A-43", name:"Meera S.",   dept:"General OPD", raw:"Chati ma dard ane shas levama taklif",       clinical:["Chest Pain","Dyspnea — URGENT"],   urgency:"red",    time:"9:40", wait:2  },
  { id:"A-44", name:"Priya V.",   dept:"Maternity",   raw:"9 months pregnant, contractions every 8 min",clinical:["Active Labour"],                    urgency:"red",    time:"9:45", wait:1  },
  { id:"A-45", name:"Harish C.",  dept:"Dental",      raw:"Daant ma dard aave che khaate-pite",         clinical:["Dental Pain","Possible Caries"],   urgency:"green",  time:"9:52", wait:30 },
];

const L = {
  EN:{
    welcome:"Welcome to UPHC",tagline:"Urban Primary Health Centre — Ahmedabad",
    tapSpeak:"Tap to Speak",describe:"Describe how you are feeling",bookManual:"Book Manually",tapType:"Tap / Type",
    waBook:"Book instantly on WhatsApp",smsBook:"No Internet? SMS 'BOOK' to 1800-XXX",
    checkStatus:"Check Token Status",enterMobile:"Mobile number",checkBtn:"Check",
    s1title:"Your Mobile Number",s1otp:"Enter OTP",s1sent:"OTP sent to",s1verify:"Verify OTP",s1resend:"Resend OTP",
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
  },
  GU:{
    welcome:"UPHC માં આપનું સ્વાગત છે",tagline:"અર્બન પ્રાઇમરી હેલ્થ સેન્ટર — અમદાવાદ",
    tapSpeak:"બોલવા ટેપ કરો",describe:"તમે કેવું અનુભવો છો",bookManual:"જાતે બુક કરો",tapType:"ટેપ / ટાઇપ",
    waBook:"WhatsApp પર બુક કરો",smsBook:"ઇન્ટરનેટ નથી? SMS 'BOOK'",
    checkStatus:"ટોકન સ્ટેટસ",enterMobile:"મોબાઇલ નંબર",checkBtn:"ચેક",
    s1title:"મોબાઇલ નંબર",s1otp:"OTP દાખલ કરો",s1sent:"OTP મોકલ્યો",s1verify:"OTP ચકાસો",s1resend:"ફરી મોકલો",
    s2title:"શું તકલીફ છે?",s3title:"બુકિંગ થઈ ગઈ!",holdSpeak:"દબાવી રાખો",searchSym:"લક્ષણ શોધો…",
    tokenSent:"SMS/WhatsApp દ્વારા ટોકન",notifyMsg:"વારો આવ્યે અમે જાણ કરીશું",
    waitTime:"રાહ",mins:"મિ",callIn:"બોલાવો",noShow:"ગેરહ.",done:"પૂર્ણ",
    dashboard:"ડેશ",displayBoard:"ડિસ્પ્લે",feedback:"પ્રતિભાવ",analytics:"વિશ્ .",
    totalWait:"રાહ",avgWait:"સ.ભ",doneToday:"આજે",
    symptoms:["તાવ","ઉધ.","દુ:ખ.","ગર્ભ","રસી","અન્ય"],
    next:"આગળ →",back:"← પાછળ",listening:"સાંભળે…",processing:"AI…",
    chooseDept:"વિભાગ",printToken:"છાપો",
    navHome:"હોમ",navBook:"બુક",navChat:"ચેટ",navDash:"ડેશ",navDisplay:"ડિ.",navFeedback:"રેટ",
    rateExp:"અનુભવ",submitFeedback:"સ્વીકારો",feedbackThanks:"આભાર!",
    voiceNA:"Chrome વાપરો",install:"હોમ સ્ક્રીનમાં",installSub:"ઇન્ટ. વગર ચાલે",
  },
  HI:{
    welcome:"UPHC में आपका स्वागत है",tagline:"अर्बन प्राइमरी हेल्थ सेंटर — अहमदाबाद",
    tapSpeak:"बोलने के लिए दबाएं",describe:"अपनी तकलीफ बताएं",bookManual:"खुद बुक करें",tapType:"दबाएं / टाइप",
    waBook:"WhatsApp पर बुक करें",smsBook:"इंटरनेट नहीं? SMS 'BOOK'",
    checkStatus:"टोकन स्टेटस",enterMobile:"मोबाइल नंबर",checkBtn:"जांचें",
    s1title:"मोबाइल नंबर",s1otp:"OTP दर्ज करें",s1sent:"OTP भेजा",s1verify:"OTP सत्यापित",s1resend:"दोबारा भेजें",
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
  },
};

/* ─── ROOT APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang] = useState("EN");
  const [view, setView] = useState("home");
  const [dark, setDark] = useState(false);
  const [queue, setQueue] = useState([]);

useEffect(() => {
  const fetchQueue = async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('tokens')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });
    if (data) setQueue(data.map(t => ({
      id: t.token_number,
      name: t.patient_name || `Patient ${t.patient_mobile.slice(-4)}`,
      dept: t.department,
      raw: t.symptoms_raw || 'No complaint recorded',
      clinical: t.clinical_tags || ['Requires assessment'],
      urgency: t.urgency,
      time: new Date(t.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
      wait: t.wait_minutes,
      dbId: t.id,
      mobile: t.patient_mobile
    })));
  };

  fetchQueue();

  let subscription;
  (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    subscription = supabase
      .channel('tokens-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tokens'
      }, fetchQueue)
      .subscribe();
  })();

  return () => {
    if (subscription) subscription.unsubscribe();
  };
}, []);
  const [doneCount, setDoneCount] = useState(14);
  const t = L[lang];

  // Real-time queue heartbeat
  

  const removePatient = id => { setQueue(q=>q.filter(p=>p.id!==id)); setDoneCount(c=>c+1); };

  const D = {
    bg:    dark ? "#0B1120" : "#EEF2F7",
    card:  dark ? "#1A2537" : "#FFFFFF",
    txt:   dark ? "#E2E8F0" : "#0A1628",
    sub:   dark ? "#7A8FAA" : "#5A6C85",
    bdr:   dark ? "#2A3C55" : "#E0E7EF",
    inp:   dark ? "#232F45" : "#F8FAFC",
    btn2:  dark ? "#2A3C55" : "#EEF2F7",
  };

  return (
    <div style={{ minHeight:"100vh", background:D.bg, fontFamily:"'Noto Sans',sans-serif", transition:"background .3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .pu{animation:pu 2s ease-out infinite}
        @keyframes pu{0%{box-shadow:0 0 0 0 rgba(20,184,166,.55)}70%{box-shadow:0 0 0 22px rgba(20,184,166,0)}100%{box-shadow:0 0 0 0 rgba(20,184,166,0)}}
        .mo{animation:mo .65s ease-in-out infinite alternate}
        @keyframes mo{from{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,.5)}to{transform:scale(1.07);box-shadow:0 0 0 14px rgba(239,68,68,0)}}
        .su{animation:su .35s ease both}
        @keyframes su{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fa{animation:fa .4s ease both}
        @keyframes fa{from{opacity:0}to{opacity:1}}
        .bo{animation:bo .6s cubic-bezier(.34,1.56,.64,1) both}
        @keyframes bo{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
        .wv{animation:wv 1.3s ease-in-out infinite;display:inline-block}
        @keyframes wv{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1.3)}}
        .bl{animation:bl 1s step-end infinite}
        @keyframes bl{50%{opacity:0}}
        .cd{transition:transform .15s,box-shadow .15s}
        .cd:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.13)!important}
        button:active{transform:scale(.97)}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
        @media print{.np{display:none!important}.po{display:block!important}}
        .po{display:none}
        input,textarea{font-family:inherit}
      `}</style>

      {/* ── HEADER ── */}
      <header className="np" style={{ position:"sticky",top:0,zIndex:100,background:dark?"#0A1628":"#0D2748",boxShadow:"0 2px 12px rgba(0,0,0,.35)" }}>
        <div style={{ maxWidth:1100,margin:"0 auto",padding:"7px 12px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:7,flexShrink:0 }}>
            <div style={{ width:30,height:30,borderRadius:8,background:"#F5A623",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🏥</div>
            <span style={{ color:"#fff",fontWeight:900,fontSize:12,letterSpacing:.5 }}>UPHC</span>
          </div>
          <nav style={{ display:"flex",gap:3,flex:1,justifyContent:"center",flexWrap:"wrap" }}>
            {[["home","navHome"],["book","navBook"],["chat","navChat"],["dash","navDash"],["display","navDisplay"],["feedback","navFeedback"]].map(([v,k])=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:"4px 9px",borderRadius:6,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s",
                background:view===v?"#F5A623":"rgba(255,255,255,.1)",color:view===v?"#0D2748":"#fff" }}>{t[k]}</button>
            ))}
          </nav>
          <div style={{ display:"flex",gap:3,alignItems:"center",flexShrink:0 }}>
            {["EN","GU","HI"].map(l=>(
              <button key={l} onClick={()=>setLang(l)} style={{ padding:"3px 7px",borderRadius:5,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",
                background:lang===l?"#14B8A6":"rgba(255,255,255,.13)",color:"#fff" }}>{l}</button>
            ))}
            <button onClick={()=>setDark(d=>!d)} style={{ padding:"4px 7px",borderRadius:5,fontSize:14,border:"none",cursor:"pointer",background:"rgba(255,255,255,.13)",color:"#fff" }}>
              {dark?"☀️":"🌙"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:view==="display"?1400:view==="dash"?1100:480,margin:"0 auto",padding:"16px 12px 48px" }}>
        {view==="home"     && <HomeView     t={t} setView={setView} D={D}/>}
        {view==="book"     && <BookView     t={t} lang={lang} D={D} setView={setView}/>}
        {view==="chat"     && <ChatView     D={D}/>}
        {view==="dash"     && <DashView     t={t} queue={queue} doneCount={doneCount} removePatient={removePatient} D={D}/>}
        {view==="display"  && <DisplayBoard t={t} queue={queue} D={D}/>}
        {view==="feedback" && <FeedbackView t={t} D={D}/>}
      </main>
    </div>
  );
}

/* ─── HOME ───────────────────────────────────────────────────────────────── */
function HomeView({ t, setView, D }) {
  const [mobile, setMobile] = useState("");
  
  const [status, setStatus] = useState("");
  const [waitingCount, setWaitingCount] = useState(0);

useEffect(() => {
  const init = async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    const getCount = async () => {
      const { count } = await supabase
        .from('tokens')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');
      setWaitingCount(count || 0);
    };
    getCount();
    supabase
      .channel('home-waiting')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tokens'
      }, getCount)
      .subscribe();
  };
  init();
}, []);

  return (
    <div className="su" style={{ display:"flex",flexDirection:"column",gap:14 }}>
      {/* Hero */}
      <div style={{ borderRadius:22,padding:"26px 20px",textAlign:"center",color:"#fff",overflow:"hidden",position:"relative",background:"linear-gradient(140deg,#0D2748 0%,#1246A0 60%,#0A6B7C 100%)",boxShadow:"0 10px 30px rgba(13,39,72,.5)" }}>
        <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(245,166,35,.12)" }}/>
        <div style={{ position:"absolute",bottom:-20,left:-20,width:90,height:90,borderRadius:"50%",background:"rgba(20,184,166,.1)" }}/>
        <div style={{ fontSize:42,marginBottom:8 }}>🏥</div>
        <h1 style={{ fontSize:22,fontWeight:900,lineHeight:1.2,letterSpacing:"-.3px" }}>{t.welcome}</h1>
        <p style={{ fontSize:12,marginTop:5,opacity:.7 }}>{t.tagline}</p>
        <div style={{ display:"flex",justifyContent:"center",gap:8,marginTop:12 }}>
          <span style={{ background:"rgba(255,255,255,.15)",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600 }}>🟢 Open Now</span>
          <span style={{ background:"rgba(255,255,255,.15)",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600 }}>⏳ ~22 min avg</span>
          <span style={{ background:"rgba(255,255,255,.15)",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600 }}>👥 {waitingCount} waiting</span>
        </div>
      </div>

      {/* Dual booking */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        <button onClick={()=>setView("book")} style={{ borderRadius:20,padding:"22px 14px",background:"linear-gradient(150deg,#0D2748,#0A6B7C)",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:12,minHeight:168,boxShadow:"0 6px 18px rgba(13,39,72,.4)" }}>
          <div className="pu" style={{ width:64,height:64,borderRadius:"50%",background:"#14B8A6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28 }}>🎤</div>
          <span style={{ color:"#fff",fontWeight:900,fontSize:13,textAlign:"center" }}>{t.tapSpeak}</span>
          <span style={{ color:"rgba(255,255,255,.6)",fontSize:11,textAlign:"center",lineHeight:1.4 }}>{t.describe}</span>
        </button>
        <button onClick={()=>setView("book")} style={{ borderRadius:20,padding:"22px 14px",background:"linear-gradient(150deg,#E67A00,#F5A623)",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:12,minHeight:168,boxShadow:"0 6px 18px rgba(230,122,0,.4)" }}>
          <div style={{ width:64,height:64,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:"0 3px 10px rgba(0,0,0,.15)" }}>📋</div>
          <span style={{ color:"#0D2748",fontWeight:900,fontSize:13,textAlign:"center" }}>{t.bookManual}</span>
          <span style={{ color:"rgba(13,39,72,.6)",fontSize:11,textAlign:"center" }}>{t.tapType}</span>
        </button>
      </div>

      {/* PWA */}
      <div style={{ background:D.card,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,border:`1px solid ${D.bdr}`,boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
        <div style={{ width:36,height:36,borderRadius:10,background:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>📲</div>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700,fontSize:12,color:D.txt }}>{t.install}</p>
          <p style={{ fontSize:11,color:D.sub }}>{t.installSub}</p>
        </div>
        <button style={{ padding:"5px 12px",borderRadius:8,background:"#1246A0",color:"#fff",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",flexShrink:0 }}>Install</button>
      </div>

      {/* Offline banners */}
      <a href="#" style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,background:D.card,borderLeft:"4px solid #25D366",textDecoration:"none",boxShadow:"0 2px 8px rgba(0,0,0,.05)" }} className="cd">
        <span style={{ fontSize:22 }}>💬</span>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700,fontSize:13,color:D.txt }}>{t.waBook}</p>
          <p style={{ fontSize:11,color:D.sub }}>Message 'HI' to <b>+91-97XX-XXXXX</b></p>
        </div>
        <span style={{ color:"#25D366",fontSize:11,fontWeight:700,flexShrink:0 }}>WhatsApp ↗</span>
      </a>
      <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,background:D.card,borderLeft:"4px solid #6366F1",boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
        <span style={{ fontSize:22 }}>📱</span>
        <p style={{ fontSize:12,color:D.txt,fontWeight:600 }}>{t.smsBook}</p>
      </div>

      {/* Status check */}
      <div style={{ background:D.card,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
        <p style={{ fontWeight:700,fontSize:13,color:D.txt,marginBottom:10 }}>{t.checkStatus}</p>
        <div style={{ display:"flex",gap:8 }}>
          <div style={{ flex:1,display:"flex",alignItems:"center",border:`2px solid ${D.bdr}`,borderRadius:12,overflow:"hidden",background:D.inp }}>
            <input type="tel" maxLength={10} value={mobile} onChange={e=>setMobile(e.target.value)} placeholder={t.enterMobile}
              style={{ flex:1,padding:"10px 12px",fontSize:14,border:"none",outline:"none",background:"transparent",color:D.txt }}/>
            <span style={{ padding:"0 10px",fontSize:18,cursor:"pointer" }}>🎤</span>
          </div>
          <button onClick={()=>{ if(mobile.length>=10) setStatus("✅ Token A-42 | General OPD | ~22 mins | Waiting"); else setStatus("⚠ Enter 10-digit number"); }}
            style={{ padding:"10px 16px",borderRadius:12,background:"#0D2748",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",flexShrink:0 }}>{t.checkBtn}</button>
        </div>
        {status && <p style={{ marginTop:8,fontSize:12,fontWeight:600,color:"#065F46",background:"#D1FAE5",padding:"8px 12px",borderRadius:8 }}>{status}</p>}
      </div>
      <p style={{ textAlign:"center",fontSize:11,color:D.sub,paddingBottom:4 }}>Govt. of Gujarat · Free Healthcare · 24×7 Helpline: 104</p>
    </div>
  );
}

/* ─── BOOKING FLOW ───────────────────────────────────────────────────────── */
function BookView({ t, lang, D, setView }) {
  const [step, setStep] = useState(0);
  const [dept, setDept] = useState(null);
  const [mobile, setMobile] = useState("");
  const [patientName, setPatientName] = useState("");
  const [otp, setOtp] = useState(["","","","","",""]);
  const [otpErr, setOtpErr] = useState("");
  const [vState, setVState] = useState("idle"); // idle|listening|done
  const [transcript, setTranscript] = useState("");
  const [nlp, setNlp] = useState(null);
  const [nlpLoad, setNlpLoad] = useState(false);
  const [selSym, setSelSym] = useState([]);
  const [search, setSearch] = useState("");
  const recRef = useRef(null);
  const otpRef = useRef([]);
  const tokenNum = useRef("A-"+Math.floor(Math.random()*20+43));

  const steps = ["Dept","Mobile","OTP","Symptoms","Done"];

  const sendOTP = () => {
  setOtpErr("");
  setStep(2);
};

  const verifyOTP = () => {
  setOtpErr("");
  if (otp.join('') === '123456') {
    setStep(3);
  } else {
    setOtpErr("Incorrect OTP. Please use 123456");
  }
};

  const handleOtp = (i, v) => {
    if (!/^[0-9]?$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 5) otpRef.current[i+1]?.focus();
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert(t.voiceNA); return; }
    const r = new SR();
    r.lang = lang==="HI"?"hi-IN":lang==="GU"?"gu-IN":"en-IN";
    r.interimResults = true;
    r.onresult = e => setTranscript(Array.from(e.results).map(x=>x[0].transcript).join(""));
    r.onend = () => { setVState("done"); };
    r.start(); recRef.current = r; setVState("listening");
  };
  const stopVoice = () => { recRef.current?.stop(); };

  useEffect(() => {
    if (vState === "done" && transcript) {
      setNlpLoad(true);
      extractSymptomsAI(transcript, lang).then(r => { setNlp(r); setNlpLoad(false); });
    }
  }, [vState]);

  const pickSym = async sym => {
    const next = selSym.includes(sym) ? selSym.filter(x=>x!==sym) : [...selSym, sym];
    setSelSym(next);
    if (!nlp && next.length > 0) {
      setNlpLoad(true);
      const r = await extractSymptomsAI(next.join(", "), lang);
      setNlp(r); setNlpLoad(false);
    }
  };

  const bookToken = async () => {
  if (!canNext) return;
  try {
    const res = await fetch('/api/book-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  mobile,
  patient_name: patientName,
  department: dept?.label || 'General OPD',
  symptoms_raw: transcript || selSym.join(', '),
  clinical_tags: nlp?.clinical_tags || selSym,
  urgency: nlp?.urgency || 'yellow'
})
    });
    const data = await res.json();
    if (data.success) {
      tokenNum.current = data.token.token_number;
      setStep(4);
    } else {
      alert('Booking failed. Please try again.');
    }
  } catch {
    alert('Network error. Please try again.');
  }
};
  const canNext = nlp || selSym.length > 0;
  const urgColor = { red:"#DC2626", yellow:"#D97706", green:"#059669" }[nlp?.urgency] || "#D97706";

  const reset = () => { setStep(0);setDept(null);setMobile("");setOtp(["","","","","",""]);setVState("idle");setTranscript("");setNlp(null);setSelSym([]);setSearch(""); };

  return (
    <div className="su">
      {/* Progress bar */}
      <div style={{ display:"flex",gap:4,marginBottom:22,alignItems:"center" }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:"center",flex:1,gap:4 }}>
            <div style={{ width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,transition:"all .3s",
              background:i<step?"#14B8A6":i===step?"#0D2748":"#CBD5E1",color:i<=step?"#F5A623":"#fff" }}>
              {i < step ? "✓" : i+1}
            </div>
            <div style={{ height:3,width:"100%",borderRadius:2,transition:"background .3s",background:i<step?"#14B8A6":i===step?"#F5A623":"#E2E8F0" }}/>
            <span style={{ fontSize:8,color:D.sub,textAlign:"center",lineHeight:1 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* STEP 0 — Department */}
      {step===0&&(
        <div className="fa">
          <h2 style={{ fontSize:18,fontWeight:900,color:D.txt,marginBottom:16 }}>{t.chooseDept}</h2>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {DEPTS.map(d=>(
              <button key={d.id} onClick={()=>{setDept(d);setStep(1);}} style={{ padding:"18px 12px",borderRadius:16,border:`2px solid ${dept?.id===d.id?d.color:D.bdr}`,background:dept?.id===d.id?`${d.color}18`:D.card,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:7,transition:"all .15s" }} className="cd">
                <span style={{ fontSize:30 }}>{d.icon}</span>
                <span style={{ fontSize:12,fontWeight:700,color:D.txt,textAlign:"center" }}>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1 — Mobile */}
      {step===1&&(
        <div className="fa" style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:D.txt }}>{t.s1title}</h2>
          <div style={{ background:D.card,borderRadius:18,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,.05)",marginBottom:14 }}>
  <label style={{ display:"block",fontSize:13,fontWeight:700,color:D.txt,marginBottom:8 }}>
    👤 Full Name
  </label>
  <input
    type="text"
    value={patientName}
    onChange={e => setPatientName(e.target.value)}
    placeholder="Enter your full name"
    style={{ width:"100%",padding:"12px 14px",fontSize:15,fontWeight:600,border:`2px solid ${patientName ? '#14B8A6' : D.bdr}`,borderRadius:12,outline:"none",background:D.inp,color:D.txt,transition:"border-color .2s" }}
  />
</div>
          <div style={{ background:D.card,borderRadius:18,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex",alignItems:"center",border:`2px solid ${mobile?'#14B8A6':D.bdr}`,borderRadius:14,overflow:"hidden",marginBottom:14,background:D.inp,transition:"border-color .2s" }}>
              <span style={{ padding:"0 12px",fontSize:13,color:D.sub,fontWeight:600,borderRight:`2px solid ${D.bdr}`,alignSelf:"stretch",display:"flex",alignItems:"center" }}>+91</span>
              <input type="tel" maxLength={10} value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="XXXXX XXXXX"
                style={{ flex:1,padding:"14px 12px",fontSize:20,fontWeight:700,letterSpacing:3,border:"none",outline:"none",background:"transparent",color:D.txt }}/>
              <span style={{ padding:"0 12px",fontSize:22,cursor:"pointer" }}>🎤</span>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
              {[1,2,3,4,5,6,7,8,9,"*",0,"⌫"].map(d=>(
                <button key={d} onClick={()=>{ if(d==="⌫")setMobile(m=>m.slice(0,-1)); else if(mobile.length<10)setMobile(m=>m+d); }}
                  style={{ padding:"13px 0",borderRadius:10,fontSize:18,fontWeight:700,background:D.btn2,color:D.txt,border:"none",cursor:"pointer" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(0)} style={{ flex:1,padding:"13px",borderRadius:14,background:D.btn2,color:D.txt,fontWeight:700,border:"none",cursor:"pointer" }}>{t.back}</button>
            <button onClick={()=>{ if(mobile.length>=10 && patientName.trim()){sendOTP();} }} style={{ flex:2,padding:"13px",borderRadius:14,background:(mobile.length>=10&&patientName.trim())?"#0D2748":"#CBD5E1",color:"#fff",fontWeight:900,border:"none",cursor:"pointer",fontSize:15 }}>{t.next}</button>
          </div>
        </div>
      )}

      {/* STEP 2 — OTP */}
      {step===2&&(
        <div className="fa" style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:D.txt }}>{t.s1otp}</h2>
          <div style={{ background:D.card,borderRadius:18,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.05)",textAlign:"center" }}>
            <div style={{ width:52,height:52,borderRadius:"50%",background:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 12px" }}>📱</div>
            <p style={{ fontSize:13,color:D.sub,marginBottom:6 }}>{t.s1sent} <b style={{ color:D.txt }}>+91-{mobile}</b></p>
            <p style={{ fontSize:11,color:"#F59E0B",marginBottom:18,fontWeight:600 }}>Demo OTP: 1 2 3 4 5 6</p>
            <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:14 }}>
              {otp.map((v,i)=>(
                <input key={i} ref={el=>otpRef.current[i]=el} type="tel" maxLength={1} value={v}
                  onChange={e=>handleOtp(i,e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Backspace"&&!v&&i>0)otpRef.current[i-1]?.focus(); }}
                  style={{ width:46,height:54,textAlign:"center",fontSize:22,fontWeight:700,borderRadius:12,border:`2px solid ${v?"#14B8A6":D.bdr}`,outline:"none",color:D.txt,background:D.inp,transition:"border-color .2s" }}/>
              ))}
            </div>
            {otpErr&&<p style={{ color:"#DC2626",fontSize:12,marginBottom:10 }}>{otpErr}</p>}
            <button onClick={()=>setStep(1)} style={{ fontSize:12,color:"#3B82F6",background:"none",border:"none",cursor:"pointer" }}>{t.s1resend}</button>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(1)} style={{ flex:1,padding:"13px",borderRadius:14,background:D.btn2,color:D.txt,fontWeight:700,border:"none",cursor:"pointer" }}>{t.back}</button>
            <button onClick={verifyOTP} style={{ flex:2,padding:"13px",borderRadius:14,background:"#0D2748",color:"#fff",fontWeight:900,border:"none",cursor:"pointer",fontSize:15 }}>{t.s1verify}</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Symptoms */}
      {step===3&&(
        <div className="fa" style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:D.txt }}>{t.s2title}</h2>

          {/* Voice Panel */}
          <div style={{ background:D.card,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}>
              <button onMouseDown={startVoice} onMouseUp={stopVoice} onTouchStart={startVoice} onTouchEnd={stopVoice}
                className={vState==="listening"?"mo":vState==="idle"?"pu":""}
                style={{ width:76,height:76,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,border:"none",cursor:"pointer",
                  background:vState==="listening"?"#EF4444":vState==="done"?"#14B8A6":"#0D2748",color:"#fff",boxShadow:"0 4px 18px rgba(0,0,0,.2)" }}>
                {vState==="listening"?"⏹":vState==="done"?"✓":"🎤"}
              </button>
              <p style={{ fontSize:12,fontWeight:700,color:vState==="listening"?"#EF4444":vState==="done"?"#14B8A6":D.sub }}>
                {vState==="idle"?t.holdSpeak:vState==="listening"?t.listening:t.processing}
              </p>
              {vState==="listening"&&(
                <div style={{ display:"flex",gap:3,alignItems:"flex-end",height:32 }}>
                  {Array.from({length:14}).map((_,i)=>(
                    <div key={i} className="wv" style={{ width:3,borderRadius:2,background:"#EF4444",animationDelay:`${i*.09}s`,height:`${10+Math.random()*14}px` }}/>
                  ))}
                </div>
              )}
              {transcript&&<p style={{ fontSize:13,fontStyle:"italic",color:D.txt,textAlign:"center",padding:"8px 12px",background:D.inp,borderRadius:10,width:"100%",lineHeight:1.5 }}>"{transcript}"</p>}
            </div>

            {/* NLP Demo */}
            {!transcript&&vState==="idle"&&(
              <div style={{ marginTop:14,padding:12,borderRadius:12,background:D.inp,border:`1px solid ${D.bdr}` }}>
                <p style={{ fontSize:10,fontWeight:700,color:D.sub,textTransform:"uppercase",marginBottom:6 }}>AI Example — How it works</p>
                <p style={{ fontSize:12,fontStyle:"italic",color:D.txt,marginBottom:8 }}>"My head is spinning and I feel like throwing up"</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6,alignItems:"center" }}>
                  <span style={{ fontSize:10,color:D.sub }}>Clinical tags →</span>
                  {["Vertigo","Nausea"].map(tag=><span key={tag} style={{ padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,color:"#fff",background:"#0D2748" }}>[{tag}]</span>)}
                </div>
              </div>
            )}

            {nlpLoad&&<div style={{ textAlign:"center",padding:16,color:D.sub,fontSize:13 }}>🤖 {t.processing}</div>}
            {nlp&&!nlpLoad&&(
              <div className="fa" style={{ marginTop:12,padding:12,borderRadius:12,border:`2px solid ${urgColor}`,background:`${urgColor}12` }}>
                <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8 }}>
                  <span style={{ fontSize:10,fontWeight:700,color:"#fff",background:urgColor,padding:"2px 10px",borderRadius:20 }}>{nlp.urgency?.toUpperCase()}</span>
                  <span style={{ fontSize:12,color:D.txt,fontWeight:600 }}>→ {nlp.department}</span>
                </div>
                <p style={{ fontSize:12,color:D.sub,marginBottom:8 }}>{nlp.summary}</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                  {nlp.clinical_tags?.map(tag=><span key={tag} style={{ padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,color:"#fff",background:"#0D2748" }}>[{tag}]</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Manual */}
          <div style={{ background:D.card,borderRadius:18,padding:16,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,border:`2px solid ${D.bdr}`,borderRadius:12,padding:"8px 12px",marginBottom:12,background:D.inp }}>
              <span style={{ color:D.sub,fontSize:16 }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.searchSym}
                style={{ flex:1,fontSize:13,border:"none",outline:"none",background:"transparent",color:D.txt }}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
              {t.symptoms.map((s,i)=>(
                <button key={s} onClick={()=>pickSym(s)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"14px 8px",borderRadius:12,
                  border:`2px solid ${selSym.includes(s)?"#14B8A6":D.bdr}`,background:selSym.includes(s)?(D.inp):D.card,cursor:"pointer",transition:"all .15s" }}>
                  <span style={{ fontSize:24 }}>{SYM_ICONS[i]}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:D.txt,textAlign:"center" }}>{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(2)} style={{ flex:1,padding:"13px",borderRadius:14,background:D.btn2,color:D.txt,fontWeight:700,border:"none",cursor:"pointer" }}>{t.back}</button>
            <button onClick={bookToken} style={{ flex:2,padding:"13px",borderRadius:14,background:canNext?"#0D2748":"#CBD5E1",color:"#fff",fontWeight:900,border:"none",cursor:"pointer",fontSize:15 }}>{t.next}</button>
          </div>
        </div>
      )}

      {/* STEP 4 — Success */}
      {step===4&&(
        <div className="fa" style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:16,textAlign:"center" }}>
          <div style={{ width:58,height:58,borderRadius:"50%",background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28 }}>✅</div>
          <h2 style={{ fontSize:22,fontWeight:900,color:D.txt }}>{t.s3title}</h2>

          {/* Token Card — printable */}
          <div className="bo" id="print-token" style={{ borderRadius:24,padding:"28px 22px",background:"linear-gradient(140deg,#0D2748,#1246A0)",color:"#fff",width:"100%",boxShadow:"0 10px 30px rgba(13,39,72,.5)" }}>
            <p style={{ fontSize:10,opacity:.6,letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>UPHC · {dept?.label||"General OPD"} · {new Date().toLocaleDateString("en-IN")}</p>
            <div style={{ fontSize:76,fontWeight:900,color:"#F5A623",lineHeight:1,letterSpacing:"-2px" }}>{tokenNum.current}</div>
            <div style={{ display:"flex",justifyContent:"center",gap:20,marginTop:16 }}>
              {[{l:t.waitTime,v:"22 "+t.mins,c:"#14B8A6"},{l:"Counter",v:"OPD 3",c:"#fff"},{l:"Doctor",v:"Dr. Shah",c:"#fff"}].map((x,i)=>(
                <div key={i} style={{ flex:1,borderRight:i<2?"1px solid rgba(255,255,255,.15)":"none" }}>
                  <p style={{ fontSize:10,opacity:.6,marginBottom:2 }}>{x.l}</p>
                  <p style={{ fontSize:16,fontWeight:900,color:x.c }}>{x.v}</p>
                </div>
              ))}
            </div>
            {/* QR code SVG */}
            <svg width="80" height="80" style={{ margin:"16px auto 0",display:"block",background:"#fff",borderRadius:8,padding:8 }} viewBox="0 0 7 7">
              {[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],[0,4],[0,5],[0,6],[1,4],[2,4],[2,5],[2,6],[4,4],[6,4],[4,5],[5,6],[3,3],[3,0],[3,2]].map(([x,y],i)=>(
                <rect key={i} x={x} y={y} width={1} height={1} fill="#0D2748"/>
              ))}
            </svg>
            <p style={{ fontSize:9,opacity:.5,marginTop:6 }}>Scan or show at counter · Token valid today only</p>
          </div>

          <div style={{ background:"#D1FAE5",borderRadius:14,padding:"12px 16px",width:"100%",border:"1px solid #6EE7B7" }}>
            <p style={{ fontWeight:700,fontSize:13,color:"#065F46" }}>📲 {t.tokenSent}</p>
            <p style={{ fontSize:11,color:"#047857",marginTop:4 }}>{t.notifyMsg}</p>
          </div>

          <div style={{ display:"flex",gap:10,width:"100%" }}>
            <button onClick={()=>window.print()} style={{ flex:1,padding:"12px",borderRadius:14,background:"#EFF6FF",color:"#1246A0",fontWeight:700,fontSize:13,border:"2px solid #BFDBFE",cursor:"pointer" }}>🖨 {t.printToken}</button>
            <button onClick={()=>window.alert("SMS sent to +91-"+mobile)} style={{ flex:1,padding:"12px",borderRadius:14,background:"#25D366",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer" }}>💬 Share</button>
          </div>
          <button onClick={reset} style={{ width:"100%",padding:"14px",borderRadius:16,background:"#0D2748",color:"#fff",fontWeight:900,fontSize:15,border:"none",cursor:"pointer",boxShadow:"0 4px 16px rgba(13,39,72,.3)" }}>
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
    {f:"bot",m:"🏥 *Welcome to UPHC Queue Bot!*\n\nDescribe your problem or reply:\n*1* Fever  *2* Cough  *3* Stomach\n*4* Pregnancy  *5* Vaccine  *6* Other",t:"9:30"},
    {f:"usr",m:"Pet dukhe che",t:"9:31"},
    {f:"bot",m:"🤖 *Understood: Stomach Ache*\n\n✅ Token: *A-42*  ⏳ ~22 mins\n🏥 Counter: *OPD 3*  👨‍⚕️ Dr. Shah\n\nWe'll WhatsApp you when near 📲",t:"9:31"},
    {f:"usr",m:"Ok, shukriya",t:"9:32"},
    {f:"bot",m:"📢 *UPHC Alert — Token A-42*\n10 mins to go. Please be ready at OPD Counter 3. 🙏",t:"9:51"},
  ];

  return (
    <div className="su" style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <h2 style={{ textAlign:"center",fontSize:18,fontWeight:900,color:D.txt }}>Offline Booking — Mockups</h2>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        {/* WhatsApp */}
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
          <p style={{ fontSize:10,fontWeight:700,color:D.sub,textTransform:"uppercase",letterSpacing:1 }}>WhatsApp Bot</p>
          <div style={{ width:"100%",maxWidth:230,borderRadius:22,overflow:"hidden",boxShadow:"0 10px 28px rgba(0,0,0,.22)",background:"#1A1A2E",border:"5px solid #1A1A2E" }}>
            <div style={{ display:"flex",justifyContent:"space-between",padding:"5px 12px",color:"#fff",fontSize:9 }}><span>9:51</span><span>📶 🔋</span></div>
            <div style={{ background:"#075E54",display:"flex",alignItems:"center",gap:8,padding:"8px 10px" }}>
              <div style={{ width:30,height:30,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>🏥</div>
              <div><p style={{ color:"#fff",fontWeight:700,fontSize:11 }}>UPHC Health Bot</p><p style={{ color:"rgba(255,255,255,.65)",fontSize:9 }}>🟢 Online</p></div>
            </div>
            <div style={{ background:"#ECE5DD",padding:"8px 6px",minHeight:280,display:"flex",flexDirection:"column",gap:5 }}>
              {msgs.map((m,i)=>(
                <div key={i} style={{ display:"flex",justifyContent:m.f==="usr"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"88%",borderRadius:9,padding:"6px 8px",background:m.f==="usr"?"#DCF8C6":"#fff",boxShadow:"0 1px 2px rgba(0,0,0,.08)" }}>
                    <p style={{ fontSize:9,whiteSpace:"pre-wrap",color:"#111",lineHeight:1.45 }} dangerouslySetInnerHTML={{__html:m.m.replace(/\*(.*?)\*/g,"<b>$1</b>")}}/>
                    <p style={{ fontSize:7,textAlign:"right",color:"#777",marginTop:2 }}>{m.t} ✓✓</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex",gap:5,padding:"6px 7px",background:"#F0F0F0" }}>
              <div style={{ flex:1,background:"#fff",borderRadius:18,padding:"5px 9px",fontSize:9,color:"#888" }}>Type a message...</div>
              <div style={{ width:26,height:26,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>🎤</div>
            </div>
          </div>
        </div>
        {/* SMS */}
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
          <p style={{ fontSize:10,fontWeight:700,color:D.sub,textTransform:"uppercase",letterSpacing:1 }}>SMS — Feature Phone</p>
          <div style={{ width:"100%",maxWidth:170,borderRadius:18,overflow:"hidden",boxShadow:"0 10px 24px rgba(0,0,0,.22)",background:"#2D2D2D",border:"6px solid #2D2D2D" }}>
            <div style={{ background:"#9BA888",padding:"10px 8px",minHeight:155 }}>
              <p style={{ fontSize:9,fontFamily:"monospace",color:"#2D4A0E",lineHeight:1.7 }}>
                <b>📩 New Message</b><br/>From: UPHC-104<br/>──────────────<br/><b>UPHC ALERT: Token A-42. OPD Counter 3 in 30 mins. Helpline: 104</b>
              </p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,padding:5,background:"#333" }}>
              {[1,2,3,4,5,6,7,8,9,"*",0,"#"].map(k=>(
                <div key={k} style={{ padding:"7px 0",textAlign:"center",fontSize:11,fontWeight:700,color:"#fff",background:"#444",borderRadius:3 }}>{k}</div>
              ))}
            </div>
          </div>
          <div style={{ background:D.card,borderRadius:10,padding:"10px 12px",width:"100%",border:`1px solid ${D.bdr}` }}>
            <p style={{ fontSize:11,fontWeight:700,color:D.txt }}>📡 SMS Integration</p>
            <p style={{ fontSize:10,color:D.sub,marginTop:3 }}>Works on any phone. Zero internet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── STAFF DASHBOARD ────────────────────────────────────────────────────── */
function DashView({ t, queue, doneCount, removePatient, D }) {
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("queue");

  const stats = {
    waiting: queue.length,
    urgent:  queue.filter(p=>p.urgency==="red").length,
    avg:     Math.round(queue.reduce((s,p)=>s+p.wait,0)/Math.max(queue.length,1)),
  };

  const hourly = [{l:"8-9",n:12},{l:"9-10",n:19},{l:"10-11",n:24},{l:"11-12",n:20},{l:"12-1",n:9},{l:"1-2",n:6}];
  const maxH = Math.max(...hourly.map(d=>d.n));
  const deptDist = [{d:"General OPD",n:14,c:"#1246A0"},{d:"Maternity",n:3,c:"#7C3AED"},{d:"Vaccination",n:5,c:"#059669"},{d:"Dental",n:2,c:"#D97706"},{d:"Eye/ENT",n:1,c:"#0891B2"}];
  const total = deptDist.reduce((s,d)=>s+d.n,0);

  const filtered = filter==="all" ? queue : queue.filter(p=>p.urgency===filter);

  return (
    <div className="su">
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontSize:22,fontWeight:900,color:D.txt }}>{t.dashboard}</h2>
          <p style={{ fontSize:12,color:D.sub }}><span className="bl" style={{ color:"#EF4444" }}>●</span> LIVE · auto-refreshing</p>
        </div>
        <div style={{ display:"flex",gap:6 }}>
          {[["queue","🗂 Queue"],["analytics","📊 Analytics"]].map(([tb,lb])=>(
            <button key={tb} onClick={()=>setTab(tb)} style={{ padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",
              background:tab===tb?"#0D2748":D.btn2,color:tab===tb?"#F5A623":D.txt }}>{lb}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16 }}>
        {[{l:t.totalWait,v:stats.waiting,c:"#1246A0",bg:"#EFF6FF"},{l:"Urgent",v:stats.urgent,c:"#DC2626",bg:"#FFF5F5"},{l:t.avgWait+" (min)",v:stats.avg,c:"#D97706",bg:"#FFFBEB"},{l:t.doneToday,v:doneCount,c:"#059669",bg:"#F0FFF4"}].map(s=>(
          <div key={s.l} style={{ background:D.card,borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,.05)",border:`2px solid ${s.bg}` }}>
            <p style={{ fontSize:26,fontWeight:900,color:s.c,lineHeight:1 }}>{s.v}</p>
            <p style={{ fontSize:10,color:D.sub,fontWeight:600,marginTop:4,lineHeight:1.3 }}>{s.l}</p>
          </div>
        ))}
      </div>

      {tab==="queue"&&(
        <>
          <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap" }}>
            {[["all","All","#0D2748"],["red","🚨 Urgent","#DC2626"],["yellow","⚡ Standard","#D97706"],["green","✅ Routine","#059669"]].map(([f,l,c])=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",
                background:filter===f?c:D.btn2,color:filter===f?"#fff":D.txt }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12 }}>
            {filtered.map(p=>{
              const tc = TC[p.urgency];
              return (
                <div key={p.id} className="cd" style={{ borderRadius:16,padding:16,borderLeft:`4px solid ${tc.border}`,background:D.card,boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                    <div style={{ display:"flex",gap:7,alignItems:"center",flexWrap:"wrap" }}>
                      <span style={{ fontSize:17,fontWeight:900,color:D.txt }}>{p.id}</span>
                      <span style={{ padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,color:"#fff",background:tc.badge }}>{tc.label}</span>
                      <span style={{ padding:"2px 6px",borderRadius:6,fontSize:9,color:D.sub,background:D.btn2 }}>{p.dept}</span>
                    </div>
                    <span style={{ fontSize:11,color:D.sub,fontWeight:700,flexShrink:0 }}>⏳{p.wait}m</span>
                  </div>
                  <p style={{ fontSize:11,color:D.sub,marginBottom:7 }}>{p.name} · {p.time}</p>
                  <div style={{ background:D.inp,borderRadius:8,padding:"8px 10px",marginBottom:8 }}>
                    <p style={{ fontSize:9,color:D.sub,fontWeight:700,textTransform:"uppercase",marginBottom:3 }}>Patient's words</p>
                    <p style={{ fontSize:12,fontStyle:"italic",color:D.txt,lineHeight:1.4 }}>"{p.raw}"</p>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <p style={{ fontSize:9,color:D.sub,fontWeight:700,textTransform:"uppercase",marginBottom:5 }}>AI Clinical Tags</p>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                      {p.clinical.map(c=><span key={c} style={{ padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,color:"#fff",background:"#0D2748" }}>{c}</span>)}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:6 }}>
                    <button style={{ flex:2,padding:"8px",borderRadius:10,background:"#0D2748",color:"#fff",fontSize:11,fontWeight:700,border:"none",cursor:"pointer" }}>📢 {t.callIn}</button>
                    <button onClick={()=>removePatient(p.id)} style={{ flex:1,padding:"8px",borderRadius:10,background:D.btn2,color:D.sub,fontSize:11,fontWeight:700,border:"none",cursor:"pointer" }}>🚫 {t.noShow}</button>
                    <button onClick={()=>removePatient(p.id)} style={{ padding:"8px 10px",borderRadius:10,background:"#22C55E",color:"#fff",fontSize:14,border:"none",cursor:"pointer" }}>✅</button>
                  </div>
                </div>
              );
            })}
            {!filtered.length&&<div style={{ gridColumn:"1/-1",textAlign:"center",padding:"48px 0",color:D.sub }}><p style={{ fontSize:36 }}>🎉</p><p style={{ fontWeight:700,marginTop:8 }}>Queue is clear!</p></div>}
          </div>
        </>
      )}

      {tab==="analytics"&&(
        <div className="fa" style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <div style={{ background:D.card,borderRadius:18,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <h3 style={{ fontSize:14,fontWeight:700,color:D.txt,marginBottom:16 }}>Patients per Hour — Today</h3>
            <div style={{ display:"flex",alignItems:"flex-end",gap:8,height:110 }}>
              {hourly.map(d=>(
                <div key={d.l} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                  <span style={{ fontSize:10,fontWeight:700,color:D.txt }}>{d.n}</span>
                  <div style={{ width:"100%",borderRadius:"4px 4px 0 0",background:"linear-gradient(to top,#0D2748,#1246A0)",height:`${(d.n/maxH)*80}px`,minHeight:4,transition:"height .4s" }}/>
                  <span style={{ fontSize:9,color:D.sub,textAlign:"center" }}>{d.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:D.card,borderRadius:18,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <h3 style={{ fontSize:14,fontWeight:700,color:D.txt,marginBottom:14 }}>Department Distribution</h3>
            {deptDist.map(d=>(
              <div key={d.d} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                <span style={{ fontSize:11,color:D.txt,width:110,flexShrink:0 }}>{d.d}</span>
                <div style={{ flex:1,height:12,borderRadius:6,background:D.btn2,overflow:"hidden" }}>
                  <div style={{ height:"100%",borderRadius:6,background:d.c,width:`${(d.n/total)*100}%`,transition:"width .6s" }}/>
                </div>
                <span style={{ fontSize:11,fontWeight:700,color:D.txt,width:22,textAlign:"right" }}>{d.n}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
            {[{i:"⏰",l:"Peak Hour",v:"10–11 AM"},{i:"😊",l:"Satisfaction",v:"4.6 / 5 ⭐"},{i:"🚫",l:"No-shows",v:"3 today"},{i:"📊",l:"Avg Daily",v:"89 patients"},{i:"💊",l:"Top Diagnosis",v:"Fever"},{i:"⚡",l:"Urgent Cases",v:"12%"}].map(m=>(
              <div key={m.l} style={{ background:D.card,borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                <p style={{ fontSize:22 }}>{m.i}</p>
                <p style={{ fontSize:14,fontWeight:900,color:D.txt,marginTop:4 }}>{m.v}</p>
                <p style={{ fontSize:10,color:D.sub,marginTop:2 }}>{m.l}</p>
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
  useEffect(()=>{ const i=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(i); },[]);

  const serving = queue.filter(p=>p.urgency==="red").slice(0,2);
  const upcoming = queue.filter(p=>p.urgency!=="red").slice(0,6);

  return (
    <div style={{ background:"#04101E",minHeight:"82vh",borderRadius:22,padding:28,color:"#fff",fontFamily:"'Noto Sans',monospace" }}>
      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,borderBottom:"1px solid rgba(255,255,255,.08)",paddingBottom:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ fontSize:44 }}>🏥</div>
          <div>
            <h1 style={{ fontSize:30,fontWeight:900,color:"#F5A623",letterSpacing:"-.5px" }}>UPHC Ahmedabad</h1>
            <p style={{ fontSize:13,opacity:.6,marginTop:2 }}>Urban Primary Health Centre — Live Queue Display</p>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ fontSize:40,fontWeight:900,color:"#14B8A6",fontVariantNumeric:"tabular-nums",lineHeight:1 }}>
            {time.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
          </p>
          <p style={{ fontSize:12,opacity:.5,marginTop:4 }}>{time.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1.3fr",gap:24 }}>
        {/* Now Serving */}
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
            <div className="bl" style={{ width:10,height:10,borderRadius:"50%",background:"#EF4444" }}/>
            <p style={{ fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#F87171" }}>Now Serving</p>
          </div>
          {serving.length===0 && <div style={{ background:"rgba(255,255,255,.05)",borderRadius:16,padding:24,textAlign:"center",fontSize:13,opacity:.4 }}>No urgent patients</div>}
          {serving.map(p=>(
            <div key={p.id} style={{ borderRadius:18,padding:22,background:"linear-gradient(135deg,#7F1D1D,#991B1B)",marginBottom:14,border:"1px solid #F87171",boxShadow:"0 4px 20px rgba(239,68,68,.2)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:56,fontWeight:900,color:"#FCA5A5",lineHeight:1,letterSpacing:"-1px" }}>{p.id}</span>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:18,fontWeight:700 }}>{p.dept}</p>
                  <p style={{ fontSize:13,opacity:.65,marginTop:4 }}>Counter: OPD {Math.floor(Math.abs(p.id.replace(/\D/g,"")%3))+1}</p>
                </div>
              </div>
              <div style={{ marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.1)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <p style={{ fontSize:12,opacity:.65 }}>{p.name}</p>
                <span style={{ fontSize:11,background:"rgba(255,255,255,.1)",padding:"3px 10px",borderRadius:20 }}>Dr. Shah</span>
              </div>
            </div>
          ))}

          {/* Stats row */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8 }}>
            {[{l:"Total Waiting",v:queue.length,c:"#14B8A6"},{l:"Avg Wait",v:Math.round(queue.reduce((s,p)=>s+p.wait,0)/Math.max(queue.length,1))+" min",c:"#F5A623"}].map(s=>(
              <div key={s.l} style={{ borderRadius:12,padding:"12px 14px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)" }}>
                <p style={{ fontSize:22,fontWeight:900,color:s.c,lineHeight:1 }}>{s.v}</p>
                <p style={{ fontSize:10,opacity:.5,marginTop:4 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Up */}
        <div>
          <p style={{ fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#64748B",marginBottom:14 }}>Next Tokens</p>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {upcoming.map((p,i)=>{
              const tc = TC[p.urgency];
              return (
                <div key={p.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,.05)",borderRadius:14,padding:"14px 18px",borderLeft:`3px solid ${tc.border}`,transition:"opacity .3s",opacity:1-i*.1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                    <span style={{ fontSize:26,fontWeight:900,color:"#F1F5F9",letterSpacing:"-.5px",minWidth:60 }}>{p.id}</span>
                    <div>
                      <p style={{ fontSize:14,fontWeight:600 }}>{p.dept}</p>
                      <p style={{ fontSize:11,opacity:.5,marginTop:2 }}>{p.name}</p>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:16,fontWeight:700,color:"#14B8A6" }}>~{p.wait} min</p>
                    <span style={{ fontSize:9,background:tc.badge,color:"#fff",padding:"2px 8px",borderRadius:20,fontWeight:700,marginTop:4,display:"inline-block" }}>{tc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer ticker */}
      <div style={{ marginTop:24,borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
        <p style={{ fontSize:11,opacity:.4 }}>🟢 System Active · Govt. of Gujarat · Free Primary Healthcare</p>
        <p style={{ fontSize:11,opacity:.4 }}>24×7 Helpline: <span style={{ color:"#F5A623",fontWeight:700 }}>104</span></p>
        <div style={{ display:"flex",gap:5 }}>
          {[...Array(5)].map((_,i)=><div key={i} style={{ width:7,height:7,borderRadius:"50%",background:i<3?"#14B8A6":"rgba(255,255,255,.15)" }}/>)}
        </div>
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

  if (done) return (
    <div className="fa" style={{ textAlign:"center",padding:"48px 20px" }}>
      <div style={{ fontSize:72 }}>🙏</div>
      <h2 style={{ fontSize:24,fontWeight:900,color:D.txt,marginTop:12 }}>{t.feedbackThanks}</h2>
      <p style={{ color:D.sub,fontSize:14,marginTop:8 }}>Your feedback helps us improve care for everyone in the community.</p>
      <div style={{ background:"linear-gradient(140deg,#0D2748,#1246A0)",borderRadius:18,padding:22,color:"#fff",display:"inline-block",marginTop:20,minWidth:200 }}>
        <p style={{ fontSize:40,fontWeight:900,color:"#F5A623",lineHeight:1 }}>{"⭐".repeat(rating)}</p>
        <p style={{ fontSize:18,fontWeight:700,marginTop:8 }}>{labels[rating]}</p>
        <p style={{ fontSize:11,opacity:.6,marginTop:4 }}>Your rating · Today</p>
      </div>
      {aspects.length>0&&(
        <div style={{ marginTop:16,display:"flex",justifyContent:"center",flexWrap:"wrap",gap:8 }}>
          {aspects.map(a=><span key={a} style={{ padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:600,background:"#D1FAE5",color:"#065F46" }}>✓ {a}</span>)}
        </div>
      )}
    </div>
  );

  return (
    <div className="su" style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <h2 style={{ fontSize:20,fontWeight:900,color:D.txt }}>{t.rateExp}</h2>

      {/* Stars */}
      <div style={{ background:D.card,borderRadius:18,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.05)",textAlign:"center" }}>
        <p style={{ fontSize:13,color:D.sub,marginBottom:18 }}>How was your visit today at UPHC?</p>
        <div style={{ display:"flex",justifyContent:"center",gap:6,marginBottom:10 }}>
          {[1,2,3,4,5].map(s=>(
            <button key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(s)}
              style={{ fontSize:42,background:"none",border:"none",cursor:"pointer",transition:"transform .12s,filter .12s",
                transform:(hover||rating)>=s?"scale(1.22)":"scale(1)",filter:(hover||rating)>=s?"none":"grayscale(1) opacity(.35)" }}>⭐</button>
          ))}
        </div>
        <p style={{ fontSize:15,fontWeight:700,color:"#F59E0B",minHeight:24 }}>{labels[hover||rating]}</p>
      </div>

      {/* Aspects */}
      <div style={{ background:D.card,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
        <p style={{ fontSize:13,fontWeight:700,color:D.txt,marginBottom:12 }}>What went well? <span style={{ fontSize:11,color:D.sub,fontWeight:400 }}>(select all that apply)</span></p>
        <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
          {aspectList.map(a=>{
            const sel = aspects.includes(a);
            return (
              <button key={a} onClick={()=>setAspects(prev=>sel?prev.filter(x=>x!==a):[...prev,a])} style={{ padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",transition:"all .15s",
                background:sel?"#0D2748":D.btn2,color:sel?"#F5A623":D.txt }}>
                {sel?"✓ ":""}{a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <div style={{ background:D.card,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
        <p style={{ fontSize:13,fontWeight:700,color:D.txt,marginBottom:10 }}>Additional comments <span style={{ fontSize:11,color:D.sub,fontWeight:400 }}>(optional)</span></p>
        <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Tell us anything you'd like us to improve…"
          style={{ width:"100%",padding:"10px 12px",borderRadius:12,border:`2px solid ${D.bdr}`,fontSize:13,outline:"none",resize:"none",color:D.txt,background:D.inp,lineHeight:1.5 }}/>
      </div>

      <button onClick={()=>rating>0&&setDone(true)} style={{ width:"100%",padding:"16px",borderRadius:16,
        background:rating>0?"linear-gradient(140deg,#0D2748,#1246A0)":"#CBD5E1",color:"#fff",fontWeight:900,fontSize:16,border:"none",
        cursor:rating>0?"pointer":"default",boxShadow:rating>0?"0 4px 16px rgba(13,39,72,.35)":"none",transition:"all .2s" }}>
        {t.submitFeedback}
      </button>
    </div>
  );
}