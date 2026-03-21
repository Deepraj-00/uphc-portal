import { useState, useEffect, useRef, useCallback } from "react";

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

/* ─── INDIAN MEDICINES DATABASE ──────────────────────────────────────────── */
const MEDICINES = [
  // Analgesics & Antipyretics
  {name:"Paracetamol",strengths:["125mg","250mg","500mg","650mg","1000mg"],type:"Tab/Syp"},
  {name:"Ibuprofen",strengths:["200mg","400mg","600mg","800mg"],type:"Tab"},
  {name:"Diclofenac",strengths:["25mg","50mg","75mg","100mg"],type:"Tab/Gel"},
  {name:"Naproxen",strengths:["250mg","500mg"],type:"Tab"},
  {name:"Aspirin",strengths:["75mg","150mg","325mg","650mg"],type:"Tab"},
  {name:"Mefenamic Acid",strengths:["250mg","500mg"],type:"Tab"},
  {name:"Ketorolac",strengths:["10mg","30mg"],type:"Tab/Inj"},
  {name:"Tramadol",strengths:["50mg","100mg"],type:"Tab/Cap"},
  {name:"Aceclofenac",strengths:["100mg"],type:"Tab"},
  {name:"Nimesulide",strengths:["100mg"],type:"Tab"},
  // Antibiotics
  {name:"Amoxicillin",strengths:["250mg","500mg","875mg"],type:"Cap/Syp"},
  {name:"Amoxicillin + Clavulanate",strengths:["375mg","625mg","1000mg"],type:"Tab"},
  {name:"Ampicillin",strengths:["250mg","500mg"],type:"Cap/Inj"},
  {name:"Azithromycin",strengths:["250mg","500mg"],type:"Tab"},
  {name:"Clarithromycin",strengths:["250mg","500mg"],type:"Tab"},
  {name:"Erythromycin",strengths:["250mg","500mg"],type:"Tab/Syp"},
  {name:"Ciprofloxacin",strengths:["250mg","500mg","750mg"],type:"Tab"},
  {name:"Levofloxacin",strengths:["250mg","500mg","750mg"],type:"Tab"},
  {name:"Ofloxacin",strengths:["100mg","200mg","400mg"],type:"Tab"},
  {name:"Norfloxacin",strengths:["400mg"],type:"Tab"},
  {name:"Doxycycline",strengths:["100mg","200mg"],type:"Cap"},
  {name:"Tetracycline",strengths:["250mg","500mg"],type:"Cap"},
  {name:"Metronidazole",strengths:["200mg","400mg","500mg"],type:"Tab/Syp"},
  {name:"Tinidazole",strengths:["500mg","1000mg"],type:"Tab"},
  {name:"Cefixime",strengths:["100mg","200mg","400mg"],type:"Tab/Syp"},
  {name:"Cefpodoxime",strengths:["100mg","200mg"],type:"Tab"},
  {name:"Ceftriaxone",strengths:["250mg","500mg","1g"],type:"Inj"},
  {name:"Cefuroxime",strengths:["250mg","500mg"],type:"Tab"},
  {name:"Cotrimoxazole",strengths:["480mg","960mg"],type:"Tab/Syp"},
  {name:"Clindamycin",strengths:["150mg","300mg"],type:"Cap"},
  {name:"Linezolid",strengths:["600mg"],type:"Tab"},
  {name:"Nitrofurantoin",strengths:["50mg","100mg"],type:"Cap"},
  // Antifungals
  {name:"Fluconazole",strengths:["50mg","100mg","150mg","200mg"],type:"Cap"},
  {name:"Itraconazole",strengths:["100mg","200mg"],type:"Cap"},
  {name:"Clotrimazole",strengths:["1%","2%"],type:"Cream/Lotion"},
  {name:"Ketoconazole",strengths:["200mg","2%"],type:"Tab/Cream"},
  {name:"Terbinafine",strengths:["250mg","1%"],type:"Tab/Cream"},
  {name:"Nystatin",strengths:["100000IU"],type:"Tab/Syp"},
  // Antivirals
  {name:"Acyclovir",strengths:["200mg","400mg","800mg"],type:"Tab/Cream"},
  {name:"Oseltamivir",strengths:["30mg","45mg","75mg"],type:"Cap"},
  {name:"Valacyclovir",strengths:["500mg","1000mg"],type:"Tab"},
  // Antiparasitics
  {name:"Albendazole",strengths:["200mg","400mg"],type:"Tab/Syp"},
  {name:"Mebendazole",strengths:["100mg","500mg"],type:"Tab/Syp"},
  {name:"Ivermectin",strengths:["3mg","6mg","12mg"],type:"Tab"},
  {name:"Chloroquine",strengths:["150mg","500mg"],type:"Tab"},
  {name:"Hydroxychloroquine",strengths:["200mg","400mg"],type:"Tab"},
  {name:"Primaquine",strengths:["2.5mg","7.5mg"],type:"Tab"},
  // Antihypertensives
  {name:"Amlodipine",strengths:["2.5mg","5mg","10mg"],type:"Tab"},
  {name:"Atenolol",strengths:["25mg","50mg","100mg"],type:"Tab"},
  {name:"Metoprolol",strengths:["25mg","50mg","100mg"],type:"Tab"},
  {name:"Enalapril",strengths:["2.5mg","5mg","10mg","20mg"],type:"Tab"},
  {name:"Ramipril",strengths:["1.25mg","2.5mg","5mg","10mg"],type:"Cap"},
  {name:"Losartan",strengths:["25mg","50mg","100mg"],type:"Tab"},
  {name:"Telmisartan",strengths:["20mg","40mg","80mg"],type:"Tab"},
  {name:"Hydrochlorothiazide",strengths:["12.5mg","25mg"],type:"Tab"},
  {name:"Furosemide",strengths:["20mg","40mg","80mg"],type:"Tab/Inj"},
  {name:"Nifedipine",strengths:["5mg","10mg","20mg","30mg"],type:"Tab/Cap"},
  {name:"Clonidine",strengths:["100mcg","150mcg"],type:"Tab"},
  {name:"Spironolactone",strengths:["25mg","50mg","100mg"],type:"Tab"},
  // Antidiabetics
  {name:"Metformin",strengths:["250mg","500mg","750mg","1000mg"],type:"Tab"},
  {name:"Glibenclamide",strengths:["2.5mg","5mg"],type:"Tab"},
  {name:"Glimepiride",strengths:["1mg","2mg","3mg","4mg"],type:"Tab"},
  {name:"Gliclazide",strengths:["40mg","80mg","30mg MR"],type:"Tab"},
  {name:"Pioglitazone",strengths:["7.5mg","15mg","30mg"],type:"Tab"},
  {name:"Voglibose",strengths:["0.2mg","0.3mg"],type:"Tab"},
  {name:"Sitagliptin",strengths:["25mg","50mg","100mg"],type:"Tab"},
  {name:"Dapagliflozin",strengths:["5mg","10mg"],type:"Tab"},
  {name:"Insulin Regular",strengths:["40IU/mL","100IU/mL"],type:"Inj"},
  {name:"Insulin NPH",strengths:["40IU/mL","100IU/mL"],type:"Inj"},
  // Respiratory
  {name:"Salbutamol",strengths:["2mg","4mg","100mcg inhaler"],type:"Tab/Inhaler/Syp"},
  {name:"Terbutaline",strengths:["2.5mg","5mg"],type:"Tab/Inj"},
  {name:"Theophylline",strengths:["100mg","200mg","300mg"],type:"Tab"},
  {name:"Montelukast",strengths:["4mg","5mg","10mg"],type:"Tab/Chewable"},
  {name:"Budesonide",strengths:["100mcg","200mcg","400mcg"],type:"Inhaler"},
  {name:"Fluticasone",strengths:["50mcg","100mcg","250mcg"],type:"Inhaler"},
  {name:"Ipratropium",strengths:["20mcg","40mcg"],type:"Inhaler"},
  {name:"Formoterol",strengths:["6mcg","12mcg"],type:"Inhaler"},
  {name:"Tiotropium",strengths:["9mcg","18mcg"],type:"Inhaler/Cap"},
  {name:"Dextromethorphan",strengths:["10mg","15mg"],type:"Syp"},
  {name:"Guaifenesin",strengths:["100mg","200mg"],type:"Syp/Tab"},
  {name:"Ambroxol",strengths:["15mg","30mg","75mg"],type:"Tab/Syp"},
  {name:"Bromhexine",strengths:["4mg","8mg"],type:"Tab/Syp"},
  // Antihistamines
  {name:"Cetirizine",strengths:["5mg","10mg"],type:"Tab/Syp"},
  {name:"Levocetirizine",strengths:["2.5mg","5mg"],type:"Tab/Syp"},
  {name:"Fexofenadine",strengths:["60mg","120mg","180mg"],type:"Tab"},
  {name:"Loratadine",strengths:["10mg"],type:"Tab/Syp"},
  {name:"Desloratadine",strengths:["2.5mg","5mg"],type:"Tab"},
  {name:"Chlorpheniramine",strengths:["2mg","4mg"],type:"Tab/Syp"},
  {name:"Hydroxyzine",strengths:["10mg","25mg"],type:"Tab"},
  {name:"Promethazine",strengths:["10mg","25mg"],type:"Tab/Syp"},
  // GI
  {name:"Omeprazole",strengths:["10mg","20mg","40mg"],type:"Cap"},
  {name:"Pantoprazole",strengths:["20mg","40mg"],type:"Tab"},
  {name:"Rabeprazole",strengths:["10mg","20mg"],type:"Tab"},
  {name:"Esomeprazole",strengths:["20mg","40mg"],type:"Cap"},
  {name:"Ranitidine",strengths:["75mg","150mg","300mg"],type:"Tab"},
  {name:"Famotidine",strengths:["20mg","40mg"],type:"Tab"},
  {name:"Domperidone",strengths:["10mg"],type:"Tab/Syp"},
  {name:"Metoclopramide",strengths:["5mg","10mg"],type:"Tab/Syp/Inj"},
  {name:"Ondansetron",strengths:["4mg","8mg"],type:"Tab/Syp/Inj"},
  {name:"Dicyclomine",strengths:["10mg","20mg"],type:"Tab/Syp/Inj"},
  {name:"Hyoscine",strengths:["10mg","20mg"],type:"Tab"},
  {name:"Loperamide",strengths:["2mg"],type:"Cap"},
  {name:"ORS",strengths:["1 sachet in 200mL water"],type:"Sachet"},
  {name:"Zinc Sulphate",strengths:["10mg","20mg"],type:"Tab/Syp"},
  {name:"Lactulose",strengths:["3.35g/5mL"],type:"Syp"},
  {name:"Bisacodyl",strengths:["5mg","10mg"],type:"Tab/Suppository"},
  {name:"Activated Charcoal",strengths:["250mg"],type:"Cap"},
  {name:"Sucralfate",strengths:["1g"],type:"Tab/Syp"},
  {name:"Aluminium Hydroxide + Magnesium Hydroxide",strengths:["Regular","Forte"],type:"Tab/Syp"},
  // Vitamins & Supplements
  {name:"Vitamin B Complex",strengths:["Regular"],type:"Tab"},
  {name:"Vitamin B12",strengths:["500mcg","1000mcg","1500mcg"],type:"Tab/Inj"},
  {name:"Vitamin C",strengths:["250mg","500mg","1000mg"],type:"Tab"},
  {name:"Vitamin D3",strengths:["1000IU","2000IU","60000IU"],type:"Tab/Drop/Cap"},
  {name:"Calcium + Vitamin D3",strengths:["500mg+250IU","1000mg+500IU"],type:"Tab"},
  {name:"Folic Acid",strengths:["400mcg","500mcg","1mg","5mg"],type:"Tab"},
  {name:"Iron (Ferrous Sulphate)",strengths:["150mg","200mg"],type:"Tab/Syp"},
  {name:"Ferrous Ascorbate",strengths:["100mg","150mg"],type:"Tab"},
  {name:"Multivitamin",strengths:["Regular"],type:"Tab/Cap/Syp"},
  {name:"Zinc",strengths:["10mg","20mg","50mg"],type:"Tab/Syp"},
  {name:"Magnesium",strengths:["250mg","500mg"],type:"Tab"},
  // Steroids
  {name:"Prednisolone",strengths:["5mg","10mg","20mg","40mg"],type:"Tab"},
  {name:"Dexamethasone",strengths:["0.5mg","4mg","8mg"],type:"Tab/Inj"},
  {name:"Methylprednisolone",strengths:["4mg","8mg","16mg","32mg"],type:"Tab/Inj"},
  {name:"Hydrocortisone",strengths:["10mg","20mg","100mg"],type:"Tab/Inj/Cream"},
  {name:"Betamethasone",strengths:["0.1%"],type:"Cream/Lotion"},
  {name:"Triamcinolone",strengths:["0.1%"],type:"Cream/Oint"},
  // Dermatology
  {name:"Mupirocin",strengths:["2%"],type:"Cream/Oint"},
  {name:"Fusidic Acid",strengths:["2%"],type:"Cream"},
  {name:"Calamine Lotion",strengths:["Regular"],type:"Lotion"},
  {name:"Permethrin",strengths:["1%","5%"],type:"Cream/Lotion"},
  {name:"Salicylic Acid",strengths:["2%","6%","12%"],type:"Cream/Gel"},
  {name:"Silver Sulfadiazine",strengths:["1%"],type:"Cream"},
  {name:"Povidone Iodine",strengths:["5%","10%"],type:"Solution/Ointment"},
  // CNS
  {name:"Diazepam",strengths:["2mg","5mg","10mg"],type:"Tab/Inj"},
  {name:"Lorazepam",strengths:["0.5mg","1mg","2mg"],type:"Tab"},
  {name:"Alprazolam",strengths:["0.25mg","0.5mg","1mg"],type:"Tab"},
  {name:"Clonazepam",strengths:["0.25mg","0.5mg","1mg","2mg"],type:"Tab"},
  {name:"Phenobarbitone",strengths:["30mg","60mg"],type:"Tab"},
  {name:"Phenytoin",strengths:["50mg","100mg","300mg"],type:"Cap/Tab"},
  {name:"Carbamazepine",strengths:["100mg","200mg","400mg"],type:"Tab"},
  {name:"Valproic Acid",strengths:["200mg","500mg"],type:"Tab/Syp"},
  {name:"Levetiracetam",strengths:["250mg","500mg","750mg","1000mg"],type:"Tab"},
  {name:"Amitriptyline",strengths:["10mg","25mg","50mg","75mg"],type:"Tab"},
  {name:"Fluoxetine",strengths:["10mg","20mg","40mg"],type:"Cap"},
  {name:"Sertraline",strengths:["25mg","50mg","100mg"],type:"Tab"},
  {name:"Escitalopram",strengths:["5mg","10mg","20mg"],type:"Tab"},
  {name:"Haloperidol",strengths:["0.5mg","1mg","5mg","10mg"],type:"Tab"},
  {name:"Risperidone",strengths:["0.5mg","1mg","2mg","3mg","4mg"],type:"Tab"},
  {name:"Olanzapine",strengths:["2.5mg","5mg","10mg"],type:"Tab"},
  // Eye/ENT
  {name:"Ciprofloxacin Eye Drops",strengths:["0.3%"],type:"Eye Drops"},
  {name:"Chloramphenicol Eye Drops",strengths:["0.5%","1%"],type:"Eye Drops"},
  {name:"Tobramycin Eye Drops",strengths:["0.3%"],type:"Eye Drops"},
  {name:"Dexamethasone Eye Drops",strengths:["0.1%"],type:"Eye Drops"},
  {name:"Timolol Eye Drops",strengths:["0.25%","0.5%"],type:"Eye Drops"},
  {name:"Latanoprost Eye Drops",strengths:["0.005%"],type:"Eye Drops"},
  {name:"Xylometazoline Nasal Drops",strengths:["0.05%","0.1%"],type:"Nasal Drops"},
  {name:"Beclomethasone Nasal Spray",strengths:["50mcg"],type:"Nasal Spray"},
  {name:"Fluticasone Nasal Spray",strengths:["50mcg"],type:"Nasal Spray"},
  {name:"Otosporin Ear Drops",strengths:["Regular"],type:"Ear Drops"},
  // Cardiac
  {name:"Digoxin",strengths:["0.0625mg","0.125mg","0.25mg"],type:"Tab"},
  {name:"Atorvastatin",strengths:["10mg","20mg","40mg","80mg"],type:"Tab"},
  {name:"Rosuvastatin",strengths:["5mg","10mg","20mg","40mg"],type:"Tab"},
  {name:"Clopidogrel",strengths:["75mg","150mg","300mg"],type:"Tab"},
  {name:"Warfarin",strengths:["1mg","2mg","5mg"],type:"Tab"},
  {name:"Isosorbide Dinitrate",strengths:["5mg","10mg","20mg"],type:"Tab"},
  {name:"Nitroglycerin",strengths:["0.5mg","2.6mg","6.4mg"],type:"Tab/Spray"},
  {name:"Carvedilol",strengths:["3.125mg","6.25mg","12.5mg","25mg"],type:"Tab"},
  {name:"Bisoprolol",strengths:["2.5mg","5mg","10mg"],type:"Tab"},
  // Thyroid
  {name:"Levothyroxine",strengths:["12.5mcg","25mcg","50mcg","75mcg","100mcg"],type:"Tab"},
  {name:"Carbimazole",strengths:["5mg","10mg","20mg"],type:"Tab"},
  {name:"Propylthiouracil",strengths:["50mg","100mg"],type:"Tab"},
  // Immunization
  {name:"OPV (Oral Polio Vaccine)",strengths:["2 drops"],type:"Oral"},
  {name:"BCG Vaccine",strengths:["0.1mL"],type:"Inj"},
  {name:"Hepatitis B Vaccine",strengths:["0.5mL","1mL"],type:"Inj"},
  {name:"MMR Vaccine",strengths:["0.5mL"],type:"Inj"},
  {name:"DPT Vaccine",strengths:["0.5mL"],type:"Inj"},
  {name:"Typhoid Vaccine",strengths:["0.5mL"],type:"Inj"},
  {name:"Tetanus Toxoid",strengths:["0.5mL"],type:"Inj"},
  // Others
  {name:"Chlorhexidine",strengths:["0.12%","0.2%","2%","4%"],type:"Solution/Gel"},
  {name:"Glycerine",strengths:["Pure"],type:"Liquid/Suppository"},
  {name:"Liquid Paraffin",strengths:["Pure"],type:"Liquid"},
  {name:"Normal Saline",strengths:["0.9%","0.45%"],type:"Solution/Nasal"},
  {name:"Dextrose",strengths:["5%","10%","25%","50%"],type:"Solution"},
  {name:"Ringer Lactate",strengths:["Regular"],type:"Solution"},
  {name:"Urea Cream",strengths:["10%","20%","40%"],type:"Cream"},
  {name:"Aloe Vera Gel",strengths:["Regular"],type:"Gel"},
  {name:"Antacid",strengths:["Regular","Forte"],type:"Tab/Syp"},
];

const FREQUENCIES = [
  { id:"OD",   label:"OD",   desc:"Once daily" },
  { id:"BD",   label:"BD",   desc:"Twice daily" },
  { id:"TID",  label:"TID",  desc:"Three times a day" },
  { id:"QID",  label:"QID",  desc:"Four times a day" },
  { id:"SOS",  label:"SOS",  desc:"If needed" },
  { id:"STAT", label:"STAT", desc:"Immediately" },
  { id:"HS",   label:"HS",   desc:"At bedtime" },
  { id:"OW",   label:"OW",   desc:"Once a week" },
  { id:"EOD",  label:"EOD",  desc:"Every other day" },
];
const DURATIONS = ["1 day","2 days","3 days","4 days","5 days","1 week","10 days","2 weeks","1 month","2 months","3 months","Continuous","As directed"];
const TIMINGS   = ["Before food","After food","With food","Empty stomach","With milk","With water","As directed"];
const ROUTES    = ["Oral","Topical","Nasal","Eye","Ear","Injection","Inhaler","Sublingual","Rectal"];

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const ALL_DEPTS = [
  { id:"opd", label:"General OPD",  icon:"🩺", grad:"linear-gradient(135deg,#1E40AF,#3B82F6)" },
  { id:"mat", label:"Maternity",    icon:"🤰", grad:"linear-gradient(135deg,#7C3AED,#A78BFA)" },
  { id:"vax", label:"Vaccination",  icon:"💉", grad:"linear-gradient(135deg,#065F46,#10B981)" },
  { id:"dnt", label:"Dental",       icon:"🦷", grad:"linear-gradient(135deg,#92400E,#F59E0B)" },
  { id:"eye", label:"Eye / ENT",    icon:"👁",  grad:"linear-gradient(135deg,#155E75,#06B6D4)" },
  { id:"lab", label:"Lab / Tests",  icon:"🧪", grad:"linear-gradient(135deg,#9F1239,#F43F5E)" },
];
const DEPTS_LIST   = ["General OPD","Maternity","Vaccination","Dental","Eye / ENT","Lab / Tests"];
const DEPT_COLORS  = {"General OPD":"#3B82F6","Maternity":"#A78BFA","Vaccination":"#10B981","Dental":"#F59E0B","Eye / ENT":"#06B6D4","Lab / Tests":"#F43F5E"};
const SYM_ICONS    = ["🤒","😮‍💨","🦴","🤰","💉","❓"];
const TC = {
  red:    { badge:"#DC2626", border:"rgba(248,113,113,.5)", label:"URGENT"   },
  yellow: { badge:"#D97706", border:"rgba(252,211,77,.5)",  label:"STANDARD" },
  green:  { badge:"#059669", border:"rgba(110,231,183,.5)", label:"ROUTINE"  },
};

/* ─── LANGUAGES ──────────────────────────────────────────────────────────── */
const L = {
  EN:{ welcome:"Welcome to UPHC",tagline:"Urban Primary Health Centre — Ahmedabad",tapSpeak:"Tap to Speak",describe:"Describe how you are feeling",bookManual:"Book Manually",tapType:"Tap / Type",waBook:"Book on WhatsApp",smsBook:"No Internet? SMS 'BOOK'",checkStatus:"Check Token Status",enterMobile:"Mobile number",checkBtn:"Check",s1title:"Your Details",s1otp:"Verify Identity",s1sent:"OTP sent to",s1verify:"Verify OTP",s1resend:"Resend OTP",s2title:"Describe Your Symptoms",s3title:"Booking Confirmed!",holdSpeak:"Hold to Speak",searchSym:"Search symptoms…",tokenSent:"Token sent via SMS & WhatsApp",notifyMsg:"We'll notify you when it's your turn",waitTime:"Est. Wait",mins:"mins",callIn:"Call In",noShow:"No Show",done:"Done",dashboard:"Staff Dashboard",feedback:"Feedback",analytics:"Analytics",totalWait:"Waiting",avgWait:"Avg Wait",doneToday:"Done Today",symptoms:["Fever","Cough","Body Ache","Pregnancy","Vaccine","Other"],next:"Continue →",back:"← Back",listening:"Listening…",processing:"AI analyzing…",chooseDept:"Select Department",printToken:"Print Token",navHome:"Home",navBook:"Book",navChat:"Chat",navDash:"Dashboard",navDisplay:"Display",navFeedback:"Feedback",rateExp:"Rate Your Visit",submitFeedback:"Submit Feedback",feedbackThanks:"Thank You!",voiceNA:"Voice not supported. Use Chrome.",install:"Add to Home Screen",installSub:"Works offline — no app store",nowServing:"Now Serving",nextTokens:"Next in Queue",notAvail:"Not Available" },
  GU:{ welcome:"UPHC માં આપનું સ્વાગત",tagline:"અર્બન પ્રાઇમરી હેલ્થ સેન્ટર — અમદાવાદ",tapSpeak:"બોલવા ટેપ કરો",describe:"તમે કેવું અનુભવો છો",bookManual:"જાતે બુક કરો",tapType:"ટેપ / ટાઇપ",waBook:"WhatsApp પર બુક",smsBook:"ઇન્ટ. નથી? SMS",checkStatus:"ટોકન સ્ટેટસ",enterMobile:"મોબાઇલ",checkBtn:"ચેક",s1title:"તમારી વિગત",s1otp:"OTP ચકાસો",s1sent:"OTP મોકલ્યો",s1verify:"ચકાસો",s1resend:"ફરી મોકલો",s2title:"તકલીફ જણાવો",s3title:"બુકિંગ થઈ ગઈ!",holdSpeak:"દબાવી રાખો",searchSym:"શોધો…",tokenSent:"ટોકન મોકલ્યો",notifyMsg:"વારો આવ્યે જાણ કરીશું",waitTime:"રાહ",mins:"મિ",callIn:"બોલાવો",noShow:"ગેરહ.",done:"પૂર્ણ",dashboard:"ડેશ",feedback:"પ્ર.",analytics:"વિ.",totalWait:"રાહ",avgWait:"સ.ભ",doneToday:"આજે",symptoms:["તાવ","ઉધ.","દર્દ","ગર્ભ","રસી","અન્ય"],next:"આગળ →",back:"← પાછળ",listening:"સાંભળે…",processing:"AI…",chooseDept:"વિભાગ",printToken:"છાપો",navHome:"હોમ",navBook:"બુક",navChat:"ચેટ",navDash:"ડેશ",navDisplay:"ડિ.",navFeedback:"રેટ",rateExp:"અનુભવ",submitFeedback:"સ્વીકારો",feedbackThanks:"આભાર!",voiceNA:"Chrome",install:"હોમ સ્ક્રીન",installSub:"ઓફલાઇન",nowServing:"સેવા",nextTokens:"આગળ",notAvail:"ઉપલબ્ધ નથી" },
  HI:{ welcome:"UPHC में आपका स्वागत",tagline:"अर्बन प्राइमरी हेल्थ सेंटर — अहमदाबाद",tapSpeak:"बोलने के लिए दबाएं",describe:"अपनी तकलीफ बताएं",bookManual:"खुद बुक करें",tapType:"दबाएं / टाइप",waBook:"WhatsApp पर बुक",smsBook:"इंटरनेट नहीं? SMS",checkStatus:"टोकन स्टेटस",enterMobile:"मोबाइल",checkBtn:"जांचें",s1title:"आपकी जानकारी",s1otp:"OTP सत्यापित",s1sent:"OTP भेजा",s1verify:"सत्यापित करें",s1resend:"दोबारा भेजें",s2title:"लक्षण बताएं",s3title:"बुकिंग हो गई!",holdSpeak:"दबाकर बोलें",searchSym:"खोजें…",tokenSent:"टोकन भेजा",notifyMsg:"बारी पर सूचित करेंगे",waitTime:"प्रतीक्षा",mins:"मि",callIn:"बुलाएं",noShow:"अनु.",done:"पूर्ण",dashboard:"डैश",feedback:"प्र.",analytics:"आं.",totalWait:"प्र.",avgWait:"औसत",doneToday:"आज",symptoms:["बुखार","खांसी","दर्द","गर्भ","टीका","अन्य"],next:"आगे →",back:"← वापस",listening:"सुन रहा…",processing:"AI…",chooseDept:"विभाग",printToken:"प्रिंट",navHome:"होम",navBook:"बुक",navChat:"चैट",navDash:"डैश",navDisplay:"डि.",navFeedback:"रेट",rateExp:"रेट करें",submitFeedback:"जमा करें",feedbackThanks:"धन्यवाद!",voiceNA:"Chrome",install:"होम स्क्रीन",installSub:"ऑफलाइन",nowServing:"सेवा",nextTokens:"अगले",notAvail:"उपलब्ध नहीं" },
};

/* ─── GLOBAL CSS ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter','Noto Sans',sans-serif;overflow-x:hidden}
  .glass{background:rgba(255,255,255,0.08);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1px solid rgba(255,255,255,0.18);box-shadow:0 8px 32px rgba(0,0,0,0.3)}
  .glass-card{background:rgba(255,255,255,0.06);backdrop-filter:blur(24px) saturate(200%);-webkit-backdrop-filter:blur(24px) saturate(200%);border:1px solid rgba(255,255,255,0.14);box-shadow:0 8px 40px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.12)}
  .glass-dark{background:rgba(5,13,31,0.6);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid rgba(255,255,255,0.08)}
  .liquid-btn{background:rgba(255,255,255,0.15);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.25);transition:all .25s;cursor:pointer;color:#fff;font-weight:700}
  .liquid-btn:hover{background:rgba(255,255,255,0.22);transform:translateY(-1px)}
  .teal-btn{background:linear-gradient(135deg,#14B8A6,#0891B2);border:none;color:#fff;font-weight:700;cursor:pointer;transition:all .25s;box-shadow:0 4px 20px rgba(20,184,166,.4)}
  .teal-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(20,184,166,.5)}
  .teal-btn:active,.liquid-btn:active{transform:scale(.97)!important}
  .pulse-ring{animation:pr 2.5s ease-out infinite}
  @keyframes pr{0%{box-shadow:0 0 0 0 rgba(20,184,166,.7),0 0 0 0 rgba(20,184,166,.4)}70%{box-shadow:0 0 0 18px rgba(20,184,166,0),0 0 0 34px rgba(20,184,166,0)}100%{box-shadow:0 0 0 0 rgba(20,184,166,0)}}
  .mic-pulse{animation:mp .75s ease-in-out infinite alternate}
  @keyframes mp{from{transform:scale(1)}to{transform:scale(1.08)}}
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
  .hover-lift:hover{transform:translateY(-4px)}
  .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.3px}
  .float-orb{animation:fo 8s ease-in-out infinite}
  @keyframes fo{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,15px) scale(.95)}}
  .float-orb-2{animation:fo2 10s ease-in-out infinite}
  @keyframes fo2{0%,100%{transform:translate(0,0)}33%{transform:translate(-25px,18px)}66%{transform:translate(20px,-12px)}}
  .float-orb-3{animation:fo3 12s ease-in-out infinite}
  @keyframes fo3{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-25px)}}
  .heartbeat{animation:hb 1.8s ease-in-out infinite}
  @keyframes hb{0%,100%{transform:scale(1)}14%{transform:scale(1.06)}28%{transform:scale(1)}42%{transform:scale(1.04)}}
  .dash-anim{stroke-dasharray:1000;stroke-dashoffset:1000;animation:da 3s ease forwards}
  @keyframes da{to{stroke-dashoffset:0}}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:2px}
  @media print{.np{display:none!important}.po{display:block!important}}
  .po{display:none}
  input,textarea,button,select{font-family:inherit}
  .input-glass{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;backdrop-filter:blur(12px);transition:all .2s}
  .input-glass::placeholder{color:rgba(255,255,255,.45)}
  .input-glass:focus{outline:none;border-color:rgba(20,184,166,.6);background:rgba(255,255,255,.12);box-shadow:0 0 0 3px rgba(20,184,166,.15)}
  .select-glass{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;backdrop-filter:blur(12px)}
  .select-glass option{background:#050D1F;color:#fff}
  .med-suggestion:hover{background:rgba(20,184,166,.15)!important}
  .rx-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px;margin-bottom:10px;position:relative}
`;

/* ─── MEDICAL BACKGROUND ─────────────────────────────────────────────────── */
const MedicalBackground = () => (
  <div style={{ position:"fixed",inset:0,zIndex:0,overflow:"hidden",background:"linear-gradient(135deg,#020812 0%,#050D1F 30%,#071527 60%,#03111C 100%)" }}>
    <div className="float-orb"   style={{ position:"absolute",top:"-15%",left:"-10%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,.18),transparent 70%)",filter:"blur(40px)" }}/>
    <div className="float-orb-2" style={{ position:"absolute",top:"20%",right:"-15%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,.14),transparent 70%)",filter:"blur(50px)" }}/>
    <div className="float-orb-3" style={{ position:"absolute",bottom:"-10%",left:"30%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,.12),transparent 70%)",filter:"blur(45px)" }}/>
    <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:.06 }} viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
      <polyline className="dash-anim" points="0,450 100,450 140,450 160,350 180,550 200,250 220,650 240,450 280,450 320,450 360,380 380,520 400,450 500,450 540,420 560,480 580,450 700,450 740,390 760,510 780,450 900,450 940,410 960,490 980,450 1100,450 1140,360 1160,540 1180,450 1400,450"
        fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <g opacity=".7">{Array.from({length:10}).map((_,i)=>(<g key={i}><ellipse cx={60} cy={80+i*60} rx={30} ry={8} fill="none" stroke="#14B8A6" strokeWidth="1.5" transform={`rotate(${i*15},60,${80+i*60})`}/><ellipse cx={60} cy={110+i*60} rx={30} ry={8} fill="none" stroke="#3B82F6" strokeWidth="1.5" transform={`rotate(${-i*15},60,${110+i*60})`}/></g>))}</g>
      <g opacity=".6">{Array.from({length:10}).map((_,i)=>(<g key={i}><ellipse cx={1340} cy={80+i*60} rx={30} ry={8} fill="none" stroke="#A78BFA" strokeWidth="1.5" transform={`rotate(${i*15},1340,${80+i*60})`}/><ellipse cx={1340} cy={110+i*60} rx={30} ry={8} fill="none" stroke="#F43F5E" strokeWidth="1.5" transform={`rotate(${-i*15},1340,${110+i*60})`}/></g>))}</g>
      {[[200,150],[800,100],[1100,200],[400,750],[1000,750],[650,80]].map(([x,y],i)=>(<g key={i} opacity={.4+i*.08}><rect x={x-4} y={y-14} width={8} height={28} rx={2} fill="none" stroke="#14B8A6" strokeWidth="1.5"/><rect x={x-14} y={y-4} width={28} height={8} rx={2} fill="none" stroke="#14B8A6" strokeWidth="1.5"/></g>))}
      <circle cx={1200} cy={200} r={80} fill="none" stroke="#14B8A6" strokeWidth="1" strokeDasharray="8 4" opacity=".4"/>
      <circle cx={200}  cy={700} r={70} fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="6 4" opacity=".4"/>
      <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,.025)" strokeWidth="1"/></pattern></defs>
      <rect width="1400" height="900" fill="url(#grid)"/>
    </svg>
    <div style={{ position:"absolute",top:"8%",right:"8%",fontSize:120,opacity:.04,filter:"blur(1px)" }} className="float-orb">⚕️</div>
    <div style={{ position:"absolute",bottom:"12%",left:"6%",fontSize:100,opacity:.04,filter:"blur(1px)" }} className="float-orb-2">🧬</div>
  </div>
);

const GCard = ({ children, style={}, className="" }) => (
  <div className={`glass-card ${className}`} style={{ borderRadius:24, padding:22, ...style }}>{children}</div>
);

const getToday = () => new Date().toISOString().split("T")[0];

/* ─── HOOK: Active Departments ───────────────────────────────────────────── */
function useActiveDepts() {
  const [activeDepts, setActiveDepts] = useState(new Set(DEPTS_LIST));
  const [openCount, setOpenCount]     = useState(DEPTS_LIST.length);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/counters");
      const d = await r.json();
      if (d.counters) {
        const active = new Set(d.counters.filter(c=>c.active).map(c=>c.department));
        setActiveDepts(active);
        setOpenCount(active.size);
      }
    } catch { /* keep defaults */ }
  }, []);

  useEffect(() => {
    refresh();
    // Also subscribe to realtime counter changes
    let channel;
    (async () => {
      const sb = await getSB();
      channel = sb.channel("counters-watch")
        .on("postgres_changes",{event:"*",schema:"public",table:"counters"},refresh)
        .subscribe();
    })();
    return () => channel?.unsubscribe();
  }, [refresh]);

  return { activeDepts, openCount };
}

/* ─── ROOT APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang]       = useState("EN");
  const [view, setView]       = useState("home");
  const [queue, setQueue]     = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const [staffAuth, setStaffAuth] = useState(() => {
    try { return sessionStorage.getItem("uphc_staff") === "true"; } catch { return false; }
  });
  const { activeDepts, openCount } = useActiveDepts();
  const t = L[lang];

  const mapToken = tk => ({
    id:           tk.token_number   || "Unknown",
    name:         tk.patient_name   || `Patient ${(tk.patient_mobile||"0000").slice(-4)}`,
    dept:         tk.department     || "General OPD",
    raw:          tk.symptoms_raw   || "No complaint recorded",
    clinical:     Array.isArray(tk.clinical_tags) ? tk.clinical_tags : ["Requires assessment"],
    urgency:      tk.urgency        || "yellow",
    time:         tk.created_at     ? new Date(tk.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "--:--",
    wait:         Number(tk.wait_minutes) || 20,
    dbId:         tk.id,
    mobile:       tk.patient_mobile || "",
    status:       tk.status         || "waiting",
    doctor:       tk.doctor_name    || "Dr. Shah",
    counter:      tk.counter_name   || "OPD 1",
    notes:        tk.notes          || "",
    prescription: tk.prescription   || "",
  });

  useEffect(() => {
    let channel;
    const todayStr = getToday();
    (async () => {
      const sb = await getSB();
      const load = async () => {
        const { data: w } = await sb.from("tokens").select("*").eq("status","waiting").eq("token_date",todayStr).order("created_at",{ascending:true});
        const { data: c } = await sb.from("tokens").select("*").eq("status","called").eq("token_date",todayStr).order("created_at",{ascending:true});
        const { count: done } = await sb.from("tokens").select("*",{count:"exact",head:true}).eq("status","completed").eq("token_date",todayStr);
        const { count: ns   } = await sb.from("tokens").select("*",{count:"exact",head:true}).eq("status","noshow").eq("token_date",todayStr);
        setQueue([...(c||[]),...(w||[])].map(mapToken));
        setDoneCount((done||0)+(ns||0));
      };
      await load();
      channel = sb.channel("global-v4")
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"tokens"},load)
        .on("postgres_changes",{event:"UPDATE",schema:"public",table:"tokens"},load)
        .on("postgres_changes",{event:"DELETE",schema:"public",table:"tokens"},load)
        .subscribe(s=>console.log("RT:",s));
    })();
    return () => channel?.unsubscribe();
  }, []);

  const updateStatus = async (dbId, status) => {
    try { await fetch("/api/update-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:dbId,status})}); }
    catch(e){ console.error(e); }
  };

  const handleStaffLogin = (ok) => {
    setStaffAuth(ok);
    try { sessionStorage.setItem("uphc_staff", ok?"true":"false"); } catch {}
  };

  return (
    <div style={{ minHeight:"100vh",fontFamily:"'Inter','Noto Sans',sans-serif",position:"relative",color:"#fff" }}>
      <style>{GLOBAL_CSS}</style>
      <MedicalBackground/>
      <header className="np glass-dark" style={{ position:"sticky",top:0,zIndex:200,borderBottom:"1px solid rgba(255,255,255,.08)",borderRadius:0 }}>
        <div style={{ maxWidth:1200,margin:"0 auto",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
            <div className="heartbeat" style={{ width:38,height:38,borderRadius:12,background:"linear-gradient(135deg,#14B8A6,#0891B2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 16px rgba(20,184,166,.5)" }}>🏥</div>
            <div>
              <div style={{ fontWeight:900,fontSize:14,letterSpacing:.5,lineHeight:1.1 }}>UPHC</div>
              <div style={{ fontSize:8,color:"#14B8A6",fontWeight:700,letterSpacing:2 }}>AHMEDABAD</div>
            </div>
          </div>
          <nav style={{ display:"flex",gap:3,flex:1,justifyContent:"center",flexWrap:"wrap" }}>
            {[["home","navHome"],["book","navBook"],["chat","navChat"],["dash","navDash"],["display","navDisplay"],["feedback","navFeedback"],
              ...(staffAuth?[["admin","⚙ Admin"]]:[])
            ].map(([v,k])=>(
              <button key={v} onClick={()=>setView(v)} className="liquid-btn"
                style={{ padding:"6px 12px",borderRadius:10,fontSize:11,fontWeight:700,border:"1px solid rgba(255,255,255,.12)",
                  background:view===v?"linear-gradient(135deg,rgba(20,184,166,.4),rgba(8,145,178,.4))":"rgba(255,255,255,.06)",
                  color:view===v?"#fff":"rgba(255,255,255,.7)",
                  boxShadow:view===v?"0 0 0 1px rgba(20,184,166,.4),0 4px 16px rgba(20,184,166,.2)":"none" }}>
                {t[k]||k}
              </button>
            ))}
          </nav>
          <div style={{ display:"flex",gap:4,alignItems:"center",flexShrink:0 }}>
            {["EN","GU","HI"].map(l=>(
              <button key={l} onClick={()=>setLang(l)} style={{ padding:"4px 9px",borderRadius:8,fontSize:10,fontWeight:800,border:"none",cursor:"pointer",transition:"all .2s",
                background:lang===l?"linear-gradient(135deg,#F5A623,#F97316)":"rgba(255,255,255,.08)",
                color:lang===l?"#fff":"rgba(255,255,255,.6)",letterSpacing:.5 }}>{l}</button>
            ))}
            {staffAuth && (
              <button onClick={()=>{handleStaffLogin(false);setView("home");}}
                style={{ padding:"4px 9px",borderRadius:8,fontSize:10,fontWeight:800,border:"none",cursor:"pointer",background:"rgba(239,68,68,.2)",color:"#F87171" }}>
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth:view==="display"?1400:(view==="dash"||view==="admin")?1200:520,margin:"0 auto",padding:"20px 14px 64px",position:"relative",zIndex:10 }}>
        {view==="home"     && <HomeView     t={t} setView={setView} queue={queue} openCount={openCount}/>}
        {view==="book"     && <BookView     t={t} lang={lang} setView={setView} activeDepts={activeDepts}/>}
        {view==="chat"     && <ChatView/>}
        {view==="dash"     && (staffAuth ? <DashView t={t} queue={queue} doneCount={doneCount} updateStatus={updateStatus}/> : <StaffLogin onLogin={handleStaffLogin} onSuccess={()=>setView("dash")}/>)}
        {view==="display"  && <DisplayBoard t={t} queue={queue} openCount={openCount}/>}
        {view==="feedback" && <FeedbackView t={t}/>}
        {view==="admin"    && (staffAuth ? <AdminView/> : <StaffLogin onLogin={handleStaffLogin} onSuccess={()=>setView("admin")}/>)}
      </main>
    </div>
  );
}

/* ─── STAFF LOGIN ────────────────────────────────────────────────────────── */
function StaffLogin({ onLogin, onSuccess }) {
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);
  const login = async () => {
    if (!pw) { setErr("Please enter password"); return; }
    setLoading(true); setErr("");
    try {
      const res  = await fetch("/api/staff-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
      const data = await res.json();
      if (data.success) { onLogin(true); onSuccess(); }
      else setErr("Incorrect password. Please try again.");
    } catch { setErr("Network error. Please try again."); }
    finally { setLoading(false); }
  };
  return (
    <div className="slide-up" style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:20 }}>
      <div style={{ textAlign:"center",marginBottom:8 }}>
        <div style={{ fontSize:56,marginBottom:12 }}>🔐</div>
        <h2 style={{ fontSize:24,fontWeight:900,marginBottom:6 }}>Staff Access</h2>
        <p style={{ fontSize:13,color:"rgba(255,255,255,.5)" }}>Enter your staff password to continue</p>
      </div>
      <GCard style={{ padding:28,width:"100%",maxWidth:380 }}>
        <label style={{ display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:8,textTransform:"uppercase",letterSpacing:1 }}>Staff Password</label>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
          placeholder="Enter password" className="input-glass"
          style={{ width:"100%",padding:"14px 16px",borderRadius:14,fontSize:16,border:"1px solid rgba(255,255,255,.2)",marginBottom:14 }}/>
        {err && <p style={{ color:"#F87171",fontSize:12,marginBottom:12,fontWeight:600 }}>{err}</p>}
        <button onClick={login} disabled={loading} className="teal-btn" style={{ width:"100%",padding:"14px",borderRadius:14,fontSize:15,fontWeight:900 }}>
          {loading?"Verifying…":"Login →"}
        </button>
        <p style={{ fontSize:11,color:"rgba(255,255,255,.3)",textAlign:"center",marginTop:14,lineHeight:1.8 }}>
          Default: <span style={{ color:"#F5A623",fontWeight:700 }}>uphc2024</span><br/>
          Change via <span style={{ color:"#14B8A6" }}>STAFF_PASSWORD</span> in Vercel
        </p>
      </GCard>
    </div>
  );
}

/* ─── PRESCRIPTION BUILDER ───────────────────────────────────────────────── */
function PrescriptionBuilder({ value, onChange }) {
  const [search, setSearch]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [strength, setStrength]   = useState("");
  const [freq, setFreq]           = useState("BD");
  const [duration, setDuration]   = useState("3 days");
  const [timing, setTiming]       = useState("After food");
  const [route, setRoute]         = useState("Oral");
  const [items, setItems]         = useState([]);
  const [notes, setNotes]         = useState(value?.notes||"");
  const searchRef = useRef(null);

  // Parse existing items from value
  useEffect(() => {
    if (value?.items) setItems(value.items);
    if (value?.notes !== undefined) setNotes(value.notes);
  }, []);

  // Notify parent on changes
  useEffect(() => {
    onChange({ items, notes });
  }, [items, notes]);

  const handleSearch = (q) => {
    setSearch(q);
    if (q.length < 2) { setSuggestions([]); setShowDrop(false); return; }
    const filtered = MEDICINES.filter(m => m.name.toLowerCase().includes(q.toLowerCase())).slice(0,8);
    setSuggestions(filtered);
    setShowDrop(true);
  };

  const selectMed = (med) => {
    setSelected(med);
    setSearch(med.name);
    setStrength(med.strengths[0]);
    setSuggestions([]);
    setShowDrop(false);
  };

  const addItem = () => {
    if (!selected) return;
    const item = {
      id: Date.now(),
      name: selected.name,
      type: selected.type,
      strength,
      freq,
      duration,
      timing,
      route,
    };
    setItems(prev=>[...prev,item]);
    setSearch(""); setSelected(null); setStrength(""); setFreq("BD"); setDuration("3 days"); setTiming("After food"); setRoute("Oral");
    searchRef.current?.focus();
  };

  const removeItem = (id) => setItems(prev=>prev.filter(i=>i.id!==id));

  const freqLabel = (f) => FREQUENCIES.find(x=>x.id===f)?.desc || f;

  return (
    <div>
      {/* Medicine Search */}
      <div style={{ position:"relative",marginBottom:14 }}>
        <label style={{ display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:8,textTransform:"uppercase",letterSpacing:1 }}>💊 Search Medicine</label>
        <input ref={searchRef} value={search} onChange={e=>handleSearch(e.target.value)}
          onFocus={()=>search.length>=2&&setShowDrop(true)}
          onBlur={()=>setTimeout(()=>setShowDrop(false),200)}
          placeholder="Type medicine name (e.g. Paracetamol, Amoxicillin…)" className="input-glass"
          style={{ width:"100%",padding:"12px 14px",borderRadius:14,fontSize:14,border:"1px solid rgba(255,255,255,.2)" }}/>
        {showDrop && suggestions.length > 0 && (
          <div style={{ position:"absolute",top:"100%",left:0,right:0,zIndex:100,background:"rgba(5,13,31,.97)",border:"1px solid rgba(255,255,255,.15)",borderRadius:14,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,.6)",marginTop:4 }}>
            {suggestions.map(med=>(
              <div key={med.name} className="med-suggestion" onMouseDown={()=>selectMed(med)}
                style={{ padding:"10px 16px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.06)",transition:"background .15s" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span style={{ fontSize:13,fontWeight:700,color:"#fff" }}>{med.name}</span>
                  <span className="chip" style={{ background:"rgba(20,184,166,.15)",color:"#14B8A6",border:"1px solid rgba(20,184,166,.2)" }}>{med.type}</span>
                </div>
                <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginTop:5 }}>
                  {med.strengths.map(s=>(
                    <span key={s} style={{ fontSize:10,color:"rgba(255,255,255,.5)",background:"rgba(255,255,255,.05)",padding:"2px 7px",borderRadius:10 }}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configure medicine if selected */}
      {selected && (
        <div className="fade-in" style={{ background:"rgba(20,184,166,.08)",border:"1px solid rgba(20,184,166,.25)",borderRadius:18,padding:16,marginBottom:14 }}>
          <p style={{ fontSize:12,fontWeight:700,color:"#14B8A6",marginBottom:12 }}>⚙ Configure: <b style={{ color:"#fff" }}>{selected.name}</b></p>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
            {/* Strength */}
            <div>
              <label style={{ fontSize:10,color:"rgba(255,255,255,.5)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5 }}>Strength</label>
              <select value={strength} onChange={e=>setStrength(e.target.value)} className="select-glass"
                style={{ width:"100%",padding:"9px 10px",borderRadius:10,fontSize:13 }}>
                {selected.strengths.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Route */}
            <div>
              <label style={{ fontSize:10,color:"rgba(255,255,255,.5)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5 }}>Route</label>
              <select value={route} onChange={e=>setRoute(e.target.value)} className="select-glass"
                style={{ width:"100%",padding:"9px 10px",borderRadius:10,fontSize:13 }}>
                {ROUTES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {/* Frequency */}
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:10,color:"rgba(255,255,255,.5)",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5 }}>Frequency</label>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {FREQUENCIES.map(f=>(
                <button key={f.id} onClick={()=>setFreq(f.id)}
                  style={{ padding:"6px 12px",borderRadius:10,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",transition:"all .15s",
                    background:freq===f.id?"linear-gradient(135deg,#14B8A6,#0891B2)":"rgba(255,255,255,.08)",
                    color:"#fff" }}>
                  {f.label}<span style={{ fontSize:9,opacity:.7,display:"block" }}>{f.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
            {/* Duration */}
            <div>
              <label style={{ fontSize:10,color:"rgba(255,255,255,.5)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5 }}>Duration</label>
              <select value={duration} onChange={e=>setDuration(e.target.value)} className="select-glass"
                style={{ width:"100%",padding:"9px 10px",borderRadius:10,fontSize:13 }}>
                {DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* Timing */}
            <div>
              <label style={{ fontSize:10,color:"rgba(255,255,255,.5)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5 }}>Timing</label>
              <select value={timing} onChange={e=>setTiming(e.target.value)} className="select-glass"
                style={{ width:"100%",padding:"9px 10px",borderRadius:10,fontSize:13 }}>
                {TIMINGS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button onClick={addItem} className="teal-btn" style={{ width:"100%",padding:"10px",borderRadius:12,fontSize:13 }}>
            ➕ Add to Prescription
          </button>
        </div>
      )}

      {/* Prescription List */}
      {items.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10 }}>📋 Prescription ({items.length} medicines)</p>
          {items.map((item,i)=>(
            <div key={item.id} className="rx-card">
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                    <span style={{ fontSize:14,fontWeight:900,color:"#fff" }}>{i+1}. {item.name}</span>
                    <span className="chip" style={{ background:"rgba(20,184,166,.15)",color:"#14B8A6",border:"1px solid rgba(20,184,166,.25)" }}>{item.strength}</span>
                    <span className="chip" style={{ background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.7)" }}>{item.route}</span>
                  </div>
                  <p style={{ fontSize:12,color:"rgba(255,255,255,.7)",lineHeight:1.6,fontFamily:"monospace" }}>
                    {item.freq} × {item.duration} · {item.timing}
                  </p>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,.4)",marginTop:3 }}>{freqLabel(item.freq)}</p>
                </div>
                <button onClick={()=>removeItem(item.id)}
                  style={{ padding:"4px 8px",borderRadius:8,background:"rgba(239,68,68,.15)",border:"none",cursor:"pointer",color:"#F87171",fontSize:13,flexShrink:0,marginLeft:10 }}>✕</button>
              </div>
            </div>
          ))}
          {/* Formatted text preview */}
          <div style={{ padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",marginTop:12 }}>
            <p style={{ fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8 }}>Formatted Prescription Preview</p>
            <p style={{ fontSize:12,fontFamily:"monospace",lineHeight:1.9,color:"rgba(255,255,255,.8)",whiteSpace:"pre-wrap" }}>
              {items.map((item,i)=>`${i+1}. ${item.name} ${item.strength} (${item.route})\n   ${item.freq} × ${item.duration} — ${item.timing}`).join("\n")}
            </p>
          </div>
        </div>
      )}

      {/* Additional Notes */}
      <div>
        <label style={{ display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>📝 Additional Notes / Instructions</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
          placeholder="Advised rest for 3 days. Drink plenty of fluids. Follow-up in 1 week if not improving…" className="input-glass"
          style={{ width:"100%",padding:"12px 14px",borderRadius:14,fontSize:13,resize:"vertical",lineHeight:1.6,border:"1px solid rgba(255,255,255,.2)" }}/>
      </div>
    </div>
  );
}

/* ─── NOTES MODAL ────────────────────────────────────────────────────────── */
function NotesModal({ patient, onClose, onSave }) {
  const [consultNotes, setConsultNotes] = useState(patient.notes||"");
  const [rxData, setRxData]             = useState({ items:[], notes:"" });
  const [saving, setSaving]             = useState(false);

  // Parse existing prescription if any
  useEffect(() => {
    if (patient.prescription) {
      try {
        const parsed = JSON.parse(patient.prescription);
        if (parsed.items) setRxData(parsed);
      } catch {
        // old text format - keep as notes
        setRxData({ items:[], notes:patient.prescription });
      }
    }
  }, []);

  const formatPrescriptionText = (rx) => {
    if (!rx.items?.length && !rx.notes) return "";
    const lines = rx.items?.map((item,i)=>`${i+1}. ${item.name} ${item.strength} (${item.route}) — ${item.freq} × ${item.duration}, ${item.timing}`) || [];
    if (rx.notes) lines.push(`\nNotes: ${rx.notes}`);
    return lines.join("\n");
  };

  const save = async () => {
    setSaving(true);
    try {
      const prescriptionJson = JSON.stringify(rxData);
      await fetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:patient.dbId, notes:consultNotes, prescription:prescriptionJson})});
      onSave(patient.dbId, consultNotes, prescriptionJson);
      onClose();
    } catch { alert("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.8)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div className="glass-card" style={{ borderRadius:24,padding:28,width:"100%",maxWidth:620,maxHeight:"92vh",overflowY:"auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
          <div>
            <h3 style={{ fontSize:18,fontWeight:900 }}>📋 Consultation</h3>
            <p style={{ fontSize:12,color:"rgba(255,255,255,.5)",marginTop:3 }}>{patient.id} · {patient.name} · {patient.dept}</p>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.1)",border:"none",cursor:"pointer",color:"#fff",fontSize:16 }}>✕</button>
        </div>

        {/* Patient complaint */}
        <div style={{ padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",marginBottom:18 }}>
          <p style={{ fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5 }}>Patient Complaint</p>
          <p style={{ fontSize:12,fontStyle:"italic",color:"rgba(255,255,255,.8)",marginBottom:8 }}>"{patient.raw}"</p>
          <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
            {patient.clinical.map(c=><span key={c} className="chip" style={{ background:"rgba(20,184,166,.15)",color:"#14B8A6",border:"1px solid rgba(20,184,166,.3)" }}>{c}</span>)}
          </div>
        </div>

        {/* Consultation Notes */}
        <label style={{ display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>🩺 Consultation Notes</label>
        <textarea value={consultNotes} onChange={e=>setConsultNotes(e.target.value)} rows={3}
          placeholder="Examination findings, diagnosis, observations…" className="input-glass"
          style={{ width:"100%",padding:"12px 14px",borderRadius:14,fontSize:13,resize:"vertical",lineHeight:1.6,border:"1px solid rgba(255,255,255,.2)",marginBottom:20 }}/>

        {/* Prescription Builder */}
        <PrescriptionBuilder value={rxData} onChange={setRxData}/>

        <div style={{ display:"flex",gap:10,marginTop:20 }}>
          <button onClick={onClose} className="liquid-btn" style={{ flex:1,padding:"12px",borderRadius:14,fontSize:14 }}>Cancel</button>
          <button onClick={save} disabled={saving} className="teal-btn" style={{ flex:2,padding:"12px",borderRadius:14,fontSize:14 }}>
            {saving?"Saving…":"💾 Save Consultation"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ADMIN VIEW ─────────────────────────────────────────────────────────── */
function AdminView() {
  const [tab, setTab]           = useState("doctors");
  const [doctors, setDoctors]   = useState([]);
  const [counters, setCounters] = useState([]);
  const [newDoc, setNewDoc]     = useState({ name:"", department:"General OPD" });
  const [newCtr, setNewCtr]     = useState({ name:"", department:"General OPD" });
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  const showMsg = m => { setMsg(m); setTimeout(()=>setMsg(""),3000); };
  const loadDoctors  = async () => { const r=await fetch("/api/doctors");  const d=await r.json(); if(d.doctors)  setDoctors(d.doctors);   };
  const loadCounters = async () => { const r=await fetch("/api/counters"); const d=await r.json(); if(d.counters) setCounters(d.counters); };
  useEffect(()=>{ loadDoctors(); loadCounters(); },[]);

  const addDoctor = async () => {
    if (!newDoc.name.trim()) return; setSaving(true);
    await fetch("/api/doctors",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newDoc)});
    setNewDoc({name:"",department:"General OPD"}); await loadDoctors(); setSaving(false); showMsg("✅ Doctor added!");
  };
  const toggleDoctor = async (id,available) => {
    await fetch("/api/doctors",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,available:!available})});
    await loadDoctors();
  };
  const deleteDoctor = async id => {
    if (!confirm("Remove this doctor?")) return;
    await fetch("/api/doctors",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    await loadDoctors(); showMsg("Doctor removed.");
  };
  const addCounter = async () => {
    if (!newCtr.name.trim()) return; setSaving(true);
    await fetch("/api/counters",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newCtr)});
    setNewCtr({name:"",department:"General OPD"}); await loadCounters(); setSaving(false); showMsg("✅ Counter added!");
  };
  const toggleCounter = async (id,active) => {
    await fetch("/api/counters",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,active:!active})});
    await loadCounters();
  };
  const deleteCounter = async id => {
    if (!confirm("Remove this counter?")) return;
    await fetch("/api/counters",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    await loadCounters(); showMsg("Counter removed.");
  };
  const manualReset = async () => {
    if (!confirm("Archive all old tokens from previous days?")) return;
    const r = await fetch("/api/reset-tokens",{method:"POST"});
    const d = await r.json();
    showMsg(d.message||"✅ Reset done!");
  };

  return (
    <div className="slide-up">
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontSize:26,fontWeight:900,marginBottom:4 }}>⚙ Admin Panel</h2>
          <p style={{ fontSize:12,color:"rgba(255,255,255,.5)" }}>Manage doctors, counters and system settings</p>
        </div>
        <button onClick={manualReset} className="liquid-btn"
          style={{ padding:"8px 16px",borderRadius:12,fontSize:12,border:"1px solid rgba(239,68,68,.3)",color:"#F87171" }}>
          🗑 Archive Old Tokens
        </button>
      </div>
      {msg && <div className="fade-in" style={{ marginBottom:16,padding:"10px 16px",borderRadius:12,background:"rgba(20,184,166,.12)",border:"1px solid rgba(20,184,166,.3)",fontSize:13,fontWeight:700,color:"#5EEAD4" }}>{msg}</div>}
      <div style={{ display:"flex",gap:6,marginBottom:20 }}>
        {[["doctors","👨‍⚕️ Doctors"],["counters","🏥 Counters"]].map(([tb,lb])=>(
          <button key={tb} onClick={()=>setTab(tb)} className={tab===tb?"teal-btn":"liquid-btn"} style={{ padding:"9px 20px",borderRadius:12,fontSize:13 }}>{lb}</button>
        ))}
      </div>

      {tab==="doctors"&&(
        <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <GCard>
            <h3 style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>➕ Add New Doctor</h3>
            <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
              <input value={newDoc.name} onChange={e=>setNewDoc(d=>({...d,name:e.target.value}))} placeholder="e.g. Dr. A. Patel" className="input-glass"
                style={{ flex:2,padding:"11px 14px",borderRadius:12,fontSize:14,border:"1px solid rgba(255,255,255,.2)",minWidth:160 }}/>
              <select value={newDoc.department} onChange={e=>setNewDoc(d=>({...d,department:e.target.value}))} className="select-glass"
                style={{ flex:1,padding:"11px 14px",borderRadius:12,fontSize:13,minWidth:140 }}>
                {DEPTS_LIST.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={addDoctor} disabled={saving} className="teal-btn" style={{ padding:"11px 20px",borderRadius:12,fontSize:13 }}>{saving?"Adding…":"Add"}</button>
            </div>
          </GCard>
          {DEPTS_LIST.map(dept=>{
            const docs=doctors.filter(d=>d.department===dept);
            if(!docs.length)return null;
            return (
              <GCard key={dept}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:DEPT_COLORS[dept]||"#14B8A6" }}/>
                  <h3 style={{ fontSize:13,fontWeight:700 }}>{dept}</h3>
                  <span style={{ fontSize:11,color:"rgba(255,255,255,.4)" }}>({docs.length} doctors)</span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {docs.map(doc=>(
                    <div key={doc.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:12,
                      background:doc.available?"rgba(20,184,166,.08)":"rgba(255,255,255,.04)",
                      border:`1px solid ${doc.available?"rgba(20,184,166,.2)":"rgba(255,255,255,.08)"}` }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:36,height:36,borderRadius:12,background:"linear-gradient(135deg,rgba(20,184,166,.2),rgba(8,145,178,.2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>👨‍⚕️</div>
                        <div>
                          <p style={{ fontSize:13,fontWeight:700 }}>{doc.name}</p>
                          <p style={{ fontSize:10,color:doc.available?"#14B8A6":"rgba(255,255,255,.4)" }}>{doc.available?"● Available":"○ Unavailable"}</p>
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:6 }}>
                        <button onClick={()=>toggleDoctor(doc.id,doc.available)}
                          style={{ padding:"6px 14px",borderRadius:10,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",
                            background:doc.available?"rgba(20,184,166,.2)":"rgba(255,255,255,.1)",color:doc.available?"#14B8A6":"rgba(255,255,255,.6)" }}>
                          {doc.available?"Set Off":"Set On"}
                        </button>
                        <button onClick={()=>deleteDoctor(doc.id)} style={{ padding:"6px 10px",borderRadius:10,fontSize:12,border:"none",cursor:"pointer",background:"rgba(239,68,68,.15)",color:"#F87171" }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </GCard>
            );
          })}
        </div>
      )}

      {tab==="counters"&&(
        <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <GCard>
            <h3 style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>➕ Add New Counter</h3>
            <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
              <input value={newCtr.name} onChange={e=>setNewCtr(c=>({...c,name:e.target.value}))} placeholder="e.g. OPD 4" className="input-glass"
                style={{ flex:2,padding:"11px 14px",borderRadius:12,fontSize:14,border:"1px solid rgba(255,255,255,.2)",minWidth:140 }}/>
              <select value={newCtr.department} onChange={e=>setNewCtr(c=>({...c,department:e.target.value}))} className="select-glass"
                style={{ flex:1,padding:"11px 14px",borderRadius:12,fontSize:13,minWidth:140 }}>
                {DEPTS_LIST.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={addCounter} disabled={saving} className="teal-btn" style={{ padding:"11px 20px",borderRadius:12,fontSize:13 }}>{saving?"Adding…":"Add"}</button>
            </div>
          </GCard>
          {DEPTS_LIST.map(dept=>{
            const ctrs=counters.filter(c=>c.department===dept);
            if(!ctrs.length)return null;
            const activeCtrs=ctrs.filter(c=>c.active).length;
            return (
              <GCard key={dept}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:activeCtrs>0?DEPT_COLORS[dept]||"#14B8A6":"#4B5563" }}/>
                  <h3 style={{ fontSize:13,fontWeight:700 }}>{dept}</h3>
                  <span style={{ fontSize:11,color:activeCtrs>0?"#14B8A6":"rgba(255,255,255,.4)",fontWeight:600 }}>
                    ({activeCtrs} active / {ctrs.length} total)
                    {activeCtrs===0&&<span style={{ color:"#F87171",marginLeft:6,fontSize:10 }}>● DEPT CLOSED</span>}
                  </span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8 }}>
                  {ctrs.map(ctr=>(
                    <div key={ctr.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:12,
                      background:ctr.active?"rgba(20,184,166,.08)":"rgba(255,255,255,.04)",
                      border:`1px solid ${ctr.active?"rgba(20,184,166,.25)":"rgba(255,255,255,.08)"}` }}>
                      <div>
                        <p style={{ fontSize:13,fontWeight:700 }}>{ctr.name}</p>
                        <p style={{ fontSize:10,color:ctr.active?"#14B8A6":"rgba(255,255,255,.4)" }}>{ctr.active?"● Active":"○ Inactive"}</p>
                      </div>
                      <div style={{ display:"flex",gap:4 }}>
                        <button onClick={()=>toggleCounter(ctr.id,ctr.active)}
                          style={{ padding:"5px 8px",borderRadius:8,fontSize:11,border:"none",cursor:"pointer",
                            background:ctr.active?"rgba(20,184,166,.2)":"rgba(255,255,255,.1)",color:ctr.active?"#14B8A6":"rgba(255,255,255,.6)" }}>
                          {ctr.active?"Off":"On"}
                        </button>
                        <button onClick={()=>deleteCounter(ctr.id)} style={{ padding:"5px 8px",borderRadius:8,fontSize:12,border:"none",cursor:"pointer",background:"rgba(239,68,68,.15)",color:"#F87171" }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </GCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── HOME VIEW ──────────────────────────────────────────────────────────── */
function HomeView({ t, setView, queue, openCount }) {
  const [mobile, setMobile]         = useState("");
  const [statusData, setStatusData] = useState(null);
  const [statusLoading, setLoading] = useState(false);
  const [statusErr, setStatusErr]   = useState("");
  const pollRef = useRef(null);

  const waiting2     = queue.filter(q=>q.status==="waiting");
  const waitingCount = waiting2.length;
  const avgWait      = waiting2.length ? Math.round(waiting2.reduce((s,p)=>s+p.wait,0)/waiting2.length) : 0;

  const checkToken = async (mob) => {
    const m=mob||mobile;
    if (m.length<10){setStatusErr("⚠ Enter a valid 10-digit number");return;}
    setLoading(true);setStatusErr("");setStatusData(null);
    try {
      const res=await fetch(`/api/token-status?mobile=${m}`);
      const data=await res.json();
      if(data.found)setStatusData(data.token);
      else{setStatusErr("ℹ No active token found for today.");clearInterval(pollRef.current);}
    }catch{setStatusErr("Network error. Please try again.");}
    finally{setLoading(false);}
  };

  useEffect(()=>{
    if(statusData){clearInterval(pollRef.current);pollRef.current=setInterval(()=>checkToken(mobile),15000);}
    return()=>clearInterval(pollRef.current);
  },[statusData]);

  return (
    <div className="slide-up" style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <GCard style={{ borderRadius:28,padding:"32px 24px",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-60,right:-60,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,.25),transparent 70%)",filter:"blur(20px)" }}/>
        <div style={{ position:"absolute",bottom:-40,left:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,166,35,.2),transparent 70%)",filter:"blur(20px)" }}/>
        <svg style={{ position:"absolute",right:16,bottom:0,opacity:.12,height:140 }} viewBox="0 0 120 140">
          <rect x={20} y={50} width={80} height={90} rx={4} fill="#14B8A6"/>
          <rect x={48} y={20} width={24} height={34} rx={2} fill="#14B8A6"/>
          <rect x={54} y={5} width={12} height={20} rx={1} fill="#14B8A6"/>
          {[[45,60],[59,60],[73,60],[45,80],[59,80],[73,80]].map(([x,y],i)=><rect key={i} x={x} y={y} width={16} height={16} rx={2} fill="rgba(0,0,0,.3)"/>)}
          <rect x={50} y={108} width={20} height={32} rx={3} fill="rgba(0,0,0,.2)"/>
          <rect x={56} y={50} width={8} height={20} rx={1} fill="rgba(255,255,255,.6)"/>
          <rect x={50} y={56} width={20} height={8} rx={1} fill="rgba(255,255,255,.6)"/>
        </svg>
        <div style={{ position:"relative" }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,background:"rgba(20,184,166,.15)",border:"1px solid rgba(20,184,166,.3)",padding:"5px 14px",borderRadius:20,marginBottom:14 }}>
            <div className="blink" style={{ width:6,height:6,borderRadius:"50%",background:"#4ADE80" }}/>
            <span style={{ fontSize:10,fontWeight:700,color:"#4ADE80",letterSpacing:1.5 }}>OPEN · FREE HEALTHCARE · 24×7</span>
          </div>
          <h1 style={{ fontSize:30,fontWeight:900,lineHeight:1.15,letterSpacing:"-.5px",marginBottom:6 }}>{t.welcome}</h1>
          <p style={{ fontSize:13,color:"rgba(255,255,255,.6)",marginBottom:22 }}>{t.tagline}</p>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {[
              {icon:"👥",val:waitingCount,label:"Waiting now",color:"#14B8A6"},
              {icon:"⏱",val:`~${avgWait}m`,label:"Avg wait",color:"#F5A623"},
              {icon:"🏥",val:`${openCount} Open`,label:"Departments",color:"#A78BFA"},
            ].map(s=>(
              <div key={s.label} className="glass" style={{ padding:"10px 16px",borderRadius:14,flex:1,minWidth:90 }}>
                <div style={{ fontSize:18,marginBottom:3 }}>{s.icon}</div>
                <div style={{ fontSize:20,fontWeight:900,color:s.color,lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:9,color:"rgba(255,255,255,.5)",marginTop:3,fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </GCard>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
        <button onClick={()=>setView("book")} className="hover-lift" style={{ borderRadius:24,padding:"24px 16px",background:"linear-gradient(145deg,rgba(20,184,166,.15),rgba(8,145,178,.1))",border:"1px solid rgba(20,184,166,.3)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:14,minHeight:180,backdropFilter:"blur(20px)" }}>
          <div className="pulse-ring" style={{ width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#14B8A6,#0891B2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,boxShadow:"0 6px 24px rgba(20,184,166,.5)" }}>🎤</div>
          <div style={{ textAlign:"center" }}><div style={{ fontWeight:800,fontSize:15,marginBottom:4 }}>{t.tapSpeak}</div><div style={{ fontSize:11,color:"rgba(255,255,255,.55)",lineHeight:1.5 }}>{t.describe}</div></div>
        </button>
        <button onClick={()=>setView("book")} className="hover-lift" style={{ borderRadius:24,padding:"24px 16px",background:"linear-gradient(145deg,rgba(245,166,35,.15),rgba(249,115,22,.1))",border:"1px solid rgba(245,166,35,.3)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:14,minHeight:180,backdropFilter:"blur(20px)" }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#F5A623,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,boxShadow:"0 6px 24px rgba(245,166,35,.4)" }}>📋</div>
          <div style={{ textAlign:"center" }}><div style={{ fontWeight:800,fontSize:15,marginBottom:4 }}>{t.bookManual}</div><div style={{ fontSize:11,color:"rgba(255,255,255,.55)" }}>{t.tapType}</div></div>
        </button>
      </div>

      <GCard style={{ padding:"14px 18px",display:"flex",alignItems:"center",gap:14 }}>
        <div style={{ width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.3))",border:"1px solid rgba(139,92,246,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>📲</div>
        <div style={{ flex:1 }}><div style={{ fontWeight:700,fontSize:13 }}>{t.install}</div><div style={{ fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2 }}>{t.installSub}</div></div>
        <button className="teal-btn" style={{ padding:"7px 16px",borderRadius:10,fontSize:11,flexShrink:0 }}>Install</button>
      </GCard>

      {[{color:"#25D366",icon:"💬",title:t.waBook,sub:"Message 'HI' to +91-97XX-XXXXX",tag:"WhatsApp"},{color:"#6366F1",icon:"📱",title:t.smsBook,sub:"Works on any phone, zero internet"}].map((b,i)=>(
        <GCard key={i} style={{ padding:"14px 18px",display:"flex",alignItems:"center",gap:14,borderLeft:`3px solid ${b.color}`,borderTopLeftRadius:0,borderBottomLeftRadius:0 }}>
          <div style={{ width:42,height:42,borderRadius:12,background:`${b.color}20`,border:`1px solid ${b.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{b.icon}</div>
          <div style={{ flex:1 }}><div style={{ fontWeight:700,fontSize:13 }}>{b.title}</div><div style={{ fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2 }}>{b.sub}</div></div>
          {b.tag&&<span style={{ fontSize:10,fontWeight:700,color:b.color,background:`${b.color}20`,padding:"3px 10px",borderRadius:20,border:`1px solid ${b.color}30` }}>{b.tag}</span>}
        </GCard>
      ))}

      <GCard>
        <div style={{ fontWeight:700,fontSize:13,marginBottom:12 }}>🔍 {t.checkStatus}</div>
        <div style={{ display:"flex",gap:8 }}>
          <input type="tel" maxLength={10} value={mobile} onChange={e=>setMobile(e.target.value)} onKeyDown={e=>e.key==="Enter"&&checkToken()}
            placeholder={t.enterMobile} className="input-glass"
            style={{ flex:1,padding:"11px 14px",borderRadius:12,fontSize:14,border:"1px solid rgba(255,255,255,.2)" }}/>
          <button onClick={()=>checkToken()} disabled={statusLoading} className="teal-btn" style={{ padding:"11px 18px",borderRadius:12,fontSize:12,flexShrink:0 }}>
            {statusLoading?"…":t.checkBtn}
          </button>
        </div>
        {statusErr&&<div style={{ marginTop:10,padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,.05)",fontSize:12,color:"rgba(255,255,255,.6)" }}>{statusErr}</div>}
        {statusData&&(
          <div className="fade-in" style={{ marginTop:12,padding:16,borderRadius:16,background:"rgba(20,184,166,.1)",border:"1px solid rgba(20,184,166,.3)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <span style={{ fontSize:28,fontWeight:900,color:"#F5A623",letterSpacing:"-1px" }}>{statusData.token_number}</span>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span className="chip" style={{ background:statusData.status==="called"?"#A78BFA":statusData.status==="waiting"?"#14B8A6":"#059669",color:"#fff" }}>{statusData.status?.toUpperCase()}</span>
                <span style={{ fontSize:9,color:"rgba(255,255,255,.4)" }}>auto-refreshing</span>
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {[{l:"Department",v:statusData.department},{l:"Est. Wait",v:`~${statusData.wait_minutes} mins`},{l:"Counter",v:statusData.counter||"—"},{l:"Doctor",v:statusData.doctor||"—"},{l:"Position",v:`#${statusData.position} in line`}].map(s=>(
                <div key={s.l} style={{ padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,.05)" }}>
                  <p style={{ fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3 }}>{s.l}</p>
                  <p style={{ fontSize:12,fontWeight:700 }}>{s.v}</p>
                </div>
              ))}
            </div>
            {statusData.status==="called"&&(
              <div style={{ marginTop:10,padding:"8px 12px",borderRadius:10,background:"rgba(167,139,250,.15)",border:"1px solid rgba(167,139,250,.3)",textAlign:"center" }}>
                <span style={{ fontSize:12,fontWeight:700,color:"#A78BFA" }}>📢 Your turn! Please proceed to {statusData.counter}</span>
              </div>
            )}
          </div>
        )}
      </GCard>
      <div style={{ textAlign:"center",fontSize:10,color:"rgba(255,255,255,.3)",fontWeight:500 }}>
        Govt. of Gujarat · Free Healthcare · 24×7 Helpline: <span style={{ color:"#14B8A6",fontWeight:700 }}>104</span>
      </div>
    </div>
  );
}

/* ─── BOOK VIEW ──────────────────────────────────────────────────────────── */
function BookView({ t, lang, setView, activeDepts }) {
  const [step, setStep]         = useState(0);
  const [dept, setDept]         = useState(null);
  const [mobile, setMobile]     = useState("");
  const [patientName, setName]  = useState("");
  const [otp, setOtp]           = useState(["","","","","",""]);
  const [otpErr, setOtpErr]     = useState("");
  const [vState, setVState]     = useState("idle");
  const [transcript, setTrans]  = useState("");
  const [nlp, setNlp]           = useState(null);
  const [nlpLoad, setNlpLoad]   = useState(false);
  const [selSym, setSelSym]     = useState([]);
  const [search, setSearch]     = useState("");
  const [booking, setBooking]   = useState(false);
  const recRef    = useRef(null);
  const otpRef    = useRef([]);
  const tokenNum  = useRef("");
  const tokenData = useRef(null);
  const steps = ["Dept","Details","OTP","Symptoms","Done"];

  const sendOTP   = () => { setOtpErr(""); setStep(2); };
  const verifyOTP = () => { if(otp.join("")==="123456")setStep(3); else setOtpErr("Incorrect OTP. Use 123456"); };
  const handleOtp = (i,v) => { if(!/^[0-9]?$/.test(v))return; const n=[...otp];n[i]=v;setOtp(n);if(v&&i<5)otpRef.current[i+1]?.focus(); };
  const startVoice = () => {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert(t.voiceNA);return;}
    const r=new SR();r.lang=lang==="HI"?"hi-IN":lang==="GU"?"gu-IN":"en-IN";r.interimResults=true;
    r.onresult=e=>setTrans(Array.from(e.results).map(x=>x[0].transcript).join(""));
    r.onend=()=>setVState("done");r.start();recRef.current=r;setVState("listening");
  };
  const stopVoice = ()=>recRef.current?.stop();
  useEffect(()=>{if(vState==="done"&&transcript){setNlpLoad(true);extractSymptomsAI(transcript,lang).then(r=>{setNlp(r);setNlpLoad(false);});}},[vState]);
  const pickSym = async sym=>{
    const next=selSym.includes(sym)?selSym.filter(x=>x!==sym):[...selSym,sym];setSelSym(next);
    if(!nlp&&next.length>0){setNlpLoad(true);const r=await extractSymptomsAI(next.join(", "),lang);setNlp(r);setNlpLoad(false);}
  };
  const bookToken = async()=>{
    if(!canNext||booking)return;setBooking(true);
    try{
      const res=await fetch("/api/book-token",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mobile,patient_name:patientName,department:dept?.label||"General OPD",symptoms_raw:transcript||selSym.join(", "),clinical_tags:nlp?.clinical_tags||selSym,urgency:nlp?.urgency||"yellow"})});
      const data=await res.json();
      if(data.success){tokenNum.current=data.token.token_number;tokenData.current=data.token;setStep(4);}
      else alert("Booking failed. Please try again.");
    }catch{alert("Network error.");}finally{setBooking(false);}
  };
  const canNext=nlp||selSym.length>0;
  const urgColor={red:"#DC2626",yellow:"#D97706",green:"#059669"}[nlp?.urgency]||"#D97706";
  const reset=()=>{setStep(0);setDept(null);setMobile("");setName("");setOtp(["","","","","",""]);setVState("idle");setTrans("");setNlp(null);setSelSym([]);setSearch("");};

  return (
    <div className="slide-up">
      <div style={{ display:"flex",gap:3,marginBottom:24 }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:"center",flex:1,gap:5 }}>
            <div style={{ width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,transition:"all .35s",
              background:i<step?"linear-gradient(135deg,#14B8A6,#0891B2)":i===step?"linear-gradient(135deg,#F5A623,#F97316)":"rgba(255,255,255,.1)",color:"#fff",
              boxShadow:i<step?"0 2px 10px rgba(20,184,166,.4)":i===step?"0 2px 10px rgba(245,166,35,.4)":"none" }}>{i<step?"✓":i+1}</div>
            <div style={{ height:3,width:"100%",borderRadius:2,transition:"all .35s",background:i<step?"linear-gradient(90deg,#14B8A6,#0891B2)":i===step?"linear-gradient(90deg,#F5A623,#F97316)":"rgba(255,255,255,.08)" }}/>
            <span style={{ fontSize:8,color:"rgba(255,255,255,.5)",textAlign:"center",fontWeight:600,letterSpacing:.3 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Step 0 — Department — with availability check */}
      {step===0&&(
        <div className="fade-in">
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:22,fontWeight:900,marginBottom:4 }}>{t.chooseDept}</h2>
            <p style={{ fontSize:13,color:"rgba(255,255,255,.5)" }}>Select an available department</p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            {ALL_DEPTS.map(d=>{
              const isActive = activeDepts.has(d.label);
              return (
                <button key={d.id}
                  onClick={()=>{ if(!isActive) return; setDept(d); setStep(1); }}
                  className={isActive?"hover-lift glass-card":"glass-card"}
                  style={{ padding:"20px 14px",borderRadius:20,
                    border:`1px solid ${dept?.id===d.id?"rgba(20,184,166,.5)":isActive?"rgba(255,255,255,.1)":"rgba(255,255,255,.04)"}`,
                    cursor:isActive?"pointer":"not-allowed",display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                    background:!isActive?"rgba(0,0,0,.2)":dept?.id===d.id?"rgba(20,184,166,.12)":"rgba(255,255,255,.04)",
                    transition:"all .2s",opacity:isActive?1:.5,position:"relative",overflow:"hidden" }}>
                  <div style={{ width:58,height:58,borderRadius:18,background:isActive?d.grad:"linear-gradient(135deg,#374151,#4B5563)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:"0 4px 16px rgba(0,0,0,.3)" }}>{d.icon}</div>
                  <span style={{ fontSize:12,fontWeight:700,color:isActive?"#fff":"rgba(255,255,255,.4)",textAlign:"center",lineHeight:1.3 }}>{d.label}</span>
                  {!isActive && (
                    <div style={{ position:"absolute",top:8,right:8,background:"rgba(239,68,68,.2)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"2px 8px" }}>
                      <span style={{ fontSize:9,fontWeight:700,color:"#F87171" }}>● {t.notAvail}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize:11,color:"rgba(255,255,255,.35)",textAlign:"center",marginTop:14 }}>
            Departments shown as unavailable have no active counters. Contact admin to enable.
          </p>
        </div>
      )}

      {/* Step 1 — Details */}
      {step===1&&(
        <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <h2 style={{ fontSize:22,fontWeight:900,marginBottom:4 }}>{t.s1title}</h2>
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.08)",padding:"4px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,.12)" }}>
              <span>{dept?.icon}</span><span style={{ fontSize:11,fontWeight:600,color:"rgba(255,255,255,.7)" }}>{dept?.label}</span>
            </div>
          </div>
          <GCard>
            <label style={{ display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:8,textTransform:"uppercase",letterSpacing:1 }}>👤 Full Name</label>
            <input type="text" value={patientName} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" className="input-glass"
              style={{ width:"100%",padding:"13px 16px",borderRadius:14,fontSize:15,fontWeight:600,border:`1px solid ${patientName?"rgba(20,184,166,.5)":"rgba(255,255,255,.15)"}` }}/>
          </GCard>
          <GCard>
            <label style={{ display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:8,textTransform:"uppercase",letterSpacing:1 }}>📱 Mobile Number</label>
            <div style={{ display:"flex",alignItems:"center",border:`1px solid ${mobile?"rgba(20,184,166,.5)":"rgba(255,255,255,.15)"}`,borderRadius:14,overflow:"hidden",marginBottom:12,background:"rgba(255,255,255,.06)" }}>
              <span style={{ padding:"0 14px",fontSize:13,color:"rgba(255,255,255,.5)",fontWeight:700,borderRight:"1px solid rgba(255,255,255,.1)",alignSelf:"stretch",display:"flex",alignItems:"center" }}>+91</span>
              <input type="tel" maxLength={10} value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="XXXXX XXXXX"
                style={{ flex:1,padding:"13px 14px",fontSize:20,fontWeight:700,letterSpacing:3,border:"none",outline:"none",background:"transparent",color:"#fff" }}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
              {[1,2,3,4,5,6,7,8,9,"*",0,"⌫"].map(d=>(
                <button key={d} onClick={()=>{if(d==="⌫")setMobile(m=>m.slice(0,-1));else if(mobile.length<10)setMobile(m=>m+d);}}
                  className="liquid-btn" style={{ padding:"12px 0",borderRadius:12,fontSize:17,fontWeight:700 }}>{d}</button>
              ))}
            </div>
          </GCard>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(0)} className="liquid-btn" style={{ flex:1,padding:"13px",borderRadius:14,fontSize:14 }}>{t.back}</button>
            <button onClick={()=>{if(mobile.length>=10&&patientName.trim())sendOTP();}} className="teal-btn"
              style={{ flex:2,padding:"13px",borderRadius:14,fontSize:15,opacity:(mobile.length>=10&&patientName.trim())?1:.5 }}>{t.next}</button>
          </div>
        </div>
      )}

      {/* Step 2 — OTP */}
      {step===2&&(
        <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <h2 style={{ fontSize:22,fontWeight:900 }}>{t.s1otp}</h2>
          <GCard style={{ textAlign:"center" }}>
            <div style={{ width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.3))",border:"1px solid rgba(139,92,246,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px" }}>📱</div>
            <p style={{ fontSize:13,color:"rgba(255,255,255,.6)",marginBottom:6 }}>{t.s1sent} <b style={{ color:"#fff" }}>+91-{mobile}</b></p>
            <div style={{ display:"inline-flex",alignItems:"center",gap:10,background:"rgba(245,166,35,.12)",border:"1px solid rgba(245,166,35,.35)",padding:"10px 20px",borderRadius:16,marginBottom:22 }}>
              <span style={{ fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:600 }}>Demo OTP:</span>
              <div style={{ display:"flex",gap:4 }}>
                {["1","2","3","4","5","6"].map((d,i)=>(
                  <div key={i} style={{ width:28,height:32,borderRadius:8,background:"rgba(245,166,35,.2)",border:"1px solid rgba(245,166,35,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#F5A623" }}>{d}</div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:14 }}>
              {otp.map((v,i)=>(
                <input key={i} ref={el=>otpRef.current[i]=el} type="tel" maxLength={1} value={v}
                  onChange={e=>handleOtp(i,e.target.value)} onKeyDown={e=>{if(e.key==="Backspace"&&!v&&i>0)otpRef.current[i-1]?.focus();}}
                  style={{ width:48,height:58,textAlign:"center",fontSize:24,fontWeight:900,borderRadius:14,border:`1px solid ${v?"rgba(20,184,166,.6)":"rgba(255,255,255,.15)"}`,outline:"none",color:"#fff",background:v?"rgba(20,184,166,.12)":"rgba(255,255,255,.06)",transition:"all .2s",backdropFilter:"blur(12px)" }}/>
              ))}
            </div>
            {otpErr&&<p style={{ color:"#F87171",fontSize:12,marginBottom:8,fontWeight:600 }}>{otpErr}</p>}
            <button onClick={()=>setStep(1)} style={{ fontSize:12,color:"#60A5FA",background:"none",border:"none",cursor:"pointer" }}>{t.s1resend}</button>
          </GCard>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(1)} className="liquid-btn" style={{ flex:1,padding:"13px",borderRadius:14,fontSize:14 }}>{t.back}</button>
            <button onClick={verifyOTP} className="teal-btn" style={{ flex:2,padding:"13px",borderRadius:14,fontSize:15 }}>{t.s1verify}</button>
          </div>
        </div>
      )}

      {/* Step 3 — Symptoms */}
      {step===3&&(
        <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div><h2 style={{ fontSize:22,fontWeight:900,marginBottom:4 }}>{t.s2title}</h2><p style={{ fontSize:13,color:"rgba(255,255,255,.5)" }}>Hi <b style={{ color:"#14B8A6" }}>{patientName}</b></p></div>
          <GCard>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:14 }}>
              <button onMouseDown={startVoice} onMouseUp={stopVoice} onTouchStart={startVoice} onTouchEnd={stopVoice}
                className={vState==="listening"?"mic-pulse":vState==="idle"?"pulse-ring":""}
                style={{ width:84,height:84,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,border:"none",cursor:"pointer",
                  background:vState==="listening"?"linear-gradient(135deg,#DC2626,#EF4444)":vState==="done"?"linear-gradient(135deg,#059669,#14B8A6)":"linear-gradient(135deg,#0A1628,#1246A0)",color:"#fff",boxShadow:"0 8px 32px rgba(0,0,0,.4)" }}>
                {vState==="listening"?"⏹":vState==="done"?"✓":"🎤"}
              </button>
              <p style={{ fontSize:12,fontWeight:700,color:vState==="listening"?"#F87171":vState==="done"?"#34D399":"rgba(255,255,255,.6)" }}>
                {vState==="idle"?t.holdSpeak:vState==="listening"?t.listening:t.processing}
              </p>
              {vState==="listening"&&<div style={{ display:"flex",gap:3,alignItems:"flex-end",height:36 }}>{Array.from({length:18}).map((_,i)=><div key={i} className="wave-bar" style={{ width:3,borderRadius:2,background:`hsl(${160+i*4},80%,60%)`,animationDelay:`${i*.07}s`,height:`${10+Math.random()*16}px` }}/>)}</div>}
              {transcript&&<div style={{ padding:"10px 16px",background:"rgba(255,255,255,.06)",borderRadius:14,border:"1px solid rgba(255,255,255,.12)",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,.85)",width:"100%",lineHeight:1.6 }}>"{transcript}"</div>}
            </div>
            {nlpLoad&&<div style={{ textAlign:"center",padding:16,color:"rgba(255,255,255,.5)",fontSize:13 }}>🤖 {t.processing}</div>}
            {nlp&&!nlpLoad&&(
              <div className="fade-in" style={{ marginTop:14,padding:16,borderRadius:16,border:`1px solid ${urgColor}40`,background:`${urgColor}10` }}>
                <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8 }}>
                  <span className="chip" style={{ background:urgColor,color:"#fff" }}>{nlp.urgency?.toUpperCase()}</span>
                  <span style={{ fontSize:13,fontWeight:700 }}>→ {nlp.department}</span>
                </div>
                <p style={{ fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:10 }}>{nlp.summary}</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>{nlp.clinical_tags?.map(tag=><span key={tag} className="chip" style={{ background:"rgba(20,184,166,.15)",color:"#14B8A6",border:"1px solid rgba(20,184,166,.3)" }}>[{tag}]</span>)}</div>
              </div>
            )}
          </GCard>
          <GCard>
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.06)",borderRadius:12,padding:"9px 14px",marginBottom:12,border:"1px solid rgba(255,255,255,.1)" }}>
              <span style={{ fontSize:15 }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.searchSym}
                style={{ flex:1,fontSize:13,border:"none",outline:"none",background:"transparent",color:"#fff" }}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
              {t.symptoms.map((s,i)=>(
                <button key={s} onClick={()=>pickSym(s)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 8px",borderRadius:16,cursor:"pointer",transition:"all .18s",
                  border:`1px solid ${selSym.includes(s)?"rgba(20,184,166,.5)":"rgba(255,255,255,.1)"}`,
                  background:selSym.includes(s)?"rgba(20,184,166,.15)":"rgba(255,255,255,.04)",backdropFilter:"blur(12px)" }}>
                  <span style={{ fontSize:26 }}>{SYM_ICONS[i]}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:selSym.includes(s)?"#14B8A6":"rgba(255,255,255,.8)",textAlign:"center" }}>{s}</span>
                </button>
              ))}
            </div>
          </GCard>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setStep(2)} className="liquid-btn" style={{ flex:1,padding:"13px",borderRadius:14,fontSize:14 }}>{t.back}</button>
            <button onClick={bookToken} disabled={!canNext||booking} className="teal-btn" style={{ flex:2,padding:"13px",borderRadius:14,fontSize:15,opacity:canNext?1:.5 }}>
              {booking?"Booking…":t.next}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Success */}
      {step===4&&(
        <div className="fade-in" style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:18,textAlign:"center" }}>
          <div style={{ width:70,height:70,borderRadius:"50%",background:"linear-gradient(135deg,rgba(5,150,105,.4),rgba(20,184,166,.4))",border:"1px solid rgba(20,184,166,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:"0 6px 24px rgba(20,184,166,.3)" }}>✅</div>
          <div><h2 style={{ fontSize:26,fontWeight:900,marginBottom:6 }}>{t.s3title}</h2><p style={{ fontSize:14,color:"rgba(255,255,255,.6)" }}>Welcome, <b style={{ color:"#14B8A6" }}>{patientName}</b></p></div>
          <div className="token-pop" style={{ width:"100%",borderRadius:28,padding:"32px 26px",position:"relative",overflow:"hidden",background:"linear-gradient(145deg,#050D1F,#0A2040,#081830)",border:"1px solid rgba(20,184,166,.3)",boxShadow:"0 20px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08)" }}>
            <div style={{ position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,.2),transparent 70%)",filter:"blur(20px)" }}/>
            <div style={{ position:"relative" }}>
              <p style={{ fontSize:10,color:"rgba(255,255,255,.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>UPHC · {dept?.label||"General OPD"} · {new Date().toLocaleDateString("en-IN")}</p>
              <div style={{ fontSize:88,fontWeight:900,color:"#F5A623",lineHeight:1,letterSpacing:"-3px",textShadow:"0 4px 24px rgba(245,166,35,.4)",marginBottom:6 }}>{tokenNum.current}</div>
              <p style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:20 }}>Your queue number</p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,background:"rgba(255,255,255,.06)",borderRadius:16,overflow:"hidden",marginBottom:20 }}>
                {[{l:t.waitTime,v:`${tokenData.current?.wait_minutes||20} ${t.mins}`,c:"#14B8A6"},{l:"Counter",v:tokenData.current?.counter_name||"OPD 1",c:"#fff"},{l:"Doctor",v:tokenData.current?.doctor_name||"Dr. Shah",c:"#fff"}].map((x,i)=>(
                  <div key={i} style={{ padding:"14px 10px",background:"rgba(255,255,255,.04)",textAlign:"center" }}>
                    <p style={{ fontSize:9,color:"rgba(255,255,255,.4)",marginBottom:5,textTransform:"uppercase",letterSpacing:.5 }}>{x.l}</p>
                    <p style={{ fontSize:14,fontWeight:900,color:x.c,lineHeight:1.2 }}>{x.v}</p>
                  </div>
                ))}
              </div>
              <svg width="80" height="80" style={{ display:"block",margin:"0 auto",background:"#fff",borderRadius:12,padding:8 }} viewBox="0 0 7 7">
                {[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],[0,4],[0,5],[0,6],[1,4],[2,4],[2,5],[2,6],[4,4],[6,4],[4,5],[5,6],[3,3],[3,0],[3,2]].map(([x,y],i)=>(<rect key={i} x={x} y={y} width={1} height={1} fill="#050D1F"/>))}
              </svg>
              <p style={{ fontSize:9,color:"rgba(255,255,255,.3)",marginTop:8 }}>Show at counter · Valid today only</p>
            </div>
          </div>
          <div style={{ width:"100%",padding:"14px 18px",borderRadius:18,background:"rgba(20,184,166,.12)",border:"1px solid rgba(20,184,166,.3)" }}>
            <p style={{ fontWeight:700,fontSize:13,color:"#5EEAD4" }}>📲 {t.tokenSent}</p>
            <p style={{ fontSize:11,color:"rgba(255,255,255,.5)",marginTop:4 }}>{t.notifyMsg}</p>
          </div>
          <div style={{ display:"flex",gap:10,width:"100%" }}>
            <button onClick={()=>window.print()} className="liquid-btn" style={{ flex:1,padding:"12px",borderRadius:14,fontSize:12 }}>🖨 {t.printToken}</button>
            <button onClick={()=>window.alert("SMS sent to +91-"+mobile)} style={{ flex:1,padding:"12px",borderRadius:14,background:"linear-gradient(135deg,#25D366,#128C7E)",border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>💬 Share</button>
          </div>
          <button onClick={reset} className="teal-btn" style={{ width:"100%",padding:"15px",borderRadius:18,fontSize:15 }}>← Book Another Token</button>
        </div>
      )}
    </div>
  );
}

/* ─── CHAT VIEW ──────────────────────────────────────────────────────────── */
function ChatView() {
  const msgs=[{f:"bot",m:"🏥 *Welcome to UPHC Queue Bot!*\n\nDescribe your problem or reply:\n*1* Fever  *2* Cough  *3* Stomach\n*4* Pregnancy  *5* Vaccine  *6* Other",t:"9:30"},{f:"usr",m:"Pet dukhe che",t:"9:31"},{f:"bot",m:"🤖 *Understood: Stomach Ache*\n\n✅ Token: *A-42*  ⏳ ~22 mins\n🏥 Counter: *OPD 3*  👨‍⚕️ Dr. Shah",t:"9:31"},{f:"usr",m:"Ok, shukriya",t:"9:32"},{f:"bot",m:"📢 *UPHC Alert — Token A-42*\n10 mins to go. Please be ready at OPD Counter 3. 🙏",t:"9:51"}];
  return (
    <div className="slide-up" style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <h2 style={{ textAlign:"center",fontSize:20,fontWeight:900 }}>Offline Booking Channels</h2>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
          <p style={{ fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1.5 }}>WhatsApp Bot</p>
          <div className="hover-lift" style={{ width:"100%",maxWidth:230,borderRadius:24,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,.5)",border:"1px solid rgba(255,255,255,.1)" }}>
            <div style={{ background:"#1E2B1A",padding:"6px 12px",display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,.6)" }}><span>9:51</span><span>📶 🔋</span></div>
            <div style={{ background:"#075E54",display:"flex",alignItems:"center",gap:8,padding:"10px 12px" }}><div style={{ width:32,height:32,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>🏥</div><div><p style={{ color:"#fff",fontWeight:700,fontSize:12 }}>UPHC Health Bot</p><p style={{ color:"rgba(255,255,255,.6)",fontSize:9 }}>🟢 Online</p></div></div>
            <div style={{ background:"#ECE5DD",padding:"8px 7px",minHeight:290,display:"flex",flexDirection:"column",gap:5 }}>
              {msgs.map((m,i)=>(<div key={i} style={{ display:"flex",justifyContent:m.f==="usr"?"flex-end":"flex-start" }}><div style={{ maxWidth:"88%",borderRadius:10,padding:"6px 9px",background:m.f==="usr"?"#DCF8C6":"#fff" }}><p style={{ fontSize:9,whiteSpace:"pre-wrap",color:"#111",lineHeight:1.5 }} dangerouslySetInnerHTML={{__html:m.m.replace(/\*(.*?)\*/g,"<b>$1</b>")}}/><p style={{ fontSize:7,textAlign:"right",color:"#888",marginTop:2 }}>{m.t}</p></div></div>))}
            </div>
            <div style={{ display:"flex",gap:6,padding:"7px 8px",background:"#F0F0F0",alignItems:"center" }}><div style={{ flex:1,background:"#fff",borderRadius:20,padding:"6px 10px",fontSize:9,color:"#888" }}>Type…</div><div style={{ width:28,height:28,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>🎤</div></div>
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
          <p style={{ fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1.5 }}>SMS — Feature Phone</p>
          <div style={{ width:"100%",maxWidth:175,borderRadius:20,overflow:"hidden",background:"#2D2D2D",border:"5px solid #2D2D2D" }}>
            <div style={{ background:"#9BA888",padding:"12px 10px",minHeight:160 }}><p style={{ fontSize:9,fontFamily:"monospace",color:"#2D4A0E",lineHeight:1.8 }}><b>📩 New Message</b><br/>From: UPHC-104<br/>──────────────<br/><b>UPHC ALERT: Token A-42. OPD 3 in 30 mins.</b></p></div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,padding:5,background:"#333" }}>{[1,2,3,4,5,6,7,8,9,"*",0,"#"].map(k=><div key={k} style={{ padding:"8px 0",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",background:"#444",borderRadius:3 }}>{k}</div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DASH VIEW ──────────────────────────────────────────────────────────── */
function DashView({ t, queue, doneCount, updateStatus }) {
  const [filter, setFilter]         = useState("all");
  const [tab, setTab]               = useState("queue");
  const [calling, setCalling]       = useState({});
  const [notesModal, setNotesModal] = useState(null);
  const [localQueue, setLocalQueue] = useState(queue);

  useEffect(()=>setLocalQueue(queue),[queue]);

  const handleNoteSave = (dbId,notes,prescriptionJson) =>
    setLocalQueue(q=>q.map(p=>p.dbId===dbId?{...p,notes,prescription:prescriptionJson}:p));

  const waiting = localQueue.filter(p=>p.status==="waiting");
  const called  = localQueue.filter(p=>p.status==="called");
  const stats   = { waiting:waiting.length,called:called.length,urgent:localQueue.filter(p=>p.urgency==="red").length,avg:waiting.length?Math.round(waiting.reduce((s,p)=>s+p.wait,0)/waiting.length):0 };

  const handleAction = async (p,action) => {
    if(action==="callin"){ setCalling(c=>({...c,[p.id]:true})); await updateStatus(p.dbId,"called"); setCalling(c=>({...c,[p.id]:false})); }
    else if(action==="noshow") await updateStatus(p.dbId,"noshow");
    else if(action==="done")   await updateStatus(p.dbId,"completed");
  };

  const getPrescriptionText = (prescriptionJson) => {
    if (!prescriptionJson) return null;
    try {
      const rx = JSON.parse(prescriptionJson);
      if (!rx.items?.length) return rx.notes || null;
      return rx.items.map((item,i)=>`${i+1}. ${item.name} ${item.strength} — ${item.freq} × ${item.duration}, ${item.timing}`).join("\n");
    } catch { return prescriptionJson; }
  };

  const hourly=[{l:"8-9",n:12},{l:"9-10",n:19},{l:"10-11",n:24},{l:"11-12",n:20},{l:"12-1",n:9},{l:"1-2",n:6}];
  const maxH=Math.max(...hourly.map(d=>d.n));
  const deptDist=[{d:"General OPD",n:14,c:"#3B82F6"},{d:"Maternity",n:3,c:"#A78BFA"},{d:"Vaccination",n:5,c:"#10B981"},{d:"Dental",n:2,c:"#F59E0B"},{d:"Eye/ENT",n:1,c:"#06B6D4"}];
  const total=deptDist.reduce((s,d)=>s+d.n,0);
  const filtered=filter==="all"?localQueue:filter==="called"?called:localQueue.filter(p=>p.urgency===filter&&p.status==="waiting");

  return (
    <div className="slide-up">
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontSize:26,fontWeight:900,marginBottom:4 }}>{t.dashboard}</h2>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <div className="blink" style={{ width:7,height:7,borderRadius:"50%",background:"#4ADE80" }}/>
            <span style={{ fontSize:11,color:"rgba(255,255,255,.5)",fontWeight:600 }}>LIVE · Supabase Realtime · Today only</span>
          </div>
        </div>
        <div style={{ display:"flex",gap:6 }}>
          {[["queue","🗂 Queue"],["analytics","📊 Analytics"]].map(([tb,lb])=>(
            <button key={tb} onClick={()=>setTab(tb)} className={tab===tb?"teal-btn":"liquid-btn"} style={{ padding:"8px 16px",borderRadius:12,fontSize:12 }}>{lb}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20 }}>
        {[{l:"Waiting",v:stats.waiting,c:"#14B8A6",i:"👥",g:"linear-gradient(135deg,rgba(20,184,166,.2),rgba(8,145,178,.1))"},
          {l:"Called In",v:stats.called,c:"#A78BFA",i:"📢",g:"linear-gradient(135deg,rgba(167,139,250,.2),rgba(139,92,246,.1))"},
          {l:"Urgent",v:stats.urgent,c:"#F87171",i:"🚨",g:"linear-gradient(135deg,rgba(248,113,113,.2),rgba(220,38,38,.1))"},
          {l:t.doneToday,v:doneCount,c:"#4ADE80",i:"✅",g:"linear-gradient(135deg,rgba(74,222,128,.2),rgba(5,150,105,.1))"}].map(s=>(
          <div key={s.l} className="glass-card hover-lift" style={{ borderRadius:18,padding:"16px 12px",textAlign:"center",background:s.g }}>
            <div style={{ fontSize:22,marginBottom:6 }}>{s.i}</div>
            <div style={{ fontSize:30,fontWeight:900,color:s.c,lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:9,color:"rgba(255,255,255,.5)",marginTop:5,fontWeight:700,textTransform:"uppercase",letterSpacing:.5 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {tab==="queue"&&(
        <>
          <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap" }}>
            {[["all","All"],["called","📢 Called"],["red","🚨 Urgent"],["yellow","⚡ Standard"],["green","✅ Routine"]].map(([f,l])=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:"6px 14px",borderRadius:10,fontSize:11,fontWeight:700,border:"1px solid rgba(255,255,255,.12)",cursor:"pointer",transition:"all .2s",
                background:filter===f?"linear-gradient(135deg,#14B8A6,#0891B2)":"rgba(255,255,255,.06)",color:"#fff" }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
            {filtered.map(p=>{
              const tc=TC[p.urgency]||TC.yellow;
              const isCalled=p.status==="called";
              const rxText=getPrescriptionText(p.prescription);
              return (
                <div key={p.id} className="glass-card hover-lift" style={{ borderRadius:22,padding:18,
                  background:isCalled?"linear-gradient(145deg,rgba(167,139,250,.12),rgba(139,92,246,.08))":"rgba(255,255,255,.04)",
                  borderLeft:`3px solid ${isCalled?"#A78BFA":tc.badge}`,boxShadow:"0 8px 32px rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.08)" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                    <div style={{ display:"flex",gap:7,alignItems:"center",flexWrap:"wrap" }}>
                      <span style={{ fontSize:22,fontWeight:900,letterSpacing:"-.5px" }}>{p.id}</span>
                      <span className="chip" style={{ background:isCalled?"#A78BFA":tc.badge,color:"#fff" }}>{isCalled?"CALLED":tc.label}</span>
                      <span className="chip" style={{ background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",border:"1px solid rgba(255,255,255,.12)" }}>{p.dept}</span>
                    </div>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,.5)",fontWeight:700 }}>⏳ {p.wait}m</span>
                  </div>
                  <p style={{ fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:5,fontWeight:600 }}>👤 {p.name} · {p.time}</p>
                  <p style={{ fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:10 }}>👨‍⚕️ {p.doctor} · 🏥 {p.counter}</p>
                  <div style={{ background:"rgba(255,255,255,.04)",borderRadius:12,padding:"10px 12px",marginBottom:10,border:"1px solid rgba(255,255,255,.08)" }}>
                    <p style={{ fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5 }}>Patient's Words</p>
                    <p style={{ fontSize:12,fontStyle:"italic",color:"rgba(255,255,255,.8)",lineHeight:1.5 }}>"{p.raw}"</p>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <p style={{ fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6 }}>AI Clinical Tags</p>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                      {p.clinical.map(c=><span key={c} className="chip" style={{ background:"rgba(20,184,166,.15)",color:"#14B8A6",border:"1px solid rgba(20,184,166,.25)" }}>{c}</span>)}
                    </div>
                  </div>
                  {rxText&&(
                    <div style={{ marginBottom:10,padding:"8px 12px",borderRadius:10,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.2)" }}>
                      <p style={{ fontSize:9,color:"rgba(167,139,250,.7)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4 }}>💊 Prescription</p>
                      <p style={{ fontSize:11,color:"rgba(255,255,255,.7)",fontFamily:"monospace",lineHeight:1.6,whiteSpace:"pre-wrap" }}>{rxText}</p>
                    </div>
                  )}
                  <div style={{ display:"flex",gap:6 }}>
                    {!isCalled?(
                      <button onClick={()=>handleAction(p,"callin")} disabled={calling[p.id]} className="teal-btn" style={{ flex:2,padding:"9px",borderRadius:12,fontSize:11,opacity:calling[p.id]?.7:1 }}>
                        {calling[p.id]?"Calling…":`📢 ${t.callIn}`}
                      </button>
                    ):(
                      <div style={{ flex:2,padding:"9px",borderRadius:12,background:"rgba(167,139,250,.15)",color:"#A78BFA",fontSize:11,fontWeight:700,textAlign:"center",border:"1px solid rgba(167,139,250,.3)" }}>📢 Called In</div>
                    )}
                    <button onClick={()=>handleAction(p,"noshow")} className="liquid-btn" style={{ flex:1,padding:"9px",borderRadius:12,fontSize:11 }}>🚫</button>
                    <button onClick={()=>handleAction(p,"done")} style={{ padding:"9px 12px",borderRadius:12,background:"linear-gradient(135deg,#059669,#14B8A6)",border:"none",color:"#fff",fontSize:16,cursor:"pointer" }}>✅</button>
                    <button onClick={()=>setNotesModal(p)} style={{ padding:"9px 12px",borderRadius:12,background:"linear-gradient(135deg,rgba(99,102,241,.3),rgba(139,92,246,.3))",border:"1px solid rgba(139,92,246,.3)",color:"#A78BFA",fontSize:11,fontWeight:700,cursor:"pointer" }}>📋</button>
                  </div>
                </div>
              );
            })}
            {!filtered.length&&<div style={{ gridColumn:"1/-1",textAlign:"center",padding:"60px 0",color:"rgba(255,255,255,.3)" }}><div style={{ fontSize:56,marginBottom:12 }}>🎉</div><p style={{ fontWeight:700,fontSize:18 }}>Queue is clear!</p></div>}
          </div>
        </>
      )}

      {tab==="analytics"&&(
        <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <GCard>
            <h3 style={{ fontSize:14,fontWeight:700,marginBottom:20 }}>📊 Patients per Hour</h3>
            <div style={{ display:"flex",alignItems:"flex-end",gap:8,height:130 }}>
              {hourly.map(d=>(<div key={d.l} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}><span style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.8)" }}>{d.n}</span><div style={{ width:"100%",borderRadius:"8px 8px 0 0",background:"linear-gradient(to top,#14B8A6,#0891B2)",height:`${(d.n/maxH)*100}px`,minHeight:4 }}/><span style={{ fontSize:9,color:"rgba(255,255,255,.4)" }}>{d.l}</span></div>))}
            </div>
          </GCard>
          <GCard>
            <h3 style={{ fontSize:14,fontWeight:700,marginBottom:18 }}>🏥 Department Distribution</h3>
            {deptDist.map(d=>(<div key={d.d} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}><span style={{ fontSize:11,color:"rgba(255,255,255,.8)",width:110,flexShrink:0,fontWeight:600 }}>{d.d}</span><div style={{ flex:1,height:8,borderRadius:4,background:"rgba(255,255,255,.08)",overflow:"hidden" }}><div style={{ height:"100%",borderRadius:4,background:d.c,width:`${(d.n/total)*100}%` }}/></div><span style={{ fontSize:11,fontWeight:900,color:"rgba(255,255,255,.8)",width:24,textAlign:"right" }}>{d.n}</span></div>))}
          </GCard>
        </div>
      )}

      {notesModal && <NotesModal patient={notesModal} onClose={()=>setNotesModal(null)} onSave={handleNoteSave}/>}
    </div>
  );
}

/* ─── DISPLAY BOARD ──────────────────────────────────────────────────────── */
function DisplayBoard({ t, queue, openCount }) {
  const [time, setTime] = useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(i);},[]);
  const called  = queue.filter(p=>p.status==="called");
  const waiting = queue.filter(p=>p.status==="waiting");
  const avgWait = waiting.length ? Math.round(waiting.reduce((s,p)=>s+p.wait,0)/waiting.length) : 0;

  return (
    <div style={{ borderRadius:28,overflow:"hidden",minHeight:"86vh",position:"relative",background:"linear-gradient(145deg,#020810,#050D1F,#031118)",border:"1px solid rgba(20,184,166,.15)",boxShadow:"0 24px 80px rgba(0,0,0,.7)" }}>
      <div style={{ position:"absolute",inset:0,overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-100,left:-100,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,.12),transparent 70%)",filter:"blur(40px)" }}/>
        <div style={{ position:"absolute",bottom:-100,right:-100,width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)",filter:"blur(50px)" }}/>
      </div>
      <div style={{ position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"28px 36px 22px",borderBottom:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:18 }}>
          <div className="heartbeat" style={{ width:60,height:60,borderRadius:20,background:"linear-gradient(135deg,#14B8A6,#0891B2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,boxShadow:"0 6px 24px rgba(20,184,166,.5)" }}>🏥</div>
          <div>
            <h1 style={{ fontSize:32,fontWeight:900,color:"#F5A623",letterSpacing:"-.5px" }}>UPHC Ahmedabad</h1>
            <p style={{ fontSize:13,color:"rgba(255,255,255,.4)",marginTop:3 }}>Urban Primary Health Centre — Live Queue Display</p>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ fontSize:48,fontWeight:900,color:"#14B8A6",fontVariantNumeric:"tabular-nums",lineHeight:1,textShadow:"0 0 30px rgba(20,184,166,.5)" }}>
            {time.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
          </p>
          <p style={{ fontSize:12,color:"rgba(255,255,255,.35)",marginTop:6 }}>{time.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:28,padding:"28px 36px",position:"relative" }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
            <div className="blink" style={{ width:10,height:10,borderRadius:"50%",background:"#F5A623",boxShadow:"0 0 12px #F5A623" }}/>
            <p style={{ fontSize:12,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",color:"#F5A623" }}>{t.nowServing}</p>
          </div>
          {called.length===0&&<div style={{ borderRadius:20,padding:30,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",textAlign:"center" }}><p style={{ fontSize:36,marginBottom:10 }}>⏳</p><p style={{ fontSize:14,color:"rgba(255,255,255,.3)" }}>Awaiting next call</p></div>}
          {called.map(p=>{
            const tc=TC[p.urgency]||TC.yellow;
            return (
              <div key={p.id} style={{ borderRadius:22,padding:26,background:"linear-gradient(145deg,rgba(167,139,250,.18),rgba(124,58,237,.1))",border:"1px solid rgba(167,139,250,.35)",boxShadow:"0 8px 40px rgba(124,58,237,.25)",marginBottom:12 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:72,fontWeight:900,color:"#F5A623",lineHeight:1,textShadow:"0 4px 24px rgba(245,166,35,.5)" }}>{p.id}</div>
                    <span className="chip" style={{ background:tc.badge,color:"#fff",marginTop:6,display:"inline-block" }}>{tc.label}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:20,fontWeight:800 }}>{p.dept}</p>
                    <p style={{ fontSize:13,color:"rgba(255,255,255,.5)",marginTop:6 }}>Counter: {p.counter}</p>
                  </div>
                </div>
                <div style={{ marginTop:14,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",justifyContent:"space-between" }}>
                  <p style={{ fontSize:15,fontWeight:700 }}>👤 {p.name}</p>
                  <span style={{ fontSize:12,background:"rgba(255,255,255,.1)",padding:"5px 14px",borderRadius:20 }}>{p.doctor}</span>
                </div>
              </div>
            );
          })}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14 }}>
            {[{l:"Total Waiting",v:waiting.length,c:"#14B8A6"},{l:"Avg Wait",v:`${avgWait} min`,c:"#F5A623"},{l:"Called In",v:called.length,c:"#A78BFA"},{l:"Depts Open",v:`${openCount} Open`,c:"#4ADE80"}].map(s=>(
              <div key={s.l} style={{ borderRadius:16,padding:"14px 16px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)" }}>
                <p style={{ fontSize:26,fontWeight:900,color:s.c,lineHeight:1,textShadow:`0 0 20px ${s.c}60` }}>{s.v}</p>
                <p style={{ fontSize:10,color:"rgba(255,255,255,.4)",marginTop:5,fontWeight:600 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize:12,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(255,255,255,.3)",marginBottom:18 }}>{t.nextTokens}</p>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {waiting.slice(0,8).map((p,i)=>{
              const tc=TC[p.urgency]||TC.yellow;
              return (
                <div key={p.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:16,padding:"14px 22px",background:`rgba(255,255,255,${.06-i*.006})`,borderLeft:`3px solid ${tc.badge}`,opacity:Math.max(.3,1-i*.09) }}>
                  <div style={{ display:"flex",alignItems:"center",gap:18 }}>
                    <span style={{ fontSize:30,fontWeight:900,color:"#F1F5F9",minWidth:70,fontVariantNumeric:"tabular-nums" }}>{p.id}</span>
                    <div><p style={{ fontSize:15,fontWeight:700 }}>{p.dept}</p><p style={{ fontSize:11,color:"rgba(255,255,255,.45)",marginTop:3 }}>👤 {p.name}</p></div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:20,fontWeight:900,color:"#14B8A6" }}>~{p.wait}m</p>
                    <span className="chip" style={{ background:tc.badge,color:"#fff",marginTop:5,display:"inline-block" }}>{tc.label}</span>
                  </div>
                </div>
              );
            })}
            {waiting.length===0&&<div style={{ textAlign:"center",padding:"50px 0",color:"rgba(255,255,255,.2)" }}><p style={{ fontSize:44 }}>✨</p><p style={{ fontSize:16,marginTop:10 }}>No patients waiting</p></div>}
          </div>
        </div>
      </div>
      <div style={{ position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 36px",borderTop:"1px solid rgba(255,255,255,.05)",flexWrap:"wrap",gap:8 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div className="blink" style={{ width:7,height:7,borderRadius:"50%",background:"#4ADE80",boxShadow:"0 0 10px #4ADE80" }}/>
          <p style={{ fontSize:11,color:"rgba(255,255,255,.25)" }}>System Active · Govt. of Gujarat · Free Primary Healthcare</p>
        </div>
        <p style={{ fontSize:11,color:"rgba(255,255,255,.25)" }}>24×7 Helpline: <span style={{ color:"#F5A623",fontWeight:700 }}>104</span></p>
      </div>
    </div>
  );
}

/* ─── FEEDBACK VIEW ──────────────────────────────────────────────────────── */
function FeedbackView({ t }) {
  const [rating,setRating]=useState(0);const [hover,setHover]=useState(0);const [aspects,setAspects]=useState([]);const [comment,setComment]=useState("");const [done,setDone]=useState(false);
  const aspectList=["Wait time","Staff behavior","Cleanliness","Doctor consultation","Booking experience","Overall care"];
  const labels=["","Poor","Fair","Good","Very Good","Excellent"];
  const colors=["","#EF4444","#F97316","#F59E0B","#22C55E","#14B8A6"];
  if(done)return(<div className="fade-in" style={{ textAlign:"center",padding:"60px 20px" }}><div style={{ fontSize:80,marginBottom:20 }}>🙏</div><h2 style={{ fontSize:28,fontWeight:900,marginBottom:10 }}>{t.feedbackThanks}</h2><div className="token-pop glass-card" style={{ borderRadius:24,padding:28,display:"inline-block",minWidth:240,marginTop:20 }}><p style={{ fontSize:52,lineHeight:1 }}>{"⭐".repeat(rating)}</p><p style={{ fontSize:22,fontWeight:900,marginTop:12,color:colors[rating] }}>{labels[rating]}</p></div></div>);
  return (
    <div className="slide-up" style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div><h2 style={{ fontSize:24,fontWeight:900,marginBottom:4 }}>{t.rateExp}</h2><p style={{ fontSize:13,color:"rgba(255,255,255,.5)" }}>Help us improve your experience</p></div>
      <GCard style={{ textAlign:"center" }}>
        <p style={{ fontSize:14,color:"rgba(255,255,255,.6)",marginBottom:22,fontWeight:500 }}>How was your visit today?</p>
        <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:14 }}>
          {[1,2,3,4,5].map(s=>(<button key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(s)} style={{ fontSize:46,background:"none",border:"none",cursor:"pointer",transition:"all .18s",transform:(hover||rating)>=s?"scale(1.3)":"scale(1)",filter:(hover||rating)>=s?"none":"grayscale(1) opacity(.25)" }}>⭐</button>))}
        </div>
        <p style={{ fontSize:18,fontWeight:800,color:colors[hover||rating]||"rgba(255,255,255,.3)",minHeight:28,transition:"color .2s" }}>{labels[hover||rating]}</p>
      </GCard>
      <GCard>
        <p style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>What went well?</p>
        <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
          {aspectList.map(a=>{const sel=aspects.includes(a);return(<button key={a} onClick={()=>setAspects(prev=>sel?prev.filter(x=>x!==a):[...prev,a])} style={{ padding:"8px 18px",borderRadius:24,fontSize:12,fontWeight:600,border:`1px solid ${sel?"rgba(20,184,166,.5)":"rgba(255,255,255,.12)"}`,cursor:"pointer",transition:"all .18s",background:sel?"linear-gradient(135deg,rgba(20,184,166,.25),rgba(8,145,178,.2))":"rgba(255,255,255,.05)",color:sel?"#5EEAD4":"rgba(255,255,255,.7)" }}>{sel?"✓ ":""}{a}</button>);})}
        </div>
      </GCard>
      <GCard>
        <p style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>Additional comments</p>
        <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Tell us how we can improve…" className="input-glass"
          style={{ width:"100%",padding:"12px 16px",borderRadius:14,fontSize:13,resize:"none",lineHeight:1.6,border:"1px solid rgba(255,255,255,.15)" }}/>
      </GCard>
      <button onClick={()=>rating>0&&setDone(true)} className={rating>0?"teal-btn":"liquid-btn"}
        style={{ width:"100%",padding:"17px",borderRadius:20,fontSize:16,fontWeight:900,opacity:rating>0?1:.5,cursor:rating>0?"pointer":"default" }}>
        {t.submitFeedback}
      </button>
    </div>
  );
}