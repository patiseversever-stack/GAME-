import*as ue from"three";import*as re from"three";var D=Math.PI*2,lt=(r,t,e)=>r<t?t:r>e?e:r,Qs=r=>r<0?0:r>1?1:r,O=(r,t,e)=>r+(t-r)*e;var _t=(r,t,e)=>{let s=Qs((e-r)/(t-r));return s*s*(3-2*s)},gt=(r,t,e,s)=>t+(r-t)*Math.exp(-e*s),ye=r=>(r=(r+Math.PI)%D,(r<0?r+D:r)-Math.PI);var Ue=r=>r<.5?4*r*r*r:1-Math.pow(-2*r+2,3)/2,$e=r=>1-Math.pow(1-r,3);function St(r){let t=r>>>0,e=()=>{t=t+1831565813>>>0;let s=t;return s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296};return e.range=(s,i)=>s+(i-s)*e(),e.pick=s=>s[e()*s.length|0],e.sign=()=>e()<.5?-1:1,e}function Wt(r){let t=Math.floor(r),e=r-t,s=o=>{let a=Math.sin(o*127.1)*43758.5453;return a-Math.floor(a)},i=e*e*(3-2*e);return O(s(t),s(t+1),i)*2-1}var qe=[{id:0,name:"D\xFC\u015F\xFCk",maxPixels:115e4,maxDpr:2,minScale:.62,shadowSize:1024,shadowTaps:1,particles:150,leafDensity:.62,clouds:7,birds:8,shafts:3},{id:1,name:"Orta",maxPixels:19e5,maxDpr:2.4,minScale:.62,shadowSize:2048,shadowTaps:4,particles:340,leafDensity:.85,clouds:11,birds:18,shafts:5},{id:2,name:"Y\xFCksek",maxPixels:3e6,maxDpr:3,minScale:.62,shadowSize:2048,shadowTaps:4,particles:640,leafDensity:1,clouds:16,birds:30,shafts:6}];function ns(r){let t="";try{let a=r.getExtension("WEBGL_debug_renderer_info");t=String(r.getParameter(a?a.UNMASKED_RENDERER_WEBGL:r.RENDERER)||"")}catch{t=""}let e=t.toLowerCase(),s=matchMedia("(pointer: coarse)").matches||/android|iphone|ipad/i.test(navigator.userAgent),i=s?0:1;/swiftshader|llvmpipe|software|microsoft basic/.test(e)||/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(e)?i=0:/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(e)?i=1:/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(e)||/apple/.test(e)||!s&&/nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(e)?i=2:!s&&/intel/.test(e)&&(i=1);let o=navigator.deviceMemory||0;return o&&o<=2?i=0:o&&o<=4&&(i=Math.min(i,1)),{tier:i,gpu:t,mobile:s}}var be=class{constructor({tier:t,gpu:e,store:s,power:i="auto"}){this.T=qe[t],this.gpu=e,this.store=s,this.power=i,this.battery={saver:!1,level:1,charging:!0};let o=s.get("perf")||{},a=o.gpu===e;this.scale=a?lt(o.scale??1,this.T.minScale,1):1,this.cap=a&&o.cap===30?30:60,this.ceil=a?o.ceil??1:1,this.half=a?!!o.half:t===0,this.vsync=16.67,this._deltas=new Float32Array(24),this._di=0,this._count=0,this._frame=0,this._lastRender=0,this._ema=0,this._slow=0,this._good=0,this._cool=0,this._probe=null,this._ups=0,this._dirty=!1,this.onScale=null,this.menu=!1,this._watchBattery()}get targetFps(){return this.menu||this.power==="saver"||this.power==="auto"&&this.battery.saver?30:this.cap}get maxScale(){return this.power==="saver"||this.power==="auto"&&this.battery.saver?Math.min(this.ceil,.8):this.ceil}get effScale(){return Math.min(this.scale,this.maxScale)}tick(t,e){e>4&&e<40&&(this._deltas[this._di]=e,this._di=(this._di+1)%this._deltas.length,this._count++,this._count%24===0&&(this.vsync=Js(this._deltas)));let s=1e3/this.targetFps,i=this._divisor(s);if(this._frame++,this._frame<i)return!1;this._frame=0;let o=this._lastRender?t-this._lastRender:s;return this._lastRender=t,this._adapt(t,o,i*this.vsync),!0}_divisor(t){let e=t/this.vsync;return Math.max(1,this.half?Math.ceil(e-.05):Math.round(e-.15))}reset(){this._lastRender=0,this._frame=0,this._slow=0,this._good=0}_adapt(t,e,s){if(e>s*4)return;this._ema=this._ema?this._ema+(e-this._ema)*.08:e;let i=e/1e3;if(t<this._cool)return;let o=this._ema>s*1.22;if(o?(this._slow+=i,this._good=0):(this._slow=Math.max(0,this._slow-i*.5),this._good+=i),this._probe&&o&&this._slow>1.2){this.ceil=this._probe.from,this._setScale(this._probe.from),this._probe=null,this._cool=t+4e3,this._slow=0,this._dirty=!0;return}if(this._probe&&t-this._probe.t>6e3&&(this._probe=null,this._dirty=!0),this._slow>1.6){this._slow=0,this._cool=t+2200;let a=this.effScale;a>.81?this._setScale(Math.max(.8,a-.1)):!this.half&&this.vsync<14?this.half=!0:a>this.T.minScale+.01?this._setScale(Math.max(this.T.minScale,a-.1)):this.cap===60&&(this.cap=30),this._dirty=!0}else this._good>9&&this._ups<3&&(this._good=0,this.cap===30&&this.power!=="saver"&&!this.battery.saver&&this.effScale>=.8?(this.cap=60,this._ups++,this._cool=t+3e3):this.scale<this.maxScale-.01&&(this._probe={from:this.scale,t},this._setScale(Math.min(this.maxScale,this.scale+.08)),this._ups++,this._cool=t+2500));this._dirty&&t>this._cool&&this.save()}_setScale(t){this.scale=Math.round(t*100)/100,this.onScale&&this.onScale()}save(){this._dirty=!1,this.store.set("perf",{gpu:this.gpu,scale:this.scale,cap:this.cap,ceil:this.ceil,half:this.half})}_watchBattery(){navigator.getBattery&&navigator.getBattery().then(t=>{let e=()=>{this.battery.level=t.level,this.battery.charging=t.charging;let s=this.battery.saver;this.battery.saver=!t.charging&&(s?t.level<=.25:t.level<=.2),s!==this.battery.saver&&this.onBattery&&this.onBattery(this.battery.saver)};e(),t.addEventListener("levelchange",e),t.addEventListener("chargingchange",e)}).catch(()=>{})}pixelRatio(t,e){let s=Math.min(window.devicePixelRatio||1,this.T.maxDpr);return t*e*s*s>this.T.maxPixels&&(s=Math.sqrt(this.T.maxPixels/(t*e))),Math.max(.75,s*this.effScale)}};function Js(r){let t=Array.from(r).filter(e=>e>0).sort((e,s)=>e-s);return t.length?t[t.length>>1]:16.67}function rs(r,t){let e={tier:0,gpu:"",mobile:!0};try{let h=document.createElement("canvas").getContext("webgl2");if(h){e=ns(h);let p=h.getExtension("WEBGL_lose_context");p&&p.loseContext()}}catch{}t!=null&&t>=0&&t<=2&&(e.tier=t);let s=/swiftshader|llvmpipe/i.test(e.gpu),i=new re.WebGLRenderer({canvas:r,antialias:!s,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1});i.outputColorSpace=re.LinearSRGBColorSpace,i.toneMapping=re.NoToneMapping,i.setClearColor(1446442,1),i.sortObjects=!0,i.shadowMap.enabled=!1;let a=!!(i.getContext().getContextAttributes()||{}).antialias,c=i.capabilities.getMaxAnisotropy(),n=qe[e.tier],l=Math.min(c,n.id>=1?8:4);return{renderer:i,tier:n,gpu:e.gpu,mobile:e.mobile,msaa:a,aniso:l}}import*as st from"three";var H=(r,t=1)=>new st.Color(r).multiplyScalar(t);function ls(){return{uTime:{value:0},uSunDir:{value:new st.Vector3(0,1,0)},uSunCol:{value:new st.Color},uSkyTop:{value:new st.Color},uSkyHor:{value:new st.Color},uGround:{value:new st.Color},uShadeTint:{value:new st.Color},uFogCol:{value:new st.Color},uFogSun:{value:new st.Color},uFogP:{value:new st.Vector4(.004,0,.03,6)},uRes:{value:new st.Vector3(1,1,.3)},uLift:{value:new st.Color(0,0,0)},uGain:{value:new st.Color(1,1,1)},uGrade:{value:new st.Vector4(1,1,1,1.2/255)},uWind:{value:new st.Vector4(1,0,.3,0)},uFocus:{value:new st.Vector4(0,-999,0,1.6)},uDanger:{value:0},uShadowMap:{value:null},uShadowMat:{value:new st.Matrix4},uShadowP:{value:new st.Vector4(1/1024,.06,.0012,1)},uZenith:{value:new st.Color},uHorizon:{value:new st.Color},uSunGlow:{value:new st.Color},uSunDisc:{value:new st.Color},uNight:{value:0},uCloudCol:{value:new st.Color},uCloudShade:{value:new st.Color}}}var Xe={spring:{elev:34,sun:H("#ffe4c8",3),zenith:H("#4a7bd0"),horizon:H("#f6d2d4"),sunGlow:H("#ffc9a6",1.3),sunDisc:H("#fff3df",1),skyTop:H("#8aa4dc",.56),skyHor:H("#e9c9d4",.46),ground:H("#b8928a",.32),shade:H("#dcd6ee",1),fog:H("#e4c6d2"),fogSun:H("#ffdcc0",1.1),fogP:[.0026,4,.03,7],cloud:H("#fff1ee",1.15),cloudShade:H("#a48fba",.85),lift:H("#2a1c46",.06),gain:H("#fff6f2"),grade:[1.16,1.1,.95],vignette:.34,night:0},summer:{elev:58,sun:H("#fff3dc",3.2),zenith:H("#2a68d4"),horizon:H("#bfe0f2"),sunGlow:H("#fff0d0",1.1),sunDisc:H("#ffffff",1),skyTop:H("#86aae6",.56),skyHor:H("#c4dae6",.44),ground:H("#97a070",.32),shade:H("#d6dcee",1),fog:H("#c9e2f0"),fogSun:H("#fff1d8",1.05),fogP:[.0022,4,.032,8],cloud:H("#ffffff",1.25),cloudShade:H("#93a9cc",.9),lift:H("#0e1a40",.05),gain:H("#fbfdff"),grade:[1.18,1.1,.95],vignette:.3,night:0},autumn:{elev:22,sun:H("#ffc88a",3.2),zenith:H("#5671b8"),horizon:H("#f2bc88"),sunGlow:H("#ffb070",1.5),sunDisc:H("#fff0d0",1),skyTop:H("#9496c8",.54),skyHor:H("#e2b08c",.44),ground:H("#a6765a",.32),shade:H("#dccfe6",1),fog:H("#e0b48e"),fogSun:H("#ffc488",1.2),fogP:[.003,4,.028,6],cloud:H("#ffe2c2",1.15),cloudShade:H("#9c7c98",.8),lift:H("#2a1430",.06),gain:H("#fff2e4"),grade:[1.16,1.1,.95],vignette:.36,night:0},winter:{elev:8,sun:H("#ff9e6a",3),zenith:H("#262c6a"),horizon:H("#ee8a6c"),sunGlow:H("#ff8a5a",1.7),sunDisc:H("#ffd8b0",1),skyTop:H("#7078b8",.56),skyHor:H("#c890a8",.42),ground:H("#8a88b0",.36),shade:H("#d0ccec",1),fog:H("#8f7cae"),fogSun:H("#ff9f78",1.25),fogP:[.0032,4,.026,5],cloud:H("#ffc4ae",1.05),cloudShade:H("#5e5490",.78),lift:H("#1c1040",.07),gain:H("#fff0ec"),grade:[1.1,1.08,1],vignette:.4,night:.35},night:{elev:30,sun:H("#9fb4ff",.9),zenith:H("#0b0d2a"),horizon:H("#3a3570"),sunGlow:H("#8fa2ff",.6),sunDisc:H("#e8eeff",.6),skyTop:H("#3a4290",.3),skyHor:H("#4a3f80",.24),ground:H("#2a2850",.22),shade:H("#b0b4f0",1),fog:H("#2a2756"),fogSun:H("#5a62b0",1),fogP:[.003,4,.026,6],cloud:H("#8a90d0",.7),cloudShade:H("#2a2a5a",.7),lift:H("#0a0a28",.08),gain:H("#e8ecff"),grade:[1.05,1.1,1.05],vignette:.44,night:1}},ti=new st.Color,ei=new st.Color;function cs(r,t,e,s,i,o=null){let a=(l,h,p)=>l.copy(ti.copy(h).lerp(ei.copy(p),s)),c=(l,h)=>l+(h-l)*s,n=st.MathUtils.degToRad(o??c(t.elev,e.elev));return r.uSunDir.value.set(Math.cos(n)*Math.cos(i),Math.sin(n),Math.cos(n)*Math.sin(i)),a(r.uSunCol.value,t.sun,e.sun),a(r.uZenith.value,t.zenith,e.zenith),a(r.uHorizon.value,t.horizon,e.horizon),a(r.uSunGlow.value,t.sunGlow,e.sunGlow),a(r.uSunDisc.value,t.sunDisc,e.sunDisc),a(r.uSkyTop.value,t.skyTop,e.skyTop),a(r.uSkyHor.value,t.skyHor,e.skyHor),a(r.uGround.value,t.ground,e.ground),a(r.uShadeTint.value,t.shade,e.shade),a(r.uFogCol.value,t.fog,e.fog),a(r.uFogSun.value,t.fogSun,e.fogSun),a(r.uCloudCol.value,t.cloud,e.cloud),a(r.uCloudShade.value,t.cloudShade,e.cloudShade),a(r.uLift.value,t.lift,e.lift),a(r.uGain.value,t.gain,e.gain),r.uFogP.value.set(c(t.fogP[0],e.fogP[0]),c(t.fogP[1],e.fogP[1]),c(t.fogP[2],e.fogP[2]),c(t.fogP[3],e.fogP[3])),r.uGrade.value.x=c(t.grade[0],e.grade[0]),r.uGrade.value.y=c(t.grade[1],e.grade[1]),r.uGrade.value.z=c(t.grade[2],e.grade[2]),r.uRes.value.z=c(t.vignette,e.vignette),r.uNight.value=c(t.night,e.night),n}function de(r,t,e){let s=st.MathUtils.degToRad(t);return e.set(Math.cos(s)*Math.cos(r),Math.sin(s),Math.cos(s)*Math.sin(r))}import*as vt from"three";var tt=`
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
`;var Yt=null,hs=1;function us(r,t){Yt=r,hs=t}var ds=(r={})=>({SHADOW_TAPS:hs,...r}),fs=`
uniform vec4 uFocus; // xyz odak (Zifir), w a\xE7\u0131kl\u0131k yar\u0131\xE7ap\u0131
void cutout(vec3 wp, float nearR) {
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
	k = max(k, smoothstep(nearR, nearR * 0.45, length(ap))); // kameraya \xE7ok yak\u0131n dal ve yaprak
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
	cutout(vW, 7.0);
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
}`;function Xt({map:r=null,repeat:t=[1,1],wrap:e=.3,rim:s=.35,snow:i=0,snowY:o=14,side:a=vt.FrontSide,wind:c=!1,cutout:n=!1}={}){let l={};return r&&(l.USE_MAP=1),c&&(l.WIND=1),n&&(l.CUTOUT=1),new vt.ShaderMaterial({vertexShader:si,fragmentShader:ii,defines:ds(l),uniforms:{...Yt,uMap:{value:r},uMapRepeat:{value:new vt.Vector2(t[0],t[1])},uWrap:{value:e},uRim:{value:s},uSnow:{value:i},uSnowY:{value:o}},side:a})}var ps=`
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
	cutout(vW, 11.0);
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
}`;function ms(r,{a2c:t}){return new vt.ShaderMaterial({vertexShader:ps,fragmentShader:oi,defines:ds(t?{A2C:1}:{}),uniforms:{...Yt,uMap:{value:r},uAlphaCut:{value:t?.12:.45},uFacing:{value:1},uFaceDir:{value:new vt.Vector3(0,1,0)}},alphaToCoverage:!!t,side:vt.DoubleSide})}function vs(r){return new vt.ShaderMaterial({vertexShader:ps,fragmentShader:`
			uniform sampler2D uMap;
			varying vec2 vUv;
			void main() { if (texture2D(uMap, vUv).a < 0.22) discard; gl_FragColor = vec4(1.0); }`,uniforms:{...Yt,uMap:{value:r},uFacing:{value:0},uFaceDir:Yt.uSunDir},side:vt.DoubleSide,colorWrite:!1})}function Ke({wind:r=!1}={}){return new vt.ShaderMaterial({vertexShader:`
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
			}`,fragmentShader:"void main() { gl_FragColor = vec4(1.0); }",defines:r?{WIND:1}:{},uniforms:{...Yt},side:vt.DoubleSide,colorWrite:!1})}function Ye(r,t=1){return new vt.ShaderMaterial({vertexShader:"varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",fragmentShader:`
			${tt}
			${Ht}
			${xt}
			uniform vec3 uColor; uniform float uK; uniform float uFade;
			varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(uColor * uK * uFade, vW), 1.0); }`,uniforms:{...Yt,uColor:{value:new vt.Color(r)},uK:{value:t},uFade:{value:1}}})}function gs(r=16777215,t=1){return new vt.ShaderMaterial({vertexShader:`
			attribute vec4 color; varying vec4 vCol; varying vec3 vW;
			void main() { vCol = color; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${tt}
			${Ht}
			${xt}
			uniform vec3 uColor; uniform float uK;
			varying vec4 vCol; varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(vCol.rgb * uColor * uK, vW), 1.0); }`,uniforms:{...Yt,uColor:{value:new vt.Color(r)},uK:{value:t}}})}function xs(r){return new vt.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{...Yt,uStars:{value:r}},depthWrite:!1,side:vt.BackSide})}import*as at from"three";var we=class{constructor(t,e){this.G=t,this.size=e,this.half=17,this.scene=new at.Scene,this.scene.matrixWorldAutoUpdate=!1,this.cam=new at.OrthographicCamera(-this.half,this.half,this.half,-this.half,1,300);let s=new at.DepthTexture(e,e);s.type=at.UnsignedIntType,s.compareFunction=at.LessEqualCompare,s.minFilter=at.LinearFilter,s.magFilter=at.LinearFilter,this.rt=new at.WebGLRenderTarget(e,e,{depthTexture:s,depthBuffer:!0,stencilBuffer:!1,format:at.RedFormat,type:at.UnsignedByteType,minFilter:at.NearestFilter,magFilter:at.NearestFilter,generateMipmaps:!1}),t.uShadowMap.value=s,t.uShadowP.value.set(1/e,.05,9e-4,1),this._bias=new at.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this._r=new at.Vector3,this._u=new at.Vector3,this._f=new at.Vector3,this._p=new at.Vector3}add(t,e){let s=new at.Mesh(t,e);return s.frustumCulled=!1,s.matrixAutoUpdate=!1,s.updateMatrixWorld(!0),this.scene.add(s),s}place(t,e){let s=this._f.copy(e).negate(),i=Math.abs(s.y)>.98?this._u.set(1,0,0):this._u.set(0,1,0),o=this._r.crossVectors(s,i).normalize(),a=this._u.crossVectors(o,s).normalize(),c=this.half*2/this.size,n=Math.round(t.dot(o)/c)*c,l=Math.round(t.dot(a)/c)*c,h=t.dot(s),p=this._p.set(0,0,0).addScaledVector(o,n).addScaledVector(a,l).addScaledVector(s,h),u=this.cam;u.position.copy(p).addScaledVector(s,-150),u.up.copy(a),u.lookAt(p),u.updateMatrixWorld(!0),u.updateProjectionMatrix(),this.G.uShadowMat.value.copy(this._bias).multiply(u.projectionMatrix).multiply(u.matrixWorldInverse)}render(t){let e=t.getRenderTarget();t.setRenderTarget(this.rt),t.clear(!1,!0,!1),t.render(this.scene,this.cam),t.setRenderTarget(e)}dispose(){this.rt.depthTexture.dispose(),this.rt.dispose()}};import*as Mt from"three";import*as Kt from"three";function Nt(r,t){let e=document.createElement("canvas");return e.width=r,e.height=t,[e,e.getContext("2d")]}function oe(r,t,e,s,i,o){for(let a=-1;a<=1;a++)for(let c=-1;c<=1;c++){let n=e+a*r,l=s+c*t;n+i<0||n-i>r||l+i<0||l-i>t||o(n,l)}}function Gt(r,{srgb:t=!0,repeat:e=!0,aniso:s=1,mips:i=!0}={}){let o=new Kt.CanvasTexture(r);return t&&(o.colorSpace=Kt.SRGBColorSpace),e&&(o.wrapS=o.wrapT=Kt.RepeatWrapping),o.anisotropy=s,o.generateMipmaps=i,o.minFilter=i?Kt.LinearMipmapLinearFilter:Kt.LinearFilter,o.needsUpdate=!0,o}function ys(r,t){let e=r,s=r,[i,o]=Nt(e,s),a=St(7),c=e/512,n=o.createLinearGradient(0,0,e,0);n.addColorStop(0,"#e8e3da"),n.addColorStop(.5,"#efebe3"),n.addColorStop(1,"#e8e3da"),o.fillStyle=n,o.fillRect(0,0,e,s);let l=["#f6f3ed","#ddd6cc","#e9e1d6","#efe2dc","#e2e2e4","#f2ede2"];for(let h=0;h<70;h++){let p=a()*e,u=a()*s,m=a.range(30,120)*c,d=m*a.range(.12,.4);o.globalAlpha=a.range(.18,.4),o.fillStyle=a.pick(l),oe(e,s,p,u,m,(v,g)=>{o.beginPath(),o.ellipse(v,g,m,d,0,0,D),o.fill()})}o.globalAlpha=.06,o.strokeStyle="#8c8076",o.lineWidth=1*c;for(let h=0;h<90;h++){let p=a()*e,u=a()*s,m=a.range(20,90)*c;oe(e,s,p,u,m,(d,v)=>{o.beginPath(),o.moveTo(d,v),o.lineTo(d+a.range(-2,2)*c,v+m),o.stroke()})}for(let h=0;h<26;h++){let p=a()*e,u=a()*s,m=a.range(40,160)*c,d=a.range(3,9)*c;oe(e,s,p,u,m,(v,g)=>{o.globalAlpha=.5,o.fillStyle="#fbf9f4",o.beginPath(),o.ellipse(v,g,m/2,d/2,0,0,D),o.fill(),o.globalAlpha=.18,o.fillStyle="#7d6e66",o.beginPath(),o.ellipse(v,g+d*.55,m/2.1,d/4,0,0,D),o.fill()})}for(let h=0;h<9;h++){let p=a()*e,u=a()*s,m=a.range(18,50)*c,d=a.range(5,12)*c;oe(e,s,p,u,m,(v,g)=>{o.globalAlpha=.55,o.fillStyle=a()<.5?"#d39a7c":"#c98468",o.beginPath(),o.ellipse(v,g,m/2,d/2,0,0,D),o.fill(),o.globalAlpha=.7,o.strokeStyle="#f7f1e8",o.lineWidth=1.5*c,o.stroke()})}for(let h=0;h<34;h++){let p=a()*s,u=a.range(3,9)|0,m=a()*e;for(let d=0;d<u;d++){let v=a.range(5,34)*c,g=a.range(1.2,3.2)*c,x=p+a.range(-4,4)*c;oe(e,s,m,x,v,(f,y)=>{o.globalAlpha=a.range(.55,.9),o.fillStyle=a()<.7?"#3b3330":"#5a4a44",o.beginPath(),o.ellipse(f,y,v/2,g/2,0,0,D),o.fill()}),m+=v+a.range(4,30)*c}}for(let h=0;h<11;h++){let p=a()*e,u=a()*s,m=a.range(18,64)*c,d=m*a.range(.35,.8);oe(e,s,p,u,m,(v,g)=>{o.globalAlpha=.85,o.fillStyle="#1f1b1a",o.beginPath();let x=18;for(let f=0;f<=x;f++){let y=f/x*D,b=1+a.range(-.25,.2),M=Math.cos(y)*m*.5*b,C=Math.sin(y)*d*.5*b*(.55+.45*Math.abs(Math.cos(y)));f===0?o.moveTo(v+M,g+C):o.lineTo(v+M,g+C)}o.closePath(),o.fill(),o.globalAlpha=.25,o.strokeStyle="#6e625c",o.lineWidth=3*c,o.stroke()})}return o.globalAlpha=1,Gt(i,{aniso:t})}function bs(r,t,e){let[s,i]=Nt(r,t),o=St(11),a=r/512;i.fillStyle="#b07c50",i.fillRect(0,0,r,t);let c=8,n=r/c,l=["#d6a473","#c99563","#deb07c","#cc9a66","#d3a06c","#c08c5c"];for(let p=0;p<c;p++){let u=p*n;i.fillStyle=o.pick(l),i.fillRect(u+1.5*a,0,n-3*a,t);let m=i.createLinearGradient(0,0,0,t);m.addColorStop(0,"rgba(60,30,10,0.18)"),m.addColorStop(.15,"rgba(255,230,190,0.06)"),m.addColorStop(.85,"rgba(255,230,190,0.04)"),m.addColorStop(1,"rgba(60,30,10,0.22)"),i.fillStyle=m,i.fillRect(u,0,n,t);for(let d=0;d<9;d++){let v=u+o.range(4,n-4)*1;i.globalAlpha=o.range(.12,.3),i.strokeStyle=o()<.5?"#6e4426":"#d9a875",i.lineWidth=o.range(.8,2)*a,i.beginPath();for(let g=0;g<=t;g+=8*a){let x=Math.sin(g*.03/a+d*1.7+p)*2.2*a;g===0?i.moveTo(v+x,g):i.lineTo(v+x,g)}i.stroke()}if(o()<.45){let d=u+o.range(8,n-8),v=o.range(.2,.8)*t;i.globalAlpha=.5,i.fillStyle="#5c381e",i.beginPath(),i.ellipse(d,v,3*a,7*a,0,0,D),i.fill()}i.globalAlpha=.8,i.fillStyle="#3a2a22";for(let d of[t*.12,t*.88])i.beginPath(),i.arc(u+n*.5,d,2.2*a,0,D),i.fill();i.globalAlpha=1}i.fillStyle="#4a2e1c";for(let p=0;p<=c;p++)i.fillRect(p*n-1.6*a,0,3.2*a,t);let h=i.createLinearGradient(0,0,0,t);return h.addColorStop(0,"rgba(40,20,8,0.35)"),h.addColorStop(.06,"rgba(40,20,8,0)"),h.addColorStop(.94,"rgba(40,20,8,0)"),h.addColorStop(1,"rgba(40,20,8,0.35)"),i.fillStyle=h,i.fillRect(0,0,r,t),Gt(s,{aniso:e})}function ws(r){let[t,e]=Nt(r,r),s=r/2,i=St(23),o=(n,l,h,p,u,m,d)=>{e.save(),e.translate(n,l),e.rotate(u),e.fillStyle=m,e.beginPath(),e.moveTo(0,-h*.5),e.quadraticCurveTo(p,-h*.1,0,h*.5),e.quadraticCurveTo(-p,-h*.1,0,-h*.5),e.fill(),d&&(e.strokeStyle=d,e.lineWidth=Math.max(.6,p*.08),e.beginPath(),e.moveTo(0,-h*.42),e.lineTo(0,h*.42),e.stroke()),e.restore()},a=(n,l,h,p)=>{for(let u=0;u<h;u++){let m=i()*D,d=Math.sqrt(i())*s*.4,v=n+Math.cos(m)*d,g=l+Math.sin(m)*d*.92,x=1-(g-(l-s*.4))/(s*.8);p(v,g,x,d/(s*.4))}},c=s/256;{let n=s*.5,l=s*.5;a(n,l,40,(p,u,m)=>{o(p,u,i.range(20,30)*c,i.range(7,10)*c,i()*D,m>.5?"#9fc56a":"#76a24e",null)});let h=["#ffd3e2","#ffc2d6","#ffe6ee","#f7a9c4","#ffdbe6"];a(n,l,120,(p,u,m)=>{let d=i.range(8,13)*c,v=i.pick(h),g=i()*D;e.fillStyle=v;for(let x=0;x<5;x++){let f=g+x/5*D;e.beginPath(),e.ellipse(p+Math.cos(f)*d*.55,u+Math.sin(f)*d*.55,d*.55,d*.38,f,0,D),e.fill()}e.fillStyle=m>.5?"#fff3c8":"#e88aa8",e.beginPath(),e.arc(p,u,d*.22,0,D),e.fill(),m<.4&&(e.globalAlpha=.25,e.fillStyle="#a0507a",e.beginPath(),e.arc(p,u,d*.9,0,D),e.fill(),e.globalAlpha=1)})}{let n=s*1.5,l=s*.5,h=["#4f8f3a","#5fa040","#3f7a32","#6db24a","#477f35","#7cbc54"];a(n,l,190,(p,u,m)=>{let d=m>.65&&i()<.6?"#8ccc5e":i.pick(h);o(p,u,i.range(22,34)*c,i.range(8,12)*c,i()*D,d,"rgba(30,60,20,0.45)")})}{let n=s*.5,l=s*1.5,h=["#f2b233","#f7c440","#e8932c","#f0a030","#d9702a","#c8512a","#ffd65a"];a(n,l,170,(p,u,m)=>{let d=m>.6&&i()<.5?"#ffd86a":i.pick(h);o(p,u,i.range(22,34)*c,i.range(9,13)*c,i()*D,d,"rgba(120,50,10,0.4)")})}{let n=s*1.5,l=s*1.5;a(n,l,70,(h,p,u)=>{let m=i.range(12,26)*c,d=e.createRadialGradient(h-m*.3,p-m*.4,m*.1,h,p,m);d.addColorStop(0,u>.4?"#ffffff":"#eef2ff"),d.addColorStop(1,u>.4?"#d8e2f6":"#b8c4e8"),e.fillStyle=d,e.beginPath(),e.arc(h,p,m,0,D),e.fill()})}return Gt(t,{repeat:!1})}function ks(r=128){let[t,e]=Nt(r,r),s=r/2,i=e.createRadialGradient(s,s,0,s,s,s);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.18,"rgba(255,255,255,0.55)"),i.addColorStop(.45,"rgba(255,255,255,0.14)"),i.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=i,e.fillRect(0,0,r,r),Gt(t,{srgb:!1,repeat:!1})}function Ms(r=128){let[t,e]=Nt(r,r),s=r/2,i=St(5);for(let o=0;o<22;o++){let a=i()*D,c=i()*r*.18,n=r*i.range(.12,.3),l=s+Math.cos(a)*c,h=s+Math.sin(a)*c,p=e.createRadialGradient(l,h,0,l,h,n);p.addColorStop(0,"rgba(10,6,20,0.55)"),p.addColorStop(1,"rgba(10,6,20,0)"),e.fillStyle=p,e.fillRect(0,0,r,r)}return Gt(t,{srgb:!1,repeat:!1})}function Ts(r=1024,t=512){let[e,s]=Nt(r,t);s.fillStyle="#000",s.fillRect(0,0,r,t);let i=St(99);for(let o=0;o<900;o++){let a=i()*r,c=i()*t,n=Math.pow(i(),3),l=.5+n*1.6;s.fillStyle=`rgb(${80+n*175|0},${i()*255|0},0)`,s.beginPath(),s.arc(a,c,l,0,D),s.fill()}return Gt(e,{srgb:!1})}function Es(r=256){let[t,e]=Nt(r,r),s=St(41),i=r/2;for(let o=0;o<46;o++){let a=s()*D,c=Math.pow(s(),.8)*r*.28,n=i+Math.cos(a)*c*1.3,l=i+Math.sin(a)*c*.55+r*.04,h=r*s.range(.08,.2),p=e.createRadialGradient(n,l-h*.3,0,n,l,h),m=Math.max(0,Math.min(1,1-(l-i*.6)/(r*.5)))*255|0;p.addColorStop(0,`rgba(${m},${m},${m},0.5)`),p.addColorStop(1,`rgba(${m},${m},${m},0)`),e.fillStyle=p,e.fillRect(0,0,r,r)}return Gt(t,{srgb:!1,repeat:!1})}function Ss(r=256){let[t,e]=Nt(r,r),s=e.createImageData(r,r),i=St(3),o=[8,16,32,64],a=o.map(n=>{let l=new Float32Array(n*n);for(let h=0;h<l.length;h++)l[h]=i();return l}),c=(n,l,h,p)=>{let u=h*l,m=p*l,d=Math.floor(u),v=Math.floor(m),g=u-d,x=m-v,f=g*g*(3-2*g),y=x*x*(3-2*x),b=(F,N)=>n[(N%l+l)%l*l+(F%l+l)%l],M=b(d,v)+(b(d+1,v)-b(d,v))*f,C=b(d,v+1)+(b(d+1,v+1)-b(d,v+1))*f;return M+(C-M)*y};for(let n=0;n<r;n++)for(let l=0;l<r;l++){let h=l/r,p=n/r,u=0,m=.55,d=0;for(let x=0;x<o.length;x++)u+=c(a[x],o[x],h,p)*m,d+=m,m*=.5;u/=d;let v=c(a[1],o[1],h+.37,p+.21),g=(n*r+l)*4;s.data[g]=u*255,s.data[g+1]=v*255,s.data[g+2]=0,s.data[g+3]=255}return e.putImageData(s,0,0),Gt(t,{srgb:!1})}function zs(r=128){let[t,e]=Nt(r,r),s=r/2,i=s/2;e.fillStyle="#ffd0e0",e.beginPath(),e.ellipse(i,i,s*.32,s*.2,.4,0,D),e.fill(),e.fillStyle="#ffeef4",e.beginPath(),e.ellipse(i-s*.06,i-s*.03,s*.16,s*.08,.4,0,D),e.fill(),e.save(),e.translate(s+i,i),e.rotate(.6),e.fillStyle="#f0a43a",e.beginPath(),e.moveTo(0,-s*.36),e.quadraticCurveTo(s*.22,0,0,s*.36),e.quadraticCurveTo(-s*.22,0,0,-s*.36),e.fill(),e.strokeStyle="rgba(120,50,10,0.6)",e.lineWidth=1.2,e.beginPath(),e.moveTo(0,-s*.3),e.lineTo(0,s*.3),e.stroke(),e.restore();let o=e.createRadialGradient(i,s+i,0,i,s+i,s*.3);return o.addColorStop(0,"rgba(255,255,255,1)"),o.addColorStop(.5,"rgba(240,246,255,0.8)"),o.addColorStop(1,"rgba(230,240,255,0)"),e.fillStyle=o,e.fillRect(0,s,s,s),o=e.createRadialGradient(s+i,s+i,0,s+i,s+i,s*.48),o.addColorStop(0,"rgba(255,255,230,1)"),o.addColorStop(.15,"rgba(255,240,160,0.9)"),o.addColorStop(.45,"rgba(255,200,90,0.22)"),o.addColorStop(1,"rgba(255,180,60,0)"),e.fillStyle=o,e.fillRect(s,s,s,s),Gt(t,{repeat:!1})}function _s(r=128,t=256){let[e,s]=Nt(r,t),i=St(17);for(let c=0;c<26;c++){let n=i()*r,l=i.range(3,14),h=s.createLinearGradient(n-l,0,n+l,0),p=i.range(.15,.5);h.addColorStop(0,"rgba(255,255,255,0)"),h.addColorStop(.5,`rgba(255,255,255,${p})`),h.addColorStop(1,"rgba(255,255,255,0)"),s.fillStyle=h,s.fillRect(n-l,0,l*2,t)}s.globalCompositeOperation="destination-in";let o=s.createLinearGradient(0,0,0,t);o.addColorStop(0,"rgba(0,0,0,0)"),o.addColorStop(.25,"rgba(0,0,0,1)"),o.addColorStop(.7,"rgba(0,0,0,0.6)"),o.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=o,s.fillRect(0,0,r,t);let a=s.createLinearGradient(0,0,r,0);return a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(.2,"rgba(0,0,0,1)"),a.addColorStop(.8,"rgba(0,0,0,1)"),a.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=a,s.fillRect(0,0,r,t),s.globalCompositeOperation="source-over",Gt(e,{srgb:!1,repeat:!1})}function Rs(r,t){let[e,s]=Nt(r,r),i=St(31),o=r/256;s.fillStyle="#8f8496",s.fillRect(0,0,r,r);let a=["#a093a6","#7b7088","#9a8c94","#b0a2a8","#857a92","#6f6680"];for(let c=0;c<160;c++){let n=i()*r,l=i()*r,h=i.range(6,40)*o,p=h*i.range(.2,.6);s.globalAlpha=i.range(.2,.5),s.fillStyle=i.pick(a),oe(r,r,n,l,h,(u,m)=>{s.beginPath(),s.ellipse(u,m,h,p,0,0,D),s.fill()})}s.globalAlpha=.22,s.strokeStyle="#4e4660";for(let c=0;c<14;c++){let n=i()*r;s.lineWidth=i.range(1,3)*o,s.beginPath();for(let l=0;l<=r;l+=8*o){let h=n+Math.sin(l*.05/o+c)*3*o;l===0?s.moveTo(l,h):s.lineTo(l,h)}s.stroke()}return s.globalAlpha=1,Gt(e,{aniso:t})}import*as At from"three";import*as bt from"three";var yt=class{constructor(){this.p=[],this.n=[],this.c=[],this.uv=[],this.sw=[],this.idx=[],this.hasSway=!1,this.sway=[0,0,0,0]}get count(){return this.p.length/3}setSway(t,e,s,i){this.sway[0]=t,this.sway[1]=e,this.sway[2]=s,this.sway[3]=i,i>0&&(this.hasSway=!0)}vert(t,e,s,i,o,a,c,n,l,h,p=0,u=0){return this.p.push(t,e,s),this.n.push(i,o,a),this.c.push(c,n,l,h),this.uv.push(p,u),this.sw.push(this.sway[0],this.sway[1],this.sway[2],this.sway[3]),this.count-1}tri(t,e,s){this.idx.push(t,e,s)}quad(t,e,s,i){this.idx.push(t,e,s,t,s,i)}tube(t,e,s,i,{uvScale:o=1,capEnd:a=!0,capStart:c=!1,sway:n=null}={}){let l=t.length,h=new bt.Vector3,p=new bt.Vector3,u=new bt.Vector3,m=new bt.Vector3,d=this.count,v=0;for(let f=0;f<l;f++){let y=t[Math.max(0,f-1)],b=t[Math.min(l-1,f+1)];h.subVectors(b,y).normalize(),f===0?(m.set(0,1,0),Math.abs(h.dot(m))>.9&&m.set(1,0,0),p.crossVectors(h,m).normalize()):p.sub(m.copy(h).multiplyScalar(p.dot(h))).normalize(),u.crossVectors(h,p).normalize(),f>0&&(v+=t[f].distanceTo(t[f-1])/(Math.PI*2*Math.max(e[f],.05))*o),n&&n(f,f/(l-1));for(let M=0;M<=s;M++){let C=M/s*Math.PI*2,F=Math.cos(C),N=Math.sin(C),L=p.x*F+u.x*N,Z=p.y*F+u.y*N,G=p.z*F+u.z*N,K=e[f],T=i(f,f/(l-1),C,L,Z,G);this.vert(t[f].x+L*K,t[f].y+Z*K,t[f].z+G*K,L,Z,G,T[0],T[1],T[2],T[3],M/s,v)}}let g=s+1;for(let f=0;f<l-1;f++)for(let y=0;y<s;y++){let b=d+f*g+y,M=b+g;this.quad(b,M,M+1,b+1)}let x=(f,y)=>{let b=t[f],M=new bt.Vector3().subVectors(t[y?1:l-1],t[y?0:l-2]).normalize();y&&M.negate();let C=i(f,y?0:1,0,M.x,M.y,M.z),F=this.vert(b.x,b.y,b.z,M.x,M.y,M.z,C[0],C[1],C[2],C[3],.5,v),N=d+f*g;for(let L=0;L<s;L++)y?this.tri(F,N+L+1,N+L):this.tri(F,N+L,N+L+1)};a&&x(l-1,!1),c&&x(0,!0)}box(t,e,s,i,o){let a=[[e,s,i],[e.clone().negate(),s,i.clone().negate()],[i,s,e.clone().negate()],[i.clone().negate(),s,e],[s,i,e],[s.clone().negate(),i.clone().negate(),e]];for(let[c,n,l]of a){let h=c.clone().normalize(),p=o(h),u=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([v,g])=>{let x=t.clone().add(c).addScaledVector(l,v).addScaledVector(n,g);return this.vert(x.x,x.y,x.z,h.x,h.y,h.z,p[0],p[1],p[2],p[3],(v+1)/2,(g+1)/2)}),m=new bt.Vector3().subVectors(this.at(u[1]),this.at(u[0])),d=new bt.Vector3().subVectors(this.at(u[2]),this.at(u[0]));m.cross(d).dot(h)>=0?this.quad(u[0],u[1],u[2],u[3]):this.quad(u[0],u[3],u[2],u[1])}}fixWinding(){let t=this.p,e=this.n,s=this.idx;for(let i=0;i<s.length;i+=3){let o=s[i]*3,a=s[i+1]*3,c=s[i+2]*3,n=t[a]-t[o],l=t[a+1]-t[o+1],h=t[a+2]-t[o+2],p=t[c]-t[o],u=t[c+1]-t[o+1],m=t[c+2]-t[o+2],d=l*m-h*u,v=h*p-n*m,g=n*u-l*p;if(d*e[o]+v*e[o+1]+g*e[o+2]<0){let x=s[i+1];s[i+1]=s[i+2],s[i+2]=x}}return this}at(t){return new bt.Vector3(this.p[t*3],this.p[t*3+1],this.p[t*3+2])}build(){let t=new bt.BufferGeometry;return t.setAttribute("position",new bt.Float32BufferAttribute(this.p,3)),t.setAttribute("normal",new bt.Float32BufferAttribute(this.n,3)),t.setAttribute("color",new bt.Float32BufferAttribute(this.c,4)),t.setAttribute("uv",new bt.Float32BufferAttribute(this.uv,2)),this.hasSway&&t.setAttribute("aSway",new bt.Float32BufferAttribute(this.sw,4)),t.setIndex(this.count>65535?new bt.Uint32BufferAttribute(this.idx,1):new bt.Uint16BufferAttribute(this.idx,1)),t.computeBoundingSphere(),t.computeBoundingBox(),t}};var pe=7.658461538461538*Math.PI*2;function wt(r){let t=Math.max(r,-2);return 3.05+.95*(1-Math.min(t,52)/52)+1.9*Math.exp(-Math.max(t,0)/2.3)}var le=[{th:9.35,out:3.4,w:.5,leaves:"blossom"},{th:15.5,out:4.6,w:.56,leaves:"green"},{th:21.3,out:6.2,w:.62,leaves:"green",nest:!0},{th:33,out:4.8,w:.54,leaves:"gold"},{th:39.4,out:3.8,w:.48,leaves:"snow"}],ni=r=>Math.abs(r)>=1?0:.5+.5*Math.cos(Math.PI*r);function jt(r){return 50.4-r/(Math.PI*2)*6.5}function je(r){let t=0;for(let e of le)t+=e.out*ni((r-e.th)/e.w);return t}function Ze(r){return wt(jt(r))+.98+je(r)}var te=[{id:"bahar-1",season:"spring",from:0,to:6,title:"\xC7i\xE7ek Tac\u0131",kicker:"Bahar \xB7 I"},{id:"bahar-2",season:"spring",from:6,to:12,title:"Pembe R\xFCzg\xE2r",kicker:"Bahar \xB7 II"},{id:"yaz-1",season:"summer",from:12,to:18,title:"Z\xFCmr\xFCt G\xF6vde",kicker:"Yaz \xB7 I"},{id:"yaz-2",season:"summer",from:18,to:24,title:"Ku\u015F Yuvas\u0131",kicker:"Yaz \xB7 II"},{id:"guz-1",season:"autumn",from:24,to:30,title:"Alt\u0131n Yapraklar",kicker:"G\xFCz \xB7 I"},{id:"guz-2",season:"autumn",from:30,to:36,title:"F\u0131rt\u0131na",kicker:"G\xFCz \xB7 II"},{id:"kis-1",season:"winter",from:36,to:42,title:"K\u0131ra\u011F\u0131",kicker:"K\u0131\u015F \xB7 I"},{id:"kis-2",season:"winter",from:42,to:pe,title:"K\xF6k Kap\u0131s\u0131",kicker:"K\u0131\u015F \xB7 II",finale:!0}];function ke(r,t=[0,0,0,0]){let e=(a,c,n)=>{let l=Math.min(1,Math.max(0,(n-a)/(c-a)));return l*l*(3-2*l)},s=e(37,41,r),i=e(25,29,r)*(1-s),o=e(12.5,16.5,r)*(1-s-i);return t[0]=s,t[1]=i,t[2]=o,t[3]=Math.max(0,1-s-i-o),t}var Me=.2,Te=class{constructor(){let t=[],e=0,s=0,i=0,o=0,a=.002;for(let l=0;l<=pe+1e-6;l+=a){let h=Ze(l),p=Math.cos(l)*h,u=Math.sin(l)*h,m=jt(l);t.length&&(e+=Math.hypot(p-s,m-i,u-o)),t.push(l,e),s=p,i=m,o=u}this.length=e;let c=Math.floor(e/Me)+1;this.n=c,this.TH=new Float32Array(c),this.X=new Float32Array(c),this.Y=new Float32Array(c),this.Z=new Float32Array(c),this.R=new Float32Array(c);let n=0;for(let l=0;l<c;l++){let h=l*Me;for(;n<t.length/2-2&&t[(n+1)*2+1]<h;)n++;let p=t[n*2+1],u=t[(n+1)*2+1],m=u>p?(h-p)/(u-p):0,d=t[n*2]+(t[(n+1)*2]-t[n*2])*lt(m,0,1),v=Ze(d);this.TH[l]=d,this.R[l]=v,this.X[l]=Math.cos(d)*v,this.Z[l]=Math.sin(d)*v,this.Y[l]=jt(d)}this.TX=new Float32Array(c),this.TY=new Float32Array(c),this.TZ=new Float32Array(c),this.SX=new Float32Array(c),this.SZ=new Float32Array(c);for(let l=0;l<c;l++){let h=Math.max(0,l-1),p=Math.min(c-1,l+1),u=this.X[p]-this.X[h],m=this.Y[p]-this.Y[h],d=this.Z[p]-this.Z[h],v=Math.hypot(u,m,d)||1;u/=v,m/=v,d/=v,this.TX[l]=u,this.TY[l]=m,this.TZ[l]=d;let g=-d,x=u,f=Math.hypot(g,x)||1;g/=f,x/=f,g*this.X[l]+x*this.Z[l]<0&&(g=-g,x=-x),this.SX[l]=g,this.SZ[l]=x}}sample(t,e){let s=lt(t/Me,0,this.n-1.0001),i=Math.floor(s),o=s-i,a=c=>c[i]+(c[i+1]-c[i])*o;return e.x=a(this.X),e.y=a(this.Y),e.z=a(this.Z),e.tx=a(this.TX),e.ty=a(this.TY),e.tz=a(this.TZ),e.sx=a(this.SX),e.sz=a(this.SZ),e.th=a(this.TH),e.r=a(this.R),e}sAtTheta(t){let e=0,s=this.n-1;for(;s-e>1;){let o=e+s>>1;this.TH[o]<t?e=o:s=o}let i=(t-this.TH[e])/Math.max(1e-6,this.TH[s]-this.TH[e]);return(e+lt(i,0,1))*Me}offTrunk(t){return this.R[t]-wt(this.Y[t])}};function Hs(r){let t=new yt,e=r.n,s=new Float32Array(e);for(let d=0;d<e;d++){let v=r.offTrunk(d);s[d]=.95+.2*(1-_t(1.3,2.2,v))}let i=1.9/2,o=1/2.8;for(let d=0;d<e;d++){let v=r.X[d],g=r.Y[d],x=r.Z[d],f=r.SX[d],y=r.SZ[d],b=d*.2,M=v-f*s[d],C=x-y*s[d],F=v+f*i,N=x+y*i,L=r.offTrunk(d),Z=1-_t(1.3,2.2,L),G=.62+.38*(1-Z);t.vert(M,g-.02,C,0,1,0,1,1,1,G,b*o,0),t.vert(v-f*.3,g,x-y*.3,0,1,0,1,1,1,.92+.08*(1-Z),b*o,.35),t.vert(v+f*.3,g,x+y*.3,0,1,0,1,1,1,1,b*o,.65),t.vert(F,g-.02,N,f*.2,.98,y*.2,1,1,1,1,b*o,1),t.vert(F,g-.02,N,f,0,y,.72,.68,.64,.9,b*o,0),t.vert(F,g-.34,N,f,0,y,.72,.68,.64,.7,b*o,.12),t.vert(F,g-.34,N,0,-1,0,.5,.46,.44,.55,b*o,0),t.vert(M,g-.34,C,0,-1,0,.5,.46,.44,.4,b*o,1),t.vert(M,g-.34,C,-f,0,-y,.72,.68,.64,.7,b*o,.12),t.vert(M,g-.02,C,-f,0,-y,.72,.68,.64,.9,b*o,0)}let a=10;for(let d=0;d<e-1;d++){let v=d*a,g=(d+1)*a,x=(f,y)=>t.quad(v+f,g+f,g+y,v+y);x(0,1),x(1,2),x(2,3),x(4,5),x(6,7),x(8,9)}t.fixWinding();let c=new yt,n=[],l=1.55,h=[],p=d=>()=>[.42*d,.27*d,.17*d,1];for(let d=.6;d<r.length-.4;d+=l){let v=Math.round(d/.2),x=r.offTrunk(v)>2?[1,-1]:[1];for(let f of x){let y=f>0?i-.1:s[v]-.1,b=r.X[v]+r.SX[v]*y*f,M=r.Z[v]+r.SZ[v]*y*f,C=r.Y[v],F=new At.Vector3(b,C-.05,M),N=new At.Vector3(b,C+.78,M);c.tube([F,N],[.06,.05],6,p(1),{capEnd:!0}),h.push({s:d,side:f,top:N.clone()})}}for(let d of[1,-1]){let v=h.filter(g=>g.side===d);for(let g=0;g<v.length-1;g++){let x=v[g],f=v[g+1];if(f.s-x.s>l*1.6)continue;let y=[];for(let b=0;b<=1.0001;b+=.25){let M=x.top.clone().lerp(f.top,b);M.y-=.03+Math.sin(b*Math.PI)*.14,y.push(M)}c.tube(y,y.map(()=>.028),4,()=>[.62,.5,.36,1],{capEnd:!1})}}for(let d=1.2;d<r.length-1;d+=2.6){let v=Math.round(d/.2);if(r.offTrunk(v)>1.6)continue;let g=r.Y[v],x=r.TH[v],f=new At.Vector3(r.X[v]+r.SX[v]*.55,g-.34+.02,r.Z[v]+r.SZ[v]*.55),y=wt(g-1.5)-.1,b=new At.Vector3(Math.cos(x)*y,g-1.55,Math.sin(x)*y);c.tube([f,b],[.075,.09],5,p(.85),{capEnd:!0,capStart:!0})}let u=new yt,m=7;for(let d of h){if(d.side<0||d.s<m)continue;let v=Math.round(d.s/.2);if(r.offTrunk(v)>1.6)continue;m=d.s+12.5;let g=r.SX[v],x=r.SZ[v],f=d.top.clone().add(new At.Vector3(g*.32,.05,x*.32));c.tube([d.top.clone().add(new At.Vector3(0,-.02,0)),f],[.022,.022],4,p(.6),{capEnd:!1});let y=f.clone().add(new At.Vector3(0,-.28,0)),b=new At.Vector3(.09,0,0),M=new At.Vector3(0,.13,0),C=new At.Vector3(0,0,.09);u.box(y,b,M,C,F=>[1,.82+.18*F.y,.7,1]),c.box(y.clone().add(new At.Vector3(0,.16,0)),b.clone().multiplyScalar(1.35),new At.Vector3(0,.035,0),C.clone().multiplyScalar(1.35),()=>[.3,.2,.14,1]),c.box(y.clone().add(new At.Vector3(0,-.15,0)),b.clone().multiplyScalar(1.15),new At.Vector3(0,.02,0),C.clone().multiplyScalar(1.15),()=>[.3,.2,.14,1]),n.push(y)}return{walkway:t.build(),rail:c.build(),glass:u.build(),lanterns:n}}import*as kt from"three";var As=[4.85,5.72,.48,1.3];function It(r,t){let e=wt(t),s=1+.022*Math.sin(7*r+.13*t)+.014*Math.sin(12*r-.31*t+1.3),i=Math.max(t,0),o=0;for(let c of As){let n=Math.atan2(Math.sin(r-c),Math.cos(r-c));o+=Math.exp(-(n*n)/.045)*1.55}o*=Math.exp(-i/1.9);let a=Math.pow(Math.max(0,Math.cos(5*(r-.45))),2)*.75*_t(49.5,53.5,t);return e*s+o+a}var ct=(r,t,e)=>new kt.Vector3(r,t,e),ft=(r,t,e)=>ct(Math.cos(t)*r,e,Math.sin(t)*r);function ri(r,t=4){return new kt.CatmullRomCurve3(r,!1,"centripetal").getPoints(Math.max(2,(r.length-1)*t))}function Ps(r,t){let e=St(1453),s=t,i=s.leafDensity,o=new yt,a=new yt,c=[],n=[],l=w=>(k,S)=>{let z=_t(.35,.08,w*(1-S*.85));return[O(1,.52,z),O(1,.38,z),O(1,.33,z),O(.85,1,S)]},h=(w,k,S,z,P,I,$=7)=>{let J=ri(w,4),Q=J.length,X=e()*10,rt=J.map((ot,j)=>{let ut=j/(Q-1);return O(k,S,Math.pow(ut,.7))*(1+.1*Math.sin(j*1.9+X)*(1-ut))*(1+.35*Math.exp(-ut*14))});o.tube(J,rt,$,l(k),{uvScale:.6,sway:(ot,j)=>o.setSway(z.x,z.y,z.z,O(P,I,Math.pow(j,1.6)))});for(let ot=0;ot<Q-1;ot+=2){let j=Math.min(Q-1,ot+2),ut=rt[ot];if(ut<.1)break;c.push({a:J[ot].clone(),b:J[j].clone(),r:(ut+rt[j])*.5*.92,anchor:z,wa:O(P,I,Math.pow(ot/(Q-1),1.6)),wb:O(P,I,Math.pow(j/(Q-1),1.6))})}return o.setSway(0,0,0,0),J},p=(w,k,S,z,P=-1,I=1)=>{n.push({c:w.clone(),r:k,rx:k*1.15,ry:k*.78*I,rz:k*1.15,anchor:S,w:z,type:P})},u=[];for(let w=4.5;w<48.5;w+=e.range(1.55,2.3)){let S=(50.4-w)/6.5*D+Math.PI+e.range(-.55,.55),z=!1;for(let P of le){let I=Math.abs(jt(P.th)-w),$=Math.abs(Math.atan2(Math.sin(S-P.th),Math.cos(S-P.th)));I<4.5&&$<P.w+.7&&(z=!0)}if(!z&&(u.push({y:w,az:S}),e()<.35)){let P=S+e.range(-.9,.9)+(e()<.5?.9:-.9);u.push({y:w+e.range(-.4,.4),az:P})}}for(let w of u){let{y:k,az:S}=w,z=wt(k),P=k<13,I=(P?e.range(4,6):e.range(4.8,7.4))*(k>40?1.12:1),$=e.range(-.22,.22),J=e.range(.3,.55),Q=e.range(-.35,.35),X=[ft(z*.55,S,k-.2),ft(z+.7,S+$*.15,k+.15),ft(z+I*.42,S+$*.5,k+I*J*.3+Q),ft(z+I*.75,S+$*.8,k+I*J*.7-Q*.5),ft(z+I,S+$*1.2,k+I*J)],rt=X[4],ot=I/8,j=O(.42,.7,(I-4.5)/5),ut=h(X,j,.07,rt,0,ot),ne=P?2:e.range(1,3.6)|0;for(let Pt=0;Pt<ne;Pt++){let Et=e.range(.45,.85),Rt=ut[Math.round(Et*(ut.length-1))],Ft=ct(Math.cos(S+$),0,Math.sin(S+$)),dt=ct(-Ft.z,0,Ft.x).multiplyScalar(e.sign()*e.range(.6,1)),$t=e.range(1.8,3.4),Vt=Rt.clone().addScaledVector(Ft,$t*.55).addScaledVector(dt,$t*.6).add(ct(0,$t*e.range(.25,.6),0)),qt=Rt.clone().lerp(Vt,.5).add(ct(0,.15,0)),Ot=ot*Math.pow(Et,1.6);h([Rt,qt,Vt],O(j,.07,Et)*.55,.04,rt,Ot,Ot+.25,5),P?e()<.7&&p(Vt.clone().add(ct(0,.12,0)),e.range(.35,.5),rt,Ot+.25,3,.7):p(Vt,e.range(1.05,1.6),rt,Ot+.25)}if(!P)p(rt,e.range(1.5,2.2),rt,ot),p(ut[Math.round(ut.length*.72)],e.range(1.2,1.8),rt,ot*.6);else for(let Pt of[.4,.62,.84]){let Et=ut[Math.round(Pt*(ut.length-1))];p(Et.clone().add(ct(0,.22,0)),e.range(.38,.6),rt,ot*Math.pow(Pt,1.6),3,.6)}}let m=6;for(let w=0;w<m;w++){let k=.45+w/m*D+e.range(-.18,.18),S=e.range(12.5,16),z=e.range(7,10),P=[ft(.8,k,53-3.5),ft(2.6,k+.05,53+.4),ft(5.4,k+.12,53+z*.45),ft(S*.75,k+.2,53+z*.85),ft(S,k+.26,53+z*.8)],I=P[4],$=h(P,1.3,.14,I,0,.9,9);for(let J=0;J<5;J++){let Q=.32+J*.15,X=$[Math.round(Q*($.length-1))],rt=k+e.range(-1.1,1.1),ot=e.range(3.8,6.5),j=X.clone().add(ct(Math.cos(rt)*ot,e.range(.6,3.4),Math.sin(rt)*ot)),ut=X.clone().lerp(j,.5).add(ct(0,.6,0));h([X,ut,j],O(1.3,.14,Q)*.5,.06,I,.9*Q,1.1,6),p(j,e.range(2.3,3.1),I,1.1),p(ut.clone().add(ct(0,1,0)),e.range(1.8,2.4),I,.9),e()<.6&&p(j.clone().add(ct(0,-1.6,0)),e.range(1.4,1.9),I,1.1,-1,1.25)}p(I.clone().add(ct(0,.6,0)),e.range(2.6,3.3),I,.9),p($[Math.round($.length*.6)].clone().add(ct(0,1.5,0)),e.range(2.4,3),I,.6)}for(let w=0;w<14;w++){let k=e()*D,S=e.range(0,9);p(ft(S,k,53+e.range(8.5,12)-S*.25),e.range(2.6,3.4),ft(S,k,62),.6)}for(let w=0;w<6;w++){let k=e.range(-.8,1.6),S=wt(50.4)+e.range(1.2,4.5);p(ft(S,k,50.4+e.range(3.6,5.5)),e.range(1.5,2.1),ft(S,k,50.4+5),.5)}let d={},v=[];for(let w of le){let k=Math.acos(lt(2/w.out-1,-1,1))/Math.PI*w.w,S=w.th-k,z=w.th+k,P=r.sAtTheta(S),I=r.sAtTheta(z);r.sample(r.sAtTheta(w.th),d);let $=ct(d.x,d.y,d.z),J=ct(d.sx,0,d.sz),Q=[];for(let dt=P-1.5;dt<=I+1.5;dt+=1.7){r.sample(dt,d);let $t=Math.hypot(d.x,d.z)-wt(d.y);if($t<1.5||$t>3.6)continue;let Vt=ct(d.x,d.y-.34+.02,d.z),qt=wt(d.y-2.2)-.15,Ot=Math.atan2(d.z,d.x),Be=ft(qt,Ot,d.y-2.4);a.tube([Vt,Be],[.08,.1],5,()=>[.42,.27,.17,.95],{capEnd:!0,capStart:!0}),Q.push(dt)}let X={blossom:0,green:1,gold:2,snow:3}[w.leaves],rt=jt(w.th)+6.5*.5,ot=wt(rt),j=wt(jt(w.th))+w.out+1.6,ut=w.th+e.range(-.12,.12),ne=[ft(ot*.55,ut,rt-.2),ft(ot+.9,ut,rt+.1),ft(O(ot,j,.55),ut+.06,rt+.75),ft(j,ut+.12,rt+1.35)],Pt=ne[3],Et=X===3?.4:.75,Rt=h(ne,.5,.08,Pt,0,Et,7);for(let dt=0;dt<2;dt++){let $t=O(P,I,.32+dt*.36);if(r.sample($t,d),Math.hypot(d.x,d.z)-wt(d.y)<3)continue;let qt=Rt[Math.round(O(.55,.9,dt)*(Rt.length-1))];for(let Ot of[-1,1]){let Be=ct(d.x+d.sx*.85*Ot,d.y+.72,d.z+d.sz*.85*Ot);a.tube([Be,qt.clone().add(ct(0,-.15,0))],[.026,.026],4,()=>[.62,.5,.36,1],{capEnd:!1})}}let Ft=w.nest?3:2;for(let dt=0;dt<Ft;dt++){let $t=O(P,I,Ft===2?.3+dt*.4:.2+dt*.3);r.sample($t,d);let Vt=Rt[Math.round(O(.55,.95,dt/Math.max(1,Ft-1))*(Rt.length-1))],qt=ct(d.x,Math.max(d.y+3.9,Vt.y+.3),d.z).addScaledVector(ct(d.sx,0,d.sz),e.range(.2,.9)),Ot=Vt.clone().lerp(qt,.5).add(ct(0,.45,0));h([Vt,Ot,qt],.16,.05,Pt,Et*.7,Et,5),X===3?p(qt.clone().add(ct(0,.15,0)),.6,Pt,Et,3,.7):p(qt.clone().add(ct(0,.35,0)),e.range(1.55,1.95),Pt,Et,X)}X!==3&&p(Pt.clone().add(ct(0,.5,0)),e.range(1.6,2.1),Pt,Et,X),w.nest&&v.push({c:$.clone(),out:J})}for(let w of As){let k=wt(0);for(let S of[-.12,.1]){let z=e.range(6.5,9.5),P=w+S,I=[ft(k*.7,P,1.2),ft(k+1.2,P+S*.6,.35),ft(k+z*.35,P+S*1.3+e.range(-.08,.08),.05),ft(k+z*.6,P+S*1.8+e.range(-.1,.1),-.1),ft(k+z*.82,P+S*2.2,-.05),ft(k+z,P+S*2.5,-.5)];h(I,e.range(.6,.8),.18,I[5],0,0,8)}}o.fixWinding();let g=new yt,x=s.id>=1?72:52,f=-4,y=53+1.6,b=.42,M=Math.ceil((y-f)/b)+1,C=.01,F=new kt.Vector3,N=new kt.Vector3,L=new kt.Vector3,Z=u.map(w=>({y:w.y,az:w.az}));for(let w=0;w<M;w++){let k=Math.min(y,f+w*b);for(let S=0;S<=x;S++){let z=S/x*D,P=It(z,k),I=(It(z+C,k)-It(z-C,k))/(2*C),$=(It(z,k+C)-It(z,k-C))/(2*C),J=Math.cos(z),Q=Math.sin(z);N.set(I*J-P*Q,0,I*Q+P*J),L.set($*J,1,$*Q),F.crossVectors(L,N).normalize();let X=1,rt=(z%D+D)%D;for(let Et=rt;;Et+=D){let Rt=jt(Et);if(Rt<-1)break;let Ft=1-_t(.5,1.3,je(Et));if(Ft<=0)continue;let dt=Rt-k;dt>0&&dt<4?X*=1-Ft*(.42*Math.exp(-((dt-.5)**2)/.35)+.18*Math.exp(-((dt-1.6)**2)/1.6)):dt<=0&&dt>-.6&&(X*=1-Ft*.22*Math.exp(-(dt*dt)/.03))}X*=.5+.5*_t(-.6,2.2,k);for(let Et of Z){let Rt=k-Et.y;if(Math.abs(Rt)>1.6)continue;let Ft=Math.atan2(Math.sin(z-Et.az),Math.cos(z-Et.az));X*=1-.3*Math.exp(-(Ft*Ft)/.05-Rt*Rt/.6)*(Rt<0?1.2:.6)}let ot=1-_t(-.5,2.5,k),j=_t(44,52,k),ut=O(1,.72,ot)*O(1,1.02,j),ne=O(1,.66,ot)*O(1,.99,j),Pt=O(1,.62,ot)*O(1,.96,j);g.vert(J*P,k,Q*P,F.x,F.y,F.z,ut,ne,Pt,lt(X,.2,1),S/x*4,k/5.6)}}let G=x+1;for(let w=0;w<M-1;w++)for(let k=0;k<x;k++){let S=w*G+k;g.quad(S,S+1,S+G+1,S+G)}let K=g.vert(0,y+.3,0,0,1,0,.9,.88,.85,.7,0,0);for(let w=0;w<x;w++)g.tri(K,(M-1)*G+w+1,(M-1)*G+w);g.fixWinding();for(let w=n.length-1;w>=0;w--){let k=n[w];for(let S=0;S<r.n;S+=2){let z=k.c.y-r.Y[S];if(z<-6||z>8)continue;let I=Math.hypot(k.c.x-r.X[S],k.c.z-r.Z[S])-1.2;if(I>k.rx||z-k.ry>2.2||z+k.ry<-.6)continue;let $=z>.8?z-2.2:-.6-z,Q=Math.max(I,$)/k.rx;if(Q<.45){k.r=0;break}k.r*=Q,k.rx*=Q,k.ry*=Q,k.rz*=Q}k.r<.3&&n.splice(w,1)}let T=[],E=[],_=[],R=[],A=[],W=[0,0,0,0],V=[];for(let w of n){ke(w.c.y,W);let k=w.type,S=Math.max(5,Math.round(i*lt(w.r*w.r*(k===3?7:5.2),6,30)));for(let z=0;z<S;z++){let P=k;if(P<0){let ut=e();for(P=0;P<3&&ut>W[P];)ut-=W[P],P++;P===3&&(P=W[2]>.05?2:1)}let I=e()*D,$=Math.acos(e.range(-.85,1)),J=Math.pow(e(),.35),Q=Math.sin($)*Math.cos(I)*w.rx*J*.82,X=Math.cos($)*w.ry*J*.82,rt=Math.sin($)*Math.sin(I)*w.rz*J*.82;T.push(w.c.x+Q,w.c.y+X,w.c.z+rt),E.push(w.c.x,w.c.y,w.c.z,w.r);let ot=w.r*(P===3?e.range(.9,1.25):e.range(.85,1.2));_.push(ot,e()*D,P,e());let j=e.range(.86,1.1);P===0?R.push(j*e.range(.97,1.04),j,j*e.range(.95,1.05)):P===1?R.push(j*e.range(.9,1.05),j,j*e.range(.85,1)):P===2?R.push(j*e.range(.98,1.06),j*e.range(.85,1.05),j*e.range(.8,1)):R.push(j,j,j),A.push(w.anchor.x,w.anchor.y,w.anchor.z,w.w)}V.push({c:w.c,rx:w.rx*.78,ry:w.ry*.78,rz:w.rz*.78,anchor:w.anchor,w:w.w,snow:k===3})}let B=new kt.InstancedBufferGeometry,q=new kt.PlaneGeometry(1,1);B.setIndex(q.index),B.setAttribute("position",q.getAttribute("position")),B.setAttribute("iPos",new kt.InstancedBufferAttribute(new Float32Array(T),3)),B.setAttribute("iCluster",new kt.InstancedBufferAttribute(new Float32Array(E),4)),B.setAttribute("iData",new kt.InstancedBufferAttribute(new Float32Array(_),4)),B.setAttribute("iTint",new kt.InstancedBufferAttribute(new Float32Array(R),3)),B.setAttribute("iSway",new kt.InstancedBufferAttribute(new Float32Array(A),4)),B.instanceCount=T.length/3,B.boundingSphere=new kt.Sphere(ct(0,30,0),60);let U=a;for(let w of v){for(let k=0;k<9;k++){let S=[],z=1.55+e.range(-.15,.25),P=w.c.y-.42+k*.07,I=e()*D;for(let $=0;$<=26;$++){let J=I+$/26*D*1.05,Q=e.range(-.08,.08);S.push(ct(w.c.x+Math.cos(J)*(z+Q),P+Math.sin(J*3+k)*.08,w.c.z+Math.sin(J)*(z+Q)))}U.tube(S,S.map(()=>e.range(.06,.12)),4,()=>{let $=e.range(.8,1.1);return[.86*$,.64*$,.42*$,.95]},{capEnd:!1})}for(let k=0;k<3;k++){let S=Math.atan2(w.out.z,w.out.x)+Math.PI*.5+(k-1)*.35,z=ct(w.c.x+Math.cos(S)*1.15,w.c.y-.1,w.c.z+Math.sin(S)*1.15),P=new kt.SphereGeometry(.2,12,8),I=P.getAttribute("position"),$=P.getAttribute("normal"),J=U.count;for(let X=0;X<I.count;X++){let rt=I.getY(X)*1.3,ot=Math.sin(I.getX(X)*80)*Math.sin(I.getZ(X)*70)>.6?.75:1;U.vert(z.x+I.getX(X),z.y+rt,z.z+I.getZ(X),$.getX(X),$.getY(X),$.getZ(X),.62*ot,.82*ot,.92*ot,1,0,0)}let Q=P.index.array;for(let X=0;X<Q.length;X+=3)U.tri(J+Q[X],J+Q[X+1],J+Q[X+2])}}return U.fixWinding(),{trunk:g.build(),branches:o.build(),nest:U.count?U.build():null,leaves:B,caps:c,ellipsoids:V}}import*as ce from"three";var Qt=19.5;function Zt(r,t){let e=Math.hypot(r,t),s=Math.atan2(t,r),i=Wt(s*3.1+11)*.22+Wt(e*.35+s*2)*.18,o=-.0016*e*e,a=-Math.pow(_t(Qt-3.2,Qt,e),2)*1.1;return o+i*_t(5,9,e)+a}var pt=(r,t,e)=>new ce.Vector3(r,t,e);function Fs(r){let t=St(77),e=new yt,s=new yt,i=new yt,o={spheres:[],caps:[]},a=120,c=34,n=2.6;for(let T=0;T<=c;T++){let E=O(n,Qt,Math.pow(T/c,.9));for(let _=0;_<=a;_++){let R=_/a*D,A=Math.cos(R)*E,W=Math.sin(R)*E,V=Zt(A,W),B=.15,q=(Zt(A+B,W)-Zt(A-B,W))/(2*B),U=(Zt(A,W+B)-Zt(A,W-B))/(2*B),w=pt(-q,1,-U).normalize(),k=.93+Wt(R*9+E*.7)*.04,z=1-.45*(1-_t(0,2.6,E-It(R,0)));e.vert(A,V,W,w.x,w.y,w.z,k,k*1,k*1.04,z,A*.08,W*.08)}}let l=a+1;for(let T=0;T<c;T++)for(let E=0;E<a;E++){let _=T*l+E;e.quad(_,_+l,_+l+1,_+1)}e.fixWinding();let h=27,p=30,u=(T,E)=>{let _=Math.pow(1-T,1.25),R=1+.13*Wt(E*4.2+T*3)+.07*Wt(E*11+T*9);return(Qt+.3)*_*R*(T<.04?1+(.04-T)*2:1)};for(let T=0;T<=p;T++){let E=T/p,_=-.75-E*h+(E<.05?E*6:0);for(let R=0;R<=a;R++){let A=R/a*D,W=Math.max(.15,u(E,A)),V=.02,B=(u(Math.min(1,E+V),A)-u(Math.max(0,E-V),A))/(2*V*h),q=pt(Math.cos(A),-B,Math.sin(A)).normalize(),U=.5+.5*Math.sin(_*1.7+Wt(A*3)*2),w=O(.82,.62,E)*O(.9,1.05,U),k=O(.7,.58,E)*O(.9,1.04,U),S=O(.62,.68,E)*O(.92,1.03,U);s.vert(Math.cos(A)*W,_,Math.sin(A)*W,q.x,q.y,q.z,w,k,S,O(.85,.5,E),R/a*8,_*.12)}}for(let T=0;T<p;T++)for(let E=0;E<a;E++){let _=T*l+E;s.quad(_,_+1,_+l+1,_+l)}let m=s.count;for(let T=0;T<=3;T++){let E=T/3*Math.PI*.5;for(let _=0;_<=a;_++){let R=_/a*D,A=Qt,W=Math.cos(R)*A,V=Math.sin(R)*A,B=Zt(W*.999,V*.999),q=A+Math.sin(E)*.45,U=O(B,-.8,1-Math.cos(E)),w=pt(Math.cos(R)*Math.sin(E),Math.cos(E),Math.sin(R)*Math.sin(E)).normalize();s.vert(Math.cos(R)*q,U,Math.sin(R)*q,w.x,w.y,w.z,.95,.96,1,.95,0,0)}}for(let T=0;T<3;T++)for(let E=0;E<a;E++){let _=m+T*l+E;s.quad(_,_+1,_+l+1,_+l)}s.fixWinding();for(let T=0;T<16;T++){let E=t()*D,_=t.range(.2,.7),R=u(_,E)*.96,A=-.75-_*h,W=t.range(6,16),V=[],B=Math.cos(E)*R,q=Math.sin(E)*R;for(let U=0;U<=6;U++){let w=U/6;V.push(pt(B,A-w*W,q)),B+=Math.cos(E)*t.range(-.2,.6)+t.range(-.4,.4),q+=Math.sin(E)*t.range(-.2,.6)+t.range(-.4,.4)}s.tube(V,V.map((U,w)=>O(.42,.05,w/6)),5,()=>[.5,.38,.32,.8])}for(let T=0;T<70;T++){let E=t()*D,_=Qt+.15,R=t.range(.5,2.2),A=pt(Math.cos(E)*_,-.9,Math.sin(E)*_),W=A.clone().add(pt(0,-R,0));s.tube([A,W],[t.range(.08,.16),.01],5,()=>[.78,.9,1.05,1])}let d=(T,E,_=.65)=>{let R=new ce.IcosahedronGeometry(1,2),A=R.getAttribute("position"),W=i.count,V=t()*100;for(let q=0;q<A.count;q++){let U=pt(A.getX(q),A.getY(q),A.getZ(q)),w=1+.18*Wt(U.x*3+V)+.12*Wt(U.z*4+U.y*2+V);U.multiplyScalar(w),U.y*=_;let k=U.clone().normalize(),S=_t(.35,.7,k.y),z=U.multiplyScalar(E).add(T);i.vert(z.x,z.y,z.z,k.x,k.y,k.z,O(.58,.95,S),O(.55,.96,S),O(.62,1.02,S),O(.75,1,k.y*.5+.5),0,0)}let B=R.index?R.index.array:null;if(B)for(let q=0;q<B.length;q+=3)i.tri(W+B[q],W+B[q+1],W+B[q+2]);else for(let q=0;q<A.count;q+=3)i.tri(W+q,W+q+1,W+q+2);o.spheres.push({c:T.clone().add(pt(0,E*_*.1,0)),r:E*.85,sy:_})},v=(T,E)=>{i.tube([T.clone().add(pt(0,-.3,0)),T.clone().add(pt(0,E*.35,0))],[.16*E*.3,.1*E*.3],6,()=>[.4,.3,.24,.8]);for(let _=0;_<4;_++){let R=T.y+E*(.2+_*.2),A=E*(.42-_*.085),W=new ce.ConeGeometry(A,E*.36,9,1,!0),V=W.getAttribute("position"),B=i.count;for(let U=0;U<V.count;U++){let w=pt(V.getX(U),V.getY(U)+R+E*.18,V.getZ(U)).add(pt(T.x,0,T.z)),S=pt(V.getX(U),.55*A,V.getZ(U)).normalize(),z=V.getY(U)>0?.6:.15;i.vert(w.x,w.y,w.z,S.x,S.y,S.z,O(.16,.9,z),O(.32,.92,z),O(.24,.98,z),.9,0,0)}let q=W.index.array;for(let U=0;U<q.length;U+=3)i.tri(B+q[U],B+q[U+1],B+q[U+2])}o.caps.push({a:T.clone(),b:T.clone().add(pt(0,E,0)),r:E*.22})},g=(T,E,_)=>{let R=pt(Math.cos(_)*.32,0,Math.sin(_)*.32),A=pt(-Math.sin(_)*.22,0,Math.cos(_)*.22);i.box(T.clone().add(pt(0,E*.5-.2,0)),R,pt(0,E*.5,0),A,W=>W.y>.5?[.95,.96,1,1]:[.62,.6,.66,.9]),o.caps.push({a:T.clone(),b:T.clone().add(pt(0,E,0)),r:.3})},x=(T,E)=>{let _=Math.cos(T)*E,R=Math.sin(T)*E;return pt(_,Zt(_,R),R)},f=[[2.3,8.5,"rock",1.1],[3,9.6,"pine",2.6],[3.7,8.2,"stone",1.7],[4.6,9.5,"rock",.9],[1.5,9.9,"pine",3.1],[.6,11.5,"rock",1.6],[5.5,11,"pine",3.4],[6,13.5,"rock",1.3],[2.6,14.5,"pine",3.8],[4,15.5,"pine",2.9],[1,16,"stone",2],[5.1,16.4,"rock",2.2],[3.3,12.4,"stone",1.4]];for(let[T,E,_,R]of f){let A=x(T,E);_==="rock"?d(A,R):_==="pine"?v(A,R):g(A,R,T)}for(let T=0;T<16;T++){let E=t()*D,_=t.range(12,Qt-1.5);d(x(E,_),t.range(.35,.9))}let y=new yt;{let T=x(.2,13.2),E=40,_=y.vert(T.x,T.y+.03,T.z,0,1,0,.55,.72,.9,1,.5,.5);for(let R=0;R<=E;R++){let A=R/E*D,W=2.6+.4*Wt(A*3+2);y.vert(T.x+Math.cos(A)*W*1.3,T.y+.03,T.z+Math.sin(A)*W,0,1,0,.66,.82,.98,1,0,0)}for(let R=0;R<E;R++)y.tri(_,_+1+R,_+2+R);y.fixWinding()}i.fixWinding();let b=new yt,M=new yt,C=r,F=It(C,1.2),N=pt(Math.cos(C)*(F+.04),0,Math.sin(C)*(F+.04)),L=pt(Math.cos(C),0,Math.sin(C)),Z=pt(-Math.sin(C),0,Math.cos(C)),G=1.25,K=2.5;{let E=b.vert(N.x+L.x*.02,N.y+K*.45,N.z+L.z*.02,L.x,0,L.z,1,1,1,1,.5,.45),_=[];for(let R=0;R<=24;R++){let A=R/24,W,V;if(A<.25)W=-G,V=A/.25*(K-G);else if(A<.75){let B=Math.PI-(A-.25)/.5*Math.PI;W=Math.cos(B)*G,V=K-G+Math.sin(B)*G}else W=G,V=(1-(A-.75)/.25)*(K-G);_.push([W,V])}for(let[R,A]of _){let W=C+R/F,V=It(W,A)+.03;b.vert(Math.cos(W)*V,A,Math.sin(W)*V,L.x,0,L.z,1,1,1,1,R/(2*G)+.5,A/K)}for(let R=0;R<24;R++)b.tri(E,E+1+R,E+2+R);b.fixWinding();for(let R of[-1,1]){let A=[];for(let W=0;W<=8;W++){let V=W/8,B=Math.PI*(R<0?1-V*.55:V*.55),q=Math.cos(B)*(G+.18),U=V<.01?-.3:K-G+Math.sin(B)*(G+.2)*Math.min(1,V*3),w=C+q/F,k=It(w,Math.max(U,0))+.18;A.push(pt(Math.cos(w)*k,Math.max(U,-.3)+0,Math.sin(w)*k))}M.tube(A,A.map((W,V)=>O(.32,.14,V/8)),7,()=>[.55,.42,.34,.85])}M.fixWinding()}return{top:e.build(),rock:s.build(),props:i.build(),pond:y.build(),gate:b.build(),gateFrame:M.build(),gatePos:N.clone().add(pt(0,K*.45,0)),gateOut:L,gateSide:Z,occ:o}}import*as et from"three";var ze=(r,t,e)=>new et.Vector3(r,t,e);function Ds(r,t,e){let s=new et.Group,i=new et.Mesh(new et.SphereGeometry(500,32,16),null);i.frustumCulled=!1,i.renderOrder=10;let o=new et.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{...r,uNoise:{value:t.cloudNoise}}}),a=new et.Mesh(new et.PlaneGeometry(1800,1800,1,1).rotateX(-Math.PI/2),o);a.position.y=-48,a.frustumCulled=!1,a.renderOrder=5;let c=St(2024),n=e.clouds,l=[],h=[],p=[];for(let f=0;f<n;f++){let y=f/n*D+c.range(-.3,.3),b=c.range(95,240);p.push({x:Math.cos(y)*b,y:c.range(-34,26),z:Math.sin(y)*b,s:c.range(30,72),k:c()})}p.sort((f,y)=>Math.hypot(y.x,y.z)-Math.hypot(f.x,f.z));for(let f of p)l.push(f.x,f.y,f.z),h.push(f.s,f.s*c.range(.45,.62),f.k,c()*D);let u=new et.InstancedBufferGeometry,m=new et.PlaneGeometry(1,1);u.setIndex(m.index),u.setAttribute("position",m.getAttribute("position")),u.setAttribute("iPos",new et.InstancedBufferAttribute(new Float32Array(l),3)),u.setAttribute("iData",new et.InstancedBufferAttribute(new Float32Array(h),4)),u.instanceCount=p.length;let d=new et.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{...r,uMap:{value:t.cloud}},transparent:!0,depthWrite:!1,blending:et.CustomBlending,blendSrc:et.OneFactor,blendDst:et.OneMinusSrcAlphaFactor}),v=new et.Mesh(u,d);v.frustumCulled=!1,v.renderOrder=20;let g=new yt,x=[[1,.72,.82],[.42,.66,.3],[.95,.66,.24],[.92,.94,1],[.98,.78,.86],[.5,.7,.34],[.9,.55,.22]];for(let f=0;f<7;f++){let y=f/7*D+.5+c.range(-.2,.2),b=c.range(115,210),M=ze(Math.cos(y)*b,c.range(-22,18),Math.sin(y)*b),C=c.range(5,11),F=x[f],N=18,L=g.count;for(let G=0;G<=4;G++){let K=G/4,T=C*Math.pow(1-K,1.3)+.2;for(let E=0;E<=N;E++){let _=E/N*D,R=1+.15*Wt(_*3+f*7+K*2);g.vert(M.x+Math.cos(_)*T*R,M.y-K*C*1.6,M.z+Math.sin(_)*T*R,Math.cos(_),-.3,Math.sin(_),.6,.52,.58,.8,0,0)}}for(let G=0;G<4;G++)for(let K=0;K<N;K++){let T=L+G*(N+1)+K;g.quad(T,T+1,T+N+2,T+N+1)}let Z=g.vert(M.x,M.y+.3,M.z,0,1,0,F[0]*.9,F[1]*.9,F[2]*.9,1,0,0);for(let G=0;G<=N;G++){let K=G/N*D,T=1+.15*Wt(K*3+f*7);g.vert(M.x+Math.cos(K)*(C+.2)*T,M.y,M.z+Math.sin(K)*(C+.2)*T,0,1,0,F[0]*.85,F[1]*.85,F[2]*.85,1,0,0)}for(let G=0;G<N;G++)g.tri(Z,Z+1+G,Z+2+G);for(let G=0;G<4;G++){let K=c()*D,T=c.range(0,C*.7),E=ze(M.x+Math.cos(K)*T,M.y,M.z+Math.sin(K)*T),_=c.range(1.6,3.4);g.tube([E,E.clone().add(ze(0,_,0))],[.18,.1],5,()=>[.85,.82,.8,1]);let A=new et.IcosahedronGeometry(_*.55,1).getAttribute("position"),W=g.count;for(let V=0;V<A.count;V++){let B=ze(A.getX(V),A.getY(V),A.getZ(V)).normalize();g.vert(E.x+A.getX(V),E.y+_+A.getY(V)*.8,E.z+A.getZ(V),B.x,B.y,B.z,F[0],F[1],F[2],1,0,0)}for(let V=0;V<A.count;V+=3)g.tri(W+V,W+V+1,W+V+2)}}return g.fixWinding(),s.add(a,v),{group:s,dome:i,farGeo:g.build()}}function Is(r,t){let e=new et.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{uSunDir:t.uSunDir,uSunGlow:t.uSunGlow,uMap:{value:r},uSize:{value:80},uK:{value:1}},transparent:!0,depthWrite:!1,blending:et.AdditiveBlending}),s=new et.Mesh(new et.PlaneGeometry(1,1),e);return s.frustumCulled=!1,s.renderOrder=30,s}import*as ee from"three";var Qe=[{speed:1.25,wind:.22,elev:[40,34],sunStart:Math.PI*.55,burn:.8,drops:[[.42,-.2],[.78,.3]],hints:["drag","hide"]},{speed:1.3,wind:.28,elev:[34,30],sunStart:Math.PI,drops:[[.22,.4],[.5,0],[.58,.45],[.86,-.3]],gust:{every:11,dur:2.2,power:.5,from:6},crystals:[[.8,1,4.6,3.2]],locks:[.45],hints:["drops","bridge","crystal"]},{speed:1.35,wind:.25,elev:[62,56],sunStart:Math.PI,drops:[[.18,.5],[.47,.2],[.53,.5],[.74,-.4],[.92,.35]],crystals:[[.3,1,4.8,3.3],[.72,-1,4.4,3]],locks:[.6],hints:["ledge"]},{speed:1.35,wind:.3,elev:[56,48],sunStart:Math.PI,drops:[[.2,-.3],[.5,.3],[.56,-.2],[.62,.45],[.88,.3]],gust:{every:9,dur:2.4,power:.75,from:5},crystals:[[.25,-1,4.6,3.2],[.78,1,5,3.4]],locks:[.38],hints:["wait"]},{speed:1.4,wind:.3,elev:[30,24],sunStart:Math.PI,drops:[[.16,.4],[.36,-.3],[.55,.5],[.72,.1],[.9,-.4]],gust:{every:7.5,dur:2.8,power:1.15,from:3},crystals:[[.35,1,4.6,3.2],[.68,-1,4.8,3.2]],locks:[.5],hints:["gust"]},{speed:1.4,wind:.38,elev:[24,18],sunStart:Math.PI,drops:[[.2,.3],[.42,.5],[.5,-.2],[.57,.45],[.8,-.3],[.93,.4]],gust:{every:6,dur:3,power:1.55,from:2.5},crystals:[[.22,1,4.6,3],[.55,-1,5,3.3],[.85,1,4.4,3.2]],locks:[.32,.72]},{speed:1.45,wind:.18,elev:[16,11],sunStart:Math.PI,drops:[[.2,.45],[.4,-.2],[.55,.5],[.7,.2],[.9,.45]],gust:{every:10,dur:2.2,power:.6,from:5},crystals:[[.3,-1,4.6,3],[.6,1,4.8,3.2],[.88,-1,4.4,3]],locks:[.45,.8]},{speed:1.4,wind:.15,elev:[10,4],sunStart:Math.PI,drops:[[.15,.4],[.35,-.3],[.52,.5],[.68,0],[.84,.45]],crystals:[[.28,1,4.6,3],[.62,-1,4.8,3]],locks:[.5],hints:["gate"],finale:!0}];function Je(r){return{...te[r],...Qe[r],index:r}}var me=te.length;function Ws(r,t){if(!r||t<r.from)return 0;let e=(t-r.from)%r.every;if(e>r.dur)return 0;let s=Math.sin(e/r.dur*Math.PI);return r.power*s*s}function ts(r,t){if(!r)return 1/0;if(t<r.from)return r.from-t;let e=(t-r.from)%r.every;return e>r.dur?r.every-e:0}function _e(r,t){let e=te[t],s=r.sAtTheta(e.from)+(t===0?1.2:.5),i=r.sAtTheta(e.to)-(e.finale?.4:.5);return[s,i]}var Ct=(r=0,t=0,e=0)=>new ee.Vector3(r,t,e),li={spring:[1,.86,.94],summer:[1,.86,.55],autumn:[1,.72,.4],winter:[.78,.92,1.08]};function Vs(r,t){let e=[],s=new yt,i=new yt,o={};return t.forEach((a,c)=>{let n=Qe[c];if(!n.crystals)return;let[l,h]=_e(r,c);for(let[p,u,m,d]of n.crystals){let v=l+(h-l)*p;r.sample(v,o);let g=Ct(o.x,o.y+.45,o.z),x=Math.atan2(o.z,o.x),f=o.y+d,y=x+u*1.15,b;for(let S=0;S<8;S++){let z=wt(f)+m;b=Ct(Math.cos(y)*z,f,Math.sin(y)*z);let P=Ct().subVectors(g,b),I=-(b.x*P.x+b.z*P.z)/(P.x*P.x+P.z*P.z);if((I>0&&I<1?Math.hypot(b.x+P.x*I,b.z+P.z*I):99)>wt(f)+.5)break;y+=u*.1}let M=O(n.elev[0],n.elev[1],p),C=de(x+Math.PI,M,Ct()),F=Ct().subVectors(g,b).normalize(),N=Ct().addVectors(C,F).normalize(),L=li[a.season],Z=wt(f-.4),G=Ct(Math.cos(y-u*.12)*Z*.75,f-.7,Math.sin(y-u*.12)*Z*.75),K=Ct(Math.cos(y-u*.08)*(Z+1.2),f-.55,Math.sin(y-u*.08)*(Z+1.2)),T=Ct(Math.cos(y-u*.02)*(Z+m*.62),f-.85,Math.sin(y-u*.02)*(Z+m*.62)),E=b.clone().addScaledVector(N,-.36),R=new ee.CatmullRomCurve3([G,K,T,E]).getPoints(14);i.setSway(b.x,b.y,b.z,0),i.tube(R,R.map((S,z)=>O(.2,.05,Math.pow(z/14,.7))),6,(S,z)=>[O(1,.55,z),O(1,.42,z),O(1,.36,z),.9],{sway:(S,z)=>i.setSway(b.x,b.y,b.z,.45*Math.pow(z,1.6))});let A=Math.abs(N.y)>.9?Ct(1,0,0):Ct(0,1,0),W=Ct().crossVectors(N,A).normalize(),V=Ct().crossVectors(N,W).normalize(),B=[];for(let S=0;S<6;S++){let z=S/6*Math.PI*2+.26;B.push(b.clone().addScaledVector(W,Math.cos(z)*.4).addScaledVector(V,Math.sin(z)*.62))}let q=b.clone().addScaledVector(N,.16),U=b.clone().addScaledVector(N,-.2),w=e.length;s.setSway(b.x,b.y,b.z,.45);let k=(S,z,P)=>{let I=Ct().crossVectors(Ct().subVectors(z,S),Ct().subVectors(P,S)).normalize();for(let $ of[S,z,P])s.vert($.x,$.y,$.z,I.x,I.y,I.z,L[0],L[1],L[2],w,0,0);s.tri(s.count-3,s.count-2,s.count-1)};for(let S=0;S<6;S++){let z=B[S],P=B[(S+1)%6];k(q,z,P),k(U,P,z)}e.push({c:b,n:N,target:g,level:c,anchor:b.clone(),w:.45,tint:L,season:a.season})}}),s.fixWinding(),i.fixWinding(),{list:e,gemGeo:s.count?s.build():null,twigGeo:i.count?i.build():null}}function Os(r,t){return new ee.ShaderMaterial({vertexShader:`
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
				// kameraya \xE7ok yak\u0131nsa titre\u015Fimli desenle s\xF6n
				float dc = length(vW - cameraPosition);
				float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
				if (smoothstep(6.0, 2.5, dc) > ign) discard;
				vec3 N = normalize(vN);
				if (!gl_FrontFacing) N = -N;
				vec3 V = normalize(cameraPosition - vW);
				float lit = uLit[int(vIdx + 0.5)];
				float fr = pow(1.0 - abs(dot(N, V)), 2.0);
				vec3 c = vTint * (skyAmbient(N) * 0.7 + 0.08);
				c += hue(dot(N, V) * 1.7 + dot(N, uSunDir) * 0.6) * fr * 0.9;
				float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 60.0);
				c += uSunCol * sp * (0.4 + lit * 2.0);
				c += vTint * vec3(0.9, 0.8, 0.6) * lit * (0.6 + 0.4 * sin(uTime * 6.0 + vIdx));
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,uniforms:{...r,uLit:{value:new Array(Math.max(1,t)).fill(0)}},side:ee.DoubleSide})}import*as Y from"three";var Ns=r=>{let t=new Y.InstancedBufferGeometry,e=new Y.PlaneGeometry(1,1);return t.setIndex(e.index),t.setAttribute("position",e.getAttribute("position")),t.instanceCount=r,t};function Gs(r,t,e){let s=St(808),i=Ns(e),o=new Float32Array(e*4);for(let l=0;l<o.length;l++)o[l]=s();i.setAttribute("iSeed",new Y.InstancedBufferAttribute(o,4));let a={...r,uMap:{value:t},uCenter:{value:new Y.Vector3},uSeason:{value:new Y.Vector4(1,0,0,0)},uFire:{value:0},uCount:{value:1}},c=new Y.ShaderMaterial({vertexShader:`
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
			}`,uniforms:a,transparent:!0,depthWrite:!1,blending:Y.CustomBlending,blendSrc:Y.OneFactor,blendDst:Y.OneMinusSrcAlphaFactor}),n=new Y.Mesh(i,c);return n.frustumCulled=!1,n.renderOrder=22,{mesh:n,u:a}}function Ls(r,t,e){let s=St(55),i=Ns(e),o=new Float32Array(e*4);for(let l=0;l<e;l++){let h=s()*D,p=s.range(2.5,7.5);o.set([Math.cos(h)*p,s.range(-1,5),Math.sin(h)*p,s()],l*4)}i.setAttribute("iOff",new Y.InstancedBufferAttribute(o,4));let a={...r,uMap:{value:t},uCenter:{value:new Y.Vector3},uK:{value:1}},c=new Y.ShaderMaterial({vertexShader:`
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
			}`,uniforms:a,transparent:!0,depthWrite:!1,blending:Y.AdditiveBlending,side:Y.DoubleSide}),n=new Y.Mesh(i,c);return n.frustumCulled=!1,n.renderOrder=24,{mesh:n,u:a}}function Bs(r,t){let e=St(4242),s=new Y.BufferGeometry,i=new Float32Array([0,0,.35,-.08,0,-.2,.08,0,-.2,0,0,.12,-1,0,-.1,0,0,-.18,0,0,.12,1,0,-.1,0,0,-.18]);s.setAttribute("position",new Y.BufferAttribute(i,3));let o=new Y.InstancedBufferGeometry;o.setAttribute("position",s.getAttribute("position"));let a=new Float32Array(t*4);for(let h=0;h<t;h++){let p=h%2;a.set([e.range(0,D)*.15+p*Math.PI,e.range(-1.5,1.5),e.range(-1.5,1.5),e()],h*4)}o.setAttribute("iBird",new Y.InstancedBufferAttribute(a,4)),o.instanceCount=t;let c={...r,uCenterY:{value:30}},n=new Y.ShaderMaterial({vertexShader:`
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
			}`,uniforms:c,side:Y.DoubleSide}),l=new Y.Mesh(o,n);return l.frustumCulled=!1,{mesh:l,u:c}}function Us({G:r,tier:t,shadow:e,aniso:s,msaa:i}){let o=t.id>=1,a={bark:ys(o?1024:512,s),plank:bs(512,256,s),leaves:ws(t.id>=2?1024:512),glow:ks(128),ink:Ms(128),stars:Ts(1024,512),cloud:Es(256),cloudNoise:Ss(256),particles:zs(128),shaft:_s(128,256),rock:Rs(256,s)},c=new Mt.Scene;c.matrixWorldAutoUpdate=!0;let n=new Te,l=Ps(n,t),h=Hs(n),p=(pe+.3)%(Math.PI*2),u=Fs(p),m=Ds(r,a,t),d=(K,T,E=0,_=null)=>{let R=new Mt.Mesh(K,T);return R.matrixAutoUpdate=!1,R.frustumCulled=!!K.boundingSphere,R.renderOrder=E,c.add(R),_&&e.add(K,_),R},v=Ke(),g=Ke({wind:!0}),x=12.5,f={trunk:Xt({map:a.bark,wrap:.38,rim:.5,snow:1,snowY:x}),branch:Xt({map:a.bark,wrap:.38,rim:.5,snow:1,snowY:x,wind:!0,cutout:!0}),walk:Xt({map:a.plank,wrap:.22,rim:.2,snow:.85,snowY:x-1}),rail:Xt({wrap:.3,rim:.35,snow:.9,snowY:x}),glass:gs(16761466,2.4),leaf:ms(a.leaves,{a2c:i}),islandTop:Xt({wrap:.3,rim:.12}),rock:Xt({map:a.rock,wrap:.3,rim:.3}),props:Xt({wrap:.3,rim:.3,cutout:!0}),pond:Xt({wrap:.2,rim:.9}),far:Xt({wrap:.5,rim:.4}),sky:xs(a.stars)};d(l.trunk,f.trunk,0,v),d(l.branches,f.branch,0,g),l.nest&&d(l.nest,f.rail,0,v),d(h.walkway,f.walk,0,v),d(h.rail,f.rail,0,v),d(h.glass,f.glass,0);let y=new Mt.Mesh(l.leaves,f.leaf);y.frustumCulled=!1,y.matrixAutoUpdate=!1,y.renderOrder=2,c.add(y),e.add(l.leaves,vs(a.leaves)),d(u.top,f.islandTop,0),d(u.rock,f.rock,0),d(u.props,f.props,0,v),d(u.pond,f.pond,0),d(u.gateFrame,f.trunk,0,v);let b=ci(r);d(u.gate,b,1),d(m.farGeo,f.far,0);let M=Vs(n,te),C=Os(r,M.list.length);M.twigGeo&&d(M.twigGeo,f.branch,0),M.gemGeo&&d(M.gemGeo,C,0),m.dome.material=f.sky,c.add(m.dome),c.add(m.group);let F=Is(a.glow,r);c.add(F);let N=Gs(r,a.particles,t.particles),L=Ls(r,a.shaft,t.shafts),Z=Bs(r,t.birds);c.add(N.mesh,L.mesh,Z.mesh);let G=se(h.lanterns,a.glow,r,.5,16756832);return c.add(G.mesh),{scene:c,curve:n,tree:l,walk:h,island:u,tex:a,mats:f,gateMat:b,crystals:M,crystalMat:C,glare:F,lanternGlow:G,particles:N,shafts:L,birds:Z,occluders:{caps:l.caps.concat(u.occ.caps),ellipsoids:l.ellipsoids,spheres:u.occ.spheres}}}function ci(r){return new Mt.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{...r,uOpen:{value:0}},side:Mt.DoubleSide,polygonOffset:!0,polygonOffsetFactor:-2})}function se(r,t,e,s,i){let o=new Mt.InstancedBufferGeometry,a=new Mt.PlaneGeometry(1,1);o.setIndex(a.index),o.setAttribute("position",a.getAttribute("position"));let c=new Float32Array(Math.max(1,r.length)*4);r.forEach((p,u)=>c.set([p.x,p.y,p.z,s],u*4));let n=new Mt.InstancedBufferAttribute(c,4);o.setAttribute("iPos",n),o.instanceCount=r.length;let l=new Mt.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{uTime:e.uTime,uFogP:e.uFogP,uMap:{value:t},uColor:{value:new Mt.Color(i)},uK:{value:1}},transparent:!0,depthWrite:!1,blending:Mt.AdditiveBlending}),h=new Mt.Mesh(o,l);return h.frustumCulled=!1,h.renderOrder=25,{mesh:h,attr:n,mat:l}}var Tt={dx:1,dz:0,str:.25,gust:0};function ve(r,t,e,s,i,o){let a=r*.071+e*.053+t*.037,c=Math.sin(i*1.3+a*6.2831)*.6+Math.sin(i*2.7+a*11)*.4,n=Tt.gust*(.65+.35*Math.sin(i*5.1+a*17)),l=(Tt.str*c+n)*s;return o.x=Tt.dx*l,o.y=Math.sin(i*2.1+a*9)*.18*s*(Tt.str+Tt.gust),o.z=Tt.dz*l,o}import*as ae from"three";var he=()=>new ae.Vector3,Re=class{constructor(){this.cam=new ae.PerspectiveCamera(52,1,.3,1400),this.pos=he(),this.look=he(),this.tPos=he(),this.tLook=he(),this.aspect=1,this.mode="follow",this.cine=null,this.shake=0,this.zoom=1,this._tmp=he(),this._tmp2=he(),this.lag=.42}resize(t,e){this.aspect=t/e,this.cam.aspect=this.aspect,this.baseFov=this.aspect<1?O(66,54,lt((this.aspect-.45)/.55,0,1)):50,this.cam.fov=this.baseFov,this.cam.updateProjectionMatrix()}followTarget(t,e,s=this.tPos,i=this.tLook){let o=Math.atan2(t.z,t.x),a=Math.hypot(t.x,t.z),c=this.aspect<1,n=(c?10.2:8.6)*this.zoom,l=(c?4.2:3.3)*this.zoom,h=o-this.lag;return s.set(Math.cos(h)*(a+n),t.y+l,Math.sin(h)*(a+n)),i.copy(t).lerp(e,.35),i.y+=c?.2:.55,s}snap(){this.pos.copy(this.tPos),this.look.copy(this.tLook)}play(t,e){this.cine={keys:t,t:0,dur:t[t.length-1].t,onDone:e};let s=t.map(o=>o.pos),i=t.map(o=>o.look);this.cine.cp=new ae.CatmullRomCurve3(s,!1,"centripetal"),this.cine.cl=new ae.CatmullRomCurve3(i,!1,"centripetal"),this.mode="cine"}skipCine(){this.cine&&(this.cine.t=this.cine.dur)}update(t){let e=this.cam;if(this.mode==="cine"&&this.cine){let s=this.cine;s.t=Math.min(s.dur,s.t+t);let i=s.keys,o=0;for(;o<i.length-2&&s.t>i[o+1].t;)o++;let a=(s.t-i[o].t)/Math.max(1e-4,i[o+1].t-i[o].t),c=(o+Ue(lt(a,0,1)))/(i.length-1);s.cp.getPoint(c,this.pos),s.cl.getPoint(c,this.look);let n=i[o].fov??this.baseFov,l=i[o+1].fov??this.baseFov;e.fov=O(n,l,Ue(lt(a,0,1))),e.updateProjectionMatrix(),s.t>=s.dur&&(this.mode="follow",this.cine=null,s.onDone&&s.onDone())}else this.mode==="follow"&&(this.pos.x=gt(this.pos.x,this.tPos.x,3.2,t),this.pos.y=gt(this.pos.y,this.tPos.y,3.6,t),this.pos.z=gt(this.pos.z,this.tPos.z,3.2,t),this.look.x=gt(this.look.x,this.tLook.x,5,t),this.look.y=gt(this.look.y,this.tLook.y,5,t),this.look.z=gt(this.look.z,this.tLook.z,5,t),Math.abs(e.fov-this.baseFov)>.01&&(e.fov=gt(e.fov,this.baseFov,3,t),e.updateProjectionMatrix()));if(e.position.copy(this.pos),this.shake>.001){let s=this.shake;e.position.x+=(Math.random()-.5)*s,e.position.y+=(Math.random()-.5)*s,this.shake=gt(this.shake,0,6,t)}e.lookAt(this.look),e.updateMatrixWorld()}};import*as Ks from"three";var Bt={x:0,y:0,z:0},hi={min:0,max:1e9},Ce=class{constructor(t){let e=t.occluders;this.caps=e.caps.map(i=>({ax:i.a.x,ay:i.a.y,az:i.a.z,bx:i.b.x,by:i.b.y,bz:i.b.z,r:i.r,anchor:i.anchor||null,wa:i.wa||0,wb:i.wb||0,cx:(i.a.x+i.b.x)/2,cy:(i.a.y+i.b.y)/2,cz:(i.a.z+i.b.z)/2,br:i.a.distanceTo(i.b)/2+i.r+1.8*Math.max(i.wa||0,i.wb||0)})),this.ells=e.ellipsoids.map(i=>({cx:i.c.x,cy:i.c.y,cz:i.c.z,rx:i.rx,ry:i.ry,rz:i.rz,anchor:i.anchor,w:i.w,br:Math.max(i.rx,i.ry,i.rz)+1.8*i.w})),this.sph=e.spheres.map(i=>({cx:i.c.x,cy:i.c.y,cz:i.c.z,rx:i.r,ry:i.r*i.sy,rz:i.r,br:i.r}));let s=t.curve;this.slabs=[];for(let i=0;i<s.n-4;i+=4){let o=i+2,a=s.X[i+4]-s.X[i],c=s.Y[i+4]-s.Y[i],n=s.Z[i+4]-s.Z[i],l=Math.hypot(a,c,n),h=s.SX[o],p=s.SZ[o],u=s.R[o]-wt(s.Y[o])<1.6?1.15:.95,m=(u+1.9/2)/2,d=(1.9/2-u)/2;this.slabs.push({cx:s.X[o]+h*d,cy:s.Y[o]-.34/2,cz:s.Z[o]+p*d,Tx:a/l,Ty:c/l,Tz:n/l,hT:l/2+.02,Sx:h,Sz:p,hS:m,hU:.34/2+.04,br:Math.hypot(l/2,m,.34)})}this.t=0}setTime(t){this.t=t}blocked(t,e,s,i){let o=i.x,a=i.y,c=i.z;if(this._trunk(t,e,s,o,a,c))return!0;for(let n of this.slabs)if(!(n.cy<e+.25)&&He(t,e,s,o,a,c,n.cx,n.cy,n.cz,n.br)&&di(t,e,s,o,a,c,n))return!0;for(let n of this.ells)if(!(n.cy+n.br<e)&&He(t,e,s,o,a,c,n.cx,n.cy,n.cz,n.br)&&(ve(n.anchor.x,n.anchor.y,n.anchor.z,n.w,this.t,Bt),$s(t,e,s,o,a,c,n.cx+Bt.x,n.cy+Bt.y,n.cz+Bt.z,n.rx,n.ry,n.rz)))return!0;for(let n of this.caps){if(Math.max(n.ay,n.by)+n.r+2<e||!He(t,e,s,o,a,c,n.cx,n.cy,n.cz,n.br))continue;let l=n.ax,h=n.ay,p=n.az,u=n.bx,m=n.by,d=n.bz;if(n.anchor&&(n.wa>0||n.wb>0)&&(ve(n.anchor.x,n.anchor.y,n.anchor.z,1,this.t,Bt),l+=Bt.x*n.wa,h+=Bt.y*n.wa,p+=Bt.z*n.wa,u+=Bt.x*n.wb,m+=Bt.y*n.wb,d+=Bt.z*n.wb),ui(t,e,s,o,a,c,l,h,p,u,m,d,n.r))return!0}for(let n of this.sph)if(He(t,e,s,o,a,c,n.cx,n.cy,n.cz,n.br)&&$s(t,e,s,o,a,c,n.cx,n.cy,n.cz,n.rx,n.ry,n.rz))return!0;return!1}_trunk(t,e,s,i,o,a){let c=i*i+a*a;if(c<1e-6)return!1;let n=-(t*i+s*a)/c;if(n<=0)return!1;let l=t+i*n,h=s+a*n,p=e+o*n;if(p>55||Math.hypot(l,h)>wt(Math.max(0,p))+2.2)return!1;let m=9/Math.sqrt(c),d=Math.max(0,n-m),v=n+m,g=36;for(let x=0;x<=g;x++){let f=d+(v-d)*x/g,y=t+i*f,b=e+o*f,M=s+a*f;if(b>54)continue;if(Math.hypot(y,M)<It(Math.atan2(M,y),b)*.985)return!0}return!1}};function He(r,t,e,s,i,o,a,c,n,l){let h=a-r,p=c-t,u=n-e,m=h*s+p*i+u*o;return m<-l?!1:h*h+p*p+u*u-m*m<=l*l}function $s(r,t,e,s,i,o,a,c,n,l,h,p){let u=(r-a)/l,m=(t-c)/h,d=(e-n)/p,v=s/l,g=i/h,x=o/p,f=v*v+g*g+x*x,y=u*v+m*g+d*x,b=u*u+m*m+d*d-1;if(b<0)return!0;let M=y*y-f*b;return M<0?!1:-y-Math.sqrt(M)>0}function ui(r,t,e,s,i,o,a,c,n,l,h,p,u){let m=l-a,d=h-c,v=p-n,g=r-a,x=t-c,f=e-n,y=s*s+i*i+o*o,b=s*m+i*d+o*v,M=m*m+d*d+v*v,C=s*g+i*x+o*f,F=m*g+d*x+v*f,N=y*M-b*b,L,Z;N<1e-8?(L=0,Z=M>1e-8?F/M:0):(L=(b*F-M*C)/N,Z=(y*F-b*C)/N),L<0&&(L=0,Z=M>1e-8?F/M:0),Z<0?(Z=0,L=Math.max(0,-C/y)):Z>1&&(Z=1,L=Math.max(0,(b-C)/y));let G=g+L*s-Z*m,K=x+L*i-Z*d,T=f+L*o-Z*v;return G*G+K*K+T*T<=u*u}function di(r,t,e,s,i,o,a){let c=r-a.cx,n=t-a.cy,l=e-a.cz,h=hi;return h.min=0,h.max=1e9,es(a.Tx*c+a.Ty*n+a.Tz*l,a.Tx*s+a.Ty*i+a.Tz*o,a.hT,h)&&es(a.Sx*c+a.Sz*l,a.Sx*s+a.Sz*o,a.hS,h)&&es(n,i,a.hU,h)&&h.max>0}function es(r,t,e,s){if(Math.abs(t)<1e-6)return Math.abs(r)<=e;let i=(-e-r)/t,o=(e-r)/t;if(i>o){let a=i;i=o,o=a}return i>s.min&&(s.min=i),o<s.max&&(s.max=o),s.min<=s.max}import*as nt from"three";var qs=1.55,fi=`
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
}`,Ae=class{constructor(t,e,{rim:s=10325247,segs:i=40}={}){this.g=new nt.Group,this.k=new nt.Group,this.k.scale.setScalar(qs),this.g.add(this.k),this.body=new nt.Group,this.k.add(this.body),this.u={...t,uWob:{value:.5},uBurn:{value:0},uRim:{value:new nt.Color(s)},uLit:{value:0},uFade:{value:1},uMelt:{value:0},uDiss:{value:0}};let o=new nt.SphereGeometry(.3,i,Math.round(i*.7));this.blob=new nt.Mesh(o,new nt.ShaderMaterial({vertexShader:fi,fragmentShader:pi,uniforms:this.u})),this.blob.position.y=.3,this.body.add(this.blob),this.sil=new nt.Mesh(o,new nt.ShaderMaterial({vertexShader:mi,fragmentShader:vi,uniforms:{uRim:this.u.uRim,uFade:this.u.uFade,uTime:t.uTime},transparent:!0,depthWrite:!1,depthFunc:nt.GreaterDepth})),this.sil.position.y=.3,this.sil.scale.setScalar(1.035),this.sil.renderOrder=40,this.body.add(this.sil);let a=Ye(16777215,2.2),c=Ye(328200,1);this.eyeMat=a,this.eyes=[],this.pupils=[];let n=new nt.SphereGeometry(.075,16,12),l=new nt.SphereGeometry(.036,10,8);for(let p of[-1,1]){let u=new nt.Mesh(n,a);u.scale.set(.95,1.25,.55),u.position.set(p*.105,.38,.25);let m=new nt.Mesh(l,c);m.position.set(0,-.005,.06),u.add(m),this.body.add(u),this.eyes.push(u),this.pupils.push(m)}let h=new nt.SphereGeometry(.075,10,8);this.feet=[-1,1].map(p=>{let u=new nt.Mesh(h,c);return u.scale.set(1,.6,1.35),u.position.set(p*.12,.04,.02),this.k.add(u),u}),this.aura=new nt.Mesh(new nt.PlaneGeometry(1.3,1.3).rotateX(-Math.PI/2),new nt.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:"uniform sampler2D uMap; uniform float uO; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a * uO; gl_FragColor = vec4(0.012, 0.008, 0.03, a); }",uniforms:{uMap:{value:e.ink},uO:{value:.85}},transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-4})),this.aura.position.y=.014,this.aura.renderOrder=3,this.k.add(this.aura),this.ringU={uV:{value:1},uA:{value:0},uTime:t.uTime},this.ring=new nt.Mesh(new nt.PlaneGeometry(1.25,1.25).rotateX(-Math.PI/2),new nt.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:gi,uniforms:this.ringU,transparent:!0,depthWrite:!1,blending:nt.AdditiveBlending})),this.ring.position.y=.03,this.ring.renderOrder=4,this.k.add(this.ring),this.reset()}reset(){this.phase=0,this.yaw=0,this.blinkT=2,this.squash=0,this.sqV=0,this.tapT=0,this.idleT=0,this.hopT=0,this.melt=0,this.diss=0,this.u.uMelt.value=0,this.u.uDiss.value=0,this.u.uFade.value=1,this.u.uBurn.value=0,this.blob.visible=!0,this.sil.visible=!0,this.g.visible=!0,this.g.scale.setScalar(1),this.body.scale.setScalar(1),this.body.position.set(0,0,0);for(let t of this.feet)t.visible=!0;this.eyes.forEach((t,e)=>{t.visible=!0,t.position.set(e?.105:-.105,.38,.25),t.scale.set(.95,1.25,.55)})}kick(t){this.sqV+=t}hop(){this.hopT=.55}update(t,e,s,i){this.g.position.set(s.x,s.y,s.z);let o=s.yaw-this.yaw;for(;o>Math.PI;)o-=Math.PI*2;for(;o<-Math.PI;)o+=Math.PI*2;this.yaw+=o*(1-Math.exp(-10*t)),this.g.rotation.y=this.yaw,this.sqV+=(-this.squash*220-this.sqV*16)*t,this.squash+=this.sqV*t;let a=0,c=1,n=1;if(s.moving){let m=this.phase;this.phase+=t*s.speed*4.4;let d=this.phase%1;a=Math.sin(d*Math.PI)*.12,Math.floor(this.phase)!==Math.floor(m)&&(this.kick(-2.2),i&&i()),c=1+Math.sin(d*Math.PI)*.06;for(let v=0;v<2;v++){let g=(this.phase+v*.5)%1;this.feet[v].position.z=.02+Math.sin(g*Math.PI*2)*.09,this.feet[v].position.y=.04+Math.max(0,Math.sin(g*Math.PI*2))*.05}}else{let m=Math.sin(e*2.2)*.025;c=1+m,n=1-m*.6;for(let d of this.feet)d.position.z=gt(d.position.z,.02,8,t),d.position.y=.04;if(s.hold){this.tapT+=t;let d=Math.max(0,Math.sin(this.tapT*11));this.feet[1].position.y=.04+d*.045,this.feet[1].position.z=.05}else this.tapT=0}if(this.hopT>0){this.hopT=Math.max(0,this.hopT-t);let m=Math.sin((1-this.hopT/.55)*Math.PI);a+=m*.22,c*=1+m*.08,this.hopT===0&&this.kick(-2.4)}c*=1+this.squash,n*=1-this.squash*.55;let l=O(.62,1,s.meter);this.k.scale.setScalar(qs*l);let h=s.burn>0?.018*s.burn:0;this.body.position.set((Math.random()-.5)*h,a,(Math.random()-.5)*h),this.body.scale.set(n,c,n),this.blinkT-=t;let p=1;this.blinkT<.12&&(p=Math.max(.08,Math.abs(this.blinkT-.06)/.06)),this.blinkT<0&&(this.blinkT=2+Math.random()*3);let u=s.burn>.2?1.25:1;this.eyes.forEach(m=>m.scale.set(.95*u,1.25*p*u,.55));for(let m of this.pupils)m.scale.setScalar(s.burn>.2?.6:1);this.u.uBurn.value=gt(this.u.uBurn.value,s.burn,8,t),this.u.uLit.value=gt(this.u.uLit.value,s.lit,8,t),this.u.uWob.value=.4+this.u.uBurn.value*.6,this.ringU.uV.value=gt(this.ringU.uV.value,s.meter,10,t),this.ringU.uA.value=gt(this.ringU.uA.value,s.meter<.995?1:0,4,t)}evaporate(t){this.u.uMelt.value=lt(t*1.6,0,1),this.u.uDiss.value=lt((t-.25)/.75,0,1),this.u.uBurn.value=1,this.sil.visible=!1,this.ringU.uA.value=0,this.aura.material.uniforms.uO.value=.85*(1-t);for(let e of this.feet)e.visible=t<.4;this.eyes.forEach((e,s)=>{let i=Math.max(.001,1-lt((t-.1)/.4,0,1));e.scale.set(.95*i,1.4*i,.55*i),e.position.y=O(.38,.18,lt(t*2,0,1))})}setFade(t){this.u.uFade.value=t,this.eyeMat.uniforms.uFade.value=t,this.aura.material.uniforms.uO.value=.85*t}};import*as Jt from"three";import*as mt from"three";var Ut=320,ge=class{constructor(t,e,{additive:s=!1}={}){this.n=0,this.p=new Float32Array(Ut*3),this.v=new Float32Array(Ut*3),this.life=new Float32Array(Ut*2),this.par=new Float32Array(Ut*4),this.col=new Float32Array(Ut*4),this.cell=new Float32Array(Ut),this.spin=new Float32Array(Ut*2);let i=new mt.InstancedBufferGeometry,o=new mt.PlaneGeometry(1,1);i.setIndex(o.index),i.setAttribute("position",o.getAttribute("position")),this.aPos=new mt.InstancedBufferAttribute(new Float32Array(Ut*4),4).setUsage(mt.DynamicDrawUsage),this.aCol=new mt.InstancedBufferAttribute(new Float32Array(Ut*4),4).setUsage(mt.DynamicDrawUsage),this.aRot=new mt.InstancedBufferAttribute(new Float32Array(Ut*2),2).setUsage(mt.DynamicDrawUsage),i.setAttribute("iPos",this.aPos),i.setAttribute("iCol",this.aCol),i.setAttribute("iRot",this.aRot),i.instanceCount=0,this.geo=i;let a=new mt.ShaderMaterial({vertexShader:`
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
					vec3 c = pow(clamp(t.rgb * vCol.rgb, 0.0, 1.0), vec3(1.0 / 2.2)); gl_FragColor = vec4(c * a, a); }`,uniforms:{uMap:{value:e}},transparent:!0,depthWrite:!1,blending:s?mt.AdditiveBlending:mt.CustomBlending,blendSrc:mt.OneFactor,blendDst:s?mt.OneFactor:mt.OneMinusSrcAlphaFactor});this.mesh=new mt.Mesh(i,a),this.mesh.frustumCulled=!1,this.mesh.renderOrder=35}emit(t,e,s,i,o,a,c,n,l,h,p,u,m,d,v,g,x=0){if(this.n>=Ut)return;let f=this.n++;this.p[f*3]=t,this.p[f*3+1]=e,this.p[f*3+2]=s,this.v[f*3]=i,this.v[f*3+1]=o,this.v[f*3+2]=a,this.life[f*2]=c,this.life[f*2+1]=c,this.par[f*4]=n,this.par[f*4+1]=l,this.par[f*4+2]=h,this.par[f*4+3]=p,this.col[f*4]=u,this.col[f*4+1]=m,this.col[f*4+2]=d,this.col[f*4+3]=v,this.cell[f]=g,this.spin[f*2]=Math.random()*6.28,this.spin[f*2+1]=x}update(t){let e=0,s=this.aPos.array,i=this.aCol.array,o=this.aRot.array;for(let a=0;a<this.n;a++){let c=this.life[a*2]-t;if(c<=0)continue;e!==a&&(this.p.copyWithin(e*3,a*3,a*3+3),this.v.copyWithin(e*3,a*3,a*3+3),this.life[e*2+1]=this.life[a*2+1],this.par.copyWithin(e*4,a*4,a*4+4),this.col.copyWithin(e*4,a*4,a*4+4),this.cell[e]=this.cell[a],this.spin.copyWithin(e*2,a*2,a*2+2)),this.life[e*2]=c;let n=Math.exp(-this.par[e*4+3]*t);this.v[e*3]*=n,this.v[e*3+1]=this.v[e*3+1]*n-this.par[e*4+2]*t,this.v[e*3+2]*=n,this.p[e*3]+=this.v[e*3]*t,this.p[e*3+1]+=this.v[e*3+1]*t,this.p[e*3+2]+=this.v[e*3+2]*t,this.spin[e*2]+=this.spin[e*2+1]*t;let l=1-c/this.life[e*2+1],h=Math.min(1,l*6)*(1-l*l);s[e*4]=this.p[e*3],s[e*4+1]=this.p[e*3+1],s[e*4+2]=this.p[e*3+2],s[e*4+3]=this.par[e*4]+(this.par[e*4+1]-this.par[e*4])*l,i[e*4]=this.col[e*4],i[e*4+1]=this.col[e*4+1],i[e*4+2]=this.col[e*4+2],i[e*4+3]=this.col[e*4+3]*h,o[e*2]=this.cell[e],o[e*2+1]=this.spin[e*2],e++}this.n=e,this.geo.instanceCount=e,e>0&&(this.aPos.clearUpdateRanges(),this.aCol.clearUpdateRanges(),this.aRot.clearUpdateRanges(),this.aPos.addUpdateRange(0,e*4),this.aCol.addUpdateRange(0,e*4),this.aRot.addUpdateRange(0,e*2),this.aPos.needsUpdate=!0,this.aCol.needsUpdate=!0,this.aRot.needsUpdate=!0)}clear(){this.n=0,this.geo.instanceCount=0}};function ie(r,t,e,s,i=18,o=[1.6,1.3,2.6]){for(let a=0;a<i;a++){let c=Math.random()*Math.PI*2,n=(Math.random()-.2)*1.2,l=1.2+Math.random()*2.2;r.emit(t,e,s,Math.cos(c)*Math.cos(n)*l,Math.sin(n)*l+1.2,Math.sin(c)*Math.cos(n)*l,.7+Math.random()*.5,.28,.05,1.6,2.2,o[0],o[1],o[2],1,3)}}function xe(r,t,e,s,i=1){r.emit(t+(Math.random()-.5)*.3,e,s+(Math.random()-.5)*.3,(Math.random()-.5)*.3,.8+Math.random()*.6,(Math.random()-.5)*.3,.9,.18*i,.6*i,-.4,1.4,1.9,.8,.3,.55,3)}var ss=8;function xi(){let r=new Jt.SphereGeometry(.16,20,14),t=r.getAttribute("position");for(let e=0;e<t.count;e++){let s=t.getX(e),i=t.getY(e),o=t.getZ(e);if(i>0){let a=i/.16;i*=1+a*.9,s*=1-a*.75,o*=1-a*.75}t.setXYZ(e,s,i,o)}return r.computeVertexNormals(),r}var Pe=class{constructor(t,e,s){this.G=t,this.geo=xi(),this.mat=new Jt.ShaderMaterial({vertexShader:`
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
				}`,uniforms:{...t}}),this.meshes=[];for(let o=0;o<ss;o++){let a=new Jt.Mesh(this.geo,this.mat);a.visible=!1,a.renderOrder=6,s.add(a),this.meshes.push(a)}let i=Array.from({length:ss},()=>new Jt.Vector3(0,-999,0));this.glow=se(i,e.glow,t,.55,9403647),this.glow.mat.uniforms.uK.value=.7,s.add(this.glow.mesh),this.list=[],this._p={},this._L=new Jt.Vector3}setup(t,e,s,i){this.list=i.map(([o,a],c)=>{let n=e+(s-e)*o,l=t.sample(n,{}),h=a*.62;return{i:c,s:n,x:l.x+l.sx*h,y:l.y+.55,z:l.z+l.sz*h,melt:0,state:"idle",t:0,lit:0}});for(let o=0;o<ss;o++)this.meshes[o].visible=o<this.list.length;this.glow.mesh.geometry.instanceCount=this.list.length}get total(){return this.list.length}get got(){return this.list.filter(t=>t.state==="got"||t.state==="fly").length}get lost(){return this.list.filter(t=>t.state==="lost").length}update(t,e,s,i,o,a,c,n,l,h){let p=this.glow.attr.array;for(let u of this.list){let m=this.meshes[u.i];if(u.t+=t,u.state==="idle"){if(h&&u.s-s<9&&u.s-s>-1){let g=!o.blocked(u.x,u.y+.1,u.z,a)||this.beams&&this.beams.litAt(u.x,u.y,u.z);u.lit=gt(u.lit,g?1:0,12,t),g?(u.melt=Math.min(1,u.melt+t*.3),Math.random()<t*14&&xe(c,u.x,u.y+.15,u.z,.6),u.melt>=1&&(u.state="lost",ie(c,u.x,u.y,u.z,12,[2.4,.9,.3]),l(u))):u.melt=Math.max(0,u.melt-t*.12)}h&&Math.abs(u.s-s)<.55&&(u.state="fly",u.t=0);let d=1-u.melt*.65,v=u.lit*.02;m.position.set(u.x+(Math.random()-.5)*v,u.y+Math.sin(e*2.2+u.i)*.07,u.z+(Math.random()-.5)*v),m.rotation.y=e*.8+u.i,m.scale.setScalar(d),p[u.i*4]=m.position.x,p[u.i*4+1]=m.position.y,p[u.i*4+2]=m.position.z,p[u.i*4+3]=.55*d*(1-u.lit*.5)}else if(u.state==="fly"){let d=Math.min(1,u.t/.28);m.position.set(u.x+(i.x-u.x)*d,u.y+(i.y+.5-u.y)*d+Math.sin(d*Math.PI)*.4,u.z+(i.z-u.z)*d),m.scale.setScalar(1-d*.8),p[u.i*4]=m.position.x,p[u.i*4+1]=m.position.y,p[u.i*4+2]=m.position.z,p[u.i*4+3]=.55*(1-d),d>=1&&(u.state="got",m.visible=!1,p[u.i*4+3]=0,ie(c,i.x,i.y+.6,i.z,20),n(u))}else m.visible=!1,p[u.i*4+3]=0}this.glow.attr.needsUpdate=!0}hideAll(){for(let t of this.meshes)t.visible=!1;this.glow.mesh.geometry.instanceCount=0,this.list=[]}};import*as zt from"three";var Fe=6,De={x:0,y:0,z:0},Ie=class{constructor(t,e,s,i){this.list=i.crystals.list.map(l=>({...l,lit:0,on:!1,hx:0,hy:0,hz:0,cx:0,cy:0,cz:0,hitT:0})),this.gemMat=i.crystalMat;let o=new zt.InstancedBufferGeometry,a=new zt.PlaneGeometry(1,1);o.setIndex(a.index),o.setAttribute("position",a.getAttribute("position")),this.aA=new zt.InstancedBufferAttribute(new Float32Array(Fe*4),4).setUsage(zt.DynamicDrawUsage),this.aB=new zt.InstancedBufferAttribute(new Float32Array(Fe*4),4).setUsage(zt.DynamicDrawUsage),o.setAttribute("iA",this.aA),o.setAttribute("iB",this.aB),o.instanceCount=0,this.geo=o;let c=new zt.ShaderMaterial({vertexShader:`
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
				}`,uniforms:{...t},transparent:!0,depthWrite:!1,blending:zt.AdditiveBlending,side:zt.DoubleSide});this.mesh=new zt.Mesh(o,c),this.mesh.frustumCulled=!1,this.mesh.renderOrder=26,s.add(this.mesh);let n=Array.from({length:Fe},()=>new zt.Vector3(0,-999,0));this.spots=se(n,e.glow,t,1.2,16773312),this.glints=se(n,e.glow,t,1,16774364),this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0,s.add(this.spots.mesh,this.glints.mesh),this.active=[],this._cand=[]}update(t,e,s,i,o,a){let c=this.aA.array,n=this.aB.array,l=this.spots.attr.array,h=this.glints.attr.array,p=this.gemMat.uniforms.uLit.value;this.active.length=0;let u=0,m=0,d=i.x,v=i.y,g=i.z;for(let x=0;x<this.list.length;x++){let f=this.list[x],y=Math.abs(f.c.y-s)<15,b=!1;if(y){ve(f.anchor.x,f.anchor.y,f.anchor.z,f.w,e,De),f.cx=f.c.x+De.x,f.cy=f.c.y+De.y,f.cz=f.c.z+De.z;let M=f.n.x*d+f.n.y*v+f.n.z*g;if(M>.05&&!o.blocked(f.cx+d*.5,f.cy+v*.5,f.cz+g*.5,i)){let C=-d+2*M*f.n.x,F=-v+2*M*f.n.y,N=-g+2*M*f.n.z,L=this._cast(f.cx,f.cy,f.cz,C,F,N,o);f.hx=f.cx+C*L,f.hy=f.cy+F*L,f.hz=f.cz+N*L,f.hitT=L,b=!0}}if(f.lit=gt(f.lit,b?1:0,14,t),p[x]=f.lit,f.on=b,f.lit>.02&&u<Fe&&(c[u*4]=f.cx,c[u*4+1]=f.cy,c[u*4+2]=f.cz,c[u*4+3]=.55,n[u*4]=f.hx,n[u*4+1]=f.hy,n[u*4+2]=f.hz,n[u*4+3]=f.lit,l[u*4]=f.hx,l[u*4+1]=f.hy+.05,l[u*4+2]=f.hz,l[u*4+3]=f.hitT<39?1*f.lit:0,h[u*4]=f.cx,h[u*4+1]=f.cy,h[u*4+2]=f.cz,h[u*4+3]=.9*f.lit,u++),b){this.active.push(f);let M=is(a.x,a.y+.45,a.z,f.cx,f.cy,f.cz,f.hx,f.hy,f.hz);M<.55&&(m=Math.max(m,1-Math.max(0,M-.35)/.2))}}return this.geo.instanceCount=u,this.spots.mesh.geometry.instanceCount=u,this.glints.mesh.geometry.instanceCount=u,this.aA.needsUpdate=!0,this.aB.needsUpdate=!0,this.spots.attr.needsUpdate=!0,this.glints.attr.needsUpdate=!0,m}testPoint(t,e,s,i,o,a=.55){for(let c of this.list){if(Math.abs(c.c.y-s)>15)continue;let n=c.n.x*t.x+c.n.y*t.y+c.n.z*t.z;if(n<=.05)continue;let l=c.cx||c.c.x,h=c.cy||c.c.y,p=c.cz||c.c.z;if(o.blocked(l+t.x*.5,h+t.y*.5,p+t.z*.5,t))continue;let u=-t.x+2*n*c.n.x,m=-t.y+2*n*c.n.y,d=-t.z+2*n*c.n.z,v=this._cast(l,h,p,u,m,d,o);if(is(e,s,i,l,h,p,l+u*v,h+m*v,p+d*v)<a)return!0}return!1}litAt(t,e,s,i=.35){for(let o of this.active)if(is(t,e,s,o.cx,o.cy,o.cz,o.hx,o.hy,o.hz)<i)return!0;return!1}_cast(t,e,s,i,o,a,c){let n=this._cand;n.length=0;for(let h of c.slabs){let p=h.cx-t,u=h.cy-e,m=h.cz-s,d=p*i+u*o+m*a;if(d<-h.br||d>41)continue;p*p+u*u+m*m-d*d<=h.br*h.br&&n.push(h)}let l=.16;for(let h=.35;h<40;h+=l){let p=t+i*h,u=e+o*h,m=s+a*h,d=Math.hypot(p,m);if(u<56&&d<7&&d<It(Math.atan2(m,p),u)||d<Qt&&u<Zt(p,m)+.02)return h;for(let v of n){let g=p-v.cx,x=u-v.cy,f=m-v.cz;if(!(Math.abs(g*v.Tx+x*v.Ty+f*v.Tz)>v.hT)&&!(Math.abs(g*v.Sx+f*v.Sz)>v.hS)&&!(Math.abs(x)>v.hU+.02))return h}}return 40}hide(){this.geo.instanceCount=0,this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0;for(let t of this.list)t.lit=0}};function is(r,t,e,s,i,o,a,c,n){let l=a-s,h=c-i,p=n-o,u=l*l+h*h+p*p,m=u>0?((r-s)*l+(t-i)*h+(e-o)*p)/u:0;m=m<0?0:m>1?1:m;let d=s+l*m-r,v=i+h*m-t,g=o+p*m-e;return Math.sqrt(d*d+v*v+g*g)}import*as it from"three";var Xs=3,os=7,as=1.55,yi=[[0,1],[0,1.7],[.45,.8],[-.45,.8]];function bi(){let e=[],s=[],i=[],o=[];for(let c=0;c<=8;c++){let n=c/8,l=Math.sin(Math.min(1,n*1.15)*Math.PI)*.36+.06*(1-n);for(let h=0;h<=6;h++){let p=h/6-.5,u=p*l*2,m=-Math.pow(Math.abs(p)*2,2)*.1-Math.pow(n,2)*.22;e.push(u,n*1.05,m);let d=new it.Vector3(-u*.6,.15-n*.2,1).normalize();s.push(d.x,d.y,d.z),i.push(.75+n*.25,n,1,1)}}for(let c=0;c<8;c++)for(let n=0;n<6;n++){let l=c*7+n;o.push(l,l+1,l+6+2,l,l+6+2,l+6+1)}let a=new it.BufferGeometry;return a.setAttribute("position",new it.Float32BufferAttribute(e,3)),a.setAttribute("normal",new it.Float32BufferAttribute(s,3)),a.setAttribute("color",new it.Float32BufferAttribute(i,4)),a.setIndex(o),a}function wi(r,t,e){return new it.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{...r,uA:{value:new it.Color(t)},uB:{value:new it.Color(e)},uCharge:{value:0},uOpen:{value:0}},side:it.DoubleSide})}function ki(r){return new it.ShaderMaterial({vertexShader:`
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
				// buz: derin mavi \xE7ekirdek, a\xE7\u0131k turkuaz kenar, keskin parlama
				vec3 c = vec3(0.12, 0.26, 0.46) * (skyAmbient(N) * 1.1 + 0.08) + vec3(0.5, 0.78, 1.0) * fr * 0.8;
				float sp = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 80.0);
				c += uSunCol * sp * 0.7;
				// erirken i\xE7inden alt\u0131n \u0131\u015F\u0131k s\u0131zar
				c += vec3(0.9, 0.6, 0.3) * uCharge * (0.16 + 0.08 * sin(uTime * 8.0)) * (1.0 - fr * 0.6);
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,uniforms:{...r,uCharge:{value:0}}})}function Mi(){let r=[],t=(i,o,a,c,n,l)=>{let h=[],p=new it.Vector3(Math.sin(n)*a*.3,a,0).applyAxisAngle(new it.Vector3(0,1,0),l);for(let m=0;m<6;m++){let d=m/6*Math.PI*2;h.push([Math.cos(d)*c,Math.sin(d)*c*.8])}let u=a*.72;for(let m=0;m<6;m++){let[d,v]=h[m],[g,x]=h[(m+1)%6],f=[i+d,0,o+v],y=[i+g,0,o+x],b=[i+d*.9+p.x*.7,u,o+v*.9+p.z*.7],M=[i+g*.9+p.x*.7,u,o+x*.9+p.z*.7],C=[i+p.x,a,o+p.z];r.push(...f,...y,...M,...f,...M,...b,...b,...M,...C)}},e=[.31,.77,.13,.55,.92,.4,.66];for(let i=0;i<7;i++){let o=-.95+i/6*1.9,a=.9+e[i]*1.1+(i===3?.4:0);t(o,(e[(i+2)%7]-.5)*.35,a,.17+e[(i+4)%7]*.1,(e[i]-.5)*.7,e[(i+1)%7]*6)}let s=new it.BufferGeometry;return s.setAttribute("position",new it.Float32BufferAttribute(r,3)),s.computeVertexNormals(),s}var We=class{constructor(t,e,s){this.G=t,this.petalGeo=bi(),this.items=[];let i={spring:[14183064,16766694],summer:[14715418,16769146],autumn:[11024924,16752704]},o=()=>{let c={};for(let[n,[l,h]]of Object.entries(i))c[n]=wi(t,l,h);return c};this.iceGeo=Mi();for(let c=0;c<Xs;c++){let n=o(),l=new it.InstancedMesh(this.petalGeo,n.spring,os);l.frustumCulled=!1,l.visible=!1;let h=new it.Mesh(this.iceGeo,ki(t));h.visible=!1,s.add(l,h),this.items.push({petals:l,ice:h,mats:n,s:0,charge:0,open:0,state:"off",x:0,y:0,z:0,tx:0,tz:0,sx:0,sz:0,kind:"bud"})}let a=Array.from({length:Xs},()=>new it.Vector3(0,-999,0));this.glow=se(a,e.glow,t,1,16769696),this.glow.mesh.geometry.instanceCount=0,s.add(this.glow.mesh),this._m=new it.Matrix4,this._q=new it.Quaternion,this._e=new it.Euler,this._v=new it.Vector3,this._s=new it.Vector3,this.list=[]}setup(t,e,s,i=[],o="spring"){this.list=[],this.items.forEach((a,c)=>{let n=i[c];if(a.petals.visible=!1,a.ice.visible=!1,!n){a.state="off";return}let l=e+(s-e)*n,h=t.sample(l,{});Object.assign(a,{s:l,x:h.x,y:h.y,z:h.z,tx:h.tx,tz:h.tz,sx:h.sx,sz:h.sz,charge:0,open:0,state:"closed"}),a.kind=o==="winter"?"ice":"bud",a.kind==="ice"?(a.ice.visible=!0,a.ice.position.set(h.x,h.y-.02,h.z),a.ice.rotation.set(0,Math.atan2(h.tx,h.tz),0),a.ice.scale.setScalar(1)):(a.petals.visible=!0,a.petals.material=a.mats[o]||a.mats.spring),this.list.push(a),this._pose(a,0)}),this.glow.mesh.geometry.instanceCount=this.list.length}_pose(t,e){if(t.kind==="ice"){let o=1-$e(e);t.ice.scale.set(Math.max(.01,o)*1.05,Math.max(.01,o)*1,Math.max(.01,o)*1),t.ice.visible=o>.02;return}let s=this._v.set(t.x,t.y+.05,t.z),i=Math.atan2(t.tx,t.tz);for(let o=0;o<os;o++){let a=o/os*Math.PI*2,c=.18+$e(e)*1.45;this._e.set(-c,i+a,0,"YXZ"),this._q.setFromEuler(this._e);let n=1.55*(1-e*.35);this._s.set(n,n*(1.05-e*.2),n);let l=.12+e*.55,h=s.x+Math.sin(i+a)*l,p=s.z+Math.cos(i+a)*l;this._m.compose(this._v.set(h,s.y-e*.05,p),this._q,this._s),t.petals.setMatrixAt(o,this._m),this._v.copy(s)}t.petals.instanceMatrix.needsUpdate=!0}limit(t){let e=1/0;for(let s of this.list)s.state!=="open"&&s.s>t-.2&&(e=Math.min(e,s.s-as));return e}update(t,e,s,i,o,a,c){let n=this.glow.attr.array,l=0;for(let h of this.list){let p=h.s-e<as+.5&&h.s-e>-.5;if(h.state==="closed"&&!p)h.charge=Math.max(0,h.charge-t*.1);else if(h.state==="closed"){let m=0,d=yi;for(let[v,g]of d){let x=h.x+h.sx*v,f=h.z+h.sz*v;(!i.blocked(x,h.y+g,f,s)||o&&o.litAt(x,h.y+g,f,.5))&&m++}m/=d.length,h.charge=lt(h.charge+(m>0?m*.6:-.1)*t,0,1),m>0&&Math.random()<t*10&&ie(a,h.x+(Math.random()-.5),h.y+1+Math.random(),h.z+(Math.random()-.5),1,[2.2,1.7,.8]),h.charge>=1&&(h.state="opening",c(h),ie(a,h.x,h.y+1.2,h.z,26,[2.4,2,1]))}else h.state==="opening"&&(h.open=Math.min(1,h.open+t/.9),this._pose(h,h.open),h.open>=1&&(h.state="open"));let u=h.kind==="ice"?h.ice.material:h.petals.material;u.uniforms.uCharge.value=h.charge,u.uniforms.uOpen&&(u.uniforms.uOpen.value=h.open),n[l*4]=h.x,n[l*4+1]=h.y+1.1,n[l*4+2]=h.z,n[l*4+3]=h.state==="open"?0:.25+h.charge*1.3,l++}this.glow.attr.needsUpdate=!0}pending(t){for(let e of this.list)if(e.state==="closed"&&e.s>t-.2&&e.s-t<as+.3)return e;return null}hide(){for(let t of this.items)t.petals.visible=!1,t.ice.visible=!1,t.state="off";this.list=[],this.glow.mesh.geometry.instanceCount=0}};var ht=(r=0,t=0,e=0)=>new Ks.Vector3(r,t,e),Ti=3.6,Ei=.42,Si=.2,Ve=class{constructor(t,e,s){this.app=t,this.ui=e,this.sfx=s;let i=t.world;this.world=i,this.curve=i.curve,this.G=t.G,this.store=t.store,this.tester=new Ce(i),this.zifir=new Ae(t.G,i.tex,{segs:t.tier.id>=1?40:28}),this.zifir.g.visible=!1,i.scene.add(this.zifir.g),this.drops=new Pe(t.G,i.tex,i.scene),this.beams=new Ie(t.G,i.tex,i.scene,i),this.drops.beams=this.beams,this.locks=new We(t.G,i.tex,i.scene),this.fx=new ge(t.G,i.tex.particles,{additive:!0}),this.petals=new ge(t.G,i.tex.particles,{additive:!1}),i.scene.add(this.fx.mesh,this.petals.mesh),this.prog=Object.assign({unlocked:0,stars:[],dust:0,fails:{},seen:{},intro:!1},this.store.get("progress")||{}),this.settings=Object.assign({sound:!0,haptics:!0,quality:"auto",power:"auto"},this.store.get("settings")||{}),this.sfx.setOn(this.settings.sound),this.state="title",this.stateT=0,this.level=null,this.li=0,this.s=0,this.speed=0,this.hold=!1,this.keyHold=!1,this.meter=1,this.expo=0,this.minMeter=1,this.burnTotal=0,this.sunAz=0,this.sunTarget=0,this.elev=34,this.levelT=0,this.dragged=!1,this.sunDir=ht(0,1,0),this.zp=ht(),this._ahead=ht(),this._smp={},this._smp2={},this._hintUntil=0,this._hintQueue=[],this._pts=[ht(),ht(),ht(),ht(),ht(),ht()],this.rays=t.tier.id>=1?6:4,this.envFrom="spring",this.envTo="spring",this.envT=1,this.envDur=1,this._titleSeason=0,this._onStep=()=>this.sfx.step(),this._bindInput(),this.ui.setToggles(this.settings),this.ui.setPlayLabel(this.prog.unlocked>0||this.prog.intro?"Devam Et":"Ba\u015Fla"),this.goTitle(!0)}_bindInput(){let t=this.app.container,e=null,s=0;t.addEventListener("pointerdown",o=>{this.sfx.unlock(),!o.target.closest("button")&&e===null&&(e=o.pointerId,s=o.clientX,this.state==="intro"&&this.ui.skip(!0))}),t.addEventListener("pointermove",o=>{if(o.pointerId!==e)return;let a=o.clientX-s;s=o.clientX,this.drag(a/Math.max(320,t.clientWidth))});let i=o=>{o.pointerId===e&&(e=null)};t.addEventListener("pointerup",i),t.addEventListener("pointercancel",i),this._onKey=o=>{o.repeat&&o.key!=="ArrowLeft"&&o.key!=="ArrowRight"||(o.key==="ArrowLeft"?this.drag(-.06):o.key==="ArrowRight"?this.drag(.06):o.key===" "?(this.keyHold=o.type==="keydown",o.preventDefault()):o.key==="Escape"&&o.type==="keydown"&&(this.state==="play"||this.state==="ready"?this.pause():this.state==="paused"&&this.resume()))},window.addEventListener("keydown",this._onKey),window.addEventListener("keyup",this._onKey)}drag(t){this.state!=="play"&&this.state!=="ready"||(this.sunTarget-=t*D*.85,!this.dragged&&Math.abs(t)>.004&&(this.dragged=!0,this.state==="ready"&&this._begin()))}wait(t){this.hold=t}_set(t){this.state=t,this.stateT=0,this.app.wake()}envTo2(t,e=2){this.envT<1?this.envFrom=this.envT>.5?this.envTo:this.envFrom:this.envFrom=this.envTo,this.envTo=t,this.envT=0,this.envDur=e}goTitle(t=!1){this._set("title"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.show("title"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.app.gov.menu=!0,t?(this.envFrom=this.envTo="spring",this.envT=1):this.envTo2("spring",1.5),this._orbit={a:.6,r:84,y:16,ly:25}}goLevels(){this._set("levels"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.renderLevels(te,this.prog),this.ui.show("levels"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.app.gov.menu=!0,this._orbit||(this._orbit={a:.6,r:84,y:16,ly:25})}action(t){if(this.sfx.unlock(),this.sfx.ui(),t==="play")this.prog.intro?this.startLevel(Math.min(this.prog.unlocked,me-1)):this.startIntro();else if(t==="levels")this.goLevels();else if(t==="title")this.goTitle();else if(t==="exit")this.app.exit();else if(t.startsWith("lv:")){let e=Number(t.slice(3));e<=this.prog.unlocked?this.startLevel(e):this.ui.toast("\xD6nceki b\xF6l\xFCm\xFC tamamla")}else t==="pause"?this.pause():t==="resume"?this.resume():t==="retry"?this.startLevel(this.li,{retry:!0}):t==="next"?this.startLevel(Math.min(this.li+1,me-1),{cont:!0}):t==="skip"?this.skipIntro():t==="settings"&&(this._settingsFromTitle=!0,this.ui.$(".uk-card h4").textContent="Ayarlar",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Tamam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="none",this.ui.$("[data-s=pause] [data-a=levels]").style.display="none",this.ui.show("pause"))}toggle(t){let e=this.settings;if(t==="sound")e.sound=!e.sound,this.sfx.setOn(e.sound);else if(t==="haptics")e.haptics=!e.haptics;else if(t==="quality"){let s=["auto",0,1,2];e.quality=s[(s.indexOf(e.quality)+1)%s.length],this.ui.toast("Grafik ayar\u0131 bir sonraki a\xE7\u0131l\u0131\u015Fta uygulan\u0131r")}else if(t==="power"){let s=["auto","saver","performance"];e.power=s[(s.indexOf(e.power)+1)%s.length],this.app.gov.power=e.power,this.app.resize()}this.store.set("settings",e),this.ui.setToggles(e)}pause(){this.state!=="play"&&this.state!=="ready"||(this._paused=this.state,this._set("paused"),this._settingsFromTitle=!1,this.ui.$(".uk-card h4").textContent="Duraklat\u0131ld\u0131",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Devam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="",this.ui.$("[data-s=pause] [data-a=levels]").style.display="",this.ui.show("pause"),this.sfx.tick(0,0,0,!1))}resume(){if(this._settingsFromTitle){this._settingsFromTitle=!1,this.ui.show("title");return}this.state==="paused"&&(this.ui.show(null),this._set(this._paused||"play"))}haptic(t){if(this.settings.haptics&&!(this.app.hooks.haptic&&this.app.hooks.haptic(t)===!0))try{navigator.vibrate&&navigator.vibrate(t)}catch{}}startIntro(){this._set("intro"),this.ui.show(null),this.ui.hudOn(!1),this.app.gov.menu=!1,this.envFrom=this.envTo="spring",this.envT=1;let t=Je(0);this._setupLevelData(0);let e=this.curve.sample(this.s,this._smp),s=this.curve.sample(this.s+3,this._smp2),i=this.app.rig;i.followTarget(ht(e.x,e.y,e.z),ht(s.x,s.y,s.z));let o=i.tPos.clone(),a=i.tLook.clone(),c=Math.atan2(e.z,e.x);i.play([{t:0,pos:ht(Math.cos(c+1.3)*150,-6,Math.sin(c+1.3)*150),look:ht(0,22,0),fov:44},{t:4.5,pos:ht(Math.cos(c+.9)*62,14,Math.sin(c+.9)*62),look:ht(0,30,0),fov:46},{t:8.5,pos:ht(Math.cos(c+.4)*30,59,Math.sin(c+.4)*30),look:ht(0,55,0),fov:50},{t:11.5,pos:o,look:a}],()=>this._enterLevel(0,{fromIntro:!0})),this.sunAz=this.sunTarget=c+Math.PI*.6,this.zifir.g.visible=!0,this._lore=[[.6,"G\xF6k ile yeri bir a\u011Fa\xE7 ba\u011Flar: Ulu Kay\u0131n."],[4.4,"T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 k\xF6klerine d\xFC\u015Ft\xFC."],[8,"G\xFCne\u015F a\u011Fac\u0131n \xE7evresinde d\xF6ner; g\xF6lgesi Zifir\u2019in yoludur."]],this._loreI=0,this.ui.skip(!0)}skipIntro(){this.state==="intro"&&(this.ui.lore(null),this.ui.skip(!1),this.app.rig.skipCine())}_setupLevelData(t){this.li=t,this.level=Je(t);let e=this.level;[this.s0,this.s1]=_e(this.curve,t),this.s=this.s0,this.drops.setup(this.curve,this.s0,this.s1,e.drops),this.locks.setup(this.curve,this.s0,this.s1,e.locks,e.season),this.ui.setLevel(e),this.ui.setDrops(0,e.drops.length),this.sfx.resetDrops(),this.sfx.season=e.season,this.meter=1,this.minMeter=1,this.burnTotal=0,this.expo=0,this.speed=0,this.levelT=0,this.dragged=!1,this.got=0,this.lostN=0;let s=this.prog.fails[t]||0;this.mercy=Math.max(.55,1-.12*s),this.burnK=(e.burn||1)*this.mercy,this.elev=e.elev[0],Tt.str=e.wind,Tt.gust=0,this._gate=0,this._lockT=0,this._arcOn=!1,this.ui.lockArc(null)}startLevel(t,{retry:e=!1,cont:s=!1}={}){let i=s&&this.level&&this.li===t-1,o=this.s;this._setupLevelData(t),this.zifir.reset(),this.zifir.g.visible=!0,this.fx.clear(),this.petals.clear(),i?(this._walkFrom=o,this.s=o):this._walkFrom=null,this._enterLevel(t,{retry:e,cont:i})}_enterLevel(t,{retry:e=!1,fromIntro:s=!1,cont:i=!1}={}){let o=this.level;this._set("enter"),this.ui.show(null),this.ui.hudOn(!1),this.ui.lore(null),this.ui.skip(!1),this.app.gov.menu=!1,this.envTo!==o.season&&this.envTo2(o.season,i?3:1.6);let a=this.curve.sample(this.s0,this._smp),c=Math.atan2(a.z,a.x);s?this.sunTarget=c+o.sunStart:this.sunAz=this.sunTarget=c+o.sunStart;let n=this.app.rig,l=this.curve.sample(this.s0+3,this._smp2);if(n.followTarget(ht(a.x,a.y,a.z),ht(l.x,l.y,l.z)),!s&&!e&&!i){let h=n.tPos.clone(),p=n.tLook.clone(),u=n.pos.clone(),m=ht(Math.cos(c-.6)*34,a.y+9,Math.sin(c-.6)*34);n.play([{t:0,pos:u,look:n.look.clone()},{t:1.4,pos:m,look:ht(a.x*.5,a.y+1,a.z*.5)},{t:2.6,pos:h,look:p}],null)}else e?(n.mode="follow",n.snap()):n.mode="follow";this.ui.card(o.kicker,o.title,o.finale?"Son b\xF6l\xFCm":""),this._cardT=2.4,this.ui.setDrops(0,o.drops.length),this._queueHints(o.hints||[])}_queueFront(t){this._hintQueue.includes(t)||this._hintQueue.unshift(t)}_queueHints(t){this._hintQueue=t.filter(e=>!this.prog.seen[e])}_showHint(t,e=4.5){this.ui.hint(t),this._hintUntil=this.levelT+e,this._hintKey=t,this.prog.seen[t]=!0,this.store.set("progress",this.prog)}_begin(){this._set("play"),this.ui.hudOn(!0),this._hintKey==="drag"&&(this.ui.hint(null),this._hintKey=null,this._hintQueue[0]==="hide"&&this._showHint(this._hintQueue.shift(),4.5))}update(t,e){this.stateT+=t,this.envT<1&&(this.envT=Math.min(1,this.envT+t/this.envDur));let s=this.state;if(s==="title"||s==="levels")return this._updateOrbit(t,e);if(s==="intro")return this._updateIntro(t,e);if(s==="paused"||s==="complete"||s==="fail"||s==="ending"){this.app.idle=this.stateT>1.2,this._updateZifirOnly(t,e,s==="paused");return}this.app.idle=!1;let i=this.level;this.levelT+=s==="play"?t:0;let o=this.curve,a=this.sunTarget-this.sunAz,c=Ti*t;this.sunAz+=lt(a,-c,c),Tt.gust=s==="play"?Ws(i.gust,this.levelT):0,this.ui.gust(s==="play"&&ts(i.gust,this.levelT)<1.6&&Tt.gust<.05),s==="play"&&i.gust&&ts(i.gust,this.levelT)<1.6&&this._hintQueue[0]==="gust"&&this._showHint(this._hintQueue.shift(),4);let n=!1;if(s==="enter")this._cardT-=t,this._cardT<.4&&this.ui.card(null),this._walkFrom!=null&&this.s<this.s0&&(this.s=Math.min(this.s0,this.s+1.4*t),n=!0),this.app.rig.mode!=="cine"&&this._cardT<.6&&(this._walkFrom==null||this.s>=this.s0)&&(this.ui.card(null),this.ui.hudOn(!0),this.li===0&&!this.prog.seen.drag?(this._set("ready"),this._showHint(this._hintQueue.shift()||"drag",999)):(this._set("play"),this._hintQueue.length&&this._hintQueue[0]!=="gust"&&this._hintQueue[0]!=="bridge"&&this._showHint(this._hintQueue.shift(),4.5)));else if(s==="ready")this.stateT>7&&this._begin();else if(s==="play"){let x=this.hold||this.keyHold,f=this.locks.limit(this.s),y=this.s>=f-.05,b=lt((f-this.s)/.7,0,1),M=x?0:i.speed*b;if(this.speed=gt(this.speed,M,x?14:5,t),this.s=Math.min(this.s+this.speed*t,Math.max(this.s,f)),n=this.speed>.15,y&&!this.prog.seen.lock&&this._showHint("lock",6),this._lockT=y?(this._lockT||0)+t:0,this._lockT>4?this._lockAssist():this._arcOn&&(this.ui.lockArc(null),this._arcOn=!1),this._hintQueue[0]==="bridge")for(let C of le){let F=o.sAtTheta(C.th);F>this.s&&F-this.s<9&&this._showHint(this._hintQueue.shift(),4.5)}}let l=o.sample(this.s,this._smp);this.zp.set(l.x,l.y,l.z);let h=o.sample(Math.min(o.length,this.s+3.2),this._smp2);this._ahead.set(h.x,h.y,h.z);let p=Math.atan2(l.z,l.x),u=lt((this.s-this.s0)/(this.s1-this.s0),0,1);this.elev=O(i.elev[0],i.elev[1],u),de(this.sunAz,this.elev,this.sunDir);let m=s==="play";this.tester.setTime(e);let d=0;if(m||s==="ready"){let x=this._pts,f=l.tx,y=l.tz,b=l.sx,M=l.sz;x[0].set(l.x,l.y+.48,l.z),x[1].set(l.x,l.y+.86,l.z),x[2].set(l.x+b*.3,l.y+.36,l.z+M*.3),x[3].set(l.x-b*.3,l.y+.36,l.z-M*.3),x[4].set(l.x+f*.3,l.y+.36,l.z+y*.3),x[5].set(l.x-f*.3,l.y+.36,l.z-y*.3);for(let C=0;C<this.rays;C++){let F=x[C];this.tester.blocked(F.x,F.y,F.z,this.sunDir)||d++}d/=this.rays}let v=0;if(s!=="title"&&s!=="levels"&&(v=this.beams.update(t,e,l.y,this.sunDir,this.tester,this.zp)),v>0&&m&&this._hintQueue[0]!=="crystal"&&!this.prog.seen.crystal&&this._queueFront("crystal"),this.beams.active.length&&m&&this._hintQueue[0]==="crystal"&&this._showHint(this._hintQueue.shift(),5),d=Math.max(d,v),this.expo=gt(this.expo,d,18,t),m&&(d>.01?(this.meter-=d*Ei*this.burnK*t,this.burnTotal+=d*t,this._wasSafe&&this.haptic(8),this._wasSafe=!1,Math.random()<t*22*d&&xe(this.fx,l.x,l.y+.7,l.z,.9)):(this.meter=Math.min(1,this.meter+Si*t),this._wasSafe=!0),this.minMeter=Math.min(this.minMeter,this.meter)),this.G.uDanger.value=gt(this.G.uDanger.value,m?d*.8+(1-this.meter)*.4*d:0,8,t),this.drops.update(t,e,this.s,this.zp,this.tester,this.sunDir,this.fx,()=>{this.got++,this.ui.setDrops(this.got,this.drops.total,"pop"),this.sfx.drop(),this.haptic(12)},()=>{this.lostN++,this.ui.setDrops(this.got,this.drops.total,"bad"),this.sfx.dropLost(),this.haptic(40),this.prog.seen.drops!==!0&&this._showHint("drops",4)},m),(m||s==="ready")&&this.locks.update(t,this.s,this.sunDir,this.tester,this.beams,this.fx,()=>{this.sfx.unlockOpen?this.sfx.unlockOpen():this.sfx.win(),this.haptic([15,30,15]),this._hintKey==="lock"&&(this.ui.hint(null),this._hintKey=null),this.ui.lockArc(null),this._arcOn=!1,this._lockT=0}),this._hintKey&&this._hintKey!=="drag"&&this.levelT>this._hintUntil&&(this.ui.hint(null),this._hintKey=null),m&&this.meter<=0?this._die():m&&this.s>=this.s1&&this._win(),s!=="dying"&&s!=="gate"){let x=this._zstate(l,n,n?Math.max(this.speed,1.2):0,s==="play"&&(this.hold||this.keyHold),m?d:0,d,this.meter);this.zifir.update(t,e,x,this._onStep)}let g=this.app.rig;g.mode==="follow"&&g.followTarget(this.zp,this._ahead),this.ui.compass(ye(this.sunAz-p),d>.01),this.sfx.tick(t,m?d:0,Tt.str+Tt.gust,m),this._commonFx(t)}_lockAssist(){if(this._assistT=(this._assistT||0)-1,this._assistT>0)return;this._assistT=15;let t=this.locks.pending(this.s);if(!t)return;let e=this.curve.sample(this.s,{}),s=Math.atan2(e.z,e.x),i=this._Lt||(this._Lt=ht()),o=[];for(let l=0;l<72;l++){let h=l/72*D-Math.PI;de(s+h,this.elev,i);let p=!1;for(let m of[.48,.86,.36])this.tester.blocked(e.x,e.y+m,e.z,i)||(p=!0);if(p)continue;let u=!1;for(let m of[1,1.7,.8])this.tester.blocked(t.x,t.y+m,t.z,i)||(u=!0);u&&o.push(h)}if(!o.length)return;let a=ye(this.sunAz-s),c=null,n=0;for(;n<o.length;){let l=n;for(;l+1<o.length&&o[l+1]-o[l]<.1;)l++;let h=(o[n]+o[l])/2,p=Math.abs(ye(h-a));(!c||p<c.d)&&(c={a0:o[n]-.04,a1:o[l]+.04,d:p}),n=l+1}this.ui.lockArc(c.a0,c.a1),this._arcOn=!0}_zstate(t,e,s,i,o,a,c){let n=this._zs||(this._zs={});return n.x=t.x,n.y=t.y,n.z=t.z,n.yaw=Math.atan2(t.tx,t.tz),n.moving=e,n.speed=s,n.hold=i,n.burn=o,n.lit=a,n.meter=c,n}_commonFx(t){this.fx.update(t),this.petals.update(t),this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp)}_updateZifirOnly(t,e,s){if(s)return;let i=this.curve.sample(this.s,this._smp);(this.state==="complete"||this.state==="ending")&&this.zifir.update(t,e,this._zstate(i,!1,0,!1,0,0,1)),this._commonFx(t)}_updateOrbit(t,e){let s=this._orbit;s.a+=t*.05;let i=this.app.rig;i.mode="manual";let o=this.app.rig.aspect<1?s.r*1.12:s.r;i.pos.set(Math.cos(s.a)*o,s.y+Math.sin(e*.1)*3,Math.sin(s.a)*o),i.look.set(0,s.ly,0),this.sunAz=s.a+1.1+Math.sin(e*.07)*.6,this.elev=30;let a=["spring","summer","autumn","winter"];if(this._titleSeason+=t,this._titleSeason>9){this._titleSeason=0;let c=a[(a.indexOf(this.envTo)+1)%4];this.envTo2(c,3)}Tt.str=.25,Tt.gust=0,this.elev=null,this.app.sunAz=this.sunAz,this.app.elev=null,this.app.focus.set(0,30,0),this.app.idle=!1,this.fx.update(t),this.petals.update(t)}_updateIntro(t,e){let s=this.app.rig,i=s.cine?s.cine.t:99;for(;this._loreI<this._lore.length&&i>=this._lore[this._loreI][0];)this.ui.lore(this._lore[this._loreI][1]),this._loreI++;i>10.6&&this.ui.lore(null);let o=this.curve.sample(this.s,this._smp);this.zp.set(o.x,o.y,o.z),this.zifir.update(t,e,this._zstate(o,!1,0,!1,0,0,1)),this.sunAz+=t*.12,this.elev=34,this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp),this.fx.update(t),this.petals.update(t),!s.cine&&this.state==="intro"&&(this.prog.intro=!0,this.store.set("progress",this.prog))}_die(){this._set("dying"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.sfx.fail(),this.haptic([30,40,60]),this.prog.fails[this.li]=(this.prog.fails[this.li]||0)+1,this.store.set("progress",this.prog);let t=performance.now(),e=this.zifir,s=this.zp.clone(),i=()=>{let o=Math.min(1,(performance.now()-t)/1300);e.evaporate(o),Math.random()<.6&&xe(this.fx,s.x,s.y+.4,s.z,1.3),this.app.wake(),o<1?requestAnimationFrame(i):(this._set("fail"),this.G.uDanger.value=0,this.ui.showFail({progress:lt((this.s-this.s0)/(this.s1-this.s0),0,1),mercy:this.prog.fails[this.li]>=1}))};requestAnimationFrame(i)}_win(){let t=this.level;this._set(t.finale?"gate":"won"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.G.uDanger.value=0,this.zifir.hop(),this.sfx.win(),this.haptic([20,40,20,40,60]);let e=this.zp,s={spring:0,summer:3,autumn:1,winter:2}[t.season];for(let h=0;h<46;h++){let p=Math.random()*D,u=Math.random()*3;this.petals.emit(e.x+Math.cos(p)*u,e.y+3+Math.random()*3,e.z+Math.sin(p)*u,(Math.random()-.5)*1.2,-.3-Math.random()*.6,(Math.random()-.5)*1.2,3+Math.random()*1.5,.22,.2,.25,.6,1,1,1,1,s,(Math.random()-.5)*4)}ie(this.fx,e.x,e.y+.8,e.z,30,[2.6,2,.9]);let i=this.drops.total,o=[!0,i===0||this.got===i,this.minMeter>.9],a=o.filter(Boolean).length,c=this.prog.stars[this.li]||0,n=10+this.got*5+(o[2]?10:0)+(a===3?10:0),l=a>c?n:Math.round(n*.25);this.prog.stars[this.li]=Math.max(c,a),this.prog.unlocked=Math.min(me-1,Math.max(this.prog.unlocked,this.li+1)),this.prog.dust+=l,this.prog.fails[this.li]=0,this.store.set("progress",this.prog),this.app.hooks.onReward&&this.app.hooks.onReward({level:this.li,stars:a,dust:l,drops:this.got}),this._result={title:t.title,kicker:t.kicker,stars:o,dust:l,last:this.li===me-1},t.finale?this._gateSeq():setTimeout(()=>{this.state==="won"&&(this._set("complete"),this.ui.showComplete(this._result))},1500)}_gateSeq(){let t=this.world.island,e=t.gatePos.clone(),s=this.zp.clone(),i=this.app.rig,o=t.gateOut,a=e.clone().addScaledVector(o,14).add(ht(0,4,0));i.play([{t:0,pos:i.pos.clone(),look:i.look.clone()},{t:2.2,pos:e.clone().addScaledVector(o,9).add(ht(0,2.5,0)),look:e.clone()},{t:6.5,pos:a.add(ht(0,16,0)),look:ht(0,22,0),fov:55}],null),this.envTo2("night",5);let c=performance.now(),n=this.zifir,l=()=>{let h=(performance.now()-c)/1e3,p=lt((h-.6)/1.6,0,1),u=s.clone().lerp(ht(e.x,s.y,e.z),p);n.g.position.copy(u),n.setFade(1-_t(.7,1,p)),this.world.gateMat.uniforms.uOpen.value=_t(0,1.2,h),h<7?requestAnimationFrame(l):(n.g.visible=!1,this._set("ending"),this.ui.showEnding(this.prog.dust))};requestAnimationFrame(l)}envState(){let t=this.envT;return[this.envFrom,this.envTo,t*t*(3-2*t)]}destroy(){window.removeEventListener("keydown",this._onKey),window.removeEventListener("keyup",this._onKey)}};var Ys=`
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
.uk-title{justify-content:flex-start;padding:calc(var(--sat) + 18px) 20px calc(var(--sab) + 30px);background:linear-gradient(180deg,rgba(20,14,40,.45) 0%,rgba(20,14,40,0) 34%)}
.uk-title .top{width:100%;display:flex;justify-content:space-between}
.uk-brand{text-align:center;margin-top:1vh}
.uk-brand .k{font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold2);opacity:.9}
.uk-brand h1{font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(54px,15vw,92px);line-height:.95;margin-top:10px;
  background:linear-gradient(180deg,#fffaf0 0%,#ffe2a6 60%,#f0b25e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:0 6px 40px rgba(255,190,110,.25)}
.uk-brand .tag{margin-top:14px;font-family:var(--serif);font-style:italic;font-size:19px;color:var(--ivory-dim)}
.uk-title .acts{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:auto}
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
`;var Oe={back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',hand:'<svg viewBox="0 0 24 24"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 13.5c-.6-1 .6-2.2 1.6-1.5L8 15"/></svg>',wait:'<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/></svg>'},zi={drag:"Parma\u011F\u0131n\u0131 sa\u011Fa sola kayd\u0131r: <em>g\xFCne\u015F</em> a\u011Fac\u0131n etraf\u0131nda d\xF6ner.",hide:"G\xFCne\u015Fi g\xF6vdenin <em>arkas\u0131na</em> sakla: a\u011Fac\u0131n g\xF6lgesi Zifir\u2019i korur.",drops:"<em>Gece damlalar\u0131</em> \u0131\u015F\u0131kta erir. Onlar\u0131 da g\xF6lgede tut.",bridge:"K\xF6pr\xFCde g\xF6vde uzakta kal\u0131r: <em>yapraklar\u0131n</em> g\xF6lgesini kullan.",ledge:"G\xFCne\u015F tepedeyken <em>\xFCstteki patika</em> da g\xF6lge verir.",wait:"<em>Bekle</em>\u2019ye bas\u0131l\u0131 tut: Zifir durur, sen g\xF6lgeyi haz\u0131rlars\u0131n.",gust:"<em>Sert r\xFCzg\xE2r</em> yapraklar\u0131 savurur. Dinmesini bekle.",gate:"G\xFCne\u015F bat\u0131yor. <em>K\xF6k Kap\u0131s\u0131</em>\u2019na ula\u015F.",crystal:"<em>Kristaller</em> g\xFCne\u015Fi yans\u0131t\u0131r. G\xFCne\u015Fi biraz kayd\u0131r: \u0131\u015F\u0131n Zifir\u2019e de\u011Fmesin.",lock:"Tomurcuk \u0131\u015F\u0131kla a\xE7\u0131l\u0131r. G\xF6lgenin kenar\u0131n\u0131 ikisinin <em>aras\u0131na</em> d\xFC\u015F\xFCr: \u0131\u015F\u0131k tomurcu\u011Fa de\u011Fsin, Zifir\u2019e de\u011Fmesin."},Ne=class{constructor(t,e){if(this.h=e,!document.getElementById("uk-style")){let n=document.createElement("style");n.id="uk-style",n.textContent=Ys,document.head.appendChild(n)}let s=document.createElement("div");s.className="uk-ui",s.innerHTML=`
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
			<div class="uk-fade"></div>`,t.appendChild(s),this.el=s;let i=n=>s.querySelector(n);this.$=i,this.scr={},s.querySelectorAll(".uk-scr").forEach(n=>this.scr[n.dataset.s]=n),this.hud=i(".uk-hud"),this.lk=i(".lk"),this.lt=i(".lt"),this.dp=i(".dp"),this.dt=i(".dt"),this.sunG=i(".sun"),this.bandG=i(".bandg"),this.zifDot=i(".zif"),this.hintEl=i(".uk-hint"),this.hand=i(".uk-hand"),this.gustEl=i(".uk-gust"),this.toastEl=i(".uk-toast"),this.titleCard=i(".uk-card-title"),this.loreEl=i(".uk-lore"),this.skipEl=i(".uk-skip"),this.fadeEl=i(".uk-fade"),this.waitBtn=i(".uk-wait"),this._rel=null,this._hot=null,s.addEventListener("click",n=>{let l=n.target.closest("[data-a]");if(l){n.stopPropagation(),e.action(l.dataset.a);return}let h=n.target.closest("[data-t]");h&&(n.stopPropagation(),e.toggle(h.dataset.t))});let o=this.waitBtn,a=n=>{n.preventDefault(),n.stopPropagation();try{o.setPointerCapture(n.pointerId)}catch{}o.classList.add("dn"),e.wait(!0)},c=()=>{o.classList.remove("dn"),e.wait(!1)};o.addEventListener("pointerdown",a),o.addEventListener("pointerup",c),o.addEventListener("pointercancel",c),o.addEventListener("lostpointercapture",c)}show(t){for(let[e,s]of Object.entries(this.scr))s.classList.toggle("on",e===t)}hudOn(t){this.hud.classList.toggle("on",t),this.hud.querySelectorAll("[data-a],.uk-wait").forEach(e=>e.style.pointerEvents=t?"auto":"none")}setLevel(t){this.lk.textContent=t.kicker,this.lt.textContent=t.title}setDrops(t,e,s){this.dt.textContent=`${t}/${e}`,this.dp.style.display=e?"":"none",s==="pop"?(this.dp.classList.add("pop"),setTimeout(()=>this.dp.classList.remove("pop"),220)):s==="bad"&&(this.dp.classList.remove("bad"),this.dp.offsetWidth,this.dp.classList.add("bad"))}compass(t,e){let s=Math.round(t*180/Math.PI*2)/2;s!==this._rel&&(this._rel=s,this.sunG.setAttribute("transform",`rotate(${s})`),this.bandG.setAttribute("transform",`rotate(${s+180})`)),e!==this._hot&&(this._hot=e,this.zifDot.classList.toggle("hot",e))}lockArc(t,e){let s=this.$(".uk-compass .win");if(t==null){this._arc&&s.setAttribute("d",""),this._arc=null;return}let i=`${t.toFixed(2)}:${e.toFixed(2)}`;if(i===this._arc)return;this._arc=i;let o=c=>`${(-52*Math.sin(c)).toFixed(1)} ${(52*Math.cos(c)).toFixed(1)}`,a=e-t>Math.PI?1:0;s.setAttribute("d",`M ${o(t)} A 52 52 0 ${a} 1 ${o(e)}`)}hint(t){if(!t){this.hintEl.classList.remove("on"),this.hand.classList.remove("on"),this._hint=null;return}this._hint!==t&&(this._hint=t,this.hintEl.innerHTML=zi[t]||t,this.hintEl.classList.add("on"),this.hand.classList.toggle("on",t==="drag"))}gust(t){t!==this._gust&&(this._gust=t,this.gustEl.classList.toggle("on",t))}toast(t,e=2200){this.toastEl.textContent=t,this.toastEl.classList.add("on"),clearTimeout(this._toastT),this._toastT=setTimeout(()=>this.toastEl.classList.remove("on"),e)}card(t,e,s){if(!t){this.titleCard.classList.remove("on");return}this.titleCard.querySelector("small").textContent=t,this.titleCard.querySelector("b").textContent=e,this.titleCard.querySelector("span").textContent=s||"",this.titleCard.classList.add("on")}lore(t){t?(this.loreEl.textContent=t,this.loreEl.classList.add("on")):this.loreEl.classList.remove("on")}skip(t){this.skipEl.classList.toggle("on",t)}fade(t){this.fadeEl.classList.toggle("on",t)}renderLevels(t,e){let s=this.$(".uk-list");s.innerHTML=t.map((i,o)=>{let a=o>e.unlocked,c=e.stars[o]||0;return`<button class="uk-lv uk-tap${a?" lock":""}" data-a="lv:${o}" data-s="${i.season}">
					<small>${i.kicker}</small><b>${i.title}</b>
					<span class="st">${[0,1,2].map(n=>`<i class="${n<c?"on":""}"></i>`).join("")}</span><span class="sw"></span></button>`}).join("")}showComplete({title:t,kicker:e,stars:s,dust:i,last:o}){this.$(".ck").textContent=e,this.$(".ct").textContent=t,this.$(".cs").textContent=o?"Son b\xF6l\xFCm":"",[".s0",".s1",".s2"].forEach((a,c)=>{let n=this.$(a);n.classList.remove("on"),s[c]&&setTimeout(()=>n.classList.add("on"),350+c*260)}),this.$(".uk-dust").textContent=i?`+${i} \u0131\u015F\u0131k tozu`:"",this.$("[data-s=complete] [data-a=next]").style.display=o?"none":"",this.show("complete")}showFail({progress:t,mercy:e}){this.$(".fs").textContent=`Yolun %${Math.round(t*100)}\u2019i`,this.$(".fp").style.width=`${Math.round(t*100)}%`,this.$(".fm").innerHTML=e?"<b>G\xFCne\u015F yumu\u015Fuyor:</b> bir sonraki denemede \u0131\u015F\u0131k daha az yakar.":"",this.show("fail")}showEnding(t){this.$(".ed").textContent=t?`Toplam ${t} \u0131\u015F\u0131k tozu`:"",this.show("ending")}setToggles(t){let e=(s,i)=>{let o=this.$(`[data-t=${s}] b`);o&&(o.textContent=i)};e("sound",t.sound?"A\xE7\u0131k":"Kapal\u0131"),e("haptics",t.haptics?"A\xE7\u0131k":"Kapal\u0131"),e("quality",{auto:"Otomatik",0:"D\xFC\u015F\xFCk",1:"Orta",2:"Y\xFCksek"}[t.quality]||"Otomatik"),e("power",{auto:"Otomatik",saver:"Tasarruf",performance:"Performans"}[t.power]||"Otomatik")}setPlayLabel(t){this.$("[data-a=play]").textContent=t}};var js=[0,2,4,7,9,12,14,16,19,21],Ge=class{constructor(t={}){this.hooks=t,this.ctx=null,this.on=!0,this.season="spring",this._dropN=0,this._birdT=4}unlock(){if(this.ctx){this.ctx.state==="suspended"&&this.ctx.resume();return}let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let e=new t;this.ctx=e,this.master=e.createGain(),this.master.gain.value=this.on?.9:0,this.master.connect(e.destination);let s=e.sampleRate*2,i=e.createBuffer(1,s,e.sampleRate),o=i.getChannelData(0);for(let a=0;a<s;a++)o[a]=Math.random()*2-1;this.noise=i,this.wind=this._loopNoise("lowpass",520,.6),this.wind.g.gain.value=0,this.sizz=this._loopNoise("highpass",3200,.7),this.sizz.g.gain.value=0}_loopNoise(t,e,s){let i=this.ctx,o=i.createBufferSource();o.buffer=this.noise,o.loop=!0;let a=i.createBiquadFilter();a.type=t,a.frequency.value=e,a.Q.value=s;let c=i.createGain();return o.connect(a),a.connect(c),c.connect(this.master),o.start(),{src:o,f:a,g:c}}setOn(t){this.on=t,this.master&&this.master.gain.setTargetAtTime(t?.9:0,this.ctx.currentTime,.05)}_host(t,e){return this.hooks.sfx?this.hooks.sfx(t,e)===!0:!1}_tone(t,e,s,i,o="sine",a=0){let c=this.ctx,n=c.createOscillator();n.type=o,n.frequency.value=t;let l=c.createGain();l.gain.setValueAtTime(0,e),l.gain.linearRampToValueAtTime(i,e+.008),l.gain.exponentialRampToValueAtTime(1e-4,e+s),n.connect(l),l.connect(this.master),n.start(e),n.stop(e+s+.05),a&&this._tone(t*a,e,s*.6,i*.35,"sine",0)}_burst(t,e,s,i,o="bandpass"){let a=this.ctx,c=a.createBufferSource();c.buffer=this.noise;let n=a.createBiquadFilter();n.type=o,n.frequency.value=s,n.Q.value=1.2;let l=a.createGain();l.gain.setValueAtTime(i,t),l.gain.exponentialRampToValueAtTime(1e-4,t+e),c.connect(n),n.connect(l),l.connect(this.master),c.start(t,Math.random()),c.stop(t+e+.02)}step(){this._host("step")||!this.ctx||this._burst(this.ctx.currentTime,.05,900+Math.random()*500,.05)}drop(){if(this._host("drop")||!this.ctx)return;let t=this.ctx.currentTime,e=js[Math.min(js.length-1,this._dropN++)],s=660*Math.pow(2,e/12);this._tone(s,t,1.3,.16,"sine",2.76),this._tone(s*2,t+.07,.9,.06,"triangle")}resetDrops(){this._dropN=0}dropLost(){if(this._host("dropLost")||!this.ctx)return;let t=this.ctx.currentTime;this._burst(t,.35,2600,.12,"highpass"),this._tone(420,t,.4,.06,"triangle"),this._tone(300,t+.1,.5,.05,"triangle")}ui(){this._host("ui")||!this.ctx||this._tone(880,this.ctx.currentTime,.12,.05,"sine")}win(){if(this._host("win")||!this.ctx)return;let t=this.ctx.currentTime;[0,4,7,12,16].forEach((e,s)=>this._tone(523*Math.pow(2,e/12),t+s*.11,1.6,.11,"sine",2)),this._tone(261.6,t,2.4,.06,"triangle")}unlockOpen(){if(this._host("unlock")||!this.ctx)return;let t=this.ctx.currentTime;[0,7,12,16].forEach((e,s)=>this._tone(392*Math.pow(2,e/12),t+s*.05,1.4,.07,"sine",2))}fail(){if(this._host("fail")||!this.ctx)return;let t=this.ctx.currentTime;this._burst(t,.9,1800,.14,"highpass"),[7,4,0].forEach((e,s)=>this._tone(392*Math.pow(2,e/12),t+.15+s*.16,.7,.07,"triangle"))}tick(t,e,s,i){if(!this.ctx||!this.on)return;let o=this.ctx.currentTime;this.sizz.g.gain.setTargetAtTime(i?e*.09:0,o,.05),this.wind.g.gain.setTargetAtTime(.025+s*.05,o,.3),this.wind.f.frequency.setTargetAtTime(380+s*500,o,.3),(this.season==="spring"||this.season==="summer")&&i&&(this._birdT-=t,this._birdT<0&&(this._birdT=3+Math.random()*6,this._bird(o)))}_bird(t){let e=this.ctx,s=2+(Math.random()*3|0),i=2200+Math.random()*1400;for(let o=0;o<s;o++){let a=e.createOscillator(),c=e.createGain(),n=t+o*.13;a.frequency.setValueAtTime(i,n),a.frequency.exponentialRampToValueAtTime(i*1.35,n+.05),a.frequency.exponentialRampToValueAtTime(i*.9,n+.09),c.gain.setValueAtTime(0,n),c.gain.linearRampToValueAtTime(.022,n+.01),c.gain.exponentialRampToValueAtTime(1e-4,n+.1),a.connect(c),c.connect(this.master),a.start(n),a.stop(n+.12)}}suspend(){this.ctx&&this.ctx.state==="running"&&this.ctx.suspend()}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}};var Le=class{constructor({container:t,store:e,hooks:s={},quality:i="auto",power:o="auto"}){this.container=t,this.store=e,this.hooks=s,this.qualityOpt=i,this.power=o,this.running=!1,this.visible=!0,this.time=0,this.sunAz=0,this.elev=null,this.idle=!1,this._raf=0,this._last=0,this._prev=0,this._dirty=!0,this.V3=ue.Vector3}async init(){let t=document.createElement("canvas");t.className="uk-canvas",this.container.appendChild(t),this.canvas=t;let e=this.store.get("settings")||{},s=this.qualityOpt!=="auto"?this.qualityOpt:e.quality??"auto",i=s==="auto"?null:Number(s),o=rs(t,i);this.renderer=o.renderer,this.tier=o.tier,this.info=o,this.gov=new be({tier:o.tier.id,gpu:o.gpu,store:this.store,power:e.power||this.power}),this.gov.onScale=()=>this.resize(),this.gov.onBattery=c=>{this.ui&&this.ui.toast(c?"Pil koruma a\xE7\u0131k: daha az kare, daha serin telefon":"Pil koruma kapand\u0131")};let a=ls();this.G=a,us(a,o.tier.shadowTaps),this.shadow=new we(a,o.tier.shadowSize),this.world=Us({G:a,tier:o.tier,shadow:this.shadow,aniso:o.aniso,msaa:o.msaa}),this.scene=this.world.scene,this.rig=new Re,this.focus=new ue.Vector3(0,30,0),this.sfx=new Ge(this.hooks),this.ui=new Ne(this.container,{action:c=>this.game.action(c),toggle:c=>this.game.toggle(c),wait:c=>this.game.wait(c)}),this._onResize=()=>this.resize(),window.addEventListener("resize",this._onResize),this._onVis=()=>{this.visible=!document.hidden,this.visible?(this.gov.reset(),this._last=0,this._prev=0,this.wake(),this.sfx.resume()):(this.sfx.suspend(),this.game&&this.game.pause())},document.addEventListener("visibilitychange",this._onVis),this.resize(),this.game=new Ve(this,this.ui,this.sfx),this.rig.pos.set(70,32,60),this.rig.look.set(0,27,0),this.rig.mode="manual",this.rig.update(0),await this.warmup()}async warmup(){let t=this.renderer,e=[];this.scene.traverse(s=>{s.isMesh&&!s.visible&&(e.push(s),s.visible=!0)});try{t.compileAsync?(await t.compileAsync(this.scene,this.rig.cam),await t.compileAsync(this.shadow.scene,this.shadow.cam)):(t.compile(this.scene,this.rig.cam),t.compile(this.shadow.scene,this.shadow.cam))}catch{}this.renderFrame();for(let s of e)s.visible=!1}resize(){let t=Math.max(1,this.container.clientWidth||window.innerWidth),e=Math.max(1,this.container.clientHeight||window.innerHeight),s=this.gov.pixelRatio(t,e);this.renderer.setPixelRatio(s),this.renderer.setSize(t,e,!1),this.canvas.style.width=t+"px",this.canvas.style.height=e+"px";let i=this.renderer.getDrawingBufferSize(new ue.Vector2);this.G.uRes.value.x=i.x,this.G.uRes.value.y=i.y,this.rig.resize(t,e),this.wake()}wake(){this.idle=!1,this._dirty=!0}exit(){this.hooks.onExit?this.hooks.onExit():this.game.goTitle()}renderFrame(){let t=this.G;t.uTime.value=this.time;let[e,s,i]=this.game?this.game.envState():["spring","spring",0];cs(t,Xe[e],Xe[s],i,this.sunAz,this.elev),t.uWind.value.set(Tt.dx,Tt.dz,Tt.str,Tt.gust),t.uFocus.value.set(this.focus.x,this.focus.y+.5,this.focus.z,1.7);let o=Math.min(1,t.uNight.value*1.4+Math.max(0,.3-t.uSunDir.value.y)*1.5);this.world.lanternGlow.mat.uniforms.uK.value=.45+o*1.5,this.world.mats.glass.uniforms.uK.value=1.6+o*2.2;let a=this.world,c=ke(this.focus.y,this._sw||(this._sw=[0,0,0,0]));a.particles.u.uCenter.value.copy(this.rig.look),a.particles.u.uSeason.value.set(c[0],c[1],c[2],c[3]),a.particles.u.uFire.value=o*(this.focus.y<14?1:.3),a.shafts.u.uCenter.value.copy(this.focus),a.birds.u.uCenterY.value=this.focus.y,this.shadow.place(this.focus,t.uSunDir.value),this.shadow.render(this.renderer),this.renderer.render(this.scene,this.rig.cam),this._dirty=!1}start(){if(this.running)return;this.running=!0,this._last=0,this._prev=0;let t=e=>{if(!this.running||(this._raf=requestAnimationFrame(t),!this.visible))return;let s=this._last?e-this._last:16.7;if(this._last=e,this.idle&&!this._dirty){this._prev=e;return}this.gov.tick(e,s)&&this.frame(e)};this._raf=requestAnimationFrame(t)}stop(){this.running=!1,cancelAnimationFrame(this._raf),this.sfx.suspend()}frame(t){let e=Math.min(.05,this._prev?(t-this._prev)/1e3:.016666666666666666);this._prev=t,this.time+=e,this.game.update(e,this.time),this.rig.update(e),this.renderFrame()}destroy(){this.stop(),this.game.destroy(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVis),this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&t.material.dispose()});for(let t of Object.values(this.world.tex))t.dispose();this.shadow.dispose(),this.renderer.dispose(),this.canvas.remove(),this.ui.el.remove()}stats(){let t=this.renderer.info;return{calls:t.render.calls,tris:t.render.triangles,geo:t.memory.geometries,tex:t.memory.textures,programs:t.programs.length,tier:this.tier.name,gpu:this.info.gpu,pr:this.renderer.getPixelRatio()}}debugView({level:t=0,s:e=null,sunAz:s=null,rel:i=null,camDist:o=1,gust:a=0,zifir:c=!0}={}){let n=this.game;n.startLevel(t,{retry:!0}),n.s=e==null?n.s0+4:n.s0+e*(n.s1-n.s0),n._set("play"),this.ui.card(null),this.ui.hint(null),this.ui.hudOn(!0);let l=this.world.curve.sample(n.s,{}),h=Math.atan2(l.z,l.x);n.sunAz=n.sunTarget=s??h+(i??Math.PI),n.zifir.g.visible=c,n.hold=!0,n.envFrom=n.envTo=n.level.season,n.envT=1,this.rig.zoom=o,this.rig.mode="follow";for(let p=0;p<4;p++)this.time+=.016,n.update(.016,this.time),Tt.gust=a,this.rig.snap(),this.rig.update(0);this.renderFrame()}debugCam(t,e,s="spring",i=.5){this.game.envFrom=this.game.envTo=s,this.game.envT=1,this.sunAz=i,this.elev=null,this.rig.pos.copy(t),this.rig.look.copy(e),this.rig.mode="manual",this.rig.update(0),this.focus.copy(e),this.renderFrame()}debugTick(t,e=30){let s=1/e;for(let i=0;i<t;i+=s)this.time+=s,this.game.update(s,this.time),this.rig.update(s);this.renderFrame()}debugSim({level:t=0,policy:e="smart",maxT:s=120,dt:i=1/30}={}){let o=this.game;o.startLevel(t,{retry:!0}),o._set("play"),o.dragged=!0,this.rig.mode="follow";let a=0,c=0,n=new ue.Vector3,l=o.tester,h=0;for(;a<s&&(o.state==="play"||o.state==="enter");){o.state==="enter"&&o._set("play");let p=this.world.curve.sample(o.s,{}),u=Math.atan2(p.z,p.x);if(e==="behind")o.sunTarget=u+Math.PI;else if(e==="smart"&&a>=c&&o.locks.pending(o.s)&&o.speed<.1){c=a+.25;let m=o.locks.pending(o.s),d=this.world.curve.sample(o.s,{}),v=o.elev*Math.PI/180,g=null,x=1e9;for(let f=0;f<180;f++){let y=o.sunAz+(f-90)/90*Math.PI;n.set(Math.cos(v)*Math.cos(y),Math.sin(v),Math.cos(v)*Math.sin(y));let b=0;for(let F of[.48,.86,.36])(!l.blocked(d.x,d.y+F,d.z,n)||o.beams.testPoint(n,d.x,d.y+F,d.z,l))&&b++;if(b)continue;let M=0;for(let F of[1,1.7,.8])l.blocked(m.x,m.y+F,m.z,n)||M++;let C=Math.abs(y-o.sunAz)-M*.5;M&&C<x&&(x=C,g=y)}g!=null&&(o.sunTarget=g),o.hold=!1}else if(e==="smart"&&a>=c){c=a+.2;let m=o.sunTarget,d=1e9;for(let v=0;v<32;v++){let g=o.sunAz+(v-16)/16*Math.PI;n.set(Math.cos(o.elev*Math.PI/180)*Math.cos(g),Math.sin(o.elev*Math.PI/180),Math.cos(o.elev*Math.PI/180)*Math.sin(g));let x=0;for(let y of[0,.8]){let b=this.world.curve.sample(o.s+y,{});(!l.blocked(b.x,b.y+.5,b.z,n)||o.beams.testPoint(n,b.x,b.y+.45,b.z,l))&&(x+=y===0?3:1)}let f=o.locks.pending(o.s);if(f){let y=0;for(let b of[1,1.7])l.blocked(f.x,f.y+b,f.z,n)||y++;x+=(2-y)*.9}for(let y of o.drops.list)y.state!=="idle"||y.s-o.s>9||y.s<o.s-1||(!l.blocked(y.x,y.y+.1,y.z,n)||o.beams.testPoint(n,y.x,y.y,y.z,l,.35))&&(x+=.6);x+=Math.abs(g-o.sunAz)*.05,x<d&&(d=x,m=g)}o.sunTarget=m,o.hold=d>=3&&!o.locks.pending(o.s)}this.time+=i,a+=i,o.update(i,this.time),o.expo>.05&&(h+=i)}return this.rig.update(0),this.renderFrame(),{level:t,policy:e,state:o.state,time:+a.toFixed(1),progress:+((o.s-o.s0)/(o.s1-o.s0)).toFixed(2),minMeter:+o.minMeter.toFixed(2),drops:`${o.got}/${o.drops.total}`,lost:o.lostN,litTime:+h.toFixed(1)}}debugAction(t){this.game.action(t),this.renderFrame()}};function Zs(r,t="ulukayin.v1"){if(r&&typeof r.get=="function"&&typeof r.set=="function")return r;let e={};try{e=JSON.parse(localStorage.getItem(t)||"{}")||{}}catch{e={}}return{get:s=>e[s],set:(s,i)=>{e[s]=i;try{localStorage.setItem(t,JSON.stringify(e))}catch{}}}}async function Va(r={}){let t=Zs(r.store),e=document.createElement("div");e.className="uk-root",e.style.cssText="position:fixed;inset:0;z-index:50;overflow:hidden;background:#16122a;touch-action:none;",(r.container||document.body).appendChild(e);let s=new Le({container:e,store:t,hooks:r.hooks||{},quality:r.quality||"auto",power:r.power||"auto"});return await s.init(),{app:s,open(){e.style.display="",s.start()},close(){s.stop(),e.style.display="none"},destroy(){s.destroy(),e.remove()}}}export{Va as createUluKayin};
