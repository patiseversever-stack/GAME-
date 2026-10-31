import base64
D = '/home/user/work/'
b64 = lambda f: 'data:image/png;base64,' + base64.b64encode(open(D + f, 'rb').read()).decode()
MAP, SEN, DEF = b64('harita.png'), b64('av_sen.png'), b64('av_defne.png')

Q = 'Güneş Sistemi’nin en büyük gezegeni hangisidir?'
OPTS = ['Jüpiter', 'Neptün', 'Satürn', 'Uranüs']

# basit joker simgeleri (çizgi)
ICO = {
    'yari': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/></svg>',
    'seyirci': '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    'sure': '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
    'sans': '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
    'sabotaj': '<svg viewBox="0 0 24 24"><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/></svg>',
    'kalkan': '<svg viewBox="0 0 24 24"><path d="M12 2.8 4.5 5.6v6c0 4.6 3.2 8.2 7.5 9.6 4.3-1.4 7.5-5 7.5-9.6v-6z"/></svg>',
}
JK = [('yari', '50/50', 2), ('seyirci', 'Seyirci', 1), ('sure', 'Süre', 2), ('sans', 'Şans', 1), ('sabotaj', 'Sabotaj', 1), ('kalkan', 'Kalkan', 1)]

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Lilita+One&family=Manrope:wght@600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Cinzel:wght@700;800&family=Oswald:wght@500;600;700&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&display=swap">'

BASE = """
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05080f;display:flex;gap:28px;padding:40px 30px 30px;font-family:Manrope,system-ui,sans-serif;color:#fff}
.col{display:flex;flex-direction:column;gap:14px;align-items:center}
.cap{font:800 13px Manrope;letter-spacing:.22em;color:#8fa2cf}
.cap b{display:block;font:700 26px 'Playfair Display';letter-spacing:0;color:#fff;margin-top:4px;text-align:center}
.ph{position:relative;width:412px;height:892px;overflow:hidden;border-radius:28px;background:url(MAP) center/cover;box-shadow:0 30px 80px rgba(0,0,0,.6)}
svg{display:block}
""".replace('MAP', MAP)

# ------------------------------------------------------------------ A · SİNEMA
A_CSS = """
.a .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,8,22,.78) 0,rgba(4,8,22,0) 16%,rgba(4,8,22,0) 30%,rgba(4,8,22,.82) 50%,#050a1c 66%)}
.a .top{position:absolute;left:18px;right:18px;top:16px;display:flex;justify-content:space-between;align-items:flex-start}
.a .tk{display:flex;flex-direction:column;gap:3px}
.a .tk.r{align-items:flex-end}
.a .tk small{font:800 10px Manrope;letter-spacing:.22em;color:rgba(255,255,255,.62)}
.a .tk b{font:600 24px Oswald;letter-spacing:.02em;line-height:1}
.a .tk i{display:flex;gap:3px}.a .tk i u{width:14px;height:3px;border-radius:2px;background:var(--c)}
.a .menu{position:absolute;left:50%;top:16px;transform:translateX(-50%);width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.25);display:grid;place-items:center;background:rgba(0,0,0,.25)}
.a .menu::before{content:'';width:12px;height:12px;border-left:3px solid #fff;border-right:3px solid #fff}
.a .face{position:absolute;left:0;right:0;top:372px;height:96px}
.a .pt{position:absolute;top:0;width:150px;height:96px;display:flex;align-items:flex-end;gap:10px}
.a .pt.l{left:16px}.a .pt.r{right:16px;flex-direction:row-reverse;text-align:right}
.a .pt img{width:66px;height:66px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 3px var(--c),0 10px 26px rgba(0,0,0,.6),0 0 36px var(--g)}
.a .pt div{padding-bottom:6px}
.a .pt small{display:block;font:800 9.5px Manrope;letter-spacing:.24em;color:var(--c2)}
.a .pt b{display:block;font:600 22px Oswald;letter-spacing:.02em;line-height:1.05}
.a .pt .ok{position:absolute;bottom:2px;width:20px;height:20px;border-radius:50%;background:#2fd06a;border:2px solid #050a1c;display:grid;place-items:center;font:800 11px Manrope}
.a .pt.r .ok{right:2px}
.a .ring{position:absolute;left:50%;top:14px;width:72px;height:72px;transform:translateX(-50%)}
.a .ring svg{position:absolute;inset:0}
.a .ring .n{position:absolute;inset:0;display:grid;place-items:center;font:600 30px Oswald}
.a .ring small{position:absolute;left:50%;top:76px;transform:translateX(-50%);white-space:nowrap;font:800 9.5px Manrope;letter-spacing:.24em;color:#ffd25a}
.a .q{position:absolute;left:24px;right:24px;top:500px}
.a .ey{display:flex;align-items:center;gap:8px;font:800 10.5px Manrope;letter-spacing:.24em;color:#7fe3a0}
.a .ey i{width:18px;height:2px;background:#7fe3a0}
.a .ey em{font-style:normal;color:rgba(255,255,255,.45)}
.a h2{margin-top:10px;font:700 26px/1.18 Fredoka;letter-spacing:-.005em;text-wrap:balance}
.a .bar{margin-top:14px;height:3px;border-radius:2px;background:rgba(255,255,255,.12)}
.a .bar i{display:block;width:64%;height:100%;border-radius:2px;background:linear-gradient(90deg,#ffd25a,#ffecb0);box-shadow:0 0 12px rgba(255,210,90,.7)}
.a .ops{position:absolute;left:18px;right:18px;top:632px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.a .op{height:58px;display:flex;align-items:center;gap:12px;padding:0 14px;border-radius:16px;background:linear-gradient(180deg,rgba(28,40,78,.9),rgba(14,22,48,.9));border:1px solid rgba(255,255,255,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 18px rgba(0,0,0,.35);font:600 17px Fredoka}
.a .op i{flex:none;width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(255,255,255,.45);display:grid;place-items:center;font:800 12px Manrope;font-style:normal;color:rgba(255,255,255,.85)}
.a .op.pk{border-color:#ffd25a;background:linear-gradient(180deg,rgba(80,62,18,.95),rgba(40,30,8,.95));box-shadow:0 0 0 1px #ffd25a,0 0 24px rgba(255,210,90,.35)}
.a .op.pk i{border-color:#ffd25a;background:#ffd25a;color:#2a1a00}
.a .jk{position:absolute;left:18px;right:18px;bottom:20px;display:flex;justify-content:space-between}
.a .j{position:relative;width:50px;display:flex;flex-direction:column;align-items:center;gap:5px;font:700 9.5px Manrope;letter-spacing:.06em;color:rgba(255,255,255,.7)}
.a .j span{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05)}
.a .j svg{width:21px;height:21px;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.a .j sup{position:absolute;right:2px;top:-2px;min-width:16px;height:16px;border-radius:8px;background:#ffd25a;color:#2a1a00;font:800 10px/16px Manrope;text-align:center}
"""
def A():
    ops = ''.join(f'<div class="op{" pk" if k==0 else ""}"><i>{"ABCD"[k]}</i>{o}</div>' for k, o in enumerate(OPTS))
    jk = ''.join(f'<div class="j"><span>{ICO[k]}</span>{n}<sup>{c}</sup></div>' for k, n, c in JK)
    ring = '<svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="32" fill="rgba(5,10,28,.7)" stroke="rgba(255,255,255,.15)" stroke-width="3"/><circle cx="36" cy="36" r="32" fill="none" stroke="#ffd25a" stroke-width="3" stroke-linecap="round" stroke-dasharray="201" stroke-dashoffset="72" transform="rotate(-90 36 36)"/></svg>'
    return f'''<div class="ph a"><div class="scrim"></div>
<div class="top"><div class="tk" style="--c:#ff5a4a"><small>SEN</small><b>2.200</b><i><u></u><u></u><u></u></i></div><div class="menu"></div>
<div class="tk r" style="--c:#4a8cff"><small>DEFNE</small><b>2.400</b><i><u></u><u></u><u></u></i></div></div>
<div class="face"><div class="pt l" style="--c:#ff5a4a;--c2:#ff9a8a;--g:rgba(255,80,60,.45)"><img src="{SEN}"><div><small>SALDIRAN</small><b>Sen</b></div></div>
<div class="ring">{ring}<div class="n">13</div><small>ANKARA</small></div>
<div class="pt r" style="--c:#4a8cff;--c2:#9cc0ff;--g:rgba(70,130,255,.45)"><img src="{DEF}"><div><small>SAVUNAN</small><b>Defne</b></div><span class="ok">✓</span></div></div>
<div class="q"><div class="ey"><i></i>BİLİM <em>· ÇOKTAN SEÇMELİ</em></div><h2>{Q}</h2><div class="bar"><i></i></div></div>
<div class="ops">{ops}</div><div class="jk">{jk}</div></div>'''

# ------------------------------------------------------------------ B · SARAY
B_CSS = """
.b .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,12,24,.55) 0,rgba(6,12,24,0) 14%,rgba(6,12,24,0) 34%,rgba(4,16,22,.6) 46%)}
.b .hud{position:absolute;left:14px;right:14px;top:14px;display:flex;gap:10px}
.b .pl{flex:1;height:52px;display:flex;align-items:center;gap:9px;padding:0 12px 0 6px;border-radius:12px;background:linear-gradient(180deg,#0f2a2c,#071a1d);border:1px solid #c8a24a;box-shadow:inset 0 0 0 3px #071a1d,inset 0 0 0 4px rgba(200,162,74,.4)}
.b .pl img{width:40px;height:40px;border-radius:50%;border:1.5px solid #e7c76a}
.b .pl small{display:block;font:700 10px Cinzel;letter-spacing:.14em;color:#c8a24a}
.b .pl b{display:block;font:800 20px 'Playfair Display';color:#f4e3b0;line-height:1}
.b .panel{position:absolute;left:12px;right:12px;bottom:14px;top:456px;border-radius:22px;padding:16px 16px 14px;
  background:radial-gradient(120% 60% at 50% 0,#14403f 0,#0a2426 55%,#061719 100%);border:1.5px solid #d6b45c;
  box-shadow:inset 0 0 0 5px #061719,inset 0 0 0 6px rgba(214,180,92,.45),0 20px 50px rgba(0,0,0,.55)}
.b .panel::before{content:'';position:absolute;inset:6px;border-radius:17px;opacity:.13;pointer-events:none;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cg fill='none' stroke='%23e7c76a' stroke-width='1'%3E%3Cpath d='M18 2l5 11 11 5-11 5-5 11-5-11-11-5 11-5z'/%3E%3Ccircle cx='18' cy='18' r='4'/%3E%3C/g%3E%3C/svg%3E")}
.b .duel{position:absolute;left:0;right:0;top:-46px;display:flex;justify-content:center;align-items:center;gap:6px}
.b .sh{width:120px;height:58px;display:flex;align-items:center;gap:8px;padding:0 10px;background:linear-gradient(180deg,var(--c1),var(--c2));border:1.5px solid #e7c76a;
  clip-path:polygon(0 0,100% 0,100% 70%,50% 100%,0 70%);font:800 15px 'Playfair Display';color:#fff}
.b .sh.r{flex-direction:row-reverse}
.b .sh img{width:34px;height:34px;border-radius:50%;border:1.5px solid #f4e3b0}
.b .sh small{display:block;font:700 8.5px Cinzel;letter-spacing:.14em;color:#f4e3b0;opacity:.85}
.b .med{position:relative;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#fff1b8,#e0b04a 55%,#9a6a14);border:2px solid #fff3c4;box-shadow:0 0 0 2px #6a4408,0 6px 18px rgba(0,0,0,.5)}
.b .med b{font:800 24px Cinzel;color:#3a2200}
.b .med small{position:absolute;bottom:-17px;font:700 9px Cinzel;letter-spacing:.18em;color:#e7c76a;white-space:nowrap}
.b .hd{display:flex;align-items:center;justify-content:space-between;margin-top:22px}
.b .cat{font:700 11px Cinzel;letter-spacing:.2em;color:#e7c76a}
.b .cat em{font-style:normal;color:rgba(244,227,176,.55)}
.b .hg{display:flex;align-items:center;gap:6px;font:800 22px 'Playfair Display';color:#f4e3b0}
.b .hg svg{width:18px;height:22px;fill:none;stroke:#e7c76a;stroke-width:1.6}
.b .orn{display:flex;align-items:center;gap:10px;margin:10px 0 8px}
.b .orn i{flex:1;height:1px;background:linear-gradient(90deg,transparent,#d6b45c,transparent)}
.b .orn s{width:8px;height:8px;transform:rotate(45deg);background:#d6b45c}
.b h2{font:700 25px/1.2 'Playfair Display';text-align:center;color:#fff8e2;text-wrap:balance;padding:0 6px}
.b .tl{margin:12px auto 14px;width:70%;height:3px;border-radius:2px;background:rgba(214,180,92,.2)}
.b .tl i{display:block;width:64%;height:100%;background:#e7c76a;border-radius:2px}
.b .ops{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.b .op{height:56px;display:flex;align-items:center;gap:10px;padding:0 12px 0 8px;border-radius:12px;background:linear-gradient(180deg,#fbf3dc,#efe0b5);border:1px solid #b88e3a;
  box-shadow:inset 0 0 0 2px #fbf3dc,inset 0 0 0 3px rgba(184,142,58,.45),0 4px 0 #6a4f1a;font:700 18px 'Playfair Display';color:#2a1f0a}
.b .op i{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font:800 14px Cinzel;font-style:normal;color:#3a2200;background:radial-gradient(circle at 40% 30%,#fff1b8,#d9a843);border:1px solid #8a6216}
.b .op.pk{background:linear-gradient(180deg,#1d5a52,#0f3a35);color:#fff3c4;border-color:#e7c76a;box-shadow:inset 0 0 0 2px #0f3a35,inset 0 0 0 3px #e7c76a,0 4px 0 #062420,0 0 22px rgba(231,199,106,.35)}
.b .jk{display:flex;justify-content:space-between;margin-top:16px}
.b .j{position:relative;width:48px;height:48px;display:grid;place-items:center;border-radius:12px;transform:rotate(45deg) scale(.82);background:linear-gradient(180deg,#123a3c,#08201f);border:1px solid #c8a24a}
.b .j svg{width:22px;height:22px;transform:rotate(-45deg);fill:none;stroke:#e7c76a;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.b .j sup{position:absolute;right:-6px;top:-6px;transform:rotate(-45deg);width:18px;height:18px;border-radius:50%;background:#e7c76a;color:#2a1a00;font:800 10px/18px Manrope;text-align:center}
.b .jn{display:flex;justify-content:space-between;margin-top:6px;font:700 8.5px Cinzel;letter-spacing:.1em;color:#c8a24a}
.b .jn span{width:52px;text-align:center}
"""
def B():
    ops = ''.join(f'<div class="op{" pk" if k==0 else ""}"><i>{"ABCD"[k]}</i>{o}</div>' for k, o in enumerate(OPTS))
    jk = ''.join(f'<div class="j">{ICO[k]}<sup>{c}</sup></div>' for k, n, c in JK)
    jn = ''.join(f'<span>{n.upper()}</span>' for k, n, c in JK)
    hg = '<svg viewBox="0 0 18 22"><path d="M2 1h14M2 21h14M4 1c0 6 10 6 10 10S4 15 4 21M14 1c0 6-10 6-10 10s10 4 10 10"/></svg>'
    return f'''<div class="ph b"><div class="scrim"></div>
<div class="hud"><div class="pl"><img src="{SEN}"><div><small>SEN</small><b>2.200</b></div></div><div class="pl"><img src="{DEF}"><div><small>DEFNE</small><b>2.400</b></div></div></div>
<div class="panel"><div class="duel"><div class="sh" style="--c1:#b8321f;--c2:#7a1a0e"><img src="{SEN}"><div><small>SALDIRAN</small>Sen</div></div>
<div class="med"><b>VS</b><small>ANKARA</small></div><div class="sh r" style="--c1:#2a5bb8;--c2:#14306e"><img src="{DEF}"><div><small>SAVUNAN</small>Defne</div></div></div>
<div class="hd"><span class="cat">BİLİM <em>· ÇOKTAN SEÇMELİ</em></span><span class="hg">{hg}13</span></div>
<div class="orn"><i></i><s></s><i></i></div><h2>{Q}</h2><div class="tl"><i></i></div><div class="ops">{ops}</div><div class="jk">{jk}</div><div class="jn">{jn}</div></div></div>'''

# ------------------------------------------------------------------ C · ARENA (v3: esnek yerleşim)
C_CSS = """
.c .ban{position:absolute;left:0;right:0;top:0;height:124px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.55))}
.c .sd{position:absolute;top:0;height:100px;width:54%;display:flex;align-items:center;gap:11px;padding:16px 16px 0}
.c .sd.l{left:0;padding-right:66px;background:linear-gradient(100deg,#ff4433,#b0170c);clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
.c .sd.r{right:0;padding-left:66px;justify-content:flex-end;flex-direction:row-reverse;background:linear-gradient(260deg,#3b86ff,#1440b0);clip-path:polygon(18% 0,100% 0,100% 100%,0 100%);text-align:right}
.c .sd img{width:56px;height:56px;border-radius:12px;border:3px solid #fff;transform:skewX(-6deg);box-shadow:0 4px 0 rgba(0,0,0,.35)}
.c .sd small{display:block;font:italic 800 11px 'Barlow Condensed';letter-spacing:.22em;color:rgba(255,255,255,.9)}
.c .sd b{display:block;font:italic 800 32px/0.95 'Barlow Condensed';text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.3)}
.c .sd em{display:block;font:italic 800 16px 'Barlow Condensed';color:#ffe680;text-shadow:0 1px 0 rgba(0,0,0,.4)}
.c .vs{position:absolute;left:50%;top:28px;z-index:2;transform:translateX(-50%) skewX(-8deg);padding:3px 11px;background:#0a0b14;border:2.5px solid #fff;font:italic 800 30px 'Barlow Condensed';letter-spacing:.04em;color:#ffd25a;box-shadow:0 6px 20px rgba(0,0,0,.6)}
.c .tg{position:absolute;left:50%;top:104px;transform:translateX(-50%);padding:3px 13px;background:#ffd25a;color:#1a1200;font:800 11.5px 'Barlow Condensed';letter-spacing:.26em;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}
.c .ok{position:absolute;right:14px;top:106px;padding:3px 9px;background:#16c060;color:#04210f;font:italic 800 11.5px 'Barlow Condensed';letter-spacing:.14em;clip-path:polygon(8% 0,100% 0,92% 100%,0 100%)}
/* panel: içeriği kadar yüksek, alttan büyür; üstünde yumuşak gölge geçişi (harita kesilmez) */
.c .box{position:absolute;left:0;right:0;bottom:0;padding:62px 12px 14px;background:linear-gradient(180deg,rgba(7,8,15,0),rgba(7,8,15,.9) 46px,#07080f 70px)}
.c .hd{display:flex;align-items:center;gap:10px}
.c .cat{padding:5px 14px 5px 12px;background:var(--cc);color:#fff;font:italic 800 16px 'Barlow Condensed';letter-spacing:.14em;clip-path:polygon(0 0,100% 0,92% 100%,0 100%);text-shadow:0 1px 0 rgba(0,0,0,.3)}
.c .ty{font:italic 800 13px 'Barlow Condensed';letter-spacing:.2em;color:rgba(255,255,255,.75)}
.c .tm{margin-left:auto;font:italic 800 44px/0.85 'Barlow Condensed';color:#fff;text-shadow:0 0 18px rgba(255,210,90,.45)}
.c .tm small{font-size:15px;color:#ffd25a}
.c .seg{display:flex;gap:3px;margin:8px 0 10px}
.c .seg i{flex:1;height:6px;background:#ffd25a;transform:skewX(-20deg);box-shadow:0 0 8px rgba(255,210,90,.6)}.c .seg i.off{background:rgba(255,255,255,.16);box-shadow:none}
.c h2{font-family:Fredoka;font-weight:700;line-height:1.18;text-wrap:balance;padding:0 2px;margin-bottom:12px;color:#fff;letter-spacing:-.003em}
.c .ops{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.c .ops.list{grid-template-columns:1fr;gap:6px}
.c .op{position:relative;min-height:48px;display:flex;align-items:center;background:linear-gradient(180deg,#ffffff,#e4e9f4);border:0;
  clip-path:polygon(0 0,100% 0,96% 100%,0 100%);font-family:Fredoka;font-weight:700;line-height:1.12;color:#0e1430;padding-right:18px}
.c .ops.list .op{min-height:42px;clip-path:polygon(0 0,100% 0,98.4% 100%,0 100%)}
.c .op i{flex:none;align-self:stretch;width:38px;display:grid;place-items:center;margin-right:11px;font:italic 800 23px 'Barlow Condensed';font-style:italic;color:#fff;background:var(--lc);clip-path:polygon(0 0,100% 0,80% 100%,0 100%);text-shadow:0 2px 0 rgba(0,0,0,.25)}
.c .op:nth-child(1) i{--lc:#2f7bff}.c .op:nth-child(2) i{--lc:#ff8a1f}.c .op:nth-child(3) i{--lc:#22c46a}.c .op:nth-child(4) i{--lc:#a24bff}
.c .op.pk{background:linear-gradient(90deg,#ffe066,#ffbb1f);color:#1a1200;box-shadow:0 0 0 2px #fff}
.c .op.pk i{background:#1a1200;color:#ffd25a}
.c .op.pk{padding-right:48px}
/* seçenin avatarı: sağda, şıkkın içinde dikeyde tam ortada; eğik kenardan payı var */
.c .op.pk::after{content:'';position:absolute;right:16px;top:50%;width:28px;height:28px;transform:translateY(-50%);border-radius:7px;border:2px solid #1a1200;background:url(XSENX) center/cover;box-shadow:0 2px 0 rgba(0,0,0,.25)}
.c .ops.list .op.pk::after{width:24px;height:24px;right:14px}
.c .jk{display:flex;gap:7px;margin-top:14px}
.c .j{position:relative;flex:1;height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;font-size:0!important;background:linear-gradient(180deg,var(--jc),var(--jd));border:1.5px solid rgba(255,255,255,.5);transform:skewX(-8deg);
  font:italic 800 9.5px 'Barlow Condensed';letter-spacing:.12em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.35);box-shadow:0 3px 0 rgba(0,0,0,.4)}
.c .j svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transform:skewX(8deg)}
.c .j sup{position:absolute;right:-5px;top:-7px;min-width:17px;height:17px;padding:0 4px;transform:skewX(8deg);background:#fff;color:#111;border-radius:4px;font:italic 800 12px/17px 'Barlow Condensed';text-align:center;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.c .ruler{position:absolute;left:0;right:0;top:50%;border-top:1px dashed rgba(255,255,255,.35)}
.c .ruler span{position:absolute;right:6px;top:-16px;font:700 10px Manrope;color:rgba(255,255,255,.6)}
""".replace("XSENX", SEN)
JC = {'yari': ('#3d8bff', '#1a4fc2'), 'seyirci': ('#ff5fa2', '#c42a6a'), 'sure': ('#2fd07a', '#138a45'), 'sans': ('#b25bff', '#6f22c2'), 'sabotaj': ('#ff6a3a', '#c2301a'), 'kalkan': ('#ffb21a', '#c27a06')}
def C(q=Q, opts=OPTS, cat='BİLİM', cc='#22c46a', ruler=False):
    grid = max(len(o) for o in opts) <= 16                  # kısa şıklar 2×2, uzunlar ince tek sütun
    qf = 25 if len(q) <= 50 else 22 if len(q) <= 80 else 20  # soru uzadıkça yazı küçülür
    of = (19 if grid else (16 if max(len(o) for o in opts) > 34 else 17))
    ops = ''.join(f'<div class="op{" pk" if k == 0 else ""}"><i>{"ABCD"[k]}</i>{o}</div>' for k, o in enumerate(opts))
    jk = ''.join(f'<div class="j" style="--jc:{JC[k][0]};--jd:{JC[k][1]}">{ICO[k]}{n.upper()}<sup>{c}</sup></div>' for k, n, c in JK)
    seg = ''.join(f'<i class="{"off" if k >= 13 else ""}"></i>' for k in range(20))
    rl = '<div class="ruler"><span>ekranın yarısı</span></div>' if ruler else ''
    return f'''<div class="ph c" style="--cc:{cc}">{rl}
<div class="ban"><div class="sd l"><img src="{SEN}"><div><small>SALDIRAN</small><b>Sen</b><em>2.200</em></div></div>
<div class="sd r"><img src="{DEF}"><div><small>SAVUNAN</small><b>Defne</b><em>2.400</em></div></div><div class="vs">VS</div><div class="tg">ANKARA</div><div class="ok">✓ CEVAPLADI</div></div>
<div class="box"><div class="hd"><span class="cat">{cat}</span><span class="tm">13<small> SN</small></span></div>
<div class="seg">{seg}</div><h2 style="font-size:{qf}px">{q}</h2><div class="ops{"" if grid else " list"}" style="font-size:{of}px">{ops}</div><div class="jk">{jk}</div></div></div>'''

html = f'''<!DOCTYPE html><html><head><meta charset="utf-8">{FONTS}<style>{BASE}{C_CSS}</style></head><body>
<div class="col"><div class="cap">KISA SORU<b>2×2 şık</b></div>{C(ruler=True)}</div>
<div class="col"><div class="cap">EN UZUN SORU (109 harf)<b>yazı küçülür</b></div>{C("Paris 2024’te elini cebine koyduğu rahat duruşuyla dünyaca ünlenen Yusuf Dikeç hangi branşta madalya kazandı?", ["Atıcılık","Okçuluk","Eskrim","Golf"], "SPOR", "#ff8a1f", True)}</div>
<div class="col"><div class="cap">EN UZUN ŞIKLAR (49 harf)<b>ince tek sütun</b></div>{C("Karadeniz kıyısında bol yağış görülmesinin nedeni nedir?", ["Nemli rüzgârların kıyıya paralel dağlara çarpması","Karadeniz’in Akdeniz’den daha sıcak olması","Kıyı boyunca geniş ovaların uzanması","Güneş ışınlarının yıl boyu dik gelmesi"], "COĞRAFYA", "#2fb8ff", True)}</div>
</body></html>'''
open(D + 'mock.html', 'w', encoding='utf-8').write(html)
