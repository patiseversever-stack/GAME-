import*as de from"three";import*as ce from"three";var I=Math.PI*2,ht=(l,t,e)=>l<t?t:l>e?e:l,ei=l=>l<0?0:l>1?1:l,V=(l,t,e)=>l+(t-l)*e;var Ht=(l,t,e)=>{let s=ei((e-l)/(t-l));return s*s*(3-2*s)},yt=(l,t,e,s)=>t+(l-t)*Math.exp(-e*s),ke=l=>(l=(l+Math.PI)%I,(l<0?l+I:l)-Math.PI);var Ue=l=>l<.5?4*l*l*l:1-Math.pow(-2*l+2,3)/2,qe=l=>1-Math.pow(1-l,3);function _t(l){let t=l>>>0,e=()=>{t=t+1831565813>>>0;let s=t;return s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296};return e.range=(s,i)=>s+(i-s)*e(),e.pick=s=>s[e()*s.length|0],e.sign=()=>e()<.5?-1:1,e}function Vt(l){let t=Math.floor(l),e=l-t,s=a=>{let o=Math.sin(a*127.1)*43758.5453;return o-Math.floor(o)},i=e*e*(3-2*e);return V(s(t),s(t+1),i)*2-1}var Xe=[{id:0,name:"D\xFC\u015F\xFCk",maxPixels:115e4,maxDpr:2,minScale:.62,shadowSize:1024,shadowTaps:1,particles:150,leafDensity:.62,clouds:7,birds:8,shafts:3},{id:1,name:"Orta",maxPixels:19e5,maxDpr:2.4,minScale:.62,shadowSize:2048,shadowTaps:4,particles:340,leafDensity:.85,clouds:11,birds:18,shafts:5},{id:2,name:"Y\xFCksek",maxPixels:3e6,maxDpr:3,minScale:.62,shadowSize:2048,shadowTaps:4,particles:640,leafDensity:1,clouds:16,birds:30,shafts:6}];function rs(l){let t="";try{let o=l.getExtension("WEBGL_debug_renderer_info");t=String(l.getParameter(o?o.UNMASKED_RENDERER_WEBGL:l.RENDERER)||"")}catch{t=""}let e=t.toLowerCase(),s=matchMedia("(pointer: coarse)").matches||/android|iphone|ipad/i.test(navigator.userAgent),i=s?0:1;/swiftshader|llvmpipe|software|microsoft basic/.test(e)||/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(e)?i=0:/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(e)?i=1:/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(e)||/apple/.test(e)||!s&&/nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(e)?i=2:!s&&/intel/.test(e)&&(i=1);let a=navigator.deviceMemory||0;return a&&a<=2?i=0:a&&a<=4&&(i=Math.min(i,1)),{tier:i,gpu:t,mobile:s}}var we=class{constructor({tier:t,gpu:e,store:s,power:i="auto"}){this.T=Xe[t],this.gpu=e,this.store=s,this.power=i,this.battery={saver:!1,level:1,charging:!0};let a=s.get("perf")||{},o=a.gpu===e;this.scale=o?ht(a.scale??1,this.T.minScale,1):1,this.cap=o&&a.cap===30?30:60,this.ceil=o?a.ceil??1:1,this.half=o?!!a.half:t===0,this.vsync=16.67,this._deltas=new Float32Array(24),this._di=0,this._count=0,this._frame=0,this._lastRender=0,this._ema=0,this._slow=0,this._good=0,this._cool=0,this._probe=null,this._ups=0,this._dirty=!1,this.onScale=null,this.menu=!1,this._watchBattery()}get targetFps(){return this.menu||this.power==="saver"||this.power==="auto"&&this.battery.saver?30:this.cap}get maxScale(){return this.power==="saver"||this.power==="auto"&&this.battery.saver?Math.min(this.ceil,.8):this.ceil}get effScale(){return Math.min(this.scale,this.maxScale)}tick(t,e){e>4&&e<40&&(this._deltas[this._di]=e,this._di=(this._di+1)%this._deltas.length,this._count++,this._count%24===0&&(this.vsync=si(this._deltas)));let s=1e3/this.targetFps,i=this._divisor(s);if(this._frame++,this._frame<i)return!1;this._frame=0;let a=this._lastRender?t-this._lastRender:s;return this._lastRender=t,this._adapt(t,a,i*this.vsync),!0}_divisor(t){let e=t/this.vsync;return Math.max(1,this.half?Math.ceil(e-.05):Math.round(e-.15))}reset(){this._lastRender=0,this._frame=0,this._slow=0,this._good=0}_adapt(t,e,s){if(e>s*4)return;this._ema=this._ema?this._ema+(e-this._ema)*.08:e;let i=e/1e3;if(t<this._cool)return;let a=this._ema>s*1.22;if(a?(this._slow+=i,this._good=0):(this._slow=Math.max(0,this._slow-i*.5),this._good+=i),this._probe&&a&&this._slow>1.2){this.ceil=this._probe.from,this._setScale(this._probe.from),this._probe=null,this._cool=t+4e3,this._slow=0,this._dirty=!0;return}if(this._probe&&t-this._probe.t>6e3&&(this._probe=null,this._dirty=!0),this._slow>1.6){this._slow=0,this._cool=t+2200;let o=this.effScale;o>.81?this._setScale(Math.max(.8,o-.1)):!this.half&&this.vsync<14?this.half=!0:o>this.T.minScale+.01?this._setScale(Math.max(this.T.minScale,o-.1)):this.cap===60&&(this.cap=30),this._dirty=!0}else this._good>9&&this._ups<3&&(this._good=0,this.cap===30&&this.power!=="saver"&&!this.battery.saver&&this.effScale>=.8?(this.cap=60,this._ups++,this._cool=t+3e3):this.scale<this.maxScale-.01&&(this._probe={from:this.scale,t},this._setScale(Math.min(this.maxScale,this.scale+.08)),this._ups++,this._cool=t+2500));this._dirty&&t>this._cool&&this.save()}_setScale(t){this.scale=Math.round(t*100)/100,this.onScale&&this.onScale()}save(){this._dirty=!1,this.store.set("perf",{gpu:this.gpu,scale:this.scale,cap:this.cap,ceil:this.ceil,half:this.half})}_watchBattery(){navigator.getBattery&&navigator.getBattery().then(t=>{let e=()=>{this.battery.level=t.level,this.battery.charging=t.charging;let s=this.battery.saver;this.battery.saver=!t.charging&&(s?t.level<=.25:t.level<=.2),s!==this.battery.saver&&this.onBattery&&this.onBattery(this.battery.saver)};e(),t.addEventListener("levelchange",e),t.addEventListener("chargingchange",e)}).catch(()=>{})}pixelRatio(t,e){let s=Math.min(window.devicePixelRatio||1,this.T.maxDpr);return t*e*s*s>this.T.maxPixels&&(s=Math.sqrt(this.T.maxPixels/(t*e))),Math.max(.75,s*this.effScale)}};function si(l){let t=Array.from(l).filter(e=>e>0).sort((e,s)=>e-s);return t.length?t[t.length>>1]:16.67}function ls(l,t){let e={tier:0,gpu:"",mobile:!0};try{let h=document.createElement("canvas").getContext("webgl2");if(h){e=rs(h);let d=h.getExtension("WEBGL_lose_context");d&&d.loseContext()}}catch{}t!=null&&t>=0&&t<=2&&(e.tier=t);let s=/swiftshader|llvmpipe/i.test(e.gpu),i=new ce.WebGLRenderer({canvas:l,antialias:!s,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1});i.outputColorSpace=ce.LinearSRGBColorSpace,i.toneMapping=ce.NoToneMapping,i.setClearColor(1446442,1),i.sortObjects=!0,i.shadowMap.enabled=!1;let o=!!(i.getContext().getContextAttributes()||{}).antialias,c=i.capabilities.getMaxAnisotropy(),n=Xe[e.tier],r=Math.min(c,n.id>=1?8:4);return{renderer:i,tier:n,gpu:e.gpu,mobile:e.mobile,msaa:o,aniso:r}}import*as it from"three";var H=(l,t=1)=>new it.Color(l).multiplyScalar(t);function cs(){return{uTime:{value:0},uSunDir:{value:new it.Vector3(0,1,0)},uSunCol:{value:new it.Color},uSkyTop:{value:new it.Color},uSkyHor:{value:new it.Color},uGround:{value:new it.Color},uShadeTint:{value:new it.Color},uFogCol:{value:new it.Color},uFogSun:{value:new it.Color},uFogP:{value:new it.Vector4(.004,0,.03,6)},uRes:{value:new it.Vector3(1,1,.3)},uLift:{value:new it.Color(0,0,0)},uGain:{value:new it.Color(1,1,1)},uGrade:{value:new it.Vector4(1,1,1,1.2/255)},uWind:{value:new it.Vector4(1,0,.3,0)},uFocus:{value:new it.Vector4(0,-999,0,1.6)},uDanger:{value:0},uShadowMap:{value:null},uShadowMat:{value:new it.Matrix4},uShadowP:{value:new it.Vector4(1/1024,.06,.0012,1)},uZenith:{value:new it.Color},uHorizon:{value:new it.Color},uSunGlow:{value:new it.Color},uSunDisc:{value:new it.Color},uNight:{value:0},uCloudCol:{value:new it.Color},uCloudShade:{value:new it.Color}}}var Ke={spring:{elev:34,sun:H("#ffe4c8",3),zenith:H("#4a7bd0"),horizon:H("#f6d2d4"),sunGlow:H("#ffc9a6",1.3),sunDisc:H("#fff3df",1),skyTop:H("#8aa4dc",.56),skyHor:H("#e9c9d4",.46),ground:H("#b8928a",.32),shade:H("#dcd6ee",1),fog:H("#e4c6d2"),fogSun:H("#ffdcc0",1.1),fogP:[.0026,4,.03,7],cloud:H("#fff1ee",1.15),cloudShade:H("#a48fba",.85),lift:H("#2a1c46",.06),gain:H("#fff6f2"),grade:[1.16,1.1,.95],vignette:.34,night:0},summer:{elev:58,sun:H("#fff3dc",3.2),zenith:H("#2a68d4"),horizon:H("#bfe0f2"),sunGlow:H("#fff0d0",1.1),sunDisc:H("#ffffff",1),skyTop:H("#86aae6",.56),skyHor:H("#c4dae6",.44),ground:H("#97a070",.32),shade:H("#d6dcee",1),fog:H("#c9e2f0"),fogSun:H("#fff1d8",1.05),fogP:[.0022,4,.032,8],cloud:H("#ffffff",1.25),cloudShade:H("#93a9cc",.9),lift:H("#0e1a40",.05),gain:H("#fbfdff"),grade:[1.18,1.1,.95],vignette:.3,night:0},autumn:{elev:22,sun:H("#ffc88a",3.2),zenith:H("#5671b8"),horizon:H("#f2bc88"),sunGlow:H("#ffb070",1.5),sunDisc:H("#fff0d0",1),skyTop:H("#9496c8",.54),skyHor:H("#e2b08c",.44),ground:H("#a6765a",.32),shade:H("#dccfe6",1),fog:H("#e0b48e"),fogSun:H("#ffc488",1.2),fogP:[.003,4,.028,6],cloud:H("#ffe2c2",1.15),cloudShade:H("#9c7c98",.8),lift:H("#2a1430",.06),gain:H("#fff2e4"),grade:[1.16,1.1,.95],vignette:.36,night:0},winter:{elev:8,sun:H("#ff9e6a",3),zenith:H("#262c6a"),horizon:H("#ee8a6c"),sunGlow:H("#ff8a5a",1.7),sunDisc:H("#ffd8b0",1),skyTop:H("#7078b8",.56),skyHor:H("#c890a8",.42),ground:H("#8a88b0",.36),shade:H("#d0ccec",1),fog:H("#8f7cae"),fogSun:H("#ff9f78",1.25),fogP:[.0032,4,.026,5],cloud:H("#ffc4ae",1.05),cloudShade:H("#5e5490",.78),lift:H("#1c1040",.07),gain:H("#fff0ec"),grade:[1.1,1.08,1],vignette:.4,night:.35},night:{elev:30,sun:H("#9fb4ff",.9),zenith:H("#0b0d2a"),horizon:H("#3a3570"),sunGlow:H("#8fa2ff",.6),sunDisc:H("#e8eeff",.6),skyTop:H("#3a4290",.3),skyHor:H("#4a3f80",.24),ground:H("#2a2850",.22),shade:H("#b0b4f0",1),fog:H("#2a2756"),fogSun:H("#5a62b0",1),fogP:[.003,4,.026,6],cloud:H("#8a90d0",.7),cloudShade:H("#2a2a5a",.7),lift:H("#0a0a28",.08),gain:H("#e8ecff"),grade:[1.05,1.1,1.05],vignette:.44,night:1}},ii=new it.Color,ai=new it.Color;function hs(l,t,e,s,i,a=null){let o=(r,h,d)=>r.copy(ii.copy(h).lerp(ai.copy(d),s)),c=(r,h)=>r+(h-r)*s,n=it.MathUtils.degToRad(a??c(t.elev,e.elev));return l.uSunDir.value.set(Math.cos(n)*Math.cos(i),Math.sin(n),Math.cos(n)*Math.sin(i)),o(l.uSunCol.value,t.sun,e.sun),o(l.uZenith.value,t.zenith,e.zenith),o(l.uHorizon.value,t.horizon,e.horizon),o(l.uSunGlow.value,t.sunGlow,e.sunGlow),o(l.uSunDisc.value,t.sunDisc,e.sunDisc),o(l.uSkyTop.value,t.skyTop,e.skyTop),o(l.uSkyHor.value,t.skyHor,e.skyHor),o(l.uGround.value,t.ground,e.ground),o(l.uShadeTint.value,t.shade,e.shade),o(l.uFogCol.value,t.fog,e.fog),o(l.uFogSun.value,t.fogSun,e.fogSun),o(l.uCloudCol.value,t.cloud,e.cloud),o(l.uCloudShade.value,t.cloudShade,e.cloudShade),o(l.uLift.value,t.lift,e.lift),o(l.uGain.value,t.gain,e.gain),l.uFogP.value.set(c(t.fogP[0],e.fogP[0]),c(t.fogP[1],e.fogP[1]),c(t.fogP[2],e.fogP[2]),c(t.fogP[3],e.fogP[3])),l.uGrade.value.x=c(t.grade[0],e.grade[0]),l.uGrade.value.y=c(t.grade[1],e.grade[1]),l.uGrade.value.z=c(t.grade[2],e.grade[2]),l.uRes.value.z=c(t.vignette,e.vignette),l.uNight.value=c(t.night,e.night),n}function fe(l,t,e){let s=it.MathUtils.degToRad(t);return e.set(Math.cos(s)*Math.cos(l),Math.sin(s),Math.cos(s)*Math.sin(l))}import*as xt from"three";var et=`
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
`,ge=`
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
`,At=`
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
`,bt=`
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
`;var Zt=null,us=1;function ps(l,t){Zt=l,us=t}var ds=(l={})=>({SHADOW_TAPS:us,...l}),fs=`
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
`,oi=`
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
}`,ni=`
${et}
${ge}
${At}
${bt}
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
}`;function Yt({map:l=null,repeat:t=[1,1],wrap:e=.3,rim:s=.35,snow:i=0,snowY:a=14,side:o=xt.FrontSide,wind:c=!1,cutout:n=!1}={}){let r={};return l&&(r.USE_MAP=1),c&&(r.WIND=1),n&&(r.CUTOUT=1),new xt.ShaderMaterial({vertexShader:oi,fragmentShader:ni,defines:ds(r),uniforms:{...Zt,uMap:{value:l},uMapRepeat:{value:new xt.Vector2(t[0],t[1])},uWrap:{value:e},uRim:{value:s},uSnow:{value:i},uSnowY:{value:a}},side:o})}var gs=`
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
}`,ri=`
${et}
${ge}
${At}
${bt}
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
}`;function ms(l,{a2c:t}){return new xt.ShaderMaterial({vertexShader:gs,fragmentShader:ri,defines:ds(t?{A2C:1}:{}),uniforms:{...Zt,uMap:{value:l},uAlphaCut:{value:t?.12:.45},uFacing:{value:1},uFaceDir:{value:new xt.Vector3(0,1,0)}},alphaToCoverage:!!t,side:xt.DoubleSide})}function vs(l){return new xt.ShaderMaterial({vertexShader:gs,fragmentShader:`
			uniform sampler2D uMap;
			varying vec2 vUv;
			void main() { if (texture2D(uMap, vUv).a < 0.22) discard; gl_FragColor = vec4(1.0); }`,uniforms:{...Zt,uMap:{value:l},uFacing:{value:0},uFaceDir:Zt.uSunDir},side:xt.DoubleSide,colorWrite:!1})}function Ye({wind:l=!1}={}){return new xt.ShaderMaterial({vertexShader:`
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
			}`,fragmentShader:"void main() { gl_FragColor = vec4(1.0); }",defines:l?{WIND:1}:{},uniforms:{...Zt},side:xt.DoubleSide,colorWrite:!1})}function je(l,t=1){return new xt.ShaderMaterial({vertexShader:"varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",fragmentShader:`
			${et}
			${At}
			${bt}
			uniform vec3 uColor; uniform float uK; uniform float uFade;
			varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(uColor * uK * uFade, vW), 1.0); }`,uniforms:{...Zt,uColor:{value:new xt.Color(l)},uK:{value:t},uFade:{value:1}}})}function xs(l=16777215,t=1){return new xt.ShaderMaterial({vertexShader:`
			attribute vec4 color; varying vec4 vCol; varying vec3 vW;
			void main() { vCol = color; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${At}
			${bt}
			uniform vec3 uColor; uniform float uK;
			varying vec4 vCol; varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(vCol.rgb * uColor * uK, vW), 1.0); }`,uniforms:{...Zt,uColor:{value:new xt.Color(l)},uK:{value:t}}})}function ys(l){return new xt.ShaderMaterial({vertexShader:`
			varying vec3 vDir;
			void main() {
				vDir = position;
				vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
				gl_Position = p.xyww;
			}`,fragmentShader:`
			${et}
			${bt}
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
			}`,uniforms:{...Zt,uStars:{value:l}},depthWrite:!1,side:xt.BackSide})}import*as nt from"three";var Me=class{constructor(t,e){this.G=t,this.size=e,this.half=17,this.scene=new nt.Scene,this.scene.matrixWorldAutoUpdate=!1,this.cam=new nt.OrthographicCamera(-this.half,this.half,this.half,-this.half,1,300);let s=new nt.DepthTexture(e,e);s.type=nt.UnsignedIntType,s.compareFunction=nt.LessEqualCompare,s.minFilter=nt.LinearFilter,s.magFilter=nt.LinearFilter,this.rt=new nt.WebGLRenderTarget(e,e,{depthTexture:s,depthBuffer:!0,stencilBuffer:!1,format:nt.RedFormat,type:nt.UnsignedByteType,minFilter:nt.NearestFilter,magFilter:nt.NearestFilter,generateMipmaps:!1}),t.uShadowMap.value=s,t.uShadowP.value.set(1/e,.05,9e-4,1),this._bias=new nt.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this._r=new nt.Vector3,this._u=new nt.Vector3,this._f=new nt.Vector3,this._p=new nt.Vector3}add(t,e){let s=new nt.Mesh(t,e);return s.frustumCulled=!1,s.matrixAutoUpdate=!1,s.updateMatrixWorld(!0),this.scene.add(s),s}place(t,e){let s=this._f.copy(e).negate(),i=Math.abs(s.y)>.98?this._u.set(1,0,0):this._u.set(0,1,0),a=this._r.crossVectors(s,i).normalize(),o=this._u.crossVectors(a,s).normalize(),c=this.half*2/this.size,n=Math.round(t.dot(a)/c)*c,r=Math.round(t.dot(o)/c)*c,h=t.dot(s),d=this._p.set(0,0,0).addScaledVector(a,n).addScaledVector(o,r).addScaledVector(s,h),u=this.cam;u.position.copy(d).addScaledVector(s,-150),u.up.copy(o),u.lookAt(d),u.updateMatrixWorld(!0),u.updateProjectionMatrix(),this.G.uShadowMat.value.copy(this._bias).multiply(u.projectionMatrix).multiply(u.matrixWorldInverse)}render(t){let e=t.getRenderTarget();t.setRenderTarget(this.rt),t.clear(!1,!0,!1),t.render(this.scene,this.cam),t.setRenderTarget(e)}dispose(){this.rt.depthTexture.dispose(),this.rt.dispose()}};import*as Et from"three";import*as jt from"three";function Ot(l,t){let e=document.createElement("canvas");return e.width=l,e.height=t,[e,e.getContext("2d")]}function ne(l,t,e,s,i,a){for(let o=-1;o<=1;o++)for(let c=-1;c<=1;c++){let n=e+o*l,r=s+c*t;n+i<0||n-i>l||r+i<0||r-i>t||a(n,r)}}function Nt(l,{srgb:t=!0,repeat:e=!0,aniso:s=1,mips:i=!0}={}){let a=new jt.CanvasTexture(l);return t&&(a.colorSpace=jt.SRGBColorSpace),e&&(a.wrapS=a.wrapT=jt.RepeatWrapping),a.anisotropy=s,a.generateMipmaps=i,a.minFilter=i?jt.LinearMipmapLinearFilter:jt.LinearFilter,a.needsUpdate=!0,a}function bs(l,t){let e=l,s=l,[i,a]=Ot(e,s),o=_t(7),c=e/512,n=a.createLinearGradient(0,0,e,0);n.addColorStop(0,"#e8e3da"),n.addColorStop(.5,"#efebe3"),n.addColorStop(1,"#e8e3da"),a.fillStyle=n,a.fillRect(0,0,e,s);let r=["#f6f3ed","#ddd6cc","#e9e1d6","#efe2dc","#e2e2e4","#f2ede2"];for(let h=0;h<70;h++){let d=o()*e,u=o()*s,g=o.range(30,120)*c,p=g*o.range(.12,.4);a.globalAlpha=o.range(.18,.4),a.fillStyle=o.pick(r),ne(e,s,d,u,g,(m,v)=>{a.beginPath(),a.ellipse(m,v,g,p,0,0,I),a.fill()})}a.globalAlpha=.06,a.strokeStyle="#8c8076",a.lineWidth=1*c;for(let h=0;h<90;h++){let d=o()*e,u=o()*s,g=o.range(20,90)*c;ne(e,s,d,u,g,(p,m)=>{a.beginPath(),a.moveTo(p,m),a.lineTo(p+o.range(-2,2)*c,m+g),a.stroke()})}for(let h=0;h<26;h++){let d=o()*e,u=o()*s,g=o.range(40,160)*c,p=o.range(3,9)*c;ne(e,s,d,u,g,(m,v)=>{a.globalAlpha=.5,a.fillStyle="#fbf9f4",a.beginPath(),a.ellipse(m,v,g/2,p/2,0,0,I),a.fill(),a.globalAlpha=.18,a.fillStyle="#7d6e66",a.beginPath(),a.ellipse(m,v+p*.55,g/2.1,p/4,0,0,I),a.fill()})}for(let h=0;h<9;h++){let d=o()*e,u=o()*s,g=o.range(18,50)*c,p=o.range(5,12)*c;ne(e,s,d,u,g,(m,v)=>{a.globalAlpha=.55,a.fillStyle=o()<.5?"#d39a7c":"#c98468",a.beginPath(),a.ellipse(m,v,g/2,p/2,0,0,I),a.fill(),a.globalAlpha=.7,a.strokeStyle="#f7f1e8",a.lineWidth=1.5*c,a.stroke()})}for(let h=0;h<34;h++){let d=o()*s,u=o.range(3,9)|0,g=o()*e;for(let p=0;p<u;p++){let m=o.range(5,34)*c,v=o.range(1.2,3.2)*c,x=d+o.range(-4,4)*c;ne(e,s,g,x,m,(f,y)=>{a.globalAlpha=o.range(.55,.9),a.fillStyle=o()<.7?"#3b3330":"#5a4a44",a.beginPath(),a.ellipse(f,y,m/2,v/2,0,0,I),a.fill()}),g+=m+o.range(4,30)*c}}for(let h=0;h<11;h++){let d=o()*e,u=o()*s,g=o.range(18,64)*c,p=g*o.range(.35,.8);ne(e,s,d,u,g,(m,v)=>{a.globalAlpha=.85,a.fillStyle="#1f1b1a",a.beginPath();let x=18;for(let f=0;f<=x;f++){let y=f/x*I,b=1+o.range(-.25,.2),M=Math.cos(y)*g*.5*b,C=Math.sin(y)*p*.5*b*(.55+.45*Math.abs(Math.cos(y)));f===0?a.moveTo(m+M,v+C):a.lineTo(m+M,v+C)}a.closePath(),a.fill(),a.globalAlpha=.25,a.strokeStyle="#6e625c",a.lineWidth=3*c,a.stroke()})}return a.globalAlpha=1,Nt(i,{aniso:t})}function ks(l,t,e){let[s,i]=Ot(l,t),a=_t(11),o=l/512;i.fillStyle="#b07c50",i.fillRect(0,0,l,t);let c=8,n=l/c,r=["#d6a473","#c99563","#deb07c","#cc9a66","#d3a06c","#c08c5c"];for(let d=0;d<c;d++){let u=d*n;i.fillStyle=a.pick(r),i.fillRect(u+1.5*o,0,n-3*o,t);let g=i.createLinearGradient(0,0,0,t);g.addColorStop(0,"rgba(60,30,10,0.18)"),g.addColorStop(.15,"rgba(255,230,190,0.06)"),g.addColorStop(.85,"rgba(255,230,190,0.04)"),g.addColorStop(1,"rgba(60,30,10,0.22)"),i.fillStyle=g,i.fillRect(u,0,n,t);for(let p=0;p<9;p++){let m=u+a.range(4,n-4)*1;i.globalAlpha=a.range(.12,.3),i.strokeStyle=a()<.5?"#6e4426":"#d9a875",i.lineWidth=a.range(.8,2)*o,i.beginPath();for(let v=0;v<=t;v+=8*o){let x=Math.sin(v*.03/o+p*1.7+d)*2.2*o;v===0?i.moveTo(m+x,v):i.lineTo(m+x,v)}i.stroke()}if(a()<.45){let p=u+a.range(8,n-8),m=a.range(.2,.8)*t;i.globalAlpha=.5,i.fillStyle="#5c381e",i.beginPath(),i.ellipse(p,m,3*o,7*o,0,0,I),i.fill()}i.globalAlpha=.8,i.fillStyle="#3a2a22";for(let p of[t*.12,t*.88])i.beginPath(),i.arc(u+n*.5,p,2.2*o,0,I),i.fill();i.globalAlpha=1}i.fillStyle="#4a2e1c";for(let d=0;d<=c;d++)i.fillRect(d*n-1.6*o,0,3.2*o,t);let h=i.createLinearGradient(0,0,0,t);return h.addColorStop(0,"rgba(40,20,8,0.35)"),h.addColorStop(.06,"rgba(40,20,8,0)"),h.addColorStop(.94,"rgba(40,20,8,0)"),h.addColorStop(1,"rgba(40,20,8,0.35)"),i.fillStyle=h,i.fillRect(0,0,l,t),Nt(s,{aniso:e})}function ws(l){let[t,e]=Ot(l,l),s=l/2,i=_t(23),a=(n,r,h,d,u,g,p)=>{e.save(),e.translate(n,r),e.rotate(u),e.fillStyle=g,e.beginPath(),e.moveTo(0,-h*.5),e.quadraticCurveTo(d,-h*.1,0,h*.5),e.quadraticCurveTo(-d,-h*.1,0,-h*.5),e.fill(),p&&(e.strokeStyle=p,e.lineWidth=Math.max(.6,d*.08),e.beginPath(),e.moveTo(0,-h*.42),e.lineTo(0,h*.42),e.stroke()),e.restore()},o=(n,r,h,d)=>{for(let u=0;u<h;u++){let g=i()*I,p=Math.sqrt(i())*s*.4,m=n+Math.cos(g)*p,v=r+Math.sin(g)*p*.92,x=1-(v-(r-s*.4))/(s*.8);d(m,v,x,p/(s*.4))}},c=s/256;{let n=s*.5,r=s*.5;o(n,r,40,(d,u,g)=>{a(d,u,i.range(20,30)*c,i.range(7,10)*c,i()*I,g>.5?"#9fc56a":"#76a24e",null)});let h=["#ffd3e2","#ffc2d6","#ffe6ee","#f7a9c4","#ffdbe6"];o(n,r,120,(d,u,g)=>{let p=i.range(8,13)*c,m=i.pick(h),v=i()*I;e.fillStyle=m;for(let x=0;x<5;x++){let f=v+x/5*I;e.beginPath(),e.ellipse(d+Math.cos(f)*p*.55,u+Math.sin(f)*p*.55,p*.55,p*.38,f,0,I),e.fill()}e.fillStyle=g>.5?"#fff3c8":"#e88aa8",e.beginPath(),e.arc(d,u,p*.22,0,I),e.fill(),g<.4&&(e.globalAlpha=.25,e.fillStyle="#a0507a",e.beginPath(),e.arc(d,u,p*.9,0,I),e.fill(),e.globalAlpha=1)})}{let n=s*1.5,r=s*.5,h=["#4f8f3a","#5fa040","#3f7a32","#6db24a","#477f35","#7cbc54"];o(n,r,190,(d,u,g)=>{let p=g>.65&&i()<.6?"#8ccc5e":i.pick(h);a(d,u,i.range(22,34)*c,i.range(8,12)*c,i()*I,p,"rgba(30,60,20,0.45)")})}{let n=s*.5,r=s*1.5,h=["#f2b233","#f7c440","#e8932c","#f0a030","#d9702a","#c8512a","#ffd65a"];o(n,r,170,(d,u,g)=>{let p=g>.6&&i()<.5?"#ffd86a":i.pick(h);a(d,u,i.range(22,34)*c,i.range(9,13)*c,i()*I,p,"rgba(120,50,10,0.4)")})}{let n=s*1.5,r=s*1.5;o(n,r,70,(h,d,u)=>{let g=i.range(12,26)*c,p=e.createRadialGradient(h-g*.3,d-g*.4,g*.1,h,d,g);p.addColorStop(0,u>.4?"#ffffff":"#eef2ff"),p.addColorStop(1,u>.4?"#d8e2f6":"#b8c4e8"),e.fillStyle=p,e.beginPath(),e.arc(h,d,g,0,I),e.fill()})}return Nt(t,{repeat:!1})}function Ms(l=128){let[t,e]=Ot(l,l),s=l/2,i=e.createRadialGradient(s,s,0,s,s,s);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.18,"rgba(255,255,255,0.55)"),i.addColorStop(.45,"rgba(255,255,255,0.14)"),i.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=i,e.fillRect(0,0,l,l),Nt(t,{srgb:!1,repeat:!1})}function Ts(l=128){let[t,e]=Ot(l,l),s=l/2,i=_t(5);for(let a=0;a<22;a++){let o=i()*I,c=i()*l*.18,n=l*i.range(.12,.3),r=s+Math.cos(o)*c,h=s+Math.sin(o)*c,d=e.createRadialGradient(r,h,0,r,h,n);d.addColorStop(0,"rgba(10,6,20,0.55)"),d.addColorStop(1,"rgba(10,6,20,0)"),e.fillStyle=d,e.fillRect(0,0,l,l)}return Nt(t,{srgb:!1,repeat:!1})}function Es(l=1024,t=512){let[e,s]=Ot(l,t);s.fillStyle="#000",s.fillRect(0,0,l,t);let i=_t(99);for(let a=0;a<900;a++){let o=i()*l,c=i()*t,n=Math.pow(i(),3),r=.5+n*1.6;s.fillStyle=`rgb(${80+n*175|0},${i()*255|0},0)`,s.beginPath(),s.arc(o,c,r,0,I),s.fill()}return Nt(e,{srgb:!1})}function zs(l=256){let[t,e]=Ot(l,l),s=_t(41),i=l/2;for(let a=0;a<46;a++){let o=s()*I,c=Math.pow(s(),.8)*l*.28,n=i+Math.cos(o)*c*1.3,r=i+Math.sin(o)*c*.55+l*.04,h=l*s.range(.08,.2),d=e.createRadialGradient(n,r-h*.3,0,n,r,h),g=Math.max(0,Math.min(1,1-(r-i*.6)/(l*.5)))*255|0;d.addColorStop(0,`rgba(${g},${g},${g},0.5)`),d.addColorStop(1,`rgba(${g},${g},${g},0)`),e.fillStyle=d,e.fillRect(0,0,l,l)}return Nt(t,{srgb:!1,repeat:!1})}function Ss(l=256){let[t,e]=Ot(l,l),s=e.createImageData(l,l),i=_t(3),a=[8,16,32,64],o=a.map(n=>{let r=new Float32Array(n*n);for(let h=0;h<r.length;h++)r[h]=i();return r}),c=(n,r,h,d)=>{let u=h*r,g=d*r,p=Math.floor(u),m=Math.floor(g),v=u-p,x=g-m,f=v*v*(3-2*v),y=x*x*(3-2*x),b=(F,W)=>n[(W%r+r)%r*r+(F%r+r)%r],M=b(p,m)+(b(p+1,m)-b(p,m))*f,C=b(p,m+1)+(b(p+1,m+1)-b(p,m+1))*f;return M+(C-M)*y};for(let n=0;n<l;n++)for(let r=0;r<l;r++){let h=r/l,d=n/l,u=0,g=.55,p=0;for(let x=0;x<a.length;x++)u+=c(o[x],a[x],h,d)*g,p+=g,g*=.5;u/=p;let m=c(o[1],a[1],h+.37,d+.21),v=(n*l+r)*4;s.data[v]=u*255,s.data[v+1]=m*255,s.data[v+2]=0,s.data[v+3]=255}return e.putImageData(s,0,0),Nt(t,{srgb:!1})}function _s(l=128){let[t,e]=Ot(l,l),s=l/2,i=s/2;e.fillStyle="#ffd0e0",e.beginPath(),e.ellipse(i,i,s*.32,s*.2,.4,0,I),e.fill(),e.fillStyle="#ffeef4",e.beginPath(),e.ellipse(i-s*.06,i-s*.03,s*.16,s*.08,.4,0,I),e.fill(),e.save(),e.translate(s+i,i),e.rotate(.6),e.fillStyle="#f0a43a",e.beginPath(),e.moveTo(0,-s*.36),e.quadraticCurveTo(s*.22,0,0,s*.36),e.quadraticCurveTo(-s*.22,0,0,-s*.36),e.fill(),e.strokeStyle="rgba(120,50,10,0.6)",e.lineWidth=1.2,e.beginPath(),e.moveTo(0,-s*.3),e.lineTo(0,s*.3),e.stroke(),e.restore();let a=e.createRadialGradient(i,s+i,0,i,s+i,s*.3);return a.addColorStop(0,"rgba(255,255,255,1)"),a.addColorStop(.5,"rgba(240,246,255,0.8)"),a.addColorStop(1,"rgba(230,240,255,0)"),e.fillStyle=a,e.fillRect(0,s,s,s),a=e.createRadialGradient(s+i,s+i,0,s+i,s+i,s*.48),a.addColorStop(0,"rgba(255,255,230,1)"),a.addColorStop(.15,"rgba(255,240,160,0.9)"),a.addColorStop(.45,"rgba(255,200,90,0.22)"),a.addColorStop(1,"rgba(255,180,60,0)"),e.fillStyle=a,e.fillRect(s,s,s,s),Nt(t,{repeat:!1})}function Rs(l=128,t=256){let[e,s]=Ot(l,t),i=_t(17);for(let c=0;c<26;c++){let n=i()*l,r=i.range(3,14),h=s.createLinearGradient(n-r,0,n+r,0),d=i.range(.15,.5);h.addColorStop(0,"rgba(255,255,255,0)"),h.addColorStop(.5,`rgba(255,255,255,${d})`),h.addColorStop(1,"rgba(255,255,255,0)"),s.fillStyle=h,s.fillRect(n-r,0,r*2,t)}s.globalCompositeOperation="destination-in";let a=s.createLinearGradient(0,0,0,t);a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(.25,"rgba(0,0,0,1)"),a.addColorStop(.7,"rgba(0,0,0,0.6)"),a.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=a,s.fillRect(0,0,l,t);let o=s.createLinearGradient(0,0,l,0);return o.addColorStop(0,"rgba(0,0,0,0)"),o.addColorStop(.2,"rgba(0,0,0,1)"),o.addColorStop(.8,"rgba(0,0,0,1)"),o.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=o,s.fillRect(0,0,l,t),s.globalCompositeOperation="source-over",Nt(e,{srgb:!1,repeat:!1})}function Hs(l,t){let[e,s]=Ot(l,l),i=_t(31),a=l/256;s.fillStyle="#8f8496",s.fillRect(0,0,l,l);let o=["#a093a6","#7b7088","#9a8c94","#b0a2a8","#857a92","#6f6680"];for(let c=0;c<160;c++){let n=i()*l,r=i()*l,h=i.range(6,40)*a,d=h*i.range(.2,.6);s.globalAlpha=i.range(.2,.5),s.fillStyle=i.pick(o),ne(l,l,n,r,h,(u,g)=>{s.beginPath(),s.ellipse(u,g,h,d,0,0,I),s.fill()})}s.globalAlpha=.22,s.strokeStyle="#4e4660";for(let c=0;c<14;c++){let n=i()*l;s.lineWidth=i.range(1,3)*a,s.beginPath();for(let r=0;r<=l;r+=8*a){let h=n+Math.sin(r*.05/a+c)*3*a;r===0?s.moveTo(r,h):s.lineTo(r,h)}s.stroke()}return s.globalAlpha=1,Nt(e,{aniso:t})}import*as Ft from"three";import*as wt from"three";var kt=class{constructor(){this.p=[],this.n=[],this.c=[],this.uv=[],this.sw=[],this.idx=[],this.hasSway=!1,this.sway=[0,0,0,0]}get count(){return this.p.length/3}setSway(t,e,s,i){this.sway[0]=t,this.sway[1]=e,this.sway[2]=s,this.sway[3]=i,i>0&&(this.hasSway=!0)}vert(t,e,s,i,a,o,c,n,r,h,d=0,u=0){return this.p.push(t,e,s),this.n.push(i,a,o),this.c.push(c,n,r,h),this.uv.push(d,u),this.sw.push(this.sway[0],this.sway[1],this.sway[2],this.sway[3]),this.count-1}tri(t,e,s){this.idx.push(t,e,s)}quad(t,e,s,i){this.idx.push(t,e,s,t,s,i)}tube(t,e,s,i,{uvScale:a=1,capEnd:o=!0,capStart:c=!1,sway:n=null}={}){let r=t.length,h=new wt.Vector3,d=new wt.Vector3,u=new wt.Vector3,g=new wt.Vector3,p=this.count,m=0;for(let f=0;f<r;f++){let y=t[Math.max(0,f-1)],b=t[Math.min(r-1,f+1)];h.subVectors(b,y).normalize(),f===0?(g.set(0,1,0),Math.abs(h.dot(g))>.9&&g.set(1,0,0),d.crossVectors(h,g).normalize()):d.sub(g.copy(h).multiplyScalar(d.dot(h))).normalize(),u.crossVectors(h,d).normalize(),f>0&&(m+=t[f].distanceTo(t[f-1])/(Math.PI*2*Math.max(e[f],.05))*a),n&&n(f,f/(r-1));for(let M=0;M<=s;M++){let C=M/s*Math.PI*2,F=Math.cos(C),W=Math.sin(C),O=d.x*F+u.x*W,Q=d.y*F+u.y*W,B=d.z*F+u.z*W,Y=e[f],T=i(f,f/(r-1),C,O,Q,B);this.vert(t[f].x+O*Y,t[f].y+Q*Y,t[f].z+B*Y,O,Q,B,T[0],T[1],T[2],T[3],M/s,m)}}let v=s+1;for(let f=0;f<r-1;f++)for(let y=0;y<s;y++){let b=p+f*v+y,M=b+v;this.quad(b,M,M+1,b+1)}let x=(f,y)=>{let b=t[f],M=new wt.Vector3().subVectors(t[y?1:r-1],t[y?0:r-2]).normalize();y&&M.negate();let C=i(f,y?0:1,0,M.x,M.y,M.z),F=this.vert(b.x,b.y,b.z,M.x,M.y,M.z,C[0],C[1],C[2],C[3],.5,m),W=p+f*v;for(let O=0;O<s;O++)y?this.tri(F,W+O+1,W+O):this.tri(F,W+O,W+O+1)};o&&x(r-1,!1),c&&x(0,!0)}box(t,e,s,i,a){let o=[[e,s,i],[e.clone().negate(),s,i.clone().negate()],[i,s,e.clone().negate()],[i.clone().negate(),s,e],[s,i,e],[s.clone().negate(),i.clone().negate(),e]];for(let[c,n,r]of o){let h=c.clone().normalize(),d=a(h),u=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([m,v])=>{let x=t.clone().add(c).addScaledVector(r,m).addScaledVector(n,v);return this.vert(x.x,x.y,x.z,h.x,h.y,h.z,d[0],d[1],d[2],d[3],(m+1)/2,(v+1)/2)}),g=new wt.Vector3().subVectors(this.at(u[1]),this.at(u[0])),p=new wt.Vector3().subVectors(this.at(u[2]),this.at(u[0]));g.cross(p).dot(h)>=0?this.quad(u[0],u[1],u[2],u[3]):this.quad(u[0],u[3],u[2],u[1])}}fixWinding(){let t=this.p,e=this.n,s=this.idx;for(let i=0;i<s.length;i+=3){let a=s[i]*3,o=s[i+1]*3,c=s[i+2]*3,n=t[o]-t[a],r=t[o+1]-t[a+1],h=t[o+2]-t[a+2],d=t[c]-t[a],u=t[c+1]-t[a+1],g=t[c+2]-t[a+2],p=r*g-h*u,m=h*d-n*g,v=n*u-r*d;if(p*e[a]+m*e[a+1]+v*e[a+2]<0){let x=s[i+1];s[i+1]=s[i+2],s[i+2]=x}}return this}at(t){return new wt.Vector3(this.p[t*3],this.p[t*3+1],this.p[t*3+2])}build(){let t=new wt.BufferGeometry;return t.setAttribute("position",new wt.Float32BufferAttribute(this.p,3)),t.setAttribute("normal",new wt.Float32BufferAttribute(this.n,3)),t.setAttribute("color",new wt.Float32BufferAttribute(this.c,4)),t.setAttribute("uv",new wt.Float32BufferAttribute(this.uv,2)),this.hasSway&&t.setAttribute("aSway",new wt.Float32BufferAttribute(this.sw,4)),t.setIndex(this.count>65535?new wt.Uint32BufferAttribute(this.idx,1):new wt.Uint16BufferAttribute(this.idx,1)),t.computeBoundingSphere(),t.computeBoundingBox(),t}};var me=7.658461538461538*Math.PI*2;function Mt(l){let t=Math.max(l,-2);return 3.05+.95*(1-Math.min(t,52)/52)+1.9*Math.exp(-Math.max(t,0)/2.3)}var he=[{th:9.35,out:3.4,w:.5,leaves:"blossom"},{th:15.5,out:4.6,w:.56,leaves:"green"},{th:21.3,out:6.2,w:.62,leaves:"green",nest:!0},{th:33,out:4.8,w:.54,leaves:"gold"},{th:39.4,out:3.8,w:.48,leaves:"snow"}],ci=l=>Math.abs(l)>=1?0:.5+.5*Math.cos(Math.PI*l);function Qt(l){return 50.4-l/(Math.PI*2)*6.5}function Ze(l){let t=0;for(let e of he)t+=e.out*ci((l-e.th)/e.w);return t}function Qe(l){return Mt(Qt(l))+.98+Ze(l)}var se=[{id:"bahar-1",season:"spring",from:0,to:6,title:"\xC7i\xE7ek Tac\u0131",kicker:"Bahar \xB7 I"},{id:"bahar-2",season:"spring",from:6,to:12,title:"Pembe R\xFCzg\xE2r",kicker:"Bahar \xB7 II"},{id:"yaz-1",season:"summer",from:12,to:18,title:"Z\xFCmr\xFCt G\xF6vde",kicker:"Yaz \xB7 I"},{id:"yaz-2",season:"summer",from:18,to:24,title:"Ku\u015F Yuvas\u0131",kicker:"Yaz \xB7 II"},{id:"guz-1",season:"autumn",from:24,to:30,title:"Alt\u0131n Yapraklar",kicker:"G\xFCz \xB7 I"},{id:"guz-2",season:"autumn",from:30,to:36,title:"F\u0131rt\u0131na",kicker:"G\xFCz \xB7 II"},{id:"kis-1",season:"winter",from:36,to:42,title:"K\u0131ra\u011F\u0131",kicker:"K\u0131\u015F \xB7 I"},{id:"kis-2",season:"winter",from:42,to:me,title:"K\xF6k Kap\u0131s\u0131",kicker:"K\u0131\u015F \xB7 II",finale:!0}];function Te(l,t=[0,0,0,0]){let e=(o,c,n)=>{let r=Math.min(1,Math.max(0,(n-o)/(c-o)));return r*r*(3-2*r)},s=e(37,41,l),i=e(25,29,l)*(1-s),a=e(12.5,16.5,l)*(1-s-i);return t[0]=s,t[1]=i,t[2]=a,t[3]=Math.max(0,1-s-i-a),t}var Ee=.2,ze=class{constructor(){let t=[],e=0,s=0,i=0,a=0,o=.002;for(let r=0;r<=me+1e-6;r+=o){let h=Qe(r),d=Math.cos(r)*h,u=Math.sin(r)*h,g=Qt(r);t.length&&(e+=Math.hypot(d-s,g-i,u-a)),t.push(r,e),s=d,i=g,a=u}this.length=e;let c=Math.floor(e/Ee)+1;this.n=c,this.TH=new Float32Array(c),this.X=new Float32Array(c),this.Y=new Float32Array(c),this.Z=new Float32Array(c),this.R=new Float32Array(c);let n=0;for(let r=0;r<c;r++){let h=r*Ee;for(;n<t.length/2-2&&t[(n+1)*2+1]<h;)n++;let d=t[n*2+1],u=t[(n+1)*2+1],g=u>d?(h-d)/(u-d):0,p=t[n*2]+(t[(n+1)*2]-t[n*2])*ht(g,0,1),m=Qe(p);this.TH[r]=p,this.R[r]=m,this.X[r]=Math.cos(p)*m,this.Z[r]=Math.sin(p)*m,this.Y[r]=Qt(p)}this.TX=new Float32Array(c),this.TY=new Float32Array(c),this.TZ=new Float32Array(c),this.SX=new Float32Array(c),this.SZ=new Float32Array(c);for(let r=0;r<c;r++){let h=Math.max(0,r-1),d=Math.min(c-1,r+1),u=this.X[d]-this.X[h],g=this.Y[d]-this.Y[h],p=this.Z[d]-this.Z[h],m=Math.hypot(u,g,p)||1;u/=m,g/=m,p/=m,this.TX[r]=u,this.TY[r]=g,this.TZ[r]=p;let v=-p,x=u,f=Math.hypot(v,x)||1;v/=f,x/=f,v*this.X[r]+x*this.Z[r]<0&&(v=-v,x=-x),this.SX[r]=v,this.SZ[r]=x}}sample(t,e){let s=ht(t/Ee,0,this.n-1.0001),i=Math.floor(s),a=s-i,o=c=>c[i]+(c[i+1]-c[i])*a;return e.x=o(this.X),e.y=o(this.Y),e.z=o(this.Z),e.tx=o(this.TX),e.ty=o(this.TY),e.tz=o(this.TZ),e.sx=o(this.SX),e.sz=o(this.SZ),e.th=o(this.TH),e.r=o(this.R),e}sAtTheta(t){let e=0,s=this.n-1;for(;s-e>1;){let a=e+s>>1;this.TH[a]<t?e=a:s=a}let i=(t-this.TH[e])/Math.max(1e-6,this.TH[s]-this.TH[e]);return(e+ht(i,0,1))*Ee}offTrunk(t){return this.R[t]-Mt(this.Y[t])}};function Cs(l){let t=new kt,e=l.n,s=new Float32Array(e);for(let p=0;p<e;p++){let m=l.offTrunk(p);s[p]=.95+.2*(1-Ht(1.3,2.2,m))}let i=1.9/2,a=1/2.8;for(let p=0;p<e;p++){let m=l.X[p],v=l.Y[p],x=l.Z[p],f=l.SX[p],y=l.SZ[p],b=p*.2,M=m-f*s[p],C=x-y*s[p],F=m+f*i,W=x+y*i,O=l.offTrunk(p),Q=1-Ht(1.3,2.2,O),B=.62+.38*(1-Q);t.vert(M,v-.02,C,0,1,0,1,1,1,B,b*a,0),t.vert(m-f*.3,v,x-y*.3,0,1,0,1,1,1,.92+.08*(1-Q),b*a,.35),t.vert(m+f*.3,v,x+y*.3,0,1,0,1,1,1,1,b*a,.65),t.vert(F,v-.02,W,f*.2,.98,y*.2,1,1,1,1,b*a,1),t.vert(F,v-.02,W,f,0,y,.72,.68,.64,.9,b*a,0),t.vert(F,v-.34,W,f,0,y,.72,.68,.64,.7,b*a,.12),t.vert(F,v-.34,W,0,-1,0,.5,.46,.44,.55,b*a,0),t.vert(M,v-.34,C,0,-1,0,.5,.46,.44,.4,b*a,1),t.vert(M,v-.34,C,-f,0,-y,.72,.68,.64,.7,b*a,.12),t.vert(M,v-.02,C,-f,0,-y,.72,.68,.64,.9,b*a,0)}let o=10;for(let p=0;p<e-1;p++){let m=p*o,v=(p+1)*o,x=(f,y)=>t.quad(m+f,v+f,v+y,m+y);x(0,1),x(1,2),x(2,3),x(4,5),x(6,7),x(8,9)}t.fixWinding();let c=new kt,n=[],r=1.55,h=[],d=p=>()=>[.42*p,.27*p,.17*p,1];for(let p=.6;p<l.length-.4;p+=r){let m=Math.round(p/.2),x=l.offTrunk(m)>2?[1,-1]:[1];for(let f of x){let y=f>0?i-.1:s[m]-.1,b=l.X[m]+l.SX[m]*y*f,M=l.Z[m]+l.SZ[m]*y*f,C=l.Y[m],F=new Ft.Vector3(b,C-.05,M),W=new Ft.Vector3(b,C+.78,M);c.tube([F,W],[.06,.05],6,d(1),{capEnd:!0}),h.push({s:p,side:f,top:W.clone()})}}for(let p of[1,-1]){let m=h.filter(v=>v.side===p);for(let v=0;v<m.length-1;v++){let x=m[v],f=m[v+1];if(f.s-x.s>r*1.6)continue;let y=[];for(let b=0;b<=1.0001;b+=.25){let M=x.top.clone().lerp(f.top,b);M.y-=.03+Math.sin(b*Math.PI)*.14,y.push(M)}c.tube(y,y.map(()=>.028),4,()=>[.62,.5,.36,1],{capEnd:!1})}}for(let p=1.2;p<l.length-1;p+=2.6){let m=Math.round(p/.2);if(l.offTrunk(m)>1.6)continue;let v=l.Y[m],x=l.TH[m],f=new Ft.Vector3(l.X[m]+l.SX[m]*.55,v-.34+.02,l.Z[m]+l.SZ[m]*.55),y=Mt(v-1.5)-.1,b=new Ft.Vector3(Math.cos(x)*y,v-1.55,Math.sin(x)*y);c.tube([f,b],[.075,.09],5,d(.85),{capEnd:!0,capStart:!0})}let u=new kt,g=7;for(let p of h){if(p.side<0||p.s<g)continue;let m=Math.round(p.s/.2);if(l.offTrunk(m)>1.6)continue;g=p.s+12.5;let v=l.SX[m],x=l.SZ[m],f=p.top.clone().add(new Ft.Vector3(v*.32,.05,x*.32));c.tube([p.top.clone().add(new Ft.Vector3(0,-.02,0)),f],[.022,.022],4,d(.6),{capEnd:!1});let y=f.clone().add(new Ft.Vector3(0,-.28,0)),b=new Ft.Vector3(.09,0,0),M=new Ft.Vector3(0,.13,0),C=new Ft.Vector3(0,0,.09);u.box(y,b,M,C,F=>[1,.82+.18*F.y,.7,1]),c.box(y.clone().add(new Ft.Vector3(0,.16,0)),b.clone().multiplyScalar(1.35),new Ft.Vector3(0,.035,0),C.clone().multiplyScalar(1.35),()=>[.3,.2,.14,1]),c.box(y.clone().add(new Ft.Vector3(0,-.15,0)),b.clone().multiplyScalar(1.15),new Ft.Vector3(0,.02,0),C.clone().multiplyScalar(1.15),()=>[.3,.2,.14,1]),n.push(y)}return{walkway:t.build(),rail:c.build(),glass:u.build(),lanterns:n}}import*as Tt from"three";var Ps=[4.85,5.72,.48,1.3];function $t(l,t){let e=Mt(t),s=1+.022*Math.sin(7*l+.13*t)+.014*Math.sin(12*l-.31*t+1.3),i=Math.max(t,0),a=0;for(let c of Ps){let n=Math.atan2(Math.sin(l-c),Math.cos(l-c));a+=Math.exp(-(n*n)/.045)*1.55}a*=Math.exp(-i/1.9);let o=Math.pow(Math.max(0,Math.cos(5*(l-.45))),2)*.75*Ht(49.5,53.5,t);return e*s+a+o}var ut=(l,t,e)=>new Tt.Vector3(l,t,e),gt=(l,t,e)=>ut(Math.cos(t)*l,e,Math.sin(t)*l);function hi(l,t=4){return new Tt.CatmullRomCurve3(l,!1,"centripetal").getPoints(Math.max(2,(l.length-1)*t))}function Fs(l,t){let e=_t(1453),s=t,i=s.leafDensity,a=new kt,o=new kt,c=[],n=[],r=k=>(w,z)=>{let S=Ht(.35,.08,k*(1-z*.85));return[V(1,.52,S),V(1,.38,S),V(1,.33,S),V(.85,1,z)]},h=(k,w,z,S,P,D,U=7)=>{let tt=hi(k,4),J=tt.length,X=e()*10,ct=tt.map((ot,Z)=>{let dt=Z/(J-1);return V(w,z,Math.pow(dt,.7))*(1+.1*Math.sin(Z*1.9+X)*(1-dt))*(1+.35*Math.exp(-dt*14))});a.tube(tt,ct,U,r(w),{uvScale:.6,sway:(ot,Z)=>a.setSway(S.x,S.y,S.z,V(P,D,Math.pow(Z,1.6)))});for(let ot=0;ot<J-1;ot+=2){let Z=Math.min(J-1,ot+2),dt=ct[ot];if(dt<.1)break;c.push({a:tt[ot].clone(),b:tt[Z].clone(),r:(dt+ct[Z])*.5*.92,anchor:S,wa:V(P,D,Math.pow(ot/(J-1),1.6)),wb:V(P,D,Math.pow(Z/(J-1),1.6))})}return a.setSway(0,0,0,0),tt},d=(k,w,z,S,P=-1,D=1)=>{n.push({c:k.clone(),r:w,rx:w*1.15,ry:w*.78*D,rz:w*1.15,anchor:z,w:S,type:P})},u=[];for(let k=4.5;k<48.5;k+=e.range(1.55,2.3)){let z=(50.4-k)/6.5*I+Math.PI+e.range(-.55,.55),S=!1;for(let P of he){let D=Math.abs(Qt(P.th)-k),U=Math.abs(Math.atan2(Math.sin(z-P.th),Math.cos(z-P.th)));D<4.5&&U<P.w+.7&&(S=!0)}if(!S&&(u.push({y:k,az:z}),e()<.35)){let P=z+e.range(-.9,.9)+(e()<.5?.9:-.9);u.push({y:k+e.range(-.4,.4),az:P})}}for(let k of u){let{y:w,az:z}=k,S=Mt(w),P=w<13,D=(P?e.range(4,6):e.range(4.8,7.4))*(w>40?1.12:1),U=e.range(-.22,.22),tt=e.range(.3,.55),J=e.range(-.35,.35),X=[gt(S*.55,z,w-.2),gt(S+.7,z+U*.15,w+.15),gt(S+D*.42,z+U*.5,w+D*tt*.3+J),gt(S+D*.75,z+U*.8,w+D*tt*.7-J*.5),gt(S+D,z+U*1.2,w+D*tt)],ct=X[4],ot=D/8,Z=V(.42,.7,(D-4.5)/5),dt=h(X,Z,.07,ct,0,ot),le=P?2:e.range(1,3.6)|0;for(let It=0;It<le;It++){let St=e.range(.45,.85),Ct=dt[Math.round(St*(dt.length-1))],Dt=ut(Math.cos(z+U),0,Math.sin(z+U)),ft=ut(-Dt.z,0,Dt.x).multiplyScalar(e.sign()*e.range(.6,1)),Xt=e.range(1.8,3.4),Wt=Ct.clone().addScaledVector(Dt,Xt*.55).addScaledVector(ft,Xt*.6).add(ut(0,Xt*e.range(.25,.6),0)),Kt=Ct.clone().lerp(Wt,.5).add(ut(0,.15,0)),Bt=ot*Math.pow(St,1.6);h([Ct,Kt,Wt],V(Z,.07,St)*.55,.04,ct,Bt,Bt+.25,5),P?e()<.7&&d(Wt.clone().add(ut(0,.12,0)),e.range(.35,.5),ct,Bt+.25,3,.7):d(Wt,e.range(1.05,1.6),ct,Bt+.25)}if(!P)d(ct,e.range(1.5,2.2),ct,ot),d(dt[Math.round(dt.length*.72)],e.range(1.2,1.8),ct,ot*.6);else for(let It of[.4,.62,.84]){let St=dt[Math.round(It*(dt.length-1))];d(St.clone().add(ut(0,.22,0)),e.range(.38,.6),ct,ot*Math.pow(It,1.6),3,.6)}}let g=6;for(let k=0;k<g;k++){let w=.45+k/g*I+e.range(-.18,.18),z=e.range(12.5,16),S=e.range(7,10),P=[gt(.8,w,53-3.5),gt(2.6,w+.05,53+.4),gt(5.4,w+.12,53+S*.45),gt(z*.75,w+.2,53+S*.85),gt(z,w+.26,53+S*.8)],D=P[4],U=h(P,1.3,.14,D,0,.9,9);for(let tt=0;tt<5;tt++){let J=.32+tt*.15,X=U[Math.round(J*(U.length-1))],ct=w+e.range(-1.1,1.1),ot=e.range(3.8,6.5),Z=X.clone().add(ut(Math.cos(ct)*ot,e.range(.6,3.4),Math.sin(ct)*ot)),dt=X.clone().lerp(Z,.5).add(ut(0,.6,0));h([X,dt,Z],V(1.3,.14,J)*.5,.06,D,.9*J,1.1,6),d(Z,e.range(2.3,3.1),D,1.1),d(dt.clone().add(ut(0,1,0)),e.range(1.8,2.4),D,.9),e()<.6&&d(Z.clone().add(ut(0,-1.6,0)),e.range(1.4,1.9),D,1.1,-1,1.25)}d(D.clone().add(ut(0,.6,0)),e.range(2.6,3.3),D,.9),d(U[Math.round(U.length*.6)].clone().add(ut(0,1.5,0)),e.range(2.4,3),D,.6)}for(let k=0;k<14;k++){let w=e()*I,z=e.range(0,9);d(gt(z,w,53+e.range(8.5,12)-z*.25),e.range(2.6,3.4),gt(z,w,62),.6)}for(let k=0;k<6;k++){let w=e.range(-.8,1.6),z=Mt(50.4)+e.range(1.2,4.5);d(gt(z,w,50.4+e.range(3.6,5.5)),e.range(1.5,2.1),gt(z,w,50.4+5),.5)}let p={},m=[];for(let k of he){let w=Math.acos(ht(2/k.out-1,-1,1))/Math.PI*k.w,z=k.th-w,S=k.th+w,P=l.sAtTheta(z),D=l.sAtTheta(S);l.sample(l.sAtTheta(k.th),p);let U=ut(p.x,p.y,p.z),tt=ut(p.sx,0,p.sz),J=[];for(let ft=P-1.5;ft<=D+1.5;ft+=1.7){l.sample(ft,p);let Xt=Math.hypot(p.x,p.z)-Mt(p.y);if(Xt<1.5||Xt>3.6)continue;let Wt=ut(p.x,p.y-.34+.02,p.z),Kt=Mt(p.y-2.2)-.15,Bt=Math.atan2(p.z,p.x),Ge=gt(Kt,Bt,p.y-2.4);o.tube([Wt,Ge],[.08,.1],5,()=>[.42,.27,.17,.95],{capEnd:!0,capStart:!0}),J.push(ft)}let X={blossom:0,green:1,gold:2,snow:3}[k.leaves],ct=Qt(k.th)+6.5*.5,ot=Mt(ct),Z=Mt(Qt(k.th))+k.out+1.6,dt=k.th+e.range(-.12,.12),le=[gt(ot*.55,dt,ct-.2),gt(ot+.9,dt,ct+.1),gt(V(ot,Z,.55),dt+.06,ct+.75),gt(Z,dt+.12,ct+1.35)],It=le[3],St=X===3?.4:.75,Ct=h(le,.5,.08,It,0,St,7);for(let ft=0;ft<2;ft++){let Xt=V(P,D,.32+ft*.36);if(l.sample(Xt,p),Math.hypot(p.x,p.z)-Mt(p.y)<3)continue;let Kt=Ct[Math.round(V(.55,.9,ft)*(Ct.length-1))];for(let Bt of[-1,1]){let Ge=ut(p.x+p.sx*.85*Bt,p.y+.72,p.z+p.sz*.85*Bt);o.tube([Ge,Kt.clone().add(ut(0,-.15,0))],[.026,.026],4,()=>[.62,.5,.36,1],{capEnd:!1})}}let Dt=k.nest?3:2;for(let ft=0;ft<Dt;ft++){let Xt=V(P,D,Dt===2?.3+ft*.4:.2+ft*.3);l.sample(Xt,p);let Wt=Ct[Math.round(V(.55,.95,ft/Math.max(1,Dt-1))*(Ct.length-1))],Kt=ut(p.x,Math.max(p.y+3.9,Wt.y+.3),p.z).addScaledVector(ut(p.sx,0,p.sz),e.range(.2,.9)),Bt=Wt.clone().lerp(Kt,.5).add(ut(0,.45,0));h([Wt,Bt,Kt],.16,.05,It,St*.7,St,5),X===3?d(Kt.clone().add(ut(0,.15,0)),.6,It,St,3,.7):d(Kt.clone().add(ut(0,.35,0)),e.range(1.55,1.95),It,St,X)}X!==3&&d(It.clone().add(ut(0,.5,0)),e.range(1.6,2.1),It,St,X),k.nest&&m.push({c:U.clone(),out:tt})}for(let k of Ps){let w=Mt(0);for(let z of[-.12,.1]){let S=e.range(6.5,9.5),P=k+z,D=[gt(w*.7,P,1.2),gt(w+1.2,P+z*.6,.35),gt(w+S*.35,P+z*1.3+e.range(-.08,.08),.05),gt(w+S*.6,P+z*1.8+e.range(-.1,.1),-.1),gt(w+S*.82,P+z*2.2,-.05),gt(w+S,P+z*2.5,-.5)];h(D,e.range(.6,.8),.18,D[5],0,0,8)}}a.fixWinding();let v=new kt,x=s.id>=1?72:52,f=-4,y=53+1.6,b=.42,M=Math.ceil((y-f)/b)+1,C=.01,F=new Tt.Vector3,W=new Tt.Vector3,O=new Tt.Vector3,Q=u.map(k=>({y:k.y,az:k.az}));for(let k=0;k<M;k++){let w=Math.min(y,f+k*b);for(let z=0;z<=x;z++){let S=z/x*I,P=$t(S,w),D=($t(S+C,w)-$t(S-C,w))/(2*C),U=($t(S,w+C)-$t(S,w-C))/(2*C),tt=Math.cos(S),J=Math.sin(S);W.set(D*tt-P*J,0,D*J+P*tt),O.set(U*tt,1,U*J),F.crossVectors(O,W).normalize();let X=1,ct=(S%I+I)%I;for(let St=ct;;St+=I){let Ct=Qt(St);if(Ct<-1)break;let Dt=1-Ht(.5,1.3,Ze(St));if(Dt<=0)continue;let ft=Ct-w;ft>0&&ft<4?X*=1-Dt*(.42*Math.exp(-((ft-.5)**2)/.35)+.18*Math.exp(-((ft-1.6)**2)/1.6)):ft<=0&&ft>-.6&&(X*=1-Dt*.22*Math.exp(-(ft*ft)/.03))}X*=.5+.5*Ht(-.6,2.2,w);for(let St of Q){let Ct=w-St.y;if(Math.abs(Ct)>1.6)continue;let Dt=Math.atan2(Math.sin(S-St.az),Math.cos(S-St.az));X*=1-.3*Math.exp(-(Dt*Dt)/.05-Ct*Ct/.6)*(Ct<0?1.2:.6)}let ot=1-Ht(-.5,2.5,w),Z=Ht(44,52,w),dt=V(1,.72,ot)*V(1,1.02,Z),le=V(1,.66,ot)*V(1,.99,Z),It=V(1,.62,ot)*V(1,.96,Z);v.vert(tt*P,w,J*P,F.x,F.y,F.z,dt,le,It,ht(X,.2,1),z/x*4,w/5.6)}}let B=x+1;for(let k=0;k<M-1;k++)for(let w=0;w<x;w++){let z=k*B+w;v.quad(z,z+1,z+B+1,z+B)}let Y=v.vert(0,y+.3,0,0,1,0,.9,.88,.85,.7,0,0);for(let k=0;k<x;k++)v.tri(Y,(M-1)*B+k+1,(M-1)*B+k);v.fixWinding();for(let k=n.length-1;k>=0;k--){let w=n[k];for(let z=0;z<l.n;z+=2){let S=w.c.y-l.Y[z];if(S<-6||S>8)continue;let D=Math.hypot(w.c.x-l.X[z],w.c.z-l.Z[z])-1.2;if(D>w.rx||S-w.ry>2.2||S+w.ry<-.6)continue;let U=S>.8?S-2.2:-.6-S,J=Math.max(D,U)/w.rx;if(J<.45){w.r=0;break}w.r*=J,w.rx*=J,w.ry*=J,w.rz*=J}w.r<.3&&n.splice(k,1)}let T=[],E=[],_=[],R=[],A=[],L=[0,0,0,0],$=[];for(let k of n){Te(k.c.y,L);let w=k.type,z=Math.max(5,Math.round(i*ht(k.r*k.r*(w===3?7:5.2),6,30)));for(let S=0;S<z;S++){let P=w;if(P<0){let dt=e();for(P=0;P<3&&dt>L[P];)dt-=L[P],P++;P===3&&(P=L[2]>.05?2:1)}let D=e()*I,U=Math.acos(e.range(-.85,1)),tt=Math.pow(e(),.35),J=Math.sin(U)*Math.cos(D)*k.rx*tt*.82,X=Math.cos(U)*k.ry*tt*.82,ct=Math.sin(U)*Math.sin(D)*k.rz*tt*.82;T.push(k.c.x+J,k.c.y+X,k.c.z+ct),E.push(k.c.x,k.c.y,k.c.z,k.r);let ot=k.r*(P===3?e.range(.9,1.25):e.range(.85,1.2));_.push(ot,e()*I,P,e());let Z=e.range(.86,1.1);P===0?R.push(Z*e.range(.97,1.04),Z,Z*e.range(.95,1.05)):P===1?R.push(Z*e.range(.9,1.05),Z,Z*e.range(.85,1)):P===2?R.push(Z*e.range(.98,1.06),Z*e.range(.85,1.05),Z*e.range(.8,1)):R.push(Z,Z,Z),A.push(k.anchor.x,k.anchor.y,k.anchor.z,k.w)}$.push({c:k.c,rx:k.rx*.78,ry:k.ry*.78,rz:k.rz*.78,anchor:k.anchor,w:k.w,snow:w===3})}let N=new Tt.InstancedBufferGeometry,q=new Tt.PlaneGeometry(1,1);N.setIndex(q.index),N.setAttribute("position",q.getAttribute("position")),N.setAttribute("iPos",new Tt.InstancedBufferAttribute(new Float32Array(T),3)),N.setAttribute("iCluster",new Tt.InstancedBufferAttribute(new Float32Array(E),4)),N.setAttribute("iData",new Tt.InstancedBufferAttribute(new Float32Array(_),4)),N.setAttribute("iTint",new Tt.InstancedBufferAttribute(new Float32Array(R),3)),N.setAttribute("iSway",new Tt.InstancedBufferAttribute(new Float32Array(A),4)),N.instanceCount=T.length/3,N.boundingSphere=new Tt.Sphere(ut(0,30,0),60);let G=o;for(let k of m){for(let w=0;w<9;w++){let z=[],S=1.55+e.range(-.15,.25),P=k.c.y-.42+w*.07,D=e()*I;for(let U=0;U<=26;U++){let tt=D+U/26*I*1.05,J=e.range(-.08,.08);z.push(ut(k.c.x+Math.cos(tt)*(S+J),P+Math.sin(tt*3+w)*.08,k.c.z+Math.sin(tt)*(S+J)))}G.tube(z,z.map(()=>e.range(.06,.12)),4,()=>{let U=e.range(.8,1.1);return[.86*U,.64*U,.42*U,.95]},{capEnd:!1})}for(let w=0;w<3;w++){let z=Math.atan2(k.out.z,k.out.x)+Math.PI*.5+(w-1)*.35,S=ut(k.c.x+Math.cos(z)*1.15,k.c.y-.1,k.c.z+Math.sin(z)*1.15),P=new Tt.SphereGeometry(.2,12,8),D=P.getAttribute("position"),U=P.getAttribute("normal"),tt=G.count;for(let X=0;X<D.count;X++){let ct=D.getY(X)*1.3,ot=Math.sin(D.getX(X)*80)*Math.sin(D.getZ(X)*70)>.6?.75:1;G.vert(S.x+D.getX(X),S.y+ct,S.z+D.getZ(X),U.getX(X),U.getY(X),U.getZ(X),.62*ot,.82*ot,.92*ot,1,0,0)}let J=P.index.array;for(let X=0;X<J.length;X+=3)G.tri(tt+J[X],tt+J[X+1],tt+J[X+2])}}return G.fixWinding(),{trunk:v.build(),branches:a.build(),nest:G.count?G.build():null,leaves:N,caps:c,ellipsoids:$}}import*as ue from"three";var te=19.5;function Jt(l,t){let e=Math.hypot(l,t),s=Math.atan2(t,l),i=Vt(s*3.1+11)*.22+Vt(e*.35+s*2)*.18,a=-.0016*e*e,o=-Math.pow(Ht(te-3.2,te,e),2)*1.1;return a+i*Ht(5,9,e)+o}var mt=(l,t,e)=>new ue.Vector3(l,t,e);function Is(l){let t=_t(77),e=new kt,s=new kt,i=new kt,a={spheres:[],caps:[]},o=120,c=34,n=2.6;for(let T=0;T<=c;T++){let E=V(n,te,Math.pow(T/c,.9));for(let _=0;_<=o;_++){let R=_/o*I,A=Math.cos(R)*E,L=Math.sin(R)*E,$=Jt(A,L),N=.15,q=(Jt(A+N,L)-Jt(A-N,L))/(2*N),G=(Jt(A,L+N)-Jt(A,L-N))/(2*N),k=mt(-q,1,-G).normalize(),w=.93+Vt(R*9+E*.7)*.04,S=1-.45*(1-Ht(0,2.6,E-$t(R,0)));e.vert(A,$,L,k.x,k.y,k.z,w,w*1,w*1.04,S,A*.08,L*.08)}}let r=o+1;for(let T=0;T<c;T++)for(let E=0;E<o;E++){let _=T*r+E;e.quad(_,_+r,_+r+1,_+1)}e.fixWinding();let h=27,d=30,u=(T,E)=>{let _=Math.pow(1-T,1.25),R=1+.13*Vt(E*4.2+T*3)+.07*Vt(E*11+T*9);return(te+.3)*_*R*(T<.04?1+(.04-T)*2:1)};for(let T=0;T<=d;T++){let E=T/d,_=-.75-E*h+(E<.05?E*6:0);for(let R=0;R<=o;R++){let A=R/o*I,L=Math.max(.15,u(E,A)),$=.02,N=(u(Math.min(1,E+$),A)-u(Math.max(0,E-$),A))/(2*$*h),q=mt(Math.cos(A),-N,Math.sin(A)).normalize(),G=.5+.5*Math.sin(_*1.7+Vt(A*3)*2),k=V(.82,.62,E)*V(.9,1.05,G),w=V(.7,.58,E)*V(.9,1.04,G),z=V(.62,.68,E)*V(.92,1.03,G);s.vert(Math.cos(A)*L,_,Math.sin(A)*L,q.x,q.y,q.z,k,w,z,V(.85,.5,E),R/o*8,_*.12)}}for(let T=0;T<d;T++)for(let E=0;E<o;E++){let _=T*r+E;s.quad(_,_+1,_+r+1,_+r)}let g=s.count;for(let T=0;T<=3;T++){let E=T/3*Math.PI*.5;for(let _=0;_<=o;_++){let R=_/o*I,A=te,L=Math.cos(R)*A,$=Math.sin(R)*A,N=Jt(L*.999,$*.999),q=A+Math.sin(E)*.45,G=V(N,-.8,1-Math.cos(E)),k=mt(Math.cos(R)*Math.sin(E),Math.cos(E),Math.sin(R)*Math.sin(E)).normalize();s.vert(Math.cos(R)*q,G,Math.sin(R)*q,k.x,k.y,k.z,.95,.96,1,.95,0,0)}}for(let T=0;T<3;T++)for(let E=0;E<o;E++){let _=g+T*r+E;s.quad(_,_+1,_+r+1,_+r)}s.fixWinding();for(let T=0;T<16;T++){let E=t()*I,_=t.range(.2,.7),R=u(_,E)*.96,A=-.75-_*h,L=t.range(6,16),$=[],N=Math.cos(E)*R,q=Math.sin(E)*R;for(let G=0;G<=6;G++){let k=G/6;$.push(mt(N,A-k*L,q)),N+=Math.cos(E)*t.range(-.2,.6)+t.range(-.4,.4),q+=Math.sin(E)*t.range(-.2,.6)+t.range(-.4,.4)}s.tube($,$.map((G,k)=>V(.42,.05,k/6)),5,()=>[.5,.38,.32,.8])}for(let T=0;T<70;T++){let E=t()*I,_=te+.15,R=t.range(.5,2.2),A=mt(Math.cos(E)*_,-.9,Math.sin(E)*_),L=A.clone().add(mt(0,-R,0));s.tube([A,L],[t.range(.08,.16),.01],5,()=>[.78,.9,1.05,1])}let p=(T,E,_=.65)=>{let R=new ue.IcosahedronGeometry(1,2),A=R.getAttribute("position"),L=i.count,$=t()*100;for(let q=0;q<A.count;q++){let G=mt(A.getX(q),A.getY(q),A.getZ(q)),k=1+.18*Vt(G.x*3+$)+.12*Vt(G.z*4+G.y*2+$);G.multiplyScalar(k),G.y*=_;let w=G.clone().normalize(),z=Ht(.35,.7,w.y),S=G.multiplyScalar(E).add(T);i.vert(S.x,S.y,S.z,w.x,w.y,w.z,V(.58,.95,z),V(.55,.96,z),V(.62,1.02,z),V(.75,1,w.y*.5+.5),0,0)}let N=R.index?R.index.array:null;if(N)for(let q=0;q<N.length;q+=3)i.tri(L+N[q],L+N[q+1],L+N[q+2]);else for(let q=0;q<A.count;q+=3)i.tri(L+q,L+q+1,L+q+2);a.spheres.push({c:T.clone().add(mt(0,E*_*.1,0)),r:E*.85,sy:_})},m=(T,E)=>{i.tube([T.clone().add(mt(0,-.3,0)),T.clone().add(mt(0,E*.35,0))],[.16*E*.3,.1*E*.3],6,()=>[.4,.3,.24,.8]);for(let _=0;_<4;_++){let R=T.y+E*(.2+_*.2),A=E*(.42-_*.085),L=new ue.ConeGeometry(A,E*.36,9,1,!0),$=L.getAttribute("position"),N=i.count;for(let G=0;G<$.count;G++){let k=mt($.getX(G),$.getY(G)+R+E*.18,$.getZ(G)).add(mt(T.x,0,T.z)),z=mt($.getX(G),.55*A,$.getZ(G)).normalize(),S=$.getY(G)>0?.6:.15;i.vert(k.x,k.y,k.z,z.x,z.y,z.z,V(.16,.9,S),V(.32,.92,S),V(.24,.98,S),.9,0,0)}let q=L.index.array;for(let G=0;G<q.length;G+=3)i.tri(N+q[G],N+q[G+1],N+q[G+2])}a.caps.push({a:T.clone(),b:T.clone().add(mt(0,E,0)),r:E*.22})},v=(T,E,_)=>{let R=mt(Math.cos(_)*.32,0,Math.sin(_)*.32),A=mt(-Math.sin(_)*.22,0,Math.cos(_)*.22);i.box(T.clone().add(mt(0,E*.5-.2,0)),R,mt(0,E*.5,0),A,L=>L.y>.5?[.95,.96,1,1]:[.62,.6,.66,.9]),a.caps.push({a:T.clone(),b:T.clone().add(mt(0,E,0)),r:.3})},x=(T,E)=>{let _=Math.cos(T)*E,R=Math.sin(T)*E;return mt(_,Jt(_,R),R)},f=[[2.3,8.5,"rock",1.1],[3,9.6,"pine",2.6],[3.7,8.2,"stone",1.7],[4.6,9.5,"rock",.9],[1.5,9.9,"pine",3.1],[.6,11.5,"rock",1.6],[5.5,11,"pine",3.4],[6,13.5,"rock",1.3],[2.6,14.5,"pine",3.8],[4,15.5,"pine",2.9],[1,16,"stone",2],[5.1,16.4,"rock",2.2],[3.3,12.4,"stone",1.4]];for(let[T,E,_,R]of f){let A=x(T,E);_==="rock"?p(A,R):_==="pine"?m(A,R):v(A,R,T)}for(let T=0;T<16;T++){let E=t()*I,_=t.range(12,te-1.5);p(x(E,_),t.range(.35,.9))}let y=new kt;{let T=x(.2,13.2),E=40,_=y.vert(T.x,T.y+.03,T.z,0,1,0,.55,.72,.9,1,.5,.5);for(let R=0;R<=E;R++){let A=R/E*I,L=2.6+.4*Vt(A*3+2);y.vert(T.x+Math.cos(A)*L*1.3,T.y+.03,T.z+Math.sin(A)*L,0,1,0,.66,.82,.98,1,0,0)}for(let R=0;R<E;R++)y.tri(_,_+1+R,_+2+R);y.fixWinding()}i.fixWinding();let b=new kt,M=new kt,C=l,F=$t(C,1.2),W=mt(Math.cos(C)*(F+.04),0,Math.sin(C)*(F+.04)),O=mt(Math.cos(C),0,Math.sin(C)),Q=mt(-Math.sin(C),0,Math.cos(C)),B=1.25,Y=2.5;{let E=b.vert(W.x+O.x*.02,W.y+Y*.45,W.z+O.z*.02,O.x,0,O.z,1,1,1,1,.5,.45),_=[];for(let R=0;R<=24;R++){let A=R/24,L,$;if(A<.25)L=-B,$=A/.25*(Y-B);else if(A<.75){let N=Math.PI-(A-.25)/.5*Math.PI;L=Math.cos(N)*B,$=Y-B+Math.sin(N)*B}else L=B,$=(1-(A-.75)/.25)*(Y-B);_.push([L,$])}for(let[R,A]of _){let L=C+R/F,$=$t(L,A)+.03;b.vert(Math.cos(L)*$,A,Math.sin(L)*$,O.x,0,O.z,1,1,1,1,R/(2*B)+.5,A/Y)}for(let R=0;R<24;R++)b.tri(E,E+1+R,E+2+R);b.fixWinding();for(let R of[-1,1]){let A=[];for(let L=0;L<=8;L++){let $=L/8,N=Math.PI*(R<0?1-$*.55:$*.55),q=Math.cos(N)*(B+.18),G=$<.01?-.3:Y-B+Math.sin(N)*(B+.2)*Math.min(1,$*3),k=C+q/F,w=$t(k,Math.max(G,0))+.18;A.push(mt(Math.cos(k)*w,Math.max(G,-.3)+0,Math.sin(k)*w))}M.tube(A,A.map((L,$)=>V(.32,.14,$/8)),7,()=>[.55,.42,.34,.85])}M.fixWinding()}return{top:e.build(),rock:s.build(),props:i.build(),pond:y.build(),gate:b.build(),gateFrame:M.build(),gatePos:W.clone().add(mt(0,Y*.45,0)),gateOut:O,gateSide:Q,occ:a}}import*as st from"three";var Re=(l,t,e)=>new st.Vector3(l,t,e);function Ds(l,t,e){let s=new st.Group,i=new st.Mesh(new st.SphereGeometry(500,32,16),null);i.frustumCulled=!1,i.renderOrder=10;let a=new st.ShaderMaterial({vertexShader:`
			varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${bt}
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
			}`,uniforms:{...l,uNoise:{value:t.cloudNoise}}}),o=new st.Mesh(new st.PlaneGeometry(1800,1800,1,1).rotateX(-Math.PI/2),a);o.position.y=-48,o.frustumCulled=!1,o.renderOrder=5;let c=_t(2024),n=e.clouds,r=[],h=[],d=[];for(let f=0;f<n;f++){let y=f/n*I+c.range(-.3,.3),b=c.range(95,240);d.push({x:Math.cos(y)*b,y:c.range(-34,26),z:Math.sin(y)*b,s:c.range(30,72),k:c()})}d.sort((f,y)=>Math.hypot(y.x,y.z)-Math.hypot(f.x,f.z));for(let f of d)r.push(f.x,f.y,f.z),h.push(f.s,f.s*c.range(.45,.62),f.k,c()*I);let u=new st.InstancedBufferGeometry,g=new st.PlaneGeometry(1,1);u.setIndex(g.index),u.setAttribute("position",g.getAttribute("position")),u.setAttribute("iPos",new st.InstancedBufferAttribute(new Float32Array(r),3)),u.setAttribute("iData",new st.InstancedBufferAttribute(new Float32Array(h),4)),u.instanceCount=d.length;let p=new st.ShaderMaterial({vertexShader:`
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
			${bt}
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
			}`,uniforms:{...l,uMap:{value:t.cloud}},transparent:!0,depthWrite:!1,blending:st.CustomBlending,blendSrc:st.OneFactor,blendDst:st.OneMinusSrcAlphaFactor}),m=new st.Mesh(u,p);m.frustumCulled=!1,m.renderOrder=20;let v=new kt,x=[[1,.72,.82],[.42,.66,.3],[.95,.66,.24],[.92,.94,1],[.98,.78,.86],[.5,.7,.34],[.9,.55,.22]];for(let f=0;f<7;f++){let y=f/7*I+.5+c.range(-.2,.2),b=c.range(115,210),M=Re(Math.cos(y)*b,c.range(-22,18),Math.sin(y)*b),C=c.range(5,11),F=x[f],W=18,O=v.count;for(let B=0;B<=4;B++){let Y=B/4,T=C*Math.pow(1-Y,1.3)+.2;for(let E=0;E<=W;E++){let _=E/W*I,R=1+.15*Vt(_*3+f*7+Y*2);v.vert(M.x+Math.cos(_)*T*R,M.y-Y*C*1.6,M.z+Math.sin(_)*T*R,Math.cos(_),-.3,Math.sin(_),.6,.52,.58,.8,0,0)}}for(let B=0;B<4;B++)for(let Y=0;Y<W;Y++){let T=O+B*(W+1)+Y;v.quad(T,T+1,T+W+2,T+W+1)}let Q=v.vert(M.x,M.y+.3,M.z,0,1,0,F[0]*.9,F[1]*.9,F[2]*.9,1,0,0);for(let B=0;B<=W;B++){let Y=B/W*I,T=1+.15*Vt(Y*3+f*7);v.vert(M.x+Math.cos(Y)*(C+.2)*T,M.y,M.z+Math.sin(Y)*(C+.2)*T,0,1,0,F[0]*.85,F[1]*.85,F[2]*.85,1,0,0)}for(let B=0;B<W;B++)v.tri(Q,Q+1+B,Q+2+B);for(let B=0;B<4;B++){let Y=c()*I,T=c.range(0,C*.7),E=Re(M.x+Math.cos(Y)*T,M.y,M.z+Math.sin(Y)*T),_=c.range(1.6,3.4);v.tube([E,E.clone().add(Re(0,_,0))],[.18,.1],5,()=>[.85,.82,.8,1]);let A=new st.IcosahedronGeometry(_*.55,1).getAttribute("position"),L=v.count;for(let $=0;$<A.count;$++){let N=Re(A.getX($),A.getY($),A.getZ($)).normalize();v.vert(E.x+A.getX($),E.y+_+A.getY($)*.8,E.z+A.getZ($),N.x,N.y,N.z,F[0],F[1],F[2],1,0,0)}for(let $=0;$<A.count;$+=3)v.tri(L+$,L+$+1,L+$+2)}}return v.fixWinding(),s.add(o,m),{group:s,dome:i,farGeo:v.build()}}function Ls(l,t){let e=new st.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{uSunDir:t.uSunDir,uSunGlow:t.uSunGlow,uMap:{value:l},uSize:{value:80},uK:{value:1}},transparent:!0,depthWrite:!1,blending:st.AdditiveBlending}),s=new st.Mesh(new st.PlaneGeometry(1,1),e);return s.frustumCulled=!1,s.renderOrder=30,s}import*as ie from"three";var Je=[{speed:1.25,wind:.22,elev:[40,34],sunStart:Math.PI*.55,burn:.8,drops:[[.42,-.2],[.78,.3]],hints:["drag","hide"]},{speed:1.3,wind:.28,elev:[34,30],sunStart:Math.PI,drops:[[.22,.4],[.5,0],[.58,.45],[.86,-.3]],gust:{every:11,dur:2.2,power:.5,from:6},crystals:[[.8,1,4.6,3.2]],locks:[.45],hints:["drops","bridge","crystal"]},{speed:1.35,wind:.25,elev:[62,56],sunStart:Math.PI,drops:[[.18,.5],[.47,.2],[.53,.5],[.74,-.4],[.92,.35]],crystals:[[.3,1,4.8,3.3],[.72,-1,4.4,3]],locks:[.6],hints:["ledge"]},{speed:1.35,wind:.3,elev:[56,48],sunStart:Math.PI,drops:[[.2,-.3],[.5,.3],[.56,-.2],[.62,.45],[.88,.3]],gust:{every:9,dur:2.4,power:.75,from:5},crystals:[[.25,-1,4.6,3.2],[.78,1,5,3.4]],locks:[.38],hints:["wait"]},{speed:1.4,wind:.3,elev:[30,24],sunStart:Math.PI,drops:[[.16,.4],[.36,-.3],[.55,.5],[.72,.1],[.9,-.4]],gust:{every:7.5,dur:2.8,power:1.15,from:3},crystals:[[.35,1,4.6,3.2],[.68,-1,4.8,3.2]],locks:[.5],hints:["gust"]},{speed:1.4,wind:.38,elev:[24,18],sunStart:Math.PI,drops:[[.2,.3],[.42,.5],[.5,-.2],[.57,.45],[.8,-.3],[.93,.4]],gust:{every:6,dur:3,power:1.55,from:2.5},crystals:[[.22,1,4.6,3],[.55,-1,5,3.3],[.85,1,4.4,3.2]],locks:[.32,.72]},{speed:1.45,wind:.18,elev:[16,11],sunStart:Math.PI,drops:[[.2,.45],[.4,-.2],[.55,.5],[.7,.2],[.9,.45]],gust:{every:10,dur:2.2,power:.6,from:5},crystals:[[.3,-1,4.6,3],[.6,1,4.8,3.2],[.88,-1,4.4,3]],locks:[.45,.8]},{speed:1.4,wind:.15,elev:[10,4],sunStart:Math.PI,drops:[[.15,.4],[.35,-.3],[.52,.5],[.68,0],[.84,.45]],crystals:[[.28,1,4.6,3],[.62,-1,4.8,3]],locks:[.5],hints:["gate"],finale:!0}];function ts(l){return{...se[l],...Je[l],index:l}}var ve=se.length;function $s(l,t){if(!l||t<l.from)return 0;let e=(t-l.from)%l.every;if(e>l.dur)return 0;let s=Math.sin(e/l.dur*Math.PI);return l.power*s*s}function es(l,t){if(!l)return 1/0;if(t<l.from)return l.from-t;let e=(t-l.from)%l.every;return e>l.dur?l.every-e:0}function He(l,t){let e=se[t],s=l.sAtTheta(e.from)+(t===0?1.2:.5),i=l.sAtTheta(e.to)-(e.finale?.4:.5);return[s,i]}var Pt=(l=0,t=0,e=0)=>new ie.Vector3(l,t,e),ui={spring:[1,.86,.94],summer:[1,.86,.55],autumn:[1,.72,.4],winter:[.78,.92,1.08]};function Vs(l,t){let e=[],s=new kt,i=new kt,a={};return t.forEach((o,c)=>{let n=Je[c];if(!n.crystals)return;let[r,h]=He(l,c);for(let[d,u,g,p]of n.crystals){let m=r+(h-r)*d;l.sample(m,a);let v=Pt(a.x,a.y+.45,a.z),x=Math.atan2(a.z,a.x),f=a.y+p,y=x+u*1.15,b;for(let z=0;z<8;z++){let S=Mt(f)+g;b=Pt(Math.cos(y)*S,f,Math.sin(y)*S);let P=Pt().subVectors(v,b),D=-(b.x*P.x+b.z*P.z)/(P.x*P.x+P.z*P.z);if((D>0&&D<1?Math.hypot(b.x+P.x*D,b.z+P.z*D):99)>Mt(f)+.5)break;y+=u*.1}let M=V(n.elev[0],n.elev[1],d),C=fe(x+Math.PI,M,Pt()),F=Pt().subVectors(v,b).normalize(),W=Pt().addVectors(C,F).normalize(),O=ui[o.season],Q=Mt(f-.4),B=Pt(Math.cos(y-u*.12)*Q*.75,f-.7,Math.sin(y-u*.12)*Q*.75),Y=Pt(Math.cos(y-u*.08)*(Q+1.2),f-.55,Math.sin(y-u*.08)*(Q+1.2)),T=Pt(Math.cos(y-u*.02)*(Q+g*.62),f-.85,Math.sin(y-u*.02)*(Q+g*.62)),E=b.clone().addScaledVector(W,-.36),R=new ie.CatmullRomCurve3([B,Y,T,E]).getPoints(14);i.setSway(b.x,b.y,b.z,0),i.tube(R,R.map((z,S)=>V(.2,.05,Math.pow(S/14,.7))),6,(z,S)=>[V(1,.55,S),V(1,.42,S),V(1,.36,S),.9],{sway:(z,S)=>i.setSway(b.x,b.y,b.z,.45*Math.pow(S,1.6))});let A=Math.abs(W.y)>.9?Pt(1,0,0):Pt(0,1,0),L=Pt().crossVectors(W,A).normalize(),$=Pt().crossVectors(W,L).normalize(),N=[];for(let z=0;z<6;z++){let S=z/6*Math.PI*2+.26;N.push(b.clone().addScaledVector(L,Math.cos(S)*.4).addScaledVector($,Math.sin(S)*.62))}let q=b.clone().addScaledVector(W,.16),G=b.clone().addScaledVector(W,-.2),k=e.length;s.setSway(b.x,b.y,b.z,.45);let w=(z,S,P)=>{let D=Pt().crossVectors(Pt().subVectors(S,z),Pt().subVectors(P,z)).normalize();for(let U of[z,S,P])s.vert(U.x,U.y,U.z,D.x,D.y,D.z,O[0],O[1],O[2],k,0,0);s.tri(s.count-3,s.count-2,s.count-1)};for(let z=0;z<6;z++){let S=N[z],P=N[(z+1)%6];w(q,S,P),w(G,P,S)}e.push({c:b,n:W,target:v,level:c,anchor:b.clone(),w:.45,tint:O,season:o.season})}}),s.fixWinding(),i.fixWinding(),{list:e,gemGeo:s.count?s.build():null,twigGeo:i.count?i.build():null}}function Ws(l,t){return new ie.ShaderMaterial({vertexShader:`
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
			${At}
			${bt}
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
			}`,uniforms:{...l,uLit:{value:new Array(Math.max(1,t)).fill(0)}},side:ie.DoubleSide})}import*as j from"three";var Bs=l=>{let t=new j.InstancedBufferGeometry,e=new j.PlaneGeometry(1,1);return t.setIndex(e.index),t.setAttribute("position",e.getAttribute("position")),t.instanceCount=l,t};function Os(l,t,e){let s=_t(808),i=Bs(e),a=new Float32Array(e*4);for(let r=0;r<a.length;r++)a[r]=s();i.setAttribute("iSeed",new j.InstancedBufferAttribute(a,4));let o={...l,uMap:{value:t},uCenter:{value:new j.Vector3},uSeason:{value:new j.Vector4(1,0,0,0)},uFire:{value:0},uCount:{value:1}},c=new j.ShaderMaterial({vertexShader:`
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
			${bt}
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
			}`,uniforms:o,transparent:!0,depthWrite:!1,blending:j.CustomBlending,blendSrc:j.OneFactor,blendDst:j.OneMinusSrcAlphaFactor}),n=new j.Mesh(i,c);return n.frustumCulled=!1,n.renderOrder=22,{mesh:n,u:o}}function Ns(l,t,e){let s=_t(55),i=Bs(e),a=new Float32Array(e*4);for(let r=0;r<e;r++){let h=s()*I,d=s.range(2.5,7.5);a.set([Math.cos(h)*d,s.range(-1,5),Math.sin(h)*d,s()],r*4)}i.setAttribute("iOff",new j.InstancedBufferAttribute(a,4));let o={...l,uMap:{value:t},uCenter:{value:new j.Vector3},uK:{value:1}},c=new j.ShaderMaterial({vertexShader:`
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
			}`,uniforms:o,transparent:!0,depthWrite:!1,blending:j.AdditiveBlending,side:j.DoubleSide}),n=new j.Mesh(i,c);return n.frustumCulled=!1,n.renderOrder=24,{mesh:n,u:o}}function Gs(l,t){let e=_t(4242),s=new j.BufferGeometry,i=new Float32Array([0,0,.35,-.08,0,-.2,.08,0,-.2,0,0,.12,-1,0,-.1,0,0,-.18,0,0,.12,1,0,-.1,0,0,-.18]);s.setAttribute("position",new j.BufferAttribute(i,3));let a=new j.InstancedBufferGeometry;a.setAttribute("position",s.getAttribute("position"));let o=new Float32Array(t*4);for(let h=0;h<t;h++){let d=h%2;o.set([e.range(0,I)*.15+d*Math.PI,e.range(-1.5,1.5),e.range(-1.5,1.5),e()],h*4)}a.setAttribute("iBird",new j.InstancedBufferAttribute(o,4)),a.instanceCount=t;let c={...l,uCenterY:{value:30}},n=new j.ShaderMaterial({vertexShader:`
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
			${bt}
			varying vec3 vW;
			void main() {
				vec3 c = vec3(0.05, 0.04, 0.08) + uSkyHor * 0.08;
				float d = length(vW - cameraPosition);
				float f = 1.0 - exp(-d * uFogP.x * 1.3);
				gl_FragColor = finish(mix(c, uFogCol, f), 1.0);
			}`,uniforms:c,side:j.DoubleSide}),r=new j.Mesh(a,n);return r.frustumCulled=!1,{mesh:r,u:c}}function Us({G:l,tier:t,shadow:e,aniso:s,msaa:i}){let a=t.id>=1,o={bark:bs(a?1024:512,s),plank:ks(512,256,s),leaves:ws(t.id>=2?1024:512),glow:Ms(128),ink:Ts(128),stars:Es(1024,512),cloud:zs(256),cloudNoise:Ss(256),particles:_s(128),shaft:Rs(128,256),rock:Hs(256,s)},c=new Et.Scene;c.matrixWorldAutoUpdate=!0;let n=new ze,r=Fs(n,t),h=Cs(n),d=(me+.3)%(Math.PI*2),u=Is(d),g=Ds(l,o,t),p=(Y,T,E=0,_=null)=>{let R=new Et.Mesh(Y,T);return R.matrixAutoUpdate=!1,R.frustumCulled=!!Y.boundingSphere,R.renderOrder=E,c.add(R),_&&e.add(Y,_),R},m=Ye(),v=Ye({wind:!0}),x=12.5,f={trunk:Yt({map:o.bark,wrap:.38,rim:.5,snow:1,snowY:x}),branch:Yt({map:o.bark,wrap:.38,rim:.5,snow:1,snowY:x,wind:!0,cutout:!0}),walk:Yt({map:o.plank,wrap:.22,rim:.2,snow:.85,snowY:x-1}),rail:Yt({wrap:.3,rim:.35,snow:.9,snowY:x}),glass:xs(16761466,2.4),leaf:ms(o.leaves,{a2c:i}),islandTop:Yt({wrap:.3,rim:.12}),rock:Yt({map:o.rock,wrap:.3,rim:.3}),props:Yt({wrap:.3,rim:.3,cutout:!0}),pond:Yt({wrap:.2,rim:.9}),far:Yt({wrap:.5,rim:.4}),sky:ys(o.stars)};p(r.trunk,f.trunk,0,m),p(r.branches,f.branch,0,v),r.nest&&p(r.nest,f.rail,0,m),p(h.walkway,f.walk,0,m),p(h.rail,f.rail,0,m),p(h.glass,f.glass,0);let y=new Et.Mesh(r.leaves,f.leaf);y.frustumCulled=!1,y.matrixAutoUpdate=!1,y.renderOrder=2,c.add(y),e.add(r.leaves,vs(o.leaves)),p(u.top,f.islandTop,0),p(u.rock,f.rock,0),p(u.props,f.props,0,m),p(u.pond,f.pond,0),p(u.gateFrame,f.trunk,0,m);let b=pi(l);p(u.gate,b,1),p(g.farGeo,f.far,0);let M=Vs(n,se),C=Ws(l,M.list.length);M.twigGeo&&p(M.twigGeo,f.branch,0),M.gemGeo&&p(M.gemGeo,C,0),g.dome.material=f.sky,c.add(g.dome),c.add(g.group);let F=Ls(o.glow,l);c.add(F);let W=Os(l,o.particles,t.particles),O=Ns(l,o.shaft,t.shafts),Q=Gs(l,t.birds);c.add(W.mesh,O.mesh,Q.mesh);let B=ae(h.lanterns,o.glow,l,.5,16756832);return c.add(B.mesh),{scene:c,curve:n,tree:r,walk:h,island:u,tex:o,mats:f,gateMat:b,crystals:M,crystalMat:C,glare:F,lanternGlow:B,particles:W,shafts:O,birds:Q,occluders:{caps:r.caps.concat(u.occ.caps),ellipsoids:r.ellipsoids,spheres:u.occ.spheres}}}function pi(l){return new Et.ShaderMaterial({vertexShader:`
			varying vec2 vUv; varying vec3 vW;
			void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${At}
			${bt}
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
			}`,uniforms:{...l,uOpen:{value:0}},side:Et.DoubleSide,polygonOffset:!0,polygonOffsetFactor:-2})}function ae(l,t,e,s,i){let a=new Et.InstancedBufferGeometry,o=new Et.PlaneGeometry(1,1);a.setIndex(o.index),a.setAttribute("position",o.getAttribute("position"));let c=new Float32Array(Math.max(1,l.length)*4);l.forEach((d,u)=>c.set([d.x,d.y,d.z,s],u*4));let n=new Et.InstancedBufferAttribute(c,4);a.setAttribute("iPos",n),a.instanceCount=l.length;let r=new Et.ShaderMaterial({vertexShader:`
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
			}`,uniforms:{uTime:e.uTime,uFogP:e.uFogP,uMap:{value:t},uColor:{value:new Et.Color(i)},uK:{value:1}},transparent:!0,depthWrite:!1,blending:Et.AdditiveBlending}),h=new Et.Mesh(a,r);return h.frustumCulled=!1,h.renderOrder=25,{mesh:h,attr:n,mat:r}}var zt={dx:1,dz:0,str:.25,gust:0};function xe(l,t,e,s,i,a){let o=l*.071+e*.053+t*.037,c=Math.sin(i*1.3+o*6.2831)*.6+Math.sin(i*2.7+o*11)*.4,n=zt.gust*(.65+.35*Math.sin(i*5.1+o*17)),r=(zt.str*c+n)*s;return a.x=zt.dx*r,a.y=Math.sin(i*2.1+o*9)*.18*s*(zt.str+zt.gust),a.z=zt.dz*r,a}import*as re from"three";var pe=()=>new re.Vector3,Ce=class{constructor(){this.cam=new re.PerspectiveCamera(52,1,.3,1400),this.pos=pe(),this.look=pe(),this.tPos=pe(),this.tLook=pe(),this.aspect=1,this.mode="follow",this.cine=null,this.shake=0,this.zoom=1,this._tmp=pe(),this._tmp2=pe(),this.lag=.42}resize(t,e){this.aspect=t/e,this.cam.aspect=this.aspect,this.baseFov=this.aspect<1?V(66,54,ht((this.aspect-.45)/.55,0,1)):50,this.cam.fov=this.baseFov,this.cam.updateProjectionMatrix()}followTarget(t,e,s=this.tPos,i=this.tLook){let a=Math.atan2(t.z,t.x),o=Math.hypot(t.x,t.z),c=this.aspect<1,n=(c?10.2:8.6)*this.zoom,r=(c?4.2:3.3)*this.zoom,h=a-this.lag;return s.set(Math.cos(h)*(o+n),t.y+r,Math.sin(h)*(o+n)),i.copy(t).lerp(e,.35),i.y+=c?.2:.55,s}snap(){this.pos.copy(this.tPos),this.look.copy(this.tLook)}play(t,e){this.cine={keys:t,t:0,dur:t[t.length-1].t,onDone:e};let s=t.map(a=>a.pos),i=t.map(a=>a.look);this.cine.cp=new re.CatmullRomCurve3(s,!1,"centripetal"),this.cine.cl=new re.CatmullRomCurve3(i,!1,"centripetal"),this.mode="cine"}skipCine(){this.cine&&(this.cine.t=this.cine.dur)}update(t){let e=this.cam;if(this.mode==="cine"&&this.cine){let s=this.cine;s.t=Math.min(s.dur,s.t+t);let i=s.keys,a=0;for(;a<i.length-2&&s.t>i[a+1].t;)a++;let o=(s.t-i[a].t)/Math.max(1e-4,i[a+1].t-i[a].t),c=(a+Ue(ht(o,0,1)))/(i.length-1);s.cp.getPoint(c,this.pos),s.cl.getPoint(c,this.look);let n=i[a].fov??this.baseFov,r=i[a+1].fov??this.baseFov;e.fov=V(n,r,Ue(ht(o,0,1))),e.updateProjectionMatrix(),s.t>=s.dur&&(this.mode="follow",this.cine=null,s.onDone&&s.onDone())}else this.mode==="follow"&&(this.pos.x=yt(this.pos.x,this.tPos.x,3.2,t),this.pos.y=yt(this.pos.y,this.tPos.y,3.6,t),this.pos.z=yt(this.pos.z,this.tPos.z,3.2,t),this.look.x=yt(this.look.x,this.tLook.x,5,t),this.look.y=yt(this.look.y,this.tLook.y,5,t),this.look.z=yt(this.look.z,this.tLook.z,5,t),Math.abs(e.fov-this.baseFov)>.01&&(e.fov=yt(e.fov,this.baseFov,3,t),e.updateProjectionMatrix()));if(e.position.copy(this.pos),this.shake>.001){let s=this.shake;e.position.x+=(Math.random()-.5)*s,e.position.y+=(Math.random()-.5)*s,this.shake=yt(this.shake,0,6,t)}e.lookAt(this.look),e.updateMatrixWorld()}};import*as Ys from"three";var Ut={x:0,y:0,z:0},di={min:0,max:1e9},Pe=class{constructor(t){let e=t.occluders;this.caps=e.caps.map(i=>({ax:i.a.x,ay:i.a.y,az:i.a.z,bx:i.b.x,by:i.b.y,bz:i.b.z,r:i.r,anchor:i.anchor||null,wa:i.wa||0,wb:i.wb||0,cx:(i.a.x+i.b.x)/2,cy:(i.a.y+i.b.y)/2,cz:(i.a.z+i.b.z)/2,br:i.a.distanceTo(i.b)/2+i.r+1.8*Math.max(i.wa||0,i.wb||0)})),this.ells=e.ellipsoids.map(i=>({cx:i.c.x,cy:i.c.y,cz:i.c.z,rx:i.rx,ry:i.ry,rz:i.rz,anchor:i.anchor,w:i.w,br:Math.max(i.rx,i.ry,i.rz)+1.8*i.w})),this.sph=e.spheres.map(i=>({cx:i.c.x,cy:i.c.y,cz:i.c.z,rx:i.r,ry:i.r*i.sy,rz:i.r,br:i.r}));let s=t.curve;this.slabs=[];for(let i=0;i<s.n-4;i+=4){let a=i+2,o=s.X[i+4]-s.X[i],c=s.Y[i+4]-s.Y[i],n=s.Z[i+4]-s.Z[i],r=Math.hypot(o,c,n),h=s.SX[a],d=s.SZ[a],u=s.R[a]-Mt(s.Y[a])<1.6?1.15:.95,g=(u+1.9/2)/2,p=(1.9/2-u)/2;this.slabs.push({cx:s.X[a]+h*p,cy:s.Y[a]-.34/2,cz:s.Z[a]+d*p,Tx:o/r,Ty:c/r,Tz:n/r,hT:r/2+.02,Sx:h,Sz:d,hS:g,hU:.34/2+.04,br:Math.hypot(r/2,g,.34)})}this.t=0}setTime(t){this.t=t}blocked(t,e,s,i){let a=i.x,o=i.y,c=i.z;if(this._trunk(t,e,s,a,o,c))return!0;for(let n of this.slabs)if(!(n.cy<e+.25)&&Ae(t,e,s,a,o,c,n.cx,n.cy,n.cz,n.br)&&gi(t,e,s,a,o,c,n))return!0;for(let n of this.ells)if(!(n.cy+n.br<e)&&Ae(t,e,s,a,o,c,n.cx,n.cy,n.cz,n.br)&&(xe(n.anchor.x,n.anchor.y,n.anchor.z,n.w,this.t,Ut),qs(t,e,s,a,o,c,n.cx+Ut.x,n.cy+Ut.y,n.cz+Ut.z,n.rx,n.ry,n.rz)))return!0;for(let n of this.caps){if(Math.max(n.ay,n.by)+n.r+2<e||!Ae(t,e,s,a,o,c,n.cx,n.cy,n.cz,n.br))continue;let r=n.ax,h=n.ay,d=n.az,u=n.bx,g=n.by,p=n.bz;if(n.anchor&&(n.wa>0||n.wb>0)&&(xe(n.anchor.x,n.anchor.y,n.anchor.z,1,this.t,Ut),r+=Ut.x*n.wa,h+=Ut.y*n.wa,d+=Ut.z*n.wa,u+=Ut.x*n.wb,g+=Ut.y*n.wb,p+=Ut.z*n.wb),fi(t,e,s,a,o,c,r,h,d,u,g,p,n.r))return!0}for(let n of this.sph)if(Ae(t,e,s,a,o,c,n.cx,n.cy,n.cz,n.br)&&qs(t,e,s,a,o,c,n.cx,n.cy,n.cz,n.rx,n.ry,n.rz))return!0;return!1}_trunk(t,e,s,i,a,o){let c=i*i+o*o;if(c<1e-6)return!1;let n=-(t*i+s*o)/c;if(n<=0)return!1;let r=t+i*n,h=s+o*n,d=e+a*n;if(d>55||Math.hypot(r,h)>Mt(Math.max(0,d))+2.2)return!1;let g=9/Math.sqrt(c),p=Math.max(0,n-g),m=n+g,v=36;for(let x=0;x<=v;x++){let f=p+(m-p)*x/v,y=t+i*f,b=e+a*f,M=s+o*f;if(b>54)continue;if(Math.hypot(y,M)<$t(Math.atan2(M,y),b)*.985)return!0}return!1}};function Ae(l,t,e,s,i,a,o,c,n,r){let h=o-l,d=c-t,u=n-e,g=h*s+d*i+u*a;return g<-r?!1:h*h+d*d+u*u-g*g<=r*r}function qs(l,t,e,s,i,a,o,c,n,r,h,d){let u=(l-o)/r,g=(t-c)/h,p=(e-n)/d,m=s/r,v=i/h,x=a/d,f=m*m+v*v+x*x,y=u*m+g*v+p*x,b=u*u+g*g+p*p-1;if(b<0)return!0;let M=y*y-f*b;return M<0?!1:-y-Math.sqrt(M)>0}function fi(l,t,e,s,i,a,o,c,n,r,h,d,u){let g=r-o,p=h-c,m=d-n,v=l-o,x=t-c,f=e-n,y=s*s+i*i+a*a,b=s*g+i*p+a*m,M=g*g+p*p+m*m,C=s*v+i*x+a*f,F=g*v+p*x+m*f,W=y*M-b*b,O,Q;W<1e-8?(O=0,Q=M>1e-8?F/M:0):(O=(b*F-M*C)/W,Q=(y*F-b*C)/W),O<0&&(O=0,Q=M>1e-8?F/M:0),Q<0?(Q=0,O=Math.max(0,-C/y)):Q>1&&(Q=1,O=Math.max(0,(b-C)/y));let B=v+O*s-Q*g,Y=x+O*i-Q*p,T=f+O*a-Q*m;return B*B+Y*Y+T*T<=u*u}function gi(l,t,e,s,i,a,o){let c=l-o.cx,n=t-o.cy,r=e-o.cz,h=di;return h.min=0,h.max=1e9,ss(o.Tx*c+o.Ty*n+o.Tz*r,o.Tx*s+o.Ty*i+o.Tz*a,o.hT,h)&&ss(o.Sx*c+o.Sz*r,o.Sx*s+o.Sz*a,o.hS,h)&&ss(n,i,o.hU,h)&&h.max>0}function ss(l,t,e,s){if(Math.abs(t)<1e-6)return Math.abs(l)<=e;let i=(-e-l)/t,a=(e-l)/t;if(i>a){let o=i;i=a,a=o}return i>s.min&&(s.min=i),a<s.max&&(s.max=a),s.min<=s.max}import*as rt from"three";var Xs=1.55,mi=`
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
}`,vi=`
${et}
${At}
${bt}
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
}`,xi=`
varying vec3 vN; varying vec3 vV; varying float vY;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vY = position.y; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,yi=`
uniform vec3 uRim; uniform float uFade; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
	float f = 1.0 - abs(dot(normalize(vN), normalize(vV))), rim = pow(f, 2.2), pulse = 0.88 + 0.12 * sin(uTime * 4.0);
	vec3 c = mix(vec3(0.62, 0.55, 1.0), uRim, 0.45) * (0.45 + 1.7 * rim) * pulse * 0.8;
	gl_FragColor = vec4(c, (0.22 + 0.68 * rim) * uFade);
}`,bi=`
uniform float uV, uA, uTime; varying vec2 vUv;
void main() {
	vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.x, -p.y) / 6.2831853 + 0.5;
	float band = smoothstep(0.78, 0.82, r) * (1.0 - smoothstep(0.94, 0.98, r));
	float fill = step(a, uV);
	vec3 c = mix(vec3(3.0, 0.7, 0.2), vec3(1.6, 1.4, 2.6), smoothstep(0.25, 0.7, uV));
	float pulse = uV < 0.3 ? 0.6 + 0.4 * sin(uTime * 18.0) : 1.0;
	vec3 o = c * pulse * band * (fill * 0.95 + 0.12) * uA;
	gl_FragColor = vec4(o / (1.0 + o * 0.4), 1.0);
}`,Fe=class{constructor(t,e,{rim:s=10325247,segs:i=40}={}){this.g=new rt.Group,this.k=new rt.Group,this.k.scale.setScalar(Xs),this.g.add(this.k),this.body=new rt.Group,this.k.add(this.body),this.u={...t,uWob:{value:.5},uBurn:{value:0},uRim:{value:new rt.Color(s)},uLit:{value:0},uFade:{value:1},uMelt:{value:0},uDiss:{value:0}};let a=new rt.SphereGeometry(.3,i,Math.round(i*.7));this.blob=new rt.Mesh(a,new rt.ShaderMaterial({vertexShader:mi,fragmentShader:vi,uniforms:this.u})),this.blob.position.y=.3,this.body.add(this.blob),this.sil=new rt.Mesh(a,new rt.ShaderMaterial({vertexShader:xi,fragmentShader:yi,uniforms:{uRim:this.u.uRim,uFade:this.u.uFade,uTime:t.uTime},transparent:!0,depthWrite:!1,depthFunc:rt.GreaterDepth})),this.sil.position.y=.3,this.sil.scale.setScalar(1.035),this.sil.renderOrder=40,this.body.add(this.sil);let o=je(16777215,2.2),c=je(328200,1);this.eyeMat=o,this.eyes=[],this.pupils=[];let n=new rt.SphereGeometry(.075,16,12),r=new rt.SphereGeometry(.036,10,8);for(let d of[-1,1]){let u=new rt.Mesh(n,o);u.scale.set(.95,1.25,.55),u.position.set(d*.105,.38,.25);let g=new rt.Mesh(r,c);g.position.set(0,-.005,.06),u.add(g),this.body.add(u),this.eyes.push(u),this.pupils.push(g)}let h=new rt.SphereGeometry(.075,10,8);this.feet=[-1,1].map(d=>{let u=new rt.Mesh(h,c);return u.scale.set(1,.6,1.35),u.position.set(d*.12,.04,.02),this.k.add(u),u}),this.aura=new rt.Mesh(new rt.PlaneGeometry(1.3,1.3).rotateX(-Math.PI/2),new rt.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:"uniform sampler2D uMap; uniform float uO; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a * uO; gl_FragColor = vec4(0.012, 0.008, 0.03, a); }",uniforms:{uMap:{value:e.ink},uO:{value:.85}},transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-4})),this.aura.position.y=.014,this.aura.renderOrder=3,this.k.add(this.aura),this.ringU={uV:{value:1},uA:{value:0},uTime:t.uTime},this.ring=new rt.Mesh(new rt.PlaneGeometry(1.25,1.25).rotateX(-Math.PI/2),new rt.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:bi,uniforms:this.ringU,transparent:!0,depthWrite:!1,blending:rt.AdditiveBlending})),this.ring.position.y=.03,this.ring.renderOrder=4,this.k.add(this.ring),this.reset()}reset(){this.phase=0,this.yaw=0,this.blinkT=2,this.squash=0,this.sqV=0,this.tapT=0,this.idleT=0,this.hopT=0,this.melt=0,this.diss=0,this.u.uMelt.value=0,this.u.uDiss.value=0,this.u.uFade.value=1,this.u.uBurn.value=0,this.blob.visible=!0,this.sil.visible=!0,this.g.visible=!0,this.g.scale.setScalar(1),this.body.scale.setScalar(1),this.body.position.set(0,0,0);for(let t of this.feet)t.visible=!0;this.eyes.forEach((t,e)=>{t.visible=!0,t.position.set(e?.105:-.105,.38,.25),t.scale.set(.95,1.25,.55)})}kick(t){this.sqV+=t}hop(){this.hopT=.55}update(t,e,s,i){this.g.position.set(s.x,s.y,s.z);let a=s.yaw-this.yaw;for(;a>Math.PI;)a-=Math.PI*2;for(;a<-Math.PI;)a+=Math.PI*2;this.yaw+=a*(1-Math.exp(-10*t)),this.g.rotation.y=this.yaw,this.sqV+=(-this.squash*220-this.sqV*16)*t,this.squash+=this.sqV*t;let o=0,c=1,n=1;if(s.moving){let g=this.phase;this.phase+=t*s.speed*4.4;let p=this.phase%1;o=Math.sin(p*Math.PI)*.12,Math.floor(this.phase)!==Math.floor(g)&&(this.kick(-2.2),i&&i()),c=1+Math.sin(p*Math.PI)*.06;for(let m=0;m<2;m++){let v=(this.phase+m*.5)%1;this.feet[m].position.z=.02+Math.sin(v*Math.PI*2)*.09,this.feet[m].position.y=.04+Math.max(0,Math.sin(v*Math.PI*2))*.05}}else{let g=Math.sin(e*2.2)*.025;c=1+g,n=1-g*.6;for(let p of this.feet)p.position.z=yt(p.position.z,.02,8,t),p.position.y=.04;if(s.hold){this.tapT+=t;let p=Math.max(0,Math.sin(this.tapT*11));this.feet[1].position.y=.04+p*.045,this.feet[1].position.z=.05}else this.tapT=0}if(this.hopT>0){this.hopT=Math.max(0,this.hopT-t);let g=Math.sin((1-this.hopT/.55)*Math.PI);o+=g*.22,c*=1+g*.08,this.hopT===0&&this.kick(-2.4)}c*=1+this.squash,n*=1-this.squash*.55;let r=V(.62,1,s.meter);this.k.scale.setScalar(Xs*r);let h=s.burn>0?.018*s.burn:0;this.body.position.set((Math.random()-.5)*h,o,(Math.random()-.5)*h),this.body.scale.set(n,c,n),this.blinkT-=t;let d=1;this.blinkT<.12&&(d=Math.max(.08,Math.abs(this.blinkT-.06)/.06)),this.blinkT<0&&(this.blinkT=2+Math.random()*3);let u=s.burn>.2?1.25:1;this.eyes.forEach(g=>g.scale.set(.95*u,1.25*d*u,.55));for(let g of this.pupils)g.scale.setScalar(s.burn>.2?.6:1);this.u.uBurn.value=yt(this.u.uBurn.value,s.burn,8,t),this.u.uLit.value=yt(this.u.uLit.value,s.lit,8,t),this.u.uWob.value=.4+this.u.uBurn.value*.6,this.ringU.uV.value=yt(this.ringU.uV.value,s.meter,10,t),this.ringU.uA.value=yt(this.ringU.uA.value,s.meter<.995?1:0,4,t)}evaporate(t){this.u.uMelt.value=ht(t*1.6,0,1),this.u.uDiss.value=ht((t-.25)/.75,0,1),this.u.uBurn.value=1,this.sil.visible=!1,this.ringU.uA.value=0,this.aura.material.uniforms.uO.value=.85*(1-t);for(let e of this.feet)e.visible=t<.4;this.eyes.forEach((e,s)=>{let i=Math.max(.001,1-ht((t-.1)/.4,0,1));e.scale.set(.95*i,1.4*i,.55*i),e.position.y=V(.38,.18,ht(t*2,0,1))})}setFade(t){this.u.uFade.value=t,this.eyeMat.uniforms.uFade.value=t,this.aura.material.uniforms.uO.value=.85*t}};import*as ee from"three";import*as vt from"three";var qt=320,ye=class{constructor(t,e,{additive:s=!1}={}){this.n=0,this.p=new Float32Array(qt*3),this.v=new Float32Array(qt*3),this.life=new Float32Array(qt*2),this.par=new Float32Array(qt*4),this.col=new Float32Array(qt*4),this.cell=new Float32Array(qt),this.spin=new Float32Array(qt*2);let i=new vt.InstancedBufferGeometry,a=new vt.PlaneGeometry(1,1);i.setIndex(a.index),i.setAttribute("position",a.getAttribute("position")),this.aPos=new vt.InstancedBufferAttribute(new Float32Array(qt*4),4).setUsage(vt.DynamicDrawUsage),this.aCol=new vt.InstancedBufferAttribute(new Float32Array(qt*4),4).setUsage(vt.DynamicDrawUsage),this.aRot=new vt.InstancedBufferAttribute(new Float32Array(qt*2),2).setUsage(vt.DynamicDrawUsage),i.setAttribute("iPos",this.aPos),i.setAttribute("iCol",this.aCol),i.setAttribute("iRot",this.aRot),i.instanceCount=0,this.geo=i;let o=new vt.ShaderMaterial({vertexShader:`
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
					vec3 c = pow(clamp(t.rgb * vCol.rgb, 0.0, 1.0), vec3(1.0 / 2.2)); gl_FragColor = vec4(c * a, a); }`,uniforms:{uMap:{value:e}},transparent:!0,depthWrite:!1,blending:s?vt.AdditiveBlending:vt.CustomBlending,blendSrc:vt.OneFactor,blendDst:s?vt.OneFactor:vt.OneMinusSrcAlphaFactor});this.mesh=new vt.Mesh(i,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=35}emit(t,e,s,i,a,o,c,n,r,h,d,u,g,p,m,v,x=0){if(this.n>=qt)return;let f=this.n++;this.p[f*3]=t,this.p[f*3+1]=e,this.p[f*3+2]=s,this.v[f*3]=i,this.v[f*3+1]=a,this.v[f*3+2]=o,this.life[f*2]=c,this.life[f*2+1]=c,this.par[f*4]=n,this.par[f*4+1]=r,this.par[f*4+2]=h,this.par[f*4+3]=d,this.col[f*4]=u,this.col[f*4+1]=g,this.col[f*4+2]=p,this.col[f*4+3]=m,this.cell[f]=v,this.spin[f*2]=Math.random()*6.28,this.spin[f*2+1]=x}update(t){let e=0,s=this.aPos.array,i=this.aCol.array,a=this.aRot.array;for(let o=0;o<this.n;o++){let c=this.life[o*2]-t;if(c<=0)continue;e!==o&&(this.p.copyWithin(e*3,o*3,o*3+3),this.v.copyWithin(e*3,o*3,o*3+3),this.life[e*2+1]=this.life[o*2+1],this.par.copyWithin(e*4,o*4,o*4+4),this.col.copyWithin(e*4,o*4,o*4+4),this.cell[e]=this.cell[o],this.spin.copyWithin(e*2,o*2,o*2+2)),this.life[e*2]=c;let n=Math.exp(-this.par[e*4+3]*t);this.v[e*3]*=n,this.v[e*3+1]=this.v[e*3+1]*n-this.par[e*4+2]*t,this.v[e*3+2]*=n,this.p[e*3]+=this.v[e*3]*t,this.p[e*3+1]+=this.v[e*3+1]*t,this.p[e*3+2]+=this.v[e*3+2]*t,this.spin[e*2]+=this.spin[e*2+1]*t;let r=1-c/this.life[e*2+1],h=Math.min(1,r*6)*(1-r*r);s[e*4]=this.p[e*3],s[e*4+1]=this.p[e*3+1],s[e*4+2]=this.p[e*3+2],s[e*4+3]=this.par[e*4]+(this.par[e*4+1]-this.par[e*4])*r,i[e*4]=this.col[e*4],i[e*4+1]=this.col[e*4+1],i[e*4+2]=this.col[e*4+2],i[e*4+3]=this.col[e*4+3]*h,a[e*2]=this.cell[e],a[e*2+1]=this.spin[e*2],e++}this.n=e,this.geo.instanceCount=e,e>0&&(this.aPos.clearUpdateRanges(),this.aCol.clearUpdateRanges(),this.aRot.clearUpdateRanges(),this.aPos.addUpdateRange(0,e*4),this.aCol.addUpdateRange(0,e*4),this.aRot.addUpdateRange(0,e*2),this.aPos.needsUpdate=!0,this.aCol.needsUpdate=!0,this.aRot.needsUpdate=!0)}clear(){this.n=0,this.geo.instanceCount=0}};function oe(l,t,e,s,i=18,a=[1.6,1.3,2.6]){for(let o=0;o<i;o++){let c=Math.random()*Math.PI*2,n=(Math.random()-.2)*1.2,r=1.2+Math.random()*2.2;l.emit(t,e,s,Math.cos(c)*Math.cos(n)*r,Math.sin(n)*r+1.2,Math.sin(c)*Math.cos(n)*r,.7+Math.random()*.5,.28,.05,1.6,2.2,a[0],a[1],a[2],1,3)}}function be(l,t,e,s,i=1){l.emit(t+(Math.random()-.5)*.3,e,s+(Math.random()-.5)*.3,(Math.random()-.5)*.3,.8+Math.random()*.6,(Math.random()-.5)*.3,.9,.18*i,.6*i,-.4,1.4,1.9,.8,.3,.55,3)}var is=8;function ki(){let l=new ee.SphereGeometry(.16,20,14),t=l.getAttribute("position");for(let e=0;e<t.count;e++){let s=t.getX(e),i=t.getY(e),a=t.getZ(e);if(i>0){let o=i/.16;i*=1+o*.9,s*=1-o*.75,a*=1-o*.75}t.setXYZ(e,s,i,a)}return l.computeVertexNormals(),l}var Ie=class{constructor(t,e,s){this.G=t,this.geo=ki(),this.mat=new ee.ShaderMaterial({vertexShader:`
				varying vec3 vN; varying vec3 vW; varying vec3 vL;
				void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
				${et}
				${At}
				${bt}
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
				}`,uniforms:{...t}}),this.meshes=[];for(let a=0;a<is;a++){let o=new ee.Mesh(this.geo,this.mat);o.visible=!1,o.renderOrder=6,s.add(o),this.meshes.push(o)}let i=Array.from({length:is},()=>new ee.Vector3(0,-999,0));this.glow=ae(i,e.glow,t,.55,9403647),this.glow.mat.uniforms.uK.value=.7,s.add(this.glow.mesh),this.list=[],this._p={},this._L=new ee.Vector3}setup(t,e,s,i){this.list=i.map(([a,o],c)=>{let n=e+(s-e)*a,r=t.sample(n,{}),h=o*.62;return{i:c,s:n,x:r.x+r.sx*h,y:r.y+.55,z:r.z+r.sz*h,melt:0,state:"idle",t:0,lit:0}});for(let a=0;a<is;a++)this.meshes[a].visible=a<this.list.length;this.glow.mesh.geometry.instanceCount=this.list.length}get total(){return this.list.length}get got(){return this.list.filter(t=>t.state==="got"||t.state==="fly").length}get lost(){return this.list.filter(t=>t.state==="lost").length}update(t,e,s,i,a,o,c,n,r,h){let d=this.glow.attr.array;for(let u of this.list){let g=this.meshes[u.i];if(u.t+=t,u.state==="idle"){if(h&&u.s-s<9&&u.s-s>-1){let v=!a.blocked(u.x,u.y+.1,u.z,o)||this.beams&&this.beams.litAt(u.x,u.y,u.z);u.lit=yt(u.lit,v?1:0,12,t),v?(u.melt=Math.min(1,u.melt+t*.3),Math.random()<t*14&&be(c,u.x,u.y+.15,u.z,.6),u.melt>=1&&(u.state="lost",oe(c,u.x,u.y,u.z,12,[2.4,.9,.3]),r(u))):u.melt=Math.max(0,u.melt-t*.12)}h&&Math.abs(u.s-s)<.55&&(u.state="fly",u.t=0);let p=1-u.melt*.65,m=u.lit*.02;g.position.set(u.x+(Math.random()-.5)*m,u.y+Math.sin(e*2.2+u.i)*.07,u.z+(Math.random()-.5)*m),g.rotation.y=e*.8+u.i,g.scale.setScalar(p),d[u.i*4]=g.position.x,d[u.i*4+1]=g.position.y,d[u.i*4+2]=g.position.z,d[u.i*4+3]=.55*p*(1-u.lit*.5)}else if(u.state==="fly"){let p=Math.min(1,u.t/.28);g.position.set(u.x+(i.x-u.x)*p,u.y+(i.y+.5-u.y)*p+Math.sin(p*Math.PI)*.4,u.z+(i.z-u.z)*p),g.scale.setScalar(1-p*.8),d[u.i*4]=g.position.x,d[u.i*4+1]=g.position.y,d[u.i*4+2]=g.position.z,d[u.i*4+3]=.55*(1-p),p>=1&&(u.state="got",g.visible=!1,d[u.i*4+3]=0,oe(c,i.x,i.y+.6,i.z,20),n(u))}else g.visible=!1,d[u.i*4+3]=0}this.glow.attr.needsUpdate=!0}hideAll(){for(let t of this.meshes)t.visible=!1;this.glow.mesh.geometry.instanceCount=0,this.list=[]}};import*as Rt from"three";var De=6,Le={x:0,y:0,z:0},$e=class{constructor(t,e,s,i){this.list=i.crystals.list.map(r=>({...r,lit:0,on:!1,hx:0,hy:0,hz:0,cx:0,cy:0,cz:0,hitT:0})),this.gemMat=i.crystalMat;let a=new Rt.InstancedBufferGeometry,o=new Rt.PlaneGeometry(1,1);a.setIndex(o.index),a.setAttribute("position",o.getAttribute("position")),this.aA=new Rt.InstancedBufferAttribute(new Float32Array(De*4),4).setUsage(Rt.DynamicDrawUsage),this.aB=new Rt.InstancedBufferAttribute(new Float32Array(De*4),4).setUsage(Rt.DynamicDrawUsage),a.setAttribute("iA",this.aA),a.setAttribute("iB",this.aB),a.instanceCount=0,this.geo=a;let c=new Rt.ShaderMaterial({vertexShader:`
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
				}`,uniforms:{...t},transparent:!0,depthWrite:!1,blending:Rt.AdditiveBlending,side:Rt.DoubleSide});this.mesh=new Rt.Mesh(a,c),this.mesh.frustumCulled=!1,this.mesh.renderOrder=26,s.add(this.mesh);let n=Array.from({length:De},()=>new Rt.Vector3(0,-999,0));this.spots=ae(n,e.glow,t,1.2,16773312),this.glints=ae(n,e.glow,t,1,16774364),this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0,s.add(this.spots.mesh,this.glints.mesh),this.active=[],this._cand=[]}update(t,e,s,i,a,o){let c=this.aA.array,n=this.aB.array,r=this.spots.attr.array,h=this.glints.attr.array,d=this.gemMat.uniforms.uLit.value;this.active.length=0;let u=0,g=0,p=i.x,m=i.y,v=i.z;for(let x=0;x<this.list.length;x++){let f=this.list[x],y=Math.abs(f.c.y-s)<15,b=!1;if(y){xe(f.anchor.x,f.anchor.y,f.anchor.z,f.w,e,Le),f.cx=f.c.x+Le.x,f.cy=f.c.y+Le.y,f.cz=f.c.z+Le.z;let M=f.n.x*p+f.n.y*m+f.n.z*v;if(M>.05&&!a.blocked(f.cx+p*.5,f.cy+m*.5,f.cz+v*.5,i)){let C=-p+2*M*f.n.x,F=-m+2*M*f.n.y,W=-v+2*M*f.n.z,O=this._cast(f.cx,f.cy,f.cz,C,F,W,a);f.hx=f.cx+C*O,f.hy=f.cy+F*O,f.hz=f.cz+W*O,f.hitT=O,b=!0}}if(f.lit=yt(f.lit,b?1:0,14,t),d[x]=f.lit,f.on=b,f.lit>.02&&u<De&&(c[u*4]=f.cx,c[u*4+1]=f.cy,c[u*4+2]=f.cz,c[u*4+3]=.55,n[u*4]=f.hx,n[u*4+1]=f.hy,n[u*4+2]=f.hz,n[u*4+3]=f.lit,r[u*4]=f.hx,r[u*4+1]=f.hy+.05,r[u*4+2]=f.hz,r[u*4+3]=f.hitT<39?1*f.lit:0,h[u*4]=f.cx,h[u*4+1]=f.cy,h[u*4+2]=f.cz,h[u*4+3]=.9*f.lit,u++),b){this.active.push(f);let M=as(o.x,o.y+.45,o.z,f.cx,f.cy,f.cz,f.hx,f.hy,f.hz);M<.55&&(g=Math.max(g,1-Math.max(0,M-.35)/.2))}}return this.geo.instanceCount=u,this.spots.mesh.geometry.instanceCount=u,this.glints.mesh.geometry.instanceCount=u,this.aA.needsUpdate=!0,this.aB.needsUpdate=!0,this.spots.attr.needsUpdate=!0,this.glints.attr.needsUpdate=!0,g}testPoint(t,e,s,i,a,o=.55){for(let c of this.list){if(Math.abs(c.c.y-s)>15)continue;let n=c.n.x*t.x+c.n.y*t.y+c.n.z*t.z;if(n<=.05)continue;let r=c.cx||c.c.x,h=c.cy||c.c.y,d=c.cz||c.c.z;if(a.blocked(r+t.x*.5,h+t.y*.5,d+t.z*.5,t))continue;let u=-t.x+2*n*c.n.x,g=-t.y+2*n*c.n.y,p=-t.z+2*n*c.n.z,m=this._cast(r,h,d,u,g,p,a);if(as(e,s,i,r,h,d,r+u*m,h+g*m,d+p*m)<o)return!0}return!1}litAt(t,e,s,i=.35){for(let a of this.active)if(as(t,e,s,a.cx,a.cy,a.cz,a.hx,a.hy,a.hz)<i)return!0;return!1}_cast(t,e,s,i,a,o,c){let n=this._cand;n.length=0;for(let h of c.slabs){let d=h.cx-t,u=h.cy-e,g=h.cz-s,p=d*i+u*a+g*o;if(p<-h.br||p>41)continue;d*d+u*u+g*g-p*p<=h.br*h.br&&n.push(h)}let r=.16;for(let h=.35;h<40;h+=r){let d=t+i*h,u=e+a*h,g=s+o*h,p=Math.hypot(d,g);if(u<56&&p<7&&p<$t(Math.atan2(g,d),u)||p<te&&u<Jt(d,g)+.02)return h;for(let m of n){let v=d-m.cx,x=u-m.cy,f=g-m.cz;if(!(Math.abs(v*m.Tx+x*m.Ty+f*m.Tz)>m.hT)&&!(Math.abs(v*m.Sx+f*m.Sz)>m.hS)&&!(Math.abs(x)>m.hU+.02))return h}}return 40}hide(){this.geo.instanceCount=0,this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0;for(let t of this.list)t.lit=0}};function as(l,t,e,s,i,a,o,c,n){let r=o-s,h=c-i,d=n-a,u=r*r+h*h+d*d,g=u>0?((l-s)*r+(t-i)*h+(e-a)*d)/u:0;g=g<0?0:g>1?1:g;let p=s+r*g-l,m=i+h*g-t,v=a+d*g-e;return Math.sqrt(p*p+m*m+v*v)}import*as at from"three";var Ks=3,os=7,ns=1.55,wi=[[0,1],[0,1.7],[.45,.8],[-.45,.8]];function Mi(){let e=[],s=[],i=[],a=[];for(let c=0;c<=8;c++){let n=c/8,r=Math.sin(Math.min(1,n*1.15)*Math.PI)*.36+.06*(1-n);for(let h=0;h<=6;h++){let d=h/6-.5,u=d*r*2,g=-Math.pow(Math.abs(d)*2,2)*.1-Math.pow(n,2)*.22;e.push(u,n*1.05,g);let p=new at.Vector3(-u*.6,.15-n*.2,1).normalize();s.push(p.x,p.y,p.z),i.push(.75+n*.25,n,1,1)}}for(let c=0;c<8;c++)for(let n=0;n<6;n++){let r=c*7+n;a.push(r,r+1,r+6+2,r,r+6+2,r+6+1)}let o=new at.BufferGeometry;return o.setAttribute("position",new at.Float32BufferAttribute(e,3)),o.setAttribute("normal",new at.Float32BufferAttribute(s,3)),o.setAttribute("color",new at.Float32BufferAttribute(i,4)),o.setIndex(a),o}function Ti(l,t,e){return new at.ShaderMaterial({vertexShader:`
			attribute vec4 color;
			varying vec3 vN; varying vec3 vW; varying vec4 vC;
			void main() {
				vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
				vW = w.xyz; vC = color;
				vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:`
			${et}
			${ge}
			${At}
			${bt}
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
			}`,uniforms:{...l,uA:{value:new at.Color(t)},uB:{value:new at.Color(e)},uCharge:{value:0},uOpen:{value:0}},side:at.DoubleSide})}function Ei(l){return new at.ShaderMaterial({vertexShader:`
			varying vec3 vN; varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${et}
			${At}
			${bt}
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
			}`,uniforms:{...l,uCharge:{value:0}}})}function zi(){let l=[],t=(i,a,o,c,n,r)=>{let h=[],d=new at.Vector3(Math.sin(n)*o*.3,o,0).applyAxisAngle(new at.Vector3(0,1,0),r);for(let g=0;g<6;g++){let p=g/6*Math.PI*2;h.push([Math.cos(p)*c,Math.sin(p)*c*.8])}let u=o*.72;for(let g=0;g<6;g++){let[p,m]=h[g],[v,x]=h[(g+1)%6],f=[i+p,0,a+m],y=[i+v,0,a+x],b=[i+p*.9+d.x*.7,u,a+m*.9+d.z*.7],M=[i+v*.9+d.x*.7,u,a+x*.9+d.z*.7],C=[i+d.x,o,a+d.z];l.push(...f,...y,...M,...f,...M,...b,...b,...M,...C)}},e=[.31,.77,.13,.55,.92,.4,.66];for(let i=0;i<7;i++){let a=-.95+i/6*1.9,o=.9+e[i]*1.1+(i===3?.4:0);t(a,(e[(i+2)%7]-.5)*.35,o,.17+e[(i+4)%7]*.1,(e[i]-.5)*.7,e[(i+1)%7]*6)}let s=new at.BufferGeometry;return s.setAttribute("position",new at.Float32BufferAttribute(l,3)),s.computeVertexNormals(),s}var Ve=class{constructor(t,e,s){this.G=t,this.petalGeo=Mi(),this.items=[];let i={spring:[14183064,16766694],summer:[14715418,16769146],autumn:[11024924,16752704]},a=()=>{let c={};for(let[n,[r,h]]of Object.entries(i))c[n]=Ti(t,r,h);return c};this.iceGeo=zi();for(let c=0;c<Ks;c++){let n=a(),r=new at.InstancedMesh(this.petalGeo,n.spring,os);r.frustumCulled=!1,r.visible=!1;let h=new at.Mesh(this.iceGeo,Ei(t));h.visible=!1,s.add(r,h),this.items.push({petals:r,ice:h,mats:n,s:0,charge:0,open:0,state:"off",x:0,y:0,z:0,tx:0,tz:0,sx:0,sz:0,kind:"bud"})}let o=Array.from({length:Ks},()=>new at.Vector3(0,-999,0));this.glow=ae(o,e.glow,t,1,16769696),this.glow.mesh.geometry.instanceCount=0,s.add(this.glow.mesh),this._m=new at.Matrix4,this._q=new at.Quaternion,this._e=new at.Euler,this._v=new at.Vector3,this._s=new at.Vector3,this.list=[]}setup(t,e,s,i=[],a="spring"){this.list=[],this.items.forEach((o,c)=>{let n=i[c];if(o.petals.visible=!1,o.ice.visible=!1,!n){o.state="off";return}let r=e+(s-e)*n,h=t.sample(r,{});Object.assign(o,{s:r,x:h.x,y:h.y,z:h.z,tx:h.tx,tz:h.tz,sx:h.sx,sz:h.sz,charge:0,open:0,state:"closed"}),o.kind=a==="winter"?"ice":"bud",o.kind==="ice"?(o.ice.visible=!0,o.ice.position.set(h.x,h.y-.02,h.z),o.ice.rotation.set(0,Math.atan2(h.tx,h.tz),0),o.ice.scale.setScalar(1)):(o.petals.visible=!0,o.petals.material=o.mats[a]||o.mats.spring),this.list.push(o),this._pose(o,0)}),this.glow.mesh.geometry.instanceCount=this.list.length}_pose(t,e){if(t.kind==="ice"){let a=1-qe(e);t.ice.scale.set(Math.max(.01,a)*1.05,Math.max(.01,a)*1,Math.max(.01,a)*1),t.ice.visible=a>.02;return}let s=this._v.set(t.x,t.y+.05,t.z),i=Math.atan2(t.tx,t.tz);for(let a=0;a<os;a++){let o=a/os*Math.PI*2,c=.18+qe(e)*1.45;this._e.set(-c,i+o,0,"YXZ"),this._q.setFromEuler(this._e);let n=1.55*(1-e*.35);this._s.set(n,n*(1.05-e*.2),n);let r=.12+e*.55,h=s.x+Math.sin(i+o)*r,d=s.z+Math.cos(i+o)*r;this._m.compose(this._v.set(h,s.y-e*.05,d),this._q,this._s),t.petals.setMatrixAt(a,this._m),this._v.copy(s)}t.petals.instanceMatrix.needsUpdate=!0}limit(t){let e=1/0;for(let s of this.list)s.state!=="open"&&s.s>t-.2&&(e=Math.min(e,s.s-ns));return e}update(t,e,s,i,a,o,c){let n=this.glow.attr.array,r=0;for(let h of this.list){let d=h.s-e<ns+.5&&h.s-e>-.5;if(h.state==="closed"&&!d)h.charge=Math.max(0,h.charge-t*.1);else if(h.state==="closed"){let g=0,p=wi;for(let[m,v]of p){let x=h.x+h.sx*m,f=h.z+h.sz*m;(!i.blocked(x,h.y+v,f,s)||a&&a.litAt(x,h.y+v,f,.5))&&g++}g/=p.length,h.charge=ht(h.charge+(g>0?g*.6:-.1)*t,0,1),g>0&&Math.random()<t*10&&oe(o,h.x+(Math.random()-.5),h.y+1+Math.random(),h.z+(Math.random()-.5),1,[2.2,1.7,.8]),h.charge>=1&&(h.state="opening",c(h),oe(o,h.x,h.y+1.2,h.z,26,[2.4,2,1]))}else h.state==="opening"&&(h.open=Math.min(1,h.open+t/.9),this._pose(h,h.open),h.open>=1&&(h.state="open"));let u=h.kind==="ice"?h.ice.material:h.petals.material;u.uniforms.uCharge.value=h.charge,u.uniforms.uOpen&&(u.uniforms.uOpen.value=h.open),n[r*4]=h.x,n[r*4+1]=h.y+1.1,n[r*4+2]=h.z,n[r*4+3]=h.state==="open"?0:.25+h.charge*1.3,r++}this.glow.attr.needsUpdate=!0}pending(t){for(let e of this.list)if(e.state==="closed"&&e.s>t-.2&&e.s-t<ns+.3)return e;return null}hide(){for(let t of this.items)t.petals.visible=!1,t.ice.visible=!1,t.state="off";this.list=[],this.glow.mesh.geometry.instanceCount=0}};var pt=(l=0,t=0,e=0)=>new Ys.Vector3(l,t,e),Si=3.6,_i=.42,Ri=.2,We=class{constructor(t,e,s){this.app=t,this.ui=e,this.sfx=s;let i=t.world;this.world=i,this.curve=i.curve,this.G=t.G,this.store=t.store,this.tester=new Pe(i),this.zifir=new Fe(t.G,i.tex,{segs:t.tier.id>=1?40:28}),this.zifir.g.visible=!1,i.scene.add(this.zifir.g),this.drops=new Ie(t.G,i.tex,i.scene),this.beams=new $e(t.G,i.tex,i.scene,i),this.drops.beams=this.beams,this.locks=new Ve(t.G,i.tex,i.scene),this.fx=new ye(t.G,i.tex.particles,{additive:!0}),this.petals=new ye(t.G,i.tex.particles,{additive:!1}),i.scene.add(this.fx.mesh,this.petals.mesh),this.prog=Object.assign({unlocked:0,stars:[],dust:0,fails:{},seen:{},intro:!1},this.store.get("progress")||{}),this.settings=Object.assign({sound:!0,haptics:!0,quality:"auto",power:"auto"},this.store.get("settings")||{}),this.sfx.setOn(this.settings.sound),this.state="title",this.stateT=0,this.level=null,this.li=0,this.s=0,this.speed=0,this.hold=!1,this.keyHold=!1,this.meter=1,this.expo=0,this.minMeter=1,this.burnTotal=0,this.sunAz=0,this.sunTarget=0,this.elev=34,this.levelT=0,this.dragged=!1,this.sunDir=pt(0,1,0),this.zp=pt(),this._ahead=pt(),this._smp={},this._smp2={},this._hintUntil=0,this._hintQueue=[],this._pts=[pt(),pt(),pt(),pt(),pt(),pt()],this.rays=t.tier.id>=1?6:4,this.envFrom="spring",this.envTo="spring",this.envT=1,this.envDur=1,this._titleSeason=0,this._onStep=()=>this.sfx.step(),this._bindInput(),this.ui.setToggles(this.settings),this.ui.setPlayLabel(this.prog.unlocked>0||this.prog.intro?"Devam Et":"Ba\u015Fla"),this.goTitle(!0)}_bindInput(){let t=this.app.container,e=null,s=0;t.addEventListener("pointerdown",a=>{this.sfx.unlock(),!a.target.closest("button")&&e===null&&(e=a.pointerId,s=a.clientX,this.state==="intro"&&this.ui.skip(!0))}),t.addEventListener("pointermove",a=>{if(a.pointerId!==e)return;let o=a.clientX-s;s=a.clientX,this.drag(o/Math.max(320,t.clientWidth))});let i=a=>{a.pointerId===e&&(e=null)};t.addEventListener("pointerup",i),t.addEventListener("pointercancel",i),this._onKey=a=>{a.repeat&&a.key!=="ArrowLeft"&&a.key!=="ArrowRight"||(a.key==="ArrowLeft"?this.drag(-.06):a.key==="ArrowRight"?this.drag(.06):a.key===" "?(this.keyHold=a.type==="keydown",a.preventDefault()):a.key==="Escape"&&a.type==="keydown"&&(this.state==="play"||this.state==="ready"?this.pause():this.state==="paused"&&this.resume()))},window.addEventListener("keydown",this._onKey),window.addEventListener("keyup",this._onKey)}drag(t){this.state!=="play"&&this.state!=="ready"||(this.sunTarget-=t*I*.85,!this.dragged&&Math.abs(t)>.004&&(this.dragged=!0,this.state==="ready"&&this._begin()))}wait(t){this.hold=t}_set(t){this.state=t,this.stateT=0,this.app.wake()}envTo2(t,e=2){this.envT<1?this.envFrom=this.envT>.5?this.envTo:this.envFrom:this.envFrom=this.envTo,this.envTo=t,this.envT=0,this.envDur=e}goTitle(t=!1){this._set("title"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.show("title"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.app.gov.menu=!0,t?(this.envFrom=this.envTo="spring",this.envT=1):this.envTo2("spring",1.5),this._orbit={a:.6,r:84,y:16,ly:25}}goLevels(){this._set("levels"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.renderLevels(se,this.prog),this.ui.show("levels"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.app.gov.menu=!0,this._orbit||(this._orbit={a:.6,r:84,y:16,ly:25})}action(t){if(this.sfx.unlock(),this.sfx.ui(),t==="play")this.prog.intro?this.startLevel(Math.min(this.prog.unlocked,ve-1)):this.startIntro();else if(t==="levels")this.goLevels();else if(t==="title")this.goTitle();else if(t==="exit")this.app.exit();else if(t.startsWith("lv:")){let e=Number(t.slice(3));e<=this.prog.unlocked?this.startLevel(e):this.ui.toast("\xD6nceki b\xF6l\xFCm\xFC tamamla")}else t==="pause"?this.pause():t==="resume"?this.resume():t==="retry"?this.startLevel(this.li,{retry:!0}):t==="next"?this.startLevel(Math.min(this.li+1,ve-1),{cont:!0}):t==="skip"?this.skipIntro():t==="settings"&&(this._settingsFromTitle=!0,this.ui.$(".uk-card h4").textContent="Ayarlar",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Tamam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="none",this.ui.$("[data-s=pause] [data-a=levels]").style.display="none",this.ui.show("pause"))}toggle(t){let e=this.settings;if(t==="sound")e.sound=!e.sound,this.sfx.setOn(e.sound);else if(t==="haptics")e.haptics=!e.haptics;else if(t==="quality"){let s=["auto",0,1,2];e.quality=s[(s.indexOf(e.quality)+1)%s.length],this.ui.toast("Grafik ayar\u0131 bir sonraki a\xE7\u0131l\u0131\u015Fta uygulan\u0131r")}else if(t==="power"){let s=["auto","saver","performance"];e.power=s[(s.indexOf(e.power)+1)%s.length],this.app.gov.power=e.power,this.app.resize()}this.store.set("settings",e),this.ui.setToggles(e)}pause(){this.state!=="play"&&this.state!=="ready"||(this._paused=this.state,this._set("paused"),this._settingsFromTitle=!1,this.ui.$(".uk-card h4").textContent="Duraklat\u0131ld\u0131",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Devam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="",this.ui.$("[data-s=pause] [data-a=levels]").style.display="",this.ui.show("pause"),this.sfx.tick(0,0,0,!1))}resume(){if(this._settingsFromTitle){this._settingsFromTitle=!1,this.ui.show("title");return}this.state==="paused"&&(this.ui.show(null),this._set(this._paused||"play"))}haptic(t){if(this.settings.haptics&&!(this.app.hooks.haptic&&this.app.hooks.haptic(t)===!0))try{navigator.vibrate&&navigator.vibrate(t)}catch{}}startIntro(){this._set("intro"),this.ui.show(null),this.ui.hudOn(!1),this.app.gov.menu=!1,this.envFrom=this.envTo="spring",this.envT=1;let t=ts(0);this._setupLevelData(0);let e=this.curve.sample(this.s,this._smp),s=this.curve.sample(this.s+3,this._smp2),i=this.app.rig;i.followTarget(pt(e.x,e.y,e.z),pt(s.x,s.y,s.z));let a=i.tPos.clone(),o=i.tLook.clone(),c=Math.atan2(e.z,e.x);i.play([{t:0,pos:pt(Math.cos(c+1.3)*150,-6,Math.sin(c+1.3)*150),look:pt(0,22,0),fov:44},{t:4.5,pos:pt(Math.cos(c+.9)*62,14,Math.sin(c+.9)*62),look:pt(0,30,0),fov:46},{t:8.5,pos:pt(Math.cos(c+.4)*30,59,Math.sin(c+.4)*30),look:pt(0,55,0),fov:50},{t:11.5,pos:a,look:o}],()=>this._enterLevel(0,{fromIntro:!0})),this.sunAz=this.sunTarget=c+Math.PI*.6,this.zifir.g.visible=!0,this._lore=[[.6,"G\xF6k ile yeri bir a\u011Fa\xE7 ba\u011Flar: Ulu Kay\u0131n."],[4.4,"T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 k\xF6klerine d\xFC\u015Ft\xFC."],[8,"G\xFCne\u015F a\u011Fac\u0131n \xE7evresinde d\xF6ner; g\xF6lgesi Zifir\u2019in yoludur."]],this._loreI=0,this.ui.skip(!0)}skipIntro(){this.state==="intro"&&(this.ui.lore(null),this.ui.skip(!1),this.app.rig.skipCine())}_setupLevelData(t){this.li=t,this.level=ts(t);let e=this.level;[this.s0,this.s1]=He(this.curve,t),this.s=this.s0,this.drops.setup(this.curve,this.s0,this.s1,e.drops),this.locks.setup(this.curve,this.s0,this.s1,e.locks,e.season),this.ui.setLevel(e),this.ui.setDrops(0,e.drops.length),this.sfx.resetDrops(),this.sfx.season=e.season,this.meter=1,this.minMeter=1,this.burnTotal=0,this.expo=0,this.speed=0,this.levelT=0,this.dragged=!1,this.got=0,this.lostN=0;let s=this.prog.fails[t]||0;this.mercy=Math.max(.55,1-.12*s),this.burnK=(e.burn||1)*this.mercy,this.elev=e.elev[0],zt.str=e.wind,zt.gust=0,this._gate=0,this._lockT=0,this._arcOn=!1,this.ui.lockArc(null)}startLevel(t,{retry:e=!1,cont:s=!1}={}){let i=s&&this.level&&this.li===t-1,a=this.s;this._setupLevelData(t),this.zifir.reset(),this.zifir.g.visible=!0,this.fx.clear(),this.petals.clear(),i?(this._walkFrom=a,this.s=a):this._walkFrom=null,this._enterLevel(t,{retry:e,cont:i})}_enterLevel(t,{retry:e=!1,fromIntro:s=!1,cont:i=!1}={}){let a=this.level;this._set("enter"),this.ui.show(null),this.ui.hudOn(!1),this.ui.lore(null),this.ui.skip(!1),this.app.gov.menu=!1,this.envTo!==a.season&&this.envTo2(a.season,i?3:1.6);let o=this.curve.sample(this.s0,this._smp),c=Math.atan2(o.z,o.x);s?this.sunTarget=c+a.sunStart:this.sunAz=this.sunTarget=c+a.sunStart;let n=this.app.rig,r=this.curve.sample(this.s0+3,this._smp2);if(n.followTarget(pt(o.x,o.y,o.z),pt(r.x,r.y,r.z)),!s&&!e&&!i){let h=n.tPos.clone(),d=n.tLook.clone(),u=n.pos.clone(),g=pt(Math.cos(c-.6)*34,o.y+9,Math.sin(c-.6)*34);n.play([{t:0,pos:u,look:n.look.clone()},{t:1.4,pos:g,look:pt(o.x*.5,o.y+1,o.z*.5)},{t:2.6,pos:h,look:d}],null)}else e?(n.mode="follow",n.snap()):n.mode="follow";this.ui.card(a.kicker,a.title,a.finale?"Son b\xF6l\xFCm":""),this._cardT=2.4,this.ui.setDrops(0,a.drops.length),this._queueHints(a.hints||[])}_queueFront(t){this._hintQueue.includes(t)||this._hintQueue.unshift(t)}_queueHints(t){this._hintQueue=t.filter(e=>!this.prog.seen[e])}_showHint(t,e=4.5){this.ui.hint(t),this._hintUntil=this.levelT+e,this._hintKey=t,this.prog.seen[t]=!0,this.store.set("progress",this.prog)}_begin(){this._set("play"),this.ui.hudOn(!0),this._hintKey==="drag"&&(this.ui.hint(null),this._hintKey=null,this._hintQueue[0]==="hide"&&this._showHint(this._hintQueue.shift(),4.5))}update(t,e){this.stateT+=t,this.envT<1&&(this.envT=Math.min(1,this.envT+t/this.envDur));let s=this.state;if(s==="title"||s==="levels")return this._updateOrbit(t,e);if(s==="intro")return this._updateIntro(t,e);if(s==="paused"||s==="complete"||s==="fail"||s==="ending"){this.app.idle=this.stateT>1.2,this._updateZifirOnly(t,e,s==="paused");return}this.app.idle=!1;let i=this.level;this.levelT+=s==="play"?t:0;let a=this.curve,o=this.sunTarget-this.sunAz,c=Si*t;this.sunAz+=ht(o,-c,c),zt.gust=s==="play"?$s(i.gust,this.levelT):0,this.ui.gust(s==="play"&&es(i.gust,this.levelT)<1.6&&zt.gust<.05),s==="play"&&i.gust&&es(i.gust,this.levelT)<1.6&&this._hintQueue[0]==="gust"&&this._showHint(this._hintQueue.shift(),4);let n=!1;if(s==="enter")this._cardT-=t,this._cardT<.4&&this.ui.card(null),this._walkFrom!=null&&this.s<this.s0&&(this.s=Math.min(this.s0,this.s+1.4*t),n=!0),this.app.rig.mode!=="cine"&&this._cardT<.6&&(this._walkFrom==null||this.s>=this.s0)&&(this.ui.card(null),this.ui.hudOn(!0),this.li===0&&!this.prog.seen.drag?(this._set("ready"),this._showHint(this._hintQueue.shift()||"drag",999)):(this._set("play"),this._hintQueue.length&&this._hintQueue[0]!=="gust"&&this._hintQueue[0]!=="bridge"&&this._showHint(this._hintQueue.shift(),4.5)));else if(s==="ready")this.stateT>7&&this._begin();else if(s==="play"){let x=this.hold||this.keyHold,f=this.locks.limit(this.s),y=this.s>=f-.05,b=ht((f-this.s)/.7,0,1),M=x?0:i.speed*b;if(this.speed=yt(this.speed,M,x?14:5,t),this.s=Math.min(this.s+this.speed*t,Math.max(this.s,f)),n=this.speed>.15,y&&!this.prog.seen.lock&&this._showHint("lock",6),this._lockT=y?(this._lockT||0)+t:0,this._lockT>4?this._lockAssist():this._arcOn&&(this.ui.lockArc(null),this._arcOn=!1),this._hintQueue[0]==="bridge")for(let C of he){let F=a.sAtTheta(C.th);F>this.s&&F-this.s<9&&this._showHint(this._hintQueue.shift(),4.5)}}let r=a.sample(this.s,this._smp);this.zp.set(r.x,r.y,r.z);let h=a.sample(Math.min(a.length,this.s+3.2),this._smp2);this._ahead.set(h.x,h.y,h.z);let d=Math.atan2(r.z,r.x),u=ht((this.s-this.s0)/(this.s1-this.s0),0,1);this.elev=V(i.elev[0],i.elev[1],u),fe(this.sunAz,this.elev,this.sunDir);let g=s==="play";this.tester.setTime(e);let p=0;if(g||s==="ready"){let x=this._pts,f=r.tx,y=r.tz,b=r.sx,M=r.sz;x[0].set(r.x,r.y+.48,r.z),x[1].set(r.x,r.y+.86,r.z),x[2].set(r.x+b*.3,r.y+.36,r.z+M*.3),x[3].set(r.x-b*.3,r.y+.36,r.z-M*.3),x[4].set(r.x+f*.3,r.y+.36,r.z+y*.3),x[5].set(r.x-f*.3,r.y+.36,r.z-y*.3);for(let C=0;C<this.rays;C++){let F=x[C];this.tester.blocked(F.x,F.y,F.z,this.sunDir)||p++}p/=this.rays}let m=0;if(s!=="title"&&s!=="levels"&&(m=this.beams.update(t,e,r.y,this.sunDir,this.tester,this.zp)),m>0&&g&&this._hintQueue[0]!=="crystal"&&!this.prog.seen.crystal&&this._queueFront("crystal"),this.beams.active.length&&g&&this._hintQueue[0]==="crystal"&&this._showHint(this._hintQueue.shift(),5),p=Math.max(p,m),this.expo=yt(this.expo,p,18,t),g&&(p>.01?(this.meter-=p*_i*this.burnK*t,this.burnTotal+=p*t,this._wasSafe&&this.haptic(8),this._wasSafe=!1,Math.random()<t*22*p&&be(this.fx,r.x,r.y+.7,r.z,.9)):(this.meter=Math.min(1,this.meter+Ri*t),this._wasSafe=!0),this.minMeter=Math.min(this.minMeter,this.meter)),this.G.uDanger.value=yt(this.G.uDanger.value,g?p*.8+(1-this.meter)*.4*p:0,8,t),this.drops.update(t,e,this.s,this.zp,this.tester,this.sunDir,this.fx,()=>{this.got++,this.ui.setDrops(this.got,this.drops.total,"pop"),this.sfx.drop(),this.haptic(12)},()=>{this.lostN++,this.ui.setDrops(this.got,this.drops.total,"bad"),this.sfx.dropLost(),this.haptic(40),this.prog.seen.drops!==!0&&this._showHint("drops",4)},g),(g||s==="ready")&&this.locks.update(t,this.s,this.sunDir,this.tester,this.beams,this.fx,()=>{this.sfx.unlockOpen?this.sfx.unlockOpen():this.sfx.win(),this.haptic([15,30,15]),this._hintKey==="lock"&&(this.ui.hint(null),this._hintKey=null),this.ui.lockArc(null),this._arcOn=!1,this._lockT=0}),this._hintKey&&this._hintKey!=="drag"&&this.levelT>this._hintUntil&&(this.ui.hint(null),this._hintKey=null),g&&this.meter<=0?this._die():g&&this.s>=this.s1&&this._win(),s!=="dying"&&s!=="gate"){let x=this._zstate(r,n,n?Math.max(this.speed,1.2):0,s==="play"&&(this.hold||this.keyHold),g?p:0,p,this.meter);this.zifir.update(t,e,x,this._onStep)}let v=this.app.rig;v.mode==="follow"&&v.followTarget(this.zp,this._ahead),this.ui.compass(ke(this.sunAz-d),p>.01),this.sfx.tick(t,g?p:0,zt.str+zt.gust,g),this._commonFx(t)}_lockAssist(){if(this._assistT=(this._assistT||0)-1,this._assistT>0)return;this._assistT=15;let t=this.locks.pending(this.s);if(!t)return;let e=this.curve.sample(this.s,{}),s=Math.atan2(e.z,e.x),i=this._Lt||(this._Lt=pt()),a=[];for(let r=0;r<72;r++){let h=r/72*I-Math.PI;fe(s+h,this.elev,i);let d=!1;for(let g of[.48,.86,.36])this.tester.blocked(e.x,e.y+g,e.z,i)||(d=!0);if(d)continue;let u=!1;for(let g of[1,1.7,.8])this.tester.blocked(t.x,t.y+g,t.z,i)||(u=!0);u&&a.push(h)}if(!a.length)return;let o=ke(this.sunAz-s),c=null,n=0;for(;n<a.length;){let r=n;for(;r+1<a.length&&a[r+1]-a[r]<.1;)r++;let h=(a[n]+a[r])/2,d=Math.abs(ke(h-o));(!c||d<c.d)&&(c={a0:a[n]-.04,a1:a[r]+.04,d}),n=r+1}this.ui.lockArc(c.a0,c.a1),this._arcOn=!0}_zstate(t,e,s,i,a,o,c){let n=this._zs||(this._zs={});return n.x=t.x,n.y=t.y,n.z=t.z,n.yaw=Math.atan2(t.tx,t.tz),n.moving=e,n.speed=s,n.hold=i,n.burn=a,n.lit=o,n.meter=c,n}_commonFx(t){this.fx.update(t),this.petals.update(t),this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp)}_updateZifirOnly(t,e,s){if(s)return;let i=this.curve.sample(this.s,this._smp);(this.state==="complete"||this.state==="ending")&&this.zifir.update(t,e,this._zstate(i,!1,0,!1,0,0,1)),this._commonFx(t)}_updateOrbit(t,e){let s=this._orbit;s.a+=t*.05;let i=this.app.rig;i.mode="manual";let a=this.app.rig.aspect<1?s.r*1.12:s.r;i.pos.set(Math.cos(s.a)*a,s.y+Math.sin(e*.1)*3,Math.sin(s.a)*a),i.look.set(0,s.ly,0),this.sunAz=s.a+1.1+Math.sin(e*.07)*.6,this.elev=30;let o=["spring","summer","autumn","winter"];if(this._titleSeason+=t,this._titleSeason>9){this._titleSeason=0;let c=o[(o.indexOf(this.envTo)+1)%4];this.envTo2(c,3)}zt.str=.25,zt.gust=0,this.elev=null,this.app.sunAz=this.sunAz,this.app.elev=null,this.app.focus.set(0,30,0),this.app.idle=!1,this.fx.update(t),this.petals.update(t)}_updateIntro(t,e){let s=this.app.rig,i=s.cine?s.cine.t:99;for(;this._loreI<this._lore.length&&i>=this._lore[this._loreI][0];)this.ui.lore(this._lore[this._loreI][1]),this._loreI++;i>10.6&&this.ui.lore(null);let a=this.curve.sample(this.s,this._smp);this.zp.set(a.x,a.y,a.z),this.zifir.update(t,e,this._zstate(a,!1,0,!1,0,0,1)),this.sunAz+=t*.12,this.elev=34,this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp),this.fx.update(t),this.petals.update(t),!s.cine&&this.state==="intro"&&(this.prog.intro=!0,this.store.set("progress",this.prog))}_die(){this._set("dying"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.sfx.fail(),this.haptic([30,40,60]),this.prog.fails[this.li]=(this.prog.fails[this.li]||0)+1,this.store.set("progress",this.prog);let t=performance.now(),e=this.zifir,s=this.zp.clone(),i=()=>{let a=Math.min(1,(performance.now()-t)/1300);e.evaporate(a),Math.random()<.6&&be(this.fx,s.x,s.y+.4,s.z,1.3),this.app.wake(),a<1?requestAnimationFrame(i):(this._set("fail"),this.G.uDanger.value=0,this.ui.showFail({progress:ht((this.s-this.s0)/(this.s1-this.s0),0,1),mercy:this.prog.fails[this.li]>=1}))};requestAnimationFrame(i)}_win(){let t=this.level;this._set(t.finale?"gate":"won"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.G.uDanger.value=0,this.zifir.hop(),this.sfx.win(),this.haptic([20,40,20,40,60]);let e=this.zp,s={spring:0,summer:3,autumn:1,winter:2}[t.season];for(let h=0;h<46;h++){let d=Math.random()*I,u=Math.random()*3;this.petals.emit(e.x+Math.cos(d)*u,e.y+3+Math.random()*3,e.z+Math.sin(d)*u,(Math.random()-.5)*1.2,-.3-Math.random()*.6,(Math.random()-.5)*1.2,3+Math.random()*1.5,.22,.2,.25,.6,1,1,1,1,s,(Math.random()-.5)*4)}oe(this.fx,e.x,e.y+.8,e.z,30,[2.6,2,.9]);let i=this.drops.total,a=[!0,i===0||this.got===i,this.minMeter>.9],o=a.filter(Boolean).length,c=this.prog.stars[this.li]||0,n=10+this.got*5+(a[2]?10:0)+(o===3?10:0),r=o>c?n:Math.round(n*.25);this.prog.stars[this.li]=Math.max(c,o),this.prog.unlocked=Math.min(ve-1,Math.max(this.prog.unlocked,this.li+1)),this.prog.dust+=r,this.prog.fails[this.li]=0,this.store.set("progress",this.prog),this.app.hooks.onReward&&this.app.hooks.onReward({level:this.li,stars:o,dust:r,drops:this.got}),this._result={title:t.title,kicker:t.kicker,stars:a,dust:r,last:this.li===ve-1},t.finale?this._gateSeq():setTimeout(()=>{this.state==="won"&&(this._set("complete"),this.ui.showComplete(this._result))},1500)}_gateSeq(){let t=this.world.island,e=t.gatePos.clone(),s=this.zp.clone(),i=this.app.rig,a=t.gateOut,o=e.clone().addScaledVector(a,14).add(pt(0,4,0));i.play([{t:0,pos:i.pos.clone(),look:i.look.clone()},{t:2.2,pos:e.clone().addScaledVector(a,9).add(pt(0,2.5,0)),look:e.clone()},{t:6.5,pos:o.add(pt(0,16,0)),look:pt(0,22,0),fov:55}],null),this.envTo2("night",5);let c=performance.now(),n=this.zifir,r=()=>{let h=(performance.now()-c)/1e3,d=ht((h-.6)/1.6,0,1),u=s.clone().lerp(pt(e.x,s.y,e.z),d);n.g.position.copy(u),n.setFade(1-Ht(.7,1,d)),this.world.gateMat.uniforms.uOpen.value=Ht(0,1.2,h),h<7?requestAnimationFrame(r):(n.g.visible=!1,this._set("ending"),this.ui.showEnding(this.prog.dust))};requestAnimationFrame(r)}envState(){let t=this.envT;return[this.envFrom,this.envTo,t*t*(3-2*t)]}destroy(){window.removeEventListener("keydown",this._onKey),window.removeEventListener("keyup",this._onKey)}};var js=`
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
`;var lt=(l,t="")=>`<svg viewBox="0 0 24 24"${t?` class="${t}"`:""} aria-hidden="true">${l}</svg>`,K={back:lt('<path d="M15 5l-7 7 7 7"/>'),pause:lt('<path d="M9 6.5v11M15 6.5v11"/>'),play:lt('<path d="M8.5 5.8v12.4c0 .7.8 1.1 1.4.7l9.2-6.2c.5-.4.5-1.1 0-1.4L9.9 5.1c-.6-.4-1.4 0-1.4.7z"/>',"f"),path:lt('<path d="M8 14.5h8.6a3.8 3.8 0 0 0 .8-7.5 5.5 5.5 0 0 0-10.7-.3A3.9 3.9 0 0 0 8 14.5z"/><path d="M12 14.5v5M12 17l-2.3-1.8M12 16l2.3-1.6M8.5 21.5c1.4-.3 2.5-1 3.5-2.2 1 1.2 2.1 1.9 3.5 2.2"/>'),gear:lt('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),retry:lt('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 4v4.5H9"/>'),next:lt('<path d="M5 12h13M13 6l6 6-6 6"/>'),home:lt('<path d="M4 11.5L12 4l8 7.5M6.5 9.5V20h11V9.5"/>'),sound:lt('<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>'),vibe:lt('<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7"/>'),gem:lt('<path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/>'),battery:lt('<rect x="3" y="7.5" width="15.5" height="9" rx="2"/><path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3"/>'),hand:lt('<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 13.5c-.6-1 .6-2.2 1.6-1.5L8 15"/>'),hourglass:lt('<path d="M6.5 3h11M6.5 21h11"/><path d="M8 3v2.5c0 2.3 4 4.2 4 6.5s-4 4.2-4 6.5V21M16 3v2.5c0 2.3-4 4.2-4 6.5s4 4.2 4 6.5V21"/>'),drop:lt('<path d="M12 3.2c3.6 4.4 6.2 7.5 6.2 10.8a6.2 6.2 0 0 1-12.4 0c0-3.3 2.6-6.4 6.2-10.8z"/>'),sun:lt('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),shade:lt('<circle cx="15.5" cy="8" r="3.8"/><path d="M15.5 1.8v1.4M21.7 8h-1.4M19.9 3.6l-1 1M19.9 12.4l-1-1"/><rect class="f" x="7" y="2.5" width="5.6" height="19" rx="1.6"/><path d="M7 15.5l-4.5 3.5M7 19.5l-2.5 2"/>'),leaf:lt('<path d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path d="M5 19.5l8.5-8.5"/>'),ledge:lt('<path d="M3 8h18M6 8v2.5M18 8v2.5M5 18h14"/><path d="M8.5 11.5L6.5 16M12.5 11.5l-2 4.5M16.5 11.5l-2 4.5"/>'),wind:lt('<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15.5a3 3 0 1 1-3 3M3 16.5h7"/>'),gate:lt('<path d="M5 21V11a7 7 0 0 1 14 0v10M3.5 21h17M12 21v-5.5"/>'),crystal:lt('<path d="M12 2.5l5 6-5 13-5-13z"/><path d="M7 8.5h10M12 2.5v19"/>'),bud:lt('<path d="M12 21v-6.5"/><path d="M12 14.5c-3.4 0-5.4-2.9-5.4-6.4 1.8.6 3.9-1.2 5.4-4.6 1.5 3.4 3.6 5.2 5.4 4.6 0 3.5-2 6.4-5.4 6.4z"/><path d="M12 18c-2 0-3.5-1-4.5-2.5M12 18c2 0 3.5-1 4.5-2.5"/>'),birds:lt('<path d="M3 9.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M12 15.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M5.5 19.5c1.2-1.4 2.6-1.4 3.6 0 1-1.4 2.4-1.4 3.6 0"/>'),lock:lt('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),check:lt('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),star:lt('<path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6l-5.6 3.2 1.3-6.2L3 9.3l6.3-.7z"/>',"f"),blossom:lt('<g class="f"><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="2.2" class="c"/>'),sleaf:lt('<path class="f" d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path class="c" d="M5 19.5l8.5-8.5"/>'),maple:lt('<path class="f" d="M12 2.5l1.6 3.8 3.4-1.5-.9 4.2 4.4.5-2.9 3.1 2.2 2.4-4.4.3.6 3.4L12 16.4l-4 2.3.6-3.4-4.4-.3 2.2-2.4L3.5 9.5l4.4-.5L7 4.8l3.4 1.5z"/><path class="c" d="M12 16.4v5"/>'),flake:lt('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5M4 10.5l3.4.9-.9 3.4M20 13.5l-3.4-.9.9-3.4M5 13.6l3.4-.9-.9-3.4M19 10.4l-3.4.9.9 3.4"/>')},Zs=`<svg class="emb" viewBox="-40 -40 80 80" aria-hidden="true">
	<g class="er">${Array.from({length:9},(l,t)=>{let e=(-80+t*20)*(Math.PI/180);return`<path d="M${(Math.cos(e)*29).toFixed(1)} ${(Math.sin(e)*29).toFixed(1)}L${(Math.cos(e)*36).toFixed(1)} ${(Math.sin(e)*36).toFixed(1)}"/>`}).join("")}</g>
	<g class="es"><circle cx="-31" cy="-10" r="1.4"/><circle cx="-26" cy="14" r="1"/><circle cx="-33" cy="6" r=".9"/><circle cx="-20" cy="-27" r="1.1"/></g>
	<circle class="en" r="23"/>
	<path class="ed" d="M0-23A23 23 0 0 1 0 23Z"/>
	<path class="et" d="M0 23V-6M0 4l-7-7M0-1l7-8M0-6l-4-7M0-6l3-8"/>
	<circle class="eo" r="23"/>
</svg>`,Qs=`<svg viewBox="-100 -100 200 200" aria-hidden="true">${Array.from({length:16},(l,t)=>`<path transform="rotate(${t*22.5})" d="M-5 -34L0 -98L5 -34Z"/>`).join("")}</svg>`,Hi={drag:["hand","Parma\u011F\u0131n\u0131 sa\u011Fa sola kayd\u0131r: <em>g\xFCne\u015F</em> a\u011Fac\u0131n \xE7evresinde d\xF6ner."],hide:["shade","G\xFCne\u015Fi <em>g\xF6vdenin arkas\u0131na</em> al. A\u011Fac\u0131n g\xF6lgesi Zifir\u2019i korur."],drops:["drop","<em>Gece damlalar\u0131n\u0131</em> topla. I\u015F\u0131kta erirler, onlar\u0131 da g\xF6lgede tut."],bridge:["leaf","K\xF6pr\xFCde g\xF6vde uzakta: <em>yapraklar\u0131n g\xF6lgesine</em> s\u0131\u011F\u0131n."],ledge:["ledge","G\xFCne\u015F tepedeyken <em>\xFCstteki patika</em> da g\xF6lge verir."],wait:["hourglass","<em>Bekle</em>\u2019ye bas\u0131l\u0131 tut: Zifir durur, sen g\xF6lgeyi haz\u0131rlars\u0131n."],gust:["wind","<em>Sert r\xFCzg\xE2r</em> yapraklar\u0131 savurur. <em>Bekle</em>, dinsin."],gate:["gate","G\xFCne\u015F bat\u0131yor. Zifir\u2019i <em>K\xF6k Kap\u0131s\u0131</em>\u2019na ula\u015Ft\u0131r!"],crystal:["crystal","<em>Kristaller</em> \u0131\u015F\u0131\u011F\u0131 yans\u0131t\u0131r. I\u015F\u0131n Zifir\u2019e de\u011Fmesin."],lock:["bud","Tomurcuk \u0131\u015F\u0131kla a\xE7\u0131l\u0131r: ona <em>\u0131\u015F\u0131k</em>, Zifir\u2019e <em>g\xF6lge</em> d\xFC\u015F\xFCr."]},Ci={spring:{name:"Bahar",sub:"\xC7i\xE7ekli ta\xE7",icon:K.blossom},summer:{name:"Yaz",sub:"Ye\u015Fil g\xF6vde",icon:K.sleaf},autumn:{name:"G\xFCz",sub:"Alt\u0131n dallar",icon:K.maple},winter:{name:"K\u0131\u015F",sub:"Karl\u0131 k\xF6kler",icon:K.flake}},Ai={flock:{icon:K.birds,label:"S\xFCr\xFC"}},Pi=["\u0131","i","si","\xFC","\xFC","i","s\u0131","si","i","u"],Fi=["\u0131","u","si","u","\u0131","si","\u0131","i","i","\u0131"];function Ii(l){return l>=100?"\xFC":l%10?Pi[l%10]:Fi[l/10]}var Di=l=>{let t=Ii(l);return t+"n"+t.slice(-1)};function Li(){try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}}var Be=class{constructor(t,e){if(this.h=e,!document.getElementById("uk-style")){let h=document.createElement("style");h.id="uk-style",h.textContent=js,document.head.appendChild(h)}let s=document.createElement("div");s.className="uk-ui",s.lang="tr";let i=(h,d,u)=>`<button class="uk-tog" data-t="${h}">${d}<span>${u}</span><b></b></button>`,a=(h,d)=>`<div class="uk-star s${h}"><div class="sh"><i></i><b></b></div><span>${d}</span></div>`;s.innerHTML=`
			<div class="uk-scr uk-title" data-s="title">
				<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
				<div class="foot"></div>
				<div class="top"><button class="uk-ico uk-tap" data-a="exit" aria-label="Ana oyuna d\xF6n">${K.back}</button></div>
				<div class="uk-brand">
					${Zs}
					<div class="k"><i></i>G\xFCnd\xF6n\xFCm\xFC \xB7 \u0130kinci Mod<i></i></div>
					<h1 data-t="Ulu Kay\u0131n"><span>Ulu Kay\u0131n</span></h1>
					<div class="tag">G\xFCne\u015Fi \xE7evir, g\xF6lgede kal.</div>
				</div>
				<div class="acts">
					<button class="uk-btn pri uk-tap" data-a="play">${K.play}<b>Ba\u015Fla</b></button>
					<div class="row"><button class="uk-btn gh uk-tap" data-a="levels">${K.path}B\xF6l\xFCmler</button><button class="uk-btn gh uk-tap" data-a="settings">${K.gear}Ayarlar</button></div>
				</div>
			</div>
			<div class="uk-scr uk-levels" data-s="levels">
				<div class="hd"><button class="uk-ico uk-tap" data-a="title" aria-label="Geri">${K.back}</button><div class="ttl"><small>Ulu Kay\u0131n\u2019\u0131n yolu</small><h5>Mevsimler</h5></div><div class="uk-dpill"><i>\u2726</i><b class="dsum">0</b></div></div>
				<div class="uk-list"></div>
			</div>
			<div class="uk-hud">
				<div class="top">
					<button class="uk-ico" data-a="pause" aria-label="Duraklat">${K.pause}</button>
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
				<button class="uk-wait" aria-label="Bekle">${K.hourglass}<b>Bekle</b></button>
				<div class="uk-gust">${K.wind}<span>R\xFCzg\xE2r geliyor</span></div>
				<div class="uk-hint"><i class="hi"></i><p></p></div>
				<div class="uk-hand"><i class="tr"></i><span class="fg">${K.hand}</span></div>
			</div>
			<div class="uk-card-title"><i class="bd"></i><small></small><b></b><span></span></div>
			<div class="uk-lore"><i class="orn"></i><p></p></div>
			<button class="uk-skip" data-a="skip">Ge\xE7<span>\u203A</span></button>
			<div class="uk-scr uk-end" data-s="complete">
				<div class="uk-sheet">
					<div class="rays">${Qs}</div>
					<div class="med">${K.sun}</div>
					<div class="k ck"></div><h2 class="ct"></h2><div class="ban">G\xF6lge korundu</div><div class="sub cs2"></div>
					<div class="uk-stars">${a(0,"Yol tamam")}${a(1,"T\xFCm damlalar")}${a(2,"G\xF6lgede kald\u0131")}</div>
					<div class="uk-dust cd"><i>\u2726</i><b class="cdn">+0</b><span>\u0131\u015F\u0131k tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="next"><b>Sonraki b\xF6l\xFCm</b>${K.next}</button><div class="row"><button class="uk-btn gh uk-tap" data-a="retry">${K.retry}Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">${K.path}B\xF6l\xFCmler</button></div></div>
				</div>
			</div>
			<div class="uk-scr uk-end fail" data-s="fail">
				<div class="uk-sheet">
					<div class="med">${K.drop}</div>
					<div class="k">I\u015F\u0131k kazand\u0131</div><h2>Zifir buharla\u015Ft\u0131</h2>
					<div class="uk-prog"><i class="fp"></i><div class="fz"><i></i></div><span class="g0"></span><span class="g1">${K.gate}</span></div>
					<div class="sub fs"></div>
					<div class="uk-mercy fm">${K.sun}<p><b>G\xFCne\u015F yumu\u015Fad\u0131.</b> Bir sonraki denemede \u0131\u015F\u0131k daha az yakacak.</p></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="retry">${K.retry}<b>Tekrar dene</b></button><button class="uk-btn gh uk-tap" data-a="levels">${K.path}B\xF6l\xFCmler</button></div>
				</div>
			</div>
			<div class="uk-scr uk-end night" data-s="ending">
				<div class="uk-sheet">
					<div class="rays">${Qs}</div>
					<div class="med">${Zs}</div>
					<div class="k">K\xF6k Kap\u0131s\u0131 a\xE7\u0131ld\u0131</div><h2>Gece eve d\xF6nd\xFC</h2>
					<div class="sub">Zifir, Ulu Kay\u0131n\u2019\u0131n k\xF6klerine ula\u015Ft\u0131. T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 kar\u0131n alt\u0131nda ilk kez k\u0131p\u0131rd\u0131yor.</div>
					<div class="uk-dust ed"><i>\u2726</i><b class="edn">0</b><span>\u0131\u015F\u0131k tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="levels">${K.path}<b>Mevsimler</b></button><button class="uk-btn gh uk-tap" data-a="exit">${K.home}G\xF6ky\xFCz\xFCne d\xF6n</button></div>
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
						${i("sound",K.sound,"Ses")}
						${i("haptics",K.vibe,"Titre\u015Fim")}
						${i("quality",K.gem,"Grafik")}
						${i("power",K.battery,"Pil")}
					</div>
				</div>
			</div>
			<div class="uk-toast"></div>
			<div class="uk-fade"></div>`,t.appendChild(s),this.el=s;let o=h=>s.querySelector(h);this.$=o,this.scr={},s.querySelectorAll(".uk-scr").forEach(h=>this.scr[h.dataset.s]=h),this.hud=o(".uk-hud"),this.lk=o(".lk"),this.lt=o(".lt"),this.dp=o(".dp"),this.dt=o(".dt"),this.pgF=o(".pg .pf"),this.pgH=o(".pg .ph"),this.streakEl=o(".uk-streak"),this.streakN=o(".uk-streak .sn"),this.pops=[...s.querySelectorAll(".uk-pop")],this.compassEl=o(".uk-compass"),this.compassTxt=o(".uk-compass .cs"),this.sunG=o(".sun"),this.bandG=o(".bandg"),this.zifDot=o(".zif"),this.abEl=o(".uk-ab"),this.hintEl=o(".uk-hint"),this.hintIc=o(".uk-hint .hi"),this.hintTx=o(".uk-hint p"),this.hand=o(".uk-hand"),this.gustEl=o(".uk-gust"),this.toastEl=o(".uk-toast"),this.titleCard=o(".uk-card-title"),this.loreEl=o(".uk-lore"),this.loreTx=o(".uk-lore p"),this.skipEl=o(".uk-skip"),this.fadeEl=o(".uk-fade"),this.waitBtn=o(".uk-wait"),this._rel=null,this._hot=null,this._streak=0,this._pg=-1,this._pi=0,this._pk=!1,this._rolls=[],s.addEventListener("click",h=>{let d=h.target.closest("[data-a]");if(d){h.stopPropagation(),e.action(d.dataset.a);return}let u=h.target.closest("[data-t]");u&&(h.stopPropagation(),e.toggle(u.dataset.t))});let c=this.waitBtn,n=h=>{h.preventDefault(),h.stopPropagation();try{c.setPointerCapture(h.pointerId)}catch{}c.classList.add("dn"),e.wait(!0)},r=()=>{c.classList.remove("dn"),e.wait(!1)};c.addEventListener("pointerdown",n),c.addEventListener("pointerup",r),c.addEventListener("pointercancel",r),c.addEventListener("lostpointercapture",r)}show(t){for(let[e,s]of Object.entries(this.scr))s.classList.toggle("on",e===t);t!=="complete"&&t!=="ending"&&this._stopRolls()}hudOn(t){this.hud.classList.toggle("on",t)}setLevel(t){this.lk.textContent=t.kicker,this.lt.textContent=t.title,this.hud.dataset.season=t.season||"",this.streak(0),this._pg=-1,this.progress(0),this.hud.classList.remove("pg")}setDrops(t,e,s){this.dt.textContent=`${t}/${e}`,this.dp.style.display=e?"":"none",this.dp.classList.toggle("full",e>0&&t>=e),(s==="pop"||s==="bad")&&(this._dpk=!this._dpk,this.dp.classList.remove("pop0","pop1","bad0","bad1"),this.dp.classList.add(`${s}${this._dpk?0:1}`))}compass(t,e){let s=Math.round(t*180/Math.PI*2)/2;s!==this._rel&&(this._rel=s,this.sunG.setAttribute("transform",`rotate(${s})`),this.bandG.setAttribute("transform",`rotate(${s+180})`)),e=!!e,e!==this._hot&&(this._hot=e,this.compassEl.classList.toggle("hot",e),this.compassTxt.textContent=e?"I\u015F\u0131kta!":"G\xF6lgede")}lockArc(t,e){let s=this.$(".uk-compass .win");if(t==null){this._arc&&s.setAttribute("d",""),this._arc=null;return}let i=`${t.toFixed(2)}:${e.toFixed(2)}`;if(i===this._arc)return;this._arc=i;let a=53,o=n=>`${(-a*Math.sin(n)).toFixed(1)} ${(a*Math.cos(n)).toFixed(1)}`,c=e-t>Math.PI?1:0;s.setAttribute("d",`M ${o(t)} A ${a} ${a} 0 ${c} 1 ${o(e)}`)}hint(t){if(!t){this._hint!==null&&(this.hintEl.classList.remove("on"),this.hand.classList.remove("on")),this._hint=null;return}if(this._hint===t)return;this._hint=t;let[e,s]=Hi[t]||["sun",t];this.hintIc.innerHTML=K[e]||K.sun,this.hintTx.innerHTML=s,this.hintEl.classList.add("on"),this.hand.classList.toggle("on",t==="drag")}gust(t){t=!!t,t!==this._gust&&(this._gust=t,this.gustEl.classList.toggle("on",t),this.hud.classList.toggle("gst",t))}streak(t){if(t=Math.max(0,t|0),t===this._streak)return;let e=this._streak;if(this._streak=t,!t){this.streakEl.classList.remove("on");return}this.streakN.textContent=`\xD7${t}`,this.streakEl.classList.add("on"),this.streakEl.classList.toggle("hot",t>=5),t>e&&(this._sk=!this._sk,this.streakEl.classList.toggle("p0",this._sk),this.streakEl.classList.toggle("p1",!this._sk))}pop(t,e="good"){if(!t)return;let s=performance.now();if(t===this._popT&&s-this._popAt<300)return;this._popT=t,this._popAt=s,this._pi=(this._pi+1)%this.pops.length,this._pk=!this._pk;let i=this.pops[this._pi];i.textContent=t,i.className=`uk-pop ${e==="bad"||e==="gold"?e:"good"} ${this._pk?"a":"b"}`}progress(t){let e=Math.round(Math.min(1,Math.max(0,+t||0))*300)/300;e!==this._pg&&(this._pg=e,e>0&&this.hud.classList.add("pg"),this.pgF.style.transform=`scaleX(${e})`,this.pgH.style.transform=`translateX(${(e*100).toFixed(2)}%)`)}ability(t,e){let s=this.abEl;if(!e){this._abKey&&s.classList.remove("on"),this._abKey=null;return}let i=Math.max(0,Math.min(4,e.count|0)),a=`${t}:${i}:${e.ready?1:0}:${e.active?1:0}`;if(a!==this._abKey){if(t!==this._abId){this._abId=t;let o=Ai[t]||{icon:K.gem,label:""};s.dataset.a=`ability:${t}`,s.querySelector(".ai").innerHTML=o.icon,s.querySelector(".al").textContent=o.label}this._abKey=a,s.querySelectorAll(".pp i").forEach((o,c)=>o.classList.toggle("on",c<i)),s.classList.toggle("ready",!!e.ready&&!e.active),s.classList.toggle("active",!!e.active),s.classList.add("on")}}toast(t,e=2200){this.toastEl.textContent=t,this.toastEl.classList.add("on"),clearTimeout(this._toastT),this._toastT=setTimeout(()=>this.toastEl.classList.remove("on"),e)}card(t,e,s){if(!t){this.titleCard.classList.remove("on");return}this.titleCard.querySelector("small").textContent=t,this.titleCard.querySelector("b").textContent=e,this.titleCard.querySelector("span").textContent=s||"",this.titleCard.classList.add("on")}lore(t){if(!t){this.loreEl.classList.remove("on"),this._lore=null;return}t!==this._lore&&(this._lore=t,this.loreTx.textContent=t,this._lk=!this._lk,this.loreTx.className=this._lk?"a":"b",this.loreEl.classList.add("on"))}skip(t){this.skipEl.classList.toggle("on",t)}fade(t){this.fadeEl.classList.toggle("on",t)}renderLevels(t,e){let s=e.stars||[],i=[];t.forEach((r,h)=>{let d=i[i.length-1];(!d||d.s!==r.season)&&i.push(d={s:r.season,items:[]}),d.items.push(h)});let a=(s[e.unlocked]||0)===0?e.unlocked:-1,o=r=>{let h=t[r],d=r>e.unlocked,u=s[r]||0,g=d?"lock":r===a?"cur":u?"done":"open",p=d?K.lock:g==="cur"?K.play:g==="done"?K.check:`<b>${r+1}</b>`,m=g==="cur"?'<span class="go">Oyna</span>':d?"":`<span class="st">${[0,1,2].map(v=>`<i class="${v<u?"on":""}">${K.star}</i>`).join("")}</span>`;return`<button class="uk-lv uk-tap ${g}" data-a="lv:${r}" data-s="${h.season}">
				<span class="no">${p}</span>
				<span class="cd"><span class="tx"><small>${r+1}. b\xF6l\xFCm${h.finale?" \xB7 son":""}</small><b>${h.title}</b></span>${m}</span></button>`};this.$(".uk-list").innerHTML=i.map((r,h)=>{let d=Ci[r.s]||{name:r.s,sub:"",icon:K.sun},u=r.items.reduce((p,m)=>p+(s[m]||0),0);return`<section class="uk-ssn${r.items[0]<=e.unlocked?"":" lock"}" data-s="${r.s}" style="--d:${h*70}ms">
					<header><i class="ic">${d.icon}</i><span class="nm"><b>${d.name}</b><span>${d.sub}</span></span><em>${K.star}${u}/${r.items.length*3}</em></header>
					${r.items.map(o).join("")}</section>`}).join(""),this.$(".dsum").textContent=String(e.dust||0);let c=this.$(".uk-list"),n=c.querySelector(".uk-lv.cur");n&&c.scrollHeight>c.clientHeight+4&&(c.scrollTop=Math.max(0,n.offsetTop-c.clientHeight*.45))}_roll(t,e,s,i){let a={t:0,r:0};if(this._rolls.push(a),!e||Li()){t.textContent=i(e||0);return}t.textContent=i(0),a.t=setTimeout(()=>{let o=performance.now(),c=-1,n=r=>{let h=Math.min(1,(r-o)/1e3),d=Math.round(e*(1-Math.pow(1-h,3)));d!==c&&(c=d,t.textContent=i(d)),h<1?a.r=requestAnimationFrame(n):t.parentNode.classList.add("done")};a.r=requestAnimationFrame(n)},s)}_stopRolls(){for(let t of this._rolls)clearTimeout(t.t),cancelAnimationFrame(t.r);this._rolls.length=0}showComplete({title:t,kicker:e,stars:s,dust:i,last:a}){this.card(null),this._stopRolls(),this.$(".ck").textContent=e,this.$(".ct").textContent=t,this.$(".cs2").textContent=a?"Son b\xF6l\xFCm":"",this.$(".cs2").style.display=a?"":"none";let o=s.filter(Boolean).length;this.$(".ban").textContent=o===3?"Kusursuz g\xF6lge!":"G\xF6lge korundu",this._starT&&this._starT.forEach(clearTimeout),this._starT=[],[".s0",".s1",".s2"].forEach((n,r)=>{let h=this.$(n);h.classList.remove("on"),s[r]&&this._starT.push(setTimeout(()=>h.classList.add("on"),450+r*300))});let c=this.$(".cd");c.classList.remove("done"),c.style.display=i?"":"none",this._roll(this.$(".cdn"),i,450+3*300,n=>`+${n}`),this.$("[data-s=complete] [data-a=next]").style.display=a?"none":"",this.show("complete")}showFail({progress:t,mercy:e}){this.card(null);let s=Math.round(Math.min(1,Math.max(0,t))*100);this.$(".fs").innerHTML=s>=2?`Yolun <b>%${s}\u2019${Di(s)}</b> y\xFCr\xFCd\xFCn. Biraz daha!`:"G\xFCne\u015Fi g\xF6vdenin arkas\u0131nda tut.";let i=this.$(".fp"),a=this.$(".fz");i.style.transition=a.style.transition="none",i.style.transform="scaleX(0)",a.style.transform="translateX(0%)",i.offsetWidth,i.style.transition=a.style.transition="",i.style.transform=`scaleX(${s/100})`,a.style.transform=`translateX(${s}%)`,this.$(".fm").style.display=e?"":"none",this.show("fail")}showEnding(t){this.card(null),this._stopRolls();let e=this.$(".ed");e.classList.remove("done"),e.style.display=t?"":"none",this._roll(this.$(".edn"),t,900,s=>`${s}`),this.show("ending")}setToggles(t){let e=(s,i,a)=>{let o=this.$(`[data-t=${s}] b`);o&&(o.textContent=i,o.parentNode.classList.toggle("off",!a))};e("sound",t.sound?"A\xE7\u0131k":"Kapal\u0131",t.sound),e("haptics",t.haptics?"A\xE7\u0131k":"Kapal\u0131",t.haptics),e("quality",{auto:"Otomatik",0:"D\xFC\u015F\xFCk",1:"Orta",2:"Y\xFCksek"}[t.quality]||"Otomatik",!0),e("power",{auto:"Otomatik",saver:"Tasarruf",performance:"Performans"}[t.power]||"Otomatik",!0)}setPlayLabel(t){this.$("[data-a=play] b").textContent=t}};var Js=[0,2,4,7,9,12,14,16,19,21],Oe=class{constructor(t={}){this.hooks=t,this.ctx=null,this.on=!0,this.season="spring",this._dropN=0,this._birdT=4}unlock(){if(this.ctx){this.ctx.state==="suspended"&&this.ctx.resume();return}let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let e=new t;this.ctx=e,this.master=e.createGain(),this.master.gain.value=this.on?.9:0,this.master.connect(e.destination);let s=e.sampleRate*2,i=e.createBuffer(1,s,e.sampleRate),a=i.getChannelData(0);for(let o=0;o<s;o++)a[o]=Math.random()*2-1;this.noise=i,this.wind=this._loopNoise("lowpass",520,.6),this.wind.g.gain.value=0,this.sizz=this._loopNoise("highpass",3200,.7),this.sizz.g.gain.value=0}_loopNoise(t,e,s){let i=this.ctx,a=i.createBufferSource();a.buffer=this.noise,a.loop=!0;let o=i.createBiquadFilter();o.type=t,o.frequency.value=e,o.Q.value=s;let c=i.createGain();return a.connect(o),o.connect(c),c.connect(this.master),a.start(),{src:a,f:o,g:c}}setOn(t){this.on=t,this.master&&this.master.gain.setTargetAtTime(t?.9:0,this.ctx.currentTime,.05)}_host(t,e){return this.hooks.sfx?this.hooks.sfx(t,e)===!0:!1}_tone(t,e,s,i,a="sine",o=0){let c=this.ctx,n=c.createOscillator();n.type=a,n.frequency.value=t;let r=c.createGain();r.gain.setValueAtTime(0,e),r.gain.linearRampToValueAtTime(i,e+.008),r.gain.exponentialRampToValueAtTime(1e-4,e+s),n.connect(r),r.connect(this.master),n.start(e),n.stop(e+s+.05),o&&this._tone(t*o,e,s*.6,i*.35,"sine",0)}_burst(t,e,s,i,a="bandpass"){let o=this.ctx,c=o.createBufferSource();c.buffer=this.noise;let n=o.createBiquadFilter();n.type=a,n.frequency.value=s,n.Q.value=1.2;let r=o.createGain();r.gain.setValueAtTime(i,t),r.gain.exponentialRampToValueAtTime(1e-4,t+e),c.connect(n),n.connect(r),r.connect(this.master),c.start(t,Math.random()),c.stop(t+e+.02)}step(){this._host("step")||!this.ctx||this._burst(this.ctx.currentTime,.05,900+Math.random()*500,.05)}drop(){if(this._host("drop")||!this.ctx)return;let t=this.ctx.currentTime,e=Js[Math.min(Js.length-1,this._dropN++)],s=660*Math.pow(2,e/12);this._tone(s,t,1.3,.16,"sine",2.76),this._tone(s*2,t+.07,.9,.06,"triangle")}resetDrops(){this._dropN=0}dropLost(){if(this._host("dropLost")||!this.ctx)return;let t=this.ctx.currentTime;this._burst(t,.35,2600,.12,"highpass"),this._tone(420,t,.4,.06,"triangle"),this._tone(300,t+.1,.5,.05,"triangle")}ui(){this._host("ui")||!this.ctx||this._tone(880,this.ctx.currentTime,.12,.05,"sine")}win(){if(this._host("win")||!this.ctx)return;let t=this.ctx.currentTime;[0,4,7,12,16].forEach((e,s)=>this._tone(523*Math.pow(2,e/12),t+s*.11,1.6,.11,"sine",2)),this._tone(261.6,t,2.4,.06,"triangle")}unlockOpen(){if(this._host("unlock")||!this.ctx)return;let t=this.ctx.currentTime;[0,7,12,16].forEach((e,s)=>this._tone(392*Math.pow(2,e/12),t+s*.05,1.4,.07,"sine",2))}fail(){if(this._host("fail")||!this.ctx)return;let t=this.ctx.currentTime;this._burst(t,.9,1800,.14,"highpass"),[7,4,0].forEach((e,s)=>this._tone(392*Math.pow(2,e/12),t+.15+s*.16,.7,.07,"triangle"))}tick(t,e,s,i){if(!this.ctx||!this.on)return;let a=this.ctx.currentTime;this.sizz.g.gain.setTargetAtTime(i?e*.09:0,a,.05),this.wind.g.gain.setTargetAtTime(.025+s*.05,a,.3),this.wind.f.frequency.setTargetAtTime(380+s*500,a,.3),(this.season==="spring"||this.season==="summer")&&i&&(this._birdT-=t,this._birdT<0&&(this._birdT=3+Math.random()*6,this._bird(a)))}_bird(t){let e=this.ctx,s=2+(Math.random()*3|0),i=2200+Math.random()*1400;for(let a=0;a<s;a++){let o=e.createOscillator(),c=e.createGain(),n=t+a*.13;o.frequency.setValueAtTime(i,n),o.frequency.exponentialRampToValueAtTime(i*1.35,n+.05),o.frequency.exponentialRampToValueAtTime(i*.9,n+.09),c.gain.setValueAtTime(0,n),c.gain.linearRampToValueAtTime(.022,n+.01),c.gain.exponentialRampToValueAtTime(1e-4,n+.1),o.connect(c),c.connect(this.master),o.start(n),o.stop(n+.12)}}suspend(){this.ctx&&this.ctx.state==="running"&&this.ctx.suspend()}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}};var Ne=class{constructor({container:t,store:e,hooks:s={},quality:i="auto",power:a="auto"}){this.container=t,this.store=e,this.hooks=s,this.qualityOpt=i,this.power=a,this.running=!1,this.visible=!0,this.time=0,this.sunAz=0,this.elev=null,this.idle=!1,this._raf=0,this._last=0,this._prev=0,this._dirty=!0,this.V3=de.Vector3}async init(){let t=document.createElement("canvas");t.className="uk-canvas",this.container.appendChild(t),this.canvas=t;let e=this.store.get("settings")||{},s=this.qualityOpt!=="auto"?this.qualityOpt:e.quality??"auto",i=s==="auto"?null:Number(s),a=ls(t,i);this.renderer=a.renderer,this.tier=a.tier,this.info=a,this.gov=new we({tier:a.tier.id,gpu:a.gpu,store:this.store,power:e.power||this.power}),this.gov.onScale=()=>this.resize(),this.gov.onBattery=c=>{this.ui&&this.ui.toast(c?"Pil koruma a\xE7\u0131k: daha az kare, daha serin telefon":"Pil koruma kapand\u0131")};let o=cs();this.G=o,ps(o,a.tier.shadowTaps),this.shadow=new Me(o,a.tier.shadowSize),this.world=Us({G:o,tier:a.tier,shadow:this.shadow,aniso:a.aniso,msaa:a.msaa}),this.scene=this.world.scene,this.rig=new Ce,this.focus=new de.Vector3(0,30,0),this.sfx=new Oe(this.hooks),this.ui=new Be(this.container,{action:c=>this.game.action(c),toggle:c=>this.game.toggle(c),wait:c=>this.game.wait(c)}),this._onResize=()=>this.resize(),window.addEventListener("resize",this._onResize),this._onVis=()=>{this.visible=!document.hidden,this.visible?(this.gov.reset(),this._last=0,this._prev=0,this.wake(),this.sfx.resume()):(this.sfx.suspend(),this.game&&this.game.pause())},document.addEventListener("visibilitychange",this._onVis),this.resize(),this.game=new We(this,this.ui,this.sfx),this.rig.pos.set(70,32,60),this.rig.look.set(0,27,0),this.rig.mode="manual",this.rig.update(0),await this.warmup()}async warmup(){let t=this.renderer,e=[];this.scene.traverse(s=>{s.isMesh&&!s.visible&&(e.push(s),s.visible=!0)});try{t.compileAsync?(await t.compileAsync(this.scene,this.rig.cam),await t.compileAsync(this.shadow.scene,this.shadow.cam)):(t.compile(this.scene,this.rig.cam),t.compile(this.shadow.scene,this.shadow.cam))}catch{}this.renderFrame();for(let s of e)s.visible=!1}resize(){let t=Math.max(1,this.container.clientWidth||window.innerWidth),e=Math.max(1,this.container.clientHeight||window.innerHeight),s=this.gov.pixelRatio(t,e);this.renderer.setPixelRatio(s),this.renderer.setSize(t,e,!1),this.canvas.style.width=t+"px",this.canvas.style.height=e+"px";let i=this.renderer.getDrawingBufferSize(new de.Vector2);this.G.uRes.value.x=i.x,this.G.uRes.value.y=i.y,this.rig.resize(t,e),this.wake()}wake(){this.idle=!1,this._dirty=!0}exit(){this.hooks.onExit?this.hooks.onExit():this.game.goTitle()}renderFrame(){let t=this.G;t.uTime.value=this.time;let[e,s,i]=this.game?this.game.envState():["spring","spring",0];hs(t,Ke[e],Ke[s],i,this.sunAz,this.elev),t.uWind.value.set(zt.dx,zt.dz,zt.str,zt.gust),t.uFocus.value.set(this.focus.x,this.focus.y+.5,this.focus.z,1.7);let a=Math.min(1,t.uNight.value*1.4+Math.max(0,.3-t.uSunDir.value.y)*1.5);this.world.lanternGlow.mat.uniforms.uK.value=.45+a*1.5,this.world.mats.glass.uniforms.uK.value=1.6+a*2.2;let o=this.world,c=Te(this.focus.y,this._sw||(this._sw=[0,0,0,0]));o.particles.u.uCenter.value.copy(this.rig.look),o.particles.u.uSeason.value.set(c[0],c[1],c[2],c[3]),o.particles.u.uFire.value=a*(this.focus.y<14?1:.3),o.shafts.u.uCenter.value.copy(this.focus),o.birds.u.uCenterY.value=this.focus.y,this.shadow.place(this.focus,t.uSunDir.value),this.shadow.render(this.renderer),this.renderer.render(this.scene,this.rig.cam),this._dirty=!1}start(){if(this.running)return;this.running=!0,this._last=0,this._prev=0;let t=e=>{if(!this.running||(this._raf=requestAnimationFrame(t),!this.visible))return;let s=this._last?e-this._last:16.7;if(this._last=e,this.idle&&!this._dirty){this._prev=e;return}this.gov.tick(e,s)&&this.frame(e)};this._raf=requestAnimationFrame(t)}stop(){this.running=!1,cancelAnimationFrame(this._raf),this.sfx.suspend()}frame(t){let e=Math.min(.05,this._prev?(t-this._prev)/1e3:.016666666666666666);this._prev=t,this.time+=e,this.game.update(e,this.time),this.rig.update(e),this.renderFrame()}destroy(){this.stop(),this.game.destroy(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVis),this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&t.material.dispose()});for(let t of Object.values(this.world.tex))t.dispose();this.shadow.dispose(),this.renderer.dispose(),this.canvas.remove(),this.ui.el.remove()}stats(){let t=this.renderer.info;return{calls:t.render.calls,tris:t.render.triangles,geo:t.memory.geometries,tex:t.memory.textures,programs:t.programs.length,tier:this.tier.name,gpu:this.info.gpu,pr:this.renderer.getPixelRatio()}}debugView({level:t=0,s:e=null,sunAz:s=null,rel:i=null,camDist:a=1,gust:o=0,zifir:c=!0}={}){let n=this.game;n.startLevel(t,{retry:!0}),n.s=e==null?n.s0+4:n.s0+e*(n.s1-n.s0),n._set("play"),this.ui.card(null),this.ui.hint(null),this.ui.hudOn(!0);let r=this.world.curve.sample(n.s,{}),h=Math.atan2(r.z,r.x);n.sunAz=n.sunTarget=s??h+(i??Math.PI),n.zifir.g.visible=c,n.hold=!0,n.envFrom=n.envTo=n.level.season,n.envT=1,this.rig.zoom=a,this.rig.mode="follow";for(let d=0;d<4;d++)this.time+=.016,n.update(.016,this.time),zt.gust=o,this.rig.snap(),this.rig.update(0);this.renderFrame()}debugCam(t,e,s="spring",i=.5){this.game.envFrom=this.game.envTo=s,this.game.envT=1,this.sunAz=i,this.elev=null,this.rig.pos.copy(t),this.rig.look.copy(e),this.rig.mode="manual",this.rig.update(0),this.focus.copy(e),this.renderFrame()}debugTick(t,e=30){let s=1/e;for(let i=0;i<t;i+=s)this.time+=s,this.game.update(s,this.time),this.rig.update(s);this.renderFrame()}debugSim({level:t=0,policy:e="smart",maxT:s=120,dt:i=1/30}={}){let a=this.game;a.startLevel(t,{retry:!0}),a._set("play"),a.dragged=!0,this.rig.mode="follow";let o=0,c=0,n=new de.Vector3,r=a.tester,h=0;for(;o<s&&(a.state==="play"||a.state==="enter");){a.state==="enter"&&a._set("play");let d=this.world.curve.sample(a.s,{}),u=Math.atan2(d.z,d.x);if(e==="behind")a.sunTarget=u+Math.PI;else if(e==="smart"&&o>=c&&a.locks.pending(a.s)&&a.speed<.1){c=o+.25;let g=a.locks.pending(a.s),p=this.world.curve.sample(a.s,{}),m=a.elev*Math.PI/180,v=null,x=1e9;for(let f=0;f<180;f++){let y=a.sunAz+(f-90)/90*Math.PI;n.set(Math.cos(m)*Math.cos(y),Math.sin(m),Math.cos(m)*Math.sin(y));let b=0;for(let F of[.48,.86,.36])(!r.blocked(p.x,p.y+F,p.z,n)||a.beams.testPoint(n,p.x,p.y+F,p.z,r))&&b++;if(b)continue;let M=0;for(let F of[1,1.7,.8])r.blocked(g.x,g.y+F,g.z,n)||M++;let C=Math.abs(y-a.sunAz)-M*.5;M&&C<x&&(x=C,v=y)}v!=null&&(a.sunTarget=v),a.hold=!1}else if(e==="smart"&&o>=c){c=o+.2;let g=a.sunTarget,p=1e9;for(let m=0;m<32;m++){let v=a.sunAz+(m-16)/16*Math.PI;n.set(Math.cos(a.elev*Math.PI/180)*Math.cos(v),Math.sin(a.elev*Math.PI/180),Math.cos(a.elev*Math.PI/180)*Math.sin(v));let x=0;for(let y of[0,.8]){let b=this.world.curve.sample(a.s+y,{});(!r.blocked(b.x,b.y+.5,b.z,n)||a.beams.testPoint(n,b.x,b.y+.45,b.z,r))&&(x+=y===0?3:1)}let f=a.locks.pending(a.s);if(f){let y=0;for(let b of[1,1.7])r.blocked(f.x,f.y+b,f.z,n)||y++;x+=(2-y)*.9}for(let y of a.drops.list)y.state!=="idle"||y.s-a.s>9||y.s<a.s-1||(!r.blocked(y.x,y.y+.1,y.z,n)||a.beams.testPoint(n,y.x,y.y,y.z,r,.35))&&(x+=.6);x+=Math.abs(v-a.sunAz)*.05,x<p&&(p=x,g=v)}a.sunTarget=g,a.hold=p>=3&&!a.locks.pending(a.s)}this.time+=i,o+=i,a.update(i,this.time),a.expo>.05&&(h+=i)}return this.rig.update(0),this.renderFrame(),{level:t,policy:e,state:a.state,time:+o.toFixed(1),progress:+((a.s-a.s0)/(a.s1-a.s0)).toFixed(2),minMeter:+a.minMeter.toFixed(2),drops:`${a.got}/${a.drops.total}`,lost:a.lostN,litTime:+h.toFixed(1)}}debugAction(t){this.game.action(t),this.renderFrame()}};function ti(l,t="ulukayin.v1"){if(l&&typeof l.get=="function"&&typeof l.set=="function")return l;let e={};try{e=JSON.parse(localStorage.getItem(t)||"{}")||{}}catch{e={}}return{get:s=>e[s],set:(s,i)=>{e[s]=i;try{localStorage.setItem(t,JSON.stringify(e))}catch{}}}}async function Ko(l={}){let t=ti(l.store),e=document.createElement("div");e.className="uk-root",e.style.cssText="position:fixed;inset:0;z-index:50;overflow:hidden;background:#16122a;touch-action:none;",(l.container||document.body).appendChild(e);let s=new Ne({container:e,store:t,hooks:l.hooks||{},quality:l.quality||"auto",power:l.power||"auto"});return await s.init(),{app:s,open(){e.style.display="",s.start()},close(){s.stop(),e.style.display="none"},destroy(){s.destroy(),e.remove()}}}export{Ko as createUluKayin};
