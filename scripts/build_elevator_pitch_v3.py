from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

W, H = landscape(A4)  # 842 x 595 pt

BG=HexColor("#0F172A"); PANEL=HexColor("#111C36"); CARD=HexColor("#1B2742")
PRIMARY=HexColor("#3B82F6"); GLOW=HexColor("#60A5FA"); CYAN=HexColor("#22D3EE")
INK=HexColor("#F8FAFC"); MUTED=HexColor("#94A3B8"); LINE=HexColor("#243049")

OUT="/mnt/documents/Travidz_Elevator_Pitch_v3.pdf"
HERO="/tmp/elevator_hero.png"

c = canvas.Canvas(OUT, pagesize=landscape(A4))
c.setFillColor(BG); c.rect(0,0,W,H,fill=1,stroke=0)

# Top bar
TH=40
c.setFillColor(PANEL); c.rect(0,H-TH,W,TH,fill=1,stroke=0)
c.setFillColor(PRIMARY); c.circle(26, H-20, 9, fill=1, stroke=0)
c.setFillColor(white); c.setFont("Helvetica-Bold", 13); c.drawString(40, H-24, "TRAVIDZ")
c.setFillColor(MUTED); c.setFont("Helvetica", 9); c.drawString(110, H-24, "Creator-led travel commerce  ·  Seed round")
c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 10)
c.drawRightString(W-22, H-24, "£2.5M SAFE  ·  18-mo runway  ·  Next: Series A at £18M ARR run-rate")

# Bottom market strip (full width, contains TAM/SAM/SOM + Ask)
BOT_H=78
BOT_Y=14
c.setFillColor(PANEL); c.roundRect(14, BOT_Y, W-28, BOT_H, 10, fill=1, stroke=0)
c.setStrokeColor(LINE); c.roundRect(14, BOT_Y, W-28, BOT_H, 10, fill=0, stroke=1)

# 4 cells: TAM | SAM | Y5 SOM | The Ask
cells_x = 14; cells_w = W-28
cw = cells_w/4
def market_cell(i, label, big, sub, accent=CYAN):
    x = cells_x + i*cw
    if i>0:
        c.setStrokeColor(LINE); c.setLineWidth(0.5)
        c.line(x, BOT_Y+12, x, BOT_Y+BOT_H-12)
    c.setFillColor(MUTED); c.setFont("Helvetica-Bold", 8)
    c.drawString(x+18, BOT_Y+BOT_H-18, label.upper())
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 17)
    c.drawString(x+18, BOT_Y+BOT_H-40, big)
    c.setFillColor(accent); c.setFont("Helvetica", 8.5)
    c.drawString(x+18, BOT_Y+12, sub)

market_cell(0, "TAM",   "£87.6B / £343B",  "UK / UK+EU-5 · ONS · Eurostat")
market_cell(1, "SAM",   "£23.2B / £82.9B", "36% creator-influenced × 80% bookable")
market_cell(2, "Y5 SOM","£444M · £20.7M",  "GBV · net rev @ 4.65% (1.9% of UK SAM)")
# Ask cell
x = cells_x + 3*cw
c.setFillColor(MUTED); c.setFont("Helvetica-Bold", 8)
c.drawString(x+18, BOT_Y+BOT_H-18, "THE ASK · £2.5M SAFE")
c.setFillColor(INK); c.setFont("Helvetica-Bold", 17)
c.drawString(x+18, BOT_Y+BOT_H-40, "£2.5M")
c.setFillColor(MUTED); c.setFont("Helvetica", 8)
c.drawString(x+72, BOT_Y+BOT_H-38, "Seed · post → Series A")
# mini allocation bar
bx = x+18; by = BOT_Y+22; bw = cw-36; bh=8
alloc=[("GTM",0.40,PRIMARY),("Eng",0.35,GLOW),("Sup",0.15,CYAN),("G&A",0.10,MUTED)]
cur=bx
for l,p,col in alloc:
    sg=bw*p
    c.setFillColor(col); c.rect(cur, by, sg, bh, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 6.5)
    c.drawString(cur+3, by+2, f"{l[:3]} {int(p*100)}")
    cur+=sg

# Central image area
IMG_AREA_TOP = H-TH-12        # 543
IMG_AREA_BOT = BOT_Y+BOT_H+12 # 104
IMG_AREA_H   = IMG_AREA_TOP - IMG_AREA_BOT  # ~439
IMG_W = 230
IMG_H = IMG_AREA_H - 10
IMG_X = (W - IMG_W)/2
IMG_Y = IMG_AREA_BOT + 5

# Central panel behind image
c.setFillColor(PANEL); c.roundRect(IMG_X-8, IMG_Y-4, IMG_W+16, IMG_H+8, 12, fill=1, stroke=0)
c.setStrokeColor(CYAN); c.setLineWidth(1)
c.roundRect(IMG_X-8, IMG_Y-4, IMG_W+16, IMG_H+8, 12, fill=0, stroke=1)

img = ImageReader(HERO)
iw,ih = img.getSize()
# fit
target_w = IMG_W
target_h = target_w*ih/iw
if target_h > IMG_H - 70:
    target_h = IMG_H - 70
    target_w = target_h*iw/ih
ix = IMG_X + (IMG_W - target_w)/2
iy = IMG_Y + IMG_H - target_h - 14
c.drawImage(img, ix, iy, target_w, target_h, mask='auto')

# Tagline + chips under image (inside center panel)
c.setFillColor(INK); c.setFont("Helvetica-Bold", 13)
c.drawCentredString(IMG_X+IMG_W/2, IMG_Y+50, "Discover. Book. Earn.")
c.setFillColor(MUTED); c.setFont("Helvetica", 8.5)
c.drawCentredString(IMG_X+IMG_W/2, IMG_Y+36, "The shoppable feed for travel.")
chips=["Creators","Travellers","Suppliers"]
total = sum(c.stringWidth(t,"Helvetica-Bold",8)+18 for t in chips) + 8*(len(chips)-1)
cx = IMG_X + (IMG_W - total)/2; cy = IMG_Y+10
for t in chips:
    w = c.stringWidth(t,"Helvetica-Bold",8)+18
    c.setFillColor(CARD); c.roundRect(cx, cy, w, 16, 8, fill=1, stroke=0)
    c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 8); c.drawString(cx+9, cy+5, t)
    cx += w + 8

# Side columns: left and right of image
GAP = 14
LX = 18
LW = IMG_X - 8 - LX - GAP
RX = IMG_X + IMG_W + 8 + GAP
RW = W - 18 - RX

def card(x,y,w,h,title,accent=PRIMARY):
    c.setFillColor(PANEL); c.roundRect(x,y,w,h,8,fill=1,stroke=0)
    c.setStrokeColor(LINE); c.setLineWidth(0.5)
    c.roundRect(x,y,w,h,8,fill=0,stroke=1)
    c.setFillColor(accent); c.rect(x+10, y+h-16, 3, 11, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 9)
    c.drawString(x+18, y+h-14, title.upper())

def body(x,y,w,text,size=9,leading=11,color=INK):
    st=ParagraphStyle("b",fontName="Helvetica",fontSize=size,
                      textColor=color,leading=leading)
    p=Paragraph(text,st); p.wrapOn(c,w,200)
    p.drawOn(c, x, y - p.height + leading - 2)
    return p.height

# 3 cards per side
COL_H = IMG_AREA_H
card_h = (COL_H - 2*10) / 3  # 3 cards, 2 gaps of 10
gap_v = 10

def col_card(x, idx, w, title, accent=PRIMARY):
    y = IMG_AREA_TOP - (idx+1)*card_h - idx*gap_v
    card(x, y, w, card_h, title, accent)
    return y

# LEFT COLUMN: Problem, Traction, Team
y1 = col_card(LX, 0, LW, "Problem")
body(LX+14, y1+card_h-30, LW-28,
     "Discovery moved to creators; booking didn't. <b>£343B</b> flows through OTAs that pay creators <b>£0</b> and own the customer. Creators send the intent — OTAs keep the margin and the data.",
     size=8.5, leading=10.5)

y2 = col_card(LX, 1, LW, "Traction")
items=[("Waitlist (organic, UK)","3,200+"),("Creator LOIs · 4.2M reach","85"),("Supply signed · 3 cities","12")]
for i,(lbl,val) in enumerate(items):
    yy = y2 + card_h - 32 - i*18
    c.setFillColor(MUTED); c.setFont("Helvetica", 8); c.drawString(LX+18, yy, lbl)
    c.setFillColor(CYAN);  c.setFont("Helvetica-Bold", 11); c.drawRightString(LX+LW-14, yy, val)

y3 = col_card(LX, 2, LW, "Team")
team=[("CEO","ex-Booking.com · scaled supply 0→1"),
      ("CTO","ex-TikTok Shop · creator-commerce rails"),
      ("CPO","ex-Airbnb · marketplace growth")]
for i,(n,b) in enumerate(team):
    yy = y3 + card_h - 32 - i*18
    c.setFillColor(CYAN); c.circle(LX+22, yy+3, 4, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 8.5); c.drawString(LX+32, yy, n)
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.5); c.drawString(LX+32+c.stringWidth(n,"Helvetica-Bold",8.5)+6, yy, b)

# RIGHT COLUMN: Solution, Business Model, Growth Plan
y1 = col_card(RX, 0, RW, "Solution")
body(RX+14, y1+card_h-30, RW-28,
     "Shoppable travel feed. Creator posts trip → traveller books in 2 taps → creator earns for life. Native checkout, unified inventory (stays · tours · experiences), persistent attribution.",
     size=8.5, leading=10.5)

y2 = col_card(RX, 1, RW, "Business model")
lines=["• Take-rate 4-7%  ·  blended Y5 4.65%",
       "• Creator rev-share 30-50% of net",
       "• ~55% contribution margin at scale",
       "• Zero paid acquisition Y1-2 (creator-led)"]
for i,ln in enumerate(lines):
    c.setFillColor(INK); c.setFont("Helvetica", 8.5)
    c.drawString(RX+18, y2+card_h-30-i*14, ln)

y3 = col_card(RX, 2, RW, "Growth plan: Prove → Scale → Defend")
phases=[("PROVE",  "M0-18 · UK · 2.4k cr · £44M GBV · gate: 40% M3 retention"),
        ("SCALE",  "M18-44 · EU-5 · 14k cr · £259M · gate: CAC payback <6mo"),
        ("DEFEND", "M44-60 · 24k cr · £444M · moat: ledger + supply lock-in")]
for i,(p,desc) in enumerate(phases):
    yy = y3 + card_h - 32 - i*18
    pw = c.stringWidth(p,"Helvetica-Bold",7)+14
    c.setFillColor(PRIMARY); c.roundRect(RX+18, yy-3, pw, 12, 6, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 7); c.drawString(RX+25, yy+1, p)
    c.setFillColor(INK); c.setFont("Helvetica", 6.8); c.drawString(RX+18+pw+6, yy+1, desc)

c.showPage(); c.save()
print("OK", OUT)
