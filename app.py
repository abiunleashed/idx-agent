from flask import Flask, request, jsonify, render_template_string
import yfinance as yf
import anthropic
import os, time, threading
from datetime import datetime
import pytz
app = Flask(__name__)
# ============================================================
# CONFIG
# ============================================================
PORTFOLIO = {
'BBCA.JK': {'w':25, 'name':'Bank Central Asia'},
'DCII.JK': {'w':20, 'name':'DCI Indonesia'},
'ICBP.JK': {'w':15, 'name':'Indofood CBP'},
'TLKM.JK': {'w':15, 'name':'Telkom Indonesia'},
'BMRI.JK': {'w': 5, 'name':'Bank Mandiri'},
'AMRT.JK': {'w': 8, 'name':'Alfamart'},
'INDF.JK': {'w': 2, 'name':'Indofood'},
}
RADAR = ['MYOR.JK','SIDO.JK','ACES.JK','BREN.JK']
ALL = list(PORTFOLIO.keys()) + RADAR
CACHE_TTL = 300 # 5 dakika — Gemini'nin fikri
SIGNAL_INTERVAL = 120
MAX_HISTORY = 8
market_cache = {} # {ticker: data_point}
signals = []
lock = threading.Lock()
# ============================================================
# RATE LIMIT
# ============================================================
request_log = {}
def is_limited(ip):
now = time.time()
window, limit = 10, 8
if ip not in request_log:
request_log[ip] = []
request_log[ip] = [t for t in request_log[ip] if now - t < window]
if len(request_log[ip]) >= limit:
return True
request_log[ip].append(now)
return False
# ============================================================
# RSI — EWM metodu (Gemini'nin fikri, pandas olmadan)
# ============================================================
def calc_rsi_ewm(closes, period=14):
if len(closes) < period + 2:
return 50.0
gains, losses = [], []
for i in range(1, len(closes)):
delta = closes[i] - closes[i-1]
gains.append(max(delta, 0.0))
losses.append(max(-delta, 0.0))
alpha = 1.0 / period
# Gemini duzeltmesi: ilk deger basit ortalama ile baslat
avg_gain = sum(gains[:period]) / period
avg_loss = sum(losses[:period]) / period
for i in range(period, len(gains)):
avg_gain = alpha * gains[i] + (1 - alpha) * avg_gain
avg_loss = alpha * losses[i] + (1 - alpha) * avg_loss
rs = avg_gain / (avg_loss + 1e-9)
return round(100 - (100 / (1 + rs)), 1)
# ============================================================
# SCORING ENGINE
# ============================================================
def score_stock(rsi, momentum, vol_ratio):
score = 50
# RSI
if rsi < 30: score += 20
elif rsi < 40: score += 10
elif rsi > 70: score -= 20
elif rsi > 60: score -= 10
# Momentum
if momentum > 0.05: score += 15
elif momentum > 0.02: score += 8
elif momentum < -0.05: score -= 15
elif momentum < -0.02: score -= 8
# Hacim
if vol_ratio > 1.5: score += 10
elif vol_ratio < 0.5: score -= 5
return max(0, min(100, score))
# ============================================================
# TOPLU VERİ ÇEKME — Gemini'nin en iyi fikri
# ============================================================
def fetch_all():
try:
# Tek seferde tüm hisseleri çek — çok daha hızlı
df = yf.download(
ALL,
period='1mo',
interval='1d',
group_by='ticker',
progress=False,
threads=True
)
temp = {}
for t in ALL:
try:
h = df[t].dropna() if len(ALL) > 1 else df.dropna()
if len(h) < 20:
continue
closes = [float(x) for x in h['Close'].values]
vols = [float(x) for x in h['Volume'].values]
rsi = calc_rsi_ewm(closes)
momentum = (closes[-1] / closes[-5]) - 1 if len(closes) >= 5 else 0
vol_ratio = vols[-1] / (sum(vols) / len(vols) + 1e-9)
s = score_stock(rsi, momentum, vol_ratio)
temp[t] = {
'price': round(closes[-1], 0),
'prev': round(closes[-2], 0),
'rsi': rsi,
'momentum': round(momentum * 100, 2),
'vol_ratio': round(vol_ratio, 2),
'score': s,
'symbol': t.replace('.JK', ''),
'ts': time.time(),
}
except Exception:
continue
return temp
except Exception as e:
print(f"fetch_all error: {e}")
return {}
# ============================================================
# BACKGROUND WORKER
# ============================================================
def worker():
global market_cache, signals
# İlk çalıştırmada kısa bekle
time.sleep(5)
while True:
data = fetch_all()
if data:
new_signals = []
for t, d in data.items():
if d['score'] >= 72:
new_signals.append({
'icon': ' ',
'type': 'STRONG_BUY',
'text': f"{d['symbol']} guclu alim",
'detail': f"Skor:{d['score']} RSI:{d['rsi']} Mom:{d['momentum']:+.1f}%",
'score': d['score'],
'c': 0.85,
'time': datetime.now().strftime('%H:%M'),
})
elif d['score'] >= 62:
new_signals.append({
'icon': ' ',
'type': 'BUY',
'text': f"{d['symbol']} alim bolgesi",
'detail': f"Skor:{d['score']} RSI:{d['rsi']} Mom:{d['momentum']:+.1f}%",
'score': d['score'],
'c': 0.70,
'time': datetime.now().strftime('%H:%M'),
})
elif d['score'] <= 28:
new_signals.append({
'icon': ' ',
'type': 'SELL',
'text': f"{d['symbol']} sat/bekle",
'detail': f"Skor:{d['score']} RSI:{d['rsi']} Mom:{d['momentum']:+.1f}%",
'score': d['score'],
'c': 0.80,
'time': datetime.now().strftime('%H:%M'),
})
with lock:
market_cache = data
signals = sorted(new_signals, key=lambda x: x['score'], reverse=True)[:10]
time.sleep(SIGNAL_INTERVAL)
threading.Thread(target=worker, daemon=True).start()
# ============================================================
# WOLF PROMPT
# ============================================================
WOLF = """Sen "Wolf" adinda bir IDX trading ve yatirim ajaninin.
KIMLIGIN:
20 yillik Goldman Sachs, Bridgewater, Citadel deneyimi.
Jakarta'dasin. Mustering Yahya - Turk, 20 yildir Endonezya'da.
KISILIGIN:
- "Wolf burada." ile basla
- Sert, direkt, veri odakli
- "Piyasa seni aptal yerine koyar."
- Sinyal yoksa: "Bekle."
- Turkce konusursun.
ANALIZ FORMATI:
1. DURUM: (Ozet)
2. RISK: (Kritik seviye)
3. KARAR: (AL/SAT/BEKLE + gerekce)
PORTFOY (600 juta IDR):
BBCA yuzde25, DCII yuzde20, ICBP yuzde15, TLKM yuzde15
BMRI yuzde5, AMRT yuzde8, INDF yuzde2
RADAR: MYOR, SIDO, ACES, BREN
STRATEJI: Buffett long term, DCA 7.5 juta/ay, stop-loss eksi12pct
MAKRO: BI faiz yuzde4.75, Rupiah 16500, Fitch negatif bankalar"""
# ============================================================
# CHAT API
# ============================================================
@app.route('/api/chat', methods=['POST'])
def chat():
ip = request.headers.get('X-Forwarded-For', request.remote_addr)
if ip:
ip = ip.split(',')[0].strip()
if is_limited(ip):
return jsonify({'response': 'Wolf: Yavasla.'})
api_key = os.environ.get('ANTHROPIC_API_KEY')
if not api_key:
return jsonify({'response': 'API key eksik.'})
data = request.json or {}
user_msg = data.get('user_message', '').strip()
msgs = data.get('messages', [])
if not user_msg:
return jsonify({'response': 'Mesaj bos.'})
# Piyasa baglamı — RSI + Skor + Momentum
with lock:
cache_snap = dict(market_cache)
sigs_snap = list(signals)
ctx = []
for t in ALL:
d = cache_snap.get(t)
if d:
ch = ((d['price'] - d['prev']) / d['prev'] * 100) if d['prev'] else 0
ctx.append(
f"{d['symbol']}: {d['price']:,.0f} IDR ({ch:+.1f}%) "
f"| RSI:{d['rsi']} | Skor:{d['score']} | Mom:{d['momentum']:+.1f}%"
)
sig_txt = ''
if sigs_snap:
sig_txt = '\nSINYALLER:\n' + '\n'.join(
[f"{s['icon']} {s['text']} — {s['detail']}" for s in sigs_snap[:5]]
)
wib = pytz.timezone('Asia/Jakarta')
now = datetime.now(wib)
system = (
WOLF +
f"\n\nCANLI PIYASA ({now.strftime('%d %b %H:%M')} WIB):\n" +
'\n'.join(ctx) + sig_txt
)
try:
client = anthropic.Anthropic(api_key=api_key)
res = client.messages.create(
model='claude-sonnet-4-20250514',
max_tokens=700,
system=system,
messages=msgs[-MAX_HISTORY:] + [{'role': 'user', 'content': user_msg}]
)
return jsonify({'response': res.content[0].text})
except Exception as e:
return jsonify({'response': f'Hata: {str(e)}'})
# ============================================================
# TICKER & SIGNALS
# ============================================================
@app.route('/api/ticker')
def ticker():
with lock:
snap = dict(market_cache)
out = []
for t in ALL:
d = snap.get(t)
if d:
ch = ((d['price'] - d['prev']) / d['prev'] * 100) if d['prev'] else 0
out.append({
'symbol': d['symbol'],
'price': f"{d['price']:,.0f}",
'change': round(ch, 2),
'rsi': d['rsi'],
'score': d['score'],
})
return jsonify(out)
@app.route('/api/signals')
def get_signals():
with lock:
return jsonify(list(signals))
@app.route('/health')
def health():
with lock:
cached = len(market_cache)
return jsonify({'status': 'ok', 'cached_tickers': cached})
# ============================================================
# UI
# ============================================================
HTML = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wolf 1.1 - IDX</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#080810;color:#e0e0e0;font-family:'Courier New',monospace;height:100vh;display:.hdr{background:linear-gradient(135deg,#0d1117,#161b27);border-bottom:2px solid #c9a227;padding:.logo{display:flex;align-items:center;gap:10px}
.logo-icon{font-size:26px}
.logo-title{font-size:19px;font-weight:bold;color:#c9a227;letter-spacing:3px}
.logo-sub{font-size:10px;color:#555;letter-spacing:2px}
.hdr-right{display:flex;gap:10px;align-items:center}
.pill{background:#0d1a2a;border:1px solid #1e3a5f;border-radius:20px;padding:5px 12px;font-size:.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4caf50;margin-right:@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.ticker{background:#0a0a14;border-bottom:1px solid #1a1a2e;padding:6px 20px;display:flex;gap:.ticker::-webkit-scrollbar{display:none}
.tick{display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:12px}
.tick-sym{color:#c9a227;font-weight:bold}
.tick-rsi{color:#666;font-size:10px}
.score-hi{background:#0d2a0d;color:#4caf50;padding:1px 5px;border-radius:8px;font-size:10px}
.score-lo{background:#2a0d0d;color:#f44336;padding:1px 5px;border-radius:8px;font-size:10px}
.score-mid{background:#1a1a2e;color:#888;padding:1px 5px;border-radius:8px;font-size:10px}
.up{color:#4caf50}.down{color:#f44336}.neu{color:#888}
.sig-bar{background:#0a140a;border-bottom:1px solid #1a2e1a;padding:6px 20px;font-size:11px;color:#.main{display:flex;flex:1;overflow:hidden}
.sidebar{width:250px;background:#0c0c18;border-right:1px solid #1a1a2e;padding:13px;overflow-.sec{margin-bottom:18px}
.sec-t{font-size:10px;color:#c9a227;letter-spacing:2px;text-transform:uppercase;margin-bottom:.pi{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:.psym{color:#c9a227;font-size:12px;font-weight:bold}
.pname{color:#444;font-size:9px;margin-top:1px}
.pw{background:#0d1e2e;color:#4fc3f7;padding:2px 6px;border-radius:10px;font-size:10px}
.pr{background:#0d1e0d;color:#4caf50;padding:2px 6px;border-radius:10px;font-size:10px}
.pw2{background:#1e1000;color:#ff9800;padding:2px 6px;border-radius:10px;font-size:10px}
.qbtn{width:100%;background:#0f0f1e;border:1px solid #252540;color:#c9a227;padding:7px 9px;margin-.qbtn:hover{background:#c9a227;color:#000}
.chat{flex:1;display:flex;flex-direction:column;overflow:hidden}
.msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.msg{display:flex;gap:9px;max-width:90%}
.msg.user{align-self:flex-end;flex-direction:row-reverse}
.av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:.av.wolf{background:linear-gradient(135deg,#c9a227,#7a5f10)}
.av.user{background:linear-gradient(135deg,#1e3a5f,#0d2137);font-size:11px;color:#4fc3f7;font-.bbl{padding:10px 13px;border-radius:9px;font-size:13px;line-height:1.7}
.bbl.wolf{background:#0c1622;border:1px solid #1e3a5f;border-left:3px solid #c9a227}
.bbl.user{background:#0c1a0c;border:1px solid #1e3a1e;border-right:3px solid #4caf50}
.wh{color:#c9a227;font-weight:bold;font-size:10px;margin-bottom:4px;letter-spacing:1px}
.typing-bbl{padding:9px 13px;background:#0c1622;border:1px solid #1e3a5f;border-left:3px solid .tdot{width:6px;height:6px;border-radius:50%;background:#c9a227;animation:typ 1.4s infinite}
.tdot:nth-child(2){animation-delay:.2s}.tdot:nth-child(3){animation-delay:.4s}
@keyframes typ{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
.inp-area{padding:11px 16px;background:#0c0c18;border-top:1px solid #1a1a2e;display:flex;gap:.inp{flex:1;background:#0f0f1e;border:1px solid #252540;border-radius:7px;padding:9px 12px;color:#.inp:focus{border-color:#c9a227}
.inp::placeholder{color:#2a2a3a}
.sbtn{background:linear-gradient(135deg,#c9a227,#7a5f10);border:none;border-radius:7px;padding:.sbtn:hover{transform:scale(1.05)}
.sbtn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.intro{background:linear-gradient(135deg,#0c1622,#0f1a2e);border:1px solid #c9a227;border-radius:.intro-t{color:#c9a227;font-size:13px;font-weight:bold;margin-bottom:6px}
.intro-b{color:#777;font-size:12px;line-height:1.7}
.risk{background:#120800;border-top:1px solid #2a1400;padding:4px 20px;font-size:10px;color:#::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:#080810}
::-webkit-scrollbar-thumb{background:#252540;border-radius:2px}
@media(max-width:768px){.sidebar{display:none}.msgs{padding:11px}.inp-area{padding:9px 11px}}
</style>
</head>
<body>
<div class="hdr">
<div class="logo">
<div class="logo-icon">&#x1F43A;</div>
<div><div class="logo-title">W O L F</div><div class="logo-sub">IDX TRADING AJAN v1.1</div></</div>
<div class="hdr-right">
<div class="pill"><span class="dot"></span>IDX CANLI</div>
<div class="pill" id="clk">--:--</div>
</div>
</div>
<div class="ticker" id="tickerBar"><span class="neu">Piyasa yukleniyor... (ilk yuklemede 30sn <div class="sig-bar" id="sigBar">Sinyaller hesaplaniyor...</div>
<div class="main">
<div class="sidebar">
<div class="sec">
<div class="sec-t">Portfoy</div>
<div class="pi"><div><div class="psym">BBCA</div><div class="pname">Bank Central Asia</<div class="pi"><div><div class="psym">DCII</div><div class="pname">DCI Indonesia</div></
<div class="pi"><div><div class="psym">ICBP</div><div class="pname">Indofood CBP</div></<div class="pi"><div><div class="psym">TLKM</div><div class="pname">Telkom Indonesia</div></<div class="pi"><div><div class="psym">BMRI</div><div class="pname">Bank Mandiri</div></<div class="pi"><div><div class="psym">AMRT</div><div class="pname">Alfamart</div></div><<div class="pi"><div><div class="psym">INDF</div><div class="pname">Indofood</div></div><</div>
<div class="sec">
<div class="sec-t">Radar</div>
<div class="pi"><div><div class="psym">MYOR</div><div class="pname">Mayora/Kopiko</div></<div class="pi"><div><div class="psym">SIDO</div><div class="pname">Sido Muncul</div></<div class="pi"><div><div class="psym">ACES</div><div class="pname">Ace Hardware</div></<div class="pi"><div><div class="psym">BREN</div><div class="pname">Barito Renewables</</div>
<div class="sec">
<div class="sec-t">Hizli Sorgular</div>
<button class="qbtn" onclick="q('Bugun portfoyumu analiz et')">Portfoy Analizi</button>
<button class="qbtn" onclick="q('IDX piyasasi bugun nasil?')">Piyasa Durumu</button>
<button class="qbtn" onclick="q('Bu ay DCA planim ne olmali?')">DCA Plani</button>
<button class="qbtn" onclick="q('BBCA su an al mi sat mi?')">BBCA Analizi</button>
<button class="qbtn" onclick="q('ICBP 6 Mayis kazanc oncesi ne yapmaliyim?')">ICBP Kazanc</<button class="qbtn" onclick="q('MYOR ve SIDO portfoyume eklemeli miyim?')">Yeni Hisse</<button class="qbtn" onclick="q('Portfoyumun risk haritasini cikar')">Risk Analizi</button>
<button class="qbtn" onclick="q('Stop-loss seviyelerimi soyle')">Stop-Loss</button>
</div>
</div>
<div class="chat">
<div class="msgs" id="msgs">
<div class="intro">
<div class="intro-t">&#x1F43A; Wolf 1.1 Aktif — RSI + EWM + Scoring</div>
<div class="intro-b">
Portfoy: BBCA DCII ICBP TLKM BMRI AMRT INDF<br>
Radar: MYOR SIDO ACES BREN<br><br>
<strong style="color:#c9a227">600 juta IDR | Buffett Stratejisi | DCA 7.5 juta/ay</<span style="color:#555;font-size:11px">Ilk veri yuklemesi 30sn surebilir.</span>
</div>
</div>
</div>
<div class="inp-area">
<input class="inp" id="inp" placeholder="Wolf'a sor..." onkeypress="if(event.key==='Enter')<button class="sbtn" id="sbtn" onclick="send()">&#x27A4;</button>
</div>
</div>
</div>
<div class="risk">Wolf yatirim tavsiyesi vermez. Tum kararlar size aittir. | Stop-loss: -%12 <script>
var hist=[], sending=false;
function tick(){
var w=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Jakarta"}));
document.getElementById('clk').textContent='WIB '+w.getHours().toString().padStart(2,'0')+':'+}
setInterval(tick,1000); tick();
function scoreClass(s){
if(s>=65) return 'score-hi';
if(s<=35) return 'score-lo';
return 'score-mid';
}
function loadTicker(){
fetch('/api/ticker').then(function(r){return r.json();}).then(function(d){
if(!d.length){
document.getElementById('tickerBar').innerHTML='<span class="neu">Veri yukleniyor...</span>';
return;
}
document.getElementById('tickerBar').innerHTML=d.map(function(t){
return '<div class="tick">'
+'<span class="tick-sym">'+t.symbol+'</span>'
+'<span>'+t.price+'</span>'
+'<span class="'+(t.change>=0?'up':'down')+'">'+(t.change>=0?'+':'')+t.change+'%</span>'
+'<span class="tick-rsi">RSI:'+t.rsi+'</span>'
+'<span class="'+scoreClass(t.score)+'">'+t.score+'</span>'
+'</div>';
}).join('');
}).catch(function(){});
}
loadTicker(); setInterval(loadTicker,60000);
function loadSignals(){
fetch('/api/signals').then(function(r){return r.json();}).then(function(d){
if(d.length){
document.getElementById('sigBar').textContent=
d.map(function(s){return s.icon+' '+s.text+' ('+s.score+')';}).join(' | ');
} else {
document.getElementById('sigBar').textContent='Onemli sinyal yok — piyasa sakin.';
}
}).catch(function(){});
}
loadSignals(); setInterval(loadSignals,5000);
function q(txt){document.getElementById('inp').value=txt; send();}
function addMsg(role, content){
var msgs=document.getElementById('msgs');
var d=document.createElement('div');
d.className='msg '+role;
var t=new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
if(role==='wolf'){
d.innerHTML='<div class="av wolf">&#x1F43A;</div><div class="bbl wolf"><div class="wh">WOLF } else {
d.innerHTML='<div class="av user">Y</div><div class="bbl user">'+content+'</div>';
}
msgs.appendChild(d);
msgs.scrollTop=msgs.scrollHeight;
}
function showTyping(){
var msgs=document.getElementById('msgs');
var d=document.createElement('div');
d.className='msg wolf'; d.id='typing';
d.innerHTML='<div class="av wolf">&#x1F43A;</div><div class="typing-bbl"><div class="tdot"></msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight;
}
function hideTyping(){var t=document.getElementById('typing'); if(t) t.remove();}
function send(){
if(sending) return;
var inp=document.getElementById('inp');
var txt=inp.value.trim();
if(!txt) return;
addMsg('user', txt);
inp.value='';
sending=true;
document.getElementById('sbtn').disabled=true;
showTyping();
var pastMsgs=hist.slice();
fetch('/api/chat',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({user_message:txt, messages:pastMsgs})
}).then(function(r){return r.json();}).then(function(d){
hideTyping();
if(d.response){
addMsg('wolf', d.response);
hist.push({role:'user',content:txt});
hist.push({role:'assistant',content:d.response});
if(hist.length>16) hist=hist.slice(-16);
}
}).catch(function(){
hideTyping();
addMsg('wolf','Sinyal kesildi. Tekrar dene. - Wolf');
}).finally(function(){
sending=false;
document.getElementById('sbtn').disabled=false;
inp.focus();
});
}
</script>
</body>
</html>"""
@app.route('/')
def home():
return render_template_string(HTML)
if __name__ == "__main__":
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port, debug=False)
