import*as $e from"three";import*as De from"three";var L=Math.PI*2,At=(r,t,e)=>r<t?t:r>e?e:r,ji=r=>r<0?0:r>1?1:r,Y=(r,t,e)=>r+(t-r)*e;var St=(r,t,e)=>{let s=ji((e-r)/(t-r));return s*s*(3-2*s)},Tt=(r,t,e,s)=>t+(r-t)*Math.exp(-e*s),Je=r=>(r=(r+Math.PI)%L,(r<0?r+L:r)-Math.PI);var Ss=r=>r<.5?4*r*r*r:1-Math.pow(-2*r+2,3)/2,Es=r=>1-Math.pow(1-r,3);function Gt(r){let t=r>>>0,e=()=>{t=t+1831565813>>>0;let s=t;return s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296};return e.range=(s,a)=>s+(a-s)*e(),e.pick=s=>s[e()*s.length|0],e.sign=()=>e()<.5?-1:1,e}function ce(r){let t=Math.floor(r),e=r-t,s=i=>{let o=Math.sin(i*127.1)*43758.5453;return o-Math.floor(o)},a=e*e*(3-2*e);return Y(s(t),s(t+1),a)*2-1}var Rs=[{id:0,name:"D\xFC\u015F\xFCk",maxPixels:115e4,maxDpr:2,minScale:.62,shadowSize:1024,shadowTaps:1,particles:150,leafDensity:.62,clouds:7,birds:8,shafts:3},{id:1,name:"Orta",maxPixels:19e5,maxDpr:2.4,minScale:.62,shadowSize:2048,shadowTaps:4,particles:340,leafDensity:.85,clouds:11,birds:18,shafts:5},{id:2,name:"Y\xFCksek",maxPixels:3e6,maxDpr:3,minScale:.62,shadowSize:2048,shadowTaps:4,particles:640,leafDensity:1,clouds:16,birds:30,shafts:6}];function Xs(r){let t="";try{let o=r.getExtension("WEBGL_debug_renderer_info");t=String(r.getParameter(o?o.UNMASKED_RENDERER_WEBGL:r.RENDERER)||"")}catch{t=""}let e=t.toLowerCase(),s=matchMedia("(pointer: coarse)").matches||/android|iphone|ipad/i.test(navigator.userAgent),a=s?0:1;/swiftshader|llvmpipe|software|microsoft basic/.test(e)||/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(e)?a=0:/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(e)?a=1:/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(e)||/apple/.test(e)||!s&&/nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(e)?a=2:!s&&/intel/.test(e)&&(a=1);let i=navigator.deviceMemory||0;return i&&i<=2?a=0:i&&i<=4&&(a=Math.min(a,1)),{tier:a,gpu:t,mobile:s}}var ts=class{constructor({tier:t,gpu:e,store:s,power:a="auto"}){this.T=Rs[t],this.gpu=e,this.store=s,this.power=a,this.battery={saver:!1,level:1,charging:!0};let i=s.get("perf")||{},o=i.gpu===e;this.scale=o?At(i.scale??1,this.T.minScale,1):1,this.cap=o&&i.cap===30?30:60,this.ceil=o?i.ceil??1:1,this.half=o?!!i.half:t===0,this.vsync=16.67,this._deltas=new Float32Array(24),this._di=0,this._count=0,this._frame=0,this._lastRender=0,this._ema=0,this._slow=0,this._good=0,this._cool=0,this._probe=null,this._ups=0,this._dirty=!1,this.onScale=null,this.menu=!1,this._watchBattery()}get targetFps(){return this.menu||this.power==="saver"||this.power==="auto"&&this.battery.saver?30:this.cap}get maxScale(){return this.power==="saver"||this.power==="auto"&&this.battery.saver?Math.min(this.ceil,.8):this.ceil}get effScale(){return Math.min(this.scale,this.maxScale)}tick(t,e){e>4&&e<40&&(this._deltas[this._di]=e,this._di=(this._di+1)%this._deltas.length,this._count++,this._count%24===0&&(this.vsync=Yi(this._deltas)));let s=1e3/this.targetFps,a=this._divisor(s);if(this._frame++,this._frame<a)return!1;this._frame=0;let i=this._lastRender?t-this._lastRender:s;return this._lastRender=t,this._adapt(t,i,a*this.vsync),!0}_divisor(t){let e=t/this.vsync;return Math.max(1,this.half?Math.ceil(e-.05):Math.round(e-.15))}reset(){this._lastRender=0,this._frame=0,this._slow=0,this._good=0}_adapt(t,e,s){if(e>s*4)return;this._ema=this._ema?this._ema+(e-this._ema)*.08:e;let a=e/1e3;if(t<this._cool)return;let i=this._ema>s*1.22;if(i?(this._slow+=a,this._good=0):(this._slow=Math.max(0,this._slow-a*.5),this._good+=a),this._probe&&i&&this._slow>1.2){this.ceil=this._probe.from,this._setScale(this._probe.from),this._probe=null,this._cool=t+4e3,this._slow=0,this._dirty=!0;return}if(this._probe&&t-this._probe.t>6e3&&(this._probe=null,this._dirty=!0),this._slow>1.6){this._slow=0,this._cool=t+2200;let o=this.effScale;o>.81?this._setScale(Math.max(.8,o-.1)):!this.half&&this.vsync<14?this.half=!0:o>this.T.minScale+.01?this._setScale(Math.max(this.T.minScale,o-.1)):this.cap===60&&(this.cap=30),this._dirty=!0}else this._good>9&&this._ups<3&&(this._good=0,this.cap===30&&this.power!=="saver"&&!this.battery.saver&&this.effScale>=.8?(this.cap=60,this._ups++,this._cool=t+3e3):this.scale<this.maxScale-.01&&(this._probe={from:this.scale,t},this._setScale(Math.min(this.maxScale,this.scale+.08)),this._ups++,this._cool=t+2500));this._dirty&&t>this._cool&&this.save()}_setScale(t){this.scale=Math.round(t*100)/100,this.onScale&&this.onScale()}save(){this._dirty=!1,this.store.set("perf",{gpu:this.gpu,scale:this.scale,cap:this.cap,ceil:this.ceil,half:this.half})}_watchBattery(){navigator.getBattery&&navigator.getBattery().then(t=>{let e=()=>{this.battery.level=t.level,this.battery.charging=t.charging;let s=this.battery.saver;this.battery.saver=!t.charging&&(s?t.level<=.25:t.level<=.2),s!==this.battery.saver&&this.onBattery&&this.onBattery(this.battery.saver)};e(),t.addEventListener("levelchange",e),t.addEventListener("chargingchange",e)}).catch(()=>{})}pixelRatio(t,e){let s=Math.min(window.devicePixelRatio||1,this.T.maxDpr);return t*e*s*s>this.T.maxPixels&&(s=Math.sqrt(this.T.maxPixels/(t*e))),Math.max(.75,s*this.effScale)}};function Yi(r){let t=Array.from(r).filter(e=>e>0).sort((e,s)=>e-s);return t.length?t[t.length>>1]:16.67}function js(r,t){let e={tier:0,gpu:"",mobile:!0};try{let c=document.createElement("canvas").getContext("webgl2");if(c){e=Xs(c);let p=c.getExtension("WEBGL_lose_context");p&&p.loseContext()}}catch{}t!=null&&t>=0&&t<=2&&(e.tier=t);let s=/swiftshader|llvmpipe/i.test(e.gpu),a=new De.WebGLRenderer({canvas:r,antialias:!s,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1});a.outputColorSpace=De.LinearSRGBColorSpace,a.toneMapping=De.NoToneMapping,a.setClearColor(1446442,1),a.sortObjects=!0,a.shadowMap.enabled=!1;let o=!!(a.getContext().getContextAttributes()||{}).antialias,n=a.capabilities.getMaxAnisotropy(),l=Rs[e.tier],h=Math.min(n,l.id>=1?8:4);return{renderer:a,tier:l,gpu:e.gpu,mobile:e.mobile,msaa:o,aniso:h}}import*as vt from"three";var G=(r,t=1)=>new vt.Color(r).multiplyScalar(t);function Ys(){return{uTime:{value:0},uSunDir:{value:new vt.Vector3(0,1,0)},uSunCol:{value:new vt.Color},uSkyTop:{value:new vt.Color},uSkyHor:{value:new vt.Color},uGround:{value:new vt.Color},uShadeTint:{value:new vt.Color},uFogCol:{value:new vt.Color},uFogSun:{value:new vt.Color},uFogP:{value:new vt.Vector4(.004,0,.03,6)},uRes:{value:new vt.Vector3(1,1,.3)},uLift:{value:new vt.Color(0,0,0)},uGain:{value:new vt.Color(1,1,1)},uGrade:{value:new vt.Vector4(1,1,1,1.2/255)},uWind:{value:new vt.Vector4(1,0,.3,0)},uFocus:{value:new vt.Vector4(0,-999,0,1.6)},uDanger:{value:0},uShadowMap:{value:null},uShadowMat:{value:new vt.Matrix4},uShadowP:{value:new vt.Vector4(1/1024,.06,.0012,1)},uShadeFx:{value:new vt.Vector4(1,.3,.8,.6)},uTermCol:{value:new vt.Color},uInkCol:{value:new vt.Color},uVigCol:{value:new vt.Color},uAtmo:{value:new vt.Vector4(.006,.9,.5,.6)},uZenith:{value:new vt.Color},uSkyMid:{value:new vt.Color},uHorizon:{value:new vt.Color},uSunGlow:{value:new vt.Color},uSunDisc:{value:new vt.Color},uNight:{value:0},uCloudCol:{value:new vt.Color},uCloudShade:{value:new vt.Color}}}var As={spring:{elev:27,sun:G("#ffc9a0",2.25),zenith:G("#1c8fc4"),skyMid:G("#5fcfe0"),horizon:G("#ffcfb4"),sunGlow:G("#ffb08a",1.25),sunDisc:G("#fff4e4",1),skyTop:G("#98a8ff",.66),skyHor:G("#98b0ff",.6),ground:G("#ff98b0",.36),shade:G("#e8eeff",1),term:G("#ff8a50",1.6),ink:G("#c9d6ff",1),fog:G("#ffd2c0"),fogSun:G("#ffc49a",1.05),fogP:[.0024,4,.03,6],atmo:[1/210,.85,.55,.5],cloud:G("#fff0e8",1.15),cloudShade:G("#7f8fd6",.8),lift:G("#1a2a6a",.05),gain:G("#fff8f2"),grade:[1.2,1.08,1],vignette:.42,vig:G("#2b2a78"),shadeFx:[1,.8,1.3,.55],night:0},summer:{elev:58,sun:G("#fff0d0",2.45),zenith:G("#0d3fb8"),skyMid:G("#2f86e6"),horizon:G("#b4ecff"),sunGlow:G("#fff2c8",1.1),sunDisc:G("#ffffff",1),skyTop:G("#88a4ff",.68),skyHor:G("#a4b8f0",.62),ground:G("#a0d080",.3),shade:G("#e0e8ff",1),term:G("#ffc050",1.4),ink:G("#bfe0ff",1),fog:G("#bfeaff"),fogSun:G("#fff4d8",1.05),fogP:[.002,4,.032,8],atmo:[1/230,.8,.4,.35],cloud:G("#ffffff",1.25),cloudShade:G("#6f98e0",.85),lift:G("#06205a",.05),gain:G("#fbfdff"),grade:[1.24,1.1,1],vignette:.38,vig:G("#0d2a6e"),shadeFx:[.9,.7,1.2,.6],night:0},autumn:{elev:22,sun:G("#ffb868",2.5),zenith:G("#1d4f7c"),skyMid:G("#4f8fa8"),horizon:G("#ffb468"),sunGlow:G("#ff9a40",1.45),sunDisc:G("#fff0c8",1),skyTop:G("#8888f0",.5),skyHor:G("#9480ec",.42),ground:G("#ff8850",.32),shade:G("#f0eaff",1),term:G("#ff7a28",1.6),ink:G("#ffd6a8",.9),fog:G("#f2b27a"),fogSun:G("#ffaa58",1.15),fogP:[.0028,4,.028,6],atmo:[1/190,.85,.65,.6],cloud:G("#ffd8a6",1.15),cloudShade:G("#8a5c9c",.75),lift:G("#3a1040",.05),gain:G("#fff4e6"),grade:[1.22,1.1,1],vignette:.44,vig:G("#3a1450"),shadeFx:[.95,.8,1.4,.6],night:0},winter:{elev:8,sun:G("#ffb890",2.3),zenith:G("#231a66"),skyMid:G("#b0407f"),horizon:G("#ff9a58"),sunGlow:G("#ff7a48",1.6),sunDisc:G("#ffe0b8",1),skyTop:G("#a8bcff",1.05),skyHor:G("#98b0ff",.65),ground:G("#c090e0",.36),shade:G("#d0dcff",1),term:G("#ff6a6a",1.6),ink:G("#d8e6ff",1),fog:G("#c86a8a"),fogSun:G("#ff9468",1.2),fogP:[.003,4,.026,5],atmo:[1/200,.85,.7,.65],cloud:G("#ffb69a",1.05),cloudShade:G("#5a4aa8",.75),lift:G("#1a1050",.06),gain:G("#fff2ee"),grade:[1.2,1.08,1],vignette:.46,vig:G("#2a1260"),shadeFx:[1.15,.8,1.4,.6],night:.35},night:{elev:30,sun:G("#a6bcff",.5),zenith:G("#050824"),skyMid:G("#141a52"),horizon:G("#3a3a86"),sunGlow:G("#8fa2ff",.6),sunDisc:G("#eef2ff",.7),skyTop:G("#4058c8",.22),skyHor:G("#3a46b0",.2),ground:G("#282868",.14),shade:G("#c0c8ff",1),term:G("#9a7aff",.8),ink:G("#e0e8ff",1.2),fog:G("#1e2060"),fogSun:G("#4a56b0",1),fogP:[.003,4,.026,6],atmo:[1/200,.85,.35,.2],cloud:G("#6a74c8",.42),cloudShade:G("#141440",.7),lift:G("#06082a",.08),gain:G("#e8ecff"),grade:[1.14,1.1,.95],vignette:.5,vig:G("#04041a"),shadeFx:[1.7,.9,.6,.6],night:1}},Zi=new vt.Color,Qi=new vt.Color;function Zs(r,t,e,s,a,i=null){let o=(c,p,u)=>c.copy(Zi.copy(p).lerp(Qi.copy(u),s)),n=(c,p)=>c+(p-c)*s,l=vt.MathUtils.degToRad(i??n(t.elev,e.elev));r.uSunDir.value.set(Math.cos(l)*Math.cos(a),Math.sin(l),Math.cos(l)*Math.sin(a)),o(r.uSunCol.value,t.sun,e.sun),o(r.uZenith.value,t.zenith,e.zenith),o(r.uSkyMid.value,t.skyMid,e.skyMid),o(r.uHorizon.value,t.horizon,e.horizon),o(r.uSunGlow.value,t.sunGlow,e.sunGlow),o(r.uSunDisc.value,t.sunDisc,e.sunDisc),o(r.uSkyTop.value,t.skyTop,e.skyTop),o(r.uSkyHor.value,t.skyHor,e.skyHor),o(r.uGround.value,t.ground,e.ground),o(r.uShadeTint.value,t.shade,e.shade),o(r.uTermCol.value,t.term,e.term),o(r.uInkCol.value,t.ink,e.ink),o(r.uFogCol.value,t.fog,e.fog),o(r.uFogSun.value,t.fogSun,e.fogSun),o(r.uCloudCol.value,t.cloud,e.cloud),o(r.uCloudShade.value,t.cloudShade,e.cloudShade),o(r.uLift.value,t.lift,e.lift),o(r.uGain.value,t.gain,e.gain);let h=o(r.uVigCol.value,t.vig,e.vig);return h.setRGB(Math.sqrt(h.r),Math.sqrt(h.g),Math.sqrt(h.b),vt.LinearSRGBColorSpace),r.uFogP.value.set(n(t.fogP[0],e.fogP[0]),n(t.fogP[1],e.fogP[1]),n(t.fogP[2],e.fogP[2]),n(t.fogP[3],e.fogP[3])),r.uAtmo.value.set(n(t.atmo[0],e.atmo[0]),n(t.atmo[1],e.atmo[1]),n(t.atmo[2],e.atmo[2]),n(t.atmo[3],e.atmo[3])),r.uShadeFx.value.set(n(t.shadeFx[0],e.shadeFx[0]),n(t.shadeFx[1],e.shadeFx[1]),n(t.shadeFx[2],e.shadeFx[2]),n(t.shadeFx[3],e.shadeFx[3])),r.uGrade.value.x=n(t.grade[0],e.grade[0]),r.uGrade.value.y=n(t.grade[1],e.grade[1]),r.uGrade.value.z=n(t.grade[2],e.grade[2]),r.uRes.value.z=n(t.vignette,e.vignette),r.uNight.value=n(t.night,e.night),l}function Ne(r,t,e){let s=vt.MathUtils.degToRad(t);return e.set(Math.cos(s)*Math.cos(r),Math.sin(s),Math.cos(s)*Math.sin(r))}import*as Ut from"three";var bt=`
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
uniform vec4 uShadeFx;  // g\xF6lge b\xFCy\xFCs\xFC: x y\u0131ld\u0131z, y m\xFCrekkep par\u0131lt\u0131s\u0131, z g\xF6lge s\u0131n\u0131r\u0131 \u0131\u015F\u0131mas\u0131, w bantl\u0131 \u0131\u015F\u0131k
uniform vec3 uTermCol;  // g\xF6lge s\u0131n\u0131r\u0131ndaki s\u0131cak hat
uniform vec3 uInkCol;   // g\xF6lgedeki y\u0131ld\u0131zlar\u0131n rengi
uniform vec3 uVigCol;   // vinyet tonu (ekran uzay\u0131nda \xE7arpan)
uniform vec4 uAtmo;     // x karesel sis, y en \xE7ok sis, z ufuk parlamas\u0131, w \u0131\u015F\u0131k taraf\u0131 s\u0131cakl\u0131\u011F\u0131
// shadowAt() son \xE7a\u011Fr\u0131da g\xF6lge kenar\u0131n\u0131n ham (keskinle\u015Ftirilmemi\u015F) yak\u0131nl\u0131\u011F\u0131n\u0131 buraya yazar;
// shadeLit() g\xF6lge s\u0131n\u0131r\u0131ndaki s\u0131cak hatt\u0131 bununla \xE7izer (ek doku okumas\u0131 yok).
float gShEdge = 0.0;

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
`,He=`
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
// kenar yak\u0131nl\u0131\u011F\u0131: en y\xFCksek de\u011Fer g\xF6lgenin ayd\u0131nl\u0131k yan\u0131nda (ham de\u011Fer 2/3 iken 1)
float shEdge(float s) {
	return 6.75 * s * s * (1.0 - s);
}
float shadowAt(vec3 wp, vec3 n) {
	vec4 sc = uShadowMat * vec4(wp + n * uShadowP.y, 1.0);
	vec3 p = sc.xyz;
	vec2 e = abs(p.xy - 0.5);
	if (max(e.x, e.y) > 0.497 || p.z > 1.0) {
		float ts = trunkShadow(wp);
		gShEdge = shEdge(ts);
		return ts;
	}
	p.z -= uShadowP.z;
#if SHADOW_TAPS > 1
	float o = uShadowP.x * 1.35;
	float s = texture(uShadowMap, vec3(p.xy + vec2(-o, -0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(0.35 * o, -o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(o, 0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(-0.35 * o, o), p.z));
	s *= 0.25;
	gShEdge = shEdge(s);
	// d\xF6rt \xF6rnek aras\u0131 yumu\u015Fak ama net bir kenar: g\xF6lge \xE7izgisi oyunun kendisi
	return smoothstep(0.08, 0.92, s);
#else
	float s = texture(uShadowMap, p);
	gShEdge = shEdge(s);
	return s;
#endif
}
`,ee=`
// Stilize \u0131\u015F\u0131k: iki bantl\u0131 yumu\u015Fak rampa, yar\u0131 k\xFCre g\xF6k \u0131\u015F\u0131\u011F\u0131, doygun serin g\xF6lge,
// g\xF6lge s\u0131n\u0131r\u0131nda s\u0131cak ince hat, kontra \u0131\u015F\u0131kta kenar parlamas\u0131 ve g\xF6lgede ya\u015Fayan gece.
// Hepsi birka\xE7 \xE7arpma; doku okumas\u0131 yok.
#ifndef SHADE_DESAT
#define SHADE_DESAT 0.32
#endif
vec3 skyAmbient(vec3 N) {
	float up = N.y * 0.5 + 0.5;
	vec3 a = mix(uGround, uSkyHor, smoothstep(0.0, 0.55, up));
	return mix(a, uSkyTop, smoothstep(0.5, 1.0, up));
}

// G\xF6lgede ya\u015Fayan gece: T\xFCn Ana'n\u0131n da\u011F\u0131lm\u0131\u015F y\u0131ld\u0131zlar\u0131. Bak\u0131\u015F y\xF6n\xFCne ba\u011Fl\u0131 (sonsuzdaki g\xF6k
// gibi), bu y\xFCzden g\xF6lge bir pencere gibi gece g\xF6\u011F\xFCn\xFC g\xF6sterir. Ekranda ~7 css pikselde bir h\xFCcre.
vec3 nightInShade(vec3 V, float ndv, float k) {
	// ayd\u0131nl\u0131k yerde hi\xE7 hesaplanmaz (g\xF6lge ekranda b\xFCt\xFCn halinde durur, dallanma tutarl\u0131)
	if (k < 0.002) return vec3(0.0);
	vec3 c = vec3(0.0);
#ifndef NO_SHADE_STARS
	vec3 d = -V;
	float K = 61.0 * max(uRes.y / max(uRes.x, 1.0), 1.0);
	vec2 q = vec2(atan(d.z, d.x) * K, d.y * K * 1.05);
	float h = hash12(floor(q));
	vec2 o = vec2(fract(h * 37.1), fract(h * 91.7)) * 0.4 - 0.2;
	vec2 p = abs(fract(q) - 0.5 - o);
	float tw = 0.5 + 0.5 * sin(uTime * (1.4 + h * 4.0) + h * 91.0);
	// k\xFC\xE7\xFCk y\u0131ld\u0131zlar nokta, nadir olanlar d\xF6rt kollu \u0131\u015F\u0131lt\u0131
	float star = step(0.92, h) * smoothstep(0.19, 0.03, length(p)) * (0.4 + 0.6 * fract(h * 13.7));
	float arm = 1.0 - max(p.x, p.y) * 2.1;
	star += step(0.986, h) * smoothstep(0.08, 0.0, min(p.x, p.y)) * arm * arm * 1.4;
	vec3 sc = mix(uInkCol, vec3(1.0, 0.86, 0.62), step(0.75, fract(h * 5.3)) * 0.55);
	c = sc * star * tw * tw * uShadeFx.x * 1.8;
#endif
	// ince m\xFCrekkep par\u0131lt\u0131s\u0131: g\xF6lgedeki kenarlar Zifir'inki gibi mor-mavi \u0131\u015F\u0131r
	float sheen = (1.0 - ndv) * (1.0 - ndv);
	c += uInkCol * vec3(0.5, 0.45, 1.0) * sheen * uShadeFx.y * 0.4;
	return c * k;
}

vec3 shadeLit(vec3 albedo, vec3 N, vec3 V, float ao, float sh, float wrapK, float rimK) {
	float ndl = dot(N, uSunDir);
	float w = clamp((ndl + wrapK) / (1.0 + wrapK), 0.0, 1.0);
	// iki bantl\u0131 rampa: grafik, net ama sert de\u011Fil
	float soft = w * w * (3.0 - 2.0 * w);
	float band = smoothstep(0.03, 0.2, w) * 0.66 + smoothstep(0.45, 0.68, w) * 0.34;
	float diff = mix(soft, band, uShadeFx.w);
	float lit = diff * sh;
	vec3 amb = skyAmbient(N) * ao;
	// g\xF6lge: doygun, serin, temiz (bulan\u0131k mor de\u011Fil). S\u0131cak renkli y\xFCzey (tahta, alt\u0131n yaprak)
	// mavi g\xF6k \u0131\u015F\u0131\u011F\u0131yla \xE7arp\u0131l\u0131nca zeytin-griye d\xFC\u015Fmesin diye g\xF6lgede yerel renk biraz
	// parlakl\u0131\u011Fa \xE7ekilir; g\xF6lgeyi mevsimin g\xF6k rengi boyar.
	vec3 shadeCol = mix(uShadeTint, vec3(1.0), lit);
	vec3 albS = mix(albedo, vec3(dot(albedo, vec3(0.2126, 0.7152, 0.0722))), SHADE_DESAT * (1.0 - lit));
	vec3 c = albS * amb * shadeCol + albedo * uSunCol * lit;
	// g\xF6lge s\u0131n\u0131r\u0131: ayd\u0131nl\u0131k tarafta ince, s\u0131cak, \u0131\u015F\u0131yan hat (oyunun as\u0131l \xE7izgisi)
	float e = max(sh * (1.0 - sh) * 4.0, gShEdge);
	float t = diff * (1.0 - diff) * 4.0;
	vec3 glowAlb = albedo * 0.6 + 0.4;
	c += uTermCol * glowAlb * (e * e * diff * uShadeFx.z + t * t * sh * 0.16);
	// kontra \u0131\u015F\u0131k: g\xFCne\u015F nesnenin arkas\u0131ndayken siluet kenar\u0131 \u0131\u015F\u0131k renginde yanar
	float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
	float back = clamp(dot(-V, uSunDir) * 0.6 + 0.4, 0.0, 1.0);
	c += uSunCol * fres * (back * back * 1.6 + 0.15) * rimK * (0.3 + 0.7 * sh) * ao;
	// gece g\xF6lgede ya\u015Far
	float shade = smoothstep(0.35, 0.9, 1.0 - lit);
	c += nightInShade(V, clamp(dot(N, V), 0.0, 1.0), shade * min(ao, 1.0));
	return c;
}

// Atmosfer: yak\u0131n plan net kals\u0131n diye karesel sis, a\u015Fa\u011F\u0131da bulut denizine do\u011Fru koyula\u015F\u0131r,
// g\xFCne\u015Fe do\u011Fru s\u0131cak, kar\u015F\u0131 tarafta g\xF6\u011F\xFCn rengi. k: uzakl\u0131k \xE7arpan\u0131 (uzak adalar i\xE7in b\xFCy\xFCk).
vec3 applyFogK(vec3 c, vec3 wp, float k) {
	vec3 d = wp - cameraPosition;
	float dist = length(d);
	vec3 v = d / max(dist, 1e-3);
	float hk = exp(-max(wp.y - uFogP.y, -40.0) * uFogP.z);
	float x = dist * uAtmo.x * (0.55 + 0.6 * hk) * k;
	float f = (1.0 - exp(-x * x)) * uAtmo.y;
	float s = pow(max(dot(v, uSunDir), 0.0), uFogP.w);
	return mix(c, mix(uFogCol, uFogSun, s), clamp(f, 0.0, 1.0));
}
vec3 applyFog(vec3 c, vec3 wp) {
	return applyFogK(c, wp, 1.0);
}
`,Ot=`
vec3 acesFit(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
// Ton e\u015Fleme: orta tonlarda rengi koruyan (en parlak kanala g\xF6re) e\u011Fri ile kanal kanal ACES
// kar\u0131\u015F\u0131m\u0131. I\u015F\u0131k doygun ve s\u0131cak kal\u0131r, yaln\u0131zca \xE7ok parlak yerler (g\xFCne\u015F, par\u0131lt\u0131) beyaza yanar.
vec3 tonemap(vec3 c) {
	float m = max(max(c.r, c.g), c.b);
	float mt = clamp((m * (2.51 * m + 0.03)) / (m * (2.43 * m + 0.59) + 0.14), 0.0, 1.0);
	vec3 hp = c * (mt / max(m, 1e-4));
	return mix(acesFit(c), hp, 0.62 * (1.0 - smoothstep(1.4, 7.0, m)));
}
// Ton e\u015Fleme + renk d\xFCzenleme + vinyet + titre\u015Fim. Her malzemenin son sat\u0131r\u0131.
vec4 finish(vec3 c, float a) {
	c = tonemap(c * uGrade.z);
	c = pow(c, vec3(1.0 / 2.2));
	c = c * uGain + uLift * (1.0 - c);
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, uGrade.x);
	c = (c - 0.5) * uGrade.y + 0.5;
	vec2 q = gl_FragCoord.xy / uRes.xy - 0.5;
	q.x *= uRes.x / uRes.y * 0.75;
	float vg = smoothstep(0.25, 0.95, length(q));
	// vinyet siyaha de\u011Fil mevsimin derin tonuna \xE7eker
	c *= mix(vec3(1.0), uVigCol, uRes.z * vg);
	c += vec3(1.0, 0.38, 0.1) * uDanger * vg * 0.6;
	c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrade.w;
	return vec4(clamp(c, 0.0, 1.0), a);
}
`;var Te=null,Qs=1;function Js(r,t){Te=r,Qs=t}var ti=(r={})=>({SHADOW_TAPS:Qs,...r}),ei=`
uniform vec4 uFocus; // xyz odak (Zifir), w a\xE7\u0131kl\u0131k yar\u0131\xE7ap\u0131
float cutoutK(vec3 wp, float nearR) {
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
	return max(k, smoothstep(nearR, nearR * 0.45, length(ap))); // kameraya \xE7ok yak\u0131n dal ve yaprak
}
void cutout(vec3 wp, float nearR) {
	float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
	if (cutoutK(wp, nearR) > ign) discard;
}
`,Ji=`
${bt}
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
}`,ta=`
${bt}
${He}
${ee}
${Ot}
#ifdef CUTOUT
${ei}
#endif
varying vec4 vCol;
varying vec3 vN;
varying vec3 vW;
uniform float uWrap;
uniform float uRim;
uniform float uSnow;     // yukar\u0131 bakan y\xFCzeylerde kar (k\u0131\u015F\u0131n)
uniform float uSnowY;    // kar\u0131n ba\u015Flad\u0131\u011F\u0131 y\xFCkseklik
uniform float uAerial;   // hava perspektifi \xE7arpan\u0131 (uzak adalar sise daha \xE7ok g\xF6m\xFCl\xFCr)
#ifdef USE_MAP
varying vec2 vUv;
uniform sampler2D uMap;
#endif
void main() {
#ifdef CUTOUT
	cutout(vW, 5.5);
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
	alb = mix(alb, vec3(0.93, 0.95, 1.0), snow);
	float sh = shadowAt(vW, N);
	vec3 c = shadeLit(alb, N, V, ao, sh, uWrap, uRim);
	c = applyFogK(c, vW, uAerial);
	gl_FragColor = finish(c, 1.0);
}`;function xe({map:r=null,repeat:t=[1,1],wrap:e=.3,rim:s=.35,snow:a=0,snowY:i=14,aerial:o=1,side:n=Ut.FrontSide,wind:l=!1,cutout:h=!1}={}){let c={};return r&&(c.USE_MAP=1),l&&(c.WIND=1),h&&(c.CUTOUT=1),new Ut.ShaderMaterial({vertexShader:Ji,fragmentShader:ta,defines:ti(c),uniforms:{...Te,uMap:{value:r},uMapRepeat:{value:new Ut.Vector2(t[0],t[1])},uWrap:{value:e},uRim:{value:s},uSnow:{value:a},uSnowY:{value:i},uAerial:{value:o}},side:n})}var si=`
${bt}
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
	// g\xF6lge ge\xE7i\u015Finde kart \u0131\u015F\u0131k y\xF6n\xFCnde geri itilir: kendi yapra\u011F\u0131na g\xF6lge d\xFC\u015F\xFCrmez, g\xF6lgenin yeri de\u011Fi\u015Fmez
	vec3 w = c + (right * rq.x + up * rq.y) * s - uFaceDir * s * 0.55 * (1.0 - uFacing);
	vW = w;
	vec3 rel = c - iCluster.xyz;
	vN = normalize(rel / max(iCluster.w, 0.01) + (right * rq.x + up * rq.y) * 0.6 + vec3(0.0, 0.25, 0.0));
	vDepthAO = clamp(length(rel) / max(iCluster.w, 0.01), 0.0, 1.0);
	float cell = iData.z;
	// atlas: tuvalin \xFCst sat\u0131r\u0131 v=1 taraf\u0131nda (CanvasTexture flipY)
	vUv = (position.xy + 0.5) * 0.5 + vec2(mod(cell, 2.0), 1.0 - floor(cell / 2.0)) * 0.5;
	vTint = iTint;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`,ea=`
// yaprak kartlar\u0131 \xFCst \xFCste biner: y\u0131ld\u0131z k\u0131r\u0131nt\u0131s\u0131 burada atlan\u0131r (yaln\u0131zca m\xFCrekkep par\u0131lt\u0131s\u0131)
#define NO_SHADE_STARS
// yaprak g\xF6lgede de doygun kal\u0131r (z\xFCmr\xFCt, g\xFCl, kehribar), griye \xE7ekilmez
#define SHADE_DESAT 0.0
${bt}
${He}
${ee}
${Ot}
${ei}
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
#ifdef A2C
	// MSAA varsa oyma kapsama maskesiyle yap\u0131l\u0131r (titre\u015Fimli desen yerine yumu\u015Fak ge\xE7i\u015F)
	float cut = cutoutK(vW, 7.5);
	if (cut > 0.97) discard;
#else
	cutout(vW, 7.5);
#endif
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	vec3 alb = t.rgb * vTint;
	// \u0130\xE7 k\u0131s\u0131m daha koyu: k\xFCmeye hacim hissi. Yapraklar \u0131\u015F\u0131\u011F\u0131 sa\xE7ar: g\xF6lgede bile
	// g\xF6k \u0131\u015F\u0131\u011F\u0131n\u0131 daha \xE7ok al\u0131r (g\xF6lgedeki \xE7i\xE7ekler morarmas\u0131n).
	float ao = mix(0.5, 1.0, smoothstep(0.15, 0.95, vDepthAO));
	float sh = shadowAt(vW + uSunDir * 0.45, N);
	vec3 c = shadeLit(alb, N, V, ao * 1.3, sh, 0.65, 0.55);
	c += alb * uGround * 0.5 * (1.0 - sh);
	// Yar\u0131 saydaml\u0131k: g\xFCne\u015F yapra\u011F\u0131n arkas\u0131ndayken \u0131\u015F\u0131k i\xE7inden ge\xE7er; renk doygunla\u015Farak
	// yanar (vitray gibi), k\xFCmenin d\u0131\u015F kabu\u011Fu daha \xE7ok \u0131\u015F\u0131r.
	float tr = pow(max(dot(-V, uSunDir), 0.0), 2.5);
	c += (alb * alb * 1.6 + alb * 0.25) * uSunCol * tr * sh * (0.35 + 0.65 * ao);
	c = applyFog(c, vW);
#ifdef A2C
	gl_FragColor = finish(c, smoothstep(uAlphaCut, 0.75, t.a) * (1.0 - cut));
#else
	gl_FragColor = finish(c, 1.0);
#endif
}`;function ii(r,{a2c:t}){return new Ut.ShaderMaterial({vertexShader:si,fragmentShader:ea,defines:ti(t?{A2C:1}:{}),uniforms:{...Te,uMap:{value:r},uAlphaCut:{value:t?.12:.45},uFacing:{value:1},uFaceDir:{value:new Ut.Vector3(0,1,0)}},alphaToCoverage:!!t,side:Ut.DoubleSide})}function ai(r){return new Ut.ShaderMaterial({vertexShader:si,fragmentShader:`
			uniform sampler2D uMap;
			varying vec2 vUv;
			void main() { if (texture2D(uMap, vUv).a < 0.22) discard; gl_FragColor = vec4(1.0); }`,uniforms:{...Te,uMap:{value:r},uFacing:{value:0},uFaceDir:Te.uSunDir},side:Ut.DoubleSide,colorWrite:!1})}function Cs({wind:r=!1}={}){return new Ut.ShaderMaterial({vertexShader:`
			${bt}
			#ifdef WIND
			attribute vec4 aSway;
			#endif
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
			#ifdef WIND
				w.xyz += windSway(aSway.xyz, aSway.w);
			#endif
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:"void main() { gl_FragColor = vec4(1.0); }",defines:r?{WIND:1}:{},uniforms:{...Te},side:Ut.DoubleSide,colorWrite:!1})}function Hs(r,t=1){return new Ut.ShaderMaterial({vertexShader:"varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",fragmentShader:`
			${bt}
			${ee}
			${Ot}
			uniform vec3 uColor; uniform float uK; uniform float uFade;
			varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(uColor * uK * uFade, vW), 1.0); }`,uniforms:{...Te,uColor:{value:new Ut.Color(r)},uK:{value:t},uFade:{value:1}}})}function oi(r=16777215,t=1){return new Ut.ShaderMaterial({vertexShader:`
			attribute vec4 color; varying vec4 vCol; varying vec3 vW;
			void main() { vCol = color; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${bt}
			${ee}
			${Ot}
			uniform vec3 uColor; uniform float uK;
			varying vec4 vCol; varying vec3 vW;
			void main() { gl_FragColor = finish(applyFog(vCol.rgb * uColor * uK, vW), 1.0); }`,uniforms:{...Te,uColor:{value:new Ut.Color(r)},uK:{value:t}}})}function ni(r){return new Ut.ShaderMaterial({vertexShader:`
			varying vec3 vDir;
			void main() {
				vDir = position;
				vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
				gl_Position = p.xyww;
			}`,fragmentShader:`
			${bt}
			${Ot}
			uniform vec3 uZenith, uSkyMid, uHorizon, uSunGlow, uSunDisc;
			uniform float uNight;
			uniform sampler2D uStars;
			varying vec3 vDir;
			void main() {
				vec3 v = normalize(vDir);
				float h = v.y;
				float hp = max(h, 0.0);
				// ufuk \u2192 orta \u2192 tepe
				vec3 c = mix(uHorizon, uSkyMid, smoothstep(0.0, 0.3, hp));
				c = mix(c, uZenith, smoothstep(0.16, 0.9, hp));
				// g\xFCne\u015Fin bulundu\u011Fu yanda ufuk s\u0131cak parlar, kar\u015F\u0131 yan\u0131 serin ve derin
				vec2 sa = normalize(uSunDir.xz + vec2(1e-4, 0.0));
				vec2 va = normalize(v.xz + vec2(1e-4, 0.0));
				float az = dot(sa, va) * 0.5 + 0.5;
				float hor = exp(-abs(h) * 6.0);
				c += uSunGlow * hor * az * az * az * uAtmo.z;
				c *= mix(0.8, 1.0, az);
				// katmanl\u0131 hale ve keskin disk (boyal\u0131 g\xFCne\u015F)
				float sd = dot(v, uSunDir);
				float a = max(sd, 0.0);
				c += uSunGlow * (pow(a, 7.0) * 0.32 + pow(a, 48.0) * 0.6 + pow(a, 420.0) * 1.6);
				float disc = smoothstep(0.99952, 0.99968, sd);
				c = mix(c, uSunDisc * 10.0, disc);
				// ufkun alt\u0131: bulut denizinin pusu (bulut denizi ile diki\u015Fsiz birle\u015Fir)
				c = mix(c, mix(uFogCol, uFogSun, pow(a, 4.0)), smoothstep(0.015, -0.16, h));
				// y\u0131ld\u0131zlar (alacakaranl\u0131k ve gece)
				if (uNight > 0.01) {
					vec2 suv = vec2(atan(v.z, v.x) / 6.2831853 * 3.0, v.y * 1.5);
					vec3 st = texture2D(uStars, suv).rgb;
					float tw = 0.6 + 0.4 * sin(uTime * (1.5 + st.b * 3.0) + st.g * 40.0);
					float up = smoothstep(0.03, 0.4, h) * (1.0 - smoothstep(0.9, 0.995, a));
					c += st.r * tw * uNight * up * mix(uInkCol, vec3(1.0), 0.5) * 2.4;
				}
				gl_FragColor = finish(c, 1.0);
			}`,uniforms:{...Te,uStars:{value:r}},depthWrite:!1,side:Ut.BackSide})}import*as Ht from"three";var es=class{constructor(t,e){this.G=t,this.size=e,this.half=17,this.scene=new Ht.Scene,this.scene.matrixWorldAutoUpdate=!1,this.cam=new Ht.OrthographicCamera(-this.half,this.half,this.half,-this.half,1,300);let s=new Ht.DepthTexture(e,e);s.type=Ht.UnsignedIntType,s.compareFunction=Ht.LessEqualCompare,s.minFilter=Ht.LinearFilter,s.magFilter=Ht.LinearFilter,this.rt=new Ht.WebGLRenderTarget(e,e,{depthTexture:s,depthBuffer:!0,stencilBuffer:!1,format:Ht.RedFormat,type:Ht.UnsignedByteType,minFilter:Ht.NearestFilter,magFilter:Ht.NearestFilter,generateMipmaps:!1}),t.uShadowMap.value=s,t.uShadowP.value.set(1/e,.05,9e-4,1),this._bias=new Ht.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this._r=new Ht.Vector3,this._u=new Ht.Vector3,this._f=new Ht.Vector3,this._p=new Ht.Vector3}add(t,e){let s=new Ht.Mesh(t,e);return s.frustumCulled=!1,s.matrixAutoUpdate=!1,s.updateMatrixWorld(!0),this.scene.add(s),s}place(t,e){let s=this._f.copy(e).negate(),a=Math.abs(s.y)>.98?this._u.set(1,0,0):this._u.set(0,1,0),i=this._r.crossVectors(s,a).normalize(),o=this._u.crossVectors(i,s).normalize(),n=this.half*2/this.size,l=Math.round(t.dot(i)/n)*n,h=Math.round(t.dot(o)/n)*n,c=t.dot(s),p=this._p.set(0,0,0).addScaledVector(i,l).addScaledVector(o,h).addScaledVector(s,c),u=this.cam;u.position.copy(p).addScaledVector(s,-150),u.up.copy(o),u.lookAt(p),u.updateMatrixWorld(!0),u.updateProjectionMatrix(),this.G.uShadowMat.value.copy(this._bias).multiply(u.projectionMatrix).multiply(u.matrixWorldInverse)}render(t){let e=t.getRenderTarget();t.setRenderTarget(this.rt),t.clear(!1,!0,!1),t.render(this.scene,this.cam),t.setRenderTarget(e)}dispose(){this.rt.depthTexture.dispose(),this.rt.dispose()}};import*as jt from"three";import*as ke from"three";function pe(r,t){let e=document.createElement("canvas");return e.width=r,e.height=t,[e,e.getContext("2d")]}function Be(r,t,e,s,a,i){for(let o=-1;o<=1;o++)for(let n=-1;n<=1;n++){let l=e+o*r,h=s+n*t;l+a<0||l-a>r||h+a<0||h-a>t||i(l,h)}}function fe(r,{srgb:t=!0,repeat:e=!0,aniso:s=1,mips:a=!0}={}){let i=new ke.CanvasTexture(r);return t&&(i.colorSpace=ke.SRGBColorSpace),e&&(i.wrapS=i.wrapT=ke.RepeatWrapping),i.anisotropy=s,i.generateMipmaps=a,i.minFilter=a?ke.LinearMipmapLinearFilter:ke.LinearFilter,i.needsUpdate=!0,i}function ie(r,t){let e=parseInt(r.slice(1),16);return`rgba(${e>>16&255},${e>>8&255},${e&255},${t})`}function ye(r,t,e){let s=parseInt(r.slice(1),16),a=parseInt(t.slice(1),16),i=o=>Math.round((s>>o&255)*(1-e)+(a>>o&255)*e);return`rgb(${i(16)},${i(8)},${i(0)})`}function Pe(r,t,e,s,a,i=0){r.beginPath(),r.moveTo(t-s/2,e),r.quadraticCurveTo(t,e-a+i,t+s/2,e),r.quadraticCurveTo(t,e+a*.85+i,t-s/2,e),r.closePath()}function ri(r,t){let e=r,s=r,[a,i]=pe(e,s),o=Gt(7),n=e/512;i.fillStyle="#ece5d8",i.fillRect(0,0,e,s);let l=["#faf6ee","#d9d5cf","#f2e5d3","#d4d1ce","#f7f0e4","#e7d8c4","#e2ded8"];for(let c=0;c<16;c++){let p=o()*s,u=o.range(10,54)*n,f=o.pick(l),g=o()*L,x=o()*L,b=1+(o()*3|0),S=1+(o()*3|0),d=o.range(2,9)*n,P=o.range(.5,.95);for(let m of[-s,0,s]){let F=p+m;if(F+u+d<0||F-u-d>s)continue;let z=i.createLinearGradient(0,F-u/2-d,0,F+u/2+d);z.addColorStop(0,ie(f,0)),z.addColorStop(.3,ie(f,P)),z.addColorStop(.7,ie(f,P)),z.addColorStop(1,ie(f,0)),i.fillStyle=z,i.beginPath();for(let W=0;W<=e+.1;W+=8*n){let X=F-u/2-d+Math.sin(W/e*L*b+g)*d;W===0?i.moveTo(W,X):i.lineTo(W,X)}for(let W=e;W>=-.1;W-=8*n)i.lineTo(W,F+u/2+d+Math.sin(W/e*L*S+x)*d);i.closePath(),i.fill()}}i.globalAlpha=.035,i.strokeStyle="#6d6058",i.lineWidth=1.2*n;for(let c=0;c<60;c++){let p=o()*e,u=o()*s,f=o.range(30,110)*n;Be(e,s,p,u,f,(g,x)=>{i.beginPath(),i.moveTo(g,x),i.quadraticCurveTo(g+o.range(-3,3)*n,x+f*.5,g+o.range(-2,2)*n,x+f),i.stroke()})}i.globalAlpha=1;for(let c=0;c<18;c++){let p=o()*e,u=o()*s,f=o.range(70,230)*n,g=o.range(5,12)*n,x=!1;Be(e,s,p,u,f,(b,S)=>{if(i.fillStyle=ie("#8d7a6c",.22),Pe(i,b+3*n,S+g*.75,f*.92,g*.55),i.fill(),i.fillStyle=ie("#fdfbf6",.85),Pe(i,b,S,f,g),i.fill(),x){let d=b+f*.42;i.fillStyle=ie("#d9a387",.8),i.beginPath(),i.ellipse(d,S+g*.3,g*1.1,g*.75,0,0,L),i.fill(),i.fillStyle=ie("#fffaf2",.95),i.beginPath(),i.ellipse(d-g*.3,S-g*.2,g*.9,g*.55,-.3,0,L),i.fill()}})}for(let c=0;c<6;c++){let p=o()*e,u=o()*s,f=o.range(26,60)*n,g=o.range(7,13)*n;Be(e,s,p,u,f,(x,b)=>{i.fillStyle=ie(o()<.5?"#d8a086":"#cf8f74",.7),Pe(i,x,b,f,g),i.fill(),i.strokeStyle=ie("#fbf6ee",.9),i.lineWidth=2*n,i.stroke()})}let h=["#3a312d","#463b36","#54463f","#2f2825"];for(let c=0;c<24;c++){let p=o()*s,u=1+(o()*3.2|0),f=o()*e;for(let g=0;g<u;g++){let x=o.range(14,64)*n,b=o.range(2.6,6)*n,S=p+o.range(-3,3)*n,d=o.pick(h),P=o.range(.6,.88),m=o.range(-1.5,1.5)*n;Be(e,s,f,S,x,(F,z)=>{i.fillStyle=ie("#fbf7f0",.6),Pe(i,F,z+b*.55,x*.9,b*.5),i.fill(),i.fillStyle=ie(d,P),Pe(i,F,z,x,b,m),i.fill()}),f+=x+o.range(10,70)*n}}for(let c=0;c<3;c++){let p=o()*e,u=o()*s,f=o.range(40,70)*n,g=f*o.range(.32,.45);Be(e,s,p,u,f,(x,b)=>{i.fillStyle=ie("#2a2321",.88),Pe(i,x,b,f,g*2),i.fill(),i.fillStyle=ie("#6e5d54",.6),Pe(i,x,b-g*.1,f*.45,g*.5),i.fill()})}return fe(a,{aniso:t})}function li(r,t,e){let[s,a]=pe(r,t),i=Gt(11),o=r/512,n=4,l=t/n,h=[["#e8c08a","#d9a96f","#c48d58"],["#efc994","#deb07a","#c9945f"],["#e2b47c","#d3a067","#bb8551"],["#ecc390","#dcaa72","#c79059"]];for(let c=0;c<n;c++){let p=c*l,[u,f,g]=h[c],x=a.createLinearGradient(0,0,r,0);x.addColorStop(0,g),x.addColorStop(.08,f),x.addColorStop(.35,u),x.addColorStop(.65,f),x.addColorStop(.92,u),x.addColorStop(1,g),a.fillStyle=x,a.fillRect(0,p,r,l);for(let S=0;S<7;S++){let d=p+i.range(.15,.85)*l;a.strokeStyle=ie(i()<.6?"#9c6a3e":"#f6dcb0",i.range(.18,.34)),a.lineWidth=i.range(1,2.4)*o,a.beginPath();let P=i()*L,m=i.range(1.5,3.5);for(let F=0;F<=r;F+=8*o){let z=Math.sin(F/r*L*m+P)*l*.06;F===0?a.moveTo(F,d+z):a.lineTo(F,d+z)}a.stroke()}if(c%2===0){let S=i.range(.25,.75)*r,d=p+l*i.range(.35,.65);a.fillStyle=ie("#8a5a33",.55),a.beginPath(),a.ellipse(S,d,11*o,l*.2,0,0,L),a.fill(),a.fillStyle=ie("#5c3a20",.7),a.beginPath(),a.ellipse(S,d,5*o,l*.1,0,0,L),a.fill()}let b=a.createLinearGradient(0,p,0,p+l);b.addColorStop(0,"rgba(255,240,210,0.55)"),b.addColorStop(.1,"rgba(255,240,210,0.0)"),b.addColorStop(.86,"rgba(70,40,20,0.0)"),b.addColorStop(1,"rgba(70,40,20,0.5)"),a.fillStyle=b,a.fillRect(0,p,r,l);for(let S of[.06,.94])for(let d of[.32,.68])a.fillStyle="rgba(60,40,30,0.85)",a.beginPath(),a.arc(S*r,p+l*d,2.4*o,0,L),a.fill(),a.fillStyle="rgba(255,235,200,0.5)",a.beginPath(),a.arc(S*r-.7*o,p+l*d-.7*o,.9*o,0,L),a.fill()}return fe(s,{aniso:e,repeat:!1})}function ci(r){let[t,e]=pe(r,r),s=r/2,a=Gt(23),i=s/256,o=(u,f,g,x,b,S,d)=>{e.save(),e.translate(u,f),e.rotate(b),e.fillStyle=S,e.beginPath(),e.moveTo(0,-g*.5),e.bezierCurveTo(x*.75,-g*.3,x*.62,g*.22,0,g*.5),e.bezierCurveTo(-x*.62,g*.22,-x*.75,-g*.3,0,-g*.5),e.fill(),d&&(e.fillStyle=d,e.beginPath(),e.moveTo(0,-g*.46),e.bezierCurveTo(x*.62,-g*.28,x*.5,g*.2,0,g*.44),e.closePath(),e.fill()),e.restore()},n=(u,f)=>{let g=[];for(let x=0;x<u;x++){let b=a()*L,S=Math.pow(a(),.6)*f;g.push({a:b,rr:S,x:Math.cos(b)*S,y:Math.sin(b)*S*.9})}return g.sort((x,b)=>b.y-x.y),g},l=(u,f)=>Math.min(1,Math.max(0,u/f*.5+.5)),h=(u,f,g,x,b)=>{let S=e.createLinearGradient(0,f-g,0,f+g);S.addColorStop(0,x),S.addColorStop(1,b),e.fillStyle=S;for(let d=0;d<9;d++){let P=d/9*L+a()*.4,m=d===0?0:g*a.range(.25,.5);e.beginPath(),e.arc(u+Math.cos(P)*m,f+Math.sin(P)*m*.9,g*a.range(.42,.58),0,L),e.fill()}},c=(u,f,g,x,b)=>{let S=s*.36;h(u,f,S*.78,g.coreTop,g.coreBot);for(let d of n(x,S)){let P=l(d.y,S),F=d.rr/S>.55?d.a+Math.PI/2+a.range(-.35,.35):a.range(-.9,.9)+Math.PI,z=a.range(b[0],b[1])*i,W=g.ramp(P,a());o(u+d.x,f+d.y,z,z*a.range(.42,.52),F,W,g.hi(P))}},p=(u,f,g)=>(x,b)=>{let S=(b-.5)*.22,d=Math.min(1,Math.max(0,x+S));return d<.5?ye(u,f,d*2):ye(f,g,(d-.5)*2)};{let u=s*.5,f=s*.5,g=s*.36;h(u,f,g*.8,"#f4c6d6","#b9789c");for(let b=0;b<12;b++){let S=a()*L,d=g*a.range(.72,.95),P=u+Math.cos(S)*d,m=f+Math.sin(S)*d*.9,F=l(m-f,g);o(P,m,a.range(30,42)*i,a.range(13,17)*i,S+Math.PI/2,ye("#a6cf6c","#5e8f45",F),"rgba(230,255,190,0.25)")}let x=(b,S,d,P)=>{let m=a()*L,F=ye("#fff4f8","#ffc3d8",Math.min(1,P*1.3)),z=ye("#ffc3d8","#d98aae",Math.max(0,P*1.4-.4)),W=P<.55?F:z,X=ye("#ffd7e5","#c06f98",P);for(let nt=0;nt<5;nt++){let rt=m+nt/5*L;e.fillStyle=X,e.beginPath(),e.ellipse(b+Math.cos(rt)*d*.56,S+Math.sin(rt)*d*.56,d*.56,d*.42,rt,0,L),e.fill(),e.fillStyle=W,e.beginPath(),e.ellipse(b+Math.cos(rt)*d*.5,S+Math.sin(rt)*d*.5,d*.46,d*.34,rt,0,L),e.fill()}e.fillStyle=P<.5?"#f7d26a":"#e2789f",e.beginPath(),e.arc(b,S,d*.2,0,L),e.fill()};for(let b of n(64,g)){let S=l(b.y,g);x(u+b.x,f+b.y,a.range(17,24)*i,Math.min(1,Math.max(0,S+a.range(-.12,.12))))}}c(s*1.5,s*.5,{coreTop:"#4e8a3a",coreBot:"#1f4a30",ramp:p("#b4dd6e","#5fa344","#2a6136"),hi:u=>u<.5?"rgba(240,255,190,0.28)":"rgba(200,240,170,0.12)"},84,[36,50]),c(s*.5,s*1.5,{coreTop:"#e0a23a",coreBot:"#9a4a22",ramp:(u,f)=>f<.06?ye("#ea8a3e","#b9512c",u):p("#ffe58a","#f4b23c","#c96a2a")(u,f),hi:u=>u<.5?"rgba(255,250,210,0.32)":"rgba(255,220,150,0.14)"},80,[36,50]);{let u=s*1.5,f=s*1.5,g=s*.36,x=n(34,g*.85);for(let b of x){let S=l(b.y,g),d=a.range(26,46)*i*(1-.3*(b.rr/g)),P=u+b.x,m=f+b.y,F=e.createRadialGradient(P-d*.25,m-d*.45,d*.15,P,m,d);F.addColorStop(0,ye("#ffffff","#e6ecfb",S)),F.addColorStop(.7,ye("#f3f6fe","#c9d3f0",S)),F.addColorStop(1,ye("#d9e1f6","#aab6e0",S)),e.fillStyle=F,e.beginPath(),e.arc(P,m,d,0,L),e.fill()}}return fe(t,{repeat:!1})}function hi(r=128){let[t,e]=pe(r,r),s=r/2,a=e.createRadialGradient(s,s,0,s,s,s);return a.addColorStop(0,"rgba(255,255,255,1)"),a.addColorStop(.18,"rgba(255,255,255,0.55)"),a.addColorStop(.45,"rgba(255,255,255,0.14)"),a.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=a,e.fillRect(0,0,r,r),fe(t,{srgb:!1,repeat:!1})}function ui(r=128){let[t,e]=pe(r,r),s=r/2,a=Gt(5);for(let i=0;i<22;i++){let o=a()*L,n=a()*r*.18,l=r*a.range(.12,.3),h=s+Math.cos(o)*n,c=s+Math.sin(o)*n,p=e.createRadialGradient(h,c,0,h,c,l);p.addColorStop(0,"rgba(10,6,20,0.55)"),p.addColorStop(1,"rgba(10,6,20,0)"),e.fillStyle=p,e.fillRect(0,0,r,r)}return fe(t,{srgb:!1,repeat:!1})}function di(r=1024,t=512){let[e,s]=pe(r,t);s.fillStyle="#000",s.fillRect(0,0,r,t);let a=Gt(99);for(let i=0;i<900;i++){let o=a()*r,n=a()*t,l=Math.pow(a(),3),h=.5+l*1.6;s.fillStyle=`rgb(${80+l*175|0},${a()*255|0},0)`,s.beginPath(),s.arc(o,n,h,0,L),s.fill()}return fe(e,{srgb:!1})}function pi(r=256){let[t,e]=pe(r,r),s=Gt(41),a=r/2;for(let i=0;i<46;i++){let o=s()*L,n=Math.pow(s(),.8)*r*.28,l=a+Math.cos(o)*n*1.3,h=a+Math.sin(o)*n*.55+r*.04,c=r*s.range(.08,.2),p=e.createRadialGradient(l,h-c*.3,0,l,h,c),f=Math.max(0,Math.min(1,1-(h-a*.6)/(r*.5)))*255|0;p.addColorStop(0,`rgba(${f},${f},${f},0.5)`),p.addColorStop(1,`rgba(${f},${f},${f},0)`),e.fillStyle=p,e.fillRect(0,0,r,r)}return fe(t,{srgb:!1,repeat:!1})}function fi(r=256){let[t,e]=pe(r,r),s=e.createImageData(r,r),a=Gt(3),i=[8,16,32,64],o=i.map(l=>{let h=new Float32Array(l*l);for(let c=0;c<h.length;c++)h[c]=a();return h}),n=(l,h,c,p)=>{let u=c*h,f=p*h,g=Math.floor(u),x=Math.floor(f),b=u-g,S=f-x,d=b*b*(3-2*b),P=S*S*(3-2*S),m=(W,X)=>l[(X%h+h)%h*h+(W%h+h)%h],F=m(g,x)+(m(g+1,x)-m(g,x))*d,z=m(g,x+1)+(m(g+1,x+1)-m(g,x+1))*d;return F+(z-F)*P};for(let l=0;l<r;l++)for(let h=0;h<r;h++){let c=h/r,p=l/r,u=0,f=.55,g=0;for(let S=0;S<i.length;S++)u+=n(o[S],i[S],c,p)*f,g+=f,f*=.5;u/=g;let x=n(o[1],i[1],c+.37,p+.21),b=(l*r+h)*4;s.data[b]=u*255,s.data[b+1]=x*255,s.data[b+2]=0,s.data[b+3]=255}return e.putImageData(s,0,0),fe(t,{srgb:!1})}function gi(r=128){let[t,e]=pe(r,r),s=r/2,a=s/2;e.fillStyle="#ffd0e0",e.beginPath(),e.ellipse(a,a,s*.32,s*.2,.4,0,L),e.fill(),e.fillStyle="#ffeef4",e.beginPath(),e.ellipse(a-s*.06,a-s*.03,s*.16,s*.08,.4,0,L),e.fill(),e.save(),e.translate(s+a,a),e.rotate(.6),e.fillStyle="#f0a43a",e.beginPath(),e.moveTo(0,-s*.36),e.quadraticCurveTo(s*.22,0,0,s*.36),e.quadraticCurveTo(-s*.22,0,0,-s*.36),e.fill(),e.strokeStyle="rgba(120,50,10,0.6)",e.lineWidth=1.2,e.beginPath(),e.moveTo(0,-s*.3),e.lineTo(0,s*.3),e.stroke(),e.restore();let i=e.createRadialGradient(a,s+a,0,a,s+a,s*.3);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.5,"rgba(240,246,255,0.8)"),i.addColorStop(1,"rgba(230,240,255,0)"),e.fillStyle=i,e.fillRect(0,s,s,s),i=e.createRadialGradient(s+a,s+a,0,s+a,s+a,s*.48),i.addColorStop(0,"rgba(255,255,230,1)"),i.addColorStop(.15,"rgba(255,240,160,0.9)"),i.addColorStop(.45,"rgba(255,200,90,0.22)"),i.addColorStop(1,"rgba(255,180,60,0)"),e.fillStyle=i,e.fillRect(s,s,s,s),fe(t,{repeat:!1})}function mi(r=128,t=256){let[e,s]=pe(r,t),a=Gt(17);for(let n=0;n<26;n++){let l=a()*r,h=a.range(3,14),c=s.createLinearGradient(l-h,0,l+h,0),p=a.range(.15,.5);c.addColorStop(0,"rgba(255,255,255,0)"),c.addColorStop(.5,`rgba(255,255,255,${p})`),c.addColorStop(1,"rgba(255,255,255,0)"),s.fillStyle=c,s.fillRect(l-h,0,h*2,t)}s.globalCompositeOperation="destination-in";let i=s.createLinearGradient(0,0,0,t);i.addColorStop(0,"rgba(0,0,0,0)"),i.addColorStop(.25,"rgba(0,0,0,1)"),i.addColorStop(.7,"rgba(0,0,0,0.6)"),i.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=i,s.fillRect(0,0,r,t);let o=s.createLinearGradient(0,0,r,0);return o.addColorStop(0,"rgba(0,0,0,0)"),o.addColorStop(.2,"rgba(0,0,0,1)"),o.addColorStop(.8,"rgba(0,0,0,1)"),o.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=o,s.fillRect(0,0,r,t),s.globalCompositeOperation="source-over",fe(e,{srgb:!1,repeat:!1})}function vi(r,t){let[e,s]=pe(r,r),a=Gt(31),i=r/256;s.fillStyle="#8f8496",s.fillRect(0,0,r,r);let o=["#a093a6","#7b7088","#9a8c94","#b0a2a8","#857a92","#6f6680"];for(let n=0;n<160;n++){let l=a()*r,h=a()*r,c=a.range(6,40)*i,p=c*a.range(.2,.6);s.globalAlpha=a.range(.2,.5),s.fillStyle=a.pick(o),Be(r,r,l,h,c,(u,f)=>{s.beginPath(),s.ellipse(u,f,c,p,0,0,L),s.fill()})}s.globalAlpha=.22,s.strokeStyle="#4e4660";for(let n=0;n<14;n++){let l=a()*r;s.lineWidth=a.range(1,3)*i,s.beginPath();for(let h=0;h<=r;h+=8*i){let c=l+Math.sin(h*.05/i+n)*3*i;h===0?s.moveTo(h,c):s.lineTo(h,c)}s.stroke()}return s.globalAlpha=1,fe(e,{aniso:t})}import*as Ds from"three";import*as Xt from"three";var Kt=class{constructor(){this.p=[],this.n=[],this.c=[],this.uv=[],this.sw=[],this.idx=[],this.hasSway=!1,this.sway=[0,0,0,0]}get count(){return this.p.length/3}setSway(t,e,s,a){this.sway[0]=t,this.sway[1]=e,this.sway[2]=s,this.sway[3]=a,a>0&&(this.hasSway=!0)}vert(t,e,s,a,i,o,n,l,h,c,p=0,u=0){return this.p.push(t,e,s),this.n.push(a,i,o),this.c.push(n,l,h,c),this.uv.push(p,u),this.sw.push(this.sway[0],this.sway[1],this.sway[2],this.sway[3]),this.count-1}tri(t,e,s){this.idx.push(t,e,s)}quad(t,e,s,a){this.idx.push(t,e,s,t,s,a)}tube(t,e,s,a,{uvScale:i=1,capEnd:o=!0,capStart:n=!1,sway:l=null,shape:h=null}={}){let c=[1,0],p=t.length,u=new Xt.Vector3,f=new Xt.Vector3,g=new Xt.Vector3,x=new Xt.Vector3,b=this.count,S=0;for(let m=0;m<p;m++){let F=t[Math.max(0,m-1)],z=t[Math.min(p-1,m+1)];u.subVectors(z,F).normalize(),m===0?(x.set(0,1,0),Math.abs(u.dot(x))>.9&&x.set(1,0,0),f.crossVectors(u,x).normalize()):f.sub(x.copy(u).multiplyScalar(f.dot(u))).normalize(),g.crossVectors(u,f).normalize(),m>0&&(S+=t[m].distanceTo(t[m-1])/(Math.PI*2*Math.max(e[m],.05))*i),l&&l(m,m/(p-1));for(let W=0;W<=s;W++){let X=W/s*Math.PI*2,nt=Math.cos(X),rt=Math.sin(X),ht=f.x*nt+g.x*rt,gt=f.y*nt+g.y*rt,pt=f.z*nt+g.z*rt,xt=e[m],Mt=ht,_t=gt,Wt=pt;if(h){h(m,m/(p-1),X,S,c),xt*=c[0];let B=c[1]/c[0];Mt=ht-B*(g.x*nt-f.x*rt),_t=gt-B*(g.y*nt-f.y*rt),Wt=pt-B*(g.z*nt-f.z*rt);let D=Math.hypot(Mt,_t,Wt)||1;Mt/=D,_t/=D,Wt/=D}let C=a(m,m/(p-1),X,Mt,_t,Wt);this.vert(t[m].x+ht*xt,t[m].y+gt*xt,t[m].z+pt*xt,Mt,_t,Wt,C[0],C[1],C[2],C[3],W/s,S)}}let d=s+1;for(let m=0;m<p-1;m++)for(let F=0;F<s;F++){let z=b+m*d+F,W=z+d;this.quad(z,W,W+1,z+1)}let P=(m,F)=>{let z=t[m],W=new Xt.Vector3().subVectors(t[F?1:p-1],t[F?0:p-2]).normalize();F&&W.negate();let X=a(m,F?0:1,0,W.x,W.y,W.z),nt=this.vert(z.x,z.y,z.z,W.x,W.y,W.z,X[0],X[1],X[2],X[3],.5,S),rt=b+m*d;for(let ht=0;ht<s;ht++)F?this.tri(nt,rt+ht+1,rt+ht):this.tri(nt,rt+ht,rt+ht+1)};o&&P(p-1,!1),n&&P(0,!0)}box(t,e,s,a,i){let o=[[e,s,a],[e.clone().negate(),s,a.clone().negate()],[a,s,e.clone().negate()],[a.clone().negate(),s,e],[s,a,e],[s.clone().negate(),a.clone().negate(),e]];for(let[n,l,h]of o){let c=n.clone().normalize(),p=i(c),u=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,b])=>{let S=t.clone().add(n).addScaledVector(h,x).addScaledVector(l,b);return this.vert(S.x,S.y,S.z,c.x,c.y,c.z,p[0],p[1],p[2],p[3],(x+1)/2,(b+1)/2)}),f=new Xt.Vector3().subVectors(this.at(u[1]),this.at(u[0])),g=new Xt.Vector3().subVectors(this.at(u[2]),this.at(u[0]));f.cross(g).dot(c)>=0?this.quad(u[0],u[1],u[2],u[3]):this.quad(u[0],u[3],u[2],u[1])}}fixWinding(){let t=this.p,e=this.n,s=this.idx;for(let a=0;a<s.length;a+=3){let i=s[a]*3,o=s[a+1]*3,n=s[a+2]*3,l=t[o]-t[i],h=t[o+1]-t[i+1],c=t[o+2]-t[i+2],p=t[n]-t[i],u=t[n+1]-t[i+1],f=t[n+2]-t[i+2],g=h*f-c*u,x=c*p-l*f,b=l*u-h*p;if(g*e[i]+x*e[i+1]+b*e[i+2]<0){let S=s[a+1];s[a+1]=s[a+2],s[a+2]=S}}return this}at(t){return new Xt.Vector3(this.p[t*3],this.p[t*3+1],this.p[t*3+2])}build(){let t=new Xt.BufferGeometry;return t.setAttribute("position",new Xt.Float32BufferAttribute(this.p,3)),t.setAttribute("normal",new Xt.Float32BufferAttribute(this.n,3)),t.setAttribute("color",new Xt.Float32BufferAttribute(this.c,4)),t.setAttribute("uv",new Xt.Float32BufferAttribute(this.uv,2)),this.hasSway&&t.setAttribute("aSway",new Xt.Float32BufferAttribute(this.sw,4)),t.setIndex(this.count>65535?new Xt.Uint32BufferAttribute(this.idx,1):new Xt.Uint16BufferAttribute(this.idx,1)),t.computeBoundingSphere(),t.computeBoundingBox(),t}};import*as te from"three";var Ge=7.658461538461538*Math.PI*2;function $t(r){let t=Math.max(r,-2);return 3.05+.95*(1-Math.min(t,52)/52)+1.9*Math.exp(-Math.max(t,0)/2.3)}var Le=[{th:9.35,out:3.4,w:.5,leaves:"blossom"},{th:15.5,out:4.6,w:.56,leaves:"green"},{th:21.3,out:6.2,w:.62,leaves:"green",nest:!0},{th:33,out:4.8,w:.54,leaves:"gold"},{th:39.4,out:3.8,w:.48,leaves:"snow"}],ia=r=>Math.abs(r)>=1?0:.5+.5*Math.cos(Math.PI*r);function be(r){return 50.4-r/(Math.PI*2)*6.5}function ss(r){let t=0;for(let e of Le)t+=e.out*ia((r-e.th)/e.w);return t}function Ps(r){return $t(be(r))+.98+ss(r)}var Se=[{id:"bahar-1",season:"spring",from:0,to:6,title:"\xC7i\xE7ek Tac\u0131",kicker:"Bahar \xB7 I"},{id:"bahar-2",season:"spring",from:6,to:12,title:"Pembe R\xFCzg\xE2r",kicker:"Bahar \xB7 II"},{id:"yaz-1",season:"summer",from:12,to:18,title:"Z\xFCmr\xFCt G\xF6vde",kicker:"Yaz \xB7 I"},{id:"yaz-2",season:"summer",from:18,to:24,title:"Ku\u015F Yuvas\u0131",kicker:"Yaz \xB7 II"},{id:"guz-1",season:"autumn",from:24,to:30,title:"Alt\u0131n Yapraklar",kicker:"G\xFCz \xB7 I"},{id:"guz-2",season:"autumn",from:30,to:36,title:"F\u0131rt\u0131na",kicker:"G\xFCz \xB7 II"},{id:"kis-1",season:"winter",from:36,to:42,title:"K\u0131ra\u011F\u0131",kicker:"K\u0131\u015F \xB7 I"},{id:"kis-2",season:"winter",from:42,to:Ge,title:"K\xF6k Kap\u0131s\u0131",kicker:"K\u0131\u015F \xB7 II",finale:!0}];function is(r,t=[0,0,0,0]){let e=(o,n,l)=>{let h=Math.min(1,Math.max(0,(l-o)/(n-o)));return h*h*(3-2*h)},s=e(37,41,r),a=e(25,29,r)*(1-s),i=e(12.5,16.5,r)*(1-s-a);return t[0]=s,t[1]=a,t[2]=i,t[3]=Math.max(0,1-s-a-i),t}var Is=[4.85,5.72,.48,1.3],yi=[1.6,1.35,1.75,1.3],Ue=null,ki=2.2,aa=Math.exp(-ki)*2.6175,os=r=>aa-Math.exp(ki*(Math.cos(r)-1));function qt(r,t){let e=$t(t),s=r+t*.105,i=1+St(1.2,4.5,t)*(1-St(50.5,53,t))*(.058*os(5*s+.4)+.034*os(3*(r+t*.06)+1.9))+.008*Math.sin(11*r-.4*t),o=Math.max(t,0),n=0;if(o<9){for(let h=0;h<4;h++){let c=Is[h]-o*.11,p=Math.atan2(Math.sin(r-c),Math.cos(r-c)),u=.028+.05*Math.exp(-o/1.4);n+=Math.exp(-(p*p)/u)*yi[h]}n*=Math.exp(-o/1.9)}let l=0;if(t>50.5&&Ue){let h=St(50.5,54,t);for(let c=0;c<Ue.length;c++){let p=Math.atan2(Math.sin(r-Ue[c]),Math.cos(r-Ue[c]));l+=Math.exp(-(p*p)/.07)}l=h*(l*1.35-.55)-St(53.2,55.6,t)*1.8}return e*i+n+l}var Et=(r,t,e)=>new te.Vector3(r,t,e),Pt=(r,t,e)=>Et(Math.cos(t)*r,e,Math.sin(t)*r);function Fs(r,t=4){return new te.CatmullRomCurve3(r,!1,"centripetal").getPoints(Math.max(2,(r.length-1)*t))}function Vs(r,t,e){let a=qt(r,t),i=(qt(r+.01,t)-qt(r-.01,t))/(2*.01),o=(qt(r,t+.01)-qt(r,t-.01))/(2*.01),n=Math.cos(r),l=Math.sin(r),h=i*n-a*l,c=i*l+a*n;return e.set(c,o*(l*h-n*c),-h),e.normalize()}function bi(r,t){let e=Gt(1453),s=Gt(2024),a=t,i=a.leafDensity,o=a.id>=1,n=new Kt,l=new Kt,h=[],c=[],p=v=>(T,E)=>{let R=St(.3,.06,v*(1-E*.9)),N=.97+.03*Math.sin(T*.7);return[Y(1,.5,R)*N,Y(.99,.35,R)*N,Y(.97,.3,R)*N,Y(.86,1,E)]},u=(v,T,E)=>{let R=s()*L;return(N,V,O,Q,Z)=>{let et=T*(1-V)*St(.02,.12,V),at=v*O+Q*E+R;Z[0]=1+et*Math.sin(at),Z[1]=et*v*Math.cos(at)}},f=v=>Math.hypot(v.x,v.z)>qt(Math.atan2(v.z,v.x),v.y)-.05,g=(v,T,E,R,N,V,O=7,Q={})=>{let Z=Fs(v,Q.per||5),et=Z.length,at=e()*10,J=0;if(Q.fromTrunk!==!1)for(;J<et-1&&!f(Z[J]);)J++;let ct=J/(et-1),yt=Q.collar??.55,mt=Z.map((Ct,ft)=>{let It=ft/(et-1),Dt=E+(T-E)*Math.pow(1-It,Q.taper??1.7),Zt=1+.07*ce(ft*.55+at)*(1-It*.6),ne=Math.max(0,It-ct),se=1+yt*Math.exp(-ne*9)*(It<ct,1);return Dt*Zt*se});if(n.tube(Z,mt,O,p(T),{uvScale:.6,sway:(Ct,ft)=>n.setSway(R.x,R.y,R.z,Y(N,V,Math.pow(ft,1.6))),shape:T>.3?u(T>1?4:3,T>1?.09:.12,4):null}),Q.noCaps!==!0)for(let Ct=0;Ct<et-1;Ct+=2){let ft=Math.min(et-1,Ct+2),It=mt[Ct];if(It<.1)break;h.push({a:Z[Ct].clone(),b:Z[ft].clone(),r:(It+mt[ft])*.5*.92,anchor:R,wa:Y(N,V,Math.pow(Ct/(et-1),1.6)),wb:Y(N,V,Math.pow(ft/(et-1),1.6))})}return n.setSway(0,0,0,0),Z},x=(v,T,E,R,N,V)=>{if(!o)return;let O=v.clone().lerp(T,.5).add(Et(s.range(-.25,.25),s.range(.05,.3),s.range(-.25,.25))),Q=Fs([v,O,T],2);n.tube(Q,Q.map((Z,et)=>Y(E,.022,et/(Q.length-1))),3,()=>[.55,.4,.33,1],{uvScale:.6,sway:(Z,et)=>n.setSway(R.x,R.y,R.z,Y(N,V,et))}),n.setSway(0,0,0,0)},b=(v,T,E,R,N=-1,V=1)=>{c.push({c:v.clone(),r:T,rx:T*1.15,ry:T*.78*V,rz:T*1.15,anchor:E,w:R,type:N})},S=(v,T,E,R,N)=>{let V=E>1.1?2:1;for(let O=0;O<V;O++){let Q=T.clone().add(Et(s.range(-.7,.7)*E,s.range(-.1,.5)*E,s.range(-.7,.7)*E));x(v,Q,.06,R,N*.8,N)}},d=[];for(let v=4.5;v<48.5;v+=e.range(1.55,2.3)){let E=(50.4-v)/6.5*L+Math.PI+e.range(-.55,.55),R=!1;for(let N of Le){let V=Math.abs(be(N.th)-v),O=Math.abs(Math.atan2(Math.sin(E-N.th),Math.cos(E-N.th)));V<4.5&&O<N.w+.7&&(R=!0)}if(!R&&(d.push({y:v,az:E}),e()<.35)){let N=E+e.range(-.9,.9)+(e()<.5?.9:-.9);d.push({y:v+e.range(-.4,.4),az:N})}}for(let v of d){let{y:T,az:E}=v,R=$t(T),N=T<13,V=(N?e.range(4,6):e.range(4.8,7.4))*(T>40?1.12:1),O=e.range(-.22,.22),Q=e.range(.3,.55),Z=e.range(-.35,.35),et=s.range(.06,.12)*s.sign(),at=[Pt(R*.55,E,T-.35),Pt(R+.55,E+O*.1,T+.05),Pt(R+V*.3,E+O*.4+et,T+V*Q*.38+Z*.6),Pt(R+V*.58,E+O*.75-et*.6,T+V*Q*.78-Z*.3),Pt(R+V*.82,E+O*1+et*.3,T+V*Q*.98),Pt(R+V,E+O*1.2,T+V*Q)],J=at[5],ct=V/8,yt=Y(.42,.7,(V-4.5)/5),mt=g(at,yt,.05,J,0,ct,9,{per:4});v.r0=yt;let Ct=N?2:e.range(1,3.6)|0;for(let ft=0;ft<Ct;ft++){let It=e.range(.45,.85),Dt=mt[Math.round(It*(mt.length-1))],Zt=Et(Math.cos(E+O),0,Math.sin(E+O)),ne=Et(-Zt.z,0,Zt.x).multiplyScalar(e.sign()*e.range(.6,1)),se=e.range(1.8,3.4),ae=Dt.clone().addScaledVector(Zt,se*.55).addScaledVector(ne,se*.6).add(Et(0,se*e.range(.25,.6),0)),Oe=Dt.clone().lerp(ae,.5).add(Et(0,.15,0)),le=Dt.clone().lerp(ae,.25).add(Et(0,.12,0)),oe=ct*Math.pow(It,1.6);if(g([Dt,le,Oe,ae],Y(yt,.07,It)*.55,.035,J,oe,oe+.25,5,{fromTrunk:!1,collar:.25,per:3}),N)e()<.7&&b(ae.clone().add(Et(0,.12,0)),e.range(.35,.5),J,oe+.25,3,.7);else{let de=e.range(1.05,1.6);b(ae,de,J,oe+.25),S(ae,ae,de*.6,J,oe+.25)}}if(N){for(let ft of[.4,.62,.84]){let It=mt[Math.round(ft*(mt.length-1))];b(It.clone().add(Et(0,.22,0)),e.range(.38,.6),J,ct*Math.pow(ft,1.6),3,.6)}for(let ft=0;ft<3;ft++){let It=mt[Math.round((.55+ft*.15)*(mt.length-1))],Dt=It.clone().add(Et(s.range(-1,1),s.range(.5,1.3),s.range(-1,1)));x(It,Dt,.05,J,ct*.7,ct)}}else{let ft=e.range(1.5,2.2);b(J,ft,J,ct);let It=mt[Math.round(mt.length*.72)];b(It,e.range(1.2,1.8),J,ct*.6),S(mt[mt.length-4],J,ft*.6,J,ct)}}let P=6,m=[],F=[];for(let v=0;v<P;v++){let T=.45+v/P*L+e.range(-.18,.18),E=e.range(12.5,16),R=e.range(7,10);m.push(T+.05),F.push({az:T,L:E,up:R})}Ue=m;for(let v=0;v<P;v++){let{az:T,L:E,up:R}=F[v],N=[Pt(.8,T,53-3.5),Pt(2.6,T+.05,53+.4),Pt(5.4,T+.12,53+R*.45),Pt(E*.75,T+.2,53+R*.85),Pt(E,T+.26,53+R*.8)],V=N[4],O=g(N,1.75,.12,V,0,.9,o?10:8,{fromTrunk:!1,collar:.08,taper:1});for(let Q=0;Q<5;Q++){let Z=.32+Q*.15,et=O[Math.round(Z*(O.length-1))],at=T+e.range(-1.1,1.1),J=e.range(3.8,6.5),ct=et.clone().add(Et(Math.cos(at)*J,e.range(.6,3.4),Math.sin(at)*J)),yt=et.clone().lerp(ct,.5).add(Et(0,.6,0));g([et,yt,ct],Y(1.3,.14,Z)*.5,.05,V,.9*Z,1.1,6,{fromTrunk:!1,collar:.3,per:3});let mt=e.range(2.3,3.1);b(ct,mt,V,1.1),b(yt.clone().add(Et(0,1,0)),e.range(1.8,2.4),V,.9),e()<.6&&b(ct.clone().add(Et(0,-1.6,0)),e.range(1.4,1.9),V,1.1,-1,1.25)}b(V.clone().add(Et(0,.6,0)),e.range(2.6,3.3),V,.9),b(O[Math.round(O.length*.6)].clone().add(Et(0,1.5,0)),e.range(2.4,3),V,.6)}for(let v=0;v<14;v++){let T=e()*L,E=e.range(0,9);b(Pt(E,T,53+e.range(8.5,12)-E*.25),e.range(2.6,3.4),Pt(E,T,62),.6)}for(let v=0;v<6;v++){let T=e.range(-.8,1.6),E=$t(50.4)+e.range(1.2,4.5);b(Pt(E,T,50.4+e.range(3.6,5.5)),e.range(1.5,2.1),Pt(E,T,50.4+5),.5)}let z={},W=[];for(let v of Le){let T=Math.acos(At(2/v.out-1,-1,1))/Math.PI*v.w,E=v.th-T,R=v.th+T,N=r.sAtTheta(E),V=r.sAtTheta(R);r.sample(r.sAtTheta(v.th),z);let O=Et(z.x,z.y,z.z),Q=Et(z.sx,0,z.sz);{let Dt=Math.atan2(O.z,O.x),Zt=O.y-.34,ne=Math.hypot(O.x,O.z),se=$t(Zt-2.2),ae=.38+v.out*.03,Oe=[Pt(se*.6,Dt-.05,Zt-2.6),Pt(se+.6,Dt-.03,Zt-1.9),Pt(Y(se,ne,.45),Dt,Zt-ae-.55),Pt(ne-.4,Dt+.01,Zt-ae*.8-.06),Pt(ne+1.25,Dt+.02,Zt-.2),Pt(ne+1.9,Dt+.03,Zt+.5)],le=Fs(Oe,5),oe=le.length,de=0;for(;de<oe-1&&!f(le[de]);)de++;let Ze=le.map((Ce,Ie)=>{let Ki=Ie/(oe-1),Xi=Math.max(0,(Ie-de)/(oe-1));return(.05+(ae-.05)*Math.pow(1-Ki,.9))*(1+.5*Math.exp(-Xi*9))*(1+.06*ce(Ie*.6))});n.tube(le,Ze,9,p(ae),{uvScale:.6,shape:u(3,.12,4)});for(let Ce=0;Ce<oe-1;Ce+=2){let Ie=Math.min(oe-1,Ce+2);if(Ze[Ce]<.1)break;h.push({a:le[Ce].clone(),b:le[Ie].clone(),r:(Ze[Ce]+Ze[Ie])*.46,anchor:null,wa:0,wb:0})}let Qe=le[oe-1],Ks={blossom:0,green:1,gold:2,snow:3}[v.leaves];Ks===3?b(Qe.clone().add(Et(0,.1,0)),.45,Qe,.2,3,.7):b(Qe.clone().add(Et(0,.25,0)),.85,Qe,.3,Ks)}let Z={blossom:0,green:1,gold:2,snow:3}[v.leaves],et=be(v.th)+6.5*.5,at=$t(et),J=$t(be(v.th))+v.out+1.6,ct=v.th+e.range(-.12,.12),yt=[Pt(at*.55,ct,et-.2),Pt(at+.9,ct,et+.1),Pt(Y(at,J,.55),ct+.06,et+.75),Pt(J,ct+.12,et+1.35)],mt=yt[3],Ct=Z===3?.4:.75,ft=g(yt,.5,.07,mt,0,Ct,8);for(let Dt=0;Dt<2;Dt++){let Zt=Y(N,V,.32+Dt*.36);r.sample(Zt,z)}let It=v.nest?3:2;for(let Dt=0;Dt<It;Dt++){let Zt=Y(N,V,It===2?.3+Dt*.4:.2+Dt*.3);r.sample(Zt,z);let ne=ft[Math.round(Y(.55,.95,Dt/Math.max(1,It-1))*(ft.length-1))],se=Et(z.x,Math.max(z.y+3.9,ne.y+.3),z.z).addScaledVector(Et(z.sx,0,z.sz),e.range(.2,.9)),ae=ne.clone().lerp(se,.5).add(Et(0,.45,0));g([ne,ae,se],.16,.04,mt,Ct*.7,Ct,5,{fromTrunk:!1,collar:.3}),Z===3?b(se.clone().add(Et(0,.15,0)),.6,mt,Ct,3,.7):b(se.clone().add(Et(0,.35,0)),e.range(1.55,1.95),mt,Ct,Z)}Z!==3&&b(mt.clone().add(Et(0,.5,0)),e.range(1.6,2.1),mt,Ct,Z),v.nest&&W.push({c:O.clone(),out:Q})}for(let v=0;v<Is.length;v++){let T=Is[v],E=$t(0);for(let R of[-.12,.1]){let N=e.range(6.5,9.5),V=T+R,O=[Pt(E*.7,V,1.6),Pt(E+.9,V+R*.5,.55),Pt(E+N*.35,V+R*1.3+e.range(-.08,.08),.08),Pt(E+N*.6,V+R*1.8+e.range(-.1,.1),-.08),Pt(E+N*.82,V+R*2.2,0),Pt(E+N,V+R*2.5,-.5)];g(O,e.range(.6,.8)*(.85+yi[v]*.12),.14,O[5],0,0,9,{fromTrunk:!1,collar:.2,per:3})}}n.fixWinding();let X=new Kt,nt=o?72:56,rt=-4,ht=53+2.6,gt=o?.48:.6,pt=Math.ceil((ht-rt)/gt)+1,xt=new te.Vector3,Mt=3,_t=1/6.5,Wt=d.map(v=>({y:v.y,az:v.az})),C=(v,T,E)=>{let R=v+T*.105,N=St(1.2,4.5,T)*(1-St(50.5,53,T)),V=os(5*R+.4),O=os(3*(v+T*.06)+1.9),Q=St(0,-.55,V*.65+O*.35)*N,Z=St(.1,.3,V)*N,et=.5+.5*(.6*Math.sin(2*v+T*.17+1.3)+.4*Math.sin(3*v-T*.11+.4)),at=.5+.5*Math.sin(T*.31+Math.sin(v*2+.7)*1.2),J=Y(.95,1.02,et),ct=Y(.95,1,et),yt=Y(.97,.96,et),mt=St(.75,.95,at)*.06;J-=mt,ct-=mt*.7,J=Y(J,.8,Q*.55),ct=Y(ct,.68,Q*.55),yt=Y(yt,.62,Q*.55),J*=1+Z*.03,ct*=1+Z*.03,yt*=1+Z*.02;let Ct=1-St(-.5,3.2,T);J=Y(J,.6,Ct),ct=Y(ct,.53,Ct),yt=Y(yt,.5,Ct);let ft=St(44,53,T);return E[0]=J*Y(1,1.02,ft),E[1]=ct*Y(1,.99,ft),E[2]=yt*Y(1,.95,ft),E[3]=1-Q*.3,E},B=[0,0,0,0];for(let v=0;v<pt;v++){let T=Math.min(ht,rt+v*gt);for(let E=0;E<=nt;E++){let R=E/nt*L,N=qt(R,T),V=Math.cos(R),O=Math.sin(R);Vs(R,T,xt);let Q=1,Z=(R%L+L)%L;for(let et=Z;;et+=L){let at=be(et);if(at<-1)break;let J=1-St(.5,1.3,ss(et));if(J<=0)continue;let ct=at-T;ct>0&&ct<4?Q*=1-J*(.42*Math.exp(-((ct-.5)**2)/.35)+.18*Math.exp(-((ct-1.6)**2)/1.6)):ct<=0&&ct>-.6&&(Q*=1-J*.22*Math.exp(-(ct*ct)/.03))}Q*=.5+.5*St(-.6,2.2,T);for(let et of Wt){let at=T-et.y;if(Math.abs(at)>1.6)continue;let J=Math.atan2(Math.sin(R-et.az),Math.cos(R-et.az));Q*=1-.3*Math.exp(-(J*J)/.05-at*at/.6)*(at<0?1.2:.6)}T>52&&(Q*=1-.35*St(52,55.5,T)*St(3.2,1.8,N)),C(R,T,B),X.vert(V*N,T,O*N,xt.x,xt.y,xt.z,B[0],B[1],B[2],At(Q*B[3],.2,1),E/nt*Mt,T*_t)}}let D=nt+1;for(let v=0;v<pt-1;v++)for(let T=0;T<nt;T++){let E=v*D+T;X.quad(E,E+1,E+D+1,E+D)}let tt=X.vert(0,ht+.2,0,0,1,0,.7,.62,.55,.5,0,0);for(let v=0;v<nt;v++)X.tri(tt,(pt-1)*D+v+1,(pt-1)*D+v);let it=(v,T,E)=>{let R=qt(v,T)+E;return[Math.cos(v)*R,T,Math.sin(v)*R]},K=(v,T,E,R,N,V,O=.8)=>{let Q=qt(v,T),Z=14,et=X.count,at=(J,ct,yt)=>{let mt=v+J/Q,Ct=T+ct,ft=it(mt,Ct,V);Vs(mt,Ct,xt),X.vert(ft[0],ft[1],ft[2],xt.x,xt.y,xt.z,yt[0],yt[1],yt[2],yt[3],mt/L*Mt,Ct*_t)};at(0,0,N);for(let J of[.5,1])for(let ct=0;ct<Z;ct++){let yt=ct/Z*L,mt=Math.sin(yt);at(Math.cos(yt)*E*J,mt*Math.pow(Math.abs(mt),O)*R*J,N)}for(let J=0;J<Z;J++){let ct=(J+1)%Z;X.tri(et,et+1+J,et+1+ct);let yt=et+1+J,mt=et+1+ct;X.quad(yt,yt+Z,mt+Z,mt)}},q=(v,T,E,R,N,V,O)=>{let Q=qt(v,T),Z=E.length,et=X.count;for(let at=0;at<Z;at++){let[J,ct]=E[at],[yt,mt]=E[Math.min(Z-1,at+1)],[Ct,ft]=E[Math.max(0,at-1)],It=yt-Ct,Dt=mt-ft,Zt=Math.hypot(It,Dt)||1;It/=Zt,Dt/=Zt;let ne=Y(R,N,Math.pow(at/(Z-1),.8));for(let se of[-1,1]){let ae=J-Dt*ne*se,Oe=ct+It*ne*se,le=v+ae/Q,oe=T+Oe,de=it(le,oe,O);Vs(le,oe,xt),X.vert(de[0],de[1],de[2],xt.x,xt.y,xt.z,V[0],V[1],V[2],V[3],le/L*Mt,oe*_t)}}for(let at=0;at<Z-1;at++){let J=et+at*2;X.quad(J,J+1,J+3,J+2)}},k=[.13,.11,.1,.8],y=[.42,.35,.31,.85],H=(v,T,E)=>{let R=(v%L+L)%L;for(let N=R;N<60;N+=L){let V=be(N);if(T>V-1.3-E&&T<V+.5+E&&ss(N)<1.2)return!0}return!1},_=0,M=[];for(let v=0;v<600&&_<(o?22:18);v++){let T=s()*L,E=s.range(4,46.5);if(H(T,E,.4))continue;let R=!1;for(let V of Wt)Math.abs(V.y-E)<1.6&&Math.abs(Math.atan2(Math.sin(T-V.az),Math.cos(T-V.az)))<.6&&(R=!0);for(let V of M)Math.abs(V.y-E)<3.2&&Math.abs(Math.atan2(Math.sin(T-V.th),Math.cos(T-V.th)))<1.2&&(R=!0);if(R)continue;M.push({th:T,y:E});let N=s.range(.38,.75)*(s()<.18?1.5:1);K(T,E,N,N*s.range(.3,.42),k,.035,.9),N>.6&&K(T,E+N*.02,N*.42,N*.1,y,.05,.6),_++}for(let v of d){if(s()<.35||H(v.az,v.y+.6,0))continue;let T=v.r0||.5,E=v.y+T*1.45+.2,R=T*1.9+.3,N=s.range(-.08,.08);for(let V of[-1,1]){let O=[];for(let Q=0;Q<=5;Q++){let Z=Q/5;O.push([V*R*Z,-Z*T*.95+Math.sin(Z*Math.PI)*.1+N*V*Z])}q(v.az,E,O,.06+T*.07,.012,k,.035)}}X.fixWinding();for(let v=c.length-1;v>=0;v--){let T=c[v];for(let E=0;E<r.n;E+=2){let R=T.c.y-r.Y[E];if(R<-6||R>8)continue;let V=Math.hypot(T.c.x-r.X[E],T.c.z-r.Z[E])-1.2;if(V>T.rx||R-T.ry>2.2||R+T.ry<-.6)continue;let O=R>.8?R-2.2:-.6-R,Z=Math.max(V,O)/T.rx;if(Z<.45){T.r=0;break}T.r*=Z,T.rx*=Z,T.ry*=Z,T.rz*=Z}T.r<.3&&c.splice(v,1)}let w=[],A=[],I=[],U=[],st=[],ot=[0,0,0,0],ut=[];for(let v of c){is(v.c.y,ot);let T=v.type,E=Math.max(5,Math.round(i*At(v.r*v.r*(T===3?7:5.2),6,30))),R=e.range(-1,1),N=e.range(.94,1.05);for(let V=0;V<E;V++){let O=T;if(O<0){let It=e();for(O=0;O<3&&It>ot[O];)It-=ot[O],O++;O===3&&(O=ot[2]>.05?2:1)}let Q=e()*L,Z=Math.acos(e.range(-.85,1)),et=Math.pow(e(),.35),at=Math.sin(Z)*Math.cos(Q)*v.rx*et*.82,J=Math.cos(Z)*v.ry*et*.82,ct=Math.sin(Z)*Math.sin(Q)*v.rz*et*.82;w.push(v.c.x+at,v.c.y+J,v.c.z+ct),A.push(v.c.x,v.c.y,v.c.z,v.r);let yt=v.r*(O===3?e.range(.9,1.25):e.range(.85,1.2)),mt=e.range(-.36,.36)*(O===3?.6:1);I.push(yt,mt,O,e());let Ct=J/Math.max(.01,v.ry*.82),ft=N*(1+.07*Ct)*e.range(.97,1.03);O===0?U.push(ft*(1+R*.015),ft*(1-Math.abs(R)*.03),ft*(1+R*.03)):O===1?U.push(ft*(1+R*.07),ft*(1+R*.015),ft*(1-R*.08)):O===2?U.push(ft*(1+R*.02),ft*(1+R*.07),ft*(1-R*.06)):U.push(ft,ft,ft*1.01),st.push(v.anchor.x,v.anchor.y,v.anchor.z,v.w)}ut.push({c:v.c,rx:v.rx*.78,ry:v.ry*.78,rz:v.rz*.78,anchor:v.anchor,w:v.w,snow:T===3})}let $=new te.InstancedBufferGeometry,lt=new te.PlaneGeometry(1,1);$.setIndex(lt.index),$.setAttribute("position",lt.getAttribute("position")),$.setAttribute("iPos",new te.InstancedBufferAttribute(new Float32Array(w),3)),$.setAttribute("iCluster",new te.InstancedBufferAttribute(new Float32Array(A),4)),$.setAttribute("iData",new te.InstancedBufferAttribute(new Float32Array(I),4)),$.setAttribute("iTint",new te.InstancedBufferAttribute(new Float32Array(U),3)),$.setAttribute("iSway",new te.InstancedBufferAttribute(new Float32Array(st),4)),$.instanceCount=w.length/3,$.boundingSphere=new te.Sphere(Et(0,30,0),60);let j=l;for(let v of W){let T=E=>s()<.4?[.95*E,.74*E,.4*E,.95]:[.66*E,.43*E,.24*E,.9];for(let E=0;E<11;E++){let R=[],N=E/10,V=1.25+N*.55+s.range(-.08,.12),O=v.c.y-.62+N*.62,Q=s()*L,Z=s.range(2,4)|0;for(let J=0;J<=30;J++){let ct=Q+J/30*L*1.04,yt=.07*Math.sin(ct*5+E*2.1);R.push(Et(v.c.x+Math.cos(ct)*(V+yt),O+Math.sin(ct*Z+E)*.07,v.c.z+Math.sin(ct)*(V+yt)))}let et=s.range(.85,1.1),at=T(et);j.tube(R,R.map(()=>s.range(.055,.1)),5,()=>at,{capEnd:!1})}for(let E=0;E<22;E++){let R=s()*L,N=1.55+s.range(0,.2),V=Et(v.c.x+Math.cos(R)*N,v.c.y-s.range(.1,.5),v.c.z+Math.sin(R)*N),O=Et(Math.cos(R+s.range(-1.2,1.2)),s.range(-.3,.5),Math.sin(R+s.range(-1.2,1.2))).normalize(),Q=V.clone().addScaledVector(O,s.range(.6,1.2)),Z=T(s.range(.85,1.05));j.tube([V,V.clone().lerp(Q,.5).add(Et(0,.05,0)),Q],[.04,.03,.015],4,()=>Z,{capEnd:!1})}for(let E=0;E<3;E++){let R=Math.atan2(v.out.z,v.out.x)+Math.PI*.5+(E-1)*.35,N=Et(v.c.x+Math.cos(R)*1.15,v.c.y-.1,v.c.z+Math.sin(R)*1.15),V=new te.SphereGeometry(.2,12,8),O=V.getAttribute("position"),Q=V.getAttribute("normal"),Z=j.count;for(let at=0;at<O.count;at++){let J=O.getY(at)*1.3,ct=Math.sin(O.getX(at)*80)*Math.sin(O.getZ(at)*70)>.6?.72:1;j.vert(N.x+O.getX(at),N.y+J,N.z+O.getZ(at),Q.getX(at),Q.getY(at),Q.getZ(at),.66*ct,.86*ct,.95*ct,1,0,0)}let et=V.index.array;for(let at=0;at<et.length;at+=3)j.tri(Z+et[at],Z+et[at+1],Z+et[at+2])}}return j.fixWinding(),{trunk:X.build(),branches:n.build(),nest:j.count?j.build():null,leaves:$,caps:h,ellipsoids:ut}}var ns=.2,rs=class{constructor(){let t=[],e=0,s=0,a=0,i=0,o=.002;for(let h=0;h<=Ge+1e-6;h+=o){let c=Ps(h),p=Math.cos(h)*c,u=Math.sin(h)*c,f=be(h);t.length&&(e+=Math.hypot(p-s,f-a,u-i)),t.push(h,e),s=p,a=f,i=u}this.length=e;let n=Math.floor(e/ns)+1;this.n=n,this.TH=new Float32Array(n),this.X=new Float32Array(n),this.Y=new Float32Array(n),this.Z=new Float32Array(n),this.R=new Float32Array(n);let l=0;for(let h=0;h<n;h++){let c=h*ns;for(;l<t.length/2-2&&t[(l+1)*2+1]<c;)l++;let p=t[l*2+1],u=t[(l+1)*2+1],f=u>p?(c-p)/(u-p):0,g=t[l*2]+(t[(l+1)*2]-t[l*2])*At(f,0,1),x=Ps(g);this.TH[h]=g,this.R[h]=x,this.X[h]=Math.cos(g)*x,this.Z[h]=Math.sin(g)*x,this.Y[h]=be(g)}this.TX=new Float32Array(n),this.TY=new Float32Array(n),this.TZ=new Float32Array(n),this.SX=new Float32Array(n),this.SZ=new Float32Array(n);for(let h=0;h<n;h++){let c=Math.max(0,h-1),p=Math.min(n-1,h+1),u=this.X[p]-this.X[c],f=this.Y[p]-this.Y[c],g=this.Z[p]-this.Z[c],x=Math.hypot(u,f,g)||1;u/=x,f/=x,g/=x,this.TX[h]=u,this.TY[h]=f,this.TZ[h]=g;let b=-g,S=u,d=Math.hypot(b,S)||1;b/=d,S/=d,b*this.X[h]+S*this.Z[h]<0&&(b=-b,S=-S),this.SX[h]=b,this.SZ[h]=S}}sample(t,e){let s=At(t/ns,0,this.n-1.0001),a=Math.floor(s),i=s-a,o=n=>n[a]+(n[a+1]-n[a])*i;return e.x=o(this.X),e.y=o(this.Y),e.z=o(this.Z),e.tx=o(this.TX),e.ty=o(this.TY),e.tz=o(this.TZ),e.sx=o(this.SX),e.sz=o(this.SZ),e.th=o(this.TH),e.r=o(this.R),e}sAtTheta(t){let e=0,s=this.n-1;for(;s-e>1;){let i=e+s>>1;this.TH[i]<t?e=i:s=i}let a=(t-this.TH[e])/Math.max(1e-6,this.TH[s]-this.TH[e]);return(e+At(a,0,1))*ns}offTrunk(t){return this.R[t]-$t(this.Y[t])}};function wi(r){let t=Gt(5150),e=new Kt,s=r.n,a=1.9/2,i=.1,o={},n={},l=C=>1-St(1.3,2.2,C),h=C=>{let B=C.r-$t(C.y),D=l(B),tt=qt(C.th,C.y),it=C.r-tt+.16;return Y(.95,At(it,.62,1.4),D)},c=.37,p=.045,u=[];for(let C=.12;C<r.length-.3;C+=c){let B=C+p/2,D=C+c-p/2;r.sample(B,o),r.sample(D,n);let tt=o.r-$t(o.y),it=l(tt),K=h(o),q=h(n),k=a+t.range(-.03,.07),y=t.range(-.008,.01),H=t.range(-.012,.012),_=t()*4|0,M=t()<.5,w=t.range(.92,1.05),A=t()<.12?t.range(.8,.9):1,I=w*A*1.02,U=w*(A<1?A*.99:.96),st=w*(A<1?A*1.02:.88),ot=(O,Q,Z)=>[O.x+O.sx*Q,O.y+Z,O.z+O.sz*Q],ut=ot(o,-K,y-H),$=ot(o,k,y+H),lt=ot(n,-q,y-H),j=ot(n,k,y+H),v=1-(_+.88)/4,T=1-(_+.12)/4,E=M?1:0,R=M?0:1,N=Y(1,.55,it);{let O=-o.sx*H*3,Q=-o.sz*H*3,Z=e.vert(ut[0],ut[1],ut[2],O,1,Q,I,U,st,N,E,v),et=e.vert($[0],$[1],$[2],O,1,Q,I,U,st,1,R,v),at=e.vert(j[0],j[1],j[2],O,1,Q,I,U,st,1,R,T),J=e.vert(lt[0],lt[1],lt[2],O,1,Q,I,U,st,N,E,T);e.quad(Z,et,at,J)}let V=(O,Q,Z,et,at,J)=>{let yt=e.vert(O[0],O[1],O[2],Z,et,at,I*.72,U*.72,st*.72,.85,E,J),mt=e.vert(Q[0],Q[1],Q[2],Z,et,at,I*.72,U*.72,st*.72,.85,R,J),Ct=e.vert(Q[0],Q[1]-i,Q[2],Z,et,at,I*.72*.8,U*.72*.8,st*.72*.8,.6,R,J),ft=e.vert(O[0],O[1]-i,O[2],Z,et,at,I*.72*.8,U*.72*.8,st*.72*.8,.6,E,J);e.quad(yt,mt,Ct,ft)};V(ut,$,-o.tx,-o.ty,-o.tz,v),V(lt,j,n.tx,n.ty,n.tz,T),V($,j,o.sx,0,o.sz,(v+T)/2),it<.5&&V(ut,lt,-o.sx,0,-o.sz,(v+T)/2),u.push({s:C+c/2,hug:it,out:k,inA:K})}let f=.4,g=e.count,x=8,b=0,S=[.42,.3,.22];for(let C=0;C<=r.length+1e-6;C+=f){r.sample(Math.min(C,r.length-.001),o);let B=h(o)-.04,D=a-.1,tt=o.y-i,it=o.y-.34,K=o.x,q=o.z,k=o.sx,y=o.sz,H=l(o.r-$t(o.y)),_=C/2.2,[M,w,A]=S;e.vert(K-k*B,tt,q-y*B,0,1,0,M*.7,w*.7,A*.7,.45,.5,_),e.vert(K+k*D,tt,q+y*D,0,1,0,M*.7,w*.7,A*.7,.55,.5,_),e.vert(K+k*D,tt,q+y*D,k,0,y,M*1.25,w*1.25,A*1.25,.8,.1,_),e.vert(K+k*D,it,q+y*D,k,0,y,M*1.05,w*1.05,A*1.05,.6,.9,_),e.vert(K+k*D,it,q+y*D,0,-1,0,M,w,A,.6,.2,_),e.vert(K-k*B,it,q-y*B,0,-1,0,M,w,A,Y(.55,.35,H),.8,_),e.vert(K-k*B,it,q-y*B,-k,0,-y,M*1.2,w*1.2,A*1.2,.6,.9,_),e.vert(K-k*B,tt,q-y*B,-k,0,-y,M*1.2,w*1.2,A*1.2,.8,.1,_),b++}for(let C=0;C<b-1;C++){let B=g+C*x,D=B+x,tt=(it,K)=>e.quad(B+it,D+it,D+K,B+K);tt(0,1),tt(2,3),tt(4,5),tt(6,7)}e.fixWinding();let d=new Kt,P=[],m=[],F=C=>()=>[.62*C,.43*C,.28*C,1],z=(C,B,D)=>new Ds.Vector3(C,B,D),W=(C,B,D)=>(r.sample(C,o),z(o.x+o.sx*B,o.y+D,o.z+o.sz*B));for(let C=.5;C<r.length-.4;C+=2.25){r.sample(C,o);let D=o.r-$t(o.y)>2,tt=D?[1,-1]:[1];for(let it of tt){let K=it>0?a-.08:h(o)-.08,q=D?.62:.5,k=W(C,K*it,-.34+.04),y=W(C,K*it,q),H=t.range(.9,1.05);d.tube([k,y],[.06,.052],6,F(H),{capEnd:!1}),d.tube([y.clone().add(z(0,-.01,0)),y.clone().add(z(0,.08,0))],[.072,.03],6,F(H*.92),{capEnd:!0}),m.push({s:C,side:it,top:y.clone(),bridge:D})}}let X=[];for(let C of[1,-1]){let B=m.filter(D=>D.side===C);for(let D=0;D<B.length-1;D++){let tt=B[D],it=B[D+1];if(it.s-tt.s>2.25*1.6)continue;let K=[],q=tt.top.clone().add(z(0,-.04,0)),k=it.top.clone().add(z(0,-.04,0));for(let y=0;y<=1.0001;y+=.25){let H=q.clone().lerp(k,y);H.y-=Math.sin(y*Math.PI)*.11,K.push(H)}d.tube(K,K.map(()=>.026),4,()=>[.86,.74,.55,1],{capEnd:!1}),X.push({a:q,b:k,s:(tt.s+it.s)/2,side:C,bridge:tt.bridge&&it.bridge})}}for(let C=1.4;C<r.length-1;C+=3.1){if(r.sample(C,o),o.r-$t(o.y)>1.5)continue;let B=o.y-.34,D=z(o.x+o.sx*.15,B+.03,o.z+o.sz*.15),tt=qt(o.th,B-.95)-.12,it=z(Math.cos(o.th)*tt,B-.95,Math.sin(o.th)*tt),K=D.clone().lerp(it,.5).add(z(o.sx*.12,-.12,o.sz*.12)),q=[D,D.clone().lerp(K,.55),K.clone().lerp(it,.45),it];d.tube(q,[.085,.078,.08,.1],6,F(.85),{capEnd:!0,capStart:!0})}let nt=new Kt,rt=7;for(let C of m){if(C.side<0||C.s<rt||C.bridge||(r.sample(C.s,o),o.r-$t(o.y)>1.6))continue;rt=C.s+12.5;let B=o.sx,D=o.sz,tt=C.top.clone().add(z(0,.09,0)),it=tt.clone().add(z(B*.06,.32,D*.06)),K=tt.clone().add(z(B*.36,.3,D*.36));d.tube([tt,it,tt.clone().add(z(B*.2,.4,D*.2)),K],[.03,.028,.025,.022],5,F(.6),{capEnd:!0});let q=K.clone().add(z(0,-.3,0));d.tube([K,q.clone().add(z(0,.2,0))],[.008,.008],3,()=>[.2,.15,.12,1],{capEnd:!1});let k=z(B*.085,0,D*.085),y=z(-D*.085,0,B*.085),H=z(0,.12,0);nt.box(q,k,H,y,_=>[1,.84+.16*_.y,.7,1]),d.box(q.clone().add(z(0,.15,0)),k.clone().multiplyScalar(1.45),z(0,.028,0),y.clone().multiplyScalar(1.45),()=>[.32,.22,.15,1]),d.tube([q.clone().add(z(0,.17,0)),q.clone().add(z(0,.3,0))],[.1,.012],4,()=>[.32,.22,.15,1],{capEnd:!1,capStart:!0}),d.box(q.clone().add(z(0,-.14,0)),k.clone().multiplyScalar(1.15),z(0,.02,0),y.clone().multiplyScalar(1.15),()=>[.32,.22,.15,1]),P.push(q)}let ht=[[.93,.92,.88],[.86,.22,.2],[.24,.47,.8],[.28,.62,.38],[.95,.76,.26],[.86,.22,.2],[.93,.92,.88]],gt=(C,B,D,tt,it,K)=>{let k=z(B.x,0,B.z).normalize(),y=new Ds.Vector3().crossVectors(k,z(0,1,0)).normalize(),H=[];for(let _=0;_<=4;_++){let M=_/4,w=C.clone().add(z(0,-D*M,0)).addScaledVector(k,Math.sin(M*2.2)*K).addScaledVector(y,M*M*K*.6),A=tt*(1-M*.35);H.push([w.clone().addScaledVector(k,-A/2),w.clone().addScaledVector(k,A/2)])}for(let _ of[1,-1]){let M=d.count;for(let w=0;w<=4;w++)for(let A of H[w])d.vert(A.x,A.y,A.z,y.x*_,y.y*_,y.z*_,it[0],it[1],it[2],1,0,0);for(let w=0;w<4;w++){let A=M+w*2;d.quad(A,A+1,A+3,A+2)}}},pt=3;for(let C of X){if(C.s<pt)continue;pt=C.s+(C.bridge?t.range(1.5,2.5):t.range(3.5,6.5));let B=t.range(.3,.7),D=C.a.clone().lerp(C.b,B);D.y-=Math.sin(B*Math.PI)*.11+.02;let tt=C.b.clone().sub(C.a),it=2+(t()*2|0),K=t()*ht.length|0;for(let q=0;q<it;q++){let k=D.clone().addScaledVector(tt.clone().normalize(),(q-(it-1)/2)*.07);gt(k,tt,t.range(.32,.56),t.range(.075,.1),ht[(K+q*2)%ht.length],t.range(.04,.1))}d.box(D.clone().add(z(0,.01,0)),z(.035,0,0),z(0,.03,0),z(0,0,.035),()=>[.9,.85,.75,1])}let xt=(C,B,D,tt)=>{let it=d.count;d.vert(C.x,C.y+.01,C.z,0,1,0,1,.9,.45,1,0,0);let K=5;for(let q=0;q<=K*2;q++){let k=q/(K*2)*L,y=q%2===0?B:B*.45;d.vert(C.x+Math.cos(k)*y,C.y,C.z+Math.sin(k)*y,0,1,0,D[0],D[1],D[2],1,0,0)}for(let q=0;q<K*2;q++)d.tri(it,it+1+q,it+2+q)},Mt=(C,B,D,tt,it)=>{d.tube([C.clone().add(z(0,-.02,0)),C.clone().add(z(0,B,0))],[D*.32,D*.26],5,()=>[.95,.92,.85,1],{capEnd:!1});let K=8,q=d.count,k=C.clone().add(z(0,B+D*.55,0));d.vert(k.x,k.y,k.z,0,1,0,tt[0],tt[1],tt[2],1,0,0);for(let[y,H]of[[.7,.75],[1,.15]])for(let _=0;_<K;_++){let M=_/K*L,w=z(Math.cos(M)*y,H+.3,Math.sin(M)*y).normalize();d.vert(C.x+Math.cos(M)*D*y,C.y+B+D*.55*H,C.z+Math.sin(M)*D*y,w.x,w.y,w.z,tt[0],tt[1],tt[2],1,0,0)}for(let y=0;y<K;y++){let H=(y+1)%K;d.tri(q,q+1+y,q+1+H),d.quad(q+1+y,q+1+K+y,q+1+K+H,q+1+H)}if(it)for(let y=0;y<3;y++){let H=t()*L,_=D*t.range(.2,.6),M=C.clone().add(z(Math.cos(H)*_,B+D*.55*(.95-_/D*.6)+.006,Math.sin(H)*_));d.box(M,z(.018,0,0),z(0,.008,0),z(0,0,.018),()=>[1,.97,.9,1])}},_t=(C,B,D)=>{let tt=z(Math.cos(B)*.09,0,Math.sin(B)*.09),it=z(-Math.sin(B)*.05,0,Math.cos(B)*.05),K=d.count,q=[C.clone().add(tt),C.clone().add(it),C.clone().sub(tt),C.clone().sub(it)];for(let k of q)d.vert(k.x,k.y+.012,k.z,0,1,0,D[0],D[1],D[2],1,0,0);d.quad(K,K+1,K+2,K+3)},Wt=(C,B)=>{d.tube([C,C.clone().add(z(0,-B,0))],[.035,.004],4,()=>[.82,.92,1.05,1],{capEnd:!1})};for(let C=1.5;C<r.length-.5;C+=t.range(1.4,3.2)){r.sample(C,o);let B=o.r-$t(o.y),D=o.y,tt=B<1.5,it=h(o)-.22,K=z(o.x-o.sx*it,D+0,o.z-o.sz*it);if(D>37){if(!tt)continue;let q=2+(t()*3|0);for(let k=0;k<q;k++){let y=K.clone().add(z(t.range(-.18,.18),.012,t.range(-.18,.18)));xt(y,t.range(.045,.07),t()<.5?[1,.85,.9]:[1,.97,.95])}}else if(D>25){if(!tt)continue;let q=2+(t()*3|0);for(let k=0;k<q;k++){let y=K.clone().add(z(t.range(-.18,.18),.012,t.range(-.18,.18)));xt(y,t.range(.045,.07),t()<.6?[1,1,.96]:[1,.85,.35])}}else if(D>12.5){if(tt&&t()<.55){let k=1+(t()*3|0),y=t()<.6;for(let H=0;H<k;H++){let _=K.clone().add(z(t.range(-.15,.15),0,t.range(-.15,.15))),M=t.range(.7,1.15)*(H===0?1.2:.8);Mt(_,.11*M,.09*M,y?[.86,.2,.12]:[.62,.4,.24],y)}}let q=2+(t()*4|0);for(let k=0;k<q;k++){let y=t.range(-.8,.85),H=z(o.x+o.sx*y+t.range(-.25,.25),D,o.z+o.sz*y+t.range(-.25,.25));_t(H,t()*L,t.pick([[.98,.7,.2],[.95,.5,.15],[.85,.32,.14],[1,.82,.32]]))}}else{let q=2+(t()*3|0);for(let k=0;k<q;k++){let y=W(C+t.range(-.6,.6),a+.02,-.34+.02);Wt(y,t.range(.12,.45))}}}for(let C=6;C<r.length-3;C+=t.range(6,11)){r.sample(C,o);let B=o.y-t.range(1.6,3.6);if(B<3)continue;let D=o.th+t.range(-.2,.2),tt=1+(t()*3|0);for(let it=0;it<tt;it++){let K=B+it*.32+t.range(-.05,.05),q=D+t.range(-.1,.1),k=qt(q,K)-.05,y=Math.cos(q)*k,H=Math.sin(q)*k,_=z(Math.cos(q),0,Math.sin(q)),M=z(-Math.sin(q),0,Math.cos(q)),w=t.range(.22,.4)*(1-it*.2),A=w*t.range(.55,.75),I=8,U=d.count,st=[.8,.68,.52],ot=[.52,.38,.28];d.vert(y,K+.06,H,0,1,0,ot[0],ot[1],ot[2],.8,0,0);for(let $=0;$<=I;$++){let lt=$/I*Math.PI,j=z(y,K,H).addScaledVector(M,Math.cos(lt)*w).addScaledVector(_,Math.sin(lt)*A);d.vert(j.x,j.y,j.z,_.x*.3,.95,_.z*.3,st[0],st[1],st[2],1,0,0)}for(let $=0;$<I;$++)d.tri(U,U+1+$,U+2+$);let ut=d.count;d.vert(y,K-.07,H,0,-1,0,.45,.36,.3,.6,0,0);for(let $=0;$<=I;$++){let lt=$/I*Math.PI,j=z(y,K-.01,H).addScaledVector(M,Math.cos(lt)*w).addScaledVector(_,Math.sin(lt)*A);d.vert(j.x,j.y,j.z,0,-1,0,.92,.86,.74,.7,0,0)}for(let $=0;$<I;$++)d.tri(ut,ut+2+$,ut+1+$)}}return d.fixWinding(),{walkway:e.build(),rail:d.build(),glass:nt.build(),lanterns:P}}import*as Me from"three";var ze=19.5;function he(r,t){let e=Math.hypot(r,t),s=Math.atan2(t,r),a=ce(s*3.1+11)*.22+ce(e*.35+s*2)*.18,i=-.0016*e*e,o=-Math.pow(St(ze-3.2,ze,e),2)*1.1;return i+a*St(5,9,e)+o}var dt=(r,t,e)=>new Me.Vector3(r,t,e);function Mi(r,t){return new Me.CatmullRomCurve3(r,!1,"centripetal").getPoints((r.length-1)*t)}function cs(r,t){return .5*Math.sin(3*r+t*1.7)+.3*Math.sin(5*r+t*2.9+1.1)+.2*Math.sin(8*r+t*4.3+2.3)+.12*Math.sin(13*r+t*5.1)}function Ti(r){let t=Gt(77),e=Gt(78),s=new Kt,a=new Kt,i=new Kt,o={spheres:[],caps:[]},n=120,l=34,h=2.6;for(let k=0;k<=l;k++){let y=Y(h,ze,Math.pow(k/l,.9));for(let H=0;H<=n;H++){let _=H/n*L,M=Math.cos(_)*y,w=Math.sin(_)*y,A=he(M,w),I=.15,U=(he(M+I,w)-he(M-I,w))/(2*I),st=(he(M,w+I)-he(M,w-I))/(2*I),ot=dt(-U,1,-st).normalize(),ut=(he(M+.8,w)+he(M-.8,w)+he(M,w+.8)+he(M,w-.8))*.25-A,$=St(-.01,.05,ut),j=.95+.03*(.5+.5*Math.sin(y*2.1+cs(_,3)*2.5)),v=j*Y(1,.86,$),T=j*Y(1,.9,$),E=j*Y(1.02,1.03,$),R=1-St(0,2.6,y-qt(_,0));v=Y(v,.72,R*.6),T=Y(T,.66,R*.6),E=Y(E,.66,R*.6);let N=1-.45*R;s.vert(M,A,w,ot.x,ot.y,ot.z,v,T,E,N,M*.08,w*.08)}}let c=n+1;for(let k=0;k<l;k++)for(let y=0;y<n;y++){let H=k*c+y;s.quad(H,H+c,H+c+1,H+1)}s.fixWinding();let p=27,u=96,f=[0,.09,.19,.3,.42,.55,.69,.84,1],g=[[.86,.74,.64],[.7,.64,.72],[.8,.7,.66],[.6,.56,.66],[.74,.66,.66],[.56,.52,.62],[.66,.6,.66],[.5,.47,.57]],x=[];for(let k=0;k<f.length-1;k++)for(let y of[0,.06,.3,.6,.9])x.push({t:Y(f[k],f[k+1],y),k,u:y});x.push({t:1,k:f.length-2,u:1});let b=k=>(ze+.3)*Math.pow(1-k,1.25)*(k<.04?1+(.04-k)*2:1),S=(k,y,H,_)=>{let M=.07+.03*Math.sin(y*2.3),w=.55-H*(1+.12*cs(_,y+7)),A=1+.08*cs(_,k*2.5)+.03*Math.sin(17*_+k*6);return Math.max(.15,b(k)*A*(1+M*w*(k>.02?1:0)))},d=a.count,P=[];for(let k=0;k<x.length;k++){let{t:y,k:H,u:_}=x[k],M=-.75-y*p+(y<.05?y*6:0),w=[];for(let A=0;A<=u;A++){let I=A/u*L,U=k===x.length-1?.15:S(y,H,_,I);w.push(dt(Math.cos(I)*U,M,Math.sin(I)*U))}P.push(w)}let m=dt(0,0,0),F=dt(0,0,0),z=dt(0,0,0);for(let k=0;k<P.length;k++){let{t:y,k:H,u:_}=x[k];for(let M=0;M<=u;M++){let w=P[k][M],A=M===0?u-1:M-1,I=M===u?1:M+1;F.subVectors(P[k][I],P[k][A]),z.subVectors(P[Math.min(P.length-1,k+1)][M],P[Math.max(0,k-1)][M]),m.crossVectors(F,z).normalize(),m.x*w.x+m.z*w.z<0&&m.negate();let U=M/u*L,st=g[H],ot=Y(1.06,.84,_),ut=St(.15,.55,m.y)*(1-St(.35,.7,y))*(.75+.25*cs(U,11)),$=Y(st[0]*ot,.93,ut),lt=Y(st[1]*ot,.95,ut),j=Y(st[2]*ot,1,ut),v=Y(.95,.5,y)*Y(1,.75,St(.6,.95,_));a.vert(w.x,w.y,w.z,m.x,m.y,m.z,$,lt,j,v,M/u*8,w.y*.12)}}let W=u+1;for(let k=0;k<P.length-1;k++)for(let y=0;y<u;y++){let H=d+k*W+y;a.quad(H,H+1,H+W+1,H+W)}let X=a.count;for(let k=0;k<=3;k++){let y=k/3*Math.PI*.5;for(let H=0;H<=n;H++){let _=H/n*L,M=ze,w=Math.cos(_)*M,A=Math.sin(_)*M,I=he(w*.999,A*.999),U=M+Math.sin(y)*.45,st=Y(I,-.8,1-Math.cos(y)),ot=dt(Math.cos(_)*Math.sin(y),Math.cos(y),Math.sin(_)*Math.sin(y)).normalize();a.vert(Math.cos(_)*U,st,Math.sin(_)*U,ot.x,ot.y,ot.z,.95,.96,1,.95,0,0)}}for(let k=0;k<3;k++)for(let y=0;y<n;y++){let H=X+k*c+y;a.quad(H,H+1,H+c+1,H+c)}for(let k=0;k<706;k++)t();let nt=()=>[.52,.42,.36,.85];for(let k=0;k<18;k++){let y=e()*L,H=1+(e()*5|0),_=f[H]+.005,M=S(_,H,.9,y)*.94,w=-.75-_*p,A=e.range(4,11),I=[],U=Math.cos(y)*M,st=Math.sin(y)*M,ot=dt(-Math.sin(y),0,Math.cos(y)),ut=e.range(.5,1.1)*e.sign();for(let j=0;j<=8;j++){let v=j/8,T=Math.sin(Math.min(1,v*2.2)*Math.PI*.5)*.9,E=Math.sin(v*7+k)*ut*v;I.push(dt(U+Math.cos(y)*T+ot.x*E,w-Math.pow(v,1.3)*A,st+Math.sin(y)*T+ot.z*E))}let $=e.range(.13,.26),lt=Mi(I,1);if(a.tube(lt,lt.map((j,v)=>Y($,.02,Math.pow(v/(lt.length-1),.7))),5,nt),e()<.6){let j=I[3],v=[j,j.clone().add(dt(e.range(-.7,.7),-1.2,e.range(-.7,.7))),j.clone().add(dt(e.range(-1.2,1.2),-A*.35,e.range(-1.2,1.2)))];a.tube(Mi(v,3),[$*.45,$*.4,$*.3,$*.22,$*.15,$*.08,.015],4,nt)}}for(let k=0;k<9;k++){let y=e()*L,H=1+(e()*5|0),_=Y(f[H],f[H+1],.5),M=S(_,H,.5,y)*.97,w=dt(Math.cos(y)*M,-.75-_*p,Math.sin(y)*M),A=dt(Math.cos(y),-.25,Math.sin(y)).normalize();for(let I=0;I<4;I++){let U=A.clone().add(dt(e.range(-.5,.5),e.range(-.4,.3),e.range(-.5,.5))).normalize(),st=e.range(.5,1.3),ot=w.clone().addScaledVector(U,st),ut=e.range(.85,1.15);a.tube([w.clone().addScaledVector(U,-.2),w.clone().addScaledVector(U,st*.75),ot],[.13,.12,0],6,()=>[.62*ut,.45*ut,1.1*ut,1],{capEnd:!1})}}for(let k=0;k<26;k++){let y=e()*L,H=2+(e()*4|0);for(let _=0;_<H;_++){let M=y+e.range(-.04,.04),w=ze+.15,A=e.range(.4,2.4)*(_===0?1.3:.7),I=dt(Math.cos(M)*w,-.9,Math.sin(M)*w),U=I.clone().add(dt(0,-A,0));a.tube([I,I.clone().lerp(U,.4),U],[e.range(.09,.17),.07,.006],4,()=>[.8,.92,1.06,1])}}a.fixWinding();let rt=(k,y,H=.65)=>{let _=new Me.IcosahedronGeometry(1,y<1?1:2),M=_.getAttribute("position"),w=i.count,A=t()*100;for(let U=0;U<M.count;U++){let st=dt(M.getX(U),M.getY(U),M.getZ(U)),ot=1+.18*ce(st.x*3+A)+.12*ce(st.z*4+st.y*2+A);st.multiplyScalar(ot),st.y*=H;let ut=st.clone().normalize(),$=St(.25,.55,ut.y+.12*ce(st.x*5+A)),lt=st.multiplyScalar(y).add(k);i.vert(lt.x,lt.y,lt.z,ut.x,ut.y,ut.z,Y(.56,.95,$),Y(.53,.96,$),Y(.62,1.02,$),Y(.7,1,ut.y*.5+.5),0,0)}let I=_.index?_.index.array:null;if(I)for(let U=0;U<I.length;U+=3)i.tri(w+I[U],w+I[U+1],w+I[U+2]);else for(let U=0;U<M.count;U+=3)i.tri(w+U,w+U+1,w+U+2);o.spheres.push({c:k.clone().add(dt(0,y*H*.1,0)),r:y*.85,sy:H})},ht=(k,y)=>{i.tube([k.clone().add(dt(0,-.3,0)),k.clone().add(dt(0,y*.4,0))],[.055*y,.03*y],6,()=>[.38,.28,.22,.8]);let H=5,_=12;for(let M=0;M<H;M++){let w=M/(H-1),A=k.y+y*(.16+w*.6),I=y*Y(.34,.26,w),U=y*Y(.4,.14,w),st=e()*L,ot=i.count;i.vert(k.x,A+I,k.z,0,1,0,.93,.95,1,1,0,0);for(let $=0;$<_;$++){let lt=$/_*L,j=($+M)%3!==0,v=U*.55,T=dt(Math.cos(lt)*.8,.6,Math.sin(lt)*.8).normalize();i.vert(k.x+Math.cos(lt)*v,A+I*.48,k.z+Math.sin(lt)*v,T.x,T.y,T.z,j?.9:.16,j?.93:.3,j?.99:.27,.95,0,0)}for(let $=0;$<_;$++){let lt=$/_*L,j=$%2===0,v=U*(j?1.08:.86)*(1+.08*Math.sin(lt*3+st)),T=dt(Math.cos(lt)*.85,.45,Math.sin(lt)*.85).normalize();i.vert(k.x+Math.cos(lt)*v,A-(j?.1*y*.3:0),k.z+Math.sin(lt)*v,T.x,T.y,T.z,.12,.25,.22,.75,0,0)}let ut=i.vert(k.x,A+I*.1,k.z,0,-1,0,.08,.15,.14,.5,0,0);for(let $=0;$<_;$++){let lt=($+1)%_;i.tri(ot,ot+1+$,ot+1+lt),i.quad(ot+1+$,ot+1+_+$,ot+1+_+lt,ot+1+lt),i.tri(ut,ot+1+_+lt,ot+1+_+$)}}o.caps.push({a:k.clone(),b:k.clone().add(dt(0,y,0)),r:y*.22})},gt=(k,y,H)=>{let _=dt(-Math.cos(H),0,-Math.sin(H)),M=dt(-_.z,0,_.x),w=R=>[.64+R*.04,.61+R*.03,.68,.9],A=y*.72,I=8,U=[[0,.34],[A*.55,.33],[A*.92,.3],[A,.22]],st=i.count;for(let[R,N]of U)for(let V=0;V<I;V++){let O=V/I*L+Math.PI/8,Q=M.clone().multiplyScalar(Math.cos(O)*N).addScaledVector(_,Math.sin(O)*N*.7),Z=Q.clone().normalize(),et=w(R/y);i.vert(k.x+Q.x,k.y-.25+R,k.z+Q.z,Z.x,Z.y*0+.1,Z.z,et[0],et[1],et[2],R<.3?.6:.9,0,0)}for(let R=0;R<U.length-1;R++)for(let N=0;N<I;N++){let V=(N+1)%I;i.quad(st+R*I+N,st+R*I+V,st+(R+1)*I+V,st+(R+1)*I+N)}let ot=k.clone().add(dt(0,A-.25+y*.13,0)),ut=new Me.SphereGeometry(y*.16,8,6),$=ut.getAttribute("position"),lt=i.count;for(let R=0;R<$.count;R++){let N=dt($.getX(R),$.getY(R)*1.15,$.getZ(R)),V=N.clone().normalize(),O=V.y>.45?1:0;i.vert(ot.x+N.x,ot.y+N.y,ot.z+N.z,V.x,V.y,V.z,Y(.66,.95,O),Y(.63,.96,O),Y(.7,1,O),.95,0,0)}let j=ut.index.array;for(let R=0;R<j.length;R+=3)i.tri(lt+j[R],lt+j[R+1],lt+j[R+2]);let v=ot.clone().addScaledVector(_,y*.155),T=()=>[.3,.28,.34,.7];for(let R of[-1,1])i.box(v.clone().addScaledVector(M,R*y*.055).add(dt(0,y*.03,0)),M.clone().multiplyScalar(y*.035),dt(0,y*.008,0),_.clone().multiplyScalar(.02),T);i.box(v.clone().add(dt(0,-y*.045,0)),M.clone().multiplyScalar(y*.075),dt(0,y*.01,0),_.clone().multiplyScalar(.02),T);let E=k.clone().add(dt(0,A*.62-.25,0)).addScaledVector(_,.25);i.box(E,M.clone().multiplyScalar(.17),dt(0,.05,0),_.clone().multiplyScalar(.05),()=>[.58,.55,.62,.85]),i.box(E.clone().add(dt(0,.1,0)).addScaledVector(_,.03),M.clone().multiplyScalar(.05),dt(0,.07,0),_.clone().multiplyScalar(.04),()=>[.6,.57,.64,.85]),i.box(k.clone().add(dt(0,A*.35-.25,0)),M.clone().multiplyScalar(.345),dt(0,.035,0),_.clone().multiplyScalar(.245),()=>[.42,.4,.48,.8]),o.caps.push({a:k.clone(),b:k.clone().add(dt(0,y,0)),r:.3})},pt=(k,y)=>{let H=Math.cos(k)*y,_=Math.sin(k)*y;return dt(H,he(H,_),_)},xt=[[2.3,8.5,"rock",1.1],[3,9.6,"pine",2.6],[3.7,8.2,"stone",1.7],[4.6,9.5,"rock",.9],[1.5,9.9,"pine",3.1],[.6,11.5,"rock",1.6],[5.5,11,"pine",3.4],[6,13.5,"rock",1.3],[2.6,14.5,"pine",3.8],[4,15.5,"pine",2.9],[1,16,"stone",2],[5.1,16.4,"rock",2.2],[3.3,12.4,"stone",1.4]];for(let[k,y,H,_]of xt){let M=pt(k,y);H==="rock"?rt(M,_):H==="pine"?ht(M,_):gt(M,_,k)}for(let k=0;k<16;k++){let y=t()*L,H=t.range(12,ze-1.5);rt(pt(y,H),t.range(.35,.9))}for(let[k,y,H]of[[.15,17.6,2.2],[.32,18.2,1.6],[5.85,17.8,2.5],[2,17.9,1.8]])ht(pt(k,y),H);{let k=r+.75,y=pt(k,15.8);for(let w=0;w<9;w++){let A=w<5?0:w<8?1:2,I=e()*L,U=[.75,.42,0][A]*e.range(.8,1.1),ot=new Me.IcosahedronGeometry(1,1).getAttribute("position"),ut=i.count,$=[.45,.36,.3][A],lt=y.clone().add(dt(Math.cos(I)*U,.1+A*.42,Math.sin(I)*U));for(let j=0;j<ot.count;j++){let v=dt(ot.getX(j),ot.getY(j)*.7,ot.getZ(j)),T=v.clone().normalize(),E=St(.4,.7,T.y);i.vert(lt.x+v.x*$,lt.y+v.y*$,lt.z+v.z*$,T.x,T.y,T.z,Y(.6,.95,E),Y(.57,.96,E),Y(.66,1,E),.85,0,0)}for(let j=0;j<ot.count;j+=3)i.tri(ut+j,ut+j+1,ut+j+2)}let H=y.clone().add(dt(0,.6,0)),_=y.clone().add(dt(0,3.1,0));i.tube([H,_],[.07,.05],6,()=>[.45,.32,.22,1]);let M=[[.24,.47,.8],[.93,.92,.88],[.86,.22,.2],[.28,.62,.38],[.95,.76,.26]];for(let w=0;w<10;w++){let A=w/10*L,I=_.clone().add(dt(0,-.05-w%2*.12,0)),U=y.clone().add(dt(Math.cos(A)*1.6,.35,Math.sin(A)*1.6)),st=U.clone().sub(I),ot=dt(-Math.sin(A),0,Math.cos(A)).multiplyScalar(.06),ut=new Me.Vector3().crossVectors(st,ot).normalize(),$=M[w%M.length];for(let lt of[1,-1]){let j=i.count;for(let v=0;v<=4;v++){let T=v/4,E=I.clone().lerp(U,T).add(dt(0,-Math.sin(T*Math.PI)*.25,0));i.vert(E.x-ot.x,E.y,E.z-ot.z,ut.x*lt,ut.y*lt,ut.z*lt,$[0],$[1],$[2],1,0,0),i.vert(E.x+ot.x,E.y,E.z+ot.z,ut.x*lt,ut.y*lt,ut.z*lt,$[0],$[1],$[2],1,0,0)}for(let v=0;v<4;v++)i.quad(j+v*2,j+v*2+1,j+v*2+3,j+v*2+2)}}o.caps.push({a:y.clone(),b:_.clone(),r:.55})}let Mt=new Kt;{let k=pt(.2,13.2),y=40,H=w=>2.6+.4*ce(w*3+2)*0+.35*Math.sin(3*w+.7)+.2*Math.sin(5*w+2.1),_=Mt.vert(k.x,k.y+.03,k.z,0,1,0,.36,.56,.82,1,.5,.5);for(let w of[.55,1])for(let A=0;A<y;A++){let I=A/y*L,U=H(I)*w,st=w<1?[.5,.7,.92]:[.74,.88,1];Mt.vert(k.x+Math.cos(I)*U*1.3,k.y+.03,k.z+Math.sin(I)*U,0,1,0,st[0],st[1],st[2],1,0,0)}for(let w=0;w<y;w++){let A=(w+1)%y;Mt.tri(_,_+1+w,_+1+A),Mt.quad(_+1+w,_+1+y+w,_+1+y+A,_+1+A)}Mt.fixWinding();let M=[];for(let w=0;w<=y;w++){let A=w/y*L,I=H(A)+.12;M.push(dt(k.x+Math.cos(A)*I*1.3,k.y+.02,k.z+Math.sin(A)*I))}i.tube(M,M.map((w,A)=>.16+.06*Math.sin(A*1.7)),5,()=>[.95,.97,1.02,1],{capEnd:!1})}i.fixWinding();let _t=new Kt,Wt=new Kt,C=r,B=qt(C,1.2),D=dt(Math.cos(C)*(B+.04),0,Math.sin(C)*(B+.04)),tt=dt(Math.cos(C),0,Math.sin(C)),it=dt(-Math.sin(C),0,Math.cos(C)),K=1.25,q=2.5;{let y=_t.vert(D.x+tt.x*.02,D.y+q*.45,D.z+tt.z*.02,tt.x,0,tt.z,1,1,1,1,.5,.45),H=[];for(let _=0;_<=24;_++){let M=_/24,w,A;if(M<.25)w=-K,A=M/.25*(q-K);else if(M<.75){let I=Math.PI-(M-.25)/.5*Math.PI;w=Math.cos(I)*K,A=q-K+Math.sin(I)*K}else w=K,A=(1-(M-.75)/.25)*(q-K);H.push([w,A])}for(let[_,M]of H){let w=C+_/B,A=qt(w,M)+.03;_t.vert(Math.cos(w)*A,M,Math.sin(w)*A,tt.x,0,tt.z,1,1,1,1,_/(2*K)+.5,M/q)}for(let _=0;_<24;_++)_t.tri(y,y+1+_,y+2+_);_t.fixWinding();for(let _ of[-1,1])for(let M=0;M<2;M++){let w=[],A=M*.22;for(let U=0;U<=10;U++){let st=U/10,ot=Math.PI*(_<0?1-st*.56:st*.56),ut=Math.sin(st*9+M*2+_)*.07*M,$=Math.cos(ot)*(K+.18+A*.6+ut),lt=st<.01?-.3:q-K+Math.sin(ot)*(K+.2+A+ut)*Math.min(1,st*3),j=C+$/B,v=qt(j,Math.max(lt,0))+.18+M*.08;w.push(dt(Math.cos(j)*v,Math.max(lt,-.3),Math.sin(j)*v))}let I=M?.18:.34;Wt.tube(w,w.map((U,st)=>Y(I,I*.4,st/10)*(1+.12*Math.sin(st*1.9))),7,()=>M?[.62,.5,.42,.85]:[.55,.42,.34,.85])}Wt.fixWinding()}return{top:s.build(),rock:a.build(),props:i.build(),pond:Mt.build(),gate:_t.build(),gateFrame:Wt.build(),gatePos:D.clone().add(dt(0,q*.45,0)),gateOut:tt,gateSide:it,occ:o}}import*as zt from"three";var hs=(r,t,e)=>new zt.Vector3(r,t,e);function zi(r,t,e){let s=new zt.Group,a=new zt.Mesh(new zt.SphereGeometry(500,32,16),null);a.frustumCulled=!1,a.renderOrder=10;let i=new zt.ShaderMaterial({vertexShader:`
			varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${bt}
			${Ot}
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
				float lit = clamp((d - dl) * 8.0 + 0.5, 0.0, 1.0);
				float dens = smoothstep(0.3, 0.7, d);
				// tepeler \u0131\u015F\u0131kta parlar, aralar mevsimin doygun g\xF6lge renginde
				vec3 c = mix(uCloudShade, uCloudCol, dens * (0.4 + 0.6 * lit));
				// kabar\u0131k tepelerin g\xFCne\u015Fe bakan kenar\u0131 \u0131\u015F\u0131kla yanar
				c += uSunCol * 0.12 * lit * dens * (1.0 - dens) * 4.0;
				vec3 v = normalize(vW - cameraPosition);
				float sd = max(dot(v, uSunDir), 0.0);
				// g\xFCne\u015F yolu: g\xFCne\u015Fe bak\u0131nca bulut denizi alt\u0131n gibi \u0131\u015F\u0131ldar
				c += uFogSun * (pow(sd, 5.0) * 0.45 + pow(sd, 28.0) * 0.7) * (0.3 + dens);
				float dist = length(vW.xz - cameraPosition.xz);
				// uzakta g\xF6\u011F\xFCn ufkuyla ayn\u0131 renge kar\u0131\u015F\u0131r (diki\u015Fsiz ufuk)
				c = mix(c, mix(uFogCol, uFogSun, pow(sd, 4.0)), smoothstep(140.0, 600.0, dist) * 0.96);
				gl_FragColor = finish(c, 1.0);
			}`,uniforms:{...r,uNoise:{value:t.cloudNoise}}}),o=new zt.Mesh(new zt.PlaneGeometry(1800,1800,1,1).rotateX(-Math.PI/2),i);o.position.y=-48,o.frustumCulled=!1,o.renderOrder=5;let n=Gt(2024),l=e.clouds,h=[],c=[],p=[];for(let d=0;d<l;d++){let P=d/l*L+n.range(-.3,.3),m=n.range(95,240);p.push({x:Math.cos(P)*m,y:n.range(-34,26),z:Math.sin(P)*m,s:n.range(30,72),k:n()})}p.sort((d,P)=>Math.hypot(P.x,P.z)-Math.hypot(d.x,d.z));for(let d of p)h.push(d.x,d.y,d.z),c.push(d.s,d.s*n.range(.45,.62),d.k,n()*L);let u=new zt.InstancedBufferGeometry,f=new zt.PlaneGeometry(1,1);u.setIndex(f.index),u.setAttribute("position",f.getAttribute("position")),u.setAttribute("iPos",new zt.InstancedBufferAttribute(new Float32Array(h),3)),u.setAttribute("iData",new zt.InstancedBufferAttribute(new Float32Array(c),4)),u.instanceCount=p.length;let g=new zt.ShaderMaterial({vertexShader:`
			${bt}
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
			${bt}
			${Ot}
			uniform sampler2D uMap; uniform vec3 uCloudCol, uCloudShade;
			varying vec2 vUv; varying vec3 vW; varying float vK;
			void main() {
				vec4 t = texture2D(uMap, vUv);
				float a = clamp(t.a * 1.5, 0.0, 1.0);
				if (a < 0.01) discard;
				vec3 v = normalize(vW - cameraPosition);
				float sd = max(dot(v, uSunDir), 0.0);
				vec3 c = mix(uCloudShade, uCloudCol, t.g);
				// kontra \u0131\u015F\u0131kta kenarlar \u0131\u015F\u0131k renginde yanar
				c += uFogSun * pow(sd, 5.0) * (1.0 - a) * 1.8;
				c += uSunCol * 0.1 * t.g * (1.0 - a);
				float dist = length(vW - cameraPosition);
				c = mix(c, mix(uFogCol, uFogSun, pow(sd, 4.0)), smoothstep(120.0, 420.0, dist) * 0.55);
				vec4 o = finish(c, 1.0);
				gl_FragColor = vec4(o.rgb * clamp(a, 0.0, 1.0), clamp(a, 0.0, 1.0));
			}`,uniforms:{...r,uMap:{value:t.cloud}},transparent:!0,depthWrite:!1,blending:zt.CustomBlending,blendSrc:zt.OneFactor,blendDst:zt.OneMinusSrcAlphaFactor}),x=new zt.Mesh(u,g);x.frustumCulled=!1,x.renderOrder=20;let b=new Kt,S=[[1,.72,.82],[.42,.66,.3],[.95,.66,.24],[.92,.94,1],[.98,.78,.86],[.5,.7,.34],[.9,.55,.22]];for(let d=0;d<7;d++){let P=d/7*L+.5+n.range(-.2,.2),m=n.range(115,210),F=hs(Math.cos(P)*m,n.range(-22,18),Math.sin(P)*m),z=n.range(5,11),W=S[d],X=18,nt=b.count;for(let ht=0;ht<=4;ht++){let gt=ht/4,pt=z*Math.pow(1-gt,1.3)+.2;for(let xt=0;xt<=X;xt++){let Mt=xt/X*L,_t=1+.15*ce(Mt*3+d*7+gt*2);b.vert(F.x+Math.cos(Mt)*pt*_t,F.y-gt*z*1.6,F.z+Math.sin(Mt)*pt*_t,Math.cos(Mt),-.3,Math.sin(Mt),.6,.52,.58,.8,0,0)}}for(let ht=0;ht<4;ht++)for(let gt=0;gt<X;gt++){let pt=nt+ht*(X+1)+gt;b.quad(pt,pt+1,pt+X+2,pt+X+1)}let rt=b.vert(F.x,F.y+.3,F.z,0,1,0,W[0]*.9,W[1]*.9,W[2]*.9,1,0,0);for(let ht=0;ht<=X;ht++){let gt=ht/X*L,pt=1+.15*ce(gt*3+d*7);b.vert(F.x+Math.cos(gt)*(z+.2)*pt,F.y,F.z+Math.sin(gt)*(z+.2)*pt,0,1,0,W[0]*.85,W[1]*.85,W[2]*.85,1,0,0)}for(let ht=0;ht<X;ht++)b.tri(rt,rt+1+ht,rt+2+ht);for(let ht=0;ht<4;ht++){let gt=n()*L,pt=n.range(0,z*.7),xt=hs(F.x+Math.cos(gt)*pt,F.y,F.z+Math.sin(gt)*pt),Mt=n.range(1.6,3.4);b.tube([xt,xt.clone().add(hs(0,Mt,0))],[.18,.1],5,()=>[.85,.82,.8,1]);let Wt=new zt.IcosahedronGeometry(Mt*.55,1).getAttribute("position"),C=b.count;for(let B=0;B<Wt.count;B++){let D=hs(Wt.getX(B),Wt.getY(B),Wt.getZ(B)).normalize();b.vert(xt.x+Wt.getX(B),xt.y+Mt+Wt.getY(B)*.8,xt.z+Wt.getZ(B),D.x,D.y,D.z,W[0],W[1],W[2],1,0,0)}for(let B=0;B<Wt.count;B+=3)b.tri(C+B,C+B+1,C+B+2)}}return b.fixWinding(),s.add(o,x),{group:s,dome:a,farGeo:b.build()}}function _i(r,t){let e=new zt.ShaderMaterial({vertexShader:`
			${bt}
			${He}
			uniform float uSize;
			varying vec2 vUv;
			varying float vVis;
			float sunVis(vec3 p) {
				vec4 sc = uShadowMat * vec4(p, 1.0);
				vec2 e = abs(sc.xy - 0.5);
				if (max(e.x, e.y) > 0.49 || sc.z > 1.0) return trunkShadow(p);
				return texture(uShadowMap, vec3(sc.xy, sc.z - uShadowP.z));
			}
			void main() {
				vec3 r0 = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
				vec3 u0 = cross(r0, uSunDir);
				float v = sunVis(cameraPosition + r0 * 0.3) + sunVis(cameraPosition - r0 * 0.3);
				v += sunVis(cameraPosition + u0 * 0.3) + sunVis(cameraPosition - u0 * 0.3);
				vVis = v * 0.25;
				vec3 c = cameraPosition + uSunDir * 420.0;
				vec3 toCam = normalize(cameraPosition - c);
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				vec3 w = c + (right * position.x + up * position.y) * uSize;
				vUv = position.xy + 0.5;
				vec4 p = projectionMatrix * viewMatrix * vec4(w, 1.0);
				gl_Position = p.xyww;
			}`,fragmentShader:`
			uniform vec3 uSunGlow, uSunDisc; uniform float uK;
			varying vec2 vUv;
			varying float vVis;
			void main() {
				vec2 q = vUv - 0.5;
				float r = length(q) * 2.0;
				float fall = max(1.0 - r, 0.0);
				float core = exp(-r * 18.0);
				float halo = exp(-r * 4.5) * fall * fall;
				float ring = exp(-(r - 0.6) * (r - 0.6) * 300.0) * fall;
				vec3 c = uSunGlow * (halo * 0.3 + ring * 0.035) + uSunDisc * core * 0.85;
				gl_FragColor = vec4(c * vVis * uK, 1.0);
			}`,uniforms:{...t,uSize:{value:140},uK:{value:1}},transparent:!0,depthWrite:!1,depthTest:!1,blending:zt.AdditiveBlending}),s=new zt.Mesh(new zt.PlaneGeometry(1,1),e);return s.frustumCulled=!1,s.renderOrder=30,s}import*as Ee from"three";var Bs=[{speed:1.55,wind:.22,elev:[40,34],sunStart:Math.PI*.55,burn:.7,drops:[[.42,-.2],[.78,.3]],hints:["drag","hide"]},{speed:1.6,wind:.28,elev:[34,30],sunStart:Math.PI,burn:.9,drops:[[.22,.4],[.5,0],[.58,.45],[.86,-.3]],gust:{every:11,dur:2.2,power:.5,from:6},crystals:[[.8,1,4.6,3.2]],locks:[.45],hints:["bridge","crystal"]},{speed:1.65,wind:.25,elev:[62,56],sunStart:Math.PI,burn:1,drops:[[.18,.5],[.47,.2],[.53,.5],[.74,-.4],[.92,.35]],crystals:[[.3,1,4.8,3.3],[.72,-1,4.4,3]],locks:[.6],hints:["ledge"]},{speed:1.65,wind:.3,elev:[56,48],sunStart:Math.PI,burn:1.05,drops:[[.2,-.3],[.5,.3],[.56,-.2],[.62,.45],[.88,.3]],gust:{every:9,dur:2.4,power:.75,from:5},crystals:[[.25,-1,4.6,3.2],[.78,1,5,3.4]],locks:[.38],hints:["wait"]},{speed:1.7,wind:.3,elev:[30,24],sunStart:Math.PI,burn:1.1,drops:[[.16,.4],[.36,-.3],[.55,.5],[.72,.1],[.9,-.4]],gust:{every:7.5,dur:2.8,power:1.15,from:3},crystals:[[.35,1,4.6,3.2],[.68,-1,4.8,3.2]],locks:[.5],hints:["gust"]},{speed:1.72,wind:.38,elev:[24,18],sunStart:Math.PI,burn:1.15,drops:[[.16,.3],[.26,-.2],[.45,.5],[.58,-.2],[.64,.4],[.97,.3]],gust:{every:6,dur:3,power:1.55,from:2.5},crystals:[[.22,1,4.6,3],[.55,-1,5,3.3],[.85,1,4.4,3.2]],locks:[.32,.72]},{speed:1.75,wind:.18,elev:[16,11],sunStart:Math.PI,burn:1.2,drops:[[.2,.45],[.4,-.2],[.55,.5],[.7,.2],[.9,.45]],gust:{every:10,dur:2.2,power:.6,from:5},crystals:[[.3,-1,4.6,3],[.6,1,4.8,3.2],[.88,-1,4.4,3]],locks:[.45,.8]},{speed:1.7,wind:.15,elev:[10,4],sunStart:Math.PI,burn:1.2,drops:[[.15,.4],[.35,-.3],[.52,.5],[.76,0],[.88,.45]],crystals:[[.28,1,4.6,3],[.62,-1,4.8,3]],locks:[.5],hints:["gate"],finale:!0}];function Ls(r){return{...Se[r],...Bs[r],index:r}}var qe=Se.length;function Si(r,t){if(!r||t<r.from)return 0;let e=(t-r.from)%r.every;if(e>r.dur)return 0;let s=Math.sin(e/r.dur*Math.PI);return r.power*s*s}function Ws(r,t){if(!r)return 1/0;if(t<r.from)return r.from-t;let e=(t-r.from)%r.every;return e>r.dur?r.every-e:0}function us(r,t){let e=Se[t],s=r.sAtTheta(e.from)+(t===0?1.2:.5),a=r.sAtTheta(e.to)-(e.finale?.4:.5);return[s,a]}var Qt=(r=0,t=0,e=0)=>new Ee.Vector3(r,t,e),oa={spring:[1,.86,.94],summer:[1,.86,.55],autumn:[1,.72,.4],winter:[.78,.92,1.08]};function Ei(r,t){let e=[],s=new Kt,a=new Kt,i={};return t.forEach((o,n)=>{let l=Bs[n];if(!l.crystals)return;let[h,c]=us(r,n);for(let[p,u,f,g]of l.crystals){let x=h+(c-h)*p;r.sample(x,i);let b=Qt(i.x,i.y+.45,i.z),S=Math.atan2(i.z,i.x),d=i.y+g,P=S+u*1.15,m;for(let M=0;M<8;M++){let w=$t(d)+f;m=Qt(Math.cos(P)*w,d,Math.sin(P)*w);let A=Qt().subVectors(b,m),I=-(m.x*A.x+m.z*A.z)/(A.x*A.x+A.z*A.z);if((I>0&&I<1?Math.hypot(m.x+A.x*I,m.z+A.z*I):99)>$t(d)+.5)break;P+=u*.1}let F=Y(l.elev[0],l.elev[1],p),z=Ne(S+Math.PI,F,Qt()),W=Qt().subVectors(b,m).normalize(),X=Qt().addVectors(z,W).normalize(),nt=oa[o.season],rt=$t(d-.4),ht=Qt(Math.cos(P-u*.12)*rt*.75,d-.7,Math.sin(P-u*.12)*rt*.75),gt=Qt(Math.cos(P-u*.08)*(rt+1.2),d-.55,Math.sin(P-u*.08)*(rt+1.2)),pt=Qt(Math.cos(P-u*.02)*(rt+f*.62),d-.85,Math.sin(P-u*.02)*(rt+f*.62)),xt=m.clone().addScaledVector(X,-.36),_t=new Ee.CatmullRomCurve3([ht,gt,pt,xt]).getPoints(14);a.setSway(m.x,m.y,m.z,0),a.tube(_t,_t.map((M,w)=>Y(.2,.05,Math.pow(w/14,.7))),6,(M,w)=>[Y(1,.55,w),Y(1,.42,w),Y(1,.36,w),.9],{sway:(M,w)=>a.setSway(m.x,m.y,m.z,.45*Math.pow(w,1.6))});let Wt=Math.abs(X.y)>.9?Qt(1,0,0):Qt(0,1,0),C=Qt().crossVectors(X,Wt).normalize(),B=Qt().crossVectors(X,C).normalize(),D=8,tt=(M,w)=>{let A=[];for(let I=0;I<D;I++){let U=I/D*Math.PI*2+.2;A.push(m.clone().addScaledVector(C,Math.cos(U)*.42*M).addScaledVector(B,Math.sin(U)*.64*M).addScaledVector(X,w))}return A},it=tt(1,0),K=tt(1,-.05),q=tt(.56,.15),k=m.clone().addScaledVector(X,.15),y=m.clone().addScaledVector(X,-.36),H=e.length;s.setSway(m.x,m.y,m.z,.45);let _=(M,w,A)=>{let I=Qt().crossVectors(Qt().subVectors(w,M),Qt().subVectors(A,M)).normalize(),U=Qt().add(M).add(w).add(A).multiplyScalar(1/3).sub(m);if(I.dot(U)<0){I.negate();let st=w;w=A,A=st}for(let st of[M,w,A])s.vert(st.x,st.y,st.z,I.x,I.y,I.z,nt[0],nt[1],nt[2],H,0,0);s.tri(s.count-3,s.count-2,s.count-1)};for(let M=0;M<D;M++){let w=(M+1)%D;_(k,q[M],q[w]),_(q[M],it[M],it[w]),_(q[M],it[w],q[w]),_(it[M],K[M],K[w]),_(it[M],K[w],it[w]),_(y,K[w],K[M])}for(let M=0;M<3;M++){let w=M*2.1+.6,A=m.clone().addScaledVector(X,-.22).addScaledVector(C,Math.cos(w)*.18).addScaledVector(B,Math.sin(w)*.3),I=Qt().copy(X).multiplyScalar(-.35).addScaledVector(C,Math.cos(w)).addScaledVector(B,Math.sin(w)*1.2).normalize(),U=.38+M*.07,st=Qt().crossVectors(I,X).normalize(),ot=Qt().crossVectors(I,st).normalize(),ut=[];for(let j=0;j<5;j++){let v=j/5*Math.PI*2;ut.push([Math.cos(v)*.07,Math.sin(v)*.07])}let $=(j,v)=>A.clone().addScaledVector(I,j).addScaledVector(st,v[0]).addScaledVector(ot,v[1]),lt=A.clone().addScaledVector(I,U+.12);for(let j=0;j<5;j++){let v=ut[j],T=ut[(j+1)%5];_($(0,v),$(U,v),$(U,T)),_($(0,v),$(U,T),$(0,T)),_($(U,v),lt,$(U,T))}}e.push({c:m,n:X,target:b,level:n,anchor:m.clone(),w:.45,tint:nt,season:o.season})}}),s.fixWinding(),a.fixWinding(),{list:e,gemGeo:s.count?s.build():null,twigGeo:a.count?a.build():null}}function Ri(r,t){return new Ee.ShaderMaterial({vertexShader:`
			${bt}
			attribute vec4 color;
			attribute vec4 aSway;
			varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying float vIdx;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				w.xyz += windSway(aSway.xyz, aSway.w);
				vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vTint = color.rgb; vIdx = color.a;
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:`
			${bt}
			${ee}
			${Ot}
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
			}`,uniforms:{...r,uLit:{value:new Array(Math.max(1,t)).fill(0)}},side:Ee.DoubleSide})}import*as wt from"three";var Ai=r=>{let t=new wt.InstancedBufferGeometry,e=new wt.PlaneGeometry(1,1);return t.setIndex(e.index),t.setAttribute("position",e.getAttribute("position")),t.instanceCount=r,t};function Ci(r,t,e){let s=Gt(808),a=Ai(e),i=new Float32Array(e*4);for(let h=0;h<i.length;h++)i[h]=s();a.setAttribute("iSeed",new wt.InstancedBufferAttribute(i,4));let o={...r,uMap:{value:t},uCenter:{value:new wt.Vector3},uSeason:{value:new wt.Vector4(1,0,0,0)},uFire:{value:0},uCount:{value:1}},n=new wt.ShaderMaterial({vertexShader:`
			${bt}
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
			${bt}
			${Ot}
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
			}`,uniforms:o,transparent:!0,depthWrite:!1,blending:wt.CustomBlending,blendSrc:wt.OneFactor,blendDst:wt.OneMinusSrcAlphaFactor}),l=new wt.Mesh(a,n);return l.frustumCulled=!1,l.renderOrder=22,{mesh:l,u:o}}function Hi(r,t,e){let s=Gt(55),a=Ai(e),i=new Float32Array(e*4);for(let h=0;h<e;h++){let c=s()*L,p=s.range(2.5,7.5);i.set([Math.cos(c)*p,s.range(-1,5),Math.sin(c)*p,s()],h*4)}a.setAttribute("iOff",new wt.InstancedBufferAttribute(i,4));let o={...r,uMap:{value:t},uCenter:{value:new wt.Vector3},uK:{value:1}},n=new wt.ShaderMaterial({vertexShader:`
			${bt}
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
			${bt}
			uniform sampler2D uMap; uniform float uK;
			varying vec2 vUv; varying float vA;
			void main() {
				float t = texture2D(uMap, vUv).a;
				vec3 c = uFogSun * t * vA * uK * 0.22;
				gl_FragColor = vec4(c, 1.0);
			}`,uniforms:o,transparent:!0,depthWrite:!1,blending:wt.AdditiveBlending,side:wt.DoubleSide}),l=new wt.Mesh(a,n);return l.frustumCulled=!1,l.renderOrder=24,{mesh:l,u:o}}function Pi(r,t){let e=Gt(4242),s=new wt.BufferGeometry,a=new Float32Array([0,0,.35,-.08,0,-.2,.08,0,-.2,0,0,.12,-1,0,-.1,0,0,-.18,0,0,.12,1,0,-.1,0,0,-.18]);s.setAttribute("position",new wt.BufferAttribute(a,3));let i=new wt.InstancedBufferGeometry;i.setAttribute("position",s.getAttribute("position"));let o=new Float32Array(t*4);for(let c=0;c<t;c++){let p=c%2;o.set([e.range(0,L)*.15+p*Math.PI,e.range(-1.5,1.5),e.range(-1.5,1.5),e()],c*4)}i.setAttribute("iBird",new wt.InstancedBufferAttribute(o,4)),i.instanceCount=t;let n={...r,uCenterY:{value:30}},l=new wt.ShaderMaterial({vertexShader:`
			${bt}
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
			${bt}
			${Ot}
			varying vec3 vW;
			void main() {
				vec3 c = vec3(0.05, 0.04, 0.08) + uSkyHor * 0.08;
				float d = length(vW - cameraPosition);
				float f = 1.0 - exp(-d * uFogP.x * 1.3);
				gl_FragColor = finish(mix(c, uFogCol, f), 1.0);
			}`,uniforms:n,side:wt.DoubleSide}),h=new wt.Mesh(i,l);return h.frustumCulled=!1,{mesh:h,u:n}}function Fi({G:r,tier:t,shadow:e,aniso:s,msaa:a}){let i=t.id>=1,o={bark:ri(i?1024:512,s),plank:li(512,256,s),leaves:ci(t.id>=2?1024:512),glow:hi(128),ink:ui(128),stars:di(1024,512),cloud:pi(256),cloudNoise:fi(256),particles:gi(128),shaft:mi(128,256),rock:vi(256,s)},n=new jt.Scene;n.matrixWorldAutoUpdate=!0;let l=new rs,h=bi(l,t),c=wi(l),p=(Ge+.3)%(Math.PI*2),u=Ti(p),f=zi(r,o,t),g=(gt,pt,xt=0,Mt=null)=>{let _t=new jt.Mesh(gt,pt);return _t.matrixAutoUpdate=!1,_t.frustumCulled=!!gt.boundingSphere,_t.renderOrder=xt,n.add(_t),Mt&&e.add(gt,Mt),_t},x=Cs(),b=Cs({wind:!0}),S=12.5,d={trunk:xe({map:o.bark,wrap:.38,rim:.5,snow:1,snowY:S}),branch:xe({map:o.bark,wrap:.38,rim:.5,snow:1,snowY:S,wind:!0,cutout:!0}),walk:xe({map:o.plank,wrap:.22,rim:.2,snow:.85,snowY:S-1}),rail:xe({wrap:.3,rim:.35,snow:.9,snowY:S}),glass:oi(16761466,2.4),leaf:ii(o.leaves,{a2c:a}),islandTop:xe({wrap:.3,rim:.12}),rock:xe({map:o.rock,wrap:.3,rim:.3}),props:xe({wrap:.3,rim:.3,cutout:!0}),pond:xe({wrap:.2,rim:.9}),far:xe({wrap:.5,rim:.6,aerial:1.45}),sky:ni(o.stars)};g(h.trunk,d.trunk,0,x),g(h.branches,d.branch,0,b),h.nest&&g(h.nest,d.rail,0,x),g(c.walkway,d.walk,0,x),g(c.rail,d.rail,0,x),g(c.glass,d.glass,0);let P=new jt.Mesh(h.leaves,d.leaf);P.frustumCulled=!1,P.matrixAutoUpdate=!1,P.renderOrder=2,n.add(P),e.add(h.leaves,ai(o.leaves)),g(u.top,d.islandTop,0),g(u.rock,d.rock,0),g(u.props,d.props,0,x),g(u.pond,d.pond,0),g(u.gateFrame,d.trunk,0,x);let m=na(r);g(u.gate,m,1),g(f.farGeo,d.far,0);let F=Ei(l,Se),z=Ri(r,F.list.length);F.twigGeo&&g(F.twigGeo,d.branch,0),F.gemGeo&&g(F.gemGeo,z,0),f.dome.material=d.sky,n.add(f.dome),n.add(f.group);let W=_i(o.glow,r);n.add(W);let X=Ci(r,o.particles,t.particles),nt=Hi(r,o.shaft,t.shafts),rt=Pi(r,t.birds);n.add(X.mesh,nt.mesh,rt.mesh);let ht=Re(c.lanterns,o.glow,r,.5,16756832);return n.add(ht.mesh),{scene:n,curve:l,tree:h,walk:c,island:u,tex:o,mats:d,gateMat:m,crystals:F,crystalMat:z,glare:W,lanternGlow:ht,particles:X,shafts:nt,birds:rt,occluders:{caps:h.caps.concat(u.occ.caps),ellipsoids:h.ellipsoids,spheres:u.occ.spheres}}}function na(r){return new jt.ShaderMaterial({vertexShader:`
			varying vec2 vUv; varying vec3 vW;
			void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${bt}
			${ee}
			${Ot}
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
				// i\xE7te d\xF6nen m\xFCrekkep: koyu \xE7ivit girdap, a\xE7\u0131l\u0131nca mor-eflatun \u0131\u015F\u0131r
				vec3 c = vec3(0.012, 0.008, 0.03) + mix(vec3(0.12, 0.08, 0.5), vec3(0.6, 0.2, 0.9), sw) * sw * sw * (1.0 - smoothstep(0.0, 1.4, r)) * (0.3 + 1.2 * uOpen);
				float rim = 1.0 - smoothstep(0.0, 0.32, d);
				// kenar: T\xFCn Ana mor, K\xFCn Ata alt\u0131n; ikisi kemer boyunca birbirine akar
				c += mix(vec3(0.5, 0.32, 1.5), vec3(2.0, 1.2, 0.4), 0.3 + 0.4 * sin(uTime * 1.6 + a * 2.0)) * rim * rim * (0.5 + 1.0 * uOpen);
				float sp = step(0.985, fract(sin(dot(floor(vec2(a * 9.0, r * 14.0 - uTime * 0.8)), vec2(12.9, 78.2))) * 43758.5));
				c += vec3(1.4, 1.3, 2.2) * sp * (1.0 - smoothstep(0.2, 1.2, r)) * 0.6;
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,uniforms:{...r,uOpen:{value:0}},side:jt.DoubleSide,polygonOffset:!0,polygonOffsetFactor:-2})}function Re(r,t,e,s,a){let i=new jt.InstancedBufferGeometry,o=new jt.PlaneGeometry(1,1);i.setIndex(o.index),i.setAttribute("position",o.getAttribute("position"));let n=new Float32Array(Math.max(1,r.length)*4);r.forEach((p,u)=>n.set([p.x,p.y,p.z,s],u*4));let l=new jt.InstancedBufferAttribute(n,4);i.setAttribute("iPos",l),i.instanceCount=r.length;let h=new jt.ShaderMaterial({vertexShader:`
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
				float t = texture2D(uMap, vUv).a;
				float f = exp(-length(vW - cameraPosition) * uFogP.x * 0.8);
				vec3 c = uColor * t * uK * f;
				gl_FragColor = vec4(c / (1.0 + c * 0.3), 1.0);
			}`,uniforms:{uTime:e.uTime,uFogP:e.uFogP,uMap:{value:t},uColor:{value:new jt.Color(a)},uK:{value:1}},transparent:!0,depthWrite:!1,blending:jt.AdditiveBlending}),c=new jt.Mesh(i,h);return c.frustumCulled=!1,c.renderOrder=25,{mesh:c,attr:l,mat:h}}var Yt={dx:1,dz:0,str:.25,gust:0};function Ke(r,t,e,s,a,i){let o=r*.071+e*.053+t*.037,n=Math.sin(a*1.3+o*6.2831)*.6+Math.sin(a*2.7+o*11)*.4,l=Yt.gust*(.65+.35*Math.sin(a*5.1+o*17)),h=(Yt.str*n+l)*s;return i.x=Yt.dx*h,i.y=Math.sin(a*2.1+o*9)*.18*s*(Yt.str+Yt.gust),i.z=Yt.dz*h,i}import*as Fe from"three";var We=()=>new Fe.Vector3,ds=class{constructor(){this.cam=new Fe.PerspectiveCamera(52,1,.3,1400),this.pos=We(),this.look=We(),this.tPos=We(),this.tLook=We(),this.aspect=1,this.mode="follow",this.cine=null,this.shake=0,this.zoom=1,this._tmp=We(),this._tmp2=We(),this.lag=.42}resize(t,e){this.aspect=t/e,this.cam.aspect=this.aspect,this.baseFov=this.aspect<1?Y(66,54,At((this.aspect-.45)/.55,0,1)):50,this.cam.fov=this.baseFov,this.cam.updateProjectionMatrix()}followTarget(t,e,s=this.tPos,a=this.tLook){let i=Math.atan2(t.z,t.x),o=Math.hypot(t.x,t.z),n=this.aspect<1,l=(n?10.2:8.6)*this.zoom,h=(n?4.2:3.3)*this.zoom,c=i-this.lag;return s.set(Math.cos(c)*(o+l),t.y+h,Math.sin(c)*(o+l)),a.copy(t).lerp(e,.35),a.y+=n?.2:.55,s}snap(){this.pos.copy(this.tPos),this.look.copy(this.tLook)}play(t,e){this.cine={keys:t,t:0,dur:t[t.length-1].t,onDone:e};let s=t.map(i=>i.pos),a=t.map(i=>i.look);this.cine.cp=new Fe.CatmullRomCurve3(s,!1,"centripetal"),this.cine.cl=new Fe.CatmullRomCurve3(a,!1,"centripetal"),this.mode="cine"}skipCine(){this.cine&&(this.cine.t=this.cine.dur)}update(t){let e=this.cam;if(this.mode==="cine"&&this.cine){let s=this.cine;s.t=Math.min(s.dur,s.t+t);let a=s.keys,i=0;for(;i<a.length-2&&s.t>a[i+1].t;)i++;let o=(s.t-a[i].t)/Math.max(1e-4,a[i+1].t-a[i].t),n=(i+Ss(At(o,0,1)))/(a.length-1);s.cp.getPoint(n,this.pos),s.cl.getPoint(n,this.look);let l=a[i].fov??this.baseFov,h=a[i+1].fov??this.baseFov;e.fov=Y(l,h,Ss(At(o,0,1))),e.updateProjectionMatrix(),s.t>=s.dur&&(this.mode="follow",this.cine=null,s.onDone&&s.onDone())}else this.mode==="follow"&&(this.pos.x=Tt(this.pos.x,this.tPos.x,3.2,t),this.pos.y=Tt(this.pos.y,this.tPos.y,3.6,t),this.pos.z=Tt(this.pos.z,this.tPos.z,3.2,t),this.look.x=Tt(this.look.x,this.tLook.x,5,t),this.look.y=Tt(this.look.y,this.tLook.y,5,t),this.look.z=Tt(this.look.z,this.tLook.z,5,t),Math.abs(e.fov-this.baseFov)>.01&&(e.fov=Tt(e.fov,this.baseFov,3,t),e.updateProjectionMatrix()));if(e.position.copy(this.pos),this.shake>.001){let s=this.shake;e.position.x+=(Math.random()-.5)*s,e.position.y+=(Math.random()-.5)*s,this.shake=Tt(this.shake,0,6,t)}e.lookAt(this.look),e.updateMatrixWorld()}};import*as Oi from"three";var ge={x:0,y:0,z:0},ra={min:0,max:1e9},fs=class{constructor(t){let e=t.occluders;this.caps=e.caps.map(a=>({ax:a.a.x,ay:a.a.y,az:a.a.z,bx:a.b.x,by:a.b.y,bz:a.b.z,r:a.r,anchor:a.anchor||null,wa:a.wa||0,wb:a.wb||0,cx:(a.a.x+a.b.x)/2,cy:(a.a.y+a.b.y)/2,cz:(a.a.z+a.b.z)/2,br:a.a.distanceTo(a.b)/2+a.r+1.8*Math.max(a.wa||0,a.wb||0)})),this.ells=e.ellipsoids.map(a=>({cx:a.c.x,cy:a.c.y,cz:a.c.z,rx:a.rx,ry:a.ry,rz:a.rz,anchor:a.anchor,w:a.w,br:Math.max(a.rx,a.ry,a.rz)+1.8*a.w})),this.sph=e.spheres.map(a=>({cx:a.c.x,cy:a.c.y,cz:a.c.z,rx:a.r,ry:a.r*a.sy,rz:a.r,br:a.r}));let s=t.curve;this.slabs=[];for(let a=0;a<s.n-4;a+=4){let i=a+2,o=s.X[a+4]-s.X[a],n=s.Y[a+4]-s.Y[a],l=s.Z[a+4]-s.Z[a],h=Math.hypot(o,n,l),c=s.SX[i],p=s.SZ[i],u=s.R[i]-$t(s.Y[i])<1.6?1.15:.95,f=(u+1.9/2)/2,g=(1.9/2-u)/2;this.slabs.push({cx:s.X[i]+c*g,cy:s.Y[i]-.34/2,cz:s.Z[i]+p*g,Tx:o/h,Ty:n/h,Tz:l/h,hT:h/2+.02,Sx:c,Sz:p,hS:f,hU:.34/2+.04,br:Math.hypot(h/2,f,.34)})}this.t=0}setTime(t){this.t=t}blocked(t,e,s,a){let i=a.x,o=a.y,n=a.z;if(this._trunk(t,e,s,i,o,n))return!0;for(let l of this.slabs)if(!(l.cy<e+.25)&&ps(t,e,s,i,o,n,l.cx,l.cy,l.cz,l.br)&&ca(t,e,s,i,o,n,l))return!0;for(let l of this.ells)if(!(l.cy+l.br<e)&&ps(t,e,s,i,o,n,l.cx,l.cy,l.cz,l.br)&&(Ke(l.anchor.x,l.anchor.y,l.anchor.z,l.w,this.t,ge),Vi(t,e,s,i,o,n,l.cx+ge.x,l.cy+ge.y,l.cz+ge.z,l.rx,l.ry,l.rz)))return!0;for(let l of this.caps){if(Math.max(l.ay,l.by)+l.r+2<e||!ps(t,e,s,i,o,n,l.cx,l.cy,l.cz,l.br))continue;let h=l.ax,c=l.ay,p=l.az,u=l.bx,f=l.by,g=l.bz;if(l.anchor&&(l.wa>0||l.wb>0)&&(Ke(l.anchor.x,l.anchor.y,l.anchor.z,1,this.t,ge),h+=ge.x*l.wa,c+=ge.y*l.wa,p+=ge.z*l.wa,u+=ge.x*l.wb,f+=ge.y*l.wb,g+=ge.z*l.wb),la(t,e,s,i,o,n,h,c,p,u,f,g,l.r))return!0}for(let l of this.sph)if(ps(t,e,s,i,o,n,l.cx,l.cy,l.cz,l.br)&&Vi(t,e,s,i,o,n,l.cx,l.cy,l.cz,l.rx,l.ry,l.rz))return!0;return!1}_trunk(t,e,s,a,i,o){let n=a*a+o*o;if(n<1e-6)return!1;let l=-(t*a+s*o)/n;if(l<=0)return!1;let h=t+a*l,c=s+o*l,p=e+i*l;if(p>55||Math.hypot(h,c)>$t(Math.max(0,p))+2.2)return!1;let f=9/Math.sqrt(n),g=Math.max(0,l-f),x=l+f,b=36;for(let S=0;S<=b;S++){let d=g+(x-g)*S/b,P=t+a*d,m=e+i*d,F=s+o*d;if(m>54)continue;if(Math.hypot(P,F)<qt(Math.atan2(F,P),m)*.985)return!0}return!1}};function ps(r,t,e,s,a,i,o,n,l,h){let c=o-r,p=n-t,u=l-e,f=c*s+p*a+u*i;return f<-h?!1:c*c+p*p+u*u-f*f<=h*h}function Vi(r,t,e,s,a,i,o,n,l,h,c,p){let u=(r-o)/h,f=(t-n)/c,g=(e-l)/p,x=s/h,b=a/c,S=i/p,d=x*x+b*b+S*S,P=u*x+f*b+g*S,m=u*u+f*f+g*g-1;if(m<0)return!0;let F=P*P-d*m;return F<0?!1:-P-Math.sqrt(F)>0}function la(r,t,e,s,a,i,o,n,l,h,c,p,u){let f=h-o,g=c-n,x=p-l,b=r-o,S=t-n,d=e-l,P=s*s+a*a+i*i,m=s*f+a*g+i*x,F=f*f+g*g+x*x,z=s*b+a*S+i*d,W=f*b+g*S+x*d,X=P*F-m*m,nt,rt;X<1e-8?(nt=0,rt=F>1e-8?W/F:0):(nt=(m*W-F*z)/X,rt=(P*W-m*z)/X),nt<0&&(nt=0,rt=F>1e-8?W/F:0),rt<0?(rt=0,nt=Math.max(0,-z/P)):rt>1&&(rt=1,nt=Math.max(0,(m-z)/P));let ht=b+nt*s-rt*f,gt=S+nt*a-rt*g,pt=d+nt*i-rt*x;return ht*ht+gt*gt+pt*pt<=u*u}function ca(r,t,e,s,a,i,o){let n=r-o.cx,l=t-o.cy,h=e-o.cz,c=ra;return c.min=0,c.max=1e9,$s(o.Tx*n+o.Ty*l+o.Tz*h,o.Tx*s+o.Ty*a+o.Tz*i,o.hT,c)&&$s(o.Sx*n+o.Sz*h,o.Sx*s+o.Sz*i,o.hS,c)&&$s(l,a,o.hU,c)&&c.max>0}function $s(r,t,e,s){if(Math.abs(t)<1e-6)return Math.abs(r)<=e;let a=(-e-r)/t,i=(e-r)/t;if(a>i){let o=a;a=i,i=o}return a>s.min&&(s.min=a),i<s.max&&(s.max=i),s.min<=s.max}import*as Ft from"three";var Ii=1.55,ha=`
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
}`,ua=`
${bt}
${ee}
${Ot}
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
}`,da=`
varying vec3 vN; varying vec3 vV; varying float vY;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vY = position.y; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,pa=`
uniform vec3 uRim; uniform float uFade; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
	float f = 1.0 - abs(dot(normalize(vN), normalize(vV))), rim = pow(f, 2.2), pulse = 0.88 + 0.12 * sin(uTime * 4.0);
	vec3 c = mix(vec3(0.62, 0.55, 1.0), uRim, 0.45) * (0.45 + 1.7 * rim) * pulse * 0.8;
	gl_FragColor = vec4(c, (0.22 + 0.68 * rim) * uFade);
}`,fa=`
uniform float uV, uA, uTime; varying vec2 vUv;
void main() {
	vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.x, -p.y) / 6.2831853 + 0.5;
	float band = smoothstep(0.78, 0.82, r) * (1.0 - smoothstep(0.94, 0.98, r));
	float fill = step(a, uV);
	vec3 c = mix(vec3(3.0, 0.7, 0.2), vec3(1.6, 1.4, 2.6), smoothstep(0.25, 0.7, uV));
	float pulse = uV < 0.3 ? 0.6 + 0.4 * sin(uTime * 18.0) : 1.0;
	vec3 o = c * pulse * band * (fill * 0.95 + 0.12) * uA;
	gl_FragColor = vec4(o / (1.0 + o * 0.4), 1.0);
}`,gs=class{constructor(t,e,{rim:s=10325247,segs:a=40}={}){this.g=new Ft.Group,this.k=new Ft.Group,this.k.scale.setScalar(Ii),this.g.add(this.k),this.body=new Ft.Group,this.k.add(this.body),this.u={...t,uWob:{value:.5},uBurn:{value:0},uRim:{value:new Ft.Color(s)},uLit:{value:0},uFade:{value:1},uMelt:{value:0},uDiss:{value:0}};let i=new Ft.SphereGeometry(.3,a,Math.round(a*.7));this.blob=new Ft.Mesh(i,new Ft.ShaderMaterial({vertexShader:ha,fragmentShader:ua,uniforms:this.u})),this.blob.position.y=.3,this.body.add(this.blob),this.sil=new Ft.Mesh(i,new Ft.ShaderMaterial({vertexShader:da,fragmentShader:pa,uniforms:{uRim:this.u.uRim,uFade:this.u.uFade,uTime:t.uTime},transparent:!0,depthWrite:!1,depthFunc:Ft.GreaterDepth})),this.sil.position.y=.3,this.sil.scale.setScalar(1.035),this.sil.renderOrder=40,this.body.add(this.sil);let o=Hs(16777215,2.2),n=Hs(328200,1);this.eyeMat=o,this.eyes=[],this.pupils=[];let l=new Ft.SphereGeometry(.075,16,12),h=new Ft.SphereGeometry(.036,10,8);for(let p of[-1,1]){let u=new Ft.Mesh(l,o);u.scale.set(.95,1.25,.55),u.position.set(p*.105,.38,.25);let f=new Ft.Mesh(h,n);f.position.set(0,-.005,.06),u.add(f),this.body.add(u),this.eyes.push(u),this.pupils.push(f)}let c=new Ft.SphereGeometry(.075,10,8);this.feet=[-1,1].map(p=>{let u=new Ft.Mesh(c,n);return u.scale.set(1,.6,1.35),u.position.set(p*.12,.04,.02),this.k.add(u),u}),this.aura=new Ft.Mesh(new Ft.PlaneGeometry(1.3,1.3).rotateX(-Math.PI/2),new Ft.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:"uniform sampler2D uMap; uniform float uO; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a * uO; gl_FragColor = vec4(0.012, 0.008, 0.03, a); }",uniforms:{uMap:{value:e.ink},uO:{value:.85}},transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-4})),this.aura.position.y=.014,this.aura.renderOrder=3,this.k.add(this.aura),this.ringU={uV:{value:1},uA:{value:0},uTime:t.uTime},this.ring=new Ft.Mesh(new Ft.PlaneGeometry(1.25,1.25).rotateX(-Math.PI/2),new Ft.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:fa,uniforms:this.ringU,transparent:!0,depthWrite:!1,blending:Ft.AdditiveBlending})),this.ring.position.y=.03,this.ring.renderOrder=4,this.k.add(this.ring),this.reset()}reset(){this.phase=0,this.yaw=0,this.blinkT=2,this.squash=0,this.sqV=0,this.tapT=0,this.idleT=0,this.hopT=0,this.melt=0,this.diss=0,this.u.uMelt.value=0,this.u.uDiss.value=0,this.u.uFade.value=1,this.u.uBurn.value=0,this.blob.visible=!0,this.sil.visible=!0,this.g.visible=!0,this.g.scale.setScalar(1),this.body.scale.setScalar(1),this.body.position.set(0,0,0);for(let t of this.feet)t.visible=!0;this.eyes.forEach((t,e)=>{t.visible=!0,t.position.set(e?.105:-.105,.38,.25),t.scale.set(.95,1.25,.55)})}kick(t){this.sqV+=t}hop(){this.hopT=.55}update(t,e,s,a){this.g.position.set(s.x,s.y,s.z);let i=s.yaw-this.yaw;for(;i>Math.PI;)i-=Math.PI*2;for(;i<-Math.PI;)i+=Math.PI*2;this.yaw+=i*(1-Math.exp(-10*t)),this.g.rotation.y=this.yaw,this.sqV+=(-this.squash*220-this.sqV*16)*t,this.squash+=this.sqV*t;let o=0,n=1,l=1;if(s.moving){let f=this.phase;this.phase+=t*s.speed*4.4;let g=this.phase%1;o=Math.sin(g*Math.PI)*.12,Math.floor(this.phase)!==Math.floor(f)&&(this.kick(-2.2),a&&a()),n=1+Math.sin(g*Math.PI)*.06;for(let x=0;x<2;x++){let b=(this.phase+x*.5)%1;this.feet[x].position.z=.02+Math.sin(b*Math.PI*2)*.09,this.feet[x].position.y=.04+Math.max(0,Math.sin(b*Math.PI*2))*.05}}else{let f=Math.sin(e*2.2)*.025;n=1+f,l=1-f*.6;for(let g of this.feet)g.position.z=Tt(g.position.z,.02,8,t),g.position.y=.04;if(s.hold){this.tapT+=t;let g=Math.max(0,Math.sin(this.tapT*11));this.feet[1].position.y=.04+g*.045,this.feet[1].position.z=.05}else this.tapT=0}if(this.hopT>0){this.hopT=Math.max(0,this.hopT-t);let f=Math.sin((1-this.hopT/.55)*Math.PI);o+=f*.22,n*=1+f*.08,this.hopT===0&&this.kick(-2.4)}n*=1+this.squash,l*=1-this.squash*.55;let h=Y(.62,1,s.meter);this.k.scale.setScalar(Ii*h);let c=s.burn>0?.018*s.burn:0;this.body.position.set((Math.random()-.5)*c,o,(Math.random()-.5)*c),this.body.scale.set(l,n,l),this.blinkT-=t;let p=1;this.blinkT<.12&&(p=Math.max(.08,Math.abs(this.blinkT-.06)/.06)),this.blinkT<0&&(this.blinkT=2+Math.random()*3);let u=s.burn>.2?1.25:1;this.eyes.forEach(f=>f.scale.set(.95*u,1.25*p*u,.55));for(let f of this.pupils)f.scale.setScalar(s.burn>.2?.6:1);this.u.uBurn.value=Tt(this.u.uBurn.value,s.burn,8,t),this.u.uLit.value=Tt(this.u.uLit.value,s.lit,8,t),this.u.uWob.value=.4+this.u.uBurn.value*.6,this.ringU.uV.value=Tt(this.ringU.uV.value,s.meter,10,t),this.ringU.uA.value=Tt(this.ringU.uA.value,s.meter<.995?1:0,4,t)}evaporate(t){this.u.uMelt.value=At(t*1.6,0,1),this.u.uDiss.value=At((t-.25)/.75,0,1),this.u.uBurn.value=1,this.sil.visible=!1,this.ringU.uA.value=0,this.aura.material.uniforms.uO.value=.85*(1-t);for(let e of this.feet)e.visible=t<.4;this.eyes.forEach((e,s)=>{let a=Math.max(.001,1-At((t-.1)/.4,0,1));e.scale.set(.95*a,1.4*a,.55*a),e.position.y=Y(.38,.18,At(t*2,0,1))})}setFade(t){this.u.uFade.value=t,this.eyeMat.uniforms.uFade.value=t,this.aura.material.uniforms.uO.value=.85*t}};import*as _e from"three";import*as Nt from"three";var me=320,Xe=class{constructor(t,e,{additive:s=!1}={}){this.n=0,this.p=new Float32Array(me*3),this.v=new Float32Array(me*3),this.life=new Float32Array(me*2),this.par=new Float32Array(me*4),this.col=new Float32Array(me*4),this.cell=new Float32Array(me),this.spin=new Float32Array(me*2);let a=new Nt.InstancedBufferGeometry,i=new Nt.PlaneGeometry(1,1);a.setIndex(i.index),a.setAttribute("position",i.getAttribute("position")),this.aPos=new Nt.InstancedBufferAttribute(new Float32Array(me*4),4).setUsage(Nt.DynamicDrawUsage),this.aCol=new Nt.InstancedBufferAttribute(new Float32Array(me*4),4).setUsage(Nt.DynamicDrawUsage),this.aRot=new Nt.InstancedBufferAttribute(new Float32Array(me*2),2).setUsage(Nt.DynamicDrawUsage),a.setAttribute("iPos",this.aPos),a.setAttribute("iCol",this.aCol),a.setAttribute("iRot",this.aRot),a.instanceCount=0,this.geo=a;let o=new Nt.ShaderMaterial({vertexShader:`
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
					vec3 c = pow(clamp(t.rgb * vCol.rgb, 0.0, 1.0), vec3(1.0 / 2.2)); gl_FragColor = vec4(c * a, a); }`,uniforms:{uMap:{value:e}},transparent:!0,depthWrite:!1,blending:s?Nt.AdditiveBlending:Nt.CustomBlending,blendSrc:Nt.OneFactor,blendDst:s?Nt.OneFactor:Nt.OneMinusSrcAlphaFactor});this.mesh=new Nt.Mesh(a,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=35}emit(t,e,s,a,i,o,n,l,h,c,p,u,f,g,x,b,S=0){if(this.n>=me)return;let d=this.n++;this.p[d*3]=t,this.p[d*3+1]=e,this.p[d*3+2]=s,this.v[d*3]=a,this.v[d*3+1]=i,this.v[d*3+2]=o,this.life[d*2]=n,this.life[d*2+1]=n,this.par[d*4]=l,this.par[d*4+1]=h,this.par[d*4+2]=c,this.par[d*4+3]=p,this.col[d*4]=u,this.col[d*4+1]=f,this.col[d*4+2]=g,this.col[d*4+3]=x,this.cell[d]=b,this.spin[d*2]=Math.random()*6.28,this.spin[d*2+1]=S}update(t){let e=0,s=this.aPos.array,a=this.aCol.array,i=this.aRot.array;for(let o=0;o<this.n;o++){let n=this.life[o*2]-t;if(n<=0)continue;e!==o&&(this.p.copyWithin(e*3,o*3,o*3+3),this.v.copyWithin(e*3,o*3,o*3+3),this.life[e*2+1]=this.life[o*2+1],this.par.copyWithin(e*4,o*4,o*4+4),this.col.copyWithin(e*4,o*4,o*4+4),this.cell[e]=this.cell[o],this.spin.copyWithin(e*2,o*2,o*2+2)),this.life[e*2]=n;let l=Math.exp(-this.par[e*4+3]*t);this.v[e*3]*=l,this.v[e*3+1]=this.v[e*3+1]*l-this.par[e*4+2]*t,this.v[e*3+2]*=l,this.p[e*3]+=this.v[e*3]*t,this.p[e*3+1]+=this.v[e*3+1]*t,this.p[e*3+2]+=this.v[e*3+2]*t,this.spin[e*2]+=this.spin[e*2+1]*t;let h=1-n/this.life[e*2+1],c=Math.min(1,h*6)*(1-h*h);s[e*4]=this.p[e*3],s[e*4+1]=this.p[e*3+1],s[e*4+2]=this.p[e*3+2],s[e*4+3]=this.par[e*4]+(this.par[e*4+1]-this.par[e*4])*h,a[e*4]=this.col[e*4],a[e*4+1]=this.col[e*4+1],a[e*4+2]=this.col[e*4+2],a[e*4+3]=this.col[e*4+3]*c,i[e*2]=this.cell[e],i[e*2+1]=this.spin[e*2],e++}this.n=e,this.geo.instanceCount=e,e>0&&(this.aPos.clearUpdateRanges(),this.aCol.clearUpdateRanges(),this.aRot.clearUpdateRanges(),this.aPos.addUpdateRange(0,e*4),this.aCol.addUpdateRange(0,e*4),this.aRot.addUpdateRange(0,e*2),this.aPos.needsUpdate=!0,this.aCol.needsUpdate=!0,this.aRot.needsUpdate=!0)}clear(){this.n=0,this.geo.instanceCount=0}};function ve(r,t,e,s,a=18,i=[1.6,1.3,2.6]){for(let o=0;o<a;o++){let n=Math.random()*Math.PI*2,l=(Math.random()-.2)*1.2,h=1.2+Math.random()*2.2;r.emit(t,e,s,Math.cos(n)*Math.cos(l)*h,Math.sin(l)*h+1.2,Math.sin(n)*Math.cos(l)*h,.7+Math.random()*.5,.28,.05,1.6,2.2,i[0],i[1],i[2],1,3)}}function je(r,t,e,s,a=1){r.emit(t+(Math.random()-.5)*.3,e,s+(Math.random()-.5)*.3,(Math.random()-.5)*.3,.8+Math.random()*.6,(Math.random()-.5)*.3,.9,.18*a,.6*a,-.4,1.4,1.9,.8,.3,.55,3)}var Os=8;function ga(){let r=new _e.SphereGeometry(.16,20,14),t=r.getAttribute("position");for(let e=0;e<t.count;e++){let s=t.getX(e),a=t.getY(e),i=t.getZ(e);if(a>0){let o=a/.16;a*=1+o*.9,s*=1-o*.75,i*=1-o*.75}t.setXYZ(e,s,a,i)}return r.computeVertexNormals(),r}var ms=class{constructor(t,e,s){this.G=t,this.geo=ga(),this.mat=new _e.ShaderMaterial({vertexShader:`
				varying vec3 vN; varying vec3 vW; varying vec3 vL;
				void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
				${bt}
				${ee}
				${Ot}
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
				}`,uniforms:{...t}}),this.meshes=[];for(let i=0;i<Os;i++){let o=new _e.Mesh(this.geo,this.mat);o.visible=!1,o.renderOrder=6,s.add(o),this.meshes.push(o)}let a=Array.from({length:Os},()=>new _e.Vector3(0,-999,0));this.glow=Re(a,e.glow,t,.55,9403647),this.glow.mat.uniforms.uK.value=.7,s.add(this.glow.mesh),this.list=[],this._p={},this._L=new _e.Vector3}setup(t,e,s,a){this.list=a.map(([i,o],n)=>{let l=e+(s-e)*i,h=t.sample(l,{}),c=o*.62;return{i:n,s:l,x:h.x+h.sx*c,y:h.y+.55,z:h.z+h.sz*c,melt:0,state:"idle",t:0,lit:0}});for(let i=0;i<Os;i++)this.meshes[i].visible=i<this.list.length;this.glow.mesh.geometry.instanceCount=this.list.length}get total(){return this.list.length}get got(){return this.list.filter(t=>t.state==="got"||t.state==="fly").length}get lost(){return this.list.filter(t=>t.state==="lost").length}update(t,e,s,a,i,o,n,l,h,c){let p=this.glow.attr.array;for(let u of this.list){let f=this.meshes[u.i];if(u.t+=t,u.state==="idle"){if(c&&u.s-s<9&&u.s-s>-1){let b=!i.blocked(u.x,u.y+.1,u.z,o)||this.beams&&this.beams.litAt(u.x,u.y,u.z);u.lit=Tt(u.lit,b?1:0,12,t),b?(u.melt=Math.min(1,u.melt+t*.3),Math.random()<t*14&&je(n,u.x,u.y+.15,u.z,.6),u.melt>=1&&(u.state="lost",ve(n,u.x,u.y,u.z,12,[2.4,.9,.3]),h(u))):u.melt=Math.max(0,u.melt-t*.12)}c&&Math.abs(u.s-s)<.55&&(u.state="fly",u.t=0);let g=1-u.melt*.65,x=u.lit*.02;f.position.set(u.x+(Math.random()-.5)*x,u.y+Math.sin(e*2.2+u.i)*.07,u.z+(Math.random()-.5)*x),f.rotation.y=e*.8+u.i,f.scale.setScalar(g),p[u.i*4]=f.position.x,p[u.i*4+1]=f.position.y,p[u.i*4+2]=f.position.z,p[u.i*4+3]=.55*g*(1-u.lit*.5)}else if(u.state==="fly"){let g=Math.min(1,u.t/.28);f.position.set(u.x+(a.x-u.x)*g,u.y+(a.y+.5-u.y)*g+Math.sin(g*Math.PI)*.4,u.z+(a.z-u.z)*g),f.scale.setScalar(1-g*.8),p[u.i*4]=f.position.x,p[u.i*4+1]=f.position.y,p[u.i*4+2]=f.position.z,p[u.i*4+3]=.55*(1-g),g>=1&&(u.state="got",f.visible=!1,p[u.i*4+3]=0,ve(n,a.x,a.y+.6,a.z,20),l(u))}else f.visible=!1,p[u.i*4+3]=0}this.glow.attr.needsUpdate=!0}hideAll(){for(let t of this.meshes)t.visible=!1;this.glow.mesh.geometry.instanceCount=0,this.list=[]}};import*as Jt from"three";var vs=6,xs={x:0,y:0,z:0},ys=class{constructor(t,e,s,a){this.list=a.crystals.list.map(h=>({...h,lit:0,on:!1,hx:0,hy:0,hz:0,cx:0,cy:0,cz:0,hitT:0})),this.gemMat=a.crystalMat;let i=new Jt.InstancedBufferGeometry,o=new Jt.PlaneGeometry(1,1);i.setIndex(o.index),i.setAttribute("position",o.getAttribute("position")),this.aA=new Jt.InstancedBufferAttribute(new Float32Array(vs*4),4).setUsage(Jt.DynamicDrawUsage),this.aB=new Jt.InstancedBufferAttribute(new Float32Array(vs*4),4).setUsage(Jt.DynamicDrawUsage),i.setAttribute("iA",this.aA),i.setAttribute("iB",this.aB),i.instanceCount=0,this.geo=i;let n=new Jt.ShaderMaterial({vertexShader:`
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
				${bt}
				varying vec2 vUv; varying float vA;
				void main() {
					float x = abs(vUv.x - 0.5) * 2.0;
					float core = exp(-x * x * 18.0) + exp(-x * x * 3.0) * 0.35;
					float ends = smoothstep(0.0, 0.06, vUv.y) * (0.55 + 0.45 * smoothstep(1.0, 0.85, vUv.y));
					float shimmer = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 9.0);
					vec3 c = (uSunCol * 0.45 + vec3(0.6, 0.5, 0.35)) * core * ends * shimmer * vA;
					gl_FragColor = vec4(c / (1.0 + c * 0.25), 1.0);
				}`,uniforms:{...t},transparent:!0,depthWrite:!1,blending:Jt.AdditiveBlending,side:Jt.DoubleSide});this.mesh=new Jt.Mesh(i,n),this.mesh.frustumCulled=!1,this.mesh.renderOrder=26,s.add(this.mesh);let l=Array.from({length:vs},()=>new Jt.Vector3(0,-999,0));this.spots=Re(l,e.glow,t,1.2,16773312),this.glints=Re(l,e.glow,t,1,16774364),this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0,s.add(this.spots.mesh,this.glints.mesh),this.active=[],this._cand=[]}update(t,e,s,a,i,o){let n=this.aA.array,l=this.aB.array,h=this.spots.attr.array,c=this.glints.attr.array,p=this.gemMat.uniforms.uLit.value;this.active.length=0;let u=0,f=0,g=a.x,x=a.y,b=a.z;for(let S=0;S<this.list.length;S++){let d=this.list[S],P=Math.abs(d.c.y-s)<15,m=!1;if(P){Ke(d.anchor.x,d.anchor.y,d.anchor.z,d.w,e,xs),d.cx=d.c.x+xs.x,d.cy=d.c.y+xs.y,d.cz=d.c.z+xs.z;let F=d.n.x*g+d.n.y*x+d.n.z*b;if(F>.05&&!i.blocked(d.cx+g*.5,d.cy+x*.5,d.cz+b*.5,a)){let z=-g+2*F*d.n.x,W=-x+2*F*d.n.y,X=-b+2*F*d.n.z,nt=this._cast(d.cx,d.cy,d.cz,z,W,X,i);d.hx=d.cx+z*nt,d.hy=d.cy+W*nt,d.hz=d.cz+X*nt,d.hitT=nt,m=!0}}if(d.lit=Tt(d.lit,m?1:0,14,t),p[S]=d.lit,d.on=m,d.lit>.02&&u<vs&&(n[u*4]=d.cx,n[u*4+1]=d.cy,n[u*4+2]=d.cz,n[u*4+3]=.55,l[u*4]=d.hx,l[u*4+1]=d.hy,l[u*4+2]=d.hz,l[u*4+3]=d.lit,h[u*4]=d.hx,h[u*4+1]=d.hy+.05,h[u*4+2]=d.hz,h[u*4+3]=d.hitT<39?1*d.lit:0,c[u*4]=d.cx,c[u*4+1]=d.cy,c[u*4+2]=d.cz,c[u*4+3]=.9*d.lit,u++),m){this.active.push(d);let F=Ns(o.x,o.y+.45,o.z,d.cx,d.cy,d.cz,d.hx,d.hy,d.hz);F<.55&&(f=Math.max(f,1-Math.max(0,F-.35)/.2))}}return this.geo.instanceCount=u,this.spots.mesh.geometry.instanceCount=u,this.glints.mesh.geometry.instanceCount=u,this.aA.needsUpdate=!0,this.aB.needsUpdate=!0,this.spots.attr.needsUpdate=!0,this.glints.attr.needsUpdate=!0,f}testPoint(t,e,s,a,i,o=.55){for(let n of this.list){if(Math.abs(n.c.y-s)>15)continue;let l=n.n.x*t.x+n.n.y*t.y+n.n.z*t.z;if(l<=.05)continue;let h=n.cx||n.c.x,c=n.cy||n.c.y,p=n.cz||n.c.z;if(i.blocked(h+t.x*.5,c+t.y*.5,p+t.z*.5,t))continue;let u=-t.x+2*l*n.n.x,f=-t.y+2*l*n.n.y,g=-t.z+2*l*n.n.z,x=this._cast(h,c,p,u,f,g,i);if(Ns(e,s,a,h,c,p,h+u*x,c+f*x,p+g*x)<o)return!0}return!1}litAt(t,e,s,a=.35){for(let i of this.active)if(Ns(t,e,s,i.cx,i.cy,i.cz,i.hx,i.hy,i.hz)<a)return!0;return!1}_cast(t,e,s,a,i,o,n){let l=this._cand;l.length=0;for(let c of n.slabs){let p=c.cx-t,u=c.cy-e,f=c.cz-s,g=p*a+u*i+f*o;if(g<-c.br||g>41)continue;p*p+u*u+f*f-g*g<=c.br*c.br&&l.push(c)}let h=.16;for(let c=.35;c<40;c+=h){let p=t+a*c,u=e+i*c,f=s+o*c,g=Math.hypot(p,f);if(u<56&&g<7&&g<qt(Math.atan2(f,p),u)||g<ze&&u<he(p,f)+.02)return c;for(let x of l){let b=p-x.cx,S=u-x.cy,d=f-x.cz;if(!(Math.abs(b*x.Tx+S*x.Ty+d*x.Tz)>x.hT)&&!(Math.abs(b*x.Sx+d*x.Sz)>x.hS)&&!(Math.abs(S)>x.hU+.02))return c}}return 40}hide(){this.geo.instanceCount=0,this.spots.mesh.geometry.instanceCount=0,this.glints.mesh.geometry.instanceCount=0;for(let t of this.list)t.lit=0}};function Ns(r,t,e,s,a,i,o,n,l){let h=o-s,c=n-a,p=l-i,u=h*h+c*c+p*p,f=u>0?((r-s)*h+(t-a)*c+(e-i)*p)/u:0;f=f<0?0:f>1?1:f;let g=s+h*f-r,x=a+c*f-t,b=i+p*f-e;return Math.sqrt(g*g+x*x+b*b)}import*as Rt from"three";var Di=3,Gs=7,Us=1.55,ma=[[0,1],[0,1.7],[.45,.8],[-.45,.8]];function va(){let e=[],s=[],a=[],i=[];for(let n=0;n<=8;n++){let l=n/8,h=Math.sin(Math.min(1,l*1.15)*Math.PI)*.36+.06*(1-l);for(let c=0;c<=6;c++){let p=c/6-.5,u=p*h*2,f=-Math.pow(Math.abs(p)*2,2)*.1-Math.pow(l,2)*.22;e.push(u,l*1.05,f);let g=new Rt.Vector3(-u*.6,.15-l*.2,1).normalize();s.push(g.x,g.y,g.z),a.push(.75+l*.25,l,1,1)}}for(let n=0;n<8;n++)for(let l=0;l<6;l++){let h=n*7+l;i.push(h,h+1,h+6+2,h,h+6+2,h+6+1)}let o=new Rt.BufferGeometry;return o.setAttribute("position",new Rt.Float32BufferAttribute(e,3)),o.setAttribute("normal",new Rt.Float32BufferAttribute(s,3)),o.setAttribute("color",new Rt.Float32BufferAttribute(a,4)),o.setIndex(i),o}function xa(r,t,e){return new Rt.ShaderMaterial({vertexShader:`
			attribute vec4 color;
			varying vec3 vN; varying vec3 vW; varying vec4 vC;
			void main() {
				vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
				vW = w.xyz; vC = color;
				vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
				gl_Position = projectionMatrix * viewMatrix * w;
			}`,fragmentShader:`
			${bt}
			${He}
			${ee}
			${Ot}
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
			}`,uniforms:{...r,uA:{value:new Rt.Color(t)},uB:{value:new Rt.Color(e)},uCharge:{value:0},uOpen:{value:0}},side:Rt.DoubleSide})}function ya(r){return new Rt.ShaderMaterial({vertexShader:`
			varying vec3 vN; varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
			${bt}
			${ee}
			${Ot}
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
			}`,uniforms:{...r,uCharge:{value:0}}})}function ka(){let r=[],t=(a,i,o,n,l,h)=>{let c=[],p=new Rt.Vector3(Math.sin(l)*o*.3,o,0).applyAxisAngle(new Rt.Vector3(0,1,0),h);for(let f=0;f<6;f++){let g=f/6*Math.PI*2;c.push([Math.cos(g)*n,Math.sin(g)*n*.8])}let u=o*.72;for(let f=0;f<6;f++){let[g,x]=c[f],[b,S]=c[(f+1)%6],d=[a+g,0,i+x],P=[a+b,0,i+S],m=[a+g*.9+p.x*.7,u,i+x*.9+p.z*.7],F=[a+b*.9+p.x*.7,u,i+S*.9+p.z*.7],z=[a+p.x,o,i+p.z];r.push(...d,...P,...F,...d,...F,...m,...m,...F,...z)}},e=[.31,.77,.13,.55,.92,.4,.66];for(let a=0;a<7;a++){let i=-.95+a/6*1.9,o=.9+e[a]*1.1+(a===3?.4:0);t(i,(e[(a+2)%7]-.5)*.35,o,.17+e[(a+4)%7]*.1,(e[a]-.5)*.7,e[(a+1)%7]*6)}let s=new Rt.BufferGeometry;return s.setAttribute("position",new Rt.Float32BufferAttribute(r,3)),s.computeVertexNormals(),s}var ks=class{constructor(t,e,s){this.G=t,this.petalGeo=va(),this.items=[];let a={spring:[14183064,16766694],summer:[14715418,16769146],autumn:[11024924,16752704]},i=()=>{let n={};for(let[l,[h,c]]of Object.entries(a))n[l]=xa(t,h,c);return n};this.iceGeo=ka();for(let n=0;n<Di;n++){let l=i(),h=new Rt.InstancedMesh(this.petalGeo,l.spring,Gs);h.frustumCulled=!1,h.visible=!1;let c=new Rt.Mesh(this.iceGeo,ya(t));c.visible=!1,s.add(h,c),this.items.push({petals:h,ice:c,mats:l,s:0,charge:0,open:0,state:"off",x:0,y:0,z:0,tx:0,tz:0,sx:0,sz:0,kind:"bud"})}let o=Array.from({length:Di},()=>new Rt.Vector3(0,-999,0));this.glow=Re(o,e.glow,t,1,16769696),this.glow.mesh.geometry.instanceCount=0,s.add(this.glow.mesh),this._m=new Rt.Matrix4,this._q=new Rt.Quaternion,this._e=new Rt.Euler,this._v=new Rt.Vector3,this._s=new Rt.Vector3,this.list=[]}setup(t,e,s,a=[],i="spring"){this.list=[],this.items.forEach((o,n)=>{let l=a[n];if(o.petals.visible=!1,o.ice.visible=!1,!l){o.state="off";return}let h=e+(s-e)*l,c=t.sample(h,{});Object.assign(o,{s:h,x:c.x,y:c.y,z:c.z,tx:c.tx,tz:c.tz,sx:c.sx,sz:c.sz,charge:0,open:0,state:"closed"}),o.kind=i==="winter"?"ice":"bud",o.kind==="ice"?(o.ice.visible=!0,o.ice.position.set(c.x,c.y-.02,c.z),o.ice.rotation.set(0,Math.atan2(c.tx,c.tz),0),o.ice.scale.setScalar(1)):(o.petals.visible=!0,o.petals.material=o.mats[i]||o.mats.spring),this.list.push(o),this._pose(o,0)}),this.glow.mesh.geometry.instanceCount=this.list.length}_pose(t,e){if(t.kind==="ice"){let i=1-Es(e);t.ice.scale.set(Math.max(.01,i)*1.05,Math.max(.01,i)*1,Math.max(.01,i)*1),t.ice.visible=i>.02;return}let s=this._v.set(t.x,t.y+.05,t.z),a=Math.atan2(t.tx,t.tz);for(let i=0;i<Gs;i++){let o=i/Gs*Math.PI*2,n=.18+Es(e)*1.45;this._e.set(-n,a+o,0,"YXZ"),this._q.setFromEuler(this._e);let l=1.55*(1-e*.35);this._s.set(l,l*(1.05-e*.2),l);let h=.12+e*.55,c=s.x+Math.sin(a+o)*h,p=s.z+Math.cos(a+o)*h;this._m.compose(this._v.set(c,s.y-e*.05,p),this._q,this._s),t.petals.setMatrixAt(i,this._m),this._v.copy(s)}t.petals.instanceMatrix.needsUpdate=!0}limit(t){let e=1/0;for(let s of this.list)s.state!=="open"&&s.s>t-.2&&(e=Math.min(e,s.s-Us));return e}update(t,e,s,a,i,o,n){let l=this.glow.attr.array,h=0;for(let c of this.list){let p=c.s-e<Us+.5&&c.s-e>-.5;if(c.state==="closed"&&!p)c.charge=Math.max(0,c.charge-t*.1);else if(c.state==="closed"){let f=0,g=ma;for(let[x,b]of g){let S=c.x+c.sx*x,d=c.z+c.sz*x;(!a.blocked(S,c.y+b,d,s)||i&&i.litAt(S,c.y+b,d,.5))&&f++}f/=g.length,c.charge=At(c.charge+(f>0?f*.6:-.1)*t,0,1),f>0&&Math.random()<t*10&&ve(o,c.x+(Math.random()-.5),c.y+1+Math.random(),c.z+(Math.random()-.5),1,[2.2,1.7,.8]),c.charge>=1&&(c.state="opening",n(c),ve(o,c.x,c.y+1.2,c.z,26,[2.4,2,1]))}else c.state==="opening"&&(c.open=Math.min(1,c.open+t/.9),this._pose(c,c.open),c.open>=1&&(c.state="open"));let u=c.kind==="ice"?c.ice.material:c.petals.material;u.uniforms.uCharge.value=c.charge,u.uniforms.uOpen&&(u.uniforms.uOpen.value=c.open),l[h*4]=c.x,l[h*4+1]=c.y+1.1,l[h*4+2]=c.z,l[h*4+3]=c.state==="open"?0:.25+c.charge*1.3,h++}this.glow.attr.needsUpdate=!0}pending(t){for(let e of this.list)if(e.state==="closed"&&e.s>t-.2&&e.s-t<Us+.3)return e;return null}hide(){for(let t of this.items)t.petals.visible=!1,t.ice.visible=!1,t.state="off";this.list=[],this.glow.mesh.geometry.instanceCount=0}};import*as Bt from"three";var bs=12,ue=4,qs=1.75,Bi=1.05,Ms=[];for(let r=0;r<4;r++)Ms.push([.8,r/4*L,1.9]);for(let r=0;r<2;r++)Ms.push([.22,r*Math.PI,2.6]);for(let r=0;r<6;r++)Ms.push([1.38,r/6*L+.4,1.35]);function ba(){let r=[],t=[],e=(u,f,g,x,b,S)=>{r.push(u,f,g),t.push(x,b,S)},s=(u,f,g)=>{e(...u),e(...f),e(...g)},a=[0,.02,.36,0,0,.15],i=[-.06,0,.13,0,0,0],o=[.06,0,.13,0,0,0],n=[0,0,-.12,0,0,0];s(a,i,o),s(i,n,o);let l=[-.13,0,-.38,.15,.5,.6],h=[.13,0,-.38,.15,.5,.6],c=[0,0,-.26,0,0,.1];s(n,l,c),s(n,c,h);for(let u of[-1,1]){let f=[.04*u,0,.15,0,0,0],g=[.05*u,0,-.06,0,0,0],x=[.31*u,0,.11,1,.25,.35],b=[.29*u,0,-.07,1,.25,.25],S=[.68*u,0,-.22,1,1,1];s(f,x,g),s(g,x,b),s(x,S,b)}let p=new Bt.BufferGeometry;return p.setAttribute("position",new Bt.Float32BufferAttribute(r,3)),p.setAttribute("aW",new Bt.Float32BufferAttribute(t,3)),p}var Li=`
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
	}`,ws=class{constructor(t,e,s){let a=ba(),i=new Bt.InstancedBufferGeometry;i.setAttribute("position",a.getAttribute("position")),i.setAttribute("aW",a.getAttribute("aW")),this.aP=new Bt.InstancedBufferAttribute(new Float32Array(bs*4),4).setUsage(Bt.DynamicDrawUsage),this.aF=new Bt.InstancedBufferAttribute(new Float32Array(bs*4),4).setUsage(Bt.DynamicDrawUsage),this.aB=new Bt.InstancedBufferAttribute(new Float32Array(bs*2),2).setUsage(Bt.DynamicDrawUsage),i.setAttribute("iP",this.aP),i.setAttribute("iF",this.aF),i.setAttribute("iB",this.aB),i.instanceCount=0,this.geo=i;let o=new Bt.ShaderMaterial({vertexShader:Li,fragmentShader:`
				${bt}
				${ee}
				${Ot}
				varying vec3 vW; varying float vRim;
				void main() {
					// m\xFCrekkep siluet; kanat u\xE7lar\u0131nda Zifir'in mor kenar \u0131\u015F\u0131\u011F\u0131, g\xFCne\u015F arkadaysa alt\u0131n s\u0131z\u0131nt\u0131
					vec3 c = vec3(0.03, 0.022, 0.06) + vec3(0.36, 0.27, 0.9) * vRim * 0.35;
					vec3 V = normalize(cameraPosition - vW);
					c += uSunCol * pow(max(dot(-V, uSunDir), 0.0), 6.0) * vRim * 0.25;
					gl_FragColor = finish(applyFog(c, vW), 1.0);
				}`,uniforms:{...t},side:Bt.DoubleSide});if(this.mesh=new Bt.Mesh(i,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=8,this.mesh.visible=!1,e.add(this.mesh),s){let n=new Bt.ShaderMaterial({vertexShader:Li,fragmentShader:"void main() { gl_FragColor = vec4(1.0); }",uniforms:{...t},side:Bt.DoubleSide,colorWrite:!1});this.shadowMesh=new Bt.Mesh(i,n),this.shadowMesh.frustumCulled=!1,this.shadowMesh.matrixAutoUpdate=!1,this.shadowMesh.visible=!1,s.add(this.shadowMesh)}this.birds=[];for(let n=0;n<bs;n++)this.birds.push({i:n,st:"off",x:0,y:-999,z:0,vx:0,vy:0,vz:0,hx:0,hy:0,hz:1,ph:Math.random()*L,sc:0,tsc:0,t:0,bank:0,ox:0,oy:0,oz:0});this.count=0,this.active=0,this.dur=1,this.c=new Bt.Vector3,this._e1=new Bt.Vector3,this._e2=new Bt.Vector3,this._L=new Bt.Vector3(0,1,0),this.glow=0}reset(t,e){this.count=0,this.active=0;for(let s of this.birds)s.st="off",s.sc=0;for(let s=0;s<t;s++)this.add(e,!0);this.mesh.visible=t>0}add(t,e=!1){if(this.count>=ue)return!1;let s=this.birds[this.count++];if(s.st="orbit",s.t=0,s.tsc=.68,e){let a=s.i/ue*L;s.x=t.x+Math.cos(a)*1.3,s.y=t.y+1.8,s.z=t.z+Math.sin(a)*1.3,s.vx=s.vy=s.vz=0,s.sc=.68}else{let a=Math.random()*L;s.x=t.x+Math.cos(a)*13,s.y=t.y+7+Math.random()*3,s.z=t.z+Math.sin(a)*13,s.vx=-Math.cos(a)*4,s.vy=-2,s.vz=-Math.sin(a)*4,s.sc=.68}return this.mesh.visible=!0,!0}get ready(){return this.count>=ue&&this.active<=0}activate(t,e){if(!this.ready)return!1;this.active=t,this.dur=t;for(let s of this.birds){if(s.st==="off"){let a=Math.random()*L;s.x=e.x,s.y=e.y+.5,s.z=e.z,s.vx=Math.cos(a)*5,s.vy=3+Math.random()*3,s.vz=Math.sin(a)*5,s.sc=.05}s.st="shield",s.t=0,s.tsc=s.i<ue?.95:.85}return this.mesh.visible=!0,this.shadowMesh&&(this.shadowMesh.visible=!0),!0}release(t=!1){for(let e of this.birds){if(e.st==="off")continue;e.st="leave",e.t=0;let s=Math.random()*L;e.ox=Math.cos(s)*9,e.oy=(t?9:5)+Math.random()*4,e.oz=Math.sin(s)*9}this.count=0,this.active=0}hide(){for(let t of this.birds)t.st="off",t.sc=0;this.count=0,this.active=0,this.mesh.visible=!1,this.shadowMesh&&(this.shadowMesh.visible=!1),this.geo.instanceCount=0}blocks(t,e,s,a){if(this.active<=0)return!1;let i=this.c.x-t,o=this.c.y-e,n=this.c.z-s,l=i*a.x+o*a.y+n*a.z;return l<0?!1:i*i+o*o+n*n-l*l<Bi*Bi}get strength(){return this.active>0?At(this.active/.6,0,1):0}update(t,e,s,a){let i=this._L.copy(a);i.y<.05&&(i.y=.05),i.normalize();let o=this.c.set(s.x+i.x*qs,s.y+.55+i.y*qs,s.z+i.z*qs),n=Math.hypot(o.x,o.z),l=$t(o.y)+.9;n<l&&(o.x*=l/n,o.z*=l/n);let h=i.x,c=i.y+1,p=i.z,u=Math.hypot(h,c,p);h/=u,c/=u,p/=u;let f=this._e1.set(-p,0,h);f.lengthSq()<1e-4&&f.set(1,0,0),f.normalize();let g=this._e2.set(c*f.z-p*f.y,p*f.x-h*f.z,h*f.y-c*f.x).normalize();this.active>0&&(this.active-=t,this.active<=0&&(this.active=0,this.release(!1))),this.glow=Tt(this.glow,this.ready?1:.25,4,t);let x=this.aP.array,b=this.aF.array,S=this.aB.array,d=0,P=!1;for(let m of this.birds){if(m.st==="off")continue;P=!0,m.t+=t;let F,z,W,X=6,nt=4,rt=9,ht=0,gt=0,pt=0,xt=0;if(m.st==="orbit"){let k=e*1.25+m.i/ue*L,y=1.35+.2*Math.sin(e*.9+m.i*2.1);F=s.x+Math.cos(k)*y,z=s.y+2+.3*Math.sin(e*1.7+m.i*1.3),W=s.z+Math.sin(k)*y,gt=-Math.sin(k),pt=Math.cos(k),xt=1,ht=-.45,X=m.t<2.5?10:7,nt=m.t<2.5?3:7,rt=8+(m.t<2.5?6:0)}else if(m.st==="shield"){let k=Ms[m.i],y=k[2],H=e*y+k[1],_=k[0]*(.7+.3*this.strength)+.08*Math.sin(e*1.3+m.i*2.7),M=.14*Math.sin(e*2.1+m.i*1.9),w=Math.cos(H),A=Math.sin(H);F=o.x+f.x*w*_+g.x*A*_+h*M,z=o.y+f.y*w*_+g.y*A*_+c*M,W=o.z+f.z*w*_+g.z*A*_+p*M,gt=-f.x*A+g.x*w,pt=-f.z*A+g.z*w,xt=m.t>.35?1:0,ht=.55,X=14,nt=m.t<.5?4:12,rt=10}else if(F=m.x+m.ox,z=m.y+m.oy,W=m.z+m.oz,X=9,nt=2.5,rt=13,m.tsc=Math.max(0,.6-m.t*.45),m.t>1.6){m.st="off",m.sc=0;continue}let Mt=F-m.x,_t=z-m.y,Wt=W-m.z,C=Math.hypot(Mt,_t,Wt)||1e-4,B=Math.min(X,C*3.2);m.vx=Tt(m.vx,Mt/C*B,nt,t),m.vy=Tt(m.vy,_t/C*B,nt,t),m.vz=Tt(m.vz,Wt/C*B,nt,t),m.x+=m.vx*t,m.y+=m.vy*t,m.z+=m.vz*t;let D=Math.hypot(m.vx,m.vy,m.vz),tt=xt?At(1.5-D/4,0,1):0,it=m.vx/(D||1)*(1-tt)+gt*tt,K=m.vy/(D||1)*(1-tt)*.6,q=m.vz/(D||1)*(1-tt)+pt*tt;m.hx=Tt(m.hx,it,10,t),m.hy=Tt(m.hy,K,10,t),m.hz=Tt(m.hz,q,10,t),m.bank=Tt(m.bank,ht,5,t),m.sc=Tt(m.sc,m.tsc,6,t),m.ph+=t*(rt+Math.max(0,m.vy)*2)*(.7+.3*Math.sin(e*.7+m.i*3.1)*(m.st==="orbit"?1:0)),x[d*4]=m.x,x[d*4+1]=m.y,x[d*4+2]=m.z,x[d*4+3]=m.sc,b[d*4]=m.hx,b[d*4+1]=m.hy,b[d*4+2]=m.hz,b[d*4+3]=m.ph,S[d*2]=m.bank,S[d*2+1]=m.st==="shield"?.6:this.glow,d++}this.geo.instanceCount=d,this.mesh.visible=P,this.shadowMesh&&(this.shadowMesh.visible=this.active>0&&d>0),d&&(this.aP.needsUpdate=!0,this.aF.needsUpdate=!0,this.aB.needsUpdate=!0)}};var Lt=(r=0,t=0,e=0)=>new Oi.Vector3(r,t,e),wa=4,Ma=.42,Ta=.22,za=1.35,Wi=1,_a=4.2,$i=5,Sa=1.1,Ea=.3,Ts=class{constructor(t,e,s){this.app=t,this.ui=e,this.sfx=s;let a=t.world;this.world=a,this.curve=a.curve,this.G=t.G,this.store=t.store,this.tester=new fs(a),this.zifir=new gs(t.G,a.tex,{segs:t.tier.id>=1?40:28}),this.zifir.g.visible=!1,a.scene.add(this.zifir.g),this.drops=new ms(t.G,a.tex,a.scene),this.beams=new ys(t.G,a.tex,a.scene,a),this.drops.beams=this.beams,this.locks=new ks(t.G,a.tex,a.scene),this.fx=new Xe(t.G,a.tex.particles,{additive:!0}),this.petals=new Xe(t.G,a.tex.particles,{additive:!1}),a.scene.add(this.fx.mesh,this.petals.mesh),this.flock=new ws(t.G,a.scene,t.shadow&&t.shadow.scene),this._ft={blocked:(i,o,n,l)=>this.flock.blocks(i,o,n,l)||this.tester.blocked(i,o,n,l)},this.streak=0,this.best=0,this.score=0,this.nearN=0,this.timeScale=1,this._slowT=0,this._slowK=1,this._popT=-9,this._abKey=-1,this._progU=-1,this.prog=Object.assign({unlocked:0,stars:[],dust:0,fails:{},seen:{},intro:!1},this.store.get("progress")||{}),this.settings=Object.assign({sound:!0,haptics:!0,quality:"auto",power:"auto"},this.store.get("settings")||{}),this.sfx.setOn(this.settings.sound),this.state="title",this.stateT=0,this.level=null,this.li=0,this.s=0,this.speed=0,this.hold=!1,this.keyHold=!1,this.meter=1,this.expo=0,this.minMeter=1,this.burnTotal=0,this.sunAz=0,this.sunTarget=0,this.elev=34,this.levelT=0,this.dragged=!1,this.sunDir=Lt(0,1,0),this.zp=Lt(),this._ahead=Lt(),this._smp={},this._smp2={},this._hintUntil=0,this._hintQueue=[],this._pts=[Lt(),Lt(),Lt(),Lt(),Lt(),Lt()],this.rays=t.tier.id>=1?6:4,this.envFrom="spring",this.envTo="spring",this.envT=1,this.envDur=1,this._titleSeason=0,this._onStep=()=>this.sfx.step(),this._bindInput(),this.ui.setToggles(this.settings),this.ui.setPlayLabel(this.prog.unlocked>0||this.prog.intro?"Devam Et":"Ba\u015Fla"),this.goTitle(!0)}_bindInput(){let t=this.app.container,e=null,s=0;t.addEventListener("pointerdown",i=>{this.sfx.unlock(),!i.target.closest("button")&&e===null&&(e=i.pointerId,s=i.clientX,this.state==="intro"&&this.ui.skip(!0))}),t.addEventListener("pointermove",i=>{if(i.pointerId!==e)return;let o=i.clientX-s;s=i.clientX,this.drag(o/Math.max(320,t.clientWidth))});let a=i=>{i.pointerId===e&&(e=null)};t.addEventListener("pointerup",a),t.addEventListener("pointercancel",a),this._onKey=i=>{i.repeat&&i.key!=="ArrowLeft"&&i.key!=="ArrowRight"||(i.key==="ArrowLeft"?this.drag(-.06):i.key==="ArrowRight"?this.drag(.06):(i.key==="f"||i.key==="F"||i.key==="Enter")&&i.type==="keydown"?this.callFlock():i.key===" "?(this.keyHold=i.type==="keydown",i.preventDefault()):i.key==="Escape"&&i.type==="keydown"&&(this.state==="play"||this.state==="ready"?this.pause():this.state==="paused"&&this.resume()))},window.addEventListener("keydown",this._onKey),window.addEventListener("keyup",this._onKey)}drag(t){this.state!=="play"&&this.state!=="ready"||(this.sunTarget-=t*L*.85,!this.dragged&&Math.abs(t)>.004&&(this.dragged=!0,this.state==="ready"&&this._begin()))}wait(t){this.hold=t}_set(t){this.state=t,this.stateT=0,this.app.wake()}envTo2(t,e=2){this.envT<1?this.envFrom=this.envT>.5?this.envTo:this.envFrom:this.envFrom=this.envTo,this.envTo=t,this.envT=0,this.envDur=e}goTitle(t=!1){var e,s;this._set("title"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.show("title"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.flock.hide(),this.sfx.lockCharge(null),this.sfx.music("title"),(s=(e=this.ui).ability)==null||s.call(e,"flock",{count:0,max:ue,ready:!1,active:!1}),this.app.gov.menu=!0,t?(this.envFrom=this.envTo="spring",this.envT=1):this.envTo2("spring",1.5),this._orbit={a:.6,r:84,y:16,ly:25}}goLevels(){this._set("levels"),this.ui.hudOn(!1),this.ui.card(null),this.ui.hint(null),this.ui.renderLevels(Se,this.prog),this.ui.show("levels"),this.zifir.g.visible=!1,this.drops.hideAll(),this.beams.hide(),this.locks.hide(),this.flock.hide(),this.sfx.music("title"),this.app.gov.menu=!0,this._orbit||(this._orbit={a:.6,r:84,y:16,ly:25})}action(t){if(this.sfx.unlock(),t==="ability:flock")return this.callFlock();if(this.sfx.ui(),t==="play")this.prog.intro?this.startLevel(Math.min(this.prog.unlocked,qe-1)):this.startIntro();else if(t==="levels")this.goLevels();else if(t==="title")this.goTitle();else if(t==="exit")this.app.exit();else if(t.startsWith("lv:")){let e=Number(t.slice(3));e<=this.prog.unlocked?this.startLevel(e):this.ui.toast("\xD6nceki b\xF6l\xFCm\xFC tamamla")}else t==="pause"?this.pause():t==="resume"?this.resume():t==="retry"?this.startLevel(this.li,{retry:!0}):t==="next"?this.startLevel(Math.min(this.li+1,qe-1),{cont:!0}):t==="skip"?this.skipIntro():t==="settings"&&(this._settingsFromTitle=!0,this.ui.$(".uk-card h4").textContent="Ayarlar",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Tamam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="none",this.ui.$("[data-s=pause] [data-a=levels]").style.display="none",this.ui.show("pause"))}toggle(t){let e=this.settings;if(t==="sound")e.sound=!e.sound,this.sfx.setOn(e.sound);else if(t==="haptics")e.haptics=!e.haptics;else if(t==="quality"){let s=["auto",0,1,2];e.quality=s[(s.indexOf(e.quality)+1)%s.length],this.ui.toast("Grafik ayar\u0131 bir sonraki a\xE7\u0131l\u0131\u015Fta uygulan\u0131r")}else if(t==="power"){let s=["auto","saver","performance"];e.power=s[(s.indexOf(e.power)+1)%s.length],this.app.gov.power=e.power,this.app.resize()}this.store.set("settings",e),this.ui.setToggles(e)}pause(){this.state!=="play"&&this.state!=="ready"||(this._paused=this.state,this._set("paused"),this._settingsFromTitle=!1,this.ui.$(".uk-card h4").textContent="Duraklat\u0131ld\u0131",this.ui.$("[data-s=pause] [data-a=resume]").textContent="Devam",this.ui.$("[data-s=pause] [data-a=retry]").style.display="",this.ui.$("[data-s=pause] [data-a=levels]").style.display="",this.ui.show("pause"),this.sfx.tick(0,0,0,!1),this.sfx.lockCharge(null),this.sfx.music("soft"))}resume(){if(this._settingsFromTitle){this._settingsFromTitle=!1,this.ui.show("title");return}this.state==="paused"&&(this.ui.show(null),this._set(this._paused||"play"),this.sfx.music("play"))}haptic(t){if(this.settings.haptics&&!(this.app.hooks.haptic&&this.app.hooks.haptic(t)===!0))try{navigator.vibrate&&navigator.vibrate(t)}catch{}}startIntro(){this._set("intro"),this.ui.show(null),this.ui.hudOn(!1),this.app.gov.menu=!1,this.envFrom=this.envTo="spring",this.envT=1;let t=Ls(0);this._setupLevelData(0),this._birds0=0;let e=this.curve.sample(this.s,this._smp),s=this.curve.sample(this.s+3,this._smp2),a=this.app.rig;a.followTarget(Lt(e.x,e.y,e.z),Lt(s.x,s.y,s.z));let i=a.tPos.clone(),o=a.tLook.clone(),n=Math.atan2(e.z,e.x);a.play([{t:0,pos:Lt(Math.cos(n+1.3)*150,-6,Math.sin(n+1.3)*150),look:Lt(0,22,0),fov:44},{t:4.5,pos:Lt(Math.cos(n+.9)*62,14,Math.sin(n+.9)*62),look:Lt(0,30,0),fov:46},{t:8.5,pos:Lt(Math.cos(n+.4)*30,59,Math.sin(n+.4)*30),look:Lt(0,55,0),fov:50},{t:11.5,pos:i,look:o}],()=>this._enterLevel(0,{fromIntro:!0})),this.sunAz=this.sunTarget=n+Math.PI*.6,this.zifir.g.visible=!0,this._lore=[[.6,"G\xF6k ile yeri bir a\u011Fa\xE7 ba\u011Flar: Ulu Kay\u0131n."],[4.4,"T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 k\xF6klerine d\xFC\u015Ft\xFC."],[8,"G\xFCne\u015F a\u011Fac\u0131n \xE7evresinde d\xF6ner; g\xF6lgesi Zifir\u2019in yoludur."]],this._loreI=0,this.ui.skip(!0)}skipIntro(){this.state==="intro"&&(this.ui.lore(null),this.ui.skip(!1),this.app.rig.skipCine())}_setupLevelData(t){var a,i;this.li=t,this.level=Ls(t);let e=this.level;[this.s0,this.s1]=us(this.curve,t),this.s=this.s0,this.drops.setup(this.curve,this.s0,this.s1,e.drops),this.locks.setup(this.curve,this.s0,this.s1,e.locks,e.season),this.ui.setLevel(e),this.ui.setDrops(0,e.drops.length),this.sfx.resetDrops(),this.sfx.season=e.season,this.meter=1,this.minMeter=1,this.burnTotal=0,this.expo=0,this.speed=0,this.levelT=0,this.dragged=!1,this.got=0,this.lostN=0;let s=this.prog.fails[t]||0;this.fails=s,this.mercy=Math.max(.55,1-.12*s),this.burnK=(e.burn||1)*this.mercy,this.streak=0,this.best=0,this.score=0,this.nearN=0,this.unlocks=0,this._shadeD=0,this._birdD=0,this._litT=0,this._shadeT=0,this._wasLit=!1,this._expMin=1,this._scared=!1,this._lastStand=0,this._lastUsed=!1,this._slowT=0,this.timeScale=1,this._tutShade=t!==0,this._flockOn=!1,this._beamHit=!1,this._lkOn=!1,this._pend=null,(this._dropWarn||(this._dropWarn=new Uint8Array(16))).fill(0),this._progU=-1,(i=(a=this.ui).streak)==null||i.call(a,0),this.sfx.streakReset(),this.elev=e.elev[0],Yt.str=e.wind,Yt.gust=0,this._gate=0,this._lockT=0,this._arcOn=!1,this.ui.lockArc(null)}startLevel(t,{retry:e=!1,cont:s=!1}={}){let a=s&&this.level&&this.li===t-1,i=this.s,o=a?this._carryBirds||0:e&&this.li===t&&this._startBirds||0;this._setupLevelData(t);let n=this.fails>0?Math.min(ue,this.fails+1):0;this._birds0=Math.max(o,n),this._mercyBirds=n>o,this._startBirds=o,this.zifir.reset(),this.zifir.g.visible=!0,this.fx.clear(),this.petals.clear(),a?(this._walkFrom=i,this.s=i):this._walkFrom=null,this._enterLevel(t,{retry:e,cont:a})}_enterLevel(t,{retry:e=!1,fromIntro:s=!1,cont:a=!1}={}){let i=this.level;this._set("enter"),this.ui.show(null),this.ui.hudOn(!1),this.ui.lore(null),this.ui.skip(!1),this.app.gov.menu=!1,this.envTo!==i.season&&this.envTo2(i.season,a?3:1.6);let o=this.curve.sample(this.s0,this._smp),n=Math.atan2(o.z,o.x);s?this.sunTarget=n+i.sunStart:this.sunAz=this.sunTarget=n+i.sunStart;let l=this.app.rig,h=this.curve.sample(this.s0+3,this._smp2);if(l.followTarget(Lt(o.x,o.y,o.z),Lt(h.x,h.y,h.z)),!s&&!e&&!a){let p=l.tPos.clone(),u=l.tLook.clone(),f=l.pos.clone(),g=Lt(Math.cos(n-.6)*34,o.y+9,Math.sin(n-.6)*34);l.play([{t:0,pos:f,look:l.look.clone()},{t:1.4,pos:g,look:Lt(o.x*.5,o.y+1,o.z*.5)},{t:2.6,pos:p,look:u}],null)}else e?(l.mode="follow",l.snap()):l.mode="follow";this.ui.card(i.kicker,i.title,i.finale?"Son b\xF6l\xFCm":""),this._cardT=e?1.3:2.4,this.ui.setDrops(0,i.drops.length),this._queueHints(i.hints||[]);let c=this.curve.sample(this.s,this._smp);this.zp.set(c.x,c.y,c.z),this.flock.reset(this._birds0||0,this.zp),this._abil(),this.sfx.music("play"),this.sfx.lockCharge(null)}_queueFront(t){this._hintQueue.includes(t)||this._hintQueue.unshift(t)}_queueHints(t){this._hintQueue=t.filter(e=>!this.prog.seen[e])}_showHint(t,e=4.5){this.ui.hint(t),this._hintUntil=this.levelT+e,this._hintKey=t,this.prog.seen[t]=!0,this.store.set("progress",this.prog)}_hintLater(t,e=4.5){this.prog.seen[t]||(this._hintKey?this._pend=[t,e]:this._showHint(t,e))}_begin(){this._set("play"),this.ui.hudOn(!0),this._hintKey==="drag"&&(this.ui.hint(null),this._hintKey=null,this._hintQueue[0]==="hide"&&this._showHint(this._hintQueue.shift(),4.5))}update(t,e){var m,F;this.stateT+=t,this.envT<1&&(this.envT=Math.min(1,this.envT+t/this.envDur));let s=this.state;if(s==="title"||s==="levels")return this._updateOrbit(t,e);if(s==="intro")return this._updateIntro(t,e);if(s==="paused"||s==="complete"||s==="fail"||s==="ending"){this.app.idle=this.stateT>1.2,this._updateZifirOnly(t,e,s==="paused");return}this.app.idle=!1;let a=this.level,i=this.curve,o=this.sunTarget-this.sunAz,n=wa*t;this.sunAz+=At(o,-n,n),this._slowT>0&&(this._slowT-=t),this.timeScale=Tt(this.timeScale,this._slowT>0?this._slowK:1,this._slowT>0?16:4,t),t*=this.timeScale,this.levelT+=s==="play"?t:0,Yt.gust=s==="play"?Si(a.gust,this.levelT):0;let l=s==="play"&&Ws(a.gust,this.levelT)<1.6&&Yt.gust<.05;this.ui.gust(l),l&&!this._gustSoon&&(this.sfx.gustWarn(),this.haptic(6)),this._gustSoon=l,s==="play"&&a.gust&&Ws(a.gust,this.levelT)<1.6&&this._hintQueue[0]==="gust"&&this._showHint(this._hintQueue.shift(),4);let h=!1;if(s==="enter")this._cardT-=t,this._cardT<.4&&this.ui.card(null),this._walkFrom!=null&&this.s<this.s0&&(this.s=Math.min(this.s0,this.s+1.6*t),h=!0),this.app.rig.mode!=="cine"&&this._cardT<.6&&(this._walkFrom==null||this.s>=this.s0)&&(this.ui.card(null),this.ui.hudOn(!0),this.li===0&&!this.prog.seen.drag?(this._set("ready"),this._showHint(this._hintQueue.shift()||"drag",999)):(this._set("play"),this._mercyBirds&&(this._pop("Ku\u015Flar yard\u0131ma geldi","good"),this._mercyBirds=!1),this._hintQueue.length&&this._hintQueue[0]!=="gust"&&this._hintQueue[0]!=="bridge"&&this._showHint(this._hintQueue.shift(),4.5),this.flock.ready&&this.li>=1&&this._hintLater("flock",5.5)));else if(s==="ready")this.stateT>7&&this._begin();else if(s==="play"){let z=this.hold||this.keyHold,W=this.locks.limit(this.s),X=this.s>=W-.05,nt=At((W-this.s)/.7,0,1),rt=this.expo>.3?za:1,ht=z?0:a.speed*nt*rt;if(this.speed=Tt(this.speed,ht,z?14:5,t),this.s=Math.min(this.s+this.speed*t,Math.max(this.s,W)),h=this.speed>.15,X&&!this.prog.seen.lock&&this._showHint("lock",6),this._lockT=X?(this._lockT||0)+t:0,this._lockT>(this.li<=1?2.5:4)?this._lockAssist():this._arcOn&&(this.ui.lockArc(null),this._arcOn=!1),this._hintQueue[0]==="bridge")for(let gt of Le){let pt=i.sAtTheta(gt.th);pt>this.s&&pt-this.s<9&&this._showHint(this._hintQueue.shift(),4.5)}}let c=i.sample(this.s,this._smp);this.zp.set(c.x,c.y,c.z);let p=i.sample(Math.min(i.length,this.s+3.2),this._smp2);this._ahead.set(p.x,p.y,p.z);let u=Math.atan2(c.z,c.x),f=At((this.s-this.s0)/(this.s1-this.s0),0,1);this.elev=Y(a.elev[0],a.elev[1],f),Ne(this.sunAz,this.elev,this.sunDir),this.flock.update(t,e,this.zp,this.sunDir),this._flockOn&&this.flock.active<=0&&(this._flockOn=!1,this.sfx.flockEnd(),this._abil());let g=s==="play";this.tester.setTime(e);let x=0;if(g||s==="ready"){let z=this._pts,W=c.tx,X=c.tz,nt=c.sx,rt=c.sz;z[0].set(c.x,c.y+.48,c.z),z[1].set(c.x,c.y+.86,c.z),z[2].set(c.x+nt*.3,c.y+.36,c.z+rt*.3),z[3].set(c.x-nt*.3,c.y+.36,c.z-rt*.3),z[4].set(c.x+W*.3,c.y+.36,c.z+X*.3),z[5].set(c.x-W*.3,c.y+.36,c.z-X*.3);let ht=this._ft;for(let gt=0;gt<this.rays;gt++){let pt=z[gt];ht.blocked(pt.x,pt.y,pt.z,this.sunDir)||x++}x/=this.rays}let b=0;s!=="title"&&s!=="levels"&&(b=this.beams.update(t,e,c.y,this.sunDir,this.tester,this.zp)),this.flock.active>0&&(b=0),b>0&&g&&this._hintQueue[0]!=="crystal"&&!this.prog.seen.crystal&&this._queueFront("crystal"),this.beams.active.length&&g&&this._hintQueue[0]==="crystal"&&(!this._hintKey||b>0)&&this._showHint(this._hintQueue.shift(),5),b>.3&&g&&!this._beamHit&&(this.app.rig.shake=Math.max(this.app.rig.shake,.07)),this._beamHit=b>.3,x=Math.max(x,b),this.expo=Tt(this.expo,x,18,t);let S=!1;if(g&&(S=this._feel(t,x,c,h)),this.G.uDanger.value=Tt(this.G.uDanger.value,g?x*.8+(1-this.meter)*.4*x+(this._lastStand>0?.5:0):0,8,t),this.drops.update(t,e,this.s,this.zp,this._ft,this.sunDir,this.fx,()=>{var z,W;this.got++,this.score+=25,this.ui.setDrops(this.got,this.drops.total,"pop"),this.sfx.drop(),this.haptic(12),(W=(z=this.zifir).react)==null||W.call(z,"drop"),this.got===this.drops.total&&!this.lostN&&this.drops.total>1&&(this._pop("B\xFCt\xFCn damlalar!","gold"),this.score+=50)},()=>{this.lostN++,this.ui.setDrops(this.got,this.drops.total,"bad"),this.sfx.dropLost(),this.haptic(40),this.app.rig.shake=Math.max(this.app.rig.shake,.06),this._pop("Damla eridi","bad"),this.prog.seen.drops!==!0&&this._showHint("drops",4)},g),g){let z=this._dropWarn;for(let W of this.drops.list)W.state==="idle"&&W.melt>.18&&!z[W.i]&&(z[W.i]=1,this.sfx.dropWarn(),this._pop("Damla eriyor!","bad"))}(g||s==="ready")&&this.locks.update(t,this.s,this.sunDir,this.tester,this.beams,this.fx,()=>{var W,X;this.sfx.unlockOpen?this.sfx.unlockOpen():this.sfx.win(),this.haptic([15,30,15]),this.app.rig.shake=Math.max(this.app.rig.shake,.14),this.zifir.hop(),(X=(W=this.zifir).react)==null||X.call(W,"safe"),this.unlocks++,this.score+=30;let z=this._lockT<3;this._pop(z?"\xC7abuk a\xE7t\u0131n!":"A\xE7\u0131ld\u0131!","good"),z&&(this.score+=20),this._hintKey==="lock"&&(this.ui.hint(null),this._hintKey=null),this.ui.lockArc(null),this._arcOn=!1,this._lockT=0,this._lkC=0});let d=g?this.locks.pending(this.s):null;if(d&&d.charge>(this._lkC||0)+1e-5?(this.sfx.lockCharge(d.charge),this._lkOn=!0):this._lkOn&&(this.sfx.lockCharge(null),this._lkOn=!1),this._lkC=d?d.charge:0,this._hintKey&&this._hintKey!=="drag"&&this.levelT>this._hintUntil&&(this.ui.hint(null),this._hintKey=null),this._pend&&!this._hintKey&&g){let[z,W]=this._pend;this._pend=null,this.prog.seen[z]||this._showHint(z,W)}if(g&&S?this._die():g&&this.s>=this.s1&&this._win(),s!=="dying"&&s!=="gate"){let z=this._zstate(c,h,h?Math.max(this.speed,1.2):0,s==="play"&&(this.hold||this.keyHold),g?x:0,x,this.meter);this.zifir.update(t,e,z,this._onStep)}let P=this.app.rig;P.mode==="follow"&&P.followTarget(this.zp,this._ahead),this.ui.compass(Je(this.sunAz-u),x>.01),g&&Math.abs(f-this._progU)>.004&&(this._progU=f,(F=(m=this.ui).progress)==null||F.call(m,f)),this.sfx.intensity=Tt(this.sfx.intensity,g?At((this.streak-2)/14,0,1):0,1.2,t),this.sfx.tick(t,g?x:0,Yt.str+Yt.gust,g,this.meter),this._commonFx(t)}_feel(t,e,s,a){var o,n,l,h,c,p;let i=e<.01;if(i?this.meter=Math.min(1,this.meter+Ta*t):(this.meter-=e*Ma*this.burnK*t,this.burnTotal+=e*t,Math.random()<t*22*e&&je(this.fx,s.x,s.y+.7,s.z,.9)),e>.15?(this._litT+=t,this._shadeT=0):i&&(this._shadeT+=t,this._litT=0),!this._wasLit&&this._litT>.12?this._enterLight():this._wasLit&&this._shadeT>.1&&this._exitLight(),this._wasLit&&(this._expMin=Math.min(this._expMin,this.meter),!this._scared&&this.meter<.3&&(this._scared=!0,(n=(o=this.zifir).react)==null||n.call(o,"scared"),this.haptic([20,30,20]))),!this._tutShade&&i&&this._shadeT>.3&&(this._tutShade=!0,this._pop("G\xF6lgede!","gold"),this.sfx.milestone(5),(h=(l=this.zifir).react)==null||h.call(l,"safe")),i&&a){let u=this.speed*t;for(this._shadeD+=u;this._shadeD>=Wi;)this._shadeD-=Wi,this._streakUp();this.flock.count<ue&&this.flock.active<=0&&(this._birdD+=u,this._birdD>=_a&&(this._birdD=0,this._birdJoin()))}if(this._lastStand>0){if(this._lastStand-=t,i)this._lastStand=0,this._wasLit=!1,this._slowT=0,this.meter=Math.max(this.meter,.15),this._nearMiss(!0);else if(this.meter=Math.max(this.meter,.001),this._lastStand<=0)return!0}else if(this.meter<=0){if(this._lastUsed)return!0;this._lastUsed=!0,this._lastStand=Sa,this.meter=.001,this._slow(.45,.9),this.sfx.lastStand(),this._pop("Son nefes!","bad"),this.haptic([40,30,60]),this.app.rig.shake=Math.max(this.app.rig.shake,.18),(p=(c=this.zifir).react)==null||p.call(c,"scared")}return this.minMeter=Math.min(this.minMeter,this.meter),!1}_enterLight(){var t,e,s,a;this._wasLit=!0,this._expMin=this.meter,this._scared=!1,this.sfx.burnStart(),this.haptic(10),this.app.rig.shake=Math.max(this.app.rig.shake,.05),(e=(t=this.zifir).react)==null||e.call(t,"burn"),this.streak>=5?(this._pop("Seri bozuldu","bad"),this.sfx.streakBreak(this.streak)):this.sfx.streakReset(),this.streak&&(this.streak=0,(a=(s=this.ui).streak)==null||a.call(s,0)),this._shadeD=0}_exitLight(){var t,e;this._wasLit=!1,this._expMin<Ea?this._nearMiss(!1):(e=(t=this.zifir).react)==null||e.call(t,"safe")}_nearMiss(t){var e,s;this.nearN++,this.score+=t?40:15,this._pop(t?"K\u0131l pay\u0131!!":"K\u0131l pay\u0131!","gold"),this.sfx.nearMiss(),this.haptic([20,40,30]),(s=(e=this.zifir).react)==null||s.call(e,"safe"),this._slow(.35,t?.55:.35),this.app.rig.shake=Math.max(this.app.rig.shake,.08),ve(this.fx,this.zp.x,this.zp.y+.7,this.zp.z,t?26:16,[1.4,1.1,2.6])}_streakUp(){var e,s,a,i;let t=++this.streak;if(t>this.best&&(this.best=t),this.score+=1+Math.floor(t/10),(s=(e=this.ui).streak)==null||s.call(e,t),t%5===0){let o=t%10===0;this._pop(`G\xF6lge serisi \xD7${t}`,o?"gold":"good"),this.sfx.milestone(t),this.haptic(o?[12,30,12]:10),o&&ve(this.fx,this.zp.x,this.zp.y+.9,this.zp.z,14,[1.2,1,2.4]),t===10&&((i=(a=this.app.hooks).onStreak)==null||i.call(a,t)),t===5&&this._hintLater("streak",4.5)}else t>=3&&this.sfx.streak(t)}_birdJoin(){if(!this.flock.add(this.zp))return;let t=this.flock.count;this.sfx.birdJoin(t),this.haptic(6),this._abil(),t===ue&&(this._pop("S\xFCr\xFC haz\u0131r!","gold"),this.sfx.flockReady(),this.haptic([10,20,10]),this.li>=1&&this._hintLater("flock",5.5))}callFlock(){var t,e;if(this.state==="play"){if(!this.flock.ready){if(this.flock.active>0)return;this.sfx.ui(),this._pop(`S\xFCr\xFC toplan\u0131yor ${this.flock.count}/${ue}`,"bad");return}this.flock.activate($i,this.zp),this._flockOn=!0,this.sfx.flockGo(),this.haptic([15,25,15,25,40]),this.app.rig.shake=Math.max(this.app.rig.shake,.1),this._pop("S\xFCr\xFC!","gold"),(e=(t=this.zifir).react)==null||e.call(t,"safe"),this._hintKey==="flock"&&(this.ui.hint(null),this._hintKey=null),this._abil()}}_abil(){var s,a;let t=this.flock,e=t.count*4+(t.ready?1:0)+(t.active>0?2:0);e!==this._abKey&&(this._abKey=e,(a=(s=this.ui).ability)==null||a.call(s,"flock",{count:t.count,max:ue,ready:t.ready,active:t.active>0,dur:$i}))}_pop(t,e="good"){var a,i;let s=this.app.time;e!=="gold"&&s-this._popT<.7||(this._popT=s,(i=(a=this.ui).pop)==null||i.call(a,t,e))}_slow(t,e){this._slowK=t,this._slowT=e}_lockAssist(){if(this._assistT=(this._assistT||0)-1,this._assistT>0)return;this._assistT=15;let t=this.locks.pending(this.s);if(!t)return;let e=this.curve.sample(this.s,{}),s=Math.atan2(e.z,e.x),a=this._Lt||(this._Lt=Lt()),i=[];for(let h=0;h<72;h++){let c=h/72*L-Math.PI;Ne(s+c,this.elev,a);let p=!1;for(let f of[.48,.86,.36])this.tester.blocked(e.x,e.y+f,e.z,a)||(p=!0);if(p)continue;let u=!1;for(let f of[1,1.7,.8])this.tester.blocked(t.x,t.y+f,t.z,a)||(u=!0);u&&i.push(c)}if(!i.length)return;let o=Je(this.sunAz-s),n=null,l=0;for(;l<i.length;){let h=l;for(;h+1<i.length&&i[h+1]-i[h]<.1;)h++;let c=(i[l]+i[h])/2,p=Math.abs(Je(c-o));(!n||p<n.d)&&(n={a0:i[l]-.04,a1:i[h]+.04,d:p}),l=h+1}this.ui.lockArc(n.a0,n.a1),this._arcOn=!0}_zstate(t,e,s,a,i,o,n){let l=this._zs||(this._zs={});return l.x=t.x,l.y=t.y,l.z=t.z,l.yaw=Math.atan2(t.tx,t.tz),l.moving=e,l.speed=s,l.hold=a,l.burn=i,l.lit=o,l.meter=n,l}_commonFx(t){this.fx.update(t),this.petals.update(t),this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp)}_updateZifirOnly(t,e,s){if(s)return;let a=this.curve.sample(this.s,this._smp);(this.state==="complete"||this.state==="ending")&&this.zifir.update(t,e,this._zstate(a,!1,0,!1,0,0,1)),this.flock.update(t,e,this.zp,this.sunDir),this._commonFx(t)}_updateOrbit(t,e){let s=this._orbit;s.a+=t*.05;let a=this.app.rig;a.mode="manual";let i=this.app.rig.aspect<1?s.r*1.12:s.r;a.pos.set(Math.cos(s.a)*i,s.y+Math.sin(e*.1)*3,Math.sin(s.a)*i),a.look.set(0,s.ly,0),this.sunAz=s.a+1.1+Math.sin(e*.07)*.6,this.elev=30;let o=["spring","summer","autumn","winter"];if(this._titleSeason+=t,this._titleSeason>9){this._titleSeason=0;let n=o[(o.indexOf(this.envTo)+1)%4];this.envTo2(n,3)}Yt.str=.25,Yt.gust=0,this.elev=null,this.app.sunAz=this.sunAz,this.app.elev=null,this.sfx.season=this.envTo==="night"?"night":this.envTo,this.sfx.tick(t,0,.25,!1),this.app.focus.set(0,30,0),this.app.idle=!1,this.fx.update(t),this.petals.update(t)}_updateIntro(t,e){let s=this.app.rig,a=s.cine?s.cine.t:99;for(;this._loreI<this._lore.length&&a>=this._lore[this._loreI][0];)this.ui.lore(this._lore[this._loreI][1]),this._loreI++;a>10.6&&this.ui.lore(null);let i=this.curve.sample(this.s,this._smp);this.zp.set(i.x,i.y,i.z),this.zifir.update(t,e,this._zstate(i,!1,0,!1,0,0,1)),this.sunAz+=t*.12,this.elev=34,this.app.sunAz=this.sunAz,this.app.elev=this.elev,this.app.focus.copy(this.zp),this.fx.update(t),this.petals.update(t),!s.cine&&this.state==="intro"&&(this.prog.intro=!0,this.store.set("progress",this.prog))}_die(){var i,o;this._set("dying"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),(o=(i=this.ui).streak)==null||o.call(i,0),this.sfx.fail(),this.sfx.lockCharge(null),this.sfx.music("soft"),this.haptic([30,40,60]),this.app.rig.shake=Math.max(this.app.rig.shake,.32),this.flock.release(!1),this._flockOn=!1,this._slowT=0,this.timeScale=1,this.prog.fails[this.li]=(this.prog.fails[this.li]||0)+1,this.store.set("progress",this.prog);let t=performance.now(),e=this.zifir,s=this.zp.clone(),a=()=>{let n=Math.min(1,(performance.now()-t)/1300);e.evaporate(n),Math.random()<.6&&je(this.fx,s.x,s.y+.4,s.z,1.3),this.app.wake(),n<1?requestAnimationFrame(a):(this._set("fail"),this.G.uDanger.value=0,this.ui.showFail({progress:At((this.s-this.s0)/(this.s1-this.s0),0,1),mercy:this.prog.fails[this.li]>=1}))};requestAnimationFrame(a)}_win(){var p,u;let t=this.level;this._set(t.finale?"gate":"won"),this.ui.hudOn(!1),this.ui.hint(null),this.ui.gust(!1),this.G.uDanger.value=0,this.zifir.celebrate?this.zifir.celebrate():this.zifir.hop(),this.sfx.win(),this.sfx.lockCharge(null),this.sfx.music("soft"),this.haptic([20,40,20,40,60]),this.app.rig.shake=Math.max(this.app.rig.shake,.12),this._carryBirds=this.flock.active>0?0:this.flock.count,this.flock.release(!0),this._flockOn=!1,this._slow(.5,.45),(u=(p=this.ui).streak)==null||u.call(p,0);let e=this.zp,s={spring:0,summer:3,autumn:1,winter:2}[t.season];for(let f=0;f<60;f++){let g=Math.random()*L,x=Math.random()*3.4;this.petals.emit(e.x+Math.cos(g)*x,e.y+3+Math.random()*3.5,e.z+Math.sin(g)*x,(Math.random()-.5)*1.2,-.3-Math.random()*.6,(Math.random()-.5)*1.2,3+Math.random()*1.5,.22,.2,.25,.6,1,1,1,1,s,(Math.random()-.5)*4)}ve(this.fx,e.x,e.y+.8,e.z,36,[2.6,2,.9]),ve(this.fx,e.x,e.y+.5,e.z,18,[1.4,1.1,2.6]),t.finale||this._heroCam();let a=this.drops.total,i=[!0,a===0||this.got===a,this.minMeter>.9],o=i.filter(Boolean).length;this.score+=50+(i[2]?50:0);let n=this.prog.stars[this.li]||0,l=10+this.got*5+(i[2]?10:0)+(o===3?10:0)+Math.floor(this.best/5)*2+this.nearN*3,h=o>n?l:Math.round(l*.25);this.prog.stars[this.li]=Math.max(n,o),this.prog.unlocked=Math.min(qe-1,Math.max(this.prog.unlocked,this.li+1)),this.prog.dust+=h,this.prog.fails[this.li]=0;let c=(this.prog.best||[])[this.li]||0;(this.prog.best||(this.prog.best=[]))[this.li]=Math.max(c,this.best),this.store.set("progress",this.prog),this.app.hooks.onReward&&this.app.hooks.onReward({level:this.li,stars:o,dust:h,drops:this.got,streak:this.best}),this._result={title:t.title,kicker:t.kicker,stars:i,dust:h,last:this.li===qe-1,best:this.best,record:this.best>c&&c>0,score:this.score,near:this.nearN,unlocks:this.unlocks},t.finale?this._gateSeq():setTimeout(()=>{this.state==="won"&&(this._set("complete"),this.ui.showComplete(this._result))},1500)}_heroCam(){let t=this.app.rig,e=this.curve.sample(Math.min(this.curve.length,this.s+3.6),{}),s=this.zp,a=Math.hypot(e.x,e.z)||1,i=Lt(e.x+e.x/a*.35,e.y+1.7,e.z+e.z/a*.35),o=Lt(s.x,s.y+1.35,s.z);t.play([{t:0,pos:t.pos.clone(),look:t.look.clone()},{t:3.1,pos:i,look:o}],null)}_gateSeq(){let t=this.world.island,e=t.gatePos.clone(),s=this.zp.clone(),a=this.app.rig,i=t.gateOut,o=e.clone().addScaledVector(i,14).add(Lt(0,4,0));a.play([{t:0,pos:a.pos.clone(),look:a.look.clone()},{t:2.2,pos:e.clone().addScaledVector(i,9).add(Lt(0,2.5,0)),look:e.clone()},{t:6.5,pos:o.add(Lt(0,16,0)),look:Lt(0,22,0),fov:55}],null),this.envTo2("night",5),this.sfx.season="night";let n=performance.now(),l=this.zifir,h=()=>{let c=(performance.now()-n)/1e3,p=At((c-.6)/1.6,0,1),u=s.clone().lerp(Lt(e.x,s.y,e.z),p);l.g.position.copy(u),l.setFade(1-St(.7,1,p)),this.world.gateMat.uniforms.uOpen.value=St(0,1.2,c),c<7?requestAnimationFrame(h):(l.g.visible=!1,this._set("ending"),this.ui.showEnding(this.prog.dust))};requestAnimationFrame(h)}envState(){let t=this.envT;return[this.envFrom,this.envTo,t*t*(3-2*t)]}destroy(){window.removeEventListener("keydown",this._onKey),window.removeEventListener("keyup",this._onKey)}};var Ni=`
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
`;var Vt=(r,t="")=>`<svg viewBox="0 0 24 24"${t?` class="${t}"`:""} aria-hidden="true">${r}</svg>`,kt={back:Vt('<path d="M15 5l-7 7 7 7"/>'),pause:Vt('<path d="M9 6.5v11M15 6.5v11"/>'),play:Vt('<path d="M8.5 5.8v12.4c0 .7.8 1.1 1.4.7l9.2-6.2c.5-.4.5-1.1 0-1.4L9.9 5.1c-.6-.4-1.4 0-1.4.7z"/>',"f"),path:Vt('<path d="M8 14.5h8.6a3.8 3.8 0 0 0 .8-7.5 5.5 5.5 0 0 0-10.7-.3A3.9 3.9 0 0 0 8 14.5z"/><path d="M12 14.5v5M12 17l-2.3-1.8M12 16l2.3-1.6M8.5 21.5c1.4-.3 2.5-1 3.5-2.2 1 1.2 2.1 1.9 3.5 2.2"/>'),gear:Vt('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),retry:Vt('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 4v4.5H9"/>'),next:Vt('<path d="M5 12h13M13 6l6 6-6 6"/>'),home:Vt('<path d="M4 11.5L12 4l8 7.5M6.5 9.5V20h11V9.5"/>'),sound:Vt('<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>'),vibe:Vt('<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7"/>'),gem:Vt('<path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/>'),battery:Vt('<rect x="3" y="7.5" width="15.5" height="9" rx="2"/><path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3"/>'),hand:Vt('<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 13.5c-.6-1 .6-2.2 1.6-1.5L8 15"/>'),hourglass:Vt('<path d="M6.5 3h11M6.5 21h11"/><path d="M8 3v2.5c0 2.3 4 4.2 4 6.5s-4 4.2-4 6.5V21M16 3v2.5c0 2.3-4 4.2-4 6.5s4 4.2 4 6.5V21"/>'),drop:Vt('<path d="M12 3.2c3.6 4.4 6.2 7.5 6.2 10.8a6.2 6.2 0 0 1-12.4 0c0-3.3 2.6-6.4 6.2-10.8z"/>'),sun:Vt('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),shade:Vt('<circle cx="15.5" cy="8" r="3.8"/><path d="M15.5 1.8v1.4M21.7 8h-1.4M19.9 3.6l-1 1M19.9 12.4l-1-1"/><rect class="f" x="7" y="2.5" width="5.6" height="19" rx="1.6"/><path d="M7 15.5l-4.5 3.5M7 19.5l-2.5 2"/>'),leaf:Vt('<path d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path d="M5 19.5l8.5-8.5"/>'),ledge:Vt('<path d="M3 8h18M6 8v2.5M18 8v2.5M5 18h14"/><path d="M8.5 11.5L6.5 16M12.5 11.5l-2 4.5M16.5 11.5l-2 4.5"/>'),wind:Vt('<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15.5a3 3 0 1 1-3 3M3 16.5h7"/>'),gate:Vt('<path d="M5 21V11a7 7 0 0 1 14 0v10M3.5 21h17M12 21v-5.5"/>'),crystal:Vt('<path d="M12 2.5l5 6-5 13-5-13z"/><path d="M7 8.5h10M12 2.5v19"/>'),bud:Vt('<path d="M12 21v-6.5"/><path d="M12 14.5c-3.4 0-5.4-2.9-5.4-6.4 1.8.6 3.9-1.2 5.4-4.6 1.5 3.4 3.6 5.2 5.4 4.6 0 3.5-2 6.4-5.4 6.4z"/><path d="M12 18c-2 0-3.5-1-4.5-2.5M12 18c2 0 3.5-1 4.5-2.5"/>'),birds:Vt('<path d="M3 9.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M12 15.5c1.5-1.8 3.3-1.8 4.5 0 1.2-1.8 3-1.8 4.5 0M5.5 19.5c1.2-1.4 2.6-1.4 3.6 0 1-1.4 2.4-1.4 3.6 0"/>'),lock:Vt('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),check:Vt('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),star:Vt('<path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.6l-5.6 3.2 1.3-6.2L3 9.3l6.3-.7z"/>',"f"),blossom:Vt('<g class="f"><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.6" rx="2.9" ry="3.9" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="2.2" class="c"/>'),sleaf:Vt('<path class="f" d="M5 19.5C5 10.5 10 5 20 4c-.6 10-6 15.5-15 15.5z"/><path class="c" d="M5 19.5l8.5-8.5"/>'),maple:Vt('<path class="f" d="M12 2.5l1.6 3.8 3.4-1.5-.9 4.2 4.4.5-2.9 3.1 2.2 2.4-4.4.3.6 3.4L12 16.4l-4 2.3.6-3.4-4.4-.3 2.2-2.4L3.5 9.5l4.4-.5L7 4.8l3.4 1.5z"/><path class="c" d="M12 16.4v5"/>'),flake:Vt('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5M4 10.5l3.4.9-.9 3.4M20 13.5l-3.4-.9.9-3.4M5 13.6l3.4-.9-.9-3.4M19 10.4l-3.4.9.9 3.4"/>')},Gi=`<svg class="emb" viewBox="-40 -40 80 80" aria-hidden="true">
	<g class="er">${Array.from({length:9},(r,t)=>{let e=(-80+t*20)*(Math.PI/180);return`<path d="M${(Math.cos(e)*29).toFixed(1)} ${(Math.sin(e)*29).toFixed(1)}L${(Math.cos(e)*36).toFixed(1)} ${(Math.sin(e)*36).toFixed(1)}"/>`}).join("")}</g>
	<g class="es"><circle cx="-31" cy="-10" r="1.4"/><circle cx="-26" cy="14" r="1"/><circle cx="-33" cy="6" r=".9"/><circle cx="-20" cy="-27" r="1.1"/></g>
	<circle class="en" r="23"/>
	<path class="ed" d="M0-23A23 23 0 0 1 0 23Z"/>
	<path class="et" d="M0 23V-6M0 4l-7-7M0-1l7-8M0-6l-4-7M0-6l3-8"/>
	<circle class="eo" r="23"/>
</svg>`,Ui=`<svg viewBox="-100 -100 200 200" aria-hidden="true">${Array.from({length:16},(r,t)=>`<path transform="rotate(${t*22.5})" d="M-5 -34L0 -98L5 -34Z"/>`).join("")}</svg>`,Ra={drag:["hand","Parma\u011F\u0131n\u0131 sa\u011Fa sola kayd\u0131r: <em>g\xFCne\u015F</em> a\u011Fac\u0131n \xE7evresinde d\xF6ner."],hide:["shade","G\xFCne\u015Fi <em>g\xF6vdenin arkas\u0131na</em> al. A\u011Fac\u0131n g\xF6lgesi Zifir\u2019i korur."],drops:["drop","<em>Gece damlalar\u0131n\u0131</em> topla. I\u015F\u0131kta erirler, onlar\u0131 da g\xF6lgede tut."],bridge:["leaf","K\xF6pr\xFCde g\xF6vde uzakta: <em>yapraklar\u0131n g\xF6lgesine</em> s\u0131\u011F\u0131n."],ledge:["ledge","G\xFCne\u015F tepedeyken <em>\xFCstteki patika</em> da g\xF6lge verir."],wait:["hourglass","<em>Bekle</em>\u2019ye bas\u0131l\u0131 tut: Zifir durur, sen g\xF6lgeyi haz\u0131rlars\u0131n."],gust:["wind","<em>Sert r\xFCzg\xE2r</em> yapraklar\u0131 savurur. <em>Bekle</em>, dinsin."],gate:["gate","G\xFCne\u015F bat\u0131yor. Zifir\u2019i <em>K\xF6k Kap\u0131s\u0131</em>\u2019na ula\u015Ft\u0131r!"],crystal:["crystal","<em>Kristaller</em> \u0131\u015F\u0131\u011F\u0131 yans\u0131t\u0131r. I\u015F\u0131n Zifir\u2019e de\u011Fmesin."],lock:["bud","Tomurcuk \u0131\u015F\u0131kla a\xE7\u0131l\u0131r: ona <em>\u0131\u015F\u0131k</em>, Zifir\u2019e <em>g\xF6lge</em> d\xFC\u015F\xFCr."],streak:["shade","G\xF6lgede y\xFCr\xFCd\xFCk\xE7e <em>g\xF6lge serisi</em> b\xFCy\xFCr. Seri, Zifir\u2019e g\xF6lge ku\u015Flar\u0131 toplar."],flock:["birds","<em>S\xFCr\xFC haz\u0131r!</em> Dokun: ku\u015Flar g\xFCne\u015Fin \xF6n\xFCnde d\xF6n\xFCp Zifir\u2019i birka\xE7 saniye g\xF6lgeler."]},Aa={spring:{name:"Bahar",sub:"\xC7i\xE7ekli ta\xE7",icon:kt.blossom},summer:{name:"Yaz",sub:"Ye\u015Fil g\xF6vde",icon:kt.sleaf},autumn:{name:"G\xFCz",sub:"Alt\u0131n dallar",icon:kt.maple},winter:{name:"K\u0131\u015F",sub:"Karl\u0131 k\xF6kler",icon:kt.flake}},Ca={flock:{icon:kt.birds,label:"S\xFCr\xFC"}},Ha=["\u0131","i","si","\xFC","\xFC","i","s\u0131","si","i","u"],Pa=["\u0131","u","si","u","\u0131","si","\u0131","i","i","\u0131"];function Fa(r){return r>=100?"\xFC":r%10?Ha[r%10]:Pa[r/10]}var Va=r=>{let t=Fa(r);return t+"n"+t.slice(-1)};function Ia(){try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}}var zs=class{constructor(t,e){if(this.h=e,!document.getElementById("uk-style")){let c=document.createElement("style");c.id="uk-style",c.textContent=Ni,document.head.appendChild(c)}let s=document.createElement("div");s.className="uk-ui",s.lang="tr";let a=(c,p,u)=>`<button class="uk-tog" data-t="${c}">${p}<span>${u}</span><b></b></button>`,i=(c,p)=>`<div class="uk-star s${c}"><div class="sh"><i></i><b></b></div><span>${p}</span></div>`;s.innerHTML=`
			<div class="uk-scr uk-title" data-s="title">
				<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
				<div class="foot"></div>
				<div class="top"><button class="uk-ico uk-tap" data-a="exit" aria-label="Ana oyuna d\xF6n">${kt.back}</button></div>
				<div class="uk-brand">
					${Gi}
					<div class="k"><i></i>G\xFCnd\xF6n\xFCm\xFC \xB7 \u0130kinci Mod<i></i></div>
					<h1 data-t="Ulu Kay\u0131n"><span>Ulu Kay\u0131n</span></h1>
					<div class="tag">G\xFCne\u015Fi \xE7evir, g\xF6lgede kal.</div>
				</div>
				<div class="acts">
					<button class="uk-btn pri uk-tap" data-a="play">${kt.play}<b>Ba\u015Fla</b></button>
					<div class="row"><button class="uk-btn gh uk-tap" data-a="levels">${kt.path}B\xF6l\xFCmler</button><button class="uk-btn gh uk-tap" data-a="settings">${kt.gear}Ayarlar</button></div>
				</div>
			</div>
			<div class="uk-scr uk-levels" data-s="levels">
				<div class="hd"><button class="uk-ico uk-tap" data-a="title" aria-label="Geri">${kt.back}</button><div class="ttl"><small>Ulu Kay\u0131n\u2019\u0131n yolu</small><h5>Mevsimler</h5></div><div class="uk-dpill"><i>\u2726</i><b class="dsum">0</b></div></div>
				<div class="uk-list"></div>
			</div>
			<div class="uk-hud">
				<div class="top">
					<button class="uk-ico" data-a="pause" aria-label="Duraklat">${kt.pause}</button>
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
				<button class="uk-wait" aria-label="Bekle">${kt.hourglass}<b>Bekle</b></button>
				<div class="uk-gust">${kt.wind}<span>R\xFCzg\xE2r geliyor</span></div>
				<div class="uk-hint"><i class="hi"></i><p></p></div>
				<div class="uk-hand"><i class="tr"></i><span class="fg">${kt.hand}</span></div>
			</div>
			<div class="uk-card-title"><i class="bd"></i><small></small><b></b><span></span></div>
			<div class="uk-lore"><i class="orn"></i><p></p></div>
			<button class="uk-skip" data-a="skip">Ge\xE7<span>\u203A</span></button>
			<div class="uk-scr uk-end" data-s="complete">
				<div class="uk-sheet">
					<div class="rays">${Ui}</div>
					<div class="med">${kt.sun}</div>
					<div class="k ck"></div><h2 class="ct"></h2><div class="ban">G\xF6lge korundu</div><div class="sub cs2"></div>
					<div class="uk-stars">${i(0,"Yol tamam")}${i(1,"T\xFCm damlalar")}${i(2,"G\xF6lgede kald\u0131")}</div>
					<div class="uk-dust cd"><i>\u2726</i><b class="cdn">+0</b><span>\u0131\u015F\u0131k tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="next"><b>Sonraki b\xF6l\xFCm</b>${kt.next}</button><div class="row"><button class="uk-btn gh uk-tap" data-a="retry">${kt.retry}Tekrar</button><button class="uk-btn gh uk-tap" data-a="levels">${kt.path}B\xF6l\xFCmler</button></div></div>
				</div>
			</div>
			<div class="uk-scr uk-end fail" data-s="fail">
				<div class="uk-sheet">
					<div class="med">${kt.drop}</div>
					<div class="k">I\u015F\u0131k kazand\u0131</div><h2>Zifir buharla\u015Ft\u0131</h2>
					<div class="uk-prog"><i class="fp"></i><div class="fz"><i></i></div><span class="g0"></span><span class="g1">${kt.gate}</span></div>
					<div class="sub fs"></div>
					<div class="uk-mercy fm">${kt.sun}<p><b>G\xFCne\u015F yumu\u015Fad\u0131.</b> Bir sonraki denemede \u0131\u015F\u0131k daha az yakacak.</p></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="retry">${kt.retry}<b>Tekrar dene</b></button><button class="uk-btn gh uk-tap" data-a="levels">${kt.path}B\xF6l\xFCmler</button></div>
				</div>
			</div>
			<div class="uk-scr uk-end night" data-s="ending">
				<div class="uk-sheet">
					<div class="rays">${Ui}</div>
					<div class="med">${Gi}</div>
					<div class="k">K\xF6k Kap\u0131s\u0131 a\xE7\u0131ld\u0131</div><h2>Gece eve d\xF6nd\xFC</h2>
					<div class="sub">Zifir, Ulu Kay\u0131n\u2019\u0131n k\xF6klerine ula\u015Ft\u0131. T\xFCn Ana\u2019n\u0131n son y\u0131ld\u0131z\u0131 kar\u0131n alt\u0131nda ilk kez k\u0131p\u0131rd\u0131yor.</div>
					<div class="uk-dust ed"><i>\u2726</i><b class="edn">0</b><span>\u0131\u015F\u0131k tozu</span></div>
					<div class="acts"><button class="uk-btn pri uk-tap" data-a="levels">${kt.path}<b>Mevsimler</b></button><button class="uk-btn gh uk-tap" data-a="exit">${kt.home}G\xF6ky\xFCz\xFCne d\xF6n</button></div>
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
						${a("sound",kt.sound,"Ses")}
						${a("haptics",kt.vibe,"Titre\u015Fim")}
						${a("quality",kt.gem,"Grafik")}
						${a("power",kt.battery,"Pil")}
					</div>
				</div>
			</div>
			<div class="uk-toast"></div>
			<div class="uk-fade"></div>`,t.appendChild(s),this.el=s;let o=c=>s.querySelector(c);this.$=o,this.scr={},s.querySelectorAll(".uk-scr").forEach(c=>this.scr[c.dataset.s]=c),this.hud=o(".uk-hud"),this.lk=o(".lk"),this.lt=o(".lt"),this.dp=o(".dp"),this.dt=o(".dt"),this.pgF=o(".pg .pf"),this.pgH=o(".pg .ph"),this.streakEl=o(".uk-streak"),this.streakN=o(".uk-streak .sn"),this.pops=[...s.querySelectorAll(".uk-pop")],this.compassEl=o(".uk-compass"),this.compassTxt=o(".uk-compass .cs"),this.sunG=o(".sun"),this.bandG=o(".bandg"),this.zifDot=o(".zif"),this.abEl=o(".uk-ab"),this.hintEl=o(".uk-hint"),this.hintIc=o(".uk-hint .hi"),this.hintTx=o(".uk-hint p"),this.hand=o(".uk-hand"),this.gustEl=o(".uk-gust"),this.toastEl=o(".uk-toast"),this.titleCard=o(".uk-card-title"),this.loreEl=o(".uk-lore"),this.loreTx=o(".uk-lore p"),this.skipEl=o(".uk-skip"),this.fadeEl=o(".uk-fade"),this.waitBtn=o(".uk-wait"),this._rel=null,this._hot=null,this._streak=0,this._pg=-1,this._pi=0,this._pk=!1,this._rolls=[],s.addEventListener("click",c=>{let p=c.target.closest("[data-a]");if(p){c.stopPropagation(),e.action(p.dataset.a);return}let u=c.target.closest("[data-t]");u&&(c.stopPropagation(),e.toggle(u.dataset.t))});let n=this.waitBtn,l=c=>{c.preventDefault(),c.stopPropagation();try{n.setPointerCapture(c.pointerId)}catch{}n.classList.add("dn"),e.wait(!0)},h=()=>{n.classList.remove("dn"),e.wait(!1)};n.addEventListener("pointerdown",l),n.addEventListener("pointerup",h),n.addEventListener("pointercancel",h),n.addEventListener("lostpointercapture",h)}show(t){for(let[e,s]of Object.entries(this.scr))s.classList.toggle("on",e===t);t!=="complete"&&t!=="ending"&&this._stopRolls()}hudOn(t){this.hud.classList.toggle("on",t)}setLevel(t){this.lk.textContent=t.kicker,this.lt.textContent=t.title,this.hud.dataset.season=t.season||"",this.streak(0),this._pg=-1,this.progress(0),this.hud.classList.remove("pg")}setDrops(t,e,s){this.dt.textContent=`${t}/${e}`,this.dp.style.display=e?"":"none",this.dp.classList.toggle("full",e>0&&t>=e),(s==="pop"||s==="bad")&&(this._dpk=!this._dpk,this.dp.classList.remove("pop0","pop1","bad0","bad1"),this.dp.classList.add(`${s}${this._dpk?0:1}`))}compass(t,e){let s=Math.round(t*180/Math.PI*2)/2;s!==this._rel&&(this._rel=s,this.sunG.setAttribute("transform",`rotate(${s})`),this.bandG.setAttribute("transform",`rotate(${s+180})`)),e=!!e,e!==this._hot&&(this._hot=e,this.compassEl.classList.toggle("hot",e),this.compassTxt.textContent=e?"I\u015F\u0131kta!":"G\xF6lgede")}lockArc(t,e){let s=this.$(".uk-compass .win");if(t==null){this._arc&&s.setAttribute("d",""),this._arc=null;return}let a=`${t.toFixed(2)}:${e.toFixed(2)}`;if(a===this._arc)return;this._arc=a;let i=53,o=l=>`${(-i*Math.sin(l)).toFixed(1)} ${(i*Math.cos(l)).toFixed(1)}`,n=e-t>Math.PI?1:0;s.setAttribute("d",`M ${o(t)} A ${i} ${i} 0 ${n} 1 ${o(e)}`)}hint(t){if(!t){this._hint!==null&&(this.hintEl.classList.remove("on"),this.hand.classList.remove("on")),this._hint=null;return}if(this._hint===t)return;this._hint=t;let[e,s]=Ra[t]||["sun",t];this.hintIc.innerHTML=kt[e]||kt.sun,this.hintTx.innerHTML=s,this.hintEl.classList.add("on"),this.hand.classList.toggle("on",t==="drag")}gust(t){t=!!t,t!==this._gust&&(this._gust=t,this.gustEl.classList.toggle("on",t),this.hud.classList.toggle("gst",t))}streak(t){if(t=Math.max(0,t|0),t===this._streak)return;let e=this._streak;if(this._streak=t,!t){this.streakEl.classList.remove("on");return}this.streakN.textContent=`\xD7${t}`,this.streakEl.classList.add("on"),this.streakEl.classList.toggle("hot",t>=5),t>e&&(this._sk=!this._sk,this.streakEl.classList.toggle("p0",this._sk),this.streakEl.classList.toggle("p1",!this._sk))}pop(t,e="good"){if(!t)return;let s=performance.now();if(t===this._popT&&s-this._popAt<300)return;this._popT=t,this._popAt=s,this._pi=(this._pi+1)%this.pops.length,this._pk=!this._pk;let a=this.pops[this._pi];a.textContent=t,a.className=`uk-pop ${e==="bad"||e==="gold"?e:"good"} ${this._pk?"a":"b"}`}progress(t){let e=Math.round(Math.min(1,Math.max(0,+t||0))*300)/300;e!==this._pg&&(this._pg=e,e>0&&this.hud.classList.add("pg"),this.pgF.style.transform=`scaleX(${e})`,this.pgH.style.transform=`translateX(${(e*100).toFixed(2)}%)`)}ability(t,e){let s=this.abEl;if(!e){this._abKey&&s.classList.remove("on"),this._abKey=null;return}let a=Math.max(0,Math.min(4,e.count|0)),i=`${t}:${a}:${e.ready?1:0}:${e.active?1:0}`;if(i!==this._abKey){if(t!==this._abId){this._abId=t;let o=Ca[t]||{icon:kt.gem,label:""};s.dataset.a=`ability:${t}`,s.querySelector(".ai").innerHTML=o.icon,s.querySelector(".al").textContent=o.label}this._abKey=i,s.querySelectorAll(".pp i").forEach((o,n)=>o.classList.toggle("on",n<a)),s.classList.toggle("ready",!!e.ready&&!e.active),s.classList.toggle("active",!!e.active),s.classList.add("on")}}toast(t,e=2200){this.toastEl.textContent=t,this.toastEl.classList.add("on"),clearTimeout(this._toastT),this._toastT=setTimeout(()=>this.toastEl.classList.remove("on"),e)}card(t,e,s){if(!t){this.titleCard.classList.remove("on");return}this.titleCard.querySelector("small").textContent=t,this.titleCard.querySelector("b").textContent=e,this.titleCard.querySelector("span").textContent=s||"",this.titleCard.classList.add("on")}lore(t){if(!t){this.loreEl.classList.remove("on"),this._lore=null;return}t!==this._lore&&(this._lore=t,this.loreTx.textContent=t,this._lk=!this._lk,this.loreTx.className=this._lk?"a":"b",this.loreEl.classList.add("on"))}skip(t){this.skipEl.classList.toggle("on",t)}fade(t){this.fadeEl.classList.toggle("on",t)}renderLevels(t,e){let s=e.stars||[],a=[];t.forEach((h,c)=>{let p=a[a.length-1];(!p||p.s!==h.season)&&a.push(p={s:h.season,items:[]}),p.items.push(c)});let i=(s[e.unlocked]||0)===0?e.unlocked:-1,o=h=>{let c=t[h],p=h>e.unlocked,u=s[h]||0,f=p?"lock":h===i?"cur":u?"done":"open",g=p?kt.lock:f==="cur"?kt.play:f==="done"?kt.check:`<b>${h+1}</b>`,x=f==="cur"?'<span class="go">Oyna</span>':p?"":`<span class="st">${[0,1,2].map(b=>`<i class="${b<u?"on":""}">${kt.star}</i>`).join("")}</span>`;return`<button class="uk-lv uk-tap ${f}" data-a="lv:${h}" data-s="${c.season}">
				<span class="no">${g}</span>
				<span class="cd"><span class="tx"><small>${h+1}. b\xF6l\xFCm${c.finale?" \xB7 son":""}</small><b>${c.title}</b></span>${x}</span></button>`};this.$(".uk-list").innerHTML=a.map((h,c)=>{let p=Aa[h.s]||{name:h.s,sub:"",icon:kt.sun},u=h.items.reduce((g,x)=>g+(s[x]||0),0);return`<section class="uk-ssn${h.items[0]<=e.unlocked?"":" lock"}" data-s="${h.s}" style="--d:${c*70}ms">
					<header><i class="ic">${p.icon}</i><span class="nm"><b>${p.name}</b><span>${p.sub}</span></span><em>${kt.star}${u}/${h.items.length*3}</em></header>
					${h.items.map(o).join("")}</section>`}).join(""),this.$(".dsum").textContent=String(e.dust||0);let n=this.$(".uk-list"),l=n.querySelector(".uk-lv.cur");l&&n.scrollHeight>n.clientHeight+4&&(n.scrollTop=Math.max(0,l.offsetTop-n.clientHeight*.45))}_roll(t,e,s,a){let i={t:0,r:0};if(this._rolls.push(i),!e||Ia()){t.textContent=a(e||0);return}t.textContent=a(0),i.t=setTimeout(()=>{let o=performance.now(),n=-1,l=h=>{let c=Math.min(1,(h-o)/1e3),p=Math.round(e*(1-Math.pow(1-c,3)));p!==n&&(n=p,t.textContent=a(p)),c<1?i.r=requestAnimationFrame(l):t.parentNode.classList.add("done")};i.r=requestAnimationFrame(l)},s)}_stopRolls(){for(let t of this._rolls)clearTimeout(t.t),cancelAnimationFrame(t.r);this._rolls.length=0}showComplete({title:t,kicker:e,stars:s,dust:a,last:i}){this.card(null),this._stopRolls(),this.$(".ck").textContent=e,this.$(".ct").textContent=t,this.$(".cs2").textContent=i?"Son b\xF6l\xFCm":"",this.$(".cs2").style.display=i?"":"none";let o=s.filter(Boolean).length;this.$(".ban").textContent=o===3?"Kusursuz g\xF6lge!":"G\xF6lge korundu",this._starT&&this._starT.forEach(clearTimeout),this._starT=[],[".s0",".s1",".s2"].forEach((l,h)=>{let c=this.$(l);c.classList.remove("on"),s[h]&&this._starT.push(setTimeout(()=>c.classList.add("on"),450+h*300))});let n=this.$(".cd");n.classList.remove("done"),n.style.display=a?"":"none",this._roll(this.$(".cdn"),a,450+3*300,l=>`+${l}`),this.$("[data-s=complete] [data-a=next]").style.display=i?"none":"",this.show("complete")}showFail({progress:t,mercy:e}){this.card(null);let s=Math.round(Math.min(1,Math.max(0,t))*100);this.$(".fs").innerHTML=s>=2?`Yolun <b>%${s}\u2019${Va(s)}</b> y\xFCr\xFCd\xFCn. Biraz daha!`:"G\xFCne\u015Fi g\xF6vdenin arkas\u0131nda tut.";let a=this.$(".fp"),i=this.$(".fz");a.style.transition=i.style.transition="none",a.style.transform="scaleX(0)",i.style.transform="translateX(0%)",a.offsetWidth,a.style.transition=i.style.transition="",a.style.transform=`scaleX(${s/100})`,i.style.transform=`translateX(${s}%)`,this.$(".fm").style.display=e?"":"none",this.show("fail")}showEnding(t){this.card(null),this._stopRolls();let e=this.$(".ed");e.classList.remove("done"),e.style.display=t?"":"none",this._roll(this.$(".edn"),t,900,s=>`${s}`),this.show("ending")}setToggles(t){let e=(s,a,i)=>{let o=this.$(`[data-t=${s}] b`);o&&(o.textContent=a,o.parentNode.classList.toggle("off",!i))};e("sound",t.sound?"A\xE7\u0131k":"Kapal\u0131",t.sound),e("haptics",t.haptics?"A\xE7\u0131k":"Kapal\u0131",t.haptics),e("quality",{auto:"Otomatik",0:"D\xFC\u015F\xFCk",1:"Orta",2:"Y\xFCksek"}[t.quality]||"Otomatik",!0),e("power",{auto:"Otomatik",saver:"Tasarruf",performance:"Performans"}[t.power]||"Otomatik",!0)}setPlayLabel(t){this.$("[data-a=play] b").textContent=t}};var Ve={spring:{root:293.66,steps:[0,2,4,7,9],beat:.4,wave:"sine",bell:3,chords:[[0,4],[-3,3],[-7,4],[-5,4]]},summer:{root:261.63,steps:[0,2,4,7,9],beat:.36,wave:"triangle",bell:2,chords:[[0,4],[5,4],[-3,3],[7,4]]},autumn:{root:220,steps:[0,3,5,7,10],beat:.46,wave:"triangle",bell:2,chords:[[0,3],[-4,4],[3,4],[-2,4]]},winter:{root:329.63,steps:[0,2,3,7,8],beat:.56,wave:"sine",bell:4.2,chords:[[0,3],[-4,4],[0,3],[-5,4]]},night:{root:246.94,steps:[0,2,4,7,9],beat:.62,wave:"sine",bell:3,chords:[[0,4],[-3,3],[-7,4],[-5,4]]}},Ae=(r,t)=>r*Math.pow(2,t/12),Ye=class{constructor(t={}){this.hooks=t,this.ctx=null,this.on=!0,this.season="spring",this._dropN=0,this._birdT=4,this.musMode="title",this.intensity=0,this._beatN=0,this._mel=5,this._nextBeat=0,this._hbT=0,this._streakN=0,this._duckUntil=0}unlock(){if(this.ctx){this.ctx.state==="suspended"&&this.ctx.resume();return}let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let e=new t;this.ctx=e,this.master=e.createGain(),this.master.gain.value=this.on?.9:0;let s=e.createDynamicsCompressor();s.threshold.value=-14,s.knee.value=12,s.ratio.value=3,s.attack.value=.004,s.release.value=.2,this.master.connect(s),s.connect(e.destination),this.echo=e.createGain(),this.echo.gain.value=.32;let a=e.createDelay(1.2);a.delayTime.value=.37;let i=e.createGain();i.gain.value=.34;let o=e.createBiquadFilter();o.type="lowpass",o.frequency.value=2600,this.echo.connect(a),a.connect(o),o.connect(i),i.connect(a),o.connect(this.master),this.mus=e.createGain(),this.mus.gain.value=0,this.musF=e.createBiquadFilter(),this.musF.type="lowpass",this.musF.frequency.value=5200,this.musF.Q.value=.5,this.mus.connect(this.musF),this.musF.connect(this.master),this.musF.connect(this.echo);let n=e.sampleRate*2,l=e.createBuffer(1,n,e.sampleRate),h=l.getChannelData(0);for(let f=0;f<n;f++)h[f]=Math.random()*2-1;this.noise=l,this.wind=this._loopNoise("lowpass",520,.6),this.wind.g.gain.value=0,this.sizz=this._loopNoise("highpass",3200,.7),this.sizz.g.gain.value=0;let c=e.createOscillator();c.type="triangle",c.frequency.value=300;let p=e.createOscillator();p.type="sine",p.frequency.value=450;let u=e.createGain();u.gain.value=0,c.connect(u),p.connect(u),u.connect(this.master),u.connect(this.echo),c.start(),p.start(),this.chg={o:c,o2:p,g:u,on:!1},this._hostMusic=this._host("music"),this._nextBeat=e.currentTime+.3,this._timer=setInterval(()=>this._schedule(),90),this._applyMusic()}_loopNoise(t,e,s){let a=this.ctx,i=a.createBufferSource();i.buffer=this.noise,i.loop=!0;let o=a.createBiquadFilter();o.type=t,o.frequency.value=e,o.Q.value=s;let n=a.createGain();return i.connect(o),o.connect(n),n.connect(this.master),i.start(),{src:i,f:o,g:n}}setOn(t){this.on=t,this._sz=this._wk=this._mf=-1,this.master&&this.master.gain.setTargetAtTime(t?.9:0,this.ctx.currentTime,.05)}_host(t,e){return this.hooks.sfx?this.hooks.sfx(t,e)===!0:!1}_ok(t,e){return this.ctx&&this.on&&!this._host(t,e)}_tone(t,e,s,a,i="sine",o=0,n=0,l=null){let h=this.ctx,c=h.createOscillator();c.type=i,c.frequency.value=t;let p=h.createGain();if(p.gain.setValueAtTime(0,e),p.gain.linearRampToValueAtTime(a,e+.008),p.gain.exponentialRampToValueAtTime(1e-4,e+s),c.connect(p),p.connect(l||this.master),n){let u=h.createGain();u.gain.value=n,p.connect(u),u.connect(this.echo)}c.start(e),c.stop(e+s+.05),o&&this._tone(t*o,e,s*.5,a*.3,"sine",0,0,l)}_swell(t,e,s,a,i,o="triangle",n=null){let l=this.ctx,h=l.createOscillator();h.type=o,h.frequency.value=t;let c=l.createGain();c.gain.setValueAtTime(1e-4,e),c.gain.exponentialRampToValueAtTime(i,e+s),c.gain.exponentialRampToValueAtTime(1e-4,e+a),h.connect(c),c.connect(n||this.master),h.start(e),h.stop(e+a+.05)}_burst(t,e,s,a,i="bandpass",o=0,n=1.2){let l=this.ctx,h=l.createBufferSource();h.buffer=this.noise;let c=l.createBiquadFilter();c.type=i,c.frequency.setValueAtTime(s,t),o&&c.frequency.exponentialRampToValueAtTime(o,t+e),c.Q.value=n;let p=l.createGain();p.gain.setValueAtTime(a,t),p.gain.exponentialRampToValueAtTime(1e-4,t+e),h.connect(c),c.connect(p),p.connect(this.master),h.start(t,Math.random()*1.5),h.stop(t+e+.02)}_whoosh(t,e,s,a,i){let o=this.ctx,n=o.createBufferSource();n.buffer=this.noise;let l=o.createBiquadFilter();l.type="bandpass",l.Q.value=.9,l.frequency.setValueAtTime(s,t),l.frequency.exponentialRampToValueAtTime(a,t+e);let h=o.createGain();h.gain.setValueAtTime(1e-4,t),h.gain.exponentialRampToValueAtTime(i,t+e*.6),h.gain.exponentialRampToValueAtTime(1e-4,t+e),n.connect(l),l.connect(h),h.connect(this.master),n.start(t,Math.random()),n.stop(t+e+.05)}_note(t,e=0){let s=Ve[this.season]||Ve.spring,a=s.steps.length,i=(t%a+a)%a;return Ae(s.root,s.steps[i]+12*(Math.floor(t/a)+e))}step(){if(!this._ok("step"))return;let t=this.ctx.currentTime;this.season==="winter"?this._burst(t,.09,1400+Math.random()*500,.07,"lowpass"):this._burst(t,.05,900+Math.random()*500,.065)}drop(){if(!this._ok("drop"))return;let t=this.ctx.currentTime,e=5+this._dropN++,s=this._note(e);this._tone(s,t,1.4,.15,"sine",2.76,.5),this._tone(this._note(e+2),t+.08,1.1,.07,"triangle",0,.4),this._burst(t,.25,6e3,.03,"highpass"),this.duck(.55,.6)}resetDrops(){this._dropN=0}dropLost(){if(!this._ok("dropLost"))return;let t=this.ctx.currentTime;this._burst(t,.4,2600,.12,"highpass"),this._tone(this._note(4),t,.4,.06,"triangle"),this._tone(this._note(1),t+.12,.6,.06,"triangle")}dropWarn(){if(!this._ok("dropWarn"))return;let t=this.ctx.currentTime,e=this.ctx.createOscillator(),s=this.ctx.createGain(),a=this._note(12);e.type="sine",e.frequency.setValueAtTime(a,t),e.frequency.exponentialRampToValueAtTime(a*.7,t+.35),s.gain.setValueAtTime(0,t),s.gain.linearRampToValueAtTime(.05,t+.02),s.gain.exponentialRampToValueAtTime(1e-4,t+.4),e.connect(s),s.connect(this.master),e.start(t),e.stop(t+.45),this._burst(t,.3,4500,.04,"highpass")}ui(){this._ok("ui")&&this._tone(this._note(7),this.ctx.currentTime,.14,.05,"sine",2)}streak(t){if(!this._ok("streak",t))return;let e=this.ctx.currentTime,s=5+this._streakN++%8;this._tone(this._note(s,1),e,.35,.034+Math.min(.02,t*.001),"sine",0,.3)}milestone(t){if(!this._ok("milestone",t))return;let e=this.ctx.currentTime,s=t%10===0,a=5+Math.min(4,Math.floor(t/10));[0,2,4,s?7:5].forEach((i,o)=>this._tone(this._note(a+i),e+o*.07,1.3,s?.1:.075,"sine",3,.5)),this._burst(e+.05,.6,7e3,s?.05:.03,"highpass"),s&&this._swell(this._note(0,-1),e,.05,1.6,.05,"triangle"),this.duck(.5,.8)}streakReset(){this._streakN=0}streakBreak(t){if(!this._ok("streakBreak",t))return;let e=this.ctx.currentTime;this._tone(this._note(4),e,.35,.05,"triangle"),this._tone(this._note(1),e+.1,.5,.05,"triangle"),this._streakN=0}burnStart(){if(!this._ok("burn"))return;let t=this.ctx.currentTime;this._burst(t,.22,5e3,.07,"highpass",2500),this._tone(140,t,.18,.05,"triangle")}nearMiss(){if(!this._ok("nearMiss"))return;let t=this.ctx.currentTime;this._whoosh(t,.45,600,4e3,.09),this._tone(this._note(9),t+.12,1.2,.11,"sine",3,.6),this._tone(this._note(12),t+.22,1.4,.09,"sine",3,.6),this.duck(.4,1)}lastStand(){if(!this._ok("lastStand"))return;let t=this.ctx.currentTime;this._thump(t,.3),this._thump(t+.2,.2),this._whoosh(t,.9,200,1800,.08),this.duck(.15,1.2)}_thump(t,e){let s=this.ctx,a=s.createOscillator();a.type="triangle",a.frequency.setValueAtTime(120,t),a.frequency.exponentialRampToValueAtTime(48,t+.16);let i=s.createGain();i.gain.setValueAtTime(0,t),i.gain.linearRampToValueAtTime(e,t+.01),i.gain.exponentialRampToValueAtTime(1e-4,t+.22),a.connect(i),i.connect(this.master),a.start(t),a.stop(t+.26)}birdJoin(t){if(!this._ok("bird",t))return;let e=this.ctx.currentTime;for(let n=0;n<4;n++)this._burst(e+n*.055,.05,1200+n*150,.05);let s=this._note(10+t*2),a=this.ctx.createOscillator(),i=this.ctx.createGain(),o=e+.18;a.frequency.setValueAtTime(s,o),a.frequency.exponentialRampToValueAtTime(s*1.26,o+.06),a.frequency.exponentialRampToValueAtTime(s,o+.12),i.gain.setValueAtTime(0,o),i.gain.linearRampToValueAtTime(.045,o+.01),i.gain.exponentialRampToValueAtTime(1e-4,o+.2),a.connect(i),i.connect(this.master),i.connect(this.echo),a.start(o),a.stop(o+.25)}flockReady(){if(!this._ok("flockReady"))return;let t=this.ctx.currentTime;[0,2,4,5,7].forEach((e,s)=>this._tone(this._note(5+e),t+s*.06,1.2,.06,"sine",2,.5))}flockGo(){if(!this._ok("flock"))return;let t=this.ctx.currentTime;for(let e=0;e<14;e++)this._burst(t+e*.035+Math.random()*.02,.06,900+Math.random()*900,.06);this._whoosh(t,.8,300,2400,.12),this._swell(this._note(0,-1),t,.25,2.2,.07,"triangle"),this._swell(this._note(2,-1)*1,t,.25,2.2,.05,"triangle"),this._tone(this._note(10),t+.3,1.5,.06,"sine",3,.6),this.duck(.5,1.5)}flockEnd(){if(!this._ok("flockEnd"))return;let t=this.ctx.currentTime;for(let e=0;e<8;e++)this._burst(t+e*.06,.05,1400-e*80,.035);this._tone(this._note(7),t,.5,.04,"triangle"),this._tone(this._note(4),t+.12,.7,.04,"triangle")}gustWarn(){this._ok("gust")&&this._whoosh(this.ctx.currentTime,1.4,250,1100,.07)}win(){if(!this._ok("win"))return;let t=this.ctx.currentTime;[0,1,2,3,4,5,6,7,10].forEach((s,a)=>this._tone(this._note(s),t+a*.075,1.8,.09,"sine",3,.45));let e=Ve[this.season]||Ve.spring;[0,7,12+(e.steps[1]===3?3:4),19].forEach(s=>this._swell(Ae(e.root,s-12),t+.1,.4,3.2,.045,"triangle")),this._swell(Ae(e.root,-24),t,.05,2.6,.08,"sine"),this._burst(t+.5,1.4,8e3,.05,"highpass"),this.duck(.2,2.6)}unlockOpen(){if(!this._ok("unlock"))return;let t=this.ctx.currentTime;[0,2,4,7].forEach((e,s)=>this._tone(this._note(5+e),t+s*.06,1.6,.08,"sine",2,.5)),this._swell(this._note(0,-1),t,.05,2,.06,"triangle"),this._burst(t,.8,6e3,.04,"highpass"),this.duck(.35,1.4)}fail(){if(!this._ok("fail"))return;let t=this.ctx.currentTime;this._burst(t,1.1,2400,.14,"highpass",600),this._thump(t,.25),[4,2,0,-1].forEach((e,s)=>this._tone(this._note(e),t+.2+s*.18,.9,.065,"triangle")),this.duck(.1,2.5)}lockCharge(t){if(!this.ctx||!this.on)return;let e=this.ctx.currentTime,s=this.chg;if(t==null){s.on&&s.g.gain.setTargetAtTime(0,e,.08),s.on=!1;return}s.on=!0;let a=this._note(0)*Math.pow(2,t*1.5);s.o.frequency.setTargetAtTime(a,e,.05),s.o2.frequency.setTargetAtTime(a*1.5,e,.05),s.g.gain.setTargetAtTime(.018+t*.03,e,.06)}duck(t=.4,e=1){if(!this.ctx)return;let s=this.ctx.currentTime,a=this.mus.gain;a.cancelScheduledValues(s),a.setTargetAtTime(this._musBase()*t,s,.03),this._duckUntil=s+e}_musBase(){return this._hostMusic?0:{title:.75,play:1,soft:.5,off:0}[this.musMode]??.6}music(t){this.musMode!==t&&(this.musMode=t,this._applyMusic())}_applyMusic(){if(!this.ctx)return;let t=this.ctx.currentTime;t<this._duckUntil||this.mus.gain.setTargetAtTime(this._musBase(),t,this.musMode==="off"?.4:.8)}_schedule(){let t=this.ctx;if(!t||!this.on||t.state!=="running"||this._hostMusic)return;let e=t.currentTime;if(this._duckUntil&&e>this._duckUntil&&(this._duckUntil=0,this.mus.gain.setTargetAtTime(this._musBase(),e,.5)),this.musMode==="off"){this._nextBeat=e+.2;return}this._nextBeat<e-.5&&(this._nextBeat=e+.05);let s=Ve[this.season]||Ve.spring,a=this.musMode==="play"?1:1.3;for(;this._nextBeat<e+.3;)this._beat(this._nextBeat,s,s.beat*a),this._nextBeat+=s.beat*a}_beat(t,e,s){let a=this._beatN++,i=a%8,n=this.musMode==="play"?this.intensity:.15,l=this.mus;if(i===0){let[c,p]=e.chords[Math.floor(a/8)%e.chords.length],u=s*8,f=Ae(e.root,c-12);this._swell(f,t,u*.35,u*1.35,.03,"triangle",l),this._swell(Ae(f,7),t,u*.4,u*1.3,.022,"triangle",l),this._swell(Ae(f,12+p),t,u*.45,u*1.25,.018,"sine",l),this._tone(Ae(f,-12),t,u*.9,.05,"sine",0,0,l),this._chordRoot=c}let h=.28+n*.4;if(i!==7&&Math.random()<h){let c=Math.random();this._mel+=c<.2?-2:c<.5?-1:c<.8?1:2,this._mel<2&&(this._mel=3),this._mel>11&&(this._mel=9);let p=this._note(this._mel);this._tone(p,t,s*3.2,.032+n*.012,e.wave,e.bell,0,l)}if(n>.45){let c=this._chordRoot||0,p=[0,7,12,16,19,12];for(let u=0;u<2;u++){let f=p[(i*2+u)%p.length];this._tone(Ae(e.root,c+f),t+u*s*.5,s*.9,.012+(n-.45)*.02,"triangle",0,0,l)}}}tick(t,e,s,a,i=1){if(!this.ctx||!this.on)return;let o=this.ctx.currentTime,n=a?e*.09:0;Math.abs(n-(this._sz??-1))>.004&&(this._sz=n,this.sizz.g.gain.setTargetAtTime(n,o,.05)),Math.abs(s-(this._wk??-1))>.02&&(this._wk=s,this.wind.g.gain.setTargetAtTime(.025+s*.05,o,.3),this.wind.f.frequency.setTargetAtTime(380+s*500,o,.3));let l=a&&e>.05?900+i*900:5200;Math.abs(l-(this._mf??-1))>40&&(this._mf=l,this.musF.frequency.setTargetAtTime(l,o,.12)),a&&i<.45&&e>.05&&o>this._hbT&&(this._thump(o,.22),this._thump(o+.17,.13),this._hbT=o+.45+i*.9),(this.season==="spring"||this.season==="summer")&&a&&(this._birdT-=t,this._birdT<0&&(this._birdT=3+Math.random()*6,this._bird(o)))}_bird(t){let e=this.ctx,s=2+(Math.random()*3|0),a=2200+Math.random()*1400;for(let i=0;i<s;i++){let o=e.createOscillator(),n=e.createGain(),l=t+i*.13;o.frequency.setValueAtTime(a,l),o.frequency.exponentialRampToValueAtTime(a*1.35,l+.05),o.frequency.exponentialRampToValueAtTime(a*.9,l+.09),n.gain.setValueAtTime(0,l),n.gain.linearRampToValueAtTime(.02,l+.01),n.gain.exponentialRampToValueAtTime(1e-4,l+.1),o.connect(n),n.connect(this.master),o.start(l),o.stop(l+.12)}}suspend(){this.ctx&&this.ctx.state==="running"&&this.ctx.suspend()}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}};Ye.SCALES=Ve;var _s=class{constructor({container:t,store:e,hooks:s={},quality:a="auto",power:i="auto"}){this.container=t,this.store=e,this.hooks=s,this.qualityOpt=a,this.power=i,this.running=!1,this.visible=!0,this.time=0,this.sunAz=0,this.elev=null,this.idle=!1,this._raf=0,this._last=0,this._prev=0,this._dirty=!0,this.V3=$e.Vector3}async init(){let t=document.createElement("canvas");t.className="uk-canvas",this.container.appendChild(t),this.canvas=t;let e=this.store.get("settings")||{},s=this.qualityOpt!=="auto"?this.qualityOpt:e.quality??"auto",a=s==="auto"?null:Number(s),i=js(t,a);this.renderer=i.renderer,this.tier=i.tier,this.info=i,this.gov=new ts({tier:i.tier.id,gpu:i.gpu,store:this.store,power:e.power||this.power}),this.gov.onScale=()=>this.resize(),this.gov.onBattery=n=>{this.ui&&this.ui.toast(n?"Pil koruma a\xE7\u0131k: daha az kare, daha serin telefon":"Pil koruma kapand\u0131")};let o=Ys();this.G=o,Js(o,i.tier.shadowTaps),this.shadow=new es(o,i.tier.shadowSize),this.world=Fi({G:o,tier:i.tier,shadow:this.shadow,aniso:i.aniso,msaa:i.msaa}),this.scene=this.world.scene,this.rig=new ds,this.focus=new $e.Vector3(0,30,0),this.sfx=new Ye(this.hooks),this.ui=new zs(this.container,{action:n=>this.game.action(n),toggle:n=>this.game.toggle(n),wait:n=>this.game.wait(n)}),this._onResize=()=>this.resize(),window.addEventListener("resize",this._onResize),this._onVis=()=>{this.visible=!document.hidden,this.visible?(this.gov.reset(),this._last=0,this._prev=0,this.wake(),this.sfx.resume()):(this.sfx.suspend(),this.game&&this.game.pause())},document.addEventListener("visibilitychange",this._onVis),this.resize(),this.game=new Ts(this,this.ui,this.sfx),this.rig.pos.set(70,32,60),this.rig.look.set(0,27,0),this.rig.mode="manual",this.rig.update(0),await this.warmup()}async warmup(){let t=this.renderer,e=[];this.scene.traverse(s=>{s.isMesh&&!s.visible&&(e.push(s),s.visible=!0)});try{t.compileAsync?(await t.compileAsync(this.scene,this.rig.cam),await t.compileAsync(this.shadow.scene,this.shadow.cam)):(t.compile(this.scene,this.rig.cam),t.compile(this.shadow.scene,this.shadow.cam))}catch{}this.renderFrame();for(let s of e)s.visible=!1}resize(){let t=Math.max(1,this.container.clientWidth||window.innerWidth),e=Math.max(1,this.container.clientHeight||window.innerHeight),s=this.gov.pixelRatio(t,e);this.renderer.setPixelRatio(s),this.renderer.setSize(t,e,!1),this.canvas.style.width=t+"px",this.canvas.style.height=e+"px";let a=this.renderer.getDrawingBufferSize(new $e.Vector2);this.G.uRes.value.x=a.x,this.G.uRes.value.y=a.y,this.rig.resize(t,e),this.wake()}wake(){this.idle=!1,this._dirty=!0}exit(){this.hooks.onExit?this.hooks.onExit():this.game.goTitle()}renderFrame(){let t=this.G;t.uTime.value=this.time;let[e,s,a]=this.game?this.game.envState():["spring","spring",0];Zs(t,As[e],As[s],a,this.sunAz,this.elev),t.uWind.value.set(Yt.dx,Yt.dz,Yt.str,Yt.gust),t.uFocus.value.set(this.focus.x,this.focus.y+.5,this.focus.z,1.7);let i=Math.min(1,t.uNight.value*1.4+Math.max(0,.3-t.uSunDir.value.y)*1.5);this.world.lanternGlow.mat.uniforms.uK.value=.45+i*1.5,this.world.mats.glass.uniforms.uK.value=1.6+i*2.2;let o=this.world,n=is(this.focus.y,this._sw||(this._sw=[0,0,0,0]));o.particles.u.uCenter.value.copy(this.rig.look),o.particles.u.uSeason.value.set(n[0],n[1],n[2],n[3]),o.particles.u.uFire.value=i*(this.focus.y<14?1:.3),o.shafts.u.uCenter.value.copy(this.focus),o.birds.u.uCenterY.value=this.focus.y,this.shadow.place(this.focus,t.uSunDir.value),this.shadow.render(this.renderer),this.renderer.render(this.scene,this.rig.cam),this._dirty=!1}start(){if(this.running)return;this.running=!0,this._last=0,this._prev=0;let t=e=>{if(!this.running||(this._raf=requestAnimationFrame(t),!this.visible))return;let s=this._last?e-this._last:16.7;if(this._last=e,this.idle&&!this._dirty){this._prev=e;return}this.gov.tick(e,s)&&this.frame(e)};this._raf=requestAnimationFrame(t)}stop(){this.running=!1,cancelAnimationFrame(this._raf),this.sfx.suspend()}frame(t){let e=Math.min(.05,this._prev?(t-this._prev)/1e3:.016666666666666666);this._prev=t,this.time+=e,this.game.update(e,this.time),this.rig.update(e),this.renderFrame()}destroy(){this.stop(),this.game.destroy(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVis),this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&t.material.dispose()});for(let t of Object.values(this.world.tex))t.dispose();this.shadow.dispose(),this.renderer.dispose(),this.canvas.remove(),this.ui.el.remove()}stats(){let t=this.renderer.info;return{calls:t.render.calls,tris:t.render.triangles,geo:t.memory.geometries,tex:t.memory.textures,programs:t.programs.length,tier:this.tier.name,gpu:this.info.gpu,pr:this.renderer.getPixelRatio()}}debugView({level:t=0,s:e=null,sunAz:s=null,rel:a=null,camDist:i=1,gust:o=0,zifir:n=!0}={}){let l=this.game;l.startLevel(t,{retry:!0}),l.s=e==null?l.s0+4:l.s0+e*(l.s1-l.s0),l._set("play"),this.ui.card(null),this.ui.hint(null),this.ui.hudOn(!0);let h=this.world.curve.sample(l.s,{}),c=Math.atan2(h.z,h.x);l.sunAz=l.sunTarget=s??c+(a??Math.PI),l.zifir.g.visible=n,l.hold=!0,l.envFrom=l.envTo=l.level.season,l.envT=1,this.rig.zoom=i,this.rig.mode="follow";for(let p=0;p<4;p++)this.time+=.016,l.update(.016,this.time),Yt.gust=o,this.rig.snap(),this.rig.update(0);this.renderFrame()}debugCam(t,e,s="spring",a=.5){this.game.envFrom=this.game.envTo=s,this.game.envT=1,this.sunAz=a,this.elev=null,this.rig.pos.copy(t),this.rig.look.copy(e),this.rig.mode="manual",this.rig.update(0),this.focus.copy(e),this.renderFrame()}debugTick(t,e=30){let s=1/e;for(let a=0;a<t;a+=s)this.time+=s,this.game.update(s,this.time),this.rig.update(s);this.renderFrame()}debugSim({level:t=0,policy:e="smart",maxT:s=120,dt:a=1/30}={}){let i=this.game;i.startLevel(t,{retry:!0}),i._set("play"),i.dragged=!0,this.rig.mode="follow";let o=0,n=0,l=new $e.Vector3,h=i.tester,c=0;for(;o<s&&(i.state==="play"||i.state==="enter");){i.state==="enter"&&i._set("play");let p=this.world.curve.sample(i.s,{}),u=Math.atan2(p.z,p.x);if(e==="behind")i.sunTarget=u+Math.PI;else if(e==="smart"&&o>=n&&i.locks.pending(i.s)&&i.speed<.1){n=o+.25;let f=i.locks.pending(i.s),g=this.world.curve.sample(i.s,{}),x=i.elev*Math.PI/180,b=null,S=1e9;for(let d=0;d<180;d++){let P=i.sunAz+(d-90)/90*Math.PI;l.set(Math.cos(x)*Math.cos(P),Math.sin(x),Math.cos(x)*Math.sin(P));let m=0;for(let W of[.48,.86,.36])(!h.blocked(g.x,g.y+W,g.z,l)||i.beams.testPoint(l,g.x,g.y+W,g.z,h))&&m++;if(m)continue;let F=0;for(let W of[1,1.7,.8])h.blocked(f.x,f.y+W,f.z,l)||F++;let z=Math.abs(P-i.sunAz)-F*.5;F&&z<S&&(S=z,b=P)}b!=null&&(i.sunTarget=b),i.hold=!1}else if(e==="smart"&&o>=n){n=o+.2;let f=i.sunTarget,g=1e9;for(let x=0;x<32;x++){let b=i.sunAz+(x-16)/16*Math.PI;l.set(Math.cos(i.elev*Math.PI/180)*Math.cos(b),Math.sin(i.elev*Math.PI/180),Math.cos(i.elev*Math.PI/180)*Math.sin(b));let S=0;for(let P of[0,.8]){let m=this.world.curve.sample(i.s+P,{});(!h.blocked(m.x,m.y+.5,m.z,l)||i.beams.testPoint(l,m.x,m.y+.45,m.z,h))&&(S+=P===0?3:1)}let d=i.locks.pending(i.s);if(d){let P=0;for(let m of[1,1.7])h.blocked(d.x,d.y+m,d.z,l)||P++;S+=(2-P)*.9}for(let P of i.drops.list)P.state!=="idle"||P.s-i.s>9||P.s<i.s-1||(!h.blocked(P.x,P.y+.1,P.z,l)||i.beams.testPoint(l,P.x,P.y,P.z,h,.35))&&(S+=.6);S+=Math.abs(b-i.sunAz)*.05,S<g&&(g=S,f=b)}i.sunTarget=f,i.hold=g>=3&&!i.locks.pending(i.s)}this.time+=a,o+=a,i.update(a,this.time),i.expo>.05&&(c+=a)}return this.rig.update(0),this.renderFrame(),{level:t,policy:e,state:i.state,time:+o.toFixed(1),progress:+((i.s-i.s0)/(i.s1-i.s0)).toFixed(2),minMeter:+i.minMeter.toFixed(2),drops:`${i.got}/${i.drops.total}`,lost:i.lostN,litTime:+c.toFixed(1)}}debugAction(t){this.game.action(t),this.renderFrame()}};function qi(r,t="ulukayin.v1"){if(r&&typeof r.get=="function"&&typeof r.set=="function")return r;let e={};try{e=JSON.parse(localStorage.getItem(t)||"{}")||{}}catch{e={}}return{get:s=>e[s],set:(s,a)=>{e[s]=a;try{localStorage.setItem(t,JSON.stringify(e))}catch{}}}}async function Jn(r={}){let t=qi(r.store),e=document.createElement("div");e.className="uk-root",e.style.cssText="position:fixed;inset:0;z-index:50;overflow:hidden;background:#16122a;touch-action:none;",(r.container||document.body).appendChild(e);let s=new _s({container:e,store:t,hooks:r.hooks||{},quality:r.quality||"auto",power:r.power||"auto"});return await s.init(),{app:s,open(){e.style.display="",s.start()},close(){s.stop(),e.style.display="none"},destroy(){s.destroy(),e.remove()}}}export{Jn as createUluKayin};
