import*as ue from"three";import*as re from"three";var D=Math.PI*2,lt=(l,t,e)=>l<t?t:l>e?e:l,Qs=l=>l<0?0:l>1?1:l,O=(l,t,e)=>l+(t-l)*e;var _t=(l,t,e)=>{let s=Qs((e-l)/(t-l));return s*s*(3-2*s)},gt=(l,t,e,s)=>t+(l-t)*Math.exp(-e*s),ye=l=>(l=(l+Math.PI)%D,(l<0?l+D:l)-Math.PI);var Ue=l=>l<.5?4*l*l*l:1-Math.pow(-2*l+2,3)/2,$e=l=>1-Math.pow(1-l,3);function St(l){let t=l>>>0,e=()=>{t=t+1831565813>>>0;let s=t;return s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296};return e.range=(s,o)=>s+(o-s)*e(),e.pick=s=>s[e()*s.length|0],e.sign=()=>e()<.5?-1:1,e}function Wt(l){let t=Math.floor(l),e=l-t,s=i=>{let a=Math.sin(i*127.1)*43758.5453;return a-Math.floor(a)},o=e*e*(3-2*e);return O(s(t),s(t+1),o)*2-1}var qe=[{id:0,name:"D\xFC\u015F\xFCk",maxPixels:115e4,maxDpr:2,minScale:.62,shadowSize:1024,shadowTaps:1,particles:150,leafDensity:.62,clouds:7,birds:8,shafts:3},{id:1,name:"Orta",maxPixels:19e5,maxDpr:2.4,minScale:.62,shadowSize:2048,shadowTaps:4,particles:340,leafDensity:.85,clouds:11,birds:18,shafts:5},{id:2,name:"Y\xFCksek",maxPixels:3e6,maxDpr:3,minScale:.62,shadowSize:2048,shadowTaps:4,particles:640,leafDensity:1,clouds:16,birds:30,shafts:6}];function ns(l){let t="";try{let a=l.getExtension("WEBGL_debug_renderer_info");t=String(l.getParameter(a?a.UNMASKED_RENDERER_WEBGL:l.RENDERER)||"")}catch{t=""}let e=t.toLowerCase(),s=matchMedia("(pointer: coarse)").matches||/android|iphone|ipad/i.test(navigator.userAgent),o=s?0:1;/swiftshader|llvmpipe|software|microsoft basic/.test(e)||/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(e)?o=0:/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(e)?o=1:/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(e)||/apple/.test(e)||!s&&/nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(e)?o=2:!s&&/intel/.test(e)&&(o=1);let i=navigator.deviceMemory||0;return i&&i<=2?o=0:i&&i<=4&&(o=Math.min(o,1)),{tier:o,gpu:t,mobile:s}}var be=class{constructor({tier:t,gpu:e,store:s,power:o="auto"}){this.T=qe[t],this.gpu=e,this.store=s,this.power=o,this.battery={saver:!1,level:1,charging:!0};let i=s.get("perf")||{},a=i.gpu===e;this.scale=a?lt(i.scale??1,this.T.minScale,1):1,this.cap=a&&i.cap===30?30:60,this.ceil=a?i.ceil??1:1,this.half=a?!!i.half:t===0,this.vsync=16.67,this._deltas=new Float32Array(24),this._di=0,this._count=0,this._frame=0,this._lastRender=0,this._ema=0,this._slow=0,this._good=0,this._cool=0,this._probe=null,this._ups=0,this._dirty=!1,this.onScale=null,this.menu=!1,this._watchBattery()}get targetFps(){return this.menu||this.power==="saver"||this.power==="auto"&&this.battery.saver?30:this.cap}get maxScale(){return this.power==="saver"||this.power==="auto"&&this.battery.saver?Math.min(this.ceil,.8):this.ceil}get effScale(){return Math.min(this.scale,this.maxScale)}tick(t,e){e>4&&e<40&&(this._deltas[this._di]=e,this._di=(this._di+1)%this._deltas.length,this._count++,this._count%24===0&&(this.vsync=Js(this._deltas)));let s=1e3/this.targetFps,o=this._divisor(s);if(this._frame++,this._frame<o)return!1;this._frame=0;let i=this._lastRender?t-this._lastRender:s;return this._lastRender=t,this._adapt(t,i,o*this.vsync),!0}_divisor(t){let e=t/this.vsync;return Math.max(1,this.half?Math.ceil(e-.05):Math.round(e-.15))}reset(){this._lastRender=0,this._frame=0,this._slow=0,this._good=0}_adapt(t,e,s){if(e>s*4)return;this._ema=this._ema?this._ema+(e-this._ema)*.08:e;let o=e/1e3;if(t<this._cool)return;let i=this._ema>s*1.22;if(i?(this._slow+=o,this._good=0):(this._slow=Math.max(0,this._slow-o*.5),this._good+=o),this._probe&&i&&this._slow>1.2){this.ceil=this._probe.from,this._setScale(this._probe.from),this._probe=null,this._cool=t+4e3,this._slow=0,this._dirty=!0;return}if(this._probe&&t-this._probe.t>6e3&&(this._probe=null,this._dirty=!0),this._slow>1.6){this._slow=0,this._cool=t+2200;let a=this.effScale;a>.81?this._setScale(Math.max(.8,a-.1)):!this.half&&this.vsync<14?this.half=!0:a>this.T.minScale+.01?this._setScale(Math.max(this.T.minScale,a-.1)):this.cap===60&&(this.cap=30),this._dirty=!0}else this._good>9&&this._ups<3&&(this._good=0,this.cap===30&&this.power!=="saver"&&!this.battery.saver&&this.effScale>=.8?(this.cap=60,this._ups++,this._cool=t+3e3):this.scale<this.maxScale-.01&&(this._probe={from:this.scale,t},this._setScale(Math.min(this.maxScale,this.scale+.08)),this._ups++,this._cool=t+2500));this._dirty&&t>this._cool&&this.save()}_setScale(t){this.scale=Math.round(t*100)/100,this.onScale&&this.onScale()}save(){this._dirty=!1,this.store.set("perf",{gpu:this.gpu,scale:this.scale,cap:this.cap,ceil:this.ceil,half:this.half})}_watchBattery(){navigator.getBattery&&navigator.getBattery().then(t=>{let e=()=>{this.battery.level=t.level,this.battery.charging=t.charging;let s=this.battery.saver;this.battery.saver=!t.charging&&(s?t.level<=.25:t.level<=.2),s!==this.battery.saver&&this.onBattery&&this.onBattery(this.battery.saver)};e(),t.addEventListener("levelchange",e),t.addEventListener("chargingchange",e)}).catch(()=>{})}pixelRatio(t,e){let s=Math.min(window.devicePixelRatio||1,this.T.maxDpr);return t*e*s*s>this.T.maxPixels&&(s=Math.sqrt(this.T.maxPixels/(t*e))),Math.max(.75,s*this.effScale)}};function Js(l){let t=Array.from(l).filter(e=>e>0).sort((e,s)=>e-s);return t.length?t[t.length>>1]:16.67}function rs(l,t){let e={tier:0,gpu:"",mobile:!0};try{let h=document.createElement("canvas").getContext("webgl2");if(h){e=ns(h);let f=h.getExtension("WEBGL_lose_context");f&&f.loseContext()}}catch{}t!=null&&t>=0&&t<=2&&(e.tier=t);let s=/swiftshader|llvmpipe/i.test(e.gpu),o=new re.WebGLRenderer({canvas:l,antialias:!s,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1});o.outputColorSpace=re.LinearSRGBColorSpace,o.toneMapping=re.NoToneMapping,o.setClearColor(1446442,1),o.sortObjects=!0,o.shadowMap.enabled=!1;let a=!!(o.getContext().getContextAttributes()||{}).antialias,c=o.capabilities.getMaxAnisotropy(),n=qe[e.tier],r=Math.min(c,n.id>=1?8:4);return{renderer:o,tier:n,gpu:e.gpu,mobile:e.mobile,msaa:a,aniso:r}}import*as st from"three";var H=(l,t=1)=>new st.Color(l).multiplyScalar(t);function ls(){return{uTime:{value:0},uSunDir:{value:new st.Vector3(0,1,0)},uSunCol:{value:new st.Color},uSkyTop:{value:new st.Color},uSkyHor:{value:new st.Color},uGround:{value:new st.Color},uShadeTint:{value:new st.Color},uFogCol:{value:new st.Color},uFogSun:{value:new st.Color},uFogP:{value:new st.Vector4(.004,0,.03,6)},uRes:{value:new st.Vector3(1,1,.3)},uLift:{value:new st.Color(0,0,0)},uGain:{value:new st.Color(1,1,1)},uGrade:{value:new st.Vector4(1,1,1,1.2/255)},uWind:{value:new st.Vector4(1,0,.3,0)},uFocus:{value:new st.Vector4(0,-999,0,1.6)},uDanger:{value:0},uShadowMap:{value:null},uShadowMat:{value:new st.Matrix4},uShadowP:{value:new st.Vector4(1/1024,.06,.0012,1)},uZenith:{value:new st.Color},uHorizon:{value:new st.Color},uSunGlow:{value:new st.Color},uSunDisc:{value:new st.Color},uNight:{value:0},uCloudCol:{value:new st.Color},uCloudShade:{value:new st.Color}}}var Xe={spring:{elev:34,sun:H("#ffe4c8",3),zenith:H("#4a7bd0"),horizon:H("#f6d2d4"),sunGlow:H("#ffc9a6",1.3),sunDisc:H("#fff3df",1),skyTop:H("#8aa4dc",.56),skyHor:H("#e9c9d4",.46),ground:H("#b8928a",.32),shade:H("#dcd6ee",1),fog:H("#e4c6d2"),fogSun:H("#ffdcc0",1.1),fogP:[.0026,4,.03,7],cloud:H("#fff1ee",1.15),cloudShade:H("#a48fba",.85),lift:H("#2a1c46",.06),gain:H("#fff6f2"),grade:[1.16,1.1,.95],vignette:.34,night:0},summer:{elev:58,sun:H("#fff3dc",3.2),zenith:H("#2a68d4"),horizon:H("#bfe0f2"),sunGlow:H("#fff0d0",1.1),sunDisc:H("#ffffff",1),skyTop:H("#86aae6",.56),skyHor:H("#c4dae6",.44),ground:H("#97a070",.32),shade:H("#d6dcee",1),fog:H("#c9e2f0"),fogSun:H("#fff1d8",1.05),fogP:[.0022,4,.032,8],cloud:H("#ffffff",1.25),cloudShade:H("#93a9cc",.9),lift:H("#0e1a40",.05),gain:H("#fbfdff"),grade:[1.18,1.1,.95],vignette:.3,night:0},autumn:{elev:22,sun:H("#ffc88a",3.2),zenith:H("#5671b8"),horizon:H("#f2bc88"),sunGlow:H("#ffb070",1.5),sunDisc:H("#fff0d0",1),skyTop:H("#9496c8",.54),skyHor:H("#e2b08c",.44),ground:H("#a6765a",.32),shade:H("#dccfe6",1),fog:H("#e0b48e"),fogSun:H("#ffc488",1.2),fogP:[.003,4,.028,6],cloud:H("#ffe2c2",1.15),cloudShade:H("#9c7c98",.8),lift:H("#2a1430",.06),gain:H("#fff2e4"),grade:[1.16,1.1,.95],vignette:.36,night:0},winter:{elev:8,sun:H("#ff9e6a",3),zenith:H("#262c6a"),horizon:H("#ee8a6c"),sunGlow:H("#ff8a5a",1.7),sunDisc:H("#ffd8b0",1),skyTop:H("#7078b8",.56),skyHor:H("#c890a8",.42),ground:H("#8a88b0",.36),shade:H("#d0ccec",1),fog:H("#8f7cae"),fogSun:H("#ff9f78",1.25),fogP:[.0032,4,.026,5],cloud:H("#ffc4ae",1.05),cloudShade:H("#5e5490",.78),lift:H("#1c1040",.07),gain:H("#fff0ec"),grade:[1.1,1.08,1],vignette:.4,night:.35},night:{elev:30,sun:H("#9fb4ff",.9),zenith:H("#0b0d2a"),horizon:H("#3a3570"),sunGlow:H("#8fa2ff",.6),sunDisc:H("#e8eeff",.6),skyTop:H("#3a4290",.3),skyHor:H("#4a3f80",.24),ground:H("#2a2850",.22),shade:H("#b0b4f0",1),fog:H("#2a2756"),fogSun:H("#5a62b0",1),fogP:[.003,4,.026,6],cloud:H("#8a90d0",.7),cloudShade:H("#2a2a5a",.7),lift:H("#0a0a28",.08),gain:H("#e8ecff"),grade:[1.05,1.1,1.05],vignette:.44,night:1}},ti=new st.Color,ei=new st.Color;function cs(l,t,e,s,o,i=null){let a=(r,h,f)=>r.copy(ti.copy(h).lerp(ei.copy(f),s)),c=(r,h)=>r+(h-r)*s,n=st.MathUtils.degToRad(i??c(t.elev,e.elev));return l.uSunDir.value.set(Math.cos(n)*Math.cos(o),Math.sin(n),Math.cos(n)*Math.sin(o)),a(l.uSunCol.value,t.sun,e.sun),a(l.uZenith.value,t.zenith,e.zenith),a(l.uHorizon.value,t.horizon,e.horizon),a(l.uSunGlow.value,t.sunGlow,e.sunGlow),a(l.uSunDisc.value,t.sunDisc,e.sunDisc),a(l.uSkyTop.value,t.skyTop,e.skyTop),a(l.uSkyHor.value,t.skyHor,e.skyHor),a(l.uGround.value,t.ground,e.ground),a(l.uShadeTint.value,t.shade,e.shade),a(l.uFogCol.value,t.fog,e.fog),a(l.uFogSun.value,t.fogSun,e.fogSun),a(l.uCloudCol.value,t.cloud,e.cloud),a(l.uCloudShade.value,t.cloudShade,e.cloudShade),a(l.uLift.value,t.lift,e.lift),a(l.uGain.value,t.gain,e.gain),l.uFogP.value.set(c(t.fogP[0],e.fogP[0]),c(t.fogP[1],e.fogP[1]),c(t.fogP[2],e.fogP[2]),c(t.fogP[3],e.fogP[3])),l.uGrade.value.x=c(t.grade[0],e.grade[0]),l.uGrade.value.y=c(t.grade[1],e.grade[1]),l.uGrade.value.z=c(t.grade[2],e.grade[2]),l.uRes.value.z=c(t.vignette,e.vignette),l.uNight.value=c(t.night,e.night),n}function de(l,t,e){let s=st.MathUtils.degToRad(t);return e.set(Math.cos(s)*Math.cos(l),Math.sin(s),Math.cos(s)*Math.sin(l))}import*as vt from"three";var tt=`
uniform float uTime;
uniform vec3 uSunDir;   // g\xFCne\u015Fe do\u011Fru birim vekt\xF6r
uniform vec3 uSunCol;   // do\u011Frusal renk (\u015Fiddet dahil)
uniform vec3 uSkyTop;   // g\xF6k ortam \u0131\u015F\u0131\u011F\u0131 (yukar\u0131dan)
uniform vec3 uSkyHor;   // ufuk
uniform vec3 uGround;   // yerden sekme \u0131\u015F\u0131\u011F\u0131
uniform vec3 uShadeTint;// g\xF6lgedeki serin ton
uniform vec3 uFogCol;
uniform vec3 uFogSun;   // g\xFCne\u015Fe bakarken sisin rengi
uniform vec4 uFogP;     // x yo\u011Funluk, y y\xFCkseklik referans\u0131, z y\xFCkseklik azal\u0131m\u0131, w g\xFCne\u015F halesi \xFCss\xFC
uniform vec3 uRes;      // geni\u015Flik, y\xFCkseklik, vinyet g\xFCc\xFC
uniform vec3 uLift;
uniform vec3 uGain;
uniform vec4 uGrade;    // x doygunluk, y kontrast, z pozlama, w titre\u015Fim g\xFCc\xFC
uniform vec4 uWind;     // xy y\xF6n, z s\xFCrekli g\xFC\xE7, w ani r\xFCzg\xE2r
uniform float uDanger;  // Zifir yanarken ekran kenar\u0131 s\u0131cak parlar

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

// R\xFCzg\xE2r: JS taraf\u0131ndaki windSway() ile ayn\u0131 form\xFCl; oynan\u0131\u015F g\xF6lge testi g\xF6r\xFCnt\xFCyle birebir uyu\u015Fur.
vec3 windSway(vec3 anchor, float amount) {
	float ph = dot(anchor.xz, vec2(0.071, 0.053)) + anchor.y * 0.037;
	float base = sin(uTime * 1.3 + ph * 6.2831) * 0.6 + sin(uTime * 2.7 + ph * 11.0) * 0.4;
	float gust = uWind.w * (0.65 + 0.35 * sin(uTime * 5.1 + ph * 17.0));
	float k = (uWind.z * base + gust) * amount;
	return vec3(uWind.x * k, sin(uTime * 2.1 + ph * 9.0) * 0.18 * amount * (uWind.z + uWind.w), uWind.y * k);
}
`,fe=`
#ifndef SHADOW_TAPS
#define SHADOW_TAPS 1
#endif
uniform sampler2DShadow uShadowMap;
uniform mat4 uShadowMat;
uniform vec4 uShadowP; // x 1/\xE7\xF6z\xFCn\xFCrl\xFCk, y normal kayd\u0131rma, z derinlik pay\u0131, w kapsama
// Harita d\u0131\u015F\u0131ndaki uzak yerler i\xE7in g\xF6vdenin analitik g\xF6lgesi (dikey konik silindir).
float trunkShadow(vec3 p) {
	vec2 L = uSunDir.xz;
	float t = -dot(p.xz, L) / max(dot(L, L), 1e-4);
	if (t <= 0.0) return 1.0;
	float y = p.y + uSunDir.y * t;
	if (y > 53.5) return 1.0;
	float yy = clamp(y, 0.0, 52.0);
	float R = 3.05 + 0.95 * (1.0 - yy / 52.0) + 1.9 * exp(-max(y, 0.0) / 2.3);
	return smoothstep(R - 0.25, R + 0.35, length(p.xz + L * t));
}
float shadowAt(vec3 wp, vec3 n) {
	vec4 sc = uShadowMat * vec4(wp + n * uShadowP.y, 1.0);
	vec3 p = sc.xyz;
	vec2 e = abs(p.xy - 0.5);
	if (max(e.x, e.y) > 0.497 || p.z > 1.0) return trunkShadow(wp);
	p.z -= uShadowP.z;
#if SHADOW_TAPS > 1
	float o = uShadowP.x * 1.35;
	float s = texture(uShadowMap, vec3(p.xy + vec2(-o, -0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(0.35 * o, -o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(o, 0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(-0.35 * o, o), p.z));
	return s * 0.25;
#else
	return texture(uShadowMap, p);
#endif
}
`,Ht=`
// Stilize \u0131\u015F\u0131k: yumu\u015Fak ge\xE7i\u015Fli g\xFCne\u015F, yar\u0131 k\xFCre g\xF6k \u0131\u015F\u0131\u011F\u0131, serin g\xF6lge tonu,
// kontra \u0131\u015F\u0131kta kenar parlamas\u0131. Hepsi birka\xE7 \xE7arpma; doku okumas\u0131 yok.
vec3 skyAmbient(vec3 N) {
	float up = N.y * 0.5 + 0.5;
	vec3 a = mix(uGround, uSkyHor, smoothstep(0.0, 0.55, up));
	return mix(a, uSkyTop, smoothstep(0.5, 1.0, up));
}

vec3 shadeLit(vec3 albedo, vec3 N, vec3 V, float ao, float sh, float wrapK, float rimK) {
	float ndl = dot(N, uSunDir);
	float diff = clamp((ndl + wrapK) / (1.0 + wrapK), 0.0, 1.0);
	diff = diff * diff * (3.0 - 2.0 * diff);
	float lit = diff * sh;
	vec3 amb = skyAmbient(N) * ao;
	// G\xF6lgede kalan y\xFCzey serin-mor ton al\u0131r (oyunun okunur kalmas\u0131 i\xE7in \u0131\u015F\u0131k s\u0131cak, g\xF6lge serin).
	vec3 shadeCol = mix(uShadeTint, vec3(1.0), lit);
	vec3 c = albedo * (amb * shadeCol + uSunCol * lit);
	// Kontra \u0131\u015F\u0131k: g\xFCne\u015F nesnenin arkas\u0131ndayken siluet kenar\u0131 alt\u0131n renkte yanar.
	float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
	float back = clamp(dot(-V, uSunDir) * 0.6 + 0.4, 0.0, 1.0);
	c += uSunCol * fres * back * rimK * (0.25 + 0.75 * sh) * ao;
	return c;
}

vec3 applyFog(vec3 c, vec3 wp) {
	vec3 d = wp - cameraPosition;
	float dist = length(d);
	vec3 v = d / max(dist, 1e-3);
	float hk = exp(-max(wp.y - uFogP.y, -40.0) * uFogP.z);
	float f = 1.0 - exp(-dist * uFogP.x * (0.25 + hk));
	float s = pow(max(dot(v, uSunDir), 0.0), uFogP.w);
	return mix(c, mix(uFogCol, uFogSun, s), clamp(f, 0.0, 1.0));
}
`,xt=`
vec3 acesFit(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
// Ton e\u015Fleme + renk d\xFCzenleme + vinyet + titre\u015Fim. Her malzemenin son sat\u0131r\u0131.
vec4 finish(vec3 c, float a) {
	c = acesFit(c * uGrade.z);
	c = pow(c, vec3(1.0 / 2.2));
	c = c * uGain + uLift * (1.0 - c);
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, uGrade.x);
	c = (c - 0.5) * uGrade.y + 0.5;
	vec2 q = gl_FragCoord.xy / uRes.xy - 0.5;
	q.x *= uRes.x / uRes.y * 0.75;
	float vg = smoothstep(0.25, 0.95, length(q));
	c *= 1.0 - uRes.z * vg;
	c += vec3(1.0, 0.38, 0.1) * uDanger * vg * 0.6;
	c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrade.w;
	return vec4(clamp(c, 0.0, 1.0), a);
}
`;var Yt=null,hs=1;function us(l,t){Yt=l,hs=t}var ds=(l={})=>({SHADOW_TAPS:hs,...l}),fs=`
uniform vec4 uFocus; // xyz odak (Zifir), w a\xE7\u0131kl\u0131k yar\u0131\xE7ap\u0131
void cutout(vec3 wp) {
	vec3 ab = uFocus.xyz - cameraPosition;
	float L = length(ab);
	vec3 dir = ab / max(L, 1e-3);
	vec3 ap = wp - cameraPosition;
	float t = dot(ap, dir);
	float k = 0.0;
	if (t > 0.0 && t < L - 0.9) {
		float d = length(ap - dir * t);
		float rad = uFocus.w * (0.55 + 0.45 * smoothstep(0.0, 4.0, t));
		k = smoothstep(rad, rad * 0.55, d);
	}
	k = max(k, smoothstep(7.0, 3.0, length(ap))); // kameraya \xE7ok yak\u0131n dal ve yaprak
	float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
	if (k > ign) discard;
}
`,si=`
${tt}
attribute vec4 color;
#ifdef WIND
attribute vec4 aSway;
#endif
varying vec4 vCol;
varying vec3 vN;
varying vec3 vW;
#ifdef USE_MAP
varying vec2 vUv;
uniform vec2 uMapRepeat;
#endif
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
#ifdef WIND
	w.xyz += windSway(aSway.xyz, aSway.w);
#endif
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vCol = color;
#ifdef USE_MAP
	vUv = uv * uMapRepeat;
#endif
	gl_Position = projectionMatrix * viewMatrix * w;
}`,ii=`
${tt}
${fe}
${Ht}
${xt}
#ifdef CUTOUT
${fs}
#endif
varying vec4 vCol;
varying vec3 vN;
varying vec3 vW;
uniform float uWrap;
uniform float uRim;
uniform float uSnow;     // yukar\u0131 bakan y\xFCzeylerde kar (k\u0131\u015F\u0131n)
uniform float uSnowY;    // kar\u0131n ba\u015Flad\u0131\u011F\u0131 y\xFCkseklik
#ifdef USE_MAP
varying vec2 vUv;
uniform sampler2D uMap;
#endif
void main() {
#ifdef CUTOUT
	cutout(vW);
#endif
	vec3 N = normalize(vN);
	if (!gl_FrontFacing) N = -N;
	vec3 V = normalize(cameraPosition - vW);
	vec3 alb = vCol.rgb;
	float ao = vCol.a;
#ifdef USE_MAP
	vec4 m = texture2D(uMap, vUv);
	alb *= m.rgb;
	ao *= m.a;
#endif
	// Kar: a\u015Fa\u011F\u0131da (k\u0131\u015F kat\u0131nda) yukar\u0131 bakan y\xFCzeyleri \xF6rter.
	float snow = uSnow * smoothstep(uSnowY + 2.0, uSnowY - 2.0, vW.y) * smoothstep(0.35, 0.75, N.y);
	alb = mix(alb, vec3(0.92, 0.94, 1.0), snow);
	float sh = shadowAt(vW, N);
	vec3 c = shadeLit(alb, N, V, ao, sh, uWrap, uRim);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`;function Xt({map:l=null,repeat:t=[1,1],wrap:e=.3,rim:s=.35,snow:o=0,snowY:i=14,side:a=vt.FrontSide,wind:c=!1,cutout:n=!1}={}){let r={};return l&&(r.USE_MAP=1),c&&(r.WIND=1),n&&(r.CUTOUT=1),new vt.ShaderMaterial({vertexShader:si,fragmentShader:ii,defines:ds(r),uniforms:{...Yt,uMap:{value:l},uMapRepeat:{value:new vt.Vector2(t[0],t[1])},uWrap:{value:e},uRim:{value:s},uSnow:{value:o},uSnowY:{value:i}},side:a})}var ps=`
${tt}
attribute vec3 iPos;      // kart\u0131n merkezi
attribute vec4 iCluster;  // xyz k\xFCme merkezi, w k\xFCme yar\u0131\xE7ap\u0131
attribute vec4 iData;     // x boyut, y d\xF6n\xFC\u015F, z atlas h\xFCcresi, w renk sapmas\u0131
attribute vec3 iTint;
attribute vec4 iSway;     // dal\u0131n sallanma \xE7apas\u0131 ve a\u011F\u0131rl\u0131\u011F\u0131 (dal ile k\xFCme birlikte sallan\u0131r)
uniform float uFacing;    // 1: kameraya d\xF6n (\xE7izim), 0: g\xFCne\u015Fe d\xF6n (g\xF6lge haritas\u0131)
uniform vec3 uFaceDir;    // g\xF6lge ge\xE7i\u015Finde kartlar\u0131n d\xF6nece\u011Fi y\xF6n
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;
varying float vDepthAO;
void main() {
	vec3 sway = windSway(iSway.xyz, iSway.w);
	vec3 c = iPos + sway;
	vec3 toCam = uFacing > 0.5 ? normalize(cameraPosition - c) : uFaceDir;
	vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + vec3(1e-4, 0.0, 0.0));
	vec3 up = cross(toCam, right);
	float s = iData.x;
	float r = iData.y + sin(uTime * 2.3 + iData.w * 40.0) * 0.06 * (uWind.z + uWind.w * 2.0);
	vec2 q = position.xy;
	vec2 rq = vec2(q.x * cos(r) - q.y * sin(r), q.x * sin(r) + q.y * cos(r));
	vec3 w = c + (right * rq.x + up * rq.y) * s;
	vW = w;
	vec3 rel = c - iCluster.xyz;
	vN = normalize(rel / max(iCluster.w, 0.01) + (right * rq.x + up * rq.y) * 0.6 + vec3(0.0, 0.25, 0.0));
	vDepthAO = clamp(length(rel) / max(iCluster.w, 0.01), 0.0, 1.0);
	float cell = iData.z;
	// atlas: tuvalin \xFCst sat\u0131r\u0131 v=1 taraf\u0131nda (CanvasTexture flipY)
	vUv = (position.xy + 0.5) * 0.5 + vec2(mod(cell, 2.0), 1.0 - floor(cell / 2.0)) * 0.5;
	vTint = iTint;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`,oi=`
${tt}
${fe}
${Ht}
${xt}
${fs}
uniform sampler2D uMap;
uniform float uAlphaCut;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;
varying float vDepthAO;
void main() {
	vec4 t = texture2D(uMap, vUv);
	if (t.a < uAlphaCut) discard;
	cutout(vW);
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	vec3 alb = t.rgb * vTint;
	// \u0130\xE7 k\u0131s\u0131m daha koyu: k\xFCmeye hacim hissi. Yapraklar \u0131\u015F\u0131\u011F\u0131 sa\xE7ar: g\xF6lgede bile
	// g\xF6k \u0131\u015F\u0131\u011F\u0131n\u0131 daha \xE7ok al\u0131r (g\xF6lgedeki \xE7i\xE7ekler morarmas\u0131n).
	float ao = mix(0.55, 1.0, smoothstep(0.15, 0.95, vDepthAO));
	float sh = shadowAt(vW + uSunDir * 0.45, N);
	vec3 c = shadeLit(alb, N, V, ao * 1.35, sh, 0.65, 0.55);
	c += alb * uGround * 0.35 * (1.0 - sh);
	// Yar\u0131 saydaml\u0131k: g\xFCne\u015F yapra\u011F\u0131n arkas\u0131ndayken \u0131\u015F\u0131k i\xE7inden ge\xE7er.
	float tr = pow(max(dot(-V, uSunDir), 0.0), 3.0);
	c += alb * uSunCol * tr * 0.9 * sh * (0.5 + 0.5 * ao);
	c = applyFog(c, vW);
#ifdef A2C
	gl_FragColor = finish(c, smoothstep(uAlphaCut, 0.75, t.a));
#else
	gl_FragColor = finish(c, 1.0);
#endif
}`;function ms(l,{a2c:t}){return new vt.ShaderMaterial({vertexShader:ps,fragmentShader:oi,defines:ds(t?{A2C:1}:{}),uniforms:{...Yt,uMap:{value:l},uAlphaCut:{value:t?.12:.45},uFacing:{value:1},uFaceDir:{value:new vt.Vector3(0,1,0)}},alphaToCoverage:!!t,side:vt.DoubleSide})}function vs(l){return new vt.ShaderMaterial({vertexShader:ps,fragmentShader:`
			uniform sampler2D uMap;
			varying vec2 vUv;
			void main() { if (texture2D(uMap, vUv).a < 0.22) discard; gl_FragColor = vec4(1.0); }`,uniforms:{...Yt,uMap:{value:l},uFacing:{value:0},uFaceDir:Yt.uSunDir},side:vt.DoubleSide,colorWrite:!1})}function Ke({wind:l=!1}={}){return new vt.ShaderMaterial({vertexShader:`
			${tt}
			#ifdef WIND
			attribute vec4 aSway;
			#endif
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
			#ifdef WIND
				w.xyz += windSway(aSway.xyz, aSway.w);
			#endif
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:"void main() { gl_FragColor = vec4(1.0); }",defines:l?{WIND:1}:{},uniforms:{...Yt},side:vt.DoubleSide,colorWrite:!1})}function Ye(l,t=1){return new vt.ShaderMaterial({vertexShader:"varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",fragmentShader:`
			${tt}
			${Ht}
			${xt}
			uniform vec3 uColor; uniform float uK; uniform float uFade;
			varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(uColor * uK * uFade, vW), 1.0); }`,uniforms:{...Yt,uColor:{value:new vt.Color(l)},uK:{value:t},uFade:{value:1}}})}function gs(l=16777215,t=1){return new vt.ShaderMaterial({vertexShader:`
			attribute vec4 color; varying vec4 vCol; varying vec3 vW;
			void main() { vCol = color; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${tt}
			${Ht}
			${xt}
			uniform vec3 uColor; uniform float uK;
			varying vec4 vCol; varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(vCol.rgb * uColor * uK, vW), 1.0); }`,uniforms:{...Yt,uColor:{value:new vt.Color(l)},uK:{value:t}}})}function xs(l){return new vt.ShaderMaterial({vertexShader:`
			varying vec3 vDir;
			void main() {
				vDir = position;
				vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
				gl_Position = p.xyww;
			}`,fragmentShader:`
			${tt}
			${xt}
			uniform vec3 uZenith, uHorizon, uSunGlow, uSunDisc;
			uniform float uNight;
			uniform sampler2D uStars;
			varying vec3 vDir;
			void main() {
				vec3 v = normalize(vDir);
				float h = v.y;
				vec3 c = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
				// ufkun alt\u0131: bulut denizinin sisine kar\u0131\u015F\u0131r
				c = mix(c, uFogCol * 0.95, smoothstep(0.02, -0.18, h));
				float sd = max(dot(v, uSunDir), 0.0);
				// g\xFCne\u015F taraf\u0131nda s\u0131cak ufuk band\u0131
				float band = exp(-abs(h - 0.02) * 9.0);
				c += uSunGlow * band * pow(sd, 3.0) * 0.55;
				c += uSunGlow * (pow(sd, 10.0) * 0.55 + pow(sd, 90.0) * 1.6);
				c += uSunDisc * smoothstep(0.99935, 0.99965, sd) * 26.0;
				// y\u0131ld\u0131zlar (alacakaranl\u0131k ve gece)
				if (uNight > 0.01) {
					vec2 suv = vec2(atan(v.z, v.x) / 6.2831853 * 3.0, v.y * 1.5);
					vec3 st = texture2D(uStars, suv).rgb;
					float tw = 0.65 + 0.35 * sin(uTime * 2.0 + st.g * 40.0);
					c += st.r * tw * uNight * smoothstep(0.02, 0.35, h) * vec3(0.9, 0.95, 1.1) * 2.2;
				}
				gl_FragColor = finish(c, 1.0);
			}`,uniforms:{...Yt,uStars:{value:l}},depthWrite:!1,side:vt.BackSide})}import*as ot from"three";var we=class{constructor(t,e){this.G=t,this.size=e,this.half=17,this.scene=new ot.Scene,this.scene.matrixWorldAutoUpdate=!1,this.cam=new ot.OrthographicCamera(-this.half,this.half,this.half,-this.half,1,300);let s=new ot.DepthTexture(e,e);s.type=ot.UnsignedIntType,s.compareFunction=ot.LessEqualCompare,s.minFilter=ot.LinearFilter,s.magFilter=ot.LinearFilter,this.rt=new ot.WebGLRenderTarget(e,e,{depthTexture:s,depthBuffer:!0,stencilBuffer:!1,format:ot.RedFormat,type:ot.UnsignedByteType,minFilter:ot.NearestFilter,magFilter:ot.NearestFilter,generateMipmaps:!1}),t.uShadowMap.value=s,t.uShadowP.value.set(1/e,.05,9e-4,1),this._bias=new ot.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this._r=new ot.Vector3,this._u=new ot.Vector3,this._f=new ot.Vector3,this._p=new ot.Vector3}add(t,e){let s=new ot.Mesh(t,e);return s.frustumCulled=!1,s.matrixAutoUpdate=!1,s.updateMatrixWorld(!0),this.scene.add(s),s}place(t,e){let s=this._f.copy(e).negate(),o=Math.abs(s.y)>.98?this._u.set(1,0,0):this._u.set(0,1,0),i=this._r.crossVectors(s,o).normalize(),a=this._u.crossVectors(i,s).normalize(),c=this.half*2/this.size,n=Math.round(t.dot(i)/c)*c,r=Math.round(t.dot(a)/c)*c,h=t.dot(s),f=this._p.set(0,0,0).addScaledVector(i,n).addScaledVector(a,r).addScaledVector(s,h),u=this.cam;u.position.copy(f).addScaledVector(s,-150),u.up.copy(a),u.lookAt(f),u.updateMatrixWorld(!0),u.updateProjectionMatrix(),this.G.uShadowMat.value.copy(this._bias).multiply(u.projectionMatrix).multiply(u.matrixWorldInverse)}render(t){let e=t.getRenderTarget();t.setRenderTarget(this.rt),t.clear(!1,!0,!1),t.render(this.scene,this.cam),t.setRenderTarget(e)}dispose(){this.rt.depthTexture.dispose(),this.rt.dispose()}};import*as Mt from"three";import*as Kt from"three";function Nt(l,t){let e=document.createElement("canvas");return e.width=l,e.height=t,[e,e.getContext("2d")]}function oe(l,t,e,s,o,i){for(let a=-1;a<=1;a++)for(let c=-1;c<=1;c++){let n=e+a*l,r=s+c*t;n+o<0||n-o>l||r+o<0||r-o>t||i(n,r)}}function Gt(l,{srgb:t=!0,repeat:e=!0,aniso:s=1,mips:o=!0}={}){let i=new Kt.CanvasTexture(l);return t&&(i.colorSpace=Kt.SRGBColorSpace),e&&(i.wrapS=i.wrapT=Kt.RepeatWrapping),i.anisotropy=s,i.generateMipmaps=o,i.minFilter=o?Kt.LinearMipmapLinearFilter:Kt.LinearFilter,i.needsUpdate=!0,i}function ys(l,t){let e=l,s=l,[o,i]=Nt(e,s),a=St(7),c=e/512,n=i.createLinearGradient(0,0,e,0);n.addColorStop(0,"#e8e3da"),n.addColorStop(.5,"#efebe3"),n.addColorStop(1,"#e8e3da"),i.fillStyle=n,i.fillRect(0,0,e,s);let r=["#f6f3ed","#ddd6cc","#e9e1d6","#efe2dc","#e2e2e4","#f2ede2"];for(let h=0;h<70;h++){let f=a()*e,u=a()*s,m=a.range(30,120)*c,d=m*a.range(.12,.4);i.globalAlpha=a.range(.18,.4),i.fillStyle=a.pick(r),oe(e,s,f,u,m,(v,g)=>{i.beginPath(),i.ellipse(v,g,m,d,0,0,D),i.fill()})}i.globalAlpha=.06,i.strokeStyle="#8c8076",i.lineWidth=1*c;for(let h=0;h<90;h++){let f=a()*e,u=a()*s,m=a.range(20,90)*c;oe(e,s,f,u,m,(d,v)=>{i.beginPath(),i.moveTo(d,v),i.lineTo(d+a.range(-2,2)*c,v+m),i.stroke()})}for(let h=0;h<26;h++){let f=a()*e,u=a()*s,m=a.range(40,160)*c,d=a.range(3,9)*c;oe(e,s,f,u,m,(v,g)=>{i.globalAlpha=.5,i.fillStyle="#fbf9f4",i.beginPath(),i.ellipse(v,g,m/2,d/2,0,0,D),i.fill(),i.globalAlpha=.18,i.fillStyle="#7d6e66",i.beginPath(),i.ellipse(v,g+d*.55,m/2.1,d/4,0,0,D),i.fill()})}for(let h=0;h<9;h++){let f=a()*e,u=a()*s,m=a.range(18,50)*c,d=a.range(5,12)*c;oe(e,s,f,u,m,(v,g)=>{i.globalAlpha=.55,i.fillStyle=a()<.5?"#d39a7c":"#c98468",i.beginPath(),i.ellipse(v,g,m/2,d/2,0,0,D),i.fill(),i.globalAlpha=.7,i.strokeStyle="#f7f1e8",i.lineWidth=1.5*c,i.stroke()})}for(let h=0;h<34;h++){let f=a()*s,u=a.range(3,9)|0,m=a()*e;for(let d=0;d<u;d++){let v=a.range(5,34)*c,g=a.range(1.2,3.2)*c,x=f+a.range(-4,4)*c;oe(e,s,m,x,v,(p,y)=>{i.globalAlpha=a.range(.55,.9),i.fillStyle=a()<.7?"#3b3330":"#5a4a44",i.beginPath(),i.ellipse(p,y,v/2,g/2,0,0,D),i.fill()}),m+=v+a.range(4,30)*c}}for(let h=0;h<11;h++){let f=a()*e,u=a()*s,m=a.range(18,64)*c,d=m*a.range(.35,.8);oe(e,s,f,u,m,(v,g)=>{i.globalAlpha=.85,i.fillStyle="#1f1b1a",i.beginPath();let x=18;for(let p=0;p<=x;p++){let y=p/x*D,w=1+a.range(-.25,.2),T=Math.cos(y)*m*.5*w,P=Math.sin(y)*d*.5*w*(.55+.45*Math.abs(Math.cos(y)));p===0?i.moveTo(v+T,g+P):i.lineTo(v+T,g+P)}i.closePath(),i.fill(),i.globalAlpha=.25,i.strokeStyle="#6e625c",i.lineWidth=3*c,i.stroke()})}return i.globalAlpha=1,Gt(o,{aniso:t})}function bs(l,t,e){let[s,o]=Nt(l,t),i=St(11),a=l/512;o.fillStyle="#b07c50",o.fillRect(0,0,l,t);let c=8,n=l/c,r=["#d6a473","#c99563","#deb07c","#cc9a66","#d3a06c","#c08c5c"];for(let f=0;f<c;f++){let u=f*n;o.fillStyle=i.pick(r),o.fillRect(u+1.5*a,0,n-3*a,t);let m=o.createLinearGradient(0,0,0,t);m.addColorStop(0,"rgba(60,30,10,0.18)"),m.addColorStop(.15,"rgba(255,230,190,0.06)"),m.addColorStop(.85,"rgba(255,230,190,0.04)"),m.addColorStop(1,"rgba(60,30,10,0.22)"),o.fillStyle=m,o.fillRect(u,0,n,t);for(let d=0;d<9;d++){let v=u+i.range(4,n-4)*1;o.globalAlpha=i.range(.12,.3),o.strokeStyle=i()<.5?"#6e4426":"#d9a875",o.lineWidth=i.range(.8,2)*a,o.beginPath();for(let g=0;g<=t;g+=8*a){let x=Math.sin(g*.03/a+d*1.7+f)*2.2*a;g===0?o.moveTo(v+x,g):o.lineTo(v+x,g)}o.stroke()}if(i()<.45){let d=u+i.range(8,n-8),v=i.range(.2,.8)*t;o.globalAlpha=.5,o.fillStyle="#5c381e",o.beginPath(),o.ellipse(d,v,3*a,7*a,0,0,D),o.fill()}o.globalAlpha=.8,o.fillStyle="#3a2a22";for(let d of[t*.12,t*.88])o.beginPath(),o.arc(u+n*.5,d,2.2*a,0,D),o.fill();o.globalAlpha=1}o.fillStyle="#4a2e1c";for(let f=0;f<=c;f++)o.fillRect(f*n-1.6*a,0,3.2*a,t);let h=o.createLinearGradient(0,0,0,t);return h.addColorStop(0,"rgba(40,20,8,0.35)"),h.addColorStop(.06,"rgba(40,20,8,0)"),h.addColorStop(.94,"rgba(40,20,8,0)"),h.addColorStop(1,"rgba(40,20,8,0.35)"),o.fillStyle=h,o.fillRect(0,0,l,t),Gt(s,{aniso:e})}function ws(l){let[t,e]=Nt(l,l),s=l/2,o=St(23),i=(n,r,h,f,u,m,d)=>{e.save(),e.translate(n,r),e.rotate(u),e.fillStyle=m,e.beginPath(),e.moveTo(0,-h*.5),e.quadraticCurveTo(f,-h*.1,0,h*.5),e.quadraticCurveTo(-f,-h*.1,0,-h*.5),e.fill(),d&&(e.strokeStyle=d,e.lineWidth=Math.max(.6,f*.08),e.beginPath(),e.moveTo(0,-h*.42),e.lineTo(0,h*.42),e.stroke()),e.restore()},a=(n,r,h,f)=>{for(let u=0;u<h;u++){let m=o()*D,d=Math.sqrt(o())*s*.4,v=n+Math.cos(m)*d,g=r+Math.sin(m)*d*.92,x=1-(g-(r-s*.4))/(s*.8);f(v,g,x,d/(s*.4))}},c=s/256;{let n=s*.5,r=s*.5;a(n,r,40,(f,u,m)=>{i(f,u,o.range(20,30)*c,o.range(7,10)*c,o()*D,m>.5?"#9fc56a":"#76a24e",null)});let h=["#ffd3e2","#ffc2d6","#ffe6ee","#f7a9c4","#ffdbe6"];a(n,r,120,(f,u,m)=>{let d=o.range(8,13)*c,v=o.pick(h),g=o()*D;e.fillStyle=v;for(let x=0;x<5;x++){let p=g+x/5*D;e.beginPath(),e.ellipse(f+Math.cos(p)*d*.55,u+Math.sin(p)*d*.55,d*.55,d*.38,p,0,D),e.fill()}e.fillStyle=m>.5?"#fff3c8":"#e88aa8",e.beginPath(),e.arc(f,u,d*.22,0,D),e.fill(),m<.4&&(e.globalAlpha=.25,e.fillStyle="#a0507a",e.beginPath(),e.arc(f,u,d*.9,0,D),e.fill(),e.globalAlpha=1)})}{let n=s*1.5,r=s*.5,h=["#4f8f3a","#5fa040","#3f7a32","#6db24a","#477f35","#7cbc54"];a(n,r,190,(f,u,m)=>{let d=m>.65&&o()<.6?"#8ccc5e":o.pick(h);i(f,u,o.range(22,34)*c,o.range(8,12)*c,o()*D,d,"rgba(30,60,20,0.45)")})}{let n=s*.5,r=s*1.5,h=["#f2b233","#f7c440","#e8932c","#f0a030","#d9702a","#c8512a","#ffd65a"];a(n,r,170,(f,u,m)=>{let d=m>.6&&o()<.5?"#ffd86a":o.pick(h);i(f,u,o.range(22,34)*c,o.range(9,13)*c,o()*D,d,"rgba(120,50,10,0.4)")})}{let n=s*1.5,r=s*1.5;a(n,r,70,(h,f,u)=>{let m=o.range(12,26)*c,d=e.createRadialGradient(h-m*.3,f-m*.4,m*.1,h,f,m);d.addColorStop(0,u>.4?"#ffffff":"#eef2ff"),d.addColorStop(1,u>.4?"#d8e2f6":"#b8c4e8"),e.fillStyle=d,e.beginPath(),e.arc(h,f,m,0,D),e.fill()})}return Gt(t,{repeat:!1})}function ks(l=128){let[t,e]=Nt(l,l),s=l/2,o=e.createRadialGradient(s,s,0,s,s,s);return o.addColorStop(0,"rgba(255,255,255,1)"),o.addColorStop(.18,"rgba(255,255,255,0.55)"),o.addColorStop(.45,"rgba(255,255,255,0.14)"),o.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=o,e.fillRect(0,0,l,l),Gt(t,{srgb:!1,repeat:!1})}function Ms(l=128){let[t,e]=Nt(l,l),s=l/2,o=St(5);for(let i=0;i<22;i++){let a=o()*D,c=o()*l*.18,n=l*o.range(.12,.3),r=s+Math.cos(a)*c,h=s+Math.sin(a)*c,f=e.createRadialGradient(r,h,0,r,h,n);f.addColorStop(0,"rgba(10,6,20,0.55)"),f.addColorStop(1,"rgba(10,6,20,0)"),e.fillStyle=f,e.fillRect(0,0,l,l)}return Gt(t,{srgb:!1,repeat:!1})}function Ts(l=1024,t=512){let[e,s]=Nt(l,t);s.fillStyle="#000",s.fillRect(0,0,l,t);let o=St(99);for(let i=0;i<900;i++){let a=o()*l,c=o()*t,n=Math.pow(o(),3),r=.5+n*1.6;s.fillStyle=`rgb(${80+n*175|0},${o()*255|0},0)`,s.beginPath(),s.arc(a,c,r,0,D),s.fill()}return Gt(e,{srgb:!1})}function Es(l=256){let[t,e]=Nt(l,l),s=St(41),o=l/2;for(let i=0;i<46;i++){let a=s()*D,c=Math.pow(s(),.8)*l*.28,n=o+Math.cos(a)*c*1.3,r=o+Math.sin(a)*c*.55+l*.04,h=l*s.range(.08,.2),f=e.createRadialGradient(n,r-h*.3,0,n,r,h),m=Math.max(0,Math.min(1,1-(r-o*.6)/(l*.5)))*255|0;f.addColorStop(0,`rgba(${m},${m},${m},0.5)`),f.addColorStop(1,`rgba(${m},${m},${m},0)`),e.fillStyle=f,e.fillRect(0,0,l,l)}return Gt(t,{srgb:!1,repeat:!1})}function Ss(l=256){let[t,e]=Nt(l,l),s=e.createImageData(l,l),o=St(3),i=[8,16,32,64],a=i.map(n=>{let r=new Float32Array(n*n);for(let h=0;h<r.length;h++)r[h]=o();return r}),c=(n,r,h,f)=>{let u=h*r,m=f*r,d=Math.floor(u),v=Math.floor(m),g=u-d,x=m-v,p=g*g*(3-2*g),y=x*x*(3-2*x),w=(F,N)=>n[(N%r+r)%r*r+(F%r+r)%r],T=w(d,v)+(w(d+1,v)-w(d,v))*p,P=w(d,v+1)+(w(d+1,v+1)-w(d,v+1))*p;return T+(P-T)*y};for(let n=0;n<l;n++)for(let r=0;r<l;r++){let h=r/l,f=n/l,u=0,m=.55,d=0;for(let x=0;x<i.length;x++)u+=c(a[x],i[x],h,f)*m,d+=m,m*=.5;u/=d;let v=c(a[1],i[1],h+.37,f+.21),g=(n*l+r)*4;s.data[g]=u*255,s.data[g+1]=v*255,s.data[g+2]=0,s.data[g+3]=255}return e.putImageData(s,0,0),Gt(t,{srgb:!1})}function zs(l=128){let[t,e]=Nt(l,l),s=l/2,o=s/2;e.fillStyle="#ffd0e0",e.beginPath(),e.ellipse(o,o,s*.32,s*.2,.4,0,D),e.fill(),e.fillStyle="#ffeef4",e.beginPath(),e.ellipse(o-s*.06,o-s*.03,s*.16,s*.08,.4,0,D),e.fill(),e.save(),e.translate(s+o,o),e.rotate(.6),e.fillStyle="#f0a43a",e.beginPath(),e.moveTo(0,-s*.36),e.quadraticCurveTo(s*.22,0,0,s*.36),e.quadraticCurveTo(-s*.22,0,0,-s*.36),e.fill(),e.strokeStyle="rgba(120,50,10,0.6)",e.lineWidth=1.2,e.beginPath(),e.moveTo(0,-s*.3),e.lineTo(0,s*.3),e.stroke(),e.restore();let i=e.createRadialGradient(o,s+o,0,o,s+o,s*.3);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.5,"rgba(240,246,255,0.8)"),i.addColorStop(1,"rgba(230,240,255,0)"),e.fillStyle=i,e.fillRect(0,s,s,s),i=e.createRadialGradient(s+o,s+o,0,s+o,s+o,s*.48),i.addColorStop(0,"rgba(255,255,230,1)"),i.addColorStop(.15,"rgba(255,240,160,0.9)"),i.addColorStop(.45,"rgba(255,200,90,0.22)"),i.addColorStop(1,"rgba(255,180,60,0)"),e.fillStyle=i,e.fillRect(s,s,s,s),Gt(t,{repeat:!1})}function _s(l=128,t=256){let[e,s]=Nt(l,t),o=St(17);for(let c=0;c<26;c++){let n=o()*l,r=o.range(3,14),h=s.createLinearGradient(n-r,0,n+r,0),f=o.range(.15,.5);h.addColorStop(0,"rgba(255,255,255,0)"),h.addColorStop(.5,`rgba(255,255,255,${f})`),h.addColorStop(1,"rgba(255,255,255,0)"),s.fillStyle=h,s.fillRect(n-r,0,r*2,t)}s.globalCompositeOperation="destination-in";let i=s.createLinearGradient(0,0,0,t);i.addColorStop(0,"rgba(0,0,0,0)"),i.addColorStop(.25,"rgba(0,0,0,1)"),i.addColorStop(.7,"rgba(0,0,0,0.6)"),i.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=i,s.fillRect(0,0,l,t);let a=s.createLinearGradient(0,0,l,0);return a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(.2,"rgba(0,0,0,1)"),a.addColorStop(.8,"rgba(0,0,0,1)"),a.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=a,s.fillRect(0,0,l,t),s.globalCompositeOperation="source-over",Gt(e,{srgb:!1,repeat:!1})}function Rs(l,t){let[e,s]=Nt(l,l),o=St(31),i=l/256;s.fillStyle="#8f8496",s.fillRect(0,0,l,l);let a=["#a093a6","#7b7088","#9a8c94","#b0a2a8","#857a92","#6f6680"];for(let c=0;c<160;c++){let n=o()*l,r=o()*l,h=o.range(6,40)*i,f=h*o.range(.2,.6);s.globalAlpha=o.range(.2,.5),s.fillStyle=o.pick(a),oe(l,l,n,r,h,(u,m)=>{s.beginPath(),s.ellipse(u,m,h,f,0,0,D),s.fill()})}s.globalAlpha=.22,s.strokeStyle="#4e4660";for(let c=0;c<14;c++){let n=o()*l;s.lineWidth=o.range(1,3)*i,s.beginPath();for(let r=0;r<=l;r+=8*i){let h=n+Math.sin(r*.05/i+c)*3*i;r===0?s.moveTo(r,h):s.lineTo(r,h)}s.stroke()}return s.globalAlpha=1,Gt(e,{aniso:t})}import*as At from"three";import*as bt from"three";var yt=class{constructor(){this.p=[],this.n=[],this.c=[],this.uv=[],this.sw=[],this.idx=[],this.hasSway=!1,this.sway=[0,0,0,0]}get count(){return this.p.length/3}setSway(t,e,s,o){this.sway[0]=t,this.sway[1]=e,this.sway[2]=s,this.sway[3]=o,o>0&&(this.hasSway=!0)}vert(t,e,s,o,i,a,c,n,r,h,f=0,u=0){return this.p.push(t,e,s),this.n.push(o,i,a),this.c.push(c,n,r,h),this.uv.push(f,u),this.sw.push(this.sway[0],this.sway[1],this.sway[2],this.sway[3]),this.count-1}tri(t,e,s){this.idx.push(t,e,s)}quad(t,e,s,o){this.idx.push(t,e,s,t,s,o)}tube(t,e,s,o,{uvScale:i=1,capEnd:a=!0,capStart:c=!1,sway:n=null}={}){let r=t.length,h=new bt.Vector3,f=new bt.Vector3,u=new bt.Vector3,m=new bt.Vector3,d=this.count,v=0;for(let p=0;p<r;p++){let y=t[Math.max(0,p-1)],w=t[Math.min(r-1,p+1)];h.subVectors(w,y).normalize(),p===0?(m.set(0,1,0),Math.abs(h.dot(m))>.9&&m.set(1,0,0),f.crossVectors(h,m).normalize()):f.sub(m.copy(h).multiplyScalar(f.dot(h))).normalize(),u.crossVectors(h,f).normalize(),p>0&&(v+=t[p].distanceTo(t[p-1])/(Math.PI*2*Math.max(e[p],.05))*i),n&&n(p,p/(r-1));for(let T=0;T<=s;T++){let P=T/s*Math.PI*2,F=Math.cos(P),N=Math.sin(P),L=f.x*F+u.x*N,Z=f.y*F+u.y*N,G=f.z*F+u.z*N,K=e[p],M=o(p,p/(r-1),P,L,Z,G);this.vert(t[p].x+L*K,t[p].y+Z*K,t[p].z+G*K,L,Z,G,M[0],M[1],M[2],M[3],T/s,v)}}let g=s+1;for(let p=0;p<r-1;p++)for(let y=0;y<s;y++){let w=d+p*g+y,T=w+g;this.quad(w,T,T+1,w+1)}let x=(p,y)=>{let w=t[p],T=new bt.Vector3().subVectors(t[y?1:r-1],t[y?0:r-2]).normalize();y&&T.negate();let P=o(p,y?0:1,0,T.x,T.y,T.z),F=this.vert(w.x,w.y,w.z,T.x,T.y,T.z,P[0],P[1],P[2],P[3],.5,v),N=d+p*g;for(let L=0;L<s;L++)y?this.tri(F,N+L+1,N+L):this.tri(F,N+L,N+L+1)};a&&x(r-1,!1),c&&x(0,!0)}box(t,e,s,o,i){let a=[[e,s,o],[e.clone().negate(),s,o.clone().negate()],[o,s,e.clone().negate()],[o.clone().negate(),s,e],[s,o,e],[s.clone().negate(),o.clone().negate(),e]];for(let[c,n,r]of a){let h=c.clone().normalize(),f=i(h),u=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([v,g])=>{let x=t.clone().add(c).addScaledVector(r,v).addScaledVector(n,g);return this.vert(x.x,x.y,x.z,h.x,h.y,h.z,f[0],f[1],f[2],f[3],(v+1)/2,(g+1)/2)}),m=new bt.Vector3().subVectors(this.at(u[1]),this.at(u[0])),d=new bt.Vector3().subVectors(this.at(u[2]),this.at(u[0]));m.cross(d).dot(h)>=0?this.quad(u[0],u[1],u[2],u[3]):this.quad(u[0],u[3],u[2],u[1])}}fixWinding(){let t=this.p,e=this.n,s=this.idx;for(let o=0;o<s.length;o+=3){let i=s[o]*3,a=s[o+1]*3,c=s[o+2]*3,n=t[a]-t[i],r=t[a+1]-t[i+1],h=t[a+2]-t[i+2],f=t[c]-t[i],u=t[c+1]-t[i+1],m=t[c+2]-t[i+2],d=r*m-h*u,v=h*f-n*m,g=n*u-r*f;if(d*e[i]+v*e[i+1]+g*e[i+2]<0){let x=s[o+1];s[o+1]=s[o+2],s[o+2]=x}}return this}at(t){return new bt.Vector3(this.p[t*3],this.p[t*3+1],this.p[t*3+2])}build(){let t=new bt.BufferGeometry;return t.setAttribute("position",new bt.Float32BufferAttribute(this.p,3)),t.setAttribute("normal",new bt.Float32BufferAttribute(this.n,3)),t.setAttribute("color",new bt.Float32BufferAttribute(this.c,4)),t.setAttribute("uv",new bt.Float32BufferAttribute(this.uv,2)),this.hasSway&&t.setAttribute("aSway",new bt.Float32BufferAttribute(this.sw,4)),t.setIndex(this.count>65535?new bt.Uint32BufferAttribute(this.idx,1):new bt.Uint16BufferAttribute(this.idx,1)),t.computeBoundingSphere(),t.computeBoundingBox(),t}};var pe=7.658461538461538*Math.PI*2;function wt(l){let t=Math.max(l,-2);return 3.05+.95*(1-Math.min(t,52)/52)+1.9*Math.exp(-Math.max(t,0)/2.3)}var le=[{th:9.35,out:3.4,w:.5,leaves:"blossom"},{th:15.5,out:4.6,w:.56,leaves:"green"},{th:21.3,out:6.2,w:.62,leaves:"green",nest:!0},{th:33,out:4.8,w:.54,leaves:"gold"},{th:39.4,out:3.8,w:.48,leaves:"snow"}],ni=l=>Math.abs(l)>=1?0:.5+.5*Math.cos(Math.PI*l);function jt(l){return 50.4-l/(Math.PI*2)*6.5}function je(l){let t=0;for(let e of le)t+=e.out*ni((l-e.th)/e.w);return t}function Ze(l){return wt(jt(l))+.98+je(l)}var te=[{id:"bahar-1",season:"spring",from:0,to:6,title:"\xC7i\xE7ek Tac\u0131",kicker:"Bahar \xB7 I"},{id:"bahar-2",season:"spring",from:6,to:12,title:"Pembe R\xFCzg\xE2r",kicker:"Bahar \xB7 II"},{id:"yaz-1",season:"summer",from:12,to:18,title:"Z\xFCmr\xFCt G\xF6vde",kicker:"Yaz \xB7 I"},{id:"yaz-2",season:"summer",from:18,to:24,title:"Ku\u015F Yuvas\u0131",kicker:"Yaz \xB7 II"},{id:"guz-1",season:"autumn",from:24,to:30,title:"Alt\u0131n Yapraklar",kicker:"G\xFCz \xB7 I"},{id:"guz-2",season:"autumn",from:30,to:36,title:"F\u0131rt\u0131na",kicker:"G\xFCz \xB7 II"},{id:"kis-1",season:"winter",from:36,to:42,title:"K\u0131ra\u011F\u0131",kicker:"K\u0131\u015F \xB7 I"},{id:"kis-2",season:"winter",from:42,to:pe,title:"K\xF6k Kap\u0131s\u0131",kicker:"K\u0131\u015F \xB7 II",finale:!0}];function ke(l,t=[0,0,0,0]){let e=(a,c,n)=>{let r=Math.min(1,Math.max(0,(n-a)/(c-a)));return r*r*(3-2*r)},s=e(37,41,l),o=e(25,29,l)*(1-s),i=e(12.5,16.5,l)*(1-s-o);return t[0]=s,t[1]=o,t[2]=i,t[3]=Math.max(0,1-s-o-i),t}var Me=.2,Te=class{constructor(){let t=[],e=0,s=0,o=0,i=0,a=.002;for(let r=0;r<=pe+1e-6;r+=a){let h=Ze(r),f=Math.cos(r)*h,u=Math.sin(r)*h,m=jt(r);t.length&&(e+=Math.hypot(f-s,m-o,u-i)),t.push(r,e),s=f,o=m,i=u}this.length=e;let c=Math.floor(e/Me)+1;this.n=c,this.TH=new Float32Array(c),this.X=new Float32Array(c),this.Y=new Float32Array(c),this.Z=new Float32Array(c),this.R=new Float32Array(c);let n=0;for(let r=0;r<c;r++){let h=r*Me;for(;n<t.length/2-2&&t[(n+1)*2+1]<h;)n++;let f=t[n*2+1],u=t[(n+1)*2+1],m=u>f?(h-f)/(u-f):0,d=t[n*2]+(t[(n+1)*2]-t[n*2])*lt(m,0,1),v=Ze(d);this.TH[r]=d,this.R[r]=v,this.X[r]=Math.cos(d)*v,this.Z[r]=Math.sin(d)*v,this.Y[r]=jt(d)}this.TX=new Float32Array(c),this.TY=new Float32Array(c),this.TZ=new Float32Array(c),this.SX=new Float32Array(c),this.SZ=new Float32Array(c);for(let r=0;r<c;r++){let h=Math.max(0,r-1),f=Math.min(c-1,r+1),u=this.X[f]-this.X[h],m=this.Y[f]-this.Y[h],d=this.Z[f]-this.Z[h],v=Math.hypot(u,m,d)||1;u/=v,m/=v,d/=v,this.TX[r]=u,this.TY[r]=m,this.TZ[r]=d;let g=-d,x=u,p=Math.hypot(g,x)||1;g/=p,x/=p,g*this.X[r]+x*this.Z[r]<0&&(g=-g,x=-x),this.SX[r]=g,this.SZ[r]=x}}sample(t,e){let s=lt(t/Me,0,this.n-1.0001),o=Math.floor(s),i=s-o,a=c=>c[o]+(c[o+1]-c[o])*i;return e.x=a(this.X),e.y=a(this.Y),e.z=a(this.Z),e.tx=a(this.TX),e.ty=a(this.TY),e.tz=a(this.TZ),e.sx=a(this.SX),e.sz=a(this.SZ),e.th=a(this.TH),e.r=a(this.R),e}sAtTheta(t){let e=0,s=this.n-1;for(;s-e>1;){let i=e+s>>1;this.TH[i]<t?e=i:s=i}let o=(t-this.TH[e])/Math.max(1e-6,this.TH[s]-this.TH[e]);return(e+lt(o,0,1))*Me}offTrunk(t){return this.R[t]-wt(this.Y[t])}};function Hs(l){let t=new yt,e=l.n,s=new Float32Array(e);for(let d=0;d<e;d++){let v=l.offTrunk(d);s[d]=.95+.2*(1-_t(1.3,2.2,v))}let o=1.9/2,i=1/2.8;for(let d=0;d<e;d++){let v=l.X[d],g=l.Y[d],x=l.Z[d],p=l.SX[d],y=l.SZ[d],w=d*.2,T=v-p*s[d],P=x-y*s[d],F=v+p*o,N=x+y*o,L=l.offTrunk(d),Z=1-_t(1.3,2.2,L),G=.62+.38*(1-Z);t.vert(T,g-.02,P,0,1,0,1,1,1,G,w*i,0),t.vert(v-p*.3,g,x-y*.3,0,1,0,1,1,1,.92+.08*(1-Z),w*i,.35),t.vert(v+p*.3,g,x+y*.3,0,1,0,1,1,1,1,w*i,.65),t.vert(F,g-.02,N,p*.2,.98,y*.2,1,1,1,1,w*i,1),t.vert(F,g-.02,N,p,0,y,.72,.68,.64,.9,w*i,0),t.vert(F,g-.34,N,p,0,y,.72,.68,.64,.7,w*i,.12),t.vert(F,g-.34,N,0,-1,0,.5,.46,.44,.55,w*i,0),t.vert(T,g-.34,P,0,-1,0,.5,.46,.44,.4,w*i,1),t.vert(T,g-.34,P,-p,0,-y,.72,.68,.64,.7,w*i,.12),t.vert(T,g-.02,P,-p,0,-y,.72,.68,.64,.9,w*i,0)}let a=10;for(let d=0;d<e-1;d++){let v=d*a,g=(d+1)*a,x=(p,y)=>t.quad(v+p,g+p,g+y,v+y);x(0,1),x(1,2),x(2,3),x(4,5),x(6,7),x(8,9)}t.fixWinding();let c=new yt,n=[],r=1.55,h=[],f=d=>()=>[.42*d,.27*d,.17*d,1];for(let d=.6;d<l.length-.4;d+=r){let v=Math.round(d/.2),x=l.offTrunk(v)>2?[1,-1]:[1];for(let p of x){let y=p>0?o-.1:s[v]-.1,w=l.X[v]+l.SX[v]*y*p,T=l.Z[v]+l.SZ[v]*y*p,P=l.Y[v],F=new At.Vector3(w,P-.05,T),N=new At.Vector3(w,P+.78,T);c.tube([F,N],[.06,.05],6,f(1),{capEnd:!0}),h.push({s:d,side:p,top:N.clone()})}}for(let d of[1,-1]){let v=h.filter(g=>g.side===d);for(let g=0;g<v.length-1;g++){let x=v[g],p=v[g+1];if(p.s-x.s>r*1.6)continue;let y=[];for(let w=0;w<=1.0001;w+=.25){let T=x.top.clone().lerp(p.top,w);T.y-=.03+Math.sin(w*Math.PI)*.14,y.push(T)}c.tube(y,y.map(()=>.028),4,()=>[.62,.5,.36,1],{capEnd:!1})}}for(let d=1.2;d<l.length-1;d+=2.6){let v=Math.round(d/.2);if(l.offTrunk(v)>1.6)continue;let g=l.Y[v],x=l.TH[v],p=new At.Vector3(l.X[v]+l.SX[v]*.55,g-.34+.02,l.Z[v]+l.SZ[v]*.55),y=wt(g-1.5)-.1,w=new At.Vector3(Math.cos(x)*y,g-1.55,Math.sin(x)*y);c.tube([p,w],[.075,.09],5,f(.85),{capEnd:!0,capStart:!0})}let u=new yt,m=7;for(let d of h){if(d.side<0||d.s<m)continue;let v=Math.round(d.s/.2);if(l.offTrunk(v)>1.6)continue;m=d.s+12.5;let g=l.SX[v],x=l.SZ[v],p=d.top.clone().add(new At.Vector3(g*.32,.05,x*.32));c.tube([d.top.clone().add(new At.Vector3(0,-.02,0)),p],[.022,.022],4,f(.6),{capEnd:!1});let y=p.clone().add(new At.Vector3(0,-.28,0)),w=new At.Vector3(.09,0,0),T=new At.Vector3(0,.13,0),P=new At.Vector3(0,0,.09);u.box(y,w,T,P,F=>[1,.82+.18*F.y,.7,1]),c.box(y.clone().add(new At.Vector3(0,.16,0)),w.clone().multiplyScalar(1.35),new At.Vector3(0,.035,0),P.clone().multiplyScalar(1.35),()=>[.3,.2,.14,1]),c.box(y.clone().add(new At.Vector3(0,-.15,0)),w.clone().multiplyScalar(1.15),new At.Vector3(0,.02,0),P.clone().multiplyScalar(1.15),()=>[.3,.2,.14,1]),n.push(y)}return{walkway:t.build(),rail:c.build(),glass:u.build(),lanterns:n}}import*as kt from"three";var As=[4.85,5.72,.48,1.3];function It(l,t){let e=wt(t),s=1+.022*Math.sin(7*l+.13*t)+.014*Math.sin(12*l-.31*t+1.3),o=Math.max(t,0),i=0;for(let c of As){let n=Math.atan2(Math.sin(l-c),Math.cos(l-c));i+=Math.exp(-(n*n)/.045)*1.55}i*=Math.exp(-o/1.9);let a=Math.pow(Math.max(0,Math.cos(5*(l-.45))),2)*.75*_t(49.5,53.5,t);return e*s+i+a}var ct=(l,t,e)=>new kt.Vector3(l,t,e),ft=(l,t,e)=>ct(Math.cos(t)*l,e,Math.sin(t)*l);function ri(l,t=4){return new kt.CatmullRomCurve3(l,!1,"centripetal").getPoints(Math.max(2,(l.length-1)*t))}function Ps(l,t){let e=St(1453),s=t,o=s.leafDensity,i=new yt,a=new yt,c=[],n=[],r=b=>(k,S)=>{let z=_t(.35,.08,b*(1-S*.85));return[O(1,.52,z),O(1,.38,z),O(1,.33,z),O(.85,1,S)]},h=(b,k,S,z,A,I,$=7)=>{let J=ri(b,4),Q=J.length,X=e()*10,rt=J.map((it,j)=>{let ut=j/(Q-1);return O(k,S,Math.pow(ut,.7))*(1+.1*Math.sin(j*1.9+X)*(1-ut))*(1+.35*Math.exp(-ut*14))});i.tube(J,rt,$,r(k),{uvScale:.6,sway:(it,j)=>i.setSway(z.x,z.y,z.z,O(A,I,Math.pow(j,1.6)))});for(let it=0;it<Q-1;it+=2){let j=Math.min(Q-1,it+2),ut=rt[it];if(ut<.1)break;c.push({a:J[it].clone(),b:J[j].clone(),r:(ut+rt[j])*.5*.92,anchor:z,wa:O(A,I,Math.pow(it/(Q-1),1.6)),wb:O(A,I,Math.pow(j/(Q-1),1.6))})}return i.setSway(0,0,0,0),J},f=(b,k,S,z,A=-1,I=1)=>{n.push({c:b.clone(),r:k,rx:k*1.15,ry:k*.78*I,rz:k*1.15,anchor:S,w:z,type:A})},u=[];for(let b=4.5;b<48.5;b+=e.range(1.55,2.3)){let S=(50.4-b)/6.5*D+Math.PI+e.range(-.55,.55),z=!1;for(let A of le){let I=Math.abs(jt(A.th)-b),$=Math.abs(Math.atan2(Math.sin(S-A.th),Math.cos(S-A.th)));I<4.5&&$<A.w+.7&&(z=!0)}if(!z&&(u.push({y:b,az:S}),e()<.35)){let A=S+e.range(-.9,.9)+(e()<.5?.9:-.9);u.push({y:b+e.range(-.4,.4),az:A})}}for(let b of u){let{y:k,az:S}=b,z=wt(k),A=k<13,I=(A?e.range(4,6):e.range(4.8,7.4))*(k>40?1.12:1),$=e.range(-.22,.22),J=e.range(.3,.55),Q=e.range(-.35,.35),X=[ft(z*.55,S,k-.2),ft(z+.7,S+$*.15,k+.15),ft(z+I*.42,S+$*.5,k+I*J*.3+Q),ft(z+I*.75,S+$*.8,k+I*J*.7-Q*.5),ft(z+I,S+$*1.2,k+I*J)],rt=X[4],it=I/8,j=O(.42,.7,(I-4.5)/5),ut=h(X,j,.07,rt,0,it),ne=A?2:e.range(1,3.6)|0;for(let Pt=0;Pt<ne;Pt++){let Et=e.range(.45,.85),Rt=ut[Math.round(Et*(ut.length-1))],Ft=ct(Math.cos(S+$),0,Math.sin(S+$)),dt=ct(-Ft.z,0,Ft.x).multiplyScalar(e.sign()*e.range(.6,1)),$t=e.range(1.8,3.4),Vt=Rt.clone().addScaledVector(Ft,$t*.55).addScaledVector(dt,$t*.6).add(ct(0,$t*e.range(.25,.6),0)),qt=Rt.clone().lerp(Vt,.5).add(ct(0,.15,0)),Ot=it*Math.pow(Et,1.6);h([Rt,qt,Vt],O(j,.07,Et)*.55,.04,rt,Ot,Ot+.25,5),A?e()<.7&&f(Vt.clone().add(ct(0,.12,0)),e.range(.35,.5),rt,Ot+.25,3,.7):f(Vt,e.range(1.05,1.6),rt,Ot+.25)}if(!A)f(rt,e.range(1.5,2.2),rt,it),f(ut[Math.round(ut.length*.72)],e.range(1.2,1.8),rt,it*.6);else for(let Pt of[.4,.62,.84]){let Et=ut[Math.round(Pt*(ut.length-1))];f(Et.clone().add(ct(0,.22,0)),e.range(.38,.6),rt,it*Math.pow(Pt,1.6),3,.6)}}let m=6;for(let b=0;b<m;b++){let k=.45+b/m*D+e.range(-.18,.18),S=e.range(12.5,16),z=e.range(7,10),A=[ft(.8,k,53-3.5),ft(2.6,k+.05,53+.4),ft(5.4,k+.12,53+z*.45),ft(S*.75,k+.2,53+z*.85),ft(S,k+.26,53+z*.8)],I=A[4],$=h(A,1.3,.14,I,0,.9,9);for(let J=0;J<5;J++){let Q=.32+J*.15,X=$[Math.round(Q*($.length-1))],rt=k+e.range(-1.1,1.1),it=e.range(3.8,6.5),j=X.clone().add(ct(Math.cos(rt)*it,e.range(.6,3.4),Math.sin(rt)*it)),ut=X.clone().lerp(j,.5).add(ct(0,.6,0));h([X,ut,j],O(1.3,.14,Q)*.5,.06,I,.9*Q,1.1,6),f(j,e.range(2.3,3.1),I,1.1),f(ut.clone().add(ct(0,1,0)),e.range(1.8,2.4),I,.9),e()<.6&&f(j.clone().add(ct(0,-1.6,0)),e.range(1.4,1.9),I,1.1,-1,1.25)}f(I.clone().add(ct(0,.6,0)),e.range(2.6,3.3),I,.9),f($[Math.round($.length*.6)].clone().add(ct(0,1.5,0)),e.range(2.4,3),I,.6)}for(let b=0;b<14;b++){let k=e()*D,S=e.range(0,9);f(ft(S,k,53+e.range(8.5,12)-S*.25),e.range(2.6,3.4),ft(S,k,62),.6)}for(let b=0;b<6;b++){let k=e.range(-.8,1.6),S=wt(50.4)+e.range(1.2,4.5);f(ft(S,k,50.4+e.range(3.6,5.5)),e.range(1.5,2.1),ft(S,k,50.4+5),.5)}let d={},v=[];for(let b of le){let k=Math.acos(lt(2/b.out-1,-1,1))/Math.PI*b.w,S=b.th-k,z=b.th+k,A=l.sAtTheta(S),I=l.sAtTheta(z);l.sample(l.sAtTheta(b.th),d);let $=ct(d.x,d.y,d.z),J=ct(d.sx,0,d.sz),Q=[];for(let dt=A-1.5;dt<=I+1.5;dt+=1.7){l.sample(dt,d);let $t=Math.hypot(d.x,d.z)-wt(d.y);if($t<1.5||$t>3.6)continue;let Vt=ct(d.x,d.y-.34+.02,d.z),qt=wt(d.y-2.2)-.15,Ot=Math.atan2(d.z,d.x),Be=ft(qt,Ot,d.y-2.4);a.tube([Vt,Be],[.08,.1],5,()=>[.42,.27,.17,.95],{capEnd:!0,capStart:!0}),Q.push(dt)}let X={blossom:0,green:1,gold:2,snow:3}[b.leaves],rt=jt(b.th)+6.5*.5,it=wt(rt),j=wt(jt(b.th))+b.out+1.6,ut=b.th+e.range(-.12,.12),ne=[ft(it*.55,ut,rt-.2),ft(it+.9,ut,rt+.1),ft(O(it,j,.55),ut+.06,rt+.75),ft(j,ut+.12,rt+1.35)],Pt=ne[3],Et=X===3?.4:.75,Rt=h(ne,.5,.08,Pt,0,Et,7);for(let dt=0;dt<4;dt++){let $t=O(A,I,.18+dt*.21);if(l.sample($t,d),Math.hypot(d.x,d.z)-wt(d.y)<3)continue;let qt=Rt[Math.round(O(.45,.9,dt/3)*(Rt.length-1))];for(let Ot of[-1,1]){let Be=ct(d.x+d.sx*.85*Ot,d.y+.72,d.z+d.sz*.85*Ot);a.tube([Be,qt.clone().add(ct(0,-.15,0))],[.026,.026],4,()=>[.62,.5,.36,1],{capEnd:!1})}}let Ft=b.nest?3:2;for(let dt=0;dt<Ft;dt++){let $t=O(A,I,Ft===2?.3+dt*.4:.2+dt*.3);l.sample($t,d);let Vt=Rt[Math.round(O(.55,.95,dt/Math.max(1,Ft-1))*(Rt.length-1))],qt=ct(d.x,Math.max(d.y+3.9,Vt.y+.3),d.z).addScaledVector(ct(d.sx,0,d.sz),e.range(.2,.9)),Ot=Vt.clone().lerp(qt,.5).add(ct(0,.45,0));h([Vt,Ot,qt],.16,.05,Pt,Et*.7,Et,5),X===3?f(qt.clone().add(ct(0,.15,0)),.6,Pt,Et,3,.7):f(qt.clone().add(ct(0,.35,0)),e.range(1.55,1.95),Pt,Et,X)}X!==3&&f(Pt.clone().add(ct(0,.5,0)),e.range(1.6,2.1),Pt,Et,X),b.nest&&v.push({c:$.clone(),out:J})}for(let b of As){let k=wt(0);for(let S of[-.12,.1]){let z=e.range(6.5,9.5),A=b+S,I=[ft(k*.7,A,1.2),ft(k+1.2,A+S*.6,.35),ft(k+z*.35,A+S*1.3+e.range(-.08,.08),.05),ft(k+z*.6,A+S*1.8+e.range(-.1,.1),-.1),ft(k+z*.82,A+S*2.2,-.05),ft(k+z,A+S*2.5,-.5)];h(I,e.range(.6,.8),.18,I[5],0,0,8)}}i.fixWinding();let g=new yt,x=s.id>=1?72:52,p=-4,y=53+1.6,w=.42,T=Math.ceil((y-p)/w)+1,P=.01,F=new kt.Vector3,N=new kt.Vector3,L=new kt.Vector3,Z=u.map(b=>({y:b.y,az:b.az}));for(let b=0;b<T;b++){let k=Math.min(y,p+b*w);for(let S=0;S<=x;S++){let z=S/x*D,A=It(z,k),I=(It(z+P,k)-It(z-P,k))/(2*P),$=(It(z,k+P)-It(z,k-P))/(2*P),J=Math.cos(z),Q=Math.sin(z);N.set(I*J-A*Q,0,I*Q+A*J),L.set($*J,1,$*Q),F.crossVectors(L,N).normalize();let X=1,rt=(z%D+D)%D;for(let Et=rt;;Et+=D){let Rt=jt(Et);if(Rt<-1)break;let Ft=1-_t(.5,1.3,je(Et));if(Ft<=0)continue;let dt=Rt-k;dt>0&&dt<4?X*=1-Ft*(.42*Math.exp(-((dt-.5)**2)/.35)+.18*Math.exp(-((dt-1.6)**2)/1.6)):dt<=0&&dt>-.6&&(X*=1-Ft*.22*Math.exp(-(dt*dt)/.03))}X*=.5+.5*_t(-.6,2.2,k);for(let Et of Z){let Rt=k-Et.y;if(Math.abs(Rt)>1.6)continue;let Ft=Math.atan2(Math.sin(z-Et.az),Math.cos(z-Et.az));X*=1-.3*Math.exp(-(Ft*Ft)/.05-Rt*Rt/.6)*(Rt<0?1.2:.6)}let it=1-_t(-.5,2.5,k),j=_t(44,52,k),ut=O(1,.72,it)*O(1,1.02,j),ne=O(1,.66,it)*O(1,.99,j),Pt=O(1,.62,it)*O(1,.96,j);g.vert(J*A,k,Q*A,F.x,F.y,F.z,ut,ne,Pt,lt(X,.2,1),S/x*4,k/5.6)}}let G=x+1;for(let b=0;b<T-1;b++)for(let k=0;k<x;k++){let S=b*G+k;g.quad(S,S+1,S+G+1,S+G)}let K=g.vert(0,y+.3,0,0,1,0,.9,.88,.85,.7,0,0);for(let b=0;b<x;b++)g.tri(K,(T-1)*G+b+1,(T-1)*G+b);g.fixWinding();for(let b=n.length-1;b>=0;b--){let k=n[b];for(let S=0;S<l.n;S+=2){let z=k.c.y-l.Y[S];if(z<-6||z>8)continue;let I=Math.hypot(k.c.x-l.X[S],k.c.z-l.Z[S])-1.2;if(I>k.rx||z-k.ry>2.2||z+k.ry<-.6)continue;let $=z>.8?z-2.2:-.6-z,Q=Math.max(I,$)/k.rx;if(Q<.45){k.r=0;break}k.r*=Q,k.rx*=Q,k.ry*=Q,k.rz*=Q}k.r<.3&&n.splice(b,1)}let M=[],E=[],_=[],R=[],C=[],W=[0,0,0,0],V=[];for(let b of n){ke(b.c.y,W);let k=b.type,S=Math.max(5,Math.round(o*lt(b.r*b.r*(k===3?7:5.2),6,30)));for(let z=0;z<S;z++){let A=k;if(A<0){let ut=e();for(A=0;A<3&&ut>W[A];)ut-=W[A],A++;A===3&&(A=W[2]>.05?2:1)}let I=e()*D,$=Math.acos(e.range(-.85,1)),J=Math.pow(e(),.35),Q=Math.sin($)*Math.cos(I)*b.rx*J*.82,X=Math.cos($)*b.ry*J*.82,rt=Math.sin($)*Math.sin(I)*b.rz*J*.82;M.push(b.c.x+Q,b.c.y+X,b.c.z+rt),E.push(b.c.x,b.c.y,b.c.z,b.r);let it=b.r*(A===3?e.range(.9,1.25):e.range(.85,1.2));_.push(it,e()*D,A,e());let j=e.range(.86,1.1);A===0?R.push(j*e.range(.97,1.04),j,j*e.range(.95,1.05)):A===1?R.push(j*e.range(.9,1.05),j,j*e.range(.85,1)):A===2?R.push(j*e.range(.98,1.06),j*e.range(.85,1.05),j*e.range(.8,1)):R.push(j,j,j),C.push(b.anchor.x,b.anchor.y,b.anchor.z,b.w)}V.push({c:b.c,rx:b.rx*.78,ry:b.ry*.78,rz:b.rz*.78,anchor:b.anchor,w:b.w,snow:k===3})}let B=new kt.InstancedBufferGeometry,q=new kt.PlaneGeometry(1,1);B.setIndex(q.index),B.setAttribute("position",q.getAttribute("position")),B.setAttribute("iPos",new kt.InstancedBufferAttribute(new Float32Array(M),3)),B.setAttribute("iCluster",new kt.InstancedBufferAttribute(new Float32Array(E),4)),B.setAttribute("iData",new kt.InstancedBufferAttribute(new Float32Array(_),4)),B.setAttribute("iTint",new kt.InstancedBufferAttribute(new Float32Array(R),3)),B.setAttribute("iSway",new kt.InstancedBufferAttribute(new Float32Array(C),4)),B.instanceCount=M.length/3,B.boundingSphere=new kt.Sphere(ct(0,30,0),60);let U=a;for(let b of v){for(let k=0;k<9;k++){let S=[],z=1.55+e.range(-.15,.25),A=b.c.y-.42+k*.07,I=e()*D;for(let $=0;$<=26;$++){let J=I+$/26*D*1.05,Q=e.range(-.08,.08);S.push(ct(b.c.x+Math.cos(J)*(z+Q),A+Math.sin(J*3+k)*.08,b.c.z+Math.sin(J)*(z+Q)))}U.tube(S,S.map(()=>e.range(.06,.12)),4,()=>{let $=e.range(.8,1.1);return[.86*$,.64*$,.42*$,.95]},{capEnd:!1})}for(let k=0;k<3;k++){let S=Math.atan2(b.out.z,b.out.x)+Math.PI*.5+(k-1)*.35,z=ct(b.c.x+Math.cos(S)*1.15,b.c.y-.1,b.c.z+Math.sin(S)*1.15),A=new kt.SphereGeometry(.2,12,8),I=A.getAttribute("position"),$=A.getAttribute("normal"),J=U.count;for(let X=0;X<I.count;X++){let rt=I.getY(X)*1.3,it=Math.sin(I.getX(X)*80)*Math.sin(I.getZ(X)*70)>.6?.75:1;U.vert(z.x+I.getX(X),z.y+rt,z.z+I.getZ(X),$.getX(X),$.getY(X),$.getZ(X),.62*it,.82*it,.92*it,1,0,0)}let Q=A.index.array;for(let X=0;X<Q.length;X+=3)U.tri(J+Q[X],J+Q[X+1],J+Q[X+2])}}return U.fixWinding(),{trunk:g.build(),branches:i.build(),nest:U.count?U.build():null,leaves:B,caps:c,ellipsoids:V}}import*as ce from"three";var Qt=19.5;function Zt(l,t){let e=Math.hypot(l,t),s=Math.atan2(t,l),o=Wt(s*3.1+11)*.22+Wt(e*.35+s*2)*.18,i=-.0016*e*e,a=-Math.pow(_t(Qt-3.2,Qt,e),2)*1.1;return i+o*_t(5,9,e)+a}var pt=(l,t,e)=>new ce.Vector3(l,t,e);function Fs(l){let t=St(77),e=new yt,s=new yt,o=new yt,i={spheres:[],caps:[]},a=120,c=34,n=2.6;for(let M=0;M<=c;M++){let E=O(n,Qt,Math.pow(M/c,.9));for(let _=0;_<=a;_++){let R=_/a*D,C=Math.cos(R)*E,W=Math.sin(R)*E,V=Zt(C,W),B=.15,q=(Zt(C+B,W)-Zt(C-B,W))/(2*B),U=(Zt(C,W+B)-Zt(C,W-B))/(2*B),b=pt(-q,1,-U).normalize(),k=.93+Wt(R*9+E*.7)*.04,z=1-.45*(1-_t(0,2.6,E-It(R,0)));e.vert(C,V,W,b.x,b.y,b.z,k,k*1,k*1.04,z,C*.08,W*.08)}}let r=a+1;for(let M=0;M<c;M++)for(let E=0;E<a;E++){let _=M*r+E;e.quad(_,_+r,_+r+1,_+1)}e.fixWinding();let h=27,f=30,u=(M,E)=>{let _=Math.pow(1-M,1.25),R=1+.13*Wt(E*4.2+M*3)+.07*Wt(E*11+M*9);return(Qt+.3)*_*R*(M<.04?1+(.04-M)*2:1)};for(let M=0;M<=f;M++){let E=M/f,_=-.75-E*h+(E<.05?E*6:0);for(let R=0;R<=a;R++){let C=R/a*D,W=Math.max(.15,u(E,C)),V=.02,B=(u(Math.min(1,E+V),C)-u(Math.max(0,E-V),C))/(2*V*h),q=pt(Math.cos(C),-B,Math.sin(C)).normalize(),U=.5+.5*Math.sin(_*1.7+Wt(C*3)*2),b=O(.82,.62,E)*O(.9,1.05,U),k=O(.7,.58,E)*O(.9,1.04,U),S=O(.62,.68,E)*O(.92,1.03,U);s.vert(Math.cos(C)*W,_,Math.sin(C)*W,q.x,q.y,q.z,b,k,S,O(.85,.5,E),R/a*8,_*.12)}}for(let M=0;M<f;M++)for(let E=0;E<a;E++){let _=M*r+E;s.quad(_,_+1,_+r+1,_+r)}let m=s.count;for(let M=0;M<=3;M++){let E=M/3*Math.PI*.5;for(let _=0;_<=a;_++){let R=_/a*D,C=Qt,W=Math.cos(R)*C,V=Math.sin(R)*C,B=Zt(W*.999,V*.999),q=C+Math.sin(E)*.45,U=O(B,-.8,1-Math.cos(E)),b=pt(Math.cos(R)*Math.sin(E),Math.cos(E),Math.sin(R)*Math.sin(E)).normalize();s.vert(Math.cos(R)*q,U,Math.sin(R)*q,b.x,b.y,b.z,.95,.96,1,.95,0,0)}}for(let M=0;M<3;M++)for(let E=0;E<a;E++){let _=m+M*r+E;s.quad(_,_+1,_+r+1,_+r)}s.fixWinding();for(let M=0;M<16;M++){let E=t()*D,_=t.range(.2,.7),R=u(_,E)*.96,C=-.75-_*h,W=t.range(6,16),V=[],B=Math.cos(E)*R,q=Math.sin(E)*R;for(let U=0;U<=6;U++){let b=U/6;V.push(pt(B,C-b*W,q)),B+=Math.cos(E)*t.range(-.2,.6)+t.range(-.4,.4),q+=Math.sin(E)*t.range(-.2,.6)+t.range(-.4,.4)}s.tube(V,V.map((U,b)=>O(.42,.05,b/6)),5,()=>[.5,.38,.32,.8])}for(let M=0;M<70;M++){let E=t()*D,_=Qt+.15,R=t.range(.5,2.2),C=pt(Math.cos(E)*_,-.9,Math.sin(E)*_),W=C.clone().add(pt(0,-R,0));s.tube([C,W],[t.range(.08,.16),.01],5,()=>[.78,.9,1.05,1])}let d=(M,E,_=.65)=>{let R=new ce.IcosahedronGeometry(1,2),C=R.getAttribute("position"),W=o.count,V=t()*100;for(let q=0;q<C.count;q++){let U=pt(C.getX(q),C.getY(q),C.getZ(q)),b=1+.18*Wt(U.x*3+V)+.12*Wt(U.z*4+U.y*2+V);U.multiplyScalar(b),U.y*=_;let k=U.clone().normalize(),S=_t(.35,.7,k.y),z=U.multiplyScalar(E).add(M);o.vert(z.x,z.y,z.z,k.x,k.y,k.z,O(.58,.95,S),O(.55,.96,S),O(.62,1.02,S),O(.75,1,k.y*.5+.5),0,0)}let B=R.index?R.index.array:null;if(B)for(let q=0;q<B.length;q+=3)o.tri(W+B[q],W+B[q+1],W+B[q+2]);else for(let q=0;q<C.count;q+=3)o.tri(W+q,W+q+1,W+q+2);i.spheres.push({c:M.clone().add(pt(0,E*_*.1,0)),r:E*.85,sy:_})},v=(M,E)=>{o.tube([M.clone().add(pt(0,-.3,0)),M.clone().add(pt(0,E*.35,0))],[.16*E*.3,.1*E*.3],6,()=>[.4,.3,.24,.8]);for(let _=0;_<4;_++){let R=M.y+E*(.2+_*.2),C=E*(.42-_*.085),W=new ce.ConeGeometry(C,E*.36,9,1,!0),V=W.getAttribute("position"),B=o.count;for(let U=0;U<V.count;U++){let b=pt(V.getX(U),V.getY(U)+R+E*.18,V.getZ(U)).add(pt(M.x,0,M.z)),S=pt(V.getX(U),.55*C,V.getZ(U)).normalize(),z=V.getY(U)>0?.6:.15;o.vert(b.x,b.y,b.z,S.x,S.y,S.z,O(.16,.9,z),O(.32,.92,z),O(.24,.98,z),.9,0,0)}let q=W.index.array;for(let U=0;U<q.length;U+=3)o.tri(B+q[U],B+q[U+1],B+q[U+2])}i.caps.push({a:M.clone(),b:M.clone().add(pt(0,E,0)),r:E*.22})},g=(M,E,_)=>{let R=pt(Math.cos(_)*.32,0,Math.sin(_)*.32),C=pt(-Math.sin(_)*.22,0,Math.cos(_)*.22);o.box(M.clone().add(pt(0,E*.5-.2,0)),R,pt(0,E*.5,0),C,W=>W.y>.5?[.95,.96,1,1]:[.62,.6,.66,.9]),i.caps.push({a:M.clone(),b:M.clone().add(pt(0,E,0)),r:.3})},x=(M,E)=>{let _=Math.cos(M)*E,R=Math.sin(M)*E;return pt(_,Zt(_,R),R)},p=[[2.3,8.5,"rock",1.1],[3,9.6,"pine",2.6],[3.7,8.2,"stone",1.7],[4.6,9.5,"rock",.9],[1.5,9.9,"pine",3.1],[.6,11.5,"rock",1.6],[5.5,11,"pine",3.4],[6,13.5,"rock",1.3],[2.6,14.5,"pine",3.8],[4,15.5,"pine",2.9],[1,16,"stone",2],[5.1,16.4,"rock",2.2],[3.3,12.4,"stone",1.4]];for(let[M,E,_,R]of p){let C=x(M,E);_==="rock"?d(C,R):_==="pine"?v(C,R):g(C,R,M)}for(let M=0;M<16;M++){let E=t()*D,_=t.range(12,Qt-1.5);d(x(E,_),t.range(.35,.9))}let y=new yt;{let M=x(.2,13.2),E=40,_=y.vert(M.x,M.y+.03,M.z,0,1,0,.55,.72,.9,1,.5,.5);for(let R=0;R<=E;R++){let C=R/E*D,W=2.6+.4*Wt(C*3+2);y.vert(M.x+Math.cos(C)*W*1.3,M.y+.03,M.z+Math.sin(C)*W,0,1,0,.66,.82,.98,1,0,0)}for(let R=0;R<E;R++)y.tri(_,_+1+R,_+2+R);y.fixWinding()}o.fixWinding();let w=new yt,T=new yt,P=l,F=It(P,1.2),N=pt(Math.cos(P)*(F+.04),0,Math.sin(P)*(F+.04)),L=pt(Math.cos(P),0,Math.sin(P)),Z=pt(-Math.sin(P),0,Math.cos(P)),G=1.25,K=2.5;{let E=w.vert(N.x+L.x*.02,N.y+K*.45,N.z+L.z*.02,L.x,0,L.z,1,1,1,1,.5,.45),_=[];for(let R=0;R<=24;R++){let C=R/24,W,V;if(C<.25)W=-G,V=C/.25*(K-G);else if(C<.75){let B=Math.PI-(C-.25)/.5*Math.PI;W=Math.cos(B)*G,V=K-G+Math.sin(B)*G}else W=G,V=(1-(C-.75)/.25)*(K-G);_.push([W,V])}for(let[R,C]of _){let W=P+R/F,V=It(W,C)+.03;w.vert(Math.cos(W)*V,C,Math.sin(W)*V,L.x,0,L.z,1,1,1,1,R/(2*G)+.5,C/K)}for(let R=0;R<24;R++)w.tri(E,E+1+R,E+2+R);w.fixWinding();for(let R of[-1,1]){let C=[];for(let W=0;W<=8;W++){let V=W/8,B=Math.PI*(R<0?1-V*.55:V*.55),q=Math.cos(B)*(G+.18),U=V<.01?-.3:K-G+Math.sin(B)*(G+.2)*Math.min(1,V*3),b=P+q/F,k=It(b,Math.max(U,0))+.18;C.push(pt(Math.cos(b)*k,Math.max(U,-.3)+0,Math.sin(b)*k))}T.tube(C,C.map((W,V)=>O(.32,.14,V/8)),7,()=>[.55,.42,.34,.85])}T.fixWinding()}return{top:e.build(),rock:s.build(),props:o.build(),pond:y.build(),gate:w.build(),gateFrame:T.build(),gatePos:N.clone().add(pt(0,K*.45,0)),gateOut:L,gateSide:Z,occ:i}}import*as et from"three";var ze=(l,t,e)=>new et.Vector3(l,t,e);function Ds(l,t,e){let s=new et.Group,o=new et.Mesh(new et.SphereGeometry(500,32,16),null);o.frustumCulled=!1,o.renderOrder=10;let i=new et.ShaderMaterial({vertexShader:`
			varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${tt}
			${xt}
			uniform sampler2D uNoise;
			uniform vec3 uCloudCol, uCloudShade;
			varying vec3 vW;
			void main() {
				vec2 uv = vW.xz * 0.0042 + uTime * vec2(0.0016, 0.0009);
				float a = texture2D(uNoise, uv).r;
				float b = texture2D(uNoise, uv * 2.9 + vec2(0.31, 0.17) - uTime * vec2(0.0021, -0.0012)).r;
				float d = a * 0.62 + b * 0.38;
				// g\xFCne\u015Fe do\u011Fru kayd\u0131r\u0131lm\u0131\u015F \xF6rnekle sahte hacim \u0131\u015F\u0131\u011F\u0131: tepe g\xFCne\u015F taraf\u0131nda parlar
				float dl = texture2D(uNoise, uv + uSunDir.xz * 0.012).r * 0.62 + b * 0.38;
				float lit = clamp((d - dl) * 7.0 + 0.55, 0.0, 1.0);
				float dens = smoothstep(0.28, 0.72, d);
				vec3 c = mix(uCloudShade, uCloudCol, dens * (0.55 + 0.45 * lit));
				vec3 v = normalize(vW - cameraPosition);
				float sd = max(dot(v, uSunDir), 0.0);
				c += uFogSun * pow(sd, 6.0) * 0.45 * (0.4 + dens);
				float dist = length(vW.xz - cameraPosition.xz);
				c = mix(c, mix(uFogCol, uFogSun, pow(sd, 4.0)), smoothstep(160.0, 640.0, dist) * 0.92);
				gl_FragColor = finish(c, 1.0);
			}`,uniforms:{...l,uNoise:{value:t.cloudNoise}}}),a=new et.Mesh(new et.PlaneGeometry(1800,1800,1,1).rotateX(-Math.PI/2),i);a.position.y=-48,a.frustumCulled=!1,a.renderOrder=5;let c=St(2024),n=e.clouds,r=[],h=[],f=[];for(let p=0;p<n;p++){let y=p/n*D+c.range(-.3,.3),w=c.range(95,240);f.push({x:Math.cos(y)*w,y:c.range(-34,26),z:Math.sin(y)*w,s:c.range(30,72),k:c()})}f.sort((p,y)=>Math.hypot(y.x,y.z)-Math.hypot(p.x,p.z));for(let p of f)r.push(p.x,p.y,p.z),h.push(p.s,p.s*c.range(.45,.62),p.k,c()*D);let u=new et.InstancedBufferGeometry,m=new et.PlaneGeometry(1,1);u.setIndex(m.index),u.setAttribute("position",m.getAttribute("position")),u.setAttribute("iPos",new et.InstancedBufferAttribute(new Float32Array(r),3)),u.setAttribute("iData",new et.InstancedBufferAttribute(new Float32Array(h),4)),u.instanceCount=f.length;let d=new et.ShaderMaterial({vertexShader:`
			${tt}
			attribute vec3 iPos; attribute vec4 iData;
			varying vec2 vUv; varying vec3 vW; varying float vK;
			void main() {
				vec3 c = iPos + vec3(sin(uTime * 0.02 + iData.w) * 6.0, 0.0, cos(uTime * 0.017 + iData.w) * 6.0);
				vec3 toCam = normalize(cameraPosition - c);
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				vec3 w = c + right * position.x * iData.x + up * position.y * iData.y;
				vW = w; vUv = position.xy + 0.5; vK = iData.z;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,fragmentShader:`
			${tt}
			${xt}
			uniform sampler2D uMap; uniform vec3 uCloudCol, uCloudShade;
			varying vec2 vUv; varying vec3 vW; varying float vK;
			void main() {
				vec4 t = texture2D(uMap, vUv);
				float a = clamp(t.a * 1.5, 0.0, 1.0);
				if (a < 0.01) discard;
				vec3 v = normalize(vW - cameraPosition);
				float sd = max(dot(v, uSunDir), 0.0);
				vec3 c = mix(uCloudShade, uCloudCol, t.g);
				// kontra \u0131\u015F\u0131kta kenarlar alt\u0131n renginde yanar
				c += uFogSun * pow(sd, 5.0) * (1.0 - a) * 1.6;
				float dist = length(vW - cameraPosition);
				c = mix(c, uFogCol, smoothstep(120.0, 420.0, dist) * 0.6);
				vec4 o = finish(c, 1.0);
				gl_FragColor = vec4(o.rgb * clamp(a, 0.0, 1.0), clamp(a, 0.0, 1.0));
			}`,uniforms:{...l,uMap:{value:t.cloud}},transparent:!0,depthWrite:!1,blending:et.CustomBlending,blendSrc:et.OneFactor,blendDst:et.OneMinusSrcAlphaFactor}),v=new et.Mesh(u,d);v.frustumCulled=!1,v.renderOrder=20;let g=new yt,x=[[1,.72,.82],[.42,.66,.3],[.95,.66,.24],[.92,.94,1],[.98,.78,.86],[.5,.7,.34],[.9,.55,.22]];for(let p=0;p<7;p++){let y=p/7*D+.5+c.range(-.2,.2),w=c.range(115,210),T=ze(Math.cos(y)*w,c.range(-22,18),Math.sin(y)*w),P=c.range(5,11),F=x[p],N=18,L=g.count;for(let G=0;G<=4;G++){let K=G/4,M=P*Math.pow(1-K,1.3)+.2;for(let E=0;E<=N;E++){let _=E/N*D,R=1+.15*Wt(_*3+p*7+K*2);g.vert(T.x+Math.cos(_)*M*R,T.y-K*P*1.6,T.z+Math.sin(_)*M*R,Math.cos(_),-.3,Math.sin(_),.6,.52,.58,.8,0,0)}}for(let G=0;G<4;G++)for(let K=0;K<N;K++){let M=L+G*(N+1)+K;g.quad(M,M+1,M+N+2,M+N+1)}let Z=g.vert(T.x,T.y+.3,T.z,0,1,0,F[0]*.9,F[1]*.9,F[2]*.9,1,0,0);for(let G=0;G<=N;G++){let K=G/N*D,M=1+.15*Wt(K*3+p*7);g.vert(T.x+Math.cos(K)*(P+.2)*M,T.y,T.z+Math.sin(K)*(P+.2)*M,0,1,0,F[0]*.85,F[1]*.85,F[2]*.85,1,0,0)}for(let G=0;G<N;G++)g.tri(Z,Z+1+G,Z+2+G);for(let G=0;G<4;G++){let K=c()*D,M=c.range(0,P*.7),E=ze(T.x+Math.cos(K)*M,T.y,T.z+Math.sin(K)*M),_=c.range(1.6,3.4);g.tube([E,E.clone().add(ze(0,_,0))],[.18,.1],5,()=>[.85,.82,.8,1]);let C=new et.IcosahedronGeometry(_*.55,1).getAttribute("position"),W=g.count;for(let V=0;V<C.count;V++){let B=ze(C.getX(V),C.getY(V),C.getZ(V)).normalize();g.vert(E.x+C.getX(V),E.y+_+C.getY(V)*.8,E.z+C.getZ(V),B.x,B.y,B.z,F[0],F[1],F[2],1,0,0)}for(let V=0;V<C.count;V+=3)g.tri(W+V,W+V+1,W+V+2)}}return g.fixWinding(),s.add(a,v),{group:s,dome:o,farGeo:g.build()}}function Is(l,t){let e=new et.ShaderMaterial({vertexShader:`
			uniform vec3 uSunDir; uniform float uSize;
			varying vec2 vUv;
			void main() {
				vec3 c = cameraPosition + uSunDir * 420.0;
				vec3 toCam = normalize(cameraPosition - c);
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				vec3 w = c + (right * position.x + up * position.y) * uSize;
				vUv = position.xy + 0.5;
				vec4 p = projectionMatrix * viewMatrix * vec4(w, 1.0);
				gl_Position = p.xyww;
			}`,fragmentShader:`
			uniform sampler2D uMap; uniform vec3 uSunGlow; uniform float uK;
			varying vec2 vUv;
			void main() {
				float t = texture2D(uMap, vUv).r;
				vec2 q = vUv - 0.5;
				// ince yatay \u0131\u015F\u0131k \xE7izgisi (anamorfik)
				float streak = exp(-abs(q.y) * 90.0) * exp(-abs(q.x) * 3.0) * 0.22;
				vec3 c = uSunGlow * (t * t * t * 0.32 + streak) * uK;
				gl_FragColor = vec4(c, 1.0);
			}`,uniforms:{uSunDir:t.uSunDir,uSunGlow:t.uSunGlow,uMap:{value:l},uSize:{value:120},uK:{value:1}},transparent:!0,depthWrite:!1,blending:et.AdditiveBlending}),s=new et.Mesh(new et.PlaneGeometry(1,1),e);return s.frustumCulled=!1,s.renderOrder=30,s}import*as ee from"three";var Qe=[{speed:1.25,wind:.22,elev:[40,34],sunStart:Math.PI*.55,burn:.8,drops:[[.42,-.2],[.78,.3]],hints:["drag","hide"]},{speed:1.3,wind:.28,elev:[34,30],sunStart:Math.PI,drops:[[.22,.4],[.5,0],[.58,.45],[.86,-.3]],gust:{every:11,dur:2.2,power:.5,from:6},crystals:[[.8,1,4.6,3.2]],locks:[.45],hints:["drops","bridge","crystal"]},{speed:1.35,wind:.25,elev:[62,56],sunStart:Math.PI,drops:[[.18,.5],[.47,.2],[.53,.5],[.74,-.4],[.92,.35]],crystals:[[.3,1,4.8,3.3],[.72,-1,4.4,3]],locks:[.6],hints:["ledge"]},{speed:1.35,wind:.3,elev:[56,48],sunStart:Math.PI,drops:[[.2,-.3],[.5,.3],[.56,-.2],[.62,.45],[.88,.3]],gust:{every:9,dur:2.4,power:.75,from:5},crystals:[[.25,-1,4.6,3.2],[.78,1,5,3.4]],locks:[.38],hints:["wait"]},{speed:1.4,wind:.3,elev:[30,24],sunStart:Math.PI,drops:[[.16,.4],[.36,-.3],[.55,.5],[.72,.1],[.9,-.4]],gust:{every:7.5,dur:2.8,power:1.15,from:3},crystals:[[.35,1,4.6,3.2],[.68,-1,4.8,3.2]],locks:[.5],hints:["gust"]},{speed:1.4,wind:.38,elev:[24,18],sunStart:Math.PI,drops:[[.2,.3],[.42,.5],[.5,-.2],[.57,.45],[.8,-.3],[.93,.4]],gust:{every:6,dur:3,power:1.55,from:2.5},crystals:[[.22,1,4.6,3],[.55,-1,5,3.3],[.85,1,4.4,3.2]],locks:[.32,.72]},{speed:1.45,wind:.18,elev:[16,11],sunStart:Math.PI,drops:[[.2,.45],[.4,-.2],[.55,.5],[.7,.2],[.9,.45]],gust:{every:10,dur:2.2,power:.6,from:5},crystals:[[.3,-1,4.6,3],[.6,1,4.8,3.2],[.88,-1,4.4,3]],locks:[.45,.8]},{speed:1.4,wind:.15,elev:[10,4],sunStart:Math.PI,drops:[[.15,.4],[.35,-.3],[.52,.5],[.68,0],[.84,.45]],crystals:[[.28,1,4.6,3],[.62,-1,4.8,3]],locks:[.5],hints:["gate"],finale:!0}];function Je(l){return{...te[l],...Qe[l],index:l}}var me=te.length;function Ws(l,t){if(!l||t<l.from)return 0;let e=(t-l.from)%l.every;if(e>l.dur)return 0;let s=Math.sin(e/l.dur*Math.PI);return l.power*s*s}function ts(l,t){if(!l)return 1/0;if(t<l.from)return l.from-t;let e=(t-l.from)%l.every;return e>l.dur?l.every-e:0}function _e(l,t){let e=te[t],s=l.sAtTheta(e.from)+(t===0?1.2:.5),o=l.sAtTheta(e.to)-(e.finale?.4:.5);return[s,o]}var Ct=(l=0,t=0,e=0)=>new ee.Vector3(l,t,e),li={spring:[1,.86,.94],summer:[1,.86,.55],autumn:[1,.72,.4],winter:[.78,.92,1.08]};function Vs(l,t){let e=[],s=new yt,o=new yt,i={};return t.forEach((a,c)=>{let n=Qe[c];if(!n.crystals)return;let[r,h]=_e(l,c);for(let[f,u,m,d]of n.crystals){let v=r+(h-r)*f;l.sample(v,i);let g=Ct(i.x,i.y+.45,i.z),x=Math.atan2(i.z,i.x),p=i.y+d,y=x+u*1.15,w;for(let S=0;S<8;S++){let z=wt(p)+m;w=Ct(Math.cos(y)*z,p,Math.sin(y)*z);let A=Ct().subVectors(g,w),I=-(w.x*A.x+w.z*A.z)/(A.x*A.x+A.z*A.z);if((I>0&&I<1?Math.hypot(w.x+A.x*I,w.z+A.z*I):99)>wt(p)+.5)break;y+=u*.1}let T=O(n.elev[0],n.elev[1],f),P=de(x+Math.PI,T,Ct()),F=Ct().subVectors(g,w).normalize(),N=Ct().addVectors(P,F).normalize(),L=li[a.season],Z=wt(p-.4),G=Ct(Math.cos(y-u*.12)*Z*.75,p-.7,Math.sin(y-u*.12)*Z*.75),K=Ct(Math.cos(y-u*.08)*(Z+1.2),p-.55,Math.sin(y-u*.08)*(Z+1.2)),M=Ct(Math.cos(y-u*.02)*(Z+m*.62),p-.85,Math.sin(y-u*.02)*(Z+m*.62)),E=w.clone().addScaledVector(N,-.36),R=new ee.CatmullRomCurve3([G,K,M,E]).getPoints(14);o.setSway(w.x,w.y,w.z,0),o.tube(R,R.map((S,z)=>O(.2,.05,Math.pow(z/14,.7))),6,(S,z)=>[O(1,.55,z),O(1,.42,z),O(1,.36,z),.9],{sway:(S,z)=>o.setSway(w.x,w.y,w.z,.45*Math.pow(z,1.6))});let C=Math.abs(N.y)>.9?Ct(1,0,0):Ct(0,1,0),W=Ct().crossVectors(N,C).normalize(),V=Ct().crossVectors(N,W).normalize(),B=[];for(let S=0;S<6;S++){let z=S/6*Math.PI*2+.26;B.push(w.clone().addScaledVector(W,Math.cos(z)*.4).addScaledVector(V,Math.sin(z)*.62))}let q=w.clone().addScaledVector(N,.16),U=w.clone().addScaledVector(N,-.2),b=e.length;s.setSway(w.x,w.y,w.z,.45);let k=(S,z,A)=>{let I=Ct().crossVectors(Ct().subVectors(z,S),Ct().subVectors(A,S)).normalize();for(let $ of[S,z,A])s.vert($.x,$.y,$.z,I.x,I.y,I.z,L[0],L[1],L[2],b,0,0);s.tri(s.count-3,s.count-2,s.count-1)};for(let S=0;S<6;S++){let z=B[S],A=B[(S+1)%6];k(q,z,A),k(U,A,z)}e.push({c:w,n:N,target:g,level:c,anchor:w.clone(),w:.45,tint:L,season:a.season})}}),s.fixWinding(),o.fixWinding(),{list:e,gemGeo:s.count?s.build():null,twigGeo:o.count?o.build():null}}function Os(l,t){return new ee.ShaderMaterial({vertexShader:`
			${tt}
			attribute vec4 color;
			attribute vec4 aSway;
			varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying float vIdx;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				w.xyz += windSway(aSway.xyz, aSway.w);
				vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vTint = color.rgb; vIdx = color.a;
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:`
			${tt}
			${Ht}
			${xt}
			uniform float uLit[${Math.max(1,t)}];
			varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying float vIdx;
			vec3 hue(float h) { return clamp(abs(fract(h + vec3(0.0, 0.333, 0.667)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
			void main() {
				vec3 N = normalize(vN);
				if (!gl_FrontFacing) N = -N;
				vec3 V = normalize(cameraPosition - vW);
				float lit = uLit[int(vIdx + 0.5)];
				float fr = pow(1.0 - abs(dot(N, V)), 2.0);
				vec3 c = vTint * (skyAmbient(N) * 0.7 + 0.08);
				c += hue(dot(N, V) * 1.7 + dot(N, uSunDir) * 0.6) * fr * 0.9;
				float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 60.0);
				c += uSunCol * sp * (0.4 + lit * 2.0);
				c += vTint * vec3(1.6, 1.4, 1.1) * lit * (0.6 + 0.4 * sin(uTime * 6.0 + vIdx));
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,uniforms:{...l,uLit:{value:new Array(Math.max(1,t)).fill(0)}},side:ee.DoubleSide})}import*as Y from"three";var Ns=l=>{let t=new Y.InstancedBufferGeometry,e=new Y.PlaneGeometry(1,1);return t.setIndex(e.index),t.setAttribute("position",e.getAttribute("position")),t.instanceCount=l,t};function Gs(l,t,e){let s=St(808),o=Ns(e),i=new Float32Array(e*4);for(let r=0;r<i.length;r++)i[r]=s();o.setAttribute("iSeed",new Y.InstancedBufferAttribute(i,4));let a={...l,uMap:{value:t},uCenter:{value:new Y.Vector3},uSeason:{value:new Y.Vector4(1,0,0,0)},uFire:{value:0},uCount:{value:1}},c=new Y.ShaderMaterial({vertexShader:`
			${tt}
			attribute vec4 iSeed;
			uniform vec3 uCenter; uniform vec4 uSeason; uniform float uFire; uniform float uCount;
			varying vec2 vUv; varying vec4 vCol; varying float vType;
			const vec3 BOX = vec3(30.0, 22.0, 30.0);
			void main() {
				// t\xFCr\xFC se\xE7: mevsim a\u011F\u0131rl\u0131klar\u0131na g\xF6re
				float r = iSeed.w;
				float type = 3.0; // kar
				if (r < uSeason.x) type = 0.0;
				else if (r < uSeason.x + uSeason.y) type = 1.0;
				else if (r < uSeason.x + uSeason.y + uSeason.z) type = 2.0;
				bool fire = fract(r * 7.13) < uFire * 0.35;
				if (fire) type = 4.0;
				float alive = step(fract(r * 3.7), uCount);
				vec3 drift = vec3(uWind.x, 0.0, uWind.y) * (0.6 + (uWind.z + uWind.w * 2.5) * 2.2);
				float t = uTime;
				vec3 vel; float size; float spin;
				if (type < 0.5) { vel = vec3(0.0, -0.55, 0.0) + drift; size = 0.12; spin = 1.6; }
				else if (type < 1.5) { vel = vec3(0.0, 0.05 * sin(iSeed.x * 40.0), 0.0) + drift * 0.3; size = 0.045; spin = 0.0; }
				else if (type < 2.5) { vel = vec3(0.0, -0.95, 0.0) + drift * 1.3; size = 0.17; spin = 2.6; }
				else if (type < 3.5) { vel = vec3(0.0, -0.75, 0.0) + drift * 0.5; size = 0.065; spin = 0.4; }
				else { vel = vec3(0.0, 0.08 * sin(t * 0.7 + iSeed.y * 30.0), 0.0); size = 0.09; spin = 0.0; }
				vec3 p = iSeed.xyz * BOX + vel * t;
				// s\xFCz\xFClme: yaprak gibi sa\u011Fa sola sal\u0131n\u0131m
				p.x += sin(t * 1.3 + iSeed.y * 40.0) * 0.6;
				p.z += cos(t * 1.1 + iSeed.x * 40.0) * 0.6;
				p.y += sin(t * 2.0 + iSeed.z * 30.0) * 0.15;
				// odak \xE7evresindeki kutuya sar
				vec3 rel = mod(p - uCenter + BOX * 0.5, BOX) - BOX * 0.5;
				vec3 w = uCenter + rel;
				vec3 toCam = cameraPosition - w;
				float dc = length(toCam);
				toCam /= dc;
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				float a = iSeed.x * 6.28 + t * spin * (0.5 + iSeed.z);
				vec2 q = vec2(position.x * cos(a) - position.y * sin(a), position.x * sin(a) + position.y * cos(a));
				// yaprak d\xF6nerken incelir (3B takla hissi)
				q.x *= mix(1.0, abs(sin(t * spin * 0.7 + iSeed.y * 9.0)) * 0.8 + 0.2, step(0.5, spin));
				// kutu kenar\u0131nda ve kameraya \xE7ok yak\u0131nken s\xF6ner
				float edge = 1.0 - smoothstep(0.38, 0.5, max(max(abs(rel.x) / BOX.x, abs(rel.y) / BOX.y), abs(rel.z) / BOX.z));
				float near = smoothstep(0.8, 2.5, dc);
				float fade = edge * near * alive;
				w += (right * q.x + up * q.y) * size * fade;
				float cell = type < 0.5 ? 0.0 : type < 1.5 ? 3.0 : type < 2.5 ? 1.0 : type < 3.5 ? 2.0 : 3.0;
				vUv = (position.xy + 0.5) * 0.5 + vec2(mod(cell, 2.0), 1.0 - floor(cell / 2.0)) * 0.5;
				vec3 col = type < 0.5 ? vec3(1.0, 0.82, 0.9) : type < 1.5 ? vec3(1.6, 1.35, 0.7) : type < 2.5 ? mix(vec3(1.0, 0.62, 0.2), vec3(0.9, 0.3, 0.12), fract(iSeed.z * 5.0)) : type < 3.5 ? vec3(1.0) : vec3(2.2, 1.9, 0.9);
				vCol = vec4(col, fade);
				vType = type;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,fragmentShader:`
			${tt}
			${xt}
			uniform sampler2D uMap;
			varying vec2 vUv; varying vec4 vCol; varying float vType;
			void main() {
				vec4 t = texture2D(uMap, vUv);
				float a = t.a * vCol.a;
				if (a < 0.03) discard;
				vec3 light = uSkyTop * 0.9 + uSunCol * 0.32;
				vec3 c = (vType > 0.5 && vType < 1.5) || vType > 3.5 ? vCol.rgb * (0.6 + uSunCol * 0.25) : t.rgb * vCol.rgb * light;
				vec4 o = finish(c, 1.0);
				gl_FragColor = vec4(o.rgb * a, a);
			}`,uniforms:a,transparent:!0,depthWrite:!1,blending:Y.CustomBlending,blendSrc:Y.OneFactor,blendDst:Y.OneMinusSrcAlphaFactor}),n=new Y.Mesh(o,c);return n.frustumCulled=!1,n.renderOrder=22,{mesh:n,u:a}}function Ls(l,t,e){let s=St(55),o=Ns(e),i=new Float32Array(e*4);for(let r=0;r<e;r++){let h=s()*D,f=s.range(2.5,7.5);i.set([Math.cos(h)*f,s.range(-1,5),Math.sin(h)*f,s()],r*4)}o.setAttribute("iOff",new Y.InstancedBufferAttribute(i,4));let a={...l,uMap:{value:t},uCenter:{value:new Y.Vector3},uK:{value:1}},c=new Y.ShaderMaterial({vertexShader:`
			${tt}
			attribute vec4 iOff;
			uniform vec3 uCenter; uniform float uNight;
			varying vec2 vUv; varying float vA;
			void main() {
				vec3 c = uCenter + iOff.xyz;
				vec3 ax = -uSunDir; // \u0131\u015F\u0131\u011F\u0131n akt\u0131\u011F\u0131 y\xF6n
				vec3 toCam = normalize(cameraPosition - c);
				vec3 side = normalize(cross(ax, toCam));
				float len = 16.0, wid = 1.6 + iOff.w * 2.2;
				vec3 w = c + ax * position.y * len + side * position.x * wid;
				vUv = position.xy + 0.5;
				// yaln\u0131zca g\xFCne\u015Fe do\u011Fru bakarken ve g\xFCne\u015F al\xE7akken belirgin
				vec3 vd = normalize(c - cameraPosition);
				float look = pow(max(dot(vd, uSunDir), 0.0), 2.0);
				float flick = 0.75 + 0.25 * sin(uTime * (0.6 + iOff.w) + iOff.w * 20.0);
				vA = look * flick * (1.0 - uNight);
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,fragmentShader:`
			${tt}
			uniform sampler2D uMap; uniform float uK;
			varying vec2 vUv; varying float vA;
			void main() {
				float t = texture2D(uMap, vUv).a;
				vec3 c = uFogSun * t * vA * uK * 0.22;
				gl_FragColor = vec4(c, 1.0);
			}`,uniforms:a,transparent:!0,depthWrite:!1,blending:Y.AdditiveBlending,side:Y.DoubleSide}),n=new Y.Mesh(o,c);return n.frustumCulled=!1,n.renderOrder=24,{mesh:n,u:a}}function Bs(l,t){let e=St(4242),s=new Y.BufferGeometry,o=new Float32Array([0,0,.35,-.08,0,-.2,.08,0,-.2,0,0,.12,-1,0,-.1,0,0,-.18,0,0,.12,1,0,-.1,0,0,-.18]);s.setAttribute("position",new Y.BufferAttribute(o,3));let i=new Y.InstancedBufferGeometry;i.setAttribute("position",s.getAttribute("position"));let a=new Float32Array(t*4);for(let h=0;h<t;h++){let f=h%2;a.set([e.range(0,D)*.15+f*Math.PI,e.range(-1.5,1.5),e.range(-1.5,1.5),e()],h*4)}i.setAttribute("iBird",new Y.InstancedBufferAttribute(a,4)),i.instanceCount=t;let c={...l,uCenterY:{value:30}},n=new Y.ShaderMaterial({vertexShader:`
			${tt}
			attribute vec4 iBird;
			uniform float uCenterY;
			varying vec3 vW;
			void main() {
				float spd = 0.07 + iBird.w * 0.015;
				float ang = iBird.x + uTime * spd;
				float rad = 24.0 + iBird.y * 2.0 + sin(uTime * 0.21 + iBird.w * 6.0) * 3.0;
				vec3 c = vec3(cos(ang) * rad, uCenterY + 9.0 + iBird.z * 1.6 + sin(uTime * 0.37 + iBird.w * 9.0) * 2.5, sin(ang) * rad);
				vec3 fwd = normalize(vec3(-sin(ang), 0.0, cos(ang)));
				vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
				vec3 p = position;
				float flap = sin(uTime * 9.0 + iBird.w * 30.0);
				p.y += abs(p.x) * flap * 0.55;
				float s = 0.55 + iBird.w * 0.25;
				vec3 w = c + (right * p.x + vec3(0.0, 1.0, 0.0) * p.y + fwd * p.z) * s;
				vW = w;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,fragmentShader:`
			${tt}
			${xt}
			varying vec3 vW;
			void main() {
				vec3 c = vec3(0.05, 0.04, 0.08) + uSkyHor * 0.08;
				float d = length(vW - cameraPosition);
				float f = 1.0 - exp(-d * uFogP.x * 1.3);
				gl_FragColor = finish(mix(c, uFogCol, f), 1.0);
			}`,uniforms:c,side:Y.DoubleSide}),r=new Y.Mesh(i,n);return r.frustumCulled=!1,{mesh:r,u:c}}function Us({G:l,tier:t,shadow:e,aniso:s,msaa:o}){let i=t.id>=1,a={bark:ys(i?1024:512,s),plank:bs(512,256,s),leaves:ws(t.id>=2?1024:512),glow:ks(128),ink:Ms(128),stars:Ts(1024,512),cloud:Es(256),cloudNoise:Ss(256),particles:zs(128),shaft:_s(128,256),rock:Rs(256,s)},c=new Mt.Scene;c.matrixWorldAutoUpdate=!0;let n=new Te,r=Ps(n,t),h=Hs(n),f=(pe+.3)%(Math.PI*2),u=Fs(f),m=Ds(l,a,t),d=(K,M,E=0,_=null)=>{let R=new Mt.Mesh(K,M);return R.matrixAutoUpdate=!1,R.frustumCulled=!!K.boundingSphere,R.renderOrder=E,c.add(R),_&&e.add(K,_),R},v=Ke(),g=Ke({wind:!0}),x=12.5,p={trunk:Xt({map:a.bark,wrap:.38,rim:.5,snow:1,snowY:x}),branch:Xt({map:a.bark,wrap:.38,rim:.5,snow:1,snowY:x,wind:!0,cutout:!0}),walk:Xt({map:a.plank,wrap:.22,rim:.2,snow:.85,snowY:x-1}),rail:Xt({wrap:.3,rim:.35,snow:.9,snowY:x}),glass:gs(16761466,2.4),leaf:ms(a.leaves,{a2c:o}),islandTop:Xt({wrap:.3,rim:.12}),rock:Xt({map:a.rock,wrap:.3,rim:.3}),props:Xt({wrap:.3,rim:.3,cutout:!0}),pond:Xt({wrap:.2,rim:.9}),far:Xt({wrap:.5,rim:.4}),sky:xs(a.stars)};d(r.trunk,p.trunk,0,v),d(r.branches,p.branch,0,g),r.nest&&d(r.nest,p.rail,0,v),d(h.walkway,p.walk,0,v),d(h.rail,p.rail,0,v),d(h.glass,p.glass,0);let y=new Mt.Mesh(r.leaves,p.leaf);y.frustumCulled=!1,y.matrixAutoUpdate=!1,y.renderOrder=2,c.add(y),e.add(r.leaves,vs(a.leaves)),d(u.top,p.islandTop,0),d(u.rock,p.rock,0),d(u.props,p.props,0,v),d(u.pond,p.pond,0),d(u.gateFrame,p.trunk,0,v);let w=ci(l);d(u.gate,w,1),d(m.farGeo,p.far,0);let T=Vs(n,te),P=Os(l,T.list.length);T.twigGeo&&d(T.twigGeo,p.branch,0),T.gemGeo&&d(T.gemGeo,P,0),m.dome.material=p.sky,c.add(m.dome),c.add(m.group);let F=Is(a.glow,l);c.add(F);let N=Gs(l,a.particles,t.particles),L=Ls(l,a.shaft,t.shafts),Z=Bs(l,t.birds);c.add(N.mesh,L.mesh,Z.mesh);let G=se(h.lanterns,a.glow,l,.5,16756832);return c.add(G.mesh),{scene:c,curve:n,tree:r,walk:h,island:u,tex:a,mats:p,gateMat:w,crystals:T,crystalMat:P,glare:F,lanternGlow:G,particles:N,shafts:L,birds:Z,occluders:{caps:r.caps.concat(u.occ.caps),ellipsoids:r.ellipsoids,spheres:u.occ.spheres}}}function ci(l){return new Mt.ShaderMaterial({vertexShader:`
			varying vec2 vUv; varying vec3 vW;
			void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${tt}
			${Ht}
			${xt}
			uniform float uOpen;
			varying vec2 vUv; varying vec3 vW;
			void main() {
				const float GW = 1.25, GH = 2.5;
				float lx = (vUv.x - 0.5) * 2.0 * GW, ly = vUv.y * GH;
				float d = ly < GH - GW ? GW - abs(lx) : GW - length(vec2(lx, ly - (GH - GW)));
				vec2 p = vec2(lx, ly - GH * 0.42);
				float r = length(p);
				float a = atan(p.y, p.x);
				float sw = sin(a * 3.0 + r * 5.5 - uTime * 1.4) * 0.5 + 0.5;
				vec3 c = vec3(0.012, 0.008, 0.03) + vec3(0.22, 0.14, 0.55) * sw * sw * (1.0 - smoothstep(0.0, 1.4, r)) * (0.35 + uOpen);
				float rim = 1.0 - smoothstep(0.0, 0.32, d);
				c += mix(vec3(0.55, 0.42, 1.6), vec3(2.2, 1.5, 0.6), 0.35 + 0.35 * sin(uTime * 2.0 + a * 2.0)) * rim * (0.5 + 1.6 * uOpen);
				float sp = step(0.985, fract(sin(dot(floor(vec2(a * 9.0, r * 14.0 - uTime * 0.8)), vec2(12.9, 78.2))) * 43758.5));
				c += vec3(1.4, 1.3, 2.2) * sp * (1.0 - smoothstep(0.2, 1.2, r)) * 0.6;
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,uniforms:{...l,uOpen:{value:0}},side:Mt.DoubleSide,polygonOffset:!0,polygonOffsetFactor:-2})}function se(l,t,e,s,o){let i=new Mt.InstancedBufferGeometry,a=new Mt.PlaneGeometry(1,1);i.setIndex(a.index),i.setAttribute("position",a.getAttribute("position"));let c=new Float32Array(Math.max(1,l.length)*4);l.forEach((f,u)=>c.set([f.x,f.y,f.z,s],u*4));let n=new Mt.InstancedBufferAttribute(c,4);i.setAttribute("iPos",n),i.instanceCount=l.length;let r=new Mt.ShaderMaterial({vertexShader:`
			attribute vec4 iPos; varying vec2 vUv; varying vec3 vW;
			uniform float uTime;
			void main() {
				vec3 toCam = normalize(cameraPosition - iPos.xyz);
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				float fl = 0.92 + 0.08 * sin(uTime * 9.0 + iPos.x * 3.0) * sin(uTime * 6.3 + iPos.z);
				vec3 w = iPos.xyz + toCam * 0.08 + (right * position.x + up * position.y) * iPos.w * fl;
				vUv = position.xy + 0.5; vW = w;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,fragmentShader:`
			uniform sampler2D uMap; uniform vec3 uColor; uniform float uK; uniform vec4 uFogP;
			varying vec2 vUv; varying vec3 vW;
			void main() {
				float t = texture2D(uMap, vUv).r;
				float f = exp(-length(vW - cameraPosition) * uFogP.x * 0.8);
				vec3 c = uColor * t * uK * f;
				gl_FragColor = vec4(c / (1.0 + c * 0.3), 1.0);
			}`,uniforms:{uTime:e.uTime,uFogP:e.uFogP,uMap:{value:t},uColor:{value:new Mt.Color(o)},uK:{value:1}},transparent:!0,depthWrite:!1,blending:Mt.AdditiveBlending}),h=new Mt.Mesh(i,r);return h.frustumCulled=!1,h.renderOrder=25,{mesh:h,attr:n,mat:r}}var Tt={dx:1,dz:0,str:.25,gust:0};function ve(l,t,e,s,o,i){let a=l*.071+e*.053+t*.037,c=Math.sin(o*1.3+a*6.2831)*.6+Math.sin(o*2.7+a*11)*.4,n=Tt.gust*(.65+.35*Math.sin(o*5.1+a*17)),r=(Tt.str*c+n)*s;return i.x=Tt.dx*r,i.y=Math.sin(o*2.1+a*9)*.18*s*(Tt.str+Tt.gust),i.z=Tt.dz*r,i}import*as ae from"three";var he=()=>new ae.Vector3,Re=class{constructor(){this.cam=new ae.PerspectiveCamera(52,1,.3,1400),this.pos=he(),this.look=he(),this.tPos=he(),this.tLook=he(),this.aspect=1,this.mode="follow",this.cine=null,this.shake=0,this.zoom=1,this._tmp=he(),this._tmp2=he(),this.lag=.42}resize(t,e){this.aspect=t/e,this.cam.aspect=this.aspect,this.baseFov=this.aspect<1?O(66,54,lt((this.aspect-.45)/.55,0,1)):50,this.cam.fov=this.baseFov,this.cam.updateProjectionMatrix()}followTarget(t,e,s=this.tPos,o=this.tLook){let i=Math.atan2(t.z,t.x),a=Math.hypot(t.x,t.z),c=this.aspect<1,n=(c?10.2:8.6)*this.zoom,r=(c?4.2:3.3)*this.zoom,h=i-this.lag;return s.set(Math.cos(h)*(a+n),t.y+r,Math.sin(h)*(a+n)),o.copy(t).lerp(e,.35),o.y+=c?.2:.55,s}snap(){this.pos.copy(this.tPos),this.look.copy(this.tLook)}play(t,e){this.cine={keys:t,t:0,dur:t[t.length-1].t,onDone:e};let s=t.map(i=>i.pos),o=t.map(i=>i.look);this.cine.cp=new ae.CatmullRomCurve3(s,!1,"centripetal"),this.cine.cl=new ae.CatmullRomCurve3(o,!1,"centripetal"),this.mode="cine"}skipCine(){this.cine&&(this.cine.t=this.cine.dur)}update(t){let e=this.cam;if(this.mode==="cine"&&this.cine){let s=this.cine;s.t=Math.min(s.dur,s.t+t);let o=s.keys,i=0;for(;i<o.length-2&&s.t>o[i+1].t;)i++;let a=(s.t-o[i].t)/Math.max(1e-4,o[i+1].t-o[i].t),c=(i+Ue(lt(a,0,1)))/(o.length-1);s.cp.getPoint(c,this.pos),s.cl.getPoint(c,this.look);let n=o[i].fov??this.baseFov,r=o[i+1].fov??this.baseFov;e.fov=O(n,r,Ue(lt(a,0,1))),e.updateProjectionMatrix(),s.t>=s.dur&&(this.mode="follow",this.cine=null,s.onDone&&s.onDone())}else this.mode==="follow"&&(this.pos.x=gt(this.pos.x,this.tPos.x,3.2,t),this.pos.y=gt(this.pos.y,this.tPos.y,3.6,t),this.pos.z=gt(this.pos.z,this.tPos.z,3.2,t),this.look.x=gt(this.look.x,this.tLook.x,5,t),this.look.y=gt(this.look.y,this.tLook.y,5,t),this.look.z=gt(this.look.z,this.tLook.z,5,t),Math.abs(e.fov-this.baseFov)>.01&&(e.fov=gt(e.fov,this.baseFov,3,t),e.updateProjectionMatrix()));if(e.position.copy(this.pos),this.shake>.001){let s=this.shake;e.position.x+=(Math.random()-.5)*s,e.position.y+=(Math.random()-.5)*s,this.shake=gt(this.shake,0,6,t)}e.lookAt(this.look),e.updateMatrixWorld()}};import*as Ks from"three";var Bt={x:0,y:0,z:0},hi={min:0,max:1e9},Ce=class{constructor(t){let e=t.occluders;this.caps=e.caps.map(o=>({ax:o.a.x,ay:o.a.y,az:o.a.z,bx:o.b.x,by:o.b.y,bz:o.b.z,r:o.r,anchor:o.anchor||null,wa:o.wa||0,wb:o.wb||0,cx:(o.a.x+o.b.x)/2,cy:(o.a.y+o.b.y)/2,cz:(o.a.z+o.b.z)/2,br:o.a.distanceTo(o.b)/2+o.r+1.8*Math.max(o.wa||0,o.wb||0)})),this.ells=e.ellipsoids.map(o=>({cx:o.c.x,cy:o.c.y,cz:o.c.z,rx:o.rx,ry:o.ry,rz:o.rz,anchor:o.anchor,w:o.w,br:Math.max(o.rx,o.ry,o.rz)+1.8*o.w})),this.sph=e.spheres.map(o=>({cx:o.c.x,cy:o.c.y,cz:o.c.z,rx:o.r,ry:o.r*o.sy,rz:o.r,br:o.r}));let s=t.curve;this.slabs=[];for(let o=0;o<s.n-4;o+=4){let i=o+2,a=s.X[o+4]-s.X[o],c=s.Y[o+4]-s.Y[o],n=s.Z[o+4]-s.Z[o],r=Math.hypot(a,c,n),h=s.SX[i],f=s.SZ[i],u=s.R[i]-wt(s.Y[i])<1.6?1.15:.95,m=(u+1.9/2)/2,d=(1.9/2-u)/2;this.slabs.push({cx:s.X[i]+h*d,cy:s.Y[i]-.34/2,cz:s.Z[i]+f*d,Tx:a/r,Ty:c/r,Tz:n/r,hT:r/2+.02,Sx:h,Sz:f,hS:m,hU:.34/2+.04,br:Math.hypot(r/2,m,.34)})}this.t=0}setTime(t){this.t=t}blocked(t,e,s,o){let i=o.x,a=o.y,c=o.z;if(this._trunk(t,e,s,i,a,c))return!0;for(let n of this.slabs)if(!(n.cy<e+.25)&&He(t,e,s,i,a,c,n.cx,n.cy,n.cz,n.br)&&di(t,e,s,i,a,c,n))return!0;for(let n of this.ells)if(!(n.cy+n.br<e)&&He(t,e,s,i,a,c,n.cx,n.cy,n.cz,n.br)&&(ve(n.anchor.x,n.anchor.y,n.anchor.z,n.w,this.t,Bt),$s(t,e,s,i,a,c,n.cx+Bt.x,n.cy+Bt.y,n.cz+Bt.z,n.rx,n.ry,n.rz)))return!0;for(let n of this.caps){if(Math.max(n.ay,n.by)+n.r+2<e||!He(t,e,s,i,a,c,n.cx,n.cy,n.cz,n.br))continue;let r=n.ax,h=n.ay,f=n.az,u=n.bx,m=n.by,d=n.bz;if(n.anchor&&(n.wa>0||n.wb>0)&&(ve(n.anchor.x,n.anchor.y,n.anchor.z,1,this.t,Bt),r+=Bt.x*n.wa,h+=Bt.y*n.wa,f+=Bt.z*n.wa,u+=Bt.x*n.wb,m+=Bt.y*n.wb,d+=Bt.z*n.wb),ui(t,e,s,i,a,c,r,h,f,u,m,d,n.r))return!0}for(let n of this.sph)if(He(t,e,s,i,a,c,n.cx,n.cy,n.cz,n.br)&&$s(t,e,s,i,a,c,n.cx,n.cy,n.cz,n.rx,n.ry,n.rz))return!0;return!1}_trunk(t,e,s,o,i,a){let c=o*o+a*a;if(c<1e-6)return!1;let n=-(t*o+s*a)/c;if(n<=0)return!1;let r=t+o*n,h=s+a*n,f=e+i*n;if(f>55||Math.hypot(r,h)>wt(Math.max(0,f))+2.2)return!1;let m=9/Math.sqrt(c),d=Math.max(0,n-m),v=n+m,g=36;for(let x=0;x<=g;x++){let p=d+(v-d)*x/g,y=t+o*p,w=e+i*p,T=s+a*p;if(w>54)continue;if(Math.hypot(y,T)<It(Math.atan2(T,y),w)*.985)return!0}return!1}};function He(l,t,e,s,o,i,a,c,n,r){let h=a-l,f=c-t,u=n-e,m=h*s+f*o+u*i;return m<-r?!1:h*h+f*f+u*u-m*m<=r*r}function $s(l,t,e,s,o,i,a,c,n,r,h,f){let u=(l-a)/r,m=(t-c)/h,d=(e-n)/f,v=s/r,g=o/h,x=i/f,p=v*v+g*g+x*x,y=u*v+m*g+d*x,w=u*u+m*m+d*d-1;if(w<0)return!0;let T=y*y-p*w;return T<0?!1:-y-Math.sqrt(T)>0}function ui(l,t,e,s,o,i,a,c,n,r,h,f,u){let m=r-a,d=h-c,v=f-n,g=l-a,x=t-c,p=e-n,y=s*s+o*o+i*i,w=s*m+o*d+i*v,T=m*m+d*d+v*v,P=s*g+o*x+i*p,F=m*g+d*x+v*p,N=y*T-w*w,L,Z;N<1e-8?(L=0,Z=T>1e-8?F/T:0):(L=(w*F-T*P)/N,Z=(y*F-w*P)/N),L<0&&(L=0,Z=T>1e-8?F/T:0),Z<0?(Z=0,L=Math.max(0,-P/y)):Z>1&&(Z=1,L=Math.max(0,(w-P)/y));let G=g+L*s-Z*m,K=x+L*o-Z*d,M=p+L*i-Z*v;return G*G+K*K+M*M<=u*u}function di(l,t,e,s,o,i,a){let c=l-a.cx,n=t-a.cy,r=e-a.cz,h=hi;return h.min=0,h.max=1e9,es(a.Tx*c+a.Ty*n+a.Tz*r,a.Tx*s+a.Ty*o+a.Tz*i,a.hT,h)&&es(a.Sx*c+a.Sz*r,a.Sx*s+a.Sz*i,a.hS,h)&&es(n,o,a.hU,h)&&h.max>0}function es(l,t,e,s){if(Math.abs(t)<1e-6)return Math.abs(l)<=e;let o=(-e-l)/t,i=(e-l)/t;if(o>i){let a=o;o=i,i=a}return o>s.min&&(s.min=o),i<s.max&&(s.max=i),s.min<=s.max}import*as at from"three";var qs=1.55,fi=`
uniform float uTime, uWob, uBurn, uMelt;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vL;
void main() {
	vec3 p = position, nn = normal;
	float n = sin(p.x * 11.0 + uTime * 5.3) * sin(p.y * 9.0 + uTime * 4.1) * sin(p.z * 10.0 + uTime * 6.2);
	p += normal * n * 0.035 * (uWob + uBurn * 1.8 + uMelt * 2.2);
	if (uMelt > 0.0) {
		// erime: g\xF6vde \xE7\xF6ker, taban jel gibi yay\u0131l\u0131r
		float yb = clamp((p.y + 0.3) / 0.6, 0.0, 1.0), ang = atan(p.z, p.x);
		float lob = 0.5 + 0.5 * sin(ang * 5.0 + 1.3) * sin(ang * 3.0 - uTime * 0.6);
		p.y = -0.3 + (p.y + 0.3) * mix(1.0, 0.3 + 0.12 * lob, uMelt);
		p.xz *= 1.0 + uMelt * (1.0 - yb) * (0.3 + 0.35 * lob);
		nn = normalize(mix(normal, vec3(normal.x * 0.45, 1.0, normal.z * 0.45), uMelt * 0.55));
	}
	vec4 w = modelMatrix * vec4(p, 1.0);
	vN = normalize(mat3(modelMatrix) * nn); vV = normalize(cameraPosition - w.xyz); vP = w.xyz; vL = position;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,pi=`
${tt}
${Ht}
${xt}
uniform vec3 uRim;
uniform float uBurn, uLit, uFade, uMelt, uDiss;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vL;
float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p) {
	vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
	           mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
	vec3 N = normalize(vN), V = normalize(vV);
	float fr = pow(1.0 - max(dot(N, V), 0.0), 2.4);
	vec3 col = vec3(0.012, 0.009, 0.022);
	col += uRim * fr * 1.6 * (1.0 - 0.78 * uMelt);
	col += uRim * 0.25 * pow(max(N.y, 0.0), 3.0) * (1.0 - 0.8 * uMelt);
	vec3 H = normalize(uSunDir + V);
	float sp = pow(max(dot(N, H), 0.0), mix(70.0, 260.0, uMelt));
	col += uSunCol * 0.33 * sp * (0.6 + uLit * 2.5 * (1.0 - 0.75 * uMelt));
	float cr = n3(vL * 9.0 + vec3(0.0, uTime * 0.8, 0.0)) * 0.65 + n3(vL * 21.0 - uTime) * 0.35;
	float crack = smoothstep(0.55, 0.62, cr) * (1.0 - smoothstep(0.62, 0.75, cr));
	col += vec3(4.0, 1.3, 0.25) * crack * uBurn * 2.2 * (1.0 - 0.45 * uMelt) + vec3(1.5, 0.45, 0.08) * uBurn * fr * 2.0 * (1.0 - 0.7 * uMelt);
	if (uDiss > 0.0) {
		float dn = n3(vL * 13.0 + vec3(0.0, uTime * 0.7, 0.0)) * 0.7 + n3(vL * 31.0) * 0.3, th = uDiss * 1.15 - 0.08;
		if (dn < th) discard;
		float e = 1.0 - smoothstep(th, th + 0.07, dn);
		col += vec3(3.4, 1.05, 0.25) * e * 2.2 + uRim * e * 1.2;
	}
	gl_FragColor = finish(col * uFade, 1.0);
}`,mi=`
varying vec3 vN; varying vec3 vV; varying float vY;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vY = position.y; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,vi=`
uniform vec3 uRim; uniform float uFade; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
	float f = 1.0 - abs(dot(normalize(vN), normalize(vV))), rim = pow(f, 2.2), pulse = 0.88 + 0.12 * sin(uTime * 4.0);
	vec3 c = mix(vec3(0.62, 0.55, 1.0), uRim, 0.45) * (0.45 + 1.7 * rim) * pulse * 0.8;
	gl_FragColor = vec4(c, (0.22 + 0.68 * rim) * uFade);
}`,gi=`
uniform float uV, uA, uTime; varying vec2 vUv;
void main() {
	vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.x, -p.y) / 6.2831853 + 0.5;
	float band = smoothstep(0.78, 0.82, r) * (1.0 - smoothstep(0.94, 0.98, r));
	float fill = step(a, uV);
	vec3 c = mix(vec3(3.0, 0.7, 0.2), vec3(1.6, 1.4, 2.6), smoothstep(0.25, 0.7, uV));
	float pulse = uV < 0.3 ? 0.6 + 0.4 * sin(uTime * 18.0) : 1.0;
	vec3 o = c * pulse * band * (fill * 0.95 + 0.12) * uA;
	gl_FragColor = vec4(o / (1.0 + o * 0.4), 1.0);
}`,Ae=class{constructor(t,e,{rim:s=10325247,segs:o=40}={}){this.g=new at.Group,this.k=new at.Group,this.k.scale.setScalar(qs),this.g.add(this.k),this.body=new at.Group,this.k.add(this.body),this.u={...t,uWob:{value:.5},uBurn:{value:0},uRim:{value:new at.Color(s)},uLit:{value:0},uFade:{value:1},uMelt:{value:0},uDiss:{value:0}};let i=new at.SphereGeometry(.3,o,Math.round(o*.7));this.blob=new at.Mesh(i,new at.ShaderMaterial({vertexShader:fi,fragmentShader:pi,uniforms:this.u})),this.blob.position.y=.3,this.body.add(this.blob),this.sil=new at.Mesh(i,new at.ShaderMaterial({vertexShader:mi,fragmentShader:vi,uniforms:{uRim:this.u.uRim,uFade:this.u.uFade,uTime:t.uTime},transparent:!0,depthWrite:!1,depthFunc:at.GreaterDepth})),this.sil.position.y=.3,this.sil.scale.setScalar(1.035),this.sil.renderOrder=40,this.body.add(this.sil);let a=Ye(16777215,2.2),c=Ye(328200,1);this.eyeMat=a,this.eyes=[],this.pupils=[];let n=new at.SphereGeometry(.075,16,12),r=new at.SphereGeometry(.036,10,8);for(let f of[-1,1]){let u=new at.Mesh(n,a);u.scale.set(.95,1.25,.55),u.position.set(f*.105,.38,.25);let m=new at.Mesh(r,c);m.position.set(0,-.005,.06),u.add(m),this.body.add(u),this.eyes.push(u),this.pupils.push(m)}let h=new at.SphereGeometry(.075,10,8);this.feet=[-1,1].map(f=>{let u=new at.Mesh(h,c);return u.scale.set(1,.6,1.35),u.position.set(f*.12,.04,.02),this.k.add(u),u}),this.aura=new at.Mesh(new at.PlaneGeometry(1.3,1.3).rotateX(-Math.PI/2),new at.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:"uniform sampler2D uMap; uniform float uO; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a * uO; gl_FragColor = vec4(0.012, 0.008, 0.03, a); }",uniforms:{uMap:{value:e.ink},uO:{value:.85}},transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-4})),this.aura.position.y=.014,this.aura.renderOrder=3,this.k.add(this.aura),this.ringU={uV:{value:1},uA:{value:0},uTime:t.uTime},this.ring=new at.Mesh(new at.PlaneGeometry(1.25,1.25).rotateX(-Math.PI/2),new at.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:gi,uniforms:this.ringU,transparent:!0,depthWrite:!1,blending:at.AdditiveBlending})),this.ring.position.y=.03,this.ring.renderOrder=4,this.k.add(this.ring),this.reset()}reset(){this.phase=0,this.yaw=0,this.blinkT=2,this.squash=0,this.sqV=0,this.tapT=0,this.idleT=0,this.hopT=0,this.melt=0,this.diss=0,this.u.uMelt.value=0,this.u.uDiss.value=0,this.u.uFade.value=1,this.u.uBurn.value=0,this.blob.visible=!0,this.sil.visible=!0,this.g.visible=!0,this.g.scale.setScalar(1),this.body.scale.setScalar(1),this.body.position.set(0,0,0);for(let t of this.feet)t.visible=!0;this.eyes.forEach((t,e)=>{t.visible=!0,t.position.set(e?.105:-.105,.38,.25),t.scale.set(.95,1.25,.55)})}kick(t){this.sqV+=t}hop(){this.hopT=.55}update(t,e,s,o){this.g.position.set(s.x,s.y,s.z);let i=s.yaw-this.yaw;for(;i>Math.PI;)i-=Math.PI*2;for(;i<-Math.PI;)i+=Math.PI*2;this.yaw+=i*(1-Math.exp(-10*t)),this.g.rotation.y=this.yaw,this.sqV+=(-this.squash*220-this.sqV*16)*t,this.squash+=this.sqV*t;let a=0,c=1,n=1;if(s.moving){let m=this.phase;this.phase+=t*s.speed*4.4;let d=this.phase%1;a=Math.sin(d*Math.PI)*.12,Math.floor(this.phase)!==Math.floor(m)&&(this.kick(-2.2),o&&o()),c=1+Math.sin(d*Math.PI)*.06;for(let v=0;v<2;v++){let g=(this.phase+v*.5)%1;this.feet[v].position.z=.02+Math.sin(g*Math.PI*2)*.09,this.feet[v].position.y=.04+Math.max(0,Math.sin(g*Math.PI*2))*.05}}else{let m=Math.sin(e*2.2)*.025;c=1+m,n=1-m*.6;for(let d of this.feet)d.position.z=gt(d.position.z,.02,8,t),d.position.y=.04;if(s.hold){this.tapT+=t;let d=Math.max(0,Math.sin(this.tapT*11));this.feet[1].position.y=.04+d*.045,this.feet[1].position.z=.05}else this.tapT=0}if(this.hopT>0){this.hopT=Math.max(0,this.hopT-t);let m=Math.sin((1-this.hopT/.55)*Math.PI);a+=m*.22,c*=1+m*.08,this.hopT===0&&this.kick(-2.4)}c*=1+this.squash,n*=1-this.squash*.55;let r=O(.62,1,s.meter);this.k.scale.setScalar(qs*r);let h=s.burn>0?.018*s.burn:0;this.body.position.set((Math.random()-.5)*h,a,(Math.random()-.5)*h),this.body.scale.set(n,c,n),this.blinkT-=t;let f=1;this.blinkT<.12&&(f=Math.max(.08,Math.abs(this.blinkT-.06)/.06)),this.blinkT<0&&(this.blinkT=2+Math.random()*3);let u=s.burn>.2?1.25:1;this.eyes.forEach(m=>m.scale.set(.95*u,1.25*f*u,.55));for(let m of this.pupils)m.scale.setScalar(s.burn>.2?.6:1);this.u.uBurn.value=gt(this.u.uBurn.value,s.burn,8,t),this.u.uLit.value=gt(this.u.uLit.value,s.lit,8,t),this.u.uWob.value=.4+this.u.uBurn.value*.6,this.ringU.uV.value=gt(this.ringU.uV.value,s.meter,10,t),this.ringU.uA.value=gt(this.ringU.uA.value,s.meter<.995?1:0,4,t)}evaporate(t){this.u.uMelt.value=lt(t*1.6,0,1),this.u.uDiss.value=lt((t-.25)/.75,0,1),this.u.uBurn.value=1,this.sil.visible=!1,this.ringU.uA.value=0,this.aura.material.uniforms.uO.value=.85*(1-t);for(let e of this.feet)e.visible=t<.4;this.eyes.forEach((e,s)=>{let o=Math.max(.001,1-lt((t-.1)/.4,0,1));e.scale.set(.95*o,1.4*o,.55*o),e.position.y=O(.38,.18,lt(t*2,0,1))})}setFade(t){this.u.uFade.value=t,this.eyeMat.uniforms.uFade.value=t,this.aura.material.uniforms.uO.value=.85*t}};import*as Jt from"three";import*as mt from"three";var Ut=320,ge=class{constructor(t,e,{additive:s=!1}={}){this.n=0,this.p=new Float32Array(Ut*3),this.v=new Float32Array(Ut*3),this.life=new Float32Array(Ut*2),this.par=new Float32Array(Ut*4),this.col=new Float32Array(Ut*4),this.cell=new Float32Array(Ut),this.spin=new Float32Array(Ut*2);let o=new mt.InstancedBufferGeometry,i=new mt.PlaneGeometry(1,1);o.setIndex(i.index),o.setAttribute("position",i.getAttribute("position")),this.aPos=new mt.InstancedBufferAttribute(new Float32Array(Ut*4),4).setUsage(mt.DynamicDrawUsage),this.aCol=new mt.InstancedBufferAttribute(new Float32Array(Ut*4),4).setUsage(mt.DynamicDrawUsage),this.aRot=new mt.InstancedBufferAttribute(new Float32Array(Ut*2),2).setUsage(mt.DynamicDrawUsage),o.setAttribute("iPos",this.aPos),o.setAttribute("iCol",this.aCol),o.setAttribute("iRot",this.aRot),o.instanceCount=0,this.geo=o;let a=new mt.ShaderMaterial({vertexShader:`
				attribute vec4 iPos; attribute vec4 iCol; attribute vec2 iRot;
				varying vec2 vUv; varying vec4 vCol;
				void main() {
					vec3 toCam = normalize(cameraPosition - iPos.xyz);
					vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
					vec3 up = cross(toCam, right);
					float c = cos(iRot.y), s = sin(iRot.y);
					vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
					vec3 w = iPos.xyz + (right * q.x + up * q.y) * iPos.w;
					vUv = (position.xy + 0.5) * 0.5 + vec2(mod(iRot.x, 2.0), 1.0 - floor(iRot.x / 2.0)) * 0.5;
					vCol = iCol;
					gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
				}`,fragmentShader:s?`
				uniform sampler2D uMap; varying vec2 vUv; varying vec4 vCol;
				void main() { vec4 t = texture2D(uMap, vUv); vec3 c = vCol.rgb * t.a * vCol.a; gl_FragColor = vec4(c / (1.0 + c * 0.3), 1.0); }`:`
				uniform sampler2D uMap; varying vec2 vUv; varying vec4 vCol;
				void main() { vec4 t = texture2D(uMap, vUv); float a = t.a * vCol.a; if (a < 0.02) discard;
					vec3 c = pow(clamp(t.rgb * vCol.rgb, 0.0, 1.0), vec3(1.0 / 2.2)); gl_FragColor = vec4(c * a, a); }`,uniforms:{uMap:{value:e}},transparent:!0,depthWrite:!1,blending:s?mt.AdditiveBlending:mt.CustomBlending,blendSrc:mt.OneFactor,blendDst:s?mt.OneFactor:mt.OneMinusSrcAlphaFactor});this.mesh=new mt.Mesh(o,a),this.mesh.frustumCulled=!1,this.mesh.renderOrder=35}emit(t,e,s,o,i,a,c,n,r,h,f,u,m,d,v,g,x=0){if(this.n>=Ut)return;let p=this.n++;this.p[p*3]=t,this.p[p*3+1]=e,this.p[p*3+2]=s,this.v[p*3]=o,this.v[p*3+1]=i,this.v[p*3+2]=a,this.life[p*2]=c,this.life[p*2+1]=c,this.par[p*4]=n,this.par[p*4+1]=r,this.par[p*4+2]=h,this.par[p*4+3]=f,this.col[p*4]=u,this.col[p*4+1]=m,this.col[p*4+2]=d,this.col[p*4+3]=v,this.cell[p]=g,this.spin[p*2]=Math.random()*6.28,this.spin[p*2+1]=x}update(t){let e=0,s=this.aPos.array,o=this.aCol.array,i=this.aRot.array;for(let a=0;a<this.n;a++){let c=this.life[a*2]-t;if(c<=0)continue;e!==a&&(this.p.copyWithin(e*3,a*3,a*3+3),this.v.copyWithin(e*3,a*3,a*3+3),this.life[e*2+1]=this.life[a*2+1],this.par.copyWithin(e*4,a*4,a*4+4),this.col.copyWithin(e*4,a*4,a*4+4),this.cell[e]=this.cell[a],this.spin.copyWithin(e*2,a*2,a*2+2)),this.life[e*2]=c;let n=Math.exp(-this.par[e*4+3]*t);this.v[e*3]*=n,this.v[e*3+1]=this.v[e*3+1]*n-this.par[e*4+2]*t,this.v[e*3+2]*=n,this.p[e*3]+=this.v[e*3]*t,this.p[e*3+1]+=this.v[e*3+1]*t,this.p[e*3+2]+=this.v[e*3+2]*t,this.spin[e*2]+=this.spin[e*2+1]*t;let r=1-c/this.life[e*2+1],h=Math.min(1,r*6)*(1-r*r);s[e*4]=this.p[e*3],s[e*4+1]=this.p[e*3+1],s[e*4+2]=this.p[e*3+2],s[e*4+3]=this.par[e*4]+(this.par[e*4+1]-this.par[e*4])*r,o[e*4]=this.col[e*4],o[e*4+1]=this.col[e*4+1],o[e*4+2]=this.col[e*4+2],o[e*4+3]=this.col[e*4+3]*h,i[e*2]=this.cell[e],i[e*2+1]=this.spin[e*2],e++}this.n=e,this.geo.instanceCount=e,e>0&&(this.aPos.clearUpdateRanges(),this.aCol.clearUpdateRanges(),this.aRot.clearUpdateRanges(),this.aPos.addUpdateRange(0,e*4),this.aCol.addUpdateRange(0,e*4),this.aRot.addUpdateRange(0,e*2),this.aPos.needsUpdate=!0,this.aCol.needsUpdate=!0,this.aRot.needsUpdate=!0)}clear(){this.n=0,this.geo.instanceCount=0}};function ie(l,t,e,s,o=18,i=[1.6,1.3,2.6]){for(let a=0;a<o;a++){let c=Math.random()*Math.PI*2,n=(Math.random()-.2)*1.2,r=1.2+Math.random()*2.2;l.emit(t,e,s,Math.cos(c)*Math.cos(n)*r,Math.sin(n)*r+1.2,Math.sin(c)*Math.cos(n)*r,.7+Math.random()*.5,.28,.05,1.6,2.2,i[0],i[1],i[2],1,3)}}function xe(l,t,e,s,o=1){l.emit(t+(Math.random()-.5)*.3,e,s+(Math.random()-.5)*.3,(Math.random()-.5)*.3,.8+Math.random()*.6,(Math.random()-.5)*.3,.9,.18*o,.6*o,-.4,1.4,1.9,.8,.3,.55,3)}var ss=8;function xi(){let l=new Jt.SphereGeometry(.16,20,14),t=l.getAttribute("position");for(let e=0;e<t.count;e++){let s=t.getX(e),o=t.getY(e),i=t.getZ(e);if(o>0){let a=o/.16;o*=1+a*.9,s*=1-a*.75,i*=1-a*.75}t.setXYZ(e,s,o,i)}return l.computeVertexNormals(),l}var Pe=class{constructor(t,e,s){this.G=t,this.geo=xi(),this.mat=new Jt.ShaderMaterial({vertexShader:`
				varying vec3 vN; varying vec3 vW; varying vec3 vL;
				void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
				${tt}
				${Ht}
				${xt}
				varying vec3 vN; varying vec3 vW; varying vec3 vL;
				void main() {
					vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
					float fr = pow(1.0 - max(dot(N, V), 0.0), 2.2);
					vec3 c = vec3(0.015, 0.01, 0.035) + vec3(0.62, 0.52, 1.25) * fr * 1.8;
					float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 90.0);
					c += uSunCol * 0.35 * sp;
					// i\xE7inde k\u0131p\u0131rdayan y\u0131ld\u0131z tozu
					float tw = sin(vL.x * 60.0 + uTime * 3.0) * sin(vL.y * 50.0 - uTime * 2.3) * sin(vL.z * 55.0 + uTime * 1.7);
					c += vec3(1.2, 1.1, 2.0) * smoothstep(0.82, 0.98, tw) * (1.0 - fr);
					gl_FragColor = finish(c, 1.0);
				}`,uniforms:{...t}}),this.meshes=[];for(let i=0;i<ss;i++){let a=new Jt.Mesh(this.geo,this.mat);a.visible=!1,a.renderOrder=6,s.add(a),this.meshes.push(a)}let o=Array.from({length:ss},()=>new Jt.Vector3(0,-999,0));this.glow=se(o,e.glow,t,.55,9403647),this.glow.mat.uniforms.uK.value=.7,s.add(this.glow.mesh),this.list=[],this._p={},this._L=new Jt.Vector3}setup(t,e,s,o){this.list=o.map(([i,a],c)=>{let n=e+(s-e)*i,r=t.sample(n,{}),h=a*.62;return{i:c,s:n,x:r.x+r.sx*h,y:r.y+.55,z:r.z+r.sz*h,melt:0,state:"idle",t:0,lit:0}});for(let i=0;i<ss;i++)this.meshes[i].visible=i<this.list.length;this.glow.mesh.geometry.instanceCount=this.list.length}get total(){return this.list.length}get got(){return this.list.filter(t=>t.state==="got"||t.state==="fly").length}get lost(){return this.list.filter(t=>t.state==="lost").length}update(t,e,s,o,i,a,c,n,r,h){let f=this.glow.attr.array;for(let u of this.list){let m=this.meshes[u.i];if(u.t+=t,u.state==="idle"){if(h&&u.s-s<9&&u.s-s>-1){let g=!i.blocked(u.x,u.y+.1,u.z,a)||this.beams&&this.beams.litAt(u.x,u.y,u.z);u.lit=gt(u.lit,g?1:0,12,t),g?(u.melt=Math.min(1,u.melt+t*.3),Math.random()<t*14&&xe(c,u.x,u.y+.15,u.z,.6),u.melt>=1&&(u.state="lost",ie(c,u.x,u.y,u.z,12,[2.4,.9,.3]),r(u))):u.melt=Math.max(0,u.melt-t*.12)}h&&Math.abs(u.s-s)<.55&&(u.state="fly",u.t=0);let d=1-u.melt*.65,v=u.lit*.02;m.position.set(u.x+(Math.random()-.5)*v,u.y+Math.sin(e*2.2+u.i)*.07,u.z+(Math.random()-.5)*v),m.rotation.y=e*.8+u.i,m.scale.setScalar(d),f[u.i*4]=m.position.x,f[u.i*4+1]=m.position.y,f[u.i*4+2]=m.position.z,f[u.i*4+3]=.55*d*(1-u.lit*.5)}else if(u.state==="fly"){let d=Math.min(1,u.t/.28);m.position.set(u.x+(o.x-u.x)*d,u.y+(o.y+.5-u.y)*d+Math.sin(d*Math.PI)*.4,u.z+(o.z-u.z)*d),m.scale.setScalar(1-d*.8),f[u.i*4]=m.position.x,f[u.i*4+1]=m.position.y,f[u.i*4+2]=m.position.z,f[u.i*4+3]=.55*(1-d),d>=1&&(u.state="got",m.visible=!1,f[u.i*4+3]=0,ie(c,o.x,o.y+.6,o.z,20),n(u))}else m.visible=!1,f[u.i*4+3]=0}this.glow.attr.needsUpdate=!0}hideAll(){for(let t of this.meshes)t.visible=!1;this.glow.mesh.geometry.instanceCount=0,this.list=[]}};import*as zt from"three";var Fe=6,De={x:0,y:0,z:0},Ie=class{constructor(t,e,s,o){this.list=o.crystals.list.map(r=>({...r,lit:0,on:!1,hx:0,hy:0,hz:0,cx:0,cy:0,cz:0,hitT:0})),this.gemMat=o.crystalMat;let i=new zt.InstancedBufferGeometry,a=new zt.PlaneGeometry(1,1);i.setIndex(a.index),i.setAttribute("position",a.getAttribute("position")),this.aA=new zt.InstancedBufferAttribute(new Float32Array(Fe*4),4).setUsage(zt.DynamicDrawUsage),this.aB=new zt.InstancedBufferAttribute(new Float32Array(Fe*4),4).setUsage(zt.DynamicDrawUsage),i.setAttribute("iA",this.aA),i.setAttribute("iB",this.aB),i.instanceCount=0,this.geo=i;let c=new zt.ShaderMaterial({vertexShader:`
				attribute vec4 iA; attribute vec4 iB;
				varying vec2 vUv; varying float vA;
				void main() {
					vec3 a = iA.xyz, b = iB.xyz;
					vec3 ax = b - a;
					vec3 mid = a + ax * (position.y + 0.5);
					vec3 side = normalize(cross(ax, cameraPosition - mid));
					vec3 w = mid + side * position.x * iA.w;
					vUv = position.xy + 0.5;
					vA = iB.w;
					gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
				}`,fragmentShader:`
				${tt}
				varying vec2 vUv; varying float vA;
				void main() {
					float x = abs(vUv.x - 0.5) * 2.0;
					float core = exp(-x * x * 18.0) + exp(-x * x * 3.0) * 0.35;
					float ends = smoothstep(0.0, 0.06, vUv.y) * (0.55 + 0.45 * smoothstep(1.0, 0.85, vUv.y));
					float shimmer = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 9.0);
					vec3 c = (uSunCol * 0.45 + vec3(0.6, 0.5, 0.35)) * core * ends * shimmer * vA;
					gl_FragColor = vec4(c / (1.0 + c * 0.25), 1.0);
				}`,uniforms:{...t},transparent:!0,depthWrite:!1,blending:zt.AdditiveBlending,side:zt.DoubleSide});this.mesh=new zt.Mesh(i,c),this.mesh.frustumCulled=!1,this.mesh.renderOrder=26,s.add(this.mesh);let n=Array.from({length:Fe},()=>new zt.Vector3(0,-999,0));this.spots=se(n,e.glow,t,1.2,16773312),this.glints=se(n,e.glow,t,1.6,16774364),this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0,s.add(this.spots.mesh,this.glints.mesh),this.active=[],this._cand=[]}update(t,e,s,o,i,a){let c=this.aA.array,n=this.aB.array,r=this.spots.attr.array,h=this.glints.attr.array,f=this.gemMat.uniforms.uLit.value;this.active.length=0;let u=0,m=0,d=o.x,v=o.y,g=o.z;for(let x=0;x<this.list.length;x++){let p=this.list[x],y=Math.abs(p.c.y-s)<15,w=!1;if(y){ve(p.anchor.x,p.anchor.y,p.anchor.z,p.w,e,De),p.cx=p.c.x+De.x,p.cy=p.c.y+De.y,p.cz=p.c.z+De.z;let T=p.n.x*d+p.n.y*v+p.n.z*g;if(T>.05&&!i.blocked(p.cx+d*.5,p.cy+v*.5,p.cz+g*.5,o)){let P=-d+2*T*p.n.x,F=-v+2*T*p.n.y,N=-g+2*T*p.n.z,L=this._cast(p.cx,p.cy,p.cz,P,F,N,i);p.hx=p.cx+P*L,p.hy=p.cy+F*L,p.hz=p.cz+N*L,p.hitT=L,w=!0}}if(p.lit=gt(p.lit,w?1:0,14,t),f[x]=p.lit,p.on=w,p.lit>.02&&u<Fe&&(c[u*4]=p.cx,c[u*4+1]=p.cy,c[u*4+2]=p.cz,c[u*4+3]=.55,n[u*4]=p.hx,n[u*4+1]=p.hy,n[u*4+2]=p.hz,n[u*4+3]=p.lit,r[u*4]=p.hx,r[u*4+1]=p.hy+.05,r[u*4+2]=p.hz,r[u*4+3]=p.hitT<39?1.3*p.lit:0,h[u*4]=p.cx,h[u*4+1]=p.cy,h[u*4+2]=p.cz,h[u*4+3]=1.7*p.lit,u++),w){this.active.push(p);let T=is(a.x,a.y+.45,a.z,p.cx,p.cy,p.cz,p.hx,p.hy,p.hz);T<.55&&(m=Math.max(m,1-Math.max(0,T-.35)/.2))}}return this.geo.instanceCount=u,this.spots.mesh.geometry.instanceCount=u,this.glints.mesh.geometry.instanceCount=u,this.aA.needsUpdate=!0,this.aB.needsUpdate=!0,this.spots.attr.needsUpdate=!0,this.glints.attr.needsUpdate=!0,m}testPoint(t,e,s,o,i,a=.55){for(let c of this.list){if(Math.abs(c.c.y-s)>15)continue;let n=c.n.x*t.x+c.n.y*t.y+c.n.z*t.z;if(n<=.05)continue;let r=c.cx||c.c.x,h=c.cy||c.c.y,f=c.cz||c.c.z;if(i.blocked(r+t.x*.5,h+t.y*.5,f+t.z*.5,t))continue;let u=-t.x+2*n*c.n.x,m=-t.y+2*n*c.n.y,d=-t.z+2*n*c.n.z,v=this._cast(r,h,f,u,m,d,i);if(is(e,s,o,r,h,f,r+u*v,h+m*v,f+d*v)<a)return!0}return!1}litAt(t,e,s,o=.35){for(let i of this.active)if(is(t,e,s,i.cx,i.cy,i.cz,i.hx,i.hy,i.hz)<o)return!0;return!1}_cast(t,e,s,o,i,a,c){let n=this._cand;n.length=0;for(let h of c.slabs){let f=h.cx-t,u=h.cy-e,m=h.cz-s,d=f*o+u*i+m*a;if(d<-h.br||d>41)continue;f*f+u*u+m*m-d*d<=h.br*h.br&&n.push(h)}let r=.16;for(let h=.35;h<40;h+=r){let f=t+o*h,u=e+i*h,m=s+a*h,d=Math.hypot(f,m);if(u<56&&d<7&&d<It(Math.atan2(m,f),u)||d<Qt&&u<Zt(f,m)+.02)return h;for(let v of n){let g=f-v.cx,x=u-v.cy,p=m-v.cz;if(!(Math.abs(g*v.Tx+x*v.Ty+p*v.Tz)>v.hT)&&!(Math.abs(g*v.Sx+p*v.Sz)>v.hS)&&!(Math.abs(x)>v.hU+.02))return h}}return 40}hide(){this.geo.instanceCount=0,this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0;for(let t of this.list)t.lit=0}};function is(l,t,e,s,o,i,a,c,n){let r=a-s,h=c-o,f=n-i,u=r*r+h*h+f*f,m=u>0?((l-s)*r+(t-o)*h+(e-i)*f)/u:0;m=m<0?0:m>1?1:m;let d=s+r*m-l,v=o+h*m-t,g=i+f*m-e;return Math.sqrt(d*d+v*v+g*g)}import*as nt from"three";var Xs=3,os=7,as=1.55,yi=[[0,1],[0,1.7],[.45,.8],[-.45,.8]];function bi(){let e=[],s=[],o=[],i=[];for(let c=0;c<=8;c++){let n=c/8,r=Math.sin(Math.min(1,n*1.15)*Math.PI)*.36+.06*(1-n);for(let h=0;h<=6;h++){let f=h/6-.5,u=f*r*2,m=-Math.pow(Math.abs(f)*2,2)*.1-Math.pow(n,2)*.22;e.push(u,n*1.05,m);let d=new nt.Vector3(-u*.6,.15-n*.2,1).normalize();s.push(d.x,d.y,d.z),o.push(.75+n*.25,n,1,1)}}for(let c=0;c<8;c++)for(let n=0;n<6;n++){let r=c*7+n;i.push(r,r+1,r+6+2,r,r+6+2,r+6+1)}let a=new nt.BufferGeometry;return a.setAttribute("position",new nt.Float32BufferAttribute(e,3)),a.setAttribute("normal",new nt.Float32BufferAttribute(s,3)),a.setAttribute("color",new nt.Float32BufferAttribute(o,4)),a.setIndex(i),a}function wi(l,t,e){return new nt.ShaderMaterial({vertexShader:`
			attribute vec4 color;
			varying vec3 vN; varying vec3 vW; varying vec4 vC;
			void main() {
				vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
				vW = w.xyz; vC = color;
				vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:`
			${tt}
			${fe}
			${Ht}
			${xt}
			uniform vec3 uA, uB; uniform float uCharge, uOpen;
			varying vec3 vN; varying vec3 vW; varying vec4 vC;
			void main() {
				vec3 N = normalize(vN);
				if (!gl_FrontFacing) N = -N;
				vec3 V = normalize(cameraPosition - vW);
				vec3 alb = mix(uA, uB, vC.g);
				float sh = shadowAt(vW, N);
				vec3 c = shadeLit(alb, N, V, 0.6 + 0.4 * vC.g, sh, 0.7, 0.6);
				c += alb * uSunCol * pow(max(dot(-V, uSunDir), 0.0), 3.0) * 0.7 * sh;
				// dolarken i\xE7ten \u0131\u015F\u0131r (ilerleme g\xF6stergesi)
				float pulse = 0.75 + 0.25 * sin(uTime * 7.0);
				c += mix(uB, vec3(1.6, 1.3, 0.7), 0.5) * uCharge * (1.0 - uOpen) * 1.6 * pulse * (0.4 + 0.6 * vC.g);
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,uniforms:{...l,uA:{value:new nt.Color(t)},uB:{value:new nt.Color(e)},uCharge:{value:0},uOpen:{value:0}},side:nt.DoubleSide})}function ki(l){return new nt.ShaderMaterial({vertexShader:`
			varying vec3 vN; varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${tt}
			${Ht}
			${xt}
			uniform float uCharge;
			varying vec3 vN; varying vec3 vW;
			void main() {
				vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
				float fr = pow(1.0 - abs(dot(N, V)), 2.2);
				vec3 c = vec3(0.32, 0.5, 0.72) * (skyAmbient(N) * 0.9 + 0.12) + vec3(0.7, 0.9, 1.2) * fr * 0.9;
				float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 80.0);
				c += uSunCol * sp * 0.9;
				c += vec3(1.4, 1.2, 0.9) * uCharge * (0.6 + 0.4 * sin(uTime * 8.0));
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,uniforms:{...l,uCharge:{value:0}}})}var We=class{constructor(t,e,s){this.G=t,this.petalGeo=bi(),this.items=[];let o={spring:[14183064,16766694],summer:[14715418,16769146],autumn:[11024924,16752704]},i=()=>{let r={};for(let[h,[f,u]]of Object.entries(o))r[h]=wi(t,f,u);return r},a=new nt.IcosahedronGeometry(1,1),c=a.getAttribute("position");for(let r=0;r<c.count;r++){let h=c.getX(r),f=c.getY(r),u=c.getZ(r),m=1+.18*Math.sin(h*7+f*3)*Math.cos(u*5);c.setXYZ(r,h*m*.95,f*m*1.05,u*m*.55)}this.iceGeo=a,this.iceGeo.computeVertexNormals();for(let r=0;r<Xs;r++){let h=i(),f=new nt.InstancedMesh(this.petalGeo,h.spring,os);f.frustumCulled=!1,f.visible=!1;let u=new nt.Mesh(this.iceGeo,ki(t));u.visible=!1,s.add(f,u),this.items.push({petals:f,ice:u,mats:h,s:0,charge:0,open:0,state:"off",x:0,y:0,z:0,tx:0,tz:0,sx:0,sz:0,kind:"bud"})}let n=Array.from({length:Xs},()=>new nt.Vector3(0,-999,0));this.glow=se(n,e.glow,t,1.8,16769696),this.glow.mesh.geometry.instanceCount=0,s.add(this.glow.mesh),this._m=new nt.Matrix4,this._q=new nt.Quaternion,this._e=new nt.Euler,this._v=new nt.Vector3,this._s=new nt.Vector3,this.list=[]}setup(t,e,s,o=[],i="spring"){this.list=[],this.items.forEach((a,c)=>{let n=o[c];if(a.petals.visible=!1,a.ice.visible=!1,!n){a.state="off";return}let r=e+(s-e)*n,h=t.sample(r,{});Object.assign(a,{s:r,x:h.x,y:h.y,z:h.z,tx:h.tx,tz:h.tz,sx:h.sx,sz:h.sz,charge:0,open:0,state:"closed"}),a.kind=i==="winter"?"ice":"bud",a.kind==="ice"?(a.ice.visible=!0,a.ice.position.set(h.x,h.y+.85,h.z),a.ice.rotation.set(0,Math.atan2(h.tx,h.tz),0),a.ice.scale.setScalar(1)):(a.petals.visible=!0,a.petals.material=a.mats[i]||a.mats.spring),this.list.push(a),this._pose(a,0)}),this.glow.mesh.geometry.instanceCount=this.list.length}_pose(t,e){if(t.kind==="ice"){let i=1-$e(e);t.ice.scale.set(Math.max(.01,i)*1.05,Math.max(.01,i)*1,Math.max(.01,i)*1),t.ice.visible=i>.02;return}let s=this._v.set(t.x,t.y+.05,t.z),o=Math.atan2(t.tx,t.tz);for(let i=0;i<os;i++){let a=i/os*Math.PI*2,c=.18+$e(e)*1.45;this._e.set(-c,o+a,0,"YXZ"),this._q.setFromEuler(this._e);let n=1.55*(1-e*.35);this._s.set(n,n*(1.05-e*.2),n);let r=.12+e*.55,h=s.x+Math.sin(o+a)*r,f=s.z+Math.cos(o+a)*r;this._m.compose(this._v.set(h,s.y-e*.05,f),this._q,this._s),t.petals.setMatrixAt(i,this._m),this._v.copy(s)}t.petals.instanceMatrix.needsUpdate=!0}limit(t){let e=1/0;for(let s of this.list)s.state!=="open"&&s.s>t-.2&&(e=Math.min(e,s.s-as));return e}update(t,e,s,o,i,a,c){let n=this.glow.attr.array,r=0;for(let h of this.list){let f=h.s-e<as+.5&&h.s-e>-.5;if(h.state==="closed"&&!f)h.charge=Math.max(0,h.charge-t*.1);else if(h.state==="closed"){let m=0,d=yi;for(let[v,g]of d){let x=h.x+h.sx*v,p=h.z+h.sz*v;(!o.blocked(x,h.y+g,p,s)||i&&i.litAt(x,h.y+g,p,.5))&&m++}m/=d.length,h.charge=lt(h.charge+(m>0?m*.6:-.1)*t,0,1),m>0&&Math.random()<t*10&&ie(a,h.x+(Math.random()-.5),h.y+1+Math.random(),h.z+(Math.random()-.5),1,[2.2,1.7,.8]),h.charge>=1&&(h.state="opening",c(h),ie(a,h.x,h.y+1.2,h.z,26,[2.4,2,1]))}else h.state==="opening"&&(h.open=Math.min(1,h.open+t/.9),this._pose(h,h.open),h.open>=1&&(h.state="open"));let u=h.kind==="ice"?h.ice.material:h.petals.material;u.uniforms.uCharge.value=h.charge,u.uniforms.uOpen&&(u.uniforms.uOpen.value=h.open),n[r*4]=h.x,n[r*4+1]=h.y+1.1,n[r*4+2]=h.z,n[r*4+3]=h.state==="open"?0:.6+h.charge*1.6,r++}this.glow.attr.needsUpdate=!0}pending(t){for(let e of this.list)if(e.state==="closed"&&e.s>t-.2&&e.s-t<as+.3)return e;return null}hide(){for(let t of this.items)t.petals.visible=!1,t.ice.visible=!1,t.state="off";this.list=[],this.glow.mesh.geometry.instanceCount=0}};var ht=(l=0,t=0,e=0)=>new Ks.Vector3(l,t,e),Mi=3.6,Ti=.42,Ei=.2,Ve=class{constructor(t,e,s){this.app=t,this.ui=e,this.sfx=s;let o=t.world;this.world=o,this.curve=o.curve,this.G=t.G,this.store=t.store,this.tester=new Ce(o),this.zifir=new Ae(t.G,o.tex,{segs:t.tier.id>=1?40:28}),this.zifir.g.visible=!1,o.scene.add(this.zifir.g),this.drops=new Pe(t.G,o.tex,o.scene),this.beams=new Ie(t.G,o.tex,o.scene,o),this.drops.beams=this.beams,this.locks=new We(t.G,o.tex,o.scene),this.fx=new ge(t.G,o.tex.particles,{additive:!0}),this.petals=new ge(t.G,o.tex.particles,{additive:!1}),o.scene.add(this.fx.mesh,this.petals.mesh),this.prog=Object.assign({unlocked:0,stars:[],dust:0,fails:{},seen:{},intro:!1},this.store.get("progress")||{}),this.settings=Object.assign({sound:!0,haptics:!0,quality:"auto",power:"auto"},this.store.get("settings")||{}),this.sfx.setOn(this.settings.sound),this.state="title",this.stateT=0,this.level=null,this.li=0,this.s=0,this.speed=0,this.hold=!1,this.keyHold=!1,this.meter=1,this.expo=0,this.minMeter=1,this.burnTotal=0,this.sunAz=0,this.sunTarget=0,this.elev=34,this.levelT=0,this.dragged=!1,this.sunDir=ht(0,1,0),this.zp=ht(),this._ahead=ht(),this._smp={},this._smp2={},this._hintUntil=0,this._hintQueue=[],this._pts=[ht(),ht(),ht(),ht(),ht(),ht()],this.rays=t.tier.id>=1?6:4,this.envFrom="spring",this.envTo="spring",this.envT=1,this.envDur=1,this._titleSeason=0,this._bindInput(),this.ui.setToggles(this.settings),this.ui.setPlayLabel(this.prog.unlocked>0||this.prog.intro?"Devam Et":"Ba\u015Fla"),this.goTitle(!0)}_bindInput(){let t=this.app.container,e=null,s=0;t.addEventListener("pointerdown",i=>{this.sfx.unlock(),!i.target.closest("button")&&e===null&&(e=i.pointerId,s=i.clientX,this.state==="intro"&&this.ui.skip(!0))}),t.addEventListener("pointermove",i=>{if(i.pointerId!==e)return;let a=i.clientX-s;s=i.clientX,this.drag(a/Math.max(320,t.clientWidth))});let o=i=>{i.pointerId===e&&(e=null)};t.addEventListener("pointerup",o),t.addEventListener("pointercancel",o),this._onKey=i=>{i.repeat&&i.key!=="ArrowLeft"&&i.key!=="ArrowRight"||(i.key==="ArrowLeft"?this.drag(-.06):i.key==="ArrowRight"?this.drag(.06):i.key===" "?(this.keyHold=i.type==="keydown",i.preventDefault()):i.key==="Escape"&&i.type==="keydown"&&(this.state==="play"||this.state==="ready"?this.pause():this.state==="paused"&&this.resume()))},window.addEventListener("keydown",this._onKey),window.addEventListener("keyup",this._onKey)}drag(t){this.state!=="play"&&this.state!=="ready"||(this.sunTarget-=t*D*.85,!this.dragged&&Math.abs(t)>.004&&(this.dragged=!0,this.state==="ready"&&this._begin()))}wait(t){this.hold=t}_set(t){this.state=t,this.stateT=0,this.app.wake()}envTo2(t,e=2){this.envT<1?this.envFrom=this.envT>.5?this.envTo:this.envFrom:this.envFrom=this.envTo,this.envTo=t,this.envT=0,this.envDur=e}goTitle(t=!1){this._set("title"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.show("title"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.app.gov.menu=!0,t?(this.envFrom=this.envTo="spring",this.envT=1):this.envTo2("spring",1.5),this._orbit={a:.6,r:92,y:20,ly:30}}goLevels(){this._set("levels"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.renderLevels(te,this.prog),this.ui.show("levels"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.app.gov.menu=!0,this._orbit||(this._orbit={a:.6,r:92,y:20,ly:30})}action(t){if(this.sfx.unlock(),this.sfx.ui(),t==="play")this.prog.intro?this.startLevel(Math.min(this.prog.unlocked,me-1)):this.startIntro();else if(t==="levels")this.goLevels();else if(t==="title")this.goTitle();else if(t==="exit")this.app.exit();else if(t.startsWith("lv:")){let e=Number(t.slice(3));e<=this.prog.unlocked?this.startLevel(e):this.ui.toast("\xD6nceki b\xF6l\xFCm\xFC tamamla")}else t==="pause"?this.pause():t==="resume"?this.resume():t==="retry"?this.startLevel(this.li,{retry:!0}):t==="next"?this.startLevel(Math.min(this.li+1,me-1),{cont:!0}):t==="skip"?this.skipIntro():t==="settings"&&(this._settingsFromTitle=!0,this.ui.$(".uk-card h4").textContent="Ayarlar",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Tamam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="none",this.ui.$("[data-s=pause] [data-a=levels]").style.display="none",this.ui.show("pause"))}toggle(t){let e=this.settings;if(t==="sound")e.sound=!e.sound,this.sfx.setOn(e.sound);else if(t==="haptics")e.haptics=!e.haptics;else if(t==="quality"){let s=["auto",0,1,2];e.quality=s[(s.indexOf(e.quality)+1)%s.length],this.ui.toast("Grafik ayar\u0131 bir sonraki a\xE7\u0131l\u0131\u015Fta uygulan\u0131r")}else if(t==="power"){let s=["auto","saver","performance"];e.power=s[(s.indexOf(e.power)+1)%s.length],this.app.gov.power=e.power,this.app.resize()}this.store.set("settings",e),this.ui.setToggles(e)}pause(){this.state!=="play"&&this.state!=="ready"||(this._paused=this.state,this._set("paused"),this._settingsFromTitle=!1,this.ui.$(".uk-card h4").textContent="Duraklat\u0131ld\u0131",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Devam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="",this.ui.$("[data-s=pause] [data-a=levels]").style.display="",this.ui.show("pause"),this.sfx.tick(0,0,0,!1))}resume(){if(this._settingsFromTitle){this._settingsFromTitle=!1,this.ui.show("title");return}this.state==="paused"&&(this.ui.show(null),this._set(this._paused||"play"))}haptic(t){if(this.settings.haptics&&!(this.app.hooks.haptic&&this.app.hooks.haptic(t)===!0))try{navigator.vibrate&&navigator.vibrate(t)}catch{}}startIntro(){this._set("intro"),this.ui.show(null),this.ui.hudOn(!1),this.app.gov.menu=!1,this.envFrom=this.envTo="spring",this.envT=1;let t=Je(0);this._setupLevelData(0);let e=this.curve.sample(this.s,this._smp),s=this.curve.sample(this.s+3,this._smp2),o=this.app.rig;o.followTarget(ht(e.x,e.y,e.z),ht(s.x,s.y,s.z));let i=o.tPos.clone(),a=o.tLook.clone(),c=Math.atan2(e.z,e.x);o.play([{t:0,pos:ht(Math.cos(c+1.3)*150,-6,Math.sin(c+1.3)*150),look:ht(0,22,0),fov:44},{t:4.5,pos:ht(Math.cos(c+.9)*62,14,Math.sin(c+.9)*62),look:ht(0,30,0),fov:46},{t:8.5,pos:ht(Math.cos(c+.4)*30,59,Math.sin(c+.4)*30),look:ht(0,55,0),fov:50},{t:11.5,pos:i,look:a}],()=>this._enterLevel(0,{fromIntro:!0})),this.sunAz=this.sunTarget=c+Math.PI*.6,this.zifir.g.visible=!0,this._lore=[[.6,"G\xF6k ile yeri bir a\u011Fa\xE7 ba\u011Flar: Ulu Kay\u0131n."],[4.4,"T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 k\xF6klerine d\xFC\u015Ft\xFC."],[8,"G\xFCne\u015F a\u011Fac\u0131n \xE7evresinde d\xF6ner; g\xF6lgesi Zifir\u2019in yoludur."]],this._loreI=0,this.ui.skip(!0)}skipIntro(){this.state==="intro"&&(this.ui.lore(null),this.ui.skip(!1),this.app.rig.skipCine())}_setupLevelData(t){this.li=t,this.level=Je(t);let e=this.level;[this.s0,this.s1]=_e(this.curve,t),this.s=this.s0,this.drops.setup(this.curve,this.s0,this.s1,e.drops),this.locks.setup(this.curve,this.s0,this.s1,e.locks,e.season),this.ui.setLevel(e),this.ui.setDrops(0,e.drops.length),this.sfx.resetDrops(),this.sfx.season=e.season,this.meter=1,this.minMeter=1,this.burnTotal=0,this.expo=0,this.speed=0,this.levelT=0,this.dragged=!1,this.got=0,this.lostN=0;let s=this.prog.fails[t]||0;this.mercy=Math.max(.55,1-.12*s),this.burnK=(e.burn||1)*this.mercy,this.elev=e.elev[0],Tt.str=e.wind,Tt.gust=0,this._gate=0,this._lockT=0,this._arcOn=!1,this.ui.lockArc(null)}startLevel(t,{retry:e=!1,cont:s=!1}={}){let o=s&&this.level&&this.li===t-1,i=this.s;this._setupLevelData(t),this.zifir.reset(),this.zifir.g.visible=!0,this.fx.clear(),this.petals.clear(),o?(this._walkFrom=i,this.s=i):this._walkFrom=null,this._enterLevel(t,{retry:e,cont:o})}_enterLevel(t,{retry:e=!1,fromIntro:s=!1,cont:o=!1}={}){let i=this.level;this._set("enter"),this.ui.show(null),this.ui.hudOn(!1),this.ui.lore(null),this.ui.skip(!1),this.app.gov.menu=!1,this.envTo!==i.season&&this.envTo2(i.season,o?3:1.6);let a=this.curve.sample(this.s0,this._smp),c=Math.atan2(a.z,a.x);s?this.sunTarget=c+i.sunStart:this.sunAz=this.sunTarget=c+i.sunStart;let n=this.app.rig,r=this.curve.sample(this.s0+3,this._smp2);if(n.followTarget(ht(a.x,a.y,a.z),ht(r.x,r.y,r.z)),!s&&!e&&!o){let h=n.tPos.clone(),f=n.tLook.clone(),u=n.pos.clone(),m=ht(Math.cos(c-.6)*34,a.y+9,Math.sin(c-.6)*34);n.play([{t:0,pos:u,look:n.look.clone()},{t:1.4,pos:m,look:ht(a.x*.5,a.y+1,a.z*.5)},{t:2.6,pos:h,look:f}],null)}else e?(n.mode="follow",n.snap()):n.mode="follow";this.ui.card(i.kicker,i.title,i.finale?"Son b\xF6l\xFCm":""),this._cardT=2.4,this.ui.setDrops(0,i.drops.length),this._queueHints(i.hints||[])}_queueFront(t){this._hintQueue.includes(t)||this._hintQueue.unshift(t)}_queueHints(t){this._hintQueue=t.filter(e=>!this.prog.seen[e])}_showHint(t,e=4.5){this.ui.hint(t),this._hintUntil=this.levelT+e,this._hintKey=t,this.prog.seen[t]=!0,this.store.set("progress",this.prog)}_begin(){this._set("play"),this.ui.hudOn(!0),this._hintKey==="drag"&&(this.ui.hint(null),this._hintKey=null,this._hintQueue[0]==="hide"&&this._showHint(this._hintQueue.shift(),4.5))}update(t,e){this.stateT+=t,this.envT<1&&(this.envT=Math.min(1,this.envT+t/this.envDur));let s=this.state;if(s==="title"||s==="levels")return this._updateOrbit(t,e);if(s==="intro")return this._updateIntro(t,e);if(s==="paused"||s==="complete"||s==="fail"||s==="ending"){this.app.idle=this.stateT>1.2,this._updateZifirOnly(t,e,s==="paused");return}this.app.idle=!1;let o=this.level;this.levelT+=s==="play"?t:0;let i=this.curve,a=this.sunTarget-this.sunAz,c=Mi*t;this.sunAz+=lt(a,-c,c),Tt.gust=s==="play"?Ws(o.gust,this.levelT):0,this.ui.gust(s==="play"&&ts(o.gust,this.levelT)<1.6&&Tt.gust<.05),s==="play"&&o.gust&&ts(o.gust,this.levelT)<1.6&&this._hintQueue[0]==="gust"&&this._showHint(this._hintQueue.shift(),4);let n=!1;if(s==="enter")this._cardT-=t,this._cardT<.4&&this.ui.card(null),this._walkFrom!=null&&this.s<this.s0&&(this.s=Math.min(this.s0,this.s+1.4*t),n=!0),this.app.rig.mode!=="cine"&&this._cardT<.6&&(this._walkFrom==null||this.s>=this.s0)&&(this.ui.card(null),this.ui.hudOn(!0),this.li===0&&!this.prog.seen.drag?(this._set("ready"),this._showHint(this._hintQueue.shift()||"drag",999)):(this._set("play"),this._hintQueue.length&&this._hintQueue[0]!=="gust"&&this._hintQueue[0]!=="bridge"&&this._showHint(this._hintQueue.shift(),4.5)));else if(s==="ready")this.stateT>7&&this._begin();else if(s==="play"){let x=this.hold||this.keyHold,p=this.locks.limit(this.s),y=this.s>=p-.05,w=lt((p-this.s)/.7,0,1),T=x?0:o.speed*w;if(this.speed=gt(this.speed,T,x?14:5,t),this.s=Math.min(this.s+this.speed*t,Math.max(this.s,p)),n=this.speed>.15,y&&!this.prog.seen.lock&&this._showHint("lock",6),this._lockT=y?(this._lockT||0)+t:0,this._lockT>4?this._lockAssist():this._arcOn&&(this.ui.lockArc(null),this._arcOn=!1),this._hintQueue[0]==="bridge")for(let P of le){let F=i.sAtTheta(P.th);F>this.s&&F-this.s<9&&this._showHint(this._hintQueue.shift(),4.5)}}let r=i.sample(this.s,this._smp);this.zp.set(r.x,r.y,r.z);let h=i.sample(Math.min(i.length,this.s+3.2),this._smp2);this._ahead.set(h.x,h.y,h.z);let f=Math.atan2(r.z,r.x),u=lt((this.s-this.s0)/(this.s1-this.s0),0,1);this.elev=O(o.elev[0],o.elev[1],u),de(this.sunAz,this.elev,this.sunDir);let m=s==="play";this.tester.setTime(e);let d=0;if(m||s==="ready"){let x=this._pts,p=r.tx,y=r.tz,w=r.sx,T=r.sz;x[0].set(r.x,r.y+.48,r.z),x[1].set(r.x,r.y+.86,r.z),x[2].set(r.x+w*.3,r.y+.36,r.z+T*.3),x[3].set(r.x-w*.3,r.y+.36,r.z-T*.3),x[4].set(r.x+p*.3,r.y+.36,r.z+y*.3),x[5].set(r.x-p*.3,r.y+.36,r.z-y*.3);for(let P=0;P<this.rays;P++){let F=x[P];this.tester.blocked(F.x,F.y,F.z,this.sunDir)||d++}d/=this.rays}let v=0;s!=="title"&&s!=="levels"&&(v=this.beams.update(t,e,r.y,this.sunDir,this.tester,this.zp)),v>0&&m&&this._hintQueue[0]!=="crystal"&&!this.prog.seen.crystal&&this._queueFront("crystal"),this.beams.active.length&&m&&this._hintQueue[0]==="crystal"&&this._showHint(this._hintQueue.shift(),5),d=Math.max(d,v),this.expo=gt(this.expo,d,18,t),m&&(d>.01?(this.meter-=d*Ti*this.burnK*t,this.burnTotal+=d*t,this._wasSafe&&this.haptic(8),this._wasSafe=!1,Math.random()<t*22*d&&xe(this.fx,r.x,r.y+.7,r.z,.9)):(this.meter=Math.min(1,this.meter+Ei*t),this._wasSafe=!0),this.minMeter=Math.min(this.minMeter,this.meter)),this.G.uDanger.value=gt(this.G.uDanger.value,m?d*.8+(1-this.meter)*.4*d:0,8,t),this.drops.update(t,e,this.s,this.zp,this.tester,this.sunDir,this.fx,()=>{this.got++,this.ui.setDrops(this.got,this.drops.total,"pop"),this.sfx.drop(),this.haptic(12)},()=>{this.lostN++,this.ui.setDrops(this.got,this.drops.total,"bad"),this.sfx.dropLost(),this.haptic(40),this.prog.seen.drops!==!0&&this._showHint("drops",4)},m),(m||s==="ready")&&this.locks.update(t,this.s,this.sunDir,this.tester,this.beams,this.fx,()=>{this.sfx.unlockOpen?this.sfx.unlockOpen():this.sfx.win(),this.haptic([15,30,15]),this._hintKey==="lock"&&(this.ui.hint(null),this._hintKey=null),this.ui.lockArc(null),this._arcOn=!1,this._lockT=0}),this._hintKey&&this._hintKey!=="drag"&&this.levelT>this._hintUntil&&(this.ui.hint(null),this._hintKey=null),m&&this.meter<=0?this._die():m&&this.s>=this.s1&&this._win(),s!=="dying"&&s!=="gate"&&this.zifir.update(t,e,{x:r.x,y:r.y,z:r.z,yaw:Math.atan2(r.tx,r.tz),moving:n,speed:n?Math.max(this.speed,1.2):0,hold:s==="play"&&(this.hold||this.keyHold),burn:m?d:0,lit:d,meter:this.meter},()=>this.sfx.step());let g=this.app.rig;g.mode==="follow"&&g.followTarget(this.zp,this._ahead),this.ui.compass(ye(this.sunAz-f),d>.01),this.sfx.tick(t,m?d:0,Tt.str+Tt.gust,m),this._commonFx(t)}_lockAssist(){if(this._assistT=(this._assistT||0)-1,this._assistT>0)return;this._assistT=15;let t=this.locks.pending(this.s);if(!t)return;let e=this.curve.sample(this.s,{}),s=Math.atan2(e.z,e.x),o=this._Lt||(this._Lt=ht()),i=[];for(let r=0;r<72;r++){let h=r/72*D-Math.PI;de(s+h,this.elev,o);let f=!1;for(let m of[.48,.86,.36])this.tester.blocked(e.x,e.y+m,e.z,o)||(f=!0);if(f)continue;let u=!1;for(let m of[1,1.7,.8])this.tester.blocked(t.x,t.y+m,t.z,o)||(u=!0);u&&i.push(h)}if(!i.length)return;let a=ye(this.sunAz-s),c=null,n=0;for(;n<i.length;){let r=n;for(;r+1<i.length&&i[r+1]-i[r]<.1;)r++;let h=(i[n]+i[r])/2,f=Math.abs(ye(h-a));(!c||f<c.d)&&(c={a0:i[n]-.04,a1:i[r]+.04,d:f}),n=r+1}this.ui.lockArc(c.a0,c.a1),this._arcOn=!0}_commonFx(t){this.fx.update(t),this.petals.update(t),this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp)}_updateZifirOnly(t,e,s){if(s)return;let o=this.curve.sample(this.s,this._smp);(this.state==="complete"||this.state==="ending")&&this.zifir.update(t,e,{x:o.x,y:o.y,z:o.z,yaw:Math.atan2(o.tx,o.tz),moving:!1,speed:0,hold:!1,burn:0,lit:0,meter:1}),this._commonFx(t)}_updateOrbit(t,e){let s=this._orbit;s.a+=t*.05;let o=this.app.rig;o.mode="manual";let i=this.app.rig.aspect<1?s.r*1.12:s.r;o.pos.set(Math.cos(s.a)*i,s.y+Math.sin(e*.1)*3,Math.sin(s.a)*i),o.look.set(0,s.ly,0),this.sunAz=s.a+1.1+Math.sin(e*.07)*.6,this.elev=30;let a=["spring","summer","autumn","winter"];if(this._titleSeason+=t,this._titleSeason>9){this._titleSeason=0;let c=a[(a.indexOf(this.envTo)+1)%4];this.envTo2(c,3)}Tt.str=.25,Tt.gust=0,this.elev=null,this.app.sunAz=this.sunAz,this.app.elev=null,this.app.focus.set(0,30,0),this.app.idle=!1,this.fx.update(t),this.petals.update(t)}_updateIntro(t,e){let s=this.app.rig,o=s.cine?s.cine.t:99;for(;this._loreI<this._lore.length&&o>=this._lore[this._loreI][0];)this.ui.lore(this._lore[this._loreI][1]),this._loreI++;o>10.6&&this.ui.lore(null);let i=this.curve.sample(this.s,this._smp);this.zp.set(i.x,i.y,i.z),this.zifir.update(t,e,{x:i.x,y:i.y,z:i.z,yaw:Math.atan2(i.tx,i.tz),moving:!1,speed:0,hold:!1,burn:0,lit:0,meter:1}),this.sunAz+=t*.12,this.elev=34,this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp),this.fx.update(t),this.petals.update(t),!s.cine&&this.state==="intro"&&(this.prog.intro=!0,this.store.set("progress",this.prog))}_die(){this._set("dying"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.sfx.fail(),this.haptic([30,40,60]),this.prog.fails[this.li]=(this.prog.fails[this.li]||0)+1,this.store.set("progress",this.prog);let t=performance.now(),e=this.zifir,s=this.zp.clone(),o=()=>{let i=Math.min(1,(performance.now()-t)/1300);e.evaporate(i),Math.random()<.6&&xe(this.fx,s.x,s.y+.4,s.z,1.3),this.app.wake(),i<1?requestAnimationFrame(o):(this._set("fail"),this.G.uDanger.value=0,this.ui.showFail({progress:lt((this.s-this.s0)/(this.s1-this.s0),0,1),mercy:this.prog.fails[this.li]>=1}))};requestAnimationFrame(o)}_win(){let t=this.level;this._set(t.finale?"gate":"won"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.G.uDanger.value=0,this.zifir.hop(),this.sfx.win(),this.haptic([20,40,20,40,60]);let e=this.zp,s={spring:0,summer:3,autumn:1,winter:2}[t.season];for(let h=0;h<46;h++){let f=Math.random()*D,u=Math.random()*3;this.petals.emit(e.x+Math.cos(f)*u,e.y+3+Math.random()*3,e.z+Math.sin(f)*u,(Math.random()-.5)*1.2,-.3-Math.random()*.6,(Math.random()-.5)*1.2,3+Math.random()*1.5,.22,.2,.25,.6,1,1,1,1,s,(Math.random()-.5)*4)}ie(this.fx,e.x,e.y+.8,e.z,30,[2.6,2,.9]);let o=this.drops.total,i=[!0,o===0||this.got===o,this.minMeter>.9],a=i.filter(Boolean).length,c=this.prog.stars[this.li]||0,n=10+this.got*5+(i[2]?10:0)+(a===3?10:0),r=a>c?n:Math.round(n*.25);this.prog.stars[this.li]=Math.max(c,a),this.prog.unlocked=Math.min(me-1,Math.max(this.prog.unlocked,this.li+1)),this.prog.dust+=r,this.prog.fails[this.li]=0,this.store.set("progress",this.prog),this.app.hooks.onReward&&this.app.hooks.onReward({level:this.li,stars:a,dust:r,drops:this.got}),this._result={title:t.title,kicker:t.kicker,stars:i,dust:r,last:this.li===me-1},t.finale?this._gateSeq():setTimeout(()=>{this.state==="won"&&(this._set("complete"),this.ui.showComplete(this._result))},1500)}_gateSeq(){let t=this.world.island,e=t.gatePos.clone(),s=this.zp.clone(),o=this.app.rig,i=t.gateOut,a=e.clone().addScaledVector(i,14).add(ht(0,4,0));o.play([{t:0,pos:o.pos.clone(),look:o.look.clone()},{t:2.2,pos:e.clone().addScaledVector(i,9).add(ht(0,2.5,0)),look:e.clone()},{t:6.5,pos:a.add(ht(0,16,0)),look:ht(0,22,0),fov:55}],null),this.envTo2("night",5);let c=performance.now(),n=this.zifir,r=()=>{let h=(performance.now()-c)/1e3,f=lt((h-.6)/1.6,0,1),u=s.clone().lerp(ht(e.x,s.y,e.z),f);n.g.position.copy(u),n.setFade(1-_t(.7,1,f)),this.world.gateMat.uniforms.uOpen.value=_t(0,1.2,h),h<7?requestAnimationFrame(r):(n.g.visible=!1,this._set("ending"),this.ui.showEnding(this.prog.dust))};requestAnimationFrame(r)}envState(){let t=this.envT;return[this.envFrom,this.envTo,t*t*(3-2*t)]}destroy(){window.removeEventListener("keydown",this._onKey),window.removeEventListener("keyup",this._onKey)}};var Ys=`
.uk-root{--ivory:#fff4e2;--ivory-dim:rgba(255,244,226,.66);--gold:#f2c46d;--gold2:#ffdf9e;--ink:#120e1f;--violet:#9d8cff;
  --glass:rgba(24,18,42,.62);--glass-b:rgba(255,240,220,.2);
  --sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px);
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;--sans:'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-family:var(--sans);color:var(--ivory);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.uk-root *{box-sizing:border-box;margin:0;padding:0}
.uk-canvas{position:absolute;inset:0;display:block;touch-action:none;outline:none}
.uk-ui{position:absolute;inset:0;pointer-events:none}
.uk-ui button{font-family:var(--sans);-webkit-appearance:none;appearance:none;border:0;background:none;color:inherit;cursor:pointer;touch-action:manipulation;pointer-events:auto}
.uk-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;opacity:0;visibility:hidden;transition:opacity .45s ease,visibility 0s linear .45s}
.uk-scr.on{opacity:1;visibility:visible;transition:opacity .45s ease,visibility 0s}
.uk-scr.on .uk-tap{pointer-events:auto}

.uk-btn{position:relative;height:56px;min-width:210px;padding:0 32px;border-radius:999px;font-weight:800;font-size:15px;letter-spacing:.14em;text-transform:uppercase;
  display:inline-flex;align-items:center;justify-content:center;gap:10px;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .3s}
.uk-btn:active{transform:scale(.94)}
.uk-btn.pri{color:#2a1a08;background:linear-gradient(180deg,#fff0c8 0%,#f6cf7c 46%,#e7a94e 100%);
  box-shadow:0 10px 30px rgba(255,176,80,.34),inset 0 1px 0 rgba(255,255,255,.85),inset 0 -2px 6px rgba(150,80,10,.25)}
.uk-btn.pri::after{content:"";position:absolute;inset:-3px;border-radius:inherit;border:1px solid rgba(255,226,160,.45);animation:ukHalo 2.6s ease-in-out infinite;pointer-events:none}
@keyframes ukHalo{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.9;transform:scale(1.04)}}
.uk-btn.gh{height:46px;min-width:0;padding:0 22px;font-size:12px;color:var(--ivory);background:var(--glass);border:1px solid var(--glass-b)}
.uk-ico{width:46px;height:46px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--glass);border:1px solid var(--glass-b);transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-ico:active{transform:scale(.9)}
.uk-ico svg{width:20px;height:20px;stroke:var(--ivory);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

/* ---- ba\u015Fl\u0131k ---- */
.uk-title{justify-content:space-between;padding:calc(var(--sat) + 18px) 20px calc(var(--sab) + 30px)}
.uk-title .top{width:100%;display:flex;justify-content:space-between}
.uk-brand{text-align:center;margin-top:3vh}
.uk-brand .k{font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold2);opacity:.9}
.uk-brand h1{font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(54px,15vw,92px);line-height:.95;margin-top:10px;
  background:linear-gradient(180deg,#fffaf0 0%,#ffe2a6 60%,#f0b25e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:0 6px 40px rgba(255,190,110,.25)}
.uk-brand .tag{margin-top:14px;font-family:var(--serif);font-style:italic;font-size:19px;color:var(--ivory-dim)}
.uk-title .acts{display:flex;flex-direction:column;align-items:center;gap:12px}
.uk-title .row{display:flex;gap:10px}

/* ---- b\xF6l\xFCmler ---- */
.uk-levels{padding:calc(var(--sat) + 14px) 16px calc(var(--sab) + 16px);background:linear-gradient(180deg,rgba(14,10,30,.0) 0%,rgba(14,10,30,.55) 40%,rgba(14,10,30,.8) 100%)}
.uk-levels .hd{width:100%;max-width:520px;display:flex;align-items:center;gap:12px}
.uk-levels .hd h5{font-family:var(--serif);font-style:italic;font-weight:600;font-size:30px;flex:1;text-align:center}
.uk-levels .hd .sp{width:46px}
.uk-list{width:100%;max-width:520px;margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;pointer-events:auto;overflow:auto;max-height:72vh;padding-bottom:4px}
.uk-lv{position:relative;text-align:left;padding:14px 14px 12px;border-radius:18px;background:var(--glass);border:1px solid var(--glass-b);min-height:96px;display:flex;flex-direction:column;gap:4px;
  transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-lv:active{transform:scale(.96)}
.uk-lv small{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold2)}
.uk-lv b{font-family:var(--serif);font-style:italic;font-weight:600;font-size:21px;line-height:1.05}
.uk-lv .st{margin-top:auto;display:flex;gap:4px}
.uk-lv .st i{width:12px;height:12px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:rgba(255,236,204,.18)}
.uk-lv .st i.on{background:linear-gradient(180deg,#fff6d8,#ffd37a 55%,#f29a3c)}
.uk-lv.lock{opacity:.42}
.uk-lv.lock::after{content:"";position:absolute;right:14px;top:14px;width:12px;height:14px;border:2px solid var(--ivory-dim);border-radius:3px 3px 4px 4px;border-top-width:6px}
.uk-lv .sw{position:absolute;right:12px;bottom:12px;width:26px;height:26px;border-radius:50%;opacity:.95}
.uk-lv[data-s=spring] .sw{background:radial-gradient(circle at 35% 35%,#ffe6ee,#f7a9c4 60%,#c0608a)}
.uk-lv[data-s=summer] .sw{background:radial-gradient(circle at 35% 35%,#b8f08a,#5fa040 60%,#2f6a28)}
.uk-lv[data-s=autumn] .sw{background:radial-gradient(circle at 35% 35%,#ffe28a,#f0a030 60%,#b0501e)}
.uk-lv[data-s=winter] .sw{background:radial-gradient(circle at 35% 35%,#ffffff,#cfdcf6 60%,#8a9ad0)}

/* ---- oyun i\xE7i ---- */
.uk-hud{position:absolute;inset:0;opacity:0;transition:opacity .4s;pointer-events:none}
.uk-hud.on{opacity:1}
.uk-hud .top{position:absolute;left:0;right:0;top:0;padding:calc(var(--sat) + 12px) 14px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.uk-hud .lvl{text-align:center;flex:1;padding-top:2px;text-shadow:0 2px 12px rgba(20,10,40,.6)}
.uk-hud .lvl small{display:block;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold2)}
.uk-hud .lvl b{font-family:var(--serif);font-style:italic;font-weight:600;font-size:22px}
.uk-pill{height:38px;min-width:64px;padding:0 13px;border-radius:999px;background:var(--glass);border:1px solid var(--glass-b);display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:14px;transition:transform .25s cubic-bezier(.3,1.8,.5,1)}
.uk-pill i{width:11px;height:15px;border-radius:50% 50% 50% 50%/62% 62% 40% 40%;background:radial-gradient(circle at 40% 70%,#2c2152,#0e0a1c 70%);box-shadow:0 0 0 1.5px #b9adff,0 0 10px rgba(157,140,255,.7)}
.uk-pill.pop{transform:scale(1.18)}
.uk-pill.bad{animation:ukShake .4s}
@keyframes ukShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}

.uk-compass{position:absolute;left:calc(var(--sal) + 14px);bottom:calc(var(--sab) + 18px);width:118px;height:118px;border-radius:50%;
  background:radial-gradient(circle,rgba(24,18,42,.72) 0%,rgba(24,18,42,.6) 70%,rgba(24,18,42,0) 72%);pointer-events:none}
.uk-compass svg{width:100%;height:100%;overflow:visible}
.uk-compass .orb{fill:none;stroke:rgba(255,244,226,.22);stroke-width:1.5;stroke-dasharray:2 5}
.uk-compass .band{fill:rgba(18,12,40,.85)}
.uk-compass .win{fill:none;stroke:#ffdf9e;stroke-width:7;stroke-linecap:round;opacity:.9;animation:ukWin 1.2s ease-in-out infinite}
@keyframes ukWin{0%,100%{opacity:.45}50%{opacity:1}}
.uk-compass .trunk{fill:#efe9e0;stroke:rgba(0,0,0,.25);stroke-width:1}
.uk-compass .zif{fill:#120e1f;stroke:#b9adff;stroke-width:2}
.uk-compass .zif.hot{stroke:#ff9a3a}
.uk-compass .sun circle{fill:#ffe6a0;stroke:#fff6d8;stroke-width:2}
.uk-compass .sun .ray{stroke:#ffd27a;stroke-width:2;stroke-linecap:round}

.uk-wait{position:absolute;right:calc(var(--sar) + 16px);bottom:calc(var(--sab) + 22px);width:94px;height:94px;border-radius:50%;pointer-events:auto;touch-action:none;
  background:radial-gradient(circle at 50% 35%,rgba(60,46,110,.9),rgba(20,14,40,.9));border:1.5px solid rgba(185,173,255,.55);
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;transition:transform .15s,border-color .2s;box-shadow:0 8px 26px rgba(10,6,30,.45)}
.uk-wait b{font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:800}
.uk-wait svg{width:22px;height:22px;stroke:var(--ivory);fill:none;stroke-width:2.4;stroke-linecap:round}
.uk-wait.dn{transform:scale(.92);border-color:#ffdf9e}


.uk-hint{position:absolute;left:50%;top:calc(var(--sat) + 74px);transform:translate(-50%,-8px);width:min(88vw,420px);padding:14px 18px;border-radius:18px;
  background:rgba(22,16,40,.78);border:1px solid var(--glass-b);font-size:14.5px;line-height:1.45;text-align:center;opacity:0;transition:opacity .35s,transform .35s;pointer-events:none}
.uk-hint.on{opacity:1;transform:translate(-50%,0)}
.uk-hint em{font-style:normal;color:var(--gold2);font-weight:800}
.uk-hand{position:absolute;left:50%;bottom:30%;width:46px;height:46px;margin-left:-23px;opacity:0;pointer-events:none;transition:opacity .3s}
.uk-hand.on{opacity:1;animation:ukSwipe 1.8s ease-in-out infinite}
.uk-hand i{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#fff6dc 0%,#ffd98a 45%,rgba(255,200,110,0) 70%)}
@keyframes ukSwipe{0%{transform:translateX(-70px)}50%{transform:translateX(70px)}100%{transform:translateX(-70px)}}
.uk-gust{position:absolute;left:50%;top:calc(var(--sat) + 70px);transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(22,16,40,.78);border:1px solid rgba(255,223,158,.4);
  font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:800;color:var(--gold2);opacity:0;transition:opacity .3s}
.uk-gust.on{opacity:1}
.uk-toast{position:absolute;left:50%;bottom:calc(var(--sab) + 150px);transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:rgba(22,16,40,.82);font-size:12px;opacity:0;transition:opacity .3s}
.uk-toast.on{opacity:1}

/* ---- biti\u015F ekranlar\u0131 ---- */
.uk-end{justify-content:center;gap:18px;padding:24px;background:radial-gradient(ellipse at center,rgba(14,10,30,.35) 0%,rgba(14,10,30,.78) 75%)}
.uk-end .k{font-size:11px;letter-spacing:.38em;text-transform:uppercase;color:var(--gold2)}
.uk-end h2{font-family:var(--serif);font-style:italic;font-weight:600;font-size:48px;line-height:1;text-align:center}
.uk-end .sub{font-family:var(--serif);font-style:italic;font-size:18px;color:var(--ivory-dim);text-align:center;max-width:340px}
.uk-stars{display:flex;gap:14px;margin:6px 0}
.uk-star{display:flex;flex-direction:column;align-items:center;gap:6px;width:86px;text-align:center;font-size:10.5px;letter-spacing:.06em;color:var(--ivory-dim)}
.uk-star i{width:46px;height:46px;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:rgba(255,236,204,.16);transform:scale(.6);transition:transform .5s cubic-bezier(.3,1.8,.5,1)}
.uk-star.on i{background:linear-gradient(180deg,#fff6d8,#ffd37a 55%,#f29a3c);transform:scale(1)}
.uk-star.on{color:var(--ivory)}
.uk-dust{font-size:15px;font-weight:800;color:var(--gold2)}
.uk-end .acts{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:6px}
.uk-end .row{display:flex;gap:10px}
.uk-prog{width:220px;height:6px;border-radius:6px;background:rgba(255,236,204,.14);overflow:hidden}
.uk-prog i{display:block;height:100%;background:linear-gradient(90deg,#9d8cff,#ffd37a);border-radius:6px}
.uk-mercy{font-size:13px;color:var(--ivory-dim);text-align:center;max-width:300px}
.uk-mercy b{color:var(--gold2)}

.uk-pause{justify-content:center;background:rgba(14,10,30,.6)}
.uk-card{width:min(86vw,340px);padding:22px 20px;border-radius:24px;background:rgba(26,20,46,.94);border:1px solid var(--glass-b);display:flex;flex-direction:column;gap:10px;align-items:stretch}
.uk-card h4{font-family:var(--serif);font-style:italic;font-weight:600;font-size:30px;text-align:center;margin-bottom:6px}
.uk-card .uk-btn{min-width:0;width:100%}
.uk-tog{display:flex;justify-content:space-between;align-items:center;height:44px;padding:0 16px;border-radius:14px;background:rgba(255,244,226,.06);font-size:14px;font-weight:600}
.uk-tog b{color:var(--gold2);font-weight:800}

.uk-card-title{position:absolute;left:0;right:0;top:34%;text-align:center;opacity:0;transition:opacity .6s,transform .8s;transform:translateY(10px);pointer-events:none;text-shadow:0 4px 30px rgba(10,6,30,.6)}
.uk-card-title.on{opacity:1;transform:none}
.uk-card-title small{display:block;font-size:12px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold2)}
.uk-card-title b{display:block;font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(40px,11vw,64px);margin-top:6px}
.uk-card-title span{display:block;margin-top:8px;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--ivory-dim)}

.uk-lore{position:absolute;left:0;right:0;bottom:calc(var(--sab) + 70px);padding:0 28px;text-align:center;font-family:var(--serif);font-style:italic;font-size:22px;line-height:1.35;opacity:0;transition:opacity .9s;pointer-events:none;text-shadow:0 3px 18px rgba(10,6,30,.75)}
.uk-lore.on{opacity:1}
.uk-skip{position:absolute;right:calc(var(--sar) + 16px);top:calc(var(--sat) + 16px);font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;color:var(--ivory-dim);padding:10px 12px;opacity:0;transition:opacity .4s}
.uk-skip.on{opacity:1;pointer-events:auto}
.uk-fade{position:absolute;inset:0;background:#0d0a1e;opacity:0;transition:opacity .5s;pointer-events:none}
.uk-fade.on{opacity:1}
@media (orientation:landscape) and (max-height:520px){
  .uk-brand{margin-top:2vh}.uk-brand h1{font-size:56px}.uk-list{grid-template-columns:repeat(4,1fr);max-height:60vh}
  .uk-compass{width:96px;height:96px}.uk-wait{width:80px;height:80px}
}
`;var Oe={back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',hand:'<svg viewBox="0 0 24 24"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 13.5c-.6-1 .6-2.2 1.6-1.5L8 15"/></svg>',wait:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/></svg>'},Si={drag:"Parma\u011F\u0131n\u0131 sa\u011Fa sola kayd\u0131r: <em>g\xFCne\u015F</em> a\u011Fac\u0131n etraf\u0131nda d\xF6ner.",hide:"G\xFCne\u015Fi g\xF6vdenin <em>arkas\u0131na</em> sakla: a\u011Fac\u0131n g\xF6lgesi Zifir\u2019i korur.",drops:"<em>Gece damlalar\u0131</em> \u0131\u015F\u0131kta erir. Onlar\u0131 da g\xF6lgede tut.",bridge:"K\xF6pr\xFCde g\xF6vde uzakta kal\u0131r: <em>yapraklar\u0131n</em> g\xF6lgesini kullan.",ledge:"G\xFCne\u015F tepedeyken <em>\xFCstteki patika</em> da g\xF6lge verir.",wait:"<em>Bekle</em>\u2019ye bas\u0131l\u0131 tut: Zifir durur, sen g\xF6lgeyi haz\u0131rlars\u0131n.",gust:"<em>Sert r\xFCzg\xE2r</em> yapraklar\u0131 savurur. Dinmesini bekle.",gate:"G\xFCne\u015F bat\u0131yor. <em>K\xF6k Kap\u0131s\u0131</em>\u2019na ula\u015F.",crystal:"<em>Kristaller</em> g\xFCne\u015Fi yans\u0131t\u0131r. G\xFCne\u015Fi biraz kayd\u0131r: \u0131\u015F\u0131n Zifir\u2019e de\u011Fmesin.",lock:"Tomurcuk \u0131\u015F\u0131kla a\xE7\u0131l\u0131r. G\xF6lgenin kenar\u0131n\u0131 ikisinin <em>aras\u0131na</em> d\xFC\u015F\xFCr: \u0131\u015F\u0131k tomurcu\u011Fa de\u011Fsin, Zifir\u2019e de\u011Fmesin."},Ne=class{constructor(t,e){if(this.h=e,!document.getElementById("uk-style")){let n=document.createElement("style");n.id="uk-style",n.textContent=Ys,document.head.appendChild(n)}let s=document.createElement("div");s.className="uk-ui",s.innerHTML=`
			<div class="uk-scr uk-title" data-s="title">
				<div class="top"><button class="uk-ico uk-tap" data-a="exit" aria-label="Ana oyuna d\xF6n">${Oe.back}</button><span></span></div>
				<div class="uk-brand"><div class="k">G\xFCnd\xF6n\xFCm\xFC \xB7 \u0130kinci Mod</div><h1>Ulu Kay\u0131n</h1><div class="tag">G\xFCne\u015F a\u011Fac\u0131n etraf\u0131nda d\xF6ner, g\xF6lgesi Zifir\u2019in yoludur</div></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="play">Ba\u015Fla</button><div class="row"><button class="uk-btn gh uk-tap" data-a="levels">B\xF6l\xFCmler</button><button class="uk-btn gh uk-tap" data-a="settings">Ayarlar</button></div></div>
			</div>
			<div class="uk-scr uk-levels" data-s="levels">
				<div class="hd"><button class="uk-ico uk-tap" data-a="title" aria-label="Geri">${Oe.back}</button><h5>Mevsimler</h5><span class="sp"></span></div>
				<div class="uk-list"></div>
			</div>
			<div class="uk-hud">
				<div class="top">
					<button class="uk-ico" data-a="pause" aria-label="Duraklat">${Oe.pause}</button>
					<div class="lvl"><small class="lk"></small><b class="lt"></b></div>
					<div class="uk-pill dp"><i></i><span class="dt">0/0</span></div>
				</div>
				<div class="uk-compass" aria-hidden="true">
					<svg viewBox="-60 -60 120 120">
						<circle class="orb" r="52"/>
						<path class="win" d=""/>
						<g class="bandg"><rect class="band" x="-21" y="0" width="42" height="58" rx="4"/></g>
						<circle class="trunk" r="20"/>
						<circle class="zif" cx="0" cy="34" r="6.5"/>
						<g class="sun"><g transform="translate(0 52)"><path class="ray" d="M0-13v-4M0 13v4M-13 0h-4M13 0h4M-9-9l-3-3M9 9l3 3M-9 9l-3 3M9-9l3-3"/><circle r="8.5"/></g></g>
					</svg>
				</div>
				<button class="uk-wait" aria-label="Bekle">${Oe.wait}<b>Bekle</b></button>
				<div class="uk-hint"></div>
				<div class="uk-hand"><i></i></div>
				<div class="uk-gust">R\xFCzg\xE2r geliyor</div>
			</div>
			<div class="uk-card-title"><small></small><b></b><span></span></div>
			<div class="uk-lore"></div>
			<button class="uk-skip" data-a="skip">Ge\xE7 \u203A</button>
			<div class="uk-scr uk-end" data-s="complete">
				<div class="k ck">G\xF6lge korundu</div><h2 class="ct"></h2><div class="sub cs"></div>
				<div class="uk-stars"><div class="uk-star s0"><i></i><span>Yolu bitirdi</span></div><div class="uk-star s1"><i></i><span>T\xFCm damlalar</span></div><div class="uk-star s2"><i></i><span>Lekesiz</span></div></div>
				<div class="uk-dust"></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="next">Sonraki b\xF6l\xFCm</button><div class="row"><button class="uk-btn gh uk-tap" data-a="retry">Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">B\xF6l\xFCmler</button></div></div>
			</div>
			<div class="uk-scr uk-end" data-s="fail">
				<div class="k">I\u015F\u0131k kazand\u0131</div><h2>Zifir buharla\u015Ft\u0131</h2><div class="sub fs"></div>
				<div class="uk-prog"><i class="fp"></i></div>
				<div class="uk-mercy fm"></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="retry">Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">B\xF6l\xFCmler</button></div>
			</div>
			<div class="uk-scr uk-end" data-s="ending">
				<div class="k">K\xF6k Kap\u0131s\u0131 a\xE7\u0131ld\u0131</div><h2>Gece eve d\xF6nd\xFC</h2>
				<div class="sub">Zifir Ulu Kay\u0131n\u2019\u0131n k\xF6klerine ula\u015Ft\u0131. T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131, kar\u0131n alt\u0131nda ilk kez k\u0131p\u0131rd\u0131yor.</div>
				<div class="uk-dust ed"></div>
				<div class="acts"><button class="uk-btn pri uk-tap" data-a="levels">Mevsimler</button><button class="uk-btn gh uk-tap" data-a="exit">G\xF6ky\xFCz\xFCne d\xF6n</button></div>
			</div>
			<div class="uk-scr uk-pause" data-s="pause">
				<div class="uk-card uk-tap">
					<h4>Duraklat\u0131ld\u0131</h4>
					<button class="uk-btn pri" data-a="resume">Devam</button>
					<button class="uk-btn gh" data-a="retry">Yeniden ba\u015Fla</button>
					<button class="uk-btn gh" data-a="levels">B\xF6l\xFCmler</button>
					<button class="uk-tog" data-t="sound">Ses <b></b></button>
					<button class="uk-tog" data-t="haptics">Titre\u015Fim <b></b></button>
					<button class="uk-tog" data-t="quality">Grafik <b></b></button>
					<button class="uk-tog" data-t="power">Pil <b></b></button>
				</div>
			</div>
			<div class="uk-toast"></div>
			<div class="uk-fade"></div>`,t.appendChild(s),this.el=s;let o=n=>s.querySelector(n);this.$=o,this.scr={},s.querySelectorAll(".uk-scr").forEach(n=>this.scr[n.dataset.s]=n),this.hud=o(".uk-hud"),this.lk=o(".lk"),this.lt=o(".lt"),this.dp=o(".dp"),this.dt=o(".dt"),this.sunG=o(".sun"),this.bandG=o(".bandg"),this.zifDot=o(".zif"),this.hintEl=o(".uk-hint"),this.hand=o(".uk-hand"),this.gustEl=o(".uk-gust"),this.toastEl=o(".uk-toast"),this.titleCard=o(".uk-card-title"),this.loreEl=o(".uk-lore"),this.skipEl=o(".uk-skip"),this.fadeEl=o(".uk-fade"),this.waitBtn=o(".uk-wait"),this._rel=null,this._hot=null,s.addEventListener("click",n=>{let r=n.target.closest("[data-a]");if(r){n.stopPropagation(),e.action(r.dataset.a);return}let h=n.target.closest("[data-t]");h&&(n.stopPropagation(),e.toggle(h.dataset.t))});let i=this.waitBtn,a=n=>{n.preventDefault(),n.stopPropagation();try{i.setPointerCapture(n.pointerId)}catch{}i.classList.add("dn"),e.wait(!0)},c=()=>{i.classList.remove("dn"),e.wait(!1)};i.addEventListener("pointerdown",a),i.addEventListener("pointerup",c),i.addEventListener("pointercancel",c),i.addEventListener("lostpointercapture",c)}show(t){for(let[e,s]of Object.entries(this.scr))s.classList.toggle("on",e===t)}hudOn(t){this.hud.classList.toggle("on",t),this.hud.querySelectorAll("[data-a],.uk-wait").forEach(e=>e.style.pointerEvents=t?"auto":"none")}setLevel(t){this.lk.textContent=t.kicker,this.lt.textContent=t.title}setDrops(t,e,s){this.dt.textContent=`${t}/${e}`,this.dp.style.display=e?"":"none",s==="pop"?(this.dp.classList.add("pop"),setTimeout(()=>this.dp.classList.remove("pop"),220)):s==="bad"&&(this.dp.classList.remove("bad"),this.dp.offsetWidth,this.dp.classList.add("bad"))}compass(t,e){let s=Math.round(t*180/Math.PI*2)/2;s!==this._rel&&(this._rel=s,this.sunG.setAttribute("transform",`rotate(${s})`),this.bandG.setAttribute("transform",`rotate(${s+180})`)),e!==this._hot&&(this._hot=e,this.zifDot.classList.toggle("hot",e))}lockArc(t,e){let s=this.$(".uk-compass .win");if(t==null){this._arc&&s.setAttribute("d",""),this._arc=null;return}let o=`${t.toFixed(2)}:${e.toFixed(2)}`;if(o===this._arc)return;this._arc=o;let i=c=>`${(-52*Math.sin(c)).toFixed(1)} ${(52*Math.cos(c)).toFixed(1)}`,a=e-t>Math.PI?1:0;s.setAttribute("d",`M ${i(t)} A 52 52 0 ${a} 1 ${i(e)}`)}hint(t){if(!t){this.hintEl.classList.remove("on"),this.hand.classList.remove("on"),this._hint=null;return}this._hint!==t&&(this._hint=t,this.hintEl.innerHTML=Si[t]||t,this.hintEl.classList.add("on"),this.hand.classList.toggle("on",t==="drag"))}gust(t){t!==this._gust&&(this._gust=t,this.gustEl.classList.toggle("on",t))}toast(t,e=2200){this.toastEl.textContent=t,this.toastEl.classList.add("on"),clearTimeout(this._toastT),this._toastT=setTimeout(()=>this.toastEl.classList.remove("on"),e)}card(t,e,s){if(!t){this.titleCard.classList.remove("on");return}this.titleCard.querySelector("small").textContent=t,this.titleCard.querySelector("b").textContent=e,this.titleCard.querySelector("span").textContent=s||"",this.titleCard.classList.add("on")}lore(t){t?(this.loreEl.textContent=t,this.loreEl.classList.add("on")):this.loreEl.classList.remove("on")}skip(t){this.skipEl.classList.toggle("on",t)}fade(t){this.fadeEl.classList.toggle("on",t)}renderLevels(t,e){let s=this.$(".uk-list");s.innerHTML=t.map((o,i)=>{let a=i>e.unlocked,c=e.stars[i]||0;return`<button class="uk-lv uk-tap${a?" lock":""}" data-a="lv:${i}" data-s="${o.season}">
					<small>${o.kicker}</small><b>${o.title}</b>
					<span class="st">${[0,1,2].map(n=>`<i class="${n<c?"on":""}"></i>`).join("")}</span><span class="sw"></span></button>`}).join("")}showComplete({title:t,kicker:e,stars:s,dust:o,last:i}){this.$(".ck").textContent=e,this.$(".ct").textContent=t,this.$(".cs").textContent=i?"Son b\xF6l\xFCm":"",[".s0",".s1",".s2"].forEach((a,c)=>{let n=this.$(a);n.classList.remove("on"),s[c]&&setTimeout(()=>n.classList.add("on"),350+c*260)}),this.$(".uk-dust").textContent=o?`+${o} \u0131\u015F\u0131k tozu`:"",this.$("[data-s=complete] [data-a=next]").style.display=i?"none":"",this.show("complete")}showFail({progress:t,mercy:e}){this.$(".fs").textContent=`Yolun %${Math.round(t*100)}\u2019i`,this.$(".fp").style.width=`${Math.round(t*100)}%`,this.$(".fm").innerHTML=e?"<b>G\xFCne\u015F yumu\u015Fuyor:</b> bir sonraki denemede \u0131\u015F\u0131k daha az yakar.":"",this.show("fail")}showEnding(t){this.$(".ed").textContent=t?`Toplam ${t} \u0131\u015F\u0131k tozu`:"",this.show("ending")}setToggles(t){let e=(s,o)=>{let i=this.$(`[data-t=${s}] b`);i&&(i.textContent=o)};e("sound",t.sound?"A\xE7\u0131k":"Kapal\u0131"),e("haptics",t.haptics?"A\xE7\u0131k":"Kapal\u0131"),e("quality",{auto:"Otomatik",0:"D\xFC\u015F\xFCk",1:"Orta",2:"Y\xFCksek"}[t.quality]||"Otomatik"),e("power",{auto:"Otomatik",saver:"Tasarruf",performance:"Performans"}[t.power]||"Otomatik")}setPlayLabel(t){this.$("[data-a=play]").textContent=t}};var js=[0,2,4,7,9,12,14,16,19,21],Ge=class{constructor(t={}){this.hooks=t,this.ctx=null,this.on=!0,this.season="spring",this._dropN=0,this._birdT=4}unlock(){if(this.ctx){this.ctx.state==="suspended"&&this.ctx.resume();return}let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let e=new t;this.ctx=e,this.master=e.createGain(),this.master.gain.value=this.on?.9:0,this.master.connect(e.destination);let s=e.sampleRate*2,o=e.createBuffer(1,s,e.sampleRate),i=o.getChannelData(0);for(let a=0;a<s;a++)i[a]=Math.random()*2-1;this.noise=o,this.wind=this._loopNoise("lowpass",520,.6),this.wind.g.gain.value=0,this.sizz=this._loopNoise("highpass",3200,.7),this.sizz.g.gain.value=0}_loopNoise(t,e,s){let o=this.ctx,i=o.createBufferSource();i.buffer=this.noise,i.loop=!0;let a=o.createBiquadFilter();a.type=t,a.frequency.value=e,a.Q.value=s;let c=o.createGain();return i.connect(a),a.connect(c),c.connect(this.master),i.start(),{src:i,f:a,g:c}}setOn(t){this.on=t,this.master&&this.master.gain.setTargetAtTime(t?.9:0,this.ctx.currentTime,.05)}_host(t,e){return this.hooks.sfx?this.hooks.sfx(t,e)===!0:!1}_tone(t,e,s,o,i="sine",a=0){let c=this.ctx,n=c.createOscillator();n.type=i,n.frequency.value=t;let r=c.createGain();r.gain.setValueAtTime(0,e),r.gain.linearRampToValueAtTime(o,e+.008),r.gain.exponentialRampToValueAtTime(1e-4,e+s),n.connect(r),r.connect(this.master),n.start(e),n.stop(e+s+.05),a&&this._tone(t*a,e,s*.6,o*.35,"sine",0)}_burst(t,e,s,o,i="bandpass"){let a=this.ctx,c=a.createBufferSource();c.buffer=this.noise;let n=a.createBiquadFilter();n.type=i,n.frequency.value=s,n.Q.value=1.2;let r=a.createGain();r.gain.setValueAtTime(o,t),r.gain.exponentialRampToValueAtTime(1e-4,t+e),c.connect(n),n.connect(r),r.connect(this.master),c.start(t,Math.random()),c.stop(t+e+.02)}step(){this._host("step")||!this.ctx||this._burst(this.ctx.currentTime,.05,900+Math.random()*500,.05)}drop(){if(this._host("drop")||!this.ctx)return;let t=this.ctx.currentTime,e=js[Math.min(js.length-1,this._dropN++)],s=660*Math.pow(2,e/12);this._tone(s,t,1.3,.16,"sine",2.76),this._tone(s*2,t+.07,.9,.06,"triangle")}resetDrops(){this._dropN=0}dropLost(){if(this._host("dropLost")||!this.ctx)return;let t=this.ctx.currentTime;this._burst(t,.35,2600,.12,"highpass"),this._tone(420,t,.4,.06,"triangle"),this._tone(300,t+.1,.5,.05,"triangle")}ui(){this._host("ui")||!this.ctx||this._tone(880,this.ctx.currentTime,.12,.05,"sine")}win(){if(this._host("win")||!this.ctx)return;let t=this.ctx.currentTime;[0,4,7,12,16].forEach((e,s)=>this._tone(523*Math.pow(2,e/12),t+s*.11,1.6,.11,"sine",2)),this._tone(261.6,t,2.4,.06,"triangle")}unlockOpen(){if(this._host("unlock")||!this.ctx)return;let t=this.ctx.currentTime;[0,7,12,16].forEach((e,s)=>this._tone(392*Math.pow(2,e/12),t+s*.05,1.4,.07,"sine",2))}fail(){if(this._host("fail")||!this.ctx)return;let t=this.ctx.currentTime;this._burst(t,.9,1800,.14,"highpass"),[7,4,0].forEach((e,s)=>this._tone(392*Math.pow(2,e/12),t+.15+s*.16,.7,.07,"triangle"))}tick(t,e,s,o){if(!this.ctx||!this.on)return;let i=this.ctx.currentTime;this.sizz.g.gain.setTargetAtTime(o?e*.09:0,i,.05),this.wind.g.gain.setTargetAtTime(.025+s*.05,i,.3),this.wind.f.frequency.setTargetAtTime(380+s*500,i,.3),(this.season==="spring"||this.season==="summer")&&o&&(this._birdT-=t,this._birdT<0&&(this._birdT=3+Math.random()*6,this._bird(i)))}_bird(t){let e=this.ctx,s=2+(Math.random()*3|0),o=2200+Math.random()*1400;for(let i=0;i<s;i++){let a=e.createOscillator(),c=e.createGain(),n=t+i*.13;a.frequency.setValueAtTime(o,n),a.frequency.exponentialRampToValueAtTime(o*1.35,n+.05),a.frequency.exponentialRampToValueAtTime(o*.9,n+.09),c.gain.setValueAtTime(0,n),c.gain.linearRampToValueAtTime(.022,n+.01),c.gain.exponentialRampToValueAtTime(1e-4,n+.1),a.connect(c),c.connect(this.master),a.start(n),a.stop(n+.12)}}suspend(){this.ctx&&this.ctx.state==="running"&&this.ctx.suspend()}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}};var Le=class{constructor({container:t,store:e,hooks:s={},quality:o="auto",power:i="auto"}){this.container=t,this.store=e,this.hooks=s,this.qualityOpt=o,this.power=i,this.running=!1,this.visible=!0,this.time=0,this.sunAz=0,this.elev=null,this.idle=!1,this._raf=0,this._last=0,this._prev=0,this._dirty=!0,this.V3=ue.Vector3}async init(){let t=document.createElement("canvas");t.className="uk-canvas",this.container.appendChild(t),this.canvas=t;let e=this.store.get("settings")||{},s=this.qualityOpt!=="auto"?this.qualityOpt:e.quality??"auto",o=s==="auto"?null:Number(s),i=rs(t,o);this.renderer=i.renderer,this.tier=i.tier,this.info=i,this.gov=new be({tier:i.tier.id,gpu:i.gpu,store:this.store,power:e.power||this.power}),this.gov.onScale=()=>this.resize(),this.gov.onBattery=c=>{this.ui&&this.ui.toast(c?"Pil koruma a\xE7\u0131k: daha az kare, daha serin telefon":"Pil koruma kapand\u0131")};let a=ls();this.G=a,us(a,i.tier.shadowTaps),this.shadow=new we(a,i.tier.shadowSize),this.world=Us({G:a,tier:i.tier,shadow:this.shadow,aniso:i.aniso,msaa:i.msaa}),this.scene=this.world.scene,this.rig=new Re,this.focus=new ue.Vector3(0,30,0),this.sfx=new Ge(this.hooks),this.ui=new Ne(this.container,{action:c=>this.game.action(c),toggle:c=>this.game.toggle(c),wait:c=>this.game.wait(c)}),this._onResize=()=>this.resize(),window.addEventListener("resize",this._onResize),this._onVis=()=>{this.visible=!document.hidden,this.visible?(this.gov.reset(),this._last=0,this._prev=0,this.wake(),this.sfx.resume()):(this.sfx.suspend(),this.game&&this.game.pause())},document.addEventListener("visibilitychange",this._onVis),this.resize(),this.game=new Ve(this,this.ui,this.sfx),this.rig.pos.set(70,32,60),this.rig.look.set(0,27,0),this.rig.mode="manual",this.rig.update(0),await this.warmup()}async warmup(){let t=this.renderer,e=[];this.scene.traverse(s=>{s.isMesh&&!s.visible&&(e.push(s),s.visible=!0)});try{t.compileAsync?(await t.compileAsync(this.scene,this.rig.cam),await t.compileAsync(this.shadow.scene,this.shadow.cam)):(t.compile(this.scene,this.rig.cam),t.compile(this.shadow.scene,this.shadow.cam))}catch{}this.renderFrame();for(let s of e)s.visible=!1}resize(){let t=Math.max(1,this.container.clientWidth||window.innerWidth),e=Math.max(1,this.container.clientHeight||window.innerHeight),s=this.gov.pixelRatio(t,e);this.renderer.setPixelRatio(s),this.renderer.setSize(t,e,!1),this.canvas.style.width=t+"px",this.canvas.style.height=e+"px";let o=this.renderer.getDrawingBufferSize(new ue.Vector2);this.G.uRes.value.x=o.x,this.G.uRes.value.y=o.y,this.rig.resize(t,e),this.wake()}wake(){this.idle=!1,this._dirty=!0}exit(){this.hooks.onExit?this.hooks.onExit():this.game.goTitle()}renderFrame(){let t=this.G;t.uTime.value=this.time;let[e,s,o]=this.game?this.game.envState():["spring","spring",0];cs(t,Xe[e],Xe[s],o,this.sunAz,this.elev),t.uWind.value.set(Tt.dx,Tt.dz,Tt.str,Tt.gust),t.uFocus.value.set(this.focus.x,this.focus.y+.5,this.focus.z,1.7);let i=Math.min(1,t.uNight.value*1.4+Math.max(0,.3-t.uSunDir.value.y)*1.5);this.world.lanternGlow.mat.uniforms.uK.value=.45+i*1.5,this.world.mats.glass.uniforms.uK.value=1.6+i*2.2;let a=this.world,c=ke(this.focus.y,this._sw||(this._sw=[0,0,0,0]));a.particles.u.uCenter.value.copy(this.rig.look),a.particles.u.uSeason.value.set(c[0],c[1],c[2],c[3]),a.particles.u.uFire.value=i*(this.focus.y<14?1:.3),a.shafts.u.uCenter.value.copy(this.focus),a.birds.u.uCenterY.value=this.focus.y,this.shadow.place(this.focus,t.uSunDir.value),this.shadow.render(this.renderer),this.renderer.render(this.scene,this.rig.cam),this._dirty=!1}start(){if(this.running)return;this.running=!0,this._last=0,this._prev=0;let t=e=>{if(!this.running||(this._raf=requestAnimationFrame(t),!this.visible))return;let s=this._last?e-this._last:16.7;if(this._last=e,this.idle&&!this._dirty){this._prev=e;return}this.gov.tick(e,s)&&this.frame(e)};this._raf=requestAnimationFrame(t)}stop(){this.running=!1,cancelAnimationFrame(this._raf),this.sfx.suspend()}frame(t){let e=Math.min(.05,this._prev?(t-this._prev)/1e3:.016666666666666666);this._prev=t,this.time+=e,this.game.update(e,this.time),this.rig.update(e),this.renderFrame()}destroy(){this.stop(),this.game.destroy(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVis),this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&t.material.dispose()});for(let t of Object.values(this.world.tex))t.dispose();this.shadow.dispose(),this.renderer.dispose(),this.canvas.remove(),this.ui.el.remove()}stats(){let t=this.renderer.info;return{calls:t.render.calls,tris:t.render.triangles,geo:t.memory.geometries,tex:t.memory.textures,programs:t.programs.length,tier:this.tier.name,gpu:this.info.gpu,pr:this.renderer.getPixelRatio()}}debugView({level:t=0,s:e=null,sunAz:s=null,rel:o=null,camDist:i=1,gust:a=0,zifir:c=!0}={}){let n=this.game;n.startLevel(t,{retry:!0}),n.s=e==null?n.s0+4:n.s0+e*(n.s1-n.s0),n._set("play"),this.ui.card(null),this.ui.hint(null),this.ui.hudOn(!0);let r=this.world.curve.sample(n.s,{}),h=Math.atan2(r.z,r.x);n.sunAz=n.sunTarget=s??h+(o??Math.PI),n.zifir.g.visible=c,n.hold=!0,n.envFrom=n.envTo=n.level.season,n.envT=1,this.rig.zoom=i,this.rig.mode="follow";for(let f=0;f<4;f++)this.time+=.016,n.update(.016,this.time),Tt.gust=a,this.rig.snap(),this.rig.update(0);this.renderFrame()}debugCam(t,e,s="spring",o=.5){this.game.envFrom=this.game.envTo=s,this.game.envT=1,this.sunAz=o,this.elev=null,this.rig.pos.copy(t),this.rig.look.copy(e),this.rig.mode="manual",this.rig.update(0),this.focus.copy(e),this.renderFrame()}debugTick(t,e=30){let s=1/e;for(let o=0;o<t;o+=s)this.time+=s,this.game.update(s,this.time),this.rig.update(s);this.renderFrame()}debugSim({level:t=0,policy:e="smart",maxT:s=120,dt:o=1/30}={}){let i=this.game;i.startLevel(t,{retry:!0}),i._set("play"),i.dragged=!0,this.rig.mode="follow";let a=0,c=0,n=new ue.Vector3,r=i.tester,h=0;for(;a<s&&(i.state==="play"||i.state==="enter");){i.state==="enter"&&i._set("play");let f=this.world.curve.sample(i.s,{}),u=Math.atan2(f.z,f.x);if(e==="behind")i.sunTarget=u+Math.PI;else if(e==="smart"&&a>=c&&i.locks.pending(i.s)&&i.speed<.1){c=a+.25;let m=i.locks.pending(i.s),d=this.world.curve.sample(i.s,{}),v=i.elev*Math.PI/180,g=null,x=1e9;for(let p=0;p<180;p++){let y=i.sunAz+(p-90)/90*Math.PI;n.set(Math.cos(v)*Math.cos(y),Math.sin(v),Math.cos(v)*Math.sin(y));let w=0;for(let F of[.48,.86,.36])(!r.blocked(d.x,d.y+F,d.z,n)||i.beams.testPoint(n,d.x,d.y+F,d.z,r))&&w++;if(w)continue;let T=0;for(let F of[1,1.7,.8])r.blocked(m.x,m.y+F,m.z,n)||T++;let P=Math.abs(y-i.sunAz)-T*.5;T&&P<x&&(x=P,g=y)}g!=null&&(i.sunTarget=g),i.hold=!1}else if(e==="smart"&&a>=c){c=a+.2;let m=i.sunTarget,d=1e9;for(let v=0;v<32;v++){let g=i.sunAz+(v-16)/16*Math.PI;n.set(Math.cos(i.elev*Math.PI/180)*Math.cos(g),Math.sin(i.elev*Math.PI/180),Math.cos(i.elev*Math.PI/180)*Math.sin(g));let x=0;for(let y of[0,.8]){let w=this.world.curve.sample(i.s+y,{});(!r.blocked(w.x,w.y+.5,w.z,n)||i.beams.testPoint(n,w.x,w.y+.45,w.z,r))&&(x+=y===0?3:1)}let p=i.locks.pending(i.s);if(p){let y=0;for(let w of[1,1.7])r.blocked(p.x,p.y+w,p.z,n)||y++;x+=(2-y)*.9}for(let y of i.drops.list)y.state!=="idle"||y.s-i.s>9||y.s<i.s-1||(!r.blocked(y.x,y.y+.1,y.z,n)||i.beams.testPoint(n,y.x,y.y,y.z,r,.35))&&(x+=.6);x+=Math.abs(g-i.sunAz)*.05,x<d&&(d=x,m=g)}i.sunTarget=m,i.hold=d>=3&&!i.locks.pending(i.s)}this.time+=o,a+=o,i.update(o,this.time),i.expo>.05&&(h+=o)}return this.rig.update(0),this.renderFrame(),{level:t,policy:e,state:i.state,time:+a.toFixed(1),progress:+((i.s-i.s0)/(i.s1-i.s0)).toFixed(2),minMeter:+i.minMeter.toFixed(2),drops:`${i.got}/${i.drops.total}`,lost:i.lostN,litTime:+h.toFixed(1)}}debugAction(t){this.game.action(t),this.renderFrame()}};function Zs(l,t="ulukayin.v1"){if(l&&typeof l.get=="function"&&typeof l.set=="function")return l;let e={};try{e=JSON.parse(localStorage.getItem(t)||"{}")||{}}catch{e={}}return{get:s=>e[s],set:(s,o)=>{e[s]=o;try{localStorage.setItem(t,JSON.stringify(e))}catch{}}}}async function Wa(l={}){let t=Zs(l.store),e=document.createElement("div");e.className="uk-root",e.style.cssText="position:fixed;inset:0;z-index:50;overflow:hidden;background:#16122a;touch-action:none;",(l.container||document.body).appendChild(e);let s=new Le({container:e,store:t,hooks:l.hooks||{},quality:l.quality||"auto",power:l.power||"auto"});return await s.init(),{app:s,open(){e.style.display="",s.start()},close(){s.stop(),e.style.display="none"},destroy(){s.destroy(),e.remove()}}}export{Wa as createUluKayin};
