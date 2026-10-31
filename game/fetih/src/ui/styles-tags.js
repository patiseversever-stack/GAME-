// Harita etiketleri ve oyuncu rozetleri (gece odağı): il adı + sahibi, "SEN" rozeti.
// Kurallar (DESIGN.md): animasyon yalnızca transform ve opacity; backdrop-filter yok; gölgeler duruk.
// Konumlandırma ana öğenin transform'u ile (tags.js); beliriş ve nabız iç öğede (çakışmasın).

import { OUT } from './cssutil.js';

export const CSS_TAGS = /* css */ `
.fl-tags{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.fl-tag{position:absolute;left:0;top:0;transform-origin:0 0;display:block;padding:0;margin:0;background:none;border:0;text-align:center;will-change:transform;pointer-events:none;
  font-family:'Lilita One','Fredoka',system-ui,sans-serif;font-weight:400}
.fl-ui .fl-tag.tp{pointer-events:auto}
.fl-tag:focus,.fl-tag:focus-visible{outline:none}
.fl-tag .in{display:flex;flex-direction:column;align-items:center;opacity:0;transform:translateY(8px) scale(.7);transform-origin:50% 60%;
  transition:opacity .2s,transform .34s cubic-bezier(.3,1.6,.5,1)}
.fl-tag.on .in{opacity:1;transform:none}
.fl-tag.bye .in{opacity:0;transform:translateY(-6px) scale(.9);transition:opacity .2s,transform .2s}
.fl-tag.far .in{opacity:0}
.fl-ui .fl-tag.tp:active .in{transform:scale(.93);transition-duration:.08s}
.fl-tag.nudge .in{animation:flTagNudge .45s}
@keyframes flTagNudge{0%,100%{transform:none}35%{transform:scale(1.14)}65%{transform:scale(.97)}}

/* il adı plakası */
.fl-tag .pl{position:relative;z-index:1;display:flex;align-items:center;gap:4px;height:24px;padding:0 10px 0 2px;border-radius:12px;white-space:nowrap;
  background:linear-gradient(180deg,#18295a,#0b1431);border:2.5px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.5);
  font-size:13px;line-height:1;letter-spacing:.04em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)}
.fl-tag .pl.noic{padding-left:10px}
.fl-tag .pl.lg{font-size:11.5px;letter-spacing:.02em}
.fl-tag .ic{flex:none;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;border:2px solid #fff;
  background:radial-gradient(circle at 40% 30%,var(--ic1),var(--ic2))}
.fl-tag .ic .fl-i{width:14px;height:14px}
.fl-tag .ic.atk{--ic1:#ff8466;--ic2:#d8321f}
.fl-tag .ic.pk{--ic1:#7df08e;--ic2:#25a047}
.fl-tag .ic.cq{--ic1:#ffe680;--ic2:#e0950e}
.fl-tag .ic.src{--ic1:#8fb8ff;--ic2:#2f63d8}

/* sahip şeridi: plakanın altına asılı, sahibin renginde */
.fl-tag .ow{position:relative;display:flex;align-items:center;justify-content:center;gap:4px;align-self:stretch;min-width:0;margin:-3px 6px 0;padding:4px 8px 1px 2px;
  border-radius:0 0 10px 10px;background:var(--oc);border:2.5px solid #fff;border-top:0;box-shadow:0 3px 0 rgba(0,0,0,.5);
  font-size:11px;line-height:1;letter-spacing:.05em;color:#fff;white-space:nowrap}
.fl-tag .ow.lt{color:#241a00}
.fl-tag .ow .fl-av{width:17px;height:17px;border-radius:50%;border-width:2px;box-shadow:none;background:#24345e}
.fl-tag .ow b{font-weight:400;text-shadow:0 1px 0 rgba(0,0,0,.45),0 0 3px rgba(0,0,0,.3)}
.fl-tag .ow.lt b{text-shadow:none}
.fl-tag .ow em{font-style:normal;font-size:8.5px;letter-spacing:.1em;padding:1px 4px 2px;border-radius:5px;background:rgba(0,0,0,.32);color:#fff;text-shadow:none}
.fl-tag .ow.lt em{background:rgba(0,0,0,.2);color:#1a1200}
.fl-tag.cmp .ow b,.fl-tag.cmp .ow em{display:none}
.fl-tag.cmp .ow{padding:5px 4px 2px 4px}
/* sahipli etiket: plaka + sahip satırı tek kart (v1.3): üst ve alt aynı genişlikte, sahip rengi solda ince şerit */
.fl-tag.hasow .pl{height:23px;border-radius:11px 11px 0 0;border-width:2px;border-bottom:0;box-shadow:none;padding-right:11px}
.fl-tag.hasow .ow{margin:0;padding:3px 9px 4px 4px;border-radius:0 0 11px 11px;border:2px solid #fff;border-top:1px solid rgba(255,255,255,.18);
  background:linear-gradient(90deg,var(--oc) 0 4px,#0b1431 4px);box-shadow:0 3px 0 rgba(0,0,0,.45),0 6px 12px rgba(0,0,0,.3);color:#fff;font-size:10.5px}
.fl-tag.hasow .ow.lt{color:#fff}
.fl-tag.hasow .ow.lt b{text-shadow:0 1px 0 rgba(0,0,0,.45)}
.fl-tag.hasow .ow em{background:var(--oc);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.35)}
.fl-tag.hasow .ow.lt em{color:#1a1200;text-shadow:none}
.fl-tag.hasow s{border-top-color:#fff}
/* ucu: ilin üstünü gösteren üçgen */
.fl-tag s{display:block;width:0;height:0;margin-top:0;border:7px solid transparent;border-bottom:0;border-top:8px solid #fff}
.fl-tag.hasow s{border-top-color:var(--oc)}

/* oyuncu rozeti: "SEN" (ya da botun adı) */
.fl-tag.bd .bn{position:relative;display:flex;align-items:center;height:32px;padding:0 14px 0 40px;border-radius:16px;white-space:nowrap;
  background:linear-gradient(180deg,var(--ol),var(--oc) 60%,var(--od));border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.5);
  font-size:18px;line-height:1;letter-spacing:.07em;color:#fff;animation:flBadgeBob 1.5s ease-in-out infinite}
.fl-tag.bd .bn.lt{color:#1a1200}
.fl-tag.bd .bn b{font-weight:400;${OUT('rgba(0,0,0,.5)', 1.5)}}
.fl-tag.bd .bn.lt b{text-shadow:none}
.fl-tag.bd .bn .fl-av{position:absolute;left:-8px;top:50%;width:42px;height:42px;margin-top:-21px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.45)}
.fl-tag.bd.me .bn{padding-right:17px}
.fl-tag.bd s{border-top-color:#fff;margin-top:1px}
.fl-tag.bd.pu s{order:-1;margin:0 0 1px;border-top:0;border-bottom:8px solid #fff}
.fl-tag.bd.ps s{display:none}
@keyframes flBadgeBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

@media not all{ /* dikey kilit: yatay kurallar kapalı */
  .fl-tag .pl{height:26px;font-size:14px}
  .fl-tag.bd .bn{height:32px;font-size:18px;padding-left:40px}
  .fl-tag.bd .bn .fl-av{width:40px;height:40px;margin-top:-20px}
}
`;
