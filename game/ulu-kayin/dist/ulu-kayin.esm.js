import*as ve from"three";import*as de from"three";var D=Math.PI*2,rt=(c,t,e)=>c<t?t:c>e?e:c,pi=c=>c<0?0:c>1?1:c,O=(c,t,e)=>c+(t-c)*e;var Ht=(c,t,e)=>{let s=pi((e-c)/(t-c));return s*s*(3-2*s)},st=(c,t,e,s)=>t+(c-t)*Math.exp(-e*s),Ee=c=>(c=(c+Math.PI)%D,(c<0?c+D:c)-Math.PI);var Qe=c=>c<.5?4*c*c*c:1-Math.pow(-2*c+2,3)/2,Je=c=>1-Math.pow(1-c,3);function Rt(c){let t=c>>>0,e=()=>{t=t+1831565813>>>0;let s=t;return s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296};return e.range=(s,i)=>s+(i-s)*e(),e.pick=s=>s[e()*s.length|0],e.sign=()=>e()<.5?-1:1,e}function Wt(c){let t=Math.floor(c),e=c-t,s=a=>{let o=Math.sin(a*127.1)*43758.5453;return o-Math.floor(o)},i=e*e*(3-2*e);return O(s(t),s(t+1),i)*2-1}var ts=[{id:0,name:"D\xFC\u015F\xFCk",maxPixels:115e4,maxDpr:2,minScale:.62,shadowSize:1024,shadowTaps:1,particles:150,leafDensity:.62,clouds:7,birds:8,shafts:3},{id:1,name:"Orta",maxPixels:19e5,maxDpr:2.4,minScale:.62,shadowSize:2048,shadowTaps:4,particles:340,leafDensity:.85,clouds:11,birds:18,shafts:5},{id:2,name:"Y\xFCksek",maxPixels:3e6,maxDpr:3,minScale:.62,shadowSize:2048,shadowTaps:4,particles:640,leafDensity:1,clouds:16,birds:30,shafts:6}];function ms(c){let t="";try{let o=c.getExtension("WEBGL_debug_renderer_info");t=String(c.getParameter(o?o.UNMASKED_RENDERER_WEBGL:c.RENDERER)||"")}catch{t=""}let e=t.toLowerCase(),s=matchMedia("(pointer: coarse)").matches||/android|iphone|ipad/i.test(navigator.userAgent),i=s?0:1;/swiftshader|llvmpipe|software|microsoft basic/.test(e)||/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(e)?i=0:/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(e)?i=1:/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(e)||/apple/.test(e)||!s&&/nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(e)?i=2:!s&&/intel/.test(e)&&(i=1);let a=navigator.deviceMemory||0;return a&&a<=2?i=0:a&&a<=4&&(i=Math.min(i,1)),{tier:i,gpu:t,mobile:s}}var ze=class{constructor({tier:t,gpu:e,store:s,power:i="auto"}){this.T=ts[t],this.gpu=e,this.store=s,this.power=i,this.battery={saver:!1,level:1,charging:!0};let a=s.get("perf")||{},o=a.gpu===e;this.scale=o?rt(a.scale??1,this.T.minScale,1):1,this.cap=o&&a.cap===30?30:60,this.ceil=o?a.ceil??1:1,this.half=o?!!a.half:t===0,this.vsync=16.67,this._deltas=new Float32Array(24),this._di=0,this._count=0,this._frame=0,this._lastRender=0,this._ema=0,this._slow=0,this._good=0,this._cool=0,this._probe=null,this._ups=0,this._dirty=!1,this.onScale=null,this.menu=!1,this._watchBattery()}get targetFps(){return this.menu||this.power==="saver"||this.power==="auto"&&this.battery.saver?30:this.cap}get maxScale(){return this.power==="saver"||this.power==="auto"&&this.battery.saver?Math.min(this.ceil,.8):this.ceil}get effScale(){return Math.min(this.scale,this.maxScale)}tick(t,e){e>4&&e<40&&(this._deltas[this._di]=e,this._di=(this._di+1)%this._deltas.length,this._count++,this._count%24===0&&(this.vsync=di(this._deltas)));let s=1e3/this.targetFps,i=this._divisor(s);if(this._frame++,this._frame<i)return!1;this._frame=0;let a=this._lastRender?t-this._lastRender:s;return this._lastRender=t,this._adapt(t,a,i*this.vsync),!0}_divisor(t){let e=t/this.vsync;return Math.max(1,this.half?Math.ceil(e-.05):Math.round(e-.15))}reset(){this._lastRender=0,this._frame=0,this._slow=0,this._good=0}_adapt(t,e,s){if(e>s*4)return;this._ema=this._ema?this._ema+(e-this._ema)*.08:e;let i=e/1e3;if(t<this._cool)return;let a=this._ema>s*1.22;if(a?(this._slow+=i,this._good=0):(this._slow=Math.max(0,this._slow-i*.5),this._good+=i),this._probe&&a&&this._slow>1.2){this.ceil=this._probe.from,this._setScale(this._probe.from),this._probe=null,this._cool=t+4e3,this._slow=0,this._dirty=!0;return}if(this._probe&&t-this._probe.t>6e3&&(this._probe=null,this._dirty=!0),this._slow>1.6){this._slow=0,this._cool=t+2200;let o=this.effScale;o>.81?this._setScale(Math.max(.8,o-.1)):!this.half&&this.vsync<14?this.half=!0:o>this.T.minScale+.01?this._setScale(Math.max(this.T.minScale,o-.1)):this.cap===60&&(this.cap=30),this._dirty=!0}else this._good>9&&this._ups<3&&(this._good=0,this.cap===30&&this.power!=="saver"&&!this.battery.saver&&this.effScale>=.8?(this.cap=60,this._ups++,this._cool=t+3e3):this.scale<this.maxScale-.01&&(this._probe={from:this.scale,t},this._setScale(Math.min(this.maxScale,this.scale+.08)),this._ups++,this._cool=t+2500));this._dirty&&t>this._cool&&this.save()}_setScale(t){this.scale=Math.round(t*100)/100,this.onScale&&this.onScale()}save(){this._dirty=!1,this.store.set("perf",{gpu:this.gpu,scale:this.scale,cap:this.cap,ceil:this.ceil,half:this.half})}_watchBattery(){navigator.getBattery&&navigator.getBattery().then(t=>{let e=()=>{this.battery.level=t.level,this.battery.charging=t.charging;let s=this.battery.saver;this.battery.saver=!t.charging&&(s?t.level<=.25:t.level<=.2),s!==this.battery.saver&&this.onBattery&&this.onBattery(this.battery.saver)};e(),t.addEventListener("levelchange",e),t.addEventListener("chargingchange",e)}).catch(()=>{})}pixelRatio(t,e){let s=Math.min(window.devicePixelRatio||1,this.T.maxDpr);return t*e*s*s>this.T.maxPixels&&(s=Math.sqrt(this.T.maxPixels/(t*e))),Math.max(.75,s*this.effScale)}};function di(c){let t=Array.from(c).filter(e=>e>0).sort((e,s)=>e-s);return t.length?t[t.length>>1]:16.67}function gs(c,t){let e={tier:0,gpu:"",mobile:!0};try{let r=document.createElement("canvas").getContext("webgl2");if(r){e=ms(r);let d=r.getExtension("WEBGL_lose_context");d&&d.loseContext()}}catch{}t!=null&&t>=0&&t<=2&&(e.tier=t);let s=/swiftshader|llvmpipe/i.test(e.gpu),i=new de.WebGLRenderer({canvas:c,antialias:!s,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1});i.outputColorSpace=de.LinearSRGBColorSpace,i.toneMapping=de.NoToneMapping,i.setClearColor(1446442,1),i.sortObjects=!0,i.shadowMap.enabled=!1;let o=!!(i.getContext().getContextAttributes()||{}).antialias,l=i.capabilities.getMaxAnisotropy(),n=ts[e.tier],h=Math.min(l,n.id>=1?8:4);return{renderer:i,tier:n,gpu:e.gpu,mobile:e.mobile,msaa:o,aniso:h}}import*as at from"three";var F=(c,t=1)=>new at.Color(c).multiplyScalar(t);function vs(){return{uTime:{value:0},uSunDir:{value:new at.Vector3(0,1,0)},uSunCol:{value:new at.Color},uSkyTop:{value:new at.Color},uSkyHor:{value:new at.Color},uGround:{value:new at.Color},uShadeTint:{value:new at.Color},uFogCol:{value:new at.Color},uFogSun:{value:new at.Color},uFogP:{value:new at.Vector4(.004,0,.03,6)},uRes:{value:new at.Vector3(1,1,.3)},uLift:{value:new at.Color(0,0,0)},uGain:{value:new at.Color(1,1,1)},uGrade:{value:new at.Vector4(1,1,1,1.2/255)},uWind:{value:new at.Vector4(1,0,.3,0)},uFocus:{value:new at.Vector4(0,-999,0,1.6)},uDanger:{value:0},uShadowMap:{value:null},uShadowMat:{value:new at.Matrix4},uShadowP:{value:new at.Vector4(1/1024,.06,.0012,1)},uZenith:{value:new at.Color},uHorizon:{value:new at.Color},uSunGlow:{value:new at.Color},uSunDisc:{value:new at.Color},uNight:{value:0},uCloudCol:{value:new at.Color},uCloudShade:{value:new at.Color}}}var es={spring:{elev:34,sun:F("#ffe4c8",3),zenith:F("#4a7bd0"),horizon:F("#f6d2d4"),sunGlow:F("#ffc9a6",1.3),sunDisc:F("#fff3df",1),skyTop:F("#8aa4dc",.56),skyHor:F("#e9c9d4",.46),ground:F("#b8928a",.32),shade:F("#dcd6ee",1),fog:F("#e4c6d2"),fogSun:F("#ffdcc0",1.1),fogP:[.0026,4,.03,7],cloud:F("#fff1ee",1.15),cloudShade:F("#a48fba",.85),lift:F("#2a1c46",.06),gain:F("#fff6f2"),grade:[1.16,1.1,.95],vignette:.34,night:0},summer:{elev:58,sun:F("#fff3dc",3.2),zenith:F("#2a68d4"),horizon:F("#bfe0f2"),sunGlow:F("#fff0d0",1.1),sunDisc:F("#ffffff",1),skyTop:F("#86aae6",.56),skyHor:F("#c4dae6",.44),ground:F("#97a070",.32),shade:F("#d6dcee",1),fog:F("#c9e2f0"),fogSun:F("#fff1d8",1.05),fogP:[.0022,4,.032,8],cloud:F("#ffffff",1.25),cloudShade:F("#93a9cc",.9),lift:F("#0e1a40",.05),gain:F("#fbfdff"),grade:[1.18,1.1,.95],vignette:.3,night:0},autumn:{elev:22,sun:F("#ffc88a",3.2),zenith:F("#5671b8"),horizon:F("#f2bc88"),sunGlow:F("#ffb070",1.5),sunDisc:F("#fff0d0",1),skyTop:F("#9496c8",.54),skyHor:F("#e2b08c",.44),ground:F("#a6765a",.32),shade:F("#dccfe6",1),fog:F("#e0b48e"),fogSun:F("#ffc488",1.2),fogP:[.003,4,.028,6],cloud:F("#ffe2c2",1.15),cloudShade:F("#9c7c98",.8),lift:F("#2a1430",.06),gain:F("#fff2e4"),grade:[1.16,1.1,.95],vignette:.36,night:0},winter:{elev:8,sun:F("#ff9e6a",3),zenith:F("#262c6a"),horizon:F("#ee8a6c"),sunGlow:F("#ff8a5a",1.7),sunDisc:F("#ffd8b0",1),skyTop:F("#7078b8",.56),skyHor:F("#c890a8",.42),ground:F("#8a88b0",.36),shade:F("#d0ccec",1),fog:F("#8f7cae"),fogSun:F("#ff9f78",1.25),fogP:[.0032,4,.026,5],cloud:F("#ffc4ae",1.05),cloudShade:F("#5e5490",.78),lift:F("#1c1040",.07),gain:F("#fff0ec"),grade:[1.1,1.08,1],vignette:.4,night:.35},night:{elev:30,sun:F("#9fb4ff",.9),zenith:F("#0b0d2a"),horizon:F("#3a3570"),sunGlow:F("#8fa2ff",.6),sunDisc:F("#e8eeff",.6),skyTop:F("#3a4290",.3),skyHor:F("#4a3f80",.24),ground:F("#2a2850",.22),shade:F("#b0b4f0",1),fog:F("#2a2756"),fogSun:F("#5a62b0",1),fogP:[.003,4,.026,6],cloud:F("#8a90d0",.7),cloudShade:F("#2a2a5a",.7),lift:F("#0a0a28",.08),gain:F("#e8ecff"),grade:[1.05,1.1,1.05],vignette:.44,night:1}},fi=new at.Color,mi=new at.Color;function xs(c,t,e,s,i,a=null){let o=(h,r,d)=>h.copy(fi.copy(r).lerp(mi.copy(d),s)),l=(h,r)=>h+(r-h)*s,n=at.MathUtils.degToRad(a??l(t.elev,e.elev));return c.uSunDir.value.set(Math.cos(n)*Math.cos(i),Math.sin(n),Math.cos(n)*Math.sin(i)),o(c.uSunCol.value,t.sun,e.sun),o(c.uZenith.value,t.zenith,e.zenith),o(c.uHorizon.value,t.horizon,e.horizon),o(c.uSunGlow.value,t.sunGlow,e.sunGlow),o(c.uSunDisc.value,t.sunDisc,e.sunDisc),o(c.uSkyTop.value,t.skyTop,e.skyTop),o(c.uSkyHor.value,t.skyHor,e.skyHor),o(c.uGround.value,t.ground,e.ground),o(c.uShadeTint.value,t.shade,e.shade),o(c.uFogCol.value,t.fog,e.fog),o(c.uFogSun.value,t.fogSun,e.fogSun),o(c.uCloudCol.value,t.cloud,e.cloud),o(c.uCloudShade.value,t.cloudShade,e.cloudShade),o(c.uLift.value,t.lift,e.lift),o(c.uGain.value,t.gain,e.gain),c.uFogP.value.set(l(t.fogP[0],e.fogP[0]),l(t.fogP[1],e.fogP[1]),l(t.fogP[2],e.fogP[2]),l(t.fogP[3],e.fogP[3])),c.uGrade.value.x=l(t.grade[0],e.grade[0]),c.uGrade.value.y=l(t.grade[1],e.grade[1]),c.uGrade.value.z=l(t.grade[2],e.grade[2]),c.uRes.value.z=l(t.vignette,e.vignette),c.uNight.value=l(t.night,e.night),n}function xe(c,t,e){let s=at.MathUtils.degToRad(t);return e.set(Math.cos(s)*Math.cos(c),Math.sin(s),Math.cos(s)*Math.sin(c))}import*as kt from"three";var et=`
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
`,ye=`
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
`,Ct=`
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
`,vt=`
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
`;var te=null,ys=1;function bs(c,t){te=c,ys=t}var ks=(c={})=>({SHADOW_TAPS:ys,...c}),ws=`
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
`,gi=`
${et}
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
}`,vi=`
${et}
${ye}
${Ct}
${vt}
#ifdef CUTOUT
${ws}
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
}`;function Qt({map:c=null,repeat:t=[1,1],wrap:e=.3,rim:s=.35,snow:i=0,snowY:a=14,side:o=kt.FrontSide,wind:l=!1,cutout:n=!1}={}){let h={};return c&&(h.USE_MAP=1),l&&(h.WIND=1),n&&(h.CUTOUT=1),new kt.ShaderMaterial({vertexShader:gi,fragmentShader:vi,defines:ks(h),uniforms:{...te,uMap:{value:c},uMapRepeat:{value:new kt.Vector2(t[0],t[1])},uWrap:{value:e},uRim:{value:s},uSnow:{value:i},uSnowY:{value:a}},side:o})}var Ms=`
${et}
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
}`,xi=`
${et}
${ye}
${Ct}
${vt}
${ws}
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
}`;function Ts(c,{a2c:t}){return new kt.ShaderMaterial({vertexShader:Ms,fragmentShader:xi,defines:ks(t?{A2C:1}:{}),uniforms:{...te,uMap:{value:c},uAlphaCut:{value:t?.12:.45},uFacing:{value:1},uFaceDir:{value:new kt.Vector3(0,1,0)}},alphaToCoverage:!!t,side:kt.DoubleSide})}function _s(c){return new kt.ShaderMaterial({vertexShader:Ms,fragmentShader:`
			uniform sampler2D uMap;
			varying vec2 vUv;
			void main() { if (texture2D(uMap, vUv).a < 0.22) discard; gl_FragColor = vec4(1.0); }`,uniforms:{...te,uMap:{value:c},uFacing:{value:0},uFaceDir:te.uSunDir},side:kt.DoubleSide,colorWrite:!1})}function ss({wind:c=!1}={}){return new kt.ShaderMaterial({vertexShader:`
			${et}
			#ifdef WIND
			attribute vec4 aSway;
			#endif
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
			#ifdef WIND
				w.xyz += windSway(aSway.xyz, aSway.w);
			#endif
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:"void main() { gl_FragColor = vec4(1.0); }",defines:c?{WIND:1}:{},uniforms:{...te},side:kt.DoubleSide,colorWrite:!1})}function is(c,t=1){return new kt.ShaderMaterial({vertexShader:"varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",fragmentShader:`
			${et}
			${Ct}
			${vt}
			uniform vec3 uColor; uniform float uK; uniform float uFade;
			varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(uColor * uK * uFade, vW), 1.0); }`,uniforms:{...te,uColor:{value:new kt.Color(c)},uK:{value:t},uFade:{value:1}}})}function Es(c=16777215,t=1){return new kt.ShaderMaterial({vertexShader:`
			attribute vec4 color; varying vec4 vCol; varying vec3 vW;
			void main() { vCol = color; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${Ct}
			${vt}
			uniform vec3 uColor; uniform float uK;
			varying vec4 vCol; varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(vCol.rgb * uColor * uK, vW), 1.0); }`,uniforms:{...te,uColor:{value:new kt.Color(c)},uK:{value:t}}})}function zs(c){return new kt.ShaderMaterial({vertexShader:`
			varying vec3 vDir;
			void main() {
				vDir = position;
				vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
				gl_Position = p.xyww;
			}`,fragmentShader:`
			${et}
			${vt}
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
			}`,uniforms:{...te,uStars:{value:c}},depthWrite:!1,side:kt.BackSide})}import*as lt from"three";var Se=class{constructor(t,e){this.G=t,this.size=e,this.half=17,this.scene=new lt.Scene,this.scene.matrixWorldAutoUpdate=!1,this.cam=new lt.OrthographicCamera(-this.half,this.half,this.half,-this.half,1,300);let s=new lt.DepthTexture(e,e);s.type=lt.UnsignedIntType,s.compareFunction=lt.LessEqualCompare,s.minFilter=lt.LinearFilter,s.magFilter=lt.LinearFilter,this.rt=new lt.WebGLRenderTarget(e,e,{depthTexture:s,depthBuffer:!0,stencilBuffer:!1,format:lt.RedFormat,type:lt.UnsignedByteType,minFilter:lt.NearestFilter,magFilter:lt.NearestFilter,generateMipmaps:!1}),t.uShadowMap.value=s,t.uShadowP.value.set(1/e,.05,9e-4,1),this._bias=new lt.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this._r=new lt.Vector3,this._u=new lt.Vector3,this._f=new lt.Vector3,this._p=new lt.Vector3}add(t,e){let s=new lt.Mesh(t,e);return s.frustumCulled=!1,s.matrixAutoUpdate=!1,s.updateMatrixWorld(!0),this.scene.add(s),s}place(t,e){let s=this._f.copy(e).negate(),i=Math.abs(s.y)>.98?this._u.set(1,0,0):this._u.set(0,1,0),a=this._r.crossVectors(s,i).normalize(),o=this._u.crossVectors(a,s).normalize(),l=this.half*2/this.size,n=Math.round(t.dot(a)/l)*l,h=Math.round(t.dot(o)/l)*l,r=t.dot(s),d=this._p.set(0,0,0).addScaledVector(a,n).addScaledVector(o,h).addScaledVector(s,r),u=this.cam;u.position.copy(d).addScaledVector(s,-150),u.up.copy(o),u.lookAt(d),u.updateMatrixWorld(!0),u.updateProjectionMatrix(),this.G.uShadowMat.value.copy(this._bias).multiply(u.projectionMatrix).multiply(u.matrixWorldInverse)}render(t){let e=t.getRenderTarget();t.setRenderTarget(this.rt),t.clear(!1,!0,!1),t.render(this.scene,this.cam),t.setRenderTarget(e)}dispose(){this.rt.depthTexture.dispose(),this.rt.dispose()}};import*as Et from"three";import*as Jt from"three";function Nt(c,t){let e=document.createElement("canvas");return e.width=c,e.height=t,[e,e.getContext("2d")]}function ce(c,t,e,s,i,a){for(let o=-1;o<=1;o++)for(let l=-1;l<=1;l++){let n=e+o*c,h=s+l*t;n+i<0||n-i>c||h+i<0||h-i>t||a(n,h)}}function Ut(c,{srgb:t=!0,repeat:e=!0,aniso:s=1,mips:i=!0}={}){let a=new Jt.CanvasTexture(c);return t&&(a.colorSpace=Jt.SRGBColorSpace),e&&(a.wrapS=a.wrapT=Jt.RepeatWrapping),a.anisotropy=s,a.generateMipmaps=i,a.minFilter=i?Jt.LinearMipmapLinearFilter:Jt.LinearFilter,a.needsUpdate=!0,a}function Ss(c,t){let e=c,s=c,[i,a]=Nt(e,s),o=Rt(7),l=e/512,n=a.createLinearGradient(0,0,e,0);n.addColorStop(0,"#e8e3da"),n.addColorStop(.5,"#efebe3"),n.addColorStop(1,"#e8e3da"),a.fillStyle=n,a.fillRect(0,0,e,s);let h=["#f6f3ed","#ddd6cc","#e9e1d6","#efe2dc","#e2e2e4","#f2ede2"];for(let r=0;r<70;r++){let d=o()*e,u=o()*s,f=o.range(30,120)*l,p=f*o.range(.12,.4);a.globalAlpha=o.range(.18,.4),a.fillStyle=o.pick(h),ce(e,s,d,u,f,(g,x)=>{a.beginPath(),a.ellipse(g,x,f,p,0,0,D),a.fill()})}a.globalAlpha=.06,a.strokeStyle="#8c8076",a.lineWidth=1*l;for(let r=0;r<90;r++){let d=o()*e,u=o()*s,f=o.range(20,90)*l;ce(e,s,d,u,f,(p,g)=>{a.beginPath(),a.moveTo(p,g),a.lineTo(p+o.range(-2,2)*l,g+f),a.stroke()})}for(let r=0;r<26;r++){let d=o()*e,u=o()*s,f=o.range(40,160)*l,p=o.range(3,9)*l;ce(e,s,d,u,f,(g,x)=>{a.globalAlpha=.5,a.fillStyle="#fbf9f4",a.beginPath(),a.ellipse(g,x,f/2,p/2,0,0,D),a.fill(),a.globalAlpha=.18,a.fillStyle="#7d6e66",a.beginPath(),a.ellipse(g,x+p*.55,f/2.1,p/4,0,0,D),a.fill()})}for(let r=0;r<9;r++){let d=o()*e,u=o()*s,f=o.range(18,50)*l,p=o.range(5,12)*l;ce(e,s,d,u,f,(g,x)=>{a.globalAlpha=.55,a.fillStyle=o()<.5?"#d39a7c":"#c98468",a.beginPath(),a.ellipse(g,x,f/2,p/2,0,0,D),a.fill(),a.globalAlpha=.7,a.strokeStyle="#f7f1e8",a.lineWidth=1.5*l,a.stroke()})}for(let r=0;r<34;r++){let d=o()*s,u=o.range(3,9)|0,f=o()*e;for(let p=0;p<u;p++){let g=o.range(5,34)*l,x=o.range(1.2,3.2)*l,y=d+o.range(-4,4)*l;ce(e,s,f,y,g,(m,b)=>{a.globalAlpha=o.range(.55,.9),a.fillStyle=o()<.7?"#3b3330":"#5a4a44",a.beginPath(),a.ellipse(m,b,g/2,x/2,0,0,D),a.fill()}),f+=g+o.range(4,30)*l}}for(let r=0;r<11;r++){let d=o()*e,u=o()*s,f=o.range(18,64)*l,p=f*o.range(.35,.8);ce(e,s,d,u,f,(g,x)=>{a.globalAlpha=.85,a.fillStyle="#1f1b1a",a.beginPath();let y=18;for(let m=0;m<=y;m++){let b=m/y*D,v=1+o.range(-.25,.2),T=Math.cos(b)*f*.5*v,z=Math.sin(b)*p*.5*v*(.55+.45*Math.abs(Math.cos(b)));m===0?a.moveTo(g+T,x+z):a.lineTo(g+T,x+z)}a.closePath(),a.fill(),a.globalAlpha=.25,a.strokeStyle="#6e625c",a.lineWidth=3*l,a.stroke()})}return a.globalAlpha=1,Ut(i,{aniso:t})}function Rs(c,t,e){let[s,i]=Nt(c,t),a=Rt(11),o=c/512;i.fillStyle="#b07c50",i.fillRect(0,0,c,t);let l=8,n=c/l,h=["#d6a473","#c99563","#deb07c","#cc9a66","#d3a06c","#c08c5c"];for(let d=0;d<l;d++){let u=d*n;i.fillStyle=a.pick(h),i.fillRect(u+1.5*o,0,n-3*o,t);let f=i.createLinearGradient(0,0,0,t);f.addColorStop(0,"rgba(60,30,10,0.18)"),f.addColorStop(.15,"rgba(255,230,190,0.06)"),f.addColorStop(.85,"rgba(255,230,190,0.04)"),f.addColorStop(1,"rgba(60,30,10,0.22)"),i.fillStyle=f,i.fillRect(u,0,n,t);for(let p=0;p<9;p++){let g=u+a.range(4,n-4)*1;i.globalAlpha=a.range(.12,.3),i.strokeStyle=a()<.5?"#6e4426":"#d9a875",i.lineWidth=a.range(.8,2)*o,i.beginPath();for(let x=0;x<=t;x+=8*o){let y=Math.sin(x*.03/o+p*1.7+d)*2.2*o;x===0?i.moveTo(g+y,x):i.lineTo(g+y,x)}i.stroke()}if(a()<.45){let p=u+a.range(8,n-8),g=a.range(.2,.8)*t;i.globalAlpha=.5,i.fillStyle="#5c381e",i.beginPath(),i.ellipse(p,g,3*o,7*o,0,0,D),i.fill()}i.globalAlpha=.8,i.fillStyle="#3a2a22";for(let p of[t*.12,t*.88])i.beginPath(),i.arc(u+n*.5,p,2.2*o,0,D),i.fill();i.globalAlpha=1}i.fillStyle="#4a2e1c";for(let d=0;d<=l;d++)i.fillRect(d*n-1.6*o,0,3.2*o,t);let r=i.createLinearGradient(0,0,0,t);return r.addColorStop(0,"rgba(40,20,8,0.35)"),r.addColorStop(.06,"rgba(40,20,8,0)"),r.addColorStop(.94,"rgba(40,20,8,0)"),r.addColorStop(1,"rgba(40,20,8,0.35)"),i.fillStyle=r,i.fillRect(0,0,c,t),Ut(s,{aniso:e})}function As(c){let[t,e]=Nt(c,c),s=c/2,i=Rt(23),a=(n,h,r,d,u,f,p)=>{e.save(),e.translate(n,h),e.rotate(u),e.fillStyle=f,e.beginPath(),e.moveTo(0,-r*.5),e.quadraticCurveTo(d,-r*.1,0,r*.5),e.quadraticCurveTo(-d,-r*.1,0,-r*.5),e.fill(),p&&(e.strokeStyle=p,e.lineWidth=Math.max(.6,d*.08),e.beginPath(),e.moveTo(0,-r*.42),e.lineTo(0,r*.42),e.stroke()),e.restore()},o=(n,h,r,d)=>{for(let u=0;u<r;u++){let f=i()*D,p=Math.sqrt(i())*s*.4,g=n+Math.cos(f)*p,x=h+Math.sin(f)*p*.92,y=1-(x-(h-s*.4))/(s*.8);d(g,x,y,p/(s*.4))}},l=s/256;{let n=s*.5,h=s*.5;o(n,h,40,(d,u,f)=>{a(d,u,i.range(20,30)*l,i.range(7,10)*l,i()*D,f>.5?"#9fc56a":"#76a24e",null)});let r=["#ffd3e2","#ffc2d6","#ffe6ee","#f7a9c4","#ffdbe6"];o(n,h,120,(d,u,f)=>{let p=i.range(8,13)*l,g=i.pick(r),x=i()*D;e.fillStyle=g;for(let y=0;y<5;y++){let m=x+y/5*D;e.beginPath(),e.ellipse(d+Math.cos(m)*p*.55,u+Math.sin(m)*p*.55,p*.55,p*.38,m,0,D),e.fill()}e.fillStyle=f>.5?"#fff3c8":"#e88aa8",e.beginPath(),e.arc(d,u,p*.22,0,D),e.fill(),f<.4&&(e.globalAlpha=.25,e.fillStyle="#a0507a",e.beginPath(),e.arc(d,u,p*.9,0,D),e.fill(),e.globalAlpha=1)})}{let n=s*1.5,h=s*.5,r=["#4f8f3a","#5fa040","#3f7a32","#6db24a","#477f35","#7cbc54"];o(n,h,190,(d,u,f)=>{let p=f>.65&&i()<.6?"#8ccc5e":i.pick(r);a(d,u,i.range(22,34)*l,i.range(8,12)*l,i()*D,p,"rgba(30,60,20,0.45)")})}{let n=s*.5,h=s*1.5,r=["#f2b233","#f7c440","#e8932c","#f0a030","#d9702a","#c8512a","#ffd65a"];o(n,h,170,(d,u,f)=>{let p=f>.6&&i()<.5?"#ffd86a":i.pick(r);a(d,u,i.range(22,34)*l,i.range(9,13)*l,i()*D,p,"rgba(120,50,10,0.4)")})}{let n=s*1.5,h=s*1.5;o(n,h,70,(r,d,u)=>{let f=i.range(12,26)*l,p=e.createRadialGradient(r-f*.3,d-f*.4,f*.1,r,d,f);p.addColorStop(0,u>.4?"#ffffff":"#eef2ff"),p.addColorStop(1,u>.4?"#d8e2f6":"#b8c4e8"),e.fillStyle=p,e.beginPath(),e.arc(r,d,f,0,D),e.fill()})}return Ut(t,{repeat:!1})}function Hs(c=128){let[t,e]=Nt(c,c),s=c/2,i=e.createRadialGradient(s,s,0,s,s,s);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.18,"rgba(255,255,255,0.55)"),i.addColorStop(.45,"rgba(255,255,255,0.14)"),i.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=i,e.fillRect(0,0,c,c),Ut(t,{srgb:!1,repeat:!1})}function Cs(c=128){let[t,e]=Nt(c,c),s=c/2,i=Rt(5);for(let a=0;a<22;a++){let o=i()*D,l=i()*c*.18,n=c*i.range(.12,.3),h=s+Math.cos(o)*l,r=s+Math.sin(o)*l,d=e.createRadialGradient(h,r,0,h,r,n);d.addColorStop(0,"rgba(10,6,20,0.55)"),d.addColorStop(1,"rgba(10,6,20,0)"),e.fillStyle=d,e.fillRect(0,0,c,c)}return Ut(t,{srgb:!1,repeat:!1})}function Ps(c=1024,t=512){let[e,s]=Nt(c,t);s.fillStyle="#000",s.fillRect(0,0,c,t);let i=Rt(99);for(let a=0;a<900;a++){let o=i()*c,l=i()*t,n=Math.pow(i(),3),h=.5+n*1.6;s.fillStyle=`rgb(${80+n*175|0},${i()*255|0},0)`,s.beginPath(),s.arc(o,l,h,0,D),s.fill()}return Ut(e,{srgb:!1})}function Fs(c=256){let[t,e]=Nt(c,c),s=Rt(41),i=c/2;for(let a=0;a<46;a++){let o=s()*D,l=Math.pow(s(),.8)*c*.28,n=i+Math.cos(o)*l*1.3,h=i+Math.sin(o)*l*.55+c*.04,r=c*s.range(.08,.2),d=e.createRadialGradient(n,h-r*.3,0,n,h,r),f=Math.max(0,Math.min(1,1-(h-i*.6)/(c*.5)))*255|0;d.addColorStop(0,`rgba(${f},${f},${f},0.5)`),d.addColorStop(1,`rgba(${f},${f},${f},0)`),e.fillStyle=d,e.fillRect(0,0,c,c)}return Ut(t,{srgb:!1,repeat:!1})}function Ds(c=256){let[t,e]=Nt(c,c),s=e.createImageData(c,c),i=Rt(3),a=[8,16,32,64],o=a.map(n=>{let h=new Float32Array(n*n);for(let r=0;r<h.length;r++)h[r]=i();return h}),l=(n,h,r,d)=>{let u=r*h,f=d*h,p=Math.floor(u),g=Math.floor(f),x=u-p,y=f-g,m=x*x*(3-2*x),b=y*y*(3-2*y),v=(H,I)=>n[(I%h+h)%h*h+(H%h+h)%h],T=v(p,g)+(v(p+1,g)-v(p,g))*m,z=v(p,g+1)+(v(p+1,g+1)-v(p,g+1))*m;return T+(z-T)*b};for(let n=0;n<c;n++)for(let h=0;h<c;h++){let r=h/c,d=n/c,u=0,f=.55,p=0;for(let y=0;y<a.length;y++)u+=l(o[y],a[y],r,d)*f,p+=f,f*=.5;u/=p;let g=l(o[1],a[1],r+.37,d+.21),x=(n*c+h)*4;s.data[x]=u*255,s.data[x+1]=g*255,s.data[x+2]=0,s.data[x+3]=255}return e.putImageData(s,0,0),Ut(t,{srgb:!1})}function Is(c=128){let[t,e]=Nt(c,c),s=c/2,i=s/2;e.fillStyle="#ffd0e0",e.beginPath(),e.ellipse(i,i,s*.32,s*.2,.4,0,D),e.fill(),e.fillStyle="#ffeef4",e.beginPath(),e.ellipse(i-s*.06,i-s*.03,s*.16,s*.08,.4,0,D),e.fill(),e.save(),e.translate(s+i,i),e.rotate(.6),e.fillStyle="#f0a43a",e.beginPath(),e.moveTo(0,-s*.36),e.quadraticCurveTo(s*.22,0,0,s*.36),e.quadraticCurveTo(-s*.22,0,0,-s*.36),e.fill(),e.strokeStyle="rgba(120,50,10,0.6)",e.lineWidth=1.2,e.beginPath(),e.moveTo(0,-s*.3),e.lineTo(0,s*.3),e.stroke(),e.restore();let a=e.createRadialGradient(i,s+i,0,i,s+i,s*.3);return a.addColorStop(0,"rgba(255,255,255,1)"),a.addColorStop(.5,"rgba(240,246,255,0.8)"),a.addColorStop(1,"rgba(230,240,255,0)"),e.fillStyle=a,e.fillRect(0,s,s,s),a=e.createRadialGradient(s+i,s+i,0,s+i,s+i,s*.48),a.addColorStop(0,"rgba(255,255,230,1)"),a.addColorStop(.15,"rgba(255,240,160,0.9)"),a.addColorStop(.45,"rgba(255,200,90,0.22)"),a.addColorStop(1,"rgba(255,180,60,0)"),e.fillStyle=a,e.fillRect(s,s,s,s),Ut(t,{repeat:!1})}function Bs(c=128,t=256){let[e,s]=Nt(c,t),i=Rt(17);for(let l=0;l<26;l++){let n=i()*c,h=i.range(3,14),r=s.createLinearGradient(n-h,0,n+h,0),d=i.range(.15,.5);r.addColorStop(0,"rgba(255,255,255,0)"),r.addColorStop(.5,`rgba(255,255,255,${d})`),r.addColorStop(1,"rgba(255,255,255,0)"),s.fillStyle=r,s.fillRect(n-h,0,h*2,t)}s.globalCompositeOperation="destination-in";let a=s.createLinearGradient(0,0,0,t);a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(.25,"rgba(0,0,0,1)"),a.addColorStop(.7,"rgba(0,0,0,0.6)"),a.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=a,s.fillRect(0,0,c,t);let o=s.createLinearGradient(0,0,c,0);return o.addColorStop(0,"rgba(0,0,0,0)"),o.addColorStop(.2,"rgba(0,0,0,1)"),o.addColorStop(.8,"rgba(0,0,0,1)"),o.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=o,s.fillRect(0,0,c,t),s.globalCompositeOperation="source-over",Ut(e,{srgb:!1,repeat:!1})}function Ls(c,t){let[e,s]=Nt(c,c),i=Rt(31),a=c/256;s.fillStyle="#8f8496",s.fillRect(0,0,c,c);let o=["#a093a6","#7b7088","#9a8c94","#b0a2a8","#857a92","#6f6680"];for(let l=0;l<160;l++){let n=i()*c,h=i()*c,r=i.range(6,40)*a,d=r*i.range(.2,.6);s.globalAlpha=i.range(.2,.5),s.fillStyle=i.pick(o),ce(c,c,n,h,r,(u,f)=>{s.beginPath(),s.ellipse(u,f,r,d,0,0,D),s.fill()})}s.globalAlpha=.22,s.strokeStyle="#4e4660";for(let l=0;l<14;l++){let n=i()*c;s.lineWidth=i.range(1,3)*a,s.beginPath();for(let h=0;h<=c;h+=8*a){let r=n+Math.sin(h*.05/a+l)*3*a;h===0?s.moveTo(h,r):s.lineTo(h,r)}s.stroke()}return s.globalAlpha=1,Ut(e,{aniso:t})}import*as Dt from"three";import*as Tt from"three";var Mt=class{constructor(){this.p=[],this.n=[],this.c=[],this.uv=[],this.sw=[],this.idx=[],this.hasSway=!1,this.sway=[0,0,0,0]}get count(){return this.p.length/3}setSway(t,e,s,i){this.sway[0]=t,this.sway[1]=e,this.sway[2]=s,this.sway[3]=i,i>0&&(this.hasSway=!0)}vert(t,e,s,i,a,o,l,n,h,r,d=0,u=0){return this.p.push(t,e,s),this.n.push(i,a,o),this.c.push(l,n,h,r),this.uv.push(d,u),this.sw.push(this.sway[0],this.sway[1],this.sway[2],this.sway[3]),this.count-1}tri(t,e,s){this.idx.push(t,e,s)}quad(t,e,s,i){this.idx.push(t,e,s,t,s,i)}tube(t,e,s,i,{uvScale:a=1,capEnd:o=!0,capStart:l=!1,sway:n=null}={}){let h=t.length,r=new Tt.Vector3,d=new Tt.Vector3,u=new Tt.Vector3,f=new Tt.Vector3,p=this.count,g=0;for(let m=0;m<h;m++){let b=t[Math.max(0,m-1)],v=t[Math.min(h-1,m+1)];r.subVectors(v,b).normalize(),m===0?(f.set(0,1,0),Math.abs(r.dot(f))>.9&&f.set(1,0,0),d.crossVectors(r,f).normalize()):d.sub(f.copy(r).multiplyScalar(d.dot(r))).normalize(),u.crossVectors(r,d).normalize(),m>0&&(g+=t[m].distanceTo(t[m-1])/(Math.PI*2*Math.max(e[m],.05))*a),n&&n(m,m/(h-1));for(let T=0;T<=s;T++){let z=T/s*Math.PI*2,H=Math.cos(z),I=Math.sin(z),W=d.x*H+u.x*I,X=d.y*H+u.y*I,$=d.z*H+u.z*I,U=e[m],w=i(m,m/(h-1),z,W,X,$);this.vert(t[m].x+W*U,t[m].y+X*U,t[m].z+$*U,W,X,$,w[0],w[1],w[2],w[3],T/s,g)}}let x=s+1;for(let m=0;m<h-1;m++)for(let b=0;b<s;b++){let v=p+m*x+b,T=v+x;this.quad(v,T,T+1,v+1)}let y=(m,b)=>{let v=t[m],T=new Tt.Vector3().subVectors(t[b?1:h-1],t[b?0:h-2]).normalize();b&&T.negate();let z=i(m,b?0:1,0,T.x,T.y,T.z),H=this.vert(v.x,v.y,v.z,T.x,T.y,T.z,z[0],z[1],z[2],z[3],.5,g),I=p+m*x;for(let W=0;W<s;W++)b?this.tri(H,I+W+1,I+W):this.tri(H,I+W,I+W+1)};o&&y(h-1,!1),l&&y(0,!0)}box(t,e,s,i,a){let o=[[e,s,i],[e.clone().negate(),s,i.clone().negate()],[i,s,e.clone().negate()],[i.clone().negate(),s,e],[s,i,e],[s.clone().negate(),i.clone().negate(),e]];for(let[l,n,h]of o){let r=l.clone().normalize(),d=a(r),u=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([g,x])=>{let y=t.clone().add(l).addScaledVector(h,g).addScaledVector(n,x);return this.vert(y.x,y.y,y.z,r.x,r.y,r.z,d[0],d[1],d[2],d[3],(g+1)/2,(x+1)/2)}),f=new Tt.Vector3().subVectors(this.at(u[1]),this.at(u[0])),p=new Tt.Vector3().subVectors(this.at(u[2]),this.at(u[0]));f.cross(p).dot(r)>=0?this.quad(u[0],u[1],u[2],u[3]):this.quad(u[0],u[3],u[2],u[1])}}fixWinding(){let t=this.p,e=this.n,s=this.idx;for(let i=0;i<s.length;i+=3){let a=s[i]*3,o=s[i+1]*3,l=s[i+2]*3,n=t[o]-t[a],h=t[o+1]-t[a+1],r=t[o+2]-t[a+2],d=t[l]-t[a],u=t[l+1]-t[a+1],f=t[l+2]-t[a+2],p=h*f-r*u,g=r*d-n*f,x=n*u-h*d;if(p*e[a]+g*e[a+1]+x*e[a+2]<0){let y=s[i+1];s[i+1]=s[i+2],s[i+2]=y}}return this}at(t){return new Tt.Vector3(this.p[t*3],this.p[t*3+1],this.p[t*3+2])}build(){let t=new Tt.BufferGeometry;return t.setAttribute("position",new Tt.Float32BufferAttribute(this.p,3)),t.setAttribute("normal",new Tt.Float32BufferAttribute(this.n,3)),t.setAttribute("color",new Tt.Float32BufferAttribute(this.c,4)),t.setAttribute("uv",new Tt.Float32BufferAttribute(this.uv,2)),this.hasSway&&t.setAttribute("aSway",new Tt.Float32BufferAttribute(this.sw,4)),t.setIndex(this.count>65535?new Tt.Uint32BufferAttribute(this.idx,1):new Tt.Uint16BufferAttribute(this.idx,1)),t.computeBoundingSphere(),t.computeBoundingBox(),t}};var be=7.658461538461538*Math.PI*2;function wt(c){let t=Math.max(c,-2);return 3.05+.95*(1-Math.min(t,52)/52)+1.9*Math.exp(-Math.max(t,0)/2.3)}var fe=[{th:9.35,out:3.4,w:.5,leaves:"blossom"},{th:15.5,out:4.6,w:.56,leaves:"green"},{th:21.3,out:6.2,w:.62,leaves:"green",nest:!0},{th:33,out:4.8,w:.54,leaves:"gold"},{th:39.4,out:3.8,w:.48,leaves:"snow"}],bi=c=>Math.abs(c)>=1?0:.5+.5*Math.cos(Math.PI*c);function ee(c){return 50.4-c/(Math.PI*2)*6.5}function as(c){let t=0;for(let e of fe)t+=e.out*bi((c-e.th)/e.w);return t}function os(c){return wt(ee(c))+.98+as(c)}var oe=[{id:"bahar-1",season:"spring",from:0,to:6,title:"\xC7i\xE7ek Tac\u0131",kicker:"Bahar \xB7 I"},{id:"bahar-2",season:"spring",from:6,to:12,title:"Pembe R\xFCzg\xE2r",kicker:"Bahar \xB7 II"},{id:"yaz-1",season:"summer",from:12,to:18,title:"Z\xFCmr\xFCt G\xF6vde",kicker:"Yaz \xB7 I"},{id:"yaz-2",season:"summer",from:18,to:24,title:"Ku\u015F Yuvas\u0131",kicker:"Yaz \xB7 II"},{id:"guz-1",season:"autumn",from:24,to:30,title:"Alt\u0131n Yapraklar",kicker:"G\xFCz \xB7 I"},{id:"guz-2",season:"autumn",from:30,to:36,title:"F\u0131rt\u0131na",kicker:"G\xFCz \xB7 II"},{id:"kis-1",season:"winter",from:36,to:42,title:"K\u0131ra\u011F\u0131",kicker:"K\u0131\u015F \xB7 I"},{id:"kis-2",season:"winter",from:42,to:be,title:"K\xF6k Kap\u0131s\u0131",kicker:"K\u0131\u015F \xB7 II",finale:!0}];function Re(c,t=[0,0,0,0]){let e=(o,l,n)=>{let h=Math.min(1,Math.max(0,(n-o)/(l-o)));return h*h*(3-2*h)},s=e(37,41,c),i=e(25,29,c)*(1-s),a=e(12.5,16.5,c)*(1-s-i);return t[0]=s,t[1]=i,t[2]=a,t[3]=Math.max(0,1-s-i-a),t}var Ae=.2,He=class{constructor(){let t=[],e=0,s=0,i=0,a=0,o=.002;for(let h=0;h<=be+1e-6;h+=o){let r=os(h),d=Math.cos(h)*r,u=Math.sin(h)*r,f=ee(h);t.length&&(e+=Math.hypot(d-s,f-i,u-a)),t.push(h,e),s=d,i=f,a=u}this.length=e;let l=Math.floor(e/Ae)+1;this.n=l,this.TH=new Float32Array(l),this.X=new Float32Array(l),this.Y=new Float32Array(l),this.Z=new Float32Array(l),this.R=new Float32Array(l);let n=0;for(let h=0;h<l;h++){let r=h*Ae;for(;n<t.length/2-2&&t[(n+1)*2+1]<r;)n++;let d=t[n*2+1],u=t[(n+1)*2+1],f=u>d?(r-d)/(u-d):0,p=t[n*2]+(t[(n+1)*2]-t[n*2])*rt(f,0,1),g=os(p);this.TH[h]=p,this.R[h]=g,this.X[h]=Math.cos(p)*g,this.Z[h]=Math.sin(p)*g,this.Y[h]=ee(p)}this.TX=new Float32Array(l),this.TY=new Float32Array(l),this.TZ=new Float32Array(l),this.SX=new Float32Array(l),this.SZ=new Float32Array(l);for(let h=0;h<l;h++){let r=Math.max(0,h-1),d=Math.min(l-1,h+1),u=this.X[d]-this.X[r],f=this.Y[d]-this.Y[r],p=this.Z[d]-this.Z[r],g=Math.hypot(u,f,p)||1;u/=g,f/=g,p/=g,this.TX[h]=u,this.TY[h]=f,this.TZ[h]=p;let x=-p,y=u,m=Math.hypot(x,y)||1;x/=m,y/=m,x*this.X[h]+y*this.Z[h]<0&&(x=-x,y=-y),this.SX[h]=x,this.SZ[h]=y}}sample(t,e){let s=rt(t/Ae,0,this.n-1.0001),i=Math.floor(s),a=s-i,o=l=>l[i]+(l[i+1]-l[i])*a;return e.x=o(this.X),e.y=o(this.Y),e.z=o(this.Z),e.tx=o(this.TX),e.ty=o(this.TY),e.tz=o(this.TZ),e.sx=o(this.SX),e.sz=o(this.SZ),e.th=o(this.TH),e.r=o(this.R),e}sAtTheta(t){let e=0,s=this.n-1;for(;s-e>1;){let a=e+s>>1;this.TH[a]<t?e=a:s=a}let i=(t-this.TH[e])/Math.max(1e-6,this.TH[s]-this.TH[e]);return(e+rt(i,0,1))*Ae}offTrunk(t){return this.R[t]-wt(this.Y[t])}};function Vs(c){let t=new Mt,e=c.n,s=new Float32Array(e);for(let p=0;p<e;p++){let g=c.offTrunk(p);s[p]=.95+.2*(1-Ht(1.3,2.2,g))}let i=1.9/2,a=1/2.8;for(let p=0;p<e;p++){let g=c.X[p],x=c.Y[p],y=c.Z[p],m=c.SX[p],b=c.SZ[p],v=p*.2,T=g-m*s[p],z=y-b*s[p],H=g+m*i,I=y+b*i,W=c.offTrunk(p),X=1-Ht(1.3,2.2,W),$=.62+.38*(1-X);t.vert(T,x-.02,z,0,1,0,1,1,1,$,v*a,0),t.vert(g-m*.3,x,y-b*.3,0,1,0,1,1,1,.92+.08*(1-X),v*a,.35),t.vert(g+m*.3,x,y+b*.3,0,1,0,1,1,1,1,v*a,.65),t.vert(H,x-.02,I,m*.2,.98,b*.2,1,1,1,1,v*a,1),t.vert(H,x-.02,I,m,0,b,.72,.68,.64,.9,v*a,0),t.vert(H,x-.34,I,m,0,b,.72,.68,.64,.7,v*a,.12),t.vert(H,x-.34,I,0,-1,0,.5,.46,.44,.55,v*a,0),t.vert(T,x-.34,z,0,-1,0,.5,.46,.44,.4,v*a,1),t.vert(T,x-.34,z,-m,0,-b,.72,.68,.64,.7,v*a,.12),t.vert(T,x-.02,z,-m,0,-b,.72,.68,.64,.9,v*a,0)}let o=10;for(let p=0;p<e-1;p++){let g=p*o,x=(p+1)*o,y=(m,b)=>t.quad(g+m,x+m,x+b,g+b);y(0,1),y(1,2),y(2,3),y(4,5),y(6,7),y(8,9)}t.fixWinding();let l=new Mt,n=[],h=1.55,r=[],d=p=>()=>[.42*p,.27*p,.17*p,1];for(let p=.6;p<c.length-.4;p+=h){let g=Math.round(p/.2),y=c.offTrunk(g)>2?[1,-1]:[1];for(let m of y){let b=m>0?i-.1:s[g]-.1,v=c.X[g]+c.SX[g]*b*m,T=c.Z[g]+c.SZ[g]*b*m,z=c.Y[g],H=new Dt.Vector3(v,z-.05,T),I=new Dt.Vector3(v,z+.78,T);l.tube([H,I],[.06,.05],6,d(1),{capEnd:!0}),r.push({s:p,side:m,top:I.clone()})}}for(let p of[1,-1]){let g=r.filter(x=>x.side===p);for(let x=0;x<g.length-1;x++){let y=g[x],m=g[x+1];if(m.s-y.s>h*1.6)continue;let b=[];for(let v=0;v<=1.0001;v+=.25){let T=y.top.clone().lerp(m.top,v);T.y-=.03+Math.sin(v*Math.PI)*.14,b.push(T)}l.tube(b,b.map(()=>.028),4,()=>[.62,.5,.36,1],{capEnd:!1})}}for(let p=1.2;p<c.length-1;p+=2.6){let g=Math.round(p/.2);if(c.offTrunk(g)>1.6)continue;let x=c.Y[g],y=c.TH[g],m=new Dt.Vector3(c.X[g]+c.SX[g]*.55,x-.34+.02,c.Z[g]+c.SZ[g]*.55),b=wt(x-1.5)-.1,v=new Dt.Vector3(Math.cos(y)*b,x-1.55,Math.sin(y)*b);l.tube([m,v],[.075,.09],5,d(.85),{capEnd:!0,capStart:!0})}let u=new Mt,f=7;for(let p of r){if(p.side<0||p.s<f)continue;let g=Math.round(p.s/.2);if(c.offTrunk(g)>1.6)continue;f=p.s+12.5;let x=c.SX[g],y=c.SZ[g],m=p.top.clone().add(new Dt.Vector3(x*.32,.05,y*.32));l.tube([p.top.clone().add(new Dt.Vector3(0,-.02,0)),m],[.022,.022],4,d(.6),{capEnd:!1});let b=m.clone().add(new Dt.Vector3(0,-.28,0)),v=new Dt.Vector3(.09,0,0),T=new Dt.Vector3(0,.13,0),z=new Dt.Vector3(0,0,.09);u.box(b,v,T,z,H=>[1,.82+.18*H.y,.7,1]),l.box(b.clone().add(new Dt.Vector3(0,.16,0)),v.clone().multiplyScalar(1.35),new Dt.Vector3(0,.035,0),z.clone().multiplyScalar(1.35),()=>[.3,.2,.14,1]),l.box(b.clone().add(new Dt.Vector3(0,-.15,0)),v.clone().multiplyScalar(1.15),new Dt.Vector3(0,.02,0),z.clone().multiplyScalar(1.15),()=>[.3,.2,.14,1]),n.push(b)}return{walkway:t.build(),rail:l.build(),glass:u.build(),lanterns:n}}import*as _t from"three";var $s=[4.85,5.72,.48,1.3];function Vt(c,t){let e=wt(t),s=1+.022*Math.sin(7*c+.13*t)+.014*Math.sin(12*c-.31*t+1.3),i=Math.max(t,0),a=0;for(let l of $s){let n=Math.atan2(Math.sin(c-l),Math.cos(c-l));a+=Math.exp(-(n*n)/.045)*1.55}a*=Math.exp(-i/1.9);let o=Math.pow(Math.max(0,Math.cos(5*(c-.45))),2)*.75*Ht(49.5,53.5,t);return e*s+a+o}var ft=(c,t,e)=>new _t.Vector3(c,t,e),xt=(c,t,e)=>ft(Math.cos(t)*c,e,Math.sin(t)*c);function ki(c,t=4){return new _t.CatmullRomCurve3(c,!1,"centripetal").getPoints(Math.max(2,(c.length-1)*t))}function Os(c,t){let e=Rt(1453),s=t,i=s.leafDensity,a=new Mt,o=new Mt,l=[],n=[],h=k=>(M,_)=>{let S=Ht(.35,.08,k*(1-_*.85));return[O(1,.52,S),O(1,.38,S),O(1,.33,S),O(.85,1,_)]},r=(k,M,_,S,P,B,K=7)=>{let j=ki(k,4),Y=j.length,Z=e()*10,dt=j.map((nt,tt)=>{let mt=tt/(Y-1);return O(M,_,Math.pow(mt,.7))*(1+.1*Math.sin(tt*1.9+Z)*(1-mt))*(1+.35*Math.exp(-mt*14))});a.tube(j,dt,K,h(M),{uvScale:.6,sway:(nt,tt)=>a.setSway(S.x,S.y,S.z,O(P,B,Math.pow(tt,1.6)))});for(let nt=0;nt<Y-1;nt+=2){let tt=Math.min(Y-1,nt+2),mt=dt[nt];if(mt<.1)break;l.push({a:j[nt].clone(),b:j[tt].clone(),r:(mt+dt[tt])*.5*.92,anchor:S,wa:O(P,B,Math.pow(nt/(Y-1),1.6)),wb:O(P,B,Math.pow(tt/(Y-1),1.6))})}return a.setSway(0,0,0,0),j},d=(k,M,_,S,P=-1,B=1)=>{n.push({c:k.clone(),r:M,rx:M*1.15,ry:M*.78*B,rz:M*1.15,anchor:_,w:S,type:P})},u=[];for(let k=4.5;k<48.5;k+=e.range(1.55,2.3)){let _=(50.4-k)/6.5*D+Math.PI+e.range(-.55,.55),S=!1;for(let P of fe){let B=Math.abs(ee(P.th)-k),K=Math.abs(Math.atan2(Math.sin(_-P.th),Math.cos(_-P.th)));B<4.5&&K<P.w+.7&&(S=!0)}if(!S&&(u.push({y:k,az:_}),e()<.35)){let P=_+e.range(-.9,.9)+(e()<.5?.9:-.9);u.push({y:k+e.range(-.4,.4),az:P})}}for(let k of u){let{y:M,az:_}=k,S=wt(M),P=M<13,B=(P?e.range(4,6):e.range(4.8,7.4))*(M>40?1.12:1),K=e.range(-.22,.22),j=e.range(.3,.55),Y=e.range(-.35,.35),Z=[xt(S*.55,_,M-.2),xt(S+.7,_+K*.15,M+.15),xt(S+B*.42,_+K*.5,M+B*j*.3+Y),xt(S+B*.75,_+K*.8,M+B*j*.7-Y*.5),xt(S+B,_+K*1.2,M+B*j)],dt=Z[4],nt=B/8,tt=O(.42,.7,(B-4.5)/5),mt=r(Z,tt,.07,dt,0,nt),pe=P?2:e.range(1,3.6)|0;for(let It=0;It<pe;It++){let St=e.range(.45,.85),Pt=mt[Math.round(St*(mt.length-1))],Bt=ft(Math.cos(_+K),0,Math.sin(_+K)),gt=ft(-Bt.z,0,Bt.x).multiplyScalar(e.sign()*e.range(.6,1)),jt=e.range(1.8,3.4),Ot=Pt.clone().addScaledVector(Bt,jt*.55).addScaledVector(gt,jt*.6).add(ft(0,jt*e.range(.25,.6),0)),Zt=Pt.clone().lerp(Ot,.5).add(ft(0,.15,0)),Gt=nt*Math.pow(St,1.6);r([Pt,Zt,Ot],O(tt,.07,St)*.55,.04,dt,Gt,Gt+.25,5),P?e()<.7&&d(Ot.clone().add(ft(0,.12,0)),e.range(.35,.5),dt,Gt+.25,3,.7):d(Ot,e.range(1.05,1.6),dt,Gt+.25)}if(!P)d(dt,e.range(1.5,2.2),dt,nt),d(mt[Math.round(mt.length*.72)],e.range(1.2,1.8),dt,nt*.6);else for(let It of[.4,.62,.84]){let St=mt[Math.round(It*(mt.length-1))];d(St.clone().add(ft(0,.22,0)),e.range(.38,.6),dt,nt*Math.pow(It,1.6),3,.6)}}let f=6;for(let k=0;k<f;k++){let M=.45+k/f*D+e.range(-.18,.18),_=e.range(12.5,16),S=e.range(7,10),P=[xt(.8,M,53-3.5),xt(2.6,M+.05,53+.4),xt(5.4,M+.12,53+S*.45),xt(_*.75,M+.2,53+S*.85),xt(_,M+.26,53+S*.8)],B=P[4],K=r(P,1.3,.14,B,0,.9,9);for(let j=0;j<5;j++){let Y=.32+j*.15,Z=K[Math.round(Y*(K.length-1))],dt=M+e.range(-1.1,1.1),nt=e.range(3.8,6.5),tt=Z.clone().add(ft(Math.cos(dt)*nt,e.range(.6,3.4),Math.sin(dt)*nt)),mt=Z.clone().lerp(tt,.5).add(ft(0,.6,0));r([Z,mt,tt],O(1.3,.14,Y)*.5,.06,B,.9*Y,1.1,6),d(tt,e.range(2.3,3.1),B,1.1),d(mt.clone().add(ft(0,1,0)),e.range(1.8,2.4),B,.9),e()<.6&&d(tt.clone().add(ft(0,-1.6,0)),e.range(1.4,1.9),B,1.1,-1,1.25)}d(B.clone().add(ft(0,.6,0)),e.range(2.6,3.3),B,.9),d(K[Math.round(K.length*.6)].clone().add(ft(0,1.5,0)),e.range(2.4,3),B,.6)}for(let k=0;k<14;k++){let M=e()*D,_=e.range(0,9);d(xt(_,M,53+e.range(8.5,12)-_*.25),e.range(2.6,3.4),xt(_,M,62),.6)}for(let k=0;k<6;k++){let M=e.range(-.8,1.6),_=wt(50.4)+e.range(1.2,4.5);d(xt(_,M,50.4+e.range(3.6,5.5)),e.range(1.5,2.1),xt(_,M,50.4+5),.5)}let p={},g=[];for(let k of fe){let M=Math.acos(rt(2/k.out-1,-1,1))/Math.PI*k.w,_=k.th-M,S=k.th+M,P=c.sAtTheta(_),B=c.sAtTheta(S);c.sample(c.sAtTheta(k.th),p);let K=ft(p.x,p.y,p.z),j=ft(p.sx,0,p.sz),Y=[];for(let gt=P-1.5;gt<=B+1.5;gt+=1.7){c.sample(gt,p);let jt=Math.hypot(p.x,p.z)-wt(p.y);if(jt<1.5||jt>3.6)continue;let Ot=ft(p.x,p.y-.34+.02,p.z),Zt=wt(p.y-2.2)-.15,Gt=Math.atan2(p.z,p.x),Ze=xt(Zt,Gt,p.y-2.4);o.tube([Ot,Ze],[.08,.1],5,()=>[.42,.27,.17,.95],{capEnd:!0,capStart:!0}),Y.push(gt)}let Z={blossom:0,green:1,gold:2,snow:3}[k.leaves],dt=ee(k.th)+6.5*.5,nt=wt(dt),tt=wt(ee(k.th))+k.out+1.6,mt=k.th+e.range(-.12,.12),pe=[xt(nt*.55,mt,dt-.2),xt(nt+.9,mt,dt+.1),xt(O(nt,tt,.55),mt+.06,dt+.75),xt(tt,mt+.12,dt+1.35)],It=pe[3],St=Z===3?.4:.75,Pt=r(pe,.5,.08,It,0,St,7);for(let gt=0;gt<2;gt++){let jt=O(P,B,.32+gt*.36);if(c.sample(jt,p),Math.hypot(p.x,p.z)-wt(p.y)<3)continue;let Zt=Pt[Math.round(O(.55,.9,gt)*(Pt.length-1))];for(let Gt of[-1,1]){let Ze=ft(p.x+p.sx*.85*Gt,p.y+.72,p.z+p.sz*.85*Gt);o.tube([Ze,Zt.clone().add(ft(0,-.15,0))],[.026,.026],4,()=>[.62,.5,.36,1],{capEnd:!1})}}let Bt=k.nest?3:2;for(let gt=0;gt<Bt;gt++){let jt=O(P,B,Bt===2?.3+gt*.4:.2+gt*.3);c.sample(jt,p);let Ot=Pt[Math.round(O(.55,.95,gt/Math.max(1,Bt-1))*(Pt.length-1))],Zt=ft(p.x,Math.max(p.y+3.9,Ot.y+.3),p.z).addScaledVector(ft(p.sx,0,p.sz),e.range(.2,.9)),Gt=Ot.clone().lerp(Zt,.5).add(ft(0,.45,0));r([Ot,Gt,Zt],.16,.05,It,St*.7,St,5),Z===3?d(Zt.clone().add(ft(0,.15,0)),.6,It,St,3,.7):d(Zt.clone().add(ft(0,.35,0)),e.range(1.55,1.95),It,St,Z)}Z!==3&&d(It.clone().add(ft(0,.5,0)),e.range(1.6,2.1),It,St,Z),k.nest&&g.push({c:K.clone(),out:j})}for(let k of $s){let M=wt(0);for(let _ of[-.12,.1]){let S=e.range(6.5,9.5),P=k+_,B=[xt(M*.7,P,1.2),xt(M+1.2,P+_*.6,.35),xt(M+S*.35,P+_*1.3+e.range(-.08,.08),.05),xt(M+S*.6,P+_*1.8+e.range(-.1,.1),-.1),xt(M+S*.82,P+_*2.2,-.05),xt(M+S,P+_*2.5,-.5)];r(B,e.range(.6,.8),.18,B[5],0,0,8)}}a.fixWinding();let x=new Mt,y=s.id>=1?72:52,m=-4,b=53+1.6,v=.42,T=Math.ceil((b-m)/v)+1,z=.01,H=new _t.Vector3,I=new _t.Vector3,W=new _t.Vector3,X=u.map(k=>({y:k.y,az:k.az}));for(let k=0;k<T;k++){let M=Math.min(b,m+k*v);for(let _=0;_<=y;_++){let S=_/y*D,P=Vt(S,M),B=(Vt(S+z,M)-Vt(S-z,M))/(2*z),K=(Vt(S,M+z)-Vt(S,M-z))/(2*z),j=Math.cos(S),Y=Math.sin(S);I.set(B*j-P*Y,0,B*Y+P*j),W.set(K*j,1,K*Y),H.crossVectors(W,I).normalize();let Z=1,dt=(S%D+D)%D;for(let St=dt;;St+=D){let Pt=ee(St);if(Pt<-1)break;let Bt=1-Ht(.5,1.3,as(St));if(Bt<=0)continue;let gt=Pt-M;gt>0&&gt<4?Z*=1-Bt*(.42*Math.exp(-((gt-.5)**2)/.35)+.18*Math.exp(-((gt-1.6)**2)/1.6)):gt<=0&&gt>-.6&&(Z*=1-Bt*.22*Math.exp(-(gt*gt)/.03))}Z*=.5+.5*Ht(-.6,2.2,M);for(let St of X){let Pt=M-St.y;if(Math.abs(Pt)>1.6)continue;let Bt=Math.atan2(Math.sin(S-St.az),Math.cos(S-St.az));Z*=1-.3*Math.exp(-(Bt*Bt)/.05-Pt*Pt/.6)*(Pt<0?1.2:.6)}let nt=1-Ht(-.5,2.5,M),tt=Ht(44,52,M),mt=O(1,.72,nt)*O(1,1.02,tt),pe=O(1,.66,nt)*O(1,.99,tt),It=O(1,.62,nt)*O(1,.96,tt);x.vert(j*P,M,Y*P,H.x,H.y,H.z,mt,pe,It,rt(Z,.2,1),_/y*4,M/5.6)}}let $=y+1;for(let k=0;k<T-1;k++)for(let M=0;M<y;M++){let _=k*$+M;x.quad(_,_+1,_+$+1,_+$)}let U=x.vert(0,b+.3,0,0,1,0,.9,.88,.85,.7,0,0);for(let k=0;k<y;k++)x.tri(U,(T-1)*$+k+1,(T-1)*$+k);x.fixWinding();for(let k=n.length-1;k>=0;k--){let M=n[k];for(let _=0;_<c.n;_+=2){let S=M.c.y-c.Y[_];if(S<-6||S>8)continue;let B=Math.hypot(M.c.x-c.X[_],M.c.z-c.Z[_])-1.2;if(B>M.rx||S-M.ry>2.2||S+M.ry<-.6)continue;let K=S>.8?S-2.2:-.6-S,Y=Math.max(B,K)/M.rx;if(Y<.45){M.r=0;break}M.r*=Y,M.rx*=Y,M.ry*=Y,M.rz*=Y}M.r<.3&&n.splice(k,1)}let w=[],E=[],R=[],A=[],C=[],L=[0,0,0,0],V=[];for(let k of n){Re(k.c.y,L);let M=k.type,_=Math.max(5,Math.round(i*rt(k.r*k.r*(M===3?7:5.2),6,30)));for(let S=0;S<_;S++){let P=M;if(P<0){let mt=e();for(P=0;P<3&&mt>L[P];)mt-=L[P],P++;P===3&&(P=L[2]>.05?2:1)}let B=e()*D,K=Math.acos(e.range(-.85,1)),j=Math.pow(e(),.35),Y=Math.sin(K)*Math.cos(B)*k.rx*j*.82,Z=Math.cos(K)*k.ry*j*.82,dt=Math.sin(K)*Math.sin(B)*k.rz*j*.82;w.push(k.c.x+Y,k.c.y+Z,k.c.z+dt),E.push(k.c.x,k.c.y,k.c.z,k.r);let nt=k.r*(P===3?e.range(.9,1.25):e.range(.85,1.2));R.push(nt,e()*D,P,e());let tt=e.range(.86,1.1);P===0?A.push(tt*e.range(.97,1.04),tt,tt*e.range(.95,1.05)):P===1?A.push(tt*e.range(.9,1.05),tt,tt*e.range(.85,1)):P===2?A.push(tt*e.range(.98,1.06),tt*e.range(.85,1.05),tt*e.range(.8,1)):A.push(tt,tt,tt),C.push(k.anchor.x,k.anchor.y,k.anchor.z,k.w)}V.push({c:k.c,rx:k.rx*.78,ry:k.ry*.78,rz:k.rz*.78,anchor:k.anchor,w:k.w,snow:M===3})}let G=new _t.InstancedBufferGeometry,q=new _t.PlaneGeometry(1,1);G.setIndex(q.index),G.setAttribute("position",q.getAttribute("position")),G.setAttribute("iPos",new _t.InstancedBufferAttribute(new Float32Array(w),3)),G.setAttribute("iCluster",new _t.InstancedBufferAttribute(new Float32Array(E),4)),G.setAttribute("iData",new _t.InstancedBufferAttribute(new Float32Array(R),4)),G.setAttribute("iTint",new _t.InstancedBufferAttribute(new Float32Array(A),3)),G.setAttribute("iSway",new _t.InstancedBufferAttribute(new Float32Array(C),4)),G.instanceCount=w.length/3,G.boundingSphere=new _t.Sphere(ft(0,30,0),60);let N=o;for(let k of g){for(let M=0;M<9;M++){let _=[],S=1.55+e.range(-.15,.25),P=k.c.y-.42+M*.07,B=e()*D;for(let K=0;K<=26;K++){let j=B+K/26*D*1.05,Y=e.range(-.08,.08);_.push(ft(k.c.x+Math.cos(j)*(S+Y),P+Math.sin(j*3+M)*.08,k.c.z+Math.sin(j)*(S+Y)))}N.tube(_,_.map(()=>e.range(.06,.12)),4,()=>{let K=e.range(.8,1.1);return[.86*K,.64*K,.42*K,.95]},{capEnd:!1})}for(let M=0;M<3;M++){let _=Math.atan2(k.out.z,k.out.x)+Math.PI*.5+(M-1)*.35,S=ft(k.c.x+Math.cos(_)*1.15,k.c.y-.1,k.c.z+Math.sin(_)*1.15),P=new _t.SphereGeometry(.2,12,8),B=P.getAttribute("position"),K=P.getAttribute("normal"),j=N.count;for(let Z=0;Z<B.count;Z++){let dt=B.getY(Z)*1.3,nt=Math.sin(B.getX(Z)*80)*Math.sin(B.getZ(Z)*70)>.6?.75:1;N.vert(S.x+B.getX(Z),S.y+dt,S.z+B.getZ(Z),K.getX(Z),K.getY(Z),K.getZ(Z),.62*nt,.82*nt,.92*nt,1,0,0)}let Y=P.index.array;for(let Z=0;Z<Y.length;Z+=3)N.tri(j+Y[Z],j+Y[Z+1],j+Y[Z+2])}}return N.fixWinding(),{trunk:x.build(),branches:a.build(),nest:N.count?N.build():null,leaves:G,caps:l,ellipsoids:V}}import*as me from"three";var ie=19.5;function se(c,t){let e=Math.hypot(c,t),s=Math.atan2(t,c),i=Wt(s*3.1+11)*.22+Wt(e*.35+s*2)*.18,a=-.0016*e*e,o=-Math.pow(Ht(ie-3.2,ie,e),2)*1.1;return a+i*Ht(5,9,e)+o}var yt=(c,t,e)=>new me.Vector3(c,t,e);function Gs(c){let t=Rt(77),e=new Mt,s=new Mt,i=new Mt,a={spheres:[],caps:[]},o=120,l=34,n=2.6;for(let w=0;w<=l;w++){let E=O(n,ie,Math.pow(w/l,.9));for(let R=0;R<=o;R++){let A=R/o*D,C=Math.cos(A)*E,L=Math.sin(A)*E,V=se(C,L),G=.15,q=(se(C+G,L)-se(C-G,L))/(2*G),N=(se(C,L+G)-se(C,L-G))/(2*G),k=yt(-q,1,-N).normalize(),M=.93+Wt(A*9+E*.7)*.04,S=1-.45*(1-Ht(0,2.6,E-Vt(A,0)));e.vert(C,V,L,k.x,k.y,k.z,M,M*1,M*1.04,S,C*.08,L*.08)}}let h=o+1;for(let w=0;w<l;w++)for(let E=0;E<o;E++){let R=w*h+E;e.quad(R,R+h,R+h+1,R+1)}e.fixWinding();let r=27,d=30,u=(w,E)=>{let R=Math.pow(1-w,1.25),A=1+.13*Wt(E*4.2+w*3)+.07*Wt(E*11+w*9);return(ie+.3)*R*A*(w<.04?1+(.04-w)*2:1)};for(let w=0;w<=d;w++){let E=w/d,R=-.75-E*r+(E<.05?E*6:0);for(let A=0;A<=o;A++){let C=A/o*D,L=Math.max(.15,u(E,C)),V=.02,G=(u(Math.min(1,E+V),C)-u(Math.max(0,E-V),C))/(2*V*r),q=yt(Math.cos(C),-G,Math.sin(C)).normalize(),N=.5+.5*Math.sin(R*1.7+Wt(C*3)*2),k=O(.82,.62,E)*O(.9,1.05,N),M=O(.7,.58,E)*O(.9,1.04,N),_=O(.62,.68,E)*O(.92,1.03,N);s.vert(Math.cos(C)*L,R,Math.sin(C)*L,q.x,q.y,q.z,k,M,_,O(.85,.5,E),A/o*8,R*.12)}}for(let w=0;w<d;w++)for(let E=0;E<o;E++){let R=w*h+E;s.quad(R,R+1,R+h+1,R+h)}let f=s.count;for(let w=0;w<=3;w++){let E=w/3*Math.PI*.5;for(let R=0;R<=o;R++){let A=R/o*D,C=ie,L=Math.cos(A)*C,V=Math.sin(A)*C,G=se(L*.999,V*.999),q=C+Math.sin(E)*.45,N=O(G,-.8,1-Math.cos(E)),k=yt(Math.cos(A)*Math.sin(E),Math.cos(E),Math.sin(A)*Math.sin(E)).normalize();s.vert(Math.cos(A)*q,N,Math.sin(A)*q,k.x,k.y,k.z,.95,.96,1,.95,0,0)}}for(let w=0;w<3;w++)for(let E=0;E<o;E++){let R=f+w*h+E;s.quad(R,R+1,R+h+1,R+h)}s.fixWinding();for(let w=0;w<16;w++){let E=t()*D,R=t.range(.2,.7),A=u(R,E)*.96,C=-.75-R*r,L=t.range(6,16),V=[],G=Math.cos(E)*A,q=Math.sin(E)*A;for(let N=0;N<=6;N++){let k=N/6;V.push(yt(G,C-k*L,q)),G+=Math.cos(E)*t.range(-.2,.6)+t.range(-.4,.4),q+=Math.sin(E)*t.range(-.2,.6)+t.range(-.4,.4)}s.tube(V,V.map((N,k)=>O(.42,.05,k/6)),5,()=>[.5,.38,.32,.8])}for(let w=0;w<70;w++){let E=t()*D,R=ie+.15,A=t.range(.5,2.2),C=yt(Math.cos(E)*R,-.9,Math.sin(E)*R),L=C.clone().add(yt(0,-A,0));s.tube([C,L],[t.range(.08,.16),.01],5,()=>[.78,.9,1.05,1])}let p=(w,E,R=.65)=>{let A=new me.IcosahedronGeometry(1,2),C=A.getAttribute("position"),L=i.count,V=t()*100;for(let q=0;q<C.count;q++){let N=yt(C.getX(q),C.getY(q),C.getZ(q)),k=1+.18*Wt(N.x*3+V)+.12*Wt(N.z*4+N.y*2+V);N.multiplyScalar(k),N.y*=R;let M=N.clone().normalize(),_=Ht(.35,.7,M.y),S=N.multiplyScalar(E).add(w);i.vert(S.x,S.y,S.z,M.x,M.y,M.z,O(.58,.95,_),O(.55,.96,_),O(.62,1.02,_),O(.75,1,M.y*.5+.5),0,0)}let G=A.index?A.index.array:null;if(G)for(let q=0;q<G.length;q+=3)i.tri(L+G[q],L+G[q+1],L+G[q+2]);else for(let q=0;q<C.count;q+=3)i.tri(L+q,L+q+1,L+q+2);a.spheres.push({c:w.clone().add(yt(0,E*R*.1,0)),r:E*.85,sy:R})},g=(w,E)=>{i.tube([w.clone().add(yt(0,-.3,0)),w.clone().add(yt(0,E*.35,0))],[.16*E*.3,.1*E*.3],6,()=>[.4,.3,.24,.8]);for(let R=0;R<4;R++){let A=w.y+E*(.2+R*.2),C=E*(.42-R*.085),L=new me.ConeGeometry(C,E*.36,9,1,!0),V=L.getAttribute("position"),G=i.count;for(let N=0;N<V.count;N++){let k=yt(V.getX(N),V.getY(N)+A+E*.18,V.getZ(N)).add(yt(w.x,0,w.z)),_=yt(V.getX(N),.55*C,V.getZ(N)).normalize(),S=V.getY(N)>0?.6:.15;i.vert(k.x,k.y,k.z,_.x,_.y,_.z,O(.16,.9,S),O(.32,.92,S),O(.24,.98,S),.9,0,0)}let q=L.index.array;for(let N=0;N<q.length;N+=3)i.tri(G+q[N],G+q[N+1],G+q[N+2])}a.caps.push({a:w.clone(),b:w.clone().add(yt(0,E,0)),r:E*.22})},x=(w,E,R)=>{let A=yt(Math.cos(R)*.32,0,Math.sin(R)*.32),C=yt(-Math.sin(R)*.22,0,Math.cos(R)*.22);i.box(w.clone().add(yt(0,E*.5-.2,0)),A,yt(0,E*.5,0),C,L=>L.y>.5?[.95,.96,1,1]:[.62,.6,.66,.9]),a.caps.push({a:w.clone(),b:w.clone().add(yt(0,E,0)),r:.3})},y=(w,E)=>{let R=Math.cos(w)*E,A=Math.sin(w)*E;return yt(R,se(R,A),A)},m=[[2.3,8.5,"rock",1.1],[3,9.6,"pine",2.6],[3.7,8.2,"stone",1.7],[4.6,9.5,"rock",.9],[1.5,9.9,"pine",3.1],[.6,11.5,"rock",1.6],[5.5,11,"pine",3.4],[6,13.5,"rock",1.3],[2.6,14.5,"pine",3.8],[4,15.5,"pine",2.9],[1,16,"stone",2],[5.1,16.4,"rock",2.2],[3.3,12.4,"stone",1.4]];for(let[w,E,R,A]of m){let C=y(w,E);R==="rock"?p(C,A):R==="pine"?g(C,A):x(C,A,w)}for(let w=0;w<16;w++){let E=t()*D,R=t.range(12,ie-1.5);p(y(E,R),t.range(.35,.9))}let b=new Mt;{let w=y(.2,13.2),E=40,R=b.vert(w.x,w.y+.03,w.z,0,1,0,.55,.72,.9,1,.5,.5);for(let A=0;A<=E;A++){let C=A/E*D,L=2.6+.4*Wt(C*3+2);b.vert(w.x+Math.cos(C)*L*1.3,w.y+.03,w.z+Math.sin(C)*L,0,1,0,.66,.82,.98,1,0,0)}for(let A=0;A<E;A++)b.tri(R,R+1+A,R+2+A);b.fixWinding()}i.fixWinding();let v=new Mt,T=new Mt,z=c,H=Vt(z,1.2),I=yt(Math.cos(z)*(H+.04),0,Math.sin(z)*(H+.04)),W=yt(Math.cos(z),0,Math.sin(z)),X=yt(-Math.sin(z),0,Math.cos(z)),$=1.25,U=2.5;{let E=v.vert(I.x+W.x*.02,I.y+U*.45,I.z+W.z*.02,W.x,0,W.z,1,1,1,1,.5,.45),R=[];for(let A=0;A<=24;A++){let C=A/24,L,V;if(C<.25)L=-$,V=C/.25*(U-$);else if(C<.75){let G=Math.PI-(C-.25)/.5*Math.PI;L=Math.cos(G)*$,V=U-$+Math.sin(G)*$}else L=$,V=(1-(C-.75)/.25)*(U-$);R.push([L,V])}for(let[A,C]of R){let L=z+A/H,V=Vt(L,C)+.03;v.vert(Math.cos(L)*V,C,Math.sin(L)*V,W.x,0,W.z,1,1,1,1,A/(2*$)+.5,C/U)}for(let A=0;A<24;A++)v.tri(E,E+1+A,E+2+A);v.fixWinding();for(let A of[-1,1]){let C=[];for(let L=0;L<=8;L++){let V=L/8,G=Math.PI*(A<0?1-V*.55:V*.55),q=Math.cos(G)*($+.18),N=V<.01?-.3:U-$+Math.sin(G)*($+.2)*Math.min(1,V*3),k=z+q/H,M=Vt(k,Math.max(N,0))+.18;C.push(yt(Math.cos(k)*M,Math.max(N,-.3)+0,Math.sin(k)*M))}T.tube(C,C.map((L,V)=>O(.32,.14,V/8)),7,()=>[.55,.42,.34,.85])}T.fixWinding()}return{top:e.build(),rock:s.build(),props:i.build(),pond:b.build(),gate:v.build(),gateFrame:T.build(),gatePos:I.clone().add(yt(0,U*.45,0)),gateOut:W,gateSide:X,occ:a}}import*as it from"three";var Fe=(c,t,e)=>new it.Vector3(c,t,e);function Ns(c,t,e){let s=new it.Group,i=new it.Mesh(new it.SphereGeometry(500,32,16),null);i.frustumCulled=!1,i.renderOrder=10;let a=new it.ShaderMaterial({vertexShader:`
			varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${vt}
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
			}`,uniforms:{...c,uNoise:{value:t.cloudNoise}}}),o=new it.Mesh(new it.PlaneGeometry(1800,1800,1,1).rotateX(-Math.PI/2),a);o.position.y=-48,o.frustumCulled=!1,o.renderOrder=5;let l=Rt(2024),n=e.clouds,h=[],r=[],d=[];for(let m=0;m<n;m++){let b=m/n*D+l.range(-.3,.3),v=l.range(95,240);d.push({x:Math.cos(b)*v,y:l.range(-34,26),z:Math.sin(b)*v,s:l.range(30,72),k:l()})}d.sort((m,b)=>Math.hypot(b.x,b.z)-Math.hypot(m.x,m.z));for(let m of d)h.push(m.x,m.y,m.z),r.push(m.s,m.s*l.range(.45,.62),m.k,l()*D);let u=new it.InstancedBufferGeometry,f=new it.PlaneGeometry(1,1);u.setIndex(f.index),u.setAttribute("position",f.getAttribute("position")),u.setAttribute("iPos",new it.InstancedBufferAttribute(new Float32Array(h),3)),u.setAttribute("iData",new it.InstancedBufferAttribute(new Float32Array(r),4)),u.instanceCount=d.length;let p=new it.ShaderMaterial({vertexShader:`
			${et}
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
			${et}
			${vt}
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
			}`,uniforms:{...c,uMap:{value:t.cloud}},transparent:!0,depthWrite:!1,blending:it.CustomBlending,blendSrc:it.OneFactor,blendDst:it.OneMinusSrcAlphaFactor}),g=new it.Mesh(u,p);g.frustumCulled=!1,g.renderOrder=20;let x=new Mt,y=[[1,.72,.82],[.42,.66,.3],[.95,.66,.24],[.92,.94,1],[.98,.78,.86],[.5,.7,.34],[.9,.55,.22]];for(let m=0;m<7;m++){let b=m/7*D+.5+l.range(-.2,.2),v=l.range(115,210),T=Fe(Math.cos(b)*v,l.range(-22,18),Math.sin(b)*v),z=l.range(5,11),H=y[m],I=18,W=x.count;for(let $=0;$<=4;$++){let U=$/4,w=z*Math.pow(1-U,1.3)+.2;for(let E=0;E<=I;E++){let R=E/I*D,A=1+.15*Wt(R*3+m*7+U*2);x.vert(T.x+Math.cos(R)*w*A,T.y-U*z*1.6,T.z+Math.sin(R)*w*A,Math.cos(R),-.3,Math.sin(R),.6,.52,.58,.8,0,0)}}for(let $=0;$<4;$++)for(let U=0;U<I;U++){let w=W+$*(I+1)+U;x.quad(w,w+1,w+I+2,w+I+1)}let X=x.vert(T.x,T.y+.3,T.z,0,1,0,H[0]*.9,H[1]*.9,H[2]*.9,1,0,0);for(let $=0;$<=I;$++){let U=$/I*D,w=1+.15*Wt(U*3+m*7);x.vert(T.x+Math.cos(U)*(z+.2)*w,T.y,T.z+Math.sin(U)*(z+.2)*w,0,1,0,H[0]*.85,H[1]*.85,H[2]*.85,1,0,0)}for(let $=0;$<I;$++)x.tri(X,X+1+$,X+2+$);for(let $=0;$<4;$++){let U=l()*D,w=l.range(0,z*.7),E=Fe(T.x+Math.cos(U)*w,T.y,T.z+Math.sin(U)*w),R=l.range(1.6,3.4);x.tube([E,E.clone().add(Fe(0,R,0))],[.18,.1],5,()=>[.85,.82,.8,1]);let C=new it.IcosahedronGeometry(R*.55,1).getAttribute("position"),L=x.count;for(let V=0;V<C.count;V++){let G=Fe(C.getX(V),C.getY(V),C.getZ(V)).normalize();x.vert(E.x+C.getX(V),E.y+R+C.getY(V)*.8,E.z+C.getZ(V),G.x,G.y,G.z,H[0],H[1],H[2],1,0,0)}for(let V=0;V<C.count;V+=3)x.tri(L+V,L+V+1,L+V+2)}}return x.fixWinding(),s.add(o,g),{group:s,dome:i,farGeo:x.build()}}function Us(c,t){let e=new it.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{uSunDir:t.uSunDir,uSunGlow:t.uSunGlow,uMap:{value:c},uSize:{value:80},uK:{value:1}},transparent:!0,depthWrite:!1,blending:it.AdditiveBlending}),s=new it.Mesh(new it.PlaneGeometry(1,1),e);return s.frustumCulled=!1,s.renderOrder=30,s}import*as ne from"three";var ns=[{speed:1.55,wind:.22,elev:[40,34],sunStart:Math.PI*.55,burn:.7,drops:[[.42,-.2],[.78,.3]],hints:["drag","hide"]},{speed:1.6,wind:.28,elev:[34,30],sunStart:Math.PI,burn:.9,drops:[[.22,.4],[.5,0],[.58,.45],[.86,-.3]],gust:{every:11,dur:2.2,power:.5,from:6},crystals:[[.8,1,4.6,3.2]],locks:[.45],hints:["bridge","crystal"]},{speed:1.65,wind:.25,elev:[62,56],sunStart:Math.PI,burn:1,drops:[[.18,.5],[.47,.2],[.53,.5],[.74,-.4],[.92,.35]],crystals:[[.3,1,4.8,3.3],[.72,-1,4.4,3]],locks:[.6],hints:["ledge"]},{speed:1.65,wind:.3,elev:[56,48],sunStart:Math.PI,burn:1.05,drops:[[.2,-.3],[.5,.3],[.56,-.2],[.62,.45],[.88,.3]],gust:{every:9,dur:2.4,power:.75,from:5},crystals:[[.25,-1,4.6,3.2],[.78,1,5,3.4]],locks:[.38],hints:["wait"]},{speed:1.7,wind:.3,elev:[30,24],sunStart:Math.PI,burn:1.1,drops:[[.16,.4],[.36,-.3],[.55,.5],[.72,.1],[.9,-.4]],gust:{every:7.5,dur:2.8,power:1.15,from:3},crystals:[[.35,1,4.6,3.2],[.68,-1,4.8,3.2]],locks:[.5],hints:["gust"]},{speed:1.72,wind:.38,elev:[24,18],sunStart:Math.PI,burn:1.15,drops:[[.16,.3],[.26,-.2],[.45,.5],[.58,-.2],[.64,.4],[.97,.3]],gust:{every:6,dur:3,power:1.55,from:2.5},crystals:[[.22,1,4.6,3],[.55,-1,5,3.3],[.85,1,4.4,3.2]],locks:[.32,.72]},{speed:1.75,wind:.18,elev:[16,11],sunStart:Math.PI,burn:1.2,drops:[[.2,.45],[.4,-.2],[.55,.5],[.7,.2],[.9,.45]],gust:{every:10,dur:2.2,power:.6,from:5},crystals:[[.3,-1,4.6,3],[.6,1,4.8,3.2],[.88,-1,4.4,3]],locks:[.45,.8]},{speed:1.7,wind:.15,elev:[10,4],sunStart:Math.PI,burn:1.2,drops:[[.15,.4],[.35,-.3],[.52,.5],[.76,0],[.88,.45]],crystals:[[.28,1,4.6,3],[.62,-1,4.8,3]],locks:[.5],hints:["gate"],finale:!0}];function rs(c){return{...oe[c],...ns[c],index:c}}var ke=oe.length;function qs(c,t){if(!c||t<c.from)return 0;let e=(t-c.from)%c.every;if(e>c.dur)return 0;let s=Math.sin(e/c.dur*Math.PI);return c.power*s*s}function ls(c,t){if(!c)return 1/0;if(t<c.from)return c.from-t;let e=(t-c.from)%c.every;return e>c.dur?c.every-e:0}function De(c,t){let e=oe[t],s=c.sAtTheta(e.from)+(t===0?1.2:.5),i=c.sAtTheta(e.to)-(e.finale?.4:.5);return[s,i]}var Ft=(c=0,t=0,e=0)=>new ne.Vector3(c,t,e),wi={spring:[1,.86,.94],summer:[1,.86,.55],autumn:[1,.72,.4],winter:[.78,.92,1.08]};function Ks(c,t){let e=[],s=new Mt,i=new Mt,a={};return t.forEach((o,l)=>{let n=ns[l];if(!n.crystals)return;let[h,r]=De(c,l);for(let[d,u,f,p]of n.crystals){let g=h+(r-h)*d;c.sample(g,a);let x=Ft(a.x,a.y+.45,a.z),y=Math.atan2(a.z,a.x),m=a.y+p,b=y+u*1.15,v;for(let _=0;_<8;_++){let S=wt(m)+f;v=Ft(Math.cos(b)*S,m,Math.sin(b)*S);let P=Ft().subVectors(x,v),B=-(v.x*P.x+v.z*P.z)/(P.x*P.x+P.z*P.z);if((B>0&&B<1?Math.hypot(v.x+P.x*B,v.z+P.z*B):99)>wt(m)+.5)break;b+=u*.1}let T=O(n.elev[0],n.elev[1],d),z=xe(y+Math.PI,T,Ft()),H=Ft().subVectors(x,v).normalize(),I=Ft().addVectors(z,H).normalize(),W=wi[o.season],X=wt(m-.4),$=Ft(Math.cos(b-u*.12)*X*.75,m-.7,Math.sin(b-u*.12)*X*.75),U=Ft(Math.cos(b-u*.08)*(X+1.2),m-.55,Math.sin(b-u*.08)*(X+1.2)),w=Ft(Math.cos(b-u*.02)*(X+f*.62),m-.85,Math.sin(b-u*.02)*(X+f*.62)),E=v.clone().addScaledVector(I,-.36),A=new ne.CatmullRomCurve3([$,U,w,E]).getPoints(14);i.setSway(v.x,v.y,v.z,0),i.tube(A,A.map((_,S)=>O(.2,.05,Math.pow(S/14,.7))),6,(_,S)=>[O(1,.55,S),O(1,.42,S),O(1,.36,S),.9],{sway:(_,S)=>i.setSway(v.x,v.y,v.z,.45*Math.pow(S,1.6))});let C=Math.abs(I.y)>.9?Ft(1,0,0):Ft(0,1,0),L=Ft().crossVectors(I,C).normalize(),V=Ft().crossVectors(I,L).normalize(),G=[];for(let _=0;_<6;_++){let S=_/6*Math.PI*2+.26;G.push(v.clone().addScaledVector(L,Math.cos(S)*.4).addScaledVector(V,Math.sin(S)*.62))}let q=v.clone().addScaledVector(I,.16),N=v.clone().addScaledVector(I,-.2),k=e.length;s.setSway(v.x,v.y,v.z,.45);let M=(_,S,P)=>{let B=Ft().crossVectors(Ft().subVectors(S,_),Ft().subVectors(P,_)).normalize();for(let K of[_,S,P])s.vert(K.x,K.y,K.z,B.x,B.y,B.z,W[0],W[1],W[2],k,0,0);s.tri(s.count-3,s.count-2,s.count-1)};for(let _=0;_<6;_++){let S=G[_],P=G[(_+1)%6];M(q,S,P),M(N,P,S)}e.push({c:v,n:I,target:x,level:l,anchor:v.clone(),w:.45,tint:W,season:o.season})}}),s.fixWinding(),i.fixWinding(),{list:e,gemGeo:s.count?s.build():null,twigGeo:i.count?i.build():null}}function Xs(c,t){return new ne.ShaderMaterial({vertexShader:`
			${et}
			attribute vec4 color;
			attribute vec4 aSway;
			varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying float vIdx;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				w.xyz += windSway(aSway.xyz, aSway.w);
				vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vTint = color.rgb; vIdx = color.a;
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:`
			${et}
			${Ct}
			${vt}
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
			}`,uniforms:{...c,uLit:{value:new Array(Math.max(1,t)).fill(0)}},side:ne.DoubleSide})}import*as J from"three";var Ys=c=>{let t=new J.InstancedBufferGeometry,e=new J.PlaneGeometry(1,1);return t.setIndex(e.index),t.setAttribute("position",e.getAttribute("position")),t.instanceCount=c,t};function js(c,t,e){let s=Rt(808),i=Ys(e),a=new Float32Array(e*4);for(let h=0;h<a.length;h++)a[h]=s();i.setAttribute("iSeed",new J.InstancedBufferAttribute(a,4));let o={...c,uMap:{value:t},uCenter:{value:new J.Vector3},uSeason:{value:new J.Vector4(1,0,0,0)},uFire:{value:0},uCount:{value:1}},l=new J.ShaderMaterial({vertexShader:`
			${et}
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
			${et}
			${vt}
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
			}`,uniforms:o,transparent:!0,depthWrite:!1,blending:J.CustomBlending,blendSrc:J.OneFactor,blendDst:J.OneMinusSrcAlphaFactor}),n=new J.Mesh(i,l);return n.frustumCulled=!1,n.renderOrder=22,{mesh:n,u:o}}function Zs(c,t,e){let s=Rt(55),i=Ys(e),a=new Float32Array(e*4);for(let h=0;h<e;h++){let r=s()*D,d=s.range(2.5,7.5);a.set([Math.cos(r)*d,s.range(-1,5),Math.sin(r)*d,s()],h*4)}i.setAttribute("iOff",new J.InstancedBufferAttribute(a,4));let o={...c,uMap:{value:t},uCenter:{value:new J.Vector3},uK:{value:1}},l=new J.ShaderMaterial({vertexShader:`
			${et}
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
			${et}
			uniform sampler2D uMap; uniform float uK;
			varying vec2 vUv; varying float vA;
			void main() {
				float t = texture2D(uMap, vUv).a;
				vec3 c = uFogSun * t * vA * uK * 0.22;
				gl_FragColor = vec4(c, 1.0);
			}`,uniforms:o,transparent:!0,depthWrite:!1,blending:J.AdditiveBlending,side:J.DoubleSide}),n=new J.Mesh(i,l);return n.frustumCulled=!1,n.renderOrder=24,{mesh:n,u:o}}function Qs(c,t){let e=Rt(4242),s=new J.BufferGeometry,i=new Float32Array([0,0,.35,-.08,0,-.2,.08,0,-.2,0,0,.12,-1,0,-.1,0,0,-.18,0,0,.12,1,0,-.1,0,0,-.18]);s.setAttribute("position",new J.BufferAttribute(i,3));let a=new J.InstancedBufferGeometry;a.setAttribute("position",s.getAttribute("position"));let o=new Float32Array(t*4);for(let r=0;r<t;r++){let d=r%2;o.set([e.range(0,D)*.15+d*Math.PI,e.range(-1.5,1.5),e.range(-1.5,1.5),e()],r*4)}a.setAttribute("iBird",new J.InstancedBufferAttribute(o,4)),a.instanceCount=t;let l={...c,uCenterY:{value:30}},n=new J.ShaderMaterial({vertexShader:`
			${et}
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
			${et}
			${vt}
			varying vec3 vW;
			void main() {
				vec3 c = vec3(0.05, 0.04, 0.08) + uSkyHor * 0.08;
				float d = length(vW - cameraPosition);
				float f = 1.0 - exp(-d * uFogP.x * 1.3);
				gl_FragColor = finish(mix(c, uFogCol, f), 1.0);
			}`,uniforms:l,side:J.DoubleSide}),h=new J.Mesh(a,n);return h.frustumCulled=!1,{mesh:h,u:l}}function Js({G:c,tier:t,shadow:e,aniso:s,msaa:i}){let a=t.id>=1,o={bark:Ss(a?1024:512,s),plank:Rs(512,256,s),leaves:As(t.id>=2?1024:512),glow:Hs(128),ink:Cs(128),stars:Ps(1024,512),cloud:Fs(256),cloudNoise:Ds(256),particles:Is(128),shaft:Bs(128,256),rock:Ls(256,s)},l=new Et.Scene;l.matrixWorldAutoUpdate=!0;let n=new He,h=Os(n,t),r=Vs(n),d=(be+.3)%(Math.PI*2),u=Gs(d),f=Ns(c,o,t),p=(U,w,E=0,R=null)=>{let A=new Et.Mesh(U,w);return A.matrixAutoUpdate=!1,A.frustumCulled=!!U.boundingSphere,A.renderOrder=E,l.add(A),R&&e.add(U,R),A},g=ss(),x=ss({wind:!0}),y=12.5,m={trunk:Qt({map:o.bark,wrap:.38,rim:.5,snow:1,snowY:y}),branch:Qt({map:o.bark,wrap:.38,rim:.5,snow:1,snowY:y,wind:!0,cutout:!0}),walk:Qt({map:o.plank,wrap:.22,rim:.2,snow:.85,snowY:y-1}),rail:Qt({wrap:.3,rim:.35,snow:.9,snowY:y}),glass:Es(16761466,2.4),leaf:Ts(o.leaves,{a2c:i}),islandTop:Qt({wrap:.3,rim:.12}),rock:Qt({map:o.rock,wrap:.3,rim:.3}),props:Qt({wrap:.3,rim:.3,cutout:!0}),pond:Qt({wrap:.2,rim:.9}),far:Qt({wrap:.5,rim:.4}),sky:zs(o.stars)};p(h.trunk,m.trunk,0,g),p(h.branches,m.branch,0,x),h.nest&&p(h.nest,m.rail,0,g),p(r.walkway,m.walk,0,g),p(r.rail,m.rail,0,g),p(r.glass,m.glass,0);let b=new Et.Mesh(h.leaves,m.leaf);b.frustumCulled=!1,b.matrixAutoUpdate=!1,b.renderOrder=2,l.add(b),e.add(h.leaves,_s(o.leaves)),p(u.top,m.islandTop,0),p(u.rock,m.rock,0),p(u.props,m.props,0,g),p(u.pond,m.pond,0),p(u.gateFrame,m.trunk,0,g);let v=Mi(c);p(u.gate,v,1),p(f.farGeo,m.far,0);let T=Ks(n,oe),z=Xs(c,T.list.length);T.twigGeo&&p(T.twigGeo,m.branch,0),T.gemGeo&&p(T.gemGeo,z,0),f.dome.material=m.sky,l.add(f.dome),l.add(f.group);let H=Us(o.glow,c);l.add(H);let I=js(c,o.particles,t.particles),W=Zs(c,o.shaft,t.shafts),X=Qs(c,t.birds);l.add(I.mesh,W.mesh,X.mesh);let $=re(r.lanterns,o.glow,c,.5,16756832);return l.add($.mesh),{scene:l,curve:n,tree:h,walk:r,island:u,tex:o,mats:m,gateMat:v,crystals:T,crystalMat:z,glare:H,lanternGlow:$,particles:I,shafts:W,birds:X,occluders:{caps:h.caps.concat(u.occ.caps),ellipsoids:h.ellipsoids,spheres:u.occ.spheres}}}function Mi(c){return new Et.ShaderMaterial({vertexShader:`
			varying vec2 vUv; varying vec3 vW;
			void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${Ct}
			${vt}
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
			}`,uniforms:{...c,uOpen:{value:0}},side:Et.DoubleSide,polygonOffset:!0,polygonOffsetFactor:-2})}function re(c,t,e,s,i){let a=new Et.InstancedBufferGeometry,o=new Et.PlaneGeometry(1,1);a.setIndex(o.index),a.setAttribute("position",o.getAttribute("position"));let l=new Float32Array(Math.max(1,c.length)*4);c.forEach((d,u)=>l.set([d.x,d.y,d.z,s],u*4));let n=new Et.InstancedBufferAttribute(l,4);a.setAttribute("iPos",n),a.instanceCount=c.length;let h=new Et.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{uTime:e.uTime,uFogP:e.uFogP,uMap:{value:t},uColor:{value:new Et.Color(i)},uK:{value:1}},transparent:!0,depthWrite:!1,blending:Et.AdditiveBlending}),r=new Et.Mesh(a,h);return r.frustumCulled=!1,r.renderOrder=25,{mesh:r,attr:n,mat:h}}var zt={dx:1,dz:0,str:.25,gust:0};function we(c,t,e,s,i,a){let o=c*.071+e*.053+t*.037,l=Math.sin(i*1.3+o*6.2831)*.6+Math.sin(i*2.7+o*11)*.4,n=zt.gust*(.65+.35*Math.sin(i*5.1+o*17)),h=(zt.str*l+n)*s;return a.x=zt.dx*h,a.y=Math.sin(i*2.1+o*9)*.18*s*(zt.str+zt.gust),a.z=zt.dz*h,a}import*as he from"three";var ge=()=>new he.Vector3,Ie=class{constructor(){this.cam=new he.PerspectiveCamera(52,1,.3,1400),this.pos=ge(),this.look=ge(),this.tPos=ge(),this.tLook=ge(),this.aspect=1,this.mode="follow",this.cine=null,this.shake=0,this.zoom=1,this._tmp=ge(),this._tmp2=ge(),this.lag=.42}resize(t,e){this.aspect=t/e,this.cam.aspect=this.aspect,this.baseFov=this.aspect<1?O(66,54,rt((this.aspect-.45)/.55,0,1)):50,this.cam.fov=this.baseFov,this.cam.updateProjectionMatrix()}followTarget(t,e,s=this.tPos,i=this.tLook){let a=Math.atan2(t.z,t.x),o=Math.hypot(t.x,t.z),l=this.aspect<1,n=(l?10.2:8.6)*this.zoom,h=(l?4.2:3.3)*this.zoom,r=a-this.lag;return s.set(Math.cos(r)*(o+n),t.y+h,Math.sin(r)*(o+n)),i.copy(t).lerp(e,.35),i.y+=l?.2:.55,s}snap(){this.pos.copy(this.tPos),this.look.copy(this.tLook)}play(t,e){this.cine={keys:t,t:0,dur:t[t.length-1].t,onDone:e};let s=t.map(a=>a.pos),i=t.map(a=>a.look);this.cine.cp=new he.CatmullRomCurve3(s,!1,"centripetal"),this.cine.cl=new he.CatmullRomCurve3(i,!1,"centripetal"),this.mode="cine"}skipCine(){this.cine&&(this.cine.t=this.cine.dur)}update(t){let e=this.cam;if(this.mode==="cine"&&this.cine){let s=this.cine;s.t=Math.min(s.dur,s.t+t);let i=s.keys,a=0;for(;a<i.length-2&&s.t>i[a+1].t;)a++;let o=(s.t-i[a].t)/Math.max(1e-4,i[a+1].t-i[a].t),l=(a+Qe(rt(o,0,1)))/(i.length-1);s.cp.getPoint(l,this.pos),s.cl.getPoint(l,this.look);let n=i[a].fov??this.baseFov,h=i[a+1].fov??this.baseFov;e.fov=O(n,h,Qe(rt(o,0,1))),e.updateProjectionMatrix(),s.t>=s.dur&&(this.mode="follow",this.cine=null,s.onDone&&s.onDone())}else this.mode==="follow"&&(this.pos.x=st(this.pos.x,this.tPos.x,3.2,t),this.pos.y=st(this.pos.y,this.tPos.y,3.6,t),this.pos.z=st(this.pos.z,this.tPos.z,3.2,t),this.look.x=st(this.look.x,this.tLook.x,5,t),this.look.y=st(this.look.y,this.tLook.y,5,t),this.look.z=st(this.look.z,this.tLook.z,5,t),Math.abs(e.fov-this.baseFov)>.01&&(e.fov=st(e.fov,this.baseFov,3,t),e.updateProjectionMatrix()));if(e.position.copy(this.pos),this.shake>.001){let s=this.shake;e.position.x+=(Math.random()-.5)*s,e.position.y+=(Math.random()-.5)*s,this.shake=st(this.shake,0,6,t)}e.lookAt(this.look),e.updateMatrixWorld()}};import*as ri from"three";var Kt={x:0,y:0,z:0},Ti={min:0,max:1e9},Le=class{constructor(t){let e=t.occluders;this.caps=e.caps.map(i=>({ax:i.a.x,ay:i.a.y,az:i.a.z,bx:i.b.x,by:i.b.y,bz:i.b.z,r:i.r,anchor:i.anchor||null,wa:i.wa||0,wb:i.wb||0,cx:(i.a.x+i.b.x)/2,cy:(i.a.y+i.b.y)/2,cz:(i.a.z+i.b.z)/2,br:i.a.distanceTo(i.b)/2+i.r+1.8*Math.max(i.wa||0,i.wb||0)})),this.ells=e.ellipsoids.map(i=>({cx:i.c.x,cy:i.c.y,cz:i.c.z,rx:i.rx,ry:i.ry,rz:i.rz,anchor:i.anchor,w:i.w,br:Math.max(i.rx,i.ry,i.rz)+1.8*i.w})),this.sph=e.spheres.map(i=>({cx:i.c.x,cy:i.c.y,cz:i.c.z,rx:i.r,ry:i.r*i.sy,rz:i.r,br:i.r}));let s=t.curve;this.slabs=[];for(let i=0;i<s.n-4;i+=4){let a=i+2,o=s.X[i+4]-s.X[i],l=s.Y[i+4]-s.Y[i],n=s.Z[i+4]-s.Z[i],h=Math.hypot(o,l,n),r=s.SX[a],d=s.SZ[a],u=s.R[a]-wt(s.Y[a])<1.6?1.15:.95,f=(u+1.9/2)/2,p=(1.9/2-u)/2;this.slabs.push({cx:s.X[a]+r*p,cy:s.Y[a]-.34/2,cz:s.Z[a]+d*p,Tx:o/h,Ty:l/h,Tz:n/h,hT:h/2+.02,Sx:r,Sz:d,hS:f,hU:.34/2+.04,br:Math.hypot(h/2,f,.34)})}this.t=0}setTime(t){this.t=t}blocked(t,e,s,i){let a=i.x,o=i.y,l=i.z;if(this._trunk(t,e,s,a,o,l))return!0;for(let n of this.slabs)if(!(n.cy<e+.25)&&Be(t,e,s,a,o,l,n.cx,n.cy,n.cz,n.br)&&Ei(t,e,s,a,o,l,n))return!0;for(let n of this.ells)if(!(n.cy+n.br<e)&&Be(t,e,s,a,o,l,n.cx,n.cy,n.cz,n.br)&&(we(n.anchor.x,n.anchor.y,n.anchor.z,n.w,this.t,Kt),ti(t,e,s,a,o,l,n.cx+Kt.x,n.cy+Kt.y,n.cz+Kt.z,n.rx,n.ry,n.rz)))return!0;for(let n of this.caps){if(Math.max(n.ay,n.by)+n.r+2<e||!Be(t,e,s,a,o,l,n.cx,n.cy,n.cz,n.br))continue;let h=n.ax,r=n.ay,d=n.az,u=n.bx,f=n.by,p=n.bz;if(n.anchor&&(n.wa>0||n.wb>0)&&(we(n.anchor.x,n.anchor.y,n.anchor.z,1,this.t,Kt),h+=Kt.x*n.wa,r+=Kt.y*n.wa,d+=Kt.z*n.wa,u+=Kt.x*n.wb,f+=Kt.y*n.wb,p+=Kt.z*n.wb),_i(t,e,s,a,o,l,h,r,d,u,f,p,n.r))return!0}for(let n of this.sph)if(Be(t,e,s,a,o,l,n.cx,n.cy,n.cz,n.br)&&ti(t,e,s,a,o,l,n.cx,n.cy,n.cz,n.rx,n.ry,n.rz))return!0;return!1}_trunk(t,e,s,i,a,o){let l=i*i+o*o;if(l<1e-6)return!1;let n=-(t*i+s*o)/l;if(n<=0)return!1;let h=t+i*n,r=s+o*n,d=e+a*n;if(d>55||Math.hypot(h,r)>wt(Math.max(0,d))+2.2)return!1;let f=9/Math.sqrt(l),p=Math.max(0,n-f),g=n+f,x=36;for(let y=0;y<=x;y++){let m=p+(g-p)*y/x,b=t+i*m,v=e+a*m,T=s+o*m;if(v>54)continue;if(Math.hypot(b,T)<Vt(Math.atan2(T,b),v)*.985)return!0}return!1}};function Be(c,t,e,s,i,a,o,l,n,h){let r=o-c,d=l-t,u=n-e,f=r*s+d*i+u*a;return f<-h?!1:r*r+d*d+u*u-f*f<=h*h}function ti(c,t,e,s,i,a,o,l,n,h,r,d){let u=(c-o)/h,f=(t-l)/r,p=(e-n)/d,g=s/h,x=i/r,y=a/d,m=g*g+x*x+y*y,b=u*g+f*x+p*y,v=u*u+f*f+p*p-1;if(v<0)return!0;let T=b*b-m*v;return T<0?!1:-b-Math.sqrt(T)>0}function _i(c,t,e,s,i,a,o,l,n,h,r,d,u){let f=h-o,p=r-l,g=d-n,x=c-o,y=t-l,m=e-n,b=s*s+i*i+a*a,v=s*f+i*p+a*g,T=f*f+p*p+g*g,z=s*x+i*y+a*m,H=f*x+p*y+g*m,I=b*T-v*v,W,X;I<1e-8?(W=0,X=T>1e-8?H/T:0):(W=(v*H-T*z)/I,X=(b*H-v*z)/I),W<0&&(W=0,X=T>1e-8?H/T:0),X<0?(X=0,W=Math.max(0,-z/b)):X>1&&(X=1,W=Math.max(0,(v-z)/b));let $=x+W*s-X*f,U=y+W*i-X*p,w=m+W*a-X*g;return $*$+U*U+w*w<=u*u}function Ei(c,t,e,s,i,a,o){let l=c-o.cx,n=t-o.cy,h=e-o.cz,r=Ti;return r.min=0,r.max=1e9,cs(o.Tx*l+o.Ty*n+o.Tz*h,o.Tx*s+o.Ty*i+o.Tz*a,o.hT,r)&&cs(o.Sx*l+o.Sz*h,o.Sx*s+o.Sz*a,o.hS,r)&&cs(n,i,o.hU,r)&&r.max>0}function cs(c,t,e,s){if(Math.abs(t)<1e-6)return Math.abs(c)<=e;let i=(-e-c)/t,a=(e-c)/t;if(i>a){let o=i;i=a,a=o}return i>s.min&&(s.min=i),a<s.max&&(s.max=a),s.min<=s.max}import*as ct from"three";var ei=1.55,zi=`
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
}`,Si=`
${et}
${Ct}
${vt}
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
}`,Ri=`
varying vec3 vN; varying vec3 vV; varying float vY;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vY = position.y; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,Ai=`
uniform vec3 uRim; uniform float uFade; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
	float f = 1.0 - abs(dot(normalize(vN), normalize(vV))), rim = pow(f, 2.2), pulse = 0.88 + 0.12 * sin(uTime * 4.0);
	vec3 c = mix(vec3(0.62, 0.55, 1.0), uRim, 0.45) * (0.45 + 1.7 * rim) * pulse * 0.8;
	gl_FragColor = vec4(c, (0.22 + 0.68 * rim) * uFade);
}`,Hi=`
uniform float uV, uA, uTime; varying vec2 vUv;
void main() {
	vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.x, -p.y) / 6.2831853 + 0.5;
	float band = smoothstep(0.78, 0.82, r) * (1.0 - smoothstep(0.94, 0.98, r));
	float fill = step(a, uV);
	vec3 c = mix(vec3(3.0, 0.7, 0.2), vec3(1.6, 1.4, 2.6), smoothstep(0.25, 0.7, uV));
	float pulse = uV < 0.3 ? 0.6 + 0.4 * sin(uTime * 18.0) : 1.0;
	vec3 o = c * pulse * band * (fill * 0.95 + 0.12) * uA;
	gl_FragColor = vec4(o / (1.0 + o * 0.4), 1.0);
}`,Ve=class{constructor(t,e,{rim:s=10325247,segs:i=40}={}){this.g=new ct.Group,this.k=new ct.Group,this.k.scale.setScalar(ei),this.g.add(this.k),this.body=new ct.Group,this.k.add(this.body),this.u={...t,uWob:{value:.5},uBurn:{value:0},uRim:{value:new ct.Color(s)},uLit:{value:0},uFade:{value:1},uMelt:{value:0},uDiss:{value:0}};let a=new ct.SphereGeometry(.3,i,Math.round(i*.7));this.blob=new ct.Mesh(a,new ct.ShaderMaterial({vertexShader:zi,fragmentShader:Si,uniforms:this.u})),this.blob.position.y=.3,this.body.add(this.blob),this.sil=new ct.Mesh(a,new ct.ShaderMaterial({vertexShader:Ri,fragmentShader:Ai,uniforms:{uRim:this.u.uRim,uFade:this.u.uFade,uTime:t.uTime},transparent:!0,depthWrite:!1,depthFunc:ct.GreaterDepth})),this.sil.position.y=.3,this.sil.scale.setScalar(1.035),this.sil.renderOrder=40,this.body.add(this.sil);let o=is(16777215,2.2),l=is(328200,1);this.eyeMat=o,this.eyes=[],this.pupils=[];let n=new ct.SphereGeometry(.075,16,12),h=new ct.SphereGeometry(.036,10,8);for(let d of[-1,1]){let u=new ct.Mesh(n,o);u.scale.set(.95,1.25,.55),u.position.set(d*.105,.38,.25);let f=new ct.Mesh(h,l);f.position.set(0,-.005,.06),u.add(f),this.body.add(u),this.eyes.push(u),this.pupils.push(f)}let r=new ct.SphereGeometry(.075,10,8);this.feet=[-1,1].map(d=>{let u=new ct.Mesh(r,l);return u.scale.set(1,.6,1.35),u.position.set(d*.12,.04,.02),this.k.add(u),u}),this.aura=new ct.Mesh(new ct.PlaneGeometry(1.3,1.3).rotateX(-Math.PI/2),new ct.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:"uniform sampler2D uMap; uniform float uO; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a * uO; gl_FragColor = vec4(0.012, 0.008, 0.03, a); }",uniforms:{uMap:{value:e.ink},uO:{value:.85}},transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-4})),this.aura.position.y=.014,this.aura.renderOrder=3,this.k.add(this.aura),this.ringU={uV:{value:1},uA:{value:0},uTime:t.uTime},this.ring=new ct.Mesh(new ct.PlaneGeometry(1.25,1.25).rotateX(-Math.PI/2),new ct.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:Hi,uniforms:this.ringU,transparent:!0,depthWrite:!1,blending:ct.AdditiveBlending})),this.ring.position.y=.03,this.ring.renderOrder=4,this.k.add(this.ring),this.reset()}reset(){this.phase=0,this.yaw=0,this.blinkT=2,this.squash=0,this.sqV=0,this.tapT=0,this.idleT=0,this.hopT=0,this.melt=0,this.diss=0,this.u.uMelt.value=0,this.u.uDiss.value=0,this.u.uFade.value=1,this.u.uBurn.value=0,this.blob.visible=!0,this.sil.visible=!0,this.g.visible=!0,this.g.scale.setScalar(1),this.body.scale.setScalar(1),this.body.position.set(0,0,0);for(let t of this.feet)t.visible=!0;this.eyes.forEach((t,e)=>{t.visible=!0,t.position.set(e?.105:-.105,.38,.25),t.scale.set(.95,1.25,.55)})}kick(t){this.sqV+=t}hop(){this.hopT=.55}update(t,e,s,i){this.g.position.set(s.x,s.y,s.z);let a=s.yaw-this.yaw;for(;a>Math.PI;)a-=Math.PI*2;for(;a<-Math.PI;)a+=Math.PI*2;this.yaw+=a*(1-Math.exp(-10*t)),this.g.rotation.y=this.yaw,this.sqV+=(-this.squash*220-this.sqV*16)*t,this.squash+=this.sqV*t;let o=0,l=1,n=1;if(s.moving){let f=this.phase;this.phase+=t*s.speed*4.4;let p=this.phase%1;o=Math.sin(p*Math.PI)*.12,Math.floor(this.phase)!==Math.floor(f)&&(this.kick(-2.2),i&&i()),l=1+Math.sin(p*Math.PI)*.06;for(let g=0;g<2;g++){let x=(this.phase+g*.5)%1;this.feet[g].position.z=.02+Math.sin(x*Math.PI*2)*.09,this.feet[g].position.y=.04+Math.max(0,Math.sin(x*Math.PI*2))*.05}}else{let f=Math.sin(e*2.2)*.025;l=1+f,n=1-f*.6;for(let p of this.feet)p.position.z=st(p.position.z,.02,8,t),p.position.y=.04;if(s.hold){this.tapT+=t;let p=Math.max(0,Math.sin(this.tapT*11));this.feet[1].position.y=.04+p*.045,this.feet[1].position.z=.05}else this.tapT=0}if(this.hopT>0){this.hopT=Math.max(0,this.hopT-t);let f=Math.sin((1-this.hopT/.55)*Math.PI);o+=f*.22,l*=1+f*.08,this.hopT===0&&this.kick(-2.4)}l*=1+this.squash,n*=1-this.squash*.55;let h=O(.62,1,s.meter);this.k.scale.setScalar(ei*h);let r=s.burn>0?.018*s.burn:0;this.body.position.set((Math.random()-.5)*r,o,(Math.random()-.5)*r),this.body.scale.set(n,l,n),this.blinkT-=t;let d=1;this.blinkT<.12&&(d=Math.max(.08,Math.abs(this.blinkT-.06)/.06)),this.blinkT<0&&(this.blinkT=2+Math.random()*3);let u=s.burn>.2?1.25:1;this.eyes.forEach(f=>f.scale.set(.95*u,1.25*d*u,.55));for(let f of this.pupils)f.scale.setScalar(s.burn>.2?.6:1);this.u.uBurn.value=st(this.u.uBurn.value,s.burn,8,t),this.u.uLit.value=st(this.u.uLit.value,s.lit,8,t),this.u.uWob.value=.4+this.u.uBurn.value*.6,this.ringU.uV.value=st(this.ringU.uV.value,s.meter,10,t),this.ringU.uA.value=st(this.ringU.uA.value,s.meter<.995?1:0,4,t)}evaporate(t){this.u.uMelt.value=rt(t*1.6,0,1),this.u.uDiss.value=rt((t-.25)/.75,0,1),this.u.uBurn.value=1,this.sil.visible=!1,this.ringU.uA.value=0,this.aura.material.uniforms.uO.value=.85*(1-t);for(let e of this.feet)e.visible=t<.4;this.eyes.forEach((e,s)=>{let i=Math.max(.001,1-rt((t-.1)/.4,0,1));e.scale.set(.95*i,1.4*i,.55*i),e.position.y=O(.38,.18,rt(t*2,0,1))})}setFade(t){this.u.uFade.value=t,this.eyeMat.uniforms.uFade.value=t,this.aura.material.uniforms.uO.value=.85*t}};import*as ae from"three";import*as bt from"three";var Xt=320,Me=class{constructor(t,e,{additive:s=!1}={}){this.n=0,this.p=new Float32Array(Xt*3),this.v=new Float32Array(Xt*3),this.life=new Float32Array(Xt*2),this.par=new Float32Array(Xt*4),this.col=new Float32Array(Xt*4),this.cell=new Float32Array(Xt),this.spin=new Float32Array(Xt*2);let i=new bt.InstancedBufferGeometry,a=new bt.PlaneGeometry(1,1);i.setIndex(a.index),i.setAttribute("position",a.getAttribute("position")),this.aPos=new bt.InstancedBufferAttribute(new Float32Array(Xt*4),4).setUsage(bt.DynamicDrawUsage),this.aCol=new bt.InstancedBufferAttribute(new Float32Array(Xt*4),4).setUsage(bt.DynamicDrawUsage),this.aRot=new bt.InstancedBufferAttribute(new Float32Array(Xt*2),2).setUsage(bt.DynamicDrawUsage),i.setAttribute("iPos",this.aPos),i.setAttribute("iCol",this.aCol),i.setAttribute("iRot",this.aRot),i.instanceCount=0,this.geo=i;let o=new bt.ShaderMaterial({vertexShader:`
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
					vec3 c = pow(clamp(t.rgb * vCol.rgb, 0.0, 1.0), vec3(1.0 / 2.2)); gl_FragColor = vec4(c * a, a); }`,uniforms:{uMap:{value:e}},transparent:!0,depthWrite:!1,blending:s?bt.AdditiveBlending:bt.CustomBlending,blendSrc:bt.OneFactor,blendDst:s?bt.OneFactor:bt.OneMinusSrcAlphaFactor});this.mesh=new bt.Mesh(i,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=35}emit(t,e,s,i,a,o,l,n,h,r,d,u,f,p,g,x,y=0){if(this.n>=Xt)return;let m=this.n++;this.p[m*3]=t,this.p[m*3+1]=e,this.p[m*3+2]=s,this.v[m*3]=i,this.v[m*3+1]=a,this.v[m*3+2]=o,this.life[m*2]=l,this.life[m*2+1]=l,this.par[m*4]=n,this.par[m*4+1]=h,this.par[m*4+2]=r,this.par[m*4+3]=d,this.col[m*4]=u,this.col[m*4+1]=f,this.col[m*4+2]=p,this.col[m*4+3]=g,this.cell[m]=x,this.spin[m*2]=Math.random()*6.28,this.spin[m*2+1]=y}update(t){let e=0,s=this.aPos.array,i=this.aCol.array,a=this.aRot.array;for(let o=0;o<this.n;o++){let l=this.life[o*2]-t;if(l<=0)continue;e!==o&&(this.p.copyWithin(e*3,o*3,o*3+3),this.v.copyWithin(e*3,o*3,o*3+3),this.life[e*2+1]=this.life[o*2+1],this.par.copyWithin(e*4,o*4,o*4+4),this.col.copyWithin(e*4,o*4,o*4+4),this.cell[e]=this.cell[o],this.spin.copyWithin(e*2,o*2,o*2+2)),this.life[e*2]=l;let n=Math.exp(-this.par[e*4+3]*t);this.v[e*3]*=n,this.v[e*3+1]=this.v[e*3+1]*n-this.par[e*4+2]*t,this.v[e*3+2]*=n,this.p[e*3]+=this.v[e*3]*t,this.p[e*3+1]+=this.v[e*3+1]*t,this.p[e*3+2]+=this.v[e*3+2]*t,this.spin[e*2]+=this.spin[e*2+1]*t;let h=1-l/this.life[e*2+1],r=Math.min(1,h*6)*(1-h*h);s[e*4]=this.p[e*3],s[e*4+1]=this.p[e*3+1],s[e*4+2]=this.p[e*3+2],s[e*4+3]=this.par[e*4]+(this.par[e*4+1]-this.par[e*4])*h,i[e*4]=this.col[e*4],i[e*4+1]=this.col[e*4+1],i[e*4+2]=this.col[e*4+2],i[e*4+3]=this.col[e*4+3]*r,a[e*2]=this.cell[e],a[e*2+1]=this.spin[e*2],e++}this.n=e,this.geo.instanceCount=e,e>0&&(this.aPos.clearUpdateRanges(),this.aCol.clearUpdateRanges(),this.aRot.clearUpdateRanges(),this.aPos.addUpdateRange(0,e*4),this.aCol.addUpdateRange(0,e*4),this.aRot.addUpdateRange(0,e*2),this.aPos.needsUpdate=!0,this.aCol.needsUpdate=!0,this.aRot.needsUpdate=!0)}clear(){this.n=0,this.geo.instanceCount=0}};function Yt(c,t,e,s,i=18,a=[1.6,1.3,2.6]){for(let o=0;o<i;o++){let l=Math.random()*Math.PI*2,n=(Math.random()-.2)*1.2,h=1.2+Math.random()*2.2;c.emit(t,e,s,Math.cos(l)*Math.cos(n)*h,Math.sin(n)*h+1.2,Math.sin(l)*Math.cos(n)*h,.7+Math.random()*.5,.28,.05,1.6,2.2,a[0],a[1],a[2],1,3)}}function Te(c,t,e,s,i=1){c.emit(t+(Math.random()-.5)*.3,e,s+(Math.random()-.5)*.3,(Math.random()-.5)*.3,.8+Math.random()*.6,(Math.random()-.5)*.3,.9,.18*i,.6*i,-.4,1.4,1.9,.8,.3,.55,3)}var hs=8;function Ci(){let c=new ae.SphereGeometry(.16,20,14),t=c.getAttribute("position");for(let e=0;e<t.count;e++){let s=t.getX(e),i=t.getY(e),a=t.getZ(e);if(i>0){let o=i/.16;i*=1+o*.9,s*=1-o*.75,a*=1-o*.75}t.setXYZ(e,s,i,a)}return c.computeVertexNormals(),c}var We=class{constructor(t,e,s){this.G=t,this.geo=Ci(),this.mat=new ae.ShaderMaterial({vertexShader:`
				varying vec3 vN; varying vec3 vW; varying vec3 vL;
				void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
				${et}
				${Ct}
				${vt}
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
				}`,uniforms:{...t}}),this.meshes=[];for(let a=0;a<hs;a++){let o=new ae.Mesh(this.geo,this.mat);o.visible=!1,o.renderOrder=6,s.add(o),this.meshes.push(o)}let i=Array.from({length:hs},()=>new ae.Vector3(0,-999,0));this.glow=re(i,e.glow,t,.55,9403647),this.glow.mat.uniforms.uK.value=.7,s.add(this.glow.mesh),this.list=[],this._p={},this._L=new ae.Vector3}setup(t,e,s,i){this.list=i.map(([a,o],l)=>{let n=e+(s-e)*a,h=t.sample(n,{}),r=o*.62;return{i:l,s:n,x:h.x+h.sx*r,y:h.y+.55,z:h.z+h.sz*r,melt:0,state:"idle",t:0,lit:0}});for(let a=0;a<hs;a++)this.meshes[a].visible=a<this.list.length;this.glow.mesh.geometry.instanceCount=this.list.length}get total(){return this.list.length}get got(){return this.list.filter(t=>t.state==="got"||t.state==="fly").length}get lost(){return this.list.filter(t=>t.state==="lost").length}update(t,e,s,i,a,o,l,n,h,r){let d=this.glow.attr.array;for(let u of this.list){let f=this.meshes[u.i];if(u.t+=t,u.state==="idle"){if(r&&u.s-s<9&&u.s-s>-1){let x=!a.blocked(u.x,u.y+.1,u.z,o)||this.beams&&this.beams.litAt(u.x,u.y,u.z);u.lit=st(u.lit,x?1:0,12,t),x?(u.melt=Math.min(1,u.melt+t*.3),Math.random()<t*14&&Te(l,u.x,u.y+.15,u.z,.6),u.melt>=1&&(u.state="lost",Yt(l,u.x,u.y,u.z,12,[2.4,.9,.3]),h(u))):u.melt=Math.max(0,u.melt-t*.12)}r&&Math.abs(u.s-s)<.55&&(u.state="fly",u.t=0);let p=1-u.melt*.65,g=u.lit*.02;f.position.set(u.x+(Math.random()-.5)*g,u.y+Math.sin(e*2.2+u.i)*.07,u.z+(Math.random()-.5)*g),f.rotation.y=e*.8+u.i,f.scale.setScalar(p),d[u.i*4]=f.position.x,d[u.i*4+1]=f.position.y,d[u.i*4+2]=f.position.z,d[u.i*4+3]=.55*p*(1-u.lit*.5)}else if(u.state==="fly"){let p=Math.min(1,u.t/.28);f.position.set(u.x+(i.x-u.x)*p,u.y+(i.y+.5-u.y)*p+Math.sin(p*Math.PI)*.4,u.z+(i.z-u.z)*p),f.scale.setScalar(1-p*.8),d[u.i*4]=f.position.x,d[u.i*4+1]=f.position.y,d[u.i*4+2]=f.position.z,d[u.i*4+3]=.55*(1-p),p>=1&&(u.state="got",f.visible=!1,d[u.i*4+3]=0,Yt(l,i.x,i.y+.6,i.z,20),n(u))}else f.visible=!1,d[u.i*4+3]=0}this.glow.attr.needsUpdate=!0}hideAll(){for(let t of this.meshes)t.visible=!1;this.glow.mesh.geometry.instanceCount=0,this.list=[]}};import*as At from"three";var $e=6,Oe={x:0,y:0,z:0},Ge=class{constructor(t,e,s,i){this.list=i.crystals.list.map(h=>({...h,lit:0,on:!1,hx:0,hy:0,hz:0,cx:0,cy:0,cz:0,hitT:0})),this.gemMat=i.crystalMat;let a=new At.InstancedBufferGeometry,o=new At.PlaneGeometry(1,1);a.setIndex(o.index),a.setAttribute("position",o.getAttribute("position")),this.aA=new At.InstancedBufferAttribute(new Float32Array($e*4),4).setUsage(At.DynamicDrawUsage),this.aB=new At.InstancedBufferAttribute(new Float32Array($e*4),4).setUsage(At.DynamicDrawUsage),a.setAttribute("iA",this.aA),a.setAttribute("iB",this.aB),a.instanceCount=0,this.geo=a;let l=new At.ShaderMaterial({vertexShader:`
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
				${et}
				varying vec2 vUv; varying float vA;
				void main() {
					float x = abs(vUv.x - 0.5) * 2.0;
					float core = exp(-x * x * 18.0) + exp(-x * x * 3.0) * 0.35;
					float ends = smoothstep(0.0, 0.06, vUv.y) * (0.55 + 0.45 * smoothstep(1.0, 0.85, vUv.y));
					float shimmer = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 9.0);
					vec3 c = (uSunCol * 0.45 + vec3(0.6, 0.5, 0.35)) * core * ends * shimmer * vA;
					gl_FragColor = vec4(c / (1.0 + c * 0.25), 1.0);
				}`,uniforms:{...t},transparent:!0,depthWrite:!1,blending:At.AdditiveBlending,side:At.DoubleSide});this.mesh=new At.Mesh(a,l),this.mesh.frustumCulled=!1,this.mesh.renderOrder=26,s.add(this.mesh);let n=Array.from({length:$e},()=>new At.Vector3(0,-999,0));this.spots=re(n,e.glow,t,1.2,16773312),this.glints=re(n,e.glow,t,1,16774364),this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0,s.add(this.spots.mesh,this.glints.mesh),this.active=[],this._cand=[]}update(t,e,s,i,a,o){let l=this.aA.array,n=this.aB.array,h=this.spots.attr.array,r=this.glints.attr.array,d=this.gemMat.uniforms.uLit.value;this.active.length=0;let u=0,f=0,p=i.x,g=i.y,x=i.z;for(let y=0;y<this.list.length;y++){let m=this.list[y],b=Math.abs(m.c.y-s)<15,v=!1;if(b){we(m.anchor.x,m.anchor.y,m.anchor.z,m.w,e,Oe),m.cx=m.c.x+Oe.x,m.cy=m.c.y+Oe.y,m.cz=m.c.z+Oe.z;let T=m.n.x*p+m.n.y*g+m.n.z*x;if(T>.05&&!a.blocked(m.cx+p*.5,m.cy+g*.5,m.cz+x*.5,i)){let z=-p+2*T*m.n.x,H=-g+2*T*m.n.y,I=-x+2*T*m.n.z,W=this._cast(m.cx,m.cy,m.cz,z,H,I,a);m.hx=m.cx+z*W,m.hy=m.cy+H*W,m.hz=m.cz+I*W,m.hitT=W,v=!0}}if(m.lit=st(m.lit,v?1:0,14,t),d[y]=m.lit,m.on=v,m.lit>.02&&u<$e&&(l[u*4]=m.cx,l[u*4+1]=m.cy,l[u*4+2]=m.cz,l[u*4+3]=.55,n[u*4]=m.hx,n[u*4+1]=m.hy,n[u*4+2]=m.hz,n[u*4+3]=m.lit,h[u*4]=m.hx,h[u*4+1]=m.hy+.05,h[u*4+2]=m.hz,h[u*4+3]=m.hitT<39?1*m.lit:0,r[u*4]=m.cx,r[u*4+1]=m.cy,r[u*4+2]=m.cz,r[u*4+3]=.9*m.lit,u++),v){this.active.push(m);let T=us(o.x,o.y+.45,o.z,m.cx,m.cy,m.cz,m.hx,m.hy,m.hz);T<.55&&(f=Math.max(f,1-Math.max(0,T-.35)/.2))}}return this.geo.instanceCount=u,this.spots.mesh.geometry.instanceCount=u,this.glints.mesh.geometry.instanceCount=u,this.aA.needsUpdate=!0,this.aB.needsUpdate=!0,this.spots.attr.needsUpdate=!0,this.glints.attr.needsUpdate=!0,f}testPoint(t,e,s,i,a,o=.55){for(let l of this.list){if(Math.abs(l.c.y-s)>15)continue;let n=l.n.x*t.x+l.n.y*t.y+l.n.z*t.z;if(n<=.05)continue;let h=l.cx||l.c.x,r=l.cy||l.c.y,d=l.cz||l.c.z;if(a.blocked(h+t.x*.5,r+t.y*.5,d+t.z*.5,t))continue;let u=-t.x+2*n*l.n.x,f=-t.y+2*n*l.n.y,p=-t.z+2*n*l.n.z,g=this._cast(h,r,d,u,f,p,a);if(us(e,s,i,h,r,d,h+u*g,r+f*g,d+p*g)<o)return!0}return!1}litAt(t,e,s,i=.35){for(let a of this.active)if(us(t,e,s,a.cx,a.cy,a.cz,a.hx,a.hy,a.hz)<i)return!0;return!1}_cast(t,e,s,i,a,o,l){let n=this._cand;n.length=0;for(let r of l.slabs){let d=r.cx-t,u=r.cy-e,f=r.cz-s,p=d*i+u*a+f*o;if(p<-r.br||p>41)continue;d*d+u*u+f*f-p*p<=r.br*r.br&&n.push(r)}let h=.16;for(let r=.35;r<40;r+=h){let d=t+i*r,u=e+a*r,f=s+o*r,p=Math.hypot(d,f);if(u<56&&p<7&&p<Vt(Math.atan2(f,d),u)||p<ie&&u<se(d,f)+.02)return r;for(let g of n){let x=d-g.cx,y=u-g.cy,m=f-g.cz;if(!(Math.abs(x*g.Tx+y*g.Ty+m*g.Tz)>g.hT)&&!(Math.abs(x*g.Sx+m*g.Sz)>g.hS)&&!(Math.abs(y)>g.hU+.02))return r}}return 40}hide(){this.geo.instanceCount=0,this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0;for(let t of this.list)t.lit=0}};function us(c,t,e,s,i,a,o,l,n){let h=o-s,r=l-i,d=n-a,u=h*h+r*r+d*d,f=u>0?((c-s)*h+(t-i)*r+(e-a)*d)/u:0;f=f<0?0:f>1?1:f;let p=s+h*f-c,g=i+r*f-t,x=a+d*f-e;return Math.sqrt(p*p+g*g+x*x)}import*as ot from"three";var si=3,ps=7,ds=1.55,Pi=[[0,1],[0,1.7],[.45,.8],[-.45,.8]];function Fi(){let e=[],s=[],i=[],a=[];for(let l=0;l<=8;l++){let n=l/8,h=Math.sin(Math.min(1,n*1.15)*Math.PI)*.36+.06*(1-n);for(let r=0;r<=6;r++){let d=r/6-.5,u=d*h*2,f=-Math.pow(Math.abs(d)*2,2)*.1-Math.pow(n,2)*.22;e.push(u,n*1.05,f);let p=new ot.Vector3(-u*.6,.15-n*.2,1).normalize();s.push(p.x,p.y,p.z),i.push(.75+n*.25,n,1,1)}}for(let l=0;l<8;l++)for(let n=0;n<6;n++){let h=l*7+n;a.push(h,h+1,h+6+2,h,h+6+2,h+6+1)}let o=new ot.BufferGeometry;return o.setAttribute("position",new ot.Float32BufferAttribute(e,3)),o.setAttribute("normal",new ot.Float32BufferAttribute(s,3)),o.setAttribute("color",new ot.Float32BufferAttribute(i,4)),o.setIndex(a),o}function Di(c,t,e){return new ot.ShaderMaterial({vertexShader:`
			attribute vec4 color;
			varying vec3 vN; varying vec3 vW; varying vec4 vC;
			void main() {
				vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
				vW = w.xyz; vC = color;
				vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:`
			${et}
			${ye}
			${Ct}
			${vt}
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
			}`,uniforms:{...c,uA:{value:new ot.Color(t)},uB:{value:new ot.Color(e)},uCharge:{value:0},uOpen:{value:0}},side:ot.DoubleSide})}function Ii(c){return new ot.ShaderMaterial({vertexShader:`
			varying vec3 vN; varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${Ct}
			${vt}
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
			}`,uniforms:{...c,uCharge:{value:0}}})}function Bi(){let c=[],t=(i,a,o,l,n,h)=>{let r=[],d=new ot.Vector3(Math.sin(n)*o*.3,o,0).applyAxisAngle(new ot.Vector3(0,1,0),h);for(let f=0;f<6;f++){let p=f/6*Math.PI*2;r.push([Math.cos(p)*l,Math.sin(p)*l*.8])}let u=o*.72;for(let f=0;f<6;f++){let[p,g]=r[f],[x,y]=r[(f+1)%6],m=[i+p,0,a+g],b=[i+x,0,a+y],v=[i+p*.9+d.x*.7,u,a+g*.9+d.z*.7],T=[i+x*.9+d.x*.7,u,a+y*.9+d.z*.7],z=[i+d.x,o,a+d.z];c.push(...m,...b,...T,...m,...T,...v,...v,...T,...z)}},e=[.31,.77,.13,.55,.92,.4,.66];for(let i=0;i<7;i++){let a=-.95+i/6*1.9,o=.9+e[i]*1.1+(i===3?.4:0);t(a,(e[(i+2)%7]-.5)*.35,o,.17+e[(i+4)%7]*.1,(e[i]-.5)*.7,e[(i+1)%7]*6)}let s=new ot.BufferGeometry;return s.setAttribute("position",new ot.Float32BufferAttribute(c,3)),s.computeVertexNormals(),s}var Ne=class{constructor(t,e,s){this.G=t,this.petalGeo=Fi(),this.items=[];let i={spring:[14183064,16766694],summer:[14715418,16769146],autumn:[11024924,16752704]},a=()=>{let l={};for(let[n,[h,r]]of Object.entries(i))l[n]=Di(t,h,r);return l};this.iceGeo=Bi();for(let l=0;l<si;l++){let n=a(),h=new ot.InstancedMesh(this.petalGeo,n.spring,ps);h.frustumCulled=!1,h.visible=!1;let r=new ot.Mesh(this.iceGeo,Ii(t));r.visible=!1,s.add(h,r),this.items.push({petals:h,ice:r,mats:n,s:0,charge:0,open:0,state:"off",x:0,y:0,z:0,tx:0,tz:0,sx:0,sz:0,kind:"bud"})}let o=Array.from({length:si},()=>new ot.Vector3(0,-999,0));this.glow=re(o,e.glow,t,1,16769696),this.glow.mesh.geometry.instanceCount=0,s.add(this.glow.mesh),this._m=new ot.Matrix4,this._q=new ot.Quaternion,this._e=new ot.Euler,this._v=new ot.Vector3,this._s=new ot.Vector3,this.list=[]}setup(t,e,s,i=[],a="spring"){this.list=[],this.items.forEach((o,l)=>{let n=i[l];if(o.petals.visible=!1,o.ice.visible=!1,!n){o.state="off";return}let h=e+(s-e)*n,r=t.sample(h,{});Object.assign(o,{s:h,x:r.x,y:r.y,z:r.z,tx:r.tx,tz:r.tz,sx:r.sx,sz:r.sz,charge:0,open:0,state:"closed"}),o.kind=a==="winter"?"ice":"bud",o.kind==="ice"?(o.ice.visible=!0,o.ice.position.set(r.x,r.y-.02,r.z),o.ice.rotation.set(0,Math.atan2(r.tx,r.tz),0),o.ice.scale.setScalar(1)):(o.petals.visible=!0,o.petals.material=o.mats[a]||o.mats.spring),this.list.push(o),this._pose(o,0)}),this.glow.mesh.geometry.instanceCount=this.list.length}_pose(t,e){if(t.kind==="ice"){let a=1-Je(e);t.ice.scale.set(Math.max(.01,a)*1.05,Math.max(.01,a)*1,Math.max(.01,a)*1),t.ice.visible=a>.02;return}let s=this._v.set(t.x,t.y+.05,t.z),i=Math.atan2(t.tx,t.tz);for(let a=0;a<ps;a++){let o=a/ps*Math.PI*2,l=.18+Je(e)*1.45;this._e.set(-l,i+o,0,"YXZ"),this._q.setFromEuler(this._e);let n=1.55*(1-e*.35);this._s.set(n,n*(1.05-e*.2),n);let h=.12+e*.55,r=s.x+Math.sin(i+o)*h,d=s.z+Math.cos(i+o)*h;this._m.compose(this._v.set(r,s.y-e*.05,d),this._q,this._s),t.petals.setMatrixAt(a,this._m),this._v.copy(s)}t.petals.instanceMatrix.needsUpdate=!0}limit(t){let e=1/0;for(let s of this.list)s.state!=="open"&&s.s>t-.2&&(e=Math.min(e,s.s-ds));return e}update(t,e,s,i,a,o,l){let n=this.glow.attr.array,h=0;for(let r of this.list){let d=r.s-e<ds+.5&&r.s-e>-.5;if(r.state==="closed"&&!d)r.charge=Math.max(0,r.charge-t*.1);else if(r.state==="closed"){let f=0,p=Pi;for(let[g,x]of p){let y=r.x+r.sx*g,m=r.z+r.sz*g;(!i.blocked(y,r.y+x,m,s)||a&&a.litAt(y,r.y+x,m,.5))&&f++}f/=p.length,r.charge=rt(r.charge+(f>0?f*.6:-.1)*t,0,1),f>0&&Math.random()<t*10&&Yt(o,r.x+(Math.random()-.5),r.y+1+Math.random(),r.z+(Math.random()-.5),1,[2.2,1.7,.8]),r.charge>=1&&(r.state="opening",l(r),Yt(o,r.x,r.y+1.2,r.z,26,[2.4,2,1]))}else r.state==="opening"&&(r.open=Math.min(1,r.open+t/.9),this._pose(r,r.open),r.open>=1&&(r.state="open"));let u=r.kind==="ice"?r.ice.material:r.petals.material;u.uniforms.uCharge.value=r.charge,u.uniforms.uOpen&&(u.uniforms.uOpen.value=r.open),n[h*4]=r.x,n[h*4+1]=r.y+1.1,n[h*4+2]=r.z,n[h*4+3]=r.state==="open"?0:.25+r.charge*1.3,h++}this.glow.attr.needsUpdate=!0}pending(t){for(let e of this.list)if(e.state==="closed"&&e.s>t-.2&&e.s-t<ds+.3)return e;return null}hide(){for(let t of this.items)t.petals.visible=!1,t.ice.visible=!1,t.state="off";this.list=[],this.glow.mesh.geometry.instanceCount=0}};import*as ut from"three";var Ue=12,$t=4,fs=1.75,ii=1.05,Ke=[];for(let c=0;c<4;c++)Ke.push([.8,c/4*D,1.9]);for(let c=0;c<2;c++)Ke.push([.22,c*Math.PI,2.6]);for(let c=0;c<6;c++)Ke.push([1.38,c/6*D+.4,1.35]);function Li(){let c=[],t=[],e=(u,f,p,g,x,y)=>{c.push(u,f,p),t.push(g,x,y)},s=(u,f,p)=>{e(...u),e(...f),e(...p)},i=[0,.02,.36,0,0,.15],a=[-.06,0,.13,0,0,0],o=[.06,0,.13,0,0,0],l=[0,0,-.12,0,0,0];s(i,a,o),s(a,l,o);let n=[-.13,0,-.38,.15,.5,.6],h=[.13,0,-.38,.15,.5,.6],r=[0,0,-.26,0,0,.1];s(l,n,r),s(l,r,h);for(let u of[-1,1]){let f=[.04*u,0,.15,0,0,0],p=[.05*u,0,-.06,0,0,0],g=[.31*u,0,.11,1,.25,.35],x=[.29*u,0,-.07,1,.25,.25],y=[.68*u,0,-.22,1,1,1];s(f,g,p),s(p,g,x),s(g,y,x)}let d=new ut.BufferGeometry;return d.setAttribute("position",new ut.Float32BufferAttribute(c,3)),d.setAttribute("aW",new ut.Float32BufferAttribute(t,3)),d}var ai=`
	attribute vec3 aW;
	attribute vec4 iP; // konum, \xF6l\xE7ek
	attribute vec4 iF; // u\xE7u\u015F y\xF6n\xFC, kanat evresi
	attribute vec2 iB; // yat\u0131\u015F, par\u0131lt\u0131
	varying vec3 vW; varying float vRim;
	void main() {
		vec3 p = position;
		float f = sin(iF.w - aW.y * 1.2);
		p.y += abs(p.x) * f * 0.8 * aW.x;
		p.x *= 1.0 - 0.16 * max(-f, 0.0) * aW.x;
		vec3 fwd = normalize(iF.xyz + vec3(1e-4, 0.0, 0.0));
		vec3 rt = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 0.0, 1e-4));
		vec3 up = cross(rt, fwd);
		float cb = cos(iB.x), sb = sin(iB.x);
		vec3 r2 = rt * cb + up * sb;
		vec3 u2 = up * cb - rt * sb;
		vec3 w = iP.xyz + (r2 * p.x + u2 * p.y + fwd * p.z) * iP.w;
		vW = w;
		vRim = aW.z * iB.y;
		gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
	}`,qe=class{constructor(t,e,s){let i=Li(),a=new ut.InstancedBufferGeometry;a.setAttribute("position",i.getAttribute("position")),a.setAttribute("aW",i.getAttribute("aW")),this.aP=new ut.InstancedBufferAttribute(new Float32Array(Ue*4),4).setUsage(ut.DynamicDrawUsage),this.aF=new ut.InstancedBufferAttribute(new Float32Array(Ue*4),4).setUsage(ut.DynamicDrawUsage),this.aB=new ut.InstancedBufferAttribute(new Float32Array(Ue*2),2).setUsage(ut.DynamicDrawUsage),a.setAttribute("iP",this.aP),a.setAttribute("iF",this.aF),a.setAttribute("iB",this.aB),a.instanceCount=0,this.geo=a;let o=new ut.ShaderMaterial({vertexShader:ai,fragmentShader:`
				${et}
				${Ct}
				${vt}
				varying vec3 vW; varying float vRim;
				void main() {
					// m\xFCrekkep siluet; kanat u\xE7lar\u0131nda Zifir'in mor kenar \u0131\u015F\u0131\u011F\u0131, g\xFCne\u015F arkadaysa alt\u0131n s\u0131z\u0131nt\u0131
					vec3 c = vec3(0.03, 0.022, 0.06) + vec3(0.36, 0.27, 0.9) * vRim * 0.35;
					vec3 V = normalize(cameraPosition - vW);
					c += uSunCol * pow(max(dot(-V, uSunDir), 0.0), 6.0) * vRim * 0.25;
					gl_FragColor = finish(applyFog(c, vW), 1.0);
				}`,uniforms:{...t},side:ut.DoubleSide});if(this.mesh=new ut.Mesh(a,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=8,this.mesh.visible=!1,e.add(this.mesh),s){let l=new ut.ShaderMaterial({vertexShader:ai,fragmentShader:"void main() { gl_FragColor = vec4(1.0); }",uniforms:{...t},side:ut.DoubleSide,colorWrite:!1});this.shadowMesh=new ut.Mesh(a,l),this.shadowMesh.frustumCulled=!1,this.shadowMesh.matrixAutoUpdate=!1,this.shadowMesh.visible=!1,s.add(this.shadowMesh)}this.birds=[];for(let l=0;l<Ue;l++)this.birds.push({i:l,st:"off",x:0,y:-999,z:0,vx:0,vy:0,vz:0,hx:0,hy:0,hz:1,ph:Math.random()*D,sc:0,tsc:0,t:0,bank:0,ox:0,oy:0,oz:0});this.count=0,this.active=0,this.dur=1,this.c=new ut.Vector3,this._e1=new ut.Vector3,this._e2=new ut.Vector3,this._L=new ut.Vector3(0,1,0),this.glow=0}reset(t,e){this.count=0,this.active=0;for(let s of this.birds)s.st="off",s.sc=0;for(let s=0;s<t;s++)this.add(e,!0);this.mesh.visible=t>0}add(t,e=!1){if(this.count>=$t)return!1;let s=this.birds[this.count++];if(s.st="orbit",s.t=0,s.tsc=.68,e){let i=s.i/$t*D;s.x=t.x+Math.cos(i)*1.3,s.y=t.y+1.8,s.z=t.z+Math.sin(i)*1.3,s.vx=s.vy=s.vz=0,s.sc=.68}else{let i=Math.random()*D;s.x=t.x+Math.cos(i)*13,s.y=t.y+7+Math.random()*3,s.z=t.z+Math.sin(i)*13,s.vx=-Math.cos(i)*4,s.vy=-2,s.vz=-Math.sin(i)*4,s.sc=.68}return this.mesh.visible=!0,!0}get ready(){return this.count>=$t&&this.active<=0}activate(t,e){if(!this.ready)return!1;this.active=t,this.dur=t;for(let s of this.birds){if(s.st==="off"){let i=Math.random()*D;s.x=e.x,s.y=e.y+.5,s.z=e.z,s.vx=Math.cos(i)*5,s.vy=3+Math.random()*3,s.vz=Math.sin(i)*5,s.sc=.05}s.st="shield",s.t=0,s.tsc=s.i<$t?.95:.85}return this.mesh.visible=!0,this.shadowMesh&&(this.shadowMesh.visible=!0),!0}release(t=!1){for(let e of this.birds){if(e.st==="off")continue;e.st="leave",e.t=0;let s=Math.random()*D;e.ox=Math.cos(s)*9,e.oy=(t?9:5)+Math.random()*4,e.oz=Math.sin(s)*9}this.count=0,this.active=0}hide(){for(let t of this.birds)t.st="off",t.sc=0;this.count=0,this.active=0,this.mesh.visible=!1,this.shadowMesh&&(this.shadowMesh.visible=!1),this.geo.instanceCount=0}blocks(t,e,s,i){if(this.active<=0)return!1;let a=this.c.x-t,o=this.c.y-e,l=this.c.z-s,n=a*i.x+o*i.y+l*i.z;return n<0?!1:a*a+o*o+l*l-n*n<ii*ii}get strength(){return this.active>0?rt(this.active/.6,0,1):0}update(t,e,s,i){let a=this._L.copy(i);a.y<.05&&(a.y=.05),a.normalize();let o=this.c.set(s.x+a.x*fs,s.y+.55+a.y*fs,s.z+a.z*fs),l=Math.hypot(o.x,o.z),n=wt(o.y)+.9;l<n&&(o.x*=n/l,o.z*=n/l);let h=a.x,r=a.y+1,d=a.z,u=Math.hypot(h,r,d);h/=u,r/=u,d/=u;let f=this._e1.set(-d,0,h);f.lengthSq()<1e-4&&f.set(1,0,0),f.normalize();let p=this._e2.set(r*f.z-d*f.y,d*f.x-h*f.z,h*f.y-r*f.x).normalize();this.active>0&&(this.active-=t,this.active<=0&&(this.active=0,this.release(!1))),this.glow=st(this.glow,this.ready?1:.25,4,t);let g=this.aP.array,x=this.aF.array,y=this.aB.array,m=0,b=!1;for(let v of this.birds){if(v.st==="off")continue;b=!0,v.t+=t;let T,z,H,I=6,W=4,X=9,$=0,U=0,w=0,E=0;if(v.st==="orbit"){let _=e*1.25+v.i/$t*D,S=1.35+.2*Math.sin(e*.9+v.i*2.1);T=s.x+Math.cos(_)*S,z=s.y+2+.3*Math.sin(e*1.7+v.i*1.3),H=s.z+Math.sin(_)*S,U=-Math.sin(_),w=Math.cos(_),E=1,$=-.45,I=v.t<2.5?10:7,W=v.t<2.5?3:7,X=8+(v.t<2.5?6:0)}else if(v.st==="shield"){let _=Ke[v.i],S=_[2],P=e*S+_[1],B=_[0]*(.7+.3*this.strength)+.08*Math.sin(e*1.3+v.i*2.7),K=.14*Math.sin(e*2.1+v.i*1.9),j=Math.cos(P),Y=Math.sin(P);T=o.x+f.x*j*B+p.x*Y*B+h*K,z=o.y+f.y*j*B+p.y*Y*B+r*K,H=o.z+f.z*j*B+p.z*Y*B+d*K,U=-f.x*Y+p.x*j,w=-f.z*Y+p.z*j,E=v.t>.35?1:0,$=.55,I=14,W=v.t<.5?4:12,X=10}else if(T=v.x+v.ox,z=v.y+v.oy,H=v.z+v.oz,I=9,W=2.5,X=13,v.tsc=Math.max(0,.6-v.t*.45),v.t>1.6){v.st="off",v.sc=0;continue}let R=T-v.x,A=z-v.y,C=H-v.z,L=Math.hypot(R,A,C)||1e-4,V=Math.min(I,L*3.2);v.vx=st(v.vx,R/L*V,W,t),v.vy=st(v.vy,A/L*V,W,t),v.vz=st(v.vz,C/L*V,W,t),v.x+=v.vx*t,v.y+=v.vy*t,v.z+=v.vz*t;let G=Math.hypot(v.vx,v.vy,v.vz),q=E?rt(1.5-G/4,0,1):0,N=v.vx/(G||1)*(1-q)+U*q,k=v.vy/(G||1)*(1-q)*.6,M=v.vz/(G||1)*(1-q)+w*q;v.hx=st(v.hx,N,10,t),v.hy=st(v.hy,k,10,t),v.hz=st(v.hz,M,10,t),v.bank=st(v.bank,$,5,t),v.sc=st(v.sc,v.tsc,6,t),v.ph+=t*(X+Math.max(0,v.vy)*2)*(.7+.3*Math.sin(e*.7+v.i*3.1)*(v.st==="orbit"?1:0)),g[m*4]=v.x,g[m*4+1]=v.y,g[m*4+2]=v.z,g[m*4+3]=v.sc,x[m*4]=v.hx,x[m*4+1]=v.hy,x[m*4+2]=v.hz,x[m*4+3]=v.ph,y[m*2]=v.bank,y[m*2+1]=v.st==="shield"?.6:this.glow,m++}this.geo.instanceCount=m,this.mesh.visible=b,this.shadowMesh&&(this.shadowMesh.visible=this.active>0&&m>0),m&&(this.aP.needsUpdate=!0,this.aF.needsUpdate=!0,this.aB.needsUpdate=!0)}};var pt=(c=0,t=0,e=0)=>new ri.Vector3(c,t,e),Vi=4,Wi=.42,$i=.22,Oi=1.35,oi=1,Gi=4.2,ni=5,Ni=1.1,Ui=.3,Xe=class{constructor(t,e,s){this.app=t,this.ui=e,this.sfx=s;let i=t.world;this.world=i,this.curve=i.curve,this.G=t.G,this.store=t.store,this.tester=new Le(i),this.zifir=new Ve(t.G,i.tex,{segs:t.tier.id>=1?40:28}),this.zifir.g.visible=!1,i.scene.add(this.zifir.g),this.drops=new We(t.G,i.tex,i.scene),this.beams=new Ge(t.G,i.tex,i.scene,i),this.drops.beams=this.beams,this.locks=new Ne(t.G,i.tex,i.scene),this.fx=new Me(t.G,i.tex.particles,{additive:!0}),this.petals=new Me(t.G,i.tex.particles,{additive:!1}),i.scene.add(this.fx.mesh,this.petals.mesh),this.flock=new qe(t.G,i.scene,t.shadow&&t.shadow.scene),this._ft={blocked:(a,o,l,n)=>this.flock.blocks(a,o,l,n)||this.tester.blocked(a,o,l,n)},this.streak=0,this.best=0,this.score=0,this.nearN=0,this.timeScale=1,this._slowT=0,this._slowK=1,this._popT=-9,this._abKey=-1,this._progU=-1,this.prog=Object.assign({unlocked:0,stars:[],dust:0,fails:{},seen:{},intro:!1},this.store.get("progress")||{}),this.settings=Object.assign({sound:!0,haptics:!0,quality:"auto",power:"auto"},this.store.get("settings")||{}),this.sfx.setOn(this.settings.sound),this.state="title",this.stateT=0,this.level=null,this.li=0,this.s=0,this.speed=0,this.hold=!1,this.keyHold=!1,this.meter=1,this.expo=0,this.minMeter=1,this.burnTotal=0,this.sunAz=0,this.sunTarget=0,this.elev=34,this.levelT=0,this.dragged=!1,this.sunDir=pt(0,1,0),this.zp=pt(),this._ahead=pt(),this._smp={},this._smp2={},this._hintUntil=0,this._hintQueue=[],this._pts=[pt(),pt(),pt(),pt(),pt(),pt()],this.rays=t.tier.id>=1?6:4,this.envFrom="spring",this.envTo="spring",this.envT=1,this.envDur=1,this._titleSeason=0,this._onStep=()=>this.sfx.step(),this._bindInput(),this.ui.setToggles(this.settings),this.ui.setPlayLabel(this.prog.unlocked>0||this.prog.intro?"Devam Et":"Ba\u015Fla"),this.goTitle(!0)}_bindInput(){let t=this.app.container,e=null,s=0;t.addEventListener("pointerdown",a=>{this.sfx.unlock(),!a.target.closest("button")&&e===null&&(e=a.pointerId,s=a.clientX,this.state==="intro"&&this.ui.skip(!0))}),t.addEventListener("pointermove",a=>{if(a.pointerId!==e)return;let o=a.clientX-s;s=a.clientX,this.drag(o/Math.max(320,t.clientWidth))});let i=a=>{a.pointerId===e&&(e=null)};t.addEventListener("pointerup",i),t.addEventListener("pointercancel",i),this._onKey=a=>{a.repeat&&a.key!=="ArrowLeft"&&a.key!=="ArrowRight"||(a.key==="ArrowLeft"?this.drag(-.06):a.key==="ArrowRight"?this.drag(.06):(a.key==="f"||a.key==="F"||a.key==="Enter")&&a.type==="keydown"?this.callFlock():a.key===" "?(this.keyHold=a.type==="keydown",a.preventDefault()):a.key==="Escape"&&a.type==="keydown"&&(this.state==="play"||this.state==="ready"?this.pause():this.state==="paused"&&this.resume()))},window.addEventListener("keydown",this._onKey),window.addEventListener("keyup",this._onKey)}drag(t){this.state!=="play"&&this.state!=="ready"||(this.sunTarget-=t*D*.85,!this.dragged&&Math.abs(t)>.004&&(this.dragged=!0,this.state==="ready"&&this._begin()))}wait(t){this.hold=t}_set(t){this.state=t,this.stateT=0,this.app.wake()}envTo2(t,e=2){this.envT<1?this.envFrom=this.envT>.5?this.envTo:this.envFrom:this.envFrom=this.envTo,this.envTo=t,this.envT=0,this.envDur=e}goTitle(t=!1){var e,s;this._set("title"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.show("title"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.flock.hide(),this.sfx.lockCharge(null),this.sfx.music("title"),(s=(e=this.ui).ability)==null||s.call(e,"flock",{count:0,max:$t,ready:!1,active:!1}),this.app.gov.menu=!0,t?(this.envFrom=this.envTo="spring",this.envT=1):this.envTo2("spring",1.5),this._orbit={a:.6,r:84,y:16,ly:25}}goLevels(){this._set("levels"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.renderLevels(oe,this.prog),this.ui.show("levels"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.flock.hide(),this.sfx.music("title"),this.app.gov.menu=!0,this._orbit||(this._orbit={a:.6,r:84,y:16,ly:25})}action(t){if(this.sfx.unlock(),t==="ability:flock")return this.callFlock();if(this.sfx.ui(),t==="play")this.prog.intro?this.startLevel(Math.min(this.prog.unlocked,ke-1)):this.startIntro();else if(t==="levels")this.goLevels();else if(t==="title")this.goTitle();else if(t==="exit")this.app.exit();else if(t.startsWith("lv:")){let e=Number(t.slice(3));e<=this.prog.unlocked?this.startLevel(e):this.ui.toast("\xD6nceki b\xF6l\xFCm\xFC tamamla")}else t==="pause"?this.pause():t==="resume"?this.resume():t==="retry"?this.startLevel(this.li,{retry:!0}):t==="next"?this.startLevel(Math.min(this.li+1,ke-1),{cont:!0}):t==="skip"?this.skipIntro():t==="settings"&&(this._settingsFromTitle=!0,this.ui.$(".uk-card h4").textContent="Ayarlar",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Tamam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="none",this.ui.$("[data-s=pause] [data-a=levels]").style.display="none",this.ui.show("pause"))}toggle(t){let e=this.settings;if(t==="sound")e.sound=!e.sound,this.sfx.setOn(e.sound);else if(t==="haptics")e.haptics=!e.haptics;else if(t==="quality"){let s=["auto",0,1,2];e.quality=s[(s.indexOf(e.quality)+1)%s.length],this.ui.toast("Grafik ayar\u0131 bir sonraki a\xE7\u0131l\u0131\u015Fta uygulan\u0131r")}else if(t==="power"){let s=["auto","saver","performance"];e.power=s[(s.indexOf(e.power)+1)%s.length],this.app.gov.power=e.power,this.app.resize()}this.store.set("settings",e),this.ui.setToggles(e)}pause(){this.state!=="play"&&this.state!=="ready"||(this._paused=this.state,this._set("paused"),this._settingsFromTitle=!1,this.ui.$(".uk-card h4").textContent="Duraklat\u0131ld\u0131",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Devam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="",this.ui.$("[data-s=pause] [data-a=levels]").style.display="",this.ui.show("pause"),this.sfx.tick(0,0,0,!1),this.sfx.lockCharge(null),this.sfx.music("soft"))}resume(){if(this._settingsFromTitle){this._settingsFromTitle=!1,this.ui.show("title");return}this.state==="paused"&&(this.ui.show(null),this._set(this._paused||"play"),this.sfx.music("play"))}haptic(t){if(this.settings.haptics&&!(this.app.hooks.haptic&&this.app.hooks.haptic(t)===!0))try{navigator.vibrate&&navigator.vibrate(t)}catch{}}startIntro(){this._set("intro"),this.ui.show(null),this.ui.hudOn(!1),this.app.gov.menu=!1,this.envFrom=this.envTo="spring",this.envT=1;let t=rs(0);this._setupLevelData(0),this._birds0=0;let e=this.curve.sample(this.s,this._smp),s=this.curve.sample(this.s+3,this._smp2),i=this.app.rig;i.followTarget(pt(e.x,e.y,e.z),pt(s.x,s.y,s.z));let a=i.tPos.clone(),o=i.tLook.clone(),l=Math.atan2(e.z,e.x);i.play([{t:0,pos:pt(Math.cos(l+1.3)*150,-6,Math.sin(l+1.3)*150),look:pt(0,22,0),fov:44},{t:4.5,pos:pt(Math.cos(l+.9)*62,14,Math.sin(l+.9)*62),look:pt(0,30,0),fov:46},{t:8.5,pos:pt(Math.cos(l+.4)*30,59,Math.sin(l+.4)*30),look:pt(0,55,0),fov:50},{t:11.5,pos:a,look:o}],()=>this._enterLevel(0,{fromIntro:!0})),this.sunAz=this.sunTarget=l+Math.PI*.6,this.zifir.g.visible=!0,this._lore=[[.6,"G\xF6k ile yeri bir a\u011Fa\xE7 ba\u011Flar: Ulu Kay\u0131n."],[4.4,"T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 k\xF6klerine d\xFC\u015Ft\xFC."],[8,"G\xFCne\u015F a\u011Fac\u0131n \xE7evresinde d\xF6ner; g\xF6lgesi Zifir\u2019in yoludur."]],this._loreI=0,this.ui.skip(!0)}skipIntro(){this.state==="intro"&&(this.ui.lore(null),this.ui.skip(!1),this.app.rig.skipCine())}_setupLevelData(t){var i,a;this.li=t,this.level=rs(t);let e=this.level;[this.s0,this.s1]=De(this.curve,t),this.s=this.s0,this.drops.setup(this.curve,this.s0,this.s1,e.drops),this.locks.setup(this.curve,this.s0,this.s1,e.locks,e.season),this.ui.setLevel(e),this.ui.setDrops(0,e.drops.length),this.sfx.resetDrops(),this.sfx.season=e.season,this.meter=1,this.minMeter=1,this.burnTotal=0,this.expo=0,this.speed=0,this.levelT=0,this.dragged=!1,this.got=0,this.lostN=0;let s=this.prog.fails[t]||0;this.fails=s,this.mercy=Math.max(.55,1-.12*s),this.burnK=(e.burn||1)*this.mercy,this.streak=0,this.best=0,this.score=0,this.nearN=0,this.unlocks=0,this._shadeD=0,this._birdD=0,this._litT=0,this._shadeT=0,this._wasLit=!1,this._expMin=1,this._scared=!1,this._lastStand=0,this._lastUsed=!1,this._slowT=0,this.timeScale=1,this._tutShade=t!==0,this._flockOn=!1,this._beamHit=!1,this._lkOn=!1,this._pend=null,(this._dropWarn||(this._dropWarn=new Uint8Array(16))).fill(0),this._progU=-1,(a=(i=this.ui).streak)==null||a.call(i,0),this.sfx.streakReset(),this.elev=e.elev[0],zt.str=e.wind,zt.gust=0,this._gate=0,this._lockT=0,this._arcOn=!1,this.ui.lockArc(null)}startLevel(t,{retry:e=!1,cont:s=!1}={}){let i=s&&this.level&&this.li===t-1,a=this.s,o=i?this._carryBirds||0:e&&this.li===t&&this._startBirds||0;this._setupLevelData(t);let l=this.fails>0?Math.min($t,this.fails+1):0;this._birds0=Math.max(o,l),this._mercyBirds=l>o,this._startBirds=o,this.zifir.reset(),this.zifir.g.visible=!0,this.fx.clear(),this.petals.clear(),i?(this._walkFrom=a,this.s=a):this._walkFrom=null,this._enterLevel(t,{retry:e,cont:i})}_enterLevel(t,{retry:e=!1,fromIntro:s=!1,cont:i=!1}={}){let a=this.level;this._set("enter"),this.ui.show(null),this.ui.hudOn(!1),this.ui.lore(null),this.ui.skip(!1),this.app.gov.menu=!1,this.envTo!==a.season&&this.envTo2(a.season,i?3:1.6);let o=this.curve.sample(this.s0,this._smp),l=Math.atan2(o.z,o.x);s?this.sunTarget=l+a.sunStart:this.sunAz=this.sunTarget=l+a.sunStart;let n=this.app.rig,h=this.curve.sample(this.s0+3,this._smp2);if(n.followTarget(pt(o.x,o.y,o.z),pt(h.x,h.y,h.z)),!s&&!e&&!i){let d=n.tPos.clone(),u=n.tLook.clone(),f=n.pos.clone(),p=pt(Math.cos(l-.6)*34,o.y+9,Math.sin(l-.6)*34);n.play([{t:0,pos:f,look:n.look.clone()},{t:1.4,pos:p,look:pt(o.x*.5,o.y+1,o.z*.5)},{t:2.6,pos:d,look:u}],null)}else e?(n.mode="follow",n.snap()):n.mode="follow";this.ui.card(a.kicker,a.title,a.finale?"Son b\xF6l\xFCm":""),this._cardT=e?1.3:2.4,this.ui.setDrops(0,a.drops.length),this._queueHints(a.hints||[]);let r=this.curve.sample(this.s,this._smp);this.zp.set(r.x,r.y,r.z),this.flock.reset(this._birds0||0,this.zp),this._abil(),this.sfx.music("play"),this.sfx.lockCharge(null)}_queueFront(t){this._hintQueue.includes(t)||this._hintQueue.unshift(t)}_queueHints(t){this._hintQueue=t.filter(e=>!this.prog.seen[e])}_showHint(t,e=4.5){this.ui.hint(t),this._hintUntil=this.levelT+e,this._hintKey=t,this.prog.seen[t]=!0,this.store.set("progress",this.prog)}_hintLater(t,e=4.5){this.prog.seen[t]||(this._hintKey?this._pend=[t,e]:this._showHint(t,e))}_begin(){this._set("play"),this.ui.hudOn(!0),this._hintKey==="drag"&&(this.ui.hint(null),this._hintKey=null,this._hintQueue[0]==="hide"&&this._showHint(this._hintQueue.shift(),4.5))}update(t,e){var v,T;this.stateT+=t,this.envT<1&&(this.envT=Math.min(1,this.envT+t/this.envDur));let s=this.state;if(s==="title"||s==="levels")return this._updateOrbit(t,e);if(s==="intro")return this._updateIntro(t,e);if(s==="paused"||s==="complete"||s==="fail"||s==="ending"){this.app.idle=this.stateT>1.2,this._updateZifirOnly(t,e,s==="paused");return}this.app.idle=!1;let i=this.level,a=this.curve,o=this.sunTarget-this.sunAz,l=Vi*t;this.sunAz+=rt(o,-l,l),this._slowT>0&&(this._slowT-=t),this.timeScale=st(this.timeScale,this._slowT>0?this._slowK:1,this._slowT>0?16:4,t),t*=this.timeScale,this.levelT+=s==="play"?t:0,zt.gust=s==="play"?qs(i.gust,this.levelT):0;let n=s==="play"&&ls(i.gust,this.levelT)<1.6&&zt.gust<.05;this.ui.gust(n),n&&!this._gustSoon&&(this.sfx.gustWarn(),this.haptic(6)),this._gustSoon=n,s==="play"&&i.gust&&ls(i.gust,this.levelT)<1.6&&this._hintQueue[0]==="gust"&&this._showHint(this._hintQueue.shift(),4);let h=!1;if(s==="enter")this._cardT-=t,this._cardT<.4&&this.ui.card(null),this._walkFrom!=null&&this.s<this.s0&&(this.s=Math.min(this.s0,this.s+1.6*t),h=!0),this.app.rig.mode!=="cine"&&this._cardT<.6&&(this._walkFrom==null||this.s>=this.s0)&&(this.ui.card(null),this.ui.hudOn(!0),this.li===0&&!this.prog.seen.drag?(this._set("ready"),this._showHint(this._hintQueue.shift()||"drag",999)):(this._set("play"),this._mercyBirds&&(this._pop("Ku\u015Flar yard\u0131ma geldi","good"),this._mercyBirds=!1),this._hintQueue.length&&this._hintQueue[0]!=="gust"&&this._hintQueue[0]!=="bridge"&&this._showHint(this._hintQueue.shift(),4.5),this.flock.ready&&this.li>=1&&this._hintLater("flock",5.5)));else if(s==="ready")this.stateT>7&&this._begin();else if(s==="play"){let z=this.hold||this.keyHold,H=this.locks.limit(this.s),I=this.s>=H-.05,W=rt((H-this.s)/.7,0,1),X=this.expo>.3?Oi:1,$=z?0:i.speed*W*X;if(this.speed=st(this.speed,$,z?14:5,t),this.s=Math.min(this.s+this.speed*t,Math.max(this.s,H)),h=this.speed>.15,I&&!this.prog.seen.lock&&this._showHint("lock",6),this._lockT=I?(this._lockT||0)+t:0,this._lockT>(this.li<=1?2.5:4)?this._lockAssist():this._arcOn&&(this.ui.lockArc(null),this._arcOn=!1),this._hintQueue[0]==="bridge")for(let U of fe){let w=a.sAtTheta(U.th);w>this.s&&w-this.s<9&&this._showHint(this._hintQueue.shift(),4.5)}}let r=a.sample(this.s,this._smp);this.zp.set(r.x,r.y,r.z);let d=a.sample(Math.min(a.length,this.s+3.2),this._smp2);this._ahead.set(d.x,d.y,d.z);let u=Math.atan2(r.z,r.x),f=rt((this.s-this.s0)/(this.s1-this.s0),0,1);this.elev=O(i.elev[0],i.elev[1],f),xe(this.sunAz,this.elev,this.sunDir),this.flock.update(t,e,this.zp,this.sunDir),this._flockOn&&this.flock.active<=0&&(this._flockOn=!1,this.sfx.flockEnd(),this._abil());let p=s==="play";this.tester.setTime(e);let g=0;if(p||s==="ready"){let z=this._pts,H=r.tx,I=r.tz,W=r.sx,X=r.sz;z[0].set(r.x,r.y+.48,r.z),z[1].set(r.x,r.y+.86,r.z),z[2].set(r.x+W*.3,r.y+.36,r.z+X*.3),z[3].set(r.x-W*.3,r.y+.36,r.z-X*.3),z[4].set(r.x+H*.3,r.y+.36,r.z+I*.3),z[5].set(r.x-H*.3,r.y+.36,r.z-I*.3);let $=this._ft;for(let U=0;U<this.rays;U++){let w=z[U];$.blocked(w.x,w.y,w.z,this.sunDir)||g++}g/=this.rays}let x=0;s!=="title"&&s!=="levels"&&(x=this.beams.update(t,e,r.y,this.sunDir,this.tester,this.zp)),this.flock.active>0&&(x=0),x>0&&p&&this._hintQueue[0]!=="crystal"&&!this.prog.seen.crystal&&this._queueFront("crystal"),this.beams.active.length&&p&&this._hintQueue[0]==="crystal"&&(!this._hintKey||x>0)&&this._showHint(this._hintQueue.shift(),5),x>.3&&p&&!this._beamHit&&(this.app.rig.shake=Math.max(this.app.rig.shake,.07)),this._beamHit=x>.3,g=Math.max(g,x),this.expo=st(this.expo,g,18,t);let y=!1;if(p&&(y=this._feel(t,g,r,h)),this.G.uDanger.value=st(this.G.uDanger.value,p?g*.8+(1-this.meter)*.4*g+(this._lastStand>0?.5:0):0,8,t),this.drops.update(t,e,this.s,this.zp,this._ft,this.sunDir,this.fx,()=>{var z,H;this.got++,this.score+=25,this.ui.setDrops(this.got,this.drops.total,"pop"),this.sfx.drop(),this.haptic(12),(H=(z=this.zifir).react)==null||H.call(z,"drop"),this.got===this.drops.total&&!this.lostN&&this.drops.total>1&&(this._pop("B\xFCt\xFCn damlalar!","gold"),this.score+=50)},()=>{this.lostN++,this.ui.setDrops(this.got,this.drops.total,"bad"),this.sfx.dropLost(),this.haptic(40),this.app.rig.shake=Math.max(this.app.rig.shake,.06),this._pop("Damla eridi","bad"),this.prog.seen.drops!==!0&&this._showHint("drops",4)},p),p){let z=this._dropWarn;for(let H of this.drops.list)H.state==="idle"&&H.melt>.18&&!z[H.i]&&(z[H.i]=1,this.sfx.dropWarn(),this._pop("Damla eriyor!","bad"))}(p||s==="ready")&&this.locks.update(t,this.s,this.sunDir,this.tester,this.beams,this.fx,()=>{var H,I;this.sfx.unlockOpen?this.sfx.unlockOpen():this.sfx.win(),this.haptic([15,30,15]),this.app.rig.shake=Math.max(this.app.rig.shake,.14),this.zifir.hop(),(I=(H=this.zifir).react)==null||I.call(H,"safe"),this.unlocks++,this.score+=30;let z=this._lockT<3;this._pop(z?"\xC7abuk a\xE7t\u0131n!":"A\xE7\u0131ld\u0131!","good"),z&&(this.score+=20),this._hintKey==="lock"&&(this.ui.hint(null),this._hintKey=null),this.ui.lockArc(null),this._arcOn=!1,this._lockT=0,this._lkC=0});let m=p?this.locks.pending(this.s):null;if(m&&m.charge>(this._lkC||0)+1e-5?(this.sfx.lockCharge(m.charge),this._lkOn=!0):this._lkOn&&(this.sfx.lockCharge(null),this._lkOn=!1),this._lkC=m?m.charge:0,this._hintKey&&this._hintKey!=="drag"&&this.levelT>this._hintUntil&&(this.ui.hint(null),this._hintKey=null),this._pend&&!this._hintKey&&p){let[z,H]=this._pend;this._pend=null,this.prog.seen[z]||this._showHint(z,H)}if(p&&y?this._die():p&&this.s>=this.s1&&this._win(),s!=="dying"&&s!=="gate"){let z=this._zstate(r,h,h?Math.max(this.speed,1.2):0,s==="play"&&(this.hold||this.keyHold),p?g:0,g,this.meter);this.zifir.update(t,e,z,this._onStep)}let b=this.app.rig;b.mode==="follow"&&b.followTarget(this.zp,this._ahead),this.ui.compass(Ee(this.sunAz-u),g>.01),p&&Math.abs(f-this._progU)>.004&&(this._progU=f,(T=(v=this.ui).progress)==null||T.call(v,f)),this.sfx.intensity=st(this.sfx.intensity,p?rt((this.streak-2)/14,0,1):0,1.2,t),this.sfx.tick(t,p?g:0,zt.str+zt.gust,p,this.meter),this._commonFx(t)}_feel(t,e,s,i){var o,l,n,h,r,d;let a=e<.01;if(a?this.meter=Math.min(1,this.meter+$i*t):(this.meter-=e*Wi*this.burnK*t,this.burnTotal+=e*t,Math.random()<t*22*e&&Te(this.fx,s.x,s.y+.7,s.z,.9)),e>.15?(this._litT+=t,this._shadeT=0):a&&(this._shadeT+=t,this._litT=0),!this._wasLit&&this._litT>.12?this._enterLight():this._wasLit&&this._shadeT>.1&&this._exitLight(),this._wasLit&&(this._expMin=Math.min(this._expMin,this.meter),!this._scared&&this.meter<.3&&(this._scared=!0,(l=(o=this.zifir).react)==null||l.call(o,"scared"),this.haptic([20,30,20]))),!this._tutShade&&a&&this._shadeT>.3&&(this._tutShade=!0,this._pop("G\xF6lgede!","gold"),this.sfx.milestone(5),(h=(n=this.zifir).react)==null||h.call(n,"safe")),a&&i){let u=this.speed*t;for(this._shadeD+=u;this._shadeD>=oi;)this._shadeD-=oi,this._streakUp();this.flock.count<$t&&this.flock.active<=0&&(this._birdD+=u,this._birdD>=Gi&&(this._birdD=0,this._birdJoin()))}if(this._lastStand>0){if(this._lastStand-=t,a)this._lastStand=0,this._wasLit=!1,this._slowT=0,this.meter=Math.max(this.meter,.15),this._nearMiss(!0);else if(this.meter=Math.max(this.meter,.001),this._lastStand<=0)return!0}else if(this.meter<=0){if(this._lastUsed)return!0;this._lastUsed=!0,this._lastStand=Ni,this.meter=.001,this._slow(.45,.9),this.sfx.lastStand(),this._pop("Son nefes!","bad"),this.haptic([40,30,60]),this.app.rig.shake=Math.max(this.app.rig.shake,.18),(d=(r=this.zifir).react)==null||d.call(r,"scared")}return this.minMeter=Math.min(this.minMeter,this.meter),!1}_enterLight(){var t,e,s,i;this._wasLit=!0,this._expMin=this.meter,this._scared=!1,this.sfx.burnStart(),this.haptic(10),this.app.rig.shake=Math.max(this.app.rig.shake,.05),(e=(t=this.zifir).react)==null||e.call(t,"burn"),this.streak>=5?(this._pop("Seri bozuldu","bad"),this.sfx.streakBreak(this.streak)):this.sfx.streakReset(),this.streak&&(this.streak=0,(i=(s=this.ui).streak)==null||i.call(s,0)),this._shadeD=0}_exitLight(){var t,e;this._wasLit=!1,this._expMin<Ui?this._nearMiss(!1):(e=(t=this.zifir).react)==null||e.call(t,"safe")}_nearMiss(t){var e,s;this.nearN++,this.score+=t?40:15,this._pop(t?"K\u0131l pay\u0131!!":"K\u0131l pay\u0131!","gold"),this.sfx.nearMiss(),this.haptic([20,40,30]),(s=(e=this.zifir).react)==null||s.call(e,"safe"),this._slow(.35,t?.55:.35),this.app.rig.shake=Math.max(this.app.rig.shake,.08),Yt(this.fx,this.zp.x,this.zp.y+.7,this.zp.z,t?26:16,[1.4,1.1,2.6])}_streakUp(){var e,s,i,a;let t=++this.streak;if(t>this.best&&(this.best=t),this.score+=1+Math.floor(t/10),(s=(e=this.ui).streak)==null||s.call(e,t),t%5===0){let o=t%10===0;this._pop(`G\xF6lge serisi \xD7${t}`,o?"gold":"good"),this.sfx.milestone(t),this.haptic(o?[12,30,12]:10),o&&Yt(this.fx,this.zp.x,this.zp.y+.9,this.zp.z,14,[1.2,1,2.4]),t===10&&((a=(i=this.app.hooks).onStreak)==null||a.call(i,t)),t===5&&this._hintLater("streak",4.5)}else t>=3&&this.sfx.streak(t)}_birdJoin(){if(!this.flock.add(this.zp))return;let t=this.flock.count;this.sfx.birdJoin(t),this.haptic(6),this._abil(),t===$t&&(this._pop("S\xFCr\xFC haz\u0131r!","gold"),this.sfx.flockReady(),this.haptic([10,20,10]),this.li>=1&&this._hintLater("flock",5.5))}callFlock(){var t,e;if(this.state==="play"){if(!this.flock.ready){if(this.flock.active>0)return;this.sfx.ui(),this._pop(`S\xFCr\xFC toplan\u0131yor ${this.flock.count}/${$t}`,"bad");return}this.flock.activate(ni,this.zp),this._flockOn=!0,this.sfx.flockGo(),this.haptic([15,25,15,25,40]),this.app.rig.shake=Math.max(this.app.rig.shake,.1),this._pop("S\xFCr\xFC!","gold"),(e=(t=this.zifir).react)==null||e.call(t,"safe"),this._hintKey==="flock"&&(this.ui.hint(null),this._hintKey=null),this._abil()}}_abil(){var s,i;let t=this.flock,e=t.count*4+(t.ready?1:0)+(t.active>0?2:0);e!==this._abKey&&(this._abKey=e,(i=(s=this.ui).ability)==null||i.call(s,"flock",{count:t.count,max:$t,ready:t.ready,active:t.active>0,dur:ni}))}_pop(t,e="good"){var i,a;let s=this.app.time;e!=="gold"&&s-this._popT<.7||(this._popT=s,(a=(i=this.ui).pop)==null||a.call(i,t,e))}_slow(t,e){this._slowK=t,this._slowT=e}_lockAssist(){if(this._assistT=(this._assistT||0)-1,this._assistT>0)return;this._assistT=15;let t=this.locks.pending(this.s);if(!t)return;let e=this.curve.sample(this.s,{}),s=Math.atan2(e.z,e.x),i=this._Lt||(this._Lt=pt()),a=[];for(let h=0;h<72;h++){let r=h/72*D-Math.PI;xe(s+r,this.elev,i);let d=!1;for(let f of[.48,.86,.36])this.tester.blocked(e.x,e.y+f,e.z,i)||(d=!0);if(d)continue;let u=!1;for(let f of[1,1.7,.8])this.tester.blocked(t.x,t.y+f,t.z,i)||(u=!0);u&&a.push(r)}if(!a.length)return;let o=Ee(this.sunAz-s),l=null,n=0;for(;n<a.length;){let h=n;for(;h+1<a.length&&a[h+1]-a[h]<.1;)h++;let r=(a[n]+a[h])/2,d=Math.abs(Ee(r-o));(!l||d<l.d)&&(l={a0:a[n]-.04,a1:a[h]+.04,d}),n=h+1}this.ui.lockArc(l.a0,l.a1),this._arcOn=!0}_zstate(t,e,s,i,a,o,l){let n=this._zs||(this._zs={});return n.x=t.x,n.y=t.y,n.z=t.z,n.yaw=Math.atan2(t.tx,t.tz),n.moving=e,n.speed=s,n.hold=i,n.burn=a,n.lit=o,n.meter=l,n}_commonFx(t){this.fx.update(t),this.petals.update(t),this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp)}_updateZifirOnly(t,e,s){if(s)return;let i=this.curve.sample(this.s,this._smp);(this.state==="complete"||this.state==="ending")&&this.zifir.update(t,e,this._zstate(i,!1,0,!1,0,0,1)),this.flock.update(t,e,this.zp,this.sunDir),this._commonFx(t)}_updateOrbit(t,e){let s=this._orbit;s.a+=t*.05;let i=this.app.rig;i.mode="manual";let a=this.app.rig.aspect<1?s.r*1.12:s.r;i.pos.set(Math.cos(s.a)*a,s.y+Math.sin(e*.1)*3,Math.sin(s.a)*a),i.look.set(0,s.ly,0),this.sunAz=s.a+1.1+Math.sin(e*.07)*.6,this.elev=30;let o=["spring","summer","autumn","winter"];if(this._titleSeason+=t,this._titleSeason>9){this._titleSeason=0;let l=o[(o.indexOf(this.envTo)+1)%4];this.envTo2(l,3)}zt.str=.25,zt.gust=0,this.elev=null,this.app.sunAz=this.sunAz,this.app.elev=null,this.sfx.season=this.envTo==="night"?"night":this.envTo,this.sfx.tick(t,0,.25,!1),this.app.focus.set(0,30,0),this.app.idle=!1,this.fx.update(t),this.petals.update(t)}_updateIntro(t,e){let s=this.app.rig,i=s.cine?s.cine.t:99;for(;this._loreI<this._lore.length&&i>=this._lore[this._loreI][0];)this.ui.lore(this._lore[this._loreI][1]),this._loreI++;i>10.6&&this.ui.lore(null);let a=this.curve.sample(this.s,this._smp);this.zp.set(a.x,a.y,a.z),this.zifir.update(t,e,this._zstate(a,!1,0,!1,0,0,1)),this.sunAz+=t*.12,this.elev=34,this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp),this.fx.update(t),this.petals.update(t),!s.cine&&this.state==="intro"&&(this.prog.intro=!0,this.store.set("progress",this.prog))}_die(){var a,o;this._set("dying"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),(o=(a=this.ui).streak)==null||o.call(a,0),this.sfx.fail(),this.sfx.lockCharge(null),this.sfx.music("soft"),this.haptic([30,40,60]),this.app.rig.shake=Math.max(this.app.rig.shake,.32),this.flock.release(!1),this._flockOn=!1,this._slowT=0,this.timeScale=1,this.prog.fails[this.li]=(this.prog.fails[this.li]||0)+1,this.store.set("progress",this.prog);let t=performance.now(),e=this.zifir,s=this.zp.clone(),i=()=>{let l=Math.min(1,(performance.now()-t)/1300);e.evaporate(l),Math.random()<.6&&Te(this.fx,s.x,s.y+.4,s.z,1.3),this.app.wake(),l<1?requestAnimationFrame(i):(this._set("fail"),this.G.uDanger.value=0,this.ui.showFail({progress:rt((this.s-this.s0)/(this.s1-this.s0),0,1),mercy:this.prog.fails[this.li]>=1}))};requestAnimationFrame(i)}_win(){var d,u;let t=this.level;this._set(t.finale?"gate":"won"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.G.uDanger.value=0,this.zifir.celebrate?this.zifir.celebrate():this.zifir.hop(),this.sfx.win(),this.sfx.lockCharge(null),this.sfx.music("soft"),this.haptic([20,40,20,40,60]),this.app.rig.shake=Math.max(this.app.rig.shake,.12),this._carryBirds=this.flock.active>0?0:this.flock.count,this.flock.release(!0),this._flockOn=!1,this._slow(.5,.45),(u=(d=this.ui).streak)==null||u.call(d,0);let e=this.zp,s={spring:0,summer:3,autumn:1,winter:2}[t.season];for(let f=0;f<60;f++){let p=Math.random()*D,g=Math.random()*3.4;this.petals.emit(e.x+Math.cos(p)*g,e.y+3+Math.random()*3.5,e.z+Math.sin(p)*g,(Math.random()-.5)*1.2,-.3-Math.random()*.6,(Math.random()-.5)*1.2,3+Math.random()*1.5,.22,.2,.25,.6,1,1,1,1,s,(Math.random()-.5)*4)}Yt(this.fx,e.x,e.y+.8,e.z,36,[2.6,2,.9]),Yt(this.fx,e.x,e.y+.5,e.z,18,[1.4,1.1,2.6]),t.finale||this._heroCam();let i=this.drops.total,a=[!0,i===0||this.got===i,this.minMeter>.9],o=a.filter(Boolean).length;this.score+=50+(a[2]?50:0);let l=this.prog.stars[this.li]||0,n=10+this.got*5+(a[2]?10:0)+(o===3?10:0)+Math.floor(this.best/5)*2+this.nearN*3,h=o>l?n:Math.round(n*.25);this.prog.stars[this.li]=Math.max(l,o),this.prog.unlocked=Math.min(ke-1,Math.max(this.prog.unlocked,this.li+1)),this.prog.dust+=h,this.prog.fails[this.li]=0;let r=(this.prog.best||[])[this.li]||0;(this.prog.best||(this.prog.best=[]))[this.li]=Math.max(r,this.best),this.store.set("progress",this.prog),this.app.hooks.onReward&&this.app.hooks.onReward({level:this.li,stars:o,dust:h,drops:this.got,streak:this.best}),this._result={title:t.title,kicker:t.kicker,stars:a,dust:h,last:this.li===ke-1,best:this.best,record:this.best>r&&r>0,score:this.score,near:this.nearN,unlocks:this.unlocks},t.finale?this._gateSeq():setTimeout(()=>{this.state==="won"&&(this._set("complete"),this.ui.showComplete(this._result))},1500)}_heroCam(){let t=this.app.rig,e=this.curve.sample(Math.min(this.curve.length,this.s+3.6),{}),s=this.zp,i=Math.hypot(e.x,e.z)||1,a=pt(e.x+e.x/i*.35,e.y+1.7,e.z+e.z/i*.35),o=pt(s.x,s.y+1.35,s.z);t.play([{t:0,pos:t.pos.clone(),look:t.look.clone()},{t:3.1,pos:a,look:o}],null)}_gateSeq(){let t=this.world.island,e=t.gatePos.clone(),s=this.zp.clone(),i=this.app.rig,a=t.gateOut,o=e.clone().addScaledVector(a,14).add(pt(0,4,0));i.play([{t:0,pos:i.pos.clone(),look:i.look.clone()},{t:2.2,pos:e.clone().addScaledVector(a,9).add(pt(0,2.5,0)),look:e.clone()},{t:6.5,pos:o.add(pt(0,16,0)),look:pt(0,22,0),fov:55}],null),this.envTo2("night",5),this.sfx.season="night";let l=performance.now(),n=this.zifir,h=()=>{let r=(performance.now()-l)/1e3,d=rt((r-.6)/1.6,0,1),u=s.clone().lerp(pt(e.x,s.y,e.z),d);n.g.position.copy(u),n.setFade(1-Ht(.7,1,d)),this.world.gateMat.uniforms.uOpen.value=Ht(0,1.2,r),r<7?requestAnimationFrame(h):(n.g.visible=!1,this._set("ending"),this.ui.showEnding(this.prog.dust))};requestAnimationFrame(h)}envState(){let t=this.envT;return[this.envFrom,this.envTo,t*t*(3-2*t)]}destroy(){window.removeEventListener("keydown",this._onKey),window.removeEventListener("keyup",this._onKey)}};var li=`
.uk-root{--ivory:#fff6e8;--ivory2:rgba(255,246,232,.82);--ivory3:rgba(255,246,232,.6);
  --gold:#f5c66e;--gold2:#ffe0a0;--gold3:#e9a14a;--violet:#b3a6ff;--violet2:#7d6bea;--ember:#ff8a4c;--ember2:#ffc29a;
  --ink:#120d22;--ink2:#1c1533;--line:rgba(255,224,160,.24);--line2:rgba(255,224,160,.5);
  --panel:linear-gradient(180deg,rgba(38,29,68,.95) 0%,rgba(19,13,36,.95) 100%);
  --pshadow:0 10px 28px rgba(6,3,16,.5),inset 0 1px 0 rgba(255,240,210,.1);
  --tsh:0 1px 2px rgba(6,3,16,.95),0 2px 14px rgba(6,3,16,.75);
  --sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px);
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;--sans:'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-family:var(--sans);color:var(--ivory);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.uk-root *{box-sizing:border-box;margin:0;padding:0}
.uk-canvas{position:absolute;inset:0;display:block;touch-action:none;outline:none}
.uk-ui{position:absolute;inset:0;pointer-events:none;-webkit-font-smoothing:antialiased}
/* :where \u2192 \xF6zg\xFCll\xFCk d\xFC\u015F\xFCk kal\u0131r; .uk-ico, .uk-lv gibi s\u0131n\u0131flar\u0131n arka plan\u0131 ezilmez */
:where(.uk-ui) button{font-family:var(--sans);-webkit-appearance:none;appearance:none;border:0;background:none;color:inherit;cursor:pointer;touch-action:manipulation;pointer-events:auto;text-align:inherit}
.uk-ui svg{display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.uk-ui svg .f,.uk-ui svg.f{fill:currentColor;stroke:none}
.uk-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;opacity:0;visibility:hidden;transition:opacity .45s ease,visibility 0s linear .45s}
.uk-scr.on{opacity:1;visibility:visible;transition:opacity .45s ease,visibility 0s}
.uk-scr.on .uk-tap{pointer-events:auto}
/* kaybolurken (opakl\u0131k ge\xE7i\u015Fi s\xFCrerken) ikinci dokunu\u015F tetiklenmesin */
.uk-scr:not(.on) button,.uk-scr:not(.on) .uk-list,.uk-hud:not(.on) button{pointer-events:none}

/* ---- d\xFC\u011Fmeler ---- */
.uk-btn{position:relative;height:60px;min-width:240px;padding:0 32px;border-radius:999px;font-weight:800;font-size:16px;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap;
  display:inline-flex;align-items:center;justify-content:center;gap:10px;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .3s}
.uk-btn b{font-weight:800}
.uk-btn svg{width:20px;height:20px;flex:none;stroke-width:2.4}
.uk-btn:active{transform:scale(.94)}
.uk-btn.pri{color:#2e1906;background:linear-gradient(180deg,#fff4d6 0%,#ffd98a 48%,#eba24b 100%);
  box-shadow:0 12px 30px rgba(255,165,60,.32),0 3px 0 #b86e22,inset 0 1px 0 #fff,inset 0 -3px 8px rgba(160,80,10,.28)}
.uk-btn.pri::after{content:"";position:absolute;inset:-5px;border-radius:inherit;border:1.5px solid rgba(255,224,160,.6);animation:ukHalo 2.6s ease-in-out infinite;pointer-events:none}
@keyframes ukHalo{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:.85;transform:scale(1.035)}}
.uk-btn.gh{height:52px;min-width:0;padding:0 22px;font-size:14px;letter-spacing:.11em;color:var(--ivory);background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow)}
.uk-btn.gh svg{width:18px;height:18px;color:var(--gold2)}
.uk-ico{width:48px;height:48px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--ivory);background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);
  transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-ico:active{transform:scale(.9)}
.uk-ico svg{width:22px;height:22px;stroke-width:2.4}

/* ---- ba\u015Fl\u0131k ---- */
.uk-title{justify-content:flex-start;padding:calc(var(--sat) + 14px) 20px calc(var(--sab) + 30px)}
.uk-title .sky{position:absolute;left:0;right:0;top:0;height:calc(var(--sat) + 440px);pointer-events:none;
  background:radial-gradient(1px 1px at 12% 18%,#fff 60%,transparent),radial-gradient(1.2px 1.2px at 84% 12%,#fff 60%,transparent),radial-gradient(1px 1px at 70% 30%,#fff 60%,transparent),
  radial-gradient(1px 1px at 26% 36%,#fff 60%,transparent),radial-gradient(1.4px 1.4px at 92% 40%,#ffe9c0 60%,transparent),radial-gradient(1px 1px at 6% 44%,#fff 60%,transparent),
  linear-gradient(180deg,rgba(11,7,25,.95) 0%,rgba(11,7,25,.9) 50%,rgba(11,7,25,.66) 70%,rgba(11,7,25,.24) 86%,rgba(11,7,25,0) 100%)}
.uk-title .sky i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff6e0;box-shadow:0 0 6px 1px rgba(255,236,190,.8);animation:ukTw 3.2s ease-in-out infinite}
.uk-title .sky i:nth-child(1){left:18%;top:9%}.uk-title .sky i:nth-child(2){left:78%;top:22%;animation-delay:-1.1s}.uk-title .sky i:nth-child(3){left:9%;top:30%;animation-delay:-2.3s}
.uk-title .sky i:nth-child(4){left:90%;top:6%;animation-delay:-.6s}.uk-title .sky i:nth-child(5){left:60%;top:5%;animation-delay:-1.8s}.uk-title .sky i:nth-child(6){left:36%;top:46%;animation-delay:-2.8s;opacity:.6}
.uk-title .sky i:nth-child(7){left:66%;top:44%;animation-delay:-1.4s}
@keyframes ukTw{0%,100%{opacity:.25}50%{opacity:1}}
.uk-title .foot{position:absolute;left:0;right:0;bottom:0;height:34%;pointer-events:none;background:linear-gradient(0deg,rgba(11,7,25,.92) 0%,rgba(11,7,25,.66) 40%,rgba(11,7,25,0) 100%)}
.uk-title .top{position:relative;width:100%;display:flex}
.uk-brand{position:relative;text-align:center;margin-top:clamp(0px,2vh,24px);display:flex;flex-direction:column;align-items:center}
.emb{width:70px;height:70px;overflow:visible}
.emb .er path{stroke:var(--gold);stroke-width:2.6}
.emb .es circle{fill:#d9d0ff;stroke:none}
.emb .en{fill:#1a1236;stroke:none}
.emb .ed{fill:#f5c66e}
.emb .et{stroke:#fff6e8;stroke-width:2.4}
.emb .eo{fill:none;stroke:var(--gold2);stroke-width:1.6}
.uk-brand .k{display:flex;align-items:center;gap:10px;margin-top:14px;font-size:12px;font-weight:800;letter-spacing:.28em;white-space:nowrap;text-transform:uppercase;color:var(--gold2);text-shadow:var(--tsh)}
.uk-brand .k i{width:clamp(12px,6vw,30px);height:1.5px;background:linear-gradient(90deg,rgba(255,224,160,0),var(--gold))}
.uk-brand .k i:last-child{transform:scaleX(-1)}
.uk-brand h1{position:relative;font-family:var(--serif);font-style:italic;font-weight:700;font-size:clamp(64px,20vw,112px);line-height:1.02;margin-top:2px;padding:0 .1em;letter-spacing:-.005em;white-space:nowrap}
.uk-brand h1::before{content:attr(data-t);position:absolute;left:0;right:0;top:0;padding:inherit;color:transparent;text-shadow:0 3px 0 rgba(70,34,6,.75),0 8px 30px rgba(6,3,16,.85),0 0 60px rgba(255,180,90,.35)}
.uk-brand h1 span{position:relative;display:block;background:linear-gradient(180deg,#fffbf2 10%,#ffe6b0 45%,#f5b964 75%,#dd8c3a 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.uk-brand .tag{margin-top:4px;font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(20px,5.8vw,25px);color:var(--ivory);text-shadow:var(--tsh)}
.uk-title.on .uk-brand{animation:ukRise 1s cubic-bezier(.2,.9,.3,1) both}
.uk-title.on .acts{animation:ukRise 1s cubic-bezier(.2,.9,.3,1) .18s both}
@keyframes ukRise{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:none}}
.uk-title .acts{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:auto}
.uk-title .row{display:flex;gap:12px}
.uk-title .row .uk-btn{min-width:140px}

/* ---- b\xF6l\xFCmler (mevsim yolu) ---- */
.uk-levels{padding:calc(var(--sat) + 12px) 16px 0;background:linear-gradient(180deg,rgba(11,7,25,.94) 0%,rgba(11,7,25,.8) 26%,rgba(11,7,25,.74) 60%,rgba(11,7,25,.92) 100%)}
.uk-levels .hd{width:100%;max-width:560px;display:flex;align-items:center;gap:12px;flex:none}
.uk-levels .ttl{flex:1;text-align:center}
.uk-levels .ttl small{display:block;font-size:11px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:var(--gold2)}
.uk-levels .ttl h5{font-family:var(--serif);font-style:italic;font-weight:700;font-size:34px;line-height:1.05}
.uk-dpill{height:40px;min-width:48px;padding:0 13px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);font-weight:800;font-size:15px;color:var(--gold2);font-variant-numeric:tabular-nums}
.uk-dpill i{font-style:normal;font-size:14px}
.uk-list{flex:1;min-height:0;width:100%;max-width:560px;overflow-y:auto;overflow-x:hidden;padding:10px 0 calc(var(--sab) + 22px);pointer-events:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:none}
.uk-list::-webkit-scrollbar{display:none}
.uk-ssn{position:relative;padding-bottom:8px}
.uk-levels.on .uk-ssn{animation:ukRise .6s cubic-bezier(.2,.9,.3,1) both;animation-delay:var(--d,0s)}
.uk-ssn[data-s=spring]{--sc:#ffb3cf;--sc2:#ff86b0}.uk-ssn[data-s=summer]{--sc:#a8e57c;--sc2:#6cc048}
.uk-ssn[data-s=autumn]{--sc:#ffc361;--sc2:#f0902c}.uk-ssn[data-s=winter]{--sc:#cfe0ff;--sc2:#93b2ee}
.uk-ssn::before{content:"";position:absolute;left:22px;top:44px;bottom:0;width:2px;margin-left:-1px;background:linear-gradient(180deg,var(--sc),rgba(255,246,232,.14))}
.uk-ssn:last-child::before{bottom:40px}
.uk-ssn header{position:relative;display:flex;align-items:center;gap:12px;height:48px}
.uk-ssn .ic{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#2e2350,#150f2b);border:2px solid var(--sc);box-shadow:0 0 16px rgba(0,0,0,.4)}
.uk-ssn .ic svg{width:24px;height:24px;color:var(--sc)}
.uk-ssn .ic svg .c{fill:#fff6e8;stroke:#fff6e8}
.uk-ssn .ic svg path.c{fill:none;stroke:#1a1236;stroke-width:1.6}
.uk-ssn .nm{flex:1;display:flex;align-items:baseline;gap:10px;min-width:0}
.uk-ssn .nm b{font-size:14px;font-weight:800;letter-spacing:.26em;text-transform:uppercase;color:var(--sc);text-shadow:var(--tsh)}
.uk-ssn .nm span{font-family:var(--serif);font-style:italic;font-weight:600;font-size:18px;color:var(--ivory2);text-shadow:var(--tsh);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-ssn header em{display:inline-flex;align-items:center;gap:4px;font-style:normal;font-size:14px;font-weight:800;color:var(--gold2);font-variant-numeric:tabular-nums;text-shadow:var(--tsh)}
.uk-ssn header em svg{width:15px;height:15px}
.uk-ssn.lock .ic{border-color:rgba(255,246,232,.25)}.uk-ssn.lock .ic svg{color:rgba(255,246,232,.35)}.uk-ssn.lock .nm b{color:var(--ivory3)}
.uk-lv{position:relative;display:flex;align-items:center;gap:10px;width:100%;margin-top:8px;transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.uk-lv:active{transform:scale(.97)}
.uk-lv .no{position:relative;z-index:1;flex:none;width:32px;height:32px;margin:0 6px;border-radius:50%;display:grid;place-items:center;background:#1a1236;border:2px solid var(--sc);color:var(--sc)}
.uk-lv .no b{font-size:14px;font-weight:800}
.uk-lv .no svg{width:16px;height:16px;stroke-width:3}
.uk-lv.done .no{background:var(--sc);color:#1a1236}
.uk-lv.cur .no{background:linear-gradient(180deg,#fff2cc,#f5b65c);border-color:#fff2cc;color:#3a2008}
.uk-lv.cur .no svg{width:14px;height:14px;margin-left:2px}
.uk-lv.cur .no::after{content:"";position:absolute;inset:-7px;border-radius:50%;border:2px solid var(--gold2);animation:ukRing 1.6s ease-out infinite}
.uk-lv.lock .no{border-color:rgba(255,246,232,.25);color:var(--ivory3);background:#150f2b}
.uk-lv .cd{flex:1;min-width:0;display:flex;align-items:center;gap:10px;min-height:68px;padding:10px 16px;border-radius:18px;background:var(--panel);border:1px solid var(--line);box-shadow:var(--pshadow);border-left:3px solid var(--sc)}
.uk-lv .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.uk-lv small{font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--gold2)}
.uk-lv .tx b{font-family:var(--serif);font-style:italic;font-weight:700;font-size:25px;line-height:1.08;color:var(--ivory);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-lv .st{display:flex;gap:2px;flex:none}
.uk-lv .st i{width:19px;height:19px;color:rgba(255,246,232,.2)}
.uk-lv .st i svg{width:100%;height:100%}
.uk-lv .st i.on{color:#ffd26e}
.uk-lv .go{flex:none;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#3a2008;background:linear-gradient(180deg,#fff2cc,#f5b65c)}
.uk-lv.cur .cd{border-color:rgba(255,224,160,.8);border-left-color:var(--sc);box-shadow:0 0 0 1px rgba(255,224,160,.35),0 0 26px rgba(255,190,100,.28),var(--pshadow)}
.uk-lv.lock .cd{background:rgba(17,12,32,.88);border-color:rgba(255,246,232,.1);border-left-color:rgba(255,246,232,.2);box-shadow:none}
.uk-lv.lock .tx b{color:var(--ivory3)}.uk-lv.lock small{color:rgba(255,224,160,.55)}

/* ---- oyun i\xE7i ---- */
.uk-hud{--cw:clamp(118px,33vw,140px);position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .4s,visibility 0s linear .4s;pointer-events:none}
.uk-hud.on{opacity:1;visibility:visible;transition:opacity .4s,visibility 0s}
.uk-hud .top{position:absolute;left:0;right:0;top:0;padding:calc(var(--sat) + 12px) calc(var(--sar) + 14px) 0 calc(var(--sal) + 14px);display:flex;align-items:flex-start;justify-content:space-between;pointer-events:none}
.uk-hud .lvl{position:absolute;left:50%;top:calc(var(--sat) + 10px);transform:translateX(-50%);width:max-content;min-width:150px;max-width:calc(100% - 196px);padding:6px 18px 9px;border-radius:18px;text-align:center;
  background:var(--panel);border:1px solid var(--line);box-shadow:var(--pshadow)}
.uk-hud[data-season=spring]{--sc:#ffb3cf}.uk-hud[data-season=summer]{--sc:#a8e57c}.uk-hud[data-season=autumn]{--sc:#ffc361}.uk-hud[data-season=winter]{--sc:#cfe0ff}
.uk-hud .lvl::before{content:"";position:absolute;left:22%;right:22%;top:-1px;height:2px;border-radius:2px;background:var(--sc,var(--gold2))}
.uk-hud .lvl small{display:block;font-size:11px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--gold2);white-space:nowrap}
.uk-hud .lvl b{display:block;font-family:var(--serif);font-style:italic;font-weight:700;font-size:22px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-hud .pg{position:relative;height:4px;margin-top:5px;border-radius:4px;background:rgba(255,246,232,.14);display:none}
.uk-hud.pg .pg{display:block}
.uk-hud .pf{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,var(--violet2),var(--gold2));transform-origin:0 50%;transform:scaleX(0)}
.uk-hud .ph{position:absolute;inset:0}
.uk-hud .ph i{position:absolute;left:-6px;top:-4px;width:12px;height:12px;border-radius:50%;background:#140e26;border:2px solid var(--violet);box-shadow:0 0 8px rgba(179,166,255,.9)}
.uk-pill{height:48px;padding:0 16px 0 13px;border-radius:999px;display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:19px;font-variant-numeric:tabular-nums;
  background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow)}
.uk-pill i{width:14px;height:19px;border-radius:50% 50% 50% 50%/62% 62% 40% 40%;background:radial-gradient(circle at 40% 70%,#3a2c6c,#0e0a1c 70%);box-shadow:0 0 0 2px #c4b9ff,0 0 12px rgba(179,166,255,.85);transform:rotate(180deg)}
.uk-pill.full{border-color:#c4b9ff;color:#e6e0ff}
.uk-pill.pop0{animation:ukBumpA .35s cubic-bezier(.3,1.8,.5,1)}.uk-pill.pop1{animation:ukBumpB .35s cubic-bezier(.3,1.8,.5,1)}
@keyframes ukBumpA{0%{transform:scale(1.25)}100%{transform:scale(1)}}@keyframes ukBumpB{0%{transform:scale(1.25)}100%{transform:scale(1)}}
.uk-pill.bad0{animation:ukShakeA .4s;border-color:var(--ember)}.uk-pill.bad1{animation:ukShakeB .4s;border-color:var(--ember)}
@keyframes ukShakeA{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes ukShakeB{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}

/* g\xF6lge serisi */
.uk-streak{position:absolute;right:calc(var(--sar) + 14px);top:calc(var(--sat) + 70px);min-width:86px;padding:5px 12px 7px;border-radius:16px;display:flex;flex-direction:column;align-items:center;
  background:var(--panel);border:1.5px solid rgba(179,166,255,.7);box-shadow:0 0 18px rgba(125,107,234,.35),var(--pshadow);opacity:0;transform:scale(.6);transform-origin:100% 0;transition:opacity .25s,transform .35s cubic-bezier(.3,1.7,.5,1)}
.uk-streak.on{opacity:1;transform:none}
.uk-streak b{display:block;font-size:26px;font-weight:800;line-height:1.05;color:#efeaff;text-shadow:0 0 14px rgba(179,166,255,.9);font-variant-numeric:tabular-nums}
.uk-streak small{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--violet);white-space:nowrap}
.uk-streak.hot{border-color:var(--gold2);box-shadow:0 0 22px rgba(255,200,110,.45),var(--pshadow)}
.uk-streak.hot b{color:var(--gold2);text-shadow:0 0 14px rgba(255,190,90,.9)}.uk-streak.hot small{color:var(--gold2)}
.uk-streak.p0 b{animation:ukPopA .5s cubic-bezier(.3,1.9,.5,1)}.uk-streak.p1 b{animation:ukPopB .5s cubic-bezier(.3,1.9,.5,1)}
@keyframes ukPopA{0%{transform:scale(1.8)}100%{transform:scale(1)}}@keyframes ukPopB{0%{transform:scale(1.8)}100%{transform:scale(1)}}

/* u\xE7an geri bildirim */
.uk-pop{position:absolute;left:50%;top:calc(var(--sat) + 136px);padding:7px 18px;border-radius:999px;font-size:18px;font-weight:800;letter-spacing:.02em;white-space:nowrap;
  background:var(--panel);border:1.5px solid rgba(179,166,255,.7);color:#e9e4ff;box-shadow:var(--pshadow);opacity:0;transform:translate(-50%,0);pointer-events:none}
.uk-pop.gold{border-color:var(--gold2);color:var(--gold2);box-shadow:0 0 20px rgba(255,200,110,.4),var(--pshadow)}
.uk-pop.bad{border-color:var(--ember);color:var(--ember2);background:linear-gradient(180deg,rgba(70,26,14,.95),rgba(36,12,8,.95))}
.uk-pop.a{animation:ukFloatA 1.3s ease-out forwards}.uk-pop.b{animation:ukFloatB 1.3s ease-out forwards}
@keyframes ukFloatA{0%{opacity:0;transform:translate(-50%,14px) scale(.6)}14%{opacity:1;transform:translate(-50%,0) scale(1.1)}24%{transform:translate(-50%,0) scale(1)}72%{opacity:1;transform:translate(-50%,-14px) scale(1)}100%{opacity:0;transform:translate(-50%,-38px) scale(.96)}}
@keyframes ukFloatB{0%{opacity:0;transform:translate(-50%,14px) scale(.6)}14%{opacity:1;transform:translate(-50%,0) scale(1.1)}24%{transform:translate(-50%,0) scale(1)}72%{opacity:1;transform:translate(-50%,-14px) scale(1)}100%{opacity:0;transform:translate(-50%,-38px) scale(.96)}}

/* g\xFCne\u015F pusulas\u0131: ortada a\u011Fa\xE7, altta Zifir, kenarda g\xFCne\u015F, g\xF6vdenin g\xF6lgesi koyu \u015Ferit */
.uk-compass{position:absolute;left:calc(var(--sal) + 12px);bottom:calc(var(--sab) + 14px);width:var(--cw);height:var(--cw);pointer-events:none}
.uk-compass svg{width:100%;height:100%;overflow:visible}
.uk-compass .base{fill:#160f2c;stroke:rgba(255,224,160,.55);stroke-width:1.5}
.uk-compass .trk{fill:none;stroke:rgba(255,224,160,.28);stroke-width:1.5;stroke-dasharray:1.5 4.5}
.uk-compass .gnd{fill:url(#uk-cg);opacity:.92}
.uk-compass .band{fill:url(#uk-cs);opacity:.94}
.uk-compass .trunk{fill:#f6efe2;stroke:#2a1f48;stroke-width:2}
.uk-compass .bark{stroke:#3a2f4e;stroke-width:1.8}
.uk-compass .zif{fill:#140e26;stroke:#c4b9ff;stroke-width:2.4}
.uk-compass .eye{fill:#fff6e8}
.uk-compass .halo{fill:#b3a6ff;opacity:.28}
.uk-compass.hot .zif{stroke:#ff8a4c}
.uk-compass.hot .halo{fill:#ff8a4c;opacity:.55}
/* yanma uyar\u0131s\u0131: SVG yerine HTML halkas\u0131 (birle\u015Ftirici katmanda, yeniden boyama yok) */
.uk-compass .zh{position:absolute;left:50%;top:73.44%;width:26%;height:26%;margin:-13% 0 0 -13%;border-radius:50%;border:2.5px solid var(--ember);opacity:0;pointer-events:none}
.uk-compass.hot .zh{animation:ukRing .8s ease-out infinite}
.uk-compass .sun .glow{fill:#ffd36e;opacity:.3}
.uk-compass .sun .disc{fill:#ffd66e;stroke:#fff4cc;stroke-width:2}
.uk-compass .sun .ray{stroke:#ffcf6a;stroke-width:2.6}
.uk-compass .win{fill:none;stroke:#ffe9b8;stroke-width:8;stroke-linecap:round}
.uk-compass .cs{position:absolute;left:50%;top:-38px;transform:translateX(-50%);padding:4px 12px 5px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;
  background:#1d1540;border:1.5px solid #b3a6ff;color:#e6e0ff;box-shadow:0 4px 12px rgba(6,3,16,.5)}
.uk-compass.hot .cs{background:#47190b;border-color:var(--ember);color:#ffd9bf}

/* Bekle ve yetenek */
.uk-wait{position:absolute;right:calc(var(--sar) + 14px);bottom:calc(var(--sab) + 18px);width:94px;height:94px;border-radius:50%;pointer-events:auto;touch-action:none;color:var(--ivory);
  background:radial-gradient(circle at 50% 30%,#3e2f78,#171030 72%);border:2px solid rgba(179,166,255,.75);
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;transition:transform .15s,border-color .2s;box-shadow:0 10px 26px rgba(6,3,16,.55),inset 0 1px 0 rgba(255,255,255,.14)}
.uk-wait b{font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:800}
.uk-wait svg{width:28px;height:28px;stroke-width:2.2}
.uk-wait.dn{transform:scale(.92);border-color:var(--gold2);background:radial-gradient(circle at 50% 30%,#5e4a9e,#251a4a 72%)}
.uk-wait::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2.5px solid var(--gold2);opacity:0;pointer-events:none}
.uk-hud.gst .uk-wait{border-color:var(--gold2)}
.uk-hud.gst .uk-wait::after{animation:ukRing 1s ease-out infinite}
@keyframes ukRing{0%{opacity:.95;transform:scale(.88)}100%{opacity:0;transform:scale(1.28)}}
.uk-ab{position:absolute;right:calc(var(--sar) + 122px);bottom:calc(var(--sab) + 31px);width:68px;height:68px;border-radius:50%;color:var(--ivory);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:var(--panel);border:2px solid var(--line2);box-shadow:var(--pshadow);
  opacity:0;visibility:hidden;transform:scale(.6);transition:opacity .3s,transform .35s cubic-bezier(.3,1.7,.5,1),visibility 0s linear .3s}
.uk-ab.on{opacity:1;visibility:visible;transform:none;transition:opacity .3s,transform .35s cubic-bezier(.3,1.7,.5,1)}
.uk-ab:active{transform:scale(.9)}
.uk-ab .ai svg{width:28px;height:28px}
.uk-ab .al{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;line-height:1}
.uk-ab .pp{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);display:flex;gap:4px;padding:3px 6px;border-radius:999px;background:#140e26;border:1px solid var(--line)}
.uk-ab .pp i{width:7px;height:7px;border-radius:50%;background:rgba(255,246,232,.2)}
.uk-ab .pp i.on{background:var(--gold2);box-shadow:0 0 5px rgba(255,210,120,.9)}
.uk-ab::after{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px solid var(--gold2);opacity:0;pointer-events:none}
.uk-ab.ready{border-color:var(--gold2);color:var(--gold2);box-shadow:0 0 22px rgba(255,200,110,.45),var(--pshadow)}
.uk-ab.ready::after{animation:ukRing 1.3s ease-out infinite}
.uk-ab.active{background:radial-gradient(circle at 50% 35%,#6a55c0,#251a4a);border-color:#d6ceff;color:#fff}

/* ipucu kart\u0131: kontrollerin hemen \xFCst\xFCnde, simgeli tek c\xFCmle */
.uk-hint{position:absolute;left:50%;bottom:calc(var(--sab) + var(--cw) + 56px);width:min(calc(100% - 24px),440px);display:flex;align-items:center;gap:14px;padding:13px 18px 13px 13px;border-radius:20px;
  background:var(--panel);border:1px solid var(--line2);box-shadow:0 14px 34px rgba(6,3,16,.55),inset 0 1px 0 rgba(255,240,210,.1);
  opacity:0;transform:translate(-50%,12px);transition:opacity .35s,transform .45s cubic-bezier(.2,1.4,.4,1);pointer-events:none}
.uk-hint.on{opacity:1;transform:translate(-50%,0)}
.uk-hint .hi{flex:none;width:50px;height:50px;border-radius:15px;display:grid;place-items:center;color:#3a2008;background:linear-gradient(180deg,#fff2cc,#f2b25a);box-shadow:inset 0 1px 0 #fff,0 4px 12px rgba(240,160,70,.3)}
.uk-hint .hi svg{width:28px;height:28px;stroke-width:2.1}
.uk-hint p{text-wrap:balance;font-size:16px;line-height:1.38;font-weight:500;color:var(--ivory)}
.uk-hint em{font-style:normal;color:var(--gold2);font-weight:800}
.uk-hand{position:absolute;left:50%;bottom:calc(var(--sab) + var(--cw) + 176px);width:200px;height:56px;margin-left:-100px;opacity:0;transition:opacity .3s;pointer-events:none}
.uk-hand.on{opacity:1}
.uk-hand .tr{position:absolute;left:10px;right:10px;top:50%;height:3px;margin-top:-1.5px;border-radius:3px;background:linear-gradient(90deg,rgba(255,224,160,0),rgba(255,224,160,.9) 30%,rgba(255,224,160,.9) 70%,rgba(255,224,160,0))}
.uk-hand .tr::before,.uk-hand .tr::after{content:"";position:absolute;top:50%;width:11px;height:11px;margin-top:-6px;border:solid var(--gold2);border-width:0 0 3px 3px;transform:rotate(45deg)}
.uk-hand .tr::before{left:4px}.uk-hand .tr::after{right:4px;transform:rotate(-135deg)}
.uk-hand .fg{position:absolute;left:50%;top:6px;width:52px;height:52px;margin-left:-26px;border-radius:50%;display:grid;place-items:center;color:#2e1906;background:radial-gradient(circle at 50% 35%,#fff6dc,#f6c66e);
  box-shadow:0 0 0 4px rgba(255,224,160,.3),0 8px 20px rgba(6,3,16,.5)}
.uk-hand .fg svg{width:30px;height:30px;stroke-width:1.9}
.uk-hand.on .fg{animation:ukSwipe 1.8s ease-in-out infinite}
@keyframes ukSwipe{0%,100%{transform:translateX(-64px)}50%{transform:translateX(64px)}}

.uk-gust{position:absolute;right:calc(var(--sar) + 14px);bottom:calc(var(--sab) + 126px);display:flex;align-items:center;gap:8px;padding:8px 15px 8px 12px;border-radius:999px;
  background:linear-gradient(180deg,rgba(78,34,14,.96),rgba(42,16,8,.96));border:1.5px solid var(--ember);color:#ffdcc4;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;
  box-shadow:0 0 20px rgba(255,120,60,.35),var(--pshadow);opacity:0;transform:translateY(8px);transition:opacity .3s,transform .35s cubic-bezier(.3,1.6,.5,1)}
.uk-gust svg{width:20px;height:20px;color:var(--ember2)}
.uk-gust.on{opacity:1;transform:none}
.uk-gust.on svg{animation:ukGustI .6s ease-in-out infinite alternate}
@keyframes ukGustI{0%{transform:translateX(-2px)}100%{transform:translateX(3px)}}

.uk-toast{text-wrap:balance;position:absolute;left:50%;top:calc(var(--sat) + 82px);width:max-content;max-width:calc(100% - 32px);padding:11px 18px;border-radius:16px;font-size:15px;font-weight:700;line-height:1.35;text-align:center;
  background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);opacity:0;transform:translate(-50%,-8px);transition:opacity .3s,transform .3s}
.uk-toast.on{opacity:1;transform:translate(-50%,0)}

/* ---- b\xF6l\xFCm ad\u0131 kart\u0131 (sinematik \u015Ferit) ---- */
.uk-card-title{position:absolute;left:0;right:0;top:27%;padding:22px 16px 24px;text-align:center;opacity:0;transition:opacity .5s;pointer-events:none}
.uk-card-title .bd{position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,7,25,0) 0%,rgba(11,7,25,.86) 20%,rgba(11,7,25,.86) 80%,rgba(11,7,25,0) 100%);transform:scaleX(.5);transition:transform .8s cubic-bezier(.2,.9,.3,1)}
.uk-card-title .bd::before,.uk-card-title .bd::after{content:"";position:absolute;left:10%;right:10%;height:1.5px;background:linear-gradient(90deg,rgba(255,224,160,0),var(--gold),rgba(255,224,160,0))}
.uk-card-title .bd::before{top:0}.uk-card-title .bd::after{bottom:0}
.uk-card-title.on{opacity:1}.uk-card-title.on .bd{transform:none}
.uk-card-title small{position:relative;display:block;font-size:13px;font-weight:800;letter-spacing:.36em;text-transform:uppercase;color:var(--gold2)}
.uk-card-title b{position:relative;display:block;margin-top:2px;font-family:var(--serif);font-style:italic;font-weight:700;font-size:clamp(46px,13.5vw,74px);line-height:1.06;color:var(--ivory);text-shadow:0 3px 0 rgba(6,3,16,.5),0 6px 24px rgba(6,3,16,.8);
  transform:translateY(10px);transition:transform .9s cubic-bezier(.2,.9,.3,1)}
.uk-card-title.on b{transform:none}
.uk-card-title span{position:relative;display:block;font-family:var(--serif);font-style:italic;font-weight:600;font-size:21px;color:var(--gold2)}
.uk-card-title span:empty{display:none}

/* ---- a\xE7\u0131l\u0131\u015F efsanesi ---- */
.uk-lore{position:absolute;left:0;right:0;bottom:0;padding:120px 28px calc(var(--sab) + 70px);text-align:center;opacity:0;transition:opacity .9s;pointer-events:none;
  background:linear-gradient(0deg,rgba(11,7,25,.94) 0%,rgba(11,7,25,.78) 42%,rgba(11,7,25,0) 100%)}
.uk-lore.on{opacity:1}
.uk-lore .orn{display:block;width:120px;height:10px;margin:0 auto 14px;background:radial-gradient(circle,var(--gold2) 0 2.5px,transparent 3px),linear-gradient(90deg,rgba(255,224,160,0),var(--gold) 45%,var(--gold) 55%,rgba(255,224,160,0)) center/100% 1.5px no-repeat}
.uk-lore p{text-wrap:balance;max-width:520px;margin:0 auto;font-family:var(--serif);font-style:italic;font-weight:600;font-size:clamp(23px,6.6vw,30px);line-height:1.28;color:var(--ivory);text-shadow:var(--tsh)}
.uk-lore p.a{animation:ukLoreA .9s ease-out}.uk-lore p.b{animation:ukLoreB .9s ease-out}
@keyframes ukLoreA{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}@keyframes ukLoreB{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}
.uk-skip{position:absolute;right:calc(var(--sar) + 14px);top:calc(var(--sat) + 14px);height:42px;padding:0 16px 0 18px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;
  font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:var(--ivory);background:var(--panel);border:1px solid var(--line2);box-shadow:var(--pshadow);opacity:0;visibility:hidden;transition:opacity .4s,visibility 0s linear .4s}
.uk-skip span{font-size:20px;line-height:1;margin-top:-2px;color:var(--gold2)}
.uk-skip.on{opacity:1;visibility:visible;transition:opacity .4s,visibility 0s}
.uk-fade{position:absolute;inset:0;background:#0d0a1e;opacity:0;transition:opacity .5s;pointer-events:none}
.uk-fade.on{opacity:1}

/* ---- biti\u015F ekranlar\u0131 ---- */
.uk-end{justify-content:center;padding:calc(var(--sat) + 16px) 16px calc(var(--sab) + 16px);background:radial-gradient(ellipse at 50% 45%,rgba(11,7,25,.55) 0%,rgba(11,7,25,.88) 75%)}
.uk-sheet{position:relative;width:min(100%,384px);margin-top:44px;padding:58px 22px 22px;border-radius:30px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;
  background:linear-gradient(180deg,rgba(40,30,72,.98) 0%,rgba(18,12,34,.98) 100%);border:1px solid var(--line2);box-shadow:0 26px 60px rgba(6,3,16,.6),inset 0 1px 0 rgba(255,240,210,.12);
  transform:translateY(18px) scale(.97);transition:transform .55s cubic-bezier(.2,1.25,.4,1)}
.uk-scr.on .uk-sheet{transform:none}
.uk-sheet .rays{position:absolute;left:50%;top:-118px;width:240px;height:240px;margin-left:-120px;pointer-events:none;opacity:.9}
.uk-sheet .rays svg{width:100%;height:100%;fill:rgba(255,214,130,.22);stroke:none;animation:ukSpin 30s linear infinite}
@keyframes ukSpin{to{transform:rotate(360deg)}}
.uk-sheet .med{position:absolute;left:50%;top:-46px;width:92px;height:92px;margin-left:-46px;border-radius:50%;display:grid;place-items:center;color:#3a2008;
  background:radial-gradient(circle at 50% 32%,#fff6d8,#ffd27a 55%,#e48e36);border:3px solid #fff0c8;box-shadow:0 0 0 7px rgba(255,210,120,.16),0 0 40px rgba(255,190,90,.5),0 10px 24px rgba(6,3,16,.5)}
.uk-sheet .med svg{width:50px;height:50px;stroke-width:2}
.uk-end .k{font-size:12px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:var(--gold2)}
.uk-end h2{font-family:var(--serif);font-style:italic;font-weight:700;font-size:clamp(40px,11vw,50px);line-height:1.04;color:var(--ivory)}
.uk-end .ban{margin-top:2px;padding:5px 16px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2e1906;background:linear-gradient(180deg,#fff2cc,#f5b65c)}
.uk-end .sub{text-wrap:balance;font-family:var(--serif);font-style:italic;font-weight:600;font-size:20px;line-height:1.3;color:var(--ivory2);max-width:330px}
.uk-end .sub b{font-family:var(--sans);font-style:normal;font-weight:800;font-size:17px;color:var(--gold2)}
.uk-stars{display:flex;justify-content:center;align-items:flex-end;gap:8px;margin:12px 0 4px}
.uk-star{width:96px;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12.5px;font-weight:700;line-height:1.2;color:var(--ivory3)}
.uk-star .sh{position:relative;width:60px;height:60px}
.uk-star.s1 .sh{width:76px;height:76px}
.uk-star .sh i,.uk-star .sh b{position:absolute;inset:0;clip-path:polygon(50% 2%,62% 35%,97% 36%,69% 58%,79% 93%,50% 73%,21% 93%,31% 58%,3% 36%,38% 35%)}
.uk-star .sh i{background:rgba(255,246,232,.13)}
.uk-star .sh b{background:linear-gradient(180deg,#fff8de 0%,#ffd76e 45%,#ef9535 100%);opacity:0;transform:scale(.2) rotate(-40deg);transition:transform .6s cubic-bezier(.3,1.9,.45,1),opacity .2s}
.uk-star .sh::after{content:"";position:absolute;inset:-14px;border-radius:50%;border:2.5px solid var(--gold2);opacity:0;pointer-events:none}
.uk-star.on{color:var(--ivory)}
.uk-star.on .sh b{opacity:1;transform:none}
.uk-star.on .sh::after{animation:ukBurst .75s ease-out}
@keyframes ukBurst{0%{opacity:1;transform:scale(.35)}100%{opacity:0;transform:scale(1.5)}}
.uk-dust{display:inline-flex;align-items:center;gap:8px;margin-top:4px;padding:9px 20px;border-radius:999px;font-size:16px;font-weight:800;color:var(--gold2);
  background:rgba(255,210,120,.1);border:1px solid rgba(255,210,120,.4);font-variant-numeric:tabular-nums;transition:transform .3s cubic-bezier(.3,1.8,.5,1)}
.uk-dust i{font-style:normal}
.uk-dust b{font-size:20px;color:#fff1cc}
.uk-dust span{font-weight:700;color:var(--ivory2)}
.uk-dust.done{animation:ukBumpA .4s cubic-bezier(.3,1.8,.5,1)}
.uk-end .acts{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:14px;width:100%}
.uk-end .acts .uk-btn.pri{width:100%;min-width:0}
.uk-end .row{display:flex;gap:10px;width:100%}
.uk-end .row .uk-btn{flex:1}
.uk-end .acts > .uk-btn.gh{width:100%}
/* ba\u015Far\u0131s\u0131z */
.uk-end.fail .med{color:#e6e0ff;background:radial-gradient(circle at 50% 32%,#4a3a8c,#1a1236 70%);border-color:var(--ember);box-shadow:0 0 0 7px rgba(255,138,76,.16),0 0 36px rgba(255,120,60,.4),0 10px 24px rgba(6,3,16,.5)}
.uk-end.fail .med svg{stroke-width:2.2}
.uk-end.fail .k{color:var(--ember2)}
.uk-prog{position:relative;width:100%;max-width:290px;height:10px;margin:18px 0 8px;border-radius:10px;background:rgba(255,246,232,.12)}
.uk-prog .fp{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,var(--violet2),var(--ember));transform-origin:0 50%;transform:scaleX(0);transition:transform 1s cubic-bezier(.2,.8,.3,1) .35s}
.uk-prog .fz{position:absolute;inset:0;transition:transform 1s cubic-bezier(.2,.8,.3,1) .35s}
.uk-prog .fz i{position:absolute;left:-10px;top:-5px;width:20px;height:20px;border-radius:50%;background:#140e26;border:2.5px solid var(--ember);box-shadow:0 0 10px rgba(255,138,76,.8)}
.uk-prog .g0{position:absolute;left:-4px;top:1px;width:8px;height:8px;border-radius:50%;background:var(--violet)}
.uk-prog .g1{position:absolute;right:-16px;top:-11px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:var(--gold2);background:#1a1236;border:1.5px solid var(--line2)}
.uk-prog .g1 svg{width:17px;height:17px}
.uk-mercy{display:flex;gap:12px;align-items:center;text-align:left;margin-top:8px;padding:12px 14px;border-radius:16px;font-size:15px;line-height:1.4;color:var(--ivory);
  background:rgba(255,200,110,.1);border:1px solid rgba(255,210,120,.35)}
.uk-mercy svg{flex:none;width:30px;height:30px;color:var(--gold2)}
.uk-mercy b{color:var(--gold2);font-weight:800}
/* final */
.uk-end.night{background:radial-gradient(ellipse at 50% 40%,rgba(11,7,25,.45) 0%,rgba(11,7,25,.9) 75%)}
.uk-end.night .med{background:radial-gradient(circle at 50% 35%,#2e2356,#120c26);border-color:var(--gold2)}
.uk-end.night .med .emb{width:66px;height:66px}

/* ---- duraklat / ayarlar ---- */
.uk-pause{justify-content:center;padding:calc(var(--sat) + 12px) 16px calc(var(--sab) + 12px);background:rgba(9,6,20,.72)}
.uk-card{width:min(100%,360px);padding:22px 20px 20px;border-radius:30px;display:flex;flex-direction:column;gap:12px;align-items:stretch;
  background:linear-gradient(180deg,rgba(40,30,72,.98) 0%,rgba(18,12,34,.98) 100%);border:1px solid var(--line2);box-shadow:0 26px 60px rgba(6,3,16,.6),inset 0 1px 0 rgba(255,240,210,.12);
  transform:translateY(14px) scale(.97);transition:transform .45s cubic-bezier(.2,1.25,.4,1)}
.uk-scr.on .uk-card{transform:none}
.uk-card h4{font-family:var(--serif);font-style:italic;font-weight:700;font-size:36px;line-height:1.1;text-align:center}
.uk-card .cb,.uk-card .ct{display:flex;flex-direction:column;gap:10px}
.uk-card .ct{padding-top:14px;border-top:1px solid rgba(255,224,160,.16);gap:8px}
.uk-card .uk-btn{min-width:0;width:100%}
.uk-card .uk-btn.pri{height:58px}
.uk-tog{display:flex;align-items:center;gap:12px;height:52px;padding:0 10px 0 14px;border-radius:16px;font-size:16px;font-weight:700;color:var(--ivory);
  background:rgba(255,246,232,.06);border:1px solid rgba(255,246,232,.1);transition:transform .15s}
.uk-tog:active{transform:scale(.97)}
.uk-tog svg{width:22px;height:22px;flex:none;color:var(--gold2)}
.uk-tog span{flex:1;text-align:left}
.uk-tog b{min-width:96px;padding:6px 12px;border-radius:999px;text-align:center;font-size:13px;font-weight:800;color:#2e1906;background:linear-gradient(180deg,#fff2cc,#f5b65c)}
.uk-tog.off b{color:var(--ivory2);background:rgba(255,246,232,.1)}
.uk-tog.off svg{color:var(--ivory3)}

/* ---- yatay ve k\u0131sa ekran ---- */
@media (max-height:700px) and (orientation:portrait){
  .emb{width:56px;height:56px}.uk-brand .k{margin-top:10px}
  .uk-sheet{padding-top:52px;gap:4px}.uk-stars{margin:8px 0 2px}.uk-end .acts{margin-top:10px}
  .uk-lv .cd{min-height:60px;padding:8px 14px}.uk-lv .tx b{font-size:23px}
}
@media (orientation:landscape) and (max-height:520px){
  .uk-title{padding-top:calc(var(--sat) + 10px);padding-bottom:calc(var(--sab) + 16px)}
  .uk-title .sky{height:calc(var(--sat) + 300px)}.uk-title .foot{height:34%}
  .uk-brand{margin-top:-30px}.emb{width:46px;height:46px}.uk-brand .k{margin-top:6px}
  .uk-brand h1{font-size:72px}.uk-brand .tag{font-size:20px;margin-top:0}
  .uk-title .acts{flex-direction:row;gap:12px}.uk-title .acts .uk-btn.pri{min-width:220px}
  .uk-levels .hd{max-width:none}.uk-levels .ttl h5{font-size:28px}
  .uk-list{max-width:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-content:start}
  .uk-ssn .nm span{display:none}.uk-ssn header{height:44px}
  .uk-lv .cd{min-height:0;padding:9px 12px;flex-direction:column;align-items:flex-start;gap:4px}
  .uk-lv .tx b{font-size:21px}.uk-lv .no{margin:0 4px 0 6px}
  .uk-hud{--cw:112px}
  .uk-hud .lvl{max-width:300px}
  .uk-hint{left:calc(var(--sal) + var(--cw) + 26px);right:calc(var(--sar) + 220px);width:auto;max-width:520px;bottom:calc(var(--sab) + 16px);transform:translateY(12px)}
  .uk-hint.on{transform:none}
  .uk-hand{bottom:calc(var(--sab) + 130px)}
  .uk-wait{width:84px;height:84px}
  .uk-ab{right:calc(var(--sar) + 110px);bottom:calc(var(--sab) + 26px);width:62px;height:62px}
  .uk-gust{bottom:calc(var(--sab) + 114px)}
  .uk-card-title{top:22%}
  .uk-lore{padding-top:70px;padding-bottom:calc(var(--sab) + 34px)}
  .uk-end{justify-content:center}
  .uk-sheet{width:min(100%,660px);margin-top:0;padding:16px 22px 16px;display:grid;grid-template-columns:1fr 1fr;column-gap:22px;row-gap:4px;align-items:center}
  .uk-sheet .rays,.uk-sheet .med{display:none}
  .uk-sheet > *{grid-column:1;justify-self:center}
  .uk-sheet .acts,.uk-sheet .uk-mercy{grid-column:2;grid-row:1 / span 6;margin:0;justify-self:stretch}
  .uk-pop{top:calc(var(--sat) + 84px)}
  .uk-sheet .uk-mercy{grid-row:1 / span 2;align-self:end}
  .uk-end.fail .uk-sheet .acts{grid-row:3 / span 4;align-self:start}
  .uk-end h2{font-size:40px}.uk-stars{margin:4px 0 0}.uk-star .sh{width:46px;height:46px}.uk-star.s1 .sh{width:56px;height:56px}
  .uk-card{width:min(100%,640px);display:grid;grid-template-columns:1fr 1fr;column-gap:18px;row-gap:10px;padding:16px 20px}
  .uk-card h4{grid-column:1 / span 2;font-size:30px}
  .uk-card .ct{padding-top:0;border-top:0}
}
@media (prefers-reduced-motion:reduce){
  .uk-btn.pri::after,.uk-title .sky i,.uk-lv.cur .no::after,.uk-compass.hot .zh,.uk-hud.gst .uk-wait::after,.uk-ab.ready::after,
  .uk-sheet .rays svg,.uk-gust.on svg,.uk-hand.on .fg{animation:none}
  .uk-pop.a,.uk-pop.b{animation-name:ukFadeOnly}
  @keyframes ukFadeOnly{0%{opacity:0;transform:translate(-50%,0)}15%,75%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,0)}}
  .uk-streak.p0 b,.uk-streak.p1 b,.uk-pill.pop0,.uk-pill.pop1,.uk-pill.bad0,.uk-pill.bad1,.uk-star.on .sh::after,.uk-dust.done,.uk-lore p.a,.uk-lore p.b{animation:none}
  .uk-star .sh b{transform:none}
  .uk-title.on .uk-brand,.uk-title.on .acts,.uk-levels.on .uk-ssn{animation:none}
}
`;var ht=(c,t="")=>`<svg viewBox="0 0 24 24"${t?` class="${t}"`:""} aria-hidden="true">${c}</svg>`,Q={back:ht('<path d="M15 5l-7 7 7 7"/>'),pause:ht('<path d="M9 6.5v11M15 6.5v11"/>'),play:ht('<path d="M8.5 5.8v12.4c0 .7.8 1.1 1.4.7l9.2-6.2c.5-.4.5-1.1 0-1.4L9.9 5.1c-.6-.4-1.4 0-1.4.7z"/>',"f"),path:ht('<path d="M8 14.5h8.6a3.8 3.8 0 0 0 .8-7.5 5.5 5.5 0 0 0-10.7-.3A3.9 3.9 0 0 0 8 14.5z"/><path d="M12 14.5v5M12 17l-2.3-1.8M12 16l2.3-1.6M8.5 21.5c1.4-.3 2.5-1 3.5-2.2 1 1.2 2.1 1.9 3.5 2.2"/>'),gear:ht('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),retry:ht('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 4v4.5H9"/>'),next:ht('<path d="M5 12h13M13 6l6 6-6 6"/>'),home:ht('<path d="M4 11.5L12 4l8 7.5M6.5 9.5V20h11V9.5"/>'),sound:ht('<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>'),vibe:ht('<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7"/>'),gem:ht('<path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/>'),battery:ht('<rect x="3" y="7.5" width="15.5" height="9" rx="2"/><path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3"/>'),hand:ht('<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 13.5c-.6-1 .6-2.2 1.6-1.5L8 15"/>'),hourglass:ht('<path d="M6.5 3h11M6.5 21h11"/><path d="M8 3v2.5c0 2.3 4 4.2 4 6.5s-4 4.2-4 6.5V21M16 3v2.5c0 2.3-4 4.2-4 6.5s4 4.2 4 6.5V21"/>'),drop:ht('<path d="M12 3.2c3.6 4.4 6.2 7.5 6.2 10.8a6.2 6.2 0 0 1-12.4 0c0-3.3 2.6-6.4 6.2-10.8z"/>'),sun:ht('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),shade:ht('<circle cx="15.5" cy="8" r="3.8"/><path d="M15.5 1.8v1.4M21.7 8h-1.4M19.9 3.6l-1 1M19.9 12.4l-1-1"/><rect class="f" x="7" y="2.5" width="5.6" height="19" rx="1.6"/><path d="M7 15.5l-4.5 3.5M7 19.5l-2.5 2"/>'),leaf:ht('<path d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path d="M5 19.5l8.5-8.5"/>'),ledge:ht('<path d="M3 8h18M6 8v2.5M18 8v2.5M5 18h14"/><path d="M8.5 11.5L6.5 16M12.5 11.5l-2 4.5M16.5 11.5l-2 4.5"/>'),wind:ht('<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15.5a3 3 0 1 1-3 3M3 16.5h7"/>'),gate:ht('<path d="M5 21V11a7 7 0 0 1 14 0v10M3.5 21h17M12 21v-5.5"/>'),crystal:ht('<path d="M12 2.5l5 6-5 13-5-13z"/><path d="M7 8.5h10M12 2.5v19"/>'),bud:ht('<path d="M12 21v-6.5"/><path d="M12 14.5c-3.4 0-5.4-2.9-5.4-6.4 1.8.6 3.9-1.2 5.4-4.6 1.5 3.4 3.6 5.2 5.4 4.6 0 3.5-2 6.4-5.4 6.4z"/><path d="M12 18c-2 0-3.5-1-4.5-2.5M12 18c2 0 3.5-1 4.5-2.5"/>'),birds:ht('<path d="M3 9.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M12 15.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M5.5 19.5c1.2-1.4 2.6-1.4 3.6 0 1-1.4 2.4-1.4 3.6 0"/>'),lock:ht('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),check:ht('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),star:ht('<path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6l-5.6 3.2 1.3-6.2L3 9.3l6.3-.7z"/>',"f"),blossom:ht('<g class="f"><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="2.2" class="c"/>'),sleaf:ht('<path class="f" d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path class="c" d="M5 19.5l8.5-8.5"/>'),maple:ht('<path class="f" d="M12 2.5l1.6 3.8 3.4-1.5-.9 4.2 4.4.5-2.9 3.1 2.2 2.4-4.4.3.6 3.4L12 16.4l-4 2.3.6-3.4-4.4-.3 2.2-2.4L3.5 9.5l4.4-.5L7 4.8l3.4 1.5z"/><path class="c" d="M12 16.4v5"/>'),flake:ht('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5M4 10.5l3.4.9-.9 3.4M20 13.5l-3.4-.9.9-3.4M5 13.6l3.4-.9-.9-3.4M19 10.4l-3.4.9.9 3.4"/>')},ci=`<svg class="emb" viewBox="-40 -40 80 80" aria-hidden="true">
	<g class="er">${Array.from({length:9},(c,t)=>{let e=(-80+t*20)*(Math.PI/180);return`<path d="M${(Math.cos(e)*29).toFixed(1)} ${(Math.sin(e)*29).toFixed(1)}L${(Math.cos(e)*36).toFixed(1)} ${(Math.sin(e)*36).toFixed(1)}"/>`}).join("")}</g>
	<g class="es"><circle cx="-31" cy="-10" r="1.4"/><circle cx="-26" cy="14" r="1"/><circle cx="-33" cy="6" r=".9"/><circle cx="-20" cy="-27" r="1.1"/></g>
	<circle class="en" r="23"/>
	<path class="ed" d="M0-23A23 23 0 0 1 0 23Z"/>
	<path class="et" d="M0 23V-6M0 4l-7-7M0-1l7-8M0-6l-4-7M0-6l3-8"/>
	<circle class="eo" r="23"/>
</svg>`,hi=`<svg viewBox="-100 -100 200 200" aria-hidden="true">${Array.from({length:16},(c,t)=>`<path transform="rotate(${t*22.5})" d="M-5 -34L0 -98L5 -34Z"/>`).join("")}</svg>`,qi={drag:["hand","Parma\u011F\u0131n\u0131 sa\u011Fa sola kayd\u0131r: <em>g\xFCne\u015F</em> a\u011Fac\u0131n \xE7evresinde d\xF6ner."],hide:["shade","G\xFCne\u015Fi <em>g\xF6vdenin arkas\u0131na</em> al. A\u011Fac\u0131n g\xF6lgesi Zifir\u2019i korur."],drops:["drop","<em>Gece damlalar\u0131n\u0131</em> topla. I\u015F\u0131kta erirler, onlar\u0131 da g\xF6lgede tut."],bridge:["leaf","K\xF6pr\xFCde g\xF6vde uzakta: <em>yapraklar\u0131n g\xF6lgesine</em> s\u0131\u011F\u0131n."],ledge:["ledge","G\xFCne\u015F tepedeyken <em>\xFCstteki patika</em> da g\xF6lge verir."],wait:["hourglass","<em>Bekle</em>\u2019ye bas\u0131l\u0131 tut: Zifir durur, sen g\xF6lgeyi haz\u0131rlars\u0131n."],gust:["wind","<em>Sert r\xFCzg\xE2r</em> yapraklar\u0131 savurur. <em>Bekle</em>, dinsin."],gate:["gate","G\xFCne\u015F bat\u0131yor. Zifir\u2019i <em>K\xF6k Kap\u0131s\u0131</em>\u2019na ula\u015Ft\u0131r!"],crystal:["crystal","<em>Kristaller</em> \u0131\u015F\u0131\u011F\u0131 yans\u0131t\u0131r. I\u015F\u0131n Zifir\u2019e de\u011Fmesin."],lock:["bud","Tomurcuk \u0131\u015F\u0131kla a\xE7\u0131l\u0131r: ona <em>\u0131\u015F\u0131k</em>, Zifir\u2019e <em>g\xF6lge</em> d\xFC\u015F\xFCr."],streak:["shade","G\xF6lgede y\xFCr\xFCd\xFCk\xE7e <em>g\xF6lge serisi</em> b\xFCy\xFCr. Seri, Zifir\u2019e g\xF6lge ku\u015Flar\u0131 toplar."],flock:["birds","<em>S\xFCr\xFC haz\u0131r!</em> Dokun: ku\u015Flar g\xFCne\u015Fin \xF6n\xFCnde d\xF6n\xFCp Zifir\u2019i birka\xE7 saniye g\xF6lgeler."]},Ki={spring:{name:"Bahar",sub:"\xC7i\xE7ekli ta\xE7",icon:Q.blossom},summer:{name:"Yaz",sub:"Ye\u015Fil g\xF6vde",icon:Q.sleaf},autumn:{name:"G\xFCz",sub:"Alt\u0131n dallar",icon:Q.maple},winter:{name:"K\u0131\u015F",sub:"Karl\u0131 k\xF6kler",icon:Q.flake}},Xi={flock:{icon:Q.birds,label:"S\xFCr\xFC"}},Yi=["\u0131","i","si","\xFC","\xFC","i","s\u0131","si","i","u"],ji=["\u0131","u","si","u","\u0131","si","\u0131","i","i","\u0131"];function Zi(c){return c>=100?"\xFC":c%10?Yi[c%10]:ji[c/10]}var Qi=c=>{let t=Zi(c);return t+"n"+t.slice(-1)};function Ji(){try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}}var Ye=class{constructor(t,e){if(this.h=e,!document.getElementById("uk-style")){let r=document.createElement("style");r.id="uk-style",r.textContent=li,document.head.appendChild(r)}let s=document.createElement("div");s.className="uk-ui",s.lang="tr";let i=(r,d,u)=>`<button class="uk-tog" data-t="${r}">${d}<span>${u}</span><b></b></button>`,a=(r,d)=>`<div class="uk-star s${r}"><div class="sh"><i></i><b></b></div><span>${d}</span></div>`;s.innerHTML=`
			<div class="uk-scr uk-title" data-s="title">
				<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
				<div class="foot"></div>
				<div class="top"><button class="uk-ico uk-tap" data-a="exit" aria-label="Ana oyuna d\xF6n">${Q.back}</button></div>
				<div class="uk-brand">
					${ci}
					<div class="k"><i></i>G\xFCnd\xF6n\xFCm\xFC \xB7 \u0130kinci Mod<i></i></div>
					<h1 data-t="Ulu Kay\u0131n"><span>Ulu Kay\u0131n</span></h1>
					<div class="tag">G\xFCne\u015Fi \xE7evir, g\xF6lgede kal.</div>
				</div>
				<div class="acts">
					<button class="uk-btn pri uk-tap" data-a="play">${Q.play}<b>Ba\u015Fla</b></button>
					<div class="row"><button class="uk-btn gh uk-tap" data-a="levels">${Q.path}B\xF6l\xFCmler</button><button class="uk-btn gh uk-tap" data-a="settings">${Q.gear}Ayarlar</button></div>
				</div>
			</div>
			<div class="uk-scr uk-levels" data-s="levels">
				<div class="hd"><button class="uk-ico uk-tap" data-a="title" aria-label="Geri">${Q.back}</button><div class="ttl"><small>Ulu Kay\u0131n\u2019\u0131n yolu</small><h5>Mevsimler</h5></div><div class="uk-dpill"><i>\u2726</i><b class="dsum">0</b></div></div>
				<div class="uk-list"></div>
			</div>
			<div class="uk-hud">
				<div class="top">
					<button class="uk-ico" data-a="pause" aria-label="Duraklat">${Q.pause}</button>
					<div class="uk-pill dp"><i></i><span class="dt">0/0</span></div>
				</div>
				<div class="lvl"><small class="lk"></small><b class="lt"></b><div class="pg"><i class="pf"></i><div class="ph"><i></i></div></div></div>
				<div class="uk-streak"><b class="sn">\xD70</b><small>G\xF6lge serisi</small></div>
				<div class="uk-pop"></div><div class="uk-pop"></div><div class="uk-pop"></div>
				<div class="uk-compass" aria-hidden="true">
					<svg viewBox="-64 -64 128 128">
						<defs>
							<radialGradient id="uk-cg" r="0.6"><stop offset="0" stop-color="#fff0cc"/><stop offset="1" stop-color="#e9a95a"/></radialGradient>
							<linearGradient id="uk-cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0820"/><stop offset="1" stop-color="#2a1d5a"/></linearGradient>
							<clipPath id="uk-cc"><circle r="44"/></clipPath>
						</defs>
						<circle class="base" r="62"/>
						<circle class="trk" r="53"/>
						<path class="win" d=""/>
						<circle class="gnd" r="44"/>
						<g clip-path="url(#uk-cc)"><g class="bandg"><path class="band" d="M-13.5 0H13.5L17 48H-17Z"/></g></g>
						<circle class="trunk" r="13"/>
						<g transform="translate(0 30)"><circle class="halo" r="13"/><circle class="zif" r="7.5"/><circle class="eye" cx="-2.6" cy="-1.2" r="1.5"/><circle class="eye" cx="2.6" cy="-1.2" r="1.5"/></g>
						<g class="sun"><g transform="translate(0 53)"><circle class="glow" r="15"/><path class="ray" d="M0-11.5v-3.5M0 11.5v3.5M-11.5 0h-3.5M11.5 0h3.5M-8.1-8.1l-2.5-2.5M8.1 8.1l2.5 2.5M-8.1 8.1l-2.5 2.5M8.1-8.1l2.5-2.5"/><circle class="disc" r="8"/></g></g>
					</svg>
					<i class="zh"></i>
					<div class="cs">G\xF6lgede</div>
				</div>
				<button class="uk-ab" data-a="ability:flock" aria-label="Yetenek"><span class="ai"></span><small class="al"></small><span class="pp"><i></i><i></i><i></i><i></i></span></button>
				<button class="uk-wait" aria-label="Bekle">${Q.hourglass}<b>Bekle</b></button>
				<div class="uk-gust">${Q.wind}<span>R\xFCzg\xE2r geliyor</span></div>
				<div class="uk-hint"><i class="hi"></i><p></p></div>
				<div class="uk-hand"><i class="tr"></i><span class="fg">${Q.hand}</span></div>
			</div>
			<div class="uk-card-title"><i class="bd"></i><small></small><b></b><span></span></div>
			<div class="uk-lore"><i class="orn"></i><p></p></div>
			<button class="uk-skip" data-a="skip">Ge\xE7<span>\u203A</span></button>
			<div class="uk-scr uk-end" data-s="complete">
				<div class="uk-sheet">
					<div class="rays">${hi}</div>
					<div class="med">${Q.sun}</div>
					<div class="k ck"></div><h2 class="ct"></h2><div class="ban">G\xF6lge korundu</div><div class="sub cs2"></div>
					<div class="uk-stars">${a(0,"Yol tamam")}${a(1,"T\xFCm damlalar")}${a(2,"G\xF6lgede kald\u0131")}</div>
					<div class="uk-dust cd"><i>\u2726</i><b class="cdn">+0</b><span>\u0131\u015F\u0131k tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="next"><b>Sonraki b\xF6l\xFCm</b>${Q.next}</button><div class="row"><button class="uk-btn gh uk-tap" data-a="retry">${Q.retry}Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">${Q.path}B\xF6l\xFCmler</button></div></div>
				</div>
			</div>
			<div class="uk-scr uk-end fail" data-s="fail">
				<div class="uk-sheet">
					<div class="med">${Q.drop}</div>
					<div class="k">I\u015F\u0131k kazand\u0131</div><h2>Zifir buharla\u015Ft\u0131</h2>
					<div class="uk-prog"><i class="fp"></i><div class="fz"><i></i></div><span class="g0"></span><span class="g1">${Q.gate}</span></div>
					<div class="sub fs"></div>
					<div class="uk-mercy fm">${Q.sun}<p><b>G\xFCne\u015F yumu\u015Fad\u0131.</b> Bir sonraki denemede \u0131\u015F\u0131k daha az yakacak.</p></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="retry">${Q.retry}<b>Tekrar dene</b></button><button class="uk-btn gh uk-tap" data-a="levels">${Q.path}B\xF6l\xFCmler</button></div>
				</div>
			</div>
			<div class="uk-scr uk-end night" data-s="ending">
				<div class="uk-sheet">
					<div class="rays">${hi}</div>
					<div class="med">${ci}</div>
					<div class="k">K\xF6k Kap\u0131s\u0131 a\xE7\u0131ld\u0131</div><h2>Gece eve d\xF6nd\xFC</h2>
					<div class="sub">Zifir, Ulu Kay\u0131n\u2019\u0131n k\xF6klerine ula\u015Ft\u0131. T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 kar\u0131n alt\u0131nda ilk kez k\u0131p\u0131rd\u0131yor.</div>
					<div class="uk-dust ed"><i>\u2726</i><b class="edn">0</b><span>\u0131\u015F\u0131k tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="levels">${Q.path}<b>Mevsimler</b></button><button class="uk-btn gh uk-tap" data-a="exit">${Q.home}G\xF6ky\xFCz\xFCne d\xF6n</button></div>
				</div>
			</div>
			<div class="uk-scr uk-pause" data-s="pause">
				<div class="uk-card uk-tap">
					<h4>Duraklat\u0131ld\u0131</h4>
					<div class="cb">
						<button class="uk-btn pri" data-a="resume">Devam</button>
						<button class="uk-btn gh" data-a="retry">Yeniden ba\u015Fla</button>
						<button class="uk-btn gh" data-a="levels">B\xF6l\xFCmler</button>
					</div>
					<div class="ct">
						${i("sound",Q.sound,"Ses")}
						${i("haptics",Q.vibe,"Titre\u015Fim")}
						${i("quality",Q.gem,"Grafik")}
						${i("power",Q.battery,"Pil")}
					</div>
				</div>
			</div>
			<div class="uk-toast"></div>
			<div class="uk-fade"></div>`,t.appendChild(s),this.el=s;let o=r=>s.querySelector(r);this.$=o,this.scr={},s.querySelectorAll(".uk-scr").forEach(r=>this.scr[r.dataset.s]=r),this.hud=o(".uk-hud"),this.lk=o(".lk"),this.lt=o(".lt"),this.dp=o(".dp"),this.dt=o(".dt"),this.pgF=o(".pg .pf"),this.pgH=o(".pg .ph"),this.streakEl=o(".uk-streak"),this.streakN=o(".uk-streak .sn"),this.pops=[...s.querySelectorAll(".uk-pop")],this.compassEl=o(".uk-compass"),this.compassTxt=o(".uk-compass .cs"),this.sunG=o(".sun"),this.bandG=o(".bandg"),this.zifDot=o(".zif"),this.abEl=o(".uk-ab"),this.hintEl=o(".uk-hint"),this.hintIc=o(".uk-hint .hi"),this.hintTx=o(".uk-hint p"),this.hand=o(".uk-hand"),this.gustEl=o(".uk-gust"),this.toastEl=o(".uk-toast"),this.titleCard=o(".uk-card-title"),this.loreEl=o(".uk-lore"),this.loreTx=o(".uk-lore p"),this.skipEl=o(".uk-skip"),this.fadeEl=o(".uk-fade"),this.waitBtn=o(".uk-wait"),this._rel=null,this._hot=null,this._streak=0,this._pg=-1,this._pi=0,this._pk=!1,this._rolls=[],s.addEventListener("click",r=>{let d=r.target.closest("[data-a]");if(d){r.stopPropagation(),e.action(d.dataset.a);return}let u=r.target.closest("[data-t]");u&&(r.stopPropagation(),e.toggle(u.dataset.t))});let l=this.waitBtn,n=r=>{r.preventDefault(),r.stopPropagation();try{l.setPointerCapture(r.pointerId)}catch{}l.classList.add("dn"),e.wait(!0)},h=()=>{l.classList.remove("dn"),e.wait(!1)};l.addEventListener("pointerdown",n),l.addEventListener("pointerup",h),l.addEventListener("pointercancel",h),l.addEventListener("lostpointercapture",h)}show(t){for(let[e,s]of Object.entries(this.scr))s.classList.toggle("on",e===t);t!=="complete"&&t!=="ending"&&this._stopRolls()}hudOn(t){this.hud.classList.toggle("on",t)}setLevel(t){this.lk.textContent=t.kicker,this.lt.textContent=t.title,this.hud.dataset.season=t.season||"",this.streak(0),this._pg=-1,this.progress(0),this.hud.classList.remove("pg")}setDrops(t,e,s){this.dt.textContent=`${t}/${e}`,this.dp.style.display=e?"":"none",this.dp.classList.toggle("full",e>0&&t>=e),(s==="pop"||s==="bad")&&(this._dpk=!this._dpk,this.dp.classList.remove("pop0","pop1","bad0","bad1"),this.dp.classList.add(`${s}${this._dpk?0:1}`))}compass(t,e){let s=Math.round(t*180/Math.PI*2)/2;s!==this._rel&&(this._rel=s,this.sunG.setAttribute("transform",`rotate(${s})`),this.bandG.setAttribute("transform",`rotate(${s+180})`)),e=!!e,e!==this._hot&&(this._hot=e,this.compassEl.classList.toggle("hot",e),this.compassTxt.textContent=e?"I\u015F\u0131kta!":"G\xF6lgede")}lockArc(t,e){let s=this.$(".uk-compass .win");if(t==null){this._arc&&s.setAttribute("d",""),this._arc=null;return}let i=`${t.toFixed(2)}:${e.toFixed(2)}`;if(i===this._arc)return;this._arc=i;let a=53,o=n=>`${(-a*Math.sin(n)).toFixed(1)} ${(a*Math.cos(n)).toFixed(1)}`,l=e-t>Math.PI?1:0;s.setAttribute("d",`M ${o(t)} A ${a} ${a} 0 ${l} 1 ${o(e)}`)}hint(t){if(!t){this._hint!==null&&(this.hintEl.classList.remove("on"),this.hand.classList.remove("on")),this._hint=null;return}if(this._hint===t)return;this._hint=t;let[e,s]=qi[t]||["sun",t];this.hintIc.innerHTML=Q[e]||Q.sun,this.hintTx.innerHTML=s,this.hintEl.classList.add("on"),this.hand.classList.toggle("on",t==="drag")}gust(t){t=!!t,t!==this._gust&&(this._gust=t,this.gustEl.classList.toggle("on",t),this.hud.classList.toggle("gst",t))}streak(t){if(t=Math.max(0,t|0),t===this._streak)return;let e=this._streak;if(this._streak=t,!t){this.streakEl.classList.remove("on");return}this.streakN.textContent=`\xD7${t}`,this.streakEl.classList.add("on"),this.streakEl.classList.toggle("hot",t>=5),t>e&&(this._sk=!this._sk,this.streakEl.classList.toggle("p0",this._sk),this.streakEl.classList.toggle("p1",!this._sk))}pop(t,e="good"){if(!t)return;let s=performance.now();if(t===this._popT&&s-this._popAt<300)return;this._popT=t,this._popAt=s,this._pi=(this._pi+1)%this.pops.length,this._pk=!this._pk;let i=this.pops[this._pi];i.textContent=t,i.className=`uk-pop ${e==="bad"||e==="gold"?e:"good"} ${this._pk?"a":"b"}`}progress(t){let e=Math.round(Math.min(1,Math.max(0,+t||0))*300)/300;e!==this._pg&&(this._pg=e,e>0&&this.hud.classList.add("pg"),this.pgF.style.transform=`scaleX(${e})`,this.pgH.style.transform=`translateX(${(e*100).toFixed(2)}%)`)}ability(t,e){let s=this.abEl;if(!e){this._abKey&&s.classList.remove("on"),this._abKey=null;return}let i=Math.max(0,Math.min(4,e.count|0)),a=`${t}:${i}:${e.ready?1:0}:${e.active?1:0}`;if(a!==this._abKey){if(t!==this._abId){this._abId=t;let o=Xi[t]||{icon:Q.gem,label:""};s.dataset.a=`ability:${t}`,s.querySelector(".ai").innerHTML=o.icon,s.querySelector(".al").textContent=o.label}this._abKey=a,s.querySelectorAll(".pp i").forEach((o,l)=>o.classList.toggle("on",l<i)),s.classList.toggle("ready",!!e.ready&&!e.active),s.classList.toggle("active",!!e.active),s.classList.add("on")}}toast(t,e=2200){this.toastEl.textContent=t,this.toastEl.classList.add("on"),clearTimeout(this._toastT),this._toastT=setTimeout(()=>this.toastEl.classList.remove("on"),e)}card(t,e,s){if(!t){this.titleCard.classList.remove("on");return}this.titleCard.querySelector("small").textContent=t,this.titleCard.querySelector("b").textContent=e,this.titleCard.querySelector("span").textContent=s||"",this.titleCard.classList.add("on")}lore(t){if(!t){this.loreEl.classList.remove("on"),this._lore=null;return}t!==this._lore&&(this._lore=t,this.loreTx.textContent=t,this._lk=!this._lk,this.loreTx.className=this._lk?"a":"b",this.loreEl.classList.add("on"))}skip(t){this.skipEl.classList.toggle("on",t)}fade(t){this.fadeEl.classList.toggle("on",t)}renderLevels(t,e){let s=e.stars||[],i=[];t.forEach((h,r)=>{let d=i[i.length-1];(!d||d.s!==h.season)&&i.push(d={s:h.season,items:[]}),d.items.push(r)});let a=(s[e.unlocked]||0)===0?e.unlocked:-1,o=h=>{let r=t[h],d=h>e.unlocked,u=s[h]||0,f=d?"lock":h===a?"cur":u?"done":"open",p=d?Q.lock:f==="cur"?Q.play:f==="done"?Q.check:`<b>${h+1}</b>`,g=f==="cur"?'<span class="go">Oyna</span>':d?"":`<span class="st">${[0,1,2].map(x=>`<i class="${x<u?"on":""}">${Q.star}</i>`).join("")}</span>`;return`<button class="uk-lv uk-tap ${f}" data-a="lv:${h}" data-s="${r.season}">
				<span class="no">${p}</span>
				<span class="cd"><span class="tx"><small>${h+1}. b\xF6l\xFCm${r.finale?" \xB7 son":""}</small><b>${r.title}</b></span>${g}</span></button>`};this.$(".uk-list").innerHTML=i.map((h,r)=>{let d=Ki[h.s]||{name:h.s,sub:"",icon:Q.sun},u=h.items.reduce((p,g)=>p+(s[g]||0),0);return`<section class="uk-ssn${h.items[0]<=e.unlocked?"":" lock"}" data-s="${h.s}" style="--d:${r*70}ms">
					<header><i class="ic">${d.icon}</i><span class="nm"><b>${d.name}</b><span>${d.sub}</span></span><em>${Q.star}${u}/${h.items.length*3}</em></header>
					${h.items.map(o).join("")}</section>`}).join(""),this.$(".dsum").textContent=String(e.dust||0);let l=this.$(".uk-list"),n=l.querySelector(".uk-lv.cur");n&&l.scrollHeight>l.clientHeight+4&&(l.scrollTop=Math.max(0,n.offsetTop-l.clientHeight*.45))}_roll(t,e,s,i){let a={t:0,r:0};if(this._rolls.push(a),!e||Ji()){t.textContent=i(e||0);return}t.textContent=i(0),a.t=setTimeout(()=>{let o=performance.now(),l=-1,n=h=>{let r=Math.min(1,(h-o)/1e3),d=Math.round(e*(1-Math.pow(1-r,3)));d!==l&&(l=d,t.textContent=i(d)),r<1?a.r=requestAnimationFrame(n):t.parentNode.classList.add("done")};a.r=requestAnimationFrame(n)},s)}_stopRolls(){for(let t of this._rolls)clearTimeout(t.t),cancelAnimationFrame(t.r);this._rolls.length=0}showComplete({title:t,kicker:e,stars:s,dust:i,last:a}){this.card(null),this._stopRolls(),this.$(".ck").textContent=e,this.$(".ct").textContent=t,this.$(".cs2").textContent=a?"Son b\xF6l\xFCm":"",this.$(".cs2").style.display=a?"":"none";let o=s.filter(Boolean).length;this.$(".ban").textContent=o===3?"Kusursuz g\xF6lge!":"G\xF6lge korundu",this._starT&&this._starT.forEach(clearTimeout),this._starT=[],[".s0",".s1",".s2"].forEach((n,h)=>{let r=this.$(n);r.classList.remove("on"),s[h]&&this._starT.push(setTimeout(()=>r.classList.add("on"),450+h*300))});let l=this.$(".cd");l.classList.remove("done"),l.style.display=i?"":"none",this._roll(this.$(".cdn"),i,450+3*300,n=>`+${n}`),this.$("[data-s=complete] [data-a=next]").style.display=a?"none":"",this.show("complete")}showFail({progress:t,mercy:e}){this.card(null);let s=Math.round(Math.min(1,Math.max(0,t))*100);this.$(".fs").innerHTML=s>=2?`Yolun <b>%${s}\u2019${Qi(s)}</b> y\xFCr\xFCd\xFCn. Biraz daha!`:"G\xFCne\u015Fi g\xF6vdenin arkas\u0131nda tut.";let i=this.$(".fp"),a=this.$(".fz");i.style.transition=a.style.transition="none",i.style.transform="scaleX(0)",a.style.transform="translateX(0%)",i.offsetWidth,i.style.transition=a.style.transition="",i.style.transform=`scaleX(${s/100})`,a.style.transform=`translateX(${s}%)`,this.$(".fm").style.display=e?"":"none",this.show("fail")}showEnding(t){this.card(null),this._stopRolls();let e=this.$(".ed");e.classList.remove("done"),e.style.display=t?"":"none",this._roll(this.$(".edn"),t,900,s=>`${s}`),this.show("ending")}setToggles(t){let e=(s,i,a)=>{let o=this.$(`[data-t=${s}] b`);o&&(o.textContent=i,o.parentNode.classList.toggle("off",!a))};e("sound",t.sound?"A\xE7\u0131k":"Kapal\u0131",t.sound),e("haptics",t.haptics?"A\xE7\u0131k":"Kapal\u0131",t.haptics),e("quality",{auto:"Otomatik",0:"D\xFC\u015F\xFCk",1:"Orta",2:"Y\xFCksek"}[t.quality]||"Otomatik",!0),e("power",{auto:"Otomatik",saver:"Tasarruf",performance:"Performans"}[t.power]||"Otomatik",!0)}setPlayLabel(t){this.$("[data-a=play] b").textContent=t}};var ue={spring:{root:293.66,steps:[0,2,4,7,9],beat:.4,wave:"sine",bell:3,chords:[[0,4],[-3,3],[-7,4],[-5,4]]},summer:{root:261.63,steps:[0,2,4,7,9],beat:.36,wave:"triangle",bell:2,chords:[[0,4],[5,4],[-3,3],[7,4]]},autumn:{root:220,steps:[0,3,5,7,10],beat:.46,wave:"triangle",bell:2,chords:[[0,3],[-4,4],[3,4],[-2,4]]},winter:{root:329.63,steps:[0,2,3,7,8],beat:.56,wave:"sine",bell:4.2,chords:[[0,3],[-4,4],[0,3],[-5,4]]},night:{root:246.94,steps:[0,2,4,7,9],beat:.62,wave:"sine",bell:3,chords:[[0,4],[-3,3],[-7,4],[-5,4]]}},le=(c,t)=>c*Math.pow(2,t/12),_e=class{constructor(t={}){this.hooks=t,this.ctx=null,this.on=!0,this.season="spring",this._dropN=0,this._birdT=4,this.musMode="title",this.intensity=0,this._beatN=0,this._mel=5,this._nextBeat=0,this._hbT=0,this._streakN=0,this._duckUntil=0}unlock(){if(this.ctx){this.ctx.state==="suspended"&&this.ctx.resume();return}let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let e=new t;this.ctx=e,this.master=e.createGain(),this.master.gain.value=this.on?.9:0;let s=e.createDynamicsCompressor();s.threshold.value=-14,s.knee.value=12,s.ratio.value=3,s.attack.value=.004,s.release.value=.2,this.master.connect(s),s.connect(e.destination),this.echo=e.createGain(),this.echo.gain.value=.32;let i=e.createDelay(1.2);i.delayTime.value=.37;let a=e.createGain();a.gain.value=.34;let o=e.createBiquadFilter();o.type="lowpass",o.frequency.value=2600,this.echo.connect(i),i.connect(o),o.connect(a),a.connect(i),o.connect(this.master),this.mus=e.createGain(),this.mus.gain.value=0,this.musF=e.createBiquadFilter(),this.musF.type="lowpass",this.musF.frequency.value=5200,this.musF.Q.value=.5,this.mus.connect(this.musF),this.musF.connect(this.master),this.musF.connect(this.echo);let l=e.sampleRate*2,n=e.createBuffer(1,l,e.sampleRate),h=n.getChannelData(0);for(let f=0;f<l;f++)h[f]=Math.random()*2-1;this.noise=n,this.wind=this._loopNoise("lowpass",520,.6),this.wind.g.gain.value=0,this.sizz=this._loopNoise("highpass",3200,.7),this.sizz.g.gain.value=0;let r=e.createOscillator();r.type="triangle",r.frequency.value=300;let d=e.createOscillator();d.type="sine",d.frequency.value=450;let u=e.createGain();u.gain.value=0,r.connect(u),d.connect(u),u.connect(this.master),u.connect(this.echo),r.start(),d.start(),this.chg={o:r,o2:d,g:u,on:!1},this._hostMusic=this._host("music"),this._nextBeat=e.currentTime+.3,this._timer=setInterval(()=>this._schedule(),90),this._applyMusic()}_loopNoise(t,e,s){let i=this.ctx,a=i.createBufferSource();a.buffer=this.noise,a.loop=!0;let o=i.createBiquadFilter();o.type=t,o.frequency.value=e,o.Q.value=s;let l=i.createGain();return a.connect(o),o.connect(l),l.connect(this.master),a.start(),{src:a,f:o,g:l}}setOn(t){this.on=t,this._sz=this._wk=this._mf=-1,this.master&&this.master.gain.setTargetAtTime(t?.9:0,this.ctx.currentTime,.05)}_host(t,e){return this.hooks.sfx?this.hooks.sfx(t,e)===!0:!1}_ok(t,e){return this.ctx&&this.on&&!this._host(t,e)}_tone(t,e,s,i,a="sine",o=0,l=0,n=null){let h=this.ctx,r=h.createOscillator();r.type=a,r.frequency.value=t;let d=h.createGain();if(d.gain.setValueAtTime(0,e),d.gain.linearRampToValueAtTime(i,e+.008),d.gain.exponentialRampToValueAtTime(1e-4,e+s),r.connect(d),d.connect(n||this.master),l){let u=h.createGain();u.gain.value=l,d.connect(u),u.connect(this.echo)}r.start(e),r.stop(e+s+.05),o&&this._tone(t*o,e,s*.5,i*.3,"sine",0,0,n)}_swell(t,e,s,i,a,o="triangle",l=null){let n=this.ctx,h=n.createOscillator();h.type=o,h.frequency.value=t;let r=n.createGain();r.gain.setValueAtTime(1e-4,e),r.gain.exponentialRampToValueAtTime(a,e+s),r.gain.exponentialRampToValueAtTime(1e-4,e+i),h.connect(r),r.connect(l||this.master),h.start(e),h.stop(e+i+.05)}_burst(t,e,s,i,a="bandpass",o=0,l=1.2){let n=this.ctx,h=n.createBufferSource();h.buffer=this.noise;let r=n.createBiquadFilter();r.type=a,r.frequency.setValueAtTime(s,t),o&&r.frequency.exponentialRampToValueAtTime(o,t+e),r.Q.value=l;let d=n.createGain();d.gain.setValueAtTime(i,t),d.gain.exponentialRampToValueAtTime(1e-4,t+e),h.connect(r),r.connect(d),d.connect(this.master),h.start(t,Math.random()*1.5),h.stop(t+e+.02)}_whoosh(t,e,s,i,a){let o=this.ctx,l=o.createBufferSource();l.buffer=this.noise;let n=o.createBiquadFilter();n.type="bandpass",n.Q.value=.9,n.frequency.setValueAtTime(s,t),n.frequency.exponentialRampToValueAtTime(i,t+e);let h=o.createGain();h.gain.setValueAtTime(1e-4,t),h.gain.exponentialRampToValueAtTime(a,t+e*.6),h.gain.exponentialRampToValueAtTime(1e-4,t+e),l.connect(n),n.connect(h),h.connect(this.master),l.start(t,Math.random()),l.stop(t+e+.05)}_note(t,e=0){let s=ue[this.season]||ue.spring,i=s.steps.length,a=(t%i+i)%i;return le(s.root,s.steps[a]+12*(Math.floor(t/i)+e))}step(){if(!this._ok("step"))return;let t=this.ctx.currentTime;this.season==="winter"?this._burst(t,.09,1400+Math.random()*500,.07,"lowpass"):this._burst(t,.05,900+Math.random()*500,.065)}drop(){if(!this._ok("drop"))return;let t=this.ctx.currentTime,e=5+this._dropN++,s=this._note(e);this._tone(s,t,1.4,.15,"sine",2.76,.5),this._tone(this._note(e+2),t+.08,1.1,.07,"triangle",0,.4),this._burst(t,.25,6e3,.03,"highpass"),this.duck(.55,.6)}resetDrops(){this._dropN=0}dropLost(){if(!this._ok("dropLost"))return;let t=this.ctx.currentTime;this._burst(t,.4,2600,.12,"highpass"),this._tone(this._note(4),t,.4,.06,"triangle"),this._tone(this._note(1),t+.12,.6,.06,"triangle")}dropWarn(){if(!this._ok("dropWarn"))return;let t=this.ctx.currentTime,e=this.ctx.createOscillator(),s=this.ctx.createGain(),i=this._note(12);e.type="sine",e.frequency.setValueAtTime(i,t),e.frequency.exponentialRampToValueAtTime(i*.7,t+.35),s.gain.setValueAtTime(0,t),s.gain.linearRampToValueAtTime(.05,t+.02),s.gain.exponentialRampToValueAtTime(1e-4,t+.4),e.connect(s),s.connect(this.master),e.start(t),e.stop(t+.45),this._burst(t,.3,4500,.04,"highpass")}ui(){this._ok("ui")&&this._tone(this._note(7),this.ctx.currentTime,.14,.05,"sine",2)}streak(t){if(!this._ok("streak",t))return;let e=this.ctx.currentTime,s=5+this._streakN++%8;this._tone(this._note(s,1),e,.35,.034+Math.min(.02,t*.001),"sine",0,.3)}milestone(t){if(!this._ok("milestone",t))return;let e=this.ctx.currentTime,s=t%10===0,i=5+Math.min(4,Math.floor(t/10));[0,2,4,s?7:5].forEach((a,o)=>this._tone(this._note(i+a),e+o*.07,1.3,s?.1:.075,"sine",3,.5)),this._burst(e+.05,.6,7e3,s?.05:.03,"highpass"),s&&this._swell(this._note(0,-1),e,.05,1.6,.05,"triangle"),this.duck(.5,.8)}streakReset(){this._streakN=0}streakBreak(t){if(!this._ok("streakBreak",t))return;let e=this.ctx.currentTime;this._tone(this._note(4),e,.35,.05,"triangle"),this._tone(this._note(1),e+.1,.5,.05,"triangle"),this._streakN=0}burnStart(){if(!this._ok("burn"))return;let t=this.ctx.currentTime;this._burst(t,.22,5e3,.07,"highpass",2500),this._tone(140,t,.18,.05,"triangle")}nearMiss(){if(!this._ok("nearMiss"))return;let t=this.ctx.currentTime;this._whoosh(t,.45,600,4e3,.09),this._tone(this._note(9),t+.12,1.2,.11,"sine",3,.6),this._tone(this._note(12),t+.22,1.4,.09,"sine",3,.6),this.duck(.4,1)}lastStand(){if(!this._ok("lastStand"))return;let t=this.ctx.currentTime;this._thump(t,.3),this._thump(t+.2,.2),this._whoosh(t,.9,200,1800,.08),this.duck(.15,1.2)}_thump(t,e){let s=this.ctx,i=s.createOscillator();i.type="triangle",i.frequency.setValueAtTime(120,t),i.frequency.exponentialRampToValueAtTime(48,t+.16);let a=s.createGain();a.gain.setValueAtTime(0,t),a.gain.linearRampToValueAtTime(e,t+.01),a.gain.exponentialRampToValueAtTime(1e-4,t+.22),i.connect(a),a.connect(this.master),i.start(t),i.stop(t+.26)}birdJoin(t){if(!this._ok("bird",t))return;let e=this.ctx.currentTime;for(let l=0;l<4;l++)this._burst(e+l*.055,.05,1200+l*150,.05);let s=this._note(10+t*2),i=this.ctx.createOscillator(),a=this.ctx.createGain(),o=e+.18;i.frequency.setValueAtTime(s,o),i.frequency.exponentialRampToValueAtTime(s*1.26,o+.06),i.frequency.exponentialRampToValueAtTime(s,o+.12),a.gain.setValueAtTime(0,o),a.gain.linearRampToValueAtTime(.045,o+.01),a.gain.exponentialRampToValueAtTime(1e-4,o+.2),i.connect(a),a.connect(this.master),a.connect(this.echo),i.start(o),i.stop(o+.25)}flockReady(){if(!this._ok("flockReady"))return;let t=this.ctx.currentTime;[0,2,4,5,7].forEach((e,s)=>this._tone(this._note(5+e),t+s*.06,1.2,.06,"sine",2,.5))}flockGo(){if(!this._ok("flock"))return;let t=this.ctx.currentTime;for(let e=0;e<14;e++)this._burst(t+e*.035+Math.random()*.02,.06,900+Math.random()*900,.06);this._whoosh(t,.8,300,2400,.12),this._swell(this._note(0,-1),t,.25,2.2,.07,"triangle"),this._swell(this._note(2,-1)*1,t,.25,2.2,.05,"triangle"),this._tone(this._note(10),t+.3,1.5,.06,"sine",3,.6),this.duck(.5,1.5)}flockEnd(){if(!this._ok("flockEnd"))return;let t=this.ctx.currentTime;for(let e=0;e<8;e++)this._burst(t+e*.06,.05,1400-e*80,.035);this._tone(this._note(7),t,.5,.04,"triangle"),this._tone(this._note(4),t+.12,.7,.04,"triangle")}gustWarn(){this._ok("gust")&&this._whoosh(this.ctx.currentTime,1.4,250,1100,.07)}win(){if(!this._ok("win"))return;let t=this.ctx.currentTime;[0,1,2,3,4,5,6,7,10].forEach((s,i)=>this._tone(this._note(s),t+i*.075,1.8,.09,"sine",3,.45));let e=ue[this.season]||ue.spring;[0,7,12+(e.steps[1]===3?3:4),19].forEach(s=>this._swell(le(e.root,s-12),t+.1,.4,3.2,.045,"triangle")),this._swell(le(e.root,-24),t,.05,2.6,.08,"sine"),this._burst(t+.5,1.4,8e3,.05,"highpass"),this.duck(.2,2.6)}unlockOpen(){if(!this._ok("unlock"))return;let t=this.ctx.currentTime;[0,2,4,7].forEach((e,s)=>this._tone(this._note(5+e),t+s*.06,1.6,.08,"sine",2,.5)),this._swell(this._note(0,-1),t,.05,2,.06,"triangle"),this._burst(t,.8,6e3,.04,"highpass"),this.duck(.35,1.4)}fail(){if(!this._ok("fail"))return;let t=this.ctx.currentTime;this._burst(t,1.1,2400,.14,"highpass",600),this._thump(t,.25),[4,2,0,-1].forEach((e,s)=>this._tone(this._note(e),t+.2+s*.18,.9,.065,"triangle")),this.duck(.1,2.5)}lockCharge(t){if(!this.ctx||!this.on)return;let e=this.ctx.currentTime,s=this.chg;if(t==null){s.on&&s.g.gain.setTargetAtTime(0,e,.08),s.on=!1;return}s.on=!0;let i=this._note(0)*Math.pow(2,t*1.5);s.o.frequency.setTargetAtTime(i,e,.05),s.o2.frequency.setTargetAtTime(i*1.5,e,.05),s.g.gain.setTargetAtTime(.018+t*.03,e,.06)}duck(t=.4,e=1){if(!this.ctx)return;let s=this.ctx.currentTime,i=this.mus.gain;i.cancelScheduledValues(s),i.setTargetAtTime(this._musBase()*t,s,.03),this._duckUntil=s+e}_musBase(){return this._hostMusic?0:{title:.75,play:1,soft:.5,off:0}[this.musMode]??.6}music(t){this.musMode!==t&&(this.musMode=t,this._applyMusic())}_applyMusic(){if(!this.ctx)return;let t=this.ctx.currentTime;t<this._duckUntil||this.mus.gain.setTargetAtTime(this._musBase(),t,this.musMode==="off"?.4:.8)}_schedule(){let t=this.ctx;if(!t||!this.on||t.state!=="running"||this._hostMusic)return;let e=t.currentTime;if(this._duckUntil&&e>this._duckUntil&&(this._duckUntil=0,this.mus.gain.setTargetAtTime(this._musBase(),e,.5)),this.musMode==="off"){this._nextBeat=e+.2;return}this._nextBeat<e-.5&&(this._nextBeat=e+.05);let s=ue[this.season]||ue.spring,i=this.musMode==="play"?1:1.3;for(;this._nextBeat<e+.3;)this._beat(this._nextBeat,s,s.beat*i),this._nextBeat+=s.beat*i}_beat(t,e,s){let i=this._beatN++,a=i%8,l=this.musMode==="play"?this.intensity:.15,n=this.mus;if(a===0){let[r,d]=e.chords[Math.floor(i/8)%e.chords.length],u=s*8,f=le(e.root,r-12);this._swell(f,t,u*.35,u*1.35,.03,"triangle",n),this._swell(le(f,7),t,u*.4,u*1.3,.022,"triangle",n),this._swell(le(f,12+d),t,u*.45,u*1.25,.018,"sine",n),this._tone(le(f,-12),t,u*.9,.05,"sine",0,0,n),this._chordRoot=r}let h=.28+l*.4;if(a!==7&&Math.random()<h){let r=Math.random();this._mel+=r<.2?-2:r<.5?-1:r<.8?1:2,this._mel<2&&(this._mel=3),this._mel>11&&(this._mel=9);let d=this._note(this._mel);this._tone(d,t,s*3.2,.032+l*.012,e.wave,e.bell,0,n)}if(l>.45){let r=this._chordRoot||0,d=[0,7,12,16,19,12];for(let u=0;u<2;u++){let f=d[(a*2+u)%d.length];this._tone(le(e.root,r+f),t+u*s*.5,s*.9,.012+(l-.45)*.02,"triangle",0,0,n)}}}tick(t,e,s,i,a=1){if(!this.ctx||!this.on)return;let o=this.ctx.currentTime,l=i?e*.09:0;Math.abs(l-(this._sz??-1))>.004&&(this._sz=l,this.sizz.g.gain.setTargetAtTime(l,o,.05)),Math.abs(s-(this._wk??-1))>.02&&(this._wk=s,this.wind.g.gain.setTargetAtTime(.025+s*.05,o,.3),this.wind.f.frequency.setTargetAtTime(380+s*500,o,.3));let n=i&&e>.05?900+a*900:5200;Math.abs(n-(this._mf??-1))>40&&(this._mf=n,this.musF.frequency.setTargetAtTime(n,o,.12)),i&&a<.45&&e>.05&&o>this._hbT&&(this._thump(o,.22),this._thump(o+.17,.13),this._hbT=o+.45+a*.9),(this.season==="spring"||this.season==="summer")&&i&&(this._birdT-=t,this._birdT<0&&(this._birdT=3+Math.random()*6,this._bird(o)))}_bird(t){let e=this.ctx,s=2+(Math.random()*3|0),i=2200+Math.random()*1400;for(let a=0;a<s;a++){let o=e.createOscillator(),l=e.createGain(),n=t+a*.13;o.frequency.setValueAtTime(i,n),o.frequency.exponentialRampToValueAtTime(i*1.35,n+.05),o.frequency.exponentialRampToValueAtTime(i*.9,n+.09),l.gain.setValueAtTime(0,n),l.gain.linearRampToValueAtTime(.02,n+.01),l.gain.exponentialRampToValueAtTime(1e-4,n+.1),o.connect(l),l.connect(this.master),o.start(n),o.stop(n+.12)}}suspend(){this.ctx&&this.ctx.state==="running"&&this.ctx.suspend()}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}};_e.SCALES=ue;var je=class{constructor({container:t,store:e,hooks:s={},quality:i="auto",power:a="auto"}){this.container=t,this.store=e,this.hooks=s,this.qualityOpt=i,this.power=a,this.running=!1,this.visible=!0,this.time=0,this.sunAz=0,this.elev=null,this.idle=!1,this._raf=0,this._last=0,this._prev=0,this._dirty=!0,this.V3=ve.Vector3}async init(){let t=document.createElement("canvas");t.className="uk-canvas",this.container.appendChild(t),this.canvas=t;let e=this.store.get("settings")||{},s=this.qualityOpt!=="auto"?this.qualityOpt:e.quality??"auto",i=s==="auto"?null:Number(s),a=gs(t,i);this.renderer=a.renderer,this.tier=a.tier,this.info=a,this.gov=new ze({tier:a.tier.id,gpu:a.gpu,store:this.store,power:e.power||this.power}),this.gov.onScale=()=>this.resize(),this.gov.onBattery=l=>{this.ui&&this.ui.toast(l?"Pil koruma a\xE7\u0131k: daha az kare, daha serin telefon":"Pil koruma kapand\u0131")};let o=vs();this.G=o,bs(o,a.tier.shadowTaps),this.shadow=new Se(o,a.tier.shadowSize),this.world=Js({G:o,tier:a.tier,shadow:this.shadow,aniso:a.aniso,msaa:a.msaa}),this.scene=this.world.scene,this.rig=new Ie,this.focus=new ve.Vector3(0,30,0),this.sfx=new _e(this.hooks),this.ui=new Ye(this.container,{action:l=>this.game.action(l),toggle:l=>this.game.toggle(l),wait:l=>this.game.wait(l)}),this._onResize=()=>this.resize(),window.addEventListener("resize",this._onResize),this._onVis=()=>{this.visible=!document.hidden,this.visible?(this.gov.reset(),this._last=0,this._prev=0,this.wake(),this.sfx.resume()):(this.sfx.suspend(),this.game&&this.game.pause())},document.addEventListener("visibilitychange",this._onVis),this.resize(),this.game=new Xe(this,this.ui,this.sfx),this.rig.pos.set(70,32,60),this.rig.look.set(0,27,0),this.rig.mode="manual",this.rig.update(0),await this.warmup()}async warmup(){let t=this.renderer,e=[];this.scene.traverse(s=>{s.isMesh&&!s.visible&&(e.push(s),s.visible=!0)});try{t.compileAsync?(await t.compileAsync(this.scene,this.rig.cam),await t.compileAsync(this.shadow.scene,this.shadow.cam)):(t.compile(this.scene,this.rig.cam),t.compile(this.shadow.scene,this.shadow.cam))}catch{}this.renderFrame();for(let s of e)s.visible=!1}resize(){let t=Math.max(1,this.container.clientWidth||window.innerWidth),e=Math.max(1,this.container.clientHeight||window.innerHeight),s=this.gov.pixelRatio(t,e);this.renderer.setPixelRatio(s),this.renderer.setSize(t,e,!1),this.canvas.style.width=t+"px",this.canvas.style.height=e+"px";let i=this.renderer.getDrawingBufferSize(new ve.Vector2);this.G.uRes.value.x=i.x,this.G.uRes.value.y=i.y,this.rig.resize(t,e),this.wake()}wake(){this.idle=!1,this._dirty=!0}exit(){this.hooks.onExit?this.hooks.onExit():this.game.goTitle()}renderFrame(){let t=this.G;t.uTime.value=this.time;let[e,s,i]=this.game?this.game.envState():["spring","spring",0];xs(t,es[e],es[s],i,this.sunAz,this.elev),t.uWind.value.set(zt.dx,zt.dz,zt.str,zt.gust),t.uFocus.value.set(this.focus.x,this.focus.y+.5,this.focus.z,1.7);let a=Math.min(1,t.uNight.value*1.4+Math.max(0,.3-t.uSunDir.value.y)*1.5);this.world.lanternGlow.mat.uniforms.uK.value=.45+a*1.5,this.world.mats.glass.uniforms.uK.value=1.6+a*2.2;let o=this.world,l=Re(this.focus.y,this._sw||(this._sw=[0,0,0,0]));o.particles.u.uCenter.value.copy(this.rig.look),o.particles.u.uSeason.value.set(l[0],l[1],l[2],l[3]),o.particles.u.uFire.value=a*(this.focus.y<14?1:.3),o.shafts.u.uCenter.value.copy(this.focus),o.birds.u.uCenterY.value=this.focus.y,this.shadow.place(this.focus,t.uSunDir.value),this.shadow.render(this.renderer),this.renderer.render(this.scene,this.rig.cam),this._dirty=!1}start(){if(this.running)return;this.running=!0,this._last=0,this._prev=0;let t=e=>{if(!this.running||(this._raf=requestAnimationFrame(t),!this.visible))return;let s=this._last?e-this._last:16.7;if(this._last=e,this.idle&&!this._dirty){this._prev=e;return}this.gov.tick(e,s)&&this.frame(e)};this._raf=requestAnimationFrame(t)}stop(){this.running=!1,cancelAnimationFrame(this._raf),this.sfx.suspend()}frame(t){let e=Math.min(.05,this._prev?(t-this._prev)/1e3:.016666666666666666);this._prev=t,this.time+=e,this.game.update(e,this.time),this.rig.update(e),this.renderFrame()}destroy(){this.stop(),this.game.destroy(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVis),this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&t.material.dispose()});for(let t of Object.values(this.world.tex))t.dispose();this.shadow.dispose(),this.renderer.dispose(),this.canvas.remove(),this.ui.el.remove()}stats(){let t=this.renderer.info;return{calls:t.render.calls,tris:t.render.triangles,geo:t.memory.geometries,tex:t.memory.textures,programs:t.programs.length,tier:this.tier.name,gpu:this.info.gpu,pr:this.renderer.getPixelRatio()}}debugView({level:t=0,s:e=null,sunAz:s=null,rel:i=null,camDist:a=1,gust:o=0,zifir:l=!0}={}){let n=this.game;n.startLevel(t,{retry:!0}),n.s=e==null?n.s0+4:n.s0+e*(n.s1-n.s0),n._set("play"),this.ui.card(null),this.ui.hint(null),this.ui.hudOn(!0);let h=this.world.curve.sample(n.s,{}),r=Math.atan2(h.z,h.x);n.sunAz=n.sunTarget=s??r+(i??Math.PI),n.zifir.g.visible=l,n.hold=!0,n.envFrom=n.envTo=n.level.season,n.envT=1,this.rig.zoom=a,this.rig.mode="follow";for(let d=0;d<4;d++)this.time+=.016,n.update(.016,this.time),zt.gust=o,this.rig.snap(),this.rig.update(0);this.renderFrame()}debugCam(t,e,s="spring",i=.5){this.game.envFrom=this.game.envTo=s,this.game.envT=1,this.sunAz=i,this.elev=null,this.rig.pos.copy(t),this.rig.look.copy(e),this.rig.mode="manual",this.rig.update(0),this.focus.copy(e),this.renderFrame()}debugTick(t,e=30){let s=1/e;for(let i=0;i<t;i+=s)this.time+=s,this.game.update(s,this.time),this.rig.update(s);this.renderFrame()}debugSim({level:t=0,policy:e="smart",maxT:s=120,dt:i=1/30}={}){let a=this.game;a.startLevel(t,{retry:!0}),a._set("play"),a.dragged=!0,this.rig.mode="follow";let o=0,l=0,n=new ve.Vector3,h=a.tester,r=0;for(;o<s&&(a.state==="play"||a.state==="enter");){a.state==="enter"&&a._set("play");let d=this.world.curve.sample(a.s,{}),u=Math.atan2(d.z,d.x);if(e==="behind")a.sunTarget=u+Math.PI;else if(e==="smart"&&o>=l&&a.locks.pending(a.s)&&a.speed<.1){l=o+.25;let f=a.locks.pending(a.s),p=this.world.curve.sample(a.s,{}),g=a.elev*Math.PI/180,x=null,y=1e9;for(let m=0;m<180;m++){let b=a.sunAz+(m-90)/90*Math.PI;n.set(Math.cos(g)*Math.cos(b),Math.sin(g),Math.cos(g)*Math.sin(b));let v=0;for(let H of[.48,.86,.36])(!h.blocked(p.x,p.y+H,p.z,n)||a.beams.testPoint(n,p.x,p.y+H,p.z,h))&&v++;if(v)continue;let T=0;for(let H of[1,1.7,.8])h.blocked(f.x,f.y+H,f.z,n)||T++;let z=Math.abs(b-a.sunAz)-T*.5;T&&z<y&&(y=z,x=b)}x!=null&&(a.sunTarget=x),a.hold=!1}else if(e==="smart"&&o>=l){l=o+.2;let f=a.sunTarget,p=1e9;for(let g=0;g<32;g++){let x=a.sunAz+(g-16)/16*Math.PI;n.set(Math.cos(a.elev*Math.PI/180)*Math.cos(x),Math.sin(a.elev*Math.PI/180),Math.cos(a.elev*Math.PI/180)*Math.sin(x));let y=0;for(let b of[0,.8]){let v=this.world.curve.sample(a.s+b,{});(!h.blocked(v.x,v.y+.5,v.z,n)||a.beams.testPoint(n,v.x,v.y+.45,v.z,h))&&(y+=b===0?3:1)}let m=a.locks.pending(a.s);if(m){let b=0;for(let v of[1,1.7])h.blocked(m.x,m.y+v,m.z,n)||b++;y+=(2-b)*.9}for(let b of a.drops.list)b.state!=="idle"||b.s-a.s>9||b.s<a.s-1||(!h.blocked(b.x,b.y+.1,b.z,n)||a.beams.testPoint(n,b.x,b.y,b.z,h,.35))&&(y+=.6);y+=Math.abs(x-a.sunAz)*.05,y<p&&(p=y,f=x)}a.sunTarget=f,a.hold=p>=3&&!a.locks.pending(a.s)}this.time+=i,o+=i,a.update(i,this.time),a.expo>.05&&(r+=i)}return this.rig.update(0),this.renderFrame(),{level:t,policy:e,state:a.state,time:+o.toFixed(1),progress:+((a.s-a.s0)/(a.s1-a.s0)).toFixed(2),minMeter:+a.minMeter.toFixed(2),drops:`${a.got}/${a.drops.total}`,lost:a.lostN,litTime:+r.toFixed(1)}}debugAction(t){this.game.action(t),this.renderFrame()}};function ui(c,t="ulukayin.v1"){if(c&&typeof c.get=="function"&&typeof c.set=="function")return c;let e={};try{e=JSON.parse(localStorage.getItem(t)||"{}")||{}}catch{e={}}return{get:s=>e[s],set:(s,i)=>{e[s]=i;try{localStorage.setItem(t,JSON.stringify(e))}catch{}}}}async function gn(c={}){let t=ui(c.store),e=document.createElement("div");e.className="uk-root",e.style.cssText="position:fixed;inset:0;z-index:50;overflow:hidden;background:#16122a;touch-action:none;",(c.container||document.body).appendChild(e);let s=new je({container:e,store:t,hooks:c.hooks||{},quality:c.quality||"auto",power:c.power||"auto"});return await s.init(),{app:s,open(){e.style.display="",s.start()},close(){s.stop(),e.style.display="none"},destroy(){s.destroy(),e.remove()}}}export{gn as createUluKayin};
