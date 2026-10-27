import*as m from"three";import*as V from"three";var ie=Math.PI*2,F=(n,t,e)=>n<t?t:n>e?e:n;function W(n){let t=n>>>0,e=()=>{t=t+1831565813>>>0;let i=t;return i=Math.imul(i^i>>>15,i|1),i^=i+Math.imul(i^i>>>7,i|61),((i^i>>>14)>>>0)/4294967296};return e.range=(i,s)=>i+(s-i)*e(),e.pick=i=>i[e()*i.length|0],e.sign=()=>e()<.5?-1:1,e}var it=[{id:0,name:"D\xFC\u015F\xFCk",maxPixels:115e4,maxDpr:2,minScale:.7,simW:64,dyeW:384,iters:12,vorticity:0,sparkles:60,bgSamples:2},{id:1,name:"Orta",maxPixels:19e5,maxDpr:2.4,minScale:.7,simW:80,dyeW:512,iters:16,vorticity:1,sparkles:120,bgSamples:4},{id:2,name:"Y\xFCksek",maxPixels:3e6,maxDpr:3,minScale:.7,simW:96,dyeW:640,iters:20,vorticity:1,sparkles:200,bgSamples:4}];function ct(n){let t="";try{let r=n.getExtension("WEBGL_debug_renderer_info");t=String(n.getParameter(r?r.UNMASKED_RENDERER_WEBGL:n.RENDERER)||"")}catch{t=""}let e=t.toLowerCase(),i=matchMedia("(pointer: coarse)").matches||/android|iphone|ipad/i.test(navigator.userAgent),s=i?0:1;/swiftshader|llvmpipe|software|microsoft basic/.test(e)||/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(e)?s=0:/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(e)?s=1:/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(e)||/apple/.test(e)||!i&&/nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(e)?s=2:!i&&/intel/.test(e)&&(s=1);let o=navigator.deviceMemory||0;return o&&o<=2?s=0:o&&o<=4&&(s=Math.min(s,1)),{tier:s,gpu:t,mobile:i}}var B=class{constructor({tier:t,gpu:e,store:i,power:s="auto"}){this.T=it[t],this.gpu=e,this.store=i,this.power=s,this.battery={saver:!1,level:1,charging:!0};let o=i.get("perf")||{},r=o.gpu===e;this.scale=r?F(o.scale??1,this.T.minScale,1):1,this.cap=r&&o.cap===30?30:60,this.ceil=r?o.ceil??1:1,this.half=r?!!o.half:t===0,this.vsync=16.67,this._deltas=new Float32Array(24),this._di=0,this._count=0,this._frame=0,this._lastRender=0,this._ema=0,this._slow=0,this._good=0,this._cool=0,this._probe=null,this._ups=0,this._dirty=!1,this.onScale=null,this.menu=!1,this._watchBattery()}get targetFps(){return this.menu||this.power==="saver"||this.power==="auto"&&this.battery.saver?30:this.cap}get maxScale(){return this.power==="saver"||this.power==="auto"&&this.battery.saver?Math.min(this.ceil,.8):this.ceil}get effScale(){return Math.min(this.scale,this.maxScale)}tick(t,e){e>4&&e<40&&(this._deltas[this._di]=e,this._di=(this._di+1)%this._deltas.length,this._count++,this._count%24===0&&(this.vsync=Rt(this._deltas)));let i=1e3/this.targetFps,s=this._divisor(i);if(this._frame++,this._frame<s)return!1;this._frame=0;let o=this._lastRender?t-this._lastRender:i;return this._lastRender=t,this._adapt(t,o,s*this.vsync),!0}_divisor(t){let e=t/this.vsync;return Math.max(1,this.half?Math.ceil(e-.05):Math.round(e-.15))}reset(){this._lastRender=0,this._frame=0,this._slow=0,this._good=0}_adapt(t,e,i){if(e>i*4)return;this._ema=this._ema?this._ema+(e-this._ema)*.08:e;let s=e/1e3;if(t<this._cool)return;let o=this._ema>i*1.22;if(o?(this._slow+=s,this._good=0):(this._slow=Math.max(0,this._slow-s*.5),this._good+=s),this._probe&&o&&this._slow>1.2){this.ceil=this._probe.from,this._setScale(this._probe.from),this._probe=null,this._cool=t+4e3,this._slow=0,this._dirty=!0;return}if(this._probe&&t-this._probe.t>6e3&&(this._probe=null,this._dirty=!0),this._slow>1.6){this._slow=0,this._cool=t+2200;let r=this.effScale;r>.81?this._setScale(Math.max(.8,r-.1)):!this.half&&this.vsync<14?this.half=!0:r>this.T.minScale+.01?this._setScale(Math.max(this.T.minScale,r-.1)):this.cap===60&&(this.cap=30),this._dirty=!0}else this._good>9&&this._ups<3&&(this._good=0,this.cap===30&&this.power!=="saver"&&!this.battery.saver&&this.effScale>=.8?(this.cap=60,this._ups++,this._cool=t+3e3):this.scale<this.maxScale-.01&&(this._probe={from:this.scale,t},this._setScale(Math.min(this.maxScale,this.scale+.08)),this._ups++,this._cool=t+2500));this._dirty&&t>this._cool&&this.save()}_setScale(t){this.scale=Math.round(t*100)/100,this.onScale&&this.onScale()}save(){this._dirty=!1,this.store.set("perf",{gpu:this.gpu,scale:this.scale,cap:this.cap,ceil:this.ceil,half:this.half})}_watchBattery(){navigator.getBattery&&navigator.getBattery().then(t=>{let e=()=>{this.battery.level=t.level,this.battery.charging=t.charging;let i=this.battery.saver;this.battery.saver=!t.charging&&(i?t.level<=.25:t.level<=.2),i!==this.battery.saver&&this.onBattery&&this.onBattery(this.battery.saver)};e(),t.addEventListener("levelchange",e),t.addEventListener("chargingchange",e)}).catch(()=>{})}pixelRatio(t,e){let i=Math.min(window.devicePixelRatio||1,this.T.maxDpr);return t*e*i*i>this.T.maxPixels&&(i=Math.sqrt(this.T.maxPixels/(t*e))),Math.max(.75,i*this.effScale)}};function Rt(n){let t=Array.from(n).filter(e=>e>0).sort((e,i)=>e-i);return t.length?t[t.length>>1]:16.67}function ut(n,t){let e={tier:0,gpu:"",mobile:!0};try{let d=document.createElement("canvas").getContext("webgl2");if(d){e=ct(d);let f=d.getExtension("WEBGL_lose_context");f&&f.loseContext()}}catch{}t!=null&&t>=0&&t<=2&&(e.tier=t);let i=/swiftshader|llvmpipe/i.test(e.gpu),s=new V.WebGLRenderer({canvas:n,antialias:!i,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1});s.outputColorSpace=V.LinearSRGBColorSpace,s.toneMapping=V.NoToneMapping,s.setClearColor(920852,1),s.sortObjects=!0,s.shadowMap.enabled=!1;let r=!!(s.getContext().getContextAttributes()||{}).antialias,a=s.capabilities.getMaxAnisotropy(),h=it[e.tier],p=Math.min(a,h.id>=1?8:4);return{renderer:s,tier:h,gpu:e.gpu,mobile:e.mobile,msaa:r,aniso:p}}import*as u from"three";var _t=`
in vec3 position;
out vec2 vUv;
void main() {
	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`,w=`
precision highp float;
precision highp sampler2D;
in vec2 vUv;
`,k=`layout(location = 0) out vec4 o0;
`,q=`layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
`,kt=w+k+`
uniform sampler2D uVel;
uniform vec2 uSize, uA, uB, uV;
uniform float uR, uK;
void main() {
	vec2 p = vUv * uSize;
	vec2 ab = uB - uA;
	float t = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
	vec2 d = p - (uA + ab * t);
	float g = exp(-dot(d, d) / (uR * uR)) * uK;
	vec2 v = texture(uVel, vUv).xy;
	o0 = vec4(mix(v, uV, g), 0.0, 1.0);
}`,Mt=w+k+`
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
	float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
	float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
	float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
	o0 = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,St=w+k+`
uniform sampler2D uVel, uCurl;
uniform vec2 uTexel;
uniform float uK, uDt;
void main() {
	float L = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
	float C = texture(uCurl, vUv).x;
	vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
	f /= length(f) + 1e-4;
	f *= uK * C;
	f.y *= -1.0;
	vec2 v = texture(uVel, vUv).xy + f * uDt;
	o0 = vec4(clamp(v, -4.0, 4.0), 0.0, 1.0);
}`,Ht=w+k+`
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
	vec2 C = texture(uVel, vUv).xy;
	float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
	float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
	if (vUv.x - uTexel.x < 0.0) L = -C.x;
	if (vUv.x + uTexel.x > 1.0) R = -C.x;
	if (vUv.y - uTexel.y < 0.0) B = -C.y;
	if (vUv.y + uTexel.y > 1.0) T = -C.y;
	o0 = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,Ct=w+k+`
uniform sampler2D uP, uDiv;
uniform vec2 uTexel;
uniform float uDecay;
void main() {
	float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
	float d = texture(uDiv, vUv).x;
	o0 = vec4((L + R + B + T) * 0.25 * uDecay - d * 0.25, 0.0, 0.0, 1.0);
}`,Lt=w+k+`
uniform sampler2D uP, uVel;
uniform vec2 uTexel;
void main() {
	float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
	float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
	float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
	float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
	vec2 v = texture(uVel, vUv).xy - 0.5 * vec2(R - L, T - B);
	// duvara dik bile\u015Fen s\u0131f\u0131r, kenara te\u011Fet ak\u0131\u015F serbest
	vec2 e = step(uTexel * 0.75, vUv) * step(vUv, 1.0 - uTexel * 0.75);
	v *= vec2(e.x, e.y);
	o0 = vec4(v, 0.0, 1.0);
}`,Vt=w+k+`
uniform sampler2D uVel;
uniform vec2 uInvSize;
uniform float uDt, uDiss;
void main() {
	vec2 v = texture(uVel, vUv).xy;
	vec2 q = vUv - uDt * v * uInvSize;
	o0 = vec4(texture(uVel, q).xy * uDiss, 0.0, 1.0);
}`,Dt=w+q+`
uniform sampler2D uVel, uD0, uD1;
uniform vec2 uInvSize;
uniform float uDt, uSharp;
vec4 sharpen(vec4 c) { return c + uSharp * c * (1.0 - c) * (2.0 * c - 1.0); }
void main() {
	vec2 v1 = texture(uVel, vUv).xy;
	vec2 v2 = texture(uVel, vUv - 0.5 * uDt * v1 * uInvSize).xy;
	vec2 q = clamp(vUv - uDt * v2 * uInvSize, vec2(0.0), vec2(1.0));
	vec4 a = sharpen(texture(uD0, q));
	vec4 b = sharpen(texture(uD1, q));
	a = clamp(a, 0.0, 1.0);
	b = clamp(b, 0.0, 1.0);
	float s = dot(a, vec4(1.0)) + dot(b, vec4(1.0));
	if (s > 1.0) { a /= s; b /= s; }
	o0 = a;
	o1 = b;
}`,Pt=w+q+`
uniform sampler2D uD0, uD1;
uniform vec2 uSize, uC;
uniform float uR0, uR1;
uniform vec4 uC0, uC1;
void main() {
	vec2 p = vUv * uSize;
	vec2 d = p - uC;
	float d2 = dot(d, d);
	float r1s = uR1 * uR1;
	if (d2 <= r1s) {
		o0 = uC0;
		o1 = uC1;
		return;
	}
	float k = sqrt(max(1.0 - (r1s - uR0 * uR0) / d2, 0.0));
	vec2 q = (uC + d * k) / uSize;
	o0 = texture(uD0, q);
	o1 = texture(uD1, q);
}`,zt=w+q+`
uniform sampler2D uD0, uD1;
uniform vec2 uSize, uO, uDir;
uniform float uZ, uL, uSpace;
void main() {
	vec2 p = vUv * uSize;
	vec2 n = vec2(-uDir.y, uDir.x);
	float s = dot(p - uO, n);
	float d = uSpace > 0.0 ? abs(s - uSpace * floor(s / uSpace + 0.5)) : abs(s);
	vec2 q = (p - uDir * uZ * uL / (d + uL)) / uSize;
	o0 = texture(uD0, q);
	o1 = texture(uD1, q);
}`,Ut=w+q+`
void main() { o0 = vec4(0.0); o1 = vec4(0.0); }`,At=w+k+`
uniform vec4 uV;
void main() { o0 = uV; }`,Gt=w+k+`
uniform sampler2D uVel, uD0, uD1;
uniform vec2 uSize;
uniform vec3 uP[32];
uniform float uVMax;
vec2 enc(float x) {
	float v = clamp(x / uVMax * 0.5 + 0.5, 0.0, 1.0) * 255.0;
	float hi = floor(v);
	return vec2(hi / 255.0, fract(v));
}
void main() {
	int i = int(gl_FragCoord.x);
	vec3 P = uP[i];
	vec2 uv = P.xy / uSize;
	if (gl_FragCoord.y < 1.0) {
		vec2 v = texture(uVel, uv).xy;
		o0 = vec4(enc(v.x), enc(v.y));
		return;
	}
	vec2 o = vec2(P.z) / uSize;
	vec2 offs[5] = vec2[5](vec2(0.0), vec2(o.x, 0.0), vec2(-o.x, 0.0), vec2(0.0, o.y), vec2(0.0, -o.y));
	float ink = 0.0, inkMax = 0.0, gold = 0.0, paint = 0.0;
	for (int k = 0; k < 5; k++) {
		vec4 a = texture(uD0, uv + offs[k]);
		vec4 b = texture(uD1, uv + offs[k]);
		ink += b.b;
		inkMax = max(inkMax, b.b);
		gold += b.a;
		paint += dot(a, vec4(1.0)) + b.r + b.g;
	}
	o0 = vec4(ink / 5.0, inkMax, gold / 5.0, paint / 5.0);
}`,Ft=(()=>{let n=new u.BufferGeometry;return n.setAttribute("position",new u.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),n})();function U(n,t,e,i=1,s=u.LinearFilter){let o=new u.WebGLRenderTarget(n,t,{type:e,format:u.RGBAFormat,minFilter:s,magFilter:s,wrapS:u.ClampToEdgeWrapping,wrapT:u.ClampToEdgeWrapping,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,count:i});for(let r of o.textures)r.colorSpace=u.NoColorSpace;return o}var A=class{constructor(t,e,i,s=1){this.a=U(t,e,i,s),this.b=U(t,e,i,s)}get read(){return this.a}get write(){return this.b}swap(){let t=this.a;this.a=this.b,this.b=t}dispose(){this.a.dispose(),this.b.dispose()}},T=32,z=3,I=class{constructor(t,e){this.r=t,this.W=1,this.H=e.aspect,this.size=new u.Vector2(1,e.aspect),this.simW=e.simW,this.simH=Math.round(e.simW*e.aspect),this.dyeW=e.dyeW,this.dyeH=Math.round(e.dyeW*e.aspect),this.iters=e.iters,this.vorticity=e.vorticity?6:0,this.viscosity=1.7,this.sharp=.22;let i=u.HalfFloatType;this.vel=new A(this.simW,this.simH,i),this.prs=new A(this.simW,this.simH,i),this.div=U(this.simW,this.simH,i,1,u.NearestFilter),this.curl=U(this.simW,this.simH,i,1,u.NearestFilter),this.dye=new A(this.dyeW,this.dyeH,u.UnsignedByteType,2),this.probeRT=U(T,2,u.UnsignedByteType,1,u.NearestFilter);let s=new u.Vector2(1/this.simW,1/this.simH),o=new u.Vector2(1,1/e.aspect),r=(h,p)=>new u.RawShaderMaterial({vertexShader:_t,fragmentShader:h,uniforms:p,glslVersion:u.GLSL3,depthTest:!1,depthWrite:!1}),a=h=>({value:h});this.m={splat:r(kt,{uVel:a(null),uSize:a(this.size),uA:a(new u.Vector2),uB:a(new u.Vector2),uV:a(new u.Vector2),uR:a(.05),uK:a(.8)}),curl:r(Mt,{uVel:a(null),uTexel:a(s)}),vort:r(St,{uVel:a(null),uCurl:a(null),uTexel:a(s),uK:a(0),uDt:a(0)}),div:r(Ht,{uVel:a(null),uTexel:a(s)}),jacobi:r(Ct,{uP:a(null),uDiv:a(null),uTexel:a(s),uDecay:a(1)}),grad:r(Lt,{uP:a(null),uVel:a(null),uTexel:a(s)}),advVel:r(Vt,{uVel:a(null),uInvSize:a(o),uDt:a(0),uDiss:a(1)}),advDye:r(Dt,{uVel:a(null),uD0:a(null),uD1:a(null),uInvSize:a(o),uDt:a(0),uSharp:a(0)}),drop:r(Pt,{uD0:a(null),uD1:a(null),uSize:a(this.size),uC:a(new u.Vector2),uR0:a(0),uR1:a(0),uC0:a(new u.Vector4),uC1:a(new u.Vector4)}),comb:r(zt,{uD0:a(null),uD1:a(null),uSize:a(this.size),uO:a(new u.Vector2),uDir:a(new u.Vector2(1,0)),uZ:a(0),uL:a(.02),uSpace:a(0)}),clear:r(Ut,{}),fill:r(At,{uV:a(new u.Vector4)}),probe:r(Gt,{uVel:a(null),uD0:a(null),uD1:a(null),uSize:a(this.size),uP:a(Array.from({length:T},()=>new u.Vector3)),uVMax:a(z)})},this.scene=new u.Scene,this.cam=new u.OrthographicCamera(-1,1,1,-1,0,1),this.quad=new u.Mesh(Ft,this.m.clear),this.quad.frustumCulled=!1,this.scene.add(this.quad),this.strokes=[],this.drops=[],this.frameDrops=[],this.frameCombs=[],this.energy=0,this.awake=!1,this.time=0,this.probeN=0,this.probePts=this.m.probe.uniforms.uP.value,this._probeBuf=new Uint8Array(T*2*4),this._probeBusy=!1,this.sample={vx:new Float32Array(T),vy:new Float32Array(T),ink:new Float32Array(T),inkMax:new Float32Array(T),gold:new Float32Array(T),paint:new Float32Array(T),stamp:0},this.reset()}_pass(t,e){this.quad.material=t,this.r.setRenderTarget(e),this.r.render(this.scene,this.cam)}reset(){this.m.fill.uniforms.uV.value.set(0,0,0,1);for(let t of[this.vel.a,this.vel.b,this.prs.a,this.prs.b])this._pass(this.m.fill,t);if(this._pass(this.m.clear,this.dye.a),this._pass(this.m.clear,this.dye.b),this.strokes.length=0,this.drops.length=0,this.energy=0,this.awake=!1,this.gen=(this.gen||0)+1,this.sample)for(let t of["vx","vy","ink","inkMax","gold","paint"])this.sample[t].fill(0);this.r.setRenderTarget(null)}stroke(t,e,i,s,o,r,a=.06,h=.85){let p=Math.hypot(o,r);p>z*.95&&(o*=z*.95/p,r*=z*.95/p),this.strokes.push({ax:t,ay:e,bx:i,by:s,vx:o,vy:r,radius:a,k:h}),this.energy+=Math.min(4,(o*o+r*r)*4+.05),this.awake=!0}drop(t,e,i,s,o=.5){let r={x:t,y:e,R:i,pigment:s,t:0,dur:o,r:0};return o<=0?this._applyDrop(r,i):this.drops.push(r),r}comb(t,e,i,s,o,r=.02,a=0){let h=Math.hypot(i,s)||1,p=this.m.comb.uniforms;p.uO.value.set(t,e),p.uDir.value.set(i/h,s/h),p.uZ.value=o,p.uL.value=r,p.uSpace.value=a,p.uD0.value=this.dye.read.textures[0],p.uD1.value=this.dye.read.textures[1],this._pass(this.m.comb,this.dye.write),this.dye.swap(),this.frameCombs.push({ox:t,oy:e,dx:i/h,dy:s/h,z:o,lambda:r,space:a}),this.r.setRenderTarget(null)}_applyDrop(t,e){let i=this.m.drop.uniforms,s=t.r;i.uC.value.set(t.x,t.y),i.uR0.value=s,i.uR1.value=e;let o=t.pigment;i.uC0.value.set(o===0?1:0,o===1?1:0,o===2?1:0,o===3?1:0),i.uC1.value.set(o===4?1:0,o===5?1:0,o===6?1:0,o===7?1:0),i.uD0.value=this.dye.read.textures[0],i.uD1.value=this.dye.read.textures[1],this._pass(this.m.drop,this.dye.write),this.dye.swap(),this.frameDrops.push({x:t.x,y:t.y,dA:e*e-s*s,r:e}),t.r=e}displace(t,e,i){for(let s of this.frameDrops){let o=t-s.x,r=e-s.y,a=o*o+r*r;if(a<1e-10){t=s.x+s.r;continue}let h=Math.sqrt(1+s.dA/a);t=s.x+o*h,e=s.y+r*h}for(let s of this.frameCombs){let o=(t-s.ox)*-s.dy+(e-s.oy)*s.dx,r=s.space>0?Math.abs(o-s.space*Math.floor(o/s.space+.5)):Math.abs(o),a=s.z*s.lambda/(r+s.lambda);t+=s.dx*a,e+=s.dy*a}return i.x=t,i.y=e,i}probe(t){let e=Math.min(T,t.length);for(let i=0;i<e;i++)this.probePts[i].set(t[i].x,t[i].y,t[i].r||.02);this.probeN=e}_runProbe(){if(this._probeBusy||!this.probeN)return;let t=this.m.probe.uniforms;t.uVel.value=this.vel.read.texture,t.uD0.value=this.dye.read.textures[0],t.uD1.value=this.dye.read.textures[1],this._pass(this.m.probe,this.probeRT),this._probeBusy=!0;let e=this.probeN,i=this.time,s=this.awake,o=this.gen;this._probeP=this.r.readRenderTargetPixelsAsync(this.probeRT,0,0,T,2,this._probeBuf).then(r=>{if(o!==this.gen)return;let a=this.sample,h=(p,d)=>((p+d/255)/255*2-1)*z;for(let p=0;p<e;p++){let d=p*4;a.vx[p]=s?h(r[d],r[d+1]):0,a.vy[p]=s?h(r[d+2],r[d+3]):0;let f=(T+p)*4;a.ink[p]=r[f]/255,a.inkMax[p]=r[f+1]/255,a.gold[p]=r[f+2]/255,a.paint[p]=r[f+3]/255}a.stamp=i}).catch(()=>{}).finally(()=>{this._probeBusy=!1})}step(t){t=Math.min(t,1/24),this.time+=t,this.frameDrops.length=0,this.frameCombs.length=0;let e=this.m;for(let i=this.drops.length-1;i>=0;i--){let s=this.drops[i];s.t+=t;let o=s.dur/5,r=s.t>=s.dur,a=r?s.R:s.R*Math.sqrt(1-Math.exp(-s.t/o));a>s.r+1e-5&&this._applyDrop(s,a),r&&this.drops.splice(i,1)}if(this.awake){for(let a of this.strokes){let h=e.splat.uniforms;h.uVel.value=this.vel.read.texture,h.uA.value.set(a.ax,a.ay),h.uB.value.set(a.bx,a.by),h.uV.value.set(a.vx,a.vy),h.uR.value=a.radius,h.uK.value=a.k,this._pass(e.splat,this.vel.write),this.vel.swap()}if(this.strokes.length=0,this.vorticity>0){e.curl.uniforms.uVel.value=this.vel.read.texture,this._pass(e.curl,this.curl);let a=e.vort.uniforms;a.uVel.value=this.vel.read.texture,a.uCurl.value=this.curl.texture,a.uK.value=this.vorticity,a.uDt.value=t,this._pass(e.vort,this.vel.write),this.vel.swap()}e.div.uniforms.uVel.value=this.vel.read.texture,this._pass(e.div,this.div);let i=e.jacobi.uniforms;i.uDiv.value=this.div.texture;for(let a=0;a<this.iters;a++)i.uP.value=this.prs.read.texture,i.uDecay.value=a===0?.8:1,this._pass(e.jacobi,this.prs.write),this.prs.swap();let s=e.grad.uniforms;s.uP.value=this.prs.read.texture,s.uVel.value=this.vel.read.texture,this._pass(e.grad,this.vel.write),this.vel.swap();let o=e.advVel.uniforms;o.uVel.value=this.vel.read.texture,o.uDt.value=t,o.uDiss.value=Math.exp(-this.viscosity*t),this._pass(e.advVel,this.vel.write),this.vel.swap();let r=e.advDye.uniforms;r.uVel.value=this.vel.read.texture,r.uD0.value=this.dye.read.textures[0],r.uD1.value=this.dye.read.textures[1],r.uDt.value=t,r.uSharp.value=this.sharp,this._pass(e.advDye,this.dye.write),this.dye.swap(),this.energy*=Math.exp(-2*this.viscosity*t),this.energy<.004&&(e.fill.uniforms.uV.value.set(0,0,0,1),this._pass(e.fill,this.vel.read),this.awake=!1)}this._runProbe(),this.r.setRenderTarget(null)}get busy(){return this.awake||this.drops.length>0}dispose(){this.vel.dispose(),this.prs.dispose(),this.div.dispose(),this.curl.dispose(),this.dye.dispose(),this.probeRT.dispose();for(let t in this.m)this.m[t].dispose()}};import*as b from"three";var Wt=`
varying vec2 vUv;
varying vec3 vW;
void main() {
	vUv = uv;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,Bt=`
precision highp float;
uniform sampler2D uD0, uD1, uVel;
uniform vec3 uPal[8];
uniform float uThick[8];
uniform vec3 uBase;
uniform vec3 uVeinCol;
uniform float uVein, uVeinW, uGhost;
uniform vec2 uDyeRes;
uniform vec2 uRes;
uniform float uPxPerUnit;
uniform float uTime;
uniform vec3 uLampDir;   // ekran uzay\u0131nda \u0131\u015F\u0131k y\xF6n\xFC (sol \xFCst)
uniform vec3 uLampCol;
uniform vec4 uGlow;      // xy: tekne uv'si, z: \u015Fiddet, w: yar\u0131\xE7ap (tekne birimi)
uniform vec3 uGlowCol;
uniform float uAspect;
varying vec2 vUv;
varying vec3 vW;

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

void main() {
	vec4 a = texture2D(uD0, vUv);
	vec4 b = texture2D(uD1, vUv);
	float P[8];
	P[0] = a.r; P[1] = a.g; P[2] = a.b; P[3] = a.a;
	P[4] = b.r; P[5] = b.g; P[6] = b.b; P[7] = b.a;

	vec3 col = uBase;
	// zeminin kendi dokusu: kitreli suyun hafif bulutlanmas\u0131
	float zn = vnoise(vUv * vec2(9.0, 9.0 * uAspect)) * 0.6 + vnoise(vUv * vec2(31.0, 31.0 * uAspect)) * 0.4;
	col *= 0.965 + 0.06 * zn;

	float h = 0.0;
	float vein = 0.0;
	float inkCov = 0.0, inkSd = 0.0;
	float goldCov = 0.0;
	for (int i = 0; i < 8; i++) {
		float c = P[i];
		float gl = length(vec2(dFdx(c), dFdy(c))) + 1e-4;
		float sd = (c - 0.5) / gl; // i\u015Faretli uzakl\u0131k, ekran pikseli (i\xE7eride pozitif)
		float cov = clamp(sd + 0.5, 0.0, 1.0);
		// e\u015Fi\u011Fin alt\u0131ndaki ince iplikler: soluk bir iz olarak kal\u0131r
		float ghost = smoothstep(0.1, 0.5, c) * (1.0 - cov) * uGhost;
		col = mix(col, uPal[i], max(cov, ghost));
		// damar: renklerin birle\u015Fti\u011Fi yerde ince a\xE7\u0131k \xE7izgi
		float vw = uVeinW * uPxPerUnit;
		vein = max(vein, (1.0 - smoothstep(vw * 0.5 - 0.6, vw * 0.5 + 0.6, abs(sd))) * step(0.02, c));
		h += smoothstep(0.25, 0.75, c) * uThick[i];
		if (i == 6) { inkCov = cov; inkSd = sd; }
		if (i == 7) goldCov = cov;
	}
	col = mix(col, uVeinCol, vein * uVein);

	// kabartma: boya filmi sudan biraz y\xFCksektir, \u0131\u015F\u0131\u011Fa bakan kenar parlar
	vec2 gh = vec2(dFdx(h), dFdy(h));
	vec2 slope = -gh * 1.6;
	float lit = dot(slope, normalize(uLampDir.xy));
	col *= 1.0 + clamp(lit, -0.35, 0.5) * 0.55;

	// suyun h\u0131z\u0131ndan k\u0131r\u0131\u015F\u0131k ve par\u0131lt\u0131
	vec2 vel = texture2D(uVel, vUv).xy;
	float sp = length(vel);
	vec2 rp = vUv * vec2(70.0, 70.0 * uAspect) - vel * uTime * 0.0;
	float rn = vnoise(rp + uTime * 1.7) - vnoise(rp * 1.7 - uTime * 2.3);
	float ripple = rn * smoothstep(0.02, 0.6, sp);

	// \u0131slak par\u0131lt\u0131: pencerenin geni\u015F yans\u0131mas\u0131 + kenar ve k\u0131r\u0131\u015F\u0131k p\u0131r\u0131lt\u0131lar\u0131
	vec2 sc = gl_FragCoord.xy / uRes;
	float sheen = smoothstep(1.25, 0.1, length((sc - vec2(0.18, 0.92)) * vec2(1.0, 0.75)));
	float glint = pow(clamp(lit * 1.4 + ripple * 0.9, 0.0, 1.0), 3.0);
	col += uLampCol * (sheen * 0.07 + glint * 0.35);

	// alt\u0131n varak: metal ve p\u0131r\u0131lt\u0131
	if (goldCov > 0.0) {
		vec2 cell = floor(vUv * uDyeRes * 1.5);
		float hs = hash12(cell);
		float tw = pow(max(0.0, sin(uTime * (2.0 + hs * 3.0) + hs * 40.0)), 12.0) * step(0.86, hs);
		vec3 gold = uPal[7] * (0.78 + 0.5 * vnoise(vUv * 160.0) + lit * 0.9) + vec3(1.0, 0.92, 0.7) * tw * 1.2;
		col = mix(col, gold, goldCov);
	}

	// kara m\xFCrekkep: derin, kenar\u0131nda ya\u011F h\xE2resi
	if (inkCov > 0.0) {
		float rim = (1.0 - smoothstep(0.0, 7.0, inkSd)) * inkCov;
		vec3 film = 0.5 + 0.5 * cos(6.2831 * (inkSd * 0.06 + uTime * 0.05 + vec3(0.0, 0.33, 0.67)));
		col = mix(col, col + film * 0.22, rim * 0.8);
		col += uLampCol * glint * 0.25 * inkCov;
	}

	// kandilin s\u0131cak \u0131\u015F\u0131\u011F\u0131 ve sudaki yans\u0131mas\u0131
	vec2 dg = (vUv - uGlow.xy) * vec2(1.0, uAspect);
	float g1 = exp(-dot(dg, dg) / (uGlow.w * uGlow.w));
	vec2 dr = dg - vec2(0.0, -uGlow.w * 0.55);
	float g2 = exp(-(dr.x * dr.x * 18.0 + dr.y * dr.y * 4.0) / (uGlow.w * uGlow.w)) * (0.7 + 0.3 * rn);
	col += uGlowCol * uGlow.z * (g1 * 0.32 + g2 * 0.22);
	col *= 1.0 + uGlow.z * g1 * 0.18;

	// ekran k\xF6\u015Feleri: hafif kararma
	vec2 vq = sc - 0.5;
	col *= 1.0 - dot(vq, vq) * 0.42;
	// hafif renk e\u011Frisi (sinema tonu) ve titre\u015Fim (bantla\u015Fma olmas\u0131n)
	col = clamp(col, 0.0, 1.4);
	col = col / (1.0 + max(col - 1.0, 0.0));
	col += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
	gl_FragColor = vec4(col, 1.0);
}`,$=n=>new b.Color().setHex(n,b.LinearSRGBColorSpace);function pt(n,t){let e=s=>({value:s}),i=new b.ShaderMaterial({vertexShader:Wt,fragmentShader:Bt,uniforms:{uD0:e(n.dye.read.textures[0]),uD1:e(n.dye.read.textures[1]),uVel:e(n.vel.read.texture),uPal:e(Array.from({length:8},()=>new b.Color)),uThick:e([1,1,1,1,1,1,1.6,1.2]),uBase:e($(15853263)),uVeinCol:e($(16775402)),uVein:e(.85),uVeinW:e(.0035),uGhost:e(.4),uDyeRes:e(new b.Vector2(n.dyeW,n.dyeH)),uRes:t.uRes,uPxPerUnit:t.uPxPerUnit,uTime:t.uTime,uLampDir:e(new b.Vector3(-.55,.75,.6)),uLampCol:e($(16773590)),uGlow:e(new b.Vector4(.5,.2,0,.12)),uGlowCol:e($(16757596)),uAspect:e(n.H)},depthWrite:!0});return i.onBeforeRender=()=>{i.uniforms.uD0.value=n.dye.read.textures[0],i.uniforms.uD1.value=n.dye.read.textures[1],i.uniforms.uVel.value=n.vel.read.texture},i}function vt(n,{pal:t,base:e,vein:i=.85,veinCol:s=16775402,ghost:o=.4}){let r=n.uniforms;for(let a=0;a<8;a++)r.uPal.value[a].setHex(t[a],b.LinearSRGBColorSpace);r.uBase.value.setHex(e,b.LinearSRGBColorSpace),r.uVein.value=i,r.uVeinCol.value.setHex(s,b.LinearSRGBColorSpace),r.uGhost.value=o}import*as l from"three";var O={lamp:new l.Vector3(-1.1,1.5,-.9),lampCol:new l.Color(1,.86,.66),sky:new l.Color(.42,.46,.62),amb:new l.Color(.2,.17,.16)},It=`
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	vUv = uv;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`,at=`
uniform vec3 uLamp, uLampCol, uSky, uAmb;
uniform vec2 uRes;
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
float fbm(vec2 p) {
	float s = 0.0, a = 0.5;
	for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
	return s;
}
vec3 light(vec3 base, vec3 w, vec3 n, float gloss) {
	vec3 L = uLamp - w;
	float dist = length(L);
	L /= dist;
	float fall = 1.6 / (1.0 + dist * dist * 0.35);
	float d = max(dot(n, L), 0.0);
	float sky = 0.5 + 0.5 * n.y;
	vec3 V = normalize(cameraPosition - w);
	vec3 H = normalize(L + V);
	float sp = pow(max(dot(n, H), 0.0), 40.0) * gloss;
	return base * (uAmb + uSky * sky * 0.35 + uLampCol * d * fall) + uLampCol * sp * fall;
}
vec3 finish(vec3 c) {
	vec2 q = gl_FragCoord.xy / uRes - 0.5;
	c *= 1.0 - dot(q, q) * 0.9;
	c = c / (1.0 + max(c - 1.0, 0.0));
	return c + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
}`,st=`
precision highp float;
${at}
uniform vec3 uC1, uC2;
uniform float uScale, uGloss;
uniform vec4 uTray; // masa i\xE7in teknenin g\xF6lgesi: xy yar\u0131 boyut, z yumu\u015Fakl\u0131k, w g\xFC\xE7
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	vec3 n = normalize(vN);
	vec2 p = abs(n.y) > 0.5 ? vW.xz : (abs(n.x) > 0.5 ? vW.zy : vW.xy);
	p *= uScale;
	float warp = fbm(p * vec2(0.6, 3.0)) * 2.4;
	float g = sin((p.y * 9.0 + warp * 3.0) ) * 0.5 + 0.5;
	float fine = vnoise(p * vec2(1.5, 60.0)) * 0.5 + vnoise(p * vec2(3.0, 140.0)) * 0.5;
	float t = clamp(g * 0.55 + fine * 0.45, 0.0, 1.0);
	vec3 base = mix(uC1, uC2, t);
	base *= 0.85 + 0.3 * fbm(p * 0.7);
	vec3 c = light(base, vW, n, uGloss * (0.6 + 0.4 * fine));
	if (uTray.w > 0.0) {
		// teknenin masaya d\xFC\u015Fen yumu\u015Fak g\xF6lgesi (lamba sol \xFCstte: g\xF6lge sa\u011F alta kayar)
		vec2 q = abs(vW.xz - vec2(0.07, 0.09)) - uTray.xy;
		float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
		c *= 1.0 - uTray.w * (1.0 - smoothstep(-0.02, uTray.z, sd));
	}
	gl_FragColor = vec4(finish(c), 1.0);
}`,qt=`
precision highp float;
${at}
uniform vec3 uC1;
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	vec3 n = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	vec3 R = reflect(-V, n);
	float env = 0.35 + 0.65 * smoothstep(-0.2, 0.9, R.y) + 0.3 * pow(max(dot(R, normalize(uLamp - vW)), 0.0), 18.0);
	float pat = 0.9 + 0.1 * vnoise(vW.xz * 300.0);
	vec3 c = light(uC1 * 0.35, vW, n, 2.2) + uC1 * env * 0.55 * pat;
	gl_FragColor = vec4(finish(c), 1.0);
}`,ft=`
precision highp float;
${at}
uniform vec3 uC1;
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
void main() {
	float r = length(vUv - 0.5) * 2.0;
	vec3 base = uC1 * (1.0 - 0.25 * r * r) * (0.92 + 0.12 * vnoise(vUv * 30.0));
	vec3 c = light(base, vW, normalize(vN), 1.4);
	gl_FragColor = vec4(finish(c), 1.0);
}`,$t=`
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,Ot=`
precision highp float;
uniform sampler2D uMap;
uniform float uFlicker;
uniform vec2 uLampScr;
varying vec2 vUv;
void main() {
	vec3 c = texture2D(uMap, vUv).rgb;
	float d = length(vUv - uLampScr);
	c *= 1.0 + uFlicker * 0.08 * (1.0 - smoothstep(0.0, 1.1, d));
	gl_FragColor = vec4(c, 1.0);
}`;function D(n,t,e){let i=s=>({value:s});return new l.ShaderMaterial({vertexShader:It,fragmentShader:n,uniforms:{uLamp:i(O.lamp),uLampCol:i(O.lampCol),uSky:i(O.sky),uAmb:i(O.amb),uRes:t.uRes,...e}})}var S=n=>new l.Color().setHex(n,l.LinearSRGBColorSpace),N=class{constructor(t,e,i){this.G=t,this.A=e,this.samples=i.bgSamples,this.dirty=!0,this.rt=null;let s=g=>({value:g});this.cached=new l.Scene;let o=new l.Mesh(new l.PlaneGeometry(8,8).rotateX(-Math.PI/2),D(st,t,{uC1:s(S(2758157)),uC2:s(S(5976608)),uScale:s(1.4),uGloss:s(.5),uTray:s(new l.Vector4(.5+.05,e/2+.05,.16,.55))}));o.position.y=-.045,this.cached.add(o),this.bowls=[];let r=new l.CylinderGeometry(.075,.06,.05,40,1,!0),a=new l.CircleGeometry(.068,40).rotateX(-Math.PI/2),h=new l.TorusGeometry(.073,.006,8,48).rotateX(Math.PI/2),p=D(qt,t,{uC1:s(S(13145418))}),d=e/2+.17;for(let g=0;g<4;g++){let E=new l.Group,_=-.36+g*.24;E.position.set(_,-.02,d+g%2*.03);let L=new l.Mesh(r,p),P=new l.Mesh(h,p);P.position.y=.025;let lt=D(ft,t,{uC1:s(new l.Color)}),ht=new l.Mesh(a,lt);ht.position.y=.012,E.add(L,P,ht),this.cached.add(E),this.bowls.push(lt)}let f=D(st,t,{uC1:s(S(3877404)),uC2:s(S(7229750)),uScale:s(9),uGloss:s(.3),uTray:s(new l.Vector4)}),v=D(ft,t,{uC1:s(S(13482904))});for(let g=0;g<3;g++){let E=new l.Group,_=new l.Mesh(new l.CylinderGeometry(.006,.008,.42,10),f);_.rotation.z=Math.PI/2;let L=new l.Mesh(new l.CylinderGeometry(.016,.009,.07,14),v);L.rotation.z=Math.PI/2,L.position.x=.24,E.add(_,L),E.position.set(-.05+g*.05,-.034,-e/2-.13-g*.035),E.rotation.y=.12-g*.1,this.cached.add(E)}this.live=new l.Group;let H=D(st,t,{uC1:s(S(2363657)),uC2:s(S(4859413)),uScale:s(4),uGloss:s(1.2),uTray:s(new l.Vector4)}),x=.05,R=.028,C=-.045,Et=R-C,ot=1+x*2,ee=e+x*2,G=(g,E,_,L)=>{let P=new l.Mesh(new l.BoxGeometry(g,Et,E),H);P.position.set(_,(R+C)/2,L),this.live.add(P)};G(ot,x,0,-e/2-x/2),G(ot,x,0,e/2+x/2),G(x,e,-.5-x/2,0),G(x,e,.5+x/2,0);let Tt=new l.BoxGeometry(x*1.5,.008,x*1.5);for(let g of[-1,1])for(let E of[-1,1]){let _=new l.Mesh(Tt,p);_.position.set(g*(.5+x/2),R+.004,E*(e/2+x/2)),this.live.add(_)}this.flat=new l.Scene,this.flatCam=new l.OrthographicCamera(-1,1,1,-1,0,1);let rt=new l.BufferGeometry;rt.setAttribute("position",new l.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),this.flatMat=new l.ShaderMaterial({vertexShader:$t,fragmentShader:Ot,uniforms:{uMap:s(null),uFlicker:s(0),uLampScr:s(new l.Vector2(.1,.95))},depthTest:!1,depthWrite:!1});let nt=new l.Mesh(rt,this.flatMat);nt.frustumCulled=!1,this.flat.add(nt)}setPalette(t){for(let e=0;e<this.bowls.length;e++)this.bowls[e].uniforms.uC1.value.setHex(t[e],l.LinearSRGBColorSpace);this.dirty=!0}draw(t,e,i,s){(!this.rt||this.rt.width!==i||this.rt.height!==s)&&(this.rt&&this.rt.dispose(),this.rt=new l.WebGLRenderTarget(i,s,{samples:this.samples,depthBuffer:!0,type:l.UnsignedByteType}),this.rt.texture.colorSpace=l.NoColorSpace,this.dirty=!0),this.dirty&&(t.setRenderTarget(this.rt),t.clear(),t.render(this.cached,e),this.dirty=!1),t.setRenderTarget(null),this.flatMat.uniforms.uMap.value=this.rt.texture,t.render(this.flat,this.flatCam)}dispose(){this.rt&&this.rt.dispose()}};import*as c from"three";var dt=`
varying vec2 vUv;
void main() {
	vUv = uv;
	// kameraya d\xF6n\xFCk kart
	vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
	vec2 s = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
	mv.xy += position.xy * s;
	gl_Position = projectionMatrix * mv;
}`,Nt=`
precision highp float;
uniform float uTime, uLife, uSeed;
varying vec2 vUv;
float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise(float x) { float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float t = uTime * 7.0 + uSeed;
	float sway = (noise(t) - 0.5) * 0.35 * (p.y + 1.0) * 0.5;
	p.x -= sway;
	// alev: alttan yuvarlak, \xFCste sivri damla
	float y = p.y * 0.5 + 0.5;
	float w = mix(0.42, 0.02, pow(clamp(y, 0.0, 1.0), 1.3)) * (0.9 + 0.2 * noise(t * 1.7));
	float d = abs(p.x) / max(w, 1e-3);
	float body = (1.0 - smoothstep(0.55, 1.0, d)) * smoothstep(-1.0, -0.55, p.y) * (1.0 - smoothstep(0.75, 1.0, p.y));
	float core = (1.0 - smoothstep(0.0, 0.6, d)) * smoothstep(-0.9, -0.4, p.y) * (1.0 - smoothstep(-0.1, 0.4, p.y));
	vec3 c = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.86, 0.45), core);
	c = mix(c, vec3(0.45, 0.55, 1.0), (1.0 - smoothstep(-0.95, -0.7, p.y)) * 0.6 * body);
	float glow = exp(-dot(p * vec2(1.0, 0.7), p * vec2(1.0, 0.7)) * 2.2) * 0.35;
	float a = clamp(body + glow, 0.0, 1.0) * uLife;
	gl_FragColor = vec4(c * (body * 1.4 + glow * 0.9) * uLife, a);
}`,jt=`
precision highp float;
uniform vec3 uColor;
uniform float uK;
varying vec2 vUv;
void main() {
	float r = length(vUv - 0.5) * 2.0;
	float g = exp(-r * r * 5.0) * (1.0 - smoothstep(0.8, 1.0, r));
	gl_FragColor = vec4(uColor * g * uK, 0.0);
}`,Kt=`
precision highp float;
uniform vec3 uLamp, uFlame;
uniform float uLife;
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
void main() {
	vec3 n = normalize(vN);
	// ceviz kabu\u011Fu: oluklar, koyu kahve
	float ribs = 0.75 + 0.25 * sin(atan(vL.z, vL.x) * 14.0 + vL.y * 30.0);
	vec3 base = vec3(0.32, 0.18, 0.09) * ribs;
	float d = max(dot(n, normalize(uLamp - vW)), 0.0);
	vec3 fl = uFlame - vW;
	float fd = max(dot(n, normalize(fl)), 0.0) / (1.0 + dot(fl, fl) * 900.0);
	vec3 c = base * (0.25 + d * 0.9) + vec3(1.0, 0.6, 0.25) * fd * 2.5 * uLife;
	gl_FragColor = vec4(c, 1.0);
}`,mt=`
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
void main() {
	vL = position;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`,Xt=`
precision highp float;
uniform float uTime, uK, uPulse;
varying vec2 vUv;
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float r = length(p);
	float a = atan(p.y, p.x);
	// nil\xFCfer: sekiz yaprakl\u0131 alt\u0131n ta\xE7, ortas\u0131 \u0131\u015F\u0131k
	float petals = 0.78 + 0.14 * pow(abs(cos(a * 4.0 + uTime * 0.3)), 3.0);
	float rim = 1.0 - smoothstep(0.0, 0.05, abs(r - petals));
	float inner = 1.0 - smoothstep(0.0, 0.03, abs(r - 0.55));
	float fill = (1.0 - smoothstep(0.0, petals, r)) * 0.22;
	float wave = (1.0 - smoothstep(0.0, 0.06, abs(r - fract(uTime * 0.5) * 1.1))) * (1.0 - fract(uTime * 0.5));
	vec3 gold = vec3(1.0, 0.78, 0.35);
	float k = rim * 0.9 + inner * 0.5 + fill + wave * 0.35 + uPulse * 0.6 * (1.0 - r);
	// koyu d\u0131\u015F hat: a\xE7\u0131k zeminde de okunsun
	float out1 = (1.0 - smoothstep(0.0, 0.09, abs(r - petals - 0.06))) * 0.75;
	vec3 c = mix(vec3(0.12, 0.07, 0.04), gold * 1.15, clamp(k, 0.0, 1.0));
	float al = clamp(max(k, out1), 0.0, 1.0) * uK;
	gl_FragColor = vec4(c * al, al);
}`,Yt=`
precision highp float;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float tw = pow(max(0.0, sin(uTime * 3.0 + vSeed * 30.0)), 16.0);
	vec3 c = vec3(0.95, 0.72, 0.3) * (0.75 + 0.3 * p.x - 0.2 * p.y) + vec3(1.0, 0.95, 0.8) * tw;
	gl_FragColor = vec4(c, 1.0);
}`,Zt=`
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
void main() {
	vUv = uv;
	vSeed = aSeed;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,j=class{constructor(t,e){this.A=e,this.x=.5,this.y=.2,this.vx=0,this.vy=0,this.r=.042,this.life=1,this.heading=0,this.group=new c.Group;let i=h=>({value:h});this.flamePos=new c.Vector3,this.hullMat=new c.ShaderMaterial({vertexShader:mt,fragmentShader:Kt,uniforms:{uLamp:i(new c.Vector3(-1.1,1.5,-.9)),uFlame:i(this.flamePos),uLife:i(1)}});let s=new c.Mesh(new c.SphereGeometry(this.r,28,12,0,Math.PI*2,Math.PI/2,Math.PI/2),this.hullMat);s.scale.set(1,.55,1.3),s.rotation.x=Math.PI,s.position.y=.006,this.hull=s;let o=new c.Mesh(new c.CylinderGeometry(this.r*.32,this.r*.42,this.r*.35,18),new c.ShaderMaterial({vertexShader:mt,fragmentShader:`precision highp float; uniform vec3 uFlame; uniform float uLife; varying vec3 vW; varying vec3 vN; varying vec3 vL;
				void main(){ vec3 n=normalize(vN); vec3 fl=uFlame-vW; float fd=max(dot(n,normalize(fl)),0.0)/(1.0+dot(fl,fl)*1500.0);
				vec3 c=vec3(0.55,0.27,0.16)*(0.35+0.4*n.y)+vec3(1.0,0.55,0.2)*fd*2.0*uLife; gl_FragColor=vec4(c,1.0);}`,uniforms:{uFlame:i(this.flamePos),uLife:this.hullMat.uniforms.uLife}}));o.position.y=this.r*.32,this.flameMat=new c.ShaderMaterial({vertexShader:dt,fragmentShader:Nt,uniforms:{uTime:t.uTime,uLife:i(1),uSeed:i(3.7)},transparent:!0,depthWrite:!1,blending:c.CustomBlending,blendSrc:c.OneFactor,blendDst:c.OneMinusSrcAlphaFactor});let r=new c.Mesh(new c.PlaneGeometry(1,1),this.flameMat);r.scale.set(this.r*.75,this.r*1.5,1),r.position.y=this.r*1.05,r.renderOrder=3,this.flame=r,this.glowMat=new c.ShaderMaterial({vertexShader:dt,fragmentShader:jt,uniforms:{uColor:i(new c.Color(1,.6,.25)),uK:i(.55)},transparent:!0,depthWrite:!1,depthTest:!1,blending:c.AdditiveBlending});let a=new c.Mesh(new c.PlaneGeometry(1,1),this.glowMat);a.scale.set(this.r*6,this.r*6,1),a.position.y=this.r*1.1,a.renderOrder=4,this.group.add(s,o,r,a)}place(t,e){this.x=t,this.y=e,this.vx=0,this.vy=0,this.life=1,this.sync(0)}sync(t){let e=Math.sin(t*2.1)*.0012;this.group.position.set(this.x-.5,e,this.A/2-this.y),Math.hypot(this.vx,this.vy)>.02&&(this.heading+=(Math.atan2(this.vx,this.vy)-this.heading)*.08),this.group.rotation.y=this.heading,this.group.rotation.z=Math.sin(t*1.7)*.05,this.group.rotation.x=Math.sin(t*1.3+1)*.04,this.flameMat.uniforms.uLife.value=this.life,this.hullMat.uniforms.uLife.value=this.life,this.glowMat.uniforms.uK.value=.55*this.life,this.flame.getWorldPosition(this.flamePos)}},K=class{constructor(t,e){this.A=e,this.x=.5,this.y=1.4,this.r=.075,this.mat=new c.ShaderMaterial({vertexShader:"varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:Xt,uniforms:{uTime:t.uTime,uK:{value:1},uPulse:{value:0}},transparent:!0,depthWrite:!1,blending:c.CustomBlending,blendSrc:c.OneFactor,blendDst:c.OneMinusSrcAlphaFactor}),this.mesh=new c.Mesh(new c.PlaneGeometry(1,1).rotateX(-Math.PI/2),this.mat),this.mesh.renderOrder=2}place(t,e,i){this.x=t,this.y=e,this.r=i,this.mesh.position.set(t-.5,.002,this.A/2-e),this.mesh.scale.set(i*2.6,1,i*2.6)}},X=class{constructor(t,e,i=24){this.A=e,this.list=[];let s=new c.PlaneGeometry(.036,.036).rotateX(-Math.PI/2),o=new Float32Array(i);for(let r=0;r<i;r++)o[r]=Math.random();s.setAttribute("aSeed",new c.InstancedBufferAttribute(o,1)),this.mesh=new c.InstancedMesh(s,new c.ShaderMaterial({vertexShader:Zt.replace("modelViewMatrix * vec4(position, 1.0)","modelViewMatrix * instanceMatrix * vec4(position, 1.0)"),fragmentShader:Yt,uniforms:{uTime:t.uTime}}),i),this.mesh.count=0,this.mesh.frustumCulled=!1,this._m=new c.Matrix4,this._q=new c.Quaternion,this._e=new c.Euler,this._p=new c.Vector3,this._s=new c.Vector3(1,1,1)}set(t){this.list=t.map((e,i)=>({x:e.x,y:e.y,vx:0,vy:0,rot:i*1.7,got:!1,t:0}))}sync(t){let e=0;for(let i of this.list){if(i.got&&i.t>.5)continue;let s=i.got?1+i.t*3:1;this._e.set(Math.sin(t*1.3+i.rot)*.15,i.rot+t*.1,Math.cos(t*1.1+i.rot)*.15),this._q.setFromEuler(this._e),this._p.set(i.x-.5,.003+(i.got?i.t*.08:0),this.A/2-i.y),this._s.setScalar(i.got?Math.max(0,1-i.t*2)*s:1),this._m.compose(this._p,this._q,this._s),this.mesh.setMatrixAt(e++,this._m)}this.mesh.count=e,this.mesh.instanceMatrix.needsUpdate=!0}};var xt={lale:{base:15853004,pal:[2178959,11544111,14918961,2845259,14252687,2792600,723218,14199366],vein:.75,veinCol:16775920,ghost:.45},gece:{base:1317434,pal:[3126980,15759967,15909198,9097376,14263264,6126832,131590,15186261],vein:.5,veinCol:16642778,ghost:.55}},Y=[{id:"ilk-damla",name:"\u0130lk Damla",kicker:"Lale Bah\xE7esi \xB7 I",palette:"lale",colors:[0,1,2,3],prep:{seed:11,stones:120,colors:[0,1,2,3],rMin:.04,rMax:.085,combs:[]},boat:[.22,.2],harbor:[.74,1.36,.085],inks:[[.42,.74,.085],[.7,.98,.06]],leaves:[[.3,.55],[.58,.62],[.4,1.12]],par:35},{id:"gel-git",name:"Gel-Git",kicker:"Lale Bah\xE7esi \xB7 II",palette:"lale",colors:[0,2,4,5],prep:{seed:23,stones:120,colors:[0,2,4,5],rMin:.04,rMax:.08,combs:[[0,0,0,1,.09,.015,.11],[0,.055,0,-1,.09,.015,.11]]},boat:[.8,.16],harbor:[.22,1.42,.08],inks:[[.55,.55,.07],[.3,.92,.08],[.72,1.18,.065]],leaves:[[.62,.32],[.48,.86],[.2,1.15],[.78,.8]],drip:{every:7,r:.05},par:40},{id:"gece-mavisi",name:"Gece Mavisi",kicker:"Gece \xB7 I",palette:"gece",colors:[0,1,2,4],prep:{seed:5,stones:70,colors:[0,1,2,3,4,5],rMin:.035,rMax:.08,combs:[[0,0,1,0,.06,.012,.09]]},boat:[.5,.14],harbor:[.5,1.44,.08],inks:[[.3,.6,.07],[.7,.6,.07],[.5,1,.09]],leaves:[[.5,.42],[.18,.95],[.82,.95],[.5,1.25]],drip:{every:6,r:.055},par:45}];var Jt=.07,Qt=.45,Z=class{constructor(t){this.app=t,this.fluid=t.fluid,this.boat=t.boat,this.harbor=t.harbor,this.leaves=t.leaves,this.ui=t.ui,this.state="title",this.levelIndex=0,this.L=null,this.t=0,this.color=0,this.dropsUsed=0,this.got=0,this.inkExp=0,this._tmp={x:0,y:0},this._probe=[];for(let e=0;e<32;e++)this._probe.push({x:0,y:0,r:.02});this.nextDrip=0,this.dripRnd=W(1),this.endT=0}startLevel(t){let e=Y[t%Y.length];this.levelIndex=t%Y.length,this.L=e;let i=xt[e.palette],s=this.fluid;s.reset(),vt(this.app.waterMat,i),this.app.backdrop.setPalette(e.colors.map(a=>i.pal[a]));let o=e.prep,r=W(o.seed);for(let a=0;a<o.stones;a++){let h=r.range(.03,.97),p=r.range(.03,1.6-.03);s.drop(h,p,r.range(o.rMin,o.rMax),r.pick(o.colors),0)}for(let a of o.combs||[])s.comb(...a);for(let a of e.inks)s.drop(a[0],a[1],a[2],6,0);this.boat.place(e.boat[0],e.boat[1]),this.harbor.place(e.harbor[0],e.harbor[1],e.harbor[2]),this.leaves.set(e.leaves.map(([a,h])=>({x:a,y:h}))),this.t=0,this.color=e.colors[0],this.dropsUsed=0,this.got=0,this.inkExp=0,this.endT=0,this.dripRnd=W(o.seed*7+3),this.nextDrip=e.drip?e.drip.every:1/0,this.state="play",this.ui.level(e,this)}drag(t,e,i,s,o,r){this.state==="play"&&this.fluid.stroke(t,e,i,s,o,r,.055,.85)}tap(t,e){var i,s;this.state==="play"&&(t<0||t>1||e<0||e>1.6||(this.fluid.drop(t,e,Jt,this.color,Qt),this.dropsUsed++,(s=(i=this.app.sfx)==null?void 0:i.play)==null||s.call(i,"drop")))}selectColor(t){this.color=t}update(t){var p,d;let e=this.fluid;this.t+=t;let i=this.state==="play";i&&this.L.drip&&this.t>=this.nextDrip&&(this.nextDrip=this.t+this.L.drip.every,this._drip()),e.step(t);let s=e.sample,o=this.boat;if(i||this.state==="won"){this._float(o,s.vx[0],s.vy[0],7,t,o.r);for(let f=0;f<this.leaves.list.length;f++){let v=this.leaves.list[f];if(v.got){v.t+=t;continue}this._float(v,s.vx[f+1],s.vy[f+1],10,t,.014),i&&Math.hypot(v.x-o.x,v.y-o.y)<o.r+.016&&(v.got=!0,v.t=0,this.got++,this.ui.leaf(this.got,this.leaves.list.length),(d=(p=this.app.sfx)==null?void 0:p.play)==null||d.call(p,"leaf"))}}i?(s.inkMax[0]>.5?this.inkExp+=t:this.inkExp=Math.max(0,this.inkExp-t*.6),o.life=F(1-this.inkExp/.45,0,1),o.life<=0&&this._end(!1),Math.hypot(o.x-this.harbor.x,o.y-this.harbor.y)<this.harbor.r*.7&&this._end(!0),this.ui.tick(this)):this.state==="won"?(this.endT+=t,o.x+=(this.harbor.x-o.x)*(1-Math.exp(-3*t)),o.y+=(this.harbor.y-o.y)*(1-Math.exp(-3*t)),this.harbor.mat.uniforms.uPulse.value=Math.min(1,this.endT*2)*(1-Math.min(1,this.endT/3))):this.state==="lost"&&(this.endT+=t);let r=this._probe;r[0].x=o.x,r[0].y=o.y,r[0].r=o.r*.75;let a=1;for(let f of this.leaves.list)r[a].x=f.x,r[a].y=f.y,r[a].r=.01,a++;e.probe(r.slice(0,a)),o.sync(this.t),this.leaves.sync(this.t),this.app.waterMat.uniforms.uGlow.value.set(o.x,o.y/1.6,.9*o.life,.13)}_float(t,e,i,s,o,r){let a=1-Math.exp(-s*o);t.vx+=(e-t.vx)*a,t.vy+=(i-t.vy)*a,t.x+=t.vx*o,t.y+=t.vy*o,this.fluid.displace(t.x,t.y,this._tmp),t.x=this._tmp.x,t.y=this._tmp.y;let h=r+.006;t.x<h?(t.x=h,t.vx=Math.abs(t.vx)*.3):t.x>1-h&&(t.x=1-h,t.vx=-Math.abs(t.vx)*.3),t.y<h?(t.y=h,t.vy=Math.abs(t.vy)*.3):t.y>1.6-h&&(t.y=1.6-h,t.vy=-Math.abs(t.vy)*.3)}_drip(){var i,s;let t=this.dripRnd,e=this.boat;for(let o=0;o<12;o++){let r=t.range(.1,.9),a=t.range(.15,1.6-.15);if(!(Math.hypot(r-e.x,a-e.y)<.28)&&!(Math.hypot(r-this.harbor.x,a-this.harbor.y)<.2)){this.fluid.drop(r,a,this.L.drip.r,6,.7),(s=(i=this.app.sfx)==null?void 0:i.play)==null||s.call(i,"ink"),this.ui.toast("Hokkadan m\xFCrekkep damlad\u0131");return}}}_end(t){var i,s;this.state=t?"won":"lost",this.endT=0;let e=t?1+(this.t<=this.L.par?1:0)+(this.got===this.leaves.list.length?1:0):0;this.result={won:t,stars:e,time:this.t,got:this.got,total:this.leaves.list.length,drops:this.dropsUsed},(s=(i=this.app.sfx)==null?void 0:i.play)==null||s.call(i,t?"win":"fail"),setTimeout(()=>this.ui.end(this.result,this.L),t?1400:900)}action(t){t==="play"?this.startLevel(this.levelIndex):t==="retry"?this.startLevel(this.levelIndex):t==="next"?this.startLevel(this.levelIndex+1):t.startsWith("color:")&&this.selectColor(Number(t.slice(6)))}};import*as M from"three";var yt=.018,gt=.28,J=class{constructor(t,e){this.el=t,this.app=e,this.A=e.A,this.ptrs=new Map,this._ray=new M.Raycaster,this._ndc=new M.Vector2,this._hit=new M.Vector3,this._plane=new M.Plane(new M.Vector3(0,1,0),0),this.enabled=!0,this._down=i=>this.down(i),this._move=i=>this.move(i),this._up=i=>this.up(i),t.addEventListener("pointerdown",this._down),window.addEventListener("pointermove",this._move,{passive:!0}),window.addEventListener("pointerup",this._up),window.addEventListener("pointercancel",this._up)}toTray(t,e,i){let s=this.el.getBoundingClientRect();return this._ndc.set((t-s.left)/s.width*2-1,-((e-s.top)/s.height)*2+1),this._ray.setFromCamera(this._ndc,this.app.camera),this._ray.ray.intersectPlane(this._plane,this._hit)?(i.x=this._hit.x+.5,i.y=this.A/2-this._hit.z,i):null}down(t){var s,o;if(!this.enabled)return;let e=this.toTray(t.clientX,t.clientY,{x:0,y:0});if(!e)return;let i=performance.now()/1e3;this.ptrs.set(t.pointerId,{x:e.x,y:e.y,sx:e.x,sy:e.y,t0:i,t:i,vx:0,vy:0,moved:0});try{this.el.setPointerCapture(t.pointerId)}catch{}(o=(s=this.app.sfx)==null?void 0:s.unlock)==null||o.call(s)}move(t){let e=this.ptrs.get(t.pointerId);if(!e)return;let i=this.toTray(t.clientX,t.clientY,{x:0,y:0});if(!i)return;let s=performance.now()/1e3,o=Math.max(1/240,s-e.t),r=(i.x-e.x)/o,a=(i.y-e.y)/o;e.vx+=(r-e.vx)*.5,e.vy+=(a-e.vy)*.5,e.moved+=Math.hypot(i.x-e.x,i.y-e.y),(e.moved>yt||s-e.t0>gt)&&this.app.game.drag(e.x,e.y,i.x,i.y,e.vx,e.vy),e.x=i.x,e.y=i.y,e.t=s}up(t){let e=this.ptrs.get(t.pointerId);if(!e)return;this.ptrs.delete(t.pointerId);let i=performance.now()/1e3;e.moved<yt&&i-e.t0<gt&&this.app.game.tap(e.sx,e.sy)}dispose(){this.el.removeEventListener("pointerdown",this._down),window.removeEventListener("pointermove",this._move),window.removeEventListener("pointerup",this._up),window.removeEventListener("pointercancel",this._up)}};var te=`
.eb-ui{position:absolute;inset:0;pointer-events:none;font-family:'Manrope',system-ui,sans-serif;color:#fff6e6;
  -webkit-font-smoothing:antialiased;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
:where(.eb-ui button){font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent}
.eb-ui button{pointer-events:auto;cursor:pointer}
.eb-panel{background:rgba(17,12,22,.9);border:1px solid rgba(232,190,120,.35);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.eb-top{position:absolute;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:8px 18px 9px;text-align:center;min-width:150px}
.eb-top small{display:block;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#e8be78;font-weight:800}
.eb-top b{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:700;font-size:22px;line-height:1.1}
.eb-leaf{position:absolute;top:calc(14px + env(safe-area-inset-top));right:14px;padding:8px 12px;font-weight:800;font-size:15px;display:flex;gap:6px;align-items:center}
.eb-leaf i{width:12px;height:12px;background:linear-gradient(135deg,#ffe3a0,#c98d2e);transform:rotate(45deg);border-radius:2px;display:inline-block}
.eb-pal{position:absolute;bottom:calc(16px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:10px;padding:9px 12px}
.eb-pal button{width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,246,230,.25);box-shadow:inset 0 -6px 10px rgba(0,0,0,.25),inset 0 4px 8px rgba(255,255,255,.18);transition:transform .15s}
.eb-pal button.on{border-color:#ffe2a6;transform:scale(1.14);box-shadow:0 0 0 3px rgba(255,226,166,.25),inset 0 -6px 10px rgba(0,0,0,.25)}
.eb-hint{position:absolute;bottom:calc(84px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:10px 16px;font-size:15px;line-height:1.35;text-align:center;width:min(86vw,360px);transition:opacity .4s}
.eb-hint em{font-style:normal;color:#ffd58a;font-weight:800}
.eb-toast{position:absolute;top:calc(74px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:7px 14px;font-size:14px;font-weight:700;opacity:0;transition:opacity .3s;white-space:nowrap}
.eb-scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;pointer-events:auto;transition:opacity .45s}
.eb-scr.off{opacity:0;pointer-events:none}
.eb-title{background:radial-gradient(ellipse at 50% 42%,rgba(14,10,20,.35),rgba(14,10,20,.86) 75%)}
.eb-logo{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:700;font-size:min(30vw,132px);line-height:.9;color:#ffe0a0;
  text-shadow:0 2px 0 #8a5a22,0 8px 30px rgba(0,0,0,.6)}
.eb-sub{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:21px;color:#fff1da;text-shadow:0 2px 12px rgba(0,0,0,.8)}
.eb-btn{padding:14px 40px;border-radius:999px;background:linear-gradient(180deg,#ffe2a0,#e0a447);color:#2a1606;font-weight:800;letter-spacing:.18em;text-transform:uppercase;font-size:15px;box-shadow:0 8px 24px rgba(224,164,71,.35)}
.eb-btn2{padding:11px 22px;border-radius:999px;border:1px solid rgba(232,190,120,.5);background:rgba(17,12,22,.85);font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
.eb-end{background:rgba(10,7,14,.55)}
.eb-card{padding:22px 26px 20px;width:min(84vw,340px)}
.eb-card h3{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:700;font-size:32px;color:#ffe0a0}
.eb-card p{margin:8px 0 14px;font-size:15px;line-height:1.4;color:#f3e6d2}
.eb-stars{font-size:34px;letter-spacing:6px;color:#ffd27a;text-shadow:0 0 14px rgba(255,200,100,.5)}
.eb-stars .off{color:rgba(255,246,230,.18);text-shadow:none}
.eb-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
`,Q=class{constructor(t,e){this.h=e;let i=document.createElement("style");i.textContent=te,t.appendChild(i);let s=document.createElement("div");s.className="eb-ui",s.lang="tr",s.innerHTML=`
			<div class="eb-panel eb-top" data-r="top" style="display:none"><small data-r="kicker"></small><b data-r="name"></b></div>
			<div class="eb-panel eb-leaf" data-r="leafbox" style="display:none"><i></i><span data-r="leaf">0/0</span></div>
			<div class="eb-panel eb-pal" data-r="pal" style="display:none"></div>
			<div class="eb-panel eb-hint" data-r="hint" style="opacity:0"></div>
			<div class="eb-panel eb-toast" data-r="toast"></div>
			<div class="eb-scr eb-title" data-r="title">
				<div class="eb-logo">Ebru</div>
				<div class="eb-sub">Suyun \xFCst\xFCnde bir kandil</div>
				<div style="height:18px"></div>
				<button class="eb-btn" data-a="play">Oyna</button>
			</div>
			<div class="eb-scr eb-end off" data-r="end">
				<div class="eb-panel eb-card">
					<h3 data-r="endT"></h3>
					<div class="eb-stars" data-r="stars"></div>
					<p data-r="endP"></p>
					<div class="eb-row" data-r="endB"></div>
				</div>
			</div>`,t.appendChild(s),this.el=s,this.$={};for(let o of s.querySelectorAll("[data-r]"))this.$[o.dataset.r]=o;s.addEventListener("click",o=>{let r=o.target.closest("[data-a]");if(!r)return;o.stopPropagation();let a=r.dataset.a;if((a==="play"||a==="retry"||a==="next")&&(this.$.title.classList.add("off"),this.$.end.classList.add("off")),a.startsWith("color:"))for(let h of this.$.pal.children)h.classList.toggle("on",h===r);e.action(a)}),s.addEventListener("pointerdown",o=>{o.target.closest("button")&&o.stopPropagation()}),this._hintT=0,this._toastT=0}level(t,e){this.$.top.style.display="",this.$.leafbox.style.display="",this.$.pal.style.display="",this.$.kicker.textContent=t.kicker,this.$.name.textContent=t.name,this.leaf(0,t.leaves.length);let i=e.app.waterMat.uniforms.uPal.value;this.$.pal.innerHTML=t.colors.map((s,o)=>{let r=i[s],a=`rgb(${r.r*255|0},${r.g*255|0},${r.b*255|0})`;return`<button class="${o===0?"on":""}" data-a="color:${s}" style="background:${a}" aria-label="boya ${o+1}"></button>`}).join(""),e.levelIndex===0?this.hint("Parma\u011F\u0131n\u0131 <em>s\xFCr\xFCkle</em>: su akar, kandil ak\u0131nt\u0131ya kap\u0131l\u0131r.<br><em>Dokun</em>: damla a\xE7\u0131l\u0131r, \xE7evresini iter.",7):this.hint(null)}leaf(t,e){this.$.leaf.textContent=`${t}/${e}`}tick(){let t=performance.now();this._hintT&&t>this._hintT&&(this.$.hint.style.opacity=0,this._hintT=0),this._toastT&&t>this._toastT&&(this.$.toast.style.opacity=0,this._toastT=0)}hint(t,e=5){if(!t){this.$.hint.style.opacity=0,this._hintT=0;return}this.$.hint.innerHTML=t,this.$.hint.style.opacity=1,this._hintT=performance.now()+e*1e3}toast(t){this.$.toast.textContent=t,this.$.toast.style.opacity=1,this._toastT=performance.now()+2200}end(t,e){this.hint(null),this.$.endT.textContent=t.won?"Kandil limanda":"Kandil s\xF6nd\xFC",this.$.stars.innerHTML=[0,1,2].map(i=>`<span class="${i<t.stars?"":"off"}">\u2605</span>`).join(""),this.$.stars.style.display=t.won?"":"none",this.$.endP.textContent=t.won?`${t.time.toFixed(1)} saniye \xB7 ${t.got}/${t.total} alt\u0131n varak \xB7 ${t.drops} damla`:"Kara m\xFCrekkep alevi bo\u011Fdu. Ak\u0131nt\u0131y\u0131 m\xFCrekkebin etraf\u0131ndan \xE7evir.",this.$.endB.innerHTML=t.won?'<button class="eb-btn2" data-a="retry">Tekrar</button><button class="eb-btn" data-a="next">Sonraki</button>':'<button class="eb-btn" data-a="retry">Yeniden dene</button>',this.$.end.classList.remove("off")}};var tt=class{constructor(t={}){this.hooks=t,this.muted=!1}unlock(){}play(){}flow(){}music(){}mute(t){this.muted=!!t}};var et=class{constructor({container:t,store:e,hooks:i={},quality:s="auto",power:o="auto"}){this.container=t,this.store=e,this.hooks=i,this.qualityOpt=s,this.power=o,this.A=1.6,this.running=!1,this.visible=!0,this._raf=0,this._prev=0,this.V3=m.Vector3}async init(){let t=document.createElement("canvas");t.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none",this.container.appendChild(t),this.canvas=t;let e=this.store.get("settings")||{},i=this.qualityOpt!=="auto"?this.qualityOpt:e.quality??"auto",s=ut(t,i==="auto"?null:Number(i));this.renderer=s.renderer,this.renderer.autoClear=!1,this.tier=s.tier,this.info=s,this.gov=new B({tier:s.tier.id,gpu:s.gpu,store:this.store,power:e.power||this.power}),this.gov.onScale=()=>this.resize(),this.gov.onBattery=a=>{var h;return(h=this.ui)==null?void 0:h.toast(a?"Pil koruma a\xE7\u0131k":"Pil koruma kapand\u0131")},this.G={uTime:{value:0},uRes:{value:new m.Vector2(1,1)},uPxPerUnit:{value:1e3}};let o=this.tier;this.fluid=new I(this.renderer,{aspect:1.6,simW:o.simW,dyeW:o.dyeW,iters:o.iters,vorticity:o.vorticity}),this.scene=new m.Scene,this.camera=new m.PerspectiveCamera(30,1,.05,20),this.backdrop=new N(this.G,1.6,o),this.scene.add(this.backdrop.live),this.waterMat=pt(this.fluid,this.G);let r=new m.Mesh(new m.PlaneGeometry(1,1.6).rotateX(-Math.PI/2),this.waterMat);r.renderOrder=0,this.scene.add(r),this.water=r,this.boat=new j(this.G,1.6),this.harbor=new K(this.G,1.6),this.leaves=new X(this.G,1.6),this.scene.add(this.boat.group,this.harbor.mesh,this.leaves.mesh),this.sfx=new tt(this.hooks),this.ui=new Q(this.container,{action:a=>this.game.action(a)}),this.game=new Z(this),this.input=new J(t,this),this._onResize=()=>this.resize(),window.addEventListener("resize",this._onResize),this._onVis=()=>{this.visible=document.visibilityState==="visible",this.visible&&this.running&&(this.gov.reset(),this._prev=0,this._loop())},document.addEventListener("visibilitychange",this._onVis),this.resize(),this.game.startLevel(0),this.game.state="title";try{await this.renderer.compileAsync(this.scene,this.camera)}catch{this.renderer.compile(this.scene,this.camera)}this.fluid.step(1/60),this.render()}resize(){let t=Math.max(1,this.container.clientWidth||window.innerWidth),e=Math.max(1,this.container.clientHeight||window.innerHeight),i=this.gov.pixelRatio(t,e);this.renderer.setPixelRatio(i),this.renderer.setSize(t,e,!1),this.G.uRes.value.set(Math.round(t*i),Math.round(e*i)),this._fit(t/e),this.backdrop.dirty=!0}_fit(t){let e=this.camera;e.aspect=t;let i=m.MathUtils.degToRad(13),s=new m.Vector3(0,0,.015),o=new m.Vector3(0,Math.cos(i),Math.sin(i)),r=[[-.56,.03,-1.6/2-.06],[.56,.03,-1.6/2-.06],[-.56,.03,1.6/2+.06],[.56,.03,1.6/2+.06]].map(v=>new m.Vector3(...v)),a=new m.Vector3,h=.5,p=12;for(let v=0;v<28;v++){let H=(h+p)/2;e.position.copy(s).addScaledVector(o,H),e.lookAt(s),e.updateMatrixWorld(),e.updateProjectionMatrix();let x=!0;for(let R of r)a.copy(R).project(e),(Math.abs(a.x)>.985||a.y>.8||a.y<-.78)&&(x=!1);x?p=H:h=H}e.position.copy(s).addScaledVector(o,p),e.lookAt(s),e.updateMatrixWorld(),e.updateProjectionMatrix();let d=new m.Vector3(-.05,0,0).project(e),f=new m.Vector3(.05,0,0).project(e);this.G.uPxPerUnit.value=Math.abs(f.x-d.x)/2*this.G.uRes.value.x*10}start(){this.running||(this.running=!0,this._prev=0,this._loop())}stop(){this.running=!1,cancelAnimationFrame(this._raf)}_loop(){cancelAnimationFrame(this._raf);let t=e=>{if(!this.running||!this.visible)return;this._raf=requestAnimationFrame(t);let i=this._prevRaf?e-this._prevRaf:16.7;if(this._prevRaf=e,this.gov.menu=this.game.state==="title",!this.gov.tick(e,i))return;let s=this._prev?Math.min(.05,(e-this._prev)/1e3):1/60;this._prev=e,this.frame(s)};this._prevRaf=0,this._raf=requestAnimationFrame(t)}frame(t){this.G.uTime.value+=t,this.game.update(t),this.sfx.flow(this.fluid.energy),this.render()}render(){let t=this.renderer;t.setRenderTarget(null),t.clear(),this.backdrop.flatMat.uniforms.uFlicker.value=Math.sin(this.G.uTime.value*9.1)*.5+Math.sin(this.G.uTime.value*23.7)*.3;let e=t.getDrawingBufferSize(this._sz||(this._sz=new m.Vector2));this.backdrop.draw(t,this.camera,e.x,e.y),t.clearDepth(),t.render(this.scene,this.camera)}stats(){var e;let t=this.renderer.info;return{calls:t.render.calls,tris:t.render.triangles,programs:((e=t.programs)==null?void 0:e.length)??0,tier:this.tier.id,awake:this.fluid.awake}}async debugPlay({level:t=0,script:e=[],seconds:i=0,fps:s=60}={}){this.ui.$.title.classList.add("off"),this.game.startLevel(t);let o=1/s,r=0,a=e.slice().sort((f,v)=>f.t-v.t),h=0,p=Math.max(i,a.length?a[a.length-1].t+(a[a.length-1].dur||0)+.5:0),d=[];for(;r<p;){for(;h<a.length&&a[h].t<=r;)d.push({...a[h++],s:0});for(let f=d.length-1;f>=0;f--){let v=d[f];if(v.type==="tap"){this.game.tap(v.x,v.y),d.splice(f,1);continue}let H=v.s/v.dur;v.s=Math.min(v.dur,v.s+o);let x=v.s/v.dur,R=bt(v.path,H),C=bt(v.path,x);this.game.drag(R.x,R.y,C.x,C.y,(C.x-R.x)/o,(C.y-R.y)/o),v.s>=v.dur&&d.splice(f,1)}this.G.uTime.value+=o,this.game.update(o),r+=o,this.fluid._probeP&&await this.fluid._probeP}return this.render(),{state:this.game.state,boat:[+this.game.boat.x.toFixed(3),+this.game.boat.y.toFixed(3)],life:this.game.boat.life,got:this.game.got}}destroy(){this.stop(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVis),this.input.dispose(),this.fluid.dispose(),this.backdrop.dispose(),this.renderer.dispose()}};function bt(n,t){let e=n.length-1,i=Math.min(e-1e-6,Math.max(0,t*e)),s=Math.floor(i),o=i-s,r=n[s],a=n[Math.min(e,s+1)];return{x:r[0]+(a[0]-r[0])*o,y:r[1]+(a[1]-r[1])*o}}function wt(n,t="ebru.v1"){if(n&&typeof n.get=="function"&&typeof n.set=="function")return n;let e={};try{e=JSON.parse(localStorage.getItem(t)||"{}")||{}}catch{e={}}return{get:i=>e[i],set:(i,s)=>{e[i]=s;try{localStorage.setItem(t,JSON.stringify(e))}catch{}}}}async function ze(n={}){let t=wt(n.store),e=document.createElement("div");e.className="eb-root",e.style.cssText="position:fixed;inset:0;z-index:50;overflow:hidden;background:#0e0d14;touch-action:none;",(n.container||document.body).appendChild(e);let i=new et({container:e,store:t,hooks:n.hooks||{},quality:n.quality||"auto",power:n.power||"auto"});return await i.init(),{app:i,open(){e.style.display="",i.start()},close(){i.stop(),e.style.display="none"},destroy(){i.destroy(),e.remove()}}}export{ze as createEbru};
