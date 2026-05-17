from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

W, H = landscape(A4)  # 842 x 595 pt

# Palette
BG       = HexColor("#0F172A")
PANEL    = HexColor("#111C36")
CARD     = HexColor("#1B2742")
PRIMARY  = HexColor("#3B82F6")
GLOW     = HexColor("#60A5FA")
CYAN     = HexColor("#22D3EE")
INK      = HexColor("#F8FAFC")
MUTED    = HexColor("#94A3B8")
LINE     = HexColor("#243049")

OUT_PDF = "/mnt/documents/Travidz_Elevator_Pitch_v1.pdf"
HERO    = "/tmp/elevator_hero.png"

c = canvas.Canvas(OUT_PDF, pagesize=landscape(A4))

# ---- Background
c.setFillColor(BG); c.rect(0,0,W,H,fill=1,stroke=0)

# ---- Top bar
TOP_H = 44
c.setFillColor(PANEL); c.rect(0,H-TOP_H,W,TOP_H,fill=1,stroke=0)
c.setFillColor(PRIMARY); c.circle(28, H-22, 10, fill=1, stroke=0)
c.setFillColor(white); c.setFont("Helvetica-Bold", 14); c.drawString(44, H-26, "TRAVIDZ")
c.setFillColor(MUTED); c.setFont("Helvetica", 10); c.drawString(120, H-26, "Creator-led travel commerce  ·  Seed round")
c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 11)
c.drawRightString(W-24, H-26, "Raising £2.5M SAFE  ·  18-month runway  ·  UK → EU-5")

# ---- Hero panel (left third)
HERO_X, HERO_Y, HERO_W, HERO_H = 18, 18, 270, H-TOP_H-36
c.setFillColor(PANEL); c.roundRect(HERO_X, HERO_Y, HERO_W, HERO_H, 12, fill=1, stroke=0)
# cyan glow ring
c.setStrokeColor(CYAN); c.setLineWidth(1)
c.roundRect(HERO_X+1, HERO_Y+1, HERO_W-2, HERO_H-2, 12, fill=0, stroke=1)

img = ImageReader(HERO)
iw, ih = img.getSize()
target_w = HERO_W - 20
target_h = target_w * ih/iw
if target_h > HERO_H - 90:
    target_h = HERO_H - 90
    target_w = target_h * iw/ih
ix = HERO_X + (HERO_W - target_w)/2
iy = HERO_Y + HERO_H - target_h - 18
c.drawImage(img, ix, iy, target_w, target_h, mask='auto')

# Tagline under image
c.setFillColor(INK); c.setFont("Helvetica-Bold", 13)
c.drawCentredString(HERO_X+HERO_W/2, HERO_Y+58, "Discover. Book. Earn.")
c.setFillColor(MUTED); c.setFont("Helvetica", 9)
c.drawCentredString(HERO_X+HERO_W/2, HERO_Y+44, "The shoppable feed for travel.")
# 3 chips
chips = ["Creators", "Travellers", "Suppliers"]
cx = HERO_X + 16; cy = HERO_Y + 18
for ch in chips:
    w = c.stringWidth(ch, "Helvetica-Bold", 8) + 18
    c.setFillColor(CARD); c.roundRect(cx, cy, w, 16, 8, fill=1, stroke=0)
    c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 8); c.drawString(cx+9, cy+5, ch)
    cx += w + 8

# ---- Right column geometry
RX = 305
RW = W - RX - 18
RY_TOP = H - TOP_H - 12

def section_title(x, y, text, accent=PRIMARY):
    c.setFillColor(accent); c.rect(x, y-2, 3, 12, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 10)
    c.drawString(x+8, y, text.upper())

def body(x, y, text, size=9, color=INK, w=RW, leading=11):
    style = ParagraphStyle("b", fontName="Helvetica", fontSize=size,
                           textColor=color, leading=leading)
    p = Paragraph(text, style)
    p.wrapOn(c, w, 100)
    p.drawOn(c, x, y - p.height + leading - 2)
    return p.height

# PROBLEM
y = RY_TOP - 8
section_title(RX, y, "Problem")
y -= 14
h = body(RX, y, "Travel is a <b>£343B</b> market booked blind. Gen-Z and Millennials discover trips on creators and TikTok, then jump to OTAs that pay creators nothing. Discovery and booking are broken apart.", w=RW)
y -= h + 6

# SOLUTION
section_title(RX, y, "Solution")
y -= 14
h = body(RX, y, "<b>Travidz</b> is a shoppable travel feed. Creators post trips → travellers book in-app → creators earn revenue share on every booking. One vertical feed. One checkout. One ledger.", w=RW)
y -= h + 10

# MARKET STRIP (3 stat cards)
M_Y = y - 60
gap = 10
card_w = (RW - 2*gap) / 3
def stat_card(x, y, w, h, label, big, sub):
    c.setFillColor(CARD); c.roundRect(x, y, w, h, 8, fill=1, stroke=0)
    c.setStrokeColor(LINE); c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, 8, fill=0, stroke=1)
    c.setFillColor(MUTED); c.setFont("Helvetica-Bold", 7); c.drawString(x+10, y+h-14, label.upper())
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 13); c.drawString(x+10, y+h-32, big)
    c.setFillColor(CYAN); c.setFont("Helvetica", 8); c.drawString(x+10, y+10, sub)

section_title(RX, y, "Why now  ·  Market (UK / UK+EU-5)")
stat_card(RX,                 M_Y, card_w, 56, "TAM",  "£87.6B / £343B",  "ONS · VisitBritain · Eurostat")
stat_card(RX+card_w+gap,      M_Y, card_w, 56, "SAM",  "£23.2B / £82.9B", "Phocuswright · GWI · Skift")
stat_card(RX+2*(card_w+gap),  M_Y, card_w, 56, "Y5 SOM","£444M  ·  £20.7M", "GBV · net rev · 4.65% take")

y = M_Y - 12

# ---- 3 col strip: Traction · Model · Growth Plan
STRIP_H = 110
STRIP_Y = y - STRIP_H
col_w = (RW - 2*gap) / 3

def panel(x, y, w, h, title):
    c.setFillColor(PANEL); c.roundRect(x, y, w, h, 8, fill=1, stroke=0)
    c.setStrokeColor(LINE); c.roundRect(x, y, w, h, 8, fill=0, stroke=1)
    c.setFillColor(PRIMARY); c.rect(x+10, y+h-16, 3, 10, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 9)
    c.drawString(x+18, y+h-14, title.upper())

# Traction
panel(RX, STRIP_Y, col_w, STRIP_H, "Traction")
items = [("Waitlist",  "3,200+"), ("Creator LOIs", "85"), ("Supply partners", "12")]
for i,(lbl,val) in enumerate(items):
    yy = STRIP_Y + STRIP_H - 36 - i*22
    c.setFillColor(MUTED); c.setFont("Helvetica", 8); c.drawString(RX+18, yy, lbl)
    c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 11); c.drawRightString(RX+col_w-14, yy, val)

# Model
mx = RX + col_w + gap
panel(mx, STRIP_Y, col_w, STRIP_H, "Business model")
c.setFillColor(INK); c.setFont("Helvetica", 8)
lines = ["• 4-7% take-rate (stays · tours · experiences)",
         "• Creator rev-share 30-50% of net",
         "• Tiered creator subs · brand partnerships",
         "• Blended Y5 take 4.65%"]
for i,ln in enumerate(lines):
    c.drawString(mx+18, STRIP_Y+STRIP_H-36-i*14, ln)

# Growth plan
gx = RX + 2*(col_w+gap)
panel(gx, STRIP_Y, col_w, STRIP_H, "Growth plan")
phases = [
    ("PROVE",  "M0-18 · UK · 2.4k cr · £44M"),
    ("SCALE",  "M18-44 · EU-5 · 14k cr · £259M"),
    ("DEFEND", "M44-60+ · Moat · 24k cr · £444M"),
]
for i,(p,desc) in enumerate(phases):
    yy = STRIP_Y + STRIP_H - 36 - i*22
    # phase chip
    pw = c.stringWidth(p, "Helvetica-Bold", 7) + 14
    c.setFillColor(PRIMARY); c.roundRect(gx+14, yy-3, pw, 12, 6, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 7); c.drawString(gx+21, yy+1, p)
    c.setFillColor(INK); c.setFont("Helvetica", 7); c.drawString(gx+14+pw+5, yy+1, desc)

y = STRIP_Y - 10

# ---- Bottom: Team + Ask
BOT_H = y - 18
team_w = RW * 0.55 - gap/2
ask_w  = RW - team_w - gap

# Team
panel(RX, 18, team_w, BOT_H, "Team")
team = [
    ("Founder One",  "CEO · ex-Booking.com, EMEA supply"),
    ("Founder Two",  "CTO · ex-TikTok Shop, recommender systems"),
    ("Founder Three","CPO · ex-Airbnb, marketplace product"),
]
for i,(n,b) in enumerate(team):
    yy = 18 + BOT_H - 34 - i*22
    c.setFillColor(CYAN); c.circle(RX+22, yy+4, 5, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 9); c.drawString(RX+34, yy+2, n)
    c.setFillColor(MUTED); c.setFont("Helvetica", 8); c.drawString(RX+34+c.stringWidth(n,"Helvetica-Bold",9)+8, yy+2, b)

# Ask
ax = RX + team_w + gap
panel(ax, 18, ask_w, BOT_H, "The ask  ·  £2.5M SAFE")
c.setFillColor(INK); c.setFont("Helvetica-Bold", 18)
c.drawString(ax+14, 18+BOT_H-44, "£2.5M")
c.setFillColor(MUTED); c.setFont("Helvetica", 8)
c.drawString(ax+70, 18+BOT_H-42, "Seed · 18-month runway")

# allocation bar
bar_x = ax+14; bar_y = 18+BOT_H-66; bar_w = ask_w-28; bar_h = 12
alloc = [("GTM",0.40,PRIMARY),("Eng",0.35,GLOW),("Supply",0.15,CYAN),("G&A",0.10,MUTED)]
cx = bar_x
for lbl,pct,col in alloc:
    seg = bar_w*pct
    c.setFillColor(col); c.rect(cx, bar_y, seg, bar_h, fill=1, stroke=0)
    cx += seg
# legend
lx = bar_x; ly = bar_y - 14
for lbl,pct,col in alloc:
    c.setFillColor(col); c.rect(lx, ly, 8, 8, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 8)
    txt = f"{lbl} {int(pct*100)}%"
    c.drawString(lx+12, ly+1, txt)
    lx += c.stringWidth(txt,"Helvetica-Bold",8) + 14

# Gates
c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 7.5)
c.drawString(ax+14, 36, "Phase 1 gates: 2.4k creators · £44M GBV · 4.12% take · UK live")
c.setFillColor(MUTED); c.setFont("Helvetica", 7)
c.drawString(ax+14, 24, "Contact: founders@travidz.app  ·  travidz.app")

c.showPage()
c.save()
print("OK", OUT_PDF)
