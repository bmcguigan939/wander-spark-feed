import pptxgen from "pptxgenjs";
import fs from "fs";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
const W=13.333, H=7.5;

const BG="0F172A", PANEL="111C36", CARD="1B2742", PRIMARY="3B82F6",
      GLOW="60A5FA", CYAN="22D3EE", INK="F8FAFC", MUTED="94A3B8", LINE="243049", WHITE="FFFFFF";
const LIVE_URL="https://wander-spark-feed.lovable.app/invest";
const LIVE_LABEL="wander-spark-feed.lovable.app/invest";

const s = pres.addSlide();
s.background = { color: BG };

// Top bar
s.addShape("rect",{x:0,y:0,w:W,h:0.5,fill:{color:PANEL},line:{color:PANEL}});
s.addShape("ellipse",{x:0.22,y:0.12,w:0.26,h:0.26,fill:{color:PRIMARY},line:{color:PRIMARY}});
s.addText("TRAVIDZ",{x:0.6,y:0.07,w:1.4,h:0.36,bold:true,fontSize:16,color:WHITE,fontFace:"Calibri"});
s.addText("Creator-led travel commerce  ·  Seed round",{x:1.9,y:0.1,w:5,h:0.3,fontSize:10,color:MUTED,fontFace:"Calibri"});
s.addText("£2.5M SAFE  ·  18-mo runway  ·  Next: Series A at £18M ARR run-rate",{x:W-6.6,y:0.1,w:6.35,h:0.3,fontSize:11,bold:true,color:CYAN,align:"right",fontFace:"Calibri"});

// Bottom strip (TAM/SAM/SOM/Ask)
const BH=1.1, BY=H-BH-0.2;
s.addShape("roundRect",{x:0.2,y:BY,w:W-0.4,h:BH,rectRadius:0.13,fill:{color:PANEL},line:{color:LINE,width:0.5}});
const cw=(W-0.4)/4;
function mcell(i,label,big,sub){
  const x=0.2+i*cw;
  if(i>0) s.addShape("line",{x,y:BY+0.18,w:0,h:BH-0.36,line:{color:LINE,width:0.5}});
  s.addText(label,{x:x+0.25,y:BY+0.12,w:cw-0.4,h:0.22,fontSize:9,bold:true,color:MUTED,fontFace:"Calibri"});
  s.addText(big,{x:x+0.25,y:BY+0.32,w:cw-0.4,h:0.42,fontSize:18,bold:true,color:INK,fontFace:"Calibri"});
  s.addText(sub,{x:x+0.25,y:BY+BH-0.32,w:cw-0.4,h:0.25,fontSize:9,color:CYAN,fontFace:"Calibri"});
}
mcell(0,"TAM","£87.6B / £343B","UK / UK+EU-5 · ONS · Eurostat");
mcell(1,"SAM","£23.2B / £82.9B","36% creator-influenced × 80% bookable");
mcell(2,"Y5 SOM","£444M · £20.7M","GBV · net rev @ 4.65% (1.9% of UK SAM)");

// Ask cell with allocation bar
const ax=0.2+3*cw;
s.addText("THE ASK · £2.5M SAFE",{x:ax+0.25,y:BY+0.12,w:cw-0.4,h:0.22,fontSize:9,bold:true,color:MUTED,fontFace:"Calibri"});
s.addText("£2.5M",{x:ax+0.25,y:BY+0.32,w:1.2,h:0.42,fontSize:18,bold:true,color:INK,fontFace:"Calibri"});
s.addText("Seed · post → Series A",{x:ax+1.3,y:BY+0.42,w:cw-1.5,h:0.3,fontSize:9,color:MUTED,fontFace:"Calibri"});
const bx=ax+0.25, by=BY+BH-0.34, bw=cw-0.5, bh=0.18;
const alloc=[["GTM",0.40,PRIMARY],["Eng",0.35,GLOW],["Sup",0.15,CYAN],["G&A",0.10,MUTED]];
let cur=bx;
alloc.forEach(([l,p,col])=>{
  const sg=bw*p;
  s.addShape("rect",{x:cur,y:by,w:sg,h:bh,fill:{color:col},line:{color:col}});
  if(p>=0.2){ s.addText(`${l} ${Math.round(p*100)}%`,{x:cur+0.02,y:by+0.01,w:sg-0.02,h:bh-0.02,fontSize:7,bold:true,color:WHITE,fontFace:"Calibri"}); }
  cur+=sg;
});

// Central image panel
const IMG_TOP=0.6, IMG_BOT=BY-0.2;
const IMG_AREA_H = IMG_BOT - IMG_TOP;
const IMG_W=3.6;
const IMG_X=(W-IMG_W)/2;
const IMG_Y=IMG_TOP;
const IMG_H=IMG_AREA_H;
s.addShape("roundRect",{x:IMG_X-0.1,y:IMG_Y,w:IMG_W+0.2,h:IMG_H,rectRadius:0.15,fill:{color:PANEL},line:{color:CYAN,width:0.75}});

// Image
const imgB64=fs.readFileSync("/tmp/elevator_hero.png").toString("base64");
const isz=Math.min(IMG_W-0.2, IMG_H-1.7);
s.addImage({data:`image/png;base64,${imgB64}`,x:IMG_X+(IMG_W-isz)/2, y:IMG_Y+0.2, w:isz, h:isz});

// Tagline under image
s.addText("Discover. Book. Earn.",{x:IMG_X,y:IMG_Y+IMG_H-1.4,w:IMG_W,h:0.32,align:"center",fontSize:15,bold:true,color:INK,fontFace:"Calibri"});
s.addText("The shoppable feed for travel.",{x:IMG_X,y:IMG_Y+IMG_H-1.1,w:IMG_W,h:0.26,align:"center",fontSize:10,color:MUTED,fontFace:"Calibri"});

// Live pitch CTA pill (clickable)
const ctaW=3.1, ctaH=0.3;
const ctaX=IMG_X+(IMG_W-ctaW)/2, ctaY=IMG_Y+IMG_H-0.78;
s.addShape("roundRect",{x:ctaX,y:ctaY,w:ctaW,h:ctaH,rectRadius:0.15,fill:{color:PRIMARY},line:{color:PRIMARY}});
s.addText("▶  Try the live pitch  ·  "+LIVE_LABEL,{
  x:ctaX,y:ctaY,w:ctaW,h:ctaH,align:"center",valign:"middle",
  fontSize:9,bold:true,color:WHITE,fontFace:"Calibri",
  hyperlink:{url:LIVE_URL,tooltip:"Open the live investor pitch"}
});

// Chips
const chips=["Creators","Travellers","Suppliers"];
const chipW=0.9, chipGap=0.1;
const totalCW = chips.length*chipW + (chips.length-1)*chipGap;
let cx=IMG_X+(IMG_W-totalCW)/2;
chips.forEach(t=>{
  s.addShape("roundRect",{x:cx,y:IMG_Y+IMG_H-0.36,w:chipW,h:0.26,rectRadius:0.13,fill:{color:CARD},line:{color:CARD}});
  s.addText(t,{x:cx,y:IMG_Y+IMG_H-0.36,w:chipW,h:0.26,align:"center",fontSize:9,bold:true,color:CYAN,fontFace:"Calibri"});
  cx+=chipW+chipGap;
});

// Side columns
const LX=0.2, LW=IMG_X-0.1-LX-0.15;
const RX=IMG_X+IMG_W+0.1+0.15, RW=W-0.2-RX;
const colTop=IMG_TOP, colBot=BY-0.2;
const colH=colBot-colTop;
const cardH=(colH-2*0.12)/3;

function panel(x,y,w,h,title){
  s.addShape("roundRect",{x,y,w,h,rectRadius:0.1,fill:{color:PANEL},line:{color:LINE,width:0.5}});
  s.addShape("rect",{x:x+0.15,y:y+0.15,w:0.05,h:0.2,fill:{color:PRIMARY},line:{color:PRIMARY}});
  s.addText(title,{x:x+0.27,y:y+0.1,w:w-0.3,h:0.28,fontSize:10,bold:true,color:INK,fontFace:"Calibri"});
}

// LEFT: Problem, Traction, Team
const lyP = colTop;
const lyT = colTop+cardH+0.12;
const lyTm= colTop+2*(cardH+0.12);
panel(LX,lyP,LW,cardH,"PROBLEM");
s.addText([
  {text:"Discovery moved to creators; booking didn't. ",options:{color:INK}},
  {text:"£343B",options:{bold:true,color:INK}},
  {text:" flows through OTAs that pay creators ",options:{color:INK}},
  {text:"£0",options:{bold:true,color:INK}},
  {text:" and own the customer. Creators send the intent — OTAs keep the margin and the data.",options:{color:INK}}
],{x:LX+0.2,y:lyP+0.45,w:LW-0.4,h:cardH-0.55,fontSize:9.5,fontFace:"Calibri",valign:"top"});

panel(LX,lyT,LW,cardH,"TRACTION");
[["Waitlist (organic, UK)","3,200+"],["Creator LOIs · 4.2M reach","85"],["Supply signed · 3 cities","12"]].forEach(([l,v],i)=>{
  const ry=lyT+0.5+i*0.34;
  s.addText(l,{x:LX+0.2,y:ry,w:LW-0.4,h:0.3,fontSize:9,color:MUTED,fontFace:"Calibri"});
  s.addText(v,{x:LX+0.2,y:ry,w:LW-0.4,h:0.3,fontSize:12,bold:true,color:CYAN,align:"right",fontFace:"Calibri"});
});

panel(LX,lyTm,LW,cardH,"TEAM");
[["CEO","ex-Booking.com · scaled supply 0→1"],
 ["CTO","ex-TikTok Shop · creator-commerce rails"],
 ["CPO","ex-Airbnb · marketplace growth"]].forEach(([n,b],i)=>{
  const ry=lyTm+0.5+i*0.34;
  s.addShape("ellipse",{x:LX+0.2,y:ry+0.06,w:0.16,h:0.16,fill:{color:CYAN},line:{color:CYAN}});
  s.addText(n,{x:LX+0.45,y:ry,w:0.6,h:0.28,fontSize:9.5,bold:true,color:INK,fontFace:"Calibri"});
  s.addText(b,{x:LX+1.0,y:ry,w:LW-1.15,h:0.28,fontSize:8.5,color:MUTED,fontFace:"Calibri"});
});

// RIGHT: Solution, Business Model, Growth Plan
const ryS=colTop, ryB=colTop+cardH+0.12, ryG=colTop+2*(cardH+0.12);
panel(RX,ryS,RW,cardH,"SOLUTION");
s.addText([
  {text:"Shoppable travel feed.",options:{bold:true,color:INK}},
  {text:" Creator posts trip → traveller books in 2 taps → creator earns for life. Native checkout, unified inventory (stays · tours · experiences), persistent attribution.",options:{color:INK}}
],{x:RX+0.2,y:ryS+0.45,w:RW-0.4,h:cardH-0.55,fontSize:9.5,fontFace:"Calibri",valign:"top"});

panel(RX,ryB,RW,cardH,"BUSINESS MODEL");
["• Take-rate 4-7%  ·  blended Y5 4.65%",
 "• Creator rev-share 30-50% of net",
 "• ~55% contribution margin at scale",
 "• Zero paid acquisition Y1-2 (creator-led)"].forEach((t,i)=>{
  s.addText(t,{x:RX+0.2,y:ryB+0.48+i*0.26,w:RW-0.3,h:0.26,fontSize:9.5,color:INK,fontFace:"Calibri"});
});

panel(RX,ryG,RW,cardH,"GROWTH PLAN: PROVE → SCALE → DEFEND");
[["PROVE","M0-18 · UK · 2.4k cr · £44M GBV · 40% M3 retention"],
 ["SCALE","M18-44 · EU-5 · 14k cr · £259M · CAC payback <6mo"],
 ["DEFEND","M44-60 · 24k cr · £444M · ledger + supply lock-in"]].forEach(([p,desc],i)=>{
  const ry=ryG+0.5+i*0.34;
  s.addShape("roundRect",{x:RX+0.2,y:ry+0.04,w:0.7,h:0.22,rectRadius:0.11,fill:{color:PRIMARY},line:{color:PRIMARY}});
  s.addText(p,{x:RX+0.2,y:ry+0.04,w:0.7,h:0.22,fontSize:8,bold:true,color:WHITE,align:"center",fontFace:"Calibri"});
  s.addText(desc,{x:RX+0.95,y:ry,w:RW-1.1,h:0.3,fontSize:7.5,color:INK,fontFace:"Calibri"});
});

await pres.writeFile({fileName:"/mnt/documents/Travidz_Elevator_Pitch_v3.pptx"});
console.log("OK");
