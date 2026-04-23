from flask import Flask, request, jsonify, render_template_string
import os
import requests

app = Flask(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

SYSTEM_PROMPT = """Sen bir IDX (Bursa Efek Indonesia) günlük trading ajanısın.
Kullanıcının sermayesi 5 juta IDR. Telefonda takip ediyor, teknik analiz bilmiyor.
Hedef günlük küçük, güvenli kazanç. IDX saatleri 09:00–15:00 WIB.
Her analizde net AL / BEKLE / SAT kararı ver ve kısa Türkçe gerekçe yaz.
Cevapların kısa, net ve anlaşılır olsun."""

HTML = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IDX Trading Ajanı</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #080a0f;
    --surface: #0e1118;
    --surface2: #141820;
    --border: #1e2535;
    --gold: #f5c842;
    --gold-dim: #8a7020;
    --green: #2ecc71;
    --red: #e74c3c;
    --text: #cdd5e0;
    --text-dim: #4a5568;
    --text-bright: #edf2f7;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Syne', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 32px; height: 32px;
    background: var(--gold);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Space Mono', monospace;
    font-weight: 700;
    font-size: 11px;
    color: #000;
    letter-spacing: -0.5px;
  }

  .logo h1 {
    font-size: 14px;
    font-weight: 800;
    color: var(--text-bright);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .logo p {
    font-size: 10px;
    color: var(--text-dim);
    font-family: 'Space Mono', monospace;
  }

  #clock {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    text-align: right;
  }

  #market-status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    margin-top: 3px;
    letter-spacing: 0.5px;
  }

  .status-open  { background: rgba(46,204,113,.15); color: var(--green); }
  .status-closed { background: rgba(231,76,60,.12);  color: var(--red); }

  /* ── Chat Area ── */
  #chat {
    flex: 1;
    max-width: 680px;
    width: 100%;
    margin: 0 auto;
    padding: 20px 16px 140px;
  }

  /* Quick buttons */
  .quick-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }

  .qb {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--gold);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 11px;
    font-family: 'Space Mono', monospace;
    cursor: pointer;
    transition: all .15s;
    letter-spacing: 0.3px;
  }

  .qb:hover {
    background: var(--gold);
    color: #000;
    border-color: var(--gold);
  }

  /* Messages */
  .msg { margin-bottom: 18px; animation: fadeUp .3s ease; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .msg-label {
    font-size: 9px;
    font-family: 'Space Mono', monospace;
    color: var(--text-dim);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .msg.user .msg-label { text-align: right; }

  .bubble {
    padding: 12px 16px;
    border-radius: 14px;
    line-height: 1.75;
    font-size: 14px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .msg.user .bubble {
    background: #131c35;
    border: 1px solid #1e2f5a;
    border-radius: 14px 14px 2px 14px;
    margin-left: 40px;
    color: #b8c8e8;
  }

  .msg.agent .bubble {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 14px 14px 14px 2px;
    margin-right: 40px;
    color: var(--text-bright);
  }

  /* Decision badges inside agent messages */
  .bubble .badge-al   { color: var(--green); font-weight: 700; }
  .bubble .badge-sat  { color: var(--red);   font-weight: 700; }
  .bubble .badge-bekle{ color: var(--gold);  font-weight: 700; }

  /* Loading */
  .loading-msg .bubble {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-dim);
    font-size: 13px;
    font-family: 'Space Mono', monospace;
  }

  .dots span {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--gold);
    animation: blink 1.2s infinite;
  }
  .dots span:nth-child(2) { animation-delay: .2s; }
  .dots span:nth-child(3) { animation-delay: .4s; }

  @keyframes blink {
    0%, 80%, 100% { opacity: .2; transform: scale(.8); }
    40%           { opacity: 1;  transform: scale(1.2); }
  }

  /* ── Input Area ── */
  .input-area {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, var(--bg) 70%, transparent);
    padding: 12px 16px 16px;
  }

  .input-row {
    display: flex;
    gap: 10px;
    max-width: 680px;
    margin: 0 auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 8px;
    transition: border-color .2s;
  }

  .input-row:focus-within {
    border-color: var(--gold-dim);
  }

  textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-bright);
    font-size: 14px;
    font-family: 'Syne', sans-serif;
    resize: none;
    line-height: 1.5;
    padding: 4px 6px;
    max-height: 120px;
  }

  textarea::placeholder { color: var(--text-dim); }

  .send-btn {
    background: var(--gold);
    color: #000;
    border: none;
    border-radius: 10px;
    width: 40px; height: 40px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: opacity .15s;
    font-size: 16px;
  }

  .send-btn:hover  { opacity: .85; }
  .send-btn:active { opacity: .7; }
  .send-btn:disabled { opacity: .35; cursor: not-allowed; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
</style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-icon">IDX</div>
    <div>
      <h1>Trading Ajanı</h1>
      <p>Bursa Efek Indonesia</p>
    </div>
  </div>
  <div id="clock">
    <div id="clock-time">--:--</div>
    <div id="market-status" class="status-closed">KAPALI</div>
  </div>
</header>

<div id="chat">
  <div class="quick-wrap">
    <button class="qb" onclick="ask('Bugün hangi IDX hissesini izlemeliyim? BBCA, DCII, TLKM, BMRI, ASII arasından öner.')">📊 Bugün ne izleyeyim?</button>
    <button class="qb" onclick="ask('BBCA hissesi için AL / SAT / BEKLE kararı ver ve gerekçeni açıkla.')">BBCA analiz</button>
    <button class="qb" onclick="ask('DCII hissesi için AL / SAT / BEKLE kararı ver ve gerekçeni açıkla.')">DCII analiz</button>
    <button class="qb" onclick="ask('TLKM hissesi için AL / SAT / BEKLE kararı ver ve gerekçeni açıkla.')">TLKM analiz</button>
    <button class="qb" onclick="ask('Bugünkü IDX piyasasını kısaca özetle.')">Piyasa özeti</button>
    <button class="qb" onclick="ask('5 juta IDR ile bu hafta nasıl bir strateji izlemeliyim?')">Haftalık strateji</button>
  </div>
  <div id="messages"></div>
</div>

<div class="input-area">
  <div class="input-row">
    <textarea id="inp" rows="1" placeholder="Hisse sor, analiz iste..."></textarea>
    <button class="send-btn" id="sendBtn" onclick="send()" title="Gönder">➤</button>
  </div>
</div>

<script>
  let history = [];
  let isLoading = false;

  // ── Clock & Market Status ──
  function updateClock() {
    const now = new Date();
    const wib = new Date(now.getTime() + (7 * 3600 * 1000));
    const h = wib.getUTCHours();
    const m = String(wib.getUTCMinutes()).padStart(2, '0');
    const s = String(wib.getUTCSeconds()).padStart(2, '0');
    document.getElementById('clock-time').textContent = `WIB ${h}:${m}:${s}`;
    const ms = document.getElementById('market-status');
    const open = h >= 9 && h < 15;
    ms.textContent = open ? '● IDX AÇIK' : '● IDX KAPALI';
    ms.className = open ? 'status-open' : 'status-closed';
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ── Quick ask ──
  function ask(q) {
    document.getElementById('inp').value = q;
    send();
  }

  // ── Send ──
  async function send() {
    if (isLoading) return;
    const inp = document.getElementById('inp');
    const q = inp.value.trim();
    if (!q) return;

    inp.value = '';
    autoResize(inp);
    isLoading = true;
    document.getElementById('sendBtn').disabled = true;

    addMsg('user', q);
    history.push({ role: 'user', content: q });

    const loadEl = addLoading();
    scrollDown();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await res.json();
      loadEl.remove();

      if (data.error) {
        addMsg('agent', '⚠️ Hata: ' + data.error);
      } else {
        const reply = data.reply || '';
        addMsg('agent', reply);
        history.push({ role: 'assistant', content: reply });
      }
    } catch (e) {
      loadEl.remove();
      addMsg('agent', '⚠️ Bağlantı hatası: ' + e.message);
    }

    isLoading = false;
    document.getElementById('sendBtn').disabled = false;
    scrollDown();
  }

  // ── Add message ──
  function addMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + role;

    const label = document.createElement('div');
    label.className = 'msg-label';
    label.textContent = role === 'user' ? 'Sen' : 'Ajan';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    // Highlight AL / SAT / BEKLE keywords
    const highlighted = text
      .replace(/\\bAL\\b/g, '<span class="badge-al">AL</span>')
      .replace(/\\bSAT\\b/g, '<span class="badge-sat">SAT</span>')
      .replace(/\\bBEKLE\\b/g, '<span class="badge-bekle">BEKLE</span>');
    bubble.innerHTML = highlighted;

    wrap.appendChild(label);
    wrap.appendChild(bubble);
    document.getElementById('messages').appendChild(wrap);
    return wrap;
  }

  function addLoading() {
    const wrap = document.createElement('div');
    wrap.className = 'msg agent loading-msg';
    wrap.innerHTML = `
      <div class="msg-label">Ajan</div>
      <div class="bubble">
        <div class="dots">
          <span></span><span></span><span></span>
        </div>
        Analiz ediliyor...
      </div>`;
    document.getElementById('messages').appendChild(wrap);
    return wrap;
  }

  function scrollDown() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  // ── Auto-resize textarea ──
  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  document.getElementById('inp').addEventListener('input', function() {
    autoResize(this);
  });

  document.getElementById('inp').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
</script>
</body>
</html>"""


@app.route("/")
def index():
    return render_template_string(HTML)


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    messages = data.get("messages", [])

    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "ANTHROPIC_API_KEY tanımlı değil."}), 500

    try:
        res = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "system": SYSTEM_PROMPT,
                "messages": messages,
            },
            timeout=30,
        )
        result = res.json()
        reply = result.get("content", [{}])[0].get("text", "Cevap alınamadı.")
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
