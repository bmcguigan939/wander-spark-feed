import pptxgen from "pptxgenjs";
import fs from "fs";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
const W = 13.333, H = 7.5;

const BG="0F172A", PANEL="111C36", CARD="1B2742", PRIMARY="3B82F6",
      GLOW="60A5FA", CYAN="22D3EE", INK="F8FAFC", MUTED="94A3B8",
      LINE="243049", WHITE="FFFFFF", DIM="64748B";

const FONT = "Calibri";

function bg(s){ s.background={color:BG}; }

function header(s, kicker, pageNo){
  s.addShape("rect",{x:0,y:0,w:W,h:0.42,fill:{color:PANEL},line:{color:PANEL}});
  s.addShape("ellipse",{x:0.3,y:0.11,w:0.22,h:0.22,fill:{color:PRIMARY},line:{color:PRIMARY}});
  s.addText("TRAVIDZ",{x:0.6,y:0.06,w:1.4,h:0.32,bold:true,fontSize:13,color:WHITE,fontFace:FONT,charSpacing:4});
  if(kicker){
    s.addText(kicker.toUpperCase(),{x:2.1,y:0.08,w:6,h:0.28,fontSize:9,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
  }
  s.addText(`${pageNo} / 14`,{x:W-1.2,y:0.08,w:1.0,h:0.28,fontSize:9,color:MUTED,fontFace:FONT,align:"right"});
}

function footerSrc(s, txt){
  s.addText(txt,{x:0.4,y:H-0.32,w:W-0.8,h:0.24,fontSize:8,color:DIM,fontFace:FONT,italic:true});
}

function bigTitle(s, txt, y=0.85, color=INK){
  s.addText(txt,{x:0.6,y,w:W-1.2,h:1.0,fontSize:36,bold:true,color,fontFace:FONT});
}

function subTitle(s, txt, y){
  s.addText(txt,{x:0.6,y,w:W-1.2,h:0.5,fontSize:16,color:MUTED,fontFace:FONT,italic:true});
}

function panel(s,x,y,w,h){
  s.addShape("roundRect",{x,y,w,h,rectRadius:0.12,fill:{color:PANEL},line:{color:LINE,width:0.5}});
}

// ============ SLIDE 1 — TITLE ============
{
  const s=pres.addSlide(); bg(s);
  // Decorative ring
  s.addShape("ellipse",{x:9.5,y:-2,w:6,h:6,fill:{color:PRIMARY,transparency:85},line:{color:PRIMARY,transparency:60,width:0.5}});
  s.addShape("ellipse",{x:-1.5,y:4.5,w:5,h:5,fill:{color:CYAN,transparency:90},line:{color:CYAN,transparency:75,width:0.5}});

  s.addText("TRAVIDZ",{x:0.6,y:0.5,w:5,h:0.4,bold:true,fontSize:14,color:WHITE,fontFace:FONT,charSpacing:6});
  s.addText("Seed round · Confidential",{x:0.6,y:0.85,w:5,h:0.3,fontSize:11,color:MUTED,fontFace:FONT,italic:true});

  s.addText("The feed that books the holiday.",{x:0.6,y:2.4,w:11,h:1.8,fontSize:56,bold:true,color:INK,fontFace:FONT,charSpacing:-1});

  s.addText("Travidz is short-form travel video where every clip is bookable in two taps. TikTok-native discovery, Booking.com-native economics.",{
    x:0.6,y:4.5,w:10,h:1,fontSize:16,color:MUTED,fontFace:FONT
  });

  // Raise pill
  s.addShape("roundRect",{x:0.6,y:6.2,w:5.6,h:0.55,rectRadius:0.27,fill:{color:PRIMARY},line:{color:PRIMARY}});
  s.addText("Seed raise  ·  £2.5M SAFE  ·  18-month runway",{x:0.6,y:6.2,w:5.6,h:0.55,fontSize:14,bold:true,color:WHITE,fontFace:FONT,align:"center",valign:"middle"});

  s.addText("1 / 14",{x:W-1.2,y:H-0.4,w:1.0,h:0.24,fontSize:9,color:MUTED,fontFace:FONT,align:"right"});
}

// ============ SLIDE 2 — THE WINDOW ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"The Window",2);
  bigTitle(s,"Every category got its TikTok moment.\nTravel's is now.");

  const stats=[
    ["$250B","Creator economy in 2025, up from $210B in 2024."],
    ["62%","of social-led trip planners make a specific booking decision after viewing creator content."],
    ["$15T","Leisure travel opportunity by 2040 — no native social-commerce winner yet."]
  ];
  const cw=4.0, gap=0.2, totalW=cw*3+gap*2;
  const sx=(W-totalW)/2;
  stats.forEach(([n,d],i)=>{
    const x=sx+i*(cw+gap), y=3.2;
    panel(s,x,y,cw,2.6);
    s.addText(n,{x:x+0.25,y:y+0.3,w:cw-0.5,h:1.1,fontSize:48,bold:true,color:CYAN,fontFace:FONT});
    s.addText(d,{x:x+0.25,y:y+1.5,w:cw-0.5,h:1.0,fontSize:13,color:INK,fontFace:FONT});
  });

  s.addText("Travidz is the first product built for the moment travellers stop scrolling and start spending.",{
    x:0.6,y:6.1,w:W-1.2,h:0.5,fontSize:14,italic:true,color:GLOW,fontFace:FONT,align:"center"
  });
  footerSrc(s,"Source: Influencer Marketing Hub Creator Earnings Report 2025; Phocuswright 2024; BCG Leisure Travel Outlook 2024.");
}

// ============ SLIDE 3 — THE PROBLEM ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"The Problem",3);
  bigTitle(s,"Discovery lives on social.\nBooking lives somewhere else.");

  panel(s,0.6,3.0,7.5,3.2);
  s.addText("Travellers find the trip on TikTok and Instagram.",{x:0.85,y:3.2,w:7,h:0.4,fontSize:15,bold:true,color:INK,fontFace:FONT});
  s.addText("Then they leave: open Google → search the hotel → check Booking → compare on Trivago → return to the original creator.",{x:0.85,y:3.7,w:7,h:1.2,fontSize:13,color:MUTED,fontFace:FONT});
  s.addText("Result: the intent leaks. Creators don't get paid for the booking they caused. Operators bid for the same clicks twice. Travellers pay the inefficiency tax.",{x:0.85,y:4.9,w:7,h:1.2,fontSize:12,italic:true,color:CYAN,fontFace:FONT});

  // Right stats
  panel(s,8.4,3.0,4.3,1.5);
  s.addText("39%",{x:8.6,y:3.1,w:4,h:0.7,fontSize:36,bold:true,color:CYAN,fontFace:FONT});
  s.addText("of global travellers source trip ideas from social platforms.",{x:8.6,y:3.85,w:4,h:0.6,fontSize:11,color:INK,fontFace:FONT});

  panel(s,8.4,4.7,4.3,1.5);
  s.addText("3 tabs · 8 min",{x:8.6,y:4.8,w:4,h:0.7,fontSize:28,bold:true,color:CYAN,fontFace:FONT});
  s.addText("avg. journey from inspiration to booking today.",{x:8.6,y:5.55,w:4,h:0.6,fontSize:11,color:INK,fontFace:FONT});

  footerSrc(s,"Source: Booking.com Trip Inspiration Survey 2024 (42,513 travellers, 33 markets).");
}

// ============ SLIDE 4 — THE SOLUTION ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"The Solution",4);
  bigTitle(s,"One feed. One tap. One transaction.");

  const steps=[
    ["01","Scroll","Vertical creator video feed of real hotels, beaches, restaurants, tours."],
    ["02","Tap","The deal card surfaces inline — price, dates, what's included, in the creator's voice."],
    ["03","Book","Native checkout. The creator earns. The business pays one flat 8% commission. The traveller gets the deal they saw."]
  ];
  const cw=4.0, gap=0.25, sx=(W-cw*3-gap*2)/2;
  steps.forEach(([n,t,d],i)=>{
    const x=sx+i*(cw+gap), y=3.0;
    panel(s,x,y,cw,3.3);
    s.addText(n,{x:x+0.3,y:y+0.25,w:1.5,h:0.5,fontSize:14,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
    s.addText(t,{x:x+0.3,y:y+0.8,w:cw-0.6,h:0.7,fontSize:30,bold:true,color:INK,fontFace:FONT});
    s.addText(d,{x:x+0.3,y:y+1.7,w:cw-0.6,h:1.4,fontSize:13,color:MUTED,fontFace:FONT});
  });

  s.addText("TikTok UX. Booking.com economics. One product.",{x:0.6,y:6.5,w:W-1.2,h:0.4,fontSize:15,italic:true,color:GLOW,fontFace:FONT,align:"center"});
}

// ============ SLIDE 5 — WHY NOW ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"Why Now",5);
  bigTitle(s,"Three lines crossed in 2025.");

  const cols=[
    ["AUDIENCE","Gen Z + Millennials","are now the majority of leisure travel spending — and they shop where they scroll."],
    ["BEHAVIOUR","Short-form video","is the default discovery surface — but no traveller wants to copy-paste a hotel name into a second app."],
    ["SUPPLY","Operators want creators","but lack a clean attribution and payout rail. Travidz is that rail."]
  ];
  const cw=4.0, gap=0.25, sx=(W-cw*3-gap*2)/2;
  cols.forEach(([k,t,d],i)=>{
    const x=sx+i*(cw+gap), y=3.0;
    panel(s,x,y,cw,3.3);
    s.addShape("rect",{x:x+0.3,y:y+0.3,w:0.4,h:0.05,fill:{color:CYAN},line:{color:CYAN}});
    s.addText(k,{x:x+0.3,y:y+0.4,w:cw-0.6,h:0.4,fontSize:11,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
    s.addText(t,{x:x+0.3,y:y+0.95,w:cw-0.6,h:0.9,fontSize:24,bold:true,color:INK,fontFace:FONT});
    s.addText(d,{x:x+0.3,y:y+2.0,w:cw-0.6,h:1.2,fontSize:13,color:MUTED,fontFace:FONT});
  });
  footerSrc(s,"Source: Skift Research 2026; Statista Influencer Market 2025 ($32.55B).");
}

// ============ SLIDE 6 — THE PRODUCT ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"The Product",6);
  bigTitle(s,"Built mobile-first. Designed to convert.");

  const labels=["Feed","Deal card","Checkout"];
  const files=["feed.jpg","deal.jpg","checkout.jpg"];
  const iw=2.6, gap=0.5, totalW=iw*3+gap*2, sx=(W-totalW)/2, iy=3.0, ih=3.5;
  files.forEach((f,i)=>{
    const x=sx+i*(iw+gap);
    panel(s,x-0.1,iy-0.1,iw+0.2,ih+0.2);
    const b64=fs.readFileSync(`/tmp/deck_v2/${f}`).toString("base64");
    s.addImage({data:`image/jpeg;base64,${b64}`,x,y:iy,w:iw,h:ih,sizing:{type:"contain",w:iw,h:ih}});
    s.addText(labels[i],{x,y:iy+ih+0.2,w:iw,h:0.35,fontSize:14,bold:true,color:CYAN,fontFace:FONT,align:"center"});
  });
}

// ============ SLIDE 7 — MARKET ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"Market",7);
  bigTitle(s,"A £675B global prize. £87.6B in our backyard.");

  const rows=[
    ["TAM","UK / Global leisure travel GBV","£87.6B / £675B","UK ONS · EU-5 Eurostat · Global UNWTO"],
    ["SAM","Creator-influenced × bookable component","£23.2B / £175B","UK 26% × 80% bookable · Global blend"],
    ["SOM","Travidz Year-5 GBV (UK Base → Global Viral)","£350M → £1.32B","24,000 active creators · £14.5k-£18.5k GBV / cr / yr"]
  ];
  const ty=3.0, rh=1.15;
  rows.forEach(([k,d,v,sub],i)=>{
    const y=ty+i*(rh+0.15);
    panel(s,0.6,y,W-1.2,rh);
    s.addText(k,{x:0.85,y:y+0.15,w:1.0,h:0.4,fontSize:18,bold:true,color:CYAN,fontFace:FONT});
    s.addText(d,{x:0.85,y:y+0.55,w:6.5,h:0.5,fontSize:12,color:MUTED,fontFace:FONT});
    s.addText(v,{x:7.5,y:y+0.15,w:5.3,h:0.55,fontSize:24,bold:true,color:INK,fontFace:FONT,align:"right"});
    s.addText(sub,{x:7.5,y:y+0.7,w:5.3,h:0.4,fontSize:10,italic:true,color:MUTED,fontFace:FONT,align:"right"});
  });

  s.addText("Y5 UK Base SOM = 1.5% of UK SAM · Global Viral upside = 0.75% of Global SAM. Bottom-up from the financial model.",{
    x:0.6,y:7.0,w:W-1.2,h:0.3,fontSize:10,italic:true,color:GLOW,fontFace:FONT,align:"center"
  });
  footerSrc(s,"Source: ONS Travel Trends · Eurostat 2023 · UNWTO Tourism Highlights · Travidz_Market_Research_TAM_SOM_v9_Global.xlsx");
}

// ============ SLIDE 8 — BUSINESS MODEL ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"Business Model",8);
  bigTitle(s,"8% to Travidz. Split with the creator who drove the booking.");

  // Left big number
  panel(s,0.6,3.0,5.0,3.3);
  s.addText("EVERY BOOKING",{x:0.85,y:3.2,w:4.5,h:0.4,fontSize:11,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
  s.addText("8%",{x:0.85,y:3.6,w:4.5,h:1.7,fontSize:120,bold:true,color:INK,fontFace:FONT});
  s.addText("blended commission to Travidz",{x:0.85,y:5.2,w:4.5,h:0.4,fontSize:13,color:INK,fontFace:FONT});
  s.addText("92% to operator · creator keeps a tapered share by tenure",{x:0.85,y:5.6,w:4.5,h:0.5,fontSize:11,italic:true,color:MUTED,fontFace:FONT});

  // Right table
  panel(s,5.9,3.0,6.8,3.3);
  const tiers=[
    ["Tier","Creator","Travidz"],
    ["Founding (first 500, life)","50%","50%"],
    ["Power (£25k rolling 12mo)","50%","50%"],
    ["New (months 0–6)","50%","50%"],
    ["Maturing (months 7–18)","40%","60%"],
    ["Mature (19+ months)","30%","70%"]
  ];
  const trH=0.42;
  tiers.forEach((row,i)=>{
    const y=3.15+i*trH;
    const isHeader=i===0;
    if(!isHeader && i%2===0) s.addShape("rect",{x:6.0,y,w:6.6,h:trH,fill:{color:CARD},line:{color:CARD}});
    s.addText(row[0],{x:6.1,y,w:3.6,h:trH,fontSize:12,bold:isHeader,color:isHeader?CYAN:INK,fontFace:FONT,valign:"middle"});
    s.addText(row[1],{x:9.7,y,w:1.3,h:trH,fontSize:12,bold:isHeader,color:isHeader?CYAN:INK,fontFace:FONT,valign:"middle",align:"right"});
    s.addText(row[2],{x:11.0,y,w:1.5,h:trH,fontSize:12,bold:isHeader,color:isHeader?CYAN:INK,fontFace:FONT,valign:"middle",align:"right"});
  });

  s.addText("As the cohort matures, blended Travidz take-rate glides from 4.0% → 4.65%.",{
    x:0.6,y:6.6,w:W-1.2,h:0.4,fontSize:12,italic:true,color:GLOW,fontFace:FONT,align:"center"
  });
}

// ============ SLIDE 9 — UNIT ECONOMICS Y5 ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"Unit Economics · Year 5",9);
  bigTitle(s,"A flywheel that gets more efficient as it scales.");

  // UK Base row
  s.addText("UK BASE CASE",{x:0.6,y:2.85,w:6,h:0.3,fontSize:11,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
  const baseRow=[["24,000","active creators"],["£350M","annual GBV"],["£16.2M","Travidz net revenue"],["4.65%","blended take-rate"]];
  const cw=2.95, gap=0.15, sx=0.6, yb=3.2;
  baseRow.forEach(([n,l],i)=>{
    const x=sx+i*(cw+gap);
    panel(s,x,yb,cw,1.5);
    s.addText(n,{x:x+0.15,y:yb+0.15,w:cw-0.3,h:0.75,fontSize:32,bold:true,color:INK,fontFace:FONT,align:"center"});
    s.addText(l,{x:x+0.15,y:yb+0.95,w:cw-0.3,h:0.4,fontSize:11,color:MUTED,fontFace:FONT,align:"center"});
  });

  // Global Viral row
  s.addText("GLOBAL VIRAL UPSIDE",{x:0.6,y:4.9,w:6,h:0.3,fontSize:11,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
  const upRow=[["72,000","active creators"],["£1.32B","annual GBV"],["£61.6M","Travidz net revenue"],["4.65%","blended take-rate"]];
  const yu=5.25;
  upRow.forEach(([n,l],i)=>{
    const x=sx+i*(cw+gap);
    s.addShape("roundRect",{x,y:yu,w:cw,h:1.5,rectRadius:0.12,fill:{color:PANEL},line:{color:CYAN,width:0.75}});
    s.addText(n,{x:x+0.15,y:yu+0.15,w:cw-0.3,h:0.75,fontSize:32,bold:true,color:CYAN,fontFace:FONT,align:"center"});
    s.addText(l,{x:x+0.15,y:yu+0.95,w:cw-0.3,h:0.4,fontSize:11,color:MUTED,fontFace:FONT,align:"center"});
  });

  s.addText("Power-creator tier (£25k+ rolling-12mo) locks supply forever · Maturing cohort silently lifts net take · 8% gross commission stays constant to operators.",{
    x:0.6,y:6.95,w:W-1.2,h:0.4,fontSize:11,italic:true,color:GLOW,fontFace:FONT,align:"center"
  });
  footerSrc(s,"Source: Travidz_Financial_Model_v2_Global.xlsx (Base scenario, Y5).");
}

// ============ SLIDE 10 — GTM ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"Go to Market",10);
  bigTitle(s,"Founding Creators → flywheel → category default.");

  const phases=[
    ["PHASE 1 · PROVE","Now → Month 6","Founding 500","Recruit the first 500 UK travel creators. Lifetime 50% commission. They post; their audience converts; supply seeds demand."],
    ["PHASE 2 · SCALE","Month 6 → 18","Power tier unlocks","Creators crossing £25k rolling-12mo GBV lock at 50% forever. Every unlock becomes a recruiting asset."],
    ["PHASE 3 · DEFEND","Month 18 → 36","Operator pull","Hotels and DMOs proactively onboard for distribution. CAC drops; blended take-rate climbs as the cohort matures."]
  ];
  const cw=4.0, gap=0.25, sx=(W-cw*3-gap*2)/2;
  phases.forEach(([ph,when,t,d],i)=>{
    const x=sx+i*(cw+gap), y=3.0;
    panel(s,x,y,cw,3.5);
    s.addText(ph,{x:x+0.3,y:y+0.25,w:cw-0.6,h:0.4,fontSize:11,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
    s.addText(when,{x:x+0.3,y:y+0.65,w:cw-0.6,h:0.3,fontSize:10,italic:true,color:MUTED,fontFace:FONT});
    s.addText(t,{x:x+0.3,y:y+1.05,w:cw-0.6,h:0.7,fontSize:22,bold:true,color:INK,fontFace:FONT});
    s.addText(d,{x:x+0.3,y:y+1.9,w:cw-0.6,h:1.5,fontSize:12,color:MUTED,fontFace:FONT});
  });
}

// ============ SLIDE 11 — GROWTH PLAN ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"Growth Plan",11);
  bigTitle(s,"Prove → Scale → Defend.");
  subTitle(s,"Each phase has a raise, a measurable gate, and a defensibility milestone.",1.85);

  const phases=[
    ["1","PROVE","M0–18 · Seed £2.5M","Founding-500 lock-in.",
      ["2,400 creators","£44M GBV","4.12% take-rate","100 power-tier locks","250 verified operators"],
      "Founding-500 locked at 50% for life — irreversible supply moat."],
    ["2","SCALE","M18–44 · Series A £8M","Paid-UA flywheel.",
      ["14,000 creators","£259M GBV","4.72% take-rate","£12M ARR"],
      "First-mover in EU-5 creator-led booking. Power-tier compounds."],
    ["3","DEFEND","M44–60+ · Series B £20M","No.1 Go Travel Platform.",
      ["24,000 creators","£350M UK Base GBV","Global Viral upside £1.32B","Category default in UK + EU-5"],
      "Two-sided network effects; switching cost for creators & operators."]
  ];
  const cw=4.0, gap=0.25, sx=(W-cw*3-gap*2)/2;
  phases.forEach(([n,ph,raise,t,gates,def],i)=>{
    const x=sx+i*(cw+gap), y=2.6;
    panel(s,x,y,cw,4.5);
    s.addShape("ellipse",{x:x+0.3,y:y+0.25,w:0.5,h:0.5,fill:{color:PRIMARY},line:{color:PRIMARY}});
    s.addText(n,{x:x+0.3,y:y+0.25,w:0.5,h:0.5,fontSize:18,bold:true,color:WHITE,fontFace:FONT,align:"center",valign:"middle"});
    s.addText(ph,{x:x+0.9,y:y+0.3,w:cw-1.1,h:0.4,fontSize:14,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
    s.addText(raise,{x:x+0.9,y:y+0.62,w:cw-1.1,h:0.3,fontSize:10,italic:true,color:MUTED,fontFace:FONT});
    s.addText(t,{x:x+0.3,y:y+1.05,w:cw-0.6,h:0.5,fontSize:16,bold:true,color:INK,fontFace:FONT});

    s.addText("EXIT GATES",{x:x+0.3,y:y+1.55,w:cw-0.6,h:0.3,fontSize:9,bold:true,color:CYAN,fontFace:FONT,charSpacing:2});
    gates.forEach((g,j)=>{
      s.addText(`• ${g}`,{x:x+0.3,y:y+1.85+j*0.32,w:cw-0.6,h:0.32,fontSize:11,color:INK,fontFace:FONT});
    });

    s.addShape("line",{x:x+0.3,y:y+3.8,w:cw-0.6,h:0,line:{color:LINE,width:0.5}});
    s.addText("DEFENSIBILITY",{x:x+0.3,y:y+3.85,w:cw-0.6,h:0.25,fontSize:8,bold:true,color:CYAN,fontFace:FONT,charSpacing:2});
    s.addText(def,{x:x+0.3,y:y+4.1,w:cw-0.6,h:0.4,fontSize:10,italic:true,color:MUTED,fontFace:FONT});
  });
}

// ============ SLIDE 12 — COMPETITIVE ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"Competitive Landscape",12);
  bigTitle(s,"No one owns the top-right quadrant. Yet.");

  // Quadrant
  const qx=1.0, qy=2.9, qw=7.5, qh=4.0;
  panel(s,qx,qy,qw,qh);
  // axes
  s.addShape("line",{x:qx+qw/2,y:qy+0.2,w:0,h:qh-0.4,line:{color:LINE,width:1}});
  s.addShape("line",{x:qx+0.3,y:qy+qh/2,w:qw-0.6,h:0,line:{color:LINE,width:1}});
  // axis labels
  s.addText("More bookable ↑",{x:qx+0.2,y:qy+0.1,w:2.2,h:0.3,fontSize:9,bold:true,color:MUTED,fontFace:FONT});
  s.addText("← Less bookable",{x:qx+0.2,y:qy+qh-0.4,w:2.2,h:0.3,fontSize:9,bold:true,color:MUTED,fontFace:FONT});
  s.addText("Less social ←",{x:qx+0.5,y:qy+qh/2+0.05,w:2,h:0.3,fontSize:9,bold:true,color:MUTED,fontFace:FONT});
  s.addText("More social →",{x:qx+qw-2.5,y:qy+qh/2+0.05,w:2.3,h:0.3,fontSize:9,bold:true,color:MUTED,fontFace:FONT,align:"right"});

  // dots
  function dot(name,x,y,col=GLOW,big=false){
    s.addShape("ellipse",{x,y,w:big?0.3:0.2,h:big?0.3:0.2,fill:{color:col},line:{color:col}});
    s.addText(name,{x:x+0.3,y:y-0.05,w:1.8,h:0.3,fontSize:11,bold:big,color:big?CYAN:INK,fontFace:FONT});
  }
  // bottom-left: OTAs (high book, low social)
  dot("Booking.com",qx+1.2,qy+1.0);
  dot("Expedia",qx+1.5,qy+1.5);
  dot("Airbnb",qx+1.8,qy+1.9);
  // top-right: social (high social, low book initially)
  dot("Instagram",qx+qw-2.0,qy+qh-1.2);
  dot("TikTok",qx+qw-2.2,qy+qh-0.8);
  // travidz top-right corner — high book + high social
  dot("TRAVIDZ",qx+qw-1.8,qy+0.9,CYAN,true);

  // Side caption
  panel(s,8.8,2.9,3.9,4.0);
  s.addText("Travel OTAs sit bottom-left (booking but not social).",{x:9.0,y:3.1,w:3.5,h:0.7,fontSize:12,color:INK,fontFace:FONT});
  s.addText("Social platforms sit top-right (social but not bookable).",{x:9.0,y:3.95,w:3.5,h:0.7,fontSize:12,color:INK,fontFace:FONT});
  s.addText("Travidz is the only product native to both.",{x:9.0,y:4.95,w:3.5,h:1.2,fontSize:14,bold:true,italic:true,color:CYAN,fontFace:FONT});
}

// ============ SLIDE 13 — THE ASK ============
{
  const s=pres.addSlide(); bg(s);
  header(s,"The Ask",13);
  bigTitle(s,"£2.5M Seed for 18 months. Then Series A on real GBV.");

  // Allocation bars
  const ay=2.9, aw=7.5;
  const alloc=[
    ["40%","Creator GTM & founding-500 programme",0.40,PRIMARY],
    ["35%","Engineering: feed, search, ranking, payments",0.35,GLOW],
    ["15%","Operator supply & destination expansion",0.15,CYAN],
    ["10%","G&A, legal, compliance",0.10,MUTED]
  ];
  alloc.forEach(([pct,d,p,col],i)=>{
    const y=ay+i*0.55;
    s.addText(pct,{x:0.6,y,w:0.9,h:0.4,fontSize:18,bold:true,color:col,fontFace:FONT});
    s.addShape("rect",{x:1.6,y:y+0.1,w:aw*p,h:0.22,fill:{color:col},line:{color:col}});
    s.addText(d,{x:1.6,y:y+0.32,w:aw,h:0.25,fontSize:11,color:INK,fontFace:FONT});
  });

  // Right panel: phase-1 gates
  panel(s,9.4,2.9,3.3,4.0);
  s.addText("PHASE 1 · PROVE",{x:9.55,y:3.05,w:3,h:0.3,fontSize:10,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
  s.addText("18-Month Gates",{x:9.55,y:3.35,w:3,h:0.4,fontSize:14,bold:true,color:INK,fontFace:FONT});
  const gates=[
    "2,400+ active creators",
    "£44M annualised GBV",
    "100+ power-tier locks",
    "250+ verified operators",
    "Take-rate past 4.1%"
  ];
  gates.forEach((g,i)=>{
    s.addText(`✓  ${g}`,{x:9.55,y:3.85+i*0.4,w:3,h:0.35,fontSize:11,color:INK,fontFace:FONT});
  });

  // Breakeven callout
  s.addShape("roundRect",{x:0.6,y:5.55,w:8.5,h:1.3,rectRadius:0.12,fill:{color:PANEL},line:{color:CYAN,width:1}});
  s.addText("PATH TO BREAKEVEN",{x:0.85,y:5.7,w:8,h:0.3,fontSize:10,bold:true,color:CYAN,fontFace:FONT,charSpacing:3});
  s.addText("EBITDA breakeven M48  ·  Y1 EBITDA −£1.56M  ·  Peak deficit fully funded with +£181k cushion",{
    x:0.85,y:6.0,w:8,h:0.4,fontSize:14,bold:true,color:INK,fontFace:FONT
  });
  s.addText("£2.5M takes us through the burn trough on cash — Series A becomes a growth round, not a survival round.",{
    x:0.85,y:6.4,w:8,h:0.4,fontSize:11,italic:true,color:MUTED,fontFace:FONT
  });

  s.addText("These unlock a Series A on demonstrated unit economics, not assumed ones.",{
    x:0.6,y:7.0,w:W-1.2,h:0.3,fontSize:10,italic:true,color:GLOW,fontFace:FONT,align:"center"
  });
}

// ============ SLIDE 14 — CLOSING ============
{
  const s=pres.addSlide(); bg(s);
  s.addShape("ellipse",{x:-2,y:-2,w:7,h:7,fill:{color:PRIMARY,transparency:88},line:{color:PRIMARY,transparency:70,width:0.5}});
  s.addShape("ellipse",{x:8.5,y:3,w:6,h:6,fill:{color:CYAN,transparency:90},line:{color:CYAN,transparency:75,width:0.5}});

  s.addText("TRAVIDZ",{x:0.6,y:0.6,w:5,h:0.5,bold:true,fontSize:16,color:WHITE,fontFace:FONT,charSpacing:6});

  s.addText("Every category had its TikTok moment.",{x:0.6,y:2.5,w:12,h:1.2,fontSize:44,bold:true,color:INK,fontFace:FONT,charSpacing:-1});
  s.addText("Travel's is now.",{x:0.6,y:3.65,w:12,h:1.2,fontSize:54,bold:true,color:CYAN,fontFace:FONT,charSpacing:-1});

  s.addText("Let's not be the round you tell people about in five years.",{
    x:0.6,y:5.3,w:12,h:0.5,fontSize:16,italic:true,color:MUTED,fontFace:FONT
  });

  // Contact pill
  s.addShape("roundRect",{x:0.6,y:6.4,w:8.5,h:0.55,rectRadius:0.27,fill:{color:PANEL},line:{color:CYAN,width:0.75}});
  s.addText("Brendan & Linda  @  travidz.com  ·  travidz.com  ·  Seed · £2.5M SAFE",{
    x:0.6,y:6.4,w:8.5,h:0.55,fontSize:13,bold:true,color:INK,fontFace:FONT,align:"center",valign:"middle"
  });
  s.addText("14 / 14",{x:W-1.2,y:H-0.4,w:1.0,h:0.24,fontSize:9,color:MUTED,fontFace:FONT,align:"right"});
}

await pres.writeFile({fileName:"/mnt/documents/Travidz_Investor_Deck_Seed_v2.pptx"});
console.log("OK");