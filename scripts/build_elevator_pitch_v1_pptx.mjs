import pptxgen from "pptxgenjs";
import fs from "fs";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5"
const W = 13.333, H = 7.5;

const BG="0F172A", PANEL="111C36", CARD="1B2742", PRIMARY="3B82F6",
      GLOW="60A5FA", CYAN="22D3EE", INK="F8FAFC", MUTED="94A3B8", LINE="243049", WHITE="FFFFFF";

const s = pres.addSlide();
s.background = { color: BG };

// Top bar
s.addShape("rect",{x:0,y:0,w:W,h:0.55,fill:{color:PANEL},line:{color:PANEL}});
s.addShape("ellipse",{x:0.25,y:0.13,w:0.3,h:0.3,fill:{color:PRIMARY},line:{color:PRIMARY}});
s.addText("TRAVIDZ",{x:0.65,y:0.08,w:1.4,h:0.4,fontFace:"Calibri",bold:true,fontSize:18,color:WHITE});
s.addText("Creator-led travel commerce  ·  Seed round",{x:2.05,y:0.12,w:5,h:0.35,fontSize:11,color:MUTED,fontFace:"Calibri"});
s.addText("Raising £2.5M SAFE  ·  18-month runway  ·  UK → EU-5",{x:W-6.2,y:0.12,w:5.95,h:0.35,fontSize:12,bold:true,color:CYAN,align:"right",fontFace:"Calibri"});

// Hero panel (left)
const HX=0.25, HY=0.75, HW=4.0, HH=H-1.0;
s.addShape("roundRect",{x:HX,y:HY,w:HW,h:HH,rectRadius:0.15,fill:{color:PANEL},line:{color:CYAN,width:0.75}});

// Hero image
const imgB64 = fs.readFileSync("/tmp/elevator_hero.png").toString("base64");
const iw=HW-0.4, ih=iw; // square
s.addImage({data:`image/png;base64,${imgB64}`,x:HX+0.2,y:HY+0.2,w:iw,h:Math.min(ih, HH-1.4)});

// Tagline
s.addText("Discover. Book. Earn.",{x:HX,y:HY+HH-1.1,w:HW,h:0.35,align:"center",fontSize:16,bold:true,color:INK,fontFace:"Calibri"});
s.addText("The shoppable feed for travel.",{x:HX,y:HY+HH-0.78,w:HW,h:0.3,align:"center",fontSize:11,color:MUTED,fontFace:"Calibri"});

// Chips
const chips=["Creators","Travellers","Suppliers"];
let cx=HX+0.3;
chips.forEach(t=>{
  const w=0.95;
  s.addShape("roundRect",{x:cx,y:HY+HH-0.4,w:w,h:0.28,rectRadius:0.14,fill:{color:CARD},line:{color:CARD}});
  s.addText(t,{x:cx,y:HY+HH-0.4,w:w,h:0.28,align:"center",fontSize:9,bold:true,color:CYAN,fontFace:"Calibri"});
  cx+=w+0.12;
});

// Right column
const RX=4.45, RW=W-RX-0.25;

// PROBLEM
let y=0.75;
s.addShape("rect",{x:RX,y:y+0.04,w:0.05,h:0.2,fill:{color:PRIMARY},line:{color:PRIMARY}});
s.addText("PROBLEM",{x:RX+0.12,y:y,w:3,h:0.25,fontSize:11,bold:true,color:INK,fontFace:"Calibri"});
y+=0.28;
s.addText([
  {text:"Travel is a ",options:{color:INK}},
  {text:"£343B",options:{bold:true,color:INK}},
  {text:" market booked blind. Gen-Z and Millennials discover trips on creators and TikTok, then jump to OTAs that pay creators nothing. Discovery and booking are broken apart.",options:{color:INK}}
],{x:RX,y:y,w:RW,h:0.6,fontSize:10,fontFace:"Calibri",valign:"top"});
y+=0.65;

// SOLUTION
s.addShape("rect",{x:RX,y:y+0.04,w:0.05,h:0.2,fill:{color:PRIMARY},line:{color:PRIMARY}});
s.addText("SOLUTION",{x:RX+0.12,y:y,w:3,h:0.25,fontSize:11,bold:true,color:INK,fontFace:"Calibri"});
y+=0.28;
s.addText([
  {text:"Travidz",options:{bold:true,color:INK}},
  {text:" is a shoppable travel feed. Creators post trips → travellers book in-app → creators earn revenue share on every booking. One vertical feed. One checkout. One ledger.",options:{color:INK}}
],{x:RX,y:y,w:RW,h:0.55,fontSize:10,fontFace:"Calibri",valign:"top"});
y+=0.62;

// MARKET section title
s.addShape("rect",{x:RX,y:y+0.04,w:0.05,h:0.2,fill:{color:PRIMARY},line:{color:PRIMARY}});
s.addText("WHY NOW  ·  MARKET (UK / UK+EU-5)",{x:RX+0.12,y:y,w:6,h:0.25,fontSize:11,bold:true,color:INK,fontFace:"Calibri"});
y+=0.3;

// Stat cards
const gap=0.12;
const sw=(RW-2*gap)/3;
function stat(x,y,w,h,label,big,sub){
  s.addShape("roundRect",{x,y,w,h,rectRadius:0.1,fill:{color:CARD},line:{color:LINE,width:0.5}});
  s.addText(label,{x:x+0.12,y:y+0.08,w:w-0.2,h:0.22,fontSize:8,bold:true,color:MUTED,fontFace:"Calibri"});
  s.addText(big,{x:x+0.12,y:y+0.3,w:w-0.2,h:0.4,fontSize:18,bold:true,color:INK,fontFace:"Calibri"});
  s.addText(sub,{x:x+0.12,y:y+h-0.32,w:w-0.2,h:0.25,fontSize:9,color:CYAN,fontFace:"Calibri"});
}
stat(RX,           y, sw, 1.0, "TAM",  "£87.6B / £343B",  "ONS · VisitBritain · Eurostat");
stat(RX+sw+gap,    y, sw, 1.0, "SAM",  "£23.2B / £82.9B", "Phocuswright · GWI · Skift");
stat(RX+2*(sw+gap),y, sw, 1.0, "Y5 SOM","£444M  ·  £20.7M","GBV · net rev · 4.65% take");
y+=1.12;

// 3-col strip
const stripH=1.55;
const cw=(RW-2*gap)/3;
function panel(x,y,w,h,title){
  s.addShape("roundRect",{x,y,w,h,rectRadius:0.1,fill:{color:PANEL},line:{color:LINE,width:0.5}});
  s.addShape("rect",{x:x+0.15,y:y+0.16,w:0.05,h:0.18,fill:{color:PRIMARY},line:{color:PRIMARY}});
  s.addText(title,{x:x+0.27,y:y+0.12,w:w-0.3,h:0.25,fontSize:10,bold:true,color:INK,fontFace:"Calibri"});
}
// Traction
panel(RX,y,cw,stripH,"TRACTION");
const trc=[["Waitlist","3,200+"],["Creator LOIs","85"],["Supply partners","12"]];
trc.forEach((r,i)=>{
  const ry=y+0.5+i*0.32;
  s.addText(r[0],{x:RX+0.2,y:ry,w:cw-0.4,h:0.28,fontSize:10,color:MUTED,fontFace:"Calibri"});
  s.addText(r[1],{x:RX+0.2,y:ry,w:cw-0.4,h:0.28,fontSize:12,bold:true,color:CYAN,align:"right",fontFace:"Calibri"});
});
// Model
const mx=RX+cw+gap;
panel(mx,y,cw,stripH,"BUSINESS MODEL");
const ml=["• 4-7% take-rate (stays · tours · experiences)","• Creator rev-share 30-50% of net","• Tiered creator subs · brand partnerships","• Blended Y5 take 4.65%"];
ml.forEach((t,i)=>{
  s.addText(t,{x:mx+0.2,y:y+0.5+i*0.24,w:cw-0.3,h:0.24,fontSize:9,color:INK,fontFace:"Calibri"});
});
// Growth plan
const gx=RX+2*(cw+gap);
panel(gx,y,cw,stripH,"GROWTH PLAN");
const ph=[["PROVE","M0-18 · UK · 2.4k cr · £44M"],["SCALE","M18-44 · EU-5 · 14k cr · £259M"],["DEFEND","M44-60+ · Moat · 24k cr · £444M"]];
ph.forEach((r,i)=>{
  const ry=y+0.5+i*0.32;
  s.addShape("roundRect",{x:gx+0.2,y:ry+0.02,w:0.7,h:0.22,rectRadius:0.11,fill:{color:PRIMARY},line:{color:PRIMARY}});
  s.addText(r[0],{x:gx+0.2,y:ry+0.02,w:0.7,h:0.22,fontSize:8,bold:true,color:WHITE,align:"center",fontFace:"Calibri"});
  s.addText(r[1],{x:gx+0.95,y:ry,w:cw-1.05,h:0.28,fontSize:8.5,color:INK,fontFace:"Calibri"});
});
y+=stripH+0.15;

// Bottom: Team + Ask
const botH=H-y-0.25;
const teamW=RW*0.55-gap/2;
const askW=RW-teamW-gap;

panel(RX,y,teamW,botH,"TEAM");
const team=[
  ["Founder One","CEO · ex-Booking.com, EMEA supply"],
  ["Founder Two","CTO · ex-TikTok Shop, recommender systems"],
  ["Founder Three","CPO · ex-Airbnb, marketplace product"],
];
team.forEach((r,i)=>{
  const ry=y+0.5+i*0.36;
  s.addShape("ellipse",{x:RX+0.22,y:ry+0.05,w:0.18,h:0.18,fill:{color:CYAN},line:{color:CYAN}});
  s.addText(r[0],{x:RX+0.5,y:ry,w:1.4,h:0.28,fontSize:10,bold:true,color:INK,fontFace:"Calibri"});
  s.addText(r[1],{x:RX+1.95,y:ry,w:teamW-2.1,h:0.28,fontSize:9.5,color:MUTED,fontFace:"Calibri"});
});

// Ask
const ax=RX+teamW+gap;
panel(ax,y,askW,botH,"THE ASK  ·  £2.5M SAFE");
s.addText("£2.5M",{x:ax+0.2,y:y+0.45,w:1.6,h:0.5,fontSize:24,bold:true,color:INK,fontFace:"Calibri"});
s.addText("Seed · 18-month runway",{x:ax+1.85,y:y+0.6,w:askW-1.55,h:0.3,fontSize:10,color:MUTED,fontFace:"Calibri"});

// allocation bar
const barX=ax+0.2, barY=y+1.05, barW=askW-0.4, barH=0.18;
const alloc=[["GTM",0.40,PRIMARY],["Eng",0.35,GLOW],["Supply",0.15,CYAN],["G&A",0.10,MUTED]];
let bx=barX;
alloc.forEach(([l,p,col])=>{
  const sg=barW*p;
  s.addShape("rect",{x:bx,y:barY,w:sg,h:barH,fill:{color:col},line:{color:col}});
  bx+=sg;
});
// Legend
let lx=barX;
alloc.forEach(([l,p,col])=>{
  s.addShape("rect",{x:lx,y:barY+0.3,w:0.14,h:0.14,fill:{color:col},line:{color:col}});
  const t=`${l} ${Math.round(p*100)}%`;
  s.addText(t,{x:lx+0.18,y:barY+0.27,w:1.0,h:0.22,fontSize:9,bold:true,color:INK,fontFace:"Calibri"});
  lx+=0.85;
});

// Gates & contact
s.addText("Phase 1 gates: 2.4k cr · £44M GBV · 4.12% take · UK live",{x:ax+0.2,y:y+botH-0.55,w:askW-0.4,h:0.22,fontSize:8.5,bold:true,color:CYAN,fontFace:"Calibri"});
s.addText("Contact: founders@travidz.app  ·  travidz.app",{x:ax+0.2,y:y+botH-0.3,w:askW-0.4,h:0.25,fontSize:8.5,color:MUTED,fontFace:"Calibri"});

await pres.writeFile({fileName:"/mnt/documents/Travidz_Elevator_Pitch_v1.pptx"});
console.log("OK");
