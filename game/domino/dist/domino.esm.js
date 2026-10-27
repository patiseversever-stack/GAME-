import*as F from"three";import*as K from"three";var Pe=Math.PI*2,Vt=(r,t,e)=>r<t?t:r>e?e:r;var ot=(r,t,e,s)=>t+(r-t)*Math.exp(-e*s);function It(r){let t=r>>>0,e=()=>{t=t+1831565813>>>0;let s=t;return s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296};return e.range=(s,i)=>s+(i-s)*e(),e.pick=s=>s[e()*s.length|0],e.sign=()=>e()<.5?-1:1,e}var _t=[{id:0,name:"D\xFC\u015F\xFCk",maxPixels:115e4,maxDpr:2,minScale:.7,shadowSize:1024,shadowTaps:1,shadowHalf:22,particles:400,debris:160,people:60,grass:0},{id:1,name:"Orta",maxPixels:19e5,maxDpr:2.4,minScale:.7,shadowSize:2048,shadowTaps:4,shadowHalf:26,particles:900,debris:320,people:140,grass:1},{id:2,name:"Y\xFCksek",maxPixels:3e6,maxDpr:3,minScale:.7,shadowSize:2048,shadowTaps:4,shadowHalf:28,particles:1600,debris:520,people:240,grass:1}];function Nt(r){let t="";try{let o=r.getExtension("WEBGL_debug_renderer_info");t=String(r.getParameter(o?o.UNMASKED_RENDERER_WEBGL:r.RENDERER)||"")}catch{t=""}let e=t.toLowerCase(),s=matchMedia("(pointer: coarse)").matches||/android|iphone|ipad/i.test(navigator.userAgent),i=s?0:1;/swiftshader|llvmpipe|software|microsoft basic/.test(e)||/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(e)?i=0:/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(e)?i=1:/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(e)||/apple/.test(e)||!s&&/nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(e)?i=2:!s&&/intel/.test(e)&&(i=1);let a=navigator.deviceMemory||0;return a&&a<=2?i=0:a&&a<=4&&(i=Math.min(i,1)),{tier:i,gpu:t,mobile:s}}var nt=class{constructor({tier:t,gpu:e,store:s,power:i="auto"}){this.T=_t[t],this.gpu=e,this.store=s,this.power=i,this.battery={saver:!1,level:1,charging:!0};let a=s.get("perf")||{},o=a.gpu===e;this.scale=o?Vt(a.scale??1,this.T.minScale,1):1,this.cap=o&&a.cap===30?30:60,this.ceil=o?a.ceil??1:1,this.half=o?!!a.half:t===0,this.vsync=16.67,this._deltas=new Float32Array(24),this._di=0,this._count=0,this._frame=0,this._lastRender=0,this._ema=0,this._slow=0,this._good=0,this._cool=0,this._probe=null,this._ups=0,this._dirty=!1,this.onScale=null,this.menu=!1,this._watchBattery()}get targetFps(){return this.menu||this.power==="saver"||this.power==="auto"&&this.battery.saver?30:this.cap}get maxScale(){return this.power==="saver"||this.power==="auto"&&this.battery.saver?Math.min(this.ceil,.8):this.ceil}get effScale(){return Math.min(this.scale,this.maxScale)}tick(t,e){e>4&&e<40&&(this._deltas[this._di]=e,this._di=(this._di+1)%this._deltas.length,this._count++,this._count%24===0&&(this.vsync=ie(this._deltas)));let s=1e3/this.targetFps,i=this._divisor(s);if(this._frame++,this._frame<i)return!1;this._frame=0;let a=this._lastRender?t-this._lastRender:s;return this._lastRender=t,this._adapt(t,a,i*this.vsync),!0}_divisor(t){let e=t/this.vsync;return Math.max(1,this.half?Math.ceil(e-.05):Math.round(e-.15))}reset(){this._lastRender=0,this._frame=0,this._slow=0,this._good=0}_adapt(t,e,s){if(e>s*4)return;this._ema=this._ema?this._ema+(e-this._ema)*.08:e;let i=e/1e3;if(t<this._cool)return;let a=this._ema>s*1.22;if(a?(this._slow+=i,this._good=0):(this._slow=Math.max(0,this._slow-i*.5),this._good+=i),this._probe&&a&&this._slow>1.2){this.ceil=this._probe.from,this._setScale(this._probe.from),this._probe=null,this._cool=t+4e3,this._slow=0,this._dirty=!0;return}if(this._probe&&t-this._probe.t>6e3&&(this._probe=null,this._dirty=!0),this._slow>1.6){this._slow=0,this._cool=t+2200;let o=this.effScale;o>.81?this._setScale(Math.max(.8,o-.1)):!this.half&&this.vsync<14?this.half=!0:o>this.T.minScale+.01?this._setScale(Math.max(this.T.minScale,o-.1)):this.cap===60&&(this.cap=30),this._dirty=!0}else this._good>9&&this._ups<3&&(this._good=0,this.cap===30&&this.power!=="saver"&&!this.battery.saver&&this.effScale>=.8?(this.cap=60,this._ups++,this._cool=t+3e3):this.scale<this.maxScale-.01&&(this._probe={from:this.scale,t},this._setScale(Math.min(this.maxScale,this.scale+.08)),this._ups++,this._cool=t+2500));this._dirty&&t>this._cool&&this.save()}_setScale(t){this.scale=Math.round(t*100)/100,this.onScale&&this.onScale()}save(){this._dirty=!1,this.store.set("perf",{gpu:this.gpu,scale:this.scale,cap:this.cap,ceil:this.ceil,half:this.half})}_watchBattery(){navigator.getBattery&&navigator.getBattery().then(t=>{let e=()=>{this.battery.level=t.level,this.battery.charging=t.charging;let s=this.battery.saver;this.battery.saver=!t.charging&&(s?t.level<=.25:t.level<=.2),s!==this.battery.saver&&this.onBattery&&this.onBattery(this.battery.saver)};e(),t.addEventListener("levelchange",e),t.addEventListener("chargingchange",e)}).catch(()=>{})}pixelRatio(t,e){let s=Math.min(window.devicePixelRatio||1,this.T.maxDpr);return t*e*s*s>this.T.maxPixels&&(s=Math.sqrt(this.T.maxPixels/(t*e))),Math.max(.75,s*this.effScale)}};function ie(r){let t=Array.from(r).filter(e=>e>0).sort((e,s)=>e-s);return t.length?t[t.length>>1]:16.67}function $t(r,t){let e={tier:0,gpu:"",mobile:!0};try{let c=document.createElement("canvas").getContext("webgl2");if(c){e=Nt(c);let u=c.getExtension("WEBGL_lose_context");u&&u.loseContext()}}catch{}t!=null&&t>=0&&t<=2&&(e.tier=t);let s=/swiftshader|llvmpipe/i.test(e.gpu),i=new K.WebGLRenderer({canvas:r,antialias:!s,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1});i.outputColorSpace=K.LinearSRGBColorSpace,i.toneMapping=K.NoToneMapping,i.setClearColor(8373999,1),i.sortObjects=!0,i.shadowMap.enabled=!1;let o=!!(i.getContext().getContextAttributes()||{}).antialias,h=i.capabilities.getMaxAnisotropy(),n=_t[e.tier],l=Math.min(h,n.id>=1?8:4);return{renderer:i,tier:n,gpu:e.gpu,mobile:e.mobile,msaa:o,aniso:l}}import*as M from"three";var _=(r,t=1)=>new M.Color(r).multiplyScalar(t);function Wt(){return{uTime:{value:0},uSunDir:{value:new M.Vector3(.5,.8,.3).normalize()},uSunCol:{value:new M.Color},uSkyTop:{value:new M.Color},uSkyHor:{value:new M.Color},uGround:{value:new M.Color},uShadeTint:{value:new M.Color},uFogCol:{value:new M.Color},uFogSun:{value:new M.Color},uFogP:{value:new M.Vector4(.012,30,.02,8)},uRes:{value:new M.Vector3(1,1,.35)},uGrade:{value:new M.Vector4(1.1,1.05,1,1.2/255)},uLift:{value:new M.Color(0,0,0)},uGain:{value:new M.Color(1,1,1)},uVigCol:{value:new M.Color},uFocus:{value:new M.Vector4(0,-99,0,3)},uShadowMap:{value:null},uShadowMat:{value:new M.Matrix4},uShadowP:{value:new M.Vector4(1/1024,.04,8e-4,1)},uZenith:{value:new M.Color},uHorizon:{value:new M.Color},uSunGlow:{value:new M.Color},uSea:{value:new M.Color},uSeaDeep:{value:new M.Color}}}var rt={ogle:{sunAz:128,sunEl:48,sun:_("#fff1d8",2.6),skyTop:_("#7fb4ff",.62),skyHor:_("#bfe2ff",.62),ground:_("#ffd7a8",.42),shade:_("#b4c4ff",1),fog:_("#cfe9ff"),fogSun:_("#fff1d4"),fogP:[.0105,34,.03,8],zenith:_("#2f7fe0"),horizon:_("#c9ecff"),sunGlow:_("#fff0c8",1.2),sea:_("#24b8c8"),seaDeep:_("#145f9c"),grade:[1.16,1.06,1],lift:_("#10204a",.05),gain:_("#fffaf2"),vignette:.32,vig:_("#2d3b8a")},aksam:{sunAz:205,sunEl:18,sun:_("#ffbf80",2.7),skyTop:_("#8a90ff",.55),skyHor:_("#ffc0a0",.6),ground:_("#ff9a70",.4),shade:_("#a898ff",1),fog:_("#ffd0b0"),fogSun:_("#ffb070"),fogP:[.012,30,.03,6],zenith:_("#3a4fb8"),horizon:_("#ffc69a"),sunGlow:_("#ffb070",1.4),sea:_("#3aa0c8"),seaDeep:_("#24407e"),grade:[1.18,1.07,1],lift:_("#2a1050",.06),gain:_("#fff2e4"),vignette:.4,vig:_("#3a2a7a")}};function Mt(r,t){let e=M.MathUtils.degToRad(t.sunAz),s=M.MathUtils.degToRad(t.sunEl);r.uSunDir.value.set(Math.cos(s)*Math.cos(e),Math.sin(s),Math.cos(s)*Math.sin(e)).normalize(),r.uSunCol.value.copy(t.sun),r.uSkyTop.value.copy(t.skyTop),r.uSkyHor.value.copy(t.skyHor),r.uGround.value.copy(t.ground),r.uShadeTint.value.copy(t.shade),r.uFogCol.value.copy(t.fog),r.uFogSun.value.copy(t.fogSun),r.uFogP.value.set(...t.fogP),r.uZenith.value.copy(t.zenith),r.uHorizon.value.copy(t.horizon),r.uSunGlow.value.copy(t.sunGlow),r.uSea.value.copy(t.sea),r.uSeaDeep.value.copy(t.seaDeep),r.uGrade.value.x=t.grade[0],r.uGrade.value.y=t.grade[1],r.uGrade.value.z=t.grade[2],r.uLift.value.copy(t.lift),r.uGain.value.copy(t.gain),r.uRes.value.z=t.vignette,r.uVigCol.value.copy(t.vig)}import*as k from"three";var ht=class{constructor(t,e,s=24){this.G=t,this.size=e,this.half=s,this.scene=new k.Scene,this.scene.matrixWorldAutoUpdate=!1,this.cam=new k.OrthographicCamera(-this.half,this.half,this.half,-this.half,1,300);let i=new k.DepthTexture(e,e);i.type=k.UnsignedIntType,i.compareFunction=k.LessEqualCompare,i.minFilter=k.LinearFilter,i.magFilter=k.LinearFilter,this.rt=new k.WebGLRenderTarget(e,e,{depthTexture:i,depthBuffer:!0,stencilBuffer:!1,format:k.RedFormat,type:k.UnsignedByteType,minFilter:k.NearestFilter,magFilter:k.NearestFilter,generateMipmaps:!1}),t.uShadowMap.value=i,t.uShadowP.value.set(1/e,.035,7e-4,1),this._bias=new k.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this._r=new k.Vector3,this._u=new k.Vector3,this._f=new k.Vector3,this._p=new k.Vector3}add(t){return t.frustumCulled=!1,this.scene.add(t),t}place(t,e){let s=this._f.copy(e).negate(),i=Math.abs(s.y)>.98?this._u.set(1,0,0):this._u.set(0,1,0),a=this._r.crossVectors(s,i).normalize(),o=this._u.crossVectors(a,s).normalize(),h=this.half*2/this.size,n=Math.round(t.dot(a)/h)*h,l=Math.round(t.dot(o)/h)*h,c=t.dot(s),u=this._p.set(0,0,0).addScaledVector(a,n).addScaledVector(o,l).addScaledVector(s,c),d=this.cam;d.position.copy(u).addScaledVector(s,-150),d.up.copy(o),d.lookAt(u),d.updateMatrixWorld(!0),d.updateProjectionMatrix(),this.G.uShadowMat.value.copy(this._bias).multiply(d.projectionMatrix).multiply(d.matrixWorldInverse)}render(t){let e=t.getRenderTarget();t.setRenderTarget(this.rt),t.clear(!1,!0,!1),t.render(this.scene,this.cam),t.setRenderTarget(e)}dispose(){this.rt.depthTexture.dispose(),this.rt.dispose()}};import*as D from"three";import*as J from"three";var I=`
uniform float uTime;
uniform vec3 uSunDir;   // g\xFCne\u015Fe do\u011Fru birim vekt\xF6r
uniform vec3 uSunCol;   // do\u011Frusal renk (\u015Fiddet dahil)
uniform vec3 uSkyTop;   // g\xF6kten gelen ortam \u0131\u015F\u0131\u011F\u0131
uniform vec3 uSkyHor;   // ufuktan gelen ortam \u0131\u015F\u0131\u011F\u0131
uniform vec3 uGround;   // yerden sekme
uniform vec3 uShadeTint;// g\xF6lgenin rengi (\xE7arpan)
uniform vec3 uFogCol;
uniform vec3 uFogSun;
uniform vec4 uFogP;     // x yo\u011Funluk, y ba\u015Flang\u0131\xE7 uzakl\u0131\u011F\u0131, z y\xFCkseklik azal\u0131m\u0131, w g\xFCne\u015F halesi \xFCss\xFC
uniform vec3 uRes;      // geni\u015Flik, y\xFCkseklik, vinyet g\xFCc\xFC
uniform vec4 uGrade;    // x doygunluk, y kontrast, z pozlama, w titre\u015Fim
uniform vec3 uLift;
uniform vec3 uGain;
uniform vec3 uVigCol;
uniform vec4 uFocus;    // xyz odak (zincirin ucu), w yar\u0131\xE7ap: odak \xE7evresi hafif \u0131\u015F\u0131lt\u0131

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
`,st=`
#ifndef SHADOW_TAPS
#define SHADOW_TAPS 1
#endif
uniform sampler2DShadow uShadowMap;
uniform mat4 uShadowMat;
uniform vec4 uShadowP; // x 1/\xE7\xF6z\xFCn\xFCrl\xFCk, y normal kayd\u0131rma, z derinlik pay\u0131
float shadowAt(vec3 wp, vec3 n) {
	vec4 sc = uShadowMat * vec4(wp + n * uShadowP.y, 1.0);
	vec3 p = sc.xyz;
	vec2 e = abs(p.xy - 0.5);
	if (max(e.x, e.y) > 0.497 || p.z > 1.0) return 1.0;
	// haritan\u0131n kenar\u0131na do\u011Fru g\xF6lge yumu\u015Fak\xE7a s\xF6ner (kapsam s\u0131n\u0131r\u0131 g\xF6r\xFCnmesin)
	float fade = smoothstep(0.497, 0.43, max(e.x, e.y));
	p.z -= uShadowP.z;
#if SHADOW_TAPS > 1
	float o = uShadowP.x * 1.25;
	float s = texture(uShadowMap, vec3(p.xy + vec2(-o, -0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(0.35 * o, -o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(o, 0.35 * o), p.z));
	s += texture(uShadowMap, vec3(p.xy + vec2(-0.35 * o, o), p.z));
	s *= 0.25;
#else
	float s = texture(uShadowMap, p);
#endif
	return mix(1.0, s, fade);
}
`,Z=`
vec3 skyAmbient(vec3 N) {
	float up = N.y * 0.5 + 0.5;
	vec3 a = mix(uGround, uSkyHor, smoothstep(0.0, 0.55, up));
	return mix(a, uSkyTop, smoothstep(0.5, 1.0, up));
}
// g\xF6k yans\u0131mas\u0131 (cilal\u0131 y\xFCzeyler i\xE7in): ufuk parlak, tepe derin mavi, g\xFCne\u015F y\xF6n\xFCnde s\u0131cak
vec3 skyReflect(vec3 R) {
	float h = clamp(R.y, -1.0, 1.0);
	vec3 c = mix(uSkyHor * 1.25, uSkyTop * 1.1, smoothstep(0.0, 0.7, h));
	c = mix(uGround * 0.9, c, smoothstep(-0.25, 0.05, h));
	float s = max(dot(R, uSunDir), 0.0);
	c += uSunCol * (pow(s, 600.0) * 6.0 + pow(s, 24.0) * 0.18);
	return c;
}
/**
 * Oyuncak \u0131\u015F\u0131\u011F\u0131: yumu\u015Fak sar\u0131lan g\xFCne\u015F, yar\u0131 k\xFCre g\xF6k, serin g\xF6lge, kenar \u0131\u015F\u0131\u011F\u0131.
 * gloss: 0 mat, 1 cilal\u0131. ao: ortam \xF6rtmesi.
 */
vec3 shade(vec3 albedo, vec3 N, vec3 V, float ao, float sh, float gloss, float rimK) {
	float ndl = dot(N, uSunDir);
	float w = clamp((ndl + 0.18) / 1.18, 0.0, 1.0);
	float diff = w * w * (3.0 - 2.0 * w);
	float lit = diff * sh;
	vec3 amb = skyAmbient(N) * ao;
	vec3 shadeCol = mix(uShadeTint, vec3(1.0), lit);
	vec3 c = albedo * amb * shadeCol + albedo * uSunCol * lit;
	// cila: g\xFCne\u015F par\u0131lt\u0131s\u0131 + g\xF6k yans\u0131mas\u0131 (Fresnel)
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
	vec3 H = normalize(uSunDir + V);
	float spec = pow(max(dot(N, H), 0.0), mix(16.0, 140.0, gloss)) * mix(0.15, 2.2, gloss) * sh;
	vec3 R = reflect(-V, N);
	c += uSunCol * spec * (0.6 + 0.4 * fres);
	c += skyReflect(R) * fres * gloss * 0.55 * ao;
	// kenar \u0131\u015F\u0131\u011F\u0131: siluet s\u0131cak \u0131\u015F\u0131kla parlar
	float rim = pow(1.0 - ndv, 3.0) * rimK;
	c += uSunCol * rim * (0.25 + 0.75 * sh) * 0.35 * ao;
	return c;
}
vec3 applyFog(vec3 c, vec3 wp) {
	vec3 d = wp - cameraPosition;
	float dist = length(d);
	vec3 v = d / max(dist, 1e-3);
	float x = max(dist - uFogP.y, 0.0) * uFogP.x;
	float hk = exp(-max(wp.y, 0.0) * uFogP.z);
	float f = 1.0 - exp(-x * x * hk);
	float s = pow(max(dot(v, uSunDir), 0.0), uFogP.w);
	return mix(c, mix(uFogCol, uFogSun, s), clamp(f, 0.0, 1.0));
}
`,X=`
vec3 acesFit(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
// orta tonlarda rengi koruyan ton e\u015Fleme: \u0131\u015F\u0131k doygun kal\u0131r, yaln\u0131zca \xE7ok parlak yerler beyaza yanar
vec3 tonemap(vec3 c) {
	float m = max(max(c.r, c.g), c.b);
	float mt = clamp((m * (2.51 * m + 0.03)) / (m * (2.43 * m + 0.59) + 0.14), 0.0, 1.0);
	vec3 hp = c * (mt / max(m, 1e-4));
	return mix(acesFit(c), hp, 0.7 * (1.0 - smoothstep(1.2, 6.0, m)));
}
vec4 finish(vec3 c, float a) {
	c = tonemap(c * uGrade.z);
	c = pow(c, vec3(1.0 / 2.2));
	c = c * uGain + uLift * (1.0 - c);
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, uGrade.x);
	c = (c - 0.5) * uGrade.y + 0.5;
	vec2 q = gl_FragCoord.xy / uRes.xy - 0.5;
	q.x *= uRes.x / uRes.y * 0.8;
	float vg = smoothstep(0.3, 0.95, length(q));
	c *= mix(vec3(1.0), uVigCol, uRes.z * vg);
	c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrade.w;
	return vec4(clamp(c, 0.0, 1.0), a);
}
`;var qt=`
${I}
attribute vec3 iPos;
attribute float iYaw;
attribute vec3 iDim;
attribute vec3 iColA;
attribute vec3 iColB;
attribute vec4 iAnim; // x a\xE7\u0131, y yukar\u0131 kayma, z parlama, w g\xF6r\xFCn\xFCrl\xFCk
attribute float iMat;
varying vec3 vW;
varying vec3 vL;
varying vec3 vLN;
varying vec3 vCol;
varying vec3 vDim;
varying vec2 vRot;
varying float vFlash;
void main() {
	vec3 p = position * iDim;
	float a = iAnim.x;
	float ca = cos(a), sa = sin(a);
	float hz = iDim.z * 0.5;
	vec3 q = vec3(p.x, p.y, p.z - hz);
	q = vec3(q.x, q.y * ca - q.z * sa, q.y * sa + q.z * ca);
	q.z += hz;
	q *= iAnim.w;
	q.y += iAnim.y;
	float cy = cos(iYaw), sy = sin(iYaw);
	vec3 w = vec3(q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy) + iPos;
	vW = w;
	vL = position;
	vLN = normal;
	vDim = iDim;
	vRot = vec2(a, iYaw);
	vCol = normal.z < -0.5 ? iColB : iColA;
	vFlash = iAnim.z;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`,ae=`
#define SHADOW_TAPS __TAPS__
${I}
${st}
${Z}
${X}
varying vec3 vW;
varying vec3 vL;
varying vec3 vLN;
varying vec3 vCol;
varying vec3 vDim;
varying vec2 vRot;
varying float vFlash;
vec3 toWorld(vec3 n) {
	float ca = cos(vRot.x), sa = sin(vRot.x);
	n = vec3(n.x, n.y * ca - n.z * sa, n.y * sa + n.z * ca);
	float cy = cos(vRot.y), sy = sin(vRot.y);
	return vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);
}
void main() {
	// pah (yuvarlat\u0131lm\u0131\u015F kenar): y\xFCz\xFCn iki te\u011Fet ekseninde kenara yak\u0131nl\u0131k normali b\xFCker.
	// Geometri 12 \xFC\xE7genlik d\xFCz kutu ama kenarlar cilal\u0131 oyuncak gibi \u0131\u015F\u0131k yakalar.
	vec3 ln = vLN;
	vec3 edge = vec3(0.5 - abs(vL.x), min(vL.y, 1.0 - vL.y), 0.5 - abs(vL.z)) * vDim;
	float rb = 0.035 * clamp(vDim.y, 0.6, 3.0);
	vec3 k = 1.0 - smoothstep(vec3(0.0), vec3(rb), edge);
	k *= 1.0 - abs(ln); // y\xFCz\xFCn kendi ekseni b\xFCk\xFClmez
	vec3 bent = ln + vec3(sign(vL.x), sign(vL.y - 0.5), sign(vL.z)) * k * 0.85;
	vec3 N = normalize(toWorld(normalize(bent)));
	vec3 V = normalize(cameraPosition - vW);
	float sh = shadowAt(vW, N);
	// ortam \xF6rtmesi: yere yak\u0131n koyu, ayr\u0131ca kenar diplerinde hafif
	float ao = mix(0.55, 1.0, smoothstep(0.0, 0.7, vW.y)) * (1.0 - 0.18 * (k.x + k.y + k.z));
	vec3 alb = vCol;
	// y\xFCzde \xE7ok ince bir ortas\u0131 \xE7izgisi (ger\xE7ek oyuncak ta\u015F gibi), sadece geni\u015F y\xFCzlerde
	float mid = (1.0 - smoothstep(0.004, 0.012, abs(vL.y - 0.5) * vDim.y)) * step(0.5, abs(ln.z));
	alb *= 1.0 - mid * 0.25;
	vec3 c = shade(alb, N, V, ao, sh, 0.85, 0.6);
	c += alb * vFlash * 1.6 + vec3(1.0, 0.95, 0.8) * vFlash * 0.4;
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`,oe=`
void main() { gl_FragColor = vec4(1.0); }`;function Ot(r,t,e){let s=new J.ShaderMaterial({vertexShader:qt,fragmentShader:ae.replace("__TAPS__",String(t.shadowTaps)),uniforms:{...r}}),i=new J.Mesh(e,s);i.frustumCulled=!1;let a=new J.ShaderMaterial({vertexShader:qt,fragmentShader:oe,uniforms:{...r}}),o=new J.Mesh(e,a);return o.frustumCulled=!1,{mesh:i,shadowMesh:o}}var H={STAND:0,FALL:1,LEAN:2,DOWN:3,MISSING:5},Gt=Math.PI/2,lt=class{constructor(t,e,s){this.G=t,this.cap=e,this.n=0,this.gravity=7,this.x=new Float32Array(e),this.y=new Float32Array(e),this.z=new Float32Array(e),this.yaw=new Float32Array(e),this.w=new Float32Array(e),this.h=new Float32Array(e),this.t=new Float32Array(e),this.st=new Uint8Array(e),this.ang=new Float32Array(e),this.vel=new Float32Array(e),this.nextA=new Int32Array(e).fill(-1),this.nextB=new Int32Array(e).fill(-1),this.reachA=new Float32Array(e),this.reachB=new Float32Array(e),this.softA=new Uint8Array(e),this.softB=new Uint8Array(e),this.contact=new Float32Array(e),this.rest=new Float32Array(e),this.lean=new Int32Array(e).fill(-1),this.seq=new Float32Array(e),this.hitT=new Float32Array(e).fill(-1),this.flash=new Float32Array(e),this.lift=new Float32Array(e),this.liftV=new Float32Array(e),this.tag=new Int32Array(e).fill(-1),this.active=new Int32Array(e),this.nActive=0,this.inActive=new Uint8Array(e),this.time=0,this.toppled=0,this.onHit=null,this.onLand=null,this.front=-1,this.frontT=-1;let i=new D.InstancedBufferGeometry,a=new D.BoxGeometry(1,1,1).translate(0,.5,0);i.index=a.index,i.setAttribute("position",a.getAttribute("position")),i.setAttribute("normal",a.getAttribute("normal")),this.aPos=new D.InstancedBufferAttribute(new Float32Array(e*3),3),this.aYaw=new D.InstancedBufferAttribute(new Float32Array(e),1),this.aDim=new D.InstancedBufferAttribute(new Float32Array(e*3),3),this.aColA=new D.InstancedBufferAttribute(new Float32Array(e*3),3),this.aColB=new D.InstancedBufferAttribute(new Float32Array(e*3),3),this.aAnim=new D.InstancedBufferAttribute(new Float32Array(e*4),4),this.aAnim.setUsage(D.DynamicDrawUsage),this.aMat=new D.InstancedBufferAttribute(new Float32Array(e),1),i.setAttribute("iPos",this.aPos),i.setAttribute("iYaw",this.aYaw),i.setAttribute("iDim",this.aDim),i.setAttribute("iColA",this.aColA),i.setAttribute("iColB",this.aColB),i.setAttribute("iAnim",this.aAnim),i.setAttribute("iMat",this.aMat),i.instanceCount=0,this.geo=i,this._dirtyLo=e,this._dirtyHi=-1;let o=Ot(t,s,i);this.mesh=o.mesh,this.shadowMesh=o.shadowMesh,this.mat=o.mesh.material}clear(){this.n=0,this.nActive=0,this.inActive.fill(0),this.nextA.fill(-1),this.nextB.fill(-1),this.softA.fill(0),this.softB.fill(0),this.lean.fill(-1),this.hitT.fill(-1),this.tag.fill(-1),this.toppled=0,this.front=-1,this.frontT=-1,this.time=0,this.geo.instanceCount=0}add(t,e,s,i,a,o,h=0,n=0){let l=this.n++;if(l>=this.cap)throw new Error("domino kapasitesi a\u015F\u0131ld\u0131");return this.x[l]=t,this.y[l]=h,this.z[l]=e,this.yaw[l]=s,this.w[l]=.5*i,this.h[l]=1*i,this.t[l]=.16*i,this.st[l]=H.STAND,this.ang[l]=0,this.vel[l]=0,this.flash[l]=0,this.lift[l]=0,this.liftV[l]=0,this.aPos.array.set([t,h,e],l*3),this.aYaw.array[l]=s,this.aDim.array.set([this.w[l],this.h[l],this.t[l]],l*3),this.aColA.array.set([a.r,a.g,a.b],l*3),this.aColB.array.set([o.r,o.g,o.b],l*3),this.aAnim.array.set([0,0,0,1],l*4),this.aMat.array[l]=n,l}link(t,e,{reach:s=null,soft:i=!1}={}){let a=this.gapBetween(t,e),o=s??(a>=this.h[t]?9:Math.asin(Math.max(.02,a)/this.h[t]));this.nextA[t]<0?(this.nextA[t]=e,this.reachA[t]=o,this.softA[t]=i?1:0):(this.nextB[t]=e,this.reachB[t]=o,this.softB[t]=i?1:0)}gapBetween(t,e){let s=[Math.sin(this.yaw[t]),Math.cos(this.yaw[t])],i=[Math.sin(this.yaw[e]),Math.cos(this.yaw[e])],a=this.x[t]+s[0]*this.t[t]*.5,o=this.z[t]+s[1]*this.t[t]*.5,h=this.x[e]-i[0]*this.t[e]*.5,n=this.z[e]-i[1]*this.t[e]*.5;return(h-a)*s[0]+(n-o)*s[1]}setMissing(t,e){this.st[t]=e?H.MISSING:H.STAND,this.aAnim.array[t*4+3]=e?0:1,this._dirty(t)}place(t){return this.st[t]!==H.MISSING?!1:(this.st[t]=H.STAND,this.lift[t]=2.6*this.h[t],this.liftV[t]=0,this.flash[t]=1,this.aAnim.array[t*4+3]=1,this._activate(t),!0)}finalize(){this.geo.instanceCount=this.n;for(let t of[this.aPos,this.aYaw,this.aDim,this.aColA,this.aColB,this.aAnim,this.aMat])t.clearUpdateRanges(),t.needsUpdate=!0}push(t,e=3.2){this.st[t]===H.STAND&&this._trigger(t,e,-1)}_trigger(t,e,s){this.st[t]=H.FALL,this.vel[t]=e,this.ang[t]=Math.max(this.ang[t],.04),this.hitT[t]=this.time,this.toppled++,this.flash[t]=.55,this.front=t,this.frontT=this.time,this._activate(t),this.onHit&&s>=0&&this.onHit(s,t,e)}_activate(t){this.inActive[t]||(this.inActive[t]=1,this.active[this.nActive++]=t)}_dirty(t){t<this._dirtyLo&&(this._dirtyLo=t),t>this._dirtyHi&&(this._dirtyHi=t)}update(t){this.time+=t;let e=this.aAnim.array,s=0;for(let i=0;i<this.nActive;i++){let a=this.active[i],o=!1,h=this.st[a];if(h===H.FALL){o=!0;let n=1.5*this.gravity/this.h[a];if(this.vel[a]+=n*Math.sin(this.ang[a]+.12)*t,this.ang[a]+=this.vel[a]*t,this._reach(a),this.st[a]===H.FALL&&this.ang[a]>=Gt){this.ang[a]=Gt;let l=this.vel[a];l>1.2?(this.vel[a]=-l*.22,this.onLand&&this.onLand(a,l)):(this.vel[a]=0,this.st[a]=H.DOWN,o=!1)}}else if(h===H.LEAN){let n=this.lean[a],l=Math.min(1,this.ang[n]/1.25),c=this.contact[a]+(this.rest[a]-this.contact[a])*l;this.ang[a]+=(c-this.ang[a])*(1-Math.exp(-28*t)),o=Math.abs(c-this.ang[a])>.003||this.st[n]===H.FALL,this._reach(a)}else h===H.STAND&&this.lift[a]>0&&(o=!0,this.liftV[a]-=60*t,this.lift[a]+=this.liftV[a]*t,this.lift[a]<=0&&(this.lift[a]=0,this.liftV[a]<-4?this.liftV[a]*=-.28:this.liftV[a]=0),o=this.lift[a]>0||this.liftV[a]!==0);this.flash[a]>0&&(this.flash[a]=Math.max(0,this.flash[a]-t*3.5),o=o||this.flash[a]>0),e[a*4]=this.ang[a],e[a*4+1]=this.lift[a],e[a*4+2]=this.flash[a],this._dirty(a),o?this.active[s++]=a:this.inActive[a]=0}this.nActive=s,this._dirtyHi>=this._dirtyLo&&(this.aAnim.clearUpdateRanges(),this.aAnim.addUpdateRange(this._dirtyLo*4,(this._dirtyHi-this._dirtyLo+1)*4),this.aAnim.needsUpdate=!0,this._dirtyLo=this.cap,this._dirtyHi=-1)}_reach(t){let e=this.nextA[t],s=this.nextB[t];e>=0&&this.ang[t]>=this.reachA[t]&&this._contact(t,e,this.softA[t]),s>=0&&this.ang[t]>=this.reachB[t]&&this._contact(t,s,this.softB[t])}_contact(t,e,s){if(this.st[e]===H.MISSING||this.hitT[e]>=0){this.st[e]!==H.MISSING&&!s&&this.st[t]===H.FALL&&this._touch(t,e);return}s||this.st[t]!==H.FALL?this.st[e]===H.STAND&&this._trigger(e,Math.max(1.5,this.vel[t]*.78),t):this._touch(t,e)}_touch(t,e){let s=this.st[e];if(s===H.MISSING)return;this.st[t]=H.LEAN,this.lean[t]=e,this.contact[t]=this.ang[t];let i=this.gapBetween(t,e)+this.t[t];if(this.rest[t]=Math.min(1.45,Math.asin(Math.min(1,i/this.h[t]))+.5),s===H.STAND){let a=Math.max(1.5,this.vel[t]*Math.sqrt(this.h[t]/this.h[e])*.78);this._trigger(e,a,t);let o=this.nextA[t]===e?this.nextB[t]:this.nextA[t],h=this.nextA[t]===e?this.softB[t]:this.softA[t];o>=0&&!h&&this.st[o]===H.STAND&&this.hitT[o]<0&&this._trigger(o,a,t)}}tip(t,e){let s=this.ang[t],i=this.h[t]*.75,a=Math.sin(this.yaw[t]),o=Math.cos(this.yaw[t]);return e.set(this.x[t]+a*Math.sin(s)*i,this.y[t]+Math.cos(s)*i+this.lift[t],this.z[t]+o*Math.sin(s)*i),e}};import*as f from"three";import{mergeGeometries as ne}from"three/examples/jsm/utils/BufferGeometryUtils.js";var B={half:34,corner:11,size:92};function kt(r,t){let e=B.half-B.corner,s=Math.abs(r)-e,i=Math.abs(t)-e,a=Math.max(s,0),o=Math.max(i,0);return Math.hypot(a,o)+Math.min(Math.max(s,i),0)-B.corner}var Ut=`
attribute vec4 color;
attribute float mat;
varying vec3 vW;
varying vec3 vN;
varying vec4 vC;
varying float vM;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vC = color;
	vM = mat;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,re=`
#define SHADOW_TAPS __TAPS__
${I}
${st}
${Z}
${X}
varying vec3 vW;
varying vec3 vN;
varying vec4 vC;
varying float vM;
void main() {
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	float sh = shadowAt(vW, N);
	vec3 alb = vC.rgb;
	float gloss = 0.12;
	float rim = 0.35;
	if (vM > 0.5 && vM < 1.5) {
		// cam: koyu mavi, g\xF6ky\xFCz\xFCn\xFC yans\u0131t\u0131r
		gloss = 1.0;
		rim = 0.0;
	} else if (vM > 1.5 && vM < 2.5) {
		// yaprak: hafif yumu\u015Fak \u0131\u015F\u0131k ge\xE7irgenli\u011Fi
		alb *= 0.9 + 0.2 * vnoise(vW.xz * 1.7 + vW.y);
		rim = 0.9;
	} else if (vM > 2.5) {
		// boyal\u0131 ah\u015Fap / kiremit: hafif desen
		alb *= 0.92 + 0.12 * vnoise(vec2(vW.x + vW.z, vW.y) * vec2(2.0, 7.0));
		gloss = 0.25;
	}
	vec3 c = shade(alb, N, V, vC.a, sh, gloss, rim);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`,he=`
varying vec3 vW;
varying vec2 vUv;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vUv = uv;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,le=`
#define SHADOW_TAPS __TAPS__
${I}
${st}
${Z}
${X}
uniform sampler2D uMap; // r kald\u0131r\u0131m, g meydan ta\u015F\u0131, b kumsal
uniform sampler2D uAO;
uniform float uWorld;
varying vec3 vW;
varying vec2 vUv;
// arnavut kald\u0131r\u0131m\u0131: s\u0131ra s\u0131ra kayd\u0131r\u0131lm\u0131\u015F, k\xF6\u015Feleri yuvarlak ta\u015Flar
vec3 cobble(vec2 p, out float mortar) {
	p *= 1.9;
	float row = floor(p.y);
	p.x += hash12(vec2(row, 3.1)) * 0.9 + row * 0.5;
	vec2 cell = floor(p);
	vec2 f = fract(p) - 0.5;
	float h = hash12(cell);
	vec2 e = abs(f) * vec2(1.0, 1.15);
	float d = max(e.x, e.y);
	mortar = smoothstep(0.36, 0.48, d + 0.04 * vnoise(p * 7.0));
	vec3 col = mix(vec3(0.74, 0.66, 0.56), vec3(0.86, 0.79, 0.68), h);
	col = mix(col, vec3(0.68, 0.62, 0.6), step(0.82, h) * 0.6);
	return col * (0.94 + 0.12 * (0.5 - d));
}
vec3 tiles(vec2 p, out float grout) {
	p *= 0.62;
	vec2 cell = floor(p);
	vec2 f = abs(fract(p) - 0.5);
	grout = smoothstep(0.44, 0.49, max(f.x, f.y));
	float chk = mod(cell.x + cell.y, 2.0);
	vec3 a = vec3(0.93, 0.88, 0.8);
	vec3 b = vec3(0.86, 0.62, 0.48);
	return mix(a, b, chk * 0.55) * (0.95 + 0.08 * hash12(cell));
}
void main() {
	vec2 uv = vW.xz / uWorld + 0.5;
	vec4 m = texture2D(uMap, uv);
	float ao = texture2D(uAO, uv).r;
	vec3 N = vec3(0.0, 1.0, 0.0);
	// \xE7imen: bi\xE7ilmi\u015F \xE7im \u015Feritleri ve renk dalgas\u0131
	float stripe = step(0.5, fract(dot(vW.xz, vec2(0.7071, 0.7071)) * 0.22));
	vec3 grass = mix(vec3(0.34, 0.72, 0.26), vec3(0.42, 0.8, 0.3), stripe * 0.6 + 0.4 * vnoise(vW.xz * 0.35));
	grass *= 0.9 + 0.15 * vnoise(vW.xz * 3.1);
	float mortar, grout;
	vec3 road = cobble(vW.xz, mortar);
	road = mix(road, road * 0.55, mortar);
	vec3 plaza = tiles(vW.xz, grout);
	plaza = mix(plaza, plaza * 0.7, grout);
	vec3 sand = vec3(0.98, 0.86, 0.6) * (0.94 + 0.08 * vnoise(vW.xz * 2.3));
	vec3 alb = grass;
	// yol kenar\u0131: \xE7imenden kald\u0131r\u0131ma yumu\u015Fak ge\xE7i\u015F, kenarda bord\xFCr
	float r = smoothstep(0.35, 0.6, m.r);
	float curb = (1.0 - smoothstep(0.0, 0.12, abs(m.r - 0.45))) * 0.8;
	alb = mix(alb, road, r);
	alb = mix(alb, vec3(0.95, 0.93, 0.88), curb);
	alb = mix(alb, plaza, smoothstep(0.4, 0.6, m.g));
	alb = mix(alb, sand, smoothstep(0.3, 0.7, m.b));
	// kumsal suya yakla\u015Ft\u0131k\xE7a \u0131slak ve koyu
	float wet = smoothstep(-0.55, -0.95, vW.y);
	alb = mix(alb, alb * vec3(0.72, 0.68, 0.62), wet);
	float sh = shadowAt(vW, N);
	vec3 c = shade(alb, N, normalize(cameraPosition - vW), mix(0.42, 1.0, ao), sh, 0.06 + wet * 0.4, 0.0);
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`,ce=`
varying vec3 vW;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,fe=`
${I}
${Z}
${X}
uniform vec3 uSea, uSeaDeep;
uniform vec4 uIsland; // x yar\u0131 boy - k\xF6\u015Fe, y k\xF6\u015Fe yar\u0131\xE7ap\u0131
varying vec3 vW;
float islandSD(vec2 p) {
	vec2 q = abs(p) - uIsland.x;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uIsland.y;
}
void main() {
	vec2 p = vW.xz;
	float d = islandSD(p);
	float t = uTime;
	// dalgalar: birka\xE7 y\xF6nl\xFC sin\xFCs + g\xFCr\xFClt\xFC (yaln\u0131zca normal)
	vec2 g = vec2(0.0);
	g += vec2(0.6, 0.8) * cos(dot(p, vec2(0.6, 0.8)) * 0.9 + t * 1.3) * 0.08;
	g += vec2(-0.8, 0.5) * cos(dot(p, vec2(-0.8, 0.5)) * 1.7 + t * 1.9) * 0.05;
	g += vec2(0.2, -1.0) * cos(dot(p, vec2(0.2, -1.0)) * 3.1 + t * 2.6) * 0.03;
	g += (vec2(vnoise(p * 1.3 + t * 0.4), vnoise(p * 1.3 - t * 0.37)) - 0.5) * 0.12;
	vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
	vec3 V = normalize(cameraPosition - vW);
	// s\u0131\u011Fdan derine: k\u0131y\u0131da turkuaz, a\xE7\u0131kta koyu mavi
	float shallow = 1.0 - smoothstep(0.0, 14.0, d);
	vec3 base = mix(uSeaDeep, uSea, shallow * 0.85 + 0.15);
	base = mix(base, vec3(0.55, 0.95, 0.9), (1.0 - smoothstep(0.0, 3.5, d)) * 0.5);
	float ndv = clamp(dot(N, V), 0.0, 1.0);
	float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
	vec3 R = reflect(-V, N);
	vec3 c = base * (uSkyTop * 0.9 + uSunCol * 0.32 * max(dot(N, uSunDir), 0.0));
	c = mix(c, skyReflect(R), fres * 0.8);
	vec3 H = normalize(uSunDir + V);
	c += uSunCol * pow(max(dot(N, H), 0.0), 220.0) * 2.5;
	// k\u0131y\u0131 k\xF6p\xFC\u011F\xFC: k\u0131y\u0131ya paralel kayan bantlar
	float foamBand = 1.0 - smoothstep(0.0, 2.6, d);
	float wave = sin(d * 3.2 - t * 2.2 + vnoise(p * 0.8) * 3.0) * 0.5 + 0.5;
	float foam = foamBand * smoothstep(0.55, 0.9, wave) * (0.6 + 0.4 * vnoise(p * 4.0 + t));
	foam += (1.0 - smoothstep(-0.2, 0.6, d)) * 0.8;
	c = mix(c, vec3(1.0) * (uSkyTop + uSunCol * 0.35), clamp(foam, 0.0, 1.0));
	c = applyFog(c, vW);
	gl_FragColor = finish(c, 1.0);
}`,de=`
varying vec3 vD;
void main() {
	vD = position;
	vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
	gl_Position = p.xyww;
}`,ue=`
${I}
${X}
uniform vec3 uZenith, uHorizon, uSunGlow;
varying vec3 vD;
void main() {
	vec3 d = normalize(vD);
	float h = max(d.y, 0.0);
	vec3 c = mix(uHorizon, uZenith, pow(h, 0.55));
	float s = max(dot(d, uSunDir), 0.0);
	c += uSunGlow * (pow(s, 8.0) * 0.35 + pow(s, 64.0) * 0.6);
	c += vec3(1.0, 0.98, 0.92) * smoothstep(0.9985, 0.9993, s) * 4.0;
	// yumu\u015Fak bulut ku\u015Fa\u011F\u0131
	vec2 q = d.xz / max(d.y + 0.15, 0.05);
	float cl = vnoise(q * 0.9 + uTime * 0.01) * 0.6 + vnoise(q * 2.3 - uTime * 0.015) * 0.4;
	cl = smoothstep(0.55, 0.85, cl) * smoothstep(0.02, 0.25, d.y) * (1.0 - smoothstep(0.35, 0.8, d.y));
	c = mix(c, vec3(1.0, 1.0, 1.0) * 1.15, cl * 0.75);
	gl_FragColor = finish(c, 1.0);
}`,Yt=new f.Matrix4,jt=new f.Quaternion,Xt=new f.Euler,me=new f.Vector3,pe=new f.Vector3,At=class{constructor(){this.parts=[]}put(t,e,s,i,a,o,h=0,{sx:n=1,sy:l=1,sz:c=1,rx:u=0,rz:d=0,aoBase:m=.62,aoH:y=1.2}={}){let x=t.index?t.toNonIndexed():t.clone();Xt.set(u,a,d,"YXZ"),jt.setFromEuler(Xt),Yt.compose(pe.set(e,s,i),jt,me.set(n,l,c)),x.applyMatrix4(Yt);let v=x.getAttribute("position"),S=v.count,A=new Float32Array(S*4),T=new Float32Array(S).fill(h),p=o instanceof f.Color?o:new f.Color(o);for(let g=0;g<S;g++){let C=v.getY(g),V=m+(1-m)*Math.min(1,Math.max(0,C/y));A[g*4]=p.r,A[g*4+1]=p.g,A[g*4+2]=p.b,A[g*4+3]=V}x.setAttribute("color",new f.BufferAttribute(A,4)),x.setAttribute("mat",new f.BufferAttribute(T,1)),x.deleteAttribute("uv"),this.parts.push(x)}build(){let t=ne(this.parts,!1);return t.computeBoundingSphere(),t}},Rt=new f.BoxGeometry(1,1,1),Q=new f.BoxGeometry(1,1,1).translate(0,.5,0),ve=(()=>{let r=new f.Shape;r.moveTo(-.5,0),r.lineTo(.5,0),r.lineTo(0,1),r.lineTo(-.5,0);let t=new f.ExtrudeGeometry(r,{depth:1,bevelEnabled:!1});return t.translate(0,0,-.5),t})(),Kt=new f.CylinderGeometry(.5,.5,1,10).translate(0,.5,0),ct=new f.CylinderGeometry(.5,.5,1,20).translate(0,.5,0),St=new f.IcosahedronGeometry(1,1),zt=new f.IcosahedronGeometry(.5,1),ge=[16773596,16767426,13625599,16774328,14283472,16763350,16048639,16769960],xe=[14705214,14176570,13191734,4161488,4889194,15043130],ye=[8014378,3107496,4164186,11024954];function we(r,t,e,s,i,a,o,h,n=.62){let l=1.7*n,c=h*l+.4*n,u=t.pick(ge),d=t.pick(xe);r.put(Q,e,0,s,i,u,3,{sx:a,sy:c,sz:o,aoH:1.2*n}),r.put(Q,e,c-.05*n,s,i,16249578,0,{sx:a+.3*n,sy:.18*n,sz:o+.3*n,aoBase:1}),r.put(ve,e,c+.1*n,s,i,d,3,{sx:a+.5*n,sy:Math.min(2.4*n,a*.55),sz:o+.5*n,aoBase:1});let m=Math.cos(i),y=Math.sin(i),x=Math.max(1,Math.floor(a/(1.4*n)));for(let v=0;v<h;v++)for(let S=0;S<x;S++){let A=(S-(x-1)/2)*(a/x),T=.95*n+v*l;if(v===0&&S===Math.floor(x/2)){let C=e+A*m+(o/2+.03)*y,V=s-A*y+(o/2+.03)*m;r.put(Q,C,0,V,i,t.pick(ye),3,{sx:.7*n,sy:1.25*n,sz:.1*n}),r.put(Q,C,1.25*n,V,i,16777215,0,{sx:.9*n,sy:.12*n,sz:.14*n,aoBase:1});continue}let p=e+A*m+(o/2+.04*n)*y,g=s-A*y+(o/2+.04*n)*m;r.put(Rt,p,T,g,i,16777215,0,{sx:.78*n,sy:.92*n,sz:.08*n,aoBase:1}),r.put(Rt,p+.02*n*y,T,g+.02*n*m,i,2906778,1,{sx:.6*n,sy:.74*n,sz:.06*n,aoBase:1}),r.put(Rt,p+.06*n*y,T-.5*n,g+.06*n*m,i,16777215,0,{sx:.86*n,sy:.08*n,sz:.2*n,aoBase:1}),t()<.35&&r.put(zt,p+.12*n*y,T-.38*n,g+.12*n*m,i,t.pick([16734842,16765498,16747066]),2,{sx:.7*n,sy:.35*n,sz:.3*n,aoBase:1})}t()<.6&&r.put(Q,e+a*.25*m,c+.4*n,s-a*.25*y,i,14207160,0,{sx:.45*n,sy:1.5*n,sz:.45*n,aoBase:.8})}function Ee(r,t,e,s,i=1){let a=1.4*i;r.put(Kt,e,0,s,0,9067066,0,{sx:.32*i,sy:a,sz:.32*i,aoBase:.5});let o=[5224522,6080602,4171850,7000170],h=t.pick(o);r.put(St,e,a+.9*i,s,t()*6,h,2,{sx:1.35*i,sy:1.25*i,sz:1.35*i,aoBase:.75,aoH:a+2*i}),r.put(St,e+.6*i,a+.55*i,s+.3*i,t()*6,h,2,{sx:.9*i,sy:.85*i,sz:.9*i,aoBase:.72,aoH:a+2*i}),r.put(St,e-.5*i,a+1.5*i,s-.2*i,t()*6,h,2,{sx:.85*i,sy:.8*i,sz:.85*i,aoBase:.8,aoH:a+2*i})}function be(r,t,e){r.put(Kt,t,0,e,0,3095114,0,{sx:.1,sy:1.7,sz:.1,aoBase:.6}),r.put(zt,t,1.82,e,0,16773552,1,{sx:.36,sy:.36,sz:.36,aoBase:1}),r.put(Q,t,2.02,e,0,3095114,0,{sx:.3,sy:.09,sz:.3,aoBase:1})}function Te(r,t,e){r.put(ct,t,0,e,0,15919832,0,{sx:3.6,sy:.55,sz:3.6,aoBase:.7,aoH:.55}),r.put(ct,t,.47,e,0,3981536,1,{sx:3.1,sy:.08,sz:3.1,aoBase:1}),r.put(ct,t,0,e,0,15919832,0,{sx:.7,sy:1.4,sz:.7,aoBase:.7}),r.put(ct,t,1.4,e,0,15919832,0,{sx:1.6,sy:.24,sz:1.6,aoBase:1}),r.put(zt,t,1.85,e,0,8380671,1,{sx:.7,sy:.7,sz:.7,aoBase:1})}function _e(r,t,e){let s=B.size,i=1024,a=d=>(d+s/2)/s*i,o=i/s,h=document.createElement("canvas");h.width=h.height=i;let n=h.getContext("2d");n.fillStyle="#000",n.fillRect(0,0,i,i),n.fillStyle="rgb(0,0,255)",n.fillRect(0,0,i,i),n.globalCompositeOperation="source-over",((d,m)=>{let y=B.half-d,x=Math.max(.5,B.corner-d*.6);n.fillStyle=m,n.beginPath(),n.roundRect(a(-y),a(-y),y*2*o,y*2*o,x*o),n.fill()})(2.6,"#000");for(let d of r.plazas||[])n.fillStyle="rgb(0,255,0)",n.beginPath(),n.arc(a(d[0]),a(d[1]),d[2]*o,0,Math.PI*2),n.fill();n.lineCap="round",n.lineJoin="round",n.strokeStyle="rgb(255,0,0)";let c=(d,m)=>{let y=new f.CatmullRomCurve3(d.map(v=>new f.Vector3(v[0],0,v[1])),!1,"centripetal"),x=y.getSpacedPoints(Math.max(8,Math.ceil(y.getLength()*2)));n.lineWidth=m*o,n.beginPath(),x.forEach((v,S)=>S?n.lineTo(a(v.x),a(v.z)):n.moveTo(a(v.x),a(v.z))),n.stroke()};n.filter="blur(1.5px)";for(let d of t)c(d.pts,d.w);for(let d of r.streets||[])c(d,3.2);n.filter="none";let u=new f.CanvasTexture(h);return u.colorSpace=f.NoColorSpace,u.flipY=!1,u.anisotropy=4,u.minFilter=f.LinearMipmapLinearFilter,u.generateMipmaps=!0,{tex:u,canvas:h,toPx:a,k:o,N:i}}function Me(r,t,e,s,i){let h=document.createElement("canvas");h.width=h.height=512;let n=h.getContext("2d");n.fillStyle="#fff",n.fillRect(0,0,512,512),n.filter="blur(6px)",n.fillStyle="rgba(0,0,0,0.75)";for(let c of r)n.save(),n.translate(s(c.x)*.5,s(c.z)*.5),n.rotate(-c.yaw),n.fillRect((-c.w/2-.4)*i*.5,(-c.d/2-.4)*i*.5,(c.w+.8)*i*.5,(c.d+.8)*i*.5),n.restore();n.filter="blur(5px)",n.fillStyle="rgba(0,0,0,0.45)";for(let c of t)n.beginPath(),n.arc(s(c.x)*.5,s(c.z)*.5,1.6*c.s*i*.5,0,Math.PI*2),n.fill();n.filter="blur(2px)",n.strokeStyle="rgba(0,0,0,0.28)",n.lineCap="round";for(let c of e){let u=new f.CatmullRomCurve3(c.pts.map(m=>new f.Vector3(m[0],0,m[1])),!1,"centripetal"),d=u.getSpacedPoints(Math.max(8,Math.ceil(u.getLength()*2)));n.lineWidth=.9*i*.5,n.beginPath(),d.forEach((m,y)=>y?n.lineTo(s(m.x)*.5,s(m.z)*.5):n.moveTo(s(m.x)*.5,s(m.z)*.5)),n.stroke()}let l=new f.CanvasTexture(h);return l.colorSpace=f.NoColorSpace,l.flipY=!1,l}function Zt(r,t,e,s){let i=It(e.seed||1),a=String(t.shadowTaps),o=new f.Group,h=[],n=[],l=z=>{let b=new f.CatmullRomCurve3(z.map(E=>new f.Vector3(E[0],0,E[1])),!1,"centripetal");for(let E of b.getSpacedPoints(Math.max(4,Math.ceil(b.getLength()/1.5))))n.push([E.x,E.z])};for(let z of s)l(z.pts);for(let z of e.streets||[])l(z);let c=(z,b,E)=>n.some(R=>(R[0]-z)**2+(R[1]-b)**2<E*E),u=(z,b,E)=>(e.plazas||[]).some(R=>Math.hypot(R[0]-z,R[1]-b)<R[2]+E),d=(z,b,E)=>(e.keepOut||[]).some(R=>Math.hypot(R[0]-z,R[1]-b)<R[2]+E),m=new At,y=[],x=[],v=[],S=(z,b,E)=>!v.some(R=>(R[0]-z)**2+(R[1]-b)**2<(R[2]+E)**2);for(let z of[...s.map(b=>b.pts),...e.streets||[]]){let b=new f.CatmullRomCurve3(z.map(P=>new f.Vector3(P[0],0,P[1])),!1,"centripetal"),E=b.getLength(),R=new f.Vector3,Y=new f.Vector3;for(let P=1.5;P<E-1.5;P+=2.8+i()*1.2){b.getPointAt(P/E,R),b.getTangentAt(P/E,Y);for(let j of[-1,1]){if(i()<.2)continue;let W=1.7+i()*1.1,at=1.7+i()*.7,Ft=1.3+.8+at/2+i()*.4,Pt=-Y.z*j,Dt=Y.x*j,q=R.x+Pt*Ft,O=R.z+Dt*Ft,et=Math.max(W,at)*.62;if(kt(q,O)>-4.5||c(q,O,et+.9)||u(q,O,et)||d(q,O,et)||!S(q,O,et))continue;let Bt=Math.atan2(-Pt,-Dt);we(m,i,q,O,Bt,W,at,1+(i()<.55?1:0)+(i()<.15?1:0)),y.push({x:q,z:O,yaw:Bt,w:W,d:at}),v.push([q,O,et])}}}for(let z=0;z<420;z++){let b=(i()-.5)*(B.half*2-6),E=(i()-.5)*(B.half*2-6),R=.55+i()*.45;kt(b,E)>-3.5||c(b,E,2.2)||u(b,E,1.6)||d(b,E,1.5)||!S(b,E,1.4*R)||(Ee(m,i,b,E,R),x.push({x:b,z:E,s:R}),v.push([b,E,1.3*R]))}for(let z of s){let b=new f.CatmullRomCurve3(z.pts.map(P=>new f.Vector3(P[0],0,P[1])),!1,"centripetal"),E=b.getLength(),R=new f.Vector3,Y=new f.Vector3;for(let P=6;P<E-3;P+=11){b.getPointAt(P/E,R),b.getTangentAt(P/E,Y);let j=R.x-Y.z*1.65,W=R.z+Y.x*1.65;!S(j,W,.4)||d(j,W,.4)||(be(m,j,W),v.push([j,W,.5]))}}e.fountain&&Te(m,e.fountain[0],e.fountain[1]);let A=m.build(),T=new f.ShaderMaterial({vertexShader:Ut,fragmentShader:re.replace("__TAPS__",a),uniforms:{...r}}),p=new f.Mesh(A,T);p.matrixAutoUpdate=!1,o.add(p),h.push(new f.Mesh(A,new f.ShaderMaterial({vertexShader:Ut,fragmentShader:"void main(){gl_FragColor=vec4(1.0);}"})));let g=_e(e,s,i),C=Me(y,x,s,g.toPx,g.k),V=t.id===0?120:160,$=new f.PlaneGeometry(B.size,B.size,V,V).rotateX(-Math.PI/2),U=$.getAttribute("position");for(let z=0;z<U.count;z++){let b=kt(U.getX(z),U.getZ(z)),E=-(Math.min(1,Math.max(0,(b+2.8)/4.6))**1.6)*2.2;U.setY(z,E)}$.computeVertexNormals();let se=new f.ShaderMaterial({vertexShader:he,fragmentShader:le.replace("__TAPS__",a),uniforms:{...r,uMap:{value:g.tex},uAO:{value:C},uWorld:{value:B.size}}}),Tt=new f.Mesh($,se);Tt.matrixAutoUpdate=!1,o.add(Tt);let tt=new f.Mesh(new f.PlaneGeometry(900,900,1,1).rotateX(-Math.PI/2),new f.ShaderMaterial({vertexShader:ce,fragmentShader:fe,uniforms:{...r,uIsland:{value:new f.Vector4(B.half-B.corner+.6,B.corner,0,0)}}}));tt.position.y=-1,tt.updateMatrix(),tt.matrixAutoUpdate=!1,o.add(tt);let it=new f.Mesh(new f.SphereGeometry(500,32,16),new f.ShaderMaterial({vertexShader:de,fragmentShader:ue,uniforms:{...r},side:f.BackSide,depthWrite:!1}));return it.renderOrder=-10,it.frustumCulled=!1,o.add(it),{group:o,casters:h,houses:y,trees:x,ground:Tt,sea:tt,sky:it,groundCanvas:g.canvas}}import*as G from"three";var Jt=new G.Vector3,ft=class{constructor(t){this.cam=t,this.mode="orbit",this.t=0,this.pos=new G.Vector3(40,34,40),this.look=new G.Vector3(0,0,0),this.dir=0,this.dist=10.5,this.height=11,this.side=.6,this.shot=null,this.shake=0,this.portrait=1,this._goalPos=new G.Vector3,this._goalLook=new G.Vector3,this.ease=0}setAspect(t){this.portrait=t<1?G.MathUtils.clamp(1/t,1,2.3):1}update(t,e,s){this.t+=t;let i=this.cam;if(this.mode!=="free"){if(this.mode==="orbit"){let a=this.t*.07+.6,o=52+10*(this.portrait-1);this._goalPos.set(Math.cos(a)*o,30+6*(this.portrait-1),Math.sin(a)*o),this._goalLook.set(0,-2,0),this.pos.lerp(this._goalPos,1-Math.exp(-2.5*t)),this.look.lerp(this._goalLook,1-Math.exp(-2.5*t))}else if(this.mode==="follow"||this.mode==="end"){let a=s-this.dir;a=Math.atan2(Math.sin(a),Math.cos(a)),this.dir+=a*(1-Math.exp(-1.6*t));let o=this.shot||{},h=this.portrait;this.dist=ot(this.dist,o.dist??10.5,1.1,t),this.height=ot(this.height,o.height??11,1.1,t),this.side=ot(this.side,o.side??.6,1.1,t);let n=this.dist*(.75+.25*h),l=this.height*(.8+.2*h),c=this.side,u=Math.sin(this.dir),d=Math.cos(this.dir);this._goalLook.set(e.x+u*2.2,e.y*.5,e.z+d*2.2);let m=Math.cos(c),y=Math.sin(c);this._goalPos.set(this._goalLook.x-u*n*m+d*n*y,l,this._goalLook.z-d*n*m-u*n*y),this.mode==="end"&&(this._goalPos.y+=10,this._goalPos.x+=(this._goalPos.x-this._goalLook.x)*.6,this._goalPos.z+=(this._goalPos.z-this._goalLook.z)*.6);let x=this.ease<1?1.5+2.5*this.ease:4;this.ease=Math.min(1,this.ease+t*.6),this.look.lerp(this._goalLook,1-Math.exp(-x*t)),this.pos.lerp(this._goalPos,1-Math.exp(-x*.62*t))}if(i.position.copy(this.pos),this.shake>0){let a=this.shake*this.shake*.35;i.position.x+=(Math.random()-.5)*a,i.position.y+=(Math.random()-.5)*a,i.position.z+=(Math.random()-.5)*a,this.shake=Math.max(0,this.shake-t*2.2)}Jt.copy(this.look),i.lookAt(Jt),i.updateMatrixWorld()}}follow(t,e){this.mode="follow",this.dir=e,this.ease=0,this._goalLook.copy(t)}};import*as w from"three";var ke=`
attribute vec3 iPos;
attribute float iYaw;
attribute vec3 iDim;
attribute vec4 iState; // x g\xF6r\xFCn\xFCrl\xFCk, y parlama, z yakla\u015Fma (0 uzak, 1 geldi), w tehlike
varying vec3 vL;
varying vec3 vN;
varying vec3 vW;
varying vec4 vS;
void main() {
	vec3 p = position * iDim * (1.0 + iState.y * 0.08);
	float cy = cos(iYaw), sy = sin(iYaw);
	vec3 w = vec3(p.x * cy + p.z * sy, p.y + 0.02, -p.x * sy + p.z * cy) + iPos;
	vW = w;
	vL = position;
	vN = vec3(normal.x * cy + normal.z * sy, normal.y, -normal.x * sy + normal.z * cy);
	vS = iState;
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0) * step(0.01, iState.x);
}`,Re=`
${I}
varying vec3 vL;
varying vec3 vN;
varying vec3 vW;
varying vec4 vS;
void main() {
	vec3 V = normalize(cameraPosition - vW);
	float fres = pow(1.0 - abs(dot(normalize(vN), V)), 1.6);
	// kenar \xE7izgileri: kutunun kenar\u0131na yak\u0131n yerler parlak
	vec3 e = 0.5 - abs(vec3(vL.x, vL.y - 0.5, vL.z));
	// y\xFCz\xFCn kendi ekseni s\u0131f\u0131rd\u0131r; ikinci en k\xFC\xE7\xFCk de\u011Fer en yak\u0131n kenara uzakl\u0131k
	float e2 = e.x + e.y + e.z - min(min(e.x, e.y), e.z) - max(max(e.x, e.y), e.z);
	float edge = 1.0 - smoothstep(0.0, 0.07, e2);
	float scan = 0.5 + 0.5 * sin(vL.y * 18.0 - uTime * 6.0);
	vec3 calm = vec3(0.35, 0.9, 1.0);
	vec3 hot = vec3(1.0, 0.55, 0.2);
	vec3 col = mix(calm, hot, vS.w);
	float pulse = 0.65 + 0.35 * sin(uTime * (5.0 + vS.z * 10.0));
	float a = (0.18 + fres * 0.55 + scan * 0.12 + edge * 0.5) * pulse * vS.x;
	gl_FragColor = vec4(col * a * 1.4, a * 0.6);
}`,Se=`
attribute vec3 iPos;
attribute vec4 iState;
attribute float iR;
varying vec2 vUv;
varying vec4 vS;
void main() {
	vUv = uv * 2.0 - 1.0;
	vS = iState;
	vec3 w = vec3(position.x * iR, 0.0, position.y * iR) + iPos + vec3(0.0, 0.03, 0.0);
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0) * step(0.01, iState.x);
}`,Ae=`
${I}
varying vec2 vUv;
varying vec4 vS;
void main() {
	float r = length(vUv);
	float a = atan(vUv.x, -vUv.y) / 6.28318 + 0.5;
	// d\u0131\u015F halka: zincirin yakla\u015Fmas\u0131 (dolan yay), i\xE7 dolgu: dokunma hedefi
	float ring = (1.0 - smoothstep(0.0, 0.06, abs(r - 0.82)));
	float prog = step(a, vS.z);
	float base = ring * 0.35;
	float arc = ring * prog;
	float fill = (1.0 - smoothstep(0.55, 0.7, r)) * 0.16 * (0.7 + 0.3 * sin(uTime * 6.0));
	vec3 calm = vec3(0.35, 0.9, 1.0);
	vec3 hot = vec3(1.0, 0.5, 0.18);
	vec3 col = mix(calm, hot, vS.w);
	float al = (base + arc + fill) * vS.x;
	gl_FragColor = vec4(col * al * 1.3, al * 0.8);
}`,ze=`
attribute vec4 iP;   // xyz konum, w ya\u015F (0..1)
attribute vec4 iC;   // rgb renk, a boyut
varying vec2 vUv;
varying float vA;
varying vec3 vC;
void main() {
	vUv = uv * 2.0 - 1.0;
	float age = iP.w;
	vA = (1.0 - age) * step(0.0, age) * step(age, 1.0);
	vC = iC.rgb;
	vec4 mv = viewMatrix * vec4(iP.xyz + vec3(0.0, age * 0.6, 0.0), 1.0);
	mv.xy += position.xy * iC.a * (0.4 + age * 1.1);
	gl_Position = projectionMatrix * mv;
}`,He=`
varying vec2 vUv;
varying float vA;
varying vec3 vC;
void main() {
	float r = length(vUv);
	float a = (1.0 - smoothstep(0.2, 1.0, r)) * vA;
	if (a < 0.01) discard;
	gl_FragColor = vec4(vC * a, a);
}`,dt=class{constructor(t,e=24){this.max=e,this.list=[];let s=new w.BoxGeometry(1,1,1).translate(0,.5,0),i=new w.InstancedBufferGeometry;i.index=s.index,i.setAttribute("position",s.getAttribute("position")),i.setAttribute("normal",s.getAttribute("normal")),this.aPos=new w.InstancedBufferAttribute(new Float32Array(e*3),3),this.aYaw=new w.InstancedBufferAttribute(new Float32Array(e),1),this.aDim=new w.InstancedBufferAttribute(new Float32Array(e*3),3),this.aState=new w.InstancedBufferAttribute(new Float32Array(e*4),4),this.aState.setUsage(w.DynamicDrawUsage),i.setAttribute("iPos",this.aPos),i.setAttribute("iYaw",this.aYaw),i.setAttribute("iDim",this.aDim),i.setAttribute("iState",this.aState),i.instanceCount=0;let a={transparent:!0,depthWrite:!1,blending:w.CustomBlending,blendSrc:w.OneFactor,blendDst:w.OneMinusSrcAlphaFactor};this.mesh=new w.Mesh(i,new w.ShaderMaterial({vertexShader:ke,fragmentShader:Re,uniforms:{...t},...a})),this.mesh.frustumCulled=!1,this.mesh.renderOrder=5;let o=new w.PlaneGeometry(2,2),h=new w.InstancedBufferGeometry;h.index=o.index,h.setAttribute("position",o.getAttribute("position")),h.setAttribute("uv",o.getAttribute("uv")),h.setAttribute("iPos",this.aPos),h.setAttribute("iState",this.aState),this.aR=new w.InstancedBufferAttribute(new Float32Array(e),1),h.setAttribute("iR",this.aR),h.instanceCount=0,this.ring=new w.Mesh(h,new w.ShaderMaterial({vertexShader:Se,fragmentShader:Ae,uniforms:{...t},...a})),this.ring.frustumCulled=!1,this.ring.renderOrder=4}set(t){this.list=t;let e=Math.min(this.max,t.length);for(let s=0;s<e;s++){let i=t[s];this.aPos.array.set([i.x,0,i.z],s*3),this.aYaw.array[s]=i.yaw,this.aDim.array.set([i.w*1.02,i.h*1.02,i.t*1.15],s*3),this.aR.array[s]=i.h*.85,this.aState.array.set([1,0,0,0],s*4)}for(let s of[this.aPos,this.aYaw,this.aDim,this.aR,this.aState])s.needsUpdate=!0;this.mesh.geometry.instanceCount=e,this.ring.geometry.instanceCount=e}state(t,e,s,i,a){let o=this.aState.array;o[t*4]=e,o[t*4+1]=s,o[t*4+2]=i,o[t*4+3]=a}flush(){this.aState.needsUpdate=!0}},ut=class{constructor(t,e=400){this.max=e,this.n=0,this.head=0;let s=new w.PlaneGeometry(1,1),i=new w.InstancedBufferGeometry;i.index=s.index,i.setAttribute("position",s.getAttribute("position")),i.setAttribute("uv",s.getAttribute("uv")),this.aP=new w.InstancedBufferAttribute(new Float32Array(e*4).fill(2),4),this.aC=new w.InstancedBufferAttribute(new Float32Array(e*4),4),this.aP.setUsage(w.DynamicDrawUsage),this.aC.setUsage(w.DynamicDrawUsage),i.setAttribute("iP",this.aP),i.setAttribute("iC",this.aC),i.instanceCount=e,this.vel=new Float32Array(e*3),this.life=new Float32Array(e),this.mesh=new w.Mesh(i,new w.ShaderMaterial({vertexShader:ze,fragmentShader:He,transparent:!0,depthWrite:!1,blending:w.CustomBlending,blendSrc:w.OneFactor,blendDst:w.OneMinusSrcAlphaFactor})),this.mesh.frustumCulled=!1,this.mesh.renderOrder=6,this.active=0}emit(t,e,s,i,a,o,h,n=3,l=.6,c=.7){for(let u=0;u<n;u++){let d=this.head;this.head=(this.head+1)%this.max;let m=Math.random()*Math.PI*2,y=l*(.4+Math.random()*.6);this.aP.array.set([t,e,s,0],d*4),this.aC.array.set([a,o,h,i*(.7+Math.random()*.6)],d*4),this.vel[d*3]=Math.cos(m)*y,this.vel[d*3+1]=.3+Math.random()*.5,this.vel[d*3+2]=Math.sin(m)*y,this.life[d]=c*(.7+Math.random()*.6)}this.active=1.5}update(t){if(this.active<=0)return;this.active-=t;let e=this.aP.array;for(let s=0;s<this.max;s++){let i=e[s*4+3];i>=1||(e[s*4]+=this.vel[s*3]*t,e[s*4+1]+=this.vel[s*3+1]*t,e[s*4+2]+=this.vel[s*3+2]*t,this.vel[s*3]*=1-t*2.5,this.vel[s*3+2]*=1-t*2.5,e[s*4+3]=Math.min(1,i+t/this.life[s]))}this.aP.needsUpdate=!0,this.aC.needsUpdate=!0}};import*as xt from"three";import*as Qt from"three";var Ht=r=>new Qt.Color(r);function Ce(r,t,e,s){let i=(r-(e-1)/2)/(e/2.3),o=-((t-s*.45)/(s/2.1));return(i*i+o*o-1)**3-i*i*o*o*o<0}var mt=[{id:"sahil-1",name:"Sahil Kasabas\u0131",kicker:"Mahalle 1",env:"ogle",seed:7,fountain:[-21,19],plazas:[[-21,19,7.5],[-9,-17,10.5]],streets:[[[-31,4],[-20,6],[-8,3],[2,4]],[[20,28],[21,14],[25,0],[26,-12]],[[-30,-28],[-22,-30]],[[-2,28],[-6,24],[-14,26]],[[24,-22],[28,-28]]],keepOut:[[15,-18,6.5],[-9,-13,7]],build(r,t){let e={rainbow:!0,period:46,sat:.92,light:.52},s=-21,i=19,a=[];for(let x=0;x<=Math.PI*5+.001;x+=.16){let v=2.6+x/(Math.PI*2)*1.6,S=Math.PI+x;a.push([s+Math.cos(S)*v,i+Math.sin(S)*v])}let o=r.line(a,{colors:{rainbow:!0,period:60,offset:.1,sat:.92,light:.54},roadW:0}),h=r.line([[s+6.6,i+.6],[-13.6,21.4],[-10.5,21.6],[-6.5,19.8],[-1,16.5],[5.5,12],[8.6,5],[8.2,-2.5]],{colors:e,from:o.last}),n=r.line([[7.9,-3.1],[6.6,-5.6],[3,-7.8],[-3.5,-8.4],[-7.8,-8.4],[-9.2,-9.7]],{from:h.last,colors:{rainbow:!0,period:30,offset:.55,sat:.92,light:.52}}),l=r.line([[8.5,-3.1],[10.2,-5.6],[13.4,-8.5],[14.8,-12.5]],{from:h.last,colors:[16777215,16731501]}),c=31,u=16,d=r.field(-9.2,-10.4,Math.PI,c,u,(x,v)=>[Ht(16774112),Ce(x,v,c,u)?Ht(16723533):Ht(5687551)],{from:n.last,size:.78}),m=r.stairs(14.9,-13.1,Math.PI,8,1.26,{from:l.last,colors:[16765498,16747066,16731501,11554303,3836671,3133600]}),y=[{i:h.idx[38],name:"gap"},{i:h.idx[39],name:"gap"},{i:h.idx[50],name:"gap"},{i:l.idx[6],name:"gap"}];return{start:o.first,slots:y,shots:[{at:d.first,mode:"high",dist:14,height:22,side:.15},{at:m.first,mode:"low",dist:15,height:7.5,side:1.1}],fieldIdx:d.idx}}}];import*as N from"three";var te=new N.Color;function Le(r,t,{closed:e=!1}={}){let s=r.map(c=>new N.Vector3(c[0],0,c[1])),i=new N.CatmullRomCurve3(s,e,"centripetal",.5),a=i.getLength(),o=Math.max(2,Math.floor(a/t)+1),h=[],n=new N.Vector3,l=new N.Vector3;for(let c=0;c<o;c++){let u=i.getUtoTmapping(Math.min(1,c*t/a));i.getPoint(u,n),i.getTangent(u,l),h.push({x:n.x,z:n.z,yaw:Math.atan2(l.x,l.z),s:c*t})}return{pts:h,length:a,curve:i}}function pt(r,t,e){if(typeof r=="function")return r(t,e);if(r&&r.rainbow){let s=(r.offset||0)+t/(r.period||40)%1;return te.setHSL(s%1,r.sat??.78,r.light??.56),te.clone()}return Array.isArray(r)?new N.Color(r[Math.floor(t/(r.run||1))%r.length]):new N.Color(r??16777215)}var vt=class{constructor(t){this.d=t,this.seqAt=0,this.roads=[]}line(t,e={}){let s=this.d,i=e.size??1,a=(e.spacing??.6)*i,{pts:o}=Le(t,a),h=[],n=e.from!=null?s.seq[e.from]+a:e.seq??0;for(let l=0;l<o.length;l++){let c=o[l],u=pt(e.colors,l,o.length),d=e.back?pt(e.back,l,o.length):u,m=s.add(c.x,c.z,c.yaw,i,u,d);s.seq[m]=n+c.s,l>0&&s.link(h[l-1],m),h.push(m)}return e.from!=null&&s.link(e.from,h[0]),e.road!==!1&&this.roads.push({pts:t,w:e.roadW??2.6}),{first:h[0],last:h[h.length-1],idx:h}}stairs(t,e,s,i,a,o={}){let h=this.d,n=[],l=o.size??1,c=t,u=e,d=Math.sin(s),m=Math.cos(s),y=o.from!=null?h.seq[o.from]+.6:0;for(let x=0;x<i;x++){let v=pt(o.colors,x,i),S=h.add(c,u,s,l,v,o.back?pt(o.back,x,i):v);h.seq[S]=y,x>0&&h.link(n[x-1],S),n.push(S);let A=l*a,T=l*.16*.5+l*.55+A*.16*.5;c+=d*T,u+=m*T,y+=T,l=A}return o.from!=null&&h.link(o.from,n[0]),{first:n[0],last:n[n.length-1],idx:n}}field(t,e,s,i,a,o,h={}){let n=this.d,l=h.size??.8,c=h.sx??.52*l*1.25,u=h.sz??.6*l,d=Math.sin(s),m=Math.cos(s),y=m,x=-d,v=[],S=h.from!=null?n.seq[h.from]+.6:0;for(let T=0;T<a;T++){v.push([]);for(let p=0;p<i;p++){let[g,C]=o(p,T),V=t+y*(p-(i-1)/2)*c+d*T*u,$=e+x*(p-(i-1)/2)*c+m*T*u,U=n.add(V,$,s,l,g,C);n.seq[U]=S+T*u+Math.abs(p-(i-1)/2)*c*.6,v[T].push(U)}}let A=Math.floor(i/2);for(let T=0;T<a;T++)for(let p=0;p<i;p++)if(T+1<a&&n.link(v[T][p],v[T+1][p]),T===0&&p!==A&&p!==A-1){let g=v[0][p>A?p-1:p+1];n.link(g,v[0][p],{reach:.3,soft:!0})}return h.from!=null&&(n.link(h.from,v[0][A]),i>1&&n.link(h.from,v[0][A-1])),{first:v[0][A],grid:v,idx:v.flat()}}};var Ct=new xt.Vector3,Lt=new xt.Vector3,gt=class{constructor(t){this.app=t,this.d=t.dominoes,this.dir=t.director,this.ui=t.ui,this.state="title",this.levelIndex=0,this.L=null,this.info=null,this.slots=[],this.combo=0,this.score=0,this.front=new xt.Vector3,this.frontYaw=0,this.speed=3,this._lastSeq=0,this._lastSeqT=0,this.endT=0,this.timeScale=1,this.shotIdx=0,this.started=!1,this.d.onHit=(e,s,i)=>this._hit(e,s,i),this.d.onLand=(e,s)=>this._land(e,s),this._clickT=0}setup(t){let e=mt[t%mt.length];this.levelIndex=t%mt.length,this.L=e;let s=this.d;s.clear();let i=new vt(s),a=e.build(i,s);return this.info=a,this.roads=i.roads,this.slots=a.slots.map(o=>(s.setMissing(o.i,!0),{i:o.i,state:"empty",x:s.x[o.i],z:s.z[o.i],yaw:s.yaw[o.i],w:s.w[o.i],h:s.h[o.i],t:s.t[o.i],seq:s.seq[o.i],eta:99,glow:0})),s.finalize(),this.app.ghosts.set(this.slots),this.total=s.n,this.combo=0,this.score=0,this.perfects=0,this.started=!1,this.shotIdx=0,this.endT=0,this.dir.shot=null,this.front.set(s.x[a.start],.6,s.z[a.start]),this.frontYaw=s.yaw[a.start],{level:e,roads:i.roads}}ready(){var t,e,s,i;this.state="ready",this.dir.follow(this.front,this.frontYaw),this.dir.shot={dist:9,height:5.5,side:1.05},(e=(t=this.ui).level)==null||e.call(t,this.L,this),(i=(s=this.ui).hint)==null||i.call(s,"Zinciri ba\u015Flatmak i\xE7in <em>dokun</em>")}start(){var t,e,s,i;this.state==="ready"&&(this.state="run",this.started=!0,this.dir.shot=null,this.d.push(this.info.start,3.4),(e=(t=this.ui).hint)==null||e.call(t,null),(i=(s=this.app.sfx)==null?void 0:s.play)==null||i.call(s,"start"))}tap(t,e){if(this.state==="ready")return this.start();if(this.state!=="run")return;let s=null,i=3.2;for(let a of this.slots){if(a.state!=="empty")continue;let o=Math.hypot(a.x-t,a.z-e);o<i&&(i=o,s=a)}s&&this._fill(s)}_fill(t){var o,h,n,l,c;if(!this.d.place(t.i))return;t.state="filled";let e=t.eta,s,i;e<.75?(this.combo++,this.perfects++,s=this.combo>1?`M\xDCKEMMEL \xD7${this.combo}`:"M\xDCKEMMEL!",i="gold",this.score+=300*this.combo,this.dir.shake=Math.max(this.dir.shake,.35),this.slowmo=.5):e<2?(this.combo++,s="HAR\u0130KA!",i="good",this.score+=150*this.combo):(this.combo=0,s="\u0130Y\u0130",i="ok",this.score+=60);let a=this._screen(t.x,t.h*1.2,t.z);(h=(o=this.ui).pop)==null||h.call(o,s,a.x,a.y,i),(l=(n=this.app.sfx)==null?void 0:n.play)==null||l.call(n,"place",{perfect:i==="gold"}),this.app.puffs.emit(t.x,.1,t.z,.9,1,1,1,6,1.2,.5),(c=navigator.vibrate)==null||c.call(navigator,i==="gold"?25:12)}_hit(t,e,s){var o,h;let i=this.d,a=this.app.time;a-this._clickT>.012&&(this._clickT=a,(h=(o=this.app.sfx)==null?void 0:o.play)==null||h.call(o,"click",{size:i.h[e],speed:s})),i.h[e]>1.6&&(i.tip(t,Ct),this.app.puffs.emit(Ct.x,.2,Ct.z,i.h[e]*.5,1,.95,.85,3,.4*i.h[e],.8),this.dir.shake=Math.max(this.dir.shake,Math.min(1,i.h[e]*.08)))}_land(t,e){var h,n;let s=this.d;if(s.h[t]<1.3&&Math.random()>.35)return;let i=Math.sin(s.yaw[t]),a=Math.cos(s.yaw[t]),o=s.h[t]*.9;this.app.puffs.emit(s.x[t]+i*o,.1,s.z[t]+a*o,.5*s.h[t],1,.96,.9,s.h[t]>2?8:2,.5*s.h[t],.7),s.h[t]>2.5&&(this.dir.shake=Math.max(this.dir.shake,Math.min(1.2,s.h[t]*.12)),(n=(h=this.app.sfx)==null?void 0:h.play)==null||n.call(h,"thud",{size:s.h[t]}))}_screen(t,e,s){Lt.set(t,e,s).project(this.app.camera);let i=this.app.canvas.getBoundingClientRect();return{x:(Lt.x*.5+.5)*i.width,y:(-Lt.y*.5+.5)*i.height}}update(t){var m,y,x,v,S,A,T;let e=this.d;this.slowmo>0?(this.slowmo-=t,this.timeScale=.45+.55*Math.max(0,1-this.slowmo/.5)**2):this.timeScale+=(1-this.timeScale)*Math.min(1,t*4);let s=t*this.timeScale;(this.state==="run"||this.state==="end")&&e.update(s);let i=0,a=0,o=0,h=0,n=0,l=0,c=-1;for(let p=0;p<e.nActive;p++){let g=e.active[p];if(e.st[g]!==H.FALL)continue;let C=e.h[g];a+=e.x[g]*C,o+=e.z[g]*C,h+=Math.sin(e.yaw[g])*C,n+=Math.cos(e.yaw[g])*C,i+=C,e.seq[g]>c&&(c=e.seq[g])}if(i>0){a/=i,o/=i;for(let p=0;p<e.nActive;p++){let g=e.active[p];e.st[g]===H.FALL&&(l=Math.max(l,Math.hypot(e.x[g]-a,e.z[g]-o)))}if(this.front.x+=(a-this.front.x)*Math.min(1,t*6),this.front.z+=(o-this.front.z)*Math.min(1,t*6),this.frontYaw=Math.atan2(h,n),c>this._lastSeq){let p=e.time-this._lastSeqT;if(p>.05){let g=(c-this._lastSeq)/p;g<30&&(this.speed+=(g-this.speed)*.3),this._lastSeq=c,this._lastSeqT=e.time}}this.frontSeq=c}this.spread=l;let u=((m=this.info)==null?void 0:m.shots)||[];for(;this.shotIdx<u.length&&e.hitT[u[this.shotIdx].at]>=0;)this.dir.shot=u[this.shotIdx],this.shotIdx++;this.state==="run"&&l>3&&!(this.dir.shot&&this.dir.shot.mode)&&(this.dir.shot={dist:13+l*.9,height:9+l*.6,side:.7});let d=this.app.ghosts;for(let p=0;p<this.slots.length;p++){let g=this.slots[p];if(g.state==="empty"){let C=g.seq-(this.frontSeq??-99);if(g.eta=this.started?Math.max(0,C/Math.max(.5,this.speed)):99,this.started&&C<-1.2){g.state="missed",this.combo=0;let $=this._screen(g.x,1.4,g.z);(x=(y=this.ui).pop)==null||x.call(y,"KA\xC7TI!",$.x,$.y,"bad"),(S=(v=this.app.sfx)==null?void 0:v.play)==null||S.call(v,"miss")}let V=this.started?Math.max(0,Math.min(1,1-g.eta/4)):0;d.state(p,1,Math.sin(this.app.time*6+p)*.5+.5,V,V>.75?1:V*.4)}else d.state(p,0,0,0,0)}d.flush(),this.state==="run"?((T=(A=this.ui).tick)==null||T.call(A,this),this.started&&e.nActive===0&&(this.state="end",this.endT=0)):this.state==="end"&&(this.endT+=t,this.endT>1&&this.dir.mode!=="end"&&(this.dir.mode="end",this._finish())),this.app.G.uFocus.value.set(this.front.x,0,this.front.z,3)}_finish(){var s,i;let t=this.d.toppled/this.total,e=t>=.995?3:t>=.9?2:t>=.7?1:0;this.result={pct:t,stars:e,score:this.score+this.d.toppled*10,perfects:this.perfects,toppled:this.d.toppled,total:this.total},(i=(s=this.app.sfx)==null?void 0:s.play)==null||i.call(s,e>0?"win":"fail"),setTimeout(()=>{var a,o;return(o=(a=this.ui).end)==null?void 0:o.call(a,this.result,this.L)},900)}action(t){t==="play"?this.app.loadLevel(this.levelIndex,!0):t==="retry"?this.app.loadLevel(this.levelIndex,!0):t==="next"&&this.app.loadLevel(this.levelIndex+1,!0)}};var L=(r,t=3)=>`text-shadow:${[[t,0],[-t,0],[0,t],[0,-t],[t*.7,t*.7],[-t*.7,t*.7],[t*.7,-t*.7],[-t*.7,-t*.7]].map(([e,s])=>`${e}px ${s}px 0 ${r}`).join(",")},0 ${t+3}px 0 ${r}`,Fe=`
.dm-ui{position:absolute;inset:0;pointer-events:none;font-family:'Fredoka',system-ui,sans-serif;font-weight:600;color:#fff;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
:where(.dm-ui button){font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dm-ui button{pointer-events:auto}
.dm-big{font-family:'Lilita One',system-ui,sans-serif;font-weight:400;letter-spacing:.02em}

.dm-top{position:absolute;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(88vw,420px);display:none}
.dm-title-chip{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.dm-lv{font-family:'Lilita One';font-size:19px;${L("#1d3f8a",2)}}
.dm-score{font-family:'Lilita One';font-size:19px;${L("#7a3a08",2)};color:#ffe066}
.dm-bar{position:relative;height:22px;border-radius:12px;background:#1d3f8a;border:3px solid #fff;box-shadow:0 4px 0 rgba(20,40,100,.55)}
.dm-fill{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:9px;transform-origin:left center;transform:scaleX(0);
  background:linear-gradient(180deg,#9cff6e 0%,#45d14a 55%,#2fb043 100%);box-shadow:inset 0 3px 0 rgba(255,255,255,.45)}
.dm-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Lilita One';font-size:15px;${L("#173a7a",2)}}
.dm-star{position:absolute;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;transition:transform .25s cubic-bezier(.3,1.8,.5,1)}
.dm-star svg{width:100%;height:100%;filter:drop-shadow(0 2px 0 rgba(20,40,100,.6))}
.dm-star .s{fill:#5a6fa8;stroke:#fff;stroke-width:2.2}
.dm-star.on .s{fill:#ffd23a;stroke:#fff}
.dm-star.on{transform:scale(1.25)}

.dm-pops{position:absolute;inset:0;overflow:hidden}
.dm-pop{position:absolute;left:0;top:0;font-family:'Lilita One';font-size:34px;white-space:nowrap;will-change:transform,opacity;
  animation:dmPop 1.1s cubic-bezier(.2,1.4,.4,1) forwards}
.dm-pop.gold{color:#ffe14a;${L("#b5440a",3)}}
.dm-pop.good{color:#a8ff6a;${L("#1f6a1a",3)}}
.dm-pop.ok{color:#fff;${L("#2a4a9a",3)};font-size:28px}
.dm-pop.bad{color:#ff6a6a;${L("#6a0a1a",3)}}
@keyframes dmPop{0%{opacity:0;transform:translate(var(--x),var(--y)) translate(-50%,-50%) scale(.3)}
 18%{opacity:1;transform:translate(var(--x),var(--y)) translate(-50%,-80%) scale(1.18)}
 30%{transform:translate(var(--x),var(--y)) translate(-50%,-85%) scale(1)}
 100%{opacity:0;transform:translate(var(--x),var(--y)) translate(-50%,-190%) scale(.96)}}

.dm-hint{position:absolute;left:50%;bottom:calc(36px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:12px 22px;border-radius:18px;
  background:rgba(23,45,110,.92);border:3px solid #fff;box-shadow:0 5px 0 rgba(15,30,80,.5);font-size:18px;text-align:center;white-space:nowrap;
  transition:opacity .3s,transform .3s;animation:dmBob 1.6s ease-in-out infinite}
.dm-hint em{font-style:normal;color:#ffe14a}
.dm-hint.off{opacity:0;transform:translateX(-50%) translateY(12px);animation:none}
@keyframes dmBob{50%{transform:translateX(-50%) translateY(-5px)}}

.dm-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;transition:opacity .4s}
.dm-scr.off{opacity:0;pointer-events:none}
.dm-title{justify-content:space-between;padding:calc(12vh + env(safe-area-inset-top)) 16px calc(9vh + env(safe-area-inset-bottom));
  background:linear-gradient(180deg,rgba(40,90,200,.35),rgba(0,0,0,0) 35%,rgba(0,0,0,0) 65%,rgba(20,40,110,.45))}
.dm-logo{text-align:center;line-height:.86;transform:rotate(-3deg)}
.dm-logo .a{display:block;font-family:'Lilita One';font-size:min(21vw,104px);color:#fff;${L("#1d3f8a",5)}}
.dm-logo .b{display:inline-block;margin-top:10px;font-family:'Lilita One';font-size:min(12vw,58px);color:#ffe14a;padding:2px 22px 6px;border-radius:16px;
  background:linear-gradient(180deg,#ff5a6e,#e0304e);border:4px solid #fff;box-shadow:0 6px 0 #8a1830;${L("#8a1830",3)}}
.dm-tiles{display:flex;gap:6px;justify-content:center;margin-bottom:14px}
.dm-tiles i{width:16px;height:44px;border-radius:5px;border:3px solid #fff;box-shadow:0 4px 0 rgba(20,40,100,.5);display:block;transform-origin:50% 100%;animation:dmTip 3.2s ease-in-out infinite}
@keyframes dmTip{0%,55%{transform:rotate(0)}70%{transform:rotate(70deg)}86%,100%{transform:rotate(0)}}
.dm-play{font-family:'Lilita One';font-size:34px;padding:14px 64px 18px;border-radius:22px;color:#fff;
  background:linear-gradient(180deg,#ffe25a 0%,#ffc21a 50%,#ff9d0a 100%);border:4px solid #fff;
  box-shadow:0 8px 0 #b55a06,0 14px 24px rgba(0,0,0,.25),inset 0 -6px 0 rgba(200,90,0,.35);${L("#b55a06",3)};transition:transform .1s}
.dm-play:active{transform:translateY(5px);box-shadow:0 3px 0 #b55a06,inset 0 -6px 0 rgba(200,90,0,.35)}
.dm-sub{margin-top:16px;font-size:17px;${L("#1d3f8a",2)}}

.dm-end{background:rgba(20,40,110,.35)}
.dm-card{width:min(86vw,360px);padding:22px 20px 22px;border-radius:26px;text-align:center;
  background:linear-gradient(180deg,#4a8cff,#2a5fd8);border:4px solid #fff;box-shadow:0 10px 0 #183e96,0 20px 40px rgba(0,0,0,.3);transform:scale(.9);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.dm-scr:not(.off) .dm-card{transform:scale(1)}
.dm-card h2{margin:0 0 8px;font-family:'Lilita One';font-weight:400;font-size:34px;${L("#183e96",3)}}
.dm-stars{display:flex;justify-content:center;gap:6px;margin:4px 0 10px}
.dm-stars svg{width:64px;height:64px;filter:drop-shadow(0 4px 0 rgba(15,30,90,.6));transform:scale(0);animation:dmStar .5s cubic-bezier(.3,1.8,.5,1) forwards}
.dm-stars svg:nth-child(2){width:78px;height:78px;margin-top:-10px;animation-delay:.25s}
.dm-stars svg:nth-child(3){animation-delay:.5s}
@keyframes dmStar{to{transform:scale(1)}}
.dm-stars .s{fill:#3c58a8;stroke:#fff;stroke-width:1.6}
.dm-stars .on .s{fill:#ffd23a}
.dm-big-pct{font-family:'Lilita One';font-size:52px;color:#ffe14a;${L("#183e96",3)}}
.dm-row{display:flex;gap:10px;justify-content:center;margin-top:14px}
.dm-btn{font-family:'Lilita One';font-size:22px;padding:10px 22px 13px;border-radius:16px;border:3px solid #fff;color:#fff}
.dm-btn.g{background:linear-gradient(180deg,#8cff5a,#36c23a);box-shadow:0 6px 0 #1f7a1f;${L("#1f7a1f",2)}}
.dm-btn.b{background:linear-gradient(180deg,#6ab0ff,#3a7aea);box-shadow:0 6px 0 #1d4a9a;${L("#1d4a9a",2)}}
.dm-stat{font-size:16px;opacity:.95;${L("#183e96",1.5)}}
@media (prefers-reduced-motion:reduce){.dm-tiles i,.dm-hint{animation:none}}
`,yt='<svg viewBox="0 0 24 24"><path class="s" d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4L2.8 9.3l6.4-.8z" stroke-linejoin="round"/></svg>',wt=class{constructor(t,e){this.h=e;let s=document.createElement("style");s.textContent=Fe,t.appendChild(s);let i=document.createElement("div");i.className="dm-ui",i.lang="tr";let a=["#ff4d6d","#ffb020","#ffe14a","#45d14a","#3a8aff","#a64dff"];i.innerHTML=`
			<div class="dm-top" data-r="top">
				<div class="dm-title-chip"><span class="dm-lv" data-r="lv"></span><span class="dm-score" data-r="score">0</span></div>
				<div class="dm-bar"><div class="dm-fill" data-r="fill"></div>
					<div class="dm-star" data-r="s1" style="left:70%">${yt}</div>
					<div class="dm-star" data-r="s2" style="left:90%">${yt}</div>
					<div class="dm-star" data-r="s3" style="left:99%">${yt}</div>
					<div class="dm-pct" data-r="pct">%0</div>
				</div>
			</div>
			<div class="dm-pops" data-r="pops"></div>
			<div class="dm-hint off" data-r="hint"></div>
			<div class="dm-scr dm-title" data-r="title">
				<div class="dm-logo"><div class="dm-tiles">${a.map((o,h)=>`<i style="background:${o};animation-delay:${h*.12}s"></i>`).join("")}</div>
					<span class="a">DOM\u0130NO</span><span class="b">\u015EEHR\u0130</span></div>
				<div style="display:flex;flex-direction:column;align-items:center">
					<button class="dm-play" data-a="play">OYNA</button>
					<div class="dm-sub">Bir dokunu\u015F. Binlerce ta\u015F.</div>
				</div>
			</div>
			<div class="dm-scr dm-end off" data-r="end">
				<div class="dm-card">
					<h2 data-r="endT"></h2>
					<div class="dm-stars" data-r="stars"></div>
					<div class="dm-big-pct" data-r="endPct"></div>
					<div class="dm-stat" data-r="endS"></div>
					<div class="dm-row" data-r="endB"></div>
				</div>
			</div>`,t.appendChild(i),this.el=i,this.$={};for(let o of i.querySelectorAll("[data-r]"))this.$[o.dataset.r]=o;i.addEventListener("click",o=>{let h=o.target.closest("[data-a]");if(!h)return;o.stopPropagation();let n=h.dataset.a;(n==="play"||n==="retry"||n==="next")&&(this.$.title.classList.add("off"),this.$.end.classList.add("off")),e.action(n)}),i.addEventListener("pointerdown",o=>{o.target.closest("button")&&o.stopPropagation()}),this._pct=-1,this._stars=0,this._score=-1}level(t){this.$.top.style.display="block",this.$.lv.textContent=`${t.kicker} \xB7 ${t.name}`,this._pct=-1,this._stars=0;for(let e of["s1","s2","s3"])this.$[e].classList.remove("on");this.tick({d:{toppled:0},total:1,score:0})}tick(t){let e=Math.floor(t.d.toppled/t.total*100);if(e!==this._pct){this._pct=e,this.$.fill.style.transform=`scaleX(${e/100})`,this.$.pct.textContent=`%${e}`;let i=e>=99.5?3:e>=90?2:e>=70?1:0;i!==this._stars&&(this._stars=i,this.$.s1.classList.toggle("on",i>=1),this.$.s2.classList.toggle("on",i>=2),this.$.s3.classList.toggle("on",i>=3))}let s=t.score+t.d.toppled*10;s!==this._score&&(this._score=s,this.$.score.textContent=s.toLocaleString("tr-TR"))}pop(t,e,s,i="good"){let a=document.createElement("div");a.className=`dm-pop ${i}`,a.textContent=t,a.style.setProperty("--x",`${e}px`),a.style.setProperty("--y",`${s}px`),this.$.pops.appendChild(a),setTimeout(()=>a.remove(),1150)}hint(t){if(!t)return this.$.hint.classList.add("off");this.$.hint.innerHTML=t,this.$.hint.classList.remove("off")}title(t){this.$.title.classList.toggle("off",!t),t&&(this.$.top.style.display="none")}end(t){this.hint(null),this.$.endT.textContent=t.stars>=3?"KUSURSUZ!":t.stars>0?"\u015EEH\u0130R DEVR\u0130LD\u0130!":"Z\u0130NC\u0130R KOPTU",this.$.stars.innerHTML=[0,1,2].map(e=>yt.replace("<svg",`<svg class="${e<t.stars?"on":""}"`)).join(""),this.$.endPct.textContent=`%${Math.floor(t.pct*100)}`,this.$.endS.textContent=`${t.toppled.toLocaleString("tr-TR")} ta\u015F \xB7 ${t.perfects} m\xFCkemmel \xB7 ${t.score.toLocaleString("tr-TR")} puan`,this.$.endB.innerHTML='<button class="dm-btn b" data-a="retry">TEKRAR</button><button class="dm-btn g" data-a="next">DEVAM</button>',this.$.end.classList.remove("off")}};var Et=class{constructor(t={}){this.hooks=t,this.muted=!1,this.ctx=null,this._noise=null,this._voices=0}unlock(){if(this.ctx){this.ctx.state==="suspended"&&this.ctx.resume();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t)return;this.ctx=new t;let e=this.ctx.createDynamicsCompressor();e.threshold.value=-14,e.ratio.value=4,this.master=this.ctx.createGain(),this.master.gain.value=.8,this.master.connect(e).connect(this.ctx.destination);let s=this.ctx.sampleRate*.25,i=this.ctx.createBuffer(1,s,this.ctx.sampleRate),a=i.getChannelData(0);for(let o=0;o<s;o++)a[o]=Math.random()*2-1;this._noise=i,document.addEventListener("visibilitychange",()=>{this.ctx&&(document.visibilityState==="hidden"?this.ctx.suspend():this.ctx.resume())})}catch{this.ctx=null}}mute(t){this.muted=!!t,this.master&&(this.master.gain.value=t?0:.8)}_click(t,e,s,i,a){let o=this.ctx,h=o.createBufferSource();h.buffer=this._noise,h.playbackRate.value=.8+Math.random()*.4;let n=o.createBiquadFilter();n.type="bandpass",n.frequency.value=e,n.Q.value=s;let l=o.createGain();l.gain.setValueAtTime(i,t),l.gain.exponentialRampToValueAtTime(1e-4,t+a),h.connect(n).connect(l).connect(this.master),h.start(t,Math.random()*.2,a+.02),this._voices++,h.onended=()=>this._voices--}_tone(t,e,s,i,a,o="sine"){let h=this.ctx,n=h.createOscillator();n.type=o,n.frequency.setValueAtTime(e,t),n.frequency.exponentialRampToValueAtTime(s,t+a);let l=h.createGain();l.gain.setValueAtTime(1e-4,t),l.gain.exponentialRampToValueAtTime(i,t+.01),l.gain.exponentialRampToValueAtTime(1e-4,t+a),n.connect(l).connect(this.master),n.start(t),n.stop(t+a+.05)}play(t,e={}){if(this.hooks.sound&&this.hooks.sound(t,e)||!this.ctx||this.muted)return;let s=this.ctx.currentTime;if(t==="click"){if(this._voices>10)return;let i=e.size||1;this._click(s,3200/Math.sqrt(i)+Math.random()*600,3.5,.35*Math.min(1.6,Math.sqrt(i)),.045*Math.sqrt(i))}else if(t==="place")this._click(s,1800,2,.5,.08),this._tone(s,e.perfect?880:660,e.perfect?1320:880,.18,.18,"triangle"),e.perfect&&this._tone(s+.07,1320,1760,.12,.22,"triangle");else if(t==="thud"){let i=e.size||3;this._tone(s,120/Math.sqrt(i/3),45,.6,.45,"sine"),this._click(s,500,1,.5,.25)}else t==="start"?this._tone(s,520,780,.15,.2,"triangle"):t==="miss"?this._tone(s,330,180,.2,.3,"square"):t==="win"?[523,659,784,1047].forEach((i,a)=>this._tone(s+a*.11,i,i*1.01,.18,.5,"triangle")):t==="fail"&&[392,330,262].forEach((i,a)=>this._tone(s+a*.16,i,i*.98,.16,.5,"triangle"))}};var bt=class{constructor({container:t,store:e,hooks:s={},quality:i="auto",power:a="auto"}){this.container=t,this.store=e,this.hooks=s,this.qualityOpt=i,this.power=a,this.running=!1,this.visible=!0,this.time=0,this._raf=0,this._prev=0,this.V3=F.Vector3}async init(){let t=document.createElement("canvas");t.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none",this.container.appendChild(t),this.canvas=t;let e=this.store.get("settings")||{},s=this.qualityOpt!=="auto"?this.qualityOpt:e.quality??"auto",i=$t(t,s==="auto"?null:Number(s));this.renderer=i.renderer,this.renderer.autoClear=!1,this.tier=i.tier,this.info=i,this.gov=new nt({tier:i.tier.id,gpu:i.gpu,store:this.store,power:e.power||this.power}),this.gov.onScale=()=>this.resize(),this.gov.onBattery=o=>{var h,n;return(n=(h=this.ui)==null?void 0:h.pop)==null?void 0:n.call(h,o?"Pil koruma a\xE7\u0131k":"Pil koruma kapand\u0131",innerWidth/2,innerHeight*.3,"ok")};let a=Wt();this.G=a,Mt(a,rt.ogle),this.shadow=new ht(a,i.tier.shadowSize,i.tier.shadowHalf),this.scene=new F.Scene,this.camera=new F.PerspectiveCamera(42,1,.3,900),this.director=new ft(this.camera),this.dominoes=new lt(a,6e3,i.tier),this.ghosts=new dt(a),this.puffs=new ut(a,i.tier.particles),this.scene.add(this.dominoes.mesh,this.ghosts.mesh,this.ghosts.ring,this.puffs.mesh),this.shadow.add(this.dominoes.shadowMesh),this.sfx=new Et(this.hooks),this.ui=new wt(this.container,{action:o=>this.game.action(o)}),this.game=new gt(this),this._ray=new F.Raycaster,this._plane=new F.Plane(new F.Vector3(0,1,0),0),this._hit=new F.Vector3,this._ndc=new F.Vector2,this._down=null,t.addEventListener("pointerdown",o=>{this.sfx.unlock(),this._down={x:o.clientX,y:o.clientY,t:performance.now()}}),t.addEventListener("pointerup",o=>{let h=this._down;if(this._down=null,!h||Math.hypot(o.clientX-h.x,o.clientY-h.y)>24)return;let n=this.groundAt(o.clientX,o.clientY);n&&this.game.tap(n.x,n.z)}),this._onResize=()=>this.resize(),window.addEventListener("resize",this._onResize),this._onVis=()=>{this.visible=document.visibilityState==="visible",this.visible&&this.running&&(this.gov.reset(),this._prev=0,this._loop())},document.addEventListener("visibilitychange",this._onVis),this.loadLevel(0,!1),this.resize();try{await this.renderer.compileAsync(this.scene,this.camera)}catch{this.renderer.compile(this.scene,this.camera)}this.director.update(1/60,this.game.front,this.game.frontYaw),this.render()}loadLevel(t,e){let{level:s,roads:i}=this.game.setup(t);if(this.city){this.scene.remove(this.city.group);for(let a of this.city.casters)this.shadow.scene.remove(a)}(!this.city||this._cityId!==s.id)&&(this.city=Zt(this.G,this.tier,s,i),this._cityId=s.id),this.scene.add(this.city.group);for(let a of this.city.casters)this.shadow.add(a);Mt(this.G,rt[s.env]||rt.ogle),e?(this.ui.title(!1),this.game.ready()):(this.director.mode="orbit",this.ui.title(!0))}groundAt(t,e){let s=this.canvas.getBoundingClientRect();return this._ndc.set((t-s.left)/s.width*2-1,-((e-s.top)/s.height)*2+1),this._ray.setFromCamera(this._ndc,this.camera),this._ray.ray.intersectPlane(this._plane,this._hit)}resize(){let t=Math.max(1,this.container.clientWidth||window.innerWidth),e=Math.max(1,this.container.clientHeight||window.innerHeight),s=this.gov.pixelRatio(t,e);this.renderer.setPixelRatio(s),this.renderer.setSize(t,e,!1),this.camera.aspect=t/e,this.camera.fov=t<e?50:40,this.camera.updateProjectionMatrix(),this.director.setAspect(t/e),this.G.uRes.value.x=Math.round(t*s),this.G.uRes.value.y=Math.round(e*s)}start(){this.running||(this.running=!0,this._prev=0,this._loop())}stop(){this.running=!1,cancelAnimationFrame(this._raf)}_loop(){cancelAnimationFrame(this._raf);let t=e=>{if(!this.running||!this.visible)return;this._raf=requestAnimationFrame(t);let s=this._prevRaf?e-this._prevRaf:16.7;if(this._prevRaf=e,this.gov.menu=this.game.state==="title"||this.director.mode==="orbit",!this.gov.tick(e,s))return;let i=this._prev?Math.min(.05,(e-this._prev)/1e3):1/60;this._prev=e,this.frame(i)};this._prevRaf=0,this._raf=requestAnimationFrame(t)}frame(t,e=!0){this.time+=t,this.G.uTime.value=this.time,this.game.update(t),this.puffs.update(t),this.director.update(t,this.game.front,this.game.frontYaw),e&&this.render()}render(){let t=this.renderer,e=this.director.look;this.shadow.place(e,this.G.uSunDir.value),this.shadow.render(t),t.setRenderTarget(null),t.clear(),t.render(this.scene,this.camera)}stats(){var e;let t=this.renderer.info;return{calls:t.render.calls,tris:t.render.triangles,programs:((e=t.programs)==null?void 0:e.length)??0,tier:this.tier.id,dominoes:this.dominoes.n,toppled:this.dominoes.toppled}}debugRun({level:t=0,seconds:e=3,fill:s="perfect",fps:i=60,camera:a=null}={}){this.ui.title(!1),this.loadLevel(t,!0);let o=1/i,h=0;for(this.game.start();h<e;){if(s!=="none")for(let n of this.game.slots)n.state==="empty"&&n.eta<(s==="perfect"?.5:2.5)&&this.game._fill(n);this.frame(o,!1),h+=o}return a&&(this.director.mode="free",this.camera.position.set(...a.pos),this.camera.lookAt(new F.Vector3(...a.look)),this.camera.updateMatrixWorld(),this.director.look.set(...a.look)),this.render(),{state:this.game.state,toppled:this.dominoes.toppled,total:this.game.total,active:this.dominoes.nActive,slots:this.game.slots.map(n=>n.state).join(",")}}debugCam(t,e){return this.director.mode="free",this.camera.position.set(...t),this.camera.lookAt(new F.Vector3(...e)),this.camera.updateMatrixWorld(),this.director.look.set(...e),this.render(),!0}destroy(){this.stop(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVis),this.shadow.dispose(),this.renderer.dispose()}};function ee(r,t="domino.v1"){if(r&&typeof r.get=="function"&&typeof r.set=="function")return r;let e={};try{e=JSON.parse(localStorage.getItem(t)||"{}")||{}}catch{e={}}return{get:s=>e[s],set:(s,i)=>{e[s]=i;try{localStorage.setItem(t,JSON.stringify(e))}catch{}}}}async function ks(r={}){let t=ee(r.store),e=document.createElement("div");e.className="dm-root",e.style.cssText="position:fixed;inset:0;z-index:50;overflow:hidden;background:#7fc6ef;touch-action:none;",(r.container||document.body).appendChild(e);let s=new bt({container:e,store:t,hooks:r.hooks||{},quality:r.quality||"auto",power:r.power||"auto"});return await s.init(),{app:s,open(){e.style.display="",s.start()},close(){s.stop(),e.style.display="none"},destroy(){s.destroy(),e.remove()}}}export{ks as createDomino};
