from flask import Flask, request, jsonify, render_template_string
import anthropic
import yfinance as yf
import os

app = Flask(__name__)

SYSTEM_PROMPT = """Sen bir IDX (Bursa Efek Indonesia) günlük trading ajanısın.

Kullanıcı hakkında:
- Sermaye: 5 juta IDR (~$300)
- Telefonda takip ediyor, her 30 dakikada bir bakıyor
- Teknik analiz bilmiyor, sıfırdan öğreniyor
- Hedef: günlük küçük kazanç
- IDX saatleri: 09:00-15:00 WIB

Görevin:
- Hisse fiyatlarını analiz et
- AL / BEKLE / SAT kararı ver
- Her kararı basit Türkçe ile açıkla
- RSI, destek/direnç, hacim gibi terimleri sade anlat
- Risk konusunda uyar, garantici olma
- Her zaman Türkçe konuş
"""

HTML = """<!DOCTYPE html>
<html>
<head>
<title>IDX Trading Ajanı</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;background:#0d0d0d;color:#e8e0d0;min-height:100vh}
.header{background:#111;border-bottom:1px solid #222;padding:14px 16px;position:sticky;top:0;z-index:10}
.header h1{font-size:16px;color:#f0c040;letter-spacing:2px;text-transform:uppercase}
.header p{font-size:11px;color:#555;margin-top:3px}
.chat{padding:16px;max-width:600px;margin:0 auto;padding-bottom:120px}
.msg{margin-bottom:16px}
.msg.user .bbl{background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px 12px 2px 12px;padding:10px 14px;margin-left:30px}
.msg.agent .bbl{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px 12px 12px 2px;padding:10px 14px;margin-right:30px}
.lbl{font-size:10px;color:#555;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px}
.msg.user .lbl{text-align:right}
.bbl p{line-height:1.7;font-size:14px;white-space:pre-wrap}
.quick{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.qb{background:#1a1a1a;border:1px solid #333;color:#f0c040;border-radius:20px;padding:6px 12px;font-size:12px;cursor:pointer}
.input-area{position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #222;padding:10px 12px}
.input-row{display:flex;gap:8px;max-width:600px;margin:0 auto}
textarea{flex:1;background:#1a1a1a;border:1px solid #333;color:#e8e0d0;border-radius:8px;padding:10px;font-size:14px;resize:none;font-family:inherit}
button{background:#f0c040;color:#0d0d0d;border:none;border-radius:8px;padding:10px 16px;font-weight:bold;cursor:pointer;font-size:14px}
.loading{color:#f0c040;font-size:13px;padding:8px 0;font-style:italic}
.stock-bar{background:#111;border:1px solid #222;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px}
.stock-bar span{color:#f0c040;margin-right:16px}
</style>
</head>
<body>
<div class="header">
<h1>IDX Trading Ajanı</h1>
<p id="clock">Yükleniyor...</p>
</div>
<div class="chat" id="chat">
<div id="stockbar" class="stock-bar">Hisseler yükleniyor...</div>
<div class="quick">
<button class="qb" onclick="ask('Bugün hangi hisseyi izlemeliyim?')">Bugün ne izleyeyim?</button>
<button class="qb" onclick="ask('BBCA hissesi için al sat kararı ver')">BBCA analiz</button>
<button class="qb" onclick="ask('DCII hissesi için al sat kararı ver')">DCII analiz</button>
<button class="qb" onclick="ask('Bugünkü piyasayı özetle')">Piyasa özeti</button>
<button class="qb" onclick="ask('Günü kapat, kazanç kaybımı değerlendir')">Günü kapat</button>
</div>
<div id="messages"></div>
</div>
<div class="input-area">
<div class="input-row">
<textarea id="inp" rows="1" placeholder="Sor..."></textarea>
<button onclick="send()">Sor</button>
</div>
</div>
<script>
let history = [];

async function loadStocks() {
  const res = await fetch('/stocks');
  const data = await res.json();
  let html = '';
  for (const [k,v] of Object.entries(data)) {
    const color = v.change >= 0 ? '#4caf50' : '#f44336';
    html += `<span style="color:${color}">${k}: ${v.price} (${v.change>0?'+':''}${v.change}%)</span>`;
  }
  document.getElementById('stockbar').innerHTML = html || 'Veri alınamadı';
}

function updateClock() {
  const now = new Date();
  const wib = new Date(now.getTime() + (7*60*60*1000));
  document.getElementById('clock').textContent = 'WIB: ' + wib.toUTCString().slice(17,22) + ' · IDX ' + (wib.getUTCHours()>=9&&wib.getUTCHours()<15?'AÇIK':'KAPALI');
}

setInterval(updateClock, 1000);
updateClock();
loadStocks();
setInterval(loadStocks, 300000);

function ask(q) { document.getElementById('inp').value = q; send(); }

async function send() {
  const inp = document.getElementById('inp');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  addMsg('user', q);
  history.push({role:'user', content:q});

  const ld = document.createElement('div');
  ld.className = 'loading'; ld.id = 'loading'; ld.textContent = 'Analiz ediliyor...';
  document.getElementById('messages').appendChild(ld);
  scroll();

  const res = await fetch('/chat', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({messages:history})
  });
  const data = await res.json();
  document.getElementById('loading')?.remove();
  addMsg('agent', data.reply);
  history.push({role:'assistant', content:data.reply});
}

function addMsg(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = '<div class="lbl">'+(role==='user'?'Sen':'Ajan')+'</div><div class="bbl"><p>'+text+'</p></div>';
  document.getElementById('messages').appendChild(div);
  scroll();
}

function scroll() { window.scrollTo(0, document.body.scrollHeight); }

document.getElementById('inp').addEventListener('keydown', e => {
  if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}
});
</script>
</body>
</html>"""

@app.route('/')
def index():
    return render_template_string(HTML)

@app.route('/stocks')
def stocks():
    tickers = {
        'BBCA': 'BBCA.JK',
        'DCII': 'DCII.JK',
        'TLKM': 'TLKM.JK',
        'BMRI': 'BMRI.JK',
        'ASII': 'ASII.JK'
    }
    result = {}
    for name, ticker in tickers.items():
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period='2d')
            if len(hist) >= 2:
                prev = hist['Close'].iloc[-2]
                curr = hist['Close'].iloc[-1]
                change = round((curr - prev) / prev * 100, 2)
                result[name] = {'price': round(curr), 'change': change}
        except:
            pass
    return jsonify(result)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    messages = data.get('messages', [])
    client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
    response = client.messages.create(
        model=".claude-sonnet-4-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages
    )
    return jsonify({'reply': response.content[0].text})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
